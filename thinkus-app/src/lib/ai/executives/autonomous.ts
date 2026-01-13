/**
 * AI自治系统 (v11)
 *
 * 四大引擎：
 * 1. 数据感知引擎 - 监控数据变化，发现异常和机会
 * 2. 工作调度引擎 - 智能安排讨论，选择参与高管
 * 3. 决策分级引擎 - 评估风险等级，决定是否需要用户确认
 * 4. 执行追踪引擎 - 追踪执行状态，处理失败情况
 */

import {
  AgentId,
  AI_EXECUTIVES,
  DecisionLevel,
  DecisionClassification,
  RiskFactor,
  ProjectPhase,
  scoreToDecisionLevel,
  selectParticipants,
  getAgentNamespace,
  RISK_FACTOR_NAMES,
} from '@/lib/config/ai-executives'
import {
  getDataSensingPrompt,
  getTopicAnalysisPrompt,
  getComplexityAssessmentPrompt,
  getDecisionClassificationPrompt,
  getExecutionAnalysisPrompt,
  getDiscussionOrchestratorPrompt,
  getAgentResponsePrompt,
  getDiscussionSummaryPrompt,
  getDailyStandupPrompt,
  getWeeklyReviewPrompt,
  buildAgentPrompt,
} from './prompts'

// ============================================================================
// 类型定义
// ============================================================================

export interface DataChangeEvent {
  sourceId: string
  sourceName: string
  previousData: any
  currentData: any
  changeDescription: string
  timestamp: Date
}

export interface DataSensingResult {
  hasSignificantChange: boolean
  changeType: 'anomaly' | 'trend' | 'opportunity' | 'risk'
  severity: 'low' | 'medium' | 'high' | 'critical'
  title: string
  description: string
  suggestedAction: string
  affectedAreas: string[]
  urgency: 'immediate' | 'soon' | 'later'
}

export interface SchedulingRequest {
  topic: string
  projectId: string
  projectPhase: ProjectPhase
  priority?: 'low' | 'medium' | 'high' | 'urgent'
  requestedBy?: string
}

export interface SchedulingResult {
  participants: AgentId[]
  estimatedRounds: number
  complexity: 'simple' | 'medium' | 'complex'
  priority: 'low' | 'medium' | 'high' | 'urgent'
  topicTags: string[]
  reason: string
}

export interface DecisionRequest {
  title: string
  description: string
  category: string
  proposedAction: string
  context?: {
    projectId?: string
    affectedUsers?: number
    financialImpact?: number
    isReversible?: boolean
  }
}

export interface ExecutionTask {
  id: string
  decisionTitle: string
  action: string
  status: 'pending' | 'running' | 'success' | 'failure' | 'partial'
  logs: string[]
  error?: string
  startedAt?: Date
  completedAt?: Date
}

export interface ExecutionAnalysisResult {
  success: boolean
  summary: string
  issues: string[]
  nextSteps: string[]
  needsRollback: boolean
  rollbackReason?: string
  userNotificationNeeded: boolean
  notificationContent?: string
}

export interface DiscussionMessage {
  agentId: AgentId
  content: string
  timestamp: Date
  role?: 'user' | 'agent'
}

export interface DiscussionSession {
  id: string
  topic: string
  projectId: string
  participants: AgentId[]
  messages: DiscussionMessage[]
  status: 'active' | 'completed' | 'paused'
  currentRound: number
  startedAt: Date
  completedAt?: Date
}

// ============================================================================
// 引擎基类
// ============================================================================

export interface AIClient {
  generateCompletion(prompt: string, systemPrompt?: string): Promise<string>
}

/**
 * 自治系统引擎基类
 */
abstract class AutonomousEngine {
  protected aiClient: AIClient
  protected userId: string

  constructor(aiClient: AIClient, userId: string) {
    this.aiClient = aiClient
    this.userId = userId
  }

  /**
   * 解析JSON响应
   */
  protected parseJsonResponse<T>(response: string): T {
    // 提取JSON块
    const jsonMatch = response.match(/```json\s*([\s\S]*?)\s*```/)
    if (jsonMatch) {
      return JSON.parse(jsonMatch[1])
    }
    // 尝试直接解析
    return JSON.parse(response)
  }
}

