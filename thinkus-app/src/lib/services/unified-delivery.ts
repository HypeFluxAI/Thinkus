/**
 * 统一交付入口服务
 *
 * 串联所有交付服务，提供一键完成全流程的能力
 * - 一键启动完整交付
 * - 实时进度追踪
 * - 断点续传
 * - 失败自动重试
 */

import { acceptanceTester } from './acceptance-tester'
import { deliveryChecklist } from './delivery-checklist'
import { oneClickDelivery } from './one-click-delivery'
import { userOnboarding } from './user-onboarding'
import { userActivityTracker } from './user-activity-tracker'
import { autoOps } from './auto-ops'
import { satisfactionCollector } from './satisfaction-collector'

// ============================================================================
// 类型定义
// ============================================================================

/** 交付流程阶段 */
export type DeliveryFlowStage =
  | 'init'              // 初始化
  | 'acceptance_test'   // 验收测试
  | 'pre_checklist'     // 交付前检查
  | 'deployment'        // 部署上线
  | 'account_setup'     // 账号设置
  | 'notification'      // 通知用户
  | 'monitoring_setup'  // 监控配置
  | 'survey_setup'      // 满意度调查
  | 'completed'         // 完成

/** 阶段状态 */
export type StageStatus = 'pending' | 'running' | 'completed' | 'failed' | 'skipped'

/** 流程阶段 */
export interface FlowStage {
  stage: DeliveryFlowStage
  name: string
  description: string
  status: StageStatus
  progress: number
  startedAt?: Date
  completedAt?: Date
  error?: string
  result?: unknown
  canSkip: boolean
  canRetry: boolean
}

/** 交付流程配置 */
export interface DeliveryFlowConfig {
  projectId: string
  projectName: string
  productType: string

  // 用户信息
  clientName: string
  clientEmail: string
  clientPhone?: string

  // 部署配置
  customDomain?: string
  enableBackup?: boolean
  enableMonitoring?: boolean

  // 通知配置
  notifyChannels: ('email' | 'sms')[]
  sendWelcomeEmail: boolean
  scheduleSurvey: boolean

  // 高级选项
  skipAcceptanceTest?: boolean
  skipChecklist?: boolean
  autoRetryOnFailure?: boolean
  maxRetries?: number
}

/** 交付流程状态 */
export interface DeliveryFlowState {
  id: string
  config: DeliveryFlowConfig
  stages: FlowStage[]
  currentStage: DeliveryFlowStage
  overallProgress: number
  status: 'idle' | 'running' | 'paused' | 'completed' | 'failed'
  startedAt?: Date
  completedAt?: Date
  pausedAt?: Date
  resumedAt?: Date

  // 输出结果
  outputs: {
    productUrl?: string
    adminUrl?: string
    adminCredentials?: {
      email: string
      tempPassword: string
    }
    statusPageUrl?: string
    surveyId?: string
  }

  // 统计
  stats: {
    totalStages: number
    completedStages: number
    failedStages: number
    skippedStages: number
    totalTimeMs: number
  }
}

/** 进度回调 */
export type ProgressCallback = (state: DeliveryFlowState) => void

// ============================================================================
// 阶段配置
// ============================================================================

const STAGE_CONFIG: Record<DeliveryFlowStage, {
  name: string
  description: string
  icon: string
  order: number
  canSkip: boolean
  canRetry: boolean
  estimatedMinutes: number
}> = {
  init: {
    name: '初始化',
    description: '准备交付环境',
    icon: '🚀',
    order: 0,
    canSkip: false,
    canRetry: true,
    estimatedMinutes: 1
  },
  acceptance_test: {
    name: '验收测试',
    description: '自动化功能验收',
    icon: '🧪',
    order: 1,
    canSkip: true,
    canRetry: true,
    estimatedMinutes: 5
  },
  pre_checklist: {
    name: '交付检查',
    description: '检查所有交付条件',
    icon: '📋',
    order: 2,
    canSkip: true,
    canRetry: true,
    estimatedMinutes: 2
  },
  deployment: {
    name: '部署上线',
    description: '部署到生产环境',
    icon: '🌐',
    order: 3,
    canSkip: false,
    canRetry: true,
    estimatedMinutes: 10
  },
  account_setup: {
    name: '账号设置',
    description: '创建用户管理账号',
    icon: '👤',
    order: 4,
    canSkip: false,
    canRetry: true,
    estimatedMinutes: 2
  },
  notification: {
    name: '通知用户',
    description: '发送交付通知',
    icon: '📧',
    order: 5,
    canSkip: false,
    canRetry: true,
    estimatedMinutes: 1
  },
  monitoring_setup: {
    name: '监控配置',
    description: '配置运维监控',
    icon: '📊',
    order: 6,
    canSkip: true,
    canRetry: true,
    estimatedMinutes: 2
  },
  survey_setup: {
    name: '满意度调查',
    description: '设置满意度调查',
    icon: '⭐',
    order: 7,
    canSkip: true,
    canRetry: true,
    estimatedMinutes: 1
  },
  completed: {
    name: '交付完成',
    description: '交付流程完成',
    icon: '✅',
    order: 8,
    canSkip: false,
    canRetry: false,
    estimatedMinutes: 0
  }
}

