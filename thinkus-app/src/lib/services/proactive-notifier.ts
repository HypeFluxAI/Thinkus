/**
 * 主动通知系统服务
 *
 * 主动向用户推送重要信息，而不是等用户来查看
 * - 状态变化通知
 * - 续费提醒
 * - 使用建议
 * - 安全警报
 */

// ============================================================================
// 类型定义
// ============================================================================

/** 通知类型 */
export type NotificationType =
  | 'status_change'      // 状态变化
  | 'renewal_reminder'   // 续费提醒
  | 'usage_tip'          // 使用建议
  | 'security_alert'     // 安全警报
  | 'maintenance'        // 维护通知
  | 'feature_update'     // 功能更新
  | 'milestone'          // 里程碑达成
  | 'activity_report'    // 活动报告
  | 'survey_request'     // 调查请求
  | 'support_followup'   // 客服跟进

/** 通知优先级 */
export type NotificationPriority = 'low' | 'normal' | 'high' | 'urgent'

/** 通知渠道 */
export type NotificationChannel = 'in_app' | 'email' | 'sms' | 'wechat' | 'push'

/** 通知状态 */
export type NotificationStatus = 'pending' | 'sent' | 'delivered' | 'read' | 'failed'

/** 通知 */
export interface Notification {
  id: string
  projectId: string
  userId: string
  type: NotificationType
  priority: NotificationPriority
  title: string
  message: string
  icon: string
  actionUrl?: string
  actionText?: string
  channels: NotificationChannel[]
  status: NotificationStatus
  createdAt: Date
  sentAt?: Date
  readAt?: Date
  metadata?: Record<string, unknown>
}

/** 通知模板 */
export interface NotificationTemplate {
  id: string
  type: NotificationType
  title: string
  message: string
  icon: string
  defaultChannels: NotificationChannel[]
  defaultPriority: NotificationPriority
  variables: string[]
}

/** 通知偏好 */
export interface NotificationPreferences {
  userId: string
  enabledTypes: NotificationType[]
  enabledChannels: NotificationChannel[]
  quietHoursStart?: string  // HH:mm
  quietHoursEnd?: string
  emailFrequency: 'instant' | 'hourly' | 'daily' | 'weekly'
  language: 'zh-CN' | 'en-US'
}

/** 通知规则 */
export interface NotificationRule {
  id: string
  name: string
  description: string
  trigger: NotificationTrigger
  conditions: NotificationCondition[]
  template: string
  enabled: boolean
}

/** 触发器类型 */
export type NotificationTrigger =
  | 'status_healthy_to_error'
  | 'status_error_to_healthy'
  | 'uptime_below_threshold'
  | 'response_time_above_threshold'
  | 'renewal_due_in_days'
  | 'inactive_for_days'
  | 'error_count_threshold'
  | 'scheduled'
  | 'manual'

/** 通知条件 */
export interface NotificationCondition {
  field: string
  operator: 'eq' | 'ne' | 'gt' | 'lt' | 'gte' | 'lte' | 'contains'
  value: unknown
}

/** 发送统计 */
export interface NotificationStats {
  totalSent: number
  byType: Record<NotificationType, number>
  byChannel: Record<NotificationChannel, number>
  deliveryRate: number
  readRate: number
  avgReadTimeMinutes: number
}

// ============================================================================
// 配置
// ============================================================================

/** 通知类型配置 */
const NOTIFICATION_TYPE_CONFIG: Record<NotificationType, {
  label: string
  icon: string
  defaultPriority: NotificationPriority
  defaultChannels: NotificationChannel[]
}> = {
  status_change: {
    label: '状态变化',
    icon: '🚦',
    defaultPriority: 'high',
    defaultChannels: ['in_app', 'email']
  },
  renewal_reminder: {
    label: '续费提醒',
    icon: '💳',
    defaultPriority: 'normal',
    defaultChannels: ['in_app', 'email']
  },
  usage_tip: {
    label: '使用建议',
    icon: '💡',
    defaultPriority: 'low',
    defaultChannels: ['in_app']
  },
  security_alert: {
    label: '安全警报',
    icon: '🔐',
    defaultPriority: 'urgent',
    defaultChannels: ['in_app', 'email', 'sms']
  },
  maintenance: {
    label: '维护通知',
    icon: '🔧',
    defaultPriority: 'normal',
    defaultChannels: ['in_app', 'email']
  },
  feature_update: {
    label: '功能更新',
    icon: '✨',
    defaultPriority: 'low',
    defaultChannels: ['in_app']
  },
  milestone: {
    label: '里程碑',
    icon: '🎉',
    defaultPriority: 'normal',
    defaultChannels: ['in_app']
  },
  activity_report: {
    label: '活动报告',
    icon: '📊',
    defaultPriority: 'low',
    defaultChannels: ['email']
  },
  survey_request: {
    label: '调查请求',
    icon: '📝',
    defaultPriority: 'normal',
    defaultChannels: ['in_app', 'email']
  },
  support_followup: {
    label: '客服跟进',
    icon: '💬',
    defaultPriority: 'high',
    defaultChannels: ['in_app', 'email']
  }
}

