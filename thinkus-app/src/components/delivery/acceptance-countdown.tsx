'use client'

import { useState, useEffect, useCallback } from 'react'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import { Progress } from '@/components/ui/progress'
import {
  acceptanceTimeoutHandler,
  type TimeoutSession,
  type TimeoutStatus,
  DEFAULT_TIMEOUT_CONFIG,
} from '@/lib/services'

interface AcceptanceCountdownProps {
  session: TimeoutSession
  onContinue?: () => void
  onNeedHelp?: () => void
  onAutoPass?: () => void
  className?: string
}

// 状态配置
const STATUS_CONFIG: Record<TimeoutStatus, {
  color: string
  bgColor: string
  label: string
  icon: string
}> = {
  active: {
    color: 'text-green-600',
    bgColor: 'bg-green-50',
    label: '进行中',
    icon: '✅'
  },
  warning: {
    color: 'text-amber-600',
    bgColor: 'bg-amber-50',
    label: '请加快',
    icon: '⚠️'
  },
  final_warning: {
    color: 'text-red-600',
    bgColor: 'bg-red-50',
    label: '即将超时',
    icon: '🚨'
  },
  auto_passed: {
    color: 'text-blue-600',
    bgColor: 'bg-blue-50',
    label: '已自动通过',
    icon: '✅'
  },
  escalated: {
    color: 'text-purple-600',
    bgColor: 'bg-purple-50',
    label: '人工处理中',
    icon: '📞'
  },
  completed: {
    color: 'text-green-600',
    bgColor: 'bg-green-50',
    label: '已完成',
    icon: '🎉'
  }
}

/**
 * 验收倒计时组件
 */
export function AcceptanceCountdown({
  session,
  onContinue,
  onNeedHelp,
  onAutoPass,
  className
}: AcceptanceCountdownProps) {
  const [remainingMs, setRemainingMs] = useState(() =>
    Math.max(0, session.expiresAt.getTime() - Date.now())
  )
  const [status, setStatus] = useState<TimeoutStatus>(session.status)

  // 更新倒计时
  useEffect(() => {
    const timer = setInterval(() => {
      const remaining = Math.max(0, session.expiresAt.getTime() - Date.now())
      setRemainingMs(remaining)

      // 更新状态
      if (remaining <= 0 && status !== 'completed' && status !== 'auto_passed') {
        setStatus('auto_passed')
        onAutoPass?.()
      } else if (remaining <= session.config.finalWarningMs && status === 'active') {
        setStatus('final_warning')
      } else if (remaining <= session.config.finalWarningMs * 2 && status === 'active') {
        setStatus('warning')
      }
    }, 1000)

    return () => clearInterval(timer)
  }, [session, status, onAutoPass])

  // 格式化时间
  const formatTime = (ms: number) => {
    const totalSeconds = Math.floor(ms / 1000)
    const minutes = Math.floor(totalSeconds / 60)
    const seconds = totalSeconds % 60

    if (minutes > 0) {
      return `${minutes}:${seconds.toString().padStart(2, '0')}`
    }
    return `${seconds}秒`
  }

  // 计算进度百分比
  const progressPercent = (remainingMs / session.config.sessionTimeoutMs) * 100

  const config = STATUS_CONFIG[status]

  // 已完成或自动通过时的简化显示
  if (status === 'completed' || status === 'auto_passed' || status === 'escalated') {
    return (
      <div className={cn(
        'rounded-2xl p-6 text-center',
        config.bgColor,
        className
      )}>
        <div className="text-4xl mb-3">{config.icon}</div>
        <div className={cn('text-lg font-semibold', config.color)}>
          {config.label}
        </div>
        {status === 'auto_passed' && (
          <p className="text-sm text-gray-600 mt-2">
            验收已自动通过，我们会安排人工复查确保一切正常
          </p>
        )}
        {status === 'escalated' && (
          <p className="text-sm text-gray-600 mt-2">
            已为您转接人工客服，马上有人联系您
          </p>
        )}
      </div>
    )
  }

  return (
    <div className={cn(
      'rounded-2xl shadow-lg bg-white overflow-hidden',
      className
    )}>
      {/* 头部 */}
      <div className={cn('px-5 py-3 flex items-center justify-between', config.bgColor)}>
        <div className="flex items-center gap-2">
          <span className="text-lg">⏰</span>
          <span className="font-medium text-gray-700">验收倒计时</span>
        </div>
        <span className={cn(
          'text-xs font-medium px-2.5 py-1 rounded-full',
          config.bgColor,
          config.color
        )}>
          {config.label}
        </span>
      </div>

      {/* 倒计时 */}
      <div className="p-6">
        <div className={cn(
          'text-5xl font-bold text-center tabular-nums mb-4',
          config.color
        )}>
          {formatTime(remainingMs)}
        </div>

        {/* 进度条 */}
        <div className="mb-4">
          <Progress
            value={progressPercent}
            className="h-2"
            style={{
              '--progress-color': status === 'final_warning' ? '#dc2626' :
                                  status === 'warning' ? '#d97706' : '#22c55e'
            } as React.CSSProperties}
          />
        </div>

        {/* 提示消息 */}
        <p className="text-sm text-gray-600 text-center mb-6">
          {status === 'active' && '请按照提示完成每一项检查，确认您的产品正常工作'}
          {status === 'warning' && '时间不多了，请尽快完成剩余的检查项目'}
          {status === 'final_warning' && '即将自动完成验收，如需继续请点击下方按钮'}
        </p>

        {/* 操作按钮 */}
        <div className="flex gap-3">
          <Button
            onClick={onContinue}
            className="flex-1"
            variant={status === 'final_warning' ? 'destructive' : 'default'}
          >
            继续验收
          </Button>
          <Button
            onClick={onNeedHelp}
            variant="outline"
            className="flex-1"
          >
            需要帮助
          </Button>
        </div>
      </div>
    </div>
  )
}

