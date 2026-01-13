'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
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
  Trash2,
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

const TYPE_CONFIG: Record<string, { icon: React.ReactNode; color: string; label: string }> = {
  decision_pending: { icon: <Target className="h-4 w-4" />, color: 'text-orange-500', label: '待确认决策' },
  decision_executed: { icon: <CheckCircle2 className="h-4 w-4" />, color: 'text-green-500', label: '决策已执行' },
  discussion_concluded: { icon: <MessageSquare className="h-4 w-4" />, color: 'text-blue-500', label: '讨论结束' },
  deliverable_ready: { icon: <FileCheck className="h-4 w-4" />, color: 'text-purple-500', label: '交付物就绪' },
  phase_changed: { icon: <Rocket className="h-4 w-4" />, color: 'text-indigo-500', label: '阶段变更' },
  daily_summary: { icon: <Info className="h-4 w-4" />, color: 'text-gray-500', label: '每日摘要' },
  payment_succeeded: { icon: <CreditCard className="h-4 w-4" />, color: 'text-green-500', label: '支付成功' },
  payment_failed: { icon: <AlertTriangle className="h-4 w-4" />, color: 'text-red-500', label: '支付失败' },
  subscription_created: { icon: <CreditCard className="h-4 w-4" />, color: 'text-blue-500', label: '订阅创建' },
  subscription_updated: { icon: <CreditCard className="h-4 w-4" />, color: 'text-blue-500', label: '订阅更新' },
  subscription_canceled: { icon: <CreditCard className="h-4 w-4" />, color: 'text-yellow-500', label: '订阅取消' },
  system_alert: { icon: <AlertTriangle className="h-4 w-4" />, color: 'text-red-500', label: '系统提醒' },
  standup_completed: { icon: <MessageSquare className="h-4 w-4" />, color: 'text-green-500', label: '例会完成' },
}

export default function NotificationsPage() {
  const { toast } = useToast()
  const [notifications, setNotifications] = useState<Notification[]>([])
  const [unreadCount, setUnreadCount] = useState(0)
  const [total, setTotal] = useState(0)
  const [loading, setLoading] = useState(true)
  const [markingAll, setMarkingAll] = useState(false)
  const [activeTab, setActiveTab] = useState('all')

  // 加载通知
  const loadNotifications = async (unreadOnly = false) => {
    try {
      setLoading(true)
      const url = unreadOnly
        ? '/api/notifications?unreadOnly=true&limit=50'
        : '/api/notifications?limit=50'
      const response = await fetch(url)
      const data = await response.json()
      if (data.success) {
        setNotifications(data.notifications || [])
        setUnreadCount(data.unreadCount || 0)
        setTotal(data.total || 0)
      }
    } catch (error) {
      console.error('Failed to load notifications:', error)
      toast({
        title: '加载失败',
        variant: 'destructive',
      })
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadNotifications(activeTab === 'unread')
  }, [activeTab])

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

  // 删除通知
  const handleDelete = async (notificationId: string) => {
    try {
      const response = await fetch(`/api/notifications?id=${notificationId}`, {
        method: 'DELETE',
      })

      if (response.ok) {
        const wasUnread = notifications.find((n) => n.id === notificationId && !n.read)
        setNotifications((prev) => prev.filter((n) => n.id !== notificationId))
        if (wasUnread) {
          setUnreadCount((prev) => Math.max(0, prev - 1))
        }
        setTotal((prev) => Math.max(0, prev - 1))
        toast({
          title: '通知已删除',
        })
      }
    } catch (error) {
      console.error('Failed to delete notification:', error)
      toast({
        title: '删除失败',
        variant: 'destructive',
      })
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
    return date.toLocaleDateString('zh-CN', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    })
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
    <div className="bg-background min-h-screen">
      {/* Page Header */}
      <div className="border-b bg-muted/30">
        <div className="container mx-auto px-4 py-4 max-w-4xl">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Bell className="h-6 w-6 text-primary" />
              <div>
                <h1 className="text-2xl font-bold">通知中心</h1>
                <p className="text-sm text-muted-foreground">
                  共 {total} 条通知，{unreadCount} 条未读
                </p>
              </div>
            </div>
            {unreadCount > 0 && (
              <Button
                variant="outline"
                onClick={handleMarkAllAsRead}
                disabled={markingAll}
              >
                {markingAll ? (
                  <Loader2 className="h-4 w-4 animate-spin mr-2" />
                ) : (
                  <Check className="h-4 w-4 mr-2" />
                )}
                全部标为已读
              </Button>
            )}
          </div>
        </div>
      </div>

      <main className="container mx-auto px-4 py-6 max-w-4xl">
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="mb-6">
            <TabsTrigger value="all">全部</TabsTrigger>
            <TabsTrigger value="unread">
              未读
              {unreadCount > 0 && (
                <Badge variant="secondary" className="ml-2 text-xs">
                  {unreadCount}
                </Badge>
              )}
            </TabsTrigger>
          </TabsList>

          <TabsContent value="all" className="space-y-0">
            <NotificationList
              notifications={notifications}
              loading={loading}
              onMarkAsRead={handleMarkAsRead}
              onDelete={handleDelete}
              formatTime={formatTime}
              getNotificationLink={getNotificationLink}
            />
          </TabsContent>

          <TabsContent value="unread" className="space-y-0">
            <NotificationList
              notifications={notifications.filter((n) => !n.read)}
              loading={loading}
              onMarkAsRead={handleMarkAsRead}
              onDelete={handleDelete}
              formatTime={formatTime}
              getNotificationLink={getNotificationLink}
            />
          </TabsContent>
        </Tabs>
      </main>
    </div>
  )
}

