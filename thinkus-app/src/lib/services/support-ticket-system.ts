/**
 * 工单追踪系统
 *
 * 功能：
 * - 用户可以查看自己提交的问题的处理进度
 * - 客服可以更新工单状态
 * - 自动发送进度通知
 * - SLA监控和升级
 *
 * 核心理念：
 * - 用户想知道"我的问题有人在处理吗"
 * - 透明的进度比快速解决更能减少焦虑
 * - 每次更新都主动通知用户
 */

// ============================================
// 类型定义
// ============================================

/** 工单状态 */
export type TicketStatus =
  | 'submitted'        // 已提交
  | 'received'         // 已接收
  | 'in_progress'      // 处理中
  | 'waiting_user'     // 等待用户回复
  | 'escalated'        // 已升级
  | 'resolved'         // 已解决
  | 'closed'           // 已关闭

/** 工单优先级 */
export type TicketPriority =
  | 'low'              // 低
  | 'medium'           // 中
  | 'high'             // 高
  | 'urgent'           // 紧急

/** 工单类别 */
export type TicketCategory =
  | 'bug'              // 功能问题
  | 'feature'          // 功能请求
  | 'question'         // 使用咨询
  | 'account'          // 账号问题
  | 'billing'          // 账单问题
  | 'security'         // 安全问题
  | 'other'            // 其他

/** 工单 */
export interface Ticket {
  ticketId: string
  ticketNumber: string     // 显示用的工单号，如 #T20240116001

  // 基本信息
  userId: string
  userName: string
  userEmail: string
  projectId?: string
  projectName?: string

  // 问题描述
  subject: string          // 标题
  description: string      // 详细描述
  category: TicketCategory
  priority: TicketPriority
  attachments?: string[]   // 附件URL

  // 状态
  status: TicketStatus
  statusText: string       // 人话状态

  // 处理信息
  assignedTo?: {
    agentId: string
    agentName: string
    agentAvatar?: string
  }

  // 时间
  createdAt: Date
  updatedAt: Date
  firstResponseAt?: Date
  resolvedAt?: Date
  closedAt?: Date

  // SLA
  sla: {
    firstResponseDue: Date
    resolutionDue: Date
    isOverdue: boolean
    overdueMinutes?: number
  }

  // 评价
  rating?: {
    score: 1 | 2 | 3 | 4 | 5
    feedback?: string
    ratedAt: Date
  }
}

/** 工单回复 */
export interface TicketReply {
  replyId: string
  ticketId: string

  // 回复人
  authorType: 'user' | 'agent' | 'system'
  authorId: string
  authorName: string
  authorAvatar?: string

  // 内容
  content: string
  attachments?: string[]

  // 时间
  createdAt: Date

  // 是否内部备注（用户不可见）
  isInternal: boolean
}

/** 工单事件 */
export interface TicketEvent {
  eventId: string
  ticketId: string
  type: 'status_change' | 'assignment' | 'priority_change' | 'escalation' | 'sla_breach'
  description: string
  oldValue?: string
  newValue?: string
  createdAt: Date
  createdBy?: string
}

// ============================================
// 状态配置
// ============================================

const STATUS_CONFIG: Record<TicketStatus, {
  text: string
  icon: string
  color: string
  description: string
}> = {
  submitted: {
    text: '已提交',
    icon: '📩',
    color: '#6B7280',
    description: '您的问题已收到，正在分配客服'
  },
  received: {
    text: '已接收',
    icon: '✅',
    color: '#3B82F6',
    description: '客服已接收，即将开始处理'
  },
  in_progress: {
    text: '处理中',
    icon: '🔧',
    color: '#F59E0B',
    description: '客服正在处理您的问题'
  },
  waiting_user: {
    text: '等待回复',
    icon: '💬',
    color: '#8B5CF6',
    description: '我们需要您提供更多信息'
  },
  escalated: {
    text: '已升级',
    icon: '⬆️',
    color: '#EC4899',
    description: '已转交高级技术团队处理'
  },
  resolved: {
    text: '已解决',
    icon: '🎉',
    color: '#10B981',
    description: '您的问题已解决'
  },
  closed: {
    text: '已关闭',
    icon: '📁',
    color: '#9CA3AF',
    description: '工单已关闭'
  }
}

