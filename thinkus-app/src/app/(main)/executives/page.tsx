'use client'

import { useState, useEffect } from 'react'
import { useSession } from 'next-auth/react'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { Progress } from '@/components/ui/progress'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { ScrollArea } from '@/components/ui/scroll-area'
import {
  Users,
  MessageSquare,
  Target,
  AlertTriangle,
  CheckCircle2,
  Clock,
  Zap,
  Brain,
  TrendingUp,
  Calendar,
  Bell,
  ChevronRight,
  Sparkles,
  Shield,
  ArrowRight,
  Play,
  Pause,
  Settings,
  RefreshCw,
} from 'lucide-react'
import {
  EXECUTIVES,
  EXECUTIVES_BY_GROUP,
  GROUP_NAMES,
  type AgentId,
  type AgentGroup,
} from '@/lib/config/executives'
import {
  DECISION_LEVEL_DESCRIPTIONS,
  type DecisionLevel,
} from '@/lib/config/ai-executives'

// Types
interface PendingDecision {
  id: string
  title: string
  description: string
  level: DecisionLevel
  proposedBy: AgentId
  projectId?: string
  projectName?: string
  createdAt: Date
  expiresAt?: Date
}

interface ActiveDiscussion {
  id: string
  topic: string
  projectId: string
  projectName: string
  participants: AgentId[]
  currentRound: number
  status: 'active' | 'paused' | 'completed'
  startedAt: Date
}

interface ScheduledTask {
  id: string
  type: 'daily_standup' | 'weekly_review'
  projectId: string
  projectName: string
  nextRunAt: Date
  lastRunAt?: Date
  enabled: boolean
}

interface DataAlert {
  id: string
  title: string
  description: string
  severity: 'low' | 'medium' | 'high' | 'critical'
  type: 'anomaly' | 'trend' | 'opportunity' | 'risk'
  projectId?: string
  projectName?: string
  createdAt: Date
}

