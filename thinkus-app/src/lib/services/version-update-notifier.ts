/**
 * 版本更新自动通知服务 (小白用户自动化交付 P0)
 *
 * 功能:
 * - 自动检测产品版本更新
 * - 人话版更新日志
 * - 多渠道通知用户
 * - 一键更新/稍后更新选择
 *
 * 设计理念:
 * - 让小白用户看得懂更新了什么
 * - 更新过程无需用户操作
 * - 更新失败自动回滚
 */

// ============================================
// 类型定义
// ============================================

export type UpdateType =
  | 'feature' // 新功能
  | 'improvement' // 优化改进
  | 'bugfix' // 问题修复
  | 'security' // 安全更新
  | 'maintenance' // 日常维护

export type UpdatePriority =
  | 'critical' // 必须更新 (安全漏洞)
  | 'recommended' // 建议更新 (新功能/重要修复)
  | 'optional' // 可选更新 (小改进)

export type NotificationChannel = 'email' | 'sms' | 'in_app' | 'wechat' | 'push'

export type UpdateStatus =
  | 'available' // 有更新可用
  | 'scheduled' // 已计划更新
  | 'updating' // 更新中
  | 'completed' // 更新完成
  | 'failed' // 更新失败
  | 'rolled_back' // 已回滚

export interface ChangelogItem {
  type: UpdateType
  title: string // 简短标题
  description: string // 人话描述
  technicalNote?: string // 技术说明 (可选)
  affectedAreas?: string[] // 影响区域
}

export interface VersionUpdate {
  id: string
  projectId: string
  currentVersion: string
  newVersion: string
  priority: UpdatePriority
  changelog: ChangelogItem[]
  releaseDate: Date
  estimatedDowntime: number // 预计停机时间(秒)
  autoUpdateAvailable: boolean
  requiredActions?: string[] // 用户需要做的事
  breakingChanges?: string[] // 不兼容变更
}

export interface UpdateRecord {
  id: string
  projectId: string
  userId: string
  updateId: string
  fromVersion: string
  toVersion: string
  status: UpdateStatus
  startedAt?: Date
  completedAt?: Date
  failedAt?: Date
  rollbackAt?: Date
  errorMessage?: string
  notificationsSent: NotificationRecord[]
}

export interface NotificationRecord {
  channel: NotificationChannel
  sentAt: Date
  status: 'sent' | 'delivered' | 'failed' | 'opened'
  messageId?: string
}

export interface UpdatePreferences {
  userId: string
  projectId: string
  autoUpdate: boolean // 自动更新
  notifyChannels: NotificationChannel[] // 通知渠道
  quietHoursStart?: number // 静默时段开始 (0-23)
  quietHoursEnd?: number // 静默时段结束
  updateWindow?: {
    // 更新窗口
    dayOfWeek: number[] // 0-6, 0=周日
    hourStart: number
    hourEnd: number
  }
  skipOptionalUpdates: boolean // 跳过可选更新
}

export interface UpdateCheckResult {
  hasUpdate: boolean
  update?: VersionUpdate
  canAutoUpdate: boolean
  recommendedAction: 'update_now' | 'schedule' | 'skip' | 'manual'
  message: string
}

// ============================================
// 更新类型配置
// ============================================

const UPDATE_TYPE_CONFIG: Record<
  UpdateType,
  {
    icon: string
    label: string
    color: string
    priority: number
  }
> = {
  security: {
    icon: '🔒',
    label: '安全更新',
    color: '#dc2626',
    priority: 1,
  },
  feature: {
    icon: '✨',
    label: '新功能',
    color: '#2563eb',
    priority: 2,
  },
  bugfix: {
    icon: '🐛',
    label: '问题修复',
    color: '#ea580c',
    priority: 3,
  },
  improvement: {
    icon: '💡',
    label: '优化改进',
    color: '#16a34a',
    priority: 4,
  },
  maintenance: {
    icon: '🔧',
    label: '日常维护',
    color: '#64748b',
    priority: 5,
  },
}

const PRIORITY_CONFIG: Record<
  UpdatePriority,
  {
    icon: string
    label: string
    description: string
    color: string
  }
