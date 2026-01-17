/**
 * 邮件通知服务
 * 使用 SendGrid API 发送真实邮件
 */

// SendGrid API 配置
const SENDGRID_API_KEY = process.env.SENDGRID_API_KEY
const SENDGRID_API_BASE = 'https://api.sendgrid.com/v3'
const DEFAULT_FROM_EMAIL = process.env.SENDGRID_FROM_EMAIL || 'noreply@thinkus.app'
const DEFAULT_FROM_NAME = process.env.SENDGRID_FROM_NAME || 'Thinkus'

// 邮件优先级
export type EmailPriority = 'low' | 'normal' | 'high' | 'urgent'

// 邮件类型
export type EmailType =
  | 'delivery_complete'     // 交付完成
  | 'delivery_failed'       // 交付失败
  | 'credentials'           // 登录凭证
  | 'acceptance_reminder'   // 验收提醒
  | 'acceptance_warning'    // 验收警告
  | 'acceptance_complete'   // 验收完成
  | 'test_report'          // 测试报告
  | 'error_notification'   // 错误通知
  | 'renewal_reminder'     // 续费提醒
  | 'welcome'              // 欢迎邮件
  | 'general'              // 通用邮件

// 邮件附件
export interface EmailAttachment {
  content: string       // Base64编码内容
  filename: string
  type?: string         // MIME类型
  disposition?: 'attachment' | 'inline'
  contentId?: string    // 用于内联图片
}

// 邮件配置
export interface EmailConfig {
  to: string | string[]
  subject: string
  type?: EmailType
  priority?: EmailPriority
  cc?: string[]
  bcc?: string[]
  replyTo?: string
  attachments?: EmailAttachment[]
  templateId?: string
  dynamicTemplateData?: Record<string, unknown>
  html?: string
  text?: string
  trackOpens?: boolean
  trackClicks?: boolean
  categories?: string[]
  customArgs?: Record<string, string>
}

// 发送结果
export interface EmailSendResult {
  success: boolean
  messageId?: string
  error?: string
  statusCode?: number
}

// 预定义邮件模板
export interface EmailTemplate {
  type: EmailType
  subject: string
  html: (data: Record<string, unknown>) => string
  text?: (data: Record<string, unknown>) => string
}

// 邮件模板
const EMAIL_TEMPLATES: Record<EmailType, EmailTemplate> = {
  delivery_complete: {
    type: 'delivery_complete',
    subject: '🎉 您的产品已交付完成 - {{projectName}}',
    html: (data) => generateDeliveryCompleteEmail(data),
  },
  delivery_failed: {
    type: 'delivery_failed',
    subject: '⚠️ 交付遇到问题 - {{projectName}}',
    html: (data) => generateDeliveryFailedEmail(data),
  },
  credentials: {
    type: 'credentials',
    subject: '🔐 您的登录凭证 - {{projectName}}',
    html: (data) => generateCredentialsEmail(data),
  },
  acceptance_reminder: {
    type: 'acceptance_reminder',
    subject: '📋 请验收您的产品 - {{projectName}}',
    html: (data) => generateAcceptanceReminderEmail(data),
  },
  acceptance_warning: {
    type: 'acceptance_warning',
    subject: '⏰ 验收即将超时 - {{projectName}}',
    html: (data) => generateAcceptanceWarningEmail(data),
  },
  acceptance_complete: {
    type: 'acceptance_complete',
    subject: '✅ 验收已完成 - {{projectName}}',
    html: (data) => generateAcceptanceCompleteEmail(data),
  },
  test_report: {
    type: 'test_report',
    subject: '📊 测试报告 - {{projectName}}',
    html: (data) => generateTestReportEmail(data),
  },
  error_notification: {
    type: 'error_notification',
    subject: '🔴 系统错误通知 - {{projectName}}',
    html: (data) => generateErrorNotificationEmail(data),
  },
  renewal_reminder: {
    type: 'renewal_reminder',
    subject: '📅 续费提醒 - {{serviceName}}',
    html: (data) => generateRenewalReminderEmail(data),
  },
  welcome: {
    type: 'welcome',
    subject: '🎊 欢迎使用 {{projectName}}',
    html: (data) => generateWelcomeEmail(data),
  },
  general: {
    type: 'general',
    subject: '{{subject}}',
    html: (data) => generateGeneralEmail(data),
  },
}