// ============================================================================
// 1. 数据感知引擎
// ============================================================================

/**
 * 数据感知引擎
 * 监控数据变化，发现异常、趋势、机会和风险
 */
export class DataSensingEngine extends AutonomousEngine {
  /**
   * 分析数据变化
   */
  async analyzeChange(event: DataChangeEvent): Promise<DataSensingResult> {
    const prompt = getDataSensingPrompt({
      sourceId: event.sourceId,
      sourceName: event.sourceName,
      previousData: event.previousData,
      currentData: event.currentData,
      changeDescription: event.changeDescription,
    })

    const response = await this.aiClient.generateCompletion(prompt)
    return this.parseJsonResponse<DataSensingResult>(response)
  }

  /**
   * 批量分析多个数据变化
   */
  async analyzeChanges(events: DataChangeEvent[]): Promise<DataSensingResult[]> {
    const results: DataSensingResult[] = []
    for (const event of events) {
      const result = await this.analyzeChange(event)
      results.push(result)
    }
    return results
  }

  /**
   * 获取需要关注的变化（过滤低优先级）
   */
  async getSignificantChanges(events: DataChangeEvent[]): Promise<{
    event: DataChangeEvent
    analysis: DataSensingResult
  }[]> {
    const results = await this.analyzeChanges(events)
    return events
      .map((event, i) => ({ event, analysis: results[i] }))
      .filter(({ analysis }) => analysis.hasSignificantChange)
      .sort((a, b) => {
        const severityOrder = { critical: 0, high: 1, medium: 2, low: 3 }
        return severityOrder[a.analysis.severity] - severityOrder[b.analysis.severity]
      })
  }
}

// ============================================================================
// 2. 工作调度引擎
// ============================================================================

/**
 * 工作调度引擎
 * 智能选择参与讨论的高管，评估讨论复杂度
 */
export class WorkSchedulingEngine extends AutonomousEngine {
  /**
   * 分析话题关键词
   */
  async analyzeTopicTags(topic: string): Promise<string[]> {
    const prompt = getTopicAnalysisPrompt(topic)
    const response = await this.aiClient.generateCompletion(prompt)

    try {
      return JSON.parse(response)
    } catch {
      // 尝试提取数组 (使用 [\s\S] 代替 . 来匹配换行符)
      const match = response.match(/\[[\s\S]*\]/)
      if (match) {
        return JSON.parse(match[0])
      }
      return []
    }
  }

  /**
   * 评估讨论复杂度
   */
  async assessComplexity(topic: string): Promise<{
    complexity: 'simple' | 'medium' | 'complex'
    suggestedParticipants: number
    estimatedRounds: number
    reason: string
  }> {
    const prompt = getComplexityAssessmentPrompt(topic)
    const response = await this.aiClient.generateCompletion(prompt)
    return this.parseJsonResponse(response)
  }

  /**
   * 调度讨论
   */
  async scheduleDiscussion(request: SchedulingRequest): Promise<SchedulingResult> {
    // 1. 分析话题标签
    const topicTags = await this.analyzeTopicTags(request.topic)

    // 2. 评估复杂度
    const complexity = await this.assessComplexity(request.topic)

    // 3. 选择参与者
    const participants = selectParticipants({
      phase: request.projectPhase,
      topic: request.topic,
      maxParticipants: complexity.suggestedParticipants,
    })

    // 4. 确定优先级
    const priority = request.priority || 'medium'

    return {
      participants,
      estimatedRounds: complexity.estimatedRounds,
      complexity: complexity.complexity,
      priority,
      topicTags,
      reason: complexity.reason,
    }
  }
}

// ============================================================================
// 3. 决策分级引擎
// ============================================================================

/**
 * 决策分级引擎
 * 评估决策风险，决定是否需要用户确认
 */
export class DecisionClassificationEngine extends AutonomousEngine {
  /**
   * 评估决策风险
   */
  async classifyDecision(request: DecisionRequest): Promise<DecisionClassification> {
    const prompt = getDecisionClassificationPrompt({
      title: request.title,
      description: request.description,
      category: request.category,
      proposedAction: request.proposedAction,
    })

    const response = await this.aiClient.generateCompletion(prompt)
    const result = this.parseJsonResponse<{
      factors: RiskFactor[]
      totalScore: number
      level: string
      recommendation: string
      rationale: string
    }>(response)

    return {
      level: result.level as DecisionLevel,
      score: result.totalScore,
      factors: result.factors,
      recommendation: result.recommendation as DecisionClassification['recommendation'],
    }
  }

