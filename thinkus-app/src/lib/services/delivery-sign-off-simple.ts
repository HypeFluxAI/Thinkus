/**
 * 傻瓜式签收服务
 *
 * 功能：
 * - 让小白用户轻松完成产品签收
 * - 复杂法律条款 → 简单确认
 * - 技术验收 → 看得懂的问答
 * - 一个大按钮完成签收
 *
 * 核心理念：
 * - 用户不需要阅读长篇大论
 * - 用户只需要点击"我收到了，很满意"
 * - 签收后用户知道下一步该做什么
 */

// ============================================
// 类型定义
// ============================================

/** 签收状态 */
export type SignOffStatus =
  | 'pending'          // 待签收
  | 'reviewing'        // 用户查看中
  | 'signed'           // 已签收
  | 'signed_with_notes'// 有备注的签收
  | 'rejected'         // 拒绝签收
  | 'expired'          // 已过期

/** 签收方式 */
export type SignOffMethod =
  | 'one_click'        // 一键签收
  | 'step_by_step'     // 分步确认
  | 'with_checklist'   // 带检查清单

/** 简化确认项 */
export interface SimpleConfirmItem {
  id: string
  question: string          // 简单问题，如"网站能打开吗？"
  icon: string
  required: boolean
  answer?: 'yes' | 'no' | 'skip'
  note?: string             // 用户备注
}

/** 签收会话 */
export interface SignOffSession {
  sessionId: string
  projectId: string
  projectName: string
  clientName: string
  clientEmail: string

  // 状态
  status: SignOffStatus
  method: SignOffMethod
  startedAt?: Date
  completedAt?: Date
  expiresAt: Date

  // 产品信息
  productUrl: string
  adminUrl: string
  hasCredentials: boolean

  // 确认项
  confirmItems: SimpleConfirmItem[]
  confirmProgress: number    // 0-100

  // 签收结果
  signedBy?: string
  signedAt?: Date
  signature?: string         // 简单签名（名字或"确认"）
  overallSatisfaction?: 'very_satisfied' | 'satisfied' | 'neutral' | 'unsatisfied'
  feedback?: string
}

/** 签收结果 */
export interface SignOffResult {
  success: boolean
  sessionId: string
  signedAt: Date

  // 证书
  certificateId: string
  certificateUrl: string

  // 下一步
  nextSteps: {
    step: number
    title: string
    description: string
    actionUrl?: string
    actionText?: string
  }[]

  // 欢迎消息
  welcomeMessage: string
}

// ============================================
// 默认确认项配置
// ============================================

const DEFAULT_CONFIRM_ITEMS: Omit<SimpleConfirmItem, 'id' | 'answer'>[] = [
  {
    question: '网站能正常打开吗？',
    icon: '🌐',
    required: true
  },
  {
    question: '能用账号登录进去吗？',
    icon: '🔑',
    required: true
  },
  {
    question: '主要功能能用吗？',
    icon: '⚙️',
    required: true
  },
  {
    question: '手机上看着还行吗？',
    icon: '📱',
    required: false
  },
  {
    question: '整体感觉满意吗？',
    icon: '😊',
    required: false
  }
]

/** 满意度选项 */
const SATISFACTION_OPTIONS = [
  { value: 'very_satisfied', label: '非常满意', icon: '😍', color: '#10B981' },
  { value: 'satisfied', label: '满意', icon: '😊', color: '#3B82F6' },
  { value: 'neutral', label: '一般', icon: '😐', color: '#F59E0B' },
  { value: 'unsatisfied', label: '不太满意', icon: '😟', color: '#EF4444' }
]

// ============================================
// 服务实现
// ============================================

export class DeliverySignOffSimpleService {

  /**
   * 创建签收会话
   */
  async createSession(params: {
    projectId: string
    projectName: string
    clientName: string
    clientEmail: string
    productUrl: string
    adminUrl: string
    hasCredentials?: boolean
    method?: SignOffMethod
    expirationDays?: number
  }): Promise<SignOffSession> {
    const {
      projectId,
      projectName,
      clientName,
      clientEmail,
      productUrl,
      adminUrl,
      hasCredentials = true,
      method = 'one_click',
      expirationDays = 7
    } = params

    const sessionId = `signoff_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`

    // 生成确认项
    const confirmItems: SimpleConfirmItem[] = DEFAULT_CONFIRM_ITEMS.map((item, index) => ({
      ...item,
      id: `confirm_${index}`
    }))

    const session: SignOffSession = {
      sessionId,
      projectId,
      projectName,
      clientName,
      clientEmail,

      status: 'pending',
      method,
      expiresAt: new Date(Date.now() + expirationDays * 24 * 60 * 60 * 1000),

      productUrl,
      adminUrl,
      hasCredentials,

      confirmItems,
      confirmProgress: 0
    }

    // 这里应该存储到数据库
    // await db.signOffSessions.create(session)

    return session
  }

