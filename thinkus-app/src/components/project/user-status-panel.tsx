'use client'

import * as React from 'react'
import { useState, useCallback, useEffect } from 'react'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import {
  userStatusPage,
  StatusPageData,
  StatusComponent,
  ComponentStatus,
  StatusIncident
} from '@/lib/services/user-status-page'

export interface UserStatusPanelProps {
  /** 项目ID */
  projectId: string
  /** 自定义样式 */
  className?: string
  /** 是否显示完整视图 */
  fullView?: boolean
}

/**
 * 用户端状态面板 - 简单易懂的产品状态展示
 */
export function UserStatusPanel({
  projectId,
  className,
  fullView = false
}: UserStatusPanelProps) {
  const [loading, setLoading] = useState(true)
  const [statusData, setStatusData] = useState<StatusPageData | null>(null)
  const [expandedSection, setExpandedSection] = useState<string | null>(null)

  const statusConfig = userStatusPage.getComponentStatusConfig()

  // 加载状态数据
  const loadStatus = useCallback(async () => {
    setLoading(true)
    try {
      const data = userStatusPage.getStatusPage(projectId)
      setStatusData(data)
    } catch (error) {
      console.error('加载状态数据失败:', error)
    } finally {
      setLoading(false)
    }
  }, [projectId])

  useEffect(() => {
    loadStatus()
    // 每分钟刷新一次
    const interval = setInterval(loadStatus, 60000)
    return () => clearInterval(interval)
  }, [loadStatus])

  if (loading) {
    return (
      <Card className={cn('overflow-hidden', className)}>
        <CardContent className="p-8 text-center">
          <div className="text-4xl mb-4 animate-pulse">🔄</div>
          <p className="text-muted-foreground">加载状态...</p>
        </CardContent>
      </Card>
    )
  }

  if (!statusData) {
    return (
      <Card className={cn('overflow-hidden', className)}>
        <CardContent className="p-8 text-center">
          <div className="text-4xl mb-4">❓</div>
          <p className="text-muted-foreground">无法获取状态信息</p>
        </CardContent>
      </Card>
    )
  }

  const overallConfig = statusConfig[statusData.overallStatus]

  return (
    <Card className={cn('overflow-hidden', className)}>
      <CardHeader className="border-b">
        <CardTitle className="flex items-center gap-2">
          <span className="text-2xl">📊</span>
          系统状态
        </CardTitle>
        <CardDescription>
          实时监控您的产品运行状态
        </CardDescription>
      </CardHeader>

      <CardContent className="p-6 space-y-6">
        {/* 总体状态 - 大号红绿灯 */}
        <div
          className="rounded-xl p-8 text-center transition-colors"
          style={{ backgroundColor: `${overallConfig.color}15` }}
        >
          <div className="text-6xl mb-4">{overallConfig.icon}</div>
          <h3
            className="text-2xl font-bold mb-2"
            style={{ color: overallConfig.color }}
          >
            {overallConfig.labelCn}
          </h3>
          <p className="text-muted-foreground">{statusData.overallStatusText}</p>
        </div>

        {/* 正常运行时间 */}
        <div className="grid grid-cols-4 gap-3 text-center">
          <div className="bg-gray-50 dark:bg-gray-800/50 rounded-lg p-3">
            <p className="text-xl font-bold text-green-600">
              {statusData.uptimeHistory.last24Hours.toFixed(1)}%
            </p>
            <p className="text-xs text-muted-foreground">24小时</p>
          </div>
          <div className="bg-gray-50 dark:bg-gray-800/50 rounded-lg p-3">
            <p className="text-xl font-bold text-green-600">
              {statusData.uptimeHistory.last7Days.toFixed(1)}%
            </p>
            <p className="text-xs text-muted-foreground">7天</p>
          </div>
          <div className="bg-gray-50 dark:bg-gray-800/50 rounded-lg p-3">
            <p className="text-xl font-bold text-green-600">
              {statusData.uptimeHistory.last30Days.toFixed(1)}%
            </p>
            <p className="text-xs text-muted-foreground">30天</p>
          </div>
          <div className="bg-gray-50 dark:bg-gray-800/50 rounded-lg p-3">
            <p className="text-xl font-bold text-green-600">
              {statusData.uptimeHistory.last90Days.toFixed(1)}%
            </p>
            <p className="text-xs text-muted-foreground">90天</p>
          </div>
        </div>

        {/* 90天正常率图表 */}
        {fullView && (
          <div>
            <h4 className="font-medium mb-3">过去90天</h4>
            <div className="flex gap-0.5 h-8">
              {statusData.uptimeHistory.daily.map((day, i) => (
                <div
                  key={i}
                  className="flex-1 rounded-sm cursor-pointer hover:opacity-80 transition-opacity"
                  style={{
                    backgroundColor: day.uptimePercent >= 99 ? '#22c55e' :
                                   day.uptimePercent >= 95 ? '#eab308' : '#ef4444'
                  }}
                  title={`${day.date.toLocaleDateString('zh-CN')}: ${day.uptimePercent.toFixed(2)}%`}
                />
              ))}
            </div>
            <div className="flex justify-between text-xs text-muted-foreground mt-1">
              <span>90天前</span>
              <span>今天</span>
            </div>
          </div>
        )}

        {/* 组件状态 */}
        <div>
          <button
            className="w-full flex items-center justify-between font-medium mb-3"
            onClick={() => setExpandedSection(expandedSection === 'components' ? null : 'components')}
          >
            <div className="flex items-center gap-2">
              <span>🔧</span>
              服务组件 ({statusData.components.length})
            </div>
            <span className="text-muted-foreground">
              {expandedSection === 'components' ? '▲' : '▼'}
            </span>
          </button>

          {expandedSection === 'components' && (
            <div className="space-y-2">
              {statusData.components.map((comp) => (
                <ComponentStatusRow
                  key={comp.id}
                  component={comp}
                  statusConfig={statusConfig}
                />
              ))}
            </div>
          )}
        </div>

        {/* 活跃事件 */}
        {statusData.activeIncidents.length > 0 && (
          <div className="bg-yellow-50 dark:bg-yellow-950/20 rounded-lg p-4">
            <h4 className="font-medium text-yellow-700 dark:text-yellow-300 mb-3 flex items-center gap-2">
              <span>⚠️</span>
              正在处理的问题 ({statusData.activeIncidents.length})
            </h4>

            <div className="space-y-3">
              {statusData.activeIncidents.map((incident) => (
                <IncidentCard key={incident.id} incident={incident} />
              ))}
            </div>
          </div>
        )}

        {/* 计划维护 */}
        {statusData.scheduledMaintenances.length > 0 && (
          <div className="bg-blue-50 dark:bg-blue-950/20 rounded-lg p-4">
            <h4 className="font-medium text-blue-700 dark:text-blue-300 mb-3 flex items-center gap-2">
              <span>🔧</span>
              计划维护
            </h4>

            <div className="space-y-2">
              {statusData.scheduledMaintenances.map((maint) => (
                <div key={maint.id} className="bg-white dark:bg-gray-800 rounded p-3">
                  <p className="font-medium">{maint.title}</p>
                  <p className="text-sm text-muted-foreground">
                    {maint.scheduledStart.toLocaleString('zh-CN')} - {maint.scheduledEnd.toLocaleString('zh-CN')}
                  </p>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* 状态页链接 */}
        <div className="flex gap-2">
          <Button
            variant="outline"
            className="flex-1"
            onClick={loadStatus}
          >
            🔄 刷新
          </Button>
          <Button
            variant="outline"
            className="flex-1"
            onClick={() => window.open(statusData.statusPageUrl, '_blank')}
          >
            🔗 完整状态页
          </Button>
        </div>

        {/* 最后更新时间 */}
        <p className="text-center text-xs text-muted-foreground">
          最后更新: {statusData.lastUpdated.toLocaleString('zh-CN')}
        </p>
      </CardContent>
    </Card>
  )
}

/**
 * 组件状态行
 */
function ComponentStatusRow({
  component,
  statusConfig
}: {
  component: StatusComponent
  statusConfig: Record<ComponentStatus, any>
}) {
  const config = statusConfig[component.status]

  return (
    <div className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-800/50 rounded-lg">
      <div className="flex items-center gap-3">
        <span className="text-xl">{component.icon}</span>
        <div>
          <p className="font-medium">{component.name}</p>
          <p className="text-xs text-muted-foreground">{component.description}</p>
        </div>
      </div>

      <div className="flex items-center gap-2">
        {component.responseTime && (
          <span className="text-xs text-muted-foreground">
            {component.responseTime}ms
          </span>
        )}
        <span
          className="flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium"
          style={{
            backgroundColor: `${config.color}20`,
            color: config.color
          }}
        >
          {config.icon} {config.labelCn}
        </span>
      </div>
    </div>
  )
}

/**
 * 事件卡片
 */
function IncidentCard({ incident }: { incident: StatusIncident }) {
  const severityConfig = {
    minor: { color: 'text-yellow-600', bg: 'bg-yellow-100', label: '轻微' },
    major: { color: 'text-orange-600', bg: 'bg-orange-100', label: '严重' },
    critical: { color: 'text-red-600', bg: 'bg-red-100', label: '紧急' }
  }

  const cfg = severityConfig[incident.severity]

  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg p-4">
      <div className="flex items-start justify-between mb-2">
        <h5 className="font-medium">{incident.title}</h5>
        <span className={cn('px-2 py-0.5 rounded text-xs font-medium', cfg.bg, cfg.color)}>
          {cfg.label}
        </span>
      </div>

      <p className="text-sm text-muted-foreground mb-3">{incident.description}</p>

      {incident.updates.length > 0 && (
        <div className="border-t pt-2 mt-2">
          <p className="text-xs text-muted-foreground mb-1">最新更新</p>
          <p className="text-sm">{incident.updates[0].message}</p>
          <p className="text-xs text-muted-foreground mt-1">
            {incident.updates[0].createdAt.toLocaleString('zh-CN')}
          </p>
        </div>
      )}
    </div>
  )
}

/**
 * 简化状态指示器
 */
export function SimpleStatusIndicator({
  status,
  onClick,
  className
}: {
  status: ComponentStatus
  onClick?: () => void
  className?: string
}) {
  const statusConfig = userStatusPage.getComponentStatusConfig()
  const config = statusConfig[status]

  return (
    <button
      onClick={onClick}
      className={cn(
        'inline-flex items-center gap-2 px-3 py-1.5 rounded-full text-sm font-medium transition-opacity hover:opacity-80',
        className
      )}
      style={{
        backgroundColor: `${config.color}15`,
        color: config.color
      }}
    >
      <span className="text-lg">{config.icon}</span>
      <span>{config.labelCn}</span>
    </button>
  )
}

/**
 * 迷你状态徽章
 */
export function StatusBadgeMini({
  projectId,
  className
}: {
  projectId: string
  className?: string
}) {
  const [status, setStatus] = useState<ComponentStatus>('operational')

  useEffect(() => {
    try {
      const data = userStatusPage.getStatusPage(projectId)
      setStatus(data.overallStatus)
    } catch {
      // 忽略错误
    }
  }, [projectId])

  const statusConfig = userStatusPage.getComponentStatusConfig()
  const config = statusConfig[status]

  return (
    <span
      className={cn('inline-flex items-center gap-1 text-sm', className)}
      style={{ color: config.color }}
    >
      <span>{config.icon}</span>
      <span>{config.labelCn}</span>
    </span>
  )
}

/**
 * 状态页嵌入组件
 */
export function StatusPageEmbed({
  projectId,
  height = 400,
  className
}: {
  projectId: string
  height?: number
  className?: string
}) {
  const [html, setHtml] = useState<string>('')

  useEffect(() => {
    try {
      const pageHtml = userStatusPage.generateStatusPageHtml(projectId)
      setHtml(pageHtml)
    } catch {
      // 忽略错误
    }
  }, [projectId])

  if (!html) return null

  return (
    <iframe
      srcDoc={html}
      className={cn('w-full rounded-lg border', className)}
      style={{ height }}
      title="系统状态"
    />
  )
}