const PRIORITY_CONFIG: Record<TicketPriority, {
  text: string
  icon: string
  color: string
  firstResponseMinutes: number
  resolutionMinutes: number
}> = {
  urgent: {
    text: '紧急',
    icon: '🔴',
    color: '#EF4444',
    firstResponseMinutes: 15,
    resolutionMinutes: 60
  },
  high: {
    text: '高',
    icon: '🟠',
    color: '#F59E0B',
    firstResponseMinutes: 30,
    resolutionMinutes: 240
  },
  medium: {
    text: '中',
    icon: '🟡',
    color: '#3B82F6',
    firstResponseMinutes: 60,
    resolutionMinutes: 480
  },
  low: {
    text: '低',
    icon: '🟢',
    color: '#10B981',
    firstResponseMinutes: 120,
    resolutionMinutes: 1440
  }
}

// ============================================
// 服务实现
// ============================================

export class SupportTicketSystemService {

  /**
   * 创建工单
   */
  async createTicket(params: {
    userId: string
    userName: string
    userEmail: string
    projectId?: string
    projectName?: string
    subject: string
    description: string
    category: TicketCategory
    priority?: TicketPriority
    attachments?: string[]
  }): Promise<Ticket> {
    const {
      userId,
      userName,
      userEmail,
      projectId,
      projectName,
      subject,
      description,
      category,
      priority = 'medium',
      attachments
    } = params

    const ticketId = `ticket_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
    const ticketNumber = `#T${new Date().toISOString().slice(0, 10).replace(/-/g, '')}${Math.random().toString().slice(2, 5)}`

    const priorityConfig = PRIORITY_CONFIG[priority]
    const now = new Date()

    const ticket: Ticket = {
      ticketId,
      ticketNumber,
      userId,
      userName,
      userEmail,
      projectId,
      projectName,
      subject,
      description,
      category,
      priority,
      attachments,
      status: 'submitted',
      statusText: STATUS_CONFIG.submitted.text,
      createdAt: now,
      updatedAt: now,
      sla: {
        firstResponseDue: new Date(now.getTime() + priorityConfig.firstResponseMinutes * 60 * 1000),
        resolutionDue: new Date(now.getTime() + priorityConfig.resolutionMinutes * 60 * 1000),
        isOverdue: false
      }
    }

    // 存储工单
    // await db.tickets.create(ticket)

    // 发送确认邮件
    // await this.sendTicketCreatedEmail(ticket)

    // 自动分配客服
    await this.autoAssign(ticket)

    return ticket
  }

  /**
   * 获取用户的工单列表
   */
  async getUserTickets(params: {
    userId: string
    status?: TicketStatus[]
    limit?: number
  }): Promise<{
    tickets: Ticket[]
    openCount: number
    resolvedCount: number
  }> {
    // 从数据库获取
    // const tickets = await db.tickets.find({ userId: params.userId })

    // 模拟返回
    return {
      tickets: [],
      openCount: 0,
      resolvedCount: 0
    }
  }

  /**
   * 获取工单详情
   */
  async getTicketDetail(ticketId: string): Promise<{
    ticket: Ticket
    replies: TicketReply[]
    events: TicketEvent[]
  }> {
    // 从数据库获取
    return {
      ticket: {} as Ticket,
      replies: [],
      events: []
    }
  }

