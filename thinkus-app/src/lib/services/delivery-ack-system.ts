/**
 * 反向确认反馈系统
 *
 * 功能：
 * - 客户确认收到交付信息
 * - 打开率/点击率/操作率追踪
 * - 未确认自动重发
 * - 确认证书生成
 */

// ============================================
// 类型定义
// ============================================

/** 通知类型 */
export type NotificationType =
  | 'delivery_complete'     // 交付完成通知
  | 'credentials'           // 凭证发送
  | 'report'                // 报告发送
  | 'update'                // 更新通知
  | 'reminder'              // 提醒通知
  | 'survey'                // 满意度调查

/** 追踪事件类型 */
export type TrackingEventType =
  | 'sent'          // 已发送
  | 'delivered'     // 已送达
  | 'opened'        // 已打开
  | 'clicked'       // 已点击
  | 'acknowledged'  // 已确认
  | 'bounced'       // 退信
  | 'failed'        // 发送失败

/** 通知渠道 */
export type AckChannel = 'email' | 'sms' | 'wechat' | 'in_app'

/** 确认状态 */
export type AcknowledgeStatus =
  | 'pending'       // 待确认
  | 'delivered'     // 已送达
  | 'opened'        // 已打开
  | 'acknowledged'  // 已确认
  | 'expired'       // 已过期
  | 'failed'        // 发送失败

/** 通知记录 */
export interface NotificationRecord {
  id: string
  projectId: string
  userId: string
  type: NotificationType
  typeCn: string
  channel: AckChannel
  channelCn: string

  // 内容
  subject: string
  content: string
  contentPreview: string
  attachments?: string[]

  // 追踪
  trackingId: string
  trackingUrl: string
  ackUrl: string

  // 状态
  status: AcknowledgeStatus
  statusCn: string

  // 时间线
  sentAt: Date
  deliveredAt?: Date
  openedAt?: Date
  clickedAt?: Date
  acknowledgedAt?: Date
  expiresAt: Date

  // 重发
  resendCount: number
  maxResends: number
  lastResendAt?: Date
  nextResendAt?: Date

  // 元数据
  metadata?: Record<string, unknown>
}

/** 追踪事件 */
export interface TrackingEvent {
  id: string
  recordId: string
  eventType: TrackingEventType
  eventTypeCn: string
  timestamp: Date
  metadata?: {
    ip?: string
    userAgent?: string
    deviceType?: string
    location?: string
  }
}

/** 确认收据 */
export interface AcknowledgeReceipt {
  id: string
  recordId: string
  projectId: string
  userId: string
  userName: string
  userEmail: string

  // 确认信息
  acknowledgedAt: Date
  method: 'click' | 'button' | 'signature' | 'auto'
  methodCn: string
  signature?: string

  // 确认内容
  notificationType: NotificationType
  notificationSubject: string

  // 验证
  verificationCode: string
  verified: boolean
  verifiedAt?: Date

  // 证书
  certificateUrl?: string
}

/** 确认统计 */
export interface AckStatistics {
  projectId: string
  period: 'day' | 'week' | 'month' | 'all'

  // 总量
  totalSent: number
  totalDelivered: number
  totalOpened: number
  totalClicked: number
  totalAcknowledged: number
  totalFailed: number

  // 率
  deliveryRate: number
  openRate: number
  clickRate: number
  ackRate: number

  // 按类型
  byType: Record<NotificationType, {
    sent: number
    acknowledged: number
    ackRate: number
  }>

  // 按渠道
  byChannel: Record<AckChannel, {
    sent: number
    acknowledged: number
    ackRate: number
  }>

  // 平均时间
  avgTimeToOpen: number    // 秒
  avgTimeToAck: number     // 秒
}

/** 发送配置 */
export interface SendWithAckConfig {
  projectId: string
  userId: string
  userName: string
  userEmail: string
  userPhone?: string

  type: NotificationType
  channel: AckChannel

  subject: string
  content: string
  htmlContent?: string
  attachments?: string[]

  // 确认选项
  requireAck: boolean
  ackButtonText?: string
  expiresInHours: number

  // 重发选项
  autoResend: boolean
  maxResends: number
  resendIntervalHours: number

  // 元数据
  metadata?: Record<string, unknown>
}

// ============================================
// 配置常量
// ============================================