/**
 * 邮件通知服务
 */
export class EmailNotifierService {
  private apiKey: string
  private fromEmail: string
  private fromName: string

  constructor(apiKey?: string, fromEmail?: string, fromName?: string) {
    this.apiKey = apiKey || SENDGRID_API_KEY || ''
    this.fromEmail = fromEmail || DEFAULT_FROM_EMAIL
    this.fromName = fromName || DEFAULT_FROM_NAME

    if (!this.apiKey) {
      console.warn('⚠️ SENDGRID_API_KEY not set, emails will not be sent')
    }
  }

  /**
   * 验证 API Key 是否有效
   */
  async validateApiKey(): Promise<boolean> {
    if (!this.apiKey) return false

    try {
      const response = await fetch(`${SENDGRID_API_BASE}/user/profile`, {
        headers: {
          Authorization: `Bearer ${this.apiKey}`,
        },
      })
      return response.ok
    } catch {
      return false
    }
  }

  /**
   * 发送邮件
   */
  async send(config: EmailConfig): Promise<EmailSendResult> {
    if (!this.apiKey) {
      console.warn('SendGrid API key not configured, email not sent')
      return {
        success: false,
        error: 'SendGrid API key not configured',
      }
    }

    try {
      const recipients = Array.isArray(config.to) ? config.to : [config.to]

      const payload: Record<string, unknown> = {
        personalizations: [{
          to: recipients.map(email => ({ email })),
          ...(config.cc && { cc: config.cc.map(email => ({ email })) }),
          ...(config.bcc && { bcc: config.bcc.map(email => ({ email })) }),
          ...(config.dynamicTemplateData && { dynamic_template_data: config.dynamicTemplateData }),
        }],
        from: {
          email: this.fromEmail,
          name: this.fromName,
        },
        subject: config.subject,
        ...(config.replyTo && { reply_to: { email: config.replyTo } }),
        ...(config.templateId && { template_id: config.templateId }),
        ...(config.html && { content: [{ type: 'text/html', value: config.html }] }),
        ...(config.text && !config.html && { content: [{ type: 'text/plain', value: config.text }] }),
        ...(config.attachments && {
          attachments: config.attachments.map(a => ({
            content: a.content,
            filename: a.filename,
            type: a.type,
            disposition: a.disposition || 'attachment',
            content_id: a.contentId,
          })),
        }),
        tracking_settings: {
          open_tracking: { enable: config.trackOpens !== false },
          click_tracking: { enable: config.trackClicks !== false },
        },
        ...(config.categories && { categories: config.categories }),
        ...(config.customArgs && { custom_args: config.customArgs }),
      }

      const response = await fetch(`${SENDGRID_API_BASE}/mail/send`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${this.apiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
      })

      if (response.ok || response.status === 202) {
        const messageId = response.headers.get('X-Message-Id') || undefined
        return {
          success: true,
          messageId,
          statusCode: response.status,
        }
      } else {
        const errorData = await response.json().catch(() => ({}))
        return {
          success: false,
          error: (errorData as { errors?: Array<{ message: string }> })?.errors?.[0]?.message || `HTTP ${response.status}`,
          statusCode: response.status,
        }
      }
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      }
    }
  }

  /**
   * 使用模板发送邮件
   */
  async sendWithTemplate(
    type: EmailType,
    to: string | string[],
    data: Record<string, unknown>,
    options?: Partial<EmailConfig>
  ): Promise<EmailSendResult> {
    const template = EMAIL_TEMPLATES[type]
    if (!template) {
      return {
        success: false,
        error: `Unknown email type: ${type}`,
      }
    }

    // 替换主题中的变量
    const subject = template.subject.replace(/\{\{(\w+)\}\}/g, (_, key) =>
      String(data[key] || '')
    )

    return this.send({
      to,
      subject,
      html: template.html(data),
      type,
      categories: [type],
      ...options,
    })
  }

  /**
   * 发送交付完成邮件
   */
  async sendDeliveryComplete(
    to: string,
    data: {
      projectName: string
      productUrl: string
      adminUrl?: string
      credentials?: { username: string; password: string }
      quickStartGuide?: string
      supportEmail?: string
    }
  ): Promise<EmailSendResult> {
    return this.sendWithTemplate('delivery_complete', to, data, {
      priority: 'high',
    })
  }

  /**
   * 发送登录凭证邮件
   */
  async sendCredentials(
    to: string,
    data: {
      projectName: string
      productUrl: string
      adminUrl: string
      username: string
      password: string
      mustChangePassword?: boolean
    }
  ): Promise<EmailSendResult> {
    return this.sendWithTemplate('credentials', to, {
      ...data,
      passwordMasked: data.password.slice(0, 3) + '****',
    }, {
      priority: 'high',
    })
  }

  /**
   * 发送验收提醒邮件
   */
  async sendAcceptanceReminder(
    to: string,
    data: {
      projectName: string
      productUrl: string
      acceptanceUrl: string
      remainingHours: number
      isWarning?: boolean
    }
  ): Promise<EmailSendResult> {
    const type = data.isWarning ? 'acceptance_warning' : 'acceptance_reminder'
    return this.sendWithTemplate(type, to, data, {
      priority: data.isWarning ? 'urgent' : 'high',
    })
  }

  /**
   * 发送测试报告邮件
   */
  async sendTestReport(
    to: string,
    data: {
      projectName: string
      totalTests: number
      passed: number
      failed: number
      passRate: number
      reportUrl?: string
    }
  ): Promise<EmailSendResult> {
    return this.sendWithTemplate('test_report', to, data)
  }

  /**
   * 发送错误通知邮件
   */
  async sendErrorNotification(
    to: string,
    data: {
      projectName: string
      errorType: string
      errorMessage: string
      errorTime: string
      actionRequired?: string
      supportUrl?: string
    }
  ): Promise<EmailSendResult> {
    return this.sendWithTemplate('error_notification', to, data, {
      priority: 'urgent',
    })
  }

  /**
   * 批量发送邮件
   */
  async sendBatch(
    configs: EmailConfig[]
  ): Promise<EmailSendResult[]> {
    // 并行发送，但限制并发数
    const batchSize = 10
    const results: EmailSendResult[] = []

    for (let i = 0; i < configs.length; i += batchSize) {
      const batch = configs.slice(i, i + batchSize)
      const batchResults = await Promise.all(batch.map(c => this.send(c)))
      results.push(...batchResults)
    }

    return results
  }
}

