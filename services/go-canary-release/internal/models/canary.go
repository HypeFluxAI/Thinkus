package models

import "time"

// ReleaseStatus 发布状态
type ReleaseStatus string

const (
	StatusPending   ReleaseStatus = "pending"
	StatusCanary    ReleaseStatus = "canary"      // 灰度中
	StatusRolling   ReleaseStatus = "rolling"     // 滚动发布中
	StatusCompleted ReleaseStatus = "completed"   // 完成
	StatusRolledBack ReleaseStatus = "rolled_back" // 已回滚
	StatusFailed    ReleaseStatus = "failed"      // 失败
)

// RolloutStrategy 发布策略
type RolloutStrategy string

const (
	StrategyCanary   RolloutStrategy = "canary"    // 金丝雀发布
	StrategyLinear   RolloutStrategy = "linear"    // 线性增长
	StrategyBlueGreen RolloutStrategy = "blue_green" // 蓝绿发布
)

// CanaryRelease 灰度发布
type CanaryRelease struct {
	ID            string          `json:"id" bson:"_id"`
	ProjectID     string          `json:"projectId" bson:"projectId"`
	Name          string          `json:"name" bson:"name"`
	Description   string          `json:"description" bson:"description"`

	// 版本信息
	FromVersion   string          `json:"fromVersion" bson:"fromVersion"`
	ToVersion     string          `json:"toVersion" bson:"toVersion"`
	DeploymentID  string          `json:"deploymentId" bson:"deploymentId"`

	// 策略配置
	Strategy      RolloutStrategy `json:"strategy" bson:"strategy"`
	TargetPercent int             `json:"targetPercent" bson:"targetPercent"` // 目标流量百分比
	CurrentPercent int            `json:"currentPercent" bson:"currentPercent"` // 当前流量百分比
	StepPercent   int             `json:"stepPercent" bson:"stepPercent"` // 每步增量
	StepInterval  int             `json:"stepInterval" bson:"stepInterval"` // 每步间隔(秒)

	// 健康检查
	HealthConfig  HealthConfig    `json:"healthConfig" bson:"healthConfig"`

	// 自动回滚条件
	AutoRollback  bool            `json:"autoRollback" bson:"autoRollback"`
	RollbackRules []RollbackRule  `json:"rollbackRules" bson:"rollbackRules"`

	// 状态
	Status        ReleaseStatus   `json:"status" bson:"status"`
	CurrentStep   int             `json:"currentStep" bson:"currentStep"`
	TotalSteps    int             `json:"totalSteps" bson:"totalSteps"`

	// 指标
	Metrics       ReleaseMetrics  `json:"metrics" bson:"metrics"`

	// 时间
	CreatedAt     time.Time       `json:"createdAt" bson:"createdAt"`
	StartedAt     *time.Time      `json:"startedAt,omitempty" bson:"startedAt,omitempty"`
	CompletedAt   *time.Time      `json:"completedAt,omitempty" bson:"completedAt,omitempty"`

	// 日志
	Events        []ReleaseEvent  `json:"events" bson:"events"`
}

// HealthConfig 健康检查配置
type HealthConfig struct {
	Endpoint       string `json:"endpoint" bson:"endpoint"`
	Interval       int    `json:"interval" bson:"interval"` // 秒
	Timeout        int    `json:"timeout" bson:"timeout"`   // 秒
	SuccessThreshold int  `json:"successThreshold" bson:"successThreshold"`
	FailureThreshold int  `json:"failureThreshold" bson:"failureThreshold"`
}

// RollbackRule 回滚规则
type RollbackRule struct {
	Metric    string  `json:"metric" bson:"metric"` // error_rate/response_time/success_rate
	Operator  string  `json:"operator" bson:"operator"` // gt/lt/gte/lte
	Threshold float64 `json:"threshold" bson:"threshold"`
	Duration  int     `json:"duration" bson:"duration"` // 持续秒数
}

// ReleaseMetrics 发布指标
type ReleaseMetrics struct {
	RequestsTotal    int64   `json:"requestsTotal" bson:"requestsTotal"`
	RequestsCanary   int64   `json:"requestsCanary" bson:"requestsCanary"`
	ErrorRate        float64 `json:"errorRate" bson:"errorRate"`
	AvgResponseTime  float64 `json:"avgResponseTime" bson:"avgResponseTime"`
	P99ResponseTime  float64 `json:"p99ResponseTime" bson:"p99ResponseTime"`
	SuccessRate      float64 `json:"successRate" bson:"successRate"`
}

// ReleaseEvent 发布事件
type ReleaseEvent struct {
	Timestamp time.Time `json:"timestamp" bson:"timestamp"`
	Type      string    `json:"type" bson:"type"` // started/step/health/rollback/completed
	Message   string    `json:"message" bson:"message"`
	Data      map[string]interface{} `json:"data,omitempty" bson:"data,omitempty"`
}

// CanaryConfig 灰度配置
type CanaryConfig struct {
	Strategy      RolloutStrategy `json:"strategy"`
	InitialPercent int            `json:"initialPercent"` // 初始流量百分比
	StepPercent   int             `json:"stepPercent"`    // 每步增量
	StepInterval  int             `json:"stepInterval"`   // 每步间隔(秒)
	AutoRollback  bool            `json:"autoRollback"`
	RollbackRules []RollbackRule  `json:"rollbackRules"`
	HealthConfig  HealthConfig    `json:"healthConfig"`
}

// 预定义的发布配置
var DefaultConfigs = map[string]CanaryConfig{
	"safe": {
		Strategy:       StrategyCanary,
		InitialPercent: 5,
		StepPercent:    10,
		StepInterval:   300, // 5分钟
		AutoRollback:   true,
		RollbackRules: []RollbackRule{
			{Metric: "error_rate", Operator: "gt", Threshold: 1.0, Duration: 60},
			{Metric: "response_time", Operator: "gt", Threshold: 2000, Duration: 60},
		},
		HealthConfig: HealthConfig{
			Endpoint:         "/api/health",
			Interval:         30,
			Timeout:          10,
			SuccessThreshold: 3,
			FailureThreshold: 2,
		},
	},
	"fast": {
		Strategy:       StrategyLinear,
		InitialPercent: 20,
		StepPercent:    20,
		StepInterval:   60, // 1分钟
		AutoRollback:   true,
		RollbackRules: []RollbackRule{
			{Metric: "error_rate", Operator: "gt", Threshold: 5.0, Duration: 30},
		},
		HealthConfig: HealthConfig{
			Endpoint:         "/api/health",
			Interval:         15,
			Timeout:          5,
			SuccessThreshold: 2,
			FailureThreshold: 3,
		},
	},
	"blue_green": {
		Strategy:       StrategyBlueGreen,
		InitialPercent: 0,
		StepPercent:    100,
		StepInterval:   0,
		AutoRollback:   true,
		RollbackRules: []RollbackRule{
			{Metric: "error_rate", Operator: "gt", Threshold: 0.5, Duration: 30},
		},
		HealthConfig: HealthConfig{
			Endpoint:         "/api/health",
			Interval:         10,
			Timeout:          5,
			SuccessThreshold: 5,
			FailureThreshold: 2,
		},
	},
}