/** 通知类型配置 */
const NOTIFICATION_TYPE_CONFIG: Record<NotificationType, { label: string; defaultExpireHours: number; priority: number }> = {
  delivery_complete: { label: '交付完成通知', defaultExpireHours: 168, priority: 1 },
  credentials: { label: '凭证发送', defaultExpireHours: 72, priority: 1 },
  report: { label: '报告发送', defaultExpireHours: 168, priority: 2 },
  update: { label: '更新通知', defaultExpireHours: 72, priority: 3 },
  reminder: { label: '提醒通知', defaultExpireHours: 48, priority: 3 },
  survey: { label: '满意度调查', defaultExpireHours: 336, priority: 4 },
}

/** 渠道配置 */
const CHANNEL_CONFIG: Record<AckChannel, { label: string; canTrackOpen: boolean; canTrackClick: boolean }> = {
  email: { label: '电子邮件', canTrackOpen: true, canTrackClick: true },
  sms: { label: '短信', canTrackOpen: false, canTrackClick: true },
  wechat: { label: '微信', canTrackOpen: true, canTrackClick: true },
  in_app: { label: '应用内', canTrackOpen: true, canTrackClick: true },
}

/** 状态配置 */
const STATUS_CONFIG: Record<AcknowledgeStatus, { label: string; color: string }> = {
  pending: { label: '待确认', color: '#94a3b8' },
  delivered: { label: '已送达', color: '#3b82f6' },
  opened: { label: '已打开', color: '#8b5cf6' },
  acknowledged: { label: '已确认', color: '#22c55e' },
  expired: { label: '已过期', color: '#f97316' },
  failed: { label: '发送失败', color: '#ef4444' },
}

/** 事件类型配置 */
const EVENT_TYPE_CONFIG: Record<TrackingEventType, string> = {
  sent: '已发送',
  delivered: '已送达',
  opened: '已打开',
  clicked: '已点击',
  acknowledged: '已确认',
  bounced: '退信',
  failed: '发送失败',
}

// ============================================
// 服务实现
// ============================================

export class DeliveryAckSystemService {
  private static instance: DeliveryAckSystemService
  private records: Map<string, NotificationRecord> = new Map()
  private events: Map<string, TrackingEvent[]> = new Map()
  private receipts: Map<string, AcknowledgeReceipt> = new Map()

  static getInstance(): DeliveryAckSystemService {
    if (!this.instance) {
      this.instance = new DeliveryAckSystemService()
    }
    return this.instance
  }

  /**
   * 发送带确认追踪的通知
   */
  async sendWithAck(config: SendWithAckConfig): Promise<NotificationRecord> {
    const id = this.generateId()
    const trackingId = this.generateTrackingId()

    const typeConfig = NOTIFICATION_TYPE_CONFIG[config.type]
    const expiresAt = new Date()
    expiresAt.setHours(expiresAt.getHours() + (config.expiresInHours || typeConfig.defaultExpireHours))

    // 生成追踪URL和确认URL
    const trackingUrl = this.generateTrackingUrl(trackingId)
    const ackUrl = this.generateAckUrl(trackingId)

    // 注入追踪像素到HTML内容
    const trackedHtmlContent = config.htmlContent
      ? this.injectTrackingPixel(config.htmlContent, trackingUrl)
      : undefined

    const record: NotificationRecord = {
      id,
      projectId: config.projectId,
      userId: config.userId,
      type: config.type,
      typeCn: typeConfig.label,
      channel: config.channel,
      channelCn: CHANNEL_CONFIG[config.channel].label,
      subject: config.subject,
      content: config.content,
      contentPreview: config.content.substring(0, 100) + (config.content.length > 100 ? '...' : ''),
      attachments: config.attachments,
      trackingId,
      trackingUrl,
      ackUrl,
      status: 'pending',
      statusCn: STATUS_CONFIG.pending.label,
      sentAt: new Date(),
      expiresAt,
      resendCount: 0,
      maxResends: config.maxResends || 3,
      metadata: config.metadata,
    }

    // 计算下次重发时间
    if (config.autoResend) {
      const nextResend = new Date()
      nextResend.setHours(nextResend.getHours() + (config.resendIntervalHours || 24))
      record.nextResendAt = nextResend
    }

    // 保存记录
    this.records.set(id, record)

    // 记录发送事件
    await this.trackEvent(id, 'sent')

    // 实际发送通知（这里模拟）
    await this.actualSend(record, trackedHtmlContent)

    return record
  }

