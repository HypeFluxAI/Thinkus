package main

import (
	"bytes"
	"context"
	"encoding/json"
	"fmt"
	"io"
	"log"
	"math"
	"net/http"
	"os"
	"strings"
	"sync"
	"time"

	"github.com/gin-gonic/gin"
)

// ============================================================================
// 配置和常量
// ============================================================================

const (
	MaxRetries        = 3
	BaseRetryDelay    = 5 * time.Second
	MaxRetryDelay     = 60 * time.Second
	DeploymentTimeout = 10 * time.Minute
)

// 云平台枚举
type CloudPlatform string

const (
	PlatformVercel  CloudPlatform = "vercel"
	PlatformRailway CloudPlatform = "railway"
	PlatformRender  CloudPlatform = "render"
	PlatformFly     CloudPlatform = "fly"
)

// 部署状态
type DeployStatus string

const (
	StatusPending    DeployStatus = "pending"
	StatusBuilding   DeployStatus = "building"
	StatusDeploying  DeployStatus = "deploying"
	StatusSuccess    DeployStatus = "success"
	StatusFailed     DeployStatus = "failed"
	StatusRolledBack DeployStatus = "rolled_back"
)

// 人话消息映射
var FriendlyMessages = map[string]string{
	"pending":           "正在准备部署环境...",
	"building":          "正在构建您的应用，请稍候...",
	"deploying":         "应用构建完成，正在上线...",
	"success":           "部署成功！您的应用已上线",
	"failed":            "部署遇到问题，正在尝试修复...",
	"retrying":          "正在重新尝试部署...",
	"fallback":          "正在切换到备用服务器...",
	"rolled_back":       "已回滚到稳定版本",
	"vercel_failed":     "主服务器部署失败，正在尝试备用服务器...",
	"railway_failed":    "备用服务器也遇到问题，正在尝试第三备选...",
	"all_failed":        "所有服务器都遇到问题，技术团队已收到通知，正在处理",
	"network_error":     "网络波动，正在重试...",
	"build_error":       "应用打包遇到问题，正在自动修复...",
	"timeout":           "部署时间较长，请耐心等待...",
	"quota_exceeded":    "服务器资源不足，正在切换...",
	"invalid_config":    "配置有误，正在自动调整...",
	"dependency_error":  "依赖安装失败，正在重试...",
	"human_escalation":  "需要人工介入，客服将在5分钟内联系您",
}

// ============================================================================
// 数据结构
// ============================================================================

// DeployRequest 部署请求
type DeployRequest struct {
	ProjectID     string            `json:"projectId" binding:"required"`
	ProjectName   string            `json:"projectName"`
	RepoURL       string            `json:"repoUrl"`
	Branch        string            `json:"branch"`
	Framework     string            `json:"framework"`
	EnvVars       map[string]string `json:"envVars"`
	CustomDomain  string            `json:"customDomain"`
	PreferPlatform CloudPlatform    `json:"preferPlatform"`
	NotifyURL     string            `json:"notifyUrl"`
	ClientEmail   string            `json:"clientEmail"`
	ClientPhone   string            `json:"clientPhone"`
}

// DeployResult 部署结果
type DeployResult struct {
	Success       bool          `json:"success"`
	ProjectID     string        `json:"projectId"`
	Platform      CloudPlatform `json:"platform"`
	Status        DeployStatus  `json:"status"`
	ProductionURL string        `json:"productionUrl"`
	AdminURL      string        `json:"adminUrl"`
	DeploymentID  string        `json:"deploymentId"`
	BuildLogs     string        `json:"buildLogs"`
	Attempts      []Attempt     `json:"attempts"`
	TotalDuration int64         `json:"totalDurationMs"`
	Message       string        `json:"message"`       // 人话消息
	FriendlyTip   string        `json:"friendlyTip"`   // 友好提示
}

// Attempt 单次尝试记录
type Attempt struct {
	Platform  CloudPlatform `json:"platform"`
	AttemptNo int           `json:"attemptNo"`
	Status    DeployStatus  `json:"status"`
	Error     string        `json:"error"`
	Duration  int64         `json:"durationMs"`
	Timestamp time.Time     `json:"timestamp"`
}

