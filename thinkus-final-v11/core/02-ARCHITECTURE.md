# Thinkus 技术架构文档

> **版本: v11.0 | 日期: 2026-01-15**

---

## 1. 系统架构概览

```
┌─────────────────────────────────────────────────────────────────────────┐
│                        用户界面层                                        │
│  Next.js 14 + Tailwind + shadcn/ui                                      │
│  CEO Dashboard | 对话界面 | 确认中心 | 通知系统 | 邀请管理               │
└─────────────────────────────────────────────────────────────────────────┘
                                │
                                ▼
┌─────────────────────────────────────────────────────────────────────────┐
│                        API层 (tRPC)                                      │
│  认证 | 项目 | 讨论 | 决策 | 通知 | 邀请 | 订阅 | 用户                   │
└─────────────────────────────────────────────────────────────────────────┘
                                │
                                ▼
┌─────────────────────────────────────────────────────────────────────────┐
│                   AI自治运营层                                            │
│  ┌─────────────┐ ┌─────────────┐ ┌─────────────┐ ┌─────────────┐       │
│  │ 数据感知引擎 │ │ 高管讨论引擎 │ │ 决策分级引擎 │ │ 自动执行引擎 │       │
│  └─────────────┘ └─────────────┘ └─────────────┘ └─────────────┘       │
└─────────────────────────────────────────────────────────────────────────┘
                                │
                                ▼
┌─────────────────────────────────────────────────────────────────────────┐
│                      Agent编排层                                          │
│  用户专属高管实例 (18个/用户) + 共享外部专家 (20个)                       │
│  ┌─────────────────────────────────────────────────────────────────┐   │
│  │  用户A: A的Mike | A的Elena | A的David | ... (完全隔离)           │   │
│  │  用户B: B的Mike | B的Elena | B的David | ... (完全隔离)           │   │
│  └─────────────────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────────────────┘
                                │
              ┌─────────────────┼─────────────────┐
              ▼                 ▼                 ▼
┌─────────────────┐ ┌─────────────────┐ ┌─────────────────┐
│   记忆系统       │ │   知识库        │ │  提示词系统      │
│  双层记忆       │ │  模板+最佳实践  │ │  动态加载       │
│  Pinecone隔离   │ │  Knowledge Base │ │  Prompt System  │
└─────────────────┘ └─────────────────┘ └─────────────────┘
                                │
                                ▼
┌─────────────────────────────────────────────────────────────────────────┐
│                       AI执行层                                            │
│  Claude Opus (核心分析) | Claude Sonnet (常规) | Claude Haiku (调度)     │
└─────────────────────────────────────────────────────────────────────────┘
                                │
                                ▼
┌─────────────────────────────────────────────────────────────────────────┐
│                      基础设施层                                           │
│  MongoDB | Pinecone | Redis | S3/R2 | Vercel | Stripe | Cron Jobs       │
└─────────────────────────────────────────────────────────────────────────┘
```

---

## 2. 技术栈详解

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
  realtime: Socket.io / Server-Sent Events

后端:
  api: tRPC
  database: MongoDB 7 (Mongoose)
  vector_db: Pinecone
  cache: Redis
  queue: BullMQ
  storage: AWS S3 / Cloudflare R2
  scheduler: node-cron

AI:
  provider: Anthropic
  models:
    - Claude Opus: 核心分析、复杂决策
    - Claude Sonnet: 常规任务、代码生成
    - Claude Haiku: 调度、分类、简单任务
  embedding: text-embedding-3-small (OpenAI)

自治系统:
  scheduler: node-cron (定时任务)
  event_bus: Redis Pub/Sub (事件总线)
  decision_engine: 自研决策分级引擎
  notification: Resend (邮件) + Push

部署:
  hosting: Vercel / Railway
  database: MongoDB Atlas
  vector_db: Pinecone
  cdn: Cloudflare
  monitoring: Vercel Analytics + Sentry

第三方:
  auth: NextAuth.js
  payment: Stripe + 微信支付
  email: Resend
  sms: Twilio (紧急通知)
  analytics: PostHog
