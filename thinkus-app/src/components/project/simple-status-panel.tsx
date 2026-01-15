'use client'

import * as React from 'react'
import { useState, useEffect, useCallback } from 'react'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import {
  SimpleStatus,
  STATUS_ICONS,
  STATUS_LABELS,
  STATUS_COLORS,
  STATUS_DESCRIPTIONS,
  SERVICE_CHECKS,
  AggregatedStatus,
  CheckStatus,
  StatusIssue,
  getStatusActions
} from '@/lib/config/simple-status'
import {
  statusAggregator,
  ProjectStatusInput
} from '@/lib/services/status-aggregator'

export interface SimpleStatusPanelProps {
  /** 项目ID */
  projectId: string
  /** 状态输入数据 */
  statusInput?: ProjectStatusInput
  /** 是否自动刷新 */
  autoRefresh?: boolean
  /** 刷新间隔（秒） */
  refreshInterval?: number
  /** 刷新回调 */
  onRefresh?: () => Promise<ProjectStatusInput | undefined>
  /** 修复回调 */
  onAutoFix?: (issues: StatusIssue[]) => Promise<void>
  /** 联系客服回调 */
  onContactSupport?: () => void
  /** 查看详情回调 */
  onViewDetails?: () => void
  /** 自定义样式 */
  className?: string
  /** 尺寸 */
  size?: 'sm' | 'md' | 'lg'
  /** 是否显示详细检查项 */
  showChecks?: boolean
  /** 是否显示问题列表 */
  showIssues?: boolean
}

/**
 * 简化状态面板组件
 * 为小白用户提供红绿灯式的状态展示
 */
