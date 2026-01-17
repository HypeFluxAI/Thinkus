package grpc

import (
	"google.golang.org/grpc"

	"github.com/thinkus/go-sandbox/internal/services"
	pb "github.com/thinkus/go-sandbox/pkg/proto/sandbox"
)

// NewServer creates a new gRPC server with all services registered
func NewServer() *grpc.Server {
	server := grpc.NewServer()

	// Create service instance
	sandboxService := services.NewSandboxService()

	// Register gRPC service
	pb.RegisterSandboxServiceServer(server, NewSandboxServicer(sandboxService))

	return server
}
