package main

import (
	"context"
	"fmt"
	"log"
	"net/http"
	"os"
	"sync"
	"time"

	"github.com/gin-gonic/gin"
	"github.com/google/uuid"
)

// ========== 模型定义 ==========

// TriggerType 触发类型
type TriggerType string

const (
	TriggerHealthCheck TriggerType = "health_check"
	TriggerErrorRate   TriggerType = "error_rate"
	TriggerLatency     TriggerType = "latency"
	TriggerManual      TriggerType = "manual"
	TriggerSmoke       TriggerType = "smoke_test"
)

// RollbackStatus 回滚状态
type RollbackStatus string

const (
	StatusPending    RollbackStatus = "pending"
	StatusInProgress RollbackStatus = "in_progress"
	StatusCompleted  RollbackStatus = "completed"
	StatusFailed     RollbackStatus = "failed"
)

// RollbackConfig 回滚配置
type RollbackConfig struct {
	ProjectID         string       `json:"projectId"`
	DeploymentID      string       `json:"deploymentId"`
	TargetVersion     string       `json:"targetVersion"`      // 回滚到的版本
	CurrentVersion    string       `json:"currentVersion"`     // 当前版本

	// 监控配置
	HealthEndpoint    string       `json:"healthEndpoint"`
	CheckInterval     int          `json:"checkInterval"`      // 秒
	FailureThreshold  int          `json:"failureThreshold"`   // 连续失败次数

	// 阈值
	MaxErrorRate      float64      `json:"maxErrorRate"`       // 最大错误率 %
	MaxLatency        int          `json:"maxLatency"`         // 最大延迟 ms

	// 自动回滚
	AutoRollback      bool         `json:"autoRollback"`
	CooldownPeriod    int          `json:"cooldownPeriod"`     // 冷却时间(秒)
}

// RollbackRecord 回滚记录
type RollbackRecord struct {
	ID               string         `json:"id"`
	ProjectID        string         `json:"projectId"`
	DeploymentID     string         `json:"deploymentId"`
	FromVersion      string         `json:"fromVersion"`
	ToVersion        string         `json:"toVersion"`

	// 触发信息
	TriggerType      TriggerType    `json:"triggerType"`
	TriggerReason    string         `json:"triggerReason"`
	TriggerMetrics   map[string]interface{} `json:"triggerMetrics"`

	// 状态
	Status           RollbackStatus `json:"status"`
	Progress         int            `json:"progress"`

	// 时间
	TriggeredAt      time.Time      `json:"triggeredAt"`
	StartedAt        *time.Time     `json:"startedAt,omitempty"`
	CompletedAt      *time.Time     `json:"completedAt,omitempty"`
	Duration         int            `json:"duration"` // 秒

	// 日志
	Logs             []LogEntry     `json:"logs"`
}

// LogEntry 日志条目
type LogEntry struct {
	Timestamp time.Time `json:"timestamp"`
	Level     string    `json:"level"`
	Message   string    `json:"message"`
}

// MonitoringState 监控状态
type MonitoringState struct {
	ProjectID        string    `json:"projectId"`
	IsMonitoring     bool      `json:"isMonitoring"`
	LastCheckAt      time.Time `json:"lastCheckAt"`
	ConsecutiveFails int       `json:"consecutiveFails"`
	CurrentErrorRate float64   `json:"currentErrorRate"`
	CurrentLatency   int       `json:"currentLatency"`
}

// ========== 服务实现 ==========

// Service 自动回滚服务
type Service struct {
	configs   map[string]*RollbackConfig    // projectID -> config
	records   map[string]*RollbackRecord    // recordID -> record
	monitors  map[string]*MonitoringState   // projectID -> state
	mutex     sync.RWMutex
	stopChans map[string]chan struct{}      // projectID -> stop channel
}

// NewService 创建服务
func NewService() *Service {
	return &Service{
		configs:   make(map[string]*RollbackConfig),
		records:   make(map[string]*RollbackRecord),
		monitors:  make(map[string]*MonitoringState),
		stopChans: make(map[string]chan struct{}),
	}
}

// RegisterConfig 注册回滚配置
func (s *Service) RegisterConfig(config RollbackConfig) {
	s.mutex.Lock()
	defer s.mutex.Unlock()
	s.configs[config.ProjectID] = &config
}

// StartMonitoring 开始监控
func (s *Service) StartMonitoring(ctx context.Context, projectID string) error {
	s.mutex.Lock()
	config, ok := s.configs[projectID]
	if !ok {
		s.mutex.Unlock()
		return fmt.Errorf("config not found for project: %s", projectID)
	}

	// 初始化监控状态
	s.monitors[projectID] = &MonitoringState{
		ProjectID:    projectID,
		IsMonitoring: true,
		LastCheckAt:  time.Now(),
	}

	stopChan := make(chan struct{})
	s.stopChans[projectID] = stopChan
	s.mutex.Unlock()

	// 启动监控循环
	go s.monitorLoop(ctx, projectID, config, stopChan)

	return nil
}

