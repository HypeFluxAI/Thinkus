package services

import (
	"context"
	"time"

	"go.mongodb.org/mongo-driver/bson"
	"go.mongodb.org/mongo-driver/bson/primitive"
	"go.mongodb.org/mongo-driver/mongo"

	"github.com/thinkus/go-analytics/internal/db"
)

// AnalyticsEvent represents an analytics event document
type AnalyticsEvent struct {
	ID        primitive.ObjectID     `bson:"_id,omitempty"`
	ProjectID primitive.ObjectID     `bson:"projectId"`
	Event     string                 `bson:"event"`
	SessionID string                 `bson:"sessionId"`
	URL       string                 `bson:"url,omitempty"`
	Referrer  string                 `bson:"referrer,omitempty"`
	UserID    string                 `bson:"userId,omitempty"`
	Data      map[string]interface{} `bson:"data,omitempty"`
	Device    *Device                `bson:"device,omitempty"`
	Geo       *Geo                   `bson:"geo,omitempty"`
	Timestamp time.Time              `bson:"timestamp"`
}

// Device represents device information
type Device struct {
	Type    string `bson:"type"`
	OS      string `bson:"os,omitempty"`
	Browser string `bson:"browser,omitempty"`
}

// Geo represents geographic information
type Geo struct {
	Country  string `bson:"country,omitempty"`
	City     string `bson:"city,omitempty"`
	Timezone string `bson:"timezone,omitempty"`
}

// Period represents a time period
type Period struct {
	Start time.Time
	End   time.Time
}

// ProjectStats represents project statistics
type ProjectStats struct {
	Users      UserStats
	PageViews  PageViewStats
	Sessions   SessionStats
	Conversion ConversionStats
	Engagement EngagementStats
}

// UserStats represents user statistics
type UserStats struct {
	Total  int32
	New    int32
	Active int32
	Change float32
}

// PageViewStats represents page view statistics
type PageViewStats struct {
	Total  int32
	Change float32
}

// SessionStats represents session statistics
type SessionStats struct {
	Total       int32
	AvgDuration int32
	Change      float32
}

// ConversionStats represents conversion statistics
type ConversionStats struct {
	Rate   float32
	Change float32
}

// EngagementStats represents engagement statistics
type EngagementStats struct {
	BounceRate          float32
	AvgSessionDuration  int32
	PageViewsPerSession float32
}

// TrendData represents trend data point
type TrendData struct {
	Date  string
	Value int32
}

// FunnelStep represents a funnel step
type FunnelStep struct {
	Name    string
	Count   int32
	Rate    float32
	Dropoff float32
}

// PageView represents a page view count
type PageView struct {
	URL   string
	Views int32
}

// AnalyticsService implements analytics functionality
type AnalyticsService struct {
	collection *mongo.Collection
}

// NewAnalyticsService creates a new analytics service
func NewAnalyticsService() *AnalyticsService {
	return &AnalyticsService{
		collection: db.GetCollection("analyticsevents"),
	}
}

// Track records an analytics event
func (s *AnalyticsService) Track(ctx context.Context, event *AnalyticsEvent) (string, error) {
	event.Timestamp = time.Now()

	result, err := s.collection.InsertOne(ctx, event)
	if err != nil {
		return "", err
	}

	return result.InsertedID.(primitive.ObjectID).Hex(), nil
}

// TrackBatch records multiple analytics events
func (s *AnalyticsService) TrackBatch(ctx context.Context, events []*AnalyticsEvent) error {
	docs := make([]interface{}, len(events))
	now := time.Now()

	for i, event := range events {
		event.Timestamp = now
		docs[i] = event
	}

	_, err := s.collection.InsertMany(ctx, docs)
	return err
}

