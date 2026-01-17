package api

import (
	"net/http"
	"strconv"

	"github.com/gin-gonic/gin"

	"github.com/thinkus/go-ai-care/internal/care"
	"github.com/thinkus/go-ai-care/internal/models"
)

// Handler API处理器
type Handler struct {
	service *care.Service
}

// NewHandler 创建处理器
func NewHandler(service *care.Service) *Handler {
	return &Handler{service: service}
}

// SetupRoutes 设置路由
func (h *Handler) SetupRoutes(r *gin.Engine) {
	r.GET("/health", h.Health)

	api := r.Group("/api/care")
	{
		// 用户活动
		api.GET("/activity/:userId/:projectId", h.GetUserActivity)
		api.POST("/activity", h.UpdateUserActivity)
		api.POST("/stuck", h.RecordStuckPoint)

		// 关怀记录
		api.GET("/records/:userId", h.GetCareRecords)

		// 规则管理
		api.GET("/rules", h.GetRules)
		api.POST("/rules", h.CreateRule)
		api.PUT("/rules/:ruleId", h.UpdateRule)
		api.DELETE("/rules/:ruleId", h.DeleteRule)

		// 手动触发
		api.POST("/trigger", h.TriggerCare)
	}
}

// Health 健康检查
func (h *Handler) Health(c *gin.Context) {
	c.JSON(http.StatusOK, gin.H{
		"status":  "healthy",
		"service": "ai-care",
	})
}

// GetUserActivity 获取用户活动
func (h *Handler) GetUserActivity(c *gin.Context) {
	userID := c.Param("userId")
	projectID := c.Param("projectId")

	activity, err := h.service.GetUserActivity(c.Request.Context(), userID, projectID)
	if err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "User activity not found"})
		return
	}

	c.JSON(http.StatusOK, activity)
}

// UpdateActivityRequest 更新活动请求
type UpdateActivityRequest struct {
	UserID       string   `json:"user_id" binding:"required"`
	ProjectID    string   `json:"project_id" binding:"required"`
	LoginCount7d int      `json:"login_count_7d"`
	ActionCount7d int     `json:"action_count_7d"`
	FeaturesUsed []string `json:"features_used"`
}

// UpdateUserActivity 更新用户活动
func (h *Handler) UpdateUserActivity(c *gin.Context) {
	var req UpdateActivityRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	activity := &models.UserActivity{
		UserID:        req.UserID,
		ProjectID:     req.ProjectID,
		LoginCount7d:  req.LoginCount7d,
		ActionCount7d: req.ActionCount7d,
		FeaturesUsed:  req.FeaturesUsed,
	}

	if err := h.service.UpdateUserActivity(c.Request.Context(), activity); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusOK, gin.H{"success": true})
}

// StuckPointRequest 卡住点请求
type StuckPointRequest struct {
	UserID    string `json:"user_id" binding:"required"`
	ProjectID string `json:"project_id" binding:"required"`
	Feature   string `json:"feature" binding:"required"`
	TimeSpent int    `json:"time_spent" binding:"required"`
}

// RecordStuckPoint 记录卡住点
func (h *Handler) RecordStuckPoint(c *gin.Context) {
	var req StuckPointRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	if err := h.service.RecordStuckPoint(c.Request.Context(), req.UserID, req.ProjectID, req.Feature, req.TimeSpent); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"success": true,
		"message": "已记录，AI将很快提供帮助",
	})
}

// GetCareRecords 获取关怀记录
func (h *Handler) GetCareRecords(c *gin.Context) {
	userID := c.Param("userId")
	limitStr := c.DefaultQuery("limit", "20")
	limit, _ := strconv.Atoi(limitStr)

	records, err := h.service.GetCareRecords(c.Request.Context(), userID, limit)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusOK, records)
}

// GetRules 获取规则列表
func (h *Handler) GetRules(c *gin.Context) {
	// 返回默认规则
	c.JSON(http.StatusOK, models.DefaultCareRules)
}

// CreateRule 创建规则
func (h *Handler) CreateRule(c *gin.Context) {
	var rule models.CareRule
	if err := c.ShouldBindJSON(&rule); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	// TODO: 保存到数据库
	c.JSON(http.StatusOK, gin.H{"success": true, "rule": rule})
}

// UpdateRule 更新规则
func (h *Handler) UpdateRule(c *gin.Context) {
	ruleID := c.Param("ruleId")
	var rule models.CareRule
	if err := c.ShouldBindJSON(&rule); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}
	rule.ID = ruleID

	// TODO: 更新数据库
	c.JSON(http.StatusOK, gin.H{"success": true, "rule": rule})
}

// DeleteRule 删除规则
func (h *Handler) DeleteRule(c *gin.Context) {
	ruleID := c.Param("ruleId")
	// TODO: 从数据库删除
	c.JSON(http.StatusOK, gin.H{"success": true, "deleted": ruleID})
}

// TriggerCareRequest 手动触发请求
type TriggerCareRequest struct {
	UserID    string          `json:"user_id" binding:"required"`
	ProjectID string          `json:"project_id" binding:"required"`
	CareType  models.CareType `json:"care_type" binding:"required"`
	Channel   string          `json:"channel"`
}

// TriggerCare 手动触发关怀
func (h *Handler) TriggerCare(c *gin.Context) {
	var req TriggerCareRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	// 获取消息模板
	template, ok := models.CareMessages[req.CareType]
	if !ok {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Unknown care type"})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"success": true,
		"message": "关怀消息已发送",
		"type":    req.CareType,
		"title":   template.Title,
		"content": template.Content,
	})
}
