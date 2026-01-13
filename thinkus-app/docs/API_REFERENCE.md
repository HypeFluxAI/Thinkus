# Thinkus API 接口文档

> 完整的 API 接口参考

---

## 一、认证 API

### 1.1 NextAuth 端点

```
GET/POST /api/auth/[...nextauth]
```

NextAuth.js 自动处理的认证端点：
- `/api/auth/signin` - 登录页面
- `/api/auth/signout` - 登出
- `/api/auth/session` - 获取会话
- `/api/auth/csrf` - CSRF Token
- `/api/auth/providers` - 可用提供商
- `/api/auth/callback/[provider]` - OAuth 回调

### 1.2 忘记密码

```
POST /api/auth/forgot-password
```

**请求体:**
```json
{
  "email": "user@example.com"
}
```

**响应:**
```json
{
  "success": true,
  "message": "重置链接已发送到您的邮箱"
}
```

### 1.3 重置密码

```
POST /api/auth/reset-password
```

**请求体:**
```json
{
  "token": "reset-token",
  "password": "newPassword123"
}
```

**响应:**
```json
{
  "success": true,
  "message": "密码已重置"
}
```

### 1.4 发送手机验证码

```
POST /api/auth/phone/send-code
```

**请求体:**
```json
{
  "phone": "+8613800138000",
  "purpose": "login" | "register"
}
```

**响应:**
```json
{
  "success": true,
  "message": "验证码已发送"
}
```

### 1.5 验证手机验证码

```
POST /api/auth/phone/verify
```

**请求体:**
```json
{
  "phone": "+8613800138000",
  "code": "123456"
}
```

**响应:**
```json
{
  "success": true,
  "verified": true
}
```

---

## 二、AI 对话 API

### 2.1 发送消息 (流式)

```
POST /api/chat
```

**请求体:**
```json
{
  "message": "用户消息内容",
  "projectId": "project-id",
  "executiveId": "mike",
  "context": {
    "previousMessages": []
  }
}
```

**响应:** Server-Sent Events (SSE)
```
data: {"type": "chunk", "content": "AI响应"}
data: {"type": "chunk", "content": "内容片段"}
data: {"type": "done", "fullContent": "完整响应"}
```

### 2.2 多高管讨论

```
POST /api/discussion/multi-agent
```

**请求体:**
```json
{
  "topic": "讨论主题",
  "projectId": "project-id",
  "participants": ["mike", "elena", "david"],
  "context": {
    "projectPhase": "definition",
    "previousDiscussions": []
  }
}
```

**响应:** Server-Sent Events (SSE)
```
data: {"type": "participant", "executiveId": "mike", "name": "Mike Chen"}
data: {"type": "message", "executiveId": "mike", "content": "..."}
data: {"type": "message", "executiveId": "elena", "content": "..."}
data: {"type": "summary", "content": "讨论总结"}
data: {"type": "done", "outcomes": {...}}
```

### 2.3 开始讨论

```
POST /api/discussion/start
```

**请求体:**
```json
{
  "projectId": "project-id",
  "topic": "讨论主题",
  "type": "single" | "multi_agent"
}
```

**响应:**
```json
{
  "success": true,
  "discussion": {
    "id": "discussion-id",
    "topic": "讨论主题",
    "participants": ["mike"],
    "status": "active"
  }
}
```

### 2.4 结束讨论

```
POST /api/discussion/conclude
```

**请求体:**
```json
{
  "discussionId": "discussion-id"
}
```

**响应:**
```json
{
  "success": true,
  "summary": "讨论总结",
  "outcomes": {
    "decisions": [...],
    "actionItems": [...]
  }
}
```

---

## 三、决策 API

### 3.1 获取决策列表

```
GET /api/decisions?projectId=xxx&status=pending
```

**查询参数:**
- `projectId`: 项目ID (可选)
- `status`: pending | approved | rejected | executed (可选)
- `level`: L0 | L1 | L2 | L3 (可选)
- `page`: 页码 (默认 1)
- `limit`: 每页数量 (默认 20)

**响应:**
```json
{
  "success": true,
  "decisions": [
    {
      "id": "decision-id",
      "title": "决策标题",
      "description": "决策描述",
      "level": "L1",
      "status": "pending",
      "createdAt": "2026-01-13T00:00:00Z"
    }
  ],
  "pagination": {
    "page": 1,
    "limit": 20,
    "total": 100
  }
}
```

### 3.2 创建决策

```
POST /api/decisions
```

**请求体:**
```json
{
  "projectId": "project-id",
  "title": "决策标题",
  "description": "决策描述",
  "type": "technical",
  "level": "L1",
  "discussionId": "discussion-id"
}
```

