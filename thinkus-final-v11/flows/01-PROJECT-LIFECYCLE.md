# Thinkus 项目生命周期与智能调度

> **版本: v11.0 | 日期: 2026-01-15**
>
> **系统自动分析项目阶段，智能调度高管，24小时自动运行**

---

## 1. 核心理念

```yaml
智能调度原则:
  
  1. 按需调度:
     - 不同阶段需要不同专业能力
     - 系统自动识别项目当前阶段
     - 自动选择最相关的高管参与
  
  2. 成本优化:
     - 不是所有讨论都需要18人参与
     - 简单问题少派人，复杂问题多派人
     - 用轻量模型做调度，重量模型做分析
  
  3. 24小时自动运行:
     - 高管团队可自主发起讨论
     - 自动推进项目进度
     - 遇到重要决策才通知用户
  
  4. 阶段感知:
     - 系统持续分析项目状态
     - 自动识别阶段转换
     - 动态调整团队配置
```

---

## 2. 项目生命周期阶段

### 2.1 阶段总览

```
┌─────────────────────────────────────────────────────────────────────────┐
│                                                                          │
│   ┌─────────┐   ┌─────────┐   ┌─────────┐   ┌─────────┐   ┌─────────┐  │
│   │  想法   │ → │  需求   │ → │  设计   │ → │  开发   │ → │  发布   │  │
│   │  探索   │   │  定义   │   │  阶段   │   │  阶段   │   │  准备   │  │
│   └────┬────┘   └────┬────┘   └────┬────┘   └────┬────┘   └────┬────┘  │
│        │             │             │             │             │         │
│      1-2周         1-2周         1-3周         4-12周        1-2周       │
│        │             │             │             │             │         │
│        │             │             │             │             │         │
│   Mike+Nathan   Mike+Elena   Elena+David   David+James   Kevin+Lisa    │
│                 +David                                    +Marcus       │
│                                                                          │
│                                        │                                │
│                                        ▼                                │
│                                 ┌─────────────┐                         │
│                                 │  增长运营   │                         │
│                                 │ Lisa+Sarah  │                         │
│                                 │  +Marcus    │                         │
│                                 └─────────────┘                         │
│                                      持续                               │
│                                                                          │
└─────────────────────────────────────────────────────────────────────────┘
```

### 2.2 各阶段详情

#### 阶段1: 想法探索 (Ideation)

```yaml
目标: 明确要做什么、为谁做、解决什么问题
时长: 1-2周

核心高管 (必须参与):
  - Mike Chen (产品) - 需求梳理、价值主张
  - Nathan Lee (战略) - 市场机会、竞争分析

按需高管 (根据讨论内容加入):
  - Sarah Johnson (数据) - 如果讨论市场数据
  - Marcus Thompson (市场) - 如果讨论目标用户
  - Frank Morrison (财务) - 如果讨论商业模式

典型产出:
  - 项目定义文档
  - 目标用户画像
  - 价值主张画布
  - 竞品分析报告

成本预估: 2-3位高管 × 5-10次讨论/天 = ¥50-150/天
```

#### 阶段2: 需求定义 (Definition)

```yaml
目标: 明确做什么功能、优先级、MVP范围
时长: 1-2周

核心高管 (必须参与):
  - Mike Chen (产品) - PRD、用户故事、优先级
  - Elena Rodriguez (设计) - 用户流程、交互设计
  - David Kim (技术) - 技术可行性、架构评估

按需高管:
  - Sarah Johnson (数据) - 数据需求、指标定义
  - James Wilson (QA) - 测试策略、验收标准
  - Alex Turner (安全) - 安全需求、合规要求

典型产出:
  - PRD文档
  - 用户故事地图
  - 技术方案评估
  - MVP功能清单

成本预估: 3-4位高管 × 10-15次讨论/天 = ¥150-300/天
```

#### 阶段3: 设计阶段 (Design)

```yaml
目标: 完成UI设计、技术架构、开发准备
时长: 1-3周

核心高管 (必须参与):
  - Elena Rodriguez (设计) - UI设计、设计系统
  - David Kim (技术) - 架构设计、技术选型

按需高管:
  - Mike Chen (产品) - 设计评审、需求确认
  - Kevin O'Brien (DevOps) - 部署架构、CI/CD
  - Alex Turner (安全) - 安全架构审查

典型产出:
  - UI设计稿
  - 设计规范
  - 技术架构文档
  - 数据库设计
  - API设计

成本预估: 2-3位高管 × 8-12次讨论/天 = ¥80-180/天
```

#### 阶段4: 开发阶段 (Development)