  /**
   * 追踪事件
   */
  async trackEvent(
    recordId: string,
    eventType: TrackingEventType,
    metadata?: TrackingEvent['metadata']
  ): Promise<TrackingEvent> {
    const record = this.records.get(recordId)
    if (!record) {
      throw new Error(`记录不存在: ${recordId}`)
    }

    const event: TrackingEvent = {
      id: this.generateId(),
      recordId,
      eventType,
      eventTypeCn: EVENT_TYPE_CONFIG[eventType],
      timestamp: new Date(),
      metadata,
    }

    // 保存事件
    const events = this.events.get(recordId) || []
    events.push(event)
    this.events.set(recordId, events)

    // 更新记录状态
    await this.updateRecordStatus(record, eventType)

    return event
  }

  /**
   * 处理追踪像素请求（邮件打开）
   */
  async handleTrackingPixel(trackingId: string, metadata?: TrackingEvent['metadata']): Promise<void> {
    const record = this.findByTrackingId(trackingId)
    if (record && record.status !== 'acknowledged') {
      await this.trackEvent(record.id, 'opened', metadata)
    }
  }

  /**
   * 处理链接点击
   */
  async handleLinkClick(trackingId: string, metadata?: TrackingEvent['metadata']): Promise<void> {
    const record = this.findByTrackingId(trackingId)
    if (record && record.status !== 'acknowledged') {
      await this.trackEvent(record.id, 'clicked', metadata)
    }
  }

  /**
   * 确认收到
   */
  async acknowledge(
    trackingId: string,
    method: AcknowledgeReceipt['method'],
    signature?: string
  ): Promise<AcknowledgeReceipt> {
    const record = this.findByTrackingId(trackingId)
    if (!record) {
      throw new Error(`记录不存在`)
    }

    // 检查是否已过期
    if (new Date() > record.expiresAt) {
      throw new Error(`确认链接已过期`)
    }

    // 更新状态
    await this.trackEvent(record.id, 'acknowledged')

    // 生成确认收据
    const receipt: AcknowledgeReceipt = {
      id: this.generateId(),
      recordId: record.id,
      projectId: record.projectId,
      userId: record.userId,
      userName: '', // 应从用户服务获取
      userEmail: '', // 应从用户服务获取
      acknowledgedAt: new Date(),
      method,
      methodCn: this.getMethodLabel(method),
      signature,
      notificationType: record.type,
      notificationSubject: record.subject,
      verificationCode: this.generateVerificationCode(),
      verified: true,
      verifiedAt: new Date(),
    }

    this.receipts.set(receipt.id, receipt)

    return receipt
  }

  /**
   * 自动重发未确认的通知
   */
  async processAutoResend(): Promise<{ resent: number; failed: number }> {
    const now = new Date()
    let resent = 0
    let failed = 0

    for (const record of this.records.values()) {
      // 检查是否需要重发
      if (
        record.status !== 'acknowledged' &&
        record.status !== 'expired' &&
        record.status !== 'failed' &&
        record.nextResendAt &&
        record.nextResendAt <= now &&
        record.resendCount < record.maxResends &&
        record.expiresAt > now
      ) {
        try {
          await this.resend(record.id)
          resent++
        } catch {
          failed++
        }
      }

      // 检查是否已过期
      if (record.expiresAt <= now && record.status !== 'acknowledged' && record.status !== 'expired') {
        record.status = 'expired'
        record.statusCn = STATUS_CONFIG.expired.label
      }
    }

    return { resent, failed }
  }

  /**
   * 手动重发
   */
  async resend(recordId: string): Promise<NotificationRecord> {
    const record = this.records.get(recordId)
    if (!record) {
      throw new Error(`记录不存在: ${recordId}`)
    }

    if (record.resendCount >= record.maxResends) {
      throw new Error(`已达到最大重发次数`)
    }

    record.resendCount++
    record.lastResendAt = new Date()

    // 计算下次重发时间
    const nextResend = new Date()
    nextResend.setHours(nextResend.getHours() + 24 * record.resendCount) // 递增间隔
    record.nextResendAt = nextResend

    // 实际重发
    await this.actualSend(record)

    // 记录事件
    await this.trackEvent(recordId, 'sent', { resend: true } as unknown as TrackingEvent['metadata'])

    return record
  }

