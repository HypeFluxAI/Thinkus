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

后端 (微服务架构):
  主服务 (Node.js):
    - tRPC API路由
    - NextAuth认证
    - Memory/Executive服务

  Python微服务 (FastAPI + gRPC):
    - DocumentProcessor (文档处理)
    - RequirementIntegrator (需求整合)
    - GrowthAdvisor (增长建议)
    - ExperienceService (经验库)

  Go Analytics微服务 (Gin + gRPC):
    - AnalyticsService (数据分析)
    - RealtimeStream (实时推送)

  Go Sandbox微服务 (Gin + gRPC):
    - SandboxManager (容器管理)

数据存储:
  - MongoDB (Mongoose)
  - Redis (缓存+消息)
  - Pinecone (向量搜索)

AI:
  - Anthropic Claude API
  - Model: Claude Opus/Sonnet/Haiku
  - OpenAI Embeddings

部署:
  - Docker Compose (微服务编排)
  - Vercel (前端)
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
│   │   │   ├── create/         # 创建流程 (idea/discuss/confirm/success)
│   │   │   ├── projects/       # 项目管理
│   │   │   │   └── [id]/       # 项目详情/进度/完成/分析/资产
│   │   │   ├── settings/       # 设置页面
│   │   │   └── templates/      # 模板市场
│   │   ├── api/                # API路由
│   │   │   ├── chat/           # 对话API
│   │   │   ├── discuss/        # 讨论API
│   │   │   ├── checkout/       # 支付API
│   │   │   └── webhooks/       # Webhook处理
│   │   └── layout.tsx
│   ├── components/
│   │   ├── ui/                 # shadcn/ui组件
│   │   ├── chat/               # 对话相关
│   │   ├── expert/             # 专家头像、消息
│   │   └── project/            # 项目相关 (product-type-selector)
│   ├── lib/
│   │   ├── trpc/               # tRPC配置
│   │   ├── db/                 # 数据库
│   │   ├── auth/               # 认证
│   │   ├── ai/                 # AI相关
│   │   ├── stripe/             # Stripe配置
│   │   ├── config/             # 配置 (product-types)
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
- [x] Stripe配置 (lib/stripe/config)
- [x] Checkout API (api/checkout)
- [x] Webhook处理 (api/webhooks/stripe)
- [x] 支付成功页面 (success)
- [x] 开发进度页面 (progress)
- [x] 项目完成页面 (complete)

### Phase 2 完善: 项目管理和设置
- [x] 项目列表页面 (/projects)
- [x] 项目详情页面 (/projects/[id])
- [x] 设置页面布局 (/settings)
- [x] 个人资料设置 (/settings/profile)
- [x] API密钥管理 (/settings/credentials)
- [x] 通知设置 (/settings/notifications)
- [x] 外观设置 (/settings/appearance)
- [x] 定价页面 (/pricing)
- [x] 首页优化 (完整marketing页面)

### Phase 3 完善: 高级功能
- [x] 多产品类型支持 (lib/config/product-types)
- [x] 产品类型选择器 (components/project/product-type-selector)
- [x] 资产管理页面 (/projects/[id]/assets)
- [x] 数据分析页面 (/projects/[id]/analytics)
- [x] 模板市场页面 (/templates)
- [x] 模板详情页面 (/templates/[id])
- [x] 项目详情快速操作面板
- [x] 导航和页脚优化

### v12 升级: AI员工增强

#### Phase 0: 止血 (Token优化)
- [x] Artifact Model (lib/db/models/artifact.ts) - 工具产物存储
- [x] Session Summary Model (lib/db/models/session-summary.ts) - 会话摘要
- [x] Artifact Service (lib/services/artifact-service.ts) - Full存储+Compact摘要
- [x] Session Summary Service (lib/services/session-summary-service.ts) - 摘要生成
- [x] Memory Controller (lib/services/memory-controller.ts) - 智能判断是否需要记忆
- [x] Memory Injector 升级 - 集成智能增强 (smartEnhanceContext)
- [x] 服务层统一导出 (lib/services/index.ts)

