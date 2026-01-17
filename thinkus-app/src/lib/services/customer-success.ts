/**
 * 客户成功追踪服务 (小白用户自动化交付)
 *
 * 功能:
 * - 追踪用户是否真正用起来了
 * - 识别卡点和困难
 * - 主动介入帮助
 * - 衡量交付质量
 *
 * 设计理念:
 * - 交付不是终点，用户用起来才是成功
 * - 主动发现问题，不等用户抱怨
 * - 用数据说话，持续改进
 */

// ============================================
// 类型定义
// ============================================

export type SuccessStage =
  | 'delivered' // 已交付
  | 'first_login' // 首次登录
  | 'exploring' // 探索中
  | 'activated' // 已激活
  | 'engaged' // 活跃使用
  | 'champion' // 深度用户
  | 'at_risk' // 有流失风险
  | 'churned' // 已流失

export type InterventionType =
  | 'welcome_call' // 欢迎电话
  | 'tutorial_push' // 推送教程
  | 'check_in_email' // 问候邮件
  | 'feature_guide' // 功能引导
  | 'support_offer' // 提供支持
  | 'feedback_request' // 请求反馈
  | 'renewal_reminder' // 续费提醒
  | 'win_back' // 挽回流失

export type SuccessMetricType =
  | 'login_frequency' // 登录频率
  | 'feature_adoption' // 功能采用
  | 'data_creation' // 数据创建
  | 'time_spent' // 使用时长
  | 'support_tickets' // 工单数量
  | 'nps_score' // NPS评分
  | 'payment_status' // 付款状态

export interface CustomerProfile {
  userId: string
  projectId: string
  companyName?: string
  contactName: string
  contactEmail: string
  contactPhone?: string
  deliveredAt: Date
  currentStage: SuccessStage
  healthScore: number // 0-100
  lastActivityAt?: Date
  firstLoginAt?: Date
  activatedAt?: Date
  engagedAt?: Date
  churnedAt?: Date
}

export interface SuccessMetric {
  type: SuccessMetricType
  value: number
  benchmark: number // 基准值
  trend: 'up' | 'down' | 'stable'
  lastUpdated: Date
}

export interface SuccessMilestone {
  id: string
  name: string
  description: string
  targetDays: number // 交付后多少天内应完成
  completed: boolean
  completedAt?: Date
  isOverdue: boolean
}

export interface Intervention {
  id: string
  userId: string
  projectId: string
  type: InterventionType
  reason: string
  scheduledAt: Date
  executedAt?: Date
  outcome?: 'success' | 'partial' | 'failed' | 'no_response'
  notes?: string
}

export interface CustomerHealthReport {
  profile: CustomerProfile
  metrics: SuccessMetric[]
  milestones: SuccessMilestone[]
  recentInterventions: Intervention[]
  riskFactors: string[]
  recommendations: string[]
  nextActions: Intervention[]
}

// ============================================
// 成功里程碑定义
// ============================================

const SUCCESS_MILESTONES: Omit<SuccessMilestone, 'completed' | 'completedAt' | 'isOverdue'>[] = [
  {
    id: 'first_login',
    name: '首次登录',
    description: '用户第一次登录产品',
    targetDays: 1,
  },
  {
    id: 'profile_complete',
    name: '完善资料',
    description: '用户填写基本信息',
    targetDays: 3,
  },
  {
    id: 'first_data',
    name: '创建首条数据',
    description: '用户创建第一条业务数据',
    targetDays: 7,
  },
  {
    id: 'core_feature',
    name: '使用核心功能',
    description: '用户使用产品的核心功能',
    targetDays: 7,
  },
  {
    id: 'second_login',
    name: '二次登录',
    description: '用户第二次登录(非当天)',
    targetDays: 3,
  },
  {
    id: 'invite_team',
    name: '邀请团队',
    description: '用户邀请其他人使用',
    targetDays: 14,
  },
  {
    id: 'weekly_active',
    name: '周活跃',
    description: '一周内登录3次以上',
    targetDays: 14,
  },
  {
    id: 'positive_feedback',
    name: '正面反馈',
    description: '用户给出正面评价',
    targetDays: 30,
  },
]

