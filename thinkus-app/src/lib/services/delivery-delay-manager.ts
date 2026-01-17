/**
 * 交付延期管理系统
 *
 * 功能：
 * - 监测交付进度与承诺日期偏差
 * - 自动触发延期预警
 * - 生成客户沟通方案
 * - 计算补偿方案
 */

// ============================================
// 类型定义
// ============================================

/** 延期状态 */
export type DelayStatus =
  | 'on_track'      // 正常进行
  | 'at_risk'       // 有风险
  | 'delayed'       // 已延期
  | 'critical'      // 严重延期

/** 延期原因类型 */
export type DelayReasonType =
  | 'technical'     // 技术问题
  | 'requirement'   // 需求变更
  | 'resource'      // 资源不足
  | 'dependency'    // 依赖阻塞
  | 'testing'       // 测试问题
  | 'deployment'    // 部署问题
  | 'client'        // 客户原因
  | 'force_majeure' // 不可抗力
  | 'other'

/** 延期检测结果 */
export interface DelayDetection {
  projectId: string
  projectName: string
  status: DelayStatus
  statusCn: string

  // 时间信息
  promisedDate: Date
  estimatedDate: Date
  daysOverdue: number
  daysRemaining: number

  // 进度信息
  currentProgress: number     // 0-100
  expectedProgress: number    // 应该达到的进度
  progressGap: number         // 进度差距

  // 风险评估
  riskScore: number           // 0-100
  riskFactors: RiskFactor[]

  // 原因分析
  delayReasons: DelayReason[]

  // 建议操作
  recommendedActions: RecommendedAction[]
}

/** 风险因素 */
export interface RiskFactor {
  factor: string
  factorCn: string
  impact: 'high' | 'medium' | 'low'
  probability: number  // 0-100
  description: string
}

/** 延期原因 */
export interface DelayReason {
  type: DelayReasonType
  typeCn: string
  description: string
  impactDays: number
  isResolved: boolean
  resolvedAt?: Date
}

/** 建议操作 */
export interface RecommendedAction {
  action: string
  actionCn: string
  priority: 'critical' | 'high' | 'medium' | 'low'
  responsible: 'internal' | 'client' | 'both'
  deadline?: Date
}

/** 客户沟通方案 */
export interface CommunicationPlan {
  tone: 'apologetic' | 'informative' | 'collaborative'
  toneCn: string

  // 沟通内容
  subject: string
  emailTemplate: string
  smsTemplate: string

  // 关键信息
  keyPoints: string[]

  // 补偿建议
  compensation?: CompensationPlan

  // 新承诺日期
  newPromisedDate?: Date
  newDateReason: string
}

/** 补偿方案 */
export interface CompensationPlan {
  type: 'discount' | 'extend' | 'upgrade' | 'refund' | 'service'
  typeCn: string
  description: string
  value: number | string
  validUntil?: Date
  conditions?: string[]
}

/** 重新承诺 */
export interface Reschedule {
  projectId: string
  oldDate: Date
  newDate: Date
  reason: string
  notifiedAt: Date
  acknowledgedAt?: Date
  compensation?: CompensationPlan
}

/** 延期配置 */
export interface DelayConfig {
  projectId: string
  projectName: string
  promisedDate: Date
  currentPhase: string
  currentProgress: number
  milestones: Milestone[]
  blockers?: string[]
}

/** 里程碑 */
export interface Milestone {
  id: string
  name: string
  nameCn: string
  targetDate: Date
  completedAt?: Date
  weight: number  // 占总进度的权重
}

// ============================================
// 配置常量
// ============================================

/** 延期状态配置 */
const DELAY_STATUS_CONFIG: Record<DelayStatus, { label: string; color: string; threshold: number }> = {
  on_track: { label: '正常进行', color: '#22c55e', threshold: 0 },
  at_risk: { label: '有延期风险', color: '#eab308', threshold: 2 },
  delayed: { label: '已延期', color: '#f97316', threshold: 1 },
  critical: { label: '严重延期', color: '#ef4444', threshold: 7 },
}

