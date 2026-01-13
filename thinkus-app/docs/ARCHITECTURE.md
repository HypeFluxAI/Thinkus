# Thinkus 技术架构文档

> 系统架构、数据流、服务设计的完整说明

---

## 一、系统架构总览

```
┌─────────────────────────────────────────────────────────────────────┐
│                           Frontend Layer                             │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐ │
│  │  Next.js    │  │  React 19   │  │  Tailwind   │  │  Radix UI   │ │
│  │  App Router │  │  Components │  │  CSS 4      │  │  shadcn/ui  │ │
│  └─────────────┘  └─────────────┘  └─────────────┘  └─────────────┘ │
└─────────────────────────────────────────────────────────────────────┘
                                    │
                                    ▼
┌─────────────────────────────────────────────────────────────────────┐
│                            API Layer                                 │
│  ┌─────────────────────────────┐  ┌─────────────────────────────┐   │
│  │      Next.js API Routes     │  │         tRPC Routes         │   │
│  │  /api/chat, /api/discussion │  │  project, user, executive   │   │
│  │  /api/stripe, /api/cron     │  │  notification, discussion   │   │
│  └─────────────────────────────┘  └─────────────────────────────┘   │
└─────────────────────────────────────────────────────────────────────┘
                                    │
                                    ▼
┌─────────────────────────────────────────────────────────────────────┐
│                          Service Layer                               │
│  ┌───────────────┐  ┌───────────────┐  ┌───────────────────────┐   │
│  │   Discussion  │  │   Decision    │  │   Memory Maintenance  │   │
│  │  Orchestrator │  │   Service     │  │       Service         │   │
│  └───────────────┘  └───────────────┘  └───────────────────────┘   │
│  ┌───────────────┐  ┌───────────────┐  ┌───────────────────────┐   │
│  │    Standup    │  │    Skill      │  │   Auto Execution      │   │
│  │    Service    │  │  Distillation │  │       Service         │   │
│  └───────────────┘  └───────────────┘  └───────────────────────┘   │
└─────────────────────────────────────────────────────────────────────┘
                                    │
                                    ▼
┌─────────────────────────────────────────────────────────────────────┐
│                       External Services                              │
│  ┌───────────────┐  ┌───────────────┐  ┌───────────────────────┐   │
│  │   Anthropic   │  │    OpenAI     │  │       Stripe          │   │
│  │  Claude API   │  │  Embeddings   │  │      Payments         │   │
│  └───────────────┘  └───────────────┘  └───────────────────────┘   │
└─────────────────────────────────────────────────────────────────────┘
                                    │
                                    ▼
┌─────────────────────────────────────────────────────────────────────┐
│                         Data Layer                                   │
│  ┌─────────────────────────────┐  ┌─────────────────────────────┐   │
│  │         MongoDB             │  │        Pinecone             │   │
│  │   (Primary Database)        │  │    (Vector Database)        │   │
│  │   Users, Projects, etc.     │  │   Memory Embeddings         │   │
│  └─────────────────────────────┘  └─────────────────────────────┘   │
└─────────────────────────────────────────────────────────────────────┘
```

---

## 二、目录结构

