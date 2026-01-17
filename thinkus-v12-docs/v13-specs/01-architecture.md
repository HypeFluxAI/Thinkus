# Thinkus v13 - 三层技术架构

> Go编排层 + Python AI执行层 + Node.js前端层

---

## 基本信息

| 字段 | 值 |
|------|-----|
| 功能名称 | 三层技术架构 |
| 优先级 | P0 |
| 预估复杂度 | 复杂 |
| 关联模块 | 全平台基础设施 |

---

## 1. 架构概览

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                                                                              │
│  Layer 1: Go 编排层 (调度中心)                                              │
│  ─────────────────────────────                                              │
│  • Gin/Fiber 框架                                                            │
│  • gRPC 通信                                                                 │
│  • 任务调度 (goroutine并发)                                                  │
│  • 接口契约管理                                                              │
│  • 版本快照                                                                  │
│                                                                              │
│  Layer 2: Python AI执行层 (FastAPI + gRPC)                                  │
│  ─────────────────────────────────────────                                  │
│  • AI员工引擎                                                                │
│  • Claude API调用                                                            │
│  • Browser Use (UI验收)                                                      │
│  • 代码生成/测试                                                             │
│                                                                              │
│  Layer 3: Node.js 前端层                                                    │
│  ────────────────────────                                                   │
│  • Next.js 14 (App Router)                                                  │
│  • tRPC API                                                                 │
│  • 实时WebSocket                                                            │
│                                                                              │
└─────────────────────────────────────────────────────────────────────────────┘
```

---

## 2. 技术栈详情

### 2.1 前端技术栈

```yaml
框架: Next.js 14 (App Router)
语言: TypeScript
样式: TailwindCSS
组件库: shadcn/ui
状态管理: Zustand
实时通信: Socket.io / WebSocket
代码编辑: Monaco Editor
```

### 2.2 后端技术栈

```yaml
Node.js层:
  框架: Next.js API Routes + tRPC
  认证: NextAuth.js
  任务队列: BullMQ

Go层:
  框架: Gin / Fiber
  通信: gRPC
  调度: goroutine并发

Python层:
  框架: FastAPI
  AI SDK: Anthropic SDK
  浏览器: Browser Use
  测试: pytest
```

### 2.3 数据存储

```yaml
主数据库: PostgreSQL (结构化数据)
缓存: Redis (会话、队列)
向量库: Pinecone (记忆检索)
文件存储: Cloudflare R2 / S3
```

### 2.4 AI模型

```yaml
核心分析: Claude Opus (重要决策)
常规任务: Claude Sonnet (日常开发)
快速判断: Claude Haiku (调度、分类)
```

### 2.5 监控分析

```yaml
用户行为: PostHog
错误追踪: Sentry
日志: 自建 / Datadog
```

### 2.6 部署

```yaml
平台: Vercel (前端) + Railway/Fly.io (后端)
容器: Docker + Kubernetes
CDN: Cloudflare
```

---

## 3. Go 编排层详情

### 3.1 核心职责

```yaml
任务调度:
  - 接收用户请求
  - 分解任务
  - 分配给AI员工
  - 并行执行管理
  - 结果汇总

接口契约:
  - 契约生成和存储
  - 契约版本管理
  - 跨模块契约同步

版本控制:
  - 代码快照
  - 回滚支持
  - 变更追踪
```

### 3.2 核心组件

```go
// TaskScheduler - 任务调度器
type TaskScheduler struct {
    workers    map[string]*Worker
    taskQueue  chan *Task
    resultChan chan *Result
}

func (s *TaskScheduler) Schedule(task *Task) {
    // 1. 分析任务依赖
    deps := s.analyzeDependencies(task)

    // 2. 分组执行 (组内并行，组间串行)
    groups := s.groupByDependency(deps)

    for _, group := range groups {
        var wg sync.WaitGroup
        for _, subtask := range group {
            wg.Add(1)
            go func(t *Task) {
                defer wg.Done()
                s.executeTask(t)
            }(subtask)
        }
        wg.Wait()
    }
}

// ContractManager - 契约管理器
type ContractManager struct {
    contracts map[string]*InterfaceContract
    versions  map[string][]*ContractVersion
}

func (m *ContractManager) CreateContract(feature *Feature) *InterfaceContract {
    contract := &InterfaceContract{
        FeatureID:   feature.ID,
        FeatureName: feature.Name,
        API:         m.generateAPIContract(feature),
        Database:    m.generateDBContract(feature),
        Frontend:    m.generateFEContract(feature),
        CreatedAt:   time.Now(),
    }
    m.contracts[feature.ID] = contract
    return contract
}
```

### 3.3 gRPC 服务定义

```protobuf
syntax = "proto3";

package thinkus;