/** 延期原因配置 */
const DELAY_REASON_CONFIG: Record<DelayReasonType, { label: string; defaultImpact: number }> = {
  technical: { label: '技术问题', defaultImpact: 3 },
  requirement: { label: '需求变更', defaultImpact: 5 },
  resource: { label: '资源不足', defaultImpact: 2 },
  dependency: { label: '依赖阻塞', defaultImpact: 4 },
  testing: { label: '测试问题', defaultImpact: 2 },
  deployment: { label: '部署问题', defaultImpact: 1 },
  client: { label: '客户原因', defaultImpact: 3 },
  force_majeure: { label: '不可抗力', defaultImpact: 7 },
  other: { label: '其他原因', defaultImpact: 2 },
}

/** 补偿方案配置 */
const COMPENSATION_CONFIG: Record<string, { type: CompensationPlan['type']; typeCn: string; description: string; minDelay: number }> = {
  discount_5: { type: 'discount', typeCn: '费用折扣', description: '享受5%费用减免', minDelay: 3 },
  discount_10: { type: 'discount', typeCn: '费用折扣', description: '享受10%费用减免', minDelay: 7 },
  extend_1m: { type: 'extend', typeCn: '服务延长', description: '免费延长1个月服务期', minDelay: 5 },
  extend_3m: { type: 'extend', typeCn: '服务延长', description: '免费延长3个月服务期', minDelay: 14 },
  upgrade: { type: 'upgrade', typeCn: '免费升级', description: '免费升级到更高版本', minDelay: 10 },
  service: { type: 'service', typeCn: '增值服务', description: '赠送额外技术支持服务', minDelay: 3 },
}

// ============================================
// 服务实现
// ============================================

export class DeliveryDelayManagerService {
  private static instance: DeliveryDelayManagerService
  private rescheduleHistory: Map<string, Reschedule[]> = new Map()

  static getInstance(): DeliveryDelayManagerService {
    if (!this.instance) {
      this.instance = new DeliveryDelayManagerService()
    }
    return this.instance
  }

  /**
   * 检测交付延期状态
   */
  async detectDelay(config: DelayConfig): Promise<DelayDetection> {
    const { projectId, projectName, promisedDate, currentProgress, milestones, blockers } = config
    const now = new Date()

    // 计算时间差
    const daysRemaining = Math.ceil((promisedDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24))
    const daysOverdue = daysRemaining < 0 ? Math.abs(daysRemaining) : 0

    // 计算期望进度
    const totalDays = this.calculateTotalDays(milestones)
    const elapsedDays = this.calculateElapsedDays(milestones, now)
    const expectedProgress = Math.min(100, Math.round((elapsedDays / totalDays) * 100))
    const progressGap = expectedProgress - currentProgress

    // 估算完成日期
    const estimatedDate = this.estimateCompletionDate(currentProgress, expectedProgress, promisedDate, progressGap)

    // 确定延期状态
    const status = this.determineStatus(daysOverdue, daysRemaining, progressGap)

    // 评估风险
    const { riskScore, riskFactors } = this.assessRisk(progressGap, daysRemaining, blockers)

    // 分析延期原因
    const delayReasons = this.analyzeDelayReasons(blockers || [], progressGap)

    // 生成建议操作
    const recommendedActions = this.generateRecommendations(status, riskFactors, delayReasons)

    return {
      projectId,
      projectName,
      status,
      statusCn: DELAY_STATUS_CONFIG[status].label,
      promisedDate,
      estimatedDate,
      daysOverdue,
      daysRemaining,
      currentProgress,
      expectedProgress,
      progressGap,
      riskScore,
      riskFactors,
      delayReasons,
      recommendedActions,
    }
  }

