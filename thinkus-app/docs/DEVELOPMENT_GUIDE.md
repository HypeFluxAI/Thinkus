# Thinkus 开发指南

> 开发规范、最佳实践和常见任务指南

---

## 一、环境搭建

### 1.1 前置要求

```yaml
必需:
  - Node.js >= 20.x
  - pnpm >= 8.x
  - Git

推荐:
  - VS Code + 推荐扩展
  - Docker Desktop (本地数据库)
```

### 1.2 克隆和安装

```bash
# 克隆仓库
git clone https://github.com/your-org/thinkus.git
cd thinkus/thinkus-app

# 安装依赖
pnpm install

# 复制环境变量
cp .env.example .env.local

# 编辑环境变量
code .env.local
```

### 1.3 环境变量配置

```bash
# .env.local

# 数据库
MONGODB_URI=mongodb://localhost:27017/thinkus

# 认证
NEXTAUTH_URL=http://localhost:3000
NEXTAUTH_SECRET=your-random-secret-key-here

# Claude API
ANTHROPIC_API_KEY=sk-ant-xxx

# OpenAI (用于 Embeddings)
OPENAI_API_KEY=sk-xxx

# Pinecone
PINECONE_API_KEY=xxx
PINECONE_INDEX_NAME=thinkus

# Stripe (开发环境使用测试密钥)
STRIPE_SECRET_KEY=sk_test_xxx
STRIPE_WEBHOOK_SECRET=whsec_xxx
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_test_xxx
```

### 1.4 本地开发

```bash
# 启动开发服务器
pnpm dev

# 或使用 Docker
docker-compose up -d
pnpm dev
```

---

## 二、代码规范

### 2.1 命名规范

```typescript
// 文件命名 - kebab-case
user-profile.tsx
subscription-plans.ts
use-autonomous-discussion.ts

// 组件命名 - PascalCase
export function UserProfile() { }
export function SubscriptionCard() { }

// 函数命名 - camelCase
function getUserById(id: string) { }
async function fetchSubscription() { }

// 常量命名 - UPPER_SNAKE_CASE
const API_BASE_URL = '/api'
const MAX_RETRIES = 3

// 类型/接口命名 - PascalCase
interface UserProfile { }
type SubscriptionPlan = 'free' | 'starter' | 'professional' | 'enterprise'
```

### 2.2 文件组织

```
src/components/
├── ui/                      # 基础 UI 组件
│   ├── button.tsx
│   ├── card.tsx
│   └── index.ts             # 统一导出
├── executive/               # 高管相关组件
│   ├── executive-card.tsx
│   ├── executive-chat.tsx
│   └── index.ts
└── project/                 # 项目相关组件
    ├── phase-timeline.tsx
    └── index.ts
```

### 2.3 组件规范

```typescript
// 好的组件示例
'use client'

import * as React from 'react'
import { cn } from '@/lib/utils'

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'default' | 'outline' | 'ghost'
  size?: 'sm' | 'md' | 'lg'
}

export function Button({
  className,
  variant = 'default',
  size = 'md',
  children,
  ...props
}: ButtonProps) {
  return (
    <button
      className={cn(
        'rounded-md font-medium transition-colors',
        // variant styles
        variant === 'default' && 'bg-primary text-primary-foreground',
        variant === 'outline' && 'border border-input',
        variant === 'ghost' && 'hover:bg-accent',
        // size styles
        size === 'sm' && 'h-8 px-3 text-sm',
        size === 'md' && 'h-10 px-4',
        size === 'lg' && 'h-12 px-6 text-lg',
        className
      )}
      {...props}
    >
      {children}
    </button>
  )
}
```

### 2.4 TypeScript 规范

```typescript
// 使用 interface 而非 type (除非需要联合类型)
interface User {
  id: string
  name: string
  email: string
}

// 使用 type 用于联合类型
type Status = 'pending' | 'active' | 'completed'

// 避免 any，使用 unknown
function processData(data: unknown) {
  if (typeof data === 'string') {
    // 类型收窄后安全使用
  }
}

// 使用泛型提高复用性
function createResource<T>(data: T): Resource<T> {
  return { data, createdAt: new Date() }
}
```

---

## 三、Git 工作流

### 3.1 分支策略

```
main          # 生产分支
├── develop   # 开发分支
├── feature/* # 功能分支
├── fix/*     # 修复分支
└── release/* # 发布分支
```

### 3.2 提交规范

```bash
# 格式
type(scope): message

# 类型
feat     # 新功能
fix      # 修复
docs     # 文档
style    # 代码格式 (不影响功能)
refactor # 重构
test     # 测试
chore    # 构建/工具

# 示例
feat(auth): add phone verification login
fix(chat): resolve message ordering issue
docs(api): update API documentation
refactor(services): extract decision service
```

