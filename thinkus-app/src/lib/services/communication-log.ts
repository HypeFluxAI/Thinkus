/**
 * 客户沟通日志服务
 *
 * 功能：
 * - 完整的客户沟通记录
 * - 多渠道沟通追踪 (电话/邮件/微信/会议)
 * - 沟通时间线
 * - 关键决策记录
 * - 内部备注
 */

// 沟通渠道
export type CommunicationChannel =
  | 'phone'      // 电话
  | 'email'      // 邮件
  | 'wechat'     // 微信
  | 'meeting'    // 会议
  | 'video_call' // 视频通话
  | 'ticket'     // 工单
  | 'chat'       // 在线聊天
  | 'sms'        // 短信

// 沟通类型
export type CommunicationType =
  | 'requirement'   // 需求沟通
  | 'progress'      // 进度更新
  | 'acceptance'    // 验收确认
  | 'support'       // 技术支持
  | 'complaint'     // 投诉处理
  | 'feedback'      // 反馈收集
  | 'renewal'       // 续费沟通
  | 'other'         // 其他

// 沟通方向
export type CommunicationDirection = 'inbound' | 'outbound'

// 沟通记录
export interface CommunicationRecord {
  id: string
  projectId: string
  clientId: string
  clientName: string

  // 沟通信息
  channel: CommunicationChannel
  type: CommunicationType
  direction: CommunicationDirection
  subject: string
  summary: string
  details?: string

  // 参与人
  participants: {
    name: string
    role: 'client' | 'operator' | 'developer' | 'manager'
    email?: string
    phone?: string
  }[]

  // 附件
  attachments: {
    name: string
    url: string
    type: string
    size: number
  }[]

  // 关键决策
  decisions: {
    content: string
    agreedBy: string[]
    timestamp: Date
  }[]

  // 后续行动
  followUps: {
    action: string
    assignee: string
    dueDate: Date
    status: 'pending' | 'completed' | 'overdue'
    completedAt?: Date
  }[]

  // 内部备注
  internalNotes: {
    content: string
    author: string
    timestamp: Date
  }[]

  // 情绪/满意度
  sentiment?: 'positive' | 'neutral' | 'negative'
  satisfactionScore?: number  // 1-5

  // 时间
  startedAt: Date
  endedAt?: Date
  duration?: number  // 分钟
  createdAt: Date
  updatedAt: Date

  // 关联
  relatedRecords?: string[]  // 关联的其他沟通记录
}

// 沟通统计
export interface CommunicationStats {
  totalRecords: number
  byChannel: Record<CommunicationChannel, number>
  byType: Record<CommunicationType, number>
  averageDuration: number
  averageSatisfaction: number
  pendingFollowUps: number
  thisWeekRecords: number
}

// 渠道配置
const CHANNEL_CONFIG: Record<CommunicationChannel, { label: string; icon: string }> = {
  phone: { label: '电话', icon: '📞' },
  email: { label: '邮件', icon: '📧' },
  wechat: { label: '微信', icon: '💬' },
  meeting: { label: '会议', icon: '🤝' },
  video_call: { label: '视频通话', icon: '📹' },
  ticket: { label: '工单', icon: '🎫' },
  chat: { label: '在线聊天', icon: '💭' },
  sms: { label: '短信', icon: '📱' },
}

// 类型配置
const TYPE_CONFIG: Record<CommunicationType, { label: string; color: string }> = {
  requirement: { label: '需求沟通', color: '#3b82f6' },
  progress: { label: '进度更新', color: '#22c55e' },
  acceptance: { label: '验收确认', color: '#8b5cf6' },
  support: { label: '技术支持', color: '#f59e0b' },
  complaint: { label: '投诉处理', color: '#ef4444' },
  feedback: { label: '反馈收集', color: '#06b6d4' },
  renewal: { label: '续费沟通', color: '#ec4899' },
  other: { label: '其他', color: '#6b7280' },
}

export class CommunicationLogService {
  private records: Map<string, CommunicationRecord> = new Map()

