/**
 * 交付信息存档服务
 * 永久保存交付信息，支持随时查看和重发
 */

/**
 * 交付信息
 */
export interface DeliveryInfo {
  /** 交付ID */
  id: string
  /** 项目ID */
  projectId: string
  /** 用户ID */
  userId: string
  /** 产品名称 */
  productName: string
  /** 产品类型 */
  productType: string
  /** 产品访问URL */
  productUrl: string
  /** 管理后台URL */
  adminUrl?: string
  /** 管理员凭证 */
  adminCredentials?: {
    email: string
    password: string
    note?: string
  }
  /** 数据库信息 */
  databaseInfo?: {
    type: string
    host: string
    database: string
    username?: string
    password?: string
    connectionString?: string
  }
  /** 域名信息 */
  domainInfo?: {
    domain: string
    subdomain?: string
    sslStatus: string
    expiresAt?: Date
  }
  /** QR码（Base64） */
  qrCode?: string
  /** 快速入门指南 */
  quickStartGuide?: string
  /** 教程列表 */
  tutorials?: {
    id: string
    title: string
    type: string
  }[]
  /** 交付邮件发送记录 */
  emailHistory: EmailRecord[]
  /** 交付时间 */
  deliveredAt: Date
  /** 创建时间 */
  createdAt: Date
  /** 更新时间 */
  updatedAt: Date
  /** 是否已归档 */
  archived: boolean
  /** 归档时间 */
  archivedAt?: Date
}

/**
 * 邮件发送记录
 */
export interface EmailRecord {
  id: string
  type: 'delivery' | 'credentials' | 'reminder' | 'update'
  to: string
  subject: string
  sentAt: Date
  status: 'sent' | 'failed' | 'bounced'
  errorMessage?: string
}

/**
 * 重发选项
 */
export interface ResendOptions {
  /** 接收邮箱（默认用户邮箱） */
  email?: string
  /** 是否包含凭证 */
  includeCredentials?: boolean
  /** 是否包含QR码 */
  includeQRCode?: boolean
  /** 是否包含教程 */
  includeTutorials?: boolean
  /** 自定义消息 */
  customMessage?: string
}

/**
 * 交付摘要（用于列表展示）
 */
export interface DeliverySummary {
  id: string
  projectId: string
  productName: string
  productUrl: string
  deliveredAt: Date
  lastEmailSent?: Date
  emailCount: number
}

/**
 * 交付信息存档服务类
 */
export class DeliveryArchiveService {
  private static instance: DeliveryArchiveService

  /** SendGrid API Key */
  private readonly SENDGRID_API_KEY = process.env.SENDGRID_API_KEY || ''

  /** 发件人邮箱 */
  private readonly FROM_EMAIL = process.env.FROM_EMAIL || 'delivery@thinkus.app'

  /** 发件人名称 */
  private readonly FROM_NAME = process.env.FROM_NAME || 'Thinkus 交付助手'

  private constructor() {}

  public static getInstance(): DeliveryArchiveService {
    if (!DeliveryArchiveService.instance) {
      DeliveryArchiveService.instance = new DeliveryArchiveService()
    }
    return DeliveryArchiveService.instance
  }

  /**
   * 创建交付存档
   */
  createArchive(params: {
    projectId: string
    userId: string
    productName: string
    productType: string
    productUrl: string
    adminUrl?: string
    adminCredentials?: DeliveryInfo['adminCredentials']
    databaseInfo?: DeliveryInfo['databaseInfo']
    domainInfo?: DeliveryInfo['domainInfo']
    qrCode?: string
    quickStartGuide?: string
    tutorials?: DeliveryInfo['tutorials']
  }): DeliveryInfo {
    const now = new Date()
    const id = `delivery-${params.projectId}-${now.getTime()}`

    return {
      id,
      projectId: params.projectId,
      userId: params.userId,
      productName: params.productName,
      productType: params.productType,
      productUrl: params.productUrl,
      adminUrl: params.adminUrl,
      adminCredentials: params.adminCredentials,
      databaseInfo: params.databaseInfo,
      domainInfo: params.domainInfo,
      qrCode: params.qrCode,
      quickStartGuide: params.quickStartGuide,
      tutorials: params.tutorials,
      emailHistory: [],
      deliveredAt: now,
      createdAt: now,
      updatedAt: now,
      archived: false
    }
  }

