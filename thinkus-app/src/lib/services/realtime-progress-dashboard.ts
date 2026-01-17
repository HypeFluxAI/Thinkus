/**
 * 实时进度面板服务 (P0-2)
 *
 * 解决问题：50%的用户在交付过程中感到焦虑，不知道进度
 *
 * 设计理念：
 * 1. 多渠道实时推送（Web/邮件/短信/微信）
 * 2. 人话进度描述，小白也能看懂
 * 3. 预计完成时间动态更新
 * 4. 关键节点主动通知
 */

// 进度阶段
export type ProgressStage =
  | 'queued'           // 排队中
  | 'preparing'        // 准备环境
  | 'coding'           // 编写代码
  | 'testing'          // 测试中
  | 'fixing'           // 修复问题
  | 'deploying'        // 部署中
  | 'configuring'      // 配置中
  | 'verifying'        // 验证中
  | 'almost_done'      // 即将完成
  | 'completed'        // 已完成
  | 'paused'           // 已暂停
  | 'error'            // 出错了

// 进度阶段配置
interface StageConfig {
  name: string           // 阶段名称
  description: string    // 人话描述
  icon: string           // 图标
  color: string          // 颜色
  estimatedMinutes: number // 预计分钟
  encouragement: string  // 鼓励话语
}

// 阶段配置表
const STAGE_CONFIGS: Record<ProgressStage, StageConfig> = {
  queued: {
    name: '排队中',
    description: '您的产品正在排队等待制作',
    icon: '🎫',
    color: '#6b7280',
    estimatedMinutes: 5,
    encouragement: '马上就轮到您啦，请稍候~'
  },
  preparing: {
    name: '准备中',
    description: '正在为您准备开发环境',
    icon: '🔧',
    color: '#f59e0b',
    estimatedMinutes: 3,
    encouragement: '正在热身，马上开始制作！'
  },
  coding: {
    name: '制作中',
    description: '工程师正在编写您的产品代码',
    icon: '👨‍💻',
    color: '#3b82f6',
    estimatedMinutes: 30,
    encouragement: '产品正在成型，请耐心等待~'
  },
  testing: {
    name: '测试中',
    description: '正在测试产品功能是否正常',
    icon: '🧪',
    color: '#8b5cf6',
    estimatedMinutes: 10,
    encouragement: '确保每个功能都完美运行！'
  },
  fixing: {
    name: '优化中',
    description: '发现了一些小问题，正在修复',
    icon: '🔨',
    color: '#f97316',
    estimatedMinutes: 15,
    encouragement: '精益求精，让产品更完美！'
  },
  deploying: {
    name: '部署中',
    description: '正在将产品部署到服务器',
    icon: '🚀',
    color: '#10b981',
    estimatedMinutes: 5,
    encouragement: '即将上线，激动人心！'
  },
  configuring: {
    name: '配置中',
    description: '正在配置域名和安全证书',
    icon: '⚙️',
    color: '#06b6d4',
    estimatedMinutes: 5,
    encouragement: '细节决定成败！'
  },
  verifying: {
    name: '验证中',
    description: '正在进行最后的检查验证',
    icon: '✅',
    color: '#22c55e',
    estimatedMinutes: 3,
    encouragement: '最后一步，马上就好！'
  },
  almost_done: {
    name: '即将完成',
    description: '产品已准备就绪，正在收尾',
    icon: '🎉',
    color: '#a855f7',
    estimatedMinutes: 2,
    encouragement: '恭喜！您的产品马上就能用了！'
  },
  completed: {
    name: '已完成',
    description: '产品制作完成，可以开始使用啦！',
    icon: '🎊',
    color: '#22c55e',
    estimatedMinutes: 0,
    encouragement: '太棒了！快去体验您的新产品吧！'
  },
  paused: {
    name: '已暂停',
    description: '产品制作暂时暂停，稍后继续',
    icon: '⏸️',
    color: '#f59e0b',
    estimatedMinutes: 0,
    encouragement: '稍作休息，很快继续~'
  },
  error: {
    name: '遇到问题',
    description: '遇到了一些问题，正在处理中',
    icon: '⚠️',
    color: '#ef4444',
    estimatedMinutes: 0,
    encouragement: '别担心，我们正在解决！'
  }
}