```

---

## 3. 用户专属高管架构 (核心设计)

### 3.1 架构总览

```
┌─────────────────────────────────────────────────────────────────────────┐
│                                                                          │
│                          用户隔离架构                                    │
│                                                                          │
│   用户A                              用户B                               │
│   ════════════════                   ════════════════                    │
│                                                                          │
│   ┌─────────────────────┐            ┌─────────────────────┐            │
│   │  用户A的专属高管     │            │  用户B的专属高管     │            │
│   │  ─────────────────  │            │  ─────────────────  │            │
│   │                     │  完全隔离   │                     │            │
│   │  A的Mike (实例)     │ ◄────────► │  B的Mike (实例)     │            │
│   │  A的Elena (实例)    │            │  B的Elena (实例)    │            │
│   │  A的David (实例)    │            │  B的David (实例)    │            │
│   │  ...                │            │  ...                │            │
│   │                     │            │                     │            │
│   │  ┌───────────────┐  │            │  ┌───────────────┐  │            │
│   │  │ A的记忆库      │  │            │  │ B的记忆库      │  │            │
│   │  │ (完全隔离)     │  │            │  │ (完全隔离)     │  │            │
│   │  └───────────────┘  │            │  └───────────────┘  │            │
│   │                     │            │                     │            │
│   └─────────────────────┘            └─────────────────────┘            │
│              │                                  │                        │
│              └──────────┬───────────────────────┘                        │
│                         │                                                │
│                         ▼                                                │
│                  ┌──────────────┐                                        │
│                  │  技能蒸馏    │                                        │
│                  │  (匿名化)    │                                        │
│                  └──────┬───────┘                                        │
│                         │                                                │
│                         ▼                                                │
│                  ┌──────────────┐                                        │
│                  │  共享技能库   │  ← 用户无感知                          │
│                  │  (无隐私)     │    高管静默变强                        │
│                  └──────────────┘                                        │
│                                                                          │
└─────────────────────────────────────────────────────────────────────────┘
```

### 3.2 数据隔离实现

```typescript
// Pinecone 索引结构
// 索引名: thinkus-user-memories

// 命名空间规则: user_{userId}_{agentId}
// 示例:
//   user_abc123_mike     - 用户abc123的Mike的记忆
//   user_abc123_elena    - 用户abc123的Elena的记忆
//   user_def456_mike     - 用户def456的Mike的记忆 (完全隔离)

interface MemoryVector {
  id: string
  values: number[]  // 1536维向量
  metadata: {
    userId: string     // 用户ID (冗余，便于验证)
    agentId: string    // 高管ID
    projectId: string  // 项目ID
    type: MemoryType   // 记忆类型
    content: string    // 原始内容
    summary: string    // 摘要
    importance: number // 重要性 1-5
    timestamp: number  // 时间戳
  }
}

// 查询时强制校验
async function queryMemories(
  userId: string,
  agentId: string,
  query: string,
  topK: number = 10
) {
  const namespace = `user_${userId}_${agentId}`
  
  // 严格限制在用户的命名空间内查询
  const results = await pinecone
    .index('thinkus-user-memories')
    .namespace(namespace)
    .query({
      vector: await embed(query),
      topK,
      includeMetadata: true
    })
  
  // 二次验证 userId
  return results.matches.filter(m => 
    m.metadata?.userId === userId
  )
}
```

### 3.3 高管实例管理

```typescript
// MongoDB: user_executives 集合
interface UserExecutive {
  _id: ObjectId
  userId: ObjectId           // 所属用户
  agentId: string           // 高管ID: mike, elena, david...
  
  // 实例状态
  status: 'active' | 'suspended'
  
  // 记忆统计
  memoryStats: {
    totalMemories: number
    lastMemoryAt: Date
    memoryByType: Record<MemoryType, number>
  }
  
  // 学习到的偏好
  learnedPreferences: {
    communicationStyle?: string
    focusAreas?: string[]
    dislikes?: string[]
    customInstructions?: string
  }
  
  // 使用统计
  usageStats: {
    totalDiscussions: number
    totalMessages: number
    lastActiveAt: Date
  }
  
  createdAt: Date
  updatedAt: Date
}