function NotificationList({
  notifications,
  loading,
  onMarkAsRead,
  onDelete,
  formatTime,
  getNotificationLink,
}: {
  notifications: Notification[]
  loading: boolean
  onMarkAsRead: (id: string) => void
  onDelete: (id: string) => void
  formatTime: (dateStr: string) => string
  getNotificationLink: (notification: Notification) => string | null
}) {
  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    )
  }

  if (notifications.length === 0) {
    return (
      <Card>
        <CardContent className="py-12 text-center">
          <Bell className="h-12 w-12 mx-auto text-muted-foreground mb-4 opacity-50" />
          <h3 className="text-lg font-medium mb-2">暂无通知</h3>
          <p className="text-muted-foreground">当有新通知时会显示在这里</p>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card>
      <div className="divide-y">
        {notifications.map((notification) => {
          const config = TYPE_CONFIG[notification.type] || {
            icon: <Info className="h-4 w-4" />,
            color: 'text-gray-500',
            label: notification.type,
          }
          const link = getNotificationLink(notification)

          return (
            <div
              key={notification.id}
              className={cn(
                'p-4 hover:bg-muted/50 transition-colors',
                !notification.read && 'bg-primary/5'
              )}
            >
              <div className="flex gap-4">
                <div className={cn('shrink-0 mt-1', config.color)}>
                  {config.icon}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <span className={cn('font-medium', !notification.read && 'font-semibold')}>
                          {notification.title}
                        </span>
                        <Badge variant="outline" className="text-xs">
                          {config.label}
                        </Badge>
                        {notification.priority === 'urgent' && (
                          <Badge variant="destructive" className="text-xs">
                            紧急
                          </Badge>
                        )}
                        {notification.priority === 'high' && (
                          <Badge variant="default" className="text-xs">
                            重要
                          </Badge>
                        )}
                      </div>
                      <p className="text-sm text-muted-foreground mb-2">
                        {notification.body}
                      </p>
                      <div className="flex items-center gap-4">
                        <span className="text-xs text-muted-foreground">
                          {formatTime(notification.createdAt)}
                        </span>
                        {link && (
                          <Link
                            href={link}
                            className="text-xs text-primary hover:underline"
                            onClick={() => {
                              if (!notification.read) {
                                onMarkAsRead(notification.id)
                              }
                            }}
                          >
                            查看详情
                          </Link>
                        )}
                      </div>
                    </div>
                    <div className="flex items-center gap-1 shrink-0">
                      {!notification.read && (
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8"
                          onClick={() => onMarkAsRead(notification.id)}
                          title="标为已读"
                        >
                          <Check className="h-4 w-4" />
                        </Button>
                      )}
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 text-muted-foreground hover:text-destructive"
                        onClick={() => onDelete(notification.id)}
                        title="删除"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )
        })}
      </div>
    </Card>
  )
}
