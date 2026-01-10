# Thinkus 技术架构文档 (AI开发者优化版)

> 版本: 6.0.0 | 日期: 2026-01-10

---

## 1. 系统架构

### 1.1 架构概览

```
┌─────────────────────────────────────────────────────────────┐
│                      用户界面层                              │
│  Next.js 14 + Tailwind + shadcn/ui                          │
└─────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────┐
│                      API层 (tRPC)                           │
│  认证 | 项目 | 讨论 | 对话 | 支付 | 用户                    │
└─────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────┐
│                    Agent编排层                               │
│  讨论引擎 | PM Agent | Dev Agent | Test Agent               │
└─────────────────────────────────────────────────────────────┘
                              │
              ┌───────────────┼───────────────┐
              ▼               ▼               ▼
┌─────────────────┐ ┌─────────────────┐ ┌─────────────────┐
│   规格生成器     │ │   知识库        │ │  提示词系统 ⭐   │
│  Spec Generator │ │  Knowledge Base │ │  Prompt System  │
└─────────────────┘ └─────────────────┘ └─────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────┐
│                    AI执行层                                  │
│  Claude Opus | Claude Sonnet | Claude Haiku                 │
└─────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────┐
│                   提示词进化层 ⭐ NEW                         │
│  数据收集 | 多Agent审核 | 自动优化 | A/B测试                 │
└─────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────┐
│                    基础设施层                                │
│  MongoDB | Redis | S3 | Vercel | Stripe                     │
└─────────────────────────────────────────────────────────────┘
```

### 1.2 技术栈

```yaml
前端:
  runtime: Node.js 20
  framework: Next.js 14 (App Router)
  language: TypeScript 5
  styling: Tailwind CSS 3
  components: shadcn/ui
  state: Zustand
  data: TanStack Query
  forms: React Hook Form + Zod

后端:
  api: tRPC
  database: MongoDB 7 (Mongoose)
  cache: Redis
  queue: BullMQ
  storage: AWS S3 / Cloudflare R2

AI:
  provider: Anthropic
  models: [Claude Opus, Claude Sonnet, Claude Haiku]
  protocol: MCP

部署:
  hosting: Vercel
  database: MongoDB Atlas
  cdn: Cloudflare
  monitoring: Vercel Analytics

第三方:
  auth: NextAuth.js
  payment: Stripe
  email: Resend
```

---

## 2. 数据模型

> 详细定义见 `specs/data-models.ts`

### 2.1 核心模型

```typescript
// 用户
User {
  id, email, name, avatar
  authProvider: 'email' | 'google' | 'github'
  stats: { totalProjects, completedProjects, totalSpent }
  settings: UserSettings
}

// 项目
Project {
  id, userId, name, icon
  type: 'web' | 'mobile' | 'game' | ...
  status: 'draft' | 'discussing' | 'in_progress' | 'completed'
  complexity: 'L1' | 'L2' | 'L3' | 'L4' | 'L5'
  requirement: { original, clarified }
  proposal?: { features, techStack, pricing }
  progress?: { percentage, currentStage, logs }
  deployment?: { url, githubRepo, ... }
}

// 讨论
Discussion {
  id, projectId, mode, status
  participants: ExpertId[]
  rounds: DiscussionRound[]
  conclusion?: { features, risks, approvals }
}

// 对话
Conversation {
  id, projectId, type
  messages: Message[]
}

// 支付
Payment {
  id, userId, projectId
  amount, status
  stripePaymentIntentId
}
```

### 2.2 数据库索引

```yaml
users:
  - email: unique
  - createdAt: -1

projects:
  - userId: 1, createdAt: -1
  - userId: 1, status: 1
  - status: 1

discussions:
  - projectId: unique

conversations:
  - projectId: unique

payments:
  - userId: 1, createdAt: -1
  - projectId: 1
  - stripePaymentIntentId: unique
```

---

## 3. API设计

> 详细定义见 `specs/api-specs.yaml`

### 3.1 API概览

