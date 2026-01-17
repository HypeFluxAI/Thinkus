/**
 * 交付就绪信号系统
 *
 * 精准判断产品何时"真正可用"，并通过多渠道通知用户
 * 解决小白用户"不知道产品好了没"的问题
 */

// ============================================================================
// 类型定义
// ============================================================================

/**
 * 就绪检查项
 */
export interface ReadinessCheck {
  id: string
  name: string                    // 人话名称
  description: string             // 人话描述
  category: ReadinessCategory
  required: boolean               // 是否必须通过
  weight: number                  // 权重（用于计算整体进度）
  status: CheckStatus
  checkedAt?: Date
  details?: string               // 检查详情
  error?: string                 // 错误信息
}

export type ReadinessCategory =
  | 'deployment'    // 部署相关
  | 'functionality' // 功能相关
  | 'access'        // 访问相关
  | 'account'       // 账号相关

export type CheckStatus =
  | 'pending'       // 待检查
  | 'checking'      // 检查中
  | 'passed'        // 通过
  | 'failed'        // 失败
  | 'warning'       // 警告（非必须项失败）

/**
 * 就绪状态
 */
export type ReadinessStatus =
  | 'not_started'   // 未开始
  | 'in_progress'   // 进行中
  | 'almost_ready'  // 即将就绪（>80%）
  | 'ready'         // 已就绪
  | 'ready_with_warnings'  // 就绪但有警告
  | 'failed'        // 失败

/**
 * 通知渠道
 */
export type NotificationChannel = 'email' | 'sms' | 'wechat' | 'in_app' | 'webhook'

/**
 * 就绪通知配置
 */
export interface ReadinessNotificationConfig {
  channels: NotificationChannel[]
  /** 就绪时的通知 */
  onReady: boolean
  /** 即将就绪时的通知（进度>80%） */
  onAlmostReady: boolean
  /** 失败时的通知 */
  onFailed: boolean
  /** 静默时段（不发送通知） */
  quietHours?: { start: number; end: number }
  /** 自定义消息 */
  customMessage?: string
}

/**
 * 就绪结果
 */
export interface ReadinessResult {
  projectId: string
  status: ReadinessStatus
  progress: number                // 0-100
  checks: ReadinessCheck[]
  passedCount: number
  failedCount: number
  warningCount: number
  pendingCount: number
  /** 预计就绪时间（如果还在进行中） */
  estimatedReadyAt?: Date
  /** 实际就绪时间 */
  readyAt?: Date
  /** 人话摘要 */
  summary: string
  /** 下一步建议 */
  nextAction?: string
  /** 产品访问信息（就绪后） */
  accessInfo?: {
    productUrl: string
    adminUrl: string
    credentials?: {
      username: string
      password: string  // 脱敏显示
    }
  }
}

/**
 * 就绪信号事件
 */
export interface ReadinessEvent {
  type: 'check_started' | 'check_passed' | 'check_failed' | 'status_changed' | 'ready' | 'failed'
  projectId: string
  checkId?: string
  previousStatus?: ReadinessStatus
  newStatus?: ReadinessStatus
  progress: number
  timestamp: Date
  details?: string
}

// ============================================================================
// 默认检查项配置
// ============================================================================

