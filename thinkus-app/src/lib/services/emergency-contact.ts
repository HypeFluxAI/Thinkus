/**
 * 紧急联系通道服务
 *
 * 为小白用户提供简单直接的紧急求助通道
 * - 一键呼叫人工客服
 * - 问题自动升级
 * - 多渠道联系
 */

// ============================================================================
// 类型定义
// ============================================================================

/** 紧急程度 */
export type UrgencyLevel = 'normal' | 'urgent' | 'critical'

/** 联系渠道 */
export type ContactChannel = 'phone' | 'wechat' | 'email' | 'ticket' | 'callback'

/** 问题类型 */
export type IssueCategory =
  | 'site_down'           // 网站宕机
  | 'data_loss'           // 数据丢失
  | 'security_breach'     // 安全问题
  | 'payment_issue'       // 支付问题
  | 'login_blocked'       // 无法登录
  | 'feature_broken'      // 功能故障
  | 'slow_performance'    // 性能问题
  | 'other'               // 其他

/** 紧急联系请求 */
export interface EmergencyRequest {
  id: string
  projectId: string
  userId: string
  userName: string
  userEmail: string
  userPhone?: string
  category: IssueCategory
  urgency: UrgencyLevel
  description: string
  preferredChannel: ContactChannel
  status: 'pending' | 'assigned' | 'in_progress' | 'resolved' | 'escalated'
  createdAt: Date
  assignedTo?: string
  assignedAt?: Date
  resolvedAt?: Date
  resolution?: string
  responseTimeMinutes?: number
  timeline: TimelineEvent[]
}

/** 时间线事件 */
export interface TimelineEvent {
  id: string
  type: 'created' | 'assigned' | 'response' | 'escalated' | 'resolved' | 'note'
  message: string
  createdAt: Date
  by?: string
}

/** 客服人员 */
export interface SupportAgent {
  id: string
  name: string
  avatar?: string
  role: 'support' | 'senior_support' | 'manager' | 'engineer'
  skills: IssueCategory[]
  status: 'available' | 'busy' | 'offline'
  currentLoad: number
  maxLoad: number
  responseTimeAvg: number
}

/** 工作时间配置 */
export interface WorkingHours {
  timezone: string
  weekdays: {
    start: string  // HH:mm
    end: string
  }
  weekends: {
    start: string
    end: string
  } | null  // null 表示不工作
  holidays: string[]  // YYYY-MM-DD 格式
}

/** SLA 配置 */
export interface SLAConfig {
  urgency: UrgencyLevel
  firstResponseMinutes: number
  resolutionHours: number
  escalationMinutes: number
}

// ============================================================================
// 配置
// ============================================================================

/** 问题类型配置 */
const ISSUE_CATEGORY_CONFIG: Record<IssueCategory, {
  label: string
  icon: string
  defaultUrgency: UrgencyLevel
  recommendedChannels: ContactChannel[]
}> = {
  site_down: {
    label: '网站无法访问',
    icon: '🔴',
    defaultUrgency: 'critical',
    recommendedChannels: ['phone', 'callback']
  },
  data_loss: {
    label: '数据丢失',
    icon: '⚠️',
    defaultUrgency: 'critical',
    recommendedChannels: ['phone', 'callback']
  },
  security_breach: {
    label: '安全问题',
    icon: '🔐',
    defaultUrgency: 'critical',
    recommendedChannels: ['phone', 'callback']
  },
  payment_issue: {
    label: '支付问题',
    icon: '💳',
    defaultUrgency: 'urgent',
    recommendedChannels: ['phone', 'wechat']
  },
  login_blocked: {
    label: '无法登录',
    icon: '🚫',
    defaultUrgency: 'urgent',
    recommendedChannels: ['phone', 'wechat']
  },
  feature_broken: {
    label: '功能故障',
    icon: '🔧',
    defaultUrgency: 'normal',
    recommendedChannels: ['ticket', 'wechat']
  },
  slow_performance: {
    label: '速度很慢',
    icon: '🐢',
    defaultUrgency: 'normal',
    recommendedChannels: ['ticket', 'email']
  },
  other: {
    label: '其他问题',
    icon: '❓',
    defaultUrgency: 'normal',
    recommendedChannels: ['ticket', 'email']
  }
}

