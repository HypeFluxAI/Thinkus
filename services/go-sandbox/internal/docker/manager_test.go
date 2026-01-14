package docker

import (
	"context"
	"os"
	"path/filepath"
	"testing"
	"time"
)

// TestSandboxImageConstants tests image constants
func TestSandboxImageConstants(t *testing.T) {
	tests := []struct {
		image    SandboxImage
		expected string
	}{
		{ImageNode, "node:20-alpine"},
		{ImagePython, "python:3.11-alpine"},
		{ImageFull, "thinkus/sandbox:latest"},
	}

	for _, tt := range tests {
		if string(tt.image) != tt.expected {
			t.Errorf("Expected image '%s', got '%s'", tt.expected, string(tt.image))
		}
	}
}

// TestSandboxStatusConstants tests status constants
func TestSandboxStatusConstants(t *testing.T) {
	tests := []struct {
		status   SandboxStatus
		expected string
	}{
		{StatusCreating, "creating"},
		{StatusRunning, "running"},
		{StatusPaused, "paused"},
		{StatusStopped, "stopped"},
		{StatusError, "error"},
	}

	for _, tt := range tests {
		if string(tt.status) != tt.expected {
			t.Errorf("Expected status '%s', got '%s'", tt.expected, string(tt.status))
		}
	}
}

// TestSandboxConfigCreation tests SandboxConfig struct
func TestSandboxConfigCreation(t *testing.T) {
	config := &SandboxConfig{
		Image:       ImageNode,
		CPULimit:    1000,
		MemoryLimit: 512,
		Timeout:     300,
	}

	if config.Image != ImageNode {
		t.Errorf("Expected image '%s', got '%s'", ImageNode, config.Image)
	}

	if config.CPULimit != 1000 {
		t.Errorf("Expected CPU limit 1000, got %d", config.CPULimit)
	}

	if config.MemoryLimit != 512 {
		t.Errorf("Expected memory limit 512, got %d", config.MemoryLimit)
	}

	if config.Timeout != 300 {
		t.Errorf("Expected timeout 300, got %d", config.Timeout)
	}
}

// TestSandboxStructCreation tests Sandbox struct
func TestSandboxStructCreation(t *testing.T) {
	now := time.Now()
	sandbox := &Sandbox{
		ID:           "sb_project123_123456789",
		ContainerID:  "container123",
		ProjectID:    "project123",
		UserID:       "user123",
		Status:       StatusRunning,
		Image:        ImageNode,
		DataDir:      "/data/sandboxes/sb_project123",
		CreatedAt:    now,
		LastActiveAt: now,
	}

	if sandbox.ID != "sb_project123_123456789" {
		t.Errorf("Expected ID 'sb_project123_123456789', got '%s'", sandbox.ID)
	}

	if sandbox.Status != StatusRunning {
		t.Errorf("Expected status 'running', got '%s'", sandbox.Status)
	}
}

// TestExecResultCreation tests ExecResult struct
func TestExecResultCreation(t *testing.T) {
	result := &ExecResult{
		ExitCode: 0,
		Stdout:   "Hello, World!",
		Stderr:   "",
		Duration: 150,
	}

	if result.ExitCode != 0 {
		t.Errorf("Expected exit code 0, got %d", result.ExitCode)
	}

	if result.Stdout != "Hello, World!" {
		t.Errorf("Expected stdout 'Hello, World!', got '%s'", result.Stdout)
	}

	if result.Duration != 150 {
		t.Errorf("Expected duration 150ms, got %d", result.Duration)
	}
}

// TestExecResultError tests error ExecResult
func TestExecResultError(t *testing.T) {
	result := &ExecResult{
		ExitCode: 1,
		Stdout:   "",
		Stderr:   "Error: command not found",
		Duration: 50,
	}

	if result.ExitCode != 1 {
		t.Errorf("Expected exit code 1, got %d", result.ExitCode)
	}

	if result.Stderr != "Error: command not found" {
		t.Errorf("Expected stderr message, got '%s'", result.Stderr)
	}
}

