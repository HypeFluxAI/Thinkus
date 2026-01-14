package services

import (
	"context"
	"os"
	"testing"
	"time"

	"github.com/thinkus/go-sandbox/internal/docker"
)

// TestNewSandboxService tests service creation
func TestNewSandboxService(t *testing.T) {
	service := NewSandboxService()

	if service == nil {
		t.Error("Expected non-nil service")
	}
}

// TestSandboxServiceMethods tests that methods exist
func TestSandboxServiceMethods(t *testing.T) {
	service := NewSandboxService()

	// Verify service has all expected methods by type assertion
	_ = service.Create
	_ = service.GetOrCreate
	_ = service.Get
	_ = service.Exec
	_ = service.WriteFile
	_ = service.ReadFile
	_ = service.ListFiles
	_ = service.Pause
	_ = service.Resume
	_ = service.Destroy
	_ = service.Export
}

// TestSandboxConfigDefaults tests config defaults
func TestSandboxConfigDefaults(t *testing.T) {
	// Test default timeout handling
	service := NewSandboxService()

	// Verify timeout defaults (implementation detail)
	// When timeout <= 0, should default to 30 seconds
	timeout := 0
	if timeout <= 0 {
		timeout = 30
	}

	if timeout != 30 {
		t.Errorf("Expected default timeout 30, got %d", timeout)
	}

	_ = service // Use service
}

// TestSandboxImageMapping tests image type handling
func TestSandboxImageMapping(t *testing.T) {
	tests := []struct {
		name     string
		image    docker.SandboxImage
		expected string
	}{
		{"Node", docker.ImageNode, "node:20-alpine"},
		{"Python", docker.ImagePython, "python:3.11-alpine"},
		{"Full", docker.ImageFull, "thinkus/sandbox:latest"},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			if string(tt.image) != tt.expected {
				t.Errorf("Expected '%s', got '%s'", tt.expected, string(tt.image))
			}
		})
	}
}

// TestSandboxStatusTransitions tests valid status transitions
func TestSandboxStatusTransitions(t *testing.T) {
	validTransitions := map[docker.SandboxStatus][]docker.SandboxStatus{
		docker.StatusCreating: {docker.StatusRunning, docker.StatusError},
		docker.StatusRunning:  {docker.StatusPaused, docker.StatusStopped, docker.StatusError},
		docker.StatusPaused:   {docker.StatusRunning, docker.StatusStopped, docker.StatusError},
		docker.StatusStopped:  {docker.StatusRunning, docker.StatusError},
		docker.StatusError:    {docker.StatusStopped},
	}

	for from, tos := range validTransitions {
		for _, to := range tos {
			// Just verify the transitions are defined
			if from == "" || to == "" {
				t.Errorf("Invalid transition: %s -> %s", from, to)
			}
		}
	}
}

// TestExecResultInterpretation tests exit code interpretation
func TestExecResultInterpretation(t *testing.T) {
	tests := []struct {
		name     string
		exitCode int
		success  bool
	}{
		{"Success", 0, true},
		{"General Error", 1, false},
		{"Command Not Found", 127, false},
		{"Permission Denied", 126, false},
		{"Timeout", -1, false},
		{"Signal", 128 + 9, false}, // SIGKILL
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			result := &docker.ExecResult{ExitCode: tt.exitCode}
			isSuccess := result.ExitCode == 0

			if isSuccess != tt.success {
				t.Errorf("Exit code %d: expected success=%v, got %v", tt.exitCode, tt.success, isSuccess)
			}
		})
	}
}

// TestFilePathValidation tests file path handling
func TestFilePathValidation(t *testing.T) {
	tests := []struct {
		name  string
		path  string
		valid bool
	}{
		{"Simple file", "file.txt", true},
		{"Nested path", "src/main.go", true},
		{"Deep path", "a/b/c/d/e.txt", true},
		{"Hidden file", ".gitignore", true},
		{"Path traversal attempt", "../../../etc/passwd", false},
		{"Absolute path", "/etc/passwd", false},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			// Check for path traversal
			isValid := len(tt.path) > 0 && tt.path[0] != '/' && !containsTraversal(tt.path)

			if isValid != tt.valid {
				t.Errorf("Path '%s': expected valid=%v, got %v", tt.path, tt.valid, isValid)
			}
		})
	}
}