**响应:**
```json
{
  "success": true,
  "decision": {
    "id": "decision-id",
    "title": "决策标题",
    "status": "pending"
  }
}
```

### 3.3 获取决策详情

```
GET /api/decisions/[id]
```

**响应:**
```json
{
  "success": true,
  "decision": {
    "id": "decision-id",
    "title": "决策标题",
    "description": "决策描述",
    "rationale": "决策理由",
    "type": "technical",
    "level": "L1",
    "status": "pending",
    "risk": {
      "score": 45,
      "factors": ["..."]
    },
    "createdAt": "2026-01-13T00:00:00Z"
  }
}
```

### 3.4 更新决策状态

```
PATCH /api/decisions/[id]
```

**请求体:**
```json
{
  "status": "approved",
  "notes": "批准备注"
}
```

**响应:**
```json
{
  "success": true,
  "decision": {
    "id": "decision-id",
    "status": "approved",
    "confirmedAt": "2026-01-13T00:00:00Z"
  }
}
```

---

## 四、行动项 API

### 4.1 获取行动项列表

```
GET /api/action-items?projectId=xxx&status=pending
```

**查询参数:**
- `projectId`: 项目ID (可选)
- `status`: pending | in_progress | completed | canceled (可选)
- `priority`: low | medium | high | urgent (可选)
- `page`: 页码
- `limit`: 每页数量

**响应:**
```json
{
  "success": true,
  "actionItems": [
    {
      "id": "action-id",
      "title": "行动项标题",
      "status": "pending",
      "priority": "high",
      "dueDate": "2026-01-20T00:00:00Z"
    }
  ]
}
```

### 4.2 更新行动项

```
PATCH /api/action-items/[id]
```

**请求体:**
```json
{
  "status": "completed"
}
```

**响应:**
```json
{
  "success": true,
  "actionItem": {
    "id": "action-id",
    "status": "completed",
    "completedAt": "2026-01-13T00:00:00Z"
  }
}
```

---

## 五、记忆 API

### 5.1 获取记忆列表

```
GET /api/memories?type=preference&layer=user
```

**查询参数:**
- `projectId`: 项目ID (可选)
- `type`: preference | fact | decision | experience (可选)
- `layer`: user | project (可选)
- `page`: 页码
- `limit`: 每页数量

**响应:**
```json
{
  "success": true,
  "memories": [
    {
      "id": "memory-id",
      "content": "记忆内容",
      "type": "preference",
      "layer": "user",
      "metadata": {
        "confidence": 0.85,
        "importance": 0.7
      }
    }
  ]
}
```

### 5.2 提取记忆

```
POST /api/memories/extract
```

**请求体:**
```json
{
  "discussionId": "discussion-id"
}
```

**响应:**
```json
{
  "success": true,
  "extracted": [
    {
      "content": "提取的记忆",
      "type": "fact",
      "confidence": 0.9
    }
  ]
}
```

### 5.3 获取记忆统计

```
GET /api/memories/stats
```

**响应:**
```json
{
  "success": true,
  "stats": {
    "totalMemories": 150,
    "byType": {
      "preference": 30,
      "fact": 80,
      "decision": 25,
      "experience": 15
    },
    "byLayer": {
      "user": 50,
      "project": 100
    }
  }
}
```

---

## 六、例会 API

### 6.1 获取例会列表

```
GET /api/standups?projectId=xxx
```

**响应:**
```json
{
  "success": true,
  "standups": [
    {
      "id": "standup-id",
      "type": "daily",
      "date": "2026-01-13",
      "summary": "例会摘要",
      "highlights": ["..."],
      "blockers": ["..."]
    }
  ]
}
```

### 6.2 创建例会

```
POST /api/standups
```

**请求体:**
```json
{
  "projectId": "project-id",
  "type": "daily",
  "participants": ["mike", "david"]
}
```

**响应:**
```json
{
  "success": true,
  "standup": {
    "id": "standup-id",
    "summary": "AI生成的例会摘要",
    "highlights": ["..."],
    "nextSteps": ["..."]
  }
}
```

---

## 七、支付 API

### 7.1 创建结账会话

```
POST /api/stripe/checkout
```

**请求体:**
```json
{
  "plan": "professional",
  "billingCycle": "monthly" | "yearly"
}
```

**响应:**
```json
{
  "success": true,
  "checkoutUrl": "https://checkout.stripe.com/..."
}
```

### 7.2 客户门户

```
POST /api/stripe/portal
```

**响应:**
```json
{
  "success": true,
  "portalUrl": "https://billing.stripe.com/..."
}
```

### 7.3 Webhook 处理

```
POST /api/stripe/webhook
```

Stripe 自动调用，处理以下事件：
- `checkout.session.completed`
- `customer.subscription.created`
- `customer.subscription.updated`
- `customer.subscription.deleted`
- `invoice.paid`
- `invoice.payment_failed`