```yaml
auth:
  - register: 邮箱注册
  - login: 邮箱登录
  - oauth: OAuth登录
  - logout: 登出
  - me: 获取当前用户

projects:
  - list: 项目列表
  - get: 项目详情
  - create: 创建项目
  - update: 更新项目
  - delete: 删除项目
  - confirm: 确认方案

discussions:
  - create: 开始讨论
  - get: 讨论详情
  - stream: 讨论事件流 (SSE)
  - input: 用户插入发言
  - skip/pause/resume: 控制讨论

chat:
  - get: 获取对话
  - send: 发送消息
  - stream: 流式响应

payments:
  - createIntent: 创建支付意向
  - confirm: 确认支付

progress:
  - get: 获取进度
  - stream: 进度事件流 (SSE)
```

### 3.2 认证方式

```yaml
方式: JWT + HttpOnly Cookie

流程:
  1. 用户登录/注册
  2. 服务端生成JWT
  3. 设置HttpOnly Cookie
  4. 后续请求自动携带Cookie
  5. 服务端验证JWT

JWT Payload:
  userId: string
  email: string
  exp: number
```

### 3.3 实时通信

```yaml
技术: Server-Sent Events (SSE)

使用场景:
  - 讨论进度: discussions.stream
  - 开发进度: progress.stream
  - AI对话: chat.stream

事件格式:
  event: {type}
  data: {json}
```

---

## 4. Agent系统

### 4.1 Agent架构

```
┌─────────────────────────────────────────────────────────────┐
│                    Agent Orchestrator                        │
│  调度Agent | 管理状态 | 处理错误                             │
└─────────────────────────────────────────────────────────────┘
        │           │           │           │
        ▼           ▼           ▼           ▼
   ┌────────┐ ┌────────┐ ┌────────┐ ┌────────┐
   │PM Agent│ │Design  │ │Dev     │ │Test    │
   │        │ │Agent   │ │Agent   │ │Agent   │
   └────────┘ └────────┘ └────────┘ └────────┘
        │           │           │           │
        └───────────┴───────────┴───────────┘
                        │
                        ▼
              ┌─────────────────┐
              │   Claude API    │
              │ Opus/Sonnet/Haiku│
              └─────────────────┘
```

### 4.2 专家讨论引擎

```yaml
组件:
  orchestrator:
    职责: 控制讨论流程
    模型: Claude Sonnet
    
  expert_agents:
    职责: 模拟专家发言
    模型: Claude Sonnet
    配置: 见 flows/expert-discussion.yaml
    
  synthesizer:
    职责: 综合讨论结果
    模型: Claude Opus

流程:
  1. Orchestrator决定当前阶段
  2. 选择发言专家
  3. Expert Agent生成发言
  4. 判断是否达成共识
  5. Synthesizer综合结果
```

### 4.3 开发Agent

```yaml
pm_agent:
  职责: 分析需求，生成PRD
  模型: Claude Opus
  输入: 用户需求 + 讨论结论
  输出: PRD + 结构化规格

design_agent:
  职责: 生成UI设计
  模型: Claude Sonnet
  输入: PRD + 设计令牌
  输出: 页面组件代码

dev_agent:
  职责: 生成代码
  模型: Claude Opus
  输入: PRD + 页面规格
  输出: 完整代码

test_agent:
  职责: 生成测试
  模型: Claude Sonnet
  输入: 代码
  输出: 测试用例 + 执行结果

deploy_agent:
  职责: 部署应用
  模型: Claude Haiku
  输入: 代码 + 配置
  输出: 部署URL
```

### 4.4 模型选择策略

```yaml
Claude Opus (最强):
  - 需求分析
  - 架构设计
  - 复杂代码生成
  - 方案综合

Claude Sonnet (平衡):
  - 专家发言
  - UI代码生成
  - 测试用例
  - 常规开发

Claude Haiku (快速):
  - 简单修改
  - 日志分析
  - 部署脚本
```

---

## 5. 基础设施

### 5.1 部署架构