  /**
   * 添加回复
   */
  async addReply(params: {
    ticketId: string
    authorType: 'user' | 'agent'
    authorId: string
    authorName: string
    content: string
    attachments?: string[]
  }): Promise<{
    reply: TicketReply
    ticket: Ticket
  }> {
    const { ticketId, authorType, authorId, authorName, content, attachments } = params

    const replyId = `reply_${Date.now()}`

    const reply: TicketReply = {
      replyId,
      ticketId,
      authorType,
      authorId,
      authorName,
      content,
      attachments,
      createdAt: new Date(),
      isInternal: false
    }

    // 存储回复
    // await db.ticketReplies.create(reply)

    // 更新工单状态
    const newStatus: TicketStatus = authorType === 'user' ? 'in_progress' : 'waiting_user'

    // 发送通知
    // await this.sendReplyNotification(reply)

    return {
      reply,
      ticket: {} as Ticket
    }
  }

  /**
   * 更新工单状态
   */
  async updateStatus(params: {
    ticketId: string
    newStatus: TicketStatus
    agentId: string
    agentName: string
    note?: string
  }): Promise<Ticket> {
    const { ticketId, newStatus, agentId, agentName, note } = params

    // 更新工单
    // const ticket = await db.tickets.findById(ticketId)
    // ticket.status = newStatus
    // ticket.statusText = STATUS_CONFIG[newStatus].text
    // ticket.updatedAt = new Date()

    // 记录事件
    // await this.recordEvent(...)

    // 发送通知
    // await this.sendStatusChangeNotification(...)

    return {} as Ticket
  }

  /**
   * 解决工单
   */
  async resolveTicket(params: {
    ticketId: string
    agentId: string
    agentName: string
    resolution: string
  }): Promise<Ticket> {
    const { ticketId, agentId, agentName, resolution } = params

    // 添加解决回复
    await this.addReply({
      ticketId,
      authorType: 'agent',
      authorId: agentId,
      authorName: agentName,
      content: `✅ 问题已解决\n\n${resolution}`
    })

    // 更新状态为已解决
    return this.updateStatus({
      ticketId,
      newStatus: 'resolved',
      agentId,
      agentName
    })
  }

  /**
   * 用户评价
   */
  async rateTicket(params: {
    ticketId: string
    score: 1 | 2 | 3 | 4 | 5
    feedback?: string
  }): Promise<void> {
    const { ticketId, score, feedback } = params

    // 更新工单评价
    // await db.tickets.update(ticketId, {
    //   rating: { score, feedback, ratedAt: new Date() }
    // })
  }

