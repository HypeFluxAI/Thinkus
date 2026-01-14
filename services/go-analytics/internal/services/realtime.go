package services

import (
	"context"
	"encoding/json"
	"sync"
	"time"

	"github.com/thinkus/go-analytics/internal/db"
)

// StreamEventType represents the type of stream event
type StreamEventType string

const (
	EventCodeChange     StreamEventType = "code_change"
	EventTerminalOutput StreamEventType = "terminal_output"
	EventAgentStatus    StreamEventType = "agent_status"
	EventProgress       StreamEventType = "progress"
	EventPreviewUpdate  StreamEventType = "preview_update"
	EventError          StreamEventType = "error"
	EventMessage        StreamEventType = "message"
)

// StreamEvent represents a real-time stream event
type StreamEvent struct {
	Type      StreamEventType `json:"type"`
	ProjectID string          `json:"projectId"`
	Timestamp int64           `json:"timestamp"`
	Payload   json.RawMessage `json:"payload"`
}

// Subscriber represents a stream subscriber
type Subscriber struct {
	ID        string
	ProjectID string
	Channel   chan *StreamEvent
}

// RealtimeService handles real-time event streaming
type RealtimeService struct {
	subscribers map[string]map[string]*Subscriber // projectID -> subscriberID -> subscriber
	eventBuffer map[string][]*StreamEvent         // projectID -> events
	bufferSize  int
	mu          sync.RWMutex
}

// NewRealtimeService creates a new realtime service
func NewRealtimeService() *RealtimeService {
	service := &RealtimeService{
		subscribers: make(map[string]map[string]*Subscriber),
		eventBuffer: make(map[string][]*StreamEvent),
		bufferSize:  100,
	}

	// Start Redis subscription for distributed events
	go service.subscribeToRedis()

	return service
}

// Subscribe adds a new subscriber for a project
func (s *RealtimeService) Subscribe(projectID string) (*Subscriber, error) {
	s.mu.Lock()
	defer s.mu.Unlock()

	subscriberID := generateID()
	subscriber := &Subscriber{
		ID:        subscriberID,
		ProjectID: projectID,
		Channel:   make(chan *StreamEvent, 100),
	}

	if s.subscribers[projectID] == nil {
		s.subscribers[projectID] = make(map[string]*Subscriber)
	}
	s.subscribers[projectID][subscriberID] = subscriber

	return subscriber, nil
}

// Unsubscribe removes a subscriber
func (s *RealtimeService) Unsubscribe(projectID, subscriberID string) {
	s.mu.Lock()
	defer s.mu.Unlock()

	if subs, ok := s.subscribers[projectID]; ok {
		if sub, ok := subs[subscriberID]; ok {
			close(sub.Channel)
			delete(subs, subscriberID)
		}
		if len(subs) == 0 {
			delete(s.subscribers, projectID)
		}
	}
}

// Push pushes an event to all subscribers of a project
func (s *RealtimeService) Push(event *StreamEvent) error {
	event.Timestamp = time.Now().UnixMilli()

	// Store in buffer
	s.bufferEvent(event)

	// Publish to Redis for distributed delivery
	ctx := context.Background()
	eventJSON, err := json.Marshal(event)
	if err != nil {
		return err
	}

	channel := "realtime:" + event.ProjectID
	return db.Publish(ctx, channel, string(eventJSON))
}

// PushCodeChange pushes a code change event
func (s *RealtimeService) PushCodeChange(projectID, file, content string, options map[string]interface{}) error {
	payload, _ := json.Marshal(map[string]interface{}{
		"file":    file,
		"content": content,
		"options": options,
	})

	return s.Push(&StreamEvent{
		Type:      EventCodeChange,
		ProjectID: projectID,
		Payload:   payload,
	})
}

// PushTerminalOutput pushes a terminal output event
func (s *RealtimeService) PushTerminalOutput(projectID, sandboxID, output string, options map[string]interface{}) error {
	payload, _ := json.Marshal(map[string]interface{}{
		"sandboxId": sandboxID,
		"output":    output,
		"options":   options,
	})

	return s.Push(&StreamEvent{
		Type:      EventTerminalOutput,
		ProjectID: projectID,
		Payload:   payload,
	})
}