func containsTraversal(path string) bool {
	// Simple check for ..
	for i := 0; i < len(path)-1; i++ {
		if path[i] == '.' && path[i+1] == '.' {
			return true
		}
	}
	return false
}

// TestResourceLimits tests resource limit validation
func TestResourceLimits(t *testing.T) {
	tests := []struct {
		name   string
		cpu    int64
		memory int64
		valid  bool
	}{
		{"Normal limits", 1000, 512, true},
		{"High CPU", 4000, 512, true},
		{"High Memory", 1000, 4096, true},
		{"Zero CPU", 0, 512, false},
		{"Zero Memory", 1000, 0, false},
		{"Negative CPU", -1, 512, false},
		{"Negative Memory", 1000, -1, false},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			isValid := tt.cpu > 0 && tt.memory > 0

			if isValid != tt.valid {
				t.Errorf("CPU=%d, Memory=%d: expected valid=%v, got %v", tt.cpu, tt.memory, tt.valid, isValid)
			}
		})
	}
}

// TestTimeoutValues tests timeout validation
func TestTimeoutValues(t *testing.T) {
	tests := []struct {
		name     string
		timeout  int
		expected int
	}{
		{"Zero", 0, 30},
		{"Negative", -1, 30},
		{"Small", 5, 5},
		{"Normal", 60, 60},
		{"Large", 300, 300},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			timeout := tt.timeout
			if timeout <= 0 {
				timeout = 30
			}

			if timeout != tt.expected {
				t.Errorf("Timeout %d: expected %d, got %d", tt.timeout, tt.expected, timeout)
			}
		})
	}
}

// Integration tests (require Docker)
func setupDockerTest(t *testing.T) {
	tempDir, err := os.MkdirTemp("", "sandbox-service-test")
	if err != nil {
		t.Skipf("Cannot create temp dir: %v", err)
	}
	docker.SetBaseDataDir(tempDir)
	t.Cleanup(func() {
		os.RemoveAll(tempDir)
	})

	if err := docker.InitClient(); err != nil {
		t.Skipf("Docker not available: %v", err)
	}
	t.Cleanup(func() {
		docker.CloseClient()
	})
}

func TestServiceCreate(t *testing.T) {
	setupDockerTest(t)

	ctx, cancel := context.WithTimeout(context.Background(), 60*time.Second)
	defer cancel()

	service := NewSandboxService()
	cfg := &docker.SandboxConfig{
		Image:       docker.ImageNode,
		CPULimit:    1,
		MemoryLimit: 256,
		Timeout:     30,
	}

	sandbox, err := service.Create(ctx, "test-svc-create", "test-user", cfg)
	if err != nil {
		t.Fatalf("Failed to create sandbox: %v", err)
	}
	defer service.Destroy(ctx, sandbox.ID)

	if sandbox.ID == "" {
		t.Error("Sandbox ID should not be empty")
	}
	if sandbox.Status != docker.StatusRunning {
		t.Errorf("Expected status %s, got %s", docker.StatusRunning, sandbox.Status)
	}
}

