/**
 * 交付检查向导服务
 *
 * 功能：
 * - 一步步教用户检查收到的产品
 * - 每一步都是简单的问题："你能看到xxx吗？"
 * - 用户只需要回答"是/否/跳过"
 * - 自动记录问题并生成反馈
 *
 * 核心理念：
 * - 用户不知道该检查什么
 * - 用户不知道什么是"正常"
 * - 我们引导用户，而不是让用户自己探索
 */

// ============================================
// 类型定义
// ============================================

/** 检查步骤类型 */
export type CheckStepType =
  | 'visit'           // 访问页面
  | 'login'           // 登录测试
  | 'view'            // 查看内容
  | 'action'          // 执行操作
  | 'mobile'          // 手机测试
  | 'satisfaction'    // 满意度

/** 检查步骤 */
export interface CheckStep {
  id: string
  stepNumber: number
  type: CheckStepType

  // 显示内容
  title: string              // 简短标题，如"打开网站"
  instruction: string        // 操作指引，如"请点击下面的链接"
  question: string           // 确认问题，如"网站能正常打开吗？"
  icon: string

  // 操作
  actionUrl?: string         // 需要访问的链接
  actionText?: string        // 按钮文字，如"打开网站"

  // 帮助
  helpText?: string          // 如果不行，怎么办
  expectedResult?: string    // 正常应该看到什么
  screenshot?: string        // 示例截图

  // 状态
  status: 'pending' | 'current' | 'passed' | 'failed' | 'skipped'
  answer?: 'yes' | 'no' | 'skip'
  userNote?: string          // 用户备注
  timestamp?: Date
}

/** 检查会话 */
export interface CheckWizardSession {
  sessionId: string
  projectId: string
  projectName: string

  // 产品信息
  productUrl: string
  adminUrl: string
  credentials?: {
    username: string
    password: string
  }

  // 步骤
  steps: CheckStep[]
  currentStepIndex: number
  totalSteps: number

  // 进度
  progress: number           // 0-100
  passedCount: number
  failedCount: number
  skippedCount: number

  // 结果
  status: 'in_progress' | 'completed' | 'needs_attention'
  completedAt?: Date
  overallResult?: 'all_good' | 'has_issues' | 'needs_help'
  issues: CheckIssue[]
}

/** 发现的问题 */
export interface CheckIssue {
  stepId: string
  stepTitle: string
  description: string
  userNote?: string
  screenshot?: string
  severity: 'minor' | 'major' | 'critical'
}

// ============================================
// 默认检查步骤模板
// ============================================

const DEFAULT_CHECK_STEPS: Omit<CheckStep, 'id' | 'stepNumber' | 'status'>[] = [
  // 步骤1：打开网站
  {
    type: 'visit',
    title: '打开网站',
    instruction: '让我们先确认网站能正常访问',
    question: '网站能正常打开吗？',
    icon: '🌐',
    actionText: '打开网站',
    expectedResult: '你应该能看到网站的首页',
    helpText: '如果打开很慢或者报错，请点击"不行"告诉我们'
  },

  // 步骤2：查看首页
  {
    type: 'view',
    title: '查看首页',
    instruction: '看看首页的内容',
    question: '首页显示正常吗？图片和文字都能看到吗？',
    icon: '👀',
    expectedResult: '页面应该加载完整，没有乱码或空白区域',
    helpText: '如果有图片不显示或者文字乱码，请告诉我们'
  },

  // 步骤3：登录测试
  {
    type: 'login',
    title: '登录管理后台',
    instruction: '现在让我们测试登录功能',
    question: '能用账号密码登录进去吗？',
    icon: '🔑',
    actionText: '打开管理后台',
    expectedResult: '输入账号密码后应该能进入管理界面',
    helpText: '如果登录失败，请检查账号密码是否正确，或者告诉我们'
  },

  // 步骤4：查看后台
  {
    type: 'view',
    title: '查看管理后台',
    instruction: '看看管理后台的界面',
    question: '管理后台界面正常吗？能看到菜单和功能按钮吗？',
    icon: '🛠️',
    expectedResult: '应该能看到左侧菜单和主要功能区域',
    helpText: '如果界面很乱或者功能按钮点不了，请告诉我们'
  },

  // 步骤5：核心功能
  {
    type: 'action',
    title: '试试核心功能',
    instruction: '试着使用一下主要功能',
    question: '主要功能能正常使用吗？',
    icon: '⚙️',
    expectedResult: '点击功能按钮应该有正常的响应',
    helpText: '如果某个功能点了没反应或者报错，请告诉我们具体是哪个'
  },

  // 步骤6：手机测试
  {
    type: 'mobile',
    title: '手机上看看',
    instruction: '用手机打开网站看看效果',
    question: '在手机上显示正常吗？',
    icon: '📱',
    actionText: '扫码在手机上打开',
    expectedResult: '手机上应该能正常浏览，文字大小合适',
    helpText: '如果手机上显示很乱或者按钮太小点不到，请告诉我们'
  },

  // 步骤7：总体满意度
  {
    type: 'satisfaction',
    title: '总体感觉',
    instruction: '最后一个问题',
    question: '总体来说，您对产品满意吗？',
    icon: '😊',
    expectedResult: '如果有任何不满意的地方，请告诉我们',
    helpText: '您的反馈对我们非常重要'
  }
]