```
thinkus-app/
├── src/
│   ├── app/                          # Next.js App Router
│   │   ├── (auth)/                   # 认证路由组
│   │   │   ├── login/
│   │   │   ├── register/
│   │   │   ├── apply/
│   │   │   └── waitlist/
│   │   ├── (main)/                   # 主应用路由组
│   │   │   ├── dashboard/
│   │   │   ├── projects/
│   │   │   ├── create/
│   │   │   ├── executives/
│   │   │   ├── settings/
│   │   │   └── pricing/
│   │   ├── (marketing)/              # 营销页面路由组
│   │   │   └── cases/
│   │   ├── api/                      # API 路由
│   │   │   ├── auth/
│   │   │   ├── chat/
│   │   │   ├── discussion/
│   │   │   ├── decisions/
│   │   │   ├── memories/
│   │   │   ├── stripe/
│   │   │   └── cron/
│   │   ├── layout.tsx                # 根布局
│   │   ├── page.tsx                  # 首页
│   │   └── globals.css               # 全局样式
│   │
│   ├── components/                   # React 组件
│   │   ├── ui/                       # 基础 UI 组件
│   │   ├── chat/                     # 聊天组件
│   │   ├── executive/                # 高管组件
│   │   ├── project/                  # 项目组件
│   │   ├── decision/                 # 决策组件
│   │   ├── standup/                  # 例会组件
│   │   ├── pricing/                  # 定价组件
│   │   └── notification/             # 通知组件
│   │
│   ├── lib/                          # 核心库
│   │   ├── ai/                       # AI 相关
│   │   │   ├── claude.ts             # Claude API 封装
│   │   │   ├── prompts/              # 提示词
│   │   │   ├── executives/           # 高管AI逻辑
│   │   │   └── experts/              # 专家AI逻辑
│   │   ├── auth/                     # 认证
│   │   │   ├── options.ts            # NextAuth 配置
│   │   │   └── provider.tsx          # 认证提供器
│   │   ├── config/                   # 配置
│   │   │   ├── executives.ts         # 高管配置
│   │   │   ├── project-phases.ts     # 阶段配置
│   │   │   ├── subscription-plans.ts # 订阅配置
│   │   │   └── product-types.ts      # 产品类型
│   │   ├── db/                       # 数据库
│   │   │   ├── connect.ts            # 连接管理
│   │   │   └── models/               # Mongoose 模型
│   │   ├── services/                 # 业务服务
│   │   │   ├── discussion-orchestrator.ts
│   │   │   ├── decision-service.ts
│   │   │   ├── memory-maintenance-service.ts
│   │   │   └── skill-distillation-service.ts
│   │   ├── trpc/                     # tRPC
│   │   │   ├── trpc.ts               # tRPC 配置
│   │   │   ├── client.ts             # 客户端
│   │   │   └── routers/              # 路由定义
│   │   ├── vector/                   # 向量数据库
│   │   │   ├── pinecone.ts           # Pinecone 客户端
│   │   │   ├── embedding.ts          # 嵌入生成
│   │   │   └── memory-service.ts     # 记忆服务
│   │   ├── stripe.ts                 # Stripe 配置
│   │   └── utils.ts                  # 工具函数
│   │
│   ├── hooks/                        # 自定义 Hooks
│   │   ├── use-autonomous-discussion.ts
│   │   └── use-code-generation.ts
│   │
│   └── types/                        # 类型定义
│       └── next-auth.d.ts
│
├── public/                           # 静态资源
├── tests/                            # 测试文件
│   ├── unit/                         # 单元测试
│   ├── integration/                  # 集成测试
│   └── e2e/                          # E2E 测试
├── docs/                             # 文档
├── package.json
├── tsconfig.json
├── next.config.ts
├── tailwind.config.ts
├── vitest.config.ts
├── playwright.config.ts
└── docker-compose.yml
```

---

## 三、核心数据流

### 3.1 用户认证流程

```
用户 ──────> 登录页面 ──────> NextAuth ──────> OAuth/Credentials
                                  │
                                  ▼
                            Session 创建
                                  │
                                  ▼
                            MongoDB 存储
                                  │
                                  ▼
                              JWT Token
                                  │
                                  ▼
                            客户端存储
```

### 3.2 AI 对话流程

```
用户消息 ──────> /api/chat ──────> Memory Injector
                                       │
                                       ▼ (检索相关记忆)
                                  Pinecone 查询
                                       │
                                       ▼
                                Executive Prompt
                                       │
                                       ▼ (构建完整提示词)
                                  Claude API
                                       │
                                       ▼ (流式响应)
                                  SSE Stream
                                       │
                                       ▼
                                  前端渲染
                                       │
                                       ▼
                                Memory 提取存储
```

