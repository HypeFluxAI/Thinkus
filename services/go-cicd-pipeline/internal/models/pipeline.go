package models

import "time"

// PipelineStatus 流水线状态
type PipelineStatus string

const (
	StatusQueued    PipelineStatus = "queued"
	StatusRunning   PipelineStatus = "running"
	StatusSuccess   PipelineStatus = "success"
	StatusFailed    PipelineStatus = "failed"
	StatusCancelled PipelineStatus = "cancelled"
	StatusSkipped   PipelineStatus = "skipped"
)

// TriggerType 触发类型
type TriggerType string

const (
	TriggerManual   TriggerType = "manual"      // 手动触发
	TriggerPush     TriggerType = "push"        // 代码推送
	TriggerPR       TriggerType = "pull_request" // PR
	TriggerSchedule TriggerType = "schedule"    // 定时
	TriggerWebhook  TriggerType = "webhook"     // Webhook
	TriggerAPI      TriggerType = "api"         // API 调用
)

// StageType 阶段类型
type StageType string

const (
	StageBuild     StageType = "build"
	StageTest      StageType = "test"
	StageLint      StageType = "lint"
	StageSecurity  StageType = "security"
	StageDeploy    StageType = "deploy"
	StageSmoke     StageType = "smoke_test"
	StageNotify    StageType = "notify"
	StageRollback  StageType = "rollback"
)

// Pipeline 流水线定义
type Pipeline struct {
	ID          string         `json:"id" bson:"_id"`
	ProjectID   string         `json:"projectId" bson:"projectId"`
	Name        string         `json:"name" bson:"name"`
	Description string         `json:"description" bson:"description"`

	// 配置
	RepoURL     string         `json:"repoUrl" bson:"repoUrl"`
	Branch      string         `json:"branch" bson:"branch"`
	Stages      []StageConfig  `json:"stages" bson:"stages"`

	// 触发条件
	Triggers    []TriggerConfig `json:"triggers" bson:"triggers"`

	// 环境变量
	EnvVars     map[string]string `json:"envVars" bson:"envVars"`
	Secrets     []string          `json:"secrets" bson:"secrets"`

	// 状态
	Enabled     bool           `json:"enabled" bson:"enabled"`
	LastRunID   string         `json:"lastRunId,omitempty" bson:"lastRunId,omitempty"`
	LastRunAt   *time.Time     `json:"lastRunAt,omitempty" bson:"lastRunAt,omitempty"`

	CreatedAt   time.Time      `json:"createdAt" bson:"createdAt"`
	UpdatedAt   time.Time      `json:"updatedAt" bson:"updatedAt"`
}

// StageConfig 阶段配置
type StageConfig struct {
	Name        string            `json:"name" bson:"name"`
	Type        StageType         `json:"type" bson:"type"`
	Commands    []string          `json:"commands" bson:"commands"`
	Timeout     int               `json:"timeout" bson:"timeout"` // 秒
	RetryCount  int               `json:"retryCount" bson:"retryCount"`
	AllowFailure bool             `json:"allowFailure" bson:"allowFailure"`
	Condition   string            `json:"condition,omitempty" bson:"condition,omitempty"` // 执行条件
	EnvVars     map[string]string `json:"envVars,omitempty" bson:"envVars,omitempty"`
}

// TriggerConfig 触发配置
type TriggerConfig struct {
	Type        TriggerType `json:"type" bson:"type"`
	Branches    []string    `json:"branches,omitempty" bson:"branches,omitempty"`
	Paths       []string    `json:"paths,omitempty" bson:"paths,omitempty"` // 文件路径过滤
	Schedule    string      `json:"schedule,omitempty" bson:"schedule,omitempty"` // cron 表达式
	WebhookURL  string      `json:"webhookUrl,omitempty" bson:"webhookUrl,omitempty"`
}