// 用户注册时初始化18个高管实例
async function initializeUserExecutives(userId: string) {
  const executives = EXECUTIVE_CONFIGS.map(config => ({
    userId,
    agentId: config.id,
    status: 'active',
    memoryStats: { totalMemories: 0, memoryByType: {} },
    learnedPreferences: {},
    usageStats: { totalDiscussions: 0, totalMessages: 0 }
  }))
  
  await db.userExecutives.insertMany(executives)
}
```

---

## 4. 双层记忆系统

### 4.1 记忆架构

```yaml
Layer 1 - 高管进化记忆 (跨项目):
  ─────────────────────────────────
  存储内容:
    - 用户偏好 (喜欢简洁/详细、关注点...)
    - 沟通风格 (正式/轻松...)
    - 决策模式 (风险偏好、决策速度...)
    - 反馈学习 (用户不喜欢什么...)
  
  作用: 让高管越来越懂这个用户
  范围: 跨所有项目
  保留: 长期

Layer 2 - 项目记忆 (项目内):
  ─────────────────────────────────
  存储内容:
    - 项目背景 (目标、约束...)
    - 决策历史 (为什么选A不选B...)
    - 讨论记录 (关键洞察、结论...)
    - 任务状态 (进度、阻塞...)
  
  作用: 让高管了解这个项目的一切
  范围: 仅当前项目
  保留: 跟随项目生命周期
```

### 4.2 记忆类型定义

```typescript
enum MemoryType {
  // 项目信息
  PROJECT_CONTEXT = 'project_context',
  PROJECT_DECISION = 'project_decision',
  PROJECT_MILESTONE = 'project_milestone',
  
  // 用户信息
  USER_PREFERENCE = 'user_preference',
  USER_FEEDBACK = 'user_feedback',
  USER_STYLE = 'user_style',
  
  // 讨论信息
  DISCUSSION_INSIGHT = 'discussion_insight',
  DISCUSSION_CONCLUSION = 'discussion_conclusion',
  
  // 数据洞察
  DATA_INSIGHT = 'data_insight',
  METRIC_TREND = 'metric_trend',
}

interface Memory {
  id: string
  agentId: string
  userId: string
  projectId?: string  // null = 跨项目记忆
  
  type: MemoryType
  content: string
  summary: string
  embedding: number[]
  
  metadata: {
    importance: 1 | 2 | 3 | 4 | 5
    confidence: number
    source: string
    tags: string[]
    relatedMemories: string[]
  }
  
  createdAt: Date
  lastAccessedAt: Date
  accessCount: number
}
```

### 4.3 记忆检索流程

```typescript
async function retrieveContextForAgent(
  userId: string,
  agentId: string,
  projectId: string,
  currentMessage: string
): Promise<string> {
  // 1. 检索项目记忆 (Layer 2)
  const projectMemories = await queryMemories(
    userId, 
    agentId,
    currentMessage,
    { projectId, topK: 5 }
  )
  
  // 2. 检索用户偏好 (Layer 1)
  const userPreferences = await queryMemories(
    userId,
    agentId,
    currentMessage,
    { projectId: null, types: ['USER_PREFERENCE', 'USER_STYLE'], topK: 3 }
  )
  
  // 3. 组装上下文
  return formatMemoriesAsContext(projectMemories, userPreferences)
}
```

---

## 5. AI自治运营系统

### 5.1 四大核心引擎

```
┌─────────────────────────────────────────────────────────────────────────┐
│                        AI自治运营系统                                     │
├─────────────────────────────────────────────────────────────────────────┤
│                                                                          │
│  ┌──────────────────┐         ┌──────────────────┐                      │
│  │   数据感知引擎    │ ──────→ │   高管讨论引擎    │                      │
│  │  Data Sensing    │         │  Executive Chat  │                      │
│  │                  │         │                  │                      │
│  │  • 用户行为监控   │         │  • 18高管讨论    │                      │
│  │  • 错误日志分析   │         │  • 问题诊断      │                      │
│  │  • 反馈收集      │         │  • 方案形成      │                      │
│  │  • 指标异常检测   │         │  • 意见综合      │                      │
│  └──────────────────┘         └────────┬─────────┘                      │
│                                        │                                │
│                                        ▼                                │
│  ┌──────────────────┐         ┌──────────────────┐                      │
│  │   自动执行引擎    │ ←────── │   决策分级引擎    │                      │
│  │  Auto Executor   │         │  Decision Engine │                      │
│  │                  │         │                  │                      │
│  │  • 代码部署      │         │  • 风险评估      │                      │
│  │  • 内容发布      │         │  • 级别判定      │                      │
│  │  • 配置更新      │         │  • 路由决策      │                      │
│  │  • 通知发送      │         │  • 确认请求      │                      │
│  └──────────────────┘         └──────────────────┘                      │
│                                                                          │
└─────────────────────────────────────────────────────────────────────────┘
```

### 5.2 决策分级系统

```typescript
enum DecisionLevel {
  L0_AUTO = 0,      // 全自动执行
  L1_NOTIFY = 1,    // 执行后通知
  L2_CONFIRM = 2,   // 执行前确认
  L3_CRITICAL = 3,  // 强制详细确认
}

