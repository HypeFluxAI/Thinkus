/**
 * 部署失败人话翻译服务
 *
 * 功能：
 * - 将技术性部署错误翻译成小白用户能理解的人话
 * - 提供清晰的恢复方案和时间预估
 * - 自动触发补偿机制
 * - 让用户在失败时也能感到被照顾
 *
 * 核心理念：
 * - "部署失败"不是用户的错，是我们的问题
 * - 用户需要知道：发生了什么、我们在做什么、什么时候能好
 * - 失败也要让用户感到被重视和信任
 */

// ============================================
// 类型定义
// ============================================

/** 失败类型 */
export type FailureType =
  | 'build_failed'           // 构建失败
  | 'deploy_failed'          // 部署失败
  | 'connection_failed'      // 连接失败
  | 'timeout'                // 超时
  | 'resource_exhausted'     // 资源耗尽
  | 'config_error'           // 配置错误
  | 'dependency_error'       // 依赖问题
  | 'permission_error'       // 权限问题
  | 'network_error'          // 网络问题
  | 'database_error'         // 数据库问题
  | 'ssl_error'              // SSL证书问题
  | 'domain_error'           // 域名问题
  | 'payment_error'          // 支付相关
  | 'unknown'                // 未知错误

/** 恢复状态 */
export type RecoveryStatus =
  | 'analyzing'              // 正在分析
  | 'auto_fixing'            // 自动修复中
  | 'manual_required'        // 需要人工处理
  | 'waiting_retry'          // 等待重试
  | 'escalated'              // 已升级处理
  | 'resolved'               // 已解决
  | 'pending_user'           // 等待用户操作

/** 人话翻译结果 */
export interface HumanTranslation {
  // 基础信息
  failureId: string
  failureType: FailureType
  occurredAt: Date

  // 技术信息（内部用）
  technicalError: string
  technicalStack?: string
  errorCode?: string

  // 人话信息（给用户看）
  headline: string           // 大标题，如"遇到了一个小问题"
  headlineIcon: string       // 图标，如"🔧"
  explanation: string        // 人话解释
  reassurance: string        // 安慰语，如"别担心，这很常见"

  // 恢复方案
  recovery: RecoveryPlan

  // 补偿方案
  compensation?: CompensationPlan

  // 用户可执行的操作
  userActions: UserAction[]

  // 时间线
  timeline: TimelineEvent[]
}

/** 恢复方案 */
export interface RecoveryPlan {
  status: RecoveryStatus
  statusText: string         // 人话状态，如"我们正在处理"
  statusIcon: string

  // 预计时间
  estimatedMinutes: number
  estimatedText: string      // 如"大约10分钟"

  // 恢复步骤（人话）
  steps: {
    step: number
    description: string
    status: 'pending' | 'in_progress' | 'completed' | 'failed'
    statusIcon: string
  }[]

  // 进度
  progress: number           // 0-100

  // 负责人
  assignedTo?: string        // 如"技术团队李工"
  contactAvailable: boolean  // 是否可以联系
}

/** 补偿方案 */
export interface CompensationPlan {
  eligible: boolean          // 是否符合补偿条件
  reason: string             // 原因

  // 补偿选项
  options: {
    id: string
    type: 'discount' | 'extend' | 'upgrade' | 'refund' | 'credit'
    title: string            // 如"延长1个月使用期"
    description: string
    value: string            // 如"¥100" 或 "1个月"
    recommended: boolean
  }[]

  // 自动补偿
  autoApplied?: {
    type: string
    description: string
  }
}

/** 用户可执行操作 */
export interface UserAction {
  id: string
  label: string              // 按钮文字
  icon: string
  type: 'primary' | 'secondary' | 'link'
  action: 'retry' | 'contact' | 'wait' | 'cancel' | 'accept_compensation' | 'view_details'
  enabled: boolean
  disabledReason?: string
}

