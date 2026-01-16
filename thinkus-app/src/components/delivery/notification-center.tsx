'use client'

import { useState, useEffect } from 'react'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import {
  reliableNotification,
  type NotificationMessage,
  type NotificationSession,
  type NotificationChannel,
  type NotificationPriority,
} from '@/lib/services'

interface NotificationCenterProps {
  notifications: NotificationMessage[]
  onMarkAsRead?: (id: string) => void
  onMarkAllAsRead?: () => void
  onDismiss?: (id: string) => void
  onAction?: (notification: NotificationMessage, action: string) => void
  className?: string
}

// 优先级配置
const PRIORITY_CONFIG: Record<NotificationPriority, {
  color: string
  bgColor: string
  borderColor: string
  label: string
}> = {
  low: {
    color: 'text-gray-600',
    bgColor: 'bg-gray-50',
    borderColor: 'border-gray-200',
    label: '普通'
  },
  normal: {
    color: 'text-blue-600',
    bgColor: 'bg-blue-50',
    borderColor: 'border-blue-200',
    label: '一般'
  },
  high: {
    color: 'text-amber-600',
    bgColor: 'bg-amber-50',
    borderColor: 'border-amber-200',
    label: '重要'
  },
  urgent: {
    color: 'text-red-600',
    bgColor: 'bg-red-50',
    borderColor: 'border-red-200',
    label: '紧急'
  },
  critical: {
    color: 'text-red-700',
    bgColor: 'bg-red-100',
    borderColor: 'border-red-300',
    label: '严重'
  }
}

// 通知类型配置
const TYPE_CONFIG: Record<string, {
  icon: string
  label: string
}> = {
  delivery_complete: { icon: '🎉', label: '交付完成' },
  deployment_success: { icon: '🚀', label: '部署成功' },
  deployment_failed: { icon: '❌', label: '部署失败' },
  test_passed: { icon: '✅', label: '测试通过' },
  test_failed: { icon: '🔴', label: '测试失败' },
  acceptance_required: { icon: '📋', label: '需要验收' },
  acceptance_timeout: { icon: '⏰', label: '验收超时' },
  error_detected: { icon: '⚠️', label: '检测到错误' },
  error_fixed: { icon: '🔧', label: '错误已修复' },
  credentials_sent: { icon: '🔐', label: '凭证已发送' },
  status_change: { icon: '📊', label: '状态变更' },
  reminder: { icon: '🔔', label: '提醒' },
  support_reply: { icon: '💬', label: '客服回复' },
  system: { icon: '⚙️', label: '系统通知' }
}

// 渠道配置
const CHANNEL_ICONS: Record<NotificationChannel, string> = {
  email: '📧',
  sms: '📱',
  wechat: '💬',
  push: '🔔',
  in_app: '📌',
  phone: '📞',
  webhook: '🔗'
}

/**
 * 通知中心组件
 */