> = {
  critical: {
    icon: '🚨',
    label: '重要更新',
    description: '为了您的安全，请尽快更新',
    color: '#dc2626',
  },
  recommended: {
    icon: '⭐',
    label: '推荐更新',
    description: '包含新功能或重要修复，建议更新',
    color: '#2563eb',
  },
  optional: {
    icon: '📦',
    label: '可选更新',
    description: '小幅改进，您可以选择稍后更新',
    color: '#64748b',
  },
}

// ============================================
// 人话翻译模板
// ============================================

const HUMAN_READABLE_TEMPLATES: Record<UpdateType, string[]> = {
  security: [
    '修复了一个安全隐患，让您的数据更安全',
    '加强了登录保护，防止他人盗用您的账号',
    '修复了可能泄露信息的问题',
    '更新了安全证书，确保网站访问安全',
  ],
  feature: [
    '新增了{feature}功能，让您使用更方便',
    '现在可以{action}了',
    '新增{feature}，提升您的使用体验',
    '支持{feature}，满足更多场景需求',
  ],
  bugfix: [
    '修复了{issue}的问题',
    '解决了{issue}无法正常使用的问题',
    '修复了部分用户反馈的{issue}问题',
    '修复了影响{area}的一个小问题',
  ],
  improvement: [
    '{area}加载速度提升了{percent}%',
    '优化了{area}的显示效果',
    '改进了{area}的操作体验',
    '{area}运行更流畅了',
  ],
  maintenance: [
    '更新了系统组件，确保稳定运行',
    '清理了过期数据，释放存储空间',
    '优化了后台服务性能',
    '进行了日常维护和更新',
  ],
}

// ============================================
// 辅助函数
// ============================================

function generateUpdateId(): string {
  const date = new Date()
  const dateStr = date.toISOString().slice(0, 10).replace(/-/g, '')
  const random = Math.random().toString(36).substring(2, 6).toUpperCase()
  return `UPD-${dateStr}-${random}`
}

function formatVersion(version: string): string {
  return version.startsWith('v') ? version : `v${version}`
}

function formatDuration(seconds: number): string {
  if (seconds < 60) return '几秒钟'
  if (seconds < 120) return '约1分钟'
  if (seconds < 300) return '约2-3分钟'
  if (seconds < 600) return '约5分钟'
  return `约${Math.round(seconds / 60)}分钟`
}

function formatDate(date: Date): string {
  return new Intl.DateTimeFormat('zh-CN', {
    month: 'long',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  }).format(date)
}

function isInQuietHours(preferences: UpdatePreferences): boolean {
  if (!preferences.quietHoursStart || !preferences.quietHoursEnd) return false
  const now = new Date().getHours()
  const start = preferences.quietHoursStart
  const end = preferences.quietHoursEnd

  if (start < end) {
    return now >= start && now < end
  } else {
    // 跨午夜
    return now >= start || now < end
  }
}

function isInUpdateWindow(preferences: UpdatePreferences): boolean {
  if (!preferences.updateWindow) return true

  const now = new Date()
  const dayOfWeek = now.getDay()
  const hour = now.getHours()

  const { dayOfWeek: allowedDays, hourStart, hourEnd } = preferences.updateWindow

  if (!allowedDays.includes(dayOfWeek)) return false
  if (hour < hourStart || hour >= hourEnd) return false

  return true
}

// ============================================
// 版本更新通知服务
// ============================================

export class VersionUpdateNotifierService {
  private updates: Map<string, VersionUpdate> = new Map()
  private records: Map<string, UpdateRecord> = new Map()
  private preferences: Map<string, UpdatePreferences> = new Map() // key: `${userId}-${projectId}`

  /**
   * 检查更新
   */
  checkForUpdates(
    projectId: string,
    currentVersion: string,
    availableUpdates: VersionUpdate[]
  ): UpdateCheckResult {
    // 找到适用的更新
    const update = availableUpdates.find(
      (u) => u.projectId === projectId && this.isNewerVersion(currentVersion, u.newVersion)
    )

    if (!update) {
      return {
        hasUpdate: false,
        canAutoUpdate: false,
        recommendedAction: 'skip',
        message: '您的产品已是最新版本',
      }
    }

    // 存储更新信息
    this.updates.set(update.id, update)

    // 判断推荐操作
    let recommendedAction: 'update_now' | 'schedule' | 'skip' | 'manual' = 'schedule'
    let message = ''

    if (update.priority === 'critical') {
      recommendedAction = 'update_now'
      message = '发现重要安全更新，建议立即更新'
    } else if (update.breakingChanges && update.breakingChanges.length > 0) {
      recommendedAction = 'manual'
      message = '此更新包含不兼容变更，需要手动确认'
    } else if (update.autoUpdateAvailable) {
      recommendedAction = update.priority === 'recommended' ? 'update_now' : 'schedule'
      message =
        update.priority === 'recommended' ? '发现新版本，包含新功能和改进，建议更新' : '发现可选更新，您可以选择稍后更新'
    } else {
      recommendedAction = 'manual'
      message = '发现新版本，需要手动更新'
    }

    return {
      hasUpdate: true,
      update,
      canAutoUpdate: update.autoUpdateAvailable,
      recommendedAction,
      message,
    }
  }