// PipelineRun 流水线执行记录
type PipelineRun struct {
	ID          string         `json:"id" bson:"_id"`
	PipelineID  string         `json:"pipelineId" bson:"pipelineId"`
	ProjectID   string         `json:"projectId" bson:"projectId"`
	RunNumber   int            `json:"runNumber" bson:"runNumber"`

	// 触发信息
	Trigger     TriggerType    `json:"trigger" bson:"trigger"`
	TriggeredBy string         `json:"triggeredBy" bson:"triggeredBy"`
	CommitHash  string         `json:"commitHash,omitempty" bson:"commitHash,omitempty"`
	CommitMsg   string         `json:"commitMsg,omitempty" bson:"commitMsg,omitempty"`
	Branch      string         `json:"branch" bson:"branch"`

	// 状态
	Status      PipelineStatus `json:"status" bson:"status"`
	Stages      []StageRun     `json:"stages" bson:"stages"`
	CurrentStage int           `json:"currentStage" bson:"currentStage"`

	// 产出
	Artifacts   []Artifact     `json:"artifacts" bson:"artifacts"`
	DeployURL   string         `json:"deployUrl,omitempty" bson:"deployUrl,omitempty"`

	// 时间
	StartedAt   time.Time      `json:"startedAt" bson:"startedAt"`
	CompletedAt *time.Time     `json:"completedAt,omitempty" bson:"completedAt,omitempty"`
	Duration    int            `json:"duration" bson:"duration"` // 秒

	// 日志
	Logs        []LogEntry     `json:"logs" bson:"logs"`
}

// StageRun 阶段执行记录
type StageRun struct {
	Name        string         `json:"name" bson:"name"`
	Type        StageType      `json:"type" bson:"type"`
	Status      PipelineStatus `json:"status" bson:"status"`
	StartedAt   *time.Time     `json:"startedAt,omitempty" bson:"startedAt,omitempty"`
	CompletedAt *time.Time     `json:"completedAt,omitempty" bson:"completedAt,omitempty"`
	Duration    int            `json:"duration" bson:"duration"`
	ExitCode    int            `json:"exitCode" bson:"exitCode"`
	Output      string         `json:"output" bson:"output"`
	Error       string         `json:"error,omitempty" bson:"error,omitempty"`
	RetryCount  int            `json:"retryCount" bson:"retryCount"`
}

// Artifact 构建产物
type Artifact struct {
	Name     string `json:"name" bson:"name"`
	Type     string `json:"type" bson:"type"` // file/docker/report
	Path     string `json:"path" bson:"path"`
	Size     int64  `json:"size" bson:"size"`
	Checksum string `json:"checksum" bson:"checksum"`
}

// LogEntry 日志条目
type LogEntry struct {
	Timestamp time.Time `json:"timestamp" bson:"timestamp"`
	Level     string    `json:"level" bson:"level"` // info/warn/error
	Stage     string    `json:"stage" bson:"stage"`
	Message   string    `json:"message" bson:"message"`
}

// GitHubWorkflow GitHub Actions 工作流
type GitHubWorkflow struct {
	Name string `yaml:"name"`
	On   struct {
		Push struct {
			Branches []string `yaml:"branches"`
		} `yaml:"push"`
		WorkflowDispatch struct{} `yaml:"workflow_dispatch"`
	} `yaml:"on"`
	Jobs map[string]GitHubJob `yaml:"jobs"`
}

// GitHubJob GitHub Actions 任务
type GitHubJob struct {
	RunsOn string       `yaml:"runs-on"`
	Steps  []GitHubStep `yaml:"steps"`
}

// GitHubStep GitHub Actions 步骤
type GitHubStep struct {
	Name string            `yaml:"name,omitempty"`
	Uses string            `yaml:"uses,omitempty"`
	Run  string            `yaml:"run,omitempty"`
	With map[string]string `yaml:"with,omitempty"`
	Env  map[string]string `yaml:"env,omitempty"`
}

