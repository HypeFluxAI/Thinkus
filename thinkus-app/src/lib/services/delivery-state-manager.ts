/**
 * 统一交付状态管理器
 *
 * 管理整个交付流程的状态机，确保各服务之间状态同步
 * 解决"服务各自为战、状态不统一"的问题
 */

// ============================================================================
// 类型定义
// ============================================================================

/**
 * 交付阶段（按顺序）
 */
export type DeliveryStage =
  | 'queued'           // 排队等待
  | 'initializing'     // 初始化
  | 'code_generating'  // 代码生成中
  | 'testing'          // 测试中
  | 'gate_checking'    // 门禁检查
  | 'deploying'        // 部署中
  | 'verifying'        // 验证中
  | 'configuring'      // 配置中（域名/SSL等）
  | 'data_initializing'// 数据初始化
  | 'account_creating' // 账号创建
  | 'acceptance'       // 用户验收
  | 'signing'          // 签收中
  | 'ready'            // 已就绪
  | 'delivered'        // 已交付
  | 'failed'           // 失败
  | 'recovering'       // 恢复中
  | 'cancelled'        // 已取消

/**
 * 阶段状态
 */
export type StageStatus =
  | 'pending'    // 待执行
  | 'running'    // 执行中
  | 'completed'  // 已完成
  | 'failed'     // 失败
  | 'skipped'    // 跳过
  | 'retrying'   // 重试中

/**
 * 阶段配置
 */
export interface StageConfig {
  stage: DeliveryStage
  name: string                      // 人话名称
  description: string               // 人话描述
  estimatedDuration: number         // 预估时间（秒）
  canSkip: boolean                  // 是否可跳过
  canRetry: boolean                 // 是否可重试
  maxRetries: number                // 最大重试次数
  dependencies: DeliveryStage[]     // 依赖的阶段
  nextStage?: DeliveryStage         // 下一阶段
  failureStage?: DeliveryStage      // 失败后跳转的阶段
}

/**
 * 阶段执行结果
 */
export interface StageResult {
  stage: DeliveryStage
  status: StageStatus
  startedAt: Date
  completedAt?: Date
  duration?: number                 // 实际耗时（毫秒）
  retryCount: number
  output?: Record<string, unknown>  // 阶段输出数据
  error?: {
    code: string
    message: string
    details?: string
    recoverable: boolean
  }
}

/**
 * 交付状态
 */
export interface DeliveryState {
  projectId: string
  currentStage: DeliveryStage
  previousStage?: DeliveryStage
  status: 'active' | 'paused' | 'completed' | 'failed' | 'cancelled'
  progress: number                  // 0-100
  stages: Map<DeliveryStage, StageResult>
  createdAt: Date
  updatedAt: Date
  startedAt?: Date
  completedAt?: Date
  /** 全局输出（所有阶段的汇总） */
  outputs: DeliveryOutputs
  /** 最近的错误 */
  lastError?: {
    stage: DeliveryStage
    code: string
    message: string
    occurredAt: Date
  }
  /** 人话状态摘要 */
  summary: string
  /** 预计完成时间 */
  estimatedCompletionAt?: Date
}

/**
 * 交付输出
 */
export interface DeliveryOutputs {
  // 部署相关
  productUrl?: string
  adminUrl?: string
  vercelDeploymentId?: string
  vercelProjectId?: string

  // 域名相关
  domain?: string
  subdomain?: string
  sslStatus?: string

  // 数据库相关
  databaseUri?: string
  databaseName?: string

  // 账号相关
  adminUsername?: string
  adminPassword?: string          // 临时密码
  adminEmail?: string

  // 测试相关
  testReportUrl?: string
  testPassRate?: number

  // 交付相关
  deliveryReportId?: string
  signatureId?: string
  signedAt?: Date

  // 监控相关
  statusPageUrl?: string
  monitoringUrl?: string
}

/**
 * 状态变更事件
 */