// TestExecResultTimeout tests timeout ExecResult
func TestExecResultTimeout(t *testing.T) {
	result := &ExecResult{
		ExitCode: -1,
		Stdout:   "",
		Stderr:   "execution timeout",
		Duration: 30000,
	}

	if result.ExitCode != -1 {
		t.Errorf("Expected exit code -1 for timeout, got %d", result.ExitCode)
	}

	if result.Stderr != "execution timeout" {
		t.Errorf("Expected timeout error, got '%s'", result.Stderr)
	}
}

// TestFileInfoCreation tests FileInfo struct
func TestFileInfoCreation(t *testing.T) {
	now := time.Now()
	fileInfo := &FileInfo{
		Name:        "main.go",
		Path:        "/workspace/main.go",
		IsDirectory: false,
		Size:        1024,
		ModifiedAt:  now,
	}

	if fileInfo.Name != "main.go" {
		t.Errorf("Expected name 'main.go', got '%s'", fileInfo.Name)
	}

	if fileInfo.IsDirectory {
		t.Error("Expected file, not directory")
	}

	if fileInfo.Size != 1024 {
		t.Errorf("Expected size 1024, got %d", fileInfo.Size)
	}
}

// TestFileInfoDirectory tests FileInfo for directory
func TestFileInfoDirectory(t *testing.T) {
	fileInfo := &FileInfo{
		Name:        "src",
		Path:        "/workspace/src",
		IsDirectory: true,
		Size:        0,
		ModifiedAt:  time.Now(),
	}

	if !fileInfo.IsDirectory {
		t.Error("Expected directory")
	}
}

// TestBytesWriter tests bytesWriter helper
func TestBytesWriter(t *testing.T) {
	var buf []byte
	writer := &bytesWriter{buf: &buf}

	data := []byte("test data")
	n, err := writer.Write(data)

	if err != nil {
		t.Errorf("Unexpected error: %v", err)
	}

	if n != len(data) {
		t.Errorf("Expected %d bytes written, got %d", len(data), n)
	}

	if string(buf) != "test data" {
		t.Errorf("Expected 'test data', got '%s'", string(buf))
	}
}

// TestBytesWriterMultipleWrites tests multiple writes
func TestBytesWriterMultipleWrites(t *testing.T) {
	var buf []byte
	writer := &bytesWriter{buf: &buf}

	writer.Write([]byte("Hello, "))
	writer.Write([]byte("World!"))

	if string(buf) != "Hello, World!" {
		t.Errorf("Expected 'Hello, World!', got '%s'", string(buf))
	}
}

// File system tests (using temp directory)
func TestFileOperations(t *testing.T) {
	// Create temp directory
	tempDir, err := os.MkdirTemp("", "sandbox_test")
	if err != nil {
		t.Fatalf("Failed to create temp dir: %v", err)
	}
	defer os.RemoveAll(tempDir)

	// Test writing file
	testPath := filepath.Join(tempDir, "test.txt")
	testContent := []byte("test content")

	if err := os.WriteFile(testPath, testContent, 0644); err != nil {
		t.Fatalf("Failed to write file: %v", err)
	}

	// Test reading file
	content, err := os.ReadFile(testPath)
	if err != nil {
		t.Fatalf("Failed to read file: %v", err)
	}

	if string(content) != "test content" {
		t.Errorf("Expected 'test content', got '%s'", string(content))
	}

	// Test listing files
	entries, err := os.ReadDir(tempDir)
	if err != nil {
		t.Fatalf("Failed to read dir: %v", err)
	}

	if len(entries) != 1 {
		t.Errorf("Expected 1 entry, got %d", len(entries))
	}

	if entries[0].Name() != "test.txt" {
		t.Errorf("Expected 'test.txt', got '%s'", entries[0].Name())
	}
}

