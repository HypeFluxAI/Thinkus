/**
 * SLA保障服务 (小白用户自动化交付)
 *
 * 功能:
 * - 定义服务等级协议
 * - 自动追踪SLA达成情况
 * - 超时自动升级处理
 * - 违约自动补偿
 *
 * 设计理念:
 * - 明确的服务承诺
 * - 自动化的SLA追踪
 * - 透明的达成报告
 */

// ============================================
// 类型定义
// ============================================

export type SLACategory =
  | 'uptime' // 可用性
  | 'response' // 响应时间
  | 'resolution' // 解决时间
  | 'delivery' // 交付时间
  | 'support' // 支持响应

export type SLAPriority = 'critical' | 'high' | 'normal' | 'low'

export type SLAStatus = 'on_track' | 'at_risk' | 'breached' | 'met'

export interface SLADefinition {
  id: string
  category: SLACategory
  name: string
  description: string // 人话描述
  target: number // 目标值
  unit: 'percent' | 'minutes' | 'hours' | 'days'
  priority: SLAPriority
  compensationPercent?: number // 违约补偿百分比
}

export interface SLARecord {
  id: string
  projectId: string
  slaId: string
  startTime: Date
  targetTime: Date
  actualEndTime?: Date
  status: SLAStatus
  breachReason?: string
  compensationApplied?: boolean
  notes?: string
}

export interface SLAMetrics {
  projectId: string
  period: 'day' | 'week' | 'month' | 'quarter'
  startDate: Date
  endDate: Date
  metrics: {
    slaId: string
    category: SLACategory
    target: number
    actual: number
    achieved: boolean
    compliance: number // 达成率 0-100
    breachCount: number
  }[]
  overallCompliance: number
}

export interface SLAAlert {
  id: string
  projectId: string
  slaId: string
  recordId: string
  type: 'warning' | 'breach' | 'escalation'
  message: string
  createdAt: Date
  acknowledgedAt?: Date
  escalatedTo?: string
}

export interface SLACompensation {
  id: string
  projectId: string
  recordId: string
  breachType: string
  amount: number
  currency: string
  status: 'pending' | 'approved' | 'applied' | 'rejected'
  createdAt: Date
  appliedAt?: Date
}

// ============================================
// SLA定义
// ============================================

const SLA_DEFINITIONS: SLADefinition[] = [
  // 可用性SLA
  {
    id: 'uptime_99',
    category: 'uptime',
    name: '服务可用性',
    description: '您的产品每月可用时间不低于99%',
    target: 99,
    unit: 'percent',
    priority: 'critical',
    compensationPercent: 10,
  },
  {
    id: 'uptime_999',
    category: 'uptime',
    name: '高可用服务',
    description: '您的产品每月可用时间不低于99.9%',
    target: 99.9,
    unit: 'percent',
    priority: 'critical',
    compensationPercent: 20,
  },

  // 响应时间SLA
  {
    id: 'response_critical',
    category: 'response',
    name: '紧急问题响应',
    description: '紧急问题15分钟内响应',
    target: 15,
    unit: 'minutes',
    priority: 'critical',
    compensationPercent: 5,
  },
  {
    id: 'response_high',
    category: 'response',
    name: '重要问题响应',
    description: '重要问题1小时内响应',
    target: 60,
    unit: 'minutes',
    priority: 'high',
  },
  {
    id: 'response_normal',
    category: 'response',
    name: '一般问题响应',
    description: '一般问题4小时内响应',
    target: 240,
    unit: 'minutes',
    priority: 'normal',
  },
  {
    id: 'response_low',
    category: 'response',
    name: '咨询问题响应',
    description: '咨询类问题24小时内响应',
    target: 1440,
    unit: 'minutes',
    priority: 'low',
  },

  // 解决时间SLA
  {
    id: 'resolution_critical',
    category: 'resolution',
    name: '紧急问题解决',
    description: '紧急问题4小时内解决',
    target: 4,
    unit: 'hours',
    priority: 'critical',
    compensationPercent: 10,
  },
  {
    id: 'resolution_high',
    category: 'resolution',
    name: '重要问题解决',
    description: '重要问题24小时内解决',
    target: 24,
    unit: 'hours',
    priority: 'high',
    compensationPercent: 5,
  },
  {
    id: 'resolution_normal',
    category: 'resolution',
    name: '一般问题解决',
    description: '一般问题3个工作日内解决',
    target: 72,
    unit: 'hours',
    priority: 'normal',
  },

  // 交付时间SLA
  {
    id: 'delivery_standard',
    category: 'delivery',
    name: '标准交付',
    description: '标准项目7个工作日内交付',
    target: 7,
    unit: 'days',
    priority: 'normal',
  },
  {
    id: 'delivery_express',
    category: 'delivery',
    name: '加急交付',
    description: '加急项目3个工作日内交付',
    target: 3,
    unit: 'days',
    priority: 'high',
    compensationPercent: 15,
  },

  // 支持响应SLA
  {
    id: 'support_online',
    category: 'support',
    name: '在线支持',
    description: '工作时间内即时响应',
    target: 5,
    unit: 'minutes',
    priority: 'high',
  },
  {
    id: 'support_callback',
    category: 'support',
    name: '电话回复',
    description: '24小时内电话回复',
    target: 24,
    unit: 'hours',
    priority: 'normal',
  },
]

