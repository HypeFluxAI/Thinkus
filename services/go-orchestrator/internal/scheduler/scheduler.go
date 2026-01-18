package scheduler

import (
	"context"
	"fmt"
	"log"
	"sync"
	"time"

	"github.com/thinkus/go-orchestrator/internal/models"
	"go.mongodb.org/mongo-driver/bson"
	"go.mongodb.org/mongo-driver/bson/primitive"
	"go.mongodb.org/mongo-driver/mongo"
)

// TaskScheduler manages task scheduling and execution
type TaskScheduler struct {
	db          *mongo.Database
	taskColl    *mongo.Collection
	workers     map[string]*Worker
	taskQueue   chan *models.Task
	resultChan  chan *TaskResult
	ctx         context.Context
	cancel      context.CancelFunc
	mu          sync.RWMutex
}

// Worker represents a task executor
type Worker struct {
	ID     string
	Status string // idle, busy
	mu     sync.Mutex
}

// TaskResult holds the result of task execution
type TaskResult struct {
	TaskID  primitive.ObjectID
	Success bool
	Data    map[string]interface{}
	Error   error
}

// NewScheduler creates a new task scheduler
func NewScheduler(db *mongo.Database, workerCount int) *TaskScheduler {
	ctx, cancel := context.WithCancel(context.Background())

	s := &TaskScheduler{
		db:         db,
		taskColl:   db.Collection("tasks"),
		workers:    make(map[string]*Worker),
		taskQueue:  make(chan *models.Task, 100),
		resultChan: make(chan *TaskResult, 100),
		ctx:        ctx,
		cancel:     cancel,
	}

	// Initialize workers
	for i := 0; i < workerCount; i++ {
		workerID := fmt.Sprintf("worker-%d", i)
		s.workers[workerID] = &Worker{
			ID:     workerID,
			Status: "idle",
		}
	}

	return s
}

// Start starts the scheduler
func (s *TaskScheduler) Start() {
	log.Println("Task scheduler started")

	// Start worker goroutines
	for _, worker := range s.workers {
		go s.workerLoop(worker)
	}

	// Start result handler
	go s.handleResults()
}

// Stop stops the scheduler
func (s *TaskScheduler) Stop() {
	log.Println("Stopping task scheduler...")
	s.cancel()
	close(s.taskQueue)
	close(s.resultChan)
}

// ScheduleTask schedules a task for execution
func (s *TaskScheduler) ScheduleTask(ctx context.Context, task *models.Task) error {
	// Validate task
	if task.ProjectID.IsZero() || task.Name == "" {
		return fmt.Errorf("invalid task: missing required fields")
	}

	// Set initial status
	task.Status = "pending"
	task.CreatedAt = time.Now()
	task.UpdatedAt = time.Now()

	// Insert to database
	result, err := s.taskColl.InsertOne(ctx, task)
	if err != nil {
		return fmt.Errorf("failed to insert task: %w", err)
	}

	task.ID = result.InsertedID.(primitive.ObjectID)

	// Add to queue
	select {
	case s.taskQueue <- task:
		log.Printf("Task %s scheduled: %s", task.ID.Hex(), task.Name)
		return nil
	case <-ctx.Done():
		return ctx.Err()
	}
}

// ScheduleIteration schedules all features in an iteration
func (s *TaskScheduler) ScheduleIteration(ctx context.Context, iteration *models.Iteration, projectID primitive.ObjectID) error {
	// Analyze dependencies
	groups := s.groupByDependency(iteration.FeatureIDs)

	log.Printf("Scheduling iteration %s with %d feature groups", iteration.ID, len(groups))

	// Schedule groups sequentially, features within group in parallel
	for groupIdx, group := range groups {
		log.Printf("Scheduling group %d with %d features", groupIdx+1, len(group))

		var wg sync.WaitGroup
		errChan := make(chan error, len(group))

		for _, featureID := range group {
			wg.Add(1)
			go func(fid string) {
				defer wg.Done()

				task := &models.Task{
					ProjectID:   projectID,
					FeatureID:   fid,
					Name:        fmt.Sprintf("Develop feature %s", fid),
					Type:        "develop",
					Priority:    1,
					Dependencies: []string{},
				}

				if err := s.ScheduleTask(ctx, task); err != nil {
					errChan <- err
				}
			}(featureID)
		}

		wg.Wait()
		close(errChan)

		// Check for errors
		for err := range errChan {
			if err != nil {
				return fmt.Errorf("failed to schedule feature: %w", err)
			}
		}
	}

	return nil
}