// ============================================
// 阶段转换规则
// ============================================

const STAGE_RULES: Record<SuccessStage, {
  nextStage: SuccessStage
  conditions: string[]
  maxDaysInStage?: number
}> = {
  delivered: {
    nextStage: 'first_login',
    conditions: ['用户首次登录'],
    maxDaysInStage: 3,
  },
  first_login: {
    nextStage: 'exploring',
    conditions: ['浏览3个以上页面', '停留超过5分钟'],
    maxDaysInStage: 7,
  },
  exploring: {
    nextStage: 'activated',
    conditions: ['创建首条数据', '使用核心功能'],
    maxDaysInStage: 14,
  },
  activated: {
    nextStage: 'engaged',
    conditions: ['连续3天登录', '创建5条以上数据'],
    maxDaysInStage: 30,
  },
  engaged: {
    nextStage: 'champion',
    conditions: ['邀请团队成员', '每周登录5次以上', '使用高级功能'],
  },
  champion: {
    nextStage: 'champion',
    conditions: ['保持活跃'],
  },
  at_risk: {
    nextStage: 'churned',
    conditions: ['30天内无登录'],
    maxDaysInStage: 30,
  },
  churned: {
    nextStage: 'activated',
    conditions: ['重新激活'],
  },
}

// ============================================
// 干预触发规则
// ============================================

const INTERVENTION_TRIGGERS: {
  condition: (profile: CustomerProfile, metrics: SuccessMetric[]) => boolean
  intervention: InterventionType
  reason: string
  delayHours: number
}[] = [
  {
    condition: (p) => !p.firstLoginAt && daysSince(p.deliveredAt) >= 1,
    intervention: 'welcome_call',
    reason: '交付超过24小时未登录',
    delayHours: 0,
  },
  {
    condition: (p) => !p.firstLoginAt && daysSince(p.deliveredAt) >= 3,
    intervention: 'support_offer',
    reason: '交付超过3天未登录',
    delayHours: 0,
  },
  {
    condition: (p) => p.currentStage === 'first_login' && daysSince(p.firstLoginAt!) >= 3,
    intervention: 'tutorial_push',
    reason: '首次登录后3天未进一步使用',
    delayHours: 4,
  },
  {
    condition: (p) => p.currentStage === 'exploring' && daysSince(p.lastActivityAt!) >= 7,
    intervention: 'feature_guide',
    reason: '探索阶段7天未活动',
    delayHours: 0,
  },
  {
    condition: (p) => p.currentStage === 'at_risk',
    intervention: 'check_in_email',
    reason: '用户进入流失风险状态',
    delayHours: 0,
  },
  {
    condition: (p) => p.currentStage === 'churned',
    intervention: 'win_back',
    reason: '用户已流失',
    delayHours: 24,
  },
  {
    condition: (p) => p.currentStage === 'activated' && daysSince(p.activatedAt!) >= 14,
    intervention: 'feedback_request',
    reason: '激活14天后收集反馈',
    delayHours: 48,
  },
]

// ============================================
// 辅助函数
// ============================================

function daysSince(date: Date): number {
  return Math.floor((Date.now() - date.getTime()) / (1000 * 60 * 60 * 24))
}

function generateInterventionId(): string {
  return `INT-${Date.now()}-${Math.random().toString(36).substr(2, 6)}`
}

// ============================================
// 客户成功服务
// ============================================

export class CustomerSuccessService {
  private profiles: Map<string, CustomerProfile> = new Map()
  private metrics: Map<string, SuccessMetric[]> = new Map()
  private milestones: Map<string, SuccessMilestone[]> = new Map()
  private interventions: Map<string, Intervention[]> = new Map()