service TaskService {
    rpc SubmitTask(TaskRequest) returns (TaskResponse);
    rpc GetTaskStatus(TaskStatusRequest) returns (TaskStatusResponse);
    rpc CancelTask(CancelTaskRequest) returns (CancelTaskResponse);
}

service ContractService {
    rpc CreateContract(CreateContractRequest) returns (Contract);
    rpc GetContract(GetContractRequest) returns (Contract);
    rpc UpdateContract(UpdateContractRequest) returns (Contract);
}

message TaskRequest {
    string project_id = 1;
    string feature_id = 2;
    string task_type = 3;  // develop, test, deploy
    map<string, string> params = 4;
}

message Contract {
    string feature_id = 1;
    string feature_name = 2;
    APIContract api = 3;
    DatabaseContract database = 4;
    FrontendContract frontend = 5;
}
```

---

## 4. Python AI执行层详情

### 4.1 核心职责

```yaml
AI员工引擎:
  - 18位AI高管的实例管理
  - Prompt构建和调用
  - 记忆检索和存储

代码生成:
  - 基于契约生成代码
  - 前端/后端/数据库

测试执行:
  - 单元测试
  - 集成测试
  - E2E测试 (Playwright)

UI验收:
  - Browser Use驱动
  - 截图和分析
  - 体验评估
```

### 4.2 核心组件

```python
# AI员工基类
class BaseEmployee:
    """AI员工基类"""

    def __init__(self, employee_id: str, config: EmployeeConfig):
        self.employee_id = employee_id
        self.config = config
        self.memory_manager = MemoryManager(employee_id)

    async def chat(self, message: str, context: dict) -> str:
        """处理用户消息"""

        # 1. 检索相关记忆
        memories = await self.memory_manager.retrieve(message)

        # 2. 构建Prompt
        prompt = self._build_prompt(message, context, memories)

        # 3. 调用AI
        response = await self.ai.chat(prompt)

        # 4. 保存新记忆
        await self.memory_manager.save(message, response)

        return response

# 代码生成器
class CodeGenerator:
    """基于契约的代码生成"""

    async def generate_backend(self, contract: InterfaceContract) -> str:
        """生成后端API代码"""

        prompt = f"""基于契约生成Node.js API:

路径: {contract.api['method']} {contract.api['path']}
请求: {contract.api['request']}
响应: {contract.api['response']}
错误: {contract.api['errors']}
数据库表: {contract.database['table']}

要求:
1. 使用Express
2. 参数校验
3. 错误处理完整
4. 连接数据库

生成完整可运行的代码。"""

        return await self.ai.chat('david_tech', prompt)

    async def generate_frontend(self, contract: InterfaceContract, design: DesignSpec) -> str:
        """生成前端组件代码"""

        prompt = f"""基于契约和设计稿生成React组件:

页面: {contract.frontend['page']}
设计规范: {design}
API调用: {contract.api['method']} {contract.api['path']}
状态: {contract.frontend['states']}

要求:
1. 使用React + TailwindCSS
2. 完整的状态处理
3. 所有错误码都有友好提示

生成完整的组件代码。"""

        return await self.ai.chat('elena_ux', prompt)

# Browser Use UI验收
class UIAcceptor:
    """UI验收器"""

    async def accept_feature(self, feature: Feature, url: str) -> AcceptanceResult:
        """验收单个功能"""

        browser = Browser(headless=True)
        agent = Agent(
            task=self._generate_task(feature),
            llm=ChatAnthropic(model="claude-sonnet-4-20250514"),
            browser=browser,
            save_screenshots=True
        )

        result = await agent.run()

        return AcceptanceResult(
            passed=result.score >= 7,
            score=result.score,
            issues=result.issues,
            screenshots=result.screenshots
        )
```

### 4.3 FastAPI 服务

```python
from fastapi import FastAPI, BackgroundTasks
from pydantic import BaseModel

app = FastAPI(title="Thinkus AI Service")

class GenerateCodeRequest(BaseModel):
    contract_id: str
    target: str  # backend, frontend, database

class AcceptUIRequest(BaseModel):
    feature_id: str
    url: str

@app.post("/api/generate-code")
async def generate_code(request: GenerateCodeRequest, background_tasks: BackgroundTasks):
    """生成代码"""
    contract = await get_contract(request.contract_id)

    if request.target == "backend":
        code = await code_generator.generate_backend(contract)
    elif request.target == "frontend":
        code = await code_generator.generate_frontend(contract)
    elif request.target == "database":
        code = await code_generator.generate_database(contract)

    return {"code": code}

@app.post("/api/accept-ui")
async def accept_ui(request: AcceptUIRequest):
    """UI验收"""
    feature = await get_feature(request.feature_id)
    result = await ui_acceptor.accept_feature(feature, request.url)
    return result
```

---

## 5. Node.js 前端层详情

### 5.1 核心职责

```yaml
用户界面:
  - CEO Dashboard
  - 项目管理
  - 实时进度展示

