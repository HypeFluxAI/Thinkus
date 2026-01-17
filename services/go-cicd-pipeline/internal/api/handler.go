package api

import (
	"net/http"

	"github.com/gin-gonic/gin"
	"github.com/thinkus/go-cicd-pipeline/internal/models"
	"github.com/thinkus/go-cicd-pipeline/internal/pipeline"
)

// Handler API处理器
type Handler struct {
	pipelineService *pipeline.Service
}

// NewHandler 创建新的Handler
func NewHandler(pipelineService *pipeline.Service) *Handler {
	return &Handler{
		pipelineService: pipelineService,
	}
}

// RegisterRoutes 注册路由
func (h *Handler) RegisterRoutes(r *gin.Engine) {
	api := r.Group("/api/v1")
	{
		// 健康检查
		api.GET("/health", h.Health)

		// 流水线管理
		pipelines := api.Group("/pipelines")
		{
			pipelines.POST("", h.CreatePipeline)
			pipelines.GET("/:id", h.GetPipeline)
			pipelines.POST("/:id/trigger", h.TriggerPipeline)
			pipelines.GET("/:id/runs", h.GetPipelineRuns)
			pipelines.GET("/:id/stats", h.GetPipelineStats)
			pipelines.GET("/:id/workflow", h.GenerateWorkflow)
		}

		// 执行记录
		runs := api.Group("/runs")
		{
			runs.GET("/:id", h.GetRun)
			runs.POST("/:id/cancel", h.CancelRun)
			runs.GET("/:id/logs", h.GetRunLogs)
		}

		// 项目流水线
		projects := api.Group("/projects")
		{
			projects.GET("/:projectId/pipelines", h.GetProjectPipelines)
		}

		// Webhook
		api.POST("/webhook/github", h.GitHubWebhook)
		api.POST("/webhook/generic", h.GenericWebhook)

		// 模板
		api.GET("/templates", h.GetTemplates)
	}
}

// Health 健康检查
func (h *Handler) Health(c *gin.Context) {
	c.JSON(http.StatusOK, gin.H{
		"status":  "healthy",
		"service": "go-cicd-pipeline",
		"version": "1.0.0",
	})
}

// CreatePipelineRequest 创建流水线请求
type CreatePipelineRequest struct {
	ProjectID   string                 `json:"projectId" binding:"required"`
	Name        string                 `json:"name" binding:"required"`
	Description string                 `json:"description"`
	RepoURL     string                 `json:"repoUrl"`
	Branch      string                 `json:"branch"`
	Template    string                 `json:"template"` // nextjs/python-fastapi/go-service
	Stages      []models.StageConfig   `json:"stages"`
	Triggers    []models.TriggerConfig `json:"triggers"`
	EnvVars     map[string]string      `json:"envVars"`
}

// CreatePipeline 创建流水线
func (h *Handler) CreatePipeline(c *gin.Context) {
	var req CreatePipelineRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	branch := req.Branch
	if branch == "" {
		branch = "main"
	}

	input := pipeline.CreatePipelineInput{
		ProjectID:   req.ProjectID,
		Name:        req.Name,
		Description: req.Description,
		RepoURL:     req.RepoURL,
		Branch:      branch,
		Template:    req.Template,
		Stages:      req.Stages,
		Triggers:    req.Triggers,
		EnvVars:     req.EnvVars,
	}

	p, err := h.pipelineService.CreatePipeline(c.Request.Context(), input)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusCreated, gin.H{
		"success":  true,
		"pipeline": p,
		"message":  "流水线创建成功",
	})
}

// GetPipeline 获取流水线详情
func (h *Handler) GetPipeline(c *gin.Context) {
	id := c.Param("id")

	p, err := h.pipelineService.GetPipeline(c.Request.Context(), id)
	if err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"success":  true,
		"pipeline": p,
	})
}

// TriggerPipelineRequest 触发流水线请求
type TriggerPipelineRequest struct {
	TriggeredBy string `json:"triggeredBy"`
	CommitHash  string `json:"commitHash"`
	CommitMsg   string `json:"commitMsg"`
}

// TriggerPipeline 触发流水线
func (h *Handler) TriggerPipeline(c *gin.Context) {
	id := c.Param("id")

	var req TriggerPipelineRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		req.TriggeredBy = "api"
	}

	run, err := h.pipelineService.TriggerPipeline(
		c.Request.Context(),
		id,
		models.TriggerAPI,
		req.TriggeredBy,
		req.CommitHash,
		req.CommitMsg,
	)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"success": true,
		"run":     run,
		"message": "流水线已触发",
	})
}

