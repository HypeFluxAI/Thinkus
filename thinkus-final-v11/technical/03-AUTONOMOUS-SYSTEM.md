# Thinkus AI自治系统

> **版本: v11.0 | 日期: 2026-01-15**
>
> **让AI高管24小时自动运转，推进项目进度**

---

## 1. 系统概述

### 1.1 设计理念

```yaml
核心理念:
  - AI高管不只是"被动回答问题"
  - 而是"主动推进项目"
  - 用户是CEO，高管团队自动运转
  - 重要事项才请示用户

自治能力:
  - 自动召开例会
  - 自动发现问题
  - 自动生成交付物
  - 自动执行低风险决策
  - 自动追踪执行结果
```

### 1.2 四大引擎

```
┌─────────────────────────────────────────────────────────────────────────┐
│                                                                          │
│   Thinkus AI自治系统 - 四大引擎                                          │
│                                                                          │
│   ┌─────────────────────────────────────────────────────────────────┐   │
│   │                                                                  │   │
│   │   ┌─────────────┐       ┌─────────────┐                         │   │
│   │   │  数据感知   │  ───▶ │  工作调度   │                         │   │
│   │   │   Engine    │       │   Engine    │                         │   │
│   │   └─────────────┘       └──────┬──────┘                         │   │
│   │         │                      │                                │   │
│   │         │                      ▼                                │   │
│   │         │              ┌─────────────┐                          │   │
│   │         └─────────────▶│  决策分级   │                          │   │
│   │                        │   Engine    │                          │   │
│   │                        └──────┬──────┘                          │   │
│   │                               │                                 │   │
│   │                               ▼                                 │   │
│   │                        ┌─────────────┐                          │   │
│   │                        │  执行追踪   │                          │   │
│   │                        │   Engine    │                          │   │
│   │                        └─────────────┘                          │   │
│   │                                                                  │   │
│   └─────────────────────────────────────────────────────────────────┘   │
│                                                                          │
└─────────────────────────────────────────────────────────────────────────┘
```

---

## 2. 数据感知引擎

### 2.1 功能描述

```yaml
职责: 持续监控和分析与项目相关的数据变化

数据来源:
  - 用户反馈和行为
  - 外部API数据 (如果用户授权)
  - 竞品动态
  - 市场趋势
  - 项目内部指标

感知类型:
  - 异常检测: 数据突然变化
  - 趋势分析: 持续性变化
  - 机会识别: 发现新机会
  - 风险预警: 潜在问题
```

### 2.2 实现代码

```typescript
interface DataSensingEngine {
  // 注册数据源
  registerSource(source: DataSource): void
  
  // 执行感知
  sense(): Promise<SensingResult[]>
  
  // 分析变化
  analyzeChanges(data: any): Promise<ChangeAnalysis>
}

interface DataSource {
  id: string
  name: string
  type: 'api' | 'database' | 'webhook' | 'manual'
  config: Record<string, any>
  schedule?: string  // cron表达式
}

interface SensingResult {
  sourceId: string
  timestamp: Date
  type: 'anomaly' | 'trend' | 'opportunity' | 'risk'
  severity: 'low' | 'medium' | 'high' | 'critical'
  title: string
  description: string
  data: any
  suggestedAction?: string
}

// 实现示例
class DataSensingEngineImpl implements DataSensingEngine {
  private sources: Map<string, DataSource> = new Map()
  
  async sense(): Promise<SensingResult[]> {
    const results: SensingResult[] = []
    
    for (const [id, source] of this.sources) {
      try {
        const data = await this.fetchData(source)
        const analysis = await this.analyzeChanges(data)
        
        if (analysis.hasSignificantChange) {
          results.push({
            sourceId: id,
            timestamp: new Date(),
            type: analysis.changeType,
            severity: analysis.severity,
            title: analysis.title,
            description: analysis.description,
            data: analysis.data,
            suggestedAction: analysis.suggestedAction
          })
        }
      } catch (error) {
        console.error(`Failed to sense from ${id}:`, error)
      }
    }
    
    return results
  }
  
  async analyzeChanges(data: any): Promise<ChangeAnalysis> {
    // 使用Claude Haiku快速分析
    const response = await claude.messages.create({
      model: 'claude-3-haiku-20240307',
      max_tokens: 500,
      messages: [{
        role: 'user',
        content: `分析以下数据变化，判断是否有显著变化需要关注：
        ${JSON.stringify(data)}
        
        返回JSON格式：
        {
          "hasSignificantChange": boolean,
          "changeType": "anomaly" | "trend" | "opportunity" | "risk",
          "severity": "low" | "medium" | "high" | "critical",
          "title": "变化标题",
          "description": "变化描述",
          "suggestedAction": "建议操作"
        }`
      }]
    })
    
    return JSON.parse(response.content[0].text)
  }
}
```

