/**
 * 用户账号初始化服务
 *
 * 交付自动化 P0-4: 安全创建用户账号并传递凭证
 *
 * 功能:
 * - 安全创建初始管理员账号
 * - 生成强密码并加密传输
 * - 首次登录强制改密
 * - 多渠道安全通知
 */

import * as crypto from 'crypto'

// 账号类型
export type AccountType = 'admin' | 'manager' | 'operator' | 'viewer'

// 账号状态
export type AccountStatus = 'pending' | 'active' | 'password_reset_required' | 'locked' | 'disabled'

// 通知渠道
export type NotificationChannel = 'email' | 'sms' | 'secure_link'

// 用户账号
export interface UserAccount {
  id: string
  projectId: string
  email: string
  phone?: string
  type: AccountType
  status: AccountStatus
  displayName: string
  tempPassword?: string           // 临时密码（仅创建时使用）
  passwordHash?: string           // 加密后的密码
  mustChangePassword: boolean
  createdAt: Date
  lastLoginAt?: Date
  passwordChangedAt?: Date
  loginAttempts: number
  lockoutUntil?: Date
  notificationSent?: boolean      // 是否已发送通知
}

// 凭证信息
export interface CredentialInfo {
  accountId: string
  email: string
  tempPassword: string
  loginUrl: string
  expiresAt: Date               // 临时密码过期时间
  secureLink?: string           // 安全链接（一次性）
  qrCode?: string               // 二维码登录
}

// 通知记录
export interface NotificationRecord {
  id: string
  accountId: string
  channel: NotificationChannel
  sentAt: Date
  deliveredAt?: Date
  readAt?: Date
  content: string
  success: boolean
  error?: string
}

// 账号配置
export interface AccountConfig {
  email: string
  displayName: string
  type: AccountType
  phone?: string
  sendWelcomeEmail: boolean
  sendSms: boolean
  generateSecureLink: boolean
}

// 交付结果
export interface OnboardingResult {
  success: boolean
  accounts: UserAccount[]
  deliveredAt: Date
  productUrl: string
  adminUrl: string
  error?: string
}

// 账号类型权限
const ACCOUNT_TYPE_PERMISSIONS: Record<AccountType, string[]> = {
  admin: ['*'],  // 所有权限
  manager: ['read', 'write', 'delete', 'manage_users', 'view_analytics'],
  operator: ['read', 'write', 'delete'],
  viewer: ['read']
}

// 账号类型描述
const ACCOUNT_TYPE_CONFIG: Record<AccountType, { label: string; icon: string; description: string }> = {
  admin: {
    label: '超级管理员',
    icon: '👑',
    description: '拥有所有权限，可管理其他用户'
  },
  manager: {
    label: '管理员',
    icon: '👔',
    description: '可管理内容和查看数据分析'
  },
  operator: {
    label: '操作员',
    icon: '👷',
    description: '可进行日常内容管理'
  },
  viewer: {
    label: '查看者',
    icon: '👁️',
    description: '只能查看，不能修改'
  }
}

/**
 * 用户账号初始化服务
 */
export class UserOnboardingService {
  // 存储
  private accounts: Map<string, UserAccount> = new Map()
  private notifications: Map<string, NotificationRecord[]> = new Map()

  /**
   * 生成安全密码
   */
  generateSecurePassword(length: number = 16): string {
    const uppercase = 'ABCDEFGHJKLMNPQRSTUVWXYZ'
    const lowercase = 'abcdefghjkmnpqrstuvwxyz'
    const numbers = '23456789'
    const symbols = '!@#$%^&*'

    const allChars = uppercase + lowercase + numbers + symbols

    // 确保至少包含每种字符
    let password = ''
    password += uppercase.charAt(Math.floor(Math.random() * uppercase.length))
    password += lowercase.charAt(Math.floor(Math.random() * lowercase.length))
    password += numbers.charAt(Math.floor(Math.random() * numbers.length))
    password += symbols.charAt(Math.floor(Math.random() * symbols.length))

    // 填充剩余字符
    for (let i = password.length; i < length; i++) {
      password += allChars.charAt(Math.floor(Math.random() * allChars.length))
    }

    // 打乱顺序
    return password.split('').sort(() => Math.random() - 0.5).join('')
  }