export function SimpleStatusPanel({
  projectId,
  statusInput,
  autoRefresh = true,
  refreshInterval = 60,
  onRefresh,
  onAutoFix,
  onContactSupport,
  onViewDetails,
  className,
  size = 'md',
  showChecks = false,
  showIssues = true
}: SimpleStatusPanelProps) {
  const [status, setStatus] = useState<AggregatedStatus | null>(null)
  const [isRefreshing, setIsRefreshing] = useState(false)
  const [isFixing, setIsFixing] = useState(false)
  const [lastRefresh, setLastRefresh] = useState<Date | null>(null)
  const [showAllChecks, setShowAllChecks] = useState(false)

  // 计算状态
  useEffect(() => {
    if (statusInput) {
      const aggregated = statusAggregator.aggregateStatus(statusInput)
      setStatus(aggregated)
      setLastRefresh(new Date())
    }
  }, [statusInput])

  // 自动刷新
  useEffect(() => {
    if (!autoRefresh || !onRefresh) return

    const timer = setInterval(async () => {
      try {
        const newInput = await onRefresh()
        if (newInput) {
          const aggregated = statusAggregator.aggregateStatus(newInput)
          setStatus(aggregated)
          setLastRefresh(new Date())
        }
      } catch (error) {
        console.error('Status refresh failed:', error)
      }
    }, refreshInterval * 1000)

    return () => clearInterval(timer)
  }, [autoRefresh, refreshInterval, onRefresh])

  // 手动刷新
  const handleRefresh = useCallback(async () => {
    if (!onRefresh || isRefreshing) return

    setIsRefreshing(true)
    try {
      const newInput = await onRefresh()
      if (newInput) {
        const aggregated = statusAggregator.aggregateStatus(newInput)
        setStatus(aggregated)
        setLastRefresh(new Date())
      }
    } catch (error) {
      console.error('Manual refresh failed:', error)
    } finally {
      setIsRefreshing(false)
    }
  }, [onRefresh, isRefreshing])

  // 一键修复
  const handleAutoFix = useCallback(async () => {
    if (!onAutoFix || !status || isFixing) return

    const fixableIssues = status.issues.filter(i => i.canAutoFix)
    if (fixableIssues.length === 0) return

    setIsFixing(true)
    try {
      await onAutoFix(fixableIssues)
      // 修复后刷新状态
      await handleRefresh()
    } catch (error) {
      console.error('Auto fix failed:', error)
    } finally {
      setIsFixing(false)
    }
  }, [onAutoFix, status, isFixing, handleRefresh])

  if (!status) {
    return (
      <Card className={cn('animate-pulse', className)}>
        <CardContent className="p-6 flex items-center justify-center">
          <div className="text-4xl animate-spin">⏳</div>
          <span className="ml-3 text-muted-foreground">检查状态中...</span>
        </CardContent>
      </Card>
    )
  }

  const { overall, score, checks, issues, uptimeDays } = status
  const colors = STATUS_COLORS[overall]
  const descriptions = STATUS_DESCRIPTIONS[overall]
  const actions = getStatusActions(overall, issues.length > 0)

  // 尺寸配置
  const sizeConfig = {
    sm: {
      icon: 'text-4xl',
      title: 'text-lg',
      subtitle: 'text-sm',
      score: 'text-2xl',
      padding: 'p-4',
      gap: 'gap-2'
    },
    md: {
      icon: 'text-6xl',
      title: 'text-xl',
      subtitle: 'text-base',
      score: 'text-3xl',
      padding: 'p-6',
      gap: 'gap-3'
    },
    lg: {
      icon: 'text-8xl',
      title: 'text-2xl',
      subtitle: 'text-lg',
      score: 'text-4xl',
      padding: 'p-8',
      gap: 'gap-4'
    }
  }

  const currentSize = sizeConfig[size]

  return (
    <Card className={cn('overflow-hidden', className)}>
      {/* 状态头部 - 带渐变背景 */}
      <div className={cn(
        'relative',
        colors.bg,
        colors.border,
        'border-b-2'
      )}>
        <CardContent className={cn('flex flex-col items-center text-center', currentSize.padding, currentSize.gap)}>
          {/* 状态图标 - 带脉动效果 */}
          <div className="relative">
            <span className={cn(currentSize.icon, 'relative z-10')}>
              {STATUS_ICONS[overall]}
            </span>
            {/* 脉动光环 */}
            {overall !== 'healthy' && (
              <div className={cn(
                'absolute inset-0 rounded-full animate-ping opacity-30',
                colors.pulse
              )} />
            )}
          </div>

          {/* 状态标题 */}
          <div className={currentSize.gap}>
            <h2 className={cn('font-bold', currentSize.title, colors.text)}>
              {descriptions.emoji} {descriptions.title}
            </h2>
            <p className={cn('text-muted-foreground', currentSize.subtitle)}>
              {descriptions.subtitle}
            </p>
          </div>

          {/* 健康度分数 */}
          <div className="flex items-baseline gap-2">
            <span className={cn('font-bold', currentSize.score, colors.text)}>
              {score}
            </span>
            <span className="text-muted-foreground text-sm">/100 健康度</span>
          </div>

          {/* 连续正常天数 */}
          {uptimeDays > 0 && overall === 'healthy' && (
            <div className="text-sm text-muted-foreground">
              已连续正常运行 <span className="font-semibold text-green-600">{uptimeDays}</span> 天
            </div>
          )}

          {/* 上次检查时间 */}
          {lastRefresh && (
            <div className="text-xs text-muted-foreground/60">
              上次检查: {lastRefresh.toLocaleTimeString('zh-CN')}
            </div>
          )}
        </CardContent>
      </div>

      {/* 操作按钮 */}
      <CardContent className={cn('flex flex-wrap justify-center', currentSize.gap, currentSize.padding)}>
        {actions.map(action => (
          <Button
            key={action.id}
            variant={action.variant}
            size={size === 'sm' ? 'sm' : 'default'}
            disabled={
              (action.actionType === 'refresh' && isRefreshing) ||
              (action.actionType === 'auto_fix' && isFixing)
            }
            onClick={() => {
              switch (action.actionType) {
                case 'refresh':
                  handleRefresh()
                  break
                case 'auto_fix':
                  handleAutoFix()
                  break
                case 'contact_support':
                  onContactSupport?.()
                  break
                case 'view_details':
                  onViewDetails?.()
                  break
              }
            }}
          >
            {action.actionType === 'refresh' && isRefreshing ? (
              <span className="animate-spin mr-2">↻</span>
            ) : action.actionType === 'auto_fix' && isFixing ? (
              <span className="animate-spin mr-2">⚙️</span>
            ) : (
              <span className="mr-2">{action.icon}</span>
            )}
            {action.actionType === 'refresh' && isRefreshing
              ? '刷新中...'
              : action.actionType === 'auto_fix' && isFixing
                ? '修复中...'
                : action.label}
          </Button>
        ))}
      </CardContent>

      {/* 问题列表 */}
      {showIssues && issues.length > 0 && (
        <CardContent className={cn('border-t pt-4', currentSize.padding)}>
          <h3 className="font-semibold text-sm mb-3 flex items-center gap-2">
            <span>⚠️</span>
            <span>需要关注的问题 ({issues.length})</span>
          </h3>
          <div className="space-y-2">
            {issues.slice(0, 3).map(issue => (
              <IssueItem key={issue.id} issue={issue} size={size} />
            ))}
            {issues.length > 3 && (
              <button
                onClick={onViewDetails}
                className="text-sm text-muted-foreground hover:text-foreground transition-colors"
              >
                查看全部 {issues.length} 个问题 →
              </button>
            )}
          </div>
        </CardContent>
      )}

      {/* 检查项详情 */}
      {showChecks && (
        <CardContent className={cn('border-t pt-4', currentSize.padding)}>
          <button
            onClick={() => setShowAllChecks(!showAllChecks)}
            className="w-full text-left font-semibold text-sm mb-3 flex items-center justify-between"
          >
            <span className="flex items-center gap-2">
              <span>📊</span>
              <span>服务状态详情</span>
            </span>
            <span className="text-muted-foreground">
              {showAllChecks ? '▲' : '▼'}
            </span>
          </button>
          {showAllChecks && (
            <div className="space-y-2">
              {checks.map(check => (
                <CheckItem key={check.checkId} check={check} size={size} />
              ))}
            </div>
          )}
        </CardContent>
      )}
    </Card>
  )
}