API网关:
  - tRPC路由
  - 认证中间件
  - 请求转发

实时通信:
  - WebSocket连接
  - SSE推送
  - 进度更新
```

### 5.2 tRPC路由

```typescript
import { router, publicProcedure, protectedProcedure } from '@/lib/trpc';
import { z } from 'zod';

export const appRouter = router({
  // 项目
  project: router({
    list: protectedProcedure.query(async ({ ctx }) => {
      return ctx.db.project.findMany({
        where: { userId: ctx.userId }
      });
    }),

    create: protectedProcedure
      .input(z.object({
        name: z.string(),
        description: z.string()
      }))
      .mutation(async ({ ctx, input }) => {
        return ctx.db.project.create({
          data: { ...input, userId: ctx.userId }
        });
      }),

    getProgress: protectedProcedure
      .input(z.object({ projectId: z.string() }))
      .query(async ({ ctx, input }) => {
        // 从Go层获取进度
        const progress = await goClient.getProgress(input.projectId);
        return progress;
      }),
  }),

  // AI讨论
  discussion: router({
    send: protectedProcedure
      .input(z.object({
        discussionId: z.string(),
        message: z.string()
      }))
      .mutation(async ({ ctx, input }) => {
        // 转发到Python AI层
        return ctx.aiService.chat(input.discussionId, input.message);
      }),
  }),
});
```

### 5.3 WebSocket实时推送

```typescript
// lib/realtime/socket.ts
import { Server } from 'socket.io';

export function setupSocketServer(server: any) {
  const io = new Server(server, {
    cors: { origin: '*' }
  });

  io.on('connection', (socket) => {
    console.log('Client connected:', socket.id);

    // 加入项目房间
    socket.on('join:project', (projectId: string) => {
      socket.join(`project:${projectId}`);
    });

    // 离开项目房间
    socket.on('leave:project', (projectId: string) => {
      socket.leave(`project:${projectId}`);
    });
  });

  return io;
}

// 广播进度更新
export function broadcastProgress(io: Server, projectId: string, progress: any) {
  io.to(`project:${projectId}`).emit('progress:update', progress);
}

// 广播AI消息
export function broadcastAIMessage(io: Server, discussionId: string, message: any) {
  io.to(`discussion:${discussionId}`).emit('ai:message', message);
}
```

---

## 6. 层间通信

### 6.1 通信流程

```
┌──────────────┐      REST/tRPC      ┌──────────────┐
│   Browser    │ ◄──────────────────► │   Node.js    │
│   (用户)     │      WebSocket       │   前端层     │
└──────────────┘                      └──────┬───────┘
                                             │
                                             │ gRPC
                                             ▼
                                      ┌──────────────┐
                                      │     Go       │
                                      │   编排层     │
                                      └──────┬───────┘
                                             │
                                             │ gRPC
                                             ▼
                                      ┌──────────────┐
                                      │   Python     │
                                      │   AI执行层   │
                                      └──────────────┘
```

### 6.2 通信协议选择

```yaml
Browser ↔ Node.js:
  - REST/tRPC: 常规请求
  - WebSocket: 实时更新
  - SSE: 单向推送

Node.js ↔ Go:
  - gRPC: 高性能RPC
  - 原因: 强类型、高吞吐、双向流

Go ↔ Python:
  - gRPC: 任务分发
  - 原因: 跨语言、性能好
```

---

## 7. 技术依赖

```yaml
核心依赖:
  - E2B: 沙盒环境
  - Browser Use: 浏览器自动化
  - Claude API: AI能力
  - PostgreSQL: 数据库
  - Redis: 缓存/队列

可选依赖:
  - Vercel SDK: 部署
  - Sentry: 错误追踪
  - Stripe: 支付
```

---

## 涉及文件

```yaml
新建:
  Go层:
    - services/go-orchestrator/main.go
    - services/go-orchestrator/scheduler/
    - services/go-orchestrator/contract/
    - services/go-orchestrator/proto/

  Python层:
    - services/py-ai-engine/main.py
    - services/py-ai-engine/employees/
    - services/py-ai-engine/generators/
    - services/py-ai-engine/acceptors/

  Node.js层:
    - thinkus-app/src/lib/trpc/
    - thinkus-app/src/lib/realtime/

修改:
  - docker-compose.yml (添加新服务)
  - package.json (添加依赖)
```

---

## 验收标准

- [ ] Go编排层可接收和分发任务
- [ ] Python AI层可执行代码生成
- [ ] Node.js层可提供API和实时通信
- [ ] 三层间gRPC通信正常
- [ ] 端到端流程可跑通

---

## 变更记录

| 日期 | 版本 | 变更内容 | 作者 |
|------|------|----------|------|
| 2026-01-17 | v1.0 | 从完整规格文档拆分 | Claude Code |
