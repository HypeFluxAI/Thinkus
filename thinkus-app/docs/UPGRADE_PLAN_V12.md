# Thinkus v12 升级计划

> 基于 thinkus-final-v11/upgrade 目录文档制定的升级路线图

---

## 一、升级概述

### 1.1 核心目标

将 Thinkus 从 v11 升级到 v12，实现以下核心能力：

1. **降低用户门槛**: 多格式输入、免费Demo
2. **提升开发能力**: AI沙箱、实时直播
3. **优化成本结构**: 分层模型路由
4. **增强复用能力**: 经验库系统
5. **加速用户增长**: 邀请系统优化

### 1.2 核心价值链

```
想法 → 开发 → 上线 → 运营 → 赚钱
```

---

## 二、功能优先级

### 2.1 P0 - 必做 (MVP)

| 功能 | 说明 | 预计工期 |
|------|------|----------|
| 分层模型路由 | Haiku/Sonnet/Opus 智能选择 | 3天 |
| 经验库 | 代码复用向量搜索 | 1周 |
| 邀请系统优化 | 增长引擎升级 | 1周 |

### 2.2 P1 - 应做

| 功能 | 说明 | 预计工期 |
|------|------|----------|
| 多格式输入 | PDF/图片/Excel/语音 | 1周 |
| AI 沙箱 | Docker 开发环境 | 3周 |
| AI 工作直播 | WebSocket 实时流 | 2周 |
| 免费 Demo | 降低体验门槛 | 1周 |

### 2.3 P2 - 可做

| 功能 | 说明 | 预计工期 |
|------|------|----------|
| 运营数据看板 | 分析仪表盘 | 2周 |
| AI 增长顾问 | 增长建议引擎 | 2周 |
| 功能迭代通道 | 快速迭代支持 | 1周 |

---

## 三、技术架构升级

### 3.1 新增服务

```
src/lib/services/
├── model-router.ts              # 分层模型路由
├── experience-library.ts        # 经验库服务
├── document-processor.ts        # 文档处理服务
├── sandbox-manager.ts           # 沙箱管理服务
├── realtime-stream.ts           # 实时流服务
├── analytics-service.ts         # 分析服务
└── growth-advisor.ts            # 增长顾问服务
```

### 3.2 模型路由设计

```typescript
// src/lib/services/model-router.ts

interface TaskClassification {
  complexity: 'simple' | 'medium' | 'complex'
  type: 'classification' | 'generation' | 'analysis' | 'decision'
  tokenEstimate: number
}

interface ModelSelection {
  model: 'haiku' | 'sonnet' | 'opus'
  reason: string
  estimatedCost: number
}

export class ModelRouter {
  // 分析任务复杂度
  async classifyTask(task: string, context?: string): Promise<TaskClassification>

  // 选择最优模型
  async selectModel(classification: TaskClassification): Promise<ModelSelection>

  // 执行任务
  async execute(task: string, context?: string): Promise<string>
}

// 路由规则
const ROUTING_RULES = {
  // Haiku: 简单任务
  haiku: {
    maxTokens: 1000,
    types: ['classification', 'extraction', 'simple_qa'],
    costPerToken: 0.00025 / 1000,
  },
  // Sonnet: 中等任务
  sonnet: {
    maxTokens: 4000,
    types: ['generation', 'conversation', 'analysis'],
    costPerToken: 0.003 / 1000,
  },
  // Opus: 复杂任务
  opus: {
    maxTokens: 8000,
    types: ['complex_analysis', 'strategic_decision', 'creative'],
    costPerToken: 0.015 / 1000,
  },
}
```

### 3.3 经验库设计

```typescript
// src/lib/services/experience-library.ts

interface Experience {
  id: string
  type: 'code' | 'design' | 'process' | 'solution'
  title: string
  description: string
  content: string
  tags: string[]
  sourceProjectId?: string
  vectorId: string
  usageCount: number
  rating: number
}

export class ExperienceLibrary {
  // 存储经验
  async store(experience: Omit<Experience, 'id' | 'vectorId'>): Promise<Experience>

  // 搜索相似经验
  async search(query: string, filters?: ExperienceFilters): Promise<Experience[]>

  // 应用经验到项目
  async apply(experienceId: string, projectId: string): Promise<void>

  // 从项目提取经验
  async extractFromProject(projectId: string): Promise<Experience[]>
}
```

### 3.4 文档处理设计

```typescript
// src/lib/services/document-processor.ts

interface ProcessedDocument {
  type: 'pdf' | 'image' | 'excel' | 'audio'
  content: string
  metadata: {
    pages?: number
    images?: string[]
    tables?: any[]
    duration?: number
  }
}

export class DocumentProcessor {
  // 处理 PDF
  async processPDF(file: Buffer): Promise<ProcessedDocument>

  // 处理图片 (OCR)
  async processImage(file: Buffer): Promise<ProcessedDocument>

  // 处理 Excel
  async processExcel(file: Buffer): Promise<ProcessedDocument>

  // 处理音频 (语音转文字)
  async processAudio(file: Buffer): Promise<ProcessedDocument>
}
```

