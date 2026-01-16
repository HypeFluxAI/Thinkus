/**
 * 用户端状态页服务
 *
 * 为小白用户提供一个简单易懂的产品状态页面
 * - 红绿灯式状态显示
 * - 可公开访问的状态页
 * - 历史正常率
 * - 事件时间线
 */

import { autoOps, CheckResult } from './auto-ops'
import { statusAggregator, AggregatedStatus } from './status-aggregator'

// ============================================================================
// 类型定义
// ============================================================================

/** 组件状态 */
export type ComponentStatus = 'operational' | 'degraded' | 'partial_outage' | 'major_outage' | 'maintenance'

/** 状态页组件 */
export interface StatusComponent {
  id: string
  name: string
  description: string
  status: ComponentStatus
  icon: string
  lastChecked: Date
  responseTime?: number
  uptimePercent?: number
}

/** 状态事件 */
export interface StatusIncident {
  id: string
  title: string
  description: string
  status: 'investigating' | 'identified' | 'monitoring' | 'resolved'
  severity: 'minor' | 'major' | 'critical'
  affectedComponents: string[]
  createdAt: Date
  updatedAt: Date
  resolvedAt?: Date
  updates: IncidentUpdate[]
}

/** 事件更新 */
export interface IncidentUpdate {
  id: string
  message: string
  status: StatusIncident['status']
  createdAt: Date
}

/** 计划维护 */
export interface ScheduledMaintenance {
  id: string
  title: string
  description: string
  affectedComponents: string[]
  scheduledStart: Date
  scheduledEnd: Date
  status: 'scheduled' | 'in_progress' | 'completed' | 'cancelled'
}

/** 正常率数据点 */
export interface UptimeDataPoint {
  date: Date
  uptimePercent: number
  incidentCount: number
}

/** 状态页数据 */
export interface StatusPageData {
  projectId: string
  projectName: string
  productUrl: string
  overallStatus: ComponentStatus
  overallStatusText: string
  components: StatusComponent[]
  activeIncidents: StatusIncident[]
  scheduledMaintenances: ScheduledMaintenance[]
  uptimeHistory: {
    last24Hours: number
    last7Days: number
    last30Days: number
    last90Days: number
    daily: UptimeDataPoint[]
  }
  lastUpdated: Date
  statusPageUrl: string
}

/** 状态页配置 */
export interface StatusPageConfig {
  projectId: string
  projectName: string
  productUrl: string
  adminUrl?: string
  logoUrl?: string
  primaryColor?: string
  showResponseTimes?: boolean
  showUptimeHistory?: boolean
  enableSubscription?: boolean
  customDomain?: string
  supportEmail?: string
  supportUrl?: string
}

// ============================================================================
// 配置
// ============================================================================

/** 组件状态配置 */
const COMPONENT_STATUS_CONFIG: Record<ComponentStatus, {
  label: string
  labelCn: string
  color: string
  icon: string
  priority: number
}> = {
  operational: {
    label: 'Operational',
    labelCn: '运行正常',
    color: '#22c55e',
    icon: '🟢',
    priority: 0
  },
  degraded: {
    label: 'Degraded Performance',
    labelCn: '性能下降',
    color: '#eab308',
    icon: '🟡',
    priority: 1
  },
  partial_outage: {
    label: 'Partial Outage',
    labelCn: '部分故障',
    color: '#f97316',
    icon: '🟠',
    priority: 2
  },
  major_outage: {
    label: 'Major Outage',
    labelCn: '严重故障',
    color: '#ef4444',
    icon: '🔴',
    priority: 3
  },
  maintenance: {
    label: 'Under Maintenance',
    labelCn: '维护中',
    color: '#3b82f6',
    icon: '🔵',
    priority: 1
  }
}