  /**
   * 创建客户档案
   */
  createProfile(input: {
    userId: string
    projectId: string
    contactName: string
    contactEmail: string
    contactPhone?: string
    companyName?: string
  }): CustomerProfile {
    const profile: CustomerProfile = {
      ...input,
      deliveredAt: new Date(),
      currentStage: 'delivered',
      healthScore: 50, // 初始分数
    }

    const key = `${input.userId}-${input.projectId}`
    this.profiles.set(key, profile)

    // 初始化里程碑
    const milestones: SuccessMilestone[] = SUCCESS_MILESTONES.map((m) => ({
      ...m,
      completed: false,
      isOverdue: false,
    }))
    this.milestones.set(key, milestones)

    // 初始化指标
    this.metrics.set(key, [])

    // 初始化干预记录
    this.interventions.set(key, [])

    return profile
  }

  /**
   * 记录用户活动
   */
  recordActivity(
    userId: string,
    projectId: string,
    activity: {
      type: 'login' | 'page_view' | 'feature_use' | 'data_create' | 'invite'
      details?: Record<string, unknown>
    }
  ): void {
    const key = `${userId}-${projectId}`
    const profile = this.profiles.get(key)
    if (!profile) return

    profile.lastActivityAt = new Date()

    // 处理特定活动
    switch (activity.type) {
      case 'login':
        if (!profile.firstLoginAt) {
          profile.firstLoginAt = new Date()
          this.completeMilestone(userId, projectId, 'first_login')
          this.updateStage(userId, projectId, 'first_login')
        }
        break

      case 'data_create':
        this.completeMilestone(userId, projectId, 'first_data')
        break

      case 'feature_use':
        this.completeMilestone(userId, projectId, 'core_feature')
        if (profile.currentStage === 'exploring') {
          this.updateStage(userId, projectId, 'activated')
          profile.activatedAt = new Date()
        }
        break

      case 'invite':
        this.completeMilestone(userId, projectId, 'invite_team')
        break
    }

    // 重新计算健康分
    this.calculateHealthScore(userId, projectId)
  }

  /**
   * 更新阶段
   */
  private updateStage(userId: string, projectId: string, newStage: SuccessStage): void {
    const key = `${userId}-${projectId}`
    const profile = this.profiles.get(key)
    if (!profile) return

    profile.currentStage = newStage

    // 记录关键时间点
    switch (newStage) {
      case 'first_login':
        profile.firstLoginAt = new Date()
        break
      case 'activated':
        profile.activatedAt = new Date()
        break
      case 'engaged':
        profile.engagedAt = new Date()
        break
      case 'churned':
        profile.churnedAt = new Date()
        break
    }
  }

  /**
   * 完成里程碑
   */
  private completeMilestone(userId: string, projectId: string, milestoneId: string): void {
    const key = `${userId}-${projectId}`
    const milestones = this.milestones.get(key)
    if (!milestones) return

    const milestone = milestones.find((m) => m.id === milestoneId)
    if (milestone && !milestone.completed) {
      milestone.completed = true
      milestone.completedAt = new Date()
    }
  }

  /**
   * 计算健康分
   */
  private calculateHealthScore(userId: string, projectId: string): number {
    const key = `${userId}-${projectId}`
    const profile = this.profiles.get(key)
    const milestones = this.milestones.get(key)

    if (!profile || !milestones) return 0

    let score = 50 // 基础分

    // 里程碑完成加分
    const completedMilestones = milestones.filter((m) => m.completed).length
    score += completedMilestones * 5 // 每个里程碑5分

    // 阶段加分
    const stageScores: Record<SuccessStage, number> = {
      delivered: 0,
      first_login: 10,
      exploring: 15,
      activated: 25,
      engaged: 35,
      champion: 45,
      at_risk: -20,
      churned: -40,
    }
    score += stageScores[profile.currentStage]

    // 活跃度加分
    if (profile.lastActivityAt) {
      const daysSinceActive = daysSince(profile.lastActivityAt)
      if (daysSinceActive <= 1) score += 10
      else if (daysSinceActive <= 3) score += 5
      else if (daysSinceActive <= 7) score += 0
      else if (daysSinceActive <= 14) score -= 10
      else score -= 20
    }

    // 限制范围
    score = Math.max(0, Math.min(100, score))
    profile.healthScore = score

    return score
  }

