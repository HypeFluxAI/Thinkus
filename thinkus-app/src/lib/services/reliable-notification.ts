/**
 * 多渠道可靠通知服务 (P0-5)
 *
 * 解决问题：重要通知用户收不到，导致交付延误
 *
 * 设计理念：
 * 1. 多渠道并行/降级发送
 * 2. 送达确认和自动重试
 * 3. 优先级队列管理
 * 4. 静默时段智能处理
 */

// 通知渠道
export type NotificationChannel =
  | 'email'        // 电子邮件
  | 'sms'          // 短信
  | 'wechat'       // 微信公众号/小程序
  | 'push'         // 浏览器推送
  | 'in_app'       // 应用内通知
  | 'phone'        // 电话（紧急）
  | 'webhook'      // Webhook回调

// 通知优先级
export type NotificationPriority = 'low' | 'normal' | 'high' | 'urgent' | 'critical'

// 通知类型
export type NotificationType =
  | 'delivery_start'      // 开始交付
  | 'delivery_progress'   // 交付进度
  | 'delivery_complete'   // 交付完成
  | 'delivery_error'      // 交付出错
  | 'acceptance_reminder' // 验收提醒
  | 'acceptance_timeout'  // 验收超时
  | 'login_credential'    // 登录凭证
  | 'password_reset'      // 密码重置
  | 'renewal_reminder'    // 续费提醒
  | 'system_alert'        // 系统告警
  | 'support_ticket'      // 客服工单
  | 'custom'              // 自定义

// 发送状态
export type DeliveryStatus =
  | 'pending'      // 待发送
  | 'sending'      // 发送中
  | 'sent'         // 已发送
  | 'delivered'    // 已送达
  | 'read'         // 已读
  | 'failed'       // 发送失败
  | 'bounced'      // 退信
  | 'blocked'      // 被拦截

// 渠道配置
interface ChannelConfig {
  name: string
  enabled: boolean
  priority: number  // 数字越小优先级越高
  maxRetries: number
  retryDelayMs: number
  timeout: number
  fallbackChannels: NotificationChannel[]
  supportsDeliveryConfirm: boolean
  quietHoursRestricted: boolean
  costLevel: 'free' | 'low' | 'medium' | 'high'
}

// 渠道配置表
const CHANNEL_CONFIGS: Record<NotificationChannel, ChannelConfig> = {
  in_app: {
    name: '应用内通知',
    enabled: true,
    priority: 1,
    maxRetries: 3,
    retryDelayMs: 1000,
    timeout: 5000,
    fallbackChannels: ['push'],
    supportsDeliveryConfirm: true,
    quietHoursRestricted: false,
    costLevel: 'free'
  },
  push: {
    name: '浏览器推送',
    enabled: true,
    priority: 2,
    maxRetries: 3,
    retryDelayMs: 2000,
    timeout: 10000,
    fallbackChannels: ['email'],
    supportsDeliveryConfirm: true,
    quietHoursRestricted: true,
    costLevel: 'free'
  },
  email: {
    name: '电子邮件',
    enabled: true,
    priority: 3,
    maxRetries: 5,
    retryDelayMs: 5000,
    timeout: 30000,
    fallbackChannels: ['sms'],
    supportsDeliveryConfirm: true,
    quietHoursRestricted: false,
    costLevel: 'low'
  },
  wechat: {
    name: '微信通知',
    enabled: true,
    priority: 4,
    maxRetries: 3,
    retryDelayMs: 3000,
    timeout: 10000,
    fallbackChannels: ['sms'],
    supportsDeliveryConfirm: true,
    quietHoursRestricted: true,
    costLevel: 'low'
  },
  sms: {
    name: '短信',
    enabled: true,
    priority: 5,
    maxRetries: 3,
    retryDelayMs: 10000,
    timeout: 30000,
    fallbackChannels: ['phone'],
    supportsDeliveryConfirm: true,
    quietHoursRestricted: true,
    costLevel: 'medium'
  },
  webhook: {
    name: 'Webhook',
    enabled: true,
    priority: 6,
    maxRetries: 5,
    retryDelayMs: 5000,
    timeout: 30000,
    fallbackChannels: [],
    supportsDeliveryConfirm: true,
    quietHoursRestricted: false,
    costLevel: 'free'
  },
  phone: {
    name: '电话',
    enabled: true,
    priority: 7,
    maxRetries: 2,
    retryDelayMs: 60000,
    timeout: 120000,
    fallbackChannels: [],
    supportsDeliveryConfirm: false,
    quietHoursRestricted: true,
    costLevel: 'high'
  }
}