  /**
   * 获取确认统计
   */
  async getStatistics(projectId: string, period: AckStatistics['period'] = 'all'): Promise<AckStatistics> {
    const records = Array.from(this.records.values())
      .filter(r => r.projectId === projectId)
      .filter(r => this.isInPeriod(r.sentAt, period))

    const totalSent = records.length
    const totalDelivered = records.filter(r => r.deliveredAt).length
    const totalOpened = records.filter(r => r.openedAt).length
    const totalClicked = records.filter(r => r.clickedAt).length
    const totalAcknowledged = records.filter(r => r.acknowledgedAt).length
    const totalFailed = records.filter(r => r.status === 'failed').length

    // 按类型统计
    const byType: AckStatistics['byType'] = {} as AckStatistics['byType']
    for (const type of Object.keys(NOTIFICATION_TYPE_CONFIG) as NotificationType[]) {
      const typeRecords = records.filter(r => r.type === type)
      byType[type] = {
        sent: typeRecords.length,
        acknowledged: typeRecords.filter(r => r.acknowledgedAt).length,
        ackRate: typeRecords.length > 0
          ? typeRecords.filter(r => r.acknowledgedAt).length / typeRecords.length * 100
          : 0,
      }
    }

    // 按渠道统计
    const byChannel: AckStatistics['byChannel'] = {} as AckStatistics['byChannel']
    for (const channel of Object.keys(CHANNEL_CONFIG) as AckChannel[]) {
      const channelRecords = records.filter(r => r.channel === channel)
      byChannel[channel] = {
        sent: channelRecords.length,
        acknowledged: channelRecords.filter(r => r.acknowledgedAt).length,
        ackRate: channelRecords.length > 0
          ? channelRecords.filter(r => r.acknowledgedAt).length / channelRecords.length * 100
          : 0,
      }
    }

    // 计算平均时间
    const openedRecords = records.filter(r => r.openedAt)
    const avgTimeToOpen = openedRecords.length > 0
      ? openedRecords.reduce((sum, r) => sum + (r.openedAt!.getTime() - r.sentAt.getTime()) / 1000, 0) / openedRecords.length
      : 0

    const ackedRecords = records.filter(r => r.acknowledgedAt)
    const avgTimeToAck = ackedRecords.length > 0
      ? ackedRecords.reduce((sum, r) => sum + (r.acknowledgedAt!.getTime() - r.sentAt.getTime()) / 1000, 0) / ackedRecords.length
      : 0

    return {
      projectId,
      period,
      totalSent,
      totalDelivered,
      totalOpened,
      totalClicked,
      totalAcknowledged,
      totalFailed,
      deliveryRate: totalSent > 0 ? totalDelivered / totalSent * 100 : 0,
      openRate: totalDelivered > 0 ? totalOpened / totalDelivered * 100 : 0,
      clickRate: totalOpened > 0 ? totalClicked / totalOpened * 100 : 0,
      ackRate: totalSent > 0 ? totalAcknowledged / totalSent * 100 : 0,
      byType,
      byChannel,
      avgTimeToOpen,
      avgTimeToAck,
    }
  }

  /**
   * 获取记录
   */
  getRecord(recordId: string): NotificationRecord | undefined {
    return this.records.get(recordId)
  }

  /**
   * 获取项目的所有记录
   */
  getProjectRecords(projectId: string): NotificationRecord[] {
    return Array.from(this.records.values())
      .filter(r => r.projectId === projectId)
      .sort((a, b) => b.sentAt.getTime() - a.sentAt.getTime())
  }

  /**
   * 获取事件历史
   */
  getEvents(recordId: string): TrackingEvent[] {
    return this.events.get(recordId) || []
  }

  /**
   * 获取确认收据
   */
  getReceipt(recordId: string): AcknowledgeReceipt | undefined {
    return Array.from(this.receipts.values()).find(r => r.recordId === recordId)
  }