export function NotificationCenter({
  notifications,
  onMarkAsRead,
  onMarkAllAsRead,
  onDismiss,
  onAction,
  className
}: NotificationCenterProps) {
  const [filter, setFilter] = useState<'all' | 'unread'>('all')
  const [typeFilter, setTypeFilter] = useState<string | null>(null)

  const unreadCount = notifications.filter(n => !n.read).length
  const filteredNotifications = notifications.filter(n => {
    if (filter === 'unread' && n.read) return false
    if (typeFilter && n.type !== typeFilter) return false
    return true
  })

  // 获取通知类型列表
  const notificationTypes = [...new Set(notifications.map(n => n.type))]

  return (
    <div className={cn(
      'rounded-2xl shadow-lg bg-white overflow-hidden',
      className
    )}>
      {/* 头部 */}
      <div className="px-6 py-4 border-b bg-gradient-to-r from-blue-500 to-indigo-600">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <span className="text-2xl">🔔</span>
            <div>
              <h2 className="text-lg font-bold text-white">通知中心</h2>
              <p className="text-white/70 text-sm">
                {unreadCount > 0 ? `${unreadCount} 条未读` : '全部已读'}
              </p>
            </div>
          </div>
          {unreadCount > 0 && (
            <Button
              size="sm"
              variant="secondary"
              onClick={onMarkAllAsRead}
            >
              全部已读
            </Button>
          )}
        </div>
      </div>

      {/* 筛选 */}
      <div className="px-6 py-3 border-b flex items-center gap-4 overflow-x-auto">
        <div className="flex gap-2">
          <button
            className={cn(
              'px-3 py-1 rounded-full text-sm font-medium transition-colors',
              filter === 'all' ? 'bg-blue-100 text-blue-700' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
            )}
            onClick={() => setFilter('all')}
          >
            全部
          </button>
          <button
            className={cn(
              'px-3 py-1 rounded-full text-sm font-medium transition-colors',
              filter === 'unread' ? 'bg-blue-100 text-blue-700' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
            )}
            onClick={() => setFilter('unread')}
          >
            未读 {unreadCount > 0 && `(${unreadCount})`}
          </button>
        </div>

        {notificationTypes.length > 1 && (
          <>
            <div className="w-px h-6 bg-gray-200" />
            <div className="flex gap-2">
              <button
                className={cn(
                  'px-3 py-1 rounded-full text-sm font-medium transition-colors',
                  !typeFilter ? 'bg-gray-200 text-gray-700' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                )}
                onClick={() => setTypeFilter(null)}
              >
                全部类型
              </button>
              {notificationTypes.slice(0, 3).map(type => (
                <button
                  key={type}
                  className={cn(
                    'px-3 py-1 rounded-full text-sm font-medium transition-colors whitespace-nowrap',
                    typeFilter === type ? 'bg-gray-200 text-gray-700' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                  )}
                  onClick={() => setTypeFilter(type)}
                >
                  {TYPE_CONFIG[type]?.icon} {TYPE_CONFIG[type]?.label || type}
                </button>
              ))}
            </div>
          </>
        )}
      </div>

      {/* 通知列表 */}
      <div className="max-h-[500px] overflow-y-auto">
        {filteredNotifications.length === 0 ? (
          <div className="py-12 text-center text-gray-500">
            <div className="text-4xl mb-3">📭</div>
            <div>暂无通知</div>
          </div>
        ) : (
          <div className="divide-y">
            {filteredNotifications.map(notification => (
              <NotificationItem
                key={notification.id}
                notification={notification}
                onMarkAsRead={onMarkAsRead}
                onDismiss={onDismiss}
                onAction={onAction}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

/**
 * 单条通知项
 */
function NotificationItem({
  notification,
  onMarkAsRead,
  onDismiss,
  onAction
}: {
  notification: NotificationMessage
  onMarkAsRead?: (id: string) => void
  onDismiss?: (id: string) => void
  onAction?: (notification: NotificationMessage, action: string) => void
}) {
  const typeConfig = TYPE_CONFIG[notification.type] || { icon: '📌', label: '通知' }
  const priorityConfig = PRIORITY_CONFIG[notification.priority]

  return (
    <div
      className={cn(
        'px-6 py-4 hover:bg-gray-50 transition-colors',
        !notification.read && 'bg-blue-50/30'
      )}
    >
      <div className="flex gap-4">
        {/* 图标 */}
        <div className={cn(
          'w-10 h-10 rounded-full flex items-center justify-center text-lg shrink-0',
          priorityConfig.bgColor
        )}>
          {typeConfig.icon}
        </div>

        {/* 内容 */}
        <div className="flex-1 min-w-0">
          <div className="flex items-start justify-between gap-2">
            <div>
              <div className="font-medium text-gray-900">
                {notification.title}
              </div>
              <div className="text-sm text-gray-600 mt-1">
                {notification.body}
              </div>
            </div>

            {/* 未读标记 */}
            {!notification.read && (
              <div className="w-2 h-2 bg-blue-500 rounded-full shrink-0 mt-2" />
            )}
          </div>

          {/* 元信息 */}
          <div className="flex items-center gap-3 mt-2 text-xs text-gray-400">
            <span>{formatTime(notification.createdAt)}</span>
            <span className={cn('px-1.5 py-0.5 rounded', priorityConfig.bgColor, priorityConfig.color)}>
              {priorityConfig.label}
            </span>
            {notification.channels && notification.channels.length > 0 && (
              <span className="flex items-center gap-1">
                {notification.channels.slice(0, 3).map(channel => (
                  <span key={channel}>{CHANNEL_ICONS[channel]}</span>
                ))}
              </span>
            )}
          </div>

          {/* 操作按钮 */}
          {notification.actions && notification.actions.length > 0 && (
            <div className="flex gap-2 mt-3">
              {notification.actions.map((action, index) => (
                <Button
                  key={index}
                  size="sm"
                  variant={index === 0 ? 'default' : 'outline'}
                  onClick={() => onAction?.(notification, action.action)}
                >
                  {action.label}
                </Button>
              ))}
            </div>
          )}
        </div>

        {/* 操作 */}
        <div className="flex flex-col gap-1 shrink-0">
          {!notification.read && (
            <button
              className="text-xs text-blue-600 hover:underline"
              onClick={() => onMarkAsRead?.(notification.id)}
            >
              标为已读
            </button>
          )}
          <button
            className="text-xs text-gray-400 hover:text-gray-600"
            onClick={() => onDismiss?.(notification.id)}
          >
            删除
          </button>
        </div>
      </div>
    </div>
  )
}

/**
 * 通知铃铛组件
 */
export function NotificationBell({
  unreadCount,
  onClick,
  className
}: {
  unreadCount: number
  onClick?: () => void
  className?: string
}) {
  return (
    <button
      className={cn(
        'relative p-2 rounded-full hover:bg-gray-100 transition-colors',
        className
      )}
      onClick={onClick}
    >
      <span className="text-xl">🔔</span>
      {unreadCount > 0 && (
        <span className="absolute -top-1 -right-1 min-w-[18px] h-[18px] bg-red-500 text-white text-xs font-bold rounded-full flex items-center justify-center px-1">
          {unreadCount > 99 ? '99+' : unreadCount}
        </span>
      )}
    </button>
  )
}

/**
 * 通知弹出面板
 */
export function NotificationPopover({
  notifications,
  isOpen,
  onClose,
  onMarkAsRead,
  onViewAll,
  className
}: {
  notifications: NotificationMessage[]
  isOpen: boolean
  onClose: () => void
  onMarkAsRead?: (id: string) => void
  onViewAll?: () => void
  className?: string
}) {
  if (!isOpen) return null

  const recentNotifications = notifications.slice(0, 5)
  const unreadCount = notifications.filter(n => !n.read).length

  return (
    <>
      {/* 背景遮罩 */}
      <div
        className="fixed inset-0 z-40"
        onClick={onClose}
      />

      {/* 弹出面板 */}
      <div className={cn(
        'absolute top-full right-0 mt-2 w-96 max-h-[500px] overflow-hidden',
        'bg-white rounded-xl shadow-xl border z-50',
        className
      )}>
        {/* 头部 */}
        <div className="px-4 py-3 border-b flex items-center justify-between">
          <div className="font-semibold text-gray-900">
            通知 {unreadCount > 0 && (
              <span className="ml-2 text-xs bg-red-100 text-red-600 px-2 py-0.5 rounded-full">
                {unreadCount} 未读
              </span>
            )}
          </div>
          <button
            className="text-gray-400 hover:text-gray-600"
            onClick={onClose}
          >
            ✕
          </button>
        </div>

        {/* 通知列表 */}
        <div className="max-h-80 overflow-y-auto divide-y">
          {recentNotifications.length === 0 ? (
            <div className="py-8 text-center text-gray-500">
              <div className="text-3xl mb-2">📭</div>
              <div className="text-sm">暂无通知</div>
            </div>
          ) : (
            recentNotifications.map(notification => (
              <NotificationItemCompact
                key={notification.id}
                notification={notification}
                onMarkAsRead={onMarkAsRead}
              />
            ))
          )}
        </div>

        {/* 底部 */}
        {notifications.length > 0 && (
          <div className="px-4 py-3 border-t bg-gray-50">
            <button
              className="w-full text-center text-sm text-blue-600 hover:underline"
              onClick={onViewAll}
            >
              查看全部通知
            </button>
          </div>
        )}
      </div>
    </>
  )
}

/**
 * 紧凑型通知项
 */
function NotificationItemCompact({
  notification,
  onMarkAsRead
}: {
  notification: NotificationMessage
  onMarkAsRead?: (id: string) => void
}) {
  const typeConfig = TYPE_CONFIG[notification.type] || { icon: '📌', label: '通知' }

  return (
    <div
      className={cn(
        'px-4 py-3 hover:bg-gray-50 transition-colors cursor-pointer',
        !notification.read && 'bg-blue-50/30'
      )}
      onClick={() => !notification.read && onMarkAsRead?.(notification.id)}
    >
      <div className="flex items-start gap-3">
        <span className="text-lg">{typeConfig.icon}</span>
        <div className="flex-1 min-w-0">
          <div className="text-sm font-medium text-gray-900 truncate">
            {notification.title}
          </div>
          <div className="text-xs text-gray-500 truncate mt-0.5">
            {notification.body}
          </div>
          <div className="text-xs text-gray-400 mt-1">
            {formatTime(notification.createdAt)}
          </div>
        </div>
        {!notification.read && (
          <div className="w-2 h-2 bg-blue-500 rounded-full shrink-0 mt-1" />
        )}
      </div>
    </div>
  )
}

/**
 * 通知 Toast 提示
 */
export function NotificationToast({
  notification,
  onClose,
  onAction,
  className
}: {
  notification: NotificationMessage
  onClose?: () => void
  onAction?: (action: string) => void
  className?: string
}) {
  const [isVisible, setIsVisible] = useState(true)
  const typeConfig = TYPE_CONFIG[notification.type] || { icon: '📌', label: '通知' }
  const priorityConfig = PRIORITY_CONFIG[notification.priority]

  useEffect(() => {
    const timer = setTimeout(() => {
      setIsVisible(false)
      setTimeout(onClose, 300)
    }, 5000)
    return () => clearTimeout(timer)
  }, [onClose])

  return (
    <div className={cn(
      'fixed bottom-6 right-6 w-96 bg-white rounded-xl shadow-xl border z-50',
      'transform transition-all duration-300',
      isVisible ? 'translate-x-0 opacity-100' : 'translate-x-full opacity-0',
      priorityConfig.borderColor,
      className
    )}>
      <div className="p-4">
        <div className="flex items-start gap-3">
          <div className={cn(
            'w-10 h-10 rounded-full flex items-center justify-center text-lg shrink-0',
            priorityConfig.bgColor
          )}>
            {typeConfig.icon}
          </div>
          <div className="flex-1 min-w-0">
            <div className="font-medium text-gray-900">{notification.title}</div>
            <div className="text-sm text-gray-600 mt-1 line-clamp-2">
              {notification.body}
            </div>
            {notification.actions && notification.actions.length > 0 && (
              <div className="flex gap-2 mt-3">
                {notification.actions.slice(0, 2).map((action, index) => (
                  <Button
                    key={index}
                    size="sm"
                    variant={index === 0 ? 'default' : 'outline'}
                    onClick={() => onAction?.(action.action)}
                  >
                    {action.label}
                  </Button>
                ))}
              </div>
            )}
          </div>
          <button
            className="text-gray-400 hover:text-gray-600 shrink-0"
            onClick={() => {
              setIsVisible(false)
              setTimeout(onClose, 300)
            }}
          >
            ✕
          </button>
        </div>
      </div>
    </div>
  )
}

// 格式化时间
function formatTime(date: Date | string): string {
  const d = new Date(date)
  const now = new Date()
  const diffMs = now.getTime() - d.getTime()
  const diffMins = Math.floor(diffMs / 60000)
  const diffHours = Math.floor(diffMs / 3600000)
  const diffDays = Math.floor(diffMs / 86400000)

  if (diffMins < 1) return '刚刚'
  if (diffMins < 60) return `${diffMins}分钟前`
  if (diffHours < 24) return `${diffHours}小时前`
  if (diffDays < 7) return `${diffDays}天前`

  return d.toLocaleDateString('zh-CN', {
    month: 'numeric',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  })
}
