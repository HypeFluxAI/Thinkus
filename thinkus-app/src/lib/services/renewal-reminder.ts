/**
 * 自动续费提醒服务
 *
 * 小白用户优化 P2-3: 在服务到期前自动提醒用户续费
 *
 * 功能:
 * - 追踪各种服务的到期时间
 * - 多渠道提醒（邮件、站内、短信）
 * - 一键续费入口
 * - 续费历史记录
 */

// 服务类型
export type ServiceType =
  | 'domain'           // 域名
  | 'hosting'          // 托管服务
  | 'ssl'              // SSL证书
  | 'database'         // 数据库服务
  | 'storage'          // 存储服务
  | 'email'            // 邮件服务
  | 'cdn'              // CDN服务
  | 'monitoring'       // 监控服务
  | 'support'          // 技术支持
  | 'subscription'     // 订阅计划

// 提醒渠道
export type ReminderChannel = 'email' | 'sms' | 'in_app' | 'push'

// 提醒状态
export type ReminderStatus = 'pending' | 'sent' | 'read' | 'acted' | 'expired'

// 服务记录
export interface ServiceRecord {
  id: string
  projectId: string
  userId: string
  type: ServiceType
  name: string                    // 服务名称
  provider: string                // 服务提供商
  startDate: Date
  expiryDate: Date
  renewalPrice: number            // 续费价格
  currency: 'CNY' | 'USD'
  autoRenew: boolean              // 是否自动续费
  paymentMethodId?: string        // 支付方式ID
  status: 'active' | 'expiring' | 'expired' | 'cancelled'
  metadata?: Record<string, unknown>
}

// 提醒记录
export interface ReminderRecord {
  id: string
  serviceId: string
  projectId: string
  userId: string
  channel: ReminderChannel
  scheduledAt: Date
  sentAt?: Date
  readAt?: Date
  actedAt?: Date
  status: ReminderStatus
  message: string
  renewalUrl: string
}

// 提醒配置
export interface ReminderConfig {
  serviceType: ServiceType
  daysBeforeExpiry: number[]      // 提前几天提醒
  channels: ReminderChannel[]
  emailTemplate: string
  urgencyLevel: 'low' | 'medium' | 'high' | 'critical'
}

// 续费摘要
export interface RenewalSummary {
  projectId: string
  totalServices: number
  expiringServices: ServiceRecord[]
  expiredServices: ServiceRecord[]
  upcomingRenewals: Array<{
    service: ServiceRecord
    daysUntilExpiry: number
  }>
  totalRenewalCost: number
  currency: 'CNY' | 'USD'
}

// 服务配置
const SERVICE_CONFIG: Record<ServiceType, {
  label: string
  icon: string
  defaultReminders: number[]  // 默认提醒天数
  criticalDays: number        // 多少天内为紧急
}> = {
  domain: {
    label: '域名',
    icon: '🌐',
    defaultReminders: [30, 14, 7, 3, 1],
    criticalDays: 7
  },
  hosting: {
    label: '托管服务',
    icon: '☁️',
    defaultReminders: [14, 7, 3, 1],
    criticalDays: 3
  },
  ssl: {
    label: 'SSL证书',
    icon: '🔒',
    defaultReminders: [30, 14, 7, 1],
    criticalDays: 7
  },
  database: {
    label: '数据库服务',
    icon: '🗄️',
    defaultReminders: [14, 7, 3, 1],
    criticalDays: 3
  },
  storage: {
    label: '存储服务',
    icon: '💾',
    defaultReminders: [14, 7, 3],
    criticalDays: 3
  },
  email: {
    label: '邮件服务',
    icon: '📧',
    defaultReminders: [14, 7, 3],
    criticalDays: 3
  },
  cdn: {
    label: 'CDN服务',
    icon: '🚀',
    defaultReminders: [14, 7, 3],
    criticalDays: 3
  },
  monitoring: {
    label: '监控服务',
    icon: '📊',
    defaultReminders: [7, 3, 1],
    criticalDays: 3
  },
  support: {
    label: '技术支持',
    icon: '👨‍💻',
    defaultReminders: [14, 7, 3],
    criticalDays: 7
  },
  subscription: {
    label: '订阅计划',
    icon: '📋',
    defaultReminders: [7, 3, 1],
    criticalDays: 3
  }
}

