# Thinkus 开发启动指南

> 给 Claude Code 的开发指引文档

---

## 1. 项目初始化

### 1.1 创建项目

```bash
# 使用 create-next-app
npx create-next-app@latest thinkus --typescript --tailwind --eslint --app --src-dir --import-alias "@/*"

cd thinkus

# 安装核心依赖
npm install @trpc/server @trpc/client @trpc/react-query @trpc/next @tanstack/react-query
npm install mongoose zod
npm install next-auth @auth/mongodb-adapter
npm install stripe @stripe/stripe-js
npm install lucide-react class-variance-authority clsx tailwind-merge

# 安装 shadcn/ui
npx shadcn@latest init
npx shadcn@latest add button card input label textarea select dialog sheet toast avatar badge tabs

# 开发依赖
npm install -D @types/node prisma
```

### 1.2 项目结构

```
thinkus/
├── src/
│   ├── app/                    # Next.js App Router
│   │   ├── (auth)/             # 认证相关页面
│   │   │   ├── login/
│   │   │   └── register/
│   │   ├── (main)/             # 主要页面
│   │   │   ├── create/         # 创建项目
│   │   │   ├── projects/       # 项目列表
│   │   │   └── dashboard/      # 仪表盘
│   │   ├── api/
│   │   │   ├── trpc/[trpc]/    # tRPC API
│   │   │   ├── auth/[...nextauth]/ # NextAuth
│   │   │   └── webhooks/       # Stripe webhooks
│   │   ├── layout.tsx
│   │   └── page.tsx
│   │
│   ├── components/
│   │   ├── ui/                 # shadcn/ui组件
│   │   ├── chat/               # 对话相关
│   │   ├── expert/             # 专家头像、消息
│   │   └── project/            # 项目相关
│   │
│   ├── lib/
│   │   ├── trpc/               # tRPC配置
│   │   │   ├── client.ts
│   │   │   ├── server.ts
│   │   │   └── routers/
│   │   ├── db/                 # 数据库
│   │   │   ├── connect.ts
│   │   │   └── models/
│   │   ├── auth/               # 认证
│   │   ├── ai/                 # AI相关
│   │   │   ├── claude.ts       # Claude API封装
│   │   │   ├── prompts/        # 提示词
│   │   │   └── agents/         # Agent实现
│   │   └── utils/
│   │
│   ├── hooks/                  # React hooks
│   └── types/                  # 类型定义
│
├── prompts/                    # 提示词文件（从docs复制）
├── public/
├── .env.local                  # 环境变量
└── package.json
```

---

## 2. 环境变量

```bash
# .env.local

# 数据库
MONGODB_URI=mongodb+srv://...

# 认证
NEXTAUTH_URL=http://localhost:3000
NEXTAUTH_SECRET=your-secret-key

# Claude API
ANTHROPIC_API_KEY=sk-ant-...

# Stripe
STRIPE_SECRET_KEY=sk_test_...
STRIPE_WEBHOOK_SECRET=whsec_...
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_test_...

# 存储 (Cloudflare R2)
R2_ACCOUNT_ID=...
R2_ACCESS_KEY_ID=...
R2_SECRET_ACCESS_KEY=...
R2_BUCKET=thinkus
CDN_URL=https://cdn.thinkus.com
```

---

## 3. 开发顺序建议

### Phase 1: 基础设施 (Day 1)

```yaml
1. 项目初始化:
   - 创建Next.js项目
   - 配置Tailwind和shadcn/ui
   - 设置TypeScript

2. 数据库连接:
   - MongoDB连接
   - 基础模型 (User, Project)

3. 认证系统:
   - NextAuth配置
   - 登录/注册页面
```

### Phase 2: 核心对话 (Day 2-3)

```yaml
4. 对话系统:
   - 创建项目页面
   - 小T对话组件
   - Claude API集成

5. 提示词集成:
   - 加载器实现
   - 需求理解提示词
```

### Phase 3: 专家讨论 (Day 3-4)

```yaml
6. 专家系统:
   - 专家头像和消息组件
   - 讨论编排器
   - 多轮讨论流程

7. 方案生成:
   - 结构化规格生成
   - 方案确认页面
```

### Phase 4: 支付和开发 (Day 5)

```yaml
8. 支付集成:
   - Stripe Checkout
   - Webhook处理

9. 开发进度:
   - 进度页面
   - 模拟开发流程
```

---

## 4. 关键代码示例

### 4.1 Claude API 封装