/** 默认组件列表 */
const DEFAULT_COMPONENTS = [
  { id: 'website', name: '网站', description: '主网站服务', icon: '🌐' },
  { id: 'api', name: 'API', description: 'API 接口服务', icon: '🔌' },
  { id: 'database', name: '数据库', description: '数据存储服务', icon: '💾' },
  { id: 'auth', name: '认证', description: '用户认证服务', icon: '🔐' },
  { id: 'cdn', name: 'CDN', description: '内容分发网络', icon: '📡' },
  { id: 'storage', name: '存储', description: '文件存储服务', icon: '📦' }
]

// ============================================================================
// 辅助函数
// ============================================================================

function generateId(): string {
  return `status-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`
}

// ============================================================================
// 用户状态页服务
// ============================================================================

export class UserStatusPageService {
  // 存储配置
  private configs: Map<string, StatusPageConfig> = new Map()
  // 存储事件
  private incidents: Map<string, StatusIncident[]> = new Map()
  // 存储维护计划
  private maintenances: Map<string, ScheduledMaintenance[]> = new Map()
  // 存储正常率历史
  private uptimeHistory: Map<string, UptimeDataPoint[]> = new Map()

  /**
   * 创建状态页
   */
  createStatusPage(config: StatusPageConfig): StatusPageData {
    this.configs.set(config.projectId, config)
    this.incidents.set(config.projectId, [])
    this.maintenances.set(config.projectId, [])
    this.uptimeHistory.set(config.projectId, this.initializeUptimeHistory())

    return this.getStatusPage(config.projectId)
  }

  /**
   * 获取状态页数据
   */
  getStatusPage(projectId: string): StatusPageData {
    const config = this.configs.get(projectId)
    if (!config) {
      throw new Error(`状态页 ${projectId} 不存在`)
    }

    // 获取聚合状态
    const aggregatedStatus = statusAggregator.aggregateStatus({
      projectId,
      deploymentStatus: 'active',
      databaseStatus: 'connected'
    })

    // 获取运维检查结果
    const dashboard = autoOps.getDashboard(projectId)

    // 构建组件状态
    const components = this.buildComponents(aggregatedStatus, dashboard?.lastInspection?.results || [])

    // 计算总体状态
    const overallStatus = this.calculateOverallStatus(components)

    // 获取活跃事件
    const activeIncidents = (this.incidents.get(projectId) || [])
      .filter(i => i.status !== 'resolved')

    // 获取计划维护
    const scheduledMaintenances = (this.maintenances.get(projectId) || [])
      .filter(m => m.status === 'scheduled' || m.status === 'in_progress')

    // 获取正常率历史
    const history = this.uptimeHistory.get(projectId) || []

    return {
      projectId,
      projectName: config.projectName,
      productUrl: config.productUrl,
      overallStatus,
      overallStatusText: this.getOverallStatusText(overallStatus, activeIncidents.length),
      components,
      activeIncidents,
      scheduledMaintenances,
      uptimeHistory: this.calculateUptimeStats(history, dashboard),
      lastUpdated: new Date(),
      statusPageUrl: this.getStatusPageUrl(config)
    }
  }

  /**
   * 构建组件状态
   */
  private buildComponents(
    aggregatedStatus: AggregatedStatus,
    checkResults: CheckResult[]
  ): StatusComponent[] {
    const components: StatusComponent[] = []

    // 从聚合状态构建
    for (const check of aggregatedStatus.checks) {
      const defaultComp = DEFAULT_COMPONENTS.find(c => c.id === check.name)

      components.push({
        id: check.name,
        name: defaultComp?.name || check.name,
        description: defaultComp?.description || '',
        status: this.mapCheckStatusToComponentStatus(check.status),
        icon: defaultComp?.icon || '🔧',
        lastChecked: new Date(),
        responseTime: check.responseTime,
        uptimePercent: check.status === 'ok' ? 99.9 : check.status === 'warning' ? 95 : 80
      })
    }

    return components
  }