  /**
   * 生成客户沟通方案
   */
  async generateCommunication(detection: DelayDetection): Promise<CommunicationPlan> {
    const { status, daysOverdue, projectName, delayReasons, estimatedDate } = detection

    // 确定沟通语气
    const tone = this.determineTone(status, daysOverdue)
    const toneCn = tone === 'apologetic' ? '致歉型' : tone === 'informative' ? '告知型' : '协作型'

    // 生成关键信息点
    const keyPoints = this.generateKeyPoints(detection)

    // 计算补偿方案
    const compensation = this.calculateCompensation(daysOverdue, delayReasons)

    // 建议新承诺日期
    const newPromisedDate = this.calculateNewDate(estimatedDate, status)
    const newDateReason = this.generateDateReason(delayReasons)

    // 生成邮件模板
    const emailTemplate = this.generateEmailTemplate(detection, tone, compensation, newPromisedDate)
    const smsTemplate = this.generateSmsTemplate(detection, newPromisedDate)

    // 生成主题
    const subject = this.generateSubject(status, projectName)

    return {
      tone,
      toneCn,
      subject,
      emailTemplate,
      smsTemplate,
      keyPoints,
      compensation,
      newPromisedDate,
      newDateReason,
    }
  }

  /**
   * 计算补偿方案
   */
  calculateCompensation(daysOverdue: number, reasons: DelayReason[]): CompensationPlan | undefined {
    if (daysOverdue <= 0) return undefined

    // 检查是否为客户原因
    const clientCaused = reasons.some(r => r.type === 'client' && !r.isResolved)
    if (clientCaused) {
      // 客户原因导致的延期，不提供补偿
      return undefined
    }

    // 根据延期天数选择补偿方案
    const compensations = Object.values(COMPENSATION_CONFIG)
      .filter(c => c.minDelay <= daysOverdue)
      .sort((a, b) => b.minDelay - a.minDelay)

    if (compensations.length === 0) return undefined

    const selected = compensations[0]

    return {
      type: selected.type,
      typeCn: selected.typeCn,
      description: selected.description,
      value: selected.type === 'discount' ? `${daysOverdue >= 7 ? 10 : 5}%` : selected.description,
      conditions: ['补偿在项目交付后生效', '不与其他优惠叠加'],
    }
  }

  /**
   * 重新安排交付日期
   */
  async scheduleReschedule(
    projectId: string,
    newDate: Date,
    reason: string,
    compensation?: CompensationPlan
  ): Promise<Reschedule> {
    const history = this.rescheduleHistory.get(projectId) || []
    const oldDate = history.length > 0
      ? history[history.length - 1].newDate
      : new Date() // 首次应该从原始承诺日期获取

    const reschedule: Reschedule = {
      projectId,
      oldDate,
      newDate,
      reason,
      notifiedAt: new Date(),
      compensation,
    }

    history.push(reschedule)
    this.rescheduleHistory.set(projectId, history)

    return reschedule
  }

  /**
   * 获取重新安排历史
   */
  getRescheduleHistory(projectId: string): Reschedule[] {
    return this.rescheduleHistory.get(projectId) || []
  }

  /**
   * 确认收到延期通知
   */
  async acknowledgeReschedule(projectId: string): Promise<void> {
    const history = this.rescheduleHistory.get(projectId) || []
    if (history.length > 0) {
      history[history.length - 1].acknowledgedAt = new Date()
    }
  }

  // ============================================
  // 私有方法
  // ============================================

  private calculateTotalDays(milestones: Milestone[]): number {
    if (milestones.length === 0) return 30 // 默认30天
    const first = milestones[0].targetDate
    const last = milestones[milestones.length - 1].targetDate
    return Math.ceil((last.getTime() - first.getTime()) / (1000 * 60 * 60 * 24)) || 30
  }

  private calculateElapsedDays(milestones: Milestone[], now: Date): number {
    if (milestones.length === 0) return 0
    const first = milestones[0].targetDate
    return Math.max(0, Math.ceil((now.getTime() - first.getTime()) / (1000 * 60 * 60 * 24)))
  }