/** 时间线事件 */
export interface TimelineEvent {
  time: Date
  event: string              // 人话描述
  icon: string
  type: 'info' | 'warning' | 'error' | 'success'
}

// ============================================
// 错误翻译映射表
// ============================================

interface ErrorTranslation {
  pattern: RegExp
  type: FailureType
  headline: string
  headlineIcon: string
  explanation: string
  reassurance: string
  estimatedMinutes: number
  autoFixable: boolean
  compensationEligible: boolean
  recoverySteps: string[]
}

const ERROR_TRANSLATIONS: ErrorTranslation[] = [
  // 构建失败
  {
    pattern: /build failed|exit code 1|compilation error/i,
    type: 'build_failed',
    headline: '代码打包遇到问题',
    headlineIcon: '📦',
    explanation: '我们在把代码打包成可以运行的程序时遇到了一个小问题',
    reassurance: '别担心，这种情况我们很有经验，正在自动修复',
    estimatedMinutes: 15,
    autoFixable: true,
    compensationEligible: false,
    recoverySteps: [
      '正在分析问题原因',
      '自动修复代码问题',
      '重新打包程序',
      '验证修复结果'
    ]
  },

  // 部署失败
  {
    pattern: /deployment failed|deploy error|vercel.*error/i,
    type: 'deploy_failed',
    headline: '产品上线遇到问题',
    headlineIcon: '🚀',
    explanation: '我们在把您的产品发布到网上时遇到了一点小麻烦',
    reassurance: '服务器有时候会有点小脾气，我们正在处理',
    estimatedMinutes: 20,
    autoFixable: true,
    compensationEligible: true,
    recoverySteps: [
      '正在检查服务器状态',
      '切换到备用服务器',
      '重新发布产品',
      '确认产品可以访问'
    ]
  },

  // 连接失败
  {
    pattern: /ECONNREFUSED|connection refused|cannot connect/i,
    type: 'connection_failed',
    headline: '服务器暂时联系不上',
    headlineIcon: '📡',
    explanation: '我们的服务器正在休息，暂时联系不上',
    reassurance: '这就像手机信号不好一样，稍等一下就好了',
    estimatedMinutes: 10,
    autoFixable: true,
    compensationEligible: false,
    recoverySteps: [
      '正在检查网络状态',
      '尝试重新连接',
      '确认连接正常'
    ]
  },

  // 超时
  {
    pattern: /timeout|timed out|ETIMEDOUT/i,
    type: 'timeout',
    headline: '操作花了太长时间',
    headlineIcon: '⏰',
    explanation: '某个操作花的时间比预期的长，系统自动停止了',
    reassurance: '可能是网络有点慢，我们会自动重试',
    estimatedMinutes: 10,
    autoFixable: true,
    compensationEligible: false,
    recoverySteps: [
      '正在优化操作速度',
      '重新执行操作',
      '确认操作完成'
    ]
  },

  // 资源耗尽
  {
    pattern: /out of memory|memory limit|disk full|quota exceeded/i,
    type: 'resource_exhausted',
    headline: '服务器需要扩容',
    headlineIcon: '💾',
    explanation: '您的产品很受欢迎，服务器资源需要升级',
    reassurance: '这是个好消息！说明您的产品很成功，我们正在升级',
    estimatedMinutes: 30,
    autoFixable: true,
    compensationEligible: true,
    recoverySteps: [
      '正在申请更多资源',
      '升级服务器配置',
      '重新部署产品',
      '确认运行正常'
    ]
  },

  // 配置错误
  {
    pattern: /config.*error|invalid configuration|missing.*env/i,
    type: 'config_error',
    headline: '配置需要调整',
    headlineIcon: '⚙️',
    explanation: '有一些设置需要调整才能正常运行',
    reassurance: '这是很简单的问题，我们马上就能修好',
    estimatedMinutes: 10,
    autoFixable: true,
    compensationEligible: false,
    recoverySteps: [
      '正在检查配置',
      '修正配置问题',
      '重新启动服务'
    ]
  },

  // 依赖问题
  {
    pattern: /dependency.*error|package.*not found|module.*not found|npm.*error/i,
    type: 'dependency_error',
    headline: '软件组件需要更新',
    headlineIcon: '🧩',
    explanation: '有一些软件组件版本不兼容，需要更新',
    reassurance: '就像手机APP需要更新一样，我们正在处理',
    estimatedMinutes: 15,
    autoFixable: true,
    compensationEligible: false,
    recoverySteps: [
      '正在分析组件依赖',
      '更新不兼容的组件',
      '重新构建项目',
      '验证功能正常'
    ]
  },

  // 权限问题
  {
    pattern: /permission denied|access denied|unauthorized|forbidden/i,
    type: 'permission_error',
    headline: '权限需要配置',
    headlineIcon: '🔑',
    explanation: '服务器的访问权限需要重新配置',
    reassurance: '这是安全机制在起作用，我们正在调整',
    estimatedMinutes: 15,
    autoFixable: true,
    compensationEligible: false,
    recoverySteps: [
      '正在检查权限配置',
      '更新访问权限',
      '验证权限生效'
    ]
  },

  // 网络问题
  {
    pattern: /network.*error|dns.*error|socket.*error|ENOTFOUND/i,
    type: 'network_error',
    headline: '网络有点小问题',
    headlineIcon: '🌐',
    explanation: '网络连接遇到了一些波动',
    reassurance: '就像WiFi偶尔断一下，稍等就好',
    estimatedMinutes: 10,
    autoFixable: true,
    compensationEligible: false,
    recoverySteps: [
      '正在诊断网络问题',
      '切换网络线路',
      '确认连接恢复'
    ]
  },

  // 数据库问题
  {
    pattern: /database.*error|mongodb.*error|mysql.*error|postgres.*error|prisma.*error/i,
    type: 'database_error',
    headline: '数据库需要维护',
    headlineIcon: '🗄️',
    explanation: '存储数据的地方需要一点维护',
    reassurance: '您的数据很安全，我们只是在做例行维护',
    estimatedMinutes: 20,
    autoFixable: true,
    compensationEligible: true,
    recoverySteps: [
      '正在检查数据库状态',
      '执行数据库修复',
      '验证数据完整性',
      '恢复正常服务'
    ]
  },

  // SSL证书问题
  {
    pattern: /ssl.*error|certificate.*error|https.*error|tls.*error/i,
    type: 'ssl_error',
    headline: '安全证书需要更新',
    headlineIcon: '🔐',
    explanation: '网站的安全证书需要重新配置',
    reassurance: '这是为了保护您的数据安全，很快就好',
    estimatedMinutes: 15,
    autoFixable: true,
    compensationEligible: false,
    recoverySteps: [
      '正在申请新证书',
      '配置安全证书',
      '验证HTTPS正常'
    ]
  },

  // 域名问题
  {
    pattern: /domain.*error|dns.*failed|domain.*not found/i,
    type: 'domain_error',
    headline: '域名配置中',
    headlineIcon: '🌍',
    explanation: '网站域名正在配置中，需要等待生效',
    reassurance: '域名生效需要一点时间，这是正常的',
    estimatedMinutes: 30,
    autoFixable: true,
    compensationEligible: false,
    recoverySteps: [
      '正在配置DNS记录',
      '等待DNS生效（通常需要几分钟）',
      '验证域名可访问'
    ]
  }
]