// PipelineStats 流水线统计
type PipelineStats struct {
	TotalRuns       int            `json:"totalRuns"`
	SuccessRuns     int            `json:"successRuns"`
	FailedRuns      int            `json:"failedRuns"`
	SuccessRate     float64        `json:"successRate"`
	AvgDuration     int            `json:"avgDuration"` // 秒
	TodayRuns       int            `json:"todayRuns"`
	WeekRuns        int            `json:"weekRuns"`
	ByStatus        map[string]int `json:"byStatus"`
	ByStageFailure  map[string]int `json:"byStageFailure"` // 哪个阶段失败最多
}

// WebhookPayload Webhook 负载
type WebhookPayload struct {
	Event      string            `json:"event"`
	Repository string            `json:"repository"`
	Branch     string            `json:"branch"`
	Commit     string            `json:"commit"`
	Message    string            `json:"message"`
	Author     string            `json:"author"`
	Timestamp  time.Time         `json:"timestamp"`
	Extra      map[string]interface{} `json:"extra,omitempty"`
}

// 预定义的流水线模板
var PipelineTemplates = map[string][]StageConfig{
	"nextjs": {
		{Name: "安装依赖", Type: StageBuild, Commands: []string{"npm ci"}, Timeout: 300},
		{Name: "代码检查", Type: StageLint, Commands: []string{"npm run lint"}, Timeout: 120, AllowFailure: true},
		{Name: "类型检查", Type: StageLint, Commands: []string{"npm run type-check"}, Timeout: 120},
		{Name: "单元测试", Type: StageTest, Commands: []string{"npm test"}, Timeout: 300},
		{Name: "构建", Type: StageBuild, Commands: []string{"npm run build"}, Timeout: 600},
		{Name: "部署", Type: StageDeploy, Commands: []string{"vercel deploy --prod"}, Timeout: 600},
		{Name: "冒烟测试", Type: StageSmoke, Commands: []string{"curl -f $DEPLOY_URL/api/health"}, Timeout: 60},
		{Name: "通知", Type: StageNotify, Commands: []string{"echo 'Deployment completed'"}, Timeout: 30},
	},
	"python-fastapi": {
		{Name: "安装依赖", Type: StageBuild, Commands: []string{"pip install -r requirements.txt"}, Timeout: 300},
		{Name: "代码检查", Type: StageLint, Commands: []string{"flake8 ."}, Timeout: 120, AllowFailure: true},
		{Name: "类型检查", Type: StageLint, Commands: []string{"mypy ."}, Timeout: 120, AllowFailure: true},
		{Name: "单元测试", Type: StageTest, Commands: []string{"pytest"}, Timeout: 300},
		{Name: "构建镜像", Type: StageBuild, Commands: []string{"docker build -t $IMAGE_NAME ."}, Timeout: 600},
		{Name: "部署", Type: StageDeploy, Commands: []string{"docker push $IMAGE_NAME && kubectl rollout restart"}, Timeout: 600},
		{Name: "冒烟测试", Type: StageSmoke, Commands: []string{"curl -f $DEPLOY_URL/health"}, Timeout: 60},
	},
	"go-service": {
		{Name: "依赖下载", Type: StageBuild, Commands: []string{"go mod download"}, Timeout: 300},
		{Name: "代码检查", Type: StageLint, Commands: []string{"golangci-lint run"}, Timeout: 120, AllowFailure: true},
		{Name: "单元测试", Type: StageTest, Commands: []string{"go test ./..."}, Timeout: 300},
		{Name: "构建", Type: StageBuild, Commands: []string{"go build -o app ./cmd/main.go"}, Timeout: 300},
		{Name: "部署", Type: StageDeploy, Commands: []string{"docker build -t $IMAGE_NAME . && docker push $IMAGE_NAME"}, Timeout: 600},
		{Name: "冒烟测试", Type: StageSmoke, Commands: []string{"curl -f $DEPLOY_URL/health"}, Timeout: 60},
	},
}