// StopMonitoring 停止监控
func (s *Service) StopMonitoring(projectID string) {
	s.mutex.Lock()
	defer s.mutex.Unlock()

	if stopChan, ok := s.stopChans[projectID]; ok {
		close(stopChan)
		delete(s.stopChans, projectID)
	}

	if state, ok := s.monitors[projectID]; ok {
		state.IsMonitoring = false
	}
}

// monitorLoop 监控循环
func (s *Service) monitorLoop(ctx context.Context, projectID string, config *RollbackConfig, stopChan chan struct{}) {
	ticker := time.NewTicker(time.Duration(config.CheckInterval) * time.Second)
	defer ticker.Stop()

	for {
		select {
		case <-ctx.Done():
			return
		case <-stopChan:
			return
		case <-ticker.C:
			s.performHealthCheck(ctx, projectID, config)
		}
	}
}

// performHealthCheck 执行健康检查
func (s *Service) performHealthCheck(ctx context.Context, projectID string, config *RollbackConfig) {
	s.mutex.Lock()
	state := s.monitors[projectID]
	if state == nil {
		s.mutex.Unlock()
		return
	}
	s.mutex.Unlock()

	// 模拟健康检查
	// 实际实现中会调用健康检查端点
	healthy := s.checkHealth(config.HealthEndpoint)

	s.mutex.Lock()
	defer s.mutex.Unlock()

	state.LastCheckAt = time.Now()

	if !healthy {
		state.ConsecutiveFails++
		log.Printf("[%s] 健康检查失败，连续失败次数: %d", projectID, state.ConsecutiveFails)

		// 达到阈值，触发回滚
		if config.AutoRollback && state.ConsecutiveFails >= config.FailureThreshold {
			log.Printf("[%s] 达到失败阈值，触发自动回滚", projectID)
			go s.TriggerRollback(context.Background(), projectID, TriggerHealthCheck,
				fmt.Sprintf("连续 %d 次健康检查失败", state.ConsecutiveFails),
				map[string]interface{}{"consecutiveFails": state.ConsecutiveFails})
		}
	} else {
		state.ConsecutiveFails = 0
	}
}

// checkHealth 检查健康
func (s *Service) checkHealth(endpoint string) bool {
	// 模拟健康检查
	// 实际实现会发起 HTTP 请求
	client := http.Client{Timeout: 10 * time.Second}
	resp, err := client.Get(endpoint)
	if err != nil {
		return false
	}
	defer resp.Body.Close()
	return resp.StatusCode == 200
}

// TriggerRollback 触发回滚
func (s *Service) TriggerRollback(ctx context.Context, projectID string, triggerType TriggerType, reason string, metrics map[string]interface{}) (*RollbackRecord, error) {
	s.mutex.Lock()
	config, ok := s.configs[projectID]
	if !ok {
		s.mutex.Unlock()
		return nil, fmt.Errorf("config not found for project: %s", projectID)
	}

	recordID := uuid.New().String()
	now := time.Now()

	record := &RollbackRecord{
		ID:             recordID,
		ProjectID:      projectID,
		DeploymentID:   config.DeploymentID,
		FromVersion:    config.CurrentVersion,
		ToVersion:      config.TargetVersion,
		TriggerType:    triggerType,
		TriggerReason:  reason,
		TriggerMetrics: metrics,
		Status:         StatusPending,
		Progress:       0,
		TriggeredAt:    now,
		Logs:           []LogEntry{},
	}

	s.addLog(record, "info", fmt.Sprintf("回滚已触发: %s", reason))
	s.records[recordID] = record
	s.mutex.Unlock()

	// 异步执行回滚
	go s.executeRollback(ctx, record, config)

	return record, nil
}

// executeRollback 执行回滚
func (s *Service) executeRollback(ctx context.Context, record *RollbackRecord, config *RollbackConfig) {
	s.mutex.Lock()
	now := time.Now()
	record.Status = StatusInProgress
	record.StartedAt = &now
	s.addLog(record, "info", "开始执行回滚...")
	s.mutex.Unlock()

	// 模拟回滚步骤
	steps := []string{
		"准备回滚环境",
		"停止当前部署",
		"恢复目标版本",
		"启动服务",
		"验证健康状态",
	}

	for i, step := range steps {
		s.mutex.Lock()
		record.Progress = (i + 1) * 20
		s.addLog(record, "info", step)
		s.mutex.Unlock()

		time.Sleep(2 * time.Second) // 模拟操作时间
	}

	// 完成
	s.mutex.Lock()
	defer s.mutex.Unlock()

	endTime := time.Now()
	record.Status = StatusCompleted
	record.CompletedAt = &endTime
	record.Progress = 100
	record.Duration = int(endTime.Sub(*record.StartedAt).Seconds())

	s.addLog(record, "info", fmt.Sprintf("回滚完成，耗时 %d 秒", record.Duration))

	// 更新配置版本
	config.CurrentVersion = config.TargetVersion
}