/** SLA 配置 */
const SLA_CONFIG: SLAConfig[] = [
  { urgency: 'critical', firstResponseMinutes: 5, resolutionHours: 2, escalationMinutes: 10 },
  { urgency: 'urgent', firstResponseMinutes: 15, resolutionHours: 8, escalationMinutes: 30 },
  { urgency: 'normal', firstResponseMinutes: 60, resolutionHours: 24, escalationMinutes: 120 }
]

/** 默认工作时间 */
const DEFAULT_WORKING_HOURS: WorkingHours = {
  timezone: 'Asia/Shanghai',
  weekdays: { start: '09:00', end: '21:00' },
  weekends: { start: '10:00', end: '18:00' },
  holidays: []
}

/** 紧急联系信息 */
const EMERGENCY_CONTACTS = {
  hotline: '400-123-4567',
  wechat: 'thinkus_support',
  email: 'support@thinkus.app',
  emergencyEmail: 'emergency@thinkus.app'
}

// ============================================================================
// 辅助函数
// ============================================================================

function generateId(): string {
  return `emergency-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`
}

function isWithinWorkingHours(workingHours: WorkingHours): boolean {
  const now = new Date()
  const day = now.getDay()
  const time = `${now.getHours().toString().padStart(2, '0')}:${now.getMinutes().toString().padStart(2, '0')}`

  // 检查是否是节假日
  const dateStr = now.toISOString().split('T')[0]
  if (workingHours.holidays.includes(dateStr)) {
    return false
  }

  // 检查周末
  if (day === 0 || day === 6) {
    if (!workingHours.weekends) return false
    return time >= workingHours.weekends.start && time <= workingHours.weekends.end
  }

  // 检查工作日
  return time >= workingHours.weekdays.start && time <= workingHours.weekdays.end
}

// ============================================================================
// 紧急联系服务
// ============================================================================

export class EmergencyContactService {
  // 存储请求
  private requests: Map<string, EmergencyRequest> = new Map()
  // 存储客服
  private agents: Map<string, SupportAgent> = new Map()
  // 工作时间配置
  private workingHours: WorkingHours = DEFAULT_WORKING_HOURS

  constructor() {
    // 初始化模拟客服数据
    this.initializeSampleAgents()
  }

  private initializeSampleAgents(): void {
    const sampleAgents: SupportAgent[] = [
      {
        id: 'agent-1',
        name: '小云',
        role: 'support',
        skills: ['feature_broken', 'slow_performance', 'other'],
        status: 'available',
        currentLoad: 2,
        maxLoad: 5,
        responseTimeAvg: 8
      },
      {
        id: 'agent-2',
        name: '小明',
        role: 'senior_support',
        skills: ['site_down', 'login_blocked', 'payment_issue', 'feature_broken'],
        status: 'available',
        currentLoad: 3,
        maxLoad: 4,
        responseTimeAvg: 5
      },
      {
        id: 'agent-3',
        name: '张工',
        role: 'engineer',
        skills: ['site_down', 'data_loss', 'security_breach'],
        status: 'available',
        currentLoad: 1,
        maxLoad: 3,
        responseTimeAvg: 3
      }
    ]

    for (const agent of sampleAgents) {
      this.agents.set(agent.id, agent)
    }
  }

  /**
   * 创建紧急联系请求
   */
  createRequest(input: {
    projectId: string
    userId: string
    userName: string
    userEmail: string
    userPhone?: string
    category: IssueCategory
    description: string
    preferredChannel?: ContactChannel
  }): EmergencyRequest {
    const categoryConfig = ISSUE_CATEGORY_CONFIG[input.category]

    const request: EmergencyRequest = {
      id: generateId(),
      projectId: input.projectId,
      userId: input.userId,
      userName: input.userName,
      userEmail: input.userEmail,
      userPhone: input.userPhone,
      category: input.category,
      urgency: categoryConfig.defaultUrgency,
      description: input.description,
      preferredChannel: input.preferredChannel || categoryConfig.recommendedChannels[0],
      status: 'pending',
      createdAt: new Date(),
      timeline: [{
        id: generateId(),
        type: 'created',
        message: '紧急请求已创建',
        createdAt: new Date()
      }]
    }

    this.requests.set(request.id, request)

    // 自动分配客服
    this.autoAssign(request)

    return request
  }

