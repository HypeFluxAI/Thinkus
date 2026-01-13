# Thinkus v11 开发计划

> 基于 thinkus-final-v11 文档制定的完整开发路线图
>
> 日期: 2026-01-11

---

## 架构对比: 当前 vs v11

```yaml
当前实现:
  ✅ 基础用户认证 (NextAuth)
  ✅ 单Agent对话 (小T)
  ✅ 3位专家讨论 (Mike/Elena/David)
  ✅ Stripe支付
  ✅ 项目管理页面
  ✅ 设置页面
  ✅ 模板市场
  ✅ 用户专属高管实例 (v11 Week 1完成)
  ❌ 向量记忆系统 (Pinecone)
  ✅ 邀请码系统 (v11 Week 1完成)
  ✅ 智能调度系统 (配置完成，待集成)
  ❌ 决策分级系统
  ❌ 24小时自治运营

v11 新架构:
  🆕 18位用户专属高管 (每用户独立实例)
  🆕 双层记忆系统 (Pinecone向量库)
  🆕 邀请码饥饿营销系统
  🆕 智能调度 (按阶段配置高管)
  🆕 决策分级 (L0-L3)
  🆕 24小时自动运行
  🆕 6个项目阶段 (ideation→growth)
  🆕 订阅套餐 (seed/growth/scale/enterprise)
```

---

## 开发阶段规划

### P0 - MVP核心重构 (4周)

**目标**: 重构基础架构，实现邀请系统和用户专属高管

#### Week 1-2: 基础设施重构

```yaml
数据库重构:
  ✅ 更新 User 模型 (添加 invitedBy, invitationCode, settings)
  ✅ 创建 UserExecutive 模型 (18个高管实例)
  ✅ 更新 Project 模型 (添加 phase, phaseHistory, config)
  ✅ 创建 Waitlist 模型 (排队申请)
  ✅ 创建 InvitationCode 模型
  ✅ 创建 Notification 模型
  ✅ 添加所有必要索引

邀请系统:
  ✅ 排队申请页面 (/apply)
  ✅ 申请表单 (项目想法、角色、来源)
  ✅ 排队状态页面 (/waitlist/status)
  ✅ 邀请码验证逻辑
  ✅ 注册时强制邀请码

用户专属高管初始化:
  ✅ 注册时创建18个高管实例
  ✅ UserExecutive CRUD API (tRPC router)
  ✅ 高管配置文件 (18位)
  ✅ Notification tRPC router
```

#### Week 3-4: 核心功能

```yaml
项目阶段系统:
  ✅ 6阶段定义 (ideation→growth)
  ✅ 阶段转换逻辑
  ✅ 阶段历史记录
  ✅ 项目创建流程更新
  ✅ 阶段UI组件 (PhaseBadge, PhaseTimeline, PhaseSelector)

单高管对话 (重构):
  ✅ 基于用户专属实例的对话
  ✅ 高管人设注入
  ✅ 简单上下文记忆 (MongoDB)
  ✅ 讨论结论存储

仪表盘更新:
  ✅ 项目阶段显示
  ✅ 高管团队展示
  ✅ 项目讨论页面
  □ 排队/邀请状态
```

---

### P1 - 核心体验 (4周)

**目标**: 多高管讨论、智能调度、Pinecone记忆

#### Week 5-6: 多高管讨论

```yaml
智能调度系统:
  ✅ 阶段核心高管配置
  ✅ 话题分析 (Claude Haiku)
  ✅ 动态加入专家逻辑
  ✅ 复杂度评估

多Agent讨论:
  ✅ 多高管轮流发言
  ✅ 讨论编排器重构
  ✅ 讨论总结生成
  ✅ 结论和ActionItems提取
  ✅ 多头像UI显示

讨论API重构:
  ✅ /api/discussion/multi-agent 支持多高管
  ✅ 参与者动态选择
  ✅ 流式响应优化
```

#### Week 7-8: 记忆系统

```yaml
Pinecone集成:
  □ 账号设置和SDK配置
  □ 索引创建 (thinkus)
  □ 命名空间设计 (user_{userId}_{agentId})
  □ 向量存储服务
  □ 相似度检索服务

双层记忆:
  □ Layer 1: 用户偏好记忆 (跨项目)
  □ Layer 2: 项目记忆
  □ Memory模型和API
  □ 记忆写入触发 (讨论结束后)
  □ 记忆检索注入 (讨论开始时)

偏好学习:
  □ 从讨论中提取用户偏好
  □ 更新UserExecutive.learnedPreferences
  □ Prompt注入用户偏好
```