/**
 * 迷你倒计时徽章
 */
export function AcceptanceCountdownBadge({
  session,
  className
}: {
  session: TimeoutSession
  className?: string
}) {
  const [remainingMs, setRemainingMs] = useState(() =>
    Math.max(0, session.expiresAt.getTime() - Date.now())
  )

  useEffect(() => {
    const timer = setInterval(() => {
      setRemainingMs(Math.max(0, session.expiresAt.getTime() - Date.now()))
    }, 1000)
    return () => clearInterval(timer)
  }, [session])

  const formatTime = (ms: number) => {
    const totalSeconds = Math.floor(ms / 1000)
    const minutes = Math.floor(totalSeconds / 60)
    const seconds = totalSeconds % 60
    return `${minutes}:${seconds.toString().padStart(2, '0')}`
  }

  const isUrgent = remainingMs < 60000 // 最后1分钟

  return (
    <div className={cn(
      'inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm font-medium',
      isUrgent ? 'bg-red-100 text-red-700 animate-pulse' : 'bg-gray-100 text-gray-700',
      className
    )}>
      <span>⏰</span>
      <span className="tabular-nums">{formatTime(remainingMs)}</span>
    </div>
  )
}

/**
 * 悬浮倒计时条
 */
export function AcceptanceCountdownBar({
  session,
  onExpand,
  className
}: {
  session: TimeoutSession
  onExpand?: () => void
  className?: string
}) {
  const [remainingMs, setRemainingMs] = useState(() =>
    Math.max(0, session.expiresAt.getTime() - Date.now())
  )

  useEffect(() => {
    const timer = setInterval(() => {
      setRemainingMs(Math.max(0, session.expiresAt.getTime() - Date.now()))
    }, 1000)
    return () => clearInterval(timer)
  }, [session])

  const progressPercent = (remainingMs / session.config.sessionTimeoutMs) * 100
  const isUrgent = remainingMs < 60000

  const formatTime = (ms: number) => {
    const totalSeconds = Math.floor(ms / 1000)
    const minutes = Math.floor(totalSeconds / 60)
    const seconds = totalSeconds % 60
    return `${minutes}:${seconds.toString().padStart(2, '0')}`
  }

  return (
    <div
      className={cn(
        'fixed bottom-0 left-0 right-0 z-50 cursor-pointer',
        'bg-white border-t shadow-lg',
        className
      )}
      onClick={onExpand}
    >
      {/* 进度条 */}
      <div
        className={cn(
          'h-1 transition-all duration-1000',
          isUrgent ? 'bg-red-500' : 'bg-green-500'
        )}
        style={{ width: `${progressPercent}%` }}
      />

      {/* 内容 */}
      <div className="px-4 py-3 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <span className={cn(
            'text-2xl',
            isUrgent && 'animate-bounce'
          )}>
            ⏰
          </span>
          <div>
            <div className="text-sm font-medium text-gray-900">
              验收倒计时
            </div>
            <div className={cn(
              'text-xs',
              isUrgent ? 'text-red-600' : 'text-gray-500'
            )}>
              {isUrgent ? '请尽快完成验收' : '点击查看详情'}
            </div>
          </div>
        </div>

        <div className={cn(
          'text-2xl font-bold tabular-nums',
          isUrgent ? 'text-red-600' : 'text-gray-900'
        )}>
          {formatTime(remainingMs)}
        </div>
      </div>
    </div>
  )
}
