package main

import (
	"context"
	"fmt"
	"log"
	"net"
	"os"
	"os/signal"
	"syscall"

	"github.com/thinkus/go-analytics/internal/config"
	"github.com/thinkus/go-analytics/internal/db"
	"github.com/thinkus/go-analytics/internal/grpc"
)

func main() {
	// Load configuration
	cfg := config.Load()

	// Initialize MongoDB
	ctx := context.Background()
	if err := db.InitMongoDB(ctx, cfg.MongoDBURI); err != nil {
		log.Fatalf("Failed to connect to MongoDB: %v", err)
	}
	defer db.CloseMongoDB(ctx)

	// Initialize Redis
	if err := db.InitRedis(cfg.RedisURL); err != nil {
		log.Fatalf("Failed to connect to Redis: %v", err)
	}
	defer db.CloseRedis()

	// Start gRPC server
	lis, err := net.Listen("tcp", fmt.Sprintf(":%d", cfg.GRPCPort))
	if err != nil {
		log.Fatalf("Failed to listen: %v", err)
	}

	server := grpc.NewServer()
	go func() {
		log.Printf("gRPC server listening on port %d", cfg.GRPCPort)
		if err := server.Serve(lis); err != nil {
			log.Fatalf("Failed to serve: %v", err)
		}
	}()

	// Graceful shutdown
	quit := make(chan os.Signal, 1)
	signal.Notify(quit, syscall.SIGINT, syscall.SIGTERM)
	<-quit

	log.Println("Shutting down server...")
	server.GracefulStop()
	log.Println("Server stopped")
}
