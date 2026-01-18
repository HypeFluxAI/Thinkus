package contract

import (
	"context"
	"fmt"
	"log"
	"time"

	"github.com/thinkus/go-orchestrator/internal/models"
	"go.mongodb.org/mongo-driver/bson"
	"go.mongodb.org/mongo-driver/bson/primitive"
	"go.mongodb.org/mongo-driver/mongo"
)

// Manager manages interface contracts
type Manager struct {
	db           *mongo.Database
	contractColl *mongo.Collection
}

// NewManager creates a new contract manager
func NewManager(db *mongo.Database) *Manager {
	return &Manager{
		db:           db,
		contractColl: db.Collection("interface_contracts"),
	}
}

// CreateContract creates a new interface contract
func (m *Manager) CreateContract(ctx context.Context, contract *models.InterfaceContract) (*models.InterfaceContract, error) {
	// Validate contract
	if contract.ProjectID.IsZero() || contract.FeatureID == "" {
		return nil, fmt.Errorf("invalid contract: missing required fields")
	}

	// Set initial values
	contract.Version = 1
	contract.Status = "draft"
	contract.CreatedAt = time.Now()
	contract.UpdatedAt = time.Now()

	// Insert to database
	result, err := m.contractColl.InsertOne(ctx, contract)
	if err != nil {
		return nil, fmt.Errorf("failed to create contract: %w", err)
	}

	contract.ID = result.InsertedID.(primitive.ObjectID)

	log.Printf("Contract created: %s for feature %s", contract.ID.Hex(), contract.FeatureID)
	return contract, nil
}

// GetContract retrieves a contract by ID
func (m *Manager) GetContract(ctx context.Context, contractID primitive.ObjectID) (*models.InterfaceContract, error) {
	var contract models.InterfaceContract
	err := m.contractColl.FindOne(ctx, bson.M{"_id": contractID}).Decode(&contract)
	if err != nil {
		if err == mongo.ErrNoDocuments {
			return nil, fmt.Errorf("contract not found")
		}
		return nil, fmt.Errorf("failed to get contract: %w", err)
	}
	return &contract, nil
}

// GetContractByFeature retrieves the latest contract for a feature
func (m *Manager) GetContractByFeature(ctx context.Context, projectID primitive.ObjectID, featureID string) (*models.InterfaceContract, error) {
	var contract models.InterfaceContract

	// Find the latest version
	err := m.contractColl.FindOne(
		ctx,
		bson.M{
			"projectId": projectID,
			"featureId": featureID,
		},
		// TODO: Add sort by version desc
	).Decode(&contract)

	if err != nil {
		if err == mongo.ErrNoDocuments {
			return nil, fmt.Errorf("contract not found for feature %s", featureID)
		}
		return nil, fmt.Errorf("failed to get contract: %w", err)
	}

	return &contract, nil
}

// UpdateContract updates an existing contract
func (m *Manager) UpdateContract(ctx context.Context, contractID primitive.ObjectID, updates map[string]interface{}) error {
	// Add updated timestamp
	updates["updatedAt"] = time.Now()

	result, err := m.contractColl.UpdateOne(
		ctx,
		bson.M{"_id": contractID},
		bson.M{"$set": updates},
	)

	if err != nil {
		return fmt.Errorf("failed to update contract: %w", err)
	}

	if result.MatchedCount == 0 {
		return fmt.Errorf("contract not found")
	}

	log.Printf("Contract %s updated", contractID.Hex())
	return nil
}

// ApproveContract approves a contract
func (m *Manager) ApproveContract(ctx context.Context, contractID primitive.ObjectID) error {
	return m.UpdateContract(ctx, contractID, map[string]interface{}{
		"status": "approved",
	})
}

// ImplementContract marks a contract as implemented
func (m *Manager) ImplementContract(ctx context.Context, contractID primitive.ObjectID) error {
	return m.UpdateContract(ctx, contractID, map[string]interface{}{
		"status": "implemented",
	})
}

// ListContracts lists all contracts for a project
func (m *Manager) ListContracts(ctx context.Context, projectID primitive.ObjectID) ([]*models.InterfaceContract, error) {
	cursor, err := m.contractColl.Find(ctx, bson.M{"projectId": projectID})
	if err != nil {
		return nil, fmt.Errorf("failed to list contracts: %w", err)
	}
	defer cursor.Close(ctx)

	var contracts []*models.InterfaceContract
	if err := cursor.All(ctx, &contracts); err != nil {
		return nil, fmt.Errorf("failed to decode contracts: %w", err)
	}

	return contracts, nil
}

// ValidateContract validates a contract
func (m *Manager) ValidateContract(contract *models.InterfaceContract) error {
	// Validate required fields
	if contract.ProjectID.IsZero() {
		return fmt.Errorf("projectId is required")
	}
	if contract.FeatureID == "" {
		return fmt.Errorf("featureId is required")
	}
	if contract.FeatureName == "" {
		return fmt.Errorf("featureName is required")
	}

	// Validate API contract
	if contract.API != nil {
		if contract.API.Method == "" {
			return fmt.Errorf("API method is required")
		}
		if contract.API.Path == "" {
			return fmt.Errorf("API path is required")
		}
		if contract.API.Response == nil {
			return fmt.Errorf("API response is required")
		}
	}

	// Validate Database contract
	if contract.Database != nil {
		if contract.Database.Table == "" {
			return fmt.Errorf("database table is required")
		}
		if len(contract.Database.Fields) == 0 {
			return fmt.Errorf("database fields are required")
		}
	}

	// Validate Frontend contract
	if contract.Frontend != nil {
		if contract.Frontend.Page == "" {
			return fmt.Errorf("frontend page is required")
		}
	}

	return nil
}

// GenerateContractFromFeature generates a contract from a feature
func (m *Manager) GenerateContractFromFeature(ctx context.Context, projectID primitive.ObjectID, feature *models.Feature) (*models.InterfaceContract, error) {
	contract := &models.InterfaceContract{
		ProjectID:   projectID,
		FeatureID:   feature.ID,
		FeatureName: feature.Name,
		CreatedBy:   "mike_pm", // Default to Mike
	}

	// Generate API contract if involves backend
	if contains(feature.Involves, "backend") {
		contract.API = &models.APIContract{
			Method:   "POST", // Default
			Path:     fmt.Sprintf("/api/%s", feature.ID),
			Request:  make(map[string]interface{}),
			Response: make(map[string]interface{}),
			Errors:   []models.ErrorSpec{},
		}
	}

	// Generate Database contract if involves database
	if contains(feature.Involves, "database") {
		contract.Database = &models.DatabaseContract{
			Table:  feature.Module,
			Fields: []models.FieldSpec{},
		}
	}

	// Generate Frontend contract if involves frontend
	if contains(feature.Involves, "frontend") {
		contract.Frontend = &models.FrontendContract{
			Page:       feature.Name,
			Components: []string{},
			States:     []models.StateSpec{},
		}
	}

	// Create the contract
	return m.CreateContract(ctx, contract)
}

func contains(slice []string, item string) bool {
	for _, s := range slice {
		if s == item {
			return true
		}
	}
	return false
}
