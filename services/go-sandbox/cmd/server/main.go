package main

import (
	"context"
	"fmt"
	"log"
	"net"
	"os"
	"os/signal"
	"syscall"

	"github.com/thinkus/go-sandbox/internal/config"
	"github.com/thinkus/go-sandbox/internal/docker"
	"github.com/thinkus/go-sandbox/internal/grpc"
)

func main() {
	// Load configuration
	cfg := config.Load()

	// Initialize Docker client
	if err := docker.InitClient(); err != nil {
		log.Fatalf("Failed to initialize Docker client: %v", err)
	}

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

	// Start sandbox cleanup goroutine
	ctx, cancel := context.WithCancel(context.Background())
	go docker.StartCleanupWorker(ctx)

	// Graceful shutdown
	quit := make(chan os.Signal, 1)
	signal.Notify(quit, syscall.SIGINT, syscall.SIGTERM)
	<-quit

	log.Println("Shutting down server...")
	cancel()
	server.GracefulStop()
	docker.CloseClient()
	log.Println("Server stopped")
}