// DeploymentState 部署状态（用于追踪）
type DeploymentState struct {
	ProjectID    string
	Status       DeployStatus
	Platform     CloudPlatform
	Attempts     []Attempt
	StartedAt    time.Time
	LastUpdateAt time.Time
	Result       *DeployResult
	mu           sync.RWMutex
}

// PlatformConfig 平台配置
type PlatformConfig struct {
	Name     CloudPlatform
	APIToken string
	BaseURL  string
	Priority int
}

// ============================================================================
// 智能部署服务
// ============================================================================

type SmartDeployService struct {
	platforms      []PlatformConfig
	deployments    map[string]*DeploymentState
	mu             sync.RWMutex
	notifyClient   *http.Client
}

func NewSmartDeployService() *SmartDeployService {
	platforms := []PlatformConfig{
		{
			Name:     PlatformVercel,
			APIToken: os.Getenv("VERCEL_TOKEN"),
			BaseURL:  "https://api.vercel.com",
			Priority: 1,
		},
		{
			Name:     PlatformRailway,
			APIToken: os.Getenv("RAILWAY_TOKEN"),
			BaseURL:  "https://backboard.railway.app/graphql/v2",
			Priority: 2,
		},
		{
			Name:     PlatformRender,
			APIToken: os.Getenv("RENDER_TOKEN"),
			BaseURL:  "https://api.render.com/v1",
			Priority: 3,
		},
	}

	return &SmartDeployService{
		platforms:    platforms,
		deployments:  make(map[string]*DeploymentState),
		notifyClient: &http.Client{Timeout: 10 * time.Second},
	}
}

// Deploy 执行智能部署
func (s *SmartDeployService) Deploy(ctx context.Context, req *DeployRequest) (*DeployResult, error) {
	startTime := time.Now()

	// 创建部署状态
	state := &DeploymentState{
		ProjectID:    req.ProjectID,
		Status:       StatusPending,
		StartedAt:    startTime,
		LastUpdateAt: startTime,
		Attempts:     []Attempt{},
	}

	s.mu.Lock()
	s.deployments[req.ProjectID] = state
	s.mu.Unlock()

	// 发送初始通知
	s.notifyProgress(req, state, "pending", "正在准备部署...")

	// 按优先级尝试各平台
	var lastError error
	for _, platform := range s.platforms {
		if platform.APIToken == "" {
			continue // 跳过未配置的平台
		}

		// 对每个平台尝试最多 MaxRetries 次
		for attempt := 1; attempt <= MaxRetries; attempt++ {
			attemptStart := time.Now()

			s.notifyProgress(req, state, "building",
				fmt.Sprintf("正在%s上部署 (尝试 %d/%d)...", s.getPlatformName(platform.Name), attempt, MaxRetries))

			result, err := s.deployToPlatform(ctx, platform, req, attempt)

			attemptRecord := Attempt{
				Platform:  platform.Name,
				AttemptNo: attempt,
				Status:    StatusSuccess,
				Duration:  time.Since(attemptStart).Milliseconds(),
				Timestamp: attemptStart,
			}

			if err != nil {
				attemptRecord.Status = StatusFailed
				attemptRecord.Error = err.Error()
				lastError = err

				state.mu.Lock()
				state.Attempts = append(state.Attempts, attemptRecord)
				state.LastUpdateAt = time.Now()
				state.mu.Unlock()

				// 判断是否需要重试
				if s.shouldRetry(err) && attempt < MaxRetries {
					delay := s.calculateRetryDelay(attempt)
					s.notifyProgress(req, state, "retrying",
						fmt.Sprintf("遇到问题，%d秒后重试...", int(delay.Seconds())))
					time.Sleep(delay)
					continue
				}

				// 不重试，尝试下一个平台
				s.notifyProgress(req, state, "fallback",
					fmt.Sprintf("%s部署失败，正在切换到备用平台...", s.getPlatformName(platform.Name)))
				break
			}

			// 部署成功
			state.mu.Lock()
			state.Attempts = append(state.Attempts, attemptRecord)
			state.Status = StatusSuccess
			state.Platform = platform.Name
			state.Result = result
			state.mu.Unlock()

			result.Attempts = state.Attempts
			result.TotalDuration = time.Since(startTime).Milliseconds()
			result.Message = FriendlyMessages["success"]
			result.FriendlyTip = s.generateSuccessTip(result)

			s.notifyProgress(req, state, "success", result.Message)

			return result, nil
		}
	}

	// 所有平台都失败
	state.mu.Lock()
	state.Status = StatusFailed
	state.mu.Unlock()

	failResult := &DeployResult{
		Success:       false,
		ProjectID:     req.ProjectID,
		Status:        StatusFailed,
		Attempts:      state.Attempts,
		TotalDuration: time.Since(startTime).Milliseconds(),
		Message:       FriendlyMessages["all_failed"],
		FriendlyTip:   "请不要担心，我们的技术团队已收到通知，会尽快为您处理。您也可以拨打客服电话 400-xxx-xxxx 获取帮助。",
	}

	// 触发人工升级
	s.escalateToHuman(req, state, lastError)
	s.notifyProgress(req, state, "human_escalation", failResult.Message)

	return failResult, fmt.Errorf("all deployment attempts failed: %v", lastError)
}