// ============================================================================
// 辅助函数
// ============================================================================

function generateId(): string {
  return `flow-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`
}

function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms))
}

// ============================================================================
// 统一交付服务
// ============================================================================

export class UnifiedDeliveryService {
  // 存储流程状态
  private flows: Map<string, DeliveryFlowState> = new Map()

  /**
   * 创建交付流程
   */
  createFlow(config: DeliveryFlowConfig): DeliveryFlowState {
    const id = generateId()

    // 初始化所有阶段
    const stages: FlowStage[] = Object.entries(STAGE_CONFIG)
      .sort((a, b) => a[1].order - b[1].order)
      .map(([stage, cfg]) => ({
        stage: stage as DeliveryFlowStage,
        name: cfg.name,
        description: cfg.description,
        status: 'pending' as StageStatus,
        progress: 0,
        canSkip: cfg.canSkip,
        canRetry: cfg.canRetry
      }))

    const state: DeliveryFlowState = {
      id,
      config,
      stages,
      currentStage: 'init',
      overallProgress: 0,
      status: 'idle',
      outputs: {},
      stats: {
        totalStages: stages.length - 1, // 不计completed阶段
        completedStages: 0,
        failedStages: 0,
        skippedStages: 0,
        totalTimeMs: 0
      }
    }

    this.flows.set(id, state)
    return state
  }