// 通知渠道
export type NotificationChannel = 'web' | 'email' | 'sms' | 'wechat' | 'push'

// 通知配置
export interface NotificationConfig {
  channels: NotificationChannel[]
  // 关键节点通知（不受静默时段限制）
  criticalNotifications: boolean
  // 静默时段（避免深夜打扰）
  quietHoursStart?: number // 0-23
  quietHoursEnd?: number   // 0-23
  // 邮件频率
  emailFrequency: 'realtime' | 'hourly' | 'milestone_only'
  // 短信频率
  smsFrequency: 'milestone_only' | 'critical_only' | 'never'
  // 微信频率
  wechatFrequency: 'realtime' | 'milestone_only' | 'never'
}

// 默认通知配置
const DEFAULT_NOTIFICATION_CONFIG: NotificationConfig = {
  channels: ['web', 'email'],
  criticalNotifications: true,
  quietHoursStart: 22,
  quietHoursEnd: 8,
  emailFrequency: 'milestone_only',
  smsFrequency: 'milestone_only',
  wechatFrequency: 'milestone_only'
}

// 进度事件
export interface ProgressEvent {
  id: string
  timestamp: Date
  stage: ProgressStage
  previousStage?: ProgressStage
  message: string
  details?: string
  isError: boolean
  isMilestone: boolean
}

// 进度会话
export interface ProgressSession {
  id: string
  projectId: string
  projectName: string
  userId: string
  userName: string
  userEmail?: string
  userPhone?: string
  currentStage: ProgressStage
  previousStage?: ProgressStage
  overallProgress: number // 0-100
  events: ProgressEvent[]
  startedAt: Date
  estimatedCompletionAt: Date
  actualCompletionAt?: Date
  notificationConfig: NotificationConfig
  lastNotificationAt?: Date
  subscriberCount: number // 实时查看的人数
}

// 里程碑阶段（需要通知的关键节点）
const MILESTONE_STAGES: ProgressStage[] = [
  'coding',
  'deploying',
  'completed',
  'error'
]

// 进度百分比映射
const STAGE_PROGRESS: Record<ProgressStage, number> = {
  queued: 5,
  preparing: 10,
  coding: 40,
  testing: 60,
  fixing: 65,
  deploying: 80,
  configuring: 90,
  verifying: 95,
  almost_done: 98,
  completed: 100,
  paused: -1,
  error: -1
}

// 订阅者类型
type ProgressSubscriber = (event: ProgressEvent, session: ProgressSession) => void

/**
 * 实时进度面板服务
 */
export class RealtimeProgressDashboardService {
  private sessions: Map<string, ProgressSession> = new Map()
  private subscribers: Map<string, Set<ProgressSubscriber>> = new Map()