---

## 3. 工作调度引擎

### 3.1 功能描述

```yaml
职责: 智能安排AI高管的工作任务

调度类型:
  - 定时任务: 每日例会、周报等
  - 事件触发: 数据变化触发讨论
  - 阶段任务: 根据项目阶段自动安排
  - 用户请求: 响应用户发起的讨论

调度策略:
  - 根据阶段选择核心高管
  - 根据话题动态加入专家
  - 控制参与人数 (成本优化)
  - 避免重复讨论
```

### 3.2 实现代码

```typescript
interface WorkSchedulingEngine {
  // 调度讨论
  scheduleDiscussion(params: ScheduleParams): Promise<ScheduledTask>
  
  // 获取待执行任务
  getPendingTasks(projectId: string): Promise<ScheduledTask[]>
  
  // 执行任务
  executeTask(taskId: string): Promise<ExecutionResult>
}

interface ScheduleParams {
  projectId: string
  trigger: 'scheduled' | 'event' | 'user'
  topic: string
  context?: string
  priority?: 'low' | 'normal' | 'high' | 'urgent'
  scheduledFor?: Date
}

interface ScheduledTask {
  id: string
  projectId: string
  type: 'discussion' | 'report' | 'review'
  topic: string
  participants: AgentId[]
  scheduledFor: Date
  status: 'pending' | 'running' | 'completed' | 'failed'
}

// 智能调度实现
class SmartScheduler {
  // 阶段核心高管配置
  private phaseAgents: Record<ProjectPhase, AgentId[]> = {
    ideation: ['mike', 'nathan'],
    definition: ['mike', 'elena', 'david'],
    design: ['elena', 'david'],
    development: ['david', 'james'],
    prelaunch: ['kevin', 'lisa', 'marcus'],
    growth: ['lisa', 'sarah', 'marcus']
  }
  
  // 话题专家映射
  private topicExperts: Record<string, AgentId[]> = {
    pricing: ['frank'],
    legal: ['tom'],
    security: ['alex'],
    data: ['sarah'],
    growth: ['lisa'],
    design: ['elena', 'chloe'],
    tech: ['david', 'kevin'],
    marketing: ['marcus']
  }
  
  async selectParticipants(params: {
    projectId: string
    topic: string
  }): Promise<AgentId[]> {
    const project = await this.getProject(params.projectId)
    
    // 1. 获取阶段核心高管
    const coreAgents = this.phaseAgents[project.phase]
    
    // 2. 分析话题关键词
    const keywords = await this.analyzeTopicKeywords(params.topic)
    
    // 3. 添加话题相关专家
    const topicAgents: AgentId[] = []
    for (const keyword of keywords) {
      const experts = this.topicExperts[keyword] || []
      topicAgents.push(...experts)
    }
    
    // 4. 合并去重
    const allAgents = [...new Set([...coreAgents, ...topicAgents])]
    
    // 5. 限制人数 (成本控制)
    const complexity = await this.assessComplexity(params.topic)
    const maxAgents = complexity === 'simple' ? 3 : 
                      complexity === 'medium' ? 5 : 8
    
    return allAgents.slice(0, maxAgents)
  }
  
  private async analyzeTopicKeywords(topic: string): Promise<string[]> {
    // 使用Haiku快速分析
    const response = await claude.messages.create({
      model: 'claude-3-haiku-20240307',
      max_tokens: 100,
      messages: [{
        role: 'user',
        content: `从以下话题中提取关键领域标签，只返回JSON数组：
        话题：${topic}
        可选标签：pricing, legal, security, data, growth, design, tech, marketing
        返回格式：["tag1", "tag2"]`
      }]
    })
    
    return JSON.parse(response.content[0].text)
  }
}
```