// ============ 邮件模板生成函数 ============

function generateBaseTemplate(content: string, data: Record<string, unknown>): string {
  const projectName = String(data.projectName || 'Thinkus')

  return `<!DOCTYPE html>
<html lang="zh-CN">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${projectName}</title>
  <style>
    body { margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; background-color: #f5f5f5; }
    .container { max-width: 600px; margin: 0 auto; background: white; }
    .header { background: linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%); padding: 32px; text-align: center; }
    .header h1 { color: white; margin: 0; font-size: 24px; }
    .content { padding: 32px; }
    .footer { background: #f9fafb; padding: 24px; text-align: center; font-size: 12px; color: #6b7280; }
    .button { display: inline-block; background: #6366f1; color: white !important; text-decoration: none; padding: 12px 24px; border-radius: 8px; font-weight: 600; margin: 16px 0; }
    .button:hover { background: #4f46e5; }
    .card { background: #f9fafb; border-radius: 8px; padding: 16px; margin: 16px 0; }
    .info-row { display: flex; justify-content: space-between; padding: 8px 0; border-bottom: 1px solid #e5e7eb; }
    .info-row:last-child { border-bottom: none; }
    .label { color: #6b7280; }
    .value { font-weight: 600; color: #111827; }
    .highlight { background: #fef3c7; padding: 12px; border-radius: 8px; border-left: 4px solid #f59e0b; margin: 16px 0; }
    .success { background: #dcfce7; border-left-color: #22c55e; }
    .error { background: #fee2e2; border-left-color: #ef4444; }
    .code { background: #1f2937; color: #f9fafb; padding: 12px; border-radius: 8px; font-family: monospace; margin: 8px 0; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>${projectName}</h1>
    </div>
    <div class="content">
      ${content}
    </div>
    <div class="footer">
      <p>此邮件由 Thinkus 自动发送</p>
      <p>如有问题，请联系 support@thinkus.app</p>
    </div>
  </div>
</body>
</html>`
}

