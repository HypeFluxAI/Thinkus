package main

import (
	"context"
	"log"
	"os"
	"os/signal"
	"syscall"
	"time"

	"github.com/gin-gonic/gin"

	"github.com/thinkus/go-ai-care/internal/api"
	"github.com/thinkus/go-ai-care/internal/care"
)

func main() {
	// 配置
	config := &care.Config{
		MongoURI:      getEnv("MONGODB_URI", "mongodb://localhost:27017"),
		MongoDB:       getEnv("MONGODB_DATABASE", "thinkus"),
		RedisURL:      getEnv("REDIS_URL", "redis://localhost:6379"),
		CheckInterval: time.Minute * 5, // 每5分钟检查一次
		BatchSize:     100,
	}

	// 创建服务
	service := care.NewService(config)

	// 连接数据库
	ctx := context.Background()
	if err := service.Connect(ctx); err != nil {
		log.Fatalf("Failed to connect: %v", err)
	}
	defer service.Disconnect(ctx)

	// 启动定时检查
	service.Start()

	// 创建 Gin 引擎
	if getEnv("GIN_MODE", "debug") == "release" {
		gin.SetMode(gin.ReleaseMode)
	}
	r := gin.Default()

	// 设置路由
	handler := api.NewHandler(service)
	handler.SetupRoutes(r)

	// 启动服务器
	port := getEnv("PORT", "8003")
	go func() {
		log.Printf("AI Care service starting on port %s", port)
		if err := r.Run(":" + port); err != nil {
			log.Fatalf("Failed to start server: %v", err)
		}
	}()

	// 等待退出信号
	quit := make(chan os.Signal, 1)
	signal.Notify(quit, syscall.SIGINT, syscall.SIGTERM)
	<-quit

	log.Println("Shutting down AI Care service...")
	service.Stop()
}

func getEnv(key, defaultValue string) string {
	if value := os.Getenv(key); value != "" {
		return value
	}
	return defaultValue
}