---

### P2 - 商业化 (3周)

**目标**: 订阅系统、用户邀请码

#### Week 9-10: 订阅系统

```yaml
套餐定义:
  □ seed (¥99/月) - 150次讨论, 0邀请码
  □ growth (¥299/月) - 600次讨论, 1邀请码
  □ scale (¥699/月) - 2000次讨论, 2邀请码
  □ enterprise (¥1499/月) - 无限, 3邀请码

Stripe订阅:
  □ 创建产品和价格
  □ 订阅Checkout流程
  □ Webhook处理 (subscription.*)
  □ 订阅状态同步
  □ 升级/降级/取消

用量追踪:
  □ 讨论次数计数
  □ 专家咨询计数
  □ 配额限制检查
  □ 用量展示页面
```

#### Week 11: 用户邀请码

```yaml
邀请码分配:
  □ 付费用户每月获得邀请码
  □ 邀请码生成逻辑
  □ 邀请码列表页面
  □ 邀请码状态管理

邀请追踪:
  □ 记录邀请关系
  □ 邀请统计
  □ 邀请奖励 (可选)
```

---

### P3 - 增强功能 (4周)

**目标**: 决策系统、自治运营、CEO Dashboard

#### Week 12-13: 决策系统

```yaml
决策引擎:
  □ Decision模型
  □ 决策分级逻辑 (L0-L3)
  □ 风险评估算法
  □ 确认请求生成
  □ 执行追踪

决策UI:
  □ 待确认决策列表
  □ 决策详情页
  □ 批准/拒绝/修改操作
  □ 执行状态展示

自动执行:
  □ L0决策自动执行
  □ L1决策通知+执行
  □ L2/L3等待确认
  □ 超时处理
```

#### Week 14-15: 自治运营

```yaml
定时任务:
  □ 每日站会 (09:00)
  □ 每日数据报告 (20:00)
  □ 每周复盘 (周一)
  □ node-cron配置

CEO Dashboard:
  □ 公司概览
  □ 待确认决策
  □ AI工作成果
  □ 通知中心
  □ 每日摘要

通知系统:
  □ 应用内通知
  □ 邮件通知
  □ 通知偏好设置
```

---

### P4 - 持续优化

```yaml
性能优化:
  □ 数据库查询优化
  □ 缓存策略 (Redis)
  □ 前端性能
  □ AI响应优化

成本优化:
  □ 模型选择策略 (Haiku/Sonnet/Opus)
  □ 缓存AI响应
  □ 减少重复调用

用户体验:
  □ 用户反馈收集
  □ A/B测试
  □ UI/UX改进
```

---

## 关键里程碑

| 周 | 里程碑 | 验收标准 |
|----|--------|----------|
| Week 4 | MVP可用 | 邀请注册、单高管对话、项目阶段 |
| Week 8 | 核心体验 | 多高管讨论、记忆系统、智能调度 |
| Week 11 | 商业化 | 订阅付费、用户邀请码 |
| Week 15 | 功能完整 | 决策系统、自治运营、Dashboard |

---

## 技术要点

```yaml
新增依赖:
  - @pinecone-database/pinecone  # 向量数据库
  - openai                        # Embedding API
  - node-cron                     # 定时任务
  - socket.io                     # 实时通信 (增强)

Pinecone配置:
  索引名: thinkus
  维度: 1536 (text-embedding-3-small)
  命名空间: user_{userId}_{agentId}

模型使用策略:
  调度/分类: Claude Haiku
  常规讨论: Claude Sonnet
  核心分析: Claude Opus
```

---

## 数据迁移计划

```yaml
迁移步骤:
  1. 备份现有数据
  2. 运行数据库迁移脚本
  3. 为现有用户创建18个高管实例
  4. 迁移现有项目到新的阶段系统
  5. 生成初始邀请码 (给现有用户)
```

---

## 立即开始: Week 1 任务

```yaml
Day 1-2:
  □ 创建新的数据模型文件
  □ 更新 lib/db/models
  □ 创建 UserExecutive schema
  □ 创建 Waitlist schema
  □ 创建 InvitationCode schema

Day 3-4:
  □ 创建排队申请页面 (/apply)
  □ 创建排队状态页面 (/waitlist/status)
  □ 邀请码验证API

Day 5:
  □ 更新注册流程 (强制邀请码)
  □ 用户注册时初始化18个高管
  □ 测试完整流程
```

---

**下一步**: 确认此计划后，开始 P0 Week 1 开发