  /**
   * 自动分配客服
   */
  private autoAssign(request: EmergencyRequest): void {
    // 找到合适的客服
    const availableAgents = Array.from(this.agents.values())
      .filter(agent =>
        agent.status === 'available' &&
        agent.currentLoad < agent.maxLoad &&
        agent.skills.includes(request.category)
      )
      .sort((a, b) => {
        // 优先分配给更高级别的客服处理紧急问题
        if (request.urgency === 'critical') {
          const roleOrder = { engineer: 0, manager: 1, senior_support: 2, support: 3 }
          return roleOrder[a.role] - roleOrder[b.role]
        }
        // 否则按负载排序
        return a.currentLoad - b.currentLoad
      })

    if (availableAgents.length > 0) {
      const agent = availableAgents[0]
      request.assignedTo = agent.id
      request.assignedAt = new Date()
      request.status = 'assigned'
      agent.currentLoad++

      request.timeline.push({
        id: generateId(),
        type: 'assigned',
        message: `已分配给客服 ${agent.name}`,
        createdAt: new Date(),
        by: 'system'
      })

      console.log(`[紧急联系] 请求 ${request.id} 已分配给 ${agent.name}`)
    } else {
      // 没有可用客服，标记为待升级
      request.timeline.push({
        id: generateId(),
        type: 'note',
        message: '当前无可用客服，已加入等待队列',
        createdAt: new Date(),
        by: 'system'
      })
    }
  }

  /**
   * 升级请求
   */
  escalate(requestId: string, reason: string): EmergencyRequest | null {
    const request = this.requests.get(requestId)
    if (!request) return null

    // 提升紧急程度
    if (request.urgency === 'normal') {
      request.urgency = 'urgent'
    } else if (request.urgency === 'urgent') {
      request.urgency = 'critical'
    }

    request.status = 'escalated'

    request.timeline.push({
      id: generateId(),
      type: 'escalated',
      message: `请求已升级: ${reason}`,
      createdAt: new Date(),
      by: 'system'
    })

    // 重新分配给更高级别客服
    this.autoAssign(request)

    return request
  }

  /**
   * 添加回复
   */
  addResponse(requestId: string, message: string, by: string): EmergencyRequest | null {
    const request = this.requests.get(requestId)
    if (!request) return null

    // 首次回复，记录响应时间
    if (!request.responseTimeMinutes) {
      request.responseTimeMinutes = Math.round(
        (Date.now() - request.createdAt.getTime()) / 1000 / 60
      )
    }

    request.status = 'in_progress'

    request.timeline.push({
      id: generateId(),
      type: 'response',
      message,
      createdAt: new Date(),
      by
    })

    return request
  }

  /**
   * 解决请求
   */
  resolve(requestId: string, resolution: string, by: string): EmergencyRequest | null {
    const request = this.requests.get(requestId)
    if (!request) return null

    request.status = 'resolved'
    request.resolvedAt = new Date()
    request.resolution = resolution

    request.timeline.push({
      id: generateId(),
      type: 'resolved',
      message: `问题已解决: ${resolution}`,
      createdAt: new Date(),
      by
    })

    // 释放客服负载
    if (request.assignedTo) {
      const agent = this.agents.get(request.assignedTo)
      if (agent) {
        agent.currentLoad = Math.max(0, agent.currentLoad - 1)
      }
    }

    return request
  }

  /**
   * 获取请求
   */
  getRequest(requestId: string): EmergencyRequest | null {
    return this.requests.get(requestId) || null
  }

