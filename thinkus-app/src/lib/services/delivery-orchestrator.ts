/**
 * 统一交付编排器
 * 整合所有交付服务，实现完整的自动化交付流程
 * 使用 MongoDB 持久化存储
 */

import { Types } from 'mongoose'
import crypto from 'crypto'
import {
  DeliverySession,
  type IDeliverySession,
  type DeliveryStage,
  type DeliveryOutputs,
  type DeliveryConfig,
} from '@/lib/db/models/delivery-session'
import {
  DeliveryEvent,
  type DeliveryEventType,
  type EventLevel,
} from '@/lib/db/models/delivery-event'
import {
  AcceptanceSession,
  type IAcceptanceSession,
  type AcceptanceCheckItem,
} from '@/lib/db/models/acceptance-session'
import {
  DeliveryReport,
  type IDeliveryReport,
} from '@/lib/db/models/delivery-report'
import {
  VercelDeployerService,
  type VercelDeployConfig,
  type DeployProgressCallback,
} from './vercel-deployer'
import {
  PlaywrightTesterService,
  type E2ETestConfig,
  type E2ETestReport,
  type TestScenario,
  DEFAULT_TEST_SCENARIOS,
  ECOMMERCE_TEST_SCENARIOS,
} from './playwright-tester'
import {
  EmailNotifierService,
} from './email-notifier'

// 产品类型
export type ProductType = 'web-app' | 'ecommerce' | 'saas' | 'landing' | 'blog' | 'other'

// 交付流程配置
export interface DeliveryOrchestratorConfig {
  projectId: string
  userId: string
  projectName: string
  productType: ProductType
  sourceDirectory: string
  clientEmail: string
  clientName?: string

  // 部署配置
  vercelConfig?: Partial<VercelDeployConfig>
  customDomain?: string
  envVars?: Record<string, string>

  // 测试配置
  testConfig?: Partial<E2ETestConfig>
  customTestScenarios?: TestScenario[]
  skipTests?: boolean

  // 验收配置
  acceptanceTimeoutHours?: number
  skipAcceptance?: boolean
  autoSign?: boolean

  // 通知配置
  notifyOnComplete?: boolean
  notifyOnFailure?: boolean
  notifyChannels?: ('email' | 'sms')[]
}

// 进度回调
export type DeliveryProgressCallback = (event: {
  sessionId: string
  stage: DeliveryStage
  progress: number
  message: string
  messageZh: string
  data?: Record<string, unknown>
}) => void

// 交付结果
export interface DeliveryResult {
  success: boolean
  sessionId: string
  productUrl?: string
  adminUrl?: string
  credentials?: {
    username: string
    password: string
  }
  testReport?: E2ETestReport
  acceptanceUrl?: string
  error?: string
  duration: number
}

// 必需的环境变量配置
const REQUIRED_ENV_VARS = {
  // Vercel 部署必需
  VERCEL_TOKEN: {
    required: true,
    description: 'Vercel部署需要此密钥',
    helpUrl: 'https://vercel.com/account/tokens',
    category: 'deployment',
  },
  // MongoDB 数据库
  MONGODB_URI: {
    required: true,
    description: '数据库连接需要此配置',
    helpUrl: 'https://www.mongodb.com/atlas',
    category: 'database',
  },
  // 邮件通知（可选但建议）
  SENDGRID_API_KEY: {
    required: false,
    description: '发送交付邮件需要此密钥',
    helpUrl: 'https://sendgrid.com/docs/ui/account-and-settings/api-keys/',
    category: 'notification',
  },
} as const

// 环境变量验证结果
interface EnvValidationResult {
  valid: boolean
  missing: Array<{
    name: string
    description: string
    helpUrl: string
    category: string
    required: boolean
  }>
  warnings: string[]
}

/**
 * 交付编排器
 */
export class DeliveryOrchestratorService {
  private vercelDeployer: VercelDeployerService
  private emailNotifier: EmailNotifierService
  private onProgress?: DeliveryProgressCallback

  constructor() {
    this.vercelDeployer = new VercelDeployerService()
    this.emailNotifier = new EmailNotifierService()
  }

  /**
   * 验证环境变量
   */
  validateEnvironment(): EnvValidationResult {
    const missing: EnvValidationResult['missing'] = []
    const warnings: string[] = []

    for (const [name, config] of Object.entries(REQUIRED_ENV_VARS)) {
      const value = process.env[name]
      if (!value || value.trim() === '') {
        if (config.required) {
          missing.push({
            name,
            description: config.description,
            helpUrl: config.helpUrl,
            category: config.category,
            required: true,
          })
        } else {
          warnings.push(`${config.description}（${name}未配置，部分功能可能受限）`)
        }
      }
    }

    return {
      valid: missing.length === 0,
      missing,
      warnings,
    }
  }

  /**
   * 生成环境变量错误的人话提示
   */
  private generateEnvErrorMessage(validation: EnvValidationResult): string {
    const lines = ['交付前需要配置以下环境变量：\n']

    for (const item of validation.missing) {
      lines.push(`❌ ${item.name}`)
      lines.push(`   ${item.description}`)
      lines.push(`   配置方法: ${item.helpUrl}\n`)
    }

    if (validation.warnings.length > 0) {
      lines.push('\n⚠️ 建议配置（非必需）:')
      for (const warning of validation.warnings) {
        lines.push(`   - ${warning}`)
      }
    }

    lines.push('\n请在 .env 文件中配置这些变量后重试。')
    return lines.join('\n')
  }

