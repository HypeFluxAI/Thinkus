# Thinkus 术语表

> **版本: v11.0 | 日期: 2026-01-15**

---

## 产品术语

| 术语 | 英文 | 说明 |
|------|------|------|
| Thinkus | - | 产品名称，AI创业团队平台 |
| 内部高管 | Internal Executive | 用户专属的18个AI高管，完全隔离 |
| 外部专家 | External Expert | 共享的20个世界级专家，按需咨询 |
| 项目 | Project | 用户在Thinkus上创建的产品项目 |
| 阶段 | Phase | 项目生命周期的6个阶段 |
| 讨论 | Discussion | 用户与AI高管的对话会话 |
| 决策 | Decision | AI高管提出需要处理的事项 |
| 交付物 | Deliverable | AI高管产出的文档、设计、代码等 |

---

## 高管术语

### 内部高管 (18个)

| ID | 姓名 | 角色 | 职责 |
|------|------|------|------|
| mike | Mike Chen | 产品负责人 | 需求分析、PRD、优先级 |
| elena | Elena Rodriguez | UX设计总监 | 界面设计、交互设计 |
| david | David Kim | 技术架构师 | 架构设计、代码实现 |
| rachel | Rachel Adams | 内容策略师 | 文案、帮助文档 |
| chloe | Chloe Bennett | 品牌设计师 | 品牌视觉、Logo |
| james | James Wilson | QA总监 | 测试、质量保证 |
| kevin | Kevin O'Brien | DevOps主管 | 部署、运维 |
| alex | Alex Turner | 安全专家 | 安全策略、合规 |
| lisa | Lisa Wang | 增长负责人 | 增长策略、获客 |
| marcus | Marcus Thompson | 运营总监/CMO | 运营、市场推广 |
| nina | Nina Patel | 客户成功主管 | 客服、用户满意度 |
| sarah | Sarah Johnson | 数据分析主管 | 数据分析、报表 |
| frank | Frank Morrison | CFO | 财务、定价 |
| tom | Tom Anderson | 法务顾问 | 合同、合规 |
| iris | Iris Chen | 投融资顾问 | 融资、BP |
| nathan | Nathan Lee | 战略规划师 | 战略、竞争分析 |
| oscar | Oscar Martinez | 运维工程师 | 监控、故障处理 |
| victor | Victor Hayes | 销售顾问 | 销售、客户拓展 |

### 外部专家 (20个)

| 领域 | 专家名称 | 说明 |
|------|----------|------|
| AI/ML | Dr. AI Expert | 机器学习、深度学习专家 |
| 区块链 | Blockchain Guru | Web3、加密货币专家 |
| 电商 | E-commerce Master | 电商运营专家 |
| SaaS | SaaS Strategist | SaaS商业模式专家 |
| 游戏 | Game Designer | 游戏设计专家 |
| ... | ... | 共20个垂直领域专家 |

---

## 项目阶段术语

| 术语 | 英文 | 时长 | 核心高管 |
|------|------|------|----------|
| 想法探索 | Ideation | 1-2周 | Mike, Nathan |
| 需求定义 | Definition | 1-2周 | Mike, Elena, David |
| 设计阶段 | Design | 1-3周 | Elena, David |
| 开发阶段 | Development | 4-12周 | David, James |
| 发布准备 | Pre-launch | 1-2周 | Kevin, Lisa, Marcus |
| 增长运营 | Growth | 持续 | Lisa, Sarah, Marcus |

---

## 决策级别术语

| 级别 | 英文 | 风险分数 | 处理方式 |
|------|------|----------|----------|
| L0 | Auto Execute | 0-20 | 自动执行，不通知 |
| L1 | Execute & Notify | 21-50 | 先执行，后通知 |
| L2 | Confirm First | 51-80 | 先确认，再执行 |
| L3 | Critical Review | 81-100 | 必须详细确认 |

---

## 技术术语

| 术语 | 说明 |
|------|------|
| 用户专属实例 | User-Exclusive Instance，每个用户独立的高管实例 |
| 命名空间隔离 | Namespace Isolation，Pinecone中用user_{userId}_{agentId}隔离 |
| 双层记忆 | Dual-Layer Memory，跨项目记忆+项目专属记忆 |
| 技能蒸馏 | Skill Distillation，从用户交互中匿名提取技能 |
| 智能调度 | Smart Scheduling，根据阶段和话题自动选择高管 |
| 自治系统 | Autonomous System，AI高管24小时自动运转 |

---

## 系统引擎术语

| 引擎 | 英文 | 功能 |
|------|------|------|
| 数据感知引擎 | Data Sensing Engine | 监控外部数据变化 |
| 工作调度引擎 | Work Scheduling Engine | 安排任务和会议 |
| 决策分级引擎 | Decision Classification Engine | 评估决策风险等级 |
| 执行追踪引擎 | Execution Tracking Engine | 追踪任务执行状态 |

---

## 订阅术语

| 套餐 | 英文 | 价格 | 讨论配额 |
|------|------|------|----------|
| 种子项目 | Seed | ¥99/月 | 150次/月 |
| 成长项目 | Growth | ¥299/月 | 600次/月 |
| 规模项目 | Scale | ¥699/月 | 2000次/月 |
| 企业项目 | Enterprise | ¥1499/月 | 无限 |

---

## 邀请系统术语

| 术语 | 英文 | 说明 |
|------|------|------|
| 排队 | Waitlist | 新用户申请后的等待队列 |
| 每日释放 | Daily Release | 每天限量发放的邀请码 |
| 用户邀请码 | User Invitation Code | 付费用户获得的可分享邀请码 |
| 普通邀请码 | Common Code | 14天有效期，跳过排队 |
| 稀有邀请码 | Rare Code | 30天有效期，含体验福利 |
| 传说邀请码 | Legendary Code | 60天有效期，含高级体验 |

---

## 记忆类型术语

| 类型 | 英文 | 说明 |
|------|------|------|
| 项目上下文 | Project Context | 项目基本信息和背景 |
| 项目决策 | Project Decision | 项目中做出的决策 |
| 用户偏好 | User Preference | 用户的沟通和决策偏好 |
| 用户反馈 | User Feedback | 用户对AI工作的反馈 |
| 讨论洞察 | Discussion Insight | 从讨论中提取的见解 |
| 讨论结论 | Discussion Conclusion | 讨论的最终结论 |
| 数据洞察 | Data Insight | 从数据分析中得出的洞察 |

---

## 技术栈缩写

| 缩写 | 全称 | 说明 |
|------|------|------|
| tRPC | TypeScript Remote Procedure Call | 类型安全的API框架 |
| SSE | Server-Sent Events | 服务器推送事件 |
| JWT | JSON Web Token | 认证令牌 |
| RBAC | Role-Based Access Control | 基于角色的访问控制 |
| CI/CD | Continuous Integration/Deployment | 持续集成部署 |

---

**相关文档**:
- [PRD](../core/01-PRD.md)
- [技术架构](../core/02-ARCHITECTURE.md)