```yaml
目标: 完成MVP开发、测试、修复
时长: 4-12周

核心高管 (必须参与):
  - David Kim (技术) - 技术指导、代码审查、问题解决
  - James Wilson (QA) - 测试执行、Bug跟踪

按需高管:
  - Mike Chen (产品) - 需求澄清、优先级调整
  - Elena Rodriguez (设计) - 设计细节确认
  - Kevin O'Brien (DevOps) - 部署问题、环境配置
  - Alex Turner (安全) - 安全测试、漏洞修复

典型活动:
  - 每日站会 (自动)
  - 技术问题讨论
  - Bug分析与修复建议
  - 进度追踪

成本预估: 2-3位高管 × 5-8次讨论/天 = ¥50-120/天
(开发期相对低频，主要是问题解答和站会)
```

#### 阶段5: 发布准备 (Pre-launch)

```yaml
目标: 准备上线、制定发布策略
时长: 1-2周

核心高管 (必须参与):
  - Kevin O'Brien (DevOps) - 部署计划、监控配置
  - Lisa Wang (增长) - 发布策略、获客准备
  - Marcus Thompson (市场) - 发布内容、PR准备

按需高管:
  - Mike Chen (产品) - 发布检查清单
  - James Wilson (QA) - 上线前测试
  - Nina Patel (客服) - FAQ、客服准备
  - Tom Anderson (法务) - 合规文件、用户协议

典型产出:
  - 部署完成
  - 监控体系
  - 发布公告
  - 客服FAQ
  - 合规文件

成本预估: 4-5位高管 × 10-15次讨论/天 = ¥200-400/天
```

#### 阶段6: 增长运营 (Growth)

```yaml
目标: 获取用户、优化产品、持续增长
时长: 持续

核心高管 (必须参与):
  - Lisa Wang (增长) - 增长策略、获客优化
  - Sarah Johnson (数据) - 数据分析、指标追踪
  - Marcus Thompson (运营) - 用户运营、活动策划

按需高管:
  - Mike Chen (产品) - 功能迭代、需求优化
  - Nina Patel (客服) - 用户反馈、满意度
  - Frank Morrison (财务) - 收入分析、成本优化
  - David Kim (技术) - 性能优化、技术迭代

持续服务:
  - 每日数据报告
  - 每周增长复盘
  - 每月深度分析
  - 持续Bug修复

成本预估: 3-4位高管 × 8-12次讨论/天 = ¥120-240/天
```

---

## 3. 智能调度系统

### 3.1 调度架构

```typescript
interface SchedulingEngine {
  // 根据项目阶段获取核心高管
  getCoreAgents(phase: ProjectPhase): AgentId[]
  
  // 根据话题分析需要哪些专家
  analyzeTopicExperts(topic: string): Promise<AgentId[]>
  
  // 根据复杂度调整参与人数
  adjustParticipants(
    agents: AgentId[],
    complexity: 'simple' | 'medium' | 'complex'
  ): AgentId[]
  
  // 执行调度
  schedule(params: {
    projectId: string
    topic: string
    trigger: 'user' | 'scheduled' | 'event'
  }): Promise<AgentId[]>
}
```

### 3.2 调度规则

```yaml
阶段核心高管配置:
  ideation: ['mike', 'nathan']
  definition: ['mike', 'elena', 'david']
  design: ['elena', 'david']
  development: ['david', 'james']
  prelaunch: ['kevin', 'lisa', 'marcus']
  growth: ['lisa', 'sarah', 'marcus']

话题专家映射:
  pricing: ['frank']           # 定价讨论加入CFO
  legal: ['tom']               # 法律问题加入法务
  security: ['alex']           # 安全问题加入安全专家
  data: ['sarah']              # 数据问题加入数据分析
  growth: ['lisa']             # 增长问题加入增长专家
  design: ['elena', 'chloe']   # 设计问题加入设计师
  tech: ['david', 'kevin']     # 技术问题加入技术专家
  marketing: ['marcus']        # 营销问题加入CMO

复杂度调整:
  simple: max 3 agents
  medium: max 5 agents
  complex: max 8 agents
```

### 3.3 调度示例

```typescript
// 示例: 用户在需求定义阶段问"如何设计定价策略"
async function exampleSchedule() {
  const project = await getProject('project_123')
  // project.phase = 'definition'
  
  // 1. 获取阶段核心高管
  const coreAgents = ['mike', 'elena', 'david']
  
  // 2. 分析话题，识别关键词"定价"
  const topicAgents = ['frank']  // 加入CFO
  
  // 3. 评估复杂度: 定价策略 = medium
  const maxAgents = 5
  
  // 4. 合并去重
  const participants = ['mike', 'elena', 'david', 'frank']
  
  // 5. 开始讨论
  return startDiscussion({
    projectId: 'project_123',
    topic: '如何设计定价策略',
    participants
  })
}
```

