/**
 * 内部交付看板服务
 *
 * 运营团队用的多项目交付管理工具
 * - 批量交付管理
 * - 进度追踪
 * - SLA监控
 * - 团队协作
 */

// ============================================================================
// 类型定义
// ============================================================================

/** 交付阶段 */
export type DeliveryPhase =
  | 'pending'          // 待开始
  | 'developing'       // 开发中
  | 'testing'          // 测试中
  | 'deploying'        // 部署中
  | 'configuring'      // 配置中
  | 'onboarding'       // 用户培训
  | 'delivered'        // 已交付
  | 'monitoring'       // 监控中
  | 'completed'        // 已完成

/** 优先级 */
export type Priority = 'urgent' | 'high' | 'normal' | 'low'

/** SLA状态 */
export type SLAStatus = 'on_track' | 'at_risk' | 'breached'

/** 交付项目 */
export interface DeliveryProject {
  id: string
  projectId: string
  projectName: string
  clientName: string
  clientEmail: string
  clientPhone?: string

  // 交付信息
  phase: DeliveryPhase
  priority: Priority
  progress: number  // 0-100

  // 时间安排
  createdAt: Date
  startedAt?: Date
  estimatedDeliveryAt: Date
  actualDeliveryAt?: Date
  completedAt?: Date

  // SLA
  slaHours: number
  slaStatus: SLAStatus
  slaRemainingHours: number

  // 负责人
  assignedTo: string
  assignedTeam?: string

  // 状态
  blockers: string[]
  notes: string[]
  tags: string[]

  // 产品信息
  productType: string
  productUrl?: string
  adminUrl?: string

  // 统计
  totalTasks: number
  completedTasks: number
}

/** 交付任务 */
export interface DeliveryTask {
  id: string
  deliveryId: string
  name: string
  description: string
  phase: DeliveryPhase
  status: 'pending' | 'in_progress' | 'completed' | 'blocked' | 'skipped'
  assignedTo?: string
  dueAt?: Date
  completedAt?: Date
  blockedReason?: string
  order: number
}

/** 团队成员 */
export interface TeamMember {
  id: string
  name: string
  email: string
  role: 'lead' | 'developer' | 'tester' | 'support'
  avatar?: string
  activeDeliveries: number
  completedDeliveries: number
  avgDeliveryTime: number  // 小时
}

/** 看板视图 */
export interface KanbanView {
  columns: KanbanColumn[]
  totalProjects: number
  urgentCount: number
  atRiskCount: number
}

/** 看板列 */
export interface KanbanColumn {
  phase: DeliveryPhase
  label: string
  icon: string
  projects: DeliveryProject[]
  count: number
}

/** 统计数据 */
export interface DashboardStats {
  // 总览
  totalDeliveries: number
  activeDeliveries: number
  completedDeliveries: number
  avgDeliveryTime: number  // 小时

  // 本周
  thisWeekDeliveries: number
  thisWeekCompleted: number

  // SLA
  slaOnTrack: number
  slaAtRisk: number
  slaBreached: number
  slaComplianceRate: number

  // 按阶段
  byPhase: { phase: DeliveryPhase; count: number }[]

  // 按优先级
  byPriority: { priority: Priority; count: number }[]

  // 团队
  teamPerformance: {
    memberId: string
    memberName: string
    activeCount: number
    completedCount: number
    avgTime: number
  }[]
}

/** 时间线事件 */
export interface TimelineEvent {
  id: string
  deliveryId: string
  type: 'phase_change' | 'task_completed' | 'blocker_added' | 'blocker_resolved' | 'note_added' | 'sla_warning' | 'delivered'
  title: string
  description: string
  timestamp: Date
  userId: string
  userName: string
  metadata?: Record<string, unknown>
}

