'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Skeleton } from '@/components/ui/skeleton'
import { useToast } from '@/components/ui/use-toast'
import {
  Target,
  Rocket,
  MessageSquare,
  FileCheck,
  Calendar,
  TrendingUp,
  AlertTriangle,
  CheckCircle2,
  Clock,
  Users,
  Activity,
  BarChart3,
  ArrowRight,
  Loader2,
} from 'lucide-react'
import { DecisionPanel } from '@/components/decision'
import { NotificationDropdown } from '@/components/notification'
import Link from 'next/link'

interface DashboardStats {
  projects: {
    total: number
    active: number
    completed: number
  }
  decisions: {
    pending: number
    critical: number
    approved: number
  }
  discussions: {
    active: number
    concluded: number
  }
  deliverables: {
    pending: number
    completed: number
  }
  standups: {
    upcoming: number
    completed: number
  }
}

interface RecentActivity {
  id: string
  type: 'decision' | 'discussion' | 'deliverable' | 'standup' | 'phase_change'
  title: string
  description: string
  project?: string
  projectId?: string
  timestamp: string
}

interface UpcomingItem {
  id: string
  type: 'standup' | 'deadline' | 'decision'
  title: string
  project?: string
  projectId?: string
  dueAt: string
}

export default function CEODashboardPage() {
  const { toast } = useToast()
  const [loading, setLoading] = useState(true)
  const [stats, setStats] = useState<DashboardStats | null>(null)
  const [recentActivity, setRecentActivity] = useState<RecentActivity[]>([])
  const [upcomingItems, setUpcomingItems] = useState<UpcomingItem[]>([])

  // 加载仪表盘数据
  useEffect(() => {
    loadDashboardData()
  }, [])

  const loadDashboardData = async () => {
    try {
      setLoading(true)

      // 并行加载多个数据源
      const [statsRes, decisionsRes, standupsRes] = await Promise.all([
        fetch('/api/dashboard/stats'),
        fetch('/api/decisions?status=proposed&limit=5'),
        fetch('/api/standups?upcoming=true'),
      ])

      // 处理统计数据
      if (statsRes.ok) {
        const data = await statsRes.json()
        setStats({
          projects: data.stats?.projects || { total: 0, active: 0, completed: 0 },
          decisions: {
            pending: data.stats?.decisions?.total || 0,
            critical: 0,
            approved: data.stats?.decisions?.implemented || 0,
          },
          discussions: {
            active: data.stats?.discussions?.thisMonth || 0,
            concluded: data.stats?.discussions?.total || 0,
          },
          deliverables: {
            pending: 0,
            completed: 0,
          },
          standups: {
            upcoming: 0,
            completed: 0,
          },
        })
      }

      // 处理待确认决策
      if (decisionsRes.ok) {
        const data = await decisionsRes.json()
        const decisions = data.decisions || []
        const criticalCount = decisions.filter((d: any) => d.importance === 'critical').length

        setStats((prev) =>
          prev
            ? {
                ...prev,
                decisions: {
                  ...prev.decisions,
                  pending: decisions.length,
                  critical: criticalCount,
                },
              }
            : null
        )

        // 添加到最近活动
        const decisionActivities: RecentActivity[] = decisions.slice(0, 3).map((d: any) => ({
          id: d.id,
          type: 'decision' as const,
          title: d.title,
          description: `${d.proposedBy} 提议的${d.type}决策`,
          project: d.project?.name,
          projectId: d.project?.id,
          timestamp: d.createdAt,
        }))
        setRecentActivity((prev) => [...decisionActivities, ...prev].slice(0, 10))
      }

      // 处理即将进行的例会
      if (standupsRes.ok) {
        const data = await standupsRes.json()
        const standups = data.standups || []

        setStats((prev) =>
          prev
            ? {
                ...prev,
                standups: {
                  ...prev.standups,
                  upcoming: standups.length,
                },
              }
            : null
        )

        // 添加到即将到来项目
        const upcomingStandups: UpcomingItem[] = standups.slice(0, 3).map((s: any) => ({
          id: s.id,
          type: 'standup' as const,
          title: s.title,
          projectId: s.projectId,
          dueAt: s.scheduledAt,
        }))
        setUpcomingItems(upcomingStandups)
      }
    } catch (error) {
      console.error('Failed to load dashboard data:', error)
      toast({
        title: '加载失败',
        description: '无法加载仪表盘数据',
        variant: 'destructive',
      })
    } finally {
      setLoading(false)
    }
  }

  // 格式化时间
  const formatTime = (dateStr: string) => {
    const date = new Date(dateStr)
    const now = new Date()
    const diffMs = now.getTime() - date.getTime()
    const diffMins = Math.floor(diffMs / (1000 * 60))
    const diffHours = Math.floor(diffMs / (1000 * 60 * 60))

    if (diffMins < 0) {
      // 未来时间
      const futureMins = Math.abs(diffMins)
      if (futureMins < 60) return `${futureMins}分钟后`
      const futureHours = Math.floor(futureMins / 60)
      if (futureHours < 24) return `${futureHours}小时后`
      const futureDays = Math.floor(futureHours / 24)
      return `${futureDays}天后`
    }

    if (diffMins < 1) return '刚刚'
    if (diffMins < 60) return `${diffMins}分钟前`
    if (diffHours < 24) return `${diffHours}小时前`
    return date.toLocaleDateString('zh-CN')
  }

  const getActivityIcon = (type: RecentActivity['type']) => {
    switch (type) {
      case 'decision':
        return <Target className="h-4 w-4 text-orange-500" />
      case 'discussion':
        return <MessageSquare className="h-4 w-4 text-blue-500" />
      case 'deliverable':
        return <FileCheck className="h-4 w-4 text-purple-500" />
      case 'standup':
        return <Calendar className="h-4 w-4 text-green-500" />
      case 'phase_change':
        return <Rocket className="h-4 w-4 text-indigo-500" />
      default:
        return <Activity className="h-4 w-4 text-gray-500" />
    }
  }

  if (loading) {
    return (
      <div className="bg-background min-h-screen">
        <div className="border-b bg-muted/30">
          <div className="container mx-auto px-4 py-4 max-w-6xl">
            <Skeleton className="h-8 w-48" />
            <Skeleton className="h-4 w-64 mt-2" />
          </div>
        </div>
        <main className="container mx-auto px-4 py-6 max-w-6xl">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
            {[1, 2, 3, 4].map((i) => (
              <Skeleton key={i} className="h-24" />
            ))}
          </div>
          <Skeleton className="h-96" />
        </main>
      </div>
    )
  }

  return (
    <div className="bg-background min-h-screen">
      {/* Page Header */}
      <div className="border-b bg-muted/30">
        <div className="container mx-auto px-4 py-4 max-w-6xl">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-primary/10 rounded-lg">
                <BarChart3 className="h-6 w-6 text-primary" />
              </div>
              <div>
                <h1 className="text-2xl font-bold">CEO 工作台</h1>
                <p className="text-sm text-muted-foreground">
                  全局视角，掌控全局
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <NotificationDropdown />
              <Link href="/dashboard">
                <Button variant="outline">
                  返回仪表盘
                </Button>
              </Link>
            </div>
          </div>
        </div>
      </div>

      <main className="container mx-auto px-4 py-6 max-w-6xl">
        {/* Stats Grid */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
          <Card className={stats?.decisions.critical ? 'border-red-200 dark:border-red-900' : ''}>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">待确认决策</p>
                  <p className="text-2xl font-bold">{stats?.decisions.pending || 0}</p>
                  {stats?.decisions.critical ? (
                    <p className="text-xs text-red-600 flex items-center gap-1">
                      <AlertTriangle className="h-3 w-3" />
                      {stats.decisions.critical} 个关键决策
                    </p>
                  ) : null}
                </div>
                <div className="p-3 bg-orange-100 dark:bg-orange-900/30 rounded-lg">
                  <Target className="h-6 w-6 text-orange-600" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">活跃项目</p>
                  <p className="text-2xl font-bold">{stats?.projects.active || 0}</p>
                  <p className="text-xs text-muted-foreground">
                    共 {stats?.projects.total || 0} 个项目
                  </p>
                </div>
                <div className="p-3 bg-blue-100 dark:bg-blue-900/30 rounded-lg">
                  <Rocket className="h-6 w-6 text-blue-600" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">即将例会</p>
                  <p className="text-2xl font-bold">{stats?.standups.upcoming || 0}</p>
                  <p className="text-xs text-muted-foreground">本周安排</p>
                </div>
                <div className="p-3 bg-green-100 dark:bg-green-900/30 rounded-lg">
                  <Calendar className="h-6 w-6 text-green-600" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">本月讨论</p>
                  <p className="text-2xl font-bold">{stats?.discussions.active || 0}</p>
                  <p className="text-xs text-muted-foreground flex items-center gap-1">
                    <TrendingUp className="h-3 w-3 text-green-500" />
                    活跃中
                  </p>
                </div>
                <div className="p-3 bg-purple-100 dark:bg-purple-900/30 rounded-lg">
                  <MessageSquare className="h-6 w-6 text-purple-600" />
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Main Content */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Left Column - Decisions */}
          <div className="lg:col-span-2">
            <DecisionPanel showAll limit={5} />
          </div>

          {/* Right Column - Activity & Upcoming */}
          <div className="space-y-6">
            {/* Upcoming Items */}
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-base flex items-center gap-2">
                  <Clock className="h-4 w-4 text-primary" />
                  即将到来
                </CardTitle>
              </CardHeader>
              <CardContent>
                {upcomingItems.length === 0 ? (
                  <div className="text-center py-6 text-muted-foreground">
                    <Clock className="h-8 w-8 mx-auto mb-2 opacity-50" />
                    <p className="text-sm">暂无即将到来的事项</p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {upcomingItems.map((item) => (
                      <div
                        key={item.id}
                        className="flex items-center gap-3 p-2 rounded-lg hover:bg-muted/50"
                      >
                        {item.type === 'standup' ? (
                          <Calendar className="h-4 w-4 text-green-500 shrink-0" />
                        ) : item.type === 'deadline' ? (
                          <AlertTriangle className="h-4 w-4 text-red-500 shrink-0" />
                        ) : (
                          <Target className="h-4 w-4 text-orange-500 shrink-0" />
                        )}
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium truncate">{item.title}</p>
                          <p className="text-xs text-muted-foreground">
                            {formatTime(item.dueAt)}
                          </p>
                        </div>
                        {item.projectId && (
                          <Link href={`/projects/${item.projectId}`}>
                            <Button variant="ghost" size="icon" className="h-8 w-8">
                              <ArrowRight className="h-4 w-4" />
                            </Button>
                          </Link>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Recent Activity */}
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-base flex items-center gap-2">
                  <Activity className="h-4 w-4 text-primary" />
                  最近活动
                </CardTitle>
              </CardHeader>
              <CardContent>
                {recentActivity.length === 0 ? (
                  <div className="text-center py-6 text-muted-foreground">
                    <Activity className="h-8 w-8 mx-auto mb-2 opacity-50" />
                    <p className="text-sm">暂无最近活动</p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {recentActivity.map((activity) => (
                      <div
                        key={activity.id}
                        className="flex items-start gap-3 p-2 rounded-lg hover:bg-muted/50"
                      >
                        <div className="shrink-0 mt-0.5">
                          {getActivityIcon(activity.type)}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium truncate">{activity.title}</p>
                          <p className="text-xs text-muted-foreground truncate">
                            {activity.description}
                          </p>
                          <p className="text-xs text-muted-foreground mt-1">
                            {formatTime(activity.timestamp)}
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Quick Links */}
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-base">快捷入口</CardTitle>
              </CardHeader>
              <CardContent className="grid grid-cols-2 gap-2">
                <Link href="/projects">
                  <Button variant="outline" className="w-full justify-start">
                    <Rocket className="h-4 w-4 mr-2" />
                    项目
                  </Button>
                </Link>
                <Link href="/experts">
                  <Button variant="outline" className="w-full justify-start">
                    <Users className="h-4 w-4 mr-2" />
                    专家
                  </Button>
                </Link>
                <Link href="/notifications">
                  <Button variant="outline" className="w-full justify-start">
                    <MessageSquare className="h-4 w-4 mr-2" />
                    通知
                  </Button>
                </Link>
                <Link href="/settings">
                  <Button variant="outline" className="w-full justify-start">
                    <BarChart3 className="h-4 w-4 mr-2" />
                    设置
                  </Button>
                </Link>
              </CardContent>
            </Card>
          </div>
        </div>
      </main>
    </div>
  )
}