/** 预定义通知模板 */
const NOTIFICATION_TEMPLATES: NotificationTemplate[] = [
  // 状态变化
  {
    id: 'status_down',
    type: 'status_change',
    title: '您的产品出现问题',
    message: '我们检测到 {{productName}} 目前无法正常访问。我们的团队正在紧急处理中，预计 {{estimatedTime}} 恢复。',
    icon: '🔴',
    defaultChannels: ['in_app', 'email', 'sms'],
    defaultPriority: 'urgent',
    variables: ['productName', 'estimatedTime']
  },
  {
    id: 'status_recovered',
    type: 'status_change',
    title: '您的产品已恢复正常',
    message: '好消息！{{productName}} 已经恢复正常运行。故障持续时间：{{downtime}}',
    icon: '🟢',
    defaultChannels: ['in_app', 'email'],
    defaultPriority: 'high',
    variables: ['productName', 'downtime']
  },

  // 续费提醒
  {
    id: 'renewal_30days',
    type: 'renewal_reminder',
    title: '服务即将到期',
    message: '您的 {{serviceName}} 将在 30 天后到期（{{expiryDate}}）。请及时续费以避免服务中断。',
    icon: '📅',
    defaultChannels: ['in_app', 'email'],
    defaultPriority: 'normal',
    variables: ['serviceName', 'expiryDate']
  },
  {
    id: 'renewal_7days',
    type: 'renewal_reminder',
    title: '服务即将到期',
    message: '紧急提醒：您的 {{serviceName}} 将在 7 天后到期。请立即续费！',
    icon: '⚠️',
    defaultChannels: ['in_app', 'email', 'sms'],
    defaultPriority: 'high',
    variables: ['serviceName', 'expiryDate']
  },

  // 安全警报
  {
    id: 'security_login_new_device',
    type: 'security_alert',
    title: '新设备登录提醒',
    message: '您的账号在新设备上登录。设备：{{device}}，位置：{{location}}，时间：{{time}}。如非本人操作，请立即修改密码。',
    icon: '🔐',
    defaultChannels: ['in_app', 'email'],
    defaultPriority: 'high',
    variables: ['device', 'location', 'time']
  },
  {
    id: 'security_failed_logins',
    type: 'security_alert',
    title: '登录异常警告',
    message: '检测到 {{count}} 次失败的登录尝试。如非本人操作，建议您立即修改密码并启用双重认证。',
    icon: '🚨',
    defaultChannels: ['in_app', 'email', 'sms'],
    defaultPriority: 'urgent',
    variables: ['count']
  },

  // 使用建议
  {
    id: 'tip_unused_feature',
    type: 'usage_tip',
    title: '发现一个好功能',
    message: '您还没用过"{{featureName}}"功能呢！这个功能可以帮助您 {{featureBenefit}}。点击了解更多~',
    icon: '💡',
    defaultChannels: ['in_app'],
    defaultPriority: 'low',
    variables: ['featureName', 'featureBenefit']
  },

  // 里程碑
  {
    id: 'milestone_users',
    type: 'milestone',
    title: '恭喜达成里程碑！',
    message: '🎉 太棒了！您的产品已经有 {{userCount}} 位用户了！继续加油！',
    icon: '🏆',
    defaultChannels: ['in_app'],
    defaultPriority: 'normal',
    variables: ['userCount']
  },

  // 维护通知
  {
    id: 'maintenance_scheduled',
    type: 'maintenance',
    title: '计划维护通知',
    message: '我们将于 {{startTime}} 至 {{endTime}} 进行系统维护升级。届时服务可能短暂中断，请提前做好安排。',
    icon: '🔧',
    defaultChannels: ['in_app', 'email'],
    defaultPriority: 'normal',
    variables: ['startTime', 'endTime']
  },

  // 活动报告
  {
    id: 'weekly_report',
    type: 'activity_report',
    title: '本周活动报告',
    message: '过去一周，您的产品运行正常率 {{uptime}}%，共服务 {{visits}} 位访客。查看完整报告~',
    icon: '📊',
    defaultChannels: ['email'],
    defaultPriority: 'low',
    variables: ['uptime', 'visits']
  }
]

