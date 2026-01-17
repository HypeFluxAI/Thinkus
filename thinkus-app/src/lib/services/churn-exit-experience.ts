/**
 * 流失再见流程服务
 *
 * 功能：
 * - 用户取消/流失时的优雅再见体验
 * - 收集流失原因以改进产品
 * - 提供挽留机会和数据导出
 */

// ============================================
// 类型定义
// ============================================

export type ChurnReason =
  | 'too_expensive'        // 太贵了
  | 'not_using'            // 用不上
  | 'missing_features'     // 缺少功能
  | 'bad_experience'       // 体验不好
  | 'found_alternative'    // 找到替代品
  | 'business_closed'      // 业务关闭
  | 'technical_issues'     // 技术问题
  | 'poor_support'         // 客服不好
  | 'temporary'            // 暂时不用
  | 'other'                // 其他原因

export type ExitStage =
  | 'intent'               // 表达意图
  | 'reason'               // 填写原因
  | 'offer'                // 挽留优惠
  | 'data_export'          // 数据导出
  | 'feedback'             // 最终反馈
  | 'farewell'             // 再见页面

export interface ExitSession {
  id: string
  userId: string
  userName: string
  projectId: string
  projectName: string
  subscriptionType: string
  monthsSubscribed: number
  currentStage: ExitStage
  reasons: ChurnReason[]
  reasonDetails?: string
  retentionOfferAccepted: boolean
  retentionOffer?: RetentionOffer
  dataExportRequested: boolean
  dataExportUrl?: string
  feedbackRating?: 1 | 2 | 3 | 4 | 5
  feedbackComment?: string
  completedAt?: Date
  outcome: 'cancelled' | 'retained' | 'paused' | 'pending'
  createdAt: Date
}

export interface RetentionOffer {
  id: string
  type: 'discount' | 'pause' | 'downgrade' | 'extension' | 'feature'
  title: string
  description: string
  value: string
  validDays: number
  code?: string
}

export interface ChurnAnalytics {
  totalChurned: number
  byReason: Record<ChurnReason, number>
  retentionRate: number
  averageFeedbackRating: number
  commonComplaints: string[]
  monthlyTrend: { month: string; churned: number; retained: number }[]
}

// ============================================
// 配置
// ============================================

const CHURN_REASONS: Record<ChurnReason, {
  label: string
  icon: string
  followUp: string
  retentionStrategy: 'discount' | 'feature' | 'support' | 'pause' | 'none'
}> = {
  too_expensive: {
    label: '价格太高',
    icon: '💰',
    followUp: '我们理解价格是重要考量。您觉得多少价格合适？',
    retentionStrategy: 'discount'
  },
  not_using: {
    label: '用不上',
    icon: '😴',
    followUp: '我们很遗憾听到这个。是什么阻止您使用呢？',
    retentionStrategy: 'pause'
  },
  missing_features: {
    label: '缺少需要的功能',
    icon: '🔧',
    followUp: '您需要什么功能？我们会优先考虑开发。',
    retentionStrategy: 'feature'
  },
  bad_experience: {
    label: '使用体验不好',
    icon: '😔',
    followUp: '我们很抱歉。能告诉我们哪里让您不满意吗？',
    retentionStrategy: 'support'
  },
  found_alternative: {
    label: '找到了更好的选择',
    icon: '🔄',
    followUp: '能告诉我们是什么产品吸引了您吗？',
    retentionStrategy: 'discount'
  },
  business_closed: {
    label: '业务不再需要',
    icon: '🏢',
    followUp: '祝您未来一切顺利！',
    retentionStrategy: 'none'
  },
  technical_issues: {
    label: '经常出问题',
    icon: '🐛',
    followUp: '非常抱歉给您带来困扰。能描述下遇到的问题吗？',
    retentionStrategy: 'support'
  },
  poor_support: {
    label: '客服支持不好',
    icon: '📞',
    followUp: '我们会认真改进。能告诉我们具体情况吗？',
    retentionStrategy: 'support'
  },
  temporary: {
    label: '暂时不需要',
    icon: '⏸️',
    followUp: '没问题！您可以暂停订阅，随时回来。',
    retentionStrategy: 'pause'
  },
  other: {
    label: '其他原因',
    icon: '💭',
    followUp: '能告诉我们具体原因吗？',
    retentionStrategy: 'none'
  }
}