  /**
   * 判断是否需要用户确认
   */
  async needsUserConfirmation(request: DecisionRequest): Promise<{
    needsConfirmation: boolean
    level: DecisionLevel
    reason: string
  }> {
    const classification = await this.classifyDecision(request)

    // L0和L1不需要确认，L2和L3需要
    const needsConfirmation = classification.level === 'L2_CONFIRM' || classification.level === 'L3_CRITICAL'

    return {
      needsConfirmation,
      level: classification.level,
      reason: this.getLevelReason(classification),
    }
  }

  /**
   * 获取分级原因说明
   */
  private getLevelReason(classification: DecisionClassification): string {
    const highFactors = classification.factors
      .filter(f => f.score >= 10)
      .map(f => `${f.name}(${f.score}分): ${f.reason}`)
      .join('; ')

    if (classification.level === 'L0_AUTO') {
      return '低风险操作，可自动执行'
    } else if (classification.level === 'L1_NOTIFY') {
      return `较低风险，执行后通知。${highFactors ? `关注点: ${highFactors}` : ''}`
    } else if (classification.level === 'L2_CONFIRM') {
      return `中等风险，需要确认。${highFactors}`
    } else {
      return `高风险操作，必须详细确认。${highFactors}`
    }
  }
}

// ============================================================================
// 4. 执行追踪引擎
// ============================================================================

/**
 * 执行追踪引擎
 * 追踪任务执行状态，处理失败和回滚
 */
export class ExecutionTrackingEngine extends AutonomousEngine {
  private tasks: Map<string, ExecutionTask> = new Map()

  /**
   * 创建执行任务
   */
  createTask(decisionTitle: string, action: string): ExecutionTask {
    const task: ExecutionTask = {
      id: `task_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
      decisionTitle,
      action,
      status: 'pending',
      logs: [],
    }
    this.tasks.set(task.id, task)
    return task
  }

  /**
   * 开始执行任务
   */
  startTask(taskId: string): void {
    const task = this.tasks.get(taskId)
    if (task) {
      task.status = 'running'
      task.startedAt = new Date()
      task.logs.push(`[${new Date().toISOString()}] 开始执行`)
    }
  }

  /**
   * 添加日志
   */
  addLog(taskId: string, log: string): void {
    const task = this.tasks.get(taskId)
    if (task) {
      task.logs.push(`[${new Date().toISOString()}] ${log}`)
    }
  }

  /**
   * 完成任务
   */
  completeTask(taskId: string, status: 'success' | 'failure' | 'partial', error?: string): void {
    const task = this.tasks.get(taskId)
    if (task) {
      task.status = status
      task.completedAt = new Date()
      task.error = error
      task.logs.push(`[${new Date().toISOString()}] 执行${status === 'success' ? '成功' : status === 'failure' ? '失败' : '部分完成'}`)
    }
  }

  /**
   * 分析执行结果
   */
  async analyzeExecution(taskId: string): Promise<ExecutionAnalysisResult> {
    const task = this.tasks.get(taskId)
    if (!task) {
      throw new Error(`Task not found: ${taskId}`)
    }

    const prompt = getExecutionAnalysisPrompt({
      decisionTitle: task.decisionTitle,
      action: task.action,
      logs: task.logs,
      result: task.status as 'success' | 'failure' | 'partial',
      error: task.error,
    })

    const response = await this.aiClient.generateCompletion(prompt)
    return this.parseJsonResponse<ExecutionAnalysisResult>(response)
  }

  /**
   * 获取任务状态
   */
  getTask(taskId: string): ExecutionTask | undefined {
    return this.tasks.get(taskId)
  }

  /**
   * 获取所有运行中的任务
   */
  getRunningTasks(): ExecutionTask[] {
    return Array.from(this.tasks.values()).filter(t => t.status === 'running')
  }

  /**
   * 获取失败的任务
   */
  getFailedTasks(): ExecutionTask[] {
    return Array.from(this.tasks.values()).filter(t => t.status === 'failure')
  }
}

// ============================================================================
// 多高管讨论管理
// ============================================================================

/**
 * 多高管讨论管理器
 */
export class DiscussionManager extends AutonomousEngine {
  private sessions: Map<string, DiscussionSession> = new Map()

  /**
   * 创建新讨论
   */
  createSession(topic: string, projectId: string, participants: AgentId[]): DiscussionSession {
    const session: DiscussionSession = {
      id: `discussion_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
      topic,
      projectId,
      participants,
      messages: [],
      status: 'active',
      currentRound: 0,
      startedAt: new Date(),
    }
    this.sessions.set(session.id, session)
    return session
  }

