'use client'

import { useState, useEffect } from 'react'
import { useSession, signOut } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Progress } from '@/components/ui/progress'
import { trpc } from '@/lib/trpc/client'
import {
  Plus, Rocket, Clock, CheckCircle, LogOut, Sparkles,
  MessageSquare, Users, AlertTriangle, Target, TrendingUp,
  Calendar, Settings, HelpCircle, Cpu,
} from 'lucide-react'
import { EmptyState, emptyStatePresets } from '@/components/ui/empty-state'
import { NotificationDropdown } from '@/components/notification'
import { OnboardingGuide, OnboardingChecklist } from '@/components/onboarding'
import { FeedbackDialog } from '@/components/feedback'
import { KeyboardShortcuts } from '@/components/keyboard-shortcuts'
import { CommandPalette, SearchTrigger } from '@/components/search'
import Link from 'next/link'
import type { IProject } from '@/lib/db/models/project'

interface DashboardStats {
  stats: {
    projects: { total: number; active: number; completed: number }
    discussions: { total: number; thisMonth: number; trend: number }
    decisions: { total: number; implemented: number }
    actionItems: {
      total: number; pending: number; inProgress: number
      completed: number; overdue: number; completionRate: number
    }
    executives: { activeCount: number; totalMessages: number }
  }
  subscription: {
    plan: string
    status: string
    usage: { discussionsThisMonth: number; messagesThisDay: number }
  }
  recent: {
    projects: Array<{ id: string; name: string; phase: string; status: string }>
    discussions: Array<{ id: string; topic: string; status: string; projectName?: string }>
  }
  actionItems: {
    overdue: Array<{ id: string; title: string; priority: string; dueDate: string }>
    upcoming: Array<{ id: string; title: string; priority: string; dueDate: string }>
  }
}