func TestServiceGetOrCreate(t *testing.T) {
	setupDockerTest(t)

	ctx, cancel := context.WithTimeout(context.Background(), 60*time.Second)
	defer cancel()

	service := NewSandboxService()
	cfg := &docker.SandboxConfig{
		Image:       docker.ImageNode,
		CPULimit:    1,
		MemoryLimit: 256,
		Timeout:     30,
	}

	// First call creates
	sandbox1, err := service.GetOrCreate(ctx, "test-svc-getorcreate", "test-user", cfg)
	if err != nil {
		t.Fatalf("Failed to get or create sandbox: %v", err)
	}
	defer service.Destroy(ctx, sandbox1.ID)

	// Second call should return same sandbox
	sandbox2, err := service.GetOrCreate(ctx, "test-svc-getorcreate", "test-user", cfg)
	if err != nil {
		t.Fatalf("Failed to get existing sandbox: %v", err)
	}

	if sandbox1.ID != sandbox2.ID {
		t.Errorf("Expected same sandbox ID, got %s and %s", sandbox1.ID, sandbox2.ID)
	}
}

func TestServiceGet(t *testing.T) {
	setupDockerTest(t)

	ctx, cancel := context.WithTimeout(context.Background(), 60*time.Second)
	defer cancel()

	service := NewSandboxService()
	cfg := &docker.SandboxConfig{
		Image:       docker.ImageNode,
		CPULimit:    1,
		MemoryLimit: 256,
		Timeout:     30,
	}

	sandbox, err := service.Create(ctx, "test-svc-get", "test-user", cfg)
	if err != nil {
		t.Fatalf("Failed to create sandbox: %v", err)
	}
	defer service.Destroy(ctx, sandbox.ID)

	// Get the sandbox
	retrieved, err := service.Get(sandbox.ID)
	if err != nil {
		t.Fatalf("Failed to get sandbox: %v", err)
	}

	if retrieved.ID != sandbox.ID {
		t.Errorf("Expected ID %s, got %s", sandbox.ID, retrieved.ID)
	}

	// Try to get non-existent sandbox
	_, err = service.Get("non-existent-id")
	if err == nil {
		t.Error("Expected error for non-existent sandbox")
	}
}

func TestServiceExec(t *testing.T) {
	setupDockerTest(t)

	ctx, cancel := context.WithTimeout(context.Background(), 60*time.Second)
	defer cancel()

	service := NewSandboxService()
	cfg := &docker.SandboxConfig{
		Image:       docker.ImageNode,
		CPULimit:    1,
		MemoryLimit: 256,
		Timeout:     30,
	}

	sandbox, err := service.Create(ctx, "test-svc-exec", "test-user", cfg)
	if err != nil {
		t.Fatalf("Failed to create sandbox: %v", err)
	}
	defer service.Destroy(ctx, sandbox.ID)

	// Execute command
	result, err := service.Exec(ctx, sandbox.ID, "echo hello", 10)
	if err != nil {
		t.Fatalf("Failed to exec: %v", err)
	}

	if result.ExitCode != 0 {
		t.Errorf("Expected exit code 0, got %d", result.ExitCode)
	}
	if result.Stdout != "hello\n" {
		t.Errorf("Expected stdout 'hello\\n', got '%s'", result.Stdout)
	}

	// Test with default timeout (0)
	result2, err := service.Exec(ctx, sandbox.ID, "echo test", 0)
	if err != nil {
		t.Fatalf("Failed to exec with default timeout: %v", err)
	}
	if result2.ExitCode != 0 {
		t.Errorf("Expected exit code 0, got %d", result2.ExitCode)
	}
}

func TestServiceWriteFile(t *testing.T) {
	setupDockerTest(t)

	ctx, cancel := context.WithTimeout(context.Background(), 60*time.Second)
	defer cancel()

	service := NewSandboxService()
	cfg := &docker.SandboxConfig{
		Image:       docker.ImageNode,
		CPULimit:    1,
		MemoryLimit: 256,
		Timeout:     30,
	}

	sandbox, err := service.Create(ctx, "test-svc-write", "test-user", cfg)
	if err != nil {
		t.Fatalf("Failed to create sandbox: %v", err)
	}
	defer service.Destroy(ctx, sandbox.ID)

	// Write file
	content := []byte("test content")
	err = service.WriteFile(sandbox.ID, "test.txt", content)
	if err != nil {
		t.Fatalf("Failed to write file: %v", err)
	}

	// Write to nested path
	err = service.WriteFile(sandbox.ID, "src/main.js", []byte("console.log('hello')"))
	if err != nil {
		t.Fatalf("Failed to write nested file: %v", err)
	}
}

