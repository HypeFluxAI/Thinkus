/**
 * 续费预警强化系统
 *
 * 确保用户不会因为忘记续费而导致服务中断：
 * - 多阶段提醒（30天/7天/3天/1天/当天）
 * - 多渠道通知（邮件/短信/电话/站内信）
 * - 自动续费选项
 * - 宽限期处理
 * - 过期后的服务降级而非直接关停
 */

// ============================================================================
// 类型定义
// ============================================================================

/** 服务类型 */
export type ServiceType =
  | 'hosting'      // 托管服务
  | 'domain'       // 域名
  | 'ssl'          // SSL 证书
  | 'database'     // 数据库
  | 'storage'      // 存储空间
  | 'email'        // 邮件服务
  | 'cdn'          // CDN
  | 'monitoring'   // 监控服务
  | 'support'      // 技术支持
  | 'subscription' // 订阅套餐

/** 提醒阶段 */
export type AlertStage =
  | 'early'       // 提前30天
  | 'warning'     // 提前7天
  | 'urgent'      // 提前3天
  | 'critical'    // 提前1天
  | 'due_today'   // 当天
  | 'grace'       // 宽限期
  | 'expired'     // 已过期

/** 通知渠道 */
export type NotifyChannel = 'email' | 'sms' | 'phone' | 'in_app' | 'wechat'

/** 服务状态 */
export type ServiceStatus = 'active' | 'expiring' | 'grace_period' | 'suspended' | 'terminated'

/** 服务配置 */
export interface ServiceConfig {
  type: ServiceType
  label: string
  icon: string
  gracePeriodDays: number           // 宽限期天数
  autoRenewEnabled: boolean         // 是否支持自动续费
  criticalService: boolean          // 是否关键服务（影响网站运行）
  alertSchedule: AlertSchedule[]    // 提醒计划
  degradeOnExpire: boolean          // 过期后是否降级（而非关停）
}

/** 提醒计划 */
export interface AlertSchedule {
  stage: AlertStage
  daysBeforeExpiry: number
  channels: NotifyChannel[]
  escalate: boolean                 // 是否需要升级处理
  autoRetry: boolean                // 是否自动重试通知
  retryIntervalHours: number
}

/** 注册的服务 */
export interface RegisteredService {
  id: string
  projectId: string
  userId: string
  type: ServiceType
  name: string
  expiresAt: Date
  status: ServiceStatus
  autoRenew: boolean
  paymentMethodId?: string
  price: number
  currency: string
  lastRenewalAt?: Date
  nextAlertAt?: Date
  alertsSent: AlertRecord[]
  renewalAttempts: RenewalAttempt[]
}

/** 提醒记录 */
export interface AlertRecord {
  stage: AlertStage
  channel: NotifyChannel
  sentAt: Date
  success: boolean
  error?: string
  acknowledged?: boolean
  acknowledgedAt?: Date
}

/** 续费尝试记录 */
export interface RenewalAttempt {
  attemptedAt: Date
  success: boolean
  amount: number
  paymentMethod: string
  transactionId?: string
  error?: string
}

/** 续费提醒配置 */
export interface RenewalAlertConfig {
  projectId: string
  userId: string
  services: RegisteredService[]
  preferences: UserAlertPreferences
}

/** 用户提醒偏好 */
export interface UserAlertPreferences {
  enabledChannels: NotifyChannel[]
  quietHoursStart?: number   // 免打扰开始时间（24小时制）
  quietHoursEnd?: number     // 免打扰结束时间
  preferredLanguage: string
  emergencyPhone?: string    // 紧急联系电话
  enableAutoRenew: boolean
  reminderFrequency: 'all' | 'important_only' | 'critical_only'
}

/** 续费摘要 */
export interface RenewalSummary {
  totalServices: number
  expiringServices: ExpiringService[]
  expiredServices: ExpiringService[]
  upcomingRenewals: UpcomingRenewal[]
  totalRenewalCost: number
  currency: string
  nextExpiryDate?: Date
  healthStatus: 'healthy' | 'warning' | 'critical' | 'danger'
  recommendations: string[]
}

