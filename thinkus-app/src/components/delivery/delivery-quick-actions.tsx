'use client'

import { useState } from 'react'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import type { ProgressSession, TimeoutSession } from '@/lib/services'

// 快捷操作类型
type QuickActionType =
  | 'view_progress'
  | 'start_acceptance'
  | 'first_login'
  | 'run_diagnosis'
  | 'contact_support'
  | 'view_notifications'
  | 'download_report'
  | 'view_credentials'

// 快捷操作配置
interface QuickActionConfig {
  id: QuickActionType
  label: string
  icon: string
  description: string
  color: string
  bgColor: string
  borderColor: string
  available: (context: QuickActionContext) => boolean
  priority: number
}

interface QuickActionContext {
  progressSession?: ProgressSession | null
  acceptanceSession?: TimeoutSession | null
  hasUnreadNotifications: boolean
  isDelivered: boolean
  hasErrors: boolean
}

const QUICK_ACTIONS: QuickActionConfig[] = [
  {
    id: 'view_progress',
    label: '查看进度',
    icon: '🚀',
    description: '实时追踪交付进度',
    color: 'text-blue-600',
    bgColor: 'bg-blue-50',
    borderColor: 'border-blue-200',
    available: (ctx) => !!ctx.progressSession && ctx.progressSession.currentStage !== 'completed',
    priority: 1,
  },
  {
    id: 'start_acceptance',
    label: '开始验收',
    icon: '✅',
    description: '检查并确认产品交付',
    color: 'text-green-600',
    bgColor: 'bg-green-50',
    borderColor: 'border-green-200',
    available: (ctx) => ctx.isDelivered && !ctx.acceptanceSession,
    priority: 2,
  },
  {
    id: 'first_login',
    label: '首次登录',
    icon: '🔐',
    description: '获取登录凭证并登录',
    color: 'text-purple-600',
    bgColor: 'bg-purple-50',
    borderColor: 'border-purple-200',
    available: (ctx) => ctx.isDelivered,
    priority: 3,
  },
  {
    id: 'run_diagnosis',
    label: '一键诊断',
    icon: '🔍',
    description: '检测并解决常见问题',
    color: 'text-amber-600',
    bgColor: 'bg-amber-50',
    borderColor: 'border-amber-200',
    available: () => true,
    priority: 4,
  },
  {
    id: 'view_notifications',
    label: '查看通知',
    icon: '🔔',
    description: '查看系统通知和更新',
    color: 'text-red-600',
    bgColor: 'bg-red-50',
    borderColor: 'border-red-200',
    available: (ctx) => ctx.hasUnreadNotifications,
    priority: 5,
  },
  {
    id: 'view_credentials',
    label: '查看凭证',
    icon: '🔑',
    description: '获取登录账号密码',
    color: 'text-indigo-600',
    bgColor: 'bg-indigo-50',
    borderColor: 'border-indigo-200',
    available: (ctx) => ctx.isDelivered,
    priority: 6,
  },
  {
    id: 'download_report',
    label: '下载报告',
    icon: '📄',
    description: '下载交付报告文档',
    color: 'text-teal-600',
    bgColor: 'bg-teal-50',
    borderColor: 'border-teal-200',
    available: (ctx) => ctx.isDelivered,
    priority: 7,
  },
  {
    id: 'contact_support',
    label: '联系客服',
    icon: '💬',
    description: '获取人工帮助支持',
    color: 'text-gray-600',
    bgColor: 'bg-gray-50',
    borderColor: 'border-gray-200',
    available: () => true,
    priority: 8,
  },
]

interface DeliveryQuickActionsProps {
  progressSession?: ProgressSession | null
  acceptanceSession?: TimeoutSession | null
  unreadNotifications?: number
  onAction: (action: QuickActionType) => void
  maxActions?: number
  className?: string
}

/**
 * 交付快捷操作组件
 * 显示最相关的快捷操作按钮
 */