---

## 4. 24小时自动运行

### 4.1 定时任务

```yaml
每日任务:

每日站会 (09:00):
  触发: 所有活跃项目
  参与: 阶段核心高管
  内容:
    - 回顾昨日进展
    - 规划今日任务
    - 识别阻塞问题
  输出: 站会纪要

每日数据报告 (20:00):
  触发: 所有活跃项目
  参与: Sarah (数据)
  内容:
    - 关键指标变化
    - 异常预警
  输出: 数据报告

每周复盘 (周一 10:00):
  触发: 所有活跃项目
  参与: 全体相关高管
  内容:
    - 周目标完成度
    - 下周规划
  输出: 周报
```

### 4.2 事件触发

```yaml
异常检测:
  - 服务器异常 → Kevin (DevOps) 自动处理
  - 数据异常 → Sarah (数据) 自动分析
  - 安全告警 → Alex (安全) 自动响应

阶段转换:
  - 检测到阶段可能完成 → 自动召开评审会议
  - 评审通过 → 自动准备下阶段工作

用户反馈:
  - 自动收集和分类
  - 重要反馈通知相关高管
  - 自动回复常见问题
```

### 4.3 用户介入时机

```yaml
需要用户介入:
  - L2/L3级决策需要确认
  - 阶段转换评审
  - 重大方向决策
  - 对AI工作有反馈

不需要用户介入:
  - L0/L1级日常工作
  - 例行会议和报告
  - 自动优化和修复
```

---

## 5. 成本控制

### 5.1 模型选择策略

```yaml
用Claude Haiku (最便宜):
  - 调度决策 (选择哪些高管)
  - 简单分类 (话题分类)
  - 格式化输出

用Claude Sonnet (中等):
  - 常规讨论
  - 代码生成
  - 文档撰写

用Claude Opus (最贵):
  - 核心分析决策
  - 复杂架构设计
  - 重要文档审核
```

### 5.2 日预算限制

```yaml
套餐日预算:
  seed: ¥50/天      # ¥99/月
  growth: ¥150/天   # ¥299/月
  scale: ¥350/天    # ¥699/月
  enterprise: ¥1000/天  # ¥1499/月

超预算策略:
  - 减少自动运行频率
  - 降低参与高管数量
  - 使用更便宜的模型
  - 高优先级任务仍然执行
```

### 5.3 成本追踪

```typescript
interface UsageTracking {
  // 追踪每次讨论成本
  trackDiscussion(params: {
    projectId: string
    discussionId: string
    participants: AgentId[]
    model: 'opus' | 'sonnet' | 'haiku'
    inputTokens: number
    outputTokens: number
  }): Promise<void>
  
  // 获取今日已用预算
  getTodayUsage(userId: string): Promise<{
    used: number
    limit: number
    remaining: number
  }>
  
  // 获取月度用量报告
  getMonthlyReport(userId: string): Promise<UsageReport>
}
```

---

## 6. 总结

```
┌─────────────────────────────────────────────────────────────────────────┐
│                                                                          │
│   Thinkus 智能调度系统                                                   │
│                                                                          │
│   核心能力:                                                              │
│   ══════════                                                             │
│   • 自动识别项目阶段                                                     │
│   • 根据阶段配置核心高管                                                 │
│   • 根据话题动态加入按需高管                                             │
│   • 24小时自动运行 (定时+事件触发)                                       │
│   • 成本可控 (日预算、配额限制)                                          │
│                                                                          │
│   阶段与高管:                                                            │
│   ══════════                                                             │
│   想法探索: Mike(产品) + Nathan(战略)                                   │
│   需求定义: Mike(产品) + Elena(设计) + David(技术)                      │
│   设计阶段: Elena(设计) + David(技术)                                   │
│   开发阶段: David(技术) + James(QA)                                     │
│   发布准备: Kevin(DevOps) + Lisa(增长) + Marcus(市场)                   │
│   增长运营: Lisa(增长) + Sarah(数据) + Marcus(运营)                     │
│                                                                          │
│   用户体验:                                                              │
│   ══════════                                                             │
│   • 用户只需描述项目，系统自动调配                                       │
│   • 高管团队24小时自动运转                                               │
│   • 重要事项才通知用户                                                   │
│   • 成本透明可追踪                                                       │
│                                                                          │
└─────────────────────────────────────────────────────────────────────────┘
```

---

**相关文档**:
- [PRD](../core/01-PRD.md)
- [技术架构](../core/02-ARCHITECTURE.md)
- [AI自治系统](../technical/03-AUTONOMOUS-SYSTEM.md)
