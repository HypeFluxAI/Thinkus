package grpc

import (
	"context"

	"github.com/thinkus/go-sandbox/internal/docker"
	"github.com/thinkus/go-sandbox/internal/services"
	common "github.com/thinkus/go-sandbox/pkg/proto/common"
	pb "github.com/thinkus/go-sandbox/pkg/proto/sandbox"
)

// SandboxServicer implements the gRPC SandboxService interface
type SandboxServicer struct {
	pb.UnimplementedSandboxServiceServer
	service *services.SandboxService
}

// NewSandboxServicer creates a new SandboxServicer
func NewSandboxServicer(svc *services.SandboxService) *SandboxServicer {
	return &SandboxServicer{service: svc}
}

// Create creates a new sandbox
func (s *SandboxServicer) Create(ctx context.Context, req *pb.CreateSandboxRequest) (*pb.Sandbox, error) {
	cfg := convertConfig(req.Config)

	sandbox, err := s.service.Create(ctx, req.ProjectId, req.UserId, cfg)
	if err != nil {
		return nil, err
	}

	return convertSandbox(sandbox), nil
}

// GetOrCreate gets existing sandbox or creates new one
func (s *SandboxServicer) GetOrCreate(ctx context.Context, req *pb.GetOrCreateRequest) (*pb.Sandbox, error) {
	cfg := convertConfig(req.Config)

	sandbox, err := s.service.GetOrCreate(ctx, req.ProjectId, req.UserId, cfg)
	if err != nil {
		return nil, err
	}

	return convertSandbox(sandbox), nil
}

// Get returns a sandbox by ID
func (s *SandboxServicer) Get(ctx context.Context, req *pb.GetSandboxRequest) (*pb.Sandbox, error) {
	sandbox, err := s.service.Get(req.SandboxId)
	if err != nil {
		return nil, err
	}

	return convertSandbox(sandbox), nil
}

// Exec executes a command in sandbox
func (s *SandboxServicer) Exec(ctx context.Context, req *pb.ExecRequest) (*pb.ExecResult, error) {
	result, err := s.service.Exec(ctx, req.SandboxId, req.Command, int(req.Timeout))
	if err != nil {
		return nil, err
	}

	return &pb.ExecResult{
		ExitCode: int32(result.ExitCode),
		Stdout:   result.Stdout,
		Stderr:   result.Stderr,
		Duration: int32(result.Duration),
	}, nil
}

// ExecStream executes a command with streaming output
func (s *SandboxServicer) ExecStream(req *pb.ExecRequest, stream pb.SandboxService_ExecStreamServer) error {
	// For now, use regular exec and send result as a single chunk
	// TODO: Implement true streaming execution
	result, err := s.service.Exec(stream.Context(), req.SandboxId, req.Command, int(req.Timeout))
	if err != nil {
		return err
	}

	// Send stdout
	if result.Stdout != "" {
		if err := stream.Send(&pb.ExecOutput{
			Type: "stdout",
			Data: result.Stdout,
		}); err != nil {
			return err
		}
	}

	// Send stderr
	if result.Stderr != "" {
		if err := stream.Send(&pb.ExecOutput{
			Type: "stderr",
			Data: result.Stderr,
		}); err != nil {
			return err
		}
	}

	// Send exit code
	return stream.Send(&pb.ExecOutput{
		Type: "exit",
		Data: string(rune(result.ExitCode)),
	})
}

// WriteFile writes a file to sandbox
func (s *SandboxServicer) WriteFile(ctx context.Context, req *pb.WriteFileRequest) (*common.Empty, error) {
	err := s.service.WriteFile(req.SandboxId, req.Path, req.Content)
	if err != nil {
		return nil, err
	}

	return &common.Empty{}, nil
}

// ReadFile reads a file from sandbox
func (s *SandboxServicer) ReadFile(ctx context.Context, req *pb.ReadFileRequest) (*pb.FileContent, error) {
	content, err := s.service.ReadFile(req.SandboxId, req.Path)
	if err != nil {
		return nil, err
	}

	return &pb.FileContent{Content: content}, nil
}