#### Phase 1: 基础能力
- [x] 分层模型调度 (lib/ai/model-router.ts) - Haiku/Sonnet/Opus智能选择
- [x] 经验库基础版 (lib/db/models/experience.ts, lib/services/experience-service.ts)
- [x] 邀请系统优化 (lib/services/invitation-service.ts) - AI评分、贡献奖励、限时活动
- [x] AI模块统一导出 (lib/ai/index.ts)

#### Phase 2: 文档处理
- [x] DocumentProcessor (lib/services/document-processor.ts) - PDF/图片/Excel/Word多格式处理
- [x] Claude Vision 图片理解
- [x] RequirementIntegrator (lib/services/requirement-integrator.ts) - 需求整合和去重
- [x] 支持URL网页抓取

#### Phase 3: 沙盒和直播
- [x] SandboxManager (lib/services/sandbox-manager.ts) - Docker容器管理、文件操作、命令执行
- [x] RealtimeStreamService (lib/services/realtime-stream.ts) - 实时事件推送、SSE支持
- [x] 事件类型定义 (code_change/terminal_output/agent_status/progress等)

#### Phase 4: 运营闭环
- [x] AnalyticsEvent Model (lib/db/models/analytics-event.ts) - 事件存储、统计查询
- [x] AnalyticsService (lib/services/analytics-service.ts) - 数据统计、趋势分析、漏斗
- [x] GrowthAdvisor (lib/services/growth-advisor.ts) - AI增长建议、行业基准对比
- [x] 嵌入式统计代码生成 (generateTrackingScript)

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
R2_ENDPOINT=https://xxx.r2.cloudflarestorage.com
R2_BUCKET_NAME=thinkus-artifacts
R2_REGION=auto
```

---

## 更新日志

| 日期 | 版本 | 更新内容 |
|------|------|----------|
| 2026-01-15 | 2.3.0 | 专家讨论优化: 轮数控制(50轮硬限制)、Token优化(orchestrator每3轮调用)、实时功能共识识别和前端展示 |
| 2026-01-15 | 2.2.1 | 修复专家讨论内容截断: 增加max_tokens从256/512到768/1024 |
| 2026-01-15 | 2.2.0 | 修复流式API错误: chat和discuss API的Controller closed错误、会话数据隔离、E2E测试改进 |
| 2026-01-13 | 2.1.0 | v12升级Phase 4: 运营闭环 - AnalyticsService数据分析、GrowthAdvisor增长建议 |
| 2026-01-13 | 2.0.0 | v12升级Phase 3: 沙盒和直播 - SandboxManager容器管理、RealtimeStream实时推送 |
| 2026-01-13 | 1.9.0 | v12升级Phase 2: 文档处理 - DocumentProcessor多格式处理、RequirementIntegrator需求整合 |
| 2026-01-13 | 1.8.0 | v12升级Phase 1: 基础能力 - ModelRouter分层调度、ExperienceLibrary经验库、InvitationService极致邀请 |
| 2026-01-13 | 1.7.0 | v12升级Phase 0: AI员工止血 - Artifact卸载、Session Summary、Memory Controller、智能记忆增强 |
| 2026-01-11 | 1.6.0 | 完成Phase 3完善: 多产品类型、资产管理、数据分析、模板市场 |
| 2026-01-11 | 1.5.0 | 完成Phase 2完善: 项目管理、设置页面、定价页、首页优化 |
| 2026-01-11 | 1.4.0 | 完成Phase 4: Stripe支付、开发进度页、项目完成页 |
| 2026-01-11 | 1.3.0 | 完成Phase 3: 专家讨论系统、多阶段讨论、方案确认页面 |
| 2026-01-11 | 1.2.0 | 完成Phase 2: 登录注册、仪表盘、对话系统、功能识别 |
| 2026-01-11 | 1.1.0 | 完成Phase 1: 数据库、认证、tRPC、Claude API |
| 2026-01-10 | 1.0.0 | 初始化项目，创建CLAUDE.md |

---

**每次修改后请更新此文档并提交到GitHub主分支**