export interface StateChangeEvent {
  type: 'stage_started' | 'stage_completed' | 'stage_failed' | 'stage_retrying' |
        'status_changed' | 'progress_updated' | 'output_updated' | 'error_occurred'
  projectId: string
  previousStage?: DeliveryStage
  currentStage: DeliveryStage
  previousStatus?: string
  currentStatus: string
  progress: number
  timestamp: Date
  details?: Record<string, unknown>
}

/**
 * 状态变更回调
 */
export type StateChangeCallback = (event: StateChangeEvent) => void | Promise<void>

// ============================================================================
// 阶段配置
// ============================================================================

const STAGE_CONFIGS: StageConfig[] = [
  {
    stage: 'queued',
    name: '排队等待',
    description: '您的项目已在队列中，即将开始处理',
    estimatedDuration: 10,
    canSkip: false,
    canRetry: false,
    maxRetries: 0,
    dependencies: [],
    nextStage: 'initializing',
  },
  {
    stage: 'initializing',
    name: '初始化',
    description: '正在准备开发环境',
    estimatedDuration: 30,
    canSkip: false,
    canRetry: true,
    maxRetries: 3,
    dependencies: ['queued'],
    nextStage: 'code_generating',
  },
  {
    stage: 'code_generating',
    name: '代码生成',
    description: '正在根据您的需求生成代码',
    estimatedDuration: 300,
    canSkip: false,
    canRetry: true,
    maxRetries: 2,
    dependencies: ['initializing'],
    nextStage: 'testing',
  },
  {
    stage: 'testing',
    name: '自动测试',
    description: '正在运行自动化测试确保质量',
    estimatedDuration: 120,
    canSkip: true,
    canRetry: true,
    maxRetries: 2,
    dependencies: ['code_generating'],
    nextStage: 'gate_checking',
  },
  {
    stage: 'gate_checking',
    name: '质量门禁',
    description: '正在检查代码质量和安全性',
    estimatedDuration: 60,
    canSkip: false,
    canRetry: true,
    maxRetries: 2,
    dependencies: ['testing'],
    nextStage: 'deploying',
  },
  {
    stage: 'deploying',
    name: '部署上线',
    description: '正在将您的应用部署到服务器',
    estimatedDuration: 180,
    canSkip: false,
    canRetry: true,
    maxRetries: 3,
    dependencies: ['gate_checking'],
    nextStage: 'verifying',
    failureStage: 'recovering',
  },
  {
    stage: 'verifying',
    name: '部署验证',
    description: '正在验证部署是否成功',
    estimatedDuration: 60,
    canSkip: false,
    canRetry: true,
    maxRetries: 3,
    dependencies: ['deploying'],
    nextStage: 'configuring',
  },
  {
    stage: 'configuring',
    name: '配置服务',
    description: '正在配置域名和安全证书',
    estimatedDuration: 120,
    canSkip: true,
    canRetry: true,
    maxRetries: 2,
    dependencies: ['verifying'],
    nextStage: 'data_initializing',
  },
  {
    stage: 'data_initializing',
    name: '数据初始化',
    description: '正在初始化数据库和基础数据',
    estimatedDuration: 60,
    canSkip: true,
    canRetry: true,
    maxRetries: 2,
    dependencies: ['configuring'],
    nextStage: 'account_creating',
  },
  {
    stage: 'account_creating',
    name: '创建账号',
    description: '正在为您创建管理员账号',
    estimatedDuration: 30,
    canSkip: false,
    canRetry: true,
    maxRetries: 2,
    dependencies: ['data_initializing'],
    nextStage: 'acceptance',
  },
  {
    stage: 'acceptance',
    name: '验收确认',
    description: '等待您确认产品是否符合预期',
    estimatedDuration: 600,
    canSkip: true,
    canRetry: false,
    maxRetries: 0,
    dependencies: ['account_creating'],
    nextStage: 'signing',
  },
  {
    stage: 'signing',
    name: '签收',
    description: '请确认签收您的产品',
    estimatedDuration: 60,
    canSkip: false,
    canRetry: false,
    maxRetries: 0,
    dependencies: ['acceptance'],
    nextStage: 'ready',
  },
  {
    stage: 'ready',
    name: '已就绪',
    description: '您的产品已准备好，可以开始使用了',
    estimatedDuration: 0,
    canSkip: false,
    canRetry: false,
    maxRetries: 0,
    dependencies: ['signing'],
    nextStage: 'delivered',
  },
  {
    stage: 'delivered',
    name: '已交付',
    description: '产品已成功交付',
    estimatedDuration: 0,
    canSkip: false,
    canRetry: false,
    maxRetries: 0,
    dependencies: ['ready'],
  },
  {
    stage: 'failed',
    name: '失败',
    description: '交付过程中遇到了问题',
    estimatedDuration: 0,
    canSkip: false,
    canRetry: false,
    maxRetries: 0,
    dependencies: [],
  },
  {
    stage: 'recovering',
    name: '恢复中',
    description: '正在尝试自动恢复',
    estimatedDuration: 120,
    canSkip: false,
    canRetry: true,
    maxRetries: 3,
    dependencies: [],
    failureStage: 'failed',
  },
  {
    stage: 'cancelled',
    name: '已取消',
    description: '交付已被取消',
    estimatedDuration: 0,
    canSkip: false,
    canRetry: false,
    maxRetries: 0,
    dependencies: [],
  },
]

