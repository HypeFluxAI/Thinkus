package main

import (
	"log"
	"net/http"
	"os"

	"github.com/gin-gonic/gin"
	"github.com/thinkus/go-canary-release/internal/canary"
	"github.com/thinkus/go-canary-release/internal/models"
)

func main() {
	port := os.Getenv("PORT")
	if port == "" {
		port = "8007"
	}

	ginMode := os.Getenv("GIN_MODE")
	if ginMode == "release" {
		gin.SetMode(gin.ReleaseMode)
	}

	service := canary.NewService()

	r := gin.Default()

	// CORS
	r.Use(func(c *gin.Context) {
		c.Header("Access-Control-Allow-Origin", "*")
		c.Header("Access-Control-Allow-Methods", "GET, POST, PUT, DELETE, OPTIONS")
		c.Header("Access-Control-Allow-Headers", "Content-Type, Authorization")
		if c.Request.Method == "OPTIONS" {
			c.AbortWithStatus(204)
			return
		}
		c.Next()
	})

	api := r.Group("/api/v1")
	{
		api.GET("/health", func(c *gin.Context) {
			c.JSON(http.StatusOK, gin.H{
				"status":  "healthy",
				"service": "go-canary-release",
				"version": "1.0.0",
			})
		})

		// 发布管理
		releases := api.Group("/releases")
		{
			releases.POST("", func(c *gin.Context) {
				var req struct {
					ProjectID    string                `json:"projectId" binding:"required"`
					Name         string                `json:"name" binding:"required"`
					Description  string                `json:"description"`
					FromVersion  string                `json:"fromVersion"`
					ToVersion    string                `json:"toVersion" binding:"required"`
					DeploymentID string                `json:"deploymentId"`
					ConfigPreset string                `json:"configPreset"`
					CustomConfig *models.CanaryConfig  `json:"customConfig"`
				}

				if err := c.ShouldBindJSON(&req); err != nil {
					c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
					return
				}

				release, err := service.CreateRelease(c.Request.Context(), canary.CreateReleaseInput{
					ProjectID:    req.ProjectID,
					Name:         req.Name,
					Description:  req.Description,
					FromVersion:  req.FromVersion,
					ToVersion:    req.ToVersion,
					DeploymentID: req.DeploymentID,
					ConfigPreset: req.ConfigPreset,
					CustomConfig: req.CustomConfig,
				})

				if err != nil {
					c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
					return
				}

				c.JSON(http.StatusCreated, gin.H{
					"success": true,
					"release": release,
					"message": "灰度发布已创建",
				})
			})

			releases.GET("/:id", func(c *gin.Context) {
				id := c.Param("id")
				release, err := service.GetRelease(c.Request.Context(), id)
				if err != nil {
					c.JSON(http.StatusNotFound, gin.H{"error": err.Error()})
					return
				}
				c.JSON(http.StatusOK, gin.H{"success": true, "release": release})
			})

			releases.POST("/:id/start", func(c *gin.Context) {
				id := c.Param("id")
				if err := service.StartRelease(c.Request.Context(), id); err != nil {
					c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
					return
				}
				c.JSON(http.StatusOK, gin.H{"success": true, "message": "灰度发布已开始"})
			})

			releases.POST("/:id/pause", func(c *gin.Context) {
				id := c.Param("id")
				if err := service.PauseRelease(c.Request.Context(), id); err != nil {
					c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
					return
				}
				c.JSON(http.StatusOK, gin.H{"success": true, "message": "灰度发布已暂停"})
			})

			releases.POST("/:id/resume", func(c *gin.Context) {
				id := c.Param("id")
				if err := service.ResumeRelease(c.Request.Context(), id); err != nil {
					c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
					return
				}
				c.JSON(http.StatusOK, gin.H{"success": true, "message": "灰度发布已恢复"})
			})

			releases.POST("/:id/rollback", func(c *gin.Context) {
				id := c.Param("id")
				var req struct {
					Reason string `json:"reason"`
				}
				c.ShouldBindJSON(&req)
				if req.Reason == "" {
					req.Reason = "手动回滚"
				}

				if err := service.Rollback(c.Request.Context(), id, req.Reason); err != nil {
					c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
					return
				}
				c.JSON(http.StatusOK, gin.H{"success": true, "message": "已回滚"})
			})

			releases.POST("/:id/promote", func(c *gin.Context) {
				id := c.Param("id")
				if err := service.PromoteToFull(c.Request.Context(), id); err != nil {
					c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
					return
				}
				c.JSON(http.StatusOK, gin.H{"success": true, "message": "已全量发布"})
			})
		}

		// 项目发布
		api.GET("/projects/:projectId/releases", func(c *gin.Context) {
			projectID := c.Param("projectId")
			releases, err := service.GetProjectReleases(c.Request.Context(), projectID)
			if err != nil {
				c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
				return
			}
			c.JSON(http.StatusOK, gin.H{"success": true, "releases": releases, "count": len(releases)})
		})

		// 预设配置
		api.GET("/presets", func(c *gin.Context) {
			c.JSON(http.StatusOK, gin.H{
				"success": true,
				"presets": models.DefaultConfigs,
			})
		})
	}

	log.Printf("Go Canary Release Service starting on port %s", port)
	if err := r.Run(":" + port); err != nil {
		log.Fatalf("Failed to start server: %v", err)
	}
}