  /**
   * 开始交付流程
   */
  async startDelivery(
    config: DeliveryOrchestratorConfig,
    onProgress?: DeliveryProgressCallback
  ): Promise<DeliveryResult> {
    this.onProgress = onProgress
    const startTime = Date.now()

    // 验证环境变量
    const envValidation = this.validateEnvironment()
    if (!envValidation.valid) {
      const errorMessage = this.generateEnvErrorMessage(envValidation)
      return {
        success: false,
        sessionId: '',
        error: errorMessage,
        duration: Date.now() - startTime,
      }
    }

    // 创建交付会话
    const session = await this.createSession(config)
    const sessionId = session._id.toString()

    // 记录环境变量警告
    if (envValidation.warnings.length > 0) {
      await this.emitEvent(
        session,
        'system_message',
        'warning',
        'preparing',
        `Environment warnings: ${envValidation.warnings.join('; ')}`,
        `环境配置警告: ${envValidation.warnings.join('; ')}`
      )
    }

    try {
      // 阶段1: 准备
      await this.executeStage(session, 'preparing', async () => {
        await this.emitEvent(session, 'stage_started', 'info', 'preparing', 'Preparing for deployment', '正在准备部署')
        // 验证配置
        if (!config.sourceDirectory) {
          throw new Error('Source directory is required')
        }
      })

      // 阶段2: 构建
      await this.executeStage(session, 'building', async () => {
        await this.emitEvent(session, 'stage_started', 'info', 'building', 'Building project', '正在构建项目')
        // 构建在 Vercel 上执行，这里只是准备
      })

      // 阶段3: 测试（预部署检查）
      if (!config.skipTests) {
        await this.executeStage(session, 'testing', async () => {
          await this.emitEvent(session, 'stage_started', 'info', 'testing', 'Running pre-deployment checks', '正在运行预部署检查')

          // 执行预部署检查
          const preDeployChecks = await this.runPreDeploymentChecks(config.sourceDirectory)

          // 记录检查结果
          session.outputs.testReport = {
            total: preDeployChecks.totalChecks,
            passed: preDeployChecks.passedChecks,
            failed: preDeployChecks.failedChecks,
            skipped: preDeployChecks.skippedChecks,
          }
          await session.save()

          // 如果有关键检查失败，警告但不阻断（除非有阻塞性错误）
          if (preDeployChecks.failedChecks > 0) {
            await this.emitEvent(session, 'test_result', preDeployChecks.hasBlockers ? 'error' : 'warning', 'testing',
              `Pre-deployment checks: ${preDeployChecks.passedChecks}/${preDeployChecks.totalChecks} passed`,
              `预部署检查: ${preDeployChecks.passedChecks}/${preDeployChecks.totalChecks} 通过`,
              {
                checks: preDeployChecks.results,
                hasBlockers: preDeployChecks.hasBlockers,
              }
            )

            // 如果有阻塞性错误，抛出异常
            if (preDeployChecks.hasBlockers) {
              const blockerMessages = preDeployChecks.results
                .filter(r => !r.passed && r.isBlocker)
                .map(r => r.messageZh)
                .join('; ')
              throw new Error(`预部署检查失败: ${blockerMessages}`)
            }
          } else {
            await this.emitEvent(session, 'test_result', 'success', 'testing',
              `All pre-deployment checks passed (${preDeployChecks.totalChecks} checks)`,
              `所有预部署检查通过 (${preDeployChecks.totalChecks} 项检查)`,
            )
          }
        })
      } else {
        await session.updateStage('testing', 'skipped')
      }

      // 阶段4: 部署（带重试和降级策略）
      let deploymentResult: DeliveryOutputs = {}
      await this.executeStage(session, 'deploying', async () => {
        await this.emitEvent(session, 'stage_started', 'info', 'deploying', 'Deploying to Vercel', '正在部署到Vercel')

        const deployConfig: VercelDeployConfig = {
          projectName: this.sanitizeProjectName(config.projectName),
          framework: 'nextjs',
          envVars: config.envVars,
          ...config.vercelConfig,
        }

        // 部署重试配置
        const MAX_RETRIES = 3
        const BASE_DELAY_MS = 5000 // 5秒基础延迟

        let lastError: Error | null = null
        let deployment = null

        for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {
          try {
            await this.emitEvent(session, 'system_message', 'info', 'deploying',
              `Deployment attempt ${attempt}/${MAX_RETRIES}`,
              `部署尝试 ${attempt}/${MAX_RETRIES}`,
              { attempt, maxRetries: MAX_RETRIES }
            )

            deployment = await this.vercelDeployer.deployFromDirectory(
              deployConfig.projectName,
              config.sourceDirectory,
              deployConfig,
              (event) => {
                this.emitProgress(sessionId, 'deploying', event.progress, event.message, event.messageZh)
              }
            )

            // 部署成功，跳出重试循环
            lastError = null
            break
          } catch (error) {
            lastError = error instanceof Error ? error : new Error('Unknown deployment error')

            // 翻译错误为人话
            const friendlyError = this.translateDeploymentError(lastError.message)

            await this.emitEvent(session, 'error_occurred', 'warning', 'deploying',
              `Deployment attempt ${attempt} failed: ${lastError.message}`,
              `部署尝试 ${attempt} 失败: ${friendlyError}`,
              {
                attempt,
                error: lastError.message,
                friendlyError,
                willRetry: attempt < MAX_RETRIES,
              }
            )

            // 如果不是最后一次尝试，等待后重试
            if (attempt < MAX_RETRIES) {
              const delayMs = BASE_DELAY_MS * Math.pow(2, attempt - 1) // 指数退避
              await this.emitEvent(session, 'system_message', 'info', 'deploying',
                `Waiting ${delayMs / 1000} seconds before retry...`,
                `等待 ${delayMs / 1000} 秒后重试...`,
              )
              await new Promise(resolve => setTimeout(resolve, delayMs))
            }
          }
        }

        // 如果所有重试都失败
        if (lastError || !deployment) {
          const friendlyError = lastError ? this.translateDeploymentError(lastError.message) : '未知错误'
          throw new Error(`部署失败（已重试${MAX_RETRIES}次）: ${friendlyError}`)
        }

        deploymentResult = {
          productUrl: `https://${deployment.url}`,
          vercelProjectId: deployment.projectId,
          vercelDeploymentId: deployment.id,
          sslStatus: 'active',
        }

        // 更新会话输出
        session.outputs = { ...session.outputs, ...deploymentResult }
        await session.save()

        await this.emitEvent(session, 'deploy_status', 'success', 'deploying',
          `Deployed to ${deploymentResult.productUrl}`,
          `已部署到 ${deploymentResult.productUrl}`,
          { deploymentId: deployment.id, url: deploymentResult.productUrl }
        )
      })

      // 阶段5: 验证
      await this.executeStage(session, 'verifying', async () => {
        await this.emitEvent(session, 'stage_started', 'info', 'verifying', 'Verifying deployment', '正在验证部署')

        if (!config.skipTests && deploymentResult.productUrl) {
          // 运行 E2E 测试
          const testScenarios = this.getTestScenarios(config.productType, config.customTestScenarios)
          const tester = new PlaywrightTesterService({
            baseUrl: deploymentResult.productUrl,
            browsers: ['chromium'],
            devices: ['desktop', 'mobile'],
            headless: true,
            ...config.testConfig,
          })

          const testReport = await tester.runTests(testScenarios, (event) => {
            this.emitProgress(sessionId, 'verifying', event.progress, event.message, event.messageZh)
          })

          // 保存测试报告
          session.outputs.testReport = {
            total: testReport.totalTests,
            passed: testReport.totalPassed,
            failed: testReport.totalFailed,
            skipped: testReport.totalSkipped,
          }
          await session.save()

          await this.emitEvent(session, 'test_result', testReport.totalFailed > 0 ? 'warning' : 'success', 'verifying',
            `Tests completed: ${testReport.totalPassed}/${testReport.totalTests} passed`,
            `测试完成: ${testReport.totalPassed}/${testReport.totalTests} 通过`,
            { testReport: session.outputs.testReport }
          )

          // 如果有关键测试失败，警告但不阻断
          if (testReport.totalFailed > 0) {
            await this.emitEvent(session, 'error_occurred', 'warning', 'verifying',
              `${testReport.totalFailed} tests failed`,
              `${testReport.totalFailed} 个测试失败`,
            )
          }

          // 门禁检查：验证测试结果是否达到可交付标准
          const gateResult = this.runQualityGateCheck(testReport)
          await this.emitEvent(session, 'system_message', gateResult.passed ? 'success' : 'warning', 'verifying',
            gateResult.passed ? 'Quality gate passed' : `Quality gate warning: ${gateResult.message}`,
            gateResult.passed ? '质量门禁检查通过' : `质量门禁警告: ${gateResult.messageZh}`,
            { gateResult }
          )

          // 如果门禁检查严重失败，记录但继续（可配置为阻止）
          if (gateResult.severity === 'critical' && !config.skipTests) {
            await this.emitEvent(session, 'error_occurred', 'error', 'verifying',
              `Critical quality issues detected: ${gateResult.message}`,
              `检测到严重质量问题: ${gateResult.messageZh}`,
            )
            // 可选：如果配置了严格模式，抛出异常阻止交付
            // throw new Error(`质量门禁检查失败: ${gateResult.messageZh}`)
          }
        }
      })

      // 阶段6: 配置
      await this.executeStage(session, 'configuring', async () => {
        await this.emitEvent(session, 'stage_started', 'info', 'configuring', 'Configuring services', '正在配置服务')

        // 生成管理员凭证
        const credentials = this.generateCredentials()
        session.outputs.credentials = {
          username: credentials.username,
          passwordHash: this.hashPassword(credentials.password),
          tempPassword: credentials.password, // 临时存储原始密码，用于发送邮件
          tempPasswordSent: false,
        }

        // 设置管理员 URL
        if (deploymentResult.productUrl) {
          session.outputs.adminUrl = `${deploymentResult.productUrl}/admin`
        }

        // 配置自定义域名
        if (config.customDomain && deploymentResult.vercelProjectId) {
          try {
            await this.vercelDeployer.addDomain(deploymentResult.vercelProjectId, config.customDomain)
            session.outputs.domain = config.customDomain
          } catch (error) {
            await this.emitEvent(session, 'error_occurred', 'warning', 'configuring',
              `Failed to configure domain: ${error instanceof Error ? error.message : 'Unknown error'}`,
              `域名配置失败: ${error instanceof Error ? error.message : '未知错误'}`,
            )
          }
        }

        await session.save()
      })

      // 阶段7: 通知
      await this.executeStage(session, 'notifying', async () => {
        await this.emitEvent(session, 'stage_started', 'info', 'notifying', 'Sending notifications', '正在发送通知')

        if (config.notifyOnComplete !== false && config.clientEmail) {
          // 发送交付完成邮件
          const credentials = session.outputs.credentials
          const result = await this.emailNotifier.sendDeliveryComplete(config.clientEmail, {
            projectName: config.projectName,
            productUrl: session.outputs.productUrl || '',
            adminUrl: session.outputs.adminUrl,
            credentials: credentials?.tempPassword ? {
              username: credentials.username,
              password: credentials.tempPassword, // 使用配置阶段存储的原始密码
            } : undefined,
          })

          if (result.success) {
            session.outputs.credentials!.tempPasswordSent = true
            // 邮件发送成功后清除临时密码，保留哈希值用于验证
            delete session.outputs.credentials!.tempPassword
            await session.save()

            await this.emitEvent(session, 'notification_sent', 'success', 'notifying',
              `Delivery email sent to ${config.clientEmail}`,
              `交付邮件已发送至 ${config.clientEmail}`,
            )
          } else {
            await this.emitEvent(session, 'error_occurred', 'warning', 'notifying',
              `Failed to send email: ${result.error}`,
              `邮件发送失败: ${result.error}`,
            )
          }
        }
      })

      // 阶段8: 验收
      let acceptanceSession: IAcceptanceSession | null = null
      if (!config.skipAcceptance && !config.autoSign) {
        await this.executeStage(session, 'acceptance', async () => {
          await this.emitEvent(session, 'stage_started', 'info', 'acceptance', 'Starting acceptance period', '开始验收期')

          // 创建验收会话
          acceptanceSession = await this.createAcceptanceSession(session, config)

          const acceptanceHours = config.acceptanceTimeoutHours || 72
          const acceptanceUrl = `/projects/${config.projectId}/delivery?tab=acceptance`

          await this.emitEvent(session, 'acceptance_update', 'info', 'acceptance',
            `Acceptance period started (${acceptanceHours} hours)`,
            `验收期已开始（${acceptanceHours}小时）`,
            { acceptanceSessionId: acceptanceSession._id.toString() }
          )

          // 发送验收提醒邮件
          if (config.clientEmail) {
            const reminderResult = await this.emailNotifier.sendAcceptanceReminder(config.clientEmail, {
              projectName: config.projectName,
              productUrl: session.outputs.productUrl || '',
              acceptanceUrl: `${process.env.NEXT_PUBLIC_APP_URL || 'https://thinkus.app'}${acceptanceUrl}`,
              remainingHours: acceptanceHours,
              isWarning: false,
            })

            if (reminderResult.success) {
              await this.emitEvent(session, 'notification_sent', 'success', 'acceptance',
                `Acceptance reminder sent to ${config.clientEmail}`,
                `验收提醒已发送至 ${config.clientEmail}`,
              )
            }

            // 安排验收超时警告邮件（24小时前提醒）
            // 注意：实际实现需要使用定时任务系统，这里只是记录计划
            if (acceptanceHours > 24) {
              await this.emitEvent(session, 'system_message', 'info', 'acceptance',
                `Warning email scheduled for ${acceptanceHours - 24} hours from now`,
                `已安排在 ${acceptanceHours - 24} 小时后发送超时警告邮件`,
                {
                  warningEmailScheduledAt: new Date(Date.now() + (acceptanceHours - 24) * 60 * 60 * 1000).toISOString(),
                  warningEmailType: 'acceptance_warning',
                }
              )
            }
          }
        })
      } else {
        await session.updateStage('acceptance', 'skipped')
      }

      // 完成交付
      await session.markCompleted()

      await this.emitEvent(session, 'stage_completed', 'success', 'completed',
        'Delivery completed successfully',
        '交付完成',
        { duration: Date.now() - startTime }
      )

      // 生成交付报告
      await this.generateDeliveryReport(session, config)

      const credentials = session.outputs.credentials
      return {
        success: true,
        sessionId,
        productUrl: session.outputs.productUrl,
        adminUrl: session.outputs.adminUrl,
        credentials: credentials ? {
          username: credentials.username,
          password: '(已发送至邮箱)',
        } : undefined,
        testReport: session.outputs.testReport as unknown as E2ETestReport | undefined,
        acceptanceUrl: acceptanceSession ? `/projects/${config.projectId}/delivery?tab=acceptance` : undefined,
        duration: Date.now() - startTime,
      }

    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error'

      await session.markFailed(session.currentStage, errorMessage)

      await this.emitEvent(session, 'error_occurred', 'error', session.currentStage,
        `Delivery failed: ${errorMessage}`,
        `交付失败: ${errorMessage}`,
      )

      // 发送失败通知
      if (config.notifyOnFailure !== false && config.clientEmail) {
        await this.emailNotifier.sendErrorNotification(config.clientEmail, {
          projectName: config.projectName,
          errorType: '交付失败',
          errorMessage,
          errorTime: new Date().toLocaleString('zh-CN'),
          actionRequired: '我们的团队正在处理，您也可以联系客服获取帮助。',
        })
      }

      return {
        success: false,
        sessionId,
        error: errorMessage,
        duration: Date.now() - startTime,
      }
    }
  }

