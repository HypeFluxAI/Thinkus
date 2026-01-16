'use client'

import * as React from 'react'
import { useState, useCallback, useEffect } from 'react'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Switch } from '@/components/ui/switch'
import {
  proactiveNotifier,
  Notification,
  NotificationType,
  NotificationPriority,
  NotificationPreferences
} from '@/lib/services/proactive-notifier'

export interface NotificationCenterProps {
  /** 用户ID */
  userId: string
  /** 自定义样式 */
  className?: string
  /** 点击通知回调 */
  onNotificationClick?: (notification: Notification) => void
}

/**
 * 通知中心 - 用户查看和管理通知
 */
export function NotificationCenter({
  userId,
  className,
  onNotificationClick
}: NotificationCenterProps) {
  const [notifications, setNotifications] = useState<Notification[]>([])
  const [unreadCount, setUnreadCount] = useState(0)
  const [filter, setFilter] = useState<NotificationType | 'all'>('all')
  const [showPreferences, setShowPreferences] = useState(false)
  const [preferences, setPreferences] = useState<NotificationPreferences | null>(null)

  const typeConfig = proactiveNotifier.getTypeConfig()

  // 加载通知
  const loadNotifications = useCallback(() => {
    const notifs = proactiveNotifier.getUserNotifications(userId, {
      type: filter === 'all' ? undefined : filter,
      limit: 50
    })
    setNotifications(notifs)
    setUnreadCount(proactiveNotifier.getUnreadCount(userId))

    const prefs = proactiveNotifier.getPreferences(userId)
    setPreferences(prefs)
  }, [userId, filter])

  useEffect(() => {
    loadNotifications()
  }, [loadNotifications])

  // 标记为已读
  const handleMarkAsRead = (notificationId: string) => {
    proactiveNotifier.markAsRead(userId, notificationId)
    loadNotifications()
  }

  // 全部标记为已读
  const handleMarkAllAsRead = () => {
    proactiveNotifier.markAllAsRead(userId)
    loadNotifications()
  }

  // 更新偏好
  const updatePreference = (key: keyof NotificationPreferences, value: unknown) => {
    if (!preferences) return

    const updated = proactiveNotifier.setPreferences(userId, { [key]: value })
    setPreferences(updated)
  }

  // 切换通知类型
  const toggleNotificationType = (type: NotificationType) => {
    if (!preferences) return

    const enabledTypes = preferences.enabledTypes.includes(type)
      ? preferences.enabledTypes.filter(t => t !== type)
      : [...preferences.enabledTypes, type]

    updatePreference('enabledTypes', enabledTypes)
  }

  if (showPreferences && preferences) {
    return (
      <Card className={cn('overflow-hidden', className)}>
        <CardHeader className="border-b">
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2">
              <span className="text-2xl">⚙️</span>
              通知设置
            </CardTitle>
            <Button variant="ghost" size="sm" onClick={() => setShowPreferences(false)}>
              返回
            </Button>
          </div>
        </CardHeader>

        <CardContent className="p-6 space-y-6">
          {/* 通知类型开关 */}
          <div>
            <h4 className="font-medium mb-3">通知类型</h4>
            <div className="space-y-3">
              {(Object.entries(typeConfig) as [NotificationType, any][]).map(([type, config]) => (
                <div key={type} className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span>{config.icon}</span>
                    <span>{config.label}</span>
                  </div>
                  <Switch
                    checked={preferences.enabledTypes.includes(type)}
                    onCheckedChange={() => toggleNotificationType(type)}
                  />
                </div>
              ))}
            </div>
          </div>

          {/* 通知渠道 */}
          <div>
            <h4 className="font-medium mb-3">通知渠道</h4>
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span>📱</span>
                  <span>应用内通知</span>
                </div>
                <Switch
                  checked={preferences.enabledChannels.includes('in_app')}
                  onCheckedChange={(checked) => {
                    const channels = checked
                      ? [...preferences.enabledChannels, 'in_app']
                      : preferences.enabledChannels.filter(c => c !== 'in_app')
                    updatePreference('enabledChannels', channels)
                  }}
                />
              </div>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span>📧</span>
                  <span>邮件通知</span>
                </div>
                <Switch
                  checked={preferences.enabledChannels.includes('email')}
                  onCheckedChange={(checked) => {
                    const channels = checked
                      ? [...preferences.enabledChannels, 'email']
                      : preferences.enabledChannels.filter(c => c !== 'email')
                    updatePreference('enabledChannels', channels)
                  }}
                />
              </div>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span>💬</span>
                  <span>短信通知</span>
                </div>
                <Switch
                  checked={preferences.enabledChannels.includes('sms')}
                  onCheckedChange={(checked) => {
                    const channels = checked
                      ? [...preferences.enabledChannels, 'sms']
                      : preferences.enabledChannels.filter(c => c !== 'sms')
                    updatePreference('enabledChannels', channels)
                  }}
                />
              </div>
            </div>
          </div>

          {/* 静默时间 */}
          <div>
            <h4 className="font-medium mb-3">静默时间</h4>
            <p className="text-sm text-muted-foreground mb-2">
              在此时间段内，只接收紧急通知
            </p>
            <div className="flex items-center gap-2">
              <input
                type="time"
                value={preferences.quietHoursStart || '22:00'}
                onChange={(e) => updatePreference('quietHoursStart', e.target.value)}
                className="border rounded px-2 py-1"
              />
              <span>至</span>
              <input
                type="time"
                value={preferences.quietHoursEnd || '08:00'}
                onChange={(e) => updatePreference('quietHoursEnd', e.target.value)}
                className="border rounded px-2 py-1"
              />
            </div>
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card className={cn('overflow-hidden', className)}>
      <CardHeader className="border-b">
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <span className="text-2xl">🔔</span>
            通知中心
            {unreadCount > 0 && (
              <span className="bg-red-500 text-white text-xs px-2 py-0.5 rounded-full">
                {unreadCount}
              </span>
            )}
          </CardTitle>
          <div className="flex items-center gap-2">
            {unreadCount > 0 && (
              <Button variant="ghost" size="sm" onClick={handleMarkAllAsRead}>
                全部已读
              </Button>
            )}
            <Button variant="ghost" size="sm" onClick={() => setShowPreferences(true)}>
              ⚙️
            </Button>
          </div>
        </div>
      </CardHeader>

      <CardContent className="p-0">
        {/* 过滤器 */}
        <div className="flex gap-2 p-4 border-b overflow-x-auto">
          <FilterChip
            label="全部"
            active={filter === 'all'}
            count={notifications.length}
            onClick={() => setFilter('all')}
          />
          {(Object.entries(typeConfig) as [NotificationType, any][]).map(([type, config]) => (
            <FilterChip
              key={type}
              label={config.label}
              icon={config.icon}
              active={filter === type}
              onClick={() => setFilter(type)}
            />
          ))}
        </div>

        {/* 通知列表 */}
        <div className="divide-y max-h-96 overflow-y-auto">
          {notifications.length === 0 ? (
            <div className="p-8 text-center">
              <div className="text-4xl mb-4">📭</div>
              <p className="text-muted-foreground">暂无通知</p>
            </div>
          ) : (
            notifications.map((notification) => (
              <NotificationItem
                key={notification.id}
                notification={notification}
                typeConfig={typeConfig[notification.type]}
                onClick={() => {
                  handleMarkAsRead(notification.id)
                  onNotificationClick?.(notification)
                }}
              />
            ))
          )}
        </div>
      </CardContent>
    </Card>
  )
}

/**
 * 过滤器标签
 */
function FilterChip({
  label,
  icon,
  active,
  count,
  onClick
}: {
  label: string
  icon?: string
  active: boolean
  count?: number
  onClick: () => void
}) {
  return (
    <button
      onClick={onClick}
      className={cn(
        'flex items-center gap-1 px-3 py-1.5 rounded-full text-sm font-medium whitespace-nowrap transition-colors',
        active
          ? 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300'
          : 'bg-gray-100 text-gray-700 hover:bg-gray-200 dark:bg-gray-800 dark:text-gray-300'
      )}
    >
      {icon && <span>{icon}</span>}
      <span>{label}</span>
      {count !== undefined && (
        <span className="ml-1 opacity-75">({count})</span>
      )}
    </button>
  )
}

/**
 * 通知项
 */
function NotificationItem({
  notification,
  typeConfig,
  onClick
}: {
  notification: Notification
  typeConfig: { label: string; icon: string }
  onClick: () => void
}) {
  const isUnread = notification.status === 'sent' || notification.status === 'delivered'

  const priorityConfig: Record<NotificationPriority, string> = {
    low: 'border-l-gray-300',
    normal: 'border-l-blue-400',
    high: 'border-l-yellow-500',
    urgent: 'border-l-red-500'
  }

  const timeAgo = (date: Date): string => {
    const seconds = Math.floor((Date.now() - date.getTime()) / 1000)

    if (seconds < 60) return '刚刚'
    if (seconds < 3600) return `${Math.floor(seconds / 60)} 分钟前`
    if (seconds < 86400) return `${Math.floor(seconds / 3600)} 小时前`
    if (seconds < 604800) return `${Math.floor(seconds / 86400)} 天前`
    return date.toLocaleDateString('zh-CN')
  }

  return (
    <button
      onClick={onClick}
      className={cn(
        'w-full text-left p-4 hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors',
        'border-l-4',
        priorityConfig[notification.priority],
        isUnread && 'bg-blue-50/50 dark:bg-blue-950/10'
      )}
    >
      <div className="flex items-start gap-3">
        <span className="text-2xl">{notification.icon}</span>

        <div className="flex-1 min-w-0">
          <div className="flex items-center justify-between mb-1">
            <span className={cn('font-medium', isUnread && 'font-bold')}>
              {notification.title}
            </span>
            <span className="text-xs text-muted-foreground">
              {timeAgo(notification.createdAt)}
            </span>
          </div>

          <p className="text-sm text-muted-foreground line-clamp-2">
            {notification.message}
          </p>

          {notification.actionUrl && (
            <span className="text-xs text-blue-600 mt-1 inline-block">
              {notification.actionText || '查看详情'} →
            </span>
          )}
        </div>

        {isUnread && (
          <span className="w-2 h-2 rounded-full bg-blue-500 flex-shrink-0 mt-2" />
        )}
      </div>
    </button>
  )
}

/**
 * 通知铃铛按钮
 */
export function NotificationBell({
  userId,
  onClick,
  className
}: {
  userId: string
  onClick?: () => void
  className?: string
}) {
  const [unreadCount, setUnreadCount] = useState(0)

  useEffect(() => {
    setUnreadCount(proactiveNotifier.getUnreadCount(userId))

    // 定期检查
    const interval = setInterval(() => {
      setUnreadCount(proactiveNotifier.getUnreadCount(userId))
    }, 30000)

    return () => clearInterval(interval)
  }, [userId])

  return (
    <button
      onClick={onClick}
      className={cn(
        'relative p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors',
        className
      )}
    >
      <span className="text-xl">🔔</span>
      {unreadCount > 0 && (
        <span className="absolute -top-1 -right-1 bg-red-500 text-white text-xs w-5 h-5 rounded-full flex items-center justify-center">
          {unreadCount > 9 ? '9+' : unreadCount}
        </span>
      )}
    </button>
  )
}

/**
 * 迷你通知弹出框
 */
export function NotificationPopover({
  userId,
  isOpen,
  onClose,
  onViewAll,
  className
}: {
  userId: string
  isOpen: boolean
  onClose: () => void
  onViewAll?: () => void
  className?: string
}) {
  const [notifications, setNotifications] = useState<Notification[]>([])

  useEffect(() => {
    if (isOpen) {
      const notifs = proactiveNotifier.getUserNotifications(userId, { limit: 5 })
      setNotifications(notifs)
    }
  }, [userId, isOpen])

  if (!isOpen) return null

  const typeConfig = proactiveNotifier.getTypeConfig()

  return (
    <div className={cn(
      'absolute right-0 top-full mt-2 w-80 bg-white dark:bg-gray-900 rounded-lg shadow-xl border z-50',
      className
    )}>
      <div className="p-3 border-b flex items-center justify-between">
        <span className="font-medium">通知</span>
        <button
          onClick={() => {
            proactiveNotifier.markAllAsRead(userId)
            setNotifications(proactiveNotifier.getUserNotifications(userId, { limit: 5 }))
          }}
          className="text-xs text-blue-600 hover:underline"
        >
          全部已读
        </button>
      </div>

      <div className="max-h-64 overflow-y-auto">
        {notifications.length === 0 ? (
          <div className="p-6 text-center text-muted-foreground">
            暂无通知
          </div>
        ) : (
          notifications.map((notif) => (
            <div
              key={notif.id}
              className={cn(
                'p-3 border-b last:border-b-0 hover:bg-gray-50 dark:hover:bg-gray-800/50 cursor-pointer',
                (notif.status === 'sent' || notif.status === 'delivered') && 'bg-blue-50/50'
              )}
              onClick={() => {
                proactiveNotifier.markAsRead(userId, notif.id)
                setNotifications(proactiveNotifier.getUserNotifications(userId, { limit: 5 }))
              }}
            >
              <div className="flex items-center gap-2 mb-1">
                <span>{notif.icon}</span>
                <span className="font-medium text-sm truncate">{notif.title}</span>
              </div>
              <p className="text-xs text-muted-foreground line-clamp-2">{notif.message}</p>
            </div>
          ))
        )}
      </div>

      {onViewAll && (
        <div className="p-2 border-t">
          <button
            onClick={onViewAll}
            className="w-full text-center text-sm text-blue-600 hover:underline py-1"
          >
            查看全部通知
          </button>
        </div>
      )}
    </div>
  )
}

/**
 * Toast 通知
 */
export function NotificationToast({
  notification,
  onClose,
  className
}: {
  notification: Notification
  onClose: () => void
  className?: string
}) {
  useEffect(() => {
    const timer = setTimeout(onClose, 5000)
    return () => clearTimeout(timer)
  }, [onClose])

  const priorityBg: Record<NotificationPriority, string> = {
    low: 'bg-gray-100 border-gray-200',
    normal: 'bg-blue-50 border-blue-200',
    high: 'bg-yellow-50 border-yellow-200',
    urgent: 'bg-red-50 border-red-200'
  }

  return (
    <div className={cn(
      'fixed bottom-4 right-4 w-80 p-4 rounded-lg border shadow-lg animate-in slide-in-from-right',
      priorityBg[notification.priority],
      className
    )}>
      <div className="flex items-start gap-3">
        <span className="text-2xl">{notification.icon}</span>
        <div className="flex-1">
          <p className="font-medium">{notification.title}</p>
          <p className="text-sm text-muted-foreground mt-1">{notification.message}</p>
        </div>
        <button
          onClick={onClose}
          className="text-gray-400 hover:text-gray-600"
        >
          ✕
        </button>
      </div>
    </div>
  )
}