  /**
   * 创建沟通记录
   */
  createRecord(input: {
    projectId: string
    clientId: string
    clientName: string
    channel: CommunicationChannel
    type: CommunicationType
    direction: CommunicationDirection
    subject: string
    summary: string
    details?: string
    participants?: CommunicationRecord['participants']
    startedAt?: Date
  }): CommunicationRecord {
    const id = `comm_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`

    const record: CommunicationRecord = {
      id,
      projectId: input.projectId,
      clientId: input.clientId,
      clientName: input.clientName,
      channel: input.channel,
      type: input.type,
      direction: input.direction,
      subject: input.subject,
      summary: input.summary,
      details: input.details,
      participants: input.participants || [],
      attachments: [],
      decisions: [],
      followUps: [],
      internalNotes: [],
      startedAt: input.startedAt || new Date(),
      createdAt: new Date(),
      updatedAt: new Date(),
    }

    this.records.set(id, record)
    return record
  }

  /**
   * 更新沟通记录
   */
  updateRecord(recordId: string, updates: Partial<CommunicationRecord>): CommunicationRecord | undefined {
    const record = this.records.get(recordId)
    if (!record) return undefined

    const updated = {
      ...record,
      ...updates,
      updatedAt: new Date(),
    }

    this.records.set(recordId, updated)
    return updated
  }

  /**
   * 结束沟通
   */
  endCommunication(recordId: string, summary?: string): CommunicationRecord | undefined {
    const record = this.records.get(recordId)
    if (!record) return undefined

    const endedAt = new Date()
    const duration = Math.round((endedAt.getTime() - record.startedAt.getTime()) / 60000)

    return this.updateRecord(recordId, {
      endedAt,
      duration,
      summary: summary || record.summary,
    })
  }

  /**
   * 添加参与人
   */
  addParticipant(recordId: string, participant: CommunicationRecord['participants'][0]): boolean {
    const record = this.records.get(recordId)
    if (!record) return false

    record.participants.push(participant)
    record.updatedAt = new Date()
    this.records.set(recordId, record)
    return true
  }

  /**
   * 添加附件
   */
  addAttachment(recordId: string, attachment: CommunicationRecord['attachments'][0]): boolean {
    const record = this.records.get(recordId)
    if (!record) return false

    record.attachments.push(attachment)
    record.updatedAt = new Date()
    this.records.set(recordId, record)
    return true
  }

  /**
   * 记录决策
   */
  recordDecision(recordId: string, decision: { content: string; agreedBy: string[] }): boolean {
    const record = this.records.get(recordId)
    if (!record) return false

    record.decisions.push({
      ...decision,
      timestamp: new Date(),
    })
    record.updatedAt = new Date()
    this.records.set(recordId, record)
    return true
  }

  /**
   * 添加后续行动
   */
  addFollowUp(recordId: string, followUp: { action: string; assignee: string; dueDate: Date }): boolean {
    const record = this.records.get(recordId)
    if (!record) return false

    record.followUps.push({
      ...followUp,
      status: 'pending',
    })
    record.updatedAt = new Date()
    this.records.set(recordId, record)
    return true
  }

  /**
   * 完成后续行动
   */
  completeFollowUp(recordId: string, followUpIndex: number): boolean {
    const record = this.records.get(recordId)
    if (!record || !record.followUps[followUpIndex]) return false

    record.followUps[followUpIndex].status = 'completed'
    record.followUps[followUpIndex].completedAt = new Date()
    record.updatedAt = new Date()
    this.records.set(recordId, record)
    return true
  }

  /**
   * 添加内部备注
   */
  addInternalNote(recordId: string, note: { content: string; author: string }): boolean {
    const record = this.records.get(recordId)
    if (!record) return false

    record.internalNotes.push({
      ...note,
      timestamp: new Date(),
    })
    record.updatedAt = new Date()
    this.records.set(recordId, record)
    return true
  }

  /**
   * 设置满意度
   */
  setSatisfaction(recordId: string, score: number, sentiment?: CommunicationRecord['sentiment']): boolean {
    const record = this.records.get(recordId)
    if (!record) return false

    record.satisfactionScore = Math.min(5, Math.max(1, score))
    if (sentiment) record.sentiment = sentiment
    record.updatedAt = new Date()
    this.records.set(recordId, record)
    return true
  }

  /**
   * 获取沟通记录
   */
  getRecord(recordId: string): CommunicationRecord | undefined {
    return this.records.get(recordId)
  }