  /**
   * 开始签收流程
   */
  async startReview(sessionId: string): Promise<SignOffSession> {
    // 从数据库获取会话
    // const session = await db.signOffSessions.findById(sessionId)

    // 模拟更新状态
    const session = {
      sessionId,
      status: 'reviewing' as const,
      startedAt: new Date()
    } as SignOffSession

    return session
  }

  /**
   * 一键签收（最简单的方式）
   */
  async oneClickSignOff(params: {
    sessionId: string
    clientName: string
    satisfaction?: 'very_satisfied' | 'satisfied' | 'neutral' | 'unsatisfied'
    feedback?: string
  }): Promise<SignOffResult> {
    const { sessionId, clientName, satisfaction = 'satisfied', feedback } = params

    const signedAt = new Date()
    const certificateId = `cert_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`

    // 更新会话状态
    // await db.signOffSessions.update(sessionId, {
    //   status: 'signed',
    //   signedBy: clientName,
    //   signedAt,
    //   overallSatisfaction: satisfaction,
    //   feedback
    // })

    return {
      success: true,
      sessionId,
      signedAt,
      certificateId,
      certificateUrl: `/certificates/${certificateId}`,
      nextSteps: this.generateNextSteps(),
      welcomeMessage: this.generateWelcomeMessage(clientName)
    }
  }

  /**
   * 分步确认签收
   */
  async confirmItem(params: {
    sessionId: string
    itemId: string
    answer: 'yes' | 'no' | 'skip'
    note?: string
  }): Promise<{ session: SignOffSession; canComplete: boolean }> {
    const { sessionId, itemId, answer, note } = params

    // 更新确认项
    // const session = await db.signOffSessions.findById(sessionId)
    // session.confirmItems = session.confirmItems.map(item =>
    //   item.id === itemId ? { ...item, answer, note } : item
    // )

    // 计算进度
    // const answeredCount = session.confirmItems.filter(i => i.answer).length
    // session.confirmProgress = Math.round((answeredCount / session.confirmItems.length) * 100)

    // 检查是否可以完成
    // const canComplete = session.confirmItems
    //   .filter(i => i.required)
    //   .every(i => i.answer === 'yes')

    // 模拟返回
    return {
      session: {} as SignOffSession,
      canComplete: answer === 'yes'
    }
  }

  /**
   * 完成签收（分步确认后）
   */
  async completeSignOff(params: {
    sessionId: string
    clientName: string
    signature?: string          // 简单签名，可以是名字
    satisfaction?: 'very_satisfied' | 'satisfied' | 'neutral' | 'unsatisfied'
    feedback?: string
  }): Promise<SignOffResult> {
    const {
      sessionId,
      clientName,
      signature = clientName,
      satisfaction = 'satisfied',
      feedback
    } = params

    const signedAt = new Date()
    const certificateId = `cert_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`

    // 更新会话
    // await db.signOffSessions.update(sessionId, {
    //   status: 'signed',
    //   signedBy: clientName,
    //   signedAt,
    //   signature,
    //   overallSatisfaction: satisfaction,
    //   feedback
    // })

    return {
      success: true,
      sessionId,
      signedAt,
      certificateId,
      certificateUrl: `/certificates/${certificateId}`,
      nextSteps: this.generateNextSteps(),
      welcomeMessage: this.generateWelcomeMessage(clientName)
    }
  }

  /**
   * 报告问题（不签收）
   */
  async reportIssue(params: {
    sessionId: string
    issue: string
    screenshots?: string[]
  }): Promise<{ ticketId: string; message: string }> {
    const ticketId = `issue_${Date.now()}`

    // 创建问题工单
    // await supportTicketSystem.create(...)

    return {
      ticketId,
      message: '我们已收到您的反馈，客服会在1小时内联系您'
    }
  }

