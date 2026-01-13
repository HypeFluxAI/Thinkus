# Thinkus 数据模型定义

> **版本: v11.0 | 日期: 2026-01-15**

---

## 1. 用户相关

### 1.1 User (用户)

```typescript
interface IUser {
  _id: ObjectId
  
  // 基础信息
  email: string                    // 唯一
  name: string
  avatar?: string
  
  // 认证
  password?: string                // 邮箱注册时有
  providers: Array<{               // OAuth提供商
    provider: 'google' | 'github'
    providerId: string
  }>
  
  // 邀请相关
  invitedBy?: ObjectId            // 邀请人
  invitationCode?: string         // 使用的邀请码
  
  // 设置
  settings: {
    language: 'zh' | 'en'
    theme: 'light' | 'dark' | 'system'
    timezone: string
    notifications: {
      email: boolean
      push: boolean
      sms: boolean               // 仅紧急通知
      dailySummary: boolean
      weeklyReport: boolean
    }
  }
  
  // 状态
  status: 'active' | 'suspended' | 'deleted'
  emailVerified: boolean
  
  createdAt: Date
  updatedAt: Date
  lastLoginAt?: Date
}
```

### 1.2 UserExecutive (用户专属高管)

```typescript
interface IUserExecutive {
  _id: ObjectId
  userId: ObjectId               // 所属用户
  agentId: AgentId              // 高管ID
  
  // 实例状态
  status: 'active' | 'suspended'
  
  // 记忆统计
  memoryStats: {
    totalMemories: number
    lastMemoryAt?: Date
    memoryByType: Record<MemoryType, number>
  }
  
  // 学习到的偏好
  learnedPreferences: {
    communicationStyle?: 'formal' | 'casual' | 'concise' | 'detailed'
    focusAreas?: string[]
    dislikes?: string[]
    decisionStyle?: 'fast' | 'careful' | 'data-driven'
    customInstructions?: string
  }
  
  // 使用统计
  usageStats: {
    totalDiscussions: number
    totalMessages: number
    lastActiveAt?: Date
    averageResponseRating?: number
  }
  
  createdAt: Date
  updatedAt: Date
}

// 高管ID类型 (18个)
type AgentId = 
  | 'mike' | 'elena' | 'rachel' | 'chloe'      // 产品设计
  | 'david' | 'james' | 'kevin' | 'alex'        // 技术
  | 'lisa' | 'marcus' | 'nina' | 'sarah'        // 增长运营
  | 'frank' | 'tom' | 'iris'                    // 财务法务
  | 'nathan' | 'oscar' | 'victor'               // 战略支持
```

---

## 2. 项目相关

### 2.1 Project (项目)

```typescript
interface IProject {
  _id: ObjectId
  userId: ObjectId
  
  // 基础信息
  name: string
  description: string
  oneLiner?: string
  
  // 类型
  type: 'web' | 'mobile' | 'game' | 'desktop' | 'blockchain' | 'other'
  industry?: string
  
  // 阶段
  phase: ProjectPhase
  phaseHistory: Array<{
    phase: ProjectPhase
    startedAt: Date
    completedAt?: Date
  }>
  
  // 配置
  config: {
    autoRun: boolean
    notifyLevel: DecisionLevel
  }
  
  // 统计
  stats: {
    totalDiscussions: number
    totalDecisions: number
    totalDeliverables: number
  }
  
  status: 'active' | 'paused' | 'completed' | 'archived'
  
  createdAt: Date
  updatedAt: Date
}

type ProjectPhase = 
  | 'ideation'      // 想法探索
  | 'definition'    // 需求定义
  | 'design'        // 设计阶段
  | 'development'   // 开发阶段
  | 'prelaunch'     // 发布准备
  | 'growth'        // 增长运营
```

---

## 3. 讨论相关

### 3.1 Discussion (讨论)