// ============================================
// 服务实现
// ============================================

export class DeploymentFailureTranslatorService {

  /**
   * 翻译部署错误为人话
   */
  async translateError(params: {
    projectId: string
    projectName: string
    technicalError: string
    errorCode?: string
    technicalStack?: string
  }): Promise<HumanTranslation> {
    const { projectId, projectName, technicalError, errorCode, technicalStack } = params

    // 1. 匹配错误类型
    const translation = this.matchErrorType(technicalError)

    // 2. 生成恢复方案
    const recovery = this.generateRecoveryPlan(translation)

    // 3. 生成补偿方案（如果符合条件）
    const compensation = translation.compensationEligible
      ? this.generateCompensationPlan(translation)
      : undefined

    // 4. 生成用户操作
    const userActions = this.generateUserActions(translation, recovery)

    // 5. 生成时间线
    const timeline = this.generateTimeline(translation)

    const failureId = `fail_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`

    return {
      failureId,
      failureType: translation.type,
      occurredAt: new Date(),

      technicalError,
      technicalStack,
      errorCode,

      headline: translation.headline,
      headlineIcon: translation.headlineIcon,
      explanation: translation.explanation,
      reassurance: translation.reassurance,

      recovery,
      compensation,
      userActions,
      timeline
    }
  }