/**
 * 问题项组件
 */
function IssueItem({ issue, size }: { issue: StatusIssue; size: 'sm' | 'md' | 'lg' }) {
  const severityColors = {
    critical: 'border-l-red-500 bg-red-50 dark:bg-red-950/20',
    high: 'border-l-orange-500 bg-orange-50 dark:bg-orange-950/20',
    medium: 'border-l-yellow-500 bg-yellow-50 dark:bg-yellow-950/20',
    low: 'border-l-blue-500 bg-blue-50 dark:bg-blue-950/20'
  }

  return (
    <div className={cn(
      'border-l-4 rounded-r-md p-3',
      severityColors[issue.severity]
    )}>
      <div className="flex items-start justify-between gap-2">
        <div className="flex-1 min-w-0">
          <p className="font-medium text-sm">{issue.title}</p>
          <p className="text-xs text-muted-foreground mt-1">{issue.suggestion}</p>
        </div>
        {issue.canAutoFix && (
          <span className="text-xs bg-green-100 text-green-700 px-2 py-0.5 rounded-full flex-shrink-0">
            可修复
          </span>
        )}
      </div>
    </div>
  )
}

/**
 * 检查项组件
 */
function CheckItem({ check, size }: { check: CheckStatus; size: 'sm' | 'md' | 'lg' }) {
  const service = SERVICE_CHECKS.find(s => s.id === check.checkId)
  if (!service) return null

  const statusIcon = STATUS_ICONS[check.status]
  const colors = STATUS_COLORS[check.status]

  return (
    <div className={cn(
      'flex items-center gap-3 p-2 rounded-md',
      colors.bg
    )}>
      <span className="text-xl">{service.icon}</span>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <span className="font-medium text-sm">{service.name}</span>
          <span className="text-sm">{statusIcon}</span>
        </div>
        <p className="text-xs text-muted-foreground truncate">{check.message}</p>
      </div>
      {check.value && (
        <span className="text-xs text-muted-foreground flex-shrink-0">
          {check.value}
        </span>
      )}
    </div>
  )
}

/**
 * 迷你状态指示器（用于列表等场景）
 */
export function SimpleStatusIndicator({
  status,
  showLabel = true,
  size = 'md'
}: {
  status: SimpleStatus
  showLabel?: boolean
  size?: 'sm' | 'md' | 'lg'
}) {
  const icon = STATUS_ICONS[status]
  const label = STATUS_LABELS[status]
  const colors = STATUS_COLORS[status]

  const sizeClasses = {
    sm: 'text-sm',
    md: 'text-base',
    lg: 'text-lg'
  }

  return (
    <div className={cn('flex items-center gap-1.5', sizeClasses[size])}>
      <span className="relative">
        {icon}
        {status !== 'healthy' && (
          <span className={cn(
            'absolute inset-0 rounded-full animate-ping opacity-50',
            colors.pulse
          )} style={{ fontSize: '0.6em' }} />
        )}
      </span>
      {showLabel && (
        <span className={cn('font-medium', colors.text)}>{label}</span>
      )}
    </div>
  )
}

/**
 * 状态徽章（用于卡片角落等场景）
 */
export function SimpleStatusBadge({
  status,
  className
}: {
  status: SimpleStatus
  className?: string
}) {
  const icon = STATUS_ICONS[status]
  const label = STATUS_LABELS[status]
  const colors = STATUS_COLORS[status]

  return (
    <div className={cn(
      'inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium',
      colors.bg,
      colors.text,
      colors.border,
      'border',
      className
    )}>
      <span>{icon}</span>
      <span>{label}</span>
    </div>
  )
}
