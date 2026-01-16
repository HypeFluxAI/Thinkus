package docker

import (
	"context"
	"fmt"
	"io"
	"os"
	"path/filepath"
	"sync"
	"time"

	"github.com/docker/docker/api/types"
	"github.com/docker/docker/api/types/container"
	"github.com/docker/docker/client"
	"github.com/docker/docker/pkg/stdcopy"
	"github.com/docker/go-connections/nat"
)

// SandboxImage represents available sandbox images
type SandboxImage string

const (
	ImageNode      SandboxImage = "node:20-alpine"
	ImagePython    SandboxImage = "python:3.11-alpine"
	ImageFull      SandboxImage = "thinkus/sandbox:latest"
	ImageClaudeCode SandboxImage = "thinkus/claude-code:latest"
)

// SandboxStatus represents the status of a sandbox
type SandboxStatus string

const (
	StatusCreating SandboxStatus = "creating"
	StatusRunning  SandboxStatus = "running"
	StatusPaused   SandboxStatus = "paused"
	StatusStopped  SandboxStatus = "stopped"
	StatusError    SandboxStatus = "error"
)

// SandboxConfig holds sandbox configuration
type SandboxConfig struct {
	Image       SandboxImage
	CPULimit    int64 // CPU quota (1000 = 1 CPU)
	MemoryLimit int64 // Memory limit in MB
	Timeout     int   // Timeout in seconds
}

// Sandbox represents a sandbox instance
type Sandbox struct {
	ID           string
	ContainerID  string
	ProjectID    string
	UserID       string
	Status       SandboxStatus
	Image        SandboxImage
	DataDir      string
	CreatedAt    time.Time
	LastActiveAt time.Time
}

// ExecResult holds command execution result
type ExecResult struct {
	ExitCode int
	Stdout   string
	Stderr   string
	Duration int // milliseconds
}

// FileInfo holds file information
type FileInfo struct {
	Name        string
	Path        string
	IsDirectory bool
	Size        int64
	ModifiedAt  time.Time
}

var (
	dockerClient *client.Client
	sandboxes    = make(map[string]*Sandbox)
	mu           sync.RWMutex
	baseDataDir  = "/data/sandboxes"

	// imageMapping maps short names to full image names
	imageMapping = map[string]SandboxImage{
		"node":        ImageNode,
		"python":      ImagePython,
		"full":        ImageFull,
		"claude-code": ImageClaudeCode,
	}
)

// SetBaseDataDir sets the base data directory (for testing)
func SetBaseDataDir(dir string) {
	baseDataDir = dir
}

// InitClient initializes Docker client
func InitClient() error {
	cli, err := client.NewClientWithOpts(client.FromEnv, client.WithAPIVersionNegotiation())
	if err != nil {
		return err
	}
	dockerClient = cli

	// Ensure data directory exists
	if err := os.MkdirAll(baseDataDir, 0755); err != nil {
		return err
	}

	return nil
}

// CloseClient closes Docker client
func CloseClient() {
	if dockerClient != nil {
		dockerClient.Close()
	}
}

// CreateSandbox creates a new sandbox
func CreateSandbox(ctx context.Context, projectID, userID string, cfg *SandboxConfig) (*Sandbox, error) {
	mu.Lock()
	defer mu.Unlock()

	// Generate sandbox ID
	sandboxID := fmt.Sprintf("sb_%s_%d", projectID[:8], time.Now().UnixNano())

	// Create data directory
	dataDir := filepath.Join(baseDataDir, sandboxID)
	if err := os.MkdirAll(dataDir, 0755); err != nil {
		return nil, err
	}

	// Resolve image name (support short names like "claude-code")
	imageName := string(cfg.Image)
	if cfg.Image == "" {
		imageName = string(ImageNode)
	} else if mappedImage, ok := imageMapping[string(cfg.Image)]; ok {
		imageName = string(mappedImage)
	}

	// Create container config
	containerConfig := &container.Config{
		Image:        imageName,
		Tty:          true,
		AttachStdout: true,
		AttachStderr: true,
		WorkingDir:   "/workspace",
		Cmd:          []string{"/bin/sh"},
	}

	// Inject ANTHROPIC_API_KEY for Claude Code containers
	if imageName == string(ImageClaudeCode) {
		apiKey := os.Getenv("ANTHROPIC_API_KEY")
		if apiKey != "" {
			containerConfig.Env = []string{
				fmt.Sprintf("ANTHROPIC_API_KEY=%s", apiKey),
			}
		}
	}

	hostConfig := &container.HostConfig{
		Binds: []string{
			fmt.Sprintf("%s:/workspace", dataDir),
		},
		Resources: container.Resources{
			Memory:   cfg.MemoryLimit * 1024 * 1024, // Convert MB to bytes
			NanoCPUs: cfg.CPULimit * 1000000000,     // Convert to nano CPUs
		},
		PortBindings: nat.PortMap{},
	}

	resp, err := dockerClient.ContainerCreate(ctx, containerConfig, hostConfig, nil, nil, sandboxID)
	if err != nil {
		return nil, err
	}

	// Start container
	if err := dockerClient.ContainerStart(ctx, resp.ID, container.StartOptions{}); err != nil {
		dockerClient.ContainerRemove(ctx, resp.ID, container.RemoveOptions{Force: true})
		return nil, err
	}

	sandbox := &Sandbox{
		ID:           sandboxID,
		ContainerID:  resp.ID,
		ProjectID:    projectID,
		UserID:       userID,
		Status:       StatusRunning,
		Image:        cfg.Image,
		DataDir:      dataDir,
		CreatedAt:    time.Now(),
		LastActiveAt: time.Now(),
	}

	sandboxes[sandboxID] = sandbox
	return sandbox, nil
}