  /**
   * 获取项目的沟通记录
   */
  getProjectRecords(projectId: string, filter?: {
    channel?: CommunicationChannel[]
    type?: CommunicationType[]
    startDate?: Date
    endDate?: Date
  }): CommunicationRecord[] {
    let records = Array.from(this.records.values())
      .filter(r => r.projectId === projectId)

    if (filter?.channel) {
      records = records.filter(r => filter.channel!.includes(r.channel))
    }
    if (filter?.type) {
      records = records.filter(r => filter.type!.includes(r.type))
    }
    if (filter?.startDate) {
      records = records.filter(r => r.startedAt >= filter.startDate!)
    }
    if (filter?.endDate) {
      records = records.filter(r => r.startedAt <= filter.endDate!)
    }

    return records.sort((a, b) => b.startedAt.getTime() - a.startedAt.getTime())
  }

  /**
   * 获取客户的沟通记录
   */
  getClientRecords(clientId: string): CommunicationRecord[] {
    return Array.from(this.records.values())
      .filter(r => r.clientId === clientId)
      .sort((a, b) => b.startedAt.getTime() - a.startedAt.getTime())
  }

  /**
   * 获取待处理的后续行动
   */
  getPendingFollowUps(projectId?: string): Array<{
    record: CommunicationRecord
    followUp: CommunicationRecord['followUps'][0]
    index: number
  }> {
    const results: Array<{
      record: CommunicationRecord
      followUp: CommunicationRecord['followUps'][0]
      index: number
    }> = []

    for (const record of this.records.values()) {
      if (projectId && record.projectId !== projectId) continue

      record.followUps.forEach((followUp, index) => {
        if (followUp.status === 'pending') {
          // 检查是否过期
          if (followUp.dueDate < new Date()) {
            followUp.status = 'overdue'
          }
          results.push({ record, followUp, index })
        }
      })
    }

    return results.sort((a, b) => a.followUp.dueDate.getTime() - b.followUp.dueDate.getTime())
  }

  /**
   * 获取统计数据
   */
  getStats(projectId?: string): CommunicationStats {
    let records = Array.from(this.records.values())
    if (projectId) {
      records = records.filter(r => r.projectId === projectId)
    }

    const byChannel: Record<CommunicationChannel, number> = {
      phone: 0, email: 0, wechat: 0, meeting: 0,
      video_call: 0, ticket: 0, chat: 0, sms: 0,
    }

    const byType: Record<CommunicationType, number> = {
      requirement: 0, progress: 0, acceptance: 0, support: 0,
      complaint: 0, feedback: 0, renewal: 0, other: 0,
    }

    let totalDuration = 0
    let durationCount = 0
    let totalSatisfaction = 0
    let satisfactionCount = 0
    let pendingFollowUps = 0

    const weekAgo = new Date()
    weekAgo.setDate(weekAgo.getDate() - 7)
    let thisWeekRecords = 0

    for (const record of records) {
      byChannel[record.channel]++
      byType[record.type]++

      if (record.duration) {
        totalDuration += record.duration
        durationCount++
      }

      if (record.satisfactionScore) {
        totalSatisfaction += record.satisfactionScore
        satisfactionCount++
      }

      pendingFollowUps += record.followUps.filter(f => f.status === 'pending' || f.status === 'overdue').length

      if (record.startedAt >= weekAgo) {
        thisWeekRecords++
      }
    }

    return {
      totalRecords: records.length,
      byChannel,
      byType,
      averageDuration: durationCount > 0 ? Math.round(totalDuration / durationCount) : 0,
      averageSatisfaction: satisfactionCount > 0 ? Math.round((totalSatisfaction / satisfactionCount) * 10) / 10 : 0,
      pendingFollowUps,
      thisWeekRecords,
    }
  }

  /**
   * 生成时间线
   */
  generateTimeline(projectId: string): Array<{
    date: string
    records: CommunicationRecord[]
  }> {
    const records = this.getProjectRecords(projectId)
    const grouped: Record<string, CommunicationRecord[]> = {}

    for (const record of records) {
      const date = record.startedAt.toISOString().split('T')[0]
      if (!grouped[date]) grouped[date] = []
      grouped[date].push(record)
    }

    return Object.entries(grouped)
      .map(([date, records]) => ({ date, records }))
      .sort((a, b) => b.date.localeCompare(a.date))
  }