  /**
   * 生成简短的状态消息
   */
  getQuickMessage(translation: HumanTranslation): {
    icon: string
    title: string
    subtitle: string
    actionText: string
  } {
    return {
      icon: translation.headlineIcon,
      title: translation.headline,
      subtitle: translation.reassurance,
      actionText: translation.recovery.statusText
    }
  }

  /**
   * 更新恢复进度
   */
  updateRecoveryProgress(
    translation: HumanTranslation,
    completedStep: number
  ): HumanTranslation {
    const updatedRecovery = { ...translation.recovery }

    // 更新步骤状态
    updatedRecovery.steps = updatedRecovery.steps.map((step, index) => ({
      ...step,
      status: index < completedStep ? 'completed' as const
        : index === completedStep ? 'in_progress' as const
        : 'pending' as const,
      statusIcon: index < completedStep ? '✅'
        : index === completedStep ? '🔄'
        : '⏳'
    }))

    // 更新进度
    updatedRecovery.progress = Math.round(
      (completedStep / updatedRecovery.steps.length) * 100
    )

    // 更新状态文本
    if (completedStep >= updatedRecovery.steps.length) {
      updatedRecovery.status = 'resolved'
      updatedRecovery.statusText = '已修复完成！'
      updatedRecovery.statusIcon = '✅'
    }

    // 添加时间线事件
    const newTimeline = [...translation.timeline]
    if (completedStep > 0 && completedStep <= updatedRecovery.steps.length) {
      newTimeline.push({
        time: new Date(),
        event: updatedRecovery.steps[completedStep - 1].description + ' - 完成',
        icon: '✅',
        type: 'success'
      })
    }

    return {
      ...translation,
      recovery: updatedRecovery,
      timeline: newTimeline
    }
  }