  /**
   * 获取下一个发言者
   */
  async getNextSpeaker(sessionId: string): Promise<{
    agentId: AgentId
    prompt: string
    shouldContinue: boolean
    reason: string
  }> {
    const session = this.sessions.get(sessionId)
    if (!session) {
      throw new Error(`Session not found: ${sessionId}`)
    }

    const orchestratorPrompt = getDiscussionOrchestratorPrompt({
      topic: session.topic,
      participants: session.participants,
      previousMessages: session.messages.map(m => ({
        agentId: m.agentId,
        content: m.content,
      })),
      roundNumber: session.currentRound,
    })

    const response = await this.aiClient.generateCompletion(orchestratorPrompt)
    const result = this.parseJsonResponse<{
      nextAgentId: string
      prompt: string
      shouldContinue: boolean
      reason: string
    }>(response)

    return {
      agentId: result.nextAgentId as AgentId,
      prompt: result.prompt,
      shouldContinue: result.shouldContinue,
      reason: result.reason,
    }
  }

  /**
   * 生成高管回复
   */
  async generateAgentResponse(
    sessionId: string,
    agentId: AgentId,
    guidance?: string
  ): Promise<string> {
    const session = this.sessions.get(sessionId)
    if (!session) {
      throw new Error(`Session not found: ${sessionId}`)
    }

    const executive = AI_EXECUTIVES[agentId]
    const systemPrompt = buildAgentPrompt({
      executive,
      topic: session.topic,
    })

    const responsePrompt = getAgentResponsePrompt({
      agentId,
      topic: session.topic,
      previousMessages: session.messages.map(m => ({
        agentId: m.agentId,
        content: m.content,
      })),
      orchestratorGuidance: guidance,
    })

    return await this.aiClient.generateCompletion(responsePrompt, systemPrompt)
  }

  /**
   * 添加消息到讨论
   */
  addMessage(sessionId: string, agentId: AgentId, content: string, role?: 'user' | 'agent'): void {
    const session = this.sessions.get(sessionId)
    if (session) {
      session.messages.push({
        agentId,
        content,
        timestamp: new Date(),
        role,
      })
    }
  }

  /**
   * 增加轮数
   */
  incrementRound(sessionId: string): void {
    const session = this.sessions.get(sessionId)
    if (session) {
      session.currentRound++
    }
  }

  /**
   * 完成讨论
   */
  completeSession(sessionId: string): void {
    const session = this.sessions.get(sessionId)
    if (session) {
      session.status = 'completed'
      session.completedAt = new Date()
    }
  }

  /**
   * 生成讨论总结
   */
  async generateSummary(sessionId: string): Promise<{
    summary: string
    keyDecisions: { decision: string; proposedBy: AgentId; supportedBy: AgentId[] }[]
    actionItems: { action: string; owner: AgentId; priority: 'high' | 'medium' | 'low' }[]
    openQuestions: string[]
    consensus: string[]
    disagreements: string[]
  }> {
    const session = this.sessions.get(sessionId)
    if (!session) {
      throw new Error(`Session not found: ${sessionId}`)
    }

    const prompt = getDiscussionSummaryPrompt(
      session.messages.map(m => ({
        agentId: m.agentId,
        content: m.content,
      }))
    )

    const response = await this.aiClient.generateCompletion(prompt)
    return this.parseJsonResponse(response)
  }