---

## 4. 决策分级引擎

### 4.1 功能描述

```yaml
职责: 评估决策风险，决定处理方式

决策级别:
  L0 (0-20分): 自动执行，不通知
    例：Bug修复、文案微调、性能优化
    
  L1 (21-50分): 先执行后通知
    例：小功能添加、营销内容发布
    
  L2 (51-80分): 先确认再执行
    例：核心功能修改、定价调整
    
  L3 (81-100分): 必须详细确认
    例：安全相关、法律相关、大额支出

风险因素:
  - 影响范围 (用户数、功能范围)
  - 可逆性 (能否回滚)
  - 资金影响 (涉及金额)
  - 安全影响 (数据、隐私)
  - 法律风险 (合规、合同)
```

### 4.2 实现代码

```typescript
interface DecisionClassificationEngine {
  // 评估决策
  classify(decision: DecisionInput): Promise<ClassificationResult>
  
  // 创建决策请求
  createDecisionRequest(params: {
    projectId: string
    decision: DecisionInput
    classification: ClassificationResult
  }): Promise<Decision>
}

interface DecisionInput {
  title: string
  description: string
  category: DecisionCategory
  proposedAction: {
    type: string
    params?: Record<string, any>
  }
}

interface ClassificationResult {
  level: DecisionLevel
  score: number
  factors: RiskFactor[]
  recommendation: 'auto_execute' | 'execute_notify' | 'confirm_first' | 'critical_review'
}

interface RiskFactor {
  name: string
  score: number  // 0-20
  reason: string
}

// 决策分级实现
class DecisionClassifier {
  async classify(decision: DecisionInput): Promise<ClassificationResult> {
    // 使用Claude Sonnet进行风险评估
    const response = await claude.messages.create({
      model: 'claude-3-5-sonnet-20241022',
      max_tokens: 1000,
      messages: [{
        role: 'user',
        content: `评估以下决策的风险等级：

决策标题：${decision.title}
决策描述：${decision.description}
决策类别：${decision.category}
提议操作：${JSON.stringify(decision.proposedAction)}

请从以下5个维度评估风险（每个维度0-20分）：
1. 影响范围：影响多少用户或功能
2. 可逆性：能否轻松回滚
3. 资金影响：涉及的金额大小
4. 安全影响：对数据和隐私的影响
5. 法律风险：合规和法律风险

返回JSON格式：
{
  "factors": [
    {"name": "影响范围", "score": 0-20, "reason": "..."},
    {"name": "可逆性", "score": 0-20, "reason": "..."},
    {"name": "资金影响", "score": 0-20, "reason": "..."},
    {"name": "安全影响", "score": 0-20, "reason": "..."},
    {"name": "法律风险", "score": 0-20, "reason": "..."}
  ],
  "totalScore": 0-100,
  "level": "L0" | "L1" | "L2" | "L3",
  "recommendation": "auto_execute" | "execute_notify" | "confirm_first" | "critical_review"
}`
      }]
    })
    
    const result = JSON.parse(response.content[0].text)
    
    return {
      level: this.scoreToLevel(result.totalScore),
      score: result.totalScore,
      factors: result.factors,
      recommendation: result.recommendation
    }
  }
  
  private scoreToLevel(score: number): DecisionLevel {
    if (score <= 20) return DecisionLevel.L0_AUTO
    if (score <= 50) return DecisionLevel.L1_NOTIFY
    if (score <= 80) return DecisionLevel.L2_CONFIRM
    return DecisionLevel.L3_CRITICAL
  }
}
```