function generateDeliveryCompleteEmail(data: Record<string, unknown>): string {
  const productUrl = String(data.productUrl || '')
  const adminUrl = String(data.adminUrl || '')
  const credentials = data.credentials as { username: string; password: string } | undefined

  let content = `
    <h2 style="color: #111827; margin-bottom: 16px;">🎉 恭喜！您的产品已交付完成</h2>
    <p style="color: #4b5563; line-height: 1.6;">
      您的产品已经部署上线，可以开始使用了！以下是您的产品信息：
    </p>

    <div class="card">
      <div class="info-row">
        <span class="label">产品地址</span>
        <span class="value"><a href="${productUrl}" style="color: #6366f1;">${productUrl}</a></span>
      </div>
      ${adminUrl ? `
      <div class="info-row">
        <span class="label">管理后台</span>
        <span class="value"><a href="${adminUrl}" style="color: #6366f1;">${adminUrl}</a></span>
      </div>
      ` : ''}
    </div>
  `

  if (credentials) {
    content += `
    <div class="highlight">
      <strong>🔐 登录凭证</strong>
      <p style="margin: 8px 0 0;">用户名: <code>${credentials.username}</code></p>
      <p style="margin: 4px 0 0;">密码: <code>${credentials.password}</code></p>
      <p style="margin: 8px 0 0; font-size: 12px; color: #92400e;">
        ⚠️ 请首次登录后立即修改密码
      </p>
    </div>
    `
  }

  content += `
    <div style="text-align: center;">
      <a href="${productUrl}" class="button">立即访问产品</a>
    </div>

    <h3 style="color: #111827; margin-top: 24px;">📋 下一步</h3>
    <ol style="color: #4b5563; line-height: 1.8;">
      <li>访问产品地址，确认可以正常打开</li>
      <li>使用提供的凭证登录管理后台</li>
      <li>修改默认密码</li>
      <li>开始使用您的产品</li>
    </ol>
  `

  return generateBaseTemplate(content, data)
}

function generateCredentialsEmail(data: Record<string, unknown>): string {
  const adminUrl = String(data.adminUrl || '')
  const username = String(data.username || '')
  const password = String(data.password || '')
  const mustChangePassword = Boolean(data.mustChangePassword)

  const content = `
    <h2 style="color: #111827; margin-bottom: 16px;">🔐 您的登录凭证</h2>
    <p style="color: #4b5563; line-height: 1.6;">
      以下是您的管理后台登录信息，请妥善保管。
    </p>

    <div class="card">
      <div class="info-row">
        <span class="label">管理后台</span>
        <span class="value"><a href="${adminUrl}" style="color: #6366f1;">${adminUrl}</a></span>
      </div>
      <div class="info-row">
        <span class="label">用户名</span>
        <span class="value">${username}</span>
      </div>
      <div class="info-row">
        <span class="label">密码</span>
        <span class="value">${password}</span>
      </div>
    </div>

    ${mustChangePassword ? `
    <div class="highlight">
      <strong>⚠️ 安全提示</strong>
      <p style="margin: 8px 0 0;">这是临时密码，请首次登录后立即修改。</p>
    </div>
    ` : ''}

    <div style="text-align: center;">
      <a href="${adminUrl}" class="button">登录管理后台</a>
    </div>

    <div class="highlight" style="background: #dbeafe; border-left-color: #3b82f6;">
      <strong>🔒 安全建议</strong>
      <ul style="margin: 8px 0 0; padding-left: 20px; color: #1e40af;">
        <li>请勿将密码分享给他人</li>
        <li>定期更换密码</li>
        <li>建议开启两步验证</li>
      </ul>
    </div>
  `

  return generateBaseTemplate(content, data)
}

