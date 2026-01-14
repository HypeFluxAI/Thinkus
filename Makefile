.PHONY: all build dev stop clean proto test

# 默认目标
all: build

# 构建所有服务
build:
	docker-compose build

# 启动开发环境
dev:
	docker-compose -f docker-compose.dev.yml up -d

# 启动生产环境
up:
	docker-compose up -d

# 停止所有服务
stop:
	docker-compose down
	docker-compose -f docker-compose.dev.yml down

# 查看日志
logs:
	docker-compose logs -f

logs-dev:
	docker-compose -f docker-compose.dev.yml logs -f

# 清理
clean:
	docker-compose down -v
	docker-compose -f docker-compose.dev.yml down -v
	rm -rf services/py-service/src/proto/*.py
	rm -rf services/go-analytics/pkg/proto/*.go
	rm -rf services/go-sandbox/pkg/proto/*.go

# 生成 Proto 文件
proto:
	# Python
	cd services/py-service && \
		python -m grpc_tools.protoc \
			-I../proto \
			--python_out=./src/proto \
			--grpc_python_out=./src/proto \
			../proto/*.proto

	# Go Analytics
	cd services/go-analytics && \
		protoc --go_out=./pkg/proto --go-grpc_out=./pkg/proto \
			-I../proto ../proto/*.proto

	# Go Sandbox
	cd services/go-sandbox && \
		protoc --go_out=./pkg/proto --go-grpc_out=./pkg/proto \
			-I../proto ../proto/*.proto

# 运行测试
test:
	cd thinkus-app && pnpm test
	cd services/py-service && pytest
	cd services/go-analytics && go test ./...
	cd services/go-sandbox && go test ./...

# 安装依赖
install:
	cd thinkus-app && pnpm install
	cd services/py-service && pip install -r requirements.txt
	cd services/go-analytics && go mod download
	cd services/go-sandbox && go mod download

# 拉取 Docker 镜像
pull:
	docker pull python:3.11-slim
	docker pull golang:1.22-alpine
	docker pull node:20-alpine
	docker pull redis:7-alpine

# 健康检查
health:
	@echo "Checking services..."
	@curl -s http://localhost:3000/api/health || echo "App: DOWN"
	@curl -s http://localhost:8000/health || echo "Py-Service: DOWN"
	@echo "Done."