// 优先级配置
const PRIORITY_CONFIGS: Record<NotificationPriority, {
  channels: NotificationChannel[]
  requireDeliveryConfirm: boolean
  bypassQuietHours: boolean
  maxDelay: number
}> = {
  low: {
    channels: ['in_app', 'email'],
    requireDeliveryConfirm: false,
    bypassQuietHours: false,
    maxDelay: 3600000 // 1小时
  },
  normal: {
    channels: ['in_app', 'push', 'email'],
    requireDeliveryConfirm: false,
    bypassQuietHours: false,
    maxDelay: 1800000 // 30分钟
  },
  high: {
    channels: ['in_app', 'push', 'email', 'wechat'],
    requireDeliveryConfirm: true,
    bypassQuietHours: false,
    maxDelay: 300000 // 5分钟
  },
  urgent: {
    channels: ['in_app', 'push', 'email', 'wechat', 'sms'],
    requireDeliveryConfirm: true,
    bypassQuietHours: true,
    maxDelay: 60000 // 1分钟
  },
  critical: {
    channels: ['in_app', 'push', 'email', 'wechat', 'sms', 'phone'],
    requireDeliveryConfirm: true,
    bypassQuietHours: true,
    maxDelay: 0 // 立即
  }
}

// 通知消息
export interface NotificationMessage {
  id: string
  type: NotificationType
  priority: NotificationPriority
  recipient: {
    userId: string
    userName: string
    email?: string
    phone?: string
    wechatOpenId?: string
    webhookUrl?: string
  }
  content: {
    title: string
    body: string
    data?: Record<string, unknown>
  }
  template?: {
    id: string
    params: Record<string, string>
  }
  options?: {
    channels?: NotificationChannel[]
    scheduledAt?: Date
    expiresAt?: Date
    requireConfirmation?: boolean
    groupKey?: string
  }
}

// 发送记录
export interface DeliveryRecord {
  id: string
  messageId: string
  channel: NotificationChannel
  status: DeliveryStatus
  attempts: DeliveryAttempt[]
  sentAt?: Date
  deliveredAt?: Date
  readAt?: Date
  error?: string
}

// 发送尝试
export interface DeliveryAttempt {
  timestamp: Date
  success: boolean
  error?: string
  responseTime?: number
  providerMessageId?: string
}

// 通知会话
export interface NotificationSession {
  id: string
  message: NotificationMessage
  deliveryRecords: DeliveryRecord[]
  status: 'pending' | 'in_progress' | 'completed' | 'failed' | 'partial'
  createdAt: Date
  completedAt?: Date
  confirmedAt?: Date
  totalAttempts: number
  successfulChannels: NotificationChannel[]
  failedChannels: NotificationChannel[]
}

// 用户通知偏好
export interface NotificationPreferences {
  userId: string
  enabledChannels: NotificationChannel[]
  disabledTypes: NotificationType[]
  quietHours?: {
    start: number // 0-23
    end: number   // 0-23
    timezone: string
  }
  language: string
  emailFrequency: 'realtime' | 'hourly' | 'daily'
  smsOptIn: boolean
  phoneOptIn: boolean
}

// 送达确认回调
export type DeliveryCallback = (
  record: DeliveryRecord,
  session: NotificationSession
) => void

/**
 * 多渠道可靠通知服务
 */
export class ReliableNotificationService {
  private sessions: Map<string, NotificationSession> = new Map()
  private userPreferences: Map<string, NotificationPreferences> = new Map()
  private deliveryCallbacks: Map<string, DeliveryCallback[]> = new Map()

  /**
   * 发送通知
   */
  async send(message: NotificationMessage): Promise<NotificationSession> {
    const session = this.createSession(message)

    // 确定要使用的渠道
    const channels = this.determineChannels(message)

    // 检查静默时段
    const filteredChannels = this.filterByQuietHours(channels, message)

    // 按优先级排序
    const sortedChannels = this.sortChannelsByPriority(filteredChannels)

    // 并行或串行发送
    if (message.priority === 'critical' || message.priority === 'urgent') {
      // 紧急消息：并行发送所有渠道
      await this.sendParallel(session, sortedChannels)
    } else {
      // 普通消息：串行发送，成功后停止
      await this.sendSequential(session, sortedChannels)
    }

    return session
  }