---

## 5. 执行追踪引擎

### 5.1 功能描述

```yaml
职责: 追踪决策执行状态，处理执行结果

追踪内容:
  - 执行状态 (待执行/执行中/已完成/失败)
  - 执行结果 (成功/失败/部分成功)
  - 执行日志 (详细操作记录)
  - 回滚能力 (是否可以撤销)

后续处理:
  - 成功：更新项目状态，通知用户
  - 失败：尝试重试或通知处理
  - 需回滚：执行回滚操作
```

### 5.2 实现代码

```typescript
interface ExecutionTrackingEngine {
  // 开始执行
  startExecution(decisionId: string): Promise<ExecutionRecord>
  
  // 更新状态
  updateStatus(executionId: string, status: ExecutionStatus): Promise<void>
  
  // 完成执行
  completeExecution(executionId: string, result: ExecutionResult): Promise<void>
  
  // 回滚执行
  rollback(executionId: string): Promise<RollbackResult>
}

interface ExecutionRecord {
  id: string
  decisionId: string
  startedAt: Date
  status: ExecutionStatus
  logs: ExecutionLog[]
}

type ExecutionStatus = 'pending' | 'running' | 'completed' | 'failed' | 'rolled_back'

interface ExecutionLog {
  timestamp: Date
  level: 'info' | 'warning' | 'error'
  message: string
  data?: any
}

// 执行追踪实现
class ExecutionTracker {
  async execute(decision: Decision): Promise<ExecutionResult> {
    const execution = await this.startExecution(decision.id)
    
    try {
      // 记录开始
      await this.log(execution.id, 'info', '开始执行决策', { decision })
      
      // 根据决策类型执行不同操作
      const result = await this.performAction(decision.recommendedAction)
      
      // 记录成功
      await this.log(execution.id, 'info', '执行成功', { result })
      await this.completeExecution(execution.id, {
        success: true,
        result,
        rollbackAvailable: this.isRollbackable(decision.recommendedAction)
      })
      
      // 发送通知 (如果需要)
      if (decision.level >= DecisionLevel.L1_NOTIFY) {
        await this.notifyUser(decision, result)
      }
      
      return { success: true, result }
      
    } catch (error) {
      // 记录失败
      await this.log(execution.id, 'error', '执行失败', { error: error.message })
      await this.updateStatus(execution.id, 'failed')
      
      // 通知用户
      await this.notifyUser(decision, { error: error.message }, true)
      
      return { success: false, error: error.message }
    }
  }
  
  async rollback(executionId: string): Promise<RollbackResult> {
    const execution = await this.getExecution(executionId)
    const decision = await this.getDecision(execution.decisionId)
    
    if (!execution.result?.rollbackAvailable) {
      return { success: false, reason: '该操作不支持回滚' }
    }
    
    try {
      // 执行回滚逻辑
      await this.performRollback(decision.recommendedAction, execution.result)
      
      await this.updateStatus(executionId, 'rolled_back')
      await this.log(executionId, 'info', '回滚成功')
      
      return { success: true }
    } catch (error) {
      await this.log(executionId, 'error', '回滚失败', { error: error.message })
      return { success: false, reason: error.message }
    }
  }
}
```

---

## 6. 定时任务配置

### 6.1 Cron任务