// ============================================
// 升级规则
// ============================================

const ESCALATION_RULES: {
  condition: (record: SLARecord, definition: SLADefinition) => boolean
  escalateTo: string
  message: string
}[] = [
  {
    condition: (record, def) => {
      const elapsed = Date.now() - record.startTime.getTime()
      const target = getTargetMs(def.target, def.unit)
      return elapsed >= target * 0.8 && record.status === 'on_track'
    },
    escalateTo: 'team_lead',
    message: 'SLA即将超时，请立即处理',
  },
  {
    condition: (record) => record.status === 'breached',
    escalateTo: 'manager',
    message: 'SLA已违约，需要管理层介入',
  },
  {
    condition: (record, def) => {
      const elapsed = Date.now() - record.startTime.getTime()
      const target = getTargetMs(def.target, def.unit)
      return elapsed >= target * 1.5 && record.status === 'breached'
    },
    escalateTo: 'director',
    message: 'SLA严重违约，需要高层介入',
  },
]

// ============================================
// 辅助函数
// ============================================

function getTargetMs(target: number, unit: 'percent' | 'minutes' | 'hours' | 'days'): number {
  switch (unit) {
    case 'minutes':
      return target * 60 * 1000
    case 'hours':
      return target * 60 * 60 * 1000
    case 'days':
      return target * 24 * 60 * 60 * 1000
    default:
      return target
  }
}

function formatDuration(ms: number): string {
  const minutes = Math.floor(ms / (60 * 1000))
  const hours = Math.floor(ms / (60 * 60 * 1000))
  const days = Math.floor(ms / (24 * 60 * 60 * 1000))

  if (days > 0) return `${days}天${hours % 24}小时`
  if (hours > 0) return `${hours}小时${minutes % 60}分钟`
  return `${minutes}分钟`
}