  /**
   * 生成交付邮件内容
   */
  generateDeliveryEmail(
    delivery: DeliveryInfo,
    options: ResendOptions = {}
  ): { subject: string; html: string; text: string } {
    const subject = `🎉 您的产品「${delivery.productName}」已交付`

    const sections: string[] = []

    // 产品链接
    sections.push(`
      <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); padding: 30px; border-radius: 12px; text-align: center; margin-bottom: 20px;">
        <h1 style="color: white; margin: 0 0 10px 0; font-size: 24px;">🎉 恭喜！您的产品已上线</h1>
        <p style="color: rgba(255,255,255,0.9); margin: 0 0 20px 0;">${delivery.productName}</p>
        <a href="${delivery.productUrl}" style="display: inline-block; background: white; color: #667eea; padding: 12px 30px; border-radius: 25px; text-decoration: none; font-weight: bold;">
          立即访问 →
        </a>
      </div>
    `)

    // QR码
    if (options.includeQRCode !== false && delivery.qrCode) {
      sections.push(`
        <div style="text-align: center; margin: 20px 0; padding: 20px; background: #f8f9fa; border-radius: 8px;">
          <p style="margin: 0 0 10px 0; color: #666;">手机扫码访问</p>
          <img src="${delivery.qrCode}" alt="QR Code" style="width: 150px; height: 150px;" />
        </div>
      `)
    }

    // 管理员凭证
    if (options.includeCredentials !== false && delivery.adminCredentials) {
      sections.push(`
        <div style="background: #fff3cd; border: 1px solid #ffc107; padding: 20px; border-radius: 8px; margin: 20px 0;">
          <h3 style="margin: 0 0 15px 0; color: #856404;">🔐 管理员登录信息</h3>
          <p style="margin: 5px 0;"><strong>管理后台：</strong><a href="${delivery.adminUrl || delivery.productUrl + '/admin'}">${delivery.adminUrl || delivery.productUrl + '/admin'}</a></p>
          <p style="margin: 5px 0;"><strong>登录邮箱：</strong>${delivery.adminCredentials.email}</p>
          <p style="margin: 5px 0;"><strong>初始密码：</strong>${delivery.adminCredentials.password}</p>
          <p style="margin: 15px 0 0 0; color: #856404; font-size: 12px;">⚠️ 首次登录后请立即修改密码</p>
        </div>
      `)
    }

    // 快速入门
    if (delivery.quickStartGuide) {
      sections.push(`
        <div style="background: #e8f5e9; border: 1px solid #4caf50; padding: 20px; border-radius: 8px; margin: 20px 0;">
          <h3 style="margin: 0 0 15px 0; color: #2e7d32;">📖 快速入门</h3>
          <div style="color: #333; white-space: pre-line;">${delivery.quickStartGuide}</div>
        </div>
      `)
    }

    // 教程链接
    if (options.includeTutorials !== false && delivery.tutorials && delivery.tutorials.length > 0) {
      const tutorialLinks = delivery.tutorials
        .map(t => `<li style="margin: 5px 0;"><a href="#" style="color: #1976d2;">${t.title}</a></li>`)
        .join('')

      sections.push(`
        <div style="background: #e3f2fd; border: 1px solid #2196f3; padding: 20px; border-radius: 8px; margin: 20px 0;">
          <h3 style="margin: 0 0 15px 0; color: #1565c0;">📚 使用教程</h3>
          <ul style="margin: 0; padding-left: 20px;">${tutorialLinks}</ul>
        </div>
      `)
    }

    // 自定义消息
    if (options.customMessage) {
      sections.push(`
        <div style="background: #f5f5f5; padding: 20px; border-radius: 8px; margin: 20px 0;">
          <p style="margin: 0; color: #333;">${options.customMessage}</p>
        </div>
      `)
    }

    // 支持信息
    sections.push(`
      <div style="text-align: center; padding: 20px; border-top: 1px solid #eee; margin-top: 30px; color: #666;">
        <p style="margin: 0 0 10px 0;">遇到问题？我们随时为您提供帮助</p>
        <a href="mailto:support@thinkus.app" style="color: #1976d2; text-decoration: none;">📧 support@thinkus.app</a>
      </div>
    `)

    const html = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
      </head>
      <body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; background: #f5f5f5;">
        <div style="background: white; padding: 30px; border-radius: 12px; box-shadow: 0 2px 10px rgba(0,0,0,0.1);">
          ${sections.join('')}
        </div>
        <div style="text-align: center; padding: 20px; color: #999; font-size: 12px;">
          <p>此邮件由 Thinkus 自动发送，请勿直接回复</p>
          <p>© ${new Date().getFullYear()} Thinkus. All rights reserved.</p>
        </div>
      </body>
      </html>
    `

    // 纯文本版本
    const text = `
🎉 恭喜！您的产品「${delivery.productName}」已交付

产品链接: ${delivery.productUrl}

${delivery.adminCredentials && options.includeCredentials !== false ? `
🔐 管理员登录信息
管理后台: ${delivery.adminUrl || delivery.productUrl + '/admin'}
登录邮箱: ${delivery.adminCredentials.email}
初始密码: ${delivery.adminCredentials.password}
⚠️ 首次登录后请立即修改密码
` : ''}

${delivery.quickStartGuide ? `
📖 快速入门
${delivery.quickStartGuide}
` : ''}

${options.customMessage ? `
${options.customMessage}
` : ''}

遇到问题？联系我们: support@thinkus.app
    `.trim()

    return { subject, html, text }
  }

  /**
   * 发送交付邮件
   */
  async sendDeliveryEmail(
    delivery: DeliveryInfo,
    to: string,
    options: ResendOptions = {}
  ): Promise<{ success: boolean; error?: string }> {
    const { subject, html, text } = this.generateDeliveryEmail(delivery, options)

    const emailRecord: EmailRecord = {
      id: `email-${Date.now()}`,
      type: 'delivery',
      to,
      subject,
      sentAt: new Date(),
      status: 'sent'
    }

    try {
      if (this.SENDGRID_API_KEY) {
        // 使用 SendGrid 发送
        const response = await fetch('https://api.sendgrid.com/v3/mail/send', {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${this.SENDGRID_API_KEY}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            personalizations: [{ to: [{ email: to }] }],
            from: { email: this.FROM_EMAIL, name: this.FROM_NAME },
            subject,
            content: [
              { type: 'text/plain', value: text },
              { type: 'text/html', value: html }
            ]
          })
        })

        if (!response.ok) {
          throw new Error(`SendGrid error: ${response.status}`)
        }
      } else {
        // 模拟发送（开发环境）
        console.log('📧 [模拟发送邮件]', { to, subject })
      }

      delivery.emailHistory.push(emailRecord)
      return { success: true }
    } catch (error) {
      emailRecord.status = 'failed'
      emailRecord.errorMessage = error instanceof Error ? error.message : '发送失败'
      delivery.emailHistory.push(emailRecord)
      return { success: false, error: emailRecord.errorMessage }
    }
  }

  /**
   * 重发交付信息
   */
  async resendDeliveryInfo(
    delivery: DeliveryInfo,
    options: ResendOptions = {}
  ): Promise<{ success: boolean; error?: string }> {
    const to = options.email || delivery.adminCredentials?.email
    if (!to) {
      return { success: false, error: '没有可用的邮箱地址' }
    }

    return this.sendDeliveryEmail(delivery, to, options)
  }

  /**
   * 仅重发凭证
   */
  async resendCredentials(
    delivery: DeliveryInfo,
    to: string
  ): Promise<{ success: boolean; error?: string }> {
    if (!delivery.adminCredentials) {
      return { success: false, error: '没有凭证信息' }
    }

    const subject = `🔐 您的管理员凭证 - ${delivery.productName}`
    const html = `
      <!DOCTYPE html>
      <html>
      <body style="font-family: sans-serif; max-width: 500px; margin: 0 auto; padding: 20px;">
        <div style="background: #fff3cd; border: 1px solid #ffc107; padding: 20px; border-radius: 8px;">
          <h2 style="margin: 0 0 20px 0; color: #856404;">🔐 管理员凭证</h2>
          <p><strong>产品：</strong>${delivery.productName}</p>
          <p><strong>管理后台：</strong><a href="${delivery.adminUrl || delivery.productUrl + '/admin'}">${delivery.adminUrl || delivery.productUrl + '/admin'}</a></p>
          <p><strong>登录邮箱：</strong>${delivery.adminCredentials.email}</p>
          <p><strong>密码：</strong>${delivery.adminCredentials.password}</p>
          <hr style="margin: 20px 0; border: none; border-top: 1px solid #ffc107;">
          <p style="color: #856404; font-size: 12px;">⚠️ 请立即登录并修改密码，确保账号安全</p>
        </div>
      </body>
      </html>
    `

    const emailRecord: EmailRecord = {
      id: `email-${Date.now()}`,
      type: 'credentials',
      to,
      subject,
      sentAt: new Date(),
      status: 'sent'
    }

    try {
      if (this.SENDGRID_API_KEY) {
        const response = await fetch('https://api.sendgrid.com/v3/mail/send', {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${this.SENDGRID_API_KEY}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            personalizations: [{ to: [{ email: to }] }],
            from: { email: this.FROM_EMAIL, name: this.FROM_NAME },
            subject,
            content: [{ type: 'text/html', value: html }]
          })
        })

        if (!response.ok) {
          throw new Error(`SendGrid error: ${response.status}`)
        }
      }

      delivery.emailHistory.push(emailRecord)
      return { success: true }
    } catch (error) {
      emailRecord.status = 'failed'
      emailRecord.errorMessage = error instanceof Error ? error.message : '发送失败'
      delivery.emailHistory.push(emailRecord)
      return { success: false, error: emailRecord.errorMessage }
    }
  }

  /**
   * 获取交付摘要列表
   */
  getDeliverySummaries(deliveries: DeliveryInfo[]): DeliverySummary[] {
    return deliveries.map(d => ({
      id: d.id,
      projectId: d.projectId,
      productName: d.productName,
      productUrl: d.productUrl,
      deliveredAt: d.deliveredAt,
      lastEmailSent: d.emailHistory.length > 0
        ? d.emailHistory[d.emailHistory.length - 1].sentAt
        : undefined,
      emailCount: d.emailHistory.length
    }))
  }

  /**
   * 生成交付信息的纯文本版本（用于复制）
   */
  generatePlainText(delivery: DeliveryInfo): string {
    const lines = [
      `=== ${delivery.productName} 交付信息 ===`,
      ``,
      `📌 产品链接: ${delivery.productUrl}`,
      ``
    ]

    if (delivery.adminCredentials) {
      lines.push(
        `🔐 管理员登录`,
        `   后台地址: ${delivery.adminUrl || delivery.productUrl + '/admin'}`,
        `   邮箱: ${delivery.adminCredentials.email}`,
        `   密码: ${delivery.adminCredentials.password}`,
        ``
      )
    }

    if (delivery.domainInfo) {
      lines.push(
        `🌐 域名信息`,
        `   域名: ${delivery.domainInfo.domain}`,
        `   SSL: ${delivery.domainInfo.sslStatus}`,
        ``
      )
    }

    lines.push(
      `📅 交付时间: ${delivery.deliveredAt.toLocaleString('zh-CN')}`,
      ``,
      `如有问题请联系: support@thinkus.app`
    )

    return lines.join('\n')
  }

  /**
   * 导出交付信息为JSON
   */
  exportToJSON(delivery: DeliveryInfo): string {
    // 脱敏处理密码
    const exported = {
      ...delivery,
      adminCredentials: delivery.adminCredentials ? {
        ...delivery.adminCredentials,
        password: '********'
      } : undefined,
      databaseInfo: delivery.databaseInfo ? {
        ...delivery.databaseInfo,
        password: '********'
      } : undefined
    }
    return JSON.stringify(exported, null, 2)
  }
}

// 导出单例实例
export const deliveryArchive = DeliveryArchiveService.getInstance()