// Test nested directory creation
func TestNestedDirectoryCreation(t *testing.T) {
	tempDir, err := os.MkdirTemp("", "sandbox_test")
	if err != nil {
		t.Fatalf("Failed to create temp dir: %v", err)
	}
	defer os.RemoveAll(tempDir)

	nestedPath := filepath.Join(tempDir, "a", "b", "c", "file.txt")
	dir := filepath.Dir(nestedPath)

	if err := os.MkdirAll(dir, 0755); err != nil {
		t.Fatalf("Failed to create nested dirs: %v", err)
	}

	if err := os.WriteFile(nestedPath, []byte("nested"), 0644); err != nil {
		t.Fatalf("Failed to write to nested path: %v", err)
	}

	// Verify
	if _, err := os.Stat(nestedPath); os.IsNotExist(err) {
		t.Error("Nested file should exist")
	}
}

// TestSandboxIDGeneration tests sandbox ID format
func TestSandboxIDGeneration(t *testing.T) {
	// Simulate ID generation logic
	projectID := "project123456789"
	timestamp := time.Now().UnixNano()

	sandboxID := "sb_" + projectID[:8] + "_" + string(rune(timestamp%10000))

	if len(sandboxID) < 10 {
		t.Errorf("Sandbox ID too short: %s", sandboxID)
	}

	if sandboxID[:3] != "sb_" {
		t.Errorf("Sandbox ID should start with 'sb_', got '%s'", sandboxID)
	}
}

// Context tests
func TestContextWithTimeout(t *testing.T) {
	ctx, cancel := context.WithTimeout(context.Background(), 100*time.Millisecond)
	defer cancel()

	// Simulate work
	select {
	case <-ctx.Done():
		// Timeout occurred as expected
		if ctx.Err() != context.DeadlineExceeded {
			t.Errorf("Expected DeadlineExceeded, got %v", ctx.Err())
		}
	case <-time.After(200 * time.Millisecond):
		t.Error("Context should have timed out")
	}
}

func TestContextCancellation(t *testing.T) {
	ctx, cancel := context.WithCancel(context.Background())

	go func() {
		time.Sleep(50 * time.Millisecond)
		cancel()
	}()

	select {
	case <-ctx.Done():
		if ctx.Err() != context.Canceled {
			t.Errorf("Expected Canceled, got %v", ctx.Err())
		}
	case <-time.After(200 * time.Millisecond):
		t.Error("Context should have been canceled")
	}
}

// Memory limit conversion tests
func TestMemoryLimitConversion(t *testing.T) {
	tests := []struct {
		mb       int64
		expected int64
	}{
		{256, 256 * 1024 * 1024},
		{512, 512 * 1024 * 1024},
		{1024, 1024 * 1024 * 1024},
	}

	for _, tt := range tests {
		result := tt.mb * 1024 * 1024
		if result != tt.expected {
			t.Errorf("Expected %d bytes for %d MB, got %d", tt.expected, tt.mb, result)
		}
	}
}

// CPU limit conversion tests
func TestCPULimitConversion(t *testing.T) {
	tests := []struct {
		limit    int64
		expected int64
	}{
		{1000, 1000 * 1000000000},
		{500, 500 * 1000000000},
		{2000, 2000 * 1000000000},
	}

	for _, tt := range tests {
		result := tt.limit * 1000000000
		if result != tt.expected {
			t.Errorf("Expected %d nano CPUs for limit %d, got %d", tt.expected, tt.limit, result)
		}
	}
}

// TTL calculation tests
func TestTTLCalculation(t *testing.T) {
	ttl := time.Hour
	lastActive := time.Now().Add(-2 * time.Hour)
	now := time.Now()

	if now.Sub(lastActive) <= ttl {
		t.Error("Sandbox should be expired")
	}

	// Not expired
	lastActive = time.Now().Add(-30 * time.Minute)
	if now.Sub(lastActive) > ttl {
		t.Error("Sandbox should not be expired")
	}
}

