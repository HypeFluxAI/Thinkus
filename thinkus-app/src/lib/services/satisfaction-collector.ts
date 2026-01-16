/**
 * 满意度收集服务
 *
 * 交付后收集用户反馈
 * - NPS评分
 * - 多维度满意度
 * - 问题收集
 * - 改进建议
 */

// ============================================================================
// 类型定义
// ============================================================================

/** 评分类型 */
export type RatingType = 'nps' | 'csat' | 'ces'

/** 评分维度 */
export type SatisfactionDimension =
  | 'overall'          // 总体满意度
  | 'quality'          // 产品质量
  | 'delivery_speed'   // 交付速度
  | 'communication'    // 沟通服务
  | 'support'          // 技术支持
  | 'value'            // 性价比
  | 'ease_of_use'      // 易用性

/** 反馈状态 */
export type FeedbackStatus = 'pending' | 'submitted' | 'acknowledged' | 'resolved'

/** NPS分组 */
export type NPSCategory = 'promoter' | 'passive' | 'detractor'

/** 满意度调查 */
export interface SatisfactionSurvey {
  id: string
  projectId: string
  userId: string
  userEmail: string
  userName: string

  // 调查配置
  type: RatingType
  dimensions: SatisfactionDimension[]
  triggerEvent: 'delivery' | 'week_1' | 'month_1' | 'month_3' | 'manual'

  // 状态
  status: FeedbackStatus
  sentAt: Date
  submittedAt?: Date
  expiresAt: Date

  // 结果
  responses?: SurveyResponse
}

/** 调查回复 */
export interface SurveyResponse {
  // NPS评分 (0-10)
  npsScore?: number
  npsCategory?: NPSCategory

  // 维度评分 (1-5)
  dimensionScores: {
    dimension: SatisfactionDimension
    score: number
    comment?: string
  }[]

  // 开放问题
  whatWentWell?: string
  whatCouldImprove?: string
  wouldRecommend?: boolean
  additionalComments?: string

  // 元数据
  submittedAt: Date
  timeSpent: number  // 填写耗时(秒)
  source: 'email' | 'in_app' | 'link'
}

/** 满意度统计 */
export interface SatisfactionStats {
  // 总览
  totalSurveys: number
  responseCount: number
  responseRate: number

  // NPS
  npsScore: number
  npsDistribution: {
    promoters: number
    passives: number
    detractors: number
  }

  // 维度平均分
  dimensionAverages: {
    dimension: SatisfactionDimension
    average: number
    count: number
  }[]

  // 趋势
  trend: {
    period: string
    npsScore: number
    responseCount: number
  }[]

  // 常见反馈
  topPositives: string[]
  topNegatives: string[]
}

/** 改进建议 */
export interface ImprovementSuggestion {
  id: string
  projectId?: string  // 特定项目或通用
  dimension: SatisfactionDimension
  source: 'user_feedback' | 'ai_analysis' | 'manual'
  suggestion: string
  priority: 'high' | 'medium' | 'low'
  status: 'new' | 'reviewing' | 'planned' | 'implemented' | 'rejected'
  createdAt: Date
  reviewedAt?: Date
  implementedAt?: Date
}

/** 调查模板 */
export interface SurveyTemplate {
  id: string
  name: string
  type: RatingType
  dimensions: SatisfactionDimension[]
  questions: SurveyQuestion[]
  defaultTrigger: SatisfactionSurvey['triggerEvent']
}

/** 调查问题 */
export interface SurveyQuestion {
  id: string
  dimension?: SatisfactionDimension
  question: string
  type: 'rating' | 'text' | 'boolean' | 'select'
  required: boolean
  options?: string[]
}

// ============================================================================
// 配置
// ============================================================================

/** 维度配置 */
const DIMENSION_CONFIG: Record<SatisfactionDimension, {
  label: string
  icon: string
  description: string
  question: string
}> = {
  overall: {
    label: '总体满意度',
    icon: '⭐',
    description: '对整体交付的满意程度',
    question: '您对本次产品交付的总体满意度如何？'
  },
  quality: {
    label: '产品质量',
    icon: '💎',
    description: '产品功能和稳定性',
    question: '您对产品的功能完整性和稳定性满意吗？'
  },
  delivery_speed: {
    label: '交付速度',
    icon: '⚡',
    description: '从下单到交付的时间',
    question: '您对交付速度满意吗？'
  },
  communication: {
    label: '沟通服务',
    icon: '💬',
    description: '过程中的沟通和响应',
    question: '您对过程中的沟通和响应满意吗？'
  },
  support: {
    label: '技术支持',
    icon: '🔧',
    description: '问题解决和技术指导',
    question: '您对技术支持服务满意吗？'
  },
  value: {
    label: '性价比',
    icon: '💰',
    description: '价格与价值的匹配度',
    question: '您认为产品的性价比如何？'
  },
  ease_of_use: {
    label: '易用性',
    icon: '👆',
    description: '产品是否容易上手使用',
    question: '您觉得产品容易使用吗？'
  }
}