```typescript
// 定时任务配置
const cronJobs = {
  // 每日站会 (工作日早上9点)
  dailyStandup: {
    schedule: '0 9 * * 1-5',
    handler: async () => {
      const activeProjects = await getActiveProjects()
      for (const project of activeProjects) {
        await schedulingEngine.scheduleDiscussion({
          projectId: project.id,
          trigger: 'scheduled',
          topic: '每日站会：回顾进展，规划今日任务',
          priority: 'normal'
        })
      }
    }
  },
  
  // 每日数据报告 (晚上8点)
  dailyDataReport: {
    schedule: '0 20 * * *',
    handler: async () => {
      const activeProjects = await getActiveProjects()
      for (const project of activeProjects) {
        if (project.subscription.tier !== 'seed') {
          await dataReportGenerator.generateDaily(project.id)
        }
      }
    }
  },
  
  // 每周复盘 (周一早上10点)
  weeklyReview: {
    schedule: '0 10 * * 1',
    handler: async () => {
      const activeProjects = await getActiveProjects()
      for (const project of activeProjects) {
        await schedulingEngine.scheduleDiscussion({
          projectId: project.id,
          trigger: 'scheduled',
          topic: '每周复盘：上周总结，本周规划',
          priority: 'high'
        })
      }
    }
  },
  
  // 邀请码每日释放 (凌晨2点)
  dailyInvitationRelease: {
    schedule: '0 2 * * *',
    handler: async () => {
      await invitationService.runDailyRelease()
    }
  },
  
  // 过期邀请码清理 (凌晨3点)
  expiredCodeCleanup: {
    schedule: '0 3 * * *',
    handler: async () => {
      await invitationService.cleanupExpiredCodes()
    }
  }
}
```

### 6.2 事件触发器

```typescript
// 事件触发配置
const eventTriggers = {
  // 数据异常触发
  onDataAnomaly: async (event: DataAnomalyEvent) => {
    const { projectId, anomaly } = event
    
    if (anomaly.severity >= 'high') {
      await schedulingEngine.scheduleDiscussion({
        projectId,
        trigger: 'event',
        topic: `数据异常：${anomaly.title}`,
        context: anomaly.description,
        priority: 'urgent'
      })
    }
  },
  
  // 用户反馈触发
  onUserFeedback: async (event: UserFeedbackEvent) => {
    const { projectId, feedback } = event
    
    if (feedback.sentiment === 'negative' || feedback.priority === 'high') {
      await schedulingEngine.scheduleDiscussion({
        projectId,
        trigger: 'event',
        topic: `用户反馈处理：${feedback.title}`,
        context: feedback.content,
        priority: 'high'
      })
    }
  },
  
  // 阶段变更触发
  onPhaseChange: async (event: PhaseChangeEvent) => {
    const { projectId, fromPhase, toPhase } = event
    
    await schedulingEngine.scheduleDiscussion({
      projectId,
      trigger: 'event',
      topic: `阶段转换：从${fromPhase}到${toPhase}`,
      priority: 'high'
    })
  }
}
```

---

## 7. 总结

```
┌─────────────────────────────────────────────────────────────────────────┐
│                                                                          │
│   Thinkus AI自治系统                                                     │
│                                                                          │
│   四大引擎:                                                              │
│   ══════════                                                             │
│   1. 数据感知: 监控数据变化，发现异常和机会                              │
│   2. 工作调度: 智能安排讨论，选择合适的高管                              │
│   3. 决策分级: 评估风险，决定自动执行还是请示用户                        │
│   4. 执行追踪: 追踪执行状态，支持回滚                                    │
│                                                                          │
│   自治能力:                                                              │
│   ══════════                                                             │
│   • 每日自动召开站会                                                     │
│   • 自动生成数据报告                                                     │
│   • 自动响应数据异常                                                     │
│   • 自动执行低风险决策                                                   │
│   • 重要决策才请示用户                                                   │
│                                                                          │
│   用户体验:                                                              │
│   ══════════                                                             │
│   • 用户是CEO，不需要事事亲力亲为                                        │
│   • 高管团队自动运转，推进项目                                           │
│   • 只有重要事项才打扰用户                                               │
│   • 所有操作都有记录，可追溯                                             │
│                                                                          │
└─────────────────────────────────────────────────────────────────────────┘
```

---

**相关文档**:
- [PRD](../core/01-PRD.md)
- [技术架构](../core/02-ARCHITECTURE.md)
- [项目生命周期](../flows/01-PROJECT-LIFECYCLE.md)
