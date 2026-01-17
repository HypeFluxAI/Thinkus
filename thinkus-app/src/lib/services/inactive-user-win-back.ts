/**
 * 赢回不活跃用户服务
 *
 * 功能：
 * - 识别不活跃用户
 * - 自动发送唤醒消息
 * - 提供特别优惠促进回归
 */

// ============================================
// 类型定义
// ============================================

export type InactivityLevel =
  | 'mild'        // 轻度不活跃（7-14天）
  | 'moderate'    // 中度不活跃（15-30天）
  | 'severe'      // 重度不活跃（31-60天）
  | 'critical'    // 严重不活跃（60天以上）

export type WinBackActionType =
  | 'email'           // 邮件提醒
  | 'sms'             // 短信提醒
  | 'push'            // 推送通知
  | 'phone_call'      // 电话回访
  | 'special_offer'   // 特别优惠
  | 'personal_touch'  // 个性化关怀

export interface InactiveUser {
  userId: string
  userName: string
  email: string
  phone?: string
  projectId: string
  projectName: string
  lastActiveAt: Date
  daysSinceActive: number
  inactivityLevel: InactivityLevel
  previousActivity: {
    loginCount: number
    featuresUsed: string[]
    lastAction: string
  }
  winBackAttempts: WinBackAttempt[]
  status: 'active' | 'at_risk' | 'inactive' | 'churned' | 'won_back'
}

export interface WinBackAttempt {
  id: string
  timestamp: Date
  actionType: WinBackActionType
  message: string
  offerCode?: string
  opened: boolean
  clicked: boolean
  converted: boolean
  responseMessage?: string
}

export interface WinBackCampaign {
  id: string
  name: string
  targetLevel: InactivityLevel
  actions: {
    day: number           // 触发天数
    type: WinBackActionType
    templateId: string
  }[]
  offer?: {
    type: 'discount' | 'extension' | 'upgrade' | 'feature'
    value: string
    code: string
    expirationDays: number
  }
  isActive: boolean
}

export interface WinBackOffer {
  code: string
  type: 'discount' | 'extension' | 'upgrade' | 'feature'
  value: string
  description: string
  expiresAt: Date
  usedAt?: Date
}

// ============================================
// 配置
// ============================================

const INACTIVITY_CONFIG: Record<InactivityLevel, {
  label: string
  icon: string
  color: string
  dayRange: [number, number]
  urgency: 'low' | 'medium' | 'high' | 'critical'
  defaultActions: WinBackActionType[]
}> = {
  mild: {
    label: '轻度不活跃',
    icon: '😴',
    color: '#F59E0B',
    dayRange: [7, 14],
    urgency: 'low',
    defaultActions: ['email', 'push']
  },
  moderate: {
    label: '中度不活跃',
    icon: '😔',
    color: '#EF4444',
    dayRange: [15, 30],
    urgency: 'medium',
    defaultActions: ['email', 'sms', 'special_offer']
  },
  severe: {
    label: '重度不活跃',
    icon: '😢',
    color: '#DC2626',
    dayRange: [31, 60],
    urgency: 'high',
    defaultActions: ['phone_call', 'special_offer', 'personal_touch']
  },
  critical: {
    label: '严重流失风险',
    icon: '🆘',
    color: '#991B1B',
    dayRange: [61, Infinity],
    urgency: 'critical',
    defaultActions: ['phone_call', 'personal_touch', 'special_offer']
  }
}

