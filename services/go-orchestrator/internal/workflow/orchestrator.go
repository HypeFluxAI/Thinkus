package workflow

import (
	"context"
	"fmt"
	"log"
	"time"

	"github.com/thinkus/go-orchestrator/internal/contract"
	"github.com/thinkus/go-orchestrator/internal/models"
	"github.com/thinkus/go-orchestrator/internal/scheduler"
	"go.mongodb.org/mongo-driver/bson/primitive"
	"go.mongodb.org/mongo-driver/mongo"
)

// Orchestrator orchestrates the 8-stage development workflow
type Orchestrator struct {
	db              *mongo.Database
	scheduler       *scheduler.TaskScheduler
	contractManager *contract.Manager
	workflowColl    *mongo.Collection
}

// NewOrchestrator creates a new workflow orchestrator
func NewOrchestrator(db *mongo.Database, scheduler *scheduler.TaskScheduler, contractManager *contract.Manager) *Orchestrator {
	return &Orchestrator{
		db:              db,
		scheduler:       scheduler,
		contractManager: contractManager,
		workflowColl:    db.Collection("workflows"),
	}
}

// StartWorkflow starts the 8-stage workflow for a feature
func (o *Orchestrator) StartWorkflow(ctx context.Context, projectID primitive.ObjectID, feature *models.Feature) error {
	log.Printf("Starting workflow for feature %s", feature.ID)

	// Define 8 stages
	stages := []models.WorkflowStage{
		{
			ID:         "stage-1-requirement",
			Name:       "需求分析 (Mike)",
			Status:     "pending",
			AssignedTo: "mike_pm",
		},
		{
			ID:           "stage-2-design",
			Name:         "设计确认 (Elena)",
			Status:       "pending",
			AssignedTo:   "elena_ux",
			Dependencies: []string{"stage-1-requirement"},
		},
		{
			ID:           "stage-3-architecture",
			Name:         "架构规划 (David)",
			Status:       "pending",
			AssignedTo:   "david_tech",
			Dependencies: []string{"stage-2-design"},
		},
		{
			ID:           "stage-4-development",
			Name:         "开发实现 (全员)",
			Status:       "pending",
			AssignedTo:   "all",
			Dependencies: []string{"stage-3-architecture"},
		},
		{
			ID:           "stage-5-testing",
			Name:         "测试验证 (Kevin)",
			Status:       "pending",
			AssignedTo:   "kevin_qa",
			Dependencies: []string{"stage-4-development"},
		},
		{
			ID:           "stage-6-acceptance",
			Name:         "UI验收 (Mike)",
			Status:       "pending",
			AssignedTo:   "mike_pm",
			Dependencies: []string{"stage-5-testing"},
		},
		{
			ID:           "stage-7-deployment",
			Name:         "部署上线 (Frank)",
			Status:       "pending",
			AssignedTo:   "frank_devops",
			Dependencies: []string{"stage-6-acceptance"},
		},
		{
			ID:           "stage-8-operations",
			Name:         "运维支持 (全员)",
			Status:       "pending",
			AssignedTo:   "all",
			Dependencies: []string{"stage-7-deployment"},
		},
	}

	// Execute stages sequentially
	for i, stage := range stages {
		log.Printf("Executing stage %d: %s", i+1, stage.Name)

		// Update stage status to running
		stage.Status = "running"
		now := time.Now()
		stage.StartedAt = &now

		// Execute stage
		err := o.executeStage(ctx, projectID, feature, &stage)
		if err != nil {
			log.Printf("Stage %s failed: %v", stage.Name, err)
			stage.Status = "failed"
			return fmt.Errorf("workflow failed at stage %s: %w", stage.Name, err)
		}

		// Update stage status to completed
		stage.Status = "completed"
		completedAt := time.Now()
		stage.CompletedAt = &completedAt

		log.Printf("Stage %s completed", stage.Name)
	}

	log.Printf("Workflow completed for feature %s", feature.ID)
	return nil
}