  /**
   * 生成确认收据证书
   */
  generateReceiptCertificate(receipt: AcknowledgeReceipt): string {
    return `<!DOCTYPE html>
<html lang="zh-CN">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>确认收据 - ${receipt.verificationCode}</title>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body { font-family: -apple-system, sans-serif; background: #f8fafc; padding: 40px; }
    .certificate { max-width: 600px; margin: 0 auto; background: white; border-radius: 16px; overflow: hidden; box-shadow: 0 10px 25px rgba(0,0,0,0.1); }
    .header { background: linear-gradient(135deg, #6366f1, #8b5cf6); color: white; padding: 40px; text-align: center; }
    .header h1 { font-size: 28px; margin-bottom: 8px; }
    .header p { opacity: 0.9; }
    .content { padding: 40px; }
    .info-row { display: flex; justify-content: space-between; padding: 16px 0; border-bottom: 1px solid #e2e8f0; }
    .info-label { color: #64748b; }
    .info-value { font-weight: 600; }
    .verification { background: #f0fdf4; border: 2px dashed #86efac; padding: 20px; border-radius: 12px; text-align: center; margin-top: 24px; }
    .verification-code { font-size: 24px; font-weight: 700; color: #16a34a; letter-spacing: 4px; }
    .footer { text-align: center; padding: 24px; color: #94a3b8; font-size: 14px; background: #f8fafc; }
    .checkmark { font-size: 48px; margin-bottom: 16px; }
    @media print { body { padding: 0; } .certificate { box-shadow: none; } }
  </style>
</head>
<body>
  <div class="certificate">
    <div class="header">
      <div class="checkmark">✓</div>
      <h1>确认收据</h1>
      <p>Acknowledgement Receipt</p>
    </div>
    <div class="content">
      <div class="info-row">
        <span class="info-label">通知类型</span>
        <span class="info-value">${NOTIFICATION_TYPE_CONFIG[receipt.notificationType].label}</span>
      </div>
      <div class="info-row">
        <span class="info-label">通知主题</span>
        <span class="info-value">${receipt.notificationSubject}</span>
      </div>
      <div class="info-row">
        <span class="info-label">确认时间</span>
        <span class="info-value">${receipt.acknowledgedAt.toLocaleString('zh-CN')}</span>
      </div>
      <div class="info-row">
        <span class="info-label">确认方式</span>
        <span class="info-value">${receipt.methodCn}</span>
      </div>
      ${receipt.signature ? `
      <div class="info-row">
        <span class="info-label">电子签名</span>
        <span class="info-value">${receipt.signature}</span>
      </div>
      ` : ''}
      <div class="verification">
        <p style="margin-bottom: 8px; color: #64748b;">验证码</p>
        <div class="verification-code">${receipt.verificationCode}</div>
      </div>
    </div>
    <div class="footer">
      <p>此收据由 Thinkus 交付确认系统自动生成</p>
      <p>收据ID: ${receipt.id}</p>
    </div>
  </div>
</body>
</html>`
  }

  /**
   * 生成确认页面
   */
  generateAckPage(record: NotificationRecord): string {
    const isExpired = new Date() > record.expiresAt
    const isAcknowledged = record.status === 'acknowledged'

    return `<!DOCTYPE html>
<html lang="zh-CN">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>确认收到 - ${record.subject}</title>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body { font-family: -apple-system, sans-serif; background: linear-gradient(135deg, #f8fafc, #e2e8f0); min-height: 100vh; display: flex; align-items: center; justify-content: center; padding: 20px; }
    .card { max-width: 500px; width: 100%; background: white; border-radius: 20px; overflow: hidden; box-shadow: 0 20px 40px rgba(0,0,0,0.1); }
    .header { padding: 40px; text-align: center; background: ${isAcknowledged ? '#22c55e' : isExpired ? '#f97316' : '#6366f1'}; color: white; }
    .icon { font-size: 64px; margin-bottom: 16px; }
    .header h1 { font-size: 24px; margin-bottom: 8px; }
    .content { padding: 32px; }
    .info { background: #f8fafc; padding: 16px; border-radius: 12px; margin-bottom: 24px; }
    .info-row { display: flex; justify-content: space-between; padding: 8px 0; }
    .info-label { color: #64748b; }
    .btn { display: block; width: 100%; padding: 16px; border: none; border-radius: 12px; font-size: 16px; font-weight: 600; cursor: pointer; transition: all 0.2s; }
    .btn-primary { background: #6366f1; color: white; }
    .btn-primary:hover { background: #4f46e5; }
    .btn-disabled { background: #e2e8f0; color: #94a3b8; cursor: not-allowed; }
    .footer { text-align: center; padding: 24px; color: #94a3b8; font-size: 14px; }
  </style>
</head>
<body>
  <div class="card">
    <div class="header">
      <div class="icon">${isAcknowledged ? '✓' : isExpired ? '⏰' : '📬'}</div>
      <h1>${isAcknowledged ? '已确认收到' : isExpired ? '链接已过期' : '请确认收到'}</h1>
      <p>${record.subject}</p>
    </div>
    <div class="content">
      <div class="info">
        <div class="info-row">
          <span class="info-label">通知类型</span>
          <span>${record.typeCn}</span>
        </div>
        <div class="info-row">
          <span class="info-label">发送时间</span>
          <span>${record.sentAt.toLocaleString('zh-CN')}</span>
        </div>
        <div class="info-row">
          <span class="info-label">发送渠道</span>
          <span>${record.channelCn}</span>
        </div>
        ${isAcknowledged && record.acknowledgedAt ? `
        <div class="info-row">
          <span class="info-label">确认时间</span>
          <span>${record.acknowledgedAt.toLocaleString('zh-CN')}</span>
        </div>
        ` : ''}
      </div>
      ${!isAcknowledged && !isExpired ? `
        <button class="btn btn-primary" onclick="confirm()">确认已收到</button>
        <script>
          async function confirm() {
            try {
              const res = await fetch('/api/ack/${record.trackingId}', { method: 'POST' });
              if (res.ok) {
                location.reload();
              } else {
                alert('确认失败，请重试');
              }
            } catch (e) {
              alert('网络错误，请重试');
            }
          }
        </script>
      ` : `
        <button class="btn btn-disabled" disabled>${isAcknowledged ? '已完成确认' : '链接已过期'}</button>
      `}
    </div>
    <div class="footer">
      Thinkus 交付确认系统
    </div>
  </div>
</body>
</html>`
  }