const DEFAULT_CHECKS: Omit<ReadinessCheck, 'status' | 'checkedAt'>[] = [
  // 部署相关
  {
    id: 'deployment_success',
    name: '网站部署',
    description: '您的网站已成功部署到服务器',
    category: 'deployment',
    required: true,
    weight: 25,
  },
  {
    id: 'build_success',
    name: '代码构建',
    description: '网站代码已成功编译打包',
    category: 'deployment',
    required: true,
    weight: 15,
  },
  {
    id: 'domain_active',
    name: '域名生效',
    description: '您的网站域名已可以访问',
    category: 'deployment',
    required: true,
    weight: 15,
  },
  {
    id: 'ssl_valid',
    name: '安全证书',
    description: '网站已启用安全加密(HTTPS)',
    category: 'deployment',
    required: false,  // 非必须，但建议
    weight: 5,
  },

  // 功能相关
  {
    id: 'homepage_loads',
    name: '首页加载',
    description: '网站首页可以正常打开',
    category: 'functionality',
    required: true,
    weight: 15,
  },
  {
    id: 'api_healthy',
    name: '接口正常',
    description: '网站后台服务运行正常',
    category: 'functionality',
    required: true,
    weight: 10,
  },
  {
    id: 'database_connected',
    name: '数据库连接',
    description: '数据存储服务已就绪',
    category: 'functionality',
    required: true,
    weight: 10,
  },

  // 账号相关
  {
    id: 'admin_account_ready',
    name: '管理员账号',
    description: '您的管理员账号已创建完成',
    category: 'account',
    required: true,
    weight: 5,
  },
]

// ============================================================================
// 人话消息模板
// ============================================================================

const STATUS_MESSAGES: Record<ReadinessStatus, { title: string; subtitle: string; emoji: string }> = {
  not_started: {
    title: '准备开始',
    subtitle: '我们即将开始部署您的产品',
    emoji: '🚀',
  },
  in_progress: {
    title: '正在准备中',
    subtitle: '您的产品正在部署，请稍候',
    emoji: '⏳',
  },
  almost_ready: {
    title: '即将完成',
    subtitle: '还差一点点就好了！',
    emoji: '🎯',
  },
  ready: {
    title: '已经就绪',
    subtitle: '您的产品已准备好，可以开始使用了！',
    emoji: '✅',
  },
  ready_with_warnings: {
    title: '基本就绪',
    subtitle: '您的产品可以使用，但有一些小问题需要关注',
    emoji: '⚠️',
  },
  failed: {
    title: '遇到问题',
    subtitle: '部署过程中遇到了一些问题，我们正在处理',
    emoji: '❌',
  },
}

const NOTIFICATION_TEMPLATES = {
  ready: {
    subject: '🎉 您的产品已就绪！',
    title: '好消息！您的产品准备好了',
    body: (projectName: string, productUrl: string) => `
您好！

您的项目「${projectName}」已经部署完成，可以开始使用了！

🌐 访问地址：${productUrl}

接下来您可以：
1. 点击上面的链接访问您的网站
2. 使用我们发送的账号密码登录管理后台
3. 开始添加您的内容

如有任何问题，随时联系我们的客服团队。

祝您使用愉快！
    `.trim(),
  },
  almost_ready: {
    subject: '⏳ 您的产品即将就绪',
    title: '快好了！',
    body: (projectName: string, progress: number) => `
您好！

您的项目「${projectName}」部署进度已达 ${progress}%，预计很快就能完成。

我们会在产品就绪后第一时间通知您。

请耐心等待，谢谢！
    `.trim(),
  },
  failed: {
    subject: '⚠️ 部署遇到问题',
    title: '需要您的关注',
    body: (projectName: string, errorSummary: string) => `
您好！

您的项目「${projectName}」在部署过程中遇到了一些问题：

${errorSummary}

我们的技术团队已收到通知，正在处理中。如果问题持续，我们会主动联系您。

您也可以随时联系客服了解最新进展。
    `.trim(),
  },
}

// ============================================================================
// 服务实现
// ============================================================================

export class DeliveryReadySignalService {
  private static instance: DeliveryReadySignalService

  /** 项目就绪状态缓存 */
  private readinessCache: Map<string, ReadinessResult> = new Map()

  /** 事件监听器 */
  private eventListeners: Map<string, ((event: ReadinessEvent) => void)[]> = new Map()

  private constructor() {}

  public static getInstance(): DeliveryReadySignalService {
    if (!DeliveryReadySignalService.instance) {
      DeliveryReadySignalService.instance = new DeliveryReadySignalService()
    }
    return DeliveryReadySignalService.instance
  }

