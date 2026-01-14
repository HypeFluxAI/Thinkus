package services

import (
	"encoding/json"
	"sync"
	"testing"
	"time"
)

// TestStreamEventTypes tests event type constants
func TestStreamEventTypes(t *testing.T) {
	tests := []struct {
		eventType StreamEventType
		expected  string
	}{
		{EventCodeChange, "code_change"},
		{EventTerminalOutput, "terminal_output"},
		{EventAgentStatus, "agent_status"},
		{EventProgress, "progress"},
		{EventPreviewUpdate, "preview_update"},
		{EventError, "error"},
		{EventMessage, "message"},
	}

	for _, tt := range tests {
		if string(tt.eventType) != tt.expected {
			t.Errorf("Expected event type '%s', got '%s'", tt.expected, string(tt.eventType))
		}
	}
}

// TestStreamEventCreation tests StreamEvent struct creation
func TestStreamEventCreation(t *testing.T) {
	payload, _ := json.Marshal(map[string]interface{}{
		"file":    "main.go",
		"content": "package main",
	})

	event := &StreamEvent{
		Type:      EventCodeChange,
		ProjectID: "project123",
		Timestamp: time.Now().UnixMilli(),
		Payload:   payload,
	}

	if event.Type != EventCodeChange {
		t.Errorf("Expected type 'code_change', got '%s'", event.Type)
	}

	if event.ProjectID != "project123" {
		t.Errorf("Expected projectID 'project123', got '%s'", event.ProjectID)
	}
}

// TestSubscriberCreation tests Subscriber struct
func TestSubscriberCreation(t *testing.T) {
	subscriber := &Subscriber{
		ID:        "sub123",
		ProjectID: "project123",
		Channel:   make(chan *StreamEvent, 100),
	}

	if subscriber.ID != "sub123" {
		t.Errorf("Expected ID 'sub123', got '%s'", subscriber.ID)
	}

	if cap(subscriber.Channel) != 100 {
		t.Errorf("Expected channel capacity 100, got %d", cap(subscriber.Channel))
	}
}

// TestRealtimeServiceCreation tests NewRealtimeService
func TestRealtimeServiceCreation(t *testing.T) {
	// Note: This will start Redis subscription goroutine
	// In production tests, mock Redis
	t.Skip("Requires Redis connection - run as integration test")
}

// TestSubscribeUnsubscribe tests subscribe and unsubscribe flow
func TestSubscribeUnsubscribe(t *testing.T) {
	service := &RealtimeService{
		subscribers: make(map[string]map[string]*Subscriber),
		eventBuffer: make(map[string][]*StreamEvent),
		bufferSize:  100,
	}

	// Subscribe
	projectID := "project123"
	sub, err := service.Subscribe(projectID)

	if err != nil {
		t.Fatalf("Subscribe failed: %v", err)
	}

	if sub == nil {
		t.Fatal("Expected non-nil subscriber")
	}

	if sub.ProjectID != projectID {
		t.Errorf("Expected projectID '%s', got '%s'", projectID, sub.ProjectID)
	}

	// Check subscriber is registered
	if len(service.subscribers[projectID]) != 1 {
		t.Errorf("Expected 1 subscriber, got %d", len(service.subscribers[projectID]))
	}

	// Unsubscribe
	service.Unsubscribe(projectID, sub.ID)

	// Check subscriber is removed
	if len(service.subscribers[projectID]) != 0 {
		t.Errorf("Expected 0 subscribers after unsubscribe, got %d", len(service.subscribers[projectID]))
	}
}

// TestMultipleSubscribers tests multiple subscribers
func TestMultipleSubscribers(t *testing.T) {
	service := &RealtimeService{
		subscribers: make(map[string]map[string]*Subscriber),
		eventBuffer: make(map[string][]*StreamEvent),
		bufferSize:  100,
	}

	projectID := "project123"

	// Subscribe multiple
	sub1, _ := service.Subscribe(projectID)
	sub2, _ := service.Subscribe(projectID)
	sub3, _ := service.Subscribe(projectID)

	if len(service.subscribers[projectID]) != 3 {
		t.Errorf("Expected 3 subscribers, got %d", len(service.subscribers[projectID]))
	}

	// Unsubscribe one
	service.Unsubscribe(projectID, sub2.ID)

	if len(service.subscribers[projectID]) != 2 {
		t.Errorf("Expected 2 subscribers after unsubscribe, got %d", len(service.subscribers[projectID]))
	}

	// Cleanup
	service.Unsubscribe(projectID, sub1.ID)
	service.Unsubscribe(projectID, sub3.ID)
}