  /**
   * 生成用户通知邮件
   */
  generateNotificationEmail(translation: HumanTranslation, projectName: string): string {
    return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; background: #f5f5f5; padding: 20px; }
    .container { max-width: 500px; margin: 0 auto; background: white; border-radius: 16px; overflow: hidden; }
    .header { background: #FEF3C7; padding: 32px; text-align: center; }
    .header-icon { font-size: 48px; margin-bottom: 16px; }
    .header-title { font-size: 24px; font-weight: 600; color: #92400E; margin-bottom: 8px; }
    .header-subtitle { color: #B45309; font-size: 16px; }
    .content { padding: 32px; }
    .explanation { font-size: 16px; color: #374151; margin-bottom: 16px; line-height: 1.6; }
    .reassurance { background: #ECFDF5; border-radius: 8px; padding: 16px; color: #065F46; font-size: 14px; margin-bottom: 24px; }
    .reassurance::before { content: "💚 "; }
    .steps { margin-bottom: 24px; }
    .step { display: flex; align-items: center; gap: 12px; padding: 12px 0; border-bottom: 1px solid #E5E7EB; }
    .step:last-child { border-bottom: none; }
    .step-icon { font-size: 20px; }
    .step-text { flex: 1; }
    .progress-bar { background: #E5E7EB; height: 8px; border-radius: 4px; margin-bottom: 8px; }
    .progress-fill { background: #10B981; height: 100%; border-radius: 4px; transition: width 0.3s; }
    .progress-text { font-size: 14px; color: #6B7280; text-align: center; }
    .cta { text-align: center; padding: 24px; background: #F9FAFB; }
    .btn { display: inline-block; background: #3B82F6; color: white; padding: 14px 28px; border-radius: 8px; text-decoration: none; font-weight: 600; }
    .footer { text-align: center; padding: 24px; color: #9CA3AF; font-size: 14px; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <div class="header-icon">${translation.headlineIcon}</div>
      <div class="header-title">${translation.headline}</div>
      <div class="header-subtitle">项目：${projectName}</div>
    </div>

    <div class="content">
      <p class="explanation">${translation.explanation}</p>

      <div class="reassurance">${translation.reassurance}</div>

      <div class="steps">
        <h3 style="margin-bottom: 16px; font-size: 16px; color: #374151;">我们正在做什么：</h3>
        ${translation.recovery.steps.map(step => `
        <div class="step">
          <span class="step-icon">${step.statusIcon}</span>
          <span class="step-text">${step.description}</span>
        </div>
        `).join('')}
      </div>

      <div class="progress-bar">
        <div class="progress-fill" style="width: ${translation.recovery.progress}%"></div>
      </div>
      <p class="progress-text">进度：${translation.recovery.progress}%（预计${translation.recovery.estimatedText}）</p>
    </div>

    <div class="cta">
      <a href="#status" class="btn">查看实时状态</a>
    </div>

    <div class="footer">
      如有任何问题，请随时联系我们<br>
      Thinkus 技术支持团队
    </div>
  </div>
</body>
</html>`
  }

  /**
   * 生成状态页面HTML
   */
  generateStatusPageHtml(translation: HumanTranslation, projectName: string): string {
    const statusColors = {
      analyzing: '#3B82F6',
      auto_fixing: '#F59E0B',
      manual_required: '#EF4444',
      waiting_retry: '#8B5CF6',
      escalated: '#EC4899',
      resolved: '#10B981',
      pending_user: '#6B7280'
    }

    const statusColor = statusColors[translation.recovery.status] || '#6B7280'

    return `<!DOCTYPE html>
<html lang="zh-CN">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <meta http-equiv="refresh" content="30">
  <title>处理进度 - ${projectName}</title>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
      background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
      min-height: 100vh;
      display: flex;
      align-items: center;
      justify-content: center;
      padding: 20px;
    }
    .card {
      background: white;
      border-radius: 24px;
      max-width: 480px;
      width: 100%;
      overflow: hidden;
      box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.25);
    }

    .header {
      background: ${statusColor}10;
      padding: 40px 32px;
      text-align: center;
      border-bottom: 1px solid #E5E7EB;
    }
    .status-icon {
      font-size: 64px;
      margin-bottom: 16px;
      animation: pulse 2s infinite;
    }
    @keyframes pulse {
      0%, 100% { transform: scale(1); }
      50% { transform: scale(1.1); }
    }
    .status-title {
      font-size: 24px;
      font-weight: 700;
      color: #1F2937;
      margin-bottom: 8px;
    }
    .status-subtitle {
      color: #6B7280;
      font-size: 16px;
    }

    .progress-section {
      padding: 32px;
      border-bottom: 1px solid #E5E7EB;
    }
    .progress-bar {
      background: #E5E7EB;
      height: 12px;
      border-radius: 6px;
      margin-bottom: 12px;
      overflow: hidden;
    }
    .progress-fill {
      background: linear-gradient(90deg, ${statusColor}, ${statusColor}dd);
      height: 100%;
      border-radius: 6px;
      transition: width 0.5s ease;
      position: relative;
    }
    .progress-fill::after {
      content: '';
      position: absolute;
      top: 0;
      left: 0;
      right: 0;
      bottom: 0;
      background: linear-gradient(90deg, transparent, rgba(255,255,255,0.3), transparent);
      animation: shimmer 2s infinite;
    }
    @keyframes shimmer {
      0% { transform: translateX(-100%); }
      100% { transform: translateX(100%); }
    }
    .progress-info {
      display: flex;
      justify-content: space-between;
      font-size: 14px;
      color: #6B7280;
    }

    .steps-section {
      padding: 32px;
    }
    .steps-title {
      font-size: 16px;
      font-weight: 600;
      color: #374151;
      margin-bottom: 20px;
    }
    .step {
      display: flex;
      align-items: flex-start;
      gap: 16px;
      margin-bottom: 20px;
    }
    .step:last-child { margin-bottom: 0; }
    .step-icon {
      font-size: 24px;
      flex-shrink: 0;
    }
    .step-content { flex: 1; }
    .step-text {
      font-size: 15px;
      color: #374151;
      margin-bottom: 4px;
    }
    .step-status {
      font-size: 13px;
      color: #9CA3AF;
    }
    .step.completed .step-text { color: #059669; }
    .step.in-progress .step-text { color: ${statusColor}; font-weight: 500; }

    .reassurance {
      background: #F0FDF4;
      margin: 0 32px 32px;
      padding: 16px;
      border-radius: 12px;
      color: #166534;
      font-size: 14px;
      text-align: center;
    }

    .actions {
      padding: 24px 32px;
      background: #F9FAFB;
      display: flex;
      gap: 12px;
    }
    .btn {
      flex: 1;
      padding: 14px;
      border-radius: 10px;
      font-size: 15px;
      font-weight: 600;
      text-align: center;
      cursor: pointer;
      border: none;
      text-decoration: none;
    }
    .btn-primary {
      background: ${statusColor};
      color: white;
    }
    .btn-secondary {
      background: white;
      color: #374151;
      border: 1px solid #E5E7EB;
    }

    .footer {
      text-align: center;
      padding: 20px 32px;
      font-size: 13px;
      color: #9CA3AF;
    }
    .refresh-note {
      font-size: 12px;
      color: #9CA3AF;
      text-align: center;
      margin-top: 8px;
    }
  </style>
</head>
<body>
  <div class="card">
    <div class="header">
      <div class="status-icon">${translation.headlineIcon}</div>
      <div class="status-title">${translation.headline}</div>
      <div class="status-subtitle">${translation.recovery.statusText}</div>
    </div>

    <div class="progress-section">
      <div class="progress-bar">
        <div class="progress-fill" style="width: ${translation.recovery.progress}%"></div>
      </div>
      <div class="progress-info">
        <span>进度 ${translation.recovery.progress}%</span>
        <span>预计还需 ${translation.recovery.estimatedText}</span>
      </div>
    </div>

    <div class="steps-section">
      <div class="steps-title">处理步骤</div>
      ${translation.recovery.steps.map(step => `
      <div class="step ${step.status}">
        <span class="step-icon">${step.statusIcon}</span>
        <div class="step-content">
          <div class="step-text">${step.description}</div>
          <div class="step-status">${step.status === 'completed' ? '已完成' : step.status === 'in_progress' ? '进行中...' : '等待中'}</div>
        </div>
      </div>
      `).join('')}
    </div>

    <div class="reassurance">💚 ${translation.reassurance}</div>

    <div class="actions">
      <a href="#contact" class="btn btn-secondary">联系客服</a>
      <a href="#refresh" class="btn btn-primary" onclick="location.reload()">刷新状态</a>
    </div>

    <div class="footer">
      ${projectName} · Thinkus 技术支持
      <div class="refresh-note">页面每30秒自动刷新</div>
    </div>
  </div>
</body>
</html>`
  }

  // ============================================
  // 私有方法
  // ============================================

  private matchErrorType(technicalError: string): ErrorTranslation {
    for (const translation of ERROR_TRANSLATIONS) {
      if (translation.pattern.test(technicalError)) {
        return translation
      }
    }

    // 未知错误的默认翻译
    return {
      pattern: /.*/,
      type: 'unknown',
      headline: '遇到了一个小问题',
      headlineIcon: '🔧',
      explanation: '系统遇到了一个意外情况，我们正在分析原因',
      reassurance: '我们的技术团队已经收到通知，正在处理',
      estimatedMinutes: 30,
      autoFixable: false,
      compensationEligible: true,
      recoverySteps: [
        '正在分析问题原因',
        '技术团队介入处理',
        '修复问题并验证',
        '恢复正常服务'
      ]
    }
  }

  private generateRecoveryPlan(translation: ErrorTranslation): RecoveryPlan {
    return {
      status: translation.autoFixable ? 'auto_fixing' : 'manual_required',
      statusText: translation.autoFixable ? '正在自动修复中...' : '技术团队正在处理...',
      statusIcon: translation.autoFixable ? '🔄' : '👨‍💻',

      estimatedMinutes: translation.estimatedMinutes,
      estimatedText: translation.estimatedMinutes < 10
        ? '几分钟'
        : translation.estimatedMinutes < 30
          ? `约${translation.estimatedMinutes}分钟`
          : `约${Math.round(translation.estimatedMinutes / 60)}小时`,

      steps: translation.recoverySteps.map((desc, index) => ({
        step: index + 1,
        description: desc,
        status: index === 0 ? 'in_progress' as const : 'pending' as const,
        statusIcon: index === 0 ? '🔄' : '⏳'
      })),

      progress: 10,

      assignedTo: translation.autoFixable ? undefined : '技术支持团队',
      contactAvailable: true
    }
  }

  private generateCompensationPlan(translation: ErrorTranslation): CompensationPlan {
    const options = []

    // 根据严重程度生成不同的补偿选项
    if (translation.estimatedMinutes > 30) {
      options.push({
        id: 'extend_week',
        type: 'extend' as const,
        title: '延长7天使用期',
        description: '作为补偿，您的订阅将延长7天',
        value: '7天',
        recommended: true
      })
    }

    options.push({
      id: 'extend_3days',
      type: 'extend' as const,
      title: '延长3天使用期',
      description: '您的订阅将延长3天',
      value: '3天',
      recommended: translation.estimatedMinutes <= 30
    })

    options.push({
      id: 'credit',
      type: 'credit' as const,
      title: '账户积分',
      description: '获得¥50账户积分，可用于下次购买',
      value: '¥50',
      recommended: false
    })

    return {
      eligible: true,
      reason: '由于本次问题影响了您的使用体验，我们提供以下补偿',
      options,
      autoApplied: {
        type: 'priority_support',
        description: '已为您开通优先技术支持通道'
      }
    }
  }

  private generateUserActions(
    translation: ErrorTranslation,
    recovery: RecoveryPlan
  ): UserAction[] {
    const actions: UserAction[] = []

    // 等待/刷新
    if (translation.autoFixable) {
      actions.push({
        id: 'wait',
        label: '稍等一下',
        icon: '⏳',
        type: 'primary',
        action: 'wait',
        enabled: true
      })
    }

    // 联系客服
    actions.push({
      id: 'contact',
      label: '联系客服',
      icon: '💬',
      type: 'secondary',
      action: 'contact',
      enabled: true
    })

    // 查看详情
    actions.push({
      id: 'details',
      label: '查看详情',
      icon: '📋',
      type: 'link',
      action: 'view_details',
      enabled: true
    })

    return actions
  }

  private generateTimeline(translation: ErrorTranslation): TimelineEvent[] {
    return [
      {
        time: new Date(),
        event: `发现问题：${translation.headline}`,
        icon: '⚠️',
        type: 'warning'
      },
      {
        time: new Date(),
        event: translation.autoFixable ? '已启动自动修复' : '已通知技术团队',
        icon: translation.autoFixable ? '🤖' : '👨‍💻',
        type: 'info'
      }
    ]
  }
}

// ============================================
// 导出单例
// ============================================

export const deploymentFailureTranslator = new DeploymentFailureTranslatorService()
