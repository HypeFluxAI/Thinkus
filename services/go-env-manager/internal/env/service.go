package env

import (
	"context"
	"fmt"
	"strings"
	"sync"
	"time"

	"github.com/google/uuid"
	"github.com/thinkus/go-env-manager/internal/models"
)

// Service 环境管理服务
type Service struct {
	environments map[string]*models.Environment
	mutex        sync.RWMutex
}

// NewService 创建新服务实例
func NewService() *Service {
	return &Service{
		environments: make(map[string]*models.Environment),
	}
}

// CreateEnvironmentInput 创建环境输入
type CreateEnvironmentInput struct {
	ProjectID   string
	Name        string
	Type        models.EnvironmentType
	Provider    models.ProviderType
	EnvVars     map[string]string
	Domain      string
	EnableMonitoring bool
}

// CreateEnvironment 创建新环境
func (s *Service) CreateEnvironment(ctx context.Context, input CreateEnvironmentInput) (*models.Environment, error) {
	s.mutex.Lock()
	defer s.mutex.Unlock()

	id := uuid.New().String()
	now := time.Now()

	env := &models.Environment{
		ID:          id,
		ProjectID:   input.ProjectID,
		Name:        input.Name,
		Type:        input.Type,
		Status:      models.StatusPending,
		Provider:    input.Provider,
		EnvVars:     input.EnvVars,
		Secrets:     extractSecrets(input.EnvVars),
		Resources:   []models.Resource{},
		Deployments: []models.DeploymentRecord{},
		CreatedAt:   now,
		UpdatedAt:   now,
	}

	// 配置域名
	if input.Domain != "" {
		env.Domain = &models.DomainConfig{
			Domain:      input.Domain,
			Subdomain:   generateSubdomain(input.ProjectID, input.Type),
			FullDomain:  fmt.Sprintf("%s.%s", generateSubdomain(input.ProjectID, input.Type), input.Domain),
			SSLEnabled:  true,
			SSLStatus:   "pending",
			DNSConfigured: false,
		}
	}

	// 配置监控
	if input.EnableMonitoring {
		env.Monitoring = &models.MonitoringConfig{
			Enabled:       true,
			Endpoints:     []string{"/api/health", "/"},
			AlertChannels: []string{"email"},
			CheckInterval: 60,
		}
	}

	s.environments[id] = env

	// 异步开始配置环境
	go s.provisionEnvironment(context.Background(), id)

	return env, nil
}

// GetEnvironment 获取环境详情
func (s *Service) GetEnvironment(ctx context.Context, id string) (*models.Environment, error) {
	s.mutex.RLock()
	defer s.mutex.RUnlock()

	env, ok := s.environments[id]
	if !ok {
		return nil, fmt.Errorf("environment not found: %s", id)
	}

	return env, nil
}

// GetProjectEnvironments 获取项目的所有环境
func (s *Service) GetProjectEnvironments(ctx context.Context, projectID string) ([]*models.Environment, error) {
	s.mutex.RLock()
	defer s.mutex.RUnlock()

	var envs []*models.Environment
	for _, env := range s.environments {
		if env.ProjectID == projectID {
			envs = append(envs, env)
		}
	}

	return envs, nil
}

// UpdateEnvironment 更新环境配置
func (s *Service) UpdateEnvironment(ctx context.Context, id string, envVars map[string]string) (*models.Environment, error) {
	s.mutex.Lock()
	defer s.mutex.Unlock()

	env, ok := s.environments[id]
	if !ok {
		return nil, fmt.Errorf("environment not found: %s", id)
	}

	// 合并环境变量
	for k, v := range envVars {
		env.EnvVars[k] = v
	}
	env.Secrets = extractSecrets(env.EnvVars)
	env.UpdatedAt = time.Now()

	return env, nil
}