  /**
   * 创建通知会话
   */
  private createSession(message: NotificationMessage): NotificationSession {
    const session: NotificationSession = {
      id: `notify_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      message,
      deliveryRecords: [],
      status: 'pending',
      createdAt: new Date(),
      totalAttempts: 0,
      successfulChannels: [],
      failedChannels: []
    }

    this.sessions.set(session.id, session)
    return session
  }

  /**
   * 确定发送渠道
   */
  private determineChannels(message: NotificationMessage): NotificationChannel[] {
    const priorityConfig = PRIORITY_CONFIGS[message.priority]
    let channels = message.options?.channels || priorityConfig.channels

    // 检查用户偏好
    const preferences = this.userPreferences.get(message.recipient.userId)
    if (preferences) {
      channels = channels.filter(ch => preferences.enabledChannels.includes(ch))
    }

    // 检查收件人信息是否完整
    channels = channels.filter(ch => {
      switch (ch) {
        case 'email':
          return !!message.recipient.email
        case 'sms':
        case 'phone':
          return !!message.recipient.phone
        case 'wechat':
          return !!message.recipient.wechatOpenId
        case 'webhook':
          return !!message.recipient.webhookUrl
        default:
          return true
      }
    })

    return channels
  }

  /**
   * 按静默时段过滤
   */
  private filterByQuietHours(
    channels: NotificationChannel[],
    message: NotificationMessage
  ): NotificationChannel[] {
    const priorityConfig = PRIORITY_CONFIGS[message.priority]
    if (priorityConfig.bypassQuietHours) {
      return channels
    }

    const preferences = this.userPreferences.get(message.recipient.userId)
    if (!preferences?.quietHours) {
      return channels
    }

    const now = new Date()
    const hour = now.getHours()
    const { start, end } = preferences.quietHours

    const isQuietHour = start > end
      ? (hour >= start || hour < end)  // 跨夜
      : (hour >= start && hour < end)  // 不跨夜

    if (!isQuietHour) {
      return channels
    }

    // 静默时段，过滤掉受限渠道
    return channels.filter(ch => !CHANNEL_CONFIGS[ch].quietHoursRestricted)
  }

  /**
   * 按优先级排序渠道
   */
  private sortChannelsByPriority(channels: NotificationChannel[]): NotificationChannel[] {
    return channels.sort((a, b) => CHANNEL_CONFIGS[a].priority - CHANNEL_CONFIGS[b].priority)
  }

  /**
   * 并行发送
   */
  private async sendParallel(
    session: NotificationSession,
    channels: NotificationChannel[]
  ): Promise<void> {
    session.status = 'in_progress'

    const promises = channels.map(channel => this.sendToChannel(session, channel))
    const results = await Promise.allSettled(promises)

    // 统计结果
    results.forEach((result, index) => {
      const channel = channels[index]
      if (result.status === 'fulfilled' && result.value) {
        session.successfulChannels.push(channel)
      } else {
        session.failedChannels.push(channel)
      }
    })

    // 更新状态
    if (session.successfulChannels.length === channels.length) {
      session.status = 'completed'
    } else if (session.successfulChannels.length > 0) {
      session.status = 'partial'
    } else {
      session.status = 'failed'
    }

    session.completedAt = new Date()
  }

  /**
   * 串行发送（成功后停止）
   */
  private async sendSequential(
    session: NotificationSession,
    channels: NotificationChannel[]
  ): Promise<void> {
    session.status = 'in_progress'

    for (const channel of channels) {
      const success = await this.sendToChannel(session, channel)

      if (success) {
        session.successfulChannels.push(channel)
        session.status = 'completed'
        session.completedAt = new Date()
        return
      } else {
        session.failedChannels.push(channel)
      }
    }

    session.status = 'failed'
    session.completedAt = new Date()
  }

  /**
   * 发送到单个渠道
   */
  private async sendToChannel(
    session: NotificationSession,
    channel: NotificationChannel
  ): Promise<boolean> {
    const config = CHANNEL_CONFIGS[channel]
    const record: DeliveryRecord = {
      id: `delivery_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      messageId: session.message.id,
      channel,
      status: 'pending',
      attempts: []
    }

    session.deliveryRecords.push(record)

    for (let attempt = 1; attempt <= config.maxRetries; attempt++) {
      session.totalAttempts++
      const startTime = Date.now()

      try {
        record.status = 'sending'
        const result = await this.executeChannelSend(channel, session.message)

        const attemptRecord: DeliveryAttempt = {
          timestamp: new Date(),
          success: result.success,
          responseTime: Date.now() - startTime,
          providerMessageId: result.messageId,
          error: result.error
        }
        record.attempts.push(attemptRecord)

        if (result.success) {
          record.status = 'sent'
          record.sentAt = new Date()

          // 触发回调
          this.triggerCallbacks(record, session)

          return true
        }
      } catch (error) {
        const attemptRecord: DeliveryAttempt = {
          timestamp: new Date(),
          success: false,
          responseTime: Date.now() - startTime,
          error: error instanceof Error ? error.message : String(error)
        }
        record.attempts.push(attemptRecord)
      }

      // 等待后重试
      if (attempt < config.maxRetries) {
        await this.sleep(config.retryDelayMs * attempt)
      }
    }

    record.status = 'failed'
    record.error = record.attempts[record.attempts.length - 1]?.error

    return false
  }

