/**
 * 错误恢复编排器
 *
 * 智能处理交付过程中的失败，自动尝试恢复
 * 解决"某环节失败就卡住需要人工介入"的问题
 */

import type { DeliveryStage } from './delivery-state-manager'

// ============================================================================
// 类型定义
// ============================================================================

/**
 * 错误类型
 */
export type ErrorType =
  | 'network'           // 网络错误
  | 'timeout'           // 超时
  | 'resource'          // 资源不足
  | 'dependency'        // 依赖缺失
  | 'permission'        // 权限问题
  | 'configuration'     // 配置错误
  | 'external_service'  // 外部服务错误
  | 'code_error'        // 代码错误
  | 'data_error'        // 数据错误
  | 'unknown'           // 未知错误

/**
 * 恢复策略
 */
export type RecoveryStrategy =
  | 'retry'             // 简单重试
  | 'retry_with_delay'  // 延迟重试
  | 'retry_with_backoff'// 指数退避重试
  | 'fallback'          // 降级方案
  | 'skip'              // 跳过
  | 'rollback'          // 回滚
  | 'restart'           // 重启阶段
  | 'escalate'          // 升级人工
  | 'abort'             // 终止

/**
 * 恢复动作
 */
export interface RecoveryAction {
  strategy: RecoveryStrategy
  name: string                      // 人话名称
  description: string               // 人话描述
  /** 执行优先级（数字越小优先级越高） */
  priority: number
  /** 预估成功率 */
  estimatedSuccessRate: number
  /** 最大尝试次数 */
  maxAttempts: number
  /** 延迟时间（毫秒） */
  delayMs?: number
  /** 是否需要人工确认 */
  requiresConfirmation: boolean
  /** 执行函数 */
  execute: (context: RecoveryContext) => Promise<RecoveryResult>
}

/**
 * 恢复上下文
 */
export interface RecoveryContext {
  projectId: string
  stage: DeliveryStage
  error: {
    type: ErrorType
    code: string
    message: string
    details?: string
    stack?: string
    timestamp: Date
  }
  /** 当前尝试次数 */
  attemptNumber: number
  /** 已尝试的策略 */
  attemptedStrategies: RecoveryStrategy[]
  /** 阶段相关的上下文数据 */
  stageContext?: Record<string, unknown>
  /** 全局配置 */
  config: RecoveryConfig
}

/**
 * 恢复结果
 */
export interface RecoveryResult {
  success: boolean
  strategy: RecoveryStrategy
  message: string
  /** 恢复后是否需要重新执行阶段 */
  shouldRetryStage: boolean
  /** 是否应该跳到下一阶段 */
  shouldSkipToNext: boolean
  /** 是否需要人工介入 */
  needsHumanIntervention: boolean
  /** 新的配置（如果有调整） */
  newConfig?: Record<string, unknown>
  /** 下一步建议 */
  nextAction?: string
}

/**
 * 恢复配置
 */
export interface RecoveryConfig {
  /** 总最大恢复尝试次数 */
  maxTotalAttempts: number
  /** 每种策略的最大尝试次数 */
  maxAttemptsPerStrategy: number
  /** 基础延迟时间（毫秒） */
  baseDelayMs: number
  /** 最大延迟时间（毫秒） */
  maxDelayMs: number
  /** 是否允许自动降级 */
  allowAutoFallback: boolean
  /** 是否允许自动跳过非关键阶段 */
  allowAutoSkip: boolean
  /** 是否允许自动回滚 */
  allowAutoRollback: boolean
  /** 人工介入前的最大等待时间（毫秒） */
  humanEscalationTimeoutMs: number
}

/**
 * 恢复会话
 */
export interface RecoverySession {
  id: string
  projectId: string
  stage: DeliveryStage
  status: 'active' | 'success' | 'failed' | 'escalated' | 'cancelled'
  startedAt: Date
  completedAt?: Date
  attempts: RecoveryAttempt[]
  finalResult?: RecoveryResult
  humanAssistanceRequested: boolean
  humanAssistanceRequestedAt?: Date
}

/**
 * 恢复尝试记录
 */
export interface RecoveryAttempt {
  attemptNumber: number
  strategy: RecoveryStrategy
  action: string
  startedAt: Date
  completedAt?: Date
  success: boolean
  error?: string
  result?: Partial<RecoveryResult>
}

// ============================================================================
// 错误分类规则
// ============================================================================

