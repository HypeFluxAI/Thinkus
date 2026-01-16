/**
 * 用户活跃度追踪服务
 *
 * 交付后追踪用户是否真的在使用产品
 * - 活跃度指标采集
 * - 健康度评估
 * - 流失预警
 * - 主动关怀触发
 */

// ============================================================================
// 类型定义
// ============================================================================

/** 活跃度等级 */
export type ActivityLevel = 'highly_active' | 'active' | 'moderate' | 'low' | 'inactive' | 'churned'

/** 健康度状态 */
export type HealthStatus = 'healthy' | 'at_risk' | 'critical' | 'churned'

/** 用户行为类型 */
export type UserActionType =
  | 'login'           // 登录
  | 'page_view'       // 页面访问
  | 'feature_use'     // 功能使用
  | 'data_create'     // 数据创建
  | 'data_update'     // 数据更新
  | 'api_call'        // API调用
  | 'admin_action'    // 管理操作
  | 'export'          // 数据导出
  | 'share'           // 分享
  | 'payment'         // 支付

/** 用户行为记录 */
export interface UserAction {
  id: string
  projectId: string
  userId: string
  actionType: UserActionType
  actionDetail: string
  timestamp: Date
  metadata?: Record<string, unknown>
}

/** 活跃度指标 */
export interface ActivityMetrics {
  // 时间维度
  lastActiveAt: Date | null
  daysSinceLastActive: number

  // 频率指标
  dailyActiveCount: number      // 日活跃次数
  weeklyActiveCount: number     // 周活跃次数
  monthlyActiveCount: number    // 月活跃次数

  // 深度指标
  featuresUsed: string[]        // 使用过的功能
  featureUsageRate: number      // 功能使用率 (已用/总功能)
  avgSessionDuration: number    // 平均会话时长(分钟)

  // 价值指标
  dataCreatedCount: number      // 创建数据条数
  apiCallCount: number          // API调用次数

  // 趋势
  activityTrend: 'increasing' | 'stable' | 'decreasing' | 'unknown'
  weekOverWeekChange: number    // 周环比变化率
}

/** 用户健康度报告 */
export interface UserHealthReport {
  projectId: string
  userId: string

  // 状态评估
  healthStatus: HealthStatus
  activityLevel: ActivityLevel
  healthScore: number           // 0-100

  // 指标详情
  metrics: ActivityMetrics

  // 风险分析
  riskFactors: RiskFactor[]
  churnProbability: number      // 流失概率 0-100

  // 建议行动
  recommendedActions: RecommendedAction[]

  // 时间戳
  evaluatedAt: Date
}

/** 风险因素 */
export interface RiskFactor {
  factor: string
  severity: 'high' | 'medium' | 'low'
  description: string
  impact: number                // 对健康度的影响 0-100
}

/** 建议行动 */
export interface RecommendedAction {
  action: string
  priority: 'urgent' | 'high' | 'medium' | 'low'
  description: string
  channel: 'email' | 'sms' | 'call' | 'in_app'
  template?: string
}

/** 关怀触发条件 */
export interface CareTrigger {
  id: string
  name: string
  condition: (metrics: ActivityMetrics) => boolean
  action: RecommendedAction
  cooldownDays: number          // 冷却时间，避免频繁触发
}

/** 关怀记录 */
export interface CareRecord {
  id: string
  projectId: string
  userId: string
  triggerId: string
  triggerName: string
  action: RecommendedAction
  sentAt: Date
  response?: {
    opened: boolean
    clicked: boolean
    respondedAt?: Date
  }
}

/** 活跃度追踪配置 */
export interface ActivityTrackingConfig {
  projectId: string
  enableAutoTracking: boolean
  trackingScript?: string
  customMetrics?: string[]
  alertThresholds?: {
    inactiveDays: number
    lowActivityDays: number
    criticalInactiveDays: number
  }
}

// ============================================================================
// 配置
// ============================================================================