  /**
   * 获取交付状态
   */
  async getDeliveryStatus(sessionId: string): Promise<IDeliverySession | null> {
    return DeliverySession.findById(sessionId)
  }

  /**
   * 获取交付事件
   */
  async getDeliveryEvents(sessionId: string, limit = 50): Promise<ReturnType<typeof DeliveryEvent.getBySession>> {
    return DeliveryEvent.getBySession(new Types.ObjectId(sessionId), { limit })
  }

  /**
   * 暂停交付
   */
  async pauseDelivery(sessionId: string): Promise<void> {
    const session = await DeliverySession.findById(sessionId)
    if (session && session.status === 'active') {
      session.status = 'paused'
      session.currentStage = 'paused'
      await session.save()

      await this.emitEvent(session, 'system_message', 'info', 'paused',
        'Delivery paused',
        '交付已暂停',
      )
    }
  }

  /**
   * 恢复交付
   */
  async resumeDelivery(sessionId: string): Promise<void> {
    const session = await DeliverySession.findById(sessionId)
    if (session && session.status === 'paused') {
      session.status = 'active'
      // 找到最后一个未完成的阶段
      const pendingStage = session.stages.find(s => s.status === 'pending' || s.status === 'running')
      if (pendingStage) {
        session.currentStage = pendingStage.stage
      }
      await session.save()

      await this.emitEvent(session, 'system_message', 'info', session.currentStage,
        'Delivery resumed',
        '交付已恢复',
      )
    }
  }