  /**
   * 执行渠道发送
   */
  private async executeChannelSend(
    channel: NotificationChannel,
    message: NotificationMessage
  ): Promise<{ success: boolean; messageId?: string; error?: string }> {
    // 实际项目中会调用各渠道的API
    switch (channel) {
      case 'email':
        return this.sendEmail(message)
      case 'sms':
        return this.sendSms(message)
      case 'wechat':
        return this.sendWechat(message)
      case 'push':
        return this.sendPush(message)
      case 'in_app':
        return this.sendInApp(message)
      case 'phone':
        return this.sendPhone(message)
      case 'webhook':
        return this.sendWebhook(message)
      default:
        return { success: false, error: 'Unknown channel' }
    }
  }

  // 各渠道发送实现（模拟）
  private async sendEmail(message: NotificationMessage): Promise<{ success: boolean; messageId?: string; error?: string }> {
    console.log('Sending email to:', message.recipient.email)
    return { success: true, messageId: `email_${Date.now()}` }
  }

  private async sendSms(message: NotificationMessage): Promise<{ success: boolean; messageId?: string; error?: string }> {
    console.log('Sending SMS to:', message.recipient.phone)
    return { success: true, messageId: `sms_${Date.now()}` }
  }

  private async sendWechat(message: NotificationMessage): Promise<{ success: boolean; messageId?: string; error?: string }> {
    console.log('Sending WeChat to:', message.recipient.wechatOpenId)
    return { success: true, messageId: `wechat_${Date.now()}` }
  }

  private async sendPush(message: NotificationMessage): Promise<{ success: boolean; messageId?: string; error?: string }> {
    console.log('Sending push to:', message.recipient.userId)
    return { success: true, messageId: `push_${Date.now()}` }
  }

  private async sendInApp(message: NotificationMessage): Promise<{ success: boolean; messageId?: string; error?: string }> {
    console.log('Sending in-app to:', message.recipient.userId)
    return { success: true, messageId: `inapp_${Date.now()}` }
  }

  private async sendPhone(message: NotificationMessage): Promise<{ success: boolean; messageId?: string; error?: string }> {
    console.log('Calling:', message.recipient.phone)
    return { success: true, messageId: `phone_${Date.now()}` }
  }

  private async sendWebhook(message: NotificationMessage): Promise<{ success: boolean; messageId?: string; error?: string }> {
    console.log('Sending webhook to:', message.recipient.webhookUrl)
    return { success: true, messageId: `webhook_${Date.now()}` }
  }

  /**
   * 设置用户通知偏好
   */
  setUserPreferences(userId: string, preferences: Partial<NotificationPreferences>): void {
    const existing = this.userPreferences.get(userId) || {
      userId,
      enabledChannels: ['in_app', 'email', 'push'],
      disabledTypes: [],
      language: 'zh-CN',
      emailFrequency: 'realtime' as const,
      smsOptIn: true,
      phoneOptIn: false
    }

    this.userPreferences.set(userId, { ...existing, ...preferences })
  }

