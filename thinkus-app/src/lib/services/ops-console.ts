/**
 * 运营控制台服务
 *
 * 功能：
 * - 内部运营人员统一操作界面
 * - 项目交付状态总览
 * - 快捷操作（一键部署、重试、回滚）
 * - 异常处理SOP指引
 * - 运营指标看板
 */

// 操作类型
export type OperationType =
  | 'deploy'           // 部署
  | 'rollback'         // 回滚
  | 'retry'            // 重试
  | 'pause'            // 暂停
  | 'resume'           // 恢复
  | 'cancel'           // 取消
  | 'escalate'         // 升级
  | 'contact_client'   // 联系客户
  | 'manual_fix'       // 手动修复
  | 'approve'          // 审批
  | 'reject'           // 拒绝

// 操作记录
export interface OperationLog {
  id: string
  projectId: string
  operatorId: string
  operatorName: string
  operation: OperationType
  details: string
  timestamp: Date
  result: 'success' | 'failed' | 'pending'
  errorMessage?: string
}

// 运营人员
export interface Operator {
  id: string
  name: string
  email: string
  role: 'admin' | 'operator' | 'viewer'
  permissions: OperationType[]
  activeProjects: string[]
  completedToday: number
  onlineStatus: 'online' | 'away' | 'offline'
  lastActiveAt: Date
}

// 异常类型
export type AnomalyType =
  | 'deploy_stuck'      // 部署卡住
  | 'test_failing'      // 测试失败
  | 'gate_blocked'      // 门禁阻塞
  | 'client_unresponsive' // 客户无响应
  | 'sla_breach'        // SLA违约
  | 'resource_issue'    // 资源问题
  | 'unknown_error'     // 未知错误

// 异常记录
export interface Anomaly {
  id: string
  projectId: string
  projectName: string
  clientName: string
  type: AnomalyType
  severity: 'low' | 'medium' | 'high' | 'critical'
  description: string
  detectedAt: Date
  resolvedAt?: Date
  assignedTo?: string
  sopSteps: SOPStep[]
  status: 'new' | 'investigating' | 'resolving' | 'resolved' | 'escalated'
}

// SOP步骤
export interface SOPStep {
  order: number
  title: string
  description: string
  action?: string  // 可执行的操作
  completed: boolean
  result?: string
}

// 运营指标
export interface OpsMetrics {
  // 今日概览
  today: {
    projectsDelivered: number
    projectsFailed: number
    averageDeliveryTime: number
    clientSatisfaction: number
  }

  // 本周概览
  week: {
    projectsDelivered: number
    projectsFailed: number
    slaCompliance: number
    averageDeliveryTime: number
  }

  // 团队状态
  team: {
    totalOperators: number
    onlineOperators: number
    averageLoad: number
    topPerformer: string
  }

  // 异常统计
  anomalies: {
    total: number
    byType: Record<AnomalyType, number>
    averageResolutionTime: number
  }
}

// 快捷操作
export interface QuickAction {
  id: string
  label: string
  icon: string
  operation: OperationType
  requiresConfirm: boolean
  availableFor: string[]  // 项目状态
  dangerLevel: 'safe' | 'moderate' | 'dangerous'
}