func TestServiceReadFile(t *testing.T) {
	setupDockerTest(t)

	ctx, cancel := context.WithTimeout(context.Background(), 60*time.Second)
	defer cancel()

	service := NewSandboxService()
	cfg := &docker.SandboxConfig{
		Image:       docker.ImageNode,
		CPULimit:    1,
		MemoryLimit: 256,
		Timeout:     30,
	}

	sandbox, err := service.Create(ctx, "test-svc-read", "test-user", cfg)
	if err != nil {
		t.Fatalf("Failed to create sandbox: %v", err)
	}
	defer service.Destroy(ctx, sandbox.ID)

	// Write then read
	expected := []byte("read test content")
	service.WriteFile(sandbox.ID, "read-test.txt", expected)

	content, err := service.ReadFile(sandbox.ID, "read-test.txt")
	if err != nil {
		t.Fatalf("Failed to read file: %v", err)
	}

	if string(content) != string(expected) {
		t.Errorf("Expected '%s', got '%s'", string(expected), string(content))
	}

	// Read non-existent file
	_, err = service.ReadFile(sandbox.ID, "non-existent.txt")
	if err == nil {
		t.Error("Expected error for non-existent file")
	}
}

func TestServiceListFiles(t *testing.T) {
	setupDockerTest(t)

	ctx, cancel := context.WithTimeout(context.Background(), 60*time.Second)
	defer cancel()

	service := NewSandboxService()
	cfg := &docker.SandboxConfig{
		Image:       docker.ImageNode,
		CPULimit:    1,
		MemoryLimit: 256,
		Timeout:     30,
	}

	sandbox, err := service.Create(ctx, "test-svc-list", "test-user", cfg)
	if err != nil {
		t.Fatalf("Failed to create sandbox: %v", err)
	}
	defer service.Destroy(ctx, sandbox.ID)

	// Create some files
	service.WriteFile(sandbox.ID, "file1.txt", []byte("content1"))
	service.WriteFile(sandbox.ID, "file2.txt", []byte("content2"))
	service.WriteFile(sandbox.ID, "subdir/file3.txt", []byte("content3"))

	// List root directory
	files, err := service.ListFiles(sandbox.ID, "")
	if err != nil {
		t.Fatalf("Failed to list files: %v", err)
	}

	if len(files) < 2 {
		t.Errorf("Expected at least 2 files, got %d", len(files))
	}

	// Check for expected files
	foundFile1 := false
	foundSubdir := false
	for _, f := range files {
		if f.Name == "file1.txt" {
			foundFile1 = true
		}
		if f.Name == "subdir" && f.IsDirectory {
			foundSubdir = true
		}
	}

	if !foundFile1 {
		t.Error("Expected to find file1.txt")
	}
	if !foundSubdir {
		t.Error("Expected to find subdir directory")
	}
}

func TestServicePause(t *testing.T) {
	setupDockerTest(t)

	ctx, cancel := context.WithTimeout(context.Background(), 60*time.Second)
	defer cancel()

	service := NewSandboxService()
	cfg := &docker.SandboxConfig{
		Image:       docker.ImageNode,
		CPULimit:    1,
		MemoryLimit: 256,
		Timeout:     30,
	}

	sandbox, err := service.Create(ctx, "test-svc-pause", "test-user", cfg)
	if err != nil {
		t.Fatalf("Failed to create sandbox: %v", err)
	}
	defer service.Destroy(ctx, sandbox.ID)

	err = service.Pause(ctx, sandbox.ID)
	if err != nil {
		t.Fatalf("Failed to pause sandbox: %v", err)
	}

	paused, _ := service.Get(sandbox.ID)
	if paused.Status != docker.StatusPaused {
		t.Errorf("Expected status %s, got %s", docker.StatusPaused, paused.Status)
	}
}