// 邮件模板
const EMAIL_TEMPLATES = {
  reminder: (service: ServiceRecord, daysLeft: number) => `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <style>
    body { font-family: system-ui, -apple-system, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px; }
    .header { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 30px; border-radius: 12px 12px 0 0; text-align: center; }
    .content { background: #fff; padding: 30px; border: 1px solid #eee; border-top: none; }
    .service-card { background: #f8f9fa; padding: 20px; border-radius: 8px; margin: 20px 0; }
    .urgent { background: #fff3cd; border-left: 4px solid #ffc107; }
    .critical { background: #f8d7da; border-left: 4px solid #dc3545; }
    .button { display: inline-block; background: #667eea; color: white; padding: 12px 30px; border-radius: 6px; text-decoration: none; font-weight: bold; }
    .footer { text-align: center; color: #666; font-size: 14px; margin-top: 30px; }
  </style>
</head>
<body>
  <div class="header">
    <h1>⏰ 续费提醒</h1>
  </div>
  <div class="content">
    <p>您好！</p>
    <p>您的以下服务即将到期，请及时续费以避免服务中断：</p>

    <div class="service-card ${daysLeft <= 3 ? 'critical' : daysLeft <= 7 ? 'urgent' : ''}">
      <h3>${SERVICE_CONFIG[service.type].icon} ${service.name}</h3>
      <p><strong>服务类型:</strong> ${SERVICE_CONFIG[service.type].label}</p>
      <p><strong>到期时间:</strong> ${new Date(service.expiryDate).toLocaleDateString('zh-CN')}</p>
      <p><strong>剩余天数:</strong> <span style="color: ${daysLeft <= 3 ? '#dc3545' : daysLeft <= 7 ? '#ffc107' : '#28a745'}; font-weight: bold;">${daysLeft} 天</span></p>
      <p><strong>续费费用:</strong> ${service.currency === 'CNY' ? '¥' : '$'}${service.renewalPrice}</p>
    </div>

    ${daysLeft <= 3 ? '<p style="color: #dc3545; font-weight: bold;">⚠️ 服务即将到期，请立即续费！</p>' : ''}

    <p style="text-align: center; margin: 30px 0;">
      <a href="https://thinkus.app/projects/${service.projectId}/renew/${service.id}" class="button">
        立即续费
      </a>
    </p>

    <p>如您已开启自动续费，请忽略此邮件。</p>
    <p>如有任何问题，请联系我们的客服团队。</p>
  </div>
  <div class="footer">
    <p>此邮件由 Thinkus 自动发送，请勿直接回复。</p>
    <p>© ${new Date().getFullYear()} Thinkus. All rights reserved.</p>
  </div>
</body>
</html>
  `,

  expiredWarning: (service: ServiceRecord) => `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <style>
    body { font-family: system-ui, -apple-system, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px; }
    .header { background: #dc3545; color: white; padding: 30px; border-radius: 12px 12px 0 0; text-align: center; }
    .content { background: #fff; padding: 30px; border: 1px solid #eee; border-top: none; }
    .service-card { background: #f8d7da; padding: 20px; border-radius: 8px; margin: 20px 0; border-left: 4px solid #dc3545; }
    .button { display: inline-block; background: #dc3545; color: white; padding: 12px 30px; border-radius: 6px; text-decoration: none; font-weight: bold; }
    .footer { text-align: center; color: #666; font-size: 14px; margin-top: 30px; }
  </style>
</head>
<body>
  <div class="header">
    <h1>🚨 服务已过期</h1>
  </div>
  <div class="content">
    <p><strong>紧急通知！</strong></p>
    <p>您的以下服务已经过期，可能导致您的网站或应用无法正常访问：</p>

    <div class="service-card">
      <h3>${SERVICE_CONFIG[service.type].icon} ${service.name}</h3>
      <p><strong>服务类型:</strong> ${SERVICE_CONFIG[service.type].label}</p>
      <p><strong>过期时间:</strong> ${new Date(service.expiryDate).toLocaleDateString('zh-CN')}</p>
      <p><strong>续费费用:</strong> ${service.currency === 'CNY' ? '¥' : '$'}${service.renewalPrice}</p>
    </div>

    <p style="color: #dc3545; font-weight: bold;">
      ⚠️ 请立即续费以恢复服务！
    </p>

    <p style="text-align: center; margin: 30px 0;">
      <a href="https://thinkus.app/projects/${service.projectId}/renew/${service.id}" class="button">
        立即续费
      </a>
    </p>

    <p>如需帮助，请联系我们的客服团队。</p>
  </div>
  <div class="footer">
    <p>此邮件由 Thinkus 自动发送，请勿直接回复。</p>
  </div>
</body>
</html>
  `
}

/**
 * 续费提醒服务
 */
export class RenewalReminderService {
  // 模拟存储
  private services: Map<string, ServiceRecord> = new Map()
  private reminders: Map<string, ReminderRecord> = new Map()