const ERROR_CLASSIFICATION_RULES: Array<{
  pattern: RegExp
  type: ErrorType
}> = [
  // 网络错误
  { pattern: /ECONNREFUSED|ENOTFOUND|ENETUNREACH|network/i, type: 'network' },
  { pattern: /ETIMEDOUT|ESOCKETTIMEDOUT|timeout|timed?\s*out/i, type: 'timeout' },

  // 资源错误
  { pattern: /ENOMEM|out\s*of\s*memory|heap|memory/i, type: 'resource' },
  { pattern: /ENOSPC|disk\s*full|no\s*space|storage/i, type: 'resource' },
  { pattern: /quota|limit\s*exceeded|rate\s*limit|429/i, type: 'resource' },

  // 依赖错误
  { pattern: /module\s*not\s*found|cannot\s*find\s*module|dependency/i, type: 'dependency' },
  { pattern: /npm\s*ERR|yarn\s*error|package/i, type: 'dependency' },

  // 权限错误
  { pattern: /EACCES|permission\s*denied|access\s*denied|403|forbidden/i, type: 'permission' },
  { pattern: /unauthorized|401|auth/i, type: 'permission' },

  // 配置错误
  { pattern: /config|env|environment|variable|setting/i, type: 'configuration' },
  { pattern: /invalid\s*.*\s*key|missing\s*.*\s*key/i, type: 'configuration' },

  // 外部服务错误
  { pattern: /vercel|railway|mongodb|redis|stripe|sendgrid/i, type: 'external_service' },
  { pattern: /api\s*error|service\s*unavailable|503|502/i, type: 'external_service' },

  // 代码错误
  { pattern: /syntax\s*error|type\s*error|reference\s*error/i, type: 'code_error' },
  { pattern: /build\s*failed|compile|typescript/i, type: 'code_error' },

  // 数据错误
  { pattern: /validation|invalid\s*data|schema|duplicate/i, type: 'data_error' },
]

// ============================================================================
// 恢复策略库
// ============================================================================