/** NPS问题 */
const NPS_QUESTION = '您有多大可能向朋友或同事推荐我们？'

/** 默认调查模板 */
const DEFAULT_TEMPLATES: SurveyTemplate[] = [
  {
    id: 'delivery_survey',
    name: '交付满意度调查',
    type: 'nps',
    dimensions: ['overall', 'quality', 'delivery_speed', 'communication'],
    questions: [
      { id: 'nps', question: NPS_QUESTION, type: 'rating', required: true },
      { id: 'overall', dimension: 'overall', question: DIMENSION_CONFIG.overall.question, type: 'rating', required: true },
      { id: 'quality', dimension: 'quality', question: DIMENSION_CONFIG.quality.question, type: 'rating', required: true },
      { id: 'delivery_speed', dimension: 'delivery_speed', question: DIMENSION_CONFIG.delivery_speed.question, type: 'rating', required: true },
      { id: 'communication', dimension: 'communication', question: DIMENSION_CONFIG.communication.question, type: 'rating', required: true },
      { id: 'positive', question: '您觉得哪些方面做得好？', type: 'text', required: false },
      { id: 'improve', question: '您觉得哪些方面可以改进？', type: 'text', required: false },
      { id: 'recommend', question: '您愿意推荐我们给朋友吗？', type: 'boolean', required: false }
    ],
    defaultTrigger: 'delivery'
  },
  {
    id: 'usage_survey',
    name: '使用体验调查',
    type: 'csat',
    dimensions: ['ease_of_use', 'support', 'value'],
    questions: [
      { id: 'ease', dimension: 'ease_of_use', question: DIMENSION_CONFIG.ease_of_use.question, type: 'rating', required: true },
      { id: 'support', dimension: 'support', question: DIMENSION_CONFIG.support.question, type: 'rating', required: true },
      { id: 'value', dimension: 'value', question: DIMENSION_CONFIG.value.question, type: 'rating', required: true },
      { id: 'issues', question: '您在使用中遇到了什么问题？', type: 'text', required: false },
      { id: 'suggestions', question: '您有什么建议？', type: 'text', required: false }
    ],
    defaultTrigger: 'week_1'
  }
]

// ============================================================================
// 辅助函数
// ============================================================================