  /**
   * 创建进度会话
   */
  createSession(
    projectId: string,
    projectName: string,
    userId: string,
    userName: string,
    userEmail?: string,
    userPhone?: string,
    notificationConfig?: Partial<NotificationConfig>
  ): ProgressSession {
    const config = { ...DEFAULT_NOTIFICATION_CONFIG, ...notificationConfig }
    const now = new Date()

    // 计算预计完成时间
    const totalMinutes = Object.values(STAGE_CONFIGS).reduce(
      (sum, stage) => sum + stage.estimatedMinutes,
      0
    )
    const estimatedCompletionAt = new Date(now.getTime() + totalMinutes * 60 * 1000)

    const session: ProgressSession = {
      id: `progress_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      projectId,
      projectName,
      userId,
      userName,
      userEmail,
      userPhone,
      currentStage: 'queued',
      overallProgress: STAGE_PROGRESS.queued,
      events: [],
      startedAt: now,
      estimatedCompletionAt,
      notificationConfig: config,
      subscriberCount: 0
    }

    // 添加初始事件
    const initEvent = this.createEvent(session, 'queued', '产品制作已开始')
    session.events.push(initEvent)

    this.sessions.set(session.id, session)
    this.subscribers.set(session.id, new Set())

    return session
  }

  /**
   * 更新进度阶段
   */
  updateStage(
    sessionId: string,
    stage: ProgressStage,
    message?: string,
    details?: string
  ): ProgressEvent | null {
    const session = this.sessions.get(sessionId)
    if (!session) return null

    const config = STAGE_CONFIGS[stage]
    const previousStage = session.currentStage

    session.previousStage = previousStage
    session.currentStage = stage
    session.overallProgress = STAGE_PROGRESS[stage] >= 0
      ? STAGE_PROGRESS[stage]
      : session.overallProgress

    // 更新预计完成时间
    if (STAGE_PROGRESS[stage] >= 0) {
      const remainingStages = this.getRemainingStages(stage)
      const remainingMinutes = remainingStages.reduce(
        (sum, s) => sum + STAGE_CONFIGS[s].estimatedMinutes,
        0
      )
      session.estimatedCompletionAt = new Date(
        Date.now() + remainingMinutes * 60 * 1000
      )
    }

    if (stage === 'completed') {
      session.actualCompletionAt = new Date()
    }

    // 创建事件
    const event = this.createEvent(
      session,
      stage,
      message || config.description,
      details,
      previousStage
    )
    session.events.push(event)

    // 通知订阅者
    this.notifySubscribers(sessionId, event, session)

    // 发送外部通知
    if (event.isMilestone) {
      this.sendExternalNotifications(session, event)
    }

    return event
  }

  /**
   * 订阅进度更新
   */
  subscribe(sessionId: string, callback: ProgressSubscriber): () => void {
    const subscribers = this.subscribers.get(sessionId)
    if (!subscribers) return () => {}

    subscribers.add(callback)

    const session = this.sessions.get(sessionId)
    if (session) {
      session.subscriberCount = subscribers.size
    }

    // 返回取消订阅函数
    return () => {
      subscribers.delete(callback)
      if (session) {
        session.subscriberCount = subscribers.size
      }
    }
  }

  /**
   * 获取进度会话
   */
  getSession(sessionId: string): ProgressSession | null {
    return this.sessions.get(sessionId) ?? null
  }

  /**
   * 获取项目的进度会话
   */
  getSessionByProjectId(projectId: string): ProgressSession | null {
    for (const session of this.sessions.values()) {
      if (session.projectId === projectId) {
        return session
      }
    }
    return null
  }

  /**
   * 获取进度摘要（人话）
   */
  getProgressSummary(sessionId: string): string {
    const session = this.sessions.get(sessionId)
    if (!session) return '未找到进度信息'

    const config = STAGE_CONFIGS[session.currentStage]
    const lines: string[] = []

    lines.push(`${config.icon} ${config.name}`)
    lines.push('')
    lines.push(config.description)
    lines.push('')
    lines.push(`📊 整体进度: ${session.overallProgress}%`)

    if (session.currentStage !== 'completed' && session.currentStage !== 'error') {
      const remaining = Math.max(0, session.estimatedCompletionAt.getTime() - Date.now())
      lines.push(`⏰ 预计还需: ${this.formatTime(remaining)}`)
    }

    lines.push('')
    lines.push(`💪 ${config.encouragement}`)

    return lines.join('\n')
  }

  /**
   * 创建事件
   */
  private createEvent(
    session: ProgressSession,
    stage: ProgressStage,
    message: string,
    details?: string,
    previousStage?: ProgressStage
  ): ProgressEvent {
    return {
      id: `event_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      timestamp: new Date(),
      stage,
      previousStage,
      message,
      details,
      isError: stage === 'error',
      isMilestone: MILESTONE_STAGES.includes(stage)
    }
  }

  /**
   * 通知订阅者
   */
  private notifySubscribers(
    sessionId: string,
    event: ProgressEvent,
    session: ProgressSession
  ): void {
    const subscribers = this.subscribers.get(sessionId)
    if (!subscribers) return

    for (const callback of subscribers) {
      try {
        callback(event, session)
      } catch (error) {
        console.error('Progress subscriber error:', error)
      }
    }
  }