// 阶段顺序（用于计算进度）
const STAGE_ORDER: DeliveryStage[] = [
  'queued',
  'initializing',
  'code_generating',
  'testing',
  'gate_checking',
  'deploying',
  'verifying',
  'configuring',
  'data_initializing',
  'account_creating',
  'acceptance',
  'signing',
  'ready',
  'delivered',
]

// ============================================================================
// 服务实现
// ============================================================================

export class DeliveryStateManagerService {
  private static instance: DeliveryStateManagerService

  /** 状态缓存 */
  private stateCache: Map<string, DeliveryState> = new Map()

  /** 事件监听器 */
  private listeners: Map<string, StateChangeCallback[]> = new Map()

  /** 全局监听器 */
  private globalListeners: StateChangeCallback[] = []

  private constructor() {}

  public static getInstance(): DeliveryStateManagerService {
    if (!DeliveryStateManagerService.instance) {
      DeliveryStateManagerService.instance = new DeliveryStateManagerService()
    }
    return DeliveryStateManagerService.instance
  }

  /**
   * 创建新的交付状态
   */
  createState(projectId: string): DeliveryState {
    const state: DeliveryState = {
      projectId,
      currentStage: 'queued',
      status: 'active',
      progress: 0,
      stages: new Map(),
      createdAt: new Date(),
      updatedAt: new Date(),
      outputs: {},
      summary: '已加入队列，即将开始处理',
    }

    // 初始化所有阶段
    for (const config of STAGE_CONFIGS) {
      state.stages.set(config.stage, {
        stage: config.stage,
        status: 'pending',
        startedAt: new Date(),
        retryCount: 0,
      })
    }

    this.stateCache.set(projectId, state)

    this.emitEvent({
      type: 'status_changed',
      projectId,
      currentStage: 'queued',
      currentStatus: 'active',
      progress: 0,
      timestamp: new Date(),
    })

    return state
  }

  /**
   * 获取状态
   */
  getState(projectId: string): DeliveryState | null {
    return this.stateCache.get(projectId) || null
  }

  /**
   * 获取阶段配置
   */
  getStageConfig(stage: DeliveryStage): StageConfig | undefined {
    return STAGE_CONFIGS.find(c => c.stage === stage)
  }

  /**
   * 获取所有阶段配置
   */
  getAllStageConfigs(): StageConfig[] {
    return [...STAGE_CONFIGS]
  }

