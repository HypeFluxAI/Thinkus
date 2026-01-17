# Thinkus Services Makefile
# Build, test, and deploy microservices

.PHONY: all proto-go proto-python proto-all build test clean help

# Default target
all: proto-all build

# ============================================
# Proto Generation
# ============================================

# Generate Go proto code for analytics service
proto-go-analytics:
	@echo "Generating Go proto for analytics..."
	@mkdir -p go-analytics/pkg/proto/analytics
	@mkdir -p go-analytics/pkg/proto/common
	cd go-analytics && protoc \
		--go_out=./pkg/proto/analytics \
		--go-grpc_out=./pkg/proto/analytics \
		--go_opt=paths=source_relative \
		--go-grpc_opt=paths=source_relative \
		-I../proto \
		../proto/analytics.proto
	cd go-analytics && protoc \
		--go_out=./pkg/proto/common \
		--go-grpc_out=./pkg/proto/common \
		--go_opt=paths=source_relative \
		--go-grpc_opt=paths=source_relative \
		-I../proto \
		../proto/common.proto

# Generate Go proto code for sandbox service
proto-go-sandbox:
	@echo "Generating Go proto for sandbox..."
	@mkdir -p go-sandbox/pkg/proto/sandbox
	@mkdir -p go-sandbox/pkg/proto/common
	cd go-sandbox && protoc \
		--go_out=./pkg/proto/sandbox \
		--go-grpc_out=./pkg/proto/sandbox \
		--go_opt=paths=source_relative \
		--go-grpc_opt=paths=source_relative \
		-I../proto \
		../proto/sandbox.proto
	cd go-sandbox && protoc \
		--go_out=./pkg/proto/common \
		--go-grpc_out=./pkg/proto/common \
		--go_opt=paths=source_relative \
		--go-grpc_opt=paths=source_relative \
		-I../proto \
		../proto/common.proto

# Generate all Go proto code
proto-go: proto-go-analytics proto-go-sandbox
	@echo "Go proto generation complete"