// GetPipelineRuns 获取流水线执行历史
func (h *Handler) GetPipelineRuns(c *gin.Context) {
	id := c.Param("id")

	runs, err := h.pipelineService.GetPipelineRuns(c.Request.Context(), id, 20)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"success": true,
		"runs":    runs,
		"count":   len(runs),
	})
}

// GetPipelineStats 获取流水线统计
func (h *Handler) GetPipelineStats(c *gin.Context) {
	id := c.Param("id")

	stats := h.pipelineService.GetStats(c.Request.Context(), id)

	c.JSON(http.StatusOK, gin.H{
		"success": true,
		"stats":   stats,
	})
}

// GenerateWorkflow 生成 GitHub Actions 配置
func (h *Handler) GenerateWorkflow(c *gin.Context) {
	id := c.Param("id")

	yaml, err := h.pipelineService.GenerateGitHubWorkflow(c.Request.Context(), id)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"success":  true,
		"workflow": yaml,
	})
}

// GetRun 获取执行记录
func (h *Handler) GetRun(c *gin.Context) {
	id := c.Param("id")

	run, err := h.pipelineService.GetRun(c.Request.Context(), id)
	if err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"success": true,
		"run":     run,
	})
}

// CancelRun 取消执行
func (h *Handler) CancelRun(c *gin.Context) {
	id := c.Param("id")

	err := h.pipelineService.CancelRun(c.Request.Context(), id)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"success": true,
		"message": "执行已取消",
	})
}

// GetRunLogs 获取执行日志
func (h *Handler) GetRunLogs(c *gin.Context) {
	id := c.Param("id")

	run, err := h.pipelineService.GetRun(c.Request.Context(), id)
	if err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"success": true,
		"logs":    run.Logs,
	})
}

// GetProjectPipelines 获取项目的所有流水线
func (h *Handler) GetProjectPipelines(c *gin.Context) {
	projectID := c.Param("projectId")

	pipelines, err := h.pipelineService.GetProjectPipelines(c.Request.Context(), projectID)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"success":   true,
		"pipelines": pipelines,
		"count":     len(pipelines),
	})
}

// GitHubWebhook 处理 GitHub Webhook
func (h *Handler) GitHubWebhook(c *gin.Context) {
	var payload struct {
		Ref        string `json:"ref"`
		After      string `json:"after"`
		HeadCommit struct {
			Message string `json:"message"`
			Author  struct {
				Name string `json:"name"`
			} `json:"author"`
		} `json:"head_commit"`
		Repository struct {
			FullName string `json:"full_name"`
		} `json:"repository"`
	}

	if err := c.ShouldBindJSON(&payload); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	// 解析分支名
	branch := payload.Ref
	if len(branch) > 11 && branch[:11] == "refs/heads/" {
		branch = branch[11:]
	}

	webhookPayload := models.WebhookPayload{
		Event:      "push",
		Repository: payload.Repository.FullName,
		Branch:     branch,
		Commit:     payload.After,
		Message:    payload.HeadCommit.Message,
		Author:     payload.HeadCommit.Author.Name,
	}

	run, err := h.pipelineService.HandleWebhook(c.Request.Context(), webhookPayload)
	if err != nil {
		c.JSON(http.StatusOK, gin.H{
			"success": false,
			"message": err.Error(),
		})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"success": true,
		"run":     run,
		"message": "Webhook 处理成功，流水线已触发",
	})
}

// GenericWebhook 处理通用 Webhook
func (h *Handler) GenericWebhook(c *gin.Context) {
	var payload models.WebhookPayload
	if err := c.ShouldBindJSON(&payload); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	run, err := h.pipelineService.HandleWebhook(c.Request.Context(), payload)
	if err != nil {
		c.JSON(http.StatusOK, gin.H{
			"success": false,
			"message": err.Error(),
		})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"success": true,
		"run":     run,
	})
}

// GetTemplates 获取流水线模板
func (h *Handler) GetTemplates(c *gin.Context) {
	templates := []gin.H{
		{
			"id":          "nextjs",
			"name":        "Next.js 应用",
			"description": "适用于 Next.js 前端项目，包含构建、测试、Vercel 部署",
			"stages":      models.PipelineTemplates["nextjs"],
		},
		{
			"id":          "python-fastapi",
			"name":        "Python FastAPI",
			"description": "适用于 Python FastAPI 后端服务，包含测试、Docker 构建、部署",
			"stages":      models.PipelineTemplates["python-fastapi"],
		},
		{
			"id":          "go-service",
			"name":        "Go 微服务",
			"description": "适用于 Go 微服务，包含测试、构建、Docker 部署",
			"stages":      models.PipelineTemplates["go-service"],
		},
	}

	c.JSON(http.StatusOK, gin.H{
		"success":   true,
		"templates": templates,
	})
}
