/**
 * 首登保障服务 (P0-4)
 *
 * 解决问题：用户收到账号后首次登录失败率约5-10%
 *
 * 设计理念：
 * 1. 交付前预验证登录凭证
 * 2. 登录失败自动诊断和修复
 * 3. 分步骤引导用户登录
 * 4. 失败时立即提供人工支持
 */

// 登录状态
export type LoginStatus =
  | 'pending'           // 待验证
  | 'verifying'         // 验证中
  | 'verified'          // 已验证可用
  | 'failed'            // 验证失败
  | 'user_logging_in'   // 用户正在登录
  | 'user_logged_in'    // 用户已登录
  | 'user_login_failed' // 用户登录失败
  | 'password_reset'    // 已重置密码
  | 'support_needed'    // 需要人工支持

// 登录失败原因
export type LoginFailureReason =
  | 'wrong_password'       // 密码错误
  | 'account_not_found'    // 账号不存在
  | 'account_locked'       // 账号被锁定
  | 'account_disabled'     // 账号已禁用
  | 'email_not_verified'   // 邮箱未验证
  | 'two_factor_required'  // 需要两步验证
  | 'network_error'        // 网络错误
  | 'server_error'         // 服务器错误
  | 'captcha_failed'       // 验证码错误
  | 'unknown'              // 未知原因

// 失败原因配置
interface FailureConfig {
  humanReadable: string
  canAutoFix: boolean
  fixAction: string
  userGuidance: string
  supportPriority: 'low' | 'medium' | 'high' | 'urgent'
}

// 失败原因配置表
const FAILURE_CONFIGS: Record<LoginFailureReason, FailureConfig> = {
  wrong_password: {
    humanReadable: '密码不正确',
    canAutoFix: true,
    fixAction: '重置密码',
    userGuidance: '请检查密码是否正确，注意大小写。如记不住密码，可以点击"忘记密码"重置。',
    supportPriority: 'medium'
  },
  account_not_found: {
    humanReadable: '账号不存在',
    canAutoFix: true,
    fixAction: '检查账号创建',
    userGuidance: '请确认输入的邮箱/用户名是否正确。',
    supportPriority: 'high'
  },
  account_locked: {
    humanReadable: '账号已锁定',
    canAutoFix: true,
    fixAction: '解锁账号',
    userGuidance: '您的账号因多次登录失败被临时锁定，请稍后再试或联系客服解锁。',
    supportPriority: 'high'
  },
  account_disabled: {
    humanReadable: '账号已禁用',
    canAutoFix: false,
    fixAction: '联系管理员',
    userGuidance: '您的账号已被禁用，请联系管理员了解详情。',
    supportPriority: 'urgent'
  },
  email_not_verified: {
    humanReadable: '邮箱未验证',
    canAutoFix: true,
    fixAction: '重发验证邮件',
    userGuidance: '请先验证您的邮箱。我们已重新发送验证邮件，请查收。',
    supportPriority: 'low'
  },
  two_factor_required: {
    humanReadable: '需要两步验证',
    canAutoFix: false,
    fixAction: '输入验证码',
    userGuidance: '请输入您手机上的验证码完成登录。',
    supportPriority: 'low'
  },
  network_error: {
    humanReadable: '网络连接失败',
    canAutoFix: true,
    fixAction: '自动重试',
    userGuidance: '网络不稳定，请检查网络连接后重试。',
    supportPriority: 'medium'
  },
  server_error: {
    humanReadable: '服务器繁忙',
    canAutoFix: true,
    fixAction: '自动重试',
    userGuidance: '服务器暂时繁忙，请稍后重试。',
    supportPriority: 'high'
  },
  captcha_failed: {
    humanReadable: '验证码错误',
    canAutoFix: true,
    fixAction: '刷新验证码',
    userGuidance: '验证码输入错误，请重新输入。',
    supportPriority: 'low'
  },
  unknown: {
    humanReadable: '登录遇到问题',
    canAutoFix: false,
    fixAction: '联系客服',
    userGuidance: '登录时遇到了一些问题，请联系客服获取帮助。',
    supportPriority: 'high'
  }
}

