package services

import (
	"context"

	"github.com/thinkus/go-sandbox/internal/docker"
)

// SandboxService implements sandbox management
type SandboxService struct {
}

// NewSandboxService creates a new sandbox service
func NewSandboxService() *SandboxService {
	return &SandboxService{}
}

// Create creates a new sandbox
func (s *SandboxService) Create(ctx context.Context, projectID, userID string, cfg *docker.SandboxConfig) (*docker.Sandbox, error) {
	return docker.CreateSandbox(ctx, projectID, userID, cfg)
}

// GetOrCreate gets existing sandbox or creates new one
func (s *SandboxService) GetOrCreate(ctx context.Context, projectID, userID string, cfg *docker.SandboxConfig) (*docker.Sandbox, error) {
	return docker.GetOrCreateSandbox(ctx, projectID, userID, cfg)
}

// Get returns a sandbox by ID
func (s *SandboxService) Get(sandboxID string) (*docker.Sandbox, error) {
	return docker.GetSandbox(sandboxID)
}

// Exec executes a command in sandbox
func (s *SandboxService) Exec(ctx context.Context, sandboxID, command string, timeout int) (*docker.ExecResult, error) {
	if timeout <= 0 {
		timeout = 30 // Default 30 seconds
	}
	return docker.Exec(ctx, sandboxID, command, timeout)
}

// WriteFile writes a file to sandbox
func (s *SandboxService) WriteFile(sandboxID, path string, content []byte) error {
	return docker.WriteFile(sandboxID, path, content)
}

// ReadFile reads a file from sandbox
func (s *SandboxService) ReadFile(sandboxID, path string) ([]byte, error) {
	return docker.ReadFile(sandboxID, path)
}

// ListFiles lists files in sandbox directory
func (s *SandboxService) ListFiles(sandboxID, directory string) ([]docker.FileInfo, error) {
	return docker.ListFiles(sandboxID, directory)
}

// Pause pauses a sandbox
func (s *SandboxService) Pause(ctx context.Context, sandboxID string) error {
	return docker.PauseSandbox(ctx, sandboxID)
}

// Resume resumes a paused sandbox
func (s *SandboxService) Resume(ctx context.Context, sandboxID string) error {
	return docker.ResumeSandbox(ctx, sandboxID)
}

// Destroy destroys a sandbox
func (s *SandboxService) Destroy(ctx context.Context, sandboxID string) error {
	return docker.DestroySandbox(ctx, sandboxID)
}

// Export exports sandbox files
func (s *SandboxService) Export(sandboxID string) (map[string][]byte, *docker.Sandbox, error) {
	return docker.ExportSandbox(sandboxID)
}