  /**
   * 开始阶段
   */
  startStage(projectId: string, stage: DeliveryStage): DeliveryState {
    const state = this.stateCache.get(projectId)
    if (!state) {
      throw new Error(`Project ${projectId} not found`)
    }

    const config = this.getStageConfig(stage)
    if (!config) {
      throw new Error(`Unknown stage: ${stage}`)
    }

    // 检查依赖
    for (const dep of config.dependencies) {
      const depResult = state.stages.get(dep)
      if (!depResult || (depResult.status !== 'completed' && depResult.status !== 'skipped')) {
        throw new Error(`Dependency ${dep} not completed`)
      }
    }

    const previousStage = state.currentStage
    state.currentStage = stage
    state.previousStage = previousStage
    state.updatedAt = new Date()

    if (!state.startedAt) {
      state.startedAt = new Date()
    }

    const stageResult = state.stages.get(stage)!
    stageResult.status = 'running'
    stageResult.startedAt = new Date()

    // 更新进度和摘要
    state.progress = this.calculateProgress(state)
    state.summary = config.description
    state.estimatedCompletionAt = this.calculateEstimatedCompletion(state)

    this.emitEvent({
      type: 'stage_started',
      projectId,
      previousStage,
      currentStage: stage,
      currentStatus: state.status,
      progress: state.progress,
      timestamp: new Date(),
    })

    return state
  }

  /**
   * 完成阶段
   */
  completeStage(
    projectId: string,
    stage: DeliveryStage,
    output?: Record<string, unknown>
  ): DeliveryState {
    const state = this.stateCache.get(projectId)
    if (!state) {
      throw new Error(`Project ${projectId} not found`)
    }

    const stageResult = state.stages.get(stage)!
    stageResult.status = 'completed'
    stageResult.completedAt = new Date()
    stageResult.duration = stageResult.completedAt.getTime() - stageResult.startedAt.getTime()

    if (output) {
      stageResult.output = output
      // 合并到全局输出
      Object.assign(state.outputs, output)
    }

    state.updatedAt = new Date()
    state.progress = this.calculateProgress(state)

    // 检查是否进入下一阶段
    const config = this.getStageConfig(stage)
    if (config?.nextStage) {
      state.summary = `${config.name}完成，准备${this.getStageConfig(config.nextStage)?.name || '下一步'}`
    }

    // 检查是否完成所有阶段
    if (stage === 'delivered') {
      state.status = 'completed'
      state.completedAt = new Date()
      state.summary = '恭喜！您的产品已成功交付'
    }

    this.emitEvent({
      type: 'stage_completed',
      projectId,
      currentStage: stage,
      currentStatus: state.status,
      progress: state.progress,
      timestamp: new Date(),
      details: output,
    })

    return state
  }

  /**
   * 阶段失败
   */
  failStage(
    projectId: string,
    stage: DeliveryStage,
    error: { code: string; message: string; details?: string; recoverable?: boolean }
  ): DeliveryState {
    const state = this.stateCache.get(projectId)
    if (!state) {
      throw new Error(`Project ${projectId} not found`)
    }

    const config = this.getStageConfig(stage)
    const stageResult = state.stages.get(stage)!

    // 检查是否可以重试
    const canRetry = config?.canRetry && stageResult.retryCount < (config?.maxRetries || 0)

    if (canRetry) {
      stageResult.status = 'retrying'
      stageResult.retryCount++
      state.summary = `${config?.name || stage}出现问题，正在重试（第${stageResult.retryCount}次）`

      this.emitEvent({
        type: 'stage_retrying',
        projectId,
        currentStage: stage,
        currentStatus: state.status,
        progress: state.progress,
        timestamp: new Date(),
        details: { retryCount: stageResult.retryCount, error },
      })
    } else {
      stageResult.status = 'failed'
      stageResult.completedAt = new Date()
      stageResult.error = {
        ...error,
        recoverable: error.recoverable ?? false,
      }

      state.lastError = {
        stage,
        code: error.code,
        message: error.message,
        occurredAt: new Date(),
      }

      // 检查是否有失败后的跳转阶段
      if (config?.failureStage) {
        state.currentStage = config.failureStage
        state.summary = `${config?.name || stage}失败，正在尝试恢复`
      } else {
        state.status = 'failed'
        state.currentStage = 'failed'
        state.summary = `${config?.name || stage}失败：${error.message}`
      }

      this.emitEvent({
        type: 'stage_failed',
        projectId,
        currentStage: stage,
        currentStatus: state.status,
        progress: state.progress,
        timestamp: new Date(),
        details: { error },
      })

      this.emitEvent({
        type: 'error_occurred',
        projectId,
        currentStage: stage,
        currentStatus: state.status,
        progress: state.progress,
        timestamp: new Date(),
        details: { error },
      })
    }

    state.updatedAt = new Date()
    return state
  }