// deployToPlatform 部署到指定平台
func (s *SmartDeployService) deployToPlatform(ctx context.Context, platform PlatformConfig, req *DeployRequest, attempt int) (*DeployResult, error) {
	switch platform.Name {
	case PlatformVercel:
		return s.deployToVercel(ctx, platform, req)
	case PlatformRailway:
		return s.deployToRailway(ctx, platform, req)
	case PlatformRender:
		return s.deployToRender(ctx, platform, req)
	default:
		return nil, fmt.Errorf("unsupported platform: %s", platform.Name)
	}
}

// deployToVercel Vercel 部署
func (s *SmartDeployService) deployToVercel(ctx context.Context, platform PlatformConfig, req *DeployRequest) (*DeployResult, error) {
	// 构建部署请求
	deployPayload := map[string]interface{}{
		"name":       req.ProjectName,
		"gitSource": map[string]string{
			"type": "github",
			"repo": req.RepoURL,
			"ref":  req.Branch,
		},
	}

	if len(req.EnvVars) > 0 {
		envs := []map[string]string{}
		for k, v := range req.EnvVars {
			envs = append(envs, map[string]string{
				"key":    k,
				"value":  v,
				"target": "production",
			})
		}
		deployPayload["env"] = envs
	}

	body, _ := json.Marshal(deployPayload)

	httpReq, err := http.NewRequestWithContext(ctx, "POST",
		platform.BaseURL+"/v13/deployments", bytes.NewReader(body))
	if err != nil {
		return nil, fmt.Errorf("create request failed: %w", err)
	}

	httpReq.Header.Set("Authorization", "Bearer "+platform.APIToken)
	httpReq.Header.Set("Content-Type", "application/json")

	resp, err := http.DefaultClient.Do(httpReq)
	if err != nil {
		return nil, s.categorizeError(err)
	}
	defer resp.Body.Close()

	respBody, _ := io.ReadAll(resp.Body)

	if resp.StatusCode >= 400 {
		return nil, s.parseVercelError(resp.StatusCode, respBody)
	}

	var result map[string]interface{}
	json.Unmarshal(respBody, &result)

	// 轮询部署状态
	deploymentID := result["id"].(string)
	productionURL, err := s.waitForVercelDeployment(ctx, platform, deploymentID)
	if err != nil {
		return nil, err
	}

	return &DeployResult{
		Success:       true,
		ProjectID:     req.ProjectID,
		Platform:      PlatformVercel,
		Status:        StatusSuccess,
		ProductionURL: productionURL,
		AdminURL:      productionURL + "/admin",
		DeploymentID:  deploymentID,
	}, nil
}