// SOP 模板
const SOP_TEMPLATES: Record<AnomalyType, SOPStep[]> = {
  deploy_stuck: [
    { order: 1, title: '检查部署日志', description: '查看 Vercel/Railway 控制台的部署日志', completed: false },
    { order: 2, title: '检查构建错误', description: '是否有编译错误或依赖问题', completed: false },
    { order: 3, title: '检查资源限制', description: '是否超出内存或存储限制', completed: false },
    { order: 4, title: '尝试重新部署', description: '点击重试按钮重新触发部署', action: 'retry', completed: false },
    { order: 5, title: '手动部署', description: '如果自动部署失败，尝试手动部署', action: 'manual_fix', completed: false },
    { order: 6, title: '升级处理', description: '如果仍然失败，升级给技术负责人', action: 'escalate', completed: false },
  ],
  test_failing: [
    { order: 1, title: '查看测试报告', description: '找出具体哪些测试用例失败', completed: false },
    { order: 2, title: '分析失败原因', description: '是代码问题还是环境问题', completed: false },
    { order: 3, title: '检查环境配置', description: '测试环境变量是否正确', completed: false },
    { order: 4, title: '重新运行测试', description: '尝试重新执行测试', action: 'retry', completed: false },
    { order: 5, title: '联系开发修复', description: '如果是代码问题，需要修复后重试', action: 'escalate', completed: false },
  ],
  gate_blocked: [
    { order: 1, title: '查看门禁报告', description: '查看具体哪些检查项未通过', completed: false },
    { order: 2, title: '区分阻塞类型', description: '是 blocker 还是 warning', completed: false },
    { order: 3, title: '评估风险', description: '是否可以临时跳过某些检查', completed: false },
    { order: 4, title: '修复问题', description: '根据检查结果修复问题', action: 'manual_fix', completed: false },
    { order: 5, title: '重新检查', description: '修复后重新运行门禁检查', action: 'retry', completed: false },
  ],
  client_unresponsive: [
    { order: 1, title: '检查联系记录', description: '确认之前的联系尝试', completed: false },
    { order: 2, title: '尝试电话联系', description: '直接打电话给客户', action: 'contact_client', completed: false },
    { order: 3, title: '发送提醒邮件', description: '发送验收提醒邮件', action: 'contact_client', completed: false },
    { order: 4, title: '等待响应', description: '等待 24 小时客户响应', completed: false },
    { order: 5, title: '升级处理', description: '如果仍无响应，升级给客户经理', action: 'escalate', completed: false },
  ],
  sla_breach: [
    { order: 1, title: '确认违约情况', description: '确认具体违反了哪条 SLA', completed: false },
    { order: 2, title: '计算补偿', description: '根据 SLA 条款计算补偿金额', completed: false },
    { order: 3, title: '通知客户', description: '主动告知客户并道歉', action: 'contact_client', completed: false },
    { order: 4, title: '执行补偿', description: '执行补偿措施（折扣/延期等）', completed: false },
    { order: 5, title: '复盘记录', description: '记录原因和改进措施', completed: false },
  ],
  resource_issue: [
    { order: 1, title: '检查资源使用', description: '查看 CPU/内存/存储使用情况', completed: false },
    { order: 2, title: '清理资源', description: '清理不需要的旧部署和缓存', completed: false },
    { order: 3, title: '升级配额', description: '如需要，升级云平台配额', completed: false },
    { order: 4, title: '重试操作', description: '资源充足后重试', action: 'retry', completed: false },
  ],
  unknown_error: [
    { order: 1, title: '收集错误信息', description: '记录完整的错误堆栈和上下文', completed: false },
    { order: 2, title: '查询知识库', description: '搜索是否有类似问题的解决方案', completed: false },
    { order: 3, title: '尝试通用修复', description: '重启服务、清理缓存等', action: 'retry', completed: false },
    { order: 4, title: '升级技术支持', description: '提交给技术团队分析', action: 'escalate', completed: false },
  ],
}