  private estimateCompletionDate(
    currentProgress: number,
    expectedProgress: number,
    promisedDate: Date,
    progressGap: number
  ): Date {
    if (progressGap <= 0) {
      return promisedDate // 进度正常或超前
    }

    // 根据进度差距估算额外需要的天数
    const extraDays = Math.ceil(progressGap * 0.5) // 假设每2%进度差距需要1天
    const estimated = new Date(promisedDate)
    estimated.setDate(estimated.getDate() + extraDays)
    return estimated
  }

  private determineStatus(daysOverdue: number, daysRemaining: number, progressGap: number): DelayStatus {
    if (daysOverdue >= 7) return 'critical'
    if (daysOverdue > 0) return 'delayed'
    if (daysRemaining <= 2 && progressGap > 20) return 'at_risk'
    if (progressGap > 30) return 'at_risk'
    return 'on_track'
  }

  private assessRisk(
    progressGap: number,
    daysRemaining: number,
    blockers?: string[]
  ): { riskScore: number; riskFactors: RiskFactor[] } {
    const riskFactors: RiskFactor[] = []
    let riskScore = 0

    // 进度差距风险
    if (progressGap > 0) {
      const impact = progressGap > 30 ? 'high' : progressGap > 15 ? 'medium' : 'low'
      riskFactors.push({
        factor: 'progress_gap',
        factorCn: '进度落后',
        impact,
        probability: Math.min(100, progressGap * 2),
        description: `当前进度落后预期 ${progressGap}%`,
      })
      riskScore += progressGap
    }

    // 时间紧迫风险
    if (daysRemaining <= 3) {
      riskFactors.push({
        factor: 'time_pressure',
        factorCn: '时间紧迫',
        impact: daysRemaining <= 1 ? 'high' : 'medium',
        probability: 80,
        description: `距离承诺日期仅剩 ${daysRemaining} 天`,
      })
      riskScore += (4 - daysRemaining) * 10
    }

    // 阻塞问题风险
    if (blockers && blockers.length > 0) {
      riskFactors.push({
        factor: 'blockers',
        factorCn: '阻塞问题',
        impact: blockers.length >= 3 ? 'high' : 'medium',
        probability: 70,
        description: `存在 ${blockers.length} 个阻塞问题`,
      })
      riskScore += blockers.length * 10
    }

    return { riskScore: Math.min(100, riskScore), riskFactors }
  }

  private analyzeDelayReasons(blockers: string[], progressGap: number): DelayReason[] {
    const reasons: DelayReason[] = []

    // 分析阻塞问题
    for (const blocker of blockers) {
      const type = this.categorizeBlocker(blocker)
      reasons.push({
        type,
        typeCn: DELAY_REASON_CONFIG[type].label,
        description: blocker,
        impactDays: DELAY_REASON_CONFIG[type].defaultImpact,
        isResolved: false,
      })
    }

    // 如果有进度差距但没有明确阻塞问题，添加默认原因
    if (progressGap > 10 && reasons.length === 0) {
      reasons.push({
        type: 'technical',
        typeCn: '技术问题',
        description: '开发过程中遇到技术挑战',
        impactDays: Math.ceil(progressGap / 5),
        isResolved: false,
      })
    }

    return reasons
  }

  private categorizeBlocker(blocker: string): DelayReasonType {
    const lowerBlocker = blocker.toLowerCase()

    if (lowerBlocker.includes('技术') || lowerBlocker.includes('bug') || lowerBlocker.includes('错误')) {
      return 'technical'
    }
    if (lowerBlocker.includes('需求') || lowerBlocker.includes('变更') || lowerBlocker.includes('修改')) {
      return 'requirement'
    }
    if (lowerBlocker.includes('资源') || lowerBlocker.includes('人手') || lowerBlocker.includes('人员')) {
      return 'resource'
    }
    if (lowerBlocker.includes('依赖') || lowerBlocker.includes('第三方') || lowerBlocker.includes('等待')) {
      return 'dependency'
    }
    if (lowerBlocker.includes('测试') || lowerBlocker.includes('验证')) {
      return 'testing'
    }
    if (lowerBlocker.includes('部署') || lowerBlocker.includes('发布') || lowerBlocker.includes('上线')) {
      return 'deployment'
    }
    if (lowerBlocker.includes('客户') || lowerBlocker.includes('用户') || lowerBlocker.includes('对方')) {
      return 'client'
    }

    return 'other'
  }

