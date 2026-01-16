'use client'

import { useState, useEffect } from 'react'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import { Progress } from '@/components/ui/progress'
import {
  errorAutoFixTree,
  type FixSession,
  type FixAttemptResult,
  type ClassifiedError,
} from '@/lib/services'

interface ErrorAutoFixPanelProps {
  session: FixSession
  onRetry?: () => void
  onContactSupport?: () => void
  className?: string
}

// 状态配置
const STATUS_CONFIG = {
  fixing: {
    title: '正在修复中...',
    icon: '🔧',
    color: 'text-blue-600',
    bgColor: 'bg-blue-500',
    message: '请稍候，正在自动处理问题'
  },
  success: {
    title: '问题已解决',
    icon: '✅',
    color: 'text-green-600',
    bgColor: 'bg-green-500',
    message: '太好了！问题已经修复'
  },
  failed: {
    title: '需要人工处理',
    icon: '❌',
    color: 'text-red-600',
    bgColor: 'bg-red-500',
    message: '抱歉，这个问题需要人工介入'
  },
  escalated: {
    title: '已转交技术支持',
    icon: '📞',
    color: 'text-purple-600',
    bgColor: 'bg-purple-500',
    message: '技术团队将在10分钟内联系您'
  },
  manual: {
    title: '需要您手动处理',
    icon: '👆',
    color: 'text-amber-600',
    bgColor: 'bg-amber-500',
    message: '请按照下方提示进行操作'
  }
}

// 策略图标
const STRATEGY_ICONS: Record<string, string> = {
  retry: '🔄',
  retry_backoff: '🔄',
  restart: '🔁',
  reconnect: '🔌',
  reconfigure: '⚙️',
  rollback: '⏪',
  fallback: '🔀',
  skip: '⏭️',
  manual: '👆',
  escalate: '📞'
}

/**
 * 错误自动修复面板
 */
