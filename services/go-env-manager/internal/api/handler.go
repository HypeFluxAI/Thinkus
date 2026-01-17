package api

import (
	"net/http"

	"github.com/gin-gonic/gin"
	"github.com/thinkus/go-env-manager/internal/env"
	"github.com/thinkus/go-env-manager/internal/models"
)

// Handler API处理器
type Handler struct {
	envService *env.Service
}

// NewHandler 创建新的Handler
func NewHandler(envService *env.Service) *Handler {
	return &Handler{
		envService: envService,
	}
}

// RegisterRoutes 注册路由
func (h *Handler) RegisterRoutes(r *gin.Engine) {
	api := r.Group("/api/v1")
	{
		// 健康检查
		api.GET("/health", h.Health)

		// 环境管理
		environments := api.Group("/environments")
		{
			environments.POST("", h.CreateEnvironment)
			environments.GET("/:id", h.GetEnvironment)
			environments.PUT("/:id", h.UpdateEnvironment)
			environments.DELETE("/:id", h.DestroyEnvironment)

			// 部署相关
			environments.POST("/:id/deploy", h.DeployEnvironment)
			environments.POST("/:id/rollback", h.RollbackDeployment)

			// 环境比较和同步
			environments.GET("/:id/compare/:targetId", h.CompareEnvironments)
			environments.POST("/:id/sync/:targetId", h.SyncEnvVars)
		}

		// 项目环境
		projects := api.Group("/projects")
		{
			projects.GET("/:projectId/environments", h.GetProjectEnvironments)
		}

		// 环境提升
		api.POST("/promote", h.PromoteEnvironment)

		// 统计
		api.GET("/stats", h.GetStats)
	}
}

// Health 健康检查
func (h *Handler) Health(c *gin.Context) {
	c.JSON(http.StatusOK, gin.H{
		"status":  "healthy",
		"service": "go-env-manager",
		"version": "1.0.0",
	})
}

// CreateEnvironmentRequest 创建环境请求
type CreateEnvironmentRequest struct {
	ProjectID        string            `json:"projectId" binding:"required"`
	Name             string            `json:"name" binding:"required"`
	Type             string            `json:"type" binding:"required"`
	Provider         string            `json:"provider"`
	EnvVars          map[string]string `json:"envVars"`
	Domain           string            `json:"domain"`
	EnableMonitoring bool              `json:"enableMonitoring"`
}

// CreateEnvironment 创建环境
func (h *Handler) CreateEnvironment(c *gin.Context) {
	var req CreateEnvironmentRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	provider := models.ProviderVercel
	if req.Provider != "" {
		provider = models.ProviderType(req.Provider)
	}

	input := env.CreateEnvironmentInput{
		ProjectID:        req.ProjectID,
		Name:             req.Name,
		Type:             models.EnvironmentType(req.Type),
		Provider:         provider,
		EnvVars:          req.EnvVars,
		Domain:           req.Domain,
		EnableMonitoring: req.EnableMonitoring,
	}

	environment, err := h.envService.CreateEnvironment(c.Request.Context(), input)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusCreated, gin.H{
		"success":     true,
		"environment": environment,
		"message":     "环境正在创建中，请稍后查看状态",
	})
}

// GetEnvironment 获取环境详情
func (h *Handler) GetEnvironment(c *gin.Context) {
	id := c.Param("id")

	environment, err := h.envService.GetEnvironment(c.Request.Context(), id)
	if err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"success":     true,
		"environment": environment,
	})
}

// GetProjectEnvironments 获取项目的所有环境
func (h *Handler) GetProjectEnvironments(c *gin.Context) {
	projectID := c.Param("projectId")

	environments, err := h.envService.GetProjectEnvironments(c.Request.Context(), projectID)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"success":      true,
		"environments": environments,
		"count":        len(environments),
	})
}

// UpdateEnvironmentRequest 更新环境请求
type UpdateEnvironmentRequest struct {
	EnvVars map[string]string `json:"envVars"`
}

// UpdateEnvironment 更新环境配置
func (h *Handler) UpdateEnvironment(c *gin.Context) {
	id := c.Param("id")

	var req UpdateEnvironmentRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	environment, err := h.envService.UpdateEnvironment(c.Request.Context(), id, req.EnvVars)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"success":     true,
		"environment": environment,
		"message":     "环境配置已更新",
	})
}

// DestroyEnvironment 销毁环境
func (h *Handler) DestroyEnvironment(c *gin.Context) {
	id := c.Param("id")

	err := h.envService.DestroyEnvironment(c.Request.Context(), id)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"success": true,
		"message": "环境已销毁",
	})
}

// DeployEnvironmentRequest 部署环境请求
type DeployEnvironmentRequest struct {
	Version    string `json:"version" binding:"required"`
	CommitHash string `json:"commitHash"`
}

// DeployEnvironment 部署环境
func (h *Handler) DeployEnvironment(c *gin.Context) {
	id := c.Param("id")

	var req DeployEnvironmentRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	deployment, err := h.envService.DeployEnvironment(c.Request.Context(), id, req.Version, req.CommitHash)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"success":    true,
		"deployment": deployment,
		"message":    "部署已开始",
	})
}

// RollbackRequest 回滚请求
type RollbackRequest struct {
	DeploymentID string `json:"deploymentId" binding:"required"`
}

// RollbackDeployment 回滚部署
func (h *Handler) RollbackDeployment(c *gin.Context) {
	id := c.Param("id")

	var req RollbackRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	deployment, err := h.envService.RollbackDeployment(c.Request.Context(), id, req.DeploymentID)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"success":    true,
		"deployment": deployment,
		"message":    "回滚已开始",
	})
}

// PromoteEnvironment 提升环境
func (h *Handler) PromoteEnvironment(c *gin.Context) {
	var req models.PromoteConfig
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	environment, err := h.envService.PromoteEnvironment(c.Request.Context(), req)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"success":     true,
		"environment": environment,
		"message":     "环境提升成功",
	})
}

// CompareEnvironments 比较两个环境
func (h *Handler) CompareEnvironments(c *gin.Context) {
	sourceID := c.Param("id")
	targetID := c.Param("targetId")

	comparison, err := h.envService.CompareEnvironments(c.Request.Context(), sourceID, targetID)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"success":    true,
		"comparison": comparison,
	})
}

// SyncEnvVarsRequest 同步环境变量请求
type SyncEnvVarsRequest struct {
	Keys []string `json:"keys" binding:"required"`
}

// SyncEnvVars 同步环境变量
func (h *Handler) SyncEnvVars(c *gin.Context) {
	sourceID := c.Param("id")
	targetID := c.Param("targetId")

	var req SyncEnvVarsRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	result, err := h.envService.SyncEnvVars(c.Request.Context(), sourceID, targetID, req.Keys)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"success": true,
		"result":  result,
	})
}

// GetStats 获取统计信息
func (h *Handler) GetStats(c *gin.Context) {
	stats := h.envService.GetStats(c.Request.Context())

	c.JSON(http.StatusOK, gin.H{
		"success": true,
		"stats":   stats,
	})
}