// ============================================
// 服务实现
// ============================================

export class FirstDeliveryChecklistWizardService {

  /**
   * 创建检查向导会话
   */
  async createSession(params: {
    projectId: string
    projectName: string
    productUrl: string
    adminUrl: string
    credentials?: { username: string; password: string }
    customSteps?: Omit<CheckStep, 'id' | 'stepNumber' | 'status'>[]
  }): Promise<CheckWizardSession> {
    const {
      projectId,
      projectName,
      productUrl,
      adminUrl,
      credentials,
      customSteps
    } = params

    const sessionId = `check_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`

    // 使用自定义步骤或默认步骤
    const stepTemplates = customSteps || DEFAULT_CHECK_STEPS

    // 生成步骤
    const steps: CheckStep[] = stepTemplates.map((template, index) => ({
      ...template,
      id: `step_${index}`,
      stepNumber: index + 1,
      status: index === 0 ? 'current' : 'pending',
      // 替换占位符
      actionUrl: template.type === 'visit' ? productUrl
        : template.type === 'login' ? adminUrl
        : template.actionUrl
    }))

    return {
      sessionId,
      projectId,
      projectName,
      productUrl,
      adminUrl,
      credentials,
      steps,
      currentStepIndex: 0,
      totalSteps: steps.length,
      progress: 0,
      passedCount: 0,
      failedCount: 0,
      skippedCount: 0,
      status: 'in_progress',
      issues: []
    }
  }

  /**
   * 获取当前步骤
   */
  getCurrentStep(session: CheckWizardSession): CheckStep | null {
    if (session.currentStepIndex >= session.steps.length) {
      return null
    }
    return session.steps[session.currentStepIndex]
  }

  /**
   * 回答当前步骤
   */
  async answerStep(params: {
    session: CheckWizardSession
    answer: 'yes' | 'no' | 'skip'
    userNote?: string
    screenshot?: string
  }): Promise<{
    session: CheckWizardSession
    hasNextStep: boolean
    nextStep?: CheckStep
    isCompleted: boolean
  }> {
    const { session, answer, userNote, screenshot } = params

    // 更新当前步骤
    const currentStep = session.steps[session.currentStepIndex]
    currentStep.answer = answer
    currentStep.userNote = userNote
    currentStep.timestamp = new Date()
    currentStep.status = answer === 'yes' ? 'passed' : answer === 'no' ? 'failed' : 'skipped'

    // 如果回答"不行"，记录问题
    if (answer === 'no') {
      session.issues.push({
        stepId: currentStep.id,
        stepTitle: currentStep.title,
        description: currentStep.question,
        userNote,
        screenshot,
        severity: this.determineSeverity(currentStep)
      })
      session.failedCount++
    } else if (answer === 'yes') {
      session.passedCount++
    } else {
      session.skippedCount++
    }

    // 移动到下一步
    session.currentStepIndex++

    // 更新进度
    session.progress = Math.round((session.currentStepIndex / session.totalSteps) * 100)

    // 检查是否完成
    const isCompleted = session.currentStepIndex >= session.totalSteps

    if (isCompleted) {
      session.status = session.failedCount > 0 ? 'needs_attention' : 'completed'
      session.completedAt = new Date()
      session.overallResult = session.failedCount === 0 ? 'all_good'
        : session.failedCount <= 2 ? 'has_issues'
        : 'needs_help'
    } else {
      // 更新下一步状态
      session.steps[session.currentStepIndex].status = 'current'
    }

    return {
      session,
      hasNextStep: !isCompleted,
      nextStep: isCompleted ? undefined : session.steps[session.currentStepIndex],
      isCompleted
    }
  }