/** 默认通知规则 */
const DEFAULT_RULES: NotificationRule[] = [
  {
    id: 'rule_status_down',
    name: '状态异常通知',
    description: '当产品状态从正常变为异常时通知用户',
    trigger: 'status_healthy_to_error',
    conditions: [],
    template: 'status_down',
    enabled: true
  },
  {
    id: 'rule_status_up',
    name: '状态恢复通知',
    description: '当产品状态从异常恢复正常时通知用户',
    trigger: 'status_error_to_healthy',
    conditions: [],
    template: 'status_recovered',
    enabled: true
  },
  {
    id: 'rule_renewal_30',
    name: '30天续费提醒',
    description: '服务到期前30天提醒',
    trigger: 'renewal_due_in_days',
    conditions: [{ field: 'daysUntilExpiry', operator: 'eq', value: 30 }],
    template: 'renewal_30days',
    enabled: true
  },
  {
    id: 'rule_renewal_7',
    name: '7天续费提醒',
    description: '服务到期前7天提醒',
    trigger: 'renewal_due_in_days',
    conditions: [{ field: 'daysUntilExpiry', operator: 'eq', value: 7 }],
    template: 'renewal_7days',
    enabled: true
  }
]

// ============================================================================
// 辅助函数
// ============================================================================

function generateId(): string {
  return `notif-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`
}

function interpolate(template: string, variables: Record<string, unknown>): string {
  return template.replace(/\{\{(\w+)\}\}/g, (match, key) => {
    return variables[key]?.toString() || match
  })
}

// ============================================================================
// 主动通知服务
// ============================================================================

export class ProactiveNotifierService {
  // 存储通知
  private notifications: Map<string, Notification[]> = new Map()
  // 存储偏好
  private preferences: Map<string, NotificationPreferences> = new Map()
  // 存储规则
  private rules: NotificationRule[] = [...DEFAULT_RULES]

  /**
   * 发送通知
   */
  async sendNotification(
    projectId: string,
    userId: string,
    type: NotificationType,
    title: string,
    message: string,
    options: {
      priority?: NotificationPriority
      channels?: NotificationChannel[]
      actionUrl?: string
      actionText?: string
      metadata?: Record<string, unknown>
    } = {}
  ): Promise<Notification> {
    const typeConfig = NOTIFICATION_TYPE_CONFIG[type]

    const notification: Notification = {
      id: generateId(),
      projectId,
      userId,
      type,
      priority: options.priority || typeConfig.defaultPriority,
      title,
      message,
      icon: typeConfig.icon,
      actionUrl: options.actionUrl,
      actionText: options.actionText,
      channels: options.channels || typeConfig.defaultChannels,
      status: 'pending',
      createdAt: new Date(),
      metadata: options.metadata
    }

    // 检查用户偏好
    const prefs = this.preferences.get(userId)
    if (prefs) {
      // 检查是否启用该类型
      if (!prefs.enabledTypes.includes(type)) {
        console.log(`[通知] 用户 ${userId} 已禁用 ${type} 类型通知`)
        notification.status = 'failed'
        return notification
      }

      // 过滤渠道
      notification.channels = notification.channels.filter(ch =>
        prefs.enabledChannels.includes(ch)
      )

      // 检查静默时间
      if (prefs.quietHoursStart && prefs.quietHoursEnd) {
        const now = new Date()
        const currentTime = `${now.getHours().toString().padStart(2, '0')}:${now.getMinutes().toString().padStart(2, '0')}`

        if (currentTime >= prefs.quietHoursStart && currentTime <= prefs.quietHoursEnd) {
          // 在静默时间内，只发送紧急通知
          if (notification.priority !== 'urgent') {
            console.log(`[通知] 用户 ${userId} 在静默时间内，延迟发送`)
            // 可以实现延迟发送逻辑
          }
        }
      }
    }

    // 发送到各渠道
    await this.deliverToChannels(notification)

    // 存储通知
    const userNotifications = this.notifications.get(userId) || []
    userNotifications.unshift(notification)
    this.notifications.set(userId, userNotifications)

    return notification
  }

