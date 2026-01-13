/**
 * AI高管服务
 *
 * 将AI高管系统集成到产品运营流程中
 * 提供产品监督、自动优化、定时任务等能力
 */

import {
  AutonomousSystem,
  AI_EXECUTIVES,
  AgentId,
  ProjectPhase,
  DecisionLevel,
  UserExecutive,
  getAgentNamespace,
  getProjectNamespace,
  AGENT_IDS,
  AIClient,
  DataChangeEvent,
  SchedulingResult,
  DecisionClassification,
  generateExecutiveTeamIntro,
} from '@/lib/ai/executives'

// ============================================================================
// 类型定义
// ============================================================================

/**
 * 产品监督事件类型
 */
export type SupervisionEventType =
  | 'metrics_anomaly'    // 指标异常
  | 'user_feedback'      // 用户反馈
  | 'error_spike'        // 错误激增
  | 'conversion_drop'    // 转化下降
  | 'performance_issue'  // 性能问题
  | 'security_alert'     // 安全告警
  | 'competitor_change'  // 竞品变动
  | 'market_trend'       // 市场趋势

/**
 * 监督事件
 */
export interface SupervisionEvent {
  type: SupervisionEventType
  projectId: string
  title: string
  description: string
  severity: 'low' | 'medium' | 'high' | 'critical'
  data: any
  timestamp: Date
}

/**
 * 监督响应
 */
export interface SupervisionResponse {
  eventId: string
  handled: boolean
  decisionLevel: DecisionLevel
  actions: {
    type: 'auto_execute' | 'notify' | 'discuss' | 'await_confirmation'
    description: string
    taskId?: string
    discussionId?: string
  }[]
  recommendations: string[]
}

/**
 * 项目状态
 */
export interface ProjectStatus {
  projectId: string
  phase: ProjectPhase
  health: 'healthy' | 'warning' | 'critical'
  metrics: {
    name: string
    value: number
    trend: 'up' | 'down' | 'stable'
    isHealthy: boolean
  }[]
  recentIssues: SupervisionEvent[]
  upcomingTasks: { type: string; scheduledFor: Date }[]
}

/**
 * 用户高管团队状态
 */
export interface UserExecutiveTeamStatus {
  userId: string
  executives: {
    id: AgentId
    name: string
    title: string
    isActive: boolean
    memoryCount: number
    lastActiveAt?: Date
  }[]
  activeDiscussions: number
  pendingDecisions: number
  scheduledTasks: number
}

// ============================================================================
// 服务配置
// ============================================================================

export interface ExecutiveServiceConfig {
  aiClient: AIClient
  userId: string
  onNotification?: (notification: {
    type: 'info' | 'warning' | 'error' | 'success'
    title: string
    message: string
  }) => void
  onDecisionRequired?: (decision: {
    id: string
    title: string
    description: string
    level: DecisionLevel
    options: { label: string; action: string }[]
  }) => void
}

// ============================================================================
// AI高管服务
// ============================================================================

/**
 * AI高管服务
 * 负责协调AI高管团队，处理产品监督和运营优化
 */
export class ExecutiveService {
  private autonomousSystem: AutonomousSystem
  private config: ExecutiveServiceConfig
  private projectPhases: Map<string, ProjectPhase> = new Map()
  private pendingDecisions: Map<string, { request: any; classification: DecisionClassification }> = new Map()

  constructor(config: ExecutiveServiceConfig) {
    this.config = config
    this.autonomousSystem = new AutonomousSystem(config.aiClient, config.userId)
  }

  // ==========================================================================
  // 产品监督
  // ==========================================================================