/** 即将到期的服务 */
export interface ExpiringService {
  service: RegisteredService
  daysRemaining: number
  stage: AlertStage
  actionRequired: string
}

/** 即将续费 */
export interface UpcomingRenewal {
  service: RegisteredService
  renewalDate: Date
  amount: number
  paymentMethod: string
}

// ============================================================================
// 服务配置
// ============================================================================

const SERVICE_CONFIGS: Record<ServiceType, ServiceConfig> = {
  hosting: {
    type: 'hosting',
    label: '网站托管',
    icon: '🖥️',
    gracePeriodDays: 7,
    autoRenewEnabled: true,
    criticalService: true,
    degradeOnExpire: false,  // 托管服务过期后直接关停
    alertSchedule: [
      { stage: 'early', daysBeforeExpiry: 30, channels: ['email', 'in_app'], escalate: false, autoRetry: false, retryIntervalHours: 0 },
      { stage: 'warning', daysBeforeExpiry: 7, channels: ['email', 'sms', 'in_app'], escalate: false, autoRetry: true, retryIntervalHours: 24 },
      { stage: 'urgent', daysBeforeExpiry: 3, channels: ['email', 'sms', 'in_app', 'wechat'], escalate: true, autoRetry: true, retryIntervalHours: 12 },
      { stage: 'critical', daysBeforeExpiry: 1, channels: ['email', 'sms', 'phone', 'in_app', 'wechat'], escalate: true, autoRetry: true, retryIntervalHours: 6 },
      { stage: 'due_today', daysBeforeExpiry: 0, channels: ['email', 'sms', 'phone', 'in_app', 'wechat'], escalate: true, autoRetry: true, retryIntervalHours: 3 },
    ],
  },
  domain: {
    type: 'domain',
    label: '域名',
    icon: '🌐',
    gracePeriodDays: 30,  // 域名通常有30天赎回期
    autoRenewEnabled: true,
    criticalService: true,
    degradeOnExpire: false,
    alertSchedule: [
      { stage: 'early', daysBeforeExpiry: 60, channels: ['email'], escalate: false, autoRetry: false, retryIntervalHours: 0 },
      { stage: 'warning', daysBeforeExpiry: 30, channels: ['email', 'in_app'], escalate: false, autoRetry: false, retryIntervalHours: 0 },
      { stage: 'urgent', daysBeforeExpiry: 7, channels: ['email', 'sms', 'in_app'], escalate: true, autoRetry: true, retryIntervalHours: 24 },
      { stage: 'critical', daysBeforeExpiry: 1, channels: ['email', 'sms', 'phone'], escalate: true, autoRetry: true, retryIntervalHours: 6 },
    ],
  },
  ssl: {
    type: 'ssl',
    label: 'SSL证书',
    icon: '🔒',
    gracePeriodDays: 0,  // SSL 过期后立即影响
    autoRenewEnabled: true,
    criticalService: true,
    degradeOnExpire: false,
    alertSchedule: [
      { stage: 'early', daysBeforeExpiry: 30, channels: ['email', 'in_app'], escalate: false, autoRetry: false, retryIntervalHours: 0 },
      { stage: 'warning', daysBeforeExpiry: 7, channels: ['email', 'sms'], escalate: true, autoRetry: true, retryIntervalHours: 24 },
      { stage: 'critical', daysBeforeExpiry: 1, channels: ['email', 'sms', 'phone'], escalate: true, autoRetry: true, retryIntervalHours: 4 },
    ],
  },
  database: {
    type: 'database',
    label: '数据库',
    icon: '💾',
    gracePeriodDays: 7,
    autoRenewEnabled: true,
    criticalService: true,
    degradeOnExpire: true,  // 降级为只读
    alertSchedule: [
      { stage: 'warning', daysBeforeExpiry: 7, channels: ['email', 'in_app'], escalate: false, autoRetry: true, retryIntervalHours: 24 },
      { stage: 'critical', daysBeforeExpiry: 1, channels: ['email', 'sms', 'phone'], escalate: true, autoRetry: true, retryIntervalHours: 6 },
    ],
  },
  storage: {
    type: 'storage',
    label: '存储空间',
    icon: '📦',
    gracePeriodDays: 30,
    autoRenewEnabled: true,
    criticalService: false,
    degradeOnExpire: true,  // 降级为只读
    alertSchedule: [
      { stage: 'warning', daysBeforeExpiry: 14, channels: ['email'], escalate: false, autoRetry: false, retryIntervalHours: 0 },
      { stage: 'critical', daysBeforeExpiry: 3, channels: ['email', 'sms'], escalate: true, autoRetry: true, retryIntervalHours: 24 },
    ],
  },
  email: {
    type: 'email',
    label: '邮件服务',
    icon: '📧',
    gracePeriodDays: 7,
    autoRenewEnabled: true,
    criticalService: false,
    degradeOnExpire: true,
    alertSchedule: [
      { stage: 'warning', daysBeforeExpiry: 7, channels: ['email', 'in_app'], escalate: false, autoRetry: true, retryIntervalHours: 24 },
      { stage: 'critical', daysBeforeExpiry: 1, channels: ['email', 'sms'], escalate: true, autoRetry: true, retryIntervalHours: 12 },
    ],
  },
  cdn: {
    type: 'cdn',
    label: 'CDN加速',
    icon: '⚡',
    gracePeriodDays: 3,
    autoRenewEnabled: true,
    criticalService: false,
    degradeOnExpire: true,  // 回退到源站
    alertSchedule: [
      { stage: 'warning', daysBeforeExpiry: 7, channels: ['email'], escalate: false, autoRetry: false, retryIntervalHours: 0 },
      { stage: 'critical', daysBeforeExpiry: 1, channels: ['email', 'sms'], escalate: true, autoRetry: true, retryIntervalHours: 12 },
    ],
  },
  monitoring: {
    type: 'monitoring',
    label: '监控服务',
    icon: '📊',
    gracePeriodDays: 7,
    autoRenewEnabled: true,
    criticalService: false,
    degradeOnExpire: true,
    alertSchedule: [
      { stage: 'warning', daysBeforeExpiry: 7, channels: ['email'], escalate: false, autoRetry: false, retryIntervalHours: 0 },
      { stage: 'critical', daysBeforeExpiry: 1, channels: ['email'], escalate: false, autoRetry: true, retryIntervalHours: 24 },
    ],
  },
  support: {
    type: 'support',
    label: '技术支持',
    icon: '🎧',
    gracePeriodDays: 0,
    autoRenewEnabled: true,
    criticalService: false,
    degradeOnExpire: true,  // 降级为基础支持
    alertSchedule: [
      { stage: 'warning', daysBeforeExpiry: 14, channels: ['email'], escalate: false, autoRetry: false, retryIntervalHours: 0 },
      { stage: 'critical', daysBeforeExpiry: 3, channels: ['email', 'in_app'], escalate: false, autoRetry: false, retryIntervalHours: 0 },
    ],
  },
  subscription: {
    type: 'subscription',
    label: '订阅套餐',
    icon: '💳',
    gracePeriodDays: 7,
    autoRenewEnabled: true,
    criticalService: true,
    degradeOnExpire: true,  // 降级为免费版
    alertSchedule: [
      { stage: 'early', daysBeforeExpiry: 30, channels: ['email', 'in_app'], escalate: false, autoRetry: false, retryIntervalHours: 0 },
      { stage: 'warning', daysBeforeExpiry: 7, channels: ['email', 'sms', 'in_app'], escalate: false, autoRetry: true, retryIntervalHours: 24 },
      { stage: 'critical', daysBeforeExpiry: 1, channels: ['email', 'sms', 'phone'], escalate: true, autoRetry: true, retryIntervalHours: 6 },
    ],
  },
}