function generateAcceptanceReminderEmail(data: Record<string, unknown>): string {
  const productUrl = String(data.productUrl || '')
  const acceptanceUrl = String(data.acceptanceUrl || '')
  const remainingHours = Number(data.remainingHours || 72)

  const content = `
    <h2 style="color: #111827; margin-bottom: 16px;">📋 请验收您的产品</h2>
    <p style="color: #4b5563; line-height: 1.6;">
      您的产品已经交付，请在 <strong>${remainingHours} 小时</strong>内完成验收。
    </p>

    <div class="card">
      <div class="info-row">
        <span class="label">产品地址</span>
        <span class="value"><a href="${productUrl}" style="color: #6366f1;">${productUrl}</a></span>
      </div>
      <div class="info-row">
        <span class="label">剩余时间</span>
        <span class="value" style="color: #f59e0b;">${remainingHours} 小时</span>
      </div>
    </div>

    <div style="text-align: center;">
      <a href="${acceptanceUrl}" class="button">开始验收</a>
    </div>

    <div class="highlight">
      <strong>ℹ️ 验收说明</strong>
      <p style="margin: 8px 0 0;">
        如果在规定时间内未完成验收，系统将自动视为验收通过。
        如有任何问题，请及时联系我们。
      </p>
    </div>
  `

  return generateBaseTemplate(content, data)
}

function generateAcceptanceWarningEmail(data: Record<string, unknown>): string {
  const acceptanceUrl = String(data.acceptanceUrl || '')
  const remainingHours = Number(data.remainingHours || 24)

  const content = `
    <h2 style="color: #f59e0b; margin-bottom: 16px;">⏰ 验收即将超时</h2>
    <p style="color: #4b5563; line-height: 1.6;">
      您的产品验收还剩 <strong style="color: #ef4444;">${remainingHours} 小时</strong>，
      请尽快完成验收。
    </p>

    <div class="highlight" style="background: #fee2e2; border-left-color: #ef4444;">
      <strong>⚠️ 重要提醒</strong>
      <p style="margin: 8px 0 0;">
        超时后系统将自动视为验收通过。如有问题请立即联系我们。
      </p>
    </div>

    <div style="text-align: center;">
      <a href="${acceptanceUrl}" class="button" style="background: #ef4444;">立即验收</a>
    </div>
  `

  return generateBaseTemplate(content, data)
}

function generateAcceptanceCompleteEmail(data: Record<string, unknown>): string {
  const content = `
    <h2 style="color: #22c55e; margin-bottom: 16px;">✅ 验收已完成</h2>
    <p style="color: #4b5563; line-height: 1.6;">
      感谢您完成产品验收！您的反馈对我们非常重要。
    </p>

    <div class="highlight success">
      <strong>🎉 验收状态: 通过</strong>
      <p style="margin: 8px 0 0;">
        您的产品已正式交付完成，祝您使用愉快！
      </p>
    </div>

    <h3 style="color: #111827; margin-top: 24px;">📞 后续支持</h3>
    <p style="color: #4b5563; line-height: 1.6;">
      如果使用过程中遇到任何问题，欢迎随时联系我们：
    </p>
    <ul style="color: #4b5563; line-height: 1.8;">
      <li>邮箱: support@thinkus.app</li>
      <li>在线客服: 产品内右下角聊天按钮</li>
    </ul>
  `

  return generateBaseTemplate(content, data)
}

function generateTestReportEmail(data: Record<string, unknown>): string {
  const totalTests = Number(data.totalTests || 0)
  const passed = Number(data.passed || 0)
  const failed = Number(data.failed || 0)
  const passRate = Number(data.passRate || 0)
  const reportUrl = String(data.reportUrl || '')

  const statusColor = failed > 0 ? '#ef4444' : '#22c55e'
  const statusEmoji = failed > 0 ? '⚠️' : '✅'

  const content = `
    <h2 style="color: #111827; margin-bottom: 16px;">${statusEmoji} 测试报告</h2>

    <div class="card">
      <div class="info-row">
        <span class="label">总测试数</span>
        <span class="value">${totalTests}</span>
      </div>
      <div class="info-row">
        <span class="label">通过</span>
        <span class="value" style="color: #22c55e;">${passed}</span>
      </div>
      <div class="info-row">
        <span class="label">失败</span>
        <span class="value" style="color: #ef4444;">${failed}</span>
      </div>
      <div class="info-row">
        <span class="label">通过率</span>
        <span class="value" style="color: ${statusColor};">${passRate}%</span>
      </div>
    </div>

    ${reportUrl ? `
    <div style="text-align: center;">
      <a href="${reportUrl}" class="button">查看完整报告</a>
    </div>
    ` : ''}
  `

  return generateBaseTemplate(content, data)
}