// Benchmark tests
func BenchmarkFileWrite(b *testing.B) {
	tempDir, _ := os.MkdirTemp("", "benchmark")
	defer os.RemoveAll(tempDir)

	content := []byte("benchmark content data for testing purposes")

	for i := 0; i < b.N; i++ {
		path := filepath.Join(tempDir, "bench.txt")
		os.WriteFile(path, content, 0644)
	}
}

func BenchmarkFileRead(b *testing.B) {
	tempDir, _ := os.MkdirTemp("", "benchmark")
	defer os.RemoveAll(tempDir)

	path := filepath.Join(tempDir, "bench.txt")
	os.WriteFile(path, []byte("benchmark content"), 0644)

	for i := 0; i < b.N; i++ {
		os.ReadFile(path)
	}
}

func BenchmarkMkdirAll(b *testing.B) {
	tempDir, _ := os.MkdirTemp("", "benchmark")
	defer os.RemoveAll(tempDir)

	for i := 0; i < b.N; i++ {
		path := filepath.Join(tempDir, "a", "b", "c")
		os.MkdirAll(path, 0755)
		os.RemoveAll(filepath.Join(tempDir, "a"))
	}
}

// Integration tests (require Docker)
func skipIfNoDocker(t *testing.T) {
	// Use temp directory for tests
	tempDir, err := os.MkdirTemp("", "sandbox-test")
	if err != nil {
		t.Skipf("Cannot create temp dir: %v", err)
	}
	SetBaseDataDir(tempDir)
	t.Cleanup(func() {
		os.RemoveAll(tempDir)
	})

	if err := InitClient(); err != nil {
		t.Skipf("Docker not available: %v", err)
	}
}

func TestCreateSandbox(t *testing.T) {
	skipIfNoDocker(t)
	defer CloseClient()

	ctx, cancel := context.WithTimeout(context.Background(), 60*time.Second)
	defer cancel()

	cfg := &SandboxConfig{
		Image:       ImageNode,
		CPULimit:    1,
		MemoryLimit: 256,
		Timeout:     30,
	}

	sandbox, err := CreateSandbox(ctx, "test-project", "test-user", cfg)
	if err != nil {
		t.Fatalf("Failed to create sandbox: %v", err)
	}

	if sandbox.ID == "" {
		t.Error("Sandbox ID should not be empty")
	}
	if sandbox.Status != StatusRunning {
		t.Errorf("Expected status %s, got %s", StatusRunning, sandbox.Status)
	}

	// Cleanup
	DestroySandbox(ctx, sandbox.ID)
}

func TestExec(t *testing.T) {
	skipIfNoDocker(t)
	defer CloseClient()

	ctx, cancel := context.WithTimeout(context.Background(), 60*time.Second)
	defer cancel()

	cfg := &SandboxConfig{
		Image:       ImageNode,
		CPULimit:    1,
		MemoryLimit: 256,
		Timeout:     30,
	}

	sandbox, err := CreateSandbox(ctx, "test-exec", "test-user", cfg)
	if err != nil {
		t.Fatalf("Failed to create sandbox: %v", err)
	}
	defer DestroySandbox(ctx, sandbox.ID)

	result, err := Exec(ctx, sandbox.ID, "echo hello", 10)
	if err != nil {
		t.Fatalf("Failed to exec command: %v", err)
	}

	if result.ExitCode != 0 {
		t.Errorf("Expected exit code 0, got %d", result.ExitCode)
	}
	if result.Stdout != "hello\n" {
		t.Errorf("Expected stdout 'hello\\n', got '%s'", result.Stdout)
	}
}