// ============================================================================
// 消息模板
// ============================================================================

const MESSAGE_TEMPLATES: Record<AlertStage, { subject: string; body: string }> = {
  early: {
    subject: '📅 您的{serviceName}将在30天后到期',
    body: `亲爱的{userName}，

您的「{serviceName}」将于 {expiryDate} 到期。

续费金额：{price} {currency}
当前状态：正常运行中

为避免服务中断，建议您提前续费。
{autoRenewMessage}

👉 点击续费：{renewUrl}

如有疑问，请联系客服。

祝您工作顺利！
Thinkus 团队`,
  },
  warning: {
    subject: '⚠️ 您的{serviceName}将在7天后到期，请尽快续费',
    body: `亲爱的{userName}，

重要提醒：您的「{serviceName}」将于 {expiryDate} 到期，仅剩 7 天！

续费金额：{price} {currency}
{consequenceMessage}

请尽快完成续费，避免影响您的业务。

👉 立即续费：{renewUrl}

需要帮助？拨打客服热线 400-xxx-xxxx

Thinkus 团队`,
  },
  urgent: {
    subject: '🔔 紧急：您的{serviceName}仅剩3天到期！',
    body: `亲爱的{userName}，

【紧急提醒】您的「{serviceName}」将于 {expiryDate} 到期，仅剩 3 天！

{consequenceMessage}

⚠️ 服务到期后，{serviceConsequence}

请立即续费，保障您的业务正常运行！

👉 一键续费：{renewUrl}

客服热线：400-xxx-xxxx（7x24小时）

Thinkus 团队`,
  },
  critical: {
    subject: '🚨 最后提醒：您的{serviceName}明天到期！',
    body: `亲爱的{userName}，

【最后提醒】您的「{serviceName}」将于明天（{expiryDate}）到期！

⚠️ 如不续费，{serviceConsequence}

续费金额：{price} {currency}

👉 立即续费：{renewUrl}

如有任何问题，请立即联系客服：
📞 400-xxx-xxxx（紧急热线）
💬 微信：thinkus_support

Thinkus 团队`,
  },
  due_today: {
    subject: '🆘 今天是最后一天！您的{serviceName}即将到期',
    body: `亲爱的{userName}，

【最后机会】您的「{serviceName}」今天（{expiryDate}）到期！

⚠️ 如果在今天 23:59 前不续费，{serviceConsequence}

👉 立即续费：{renewUrl}

需要延期？请立即联系客服：
📞 400-xxx-xxxx（紧急热线）

Thinkus 团队`,
  },
  grace: {
    subject: '⏰ 您的{serviceName}已进入宽限期',
    body: `亲爱的{userName}，

您的「{serviceName}」已到期，目前处于宽限期。

宽限期剩余：{graceDaysRemaining} 天
宽限期结束日期：{graceEndDate}

⚠️ 宽限期结束后，{serviceConsequence}

请尽快续费恢复正常服务。

👉 立即续费：{renewUrl}

Thinkus 团队`,
  },
  expired: {
    subject: '❌ 您的{serviceName}已停止服务',
    body: `亲爱的{userName}，

您的「{serviceName}」已因未续费而停止服务。

{serviceConsequence}

如需恢复服务，请尽快续费。
{dataRetentionMessage}

👉 恢复服务：{renewUrl}

如有疑问，请联系客服。

Thinkus 团队`,
  },
}

