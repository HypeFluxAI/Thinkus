package main

import (
	"log"
	"os"

	"github.com/gin-gonic/gin"
	"github.com/thinkus/go-delivery-queue/internal/api"
	"github.com/thinkus/go-delivery-queue/internal/queue"
)

func main() {
	// 设置 Gin 模式
	if os.Getenv("GIN_MODE") == "release" {
		gin.SetMode(gin.ReleaseMode)
	}

	// 创建服务
	queueService := queue.NewService()

	// 创建 API 处理器
	handler := api.NewHandler(queueService)

	// 创建 Gin 引擎
	r := gin.Default()

	// 注册路由
	handler.RegisterRoutes(r)

	// 获取端口
	port := os.Getenv("PORT")
	if port == "" {
		port = "8004"
	}

	log.Printf("🚀 Go Delivery Queue Service starting on port %s", port)

	// 启动服务器
	if err := r.Run(":" + port); err != nil {
		log.Fatalf("Failed to start server: %v", err)
	}
}