  /**
   * 重试失败的交付
   */
  async retryDelivery(
    sessionId: string,
    config: DeliveryOrchestratorConfig,
    onProgress?: DeliveryProgressCallback
  ): Promise<DeliveryResult> {
    const oldSession = await DeliverySession.findById(sessionId)
    if (oldSession) {
      oldSession.status = 'cancelled'
      await oldSession.save()
    }

    // 创建新的交付
    return this.startDelivery(config, onProgress)
  }

  /**
   * 回滚部署
   */
  async rollbackDeployment(sessionId: string, previousDeploymentId: string): Promise<void> {
    const session = await DeliverySession.findById(sessionId)
    if (!session || !session.outputs.vercelProjectId) {
      throw new Error('Cannot rollback: no deployment found')
    }

    await this.emitEvent(session, 'rollback_triggered', 'warning', session.currentStage,
      'Initiating rollback',
      '正在回滚',
      { previousDeploymentId }
    )

    await this.vercelDeployer.rollback(session.outputs.vercelProjectId, previousDeploymentId)

    await this.emitEvent(session, 'system_message', 'success', session.currentStage,
      'Rollback completed',
      '回滚完成',
    )
  }

  // ========== 私有方法 ==========

  /**
   * 创建交付会话
   */
  private async createSession(config: DeliveryOrchestratorConfig): Promise<IDeliverySession> {
    const deliveryConfig: DeliveryConfig = {
      skipTests: config.skipTests,
      skipAcceptance: config.skipAcceptance,
      autoSign: config.autoSign,
      notifyChannels: config.notifyChannels,
      customDomain: config.customDomain,
      envVars: config.envVars,
    }

    const session = new DeliverySession({
      projectId: new Types.ObjectId(config.projectId),
      userId: new Types.ObjectId(config.userId),
      config: deliveryConfig,
      startedAt: new Date(),
      estimatedCompletionAt: new Date(Date.now() + 30 * 60 * 1000), // 预计30分钟
    })

    await session.save()
    return session
  }

