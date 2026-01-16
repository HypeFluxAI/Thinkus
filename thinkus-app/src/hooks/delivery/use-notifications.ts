'use client'

import { useState, useEffect, useCallback } from 'react'
import type { NotificationMessage, NotificationChannel, NotificationPriority } from '@/lib/services'

interface UseNotificationsOptions {
  userId: string
  pollInterval?: number
  autoStart?: boolean
}

interface SendNotificationParams {
  type?: string
  title: string
  body: string
  priority?: NotificationPriority
  channels?: NotificationChannel[]
  actions?: Array<{ label: string; action: string }>
  metadata?: Record<string, unknown>
}

interface UseNotificationsReturn {
  notifications: NotificationMessage[]
  unreadCount: number
  isLoading: boolean
  error: string | null
  refresh: () => Promise<void>
  send: (notification: SendNotificationParams) => Promise<void>
  markAsRead: (notificationId: string) => Promise<void>
  markAllAsRead: () => Promise<void>
  deleteNotification: (notificationId: string) => Promise<void>
  deleteMultiple: (notificationIds: string[]) => Promise<void>
}

/**
 * 通知 Hook
 */
export function useNotifications({
  userId,
  pollInterval = 30000,
  autoStart = true
}: UseNotificationsOptions): UseNotificationsReturn {
  const [notifications, setNotifications] = useState<NotificationMessage[]>([])
  const [unreadCount, setUnreadCount] = useState(0)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // 获取通知列表
  const refresh = useCallback(async () => {
    if (!userId) return

    setIsLoading(true)
    setError(null)

    try {
      const response = await fetch(`/api/delivery/notifications?userId=${userId}`)
      const data = await response.json()

      if (data.success) {
        setNotifications(data.data.notifications)
        setUnreadCount(data.data.unreadCount)
      } else {
        setError(data.error || '获取通知失败')
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : '网络错误')
    } finally {
      setIsLoading(false)
    }
  }, [userId])

  // 发送通知
  const send = useCallback(async (notification: SendNotificationParams) => {
    try {
      const response = await fetch('/api/delivery/notifications', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'send',
          userId,
          notification
        })
      })
      const data = await response.json()

      if (!data.success) {
        throw new Error(data.error)
      }

      // 刷新列表
      await refresh()
    } catch (err) {
      setError(err instanceof Error ? err.message : '发送通知失败')
    }
  }, [userId, refresh])

  // 标记已读
  const markAsRead = useCallback(async (notificationId: string) => {
    try {
      const response = await fetch('/api/delivery/notifications', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'markAsRead',
          notificationId
        })
      })
      const data = await response.json()

      if (data.success) {
        // 本地更新
        setNotifications(prev =>
          prev.map(n => n.id === notificationId ? { ...n, read: true } : n)
        )
        setUnreadCount(prev => Math.max(0, prev - 1))
      } else {
        throw new Error(data.error)
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : '标记已读失败')
    }
  }, [])

  // 全部标记已读
  const markAllAsRead = useCallback(async () => {
    try {
      const response = await fetch('/api/delivery/notifications', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'markAllAsRead',
          userId
        })
      })
      const data = await response.json()

      if (data.success) {
        // 本地更新
        setNotifications(prev => prev.map(n => ({ ...n, read: true })))
        setUnreadCount(0)
      } else {
        throw new Error(data.error)
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : '全部标记已读失败')
    }
  }, [userId])

  // 删除通知
  const deleteNotification = useCallback(async (notificationId: string) => {
    try {
      const response = await fetch('/api/delivery/notifications', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'delete',
          notificationId
        })
      })
      const data = await response.json()

      if (data.success) {
        // 本地更新
        setNotifications(prev => {
          const notification = prev.find(n => n.id === notificationId)
          if (notification && !notification.read) {
            setUnreadCount(c => Math.max(0, c - 1))
          }
          return prev.filter(n => n.id !== notificationId)
        })
      } else {
        throw new Error(data.error)
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : '删除通知失败')
    }
  }, [])

  // 批量删除
  const deleteMultiple = useCallback(async (notificationIds: string[]) => {
    try {
      const response = await fetch('/api/delivery/notifications', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'deleteMultiple',
          notificationIds
        })
      })
      const data = await response.json()

      if (data.success) {
        // 本地更新
        setNotifications(prev => {
          const deletedUnread = prev.filter(
            n => notificationIds.includes(n.id) && !n.read
          ).length
          setUnreadCount(c => Math.max(0, c - deletedUnread))
          return prev.filter(n => !notificationIds.includes(n.id))
        })
      } else {
        throw new Error(data.error)
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : '批量删除失败')
    }
  }, [])

  // 自动轮询
  useEffect(() => {
    if (!autoStart || !userId) return

    refresh()

    const interval = setInterval(refresh, pollInterval)
    return () => clearInterval(interval)
  }, [autoStart, userId, pollInterval, refresh])

  return {
    notifications,
    unreadCount,
    isLoading,
    error,
    refresh,
    send,
    markAsRead,
    markAllAsRead,
    deleteNotification,
    deleteMultiple
  }
}