const RETENTION_OFFERS: Record<string, RetentionOffer[]> = {
  discount: [
    {
      id: 'offer_50off_3m',
      type: 'discount',
      title: '50%折扣',
      description: '接下来3个月享受半价优惠',
      value: '50% off',
      validDays: 90
    }
  ],
  pause: [
    {
      id: 'offer_pause_3m',
      type: 'pause',
      title: '免费暂停',
      description: '暂停订阅3个月，数据完整保留',
      value: '3个月',
      validDays: 90
    }
  ],
  feature: [
    {
      id: 'offer_premium_1m',
      type: 'feature',
      title: '免费升级',
      description: '免费体验高级功能1个月',
      value: '高级版',
      validDays: 30
    }
  ],
  support: [
    {
      id: 'offer_vip_support',
      type: 'feature',
      title: 'VIP支持',
      description: '专属客服1对1支持',
      value: 'VIP',
      validDays: 30
    }
  ]
}

// ============================================
// 服务实现
// ============================================

export class ChurnExitExperienceService {

  getChurnReasonConfig(reason: ChurnReason) {
    return CHURN_REASONS[reason]
  }

  getAllReasons() {
    return Object.entries(CHURN_REASONS).map(([key, config]) => ({
      id: key as ChurnReason,
      ...config
    }))
  }

  // 开始退出流程
  async startExitSession(params: {
    userId: string
    userName: string
    projectId: string
    projectName: string
    subscriptionType: string
    monthsSubscribed: number
  }): Promise<ExitSession> {
    const sessionId = `exit_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`

    const session: ExitSession = {
      id: sessionId,
      ...params,
      currentStage: 'intent',
      reasons: [],
      retentionOfferAccepted: false,
      dataExportRequested: false,
      outcome: 'pending',
      createdAt: new Date()
    }

    // TODO: 存储到数据库

    return session
  }

  // 选择流失原因
  async selectReasons(sessionId: string, reasons: ChurnReason[], details?: string): Promise<ExitSession> {
    // TODO: 从数据库获取并更新
    const session: ExitSession = {
      id: sessionId,
      userId: '',
      userName: '',
      projectId: '',
      projectName: '',
      subscriptionType: '',
      monthsSubscribed: 0,
      currentStage: 'offer',
      reasons,
      reasonDetails: details,
      retentionOfferAccepted: false,
      dataExportRequested: false,
      outcome: 'pending',
      createdAt: new Date()
    }

    return session
  }

  // 获取挽留优惠
  getRetentionOffers(reasons: ChurnReason[]): RetentionOffer[] {
    const offers: RetentionOffer[] = []
    const strategies = new Set<string>()

    reasons.forEach(reason => {
      const config = CHURN_REASONS[reason]
      if (config.retentionStrategy !== 'none') {
        strategies.add(config.retentionStrategy)
      }
    })

    strategies.forEach(strategy => {
      const strategyOffers = RETENTION_OFFERS[strategy]
      if (strategyOffers) {
        offers.push(...strategyOffers)
      }
    })

    return offers
  }

  // 接受挽留优惠
  async acceptRetentionOffer(sessionId: string, offerId: string): Promise<ExitSession> {
    // TODO: 更新会话状态
    const session: ExitSession = {
      id: sessionId,
      userId: '',
      userName: '',
      projectId: '',
      projectName: '',
      subscriptionType: '',
      monthsSubscribed: 0,
      currentStage: 'farewell',
      reasons: [],
      retentionOfferAccepted: true,
      dataExportRequested: false,
      outcome: 'retained',
      createdAt: new Date(),
      completedAt: new Date()
    }

    return session
  }

