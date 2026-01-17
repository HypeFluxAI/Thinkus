# Thinkus v13 - 数据模型定义

> 完整的数据模型定义，MongoDB + Mongoose

---

## 基本信息

| 字段 | 值 |
|------|-----|
| 功能名称 | 数据模型 |
| 优先级 | P0 |
| 预估复杂度 | 中等 |
| 关联模块 | 数据库层 |

---

## 1. 用户相关

### 1.1 User (用户)

```typescript
interface IUser {
  _id: ObjectId;
  email: string;
  name: string;
  avatar?: string;

  // 认证
  password?: string;
  providers: Array<{
    provider: 'google' | 'github';
    providerId: string;
  }>;

  // 邀请相关
  invitedBy?: ObjectId;
  invitationCode?: string;

  // 设置
  settings: {
    language: 'zh' | 'en';
    theme: 'light' | 'dark' | 'system';
    notifications: {
      email: boolean;
      push: boolean;
      dailySummary: boolean;
    };
  };

  status: 'active' | 'suspended' | 'deleted';
  createdAt: Date;
  updatedAt: Date;
}

// Mongoose Schema
const UserSchema = new Schema<IUser>({
  email: { type: String, required: true, unique: true },
  name: { type: String, required: true },
  avatar: String,
  password: String,
  providers: [{
    provider: { type: String, enum: ['google', 'github'] },
    providerId: String,
  }],
  invitedBy: { type: Schema.Types.ObjectId, ref: 'User' },
  invitationCode: String,
  settings: {
    language: { type: String, enum: ['zh', 'en'], default: 'zh' },
    theme: { type: String, enum: ['light', 'dark', 'system'], default: 'system' },
    notifications: {
      email: { type: Boolean, default: true },
      push: { type: Boolean, default: true },
      dailySummary: { type: Boolean, default: false },
    },
  },
  status: { type: String, enum: ['active', 'suspended', 'deleted'], default: 'active' },
}, { timestamps: true });
```

### 1.2 UserExecutive (用户专属高管)

```typescript
interface IUserExecutive {
  _id: ObjectId;
  userId: ObjectId;
  agentId: AgentId;

  // 学习到的偏好
  learnedPreferences: {
    communicationStyle?: 'formal' | 'casual' | 'concise' | 'detailed';
    focusAreas?: string[];
    decisionStyle?: 'fast' | 'careful' | 'data-driven';
  };

  // 记忆统计
  memoryStats: {
    totalMemories: number;
    lastMemoryAt?: Date;
  };

  createdAt: Date;
  updatedAt: Date;
}

const UserExecutiveSchema = new Schema<IUserExecutive>({
  userId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
  agentId: { type: String, required: true },
  learnedPreferences: {
    communicationStyle: { type: String, enum: ['formal', 'casual', 'concise', 'detailed'] },
    focusAreas: [String],
    decisionStyle: { type: String, enum: ['fast', 'careful', 'data-driven'] },
  },
  memoryStats: {
    totalMemories: { type: Number, default: 0 },
    lastMemoryAt: Date,
  },
}, { timestamps: true });

// 索引: 确保每个用户每个高管只有一条记录
UserExecutiveSchema.index({ userId: 1, agentId: 1 }, { unique: true });
```

---

## 2. 项目相关

### 2.1 Project (项目)

```typescript
interface IProject {
  _id: ObjectId;
  userId: ObjectId;

  name: string;
  description: string;

  phase: ProjectPhase;
  status: 'active' | 'paused' | 'completed' | 'archived';

  config: {
    techStack?: string[];
    targetPlatforms?: string[];
    businessModel?: string;
  };

  progress: {
    completedMilestones: string[];
    currentTasks: string[];
    blockers: string[];
  };

  createdAt: Date;
  updatedAt: Date;
}

type ProjectPhase = 'ideation' | 'definition' | 'design' | 'development' | 'prelaunch' | 'growth';

const ProjectSchema = new Schema<IProject>({
  userId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
  name: { type: String, required: true },
  description: { type: String, required: true },
  phase: {
    type: String,
    enum: ['ideation', 'definition', 'design', 'development', 'prelaunch', 'growth'],
    default: 'ideation',
  },
  status: {
    type: String,
    enum: ['active', 'paused', 'completed', 'archived'],
    default: 'active',
  },
  config: {
    techStack: [String],
    targetPlatforms: [String],
    businessModel: String,
  },
  progress: {
    completedMilestones: [String],
    currentTasks: [String],
    blockers: [String],
  },
}, { timestamps: true });

ProjectSchema.index({ userId: 1, status: 1 });
```

