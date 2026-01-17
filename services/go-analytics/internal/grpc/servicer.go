package grpc

import (
	"context"
	"encoding/json"
	"time"

	"go.mongodb.org/mongo-driver/bson/primitive"

	"github.com/thinkus/go-analytics/internal/services"
	pb "github.com/thinkus/go-analytics/pkg/proto/analytics"
	common "github.com/thinkus/go-analytics/pkg/proto/common"
)

// AnalyticsServicer implements the gRPC AnalyticsService interface
type AnalyticsServicer struct {
	pb.UnimplementedAnalyticsServiceServer
	service *services.AnalyticsService
}

// NewAnalyticsServicer creates a new AnalyticsServicer
func NewAnalyticsServicer(svc *services.AnalyticsService) *AnalyticsServicer {
	return &AnalyticsServicer{service: svc}
}

// Track records a single analytics event
func (s *AnalyticsServicer) Track(ctx context.Context, req *pb.TrackRequest) (*pb.TrackResponse, error) {
	projectID, err := primitive.ObjectIDFromHex(req.ProjectId)
	if err != nil {
		return nil, err
	}

	event := &services.AnalyticsEvent{
		ProjectID: projectID,
		Event:     req.Event,
		SessionID: req.SessionId,
		URL:       req.Url,
		Referrer:  req.Referrer,
		UserID:    req.UserId,
		Data:      convertMapStringString(req.Data),
	}

	if req.Device != nil {
		event.Device = &services.Device{
			Type:    req.Device.Type,
			OS:      req.Device.Os,
			Browser: req.Device.Browser,
		}
	}

	if req.Geo != nil {
		event.Geo = &services.Geo{
			Country:  req.Geo.Country,
			City:     req.Geo.City,
			Timezone: req.Geo.Timezone,
		}
	}

	eventID, err := s.service.Track(ctx, event)
	if err != nil {
		return nil, err
	}

	return &pb.TrackResponse{EventId: eventID}, nil
}

// TrackBatch records multiple analytics events
func (s *AnalyticsServicer) TrackBatch(ctx context.Context, req *pb.TrackBatchRequest) (*common.Empty, error) {
	events := make([]*services.AnalyticsEvent, len(req.Events))

	for i, e := range req.Events {
		projectID, err := primitive.ObjectIDFromHex(e.ProjectId)
		if err != nil {
			continue
		}

		event := &services.AnalyticsEvent{
			ProjectID: projectID,
			Event:     e.Event,
			SessionID: e.SessionId,
			URL:       e.Url,
			Referrer:  e.Referrer,
			UserID:    e.UserId,
			Data:      convertMapStringString(e.Data),
		}

		if e.Device != nil {
			event.Device = &services.Device{
				Type:    e.Device.Type,
				OS:      e.Device.Os,
				Browser: e.Device.Browser,
			}
		}

		if e.Geo != nil {
			event.Geo = &services.Geo{
				Country:  e.Geo.Country,
				City:     e.Geo.City,
				Timezone: e.Geo.Timezone,
			}
		}

		events[i] = event
	}

	err := s.service.TrackBatch(ctx, events)
	if err != nil {
		return nil, err
	}

	return &common.Empty{}, nil
}

// GetStats returns project statistics
func (s *AnalyticsServicer) GetStats(ctx context.Context, req *pb.GetStatsRequest) (*pb.ProjectStats, error) {
	period := services.Period{
		Start: time.Unix(req.Period.Start, 0),
		End:   time.Unix(req.Period.End, 0),
	}

	stats, err := s.service.GetStats(ctx, req.ProjectId, period)
	if err != nil {
		return nil, err
	}

	return &pb.ProjectStats{
		Users: &pb.UserStats{
			Total:  stats.Users.Total,
			New:    stats.Users.New,
			Active: stats.Users.Active,
			Change: stats.Users.Change,
		},
		PageViews: &pb.PageViewStats{
			Total:  stats.PageViews.Total,
			Change: stats.PageViews.Change,
		},
		Sessions: &pb.SessionStats{
			Total:       stats.Sessions.Total,
			AvgDuration: stats.Sessions.AvgDuration,
			Change:      stats.Sessions.Change,
		},
		Conversion: &pb.ConversionStats{
			Rate:   stats.Conversion.Rate,
			Change: stats.Conversion.Change,
		},
		Engagement: &pb.EngagementStats{
			BounceRate:          stats.Engagement.BounceRate,
			AvgSessionDuration:  stats.Engagement.AvgSessionDuration,
			PageViewsPerSession: stats.Engagement.PageViewsPerSession,
		},
	}, nil
}