  /**
   * 获取讨论会话
   */
  getSession(sessionId: string): DiscussionSession | undefined {
    return this.sessions.get(sessionId)
  }

  /**
   * 获取活跃的讨论
   */
  getActiveSessions(): DiscussionSession[] {
    return Array.from(this.sessions.values()).filter(s => s.status === 'active')
  }
}

// ============================================================================
// 定时任务管理
// ============================================================================

export interface ScheduledTask {
  id: string
  type: 'daily_standup' | 'weekly_review'
  projectId: string
  cronExpression: string
  lastRunAt?: Date
  nextRunAt: Date
  enabled: boolean
}

/**
 * 定时任务管理器
 */
export class ScheduledTaskManager extends AutonomousEngine {
  private tasks: Map<string, ScheduledTask> = new Map()

  /**
   * 创建每日站会任务
   */
  createDailyStandup(projectId: string, cronExpression: string = '0 9 * * *'): ScheduledTask {
    const task: ScheduledTask = {
      id: `standup_${projectId}`,
      type: 'daily_standup',
      projectId,
      cronExpression,
      nextRunAt: this.calculateNextRun(cronExpression),
      enabled: true,
    }
    this.tasks.set(task.id, task)
    return task
  }

  /**
   * 创建每周复盘任务
   */
  createWeeklyReview(projectId: string, cronExpression: string = '0 10 * * 5'): ScheduledTask {
    const task: ScheduledTask = {
      id: `review_${projectId}`,
      type: 'weekly_review',
      projectId,
      cronExpression,
      nextRunAt: this.calculateNextRun(cronExpression),
      enabled: true,
    }
    this.tasks.set(task.id, task)
    return task
  }

  /**
   * 执行每日站会
   */
  async runDailyStandup(params: {
    projectName: string
    projectPhase: string
    yesterday: string
    blockers?: string[]
  }): Promise<string> {
    const prompt = getDailyStandupPrompt(params)
    return await this.aiClient.generateCompletion(prompt)
  }

  /**
   * 执行每周复盘
   */
  async runWeeklyReview(params: {
    projectName: string
    weekNumber: number
    accomplishments: string[]
    metrics: Record<string, number>
    issues: string[]
  }): Promise<string> {
    const prompt = getWeeklyReviewPrompt(params)
    return await this.aiClient.generateCompletion(prompt)
  }

  /**
   * 获取到期的任务
   */
  getDueTasks(): ScheduledTask[] {
    const now = new Date()
    return Array.from(this.tasks.values()).filter(
      t => t.enabled && t.nextRunAt <= now
    )
  }

  /**
   * 标记任务已执行
   */
  markTaskRun(taskId: string): void {
    const task = this.tasks.get(taskId)
    if (task) {
      task.lastRunAt = new Date()
      task.nextRunAt = this.calculateNextRun(task.cronExpression)
    }
  }

  /**
   * 计算下次运行时间（简化实现）
   */
  private calculateNextRun(cronExpression: string): Date {
    // 简化实现：返回明天同一时间
    const now = new Date()
    const next = new Date(now)
    next.setDate(next.getDate() + 1)
    return next
  }
}

// ============================================================================
// 自治系统主类
// ============================================================================

/**
 * AI自治系统
 * 整合四大引擎，提供统一的自治能力
 */
export class AutonomousSystem {
  public dataSensing: DataSensingEngine
  public workScheduling: WorkSchedulingEngine
  public decisionClassification: DecisionClassificationEngine
  public executionTracking: ExecutionTrackingEngine
  public discussionManager: DiscussionManager
  public scheduledTasks: ScheduledTaskManager

  constructor(aiClient: AIClient, userId: string) {
    this.dataSensing = new DataSensingEngine(aiClient, userId)
    this.workScheduling = new WorkSchedulingEngine(aiClient, userId)
    this.decisionClassification = new DecisionClassificationEngine(aiClient, userId)
    this.executionTracking = new ExecutionTrackingEngine(aiClient, userId)
    this.discussionManager = new DiscussionManager(aiClient, userId)
    this.scheduledTasks = new ScheduledTaskManager(aiClient, userId)
  }

