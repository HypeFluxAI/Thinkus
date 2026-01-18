# Go Orchestrator Service

> 三层架构的核心调度中心 - 任务调度、契约管理、工作流编排

## 功能特性

### 1. 任务调度器 (TaskScheduler)
- 依赖分析和分组
- 并行任务执行（goroutine）
- 任务状态管理
- Worker池管理

### 2. 契约管理器 (ContractManager)
- 接口契约CRUD
- 契约验证
- 基于Feature自动生成契约
- 契约版本管理

### 3. 工作流编排器 (Orchestrator)
- 8阶段开发流程
- 自动流转和依赖处理
- 各阶段状态追踪

## 8阶段工作流

```
1. 需求分析 (Mike PM)
2. 设计确认 (Elena UX)
3. 架构规划 (David Tech)
4. 开发实现 (All)
5. 测试验证 (Kevin QA)
6. UI验收 (Mike PM)
7. 部署上线 (Frank DevOps)
8. 运维支持 (All)
```

## 架构

```
┌─────────────────────────────────────┐
│     Go Orchestrator (Port 8100)     │
├─────────────────────────────────────┤
│  HTTP API        gRPC (Port 50060)  │
├─────────────────────────────────────┤
│  TaskScheduler   ContractManager    │
│  WorkflowOrch    AI Client          │
└─────────────────────────────────────┘
         ↓                    ↓
    MongoDB              Python AI Engine
```

## API 端点

### HTTP API (Port 8100)

```
GET  /health                      - 健康检查
GET  /api/v1/tasks                - 列出任务
POST /api/v1/tasks/schedule       - 调度任务
GET  /api/v1/contracts            - 列出契约
POST /api/v1/contracts/create     - 创建契约
POST /api/v1/workflow/start       - 启动工作流
```

### gRPC (Port 50060)
- TaskService
- ContractService
- WorkflowService

## 环境变量

```bash
PORT=8100                         # HTTP端口
GRPC_PORT=50060                   # gRPC端口
MONGODB_URI=mongodb://...         # MongoDB连接
MONGODB_DB=thinkus                # 数据库名
REDIS_URL=redis://localhost:6379  # Redis连接
AI_ENGINE_URL=localhost:50054     # AI引擎地址
ENV=development                   # 环境
```

## 本地开发

```bash
# 安装依赖
go mod download

# 运行服务
go run cmd/server/main.go

# 热重载开发（需要安装air）
air

# 构建
go build -o orchestrator cmd/server/main.go
```

## Docker

```bash
# 构建镜像
docker build -t thinkus/go-orchestrator .

# 运行容器
docker run -p 8100:8100 -p 50060:50060 \
  -e MONGODB_URI=mongodb://... \
  thinkus/go-orchestrator
```

## 测试

```bash
# 健康检查
curl http://localhost:8100/health

# 启动工作流
curl -X POST http://localhost:8100/api/v1/workflow/start
```

## 开发状态

- [x] TaskScheduler基础实现
- [x] ContractManager基础实现
- [x] WorkflowOrchestrator基础实现
- [x] HTTP API
- [ ] gRPC服务端
- [ ] 与Python AI Engine的gRPC通信
- [ ] 完整的依赖分析算法
- [ ] 异步任务回调
- [ ] 完整的错误处理和重试