  /**
   * 初始化项目就绪检查
   */
  initializeChecks(projectId: string, customChecks?: Partial<ReadinessCheck>[]): ReadinessResult {
    const checks: ReadinessCheck[] = DEFAULT_CHECKS.map(check => ({
      ...check,
      status: 'pending' as CheckStatus,
    }))

    // 合并自定义检查项
    if (customChecks) {
      for (const custom of customChecks) {
        const existingIndex = checks.findIndex(c => c.id === custom.id)
        if (existingIndex >= 0) {
          checks[existingIndex] = { ...checks[existingIndex], ...custom }
        } else if (custom.id && custom.name) {
          checks.push({
            id: custom.id,
            name: custom.name,
            description: custom.description || '',
            category: custom.category || 'functionality',
            required: custom.required ?? true,
            weight: custom.weight || 10,
            status: 'pending',
          })
        }
      }
    }

    const result: ReadinessResult = {
      projectId,
      status: 'not_started',
      progress: 0,
      checks,
      passedCount: 0,
      failedCount: 0,
      warningCount: 0,
      pendingCount: checks.length,
      summary: STATUS_MESSAGES.not_started.subtitle,
    }

    this.readinessCache.set(projectId, result)
    return result
  }

  /**
   * 更新检查项状态
   */
  updateCheck(
    projectId: string,
    checkId: string,
    status: CheckStatus,
    details?: string
  ): ReadinessResult {
    const result = this.readinessCache.get(projectId)
    if (!result) {
      throw new Error(`Project ${projectId} not initialized`)
    }

    const check = result.checks.find(c => c.id === checkId)
    if (!check) {
      throw new Error(`Check ${checkId} not found`)
    }

    const previousStatus = check.status
    check.status = status
    check.checkedAt = new Date()
    if (details) check.details = details

    // 发送检查事件
    this.emitEvent({
      type: status === 'passed' ? 'check_passed' : status === 'failed' ? 'check_failed' : 'check_started',
      projectId,
      checkId,
      progress: this.calculateProgress(result),
      timestamp: new Date(),
      details,
    })

    // 重新计算整体状态
    return this.recalculateStatus(projectId)
  }

  /**
   * 批量更新检查项
   */
  updateChecks(
    projectId: string,
    updates: Array<{ checkId: string; status: CheckStatus; details?: string }>
  ): ReadinessResult {
    for (const update of updates) {
      const result = this.readinessCache.get(projectId)
      if (!result) continue

      const check = result.checks.find(c => c.id === update.checkId)
      if (check) {
        check.status = update.status
        check.checkedAt = new Date()
        if (update.details) check.details = update.details
      }
    }

    return this.recalculateStatus(projectId)
  }

  /**
   * 执行自动检查
   */
  async runAutoChecks(
    projectId: string,
    context: {
      productUrl?: string
      adminUrl?: string
      apiHealthEndpoint?: string
      databaseUri?: string
    }
  ): Promise<ReadinessResult> {
    const result = this.readinessCache.get(projectId)
    if (!result) {
      throw new Error(`Project ${projectId} not initialized`)
    }

    // 并行执行所有自动检查
    const checkPromises: Promise<void>[] = []

    // 检查首页加载
    if (context.productUrl) {
      checkPromises.push(this.checkUrlAccessible(projectId, 'homepage_loads', context.productUrl))
      checkPromises.push(this.checkUrlAccessible(projectId, 'domain_active', context.productUrl))
      checkPromises.push(this.checkSSL(projectId, context.productUrl))
    }

    // 检查API健康
    if (context.apiHealthEndpoint) {
      checkPromises.push(this.checkApiHealth(projectId, context.apiHealthEndpoint))
    }

    // 等待所有检查完成
    await Promise.allSettled(checkPromises)

    return this.recalculateStatus(projectId)
  }