  /**
   * 跳过阶段
   */
  skipStage(projectId: string, stage: DeliveryStage, reason?: string): DeliveryState {
    const state = this.stateCache.get(projectId)
    if (!state) {
      throw new Error(`Project ${projectId} not found`)
    }

    const config = this.getStageConfig(stage)
    if (!config?.canSkip) {
      throw new Error(`Stage ${stage} cannot be skipped`)
    }

    const stageResult = state.stages.get(stage)!
    stageResult.status = 'skipped'
    stageResult.completedAt = new Date()
    if (reason) {
      stageResult.output = { skipReason: reason }
    }

    state.updatedAt = new Date()
    state.progress = this.calculateProgress(state)

    return state
  }

  /**
   * 暂停交付
   */
  pauseDelivery(projectId: string): DeliveryState {
    const state = this.stateCache.get(projectId)
    if (!state) {
      throw new Error(`Project ${projectId} not found`)
    }

    const previousStatus = state.status
    state.status = 'paused'
    state.updatedAt = new Date()
    state.summary = '交付已暂停'

    this.emitEvent({
      type: 'status_changed',
      projectId,
      currentStage: state.currentStage,
      previousStatus,
      currentStatus: 'paused',
      progress: state.progress,
      timestamp: new Date(),
    })

    return state
  }

  /**
   * 恢复交付
   */
  resumeDelivery(projectId: string): DeliveryState {
    const state = this.stateCache.get(projectId)
    if (!state) {
      throw new Error(`Project ${projectId} not found`)
    }

    const previousStatus = state.status
    state.status = 'active'
    state.updatedAt = new Date()

    const config = this.getStageConfig(state.currentStage)
    state.summary = config?.description || '交付已恢复'

    this.emitEvent({
      type: 'status_changed',
      projectId,
      currentStage: state.currentStage,
      previousStatus,
      currentStatus: 'active',
      progress: state.progress,
      timestamp: new Date(),
    })

    return state
  }

  /**
   * 取消交付
   */
  cancelDelivery(projectId: string, reason?: string): DeliveryState {
    const state = this.stateCache.get(projectId)
    if (!state) {
      throw new Error(`Project ${projectId} not found`)
    }

    const previousStatus = state.status
    state.status = 'cancelled'
    state.currentStage = 'cancelled'
    state.updatedAt = new Date()
    state.summary = reason || '交付已取消'

    this.emitEvent({
      type: 'status_changed',
      projectId,
      currentStage: 'cancelled',
      previousStatus,
      currentStatus: 'cancelled',
      progress: state.progress,
      timestamp: new Date(),
      details: { reason },
    })

    return state
  }

  /**
   * 更新输出
   */
  updateOutputs(projectId: string, outputs: Partial<DeliveryOutputs>): DeliveryState {
    const state = this.stateCache.get(projectId)
    if (!state) {
      throw new Error(`Project ${projectId} not found`)
    }

    Object.assign(state.outputs, outputs)
    state.updatedAt = new Date()

    this.emitEvent({
      type: 'output_updated',
      projectId,
      currentStage: state.currentStage,
      currentStatus: state.status,
      progress: state.progress,
      timestamp: new Date(),
      details: { outputs },
    })

    return state
  }

  /**
   * 计算进度
   */
  private calculateProgress(state: DeliveryState): number {
    const completedStages = STAGE_ORDER.filter(stage => {
      const result = state.stages.get(stage)
      return result?.status === 'completed' || result?.status === 'skipped'
    })

    // 当前阶段的部分进度
    const currentIndex = STAGE_ORDER.indexOf(state.currentStage)
    const currentStageResult = state.stages.get(state.currentStage)
    const currentStagePartial = currentStageResult?.status === 'running' ? 0.5 : 0

    const progress = ((completedStages.length + currentStagePartial) / STAGE_ORDER.length) * 100
    return Math.min(100, Math.round(progress))
  }