// PushAgentStatus pushes an agent status event
func (s *RealtimeService) PushAgentStatus(projectID, agentID, agentName, status string, options map[string]interface{}) error {
	payload, _ := json.Marshal(map[string]interface{}{
		"agentId":   agentID,
		"agentName": agentName,
		"status":    status,
		"options":   options,
	})

	return s.Push(&StreamEvent{
		Type:      EventAgentStatus,
		ProjectID: projectID,
		Payload:   payload,
	})
}

// PushProgress pushes a progress event
func (s *RealtimeService) PushProgress(projectID, phase string, progress int, message string, subTasks []map[string]interface{}) error {
	payload, _ := json.Marshal(map[string]interface{}{
		"phase":    phase,
		"progress": progress,
		"message":  message,
		"subTasks": subTasks,
	})

	return s.Push(&StreamEvent{
		Type:      EventProgress,
		ProjectID: projectID,
		Payload:   payload,
	})
}

// PushPreviewUpdate pushes a preview update event
func (s *RealtimeService) PushPreviewUpdate(projectID, url, status, screenshot string) error {
	payload, _ := json.Marshal(map[string]interface{}{
		"url":        url,
		"status":     status,
		"screenshot": screenshot,
	})

	return s.Push(&StreamEvent{
		Type:      EventPreviewUpdate,
		ProjectID: projectID,
		Payload:   payload,
	})
}

// PushError pushes an error event
func (s *RealtimeService) PushError(projectID, code, message string, options map[string]interface{}) error {
	payload, _ := json.Marshal(map[string]interface{}{
		"code":    code,
		"message": message,
		"options": options,
	})

	return s.Push(&StreamEvent{
		Type:      EventError,
		ProjectID: projectID,
		Payload:   payload,
	})
}

// PushMessage pushes a message event
func (s *RealtimeService) PushMessage(projectID, role, content string, options map[string]interface{}) error {
	payload, _ := json.Marshal(map[string]interface{}{
		"role":    role,
		"content": content,
		"options": options,
	})

	return s.Push(&StreamEvent{
		Type:      EventMessage,
		ProjectID: projectID,
		Payload:   payload,
	})
}

// GetEventHistory returns recent events for a project
func (s *RealtimeService) GetEventHistory(projectID string, limit int) []*StreamEvent {
	s.mu.RLock()
	defer s.mu.RUnlock()

	events := s.eventBuffer[projectID]
	if len(events) <= limit {
		return events
	}
	return events[len(events)-limit:]
}

// Internal methods

func (s *RealtimeService) bufferEvent(event *StreamEvent) {
	s.mu.Lock()
	defer s.mu.Unlock()

	if s.eventBuffer[event.ProjectID] == nil {
		s.eventBuffer[event.ProjectID] = make([]*StreamEvent, 0)
	}

	s.eventBuffer[event.ProjectID] = append(s.eventBuffer[event.ProjectID], event)

	// Trim buffer if too large
	if len(s.eventBuffer[event.ProjectID]) > s.bufferSize {
		s.eventBuffer[event.ProjectID] = s.eventBuffer[event.ProjectID][len(s.eventBuffer[event.ProjectID])-s.bufferSize:]
	}
}

func (s *RealtimeService) deliverEvent(event *StreamEvent) {
	s.mu.RLock()
	subscribers := s.subscribers[event.ProjectID]
	s.mu.RUnlock()

	for _, sub := range subscribers {
		select {
		case sub.Channel <- event:
		default:
			// Channel full, skip
		}
	}
}

func (s *RealtimeService) subscribeToRedis() {
	ctx := context.Background()
	pubsub := db.Subscribe(ctx, "realtime:*")
	defer pubsub.Close()

	ch := pubsub.Channel()
	for msg := range ch {
		var event StreamEvent
		if err := json.Unmarshal([]byte(msg.Payload), &event); err != nil {
			continue
		}
		s.deliverEvent(&event)
	}
}

func generateID() string {
	return time.Now().Format("20060102150405") + "_" + randomString(8)
}

func randomString(n int) string {
	const letters = "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789"
	b := make([]byte, n)
	for i := range b {
		b[i] = letters[time.Now().UnixNano()%int64(len(letters))]
	}
	return string(b)
}
