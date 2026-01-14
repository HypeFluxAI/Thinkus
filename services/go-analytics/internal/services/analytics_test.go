package services

import (
	"context"
	"testing"
	"time"

	"go.mongodb.org/mongo-driver/bson/primitive"
)

// TestAnalyticsEvent tests event struct creation
func TestAnalyticsEventCreation(t *testing.T) {
	projectID := primitive.NewObjectID()
	event := &AnalyticsEvent{
		ProjectID: projectID,
		Event:     "page_view",
		SessionID: "session123",
		URL:       "https://example.com/home",
		Referrer:  "https://google.com",
		UserID:    "user123",
		Data:      map[string]interface{}{"button": "signup"},
		Device:    &Device{Type: "desktop", OS: "macOS", Browser: "Chrome"},
		Geo:       &Geo{Country: "US", City: "San Francisco", Timezone: "America/Los_Angeles"},
		Timestamp: time.Now(),
	}

	if event.Event != "page_view" {
		t.Errorf("Expected event 'page_view', got '%s'", event.Event)
	}

	if event.SessionID != "session123" {
		t.Errorf("Expected sessionID 'session123', got '%s'", event.SessionID)
	}

	if event.Device.Type != "desktop" {
		t.Errorf("Expected device type 'desktop', got '%s'", event.Device.Type)
	}
}

// TestDeviceStruct tests Device struct
func TestDeviceStruct(t *testing.T) {
	tests := []struct {
		name     string
		device   Device
		expected string
	}{
		{"Desktop", Device{Type: "desktop", OS: "Windows", Browser: "Firefox"}, "desktop"},
		{"Mobile", Device{Type: "mobile", OS: "iOS", Browser: "Safari"}, "mobile"},
		{"Tablet", Device{Type: "tablet", OS: "Android", Browser: "Chrome"}, "tablet"},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			if tt.device.Type != tt.expected {
				t.Errorf("Expected device type '%s', got '%s'", tt.expected, tt.device.Type)
			}
		})
	}
}

// TestGeoStruct tests Geo struct
func TestGeoStruct(t *testing.T) {
	geo := &Geo{
		Country:  "CN",
		City:     "Beijing",
		Timezone: "Asia/Shanghai",
	}

	if geo.Country != "CN" {
		t.Errorf("Expected country 'CN', got '%s'", geo.Country)
	}

	if geo.City != "Beijing" {
		t.Errorf("Expected city 'Beijing', got '%s'", geo.City)
	}
}

// TestPeriodStruct tests Period struct
func TestPeriodStruct(t *testing.T) {
	now := time.Now()
	period := Period{
		Start: now.Add(-24 * time.Hour),
		End:   now,
	}

	if period.End.Before(period.Start) {
		t.Error("End time should be after start time")
	}

	duration := period.End.Sub(period.Start)
	if duration != 24*time.Hour {
		t.Errorf("Expected duration of 24 hours, got %v", duration)
	}
}

// TestProjectStatsStruct tests ProjectStats struct
func TestProjectStatsStruct(t *testing.T) {
	stats := &ProjectStats{
		Users: UserStats{
			Total:  1000,
			New:    100,
			Active: 500,
			Change: 5.5,
		},
		PageViews: PageViewStats{
			Total:  5000,
			Change: 10.2,
		},
		Sessions: SessionStats{
			Total:       2000,
			AvgDuration: 180,
			Change:      3.1,
		},
		Conversion: ConversionStats{
			Rate:   2.5,
			Change: 0.5,
		},
		Engagement: EngagementStats{
			BounceRate:          45.0,
			AvgSessionDuration:  180,
			PageViewsPerSession: 2.5,
		},
	}

	if stats.Users.Total != 1000 {
		t.Errorf("Expected 1000 total users, got %d", stats.Users.Total)
	}

	if stats.Conversion.Rate != 2.5 {
		t.Errorf("Expected conversion rate 2.5, got %f", stats.Conversion.Rate)
	}
}

// TestTrendData tests TrendData struct
func TestTrendData(t *testing.T) {
	trends := []TrendData{
		{Date: "2024-01-01", Value: 100},
		{Date: "2024-01-02", Value: 120},
		{Date: "2024-01-03", Value: 150},
	}

	if len(trends) != 3 {
		t.Errorf("Expected 3 trend data points, got %d", len(trends))
	}

	if trends[2].Value != 150 {
		t.Errorf("Expected value 150 for last data point, got %d", trends[2].Value)
	}
}

// TestFunnelStep tests FunnelStep struct
func TestFunnelStep(t *testing.T) {
	steps := []FunnelStep{
		{Name: "visit", Count: 1000, Rate: 100, Dropoff: 0},
		{Name: "signup", Count: 200, Rate: 20, Dropoff: 80},
		{Name: "purchase", Count: 50, Rate: 25, Dropoff: 75},
	}

	if steps[0].Count != 1000 {
		t.Errorf("Expected 1000 visits, got %d", steps[0].Count)
	}

	if steps[1].Dropoff != 80 {
		t.Errorf("Expected 80%% dropoff at signup, got %f", steps[1].Dropoff)
	}
}