```typescript
interface IDiscussion {
  _id: ObjectId
  projectId: ObjectId
  userId: ObjectId
  
  // 讨论主题
  topic: string
  context?: string
  
  // 触发方式
  trigger: 'user' | 'scheduled' | 'event' | 'system'
  
  // 参与高管
  participants: AgentId[]
  
  // 消息历史
  messages: DiscussionMessage[]
  
  // 讨论结果
  summary?: string
  conclusions?: string[]
  actionItems?: Array<{
    description: string
    assignee: AgentId
    status: 'pending' | 'in_progress' | 'completed'
  }>
  
  // 关联决策
  decisions?: ObjectId[]
  
  // 状态
  status: 'active' | 'concluded' | 'cancelled'
  
  createdAt: Date
  concludedAt?: Date
}

interface DiscussionMessage {
  id: string
  role: 'user' | 'agent' | 'system'
  agentId?: AgentId
  content: string
  metadata?: {
    thinking?: string
    references?: string[]
    confidence?: number
  }
  timestamp: Date
}
```

---

## 4. 决策相关

### 4.1 Decision (决策)

```typescript
interface IDecision {
  _id: ObjectId
  projectId: ObjectId
  userId: ObjectId
  discussionId?: ObjectId
  
  // 决策内容
  title: string
  description: string
  category: DecisionCategory
  
  // 决策级别
  level: DecisionLevel
  levelReason: string
  
  // 风险评估
  risk: {
    score: number              // 0-100
    factors: Array<{
      factor: string
      score: number
      description: string
    }>
  }
  
  // 推荐操作
  recommendedAction: {
    type: string
    description: string
    params?: Record<string, any>
  }
  
  // 状态
  status: 'pending' | 'approved' | 'rejected' | 'expired' | 'executed' | 'rolled_back'
  
  // 用户响应
  userResponse?: {
    action: 'approve' | 'reject' | 'modify'
    comment?: string
    respondedAt: Date
  }
  
  // 执行信息
  execution?: {
    executedAt: Date
    result: 'success' | 'failed'
    rollbackAvailable: boolean
  }
  
  // 超时设置
  expiresAt?: Date
  
  createdAt: Date
  updatedAt: Date
}

enum DecisionLevel {
  L0_AUTO = 0,
  L1_NOTIFY = 1,
  L2_CONFIRM = 2,
  L3_CRITICAL = 3,
}

type DecisionCategory = 
  | 'product_feature' | 'product_change' | 'design_change'
  | 'tech_change' | 'marketing' | 'content'
  | 'security' | 'legal' | 'finance' | 'operations'
```

---

## 5. 记忆相关

### 5.1 Memory (记忆)

```typescript
interface IMemory {
  _id: ObjectId
  userId: ObjectId
  agentId: AgentId
  projectId?: ObjectId          // null = 跨项目记忆
  
  // 内容
  type: MemoryType
  content: string
  summary: string
  
  // Pinecone关联
  vectorId: string
  namespace: string             // user_{userId}_{agentId}
  
  // 元数据
  metadata: {
    importance: 1 | 2 | 3 | 4 | 5
    confidence: number
    source: 'discussion' | 'user_input' | 'data_analysis' | 'feedback'
    tags: string[]
  }
  
  // 访问统计
  accessCount: number
  lastAccessedAt?: Date
  
  status: 'active' | 'archived' | 'deprecated'
  
  createdAt: Date
}

enum MemoryType {
  PROJECT_CONTEXT = 'project_context',
  PROJECT_DECISION = 'project_decision',
  USER_PREFERENCE = 'user_preference',
  USER_FEEDBACK = 'user_feedback',
  DISCUSSION_INSIGHT = 'discussion_insight',
  DISCUSSION_CONCLUSION = 'discussion_conclusion',
  DATA_INSIGHT = 'data_insight',
}
```

---

## 6. 订阅相关

### 6.1 Subscription (订阅)

```typescript
interface ISubscription {
  _id: ObjectId
  userId: ObjectId
  projectId: ObjectId
  
  // 套餐
  tier: 'seed' | 'growth' | 'scale' | 'enterprise'
  billingCycle: 'monthly' | 'yearly'
  amount: number
  currency: 'CNY' | 'USD'
  
  // Stripe
  stripeCustomerId?: string
  stripeSubscriptionId?: string
  
  // 状态
  status: 'active' | 'past_due' | 'cancelled' | 'expired'
  currentPeriodStart: Date
  currentPeriodEnd: Date
  
  // 用量
  usage: {
    discussionsThisMonth: number
    expertConsultationsThisMonth: number
    lastResetAt: Date
  }
  
  createdAt: Date
  updatedAt: Date
}
```

