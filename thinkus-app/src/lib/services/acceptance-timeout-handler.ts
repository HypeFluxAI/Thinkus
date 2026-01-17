/**
 * 验收超时自动处理服务 (P0-1)
 *
 * 解决问题：5-10%的用户在验收环节卡住不响应
 *
 * 设计理念：
 * 1. 设置5分钟验收超时
 * 2. 实时倒计时提醒用户
 * 3. 超时自动通过 + 标记人工复查
 * 4. 失败时降级到人工支持
 */

import { SimpleAcceptanceSession, AcceptanceOutcome } from './simple-acceptance'

// 超时配置
export interface TimeoutConfig {
  // 每个检查项的超时时间（毫秒）
  itemTimeoutMs: number
  // 整个验收流程的超时时间（毫秒）
  sessionTimeoutMs: number
  // 提醒间隔（毫秒）
  reminderIntervalMs: number
  // 自动通过前的最后警告时间（毫秒）
  finalWarningMs: number
  // 是否启用自动通过
  enableAutoPass: boolean
  // 自动通过时是否需要人工复查
  requireHumanReview: boolean
}

// 默认超时配置
export const DEFAULT_TIMEOUT_CONFIG: TimeoutConfig = {
  itemTimeoutMs: 2 * 60 * 1000,      // 单项2分钟
  sessionTimeoutMs: 5 * 60 * 1000,   // 整体5分钟
  reminderIntervalMs: 30 * 1000,     // 每30秒提醒
  finalWarningMs: 30 * 1000,         // 最后30秒警告
  enableAutoPass: true,
  requireHumanReview: true
}

// 超时状态
export type TimeoutStatus =
  | 'active'           // 正常进行中
  | 'warning'          // 接近超时
  | 'final_warning'    // 最后警告
  | 'auto_passed'      // 已自动通过
  | 'escalated'        // 已升级人工
  | 'completed'        // 正常完成

// 超时事件类型
export type TimeoutEventType =
  | 'reminder'         // 定期提醒
  | 'warning'          // 超时警告
  | 'final_warning'    // 最后警告
  | 'auto_pass'        // 自动通过
  | 'escalate'         // 升级人工

// 超时事件
export interface TimeoutEvent {
  type: TimeoutEventType
  timestamp: Date
  remainingMs: number
  message: string
  messageIcon: string
}

// 超时会话
export interface TimeoutSession {
  id: string
  acceptanceSessionId: string
  projectId: string
  userId: string
  config: TimeoutConfig
  status: TimeoutStatus
  startedAt: Date
  lastActivityAt: Date
  expiresAt: Date
  events: TimeoutEvent[]
  autoPassReason?: string
  humanReviewRequired: boolean
  humanReviewNotes?: string
  escalatedAt?: Date
  escalationReason?: string
}

// 倒计时回调
export type CountdownCallback = (remainingMs: number, message: string) => void
// 事件回调
export type TimeoutEventCallback = (event: TimeoutEvent) => void

// 提醒消息模板
const REMINDER_MESSAGES = {
  reminder: [
    '⏰ 还剩 {time}，请继续完成验收',
    '📋 验收进行中，剩余时间 {time}',
    '👋 别忘了完成验收哦，还有 {time}'
  ],
  warning: [
    '⚠️ 验收即将超时，还剩 {time}',
    '🔔 请尽快完成验收，仅剩 {time}',
    '⏳ 时间不多了，还有 {time}'
  ],
  final_warning: [
    '🚨 最后 {time}！即将自动完成验收',
    '❗ 倒计时 {time}，未操作将自动通过',
    '⏱️ {time} 后将自动确认验收'
  ],
  auto_pass: [
    '✅ 验收已自动通过，我们会人工复查确保一切正常',
    '🎉 验收超时自动完成，放心，我们会帮您检查的',
    '👍 已自动确认验收，稍后会有专人跟进'
  ],
  escalate: [
    '📞 已为您转接人工客服，马上有人联系您',
    '👨‍💼 验收需要人工协助，客服正在赶来',
    '🤝 已安排专人协助，请稍候'
  ]
}