export function DeliveryQuickActions({
  progressSession,
  acceptanceSession,
  unreadNotifications = 0,
  onAction,
  maxActions = 4,
  className = '',
}: DeliveryQuickActionsProps) {
  const [hoveredAction, setHoveredAction] = useState<QuickActionType | null>(null)

  // 构建上下文
  const context: QuickActionContext = {
    progressSession,
    acceptanceSession,
    hasUnreadNotifications: unreadNotifications > 0,
    isDelivered: progressSession?.currentStage === 'completed',
    hasErrors: progressSession?.currentStage === 'error',
  }

  // 过滤和排序可用的操作
  const availableActions = QUICK_ACTIONS
    .filter(action => action.available(context))
    .sort((a, b) => a.priority - b.priority)
    .slice(0, maxActions)

  if (availableActions.length === 0) {
    return null
  }

  return (
    <div className={cn('grid grid-cols-2 md:grid-cols-4 gap-3', className)}>
      {availableActions.map(action => (
        <button
          key={action.id}
          onClick={() => onAction(action.id)}
          onMouseEnter={() => setHoveredAction(action.id)}
          onMouseLeave={() => setHoveredAction(null)}
          className={cn(
            'relative p-4 rounded-xl border-2 transition-all text-left',
            'hover:shadow-md hover:-translate-y-0.5',
            action.bgColor,
            action.borderColor,
            hoveredAction === action.id && 'ring-2 ring-offset-2 ring-blue-500'
          )}
        >
          <div className="text-2xl mb-2">{action.icon}</div>
          <div className={cn('font-semibold text-sm', action.color)}>
            {action.label}
          </div>
          <div className="text-xs text-gray-500 mt-1 line-clamp-2">
            {action.description}
          </div>

          {/* 未读通知徽章 */}
          {action.id === 'view_notifications' && unreadNotifications > 0 && (
            <span className="absolute -top-1 -right-1 w-5 h-5 bg-red-500 text-white text-xs rounded-full flex items-center justify-center">
              {unreadNotifications > 9 ? '9+' : unreadNotifications}
            </span>
          )}
        </button>
      ))}
    </div>
  )
}

/**
 * 紧凑型快捷操作栏
 * 用于页面顶部或底部的水平操作条
 */
export function DeliveryQuickActionsBar({
  progressSession,
  acceptanceSession,
  unreadNotifications = 0,
  onAction,
  className = '',
}: DeliveryQuickActionsProps) {
  const context: QuickActionContext = {
    progressSession,
    acceptanceSession,
    hasUnreadNotifications: unreadNotifications > 0,
    isDelivered: progressSession?.currentStage === 'completed',
    hasErrors: progressSession?.currentStage === 'error',
  }

  const availableActions = QUICK_ACTIONS
    .filter(action => action.available(context))
    .sort((a, b) => a.priority - b.priority)
    .slice(0, 6)

  return (
    <div className={cn(
      'flex items-center gap-2 p-3 bg-white rounded-xl shadow-sm border overflow-x-auto',
      className
    )}>
      <span className="text-sm font-medium text-gray-500 shrink-0 mr-2">
        快捷操作
      </span>
      {availableActions.map(action => (
        <Button
          key={action.id}
          variant="ghost"
          size="sm"
          onClick={() => onAction(action.id)}
          className={cn(
            'shrink-0 gap-1.5',
            action.color
          )}
        >
          <span>{action.icon}</span>
          <span>{action.label}</span>
          {action.id === 'view_notifications' && unreadNotifications > 0 && (
            <span className="ml-1 px-1.5 py-0.5 bg-red-500 text-white text-xs rounded-full">
              {unreadNotifications}
            </span>
          )}
        </Button>
      ))}
    </div>
  )
}

/**
 * 悬浮快捷操作按钮
 * 固定在页面角落，展开显示操作列表
 */