  /**
   * 处理监督事件
   */
  async handleSupervisionEvent(event: SupervisionEvent): Promise<SupervisionResponse> {
    const phase = this.projectPhases.get(event.projectId) || 'growth'

    // 转换为数据变化事件
    const dataChangeEvent: DataChangeEvent = {
      sourceId: event.projectId,
      sourceName: event.type,
      previousData: null,
      currentData: event.data,
      changeDescription: event.description,
      timestamp: event.timestamp,
    }

    // 使用自治系统处理
    const result = await this.autonomousSystem.handleDataChange(dataChangeEvent, phase)
    const actions: SupervisionResponse['actions'] = []

    // 根据决策级别确定响应
    if (result.classification) {
      switch (result.classification.level) {
        case 'L0_AUTO':
          // 自动执行
          if (result.taskId) {
            this.autonomousSystem.executionTracking.startTask(result.taskId)
            actions.push({
              type: 'auto_execute',
              description: result.analysis.suggestedAction,
              taskId: result.taskId,
            })
          }
          break

        case 'L1_NOTIFY':
          // 执行后通知
          const task = this.autonomousSystem.executionTracking.createTask(
            event.title,
            result.analysis.suggestedAction
          )
          this.autonomousSystem.executionTracking.startTask(task.id)
          actions.push({
            type: 'notify',
            description: result.analysis.suggestedAction,
            taskId: task.id,
          })
          // 发送通知
          this.notify('info', event.title, result.analysis.suggestedAction)
          break

        case 'L2_CONFIRM':
          // 需要确认
          const decisionId = `decision_${Date.now()}`
          this.pendingDecisions.set(decisionId, {
            request: event,
            classification: result.classification,
          })
          actions.push({
            type: 'await_confirmation',
            description: `需要确认: ${result.analysis.suggestedAction}`,
          })
          // 请求用户确认
          this.requestDecision(decisionId, event.title, event.description, result.classification.level)
          break

        case 'L3_CRITICAL':
          // 发起讨论
          if (result.scheduling) {
            const discussion = this.autonomousSystem.discussionManager.createSession(
              event.title,
              event.projectId,
              result.scheduling.participants
            )
            actions.push({
              type: 'discuss',
              description: `高优先级问题，已召集${result.scheduling.participants.length}位高管讨论`,
              discussionId: discussion.id,
            })
          }
          // 请求用户确认
          const criticalDecisionId = `decision_${Date.now()}`
          this.pendingDecisions.set(criticalDecisionId, {
            request: event,
            classification: result.classification,
          })
          this.requestDecision(criticalDecisionId, event.title, event.description, 'L3_CRITICAL')
          break
      }
    }

    return {
      eventId: `event_${Date.now()}`,
      handled: true,
      decisionLevel: result.classification?.level || 'L0_AUTO',
      actions,
      recommendations: [result.analysis.suggestedAction],
    }
  }

  /**
   * 批量处理监督事件
   */
  async handleMultipleEvents(events: SupervisionEvent[]): Promise<SupervisionResponse[]> {
    // 按优先级排序
    const sorted = [...events].sort((a, b) => {
      const severityOrder = { critical: 0, high: 1, medium: 2, low: 3 }
      return severityOrder[a.severity] - severityOrder[b.severity]
    })

    const responses: SupervisionResponse[] = []
    for (const event of sorted) {
      const response = await this.handleSupervisionEvent(event)
      responses.push(response)
    }
    return responses
  }

  // ==========================================================================
  // 讨论管理
  // ==========================================================================

  /**
   * 发起新讨论
   */
  async initiateDiscussion(params: {
    topic: string
    projectId: string
    maxRounds?: number
    onMessage?: (agentId: AgentId, agentName: string, content: string) => void
  }): Promise<{
    sessionId: string
    summary: any
    totalRounds: number
  }> {
    const phase = this.projectPhases.get(params.projectId) || 'growth'

    return await this.autonomousSystem.initiateDiscussion({
      topic: params.topic,
      projectId: params.projectId,
      projectPhase: phase,
      maxRounds: params.maxRounds,
      onMessage: params.onMessage
        ? (agentId, content) => {
            const exec = AI_EXECUTIVES[agentId]
            params.onMessage!(agentId, exec.name, content)
          }
        : undefined,
    })
  }

  /**
   * 向讨论添加用户消息
   */
  addUserMessage(sessionId: string, content: string): void {
    // 使用mike作为用户消息的代理（产品负责人）
    this.autonomousSystem.discussionManager.addMessage(sessionId, 'mike', content, 'user')
  }

  /**
   * 获取活跃讨论
   */
  getActiveDiscussions(): { id: string; topic: string; participants: string[] }[] {
    return this.autonomousSystem.discussionManager.getActiveSessions().map(s => ({
      id: s.id,
      topic: s.topic,
      participants: s.participants.map(p => AI_EXECUTIVES[p].name),
    }))
  }

  // ==========================================================================
  // 决策管理
  // ==========================================================================

  /**
   * 用户确认决策
   */
  async confirmDecision(decisionId: string, approved: boolean): Promise<{
    success: boolean
    taskId?: string
    message: string
  }> {
    const pending = this.pendingDecisions.get(decisionId)
    if (!pending) {
      return { success: false, message: '决策不存在或已过期' }
    }

    this.pendingDecisions.delete(decisionId)

    if (approved) {
      // 创建并执行任务
      const task = this.autonomousSystem.executionTracking.createTask(
        pending.request.title,
        '用户确认后执行'
      )
      this.autonomousSystem.executionTracking.startTask(task.id)

      return {
        success: true,
        taskId: task.id,
        message: '决策已确认，正在执行',
      }
    } else {
      return {
        success: true,
        message: '决策已取消',
      }
    }
  }