  /**
   * 启动交付流程
   */
  async startFlow(
    flowId: string,
    onProgress?: ProgressCallback
  ): Promise<DeliveryFlowState> {
    const state = this.flows.get(flowId)
    if (!state) {
      throw new Error(`流程 ${flowId} 不存在`)
    }

    state.status = 'running'
    state.startedAt = new Date()

    const notify = () => {
      state.overallProgress = this.calculateOverallProgress(state)
      onProgress?.(state)
    }

    try {
      // 1. 初始化
      await this.runStage(state, 'init', async () => {
        // 验证配置
        if (!state.config.projectId || !state.config.clientEmail) {
          throw new Error('缺少必要配置')
        }
        return { validated: true }
      }, notify)

      // 2. 验收测试
      if (!state.config.skipAcceptanceTest) {
        await this.runStage(state, 'acceptance_test', async () => {
          const report = await acceptanceTester.runAcceptanceTest(
            state.config.projectId,
            state.config.projectName,
            state.config.productType,
            {}, // 使用默认配置
            (message, progress) => {
              const stage = state.stages.find(s => s.stage === 'acceptance_test')
              if (stage) stage.progress = progress
              notify()
            }
          )
          return report
        }, notify)
      } else {
        this.skipStage(state, 'acceptance_test')
        notify()
      }

      // 3. 交付前检查
      if (!state.config.skipChecklist) {
        await this.runStage(state, 'pre_checklist', async () => {
          const checklist = deliveryChecklist.createChecklist(
            state.config.projectId,
            state.config.projectName
          )
          const result = await deliveryChecklist.runAutomaticChecks(
            checklist,
            (item, progress) => {
              const stage = state.stages.find(s => s.stage === 'pre_checklist')
              if (stage) stage.progress = progress
              notify()
            }
          )

          // 如果有阻塞项，抛出错误
          if (result.overallStatus === 'not_ready' && result.blockers.length > 0) {
            throw new Error(`交付检查未通过: ${result.blockers[0]}`)
          }

          return result
        }, notify)
      } else {
        this.skipStage(state, 'pre_checklist')
        notify()
      }

      // 4. 部署上线
      await this.runStage(state, 'deployment', async () => {
        const deliveryConfig: import('./one-click-delivery').DeliveryConfig = {
          projectId: state.config.projectId,
          projectName: state.config.projectName,
          productType: state.config.productType,
          baseUrl: 'https://example.com', // 实际应从配置获取
          adminEmail: state.config.clientEmail,
          customDomain: state.config.customDomain,
          enableMonitoring: state.config.enableMonitoring ?? true,
          enableBackup: state.config.enableBackup ?? true,
          enableTutorial: true,
          notifyOnComplete: true
        }

        const result = await oneClickDelivery.executeDelivery(
          deliveryConfig,
          (step, progress) => {
            const flowStage = state.stages.find(s => s.stage === 'deployment')
            if (flowStage) flowStage.progress = progress
            notify()
          }
        )

        // 保存输出
        state.outputs.productUrl = result.outputs.productUrl
        state.outputs.adminUrl = result.outputs.adminUrl

        return result
      }, notify)

      // 5. 账号设置
      await this.runStage(state, 'account_setup', async () => {
        const result = await userOnboarding.createAccount(
          state.config.projectId,
          {
            email: state.config.clientEmail,
            displayName: state.config.clientName,
            type: 'admin',
            phone: state.config.clientPhone,
            sendWelcomeEmail: state.config.sendWelcomeEmail ?? true,
            sendSms: false,
            generateSecureLink: false
          }
        )

        state.outputs.adminCredentials = {
          email: result.account.email,
          tempPassword: result.credentials.tempPassword
        }

        return result
      }, notify)

      // 6. 通知用户
      await this.runStage(state, 'notification', async () => {
        if (state.config.sendWelcomeEmail && state.outputs.adminCredentials) {
          const account: import('./user-onboarding').UserAccount = {
            id: generateId(),
            projectId: state.config.projectId,
            email: state.outputs.adminCredentials.email,
            tempPassword: state.outputs.adminCredentials.tempPassword,
            type: 'admin',
            status: 'pending',
            displayName: state.config.clientName,
            createdAt: new Date(),
            mustChangePassword: true,
            loginAttempts: 0,
            notificationSent: false
          }

          await userOnboarding.sendWelcomeNotification(
            account,
            state.outputs.adminUrl || '',
            'email'
          )
        }

        return { notified: true }
      }, notify)

      // 7. 监控配置
      if (state.config.enableMonitoring) {
        await this.runStage(state, 'monitoring_setup', async () => {
          // 注册运维监控
          autoOps.registerProject({
            projectId: state.config.projectId,
            productUrl: state.outputs.productUrl || '',
            adminUrl: state.outputs.adminUrl || '',
            monitoringEnabled: true,
            autoHealingEnabled: true,
            alertChannels: ['email'],
            alertEmails: [state.config.clientEmail],
            checkIntervalMinutes: 5,
            sslExpiryWarningDays: 30,
            storageWarningPercent: 80,
            responseTimeWarningMs: 3000,
            errorRateWarningPercent: 5
          })

          // 注册活跃度追踪
          await userActivityTracker.recordAction(
            state.config.projectId,
            state.config.clientEmail,
            'login',
            '首次交付'
          )

          // 生成状态页URL
          state.outputs.statusPageUrl = `${state.outputs.productUrl}/status`

          return { monitoringEnabled: true }
        }, notify)
      } else {
        this.skipStage(state, 'monitoring_setup')
        notify()
      }

      // 8. 满意度调查
      if (state.config.scheduleSurvey) {
        await this.runStage(state, 'survey_setup', async () => {
          const survey = satisfactionCollector.createSurvey({
            projectId: state.config.projectId,
            userId: state.config.clientEmail,
            userEmail: state.config.clientEmail,
            userName: state.config.clientName,
            triggerEvent: 'delivery'
          })

          state.outputs.surveyId = survey.id

          return survey
        }, notify)
      } else {
        this.skipStage(state, 'survey_setup')
        notify()
      }

      // 9. 完成
      await this.runStage(state, 'completed', async () => {
        return {
          completedAt: new Date(),
          outputs: state.outputs
        }
      }, notify)

      state.status = 'completed'
      state.completedAt = new Date()
      state.stats.totalTimeMs = state.completedAt.getTime() - state.startedAt!.getTime()

    } catch (error) {
      state.status = 'failed'

      // 自动重试
      if (state.config.autoRetryOnFailure) {
        const maxRetries = state.config.maxRetries || 3
        const currentStage = state.stages.find(s => s.stage === state.currentStage)

        if (currentStage && currentStage.canRetry) {
          // 这里可以实现重试逻辑
          console.log(`[交付流程] 阶段 ${state.currentStage} 失败，可重试`)
        }
      }
    }

    notify()
    return state
  }

  /**
   * 执行单个阶段
   */
  private async runStage(
    state: DeliveryFlowState,
    stageName: DeliveryFlowStage,
    executor: () => Promise<unknown>,
    notify: () => void
  ): Promise<void> {
    const stage = state.stages.find(s => s.stage === stageName)
    if (!stage) return

    state.currentStage = stageName
    stage.status = 'running'
    stage.startedAt = new Date()
    stage.progress = 0
    notify()

    try {
      const result = await executor()
      stage.result = result
      stage.status = 'completed'
      stage.progress = 100
      stage.completedAt = new Date()
      state.stats.completedStages++
    } catch (error) {
      stage.status = 'failed'
      stage.error = error instanceof Error ? error.message : '未知错误'
      state.stats.failedStages++
      throw error
    }

    notify()
  }

