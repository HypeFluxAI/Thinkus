# AI 助手上下文文档

> 本文档为新 AI 助手提供快速上手所需的所有关键信息

---

## 一、项目概述

### 1.1 产品定位
**Thinkus** 是一个 AI 驱动的创业成功平台，让任何人都能把想法变成产品。

**核心价值链**: `想法 → 开发 → 上线 → 运营 → 赚钱`

### 1.2 核心功能
- **18位虚拟AI高管团队**: 每位用户拥有专属的高管实例
- **智能多高管讨论**: 根据话题自动调度相关专家参与讨论
- **双层记忆系统**: 用户偏好记忆 + 项目记忆 (Pinecone向量库)
- **6阶段项目管理**: ideation → definition → design → development → prelaunch → growth
- **邀请码饥饿营销**: 排队申请 + 付费用户邀请
- **4档订阅套餐**: free/starter/professional/enterprise

### 1.3 技术栈
```yaml
前端:
  - Next.js 16.1.1 (App Router)
  - React 19.2.3
  - TypeScript 5
  - Tailwind CSS 4
  - Radix UI / shadcn/ui
  - Zustand (状态管理)

后端:
  - tRPC
  - MongoDB (Mongoose)
  - Pinecone (向量数据库)
  - Redis (缓存，可选)

AI:
  - Anthropic Claude API (Haiku/Sonnet/Opus)
  - OpenAI Embeddings (text-embedding-3-small)

支付:
  - Stripe

部署:
  - Vercel / Docker
  - MongoDB Atlas
```

---

## 二、关键文件路径

### 2.1 核心配置文件
| 文件 | 路径 | 说明 |
|------|------|------|
| 高管配置 | `src/lib/config/executives.ts` | 18位高管角色定义 |
| AI高管配置 | `src/lib/config/ai-executives.ts` | 高管分组和专业领域 |
| 产品类型 | `src/lib/config/product-types.ts` | 9种产品类型定义 |
| 项目阶段 | `src/lib/config/project-phases.ts` | 6个项目阶段配置 |
| 订阅计划 | `src/lib/config/subscription-plans.ts` | 4档订阅套餐定义 |
| 外部专家 | `src/lib/config/external-experts.ts` | 外部咨询专家配置 |

### 2.2 核心服务文件
| 文件 | 路径 | 说明 |
|------|------|------|
| Claude API | `src/lib/ai/claude.ts` | Claude API 封装 |
| 讨论编排器 | `src/lib/services/discussion-orchestrator.ts` | 多高管讨论编排 |
| 决策服务 | `src/lib/services/decision-service.ts` | 决策提取和管理 |
| 记忆服务 | `src/lib/vector/memory-service.ts` | Pinecone 记忆管理 |
| 技能蒸馏 | `src/lib/services/skill-distillation-service.ts` | 技能提取和复用 |

### 2.3 数据库模型
| 模型 | 路径 | 说明 |
|------|------|------|
| 用户 | `src/lib/db/models/user.ts` | 用户信息 |
| 项目 | `src/lib/db/models/project.ts` | 项目信息 |
| 用户高管 | `src/lib/db/models/user-executive.ts` | 用户专属高管实例 |
| 讨论 | `src/lib/db/models/discussion.ts` | 讨论记录 |
| 决策 | `src/lib/db/models/decision.ts` | 决策记录 |
| 记忆 | `src/lib/db/models/memory.ts` | 记忆存储 |
| 订阅 | `src/lib/db/models/subscription.ts` | 订阅信息 |
| 邀请码 | `src/lib/db/models/invitation-code.ts` | 邀请码 |