  /**
   * 检查URL是否可访问
   */
  private async checkUrlAccessible(projectId: string, checkId: string, url: string): Promise<void> {
    this.updateCheck(projectId, checkId, 'checking')

    try {
      const response = await fetch(url, {
        method: 'HEAD',
        signal: AbortSignal.timeout(10000),
      })

      if (response.ok) {
        this.updateCheck(projectId, checkId, 'passed', `响应状态: ${response.status}`)
      } else {
        this.updateCheck(projectId, checkId, 'failed', `响应状态: ${response.status}`)
      }
    } catch (error) {
      this.updateCheck(projectId, checkId, 'failed', `无法访问: ${error instanceof Error ? error.message : '未知错误'}`)
    }
  }

  /**
   * 检查SSL证书
   */
  private async checkSSL(projectId: string, url: string): Promise<void> {
    this.updateCheck(projectId, 'ssl_valid', 'checking')

    try {
      const urlObj = new URL(url)
      if (urlObj.protocol === 'https:') {
        // 如果URL是HTTPS，尝试访问验证证书
        const response = await fetch(url, {
          method: 'HEAD',
          signal: AbortSignal.timeout(10000),
        })

        if (response.ok) {
          this.updateCheck(projectId, 'ssl_valid', 'passed', 'HTTPS已启用')
        } else {
          this.updateCheck(projectId, 'ssl_valid', 'warning', 'HTTPS可用但有警告')
        }
      } else {
        this.updateCheck(projectId, 'ssl_valid', 'warning', '未使用HTTPS')
      }
    } catch (error) {
      this.updateCheck(projectId, 'ssl_valid', 'warning', 'SSL检查失败')
    }
  }

  /**
   * 检查API健康状态
   */
  private async checkApiHealth(projectId: string, endpoint: string): Promise<void> {
    this.updateCheck(projectId, 'api_healthy', 'checking')

    try {
      const response = await fetch(endpoint, {
        signal: AbortSignal.timeout(10000),
      })

      if (response.ok) {
        this.updateCheck(projectId, 'api_healthy', 'passed', 'API响应正常')
      } else {
        this.updateCheck(projectId, 'api_healthy', 'failed', `API响应异常: ${response.status}`)
      }
    } catch (error) {
      this.updateCheck(projectId, 'api_healthy', 'failed', `API无法访问: ${error instanceof Error ? error.message : '未知错误'}`)
    }
  }

  /**
   * 重新计算整体状态
   */
  private recalculateStatus(projectId: string): ReadinessResult {
    const result = this.readinessCache.get(projectId)
    if (!result) {
      throw new Error(`Project ${projectId} not initialized`)
    }

    const previousStatus = result.status

    // 统计各状态数量
    result.passedCount = result.checks.filter(c => c.status === 'passed').length
    result.failedCount = result.checks.filter(c => c.status === 'failed' && c.required).length
    result.warningCount = result.checks.filter(c => c.status === 'failed' && !c.required || c.status === 'warning').length
    result.pendingCount = result.checks.filter(c => c.status === 'pending' || c.status === 'checking').length

    // 计算进度
    result.progress = this.calculateProgress(result)

    // 确定状态
    const requiredChecks = result.checks.filter(c => c.required)
    const requiredPassed = requiredChecks.filter(c => c.status === 'passed').length
    const requiredFailed = requiredChecks.filter(c => c.status === 'failed').length

    if (requiredFailed > 0) {
      result.status = 'failed'
    } else if (requiredPassed === requiredChecks.length) {
      result.status = result.warningCount > 0 ? 'ready_with_warnings' : 'ready'
      result.readyAt = new Date()
    } else if (result.progress >= 80) {
      result.status = 'almost_ready'
    } else if (result.progress > 0) {
      result.status = 'in_progress'
    } else {
      result.status = 'not_started'
    }

    // 更新人话摘要
    result.summary = STATUS_MESSAGES[result.status].subtitle

    // 设置下一步建议
    result.nextAction = this.getNextAction(result)

    // 如果状态变化，发送事件
    if (previousStatus !== result.status) {
      this.emitEvent({
        type: result.status === 'ready' || result.status === 'ready_with_warnings' ? 'ready' :
              result.status === 'failed' ? 'failed' : 'status_changed',
        projectId,
        previousStatus,
        newStatus: result.status,
        progress: result.progress,
        timestamp: new Date(),
      })
    }

    return result
  }

