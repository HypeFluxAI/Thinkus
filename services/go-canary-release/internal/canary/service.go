package canary

import (
	"context"
	"fmt"
	"math/rand"
	"sync"
	"time"

	"github.com/google/uuid"
	"github.com/thinkus/go-canary-release/internal/models"
)

// Service 灰度发布服务
type Service struct {
	releases map[string]*models.CanaryRelease
	mutex    sync.RWMutex

	// 回调
	onProgress func(release *models.CanaryRelease)
	onComplete func(release *models.CanaryRelease)
	onRollback func(release *models.CanaryRelease)
}

// NewService 创建新服务实例
func NewService() *Service {
	return &Service{
		releases: make(map[string]*models.CanaryRelease),
	}
}

// SetCallbacks 设置回调
func (s *Service) SetCallbacks(onProgress, onComplete, onRollback func(*models.CanaryRelease)) {
	s.onProgress = onProgress
	s.onComplete = onComplete
	s.onRollback = onRollback
}

// CreateReleaseInput 创建发布输入
type CreateReleaseInput struct {
	ProjectID    string
	Name         string
	Description  string
	FromVersion  string
	ToVersion    string
	DeploymentID string
	ConfigPreset string // safe/fast/blue_green
	CustomConfig *models.CanaryConfig
}

// CreateRelease 创建灰度发布
func (s *Service) CreateRelease(ctx context.Context, input CreateReleaseInput) (*models.CanaryRelease, error) {
	s.mutex.Lock()
	defer s.mutex.Unlock()

	// 获取配置
	var config models.CanaryConfig
	if input.CustomConfig != nil {
		config = *input.CustomConfig
	} else if preset, ok := models.DefaultConfigs[input.ConfigPreset]; ok {
		config = preset
	} else {
		config = models.DefaultConfigs["safe"]
	}

	// 计算步骤数
	totalSteps := (100 - config.InitialPercent) / config.StepPercent
	if (100-config.InitialPercent)%config.StepPercent != 0 {
		totalSteps++
	}

	id := uuid.New().String()
	now := time.Now()

	release := &models.CanaryRelease{
		ID:             id,
		ProjectID:      input.ProjectID,
		Name:           input.Name,
		Description:    input.Description,
		FromVersion:    input.FromVersion,
		ToVersion:      input.ToVersion,
		DeploymentID:   input.DeploymentID,
		Strategy:       config.Strategy,
		TargetPercent:  100,
		CurrentPercent: 0,
		StepPercent:    config.StepPercent,
		StepInterval:   config.StepInterval,
		HealthConfig:   config.HealthConfig,
		AutoRollback:   config.AutoRollback,
		RollbackRules:  config.RollbackRules,
		Status:         models.StatusPending,
		CurrentStep:    0,
		TotalSteps:     totalSteps,
		Metrics:        models.ReleaseMetrics{SuccessRate: 100},
		CreatedAt:      now,
		Events:         []models.ReleaseEvent{},
	}

	s.addEvent(release, "created", fmt.Sprintf("灰度发布已创建，策略: %s", config.Strategy), nil)

	s.releases[id] = release

	return release, nil
}

// StartRelease 开始灰度发布
func (s *Service) StartRelease(ctx context.Context, id string) error {
	s.mutex.Lock()
	release, ok := s.releases[id]
	if !ok {
		s.mutex.Unlock()
		return fmt.Errorf("release not found: %s", id)
	}

	if release.Status != models.StatusPending {
		s.mutex.Unlock()
		return fmt.Errorf("release is not in pending status")
	}

	now := time.Now()
	release.Status = models.StatusCanary
	release.StartedAt = &now

	// 设置初始流量
	initialPercent := models.DefaultConfigs["safe"].InitialPercent
	if preset, ok := models.DefaultConfigs[string(release.Strategy)]; ok {
		initialPercent = preset.InitialPercent
	}
	release.CurrentPercent = initialPercent
	release.CurrentStep = 1

	s.addEvent(release, "started", fmt.Sprintf("灰度发布已开始，初始流量: %d%%", initialPercent), nil)
	s.mutex.Unlock()

	// 异步执行灰度发布
	go s.runCanaryLoop(context.Background(), id)

	return nil
}

// runCanaryLoop 运行灰度发布循环
func (s *Service) runCanaryLoop(ctx context.Context, id string) {
	for {
		s.mutex.Lock()
		release, ok := s.releases[id]
		if !ok || release.Status != models.StatusCanary {
			s.mutex.Unlock()
			return
		}

		// 健康检查
		healthy := s.checkHealth(release)
		if !healthy && release.AutoRollback {
			s.addEvent(release, "health_failed", "健康检查失败，触发自动回滚", nil)
			s.mutex.Unlock()
			s.Rollback(ctx, id, "健康检查失败")
			return
		}

		// 检查回滚规则
		if release.AutoRollback && s.shouldRollback(release) {
			s.addEvent(release, "rule_triggered", "回滚规则触发，开始回滚", nil)
			s.mutex.Unlock()
			s.Rollback(ctx, id, "回滚规则触发")
			return
		}

		// 已达到 100%
		if release.CurrentPercent >= 100 {
			now := time.Now()
			release.Status = models.StatusCompleted
			release.CompletedAt = &now
			s.addEvent(release, "completed", "灰度发布完成，流量已全部切换到新版本", nil)
			s.mutex.Unlock()

			if s.onComplete != nil {
				s.onComplete(release)
			}
			return
		}

		// 增加流量
		nextPercent := release.CurrentPercent + release.StepPercent
		if nextPercent > 100 {
			nextPercent = 100
		}
		release.CurrentPercent = nextPercent
		release.CurrentStep++

		s.addEvent(release, "step", fmt.Sprintf("流量已增加到 %d%%", nextPercent), map[string]interface{}{
			"step":    release.CurrentStep,
			"percent": nextPercent,
		})

		s.mutex.Unlock()

		if s.onProgress != nil {
			s.onProgress(release)
		}

		// 等待下一步
		time.Sleep(time.Duration(release.StepInterval) * time.Second)
	}
}