  /**
   * 使用模板发送通知
   */
  async sendFromTemplate(
    projectId: string,
    userId: string,
    templateId: string,
    variables: Record<string, unknown>,
    options: {
      overridePriority?: NotificationPriority
      overrideChannels?: NotificationChannel[]
      actionUrl?: string
      actionText?: string
    } = {}
  ): Promise<Notification> {
    const template = NOTIFICATION_TEMPLATES.find(t => t.id === templateId)
    if (!template) {
      throw new Error(`模板 ${templateId} 不存在`)
    }

    const title = interpolate(template.title, variables)
    const message = interpolate(template.message, variables)

    return this.sendNotification(projectId, userId, template.type, title, message, {
      priority: options.overridePriority || template.defaultPriority,
      channels: options.overrideChannels || template.defaultChannels,
      actionUrl: options.actionUrl,
      actionText: options.actionText,
      metadata: { templateId, variables }
    })
  }

  /**
   * 发送到各渠道
   */
  private async deliverToChannels(notification: Notification): Promise<void> {
    for (const channel of notification.channels) {
      try {
        switch (channel) {
          case 'in_app':
            // 应用内通知自动存储，无需额外处理
            break

          case 'email':
            await this.sendEmail(notification)
            break

          case 'sms':
            await this.sendSms(notification)
            break

          case 'wechat':
            await this.sendWechat(notification)
            break

          case 'push':
            await this.sendPush(notification)
            break
        }
      } catch (error) {
        console.error(`[通知] 发送到 ${channel} 失败:`, error)
      }
    }

    notification.status = 'sent'
    notification.sentAt = new Date()
  }

  /**
   * 发送邮件
   */
  private async sendEmail(notification: Notification): Promise<void> {
    // 实际实现时调用 SendGrid 等邮件服务
    console.log(`[邮件] 发送给 ${notification.userId}: ${notification.title}`)
  }

  /**
   * 发送短信
   */
  private async sendSms(notification: Notification): Promise<void> {
    // 实际实现时调用短信服务
    console.log(`[短信] 发送给 ${notification.userId}: ${notification.title}`)
  }

  /**
   * 发送微信通知
   */
  private async sendWechat(notification: Notification): Promise<void> {
    // 实际实现时调用微信 API
    console.log(`[微信] 发送给 ${notification.userId}: ${notification.title}`)
  }

  /**
   * 发送推送通知
   */
  private async sendPush(notification: Notification): Promise<void> {
    // 实际实现时调用 Firebase/APNs
    console.log(`[推送] 发送给 ${notification.userId}: ${notification.title}`)
  }

  /**
   * 获取用户通知列表
   */
  getUserNotifications(
    userId: string,
    options: {
      type?: NotificationType
      status?: NotificationStatus
      limit?: number
      offset?: number
    } = {}
  ): Notification[] {
    let notifications = this.notifications.get(userId) || []

    if (options.type) {
      notifications = notifications.filter(n => n.type === options.type)
    }

    if (options.status) {
      notifications = notifications.filter(n => n.status === options.status)
    }

    const offset = options.offset || 0
    const limit = options.limit || 50

    return notifications.slice(offset, offset + limit)
  }

  /**
   * 获取未读通知数量
   */
  getUnreadCount(userId: string): number {
    const notifications = this.notifications.get(userId) || []
    return notifications.filter(n =>
      n.status === 'sent' || n.status === 'delivered'
    ).length
  }

  /**
   * 标记通知为已读
   */
  markAsRead(userId: string, notificationId: string): boolean {
    const notifications = this.notifications.get(userId) || []
    const notification = notifications.find(n => n.id === notificationId)

    if (notification) {
      notification.status = 'read'
      notification.readAt = new Date()
      return true
    }

    return false
  }

  /**
   * 标记所有为已读
   */
  markAllAsRead(userId: string): number {
    const notifications = this.notifications.get(userId) || []
    let count = 0

    for (const notification of notifications) {
      if (notification.status !== 'read') {
        notification.status = 'read'
        notification.readAt = new Date()
        count++
      }
    }

    return count
  }

  /**
   * 设置用户偏好
   */
  setPreferences(userId: string, preferences: Partial<NotificationPreferences>): NotificationPreferences {
    const existing = this.preferences.get(userId) || {
      userId,
      enabledTypes: Object.keys(NOTIFICATION_TYPE_CONFIG) as NotificationType[],
      enabledChannels: ['in_app', 'email'],
      emailFrequency: 'instant',
      language: 'zh-CN'
    }

    const updated = { ...existing, ...preferences }
    this.preferences.set(userId, updated)
    return updated
  }

  /**
   * 获取用户偏好
   */
  getPreferences(userId: string): NotificationPreferences {
    return this.preferences.get(userId) || {
      userId,
      enabledTypes: Object.keys(NOTIFICATION_TYPE_CONFIG) as NotificationType[],
      enabledChannels: ['in_app', 'email'],
      emailFrequency: 'instant',
      language: 'zh-CN'
    }
  }