  /**
   * 计算进度百分比
   */
  private calculateProgress(result: ReadinessResult): number {
    const totalWeight = result.checks.reduce((sum, c) => sum + c.weight, 0)
    const passedWeight = result.checks
      .filter(c => c.status === 'passed')
      .reduce((sum, c) => sum + c.weight, 0)

    return Math.round((passedWeight / totalWeight) * 100)
  }

  /**
   * 获取下一步建议
   */
  private getNextAction(result: ReadinessResult): string {
    if (result.status === 'ready' || result.status === 'ready_with_warnings') {
      return '点击下方链接，立即体验您的产品！'
    }

    if (result.status === 'failed') {
      const failedCheck = result.checks.find(c => c.status === 'failed' && c.required)
      return failedCheck
        ? `${failedCheck.name}检查未通过，我们正在处理`
        : '我们正在解决问题，请稍候'
    }

    const pendingCheck = result.checks.find(c => c.status === 'pending' || c.status === 'checking')
    if (pendingCheck) {
      return `正在进行：${pendingCheck.name}`
    }

    return '请耐心等待，我们正在准备您的产品'
  }

  /**
   * 获取就绪状态
   */
  getReadinessStatus(projectId: string): ReadinessResult | null {
    return this.readinessCache.get(projectId) || null
  }

  /**
   * 检查是否就绪
   */
  isReady(projectId: string): boolean {
    const result = this.readinessCache.get(projectId)
    return result?.status === 'ready' || result?.status === 'ready_with_warnings'
  }

  /**
   * 发送就绪通知
   */
  async sendReadinessNotification(
    projectId: string,
    config: ReadinessNotificationConfig,
    context: {
      projectName: string
      userEmail?: string
      userPhone?: string
      productUrl?: string
    }
  ): Promise<{ sent: boolean; channels: NotificationChannel[]; error?: string }> {
    const result = this.readinessCache.get(projectId)
    if (!result) {
      return { sent: false, channels: [], error: 'Project not found' }
    }

    // 检查是否在静默时段
    if (config.quietHours) {
      const hour = new Date().getHours()
      if (hour >= config.quietHours.start || hour < config.quietHours.end) {
        return { sent: false, channels: [], error: 'Quiet hours' }
      }
    }

    const sentChannels: NotificationChannel[] = []

    // 根据状态选择模板
    let template: typeof NOTIFICATION_TEMPLATES.ready | null = null

    if ((result.status === 'ready' || result.status === 'ready_with_warnings') && config.onReady) {
      template = NOTIFICATION_TEMPLATES.ready
    } else if (result.status === 'almost_ready' && config.onAlmostReady) {
      template = NOTIFICATION_TEMPLATES.almost_ready as typeof NOTIFICATION_TEMPLATES.ready
    } else if (result.status === 'failed' && config.onFailed) {
      template = NOTIFICATION_TEMPLATES.failed as typeof NOTIFICATION_TEMPLATES.ready
    }

    if (!template) {
      return { sent: false, channels: [], error: 'No notification needed for current status' }
    }

    // 发送到各渠道
    for (const channel of config.channels) {
      try {
        switch (channel) {
          case 'email':
            if (context.userEmail) {
              await this.sendEmail(
                context.userEmail,
                template.subject,
                template.body(context.projectName, context.productUrl || '')
              )
              sentChannels.push('email')
            }
            break

          case 'sms':
            if (context.userPhone) {
              await this.sendSMS(
                context.userPhone,
                `【Thinkus】${template.title}：您的项目「${context.projectName}」${result.status === 'ready' ? '已就绪' : '进度' + result.progress + '%'}`
              )
              sentChannels.push('sms')
            }
            break

          case 'in_app':
            // 应用内通知（存储到数据库）
            sentChannels.push('in_app')
            break

          case 'wechat':
            // 微信通知
            sentChannels.push('wechat')
            break

          case 'webhook':
            // Webhook回调
            sentChannels.push('webhook')
            break
        }
      } catch (error) {
        console.error(`Failed to send ${channel} notification:`, error)
      }
    }

    return { sent: sentChannels.length > 0, channels: sentChannels }
  }