  /**
   * 获取用户通知偏好
   */
  getUserPreferences(userId: string): NotificationPreferences | null {
    return this.userPreferences.get(userId) ?? null
  }

  /**
   * 注册送达回调
   */
  onDelivery(sessionId: string, callback: DeliveryCallback): void {
    const callbacks = this.deliveryCallbacks.get(sessionId) || []
    callbacks.push(callback)
    this.deliveryCallbacks.set(sessionId, callbacks)
  }

  /**
   * 触发回调
   */
  private triggerCallbacks(record: DeliveryRecord, session: NotificationSession): void {
    const callbacks = this.deliveryCallbacks.get(session.id) || []
    callbacks.forEach(cb => {
      try {
        cb(record, session)
      } catch (error) {
        console.error('Delivery callback error:', error)
      }
    })
  }

  /**
   * 确认送达
   */
  confirmDelivery(sessionId: string, channel: NotificationChannel): void {
    const session = this.sessions.get(sessionId)
    if (!session) return

    const record = session.deliveryRecords.find(r => r.channel === channel)
    if (record) {
      record.status = 'delivered'
      record.deliveredAt = new Date()
    }

    // 检查是否所有必须确认的渠道都已确认
    const priorityConfig = PRIORITY_CONFIGS[session.message.priority]
    if (priorityConfig.requireDeliveryConfirm) {
      const allConfirmed = session.deliveryRecords
        .filter(r => r.status === 'sent')
        .every(r => r.status === 'delivered')

      if (allConfirmed) {
        session.confirmedAt = new Date()
      }
    }
  }

  /**
   * 确认已读
   */
  confirmRead(sessionId: string, channel: NotificationChannel): void {
    const session = this.sessions.get(sessionId)
    if (!session) return

    const record = session.deliveryRecords.find(r => r.channel === channel)
    if (record) {
      record.status = 'read'
      record.readAt = new Date()
    }
  }

  /**
   * 获取会话
   */
  getSession(sessionId: string): NotificationSession | null {
    return this.sessions.get(sessionId) ?? null
  }

  /**
   * 获取发送统计
   */
  getDeliveryStats(): {
    total: number
    completed: number
    failed: number
    partial: number
    byChannel: Record<NotificationChannel, { sent: number; delivered: number; failed: number }>
  } {
    const stats = {
      total: 0,
      completed: 0,
      failed: 0,
      partial: 0,
      byChannel: {} as Record<NotificationChannel, { sent: number; delivered: number; failed: number }>
    }

    // 初始化渠道统计
    for (const channel of Object.keys(CHANNEL_CONFIGS) as NotificationChannel[]) {
      stats.byChannel[channel] = { sent: 0, delivered: 0, failed: 0 }
    }

    for (const session of this.sessions.values()) {
      stats.total++
      if (session.status === 'completed') stats.completed++
      else if (session.status === 'failed') stats.failed++
      else if (session.status === 'partial') stats.partial++

      for (const record of session.deliveryRecords) {
        if (record.status === 'sent' || record.status === 'delivered' || record.status === 'read') {
          stats.byChannel[record.channel].sent++
        }
        if (record.status === 'delivered' || record.status === 'read') {
          stats.byChannel[record.channel].delivered++
        }
        if (record.status === 'failed') {
          stats.byChannel[record.channel].failed++
        }
      }
    }

    return stats
  }

  /**
   * 生成通知中心页面HTML
   */
  generateNotificationCenterHtml(userId: string): string {
    const userSessions = Array.from(this.sessions.values())
      .filter(s => s.message.recipient.userId === userId)
      .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime())
      .slice(0, 50)