  private generateRecommendations(
    status: DelayStatus,
    riskFactors: RiskFactor[],
    delayReasons: DelayReason[]
  ): RecommendedAction[] {
    const actions: RecommendedAction[] = []

    // 基于状态的建议
    if (status === 'critical' || status === 'delayed') {
      actions.push({
        action: 'notify_client',
        actionCn: '立即通知客户当前情况',
        priority: 'critical',
        responsible: 'internal',
      })
    }

    // 基于风险因素的建议
    for (const risk of riskFactors) {
      if (risk.factor === 'progress_gap' && risk.impact === 'high') {
        actions.push({
          action: 'add_resources',
          actionCn: '增加开发资源加快进度',
          priority: 'high',
          responsible: 'internal',
        })
      }
      if (risk.factor === 'blockers') {
        actions.push({
          action: 'resolve_blockers',
          actionCn: '优先解决阻塞问题',
          priority: 'high',
          responsible: 'internal',
        })
      }
    }

    // 基于延期原因的建议
    for (const reason of delayReasons) {
      if (reason.type === 'requirement' && !reason.isResolved) {
        actions.push({
          action: 'confirm_requirements',
          actionCn: '与客户确认最终需求',
          priority: 'high',
          responsible: 'both',
        })
      }
      if (reason.type === 'client' && !reason.isResolved) {
        actions.push({
          action: 'follow_up_client',
          actionCn: '跟进客户配合事项',
          priority: 'high',
          responsible: 'internal',
        })
      }
    }

    // 去重并按优先级排序
    const uniqueActions = Array.from(new Map(actions.map(a => [a.action, a])).values())
    const priorityOrder = { critical: 0, high: 1, medium: 2, low: 3 }
    uniqueActions.sort((a, b) => priorityOrder[a.priority] - priorityOrder[b.priority])

    return uniqueActions.slice(0, 5)
  }

  private determineTone(status: DelayStatus, daysOverdue: number): 'apologetic' | 'informative' | 'collaborative' {
    if (status === 'critical' || daysOverdue >= 7) return 'apologetic'
    if (status === 'delayed') return 'apologetic'
    if (status === 'at_risk') return 'informative'
    return 'collaborative'
  }

  private generateKeyPoints(detection: DelayDetection): string[] {
    const points: string[] = []

    if (detection.status === 'delayed' || detection.status === 'critical') {
      points.push(`项目已延期 ${detection.daysOverdue} 天`)
    } else if (detection.status === 'at_risk') {
      points.push(`项目存在延期风险，当前进度 ${detection.currentProgress}%`)
    }

    points.push(`预计完成日期: ${detection.estimatedDate.toLocaleDateString('zh-CN')}`)

    if (detection.delayReasons.length > 0) {
      points.push(`主要原因: ${detection.delayReasons[0].typeCn}`)
    }

    return points
  }

  private calculateNewDate(estimatedDate: Date, status: DelayStatus): Date | undefined {
    if (status === 'on_track') return undefined

    // 在估算日期基础上增加缓冲
    const buffer = status === 'critical' ? 3 : status === 'delayed' ? 2 : 1
    const newDate = new Date(estimatedDate)
    newDate.setDate(newDate.getDate() + buffer)
    return newDate
  }

  private generateDateReason(reasons: DelayReason[]): string {
    if (reasons.length === 0) {
      return '综合评估项目进度后确定'
    }
    const mainReason = reasons[0]
    return `由于${mainReason.typeCn}，需要额外时间确保交付质量`
  }