  /**
   * 发送外部通知
   */
  private async sendExternalNotifications(
    session: ProgressSession,
    event: ProgressEvent
  ): Promise<void> {
    const { notificationConfig } = session

    // 检查静默时段
    if (!this.shouldNotify(session, event)) {
      return
    }

    const config = STAGE_CONFIGS[event.stage]

    // Web 通知（浏览器推送）
    if (notificationConfig.channels.includes('push')) {
      // 触发浏览器推送
      console.log('Push notification:', event.message)
    }

    // 邮件通知
    if (notificationConfig.channels.includes('email') && session.userEmail) {
      if (
        notificationConfig.emailFrequency === 'realtime' ||
        (notificationConfig.emailFrequency === 'milestone_only' && event.isMilestone)
      ) {
        await this.sendEmailNotification(session, event, config)
      }
    }

    // 短信通知
    if (notificationConfig.channels.includes('sms') && session.userPhone) {
      if (
        notificationConfig.smsFrequency === 'milestone_only' && event.isMilestone ||
        notificationConfig.smsFrequency === 'critical_only' && (event.stage === 'completed' || event.stage === 'error')
      ) {
        await this.sendSmsNotification(session, event, config)
      }
    }

    // 微信通知
    if (notificationConfig.channels.includes('wechat')) {
      if (
        notificationConfig.wechatFrequency === 'realtime' ||
        (notificationConfig.wechatFrequency === 'milestone_only' && event.isMilestone)
      ) {
        await this.sendWechatNotification(session, event, config)
      }
    }

    session.lastNotificationAt = new Date()
  }

  /**
   * 检查是否应该发送通知
   */
  private shouldNotify(session: ProgressSession, event: ProgressEvent): boolean {
    const { notificationConfig } = session

    // 关键通知不受限制
    if (notificationConfig.criticalNotifications && (event.stage === 'completed' || event.stage === 'error')) {
      return true
    }

    // 检查静默时段
    const now = new Date()
    const hour = now.getHours()
    const { quietHoursStart, quietHoursEnd } = notificationConfig

    if (quietHoursStart !== undefined && quietHoursEnd !== undefined) {
      if (quietHoursStart > quietHoursEnd) {
        // 跨夜情况（如22:00-08:00）
        if (hour >= quietHoursStart || hour < quietHoursEnd) {
          return false
        }
      } else {
        // 不跨夜情况
        if (hour >= quietHoursStart && hour < quietHoursEnd) {
          return false
        }
      }
    }

    return true
  }

  /**
   * 发送邮件通知
   */
  private async sendEmailNotification(
    session: ProgressSession,
    event: ProgressEvent,
    config: StageConfig
  ): Promise<void> {
    const html = this.generateEmailHtml(session, event, config)
    console.log('Email notification:', {
      to: session.userEmail,
      subject: `${config.icon} ${session.projectName} - ${config.name}`,
      html
    })
    // TODO: 调用实际邮件服务
  }

  /**
   * 发送短信通知
   */
  private async sendSmsNotification(
    session: ProgressSession,
    event: ProgressEvent,
    config: StageConfig
  ): Promise<void> {
    let message: string
    if (event.stage === 'completed') {
      message = `🎉【${session.projectName}】制作完成！请登录查看您的产品。`
    } else if (event.stage === 'error') {
      message = `⚠️【${session.projectName}】遇到问题，我们正在处理。如有疑问请联系客服。`
    } else {
      message = `${config.icon}【${session.projectName}】${config.name} - ${config.description}`
    }

    console.log('SMS notification:', { to: session.userPhone, message })
    // TODO: 调用实际短信服务
  }