// TestEventBuffering tests event buffering
func TestEventBuffering(t *testing.T) {
	service := &RealtimeService{
		subscribers: make(map[string]map[string]*Subscriber),
		eventBuffer: make(map[string][]*StreamEvent),
		bufferSize:  5, // Small buffer for testing
	}

	projectID := "project123"

	// Add events
	for i := 0; i < 10; i++ {
		event := &StreamEvent{
			Type:      EventMessage,
			ProjectID: projectID,
			Timestamp: time.Now().UnixMilli(),
		}
		service.bufferEvent(event)
	}

	// Check buffer is trimmed
	if len(service.eventBuffer[projectID]) != 5 {
		t.Errorf("Expected buffer size 5, got %d", len(service.eventBuffer[projectID]))
	}
}

// TestGetEventHistory tests getting event history
func TestGetEventHistory(t *testing.T) {
	service := &RealtimeService{
		subscribers: make(map[string]map[string]*Subscriber),
		eventBuffer: make(map[string][]*StreamEvent),
		bufferSize:  100,
	}

	projectID := "project123"

	// Add some events
	for i := 0; i < 20; i++ {
		event := &StreamEvent{
			Type:      EventMessage,
			ProjectID: projectID,
			Timestamp: int64(i),
		}
		service.bufferEvent(event)
	}

	// Get history with limit
	history := service.GetEventHistory(projectID, 5)

	if len(history) != 5 {
		t.Errorf("Expected 5 events, got %d", len(history))
	}

	// Should get last 5 events
	if history[0].Timestamp != 15 {
		t.Errorf("Expected first event timestamp 15, got %d", history[0].Timestamp)
	}
}

// TestGetEventHistorySmallBuffer tests history with small buffer
func TestGetEventHistorySmallBuffer(t *testing.T) {
	service := &RealtimeService{
		subscribers: make(map[string]map[string]*Subscriber),
		eventBuffer: make(map[string][]*StreamEvent),
		bufferSize:  100,
	}

	projectID := "project123"

	// Add only 3 events
	for i := 0; i < 3; i++ {
		event := &StreamEvent{
			Type:      EventMessage,
			ProjectID: projectID,
		}
		service.bufferEvent(event)
	}

	// Request more than available
	history := service.GetEventHistory(projectID, 10)

	if len(history) != 3 {
		t.Errorf("Expected 3 events, got %d", len(history))
	}
}

// TestDeliverEvent tests event delivery to subscribers
func TestDeliverEvent(t *testing.T) {
	service := &RealtimeService{
		subscribers: make(map[string]map[string]*Subscriber),
		eventBuffer: make(map[string][]*StreamEvent),
		bufferSize:  100,
	}

	projectID := "project123"
	sub, _ := service.Subscribe(projectID)

	event := &StreamEvent{
		Type:      EventMessage,
		ProjectID: projectID,
		Timestamp: time.Now().UnixMilli(),
	}

	// Deliver event
	service.deliverEvent(event)

	// Check subscriber received event
	select {
	case received := <-sub.Channel:
		if received.Type != EventMessage {
			t.Errorf("Expected event type 'message', got '%s'", received.Type)
		}
	case <-time.After(100 * time.Millisecond):
		t.Error("Timeout waiting for event")
	}

	service.Unsubscribe(projectID, sub.ID)
}

// TestDeliverEventToMultipleSubscribers tests delivery to multiple subscribers
func TestDeliverEventToMultipleSubscribers(t *testing.T) {
	service := &RealtimeService{
		subscribers: make(map[string]map[string]*Subscriber),
		eventBuffer: make(map[string][]*StreamEvent),
		bufferSize:  100,
	}

	projectID := "project123"
	sub1, _ := service.Subscribe(projectID)
	sub2, _ := service.Subscribe(projectID)

	event := &StreamEvent{
		Type:      EventMessage,
		ProjectID: projectID,
	}

	service.deliverEvent(event)

	// Both subscribers should receive event
	var wg sync.WaitGroup
	wg.Add(2)

	go func() {
		defer wg.Done()
		select {
		case <-sub1.Channel:
		case <-time.After(100 * time.Millisecond):
			t.Error("Sub1 timeout")
		}
	}()

	go func() {
		defer wg.Done()
		select {
		case <-sub2.Channel:
		case <-time.After(100 * time.Millisecond):
			t.Error("Sub2 timeout")
		}
	}()

	wg.Wait()

	service.Unsubscribe(projectID, sub1.ID)
	service.Unsubscribe(projectID, sub2.ID)
}

