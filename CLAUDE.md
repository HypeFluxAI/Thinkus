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
  - TailwindCSS + shadcn/ui
  - Zustand + TanStack Query + tRPC

后端 (微服务架构):
  Node.js: tRPC API、NextAuth认证、Memory/Executive服务
  Python (FastAPI + gRPC): AI引擎、文档处理、增长建议
  Go (Gin + gRPC): 编排调度、数据分析、沙盒管理

数据存储:
  - MongoDB (Mongoose)
  - Redis (缓存+消息)
  - Pinecone (向量搜索)

AI:
  - Claude Opus/Sonnet/Haiku
  - OpenAI Embeddings

部署:
  - Docker Compose + Kubernetes
  - Vercel (前端)
  - MongoDB Atlas
```

---

## 后端语言分配策略

```yaml
语言选择原则:
  TypeScript优先: 前端交互、tRPC、实时通信
  Python优先: AI/ML、文档处理、数据分析
  Go优先: 高并发、编排调度、容器管理

服务分配:
  Node.js: thinkus-app/src/lib/services/
  Python: services/py-*/ (FastAPI + gRPC)
  Go: services/go-*/ (Gin + gRPC)

新建服务决策:
  1. AI/ML相关 → Python
  2. 高并发/调度 → Go
  3. 前端交互 → Node.js
```

---

## 目录结构

```
thinkus/
├── thinkus-app/src/
│   ├── app/              # Next.js App Router
│   │   ├── (auth)/       # 认证页面
│   │   ├── (main)/       # 主要页面
│   │   └── api/          # API路由
│   ├── components/       # React组件
│   ├── lib/              # 核心库
│   │   ├── trpc/         # tRPC配置
│   │   ├── db/           # 数据库模型
│   │   ├── ai/           # AI相关
│   │   └── services/     # 业务服务
│   ├── hooks/            # React hooks
│   └── types/            # 类型定义
├── services/
│   ├── py-*/             # Python微服务
│   └── go-*/             # Go微服务
├── thinkus-v12-docs/     # 项目文档
│   └── v13-specs/        # v13功能规格 (13个模块文档)
└── CLAUDE.md             # 本文件
```

---

## 开发规范

### 代码风格

```yaml
命名规范:
  文件: kebab-case (user-profile.tsx)
  组件: PascalCase (UserProfile)
  函数: camelCase (getUserById)
  常量: UPPER_SNAKE_CASE (API_BASE_URL)
```

### 提交规范

```yaml
格式: type(scope): message

类型: feat/fix/docs/style/refactor/test/chore

示例:
  - feat(auth): add Google OAuth login
  - fix(chat): resolve message ordering issue
```

---

## 文档参考

```yaml
核心文档:
  - thinkus-v12-docs/v13-specs/README.md  # v13功能规格索引
  - thinkus-v12-docs/INDEX.md             # 文档索引
  - thinkus-v12-docs/PRD.md               # 产品需求

v13功能规格 (thinkus-v12-docs/v13-specs/):
  - 00-overview.md      # 项目概览
  - 01-architecture.md  # 三层架构
  - 02-ai-executives.md # 18位AI高管
  - 03-memory-system.md # 记忆系统
  - 04-development-workflow.md # 开发流程
  - 05-interface-contract.md   # 接口契约
  - 06-testing-system.md       # 测试系统
  - 07-model-routing.md        # 模型调度
  - 08-knowledge-system.md     # 知识系统
  - 09-ceo-dashboard.md        # 控制台
  - 10-data-models.md          # 数据模型
  - 11-api-design.md           # API设计
  - 12-deployment.md           # 部署运维
```

---

## 关键决策

```yaml
技术选择:
  - 使用 App Router (不用 Pages Router)
  - 使用 Server Components (默认)
  - API 用 tRPC (不用 REST)
  - 样式用 Tailwind (不用 CSS Modules)

AI调用:
  - 对话用流式 (streaming)
  - 生成用非流式
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

# 存储 (Cloudflare R2)
R2_ACCOUNT_ID=...
R2_BUCKET_NAME=thinkus-artifacts
```

---

## 更新日志

| 日期 | 版本 | 更新内容 |
|------|------|----------|
| 2026-01-17 | 4.0.0 | 压缩CLAUDE.md: 移除冗余内容,保留核心规范,详细规格移至v13-specs |
| 2026-01-17 | 3.9.0 | 拆分v13功能规格为13个独立模块文档(thinkus-v12-docs/v13-specs/) |
| 2026-01-17 | 3.8.0 | 创建v13完整功能需求规格文档 |
| 2026-01-17 | 3.7.x | 交付系统完善、需求模板、微服务架构 |
| 2026-01-16 | 3.6.x | 交付系统UI组件、SSE实时推送 |
| 2026-01-13 | 2.x.x | v12升级: Token优化、模型调度、文档处理、沙盒、运营闭环 |
| 2026-01-11 | 1.x.x | 基础功能: 认证、对话、专家讨论、支付、项目管理 |

> 完整历史记录请查看 git log

---

**每次修改后请更新此文档并提交到GitHub主分支**