// GetTrends returns trend data for a metric
func (s *AnalyticsServicer) GetTrends(ctx context.Context, req *pb.GetTrendsRequest) (*pb.TrendResponse, error) {
	period := services.Period{
		Start: time.Unix(req.Period.Start, 0),
		End:   time.Unix(req.Period.End, 0),
	}

	trends, err := s.service.GetTrends(ctx, req.ProjectId, req.Metric, period)
	if err != nil {
		return nil, err
	}

	data := make([]*pb.TrendData, len(trends))
	for i, t := range trends {
		data[i] = &pb.TrendData{
			Date:  t.Date,
			Value: t.Value,
		}
	}

	return &pb.TrendResponse{Data: data}, nil
}

// GetFunnel returns funnel analysis data
func (s *AnalyticsServicer) GetFunnel(ctx context.Context, req *pb.GetFunnelRequest) (*pb.FunnelResponse, error) {
	period := services.Period{
		Start: time.Unix(req.Period.Start, 0),
		End:   time.Unix(req.Period.End, 0),
	}

	funnel, err := s.service.GetFunnel(ctx, req.ProjectId, req.Steps, period)
	if err != nil {
		return nil, err
	}

	steps := make([]*pb.FunnelStep, len(funnel))
	for i, f := range funnel {
		steps[i] = &pb.FunnelStep{
			Name:    f.Name,
			Count:   f.Count,
			Rate:    f.Rate,
			Dropoff: f.Dropoff,
		}
	}

	return &pb.FunnelResponse{Steps: steps}, nil
}

// GetTopPages returns top pages by views
func (s *AnalyticsServicer) GetTopPages(ctx context.Context, req *pb.GetTopPagesRequest) (*pb.TopPagesResponse, error) {
	period := services.Period{
		Start: time.Unix(req.Period.Start, 0),
		End:   time.Unix(req.Period.End, 0),
	}

	pages, err := s.service.GetTopPages(ctx, req.ProjectId, period, int(req.Limit))
	if err != nil {
		return nil, err
	}

	result := make([]*pb.PageView, len(pages))
	for i, p := range pages {
		result[i] = &pb.PageView{
			Url:   p.URL,
			Views: p.Views,
		}
	}

	return &pb.TopPagesResponse{Pages: result}, nil
}

// GenerateTrackingScript generates the tracking script
func (s *AnalyticsServicer) GenerateTrackingScript(ctx context.Context, req *pb.ScriptRequest) (*pb.ScriptResponse, error) {
	script := s.service.GenerateTrackingScript(req.ProjectId)
	return &pb.ScriptResponse{Script: script}, nil
}

// RealtimeServicer implements the gRPC RealtimeService interface
type RealtimeServicer struct {
	pb.UnimplementedRealtimeServiceServer
	service *services.RealtimeService
}

// NewRealtimeServicer creates a new RealtimeServicer
func NewRealtimeServicer(svc *services.RealtimeService) *RealtimeServicer {
	return &RealtimeServicer{service: svc}
}

// Subscribe subscribes to real-time events for a project
func (s *RealtimeServicer) Subscribe(req *pb.SubscribeRequest, stream pb.RealtimeService_SubscribeServer) error {
	subscriber, err := s.service.Subscribe(req.ProjectId)
	if err != nil {
		return err
	}
	defer s.service.Unsubscribe(req.ProjectId, subscriber.ID)

	for event := range subscriber.Channel {
		pbEvent := &pb.StreamEvent{
			Type:      string(event.Type),
			ProjectId: event.ProjectID,
			Timestamp: event.Timestamp,
			Payload:   event.Payload,
		}

		if err := stream.Send(pbEvent); err != nil {
			return err
		}
	}

	return nil
}

// Push pushes an event to subscribers
func (s *RealtimeServicer) Push(ctx context.Context, req *pb.PushEventRequest) (*common.Empty, error) {
	event := &services.StreamEvent{
		Type:      services.StreamEventType(req.Type),
		ProjectID: req.ProjectId,
		Payload:   json.RawMessage(req.Payload),
	}

	if err := s.service.Push(event); err != nil {
		return nil, err
	}

	return &common.Empty{}, nil
}

// Helper function to convert map[string]string to map[string]interface{}
func convertMapStringString(m map[string]string) map[string]interface{} {
	result := make(map[string]interface{})
	for k, v := range m {
		result[k] = v
	}
	return result
}