// TestEventPayloadParsing tests payload JSON parsing
func TestEventPayloadParsing(t *testing.T) {
	payload, _ := json.Marshal(map[string]interface{}{
		"file":    "index.ts",
		"content": "console.log('hello')",
		"line":    42,
	})

	event := &StreamEvent{
		Type:      EventCodeChange,
		ProjectID: "project123",
		Payload:   payload,
	}

	var data map[string]interface{}
	err := json.Unmarshal(event.Payload, &data)

	if err != nil {
		t.Fatalf("Failed to unmarshal payload: %v", err)
	}

	if data["file"] != "index.ts" {
		t.Errorf("Expected file 'index.ts', got '%v'", data["file"])
	}

	if int(data["line"].(float64)) != 42 {
		t.Errorf("Expected line 42, got %v", data["line"])
	}
}

// TestGenerateID tests ID generation
func TestGenerateID(t *testing.T) {
	id1 := generateID()

	if id1 == "" {
		t.Error("Generated ID should not be empty")
	}

	// IDs might be same if generated very quickly, but should have proper format
	if len(id1) < 10 {
		t.Errorf("Generated ID too short: %s", id1)
	}

	// Wait a bit to ensure different IDs
	time.Sleep(time.Millisecond)
	id2 := generateID()

	if id1 == id2 {
		t.Log("Warning: IDs might be same due to timing")
	}
}

// TestRandomString tests random string generation
func TestRandomString(t *testing.T) {
	str := randomString(8)

	if len(str) != 8 {
		t.Errorf("Expected string length 8, got %d", len(str))
	}

	// Check all characters are valid
	validChars := "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789"
	for _, c := range str {
		found := false
		for _, v := range validChars {
			if c == v {
				found = true
				break
			}
		}
		if !found {
			t.Errorf("Invalid character in random string: %c", c)
		}
	}
}

// TestConcurrentSubscription tests concurrent subscribe/unsubscribe
func TestConcurrentSubscription(t *testing.T) {
	service := &RealtimeService{
		subscribers: make(map[string]map[string]*Subscriber),
		eventBuffer: make(map[string][]*StreamEvent),
		bufferSize:  100,
	}

	projectID := "project123"
	var wg sync.WaitGroup

	// Concurrent subscribes
	for i := 0; i < 10; i++ {
		wg.Add(1)
		go func() {
			defer wg.Done()
			sub, _ := service.Subscribe(projectID)
			time.Sleep(time.Millisecond)
			service.Unsubscribe(projectID, sub.ID)
		}()
	}

	wg.Wait()

	// All should be unsubscribed
	if len(service.subscribers[projectID]) != 0 {
		t.Errorf("Expected 0 subscribers, got %d", len(service.subscribers[projectID]))
	}
}

// Benchmark tests
func BenchmarkSubscribe(b *testing.B) {
	service := &RealtimeService{
		subscribers: make(map[string]map[string]*Subscriber),
		eventBuffer: make(map[string][]*StreamEvent),
		bufferSize:  100,
	}

	for i := 0; i < b.N; i++ {
		sub, _ := service.Subscribe("project123")
		service.Unsubscribe("project123", sub.ID)
	}
}

func BenchmarkBufferEvent(b *testing.B) {
	service := &RealtimeService{
		subscribers: make(map[string]map[string]*Subscriber),
		eventBuffer: make(map[string][]*StreamEvent),
		bufferSize:  1000,
	}

	event := &StreamEvent{
		Type:      EventMessage,
		ProjectID: "project123",
	}

	for i := 0; i < b.N; i++ {
		service.bufferEvent(event)
	}
}

func BenchmarkDeliverEvent(b *testing.B) {
	service := &RealtimeService{
		subscribers: make(map[string]map[string]*Subscriber),
		eventBuffer: make(map[string][]*StreamEvent),
		bufferSize:  100,
	}

	// Add subscriber that drains channel
	sub, _ := service.Subscribe("project123")
	go func() {
		for range sub.Channel {
			// Drain
		}
	}()

	event := &StreamEvent{
		Type:      EventMessage,
		ProjectID: "project123",
	}

	for i := 0; i < b.N; i++ {
		service.deliverEvent(event)
	}

	service.Unsubscribe("project123", sub.ID)
}