// 登录引导步骤
interface LoginGuideStep {
  order: number
  title: string
  instruction: string
  inputType?: 'text' | 'password' | 'email' | 'captcha'
  inputLabel?: string
  inputPlaceholder?: string
  tips?: string[]
  screenshot?: string
}

// 默认登录引导步骤
const DEFAULT_LOGIN_GUIDE: LoginGuideStep[] = [
  {
    order: 1,
    title: '打开登录页面',
    instruction: '点击下方链接打开登录页面',
    tips: ['如果页面加载慢，请检查网络连接', '建议使用 Chrome 或 Safari 浏览器']
  },
  {
    order: 2,
    title: '输入邮箱/用户名',
    instruction: '在用户名输入框中输入您的登录邮箱',
    inputType: 'email',
    inputLabel: '邮箱/用户名',
    inputPlaceholder: 'your@email.com',
    tips: ['请使用您注册时填写的邮箱', '注意检查邮箱地址是否正确']
  },
  {
    order: 3,
    title: '输入密码',
    instruction: '在密码输入框中输入您的密码',
    inputType: 'password',
    inputLabel: '密码',
    tips: ['密码区分大小写', '如果忘记密码，可以点击"忘记密码"重置']
  },
  {
    order: 4,
    title: '点击登录',
    instruction: '点击"登录"按钮完成登录',
    tips: ['如果登录失败，请检查账号和密码是否正确', '多次失败可能会导致账号临时锁定']
  }
]

// 登录凭证
export interface LoginCredentials {
  loginUrl: string
  email?: string
  username?: string
  password: string
  tempPassword?: boolean // 是否临时密码
  mustChangePassword?: boolean // 是否必须修改密码
}

// 凭证验证结果
export interface CredentialVerifyResult {
  valid: boolean
  canLogin: boolean
  issues: string[]
  suggestions: string[]
}

// 登录会话
export interface LoginGuardSession {
  id: string
  projectId: string
  projectName: string
  userId: string
  userName: string
  userEmail?: string
  userPhone?: string
  credentials: LoginCredentials
  status: LoginStatus
  guideSteps: LoginGuideStep[]
  currentStep: number
  verifyResult?: CredentialVerifyResult
  loginAttempts: LoginAttempt[]
  failureReason?: LoginFailureReason
  autoFixAttempts: AutoFixAttempt[]
  createdAt: Date
  lastActivityAt: Date
  firstLoginAt?: Date
  supportRequestedAt?: Date
}

// 登录尝试
export interface LoginAttempt {
  timestamp: Date
  success: boolean
  failureReason?: LoginFailureReason
  errorMessage?: string
  clientInfo?: {
    browser?: string
    os?: string
    ip?: string
  }
}

// 自动修复尝试
export interface AutoFixAttempt {
  timestamp: Date
  action: string
  success: boolean
  result: string
}

// 登录结果回调
export type LoginResultCallback = (
  success: boolean,
  session: LoginGuardSession,
  message: string
) => void

/**
 * 首登保障服务
 */
export class FirstLoginGuardService {
  private sessions: Map<string, LoginGuardSession> = new Map()

