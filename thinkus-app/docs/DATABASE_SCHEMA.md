# Thinkus 数据库 Schema 文档

> MongoDB 数据模型完整定义

---

## 一、用户相关模型

### 1.1 User (用户)

```typescript
// src/lib/db/models/user.ts

interface User {
  _id: ObjectId
  email: string                    // 邮箱
  emailVerified?: Date             // 邮箱验证时间
  phone?: string                   // 手机号
  phoneVerified?: Date             // 手机验证时间
  password?: string                // 密码哈希 (bcrypt)
  name?: string                    // 用户名
  image?: string                   // 头像URL

  // 邀请相关
  invitedBy?: ObjectId             // 邀请人ID
  invitationCode?: string          // 使用的邀请码
  invitationCodesUsed: number      // 已使用邀请码数量

  // 设置
  settings: {
    theme: 'light' | 'dark' | 'system'
    language: string
    timezone: string
    notifications: {
      email: boolean
      push: boolean
      sms: boolean
    }
  }

  // 状态
  status: 'active' | 'inactive' | 'suspended'
  role: 'user' | 'admin'

  // 时间戳
  createdAt: Date
  updatedAt: Date
}

// 索引
- { email: 1 } unique
- { phone: 1 } sparse unique
- { invitedBy: 1 }
- { createdAt: -1 }
```

### 1.2 UserExecutive (用户专属高管)

```typescript
// src/lib/db/models/user-executive.ts

interface UserExecutive {
  _id: ObjectId
  userId: ObjectId                 // 所属用户
  executiveId: string              // 高管ID (mike, elena, david, etc.)

  // 个性化数据
  customName?: string              // 自定义名称
  customAvatar?: string            // 自定义头像
  customPrompt?: string            // 自定义提示词

  // 学习的偏好
  learnedPreferences: {
    communicationStyle?: string    // 沟通风格
    technicalLevel?: string        // 技术水平
    focusAreas?: string[]          // 关注领域
    preferences?: Record<string, any>
  }

  // 统计
  stats: {
    totalConversations: number
    totalMessages: number
    lastActiveAt?: Date
  }

  // 时间戳
  createdAt: Date
  updatedAt: Date
}

// 索引
- { userId: 1, executiveId: 1 } unique
- { userId: 1 }
```

### 1.3 UserCredential (用户凭证)

```typescript
// src/lib/db/models/user-credential.ts

interface UserCredential {
  _id: ObjectId
  userId: ObjectId                 // 所属用户
  type: 'api_key' | 'oauth_token' | 'service_account'
  name: string                     // 凭证名称
  key: string                      // 加密后的密钥
  provider?: string                // 提供商 (openai, github, etc.)

  // 权限
  permissions: string[]            // 权限列表

  // 状态
  status: 'active' | 'revoked'
  lastUsedAt?: Date
  expiresAt?: Date

  // 时间戳
  createdAt: Date
  updatedAt: Date
}

// 索引
- { userId: 1 }
- { userId: 1, type: 1 }
```

---

## 二、订阅支付模型

### 2.1 Subscription (订阅)

```typescript
// src/lib/db/models/subscription.ts

interface Subscription {
  _id: ObjectId
  userId: ObjectId                 // 所属用户
  plan: 'free' | 'starter' | 'professional' | 'enterprise'

  // Stripe 相关
  stripeCustomerId?: string
  stripeSubscriptionId?: string
  stripePriceId?: string

  // 状态
  status: 'active' | 'canceled' | 'past_due' | 'trialing' | 'paused'

  // 周期
  currentPeriodStart: Date
  currentPeriodEnd: Date
  cancelAtPeriodEnd: boolean

  // 配额
  features: {
    maxProjects: number
    maxDiscussionsPerMonth: number
    maxExecutives: number
    maxTeamMembers: number
    maxStorageGB: number
  }

  // 用量
  usage: {
    projectsUsed: number
    discussionsUsedThisMonth: number
    storageUsedGB: number
  }

  // 时间戳
  createdAt: Date
  updatedAt: Date
}

// 索引
- { userId: 1 } unique
- { stripeCustomerId: 1 }
- { stripeSubscriptionId: 1 }
- { status: 1 }
```

### 2.2 Payment (支付记录)

```typescript
// src/lib/db/models/payment.ts

interface Payment {
  _id: ObjectId
  userId: ObjectId
  subscriptionId?: ObjectId

  // Stripe 相关
  stripePaymentIntentId?: string
  stripeInvoiceId?: string

  // 金额
  amount: number                   // 分为单位
  currency: string                 // USD, CNY, etc.

  // 状态
  status: 'pending' | 'succeeded' | 'failed' | 'refunded'
  type: 'subscription' | 'one_time' | 'refund'

  // 详情
  description?: string
  metadata?: Record<string, any>

  // 时间戳
  paidAt?: Date
  createdAt: Date
  updatedAt: Date
}

// 索引
- { userId: 1 }
- { stripePaymentIntentId: 1 }
- { status: 1 }
- { createdAt: -1 }
```

