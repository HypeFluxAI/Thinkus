/**
 * 里程碑追踪服务
 *
 * 功能：
 * - 把技术进度转换成用户能理解的里程碑
 * - "编码40%" → "核心功能已完成"
 * - 让用户知道"还剩什么"而不是"做了什么"
 *
 * 核心理念：
 * - 用户不关心代码写了多少行
 * - 用户关心"我的产品什么时候能用"
 * - 每完成一个里程碑都让用户感到进展
 */

// ============================================
// 类型定义
// ============================================

/** 里程碑状态 */
export type MilestoneStatus =
  | 'not_started'     // 未开始
  | 'in_progress'     // 进行中
  | 'completed'       // 已完成
  | 'delayed'         // 延迟
  | 'blocked'         // 受阻

/** 里程碑 */
export interface Milestone {
  id: string
  order: number

  // 显示信息
  title: string              // 人话标题，如"核心功能开发"
  description: string        // 描述
  icon: string               // 图标

  // 状态
  status: MilestoneStatus
  progress: number           // 0-100

  // 时间
  estimatedDays: number      // 预计天数
  startedAt?: Date
  completedAt?: Date
  estimatedCompletionAt?: Date

  // 子任务（可选，用于展开详情）
  subtasks?: {
    id: string
    title: string
    completed: boolean
  }[]

  // 人话状态
  humanStatus: string        // 如"进行中，预计明天完成"
}

/** 里程碑追踪会话 */
export interface MilestoneSession {
  projectId: string
  projectName: string

  // 里程碑列表
  milestones: Milestone[]
  currentMilestoneIndex: number

  // 总体进度
  overallProgress: number    // 0-100
  estimatedTotalDays: number
  actualDays: number
  remainingDays: number

  // 状态
  status: 'on_track' | 'ahead' | 'delayed' | 'at_risk'
  statusText: string         // 人话状态

  // 下一步
  nextAction: string         // 下一步是什么
  nextActionDate?: Date      // 预计什么时候

  // 更新时间
  lastUpdatedAt: Date
}

/** 进度更新 */
export interface ProgressUpdate {
  milestoneId: string
  type: 'started' | 'progress' | 'completed' | 'delayed' | 'blocked'
  progress?: number
  message?: string
  details?: Record<string, any>
}

// ============================================
// 默认里程碑模板
// ============================================

const DEFAULT_MILESTONES: Omit<Milestone, 'id' | 'order' | 'status' | 'progress' | 'humanStatus'>[] = [
  {
    title: '项目启动',
    description: '确认需求，准备开发环境',
    icon: '🚀',
    estimatedDays: 1
  },
  {
    title: '基础框架搭建',
    description: '搭建项目结构，配置数据库',
    icon: '🏗️',
    estimatedDays: 1
  },
  {
    title: '核心功能开发',
    description: '开发产品的主要功能',
    icon: '⚙️',
    estimatedDays: 3,
    subtasks: [
      { id: 'auth', title: '用户登录注册', completed: false },
      { id: 'main', title: '主要业务功能', completed: false },
      { id: 'admin', title: '管理后台', completed: false }
    ]
  },
  {
    title: '界面美化',
    description: '优化用户界面，提升体验',
    icon: '🎨',
    estimatedDays: 2
  },
  {
    title: '测试验证',
    description: '全面测试，确保质量',
    icon: '✅',
    estimatedDays: 1
  },
  {
    title: '部署上线',
    description: '发布到线上，配置域名',
    icon: '🌐',
    estimatedDays: 1
  },
  {
    title: '交付准备',
    description: '准备交付材料，等待验收',
    icon: '📦',
    estimatedDays: 1
  }
]

// ============================================
// 状态文案配置
// ============================================

const STATUS_TEXT: Record<MilestoneStatus, string> = {
  not_started: '等待开始',
  in_progress: '进行中',
  completed: '已完成',
  delayed: '稍有延迟',
  blocked: '遇到问题'
}

const OVERALL_STATUS_TEXT: Record<MilestoneSession['status'], {
  text: string
  icon: string
  color: string
}> = {
  on_track: { text: '一切顺利', icon: '✅', color: '#10B981' },
  ahead: { text: '进度超前', icon: '🚀', color: '#3B82F6' },
  delayed: { text: '稍有延迟', icon: '⏰', color: '#F59E0B' },
  at_risk: { text: '需要关注', icon: '⚠️', color: '#EF4444' }
}

// ============================================
// 服务实现
// ============================================

export class MilestoneTrackerService {