  /**
   * 生成沟通报告
   */
  generateReport(projectId: string, startDate?: Date, endDate?: Date): string {
    const records = this.getProjectRecords(projectId, { startDate, endDate })
    const stats = this.getStats(projectId)

    let report = '# 客户沟通报告\n\n'

    // 概览
    report += '## 概览\n'
    report += `- 总沟通次数: ${stats.totalRecords}\n`
    report += `- 平均时长: ${stats.averageDuration} 分钟\n`
    report += `- 平均满意度: ${stats.averageSatisfaction}/5\n`
    report += `- 待处理事项: ${stats.pendingFollowUps}\n\n`

    // 渠道分布
    report += '## 渠道分布\n'
    for (const [channel, count] of Object.entries(stats.byChannel)) {
      if (count > 0) {
        const config = CHANNEL_CONFIG[channel as CommunicationChannel]
        report += `- ${config.icon} ${config.label}: ${count} 次\n`
      }
    }
    report += '\n'

    // 类型分布
    report += '## 沟通类型\n'
    for (const [type, count] of Object.entries(stats.byType)) {
      if (count > 0) {
        const config = TYPE_CONFIG[type as CommunicationType]
        report += `- ${config.label}: ${count} 次\n`
      }
    }
    report += '\n'

    // 最近沟通
    report += '## 最近沟通记录\n'
    for (const record of records.slice(0, 10)) {
      const channelConfig = CHANNEL_CONFIG[record.channel]
      report += `### ${record.startedAt.toLocaleDateString()} - ${record.subject}\n`
      report += `- 渠道: ${channelConfig.icon} ${channelConfig.label}\n`
      report += `- 摘要: ${record.summary}\n`
      if (record.decisions.length > 0) {
        report += `- 决策: ${record.decisions.map(d => d.content).join('; ')}\n`
      }
      report += '\n'
    }

    // 待处理事项
    const pendingFollowUps = this.getPendingFollowUps(projectId)
    if (pendingFollowUps.length > 0) {
      report += '## 待处理事项\n'
      for (const { followUp } of pendingFollowUps) {
        const isOverdue = followUp.status === 'overdue'
        report += `- ${isOverdue ? '⚠️ [逾期]' : '⏳'} ${followUp.action} (负责人: ${followUp.assignee}, 截止: ${followUp.dueDate.toLocaleDateString()})\n`
      }
    }

    return report
  }