// executeStage executes a single workflow stage
func (o *Orchestrator) executeStage(ctx context.Context, projectID primitive.ObjectID, feature *models.Feature, stage *models.WorkflowStage) error {
	switch stage.ID {
	case "stage-1-requirement":
		return o.stageRequirementAnalysis(ctx, projectID, feature)
	case "stage-2-design":
		return o.stageDesignConfirmation(ctx, projectID, feature)
	case "stage-3-architecture":
		return o.stageArchitecturePlanning(ctx, projectID, feature)
	case "stage-4-development":
		return o.stageDevelopment(ctx, projectID, feature)
	case "stage-5-testing":
		return o.stageTesting(ctx, projectID, feature)
	case "stage-6-acceptance":
		return o.stageAcceptance(ctx, projectID, feature)
	case "stage-7-deployment":
		return o.stageDeployment(ctx, projectID, feature)
	case "stage-8-operations":
		return o.stageOperations(ctx, projectID, feature)
	default:
		return fmt.Errorf("unknown stage: %s", stage.ID)
	}
}

// Stage 1: Requirement Analysis (Mike)
func (o *Orchestrator) stageRequirementAnalysis(ctx context.Context, projectID primitive.ObjectID, feature *models.Feature) error {
	log.Printf("Mike analyzing requirements for %s", feature.Name)

	// Create task for Mike
	task := &models.Task{
		ProjectID:  projectID,
		FeatureID:  feature.ID,
		Name:       fmt.Sprintf("Analyze requirements for %s", feature.Name),
		Type:       "analysis",
		AssignedTo: "mike_pm",
	}

	// Schedule task
	if err := o.scheduler.ScheduleTask(ctx, task); err != nil {
		return fmt.Errorf("failed to schedule requirement analysis: %w", err)
	}

	// Wait for completion (simplified - in reality would use callbacks)
	// TODO: Implement proper async handling
	time.Sleep(1 * time.Second)

	log.Printf("Requirement analysis completed")
	return nil
}

// Stage 2: Design Confirmation (Elena)
func (o *Orchestrator) stageDesignConfirmation(ctx context.Context, projectID primitive.ObjectID, feature *models.Feature) error {
	log.Printf("Elena designing for %s", feature.Name)

	task := &models.Task{
		ProjectID:  projectID,
		FeatureID:  feature.ID,
		Name:       fmt.Sprintf("Design UI for %s", feature.Name),
		Type:       "design",
		AssignedTo: "elena_ux",
	}

	if err := o.scheduler.ScheduleTask(ctx, task); err != nil {
		return fmt.Errorf("failed to schedule design: %w", err)
	}

	time.Sleep(1 * time.Second)
	log.Printf("Design confirmation completed")
	return nil
}

// Stage 3: Architecture Planning (David)
func (o *Orchestrator) stageArchitecturePlanning(ctx context.Context, projectID primitive.ObjectID, feature *models.Feature) error {
	log.Printf("David planning architecture for %s", feature.Name)

	// Generate contract
	_, err := o.contractManager.GenerateContractFromFeature(ctx, projectID, feature)
	if err != nil {
		return fmt.Errorf("failed to generate contract: %w", err)
	}

	task := &models.Task{
		ProjectID:  projectID,
		FeatureID:  feature.ID,
		Name:       fmt.Sprintf("Plan architecture for %s", feature.Name),
		Type:       "architecture",
		AssignedTo: "david_tech",
	}

	if err := o.scheduler.ScheduleTask(ctx, task); err != nil {
		return fmt.Errorf("failed to schedule architecture planning: %w", err)
	}

	time.Sleep(1 * time.Second)
	log.Printf("Architecture planning completed")
	return nil
}