  /**
   * 创建里程碑追踪会话
   */
  async createSession(params: {
    projectId: string
    projectName: string
    productType?: string
    customMilestones?: Omit<Milestone, 'id' | 'order' | 'status' | 'progress' | 'humanStatus'>[]
  }): Promise<MilestoneSession> {
    const { projectId, projectName, customMilestones } = params

    // 使用自定义里程碑或默认里程碑
    const templates = customMilestones || DEFAULT_MILESTONES

    // 生成里程碑
    const milestones: Milestone[] = templates.map((template, index) => ({
      ...template,
      id: `milestone_${index}`,
      order: index + 1,
      status: index === 0 ? 'in_progress' : 'not_started',
      progress: 0,
      humanStatus: index === 0 ? '刚刚开始' : STATUS_TEXT.not_started
    }))

    // 计算总预计天数
    const estimatedTotalDays = milestones.reduce((sum, m) => sum + m.estimatedDays, 0)

    return {
      projectId,
      projectName,
      milestones,
      currentMilestoneIndex: 0,
      overallProgress: 0,
      estimatedTotalDays,
      actualDays: 0,
      remainingDays: estimatedTotalDays,
      status: 'on_track',
      statusText: '项目刚刚启动，一切顺利',
      nextAction: milestones[0].title,
      nextActionDate: new Date(Date.now() + milestones[0].estimatedDays * 24 * 60 * 60 * 1000),
      lastUpdatedAt: new Date()
    }
  }

  /**
   * 更新进度
   */
  async updateProgress(params: {
    session: MilestoneSession
    update: ProgressUpdate
  }): Promise<{
    session: MilestoneSession
    notification?: {
      type: 'progress' | 'milestone_complete' | 'delay' | 'all_complete'
      message: string
      icon: string
    }
  }> {
    const { session, update } = params

    // 找到目标里程碑
    const milestoneIndex = session.milestones.findIndex(m => m.id === update.milestoneId)
    if (milestoneIndex === -1) {
      return { session }
    }

    const milestone = session.milestones[milestoneIndex]
    let notification: any

    // 更新里程碑状态
    switch (update.type) {
      case 'started':
        milestone.status = 'in_progress'
        milestone.startedAt = new Date()
        milestone.progress = 10
        milestone.humanStatus = '刚刚开始'
        break

      case 'progress':
        milestone.progress = update.progress || milestone.progress
        milestone.humanStatus = this.getProgressText(milestone.progress)
        break

      case 'completed':
        milestone.status = 'completed'
        milestone.progress = 100
        milestone.completedAt = new Date()
        milestone.humanStatus = '已完成 ✓'

        // 开始下一个里程碑
        if (milestoneIndex + 1 < session.milestones.length) {
          const next = session.milestones[milestoneIndex + 1]
          next.status = 'in_progress'
          next.startedAt = new Date()
          next.progress = 5
          next.humanStatus = '刚刚开始'
          session.currentMilestoneIndex = milestoneIndex + 1
          session.nextAction = next.title
        }

        notification = {
          type: milestoneIndex + 1 >= session.milestones.length ? 'all_complete' : 'milestone_complete',
          message: `${milestone.title} 已完成！`,
          icon: '🎉'
        }
        break

      case 'delayed':
        milestone.status = 'delayed'
        milestone.humanStatus = '稍有延迟，我们正在加紧'
        session.status = 'delayed'
        notification = {
          type: 'delay',
          message: `${milestone.title} 遇到一点延迟，但我们正在全力推进`,
          icon: '⏰'
        }
        break

      case 'blocked':
        milestone.status = 'blocked'
        milestone.humanStatus = '遇到问题，正在解决'
        session.status = 'at_risk'
        notification = {
          type: 'delay',
          message: `${milestone.title} 遇到了一些问题，我们正在处理`,
          icon: '🔧'
        }
        break
    }

    // 重新计算总体进度
    session.overallProgress = this.calculateOverallProgress(session.milestones)
    session.statusText = this.getOverallStatusText(session)
    session.lastUpdatedAt = new Date()

    // 计算剩余天数
    const completedDays = session.milestones
      .filter(m => m.status === 'completed')
      .reduce((sum, m) => sum + m.estimatedDays, 0)
    session.remainingDays = session.estimatedTotalDays - completedDays

    return { session, notification }
  }

  /**
   * 获取用户友好的进度摘要
   */
  getProgressSummary(session: MilestoneSession): {
    headline: string
    progress: number
    icon: string
    color: string
    details: string[]
    nextStep: string
    estimatedCompletion: string
  } {
    const statusInfo = OVERALL_STATUS_TEXT[session.status]
    const currentMilestone = session.milestones[session.currentMilestoneIndex]

    const completedCount = session.milestones.filter(m => m.status === 'completed').length

    const details: string[] = []
    details.push(`已完成 ${completedCount}/${session.milestones.length} 个里程碑`)

    if (currentMilestone) {
      details.push(`当前：${currentMilestone.title}（${currentMilestone.progress}%）`)
    }

    if (session.remainingDays > 0) {
      details.push(`预计还需 ${session.remainingDays} 天`)
    }

    return {
      headline: statusInfo.text,
      progress: session.overallProgress,
      icon: statusInfo.icon,
      color: statusInfo.color,
      details,
      nextStep: session.nextAction,
      estimatedCompletion: session.nextActionDate
        ? this.formatDate(session.nextActionDate)
        : '即将完成'
    }
  }