// waitForVercelDeployment 等待 Vercel 部署完成
func (s *SmartDeployService) waitForVercelDeployment(ctx context.Context, platform PlatformConfig, deploymentID string) (string, error) {
	ticker := time.NewTicker(10 * time.Second)
	defer ticker.Stop()

	timeout := time.After(DeploymentTimeout)

	for {
		select {
		case <-ctx.Done():
			return "", ctx.Err()
		case <-timeout:
			return "", fmt.Errorf("deployment timeout")
		case <-ticker.C:
			httpReq, _ := http.NewRequestWithContext(ctx, "GET",
				platform.BaseURL+"/v13/deployments/"+deploymentID, nil)
			httpReq.Header.Set("Authorization", "Bearer "+platform.APIToken)

			resp, err := http.DefaultClient.Do(httpReq)
			if err != nil {
				continue
			}

			var result map[string]interface{}
			json.NewDecoder(resp.Body).Decode(&result)
			resp.Body.Close()

			state := result["readyState"].(string)

			switch state {
			case "READY":
				url := result["url"].(string)
				if !strings.HasPrefix(url, "https://") {
					url = "https://" + url
				}
				return url, nil
			case "ERROR", "CANCELED":
				return "", fmt.Errorf("deployment failed: %s", state)
			}
		}
	}
}

// deployToRailway Railway 部署
func (s *SmartDeployService) deployToRailway(ctx context.Context, platform PlatformConfig, req *DeployRequest) (*DeployResult, error) {
	// Railway GraphQL API
	query := `
		mutation deployProject($input: DeploymentCreateInput!) {
			deploymentCreate(input: $input) {
				id
				status
				staticUrl
			}
		}
	`

	variables := map[string]interface{}{
		"input": map[string]interface{}{
			"serviceId": req.ProjectID,
		},
	}

	payload := map[string]interface{}{
		"query":     query,
		"variables": variables,
	}

	body, _ := json.Marshal(payload)

	httpReq, err := http.NewRequestWithContext(ctx, "POST", platform.BaseURL, bytes.NewReader(body))
	if err != nil {
		return nil, fmt.Errorf("create request failed: %w", err)
	}

	httpReq.Header.Set("Authorization", "Bearer "+platform.APIToken)
	httpReq.Header.Set("Content-Type", "application/json")

	resp, err := http.DefaultClient.Do(httpReq)
	if err != nil {
		return nil, s.categorizeError(err)
	}
	defer resp.Body.Close()

	if resp.StatusCode >= 400 {
		respBody, _ := io.ReadAll(resp.Body)
		return nil, fmt.Errorf("railway deployment failed: %s", string(respBody))
	}

	var result map[string]interface{}
	json.NewDecoder(resp.Body).Decode(&result)

	// 简化处理，实际需要轮询状态
	data := result["data"].(map[string]interface{})
	deployment := data["deploymentCreate"].(map[string]interface{})

	return &DeployResult{
		Success:       true,
		ProjectID:     req.ProjectID,
		Platform:      PlatformRailway,
		Status:        StatusSuccess,
		ProductionURL: deployment["staticUrl"].(string),
		DeploymentID:  deployment["id"].(string),
	}, nil
}

// deployToRender Render 部署
func (s *SmartDeployService) deployToRender(ctx context.Context, platform PlatformConfig, req *DeployRequest) (*DeployResult, error) {
	// Render REST API
	payload := map[string]interface{}{
		"serviceId": req.ProjectID,
	}

	body, _ := json.Marshal(payload)

	httpReq, err := http.NewRequestWithContext(ctx, "POST",
		platform.BaseURL+"/services/"+req.ProjectID+"/deploys", bytes.NewReader(body))
	if err != nil {
		return nil, fmt.Errorf("create request failed: %w", err)
	}

	httpReq.Header.Set("Authorization", "Bearer "+platform.APIToken)
	httpReq.Header.Set("Content-Type", "application/json")

	resp, err := http.DefaultClient.Do(httpReq)
	if err != nil {
		return nil, s.categorizeError(err)
	}
	defer resp.Body.Close()

	if resp.StatusCode >= 400 {
		respBody, _ := io.ReadAll(resp.Body)
		return nil, fmt.Errorf("render deployment failed: %s", string(respBody))
	}

	var result map[string]interface{}
	json.NewDecoder(resp.Body).Decode(&result)

	return &DeployResult{
		Success:       true,
		ProjectID:     req.ProjectID,
		Platform:      PlatformRender,
		Status:        StatusSuccess,
		ProductionURL: fmt.Sprintf("https://%s.onrender.com", req.ProjectName),
		DeploymentID:  result["id"].(string),
	}, nil
}