### 3.5 AI 沙箱设计

```typescript
// src/lib/services/sandbox-manager.ts

interface Sandbox {
  id: string
  projectId: string
  status: 'creating' | 'running' | 'stopped' | 'error'
  containerId: string
  port: number
  createdAt: Date
}

export class SandboxManager {
  // 创建沙箱
  async create(projectId: string, config: SandboxConfig): Promise<Sandbox>

  // 执行命令
  async execute(sandboxId: string, command: string): Promise<ExecutionResult>

  // 获取日志
  async getLogs(sandboxId: string): Promise<string>

  // 停止沙箱
  async stop(sandboxId: string): Promise<void>

  // 销毁沙箱
  async destroy(sandboxId: string): Promise<void>
}
```

### 3.6 实时流设计

```typescript
// src/lib/services/realtime-stream.ts

interface StreamEvent {
  type: 'log' | 'progress' | 'output' | 'error' | 'complete'
  data: any
  timestamp: Date
}

export class RealtimeStreamService {
  // 创建流
  async createStream(projectId: string): Promise<string>

  // 发送事件
  async emit(streamId: string, event: StreamEvent): Promise<void>

  // 订阅流
  subscribe(streamId: string, callback: (event: StreamEvent) => void): () => void
}
```

---

## 四、AI 记忆系统升级

### 4.1 记忆分层模型

```
短期记忆（Working Memory）
  └ 当前上下文窗口

中期记忆（Session / Episodic Memory）
  └ 会话摘要 / 事件

长期记忆（Long-term Memory）
  └ 用户 / 项目 / 偏好 / 经验
```

### 4.2 记忆写入机制

```typescript
// 写入评分维度
interface MemoryScore {
  repetition: number    // 重复性 (0-1)
  persistence: number   // 持久性 (0-1)
  relevance: number     // 个体相关性 (0-1)
  decisionValue: number // 决策价值 (0-1)
}

// 写入阈值: 至少 2-3 项为高 (>0.6)
const WRITE_THRESHOLD = 0.6
const MIN_HIGH_SCORES = 2
```

### 4.3 记忆读取机制

```typescript
// 注入策略
interface MemoryInjectionStrategy {
  corePreferences: {
    count: 5        // 最多5条
    alwaysInject: true
  }
  relevantMemories: {
    count: [3, 8]   // 3-8条
    onDemand: true
  }
  coldArchive: {
    count: 'unlimited'
    neverInject: true
  }
}

// Token 预算
const MEMORY_TOKEN_BUDGET = {
  min: 300,
  max: 800,
}
```

### 4.4 记忆修正机制

```typescript
// 三阶段修正
enum MemoryCorrection {
  DOWNGRADE = 'downgrade',   // 降权: confidence ↓
  FREEZE = 'freeze',         // 冻结: 不再检索
  REPLACE = 'replace',       // 替换: 新记忆取代
}
```

---

## 五、数据库升级

### 5.1 新增模型

```typescript
// Experience (经验)
interface Experience {
  _id: ObjectId
  userId: ObjectId
  projectId?: ObjectId
  type: 'code' | 'design' | 'process' | 'solution'
  title: string
  description: string
  content: string
  tags: string[]
  vectorId: string
  usageCount: number
  rating: number
  status: 'active' | 'archived'
  createdAt: Date
  updatedAt: Date
}

// Sandbox (沙箱)
interface Sandbox {
  _id: ObjectId
  projectId: ObjectId
  userId: ObjectId
  containerId: string
  status: 'creating' | 'running' | 'stopped' | 'error'
  config: {
    image: string
    port: number
    resources: {
      cpu: string
      memory: string
    }
  }
  logs: string[]
  createdAt: Date
  updatedAt: Date
}

// AIModelUsage (AI 模型使用记录 - 升级)
interface AIModelUsage {
  _id: ObjectId
  userId: ObjectId
  projectId?: ObjectId
  model: 'haiku' | 'sonnet' | 'opus'
  taskType: string
  taskComplexity: 'simple' | 'medium' | 'complex'
  inputTokens: number
  outputTokens: number
  cost: number
  latencyMs: number
  routingDecision: {
    selectedModel: string
    alternativeModels: string[]
    reason: string
  }
  createdAt: Date
}
```

### 5.2 索引优化

```javascript
// 经验库索引
db.experiences.createIndex({ userId: 1, type: 1 })
db.experiences.createIndex({ tags: 1 })
db.experiences.createIndex({ usageCount: -1 })

// 沙箱索引
db.sandboxes.createIndex({ projectId: 1 })
db.sandboxes.createIndex({ status: 1 })

// AI 使用记录索引
db.ai_model_usages.createIndex({ userId: 1, createdAt: -1 })
db.ai_model_usages.createIndex({ model: 1, taskType: 1 })
```