export default function DashboardPage() {
  const { data: session } = useSession()
  const router = useRouter()
  const [dashboardData, setDashboardData] = useState<DashboardStats | null>(null)
  const [statsLoading, setStatsLoading] = useState(true)

  const { data: projectsData, isLoading } = trpc.project.list.useQuery()

  // 加载仪表盘统计数据
  useEffect(() => {
    async function loadDashboardStats() {
      try {
        const res = await fetch('/api/dashboard/stats')
        if (res.ok) {
          const data = await res.json()
          setDashboardData(data)
        }
      } catch (error) {
        console.error('Failed to load dashboard stats:', error)
      } finally {
        setStatsLoading(false)
      }
    }
    loadDashboardStats()
  }, [])

  const projects = (projectsData?.projects || []) as unknown as IProject[]
  const inProgressProjects = projects.filter(p => ['discussing', 'in_progress', 'paid'].includes(p.status))
  const completedProjects = projects.filter(p => p.status === 'completed')

  const getStatusBadge = (status: string) => {
    const statusMap: Record<string, { label: string; variant: 'default' | 'secondary' | 'destructive' | 'outline' }> = {
      draft: { label: '草稿', variant: 'secondary' },
      discussing: { label: '讨论中', variant: 'default' },
      confirmed: { label: '已确认', variant: 'outline' },
      paid: { label: '已支付', variant: 'default' },
      in_progress: { label: '开发中', variant: 'default' },
      completed: { label: '已完成', variant: 'secondary' },
      cancelled: { label: '已取消', variant: 'destructive' },
    }
    const config = statusMap[status] || { label: status, variant: 'secondary' as const }
    return <Badge variant={config.variant}>{config.label}</Badge>
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-background to-muted">
      {/* Onboarding Guide */}
      <OnboardingGuide />

      {/* Keyboard Shortcuts */}
      <KeyboardShortcuts />

      {/* Command Palette */}
      <CommandPalette />

      {/* Header */}
      <header className="border-b bg-background/80 backdrop-blur-sm sticky top-0 z-50">
        <div className="container mx-auto px-4 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Sparkles className="h-6 w-6 text-primary" />
            <span className="font-bold text-xl">Thinkus</span>
          </div>
          <div className="flex items-center gap-2">
            <SearchTrigger />
            <Link href="/ai-employees">
              <Button variant="ghost" size="icon" title="AI 员工">
                <Cpu className="h-4 w-4" />
              </Button>
            </Link>
            <Link href="/experts">
              <Button variant="ghost" size="icon" title="专家咨询">
                <Users className="h-4 w-4" />
              </Button>
            </Link>
            <NotificationDropdown />
            <FeedbackDialog
              trigger={
                <Button variant="ghost" size="icon" title="反馈">
                  <MessageSquare className="h-4 w-4" />
                </Button>
              }
              page="/dashboard"
            />
            <Link href="/help">
              <Button variant="ghost" size="icon" title="帮助">
                <HelpCircle className="h-4 w-4" />
              </Button>
            </Link>
            <Link href="/settings">
              <Button variant="ghost" size="icon">
                <Settings className="h-4 w-4" />
              </Button>
            </Link>
            <div className="flex items-center gap-2">
              <Avatar className="h-8 w-8">
                <AvatarImage src={session?.user?.image || ''} />
                <AvatarFallback>{session?.user?.name?.[0] || 'U'}</AvatarFallback>
              </Avatar>
              <span className="text-sm font-medium hidden sm:inline">{session?.user?.name}</span>
            </div>
            <Button variant="ghost" size="icon" onClick={() => signOut({ callbackUrl: '/login' })}>
              <LogOut className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </header>

      <main id="main-content" className="container mx-auto px-4 py-8">
        {/* Welcome Section */}
        <section className="mb-8">
          <h1 className="text-3xl font-bold mb-2">
            你好，{session?.user?.name || '创业者'} 👋
          </h1>
          <p className="text-muted-foreground">
            准备好把你的想法变成现实了吗？
          </p>
        </section>

        {/* Quick Actions */}
        <section className="mb-8">
          <Card className="bg-gradient-to-r from-primary/10 to-primary/5 border-primary/20">
            <CardContent className="p-6">
              <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                <div>
                  <h2 className="text-xl font-semibold mb-1">开始新项目</h2>
                  <p className="text-muted-foreground">告诉小T你的想法，AI专家团队将为你规划方案</p>
                </div>
                <Button size="lg" onClick={() => router.push('/create')}>
                  <Plus className="mr-2 h-5 w-5" />
                  创建项目
                </Button>
              </div>
            </CardContent>
          </Card>
        </section>

        {/* Secondary Quick Actions */}
        <section className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
          <Link href="/ai-employees">
            <Card className="hover:shadow-md transition-shadow cursor-pointer border-cyan-200 dark:border-cyan-900 bg-cyan-50/50 dark:bg-cyan-950/20">
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="p-2 bg-cyan-100 dark:bg-cyan-900/30 rounded-lg">
                      <Cpu className="h-5 w-5 text-cyan-600" />
                    </div>
                    <div>
                      <h3 className="font-medium">AI 员工</h3>
                      <p className="text-sm text-muted-foreground">与 AI 团队成员对话</p>
                    </div>
                  </div>
                  <TrendingUp className="h-5 w-5 text-muted-foreground" />
                </div>
              </CardContent>
            </Card>
          </Link>
          <Link href="/ceo">
            <Card className="hover:shadow-md transition-shadow cursor-pointer border-indigo-200 dark:border-indigo-900 bg-indigo-50/50 dark:bg-indigo-950/20">
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="p-2 bg-indigo-100 dark:bg-indigo-900/30 rounded-lg">
                      <Target className="h-5 w-5 text-indigo-600" />
                    </div>
                    <div>
                      <h3 className="font-medium">CEO 工作台</h3>
                      <p className="text-sm text-muted-foreground">待确认决策和全局视图</p>
                    </div>
                  </div>
                  <TrendingUp className="h-5 w-5 text-muted-foreground" />
                </div>
              </CardContent>
            </Card>
          </Link>
          <Link href="/experts">
            <Card className="hover:shadow-md transition-shadow cursor-pointer border-purple-200 dark:border-purple-900 bg-purple-50/50 dark:bg-purple-950/20">
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="p-2 bg-purple-100 dark:bg-purple-900/30 rounded-lg">
                      <Users className="h-5 w-5 text-purple-600" />
                    </div>
                    <div>
                      <h3 className="font-medium">专家咨询</h3>
                      <p className="text-sm text-muted-foreground">咨询行业顶尖专家获取专业建议</p>
                    </div>
                  </div>
                  <TrendingUp className="h-5 w-5 text-muted-foreground" />
                </div>
              </CardContent>
            </Card>
          </Link>
          <Link href="/pricing">
            <Card className="hover:shadow-md transition-shadow cursor-pointer border-amber-200 dark:border-amber-900 bg-amber-50/50 dark:bg-amber-950/20">
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="p-2 bg-amber-100 dark:bg-amber-900/30 rounded-lg">
                      <Sparkles className="h-5 w-5 text-amber-600" />
                    </div>
                    <div>
                      <h3 className="font-medium">升级订阅</h3>
                      <p className="text-sm text-muted-foreground">
                        {dashboardData?.subscription?.plan === 'free' ? '解锁更多高级功能' : `当前: ${dashboardData?.subscription?.plan || 'Free'}`}
                      </p>
                    </div>
                  </div>
                  <TrendingUp className="h-5 w-5 text-muted-foreground" />
                </div>
              </CardContent>
            </Card>
          </Link>
        </section>

        {/* Onboarding Checklist */}
        <section className="mb-8">
          <OnboardingChecklist />
        </section>

        {/* Stats Grid */}
        <section className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-4 mb-8">
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-primary/10 rounded-lg">
                  <Rocket className="h-5 w-5 text-primary" />
                </div>
                <div>
                  <p className="text-xl font-bold">{dashboardData?.stats.projects.total || projects.length}</p>
                  <p className="text-xs text-muted-foreground">项目</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-blue-100 dark:bg-blue-900/20 rounded-lg">
                  <MessageSquare className="h-5 w-5 text-blue-600" />
                </div>
                <div>
                  <p className="text-xl font-bold">{dashboardData?.stats.discussions.total || 0}</p>
                  <p className="text-xs text-muted-foreground">讨论</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-purple-100 dark:bg-purple-900/20 rounded-lg">
                  <Target className="h-5 w-5 text-purple-600" />
                </div>
                <div>
                  <p className="text-xl font-bold">{dashboardData?.stats.decisions.total || 0}</p>
                  <p className="text-xs text-muted-foreground">决策</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-orange-100 dark:bg-orange-900/20 rounded-lg">
                  <Clock className="h-5 w-5 text-orange-600" />
                </div>
                <div>
                  <p className="text-xl font-bold">{dashboardData?.stats.actionItems.pending || 0}</p>
                  <p className="text-xs text-muted-foreground">待办</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-green-100 dark:bg-green-900/20 rounded-lg">
                  <CheckCircle className="h-5 w-5 text-green-600" />
                </div>
                <div>
                  <p className="text-xl font-bold">{dashboardData?.stats.actionItems.completionRate || 0}%</p>
                  <p className="text-xs text-muted-foreground">完成率</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-indigo-100 dark:bg-indigo-900/20 rounded-lg">
                  <Users className="h-5 w-5 text-indigo-600" />
                </div>
                <div>
                  <p className="text-xl font-bold">{dashboardData?.stats.executives.activeCount || 0}</p>
                  <p className="text-xs text-muted-foreground">活跃高管</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </section>

        {/* Action Items Alert */}
        {dashboardData?.actionItems.overdue && dashboardData.actionItems.overdue.length > 0 && (
          <section className="mb-8">
            <Card className="border-red-200 dark:border-red-900 bg-red-50 dark:bg-red-950/20">
              <CardHeader className="pb-2">
                <CardTitle className="text-base flex items-center gap-2 text-red-700 dark:text-red-400">
                  <AlertTriangle className="h-4 w-4" />
                  逾期行动项 ({dashboardData.actionItems.overdue.length})
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  {dashboardData.actionItems.overdue.slice(0, 3).map((item) => (
                    <div key={item.id} className="flex items-center justify-between text-sm">
                      <span className="truncate">{item.title}</span>
                      <Badge variant="destructive" className="text-xs">
                        {new Date(item.dueDate).toLocaleDateString('zh-CN')}
                      </Badge>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </section>
        )}

        {/* Upcoming Action Items */}
        {dashboardData?.actionItems.upcoming && dashboardData.actionItems.upcoming.length > 0 && (
          <section className="mb-8">
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-base flex items-center gap-2">
                  <Calendar className="h-4 w-4" />
                  即将到期
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  {dashboardData.actionItems.upcoming.slice(0, 3).map((item) => (
                    <div key={item.id} className="flex items-center justify-between text-sm">
                      <span className="truncate">{item.title}</span>
                      <Badge variant="outline" className="text-xs">
                        {new Date(item.dueDate).toLocaleDateString('zh-CN')}
                      </Badge>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </section>
        )}

        {/* Projects List */}
        <section>
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-semibold">我的项目</h2>
            <Link href="/projects">
              <Button variant="ghost" size="sm">查看全部</Button>
            </Link>
          </div>

          {isLoading ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {[1, 2, 3].map((i) => (
                <Card key={i} className="animate-pulse">
                  <CardHeader>
                    <div className="h-5 bg-muted rounded w-3/4" />
                    <div className="h-4 bg-muted rounded w-1/2 mt-2" />
                  </CardHeader>
                  <CardContent>
                    <div className="h-4 bg-muted rounded w-full" />
                  </CardContent>
                </Card>
              ))}
            </div>
          ) : projects.length === 0 ? (
            <Card className="border-dashed">
              <CardContent className="p-0">
                <EmptyState
                  {...emptyStatePresets.projects}
                  variant="card"
                  action={{
                    label: '创建项目',
                    onClick: () => router.push('/create'),
                  }}
                  secondaryAction={{
                    label: '浏览模板',
                    href: '/templates',
                  }}
                />
              </CardContent>
            </Card>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {projects.slice(0, 6).map((project) => (
                <Link key={project._id?.toString()} href={`/projects/${project._id}`}>
                  <Card className="hover:shadow-md transition-shadow cursor-pointer h-full">
                    <CardHeader>
                      <div className="flex items-start justify-between">
                        <CardTitle className="text-lg line-clamp-1">{project.name}</CardTitle>
                        {getStatusBadge(project.status)}
                      </div>
                      <CardDescription className="line-clamp-2">
                        {project.requirement?.original || '暂无描述'}
                      </CardDescription>
                    </CardHeader>
                    <CardContent>
                      <div className="flex items-center justify-between text-sm text-muted-foreground">
                        <span>类型: {project.type}</span>
                        <span>复杂度: {project.complexity}</span>
                      </div>
                    </CardContent>
                  </Card>
                </Link>
              ))}
            </div>
          )}
        </section>
      </main>
    </div>
  )
}