  /**
   * 获取待处理决策
   */
  getPendingDecisions(): { id: string; title: string; level: DecisionLevel }[] {
    return Array.from(this.pendingDecisions.entries()).map(([id, data]) => ({
      id,
      title: data.request.title,
      level: data.classification.level,
    }))
  }

  // ==========================================================================
  // 定时任务
  // ==========================================================================

  /**
   * 为项目设置定时任务
   */
  setupScheduledTasks(projectId: string): void {
    // 每日站会
    this.autonomousSystem.scheduledTasks.createDailyStandup(projectId)
    // 每周复盘
    this.autonomousSystem.scheduledTasks.createWeeklyReview(projectId)
  }

  /**
   * 执行到期任务
   */
  async runDueTasks(): Promise<{ taskId: string; result: string }[]> {
    return await this.autonomousSystem.runDueTasks()
  }

  // ==========================================================================
  // 项目管理
  // ==========================================================================

  /**
   * 设置项目阶段
   */
  setProjectPhase(projectId: string, phase: ProjectPhase): void {
    this.projectPhases.set(projectId, phase)
  }

  /**
   * 获取项目状态（简化版）
   */
  getProjectStatus(projectId: string): ProjectStatus {
    const phase = this.projectPhases.get(projectId) || 'growth'

    return {
      projectId,
      phase,
      health: 'healthy',
      metrics: [],
      recentIssues: [],
      upcomingTasks: [],
    }
  }

  // ==========================================================================
  // 高管团队
  // ==========================================================================

  /**
   * 获取高管团队状态
   */
  getTeamStatus(): UserExecutiveTeamStatus {
    return {
      userId: this.config.userId,
      executives: AGENT_IDS.map(id => {
        const exec = AI_EXECUTIVES[id]
        return {
          id,
          name: exec.name,
          title: exec.title,
          isActive: true,
          memoryCount: 0,
          lastActiveAt: undefined,
        }
      }),
      activeDiscussions: this.autonomousSystem.discussionManager.getActiveSessions().length,
      pendingDecisions: this.pendingDecisions.size,
      scheduledTasks: 0,
    }
  }

  /**
   * 获取高管团队介绍
   */
  getTeamIntro(): string {
    return generateExecutiveTeamIntro()
  }

  /**
   * 与单个高管对话
   */
  async chatWithExecutive(
    agentId: AgentId,
    message: string,
    context?: { projectId?: string; topic?: string }
  ): Promise<string> {
    const exec = AI_EXECUTIVES[agentId]

    // 构建简单的对话上下文
    const session = this.autonomousSystem.discussionManager.createSession(
      context?.topic || message,
      context?.projectId || 'general',
      [agentId]
    )

    const response = await this.autonomousSystem.discussionManager.generateAgentResponse(
      session.id,
      agentId,
      message
    )

    this.autonomousSystem.discussionManager.completeSession(session.id)

    return response
  }

  // ==========================================================================
  // 内部方法
  // ==========================================================================

  /**
   * 发送通知
   */
  private notify(type: 'info' | 'warning' | 'error' | 'success', title: string, message: string): void {
    if (this.config.onNotification) {
      this.config.onNotification({ type, title, message })
    }
  }

  /**
   * 请求用户决策
   */
  private requestDecision(
    id: string,
    title: string,
    description: string,
    level: DecisionLevel
  ): void {
    if (this.config.onDecisionRequired) {
      this.config.onDecisionRequired({
        id,
        title,
        description,
        level,
        options: [
          { label: '确认执行', action: 'approve' },
          { label: '取消', action: 'reject' },
          { label: '稍后决定', action: 'defer' },
        ],
      })
    }
  }
}

// ============================================================================
// 工厂函数
// ============================================================================

/**
 * 创建高管服务实例
 */
export function createExecutiveService(config: ExecutiveServiceConfig): ExecutiveService {
  return new ExecutiveService(config)
}

/**
 * 单例管理
 */
let executiveServiceInstance: ExecutiveService | null = null

/**
 * 获取或创建高管服务实例
 */
export function getExecutiveService(config?: ExecutiveServiceConfig): ExecutiveService {
  if (!executiveServiceInstance && config) {
    executiveServiceInstance = createExecutiveService(config)
  }
  if (!executiveServiceInstance) {
    throw new Error('ExecutiveService not initialized. Please provide config.')
  }
  return executiveServiceInstance
}

/**
 * 重置高管服务实例（用于测试）
 */
export function resetExecutiveService(): void {
  executiveServiceInstance = null
}