func TestPauseSandbox(t *testing.T) {
	skipIfNoDocker(t)
	defer CloseClient()

	ctx, cancel := context.WithTimeout(context.Background(), 60*time.Second)
	defer cancel()

	cfg := &SandboxConfig{
		Image:       ImageNode,
		CPULimit:    1,
		MemoryLimit: 256,
		Timeout:     30,
	}

	sandbox, err := CreateSandbox(ctx, "test-pause", "test-user", cfg)
	if err != nil {
		t.Fatalf("Failed to create sandbox: %v", err)
	}
	defer DestroySandbox(ctx, sandbox.ID)

	err = PauseSandbox(ctx, sandbox.ID)
	if err != nil {
		t.Fatalf("Failed to pause sandbox: %v", err)
	}

	sb, _ := GetSandbox(sandbox.ID)
	if sb.Status != StatusPaused {
		t.Errorf("Expected status %s, got %s", StatusPaused, sb.Status)
	}
}

func TestResumeSandbox(t *testing.T) {
	skipIfNoDocker(t)
	defer CloseClient()

	ctx, cancel := context.WithTimeout(context.Background(), 60*time.Second)
	defer cancel()

	cfg := &SandboxConfig{
		Image:       ImageNode,
		CPULimit:    1,
		MemoryLimit: 256,
		Timeout:     30,
	}

	sandbox, err := CreateSandbox(ctx, "test-resume", "test-user", cfg)
	if err != nil {
		t.Fatalf("Failed to create sandbox: %v", err)
	}
	defer DestroySandbox(ctx, sandbox.ID)

	PauseSandbox(ctx, sandbox.ID)
	err = ResumeSandbox(ctx, sandbox.ID)
	if err != nil {
		t.Fatalf("Failed to resume sandbox: %v", err)
	}

	sb, _ := GetSandbox(sandbox.ID)
	if sb.Status != StatusRunning {
		t.Errorf("Expected status %s, got %s", StatusRunning, sb.Status)
	}
}

func TestDestroySandbox(t *testing.T) {
	skipIfNoDocker(t)
	defer CloseClient()

	ctx, cancel := context.WithTimeout(context.Background(), 60*time.Second)
	defer cancel()

	cfg := &SandboxConfig{
		Image:       ImageNode,
		CPULimit:    1,
		MemoryLimit: 256,
		Timeout:     30,
	}

	sandbox, err := CreateSandbox(ctx, "test-destroy", "test-user", cfg)
	if err != nil {
		t.Fatalf("Failed to create sandbox: %v", err)
	}

	err = DestroySandbox(ctx, sandbox.ID)
	if err != nil {
		t.Fatalf("Failed to destroy sandbox: %v", err)
	}

	_, err = GetSandbox(sandbox.ID)
	if err == nil {
		t.Error("Expected error when getting destroyed sandbox")
	}
}

func TestExportSandbox(t *testing.T) {
	skipIfNoDocker(t)
	defer CloseClient()

	ctx, cancel := context.WithTimeout(context.Background(), 60*time.Second)
	defer cancel()

	cfg := &SandboxConfig{
		Image:       ImageNode,
		CPULimit:    1,
		MemoryLimit: 256,
		Timeout:     30,
	}

	sandbox, err := CreateSandbox(ctx, "test-export", "test-user", cfg)
	if err != nil {
		t.Fatalf("Failed to create sandbox: %v", err)
	}
	defer DestroySandbox(ctx, sandbox.ID)

	// Write a test file
	WriteFile(sandbox.ID, "test.txt", []byte("hello world"))

	files, sb, err := ExportSandbox(sandbox.ID)
	if err != nil {
		t.Fatalf("Failed to export sandbox: %v", err)
	}

	if sb == nil {
		t.Error("Expected sandbox info in export")
	}

	content, ok := files["test.txt"]
	if !ok {
		t.Error("Expected test.txt in exported files")
	} else if string(content) != "hello world" {
		t.Errorf("Expected content 'hello world', got '%s'", string(content))
	}
}