  /**
   * 生成签收页面HTML
   */
  generateSignOffPageHtml(session: SignOffSession): string {
    const satisfactionOptionsHtml = SATISFACTION_OPTIONS.map(opt => `
      <button type="button" class="satisfaction-btn" data-value="${opt.value}" style="--btn-color: ${opt.color}">
        <span class="satisfaction-icon">${opt.icon}</span>
        <span class="satisfaction-label">${opt.label}</span>
      </button>
    `).join('')

    return `<!DOCTYPE html>
<html lang="zh-CN">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>产品签收 - ${session.projectName}</title>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
      background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
      min-height: 100vh;
      padding: 20px;
    }
    .container {
      max-width: 500px;
      margin: 0 auto;
    }

    /* 欢迎卡片 */
    .welcome-card {
      background: white;
      border-radius: 24px;
      padding: 40px 32px;
      text-align: center;
      margin-bottom: 20px;
      box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.25);
    }
    .welcome-icon { font-size: 64px; margin-bottom: 16px; }
    .welcome-title {
      font-size: 28px;
      font-weight: 700;
      color: #1F2937;
      margin-bottom: 8px;
    }
    .welcome-subtitle {
      font-size: 16px;
      color: #6B7280;
      margin-bottom: 24px;
    }
    .project-name {
      display: inline-block;
      background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
      -webkit-background-clip: text;
      -webkit-text-fill-color: transparent;
      font-size: 20px;
      font-weight: 600;
    }

    /* 产品链接 */
    .product-links {
      background: #F3F4F6;
      border-radius: 12px;
      padding: 20px;
      margin-bottom: 24px;
    }
    .link-item {
      display: flex;
      align-items: center;
      gap: 12px;
      padding: 12px 0;
      border-bottom: 1px solid #E5E7EB;
    }
    .link-item:last-child { border-bottom: none; }
    .link-icon { font-size: 24px; }
    .link-info { flex: 1; }
    .link-label { font-size: 14px; color: #6B7280; }
    .link-url {
      font-size: 15px;
      color: #3B82F6;
      text-decoration: none;
      word-break: break-all;
    }
    .link-url:hover { text-decoration: underline; }

    /* 满意度选择 */
    .satisfaction-section {
      margin-bottom: 24px;
    }
    .section-title {
      font-size: 16px;
      font-weight: 600;
      color: #374151;
      margin-bottom: 16px;
      text-align: center;
    }
    .satisfaction-grid {
      display: grid;
      grid-template-columns: repeat(4, 1fr);
      gap: 12px;
    }
    .satisfaction-btn {
      background: white;
      border: 2px solid #E5E7EB;
      border-radius: 12px;
      padding: 16px 8px;
      cursor: pointer;
      transition: all 0.2s;
      text-align: center;
    }
    .satisfaction-btn:hover {
      border-color: var(--btn-color);
      transform: translateY(-2px);
    }
    .satisfaction-btn.selected {
      border-color: var(--btn-color);
      background: color-mix(in srgb, var(--btn-color) 10%, white);
    }
    .satisfaction-icon { font-size: 32px; display: block; margin-bottom: 8px; }
    .satisfaction-label { font-size: 12px; color: #6B7280; }

    /* 反馈输入 */
    .feedback-section {
      margin-bottom: 24px;
    }
    .feedback-input {
      width: 100%;
      border: 2px solid #E5E7EB;
      border-radius: 12px;
      padding: 16px;
      font-size: 15px;
      resize: none;
      height: 100px;
      transition: border-color 0.2s;
    }
    .feedback-input:focus {
      outline: none;
      border-color: #667eea;
    }
    .feedback-input::placeholder { color: #9CA3AF; }

    /* 签收按钮 */
    .sign-off-btn {
      width: 100%;
      background: linear-gradient(135deg, #10B981 0%, #059669 100%);
      color: white;
      border: none;
      border-radius: 16px;
      padding: 20px;
      font-size: 18px;
      font-weight: 700;
      cursor: pointer;
      transition: transform 0.2s, box-shadow 0.2s;
      display: flex;
      align-items: center;
      justify-content: center;
      gap: 12px;
    }
    .sign-off-btn:hover {
      transform: translateY(-2px);
      box-shadow: 0 10px 25px -5px rgba(16, 185, 129, 0.4);
    }
    .sign-off-btn:active { transform: translateY(0); }
    .sign-off-btn-icon { font-size: 24px; }

    /* 问题反馈链接 */
    .issue-link {
      text-align: center;
      margin-top: 16px;
    }
    .issue-link a {
      color: #6B7280;
      font-size: 14px;
      text-decoration: none;
    }
    .issue-link a:hover { color: #374151; text-decoration: underline; }

    /* 信任徽章 */
    .trust-badges {
      display: flex;
      justify-content: center;
      gap: 24px;
      margin-top: 24px;
      padding-top: 24px;
      border-top: 1px solid #E5E7EB;
    }
    .trust-badge {
      text-align: center;
      font-size: 12px;
      color: #9CA3AF;
    }
    .trust-badge-icon { font-size: 20px; margin-bottom: 4px; }

    /* 成功状态 */
    .success-overlay {
      display: none;
      position: fixed;
      top: 0;
      left: 0;
      right: 0;
      bottom: 0;
      background: rgba(0,0,0,0.5);
      z-index: 100;
      align-items: center;
      justify-content: center;
    }
    .success-overlay.show { display: flex; }
    .success-card {
      background: white;
      border-radius: 24px;
      padding: 48px 32px;
      text-align: center;
      max-width: 400px;
      margin: 20px;
      animation: popIn 0.3s ease;
    }
    @keyframes popIn {
      from { transform: scale(0.8); opacity: 0; }
      to { transform: scale(1); opacity: 1; }
    }
    .success-icon { font-size: 80px; margin-bottom: 24px; }
    .success-title {
      font-size: 24px;
      font-weight: 700;
      color: #10B981;
      margin-bottom: 12px;
    }
    .success-message {
      font-size: 16px;
      color: #6B7280;
      margin-bottom: 24px;
    }
    .success-btn {
      background: #10B981;
      color: white;
      border: none;
      border-radius: 12px;
      padding: 16px 32px;
      font-size: 16px;
      font-weight: 600;
      cursor: pointer;
    }
  </style>
</head>
<body>
  <div class="container">
    <div class="welcome-card">
      <div class="welcome-icon">🎁</div>
      <h1 class="welcome-title">您的产品已准备好！</h1>
      <p class="welcome-subtitle">
        亲爱的 <strong>${session.clientName}</strong>，<br>
        <span class="project-name">${session.projectName}</span> 已经开发完成
      </p>

      <!-- 产品链接 -->
      <div class="product-links">
        <div class="link-item">
          <span class="link-icon">🌐</span>
          <div class="link-info">
            <div class="link-label">产品地址</div>
            <a href="${session.productUrl}" target="_blank" class="link-url">${session.productUrl}</a>
          </div>
        </div>
        <div class="link-item">
          <span class="link-icon">🛠️</span>
          <div class="link-info">
            <div class="link-label">管理后台</div>
            <a href="${session.adminUrl}" target="_blank" class="link-url">${session.adminUrl}</a>
          </div>
        </div>
      </div>

      <!-- 满意度选择 -->
      <div class="satisfaction-section">
        <div class="section-title">请给产品打个分 ⭐</div>
        <div class="satisfaction-grid">
          ${satisfactionOptionsHtml}
        </div>
      </div>

      <!-- 反馈输入 -->
      <div class="feedback-section">
        <textarea class="feedback-input" placeholder="有什么想说的吗？（可选）"></textarea>
      </div>

      <!-- 签收按钮 -->
      <button class="sign-off-btn" onclick="signOff()">
        <span class="sign-off-btn-icon">✅</span>
        <span>确认收到，开始使用</span>
      </button>

      <!-- 问题反馈 -->
      <div class="issue-link">
        <a href="#issue">发现问题？点击反馈</a>
      </div>

      <!-- 信任徽章 -->
      <div class="trust-badges">
        <div class="trust-badge">
          <div class="trust-badge-icon">🔒</div>
          <div>安全加密</div>
        </div>
        <div class="trust-badge">
          <div class="trust-badge-icon">☁️</div>
          <div>自动备份</div>
        </div>
        <div class="trust-badge">
          <div class="trust-badge-icon">💬</div>
          <div>7×24客服</div>
        </div>
      </div>
    </div>
  </div>

  <!-- 成功弹窗 -->
  <div class="success-overlay" id="successOverlay">
    <div class="success-card">
      <div class="success-icon">🎉</div>
      <h2 class="success-title">签收成功！</h2>
      <p class="success-message">
        恭喜您！现在可以开始使用您的产品了。<br>
        如有任何问题，随时联系我们。
      </p>
      <button class="success-btn" onclick="goToProduct()">开始使用</button>
    </div>
  </div>

  <script>
    // 满意度选择
    document.querySelectorAll('.satisfaction-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        document.querySelectorAll('.satisfaction-btn').forEach(b => b.classList.remove('selected'));
        btn.classList.add('selected');
      });
    });

    // 签收
    function signOff() {
      const satisfaction = document.querySelector('.satisfaction-btn.selected')?.dataset.value || 'satisfied';
      const feedback = document.querySelector('.feedback-input').value;

      // 发送签收请求
      // fetch('/api/sign-off', { method: 'POST', body: JSON.stringify({ sessionId: '${session.sessionId}', satisfaction, feedback }) })

      // 显示成功弹窗
      document.getElementById('successOverlay').classList.add('show');
    }

    // 跳转到产品
    function goToProduct() {
      window.location.href = '${session.productUrl}';
    }
  </script>
</body>
</html>`
  }