  /**
   * 生成检查向导页面HTML
   */
  generateWizardPageHtml(session: CheckWizardSession): string {
    const currentStep = this.getCurrentStep(session)

    if (!currentStep) {
      return this.generateCompletionPageHtml(session)
    }

    return `<!DOCTYPE html>
<html lang="zh-CN">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>产品检查 - ${session.projectName}</title>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
      background: #F3F4F6;
      min-height: 100vh;
    }

    /* 进度条 */
    .progress-bar {
      position: fixed;
      top: 0;
      left: 0;
      right: 0;
      height: 4px;
      background: #E5E7EB;
      z-index: 100;
    }
    .progress-fill {
      height: 100%;
      background: linear-gradient(90deg, #10B981, #059669);
      transition: width 0.3s ease;
    }

    /* 头部 */
    .header {
      background: white;
      padding: 20px;
      border-bottom: 1px solid #E5E7EB;
    }
    .header-content {
      max-width: 600px;
      margin: 0 auto;
      display: flex;
      justify-content: space-between;
      align-items: center;
    }
    .step-indicator {
      font-size: 14px;
      color: #6B7280;
    }
    .project-name {
      font-size: 16px;
      font-weight: 600;
      color: #1F2937;
    }

    /* 主内容 */
    .container {
      max-width: 600px;
      margin: 0 auto;
      padding: 40px 20px;
    }

    /* 步骤卡片 */
    .step-card {
      background: white;
      border-radius: 24px;
      padding: 40px 32px;
      box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1);
      text-align: center;
    }
    .step-icon {
      font-size: 64px;
      margin-bottom: 24px;
    }
    .step-title {
      font-size: 24px;
      font-weight: 700;
      color: #1F2937;
      margin-bottom: 12px;
    }
    .step-instruction {
      font-size: 16px;
      color: #6B7280;
      margin-bottom: 24px;
    }

    /* 操作按钮 */
    .action-btn {
      display: inline-flex;
      align-items: center;
      gap: 8px;
      background: #3B82F6;
      color: white;
      border: none;
      padding: 16px 32px;
      border-radius: 12px;
      font-size: 16px;
      font-weight: 600;
      cursor: pointer;
      margin-bottom: 32px;
      text-decoration: none;
      transition: transform 0.2s, background 0.2s;
    }
    .action-btn:hover {
      background: #2563EB;
      transform: translateY(-2px);
    }

    /* 问题区域 */
    .question-section {
      background: #F9FAFB;
      border-radius: 16px;
      padding: 24px;
      margin-bottom: 24px;
    }
    .question {
      font-size: 18px;
      font-weight: 600;
      color: #1F2937;
      margin-bottom: 16px;
    }
    .expected-result {
      font-size: 14px;
      color: #6B7280;
      margin-bottom: 20px;
    }
    .expected-result::before {
      content: "💡 ";
    }

    /* 回答按钮 */
    .answer-buttons {
      display: flex;
      gap: 12px;
      justify-content: center;
    }
    .answer-btn {
      flex: 1;
      max-width: 160px;
      padding: 16px 24px;
      border-radius: 12px;
      font-size: 16px;
      font-weight: 600;
      cursor: pointer;
      border: 2px solid transparent;
      transition: all 0.2s;
    }
    .answer-btn-yes {
      background: #ECFDF5;
      color: #059669;
      border-color: #10B981;
    }
    .answer-btn-yes:hover {
      background: #10B981;
      color: white;
    }
    .answer-btn-no {
      background: #FEF2F2;
      color: #DC2626;
      border-color: #EF4444;
    }
    .answer-btn-no:hover {
      background: #EF4444;
      color: white;
    }
    .answer-btn-skip {
      background: #F3F4F6;
      color: #6B7280;
      border-color: #D1D5DB;
    }
    .answer-btn-skip:hover {
      background: #E5E7EB;
    }

    /* 帮助提示 */
    .help-text {
      font-size: 14px;
      color: #9CA3AF;
      margin-top: 16px;
    }

    /* 问题输入框（当回答"不行"时显示） */
    .issue-input {
      display: none;
      margin-top: 24px;
      padding: 20px;
      background: #FEF2F2;
      border-radius: 12px;
    }
    .issue-input.show { display: block; }
    .issue-input label {
      display: block;
      font-size: 14px;
      font-weight: 500;
      color: #991B1B;
      margin-bottom: 8px;
    }
    .issue-input textarea {
      width: 100%;
      border: 1px solid #FECACA;
      border-radius: 8px;
      padding: 12px;
      font-size: 14px;
      resize: none;
      height: 80px;
    }
    .issue-input textarea:focus {
      outline: none;
      border-color: #EF4444;
    }
    .issue-submit {
      margin-top: 12px;
      background: #EF4444;
      color: white;
      border: none;
      padding: 12px 24px;
      border-radius: 8px;
      font-size: 14px;
      font-weight: 600;
      cursor: pointer;
    }

    /* 步骤指示器 */
    .steps-dots {
      display: flex;
      justify-content: center;
      gap: 8px;
      margin-top: 32px;
    }
    .step-dot {
      width: 10px;
      height: 10px;
      border-radius: 50%;
      background: #E5E7EB;
      transition: all 0.2s;
    }
    .step-dot.passed { background: #10B981; }
    .step-dot.current { background: #3B82F6; transform: scale(1.3); }
    .step-dot.failed { background: #EF4444; }
    .step-dot.skipped { background: #F59E0B; }
  </style>
</head>
<body>
  <!-- 进度条 -->
  <div class="progress-bar">
    <div class="progress-fill" style="width: ${session.progress}%"></div>
  </div>

  <!-- 头部 -->
  <div class="header">
    <div class="header-content">
      <span class="project-name">${session.projectName}</span>
      <span class="step-indicator">步骤 ${currentStep.stepNumber}/${session.totalSteps}</span>
    </div>
  </div>

  <!-- 主内容 -->
  <div class="container">
    <div class="step-card">
      <div class="step-icon">${currentStep.icon}</div>
      <h1 class="step-title">${currentStep.title}</h1>
      <p class="step-instruction">${currentStep.instruction}</p>

      ${currentStep.actionUrl ? `
      <a href="${currentStep.actionUrl}" target="_blank" class="action-btn">
        ${currentStep.actionText || '打开'} →
      </a>
      ` : ''}

      <div class="question-section">
        <div class="question">${currentStep.question}</div>
        ${currentStep.expectedResult ? `
        <div class="expected-result">${currentStep.expectedResult}</div>
        ` : ''}

        <div class="answer-buttons">
          <button class="answer-btn answer-btn-yes" onclick="answer('yes')">
            ✅ 可以
          </button>
          <button class="answer-btn answer-btn-no" onclick="showIssueInput()">
            ❌ 不行
          </button>
          <button class="answer-btn answer-btn-skip" onclick="answer('skip')">
            ⏭️ 跳过
          </button>
        </div>

        ${currentStep.helpText ? `
        <p class="help-text">${currentStep.helpText}</p>
        ` : ''}
      </div>

      <!-- 问题输入 -->
      <div class="issue-input" id="issueInput">
        <label>请简单描述遇到的问题：</label>
        <textarea id="issueNote" placeholder="比如：点击按钮没反应、页面显示空白等"></textarea>
        <button class="issue-submit" onclick="submitIssue()">提交并继续</button>
      </div>

      <!-- 步骤指示器 -->
      <div class="steps-dots">
        ${session.steps.map(step => `
          <div class="step-dot ${step.status}"></div>
        `).join('')}
      </div>
    </div>
  </div>

  <script>
    function answer(ans) {
      // 发送回答
      fetch('/api/check-wizard/answer', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          sessionId: '${session.sessionId}',
          answer: ans
        })
      }).then(() => {
        location.reload();
      });
    }

    function showIssueInput() {
      document.getElementById('issueInput').classList.add('show');
    }

    function submitIssue() {
      const note = document.getElementById('issueNote').value;
      fetch('/api/check-wizard/answer', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          sessionId: '${session.sessionId}',
          answer: 'no',
          userNote: note
        })
      }).then(() => {
        location.reload();
      });
    }
  </script>
</body>
</html>`
  }

