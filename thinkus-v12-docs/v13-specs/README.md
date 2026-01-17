# Thinkus v13 - 功能规格文档索引

> AI驱动的创业成功平台 - 完整功能规格定义

---

## 文档结构

本目录包含Thinkus v13版本的完整功能规格文档，按模块拆分为13个独立文档。

---

## 文档列表

| 序号 | 文档 | 描述 | 优先级 |
|------|------|------|--------|
| 00 | [概览](./00-overview.md) | 产品定义、目标用户、商业模式、项目生命周期 | - |
| 01 | [三层架构](./01-architecture.md) | Go编排层 + Python AI层 + Node.js前端层 | P0 |
| 02 | [AI高管系统](./02-ai-executives.md) | 18位AI高管定义、外部专家、Prompt模板 | P0 |
| 03 | [记忆系统](./03-memory-system.md) | 双层记忆、记忆进化、技能蒸馏 | P0 |
| 04 | [开发流程](./04-development-workflow.md) | 8阶段开发流程、各阶段实现 | P0 |
| 05 | [接口契约](./05-interface-contract.md) | 契约结构、契约管理、代码生成 | P0 |
| 06 | [测试系统](./06-testing-system.md) | Playwright + Browser Use + 全平台测试 | P0 |
| 07 | [模型调度](./07-model-routing.md) | 多模型配置、智能路由、成本控制 | P0 |
| 08 | [知识系统](./08-knowledge-system.md) | 知识库、技能系统、记忆进化 | P1 |
| 09 | [CEO Dashboard](./09-ceo-dashboard.md) | 控制台界面、决策、通知、实时更新 | P0 |
| 10 | [数据模型](./10-data-models.md) | MongoDB Schema、类型定义 | P0 |
| 11 | [API设计](./11-api-design.md) | tRPC + REST + WebSocket + gRPC | P0 |
| 12 | [部署运维](./12-deployment.md) | Docker + Kubernetes + CI/CD | P1 |

---

## 快速导航

### 核心架构
- [01-architecture.md](./01-architecture.md) - 了解三层技术架构
- [02-ai-executives.md](./02-ai-executives.md) - 18位AI高管如何协作

### 开发流程
- [04-development-workflow.md](./04-development-workflow.md) - 从需求到上线的完整流程
- [05-interface-contract.md](./05-interface-contract.md) - 契约驱动开发

### 技术实现
- [10-data-models.md](./10-data-models.md) - 数据模型定义
- [11-api-design.md](./11-api-design.md) - API接口设计
- [06-testing-system.md](./06-testing-system.md) - 测试策略

### 智能系统
- [03-memory-system.md](./03-memory-system.md) - AI记忆如何工作
- [07-model-routing.md](./07-model-routing.md) - 多模型调度策略
- [08-knowledge-system.md](./08-knowledge-system.md) - 知识库和技能蒸馏

### 用户体验
- [09-ceo-dashboard.md](./09-ceo-dashboard.md) - CEO控制台设计

### 运维部署
- [12-deployment.md](./12-deployment.md) - 部署和运维方案

---

## 实现优先级

### Phase 1 (MVP)
```
必须实现:
├── Mike需求分析 (02, 04)
├── 接口契约生成 (05)
├── 基于契约的代码生成 (04, 05)
├── Kevin基础测试 (06)
├── 代码集成
└── 基础进度展示 (09)
```

### Phase 2 (完善)
```
增强功能:
├── 完整AI高管系统 (02)
├── Browser Use UI验收 (06)
├── 双层记忆系统 (03)
├── 多模型调度 (07)
└── CEO Dashboard (09)
```

### Phase 3 (高级)
```
高级功能:
├── 知识库 (08)
├── 技能蒸馏 (03, 08)
├── 全平台测试 (06)
└── 自动部署 (12)
```

---

## 技术栈总览

```yaml
前端:
  - Next.js 14 (App Router)
  - TypeScript
  - TailwindCSS + shadcn/ui
  - tRPC + React Query

后端:
  - Go (Gin/Fiber) - 编排层
  - Python (FastAPI) - AI执行层
  - Node.js - 前端API层

数据:
  - PostgreSQL - 主数据库
  - Redis - 缓存/队列
  - Pinecone - 向量存储

AI:
  - Claude Code - 代码生成
  - Gemini Pro - 分析规划
  - Claude Opus - 复杂决策
  - Claude Haiku - 快速路由

部署:
  - Vercel - 前端
  - Kubernetes - 后端
  - Docker - 容器化
```

---

## 相关文档

- [完整规格文档](../thinkus-v13-feature-spec.md) - 未拆分的完整版本
- [CLAUDE.md](../../CLAUDE.md) - 项目开发规范
- [thinkus-docs/](../../thinkus-docs/) - 其他项目文档

---

## 变更记录

| 日期 | 版本 | 变更内容 | 作者 |
|------|------|----------|------|
| 2026-01-17 | v1.0 | 初始版本，从完整规格文档拆分 | Claude Code |