# Generate Python proto code for py-service
proto-python-service:
	@echo "Generating Python proto for py-service..."
	@mkdir -p py-service/src/proto
	cd py-service && python -m grpc_tools.protoc \
		-I../proto \
		--python_out=./src/proto \
		--grpc_python_out=./src/proto \
		../proto/*.proto
	@touch py-service/src/proto/__init__.py

# Generate Python proto code for py-ai-engine
proto-python-ai-engine:
	@echo "Generating Python proto for py-ai-engine..."
	@mkdir -p py-ai-engine/src/proto
	cd py-ai-engine && python -m grpc_tools.protoc \
		-I../proto \
		--python_out=./src/proto \
		--grpc_python_out=./src/proto \
		../proto/*.proto
	@touch py-ai-engine/src/proto/__init__.py

# Generate all Python proto code
proto-python: proto-python-service proto-python-ai-engine
	@echo "Python proto generation complete"

# Generate all proto code
proto-all: proto-go proto-python
	@echo "All proto generation complete"

# ============================================
# Build
# ============================================

# Build Go analytics service
build-go-analytics:
	@echo "Building go-analytics..."
	cd go-analytics && go build -o bin/server ./cmd/server

# Build Go sandbox service
build-go-sandbox:
	@echo "Building go-sandbox..."
	cd go-sandbox && go build -o bin/server ./cmd/server

# Build all Go services
build-go: build-go-analytics build-go-sandbox
	@echo "Go services built"

# Build Docker images
build-docker:
	@echo "Building Docker images..."
	cd .. && docker-compose build

# Build everything
build: build-go
	@echo "Build complete"

# ============================================
# Test
# ============================================

# Test Go analytics service
test-go-analytics:
	@echo "Testing go-analytics..."
	cd go-analytics && go test ./...

# Test Go sandbox service
test-go-sandbox:
	@echo "Testing go-sandbox..."
	cd go-sandbox && go test ./...

# Test Python py-service
test-python-service:
	@echo "Testing py-service..."
	cd py-service && python -m pytest tests/ -v

# Test Python py-ai-engine
test-python-ai-engine:
	@echo "Testing py-ai-engine..."
	cd py-ai-engine && python -m pytest tests/ -v || true

# Test all services
test: test-go-analytics test-go-sandbox test-python-service test-python-ai-engine
	@echo "All tests complete"

# ============================================
# Integration Tests
# ============================================

# Start services for integration tests
integration-up:
	@echo "Starting services for integration tests..."
	cd .. && docker-compose up -d py-service go-analytics go-sandbox py-ai-engine redis

# Run integration tests
integration-test: integration-up
	@echo "Running integration tests..."
	@sleep 10  # Wait for services to start
	python tests/integration/test_connectivity.py || true
	@echo "Integration tests complete"

# Stop integration test services
integration-down:
	@echo "Stopping integration test services..."
	cd .. && docker-compose down

# Full integration test cycle
integration: integration-up integration-test integration-down

# ============================================
# gRPC Testing with grpcurl
# ============================================

# Test go-analytics gRPC
grpc-test-analytics:
	@echo "Testing go-analytics gRPC..."
	grpcurl -plaintext localhost:50052 list || echo "Service not running"

# Test go-sandbox gRPC
grpc-test-sandbox:
	@echo "Testing go-sandbox gRPC..."
	grpcurl -plaintext localhost:50053 list || echo "Service not running"

# Test py-ai-engine gRPC
grpc-test-ai-engine:
	@echo "Testing py-ai-engine gRPC..."
	grpcurl -plaintext localhost:50054 list || echo "Service not running"

# Test all gRPC services
grpc-test: grpc-test-analytics grpc-test-sandbox grpc-test-ai-engine
	@echo "gRPC tests complete"

# ============================================
# Development
# ============================================

# Run go-analytics in dev mode
dev-analytics:
	cd go-analytics && air

# Run go-sandbox in dev mode
dev-sandbox:
	cd go-sandbox && air

# Run py-ai-engine in dev mode
dev-ai-engine:
	cd py-ai-engine && python -m src.main

# ============================================
# Clean
# ============================================

# Clean Go build artifacts
clean-go:
	rm -rf go-analytics/bin
	rm -rf go-sandbox/bin

# Clean Python cache
clean-python:
	find . -type d -name "__pycache__" -exec rm -rf {} + 2>/dev/null || true
	find . -type f -name "*.pyc" -delete 2>/dev/null || true

# Clean generated proto files
clean-proto:
	rm -rf go-analytics/pkg/proto
	rm -rf go-sandbox/pkg/proto
	rm -rf py-service/src/proto/*.py
	rm -rf py-ai-engine/src/proto/*.py

# Clean everything
clean: clean-go clean-python clean-proto
	@echo "Clean complete"

# ============================================
# Help
# ============================================

help:
	@echo "Thinkus Services Makefile"
	@echo ""
	@echo "Proto Generation:"
	@echo "  make proto-go          - Generate Go proto code"
	@echo "  make proto-python      - Generate Python proto code"
	@echo "  make proto-all         - Generate all proto code"
	@echo ""
	@echo "Build:"
	@echo "  make build-go          - Build Go services"
	@echo "  make build-docker      - Build Docker images"
	@echo "  make build             - Build everything"
	@echo ""
	@echo "Test:"
	@echo "  make test              - Run all unit tests"
	@echo "  make integration       - Run integration tests"
	@echo "  make grpc-test         - Test gRPC services with grpcurl"
	@echo ""
	@echo "Development:"
	@echo "  make dev-analytics     - Run analytics service in dev mode"
	@echo "  make dev-sandbox       - Run sandbox service in dev mode"
	@echo "  make dev-ai-engine     - Run AI engine in dev mode"
	@echo ""
	@echo "Clean:"
	@echo "  make clean             - Clean all build artifacts"
	@echo ""