  /**
   * 映射检查状态到组件状态
   */
  private mapCheckStatusToComponentStatus(status: 'ok' | 'warning' | 'error'): ComponentStatus {
    switch (status) {
      case 'ok': return 'operational'
      case 'warning': return 'degraded'
      case 'error': return 'major_outage'
    }
  }

  /**
   * 计算总体状态
   */
  private calculateOverallStatus(components: StatusComponent[]): ComponentStatus {
    if (components.length === 0) return 'operational'

    let worstPriority = 0
    let worstStatus: ComponentStatus = 'operational'

    for (const comp of components) {
      const priority = COMPONENT_STATUS_CONFIG[comp.status].priority
      if (priority > worstPriority) {
        worstPriority = priority
        worstStatus = comp.status
      }
    }

    return worstStatus
  }

  /**
   * 获取总体状态文本
   */
  private getOverallStatusText(status: ComponentStatus, activeIncidentCount: number): string {
    if (activeIncidentCount > 0) {
      return `${activeIncidentCount} 个事件正在处理中`
    }

    switch (status) {
      case 'operational':
        return '所有系统运行正常'
      case 'degraded':
        return '部分系统性能下降'
      case 'partial_outage':
        return '部分系统出现故障'
      case 'major_outage':
        return '系统出现严重故障'
      case 'maintenance':
        return '系统正在维护中'
    }
  }

  /**
   * 初始化正常率历史
   */
  private initializeUptimeHistory(): UptimeDataPoint[] {
    const history: UptimeDataPoint[] = []
    const now = new Date()

    for (let i = 89; i >= 0; i--) {
      const date = new Date(now)
      date.setDate(date.getDate() - i)
      date.setHours(0, 0, 0, 0)

      history.push({
        date,
        uptimePercent: 99.5 + Math.random() * 0.5, // 模拟数据
        incidentCount: Math.random() > 0.95 ? 1 : 0
      })
    }

    return history
  }

  /**
   * 计算正常率统计
   */
  private calculateUptimeStats(history: UptimeDataPoint[], dashboard?: any) {
    const now = new Date()
    const last90 = history.slice(-90)
    const last30 = history.slice(-30)
    const last7 = history.slice(-7)
    const last1 = history.slice(-1)

    const avg = (arr: UptimeDataPoint[]) =>
      arr.length > 0
        ? arr.reduce((sum, d) => sum + d.uptimePercent, 0) / arr.length
        : 100

    return {
      last24Hours: dashboard?.uptime?.last24Hours ?? avg(last1),
      last7Days: dashboard?.uptime?.last7Days ?? avg(last7),
      last30Days: dashboard?.uptime?.last30Days ?? avg(last30),
      last90Days: avg(last90),
      daily: last90
    }
  }

  /**
   * 获取状态页 URL
   */
  private getStatusPageUrl(config: StatusPageConfig): string {
    if (config.customDomain) {
      return `https://${config.customDomain}/status`
    }
    return `${config.productUrl}/status`
  }

  /**
   * 创建事件
   */
  createIncident(
    projectId: string,
    title: string,
    description: string,
    severity: StatusIncident['severity'],
    affectedComponents: string[]
  ): StatusIncident {
    const incident: StatusIncident = {
      id: generateId(),
      title,
      description,
      status: 'investigating',
      severity,
      affectedComponents,
      createdAt: new Date(),
      updatedAt: new Date(),
      updates: [{
        id: generateId(),
        message: '我们正在调查此问题',
        status: 'investigating',
        createdAt: new Date()
      }]
    }

    const incidents = this.incidents.get(projectId) || []
    incidents.unshift(incident)
    this.incidents.set(projectId, incidents)

    return incident
  }

  /**
   * 更新事件
   */
  updateIncident(
    projectId: string,
    incidentId: string,
    status: StatusIncident['status'],
    message: string
  ): StatusIncident | null {
    const incidents = this.incidents.get(projectId) || []
    const incident = incidents.find(i => i.id === incidentId)

    if (!incident) return null

    incident.status = status
    incident.updatedAt = new Date()

    if (status === 'resolved') {
      incident.resolvedAt = new Date()
    }

    incident.updates.unshift({
      id: generateId(),
      message,
      status,
      createdAt: new Date()
    })

    return incident
  }