const WIN_BACK_TEMPLATES: Record<InactivityLevel, {
  email: { subject: string; body: string }
  sms: string
  offer: { type: 'discount' | 'extension'; value: string }
}> = {
  mild: {
    email: {
      subject: '好久不见，{userName}！',
      body: '我们注意到您已经{days}天没有登录了，一切都还好吗？您的项目「{projectName}」正在等您回来哦！'
    },
    sms: '【Thinkus】{userName}，好久不见！您的项目「{projectName}」正在等您回来~',
    offer: { type: 'extension', value: '7天' }
  },
  moderate: {
    email: {
      subject: '{userName}，我们想念您！',
      body: '您已经{days}天没有登录了，我们准备了一份小礼物送给您！使用优惠码 {offerCode} 可获得额外优惠。'
    },
    sms: '【Thinkus】{userName}，送您一份小礼物！使用优惠码 {offerCode} 享受特别优惠。回T退订',
    offer: { type: 'discount', value: '20%' }
  },
  severe: {
    email: {
      subject: '专属于您的特别优惠，{userName}',
      body: '作为老用户，我们为您准备了专属优惠。您的项目「{projectName}」所有功能依然完好保留，随时欢迎回来！'
    },
    sms: '【Thinkus】{userName}，专属于您的30%优惠！使用优惠码 {offerCode}，有效期3天。回T退订',
    offer: { type: 'discount', value: '30%' }
  },
  critical: {
    email: {
      subject: '最后的挽留，{userName}',
      body: '我们真的很希望您能回来。我们特别为您准备了50%的优惠，这是我们能提供的最大诚意。如果您有任何顾虑，请随时告诉我们。'
    },
    sms: '【Thinkus】{userName}，最后的诚意：50%优惠！优惠码 {offerCode}，仅剩24小时。回T退订',
    offer: { type: 'discount', value: '50%' }
  }
}

// ============================================
// 服务实现
// ============================================

export class InactiveUserWinBackService {

  getInactivityConfig(level: InactivityLevel) {
    return INACTIVITY_CONFIG[level]
  }

  // 计算不活跃级别
  calculateInactivityLevel(daysSinceActive: number): InactivityLevel {
    if (daysSinceActive <= 14) return 'mild'
    if (daysSinceActive <= 30) return 'moderate'
    if (daysSinceActive <= 60) return 'severe'
    return 'critical'
  }

  // 获取不活跃用户列表
  async getInactiveUsers(params?: {
    level?: InactivityLevel
    projectId?: string
    limit?: number
  }): Promise<InactiveUser[]> {
    // TODO: 从数据库查询
    return []
  }

  // 发起赢回尝试
  async initiateWinBack(params: {
    userId: string
    actionType: WinBackActionType
    includeOffer?: boolean
  }): Promise<WinBackAttempt> {
    const attemptId = `attempt_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`

    // 生成优惠码
    let offerCode: string | undefined
    if (params.includeOffer) {
      offerCode = this.generateOfferCode()
    }

    const attempt: WinBackAttempt = {
      id: attemptId,
      timestamp: new Date(),
      actionType: params.actionType,
      message: '',
      offerCode,
      opened: false,
      clicked: false,
      converted: false
    }

    // TODO: 执行实际的发送操作

    return attempt
  }

  // 生成优惠码
  private generateOfferCode(): string {
    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'
    let code = 'WINBACK'
    for (let i = 0; i < 4; i++) {
      code += chars.charAt(Math.floor(Math.random() * chars.length))
    }
    return code
  }

  // 创建自动赢回活动
  async createCampaign(params: {
    name: string
    targetLevel: InactivityLevel
    actions: WinBackCampaign['actions']
    offer?: WinBackCampaign['offer']
  }): Promise<WinBackCampaign> {
    const campaignId = `campaign_${Date.now()}`

    const campaign: WinBackCampaign = {
      id: campaignId,
      ...params,
      isActive: true
    }

    // TODO: 存储到数据库

    return campaign
  }

  // 处理优惠码使用
  async redeemOffer(code: string, userId: string): Promise<{
    success: boolean
    offer?: WinBackOffer
    error?: string
  }> {
    // TODO: 验证并使用优惠码
    return {
      success: true,
      offer: {
        code,
        type: 'discount',
        value: '20%',
        description: '续费享8折优惠',
        expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
        usedAt: new Date()
      }
    }
  }

