'use client'

import { useMemo } from 'react'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import {
  formatDuration,
  STAGE_CONFIG,
  ACCEPTANCE_STATUS_CONFIG,
  calculateStageProgress,
} from '@/lib/utils/delivery'
import type { ProgressSession, TimeoutSession } from '@/lib/services'

// 交付整体状态
type OverallStatus = 'in_progress' | 'acceptance' | 'completed' | 'error' | 'paused'

// 状态配置
const OVERALL_STATUS_CONFIG: Record<OverallStatus, {
  label: string
  icon: string
  color: string
  bgColor: string
  borderColor: string
  description: string
}> = {
  in_progress: {
    label: '制作中',
    icon: '🚀',
    color: 'text-blue-600',
    bgColor: 'bg-blue-50',
    borderColor: 'border-blue-200',
    description: '您的产品正在制作中，请耐心等待',
  },
  acceptance: {
    label: '待验收',
    icon: '✅',
    color: 'text-green-600',
    bgColor: 'bg-green-50',
    borderColor: 'border-green-200',
    description: '产品已制作完成，请尽快验收确认',
  },
  completed: {
    label: '已完成',
    icon: '🎉',
    color: 'text-emerald-600',
    bgColor: 'bg-emerald-50',
    borderColor: 'border-emerald-200',
    description: '恭喜！您的产品已成功交付',
  },
  error: {
    label: '需处理',
    icon: '⚠️',
    color: 'text-red-600',
    bgColor: 'bg-red-50',
    borderColor: 'border-red-200',
    description: '遇到了一些问题，我们正在处理',
  },
  paused: {
    label: '已暂停',
    icon: '⏸️',
    color: 'text-amber-600',
    bgColor: 'bg-amber-50',
    borderColor: 'border-amber-200',
    description: '交付已暂停，等待进一步操作',
  },
}

interface DeliveryOverviewProps {
  projectName?: string
  progressSession?: ProgressSession | null
  acceptanceSession?: TimeoutSession | null
  isConnected?: boolean
  unreadNotifications?: number
  onViewProgress?: () => void
  onViewAcceptance?: () => void
  onViewNotifications?: () => void
  onContactSupport?: () => void
  className?: string
}

/**
 * 交付状态概览组件
 * 用于在项目详情页显示交付的整体状态摘要
 */
export function DeliveryOverview({
  projectName = '我的项目',
  progressSession,
  acceptanceSession,
  isConnected = false,
  unreadNotifications = 0,
  onViewProgress,
  onViewAcceptance,
  onViewNotifications,
  onContactSupport,
  className = '',
}: DeliveryOverviewProps) {
  // 计算整体状态
  const overallStatus = useMemo((): OverallStatus => {
    if (!progressSession) return 'in_progress'

    if (progressSession.currentStage === 'error') return 'error'
    if (progressSession.currentStage === 'paused') return 'paused'
    if (progressSession.currentStage === 'completed') {
      // 检查是否在验收阶段
      if (acceptanceSession && acceptanceSession.status !== 'completed') {
        return 'acceptance'
      }
      return 'completed'
    }

    return 'in_progress'
  }, [progressSession, acceptanceSession])

  const statusConfig = OVERALL_STATUS_CONFIG[overallStatus]

  // 计算进度
  const progress = progressSession
    ? progressSession.overallProgress || calculateStageProgress(progressSession.currentStage as keyof typeof STAGE_CONFIG)
    : 0

  // 计算预计时间
  const estimatedTime = useMemo(() => {
    if (!progressSession?.estimatedCompletionAt) return null
    const remaining = new Date(progressSession.estimatedCompletionAt).getTime() - Date.now()
    if (remaining <= 0) return '即将完成'
    return formatDuration(remaining)
  }, [progressSession?.estimatedCompletionAt])

  // 获取当前阶段信息
  const currentStage = progressSession?.currentStage
    ? STAGE_CONFIG[progressSession.currentStage as keyof typeof STAGE_CONFIG]
    : null

  return (
    <div className={cn(
      'rounded-2xl border-2 p-6 transition-all',
      statusConfig.bgColor,
      statusConfig.borderColor,
      className
    )}>
      {/* 头部状态 */}
      <div className="flex items-start justify-between mb-6">
        <div className="flex items-center gap-4">
          <div className={cn(
            'w-16 h-16 rounded-2xl flex items-center justify-center text-3xl',
            overallStatus === 'in_progress' && 'animate-pulse',
            'bg-white shadow-sm'
          )}>
            {statusConfig.icon}
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className={cn('text-xl font-bold', statusConfig.color)}>
                {statusConfig.label}
              </h3>
              {/* 连接状态 */}
              <span className={cn(
                'inline-flex items-center gap-1 text-xs px-2 py-0.5 rounded-full',
                isConnected ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'
              )}>
                <span className={cn(
                  'w-1.5 h-1.5 rounded-full',
                  isConnected ? 'bg-green-500 animate-pulse' : 'bg-gray-400'
                )} />
                {isConnected ? '实时' : '离线'}
              </span>
            </div>
            <p className="text-sm text-gray-600 mt-1">
              {projectName}
            </p>
          </div>
        </div>

        {/* 通知徽章 */}
        {unreadNotifications > 0 && (
          <button
            onClick={onViewNotifications}
            className="relative p-2 hover:bg-white/50 rounded-full transition-colors"
          >
            <span className="text-2xl">🔔</span>
            <span className="absolute -top-1 -right-1 w-5 h-5 bg-red-500 text-white text-xs rounded-full flex items-center justify-center">
              {unreadNotifications > 9 ? '9+' : unreadNotifications}
            </span>
          </button>
        )}
      </div>

      {/* 进度条 */}
      <div className="mb-6">
        <div className="flex items-center justify-between text-sm mb-2">
          <span className="text-gray-600">
            {currentStage ? `${currentStage.icon} ${currentStage.name}` : '准备中'}
          </span>
          <span className={cn('font-semibold', statusConfig.color)}>
            {progress}%
          </span>
        </div>
        <div className="w-full h-3 bg-white rounded-full overflow-hidden shadow-inner">
          <div
            className={cn(
              'h-full rounded-full transition-all duration-500',
              overallStatus === 'error' ? 'bg-red-500' :
              overallStatus === 'completed' ? 'bg-emerald-500' :
              'bg-gradient-to-r from-blue-500 to-blue-600'
            )}
            style={{ width: `${progress}%` }}
          />
        </div>
      </div>

      {/* 状态描述 */}
      <p className="text-sm text-gray-600 mb-4">
        {statusConfig.description}
      </p>

      {/* 快捷信息 */}
      <div className="grid grid-cols-2 gap-4 mb-6">
        <div className="bg-white/60 rounded-lg p-3">
          <div className="text-xs text-gray-500 mb-1">预计剩余</div>
          <div className="font-semibold text-gray-800">
            {estimatedTime || '计算中...'}
          </div>
        </div>
        <div className="bg-white/60 rounded-lg p-3">
          <div className="text-xs text-gray-500 mb-1">验收状态</div>
          <div className="font-semibold text-gray-800">
            {acceptanceSession
              ? ACCEPTANCE_STATUS_CONFIG[acceptanceSession.status as keyof typeof ACCEPTANCE_STATUS_CONFIG]?.label || '等待中'
              : '等待中'}
          </div>
        </div>
      </div>

      {/* 操作按钮 */}
      <div className="flex items-center gap-3">
        {overallStatus === 'acceptance' ? (
          <Button onClick={onViewAcceptance} className="flex-1">
            开始验收
          </Button>
        ) : overallStatus === 'completed' ? (
          <Button onClick={onViewAcceptance} className="flex-1 bg-emerald-600 hover:bg-emerald-700">
            查看交付结果
          </Button>
        ) : (
          <Button onClick={onViewProgress} className="flex-1">
            查看详情
          </Button>
        )}
        <Button variant="outline" onClick={onContactSupport}>
          联系客服
        </Button>
      </div>
    </div>
  )
}

