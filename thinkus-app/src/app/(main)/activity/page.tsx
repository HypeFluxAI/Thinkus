'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import { ScrollArea } from '@/components/ui/scroll-area'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  ArrowLeft,
  Activity,
  Folder,
  MessageSquare,
  Target,
  CheckSquare,
  Calendar,
  Users,
  CreditCard,
  Settings,
  LogIn,
  LogOut,
  Bot,
  User,
  Zap,
} from 'lucide-react'

interface ActivityItem {
  _id: string
  type: string
  entity: string
  title: string
  description?: string
  actor?: {
    type: 'user' | 'ai_executive' | 'system'
    name?: string
  }
  projectId?: {
    _id: string
    name: string
  }
  createdAt: string
}

const TYPE_LABELS: Record<string, { label: string; icon: React.ReactNode; color: string }> = {
  project_created: { label: '创建项目', icon: <Folder className="h-4 w-4" />, color: 'text-blue-500' },
  project_updated: { label: '更新项目', icon: <Folder className="h-4 w-4" />, color: 'text-blue-500' },
  project_deleted: { label: '删除项目', icon: <Folder className="h-4 w-4" />, color: 'text-red-500' },
  discussion_started: { label: '发起讨论', icon: <MessageSquare className="h-4 w-4" />, color: 'text-green-500' },
  discussion_completed: { label: '完成讨论', icon: <MessageSquare className="h-4 w-4" />, color: 'text-green-500' },
  decision_proposed: { label: '提议决策', icon: <Target className="h-4 w-4" />, color: 'text-orange-500' },
  decision_approved: { label: '批准决策', icon: <Target className="h-4 w-4" />, color: 'text-green-500' },
  decision_rejected: { label: '拒绝决策', icon: <Target className="h-4 w-4" />, color: 'text-red-500' },
  action_created: { label: '创建行动项', icon: <CheckSquare className="h-4 w-4" />, color: 'text-purple-500' },
  action_completed: { label: '完成行动项', icon: <CheckSquare className="h-4 w-4" />, color: 'text-green-500' },
  standup_held: { label: '举行例会', icon: <Calendar className="h-4 w-4" />, color: 'text-indigo-500' },
  expert_consulted: { label: '专家咨询', icon: <Users className="h-4 w-4" />, color: 'text-pink-500' },
  payment_made: { label: '支付完成', icon: <CreditCard className="h-4 w-4" />, color: 'text-emerald-500' },
  settings_updated: { label: '更新设置', icon: <Settings className="h-4 w-4" />, color: 'text-gray-500' },
  user_login: { label: '用户登录', icon: <LogIn className="h-4 w-4" />, color: 'text-blue-500' },
  user_logout: { label: '用户登出', icon: <LogOut className="h-4 w-4" />, color: 'text-gray-500' },
}

const ENTITY_FILTERS = [
  { value: 'all', label: '全部' },
  { value: 'project', label: '项目' },
  { value: 'discussion', label: '讨论' },
  { value: 'decision', label: '决策' },
  { value: 'action_item', label: '行动项' },
  { value: 'standup', label: '例会' },
]