  // 生成赢回邮件HTML
  generateWinBackEmailHtml(params: {
    userName: string
    projectName: string
    daysSinceActive: number
    level: InactivityLevel
    offerCode?: string
  }): string {
    const template = WIN_BACK_TEMPLATES[params.level]
    const config = INACTIVITY_CONFIG[params.level]

    const subject = template.email.subject
      .replace('{userName}', params.userName)
    const body = template.email.body
      .replace('{userName}', params.userName)
      .replace('{projectName}', params.projectName)
      .replace('{days}', params.daysSinceActive.toString())
      .replace('{offerCode}', params.offerCode || '')

    return `<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
</head>
<body style="margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; background: #F9FAFB;">
  <div style="max-width: 600px; margin: 0 auto; padding: 40px 20px;">
    <div style="background: white; border-radius: 16px; overflow: hidden; box-shadow: 0 4px 12px rgba(0,0,0,0.1);">
      <div style="background: linear-gradient(135deg, #6366F1 0%, #8B5CF6 100%); padding: 40px; text-align: center; color: white;">
        <div style="font-size: 48px; margin-bottom: 16px;">${config.icon}</div>
        <h1 style="margin: 0; font-size: 24px;">${subject}</h1>
      </div>

      <div style="padding: 40px;">
        <p style="color: #374151; font-size: 16px; line-height: 1.6; margin-bottom: 24px;">
          亲爱的 ${params.userName}，
        </p>

        <p style="color: #6B7280; font-size: 16px; line-height: 1.6; margin-bottom: 24px;">
          ${body}
        </p>

        ${params.offerCode ? `
          <div style="background: #FEF3C7; border-radius: 12px; padding: 24px; text-align: center; margin-bottom: 24px;">
            <div style="font-size: 14px; color: #92400E; margin-bottom: 8px;">您的专属优惠码</div>
            <div style="font-size: 28px; font-weight: 700; color: #92400E; letter-spacing: 4px;">
              ${params.offerCode}
            </div>
            <div style="font-size: 14px; color: #B45309; margin-top: 8px;">
              ${template.offer.type === 'discount' ? `享受${template.offer.value}折扣` : `延长${template.offer.value}有效期`}
            </div>
          </div>
        ` : ''}

        <div style="text-align: center;">
          <a href="https://app.thinkus.com/login"
             style="display: inline-block; background: #6366F1; color: white; padding: 14px 48px; border-radius: 10px; text-decoration: none; font-weight: 600;">
            立即回来看看
          </a>
        </div>
      </div>

      <div style="background: #F9FAFB; padding: 24px; text-align: center;">
        <p style="color: #9CA3AF; font-size: 13px; margin: 0;">
          如果您不想再收到此类邮件，请
          <a href="#" style="color: #6B7280;">取消订阅</a>
        </p>
      </div>
    </div>
  </div>
</body>
</html>`
  }