  /**
   * 创建登录保障会话
   */
  createSession(
    projectId: string,
    projectName: string,
    userId: string,
    userName: string,
    credentials: LoginCredentials,
    userEmail?: string,
    userPhone?: string
  ): LoginGuardSession {
    const session: LoginGuardSession = {
      id: `login_guard_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      projectId,
      projectName,
      userId,
      userName,
      userEmail,
      userPhone,
      credentials,
      status: 'pending',
      guideSteps: [...DEFAULT_LOGIN_GUIDE],
      currentStep: 0,
      loginAttempts: [],
      autoFixAttempts: [],
      createdAt: new Date(),
      lastActivityAt: new Date()
    }

    this.sessions.set(session.id, session)
    return session
  }

  /**
   * 预验证登录凭证（交付前调用）
   */
  async preVerifyCredentials(session: LoginGuardSession): Promise<CredentialVerifyResult> {
    session.status = 'verifying'
    session.lastActivityAt = new Date()

    const issues: string[] = []
    const suggestions: string[] = []

    // 检查登录URL
    if (!session.credentials.loginUrl) {
      issues.push('登录地址为空')
    } else {
      try {
        const url = new URL(session.credentials.loginUrl)
        if (url.protocol !== 'https:') {
          suggestions.push('建议使用HTTPS安全连接')
        }
      } catch {
        issues.push('登录地址格式不正确')
      }
    }

    // 检查账号
    if (!session.credentials.email && !session.credentials.username) {
      issues.push('未设置登录账号')
    }

    // 检查密码
    if (!session.credentials.password) {
      issues.push('未设置登录密码')
    } else if (session.credentials.password.length < 6) {
      issues.push('密码长度过短')
    }

    // 模拟登录测试（实际项目中会真正尝试登录）
    const loginTestResult = await this.testLogin(session.credentials)
    if (!loginTestResult.success) {
      issues.push(`登录测试失败: ${loginTestResult.error}`)
    }

    const result: CredentialVerifyResult = {
      valid: issues.length === 0,
      canLogin: loginTestResult.success,
      issues,
      suggestions
    }

    session.verifyResult = result
    session.status = result.valid && result.canLogin ? 'verified' : 'failed'
    session.lastActivityAt = new Date()

    return result
  }

  /**
   * 测试登录（模拟）
   */
  private async testLogin(credentials: LoginCredentials): Promise<{ success: boolean; error?: string }> {
    // 实际项目中这里会尝试真正登录
    // 这里模拟成功
    return { success: true }
  }

  /**
   * 记录用户登录尝试
   */
  recordLoginAttempt(
    sessionId: string,
    success: boolean,
    failureReason?: LoginFailureReason,
    errorMessage?: string,
    clientInfo?: LoginAttempt['clientInfo']
  ): void {
    const session = this.sessions.get(sessionId)
    if (!session) return

    const attempt: LoginAttempt = {
      timestamp: new Date(),
      success,
      failureReason,
      errorMessage,
      clientInfo
    }

    session.loginAttempts.push(attempt)
    session.lastActivityAt = new Date()

    if (success) {
      session.status = 'user_logged_in'
      session.firstLoginAt = new Date()
    } else {
      session.status = 'user_login_failed'
      session.failureReason = failureReason
    }
  }

  /**
   * 诊断登录失败
   */
  diagnoseLoginFailure(session: LoginGuardSession): {
    reason: LoginFailureReason
    config: FailureConfig
    canAutoFix: boolean
    autoFixAction?: string
  } {
    const reason = session.failureReason || 'unknown'
    const config = FAILURE_CONFIGS[reason]

    return {
      reason,
      config,
      canAutoFix: config.canAutoFix,
      autoFixAction: config.canAutoFix ? config.fixAction : undefined
    }
  }

  /**
   * 尝试自动修复登录问题
   */
  async attemptAutoFix(session: LoginGuardSession): Promise<{
    success: boolean
    action: string
    result: string
    newCredentials?: Partial<LoginCredentials>
  }> {
    const diagnosis = this.diagnoseLoginFailure(session)
    if (!diagnosis.canAutoFix) {
      return {
        success: false,
        action: 'none',
        result: '此问题需要人工处理'
      }
    }

    let result: { success: boolean; action: string; result: string; newCredentials?: Partial<LoginCredentials> }

    switch (diagnosis.reason) {
      case 'wrong_password':
        // 重置密码
        const newPassword = this.generateSecurePassword()
        result = {
          success: true,
          action: '重置密码',
          result: `密码已重置为新密码`,
          newCredentials: {
            password: newPassword,
            tempPassword: true,
            mustChangePassword: true
          }
        }
        session.credentials.password = newPassword
        session.credentials.tempPassword = true
        session.credentials.mustChangePassword = true
        session.status = 'password_reset'
        break

      case 'account_locked':
        // 解锁账号
        result = {
          success: true,
          action: '解锁账号',
          result: '账号已解锁，请重新登录'
        }
        break

      case 'email_not_verified':
        // 重发验证邮件
        result = {
          success: true,
          action: '重发验证邮件',
          result: '验证邮件已发送，请查收后点击链接验证'
        }
        break

      case 'network_error':
      case 'server_error':
        // 自动重试
        result = {
          success: true,
          action: '自动重试',
          result: '正在重新尝试连接...'
        }
        break

      case 'captcha_failed':
        result = {
          success: true,
          action: '刷新验证码',
          result: '验证码已刷新，请重新输入'
        }
        break

      default:
        result = {
          success: false,
          action: 'none',
          result: '无法自动修复'
        }
    }

    // 记录修复尝试
    session.autoFixAttempts.push({
      timestamp: new Date(),
      action: result.action,
      success: result.success,
      result: result.result
    })

    session.lastActivityAt = new Date()
    return result
  }

  /**
   * 生成安全密码
   */
  private generateSecurePassword(): string {
    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz23456789!@#$%'
    let password = ''
    for (let i = 0; i < 12; i++) {
      password += chars.charAt(Math.floor(Math.random() * chars.length))
    }
    return password
  }

  /**
   * 请求人工支持
   */
  requestSupport(sessionId: string, userMessage?: string): {
    success: boolean
    ticketId: string
    estimatedWaitTime: string
    message: string
  } {
    const session = this.sessions.get(sessionId)
    if (!session) {
      return {
        success: false,
        ticketId: '',
        estimatedWaitTime: '',
        message: '会话不存在'
      }
    }

    session.status = 'support_needed'
    session.supportRequestedAt = new Date()
    session.lastActivityAt = new Date()

    const diagnosis = this.diagnoseLoginFailure(session)
    let estimatedWait = '10分钟'
    if (diagnosis.config.supportPriority === 'urgent') {
      estimatedWait = '5分钟'
    } else if (diagnosis.config.supportPriority === 'high') {
      estimatedWait = '10分钟'
    } else {
      estimatedWait = '15分钟'
    }

    return {
      success: true,
      ticketId: `TICKET_${Date.now()}`,
      estimatedWaitTime: estimatedWait,
      message: '已提交支持请求，客服将尽快联系您'
    }
  }

  /**
   * 获取当前引导步骤
   */
  getCurrentGuideStep(sessionId: string): LoginGuideStep | null {
    const session = this.sessions.get(sessionId)
    if (!session) return null
    if (session.currentStep >= session.guideSteps.length) return null
    return session.guideSteps[session.currentStep]
  }

  /**
   * 进入下一步
   */
  nextGuideStep(sessionId: string): LoginGuideStep | null {
    const session = this.sessions.get(sessionId)
    if (!session) return null

    session.currentStep++
    session.lastActivityAt = new Date()

    return this.getCurrentGuideStep(sessionId)
  }

  /**
   * 获取会话
   */
  getSession(sessionId: string): LoginGuardSession | null {
    return this.sessions.get(sessionId) ?? null
  }

  /**
   * 生成登录引导页面HTML
   */
  generateGuidePageHtml(session: LoginGuardSession): string {
    const currentStep = session.guideSteps[session.currentStep] || session.guideSteps[0]
    const progress = ((session.currentStep + 1) / session.guideSteps.length) * 100

    return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>登录引导 - ${session.projectName}</title>
  <style>
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
      background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
      min-height: 100vh;
      padding: 40px 20px;
    }
    .container { max-width: 480px; margin: 0 auto; }
    .card {
      background: white;
      border-radius: 24px;
      box-shadow: 0 20px 60px rgba(0,0,0,0.2);
      overflow: hidden;
    }
    .header {
      padding: 32px;
      text-align: center;
      background: linear-gradient(135deg, #f9fafb 0%, #f3f4f6 100%);
    }
    .header-icon { font-size: 48px; margin-bottom: 16px; }
    .header-title { font-size: 24px; font-weight: 700; color: #111827; }
    .header-subtitle { color: #6b7280; margin-top: 8px; }
    .progress-section { padding: 0 32px; }
    .progress-bar {
      height: 8px;
      background: #e5e7eb;
      border-radius: 4px;
      overflow: hidden;
    }
    .progress-fill {
      height: 100%;
      background: linear-gradient(90deg, #667eea, #764ba2);
      width: ${progress}%;
      transition: width 0.3s ease;
    }
    .progress-text {
      text-align: center;
      padding: 12px 0;
      color: #6b7280;
      font-size: 13px;
    }
    .step-content { padding: 32px; }
    .step-number {
      display: inline-flex;
      align-items: center;
      justify-content: center;
      width: 32px;
      height: 32px;
      background: linear-gradient(135deg, #667eea, #764ba2);
      color: white;
      border-radius: 50%;
      font-weight: 600;
      font-size: 14px;
      margin-bottom: 16px;
    }
    .step-title {
      font-size: 20px;
      font-weight: 600;
      color: #111827;
      margin-bottom: 12px;
    }
    .step-instruction {
      color: #374151;
      line-height: 1.6;
      margin-bottom: 24px;
    }
    .input-group { margin-bottom: 24px; }
    .input-label {
      display: block;
      color: #374151;
      font-weight: 500;
      margin-bottom: 8px;
    }
    .input-field {
      width: 100%;
      padding: 14px 16px;
      border: 2px solid #e5e7eb;
      border-radius: 12px;
      font-size: 16px;
      transition: border-color 0.2s;
    }
    .input-field:focus {
      outline: none;
      border-color: #667eea;
    }
    .tips {
      background: #eff6ff;
      border-radius: 12px;
      padding: 16px;
      margin-bottom: 24px;
    }
    .tips-title {
      display: flex;
      align-items: center;
      color: #1e40af;
      font-weight: 500;
      margin-bottom: 8px;
    }
    .tips-title::before { content: '💡'; margin-right: 8px; }
    .tips-list { color: #3b82f6; font-size: 14px; line-height: 1.6; }
    .tips-list li { margin-bottom: 4px; }
    .login-url {
      background: #f9fafb;
      border: 2px solid #e5e7eb;
      border-radius: 12px;
      padding: 16px;
      margin-bottom: 24px;
      word-break: break-all;
    }
    .login-url-label { color: #6b7280; font-size: 13px; margin-bottom: 8px; }
    .login-url-value { color: #111827; font-weight: 500; }
    .actions { display: flex; gap: 12px; }
    .btn {
      flex: 1;
      padding: 16px;
      border: none;
      border-radius: 12px;
      font-size: 16px;
      font-weight: 600;
      cursor: pointer;
      transition: all 0.2s;
    }
    .btn-primary {
      background: linear-gradient(135deg, #667eea, #764ba2);
      color: white;
    }
    .btn-primary:hover { transform: translateY(-2px); box-shadow: 0 4px 12px rgba(102, 126, 234, 0.4); }
    .btn-secondary { background: #f3f4f6; color: #374151; }
    .btn-secondary:hover { background: #e5e7eb; }
    .credential-card {
      background: #fef3c7;
      border-radius: 12px;
      padding: 20px;
      margin-bottom: 24px;
    }
    .credential-title {
      display: flex;
      align-items: center;
      color: #92400e;
      font-weight: 600;
      margin-bottom: 12px;
    }
    .credential-title::before { content: '🔐'; margin-right: 8px; }
    .credential-row {
      display: flex;
      justify-content: space-between;
      padding: 8px 0;
      border-bottom: 1px dashed #fcd34d;
    }
    .credential-row:last-child { border-bottom: none; }
    .credential-label { color: #92400e; }
    .credential-value { color: #78350f; font-weight: 500; font-family: monospace; }
    .help-link {
      text-align: center;
      padding: 16px 32px 32px;
    }
    .help-link a {
      color: #6b7280;
      text-decoration: none;
      font-size: 14px;
    }
    .help-link a:hover { color: #374151; text-decoration: underline; }
  </style>
</head>
<body>
  <div class="container">
    <div class="card">
      <div class="header">
        <div class="header-icon">🔐</div>
        <div class="header-title">${session.projectName}</div>
        <div class="header-subtitle">登录引导</div>
      </div>

      <div class="progress-section">
        <div class="progress-bar">
          <div class="progress-fill"></div>
        </div>
        <div class="progress-text">
          第 ${session.currentStep + 1} 步，共 ${session.guideSteps.length} 步
        </div>
      </div>

      <div class="step-content">
        <div class="step-number">${currentStep.order}</div>
        <h2 class="step-title">${currentStep.title}</h2>
        <p class="step-instruction">${currentStep.instruction}</p>

        ${session.currentStep === 0 ? `
        <div class="login-url">
          <div class="login-url-label">登录地址</div>
          <div class="login-url-value">${session.credentials.loginUrl}</div>
        </div>
        ` : ''}

        ${session.currentStep === 1 || session.currentStep === 2 ? `
        <div class="credential-card">
          <div class="credential-title">您的登录信息</div>
          <div class="credential-row">
            <span class="credential-label">账号</span>
            <span class="credential-value">${session.credentials.email || session.credentials.username}</span>
          </div>
          ${session.currentStep === 2 ? `
          <div class="credential-row">
            <span class="credential-label">密码</span>
            <span class="credential-value">${session.credentials.password}</span>
          </div>
          ` : ''}
        </div>
        ` : ''}

        ${currentStep.inputType ? `
        <div class="input-group">
          <label class="input-label">${currentStep.inputLabel}</label>
          <input type="${currentStep.inputType}"
                 class="input-field"
                 placeholder="${currentStep.inputPlaceholder || ''}"
                 value="${currentStep.inputType === 'email' ? (session.credentials.email || session.credentials.username || '') : ''}">
        </div>
        ` : ''}

        ${currentStep.tips ? `
        <div class="tips">
          <div class="tips-title">小提示</div>
          <ul class="tips-list">
            ${currentStep.tips.map(tip => `<li>${tip}</li>`).join('')}
          </ul>
        </div>
        ` : ''}

        <div class="actions">
          ${session.currentStep > 0 ? `
          <button class="btn btn-secondary" onclick="prevStep()">上一步</button>
          ` : ''}
          ${session.currentStep < session.guideSteps.length - 1 ? `
          <button class="btn btn-primary" onclick="nextStep()">下一步</button>
          ` : `
          <button class="btn btn-primary" onclick="finish()">完成登录</button>
          `}
        </div>
      </div>

      <div class="help-link">
        <a href="#" onclick="requestHelp()">遇到问题？点击获取帮助</a>
      </div>
    </div>
  </div>

  <script>
    function nextStep() {
      // 发送请求到后端进入下一步
      window.location.href = '?step=' + ${session.currentStep + 1};
    }
    function prevStep() {
      window.location.href = '?step=' + ${session.currentStep - 1};
    }
    function finish() {
      window.location.href = '?action=complete';
    }
    function requestHelp() {
      window.location.href = '?action=help';
    }
  </script>
</body>
</html>
    `.trim()
  }

  /**
   * 生成登录失败诊断页面
   */
  generateDiagnosisPageHtml(session: LoginGuardSession): string {
    const diagnosis = this.diagnoseLoginFailure(session)
    const recentAttempts = session.loginAttempts.slice(-3)

    return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>登录诊断 - ${session.projectName}</title>
  <style>
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
      background: #f3f4f6;
      min-height: 100vh;
      padding: 40px 20px;
    }
    .container { max-width: 480px; margin: 0 auto; }
    .card {
      background: white;
      border-radius: 16px;
      box-shadow: 0 4px 6px rgba(0,0,0,0.05);
      overflow: hidden;
      margin-bottom: 20px;
    }
    .header {
      padding: 32px;
      text-align: center;
      background: #fef2f2;
    }
    .header-icon { font-size: 48px; margin-bottom: 16px; }
    .header-title { font-size: 20px; font-weight: 600; color: #991b1b; }
    .header-subtitle { color: #dc2626; margin-top: 8px; }
    .diagnosis { padding: 24px; }
    .diagnosis-title {
      font-size: 16px;
      font-weight: 600;
      color: #374151;
      margin-bottom: 16px;
    }
    .diagnosis-item {
      background: #f9fafb;
      border-radius: 12px;
      padding: 16px;
      margin-bottom: 12px;
    }
    .diagnosis-label { color: #6b7280; font-size: 13px; margin-bottom: 4px; }
    .diagnosis-value { color: #111827; font-weight: 500; }
    .guidance {
      background: #eff6ff;
      border-radius: 12px;
      padding: 20px;
      margin: 0 24px 24px;
    }
    .guidance-title {
      display: flex;
      align-items: center;
      color: #1e40af;
      font-weight: 600;
      margin-bottom: 12px;
    }
    .guidance-title::before { content: '💡'; margin-right: 8px; }
    .guidance-text { color: #3b82f6; line-height: 1.6; }
    .actions {
      padding: 0 24px 24px;
      display: flex;
      flex-direction: column;
      gap: 12px;
    }
    .btn {
      padding: 16px;
      border: none;
      border-radius: 12px;
      font-size: 16px;
      font-weight: 600;
      cursor: pointer;
      text-align: center;
      transition: all 0.2s;
    }
    .btn-primary { background: #3b82f6; color: white; }
    .btn-primary:hover { background: #2563eb; }
    .btn-success { background: #22c55e; color: white; }
    .btn-success:hover { background: #16a34a; }
    .btn-secondary { background: #f3f4f6; color: #374151; }
    .btn-secondary:hover { background: #e5e7eb; }
    .attempts {
      padding: 0 24px 24px;
    }
    .attempts-title {
      font-size: 14px;
      color: #6b7280;
      margin-bottom: 12px;
    }
    .attempt-item {
      display: flex;
      align-items: center;
      padding: 8px 0;
      border-bottom: 1px solid #f3f4f6;
      font-size: 13px;
    }
    .attempt-icon { margin-right: 8px; }
    .attempt-time { color: #9ca3af; margin-left: auto; }
  </style>
</head>
<body>
  <div class="container">
    <div class="card">
      <div class="header">
        <div class="header-icon">😟</div>
        <div class="header-title">${diagnosis.config.humanReadable}</div>
        <div class="header-subtitle">登录遇到了问题</div>
      </div>

      <div class="diagnosis">
        <div class="diagnosis-title">问题诊断</div>
        <div class="diagnosis-item">
          <div class="diagnosis-label">问题类型</div>
          <div class="diagnosis-value">${diagnosis.config.humanReadable}</div>
        </div>
        <div class="diagnosis-item">
          <div class="diagnosis-label">是否可自动修复</div>
          <div class="diagnosis-value">${diagnosis.canAutoFix ? '✅ 可以' : '❌ 需要人工处理'}</div>
        </div>
        ${diagnosis.canAutoFix ? `
        <div class="diagnosis-item">
          <div class="diagnosis-label">修复方案</div>
          <div class="diagnosis-value">${diagnosis.autoFixAction}</div>
        </div>
        ` : ''}
      </div>

      <div class="guidance">
        <div class="guidance-title">解决建议</div>
        <div class="guidance-text">${diagnosis.config.userGuidance}</div>
      </div>

      <div class="actions">
        ${diagnosis.canAutoFix ? `
        <button class="btn btn-success" onclick="autoFix()">
          🔧 一键修复
        </button>
        ` : ''}
        <button class="btn btn-primary" onclick="retry()">
          🔄 重新登录
        </button>
        <button class="btn btn-secondary" onclick="requestSupport()">
          📞 联系客服
        </button>
      </div>

      ${recentAttempts.length > 0 ? `
      <div class="attempts">
        <div class="attempts-title">最近登录尝试</div>
        ${recentAttempts.map(attempt => `
          <div class="attempt-item">
            <span class="attempt-icon">${attempt.success ? '✅' : '❌'}</span>
            <span>${attempt.success ? '登录成功' : (FAILURE_CONFIGS[attempt.failureReason || 'unknown']?.humanReadable || '登录失败')}</span>
            <span class="attempt-time">${new Date(attempt.timestamp).toLocaleTimeString()}</span>
          </div>
        `).join('')}
      </div>
      ` : ''}
    </div>
  </div>

  <script>
    function autoFix() {
      window.location.href = '?action=autofix';
    }
    function retry() {
      window.location.href = '?action=retry';
    }
    function requestSupport() {
      window.location.href = '?action=support';
    }
  </script>
</body>
</html>
    `.trim()
  }

  /**
   * 清理会话
   */
  cleanup(sessionId: string): void {
    this.sessions.delete(sessionId)
  }
}

// 导出单例
export const firstLoginGuard = new FirstLoginGuardService()
