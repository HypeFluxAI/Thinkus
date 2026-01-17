package pipeline

import (
	"context"
	"fmt"
	"os/exec"
	"strings"
	"sync"
	"time"

	"github.com/google/uuid"
	"github.com/thinkus/go-cicd-pipeline/internal/models"
)

// Service CI/CD 流水线服务
type Service struct {
	pipelines  map[string]*models.Pipeline
	runs       map[string]*models.PipelineRun
	runCounter map[string]int // 每个流水线的执行计数
	mutex      sync.RWMutex

	// 回调
	onStageComplete func(runID string, stage *models.StageRun)
	onRunComplete   func(run *models.PipelineRun)
}

// NewService 创建新服务实例
func NewService() *Service {
	return &Service{
		pipelines:  make(map[string]*models.Pipeline),
		runs:       make(map[string]*models.PipelineRun),
		runCounter: make(map[string]int),
	}
}

// SetCallbacks 设置回调函数
func (s *Service) SetCallbacks(onStage func(string, *models.StageRun), onRun func(*models.PipelineRun)) {
	s.onStageComplete = onStage
	s.onRunComplete = onRun
}

// CreatePipeline 创建流水线
func (s *Service) CreatePipeline(ctx context.Context, input CreatePipelineInput) (*models.Pipeline, error) {
	s.mutex.Lock()
	defer s.mutex.Unlock()

	id := uuid.New().String()
	now := time.Now()

	// 使用模板或自定义配置
	var stages []models.StageConfig
	if input.Template != "" {
		if tmpl, ok := models.PipelineTemplates[input.Template]; ok {
			stages = tmpl
		}
	}
	if len(input.Stages) > 0 {
		stages = input.Stages
	}

	pipeline := &models.Pipeline{
		ID:          id,
		ProjectID:   input.ProjectID,
		Name:        input.Name,
		Description: input.Description,
		RepoURL:     input.RepoURL,
		Branch:      input.Branch,
		Stages:      stages,
		Triggers:    input.Triggers,
		EnvVars:     input.EnvVars,
		Secrets:     extractSecretNames(input.EnvVars),
		Enabled:     true,
		CreatedAt:   now,
		UpdatedAt:   now,
	}

	s.pipelines[id] = pipeline
	s.runCounter[id] = 0

	return pipeline, nil
}

// CreatePipelineInput 创建流水线输入
type CreatePipelineInput struct {
	ProjectID   string
	Name        string
	Description string
	RepoURL     string
	Branch      string
	Template    string // nextjs/python-fastapi/go-service
	Stages      []models.StageConfig
	Triggers    []models.TriggerConfig
	EnvVars     map[string]string
}

// TriggerPipeline 触发流水线执行
func (s *Service) TriggerPipeline(ctx context.Context, pipelineID string, trigger models.TriggerType, triggeredBy string, commitHash string, commitMsg string) (*models.PipelineRun, error) {
	s.mutex.Lock()

	pipeline, ok := s.pipelines[pipelineID]
	if !ok {
		s.mutex.Unlock()
		return nil, fmt.Errorf("pipeline not found: %s", pipelineID)
	}

	if !pipeline.Enabled {
		s.mutex.Unlock()
		return nil, fmt.Errorf("pipeline is disabled")
	}

	// 增加执行计数
	s.runCounter[pipelineID]++
	runNumber := s.runCounter[pipelineID]

	runID := uuid.New().String()
	now := time.Now()

	// 初始化阶段
	stages := make([]models.StageRun, len(pipeline.Stages))
	for i, stageConfig := range pipeline.Stages {
		stages[i] = models.StageRun{
			Name:   stageConfig.Name,
			Type:   stageConfig.Type,
			Status: models.StatusQueued,
		}
	}

	run := &models.PipelineRun{
		ID:          runID,
		PipelineID:  pipelineID,
		ProjectID:   pipeline.ProjectID,
		RunNumber:   runNumber,
		Trigger:     trigger,
		TriggeredBy: triggeredBy,
		CommitHash:  commitHash,
		CommitMsg:   commitMsg,
		Branch:      pipeline.Branch,
		Status:      models.StatusQueued,
		Stages:      stages,
		CurrentStage: 0,
		Artifacts:   []models.Artifact{},
		StartedAt:   now,
		Logs:        []models.LogEntry{},
	}

	s.runs[runID] = run

	// 更新流水线
	pipeline.LastRunID = runID
	pipeline.LastRunAt = &now
	pipeline.UpdatedAt = now

	s.mutex.Unlock()

	// 异步执行流水线
	go s.executePipeline(context.Background(), pipeline, run)

	return run, nil
}