    return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>通知中心</title>
  <style>
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
      background: #f3f4f6;
      min-height: 100vh;
    }
    .header {
      background: white;
      border-bottom: 1px solid #e5e7eb;
      padding: 20px;
      position: sticky;
      top: 0;
      z-index: 100;
    }
    .header-title { font-size: 20px; font-weight: 600; color: #111827; }
    .header-actions { margin-top: 12px; }
    .tab {
      display: inline-block;
      padding: 8px 16px;
      border-radius: 20px;
      font-size: 14px;
      margin-right: 8px;
      cursor: pointer;
      background: #f3f4f6;
      color: #6b7280;
    }
    .tab.active { background: #3b82f6; color: white; }
    .notifications { padding: 20px; max-width: 600px; margin: 0 auto; }
    .notification-item {
      background: white;
      border-radius: 12px;
      padding: 16px;
      margin-bottom: 12px;
      box-shadow: 0 1px 3px rgba(0,0,0,0.05);
    }
    .notification-item.unread { border-left: 4px solid #3b82f6; }
    .notification-header {
      display: flex;
      align-items: center;
      margin-bottom: 8px;
    }
    .notification-icon { font-size: 24px; margin-right: 12px; }
    .notification-title { font-weight: 600; color: #111827; flex: 1; }
    .notification-time { color: #9ca3af; font-size: 12px; }
    .notification-body { color: #374151; line-height: 1.5; }
    .notification-channels {
      margin-top: 12px;
      display: flex;
      gap: 8px;
    }
    .channel-badge {
      font-size: 12px;
      padding: 4px 8px;
      border-radius: 12px;
      background: #f3f4f6;
      color: #6b7280;
    }
    .channel-badge.success { background: #dcfce7; color: #16a34a; }
    .channel-badge.failed { background: #fef2f2; color: #dc2626; }
    .empty-state {
      text-align: center;
      padding: 60px 20px;
      color: #6b7280;
    }
    .empty-icon { font-size: 48px; margin-bottom: 16px; }
  </style>
</head>
<body>
  <div class="header">
    <div class="header-title">🔔 通知中心</div>
    <div class="header-actions">
      <span class="tab active">全部</span>
      <span class="tab">未读</span>
      <span class="tab">重要</span>
    </div>
  </div>

  <div class="notifications">
    ${userSessions.length === 0 ? `
    <div class="empty-state">
      <div class="empty-icon">📭</div>
      <div>暂无通知</div>
    </div>
    ` : userSessions.map(session => {
      const isUnread = session.deliveryRecords.every(r => r.status !== 'read')
      const typeIcon = this.getTypeIcon(session.message.type)
      const timeAgo = this.formatTimeAgo(session.createdAt)

      return `
        <div class="notification-item ${isUnread ? 'unread' : ''}">
          <div class="notification-header">
            <span class="notification-icon">${typeIcon}</span>
            <span class="notification-title">${session.message.content.title}</span>
            <span class="notification-time">${timeAgo}</span>
          </div>
          <div class="notification-body">${session.message.content.body}</div>
          <div class="notification-channels">
            ${session.deliveryRecords.map(record => `
              <span class="channel-badge ${record.status === 'delivered' || record.status === 'read' ? 'success' : record.status === 'failed' ? 'failed' : ''}">
                ${CHANNEL_CONFIGS[record.channel].name}
              </span>
            `).join('')}
          </div>
        </div>
      `
    }).join('')}
  </div>
</body>
</html>
    `.trim()
  }

  /**
   * 获取类型图标
   */
  private getTypeIcon(type: NotificationType): string {
    const icons: Record<NotificationType, string> = {
      delivery_start: '🚀',
      delivery_progress: '📊',
      delivery_complete: '🎉',
      delivery_error: '⚠️',
      acceptance_reminder: '📋',
      acceptance_timeout: '⏰',
      login_credential: '🔐',
      password_reset: '🔑',
      renewal_reminder: '💳',
      system_alert: '🔔',
      support_ticket: '💬',
      custom: '📨'
    }
    return icons[type] || '📨'
  }

  /**
   * 格式化时间
   */
  private formatTimeAgo(date: Date): string {
    const now = Date.now()
    const diff = now - date.getTime()

    if (diff < 60000) return '刚刚'
    if (diff < 3600000) return `${Math.floor(diff / 60000)}分钟前`
    if (diff < 86400000) return `${Math.floor(diff / 3600000)}小时前`
    return `${Math.floor(diff / 86400000)}天前`
  }

  /**
   * 休眠
   */
  private sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms))
  }

  /**
   * 清理会话
   */
  cleanup(sessionId: string): void {
    this.sessions.delete(sessionId)
    this.deliveryCallbacks.delete(sessionId)
  }
}

// 导出单例
export const reliableNotification = new ReliableNotificationService()