  /**
   * 计算预计完成时间
   */
  private calculateEstimatedCompletion(state: DeliveryState): Date {
    const currentIndex = STAGE_ORDER.indexOf(state.currentStage)
    let remainingSeconds = 0

    for (let i = currentIndex; i < STAGE_ORDER.length; i++) {
      const stage = STAGE_ORDER[i]
      const config = this.getStageConfig(stage)
      const result = state.stages.get(stage)

      if (result?.status !== 'completed' && result?.status !== 'skipped') {
        remainingSeconds += config?.estimatedDuration || 60
      }
    }

    return new Date(Date.now() + remainingSeconds * 1000)
  }

  /**
   * 注册事件监听器（特定项目）
   */
  onStateChange(projectId: string, callback: StateChangeCallback): () => void {
    if (!this.listeners.has(projectId)) {
      this.listeners.set(projectId, [])
    }
    this.listeners.get(projectId)!.push(callback)

    return () => {
      const list = this.listeners.get(projectId)
      if (list) {
        const index = list.indexOf(callback)
        if (index >= 0) list.splice(index, 1)
      }
    }
  }

  /**
   * 注册全局事件监听器
   */
  onAnyStateChange(callback: StateChangeCallback): () => void {
    this.globalListeners.push(callback)

    return () => {
      const index = this.globalListeners.indexOf(callback)
      if (index >= 0) this.globalListeners.splice(index, 1)
    }
  }

  /**
   * 发送事件
   */
  private emitEvent(event: StateChangeEvent): void {
    // 项目特定监听器
    const listeners = this.listeners.get(event.projectId)
    if (listeners) {
      for (const callback of listeners) {
        try {
          const result = callback(event)
          if (result instanceof Promise) {
            result.catch(err => console.error('Event listener error:', err))
          }
        } catch (error) {
          console.error('Event listener error:', error)
        }
      }
    }

    // 全局监听器
    for (const callback of this.globalListeners) {
      try {
        const result = callback(event)
        if (result instanceof Promise) {
          result.catch(err => console.error('Global event listener error:', err))
        }
      } catch (error) {
        console.error('Global event listener error:', error)
      }
    }
  }

  /**
   * 获取人话状态摘要
   */
  getHumanSummary(projectId: string): string {
    const state = this.stateCache.get(projectId)
    if (!state) return '未找到项目'

    const lines = [
      `📊 交付进度：${state.progress}%`,
      `📍 当前阶段：${this.getStageConfig(state.currentStage)?.name || state.currentStage}`,
      `📝 状态说明：${state.summary}`,
    ]

    if (state.estimatedCompletionAt && state.status === 'active') {
      const remaining = Math.max(0, state.estimatedCompletionAt.getTime() - Date.now())
      const minutes = Math.ceil(remaining / 60000)
      lines.push(`⏱️ 预计剩余：${minutes}分钟`)
    }

    if (state.lastError) {
      lines.push(`⚠️ 最近问题：${state.lastError.message}`)
    }

    return lines.join('\n')
  }

  /**
   * 获取阶段列表（用于UI展示）
   */
  getStagesForDisplay(projectId: string): Array<{
    stage: DeliveryStage
    name: string
    status: StageStatus
    isCurrent: boolean
    progress: number
    duration?: number
    error?: string
  }> {
    const state = this.stateCache.get(projectId)
    if (!state) return []

    return STAGE_ORDER.map(stage => {
      const config = this.getStageConfig(stage)
      const result = state.stages.get(stage)

      return {
        stage,
        name: config?.name || stage,
        status: result?.status || 'pending',
        isCurrent: state.currentStage === stage,
        progress: result?.status === 'completed' ? 100 :
                  result?.status === 'running' ? 50 : 0,
        duration: result?.duration,
        error: result?.error?.message,
      }
    })
  }

  /**
   * 清理缓存
   */
  clearCache(projectId?: string): void {
    if (projectId) {
      this.stateCache.delete(projectId)
      this.listeners.delete(projectId)
    } else {
      this.stateCache.clear()
      this.listeners.clear()
    }
  }
}

// 导出单例
export const deliveryStateManager = DeliveryStateManagerService.getInstance()