---

## 八、订阅 API

### 8.1 获取当前订阅

```
GET /api/subscriptions
```

**响应:**
```json
{
  "success": true,
  "subscription": {
    "plan": "professional",
    "status": "active",
    "currentPeriodEnd": "2026-02-13T00:00:00Z",
    "features": {
      "maxProjects": 20,
      "maxDiscussionsPerMonth": 200
    },
    "usage": {
      "projectsUsed": 5,
      "discussionsUsedThisMonth": 45
    }
  }
}
```

### 8.2 变更计划

```
POST /api/subscription/change-plan
```

**请求体:**
```json
{
  "newPlan": "enterprise"
}
```

**响应:**
```json
{
  "success": true,
  "message": "计划变更将在下个账单周期生效"
}
```

### 8.3 取消订阅

```
POST /api/subscription/cancel
```

**响应:**
```json
{
  "success": true,
  "message": "订阅将在当前周期结束时取消"
}
```

### 8.4 获取支付历史

```
GET /api/subscription/payments
```

**响应:**
```json
{
  "success": true,
  "payments": [
    {
      "id": "payment-id",
      "amount": 9900,
      "currency": "usd",
      "status": "succeeded",
      "paidAt": "2026-01-01T00:00:00Z"
    }
  ]
}
```

### 8.5 获取发票列表

```
GET /api/subscription/invoices
```

**响应:**
```json
{
  "success": true,
  "invoices": [
    {
      "id": "invoice-id",
      "number": "INV-001",
      "amount": 9900,
      "status": "paid",
      "pdfUrl": "https://...",
      "createdAt": "2026-01-01T00:00:00Z"
    }
  ]
}
```

---

## 九、邀请码 API

### 9.1 获取邀请码列表

```
GET /api/invitation-codes
```

**响应:**
```json
{
  "success": true,
  "codes": [
    {
      "code": "THINKUS-ABC123",
      "status": "active",
      "usedCount": 0,
      "maxUses": 1,
      "expiresAt": "2026-02-13T00:00:00Z"
    }
  ]
}
```

### 9.2 验证邀请码

```
POST /api/invitation/validate
```

**请求体:**
```json
{
  "code": "THINKUS-ABC123"
}
```

**响应:**
```json
{
  "success": true,
  "valid": true,
  "message": "邀请码有效"
}
```

---

## 十、通知 API

### 10.1 获取通知列表

```
GET /api/notifications?status=unread
```

**响应:**
```json
{
  "success": true,
  "notifications": [
    {
      "id": "notification-id",
      "type": "decision_pending",
      "title": "新决策待确认",
      "message": "...",
      "status": "unread",
      "createdAt": "2026-01-13T00:00:00Z"
    }
  ]
}
```

### 10.2 标记已读

```
PATCH /api/notifications/[id]
```

**请求体:**
```json
{
  "status": "read"
}
```

---

## 十一、项目分享 API

### 11.1 创建分享链接

```
POST /api/projects/[id]/share
```

**请求体:**
```json
{
  "expiresIn": "7d",
  "permissions": ["view"]
}
```

**响应:**
```json
{
  "success": true,
  "shareUrl": "https://thinkus.ai/share/abc123",
  "expiresAt": "2026-01-20T00:00:00Z"
}
```

---

## 十二、搜索 API

### 12.1 全局搜索

```
GET /api/search?q=关键词
```

**查询参数:**
- `q`: 搜索关键词
- `type`: project | discussion | decision | all (可选)
- `limit`: 结果数量 (默认 10)

**响应:**
```json
{
  "success": true,
  "results": {
    "projects": [...],
    "discussions": [...],
    "decisions": [...]
  }
}
```

---

## 十三、健康检查 API

### 13.1 健康状态

```
GET /api/health
```

**响应:**
```json
{
  "status": "healthy",
  "timestamp": "2026-01-13T00:00:00Z",
  "services": {
    "database": "connected",
    "vector": "connected",
    "ai": "available"
  }
}
```

---

## 十四、错误响应格式

所有 API 错误返回统一格式：

```json
{
  "success": false,
  "error": {
    "code": "ERROR_CODE",
    "message": "错误描述",
    "details": {}
  }
}
```

**常见错误码:**
- `UNAUTHORIZED` - 未认证
- `FORBIDDEN` - 无权限
- `NOT_FOUND` - 资源不存在
- `VALIDATION_ERROR` - 验证失败
- `RATE_LIMITED` - 请求过于频繁
- `QUOTA_EXCEEDED` - 配额超限
- `INTERNAL_ERROR` - 内部错误

---

**最后更新**: 2026-01-13