  /**
   * 比较版本号
   */
  private isNewerVersion(current: string, newVer: string): boolean {
    const parse = (v: string) =>
      v
        .replace(/^v/, '')
        .split('.')
        .map((n) => parseInt(n, 10) || 0)
    const c = parse(current)
    const n = parse(newVer)

    for (let i = 0; i < Math.max(c.length, n.length); i++) {
      const cv = c[i] || 0
      const nv = n[i] || 0
      if (nv > cv) return true
      if (nv < cv) return false
    }
    return false
  }

  /**
   * 生成人话版更新日志
   */
  generateHumanReadableChangelog(update: VersionUpdate): string {
    const lines: string[] = []
    const priorityInfo = PRIORITY_CONFIG[update.priority]

    lines.push(`${priorityInfo.icon} ${formatVersion(update.newVersion)} 更新`)
    lines.push('')
    lines.push(priorityInfo.description)
    lines.push('')

    // 按类型分组
    const groupedChanges = new Map<UpdateType, ChangelogItem[]>()
    for (const item of update.changelog) {
      if (!groupedChanges.has(item.type)) {
        groupedChanges.set(item.type, [])
      }
      groupedChanges.get(item.type)!.push(item)
    }

    // 按优先级排序输出
    const sortedTypes = Array.from(groupedChanges.keys()).sort(
      (a, b) => UPDATE_TYPE_CONFIG[a].priority - UPDATE_TYPE_CONFIG[b].priority
    )

    for (const type of sortedTypes) {
      const config = UPDATE_TYPE_CONFIG[type]
      const items = groupedChanges.get(type)!

      lines.push(`${config.icon} ${config.label}`)
      for (const item of items) {
        lines.push(`  • ${item.description}`)
      }
      lines.push('')
    }

    // 更新信息
    if (update.estimatedDowntime > 0) {
      lines.push(`⏱️ 预计更新时间: ${formatDuration(update.estimatedDowntime)}`)
    } else {
      lines.push(`⏱️ 无需停机，后台自动完成`)
    }

    // 不兼容变更提醒
    if (update.breakingChanges && update.breakingChanges.length > 0) {
      lines.push('')
      lines.push('⚠️ 注意事项:')
      for (const change of update.breakingChanges) {
        lines.push(`  • ${change}`)
      }
    }

    // 需要用户操作
    if (update.requiredActions && update.requiredActions.length > 0) {
      lines.push('')
      lines.push('📋 更新后请注意:')
      for (const action of update.requiredActions) {
        lines.push(`  • ${action}`)
      }
    }

    return lines.join('\n')
  }

  /**
   * 发送更新通知
   */
  async sendUpdateNotification(
    userId: string,
    projectId: string,
    update: VersionUpdate,
    channels?: NotificationChannel[]
  ): Promise<NotificationRecord[]> {
    const prefs = this.getPreferences(userId, projectId)
    const targetChannels = channels || prefs.notifyChannels || ['email', 'in_app']

    // 检查静默时段
    if (isInQuietHours(prefs) && update.priority !== 'critical') {
      console.log('在静默时段，非紧急更新延后通知')
      return []
    }

    const notifications: NotificationRecord[] = []
    const changelog = this.generateHumanReadableChangelog(update)
    const priorityInfo = PRIORITY_CONFIG[update.priority]

    for (const channel of targetChannels) {
      try {
        const record = await this.sendToChannel(channel, {
          userId,
          projectId,
          subject: `${priorityInfo.icon} 您的产品有新版本可用`,
          title: `${formatVersion(update.newVersion)} 更新`,
          body: changelog,
          priority: update.priority,
          updateId: update.id,
          actionUrl: `/projects/${projectId}/updates/${update.id}`,
        })
        notifications.push(record)
      } catch (error) {
        notifications.push({
          channel,
          sentAt: new Date(),
          status: 'failed',
        })
      }
    }

    return notifications
  }

