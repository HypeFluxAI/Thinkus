package queue

import (
	"context"
	"fmt"
	"log"
	"sort"
	"sync"
	"time"

	"github.com/thinkus/go-delivery-queue/internal/models"
)

// Service 交付队列服务
type Service struct {
	mu       sync.RWMutex
	queue    map[string]*models.QueueItem
	workers  map[string]*models.WorkerNode
	config   models.QueueConfig
	stopChan chan struct{}
}

// NewService 创建服务实例
func NewService() *Service {
	return &Service{
		queue:   make(map[string]*models.QueueItem),
		workers: make(map[string]*models.WorkerNode),
		config: models.QueueConfig{
			MaxConcurrent:     3,
			MaxRetries:        2,
			RetryDelayMinutes: 5,
			TimeoutMinutes:    60,
		},
		stopChan: make(chan struct{}),
	}
}

// AddToQueue 添加到队列
func (s *Service) AddToQueue(ctx context.Context, input AddToQueueInput) (*models.QueueItem, error) {
	s.mu.Lock()
	defer s.mu.Unlock()

	id := fmt.Sprintf("dq_%d_%s", time.Now().UnixNano(), randomString(9))

	priority := input.Priority
	if priority == "" {
		priority = models.PriorityNormal
	}

	item := &models.QueueItem{
		ID:                id,
		ProjectID:         input.ProjectID,
		ProjectName:       input.ProjectName,
		ClientName:        input.ClientName,
		ClientEmail:       input.ClientEmail,
		ProductType:       input.ProductType,
		Priority:          priority,
		Status:            models.StatusQueued,
		QueuedAt:          time.Now(),
		EstimatedDuration: models.GetEstimatedDuration(input.ProductType),
		Progress:          0,
		RetryCount:        0,
		MaxRetries:        s.config.MaxRetries,
		Config:            input.Config,
	}

	s.queue[id] = item

	// 尝试立即处理
	go s.tryProcessNext()

	log.Printf("[Queue] Added item %s (project: %s, priority: %s)", id, input.ProjectName, priority)

	return item, nil
}

// GetItem 获取队列项
func (s *Service) GetItem(ctx context.Context, id string) (*models.QueueItem, error) {
	s.mu.RLock()
	defer s.mu.RUnlock()

	item, ok := s.queue[id]
	if !ok {
		return nil, fmt.Errorf("item not found: %s", id)
	}
	return item, nil
}

// GetQueue 获取队列列表
func (s *Service) GetQueue(ctx context.Context, filter QueueFilter) []*models.QueueItem {
	s.mu.RLock()
	defer s.mu.RUnlock()

	var items []*models.QueueItem

	for _, item := range s.queue {
		// 应用过滤器
		if len(filter.Status) > 0 && !containsStatus(filter.Status, item.Status) {
			continue
		}
		if len(filter.Priority) > 0 && !containsPriority(filter.Priority, item.Priority) {
			continue
		}
		if len(filter.ProductType) > 0 && !containsString(filter.ProductType, item.ProductType) {
			continue
		}
		items = append(items, item)
	}

	// 按优先级和入队时间排序
	sort.Slice(items, func(i, j int) bool {
		wi := models.PriorityWeight[items[i].Priority]
		wj := models.PriorityWeight[items[j].Priority]
		if wi != wj {
			return wi > wj
		}
		return items[i].QueuedAt.Before(items[j].QueuedAt)
	})

	return items
}

// CancelItem 取消队列项
func (s *Service) CancelItem(ctx context.Context, id string, reason string) error {
	s.mu.Lock()
	defer s.mu.Unlock()

	item, ok := s.queue[id]
	if !ok {
		return fmt.Errorf("item not found: %s", id)
	}

	if item.Status == models.StatusCompleted || item.Status == models.StatusCancelled {
		return fmt.Errorf("item already in terminal state: %s", item.Status)
	}

	now := time.Now()
	failureReason := models.ReasonManualCancel
	item.Status = models.StatusCancelled
	item.FailureReason = &failureReason
	item.ErrorMessage = reason
	item.CompletedAt = &now

	log.Printf("[Queue] Cancelled item %s: %s", id, reason)

	return nil
}