/** 活跃度等级配置 */
const ACTIVITY_LEVEL_CONFIG: Record<ActivityLevel, {
  label: string
  icon: string
  color: string
  minScore: number
  description: string
}> = {
  highly_active: {
    label: '非常活跃',
    icon: '🔥',
    color: 'text-green-600 bg-green-100',
    minScore: 80,
    description: '用户深度使用产品，活跃度很高'
  },
  active: {
    label: '活跃',
    icon: '✅',
    color: 'text-blue-600 bg-blue-100',
    minScore: 60,
    description: '用户正常使用产品'
  },
  moderate: {
    label: '一般',
    icon: '📊',
    color: 'text-yellow-600 bg-yellow-100',
    minScore: 40,
    description: '用户偶尔使用产品'
  },
  low: {
    label: '低活跃',
    icon: '⚠️',
    color: 'text-orange-600 bg-orange-100',
    minScore: 20,
    description: '用户很少使用产品，需要关注'
  },
  inactive: {
    label: '不活跃',
    icon: '😴',
    color: 'text-red-600 bg-red-100',
    minScore: 1,
    description: '用户已经停止使用产品'
  },
  churned: {
    label: '已流失',
    icon: '💔',
    color: 'text-gray-600 bg-gray-100',
    minScore: 0,
    description: '用户长时间未使用，可能已流失'
  }
}

/** 健康度状态配置 */
const HEALTH_STATUS_CONFIG: Record<HealthStatus, {
  label: string
  icon: string
  color: string
  description: string
}> = {
  healthy: {
    label: '健康',
    icon: '💚',
    color: 'text-green-600 bg-green-100',
    description: '用户状态良好，持续活跃'
  },
  at_risk: {
    label: '有风险',
    icon: '💛',
    color: 'text-yellow-600 bg-yellow-100',
    description: '用户活跃度下降，需要关注'
  },
  critical: {
    label: '危险',
    icon: '🧡',
    color: 'text-orange-600 bg-orange-100',
    description: '用户即将流失，需要紧急干预'
  },
  churned: {
    label: '已流失',
    icon: '💔',
    color: 'text-red-600 bg-red-100',
    description: '用户已停止使用'
  }
}

/** 默认关怀触发条件 */
const DEFAULT_CARE_TRIGGERS: CareTrigger[] = [
  {
    id: 'welcome_check',
    name: '交付后首次检查',
    condition: (metrics) => metrics.daysSinceLastActive === 3 && metrics.monthlyActiveCount < 5,
    action: {
      action: '发送使用指南',
      priority: 'high',
      description: '用户交付3天后活跃度较低，发送使用指南帮助上手',
      channel: 'email',
      template: 'welcome_guide'
    },
    cooldownDays: 7
  },
  {
    id: 'inactive_7days',
    name: '7天不活跃提醒',
    condition: (metrics) => metrics.daysSinceLastActive >= 7 && metrics.daysSinceLastActive < 14,
    action: {
      action: '发送关怀邮件',
      priority: 'medium',
      description: '用户7天未使用，发送关怀邮件了解情况',
      channel: 'email',
      template: 'inactive_care'
    },
    cooldownDays: 14
  },
  {
    id: 'inactive_14days',
    name: '14天不活跃预警',
    condition: (metrics) => metrics.daysSinceLastActive >= 14 && metrics.daysSinceLastActive < 30,
    action: {
      action: '电话回访',
      priority: 'high',
      description: '用户14天未使用，需要电话回访了解问题',
      channel: 'call',
      template: 'phone_callback'
    },
    cooldownDays: 14
  },
  {
    id: 'churn_warning',
    name: '流失预警',
    condition: (metrics) => metrics.daysSinceLastActive >= 30,
    action: {
      action: '紧急挽回',
      priority: 'urgent',
      description: '用户30天未使用，启动紧急挽回流程',
      channel: 'call',
      template: 'churn_recovery'
    },
    cooldownDays: 30
  },
  {
    id: 'feature_unused',
    name: '功能未使用提醒',
    condition: (metrics) => metrics.featureUsageRate < 0.3 && metrics.monthlyActiveCount > 5,
    action: {
      action: '发送功能介绍',
      priority: 'low',
      description: '用户只使用了少量功能，发送其他功能介绍',
      channel: 'email',
      template: 'feature_intro'
    },
    cooldownDays: 14
  },
  {
    id: 'activity_declining',
    name: '活跃度下降预警',
    condition: (metrics) => metrics.activityTrend === 'decreasing' && metrics.weekOverWeekChange < -50,
    action: {
      action: '发送问卷调查',
      priority: 'medium',
      description: '用户活跃度明显下降，发送问卷了解原因',
      channel: 'email',
      template: 'feedback_survey'
    },
    cooldownDays: 14
  }
]