function generateId(): string {
  return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`
}

// ============================================
// SLA保障服务
// ============================================

export class SLAGuaranteeService {
  private records: Map<string, SLARecord[]> = new Map()
  private alerts: Map<string, SLAAlert[]> = new Map()
  private compensations: Map<string, SLACompensation[]> = new Map()

  /**
   * 获取所有SLA定义
   */
  getSLADefinitions(): SLADefinition[] {
    return SLA_DEFINITIONS
  }

  /**
   * 根据优先级获取SLA
   */
  getSLAByPriority(priority: SLAPriority, category?: SLACategory): SLADefinition | null {
    return (
      SLA_DEFINITIONS.find(
        (s) => s.priority === priority && (!category || s.category === category)
      ) || null
    )
  }

  /**
   * 开始SLA追踪
   */
  startTracking(projectId: string, slaId: string): SLARecord {
    const definition = SLA_DEFINITIONS.find((s) => s.id === slaId)
    if (!definition) {
      throw new Error(`SLA ${slaId} 不存在`)
    }

    const targetMs = getTargetMs(definition.target, definition.unit)

    const record: SLARecord = {
      id: generateId(),
      projectId,
      slaId,
      startTime: new Date(),
      targetTime: new Date(Date.now() + targetMs),
      status: 'on_track',
    }

    const projectRecords = this.records.get(projectId) || []
    projectRecords.push(record)
    this.records.set(projectId, projectRecords)

    return record
  }

  /**
   * 完成SLA追踪
   */
  completeTracking(recordId: string, success: boolean, notes?: string): SLARecord | null {
    for (const [projectId, records] of this.records) {
      const record = records.find((r) => r.id === recordId)
      if (record) {
        record.actualEndTime = new Date()
        record.status = success ? 'met' : 'breached'
        record.notes = notes

        if (!success) {
          record.breachReason = notes || 'SLA未能达成'
          this.handleBreach(projectId, record)
        }

        return record
      }
    }
    return null
  }

  /**
   * 检查SLA状态
   */
  checkStatus(recordId: string): SLAStatus {
    for (const records of this.records.values()) {
      const record = records.find((r) => r.id === recordId)
      if (record) {
        if (record.actualEndTime) {
          return record.status
        }

        const now = Date.now()
        const targetTime = record.targetTime.getTime()
        const startTime = record.startTime.getTime()
        const elapsed = now - startTime
        const total = targetTime - startTime

        if (now >= targetTime) {
          record.status = 'breached'
          this.handleBreach(record.projectId, record)
          return 'breached'
        } else if (elapsed >= total * 0.8) {
          record.status = 'at_risk'
          this.createAlert(record, 'warning', 'SLA即将超时')
          return 'at_risk'
        }

        return 'on_track'
      }
    }
    return 'on_track'
  }

  /**
   * 处理SLA违约
   */
  private handleBreach(projectId: string, record: SLARecord): void {
    const definition = SLA_DEFINITIONS.find((s) => s.id === record.slaId)
    if (!definition) return

    // 创建违约告警
    this.createAlert(record, 'breach', `SLA ${definition.name} 已违约`)

    // 创建补偿记录
    if (definition.compensationPercent) {
      this.createCompensation(projectId, record, definition)
    }

    // 触发升级
    this.checkEscalation(record, definition)
  }

  /**
   * 创建告警
   */
  private createAlert(
    record: SLARecord,
    type: 'warning' | 'breach' | 'escalation',
    message: string
  ): SLAAlert {
    const alert: SLAAlert = {
      id: generateId(),
      projectId: record.projectId,
      slaId: record.slaId,
      recordId: record.id,
      type,
      message,
      createdAt: new Date(),
    }

    const projectAlerts = this.alerts.get(record.projectId) || []
    projectAlerts.push(alert)
    this.alerts.set(record.projectId, projectAlerts)

    return alert
  }

  /**
   * 创建补偿
   */
  private createCompensation(
    projectId: string,
    record: SLARecord,
    definition: SLADefinition
  ): SLACompensation {
    const compensation: SLACompensation = {
      id: generateId(),
      projectId,
      recordId: record.id,
      breachType: definition.name,
      amount: definition.compensationPercent || 0,
      currency: 'percent',
      status: 'pending',
      createdAt: new Date(),
    }

    const projectCompensations = this.compensations.get(projectId) || []
    projectCompensations.push(compensation)
    this.compensations.set(projectId, projectCompensations)

    return compensation
  }

  /**
   * 检查升级
   */
  private checkEscalation(record: SLARecord, definition: SLADefinition): void {
    for (const rule of ESCALATION_RULES) {
      if (rule.condition(record, definition)) {
        this.createAlert(record, 'escalation', `${rule.message} - 已升级至 ${rule.escalateTo}`)
      }
    }
  }

  /**
   * 获取SLA指标
   */
  getMetrics(
    projectId: string,
    period: 'day' | 'week' | 'month' | 'quarter'
  ): SLAMetrics {
    const now = new Date()
    let startDate: Date

    switch (period) {
      case 'day':
        startDate = new Date(now.getTime() - 24 * 60 * 60 * 1000)
        break
      case 'week':
        startDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000)
        break
      case 'month':
        startDate = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000)
        break
      case 'quarter':
        startDate = new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000)
        break
    }

    const records = (this.records.get(projectId) || []).filter(
      (r) => r.startTime >= startDate && r.actualEndTime
    )

    const metricsByCategory = new Map<string, {
      total: number
      met: number
      breached: number
    }>()

    for (const record of records) {
      const key = record.slaId
      const current = metricsByCategory.get(key) || { total: 0, met: 0, breached: 0 }
      current.total++
      if (record.status === 'met') current.met++
      if (record.status === 'breached') current.breached++
      metricsByCategory.set(key, current)
    }

    const metrics = Array.from(metricsByCategory.entries()).map(([slaId, data]) => {
      const definition = SLA_DEFINITIONS.find((s) => s.id === slaId)!
      return {
        slaId,
        category: definition.category,
        target: definition.target,
        actual: data.total > 0 ? (data.met / data.total) * 100 : 100,
        achieved: data.breached === 0,
        compliance: data.total > 0 ? (data.met / data.total) * 100 : 100,
        breachCount: data.breached,
      }
    })

    const overallCompliance =
      metrics.length > 0
        ? metrics.reduce((sum, m) => sum + m.compliance, 0) / metrics.length
        : 100

    return {
      projectId,
      period,
      startDate,
      endDate: now,
      metrics,
      overallCompliance: Math.round(overallCompliance),
    }
  }

  /**
   * 获取项目的告警
   */
  getAlerts(projectId: string, unacknowledgedOnly = false): SLAAlert[] {
    const alerts = this.alerts.get(projectId) || []
    if (unacknowledgedOnly) {
      return alerts.filter((a) => !a.acknowledgedAt)
    }
    return alerts
  }

  /**
   * 确认告警
   */
  acknowledgeAlert(alertId: string): boolean {
    for (const alerts of this.alerts.values()) {
      const alert = alerts.find((a) => a.id === alertId)
      if (alert) {
        alert.acknowledgedAt = new Date()
        return true
      }
    }
    return false
  }

  /**
   * 获取待处理补偿
   */
  getPendingCompensations(projectId?: string): SLACompensation[] {
    const result: SLACompensation[] = []

    if (projectId) {
      return (this.compensations.get(projectId) || []).filter(
        (c) => c.status === 'pending'
      )
    }

    for (const compensations of this.compensations.values()) {
      result.push(...compensations.filter((c) => c.status === 'pending'))
    }

    return result
  }

  /**
   * 应用补偿
   */
  applyCompensation(compensationId: string): boolean {
    for (const compensations of this.compensations.values()) {
      const compensation = compensations.find((c) => c.id === compensationId)
      if (compensation) {
        compensation.status = 'applied'
        compensation.appliedAt = new Date()

        // 同时标记记录
        for (const records of this.records.values()) {
          const record = records.find((r) => r.id === compensation.recordId)
          if (record) {
            record.compensationApplied = true
            break
          }
        }

        return true
      }
    }
    return false
  }

  /**
   * 生成SLA报告 (人话版)
   */
  generateUserReport(projectId: string): string {
    const metrics = this.getMetrics(projectId, 'month')
    const alerts = this.getAlerts(projectId).filter(
      (a) => a.createdAt >= metrics.startDate
    )
    const compensations = this.compensations.get(projectId) || []
    const appliedCompensations = compensations.filter(
      (c) => c.status === 'applied' && c.appliedAt && c.appliedAt >= metrics.startDate
    )

    return `
📊 服务等级报告 (过去30天)
========================

✅ 总体达成率: ${metrics.overallCompliance}%

📈 各项指标:
${metrics.metrics
  .map((m) => {
    const def = SLA_DEFINITIONS.find((s) => s.id === m.slaId)!
    const emoji = m.achieved ? '✅' : m.compliance >= 90 ? '⚠️' : '❌'
    return `${emoji} ${def.name}: ${Math.round(m.compliance)}% (目标 ${def.target}${def.unit === 'percent' ? '%' : def.unit})`
  })
  .join('\n')}

⚠️ 告警数量: ${alerts.length}
${alerts.length > 0 ? `  - 违约: ${alerts.filter((a) => a.type === 'breach').length}` : ''}
${alerts.length > 0 ? `  - 预警: ${alerts.filter((a) => a.type === 'warning').length}` : ''}

💰 已补偿: ${appliedCompensations.length > 0 ? `${appliedCompensations.reduce((sum, c) => sum + c.amount, 0)}%` : '无'}

我们承诺持续提供高质量的服务。如有任何问题，请随时联系我们。
`
  }

  /**
   * 生成SLA承诺页面
   */
  generateSLAPage(): string {
    const categorizedSLAs = new Map<SLACategory, SLADefinition[]>()

    for (const sla of SLA_DEFINITIONS) {
      const list = categorizedSLAs.get(sla.category) || []
      list.push(sla)
      categorizedSLAs.set(sla.category, list)
    }

    const categoryNames: Record<SLACategory, string> = {
      uptime: '可用性保障',
      response: '响应时间',
      resolution: '问题解决',
      delivery: '交付时间',
      support: '支持服务',
    }

    const categoryIcons: Record<SLACategory, string> = {
      uptime: '⏰',
      response: '💬',
      resolution: '🔧',
      delivery: '📦',
      support: '🤝',
    }

    return `
<!DOCTYPE html>
<html lang="zh-CN">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>服务等级承诺</title>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body {
      font-family: 'PingFang SC', 'Microsoft YaHei', sans-serif;
      background: #f5f5f5;
      padding: 24px;
    }
    .container { max-width: 900px; margin: 0 auto; }
    .header {
      background: linear-gradient(135deg, #2563eb, #1e40af);
      color: #fff;
      padding: 48px 32px;
      border-radius: 16px;
      text-align: center;
      margin-bottom: 32px;
    }
    .header h1 { font-size: 32px; margin-bottom: 16px; }
    .header p { font-size: 16px; opacity: 0.9; }
    .category {
      background: #fff;
      border-radius: 16px;
      padding: 24px;
      margin-bottom: 16px;
    }
    .category h2 {
      font-size: 20px;
      margin-bottom: 16px;
      display: flex;
      align-items: center;
      gap: 8px;
    }
    .sla-item {
      display: flex;
      justify-content: space-between;
      align-items: center;
      padding: 16px;
      background: #f8fafc;
      border-radius: 8px;
      margin-bottom: 8px;
    }
    .sla-info h3 { font-size: 16px; margin-bottom: 4px; }
    .sla-info p { font-size: 14px; color: #666; }
    .sla-target {
      text-align: right;
    }
    .sla-target .value {
      font-size: 24px;
      font-weight: bold;
      color: #2563eb;
    }
    .sla-target .unit {
      font-size: 12px;
      color: #666;
    }
    .compensation {
      font-size: 11px;
      background: #dcfce7;
      color: #16a34a;
      padding: 2px 8px;
      border-radius: 4px;
      margin-top: 4px;
      display: inline-block;
    }
    .footer {
      text-align: center;
      margin-top: 32px;
      color: #666;
      font-size: 14px;
    }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>🛡️ 服务等级承诺</h1>
      <p>我们承诺为您提供稳定、可靠、高质量的服务</p>
    </div>

    ${Array.from(categorizedSLAs.entries())
      .map(
        ([category, slas]) => `
      <div class="category">
        <h2>${categoryIcons[category]} ${categoryNames[category]}</h2>
        ${slas
          .map(
            (sla) => `
          <div class="sla-item">
            <div class="sla-info">
              <h3>${sla.name}</h3>
              <p>${sla.description}</p>
              ${sla.compensationPercent ? `<span class="compensation">违约补偿 ${sla.compensationPercent}%</span>` : ''}
            </div>
            <div class="sla-target">
              <div class="value">${sla.target}${sla.unit === 'percent' ? '%' : ''}</div>
              <div class="unit">${sla.unit === 'percent' ? '可用率' : sla.unit === 'minutes' ? '分钟内' : sla.unit === 'hours' ? '小时内' : '工作日'}</div>
            </div>
          </div>
        `
          )
          .join('')}
      </div>
    `
      )
      .join('')}

    <div class="footer">
      <p>以上承诺自服务开通之日起生效</p>
      <p>如有任何问题，请联系 support@thinkus.app</p>
    </div>
  </div>
</body>
</html>
`
  }
}

// ============================================
// 导出单例
// ============================================

export const slaGuarantee = new SLAGuaranteeService()

export default slaGuarantee