### 3.3 多高管讨论流程

```
用户问题 ──────> Topic Analyzer ──────> 识别话题类型
                                            │
                                            ▼
                                   Discussion Orchestrator
                                            │
                                            ▼ (选择相关高管)
                                      高管选择逻辑
                                            │
                         ┌──────────────────┼──────────────────┐
                         ▼                  ▼                  ▼
                    Executive 1        Executive 2        Executive 3
                         │                  │                  │
                         ▼                  ▼                  ▼
                    Claude API         Claude API         Claude API
                         │                  │                  │
                         └──────────────────┼──────────────────┘
                                            ▼
                                    Discussion Summary
                                            │
                                            ▼
                                    Decision Extraction
                                            │
                                            ▼
                                    Action Items 生成
```

### 3.4 记忆系统流程

```
对话内容 ──────> Memory Extractor ──────> 关键信息提取
                                              │
                                              ▼
                                      OpenAI Embeddings
                                              │
                                              ▼ (生成向量)
                                      Pinecone Upsert
                                              │
                                              ▼
                                      MongoDB 元数据

后续对话 ──────> Memory Injector ──────> Pinecone Query
                                              │
                                              ▼ (相似度检索)
                                      Top-K 记忆
                                              │
                                              ▼
                                      Prompt 注入
```

### 3.5 支付订阅流程

```
用户选择套餐 ──────> /api/stripe/checkout ──────> Stripe Checkout
                                                       │
                                                       ▼
                                               Stripe 支付页面
                                                       │
                                                       ▼
                                               支付完成回调
                                                       │
                                                       ▼
                                         /api/stripe/webhook
                                                       │
                                                       ▼
                                         Subscription 更新
                                                       │
                                                       ▼
                                         MongoDB 订阅记录
```

---

## 四、数据库设计

### 4.1 MongoDB 集合

```
┌─────────────────────────────────────────────────────────────┐
│                      User Ecosystem                          │
├─────────────────────────────────────────────────────────────┤
│ users                    用户基本信息                        │
│ user_executives          用户专属高管实例 (18个/用户)        │
│ user_credentials         用户凭证 (API keys)                │
│ subscriptions            订阅信息                           │
│ payments                 支付记录                           │
│ invitation_codes         邀请码                             │
│ waitlists                排队列表                           │
│ verification_codes       验证码                             │
└─────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────┐
│                    Project Ecosystem                         │
├─────────────────────────────────────────────────────────────┤
│ projects                 项目信息                           │
│ discussions              讨论记录                           │
│ decisions                决策记录                           │
│ action_items             行动项                             │
│ standups                 例会记录                           │
│ deliverables             交付物                             │
│ project_shares           项目分享                           │
└─────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────┐
│                      AI Ecosystem                            │
├─────────────────────────────────────────────────────────────┤
│ memories                 记忆存储                           │
│ distilled_skills         蒸馏技能                           │
│ ai_usages                AI 使用记录                        │
│ prompt_executions        提示词执行日志                     │
└─────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────┐
│                    System Ecosystem                          │
├─────────────────────────────────────────────────────────────┤
│ notifications            通知                               │
│ activity_logs            活动日志                           │
│ feedbacks                用户反馈                           │
│ webhook_events           Webhook 事件                       │
│ expert_consultations     专家咨询                           │
└─────────────────────────────────────────────────────────────┘
```

### 4.2 Pinecone 索引设计

```yaml
索引名: thinkus
维度: 1536 (text-embedding-3-small)

命名空间策略:
  - user_{userId}_preference     # 用户偏好记忆
  - user_{userId}_project_{projectId}  # 项目记忆

元数据字段:
  - type: preference | project | discussion
  - userId: string
  - projectId: string (可选)
  - executiveId: string (可选)
  - timestamp: number
  - content: string
```