  /**
   * 处理数据变化事件
   * 自动感知 -> 调度讨论 -> 分级决策 -> 追踪执行
   */
  async handleDataChange(event: DataChangeEvent, projectPhase: ProjectPhase): Promise<{
    analysis: DataSensingResult
    scheduling?: SchedulingResult
    classification?: DecisionClassification
    taskId?: string
  }> {
    // 1. 数据感知
    const analysis = await this.dataSensing.analyzeChange(event)

    // 如果没有显著变化，直接返回
    if (!analysis.hasSignificantChange) {
      return { analysis }
    }

    // 2. 工作调度
    const scheduling = await this.workScheduling.scheduleDiscussion({
      topic: analysis.title,
      projectId: event.sourceId,
      projectPhase,
      priority: analysis.urgency === 'immediate' ? 'urgent' :
               analysis.urgency === 'soon' ? 'high' : 'medium',
    })

    // 3. 决策分级
    const classification = await this.decisionClassification.classifyDecision({
      title: analysis.title,
      description: analysis.description,
      category: analysis.changeType,
      proposedAction: analysis.suggestedAction,
    })

    // 4. 如果是L0级别，创建自动执行任务
    let taskId: string | undefined
    if (classification.level === 'L0_AUTO') {
      const task = this.executionTracking.createTask(
        analysis.title,
        analysis.suggestedAction
      )
      taskId = task.id
    }

    return {
      analysis,
      scheduling,
      classification,
      taskId,
    }
  }

  /**
   * 发起一个完整的讨论流程
   */
  async initiateDiscussion(params: {
    topic: string
    projectId: string
    projectPhase: ProjectPhase
    maxRounds?: number
    onMessage?: (agentId: AgentId, content: string) => void
  }): Promise<{
    sessionId: string
    summary: any
    totalRounds: number
  }> {
    const { topic, projectId, projectPhase, maxRounds = 5, onMessage } = params

    // 1. 调度讨论
    const scheduling = await this.workScheduling.scheduleDiscussion({
      topic,
      projectId,
      projectPhase,
    })

    // 2. 创建讨论会话
    const session = this.discussionManager.createSession(
      topic,
      projectId,
      scheduling.participants
    )

    // 3. 进行讨论
    let round = 0
    while (round < maxRounds) {
      // 获取下一个发言者
      const next = await this.discussionManager.getNextSpeaker(session.id)

      // 检查是否应该继续
      if (!next.shouldContinue) {
        break
      }

      // 生成回复
      const response = await this.discussionManager.generateAgentResponse(
        session.id,
        next.agentId,
        next.prompt
      )

      // 添加消息
      this.discussionManager.addMessage(session.id, next.agentId, response, 'agent')

      // 回调
      if (onMessage) {
        onMessage(next.agentId, response)
      }

      round++
      this.discussionManager.incrementRound(session.id)
    }

    // 4. 完成讨论并生成总结
    this.discussionManager.completeSession(session.id)
    const summary = await this.discussionManager.generateSummary(session.id)

    return {
      sessionId: session.id,
      summary,
      totalRounds: round,
    }
  }

  /**
   * 检查并执行到期的定时任务
   */
  async runDueTasks(): Promise<{ taskId: string; result: string }[]> {
    const dueTasks = this.scheduledTasks.getDueTasks()
    const results: { taskId: string; result: string }[] = []

    for (const task of dueTasks) {
      let result: string

      if (task.type === 'daily_standup') {
        result = await this.scheduledTasks.runDailyStandup({
          projectName: `Project ${task.projectId}`,
          projectPhase: 'development',
          yesterday: '需要从项目数据中获取',
        })
      } else {
        result = await this.scheduledTasks.runWeeklyReview({
          projectName: `Project ${task.projectId}`,
          weekNumber: this.getWeekNumber(),
          accomplishments: [],
          metrics: {},
          issues: [],
        })
      }

      this.scheduledTasks.markTaskRun(task.id)
      results.push({ taskId: task.id, result })
    }

    return results
  }

  /**
   * 获取当前周数
   */
  private getWeekNumber(): number {
    const now = new Date()
    const start = new Date(now.getFullYear(), 0, 1)
    const diff = now.getTime() - start.getTime()
    const oneWeek = 604800000
    return Math.ceil(diff / oneWeek)
  }
}