interface DecisionRule {
  level: DecisionLevel
  conditions: {
    riskScore: [number, number]  // 风险分数范围 0-100
    impactScope: 'none' | 'minor' | 'moderate' | 'major' | 'critical'
    reversible: boolean
    category: DecisionCategory[]
  }
  actions: {
    autoExecute: boolean
    notifyUser: boolean
    requireConfirm: boolean
    notifyChannels: ('app' | 'email' | 'sms')[]
  }
}
```

### 5.3 各级别定义

```yaml
Level 0 - 全自动:
  风险分数: 0-20
  影响范围: none | minor
  可回滚: true
  
  包含:
    - Bug修复 (不影响核心功能)
    - 性能优化 (CSS/JS)
    - UI微调 (颜色、间距)
    - 日常内容发布 (已审核模板)
    - 客服自动回复
    - 依赖包安全更新
  
  执行: 直接执行，记录日志

Level 1 - 通知:
  风险分数: 21-50
  影响范围: minor | moderate
  可回滚: true
  
  包含:
    - 新增小功能 (非核心)
    - A/B测试启动
    - 营销活动上线 (模板内)
    - 小额退款处理 (<$50)
  
  执行: 执行后通知，用户可回滚

Level 2 - 确认:
  风险分数: 51-80
  影响范围: moderate | major
  可回滚: 部分可回滚
  
  包含:
    - 新功能上线 (核心功能)
    - 核心流程变更
    - 大型营销活动
    - 中额支出 ($100-500)
  
  执行: 需用户确认后执行
  超时: 48小时

Level 3 - 强制确认:
  风险分数: 81-100
  影响范围: major | critical
  可回滚: 不可回滚或高成本
  
  包含:
    - 安全漏洞修复方案
    - 用户协议修改
    - 大额支出 (>$500)
    - 重大架构调整
  
  执行: 必须详细说明 + 手动确认
  通知: 推送 + 短信 + 邮件
  超时: 72小时
```

---

## 6. 智能调度系统

### 6.1 调度逻辑

```typescript
interface SchedulingConfig {
  // 根据项目阶段配置核心高管
  phaseConfigs: {
    ideation: ['mike', 'nathan']
    definition: ['mike', 'elena', 'david']
    design: ['elena', 'david']
    development: ['david', 'james']
    prelaunch: ['kevin', 'lisa', 'marcus']
    growth: ['lisa', 'sarah', 'marcus']
  }
  
  // 根据话题动态加入
  topicExperts: {
    pricing: ['frank']
    legal: ['tom']
    security: ['alex']
    data: ['sarah']
    growth: ['lisa']
    design: ['elena', 'chloe']
  }
}

async function scheduleDiscussion(
  projectId: string,
  topic: string,
  complexity: 'simple' | 'medium' | 'complex'
): Promise<string[]> {
  const project = await getProject(projectId)
  
  // 1. 获取阶段核心高管
  const coreAgents = config.phaseConfigs[project.phase]
  
  // 2. 分析话题，加入相关专家
  const topicAgents = await analyzeTopicExperts(topic)
  
  // 3. 根据复杂度调整人数
  const maxAgents = complexity === 'simple' ? 3 : complexity === 'medium' ? 5 : 8
  
  // 4. 合并去重
  const allAgents = [...new Set([...coreAgents, ...topicAgents])]
  
  return allAgents.slice(0, maxAgents)
}
```

### 6.2 成本控制

```typescript
interface CostControl {
  dailyBudget: {
    seed: 50,       // ¥99/月 → ¥50/天
    growth: 150,    // ¥299/月 → ¥150/天
    scale: 350,     // ¥699/月 → ¥350/天
    enterprise: 1000 // ¥1499/月 → ¥1000/天
  }
  