// PauseItem 暂停队列项
func (s *Service) PauseItem(ctx context.Context, id string) error {
	s.mu.Lock()
	defer s.mu.Unlock()

	item, ok := s.queue[id]
	if !ok {
		return fmt.Errorf("item not found: %s", id)
	}

	if item.Status != models.StatusRunning {
		return fmt.Errorf("item not running: %s", item.Status)
	}

	item.Status = models.StatusPaused
	log.Printf("[Queue] Paused item %s", id)

	return nil
}

// ResumeItem 恢复队列项
func (s *Service) ResumeItem(ctx context.Context, id string) error {
	s.mu.Lock()
	defer s.mu.Unlock()

	item, ok := s.queue[id]
	if !ok {
		return fmt.Errorf("item not found: %s", id)
	}

	if item.Status != models.StatusPaused {
		return fmt.Errorf("item not paused: %s", item.Status)
	}

	item.Status = models.StatusQueued
	log.Printf("[Queue] Resumed item %s", id)

	go s.tryProcessNext()

	return nil
}

// RetryItem 重试失败项
func (s *Service) RetryItem(ctx context.Context, id string) error {
	s.mu.Lock()
	defer s.mu.Unlock()

	item, ok := s.queue[id]
	if !ok {
		return fmt.Errorf("item not found: %s", id)
	}

	if item.Status != models.StatusFailed {
		return fmt.Errorf("item not failed: %s", item.Status)
	}

	item.Status = models.StatusQueued
	item.RetryCount++
	item.FailureReason = nil
	item.ErrorMessage = ""
	item.ErrorDetails = ""
	item.Progress = 0

	log.Printf("[Queue] Retrying item %s (attempt %d)", id, item.RetryCount+1)

	go s.tryProcessNext()

	return nil
}

// UpdateProgress 更新进度
func (s *Service) UpdateProgress(ctx context.Context, id string, progress int, stage string) error {
	s.mu.Lock()
	defer s.mu.Unlock()

	item, ok := s.queue[id]
	if !ok {
		return fmt.Errorf("item not found: %s", id)
	}

	if item.Status != models.StatusRunning {
		return fmt.Errorf("item not running: %s", item.Status)
	}

	if progress < 0 {
		progress = 0
	}
	if progress > 100 {
		progress = 100
	}

	item.Progress = progress
	if stage != "" {
		item.CurrentStage = stage
	}

	return nil
}

// MarkRunning 标记开始执行
func (s *Service) MarkRunning(ctx context.Context, id string, workerID string) error {
	s.mu.Lock()
	defer s.mu.Unlock()

	item, ok := s.queue[id]
	if !ok {
		return fmt.Errorf("item not found: %s", id)
	}

	if item.Status != models.StatusPreparing {
		return fmt.Errorf("item not in preparing state: %s", item.Status)
	}

	item.Status = models.StatusRunning
	item.AssignedWorker = workerID

	log.Printf("[Queue] Item %s now running on worker %s", id, workerID)

	return nil
}

// MarkCompleted 标记完成
func (s *Service) MarkCompleted(ctx context.Context, id string, outputs *models.QueueItemOutputs) error {
	s.mu.Lock()
	defer s.mu.Unlock()

	item, ok := s.queue[id]
	if !ok {
		return fmt.Errorf("item not found: %s", id)
	}

	now := time.Now()
	var duration int
	if item.StartedAt != nil {
		duration = int(now.Sub(*item.StartedAt).Minutes())
	}

	item.Status = models.StatusCompleted
	item.Progress = 100
	item.CompletedAt = &now
	item.ActualDuration = &duration
	item.Outputs = outputs

	// 释放 worker
	if item.AssignedWorker != "" {
		s.releaseWorker(item.AssignedWorker)
	}

	log.Printf("[Queue] Item %s completed in %d minutes", id, duration)

	go s.tryProcessNext()

	return nil
}