---

## 五、服务层设计

### 5.1 Discussion Orchestrator

**职责**: 协调多高管讨论流程

```typescript
// src/lib/services/discussion-orchestrator.ts

class DiscussionOrchestrator {
  // 启动讨论
  async startDiscussion(topic: string, projectId: string): Promise<Discussion>

  // 选择参与高管
  async selectParticipants(topic: string, phase: ProjectPhase): Promise<Executive[]>

  // 编排讨论轮次
  async orchestrateRound(discussion: Discussion, round: number): Promise<Message[]>

  // 生成讨论总结
  async generateSummary(discussion: Discussion): Promise<string>

  // 提取决策和行动项
  async extractOutcomes(discussion: Discussion): Promise<Outcomes>
}
```

### 5.2 Decision Service

**职责**: 决策提取和管理

```typescript
// src/lib/services/decision-service.ts

class DecisionService {
  // 从讨论中提取决策
  async extractDecisions(discussionId: string): Promise<Decision[]>

  // 评估决策等级
  async evaluateLevel(decision: Decision): Promise<DecisionLevel>

  // 创建决策
  async createDecision(data: DecisionInput): Promise<Decision>

  // 确认决策
  async confirmDecision(decisionId: string, approved: boolean): Promise<Decision>

  // 执行决策
  async executeDecision(decisionId: string): Promise<void>
}
```

### 5.3 Memory Service

**职责**: 记忆存储和检索

```typescript
// src/lib/vector/memory-service.ts

class MemoryService {
  // 存储记忆
  async storeMemory(content: string, metadata: MemoryMetadata): Promise<Memory>

  // 检索相关记忆
  async retrieveMemories(query: string, userId: string, k: number): Promise<Memory[]>

  // 记忆衰减
  async decayMemories(userId: string): Promise<void>

  // 记忆合并
  async mergeMemories(memoryIds: string[]): Promise<Memory>
}
```

### 5.4 Skill Distillation Service

**职责**: 从讨论中蒸馏可复用技能

```typescript
// src/lib/services/skill-distillation-service.ts

class SkillDistillationService {
  // 从讨论中提取技能
  async extractSkills(discussionId: string): Promise<DistilledSkill[]>

  // 存储技能
  async storeSkill(skill: SkillInput): Promise<DistilledSkill>

  // 搜索相关技能
  async searchSkills(query: string): Promise<DistilledSkill[]>

  // 应用技能到新项目
  async applySkill(skillId: string, projectId: string): Promise<void>
}
```

---

## 六、API 设计

### 6.1 RESTful API 路由

```
/api/
├── auth/
│   ├── [...nextauth]/          # NextAuth 处理
│   ├── forgot-password/        # 忘记密码
│   ├── reset-password/         # 重置密码
│   └── phone/
│       ├── send-code/          # 发送验证码
│       └── verify/             # 验证码校验
│
├── chat/                       # AI 对话
│   └── route.ts               # POST: 发送消息 (SSE)
│
├── discussion/
│   ├── route.ts               # GET: 列表, POST: 创建
│   ├── start/                 # POST: 开始讨论
│   ├── conclude/              # POST: 结束讨论
│   └── multi-agent/           # POST: 多高管讨论
│
├── decisions/
│   ├── route.ts               # GET: 列表, POST: 创建
│   └── [id]/                  # GET/PATCH/DELETE
│
├── memories/
│   ├── route.ts               # GET: 列表
│   ├── extract/               # POST: 提取记忆
│   └── stats/                 # GET: 统计
│
├── stripe/
│   ├── checkout/              # POST: 创建结账
│   ├── portal/                # POST: 客户门户
│   └── webhook/               # POST: Webhook
│
└── cron/
    ├── standups/              # 定时站会
    ├── decisions/             # 决策检查
    ├── memory-maintenance/    # 记忆维护
    └── skill-distillation/    # 技能蒸馏
```