  /**
   * 获取用户的请求列表
   */
  getUserRequests(userId: string): EmergencyRequest[] {
    return Array.from(this.requests.values())
      .filter(r => r.userId === userId)
      .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime())
  }

  /**
   * 检查是否在工作时间
   */
  isWorkingHours(): boolean {
    return isWithinWorkingHours(this.workingHours)
  }

  /**
   * 获取预计等待时间
   */
  getEstimatedWaitTime(urgency: UrgencyLevel): number {
    const sla = SLA_CONFIG.find(s => s.urgency === urgency)
    if (!sla) return 60

    // 计算当前队列中同等优先级的请求数
    const pendingCount = Array.from(this.requests.values())
      .filter(r =>
        r.status === 'pending' &&
        r.urgency === urgency
      ).length

    // 基于 SLA 和队列长度估算
    return Math.min(
      sla.firstResponseMinutes * (pendingCount + 1),
      sla.firstResponseMinutes * 3
    )
  }

  /**
   * 获取联系方式
   */
  getContactInfo(): {
    hotline: string
    wechat: string
    email: string
    emergencyEmail: string
    isWorkingHours: boolean
    nextAvailableTime?: string
  } {
    const isWorking = this.isWorkingHours()

    return {
      ...EMERGENCY_CONTACTS,
      isWorkingHours: isWorking,
      nextAvailableTime: isWorking ? undefined : this.workingHours.weekdays.start
    }
  }

  /**
   * 获取问题类型配置
   */
  getCategoryConfig() {
    return ISSUE_CATEGORY_CONFIG
  }

  /**
   * 获取 SLA 配置
   */
  getSLAConfig() {
    return SLA_CONFIG
  }

  /**
   * 生成紧急联系页面 HTML
   */
  generateEmergencyPageHtml(projectId: string): string {
    const contacts = this.getContactInfo()

    return `
<!DOCTYPE html>
<html lang="zh-CN">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>紧急联系 - Thinkus</title>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body { font-family: -apple-system, BlinkMacSystemFont, sans-serif; background: #f5f5f5; min-height: 100vh; display: flex; align-items: center; justify-content: center; }
    .container { max-width: 500px; width: 100%; padding: 20px; }
    .card { background: white; border-radius: 16px; overflow: hidden; box-shadow: 0 4px 20px rgba(0,0,0,0.1); }
    .header { background: linear-gradient(135deg, #ef4444, #dc2626); color: white; padding: 30px; text-align: center; }
    .header h1 { font-size: 24px; margin-bottom: 10px; }
    .content { padding: 30px; }
    .contact-item { display: flex; align-items: center; gap: 15px; padding: 20px; background: #f9f9f9; border-radius: 12px; margin-bottom: 15px; cursor: pointer; transition: transform 0.2s; }
    .contact-item:hover { transform: scale(1.02); }
    .contact-item .icon { font-size: 32px; }
    .contact-item .info { flex: 1; }
    .contact-item .info h3 { font-size: 16px; margin-bottom: 4px; }
    .contact-item .info p { font-size: 14px; color: #666; }
    .contact-item .value { font-size: 18px; font-weight: bold; color: #ef4444; }
    .status { text-align: center; padding: 15px; background: ${contacts.isWorkingHours ? '#dcfce7' : '#fef3c7'}; color: ${contacts.isWorkingHours ? '#166534' : '#92400e'}; border-radius: 8px; margin-bottom: 20px; }
    .footer { text-align: center; padding: 20px; color: #999; font-size: 12px; }
  </style>
</head>
<body>
  <div class="container">
    <div class="card">
      <div class="header">
        <h1>🆘 紧急联系</h1>
        <p>遇到问题？我们立即帮您解决</p>
      </div>
      <div class="content">
        <div class="status">
          ${contacts.isWorkingHours
            ? '✅ 客服在线中，随时为您服务'
            : `⏰ 非工作时间，紧急问题请拨打热线`}
        </div>

        <a href="tel:${contacts.hotline}" class="contact-item">
          <span class="icon">📞</span>
          <div class="info">
            <h3>客服热线</h3>
            <p>7x24小时紧急响应</p>
          </div>
          <span class="value">${contacts.hotline}</span>
        </a>

        <div class="contact-item" onclick="alert('请添加微信号: ${contacts.wechat}')">
          <span class="icon">💬</span>
          <div class="info">
            <h3>微信客服</h3>
            <p>扫码或搜索添加</p>
          </div>
          <span class="value">${contacts.wechat}</span>
        </div>

        <a href="mailto:${contacts.emergencyEmail}" class="contact-item">
          <span class="icon">📧</span>
          <div class="info">
            <h3>紧急邮件</h3>
            <p>重大问题请发邮件</p>
          </div>
          <span class="value">发送邮件</span>
        </a>
      </div>
      <div class="footer">
        <p>紧急问题响应时间：5分钟内</p>
        <p>普通问题响应时间：1小时内</p>
      </div>
    </div>
  </div>
</body>
</html>
    `.trim()
  }
}

// 导出单例
export const emergencyContact = new EmergencyContactService()