  // 请求数据导出
  async requestDataExport(sessionId: string): Promise<string> {
    // TODO: 触发数据导出
    return `/api/exports/${sessionId}/download`
  }

  // 提交最终反馈
  async submitFeedback(sessionId: string, rating: 1 | 2 | 3 | 4 | 5, comment?: string): Promise<void> {
    // TODO: 存储反馈
    console.log(`Feedback for ${sessionId}: ${rating} stars, comment: ${comment}`)
  }

  // 完成退出
  async completeExit(sessionId: string): Promise<ExitSession> {
    // TODO: 更新会话并执行退出
    const session: ExitSession = {
      id: sessionId,
      userId: '',
      userName: '',
      projectId: '',
      projectName: '',
      subscriptionType: '',
      monthsSubscribed: 0,
      currentStage: 'farewell',
      reasons: [],
      retentionOfferAccepted: false,
      dataExportRequested: false,
      outcome: 'cancelled',
      createdAt: new Date(),
      completedAt: new Date()
    }

    return session
  }

  // 生成退出流程页面HTML
  generateExitFlowHtml(session: ExitSession): string {
    return `<!DOCTYPE html>
<html lang="zh-CN">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>取消订阅</title>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
      background: #F9FAFB;
      min-height: 100vh;
      display: flex;
      align-items: center;
      justify-content: center;
      padding: 20px;
    }

    .card {
      background: white;
      border-radius: 20px;
      padding: 48px;
      max-width: 520px;
      width: 100%;
      box-shadow: 0 4px 20px rgba(0,0,0,0.1);
    }

    .progress {
      display: flex;
      gap: 8px;
      margin-bottom: 32px;
    }
    .progress-step {
      flex: 1;
      height: 4px;
      background: #E5E7EB;
      border-radius: 2px;
    }
    .progress-step.active { background: #6366F1; }
    .progress-step.completed { background: #10B981; }

    .title {
      font-size: 24px;
      font-weight: 700;
      color: #1F2937;
      margin-bottom: 8px;
    }
    .subtitle {
      color: #6B7280;
      margin-bottom: 32px;
    }

    .reasons {
      display: grid;
      gap: 12px;
      margin-bottom: 24px;
    }
    .reason {
      display: flex;
      align-items: center;
      padding: 16px;
      border: 2px solid #E5E7EB;
      border-radius: 12px;
      cursor: pointer;
      transition: all 0.2s;
    }
    .reason:hover { border-color: #6366F1; }
    .reason.selected {
      border-color: #6366F1;
      background: #EEF2FF;
    }
    .reason-icon { font-size: 24px; margin-right: 16px; }
    .reason-label { flex: 1; font-weight: 500; color: #374151; }
    .reason-check {
      width: 24px;
      height: 24px;
      border: 2px solid #D1D5DB;
      border-radius: 6px;
    }
    .reason.selected .reason-check {
      background: #6366F1;
      border-color: #6366F1;
      color: white;
      display: flex;
      align-items: center;
      justify-content: center;
    }

    .textarea {
      width: 100%;
      padding: 16px;
      border: 2px solid #E5E7EB;
      border-radius: 12px;
      font-size: 16px;
      resize: none;
      height: 100px;
      margin-bottom: 24px;
    }
    .textarea:focus {
      outline: none;
      border-color: #6366F1;
    }

    .buttons {
      display: flex;
      gap: 12px;
    }
    .btn {
      flex: 1;
      padding: 14px;
      border-radius: 10px;
      font-size: 16px;
      font-weight: 600;
      cursor: pointer;
      border: none;
      transition: all 0.2s;
    }
    .btn-primary {
      background: #6366F1;
      color: white;
    }
    .btn-primary:hover { background: #4F46E5; }
    .btn-secondary {
      background: #F3F4F6;
      color: #374151;
    }
    .btn-secondary:hover { background: #E5E7EB; }
    .btn-danger {
      background: #EF4444;
      color: white;
    }

    .offer-card {
      background: linear-gradient(135deg, #FEF3C7 0%, #FDE68A 100%);
      border-radius: 16px;
      padding: 24px;
      margin-bottom: 24px;
      text-align: center;
    }
    .offer-title {
      font-size: 20px;
      font-weight: 700;
      color: #92400E;
      margin-bottom: 8px;
    }
    .offer-desc {
      color: #B45309;
      margin-bottom: 16px;
    }
    .offer-value {
      font-size: 32px;
      font-weight: 700;
      color: #92400E;
    }
  </style>
</head>
<body>
  <div class="card">
    <div class="progress">
      <div class="progress-step ${session.currentStage === 'intent' ? 'active' : 'completed'}"></div>
      <div class="progress-step ${session.currentStage === 'reason' ? 'active' : (session.reasons.length ? 'completed' : '')}"></div>
      <div class="progress-step ${session.currentStage === 'offer' ? 'active' : ''}"></div>
      <div class="progress-step ${session.currentStage === 'farewell' ? 'active' : ''}"></div>
    </div>

    ${session.currentStage === 'intent' ? `
      <h1 class="title">😢 真的要离开吗？</h1>
      <p class="subtitle">我们很遗憾听到这个消息。在您离开之前，能告诉我们原因吗？</p>

      <div class="buttons">
        <button class="btn btn-secondary" onclick="history.back()">再想想</button>
        <button class="btn btn-primary" onclick="nextStage('reason')">继续取消</button>
      </div>
    ` : ''}

    ${session.currentStage === 'reason' ? `
      <h1 class="title">选择离开的原因</h1>
      <p class="subtitle">您的反馈对我们非常重要，帮助我们改进产品</p>

      <div class="reasons">
        ${Object.entries(CHURN_REASONS).map(([key, config]) => `
          <div class="reason" onclick="toggleReason('${key}', this)">
            <span class="reason-icon">${config.icon}</span>
            <span class="reason-label">${config.label}</span>
            <span class="reason-check">✓</span>
          </div>
        `).join('')}
      </div>

      <textarea class="textarea" placeholder="还有什么想告诉我们的？（可选）"></textarea>

      <div class="buttons">
        <button class="btn btn-secondary" onclick="prevStage()">返回</button>
        <button class="btn btn-primary" onclick="nextStage('offer')">下一步</button>
      </div>
    ` : ''}

    ${session.currentStage === 'offer' ? `
      <h1 class="title">等等！我们有个提议</h1>
      <p class="subtitle">也许这个优惠能让您改变主意？</p>

      <div class="offer-card">
        <div class="offer-title">专属挽留优惠</div>
        <div class="offer-desc">接下来3个月享受</div>
        <div class="offer-value">50% 折扣</div>
      </div>

      <div class="buttons">
        <button class="btn btn-danger" onclick="nextStage('farewell')">不了，继续取消</button>
        <button class="btn btn-primary" onclick="acceptOffer()">接受优惠</button>
      </div>
    ` : ''}

    ${session.currentStage === 'farewell' ? `
      <div style="text-align: center;">
        <div style="font-size: 64px; margin-bottom: 24px;">👋</div>
        <h1 class="title">感谢一路相伴</h1>
        <p class="subtitle">您的数据将保留30天，随时欢迎回来！</p>

        <div style="background: #F3F4F6; border-radius: 12px; padding: 20px; margin: 24px 0; text-align: left;">
          <div style="font-weight: 600; color: #374151; margin-bottom: 12px;">离开前别忘了：</div>
          <div style="display: flex; align-items: center; gap: 8px; color: #6B7280; margin-bottom: 8px;">
            <span>📥</span>
            <a href="#" style="color: #6366F1;">下载您的所有数据</a>
          </div>
          <div style="display: flex; align-items: center; gap: 8px; color: #6B7280;">
            <span>⭐</span>
            <a href="#" style="color: #6366F1;">给我们留个评价</a>
          </div>
        </div>

        <button class="btn btn-primary" onclick="finish()" style="width: 100%;">
          完成取消
        </button>
      </div>
    ` : ''}
  </div>

  <script>
    let selectedReasons = [];

    function toggleReason(reason, element) {
      element.classList.toggle('selected');
      if (selectedReasons.includes(reason)) {
        selectedReasons = selectedReasons.filter(r => r !== reason);
      } else {
        selectedReasons.push(reason);
      }
    }

    function nextStage(stage) {
      location.href = '?stage=' + stage;
    }

    function prevStage() {
      history.back();
    }

    function acceptOffer() {
      alert('太好了！优惠已应用到您的账户。');
      location.href = '/dashboard';
    }

    function finish() {
      alert('取消已完成。感谢您的使用！');
      location.href = '/';
    }
  </script>
</body>
</html>`
  }