  private generateSubject(status: DelayStatus, projectName: string): string {
    switch (status) {
      case 'critical':
        return `【重要】${projectName} 项目交付时间调整通知`
      case 'delayed':
        return `${projectName} 项目交付时间更新`
      case 'at_risk':
        return `${projectName} 项目进度说明`
      default:
        return `${projectName} 项目进展顺利`
    }
  }

  private generateEmailTemplate(
    detection: DelayDetection,
    tone: 'apologetic' | 'informative' | 'collaborative',
    compensation?: CompensationPlan,
    newDate?: Date
  ): string {
    const { projectName, daysOverdue, currentProgress, delayReasons } = detection

    let greeting = '尊敬的客户：'
    let opening = ''
    let body = ''
    let closing = ''

    switch (tone) {
      case 'apologetic':
        opening = `感谢您对 ${projectName} 项目的信任与支持。我们非常抱歉地通知您，由于项目开发过程中遇到了一些挑战，原定的交付时间需要进行调整。`
        body = `
目前项目进度为 ${currentProgress}%，${delayReasons.length > 0 ? `主要受到${delayReasons[0].typeCn}的影响。` : ''}

我们已经采取以下措施加快进度：
• 增派技术资源投入
• 优化开发流程
• 加强质量把控

${newDate ? `新的预计交付日期为：${newDate.toLocaleDateString('zh-CN')}` : ''}
${compensation ? `\n为表达我们的歉意，我们将为您提供：${compensation.description}` : ''}`
        closing = `我们深感抱歉给您带来的不便，并将全力以赴确保项目高质量交付。如有任何疑问，请随时与我们联系。`
        break

      case 'informative':
        opening = `感谢您对 ${projectName} 项目的关注。我们想向您同步一下项目的最新进展情况。`
        body = `
项目当前进度：${currentProgress}%
${delayReasons.length > 0 ? `当前主要关注点：${delayReasons[0].description}` : ''}
${newDate ? `预计交付日期：${newDate.toLocaleDateString('zh-CN')}` : ''}

我们正在积极推进各项工作，确保项目按计划完成。`
        closing = `如果您有任何问题或建议，欢迎随时与我们沟通。`
        break

      case 'collaborative':
        opening = `${projectName} 项目进展顺利，感谢您的配合与支持。`
        body = `
项目当前进度：${currentProgress}%

接下来我们将继续按计划推进，期待与您共同见证项目的成功交付。`
        closing = `如有任何需要配合的事项，请及时告知我们。`
        break
    }

    return `${greeting}

${opening}

${body}

${closing}

此致
敬礼

Thinkus 交付团队
${new Date().toLocaleDateString('zh-CN')}`
  }

  private generateSmsTemplate(detection: DelayDetection, newDate?: Date): string {
    const { projectName, status, currentProgress } = detection

    if (status === 'critical' || status === 'delayed') {
      return `【Thinkus】您的${projectName}项目交付时间已更新${newDate ? `至${newDate.toLocaleDateString('zh-CN')}` : ''}，当前进度${currentProgress}%。详情请查看邮件或联系客服。`
    }

    return `【Thinkus】${projectName}项目进展顺利，当前进度${currentProgress}%${newDate ? `，预计${newDate.toLocaleDateString('zh-CN')}交付` : ''}。`
  }

  // ============================================
  // HTML报告生成
  // ============================================