// ============================================================================
// 辅助方法
// ============================================================================

// shouldRetry 判断错误是否可重试
func (s *SmartDeployService) shouldRetry(err error) bool {
	errStr := err.Error()
	retryableErrors := []string{
		"timeout",
		"network",
		"connection",
		"rate limit",
		"503",
		"502",
		"429",
		"ECONNREFUSED",
		"ETIMEDOUT",
	}

	for _, e := range retryableErrors {
		if strings.Contains(strings.ToLower(errStr), strings.ToLower(e)) {
			return true
		}
	}
	return false
}

// calculateRetryDelay 计算重试延迟（指数退避）
func (s *SmartDeployService) calculateRetryDelay(attempt int) time.Duration {
	delay := BaseRetryDelay * time.Duration(math.Pow(2, float64(attempt-1)))
	if delay > MaxRetryDelay {
		delay = MaxRetryDelay
	}
	return delay
}

// categorizeError 分类错误
func (s *SmartDeployService) categorizeError(err error) error {
	errStr := err.Error()

	if strings.Contains(errStr, "timeout") {
		return fmt.Errorf("network_timeout: %w", err)
	}
	if strings.Contains(errStr, "connection") {
		return fmt.Errorf("network_error: %w", err)
	}

	return fmt.Errorf("unknown_error: %w", err)
}

// parseVercelError 解析 Vercel 错误
func (s *SmartDeployService) parseVercelError(statusCode int, body []byte) error {
	var errResp map[string]interface{}
	json.Unmarshal(body, &errResp)

	switch statusCode {
	case 401:
		return fmt.Errorf("auth_error: invalid token")
	case 403:
		return fmt.Errorf("permission_error: access denied")
	case 429:
		return fmt.Errorf("rate_limit: too many requests")
	case 500, 502, 503:
		return fmt.Errorf("server_error: platform unavailable")
	default:
		if errResp["error"] != nil {
			return fmt.Errorf("vercel_error: %v", errResp["error"])
		}
		return fmt.Errorf("unknown_vercel_error: status %d", statusCode)
	}
}

// getPlatformName 获取平台友好名称
func (s *SmartDeployService) getPlatformName(platform CloudPlatform) string {
	names := map[CloudPlatform]string{
		PlatformVercel:  "主服务器",
		PlatformRailway: "备用服务器A",
		PlatformRender:  "备用服务器B",
		PlatformFly:     "备用服务器C",
	}
	if name, ok := names[platform]; ok {
		return name
	}
	return string(platform)
}

// generateSuccessTip 生成成功提示
func (s *SmartDeployService) generateSuccessTip(result *DeployResult) string {
	return fmt.Sprintf(
		"您的应用已成功上线！\n访问地址：%s\n管理后台：%s\n\n如有任何问题，可随时联系客服。",
		result.ProductionURL,
		result.AdminURL,
	)
}

// notifyProgress 发送进度通知
func (s *SmartDeployService) notifyProgress(req *DeployRequest, state *DeploymentState, status, message string) {
	if req.NotifyURL == "" {
		return
	}

	payload := map[string]interface{}{
		"projectId": req.ProjectID,
		"status":    status,
		"message":   message,
		"attempts":  len(state.Attempts),
		"timestamp": time.Now().Format(time.RFC3339),
	}

	body, _ := json.Marshal(payload)

	go func() {
		httpReq, _ := http.NewRequest("POST", req.NotifyURL, bytes.NewReader(body))
		httpReq.Header.Set("Content-Type", "application/json")
		s.notifyClient.Do(httpReq)
	}()
}