  /**
   * 生成沟通时间线 HTML
   */
  generateTimelineHtml(projectId: string): string {
    const timeline = this.generateTimeline(projectId)
    const stats = this.getStats(projectId)

    return `
<!DOCTYPE html>
<html lang="zh-CN">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>客户沟通记录</title>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
      background: #f8fafc;
      min-height: 100vh;
      padding: 30px;
    }
    .container { max-width: 800px; margin: 0 auto; }
    h1 { font-size: 24px; margin-bottom: 20px; }

    .stats {
      display: grid;
      grid-template-columns: repeat(4, 1fr);
      gap: 15px;
      margin-bottom: 30px;
    }
    .stat {
      background: #fff;
      padding: 20px;
      border-radius: 12px;
      box-shadow: 0 1px 3px rgba(0,0,0,0.1);
      text-align: center;
    }
    .stat-value { font-size: 24px; font-weight: bold; color: #3b82f6; }
    .stat-label { font-size: 12px; color: #64748b; margin-top: 5px; }

    .timeline {
      position: relative;
      padding-left: 30px;
    }
    .timeline::before {
      content: '';
      position: absolute;
      left: 10px;
      top: 0;
      bottom: 0;
      width: 2px;
      background: #e2e8f0;
    }

    .timeline-date {
      font-size: 14px;
      font-weight: 600;
      color: #64748b;
      margin: 20px 0 10px;
      position: relative;
    }
    .timeline-date::before {
      content: '';
      position: absolute;
      left: -24px;
      top: 5px;
      width: 10px;
      height: 10px;
      border-radius: 50%;
      background: #3b82f6;
    }

    .record-card {
      background: #fff;
      border-radius: 12px;
      box-shadow: 0 1px 3px rgba(0,0,0,0.1);
      padding: 20px;
      margin-bottom: 15px;
    }
    .record-header {
      display: flex;
      justify-content: space-between;
      align-items: flex-start;
      margin-bottom: 10px;
    }
    .record-title { font-weight: 600; font-size: 15px; }
    .record-channel {
      font-size: 12px;
      padding: 4px 8px;
      background: #f1f5f9;
      border-radius: 4px;
    }
    .record-summary { font-size: 14px; color: #475569; line-height: 1.6; }
    .record-meta {
      display: flex;
      gap: 15px;
      margin-top: 15px;
      padding-top: 15px;
      border-top: 1px solid #e2e8f0;
      font-size: 12px;
      color: #94a3b8;
    }

    .decisions {
      margin-top: 15px;
      padding: 10px;
      background: #f0fdf4;
      border-radius: 8px;
      border-left: 3px solid #22c55e;
    }
    .decisions-title { font-size: 12px; color: #16a34a; font-weight: 500; margin-bottom: 5px; }
    .decision-item { font-size: 13px; color: #166534; }

    .follow-ups {
      margin-top: 15px;
    }
    .follow-up {
      display: flex;
      align-items: center;
      gap: 10px;
      padding: 8px 0;
      font-size: 13px;
    }
    .follow-up.overdue { color: #ef4444; }
    .follow-up.pending { color: #f59e0b; }
    .follow-up.completed { color: #22c55e; text-decoration: line-through; }
  </style>
</head>
<body>
  <div class="container">
    <h1>💬 客户沟通记录</h1>

    <div class="stats">
      <div class="stat">
        <div class="stat-value">${stats.totalRecords}</div>
        <div class="stat-label">总沟通次数</div>
      </div>
      <div class="stat">
        <div class="stat-value">${stats.averageDuration}</div>
        <div class="stat-label">平均时长(分钟)</div>
      </div>
      <div class="stat">
        <div class="stat-value">${stats.averageSatisfaction}</div>
        <div class="stat-label">平均满意度</div>
      </div>
      <div class="stat">
        <div class="stat-value" style="color: ${stats.pendingFollowUps > 0 ? '#f59e0b' : '#22c55e'}">${stats.pendingFollowUps}</div>
        <div class="stat-label">待处理事项</div>
      </div>
    </div>

    <div class="timeline">
      ${timeline.map(day => `
        <div class="timeline-date">${day.date}</div>
        ${day.records.map(record => {
          const channelConfig = CHANNEL_CONFIG[record.channel]
          const typeConfig = TYPE_CONFIG[record.type]
          return `
            <div class="record-card">
              <div class="record-header">
                <div class="record-title">${record.subject}</div>
                <div class="record-channel">${channelConfig.icon} ${channelConfig.label}</div>
              </div>
              <div class="record-summary">${record.summary}</div>
              ${record.decisions.length > 0 ? `
                <div class="decisions">
                  <div class="decisions-title">📌 关键决策</div>
                  ${record.decisions.map(d => `<div class="decision-item">• ${d.content}</div>`).join('')}
                </div>
              ` : ''}
              ${record.followUps.length > 0 ? `
                <div class="follow-ups">
                  ${record.followUps.map(f => `
                    <div class="follow-up ${f.status}">
                      ${f.status === 'completed' ? '✓' : f.status === 'overdue' ? '⚠️' : '⏳'}
                      ${f.action} - ${f.assignee}
                    </div>
                  `).join('')}
                </div>
              ` : ''}
              <div class="record-meta">
                <span style="color: ${typeConfig.color}">${typeConfig.label}</span>
                <span>${record.direction === 'inbound' ? '← 客户发起' : '→ 我们发起'}</span>
                ${record.duration ? `<span>时长: ${record.duration}分钟</span>` : ''}
                ${record.satisfactionScore ? `<span>满意度: ${'⭐'.repeat(record.satisfactionScore)}</span>` : ''}
              </div>
            </div>
          `
        }).join('')}
      `).join('')}
    </div>
  </div>
</body>
</html>
`
  }
}

// 单例导出
export const communicationLog = new CommunicationLogService()