```typescript
// lib/ai/claude.ts

import Anthropic from '@anthropic-ai/sdk'

const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
})

export async function chat(options: {
  model?: string
  system: string
  messages: { role: 'user' | 'assistant'; content: string }[]
  maxTokens?: number
  temperature?: number
}) {
  const response = await anthropic.messages.create({
    model: options.model || 'claude-sonnet-4-20250514',
    max_tokens: options.maxTokens || 2000,
    temperature: options.temperature || 0.7,
    system: options.system,
    messages: options.messages,
  })

  return {
    content: response.content[0].type === 'text' 
      ? response.content[0].text 
      : '',
    usage: response.usage,
  }
}

export async function streamChat(options: {
  system: string
  messages: { role: 'user' | 'assistant'; content: string }[]
  onChunk: (chunk: string) => void
}) {
  const stream = await anthropic.messages.stream({
    model: 'claude-sonnet-4-20250514',
    max_tokens: 2000,
    system: options.system,
    messages: options.messages,
  })

  for await (const event of stream) {
    if (event.type === 'content_block_delta' && 
        event.delta.type === 'text_delta') {
      options.onChunk(event.delta.text)
    }
  }
}
```

### 4.2 提示词加载器（简化版）

```typescript
// lib/ai/prompts/loader.ts

import fs from 'fs'
import path from 'path'
import matter from 'gray-matter'

const PROMPTS_DIR = path.join(process.cwd(), 'prompts/agents')

export function loadPrompt(promptPath: string) {
  const fullPath = path.join(PROMPTS_DIR, promptPath)
  const content = fs.readFileSync(fullPath, 'utf-8')
  const { data, content: body } = matter(content)
  
  return {
    config: {
      model: data.model || 'claude-sonnet',
      temperature: data.temperature || 0.7,
      maxTokens: data.max_tokens || 2000,
    },
    template: body,
  }
}

export function renderPrompt(
  template: string, 
  variables: Record<string, any>
): string {
  return template.replace(/\{(\w+)\}/g, (_, key) => {
    if (key in variables) {
      const value = variables[key]
      return typeof value === 'object' 
        ? JSON.stringify(value, null, 2) 
        : String(value)
    }
    return `{${key}}`
  })
}
```

### 4.3 tRPC 路由示例

```typescript
// lib/trpc/routers/project.ts

import { z } from 'zod'
import { router, protectedProcedure } from '../trpc'
import { Project } from '@/lib/db/models/project'

export const projectRouter = router({
  list: protectedProcedure
    .query(async ({ ctx }) => {
      const projects = await Project.find({ userId: ctx.user.id })
        .sort({ createdAt: -1 })
        .lean()
      return { projects }
    }),

  create: protectedProcedure
    .input(z.object({
      name: z.string().optional(),
    }))
    .mutation(async ({ input, ctx }) => {
      const project = await Project.create({
        userId: ctx.user.id,
        name: input.name || '新项目',
        status: 'draft',
      })
      return { project }
    }),

  getById: protectedProcedure
    .input(z.object({ id: z.string() }))
    .query(async ({ input, ctx }) => {
      const project = await Project.findOne({
        _id: input.id,
        userId: ctx.user.id,
      }).lean()
      
      if (!project) {
        throw new TRPCError({ code: 'NOT_FOUND' })
      }
      
      return { project }
    }),
})
```

### 4.4 对话组件示例