  /**
   * 执行单个阶段
   */
  private async executeStage(
    session: IDeliverySession,
    stage: DeliveryStage,
    executor: () => Promise<void>
  ): Promise<void> {
    await session.updateStage(stage, 'running')
    this.emitProgress(session._id.toString(), stage, 0, `Starting ${stage}`, `开始 ${this.getStageNameZh(stage)}`)

    try {
      await executor()
      await session.updateStage(stage, 'completed')
      this.emitProgress(session._id.toString(), stage, 100, `${stage} completed`, `${this.getStageNameZh(stage)}完成`)
    } catch (error) {
      await session.updateStage(stage, 'failed', undefined, error instanceof Error ? error.message : 'Unknown error')
      throw error
    }
  }

  /**
   * 发射事件
   */
  private async emitEvent(
    session: IDeliverySession,
    type: DeliveryEventType,
    level: EventLevel,
    stage: DeliveryStage,
    message: string,
    messageZh: string,
    data?: Record<string, unknown>
  ): Promise<void> {
    await DeliveryEvent.create({
      sessionId: session._id,
      projectId: session.projectId,
      userId: session.userId,
      type,
      level,
      stage,
      message,
      messageZh,
      data,
    })
  }

  /**
   * 发射进度
   */
  private emitProgress(
    sessionId: string,
    stage: DeliveryStage,
    progress: number,
    message: string,
    messageZh: string,
    data?: Record<string, unknown>
  ): void {
    this.onProgress?.({
      sessionId,
      stage,
      progress,
      message,
      messageZh,
      data,
    })
  }