function generateErrorNotificationEmail(data: Record<string, unknown>): string {
  const errorType = String(data.errorType || '未知错误')
  const errorMessage = String(data.errorMessage || '')
  const errorTime = String(data.errorTime || new Date().toLocaleString('zh-CN'))
  const actionRequired = String(data.actionRequired || '')
  const supportUrl = String(data.supportUrl || '')

  const content = `
    <h2 style="color: #ef4444; margin-bottom: 16px;">🔴 系统错误通知</h2>

    <div class="highlight error">
      <strong>${errorType}</strong>
      <p style="margin: 8px 0 0;">${errorMessage}</p>
      <p style="margin: 8px 0 0; font-size: 12px; color: #991b1b;">
        发生时间: ${errorTime}
      </p>
    </div>

    ${actionRequired ? `
    <h3 style="color: #111827; margin-top: 24px;">📋 需要的操作</h3>
    <p style="color: #4b5563;">${actionRequired}</p>
    ` : ''}

    ${supportUrl ? `
    <div style="text-align: center;">
      <a href="${supportUrl}" class="button" style="background: #ef4444;">联系支持</a>
    </div>
    ` : ''}
  `

  return generateBaseTemplate(content, data)
}

function generateRenewalReminderEmail(data: Record<string, unknown>): string {
  const serviceName = String(data.serviceName || '')
  const expiresAt = String(data.expiresAt || '')
  const renewalUrl = String(data.renewalUrl || '')
  const price = String(data.price || '')

  const content = `
    <h2 style="color: #111827; margin-bottom: 16px;">📅 续费提醒</h2>
    <p style="color: #4b5563; line-height: 1.6;">
      您的 <strong>${serviceName}</strong> 服务即将到期，请及时续费以确保服务不中断。
    </p>

    <div class="card">
      <div class="info-row">
        <span class="label">服务名称</span>
        <span class="value">${serviceName}</span>
      </div>
      <div class="info-row">
        <span class="label">到期时间</span>
        <span class="value" style="color: #f59e0b;">${expiresAt}</span>
      </div>
      ${price ? `
      <div class="info-row">
        <span class="label">续费金额</span>
        <span class="value">${price}</span>
      </div>
      ` : ''}
    </div>

    ${renewalUrl ? `
    <div style="text-align: center;">
      <a href="${renewalUrl}" class="button">立即续费</a>
    </div>
    ` : ''}
  `

  return generateBaseTemplate(content, data)
}

function generateWelcomeEmail(data: Record<string, unknown>): string {
  const productUrl = String(data.productUrl || '')

  const content = `
    <h2 style="color: #111827; margin-bottom: 16px;">🎊 欢迎使用您的新产品！</h2>
    <p style="color: #4b5563; line-height: 1.6;">
      恭喜您！您的产品已经准备就绪，开始您的旅程吧。
    </p>

    <div style="text-align: center;">
      <a href="${productUrl}" class="button">开始使用</a>
    </div>

    <h3 style="color: #111827; margin-top: 24px;">🚀 快速入门</h3>
    <ol style="color: #4b5563; line-height: 1.8;">
      <li>访问产品地址</li>
      <li>使用提供的凭证登录</li>
      <li>浏览功能并开始使用</li>
      <li>如有问题，随时联系我们</li>
    </ol>
  `

  return generateBaseTemplate(content, data)
}

function generateGeneralEmail(data: Record<string, unknown>): string {
  const content = String(data.content || '')
  return generateBaseTemplate(content, data)
}

// 单例实例
let _emailNotifier: EmailNotifierService | null = null

export function getEmailNotifier(): EmailNotifierService {
  if (!_emailNotifier) {
    _emailNotifier = new EmailNotifierService()
  }
  return _emailNotifier
}

// 便捷方法
export async function sendEmail(config: EmailConfig): Promise<EmailSendResult> {
  const notifier = getEmailNotifier()
  return notifier.send(config)
}

export async function sendDeliveryCompleteEmail(
  to: string,
  data: Parameters<EmailNotifierService['sendDeliveryComplete']>[1]
): Promise<EmailSendResult> {
  const notifier = getEmailNotifier()
  return notifier.sendDeliveryComplete(to, data)
}

export async function sendCredentialsEmail(
  to: string,
  data: Parameters<EmailNotifierService['sendCredentials']>[1]
): Promise<EmailSendResult> {
  const notifier = getEmailNotifier()
  return notifier.sendCredentials(to, data)
}