// ============================================================================
// 续费预警系统服务
// ============================================================================

export class RenewalAlertSystem {
  private static instance: RenewalAlertSystem
  private services: Map<string, RegisteredService> = new Map()

  private constructor() {}

  public static getInstance(): RenewalAlertSystem {
    if (!RenewalAlertSystem.instance) {
      RenewalAlertSystem.instance = new RenewalAlertSystem()
    }
    return RenewalAlertSystem.instance
  }

  /**
   * 注册服务
   */
  registerService(service: Omit<RegisteredService, 'id' | 'status' | 'alertsSent' | 'renewalAttempts'>): RegisteredService {
    const id = `svc_${service.projectId}_${service.type}_${Date.now()}`

    const registeredService: RegisteredService = {
      ...service,
      id,
      status: 'active',
      alertsSent: [],
      renewalAttempts: [],
    }

    this.services.set(id, registeredService)

    return registeredService
  }

  /**
   * 检查并发送提醒
   */
  async checkAndSendAlerts(): Promise<{ sent: number; errors: number }> {
    const now = new Date()
    let sent = 0
    let errors = 0

    for (const service of this.services.values()) {
      const daysUntilExpiry = this.getDaysUntilExpiry(service.expiresAt)
      const stage = this.determineStage(daysUntilExpiry, service)

      if (!stage) continue

      const config = SERVICE_CONFIGS[service.type]
      const schedule = config.alertSchedule.find(s => s.stage === stage)

      if (!schedule) continue

      // 检查是否已发送过这个阶段的提醒
      const alreadySent = service.alertsSent.some(
        a => a.stage === stage && a.success
      )

      if (alreadySent && !schedule.autoRetry) continue

      // 检查重试间隔
      if (alreadySent && schedule.autoRetry) {
        const lastAlert = service.alertsSent
          .filter(a => a.stage === stage)
          .sort((a, b) => b.sentAt.getTime() - a.sentAt.getTime())[0]

        if (lastAlert) {
          const hoursSinceLastAlert = (now.getTime() - lastAlert.sentAt.getTime()) / (1000 * 60 * 60)
          if (hoursSinceLastAlert < schedule.retryIntervalHours) continue
        }
      }

      // 发送提醒
      for (const channel of schedule.channels) {
        try {
          await this.sendAlert(service, stage, channel)
          sent++
        } catch (error) {
          errors++
          console.error(`Failed to send ${channel} alert for ${service.id}:`, error)
        }
      }

      // 更新服务状态
      this.updateServiceStatus(service, daysUntilExpiry)
    }

    return { sent, errors }
  }

