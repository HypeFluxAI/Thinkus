# Thinkus 完整开发文档 v11.0

> **为AI开发者准备的完整产品规格与技术文档**
>
> 最后更新: 2026-01-15

---

## 🎯 产品一句话定义

**Thinkus = AI产品开发平台，帮你把想法变成可运行的产品**

**目标用户**: 任何有产品开发需求的个人和公司（不仅限于创业团队）

**支持平台**: Web、iOS、Android、Windows、macOS、小程序，未来支持VR/AR/IoT/机器人

---

## 📚 文档结构

```
thinkus-final-v11/
│
├── INDEX.md                          # ← 你在这里 (阅读入口)
│
├── core/                             # 核心文档 (必读)
│   ├── 01-PRD.md                     # 产品需求文档 ✅
│   ├── 02-ARCHITECTURE.md            # 技术架构文档 ✅
│   └── 03-DATA-MODELS.md             # 数据模型定义 ✅
│
├── technical/                        # 技术规格
│   ├── 01-USER-EXCLUSIVE-EXECUTIVES.md  # 用户专属高管架构 ✅
│   ├── 02-MEMORY-SYSTEM.md              # 双层记忆系统 ✅
│   ├── 03-AUTONOMOUS-SYSTEM.md          # AI自治运营系统 ✅
│   ├── 04-API-SPECS.md                  # API接口规格 ✅
│   └── 05-TECH-STACK.md                 # 技术栈详解 (待补充)
│
├── flows/                            # 业务流程
│   ├── 01-PROJECT-LIFECYCLE.md       # 项目生命周期 (6阶段) ✅
│   ├── 02-SMART-SCHEDULING.md        # 智能调度系统 (已合并到01)
│   └── 03-INVITATION-SYSTEM.md       # 邀请码饥饿营销系统 ✅
│
├── prompts/                          # AI高管提示词
│   ├── AGENTS-INDEX.md               # 高管索引 ✅
│   └── agents/                       # 各高管详细提示词
│
└── reference/                        # 参考资料
    ├── GLOSSARY.md                   # 术语表 ✅
    ├── UI-SPEC.md                    # UI规格 ✅
    └── DEVELOPMENT-PRIORITY.md       # 开发优先级 ✅
```

---

## 🚀 阅读顺序建议

### 初次了解 (30分钟)
```yaml
1. INDEX.md (本文件)           # 了解整体结构
2. core/01-PRD.md              # 了解产品是什么
3. core/02-ARCHITECTURE.md     # 了解技术架构
```

### 深入理解 (2小时)
```yaml
4. technical/01-USER-EXCLUSIVE-EXECUTIVES.md  # 用户专属高管核心设计
5. flows/01-PROJECT-LIFECYCLE.md              # 完整服务流程
6. technical/03-AUTONOMOUS-SYSTEM.md          # AI自治运营
7. flows/03-INVITATION-SYSTEM.md              # 增长策略
```

### 开发参考 (按需)
```yaml
- core/03-DATA-MODELS.md      # 数据库设计
- technical/04-API-SPECS.md   # API设计
- prompts/AGENTS-INDEX.md     # AI高管提示词
- reference/UI-SPEC.md        # 界面规格
```

---

## 🔑 核心概念速览

### 1. 产品定位
```
Thinkus 不是:
  ❌ AI聊天工具 (只能聊天)
  ❌ AI顾问 (只提供建议)
  ❌ SaaS工具 (用户自己做)

Thinkus 是:
  ✅ AI产品开发平台 (帮你做出来)
  ✅ 全平台支持 (Web/移动/桌面/小程序)
  ✅ 按需运营 (开发完成后可选托管运营)

目标用户:
  ✅ 任何有产品开发需求的个人和公司
  ✅ 非技术创业者、产品经理、开发者、企业
```

### 2. AI高管团队
```yaml
内部高管 (18位，用户专属):
  - 每个用户拥有专属的18个AI高管
  - 完全隔离，只为你工作
  - 记住你的项目、偏好、历史
  - 包括: 产品、设计、技术、运营、增长、财务、法务等

外部专家 (20位，共享资源):
  - 世界级专家，按需咨询
  - 不记住项目细节
  - 提供通用专业建议
```