/** 筛选条件 */
export interface DeliveryFilter {
  phases?: DeliveryPhase[]
  priorities?: Priority[]
  slaStatus?: SLAStatus[]
  assignedTo?: string
  tags?: string[]
  search?: string
  dateRange?: {
    start: Date
    end: Date
  }
}

// ============================================================================
// 配置
// ============================================================================

/** 阶段配置 */
const PHASE_CONFIG: Record<DeliveryPhase, {
  label: string
  icon: string
  color: string
  order: number
  defaultTasks: string[]
}> = {
  pending: {
    label: '待开始',
    icon: '📋',
    color: 'bg-gray-100 text-gray-700',
    order: 0,
    defaultTasks: ['确认需求', '分配负责人', '制定计划']
  },
  developing: {
    label: '开发中',
    icon: '💻',
    color: 'bg-blue-100 text-blue-700',
    order: 1,
    defaultTasks: ['环境搭建', '功能开发', '代码审查']
  },
  testing: {
    label: '测试中',
    icon: '🧪',
    color: 'bg-purple-100 text-purple-700',
    order: 2,
    defaultTasks: ['单元测试', '集成测试', '验收测试']
  },
  deploying: {
    label: '部署中',
    icon: '🚀',
    color: 'bg-orange-100 text-orange-700',
    order: 3,
    defaultTasks: ['环境配置', '部署上线', '验证部署']
  },
  configuring: {
    label: '配置中',
    icon: '⚙️',
    color: 'bg-yellow-100 text-yellow-700',
    order: 4,
    defaultTasks: ['域名配置', '备份设置', '监控配置']
  },
  onboarding: {
    label: '培训中',
    icon: '📚',
    color: 'bg-indigo-100 text-indigo-700',
    order: 5,
    defaultTasks: ['账号创建', '使用培训', '文档交付']
  },
  delivered: {
    label: '已交付',
    icon: '📦',
    color: 'bg-green-100 text-green-700',
    order: 6,
    defaultTasks: ['交付确认', '客户验收']
  },
  monitoring: {
    label: '监控中',
    icon: '👁️',
    color: 'bg-teal-100 text-teal-700',
    order: 7,
    defaultTasks: ['首周监控', '问题跟进', '满意度收集']
  },
  completed: {
    label: '已完成',
    icon: '✅',
    color: 'bg-emerald-100 text-emerald-700',
    order: 8,
    defaultTasks: []
  }
}

/** 优先级配置 */
const PRIORITY_CONFIG: Record<Priority, {
  label: string
  icon: string
  color: string
  slaMultiplier: number
}> = {
  urgent: { label: '紧急', icon: '🔴', color: 'bg-red-100 text-red-700', slaMultiplier: 0.5 },
  high: { label: '高', icon: '🟠', color: 'bg-orange-100 text-orange-700', slaMultiplier: 0.75 },
  normal: { label: '普通', icon: '🟡', color: 'bg-yellow-100 text-yellow-700', slaMultiplier: 1 },
  low: { label: '低', icon: '🟢', color: 'bg-green-100 text-green-700', slaMultiplier: 1.5 }
}

/** 默认SLA (小时) */
const DEFAULT_SLA_HOURS = 72  // 3天

// ============================================================================
// 辅助函数
// ============================================================================