### 2.2 Discussion (讨论)

```typescript
interface IDiscussion {
  _id: ObjectId;
  projectId: ObjectId;
  userId: ObjectId;

  topic: string;
  participants: AgentId[];

  messages: Array<{
    role: 'user' | 'agent';
    agentId?: AgentId;
    content: string;
    timestamp: Date;
  }>;

  conclusions?: Array<{
    type: 'decision' | 'action' | 'insight';
    content: string;
    agentId: AgentId;
  }>;

  status: 'active' | 'concluded';
  createdAt: Date;
}

const DiscussionSchema = new Schema<IDiscussion>({
  projectId: { type: Schema.Types.ObjectId, ref: 'Project', required: true },
  userId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
  topic: { type: String, required: true },
  participants: [String],
  messages: [{
    role: { type: String, enum: ['user', 'agent'], required: true },
    agentId: String,
    content: { type: String, required: true },
    timestamp: { type: Date, default: Date.now },
  }],
  conclusions: [{
    type: { type: String, enum: ['decision', 'action', 'insight'] },
    content: String,
    agentId: String,
  }],
  status: { type: String, enum: ['active', 'concluded'], default: 'active' },
}, { timestamps: true });

DiscussionSchema.index({ projectId: 1, status: 1 });
```

### 2.3 Decision (决策)

```typescript
interface IDecision {
  _id: ObjectId;
  projectId: ObjectId;
  userId: ObjectId;
  discussionId?: ObjectId;

  title: string;
  description: string;

  options: Array<{
    id: string;
    description: string;
    pros: string[];
    cons: string[];
    recommendedBy: AgentId[];
  }>;

  level: DecisionLevel;
  status: 'pending' | 'approved' | 'rejected' | 'auto_approved';

  decidedAt?: Date;
  decidedOption?: string;
  autoApproveAt?: Date;

  createdAt: Date;
}

type DecisionLevel = 'L0' | 'L1' | 'L2' | 'L3';

const DecisionSchema = new Schema<IDecision>({
  projectId: { type: Schema.Types.ObjectId, ref: 'Project', required: true },
  userId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
  discussionId: { type: Schema.Types.ObjectId, ref: 'Discussion' },
  title: { type: String, required: true },
  description: { type: String, required: true },
  options: [{
    id: String,
    description: String,
    pros: [String],
    cons: [String],
    recommendedBy: [String],
  }],
  level: { type: String, enum: ['L0', 'L1', 'L2', 'L3'], default: 'L1' },
  status: {
    type: String,
    enum: ['pending', 'approved', 'rejected', 'auto_approved'],
    default: 'pending',
  },
  decidedAt: Date,
  decidedOption: String,
  autoApproveAt: Date,
}, { timestamps: true });

DecisionSchema.index({ projectId: 1, status: 1 });
DecisionSchema.index({ userId: 1, status: 1 });
```

---

## 3. 记忆相关

### 3.1 Memory (记忆)