  /**
   * 生成进度页面HTML
   */
  generateProgressPageHtml(session: MilestoneSession): string {
    const statusInfo = OVERALL_STATUS_TEXT[session.status]

    return `<!DOCTYPE html>
<html lang="zh-CN">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <meta http-equiv="refresh" content="60">
  <title>项目进度 - ${session.projectName}</title>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
      background: #F9FAFB;
      min-height: 100vh;
      padding: 20px;
    }
    .container { max-width: 600px; margin: 0 auto; }

    /* 头部状态卡片 */
    .status-card {
      background: white;
      border-radius: 20px;
      padding: 32px;
      margin-bottom: 24px;
      box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1);
      text-align: center;
    }
    .status-icon { font-size: 48px; margin-bottom: 16px; }
    .status-title {
      font-size: 24px;
      font-weight: 700;
      color: ${statusInfo.color};
      margin-bottom: 8px;
    }
    .project-name {
      font-size: 16px;
      color: #6B7280;
      margin-bottom: 24px;
    }

    /* 进度条 */
    .progress-container { margin-bottom: 24px; }
    .progress-bar {
      background: #E5E7EB;
      height: 12px;
      border-radius: 6px;
      overflow: hidden;
      margin-bottom: 8px;
    }
    .progress-fill {
      background: linear-gradient(90deg, ${statusInfo.color}, ${statusInfo.color}dd);
      height: 100%;
      border-radius: 6px;
      transition: width 0.5s ease;
    }
    .progress-text {
      display: flex;
      justify-content: space-between;
      font-size: 14px;
      color: #6B7280;
    }

    /* 下一步 */
    .next-step {
      background: #F0FDF4;
      border-radius: 12px;
      padding: 16px;
      text-align: left;
    }
    .next-step-label {
      font-size: 12px;
      color: #059669;
      margin-bottom: 4px;
    }
    .next-step-title {
      font-size: 16px;
      font-weight: 600;
      color: #166534;
    }

    /* 里程碑列表 */
    .milestones {
      background: white;
      border-radius: 20px;
      padding: 24px;
      box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1);
    }
    .milestones-title {
      font-size: 16px;
      font-weight: 600;
      color: #374151;
      margin-bottom: 20px;
    }

    .milestone {
      display: flex;
      gap: 16px;
      padding: 16px 0;
      border-bottom: 1px solid #F3F4F6;
      position: relative;
    }
    .milestone:last-child { border-bottom: none; }

    /* 时间线 */
    .milestone-line {
      position: absolute;
      left: 19px;
      top: 48px;
      bottom: 0;
      width: 2px;
      background: #E5E7EB;
    }
    .milestone:last-child .milestone-line { display: none; }
    .milestone.completed .milestone-line { background: #10B981; }

    .milestone-icon {
      width: 40px;
      height: 40px;
      border-radius: 50%;
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 20px;
      flex-shrink: 0;
      z-index: 1;
    }
    .milestone.completed .milestone-icon {
      background: #ECFDF5;
      border: 2px solid #10B981;
    }
    .milestone.in_progress .milestone-icon {
      background: #EFF6FF;
      border: 2px solid #3B82F6;
      animation: pulse 2s infinite;
    }
    @keyframes pulse {
      0%, 100% { box-shadow: 0 0 0 0 rgba(59, 130, 246, 0.4); }
      50% { box-shadow: 0 0 0 8px rgba(59, 130, 246, 0); }
    }
    .milestone.not_started .milestone-icon {
      background: #F9FAFB;
      border: 2px solid #E5E7EB;
    }
    .milestone.delayed .milestone-icon {
      background: #FFFBEB;
      border: 2px solid #F59E0B;
    }

    .milestone-content { flex: 1; }
    .milestone-header {
      display: flex;
      justify-content: space-between;
      align-items: flex-start;
      margin-bottom: 4px;
    }
    .milestone-title {
      font-size: 16px;
      font-weight: 600;
      color: #1F2937;
    }
    .milestone.completed .milestone-title { color: #059669; }
    .milestone.not_started .milestone-title { color: #9CA3AF; }

    .milestone-status {
      font-size: 12px;
      padding: 4px 8px;
      border-radius: 4px;
    }
    .milestone.completed .milestone-status {
      background: #ECFDF5;
      color: #059669;
    }
    .milestone.in_progress .milestone-status {
      background: #EFF6FF;
      color: #3B82F6;
    }
    .milestone.not_started .milestone-status {
      background: #F3F4F6;
      color: #9CA3AF;
    }
    .milestone.delayed .milestone-status {
      background: #FFFBEB;
      color: #D97706;
    }

    .milestone-desc {
      font-size: 14px;
      color: #6B7280;
    }

    /* 进度条（里程碑内） */
    .milestone-progress {
      margin-top: 12px;
      background: #E5E7EB;
      height: 6px;
      border-radius: 3px;
      overflow: hidden;
    }
    .milestone-progress-fill {
      height: 100%;
      border-radius: 3px;
      transition: width 0.3s;
    }
    .milestone.completed .milestone-progress-fill { background: #10B981; }
    .milestone.in_progress .milestone-progress-fill { background: #3B82F6; }

    /* 页脚 */
    .footer {
      text-align: center;
      padding: 24px;
      color: #9CA3AF;
      font-size: 14px;
    }
  </style>
</head>
<body>
  <div class="container">
    <!-- 状态卡片 -->
    <div class="status-card">
      <div class="status-icon">${statusInfo.icon}</div>
      <h1 class="status-title">${statusInfo.text}</h1>
      <p class="project-name">${session.projectName}</p>

      <div class="progress-container">
        <div class="progress-bar">
          <div class="progress-fill" style="width: ${session.overallProgress}%"></div>
        </div>
        <div class="progress-text">
          <span>总进度 ${session.overallProgress}%</span>
          <span>预计还需 ${session.remainingDays} 天</span>
        </div>
      </div>

      <div class="next-step">
        <div class="next-step-label">正在进行</div>
        <div class="next-step-title">${session.nextAction}</div>
      </div>
    </div>

    <!-- 里程碑列表 -->
    <div class="milestones">
      <div class="milestones-title">开发进度</div>

      ${session.milestones.map(milestone => `
        <div class="milestone ${milestone.status}">
          <div class="milestone-line"></div>
          <div class="milestone-icon">${milestone.icon}</div>
          <div class="milestone-content">
            <div class="milestone-header">
              <div class="milestone-title">${milestone.title}</div>
              <div class="milestone-status">${milestone.humanStatus}</div>
            </div>
            <div class="milestone-desc">${milestone.description}</div>
            ${milestone.status === 'in_progress' ? `
              <div class="milestone-progress">
                <div class="milestone-progress-fill" style="width: ${milestone.progress}%"></div>
              </div>
            ` : ''}
          </div>
        </div>
      `).join('')}
    </div>

    <div class="footer">
      页面每分钟自动刷新<br>
      最后更新：${session.lastUpdatedAt.toLocaleString('zh-CN')}
    </div>
  </div>
</body>
</html>`
  }