  /**
   * 触发规则检查
   */
  async checkRules(
    projectId: string,
    userId: string,
    trigger: NotificationTrigger,
    context: Record<string, unknown>
  ): Promise<Notification[]> {
    const matchedRules = this.rules.filter(rule =>
      rule.enabled && rule.trigger === trigger
    )

    const notifications: Notification[] = []

    for (const rule of matchedRules) {
      // 检查条件
      const conditionsMet = rule.conditions.every(cond => {
        const value = context[cond.field]
        switch (cond.operator) {
          case 'eq': return value === cond.value
          case 'ne': return value !== cond.value
          case 'gt': return (value as number) > (cond.value as number)
          case 'lt': return (value as number) < (cond.value as number)
          case 'gte': return (value as number) >= (cond.value as number)
          case 'lte': return (value as number) <= (cond.value as number)
          case 'contains': return String(value).includes(String(cond.value))
          default: return false
        }
      })

      if (conditionsMet) {
        const notification = await this.sendFromTemplate(
          projectId,
          userId,
          rule.template,
          context
        )
        notifications.push(notification)
      }
    }

    return notifications
  }

  /**
   * 获取通知统计
   */
  getStats(userId: string): NotificationStats {
    const notifications = this.notifications.get(userId) || []

    const byType: Record<NotificationType, number> = {} as any
    const byChannel: Record<NotificationChannel, number> = {} as any

    let deliveredCount = 0
    let readCount = 0
    let totalReadTimeMs = 0

    for (const n of notifications) {
      byType[n.type] = (byType[n.type] || 0) + 1

      for (const ch of n.channels) {
        byChannel[ch] = (byChannel[ch] || 0) + 1
      }

      if (n.status === 'delivered' || n.status === 'read') {
        deliveredCount++
      }

      if (n.status === 'read' && n.sentAt && n.readAt) {
        readCount++
        totalReadTimeMs += n.readAt.getTime() - n.sentAt.getTime()
      }
    }

    return {
      totalSent: notifications.length,
      byType,
      byChannel,
      deliveryRate: notifications.length > 0 ? (deliveredCount / notifications.length) * 100 : 0,
      readRate: notifications.length > 0 ? (readCount / notifications.length) * 100 : 0,
      avgReadTimeMinutes: readCount > 0 ? (totalReadTimeMs / readCount / 1000 / 60) : 0
    }
  }

  /**
   * 获取通知类型配置
   */
  getTypeConfig() {
    return NOTIFICATION_TYPE_CONFIG
  }

  /**
   * 获取模板列表
   */
  getTemplates() {
    return NOTIFICATION_TEMPLATES
  }

  /**
   * 生成通知邮件 HTML
   */
  generateNotificationEmail(notification: Notification): string {
    const typeConfig = NOTIFICATION_TYPE_CONFIG[notification.type]

    return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, sans-serif; margin: 0; padding: 0; background: #f5f5f5; }
    .container { max-width: 600px; margin: 20px auto; background: white; border-radius: 8px; overflow: hidden; }
    .header { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 30px; text-align: center; }
    .header h1 { margin: 0; font-size: 24px; }
    .content { padding: 30px; }
    .icon { font-size: 48px; text-align: center; margin-bottom: 20px; }
    .title { font-size: 20px; font-weight: bold; margin-bottom: 10px; }
    .message { color: #666; line-height: 1.6; }
    .action { text-align: center; margin: 30px 0; }
    .action a { display: inline-block; background: #667eea; color: white; padding: 12px 24px; border-radius: 6px; text-decoration: none; }
    .footer { padding: 20px; text-align: center; color: #999; font-size: 12px; border-top: 1px solid #eee; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>Thinkus 通知</h1>
    </div>
    <div class="content">
      <div class="icon">${notification.icon}</div>
      <div class="title">${notification.title}</div>
      <div class="message">${notification.message}</div>
      ${notification.actionUrl ? `
        <div class="action">
          <a href="${notification.actionUrl}">${notification.actionText || '查看详情'}</a>
        </div>
      ` : ''}
    </div>
    <div class="footer">
      <p>您收到此邮件是因为您订阅了 Thinkus 的${typeConfig.label}通知</p>
      <p><a href="#">管理通知偏好</a> | <a href="#">退订</a></p>
    </div>
  </div>
</body>
</html>
    `.trim()
  }
}

// 导出单例
export const proactiveNotifier = new ProactiveNotifierService()
