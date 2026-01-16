'use client'

import * as React from 'react'
import { useState, useCallback, useEffect, useMemo } from 'react'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Progress } from '@/components/ui/progress'
import {
  autoOps,
  OpsDashboard,
  InspectionReport,
  CheckResultStatus,
  Issue,
  Alert
} from '@/lib/services/auto-ops'

export interface AutoOpsPanelProps {
  /** 项目ID */
  projectId: string
  /** 刷新间隔(毫秒) */
  refreshInterval?: number
  /** 自定义样式 */
  className?: string
}

/**
 * 自动运维面板
 */
export function AutoOpsPanel({
  projectId,
  refreshInterval = 60000,
  className
}: AutoOpsPanelProps) {
  const [loading, setLoading] = useState(true)
  const [inspecting, setInspecting] = useState(false)
  const [dashboard, setDashboard] = useState<OpsDashboard | null>(null)
  const [expandedSection, setExpandedSection] = useState<string | null>(null)

  const checkConfig = useMemo(() => autoOps.getCheckConfig(), [])

  // 加载仪表盘数据
  const loadDashboard = useCallback(async () => {
    setLoading(true)
    try {
      const data = await autoOps.getDashboard(projectId)
      setDashboard(data)
    } catch (error) {
      console.error('加载运维数据失败:', error)
    } finally {
      setLoading(false)
    }
  }, [projectId])

  // 执行巡检
  const runInspection = useCallback(async () => {
    setInspecting(true)
    try {
      await autoOps.runInspection(projectId)
      await loadDashboard()
    } catch (error) {
      console.error('巡检失败:', error)
    } finally {
      setInspecting(false)
    }
  }, [projectId, loadDashboard])

  // 初始加载和定时刷新
  useEffect(() => {
    loadDashboard()
    const interval = setInterval(loadDashboard, refreshInterval)
    return () => clearInterval(interval)
  }, [loadDashboard, refreshInterval])

  // 状态配置
  const statusConfig: Record<CheckResultStatus, {
    label: string
    icon: string
    color: string
    bgColor: string
  }> = {
    healthy: { label: '正常', icon: '💚', color: 'text-green-600', bgColor: 'bg-green-50 dark:bg-green-950/20' },
    warning: { label: '警告', icon: '💛', color: 'text-yellow-600', bgColor: 'bg-yellow-50 dark:bg-yellow-950/20' },
    critical: { label: '严重', icon: '🔴', color: 'text-red-600', bgColor: 'bg-red-50 dark:bg-red-950/20' },
    unknown: { label: '未知', icon: '❓', color: 'text-gray-600', bgColor: 'bg-gray-50 dark:bg-gray-800/50' }
  }

  if (loading && !dashboard) {
    return (
      <Card className={cn('overflow-hidden', className)}>
        <CardContent className="p-8 text-center">
          <div className="text-4xl mb-4 animate-pulse">🔧</div>
          <p className="text-muted-foreground">加载运维数据...</p>
        </CardContent>
      </Card>
    )
  }

  if (!dashboard) {
    return (
      <Card className={cn('overflow-hidden', className)}>
        <CardContent className="p-8 text-center">
          <div className="text-4xl mb-4">⚠️</div>
          <p className="text-muted-foreground">无法加载运维数据</p>
          <Button className="mt-4" onClick={loadDashboard}>重试</Button>
        </CardContent>
      </Card>
    )
  }

  const currentStatusConfig = statusConfig[dashboard.currentStatus]

  return (
    <Card className={cn('overflow-hidden', className)}>
      <CardHeader className={cn('border-b', currentStatusConfig.bgColor)}>
        <CardTitle className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="text-2xl">{currentStatusConfig.icon}</span>
            运维状态: {currentStatusConfig.label}
          </div>
          <Button
            size="sm"
            onClick={runInspection}
            disabled={inspecting}
          >
            {inspecting ? '巡检中...' : '🔍 立即巡检'}
          </Button>
        </CardTitle>
        <CardDescription>
          {dashboard.lastInspection
            ? `上次巡检: ${new Date(dashboard.lastInspection.inspectedAt).toLocaleString()}`
            : '尚未执行巡检'}
        </CardDescription>
      </CardHeader>

      <CardContent className="p-6 space-y-6">
        {/* 可用率 */}
        <div>
          <h4 className="font-medium mb-3 flex items-center gap-2">
            <span>📈</span>
            系统可用率
          </h4>
          <div className="grid grid-cols-3 gap-4">
            <UptimeCard label="24小时" value={dashboard.uptime.last24h} />
            <UptimeCard label="7天" value={dashboard.uptime.last7d} />
            <UptimeCard label="30天" value={dashboard.uptime.last30d} />
          </div>
        </div>

        {/* 最近巡检结果 */}
        {dashboard.lastInspection && (
          <div>
            <button
              className="w-full flex items-center justify-between font-medium mb-3"
              onClick={() => setExpandedSection(expandedSection === 'checks' ? null : 'checks')}
            >
              <div className="flex items-center gap-2">
                <span>🔍</span>
                巡检详情 ({dashboard.lastInspection.checks.length} 项)
              </div>
              <span className="text-muted-foreground">
                {expandedSection === 'checks' ? '▲' : '▼'}
              </span>
            </button>

            {expandedSection === 'checks' && (
              <div className="space-y-2">
                {dashboard.lastInspection.checks.map((check, i) => {
                  const cfg = checkConfig[check.checkType]
                  const statusCfg = statusConfig[check.status]

                  return (
                    <div
                      key={i}
                      className={cn(
                        'flex items-center justify-between p-3 rounded-lg',
                        statusCfg.bgColor
                      )}
                    >
                      <div className="flex items-center gap-3">
                        <span className="text-xl">{cfg.icon}</span>
                        <div>
                          <p className="font-medium text-sm">{cfg.label}</p>
                          <p className="text-xs text-muted-foreground">{check.message}</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        {check.value && (
                          <span className="text-sm font-mono">{check.value}</span>
                        )}
                        <span className={cn('text-lg', statusCfg.color)}>{statusCfg.icon}</span>
                      </div>
                    </div>
                  )
                })}
              </div>
            )}
          </div>
        )}

        {/* 待处理问题 */}
        {dashboard.openIssues.length > 0 && (
          <div className="bg-red-50 dark:bg-red-950/20 border border-red-200 dark:border-red-800 rounded-lg p-4">
            <h4 className="font-medium text-red-700 dark:text-red-300 flex items-center gap-2 mb-3">
              <span>⚠️</span>
              待处理问题 ({dashboard.openIssues.length})
            </h4>
            <div className="space-y-2">
              {dashboard.openIssues.map((issue, i) => (
                <IssueRow key={i} issue={issue} checkConfig={checkConfig} />
              ))}
            </div>
          </div>
        )}

        {/* 自动修复统计 */}
        {dashboard.autoFixStats.totalAttempts > 0 && (
          <div className="bg-blue-50 dark:bg-blue-950/20 rounded-lg p-4">
            <h4 className="font-medium mb-3 flex items-center gap-2">
              <span>🔧</span>
              自动修复统计
            </h4>
            <div className="grid grid-cols-3 gap-4 text-center">
              <div>
                <p className="text-2xl font-bold">{dashboard.autoFixStats.totalAttempts}</p>
                <p className="text-xs text-muted-foreground">总尝试</p>
              </div>
              <div>
                <p className="text-2xl font-bold text-green-600">{dashboard.autoFixStats.successCount}</p>
                <p className="text-xs text-muted-foreground">成功</p>
              </div>
              <div>
                <p className="text-2xl font-bold">{dashboard.autoFixStats.successRate.toFixed(0)}%</p>
                <p className="text-xs text-muted-foreground">成功率</p>
              </div>
            </div>
          </div>
        )}

        {/* 最近告警 */}
        {dashboard.recentAlerts.length > 0 && (
          <div>
            <button
              className="w-full flex items-center justify-between font-medium mb-3"
              onClick={() => setExpandedSection(expandedSection === 'alerts' ? null : 'alerts')}
            >
              <div className="flex items-center gap-2">
                <span>🔔</span>
                最近告警 ({dashboard.recentAlerts.length})
              </div>
              <span className="text-muted-foreground">
                {expandedSection === 'alerts' ? '▲' : '▼'}
              </span>
            </button>

            {expandedSection === 'alerts' && (
              <div className="space-y-2">
                {dashboard.recentAlerts.map((alert, i) => (
                  <AlertRow key={i} alert={alert} />
                ))}
              </div>
            )}
          </div>
        )}

        {/* 建议 */}
        {dashboard.recommendations.length > 0 && (
          <div className="bg-yellow-50 dark:bg-yellow-950/20 rounded-lg p-4">
            <h4 className="font-medium mb-3 flex items-center gap-2">
              <span>💡</span>
              运维建议
            </h4>
            <ul className="space-y-1 text-sm">
              {dashboard.recommendations.map((rec, i) => (
                <li key={i} className="flex items-start gap-2">
                  <span className="text-yellow-600">•</span>
                  {rec}
                </li>
              ))}
            </ul>
          </div>
        )}

        {/* 一切正常 */}
        {dashboard.openIssues.length === 0 && dashboard.currentStatus === 'healthy' && (
          <div className="text-center py-6">
            <div className="text-4xl mb-2">✅</div>
            <p className="text-green-600 font-medium">系统运行正常</p>
            <p className="text-sm text-muted-foreground">所有服务状态良好</p>
          </div>
        )}

        {/* 刷新按钮 */}
        <Button variant="outline" onClick={loadDashboard} className="w-full">
          🔄 刷新数据
        </Button>
      </CardContent>
    </Card>
  )
}