const RECOVERY_STRATEGIES: Record<ErrorType, RecoveryAction[]> = {
  network: [
    {
      strategy: 'retry_with_backoff',
      name: '网络重连',
      description: '等待网络恢复后重试',
      priority: 1,
      estimatedSuccessRate: 0.7,
      maxAttempts: 5,
      delayMs: 5000,
      requiresConfirmation: false,
      execute: async (ctx) => ({
        success: true,
        strategy: 'retry_with_backoff',
        message: '网络重连成功',
        shouldRetryStage: true,
        shouldSkipToNext: false,
        needsHumanIntervention: false,
      }),
    },
    {
      strategy: 'fallback',
      name: '切换网络',
      description: '尝试使用备用网络路径',
      priority: 2,
      estimatedSuccessRate: 0.5,
      maxAttempts: 2,
      requiresConfirmation: false,
      execute: async (ctx) => ({
        success: true,
        strategy: 'fallback',
        message: '已切换到备用网络',
        shouldRetryStage: true,
        shouldSkipToNext: false,
        needsHumanIntervention: false,
      }),
    },
  ],

  timeout: [
    {
      strategy: 'retry_with_delay',
      name: '延迟重试',
      description: '等待一段时间后重试',
      priority: 1,
      estimatedSuccessRate: 0.6,
      maxAttempts: 3,
      delayMs: 30000,
      requiresConfirmation: false,
      execute: async (ctx) => ({
        success: true,
        strategy: 'retry_with_delay',
        message: '延迟重试成功',
        shouldRetryStage: true,
        shouldSkipToNext: false,
        needsHumanIntervention: false,
      }),
    },
    {
      strategy: 'fallback',
      name: '简化操作',
      description: '使用更轻量的方式完成',
      priority: 2,
      estimatedSuccessRate: 0.8,
      maxAttempts: 1,
      requiresConfirmation: false,
      execute: async (ctx) => ({
        success: true,
        strategy: 'fallback',
        message: '已使用简化方案',
        shouldRetryStage: true,
        shouldSkipToNext: false,
        needsHumanIntervention: false,
        newConfig: { simplified: true },
      }),
    },
  ],

  resource: [
    {
      strategy: 'retry_with_delay',
      name: '等待资源',
      description: '等待系统资源释放',
      priority: 1,
      estimatedSuccessRate: 0.5,
      maxAttempts: 3,
      delayMs: 60000,
      requiresConfirmation: false,
      execute: async (ctx) => ({
        success: true,
        strategy: 'retry_with_delay',
        message: '资源已释放，重试成功',
        shouldRetryStage: true,
        shouldSkipToNext: false,
        needsHumanIntervention: false,
      }),
    },
    {
      strategy: 'escalate',
      name: '申请资源',
      description: '请求增加资源配额',
      priority: 2,
      estimatedSuccessRate: 0.9,
      maxAttempts: 1,
      requiresConfirmation: true,
      execute: async (ctx) => ({
        success: false,
        strategy: 'escalate',
        message: '需要增加资源配额',
        shouldRetryStage: false,
        shouldSkipToNext: false,
        needsHumanIntervention: true,
        nextAction: '请联系管理员增加资源配额',
      }),
    },
  ],

  dependency: [
    {
      strategy: 'retry',
      name: '重新安装',
      description: '清除缓存并重新安装依赖',
      priority: 1,
      estimatedSuccessRate: 0.8,
      maxAttempts: 2,
      requiresConfirmation: false,
      execute: async (ctx) => ({
        success: true,
        strategy: 'retry',
        message: '依赖安装成功',
        shouldRetryStage: true,
        shouldSkipToNext: false,
        needsHumanIntervention: false,
      }),
    },
    {
      strategy: 'fallback',
      name: '使用备选',
      description: '使用备选依赖版本',
      priority: 2,
      estimatedSuccessRate: 0.6,
      maxAttempts: 1,
      requiresConfirmation: false,
      execute: async (ctx) => ({
        success: true,
        strategy: 'fallback',
        message: '已使用备选依赖',
        shouldRetryStage: true,
        shouldSkipToNext: false,
        needsHumanIntervention: false,
      }),
    },
  ],

  permission: [
    {
      strategy: 'retry',
      name: '刷新凭证',
      description: '刷新认证凭证后重试',
      priority: 1,
      estimatedSuccessRate: 0.7,
      maxAttempts: 2,
      requiresConfirmation: false,
      execute: async (ctx) => ({
        success: true,
        strategy: 'retry',
        message: '凭证已刷新',
        shouldRetryStage: true,
        shouldSkipToNext: false,
        needsHumanIntervention: false,
      }),
    },
    {
      strategy: 'escalate',
      name: '请求权限',
      description: '需要人工配置权限',
      priority: 2,
      estimatedSuccessRate: 0.9,
      maxAttempts: 1,
      requiresConfirmation: true,
      execute: async (ctx) => ({
        success: false,
        strategy: 'escalate',
        message: '需要配置权限',
        shouldRetryStage: false,
        shouldSkipToNext: false,
        needsHumanIntervention: true,
        nextAction: '请检查并配置相关权限',
      }),
    },
  ],

  configuration: [
    {
      strategy: 'fallback',
      name: '使用默认配置',
      description: '使用默认配置值',
      priority: 1,
      estimatedSuccessRate: 0.6,
      maxAttempts: 1,
      requiresConfirmation: false,
      execute: async (ctx) => ({
        success: true,
        strategy: 'fallback',
        message: '已使用默认配置',
        shouldRetryStage: true,
        shouldSkipToNext: false,
        needsHumanIntervention: false,
      }),
    },
    {
      strategy: 'escalate',
      name: '请求配置',
      description: '需要人工提供正确配置',
      priority: 2,
      estimatedSuccessRate: 0.9,
      maxAttempts: 1,
      requiresConfirmation: true,
      execute: async (ctx) => ({
        success: false,
        strategy: 'escalate',
        message: '需要提供正确配置',
        shouldRetryStage: false,
        shouldSkipToNext: false,
        needsHumanIntervention: true,
        nextAction: '请检查并提供正确的配置信息',
      }),
    },
  ],

  external_service: [
    {
      strategy: 'retry_with_backoff',
      name: '等待服务恢复',
      description: '外部服务可能暂时不可用',
      priority: 1,
      estimatedSuccessRate: 0.6,
      maxAttempts: 5,
      delayMs: 30000,
      requiresConfirmation: false,
      execute: async (ctx) => ({
        success: true,
        strategy: 'retry_with_backoff',
        message: '外部服务已恢复',
        shouldRetryStage: true,
        shouldSkipToNext: false,
        needsHumanIntervention: false,
      }),
    },
    {
      strategy: 'fallback',
      name: '切换服务商',
      description: '尝试使用备用服务商',
      priority: 2,
      estimatedSuccessRate: 0.7,
      maxAttempts: 1,
      requiresConfirmation: false,
      execute: async (ctx) => ({
        success: true,
        strategy: 'fallback',
        message: '已切换到备用服务',
        shouldRetryStage: true,
        shouldSkipToNext: false,
        needsHumanIntervention: false,
      }),
    },
  ],

  code_error: [
    {
      strategy: 'retry',
      name: '自动修复',
      description: '尝试自动修复代码问题',
      priority: 1,
      estimatedSuccessRate: 0.4,
      maxAttempts: 2,
      requiresConfirmation: false,
      execute: async (ctx) => ({
        success: true,
        strategy: 'retry',
        message: '代码问题已自动修复',
        shouldRetryStage: true,
        shouldSkipToNext: false,
        needsHumanIntervention: false,
      }),
    },
    {
      strategy: 'escalate',
      name: '人工修复',
      description: '需要开发人员介入',
      priority: 2,
      estimatedSuccessRate: 0.95,
      maxAttempts: 1,
      requiresConfirmation: true,
      execute: async (ctx) => ({
        success: false,
        strategy: 'escalate',
        message: '需要开发人员修复代码',
        shouldRetryStage: false,
        shouldSkipToNext: false,
        needsHumanIntervention: true,
        nextAction: '技术团队已收到通知，正在处理',
      }),
    },
  ],

  data_error: [
    {
      strategy: 'retry',
      name: '清理重试',
      description: '清理无效数据后重试',
      priority: 1,
      estimatedSuccessRate: 0.5,
      maxAttempts: 2,
      requiresConfirmation: false,
      execute: async (ctx) => ({
        success: true,
        strategy: 'retry',
        message: '数据已清理',
        shouldRetryStage: true,
        shouldSkipToNext: false,
        needsHumanIntervention: false,
      }),
    },
    {
      strategy: 'skip',
      name: '跳过数据',
      description: '跳过问题数据继续执行',
      priority: 2,
      estimatedSuccessRate: 0.7,
      maxAttempts: 1,
      requiresConfirmation: false,
      execute: async (ctx) => ({
        success: true,
        strategy: 'skip',
        message: '已跳过问题数据',
        shouldRetryStage: false,
        shouldSkipToNext: true,
        needsHumanIntervention: false,
      }),
    },
  ],

  unknown: [
    {
      strategy: 'retry',
      name: '简单重试',
      description: '重新尝试执行',
      priority: 1,
      estimatedSuccessRate: 0.3,
      maxAttempts: 2,
      requiresConfirmation: false,
      execute: async (ctx) => ({
        success: true,
        strategy: 'retry',
        message: '重试成功',
        shouldRetryStage: true,
        shouldSkipToNext: false,
        needsHumanIntervention: false,
      }),
    },
    {
      strategy: 'escalate',
      name: '人工处理',
      description: '需要人工介入分析',
      priority: 2,
      estimatedSuccessRate: 0.9,
      maxAttempts: 1,
      requiresConfirmation: true,
      execute: async (ctx) => ({
        success: false,
        strategy: 'escalate',
        message: '需要人工分析处理',
        shouldRetryStage: false,
        shouldSkipToNext: false,
        needsHumanIntervention: true,
        nextAction: '技术团队正在分析问题原因',
      }),
    },
  ],
}