// 快捷操作配置
const QUICK_ACTIONS: QuickAction[] = [
  {
    id: 'deploy',
    label: '立即部署',
    icon: '🚀',
    operation: 'deploy',
    requiresConfirm: false,
    availableFor: ['code_ready', 'gate_passed'],
    dangerLevel: 'safe',
  },
  {
    id: 'retry',
    label: '重试',
    icon: '🔄',
    operation: 'retry',
    requiresConfirm: false,
    availableFor: ['failed', 'gate_blocked'],
    dangerLevel: 'safe',
  },
  {
    id: 'rollback',
    label: '回滚',
    icon: '⏪',
    operation: 'rollback',
    requiresConfirm: true,
    availableFor: ['deployed', 'running', 'error'],
    dangerLevel: 'moderate',
  },
  {
    id: 'pause',
    label: '暂停',
    icon: '⏸️',
    operation: 'pause',
    requiresConfirm: false,
    availableFor: ['running', 'deploying'],
    dangerLevel: 'safe',
  },
  {
    id: 'resume',
    label: '恢复',
    icon: '▶️',
    operation: 'resume',
    requiresConfirm: false,
    availableFor: ['paused'],
    dangerLevel: 'safe',
  },
  {
    id: 'cancel',
    label: '取消',
    icon: '❌',
    operation: 'cancel',
    requiresConfirm: true,
    availableFor: ['queued', 'running', 'paused'],
    dangerLevel: 'dangerous',
  },
  {
    id: 'escalate',
    label: '升级',
    icon: '📢',
    operation: 'escalate',
    requiresConfirm: true,
    availableFor: ['failed', 'error', 'stuck'],
    dangerLevel: 'safe',
  },
  {
    id: 'contact',
    label: '联系客户',
    icon: '📞',
    operation: 'contact_client',
    requiresConfirm: false,
    availableFor: ['*'],
    dangerLevel: 'safe',
  },
]

// 异常严重程度描述
const SEVERITY_CONFIG = {
  low: { label: '低', color: '#6b7280', priority: 4 },
  medium: { label: '中', color: '#f59e0b', priority: 3 },
  high: { label: '高', color: '#ef4444', priority: 2 },
  critical: { label: '紧急', color: '#dc2626', priority: 1 },
}

export class OpsConsoleService {
  private operators: Map<string, Operator> = new Map()
  private operationLogs: OperationLog[] = []
  private anomalies: Map<string, Anomaly> = new Map()

  /**
   * 注册运营人员
   */
  registerOperator(input: {
    id: string
    name: string
    email: string
    role: Operator['role']
  }): Operator {
    const permissions = this.getPermissionsByRole(input.role)

    const operator: Operator = {
      id: input.id,
      name: input.name,
      email: input.email,
      role: input.role,
      permissions,
      activeProjects: [],
      completedToday: 0,
      onlineStatus: 'online',
      lastActiveAt: new Date(),
    }

    this.operators.set(input.id, operator)
    return operator
  }

  /**
   * 根据角色获取权限
   */
  private getPermissionsByRole(role: Operator['role']): OperationType[] {
    switch (role) {
      case 'admin':
        return ['deploy', 'rollback', 'retry', 'pause', 'resume', 'cancel', 'escalate', 'contact_client', 'manual_fix', 'approve', 'reject']
      case 'operator':
        return ['deploy', 'retry', 'pause', 'resume', 'escalate', 'contact_client']
      case 'viewer':
        return []
    }
  }

  /**
   * 检查权限
   */
  hasPermission(operatorId: string, operation: OperationType): boolean {
    const operator = this.operators.get(operatorId)
    if (!operator) return false
    return operator.permissions.includes(operation)
  }

