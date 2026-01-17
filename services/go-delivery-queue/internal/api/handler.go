package api

import (
	"net/http"

	"github.com/gin-gonic/gin"
	"github.com/thinkus/go-delivery-queue/internal/models"
	"github.com/thinkus/go-delivery-queue/internal/queue"
)

// Handler API处理器
type Handler struct {
	service *queue.Service
}

// NewHandler 创建处理器
func NewHandler(service *queue.Service) *Handler {
	return &Handler{service: service}
}

// RegisterRoutes 注册路由
func (h *Handler) RegisterRoutes(r *gin.Engine) {
	api := r.Group("/api/v1")
	{
		// 队列操作
		api.POST("/queue", h.AddToQueue)
		api.GET("/queue", h.GetQueue)
		api.GET("/queue/:id", h.GetItem)
		api.DELETE("/queue/:id", h.CancelItem)
		api.POST("/queue/:id/pause", h.PauseItem)
		api.POST("/queue/:id/resume", h.ResumeItem)
		api.POST("/queue/:id/retry", h.RetryItem)

		// 执行状态更新
		api.POST("/queue/:id/running", h.MarkRunning)
		api.POST("/queue/:id/progress", h.UpdateProgress)
		api.POST("/queue/:id/complete", h.MarkCompleted)
		api.POST("/queue/:id/fail", h.MarkFailed)

		// 统计和信息
		api.GET("/stats", h.GetStats)
		api.GET("/queue/:id/position", h.GetQueuePosition)
		api.GET("/queue/:id/wait-time", h.GetEstimatedWaitTime)

		// Worker管理
		api.POST("/workers", h.RegisterWorker)

		// 维护
		api.POST("/cleanup", h.Cleanup)
	}

	// 健康检查
	r.GET("/health", h.HealthCheck)
}

// AddToQueue 添加到队列
func (h *Handler) AddToQueue(c *gin.Context) {
	var input queue.AddToQueueInput
	if err := c.ShouldBindJSON(&input); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	item, err := h.service.AddToQueue(c.Request.Context(), input)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusOK, item)
}

// GetQueue 获取队列列表
func (h *Handler) GetQueue(c *gin.Context) {
	filter := queue.QueueFilter{}

	// 解析状态过滤
	if statuses := c.QueryArray("status"); len(statuses) > 0 {
		for _, s := range statuses {
			filter.Status = append(filter.Status, models.QueueItemStatus(s))
		}
	}

	// 解析优先级过滤
	if priorities := c.QueryArray("priority"); len(priorities) > 0 {
		for _, p := range priorities {
			filter.Priority = append(filter.Priority, models.DeliveryPriority(p))
		}
	}

	// 解析产品类型过滤
	filter.ProductType = c.QueryArray("productType")

	items := h.service.GetQueue(c.Request.Context(), filter)
	c.JSON(http.StatusOK, items)
}

// GetItem 获取队列项
func (h *Handler) GetItem(c *gin.Context) {
	id := c.Param("id")

	item, err := h.service.GetItem(c.Request.Context(), id)
	if err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusOK, item)
}

// CancelItem 取消队列项
func (h *Handler) CancelItem(c *gin.Context) {
	id := c.Param("id")

	var body struct {
		Reason string `json:"reason"`
	}
	c.ShouldBindJSON(&body)

	if err := h.service.CancelItem(c.Request.Context(), id, body.Reason); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusOK, gin.H{"success": true})
}

// PauseItem 暂停队列项
func (h *Handler) PauseItem(c *gin.Context) {
	id := c.Param("id")

	if err := h.service.PauseItem(c.Request.Context(), id); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusOK, gin.H{"success": true})
}

// ResumeItem 恢复队列项
func (h *Handler) ResumeItem(c *gin.Context) {
	id := c.Param("id")

	if err := h.service.ResumeItem(c.Request.Context(), id); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusOK, gin.H{"success": true})
}