  /**
   * 发送邮件（占位实现）
   */
  private async sendEmail(to: string, subject: string, body: string): Promise<void> {
    // TODO: 集成实际邮件服务
    console.log(`[Email] To: ${to}, Subject: ${subject}`)
  }

  /**
   * 发送短信（占位实现）
   */
  private async sendSMS(phone: string, message: string): Promise<void> {
    // TODO: 集成实际短信服务
    console.log(`[SMS] To: ${phone}, Message: ${message}`)
  }

  /**
   * 注册事件监听器
   */
  onEvent(projectId: string, callback: (event: ReadinessEvent) => void): () => void {
    if (!this.eventListeners.has(projectId)) {
      this.eventListeners.set(projectId, [])
    }
    this.eventListeners.get(projectId)!.push(callback)

    // 返回取消订阅函数
    return () => {
      const listeners = this.eventListeners.get(projectId)
      if (listeners) {
        const index = listeners.indexOf(callback)
        if (index >= 0) listeners.splice(index, 1)
      }
    }
  }

  /**
   * 发送事件
   */
  private emitEvent(event: ReadinessEvent): void {
    const listeners = this.eventListeners.get(event.projectId)
    if (listeners) {
      for (const callback of listeners) {
        try {
          callback(event)
        } catch (error) {
          console.error('Event listener error:', error)
        }
      }
    }
  }

  /**
   * 生成就绪状态的人话摘要
   */
  generateHumanSummary(projectId: string): string {
    const result = this.readinessCache.get(projectId)
    if (!result) return '未找到项目信息'

    const status = STATUS_MESSAGES[result.status]
    const lines = [
      `${status.emoji} ${status.title}`,
      '',
      status.subtitle,
      '',
      `进度：${result.progress}%`,
      '',
      '检查项：',
    ]

    for (const check of result.checks) {
      const icon = check.status === 'passed' ? '✅' :
                   check.status === 'failed' ? '❌' :
                   check.status === 'warning' ? '⚠️' :
                   check.status === 'checking' ? '🔄' : '⏳'
      lines.push(`  ${icon} ${check.name}`)
    }

    if (result.nextAction) {
      lines.push('', `下一步：${result.nextAction}`)
    }

    return lines.join('\n')
  }