// DeployEnvironment 部署环境
func (s *Service) DeployEnvironment(ctx context.Context, id string, version string, commitHash string) (*models.DeploymentRecord, error) {
	s.mutex.Lock()
	defer s.mutex.Unlock()

	env, ok := s.environments[id]
	if !ok {
		return nil, fmt.Errorf("environment not found: %s", id)
	}

	deployID := uuid.New().String()
	now := time.Now()

	deployment := models.DeploymentRecord{
		ID:         deployID,
		Version:    version,
		CommitHash: commitHash,
		Status:     "pending",
		StartedAt:  now,
		Logs:       []string{},
	}

	env.Deployments = append([]models.DeploymentRecord{deployment}, env.Deployments...)
	env.Status = models.StatusUpdating
	env.UpdatedAt = now

	// 异步执行部署
	go s.executeDeployment(context.Background(), id, deployID)

	return &deployment, nil
}

// PromoteEnvironment 提升环境 (dev -> staging -> production)
func (s *Service) PromoteEnvironment(ctx context.Context, config models.PromoteConfig) (*models.Environment, error) {
	s.mutex.Lock()
	defer s.mutex.Unlock()

	sourceEnv, ok := s.environments[config.SourceEnv]
	if !ok {
		return nil, fmt.Errorf("source environment not found: %s", config.SourceEnv)
	}

	targetEnv, ok := s.environments[config.TargetEnv]
	if !ok {
		return nil, fmt.Errorf("target environment not found: %s", config.TargetEnv)
	}

	// 备份目标环境
	if config.BackupFirst {
		// TODO: 实现备份逻辑
	}

	// 复制环境变量
	if config.CopyEnvVars {
		for k, v := range sourceEnv.EnvVars {
			// 跳过敏感变量
			if !isSensitiveKey(k) {
				targetEnv.EnvVars[k] = v
			}
		}
	}

	// 应用覆盖
	for k, v := range config.EnvVarOverrides {
		targetEnv.EnvVars[k] = v
	}

	// 更新版本
	if len(sourceEnv.Deployments) > 0 {
		latestDeploy := sourceEnv.Deployments[0]
		targetEnv.Deployments = append([]models.DeploymentRecord{
			{
				ID:         uuid.New().String(),
				Version:    latestDeploy.Version,
				CommitHash: latestDeploy.CommitHash,
				Status:     "pending",
				StartedAt:  time.Now(),
				Logs:       []string{"Promoted from " + config.SourceEnv},
			},
		}, targetEnv.Deployments...)
	}

	targetEnv.UpdatedAt = time.Now()

	// 异步执行部署
	if len(targetEnv.Deployments) > 0 {
		go s.executeDeployment(context.Background(), targetEnv.ID, targetEnv.Deployments[0].ID)
	}

	return targetEnv, nil
}

// CompareEnvironments 对比两个环境
func (s *Service) CompareEnvironments(ctx context.Context, sourceID, targetID string) (*models.EnvironmentComparison, error) {
	s.mutex.RLock()
	defer s.mutex.RUnlock()

	source, ok := s.environments[sourceID]
	if !ok {
		return nil, fmt.Errorf("source environment not found: %s", sourceID)
	}

	target, ok := s.environments[targetID]
	if !ok {
		return nil, fmt.Errorf("target environment not found: %s", targetID)
	}

	comparison := &models.EnvironmentComparison{
		SourceEnv:     sourceID,
		TargetEnv:     targetID,
		EnvVarsDiff:   make(map[string]models.EnvVarDiff),
		ResourcesDiff: []models.ResourceDiff{},
	}

	// 比较环境变量
	allKeys := make(map[string]bool)
	for k := range source.EnvVars {
		allKeys[k] = true
	}
	for k := range target.EnvVars {
		allKeys[k] = true
	}

	for k := range allKeys {
		sourceVal, hasSource := source.EnvVars[k]
		targetVal, hasTarget := target.EnvVars[k]

		diff := models.EnvVarDiff{Key: k}

		if isSensitiveKey(k) {
			// 敏感变量只显示存在与否
			if hasSource {
				diff.SourceValue = "[REDACTED]"
			}
			if hasTarget {
				diff.TargetValue = "[REDACTED]"
			}
		} else {
			diff.SourceValue = sourceVal
			diff.TargetValue = targetVal
		}

		if !hasSource {
			diff.DiffType = "added"
		} else if !hasTarget {
			diff.DiffType = "removed"
		} else if sourceVal != targetVal {
			diff.DiffType = "changed"
		} else {
			diff.DiffType = "same"
		}

		comparison.EnvVarsDiff[k] = diff
	}

	// 比较版本
	if len(source.Deployments) > 0 && len(target.Deployments) > 0 {
		comparison.VersionDiff = &models.VersionDiff{
			SourceVersion: source.Deployments[0].Version,
			TargetVersion: target.Deployments[0].Version,
		}
	}

	return comparison, nil
}