function generateId(): string {
  return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`
}

function getNPSCategory(score: number): NPSCategory {
  if (score >= 9) return 'promoter'
  if (score >= 7) return 'passive'
  return 'detractor'
}

function calculateNPSScore(responses: SurveyResponse[]): number {
  if (responses.length === 0) return 0

  const promoters = responses.filter(r => r.npsCategory === 'promoter').length
  const detractors = responses.filter(r => r.npsCategory === 'detractor').length

  return Math.round(((promoters - detractors) / responses.length) * 100)
}

// ============================================================================
// 满意度收集服务
// ============================================================================

export class SatisfactionCollectorService {
  // 模拟存储
  private surveys: SatisfactionSurvey[] = []
  private suggestions: ImprovementSuggestion[] = []
  private templates: SurveyTemplate[] = [...DEFAULT_TEMPLATES]

  /**
   * 创建调查
   */
  createSurvey(input: {
    projectId: string
    userId: string
    userEmail: string
    userName: string
    templateId?: string
    triggerEvent?: SatisfactionSurvey['triggerEvent']
  }): SatisfactionSurvey {
    const template = input.templateId
      ? this.templates.find(t => t.id === input.templateId)
      : this.templates[0]

    if (!template) {
      throw new Error('调查模板不存在')
    }

    const survey: SatisfactionSurvey = {
      id: generateId(),
      projectId: input.projectId,
      userId: input.userId,
      userEmail: input.userEmail,
      userName: input.userName,
      type: template.type,
      dimensions: template.dimensions,
      triggerEvent: input.triggerEvent || template.defaultTrigger,
      status: 'pending',
      sentAt: new Date(),
      expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000)  // 7天有效
    }

    this.surveys.push(survey)
    return survey
  }

  /**
   * 提交调查回复
   */
  submitResponse(surveyId: string, response: Omit<SurveyResponse, 'submittedAt'>): SatisfactionSurvey | null {
    const survey = this.surveys.find(s => s.id === surveyId)
    if (!survey) return null

    // 计算NPS分类
    let npsCategory: NPSCategory | undefined
    if (response.npsScore !== undefined) {
      npsCategory = getNPSCategory(response.npsScore)
    }

    survey.responses = {
      ...response,
      npsScore: response.npsScore,
      npsCategory,
      submittedAt: new Date()
    }
    survey.status = 'submitted'
    survey.submittedAt = new Date()

    // 分析反馈生成改进建议
    this.analyzeAndGenerateSuggestions(survey)

    return survey
  }

  /**
   * 分析反馈生成改进建议
   */
  private analyzeAndGenerateSuggestions(survey: SatisfactionSurvey): void {
    if (!survey.responses) return

    // 检查低分维度
    for (const score of survey.responses.dimensionScores) {
      if (score.score <= 2) {
        this.suggestions.push({
          id: generateId(),
          projectId: survey.projectId,
          dimension: score.dimension,
          source: 'user_feedback',
          suggestion: `用户对${DIMENSION_CONFIG[score.dimension].label}评分较低(${score.score}/5)${score.comment ? `: "${score.comment}"` : ''}`,
          priority: score.score === 1 ? 'high' : 'medium',
          status: 'new',
          createdAt: new Date()
        })
      }
    }

    // 提取改进意见
    if (survey.responses.whatCouldImprove) {
      this.suggestions.push({
        id: generateId(),
        projectId: survey.projectId,
        dimension: 'overall',
        source: 'user_feedback',
        suggestion: survey.responses.whatCouldImprove,
        priority: 'medium',
        status: 'new',
        createdAt: new Date()
      })
    }
  }

  /**
   * 获取项目满意度统计
   */
  getProjectStats(projectId: string): SatisfactionStats {
    const projectSurveys = this.surveys.filter(s => s.projectId === projectId)
    const submittedSurveys = projectSurveys.filter(s => s.responses)

    // NPS统计
    const npsResponses = submittedSurveys.filter(s => s.responses?.npsScore !== undefined)
    const npsScore = calculateNPSScore(npsResponses.map(s => s.responses!))

    const promoters = npsResponses.filter(s => s.responses?.npsCategory === 'promoter').length
    const passives = npsResponses.filter(s => s.responses?.npsCategory === 'passive').length
    const detractors = npsResponses.filter(s => s.responses?.npsCategory === 'detractor').length

    // 维度平均分
    const dimensionAverages: SatisfactionStats['dimensionAverages'] = []
    for (const dimension of Object.keys(DIMENSION_CONFIG) as SatisfactionDimension[]) {
      const scores = submittedSurveys
        .flatMap(s => s.responses?.dimensionScores || [])
        .filter(ds => ds.dimension === dimension)

      if (scores.length > 0) {
        const avg = scores.reduce((sum, s) => sum + s.score, 0) / scores.length
        dimensionAverages.push({
          dimension,
          average: avg,
          count: scores.length
        })
      }
    }

    // 收集正面和负面反馈
    const positives: string[] = []
    const negatives: string[] = []

    for (const survey of submittedSurveys) {
      if (survey.responses?.whatWentWell) {
        positives.push(survey.responses.whatWentWell)
      }
      if (survey.responses?.whatCouldImprove) {
        negatives.push(survey.responses.whatCouldImprove)
      }
    }

    return {
      totalSurveys: projectSurveys.length,
      responseCount: submittedSurveys.length,
      responseRate: projectSurveys.length > 0
        ? (submittedSurveys.length / projectSurveys.length) * 100
        : 0,
      npsScore,
      npsDistribution: { promoters, passives, detractors },
      dimensionAverages,
      trend: [],  // 简化，实际应按时间分组
      topPositives: positives.slice(0, 5),
      topNegatives: negatives.slice(0, 5)
    }
  }

  /**
   * 获取全局满意度统计
   */
  getGlobalStats(): SatisfactionStats {
    const submittedSurveys = this.surveys.filter(s => s.responses)

    // NPS统计
    const npsResponses = submittedSurveys.filter(s => s.responses?.npsScore !== undefined)
    const npsScore = calculateNPSScore(npsResponses.map(s => s.responses!))

    const promoters = npsResponses.filter(s => s.responses?.npsCategory === 'promoter').length
    const passives = npsResponses.filter(s => s.responses?.npsCategory === 'passive').length
    const detractors = npsResponses.filter(s => s.responses?.npsCategory === 'detractor').length

    // 维度平均分
    const dimensionAverages: SatisfactionStats['dimensionAverages'] = []
    for (const dimension of Object.keys(DIMENSION_CONFIG) as SatisfactionDimension[]) {
      const scores = submittedSurveys
        .flatMap(s => s.responses?.dimensionScores || [])
        .filter(ds => ds.dimension === dimension)

      if (scores.length > 0) {
        const avg = scores.reduce((sum, s) => sum + s.score, 0) / scores.length
        dimensionAverages.push({
          dimension,
          average: avg,
          count: scores.length
        })
      }
    }

    // 按月分组趋势
    const trend: SatisfactionStats['trend'] = []
    const monthGroups = new Map<string, SatisfactionSurvey[]>()

    for (const survey of submittedSurveys) {
      const monthKey = survey.submittedAt
        ? `${survey.submittedAt.getFullYear()}-${String(survey.submittedAt.getMonth() + 1).padStart(2, '0')}`
        : null
      if (monthKey) {
        if (!monthGroups.has(monthKey)) {
          monthGroups.set(monthKey, [])
        }
        monthGroups.get(monthKey)!.push(survey)
      }
    }

    for (const [period, surveys] of monthGroups) {
      const monthNpsResponses = surveys.filter(s => s.responses?.npsScore !== undefined)
      trend.push({
        period,
        npsScore: calculateNPSScore(monthNpsResponses.map(s => s.responses!)),
        responseCount: surveys.length
      })
    }

    // 收集常见反馈
    const positives: string[] = []
    const negatives: string[] = []

    for (const survey of submittedSurveys) {
      if (survey.responses?.whatWentWell) {
        positives.push(survey.responses.whatWentWell)
      }
      if (survey.responses?.whatCouldImprove) {
        negatives.push(survey.responses.whatCouldImprove)
      }
    }

    return {
      totalSurveys: this.surveys.length,
      responseCount: submittedSurveys.length,
      responseRate: this.surveys.length > 0
        ? (submittedSurveys.length / this.surveys.length) * 100
        : 0,
      npsScore,
      npsDistribution: { promoters, passives, detractors },
      dimensionAverages,
      trend: trend.sort((a, b) => a.period.localeCompare(b.period)),
      topPositives: positives.slice(0, 5),
      topNegatives: negatives.slice(0, 5)
    }
  }

  /**
   * 获取改进建议
   */
  getSuggestions(filter?: {
    projectId?: string
    dimension?: SatisfactionDimension
    status?: ImprovementSuggestion['status']
    priority?: ImprovementSuggestion['priority']
  }): ImprovementSuggestion[] {
    let result = [...this.suggestions]

    if (filter?.projectId) {
      result = result.filter(s => s.projectId === filter.projectId)
    }
    if (filter?.dimension) {
      result = result.filter(s => s.dimension === filter.dimension)
    }
    if (filter?.status) {
      result = result.filter(s => s.status === filter.status)
    }
    if (filter?.priority) {
      result = result.filter(s => s.priority === filter.priority)
    }

    return result.sort((a, b) => {
      const priorityOrder = { high: 0, medium: 1, low: 2 }
      return priorityOrder[a.priority] - priorityOrder[b.priority]
    })
  }

  /**
   * 更新建议状态
   */
  updateSuggestionStatus(
    suggestionId: string,
    status: ImprovementSuggestion['status']
  ): ImprovementSuggestion | null {
    const suggestion = this.suggestions.find(s => s.id === suggestionId)
    if (!suggestion) return null

    suggestion.status = status

    if (status === 'reviewing') {
      suggestion.reviewedAt = new Date()
    } else if (status === 'implemented') {
      suggestion.implementedAt = new Date()
    }

    return suggestion
  }

  /**
   * 生成调查链接
   */
  generateSurveyLink(surveyId: string, baseUrl: string): string {
    return `${baseUrl}/survey/${surveyId}`
  }

  /**
   * 生成调查邮件HTML
   */
  generateSurveyEmailHtml(survey: SatisfactionSurvey, surveyLink: string): string {
    return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px; }
    .header { text-align: center; margin-bottom: 30px; }
    .logo { font-size: 32px; margin-bottom: 10px; }
    h1 { color: #1a1a1a; font-size: 24px; margin-bottom: 10px; }
    .content { background: #f8f9fa; border-radius: 12px; padding: 24px; margin-bottom: 24px; }
    .cta { text-align: center; margin: 30px 0; }
    .cta a { display: inline-block; background: #2563eb; color: white; padding: 14px 32px; border-radius: 8px; text-decoration: none; font-weight: 600; }
    .cta a:hover { background: #1d4ed8; }
    .footer { text-align: center; color: #666; font-size: 14px; margin-top: 30px; }
    .stars { font-size: 24px; margin: 16px 0; }
  </style>
</head>
<body>
  <div class="header">
    <div class="logo">📋</div>
    <h1>您的反馈对我们很重要</h1>
  </div>

  <div class="content">
    <p>尊敬的 ${survey.userName}，</p>

    <p>感谢您选择我们的服务！我们希望了解您对本次产品交付的满意程度。</p>

    <p>这份简短的问卷只需要 <strong>2-3 分钟</strong>，您的反馈将帮助我们不断改进。</p>

    <div class="stars">⭐⭐⭐⭐⭐</div>

    <p>问卷包含以下内容：</p>
    <ul>
      <li>总体满意度评分</li>
      <li>各维度体验评价</li>
      <li>您的宝贵建议</li>
    </ul>
  </div>

  <div class="cta">
    <a href="${surveyLink}">开始填写问卷</a>
  </div>

  <p style="text-align: center; color: #666; font-size: 14px;">
    问卷有效期至 ${survey.expiresAt.toLocaleDateString()}
  </p>

  <div class="footer">
    <p>如有任何问题，请随时联系我们</p>
    <p>Thinkus 团队</p>
  </div>
</body>
</html>
`.trim()
  }

  /**
   * 生成人话满意度摘要
   */
  generateSatisfactionSummary(stats: SatisfactionStats): string {
    let summary = `## 满意度报告\n\n`

    // NPS分数解读
    let npsLevel: string
    let npsEmoji: string
    if (stats.npsScore >= 50) {
      npsLevel = '优秀'
      npsEmoji = '🎉'
    } else if (stats.npsScore >= 30) {
      npsLevel = '良好'
      npsEmoji = '👍'
    } else if (stats.npsScore >= 0) {
      npsLevel = '一般'
      npsEmoji = '📊'
    } else {
      npsLevel = '需改进'
      npsEmoji = '⚠️'
    }

    summary += `### NPS评分: ${stats.npsScore} ${npsEmoji}\n`
    summary += `整体表现: **${npsLevel}**\n\n`

    // 分布
    summary += `- 推荐者: ${stats.npsDistribution.promoters} 人\n`
    summary += `- 中立者: ${stats.npsDistribution.passives} 人\n`
    summary += `- 批评者: ${stats.npsDistribution.detractors} 人\n\n`

    // 维度评分
    if (stats.dimensionAverages.length > 0) {
      summary += `### 维度评分\n`
      for (const dim of stats.dimensionAverages) {
        const config = DIMENSION_CONFIG[dim.dimension]
        const stars = '⭐'.repeat(Math.round(dim.average))
        summary += `- ${config.icon} ${config.label}: ${dim.average.toFixed(1)}/5 ${stars}\n`
      }
      summary += '\n'
    }

    // 正面反馈
    if (stats.topPositives.length > 0) {
      summary += `### 用户好评\n`
      for (const positive of stats.topPositives.slice(0, 3)) {
        summary += `- 💚 "${positive}"\n`
      }
      summary += '\n'
    }

    // 改进建议
    if (stats.topNegatives.length > 0) {
      summary += `### 待改进\n`
      for (const negative of stats.topNegatives.slice(0, 3)) {
        summary += `- 💡 "${negative}"\n`
      }
    }

    return summary
  }

  /** 获取维度配置 */
  getDimensionConfig() {
    return DIMENSION_CONFIG
  }

  /** 获取调查模板 */
  getTemplates() {
    return this.templates
  }

  /** 获取调查 */
  getSurvey(surveyId: string) {
    return this.surveys.find(s => s.id === surveyId) || null
  }

  /** 获取项目所有调查 */
  getProjectSurveys(projectId: string) {
    return this.surveys.filter(s => s.projectId === projectId)
  }
}

// 导出单例
export const satisfactionCollector = new SatisfactionCollectorService()