### 3.3 常用 Git 命令

```bash
# 创建功能分支
git checkout -b feature/memory-system

# 提交更改
git add .
git commit -m "feat(memory): implement vector memory service"

# 推送到远程
git push -u origin feature/memory-system

# 合并到开发分支
git checkout develop
git merge feature/memory-system

# 推送开发分支
git push origin develop
```

---

## 四、常见开发任务

### 4.1 添加新页面

```typescript
// 1. 创建页面目录
// src/app/(main)/new-feature/page.tsx

import { Metadata } from 'next'

export const metadata: Metadata = {
  title: '新功能 | Thinkus',
  description: '新功能描述',
}

export default function NewFeaturePage() {
  return (
    <div className="container py-6">
      <h1 className="text-2xl font-bold">新功能</h1>
      {/* 页面内容 */}
    </div>
  )
}

// 2. 如果需要布局，创建 layout.tsx
// src/app/(main)/new-feature/layout.tsx

export default function NewFeatureLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <div className="flex">
      <aside>{/* 侧边栏 */}</aside>
      <main className="flex-1">{children}</main>
    </div>
  )
}
```

### 4.2 添加新 API 路由

```typescript
// src/app/api/new-endpoint/route.ts

import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth/options'
import { connectDB } from '@/lib/db/connect'

export async function GET(request: NextRequest) {
  try {
    // 验证认证
    const session = await getServerSession(authOptions)
    if (!session?.user) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 401 }
      )
    }

    // 连接数据库
    await connectDB()

    // 业务逻辑
    const data = await fetchData(session.user.id)

    return NextResponse.json({ success: true, data })
  } catch (error) {
    console.error('API Error:', error)
    return NextResponse.json(
      { success: false, error: 'Internal error' },
      { status: 500 }
    )
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 401 }
      )
    }

    const body = await request.json()

    // 验证输入
    if (!body.requiredField) {
      return NextResponse.json(
        { success: false, error: 'Missing required field' },
        { status: 400 }
      )
    }

    await connectDB()

    // 创建资源
    const result = await createResource(body)

    return NextResponse.json({ success: true, data: result })
  } catch (error) {
    console.error('API Error:', error)
    return NextResponse.json(
      { success: false, error: 'Internal error' },
      { status: 500 }
    )
  }
}
```

### 4.3 添加 tRPC 路由

```typescript
// src/lib/trpc/routers/new-router.ts

import { z } from 'zod'
import { router, protectedProcedure } from '../trpc'
import { TRPCError } from '@trpc/server'

export const newRouter = router({
  // 查询
  getAll: protectedProcedure
    .input(z.object({
      page: z.number().default(1),
      limit: z.number().default(20),
    }))
    .query(async ({ ctx, input }) => {
      const { userId } = ctx.session.user
      // 查询逻辑
      return { items: [], total: 0 }
    }),

  // 创建
  create: protectedProcedure
    .input(z.object({
      name: z.string().min(1),
      description: z.string().optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      const { userId } = ctx.session.user
      // 创建逻辑
      return { id: 'new-id', ...input }
    }),

  // 更新
  update: protectedProcedure
    .input(z.object({
      id: z.string(),
      name: z.string().optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      // 更新逻辑
      return { success: true }
    }),
})

// 在 src/lib/trpc/routers/index.ts 中注册
import { newRouter } from './new-router'

export const appRouter = router({
  // ... 其他路由
  new: newRouter,
})
```

### 4.4 添加数据库模型

```typescript
// src/lib/db/models/new-model.ts

import mongoose, { Schema, Document } from 'mongoose'

export interface INewModel extends Document {
  userId: mongoose.Types.ObjectId
  name: string
  description?: string
  status: 'active' | 'inactive'
  createdAt: Date
  updatedAt: Date
}

const newModelSchema = new Schema<INewModel>(
  {
    userId: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    name: {
      type: String,
      required: true,
    },
    description: String,
    status: {
      type: String,
      enum: ['active', 'inactive'],
      default: 'active',
    },
  },
  {
    timestamps: true,
  }
)

// 复合索引
newModelSchema.index({ userId: 1, status: 1 })

export const NewModel =
  mongoose.models.NewModel || mongoose.model<INewModel>('NewModel', newModelSchema)

// 在 src/lib/db/models/index.ts 中导出
export * from './new-model'
```

### 4.5 添加新高管