### 2.3 InvitationCode (邀请码)

```typescript
// src/lib/db/models/invitation-code.ts

interface InvitationCode {
  _id: ObjectId
  code: string                     // 邀请码
  ownerId: ObjectId                // 所有者

  // 状态
  status: 'active' | 'used' | 'expired' | 'revoked'
  usedBy?: ObjectId                // 使用者
  usedAt?: Date

  // 限制
  maxUses: number
  usedCount: number
  expiresAt?: Date

  // 时间戳
  createdAt: Date
  updatedAt: Date
}

// 索引
- { code: 1 } unique
- { ownerId: 1 }
- { status: 1 }
```

### 2.4 Waitlist (排队列表)

```typescript
// src/lib/db/models/waitlist.ts

interface Waitlist {
  _id: ObjectId
  email: string
  phone?: string

  // 申请信息
  projectIdea?: string             // 项目想法
  role?: string                    // 角色
  source?: string                  // 来源

  // 状态
  status: 'pending' | 'approved' | 'rejected'
  priority: number                 // 优先级

  // 处理
  processedAt?: Date
  processedBy?: ObjectId
  invitationCodeSent?: string

  // 时间戳
  createdAt: Date
  updatedAt: Date
}

// 索引
- { email: 1 } unique
- { status: 1 }
- { priority: -1, createdAt: 1 }
```

---

## 三、项目相关模型

### 3.1 Project (项目)

```typescript
// src/lib/db/models/project.ts

interface Project {
  _id: ObjectId
  userId: ObjectId                 // 所有者
  name: string                     // 项目名称
  description?: string             // 项目描述

  // 产品类型
  productType: ProductType         // web_app, mobile_app, etc.

  // 阶段
  phase: ProjectPhase              // ideation, definition, etc.
  phaseHistory: {
    phase: ProjectPhase
    enteredAt: Date
    completedAt?: Date
    notes?: string
  }[]

  // 配置
  config: {
    techStack?: string[]
    targetAudience?: string
    businessModel?: string
    budget?: number
    timeline?: string
  }

  // 统计
  stats: {
    totalDiscussions: number
    totalDecisions: number
    totalActionItems: number
    completedActionItems: number
  }

  // 状态
  status: 'active' | 'paused' | 'completed' | 'archived'

  // 时间戳
  createdAt: Date
  updatedAt: Date
}

// 索引
- { userId: 1 }
- { userId: 1, status: 1 }
- { phase: 1 }
- { createdAt: -1 }
```

### 3.2 Discussion (讨论)

```typescript
// src/lib/db/models/discussion.ts

interface Discussion {
  _id: ObjectId
  projectId: ObjectId
  userId: ObjectId

  // 讨论信息
  title?: string
  topic: string
  type: 'single' | 'multi_agent'

  // 参与者
  participants: {
    executiveId: string
    joinedAt: Date
    messageCount: number
  }[]

  // 消息
  messages: {
    id: string
    role: 'user' | 'assistant'
    executiveId?: string
    content: string
    timestamp: Date
  }[]

  // 结果
  summary?: string
  conclusions?: string[]
  outcomes?: {
    decisions: ObjectId[]
    actionItems: ObjectId[]
  }

  // 状态
  status: 'active' | 'concluded' | 'archived'

  // 时间戳
  startedAt: Date
  concludedAt?: Date
  createdAt: Date
  updatedAt: Date
}

// 索引
- { projectId: 1 }
- { userId: 1 }
- { status: 1 }
- { createdAt: -1 }
```

### 3.3 Decision (决策)

```typescript
// src/lib/db/models/decision.ts

interface Decision {
  _id: ObjectId
  projectId: ObjectId
  userId: ObjectId
  discussionId?: ObjectId

  // 决策内容
  title: string
  description: string
  rationale?: string               // 决策理由

  // 分类
  type: 'technical' | 'product' | 'business' | 'design' | 'other'
  level: 'L0' | 'L1' | 'L2' | 'L3'  // 决策等级

  // 风险评估
  risk: {
    score: number                  // 0-100
    factors: string[]
    mitigations?: string[]
  }

  // 状态
  status: 'pending' | 'approved' | 'rejected' | 'executed'

  // 确认
  confirmedBy?: ObjectId
  confirmedAt?: Date
  executedAt?: Date

  // 时间戳
  createdAt: Date
  updatedAt: Date
}

// 索引
- { projectId: 1 }
- { userId: 1 }
- { discussionId: 1 }
- { status: 1 }
- { level: 1, status: 1 }
```