  /**
   * 发送到具体渠道
   */
  private async sendToChannel(
    channel: NotificationChannel,
    data: {
      userId: string
      projectId: string
      subject: string
      title: string
      body: string
      priority: UpdatePriority
      updateId: string
      actionUrl: string
    }
  ): Promise<NotificationRecord> {
    // 这里模拟发送，实际需要调用对应的通知服务
    console.log(`发送 ${channel} 通知:`, data.title)

    // 模拟发送成功
    return {
      channel,
      sentAt: new Date(),
      status: 'sent',
      messageId: `msg_${Date.now()}_${channel}`,
    }
  }

  /**
   * 执行更新
   */
  async executeUpdate(
    userId: string,
    projectId: string,
    updateId: string,
    options?: {
      force?: boolean
      scheduleTime?: Date
    }
  ): Promise<UpdateRecord> {
    const update = this.updates.get(updateId)
    if (!update) {
      throw new Error('更新不存在')
    }

    const prefs = this.getPreferences(userId, projectId)

    // 检查是否在更新窗口内
    if (!options?.force && !isInUpdateWindow(prefs)) {
      throw new Error('当前不在允许的更新时间窗口内')
    }

    const record: UpdateRecord = {
      id: generateUpdateId(),
      projectId,
      userId,
      updateId,
      fromVersion: update.currentVersion,
      toVersion: update.newVersion,
      status: 'updating',
      startedAt: new Date(),
      notificationsSent: [],
    }

    this.records.set(record.id, record)

    // 通知用户开始更新
    await this.sendToChannel('in_app', {
      userId,
      projectId,
      subject: '更新开始',
      title: '正在更新您的产品...',
      body: `正在从 ${formatVersion(update.currentVersion)} 更新到 ${formatVersion(update.newVersion)}，请稍候...`,
      priority: 'optional',
      updateId,
      actionUrl: `/projects/${projectId}/updates/${record.id}`,
    })

    try {
      // 模拟更新过程
      await this.performUpdate(projectId, update)

      record.status = 'completed'
      record.completedAt = new Date()

      // 通知更新完成
      await this.sendUpdateCompletedNotification(userId, projectId, update, record)
    } catch (error) {
      record.status = 'failed'
      record.failedAt = new Date()
      record.errorMessage = error instanceof Error ? error.message : '更新失败'

      // 尝试回滚
      try {
        await this.rollbackUpdate(projectId, update)
        record.status = 'rolled_back'
        record.rollbackAt = new Date()
      } catch {
        console.error('回滚失败')
      }

      // 通知更新失败
      await this.sendUpdateFailedNotification(userId, projectId, update, record)
    }

    return record
  }

  /**
   * 执行实际更新 (模拟)
   */
  private async performUpdate(_projectId: string, update: VersionUpdate): Promise<void> {
    // 模拟更新过程
    await new Promise((resolve) => setTimeout(resolve, update.estimatedDowntime * 100))

    // 这里应该调用实际的部署服务
    console.log(`更新 ${_projectId} 到 ${update.newVersion}`)
  }

  /**
   * 回滚更新 (模拟)
   */
  private async rollbackUpdate(_projectId: string, update: VersionUpdate): Promise<void> {
    console.log(`回滚 ${_projectId} 到 ${update.currentVersion}`)
    await new Promise((resolve) => setTimeout(resolve, 1000))
  }

  /**
   * 发送更新完成通知
   */
  private async sendUpdateCompletedNotification(
    userId: string,
    projectId: string,
    update: VersionUpdate,
    record: UpdateRecord
  ): Promise<void> {
    const duration = record.completedAt!.getTime() - record.startedAt!.getTime()
    const durationStr = formatDuration(Math.round(duration / 1000))

    await this.sendToChannel('in_app', {
      userId,
      projectId,
      subject: '更新完成',
      title: '✅ 更新成功!',
      body: `您的产品已成功更新到 ${formatVersion(update.newVersion)}，用时${durationStr}。`,
      priority: 'optional',
      updateId: update.id,
      actionUrl: `/projects/${projectId}`,
    })

    await this.sendToChannel('email', {
      userId,
      projectId,
      subject: `✅ 您的产品已更新到 ${formatVersion(update.newVersion)}`,
      title: '更新完成通知',
      body: this.generateUpdateCompletedEmail(update, record),
      priority: 'optional',
      updateId: update.id,
      actionUrl: `/projects/${projectId}`,
    })
  }

