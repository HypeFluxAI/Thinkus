'use client'

import { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { ScrollArea } from '@/components/ui/scroll-area'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { useToast } from '@/components/ui/use-toast'
import {
  Bell,
  CheckCircle2,
  AlertTriangle,
  MessageSquare,
  Target,
  FileCheck,
  CreditCard,
  Rocket,
  Info,
  Check,
  Loader2,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import Link from 'next/link'

interface NotificationAction {
  label: string
  url: string
  primary?: boolean
}

interface Notification {
  id: string
  type: string
  title: string
  body: string
  relatedTo?: {
    type: string
    id: string
  }
  actions?: NotificationAction[]
  read: boolean
  readAt?: string
  priority: string
  createdAt: string
}

const TYPE_CONFIG: Record<string, { icon: React.ReactNode; color: string }> = {
  decision_pending: { icon: <Target className="h-4 w-4" />, color: 'text-orange-500' },
  decision_executed: { icon: <CheckCircle2 className="h-4 w-4" />, color: 'text-green-500' },
  discussion_concluded: { icon: <MessageSquare className="h-4 w-4" />, color: 'text-blue-500' },
  deliverable_ready: { icon: <FileCheck className="h-4 w-4" />, color: 'text-purple-500' },
  phase_changed: { icon: <Rocket className="h-4 w-4" />, color: 'text-indigo-500' },
  daily_summary: { icon: <Info className="h-4 w-4" />, color: 'text-gray-500' },
  payment_succeeded: { icon: <CreditCard className="h-4 w-4" />, color: 'text-green-500' },
  payment_failed: { icon: <AlertTriangle className="h-4 w-4" />, color: 'text-red-500' },
  subscription_created: { icon: <CreditCard className="h-4 w-4" />, color: 'text-blue-500' },
  subscription_updated: { icon: <CreditCard className="h-4 w-4" />, color: 'text-blue-500' },
  subscription_canceled: { icon: <CreditCard className="h-4 w-4" />, color: 'text-yellow-500' },
  system_alert: { icon: <AlertTriangle className="h-4 w-4" />, color: 'text-red-500' },
  standup_completed: { icon: <MessageSquare className="h-4 w-4" />, color: 'text-green-500' },
}

export function NotificationDropdown() {
  const { toast } = useToast()
  const [open, setOpen] = useState(false)
  const [notifications, setNotifications] = useState<Notification[]>([])
  const [unreadCount, setUnreadCount] = useState(0)
  const [loading, setLoading] = useState(false)
  const [markingAll, setMarkingAll] = useState(false)

  // 加载通知
  const loadNotifications = async () => {
    try {
      setLoading(true)
      const response = await fetch('/api/notifications?limit=10')
      const data = await response.json()
      if (data.success) {
        setNotifications(data.notifications || [])
        setUnreadCount(data.unreadCount || 0)
      }
    } catch (error) {
      console.error('Failed to load notifications:', error)
    } finally {
      setLoading(false)
    }
  }

  // 首次加载
  useEffect(() => {
    loadNotifications()
    // 每分钟刷新一次
    const interval = setInterval(loadNotifications, 60000)
    return () => clearInterval(interval)
  }, [])

  // 打开时刷新
  useEffect(() => {
    if (open) {
      loadNotifications()
    }
  }, [open])

  // 标记单个为已读
  const handleMarkAsRead = async (notificationId: string) => {
    try {
      const response = await fetch('/api/notifications', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'markAsRead',
          notificationId,
        }),
      })

      if (response.ok) {
        setNotifications((prev) =>
          prev.map((n) =>
            n.id === notificationId ? { ...n, read: true, readAt: new Date().toISOString() } : n
          )
        )
        setUnreadCount((prev) => Math.max(0, prev - 1))
      }
    } catch (error) {
      console.error('Failed to mark as read:', error)
    }
  }

  // 标记全部为已读
  const handleMarkAllAsRead = async () => {
    try {
      setMarkingAll(true)
      const response = await fetch('/api/notifications', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'markAllAsRead' }),
      })

      if (response.ok) {
        setNotifications((prev) =>
          prev.map((n) => ({ ...n, read: true, readAt: new Date().toISOString() }))
        )
        setUnreadCount(0)
        toast({
          title: '已全部标为已读',
        })
      }
    } catch (error) {
      console.error('Failed to mark all as read:', error)
      toast({
        title: '操作失败',
        variant: 'destructive',
      })
    } finally {
      setMarkingAll(false)
    }
  }

  // 格式化时间
  const formatTime = (dateStr: string) => {
    const date = new Date(dateStr)
    const now = new Date()
    const diffMs = now.getTime() - date.getTime()
    const diffMins = Math.floor(diffMs / (1000 * 60))
    const diffHours = Math.floor(diffMs / (1000 * 60 * 60))
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24))

    if (diffMins < 1) return '刚刚'
    if (diffMins < 60) return `${diffMins}分钟前`
    if (diffHours < 24) return `${diffHours}小时前`
    if (diffDays < 7) return `${diffDays}天前`
    return date.toLocaleDateString('zh-CN')
  }

  // 获取通知链接
  const getNotificationLink = (notification: Notification): string | null => {
    if (notification.actions && notification.actions.length > 0) {
      const primaryAction = notification.actions.find((a) => a.primary) || notification.actions[0]
      return primaryAction.url
    }
    if (notification.relatedTo) {
      const { type, id } = notification.relatedTo
      switch (type) {
        case 'project':
          return `/projects/${id}`
        case 'discussion':
          return `/projects/${id}/discuss`
        case 'decision':
          return `/projects/${id}/decisions`
        case 'deliverable':
          return `/projects/${id}/assets`
        case 'standup':
          return `/projects/${id}/standups`
        default:
          return null
      }
    }
    return null
  }

  return (
    <DropdownMenu open={open} onOpenChange={setOpen}>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="icon" className="relative">
          <Bell className="h-4 w-4" />
          {unreadCount > 0 && (
            <Badge
              variant="destructive"
              className="absolute -top-1 -right-1 h-5 w-5 p-0 flex items-center justify-center text-xs"
            >
              {unreadCount > 9 ? '9+' : unreadCount}
            </Badge>
          )}
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-80 p-0">
        {/* Header */}
        <div className="flex items-center justify-between p-3 border-b">
          <span className="font-semibold">通知</span>
          {unreadCount > 0 && (
            <Button
              variant="ghost"
              size="sm"
              className="h-7 text-xs"
              onClick={handleMarkAllAsRead}
              disabled={markingAll}
            >
              {markingAll ? (
                <Loader2 className="h-3 w-3 animate-spin" />
              ) : (
                <>
                  <Check className="h-3 w-3 mr-1" />
                  全部已读
                </>
              )}
            </Button>
          )}
        </div>

        {/* Notifications List */}
        <ScrollArea className="h-[320px]">
          {loading && notifications.length === 0 ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            </div>
          ) : notifications.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-8 text-muted-foreground">
              <Bell className="h-8 w-8 mb-2 opacity-50" />
              <p className="text-sm">暂无通知</p>
            </div>
          ) : (
            <div className="divide-y">
              {notifications.map((notification) => {
                const config = TYPE_CONFIG[notification.type] || {
                  icon: <Info className="h-4 w-4" />,
                  color: 'text-gray-500',
                }
                const link = getNotificationLink(notification)

                const content = (
                  <div
                    className={cn(
                      'p-3 hover:bg-muted/50 cursor-pointer transition-colors',
                      !notification.read && 'bg-primary/5'
                    )}
                    onClick={() => {
                      if (!notification.read) {
                        handleMarkAsRead(notification.id)
                      }
                    }}
                  >
                    <div className="flex gap-3">
                      <div className={cn('shrink-0 mt-0.5', config.color)}>
                        {config.icon}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-start justify-between gap-2">
                          <p className={cn('text-sm font-medium', !notification.read && 'font-semibold')}>
                            {notification.title}
                          </p>
                          {!notification.read && (
                            <div className="w-2 h-2 rounded-full bg-primary shrink-0 mt-1.5" />
                          )}
                        </div>
                        <p className="text-xs text-muted-foreground line-clamp-2 mt-0.5">
                          {notification.body}
                        </p>
                        <p className="text-xs text-muted-foreground mt-1">
                          {formatTime(notification.createdAt)}
                        </p>
                      </div>
                    </div>
                  </div>
                )

                return link ? (
                  <Link key={notification.id} href={link} onClick={() => setOpen(false)}>
                    {content}
                  </Link>
                ) : (
                  <div key={notification.id}>{content}</div>
                )
              })}
            </div>
          )}
        </ScrollArea>

        {/* Footer */}
        <div className="border-t p-2">
          <Link href="/notifications" onClick={() => setOpen(false)}>
            <Button variant="ghost" className="w-full h-8 text-xs">
              查看全部通知
            </Button>
          </Link>
        </div>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