// GetStats returns project statistics for a period
func (s *AnalyticsService) GetStats(ctx context.Context, projectID string, period Period) (*ProjectStats, error) {
	pID, err := primitive.ObjectIDFromHex(projectID)
	if err != nil {
		return nil, err
	}

	// Calculate previous period for comparison
	periodLength := period.End.Sub(period.Start)
	prevPeriod := Period{
		Start: period.Start.Add(-periodLength),
		End:   period.Start,
	}

	// Get current period stats
	pageViews, err := s.countEvents(ctx, pID, period, "page_view")
	if err != nil {
		return nil, err
	}

	sessions, err := s.getUniqueSessions(ctx, pID, period)
	if err != nil {
		return nil, err
	}

	users, err := s.getUniqueUsers(ctx, pID, period)
	if err != nil {
		return nil, err
	}

	conversions, err := s.countEvents(ctx, pID, period, "conversion")
	if err != nil {
		return nil, err
	}

	// Get previous period stats for comparison
	prevPageViews, _ := s.countEvents(ctx, pID, prevPeriod, "page_view")
	prevSessions, _ := s.getUniqueSessions(ctx, pID, prevPeriod)
	prevUsers, _ := s.getUniqueUsers(ctx, pID, prevPeriod)
	prevConversions, _ := s.countEvents(ctx, pID, prevPeriod, "conversion")

	// Calculate engagement metrics
	engagement, err := s.calculateEngagement(ctx, pID, period)
	if err != nil {
		engagement = &EngagementStats{}
	}

	// Calculate conversion rate
	var conversionRate, prevConversionRate float32
	if sessions > 0 {
		conversionRate = float32(conversions) / float32(sessions) * 100
	}
	if prevSessions > 0 {
		prevConversionRate = float32(prevConversions) / float32(prevSessions) * 100
	}

	return &ProjectStats{
		Users: UserStats{
			Total:  int32(users),
			New:    int32(users),
			Active: int32(sessions),
			Change: calculateChange(float32(users), float32(prevUsers)),
		},
		PageViews: PageViewStats{
			Total:  int32(pageViews),
			Change: calculateChange(float32(pageViews), float32(prevPageViews)),
		},
		Sessions: SessionStats{
			Total:       int32(sessions),
			AvgDuration: engagement.AvgSessionDuration,
			Change:      calculateChange(float32(sessions), float32(prevSessions)),
		},
		Conversion: ConversionStats{
			Rate:   conversionRate,
			Change: calculateChange(conversionRate, prevConversionRate),
		},
		Engagement: *engagement,
	}, nil
}

// GetTrends returns trend data for a metric
func (s *AnalyticsService) GetTrends(ctx context.Context, projectID, metric string, period Period) ([]TrendData, error) {
	pID, err := primitive.ObjectIDFromHex(projectID)
	if err != nil {
		return nil, err
	}

	pipeline := mongo.Pipeline{
		{{Key: "$match", Value: bson.M{
			"projectId": pID,
			"timestamp": bson.M{"$gte": period.Start, "$lte": period.End},
		}}},
		{{Key: "$group", Value: bson.M{
			"_id": bson.M{
				"$dateToString": bson.M{"format": "%Y-%m-%d", "date": "$timestamp"},
			},
			"count": bson.M{"$sum": 1},
		}}},
		{{Key: "$sort", Value: bson.M{"_id": 1}}},
	}

	cursor, err := s.collection.Aggregate(ctx, pipeline)
	if err != nil {
		return nil, err
	}
	defer cursor.Close(ctx)

	var results []TrendData
	for cursor.Next(ctx) {
		var doc struct {
			ID    string `bson:"_id"`
			Count int32  `bson:"count"`
		}
		if err := cursor.Decode(&doc); err != nil {
			continue
		}
		results = append(results, TrendData{
			Date:  doc.ID,
			Value: doc.Count,
		})
	}

	return results, nil
}