// RetryItem 重试失败项
func (h *Handler) RetryItem(c *gin.Context) {
	id := c.Param("id")

	if err := h.service.RetryItem(c.Request.Context(), id); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusOK, gin.H{"success": true})
}

// MarkRunning 标记开始执行
func (h *Handler) MarkRunning(c *gin.Context) {
	id := c.Param("id")

	var body struct {
		WorkerID string `json:"workerId"`
	}
	if err := c.ShouldBindJSON(&body); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	if err := h.service.MarkRunning(c.Request.Context(), id, body.WorkerID); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusOK, gin.H{"success": true})
}

// UpdateProgress 更新进度
func (h *Handler) UpdateProgress(c *gin.Context) {
	id := c.Param("id")

	var body struct {
		Progress int    `json:"progress"`
		Stage    string `json:"stage,omitempty"`
	}
	if err := c.ShouldBindJSON(&body); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	if err := h.service.UpdateProgress(c.Request.Context(), id, body.Progress, body.Stage); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusOK, gin.H{"success": true})
}

// MarkCompleted 标记完成
func (h *Handler) MarkCompleted(c *gin.Context) {
	id := c.Param("id")

	var body struct {
		Outputs *models.QueueItemOutputs `json:"outputs,omitempty"`
	}
	c.ShouldBindJSON(&body)

	if err := h.service.MarkCompleted(c.Request.Context(), id, body.Outputs); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusOK, gin.H{"success": true})
}

// MarkFailed 标记失败
func (h *Handler) MarkFailed(c *gin.Context) {
	id := c.Param("id")

	var body struct {
		Reason       models.FailureReason `json:"reason"`
		ErrorMessage string               `json:"errorMessage"`
		ErrorDetails string               `json:"errorDetails,omitempty"`
	}
	if err := c.ShouldBindJSON(&body); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	if err := h.service.MarkFailed(c.Request.Context(), id, body.Reason, body.ErrorMessage, body.ErrorDetails); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusOK, gin.H{"success": true})
}

// GetStats 获取统计数据
func (h *Handler) GetStats(c *gin.Context) {
	stats := h.service.GetStats(c.Request.Context())
	c.JSON(http.StatusOK, stats)
}

// GetQueuePosition 获取队列位置
func (h *Handler) GetQueuePosition(c *gin.Context) {
	id := c.Param("id")

	position := h.service.GetQueuePosition(c.Request.Context(), id)
	c.JSON(http.StatusOK, gin.H{"position": position})
}

// GetEstimatedWaitTime 获取预计等待时间
func (h *Handler) GetEstimatedWaitTime(c *gin.Context) {
	priority := models.DeliveryPriority(c.DefaultQuery("priority", string(models.PriorityNormal)))

	waitTime := h.service.GetEstimatedWaitTime(c.Request.Context(), priority)
	c.JSON(http.StatusOK, gin.H{"estimatedWaitMinutes": waitTime})
}

// RegisterWorker 注册工作节点
func (h *Handler) RegisterWorker(c *gin.Context) {
	var body struct {
		ID           string   `json:"id"`
		Name         string   `json:"name"`
		Capabilities []string `json:"capabilities,omitempty"`
	}
	if err := c.ShouldBindJSON(&body); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	worker := h.service.RegisterWorker(c.Request.Context(), body.ID, body.Name, body.Capabilities)
	c.JSON(http.StatusOK, worker)
}

// Cleanup 清理旧数据
func (h *Handler) Cleanup(c *gin.Context) {
	var body struct {
		DaysToKeep int `json:"daysToKeep"`
	}
	c.ShouldBindJSON(&body)

	if body.DaysToKeep <= 0 {
		body.DaysToKeep = 7
	}

	removed := h.service.Cleanup(c.Request.Context(), body.DaysToKeep)
	c.JSON(http.StatusOK, gin.H{"removed": removed})
}

// HealthCheck 健康检查
func (h *Handler) HealthCheck(c *gin.Context) {
	c.JSON(http.StatusOK, gin.H{
		"status":  "healthy",
		"service": "go-delivery-queue",
	})
}