function generateId(): string {
  return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`
}

function calculateSLAStatus(delivery: DeliveryProject): { status: SLAStatus; remainingHours: number } {
  if (delivery.phase === 'completed' || delivery.phase === 'monitoring') {
    return { status: 'on_track', remainingHours: 0 }
  }

  const now = new Date()
  const deadline = new Date(delivery.estimatedDeliveryAt)
  const remainingMs = deadline.getTime() - now.getTime()
  const remainingHours = remainingMs / (1000 * 60 * 60)

  if (remainingHours < 0) {
    return { status: 'breached', remainingHours }
  } else if (remainingHours < delivery.slaHours * 0.25) {
    return { status: 'at_risk', remainingHours }
  } else {
    return { status: 'on_track', remainingHours }
  }
}

// ============================================================================
// 交付看板服务
// ============================================================================

export class DeliveryDashboardService {
  // 模拟存储
  private deliveries: DeliveryProject[] = []
  private tasks: DeliveryTask[] = []
  private members: TeamMember[] = []
  private timeline: TimelineEvent[] = []

  /**
   * 创建交付项目
   */
  createDelivery(input: {
    projectId: string
    projectName: string
    clientName: string
    clientEmail: string
    clientPhone?: string
    productType: string
    priority?: Priority
    assignedTo: string
    estimatedDeliveryAt?: Date
    tags?: string[]
  }): DeliveryProject {
    const priority = input.priority || 'normal'
    const slaHours = DEFAULT_SLA_HOURS * PRIORITY_CONFIG[priority].slaMultiplier

    const delivery: DeliveryProject = {
      id: generateId(),
      projectId: input.projectId,
      projectName: input.projectName,
      clientName: input.clientName,
      clientEmail: input.clientEmail,
      clientPhone: input.clientPhone,
      phase: 'pending',
      priority,
      progress: 0,
      createdAt: new Date(),
      estimatedDeliveryAt: input.estimatedDeliveryAt || new Date(Date.now() + slaHours * 60 * 60 * 1000),
      slaHours,
      slaStatus: 'on_track',
      slaRemainingHours: slaHours,
      assignedTo: input.assignedTo,
      blockers: [],
      notes: [],
      tags: input.tags || [],
      productType: input.productType,
      totalTasks: 0,
      completedTasks: 0
    }

    this.deliveries.push(delivery)

    // 创建默认任务
    this.createDefaultTasks(delivery.id)

    // 记录时间线
    this.addTimelineEvent(delivery.id, 'phase_change', '交付项目创建', `项目 ${input.projectName} 进入待开始阶段`, input.assignedTo, input.assignedTo)

    return delivery
  }

  /**
   * 创建默认任务
   */
  private createDefaultTasks(deliveryId: string): void {
    const phases = Object.keys(PHASE_CONFIG) as DeliveryPhase[]
    let order = 0

    for (const phase of phases) {
      const config = PHASE_CONFIG[phase]
      for (const taskName of config.defaultTasks) {
        const task: DeliveryTask = {
          id: generateId(),
          deliveryId,
          name: taskName,
          description: '',
          phase,
          status: 'pending',
          order: order++
        }
        this.tasks.push(task)
      }
    }

    // 更新任务计数
    const delivery = this.deliveries.find(d => d.id === deliveryId)
    if (delivery) {
      delivery.totalTasks = this.tasks.filter(t => t.deliveryId === deliveryId).length
    }
  }

  /**
   * 更新交付阶段
   */
  updatePhase(deliveryId: string, phase: DeliveryPhase, userId: string, userName: string): DeliveryProject | null {
    const delivery = this.deliveries.find(d => d.id === deliveryId)
    if (!delivery) return null

    const oldPhase = delivery.phase
    delivery.phase = phase

    // 更新时间
    if (phase === 'developing' && !delivery.startedAt) {
      delivery.startedAt = new Date()
    } else if (phase === 'delivered' && !delivery.actualDeliveryAt) {
      delivery.actualDeliveryAt = new Date()
    } else if (phase === 'completed' && !delivery.completedAt) {
      delivery.completedAt = new Date()
    }

    // 更新进度
    delivery.progress = (PHASE_CONFIG[phase].order / (Object.keys(PHASE_CONFIG).length - 1)) * 100

    // 记录时间线
    this.addTimelineEvent(
      deliveryId,
      'phase_change',
      `阶段变更: ${PHASE_CONFIG[oldPhase].label} → ${PHASE_CONFIG[phase].label}`,
      `项目进入${PHASE_CONFIG[phase].label}阶段`,
      userId,
      userName
    )

    // 更新SLA状态
    const slaInfo = calculateSLAStatus(delivery)
    delivery.slaStatus = slaInfo.status
    delivery.slaRemainingHours = slaInfo.remainingHours

    return delivery
  }

  /**
   * 完成任务
   */
  completeTask(taskId: string, userId: string, userName: string): DeliveryTask | null {
    const task = this.tasks.find(t => t.id === taskId)
    if (!task) return null

    task.status = 'completed'
    task.completedAt = new Date()

    // 更新交付完成任务数
    const delivery = this.deliveries.find(d => d.id === task.deliveryId)
    if (delivery) {
      delivery.completedTasks = this.tasks.filter(
        t => t.deliveryId === task.deliveryId && t.status === 'completed'
      ).length
      delivery.progress = (delivery.completedTasks / delivery.totalTasks) * 100
    }

    // 记录时间线
    this.addTimelineEvent(
      task.deliveryId,
      'task_completed',
      `任务完成: ${task.name}`,
      `${userName} 完成了任务`,
      userId,
      userName
    )

    return task
  }

  /**
   * 添加阻塞项
   */
  addBlocker(deliveryId: string, blocker: string, userId: string, userName: string): void {
    const delivery = this.deliveries.find(d => d.id === deliveryId)
    if (!delivery) return

    delivery.blockers.push(blocker)

    this.addTimelineEvent(
      deliveryId,
      'blocker_added',
      '新增阻塞项',
      blocker,
      userId,
      userName
    )
  }

  /**
   * 解决阻塞项
   */
  resolveBlocker(deliveryId: string, blockerIndex: number, userId: string, userName: string): void {
    const delivery = this.deliveries.find(d => d.id === deliveryId)
    if (!delivery || blockerIndex >= delivery.blockers.length) return

    const blocker = delivery.blockers[blockerIndex]
    delivery.blockers.splice(blockerIndex, 1)

    this.addTimelineEvent(
      deliveryId,
      'blocker_resolved',
      '阻塞项已解决',
      blocker,
      userId,
      userName
    )
  }

  /**
   * 添加备注
   */
  addNote(deliveryId: string, note: string, userId: string, userName: string): void {
    const delivery = this.deliveries.find(d => d.id === deliveryId)
    if (!delivery) return

    delivery.notes.push(`[${new Date().toLocaleString()}] ${userName}: ${note}`)

    this.addTimelineEvent(
      deliveryId,
      'note_added',
      '添加备注',
      note,
      userId,
      userName
    )
  }

  /**
   * 添加时间线事件
   */
  private addTimelineEvent(
    deliveryId: string,
    type: TimelineEvent['type'],
    title: string,
    description: string,
    userId: string,
    userName: string,
    metadata?: Record<string, unknown>
  ): void {
    this.timeline.push({
      id: generateId(),
      deliveryId,
      type,
      title,
      description,
      timestamp: new Date(),
      userId,
      userName,
      metadata
    })
  }

  /**
   * 获取看板视图
   */
  getKanbanView(filter?: DeliveryFilter): KanbanView {
    let filteredDeliveries = [...this.deliveries]

    // 应用筛选
    if (filter) {
      if (filter.phases?.length) {
        filteredDeliveries = filteredDeliveries.filter(d => filter.phases!.includes(d.phase))
      }
      if (filter.priorities?.length) {
        filteredDeliveries = filteredDeliveries.filter(d => filter.priorities!.includes(d.priority))
      }
      if (filter.slaStatus?.length) {
        filteredDeliveries = filteredDeliveries.filter(d => filter.slaStatus!.includes(d.slaStatus))
      }
      if (filter.assignedTo) {
        filteredDeliveries = filteredDeliveries.filter(d => d.assignedTo === filter.assignedTo)
      }
      if (filter.tags?.length) {
        filteredDeliveries = filteredDeliveries.filter(d =>
          filter.tags!.some(tag => d.tags.includes(tag))
        )
      }
      if (filter.search) {
        const search = filter.search.toLowerCase()
        filteredDeliveries = filteredDeliveries.filter(d =>
          d.projectName.toLowerCase().includes(search) ||
          d.clientName.toLowerCase().includes(search)
        )
      }
    }

    // 更新SLA状态
    for (const delivery of filteredDeliveries) {
      const slaInfo = calculateSLAStatus(delivery)
      delivery.slaStatus = slaInfo.status
      delivery.slaRemainingHours = slaInfo.remainingHours
    }

    // 构建看板列
    const columns: KanbanColumn[] = []
    const phases = Object.keys(PHASE_CONFIG) as DeliveryPhase[]

    for (const phase of phases) {
      const config = PHASE_CONFIG[phase]
      const projects = filteredDeliveries
        .filter(d => d.phase === phase)
        .sort((a, b) => {
          // 优先级排序
          const priorityOrder = { urgent: 0, high: 1, normal: 2, low: 3 }
          return priorityOrder[a.priority] - priorityOrder[b.priority]
        })

      columns.push({
        phase,
        label: config.label,
        icon: config.icon,
        projects,
        count: projects.length
      })
    }

    return {
      columns,
      totalProjects: filteredDeliveries.length,
      urgentCount: filteredDeliveries.filter(d => d.priority === 'urgent').length,
      atRiskCount: filteredDeliveries.filter(d => d.slaStatus === 'at_risk' || d.slaStatus === 'breached').length
    }
  }

  /**
   * 获取统计数据
   */
  getStats(): DashboardStats {
    const now = new Date()
    const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000)

    // 更新SLA状态
    for (const delivery of this.deliveries) {
      const slaInfo = calculateSLAStatus(delivery)
      delivery.slaStatus = slaInfo.status
      delivery.slaRemainingHours = slaInfo.remainingHours
    }

    const activeDeliveries = this.deliveries.filter(d =>
      d.phase !== 'completed' && d.phase !== 'monitoring'
    )
    const completedDeliveries = this.deliveries.filter(d => d.phase === 'completed')

    // 计算平均交付时间
    let totalDeliveryTime = 0
    let deliveryCount = 0
    for (const d of completedDeliveries) {
      if (d.startedAt && d.actualDeliveryAt) {
        totalDeliveryTime += d.actualDeliveryAt.getTime() - d.startedAt.getTime()
        deliveryCount++
      }
    }
    const avgDeliveryTime = deliveryCount > 0 ? totalDeliveryTime / deliveryCount / (1000 * 60 * 60) : 0

    // 本周统计
    const thisWeekDeliveries = this.deliveries.filter(d => d.createdAt >= weekAgo)
    const thisWeekCompleted = completedDeliveries.filter(d => d.completedAt && d.completedAt >= weekAgo)

    // SLA统计
    const slaOnTrack = this.deliveries.filter(d => d.slaStatus === 'on_track').length
    const slaAtRisk = this.deliveries.filter(d => d.slaStatus === 'at_risk').length
    const slaBreached = this.deliveries.filter(d => d.slaStatus === 'breached').length

    // 按阶段统计
    const byPhase = (Object.keys(PHASE_CONFIG) as DeliveryPhase[]).map(phase => ({
      phase,
      count: this.deliveries.filter(d => d.phase === phase).length
    }))

    // 按优先级统计
    const byPriority = (['urgent', 'high', 'normal', 'low'] as Priority[]).map(priority => ({
      priority,
      count: this.deliveries.filter(d => d.priority === priority).length
    }))

    // 团队表现
    const teamPerformance = this.members.map(member => {
      const memberDeliveries = this.deliveries.filter(d => d.assignedTo === member.id)
      const completed = memberDeliveries.filter(d => d.phase === 'completed')

      let totalTime = 0
      let count = 0
      for (const d of completed) {
        if (d.startedAt && d.actualDeliveryAt) {
          totalTime += d.actualDeliveryAt.getTime() - d.startedAt.getTime()
          count++
        }
      }

      return {
        memberId: member.id,
        memberName: member.name,
        activeCount: memberDeliveries.filter(d => d.phase !== 'completed' && d.phase !== 'monitoring').length,
        completedCount: completed.length,
        avgTime: count > 0 ? totalTime / count / (1000 * 60 * 60) : 0
      }
    })

    return {
      totalDeliveries: this.deliveries.length,
      activeDeliveries: activeDeliveries.length,
      completedDeliveries: completedDeliveries.length,
      avgDeliveryTime,
      thisWeekDeliveries: thisWeekDeliveries.length,
      thisWeekCompleted: thisWeekCompleted.length,
      slaOnTrack,
      slaAtRisk,
      slaBreached,
      slaComplianceRate: this.deliveries.length > 0
        ? (slaOnTrack / this.deliveries.length) * 100
        : 100,
      byPhase,
      byPriority,
      teamPerformance
    }
  }

  /**
   * 获取交付详情
   */
  getDelivery(deliveryId: string): DeliveryProject | null {
    const delivery = this.deliveries.find(d => d.id === deliveryId)
    if (delivery) {
      const slaInfo = calculateSLAStatus(delivery)
      delivery.slaStatus = slaInfo.status
      delivery.slaRemainingHours = slaInfo.remainingHours
    }
    return delivery || null
  }

  /**
   * 获取交付任务
   */
  getDeliveryTasks(deliveryId: string): DeliveryTask[] {
    return this.tasks
      .filter(t => t.deliveryId === deliveryId)
      .sort((a, b) => a.order - b.order)
  }

  /**
   * 获取时间线
   */
  getTimeline(deliveryId: string): TimelineEvent[] {
    return this.timeline
      .filter(e => e.deliveryId === deliveryId)
      .sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime())
  }

  /**
   * 添加团队成员
   */
  addTeamMember(member: Omit<TeamMember, 'activeDeliveries' | 'completedDeliveries' | 'avgDeliveryTime'>): TeamMember {
    const newMember: TeamMember = {
      ...member,
      activeDeliveries: 0,
      completedDeliveries: 0,
      avgDeliveryTime: 0
    }
    this.members.push(newMember)
    return newMember
  }

  /**
   * 获取团队成员列表
   */
  getTeamMembers(): TeamMember[] {
    // 更新成员统计
    for (const member of this.members) {
      const memberDeliveries = this.deliveries.filter(d => d.assignedTo === member.id)
      member.activeDeliveries = memberDeliveries.filter(d =>
        d.phase !== 'completed' && d.phase !== 'monitoring'
      ).length
      member.completedDeliveries = memberDeliveries.filter(d => d.phase === 'completed').length
    }
    return this.members
  }

  /**
   * 批量更新优先级
   */
  batchUpdatePriority(deliveryIds: string[], priority: Priority): void {
    for (const id of deliveryIds) {
      const delivery = this.deliveries.find(d => d.id === id)
      if (delivery) {
        delivery.priority = priority
        delivery.slaHours = DEFAULT_SLA_HOURS * PRIORITY_CONFIG[priority].slaMultiplier
      }
    }
  }

  /**
   * 批量分配负责人
   */
  batchAssign(deliveryIds: string[], assignedTo: string): void {
    for (const id of deliveryIds) {
      const delivery = this.deliveries.find(d => d.id === id)
      if (delivery) {
        delivery.assignedTo = assignedTo
      }
    }
  }

  /** 获取阶段配置 */
  getPhaseConfig() {
    return PHASE_CONFIG
  }

  /** 获取优先级配置 */
  getPriorityConfig() {
    return PRIORITY_CONFIG
  }
}

// 导出单例
export const deliveryDashboard = new DeliveryDashboardService()