// GetFunnel returns funnel data for steps
func (s *AnalyticsService) GetFunnel(ctx context.Context, projectID string, steps []string, period Period) ([]FunnelStep, error) {
	pID, err := primitive.ObjectIDFromHex(projectID)
	if err != nil {
		return nil, err
	}

	var funnelData []FunnelStep

	for i, step := range steps {
		count, err := s.countEvents(ctx, pID, period, step)
		if err != nil {
			count = 0
		}

		var prevCount int64
		if i > 0 {
			prevCount = int64(funnelData[i-1].Count)
		} else {
			prevCount = count
		}

		var rate, dropoff float32
		if prevCount > 0 {
			rate = float32(count) / float32(prevCount) * 100
			dropoff = 100 - rate
		}

		funnelData = append(funnelData, FunnelStep{
			Name:    step,
			Count:   int32(count),
			Rate:    rate,
			Dropoff: dropoff,
		})
	}

	return funnelData, nil
}

// GetTopPages returns top pages by views
func (s *AnalyticsService) GetTopPages(ctx context.Context, projectID string, period Period, limit int) ([]PageView, error) {
	pID, err := primitive.ObjectIDFromHex(projectID)
	if err != nil {
		return nil, err
	}

	pipeline := mongo.Pipeline{
		{{Key: "$match", Value: bson.M{
			"projectId": pID,
			"event":     "page_view",
			"timestamp": bson.M{"$gte": period.Start, "$lte": period.End},
		}}},
		{{Key: "$group", Value: bson.M{
			"_id":   "$url",
			"views": bson.M{"$sum": 1},
		}}},
		{{Key: "$sort", Value: bson.M{"views": -1}}},
		{{Key: "$limit", Value: limit}},
	}

	cursor, err := s.collection.Aggregate(ctx, pipeline)
	if err != nil {
		return nil, err
	}
	defer cursor.Close(ctx)

	var results []PageView
	for cursor.Next(ctx) {
		var doc struct {
			URL   string `bson:"_id"`
			Views int32  `bson:"views"`
		}
		if err := cursor.Decode(&doc); err != nil {
			continue
		}
		results = append(results, PageView{
			URL:   doc.URL,
			Views: doc.Views,
		})
	}

	return results, nil
}

// GenerateTrackingScript generates the tracking script for a project
func (s *AnalyticsService) GenerateTrackingScript(projectID string) string {
	return `<!-- Thinkus Analytics -->
<script>
(function() {
  var THINKUS_PROJECT_ID = '` + projectID + `';
  var THINKUS_API = 'https://analytics.thinkus.ai';
  var SESSION_ID = 'ts_' + Date.now() + '_' + Math.random().toString(36).slice(2);

  function getDeviceType() {
    var ua = navigator.userAgent;
    if (/mobile/i.test(ua)) return 'mobile';
    if (/tablet/i.test(ua)) return 'tablet';
    return 'desktop';
  }

  function track(event, data) {
    var payload = {
      projectId: THINKUS_PROJECT_ID,
      event: event,
      sessionId: SESSION_ID,
      url: location.href,
      referrer: document.referrer,
      data: data || {},
      device: { type: getDeviceType() },
      timestamp: Date.now()
    };

    if (navigator.sendBeacon) {
      navigator.sendBeacon(THINKUS_API + '/track', JSON.stringify(payload));
    } else {
      fetch(THINKUS_API + '/track', {
        method: 'POST',
        body: JSON.stringify(payload),
        keepalive: true
      });
    }
  }

  track('page_view');
  window.thinkusTrack = track;

  window.addEventListener('beforeunload', function() {
    track('session_end');
  });
})();
</script>
<!-- End Thinkus Analytics -->`
}

// Helper functions

func (s *AnalyticsService) countEvents(ctx context.Context, projectID primitive.ObjectID, period Period, event string) (int64, error) {
	filter := bson.M{
		"projectId": projectID,
		"event":     event,
		"timestamp": bson.M{"$gte": period.Start, "$lte": period.End},
	}
	return s.collection.CountDocuments(ctx, filter)
}