  /**
   * 生成延期状态HTML报告
   */
  generateDelayReportHtml(detection: DelayDetection, communication?: CommunicationPlan): string {
    const statusColor = DELAY_STATUS_CONFIG[detection.status].color

    return `<!DOCTYPE html>
<html lang="zh-CN">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>交付延期报告 - ${detection.projectName}</title>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; background: #f8fafc; color: #1e293b; }
    .container { max-width: 800px; margin: 0 auto; padding: 24px; }
    .header { background: linear-gradient(135deg, ${statusColor} 0%, ${statusColor}cc 100%); color: white; padding: 32px; border-radius: 16px; margin-bottom: 24px; }
    .header h1 { font-size: 24px; margin-bottom: 8px; }
    .status-badge { display: inline-block; background: rgba(255,255,255,0.2); padding: 6px 16px; border-radius: 20px; font-size: 14px; }
    .card { background: white; border-radius: 16px; padding: 24px; margin-bottom: 24px; box-shadow: 0 4px 6px -1px rgba(0,0,0,0.1); }
    .card h2 { font-size: 18px; margin-bottom: 16px; display: flex; align-items: center; gap: 8px; }
    .stat-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(150px, 1fr)); gap: 16px; }
    .stat { text-align: center; padding: 16px; background: #f8fafc; border-radius: 12px; }
    .stat-value { font-size: 32px; font-weight: 700; color: #6366f1; }
    .stat-label { font-size: 14px; color: #64748b; margin-top: 4px; }
    .risk-item { padding: 12px; border-left: 4px solid; margin-bottom: 8px; background: #f8fafc; border-radius: 0 8px 8px 0; }
    .risk-item.high { border-color: #ef4444; }
    .risk-item.medium { border-color: #eab308; }
    .risk-item.low { border-color: #22c55e; }
    .action-item { display: flex; align-items: center; gap: 12px; padding: 12px; background: #f8fafc; border-radius: 8px; margin-bottom: 8px; }
    .action-priority { font-size: 12px; padding: 4px 8px; border-radius: 4px; font-weight: 600; }
    .action-priority.critical { background: #fee2e2; color: #dc2626; }
    .action-priority.high { background: #ffedd5; color: #ea580c; }
    .action-priority.medium { background: #fef9c3; color: #ca8a04; }
    .compensation { background: #f0fdf4; border: 1px solid #86efac; padding: 16px; border-radius: 12px; }
    .compensation h3 { color: #16a34a; margin-bottom: 8px; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>${detection.projectName}</h1>
      <p style="opacity: 0.9; margin-bottom: 16px;">交付延期状态报告</p>
      <span class="status-badge">${detection.statusCn}</span>
    </div>

    <div class="card">
      <h2>📊 时间概览</h2>
      <div class="stat-grid">
        <div class="stat">
          <div class="stat-value">${detection.currentProgress}%</div>
          <div class="stat-label">当前进度</div>
        </div>
        <div class="stat">
          <div class="stat-value" style="color: ${detection.daysOverdue > 0 ? '#ef4444' : '#22c55e'}">${detection.daysOverdue > 0 ? `+${detection.daysOverdue}` : detection.daysRemaining}</div>
          <div class="stat-label">${detection.daysOverdue > 0 ? '已延期天数' : '剩余天数'}</div>
        </div>
        <div class="stat">
          <div class="stat-value">${detection.riskScore}</div>
          <div class="stat-label">风险评分</div>
        </div>
      </div>
    </div>

    ${detection.riskFactors.length > 0 ? `
    <div class="card">
      <h2>⚠️ 风险因素</h2>
      ${detection.riskFactors.map(r => `
        <div class="risk-item ${r.impact}">
          <strong>${r.factorCn}</strong>
          <p style="color: #64748b; font-size: 14px; margin-top: 4px;">${r.description}</p>
        </div>
      `).join('')}
    </div>
    ` : ''}

    ${detection.recommendedActions.length > 0 ? `
    <div class="card">
      <h2>✅ 建议操作</h2>
      ${detection.recommendedActions.map(a => `
        <div class="action-item">
          <span class="action-priority ${a.priority}">${a.priority.toUpperCase()}</span>
          <span>${a.actionCn}</span>
        </div>
      `).join('')}
    </div>
    ` : ''}

    ${communication?.compensation ? `
    <div class="card">
      <h2>🎁 补偿方案</h2>
      <div class="compensation">
        <h3>${communication.compensation.typeCn}</h3>
        <p>${communication.compensation.description}</p>
      </div>
    </div>
    ` : ''}
  </div>
</body>
</html>`
  }
}

// 导出单例
export const deliveryDelayManager = DeliveryDelayManagerService.getInstance()