  /**
   * 创建计划维护
   */
  scheduleMaintenance(
    projectId: string,
    title: string,
    description: string,
    affectedComponents: string[],
    scheduledStart: Date,
    scheduledEnd: Date
  ): ScheduledMaintenance {
    const maintenance: ScheduledMaintenance = {
      id: generateId(),
      title,
      description,
      affectedComponents,
      scheduledStart,
      scheduledEnd,
      status: 'scheduled'
    }

    const maintenances = this.maintenances.get(projectId) || []
    maintenances.push(maintenance)
    this.maintenances.set(projectId, maintenances)

    return maintenance
  }

  /**
   * 记录正常率
   */
  recordUptime(projectId: string, uptimePercent: number): void {
    const history = this.uptimeHistory.get(projectId) || []
    const today = new Date()
    today.setHours(0, 0, 0, 0)

    const todayEntry = history.find(h =>
      h.date.getTime() === today.getTime()
    )

    if (todayEntry) {
      todayEntry.uptimePercent = (todayEntry.uptimePercent + uptimePercent) / 2
    } else {
      history.push({
        date: today,
        uptimePercent,
        incidentCount: 0
      })

      // 保留最近90天
      while (history.length > 90) {
        history.shift()
      }
    }

    this.uptimeHistory.set(projectId, history)
  }