func (s *AnalyticsService) getUniqueSessions(ctx context.Context, projectID primitive.ObjectID, period Period) (int64, error) {
	pipeline := mongo.Pipeline{
		{{Key: "$match", Value: bson.M{
			"projectId": projectID,
			"timestamp": bson.M{"$gte": period.Start, "$lte": period.End},
		}}},
		{{Key: "$group", Value: bson.M{"_id": "$sessionId"}}},
		{{Key: "$count", Value: "count"}},
	}

	cursor, err := s.collection.Aggregate(ctx, pipeline)
	if err != nil {
		return 0, err
	}
	defer cursor.Close(ctx)

	var result struct {
		Count int64 `bson:"count"`
	}
	if cursor.Next(ctx) {
		cursor.Decode(&result)
	}

	return result.Count, nil
}

func (s *AnalyticsService) getUniqueUsers(ctx context.Context, projectID primitive.ObjectID, period Period) (int64, error) {
	pipeline := mongo.Pipeline{
		{{Key: "$match", Value: bson.M{
			"projectId": projectID,
			"timestamp": bson.M{"$gte": period.Start, "$lte": period.End},
		}}},
		{{Key: "$group", Value: bson.M{"_id": "$userId"}}},
		{{Key: "$count", Value: "count"}},
	}

	cursor, err := s.collection.Aggregate(ctx, pipeline)
	if err != nil {
		return 0, err
	}
	defer cursor.Close(ctx)

	var result struct {
		Count int64 `bson:"count"`
	}
	if cursor.Next(ctx) {
		cursor.Decode(&result)
	}

	return result.Count, nil
}

func (s *AnalyticsService) calculateEngagement(ctx context.Context, projectID primitive.ObjectID, period Period) (*EngagementStats, error) {
	pipeline := mongo.Pipeline{
		{{Key: "$match", Value: bson.M{
			"projectId": projectID,
			"timestamp": bson.M{"$gte": period.Start, "$lte": period.End},
		}}},
		{{Key: "$group", Value: bson.M{
			"_id":        "$sessionId",
			"pageViews":  bson.M{"$sum": bson.M{"$cond": bson.A{bson.M{"$eq": bson.A{"$event", "page_view"}}, 1, 0}}},
			"firstEvent": bson.M{"$min": "$timestamp"},
			"lastEvent":  bson.M{"$max": "$timestamp"},
		}}},
	}

	cursor, err := s.collection.Aggregate(ctx, pipeline)
	if err != nil {
		return nil, err
	}
	defer cursor.Close(ctx)

	var sessions []struct {
		PageViews  int32     `bson:"pageViews"`
		FirstEvent time.Time `bson:"firstEvent"`
		LastEvent  time.Time `bson:"lastEvent"`
	}

	for cursor.Next(ctx) {
		var s struct {
			PageViews  int32     `bson:"pageViews"`
			FirstEvent time.Time `bson:"firstEvent"`
			LastEvent  time.Time `bson:"lastEvent"`
		}
		if err := cursor.Decode(&s); err == nil {
			sessions = append(sessions, s)
		}
	}

	if len(sessions) == 0 {
		return &EngagementStats{}, nil
	}

	// Calculate metrics
	var bouncedSessions int
	var totalDuration int64
	var totalPageViews int32

	for _, s := range sessions {
		if s.PageViews <= 1 {
			bouncedSessions++
		}
		duration := s.LastEvent.Sub(s.FirstEvent).Seconds()
		totalDuration += int64(duration)
		totalPageViews += s.PageViews
	}

	sessionCount := len(sessions)
	bounceRate := float32(bouncedSessions) / float32(sessionCount) * 100
	avgSessionDuration := int32(totalDuration / int64(sessionCount))
	pageViewsPerSession := float32(totalPageViews) / float32(sessionCount)

	return &EngagementStats{
		BounceRate:          bounceRate,
		AvgSessionDuration:  avgSessionDuration,
		PageViewsPerSession: pageViewsPerSession,
	}, nil
}

func calculateChange(current, previous float32) float32 {
	if previous == 0 {
		if current > 0 {
			return 100
		}
		return 0
	}
	return (current - previous) / previous * 100
}
