'use client'

import * as React from 'react'
import { useState, useCallback, useEffect, useMemo } from 'react'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Progress } from '@/components/ui/progress'
import {
  userActivityTracker,
  UserHealthReport,
  ActivityLevel,
  HealthStatus,
  CareRecord
} from '@/lib/services/user-activity-tracker'

export interface UserActivityPanelProps {
  /** 项目ID */
  projectId: string
  /** 用户ID (可选，不传则显示项目概览) */
  userId?: string
  /** 刷新间隔(毫秒) */
  refreshInterval?: number
  /** 自定义样式 */
  className?: string
}

/**
 * 用户活跃度面板
 */
export function UserActivityPanel({
  projectId,
  userId,
  refreshInterval = 60000,
  className
}: UserActivityPanelProps) {
  const [loading, setLoading] = useState(true)
  const [report, setReport] = useState<UserHealthReport | null>(null)
  const [overview, setOverview] = useState<{
    totalUsers: number
    healthyCount: number
    atRiskCount: number
    criticalCount: number
    churnedCount: number
    avgHealthScore: number
    topRiskFactors: { factor: string; count: number }[]
    recentCareRecords: CareRecord[]
  } | null>(null)

  const activityLevelConfig = useMemo(() => userActivityTracker.getActivityLevelConfig(), [])
  const healthStatusConfig = useMemo(() => userActivityTracker.getHealthStatusConfig(), [])

  // 加载数据
  const loadData = useCallback(async () => {
    setLoading(true)
    try {
      if (userId) {
        const healthReport = await userActivityTracker.evaluateUserHealth(projectId, userId)
        setReport(healthReport)
      } else {
        const projectOverview = await userActivityTracker.getProjectHealthOverview(projectId)
        setOverview(projectOverview)
      }
    } catch (error) {
      console.error('加载活跃度数据失败:', error)
    } finally {
      setLoading(false)
    }
  }, [projectId, userId])

  // 初始加载和定时刷新
  useEffect(() => {
    loadData()
    const interval = setInterval(loadData, refreshInterval)
    return () => clearInterval(interval)
  }, [loadData, refreshInterval])

  // 风险因素名称映射
  const riskFactorLabels: Record<string, string> = {
    long_inactive: '长期不活跃',
    low_feature_usage: '功能使用率低',
    declining_activity: '活跃度下降',
    no_data_created: '未创建数据',
    low_engagement: '参与度低'
  }

  if (loading) {
    return (
      <Card className={cn('overflow-hidden', className)}>
        <CardContent className="p-8 text-center">
          <div className="text-4xl mb-4 animate-pulse">📊</div>
          <p className="text-muted-foreground">加载活跃度数据...</p>
        </CardContent>
      </Card>
    )
  }

  // 单用户详情视图
  if (userId && report) {
    const statusConfig = healthStatusConfig[report.healthStatus]
    const levelConfig = activityLevelConfig[report.activityLevel]

    return (
      <Card className={cn('overflow-hidden', className)}>
        <CardHeader className={cn(
          'border-b',
          report.healthStatus === 'healthy' && 'bg-green-50 dark:bg-green-950/20',
          report.healthStatus === 'at_risk' && 'bg-yellow-50 dark:bg-yellow-950/20',
          report.healthStatus === 'critical' && 'bg-orange-50 dark:bg-orange-950/20',
          report.healthStatus === 'churned' && 'bg-red-50 dark:bg-red-950/20'
        )}>
          <CardTitle className="flex items-center gap-2">
            <span className="text-2xl">{statusConfig.icon}</span>
            用户健康状态: {statusConfig.label}
          </CardTitle>
          <CardDescription>{statusConfig.description}</CardDescription>
        </CardHeader>

        <CardContent className="p-6 space-y-6">
          {/* 核心指标 */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <MetricCard
              icon={levelConfig.icon}
              label="活跃度"
              value={levelConfig.label}
              color={levelConfig.color}
            />
            <MetricCard
              icon="📈"
              label="健康分数"
              value={`${report.healthScore.toFixed(0)}/100`}
              color={report.healthScore >= 60 ? 'text-green-600' : 'text-orange-600'}
            />
            <MetricCard
              icon="⚠️"
              label="流失风险"
              value={`${report.churnProbability.toFixed(0)}%`}
              color={report.churnProbability < 30 ? 'text-green-600' : report.churnProbability < 60 ? 'text-yellow-600' : 'text-red-600'}
            />
            <MetricCard
              icon="📅"
              label="最后活跃"
              value={report.metrics.lastActiveAt
                ? `${report.metrics.daysSinceLastActive}天前`
                : '从未'}
              color={report.metrics.daysSinceLastActive < 7 ? 'text-green-600' : 'text-orange-600'}
            />
          </div>

          {/* 健康度进度条 */}
          <div>
            <div className="flex justify-between mb-2">
              <span className="text-sm font-medium">健康度</span>
              <span className="text-sm text-muted-foreground">{report.healthScore.toFixed(0)}%</span>
            </div>
            <Progress
              value={report.healthScore}
              className={cn(
                'h-3',
                report.healthScore >= 60 && '[&>div]:bg-green-500',
                report.healthScore >= 30 && report.healthScore < 60 && '[&>div]:bg-yellow-500',
                report.healthScore < 30 && '[&>div]:bg-red-500'
              )}
            />
          </div>

          {/* 使用指标 */}
          <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
            <div className="bg-gray-50 dark:bg-gray-800/50 rounded-lg p-4">
              <p className="text-sm text-muted-foreground">日活跃次数</p>
              <p className="text-2xl font-bold">{report.metrics.dailyActiveCount}</p>
            </div>
            <div className="bg-gray-50 dark:bg-gray-800/50 rounded-lg p-4">
              <p className="text-sm text-muted-foreground">周活跃次数</p>
              <p className="text-2xl font-bold">{report.metrics.weeklyActiveCount}</p>
            </div>
            <div className="bg-gray-50 dark:bg-gray-800/50 rounded-lg p-4">
              <p className="text-sm text-muted-foreground">功能使用率</p>
              <p className="text-2xl font-bold">{(report.metrics.featureUsageRate * 100).toFixed(0)}%</p>
            </div>
          </div>

          {/* 趋势指示 */}
          <div className={cn(
            'rounded-lg p-4 flex items-center gap-3',
            report.metrics.activityTrend === 'increasing' && 'bg-green-50 dark:bg-green-950/20',
            report.metrics.activityTrend === 'stable' && 'bg-blue-50 dark:bg-blue-950/20',
            report.metrics.activityTrend === 'decreasing' && 'bg-orange-50 dark:bg-orange-950/20'
          )}>
            <span className="text-2xl">
              {report.metrics.activityTrend === 'increasing' ? '📈' :
               report.metrics.activityTrend === 'decreasing' ? '📉' : '➡️'}
            </span>
            <div>
              <p className="font-medium">
                活跃度趋势: {
                  report.metrics.activityTrend === 'increasing' ? '上升' :
                  report.metrics.activityTrend === 'decreasing' ? '下降' : '稳定'
                }
              </p>
              <p className="text-sm text-muted-foreground">
                周环比: {report.metrics.weekOverWeekChange > 0 ? '+' : ''}{report.metrics.weekOverWeekChange.toFixed(0)}%
              </p>
            </div>
          </div>

          {/* 风险因素 */}
          {report.riskFactors.length > 0 && (
            <div className="bg-red-50 dark:bg-red-950/20 border border-red-200 dark:border-red-800 rounded-lg p-4">
              <h4 className="font-medium text-red-700 dark:text-red-300 flex items-center gap-2 mb-3">
                <span>⚠️</span>
                风险因素 ({report.riskFactors.length})
              </h4>
              <ul className="space-y-2">
                {report.riskFactors.map((factor, i) => (
                  <li key={i} className="flex items-start gap-2 text-sm text-red-600 dark:text-red-400">
                    <span className={cn(
                      'mt-0.5 w-2 h-2 rounded-full',
                      factor.severity === 'high' && 'bg-red-500',
                      factor.severity === 'medium' && 'bg-yellow-500',
                      factor.severity === 'low' && 'bg-green-500'
                    )} />
                    {factor.description}
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* 建议行动 */}
          {report.recommendedActions.length > 0 && (
            <div className="bg-blue-50 dark:bg-blue-950/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4">
              <h4 className="font-medium text-blue-700 dark:text-blue-300 flex items-center gap-2 mb-3">
                <span>💡</span>
                建议行动
              </h4>
              <ul className="space-y-3">
                {report.recommendedActions.map((action, i) => (
                  <li key={i} className="flex items-start gap-3">
                    <span className={cn(
                      'px-2 py-0.5 rounded text-xs font-medium',
                      action.priority === 'urgent' && 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-300',
                      action.priority === 'high' && 'bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-300',
                      action.priority === 'medium' && 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-300',
                      action.priority === 'low' && 'bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300'
                    )}>
                      {action.priority === 'urgent' ? '紧急' :
                       action.priority === 'high' ? '高' :
                       action.priority === 'medium' ? '中' : '低'}
                    </span>
                    <div>
                      <p className="font-medium text-sm">{action.action}</p>
                      <p className="text-xs text-muted-foreground">{action.description}</p>
                    </div>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* 刷新按钮 */}
          <Button variant="outline" onClick={loadData} className="w-full">
            🔄 刷新数据
          </Button>
        </CardContent>
      </Card>
    )
  }

  // 项目概览视图
  if (!userId && overview) {
    const healthyPercent = overview.totalUsers > 0
      ? (overview.healthyCount / overview.totalUsers) * 100
      : 0

    return (
      <Card className={cn('overflow-hidden', className)}>
        <CardHeader className="border-b">
          <CardTitle className="flex items-center gap-2">
            <span className="text-2xl">📊</span>
            用户活跃度概览
          </CardTitle>
          <CardDescription>
            追踪 {overview.totalUsers} 位用户的使用状态
          </CardDescription>
        </CardHeader>

        <CardContent className="p-6 space-y-6">
          {overview.totalUsers === 0 ? (
            <div className="text-center py-8">
              <div className="text-4xl mb-4">📭</div>
              <p className="text-muted-foreground">暂无用户活跃数据</p>
              <p className="text-sm text-muted-foreground mt-2">用户开始使用产品后，这里将显示活跃度统计</p>
            </div>
          ) : (
            <>
              {/* 健康度分布 */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <StatusCard
                  icon="💚"
                  label="健康"
                  count={overview.healthyCount}
                  total={overview.totalUsers}
                  color="text-green-600 bg-green-50 dark:bg-green-950/20"
                />
                <StatusCard
                  icon="💛"
                  label="有风险"
                  count={overview.atRiskCount}
                  total={overview.totalUsers}
                  color="text-yellow-600 bg-yellow-50 dark:bg-yellow-950/20"
                />
                <StatusCard
                  icon="🧡"
                  label="危险"
                  count={overview.criticalCount}
                  total={overview.totalUsers}
                  color="text-orange-600 bg-orange-50 dark:bg-orange-950/20"
                />
                <StatusCard
                  icon="💔"
                  label="已流失"
                  count={overview.churnedCount}
                  total={overview.totalUsers}
                  color="text-red-600 bg-red-50 dark:bg-red-950/20"
                />
              </div>

              {/* 整体健康度 */}
              <div>
                <div className="flex justify-between mb-2">
                  <span className="text-sm font-medium">整体健康度</span>
                  <span className="text-sm text-muted-foreground">
                    {overview.avgHealthScore.toFixed(0)}分 | {healthyPercent.toFixed(0)}%健康
                  </span>
                </div>
                <Progress
                  value={overview.avgHealthScore}
                  className={cn(
                    'h-3',
                    overview.avgHealthScore >= 60 && '[&>div]:bg-green-500',
                    overview.avgHealthScore >= 30 && overview.avgHealthScore < 60 && '[&>div]:bg-yellow-500',
                    overview.avgHealthScore < 30 && '[&>div]:bg-red-500'
                  )}
                />
              </div>

              {/* 健康度分布条 */}
              <div className="flex h-8 rounded-lg overflow-hidden">
                {overview.healthyCount > 0 && (
                  <div
                    className="bg-green-500 flex items-center justify-center text-white text-xs font-medium"
                    style={{ width: `${(overview.healthyCount / overview.totalUsers) * 100}%` }}
                  >
                    {overview.healthyCount}
                  </div>
                )}
                {overview.atRiskCount > 0 && (
                  <div
                    className="bg-yellow-500 flex items-center justify-center text-white text-xs font-medium"
                    style={{ width: `${(overview.atRiskCount / overview.totalUsers) * 100}%` }}
                  >
                    {overview.atRiskCount}
                  </div>
                )}
                {overview.criticalCount > 0 && (
                  <div
                    className="bg-orange-500 flex items-center justify-center text-white text-xs font-medium"
                    style={{ width: `${(overview.criticalCount / overview.totalUsers) * 100}%` }}
                  >
                    {overview.criticalCount}
                  </div>
                )}
                {overview.churnedCount > 0 && (
                  <div
                    className="bg-red-500 flex items-center justify-center text-white text-xs font-medium"
                    style={{ width: `${(overview.churnedCount / overview.totalUsers) * 100}%` }}
                  >
                    {overview.churnedCount}
                  </div>
                )}
              </div>

              {/* 主要风险因素 */}
              {overview.topRiskFactors.length > 0 && (
                <div className="bg-yellow-50 dark:bg-yellow-950/20 rounded-lg p-4">
                  <h4 className="font-medium mb-3 flex items-center gap-2">
                    <span>⚠️</span>
                    主要风险因素
                  </h4>
                  <div className="space-y-2">
                    {overview.topRiskFactors.map((factor, i) => (
                      <div key={i} className="flex items-center justify-between">
                        <span className="text-sm">{riskFactorLabels[factor.factor] || factor.factor}</span>
                        <span className="text-sm font-medium">{factor.count} 人</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* 最近关怀记录 */}
              {overview.recentCareRecords.length > 0 && (
                <div>
                  <h4 className="font-medium mb-3 flex items-center gap-2">
                    <span>💌</span>
                    最近关怀记录
                  </h4>
                  <div className="space-y-2">
                    {overview.recentCareRecords.slice(0, 5).map((record, i) => (
                      <div key={i} className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-800/50 rounded-lg">
                        <div>
                          <p className="font-medium text-sm">{record.triggerName}</p>
                          <p className="text-xs text-muted-foreground">{record.action.action}</p>
                        </div>
                        <span className="text-xs text-muted-foreground">
                          {new Date(record.sentAt).toLocaleDateString()}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </>
          )}

          {/* 刷新按钮 */}
          <Button variant="outline" onClick={loadData} className="w-full">
            🔄 刷新数据
          </Button>
        </CardContent>
      </Card>
    )
  }

  return null
}

/**
 * 指标卡片
 */
function MetricCard({
  icon,
  label,
  value,
  color
}: {
  icon: string
  label: string
  value: string
  color: string
}) {
  return (
    <div className="bg-gray-50 dark:bg-gray-800/50 rounded-lg p-4 text-center">
      <div className="text-2xl mb-1">{icon}</div>
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className={cn('text-lg font-bold', color)}>{value}</p>
    </div>
  )
}

/**
 * 状态卡片
 */
function StatusCard({
  icon,
  label,
  count,
  total,
  color
}: {
  icon: string
  label: string
  count: number
  total: number
  color: string
}) {
  const percent = total > 0 ? (count / total) * 100 : 0

  return (
    <div className={cn('rounded-lg p-4 text-center', color)}>
      <div className="text-2xl mb-1">{icon}</div>
      <p className="text-2xl font-bold">{count}</p>
      <p className="text-xs">{label} ({percent.toFixed(0)}%)</p>
    </div>
  )
}

/**
 * 用户健康度徽章
 */
export function UserHealthBadge({
  healthStatus,
  healthScore,
  onClick,
  className
}: {
  healthStatus: HealthStatus
  healthScore: number
  onClick?: () => void
  className?: string
}) {
  const config = {
    healthy: { icon: '💚', label: '健康', color: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300' },
    at_risk: { icon: '💛', label: '有风险', color: 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-300' },
    critical: { icon: '🧡', label: '危险', color: 'bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-300' },
    churned: { icon: '💔', label: '已流失', color: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-300' }
  }

  const cfg = config[healthStatus]

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
      <span className="opacity-75">({healthScore.toFixed(0)})</span>
    </button>
  )
}

/**
 * 活跃度迷你指示器
 */
export function ActivityIndicator({
  activityLevel,
  size = 'md',
  className
}: {
  activityLevel: ActivityLevel
  size?: 'sm' | 'md' | 'lg'
  className?: string
}) {
  const config = {
    highly_active: { color: 'bg-green-500', pulse: true },
    active: { color: 'bg-blue-500', pulse: false },
    moderate: { color: 'bg-yellow-500', pulse: false },
    low: { color: 'bg-orange-500', pulse: false },
    inactive: { color: 'bg-red-500', pulse: false },
    churned: { color: 'bg-gray-400', pulse: false }
  }

  const sizeMap = {
    sm: 'w-2 h-2',
    md: 'w-3 h-3',
    lg: 'w-4 h-4'
  }

  const cfg = config[activityLevel]

  return (
    <span
      className={cn(
        'rounded-full inline-block',
        cfg.color,
        sizeMap[size],
        cfg.pulse && 'animate-pulse',
        className
      )}
    />
  )
}
