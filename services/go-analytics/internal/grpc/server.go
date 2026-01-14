package grpc

import (
	"google.golang.org/grpc"

	"github.com/thinkus/go-analytics/internal/services"
)

// NewServer creates a new gRPC server with all services registered
func NewServer() *grpc.Server {
	server := grpc.NewServer()

	// Register services
	// Note: These will be registered after proto generation
	// pb.RegisterAnalyticsServiceServer(server, services.NewAnalyticsService())
	// pb.RegisterRealtimeServiceServer(server, services.NewRealtimeService())

	// For now, we'll use a placeholder
	_ = services.NewAnalyticsService()
	_ = services.NewRealtimeService()

	return server
}
