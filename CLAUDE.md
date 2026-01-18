# Thinkus 项目开发规范

> Claude Code 开发此项目时必须遵守的规则

## 项目概述

**Thinkus** - AI驱动的创业成功平台，让任何人都能把想法变成产品

## 技术栈

| 层级 | 技术 |
|------|------|
| 前端 | Next.js 14 (App Router) + TypeScript + TailwindCSS + shadcn/ui + tRPC |
| 后端 | Node.js (tRPC) / Python (FastAPI) / Go (Gin) |
| 数据 | MongoDB + Redis + Pinecone |
| AI | Claude Opus/Sonnet/Haiku + OpenAI Embeddings |

## 目录结构

```
thinkus/
├── thinkus-app/src/          # Next.js 前端
│   ├── app/                  # App Router (auth/main/api)
│   ├── components/           # React组件 (含 memory/)
│   └── lib/                  # trpc/db/ai/services
├── services/
│   ├── py-ai-engine/         # AI员工引擎 (端口: 8016)
│   │   ├── src/employees/    # 18位AI员工实现
│   │   ├── src/memory/       # 记忆系统 (见下方)
│   │   └── tests/            # pytest单元测试
│   ├── py-*/                 # 其他Python服务
│   └── go-*/                 # Go服务
└── v13-specs/                # 功能规格文档 (00-12)
```

## 开发规范

```yaml
命名: 文件kebab-case | 组件PascalCase | 函数camelCase | 常量UPPER_SNAKE
提交: type(scope): message  # feat/fix/docs/refactor/test
技术选择: App Router | Server Components | tRPC | Tailwind
AI调用: 对话用流式 | 生成用非流式
语言分配: AI/ML→Python | 高并发→Go | 前端交互→Node.js
```

## 记忆系统 (py-ai-engine/src/memory/)

```
核心模块:
├── manager.py      # 统一管理器
├── scorer.py       # 4维评分 (repeatability/persistence/relevance/decision_value ≥2/4保存)
├── retriever.py    # 两阶段检索 (Directory摘要→Detail全文)
├── corrector.py    # 冲突检测 (模式+LLM判断→降权标记[OUTDATED])
├── cache.py        # Redis缓存
├── shared.py       # 跨员工共享
├── tier_adjuster.py # 动态Tier (CORE 10% | RELEVANT 30% | COLD 60%)
├── scheduler.py    # 定时维护
├── compressor.py   # 长期压缩
└── metrics.py      # Prometheus监控
```

## 环境变量

```bash
# 主应用
MONGODB_URI=mongodb+srv://...
NEXTAUTH_SECRET=...
ANTHROPIC_API_KEY=sk-ant-...

# py-ai-engine
OPENAI_API_KEY=sk-...
PINECONE_API_KEY=...
PINECONE_INDEX_NAME=thinkus-memory
REDIS_URL=redis://localhost:6379
```

## 更新日志

| 版本 | 更新内容 |
|------|----------|
| 5.3.0 | 记忆系统完善: 256单元测试、API/监控/前端/多租户、修复corrector和deduplicator评分逻辑 |
| 5.1.0 | 前端记忆面板、tRPC路由、Prometheus、定时任务、压缩、单元测试 |
| 5.0.0 | AI员工记忆系统完整实现 (Redis缓存/跨员工共享/语义去重/动态Tier/记忆链/后台维护) |
| 4.0.0 | 文档重构，详细规格移至v13-specs/ |
| 3.x | 交付系统、微服务架构 |
| 2.x | Token优化、模型调度、沙盒 |
| 1.x | 基础功能 (认证/对话/支付/项目管理) |

---
**文档参考**: `v13-specs/README.md` | **运行AI引擎**: `cd services/py-ai-engine && python src/main.py`