  /**
   * 注册服务
   */
  registerService(service: Omit<ServiceRecord, 'id' | 'status'>): ServiceRecord {
    const id = `svc_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
    const status = this.calculateStatus(service.expiryDate)

    const record: ServiceRecord = {
      ...service,
      id,
      status
    }

    this.services.set(id, record)

    // 自动创建提醒
    this.scheduleReminders(record)

    return record
  }

  /**
   * 计算服务状态
   */
  private calculateStatus(expiryDate: Date): ServiceRecord['status'] {
    const now = new Date()
    const expiry = new Date(expiryDate)
    const daysLeft = Math.ceil((expiry.getTime() - now.getTime()) / (1000 * 60 * 60 * 24))

    if (daysLeft < 0) return 'expired'
    if (daysLeft <= 7) return 'expiring'
    return 'active'
  }

  /**
   * 计算剩余天数
   */
  getDaysUntilExpiry(expiryDate: Date): number {
    const now = new Date()
    const expiry = new Date(expiryDate)
    return Math.ceil((expiry.getTime() - now.getTime()) / (1000 * 60 * 60 * 24))
  }

  /**
   * 安排提醒
   */
  private scheduleReminders(service: ServiceRecord): void {
    const config = SERVICE_CONFIG[service.type]
    const daysLeft = this.getDaysUntilExpiry(service.expiryDate)

    for (const reminderDays of config.defaultReminders) {
      if (daysLeft >= reminderDays) {
        const scheduledAt = new Date(service.expiryDate)
        scheduledAt.setDate(scheduledAt.getDate() - reminderDays)

        const reminder: ReminderRecord = {
          id: `rem_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
          serviceId: service.id,
          projectId: service.projectId,
          userId: service.userId,
          channel: 'email',
          scheduledAt,
          status: 'pending',
          message: `您的${config.label}「${service.name}」将在 ${reminderDays} 天后到期`,
          renewalUrl: `https://thinkus.app/projects/${service.projectId}/renew/${service.id}`
        }