### 3. 项目生命周期
```
想法探索 → 需求定义 → 设计阶段 → 开发阶段 → 发布上线 → 增长运营
   ↓           ↓           ↓           ↓           ↓           ↓
 1-2周       1-2周       1-3周       4-12周      1-2周       持续
```

### 4. AI自治运营
```yaml
核心理念: AI驱动，人确认

决策分级:
  L0 全自动: Bug修复、性能优化、日常内容
  L1 通知:   新功能上线、营销活动
  L2 确认:   核心变更、大型活动
  L3 强制:   安全、法务、大额财务
```

### 5. 商业模式
```yaml
开发定价 (按项目复杂度一次性付费):
  L1 简单落地页: $49 (数小时)
  L2 标准应用: $199 (1天)
  L3 复杂应用: $499 (2-3天)
  L4 企业级应用: $999 (3-5天)
  L5 平台级产品: $2999+ (1-2周)

运营服务 (可选，按周动态计费):
  - 产品完成后用户自主选择是否需要运营
  - 系统自动评估运营成本
  - 每周动态调整费用 ($50-$500/周)
  - 费用变化>20%提前通知
```

---

## 💡 核心技术壁垒

```yaml
1. 用户专属高管架构:
   - 每个用户独立的18个高管实例
   - 完全数据隔离，记忆专属
   - 技能在后台静默共享提升

2. 双层记忆系统:
   - Layer 1: 高管进化记忆 (跨项目，了解用户偏好)
   - Layer 2: 项目记忆 (项目内，了解项目细节)

3. 智能调度系统:
   - 根据项目阶段自动配置高管
   - 根据话题动态加入专家
   - 成本优化的24小时自动运行

4. 邀请码饥饿营销:
   - 申请+排队制
   - 每日限量释放
   - 邀请码成为社交货币
```

---

## 📊 关键指标

```yaml
产品指标:
  - 项目完成率: > 95%
  - 用户满意度: NPS > 50
  - 交付物一次通过率: > 70%

商业指标:
  - 免费→付费转化: > 5%
  - 用户留存 (D30): > 25%
  - ARPU: > ¥200/月

增长指标:
  - 邀请发送率: > 40%
  - 邀请转化率: > 30%
  - 病毒系数K: > 0.7
```

---

## 🛠 技术栈概览

```yaml
前端:
  - Next.js 14 (App Router)
  - TypeScript + Tailwind CSS
  - shadcn/ui + Zustand
  - Socket.io (实时通信)

后端:
  - Next.js API Routes + tRPC
  - MongoDB + Pinecone (向量数据库)
  - Redis + BullMQ
  - NextAuth.js

AI:
  - Claude Opus (核心分析)
  - Claude Sonnet (常规任务)
  - Claude Haiku (调度、分类)

部署:
  - Vercel / Railway
  - MongoDB Atlas
  - Cloudflare (CDN + R2存储)
```

---

## ⚠️ 开发注意事项

```yaml
核心原则:
  1. 用户数据完全隔离 - 每个用户的高管和记忆独立
  2. AI驱动人确认 - 分级决策，重要事项需确认
  3. 成本可控 - 日预算限制，智能调度
  4. 稀缺营销 - 邀请码永远保持稀缺

技术要点:
  1. Pinecone命名空间: user_{userId}_{agentId}
  2. 记忆查询限制: 每次最多检索10条相关记忆
  3. 讨论轮数: 核心高管必须发言，最多3轮
  4. 决策超时: L2确认48小时，L3确认72小时
```

---

## 📝 文档版本历史

| 版本 | 日期 | 主要更新 |
|------|------|----------|
| v11.0 | 2026-01-15 | 融合final版本，完整开发规格 |
| v10.0 | 2026-01-14 | 用户专属高管、邀请系统 |
| v7.0 | 2026-01-10 | AI自治系统、CEO Dashboard |

---

**开始阅读**: [core/01-PRD.md](core/01-PRD.md)