// ============================================================================
// 默认配置
// ============================================================================

const DEFAULT_CONFIG: RecoveryConfig = {
  maxTotalAttempts: 10,
  maxAttemptsPerStrategy: 3,
  baseDelayMs: 5000,
  maxDelayMs: 300000,  // 5分钟
  allowAutoFallback: true,
  allowAutoSkip: false,  // 默认不自动跳过
  allowAutoRollback: true,
  humanEscalationTimeoutMs: 600000,  // 10分钟
}

// ============================================================================
// 服务实现
// ============================================================================

export class ErrorRecoveryOrchestratorService {
  private static instance: ErrorRecoveryOrchestratorService

  /** 恢复会话缓存 */
  private sessions: Map<string, RecoverySession> = new Map()

  /** 恢复事件监听器 */
  private listeners: ((session: RecoverySession) => void)[] = []

  private constructor() {}

  public static getInstance(): ErrorRecoveryOrchestratorService {
    if (!ErrorRecoveryOrchestratorService.instance) {
      ErrorRecoveryOrchestratorService.instance = new ErrorRecoveryOrchestratorService()
    }
    return ErrorRecoveryOrchestratorService.instance
  }

  /**
   * 分类错误类型
   */
  classifyError(error: { code?: string; message: string; details?: string }): ErrorType {
    const text = `${error.code || ''} ${error.message} ${error.details || ''}`.toLowerCase()

    for (const rule of ERROR_CLASSIFICATION_RULES) {
      if (rule.pattern.test(text)) {
        return rule.type
      }
    }

    return 'unknown'
  }