  /**
   * 发送更新失败通知
   */
  private async sendUpdateFailedNotification(
    userId: string,
    projectId: string,
    update: VersionUpdate,
    record: UpdateRecord
  ): Promise<void> {
    const isRolledBack = record.status === 'rolled_back'

    await this.sendToChannel('in_app', {
      userId,
      projectId,
      subject: '更新失败',
      title: isRolledBack ? '⚠️ 更新失败，已自动恢复' : '❌ 更新失败',
      body: isRolledBack
        ? `更新过程中遇到问题，已自动恢复到之前的版本。您的产品可以正常使用。`
        : `更新失败: ${record.errorMessage}。请联系客服。`,
      priority: 'recommended',
      updateId: update.id,
      actionUrl: `/projects/${projectId}/updates/${record.id}`,
    })
  }

  /**
   * 生成更新完成邮件
   */
  private generateUpdateCompletedEmail(update: VersionUpdate, record: UpdateRecord): string {
    const changelog = this.generateHumanReadableChangelog(update)
    const duration = record.completedAt!.getTime() - record.startedAt!.getTime()

    return `
您好！

您的产品已成功更新。

📦 更新详情:
- 原版本: ${formatVersion(record.fromVersion)}
- 新版本: ${formatVersion(record.toVersion)}
- 更新时间: ${formatDate(record.completedAt!)}
- 耗时: ${formatDuration(Math.round(duration / 1000))}

${changelog}

如有任何问题，请随时联系我们。

Thinkus 团队
`
  }

  /**
   * 设置用户偏好
   */
  setPreferences(preferences: UpdatePreferences): void {
    const key = `${preferences.userId}-${preferences.projectId}`
    this.preferences.set(key, preferences)
  }

  /**
   * 获取用户偏好
   */
  getPreferences(userId: string, projectId: string): UpdatePreferences {
    const key = `${userId}-${projectId}`
    return (
      this.preferences.get(key) || {
        userId,
        projectId,
        autoUpdate: false,
        notifyChannels: ['email', 'in_app'],
        skipOptionalUpdates: false,
      }
    )
  }

