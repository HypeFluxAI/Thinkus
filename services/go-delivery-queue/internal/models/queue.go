package models

import (
	"time"
)

// DeliveryPriority 交付优先级
type DeliveryPriority string

const (
	PriorityUrgent DeliveryPriority = "urgent"
	PriorityHigh   DeliveryPriority = "high"
	PriorityNormal DeliveryPriority = "normal"
	PriorityLow    DeliveryPriority = "low"
)

// PriorityWeight 优先级权重
var PriorityWeight = map[DeliveryPriority]int{
	PriorityUrgent: 100,
	PriorityHigh:   50,
	PriorityNormal: 10,
	PriorityLow:    1,
}

// QueueItemStatus 队列项状态
type QueueItemStatus string

const (
	StatusQueued    QueueItemStatus = "queued"
	StatusPreparing QueueItemStatus = "preparing"
	StatusRunning   QueueItemStatus = "running"
	StatusPaused    QueueItemStatus = "paused"
	StatusCompleted QueueItemStatus = "completed"
	StatusFailed    QueueItemStatus = "failed"
	StatusCancelled QueueItemStatus = "cancelled"
)

// FailureReason 失败原因
type FailureReason string

const (
	ReasonBuildFailed       FailureReason = "build_failed"
	ReasonTestFailed        FailureReason = "test_failed"
	ReasonDeployFailed      FailureReason = "deploy_failed"
	ReasonGateBlocked       FailureReason = "gate_blocked"
	ReasonTimeout           FailureReason = "timeout"
	ReasonResourceExhausted FailureReason = "resource_exhausted"
	ReasonManualCancel      FailureReason = "manual_cancel"
	ReasonDependencyFailed  FailureReason = "dependency_failed"
	ReasonUnknown           FailureReason = "unknown"
)

// QueueItemConfig 队列项配置
type QueueItemConfig struct {
	SkipTests        bool   `json:"skipTests" bson:"skipTests"`
	SkipAcceptance   bool   `json:"skipAcceptance" bson:"skipAcceptance"`
	AutoSign         bool   `json:"autoSign" bson:"autoSign"`
	CustomDomain     string `json:"customDomain,omitempty" bson:"customDomain,omitempty"`
	NotifyOnComplete bool   `json:"notifyOnComplete" bson:"notifyOnComplete"`
}

// QueueItemOutputs 队列项输出
type QueueItemOutputs struct {
	ProductUrl   string `json:"productUrl,omitempty" bson:"productUrl,omitempty"`
	AdminUrl     string `json:"adminUrl,omitempty" bson:"adminUrl,omitempty"`
	DeploymentId string `json:"deploymentId,omitempty" bson:"deploymentId,omitempty"`
}

// QueueItem 队列项
type QueueItem struct {
	ID           string           `json:"id" bson:"_id"`
	ProjectID    string           `json:"projectId" bson:"projectId"`
	ProjectName  string           `json:"projectName" bson:"projectName"`
	ClientName   string           `json:"clientName" bson:"clientName"`
	ClientEmail  string           `json:"clientEmail" bson:"clientEmail"`
	ProductType  string           `json:"productType" bson:"productType"`
	Priority     DeliveryPriority `json:"priority" bson:"priority"`
	Status       QueueItemStatus  `json:"status" bson:"status"`

	// 时间信息
	QueuedAt          time.Time  `json:"queuedAt" bson:"queuedAt"`
	StartedAt         *time.Time `json:"startedAt,omitempty" bson:"startedAt,omitempty"`
	CompletedAt       *time.Time `json:"completedAt,omitempty" bson:"completedAt,omitempty"`
	EstimatedDuration int        `json:"estimatedDuration" bson:"estimatedDuration"` // 分钟
	ActualDuration    *int       `json:"actualDuration,omitempty" bson:"actualDuration,omitempty"`

	// 执行信息
	CurrentStage   string `json:"currentStage,omitempty" bson:"currentStage,omitempty"`
	Progress       int    `json:"progress" bson:"progress"` // 0-100
	AssignedWorker string `json:"assignedWorker,omitempty" bson:"assignedWorker,omitempty"`
	RetryCount     int    `json:"retryCount" bson:"retryCount"`
	MaxRetries     int    `json:"maxRetries" bson:"maxRetries"`

	// 失败信息
	FailureReason *FailureReason `json:"failureReason,omitempty" bson:"failureReason,omitempty"`
	ErrorMessage  string         `json:"errorMessage,omitempty" bson:"errorMessage,omitempty"`
	ErrorDetails  string         `json:"errorDetails,omitempty" bson:"errorDetails,omitempty"`

	// 配置和输出
	Config  QueueItemConfig   `json:"config" bson:"config"`
	Outputs *QueueItemOutputs `json:"outputs,omitempty" bson:"outputs,omitempty"`
}

// QueueStats 队列统计
type QueueStats struct {
	TotalQueued       int                         `json:"totalQueued"`
	TotalRunning      int                         `json:"totalRunning"`
	TotalCompleted    int                         `json:"totalCompleted"`
	TotalFailed       int                         `json:"totalFailed"`
	ByPriority        map[DeliveryPriority]int    `json:"byPriority"`
	ByStatus          map[QueueItemStatus]int     `json:"byStatus"`
	AverageWaitTime   int                         `json:"averageWaitTime"`   // 分钟
	AverageDeliveryTime int                       `json:"averageDeliveryTime"` // 分钟
	SuccessRate       float64                     `json:"successRate"`       // 百分比
	TodayCompleted    int                         `json:"todayCompleted"`
	TodayFailed       int                         `json:"todayFailed"`
}

// WorkerNode 工作节点
type WorkerNode struct {
	ID             string    `json:"id" bson:"_id"`
	Name           string    `json:"name" bson:"name"`
	Status         string    `json:"status" bson:"status"` // idle, busy, offline
	CurrentItem    string    `json:"currentItem,omitempty" bson:"currentItem,omitempty"`
	CompletedCount int       `json:"completedCount" bson:"completedCount"`
	FailedCount    int       `json:"failedCount" bson:"failedCount"`
	LastActiveAt   time.Time `json:"lastActiveAt" bson:"lastActiveAt"`
	Capabilities   []string  `json:"capabilities" bson:"capabilities"` // 支持的产品类型
}

// QueueConfig 队列配置
type QueueConfig struct {
	MaxConcurrent     int `json:"maxConcurrent"`
	MaxRetries        int `json:"maxRetries"`
	RetryDelayMinutes int `json:"retryDelayMinutes"`
	TimeoutMinutes    int `json:"timeoutMinutes"`
}

// EstimatedDuration 预估交付时间（分钟）
var EstimatedDuration = map[string]int{
	"web-app":      30,
	"ecommerce":    45,
	"mobile-app":   60,
	"api-service":  20,
	"mini-program": 40,
	"default":      35,
}

// GetEstimatedDuration 获取预估时间
func GetEstimatedDuration(productType string) int {
	if d, ok := EstimatedDuration[productType]; ok {
		return d
	}
	return EstimatedDuration["default"]
}

// CanRetry 判断是否可以重试
func (r FailureReason) CanRetry() bool {
	nonRetryable := map[FailureReason]bool{
		ReasonManualCancel: true,
		ReasonGateBlocked:  true,
	}
	return !nonRetryable[r]
}