        this.reminders.set(reminder.id, reminder)
      }
    }
  }

  /**
   * 获取项目的续费摘要
   */
  getRenewalSummary(projectId: string): RenewalSummary {
    const projectServices = Array.from(this.services.values())
      .filter(s => s.projectId === projectId)

    const now = new Date()
    const expiringServices = projectServices.filter(s => s.status === 'expiring')
    const expiredServices = projectServices.filter(s => s.status === 'expired')

    const upcomingRenewals = projectServices
      .filter(s => s.status === 'active' || s.status === 'expiring')
      .map(service => ({
        service,
        daysUntilExpiry: this.getDaysUntilExpiry(service.expiryDate)
      }))
      .sort((a, b) => a.daysUntilExpiry - b.daysUntilExpiry)
      .slice(0, 5)

    const totalRenewalCost = [...expiringServices, ...expiredServices]
      .reduce((sum, s) => sum + s.renewalPrice, 0)

    return {
      projectId,
      totalServices: projectServices.length,
      expiringServices,
      expiredServices,
      upcomingRenewals,
      totalRenewalCost,
      currency: 'CNY'
    }
  }

  /**
   * 获取待发送的提醒
   */
  getPendingReminders(): ReminderRecord[] {
    const now = new Date()
    return Array.from(this.reminders.values())
      .filter(r => r.status === 'pending' && new Date(r.scheduledAt) <= now)
  }

  /**
   * 发送提醒
   */
  async sendReminder(reminderId: string): Promise<boolean> {
    const reminder = this.reminders.get(reminderId)
    if (!reminder) return false

    const service = this.services.get(reminder.serviceId)
    if (!service) return false

    // 生成邮件内容
    const daysLeft = this.getDaysUntilExpiry(service.expiryDate)
    const emailHtml = daysLeft < 0
      ? EMAIL_TEMPLATES.expiredWarning(service)
      : EMAIL_TEMPLATES.reminder(service, daysLeft)

    // 模拟发送邮件
    console.log(`[RenewalReminder] Sending reminder for ${service.name}`)

    // 更新状态
    reminder.sentAt = new Date()
    reminder.status = 'sent'
    this.reminders.set(reminderId, reminder)

    return true
  }

  /**
   * 标记提醒已读
   */
  markReminderAsRead(reminderId: string): void {
    const reminder = this.reminders.get(reminderId)
    if (reminder) {
      reminder.readAt = new Date()
      reminder.status = 'read'
      this.reminders.set(reminderId, reminder)
    }
  }

  /**
   * 标记提醒已处理
   */
  markReminderAsActed(reminderId: string): void {
    const reminder = this.reminders.get(reminderId)
    if (reminder) {
      reminder.actedAt = new Date()
      reminder.status = 'acted'
      this.reminders.set(reminderId, reminder)
    }
  }

  /**
   * 获取用户的所有提醒
   */
  getUserReminders(userId: string): ReminderRecord[] {
    return Array.from(this.reminders.values())
      .filter(r => r.userId === userId)
      .sort((a, b) => new Date(b.scheduledAt).getTime() - new Date(a.scheduledAt).getTime())
  }

  /**
   * 生成续费提醒邮件HTML
   */
  generateReminderEmail(service: ServiceRecord): string {
    const daysLeft = this.getDaysUntilExpiry(service.expiryDate)
    return daysLeft < 0
      ? EMAIL_TEMPLATES.expiredWarning(service)
      : EMAIL_TEMPLATES.reminder(service, daysLeft)
  }

  /**
   * 开启自动续费
   */
  enableAutoRenewal(serviceId: string, paymentMethodId: string): boolean {
    const service = this.services.get(serviceId)
    if (!service) return false

    service.autoRenew = true
    service.paymentMethodId = paymentMethodId
    this.services.set(serviceId, service)

    return true
  }

  /**
   * 关闭自动续费
   */
  disableAutoRenewal(serviceId: string): boolean {
    const service = this.services.get(serviceId)
    if (!service) return false

    service.autoRenew = false
    service.paymentMethodId = undefined
    this.services.set(serviceId, service)

    return true
  }

  /**
   * 续费服务
   */
  async renewService(
    serviceId: string,
    durationMonths: number = 12
  ): Promise<{ success: boolean; newExpiryDate?: Date; message: string }> {
    const service = this.services.get(serviceId)
    if (!service) {
      return { success: false, message: '服务不存在' }
    }

    // 计算新的到期时间
    const currentExpiry = new Date(service.expiryDate)
    const now = new Date()
    const baseDate = currentExpiry > now ? currentExpiry : now
    const newExpiryDate = new Date(baseDate)
    newExpiryDate.setMonth(newExpiryDate.getMonth() + durationMonths)

    // 更新服务
    service.expiryDate = newExpiryDate
    service.status = 'active'
    this.services.set(serviceId, service)

    // 取消待发送的提醒
    for (const [id, reminder] of this.reminders) {
      if (reminder.serviceId === serviceId && reminder.status === 'pending') {
        this.reminders.delete(id)
      }
    }

    // 重新安排提醒
    this.scheduleReminders(service)

    return {
      success: true,
      newExpiryDate,
      message: `续费成功！新的到期时间: ${newExpiryDate.toLocaleDateString('zh-CN')}`
    }
  }

  /**
   * 获取服务配置信息
   */
  getServiceConfig(type: ServiceType) {
    return SERVICE_CONFIG[type]
  }

  /**
   * 获取所有服务配置
   */
  getAllServiceConfigs() {
    return SERVICE_CONFIG
  }

  /**
   * 生成续费摘要文本（人话）
   */
  generateSummaryText(summary: RenewalSummary): string {
    const lines: string[] = []

    lines.push('📋 续费概况')
    lines.push('')

    if (summary.expiredServices.length > 0) {
      lines.push(`🚨 已过期: ${summary.expiredServices.length} 项服务`)
      for (const service of summary.expiredServices) {
        const config = SERVICE_CONFIG[service.type]
        lines.push(`  ${config.icon} ${service.name} - 已过期 ${Math.abs(this.getDaysUntilExpiry(service.expiryDate))} 天`)
      }
      lines.push('')
    }

    if (summary.expiringServices.length > 0) {
      lines.push(`⚠️ 即将到期: ${summary.expiringServices.length} 项服务`)
      for (const service of summary.expiringServices) {
        const config = SERVICE_CONFIG[service.type]
        const daysLeft = this.getDaysUntilExpiry(service.expiryDate)
        lines.push(`  ${config.icon} ${service.name} - ${daysLeft} 天后到期`)
      }
      lines.push('')
    }

    if (summary.upcomingRenewals.length > 0 &&
        summary.expiredServices.length === 0 &&
        summary.expiringServices.length === 0) {
      lines.push('✅ 所有服务运行正常')
      lines.push('')
      lines.push('📅 近期续费:')
      for (const { service, daysUntilExpiry } of summary.upcomingRenewals.slice(0, 3)) {
        const config = SERVICE_CONFIG[service.type]
        lines.push(`  ${config.icon} ${service.name} - ${daysUntilExpiry} 天后`)
      }
    }

    if (summary.totalRenewalCost > 0) {
      lines.push('')
      lines.push(`💰 待续费总额: ${summary.currency === 'CNY' ? '¥' : '$'}${summary.totalRenewalCost}`)
    }

    return lines.join('\n')
  }
}

// 导出单例
export const renewalReminder = new RenewalReminderService()