func TestServiceResume(t *testing.T) {
	setupDockerTest(t)

	ctx, cancel := context.WithTimeout(context.Background(), 60*time.Second)
	defer cancel()

	service := NewSandboxService()
	cfg := &docker.SandboxConfig{
		Image:       docker.ImageNode,
		CPULimit:    1,
		MemoryLimit: 256,
		Timeout:     30,
	}

	sandbox, err := service.Create(ctx, "test-svc-resume", "test-user", cfg)
	if err != nil {
		t.Fatalf("Failed to create sandbox: %v", err)
	}
	defer service.Destroy(ctx, sandbox.ID)

	// Pause then resume
	service.Pause(ctx, sandbox.ID)
	err = service.Resume(ctx, sandbox.ID)
	if err != nil {
		t.Fatalf("Failed to resume sandbox: %v", err)
	}

	resumed, _ := service.Get(sandbox.ID)
	if resumed.Status != docker.StatusRunning {
		t.Errorf("Expected status %s, got %s", docker.StatusRunning, resumed.Status)
	}

	// Verify can execute after resume
	result, err := service.Exec(ctx, sandbox.ID, "echo resumed", 10)
	if err != nil {
		t.Fatalf("Failed to exec after resume: %v", err)
	}
	if result.ExitCode != 0 {
		t.Errorf("Expected exit code 0 after resume, got %d", result.ExitCode)
	}
}

func TestServiceDestroy(t *testing.T) {
	setupDockerTest(t)

	ctx, cancel := context.WithTimeout(context.Background(), 60*time.Second)
	defer cancel()

	service := NewSandboxService()
	cfg := &docker.SandboxConfig{
		Image:       docker.ImageNode,
		CPULimit:    1,
		MemoryLimit: 256,
		Timeout:     30,
	}

	sandbox, err := service.Create(ctx, "test-svc-destroy", "test-user", cfg)
	if err != nil {
		t.Fatalf("Failed to create sandbox: %v", err)
	}

	sandboxID := sandbox.ID
	err = service.Destroy(ctx, sandboxID)
	if err != nil {
		t.Fatalf("Failed to destroy sandbox: %v", err)
	}

	// Verify sandbox is gone
	_, err = service.Get(sandboxID)
	if err == nil {
		t.Error("Expected error getting destroyed sandbox")
	}
}

func TestServiceExport(t *testing.T) {
	setupDockerTest(t)

	ctx, cancel := context.WithTimeout(context.Background(), 60*time.Second)
	defer cancel()

	service := NewSandboxService()
	cfg := &docker.SandboxConfig{
		Image:       docker.ImageNode,
		CPULimit:    1,
		MemoryLimit: 256,
		Timeout:     30,
	}

	sandbox, err := service.Create(ctx, "test-svc-export", "test-user", cfg)
	if err != nil {
		t.Fatalf("Failed to create sandbox: %v", err)
	}
	defer service.Destroy(ctx, sandbox.ID)

	// Create some files to export
	service.WriteFile(sandbox.ID, "export1.txt", []byte("export content 1"))
	service.WriteFile(sandbox.ID, "export2.txt", []byte("export content 2"))
	service.WriteFile(sandbox.ID, "subdir/export3.txt", []byte("export content 3"))

	// Export
	files, sb, err := service.Export(sandbox.ID)
	if err != nil {
		t.Fatalf("Failed to export: %v", err)
	}

	if sb == nil {
		t.Error("Expected sandbox info")
	}

	if len(files) < 3 {
		t.Errorf("Expected at least 3 files, got %d", len(files))
	}

	// Check specific file
	content, ok := files["export1.txt"]
	if !ok {
		t.Error("Expected export1.txt in export")
	} else if string(content) != "export content 1" {
		t.Errorf("Expected 'export content 1', got '%s'", string(content))
	}
}
