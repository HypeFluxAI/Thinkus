# Thinkus 项目开发规范

> Claude Code 开发此项目时必须遵守的规则

---

## 项目概述

- **项目名称**: Thinkus
- **定位**: AI驱动的创业成功平台
- **愿景**: 让任何人都能把想法变成产品

---

## 技术栈

```yaml
前端:
  - Next.js 14 (App Router)
  - TypeScript 5
  - Tailwind CSS 3
  - shadcn/ui
  - Zustand (状态管理)
  - TanStack Query + tRPC

后端:
  - tRPC
  - MongoDB (Mongoose)
  - Redis (缓存)
  - BullMQ (队列)

AI:
  - Anthropic Claude API
  - Model: Claude Opus/Sonnet/Haiku

部署:
  - Vercel
  - MongoDB Atlas
  - Cloudflare (CDN)
```

---

## 目录结构

```
thinkus/
├── src/
│   ├── app/                    # Next.js App Router
│   │   ├── (auth)/             # 认证相关页面
│   │   ├── (main)/             # 主要页面
│   │   ├── api/                # API路由
│   │   └── layout.tsx
│   ├── components/
│   │   ├── ui/                 # shadcn/ui组件
│   │   ├── chat/               # 对话相关
│   │   ├── expert/             # 专家头像、消息
│   │   └── project/            # 项目相关
│   ├── lib/
│   │   ├── trpc/               # tRPC配置
│   │   ├── db/                 # 数据库
│   │   ├── auth/               # 认证
│   │   ├── ai/                 # AI相关
│   │   └── utils/
│   ├── hooks/                  # React hooks
│   └── types/                  # 类型定义
├── prompts/                    # 提示词文件
├── thinkus-docs/               # 项目文档
└── CLAUDE.md                   # 本文件
```

---

## 开发规范

### 代码风格

```yaml
命名规范:
  文件: kebab-case (例: user-profile.tsx)
  组件: PascalCase (例: UserProfile)
  函数: camelCase (例: getUserById)
  常量: UPPER_SNAKE_CASE (例: API_BASE_URL)
  类型/接口: PascalCase (例: UserProfile)

文件组织:
  - 每个组件一个文件
  - 相关组件放同一目录
  - 导出使用 index.ts
```

### 提交规范

```yaml
格式: type(scope): message

类型:
  - feat: 新功能
  - fix: 修复bug
  - docs: 文档更新
  - style: 代码格式
  - refactor: 重构
  - test: 测试
  - chore: 构建/工具

示例:
  - feat(auth): add Google OAuth login
  - fix(chat): resolve message ordering issue
  - docs(readme): update installation guide
```

---

## 文档参考

开发时请参考以下文档:

```yaml
核心文档:
  - thinkus-docs/INDEX.md          # 文档索引
  - thinkus-docs/PRD.md            # 产品需求
  - thinkus-docs/ARCHITECTURE.md   # 技术架构
  - thinkus-docs/BOOTSTRAP.md      # 开发启动指南

规格定义:
  - thinkus-docs/specs/data-models.ts   # 数据模型
  - thinkus-docs/specs/api-specs.yaml   # API规格

页面规格:
  - thinkus-docs/pages/*.yaml      # 各页面详情

提示词:
  - thinkus-docs/prompts/          # AI提示词库
```

---

## 开发阶段

### Phase 1: 基础设施
- [x] 项目初始化
- [x] 数据库连接 (MongoDB)
- [x] 认证系统 (NextAuth)
- [x] tRPC配置
- [x] Claude API封装

### Phase 2: 核心对话
- [x] 登录/注册页面
- [x] 仪表盘页面
- [x] 创建项目页面
- [x] 小T对话组件 (流式响应)
- [x] Claude API集成 (SSE)
- [x] 实时功能识别

### Phase 3: 专家讨论
- [x] 专家角色配置 (Mike/Elena/David)
- [x] 专家讨论组件 (avatar/message/panel)
- [x] 讨论编排器 (多阶段流程)
- [x] 讨论API (SSE流式响应)
- [x] 讨论页面 (discuss)
- [x] 方案确认页面 (confirm)

### Phase 4: 支付和开发
- [ ] Stripe支付
- [ ] 开发进度页
- [ ] 完成页面

---

## 关键决策

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

---

## 环境变量

```bash
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
```

---

## 更新日志

| 日期 | 版本 | 更新内容 |
|------|------|----------|
| 2026-01-11 | 1.3.0 | 完成Phase 3: 专家讨论系统、多阶段讨论、方案确认页面 |
| 2026-01-11 | 1.2.0 | 完成Phase 2: 登录注册、仪表盘、对话系统、功能识别 |
| 2026-01-11 | 1.1.0 | 完成Phase 1: 数据库、认证、tRPC、Claude API |
| 2026-01-10 | 1.0.0 | 初始化项目，创建CLAUDE.md |

---

**每次修改后请更新此文档并提交到GitHub主分支**