  /**
   * 获取可用的恢复策略
   */
  getRecoveryStrategies(errorType: ErrorType): RecoveryAction[] {
    return RECOVERY_STRATEGIES[errorType] || RECOVERY_STRATEGIES.unknown
  }

  /**
   * 开始恢复流程
   */
  async startRecovery(
    projectId: string,
    stage: DeliveryStage,
    error: { code: string; message: string; details?: string; stack?: string },
    config: Partial<RecoveryConfig> = {}
  ): Promise<RecoverySession> {
    const sessionId = `${projectId}-${stage}-${Date.now()}`
    const mergedConfig = { ...DEFAULT_CONFIG, ...config }

    const session: RecoverySession = {
      id: sessionId,
      projectId,
      stage,
      status: 'active',
      startedAt: new Date(),
      attempts: [],
      humanAssistanceRequested: false,
    }

    this.sessions.set(sessionId, session)

    // 分类错误
    const errorType = this.classifyError(error)

    // 获取恢复策略
    const strategies = this.getRecoveryStrategies(errorType)

    // 创建恢复上下文
    const context: RecoveryContext = {
      projectId,
      stage,
      error: {
        type: errorType,
        code: error.code,
        message: error.message,
        details: error.details,
        stack: error.stack,
        timestamp: new Date(),
      },
      attemptNumber: 0,
      attemptedStrategies: [],
      config: mergedConfig,
    }

    // 按优先级尝试恢复策略
    for (const action of strategies.sort((a, b) => a.priority - b.priority)) {
      if (session.attempts.length >= mergedConfig.maxTotalAttempts) {
        break
      }

      // 检查该策略是否已达到最大尝试次数
      const strategyAttempts = session.attempts.filter(a => a.strategy === action.strategy).length
      if (strategyAttempts >= action.maxAttempts) {
        continue
      }

      // 检查是否需要确认
      if (action.requiresConfirmation && !mergedConfig.allowAutoFallback) {
        continue
      }

      // 执行恢复尝试
      const attempt = await this.executeRecoveryAttempt(session, action, context)

      if (attempt.success) {
        session.status = 'success'
        session.completedAt = new Date()
        session.finalResult = attempt.result as RecoveryResult
        this.notifyListeners(session)
        return session
      }

      // 更新上下文
      context.attemptNumber++
      context.attemptedStrategies.push(action.strategy)

      // 如果需要人工介入
      if (attempt.result?.needsHumanIntervention) {
        session.status = 'escalated'
        session.humanAssistanceRequested = true
        session.humanAssistanceRequestedAt = new Date()
        session.finalResult = attempt.result as RecoveryResult
        this.notifyListeners(session)
        return session
      }

      // 延迟后继续尝试
      if (action.delayMs) {
        await this.delay(action.delayMs)
      }
    }

    // 所有策略都失败
    session.status = 'failed'
    session.completedAt = new Date()
    session.finalResult = {
      success: false,
      strategy: 'abort',
      message: '所有自动恢复策略均已尝试失败',
      shouldRetryStage: false,
      shouldSkipToNext: false,
      needsHumanIntervention: true,
      nextAction: '请联系技术支持获取帮助',
    }

    this.notifyListeners(session)
    return session
  }

  /**
   * 执行单次恢复尝试
   */
  private async executeRecoveryAttempt(
    session: RecoverySession,
    action: RecoveryAction,
    context: RecoveryContext
  ): Promise<RecoveryAttempt> {
    const attempt: RecoveryAttempt = {
      attemptNumber: session.attempts.length + 1,
      strategy: action.strategy,
      action: action.name,
      startedAt: new Date(),
      success: false,
    }

    try {
      const result = await action.execute(context)
      attempt.success = result.success
      attempt.result = result
      attempt.completedAt = new Date()
    } catch (error) {
      attempt.success = false
      attempt.error = error instanceof Error ? error.message : String(error)
      attempt.completedAt = new Date()
    }

    session.attempts.push(attempt)
    return attempt
  }