```yaml
Vercel:
  用途: 前端 + API
  区域: 全球边缘
  配置:
    framework: Next.js
    buildCommand: pnpm build
    outputDirectory: .next

MongoDB Atlas:
  用途: 主数据库
  集群: M10 (生产)
  区域: 与Vercel同区

Redis (Upstash):
  用途: 缓存 + 会话
  配置: Serverless

S3/R2:
  用途: 文件存储
  配置: 公开读取
```

### 5.2 环境变量

```yaml
# 数据库
MONGODB_URI: MongoDB连接字符串

# Redis
REDIS_URL: Redis连接字符串

# 认证
JWT_SECRET: JWT密钥
NEXTAUTH_SECRET: NextAuth密钥
NEXTAUTH_URL: 应用URL

# OAuth
GOOGLE_CLIENT_ID: Google OAuth
GOOGLE_CLIENT_SECRET: Google OAuth
GITHUB_CLIENT_ID: GitHub OAuth
GITHUB_CLIENT_SECRET: GitHub OAuth

# AI
ANTHROPIC_API_KEY: Claude API密钥

# 支付
STRIPE_SECRET_KEY: Stripe密钥
STRIPE_WEBHOOK_SECRET: Webhook密钥

# 存储
S3_BUCKET: 存储桶名称
S3_REGION: 区域
S3_ACCESS_KEY: 访问密钥
S3_SECRET_KEY: 密钥
```

### 5.3 监控告警

```yaml
监控:
  - Vercel Analytics: 性能监控
  - MongoDB Atlas: 数据库监控
  - Sentry: 错误追踪

告警:
  - 错误率 > 1%
  - 响应时间 > 2s
  - 数据库连接失败
  - 支付失败
```

---

## 6. 安全设计

### 6.1 认证安全

```yaml
密码:
  - bcrypt哈希
  - 最小长度8位

JWT:
  - HttpOnly Cookie
  - SameSite: Strict
  - 过期时间: 7天

OAuth:
  - 仅信任授权提供商
  - 验证state参数
```

### 6.2 数据安全

```yaml
敏感数据:
  - API密钥: AES-256加密存储
  - 数据库凭证: 环境变量
  - 支付信息: 不存储，使用Stripe

传输:
  - 全站HTTPS
  - TLS 1.3
```

### 6.3 API安全

```yaml
Rate Limiting:
  - 登录: 5次/分钟
  - 注册: 3次/分钟
  - API: 100次/分钟

输入验证:
  - Zod Schema验证
  - SQL注入防护 (Mongoose)
  - XSS防护 (React默认)
```

---

## 7. 目录结构

```
thinkus/
├── app/                      # Next.js App Router
│   ├── (auth)/              # 认证页面
│   │   ├── login/
│   │   └── register/
│   ├── (dashboard)/         # 需要登录的页面
│   │   ├── dashboard/
│   │   ├── create/
│   │   └── projects/
│   ├── api/                 # API路由
│   │   └── trpc/
│   └── layout.tsx
│
├── components/              # 组件
│   ├── ui/                  # shadcn/ui组件
│   ├── features/            # 功能组件
│   └── layouts/             # 布局组件
│
├── lib/                     # 库
│   ├── db/                  # 数据库
│   │   ├── models/          # Mongoose模型
│   │   └── connection.ts
│   ├── trpc/                # tRPC
│   │   ├── routers/
│   │   └── context.ts
│   ├── ai/                  # AI相关
│   │   ├── agents/
│   │   └── claude.ts
│   └── utils/
│
├── hooks/                   # React Hooks
├── stores/                  # Zustand stores
├── types/                   # TypeScript类型
└── docs/                    # 文档 (本目录)
```

---

## 8. 开发指南

### 8.1 本地开发

```bash
# 安装依赖
pnpm install

# 环境变量
cp .env.example .env.local

# 启动开发服务器
pnpm dev

# 访问
http://localhost:3000
```

### 8.2 代码规范