  /**
   * 确定提醒阶段
   */
  private determineStage(daysUntilExpiry: number, service: RegisteredService): AlertStage | null {
    const config = SERVICE_CONFIGS[service.type]

    if (daysUntilExpiry < -config.gracePeriodDays) {
      return 'expired'
    }
    if (daysUntilExpiry < 0) {
      return 'grace'
    }
    if (daysUntilExpiry === 0) {
      return 'due_today'
    }
    if (daysUntilExpiry <= 1) {
      return 'critical'
    }
    if (daysUntilExpiry <= 3) {
      return 'urgent'
    }
    if (daysUntilExpiry <= 7) {
      return 'warning'
    }
    if (daysUntilExpiry <= 30) {
      return 'early'
    }

    return null
  }

  /**
   * 获取距离到期的天数
   */
  private getDaysUntilExpiry(expiresAt: Date): number {
    const now = new Date()
    const diff = expiresAt.getTime() - now.getTime()
    return Math.floor(diff / (1000 * 60 * 60 * 24))
  }

  /**
   * 发送提醒
   */
  private async sendAlert(
    service: RegisteredService,
    stage: AlertStage,
    channel: NotifyChannel
  ): Promise<void> {
    const config = SERVICE_CONFIGS[service.type]
    const template = MESSAGE_TEMPLATES[stage]

    // 填充模板变量
    const message = this.fillTemplate(template.body, {
      userName: '用户', // 实际需要从用户服务获取
      serviceName: config.label,
      expiryDate: service.expiresAt.toLocaleDateString('zh-CN'),
      price: service.price.toFixed(2),
      currency: service.currency,
      renewUrl: `https://thinkus.app/renew/${service.id}`,
      autoRenewMessage: service.autoRenew ? '已开启自动续费，届时将自动扣款。' : '',
      consequenceMessage: this.getConsequenceMessage(service.type, stage),
      serviceConsequence: this.getServiceConsequence(service.type),
      graceDaysRemaining: config.gracePeriodDays.toString(),
      graceEndDate: new Date(service.expiresAt.getTime() + config.gracePeriodDays * 24 * 60 * 60 * 1000).toLocaleDateString('zh-CN'),
      dataRetentionMessage: '您的数据将保留30天，请尽快恢复服务。',
    })

    const subject = this.fillTemplate(template.subject, {
      serviceName: config.label,
    })

    // 根据渠道发送
    switch (channel) {
      case 'email':
        await this.sendEmail(service.userId, subject, message)
        break
      case 'sms':
        await this.sendSMS(service.userId, message.substring(0, 200))
        break
      case 'phone':
        await this.schedulePhoneCall(service.userId, service)
        break
      case 'in_app':
        await this.sendInAppNotification(service.userId, subject, message)
        break
      case 'wechat':
        await this.sendWechatMessage(service.userId, subject, message)
        break
    }

    // 记录发送结果
    service.alertsSent.push({
      stage,
      channel,
      sentAt: new Date(),
      success: true,
    })
  }