// SyncEnvVars 同步环境变量
func (s *Service) SyncEnvVars(ctx context.Context, sourceID, targetID string, keys []string) (*models.SyncResult, error) {
	s.mutex.Lock()
	defer s.mutex.Unlock()

	source, ok := s.environments[sourceID]
	if !ok {
		return nil, fmt.Errorf("source environment not found: %s", sourceID)
	}

	target, ok := s.environments[targetID]
	if !ok {
		return nil, fmt.Errorf("target environment not found: %s", targetID)
	}

	result := &models.SyncResult{
		Success:     true,
		SyncedVars:  []string{},
		SkippedVars: []string{},
		Errors:      []string{},
		Warnings:    []string{},
	}

	for _, key := range keys {
		if isSensitiveKey(key) {
			result.SkippedVars = append(result.SkippedVars, key)
			result.Warnings = append(result.Warnings, fmt.Sprintf("Skipped sensitive key: %s", key))
			continue
		}

		if val, ok := source.EnvVars[key]; ok {
			target.EnvVars[key] = val
			result.SyncedVars = append(result.SyncedVars, key)
		} else {
			result.Errors = append(result.Errors, fmt.Sprintf("Key not found in source: %s", key))
			result.Success = false
		}
	}

	target.UpdatedAt = time.Now()

	return result, nil
}

// RollbackDeployment 回滚部署
func (s *Service) RollbackDeployment(ctx context.Context, envID string, deploymentID string) (*models.DeploymentRecord, error) {
	s.mutex.Lock()
	defer s.mutex.Unlock()

	env, ok := s.environments[envID]
	if !ok {
		return nil, fmt.Errorf("environment not found: %s", envID)
	}

	// 找到要回滚到的部署
	var targetDeploy *models.DeploymentRecord
	for i, d := range env.Deployments {
		if d.ID == deploymentID {
			targetDeploy = &env.Deployments[i]
			break
		}
	}

	if targetDeploy == nil {
		return nil, fmt.Errorf("deployment not found: %s", deploymentID)
	}

	// 创建回滚部署记录
	rollbackDeploy := models.DeploymentRecord{
		ID:         uuid.New().String(),
		Version:    targetDeploy.Version + "-rollback",
		CommitHash: targetDeploy.CommitHash,
		Status:     "pending",
		StartedAt:  time.Now(),
		Logs:       []string{"Rolling back to " + deploymentID},
	}

	env.Deployments = append([]models.DeploymentRecord{rollbackDeploy}, env.Deployments...)
	env.Status = models.StatusUpdating
	env.UpdatedAt = time.Now()

	// 异步执行回滚
	go s.executeDeployment(context.Background(), envID, rollbackDeploy.ID)

	return &rollbackDeploy, nil
}

// DestroyEnvironment 销毁环境
func (s *Service) DestroyEnvironment(ctx context.Context, id string) error {
	s.mutex.Lock()
	defer s.mutex.Unlock()

	env, ok := s.environments[id]
	if !ok {
		return fmt.Errorf("environment not found: %s", id)
	}

	// 不允许销毁生产环境
	if env.Type == models.EnvProduction {
		return fmt.Errorf("cannot destroy production environment, please contact admin")
	}

	env.Status = models.StatusDestroyed
	env.UpdatedAt = time.Now()

	// 异步清理资源
	go s.cleanupResources(context.Background(), id)

	return nil
}