```yaml
代码风格:
  - ESLint + Prettier
  - 自动格式化

命名规范:
  文件: kebab-case
  组件: PascalCase
  函数: camelCase
  常量: UPPER_SNAKE_CASE

提交规范:
  格式: type(scope): message
  类型: feat, fix, docs, style, refactor, test, chore
```

### 8.3 测试

```bash
# 单元测试
pnpm test

# E2E测试
pnpm test:e2e

# 覆盖率
pnpm test:coverage
```

---

## 9. 部署流程

```yaml
开发环境:
  触发: push到develop分支
  URL: dev.thinkus.ai

预览环境:
  触发: PR到main分支
  URL: 自动生成

生产环境:
  触发: merge到main分支
  URL: thinkus.ai

流程:
  1. 代码推送
  2. Vercel自动构建
  3. 运行测试
  4. 部署到边缘
  5. 验证健康检查
```

---

## 10. 结构化规格系统 ⭐

### 10.1 系统架构

```
┌─────────────────────────────────────────────────────────────┐
│  用户输入: "我想做一个宠物电商"                              │
└─────────────────────────────────────────────────────────────┘
                              ↓
┌─────────────────────────────────────────────────────────────┐
│  PM Agent                                                    │
│  ├── 理解需求                                                │
│  ├── 匹配知识库模板                                          │
│  └── 生成结构化规格                                          │
└─────────────────────────────────────────────────────────────┘
                              ↓
┌─────────────────────────────────────────────────────────────┐
│  结构化规格包                                                │
│  ├── project.yaml        (项目规格)                         │
│  ├── data-models.ts      (数据模型)                         │
│  ├── api-specs.yaml      (API定义)                          │
│  └── pages/*.yaml        (页面规格)                         │
└─────────────────────────────────────────────────────────────┘
                              ↓
┌─────────────────────────────────────────────────────────────┐
│  Dev Agent                                                   │
│  ├── 读取规格                                                │
│  ├── 精准生成代码                                            │
│  └── 几乎不返工                                              │
└─────────────────────────────────────────────────────────────┘
```

### 10.2 规格文件结构

```yaml
{project-id}-specs/
├── project.yaml           # 项目元信息
│   - id, name, type, complexity
│   - tech_stack
│   - features[]
│   - pages[]
│
├── data-models.ts         # TypeScript类型定义
│   - interface User {}
│   - interface Product {}
│   - ...
│
├── api-specs.yaml         # API接口定义
│   - auth.login
│   - auth.register
│   - products.list
│   - ...
│
└── pages/                 # 页面规格
    ├── home.yaml
    ├── login.yaml
    └── ...
```

### 10.3 规格生成器

```typescript
interface SpecGenerator {
  // 生成项目规格
  generateProjectSpec(
    requirement: string,
    template?: ProjectTemplate
  ): ProjectSpec
  
  // 生成数据模型
  generateDataModels(
    features: Feature[]
  ): string  // TypeScript code
  
  // 生成API规格
  generateApiSpecs(
    features: Feature[],
    models: DataModel[]
  ): ApiSpec
  
  // 生成页面规格
  generatePageSpecs(
    pages: PageDefinition[],
    models: DataModel[],
    apis: ApiSpec
  ): PageSpec[]
}
```

### 10.4 代码生成器

```typescript
interface CodeGenerator {
  // 生成完整项目
  generateProject(specs: AllSpecs): ProjectFiles
  
  // 各层生成
  generateDbSchema(models: DataModel[]): string
  generateApiRoutes(apis: ApiSpec): string
  generatePages(pages: PageSpec[]): string[]
  
  // 验证
  validate(code: string): ValidationResult
}
```

---

## 11. 知识积累库 ⭐

### 11.1 知识库架构