export default function ExecutivesDashboardPage() {
  const { data: session } = useSession()
  const [pendingDecisions, setPendingDecisions] = useState<PendingDecision[]>([])
  const [activeDiscussions, setActiveDiscussions] = useState<ActiveDiscussion[]>([])
  const [scheduledTasks, setScheduledTasks] = useState<ScheduledTask[]>([])
  const [dataAlerts, setDataAlerts] = useState<DataAlert[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedGroup, setSelectedGroup] = useState<AgentGroup | 'all'>('all')

  // Load data
  useEffect(() => {
    async function loadData() {
      try {
        // TODO: Replace with actual API calls
        // For now, using mock data
        setPendingDecisions([])
        setActiveDiscussions([])
        setScheduledTasks([])
        setDataAlerts([])
      } catch (error) {
        console.error('Failed to load executive data:', error)
      } finally {
        setLoading(false)
      }
    }
    loadData()
  }, [])

  const getGroupExecutives = (group: AgentGroup | 'all') => {
    if (group === 'all') {
      return Object.keys(EXECUTIVES) as AgentId[]
    }
    return EXECUTIVES_BY_GROUP[group]
  }

  const getLevelBadgeVariant = (level: DecisionLevel) => {
    switch (level) {
      case 'L0_AUTO': return 'secondary'
      case 'L1_NOTIFY': return 'outline'
      case 'L2_CONFIRM': return 'default'
      case 'L3_CRITICAL': return 'destructive'
      default: return 'secondary'
    }
  }

  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case 'critical': return 'text-red-500 bg-red-50 dark:bg-red-950'
      case 'high': return 'text-orange-500 bg-orange-50 dark:bg-orange-950'
      case 'medium': return 'text-yellow-500 bg-yellow-50 dark:bg-yellow-950'
      case 'low': return 'text-green-500 bg-green-50 dark:bg-green-950'
      default: return 'text-gray-500 bg-gray-50 dark:bg-gray-950'
    }
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b bg-background/80 backdrop-blur-sm sticky top-0 z-50">
        <div className="container mx-auto px-4 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-primary/10 rounded-lg">
              <Brain className="h-5 w-5 text-primary" />
            </div>
            <div>
              <h1 className="font-semibold">AI高管团队</h1>
              <p className="text-xs text-muted-foreground">18位专属高管为您服务</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm">
              <Bell className="h-4 w-4 mr-2" />
              通知设置
            </Button>
            <Button variant="outline" size="sm">
              <Settings className="h-4 w-4 mr-2" />
              偏好设置
            </Button>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 py-6">
        {/* Quick Stats */}
        <section className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-2xl font-bold">{pendingDecisions.length}</p>
                  <p className="text-sm text-muted-foreground">待确认决策</p>
                </div>
                <div className="p-2 bg-orange-100 dark:bg-orange-900/20 rounded-lg">
                  <Target className="h-5 w-5 text-orange-500" />
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-2xl font-bold">{activeDiscussions.length}</p>
                  <p className="text-sm text-muted-foreground">进行中讨论</p>
                </div>
                <div className="p-2 bg-blue-100 dark:bg-blue-900/20 rounded-lg">
                  <MessageSquare className="h-5 w-5 text-blue-500" />
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-2xl font-bold">{dataAlerts.filter(a => a.severity === 'high' || a.severity === 'critical').length}</p>
                  <p className="text-sm text-muted-foreground">重要告警</p>
                </div>
                <div className="p-2 bg-red-100 dark:bg-red-900/20 rounded-lg">
                  <AlertTriangle className="h-5 w-5 text-red-500" />
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-2xl font-bold">18</p>
                  <p className="text-sm text-muted-foreground">活跃高管</p>
                </div>
                <div className="p-2 bg-green-100 dark:bg-green-900/20 rounded-lg">
                  <Users className="h-5 w-5 text-green-500" />
                </div>
              </div>
            </CardContent>
          </Card>
        </section>

        {/* Main Content */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Left Column - Team & Decisions */}
          <div className="lg:col-span-2 space-y-6">
            {/* Pending Decisions */}
            <Card>
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle className="text-base flex items-center gap-2">
                      <Target className="h-4 w-4 text-primary" />
                      待确认决策
                    </CardTitle>
                    <CardDescription>需要您审核的重要决策</CardDescription>
                  </div>
                  <Link href="/executives/decisions">
                    <Button variant="ghost" size="sm">
                      查看全部 <ChevronRight className="h-4 w-4 ml-1" />
                    </Button>
                  </Link>
                </div>
              </CardHeader>
              <CardContent>
                {pendingDecisions.length === 0 ? (
                  <div className="text-center py-8">
                    <CheckCircle2 className="h-10 w-10 mx-auto mb-3 text-green-500" />
                    <p className="text-muted-foreground">暂无待确认决策</p>
                    <p className="text-sm text-muted-foreground mt-1">
                      高风险操作会在这里等待您的确认
                    </p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {pendingDecisions.slice(0, 3).map((decision) => {
                      const proposer = EXECUTIVES[decision.proposedBy]
                      const levelConfig = DECISION_LEVEL_DESCRIPTIONS[decision.level]
                      return (
                        <div
                          key={decision.id}
                          className="flex items-start gap-3 p-3 rounded-lg border hover:bg-muted/50 transition-colors"
                        >
                          <Avatar className="h-8 w-8">
                            <AvatarFallback
                              style={{ backgroundColor: proposer?.color }}
                              className="text-white text-xs"
                            >
                              {proposer?.nameCn?.charAt(0) || '?'}
                            </AvatarFallback>
                          </Avatar>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 mb-1">
                              <span className="font-medium truncate">{decision.title}</span>
                              <Badge variant={getLevelBadgeVariant(decision.level)}>
                                {levelConfig?.name || decision.level}
                              </Badge>
                            </div>
                            <p className="text-sm text-muted-foreground line-clamp-2">
                              {decision.description}
                            </p>
                            <div className="flex items-center gap-3 mt-2 text-xs text-muted-foreground">
                              <span>{proposer?.nameCn} 提议</span>
                              {decision.projectName && (
                                <span>项目: {decision.projectName}</span>
                              )}
                            </div>
                          </div>
                          <div className="flex gap-2">
                            <Button size="sm" variant="outline">拒绝</Button>
                            <Button size="sm">批准</Button>
                          </div>
                        </div>
                      )
                    })}
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Executive Team */}
            <Card>
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle className="text-base flex items-center gap-2">
                      <Users className="h-4 w-4 text-primary" />
                      高管团队
                    </CardTitle>
                    <CardDescription>您的专属AI高管团队</CardDescription>
                  </div>
                </div>
                {/* Group Filter */}
                <div className="flex flex-wrap gap-2 mt-3">
                  <Button
                    variant={selectedGroup === 'all' ? 'default' : 'outline'}
                    size="sm"
                    onClick={() => setSelectedGroup('all')}
                  >
                    全部 (18)
                  </Button>
                  {(Object.keys(GROUP_NAMES) as AgentGroup[]).map((group) => (
                    <Button
                      key={group}
                      variant={selectedGroup === group ? 'default' : 'outline'}
                      size="sm"
                      onClick={() => setSelectedGroup(group)}
                    >
                      {GROUP_NAMES[group].cn} ({EXECUTIVES_BY_GROUP[group].length})
                    </Button>
                  ))}
                </div>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                  {getGroupExecutives(selectedGroup).map((agentId) => {
                    const exec = EXECUTIVES[agentId]
                    if (!exec) return null
                    return (
                      <div
                        key={agentId}
                        className="flex items-center gap-3 p-3 rounded-lg border hover:border-primary/50 hover:bg-muted/50 transition-colors cursor-pointer"
                      >
                        <Avatar className="h-10 w-10">
                          <AvatarFallback
                            style={{ backgroundColor: exec.color }}
                            className="text-white"
                          >
                            {exec.avatar}
                          </AvatarFallback>
                        </Avatar>
                        <div className="min-w-0">
                          <p className="font-medium truncate">{exec.nameCn}</p>
                          <p className="text-xs text-muted-foreground truncate">{exec.titleCn}</p>
                        </div>
                      </div>
                    )
                  })}
                </div>
              </CardContent>
            </Card>

            {/* Active Discussions */}
            <Card>
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle className="text-base flex items-center gap-2">
                      <MessageSquare className="h-4 w-4 text-primary" />
                      进行中的讨论
                    </CardTitle>
                    <CardDescription>高管团队正在讨论的话题</CardDescription>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                {activeDiscussions.length === 0 ? (
                  <div className="text-center py-8">
                    <MessageSquare className="h-10 w-10 mx-auto mb-3 text-muted-foreground" />
                    <p className="text-muted-foreground">暂无进行中的讨论</p>
                    <p className="text-sm text-muted-foreground mt-1">
                      开始新项目或发起讨论来激活高管团队
                    </p>
                    <Link href="/create">
                      <Button className="mt-4" size="sm">
                        <Sparkles className="h-4 w-4 mr-2" />
                        创建新项目
                      </Button>
                    </Link>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {activeDiscussions.map((discussion) => (
                      <div
                        key={discussion.id}
                        className="flex items-center justify-between p-3 rounded-lg border"
                      >
                        <div className="flex items-center gap-3">
                          <div className="flex -space-x-2">
                            {discussion.participants.slice(0, 3).map((agentId) => {
                              const exec = EXECUTIVES[agentId]
                              return (
                                <Avatar key={agentId} className="h-8 w-8 border-2 border-background">
                                  <AvatarFallback
                                    style={{ backgroundColor: exec?.color }}
                                    className="text-white text-xs"
                                  >
                                    {exec?.avatar}
                                  </AvatarFallback>
                                </Avatar>
                              )
                            })}
                            {discussion.participants.length > 3 && (
                              <div className="h-8 w-8 rounded-full bg-muted flex items-center justify-center text-xs border-2 border-background">
                                +{discussion.participants.length - 3}
                              </div>
                            )}
                          </div>
                          <div>
                            <p className="font-medium">{discussion.topic}</p>
                            <p className="text-xs text-muted-foreground">
                              {discussion.projectName} · 第{discussion.currentRound}轮
                            </p>
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          <Badge variant={discussion.status === 'active' ? 'default' : 'secondary'}>
                            {discussion.status === 'active' ? '进行中' : '已暂停'}
                          </Badge>
                          <Button size="sm" variant="ghost">
                            <ChevronRight className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Right Column - Alerts & Tasks */}
          <div className="space-y-6">
            {/* Decision Levels Info */}
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-base flex items-center gap-2">
                  <Shield className="h-4 w-4 text-primary" />
                  决策分级说明
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                {(['L0_AUTO', 'L1_NOTIFY', 'L2_CONFIRM', 'L3_CRITICAL'] as DecisionLevel[]).map((level) => {
                  const config = DECISION_LEVEL_DESCRIPTIONS[level]
                  return (
                    <div key={level} className="flex items-start gap-3">
                      <Badge variant={getLevelBadgeVariant(level)} className="shrink-0">
                        {config.name}
                      </Badge>
                      <div className="text-sm">
                        <p className="text-muted-foreground">{config.description}</p>
                        <p className="text-xs text-muted-foreground mt-1">
                          例: {config.examples.join(', ')}
                        </p>
                      </div>
                    </div>
                  )
                })}
              </CardContent>
            </Card>

            {/* Data Alerts */}
            <Card>
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-base flex items-center gap-2">
                    <AlertTriangle className="h-4 w-4 text-primary" />
                    数据告警
                  </CardTitle>
                  <Button variant="ghost" size="sm">
                    <RefreshCw className="h-4 w-4" />
                  </Button>
                </div>
              </CardHeader>
              <CardContent>
                {dataAlerts.length === 0 ? (
                  <div className="text-center py-6">
                    <CheckCircle2 className="h-8 w-8 mx-auto mb-2 text-green-500" />
                    <p className="text-sm text-muted-foreground">一切正常</p>
                  </div>
                ) : (
                  <ScrollArea className="h-[200px]">
                    <div className="space-y-2">
                      {dataAlerts.map((alert) => (
                        <div
                          key={alert.id}
                          className={`p-2 rounded-lg text-sm ${getSeverityColor(alert.severity)}`}
                        >
                          <p className="font-medium">{alert.title}</p>
                          <p className="text-xs opacity-80">{alert.description}</p>
                        </div>
                      ))}
                    </div>
                  </ScrollArea>
                )}
              </CardContent>
            </Card>

            {/* Scheduled Tasks */}
            <Card>
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-base flex items-center gap-2">
                    <Calendar className="h-4 w-4 text-primary" />
                    定时任务
                  </CardTitle>
                </div>
              </CardHeader>
              <CardContent>
                {scheduledTasks.length === 0 ? (
                  <div className="text-center py-6">
                    <Calendar className="h-8 w-8 mx-auto mb-2 text-muted-foreground" />
                    <p className="text-sm text-muted-foreground">暂无定时任务</p>
                    <p className="text-xs text-muted-foreground mt-1">
                      创建项目后会自动配置每日站会和周复盘
                    </p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {scheduledTasks.map((task) => (
                      <div
                        key={task.id}
                        className="flex items-center justify-between p-2 rounded-lg border"
                      >
                        <div className="flex items-center gap-2">
                          {task.enabled ? (
                            <Play className="h-4 w-4 text-green-500" />
                          ) : (
                            <Pause className="h-4 w-4 text-muted-foreground" />
                          )}
                          <div>
                            <p className="text-sm font-medium">
                              {task.type === 'daily_standup' ? '每日站会' : '周复盘'}
                            </p>
                            <p className="text-xs text-muted-foreground">
                              {task.projectName}
                            </p>
                          </div>
                        </div>
                        <div className="text-xs text-muted-foreground">
                          {new Date(task.nextRunAt).toLocaleString('zh-CN', {
                            month: 'short',
                            day: 'numeric',
                            hour: '2-digit',
                            minute: '2-digit',
                          })}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Quick Actions */}
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-base flex items-center gap-2">
                  <Zap className="h-4 w-4 text-primary" />
                  快速操作
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                <Link href="/create" className="block">
                  <Button variant="outline" className="w-full justify-start">
                    <Sparkles className="h-4 w-4 mr-2" />
                    创建新项目
                  </Button>
                </Link>
                <Button variant="outline" className="w-full justify-start">
                  <MessageSquare className="h-4 w-4 mr-2" />
                  发起专题讨论
                </Button>
                <Button variant="outline" className="w-full justify-start">
                  <TrendingUp className="h-4 w-4 mr-2" />
                  查看运营报告
                </Button>
              </CardContent>
            </Card>
          </div>
        </div>
      </main>
    </div>
  )
}