  /**
   * 记录操作
   */
  logOperation(input: {
    projectId: string
    operatorId: string
    operation: OperationType
    details: string
    result: 'success' | 'failed' | 'pending'
    errorMessage?: string
  }): OperationLog {
    const operator = this.operators.get(input.operatorId)

    const log: OperationLog = {
      id: `op_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      projectId: input.projectId,
      operatorId: input.operatorId,
      operatorName: operator?.name || 'Unknown',
      operation: input.operation,
      details: input.details,
      timestamp: new Date(),
      result: input.result,
      errorMessage: input.errorMessage,
    }

    this.operationLogs.push(log)

    // 更新运营人员统计
    if (operator && input.result === 'success' && input.operation === 'deploy') {
      operator.completedToday++
      operator.lastActiveAt = new Date()
      this.operators.set(input.operatorId, operator)
    }

    return log
  }

  /**
   * 获取操作日志
   */
  getOperationLogs(filter?: {
    projectId?: string
    operatorId?: string
    operation?: OperationType
    startDate?: Date
    endDate?: Date
  }): OperationLog[] {
    let logs = this.operationLogs

    if (filter?.projectId) {
      logs = logs.filter(l => l.projectId === filter.projectId)
    }
    if (filter?.operatorId) {
      logs = logs.filter(l => l.operatorId === filter.operatorId)
    }
    if (filter?.operation) {
      logs = logs.filter(l => l.operation === filter.operation)
    }
    if (filter?.startDate) {
      logs = logs.filter(l => l.timestamp >= filter.startDate!)
    }
    if (filter?.endDate) {
      logs = logs.filter(l => l.timestamp <= filter.endDate!)
    }

    return logs.sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime())
  }

  /**
   * 创建异常
   */
  createAnomaly(input: {
    projectId: string
    projectName: string
    clientName: string
    type: AnomalyType
    severity: Anomaly['severity']
    description: string
  }): Anomaly {
    const anomaly: Anomaly = {
      id: `anomaly_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      projectId: input.projectId,
      projectName: input.projectName,
      clientName: input.clientName,
      type: input.type,
      severity: input.severity,
      description: input.description,
      detectedAt: new Date(),
      sopSteps: JSON.parse(JSON.stringify(SOP_TEMPLATES[input.type] || SOP_TEMPLATES.unknown_error)),
      status: 'new',
    }

    this.anomalies.set(anomaly.id, anomaly)
    return anomaly
  }

  /**
   * 分配异常
   */
  assignAnomaly(anomalyId: string, operatorId: string): boolean {
    const anomaly = this.anomalies.get(anomalyId)
    const operator = this.operators.get(operatorId)

    if (!anomaly || !operator) return false

    anomaly.assignedTo = operatorId
    anomaly.status = 'investigating'
    this.anomalies.set(anomalyId, anomaly)

    // 更新运营人员活跃项目
    if (!operator.activeProjects.includes(anomaly.projectId)) {
      operator.activeProjects.push(anomaly.projectId)
      this.operators.set(operatorId, operator)
    }

    return true
  }

  /**
   * 更新 SOP 步骤
   */
  updateSOPStep(anomalyId: string, stepOrder: number, completed: boolean, result?: string): boolean {
    const anomaly = this.anomalies.get(anomalyId)
    if (!anomaly) return false

    const step = anomaly.sopSteps.find(s => s.order === stepOrder)
    if (!step) return false

    step.completed = completed
    step.result = result

    // 检查是否所有步骤完成
    if (anomaly.sopSteps.every(s => s.completed)) {
      anomaly.status = 'resolved'
      anomaly.resolvedAt = new Date()
    } else {
      anomaly.status = 'resolving'
    }

    this.anomalies.set(anomalyId, anomaly)
    return true
  }

  /**
   * 升级异常
   */
  escalateAnomaly(anomalyId: string, reason: string): boolean {
    const anomaly = this.anomalies.get(anomalyId)
    if (!anomaly) return false

    anomaly.status = 'escalated'
    anomaly.description += `\n[升级] ${reason}`
    this.anomalies.set(anomalyId, anomaly)

    return true
  }

  /**
   * 获取异常列表
   */
  getAnomalies(filter?: {
    status?: Anomaly['status'][]
    severity?: Anomaly['severity'][]
    assignedTo?: string
    type?: AnomalyType[]
  }): Anomaly[] {
    let anomalies = Array.from(this.anomalies.values())

    if (filter?.status) {
      anomalies = anomalies.filter(a => filter.status!.includes(a.status))
    }
    if (filter?.severity) {
      anomalies = anomalies.filter(a => filter.severity!.includes(a.severity))
    }
    if (filter?.assignedTo) {
      anomalies = anomalies.filter(a => a.assignedTo === filter.assignedTo)
    }
    if (filter?.type) {
      anomalies = anomalies.filter(a => filter.type!.includes(a.type))
    }

    // 按严重程度和时间排序
    return anomalies.sort((a, b) => {
      const severityDiff = SEVERITY_CONFIG[a.severity].priority - SEVERITY_CONFIG[b.severity].priority
      if (severityDiff !== 0) return severityDiff
      return b.detectedAt.getTime() - a.detectedAt.getTime()
    })
  }