// groupByDependency groups features by their dependencies
// Returns groups where features in the same group can be executed in parallel
func (s *TaskScheduler) groupByDependency(featureIDs []string) [][]string {
	// Simple implementation: treat all as one group for now
	// TODO: Implement real dependency analysis
	return [][]string{featureIDs}
}

// workerLoop is the main loop for a worker
func (s *TaskScheduler) workerLoop(worker *Worker) {
	log.Printf("Worker %s started", worker.ID)

	for {
		select {
		case task, ok := <-s.taskQueue:
			if !ok {
				log.Printf("Worker %s stopped", worker.ID)
				return
			}

			worker.mu.Lock()
			worker.Status = "busy"
			worker.mu.Unlock()

			// Execute task
			result := s.executeTask(task)

			worker.mu.Lock()
			worker.Status = "idle"
			worker.mu.Unlock()

			// Send result
			select {
			case s.resultChan <- result:
			case <-s.ctx.Done():
				return
			}

		case <-s.ctx.Done():
			log.Printf("Worker %s stopped", worker.ID)
			return
		}
	}
}

// executeTask executes a single task
func (s *TaskScheduler) executeTask(task *models.Task) *TaskResult {
	log.Printf("Executing task %s: %s", task.ID.Hex(), task.Name)

	// Update task status to running
	now := time.Now()
	task.Status = "running"
	task.StartedAt = &now
	task.UpdatedAt = now

	_, err := s.taskColl.UpdateOne(
		context.Background(),
		bson.M{"_id": task.ID},
		bson.M{
			"$set": bson.M{
				"status":    task.Status,
				"startedAt": task.StartedAt,
				"updatedAt": task.UpdatedAt,
			},
		},
	)
	if err != nil {
		log.Printf("Failed to update task status: %v", err)
	}

	// Simulate task execution
	// TODO: Call actual AI employees via gRPC
	time.Sleep(2 * time.Second)

	result := &TaskResult{
		TaskID:  task.ID,
		Success: true,
		Data: map[string]interface{}{
			"message": fmt.Sprintf("Task %s completed", task.Name),
		},
	}

	return result
}

// handleResults processes task results
func (s *TaskScheduler) handleResults() {
	log.Println("Result handler started")

	for {
		select {
		case result, ok := <-s.resultChan:
			if !ok {
				log.Println("Result handler stopped")
				return
			}

			s.updateTaskResult(result)

		case <-s.ctx.Done():
			log.Println("Result handler stopped")
			return
		}
	}
}

// updateTaskResult updates task with execution result
func (s *TaskScheduler) updateTaskResult(result *TaskResult) {
	now := time.Now()
	status := "completed"
	if !result.Success {
		status = "failed"
	}

	taskResult := &models.TaskResult{
		Success: result.Success,
		Data:    result.Data,
	}
	if result.Error != nil {
		taskResult.Error = result.Error.Error()
	}

	update := bson.M{
		"$set": bson.M{
			"status":      status,
			"completedAt": now,
			"updatedAt":   now,
			"result":      taskResult,
		},
	}

	_, err := s.taskColl.UpdateOne(
		context.Background(),
		bson.M{"_id": result.TaskID},
		update,
	)

	if err != nil {
		log.Printf("Failed to update task result: %v", err)
	} else {
		log.Printf("Task %s %s", result.TaskID.Hex(), status)
	}
}

// GetTaskStatus returns the status of a task
func (s *TaskScheduler) GetTaskStatus(ctx context.Context, taskID primitive.ObjectID) (*models.Task, error) {
	var task models.Task
	err := s.taskColl.FindOne(ctx, bson.M{"_id": taskID}).Decode(&task)
	if err != nil {
		return nil, fmt.Errorf("task not found: %w", err)
	}
	return &task, nil
}

// ListTasks lists all tasks for a project
func (s *TaskScheduler) ListTasks(ctx context.Context, projectID primitive.ObjectID) ([]*models.Task, error) {
	cursor, err := s.taskColl.Find(ctx, bson.M{"projectId": projectID})
	if err != nil {
		return nil, fmt.Errorf("failed to list tasks: %w", err)
	}
	defer cursor.Close(ctx)

	var tasks []*models.Task
	if err := cursor.All(ctx, &tasks); err != nil {
		return nil, fmt.Errorf("failed to decode tasks: %w", err)
	}

	return tasks, nil
}