---

## 六、API 升级

### 6.1 新增 API 端点

```
POST /api/model-router/classify     # 任务分类
POST /api/model-router/execute      # 模型执行

GET  /api/experiences               # 经验列表
POST /api/experiences               # 创建经验
GET  /api/experiences/search        # 搜索经验
POST /api/experiences/apply         # 应用经验

POST /api/documents/process         # 处理文档
GET  /api/documents/status/:id      # 处理状态

POST /api/sandboxes                 # 创建沙箱
GET  /api/sandboxes/:id             # 沙箱详情
POST /api/sandboxes/:id/execute     # 执行命令
GET  /api/sandboxes/:id/logs        # 获取日志
DELETE /api/sandboxes/:id           # 销毁沙箱

GET  /api/streams/:id               # WebSocket 订阅
```

### 6.2 WebSocket 端点

```
WS /api/ws/sandbox/:id     # 沙箱实时日志
WS /api/ws/stream/:id      # AI 工作直播
```

---

## 七、前端升级

### 7.1 新增页面

```
src/app/(main)/
├── sandbox/
│   ├── page.tsx            # 沙箱列表
│   └── [id]/
│       └── page.tsx        # 沙箱详情 (实时)
├── experiences/
│   ├── page.tsx            # 经验库
│   └── [id]/
│       └── page.tsx        # 经验详情
├── demo/
│   └── page.tsx            # 免费 Demo
└── analytics/
    └── page.tsx            # 运营数据看板
```

### 7.2 新增组件

```
src/components/
├── sandbox/
│   ├── sandbox-terminal.tsx    # 终端组件
│   ├── sandbox-logs.tsx        # 日志显示
│   └── sandbox-controls.tsx    # 控制面板
├── experience/
│   ├── experience-card.tsx     # 经验卡片
│   ├── experience-search.tsx   # 搜索组件
│   └── experience-apply.tsx    # 应用对话框
├── document/
│   ├── document-uploader.tsx   # 文档上传
│   └── document-preview.tsx    # 文档预览
└── stream/
    ├── live-stream.tsx         # 直播组件
    └── stream-controls.tsx     # 直播控制
```

---

## 八、实施计划

### Phase 1: 基础设施 (2周)

**Week 1:**
- [ ] 实现 ModelRouter 服务
- [ ] 添加模型选择逻辑
- [ ] 集成到现有 AI 调用

**Week 2:**
- [ ] 实现 ExperienceLibrary 服务
- [ ] 创建经验库数据模型
- [ ] 实现向量搜索

### Phase 2: 核心功能 (3周)

**Week 3:**
- [ ] 实现 DocumentProcessor
- [ ] 支持 PDF 处理
- [ ] 支持图片 OCR

**Week 4-5:**
- [ ] 实现 SandboxManager
- [ ] Docker 集成
- [ ] 实时日志流

### Phase 3: 用户体验 (2周)

**Week 6:**
- [ ] 免费 Demo 功能
- [ ] AI 工作直播页面
- [ ] WebSocket 集成

**Week 7:**
- [ ] 邀请系统优化
- [ ] 运营数据看板
- [ ] 测试和优化

---

## 九、技术依赖

### 9.1 新增依赖

```json
{
  "dependencies": {
    "dockerode": "^4.0.0",           // Docker 管理
    "pdf-parse": "^1.1.1",           // PDF 解析
    "tesseract.js": "^5.0.0",        // OCR
    "xlsx": "^0.18.5",               // Excel 解析
    "socket.io": "^4.7.0",           // WebSocket
    "openai-whisper": "^1.0.0"       // 语音转文字
  }
}
```

### 9.2 基础设施要求

```yaml
Docker:
  - Docker Engine >= 24.0
  - 支持容器管理 API

存储:
  - 文件存储 (R2/S3) 用于文档上传
  - 增加 Pinecone 索引容量

计算:
  - 支持 WebSocket 长连接
  - 沙箱容器资源
```

---

## 十、风险和缓解

| 风险 | 影响 | 缓解措施 |
|------|------|----------|
| Docker 安全 | 高 | 沙箱隔离、资源限制、网络隔离 |
| 成本超支 | 中 | 模型路由优化、用量监控告警 |
| WebSocket 稳定性 | 中 | 断线重连、消息队列缓冲 |
| 文档处理准确性 | 低 | 多引擎对比、人工审核选项 |

---

## 十一、成功指标

| 指标 | 目标 | 说明 |
|------|------|------|
| AI 成本降低 | 30-50% | 通过模型路由优化 |
| 用户转化率 | +20% | 通过免费 Demo |
| 代码复用率 | 40% | 通过经验库 |
| 用户增长 | +50% | 通过邀请优化 |

---

**最后更新**: 2026-01-13