  /**
   * 检查并创建干预
   */
  checkAndCreateInterventions(userId: string, projectId: string): Intervention[] {
    const key = `${userId}-${projectId}`
    const profile = this.profiles.get(key)
    const metrics = this.metrics.get(key) || []
    const existingInterventions = this.interventions.get(key) || []

    if (!profile) return []

    const newInterventions: Intervention[] = []

    for (const trigger of INTERVENTION_TRIGGERS) {
      if (trigger.condition(profile, metrics)) {
        // 检查是否已有相同类型的待执行干预
        const hasExisting = existingInterventions.some(
          (i) => i.type === trigger.intervention && !i.executedAt
        )

        if (!hasExisting) {
          const intervention: Intervention = {
            id: generateInterventionId(),
            userId,
            projectId,
            type: trigger.intervention,
            reason: trigger.reason,
            scheduledAt: new Date(Date.now() + trigger.delayHours * 60 * 60 * 1000),
          }
          newInterventions.push(intervention)
          existingInterventions.push(intervention)
        }
      }
    }

    this.interventions.set(key, existingInterventions)
    return newInterventions
  }

  /**
   * 执行干预
   */
  executeIntervention(
    interventionId: string,
    outcome: 'success' | 'partial' | 'failed' | 'no_response',
    notes?: string
  ): void {
    for (const [, interventions] of this.interventions) {
      const intervention = interventions.find((i) => i.id === interventionId)
      if (intervention) {
        intervention.executedAt = new Date()
        intervention.outcome = outcome
        intervention.notes = notes
        break
      }
    }
  }

  /**
   * 生成健康报告
   */
  generateHealthReport(userId: string, projectId: string): CustomerHealthReport | null {
    const key = `${userId}-${projectId}`
    const profile = this.profiles.get(key)
    const metrics = this.metrics.get(key) || []
    const milestones = this.milestones.get(key) || []
    const interventions = this.interventions.get(key) || []

    if (!profile) return null

    // 更新里程碑逾期状态
    const daysSinceDelivery = daysSince(profile.deliveredAt)
    for (const milestone of milestones) {
      milestone.isOverdue = !milestone.completed && daysSinceDelivery > milestone.targetDays
    }

    // 识别风险因素
    const riskFactors: string[] = []
    if (!profile.firstLoginAt && daysSinceDelivery >= 2) {
      riskFactors.push('交付后未登录')
    }
    if (profile.lastActivityAt && daysSince(profile.lastActivityAt) >= 7) {
      riskFactors.push(`${daysSince(profile.lastActivityAt)}天未活动`)
    }
    if (milestones.filter((m) => m.isOverdue).length >= 2) {
      riskFactors.push('多个里程碑逾期')
    }
    if (profile.currentStage === 'at_risk') {
      riskFactors.push('处于流失风险阶段')
    }

    // 生成建议
    const recommendations: string[] = []
    if (!profile.firstLoginAt) {
      recommendations.push('联系用户确认是否收到登录信息')
    }
    if (profile.currentStage === 'first_login') {
      recommendations.push('发送产品使用教程')
    }
    if (profile.currentStage === 'exploring') {
      recommendations.push('引导用户使用核心功能')
    }
    if (riskFactors.length > 0) {
      recommendations.push('安排客户成功经理一对一跟进')
    }

    // 获取待执行的干预
    const nextActions = interventions.filter((i) => !i.executedAt)

    return {
      profile,
      metrics,
      milestones,
      recentInterventions: interventions.slice(-5),
      riskFactors,
      recommendations,
      nextActions,
    }
  }

  /**
   * 获取所有需要关注的客户
   */
  getCustomersNeedingAttention(): CustomerProfile[] {
    const result: CustomerProfile[] = []

    for (const profile of this.profiles.values()) {
      // 交付后3天未登录
      if (!profile.firstLoginAt && daysSince(profile.deliveredAt) >= 3) {
        result.push(profile)
        continue
      }

      // 流失风险
      if (profile.currentStage === 'at_risk' || profile.currentStage === 'churned') {
        result.push(profile)
        continue
      }

      // 健康分低
      if (profile.healthScore < 40) {
        result.push(profile)
        continue
      }

      // 长时间未活动
      if (profile.lastActivityAt && daysSince(profile.lastActivityAt) >= 14) {
        result.push(profile)
        continue
      }
    }

    return result.sort((a, b) => a.healthScore - b.healthScore)
  }