```
┌─────────────────────────────────────────────────────────────┐
│                      知识库 (Knowledge Base)                 │
├─────────────────────────────────────────────────────────────┤
│                                                              │
│  templates/              # 项目模板                          │
│  ├── ecommerce/          # 电商 (完整规格)                   │
│  ├── saas/               # SaaS                              │
│  ├── social/             # 社交                              │
│  └── ...                                                     │
│                                                              │
│  modules/                # 功能模块                          │
│  ├── user-system/        # 用户系统                          │
│  ├── payment/            # 支付模块                          │
│  ├── notification/       # 通知模块                          │
│  └── ...                                                     │
│                                                              │
│  components/             # UI组件规格                        │
│  ├── forms/                                                  │
│  ├── tables/                                                 │
│  └── ...                                                     │
│                                                              │
│  learnings/              # 经验积累                          │
│  ├── expert-discussions/ # 专家讨论精华                      │
│  └── optimizations/      # 优化经验                          │
│                                                              │
└─────────────────────────────────────────────────────────────┘
```

### 11.2 存储设计

```yaml
存储:
  位置: S3/R2 对象存储
  结构:
    /knowledge-base/
      /templates/{template-id}/
        project.yaml
        data-models.ts
        api-specs.yaml
        pages/
      /modules/{module-id}/
        spec.yaml
        code/
      /learnings/
        discussions.json
        feedback.json

数据库索引 (MongoDB):
  templates:
    - type: 1
    - tags: 1
    - usageCount: -1
  
  modules:
    - category: 1
    - tags: 1
```

### 11.3 模板匹配

```typescript
interface TemplateMatcher {
  // 匹配最相似模板
  match(requirement: string): MatchResult
  
  // 计算相似度
  calculateSimilarity(
    requirement: string,
    template: ProjectTemplate
  ): number
  
  // 获取可复用模块
  getReusableModules(
    features: Feature[]
  ): Module[]
}

interface MatchResult {
  template: ProjectTemplate
  similarity: number      // 0-1
  reusableModules: Module[]
  customizationNeeded: string[]
}
```

### 11.4 积累流程

```yaml
项目完成后:
  1. 提取项目规格
  2. 评估项目质量 (用户满意度、返工次数)
  3. 高质量项目入库:
     - 更新模板 (如果是新类型)
     - 提取新模块
     - 记录专家讨论精华
  4. 更新统计数据

质量阈值:
  - 用户满意度 >= 4/5
  - 返工次数 <= 1
  - 无严重bug
```

### 11.5 复用效果

```yaml
复用统计:
  第1个电商项目: 
    复用率: 0%
    生成时间: 100%
    
  第10个电商项目:
    复用率: 80%
    生成时间: 30%
    
  第100个电商项目:
    复用率: 95%
    生成时间: 10%

成本节省:
  Token消耗: 降低60-90%
  开发时间: 降低50-80%
```

---

## 12. 提示词进化系统 ⭐

### 12.1 系统架构

```
┌─────────────────────────────────────────────────────────────┐
│                     提示词进化系统                           │
├─────────────────────────────────────────────────────────────┤
│  ┌──────────────┐    ┌──────────────┐    ┌──────────────┐   │
│  │   数据收集    │───▶│   效果评估    │───▶│   优化引擎   │   │
│  │  Collection   │    │  Evaluation   │    │  Optimizer   │   │
│  └──────────────┘    └──────────────┘    └──────────────┘   │
│         │                   │                   │            │
│         ▼                   ▼                   ▼            │
│  ┌──────────────┐    ┌──────────────┐    ┌──────────────┐   │
│  │   样本库      │    │   指标仪表盘  │    │   版本管理   │   │
│  └──────────────┘    └──────────────┘    └──────────────┘   │
└─────────────────────────────────────────────────────────────┘
```

### 12.2 数据模型

