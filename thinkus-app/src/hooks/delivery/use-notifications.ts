'use client'

import { useState, useEffect, useCallback } from 'react'
import type { NotificationMessage, NotificationChannel, NotificationPriority } from '@/lib/services'

interface UseNotificationsOptions {
  projectId: string
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
  projectId,
  pollInterval = 30000,
  autoStart = true
}: UseNotificationsOptions): UseNotificationsReturn {
  const [notifications, setNotifications] = useState<NotificationMessage[]>([])
  const [unreadCount, setUnreadCount] = useState(0)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // 获取通知列表
  const refresh = useCallback(async () => {
    if (!projectId) return

    setIsLoading(true)
    setError(null)

    try {
      const response = await fetch(`/api/delivery/${projectId}/notifications`)
      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || '获取通知失败')
      }
      const data = await response.json()

      setNotifications(data.notifications)
      setUnreadCount(data.unreadCount)
    } catch (err) {
      setError(err instanceof Error ? err.message : '网络错误')
    } finally {
      setIsLoading(false)
    }
  }, [projectId])

  // 发送通知 (目前 API 不支持发送，仅作为占位)
  const send = useCallback(async (_notification: SendNotificationParams) => {
    // TODO: 实现发送通知 API
    console.log('发送通知功能尚未实现')
  }, [])

  // 标记已读
  const markAsRead = useCallback(async (notificationId: string) => {
    try {
      const response = await fetch(`/api/delivery/${projectId}/notifications`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ notificationId })
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error)
      }

      // 本地更新
      setNotifications(prev =>
        prev.map(n => n.id === notificationId ? { ...n, read: true } : n)
      )
      setUnreadCount(prev => Math.max(0, prev - 1))
    } catch (err) {
      setError(err instanceof Error ? err.message : '标记已读失败')
    }
  }, [projectId])

  // 全部标记已读
  const markAllAsRead = useCallback(async () => {
    try {
      const response = await fetch(`/api/delivery/${projectId}/notifications`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ markAllRead: true })
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error)
      }

      // 本地更新
      setNotifications(prev => prev.map(n => ({ ...n, read: true })))
      setUnreadCount(0)
    } catch (err) {
      setError(err instanceof Error ? err.message : '全部标记已读失败')
    }
  }, [projectId])

  // 删除通知
  const deleteNotification = useCallback(async (notificationId: string) => {
    try {
      const response = await fetch(`/api/delivery/${projectId}/notifications?id=${notificationId}`, {
        method: 'DELETE',
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error)
      }

      // 本地更新
      setNotifications(prev => {
        const notification = prev.find(n => n.id === notificationId)
        if (notification && !notification.read) {
          setUnreadCount(c => Math.max(0, c - 1))
        }
        return prev.filter(n => n.id !== notificationId)
      })
    } catch (err) {
      setError(err instanceof Error ? err.message : '删除通知失败')
    }
  }, [projectId])

  // 批量删除
  const deleteMultiple = useCallback(async (notificationIds: string[]) => {
    try {
      // 批量删除，逐个调用
      await Promise.all(notificationIds.map(id =>
        fetch(`/api/delivery/${projectId}/notifications?id=${id}`, { method: 'DELETE' })
      ))

      // 本地更新
      setNotifications(prev => {
        const deletedUnread = prev.filter(
          n => notificationIds.includes(n.id) && !n.read
        ).length
        setUnreadCount(c => Math.max(0, c - deletedUnread))
        return prev.filter(n => !notificationIds.includes(n.id))
      })
    } catch (err) {
      setError(err instanceof Error ? err.message : '批量删除失败')
    }
  }, [projectId])

  // 自动轮询
  useEffect(() => {
    if (!autoStart || !projectId) return

    refresh()

    const interval = setInterval(refresh, pollInterval)
    return () => clearInterval(interval)
  }, [autoStart, projectId, pollInterval, refresh])

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