### 2.4 主要页面路由
```
src/app/
├── (auth)/                     # 认证页面
│   ├── login/                  # 登录
│   ├── register/               # 注册
│   ├── apply/                  # 排队申请
│   └── waitlist/status/        # 排队状态
├── (main)/                     # 主应用 (需登录)
│   ├── dashboard/              # 仪表盘
│   ├── projects/[id]/          # 项目详情
│   ├── create/                 # 创建项目
│   ├── executives/             # 高管管理
│   ├── settings/               # 用户设置
│   └── pricing/                # 定价页面
└── api/                        # API 路由
    ├── chat/                   # AI 对话
    ├── discussion/             # 讨论管理
    ├── decisions/              # 决策管理
    ├── memories/               # 记忆管理
    └── stripe/                 # 支付相关
```

---

## 三、18位虚拟高管

### 3.1 产品设计组 (4人)
| ID | 姓名 | 角色 | 专长 |
|----|------|------|------|
| mike | Mike Chen | 产品负责人 | 产品规划、用户研究、需求分析 |
| elena | Elena Rodriguez | UX设计总监 | 用户体验、交互设计、可用性 |
| rachel | Rachel Kim | 内容策略师 | 内容规划、文案、SEO |
| chloe | Chloe Wang | 品牌设计师 | 视觉设计、品牌标识 |

### 3.2 技术组 (4人)
| ID | 姓名 | 角色 | 专长 |
|----|------|------|------|
| david | David Kim | 技术架构师 | 系统架构、技术选型 |
| james | James Wilson | QA总监 | 质量保证、测试策略 |
| kevin | Kevin O'Brien | DevOps主管 | 部署、CI/CD、运维 |
| alex | Alex Turner | 安全专家 | 安全审计、合规 |

### 3.3 增长运营组 (4人)
| ID | 姓名 | 角色 | 专长 |
|----|------|------|------|
| lisa | Lisa Wang | 增长负责人 | 用户增长、留存策略 |
| marcus | Marcus Thompson | CMO | 营销策略、品牌推广 |
| nina | Nina Patel | 客户成功主管 | 客户关系、服务优化 |
| sarah | Sarah Johnson | 数据分析主管 | 数据分析、BI |

### 3.4 财务法务组 (3人)
| ID | 姓名 | 角色 | 专长 |
|----|------|------|------|
| frank | Frank Morrison | CFO | 财务规划、成本控制 |
| tom | Tom Anderson | 法务顾问 | 法律合规、合同审核 |
| iris | Iris Chen | 投融资顾问 | 融资策略、投资人对接 |

### 3.5 战略支持组 (3人)
| ID | 姓名 | 角色 | 专长 |
|----|------|------|------|
| nathan | Nathan Lee | 战略规划师 | 商业策略、竞争分析 |
| oscar | Oscar Zhang | 运维工程师 | 系统监控、故障处理 |
| victor | Victor Liu | 销售顾问 | 销售策略、渠道管理 |

---

## 四、项目阶段配置

| 阶段 | ID | 核心高管 | 说明 |
|------|-----|----------|------|
| 想法探索 | ideation | mike, elena, nathan | 验证想法可行性 |
| 需求定义 | definition | mike, david, elena | 明确产品需求 |
| 设计阶段 | design | elena, chloe, david | UI/UX 设计 |
| 开发阶段 | development | david, james, kevin | 技术实现 |
| 发布准备 | prelaunch | marcus, lisa, kevin | 上线准备 |
| 增长运营 | growth | lisa, marcus, sarah | 用户增长 |

---

## 五、订阅套餐

| 套餐 | 价格(月) | 项目数 | 讨论/月 | 高管数 | 邀请码/月 |
|------|----------|--------|---------|--------|-----------|
| Free | 0 | 1 | 5 | 3 | 0 |
| Starter | $29 | 5 | 50 | 6 | 1 |
| Professional | $99 | 20 | 200 | 12 | 2 |
| Enterprise | $299 | 无限 | 无限 | 18 | 5 |

---

## 六、开发规范

### 6.1 命名规范
```yaml
文件名: kebab-case (例: user-profile.tsx)
组件名: PascalCase (例: UserProfile)
函数名: camelCase (例: getUserById)
常量名: UPPER_SNAKE_CASE (例: API_BASE_URL)
类型名: PascalCase (例: UserProfile)
```