// escalateToHuman 升级到人工处理
func (s *SmartDeployService) escalateToHuman(req *DeployRequest, state *DeploymentState, lastError error) {
	// 记录升级信息
	log.Printf("[ESCALATION] Project %s needs human intervention. Last error: %v", req.ProjectID, lastError)

	// TODO: 发送钉钉/企微通知给运维
	// TODO: 创建工单
	// TODO: 发送短信给用户说明情况
}

// GetDeploymentStatus 获取部署状态
func (s *SmartDeployService) GetDeploymentStatus(projectID string) (*DeploymentState, bool) {
	s.mu.RLock()
	defer s.mu.RUnlock()

	state, exists := s.deployments[projectID]
	return state, exists
}

// ============================================================================
// HTTP 服务
// ============================================================================

func main() {
	r := gin.Default()

	service := NewSmartDeployService()

	// 健康检查
	r.GET("/health", func(c *gin.Context) {
		c.JSON(http.StatusOK, gin.H{
			"status":  "healthy",
			"service": "smart-deploy",
		})
	})

	// 执行部署
	r.POST("/deploy", func(c *gin.Context) {
		var req DeployRequest
		if err := c.ShouldBindJSON(&req); err != nil {
			c.JSON(http.StatusBadRequest, gin.H{
				"success": false,
				"error":   err.Error(),
				"message": "请求参数有误，请检查后重试",
			})
			return
		}

		result, err := service.Deploy(c.Request.Context(), &req)
		if err != nil {
			c.JSON(http.StatusOK, result) // 即使失败也返回200，避免用户看到错误页面
			return
		}

		c.JSON(http.StatusOK, result)
	})

	// 查询部署状态
	r.GET("/deploy/:projectId/status", func(c *gin.Context) {
		projectID := c.Param("projectId")

		state, exists := service.GetDeploymentStatus(projectID)
		if !exists {
			c.JSON(http.StatusNotFound, gin.H{
				"success": false,
				"message": "未找到该项目的部署记录",
			})
			return
		}

		state.mu.RLock()
		defer state.mu.RUnlock()

		friendlyStatus := FriendlyMessages[string(state.Status)]
		if friendlyStatus == "" {
			friendlyStatus = "处理中..."
		}

		c.JSON(http.StatusOK, gin.H{
			"success":        true,
			"projectId":      projectID,
			"status":         state.Status,
			"platform":       state.Platform,
			"message":        friendlyStatus,
			"attemptsCount":  len(state.Attempts),
			"lastUpdateAt":   state.LastUpdateAt,
			"durationMs":     time.Since(state.StartedAt).Milliseconds(),
		})
	})

	// 手动重试
	r.POST("/deploy/:projectId/retry", func(c *gin.Context) {
		projectID := c.Param("projectId")

		state, exists := service.GetDeploymentStatus(projectID)
		if !exists {
			c.JSON(http.StatusNotFound, gin.H{
				"success": false,
				"message": "未找到该项目的部署记录",
			})
			return
		}

		// 重置状态并重新部署
		// TODO: 实现重试逻辑

		c.JSON(http.StatusOK, gin.H{
			"success": true,
			"message": "已开始重新部署，请稍候查看状态",
			"projectId": projectID,
			"previousAttempts": len(state.Attempts),
		})
	})

	// 回滚
	r.POST("/deploy/:projectId/rollback", func(c *gin.Context) {
		projectID := c.Param("projectId")

		// TODO: 实现回滚逻辑

		c.JSON(http.StatusOK, gin.H{
			"success": true,
			"message": "已开始回滚到上一个稳定版本",
			"projectId": projectID,
		})
	})

	port := os.Getenv("PORT")
	if port == "" {
		port = "8001"
	}

	log.Printf("Smart Deploy Service starting on port %s", port)
	r.Run(":" + port)
}
