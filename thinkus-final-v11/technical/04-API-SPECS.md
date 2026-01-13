# Thinkus API规格文档

> **版本: v11.1 | 日期: 2026-01-15**
>
> **tRPC API接口规格**

---

## 1. API架构概览

### 1.1 技术栈

```yaml
协议: tRPC (类型安全的RPC)
认证: JWT + HttpOnly Cookie
验证: Zod Schema
实时: Socket.io (进度推送)
```

### 1.2 路由结构

```
trpc/
├── user/                    # 用户相关
│   ├── register            # 注册
│   ├── login               # 登录
│   ├── me                  # 当前用户信息
│   ├── update              # 更新用户信息
│   └── settings            # 用户设置
│
├── project/                 # 项目相关
│   ├── create              # 创建项目
│   ├── list                # 项目列表
│   ├── get                 # 获取项目详情
│   ├── update              # 更新项目
│   ├── delete              # 删除项目
│   └── downloadSource      # 下载源码
│
├── discussion/              # 讨论相关
│   ├── start               # 开始讨论
│   ├── sendMessage         # 发送消息
│   ├── getHistory          # 获取历史
│   └── conclude            # 结束讨论
│
├── ai/                      # AI相关
│   ├── analyzeRequirement  # 分析需求
│   ├── identifyFeatures    # 识别功能
│   ├── estimateComplexity  # 评估复杂度
│   └── expertDiscussion    # 专家讨论
│
├── payment/                 # 支付相关
│   ├── createCheckout      # 创建支付会话
│   ├── verify              # 验证支付
│   └── history             # 支付历史
│
├── operations/              # 运营相关
│   ├── enable              # 启用运营
│   ├── disable             # 停用运营
│   ├── getStatus           # 运营状态
│   ├── getCost             # 获取费用
│   └── getLogs             # 获取日志
│
└── billing/                 # 账单相关
    ├── summary             # 账单概览
    ├── invoices            # 发票列表
    └── download            # 下载发票
```

---

## 2. 用户模块 API

### 2.1 注册

```typescript
// user.register
input: z.object({
  email: z.string().email(),
  password: z.string().min(8),
  name: z.string().min(2),
})

output: z.object({
  success: z.boolean(),
  user: z.object({
    id: z.string(),
    email: z.string(),
    name: z.string(),
  }),
  token: z.string(),
})

// 示例
const result = await trpc.user.register.mutate({
  email: "user@example.com",
  password: "password123",
  name: "张三"
})
```

### 2.2 登录

```typescript
// user.login
input: z.object({
  email: z.string().email(),
  password: z.string(),
})

output: z.object({
  success: z.boolean(),
  user: UserSchema,
  token: z.string(),
})
```

### 2.3 OAuth登录

```typescript
// user.oauthLogin
input: z.object({
  provider: z.enum(['google', 'github']),
  code: z.string(),
})

output: z.object({
  success: z.boolean(),
  user: UserSchema,
  token: z.string(),
  isNewUser: z.boolean(),
})
```

### 2.4 获取当前用户

```typescript
// user.me (需要认证)
input: z.void()

output: UserSchema.nullable()
```

### 2.5 更新用户设置

```typescript
// user.updateSettings (需要认证)
input: z.object({
  language: z.enum(['zh', 'en']).optional(),
  theme: z.enum(['light', 'dark', 'system']).optional(),
  notifications: z.object({
    email: z.boolean(),
    push: z.boolean(),
  }).optional(),
})

output: z.object({
  success: z.boolean(),
  user: UserSchema,
})
```

---

## 3. 项目模块 API

### 3.1 创建项目

```typescript
// project.create (需要认证)
input: z.object({
  name: z.string(),
  description: z.string(),
  type: z.enum(['web', 'mobile', 'desktop', 'miniapp']),
  features: z.array(z.string()),
  complexity: z.enum(['L1', 'L2', 'L3', 'L4', 'L5']),
})

output: z.object({
  success: z.boolean(),
  project: ProjectSchema,
})
```

### 3.2 获取项目列表

```typescript
// project.list (需要认证)
input: z.object({
  status: z.enum(['all', 'developing', 'completed', 'operating']).optional(),
  page: z.number().default(1),
  limit: z.number().default(10),
})

output: z.object({
  projects: z.array(ProjectSchema),
  total: z.number(),
  page: z.number(),
  totalPages: z.number(),
})
```

### 3.3 获取项目详情

```typescript
// project.get (需要认证)
input: z.object({
  projectId: z.string(),
})

output: ProjectSchema.extend({
  features: z.array(FeatureSchema),
  discussions: z.array(DiscussionSummarySchema),
  progress: ProgressSchema,
})
```

### 3.4 获取项目进度

```typescript
// project.getProgress (需要认证)
input: z.object({
  projectId: z.string(),
})

output: z.object({
  overallProgress: z.number(), // 0-100
  currentPhase: z.string(),
  phases: z.array(z.object({
    name: z.string(),
    status: z.enum(['pending', 'in_progress', 'completed']),
    progress: z.number(),
  })),
  estimatedCompletion: z.string().datetime(),
  activeAgents: z.array(z.object({
    agentId: z.string(),
    name: z.string(),
    status: z.enum(['working', 'waiting', 'idle']),
    currentTask: z.string().optional(),
  })),
})
```

