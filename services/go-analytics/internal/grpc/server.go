package grpc

import (
	"google.golang.org/grpc"

	"github.com/thinkus/go-analytics/internal/services"
	pb "github.com/thinkus/go-analytics/pkg/proto/analytics"
)

// NewServer creates a new gRPC server with all services registered
func NewServer() *grpc.Server {
	server := grpc.NewServer()

	// Create service instances
	analyticsService := services.NewAnalyticsService()
	realtimeService := services.NewRealtimeService()

	// Register gRPC services
	pb.RegisterAnalyticsServiceServer(server, NewAnalyticsServicer(analyticsService))
	pb.RegisterRealtimeServiceServer(server, NewRealtimeServicer(realtimeService))

	return server
}