  /**
   * 生成客户成功仪表盘数据
   */
  generateDashboardData(): {
    totalCustomers: number
    byStage: Record<SuccessStage, number>
    avgHealthScore: number
    atRiskCount: number
    recentChurns: number
    activationRate: number
    pendingInterventions: number
  } {
    const profiles = Array.from(this.profiles.values())

    const byStage: Record<SuccessStage, number> = {
      delivered: 0,
      first_login: 0,
      exploring: 0,
      activated: 0,
      engaged: 0,
      champion: 0,
      at_risk: 0,
      churned: 0,
    }

    for (const profile of profiles) {
      byStage[profile.currentStage]++
    }

    const avgHealthScore =
      profiles.length > 0
        ? Math.round(profiles.reduce((sum, p) => sum + p.healthScore, 0) / profiles.length)
        : 0

    const recentChurns = profiles.filter(
      (p) => p.churnedAt && daysSince(p.churnedAt) <= 30
    ).length

    const activatedOrBetter =
      byStage.activated + byStage.engaged + byStage.champion
    const activationRate =
      profiles.length > 0
        ? Math.round((activatedOrBetter / profiles.length) * 100)
        : 0

    let pendingInterventions = 0
    for (const interventions of this.interventions.values()) {
      pendingInterventions += interventions.filter((i) => !i.executedAt).length
    }

    return {
      totalCustomers: profiles.length,
      byStage,
      avgHealthScore,
      atRiskCount: byStage.at_risk,
      recentChurns,
      activationRate,
      pendingInterventions,
    }
  }

  /**
   * 生成人话版健康报告 (给用户看)
   */
  generateUserFacingReport(userId: string, projectId: string): string {
    const report = this.generateHealthReport(userId, projectId)
    if (!report) return '暂无数据'

    const { profile, milestones } = report
    const completedMilestones = milestones.filter((m) => m.completed)

    const stageMessages: Record<SuccessStage, string> = {
      delivered: '产品已交付，期待您的首次登录！',
      first_login: '欢迎！您已成功登录，开始探索您的新产品吧！',
      exploring: '很好！您正在探索产品功能，继续加油！',
      activated: '太棒了！您已经开始使用核心功能了！',
      engaged: '您是活跃用户！感谢您的持续使用！',
      champion: '您是我们的超级用户！感谢您的支持！',
      at_risk: '我们发现您有一段时间没使用了，有什么可以帮到您的吗？',
      churned: '好久不见！我们很想念您，随时欢迎回来！',
    }

    return `
👋 您好，${profile.contactName}！

📊 您的产品使用状态
==================

当前状态: ${stageMessages[profile.currentStage]}

健康评分: ${'★'.repeat(Math.round(profile.healthScore / 20))}${'☆'.repeat(5 - Math.round(profile.healthScore / 20))} (${profile.healthScore}/100)

🎯 完成的里程碑 (${completedMilestones.length}/${milestones.length})
${completedMilestones.map((m) => `✅ ${m.name}`).join('\n') || '暂无'}

📝 待完成
${milestones
  .filter((m) => !m.completed)
  .slice(0, 3)
  .map((m) => `○ ${m.name} - ${m.description}`)
  .join('\n') || '全部完成！'}

💡 小贴士
${report.recommendations.slice(0, 2).join('\n') || '继续保持！'}

如有任何问题，请随时联系我们的客服团队！
`
  }

  /**
   * 获取客户档案
   */
  getProfile(userId: string, projectId: string): CustomerProfile | null {
    return this.profiles.get(`${userId}-${projectId}`) || null
  }
}

// ============================================
// 导出单例
// ============================================

export const customerSuccess = new CustomerSuccessService()

export default customerSuccess