### 6.2 套餐配置

```typescript
const PLAN_LIMITS = {
  seed: {
    discussionsPerMonth: 150,
    memoriesPerAgent: 50,
    expertConsultationsPerMonth: 0,
    invitationCodesPerMonth: 0,
  },
  growth: {
    discussionsPerMonth: 600,
    memoriesPerAgent: 200,
    expertConsultationsPerMonth: 5,
    invitationCodesPerMonth: 1,
  },
  scale: {
    discussionsPerMonth: 2000,
    memoriesPerAgent: 500,
    expertConsultationsPerMonth: 20,
    invitationCodesPerMonth: 2,
  },
  enterprise: {
    discussionsPerMonth: Infinity,
    memoriesPerAgent: Infinity,
    expertConsultationsPerMonth: Infinity,
    invitationCodesPerMonth: 3,
  }
}
```

---

## 7. 邀请相关

### 7.1 Waitlist (排队)

```typescript
interface IWaitlist {
  _id: ObjectId
  email: string
  
  // 申请信息
  application: {
    projectIdea: string
    role: 'founder' | 'pm' | 'developer' | 'student' | 'other'
    referralSource?: string
    socialLinks?: string[]
  }
  
  // 排队信息
  queue: {
    position: number
    appliedAt: Date
    score: number
    priority: 'high' | 'normal'
  }
  
  // 审核
  review: {
    status: 'pending' | 'approved' | 'rejected'
    reviewedAt?: Date
    reviewedBy?: string
  }
  
  // 邀请码
  invitationCode?: string
  invitationExpiresAt?: Date
  
  // 转化
  converted: boolean
  convertedUserId?: ObjectId
  
  createdAt: Date
}
```

### 7.2 InvitationCode (邀请码)

```typescript
interface IInvitationCode {
  _id: ObjectId
  code: string                  // 唯一
  
  type: 'waitlist' | 'user_invite' | 'special'
  tier: 'common' | 'rare' | 'legendary'
  
  createdBy: 'system' | ObjectId
  boundTo?: string              // email
  
  status: 'active' | 'used' | 'expired' | 'revoked'
  usedBy?: ObjectId
  usedAt?: Date
  
  expiresAt: Date
  
  benefits: {
    skipWaitlist: boolean
    trialDays?: number
  }
  
  createdAt: Date
}
```

---

## 8. 通知相关

### 8.1 Notification (通知)

```typescript
interface INotification {
  _id: ObjectId
  userId: ObjectId
  
  type: NotificationType
  title: string
  body: string
  
  relatedTo?: {
    type: 'project' | 'discussion' | 'decision' | 'deliverable'
    id: ObjectId
  }
  
  actions?: Array<{
    label: string
    url: string
    primary?: boolean
  }>
  
  channels: ('app' | 'email' | 'sms')[]
  
  read: boolean
  readAt?: Date
  
  priority: 'low' | 'normal' | 'high' | 'urgent'
  
  createdAt: Date
}

type NotificationType = 
  | 'decision_pending' | 'decision_executed'
  | 'discussion_concluded' | 'deliverable_ready'
  | 'phase_changed' | 'daily_summary'
  | 'invitation_received' | 'system_alert'
```

---

## 9. 索引建议

```javascript
// users
{ email: 1 }, { unique: true }

// user_executives
{ userId: 1, agentId: 1 }, { unique: true }

// projects
{ userId: 1, status: 1 }

// discussions
{ projectId: 1, status: 1 }
{ userId: 1, createdAt: -1 }

// decisions
{ projectId: 1, status: 1 }
{ userId: 1, status: 1, createdAt: -1 }
{ expiresAt: 1 }, { expireAfterSeconds: 0 }

// memories
{ userId: 1, agentId: 1, projectId: 1 }
{ vectorId: 1 }, { unique: true }

// waitlist
{ email: 1 }, { unique: true }
{ 'queue.position': 1 }

// invitation_codes
{ code: 1 }, { unique: true }

// notifications
{ userId: 1, read: 1, createdAt: -1 }
```

---

**相关文档**:
- [PRD](01-PRD.md)
- [技术架构](02-ARCHITECTURE.md)