/**
 * 可用率卡片
 */
function UptimeCard({ label, value }: { label: string; value: number }) {
  const color = value >= 99.5 ? 'text-green-600' :
                value >= 99.0 ? 'text-yellow-600' : 'text-red-600'

  return (
    <div className="bg-gray-50 dark:bg-gray-800/50 rounded-lg p-4 text-center">
      <p className={cn('text-2xl font-bold', color)}>{value.toFixed(2)}%</p>
      <p className="text-xs text-muted-foreground">{label}</p>
    </div>
  )
}

/**
 * 问题行
 */
function IssueRow({
  issue,
  checkConfig
}: {
  issue: Issue
  checkConfig: Record<string, { label: string; icon: string }>
}) {
  const cfg = checkConfig[issue.checkType]
  const statusLabel = {
    open: '待处理',
    fixing: '修复中',
    resolved: '已解决',
    escalated: '需人工'
  }

  return (
    <div className="flex items-center justify-between p-2 bg-white dark:bg-gray-900 rounded">
      <div className="flex items-center gap-2">
        <span>{cfg?.icon || '❓'}</span>
        <div>
          <p className="font-medium text-sm">{issue.title}</p>
          <p className="text-xs text-muted-foreground">{issue.description}</p>
        </div>
      </div>
      <div className="flex items-center gap-2">
        <span className={cn(
          'text-xs px-2 py-0.5 rounded',
          issue.severity === 'critical' && 'bg-red-100 text-red-700',
          issue.severity === 'warning' && 'bg-yellow-100 text-yellow-700'
        )}>
          {issue.severity === 'critical' ? '严重' : '警告'}
        </span>
        <span className="text-xs text-muted-foreground">
          {statusLabel[issue.status]}
        </span>
      </div>
    </div>
  )
}