  /**
   * 跳过阶段
   */
  private skipStage(state: DeliveryFlowState, stageName: DeliveryFlowStage): void {
    const stage = state.stages.find(s => s.stage === stageName)
    if (stage) {
      stage.status = 'skipped'
      stage.progress = 100
      state.stats.skippedStages++
    }
  }

  /**
   * 计算总体进度
   */
  private calculateOverallProgress(state: DeliveryFlowState): number {
    const totalWeight = state.stages.length - 1  // 不计completed
    let completedWeight = 0

    for (const stage of state.stages) {
      if (stage.stage === 'completed') continue

      if (stage.status === 'completed' || stage.status === 'skipped') {
        completedWeight += 1
      } else if (stage.status === 'running') {
        completedWeight += stage.progress / 100
      }
    }

    return Math.round((completedWeight / totalWeight) * 100)
  }

  /**
   * 暂停流程
   */
  pauseFlow(flowId: string): DeliveryFlowState | null {
    const state = this.flows.get(flowId)
    if (!state || state.status !== 'running') return null

    state.status = 'paused'
    state.pausedAt = new Date()
    return state
  }

  /**
   * 恢复流程
   */
  async resumeFlow(flowId: string, onProgress?: ProgressCallback): Promise<DeliveryFlowState | null> {
    const state = this.flows.get(flowId)
    if (!state || state.status !== 'paused') return null

    state.status = 'running'
    state.resumedAt = new Date()

    // 从当前阶段继续
    // 实际实现中需要保存更多上下文
    return this.startFlow(flowId, onProgress)
  }

  /**
   * 重试失败阶段
   */
  async retryFailedStage(flowId: string, onProgress?: ProgressCallback): Promise<DeliveryFlowState | null> {
    const state = this.flows.get(flowId)
    if (!state) return null

    const failedStage = state.stages.find(s => s.status === 'failed')
    if (!failedStage || !failedStage.canRetry) return null

    // 重置失败阶段
    failedStage.status = 'pending'
    failedStage.error = undefined
    failedStage.progress = 0
    state.stats.failedStages--

    // 重新启动流程
    return this.startFlow(flowId, onProgress)
  }

  /**
   * 获取流程状态
   */
  getFlow(flowId: string): DeliveryFlowState | null {
    return this.flows.get(flowId) || null
  }

  /**
   * 获取所有流程
   */
  getAllFlows(): DeliveryFlowState[] {
    return Array.from(this.flows.values())
  }

  /**
   * 获取阶段配置
   */
  getStageConfig() {
    return STAGE_CONFIG
  }

  /**
   * 生成交付摘要
   */
  generateDeliverySummary(state: DeliveryFlowState): string {
    let summary = `# 交付报告\n\n`

    summary += `**项目**: ${state.config.projectName}\n`
    summary += `**客户**: ${state.config.clientName}\n`
    summary += `**状态**: ${state.status === 'completed' ? '✅ 已完成' : state.status === 'failed' ? '❌ 失败' : '🔄 进行中'}\n\n`

    if (state.outputs.productUrl) {
      summary += `## 交付产物\n\n`
      summary += `- 🌐 产品地址: ${state.outputs.productUrl}\n`
      summary += `- 🔧 管理后台: ${state.outputs.adminUrl}\n`
      if (state.outputs.statusPageUrl) {
        summary += `- 📊 状态页面: ${state.outputs.statusPageUrl}\n`
      }
      summary += '\n'
    }

    if (state.outputs.adminCredentials) {
      summary += `## 管理员账号\n\n`
      summary += `- 邮箱: ${state.outputs.adminCredentials.email}\n`
      summary += `- 临时密码: ${state.outputs.adminCredentials.tempPassword}\n`
      summary += `- ⚠️ 首次登录请修改密码\n\n`
    }

    summary += `## 流程进度\n\n`
    for (const stage of state.stages) {
      const cfg = STAGE_CONFIG[stage.stage]
      const statusIcon = {
        pending: '⏳',
        running: '🔄',
        completed: '✅',
        failed: '❌',
        skipped: '⏭️'
      }
      summary += `- ${statusIcon[stage.status]} ${cfg.icon} ${stage.name}\n`
      if (stage.error) {
        summary += `  - 错误: ${stage.error}\n`
      }
    }

    summary += `\n## 统计\n\n`
    summary += `- 完成阶段: ${state.stats.completedStages}/${state.stats.totalStages}\n`
    summary += `- 跳过阶段: ${state.stats.skippedStages}\n`
    summary += `- 失败阶段: ${state.stats.failedStages}\n`
    summary += `- 总耗时: ${Math.round(state.stats.totalTimeMs / 1000 / 60)} 分钟\n`

    return summary
  }
}

// 导出单例
export const unifiedDelivery = new UnifiedDeliveryService()