### 3.4 ActionItem (行动项)

```typescript
// src/lib/db/models/action-item.ts

interface ActionItem {
  _id: ObjectId
  projectId: ObjectId
  userId: ObjectId
  discussionId?: ObjectId
  decisionId?: ObjectId

  // 内容
  title: string
  description?: string

  // 分配
  assignedTo?: string              // 高管ID 或 'user'
  assignedExecutiveId?: string

  // 优先级和状态
  priority: 'low' | 'medium' | 'high' | 'urgent'
  status: 'pending' | 'in_progress' | 'completed' | 'canceled'

  // 时间
  dueDate?: Date
  completedAt?: Date

  // 时间戳
  createdAt: Date
  updatedAt: Date
}

// 索引
- { projectId: 1 }
- { userId: 1 }
- { status: 1 }
- { priority: 1, status: 1 }
- { dueDate: 1 }
```

### 3.5 Standup (例会)

```typescript
// src/lib/db/models/standup.ts

interface Standup {
  _id: ObjectId
  projectId: ObjectId
  userId: ObjectId

  // 例会内容
  type: 'daily' | 'weekly' | 'sprint'
  date: Date

  // 参与者
  participants: string[]           // 高管ID列表

  // 内容
  summary: string
  highlights: string[]
  blockers: string[]
  nextSteps: string[]

  // AI 生成的见解
  insights?: {
    progressAnalysis?: string
    riskAlerts?: string[]
    recommendations?: string[]
  }

  // 时间戳
  createdAt: Date
  updatedAt: Date
}

// 索引
- { projectId: 1 }
- { userId: 1 }
- { date: -1 }
- { type: 1 }
```

### 3.6 Deliverable (交付物)

```typescript
// src/lib/db/models/deliverable.ts

interface Deliverable {
  _id: ObjectId
  projectId: ObjectId
  userId: ObjectId

  // 内容
  name: string
  description?: string
  type: 'document' | 'design' | 'code' | 'asset' | 'other'

  // 文件
  fileUrl?: string
  fileSize?: number
  mimeType?: string

  // 版本
  version: number
  previousVersions: {
    version: number
    fileUrl: string
    createdAt: Date
  }[]

  // 状态
  status: 'draft' | 'review' | 'approved' | 'archived'

  // 时间戳
  createdAt: Date
  updatedAt: Date
}

// 索引
- { projectId: 1 }
- { type: 1 }
- { status: 1 }
```

---

## 四、AI 相关模型

### 4.1 Memory (记忆)

```typescript
// src/lib/db/models/memory.ts

interface Memory {
  _id: ObjectId
  userId: ObjectId
  projectId?: ObjectId
  executiveId?: string

  // 内容
  content: string
  type: 'preference' | 'fact' | 'decision' | 'experience'
  layer: 'user' | 'project'

  // 向量
  vectorId?: string                // Pinecone ID
  embedding?: number[]             // 可选本地存储

  // 元数据
  metadata: {
    source: 'discussion' | 'explicit' | 'inferred'
    sourceId?: string
    confidence: number             // 0-1
    importance: number             // 0-1
  }

  // 状态
  status: 'active' | 'archived' | 'merged'
  mergedInto?: ObjectId

  // 时间戳
  lastAccessedAt?: Date
  createdAt: Date
  updatedAt: Date
}

// 索引
- { userId: 1 }
- { userId: 1, projectId: 1 }
- { type: 1 }
- { layer: 1 }
- { status: 1 }
```

### 4.2 DistilledSkill (蒸馏技能)

```typescript
// src/lib/db/models/distilled-skill.ts

interface DistilledSkill {
  _id: ObjectId
  userId: ObjectId
  projectId?: ObjectId

  // 技能内容
  name: string
  description: string
  category: 'technical' | 'design' | 'business' | 'process' | 'other'

  // 来源
  sourceDiscussionIds: ObjectId[]
  extractedFrom: {
    discussionId: ObjectId
    excerpt: string
  }[]

  // 向量
  vectorId?: string
  embedding?: number[]

  // 应用记录
  applications: {
    projectId: ObjectId
    appliedAt: Date
    effectiveness?: number
  }[]

  // 状态
  status: 'active' | 'archived'

  // 时间戳
  createdAt: Date
  updatedAt: Date
}

// 索引
- { userId: 1 }
- { category: 1 }
- { status: 1 }
```

### 4.3 AIUsage (AI 使用记录)