```tsx
// components/chat/ChatInterface.tsx

'use client'

import { useState, useRef, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { Avatar } from '@/components/ui/avatar'
import { Send } from 'lucide-react'

interface Message {
  id: string
  role: 'user' | 'assistant'
  content: string
  speaker?: string
}

export function ChatInterface({ projectId }: { projectId: string }) {
  const [messages, setMessages] = useState<Message[]>([])
  const [input, setInput] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const messagesEndRef = useRef<HTMLDivElement>(null)

  const sendMessage = async () => {
    if (!input.trim() || isLoading) return

    const userMessage: Message = {
      id: Date.now().toString(),
      role: 'user',
      content: input,
    }

    setMessages(prev => [...prev, userMessage])
    setInput('')
    setIsLoading(true)

    try {
      const response = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          projectId,
          message: input,
          history: messages,
        }),
      })

      const data = await response.json()
      
      setMessages(prev => [...prev, {
        id: Date.now().toString(),
        role: 'assistant',
        content: data.content,
        speaker: data.speaker,
      }])
    } catch (error) {
      console.error('Chat error:', error)
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="flex flex-col h-full">
      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {messages.map(message => (
          <div
            key={message.id}
            className={`flex ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}
          >
            <div className={`max-w-[80%] rounded-lg p-3 ${
              message.role === 'user' 
                ? 'bg-primary text-primary-foreground' 
                : 'bg-muted'
            }`}>
              {message.speaker && (
                <div className="text-sm font-medium mb-1">
                  {message.speaker}
                </div>
              )}
              <p className="whitespace-pre-wrap">{message.content}</p>
            </div>
          </div>
        ))}
        <div ref={messagesEndRef} />
      </div>

      {/* Input */}
      <div className="border-t p-4">
        <div className="flex gap-2">
          <Textarea
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="描述你想做的产品..."
            className="min-h-[60px]"
            onKeyDown={(e) => {
              if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault()
                sendMessage()
              }
            }}
          />
          <Button 
            onClick={sendMessage} 
            disabled={isLoading}
            size="icon"
          >
            <Send className="h-4 w-4" />
          </Button>
        </div>
      </div>
    </div>
  )
}
```

---

## 5. 开发注意事项

### 5.1 读取文档顺序

```yaml
1. 首先读: INDEX.md (了解全局结构)
2. 然后读: PRD.md (了解产品需求)
3. 开发时查: 
   - specs/data-models.ts (数据结构)
   - specs/api-specs.yaml (API接口)
   - pages/*.yaml (页面详情)
4. AI相关查:
   - prompts/INDEX.md (提示词使用)
   - prompts/agents/ (具体提示词)
```

### 5.2 关键决策

```yaml
技术选择:
  - 使用 App Router (不用 Pages Router)
  - 使用 Server Components (默认)
  - 客户端交互用 'use client'
  - API 用 tRPC (不用 REST)
  - 样式用 Tailwind (不用 CSS Modules)

AI调用:
  - 对话用流式 (streaming)
  - 生成用非流式
  - 模型选择见 prompts 配置
```

### 5.3 常见问题

```yaml
Q: Claude API 调用失败？
A: 检查 ANTHROPIC_API_KEY 环境变量

Q: 数据库连接失败？
A: 检查 MONGODB_URI，确保IP白名单

Q: 样式不生效？
A: 确保 Tailwind 配置正确，检查 content 路径

Q: tRPC 报错？
A: 检查 router 是否正确注册到 appRouter
```

---

## 6. MVP 功能清单

### 必须完成 ✅

```yaml
认证:
  - [ ] 手机号登录
  - [ ] 微信登录 (可选)

对话:
  - [ ] 创建项目
  - [ ] 小T对话
  - [ ] 需求澄清

专家讨论:
  - [ ] 专家消息展示
  - [ ] 多轮讨论
  - [ ] 方案确认

支付:
  - [ ] 定价展示
  - [ ] Stripe支付

进度:
  - [ ] 开发进度页
  - [ ] 完成页面
```

### 可以简化 ⚡

```yaml
简化:
  - 后台管理: 先用MongoDB Compass手动管理
  - 实时通知: 先用轮询，后期改WebSocket
  - 邮件通知: 先不做
  - 多语言: 先只做中文
```

---

## 7. 提示词使用

### 复制提示词到项目

```bash
# 解压docs后，复制prompts目录
cp -r thinkus-docs/prompts ./prompts
```

### 使用示例

```typescript
import { loadPrompt, renderPrompt } from '@/lib/ai/prompts/loader'
import { chat } from '@/lib/ai/claude'

async function understandRequirement(userInput: string) {
  const { config, template } = loadPrompt('requirement/understand.md')
  
  const systemPrompt = renderPrompt(template, {
    user_input: userInput,
    conversation_history: [],
  })

  const response = await chat({
    model: config.model,
    system: systemPrompt,
    messages: [{ role: 'user', content: userInput }],
    temperature: config.temperature,
  })

  return JSON.parse(response.content)
}
```

---

## 8. 给 Claude Code 的提示

开始开发时，可以这样说：

```
我要开发 Thinkus 项目，这是一个AI驱动的创业成功平台。

请先阅读以下文档：
1. INDEX.md - 了解文档结构
2. PRD.md - 了解产品需求
3. ARCHITECTURE.md - 了解技术架构

然后按照 BOOTSTRAP.md 的开发顺序，从 Phase 1 开始：
1. 创建 Next.js 项目
2. 配置 Tailwind 和 shadcn/ui
3. 设置 MongoDB 连接
4. 实现 NextAuth 认证

开始吧！
```

---

**这份指南 + 完整文档 = Claude Code 可以开始开发！**