// GetRecord 获取回滚记录
func (s *Service) GetRecord(recordID string) (*RollbackRecord, error) {
	s.mutex.RLock()
	defer s.mutex.RUnlock()

	record, ok := s.records[recordID]
	if !ok {
		return nil, fmt.Errorf("record not found: %s", recordID)
	}
	return record, nil
}

// GetProjectRecords 获取项目的回滚历史
func (s *Service) GetProjectRecords(projectID string) []*RollbackRecord {
	s.mutex.RLock()
	defer s.mutex.RUnlock()

	var records []*RollbackRecord
	for _, r := range s.records {
		if r.ProjectID == projectID {
			records = append(records, r)
		}
	}
	return records
}

// GetMonitoringState 获取监控状态
func (s *Service) GetMonitoringState(projectID string) *MonitoringState {
	s.mutex.RLock()
	defer s.mutex.RUnlock()
	return s.monitors[projectID]
}

// addLog 添加日志
func (s *Service) addLog(record *RollbackRecord, level, message string) {
	record.Logs = append(record.Logs, LogEntry{
		Timestamp: time.Now(),
		Level:     level,
		Message:   message,
	})
}

// ========== 主函数 ==========

func main() {
	port := os.Getenv("PORT")
	if port == "" {
		port = "8008"
	}

	ginMode := os.Getenv("GIN_MODE")
	if ginMode == "release" {
		gin.SetMode(gin.ReleaseMode)
	}

	service := NewService()

	r := gin.Default()

	// CORS
	r.Use(func(c *gin.Context) {
		c.Header("Access-Control-Allow-Origin", "*")
		c.Header("Access-Control-Allow-Methods", "GET, POST, PUT, DELETE, OPTIONS")
		c.Header("Access-Control-Allow-Headers", "Content-Type, Authorization")
		if c.Request.Method == "OPTIONS" {
			c.AbortWithStatus(204)
			return
		}
		c.Next()
	})

	api := r.Group("/api/v1")
	{
		api.GET("/health", func(c *gin.Context) {
			c.JSON(http.StatusOK, gin.H{
				"status":  "healthy",
				"service": "go-auto-rollback",
				"version": "1.0.0",
			})
		})

		// 配置管理
		api.POST("/configs", func(c *gin.Context) {
			var config RollbackConfig
			if err := c.ShouldBindJSON(&config); err != nil {
				c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
				return
			}
			service.RegisterConfig(config)
			c.JSON(http.StatusOK, gin.H{"success": true, "message": "配置已注册"})
		})

		// 监控控制
		api.POST("/projects/:projectId/monitor/start", func(c *gin.Context) {
			projectID := c.Param("projectId")
			if err := service.StartMonitoring(c.Request.Context(), projectID); err != nil {
				c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
				return
			}
			c.JSON(http.StatusOK, gin.H{"success": true, "message": "监控已启动"})
		})

		api.POST("/projects/:projectId/monitor/stop", func(c *gin.Context) {
			projectID := c.Param("projectId")
			service.StopMonitoring(projectID)
			c.JSON(http.StatusOK, gin.H{"success": true, "message": "监控已停止"})
		})

		api.GET("/projects/:projectId/monitor/status", func(c *gin.Context) {
			projectID := c.Param("projectId")
			state := service.GetMonitoringState(projectID)
			c.JSON(http.StatusOK, gin.H{"success": true, "state": state})
		})

		// 回滚操作
		api.POST("/projects/:projectId/rollback", func(c *gin.Context) {
			projectID := c.Param("projectId")
			var req struct {
				Reason string `json:"reason"`
			}
			c.ShouldBindJSON(&req)
			if req.Reason == "" {
				req.Reason = "手动触发"
			}

			record, err := service.TriggerRollback(c.Request.Context(), projectID, TriggerManual, req.Reason, nil)
			if err != nil {
				c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
				return
			}
			c.JSON(http.StatusOK, gin.H{"success": true, "record": record})
		})

		// 回滚记录
		api.GET("/records/:recordId", func(c *gin.Context) {
			recordID := c.Param("recordId")
			record, err := service.GetRecord(recordID)
			if err != nil {
				c.JSON(http.StatusNotFound, gin.H{"error": err.Error()})
				return
			}
			c.JSON(http.StatusOK, gin.H{"success": true, "record": record})
		})

		api.GET("/projects/:projectId/records", func(c *gin.Context) {
			projectID := c.Param("projectId")
			records := service.GetProjectRecords(projectID)
			c.JSON(http.StatusOK, gin.H{"success": true, "records": records, "count": len(records)})
		})
	}

	log.Printf("Go Auto-Rollback Service starting on port %s", port)
	if err := r.Run(":" + port); err != nil {
		log.Fatalf("Failed to start server: %v", err)
	}
}