### 6.2 提交规范
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
```

### 6.3 关键技术决策
```yaml
路由: App Router (非 Pages Router)
组件: Server Components (默认)
客户端: 'use client' 指令
API: tRPC (非 REST)
样式: Tailwind CSS (非 CSS Modules)
AI调用: 流式响应 (streaming)
```

---

## 七、环境变量

```bash
# 必需
MONGODB_URI=mongodb+srv://...
NEXTAUTH_URL=http://localhost:3000
NEXTAUTH_SECRET=your-secret-key
ANTHROPIC_API_KEY=sk-ant-...
OPENAI_API_KEY=sk-...
PINECONE_API_KEY=...
PINECONE_INDEX_NAME=thinkus

# Stripe
STRIPE_SECRET_KEY=sk_test_...
STRIPE_WEBHOOK_SECRET=whsec_...
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_test_...

# 可选
GOOGLE_CLIENT_ID=...
GOOGLE_CLIENT_SECRET=...
GITHUB_CLIENT_ID=...
GITHUB_CLIENT_SECRET=...
```

---

## 八、当前开发状态

### 8.1 已完成功能 (v11)
- [x] 用户认证 (NextAuth + OAuth)
- [x] 18位虚拟高管系统
- [x] 多高管讨论功能
- [x] 项目6阶段管理
- [x] Pinecone 记忆系统
- [x] 邀请码系统
- [x] Stripe 订阅支付
- [x] 决策提取和管理
- [x] 技能蒸馏系统
- [x] 定时任务系统

### 8.2 待开发功能 (v12)
参考文档: `thinkus-final-v11/upgrade/` 目录下的升级文档

**P0 优先级:**
- [ ] 分层模型路由 (Haiku/Sonnet/Opus 成本优化)
- [ ] 经验库系统 (代码复用)
- [ ] 邀请系统优化

**P1 优先级:**
- [ ] 多格式需求输入 (PDF/图片/Excel)
- [ ] AI 开发沙箱 (Docker)
- [ ] AI 工作直播 (WebSocket)
- [ ] 免费 Demo 体验

**P2 优先级:**
- [ ] 运营数据看板
- [ ] AI 增长顾问
- [ ] 功能迭代通道

---

## 九、常见开发任务

### 9.1 添加新高管
1. 编辑 `src/lib/config/executives.ts`
2. 添加高管配置到 `EXECUTIVES` 对象
3. 更新 `src/lib/config/ai-executives.ts` 分组配置

### 9.2 添加新 API 路由
1. 在 `src/app/api/` 下创建路由文件
2. 或在 `src/lib/trpc/routers/` 下添加 tRPC 路由
3. 在 `src/lib/trpc/routers/index.ts` 注册新路由

### 9.3 添加新页面
1. 在 `src/app/(main)/` 下创建页面目录
2. 创建 `page.tsx` 文件
3. 如需布局，创建 `layout.tsx`

### 9.4 添加新组件
1. UI 组件放 `src/components/ui/`
2. 业务组件按功能分目录
3. 导出使用 `index.ts`

---

## 十、快速开始命令

```bash
# 安装依赖
pnpm install

# 启动开发服务器
pnpm dev

# 类型检查
pnpm typecheck

# 运行测试
pnpm test

# 构建生产版本
pnpm build

# 启动生产服务器
pnpm start
```

---

## 十一、重要提醒

1. **修改前先读取**: 在修改任何文件前，先使用 Read 工具读取文件内容
2. **保持代码风格一致**: 遵循项目已有的代码风格和命名规范
3. **测试优先**: 修改核心逻辑后运行测试确保功能正常
4. **文档同步**: 重大修改后更新相关文档
5. **提交规范**: 遵循 Conventional Commits 规范
6. **安全意识**: 不要在代码中硬编码敏感信息

---

**最后更新**: 2026-01-13