/** 产品核心功能列表 (用于计算功能使用率) */
const CORE_FEATURES = [
  'dashboard',
  'data_management',
  'report',
  'settings',
  'user_management',
  'api_integration',
  'export',
  'notification',
  'search',
  'analytics'
]

// ============================================================================
// 用户活跃度追踪服务
// ============================================================================

export class UserActivityTrackerService {
  // 模拟存储 (生产环境应使用数据库)
  private actions: UserAction[] = []
  private careRecords: CareRecord[] = []
  private configs: Map<string, ActivityTrackingConfig> = new Map()

  /**
   * 记录用户行为
   */
  async recordAction(
    projectId: string,
    userId: string,
    actionType: UserActionType,
    actionDetail: string,
    metadata?: Record<string, unknown>
  ): Promise<UserAction> {
    const action: UserAction = {
      id: `action-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      projectId,
      userId,
      actionType,
      actionDetail,
      timestamp: new Date(),
      metadata
    }

    this.actions.push(action)

    // 检查是否触发关怀
    await this.checkCareTriggers(projectId, userId)

    return action
  }

  /**
   * 批量记录行为 (从追踪脚本接收)
   */
  async recordBatchActions(actions: Omit<UserAction, 'id'>[]): Promise<void> {
    for (const action of actions) {
      await this.recordAction(
        action.projectId,
        action.userId,
        action.actionType,
        action.actionDetail,
        action.metadata
      )
    }
  }

  /**
   * 获取活跃度指标
   */
  async getActivityMetrics(projectId: string, userId: string): Promise<ActivityMetrics> {
    const userActions = this.actions.filter(
      a => a.projectId === projectId && a.userId === userId
    )

    const now = new Date()
    const dayAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000)
    const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000)
    const monthAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000)
    const twoWeeksAgo = new Date(now.getTime() - 14 * 24 * 60 * 60 * 1000)

    // 最后活跃时间
    const lastAction = userActions.length > 0
      ? userActions.reduce((a, b) => a.timestamp > b.timestamp ? a : b)
      : null
    const lastActiveAt = lastAction?.timestamp || null
    const daysSinceLastActive = lastActiveAt
      ? Math.floor((now.getTime() - lastActiveAt.getTime()) / (24 * 60 * 60 * 1000))
      : 999

    // 频率指标
    const dailyActiveCount = userActions.filter(a => a.timestamp >= dayAgo).length
    const weeklyActiveCount = userActions.filter(a => a.timestamp >= weekAgo).length
    const monthlyActiveCount = userActions.filter(a => a.timestamp >= monthAgo).length

    // 深度指标
    const featuresUsed = [...new Set(
      userActions
        .filter(a => a.actionType === 'feature_use')
        .map(a => a.actionDetail)
    )]
    const featureUsageRate = featuresUsed.length / CORE_FEATURES.length

    // 假设每次行为代表一定时长
    const avgSessionDuration = monthlyActiveCount > 0 ? Math.min(monthlyActiveCount * 2, 60) : 0

    // 价值指标
    const dataCreatedCount = userActions.filter(a => a.actionType === 'data_create').length
    const apiCallCount = userActions.filter(a => a.actionType === 'api_call').length

    // 趋势计算
    const lastWeekCount = userActions.filter(
      a => a.timestamp >= twoWeeksAgo && a.timestamp < weekAgo
    ).length
    const thisWeekCount = userActions.filter(a => a.timestamp >= weekAgo).length

    let activityTrend: 'increasing' | 'stable' | 'decreasing' | 'unknown' = 'unknown'
    let weekOverWeekChange = 0

    if (lastWeekCount > 0) {
      weekOverWeekChange = ((thisWeekCount - lastWeekCount) / lastWeekCount) * 100
      if (weekOverWeekChange > 20) activityTrend = 'increasing'
      else if (weekOverWeekChange < -20) activityTrend = 'decreasing'
      else activityTrend = 'stable'
    } else if (thisWeekCount > 0) {
      activityTrend = 'increasing'
      weekOverWeekChange = 100
    }

    return {
      lastActiveAt,
      daysSinceLastActive,
      dailyActiveCount,
      weeklyActiveCount,
      monthlyActiveCount,
      featuresUsed,
      featureUsageRate,
      avgSessionDuration,
      dataCreatedCount,
      apiCallCount,
      activityTrend,
      weekOverWeekChange
    }
  }

  /**
   * 计算活跃度等级
   */
  calculateActivityLevel(metrics: ActivityMetrics): ActivityLevel {
    const { daysSinceLastActive, weeklyActiveCount, featureUsageRate } = metrics

    // 流失: 超过30天未活跃
    if (daysSinceLastActive >= 30) return 'churned'

    // 不活跃: 14-30天未活跃
    if (daysSinceLastActive >= 14) return 'inactive'

    // 低活跃: 7-14天未活跃 或 周活跃次数很少
    if (daysSinceLastActive >= 7 || weeklyActiveCount < 3) return 'low'

    // 一般: 周活跃次数较少
    if (weeklyActiveCount < 10) return 'moderate'

    // 活跃: 正常使用
    if (weeklyActiveCount < 30 || featureUsageRate < 0.5) return 'active'

    // 非常活跃: 深度使用
    return 'highly_active'
  }

  /**
   * 计算健康度分数
   */
  calculateHealthScore(metrics: ActivityMetrics): number {
    let score = 100

    // 不活跃天数扣分
    if (metrics.daysSinceLastActive > 0) {
      score -= Math.min(metrics.daysSinceLastActive * 3, 50)
    }

    // 周活跃次数加分
    score += Math.min(metrics.weeklyActiveCount * 2, 20)

    // 功能使用率加分
    score += metrics.featureUsageRate * 20

    // 趋势调整
    if (metrics.activityTrend === 'decreasing') score -= 10
    if (metrics.activityTrend === 'increasing') score += 10

    return Math.max(0, Math.min(100, score))
  }

  /**
   * 评估用户健康度
   */
  async evaluateUserHealth(projectId: string, userId: string): Promise<UserHealthReport> {
    const metrics = await this.getActivityMetrics(projectId, userId)
    const activityLevel = this.calculateActivityLevel(metrics)
    const healthScore = this.calculateHealthScore(metrics)

    // 确定健康状态
    let healthStatus: HealthStatus
    if (activityLevel === 'churned') healthStatus = 'churned'
    else if (activityLevel === 'inactive' || activityLevel === 'low') healthStatus = 'critical'
    else if (activityLevel === 'moderate' || metrics.activityTrend === 'decreasing') healthStatus = 'at_risk'
    else healthStatus = 'healthy'

    // 分析风险因素
    const riskFactors = this.analyzeRiskFactors(metrics)

    // 计算流失概率
    const churnProbability = this.calculateChurnProbability(metrics, riskFactors)

    // 生成建议行动
    const recommendedActions = this.generateRecommendedActions(metrics, healthStatus, riskFactors)

    return {
      projectId,
      userId,
      healthStatus,
      activityLevel,
      healthScore,
      metrics,
      riskFactors,
      churnProbability,
      recommendedActions,
      evaluatedAt: new Date()
    }
  }

  /**
   * 分析风险因素
   */
  private analyzeRiskFactors(metrics: ActivityMetrics): RiskFactor[] {
    const factors: RiskFactor[] = []

    // 长时间不活跃
    if (metrics.daysSinceLastActive >= 7) {
      factors.push({
        factor: 'long_inactive',
        severity: metrics.daysSinceLastActive >= 14 ? 'high' : 'medium',
        description: `用户已 ${metrics.daysSinceLastActive} 天未使用产品`,
        impact: Math.min(metrics.daysSinceLastActive * 2, 40)
      })
    }

    // 功能使用率低
    if (metrics.featureUsageRate < 0.3) {
      factors.push({
        factor: 'low_feature_usage',
        severity: 'medium',
        description: `用户只使用了 ${Math.round(metrics.featureUsageRate * 100)}% 的功能`,
        impact: 20
      })
    }

    // 活跃度下降
    if (metrics.activityTrend === 'decreasing') {
      factors.push({
        factor: 'declining_activity',
        severity: metrics.weekOverWeekChange < -50 ? 'high' : 'medium',
        description: `活跃度周环比下降 ${Math.abs(metrics.weekOverWeekChange).toFixed(0)}%`,
        impact: Math.min(Math.abs(metrics.weekOverWeekChange) / 2, 30)
      })
    }

    // 没有创建数据
    if (metrics.dataCreatedCount === 0 && metrics.monthlyActiveCount > 5) {
      factors.push({
        factor: 'no_data_created',
        severity: 'low',
        description: '用户未创建任何数据，可能遇到使用困难',
        impact: 15
      })
    }

    // 周活跃次数太少
    if (metrics.weeklyActiveCount < 3 && metrics.daysSinceLastActive < 7) {
      factors.push({
        factor: 'low_engagement',
        severity: 'low',
        description: '用户参与度较低，每周使用次数不足3次',
        impact: 10
      })
    }

    return factors.sort((a, b) => b.impact - a.impact)
  }

  /**
   * 计算流失概率
   */
  private calculateChurnProbability(metrics: ActivityMetrics, riskFactors: RiskFactor[]): number {
    let probability = 0

    // 基于不活跃天数
    if (metrics.daysSinceLastActive >= 30) probability = 90
    else if (metrics.daysSinceLastActive >= 14) probability = 60
    else if (metrics.daysSinceLastActive >= 7) probability = 30
    else probability = 5

    // 风险因素调整
    const totalRiskImpact = riskFactors.reduce((sum, f) => sum + f.impact, 0)
    probability += totalRiskImpact * 0.3

    // 正面因素调整
    if (metrics.activityTrend === 'increasing') probability -= 20
    if (metrics.featureUsageRate > 0.5) probability -= 10
    if (metrics.dataCreatedCount > 10) probability -= 10

    return Math.max(0, Math.min(100, probability))
  }

  /**
   * 生成建议行动
   */
  private generateRecommendedActions(
    metrics: ActivityMetrics,
    healthStatus: HealthStatus,
    riskFactors: RiskFactor[]
  ): RecommendedAction[] {
    const actions: RecommendedAction[] = []

    // 基于健康状态的通用建议
    if (healthStatus === 'churned') {
      actions.push({
        action: '紧急电话回访',
        priority: 'urgent',
        description: '用户已流失，需要电话了解原因并尝试挽回',
        channel: 'call',
        template: 'churn_recovery_call'
      })
      actions.push({
        action: '发送挽回优惠',
        priority: 'urgent',
        description: '提供特别优惠或服务升级以挽回用户',
        channel: 'email',
        template: 'win_back_offer'
      })
    } else if (healthStatus === 'critical') {
      actions.push({
        action: '主动联系用户',
        priority: 'high',
        description: '电话或微信联系用户，了解是否遇到问题',
        channel: 'call',
        template: 'proactive_support'
      })
    } else if (healthStatus === 'at_risk') {
      actions.push({
        action: '发送关怀邮件',
        priority: 'medium',
        description: '发送使用技巧或新功能介绍，重新激活用户兴趣',
        channel: 'email',
        template: 'engagement_tips'
      })
    }

    // 基于具体风险因素的针对性建议
    for (const factor of riskFactors) {
      if (factor.factor === 'low_feature_usage') {
        actions.push({
          action: '发送功能教程',
          priority: 'medium',
          description: '介绍用户未使用的功能，帮助发现更多价值',
          channel: 'email',
          template: 'feature_tutorial'
        })
      }

      if (factor.factor === 'no_data_created') {
        actions.push({
          action: '提供使用指导',
          priority: 'high',
          description: '可能用户不知道如何开始，提供一对一指导',
          channel: 'call',
          template: 'onboarding_support'
        })
      }
    }

    // 健康用户的增值建议
    if (healthStatus === 'healthy' && metrics.featureUsageRate > 0.7) {
      actions.push({
        action: '邀请成为案例',
        priority: 'low',
        description: '用户使用深度高，可以邀请分享使用经验',
        channel: 'email',
        template: 'case_study_invite'
      })
    }

    // 去重并按优先级排序
    const priorityOrder = { urgent: 0, high: 1, medium: 2, low: 3 }
    return actions
      .filter((action, index, self) =>
        index === self.findIndex(a => a.action === action.action)
      )
      .sort((a, b) => priorityOrder[a.priority] - priorityOrder[b.priority])
  }

  /**
   * 检查并触发关怀
   */
  async checkCareTriggers(projectId: string, userId: string): Promise<CareRecord[]> {
    const metrics = await this.getActivityMetrics(projectId, userId)
    const triggered: CareRecord[] = []

    for (const trigger of DEFAULT_CARE_TRIGGERS) {
      // 检查是否满足触发条件
      if (!trigger.condition(metrics)) continue

      // 检查冷却时间
      const recentCare = this.careRecords.find(
        r => r.projectId === projectId &&
             r.userId === userId &&
             r.triggerId === trigger.id &&
             (Date.now() - r.sentAt.getTime()) < trigger.cooldownDays * 24 * 60 * 60 * 1000
      )
      if (recentCare) continue

      // 创建关怀记录
      const record: CareRecord = {
        id: `care-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
        projectId,
        userId,
        triggerId: trigger.id,
        triggerName: trigger.name,
        action: trigger.action,
        sentAt: new Date()
      }

      this.careRecords.push(record)
      triggered.push(record)

      // 这里应该实际发送关怀消息
      console.log(`[关怀触发] ${trigger.name} - ${trigger.action.action}`)
    }