  // ============================================
  // 私有方法
  // ============================================

  private calculateOverallProgress(milestones: Milestone[]): number {
    const weights = milestones.map(m => m.estimatedDays)
    const totalWeight = weights.reduce((sum, w) => sum + w, 0)

    let weightedProgress = 0
    for (let i = 0; i < milestones.length; i++) {
      const milestone = milestones[i]
      const weight = weights[i] / totalWeight
      weightedProgress += milestone.progress * weight
    }

    return Math.round(weightedProgress)
  }

  private getProgressText(progress: number): string {
    if (progress < 20) return '刚刚开始'
    if (progress < 40) return '正在推进'
    if (progress < 60) return '进展顺利'
    if (progress < 80) return '即将完成'
    return '收尾阶段'
  }

  private getOverallStatusText(session: MilestoneSession): string {
    const completed = session.milestones.filter(m => m.status === 'completed').length
    const total = session.milestones.length
    const current = session.milestones[session.currentMilestoneIndex]

    if (completed === total) {
      return '全部完成！准备交付'
    }

    if (session.status === 'ahead') {
      return `进度超前，${current?.title || ''}进行中`
    }

    if (session.status === 'delayed') {
      return `稍有延迟，正在加紧${current?.title || ''}`
    }

    if (session.status === 'at_risk') {
      return `${current?.title || ''}遇到问题，正在解决`
    }

    return `一切顺利，${current?.title || ''}进行中`
  }

  private formatDate(date: Date): string {
    const now = new Date()
    const diff = date.getTime() - now.getTime()
    const days = Math.ceil(diff / (1000 * 60 * 60 * 24))

    if (days === 0) return '今天'
    if (days === 1) return '明天'
    if (days < 7) return `${days}天后`
    return date.toLocaleDateString('zh-CN', { month: 'numeric', day: 'numeric' })
  }
}

// ============================================
// 导出单例
// ============================================

export const milestoneTracker = new MilestoneTrackerService()