export function FloatingQuickActions({
  progressSession,
  acceptanceSession,
  unreadNotifications = 0,
  onAction,
  position = 'bottom-left',
  className = '',
}: DeliveryQuickActionsProps & {
  position?: 'bottom-left' | 'bottom-right' | 'top-left' | 'top-right'
}) {
  const [isExpanded, setIsExpanded] = useState(false)

  const context: QuickActionContext = {
    progressSession,
    acceptanceSession,
    hasUnreadNotifications: unreadNotifications > 0,
    isDelivered: progressSession?.currentStage === 'completed',
    hasErrors: progressSession?.currentStage === 'error',
  }

  const availableActions = QUICK_ACTIONS
    .filter(action => action.available(context))
    .sort((a, b) => a.priority - b.priority)
    .slice(0, 5)

  const positionClasses = {
    'bottom-left': 'bottom-6 left-6',
    'bottom-right': 'bottom-6 right-6',
    'top-left': 'top-6 left-6',
    'top-right': 'top-6 right-6',
  }

  const expandDirection = position.includes('bottom') ? 'bottom-to-top' : 'top-to-bottom'

  return (
    <div className={cn(
      'fixed z-40',
      positionClasses[position],
      className
    )}>
      {/* 展开的操作列表 */}
      {isExpanded && (
        <div className={cn(
          'absolute mb-3 space-y-2',
          expandDirection === 'bottom-to-top' ? 'bottom-full' : 'top-full mt-3'
        )}>
          {availableActions.map((action, index) => (
            <button
              key={action.id}
              onClick={() => {
                onAction(action.id)
                setIsExpanded(false)
              }}
              className={cn(
                'flex items-center gap-3 w-48 p-3 rounded-xl shadow-lg transition-all',
                'bg-white border hover:shadow-xl hover:-translate-y-0.5',
                'animate-in fade-in slide-in-from-bottom-2'
              )}
              style={{ animationDelay: `${index * 50}ms` }}
            >
              <span className="text-xl">{action.icon}</span>
              <div className="text-left">
                <div className={cn('font-medium text-sm', action.color)}>
                  {action.label}
                </div>
                <div className="text-xs text-gray-500 line-clamp-1">
                  {action.description}
                </div>
              </div>
            </button>
          ))}
        </div>
      )}

      {/* 主按钮 */}
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        className={cn(
          'w-14 h-14 rounded-full shadow-lg transition-all',
          'bg-white border-2 border-blue-500 hover:shadow-xl',
          'flex items-center justify-center text-2xl',
          isExpanded && 'rotate-45'
        )}
      >
        {isExpanded ? '✕' : '⚡'}
      </button>

      {/* 通知徽章 */}
      {unreadNotifications > 0 && !isExpanded && (
        <span className="absolute -top-1 -right-1 w-5 h-5 bg-red-500 text-white text-xs rounded-full flex items-center justify-center">
          {unreadNotifications > 9 ? '9+' : unreadNotifications}
        </span>
      )}
    </div>
  )
}

/**
 * 快捷操作面板
 * 完整的操作面板，显示所有可用操作
 */
export function DeliveryQuickActionsPanel({
  progressSession,
  acceptanceSession,
  unreadNotifications = 0,
  onAction,
  onClose,
  className = '',
}: DeliveryQuickActionsProps & {
  onClose?: () => void
}) {
  const context: QuickActionContext = {
    progressSession,
    acceptanceSession,
    hasUnreadNotifications: unreadNotifications > 0,
    isDelivered: progressSession?.currentStage === 'completed',
    hasErrors: progressSession?.currentStage === 'error',
  }

  const availableActions = QUICK_ACTIONS
    .filter(action => action.available(context))
    .sort((a, b) => a.priority - b.priority)

  const unavailableActions = QUICK_ACTIONS
    .filter(action => !action.available(context))
    .sort((a, b) => a.priority - b.priority)

  return (
    <div className={cn('bg-white rounded-2xl shadow-lg border p-6', className)}>
      <div className="flex items-center justify-between mb-6">
        <h3 className="text-lg font-bold text-gray-900">快捷操作</h3>
        {onClose && (
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600"
          >
            ✕
          </button>
        )}
      </div>

      {/* 可用操作 */}
      {availableActions.length > 0 && (
        <div className="mb-6">
          <h4 className="text-sm font-medium text-gray-500 mb-3">当前可用</h4>
          <div className="grid grid-cols-2 gap-3">
            {availableActions.map(action => (
              <button
                key={action.id}
                onClick={() => onAction(action.id)}
                className={cn(
                  'p-4 rounded-xl border-2 transition-all text-left',
                  'hover:shadow-md hover:-translate-y-0.5',
                  action.bgColor,
                  action.borderColor
                )}
              >
                <div className="text-2xl mb-2">{action.icon}</div>
                <div className={cn('font-semibold text-sm', action.color)}>
                  {action.label}
                </div>
                <div className="text-xs text-gray-500 mt-1">
                  {action.description}
                </div>
              </button>
            ))}
          </div>
        </div>
      )}

      {/* 不可用操作 */}
      {unavailableActions.length > 0 && (
        <div>
          <h4 className="text-sm font-medium text-gray-400 mb-3">交付后可用</h4>
          <div className="grid grid-cols-2 gap-3">
            {unavailableActions.map(action => (
              <div
                key={action.id}
                className={cn(
                  'p-4 rounded-xl border-2 border-dashed border-gray-200 bg-gray-50',
                  'opacity-50 cursor-not-allowed'
                )}
              >
                <div className="text-2xl mb-2 grayscale">{action.icon}</div>
                <div className="font-semibold text-sm text-gray-400">
                  {action.label}
                </div>
                <div className="text-xs text-gray-400 mt-1">
                  {action.description}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