  /**
   * 生成完成页面HTML
   */
  generateCompletionPageHtml(session: CheckWizardSession): string {
    const resultConfig = {
      all_good: {
        icon: '🎉',
        title: '太棒了！检查全部通过',
        subtitle: '您的产品一切正常，可以开始使用了！',
        color: '#10B981'
      },
      has_issues: {
        icon: '🔧',
        title: '检查完成，发现了一些小问题',
        subtitle: '我们已记录这些问题，会尽快处理',
        color: '#F59E0B'
      },
      needs_help: {
        icon: '💬',
        title: '感谢您的反馈',
        subtitle: '客服会很快联系您解决这些问题',
        color: '#EF4444'
      }
    }

    const result = resultConfig[session.overallResult || 'all_good']

    return `<!DOCTYPE html>
<html lang="zh-CN">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>检查完成 - ${session.projectName}</title>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
      background: linear-gradient(135deg, ${result.color}22 0%, ${result.color}11 100%);
      min-height: 100vh;
      display: flex;
      align-items: center;
      justify-content: center;
      padding: 20px;
    }
    .card {
      background: white;
      border-radius: 24px;
      padding: 48px 32px;
      max-width: 500px;
      width: 100%;
      text-align: center;
      box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.15);
    }
    .icon { font-size: 80px; margin-bottom: 24px; }
    .title {
      font-size: 24px;
      font-weight: 700;
      color: #1F2937;
      margin-bottom: 12px;
    }
    .subtitle {
      font-size: 16px;
      color: #6B7280;
      margin-bottom: 32px;
    }

    .stats {
      display: flex;
      justify-content: center;
      gap: 32px;
      margin-bottom: 32px;
    }
    .stat {
      text-align: center;
    }
    .stat-number {
      font-size: 32px;
      font-weight: 700;
    }
    .stat-number.green { color: #10B981; }
    .stat-number.red { color: #EF4444; }
    .stat-number.yellow { color: #F59E0B; }
    .stat-label {
      font-size: 14px;
      color: #6B7280;
    }

    .issues {
      background: #FEF2F2;
      border-radius: 12px;
      padding: 20px;
      margin-bottom: 24px;
      text-align: left;
    }
    .issues-title {
      font-size: 14px;
      font-weight: 600;
      color: #991B1B;
      margin-bottom: 12px;
    }
    .issue-item {
      font-size: 14px;
      color: #7F1D1D;
      padding: 8px 0;
      border-bottom: 1px solid #FECACA;
    }
    .issue-item:last-child { border-bottom: none; }

    .btn {
      display: inline-block;
      padding: 16px 32px;
      border-radius: 12px;
      font-size: 16px;
      font-weight: 600;
      cursor: pointer;
      border: none;
      text-decoration: none;
      margin: 8px;
    }
    .btn-primary {
      background: ${result.color};
      color: white;
    }
    .btn-secondary {
      background: #F3F4F6;
      color: #374151;
    }
  </style>
</head>
<body>
  <div class="card">
    <div class="icon">${result.icon}</div>
    <h1 class="title">${result.title}</h1>
    <p class="subtitle">${result.subtitle}</p>

    <div class="stats">
      <div class="stat">
        <div class="stat-number green">${session.passedCount}</div>
        <div class="stat-label">通过</div>
      </div>
      <div class="stat">
        <div class="stat-number red">${session.failedCount}</div>
        <div class="stat-label">问题</div>
      </div>
      <div class="stat">
        <div class="stat-number yellow">${session.skippedCount}</div>
        <div class="stat-label">跳过</div>
      </div>
    </div>

    ${session.issues.length > 0 ? `
    <div class="issues">
      <div class="issues-title">发现的问题：</div>
      ${session.issues.map(issue => `
        <div class="issue-item">
          ${issue.stepTitle}：${issue.userNote || issue.description}
        </div>
      `).join('')}
    </div>
    ` : ''}

    <div>
      <a href="${session.productUrl}" class="btn btn-primary">开始使用</a>
      <a href="#contact" class="btn btn-secondary">联系客服</a>
    </div>
  </div>
</body>
</html>`
  }

  // ============================================
  // 私有方法
  // ============================================

  private determineSeverity(step: CheckStep): 'minor' | 'major' | 'critical' {
    // 登录失败是严重问题
    if (step.type === 'login') return 'critical'
    // 网站打不开是严重问题
    if (step.type === 'visit') return 'critical'
    // 手机显示问题是小问题
    if (step.type === 'mobile') return 'minor'
    // 其他是中等问题
    return 'major'
  }
}

// ============================================
// 导出单例
// ============================================

export const firstDeliveryChecklistWizard = new FirstDeliveryChecklistWizardService()