```typescript
// 编辑 src/lib/config/executives.ts

export const EXECUTIVES = {
  // ... 现有高管

  // 添加新高管
  newexecutive: {
    id: 'newexecutive',
    name: 'New Executive',
    nameCn: '新高管',
    role: 'New Role',
    roleCn: '新角色',
    avatar: '/avatars/newexecutive.png',
    expertise: ['领域1', '领域2'],
    personality: '性格描述',
    systemPrompt: `你是 New Executive，...`,
  },
}

// 更新 src/lib/config/ai-executives.ts 分组
export const EXECUTIVE_GROUPS = {
  // ... 更新相关分组
}
```

---

## 五、测试指南

### 5.1 运行测试

```bash
# 单元测试
pnpm test

# 运行特定测试
pnpm test user.test.ts

# 监视模式
pnpm test:watch

# 覆盖率报告
pnpm test:coverage

# E2E 测试
pnpm test:e2e

# Lighthouse 性能测试
pnpm test:lighthouse
```

### 5.2 编写单元测试

```typescript
// tests/unit/services/decision-service.test.ts

import { describe, it, expect, vi, beforeEach } from 'vitest'
import { DecisionService } from '@/lib/services/decision-service'

describe('DecisionService', () => {
  let service: DecisionService

  beforeEach(() => {
    service = new DecisionService()
  })

  describe('evaluateLevel', () => {
    it('should return L0 for low risk decisions', async () => {
      const decision = {
        type: 'technical',
        risk: { score: 20 },
      }

      const level = await service.evaluateLevel(decision)

      expect(level).toBe('L0')
    })

    it('should return L3 for high risk decisions', async () => {
      const decision = {
        type: 'business',
        risk: { score: 85 },
      }

      const level = await service.evaluateLevel(decision)

      expect(level).toBe('L3')
    })
  })
})
```

### 5.3 编写 E2E 测试

```typescript
// tests/e2e/login.spec.ts

import { test, expect } from '@playwright/test'

test.describe('Login Page', () => {
  test('should login successfully with valid credentials', async ({ page }) => {
    await page.goto('/login')

    await page.fill('input[name="email"]', 'test@example.com')
    await page.fill('input[name="password"]', 'password123')
    await page.click('button[type="submit"]')

    await expect(page).toHaveURL('/dashboard')
    await expect(page.locator('h1')).toContainText('仪表盘')
  })

  test('should show error with invalid credentials', async ({ page }) => {
    await page.goto('/login')

    await page.fill('input[name="email"]', 'wrong@example.com')
    await page.fill('input[name="password"]', 'wrongpassword')
    await page.click('button[type="submit"]')

    await expect(page.locator('.error-message')).toBeVisible()
  })
})
```

---

## 六、调试技巧

### 6.1 服务端调试

```typescript
// 使用 console.log
console.log('Debug:', { variable })

// 使用 debugger (需配置 VS Code)
debugger

// 使用环境变量控制日志
if (process.env.DEBUG === 'true') {
  console.log('Debug info:', data)
}
```

### 6.2 客户端调试

```typescript
// React DevTools
// 安装 Chrome 扩展: React Developer Tools

// 使用 useEffect 调试
useEffect(() => {
  console.log('State changed:', state)
}, [state])

// 使用 React Query DevTools
import { ReactQueryDevtools } from '@tanstack/react-query-devtools'
```

### 6.3 网络请求调试

```typescript
// API 请求日志
export async function fetchWithLogging(url: string, options?: RequestInit) {
  console.log('Request:', { url, options })

  const response = await fetch(url, options)
  const data = await response.json()

  console.log('Response:', { status: response.status, data })

  return data
}
```

---

## 七、部署流程

### 7.1 本地构建测试

```bash
# 构建生产版本
pnpm build

# 启动生产服务器
pnpm start

# 检查构建输出
ls -la .next/
```

### 7.2 部署到 Vercel

```bash
# 安装 Vercel CLI
npm i -g vercel

# 登录
vercel login

# 部署预览
vercel

# 部署生产
vercel --prod
```

### 7.3 环境变量配置

在 Vercel Dashboard 设置:
1. 进入项目设置
2. 选择 Environment Variables
3. 添加所有必需的环境变量
4. 设置 Production/Preview/Development 环境

---

## 八、性能优化检查清单

### 8.1 前端优化

- [ ] 使用 `next/image` 优化图片
- [ ] 使用 `next/font` 优化字体
- [ ] 动态导入大型组件 `dynamic()`
- [ ] 避免不必要的重渲染
- [ ] 使用 React.memo() 缓存组件
- [ ] 使用 useMemo/useCallback 缓存计算

### 8.2 后端优化

- [ ] 数据库添加适当索引
- [ ] 使用分页查询大数据集
- [ ] 缓存频繁访问的数据
- [ ] 优化 AI API 调用

### 8.3 构建优化

- [ ] 分析包大小 `pnpm analyze`
- [ ] 移除未使用的依赖
- [ ] 使用 tree-shaking

---

**最后更新**: 2026-01-13