// executePipeline 执行流水线
func (s *Service) executePipeline(ctx context.Context, pipeline *models.Pipeline, run *models.PipelineRun) {
	s.mutex.Lock()
	run.Status = models.StatusRunning
	s.addLog(run, "info", "pipeline", "流水线开始执行")
	s.mutex.Unlock()

	success := true

	for i, stageConfig := range pipeline.Stages {
		s.mutex.Lock()
		run.CurrentStage = i
		run.Stages[i].Status = models.StatusRunning
		stageStart := time.Now()
		run.Stages[i].StartedAt = &stageStart
		s.addLog(run, "info", stageConfig.Name, fmt.Sprintf("阶段 [%s] 开始执行", stageConfig.Name))
		s.mutex.Unlock()

		// 执行阶段
		output, err := s.executeStage(ctx, pipeline, &stageConfig, run)

		s.mutex.Lock()
		stageEnd := time.Now()
		run.Stages[i].CompletedAt = &stageEnd
		run.Stages[i].Duration = int(stageEnd.Sub(stageStart).Seconds())
		run.Stages[i].Output = output

		if err != nil {
			run.Stages[i].Status = models.StatusFailed
			run.Stages[i].Error = err.Error()
			run.Stages[i].ExitCode = 1
			s.addLog(run, "error", stageConfig.Name, fmt.Sprintf("阶段 [%s] 失败: %s", stageConfig.Name, err.Error()))

			if !stageConfig.AllowFailure {
				success = false
				s.mutex.Unlock()

				// 回调
				if s.onStageComplete != nil {
					s.onStageComplete(run.ID, &run.Stages[i])
				}
				break
			}
		} else {
			run.Stages[i].Status = models.StatusSuccess
			run.Stages[i].ExitCode = 0
			s.addLog(run, "info", stageConfig.Name, fmt.Sprintf("阶段 [%s] 成功完成", stageConfig.Name))
		}
		s.mutex.Unlock()

		// 回调
		if s.onStageComplete != nil {
			s.onStageComplete(run.ID, &run.Stages[i])
		}
	}

	// 标记剩余阶段为跳过
	s.mutex.Lock()
	for i := run.CurrentStage + 1; i < len(run.Stages); i++ {
		if run.Stages[i].Status == models.StatusQueued {
			run.Stages[i].Status = models.StatusSkipped
		}
	}

	// 完成
	now := time.Now()
	run.CompletedAt = &now
	run.Duration = int(now.Sub(run.StartedAt).Seconds())

	if success {
		run.Status = models.StatusSuccess
		s.addLog(run, "info", "pipeline", fmt.Sprintf("流水线执行成功，耗时 %d 秒", run.Duration))
	} else {
		run.Status = models.StatusFailed
		s.addLog(run, "error", "pipeline", fmt.Sprintf("流水线执行失败，耗时 %d 秒", run.Duration))
	}
	s.mutex.Unlock()

	// 回调
	if s.onRunComplete != nil {
		s.onRunComplete(run)
	}
}

// executeStage 执行单个阶段
func (s *Service) executeStage(ctx context.Context, pipeline *models.Pipeline, stage *models.StageConfig, run *models.PipelineRun) (string, error) {
	var outputs []string

	for _, cmd := range stage.Commands {
		// 替换环境变量
		expandedCmd := s.expandEnvVars(cmd, pipeline.EnvVars, run)

		// 执行命令（模拟）
		output, err := s.executeCommand(ctx, expandedCmd, stage.Timeout)
		outputs = append(outputs, output)

		if err != nil {
			// 重试逻辑
			for retry := 0; retry < stage.RetryCount; retry++ {
				s.mutex.Lock()
				s.addLog(run, "warn", stage.Name, fmt.Sprintf("命令失败，第 %d 次重试", retry+1))
				s.mutex.Unlock()

				time.Sleep(time.Second * 5) // 重试间隔
				output, err = s.executeCommand(ctx, expandedCmd, stage.Timeout)
				if err == nil {
					break
				}
			}

			if err != nil {
				return strings.Join(outputs, "\n"), err
			}
		}
	}

	return strings.Join(outputs, "\n"), nil
}