  /**
   * 获取可用的快捷操作
   */
  getQuickActions(projectStatus: string, operatorId: string): QuickAction[] {
    const operator = this.operators.get(operatorId)
    if (!operator) return []

    return QUICK_ACTIONS.filter(action => {
      // 检查权限
      if (!operator.permissions.includes(action.operation)) return false

      // 检查状态
      if (!action.availableFor.includes('*') && !action.availableFor.includes(projectStatus)) {
        return false
      }

      return true
    })
  }

  /**
   * 获取运营指标
   */
  getMetrics(): OpsMetrics {
    const now = new Date()
    const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate())
    const weekStart = new Date(todayStart)
    weekStart.setDate(weekStart.getDate() - 7)

    // 今日日志
    const todayLogs = this.operationLogs.filter(l => l.timestamp >= todayStart)
    const todayDeployed = todayLogs.filter(l => l.operation === 'deploy' && l.result === 'success').length
    const todayFailed = todayLogs.filter(l => l.operation === 'deploy' && l.result === 'failed').length

    // 本周日志
    const weekLogs = this.operationLogs.filter(l => l.timestamp >= weekStart)
    const weekDeployed = weekLogs.filter(l => l.operation === 'deploy' && l.result === 'success').length
    const weekFailed = weekLogs.filter(l => l.operation === 'deploy' && l.result === 'failed').length

    // 运营人员统计
    const operators = Array.from(this.operators.values())
    const onlineOperators = operators.filter(o => o.onlineStatus === 'online')
    const totalCompleted = operators.reduce((sum, o) => sum + o.completedToday, 0)
    const topPerformer = operators.sort((a, b) => b.completedToday - a.completedToday)[0]

    // 异常统计
    const anomalies = Array.from(this.anomalies.values())
    const unresolvedAnomalies = anomalies.filter(a => a.status !== 'resolved')
    const resolvedAnomalies = anomalies.filter(a => a.status === 'resolved' && a.resolvedAt)

    const byType: Record<AnomalyType, number> = {
      deploy_stuck: 0,
      test_failing: 0,
      gate_blocked: 0,
      client_unresponsive: 0,
      sla_breach: 0,
      resource_issue: 0,
      unknown_error: 0,
    }
    for (const a of unresolvedAnomalies) {
      byType[a.type]++
    }

    const avgResolutionTime = resolvedAnomalies.length > 0
      ? resolvedAnomalies.reduce((sum, a) => {
          return sum + (a.resolvedAt!.getTime() - a.detectedAt.getTime()) / 60000
        }, 0) / resolvedAnomalies.length
      : 0