// Stage 4: Development (All developers)
func (o *Orchestrator) stageDevelopment(ctx context.Context, projectID primitive.ObjectID, feature *models.Feature) error {
	log.Printf("Starting parallel development for %s", feature.Name)

	// Get contract
	contract, err := o.contractManager.GetContractByFeature(ctx, projectID, feature.ID)
	if err != nil {
		return fmt.Errorf("failed to get contract: %w", err)
	}

	// Approve contract
	if err := o.contractManager.ApproveContract(ctx, contract.ID); err != nil {
		return fmt.Errorf("failed to approve contract: %w", err)
	}

	// Create parallel development tasks
	tasks := []struct {
		name       string
		assignedTo string
	}{
		{"Develop database schema", "david_tech"},
		{"Develop backend API", "david_tech"},
		{"Develop frontend UI", "elena_ux"},
	}

	for _, t := range tasks {
		task := &models.Task{
			ProjectID:  projectID,
			FeatureID:  feature.ID,
			Name:       t.name,
			Type:       "develop",
			AssignedTo: t.assignedTo,
		}

		if err := o.scheduler.ScheduleTask(ctx, task); err != nil {
			return fmt.Errorf("failed to schedule development task: %w", err)
		}
	}

	time.Sleep(2 * time.Second)
	log.Printf("Development completed")
	return nil
}

// Stage 5: Testing (Kevin)
func (o *Orchestrator) stageTesting(ctx context.Context, projectID primitive.ObjectID, feature *models.Feature) error {
	log.Printf("Kevin testing %s", feature.Name)

	task := &models.Task{
		ProjectID:  projectID,
		FeatureID:  feature.ID,
		Name:       fmt.Sprintf("Test %s", feature.Name),
		Type:       "test",
		AssignedTo: "kevin_qa",
	}

	if err := o.scheduler.ScheduleTask(ctx, task); err != nil {
		return fmt.Errorf("failed to schedule testing: %w", err)
	}

	time.Sleep(1 * time.Second)
	log.Printf("Testing completed")
	return nil
}

// Stage 6: UI Acceptance (Mike)
func (o *Orchestrator) stageAcceptance(ctx context.Context, projectID primitive.ObjectID, feature *models.Feature) error {
	log.Printf("Mike accepting UI for %s", feature.Name)

	task := &models.Task{
		ProjectID:  projectID,
		FeatureID:  feature.ID,
		Name:       fmt.Sprintf("Accept UI for %s", feature.Name),
		Type:       "acceptance",
		AssignedTo: "mike_pm",
	}

	if err := o.scheduler.ScheduleTask(ctx, task); err != nil {
		return fmt.Errorf("failed to schedule acceptance: %w", err)
	}

	time.Sleep(1 * time.Second)
	log.Printf("UI acceptance completed")
	return nil
}

// Stage 7: Deployment (Frank)
func (o *Orchestrator) stageDeployment(ctx context.Context, projectID primitive.ObjectID, feature *models.Feature) error {
	log.Printf("Frank deploying %s", feature.Name)

	task := &models.Task{
		ProjectID:  projectID,
		FeatureID:  feature.ID,
		Name:       fmt.Sprintf("Deploy %s", feature.Name),
		Type:       "deploy",
		AssignedTo: "frank_devops",
	}

	if err := o.scheduler.ScheduleTask(ctx, task); err != nil {
		return fmt.Errorf("failed to schedule deployment: %w", err)
	}

	time.Sleep(1 * time.Second)
	log.Printf("Deployment completed")
	return nil
}

// Stage 8: Operations (All)
func (o *Orchestrator) stageOperations(ctx context.Context, projectID primitive.ObjectID, feature *models.Feature) error {
	log.Printf("Setting up operations for %s", feature.Name)

	task := &models.Task{
		ProjectID:  projectID,
		FeatureID:  feature.ID,
		Name:       fmt.Sprintf("Setup monitoring for %s", feature.Name),
		Type:       "operations",
		AssignedTo: "frank_devops",
	}

	if err := o.scheduler.ScheduleTask(ctx, task); err != nil {
		return fmt.Errorf("failed to schedule operations: %w", err)
	}

	time.Sleep(1 * time.Second)
	log.Printf("Operations setup completed")
	return nil
}
