package models

import "time"

// EnvironmentType 环境类型
type EnvironmentType string

const (
	EnvDevelopment EnvironmentType = "development"
	EnvStaging     EnvironmentType = "staging"
	EnvProduction  EnvironmentType = "production"
	EnvPreview     EnvironmentType = "preview"
)

// EnvironmentStatus 环境状态
type EnvironmentStatus string

const (
	StatusPending     EnvironmentStatus = "pending"
	StatusProvisioning EnvironmentStatus = "provisioning"
	StatusReady       EnvironmentStatus = "ready"
	StatusUpdating    EnvironmentStatus = "updating"
	StatusError       EnvironmentStatus = "error"
	StatusDestroyed   EnvironmentStatus = "destroyed"
)

// ResourceType 资源类型
type ResourceType string

const (
	ResourceDatabase    ResourceType = "database"
	ResourceCache       ResourceType = "cache"
	ResourceStorage     ResourceType = "storage"
	ResourceCompute     ResourceType = "compute"
	ResourceCDN         ResourceType = "cdn"
	ResourceDomain      ResourceType = "domain"
	ResourceSSL         ResourceType = "ssl"
	ResourceMonitoring  ResourceType = "monitoring"
)

// ProviderType 云服务提供商
type ProviderType string

const (
	ProviderVercel     ProviderType = "vercel"
	ProviderRailway    ProviderType = "railway"
	ProviderFlyio      ProviderType = "fly.io"
	ProviderRender     ProviderType = "render"
	ProviderAWS        ProviderType = "aws"
	ProviderGCP        ProviderType = "gcp"
	ProviderDocker     ProviderType = "docker"
)

// Environment 环境配置
type Environment struct {
	ID          string            `json:"id" bson:"_id"`
	ProjectID   string            `json:"projectId" bson:"projectId"`
	Name        string            `json:"name" bson:"name"`
	Type        EnvironmentType   `json:"type" bson:"type"`
	Status      EnvironmentStatus `json:"status" bson:"status"`
	Provider    ProviderType      `json:"provider" bson:"provider"`

	// URLs
	URL         string `json:"url" bson:"url"`
	AdminURL    string `json:"adminUrl" bson:"adminUrl"`

	// 资源配置
	Resources   []Resource        `json:"resources" bson:"resources"`

	// 环境变量
	EnvVars     map[string]string `json:"envVars" bson:"envVars"`
	Secrets     []string          `json:"secrets" bson:"secrets"` // 敏感变量名列表

	// 域名配置
	Domain      *DomainConfig     `json:"domain,omitempty" bson:"domain,omitempty"`

	// 监控配置
	Monitoring  *MonitoringConfig `json:"monitoring,omitempty" bson:"monitoring,omitempty"`

	// 部署历史
	Deployments []DeploymentRecord `json:"deployments" bson:"deployments"`

	// 时间戳
	CreatedAt   time.Time `json:"createdAt" bson:"createdAt"`
	UpdatedAt   time.Time `json:"updatedAt" bson:"updatedAt"`
	LastDeployedAt *time.Time `json:"lastDeployedAt,omitempty" bson:"lastDeployedAt,omitempty"`
}

// Resource 资源配置
type Resource struct {
	Type       ResourceType `json:"type" bson:"type"`
	Name       string       `json:"name" bson:"name"`
	Provider   string       `json:"provider" bson:"provider"`
	Status     string       `json:"status" bson:"status"`
	Endpoint   string       `json:"endpoint" bson:"endpoint"`
	Config     map[string]interface{} `json:"config" bson:"config"`
}

// DomainConfig 域名配置
type DomainConfig struct {
	Domain      string `json:"domain" bson:"domain"`
	Subdomain   string `json:"subdomain" bson:"subdomain"`
	FullDomain  string `json:"fullDomain" bson:"fullDomain"`
	SSLEnabled  bool   `json:"sslEnabled" bson:"sslEnabled"`
	SSLStatus   string `json:"sslStatus" bson:"sslStatus"` // pending/active/expired
	DNSConfigured bool `json:"dnsConfigured" bson:"dnsConfigured"`
}

// MonitoringConfig 监控配置
type MonitoringConfig struct {
	Enabled       bool     `json:"enabled" bson:"enabled"`
	Endpoints     []string `json:"endpoints" bson:"endpoints"`
	AlertChannels []string `json:"alertChannels" bson:"alertChannels"`
	CheckInterval int      `json:"checkInterval" bson:"checkInterval"` // 秒
}

// DeploymentRecord 部署记录
type DeploymentRecord struct {
	ID          string    `json:"id" bson:"id"`
	Version     string    `json:"version" bson:"version"`
	CommitHash  string    `json:"commitHash" bson:"commitHash"`
	Status      string    `json:"status" bson:"status"` // pending/building/deploying/success/failed/rolled_back
	StartedAt   time.Time `json:"startedAt" bson:"startedAt"`
	CompletedAt *time.Time `json:"completedAt,omitempty" bson:"completedAt,omitempty"`
	Duration    int       `json:"duration" bson:"duration"` // 秒
	Logs        []string  `json:"logs" bson:"logs"`
	Error       string    `json:"error,omitempty" bson:"error,omitempty"`
}

// PromoteConfig 环境提升配置
type PromoteConfig struct {
	SourceEnv      string            `json:"sourceEnv"`
	TargetEnv      string            `json:"targetEnv"`
	CopyEnvVars    bool              `json:"copyEnvVars"`
	EnvVarOverrides map[string]string `json:"envVarOverrides"`
	RunMigrations  bool              `json:"runMigrations"`
	BackupFirst    bool              `json:"backupFirst"`
}

// EnvironmentComparison 环境对比
type EnvironmentComparison struct {
	SourceEnv       string            `json:"sourceEnv"`
	TargetEnv       string            `json:"targetEnv"`
	EnvVarsDiff     map[string]EnvVarDiff `json:"envVarsDiff"`
	ResourcesDiff   []ResourceDiff    `json:"resourcesDiff"`
	VersionDiff     *VersionDiff      `json:"versionDiff,omitempty"`
}

// EnvVarDiff 环境变量差异
type EnvVarDiff struct {
	Key         string `json:"key"`
	SourceValue string `json:"sourceValue,omitempty"`
	TargetValue string `json:"targetValue,omitempty"`
	DiffType    string `json:"diffType"` // added/removed/changed/same
}

// ResourceDiff 资源差异
type ResourceDiff struct {
	Type        ResourceType `json:"type"`
	Name        string       `json:"name"`
	DiffType    string       `json:"diffType"` // added/removed/changed/same
	SourceConfig interface{} `json:"sourceConfig,omitempty"`
	TargetConfig interface{} `json:"targetConfig,omitempty"`
}

// VersionDiff 版本差异
type VersionDiff struct {
	SourceVersion string `json:"sourceVersion"`
	TargetVersion string `json:"targetVersion"`
	CommitsBehind int    `json:"commitsBehind"`
}

// EnvironmentStats 环境统计
type EnvironmentStats struct {
	TotalEnvironments int            `json:"totalEnvironments"`
	ByType            map[string]int `json:"byType"`
	ByStatus          map[string]int `json:"byStatus"`
	RecentDeployments int            `json:"recentDeployments"` // 最近24小时
	AverageDeployTime float64        `json:"averageDeployTime"` // 秒
}

// SyncResult 同步结果
type SyncResult struct {
	Success       bool              `json:"success"`
	SyncedVars    []string          `json:"syncedVars"`
	SkippedVars   []string          `json:"skippedVars"`
	Errors        []string          `json:"errors"`
	Warnings      []string          `json:"warnings"`
}
