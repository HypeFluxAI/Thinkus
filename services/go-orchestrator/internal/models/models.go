package models

import (
	"time"

	"go.mongodb.org/mongo-driver/bson/primitive"
)

// Task represents a development task
type Task struct {
	ID          primitive.ObjectID `bson:"_id,omitempty" json:"id"`
	ProjectID   primitive.ObjectID `bson:"projectId" json:"projectId"`
	FeatureID   string             `bson:"featureId" json:"featureId"`
	Name        string             `bson:"name" json:"name"`
	Type        string             `bson:"type" json:"type"` // develop, test, deploy
	Status      string             `bson:"status" json:"status"` // pending, running, completed, failed
	Priority    int                `bson:"priority" json:"priority"`
	Dependencies []string          `bson:"dependencies" json:"dependencies"` // Task IDs
	AssignedTo  string             `bson:"assignedTo" json:"assignedTo"` // Employee ID
	Params      map[string]string  `bson:"params,omitempty" json:"params,omitempty"`
	Result      *TaskResult        `bson:"result,omitempty" json:"result,omitempty"`
	CreatedAt   time.Time          `bson:"createdAt" json:"createdAt"`
	UpdatedAt   time.Time          `bson:"updatedAt" json:"updatedAt"`
	StartedAt   *time.Time         `bson:"startedAt,omitempty" json:"startedAt,omitempty"`
	CompletedAt *time.Time         `bson:"completedAt,omitempty" json:"completedAt,omitempty"`
}

// TaskResult holds the result of a task execution
type TaskResult struct {
	Success  bool              `bson:"success" json:"success"`
	Message  string            `bson:"message,omitempty" json:"message,omitempty"`
	Data     map[string]interface{} `bson:"data,omitempty" json:"data,omitempty"`
	Error    string            `bson:"error,omitempty" json:"error,omitempty"`
}

// InterfaceContract represents a feature interface contract
type InterfaceContract struct {
	ID          primitive.ObjectID `bson:"_id,omitempty" json:"id"`
	ProjectID   primitive.ObjectID `bson:"projectId" json:"projectId"`
	FeatureID   string             `bson:"featureId" json:"featureId"`
	FeatureName string             `bson:"featureName" json:"featureName"`
	Version     int                `bson:"version" json:"version"`
	Status      string             `bson:"status" json:"status"` // draft, approved, implemented

	// API Contract
	API *APIContract `bson:"api,omitempty" json:"api,omitempty"`

	// Database Contract
	Database *DatabaseContract `bson:"database,omitempty" json:"database,omitempty"`

	// Frontend Contract
	Frontend *FrontendContract `bson:"frontend,omitempty" json:"frontend,omitempty"`

	CreatedBy string    `bson:"createdBy" json:"createdBy"` // Employee ID
	CreatedAt time.Time `bson:"createdAt" json:"createdAt"`
	UpdatedAt time.Time `bson:"updatedAt" json:"updatedAt"`
}

// APIContract defines the API interface
type APIContract struct {
	Method   string                 `bson:"method" json:"method"` // GET, POST, PUT, DELETE
	Path     string                 `bson:"path" json:"path"`
	Request  map[string]interface{} `bson:"request,omitempty" json:"request,omitempty"`
	Response map[string]interface{} `bson:"response" json:"response"`
	Errors   []ErrorSpec            `bson:"errors,omitempty" json:"errors,omitempty"`
}

// ErrorSpec defines an error response
type ErrorSpec struct {
	Code    int    `bson:"code" json:"code"`
	Message string `bson:"message" json:"message"`
	When    string `bson:"when" json:"when"`
}

// DatabaseContract defines the database schema
type DatabaseContract struct {
	Table   string                 `bson:"table" json:"table"`
	Fields  []FieldSpec            `bson:"fields" json:"fields"`
	Indexes []IndexSpec            `bson:"indexes,omitempty" json:"indexes,omitempty"`
}

// FieldSpec defines a database field
type FieldSpec struct {
	Name     string `bson:"name" json:"name"`
	Type     string `bson:"type" json:"type"`
	Required bool   `bson:"required" json:"required"`
	Unique   bool   `bson:"unique,omitempty" json:"unique,omitempty"`
	Default  interface{} `bson:"default,omitempty" json:"default,omitempty"`
}

// IndexSpec defines a database index
type IndexSpec struct {
	Fields []string `bson:"fields" json:"fields"`
	Unique bool     `bson:"unique,omitempty" json:"unique,omitempty"`
}

// FrontendContract defines the frontend interface
type FrontendContract struct {
	Page       string              `bson:"page" json:"page"`
	Components []string            `bson:"components" json:"components"`
	States     []StateSpec         `bson:"states" json:"states"`
	Events     []EventSpec         `bson:"events,omitempty" json:"events,omitempty"`
}

// StateSpec defines a frontend state
type StateSpec struct {
	Name         string `bson:"name" json:"name"`
	Type         string `bson:"type" json:"type"`
	InitialValue interface{} `bson:"initialValue,omitempty" json:"initialValue,omitempty"`
}

// EventSpec defines a frontend event
type EventSpec struct {
	Name    string `bson:"name" json:"name"`
	Handler string `bson:"handler" json:"handler"`
	Params  []string `bson:"params,omitempty" json:"params,omitempty"`
}

// Feature represents a development feature
type Feature struct {
	ID           string   `json:"id"`
	Name         string   `json:"name"`
	Description  string   `json:"description"`
	Module       string   `json:"module"`
	Involves     []string `json:"involves"` // frontend, backend, database
	Complexity   string   `json:"complexity"` // simple, medium, complex
	Dependencies []string `json:"dependencies"` // Feature IDs
	EstimatedMin int      `json:"estimatedMin"`
}

// Iteration represents a development iteration
type Iteration struct {
	ID           string    `json:"id"`
	Name         string    `json:"name"`
	Goal         string    `json:"goal"`
	FeatureIDs   []string  `json:"featureIds"`
	EstimatedMin int       `json:"estimatedMin"`
}

// WorkflowStage represents a stage in the 8-stage workflow
type WorkflowStage struct {
	ID          string    `json:"id"`
	Name        string    `json:"name"`
	Status      string    `json:"status"` // pending, running, completed, blocked
	AssignedTo  string    `json:"assignedTo"` // Employee ID
	Dependencies []string `json:"dependencies"` // Stage IDs
	StartedAt   *time.Time `json:"startedAt,omitempty"`
	CompletedAt *time.Time `json:"completedAt,omitempty"`
}