// executeCommand 执行命令
func (s *Service) executeCommand(ctx context.Context, cmd string, timeout int) (string, error) {
	// 创建带超时的上下文
	cmdCtx, cancel := context.WithTimeout(ctx, time.Duration(timeout)*time.Second)
	defer cancel()

	// 模拟命令执行
	// 在生产环境中，这里会真正执行命令
	command := exec.CommandContext(cmdCtx, "sh", "-c", cmd)

	output, err := command.CombinedOutput()
	if err != nil {
		// 检查是否超时
		if cmdCtx.Err() == context.DeadlineExceeded {
			return string(output), fmt.Errorf("命令执行超时 (%d秒)", timeout)
		}
		return string(output), fmt.Errorf("命令执行失败: %v", err)
	}

	return string(output), nil
}

// expandEnvVars 展开环境变量
func (s *Service) expandEnvVars(cmd string, envVars map[string]string, run *models.PipelineRun) string {
	result := cmd

	// 替换自定义环境变量
	for k, v := range envVars {
		result = strings.ReplaceAll(result, "$"+k, v)
		result = strings.ReplaceAll(result, "${"+k+"}", v)
	}

	// 替换内置变量
	result = strings.ReplaceAll(result, "$COMMIT_HASH", run.CommitHash)
	result = strings.ReplaceAll(result, "$BRANCH", run.Branch)
	result = strings.ReplaceAll(result, "$RUN_NUMBER", fmt.Sprintf("%d", run.RunNumber))
	result = strings.ReplaceAll(result, "$DEPLOY_URL", run.DeployURL)

	return result
}

// addLog 添加日志
func (s *Service) addLog(run *models.PipelineRun, level, stage, message string) {
	run.Logs = append(run.Logs, models.LogEntry{
		Timestamp: time.Now(),
		Level:     level,
		Stage:     stage,
		Message:   message,
	})
}

// GetPipeline 获取流水线
func (s *Service) GetPipeline(ctx context.Context, id string) (*models.Pipeline, error) {
	s.mutex.RLock()
	defer s.mutex.RUnlock()

	pipeline, ok := s.pipelines[id]
	if !ok {
		return nil, fmt.Errorf("pipeline not found: %s", id)
	}

	return pipeline, nil
}

// GetRun 获取执行记录
func (s *Service) GetRun(ctx context.Context, runID string) (*models.PipelineRun, error) {
	s.mutex.RLock()
	defer s.mutex.RUnlock()

	run, ok := s.runs[runID]
	if !ok {
		return nil, fmt.Errorf("run not found: %s", runID)
	}

	return run, nil
}

// GetProjectPipelines 获取项目的所有流水线
func (s *Service) GetProjectPipelines(ctx context.Context, projectID string) ([]*models.Pipeline, error) {
	s.mutex.RLock()
	defer s.mutex.RUnlock()

	var result []*models.Pipeline
	for _, p := range s.pipelines {
		if p.ProjectID == projectID {
			result = append(result, p)
		}
	}

	return result, nil
}

// GetPipelineRuns 获取流水线的执行历史
func (s *Service) GetPipelineRuns(ctx context.Context, pipelineID string, limit int) ([]*models.PipelineRun, error) {
	s.mutex.RLock()
	defer s.mutex.RUnlock()

	var result []*models.PipelineRun
	for _, r := range s.runs {
		if r.PipelineID == pipelineID {
			result = append(result, r)
		}
	}

	// 按时间倒序排序并限制数量
	// 简化处理：直接返回
	if len(result) > limit {
		result = result[:limit]
	}

	return result, nil
}

// CancelRun 取消执行
func (s *Service) CancelRun(ctx context.Context, runID string) error {
	s.mutex.Lock()
	defer s.mutex.Unlock()

	run, ok := s.runs[runID]
	if !ok {
		return fmt.Errorf("run not found: %s", runID)
	}

	if run.Status != models.StatusRunning && run.Status != models.StatusQueued {
		return fmt.Errorf("cannot cancel run in status: %s", run.Status)
	}

	now := time.Now()
	run.Status = models.StatusCancelled
	run.CompletedAt = &now
	run.Duration = int(now.Sub(run.StartedAt).Seconds())

	s.addLog(run, "warn", "pipeline", "流水线被手动取消")

	return nil
}