  /**
   * 填充模板
   */
  private fillTemplate(template: string, vars: Record<string, string>): string {
    let result = template
    for (const [key, value] of Object.entries(vars)) {
      result = result.replace(new RegExp(`\\{${key}\\}`, 'g'), value)
    }
    return result
  }

  /**
   * 获取后果消息
   */
  private getConsequenceMessage(type: ServiceType, stage: AlertStage): string {
    const config = SERVICE_CONFIGS[type]

    if (stage === 'warning') {
      return config.criticalService
        ? '⚠️ 这是关键服务，到期后将影响网站正常运行。'
        : ''
    }

    if (stage === 'urgent' || stage === 'critical') {
      return config.criticalService
        ? '⚠️ 重要提醒：服务到期后，您的网站将无法访问！'
        : '⚠️ 服务到期后，相关功能将受限。'
    }

    return ''
  }

  /**
   * 获取服务后果描述
   */
  private getServiceConsequence(type: ServiceType): string {
    const consequences: Record<ServiceType, string> = {
      hosting: '您的网站将无法访问',
      domain: '域名将被释放，可能被他人注册',
      ssl: '网站将显示"不安全"警告',
      database: '数据库将变为只读，无法写入新数据',
      storage: '存储空间将变为只读',
      email: '邮件服务将暂停',
      cdn: 'CDN加速将停止，网站访问速度可能变慢',
      monitoring: '监控服务将停止，无法收到告警',
      support: '技术支持将降级为基础版',
      subscription: '套餐将降级为免费版，部分功能受限',
    }
    return consequences[type]
  }

  /**
   * 更新服务状态
   */
  private updateServiceStatus(service: RegisteredService, daysUntilExpiry: number): void {
    const config = SERVICE_CONFIGS[service.type]

    if (daysUntilExpiry < -config.gracePeriodDays) {
      service.status = config.degradeOnExpire ? 'suspended' : 'terminated'
    } else if (daysUntilExpiry < 0) {
      service.status = 'grace_period'
    } else if (daysUntilExpiry <= 7) {
      service.status = 'expiring'
    } else {
      service.status = 'active'
    }
  }

  // 通知发送方法（简化实现）
  private async sendEmail(userId: string, subject: string, body: string): Promise<void> {
    console.log(`[EMAIL] To: ${userId}, Subject: ${subject}`)
    // TODO: 调用邮件服务
  }

  private async sendSMS(userId: string, message: string): Promise<void> {
    console.log(`[SMS] To: ${userId}, Message: ${message}`)
    // TODO: 调用短信服务
  }

  private async schedulePhoneCall(userId: string, service: RegisteredService): Promise<void> {
    console.log(`[PHONE] Schedule call for: ${userId}, Service: ${service.name}`)
    // TODO: 创建电话回访任务
  }

  private async sendInAppNotification(userId: string, title: string, message: string): Promise<void> {
    console.log(`[IN_APP] To: ${userId}, Title: ${title}`)
    // TODO: 调用站内通知服务
  }

  private async sendWechatMessage(userId: string, title: string, message: string): Promise<void> {
    console.log(`[WECHAT] To: ${userId}, Title: ${title}`)
    // TODO: 调用微信模板消息
  }