    return {
      today: {
        projectsDelivered: todayDeployed,
        projectsFailed: todayFailed,
        averageDeliveryTime: 35, // TODO: 从实际数据计算
        clientSatisfaction: 92, // TODO: 从满意度服务获取
      },
      week: {
        projectsDelivered: weekDeployed,
        projectsFailed: weekFailed,
        slaCompliance: 98, // TODO: 从 SLA 服务获取
        averageDeliveryTime: 32,
      },
      team: {
        totalOperators: operators.length,
        onlineOperators: onlineOperators.length,
        averageLoad: operators.length > 0 ? totalCompleted / operators.length : 0,
        topPerformer: topPerformer?.name || 'N/A',
      },
      anomalies: {
        total: unresolvedAnomalies.length,
        byType,
        averageResolutionTime: Math.round(avgResolutionTime),
      },
    }
  }

  /**
   * 生成运营控制台 HTML
   */
  generateConsoleHtml(operatorId: string): string {
    const operator = this.operators.get(operatorId)
    const metrics = this.getMetrics()
    const anomalies = this.getAnomalies({ status: ['new', 'investigating', 'resolving'] }).slice(0, 5)
    const recentLogs = this.getOperationLogs({}).slice(0, 10)

    return `
<!DOCTYPE html>
<html lang="zh-CN">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <meta http-equiv="refresh" content="30">
  <title>运营控制台 - Thinkus</title>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
      background: #0f172a;
      min-height: 100vh;
      color: #e2e8f0;
    }

    .header {
      background: linear-gradient(135deg, #1e293b 0%, #0f172a 100%);
      padding: 20px 30px;
      border-bottom: 1px solid #334155;
      display: flex;
      justify-content: space-between;
      align-items: center;
    }
    .header h1 { font-size: 20px; }
    .operator-info {
      display: flex;
      align-items: center;
      gap: 10px;
    }
    .status-dot {
      width: 8px;
      height: 8px;
      border-radius: 50%;
      background: #22c55e;
    }

    .main {
      display: grid;
      grid-template-columns: 1fr 350px;
      gap: 20px;
      padding: 20px;
    }

    .metrics-grid {
      display: grid;
      grid-template-columns: repeat(4, 1fr);
      gap: 15px;
      margin-bottom: 20px;
    }
    .metric-card {
      background: #1e293b;
      padding: 20px;
      border-radius: 12px;
      border: 1px solid #334155;
    }
    .metric-value {
      font-size: 28px;
      font-weight: bold;
      color: #fff;
    }
    .metric-label {
      font-size: 12px;
      color: #94a3b8;
      margin-top: 5px;
    }
    .metric-change {
      font-size: 11px;
      margin-top: 5px;
    }
    .metric-change.up { color: #22c55e; }
    .metric-change.down { color: #ef4444; }

    .section {
      background: #1e293b;
      border-radius: 12px;
      border: 1px solid #334155;
      margin-bottom: 20px;
    }
    .section-header {
      padding: 15px 20px;
      border-bottom: 1px solid #334155;
      display: flex;
      justify-content: space-between;
      align-items: center;
    }
    .section-title {
      font-size: 14px;
      font-weight: 600;
    }
    .section-body {
      padding: 15px 20px;
    }

    .anomaly-item {
      padding: 12px 0;
      border-bottom: 1px solid #334155;
      display: flex;
      gap: 12px;
      align-items: flex-start;
    }
    .anomaly-item:last-child { border-bottom: none; }
    .anomaly-severity {
      width: 8px;
      height: 8px;
      border-radius: 50%;
      margin-top: 6px;
    }
    .anomaly-info { flex: 1; }
    .anomaly-title { font-size: 13px; font-weight: 500; }
    .anomaly-desc { font-size: 12px; color: #94a3b8; margin-top: 4px; }
    .anomaly-meta { font-size: 11px; color: #64748b; margin-top: 4px; }

    .log-item {
      padding: 10px 0;
      border-bottom: 1px solid #334155;
      display: flex;
      justify-content: space-between;
      align-items: center;
    }
    .log-item:last-child { border-bottom: none; }
    .log-info { }
    .log-operation { font-size: 12px; font-weight: 500; }
    .log-details { font-size: 11px; color: #94a3b8; }
    .log-time { font-size: 11px; color: #64748b; }

    .quick-actions {
      display: grid;
      grid-template-columns: repeat(2, 1fr);
      gap: 10px;
    }
    .quick-action {
      background: #334155;
      padding: 12px;
      border-radius: 8px;
      text-align: center;
      cursor: pointer;
      transition: all 0.2s;
      border: none;
      color: #e2e8f0;
    }
    .quick-action:hover {
      background: #475569;
    }
    .quick-action.dangerous {
      background: rgba(239, 68, 68, 0.2);
      border: 1px solid rgba(239, 68, 68, 0.3);
    }
    .quick-action .icon { font-size: 20px; }
    .quick-action .label { font-size: 12px; margin-top: 5px; }

    .sidebar {
      display: flex;
      flex-direction: column;
      gap: 20px;
    }

    .team-member {
      display: flex;
      align-items: center;
      gap: 10px;
      padding: 8px 0;
    }
    .team-avatar {
      width: 32px;
      height: 32px;
      border-radius: 50%;
      background: #334155;
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 14px;
    }
    .team-name { font-size: 13px; }
    .team-stats { font-size: 11px; color: #94a3b8; }
  </style>
</head>
<body>
  <div class="header">
    <h1>🎛️ 运营控制台</h1>
    <div class="operator-info">
      <div class="status-dot"></div>
      <span>${operator?.name || 'Unknown'}</span>
      <span style="color: #94a3b8; font-size: 12px;">(${operator?.role || 'viewer'})</span>
    </div>
  </div>

  <div class="main">
    <div class="content">
      <div class="metrics-grid">
        <div class="metric-card">
          <div class="metric-value">${metrics.today.projectsDelivered}</div>
          <div class="metric-label">今日交付</div>
          <div class="metric-change up">↑ 较昨日</div>
        </div>
        <div class="metric-card">
          <div class="metric-value" style="color: ${metrics.today.projectsFailed > 0 ? '#ef4444' : '#fff'}">${metrics.today.projectsFailed}</div>
          <div class="metric-label">今日失败</div>
        </div>
        <div class="metric-card">
          <div class="metric-value">${metrics.week.slaCompliance}%</div>
          <div class="metric-label">SLA 达标率</div>
        </div>
        <div class="metric-card">
          <div class="metric-value">${metrics.today.averageDeliveryTime}</div>
          <div class="metric-label">平均耗时(分钟)</div>
        </div>
      </div>

      <div class="section">
        <div class="section-header">
          <div class="section-title">⚠️ 待处理异常 (${metrics.anomalies.total})</div>
        </div>
        <div class="section-body">
          ${anomalies.length > 0 ? anomalies.map(a => `
            <div class="anomaly-item">
              <div class="anomaly-severity" style="background: ${SEVERITY_CONFIG[a.severity].color}"></div>
              <div class="anomaly-info">
                <div class="anomaly-title">${a.projectName}</div>
                <div class="anomaly-desc">${a.description}</div>
                <div class="anomaly-meta">
                  ${a.assignedTo ? `处理人: ${this.operators.get(a.assignedTo)?.name}` : '未分配'} |
                  ${Math.round((new Date().getTime() - a.detectedAt.getTime()) / 60000)} 分钟前
                </div>
              </div>
            </div>
          `).join('') : '<div style="text-align: center; padding: 20px; color: #64748b;">暂无异常 ✅</div>'}
        </div>
      </div>

      <div class="section">
        <div class="section-header">
          <div class="section-title">📋 最近操作</div>
        </div>
        <div class="section-body">
          ${recentLogs.map(l => `
            <div class="log-item">
              <div class="log-info">
                <div class="log-operation">${l.operatorName} - ${l.operation}</div>
                <div class="log-details">${l.details}</div>
              </div>
              <div class="log-time">${l.timestamp.toLocaleTimeString()}</div>
            </div>
          `).join('') || '<div style="text-align: center; padding: 20px; color: #64748b;">暂无操作记录</div>'}
        </div>
      </div>
    </div>

    <div class="sidebar">
      <div class="section">
        <div class="section-header">
          <div class="section-title">⚡ 快捷操作</div>
        </div>
        <div class="section-body">
          <div class="quick-actions">
            ${QUICK_ACTIONS.slice(0, 6).map(a => `
              <button class="quick-action ${a.dangerLevel === 'dangerous' ? 'dangerous' : ''}">
                <div class="icon">${a.icon}</div>
                <div class="label">${a.label}</div>
              </button>
            `).join('')}
          </div>
        </div>
      </div>

      <div class="section">
        <div class="section-header">
          <div class="section-title">👥 团队状态</div>
        </div>
        <div class="section-body">
          <div style="margin-bottom: 15px;">
            <span style="color: #22c55e;">● ${metrics.team.onlineOperators} 在线</span>
            <span style="margin-left: 10px; color: #64748b;">共 ${metrics.team.totalOperators} 人</span>
          </div>
          ${Array.from(this.operators.values()).slice(0, 5).map(o => `
            <div class="team-member">
              <div class="team-avatar">${o.name.charAt(0)}</div>
              <div>
                <div class="team-name">${o.name}</div>
                <div class="team-stats">今日完成 ${o.completedToday} 个</div>
              </div>
            </div>
          `).join('')}
        </div>
      </div>
    </div>
  </div>
</body>
</html>
`
  }

  /**
   * 生成 SOP 指引 HTML
   */
  generateSOPGuideHtml(anomalyId: string): string {
    const anomaly = this.anomalies.get(anomalyId)
    if (!anomaly) return '<html><body>异常不存在</body></html>'

    return `
<!DOCTYPE html>
<html lang="zh-CN">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>异常处理指引 - ${anomaly.projectName}</title>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
      background: #f8fafc;
      min-height: 100vh;
      padding: 30px;
    }
    .container { max-width: 600px; margin: 0 auto; }

    .header {
      background: #fff;
      padding: 20px;
      border-radius: 12px;
      box-shadow: 0 1px 3px rgba(0,0,0,0.1);
      margin-bottom: 20px;
    }
    .header h1 { font-size: 18px; margin-bottom: 10px; }
    .project-info { color: #64748b; font-size: 14px; }
    .severity-badge {
      display: inline-block;
      padding: 4px 8px;
      border-radius: 4px;
      font-size: 12px;
      font-weight: 500;
      background: ${SEVERITY_CONFIG[anomaly.severity].color};
      color: #fff;
      margin-top: 10px;
    }

    .steps {
      background: #fff;
      border-radius: 12px;
      box-shadow: 0 1px 3px rgba(0,0,0,0.1);
      overflow: hidden;
    }
    .step {
      padding: 20px;
      border-bottom: 1px solid #e2e8f0;
      display: flex;
      gap: 15px;
    }
    .step:last-child { border-bottom: none; }
    .step.completed { background: #f0fdf4; }

    .step-number {
      width: 28px;
      height: 28px;
      border-radius: 50%;
      background: #e2e8f0;
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 14px;
      font-weight: 500;
      flex-shrink: 0;
    }
    .step.completed .step-number {
      background: #22c55e;
      color: #fff;
    }

    .step-content { flex: 1; }
    .step-title { font-weight: 500; margin-bottom: 5px; }
    .step-desc { font-size: 14px; color: #64748b; }
    .step-action {
      margin-top: 10px;
    }
    .step-action button {
      background: #3b82f6;
      color: #fff;
      border: none;
      padding: 8px 16px;
      border-radius: 6px;
      font-size: 13px;
      cursor: pointer;
    }
    .step-action button:hover { background: #2563eb; }

    .step-result {
      margin-top: 10px;
      padding: 10px;
      background: #f1f5f9;
      border-radius: 6px;
      font-size: 13px;
      color: #475569;
    }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>⚠️ 异常处理指引</h1>
      <div class="project-info">
        <strong>${anomaly.projectName}</strong> - ${anomaly.clientName}
      </div>
      <div class="project-info" style="margin-top: 5px;">
        ${anomaly.description}
      </div>
      <div class="severity-badge">${SEVERITY_CONFIG[anomaly.severity].label}优先级</div>
    </div>

    <div class="steps">
      ${anomaly.sopSteps.map(step => `
        <div class="step ${step.completed ? 'completed' : ''}">
          <div class="step-number">${step.completed ? '✓' : step.order}</div>
          <div class="step-content">
            <div class="step-title">${step.title}</div>
            <div class="step-desc">${step.description}</div>
            ${step.action ? `
              <div class="step-action">
                <button>${step.action === 'retry' ? '🔄 重试' : step.action === 'escalate' ? '📢 升级' : step.action === 'contact_client' ? '📞 联系客户' : '执行'}</button>
              </div>
            ` : ''}
            ${step.result ? `<div class="step-result">${step.result}</div>` : ''}
          </div>
        </div>
      `).join('')}
    </div>
  </div>
</body>
</html>
`
  }
}

// 单例导出
export const opsConsole = new OpsConsoleService()