/**
 * 迷你交付状态卡片
 * 用于在列表或侧边栏中显示
 */
export function DeliveryOverviewMini({
  projectName = '我的项目',
  progressSession,
  onClick,
  className = '',
}: {
  projectName?: string
  progressSession?: ProgressSession | null
  onClick?: () => void
  className?: string
}) {
  const progress = progressSession?.overallProgress || 0
  const currentStage = progressSession?.currentStage
    ? STAGE_CONFIG[progressSession.currentStage as keyof typeof STAGE_CONFIG]
    : null

  const isCompleted = progressSession?.currentStage === 'completed'
  const isError = progressSession?.currentStage === 'error'

  return (
    <button
      onClick={onClick}
      className={cn(
        'w-full text-left p-4 rounded-xl border transition-all hover:shadow-md',
        isError ? 'bg-red-50 border-red-200' :
        isCompleted ? 'bg-emerald-50 border-emerald-200' :
        'bg-white border-gray-200 hover:border-blue-300',
        className
      )}
    >
      <div className="flex items-center gap-3 mb-3">
        <span className="text-2xl">
          {isError ? '⚠️' : isCompleted ? '🎉' : currentStage?.icon || '⏳'}
        </span>
        <div className="flex-1 min-w-0">
          <div className="font-medium text-gray-900 truncate">{projectName}</div>
          <div className="text-xs text-gray-500">
            {currentStage?.name || '准备中'}
          </div>
        </div>
        <span className={cn(
          'text-sm font-semibold',
          isError ? 'text-red-600' :
          isCompleted ? 'text-emerald-600' :
          'text-blue-600'
        )}>
          {progress}%
        </span>
      </div>
      <div className="w-full h-1.5 bg-gray-200 rounded-full overflow-hidden">
        <div
          className={cn(
            'h-full rounded-full transition-all duration-300',
            isError ? 'bg-red-500' :
            isCompleted ? 'bg-emerald-500' :
            'bg-blue-500'
          )}
          style={{ width: `${progress}%` }}
        />
      </div>
    </button>
  )
}

/**
 * 交付状态徽章
 * 用于在项目卡片角落显示状态
 */
export function DeliveryStatusBadge({
  status,
  progress,
  className = '',
}: {
  status?: string
  progress?: number
  className?: string
}) {
  const isCompleted = status === 'completed'
  const isError = status === 'error'
  const isPaused = status === 'paused'

  return (
    <div className={cn(
      'inline-flex items-center gap-1.5 px-2 py-1 rounded-full text-xs font-medium',
      isError ? 'bg-red-100 text-red-700' :
      isCompleted ? 'bg-emerald-100 text-emerald-700' :
      isPaused ? 'bg-amber-100 text-amber-700' :
      'bg-blue-100 text-blue-700',
      className
    )}>
      {isError ? (
        <>
          <span className="w-1.5 h-1.5 rounded-full bg-red-500" />
          需处理
        </>
      ) : isCompleted ? (
        <>
          <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
          已完成
        </>
      ) : isPaused ? (
        <>
          <span className="w-1.5 h-1.5 rounded-full bg-amber-500" />
          已暂停
        </>
      ) : (
        <>
          <span className="w-1.5 h-1.5 rounded-full bg-blue-500 animate-pulse" />
          {progress !== undefined ? `${progress}%` : '进行中'}
        </>
      )}
    </div>
  )
}