### 3.5 下载源码

```typescript
// project.downloadSource (需要认证)
input: z.object({
  projectId: z.string(),
})

output: z.object({
  downloadUrl: z.string(),
  expiresAt: z.string().datetime(),
})
```

---

## 4. AI模块 API

### 4.1 分析需求

```typescript
// ai.analyzeRequirement
input: z.object({
  description: z.string(),
  context: z.array(z.object({
    role: z.enum(['user', 'assistant']),
    content: z.string(),
  })).optional(),
})

output: z.object({
  understanding: z.string(),
  clarifyingQuestions: z.array(z.string()).optional(),
  identifiedFeatures: z.array(z.object({
    name: z.string(),
    description: z.string(),
    required: z.boolean(),
  })),
  suggestedType: z.enum(['web', 'mobile', 'desktop', 'miniapp']),
})
```

### 4.2 识别功能

```typescript
// ai.identifyFeatures
input: z.object({
  projectId: z.string().optional(),
  description: z.string(),
})

output: z.object({
  features: z.array(z.object({
    id: z.string(),
    name: z.string(),
    description: z.string(),
    category: z.string(),
    complexity: z.number(), // 1-5
    required: z.boolean(),
    price: z.number().optional(), // 可选功能的额外价格
  })),
})
```

### 4.3 评估复杂度

```typescript
// ai.estimateComplexity
input: z.object({
  features: z.array(z.string()),
  type: z.enum(['web', 'mobile', 'desktop', 'miniapp']),
})

output: z.object({
  complexity: z.enum(['L1', 'L2', 'L3', 'L4', 'L5']),
  reasoning: z.string(),
  basePrice: z.number(),
  estimatedTime: z.string(), // e.g., "2-3 days"
  breakdown: z.object({
    pages: z.number(),
    apis: z.number(),
    integrations: z.number(),
  }),
})
```

### 4.4 专家讨论 (流式)

```typescript
// ai.expertDiscussion (Server-Sent Events)
input: z.object({
  projectId: z.string(),
  topic: z.string(),
  mode: z.enum(['quick', 'standard', 'deep', 'expert']).default('standard'),
})

// 流式返回
stream: z.object({
  type: z.enum(['agent_start', 'agent_message', 'agent_end', 'discussion_end']),
  agentId: z.string().optional(),
  agentName: z.string().optional(),
  content: z.string().optional(),
  conclusion: z.string().optional(),
})
```

---

## 5. 支付模块 API

### 5.1 创建支付会话

```typescript
// payment.createCheckout (需要认证)
input: z.object({
  projectId: z.string(),
  items: z.array(z.object({
    type: z.enum(['base', 'addon', 'service']),
    name: z.string(),
    price: z.number(),
  })),
  successUrl: z.string(),
  cancelUrl: z.string(),
})

output: z.object({
  sessionId: z.string(),
  checkoutUrl: z.string(),
})
```

### 5.2 验证支付

```typescript
// payment.verify (需要认证)
input: z.object({
  sessionId: z.string(),
})

output: z.object({
  success: z.boolean(),
  projectId: z.string(),
  amount: z.number(),
  status: z.enum(['paid', 'pending', 'failed']),
})
```

### 5.3 获取支付历史

```typescript
// payment.history (需要认证)
input: z.object({
  page: z.number().default(1),
  limit: z.number().default(20),
})

output: z.object({
  payments: z.array(z.object({
    id: z.string(),
    projectId: z.string(),
    projectName: z.string(),
    amount: z.number(),
    status: z.string(),
    createdAt: z.string().datetime(),
  })),
  total: z.number(),
})
```

---

## 6. 运营模块 API

### 6.1 启用运营服务

```typescript
// operations.enable (需要认证)
input: z.object({
  projectId: z.string(),
  plan: z.enum(['basic', 'growth', 'advanced']),
})

output: z.object({
  success: z.boolean(),
  operationsId: z.string(),
  estimatedWeeklyCost: z.object({
    min: z.number(),
    max: z.number(),
  }),
  startDate: z.string().datetime(),
})
```

### 6.2 获取运营状态

```typescript
// operations.getStatus (需要认证)
input: z.object({
  projectId: z.string(),
})

output: z.object({
  enabled: z.boolean(),
  plan: z.string().optional(),
  currentWeekCost: z.number(),
  metrics: z.object({
    uptime: z.number(), // 百分比
    requests: z.number(),
    errors: z.number(),
    bugsFixes: z.number(),
  }),
  nextBillingDate: z.string().datetime().optional(),
})
```

### 6.3 获取运营费用明细

```typescript
// operations.getCost (需要认证)
input: z.object({
  projectId: z.string(),
  period: z.enum(['week', 'month']).default('week'),
})

output: z.object({
  totalCost: z.number(),
  breakdown: z.array(z.object({
    category: z.string(),
    description: z.string(),
    cost: z.number(),
  })),
  trend: z.enum(['up', 'down', 'stable']),
  changePercent: z.number(),
  forecast: z.object({
    nextWeek: z.number(),
    reason: z.string(),
  }),
})
```