  modelCost: {
    opus: 0.15,    // ¥/千tokens
    sonnet: 0.03,
    haiku: 0.005
  }
}

// 智能选择模型
function selectModel(task: Task): Model {
  if (task.type === 'scheduling' || task.type === 'classification') {
    return 'haiku'  // 简单任务用便宜的
  }
  if (task.type === 'code' || task.type === 'routine') {
    return 'sonnet' // 常规任务
  }
  return 'opus'     // 核心分析用最强的
}
```

---

## 7. API设计概览

### 7.1 核心Router

```yaml
# 用户相关
user:
  me: 获取当前用户
  updateProfile: 更新资料
  getNotificationPreferences: 获取通知偏好

# 项目相关
project:
  list: 获取项目列表
  create: 创建项目
  get: 获取项目详情
  updatePhase: 更新阶段
  getDeliverables: 获取交付物

# 讨论相关
discussion:
  start: 开始讨论
  sendMessage: 发送消息
  getHistory: 获取历史
  getActive: 获取进行中讨论

# 决策相关
decision:
  getPending: 获取待确认决策
  confirm: 确认决策
  reject: 拒绝决策
  rollback: 回滚决策

# 高管相关
executive:
  list: 获取我的高管列表
  getMemories: 获取高管记忆
  setPreferences: 设置偏好

# 邀请相关
invitation:
  apply: 申请排队
  checkStatus: 查询状态
  getMyCodes: 获取我的邀请码
  getInvitations: 获取邀请记录

# 订阅相关
subscription:
  getCurrent: 获取当前订阅
  upgrade: 升级
  getUsage: 获取用量
```

---

## 8. 数据库设计概览

### 8.1 核心集合

```yaml
MongoDB集合:

users:
  - 用户基础信息
  - 认证信息
  - 邀请码信息

user_executives:
  - 用户的18个高管实例
  - 每个高管的学习偏好
  - 使用统计

projects:
  - 项目信息
  - 阶段状态
  - 配置

discussions:
  - 讨论记录
  - 参与高管
  - 消息历史

decisions:
  - 决策记录
  - 确认状态
  - 执行结果

memories:
  - 记忆内容 (元数据)
  - 向量ID关联

subscriptions:
  - 订阅信息
  - 用量统计

waitlist:
  - 排队申请
  - 审核状态

invitation_codes:
  - 邀请码
  - 使用记录
```

### 8.2 Pinecone索引

```yaml
Pinecone索引:

thinkus-user-memories:
  维度: 1536
  命名空间: user_{userId}_{agentId}
  元数据:
    - userId
    - agentId
    - projectId
    - type
    - content
    - importance
    - timestamp

thinkus-shared-skills:
  维度: 1536
  命名空间: skill_{category}
  元数据:
    - category
    - skill
    - example
    - confidence
```

---

## 9. 部署架构

```yaml
生产环境:

前端:
  平台: Vercel
  域名: thinkus.ai
  CDN: Cloudflare

后端:
  平台: Vercel Serverless / Railway
  API: api.thinkus.ai

数据库:
  MongoDB: MongoDB Atlas (M10+)
  向量数据库: Pinecone (Standard)
  缓存: Upstash Redis

存储:
  文件: Cloudflare R2
  日志: Better Stack

定时任务:
  每日例会: Vercel Cron / Railway
  数据分析: 后台Job

监控:
  错误: Sentry
  性能: Vercel Analytics
  业务: PostHog
```

---

## 10. 安全设计

```yaml
认证:
  方式: NextAuth.js
  会话: JWT + HttpOnly Cookie
  过期: 7天

授权:
  模式: RBAC
  校验: 每个API都校验userId

数据隔离:
  数据库: userId强制过滤
  向量库: 命名空间隔离
  文件: 路径隔离

加密:
  传输: HTTPS
  存储: 敏感字段AES加密
  密钥: 环境变量

API安全:
  限流: 100 req/min/user
  验证: Zod schema
  CORS: 白名单域名
```

---

**相关文档**:
- [PRD](01-PRD.md)
- [数据模型](03-DATA-MODELS.md)
- [用户专属高管架构](../technical/01-USER-EXCLUSIVE-EXECUTIVES.md)
- [API规格](../technical/04-API-SPECS.md)