  // ============================================
  // 私有方法
  // ============================================

  private generateId(): string {
    return `ack_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
  }

  private generateTrackingId(): string {
    return `trk_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
  }

  private generateVerificationCode(): string {
    return Math.random().toString(36).substr(2, 8).toUpperCase()
  }

  private generateTrackingUrl(trackingId: string): string {
    return `${process.env.NEXT_PUBLIC_APP_URL || 'https://thinkus.app'}/api/track/${trackingId}`
  }

  private generateAckUrl(trackingId: string): string {
    return `${process.env.NEXT_PUBLIC_APP_URL || 'https://thinkus.app'}/ack/${trackingId}`
  }

  private injectTrackingPixel(html: string, trackingUrl: string): string {
    const pixel = `<img src="${trackingUrl}/pixel.gif" width="1" height="1" style="display:none" alt="" />`
    return html.replace('</body>', `${pixel}</body>`)
  }

  private findByTrackingId(trackingId: string): NotificationRecord | undefined {
    return Array.from(this.records.values()).find(r => r.trackingId === trackingId)
  }

  private async updateRecordStatus(record: NotificationRecord, eventType: TrackingEventType): Promise<void> {
    const now = new Date()

    switch (eventType) {
      case 'delivered':
        if (!record.deliveredAt) {
          record.deliveredAt = now
          record.status = 'delivered'
          record.statusCn = STATUS_CONFIG.delivered.label
        }
        break
      case 'opened':
        if (!record.openedAt) {
          record.openedAt = now
          record.status = 'opened'
          record.statusCn = STATUS_CONFIG.opened.label
        }
        break
      case 'clicked':
        if (!record.clickedAt) {
          record.clickedAt = now
        }
        break
      case 'acknowledged':
        record.acknowledgedAt = now
        record.status = 'acknowledged'
        record.statusCn = STATUS_CONFIG.acknowledged.label
        record.nextResendAt = undefined // 取消后续重发
        break
      case 'bounced':
      case 'failed':
        record.status = 'failed'
        record.statusCn = STATUS_CONFIG.failed.label
        break
    }
  }

  private async actualSend(record: NotificationRecord, htmlContent?: string): Promise<void> {
    // 这里应该调用实际的发送服务
    // 例如 SendGrid、阿里云短信等
    console.log(`[DeliveryAckSystem] 发送通知: ${record.subject} via ${record.channel}`)

    // 模拟发送成功
    setTimeout(() => {
      this.trackEvent(record.id, 'delivered')
    }, 1000)
  }

  private getMethodLabel(method: AcknowledgeReceipt['method']): string {
    const labels: Record<AcknowledgeReceipt['method'], string> = {
      click: '点击链接',
      button: '点击按钮',
      signature: '电子签名',
      auto: '自动确认',
    }
    return labels[method]
  }

  private isInPeriod(date: Date, period: AckStatistics['period']): boolean {
    if (period === 'all') return true

    const now = new Date()
    const diff = now.getTime() - date.getTime()
    const dayMs = 24 * 60 * 60 * 1000

    switch (period) {
      case 'day':
        return diff < dayMs
      case 'week':
        return diff < 7 * dayMs
      case 'month':
        return diff < 30 * dayMs
      default:
        return true
    }
  }
}

// 导出单例
export const deliveryAckSystem = DeliveryAckSystemService.getInstance()
