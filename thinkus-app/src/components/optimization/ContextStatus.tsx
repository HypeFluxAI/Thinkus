'use client'

import { cn } from '@/lib/utils'
import type { ContextStatus as ContextStatusType } from '@/lib/optimizations'

interface ContextStatusProps {
  status: ContextStatusType
  usage: number
  usedTokens: number
  maxTokens: number
  message?: string
  className?: string
  compact?: boolean
}

const statusConfig: Record<ContextStatusType, {
  icon: string
  color: string
  bgColor: string
  barColor: string
}> = {
  normal: {
    icon: '🟢',
    color: 'text-green-600',
    bgColor: 'bg-green-50 dark:bg-green-900/20',
    barColor: 'bg-green-500'
  },
  warning: {
    icon: '🟡',
    color: 'text-yellow-600',
    bgColor: 'bg-yellow-50 dark:bg-yellow-900/20',
    barColor: 'bg-yellow-500'
  },
  critical: {
    icon: '🟠',
    color: 'text-orange-600',
    bgColor: 'bg-orange-50 dark:bg-orange-900/20',
    barColor: 'bg-orange-500'
  },
  emergency: {
    icon: '🔴',
    color: 'text-red-600',
    bgColor: 'bg-red-50 dark:bg-red-900/20',
    barColor: 'bg-red-500'
  }
}

export function ContextStatus({
  status,
  usage,
  usedTokens,
  maxTokens,
  message,
  className,
  compact = false
}: ContextStatusProps) {
  const config = statusConfig[status]
  const percentage = Math.round(usage * 100)

  const formatTokens = (tokens: number) => {
    if (tokens >= 1000000) {
      return `${(tokens / 1000000).toFixed(1)}M`
    }
    if (tokens >= 1000) {
      return `${(tokens / 1000).toFixed(1)}K`
    }
    return tokens.toString()
  }

  if (compact) {
    return (
      <div className={cn('flex items-center gap-2', className)}>
        <span>{config.icon}</span>
        <div className="h-1.5 flex-1 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
          <div
            className={cn('h-full transition-all duration-300', config.barColor)}
            style={{ width: `${percentage}%` }}
          />
        </div>
        <span className={cn('text-xs font-mono', config.color)}>
          {percentage}%
        </span>
      </div>
    )
  }

  return (
    <div className={cn('rounded-lg border p-4', config.bgColor, className)}>
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <span className="text-xl">{config.icon}</span>
          <span className="font-medium text-sm">上下文状态</span>
        </div>
        <span className={cn('text-sm font-mono', config.color)}>
          {percentage}%
        </span>
      </div>

      <div className="h-2 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden mb-3">
        <div
          className={cn('h-full transition-all duration-500', config.barColor)}
          style={{ width: `${percentage}%` }}
        />
      </div>

      <div className="flex justify-between text-xs text-muted-foreground">
        <span>已使用: {formatTokens(usedTokens)} tokens</span>
        <span>上限: {formatTokens(maxTokens)} tokens</span>
      </div>

      {message && (
        <div className={cn('mt-3 pt-3 border-t text-sm', config.color)}>
          {message}
        </div>
      )}

      {status === 'critical' && (
        <div className="mt-3 pt-3 border-t text-xs text-orange-600 dark:text-orange-400 flex items-center gap-1">
          <span className="animate-pulse">⚡</span>
          正在优化压缩中...
        </div>
      )}

      {status === 'emergency' && (
        <div className="mt-3 pt-3 border-t text-xs text-red-600 dark:text-red-400 flex items-center gap-1">
          <span className="animate-bounce">⚠️</span>
          紧急压缩中，请稍候...
        </div>
      )}
    </div>
  )
}

export function ContextStatusBadge({ status, usage }: { status: ContextStatusType; usage: number }) {
  const config = statusConfig[status]
  const percentage = Math.round(usage * 100)

  return (
    <span
      className={cn(
        'inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium',
        config.bgColor,
        config.color
      )}
    >
      <span>{config.icon}</span>
      <span>{percentage}%</span>
    </span>
  )
}