  // 生成赢回仪表盘HTML
  generateDashboardHtml(stats: {
    totalInactive: number
    byLevel: Record<InactivityLevel, number>
    wonBackThisMonth: number
    conversionRate: number
  }): string {
    return `<!DOCTYPE html>
<html lang="zh-CN">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>用户赢回仪表盘</title>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
      background: #F9FAFB;
      padding: 40px 20px;
    }

    .container { max-width: 1000px; margin: 0 auto; }

    .header {
      margin-bottom: 32px;
    }
    .title {
      font-size: 28px;
      font-weight: 700;
      color: #1F2937;
      margin-bottom: 8px;
    }
    .subtitle { color: #6B7280; }

    .stats-grid {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
      gap: 20px;
      margin-bottom: 32px;
    }
    .stat-card {
      background: white;
      border-radius: 16px;
      padding: 24px;
      box-shadow: 0 1px 3px rgba(0,0,0,0.1);
    }
    .stat-value {
      font-size: 36px;
      font-weight: 700;
      color: #1F2937;
      margin-bottom: 8px;
    }
    .stat-label {
      font-size: 14px;
      color: #6B7280;
    }

    .levels-section {
      background: white;
      border-radius: 16px;
      padding: 24px;
      margin-bottom: 32px;
    }
    .section-title {
      font-size: 18px;
      font-weight: 600;
      color: #1F2937;
      margin-bottom: 20px;
    }

    .level-bars {
      display: flex;
      flex-direction: column;
      gap: 16px;
    }
    .level-bar {
      display: flex;
      align-items: center;
      gap: 16px;
    }
    .level-info {
      width: 160px;
      display: flex;
      align-items: center;
      gap: 8px;
    }
    .level-icon { font-size: 20px; }
    .level-name { font-weight: 500; color: #374151; }
    .level-progress {
      flex: 1;
      height: 24px;
      background: #E5E7EB;
      border-radius: 12px;
      overflow: hidden;
    }
    .level-fill {
      height: 100%;
      border-radius: 12px;
      display: flex;
      align-items: center;
      padding: 0 12px;
      color: white;
      font-size: 14px;
      font-weight: 500;
    }
    .level-count {
      width: 60px;
      text-align: right;
      font-weight: 600;
      color: #374151;
    }

    .actions-section {
      background: white;
      border-radius: 16px;
      padding: 24px;
    }
    .action-btn {
      display: inline-flex;
      align-items: center;
      gap: 8px;
      background: #6366F1;
      color: white;
      border: none;
      padding: 12px 24px;
      border-radius: 10px;
      font-weight: 500;
      cursor: pointer;
      margin-right: 12px;
      margin-bottom: 12px;
    }
    .action-btn:hover { background: #4F46E5; }
    .action-btn.secondary {
      background: #F3F4F6;
      color: #374151;
    }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1 class="title">📊 用户赢回仪表盘</h1>
      <p class="subtitle">追踪和挽回不活跃用户</p>
    </div>

    <div class="stats-grid">
      <div class="stat-card">
        <div class="stat-value">${stats.totalInactive}</div>
        <div class="stat-label">不活跃用户总数</div>
      </div>
      <div class="stat-card">
        <div class="stat-value" style="color: #10B981">${stats.wonBackThisMonth}</div>
        <div class="stat-label">本月已赢回</div>
      </div>
      <div class="stat-card">
        <div class="stat-value">${(stats.conversionRate * 100).toFixed(1)}%</div>
        <div class="stat-label">赢回转化率</div>
      </div>
    </div>

    <div class="levels-section">
      <h2 class="section-title">按不活跃程度分布</h2>
      <div class="level-bars">
        ${Object.entries(INACTIVITY_CONFIG).map(([level, config]) => {
          const count = stats.byLevel[level as InactivityLevel] || 0
          const maxCount = Math.max(...Object.values(stats.byLevel))
          const percentage = maxCount > 0 ? (count / maxCount) * 100 : 0
          return `
            <div class="level-bar">
              <div class="level-info">
                <span class="level-icon">${config.icon}</span>
                <span class="level-name">${config.label}</span>
              </div>
              <div class="level-progress">
                <div class="level-fill" style="width: ${percentage}%; background: ${config.color};">
                  ${percentage > 20 ? count + '人' : ''}
                </div>
              </div>
              <div class="level-count">${count}人</div>
            </div>
          `
        }).join('')}
      </div>
    </div>

    <div class="actions-section">
      <h2 class="section-title">快速操作</h2>
      <button class="action-btn" onclick="sendBatchEmails()">
        ✉️ 批量发送邮件
      </button>
      <button class="action-btn" onclick="createCampaign()">
        🎯 创建赢回活动
      </button>
      <button class="action-btn secondary" onclick="exportUsers()">
        📥 导出用户列表
      </button>
    </div>
  </div>

  <script>
    function sendBatchEmails() { alert('开始发送...'); }
    function createCampaign() { location.href = '/win-back/campaign/new'; }
    function exportUsers() { alert('开始导出...'); }
  </script>
</body>
</html>`
  }
}

export const inactiveUserWinBack = new InactiveUserWinBackService()