// GetSandbox returns a sandbox by ID
func GetSandbox(sandboxID string) (*Sandbox, error) {
	mu.RLock()
	defer mu.RUnlock()

	sandbox, ok := sandboxes[sandboxID]
	if !ok {
		return nil, fmt.Errorf("sandbox not found: %s", sandboxID)
	}
	return sandbox, nil
}

// GetOrCreateSandbox gets existing sandbox or creates new one
func GetOrCreateSandbox(ctx context.Context, projectID, userID string, cfg *SandboxConfig) (*Sandbox, error) {
	mu.RLock()
	for _, sb := range sandboxes {
		if sb.ProjectID == projectID && sb.UserID == userID && sb.Status == StatusRunning {
			mu.RUnlock()
			sb.LastActiveAt = time.Now()
			return sb, nil
		}
	}
	mu.RUnlock()

	return CreateSandbox(ctx, projectID, userID, cfg)
}

// Exec executes a command in sandbox
func Exec(ctx context.Context, sandboxID, command string, timeout int) (*ExecResult, error) {
	sandbox, err := GetSandbox(sandboxID)
	if err != nil {
		return nil, err
	}

	sandbox.LastActiveAt = time.Now()

	// Create exec instance
	execConfig := types.ExecConfig{
		Cmd:          []string{"/bin/sh", "-c", command},
		AttachStdout: true,
		AttachStderr: true,
	}

	execResp, err := dockerClient.ContainerExecCreate(ctx, sandbox.ContainerID, execConfig)
	if err != nil {
		return nil, err
	}

	// Start exec
	startTime := time.Now()
	attachResp, err := dockerClient.ContainerExecAttach(ctx, execResp.ID, types.ExecStartCheck{})
	if err != nil {
		return nil, err
	}
	defer attachResp.Close()

	// Read output with timeout
	timeoutCtx, cancel := context.WithTimeout(ctx, time.Duration(timeout)*time.Second)
	defer cancel()

	var stdout, stderr []byte
	done := make(chan error, 1)

	go func() {
		stdout, stderr, err = readExecOutput(attachResp.Reader)
		done <- err
	}()

	select {
	case <-timeoutCtx.Done():
		return &ExecResult{
			ExitCode: -1,
			Stdout:   string(stdout),
			Stderr:   "execution timeout",
			Duration: int(time.Since(startTime).Milliseconds()),
		}, nil
	case err := <-done:
		if err != nil && err != io.EOF {
			return nil, err
		}
	}

	// Get exit code
	inspectResp, err := dockerClient.ContainerExecInspect(ctx, execResp.ID)
	if err != nil {
		return nil, err
	}

	return &ExecResult{
		ExitCode: inspectResp.ExitCode,
		Stdout:   string(stdout),
		Stderr:   string(stderr),
		Duration: int(time.Since(startTime).Milliseconds()),
	}, nil
}

// WriteFile writes a file to sandbox
func WriteFile(sandboxID, path string, content []byte) error {
	sandbox, err := GetSandbox(sandboxID)
	if err != nil {
		return err
	}

	sandbox.LastActiveAt = time.Now()

	fullPath := filepath.Join(sandbox.DataDir, path)
	dir := filepath.Dir(fullPath)

	if err := os.MkdirAll(dir, 0755); err != nil {
		return err
	}

	return os.WriteFile(fullPath, content, 0644)
}

// ReadFile reads a file from sandbox
func ReadFile(sandboxID, path string) ([]byte, error) {
	sandbox, err := GetSandbox(sandboxID)
	if err != nil {
		return nil, err
	}

	sandbox.LastActiveAt = time.Now()

	fullPath := filepath.Join(sandbox.DataDir, path)
	return os.ReadFile(fullPath)
}