```typescript
interface IMemory {
  _id: ObjectId;
  userId: ObjectId;
  agentId: AgentId;
  projectId?: ObjectId;

  content: string;
  type: MemoryType;
  importance: number;  // 0-1

  embedding?: number[];  // 向量

  accessCount: number;
  lastAccessedAt: Date;

  status: 'active' | 'outdated' | 'merged';
  mergedFrom?: ObjectId[];

  createdAt: Date;
  updatedAt: Date;
}

type MemoryType =
  | 'user_preference'        // 用户偏好 (跨项目)
  | 'project_decision'       // 项目决策
  | 'discussion_conclusion'  // 讨论结论
  | 'technical_choice'       // 技术选型
  | 'feedback'               // 用户反馈
  | 'long_term'              // 长期记忆
  | 'short_term';            // 短期记忆

const MemorySchema = new Schema<IMemory>({
  userId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
  agentId: { type: String, required: true },
  projectId: { type: Schema.Types.ObjectId, ref: 'Project' },
  content: { type: String, required: true },
  type: {
    type: String,
    enum: ['user_preference', 'project_decision', 'discussion_conclusion',
           'technical_choice', 'feedback', 'long_term', 'short_term'],
    required: true,
  },
  importance: { type: Number, default: 0.5, min: 0, max: 1 },
  embedding: [Number],
  accessCount: { type: Number, default: 0 },
  lastAccessedAt: { type: Date, default: Date.now },
  status: { type: String, enum: ['active', 'outdated', 'merged'], default: 'active' },
  mergedFrom: [{ type: Schema.Types.ObjectId, ref: 'Memory' }],
}, { timestamps: true });

MemorySchema.index({ userId: 1, agentId: 1, projectId: 1 });
MemorySchema.index({ userId: 1, agentId: 1, type: 1 });
```

---

## 4. 邀请和订阅

### 4.1 Waitlist (排队)

```typescript
interface IWaitlist {
  _id: ObjectId;
  email: string;

  application: {
    projectIdea: string;
    role: string;
    referralSource?: string;
  };

  position: number;
  status: 'waiting' | 'approved' | 'rejected';
  reviewedAt?: Date;
  reviewNote?: string;

  createdAt: Date;
}

const WaitlistSchema = new Schema<IWaitlist>({
  email: { type: String, required: true, unique: true },
  application: {
    projectIdea: { type: String, required: true },
    role: { type: String, required: true },
    referralSource: String,
  },
  position: { type: Number, required: true },
  status: { type: String, enum: ['waiting', 'approved', 'rejected'], default: 'waiting' },
  reviewedAt: Date,
  reviewNote: String,
}, { timestamps: true });
```

### 4.2 InvitationCode (邀请码)

```typescript
interface IInvitationCode {
  _id: ObjectId;
  code: string;  // 8位唯一码

  creatorId: ObjectId;
  type: 'system' | 'user';

  maxUses: number;
  usedCount: number;
  usedBy: ObjectId[];

  expiresAt?: Date;
  status: 'active' | 'exhausted' | 'expired' | 'revoked';
  createdAt: Date;
}

const InvitationCodeSchema = new Schema<IInvitationCode>({
  code: { type: String, required: true, unique: true },
  creatorId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
  type: { type: String, enum: ['system', 'user'], required: true },
  maxUses: { type: Number, default: 1 },
  usedCount: { type: Number, default: 0 },
  usedBy: [{ type: Schema.Types.ObjectId, ref: 'User' }],
  expiresAt: Date,
  status: {
    type: String,
    enum: ['active', 'exhausted', 'expired', 'revoked'],
    default: 'active',
  },
}, { timestamps: true });
```

### 4.3 Subscription (订阅)

```typescript
interface ISubscription {
  _id: ObjectId;
  userId: ObjectId;

  plan: 'free' | 'seed' | 'growth' | 'scale' | 'enterprise';

  limits: {
    projects: number;
    aiRequestsPerDay: number;
    storageGB: number;
    teamMembers: number;
  };

  billing: {
    amount: number;
    currency: 'CNY' | 'USD';
    interval: 'monthly' | 'yearly';
    nextBillingAt?: Date;
  };

  status: 'active' | 'cancelled' | 'past_due';
  startedAt: Date;
  expiresAt?: Date;
}

const SubscriptionSchema = new Schema<ISubscription>({
  userId: { type: Schema.Types.ObjectId, ref: 'User', required: true, unique: true },
  plan: {
    type: String,
    enum: ['free', 'seed', 'growth', 'scale', 'enterprise'],
    default: 'free',
  },
  limits: {
    projects: { type: Number, default: 1 },
    aiRequestsPerDay: { type: Number, default: 100 },
    storageGB: { type: Number, default: 1 },
    teamMembers: { type: Number, default: 1 },
  },
  billing: {
    amount: { type: Number, default: 0 },
    currency: { type: String, enum: ['CNY', 'USD'], default: 'CNY' },
    interval: { type: String, enum: ['monthly', 'yearly'] },
    nextBillingAt: Date,
  },
  status: { type: String, enum: ['active', 'cancelled', 'past_due'], default: 'active' },
  startedAt: { type: Date, default: Date.now },
  expiresAt: Date,
});
```