  /**
   * 创建验收会话
   */
  private async createAcceptanceSession(
    session: IDeliverySession,
    config: DeliveryOrchestratorConfig
  ): Promise<IAcceptanceSession> {
    const checkItems = this.getDefaultCheckItems(config.productType)

    const acceptanceSession = new AcceptanceSession({
      deliverySessionId: session._id,
      projectId: session.projectId,
      userId: session.userId,
      timeoutMinutes: (config.acceptanceTimeoutHours || 72) * 60,
    })

    await acceptanceSession.start(checkItems)
    return acceptanceSession
  }

  /**
   * 生成交付报告
   */
  private async generateDeliveryReport(
    session: IDeliverySession,
    config: DeliveryOrchestratorConfig
  ): Promise<IDeliveryReport> {
    const report = new DeliveryReport({
      deliverySessionId: session._id,
      projectId: session.projectId,
      userId: session.userId,
      type: 'delivery',
      title: `${config.projectName} 交付报告`,
      status: 'generated',
      data: {
        projectName: config.projectName,
        productType: config.productType,
        clientName: config.clientName,
        clientEmail: config.clientEmail,
        productUrl: session.outputs.productUrl || '',
        adminUrl: session.outputs.adminUrl,
        domain: session.outputs.domain,
        testSummary: session.outputs.testReport,
        deploySummary: {
          platform: 'Vercel',
          deploymentId: session.outputs.vercelDeploymentId || '',
          deployedAt: new Date(),
          sslStatus: session.outputs.sslStatus || 'active',
        },
      },
      generatedAt: new Date(),
    })

    await report.generateAccessCode()
    return report
  }