// GetStats 获取统计信息
func (s *Service) GetStats(ctx context.Context) *models.EnvironmentStats {
	s.mutex.RLock()
	defer s.mutex.RUnlock()

	stats := &models.EnvironmentStats{
		TotalEnvironments: len(s.environments),
		ByType:            make(map[string]int),
		ByStatus:          make(map[string]int),
	}

	recentDeployCount := 0
	totalDeployTime := 0
	deployCount := 0

	cutoff := time.Now().Add(-24 * time.Hour)

	for _, env := range s.environments {
		stats.ByType[string(env.Type)]++
		stats.ByStatus[string(env.Status)]++

		for _, d := range env.Deployments {
			if d.StartedAt.After(cutoff) {
				recentDeployCount++
			}
			if d.Duration > 0 {
				totalDeployTime += d.Duration
				deployCount++
			}
		}
	}

	stats.RecentDeployments = recentDeployCount
	if deployCount > 0 {
		stats.AverageDeployTime = float64(totalDeployTime) / float64(deployCount)
	}

	return stats
}

// ========== 内部方法 ==========

func (s *Service) provisionEnvironment(ctx context.Context, id string) {
	s.mutex.Lock()
	env := s.environments[id]
	env.Status = models.StatusProvisioning
	s.mutex.Unlock()

	// 模拟配置过程
	time.Sleep(2 * time.Second)

	s.mutex.Lock()
	defer s.mutex.Unlock()

	env.Status = models.StatusReady
	env.URL = fmt.Sprintf("https://%s.thinkus.app", generateSubdomain(env.ProjectID, env.Type))
	env.AdminURL = env.URL + "/admin"
	env.UpdatedAt = time.Now()

	// 添加默认资源
	env.Resources = []models.Resource{
		{Type: models.ResourceCompute, Name: "app-server", Provider: string(env.Provider), Status: "running"},
		{Type: models.ResourceDatabase, Name: "mongodb", Provider: "mongodb-atlas", Status: "connected"},
	}
}

func (s *Service) executeDeployment(ctx context.Context, envID, deployID string) {
	s.mutex.Lock()
	env := s.environments[envID]
	var deploy *models.DeploymentRecord
	for i := range env.Deployments {
		if env.Deployments[i].ID == deployID {
			deploy = &env.Deployments[i]
			break
		}
	}
	if deploy == nil {
		s.mutex.Unlock()
		return
	}

	deploy.Status = "building"
	deploy.Logs = append(deploy.Logs, "Starting build...")
	s.mutex.Unlock()

	// 模拟构建过程
	time.Sleep(3 * time.Second)

	s.mutex.Lock()
	deploy.Status = "deploying"
	deploy.Logs = append(deploy.Logs, "Build completed, deploying...")
	s.mutex.Unlock()

	// 模拟部署过程
	time.Sleep(2 * time.Second)

	s.mutex.Lock()
	defer s.mutex.Unlock()

	now := time.Now()
	deploy.Status = "success"
	deploy.CompletedAt = &now
	deploy.Duration = int(now.Sub(deploy.StartedAt).Seconds())
	deploy.Logs = append(deploy.Logs, "Deployment completed successfully")

	env.Status = models.StatusReady
	env.LastDeployedAt = &now
	env.UpdatedAt = now
}

func (s *Service) cleanupResources(ctx context.Context, id string) {
	// 模拟资源清理
	time.Sleep(1 * time.Second)

	s.mutex.Lock()
	defer s.mutex.Unlock()

	if env, ok := s.environments[id]; ok {
		env.Resources = []models.Resource{}
		env.URL = ""
		env.AdminURL = ""
	}
}

// ========== 辅助函数 ==========

func generateSubdomain(projectID string, envType models.EnvironmentType) string {
	prefix := strings.ToLower(projectID[:8])
	switch envType {
	case models.EnvDevelopment:
		return prefix + "-dev"
	case models.EnvStaging:
		return prefix + "-staging"
	case models.EnvPreview:
		return prefix + "-preview"
	default:
		return prefix
	}
}

func extractSecrets(envVars map[string]string) []string {
	var secrets []string
	for k := range envVars {
		if isSensitiveKey(k) {
			secrets = append(secrets, k)
		}
	}
	return secrets
}

func isSensitiveKey(key string) bool {
	sensitivePatterns := []string{
		"SECRET", "KEY", "TOKEN", "PASSWORD", "CREDENTIAL",
		"PRIVATE", "AUTH", "API_KEY", "APIKEY",
	}
	upper := strings.ToUpper(key)
	for _, pattern := range sensitivePatterns {
		if strings.Contains(upper, pattern) {
			return true
		}
	}
	return false
}