export function ErrorAutoFixPanel({
  session,
  onRetry,
  onContactSupport,
  className
}: ErrorAutoFixPanelProps) {
  const [isAnimating, setIsAnimating] = useState(session.status === 'fixing')

  useEffect(() => {
    setIsAnimating(session.status === 'fixing')
  }, [session.status])

  const config = STATUS_CONFIG[session.status]
  const error = session.originalError

  return (
    <div className={cn(
      'rounded-2xl shadow-lg bg-white overflow-hidden',
      className
    )}>
      {/* 头部状态 */}
      <div className={cn('p-8 text-center text-white', config.bgColor)}>
        <div className={cn(
          'text-5xl mb-4',
          isAnimating && 'animate-spin'
        )}>
          {config.icon}
        </div>
        <h2 className="text-2xl font-bold mb-2">{config.title}</h2>
        <p className="text-white/80">{config.message}</p>
      </div>

      {/* 错误信息 */}
      <div className="px-6 py-4 bg-amber-50 border-b">
        <div className="flex items-start gap-3">
          <span className="text-xl">⚠️</span>
          <div>
            <div className="font-medium text-amber-900">
              {error.humanReadable}
            </div>
            <div className="text-sm text-amber-700 mt-1">
              {error.humanDescription}
            </div>
          </div>
        </div>
      </div>

      {/* 修复进度 */}
      {session.status === 'fixing' && (
        <div className="px-6 py-4 border-b">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm text-gray-600">修复进度</span>
            <span className="text-sm font-medium">
              {session.currentStrategyIndex + 1} / {session.strategies.length}
            </span>
          </div>
          <Progress
            value={((session.currentStrategyIndex + 1) / session.strategies.length) * 100}
            className="h-2"
          />
        </div>
      )}

      {/* 修复尝试列表 */}
      <div className="px-6 py-4">
        <h3 className="text-sm font-semibold text-gray-700 mb-4">🔧 修复过程</h3>
        <div className="space-y-3">
          {session.attempts.map((attempt, index) => (
            <FixAttemptItem key={index} attempt={attempt} />
          ))}

          {/* 正在进行的策略 */}
          {session.status === 'fixing' && session.currentStrategyIndex < session.strategies.length && (
            <div className="flex items-center gap-3 p-3 rounded-lg bg-blue-50 border border-blue-200">
              <div className="w-6 h-6 rounded-full bg-blue-500 flex items-center justify-center">
                <div className="w-3 h-3 border-2 border-white border-t-transparent rounded-full animate-spin" />
              </div>
              <div className="flex-1">
                <div className="text-sm font-medium text-blue-700">
                  {session.strategies[session.currentStrategyIndex].humanMessage}
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* 摘要 */}
      {session.humanSummary && session.status !== 'fixing' && (
        <div className="px-6 py-4 border-t bg-gray-50">
          <pre className="text-sm text-gray-600 whitespace-pre-wrap font-sans">
            {session.humanSummary}
          </pre>
        </div>
      )}

      {/* 操作按钮 */}
      <div className="px-6 py-4 border-t flex gap-3">
        {session.status === 'success' && (
          <Button className="flex-1" onClick={onRetry}>
            继续操作
          </Button>
        )}
        {(session.status === 'failed' || session.status === 'manual') && (
          <>
            <Button variant="outline" className="flex-1" onClick={onRetry}>
              重新尝试
            </Button>
            <Button className="flex-1" onClick={onContactSupport}>
              联系客服
            </Button>
          </>
        )}
        {session.status === 'escalated' && (
          <Button variant="outline" className="flex-1" onClick={onContactSupport}>
            查看工单状态
          </Button>
        )}
        {session.status === 'fixing' && (
          <Button variant="outline" className="flex-1" disabled>
            请稍候...
          </Button>
        )}
      </div>
    </div>
  )
}

/**
 * 修复尝试项
 */
function FixAttemptItem({ attempt }: { attempt: FixAttemptResult }) {
  const icon = STRATEGY_ICONS[attempt.strategy] || '🔧'
  const isSuccess = attempt.result === 'success'
  const isFailed = attempt.result === 'failed'
  const isSkipped = attempt.result === 'skipped'
  const isEscalated = attempt.result === 'escalated'

  return (
    <div className={cn(
      'flex items-center gap-3 p-3 rounded-lg',
      isSuccess ? 'bg-green-50' :
      isFailed ? 'bg-red-50' :
      isSkipped ? 'bg-gray-50' :
      isEscalated ? 'bg-purple-50' : 'bg-gray-50'
    )}>
      <div className={cn(
        'w-6 h-6 rounded-full flex items-center justify-center text-sm',
        isSuccess ? 'bg-green-500 text-white' :
        isFailed ? 'bg-red-500 text-white' :
        isSkipped ? 'bg-gray-400 text-white' :
        isEscalated ? 'bg-purple-500 text-white' : 'bg-gray-400 text-white'
      )}>
        {isSuccess ? '✓' : isFailed ? '×' : isSkipped ? '→' : isEscalated ? '↗' : icon}
      </div>
      <div className="flex-1">
        <div className={cn(
          'text-sm font-medium',
          isSuccess ? 'text-green-700' :
          isFailed ? 'text-red-700' :
          isSkipped ? 'text-gray-600' :
          isEscalated ? 'text-purple-700' : 'text-gray-600'
        )}>
          {attempt.humanMessage}
        </div>
        {attempt.durationMs > 0 && (
          <div className="text-xs text-gray-400">
            耗时 {attempt.durationMs}ms
          </div>
        )}
      </div>
    </div>
  )
}

/**
 * 错误提示横幅
 */
export function ErrorBanner({
  error,
  onFix,
  onDismiss,
  className
}: {
  error: ClassifiedError
  onFix?: () => void
  onDismiss?: () => void
  className?: string
}) {
  const severityColors = {
    low: 'bg-yellow-50 border-yellow-200 text-yellow-800',
    medium: 'bg-orange-50 border-orange-200 text-orange-800',
    high: 'bg-red-50 border-red-200 text-red-800',
    critical: 'bg-red-100 border-red-300 text-red-900'
  }

  return (
    <div className={cn(
      'rounded-lg border p-4',
      severityColors[error.severity],
      className
    )}>
      <div className="flex items-start gap-3">
        <span className="text-xl">⚠️</span>
        <div className="flex-1">
          <div className="font-medium">{error.humanReadable}</div>
          <div className="text-sm mt-1 opacity-80">{error.humanDescription}</div>
        </div>
        <div className="flex gap-2">
          {error.recoverable && onFix && (
            <Button size="sm" onClick={onFix}>
              自动修复
            </Button>
          )}
          {onDismiss && (
            <Button size="sm" variant="ghost" onClick={onDismiss}>
              ×
            </Button>
          )}
        </div>
      </div>
    </div>
  )
}

/**
 * 修复状态徽章
 */
export function FixStatusBadge({
  session,
  className
}: {
  session: FixSession
  className?: string
}) {
  const config = STATUS_CONFIG[session.status]

  return (
    <div className={cn(
      'inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm font-medium',
      session.status === 'fixing' ? 'bg-blue-100 text-blue-700' :
      session.status === 'success' ? 'bg-green-100 text-green-700' :
      session.status === 'failed' ? 'bg-red-100 text-red-700' :
      session.status === 'escalated' ? 'bg-purple-100 text-purple-700' :
      'bg-amber-100 text-amber-700',
      className
    )}>
      <span className={session.status === 'fixing' ? 'animate-spin' : ''}>
        {config.icon}
      </span>
      <span>{config.title}</span>
    </div>
  )
}