  /**
   * 生成签收证书HTML
   */
  generateCertificateHtml(params: {
    certificateId: string
    projectName: string
    clientName: string
    signedAt: Date
    productUrl: string
  }): string {
    const { certificateId, projectName, clientName, signedAt, productUrl } = params

    return `<!DOCTYPE html>
<html lang="zh-CN">
<head>
  <meta charset="UTF-8">
  <title>产品交付证书 - ${projectName}</title>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body {
      font-family: 'Georgia', serif;
      background: #F5F5DC;
      min-height: 100vh;
      display: flex;
      align-items: center;
      justify-content: center;
      padding: 40px;
    }
    .certificate {
      background: white;
      width: 100%;
      max-width: 700px;
      padding: 60px;
      border: 8px double #D4AF37;
      box-shadow: 0 10px 40px rgba(0,0,0,0.1);
      text-align: center;
      position: relative;
    }
    .certificate::before {
      content: '';
      position: absolute;
      top: 20px;
      left: 20px;
      right: 20px;
      bottom: 20px;
      border: 2px solid #D4AF37;
      pointer-events: none;
    }
    .logo { font-size: 40px; margin-bottom: 20px; }
    .title {
      font-size: 32px;
      color: #1F2937;
      margin-bottom: 8px;
      letter-spacing: 4px;
    }
    .subtitle {
      font-size: 16px;
      color: #6B7280;
      margin-bottom: 40px;
    }
    .content {
      font-size: 18px;
      color: #374151;
      line-height: 2;
      margin-bottom: 40px;
    }
    .project-name {
      font-size: 28px;
      font-weight: bold;
      color: #1F2937;
      margin: 16px 0;
    }
    .client-name {
      font-size: 24px;
      font-style: italic;
      color: #4B5563;
    }
    .date {
      font-size: 16px;
      color: #6B7280;
      margin-top: 40px;
    }
    .seal {
      position: absolute;
      bottom: 60px;
      right: 80px;
      width: 100px;
      height: 100px;
      border: 4px solid #DC2626;
      border-radius: 50%;
      display: flex;
      align-items: center;
      justify-content: center;
      color: #DC2626;
      font-weight: bold;
      font-size: 14px;
      transform: rotate(-15deg);
    }
    .cert-id {
      position: absolute;
      bottom: 30px;
      left: 60px;
      font-size: 12px;
      color: #9CA3AF;
    }
    @media print {
      body { background: white; padding: 0; }
      .certificate { box-shadow: none; }
    }
  </style>
</head>
<body>
  <div class="certificate">
    <div class="logo">🏆</div>
    <h1 class="title">产品交付证书</h1>
    <p class="subtitle">CERTIFICATE OF DELIVERY</p>

    <div class="content">
      <p>兹证明</p>
      <p class="project-name">${projectName}</p>
      <p>已成功交付给</p>
      <p class="client-name">${clientName}</p>
      <p>并已完成签收确认</p>
    </div>

    <div class="date">
      签收日期：${signedAt.toLocaleDateString('zh-CN', { year: 'numeric', month: 'long', day: 'numeric' })}
    </div>

    <div class="seal">
      已签收<br>SIGNED
    </div>

    <div class="cert-id">证书编号：${certificateId}</div>
  </div>
</body>
</html>`
  }

  // ============================================
  // 私有方法
  // ============================================

  private generateNextSteps(): SignOffResult['nextSteps'] {
    return [
      {
        step: 1,
        title: '登录您的产品',
        description: '使用我们发送给您的账号密码登录管理后台',
        actionUrl: '#login',
        actionText: '去登录'
      },
      {
        step: 2,
        title: '熟悉基本功能',
        description: '跟随引导了解产品的主要功能',
        actionUrl: '#guide',
        actionText: '查看引导'
      },
      {
        step: 3,
        title: '开始添加内容',
        description: '创建您的第一条数据，让产品活起来',
        actionUrl: '#create',
        actionText: '开始创建'
      },
      {
        step: 4,
        title: '遇到问题？',
        description: '随时点击右下角的客服按钮联系我们',
        actionUrl: '#help',
        actionText: '联系客服'
      }
    ]
  }

  private generateWelcomeMessage(clientName: string): string {
    return `🎉 恭喜 ${clientName}！您的产品已成功签收。现在开始探索您的新产品吧！如有任何问题，我们随时在这里帮助您。`
  }
}

// ============================================
// 导出单例
// ============================================

export const deliverySignOffSimple = new DeliverySignOffSimpleService()