```typescript
// 提示词执行记录
interface PromptExecution {
  id: string
  promptId: string
  promptVersion: string
  projectId: string
  
  input: { variables: Record<string, any>, tokens: number }
  output: { content: string, tokens: number, latencyMs: number }
  
  evaluation: {
    formatValid: boolean
    taskCompleted: boolean
    userRating?: number
    reworkCount: number
  }
  
  createdAt: Date
}

// 提示词版本
interface PromptVersion {
  id: string
  promptId: string
  version: string
  content: string
  config: { model: string, temperature: number, maxTokens: number }
  status: 'draft' | 'testing' | 'production' | 'deprecated'
  stats: { totalExecutions: number, avgSuccessRate: number }
}

// A/B测试
interface PromptABTest {
  id: string
  promptId: string
  versionA: string
  versionB: string
  trafficSplit: number
  status: 'running' | 'completed'
  result?: { winner: 'A' | 'B', confidence: number }
}

// 审核结果
interface ReviewResult {
  promptId: string
  version: string
  scores: {
    total: number      // 综合分 0-100
    quality: number    // 质量分
    safety: number     // 安全分
    efficiency: number // 效率分
  }
  decision: 'approved' | 'rejected' | 'needs_iteration'
  action: 'publish' | 'ab_test' | 'iterate' | 'rollback'
}
```

### 12.3 多Agent审核委员会

```yaml
审核Agent:
  quality_agent:
    评估: 格式正确性、内容准确性、一致性、完整性
    权重: 50%
    
  safety_agent:
    评估: 幻觉风险、越界风险、注入抵抗
    权重: 35%
    
  efficiency_agent:
    评估: Token效率、响应速度
    权重: 15%

自动决策规则:
  综合分 >= 95: 直接发布 (快速通道)
  综合分 >= 80: 10%流量A/B测试
  综合分 >= 60: 返回优化引擎迭代
  综合分 < 60: 回滚到上一稳定版本

人工介入: 仅在连续3次迭代失败时提醒
```

### 12.4 提示词加载器

```typescript
// 核心接口
interface PromptLoader {
  load(promptPath: string): Promise<PromptTemplate>
  render(template: PromptTemplate, variables: Record<string, any>): RenderedPrompt
  loadAndRender(path: string, variables: Record<string, any>): Promise<RenderedPrompt>
}

interface PromptManager {
  getPrompt(promptId: string, variables: Record<string, any>): Promise<RenderedPrompt>
  recordExecution(execution: PromptExecution): Promise<void>
  createABTest(config: ABTestConfig): ABTest
  getMetrics(promptId: string): Promise<PromptMetrics>
}

// 使用示例
const pm = getPromptManager()
const prompt = await pm.getPrompt('requirement/understand', {
  user_input: '我想做一个电商网站',
})
```

### 12.5 API设计

```yaml
prompts:
  - GET /prompts: 列表
  - GET /prompts/{id}: 详情
  - GET /prompts/{id}/versions/{v}: 版本内容

versions:
  - POST /prompts/{id}/versions: 创建版本
  - POST /prompts/{id}/versions/{v}/publish: 发布
  - POST /prompts/{id}/rollback: 回滚

abTests:
  - POST /prompts/{id}/ab-tests: 创建测试
  - POST /ab-tests/{id}/stop: 停止测试

analytics:
  - GET /prompts/{id}/stats: 统计
  - GET /prompts/{id}/metrics: 详细指标
  - GET /prompts/{id}/failures: 失败记录
  - POST /prompts/{id}/optimize: 触发优化

review:
  - POST /prompts/{id}/review: 触发多Agent审核
  - GET /prompts/{id}/review-history: 审核历史
```

---

## 附录: 相关文档

```yaml
核心规格:
  - specs/data-models.ts: 数据模型
  - specs/api-specs.yaml: API规格
  
页面规格:
  - pages/*.yaml: 各页面详细规格
  
设计系统:
  - components/design-tokens.yaml: 设计令牌
  
业务流程:
  - flows/*.yaml: 业务流程定义
  
规格系统:
  - thinkus-structured-spec-system.md: 规格系统设计
  
提示词系统:
  - prompts/lib/prompt-loader.ts: 加载器实现
  - prompts/lib/auto-review.ts: 多Agent审核实现
  - prompts/agents/: 各阶段提示词
  - thinkus-prompt-auto-evolution.md: 自动进化设计
```
