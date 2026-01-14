package grpc

import (
	"google.golang.org/grpc"

	"github.com/thinkus/go-sandbox/internal/services"
)

// NewServer creates a new gRPC server with all services registered
func NewServer() *grpc.Server {
	server := grpc.NewServer()

	// Register services
	// Note: These will be registered after proto generation
	// pb.RegisterSandboxServiceServer(server, services.NewSandboxService())

	// For now, we'll use a placeholder
	_ = services.NewSandboxService()

	return server
}