---

## 5. 核心类型定义

### 5.1 AgentId (高管ID)

```typescript
type AgentId =
  // 核心高管
  | 'mike_pm'        // 产品经理
  | 'david_tech'     // 技术总监
  | 'elena_ux'       // UX设计师

  // 营销和财务
  | 'marcus_cmo'     // 营销总监
  | 'sarah_cfo'      // 财务总监
  | 'james_legal'    // 法务顾问

  // 技术专家
  | 'frank_devops'   // DevOps工程师
  | 'grace_security' // 安全专家
  | 'henry_mobile'   // 移动端专家
  | 'ivan_ai'        // AI/ML专家
  | 'jack_architect' // 架构师
  | 'kevin_qa'       // QA负责人
  | 'lisa_data'      // 数据分析师

  // 业务专家
  | 'nancy_sales'    // 销售专家
  | 'oscar_bd'       // 商务拓展
  | 'paul_pr'        // 公关专家
  | 'quinn_ops'      // 运营专家

  // 特殊角色
  | 'librarian';     // 知识管理员
```

### 5.2 其他核心类型

```typescript
// 项目阶段
type ProjectPhase = 'ideation' | 'definition' | 'design' | 'development' | 'prelaunch' | 'growth';

// 决策级别
type DecisionLevel = 'L0' | 'L1' | 'L2' | 'L3';

// 通知类型
type NotificationType =
  | 'decision_required'
  | 'task_completed'
  | 'task_blocked'
  | 'project_milestone'
  | 'budget_alert'
  | 'error_occurred'
  | 'feature_ready'
  | 'deployment_status';
```

---

## 6. 辅助模型

### 6.1 Notification (通知)

```typescript
interface INotification {
  _id: ObjectId;
  userId: ObjectId;

  type: NotificationType;
  title: string;
  message: string;

  projectId?: ObjectId;
  featureId?: string;
  decisionId?: ObjectId;

  priority: 'low' | 'normal' | 'high' | 'urgent';

  read: boolean;
  readAt?: Date;

  action?: {
    label: string;
    url: string;
  };

  createdAt: Date;
}
```

### 6.2 Feature (功能)

```typescript
interface IFeature {
  _id: ObjectId;
  projectId: ObjectId;

  name: string;
  description: string;
  priority: 'P0' | 'P1' | 'P2' | 'P3';

  status: 'pending' | 'in_progress' | 'completed' | 'blocked';

  // 契约
  contract?: {
    api: any;
    database: any;
    frontend: any;
    version: string;
  };

  // 进度
  progress: {
    design: number;      // 0-100
    backend: number;
    frontend: number;
    testing: number;
  };

  createdAt: Date;
  updatedAt: Date;
}
```

---

## 涉及文件

```yaml
新建:
  - thinkus-app/src/lib/db/models/user.ts
  - thinkus-app/src/lib/db/models/user-executive.ts
  - thinkus-app/src/lib/db/models/project.ts
  - thinkus-app/src/lib/db/models/discussion.ts
  - thinkus-app/src/lib/db/models/decision.ts
  - thinkus-app/src/lib/db/models/memory.ts
  - thinkus-app/src/lib/db/models/waitlist.ts
  - thinkus-app/src/lib/db/models/invitation-code.ts
  - thinkus-app/src/lib/db/models/subscription.ts
  - thinkus-app/src/lib/db/models/notification.ts
  - thinkus-app/src/lib/db/models/feature.ts
  - thinkus-app/src/types/agents.ts
  - thinkus-app/src/types/project.ts

修改:
  - thinkus-app/src/lib/db/index.ts (导出所有模型)
```

---

## 验收标准

- [ ] 所有模型Schema定义完整
- [ ] 索引设置正确
- [ ] 类型定义完整且一致
- [ ] 关联关系正确
- [ ] 默认值设置合理

---

## 变更记录

| 日期 | 版本 | 变更内容 | 作者 |
|------|------|----------|------|
| 2026-01-17 | v1.0 | 从完整规格文档拆分 | Claude Code |