/**
 * 告警行
 */
function AlertRow({ alert }: { alert: Alert }) {
  return (
    <div className={cn(
      'flex items-center justify-between p-2 rounded',
      alert.acknowledged
        ? 'bg-gray-50 dark:bg-gray-800/50'
        : 'bg-orange-50 dark:bg-orange-950/20'
    )}>
      <div className="flex items-center gap-2">
        <span>{alert.severity === 'critical' ? '🔴' : '🟡'}</span>
        <div>
          <p className="font-medium text-sm">{alert.title}</p>
          <p className="text-xs text-muted-foreground">
            {alert.channel} · {new Date(alert.sentAt).toLocaleString()}
          </p>
        </div>
      </div>
      {alert.acknowledged ? (
        <span className="text-xs text-green-600">✓ 已确认</span>
      ) : (
        <span className="text-xs text-orange-600">待确认</span>
      )}
    </div>
  )
}

/**
 * 运维状态徽章
 */
export function OpsStatusBadge({
  status,
  onClick,
  className
}: {
  status: CheckResultStatus
  onClick?: () => void
  className?: string
}) {
  const config = {
    healthy: { icon: '💚', label: '正常', color: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300' },
    warning: { icon: '💛', label: '警告', color: 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-300' },
    critical: { icon: '🔴', label: '异常', color: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-300' },
    unknown: { icon: '❓', label: '未知', color: 'bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300' }
  }

  const cfg = config[status]

  return (
    <button
      onClick={onClick}
      className={cn(
        'inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm font-medium transition-colors hover:opacity-80',
        cfg.color,
        className
      )}
    >
      <span>{cfg.icon}</span>
      <span>{cfg.label}</span>
    </button>
  )
}

/**
 * 迷你运维指示器
 */
export function OpsMiniIndicator({
  status,
  pulse = true,
  className
}: {
  status: CheckResultStatus
  pulse?: boolean
  className?: string
}) {
  const colorMap = {
    healthy: 'bg-green-500',
    warning: 'bg-yellow-500',
    critical: 'bg-red-500',
    unknown: 'bg-gray-400'
  }

  return (
    <span
      className={cn(
        'w-3 h-3 rounded-full inline-block',
        colorMap[status],
        pulse && status === 'critical' && 'animate-pulse',
        className
      )}
    />
  )
}