export default function ActivityPage() {
  const [loading, setLoading] = useState(true)
  const [activities, setActivities] = useState<ActivityItem[]>([])
  const [entityFilter, setEntityFilter] = useState('all')
  const [hasMore, setHasMore] = useState(true)

  useEffect(() => {
    loadActivities()
  }, [entityFilter])

  const loadActivities = async (append = false) => {
    try {
      if (!append) setLoading(true)

      const offset = append ? activities.length : 0
      const params = new URLSearchParams({
        limit: '30',
        offset: offset.toString(),
      })

      if (entityFilter !== 'all') {
        params.set('entity', entityFilter)
      }

      const response = await fetch(`/api/activity?${params}`)
      if (response.ok) {
        const data = await response.json()
        if (append) {
          setActivities([...activities, ...data.activities])
        } else {
          setActivities(data.activities || [])
        }
        setHasMore(data.activities?.length === 30)
      }
    } catch (error) {
      console.error('Failed to load activities:', error)
    } finally {
      setLoading(false)
    }
  }

  const getActorIcon = (actor?: ActivityItem['actor']) => {
    if (!actor) return <User className="h-4 w-4" />
    switch (actor.type) {
      case 'ai_executive':
        return <Bot className="h-4 w-4 text-primary" />
      case 'system':
        return <Zap className="h-4 w-4 text-yellow-500" />
      default:
        return <User className="h-4 w-4" />
    }
  }

  const formatTime = (dateStr: string) => {
    const date = new Date(dateStr)
    const now = new Date()
    const diff = now.getTime() - date.getTime()
    const minutes = Math.floor(diff / 60000)
    const hours = Math.floor(diff / 3600000)
    const days = Math.floor(diff / 86400000)

    if (minutes < 1) return '刚刚'
    if (minutes < 60) return `${minutes} 分钟前`
    if (hours < 24) return `${hours} 小时前`
    if (days < 7) return `${days} 天前`

    return date.toLocaleDateString('zh-CN', {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    })
  }

  // 按日期分组
  const groupedActivities = activities.reduce((groups, activity) => {
    const date = new Date(activity.createdAt).toLocaleDateString('zh-CN', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    })
    if (!groups[date]) {
      groups[date] = []
    }
    groups[date].push(activity)
    return groups
  }, {} as Record<string, ActivityItem[]>)

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b bg-background/80 backdrop-blur-sm sticky top-0 z-50">
        <div className="container mx-auto px-4 h-14 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Link href="/dashboard">
              <Button variant="ghost" size="icon">
                <ArrowLeft className="h-4 w-4" />
              </Button>
            </Link>
            <div className="flex items-center gap-2">
              <Activity className="h-5 w-5 text-primary" />
              <span className="font-semibold">活动记录</span>
            </div>
          </div>
          <Select value={entityFilter} onValueChange={setEntityFilter}>
            <SelectTrigger className="w-32">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {ENTITY_FILTERS.map((filter) => (
                <SelectItem key={filter.value} value={filter.value}>
                  {filter.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </header>

      <main className="container mx-auto px-4 py-6 max-w-3xl">
        {loading ? (
          <div className="space-y-4">
            {[1, 2, 3, 4, 5].map((i) => (
              <div key={i} className="flex gap-4">
                <Skeleton className="h-10 w-10 rounded-full" />
                <div className="flex-1 space-y-2">
                  <Skeleton className="h-4 w-3/4" />
                  <Skeleton className="h-3 w-1/2" />
                </div>
              </div>
            ))}
          </div>
        ) : activities.length === 0 ? (
          <Card>
            <CardContent className="p-12 text-center">
              <Activity className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
              <h3 className="text-lg font-medium mb-2">暂无活动记录</h3>
              <p className="text-muted-foreground">
                您的操作历史将显示在这里
              </p>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-8">
            {Object.entries(groupedActivities).map(([date, items]) => (
              <div key={date}>
                <h2 className="text-sm font-medium text-muted-foreground mb-4 sticky top-14 bg-background py-2">
                  {date}
                </h2>
                <div className="space-y-1">
                  {items.map((activity) => {
                    const typeInfo = TYPE_LABELS[activity.type] || {
                      label: activity.type,
                      icon: <Activity className="h-4 w-4" />,
                      color: 'text-gray-500',
                    }

                    return (
                      <div
                        key={activity._id}
                        className="flex items-start gap-4 p-3 rounded-lg hover:bg-muted/50 transition-colors"
                      >
                        <div className={`p-2 rounded-full bg-muted ${typeInfo.color}`}>
                          {typeInfo.icon}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="font-medium">{activity.title}</span>
                            {activity.projectId && (
                              <Link href={`/projects/${activity.projectId._id}`}>
                                <Badge variant="outline" className="text-xs">
                                  {activity.projectId.name}
                                </Badge>
                              </Link>
                            )}
                          </div>
                          {activity.description && (
                            <p className="text-sm text-muted-foreground mt-1 line-clamp-2">
                              {activity.description}
                            </p>
                          )}
                          <div className="flex items-center gap-3 mt-2 text-xs text-muted-foreground">
                            <span className="flex items-center gap-1">
                              {getActorIcon(activity.actor)}
                              {activity.actor?.name || '您'}
                            </span>
                            <span>{formatTime(activity.createdAt)}</span>
                          </div>
                        </div>
                      </div>
                    )
                  })}
                </div>
              </div>
            ))}

            {hasMore && (
              <div className="text-center">
                <Button
                  variant="outline"
                  onClick={() => loadActivities(true)}
                >
                  加载更多
                </Button>
              </div>
            )}
          </div>
        )}
      </main>
    </div>
  )
}