// ListFiles lists files in sandbox directory
func (s *SandboxServicer) ListFiles(ctx context.Context, req *pb.ListFilesRequest) (*pb.ListFilesResponse, error) {
	files, err := s.service.ListFiles(req.SandboxId, req.Directory)
	if err != nil {
		return nil, err
	}

	pbFiles := make([]*pb.FileInfo, len(files))
	for i, f := range files {
		pbFiles[i] = &pb.FileInfo{
			Name:        f.Name,
			Path:        f.Path,
			IsDirectory: f.IsDirectory,
			Size:        f.Size,
			ModifiedAt:  f.ModifiedAt.Unix(),
		}
	}

	return &pb.ListFilesResponse{Files: pbFiles}, nil
}

// Pause pauses a sandbox
func (s *SandboxServicer) Pause(ctx context.Context, req *pb.SandboxIdRequest) (*common.Empty, error) {
	err := s.service.Pause(ctx, req.SandboxId)
	if err != nil {
		return nil, err
	}

	return &common.Empty{}, nil
}

// Resume resumes a paused sandbox
func (s *SandboxServicer) Resume(ctx context.Context, req *pb.SandboxIdRequest) (*common.Empty, error) {
	err := s.service.Resume(ctx, req.SandboxId)
	if err != nil {
		return nil, err
	}

	return &common.Empty{}, nil
}

// Destroy destroys a sandbox
func (s *SandboxServicer) Destroy(ctx context.Context, req *pb.SandboxIdRequest) (*common.Empty, error) {
	err := s.service.Destroy(ctx, req.SandboxId)
	if err != nil {
		return nil, err
	}

	return &common.Empty{}, nil
}

// Export exports sandbox files
func (s *SandboxServicer) Export(ctx context.Context, req *pb.SandboxIdRequest) (*pb.ExportResponse, error) {
	files, sandbox, err := s.service.Export(req.SandboxId)
	if err != nil {
		return nil, err
	}

	exportedFiles := make([]*pb.ExportedFile, 0, len(files))
	for path, content := range files {
		exportedFiles = append(exportedFiles, &pb.ExportedFile{
			Path:    path,
			Content: content,
		})
	}

	return &pb.ExportResponse{
		Files:   exportedFiles,
		Sandbox: convertSandbox(sandbox),
	}, nil
}

// SubscribeEvents subscribes to sandbox events
func (s *SandboxServicer) SubscribeEvents(req *pb.SandboxIdRequest, stream pb.SandboxService_SubscribeEventsServer) error {
	// TODO: Implement event subscription
	// For now, just keep the connection open until context is done
	<-stream.Context().Done()
	return nil
}

// Helper functions

func convertConfig(cfg *pb.SandboxConfig) *docker.SandboxConfig {
	if cfg == nil {
		return &docker.SandboxConfig{
			Image:       docker.ImageNode,
			CPULimit:    1000,
			MemoryLimit: 512,
			Timeout:     3600,
		}
	}

	image := docker.SandboxImage(cfg.Image)
	if cfg.Image == "" {
		image = docker.ImageNode
	}

	cpuLimit := cfg.CpuLimit
	if cpuLimit == 0 {
		cpuLimit = 1000
	}

	memoryLimit := cfg.MemoryLimit
	if memoryLimit == 0 {
		memoryLimit = 512
	}

	timeout := cfg.Timeout
	if timeout == 0 {
		timeout = 3600
	}

	return &docker.SandboxConfig{
		Image:       image,
		CPULimit:    int64(cpuLimit),
		MemoryLimit: int64(memoryLimit),
		Timeout:     int(timeout),
	}
}

func convertSandbox(s *docker.Sandbox) *pb.Sandbox {
	if s == nil {
		return nil
	}

	return &pb.Sandbox{
		Id:           s.ID,
		ProjectId:    s.ProjectID,
		UserId:       s.UserID,
		Status:       string(s.Status),
		Image:        string(s.Image),
		CreatedAt:    s.CreatedAt.Unix(),
		LastActiveAt: s.LastActiveAt.Unix(),
	}
}