// GetStats 获取统计信息
func (s *Service) GetStats(ctx context.Context, pipelineID string) *models.PipelineStats {
	s.mutex.RLock()
	defer s.mutex.RUnlock()

	stats := &models.PipelineStats{
		ByStatus:       make(map[string]int),
		ByStageFailure: make(map[string]int),
	}

	now := time.Now()
	todayStart := time.Date(now.Year(), now.Month(), now.Day(), 0, 0, 0, 0, now.Location())
	weekStart := todayStart.AddDate(0, 0, -7)

	var totalDuration int

	for _, run := range s.runs {
		if pipelineID != "" && run.PipelineID != pipelineID {
			continue
		}

		stats.TotalRuns++
		stats.ByStatus[string(run.Status)]++
		totalDuration += run.Duration

		if run.Status == models.StatusSuccess {
			stats.SuccessRuns++
		} else if run.Status == models.StatusFailed {
			stats.FailedRuns++

			// 统计失败阶段
			for _, stage := range run.Stages {
				if stage.Status == models.StatusFailed {
					stats.ByStageFailure[stage.Name]++
				}
			}
		}

		if run.StartedAt.After(todayStart) {
			stats.TodayRuns++
		}
		if run.StartedAt.After(weekStart) {
			stats.WeekRuns++
		}
	}

	if stats.TotalRuns > 0 {
		stats.SuccessRate = float64(stats.SuccessRuns) / float64(stats.TotalRuns) * 100
		stats.AvgDuration = totalDuration / stats.TotalRuns
	}

	return stats
}

// GenerateGitHubWorkflow 生成 GitHub Actions 配置
func (s *Service) GenerateGitHubWorkflow(ctx context.Context, pipelineID string) (string, error) {
	s.mutex.RLock()
	pipeline, ok := s.pipelines[pipelineID]
	s.mutex.RUnlock()

	if !ok {
		return "", fmt.Errorf("pipeline not found: %s", pipelineID)
	}

	// 生成 YAML
	yaml := fmt.Sprintf(`name: %s

on:
  push:
    branches:
      - %s
  workflow_dispatch:

jobs:
  build-and-deploy:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4

`, pipeline.Name, pipeline.Branch)

	for _, stage := range pipeline.Stages {
		yaml += fmt.Sprintf(`      - name: %s
        run: |
`, stage.Name)
		for _, cmd := range stage.Commands {
			yaml += fmt.Sprintf("          %s\n", cmd)
		}
		if stage.AllowFailure {
			yaml += "        continue-on-error: true\n"
		}
		yaml += "\n"
	}

	return yaml, nil
}

// HandleWebhook 处理 Webhook
func (s *Service) HandleWebhook(ctx context.Context, payload models.WebhookPayload) (*models.PipelineRun, error) {
	s.mutex.RLock()

	// 查找匹配的流水线
	var matchedPipeline *models.Pipeline
	for _, p := range s.pipelines {
		if !p.Enabled {
			continue
		}

		for _, trigger := range p.Triggers {
			if trigger.Type == models.TriggerPush || trigger.Type == models.TriggerWebhook {
				// 检查分支匹配
				for _, branch := range trigger.Branches {
					if branch == payload.Branch || branch == "*" {
						matchedPipeline = p
						break
					}
				}
			}
		}

		if matchedPipeline != nil {
			break
		}
	}

	s.mutex.RUnlock()

	if matchedPipeline == nil {
		return nil, fmt.Errorf("no matching pipeline found for branch: %s", payload.Branch)
	}

	// 触发流水线
	return s.TriggerPipeline(ctx, matchedPipeline.ID, models.TriggerWebhook, payload.Author, payload.Commit, payload.Message)
}

// 辅助函数
func extractSecretNames(envVars map[string]string) []string {
	var secrets []string
	sensitivePatterns := []string{"SECRET", "KEY", "TOKEN", "PASSWORD", "CREDENTIAL", "PRIVATE"}

	for k := range envVars {
		upper := strings.ToUpper(k)
		for _, pattern := range sensitivePatterns {
			if strings.Contains(upper, pattern) {
				secrets = append(secrets, k)
				break
			}
		}
	}

	return secrets
}