// checkHealth 健康检查
func (s *Service) checkHealth(release *models.CanaryRelease) bool {
	// 模拟健康检查
	// 实际实现中会调用健康检查端点
	return rand.Float64() > 0.1 // 90% 概率健康
}

// shouldRollback 检查是否应该回滚
func (s *Service) shouldRollback(release *models.CanaryRelease) bool {
	for _, rule := range release.RollbackRules {
		var value float64
		switch rule.Metric {
		case "error_rate":
			value = release.Metrics.ErrorRate
		case "response_time":
			value = release.Metrics.AvgResponseTime
		case "success_rate":
			value = release.Metrics.SuccessRate
		}

		var triggered bool
		switch rule.Operator {
		case "gt":
			triggered = value > rule.Threshold
		case "gte":
			triggered = value >= rule.Threshold
		case "lt":
			triggered = value < rule.Threshold
		case "lte":
			triggered = value <= rule.Threshold
		}

		if triggered {
			return true
		}
	}

	return false
}

// Rollback 回滚发布
func (s *Service) Rollback(ctx context.Context, id string, reason string) error {
	s.mutex.Lock()
	defer s.mutex.Unlock()

	release, ok := s.releases[id]
	if !ok {
		return fmt.Errorf("release not found: %s", id)
	}

	now := time.Now()
	release.Status = models.StatusRolledBack
	release.CompletedAt = &now
	release.CurrentPercent = 0

	s.addEvent(release, "rollback", fmt.Sprintf("已回滚: %s", reason), nil)

	if s.onRollback != nil {
		s.onRollback(release)
	}

	return nil
}

// PauseRelease 暂停发布
func (s *Service) PauseRelease(ctx context.Context, id string) error {
	s.mutex.Lock()
	defer s.mutex.Unlock()

	release, ok := s.releases[id]
	if !ok {
		return fmt.Errorf("release not found: %s", id)
	}

	if release.Status != models.StatusCanary {
		return fmt.Errorf("can only pause canary release")
	}

	release.Status = models.StatusPending // 暂停状态
	s.addEvent(release, "paused", "灰度发布已暂停", nil)

	return nil
}

// ResumeRelease 恢复发布
func (s *Service) ResumeRelease(ctx context.Context, id string) error {
	s.mutex.Lock()
	release, ok := s.releases[id]
	if !ok {
		s.mutex.Unlock()
		return fmt.Errorf("release not found: %s", id)
	}

	release.Status = models.StatusCanary
	s.addEvent(release, "resumed", "灰度发布已恢复", nil)
	s.mutex.Unlock()

	// 继续灰度循环
	go s.runCanaryLoop(context.Background(), id)

	return nil
}

// PromoteToFull 直接全量发布
func (s *Service) PromoteToFull(ctx context.Context, id string) error {
	s.mutex.Lock()
	defer s.mutex.Unlock()

	release, ok := s.releases[id]
	if !ok {
		return fmt.Errorf("release not found: %s", id)
	}

	now := time.Now()
	release.CurrentPercent = 100
	release.Status = models.StatusCompleted
	release.CompletedAt = &now

	s.addEvent(release, "promoted", "已直接全量发布", nil)

	if s.onComplete != nil {
		s.onComplete(release)
	}

	return nil
}

// GetRelease 获取发布详情
func (s *Service) GetRelease(ctx context.Context, id string) (*models.CanaryRelease, error) {
	s.mutex.RLock()
	defer s.mutex.RUnlock()

	release, ok := s.releases[id]
	if !ok {
		return nil, fmt.Errorf("release not found: %s", id)
	}

	return release, nil
}

// GetProjectReleases 获取项目的所有发布
func (s *Service) GetProjectReleases(ctx context.Context, projectID string) ([]*models.CanaryRelease, error) {
	s.mutex.RLock()
	defer s.mutex.RUnlock()

	var result []*models.CanaryRelease
	for _, r := range s.releases {
		if r.ProjectID == projectID {
			result = append(result, r)
		}
	}

	return result, nil
}

// UpdateMetrics 更新指标
func (s *Service) UpdateMetrics(ctx context.Context, id string, metrics models.ReleaseMetrics) error {
	s.mutex.Lock()
	defer s.mutex.Unlock()

	release, ok := s.releases[id]
	if !ok {
		return fmt.Errorf("release not found: %s", id)
	}

	release.Metrics = metrics

	return nil
}

// addEvent 添加事件
func (s *Service) addEvent(release *models.CanaryRelease, eventType, message string, data map[string]interface{}) {
	release.Events = append(release.Events, models.ReleaseEvent{
		Timestamp: time.Now(),
		Type:      eventType,
		Message:   message,
		Data:      data,
	})
}