  /**
   * 生成更新通知页面 (给小白用户看)
   */
  generateUpdateNotificationPage(update: VersionUpdate, projectName: string): string {
    const priorityInfo = PRIORITY_CONFIG[update.priority]
    const changelog = this.generateHumanReadableChangelog(update)

    return `
<!DOCTYPE html>
<html lang="zh-CN">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>新版本可用 - ${projectName}</title>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body {
      font-family: 'PingFang SC', 'Microsoft YaHei', sans-serif;
      background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
      min-height: 100vh;
      display: flex;
      align-items: center;
      justify-content: center;
      padding: 20px;
    }
    .card {
      background: #fff;
      border-radius: 20px;
      padding: 40px;
      max-width: 500px;
      width: 100%;
      box-shadow: 0 20px 60px rgba(0,0,0,0.2);
    }
    .header {
      text-align: center;
      margin-bottom: 32px;
    }
    .icon { font-size: 64px; margin-bottom: 16px; }
    h1 { font-size: 24px; color: #333; margin-bottom: 8px; }
    .subtitle { color: #666; font-size: 14px; }
    .version-badge {
      display: inline-block;
      background: ${priorityInfo.color};
      color: #fff;
      padding: 4px 12px;
      border-radius: 20px;
      font-size: 14px;
      margin-top: 12px;
    }
    .changelog {
      background: #f8fafc;
      border-radius: 12px;
      padding: 20px;
      margin: 24px 0;
      font-size: 14px;
      line-height: 1.8;
      white-space: pre-wrap;
      max-height: 300px;
      overflow-y: auto;
    }
    .info-row {
      display: flex;
      justify-content: space-between;
      padding: 12px 0;
      border-bottom: 1px solid #eee;
      font-size: 14px;
    }
    .info-label { color: #666; }
    .info-value { font-weight: 500; }
    .actions {
      display: flex;
      gap: 12px;
      margin-top: 24px;
    }
    .btn {
      flex: 1;
      padding: 14px;
      border: none;
      border-radius: 10px;
      font-size: 16px;
      font-weight: bold;
      cursor: pointer;
      transition: transform 0.2s, box-shadow 0.2s;
    }
    .btn:hover {
      transform: translateY(-2px);
      box-shadow: 0 4px 12px rgba(0,0,0,0.15);
    }
    .btn-primary {
      background: linear-gradient(135deg, #667eea, #764ba2);
      color: #fff;
    }
    .btn-secondary {
      background: #f1f5f9;
      color: #333;
    }
    .footer {
      text-align: center;
      margin-top: 24px;
      font-size: 12px;
      color: #999;
    }
  </style>
</head>
<body>
  <div class="card">
    <div class="header">
      <div class="icon">${priorityInfo.icon}</div>
      <h1>有新版本啦!</h1>
      <p class="subtitle">${projectName} ${formatVersion(update.newVersion)}</p>
      <span class="version-badge">${priorityInfo.label}</span>
    </div>

    <div class="changelog">${changelog}</div>

    <div class="info-row">
      <span class="info-label">当前版本</span>
      <span class="info-value">${formatVersion(update.currentVersion)}</span>
    </div>
    <div class="info-row">
      <span class="info-label">新版本</span>
      <span class="info-value" style="color: ${priorityInfo.color};">${formatVersion(update.newVersion)}</span>
    </div>
    <div class="info-row">
      <span class="info-label">预计时间</span>
      <span class="info-value">${update.estimatedDowntime > 0 ? formatDuration(update.estimatedDowntime) : '无需停机'}</span>
    </div>

    <div class="actions">
      <button class="btn btn-secondary" onclick="later()">稍后更新</button>
      <button class="btn btn-primary" onclick="updateNow()">立即更新</button>
    </div>

    <div class="footer">
      <p>更新期间您的产品可能短暂无法访问</p>
      <p>如有问题请联系 support@thinkus.app</p>
    </div>
  </div>

  <script>
    function updateNow() {
      // 调用更新 API
      if (confirm('确定要立即更新吗？更新期间产品可能短暂无法访问。')) {
        alert('更新已开始，请稍候...');
        // fetch('/api/updates/${update.id}/execute', { method: 'POST' });
      }
    }

    function later() {
      // 稍后提醒
      alert('好的，我们会在明天再次提醒您。');
      window.close();
    }
  </script>
</body>
</html>
`
  }

  /**
   * 获取更新记录
   */
  getUpdateRecord(recordId: string): UpdateRecord | null {
    return this.records.get(recordId) || null
  }

  /**
   * 获取项目的更新历史
   */
  getProjectUpdateHistory(projectId: string): UpdateRecord[] {
    return Array.from(this.records.values())
      .filter((r) => r.projectId === projectId)
      .sort((a, b) => (b.startedAt?.getTime() || 0) - (a.startedAt?.getTime() || 0))
  }

  /**
   * 生成更新摘要
   */
  generateUpdateSummary(projectId: string): string {
    const records = this.getProjectUpdateHistory(projectId)
    const completed = records.filter((r) => r.status === 'completed')
    const failed = records.filter((r) => r.status === 'failed' || r.status === 'rolled_back')

    if (records.length === 0) {
      return '暂无更新记录'
    }

    const latest = records[0]
    const latestStatus = {
      updating: '⏳ 更新中',
      completed: '✅ 已完成',
      failed: '❌ 失败',
      rolled_back: '⚠️ 已回滚',
      available: '📦 待更新',
      scheduled: '📅 已计划',
    }[latest.status]

    return `
📊 更新统计
- 总更新次数: ${records.length}
- 成功: ${completed.length}
- 失败/回滚: ${failed.length}

📦 最近更新
- 版本: ${formatVersion(latest.toVersion)}
- 状态: ${latestStatus}
- 时间: ${latest.completedAt ? formatDate(latest.completedAt) : latest.startedAt ? formatDate(latest.startedAt) : '-'}
`
  }
}

// ============================================
// 导出单例
// ============================================

export const versionUpdateNotifier = new VersionUpdateNotifierService()

export default versionUpdateNotifier