// MarkFailed 标记失败
func (s *Service) MarkFailed(ctx context.Context, id string, reason models.FailureReason, errorMsg string, errorDetails string) error {
	s.mu.Lock()
	defer s.mu.Unlock()

	item, ok := s.queue[id]
	if !ok {
		return fmt.Errorf("item not found: %s", id)
	}

	// 检查是否可以重试
	if item.RetryCount < item.MaxRetries && reason.CanRetry() {
		// 延迟重试
		go func() {
			time.Sleep(time.Duration(s.config.RetryDelayMinutes) * time.Minute)
			s.RetryItem(ctx, id)
		}()

		item.Status = models.StatusQueued
		item.RetryCount++
		item.FailureReason = &reason
		item.ErrorMessage = errorMsg
		item.ErrorDetails = errorDetails

		log.Printf("[Queue] Item %s scheduled for retry (attempt %d)", id, item.RetryCount+1)
	} else {
		// 最终失败
		now := time.Now()
		var duration int
		if item.StartedAt != nil {
			duration = int(now.Sub(*item.StartedAt).Minutes())
		}

		item.Status = models.StatusFailed
		item.CompletedAt = &now
		item.ActualDuration = &duration
		item.FailureReason = &reason
		item.ErrorMessage = errorMsg
		item.ErrorDetails = errorDetails

		log.Printf("[Queue] Item %s failed: %s - %s", id, reason, errorMsg)
	}

	// 释放 worker
	if item.AssignedWorker != "" {
		s.releaseWorker(item.AssignedWorker)
	}

	go s.tryProcessNext()

	return nil
}

// GetStats 获取统计数据
func (s *Service) GetStats(ctx context.Context) *models.QueueStats {
	s.mu.RLock()
	defer s.mu.RUnlock()

	stats := &models.QueueStats{
		ByPriority: make(map[models.DeliveryPriority]int),
		ByStatus:   make(map[models.QueueItemStatus]int),
	}

	var totalWaitTime, totalDeliveryTime int
	var waitCount, deliveryCount int

	today := time.Now().Truncate(24 * time.Hour)

	for _, item := range s.queue {
		stats.ByStatus[item.Status]++
		stats.ByPriority[item.Priority]++

		// 计算等待时间
		if item.StartedAt != nil {
			wait := int(item.StartedAt.Sub(item.QueuedAt).Minutes())
			totalWaitTime += wait
			waitCount++
		}

		// 计算交付时间
		if item.ActualDuration != nil {
			totalDeliveryTime += *item.ActualDuration
			deliveryCount++
		}

		// 今日统计
		if item.CompletedAt != nil && item.CompletedAt.After(today) {
			if item.Status == models.StatusCompleted {
				stats.TodayCompleted++
			}
			if item.Status == models.StatusFailed {
				stats.TodayFailed++
			}
		}
	}

	stats.TotalQueued = stats.ByStatus[models.StatusQueued] + stats.ByStatus[models.StatusPreparing]
	stats.TotalRunning = stats.ByStatus[models.StatusRunning]
	stats.TotalCompleted = stats.ByStatus[models.StatusCompleted]
	stats.TotalFailed = stats.ByStatus[models.StatusFailed]

	if waitCount > 0 {
		stats.AverageWaitTime = totalWaitTime / waitCount
	}
	if deliveryCount > 0 {
		stats.AverageDeliveryTime = totalDeliveryTime / deliveryCount
	}

	total := stats.TotalCompleted + stats.TotalFailed
	if total > 0 {
		stats.SuccessRate = float64(stats.TotalCompleted) / float64(total) * 100
	} else {
		stats.SuccessRate = 100
	}

	return stats
}

// GetEstimatedWaitTime 获取预计等待时间
func (s *Service) GetEstimatedWaitTime(ctx context.Context, priority models.DeliveryPriority) int {
	s.mu.RLock()
	defer s.mu.RUnlock()

	var totalTime int
	targetWeight := models.PriorityWeight[priority]

	for _, item := range s.queue {
		if item.Status == models.StatusQueued || item.Status == models.StatusPreparing || item.Status == models.StatusRunning {
			itemWeight := models.PriorityWeight[item.Priority]
			if itemWeight >= targetWeight {
				remaining := item.EstimatedDuration - (item.Progress * item.EstimatedDuration / 100)
				totalTime += remaining
			}
		}
	}

	// 考虑并行处理
	return (totalTime + s.config.MaxConcurrent - 1) / s.config.MaxConcurrent
}

// GetQueuePosition 获取队列位置
func (s *Service) GetQueuePosition(ctx context.Context, id string) int {
	items := s.GetQueue(ctx, QueueFilter{Status: []models.QueueItemStatus{models.StatusQueued}})

	for i, item := range items {
		if item.ID == id {
			return i + 1
		}
	}
	return -1
}