  /**
   * 运行预部署检查
   */
  private async runPreDeploymentChecks(sourceDirectory: string): Promise<{
    totalChecks: number
    passedChecks: number
    failedChecks: number
    skippedChecks: number
    hasBlockers: boolean
    results: Array<{
      id: string
      name: string
      nameZh: string
      passed: boolean
      message: string
      messageZh: string
      isBlocker: boolean
    }>
  }> {
    const results: Array<{
      id: string
      name: string
      nameZh: string
      passed: boolean
      message: string
      messageZh: string
      isBlocker: boolean
    }> = []

    // 检查1: 源目录存在
    const fs = await import('fs')
    const path = await import('path')

    const dirExists = fs.existsSync(sourceDirectory)
    results.push({
      id: 'source_dir',
      name: 'Source Directory',
      nameZh: '源代码目录',
      passed: dirExists,
      message: dirExists ? 'Source directory exists' : 'Source directory not found',
      messageZh: dirExists ? '源代码目录存在' : '源代码目录不存在',
      isBlocker: true,
    })

    if (!dirExists) {
      return {
        totalChecks: 1,
        passedChecks: 0,
        failedChecks: 1,
        skippedChecks: 0,
        hasBlockers: true,
        results,
      }
    }

    // 检查2: package.json 存在
    const packageJsonPath = path.join(sourceDirectory, 'package.json')
    const hasPackageJson = fs.existsSync(packageJsonPath)
    results.push({
      id: 'package_json',
      name: 'Package.json',
      nameZh: '项目配置文件',
      passed: hasPackageJson,
      message: hasPackageJson ? 'package.json found' : 'package.json not found',
      messageZh: hasPackageJson ? 'package.json 存在' : 'package.json 不存在',
      isBlocker: true,
    })

    // 检查3: 构建脚本存在
    let hasBuildScript = false
    if (hasPackageJson) {
      try {
        const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, 'utf-8'))
        hasBuildScript = !!(packageJson.scripts?.build)
        results.push({
          id: 'build_script',
          name: 'Build Script',
          nameZh: '构建脚本',
          passed: hasBuildScript,
          message: hasBuildScript ? 'Build script found' : 'No build script in package.json',
          messageZh: hasBuildScript ? '构建脚本存在' : 'package.json 中没有 build 脚本',
          isBlocker: false, // Vercel 会尝试默认构建
        })
      } catch {
        results.push({
          id: 'build_script',
          name: 'Build Script',
          nameZh: '构建脚本',
          passed: false,
          message: 'Failed to parse package.json',
          messageZh: 'package.json 解析失败',
          isBlocker: false,
        })
      }
    }

    // 检查4: 环境变量模板存在
    const envExamplePath = path.join(sourceDirectory, '.env.example')
    const hasEnvExample = fs.existsSync(envExamplePath)
    results.push({
      id: 'env_example',
      name: 'Environment Template',
      nameZh: '环境变量模板',
      passed: hasEnvExample,
      message: hasEnvExample ? '.env.example found' : 'No .env.example file',
      messageZh: hasEnvExample ? '.env.example 存在' : '没有 .env.example 文件',
      isBlocker: false,
    })

    // 检查5: 没有敏感信息泄露
    const envPath = path.join(sourceDirectory, '.env')
    const hasEnvFile = fs.existsSync(envPath)
    const gitignorePath = path.join(sourceDirectory, '.gitignore')
    let envInGitignore = false
    if (fs.existsSync(gitignorePath)) {
      const gitignoreContent = fs.readFileSync(gitignorePath, 'utf-8')
      envInGitignore = gitignoreContent.includes('.env')
    }
    const envSafe = !hasEnvFile || envInGitignore
    results.push({
      id: 'env_security',
      name: 'Environment Security',
      nameZh: '环境变量安全',
      passed: envSafe,
      message: envSafe ? 'Environment files properly ignored' : '.env file exists but not in .gitignore',
      messageZh: envSafe ? '环境变量文件已正确忽略' : '.env 文件存在但未在 .gitignore 中',
      isBlocker: false,
    })

    // 检查6: Next.js 配置（如果是 Next.js 项目）
    const nextConfigPath = path.join(sourceDirectory, 'next.config.js')
    const nextConfigMjsPath = path.join(sourceDirectory, 'next.config.mjs')
    const isNextProject = fs.existsSync(nextConfigPath) || fs.existsSync(nextConfigMjsPath)
    if (isNextProject) {
      results.push({
        id: 'next_config',
        name: 'Next.js Config',
        nameZh: 'Next.js 配置',
        passed: true,
        message: 'Next.js configuration found',
        messageZh: 'Next.js 配置文件存在',
        isBlocker: false,
      })
    }

    // 统计结果
    const passedChecks = results.filter(r => r.passed).length
    const failedChecks = results.filter(r => !r.passed).length
    const hasBlockers = results.some(r => !r.passed && r.isBlocker)

    return {
      totalChecks: results.length,
      passedChecks,
      failedChecks,
      skippedChecks: 0,
      hasBlockers,
      results,
    }
  }

  /**
   * 获取测试场景
   */
  private getTestScenarios(productType: ProductType, customScenarios?: TestScenario[]): TestScenario[] {
    if (customScenarios && customScenarios.length > 0) {
      return customScenarios
    }

    switch (productType) {
      case 'ecommerce':
        return ECOMMERCE_TEST_SCENARIOS
      default:
        return DEFAULT_TEST_SCENARIOS
    }
  }

  /**
   * 获取默认验收检查项
   */
  private getDefaultCheckItems(productType: ProductType): Omit<AcceptanceCheckItem, 'status' | 'feedback'>[] {
    const baseItems: Omit<AcceptanceCheckItem, 'status' | 'feedback'>[] = [
      { id: 'homepage', category: 'functionality', question: '网站首页能正常打开吗？', questionZh: '网站首页能正常打开吗？' },
      { id: 'login', category: 'functionality', question: '登录功能正常吗？', questionZh: '登录功能正常吗？' },
      { id: 'admin', category: 'functionality', question: '管理后台能正常进入吗？', questionZh: '管理后台能正常进入吗？' },
      { id: 'mobile', category: 'mobile', question: '手机上显示正常吗？', questionZh: '手机上显示正常吗？' },
      { id: 'speed', category: 'performance', question: '页面加载速度满意吗？', questionZh: '页面加载速度满意吗？' },
      { id: 'overall', category: 'other', question: '整体满意吗？', questionZh: '整体满意吗？' },
    ]

    if (productType === 'ecommerce') {
      return [
        ...baseItems.slice(0, 3),
        { id: 'products', category: 'functionality', question: '商品列表显示正常吗？', questionZh: '商品列表显示正常吗？' },
        { id: 'cart', category: 'functionality', question: '购物车功能正常吗？', questionZh: '购物车功能正常吗？' },
        ...baseItems.slice(3),
      ]
    }

    return baseItems
  }

  /**
   * 运行质量门禁检查
   * 检查测试结果是否达到可交付标准
   */
  private runQualityGateCheck(testReport: E2ETestReport): {
    passed: boolean
    severity: 'none' | 'warning' | 'critical'
    message: string
    messageZh: string
    details: {
      passRate: number
      minPassRate: number
      criticalFailures: number
    }
  } {
    const totalTests = testReport.totalTests
    const passedTests = testReport.totalPassed
    const failedTests = testReport.totalFailed

    // 如果没有测试，默认通过
    if (totalTests === 0) {
      return {
        passed: true,
        severity: 'none',
        message: 'No tests to verify',
        messageZh: '没有测试需要验证',
        details: {
          passRate: 100,
          minPassRate: 80,
          criticalFailures: 0,
        },
      }
    }

    const passRate = (passedTests / totalTests) * 100

    // 门禁标准配置
    const QUALITY_GATES = {
      minPassRate: 80,          // 最低通过率
      warningPassRate: 90,      // 警告通过率
      maxCriticalFailures: 2,   // 最大关键失败数
    }

    // 判断关键测试失败数（假设前3个测试是关键测试）
    const criticalFailures = Math.min(failedTests, 3)

    // 检查是否通过门禁
    if (passRate >= QUALITY_GATES.warningPassRate && criticalFailures === 0) {
      return {
        passed: true,
        severity: 'none',
        message: `Quality gate passed with ${passRate.toFixed(1)}% pass rate`,
        messageZh: `质量门禁通过，通过率 ${passRate.toFixed(1)}%`,
        details: {
          passRate,
          minPassRate: QUALITY_GATES.minPassRate,
          criticalFailures,
        },
      }
    }

    if (passRate >= QUALITY_GATES.minPassRate && criticalFailures <= QUALITY_GATES.maxCriticalFailures) {
      return {
        passed: true,
        severity: 'warning',
        message: `Quality gate passed with warnings: ${passRate.toFixed(1)}% pass rate, ${failedTests} failures`,
        messageZh: `质量门禁通过但有警告：通过率 ${passRate.toFixed(1)}%，${failedTests} 个失败`,
        details: {
          passRate,
          minPassRate: QUALITY_GATES.minPassRate,
          criticalFailures,
        },
      }
    }

    // 门禁失败
    const reasons: string[] = []
    const reasonsZh: string[] = []

    if (passRate < QUALITY_GATES.minPassRate) {
      reasons.push(`pass rate ${passRate.toFixed(1)}% below minimum ${QUALITY_GATES.minPassRate}%`)
      reasonsZh.push(`通过率 ${passRate.toFixed(1)}% 低于最低要求 ${QUALITY_GATES.minPassRate}%`)
    }
    if (criticalFailures > QUALITY_GATES.maxCriticalFailures) {
      reasons.push(`${criticalFailures} critical failures`)
      reasonsZh.push(`${criticalFailures} 个关键测试失败`)
    }

    return {
      passed: false,
      severity: 'critical',
      message: `Quality gate failed: ${reasons.join(', ')}`,
      messageZh: `质量门禁未通过: ${reasonsZh.join(', ')}`,
      details: {
        passRate,
        minPassRate: QUALITY_GATES.minPassRate,
        criticalFailures,
      },
    }
  }

  /**
   * 翻译部署错误为人话
   */
  private translateDeploymentError(errorMessage: string): string {
    // 常见部署错误的人话翻译
    const ERROR_TRANSLATIONS: Array<{ pattern: RegExp; translation: string }> = [
      { pattern: /VERCEL_TOKEN.*invalid/i, translation: '部署密钥无效，请检查配置' },
      { pattern: /401|unauthorized/i, translation: '没有部署权限，请检查账号授权' },
      { pattern: /403|forbidden/i, translation: '访问被拒绝，请检查权限设置' },
      { pattern: /404|not found/i, translation: '找不到项目，请确认项目名称正确' },
      { pattern: /timeout|timed? out/i, translation: '部署超时，网络可能不稳定' },
      { pattern: /ECONNREFUSED|connection refused/i, translation: '无法连接到部署服务器，请稍后重试' },
      { pattern: /ENOTFOUND|DNS/i, translation: '网络连接失败，请检查网络' },
      { pattern: /rate limit|too many requests/i, translation: '请求太频繁，请稍后重试' },
      { pattern: /build failed|build error/i, translation: '项目构建失败，请检查代码是否有错误' },
      { pattern: /npm ERR|yarn error/i, translation: '安装依赖失败，请检查 package.json' },
      { pattern: /ENOMEM|out of memory/i, translation: '内存不足，项目可能太大' },
      { pattern: /ENOSPC|no space/i, translation: '存储空间不足' },
      { pattern: /syntax error|unexpected token/i, translation: '代码语法错误，请检查后重试' },
      { pattern: /module not found|cannot find module/i, translation: '缺少依赖包，请检查是否安装完整' },
      { pattern: /exit code 1|process exited/i, translation: '构建过程异常退出，请检查配置' },
    ]

    // 查找匹配的翻译
    for (const { pattern, translation } of ERROR_TRANSLATIONS) {
      if (pattern.test(errorMessage)) {
        return translation
      }
    }

    // 默认翻译
    if (errorMessage.length > 100) {
      return '部署过程中遇到技术问题，我们正在处理'
    }
    return errorMessage
  }

  /**
   * 生成凭证
   */
  private generateCredentials(): { username: string; password: string } {
    const password = this.generateSecurePassword()
    return {
      username: 'admin',
      password,
    }
  }

  /**
   * 生成安全密码
   */
  private generateSecurePassword(length = 16): string {
    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz23456789!@#$%'
    let password = ''
    for (let i = 0; i < length; i++) {
      password += chars.charAt(Math.floor(Math.random() * chars.length))
    }
    return password
  }

  /**
   * 哈希密码
   */
  private hashPassword(password: string): string {
    return crypto.createHash('sha256').update(password).digest('hex')
  }

  /**
   * 清理项目名称
   */
  private sanitizeProjectName(name: string): string {
    return name
      .toLowerCase()
      .replace(/[^a-z0-9-]/g, '-')
      .replace(/-+/g, '-')
      .replace(/^-|-$/g, '')
      .slice(0, 50)
  }

  /**
   * 获取阶段中文名称
   */
  private getStageNameZh(stage: DeliveryStage): string {
    const names: Record<DeliveryStage, string> = {
      queued: '排队中',
      preparing: '准备中',
      building: '构建中',
      testing: '测试中',
      deploying: '部署中',
      verifying: '验证中',
      configuring: '配置中',
      notifying: '通知中',
      acceptance: '验收中',
      completed: '已完成',
      failed: '失败',
      cancelled: '已取消',
      paused: '已暂停',
    }
    return names[stage] || stage
  }
}

// 单例实例
let _orchestrator: DeliveryOrchestratorService | null = null

export function getDeliveryOrchestrator(): DeliveryOrchestratorService {
  if (!_orchestrator) {
    _orchestrator = new DeliveryOrchestratorService()
  }
  return _orchestrator
}

// 便捷方法
export async function startDelivery(
  config: DeliveryOrchestratorConfig,
  onProgress?: DeliveryProgressCallback
): Promise<DeliveryResult> {
  const orchestrator = getDeliveryOrchestrator()
  return orchestrator.startDelivery(config, onProgress)
}

export async function getDeliveryStatus(sessionId: string): Promise<IDeliverySession | null> {
  const orchestrator = getDeliveryOrchestrator()
  return orchestrator.getDeliveryStatus(sessionId)
}

export async function getDeliveryEvents(sessionId: string, limit = 50) {
  const orchestrator = getDeliveryOrchestrator()
  return orchestrator.getDeliveryEvents(sessionId, limit)
}