  /**
   * 获取续费摘要
   */
  getRenewalSummary(projectId: string): RenewalSummary {
    const projectServices = Array.from(this.services.values())
      .filter(s => s.projectId === projectId)

    const now = new Date()
    const expiringServices: ExpiringService[] = []
    const expiredServices: ExpiringService[] = []
    const upcomingRenewals: UpcomingRenewal[] = []
    let totalCost = 0

    for (const service of projectServices) {
      const daysRemaining = this.getDaysUntilExpiry(service.expiresAt)
      const stage = this.determineStage(daysRemaining, service)

      if (daysRemaining < 0) {
        expiredServices.push({
          service,
          daysRemaining,
          stage: stage || 'expired',
          actionRequired: '请立即续费恢复服务',
        })
      } else if (daysRemaining <= 30) {
        expiringServices.push({
          service,
          daysRemaining,
          stage: stage || 'early',
          actionRequired: this.getActionRequired(daysRemaining),
        })
      }

      if (service.autoRenew && daysRemaining > 0 && daysRemaining <= 30) {
        upcomingRenewals.push({
          service,
          renewalDate: service.expiresAt,
          amount: service.price,
          paymentMethod: service.paymentMethodId || '未设置',
        })
        totalCost += service.price
      }
    }

    // 确定健康状态
    let healthStatus: 'healthy' | 'warning' | 'critical' | 'danger' = 'healthy'
    if (expiredServices.length > 0) {
      healthStatus = 'danger'
    } else if (expiringServices.some(s => s.daysRemaining <= 3)) {
      healthStatus = 'critical'
    } else if (expiringServices.some(s => s.daysRemaining <= 7)) {
      healthStatus = 'warning'
    }

    // 生成建议
    const recommendations: string[] = []
    if (expiredServices.length > 0) {
      recommendations.push(`您有 ${expiredServices.length} 项服务已过期，请尽快续费`)
    }
    if (expiringServices.some(s => !s.service.autoRenew)) {
      recommendations.push('建议开启自动续费，避免服务中断')
    }

    return {
      totalServices: projectServices.length,
      expiringServices,
      expiredServices,
      upcomingRenewals,
      totalRenewalCost: totalCost,
      currency: 'CNY',
      nextExpiryDate: expiringServices[0]?.service.expiresAt,
      healthStatus,
      recommendations,
    }
  }

  /**
   * 获取需要的操作
   */
  private getActionRequired(daysRemaining: number): string {
    if (daysRemaining <= 1) return '请立即续费，避免服务中断'
    if (daysRemaining <= 3) return '请尽快续费'
    if (daysRemaining <= 7) return '建议尽早续费'
    return '可提前续费享优惠'
  }

  /**
   * 执行自动续费
   */
  async attemptAutoRenewal(serviceId: string): Promise<{ success: boolean; error?: string }> {
    const service = this.services.get(serviceId)
    if (!service) {
      return { success: false, error: '服务不存在' }
    }

    if (!service.autoRenew) {
      return { success: false, error: '未开启自动续费' }
    }

    if (!service.paymentMethodId) {
      return { success: false, error: '未设置支付方式' }
    }

    // TODO: 调用支付服务执行扣款
    const success = Math.random() > 0.1  // 模拟90%成功率

    const attempt: RenewalAttempt = {
      attemptedAt: new Date(),
      success,
      amount: service.price,
      paymentMethod: service.paymentMethodId,
      transactionId: success ? `txn_${Date.now()}` : undefined,
      error: success ? undefined : '支付失败',
    }

    service.renewalAttempts.push(attempt)

    if (success) {
      // 更新到期时间
      service.expiresAt = new Date(service.expiresAt.getTime() + 365 * 24 * 60 * 60 * 1000)
      service.lastRenewalAt = new Date()
      service.status = 'active'
    }

    return { success, error: attempt.error }
  }
}

// 导出单例
export const renewalAlertSystem = RenewalAlertSystem.getInstance()