  /**
   * 生成就绪页面HTML
   */
  generateReadinessPageHtml(projectId: string, projectName: string): string {
    const result = this.readinessCache.get(projectId)
    if (!result) return '<p>未找到项目信息</p>'

    const status = STATUS_MESSAGES[result.status]
    const isReady = result.status === 'ready' || result.status === 'ready_with_warnings'

    return `
<!DOCTYPE html>
<html lang="zh-CN">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${projectName} - 部署状态</title>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
      background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
      min-height: 100vh;
      display: flex;
      align-items: center;
      justify-content: center;
      padding: 20px;
    }
    .container {
      background: white;
      border-radius: 20px;
      padding: 40px;
      max-width: 500px;
      width: 100%;
      box-shadow: 0 20px 60px rgba(0,0,0,0.3);
      text-align: center;
    }
    .status-icon {
      font-size: 80px;
      margin-bottom: 20px;
      ${!isReady ? 'animation: pulse 2s infinite;' : ''}
    }
    @keyframes pulse {
      0%, 100% { transform: scale(1); }
      50% { transform: scale(1.1); }
    }
    h1 {
      color: #1a1a2e;
      font-size: 28px;
      margin-bottom: 10px;
    }
    .subtitle {
      color: #666;
      font-size: 16px;
      margin-bottom: 30px;
    }
    .progress-bar {
      background: #e0e0e0;
      border-radius: 10px;
      height: 12px;
      overflow: hidden;
      margin-bottom: 10px;
    }
    .progress-fill {
      background: linear-gradient(90deg, #667eea, #764ba2);
      height: 100%;
      border-radius: 10px;
      transition: width 0.5s ease;
      width: ${result.progress}%;
    }
    .progress-text {
      color: #888;
      font-size: 14px;
      margin-bottom: 30px;
    }
    .checks {
      text-align: left;
      margin-bottom: 30px;
    }
    .check-item {
      display: flex;
      align-items: center;
      padding: 12px 0;
      border-bottom: 1px solid #eee;
    }
    .check-item:last-child { border-bottom: none; }
    .check-icon {
      font-size: 20px;
      margin-right: 12px;
      width: 24px;
      text-align: center;
    }
    .check-name {
      flex: 1;
      color: #333;
    }
    .check-status {
      font-size: 12px;
      padding: 4px 8px;
      border-radius: 4px;
    }
    .status-passed { background: #d4edda; color: #155724; }
    .status-failed { background: #f8d7da; color: #721c24; }
    .status-pending { background: #fff3cd; color: #856404; }
    .status-checking { background: #cce5ff; color: #004085; }
    .btn {
      display: inline-block;
      padding: 16px 40px;
      background: linear-gradient(90deg, #667eea, #764ba2);
      color: white;
      text-decoration: none;
      border-radius: 30px;
      font-size: 18px;
      font-weight: bold;
      transition: transform 0.2s, box-shadow 0.2s;
    }
    .btn:hover {
      transform: translateY(-2px);
      box-shadow: 0 10px 20px rgba(102, 126, 234, 0.4);
    }
    .btn:disabled, .btn.disabled {
      background: #ccc;
      cursor: not-allowed;
    }
    .next-action {
      margin-top: 20px;
      color: #666;
      font-size: 14px;
    }
    .refresh-hint {
      margin-top: 30px;
      color: #999;
      font-size: 12px;
    }
  </style>
  ${!isReady ? '<meta http-equiv="refresh" content="5">' : ''}
</head>
<body>
  <div class="container">
    <div class="status-icon">${status.emoji}</div>
    <h1>${status.title}</h1>
    <p class="subtitle">${status.subtitle}</p>

    <div class="progress-bar">
      <div class="progress-fill"></div>
    </div>
    <p class="progress-text">${result.progress}% 完成</p>

    <div class="checks">
      ${result.checks.map(check => `
        <div class="check-item">
          <span class="check-icon">${
            check.status === 'passed' ? '✅' :
            check.status === 'failed' ? '❌' :
            check.status === 'checking' ? '🔄' : '⏳'
          }</span>
          <span class="check-name">${check.name}</span>
          <span class="check-status status-${check.status}">${
            check.status === 'passed' ? '完成' :
            check.status === 'failed' ? '失败' :
            check.status === 'checking' ? '检查中' : '等待中'
          }</span>
        </div>
      `).join('')}
    </div>

    ${isReady && result.accessInfo ? `
      <a href="${result.accessInfo.productUrl}" class="btn" target="_blank">
        🚀 立即体验
      </a>
    ` : `
      <button class="btn disabled" disabled>
        ⏳ 准备中...
      </button>
    `}

    ${result.nextAction ? `
      <p class="next-action">${result.nextAction}</p>
    ` : ''}

    ${!isReady ? `
      <p class="refresh-hint">页面将每5秒自动刷新</p>
    ` : ''}
  </div>
</body>
</html>
    `.trim()
  }

  /**
   * 清理缓存
   */
  clearCache(projectId?: string): void {
    if (projectId) {
      this.readinessCache.delete(projectId)
      this.eventListeners.delete(projectId)
    } else {
      this.readinessCache.clear()
      this.eventListeners.clear()
    }
  }
}

// 导出单例
export const deliveryReadySignal = DeliveryReadySignalService.getInstance()