### 6.2 tRPC 路由

```typescript
// src/lib/trpc/routers/index.ts

export const appRouter = createRouter({
  project: projectRouter,      // 项目管理
  user: userRouter,            // 用户管理
  executive: executiveRouter,  // 高管管理
  notification: notificationRouter,  // 通知
  discussion: discussionRouter,      // 讨论
})
```

---

## 七、安全架构

### 7.1 认证安全

```yaml
认证方式:
  - NextAuth.js 统一管理
  - JWT Token (HS256)
  - Session 存储于 MongoDB

OAuth 提供商:
  - Google OAuth 2.0
  - GitHub OAuth

密码安全:
  - bcrypt 哈希 (10 rounds)
  - 密码强度验证
```

### 7.2 API 安全

```yaml
请求验证:
  - NextAuth Session 验证
  - tRPC Context 验证

速率限制:
  - API 路由速率限制
  - AI 调用配额限制

数据验证:
  - Zod Schema 验证
  - 输入清理
```

### 7.3 数据安全

```yaml
数据库安全:
  - MongoDB Atlas 加密
  - 连接字符串环境变量

敏感数据:
  - API Key 加密存储
  - 环境变量管理
```

---

## 八、性能优化

### 8.1 前端优化

```yaml
代码分割:
  - Next.js 自动代码分割
  - 动态导入懒加载

缓存策略:
  - React Query 缓存
  - SWR 数据缓存

资源优化:
  - 图片优化 (next/image)
  - 字体优化 (next/font)
```

### 8.2 后端优化

```yaml
数据库优化:
  - 索引优化
  - 查询优化
  - 连接池管理

API 优化:
  - 流式响应 (SSE)
  - 批量操作
  - 缓存层
```

### 8.3 AI 调用优化

```yaml
模型选择:
  - Haiku: 简单任务 (话题分类、快速判断)
  - Sonnet: 常规任务 (对话、讨论)
  - Opus: 复杂任务 (深度分析、策略规划)

成本优化:
  - 提示词压缩
  - 缓存相似请求
  - 批量处理
```

---

## 九、监控和日志

### 9.1 应用监控

```yaml
健康检查:
  - /api/health 端点
  - 数据库连接检查
  - 外部服务检查

性能监控:
  - Vercel Analytics
  - Core Web Vitals
```

### 9.2 日志系统

```yaml
日志级别:
  - error: 错误信息
  - warn: 警告信息
  - info: 一般信息
  - debug: 调试信息

日志内容:
  - API 请求日志
  - 错误堆栈追踪
  - AI 调用日志
  - 支付事件日志
```

---

## 十、部署架构

### 10.1 生产环境

```
┌─────────────────────────────────────────────────────────────┐
│                        CDN Layer                             │
│                     Cloudflare CDN                           │
└─────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────┐
│                     Application Layer                        │
│                     Vercel Edge Network                      │
│  ┌───────────────────────────────────────────────────────┐  │
│  │               Next.js Application                      │  │
│  │            (Serverless Functions)                      │  │
│  └───────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────┘
                              │
              ┌───────────────┼───────────────┐
              ▼               ▼               ▼
┌─────────────────┐  ┌─────────────┐  ┌─────────────────┐
│  MongoDB Atlas  │  │  Pinecone   │  │     Stripe      │
│   (Database)    │  │  (Vector)   │  │   (Payments)    │
└─────────────────┘  └─────────────┘  └─────────────────┘
```

### 10.2 Docker 开发环境

```yaml
# docker-compose.yml
services:
  app:
    build: .
    ports:
      - "3000:3000"
    environment:
      - NODE_ENV=development

  mongodb:
    image: mongo:7
    ports:
      - "27017:27017"

  redis:
    image: redis:7-alpine
    ports:
      - "6379:6379"
```

---

**最后更新**: 2026-01-13
