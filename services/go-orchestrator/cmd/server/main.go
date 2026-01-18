package main

import (
	"context"
	"fmt"
	"log"
	"net/http"
	"os"
	"os/signal"
	"syscall"
	"time"

	"github.com/thinkus/go-orchestrator/internal/config"
	"github.com/thinkus/go-orchestrator/internal/contract"
	"github.com/thinkus/go-orchestrator/internal/models"
	"github.com/thinkus/go-orchestrator/internal/scheduler"
	"github.com/thinkus/go-orchestrator/internal/workflow"
	"go.mongodb.org/mongo-driver/bson/primitive"
	"go.mongodb.org/mongo-driver/mongo"
	"go.mongodb.org/mongo-driver/mongo/options"
)

var (
	db              *mongo.Database
	taskScheduler   *scheduler.TaskScheduler
	contractManager *contract.Manager
	workflowOrch    *workflow.Orchestrator
)

func main() {
	// Load configuration
	cfg := config.Load()

	log.Printf("Starting Go Orchestrator Service...")
	log.Printf("Environment: %s", cfg.Env)
	log.Printf("HTTP Port: %d", cfg.Port)
	log.Printf("gRPC Port: %d", cfg.GRPCPort)

	// Initialize MongoDB
	if err := initMongoDB(cfg); err != nil {
		log.Fatalf("Failed to initialize MongoDB: %v", err)
	}
	defer disconnectMongoDB()

	// Initialize components
	taskScheduler = scheduler.NewScheduler(db, 5) // 5 workers
	contractManager = contract.NewManager(db)
	workflowOrch = workflow.NewOrchestrator(db, taskScheduler, contractManager)

	// Start scheduler
	taskScheduler.Start()
	defer taskScheduler.Stop()

	// Start HTTP server
	go startHTTPServer(cfg)

	// TODO: Start gRPC server
	// go startGRPCServer(cfg)

	// Graceful shutdown
	quit := make(chan os.Signal, 1)
	signal.Notify(quit, syscall.SIGINT, syscall.SIGTERM)
	<-quit

	log.Println("Shutting down server...")
	time.Sleep(2 * time.Second)
	log.Println("Server shutdown complete")
}

func initMongoDB(cfg *config.Config) error {
	ctx, cancel := context.WithTimeout(context.Background(), 10*time.Second)
	defer cancel()

	clientOptions := options.Client().ApplyURI(cfg.MongoDBURI)
	client, err := mongo.Connect(ctx, clientOptions)
	if err != nil {
		return fmt.Errorf("failed to connect to MongoDB: %w", err)
	}

	// Ping to verify connection
	if err := client.Ping(ctx, nil); err != nil {
		return fmt.Errorf("failed to ping MongoDB: %w", err)
	}

	db = client.Database(cfg.MongoDBDB)
	log.Printf("Connected to MongoDB: %s", cfg.MongoDBDB)
	return nil
}

func disconnectMongoDB() {
	if db != nil {
		ctx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
		defer cancel()
		if err := db.Client().Disconnect(ctx); err != nil {
			log.Printf("Error disconnecting from MongoDB: %v", err)
		}
	}
}

func startHTTPServer(cfg *config.Config) {
	mux := http.NewServeMux()

	// Health check
	mux.HandleFunc("/health", handleHealth)

	// Task endpoints
	mux.HandleFunc("/api/v1/tasks", handleTasks)
	mux.HandleFunc("/api/v1/tasks/schedule", handleScheduleTask)

	// Contract endpoints
	mux.HandleFunc("/api/v1/contracts", handleContracts)
	mux.HandleFunc("/api/v1/contracts/create", handleCreateContract)

	// Workflow endpoints
	mux.HandleFunc("/api/v1/workflow/start", handleStartWorkflow)

	addr := fmt.Sprintf(":%d", cfg.Port)
	log.Printf("HTTP server listening on %s", addr)

	if err := http.ListenAndServe(addr, mux); err != nil {
		log.Fatalf("Failed to start HTTP server: %v", err)
	}
}

func handleHealth(w http.ResponseWriter, r *http.Request) {
	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(http.StatusOK)
	w.Write([]byte(`{"status":"healthy","service":"go-orchestrator"}`))
}

func handleTasks(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodGet {
		http.Error(w, "Method not allowed", http.StatusMethodNotAllowed)
		return
	}

	// Get projectId from query params
	projectIDStr := r.URL.Query().Get("projectId")
	if projectIDStr == "" {
		http.Error(w, "projectId is required", http.StatusBadRequest)
		return
	}

	projectID, err := primitive.ObjectIDFromHex(projectIDStr)
	if err != nil {
		http.Error(w, "Invalid projectId", http.StatusBadRequest)
		return
	}

	tasks, err := taskScheduler.ListTasks(r.Context(), projectID)
	if err != nil {
		http.Error(w, err.Error(), http.StatusInternalServerError)
		return
	}

	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(http.StatusOK)
	// TODO: Marshal tasks to JSON
	fmt.Fprintf(w, `{"tasks":%d}`, len(tasks))
}

func handleScheduleTask(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodPost {
		http.Error(w, "Method not allowed", http.StatusMethodNotAllowed)
		return
	}

	// TODO: Parse request body and schedule task
	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(http.StatusOK)
	w.Write([]byte(`{"success":true,"message":"Task scheduled"}`))
}

func handleContracts(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodGet {
		http.Error(w, "Method not allowed", http.StatusMethodNotAllowed)
		return
	}

	projectIDStr := r.URL.Query().Get("projectId")
	if projectIDStr == "" {
		http.Error(w, "projectId is required", http.StatusBadRequest)
		return
	}

	projectID, err := primitive.ObjectIDFromHex(projectIDStr)
	if err != nil {
		http.Error(w, "Invalid projectId", http.StatusBadRequest)
		return
	}

	contracts, err := contractManager.ListContracts(r.Context(), projectID)
	if err != nil {
		http.Error(w, err.Error(), http.StatusInternalServerError)
		return
	}

	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(http.StatusOK)
	fmt.Fprintf(w, `{"contracts":%d}`, len(contracts))
}

func handleCreateContract(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodPost {
		http.Error(w, "Method not allowed", http.StatusMethodNotAllowed)
		return
	}

	// TODO: Parse request body and create contract
	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(http.StatusOK)
	w.Write([]byte(`{"success":true,"message":"Contract created"}`))
}

func handleStartWorkflow(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodPost {
		http.Error(w, "Method not allowed", http.StatusMethodNotAllowed)
		return
	}

	// Demo: Start workflow for a test feature
	projectID := primitive.NewObjectID()
	feature := &models.Feature{
		ID:          "F001",
		Name:        "User Login",
		Description: "User login feature",
		Module:      "auth",
		Involves:    []string{"frontend", "backend", "database"},
		Complexity:  "medium",
	}

	go func() {
		ctx := context.Background()
		if err := workflowOrch.StartWorkflow(ctx, projectID, feature); err != nil {
			log.Printf("Workflow error: %v", err)
		}
	}()

	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(http.StatusOK)
	w.Write([]byte(`{"success":true,"message":"Workflow started","projectId":"` + projectID.Hex() + `"}`))
}
