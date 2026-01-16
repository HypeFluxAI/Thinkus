'use client'

import { useState, useEffect, useCallback } from 'react'
import { cn } from '@/lib/utils'
import { Progress } from '@/components/ui/progress'
import { Button } from '@/components/ui/button'
import {
  realtimeProgressDashboard,
  type ProgressSession,
  type ProgressStage,
  type ProgressEvent,
} from '@/lib/services'

// 阶段配置
const STAGE_CONFIG: Record<ProgressStage, {
  name: string
  icon: string
  color: string
  bgColor: string
}> = {
  queued: { name: '排队中', icon: '🎫', color: 'text-gray-600', bgColor: 'bg-gray-100' },
  preparing: { name: '准备中', icon: '🔧', color: 'text-amber-600', bgColor: 'bg-amber-100' },
  coding: { name: '制作中', icon: '👨‍💻', color: 'text-blue-600', bgColor: 'bg-blue-100' },
  testing: { name: '测试中', icon: '🧪', color: 'text-purple-600', bgColor: 'bg-purple-100' },
  fixing: { name: '优化中', icon: '🔨', color: 'text-orange-600', bgColor: 'bg-orange-100' },
  deploying: { name: '部署中', icon: '🚀', color: 'text-green-600', bgColor: 'bg-green-100' },
  configuring: { name: '配置中', icon: '⚙️', color: 'text-cyan-600', bgColor: 'bg-cyan-100' },
  verifying: { name: '验证中', icon: '✅', color: 'text-green-600', bgColor: 'bg-green-100' },
  almost_done: { name: '即将完成', icon: '🎉', color: 'text-purple-600', bgColor: 'bg-purple-100' },
  completed: { name: '已完成', icon: '🎊', color: 'text-green-600', bgColor: 'bg-green-100' },
  paused: { name: '已暂停', icon: '⏸️', color: 'text-amber-600', bgColor: 'bg-amber-100' },
  error: { name: '遇到问题', icon: '⚠️', color: 'text-red-600', bgColor: 'bg-red-100' }
}

// 鼓励话语
const ENCOURAGEMENTS = [
  '正在努力为您制作中...',
  '每一行代码都承载着您的期待',
  '精雕细琢，只为更好',
  '马上就好，请再等等~',
  '认真对待每一个细节'
]

interface RealtimeProgressProps {
  session: ProgressSession
  onRefresh?: () => void
  className?: string
}

/**
 * 实时进度追踪组件
 */