    return triggered
  }

  /**
   * 获取项目所有用户的健康报告
   */
  async getProjectHealthOverview(projectId: string): Promise<{
    totalUsers: number
    healthyCount: number
    atRiskCount: number
    criticalCount: number
    churnedCount: number
    avgHealthScore: number
    topRiskFactors: { factor: string; count: number }[]
    recentCareRecords: CareRecord[]
  }> {
    // 获取项目的所有用户
    const userIds = [...new Set(
      this.actions
        .filter(a => a.projectId === projectId)
        .map(a => a.userId)
    )]

    if (userIds.length === 0) {
      return {
        totalUsers: 0,
        healthyCount: 0,
        atRiskCount: 0,
        criticalCount: 0,
        churnedCount: 0,
        avgHealthScore: 0,
        topRiskFactors: [],
        recentCareRecords: []
      }
    }

    // 评估每个用户
    const reports: UserHealthReport[] = []
    for (const userId of userIds) {
      const report = await this.evaluateUserHealth(projectId, userId)
      reports.push(report)
    }

    // 统计
    const healthyCount = reports.filter(r => r.healthStatus === 'healthy').length
    const atRiskCount = reports.filter(r => r.healthStatus === 'at_risk').length
    const criticalCount = reports.filter(r => r.healthStatus === 'critical').length
    const churnedCount = reports.filter(r => r.healthStatus === 'churned').length
    const avgHealthScore = reports.reduce((sum, r) => sum + r.healthScore, 0) / reports.length

    // 汇总风险因素
    const riskFactorCounts = new Map<string, number>()
    for (const report of reports) {
      for (const factor of report.riskFactors) {
        riskFactorCounts.set(factor.factor, (riskFactorCounts.get(factor.factor) || 0) + 1)
      }
    }
    const topRiskFactors = Array.from(riskFactorCounts.entries())
      .map(([factor, count]) => ({ factor, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 5)

    // 最近关怀记录
    const recentCareRecords = this.careRecords
      .filter(r => r.projectId === projectId)
      .sort((a, b) => b.sentAt.getTime() - a.sentAt.getTime())
      .slice(0, 10)

    return {
      totalUsers: userIds.length,
      healthyCount,
      atRiskCount,
      criticalCount,
      churnedCount,
      avgHealthScore,
      topRiskFactors,
      recentCareRecords
    }
  }

  /**
   * 生成追踪脚本 (嵌入到用户产品中)
   */
  generateTrackingScript(projectId: string, apiEndpoint: string): string {
    return `
<!-- Thinkus 活跃度追踪脚本 -->
<script>
(function() {
  var projectId = '${projectId}';
  var apiEndpoint = '${apiEndpoint}';
  var userId = null;
  var actionQueue = [];
  var flushInterval = 30000; // 30秒批量上报

  // 获取或生成用户ID
  function getUserId() {
    if (userId) return userId;
    userId = localStorage.getItem('thinkus_user_id');
    if (!userId) {
      // 尝试从页面获取
      var userElement = document.querySelector('[data-user-id]');
      if (userElement) {
        userId = userElement.getAttribute('data-user-id');
      }
    }
    return userId || 'anonymous';
  }

  // 记录行为
  function track(actionType, actionDetail, metadata) {
    actionQueue.push({
      projectId: projectId,
      userId: getUserId(),
      actionType: actionType,
      actionDetail: actionDetail,
      timestamp: new Date().toISOString(),
      metadata: metadata || {}
    });
  }

  // 批量上报
  function flush() {
    if (actionQueue.length === 0) return;

    var actions = actionQueue.slice();
    actionQueue = [];

    fetch(apiEndpoint + '/api/tracking/batch', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ actions: actions })
    }).catch(function(err) {
      // 失败时重新加入队列
      actionQueue = actions.concat(actionQueue);
    });
  }

  // 自动追踪页面访问
  function trackPageView() {
    track('page_view', window.location.pathname, {
      referrer: document.referrer,
      title: document.title
    });
  }

  // 自动追踪点击
  function trackClick(event) {
    var target = event.target.closest('[data-track]');
    if (target) {
      var trackData = target.getAttribute('data-track');
      track('feature_use', trackData, {
        element: target.tagName,
        text: target.innerText?.substring(0, 50)
      });
    }
  }

  // 初始化
  trackPageView();
  document.addEventListener('click', trackClick);
  setInterval(flush, flushInterval);
  window.addEventListener('beforeunload', flush);

  // 暴露全局方法
  window.ThinkusTracker = {
    track: track,
    setUserId: function(id) { userId = id; },
    flush: flush
  };
})();
</script>
`.trim()
  }

  /**
   * 生成人话健康摘要
   */
  generateHealthSummary(report: UserHealthReport): string {
    const statusConfig = HEALTH_STATUS_CONFIG[report.healthStatus]
    const levelConfig = ACTIVITY_LEVEL_CONFIG[report.activityLevel]

    let summary = `${statusConfig.icon} **用户健康状态: ${statusConfig.label}**\n\n`

    summary += `- 活跃度: ${levelConfig.icon} ${levelConfig.label}\n`
    summary += `- 健康分数: ${report.healthScore.toFixed(0)}/100\n`
    summary += `- 流失风险: ${report.churnProbability.toFixed(0)}%\n`
    summary += `- 最后活跃: ${report.metrics.lastActiveAt
      ? `${report.metrics.daysSinceLastActive} 天前`
      : '从未活跃'}\n\n`

    if (report.riskFactors.length > 0) {
      summary += `**风险因素:**\n`
      for (const factor of report.riskFactors.slice(0, 3)) {
        const severityIcon = factor.severity === 'high' ? '🔴' : factor.severity === 'medium' ? '🟡' : '🟢'
        summary += `- ${severityIcon} ${factor.description}\n`
      }
      summary += '\n'
    }

    if (report.recommendedActions.length > 0) {
      summary += `**建议行动:**\n`
      for (const action of report.recommendedActions.slice(0, 3)) {
        const priorityIcon = action.priority === 'urgent' ? '🚨' : action.priority === 'high' ? '❗' : '📌'
        summary += `- ${priorityIcon} ${action.action}: ${action.description}\n`
      }
    }

    return summary
  }

  /** 获取活跃度等级配置 */
  getActivityLevelConfig() {
    return ACTIVITY_LEVEL_CONFIG
  }

  /** 获取健康状态配置 */
  getHealthStatusConfig() {
    return HEALTH_STATUS_CONFIG
  }
}

// 导出单例
export const userActivityTracker = new UserActivityTrackerService()