// TestPageView tests PageView struct
func TestPageView(t *testing.T) {
	pages := []PageView{
		{URL: "/home", Views: 500},
		{URL: "/products", Views: 300},
		{URL: "/about", Views: 100},
	}

	if pages[0].URL != "/home" {
		t.Errorf("Expected URL '/home', got '%s'", pages[0].URL)
	}

	totalViews := int32(0)
	for _, p := range pages {
		totalViews += p.Views
	}

	if totalViews != 900 {
		t.Errorf("Expected 900 total views, got %d", totalViews)
	}
}

// TestCalculateChange tests the calculateChange function
func TestCalculateChange(t *testing.T) {
	tests := []struct {
		name     string
		current  float32
		previous float32
		expected float32
	}{
		{"Positive change", 120, 100, 20},
		{"Negative change", 80, 100, -20},
		{"No change", 100, 100, 0},
		{"From zero (current > 0)", 100, 0, 100},
		{"From zero (current = 0)", 0, 0, 0},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			result := calculateChange(tt.current, tt.previous)
			if result != tt.expected {
				t.Errorf("calculateChange(%f, %f) = %f; want %f", tt.current, tt.previous, result, tt.expected)
			}
		})
	}
}

// TestGenerateTrackingScript tests tracking script generation
func TestGenerateTrackingScript(t *testing.T) {
	service := &AnalyticsService{}
	projectID := "test123"

	script := service.GenerateTrackingScript(projectID)

	if script == "" {
		t.Error("Expected non-empty tracking script")
	}

	if !contains(script, projectID) {
		t.Error("Script should contain project ID")
	}

	if !contains(script, "thinkusTrack") {
		t.Error("Script should define thinkusTrack function")
	}

	if !contains(script, "page_view") {
		t.Error("Script should track page_view event")
	}
}

// TestTrackingScriptHasRequiredElements tests script elements
func TestTrackingScriptHasRequiredElements(t *testing.T) {
	service := &AnalyticsService{}
	script := service.GenerateTrackingScript("project123")

	requiredElements := []string{
		"THINKUS_PROJECT_ID",
		"THINKUS_API",
		"SESSION_ID",
		"getDeviceType",
		"navigator.sendBeacon",
		"beforeunload",
	}

	for _, elem := range requiredElements {
		if !contains(script, elem) {
			t.Errorf("Script should contain '%s'", elem)
		}
	}
}

// Helper function
func contains(s, substr string) bool {
	return len(s) >= len(substr) && (s == substr || len(s) > 0 && containsHelper(s, substr))
}

func containsHelper(s, substr string) bool {
	for i := 0; i <= len(s)-len(substr); i++ {
		if s[i:i+len(substr)] == substr {
			return true
		}
	}
	return false
}

// Benchmark tests
func BenchmarkCalculateChange(b *testing.B) {
	for i := 0; i < b.N; i++ {
		calculateChange(120, 100)
	}
}

func BenchmarkGenerateTrackingScript(b *testing.B) {
	service := &AnalyticsService{}
	for i := 0; i < b.N; i++ {
		service.GenerateTrackingScript("project123")
	}
}

// Integration-ready tests (require mocked DB)
func TestNewAnalyticsService(t *testing.T) {
	// This test would require a mock MongoDB connection
	// Skip in unit test, run in integration test
	t.Skip("Requires MongoDB connection - run as integration test")
}

func TestTrack(t *testing.T) {
	// This test would require a mock MongoDB connection
	t.Skip("Requires MongoDB connection - run as integration test")
}

func TestGetStats(t *testing.T) {
	// This test would require a mock MongoDB connection
	t.Skip("Requires MongoDB connection - run as integration test")
}

func TestGetTrends(t *testing.T) {
	// This test would require a mock MongoDB connection
	t.Skip("Requires MongoDB connection - run as integration test")
}

func TestGetFunnel(t *testing.T) {
	// This test would require a mock MongoDB connection
	t.Skip("Requires MongoDB connection - run as integration test")
}

func TestGetTopPages(t *testing.T) {
	// This test would require a mock MongoDB connection
	t.Skip("Requires MongoDB connection - run as integration test")
}

// Validation tests
func TestValidProjectID(t *testing.T) {
	validIDs := []string{
		"507f1f77bcf86cd799439011",
		"507f191e810c19729de860ea",
	}

	for _, id := range validIDs {
		_, err := primitive.ObjectIDFromHex(id)
		if err != nil {
			t.Errorf("Expected valid ObjectID for '%s', got error: %v", id, err)
		}
	}

	invalidIDs := []string{
		"invalid",
		"123",
		"",
	}

	for _, id := range invalidIDs {
		_, err := primitive.ObjectIDFromHex(id)
		if err == nil {
			t.Errorf("Expected error for invalid ObjectID '%s'", id)
		}
	}
}

// Context timeout test
func TestContextTimeout(t *testing.T) {
	ctx, cancel := context.WithTimeout(context.Background(), 1*time.Millisecond)
	defer cancel()

	time.Sleep(2 * time.Millisecond)

	select {
	case <-ctx.Done():
		// Expected
	default:
		t.Error("Context should have timed out")
	}
}