export function RealtimeProgress({
  session,
  onRefresh,
  className
}: RealtimeProgressProps) {
  const [currentEncouragement, setCurrentEncouragement] = useState(0)
  const [remainingTime, setRemainingTime] = useState(() =>
    Math.max(0, session.estimatedCompletionAt.getTime() - Date.now())
  )

  // 切换鼓励话语
  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentEncouragement(prev => (prev + 1) % ENCOURAGEMENTS.length)
    }, 5000)
    return () => clearInterval(timer)
  }, [])

  // 更新剩余时间
  useEffect(() => {
    const timer = setInterval(() => {
      setRemainingTime(Math.max(0, session.estimatedCompletionAt.getTime() - Date.now()))
    }, 1000)
    return () => clearInterval(timer)
  }, [session])

  const config = STAGE_CONFIG[session.currentStage]

  // 格式化时间
  const formatTime = (ms: number) => {
    const totalMinutes = Math.floor(ms / 60000)
    if (totalMinutes >= 60) {
      const hours = Math.floor(totalMinutes / 60)
      const mins = totalMinutes % 60
      return `${hours}小时${mins}分钟`
    }
    return `${totalMinutes}分钟`
  }

  const isCompleted = session.currentStage === 'completed'
  const isError = session.currentStage === 'error'

  return (
    <div className={cn(
      'rounded-2xl shadow-lg bg-white overflow-hidden',
      className
    )}>
      {/* 头部 - 主状态 */}
      <div
        className={cn(
          'p-8 text-center',
          isCompleted ? 'bg-gradient-to-br from-green-500 to-emerald-600' :
          isError ? 'bg-gradient-to-br from-red-500 to-rose-600' :
          'bg-gradient-to-br from-blue-500 to-indigo-600'
        )}
      >
        <div className="text-6xl mb-4 animate-bounce-slow">{config.icon}</div>
        <h2 className="text-2xl font-bold text-white mb-2">{config.name}</h2>
        <p className="text-white/80">{session.projectName}</p>
      </div>

      {/* 进度条 */}
      <div className="px-6 py-4 border-b">
        <div className="flex items-center justify-between mb-2">
          <span className="text-sm font-medium text-gray-700">整体进度</span>
          <span className={cn('text-lg font-bold', config.color)}>
            {session.overallProgress}%
          </span>
        </div>
        <Progress value={session.overallProgress} className="h-3" />
      </div>

      {/* 预计时间 */}
      {!isCompleted && !isError && (
        <div className="px-6 py-4 border-b bg-gray-50">
          <div className="flex items-center gap-3">
            <span className="text-2xl">⏰</span>
            <div>
              <div className="text-sm text-gray-500">预计剩余时间</div>
              <div className="text-xl font-bold text-gray-900">
                {formatTime(remainingTime)}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 鼓励话语 */}
      {!isCompleted && !isError && (
        <div className={cn('px-6 py-4 text-center', config.bgColor)}>
          <p className={cn('font-medium', config.color)}>
            💪 {ENCOURAGEMENTS[currentEncouragement]}
          </p>
        </div>
      )}

      {/* 阶段时间线 */}
      <div className="px-6 py-4">
        <h3 className="text-sm font-semibold text-gray-700 mb-4">📋 制作阶段</h3>
        <div className="space-y-3">
          {Object.entries(STAGE_CONFIG)
            .filter(([key]) => !['paused', 'error'].includes(key))
            .map(([key, stageConfig]) => {
              const stageKey = key as ProgressStage
              const isCurrent = session.currentStage === stageKey
              const isPast = session.overallProgress > getStageProgress(stageKey)
              const isFuture = !isCurrent && !isPast

              return (
                <div
                  key={key}
                  className={cn(
                    'flex items-center gap-3 p-2 rounded-lg transition-colors',
                    isCurrent && 'bg-blue-50',
                    isPast && 'opacity-60'
                  )}
                >
                  <div className={cn(
                    'w-8 h-8 rounded-full flex items-center justify-center text-lg',
                    isCurrent ? stageConfig.bgColor :
                    isPast ? 'bg-green-100' : 'bg-gray-100'
                  )}>
                    {isPast ? '✅' : stageConfig.icon}
                  </div>
                  <div className="flex-1">
                    <div className={cn(
                      'text-sm font-medium',
                      isCurrent ? stageConfig.color : 'text-gray-600'
                    )}>
                      {stageConfig.name}
                    </div>
                  </div>
                  {isCurrent && (
                    <span className="text-xs text-blue-600 bg-blue-100 px-2 py-0.5 rounded-full">
                      进行中
                    </span>
                  )}
                </div>
              )
            })}
        </div>
      </div>

      {/* 最近动态 */}
      {session.events.length > 0 && (
        <div className="px-6 py-4 border-t">
          <h3 className="text-sm font-semibold text-gray-700 mb-3">📜 最近动态</h3>
          <div className="space-y-2">
            {session.events.slice(-5).reverse().map((event, index) => (
              <div key={event.id} className="flex items-start gap-2 text-sm">
                <span className="text-gray-400 w-12 shrink-0">
                  {new Date(event.timestamp).toLocaleTimeString('zh-CN', {
                    hour: '2-digit',
                    minute: '2-digit'
                  })}
                </span>
                <span className={cn(
                  event.isError ? 'text-red-600' : 'text-gray-600'
                )}>
                  {event.message}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* 底部 - 实时查看人数 */}
      <div className="px-6 py-3 bg-gray-50 border-t flex items-center justify-between">
        <div className="flex items-center gap-2 text-sm text-gray-500">
          <span className="w-2 h-2 bg-green-500 rounded-full animate-pulse" />
          {session.subscriberCount} 人正在查看
        </div>
        {onRefresh && (
          <Button variant="ghost" size="sm" onClick={onRefresh}>
            刷新
          </Button>
        )}
      </div>
    </div>
  )
}

// 获取阶段进度
function getStageProgress(stage: ProgressStage): number {
  const progressMap: Record<ProgressStage, number> = {
    queued: 5,
    preparing: 10,
    coding: 40,
    testing: 60,
    fixing: 65,
    deploying: 80,
    configuring: 90,
    verifying: 95,
    almost_done: 98,
    completed: 100,
    paused: -1,
    error: -1
  }
  return progressMap[stage] ?? 0
}

/**
 * 迷你进度卡片
 */
export function ProgressMiniCard({
  session,
  onClick,
  className
}: {
  session: ProgressSession
  onClick?: () => void
  className?: string
}) {
  const config = STAGE_CONFIG[session.currentStage]

  return (
    <div
      className={cn(
        'p-4 rounded-xl bg-white shadow border cursor-pointer hover:shadow-md transition-shadow',
        className
      )}
      onClick={onClick}
    >
      <div className="flex items-center gap-3">
        <div className={cn(
          'w-12 h-12 rounded-xl flex items-center justify-center text-2xl',
          config.bgColor
        )}>
          {config.icon}
        </div>
        <div className="flex-1 min-w-0">
          <div className="text-sm font-medium text-gray-900 truncate">
            {session.projectName}
          </div>
          <div className={cn('text-sm', config.color)}>
            {config.name} · {session.overallProgress}%
          </div>
        </div>
        <Progress value={session.overallProgress} className="w-16 h-2" />
      </div>
    </div>
  )
}

/**
 * 悬浮进度指示器
 */
export function FloatingProgressIndicator({
  session,
  onClick,
  className
}: {
  session: ProgressSession
  onClick?: () => void
  className?: string
}) {
  const config = STAGE_CONFIG[session.currentStage]
  const isCompleted = session.currentStage === 'completed'

  if (isCompleted) return null

  return (
    <div
      className={cn(
        'fixed bottom-6 right-6 z-50 cursor-pointer',
        'bg-white rounded-2xl shadow-lg border p-4',
        'hover:shadow-xl transition-shadow',
        className
      )}
      onClick={onClick}
    >
      <div className="flex items-center gap-3">
        <div className={cn(
          'w-12 h-12 rounded-xl flex items-center justify-center text-2xl animate-pulse',
          config.bgColor
        )}>
          {config.icon}
        </div>
        <div>
          <div className={cn('text-sm font-semibold', config.color)}>
            {config.name}
          </div>
          <div className="text-xs text-gray-500">
            进度 {session.overallProgress}%
          </div>
        </div>
      </div>

      {/* 进度环 */}
      <svg className="absolute -top-1 -right-1 w-6 h-6" viewBox="0 0 24 24">
        <circle
          className="text-gray-200"
          strokeWidth="3"
          stroke="currentColor"
          fill="transparent"
          r="10"
          cx="12"
          cy="12"
        />
        <circle
          className={config.color}
          strokeWidth="3"
          strokeLinecap="round"
          stroke="currentColor"
          fill="transparent"
          r="10"
          cx="12"
          cy="12"
          style={{
            strokeDasharray: `${2 * Math.PI * 10}`,
            strokeDashoffset: `${2 * Math.PI * 10 * (1 - session.overallProgress / 100)}`,
            transform: 'rotate(-90deg)',
            transformOrigin: '12px 12px'
          }}
        />
      </svg>
    </div>
  )
}

// 添加自定义动画
const styles = `
  @keyframes bounce-slow {
    0%, 100% { transform: translateY(0); }
    50% { transform: translateY(-10px); }
  }
  .animate-bounce-slow {
    animation: bounce-slow 2s ease-in-out infinite;
  }
`

// 注入样式
if (typeof document !== 'undefined') {
  const styleSheet = document.createElement('style')
  styleSheet.textContent = styles
  document.head.appendChild(styleSheet)
}