  // 生成告别邮件HTML
  generateFarewellEmailHtml(session: ExitSession): string {
    return `<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
</head>
<body style="margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; background: #F9FAFB;">
  <div style="max-width: 600px; margin: 0 auto; padding: 40px 20px;">
    <div style="background: white; border-radius: 16px; overflow: hidden; box-shadow: 0 4px 12px rgba(0,0,0,0.1);">
      <div style="background: #374151; padding: 40px; text-align: center; color: white;">
        <div style="font-size: 48px; margin-bottom: 16px;">👋</div>
        <h1 style="margin: 0; font-size: 24px;">再见，${session.userName}</h1>
      </div>

      <div style="padding: 40px;">
        <p style="color: #374151; font-size: 16px; line-height: 1.6; margin-bottom: 24px;">
          感谢您在过去 ${session.monthsSubscribed} 个月里使用我们的服务。虽然您决定离开，但我们依然感激您的信任。
        </p>

        <div style="background: #F3F4F6; border-radius: 12px; padding: 20px; margin-bottom: 24px;">
          <p style="color: #374151; font-weight: 600; margin-bottom: 12px;">重要提醒：</p>
          <ul style="color: #6B7280; padding-left: 20px; margin: 0;">
            <li style="margin-bottom: 8px;">您的数据将保留30天</li>
            <li style="margin-bottom: 8px;">您可以随时下载所有数据</li>
            <li>如果改变主意，随时欢迎回来</li>
          </ul>
        </div>

        <div style="text-align: center; margin-bottom: 24px;">
          <a href="https://app.thinkus.com/export"
             style="display: inline-block; background: #6366F1; color: white; padding: 14px 32px; border-radius: 10px; text-decoration: none; font-weight: 600;">
            下载我的数据
          </a>
        </div>

        <p style="color: #6B7280; font-size: 14px; text-align: center;">
          如果您愿意告诉我们可以改进的地方，请
          <a href="#" style="color: #6366F1;">点击这里</a>
        </p>
      </div>

      <div style="background: #F9FAFB; padding: 24px; text-align: center;">
        <p style="color: #9CA3AF; font-size: 13px; margin-bottom: 8px;">
          有任何问题？随时联系我们 support@thinkus.com
        </p>
        <p style="color: #9CA3AF; font-size: 13px; margin: 0;">
          再见，希望未来能再次相见！
        </p>
      </div>
    </div>
  </div>
</body>
</html>`
  }

  // 获取流失分析
  async getChurnAnalytics(projectId?: string): Promise<ChurnAnalytics> {
    // TODO: 从数据库获取真实数据
    return {
      totalChurned: 45,
      byReason: {
        too_expensive: 15,
        not_using: 12,
        missing_features: 8,
        bad_experience: 3,
        found_alternative: 4,
        business_closed: 2,
        technical_issues: 0,
        poor_support: 0,
        temporary: 1,
        other: 0
      },
      retentionRate: 0.35,
      averageFeedbackRating: 3.2,
      commonComplaints: ['价格太高', '功能不够用', '界面复杂'],
      monthlyTrend: [
        { month: '10月', churned: 10, retained: 3 },
        { month: '11月', churned: 15, retained: 6 },
        { month: '12月', churned: 20, retained: 8 }
      ]
    }
  }
}

export const churnExitExperience = new ChurnExitExperienceService()