  /**
   * 生成简单易记密码（用于初始密码）
   */
  generateFriendlyPassword(): string {
    const adjectives = ['Happy', 'Quick', 'Bright', 'Smart', 'Cool', 'Fresh']
    const nouns = ['Tiger', 'Eagle', 'Dragon', 'Phoenix', 'Lion', 'Bear']
    const numbers = Math.floor(Math.random() * 900) + 100

    const adj = adjectives[Math.floor(Math.random() * adjectives.length)]
    const noun = nouns[Math.floor(Math.random() * nouns.length)]

    return `${adj}${noun}${numbers}`
  }

  /**
   * 哈希密码
   */
  private hashPassword(password: string): string {
    const salt = crypto.randomBytes(16).toString('hex')
    const hash = crypto.pbkdf2Sync(password, salt, 10000, 64, 'sha512').toString('hex')
    return `${salt}:${hash}`
  }

  /**
   * 创建用户账号
   */
  async createAccount(
    projectId: string,
    config: AccountConfig
  ): Promise<{ account: UserAccount; credentials: CredentialInfo }> {
    const id = `acc_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
    const tempPassword = this.generateFriendlyPassword()
    const passwordHash = this.hashPassword(tempPassword)

    const account: UserAccount = {
      id,
      projectId,
      email: config.email,
      phone: config.phone,
      type: config.type,
      status: 'password_reset_required',
      displayName: config.displayName,
      tempPassword,  // 仅用于返回，不存储
      passwordHash,
      mustChangePassword: true,
      createdAt: new Date(),
      loginAttempts: 0
    }

    // 存储账号（不含明文密码）
    const storedAccount = { ...account }
    delete storedAccount.tempPassword
    this.accounts.set(id, storedAccount)

    // 生成凭证信息
    const credentials: CredentialInfo = {
      accountId: id,
      email: config.email,
      tempPassword,
      loginUrl: `https://thinkus.app/projects/${projectId}/admin/login`,
      expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000)  // 7天后过期
    }

    // 生成安全链接（如果需要）
    if (config.generateSecureLink) {
      credentials.secureLink = this.generateSecureLink(id)
    }

    // 发送通知
    if (config.sendWelcomeEmail) {
      await this.sendWelcomeEmail(account, credentials)
    }
    if (config.sendSms && config.phone) {
      await this.sendWelcomeSms(account, credentials)
    }

    return { account, credentials }
  }

  /**
   * 生成安全链接（一次性）
   */
  private generateSecureLink(accountId: string): string {
    const token = crypto.randomBytes(32).toString('hex')
    return `https://thinkus.app/auth/secure-login/${accountId}/${token}`
  }

  /**
   * 发送欢迎邮件
   */
  private async sendWelcomeEmail(account: UserAccount, credentials: CredentialInfo): Promise<void> {
    const notification: NotificationRecord = {
      id: `notif_${Date.now()}`,
      accountId: account.id,
      channel: 'email',
      sentAt: new Date(),
      content: this.generateWelcomeEmailContent(account, credentials),
      success: true
    }

    // 模拟发送
    await new Promise(resolve => setTimeout(resolve, 500))

    notification.deliveredAt = new Date()

    // 存储通知记录
    const records = this.notifications.get(account.id) || []
    records.push(notification)
    this.notifications.set(account.id, records)
  }

  /**
   * 发送欢迎短信
   */
  private async sendWelcomeSms(account: UserAccount, credentials: CredentialInfo): Promise<void> {
    const notification: NotificationRecord = {
      id: `notif_${Date.now()}`,
      accountId: account.id,
      channel: 'sms',
      sentAt: new Date(),
      content: `【Thinkus】您的账号已创建。用户名: ${credentials.email}，初始密码: ${credentials.tempPassword}，请登录后立即修改密码。`,
      success: true
    }

    // 模拟发送
    await new Promise(resolve => setTimeout(resolve, 500))

    notification.deliveredAt = new Date()

    const records = this.notifications.get(account.id) || []
    records.push(notification)
    this.notifications.set(account.id, records)
  }

  /**
   * 生成欢迎邮件内容
   */
  private generateWelcomeEmailContent(account: UserAccount, credentials: CredentialInfo): string {
    const typeConfig = ACCOUNT_TYPE_CONFIG[account.type]

    return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <style>
    body { font-family: system-ui, -apple-system, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px; }
    .header { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 30px; border-radius: 12px 12px 0 0; text-align: center; }
    .content { background: #fff; padding: 30px; border: 1px solid #eee; border-top: none; }
    .credentials { background: #f8f9fa; padding: 20px; border-radius: 8px; margin: 20px 0; border-left: 4px solid #667eea; }
    .warning { background: #fff3cd; padding: 15px; border-radius: 8px; margin: 20px 0; border-left: 4px solid #ffc107; }
    .button { display: inline-block; background: #667eea; color: white; padding: 12px 30px; border-radius: 6px; text-decoration: none; font-weight: bold; }
    .footer { text-align: center; color: #666; font-size: 14px; margin-top: 30px; padding-top: 20px; border-top: 1px solid #eee; }
    .badge { display: inline-block; background: #667eea; color: white; padding: 4px 12px; border-radius: 20px; font-size: 12px; }
  </style>
</head>
<body>
  <div class="header">
    <h1>🎉 欢迎加入！</h1>
    <p>您的账号已准备就绪</p>
  </div>
  <div class="content">
    <p>您好，${account.displayName}！</p>
    <p>恭喜！您的 <span class="badge">${typeConfig.icon} ${typeConfig.label}</span> 账号已创建成功。</p>

    <div class="credentials">
      <h3>🔑 登录信息</h3>
      <p><strong>登录地址:</strong> <a href="${credentials.loginUrl}">${credentials.loginUrl}</a></p>
      <p><strong>用户名:</strong> ${credentials.email}</p>
      <p><strong>初始密码:</strong> <code style="background: #e9ecef; padding: 2px 8px; border-radius: 4px;">${credentials.tempPassword}</code></p>
    </div>

    <div class="warning">
      <strong>⚠️ 安全提醒</strong>
      <p style="margin-bottom: 0;">请在首次登录后<strong>立即修改密码</strong>。初始密码将在 7 天后失效。</p>
    </div>

    <p style="text-align: center; margin: 30px 0;">
      <a href="${credentials.loginUrl}" class="button">立即登录</a>
    </p>

    ${credentials.secureLink ? `
    <p style="text-align: center; font-size: 14px; color: #666;">
      或使用<a href="${credentials.secureLink}">安全链接</a>一键登录（仅可使用一次）
    </p>
    ` : ''}

    <h3>🚀 开始使用</h3>
    <ol>
      <li>点击上方按钮登录系统</li>
      <li>首次登录后修改密码</li>
      <li>查看使用教程，了解系统功能</li>
      <li>开始您的工作！</li>
    </ol>

    <p>如有任何问题，请随时联系我们的客服团队。</p>
  </div>
  <div class="footer">
    <p>此邮件由系统自动发送，请勿直接回复。</p>
    <p>© ${new Date().getFullYear()} Thinkus. All rights reserved.</p>
  </div>
</body>
</html>
    `
  }

  /**
   * 批量创建账号
   */
  async createBatchAccounts(
    projectId: string,
    configs: AccountConfig[]
  ): Promise<Array<{ account: UserAccount; credentials: CredentialInfo }>> {
    const results: Array<{ account: UserAccount; credentials: CredentialInfo }> = []

    for (const config of configs) {
      const result = await this.createAccount(projectId, config)
      results.push(result)
    }

    return results
  }

  /**
   * 重置密码
   */
  async resetPassword(accountId: string): Promise<{ newPassword: string; notified: boolean }> {
    const account = this.accounts.get(accountId)
    if (!account) {
      throw new Error('账号不存在')
    }

    const newPassword = this.generateFriendlyPassword()
    account.passwordHash = this.hashPassword(newPassword)
    account.mustChangePassword = true
    account.status = 'password_reset_required'

    this.accounts.set(accountId, account)

    // 发送密码重置通知
    const credentials: CredentialInfo = {
      accountId: account.id,
      email: account.email,
      tempPassword: newPassword,
      loginUrl: `https://thinkus.app/projects/${account.projectId}/admin/login`,
      expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000)  // 24小时后过期
    }

    await this.sendPasswordResetEmail(account, credentials)

    return { newPassword, notified: true }
  }

  /**
   * 发送密码重置邮件
   */
  private async sendPasswordResetEmail(account: UserAccount, credentials: CredentialInfo): Promise<void> {
    const notification: NotificationRecord = {
      id: `notif_${Date.now()}`,
      accountId: account.id,
      channel: 'email',
      sentAt: new Date(),
      content: `密码已重置。新密码: ${credentials.tempPassword}`,
      success: true
    }

    await new Promise(resolve => setTimeout(resolve, 500))
    notification.deliveredAt = new Date()

    const records = this.notifications.get(account.id) || []
    records.push(notification)
    this.notifications.set(account.id, records)
  }

  /**
   * 发送欢迎通知（公开方法）
   */
  async sendWelcomeNotification(
    account: UserAccount,
    loginUrl: string,
    channel: NotificationChannel
  ): Promise<void> {
    const credentials: CredentialInfo = {
      accountId: account.id,
      email: account.email,
      tempPassword: account.tempPassword || '******',  // 如果没有临时密码，使用占位符
      loginUrl,
      expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000)
    }

    if (channel === 'email') {
      await this.sendWelcomeEmail(account, credentials)
    } else if (channel === 'sms' && account.phone) {
      await this.sendWelcomeSms(account, credentials)
    }

    // 记录通知
    const notification: NotificationRecord = {
      id: `notif_${Date.now()}`,
      accountId: account.id,
      channel,
      sentAt: new Date(),
      deliveredAt: new Date(),
      content: `账号凭证已发送到 ${channel === 'email' ? account.email : account.phone}`,
      success: true
    }

    const records = this.notifications.get(account.id) || []
    records.push(notification)
    this.notifications.set(account.id, records)
  }

  /**
   * 获取账号信息
   */
  getAccount(accountId: string): UserAccount | null {
    return this.accounts.get(accountId) || null
  }

  /**
   * 获取项目所有账号
   */
  getProjectAccounts(projectId: string): UserAccount[] {
    return Array.from(this.accounts.values())
      .filter(a => a.projectId === projectId)
  }

  /**
   * 获取通知记录
   */
  getNotificationHistory(accountId: string): NotificationRecord[] {
    return this.notifications.get(accountId) || []
  }

  /**
   * 获取账号类型配置
   */
  getAccountTypeConfig() {
    return ACCOUNT_TYPE_CONFIG
  }

  /**
   * 获取账号权限
   */
  getAccountPermissions(type: AccountType): string[] {
    return ACCOUNT_TYPE_PERMISSIONS[type]
  }

  /**
   * 生成凭证卡片（用于线下交付）
   */
  generateCredentialCard(credentials: CredentialInfo): string {
    return `
╔══════════════════════════════════════════╗
║         🔑 账号登录信息                    ║
╠══════════════════════════════════════════╣
║                                          ║
║  📧 用户名: ${credentials.email.padEnd(26)}║
║                                          ║
║  🔐 密码: ${credentials.tempPassword.padEnd(28)}║
║                                          ║
║  🌐 登录地址:                             ║
║     ${credentials.loginUrl.substring(0, 36).padEnd(36)}║
║                                          ║
╠══════════════════════════════════════════╣
║  ⚠️ 请在首次登录后立即修改密码！           ║
║  ⏰ 此密码将在 7 天后失效                  ║
╚══════════════════════════════════════════╝
    `.trim()
  }

  /**
   * 验证密码强度
   */
  validatePasswordStrength(password: string): {
    valid: boolean
    score: number
    suggestions: string[]
  } {
    const suggestions: string[] = []
    let score = 0

    // 长度检查
    if (password.length >= 8) score += 20
    else suggestions.push('密码至少需要 8 个字符')

    if (password.length >= 12) score += 10
    if (password.length >= 16) score += 10

    // 包含大写字母
    if (/[A-Z]/.test(password)) score += 15
    else suggestions.push('建议包含大写字母')

    // 包含小写字母
    if (/[a-z]/.test(password)) score += 15
    else suggestions.push('建议包含小写字母')

    // 包含数字
    if (/\d/.test(password)) score += 15
    else suggestions.push('建议包含数字')

    // 包含特殊字符
    if (/[!@#$%^&*(),.?":{}|<>]/.test(password)) score += 15
    else suggestions.push('建议包含特殊字符')

    return {
      valid: score >= 60,
      score,
      suggestions
    }
  }
}

// 导出单例
export const userOnboarding = new UserOnboardingService()