  /**
   * 生成工单详情页面HTML
   */
  generateTicketDetailPageHtml(ticket: Ticket, replies: TicketReply[]): string {
    const statusConfig = STATUS_CONFIG[ticket.status]
    const priorityConfig = PRIORITY_CONFIG[ticket.priority]

    return `<!DOCTYPE html>
<html lang="zh-CN">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>工单 ${ticket.ticketNumber} - ${ticket.subject}</title>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
      background: #F9FAFB;
      min-height: 100vh;
    }

    .header {
      background: white;
      padding: 20px;
      border-bottom: 1px solid #E5E7EB;
      position: sticky;
      top: 0;
      z-index: 10;
    }
    .header-content {
      max-width: 800px;
      margin: 0 auto;
    }
    .ticket-number {
      font-size: 14px;
      color: #6B7280;
      margin-bottom: 8px;
    }
    .ticket-subject {
      font-size: 20px;
      font-weight: 600;
      color: #1F2937;
    }

    .container {
      max-width: 800px;
      margin: 0 auto;
      padding: 24px 20px;
    }

    /* 状态卡片 */
    .status-card {
      background: white;
      border-radius: 16px;
      padding: 24px;
      margin-bottom: 24px;
      display: flex;
      align-items: center;
      gap: 16px;
      box-shadow: 0 1px 3px rgba(0,0,0,0.1);
    }
    .status-icon {
      width: 56px;
      height: 56px;
      border-radius: 50%;
      background: ${statusConfig.color}15;
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 24px;
    }
    .status-info { flex: 1; }
    .status-text {
      font-size: 18px;
      font-weight: 600;
      color: ${statusConfig.color};
      margin-bottom: 4px;
    }
    .status-desc {
      font-size: 14px;
      color: #6B7280;
    }
    .priority-badge {
      background: ${priorityConfig.color}15;
      color: ${priorityConfig.color};
      padding: 6px 12px;
      border-radius: 20px;
      font-size: 13px;
      font-weight: 500;
    }

    /* 信息卡片 */
    .info-card {
      background: white;
      border-radius: 16px;
      padding: 24px;
      margin-bottom: 24px;
      box-shadow: 0 1px 3px rgba(0,0,0,0.1);
    }
    .info-title {
      font-size: 16px;
      font-weight: 600;
      color: #374151;
      margin-bottom: 16px;
    }
    .info-row {
      display: flex;
      padding: 12px 0;
      border-bottom: 1px solid #F3F4F6;
    }
    .info-row:last-child { border-bottom: none; }
    .info-label {
      width: 100px;
      font-size: 14px;
      color: #6B7280;
    }
    .info-value {
      flex: 1;
      font-size: 14px;
      color: #1F2937;
    }

    /* 对话区域 */
    .conversation {
      background: white;
      border-radius: 16px;
      padding: 24px;
      margin-bottom: 24px;
      box-shadow: 0 1px 3px rgba(0,0,0,0.1);
    }
    .conversation-title {
      font-size: 16px;
      font-weight: 600;
      color: #374151;
      margin-bottom: 20px;
    }

    .reply {
      display: flex;
      gap: 16px;
      margin-bottom: 24px;
    }
    .reply:last-child { margin-bottom: 0; }
    .reply-avatar {
      width: 40px;
      height: 40px;
      border-radius: 50%;
      background: #E5E7EB;
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 16px;
      flex-shrink: 0;
    }
    .reply-avatar.user { background: #DBEAFE; }
    .reply-avatar.agent { background: #D1FAE5; }
    .reply-content { flex: 1; }
    .reply-header {
      display: flex;
      align-items: center;
      gap: 8px;
      margin-bottom: 8px;
    }
    .reply-author { font-size: 14px; font-weight: 600; color: #1F2937; }
    .reply-time { font-size: 12px; color: #9CA3AF; }
    .reply-body {
      font-size: 14px;
      color: #4B5563;
      line-height: 1.6;
      white-space: pre-wrap;
    }

    /* 回复输入 */
    .reply-form {
      background: white;
      border-radius: 16px;
      padding: 24px;
      box-shadow: 0 1px 3px rgba(0,0,0,0.1);
    }
    .reply-input {
      width: 100%;
      border: 1px solid #E5E7EB;
      border-radius: 12px;
      padding: 16px;
      font-size: 14px;
      resize: none;
      height: 120px;
      margin-bottom: 16px;
    }
    .reply-input:focus {
      outline: none;
      border-color: #3B82F6;
    }
    .reply-actions {
      display: flex;
      justify-content: space-between;
      align-items: center;
    }
    .attach-btn {
      background: none;
      border: 1px solid #E5E7EB;
      border-radius: 8px;
      padding: 10px 16px;
      font-size: 14px;
      cursor: pointer;
      color: #6B7280;
    }
    .submit-btn {
      background: #3B82F6;
      color: white;
      border: none;
      border-radius: 8px;
      padding: 12px 24px;
      font-size: 14px;
      font-weight: 600;
      cursor: pointer;
    }
    .submit-btn:hover { background: #2563EB; }

    /* 已解决状态显示评价 */
    .rating-section {
      background: #F0FDF4;
      border-radius: 12px;
      padding: 20px;
      text-align: center;
    }
    .rating-title {
      font-size: 16px;
      color: #166534;
      margin-bottom: 16px;
    }
    .rating-stars {
      display: flex;
      justify-content: center;
      gap: 8px;
    }
    .rating-star {
      font-size: 32px;
      cursor: pointer;
      transition: transform 0.2s;
    }
    .rating-star:hover { transform: scale(1.2); }
  </style>
</head>
<body>
  <div class="header">
    <div class="header-content">
      <div class="ticket-number">${ticket.ticketNumber}</div>
      <h1 class="ticket-subject">${ticket.subject}</h1>
    </div>
  </div>

  <div class="container">
    <!-- 状态卡片 -->
    <div class="status-card">
      <div class="status-icon">${statusConfig.icon}</div>
      <div class="status-info">
        <div class="status-text">${statusConfig.text}</div>
        <div class="status-desc">${statusConfig.description}</div>
      </div>
      <div class="priority-badge">${priorityConfig.icon} ${priorityConfig.text}优先级</div>
    </div>

    <!-- 基本信息 -->
    <div class="info-card">
      <div class="info-title">工单信息</div>
      <div class="info-row">
        <div class="info-label">创建时间</div>
        <div class="info-value">${ticket.createdAt.toLocaleString('zh-CN')}</div>
      </div>
      <div class="info-row">
        <div class="info-label">处理人</div>
        <div class="info-value">${ticket.assignedTo?.agentName || '待分配'}</div>
      </div>
      ${ticket.projectName ? `
      <div class="info-row">
        <div class="info-label">相关项目</div>
        <div class="info-value">${ticket.projectName}</div>
      </div>
      ` : ''}
    </div>

    <!-- 对话记录 -->
    <div class="conversation">
      <div class="conversation-title">对话记录</div>

      <!-- 原始问题 -->
      <div class="reply">
        <div class="reply-avatar user">👤</div>
        <div class="reply-content">
          <div class="reply-header">
            <span class="reply-author">${ticket.userName}</span>
            <span class="reply-time">${ticket.createdAt.toLocaleString('zh-CN')}</span>
          </div>
          <div class="reply-body">${ticket.description}</div>
        </div>
      </div>

      ${replies.map(reply => `
      <div class="reply">
        <div class="reply-avatar ${reply.authorType}">${reply.authorType === 'user' ? '👤' : '👨‍💼'}</div>
        <div class="reply-content">
          <div class="reply-header">
            <span class="reply-author">${reply.authorName}</span>
            <span class="reply-time">${reply.createdAt.toLocaleString('zh-CN')}</span>
          </div>
          <div class="reply-body">${reply.content}</div>
        </div>
      </div>
      `).join('')}
    </div>

    ${ticket.status === 'resolved' && !ticket.rating ? `
    <!-- 评价 -->
    <div class="rating-section">
      <div class="rating-title">您对本次服务满意吗？</div>
      <div class="rating-stars">
        <span class="rating-star" onclick="rate(1)">⭐</span>
        <span class="rating-star" onclick="rate(2)">⭐</span>
        <span class="rating-star" onclick="rate(3)">⭐</span>
        <span class="rating-star" onclick="rate(4)">⭐</span>
        <span class="rating-star" onclick="rate(5)">⭐</span>
      </div>
    </div>
    ` : `
    <!-- 回复表单 -->
    <div class="reply-form">
      <textarea class="reply-input" placeholder="输入您的回复..."></textarea>
      <div class="reply-actions">
        <button class="attach-btn">📎 添加附件</button>
        <button class="submit-btn">发送回复</button>
      </div>
    </div>
    `}
  </div>

  <script>
    function rate(score) {
      fetch('/api/tickets/${ticket.ticketId}/rate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ score })
      }).then(() => {
        alert('感谢您的评价！');
        location.reload();
      });
    }
  </script>
</body>
</html>`
  }

  // ============================================
  // 私有方法
  // ============================================

  private async autoAssign(ticket: Ticket): Promise<void> {
    // 根据类别和优先级自动分配客服
    // 这里应该实现负载均衡算法
  }

  private async sendTicketCreatedEmail(ticket: Ticket): Promise<void> {
    // 发送工单创建确认邮件
  }

  private async sendReplyNotification(reply: TicketReply): Promise<void> {
    // 发送新回复通知
  }

  private async sendStatusChangeNotification(ticket: Ticket): Promise<void> {
    // 发送状态变更通知
  }

  private async recordEvent(event: TicketEvent): Promise<void> {
    // 记录工单事件
  }
}

// ============================================
// 导出单例
// ============================================

export const supportTicketSystem = new SupportTicketSystemService()