// ListFiles lists files in sandbox directory
func ListFiles(sandboxID, directory string) ([]FileInfo, error) {
	sandbox, err := GetSandbox(sandboxID)
	if err != nil {
		return nil, err
	}

	sandbox.LastActiveAt = time.Now()

	fullPath := filepath.Join(sandbox.DataDir, directory)
	entries, err := os.ReadDir(fullPath)
	if err != nil {
		return nil, err
	}

	var files []FileInfo
	for _, entry := range entries {
		info, err := entry.Info()
		if err != nil {
			continue
		}

		files = append(files, FileInfo{
			Name:        entry.Name(),
			Path:        filepath.Join(directory, entry.Name()),
			IsDirectory: entry.IsDir(),
			Size:        info.Size(),
			ModifiedAt:  info.ModTime(),
		})
	}

	return files, nil
}

// PauseSandbox pauses a sandbox
func PauseSandbox(ctx context.Context, sandboxID string) error {
	sandbox, err := GetSandbox(sandboxID)
	if err != nil {
		return err
	}

	if err := dockerClient.ContainerPause(ctx, sandbox.ContainerID); err != nil {
		return err
	}

	sandbox.Status = StatusPaused
	return nil
}

// ResumeSandbox resumes a paused sandbox
func ResumeSandbox(ctx context.Context, sandboxID string) error {
	sandbox, err := GetSandbox(sandboxID)
	if err != nil {
		return err
	}

	if err := dockerClient.ContainerUnpause(ctx, sandbox.ContainerID); err != nil {
		return err
	}

	sandbox.Status = StatusRunning
	sandbox.LastActiveAt = time.Now()
	return nil
}

// DestroySandbox destroys a sandbox
func DestroySandbox(ctx context.Context, sandboxID string) error {
	mu.Lock()
	defer mu.Unlock()

	sandbox, ok := sandboxes[sandboxID]
	if !ok {
		return fmt.Errorf("sandbox not found: %s", sandboxID)
	}

	// Remove container
	if err := dockerClient.ContainerRemove(ctx, sandbox.ContainerID, container.RemoveOptions{Force: true}); err != nil {
		// Log but continue
		fmt.Printf("Failed to remove container: %v\n", err)
	}

	// Remove data directory
	if err := os.RemoveAll(sandbox.DataDir); err != nil {
		fmt.Printf("Failed to remove data directory: %v\n", err)
	}

	delete(sandboxes, sandboxID)
	return nil
}

// ExportSandbox exports sandbox files
func ExportSandbox(sandboxID string) (map[string][]byte, *Sandbox, error) {
	sandbox, err := GetSandbox(sandboxID)
	if err != nil {
		return nil, nil, err
	}

	files := make(map[string][]byte)

	err = filepath.Walk(sandbox.DataDir, func(path string, info os.FileInfo, err error) error {
		if err != nil {
			return err
		}

		if !info.IsDir() {
			relPath, _ := filepath.Rel(sandbox.DataDir, path)
			content, err := os.ReadFile(path)
			if err != nil {
				return err
			}
			files[relPath] = content
		}

		return nil
	})

	if err != nil {
		return nil, nil, err
	}

	return files, sandbox, nil
}

// StartCleanupWorker starts background cleanup worker
func StartCleanupWorker(ctx context.Context) {
	ticker := time.NewTicker(5 * time.Minute)
	defer ticker.Stop()

	for {
		select {
		case <-ctx.Done():
			return
		case <-ticker.C:
			cleanupExpiredSandboxes(ctx)
		}
	}
}

func cleanupExpiredSandboxes(ctx context.Context) {
	mu.RLock()
	var toDelete []string
	now := time.Now()
	ttl := time.Hour // 1 hour TTL

	for id, sandbox := range sandboxes {
		if now.Sub(sandbox.LastActiveAt) > ttl {
			toDelete = append(toDelete, id)
		}
	}
	mu.RUnlock()

	for _, id := range toDelete {
		DestroySandbox(ctx, id)
	}
}

func readExecOutput(reader io.Reader) ([]byte, []byte, error) {
	var stdout, stderr []byte
	outWriter := &bytesWriter{buf: &stdout}
	errWriter := &bytesWriter{buf: &stderr}

	_, err := stdcopy.StdCopy(outWriter, errWriter, reader)
	return stdout, stderr, err
}

type bytesWriter struct {
	buf *[]byte
}

func (w *bytesWriter) Write(p []byte) (int, error) {
	*w.buf = append(*w.buf, p...)
	return len(p), nil
}

// PullImage pulls a Docker image
func PullImage(ctx context.Context, imageName string) error {
	reader, err := dockerClient.ImagePull(ctx, imageName, types.ImagePullOptions{})
	if err != nil {
		return err
	}
	defer reader.Close()

	// Read to completion
	_, err = io.Copy(io.Discard, reader)
	return err
}