### 6.4 获取运营日志

```typescript
// operations.getLogs (需要认证)
input: z.object({
  projectId: z.string(),
  level: z.enum(['all', 'error', 'warning', 'info']).default('all'),
  limit: z.number().default(100),
})

output: z.object({
  logs: z.array(z.object({
    id: z.string(),
    timestamp: z.string().datetime(),
    level: z.string(),
    message: z.string(),
    details: z.any().optional(),
    aiAnalysis: z.string().optional(),
    autoFixed: z.boolean(),
  })),
})
```

### 6.5 停用运营服务

```typescript
// operations.disable (需要认证)
input: z.object({
  projectId: z.string(),
  reason: z.string().optional(),
})

output: z.object({
  success: z.boolean(),
  finalBill: z.number(),
  sourceCodeUrl: z.string(), // 提供源码下载
})
```

---

## 7. 讨论模块 API

### 7.1 开始讨论

```typescript
// discussion.start (需要认证)
input: z.object({
  projectId: z.string(),
  topic: z.string(),
  participants: z.array(z.string()).optional(), // agentIds
})

output: z.object({
  discussionId: z.string(),
  participants: z.array(z.object({
    agentId: z.string(),
    name: z.string(),
    role: z.string(),
  })),
})
```

### 7.2 发送消息

```typescript
// discussion.sendMessage (需要认证)
input: z.object({
  discussionId: z.string(),
  content: z.string(),
})

output: z.object({
  messageId: z.string(),
  timestamp: z.string().datetime(),
})
```

### 7.3 获取讨论历史

```typescript
// discussion.getHistory (需要认证)
input: z.object({
  discussionId: z.string(),
})

output: z.object({
  discussion: z.object({
    id: z.string(),
    topic: z.string(),
    status: z.enum(['active', 'concluded']),
    createdAt: z.string().datetime(),
  }),
  messages: z.array(z.object({
    id: z.string(),
    role: z.enum(['user', 'agent', 'system']),
    agentId: z.string().optional(),
    agentName: z.string().optional(),
    content: z.string(),
    timestamp: z.string().datetime(),
  })),
  conclusion: z.string().optional(),
})
```

---

## 8. WebSocket 事件

### 8.1 进度更新

```typescript
// 服务端推送: project:progress
{
  event: 'project:progress',
  data: {
    projectId: string,
    overallProgress: number,
    currentPhase: string,
    phaseProgress: number,
    activeAgent: {
      agentId: string,
      name: string,
      task: string,
    },
    log: string,
  }
}
```

### 8.2 讨论消息

```typescript
// 服务端推送: discussion:message
{
  event: 'discussion:message',
  data: {
    discussionId: string,
    message: {
      id: string,
      role: 'agent',
      agentId: string,
      agentName: string,
      content: string,
      timestamp: string,
    }
  }
}
```

### 8.3 运营告警

```typescript
// 服务端推送: operations:alert
{
  event: 'operations:alert',
  data: {
    projectId: string,
    level: 'info' | 'warning' | 'error',
    title: string,
    message: string,
    autoFixed: boolean,
    action: string | null,
  }
}
```

---

## 9. 错误码

```typescript
const ERROR_CODES = {
  // 认证错误 1xxx
  UNAUTHORIZED: 1001,
  INVALID_TOKEN: 1002,
  TOKEN_EXPIRED: 1003,
  
  // 用户错误 2xxx
  USER_NOT_FOUND: 2001,
  EMAIL_EXISTS: 2002,
  INVALID_PASSWORD: 2003,
  
  // 项目错误 3xxx
  PROJECT_NOT_FOUND: 3001,
  PROJECT_ACCESS_DENIED: 3002,
  PROJECT_ALREADY_COMPLETED: 3003,
  
  // 支付错误 4xxx
  PAYMENT_FAILED: 4001,
  PAYMENT_CANCELLED: 4002,
  INSUFFICIENT_FUNDS: 4003,
  
  // AI错误 5xxx
  AI_SERVICE_ERROR: 5001,
  AI_TIMEOUT: 5002,
  AI_RATE_LIMITED: 5003,
  
  // 运营错误 6xxx
  OPERATIONS_NOT_ENABLED: 6001,
  OPERATIONS_ALREADY_ENABLED: 6002,
  
  // 系统错误 9xxx
  INTERNAL_ERROR: 9001,
  SERVICE_UNAVAILABLE: 9002,
}
```

---

## 10. Rate Limiting

```yaml
认证用户:
  通用API: 100次/分钟
  AI API: 20次/分钟
  支付API: 10次/分钟

未认证用户:
  通用API: 20次/分钟
  AI体验: 5次/分钟

响应头:
  X-RateLimit-Limit: 100
  X-RateLimit-Remaining: 95
  X-RateLimit-Reset: 1640000000
```

---

**相关文档**:
- [PRD](../core/01-PRD.md)
- [技术架构](../core/02-ARCHITECTURE.md)
- [数据模型](../core/03-DATA-MODELS.md)