// tryProcessNext 尝试处理下一个
func (s *Service) tryProcessNext() {
	s.mu.Lock()
	defer s.mu.Unlock()

	// 检查并发数
	runningCount := 0
	for _, item := range s.queue {
		if item.Status == models.StatusRunning || item.Status == models.StatusPreparing {
			runningCount++
		}
	}

	if runningCount >= s.config.MaxConcurrent {
		return
	}

	// 找到下一个要处理的
	var nextItem *models.QueueItem
	for _, item := range s.queue {
		if item.Status == models.StatusQueued {
			if nextItem == nil || models.PriorityWeight[item.Priority] > models.PriorityWeight[nextItem.Priority] {
				nextItem = item
			} else if models.PriorityWeight[item.Priority] == models.PriorityWeight[nextItem.Priority] &&
				item.QueuedAt.Before(nextItem.QueuedAt) {
				nextItem = item
			}
		}
	}

	if nextItem == nil {
		return
	}

	// 开始准备
	now := time.Now()
	nextItem.Status = models.StatusPreparing
	nextItem.StartedAt = &now

	log.Printf("[Queue] Preparing item %s (project: %s)", nextItem.ID, nextItem.ProjectName)
}

// releaseWorker 释放工作节点
func (s *Service) releaseWorker(workerID string) {
	worker, ok := s.workers[workerID]
	if !ok {
		return
	}

	worker.Status = "idle"
	worker.CurrentItem = ""
	worker.LastActiveAt = time.Now()
}

// RegisterWorker 注册工作节点
func (s *Service) RegisterWorker(ctx context.Context, id, name string, capabilities []string) *models.WorkerNode {
	s.mu.Lock()
	defer s.mu.Unlock()

	worker := &models.WorkerNode{
		ID:           id,
		Name:         name,
		Status:       "idle",
		LastActiveAt: time.Now(),
		Capabilities: capabilities,
	}

	s.workers[id] = worker
	log.Printf("[Queue] Registered worker %s (%s)", id, name)

	return worker
}

// Cleanup 清理旧数据
func (s *Service) Cleanup(ctx context.Context, daysToKeep int) int {
	s.mu.Lock()
	defer s.mu.Unlock()

	cutoff := time.Now().AddDate(0, 0, -daysToKeep)
	removed := 0

	for id, item := range s.queue {
		if (item.Status == models.StatusCompleted || item.Status == models.StatusFailed || item.Status == models.StatusCancelled) &&
			item.CompletedAt != nil && item.CompletedAt.Before(cutoff) {
			delete(s.queue, id)
			removed++
		}
	}

	log.Printf("[Queue] Cleaned up %d old items", removed)
	return removed
}

// AddToQueueInput 添加到队列的输入
type AddToQueueInput struct {
	ProjectID   string                  `json:"projectId"`
	ProjectName string                  `json:"projectName"`
	ClientName  string                  `json:"clientName"`
	ClientEmail string                  `json:"clientEmail"`
	ProductType string                  `json:"productType"`
	Priority    models.DeliveryPriority `json:"priority,omitempty"`
	Config      models.QueueItemConfig  `json:"config,omitempty"`
}

// QueueFilter 队列过滤器
type QueueFilter struct {
	Status      []models.QueueItemStatus
	Priority    []models.DeliveryPriority
	ProductType []string
}

// Helper functions
func containsStatus(slice []models.QueueItemStatus, item models.QueueItemStatus) bool {
	for _, s := range slice {
		if s == item {
			return true
		}
	}
	return false
}

func containsPriority(slice []models.DeliveryPriority, item models.DeliveryPriority) bool {
	for _, p := range slice {
		if p == item {
			return true
		}
	}
	return false
}

func containsString(slice []string, item string) bool {
	for _, s := range slice {
		if s == item {
			return true
		}
	}
	return false
}

func randomString(n int) string {
	const letters = "abcdefghijklmnopqrstuvwxyz0123456789"
	b := make([]byte, n)
	for i := range b {
		b[i] = letters[time.Now().UnixNano()%int64(len(letters))]
	}
	return string(b)
}