  /**
   * 发送微信通知
   */
  private async sendWechatNotification(
    session: ProgressSession,
    event: ProgressEvent,
    config: StageConfig
  ): Promise<void> {
    const data = {
      first: { value: `${session.projectName} 进度更新` },
      keyword1: { value: config.name },
      keyword2: { value: config.description },
      keyword3: { value: `${session.overallProgress}%` },
      remark: { value: config.encouragement }
    }

    console.log('WeChat notification:', data)
    // TODO: 调用实际微信模板消息服务
  }

  /**
   * 生成邮件HTML
   */
  private generateEmailHtml(
    session: ProgressSession,
    event: ProgressEvent,
    config: StageConfig
  ): string {
    const progressBarWidth = session.overallProgress
    const remaining = Math.max(0, session.estimatedCompletionAt.getTime() - Date.now())

    return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
</head>
<body style="margin:0;padding:0;background:#f3f4f6;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;">
  <div style="max-width:600px;margin:0 auto;padding:40px 20px;">
    <div style="background:white;border-radius:16px;overflow:hidden;box-shadow:0 4px 6px rgba(0,0,0,0.05);">
      <!-- Header -->
      <div style="background:linear-gradient(135deg,${config.color},${config.color}cc);padding:40px;text-align:center;">
        <div style="font-size:64px;margin-bottom:16px;">${config.icon}</div>
        <h1 style="margin:0;color:white;font-size:28px;font-weight:600;">${config.name}</h1>
        <p style="margin:10px 0 0;color:rgba(255,255,255,0.9);font-size:16px;">${session.projectName}</p>
      </div>

      <!-- Progress -->
      <div style="padding:32px;">
        <div style="margin-bottom:24px;">
          <div style="display:flex;justify-content:space-between;margin-bottom:8px;">
            <span style="color:#374151;font-weight:500;">整体进度</span>
            <span style="color:${config.color};font-weight:600;">${session.overallProgress}%</span>
          </div>
          <div style="height:12px;background:#e5e7eb;border-radius:6px;overflow:hidden;">
            <div style="height:100%;width:${progressBarWidth}%;background:${config.color};border-radius:6px;"></div>
          </div>
        </div>

        <p style="color:#6b7280;font-size:15px;line-height:1.6;margin:0 0 24px;">
          ${config.description}
        </p>

        ${session.currentStage !== 'completed' && session.currentStage !== 'error' ? `
        <div style="background:#f9fafb;border-radius:12px;padding:16px;margin-bottom:24px;">
          <div style="display:flex;align-items:center;">
            <span style="font-size:20px;margin-right:12px;">⏰</span>
            <div>
              <div style="color:#374151;font-weight:500;">预计剩余时间</div>
              <div style="color:#6b7280;font-size:14px;">${this.formatTime(remaining)}</div>
            </div>
          </div>
        </div>
        ` : ''}

        <div style="background:linear-gradient(135deg,${config.color}15,${config.color}05);border-radius:12px;padding:20px;text-align:center;">
          <p style="margin:0;color:#374151;font-size:16px;">
            💪 ${config.encouragement}
          </p>
        </div>
      </div>

      <!-- CTA -->
      <div style="padding:0 32px 32px;">
        <a href="https://app.thinkus.com/projects/${session.projectId}/progress"
           style="display:block;background:${config.color};color:white;text-decoration:none;padding:16px;border-radius:12px;text-align:center;font-weight:600;font-size:16px;">
          查看实时进度
        </a>
      </div>

      <!-- Footer -->
      <div style="background:#f9fafb;padding:24px;text-align:center;border-top:1px solid #e5e7eb;">
        <p style="margin:0;color:#9ca3af;font-size:13px;">
          此邮件由 Thinkus 自动发送<br>
          如需帮助，请联系 support@thinkus.com
        </p>
      </div>
    </div>
  </div>
</body>
</html>
    `.trim()
  }

  /**
   * 生成进度面板HTML
   */
  generateDashboardHtml(sessionId: string): string {
    const session = this.sessions.get(sessionId)
    if (!session) return '<p>未找到进度信息</p>'

    const config = STAGE_CONFIGS[session.currentStage]
    const stages = Object.entries(STAGE_CONFIGS)
      .filter(([key]) => STAGE_PROGRESS[key as ProgressStage] >= 0)
      .sort((a, b) => STAGE_PROGRESS[a[0] as ProgressStage] - STAGE_PROGRESS[b[0] as ProgressStage])

    const remaining = Math.max(0, session.estimatedCompletionAt.getTime() - Date.now())

    return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${session.projectName} - 制作进度</title>
  <style>
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
      background: #f3f4f6;
      min-height: 100vh;
      padding: 40px 20px;
    }
    .container { max-width: 600px; margin: 0 auto; }
    .card {
      background: white;
      border-radius: 16px;
      box-shadow: 0 4px 6px rgba(0,0,0,0.05);
      overflow: hidden;
      margin-bottom: 20px;
    }
    .header {
      background: linear-gradient(135deg, ${config.color}, ${config.color}cc);
      padding: 40px;
      text-align: center;
      color: white;
    }
    .header-icon { font-size: 72px; margin-bottom: 16px; }
    .header-title { font-size: 28px; font-weight: 700; margin-bottom: 8px; }
    .header-subtitle { opacity: 0.9; font-size: 16px; }
    .progress-section { padding: 32px; }
    .progress-header {
      display: flex;
      justify-content: space-between;
      margin-bottom: 12px;
    }
    .progress-label { color: #374151; font-weight: 500; }
    .progress-value { color: ${config.color}; font-weight: 600; font-size: 18px; }
    .progress-bar {
      height: 16px;
      background: #e5e7eb;
      border-radius: 8px;
      overflow: hidden;
    }
    .progress-fill {
      height: 100%;
      background: ${config.color};
      width: ${session.overallProgress}%;
      border-radius: 8px;
      transition: width 0.5s ease;
    }
    .time-card {
      background: #f9fafb;
      border-radius: 12px;
      padding: 20px;
      margin: 24px 0;
      display: flex;
      align-items: center;
    }
    .time-icon { font-size: 32px; margin-right: 16px; }
    .time-label { color: #6b7280; font-size: 14px; }
    .time-value { color: #374151; font-size: 20px; font-weight: 600; }
    .encouragement {
      background: linear-gradient(135deg, ${config.color}15, ${config.color}05);
      border-radius: 12px;
      padding: 20px;
      text-align: center;
      font-size: 16px;
      color: #374151;
    }
    .stages { padding: 0 32px 32px; }
    .stages-title {
      font-size: 18px;
      font-weight: 600;
      color: #374151;
      margin-bottom: 16px;
    }
    .stage-item {
      display: flex;
      align-items: center;
      padding: 12px 0;
      border-bottom: 1px solid #f3f4f6;
    }
    .stage-item:last-child { border-bottom: none; }
    .stage-icon { width: 32px; font-size: 20px; }
    .stage-name { flex: 1; color: #374151; }
    .stage-status {
      font-size: 12px;
      padding: 4px 8px;
      border-radius: 12px;
    }
    .stage-done { background: #dcfce7; color: #16a34a; }
    .stage-current { background: ${config.color}20; color: ${config.color}; }
    .stage-pending { background: #f3f4f6; color: #9ca3af; }
    .events { padding: 0 32px 32px; }
    .events-title {
      font-size: 18px;
      font-weight: 600;
      color: #374151;
      margin-bottom: 16px;
    }
    .event-item {
      display: flex;
      padding: 12px 0;
      border-left: 2px solid #e5e7eb;
      padding-left: 16px;
      margin-left: 8px;
    }
    .event-time { color: #9ca3af; font-size: 12px; width: 60px; }
    .event-message { color: #374151; font-size: 14px; }
    .viewers {
      background: #f9fafb;
      padding: 16px 32px;
      text-align: center;
      color: #6b7280;
      font-size: 13px;
      border-top: 1px solid #e5e7eb;
    }
    @keyframes pulse {
      0%, 100% { opacity: 1; }
      50% { opacity: 0.5; }
    }
    .live-dot {
      display: inline-block;
      width: 8px;
      height: 8px;
      background: #22c55e;
      border-radius: 50%;
      margin-right: 6px;
      animation: pulse 2s infinite;
    }
  </style>
</head>
<body>
  <div class="container">
    <div class="card">
      <div class="header">
        <div class="header-icon">${config.icon}</div>
        <div class="header-title">${config.name}</div>
        <div class="header-subtitle">${session.projectName}</div>
      </div>

      <div class="progress-section">
        <div class="progress-header">
          <span class="progress-label">整体进度</span>
          <span class="progress-value">${session.overallProgress}%</span>
        </div>
        <div class="progress-bar">
          <div class="progress-fill"></div>
        </div>

        ${session.currentStage !== 'completed' && session.currentStage !== 'error' ? `
        <div class="time-card">
          <div class="time-icon">⏰</div>
          <div>
            <div class="time-label">预计剩余时间</div>
            <div class="time-value" id="countdown">${this.formatTime(remaining)}</div>
          </div>
        </div>
        ` : ''}

        <div class="encouragement">
          💪 ${config.encouragement}
        </div>
      </div>

      <div class="stages">
        <div class="stages-title">📋 制作阶段</div>
        ${stages.map(([key, stageConfig]) => {
          const stageProgress = STAGE_PROGRESS[key as ProgressStage]
          let statusClass = 'stage-pending'
          let statusText = '待进行'
          if (stageProgress < session.overallProgress) {
            statusClass = 'stage-done'
            statusText = '已完成'
          } else if (key === session.currentStage) {
            statusClass = 'stage-current'
            statusText = '进行中'
          }
          return `
            <div class="stage-item">
              <div class="stage-icon">${stageConfig.icon}</div>
              <div class="stage-name">${stageConfig.name}</div>
              <div class="stage-status ${statusClass}">${statusText}</div>
            </div>
          `
        }).join('')}
      </div>

      <div class="events">
        <div class="events-title">📜 最近动态</div>
        ${session.events.slice(-5).reverse().map(event => {
          const time = new Date(event.timestamp)
          return `
            <div class="event-item">
              <div class="event-time">${time.getHours().toString().padStart(2, '0')}:${time.getMinutes().toString().padStart(2, '0')}</div>
              <div class="event-message">${event.message}</div>
            </div>
          `
        }).join('')}
      </div>

      <div class="viewers">
        <span class="live-dot"></span>
        ${session.subscriberCount} 人正在查看
      </div>
    </div>
  </div>

  <script>
    // 自动刷新页面
    setTimeout(() => location.reload(), 30000);

    // 倒计时更新
    let remaining = ${remaining};
    setInterval(() => {
      remaining -= 1000;
      if (remaining < 0) remaining = 0;
      const el = document.getElementById('countdown');
      if (el) {
        const mins = Math.floor(remaining / 60000);
        const secs = Math.floor((remaining % 60000) / 1000);
        el.textContent = mins > 0 ? mins + '分' + secs + '秒' : secs + '秒';
      }
    }, 1000);
  </script>
</body>
</html>
    `.trim()
  }

  /**
   * 获取剩余阶段
   */
  private getRemainingStages(currentStage: ProgressStage): ProgressStage[] {
    const currentProgress = STAGE_PROGRESS[currentStage]
    return (Object.keys(STAGE_PROGRESS) as ProgressStage[])
      .filter(stage => STAGE_PROGRESS[stage] > currentProgress && STAGE_PROGRESS[stage] >= 0)
  }

  /**
   * 格式化时间
   */
  private formatTime(ms: number): string {
    const seconds = Math.floor(ms / 1000)
    const minutes = Math.floor(seconds / 60)
    const hours = Math.floor(minutes / 60)

    if (hours > 0) {
      return `${hours}小时${minutes % 60}分钟`
    }
    if (minutes > 0) {
      return `${minutes}分钟`
    }
    return `${seconds}秒`
  }

  /**
   * 清理会话
   */
  cleanup(sessionId: string): void {
    this.sessions.delete(sessionId)
    this.subscribers.delete(sessionId)
  }
}

// 导出单例
export const realtimeProgressDashboard = new RealtimeProgressDashboardService()
