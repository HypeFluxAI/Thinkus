package main

import (
	"log"
	"os"

	"github.com/gin-gonic/gin"
	"github.com/thinkus/go-env-manager/internal/api"
	"github.com/thinkus/go-env-manager/internal/env"
)

func main() {
	// 获取端口
	port := os.Getenv("PORT")
	if port == "" {
		port = "8005"
	}

	// 设置 Gin 模式
	ginMode := os.Getenv("GIN_MODE")
	if ginMode == "release" {
		gin.SetMode(gin.ReleaseMode)
	}

	// 创建服务
	envService := env.NewService()

	// 创建 Gin 引擎
	r := gin.Default()

	// 添加 CORS 中间件
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

	// 创建 Handler 并注册路由
	handler := api.NewHandler(envService)
	handler.RegisterRoutes(r)

	// 启动服务器
	log.Printf("Go Environment Manager starting on port %s", port)
	if err := r.Run(":" + port); err != nil {
		log.Fatalf("Failed to start server: %v", err)
	}
}