```typescript
// src/lib/db/models/ai-usage.ts

interface AIUsage {
  _id: ObjectId
  userId: ObjectId
  projectId?: ObjectId

  // 调用信息
  model: 'haiku' | 'sonnet' | 'opus'
  type: 'chat' | 'discussion' | 'extraction' | 'embedding'

  // Token 使用
  inputTokens: number
  outputTokens: number
  totalTokens: number

  // 成本
  cost: number                     // USD

  // 性能
  latencyMs: number

  // 时间戳
  createdAt: Date
}

// 索引
- { userId: 1 }
- { projectId: 1 }
- { model: 1 }
- { createdAt: -1 }
```

---

## 五、系统模型

### 5.1 Notification (通知)

```typescript
// src/lib/db/models/notification.ts

interface Notification {
  _id: ObjectId
  userId: ObjectId

  // 通知内容
  type: 'decision_pending' | 'action_due' | 'standup_ready' | 'system'
  title: string
  message: string

  // 关联
  relatedType?: 'project' | 'decision' | 'action_item' | 'discussion'
  relatedId?: ObjectId

  // 状态
  status: 'unread' | 'read' | 'archived'

  // 渠道
  channels: ('in_app' | 'email' | 'push')[]
  sentVia: {
    channel: string
    sentAt: Date
    success: boolean
  }[]

  // 时间戳
  readAt?: Date
  createdAt: Date
  updatedAt: Date
}

// 索引
- { userId: 1 }
- { userId: 1, status: 1 }
- { createdAt: -1 }
```

### 5.2 ActivityLog (活动日志)

```typescript
// src/lib/db/models/activity-log.ts

interface ActivityLog {
  _id: ObjectId
  userId: ObjectId
  projectId?: ObjectId

  // 活动信息
  action: string                   // 'project.created', 'discussion.started', etc.
  description: string

  // 关联
  targetType?: string
  targetId?: ObjectId

  // 元数据
  metadata?: Record<string, any>

  // IP 和设备
  ip?: string
  userAgent?: string

  // 时间戳
  createdAt: Date
}

// 索引
- { userId: 1 }
- { projectId: 1 }
- { action: 1 }
- { createdAt: -1 }
```

### 5.3 Feedback (用户反馈)

```typescript
// src/lib/db/models/feedback.ts

interface Feedback {
  _id: ObjectId
  userId: ObjectId

  // 反馈内容
  type: 'bug' | 'feature' | 'improvement' | 'other'
  title: string
  description: string

  // 评分
  rating?: number                  // 1-5

  // 状态
  status: 'new' | 'reviewed' | 'in_progress' | 'resolved' | 'closed'

  // 回复
  response?: {
    message: string
    respondedBy: ObjectId
    respondedAt: Date
  }

  // 时间戳
  createdAt: Date
  updatedAt: Date
}

// 索引
- { userId: 1 }
- { type: 1 }
- { status: 1 }
- { createdAt: -1 }
```

### 5.4 VerificationCode (验证码)

```typescript
// src/lib/db/models/verification-code.ts

interface VerificationCode {
  _id: ObjectId
  identifier: string               // 邮箱或手机号
  code: string                     // 验证码
  type: 'email' | 'phone'
  purpose: 'login' | 'register' | 'reset_password'

  // 状态
  used: boolean
  attempts: number

  // 过期
  expiresAt: Date

  // 时间戳
  createdAt: Date
}

// 索引
- { identifier: 1, type: 1, purpose: 1 }
- { expiresAt: 1 } TTL
```

---

## 六、索引策略总结

### 6.1 复合索引

```javascript
// 常用查询优化
db.projects.createIndex({ userId: 1, status: 1, createdAt: -1 })
db.discussions.createIndex({ projectId: 1, status: 1, createdAt: -1 })
db.decisions.createIndex({ projectId: 1, level: 1, status: 1 })
db.action_items.createIndex({ projectId: 1, status: 1, dueDate: 1 })
db.memories.createIndex({ userId: 1, layer: 1, type: 1 })
db.notifications.createIndex({ userId: 1, status: 1, createdAt: -1 })
```

### 6.2 TTL 索引

```javascript
// 自动过期
db.verification_codes.createIndex({ expiresAt: 1 }, { expireAfterSeconds: 0 })
db.sessions.createIndex({ expiresAt: 1 }, { expireAfterSeconds: 0 })
```

### 6.3 文本索引

```javascript
// 全文搜索
db.projects.createIndex({ name: 'text', description: 'text' })
db.discussions.createIndex({ topic: 'text', 'messages.content': 'text' })
```

---

**最后更新**: 2026-01-13