/**
 * 验收超时自动处理服务
 */
export class AcceptanceTimeoutHandlerService {
  private activeSessions: Map<string, TimeoutSession> = new Map()
  private timers: Map<string, NodeJS.Timeout[]> = new Map()

  /**
   * 创建超时会话
   */
  createTimeoutSession(
    acceptanceSession: SimpleAcceptanceSession,
    config: Partial<TimeoutConfig> = {}
  ): TimeoutSession {
    const fullConfig = { ...DEFAULT_TIMEOUT_CONFIG, ...config }
    const now = new Date()

    const session: TimeoutSession = {
      id: `timeout_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      acceptanceSessionId: acceptanceSession.id,
      projectId: acceptanceSession.projectId,
      userId: acceptanceSession.userId,
      config: fullConfig,
      status: 'active',
      startedAt: now,
      lastActivityAt: now,
      expiresAt: new Date(now.getTime() + fullConfig.sessionTimeoutMs),
      events: [],
      humanReviewRequired: false
    }

    this.activeSessions.set(session.id, session)
    return session
  }

  /**
   * 启动超时计时器
   */
  startTimeout(
    session: TimeoutSession,
    onCountdown?: CountdownCallback,
    onEvent?: TimeoutEventCallback
  ): void {
    const timers: NodeJS.Timeout[] = []
    const { config } = session

    // 定期提醒计时器
    const reminderTimer = setInterval(() => {
      const remaining = session.expiresAt.getTime() - Date.now()
      if (remaining <= 0) {
        clearInterval(reminderTimer)
        return
      }

      // 更新状态
      if (remaining <= config.finalWarningMs && session.status === 'active') {
        session.status = 'final_warning'
      } else if (remaining <= config.finalWarningMs * 2 && session.status === 'active') {
        session.status = 'warning'
      }

      // 生成提醒消息
      const timeStr = this.formatTime(remaining)
      let messageType: keyof typeof REMINDER_MESSAGES = 'reminder'
      if (session.status === 'final_warning') {
        messageType = 'final_warning'
      } else if (session.status === 'warning') {
        messageType = 'warning'
      }

      const messages = REMINDER_MESSAGES[messageType]
      const message = messages[Math.floor(Math.random() * messages.length)].replace('{time}', timeStr)

      if (onCountdown) {
        onCountdown(remaining, message)
      }
    }, config.reminderIntervalMs)
    timers.push(reminderTimer)

    // 警告计时器
    const warningTimeout = setTimeout(() => {
      if (session.status === 'active') {
        session.status = 'warning'
        const event = this.createEvent('warning', session)
        session.events.push(event)
        if (onEvent) onEvent(event)
      }
    }, config.sessionTimeoutMs - config.finalWarningMs * 2)
    timers.push(warningTimeout)

    // 最后警告计时器
    const finalWarningTimeout = setTimeout(() => {
      if (session.status !== 'completed' && session.status !== 'escalated') {
        session.status = 'final_warning'
        const event = this.createEvent('final_warning', session)
        session.events.push(event)
        if (onEvent) onEvent(event)
      }
    }, config.sessionTimeoutMs - config.finalWarningMs)
    timers.push(finalWarningTimeout)

    // 自动通过计时器
    const autoPassTimeout = setTimeout(() => {
      if (session.status !== 'completed' && session.status !== 'escalated') {
        this.handleAutoPass(session, onEvent)
      }
    }, config.sessionTimeoutMs)
    timers.push(autoPassTimeout)

    this.timers.set(session.id, timers)
  }

  /**
   * 处理自动通过
   */
  private handleAutoPass(
    session: TimeoutSession,
    onEvent?: TimeoutEventCallback
  ): void {
    if (!session.config.enableAutoPass) {
      // 如果禁用自动通过，则升级到人工
      this.escalateToHuman(session, '验收超时且未启用自动通过', onEvent)
      return
    }

    session.status = 'auto_passed'
    session.autoPassReason = '验收超时自动通过'
    session.humanReviewRequired = session.config.requireHumanReview
    session.humanReviewNotes = `用户 ${session.userId} 在 ${this.formatTime(session.config.sessionTimeoutMs)} 内未完成验收，系统自动通过。需要人工复查确认产品状态。`

    const event = this.createEvent('auto_pass', session)
    session.events.push(event)
    if (onEvent) onEvent(event)

    // 清理计时器
    this.clearTimers(session.id)
  }

  /**
   * 升级到人工支持
   */
  escalateToHuman(
    session: TimeoutSession,
    reason: string,
    onEvent?: TimeoutEventCallback
  ): void {
    session.status = 'escalated'
    session.escalatedAt = new Date()
    session.escalationReason = reason
    session.humanReviewRequired = true

    const event = this.createEvent('escalate', session)
    session.events.push(event)
    if (onEvent) onEvent(event)

    // 清理计时器
    this.clearTimers(session.id)
  }

  /**
   * 记录用户活动（重置超时）
   */
  recordActivity(sessionId: string): void {
    const session = this.activeSessions.get(sessionId)
    if (!session) return

    session.lastActivityAt = new Date()
    // 可选：重置超时时间
    // session.expiresAt = new Date(Date.now() + session.config.sessionTimeoutMs)
  }

  /**
   * 完成验收（取消超时）
   */
  completeAcceptance(sessionId: string): void {
    const session = this.activeSessions.get(sessionId)
    if (!session) return

    session.status = 'completed'
    this.clearTimers(sessionId)
  }

  /**
   * 获取剩余时间
   */
  getRemainingTime(sessionId: string): number {
    const session = this.activeSessions.get(sessionId)
    if (!session) return 0
    return Math.max(0, session.expiresAt.getTime() - Date.now())
  }

  /**
   * 获取超时状态
   */
  getStatus(sessionId: string): TimeoutStatus | null {
    const session = this.activeSessions.get(sessionId)
    return session?.status ?? null
  }

  /**
   * 获取会话详情
   */
  getSession(sessionId: string): TimeoutSession | null {
    return this.activeSessions.get(sessionId) ?? null
  }

  /**
   * 创建事件
   */
  private createEvent(type: TimeoutEventType, session: TimeoutSession): TimeoutEvent {
    const remaining = Math.max(0, session.expiresAt.getTime() - Date.now())
    const messages = REMINDER_MESSAGES[type]
    const message = messages[Math.floor(Math.random() * messages.length)]
      .replace('{time}', this.formatTime(remaining))

    let icon: string
    switch (type) {
      case 'reminder': icon = '⏰'; break
      case 'warning': icon = '⚠️'; break
      case 'final_warning': icon = '🚨'; break
      case 'auto_pass': icon = '✅'; break
      case 'escalate': icon = '📞'; break
    }

    return {
      type,
      timestamp: new Date(),
      remainingMs: remaining,
      message,
      messageIcon: icon
    }
  }

  /**
   * 清理计时器
   */
  private clearTimers(sessionId: string): void {
    const timers = this.timers.get(sessionId)
    if (timers) {
      timers.forEach(timer => {
        clearTimeout(timer)
        clearInterval(timer)
      })
      this.timers.delete(sessionId)
    }
  }

  /**
   * 格式化时间
   */
  private formatTime(ms: number): string {
    const seconds = Math.floor(ms / 1000)
    const minutes = Math.floor(seconds / 60)
    const remainingSeconds = seconds % 60

    if (minutes > 0) {
      return `${minutes}分${remainingSeconds}秒`
    }
    return `${seconds}秒`
  }

  /**
   * 生成自动通过的验收结果
   */
  generateAutoPassOutcome(
    session: TimeoutSession,
    acceptanceSession: SimpleAcceptanceSession
  ): AcceptanceOutcome {
    const completedFeedbacks = acceptanceSession.feedbacks.filter(f => f.result === 'good')
    const issueFeedbacks = acceptanceSession.feedbacks.filter(f => f.result === 'bad')
    const skippedFeedbacks = acceptanceSession.feedbacks.filter(f => f.result === 'skip')

    // 未回答的项目视为"跳过"
    const unansweredCount = acceptanceSession.checkItems.length - acceptanceSession.feedbacks.length

    return {
      sessionId: acceptanceSession.id,
      passed: true, // 自动通过
      passedWithIssues: issueFeedbacks.length > 0 || unansweredCount > 0,
      totalChecks: acceptanceSession.checkItems.length,
      passedChecks: completedFeedbacks.length,
      issueChecks: issueFeedbacks.length,
      skippedChecks: skippedFeedbacks.length + unansweredCount,
      issues: issueFeedbacks.map(f => {
        const check = acceptanceSession.checkItems.find(c => c.id === f.checkId)!
        return {
          checkId: f.checkId,
          checkTitle: check?.title ?? '未知项目',
          issueType: f.issueType || 'other',
          issueNote: f.issueNote,
          severity: 'minor' as const
        }
      }),
      signedAt: new Date(),
      signature: `[系统自动签名] 超时自动通过 - ${new Date().toISOString()}`,
      summary: this.generateAutoPassSummary(session, acceptanceSession, unansweredCount)
    }
  }

  /**
   * 生成自动通过摘要
   */
  private generateAutoPassSummary(
    timeoutSession: TimeoutSession,
    acceptanceSession: SimpleAcceptanceSession,
    unansweredCount: number
  ): string {
    const lines: string[] = []

    lines.push('📋 验收结果摘要')
    lines.push('─'.repeat(40))
    lines.push('')
    lines.push('⏰ 验收方式: 超时自动通过')
    lines.push(`📅 通过时间: ${new Date().toLocaleString()}`)
    lines.push('')
    lines.push('📊 检查统计:')
    lines.push(`   ✅ 已确认: ${acceptanceSession.feedbacks.filter(f => f.result === 'good').length} 项`)
    lines.push(`   ⚠️ 有问题: ${acceptanceSession.feedbacks.filter(f => f.result === 'bad').length} 项`)
    lines.push(`   ⏭️ 未回答: ${unansweredCount} 项`)
    lines.push('')

    if (timeoutSession.humanReviewRequired) {
      lines.push('🔍 人工复查: 需要')
      lines.push('   说明: 由于验收超时自动通过，我们会安排专人')
      lines.push('   复查产品状态，确保一切正常。')
    }

    lines.push('')
    lines.push('─'.repeat(40))
    lines.push('💡 如有任何问题，请随时联系我们的客服团队。')

    return lines.join('\n')
  }

  /**
   * 生成倒计时UI HTML
   */
  generateCountdownHtml(session: TimeoutSession): string {
    const remaining = Math.max(0, session.expiresAt.getTime() - Date.now())
    const percent = (remaining / session.config.sessionTimeoutMs) * 100

    let statusColor: string
    let statusText: string
    switch (session.status) {
      case 'active':
        statusColor = '#22c55e'
        statusText = '进行中'
        break
      case 'warning':
        statusColor = '#f59e0b'
        statusText = '请加快'
        break
      case 'final_warning':
        statusColor = '#ef4444'
        statusText = '即将超时'
        break
      case 'auto_passed':
        statusColor = '#3b82f6'
        statusText = '已自动通过'
        break
      case 'escalated':
        statusColor = '#8b5cf6'
        statusText = '人工处理中'
        break
      default:
        statusColor = '#6b7280'
        statusText = '已完成'
    }

    return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <title>验收倒计时</title>
  <style>
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; }
    .countdown-widget {
      position: fixed;
      top: 20px;
      right: 20px;
      background: white;
      border-radius: 16px;
      box-shadow: 0 10px 40px rgba(0,0,0,0.15);
      padding: 20px;
      width: 280px;
      z-index: 10000;
    }
    .countdown-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 16px;
    }
    .countdown-title {
      font-size: 14px;
      font-weight: 600;
      color: #374151;
    }
    .countdown-status {
      font-size: 12px;
      padding: 4px 8px;
      border-radius: 12px;
      background: ${statusColor}20;
      color: ${statusColor};
      font-weight: 500;
    }
    .countdown-time {
      font-size: 48px;
      font-weight: 700;
      text-align: center;
      color: ${statusColor};
      margin: 16px 0;
      font-variant-numeric: tabular-nums;
    }
    .countdown-progress {
      height: 8px;
      background: #f3f4f6;
      border-radius: 4px;
      overflow: hidden;
    }
    .countdown-progress-bar {
      height: 100%;
      background: ${statusColor};
      width: ${percent}%;
      transition: width 1s linear;
      border-radius: 4px;
    }
    .countdown-message {
      margin-top: 16px;
      padding: 12px;
      background: ${statusColor}10;
      border-radius: 8px;
      font-size: 13px;
      color: #374151;
      line-height: 1.5;
    }
    .countdown-actions {
      margin-top: 16px;
      display: flex;
      gap: 8px;
    }
    .countdown-btn {
      flex: 1;
      padding: 10px;
      border: none;
      border-radius: 8px;
      font-size: 13px;
      font-weight: 500;
      cursor: pointer;
      transition: all 0.2s;
    }
    .countdown-btn-primary {
      background: ${statusColor};
      color: white;
    }
    .countdown-btn-secondary {
      background: #f3f4f6;
      color: #374151;
    }
    .countdown-btn:hover {
      opacity: 0.9;
      transform: translateY(-1px);
    }
  </style>
</head>
<body>
  <div class="countdown-widget" id="countdownWidget">
    <div class="countdown-header">
      <div class="countdown-title">⏰ 验收倒计时</div>
      <div class="countdown-status">${statusText}</div>
    </div>
    <div class="countdown-time" id="countdownTime">${this.formatTime(remaining)}</div>
    <div class="countdown-progress">
      <div class="countdown-progress-bar" id="progressBar"></div>
    </div>
    <div class="countdown-message" id="countdownMessage">
      ${session.status === 'active' ? '请按照提示完成每一项检查，确认您的产品正常工作。' :
        session.status === 'warning' ? '时间不多了，请尽快完成剩余的检查项目。' :
        session.status === 'final_warning' ? '即将自动完成验收，如需继续请点击下方按钮。' :
        session.status === 'auto_passed' ? '验收已自动通过，我们会安排人工复查。' :
        '正在为您转接人工客服...'}
    </div>
    <div class="countdown-actions">
      <button class="countdown-btn countdown-btn-primary" onclick="continueAcceptance()">
        继续验收
      </button>
      <button class="countdown-btn countdown-btn-secondary" onclick="needHelp()">
        需要帮助
      </button>
    </div>
  </div>

  <script>
    let remaining = ${remaining};
    const total = ${session.config.sessionTimeoutMs};

    function updateCountdown() {
      remaining -= 1000;
      if (remaining < 0) remaining = 0;

      const seconds = Math.floor(remaining / 1000);
      const minutes = Math.floor(seconds / 60);
      const secs = seconds % 60;

      document.getElementById('countdownTime').textContent =
        minutes > 0 ? minutes + '分' + secs + '秒' : secs + '秒';

      const percent = (remaining / total) * 100;
      document.getElementById('progressBar').style.width = percent + '%';

      // 更新颜色和状态
      if (remaining <= 30000) {
        document.getElementById('countdownTime').style.color = '#ef4444';
        document.getElementById('progressBar').style.background = '#ef4444';
      } else if (remaining <= 60000) {
        document.getElementById('countdownTime').style.color = '#f59e0b';
        document.getElementById('progressBar').style.background = '#f59e0b';
      }
    }

    setInterval(updateCountdown, 1000);

    function continueAcceptance() {
      // 通知父窗口继续验收
      window.parent.postMessage({ type: 'continue_acceptance' }, '*');
    }

    function needHelp() {
      // 请求人工帮助
      window.parent.postMessage({ type: 'need_help' }, '*');
    }
  </script>
</body>
</html>
    `.trim()
  }

  /**
   * 清理会话
   */
  cleanup(sessionId: string): void {
    this.clearTimers(sessionId)
    this.activeSessions.delete(sessionId)
  }

  /**
   * 清理所有会话
   */
  cleanupAll(): void {
    for (const sessionId of this.activeSessions.keys()) {
      this.cleanup(sessionId)
    }
  }
}

// 导出单例
export const acceptanceTimeoutHandler = new AcceptanceTimeoutHandlerService()