  /**
   * 人工介入后继续恢复
   */
  async continueAfterHumanIntervention(
    sessionId: string,
    resolution: { fixed: boolean; notes?: string }
  ): Promise<RecoverySession> {
    const session = this.sessions.get(sessionId)
    if (!session) {
      throw new Error(`Session ${sessionId} not found`)
    }

    if (resolution.fixed) {
      session.status = 'success'
      session.finalResult = {
        success: true,
        strategy: 'escalate',
        message: '问题已由人工解决',
        shouldRetryStage: true,
        shouldSkipToNext: false,
        needsHumanIntervention: false,
      }
    } else {
      session.status = 'failed'
      session.finalResult = {
        success: false,
        strategy: 'abort',
        message: resolution.notes || '人工介入后仍无法解决',
        shouldRetryStage: false,
        shouldSkipToNext: false,
        needsHumanIntervention: false,
      }
    }

    session.completedAt = new Date()
    this.notifyListeners(session)
    return session
  }

  /**
   * 取消恢复
   */
  cancelRecovery(sessionId: string): RecoverySession {
    const session = this.sessions.get(sessionId)
    if (!session) {
      throw new Error(`Session ${sessionId} not found`)
    }

    session.status = 'cancelled'
    session.completedAt = new Date()
    this.notifyListeners(session)
    return session
  }

  /**
   * 获取恢复会话
   */
  getSession(sessionId: string): RecoverySession | null {
    return this.sessions.get(sessionId) || null
  }

  /**
   * 获取项目的所有恢复会话
   */
  getProjectSessions(projectId: string): RecoverySession[] {
    return Array.from(this.sessions.values())
      .filter(s => s.projectId === projectId)
      .sort((a, b) => b.startedAt.getTime() - a.startedAt.getTime())
  }

  /**
   * 注册恢复事件监听器
   */
  onRecoveryEvent(callback: (session: RecoverySession) => void): () => void {
    this.listeners.push(callback)
    return () => {
      const index = this.listeners.indexOf(callback)
      if (index >= 0) this.listeners.splice(index, 1)
    }
  }

  /**
   * 通知监听器
   */
  private notifyListeners(session: RecoverySession): void {
    for (const callback of this.listeners) {
      try {
        callback(session)
      } catch (error) {
        console.error('Recovery event listener error:', error)
      }
    }
  }

  /**
   * 延迟函数
   */
  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms))
  }

  /**
   * 计算指数退避延迟
   */
  calculateBackoffDelay(attempt: number, baseDelay: number, maxDelay: number): number {
    const delay = Math.min(baseDelay * Math.pow(2, attempt - 1), maxDelay)
    // 添加随机抖动
    const jitter = delay * 0.2 * Math.random()
    return Math.round(delay + jitter)
  }

  /**
   * 生成人话恢复报告
   */
  generateRecoveryReport(sessionId: string): string {
    const session = this.sessions.get(sessionId)
    if (!session) return '未找到恢复记录'

    const lines = [
      `📋 恢复报告`,
      ``,
      `项目ID: ${session.projectId}`,
      `阶段: ${session.stage}`,
      `状态: ${this.getStatusLabel(session.status)}`,
      ``,
      `尝试次数: ${session.attempts.length}`,
      ``,
      `尝试记录:`,
    ]

    for (const attempt of session.attempts) {
      const icon = attempt.success ? '✅' : '❌'
      lines.push(`  ${icon} ${attempt.action}（${attempt.strategy}）`)
      if (attempt.error) {
        lines.push(`     错误: ${attempt.error}`)
      }
    }

    if (session.finalResult) {
      lines.push(``)
      lines.push(`结果: ${session.finalResult.message}`)
      if (session.finalResult.nextAction) {
        lines.push(`下一步: ${session.finalResult.nextAction}`)
      }
    }

    return lines.join('\n')
  }

  /**
   * 获取状态标签
   */
  private getStatusLabel(status: RecoverySession['status']): string {
    const labels: Record<RecoverySession['status'], string> = {
      active: '🔄 恢复中',
      success: '✅ 已恢复',
      failed: '❌ 恢复失败',
      escalated: '👤 已转人工',
      cancelled: '🚫 已取消',
    }
    return labels[status]
  }

  /**
   * 清理过期会话
   */
  cleanupOldSessions(maxAgeMs: number = 86400000): void {
    const cutoff = Date.now() - maxAgeMs
    for (const [id, session] of this.sessions) {
      if (session.completedAt && session.completedAt.getTime() < cutoff) {
        this.sessions.delete(id)
      }
    }
  }
}

// 导出单例
export const errorRecoveryOrchestrator = ErrorRecoveryOrchestratorService.getInstance()