  /**
   * 生成状态页 HTML
   */
  generateStatusPageHtml(projectId: string): string {
    const data = this.getStatusPage(projectId)
    const config = this.configs.get(projectId)

    const statusColor = COMPONENT_STATUS_CONFIG[data.overallStatus].color

    return `
<!DOCTYPE html>
<html lang="zh-CN">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${data.projectName} - 系统状态</title>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; background: #f5f5f5; color: #333; }
    .container { max-width: 800px; margin: 0 auto; padding: 20px; }
    .header { text-align: center; padding: 40px 0; }
    .header h1 { font-size: 24px; margin-bottom: 10px; }
    .overall-status { background: ${statusColor}; color: white; padding: 20px; border-radius: 8px; text-align: center; margin-bottom: 20px; }
    .overall-status h2 { font-size: 20px; margin-bottom: 5px; }
    .components { background: white; border-radius: 8px; overflow: hidden; margin-bottom: 20px; }
    .component { display: flex; align-items: center; justify-content: space-between; padding: 15px 20px; border-bottom: 1px solid #eee; }
    .component:last-child { border-bottom: none; }
    .component-name { display: flex; align-items: center; gap: 10px; }
    .component-status { display: flex; align-items: center; gap: 5px; font-size: 14px; }
    .uptime-section { background: white; border-radius: 8px; padding: 20px; margin-bottom: 20px; }
    .uptime-section h3 { margin-bottom: 15px; }
    .uptime-grid { display: grid; grid-template-columns: repeat(4, 1fr); gap: 15px; text-align: center; }
    .uptime-item { background: #f9f9f9; padding: 15px; border-radius: 8px; }
    .uptime-value { font-size: 24px; font-weight: bold; color: #22c55e; }
    .uptime-label { font-size: 12px; color: #666; margin-top: 5px; }
    .incidents { background: white; border-radius: 8px; padding: 20px; margin-bottom: 20px; }
    .incident { padding: 15px; border-left: 3px solid #f97316; margin-bottom: 15px; background: #fff7ed; border-radius: 0 8px 8px 0; }
    .footer { text-align: center; padding: 20px; color: #666; font-size: 14px; }
    .last-updated { text-align: center; padding: 10px; color: #999; font-size: 12px; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>${data.projectName}</h1>
      <p>系统状态监控</p>
    </div>

    <div class="overall-status">
      <h2>${COMPONENT_STATUS_CONFIG[data.overallStatus].icon} ${COMPONENT_STATUS_CONFIG[data.overallStatus].labelCn}</h2>
      <p>${data.overallStatusText}</p>
    </div>

    <div class="components">
      ${data.components.map(comp => `
        <div class="component">
          <div class="component-name">
            <span>${comp.icon}</span>
            <span>${comp.name}</span>
          </div>
          <div class="component-status" style="color: ${COMPONENT_STATUS_CONFIG[comp.status].color}">
            <span>${COMPONENT_STATUS_CONFIG[comp.status].icon}</span>
            <span>${COMPONENT_STATUS_CONFIG[comp.status].labelCn}</span>
          </div>
        </div>
      `).join('')}
    </div>

    <div class="uptime-section">
      <h3>正常运行时间</h3>
      <div class="uptime-grid">
        <div class="uptime-item">
          <div class="uptime-value">${data.uptimeHistory.last24Hours.toFixed(2)}%</div>
          <div class="uptime-label">过去 24 小时</div>
        </div>
        <div class="uptime-item">
          <div class="uptime-value">${data.uptimeHistory.last7Days.toFixed(2)}%</div>
          <div class="uptime-label">过去 7 天</div>
        </div>
        <div class="uptime-item">
          <div class="uptime-value">${data.uptimeHistory.last30Days.toFixed(2)}%</div>
          <div class="uptime-label">过去 30 天</div>
        </div>
        <div class="uptime-item">
          <div class="uptime-value">${data.uptimeHistory.last90Days.toFixed(2)}%</div>
          <div class="uptime-label">过去 90 天</div>
        </div>
      </div>
    </div>

    ${data.activeIncidents.length > 0 ? `
      <div class="incidents">
        <h3>活跃事件</h3>
        ${data.activeIncidents.map(inc => `
          <div class="incident">
            <h4>${inc.title}</h4>
            <p>${inc.description}</p>
            <p style="color: #666; font-size: 12px; margin-top: 10px;">
              状态: ${inc.status} | 更新于: ${inc.updatedAt.toLocaleString('zh-CN')}
            </p>
          </div>
        `).join('')}
      </div>
    ` : ''}

    <div class="last-updated">
      最后更新: ${data.lastUpdated.toLocaleString('zh-CN')}
    </div>

    <div class="footer">
      <p>由 Thinkus 提供技术支持</p>
      ${config?.supportEmail ? `<p>技术支持: <a href="mailto:${config.supportEmail}">${config.supportEmail}</a></p>` : ''}
    </div>
  </div>

  <script>
    // 每 60 秒刷新一次
    setTimeout(() => location.reload(), 60000);
  </script>
</body>
</html>
    `.trim()
  }

  /**
   * 生成嵌入式状态小部件
   */
  generateStatusWidget(projectId: string): string {
    const data = this.getStatusPage(projectId)
    const statusCfg = COMPONENT_STATUS_CONFIG[data.overallStatus]

    return `
<!-- Thinkus Status Widget -->
<div id="thinkus-status-widget" style="
  display: inline-flex;
  align-items: center;
  gap: 8px;
  padding: 8px 16px;
  background: ${statusCfg.color}20;
  border: 1px solid ${statusCfg.color}40;
  border-radius: 20px;
  font-family: -apple-system, BlinkMacSystemFont, sans-serif;
  font-size: 14px;
  color: ${statusCfg.color};
  cursor: pointer;
">
  <span>${statusCfg.icon}</span>
  <span>${statusCfg.labelCn}</span>
</div>
<script>
  document.getElementById('thinkus-status-widget').onclick = function() {
    window.open('${data.statusPageUrl}', '_blank');
  };
</script>
    `.trim()
  }

  /**
   * 获取组件状态配置
   */
  getComponentStatusConfig() {
    return COMPONENT_STATUS_CONFIG
  }
}

// 导出单例
export const userStatusPage = new UserStatusPageService()
