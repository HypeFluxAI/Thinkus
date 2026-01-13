'use client'

import { useState, useEffect, use } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Separator } from '@/components/ui/separator'
import { Progress } from '@/components/ui/progress'
import {
  ArrowLeft,
  Clock,
  CheckCircle2,
  Code,
  Database,
  Layout,
  Rocket,
  Globe,
  Github,
  Download,
  FileText,
  Zap,
  CreditCard,
  AlertTriangle,
  Lightbulb,
  BarChart3,
  Settings,
  FolderOpen,
  ChevronRight,
  Users,
  MessageSquare,
  Target,
  ListTodo,
  Loader2,
  Circle,
  PlayCircle,
  XCircle,
  PauseCircle,
  Calendar,
  Share2,
} from 'lucide-react'
import { PhaseBadge, PhaseTimeline, ShareDialog } from '@/components/project'
import { StandupPanel } from '@/components/standup'
import { EmptyState, emptyStatePresets } from '@/components/ui/empty-state'
import { type ProjectPhase, PROJECT_PHASES } from '@/lib/config/project-phases'
import { EXECUTIVES, type AgentId } from '@/lib/config/executives'
import { trpc } from '@/lib/trpc/client'
import type { IProject } from '@/lib/db/models/project'

// Decision and Action Item types
interface ProjectDecision {
  id: string
  title: string
  description: string
  type: string
  importance: string
  status: string
  proposedBy: string
  createdAt: string
}

interface ProjectActionItem {
  id: string
  title: string
  description?: string
  category: string
  status: string
  priority: string
  assignee: string
  dueDate?: string
  progress: number
}

const STATUS_CONFIG: Record<string, { label: string; color: string }> = {
  draft: { label: '草稿', color: 'bg-gray-500' },
  discussing: { label: '讨论中', color: 'bg-blue-500' },
  confirmed: { label: '已确认', color: 'bg-indigo-500' },
  pending_payment: { label: '待支付', color: 'bg-yellow-500' },
  paid: { label: '已支付', color: 'bg-green-500' },
  in_progress: { label: '开发中', color: 'bg-purple-500' },
  completed: { label: '已完成', color: 'bg-teal-500' },
  cancelled: { label: '已取消', color: 'bg-red-500' },
  active: { label: '进行中', color: 'bg-green-500' },
  paused: { label: '已暂停', color: 'bg-yellow-500' },
  archived: { label: '已归档', color: 'bg-gray-500' },
}

export default function ProjectDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id: projectId } = use(params)
  const router = useRouter()
  const [decisions, setDecisions] = useState<ProjectDecision[]>([])
  const [actionItems, setActionItems] = useState<ProjectActionItem[]>([])
  const [loading, setLoading] = useState({ decisions: true, actionItems: true })
  const [shareDialogOpen, setShareDialogOpen] = useState(false)

  // Fetch project data from tRPC
  const { data: projectData, isLoading: projectLoading, error: projectError } = trpc.project.getById.useQuery({ id: projectId })

  const project = projectData?.project as unknown as IProject | undefined

  // Fetch decisions and action items
  useEffect(() => {
    async function fetchData() {
      try {
        // Fetch decisions
        const decisionsRes = await fetch(`/api/decisions?projectId=${projectId}`)
        if (decisionsRes.ok) {
          const data = await decisionsRes.json()
          setDecisions(data.decisions || [])
        }
      } catch (error) {
        console.error('Failed to fetch decisions:', error)
      } finally {
        setLoading(prev => ({ ...prev, decisions: false }))
      }

      try {
        // Fetch action items
        const actionsRes = await fetch(`/api/action-items?projectId=${projectId}`)
        if (actionsRes.ok) {
          const data = await actionsRes.json()
          setActionItems(data.actionItems || [])
        }
      } catch (error) {
        console.error('Failed to fetch action items:', error)
      } finally {
        setLoading(prev => ({ ...prev, actionItems: false }))
      }
    }

    fetchData()
  }, [projectId])

  // Loading state
  if (projectLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    )
  }

  // Error or not found
  if (projectError || !project) {
    return (
      <div className="min-h-screen bg-background flex flex-col items-center justify-center">
        <FileText className="h-12 w-12 text-muted-foreground mb-4" />
        <h2 className="text-xl font-semibold mb-2">项目不存在</h2>
        <p className="text-muted-foreground mb-4">该项目可能已被删除或您没有访问权限</p>
        <Button onClick={() => router.push('/projects')}>
          <ArrowLeft className="h-4 w-4 mr-2" />
          返回项目列表
        </Button>
      </div>
    )
  }

  const statusConfig = STATUS_CONFIG[project.status] || { label: project.status, color: 'bg-gray-500' }

  const getActionButton = () => {
    switch (project.status) {
      case 'draft':
        return (
          <Button onClick={() => router.push('/create')}>
            <FileText className="h-4 w-4 mr-2" />
            继续编辑
          </Button>
        )
      case 'pending_payment':
      case 'confirmed':
        return (
          <Button>
            <CreditCard className="h-4 w-4 mr-2" />
            立即支付
          </Button>
        )
      case 'paid':
      case 'in_progress':
        return (
          <Button onClick={() => router.push(`/projects/${projectId}/progress`)}>
            <Rocket className="h-4 w-4 mr-2" />
            查看进度
          </Button>
        )
      case 'completed':
        return (
          <Button onClick={() => router.push(`/projects/${projectId}/complete`)}>
            <CheckCircle2 className="h-4 w-4 mr-2" />
            查看交付
          </Button>
        )
      default:
        return null
    }
  }

  return (
    <div className="bg-background">
      {/* Page Header */}
      <div className="border-b bg-muted/30">
        <div className="container mx-auto px-4 py-4 max-w-5xl">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <Link href="/projects" className="text-sm text-muted-foreground hover:text-foreground">
                项目列表
              </Link>
              <span className="text-muted-foreground">/</span>
              <div className="flex items-center gap-2">
                <span className="font-semibold">{project.name}</span>
                <PhaseBadge phase={project.phase} size="sm" />
                <Badge className={`${statusConfig.color} text-white`}>{statusConfig.label}</Badge>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setShareDialogOpen(true)}
              >
                <Share2 className="h-4 w-4 mr-1" />
                分享
              </Button>
              {getActionButton()}
            </div>
          </div>
        </div>
      </div>

      {/* Share Dialog */}
      <ShareDialog
        projectId={projectId}
        projectName={project.name}
        open={shareDialogOpen}
        onOpenChange={setShareDialogOpen}
      />

      <main id="main-content" className="container mx-auto px-4 py-6 max-w-5xl">
        {/* Overview */}
        <Card className="mb-6">
          <CardContent className="p-6">
            <div className="flex flex-col md:flex-row justify-between gap-4">
              <div>
                <h1 className="text-2xl font-bold mb-2">{project.name}</h1>
                <p className="text-muted-foreground mb-4">
                  {project.description || project.requirement?.original || '暂无描述'}
                </p>
                <div className="flex flex-wrap gap-2">
                  <Badge variant="outline">{project.complexity}</Badge>
                  {project.proposal?.pricing?.total && (
                    <Badge variant="secondary">${project.proposal.pricing.total}</Badge>
                  )}
                  <Badge variant="outline" className="capitalize">{project.type}</Badge>
                </div>
              </div>
              <div className="flex flex-col gap-2 text-sm text-muted-foreground">
                <div className="flex items-center gap-2">
                  <Clock className="h-4 w-4" />
                  <span>创建于 {new Date(project.createdAt).toLocaleDateString('zh-CN')}</span>
                </div>
                <div className="flex items-center gap-2">
                  <Clock className="h-4 w-4" />
                  <span>更新于 {new Date(project.updatedAt).toLocaleDateString('zh-CN')}</span>
                </div>
              </div>
            </div>

            {/* Progress bar for in_progress status */}
            {project.status === 'in_progress' && project.progress?.percentage !== undefined && (
              <div className="mt-6">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm font-medium">开发进度</span>
                  <span className="text-sm text-muted-foreground">{project.progress.percentage}%</span>
                </div>
                <div className="w-full h-2 bg-muted rounded-full overflow-hidden">
                  <div
                    className="h-full bg-primary rounded-full transition-all"
                    style={{ width: `${project.progress.percentage}%` }}
                  />
                </div>
              </div>
            )}

            {/* Quick links for completed projects */}
            {project.status === 'completed' && (project.deployment?.url || project.deployment?.githubRepo) && (
              <div className="mt-6 flex gap-2">
                {project.deployment?.url && (
                  <a href={project.deployment.url} target="_blank" rel="noopener noreferrer">
                    <Button variant="outline" size="sm">
                      <Globe className="h-4 w-4 mr-2" />
                      演示站点
                    </Button>
                  </a>
                )}
                {project.deployment?.githubRepo && (
                  <a href={project.deployment.githubRepo} target="_blank" rel="noopener noreferrer">
                    <Button variant="outline" size="sm">
                      <Github className="h-4 w-4 mr-2" />
                      代码仓库
                    </Button>
                  </a>
                )}
                <Button variant="outline" size="sm">
                  <Download className="h-4 w-4 mr-2" />
                  下载代码
                </Button>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Phase Timeline */}
        <Card className="mb-6">
          <CardHeader className="pb-2">
            <CardTitle className="text-base flex items-center gap-2">
              <Clock className="h-4 w-4" />
              项目阶段
            </CardTitle>
            <CardDescription>
              当前阶段: {PROJECT_PHASES[project.phase]?.nameCn || project.phase}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <PhaseTimeline
              currentPhase={project.phase}
              phaseHistory={project.phaseHistory}
              orientation="horizontal"
            />

            {/* Current Phase Team */}
            {PROJECT_PHASES[project.phase] && (
              <div className="mt-6 pt-4 border-t">
                <div className="flex items-center justify-between">
                  <div>
                    <h4 className="text-sm font-medium flex items-center gap-2">
                      <Users className="h-4 w-4" />
                      当前阶段核心团队
                    </h4>
                    <p className="text-xs text-muted-foreground mt-1">
                      {PROJECT_PHASES[project.phase].description}
                    </p>
                  </div>
                  <Link href={`/projects/${projectId}/discuss`}>
                    <Button variant="outline" size="sm">
                      <MessageSquare className="h-4 w-4 mr-2" />
                      发起讨论
                    </Button>
                  </Link>
                </div>
                <div className="flex gap-3 mt-3">
                  {PROJECT_PHASES[project.phase].coreAgents.map((agentId: AgentId) => {
                    const agent = EXECUTIVES[agentId]
                    if (!agent) return null
                    return (
                      <div
                        key={agentId}
                        className="flex items-center gap-2 px-3 py-2 rounded-lg bg-muted/50"
                      >
                        <div
                          className="w-8 h-8 rounded-full flex items-center justify-center text-white text-sm font-medium"
                          style={{ backgroundColor: agent.color }}
                        >
                          {agent.nameCn.charAt(0)}
                        </div>
                        <div>
                          <div className="text-sm font-medium">{agent.nameCn}</div>
                          <div className="text-xs text-muted-foreground">{agent.titleCn}</div>
                        </div>
                      </div>
                    )
                  })}
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Quick Actions */}
        <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mb-6">
          <Link href={`/projects/${projectId}/analytics`}>
            <Card className="hover:border-primary/50 transition-colors cursor-pointer">
              <CardContent className="p-4 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-lg bg-blue-500/10">
                    <BarChart3 className="h-5 w-5 text-blue-500" />
                  </div>
                  <span className="font-medium">数据分析</span>
                </div>
                <ChevronRight className="h-4 w-4 text-muted-foreground" />
              </CardContent>
            </Card>
          </Link>
          <Link href={`/projects/${projectId}/standups`}>
            <Card className="hover:border-primary/50 transition-colors cursor-pointer">
              <CardContent className="p-4 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-lg bg-orange-500/10">
                    <Calendar className="h-5 w-5 text-orange-500" />
                  </div>
                  <span className="font-medium">团队例会</span>
                </div>
                <ChevronRight className="h-4 w-4 text-muted-foreground" />
              </CardContent>
            </Card>
          </Link>
          <Link href={`/projects/${projectId}/assets`}>
            <Card className="hover:border-primary/50 transition-colors cursor-pointer">
              <CardContent className="p-4 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-lg bg-purple-500/10">
                    <FolderOpen className="h-5 w-5 text-purple-500" />
                  </div>
                  <span className="font-medium">资产管理</span>
                </div>
                <ChevronRight className="h-4 w-4 text-muted-foreground" />
              </CardContent>
            </Card>
          </Link>
          <Link href={`/projects/${projectId}/progress`}>
            <Card className="hover:border-primary/50 transition-colors cursor-pointer">
              <CardContent className="p-4 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-lg bg-green-500/10">
                    <Rocket className="h-5 w-5 text-green-500" />
                  </div>
                  <span className="font-medium">开发进度</span>
                </div>
                <ChevronRight className="h-4 w-4 text-muted-foreground" />
              </CardContent>
            </Card>
          </Link>
          <Link href={`/projects/${projectId}/settings`}>
            <Card className="hover:border-primary/50 transition-colors cursor-pointer">
              <CardContent className="p-4 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-lg bg-gray-500/10">
                    <Settings className="h-5 w-5 text-gray-500" />
                  </div>
                  <span className="font-medium">项目设置</span>
                </div>
                <ChevronRight className="h-4 w-4 text-muted-foreground" />
              </CardContent>
            </Card>
          </Link>
        </div>

        {/* Tabs */}
        <Tabs defaultValue="proposal" className="space-y-4">
          <TabsList className="flex-wrap h-auto gap-1">
            <TabsTrigger value="proposal">方案详情</TabsTrigger>
            <TabsTrigger value="features">功能清单</TabsTrigger>
            <TabsTrigger value="tech">技术栈</TabsTrigger>
            <TabsTrigger value="decisions" className="flex items-center gap-1">
              <Target className="h-3 w-3" />
              决策 {decisions.length > 0 && <Badge variant="secondary" className="ml-1 text-xs">{decisions.length}</Badge>}
            </TabsTrigger>
            <TabsTrigger value="actions" className="flex items-center gap-1">
              <ListTodo className="h-3 w-3" />
              行动项 {actionItems.length > 0 && <Badge variant="secondary" className="ml-1 text-xs">{actionItems.length}</Badge>}
            </TabsTrigger>
            <TabsTrigger value="standups" className="flex items-center gap-1">
              <Calendar className="h-3 w-3" />
              团队例会
            </TabsTrigger>
            {project.status === 'completed' && (
              <TabsTrigger value="analytics">数据分析</TabsTrigger>
            )}
          </TabsList>

          {/* Proposal Tab */}
          <TabsContent value="proposal" className="space-y-4">
            {project.proposal ? (
              <>
                <Card>
                  <CardHeader>
                    <CardTitle className="text-base">产品定位</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="text-muted-foreground">{project.proposal.positioning || project.requirement?.clarified || project.requirement?.original}</p>
                  </CardContent>
                </Card>

                <div className="grid md:grid-cols-2 gap-4">
                  {project.proposal.risks && project.proposal.risks.length > 0 && (
                    <Card>
                      <CardHeader className="pb-3">
                        <CardTitle className="text-base flex items-center gap-2">
                          <AlertTriangle className="h-4 w-4 text-yellow-500" />
                          风险提示
                        </CardTitle>
                      </CardHeader>
                      <CardContent>
                        <ul className="space-y-2 text-sm">
                          {project.proposal.risks.map((risk, index) => (
                            <li key={index} className="flex items-start gap-2">
                              <span className="text-yellow-500">•</span>
                              <span className="text-muted-foreground">{risk}</span>
                            </li>
                          ))}
                        </ul>
                      </CardContent>
                    </Card>
                  )}

                  {project.proposal.recommendations && project.proposal.recommendations.length > 0 && (
                    <Card>
                      <CardHeader className="pb-3">
                        <CardTitle className="text-base flex items-center gap-2">
                          <Lightbulb className="h-4 w-4 text-primary" />
                          建议
                        </CardTitle>
                      </CardHeader>
                      <CardContent>
                        <ul className="space-y-2 text-sm">
                          {project.proposal.recommendations.map((rec, index) => (
                            <li key={index} className="flex items-start gap-2">
                              <span className="text-primary">•</span>
                              <span className="text-muted-foreground">{rec}</span>
                            </li>
                          ))}
                        </ul>
                      </CardContent>
                    </Card>
                  )}
                </div>
              </>
            ) : (
              <Card>
                <CardContent className="p-8 text-center">
                  <FileText className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
                  <h3 className="font-medium mb-2">暂无方案详情</h3>
                  <p className="text-sm text-muted-foreground">完成需求讨论后会生成项目方案</p>
                </CardContent>
              </Card>
            )}
          </TabsContent>

          {/* Features Tab */}
          <TabsContent value="features">
            <Card>
              <CardHeader>
                <CardTitle className="text-base flex items-center gap-2">
                  <Rocket className="h-5 w-5 text-primary" />
                  功能清单
                </CardTitle>
                <CardDescription>
                  共 {project.proposal?.features?.length || 0} 个功能
                </CardDescription>
              </CardHeader>
              <CardContent>
                {project.proposal?.features && project.proposal.features.length > 0 ? (
                  <div className="space-y-4">
                    {['P0', 'P1', 'P2'].map(priority => {
                      const features = project.proposal?.features?.filter(f => f.priority === priority) || []
                      if (features.length === 0) return null

                      const priorityConfig = {
                        P0: { label: 'P0 核心必备', color: 'bg-red-500' },
                        P1: { label: 'P1 重要功能', color: 'bg-yellow-500' },
                        P2: { label: 'P2 锦上添花', color: 'bg-green-500' },
                      }[priority]

                      return (
                        <div key={priority}>
                          <Badge className={`${priorityConfig?.color} text-white mb-2`}>
                            {priorityConfig?.label}
                          </Badge>
                          <ul className="space-y-2">
                            {features.map(feature => (
                              <li key={feature.id} className="flex items-start gap-2 py-2">
                                <CheckCircle2 className="h-4 w-4 text-green-500 mt-0.5 shrink-0" />
                                <div>
                                  <span className="font-medium">{feature.name}</span>
                                  <p className="text-sm text-muted-foreground">{feature.description}</p>
                                </div>
                              </li>
                            ))}
                          </ul>
                          <Separator className="my-4" />
                        </div>
                      )
                    })}
                  </div>
                ) : (
                  <EmptyState
                    {...emptyStatePresets.features}
                    variant="minimal"
                    action={{
                      label: '发起讨论',
                      href: `/projects/${projectId}/discuss`,
                    }}
                  />
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Tech Tab */}
          <TabsContent value="tech">
            <Card>
              <CardHeader>
                <CardTitle className="text-base flex items-center gap-2">
                  <Code className="h-5 w-5 text-primary" />
                  技术方案
                </CardTitle>
              </CardHeader>
              <CardContent>
                {project.proposal?.techStack ? (
                  <div className="grid md:grid-cols-3 gap-6">
                    <div className="space-y-3">
                      <div className="flex items-center gap-2 font-medium">
                        <Layout className="h-4 w-4" />
                        前端
                      </div>
                      <div className="flex flex-wrap gap-2">
                        {project.proposal.techStack.frontend?.map(tech => (
                          <Badge key={tech} variant="secondary">
                            {tech}
                          </Badge>
                        )) || <span className="text-sm text-muted-foreground">待定</span>}
                      </div>
                    </div>
                    <div className="space-y-3">
                      <div className="flex items-center gap-2 font-medium">
                        <Zap className="h-4 w-4" />
                        后端
                      </div>
                      <div className="flex flex-wrap gap-2">
                        {project.proposal.techStack.backend?.map(tech => (
                          <Badge key={tech} variant="secondary">
                            {tech}
                          </Badge>
                        )) || <span className="text-sm text-muted-foreground">待定</span>}
                      </div>
                    </div>
                    <div className="space-y-3">
                      <div className="flex items-center gap-2 font-medium">
                        <Database className="h-4 w-4" />
                        数据库
                      </div>
                      <div className="flex flex-wrap gap-2">
                        {project.proposal.techStack.database?.map(tech => (
                          <Badge key={tech} variant="secondary">
                            {tech}
                          </Badge>
                        )) || <span className="text-sm text-muted-foreground">待定</span>}
                      </div>
                    </div>
                  </div>
                ) : (
                  <EmptyState
                    icon={Code}
                    title="暂无技术方案"
                    description="完成需求讨论后会生成技术方案"
                    variant="minimal"
                    action={{
                      label: '发起讨论',
                      href: `/projects/${projectId}/discuss`,
                    }}
                  />
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Decisions Tab */}
          <TabsContent value="decisions">
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle className="text-base flex items-center gap-2">
                      <Target className="h-5 w-5 text-primary" />
                      项目决策
                    </CardTitle>
                    <CardDescription>
                      共 {decisions.length} 个决策记录
                    </CardDescription>
                  </div>
                  <Link href={`/projects/${projectId}/decisions`}>
                    <Button variant="outline" size="sm">
                      查看全部
                      <ChevronRight className="h-4 w-4 ml-1" />
                    </Button>
                  </Link>
                </div>
              </CardHeader>
              <CardContent>
                {loading.decisions ? (
                  <div className="flex items-center justify-center py-8">
                    <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                  </div>
                ) : decisions.length === 0 ? (
                  <EmptyState
                    {...emptyStatePresets.decisions}
                    variant="minimal"
                    action={{
                      label: '发起讨论',
                      href: `/projects/${projectId}/discuss`,
                    }}
                  />
                ) : (
                  <div className="space-y-3">
                    {decisions.slice(0, 5).map((decision) => {
                      const typeConfig: Record<string, { label: string; color: string }> = {
                        feature: { label: '功能', color: 'bg-blue-500' },
                        technical: { label: '技术', color: 'bg-purple-500' },
                        design: { label: '设计', color: 'bg-pink-500' },
                        business: { label: '商业', color: 'bg-green-500' },
                        priority: { label: '优先级', color: 'bg-orange-500' },
                        resource: { label: '资源', color: 'bg-yellow-500' },
                        other: { label: '其他', color: 'bg-gray-500' },
                      }
                      const importanceConfig: Record<string, { label: string; variant: 'default' | 'secondary' | 'destructive' | 'outline' }> = {
                        critical: { label: '关键', variant: 'destructive' },
                        high: { label: '高', variant: 'default' },
                        medium: { label: '中', variant: 'secondary' },
                        low: { label: '低', variant: 'outline' },
                      }
                      const decisionStatusConfig: Record<string, { icon: React.ReactNode; color: string }> = {
                        proposed: { icon: <Circle className="h-3 w-3" />, color: 'text-gray-500' },
                        approved: { icon: <CheckCircle2 className="h-3 w-3" />, color: 'text-green-500' },
                        rejected: { icon: <XCircle className="h-3 w-3" />, color: 'text-red-500' },
                        implemented: { icon: <Rocket className="h-3 w-3" />, color: 'text-blue-500' },
                        superseded: { icon: <AlertTriangle className="h-3 w-3" />, color: 'text-yellow-500' },
                      }
                      const type = typeConfig[decision.type] || typeConfig.other
                      const importance = importanceConfig[decision.importance] || importanceConfig.medium
                      const status = decisionStatusConfig[decision.status] || decisionStatusConfig.proposed

                      return (
                        <div key={decision.id} className="flex items-start gap-3 p-3 rounded-lg border hover:bg-muted/50 transition-colors">
                          <div className={`w-2 h-2 rounded-full mt-2 ${type.color}`} />
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 mb-1">
                              <span className="font-medium truncate">{decision.title}</span>
                              <Badge variant={importance.variant} className="text-xs shrink-0">
                                {importance.label}
                              </Badge>
                            </div>
                            {decision.description && (
                              <p className="text-sm text-muted-foreground line-clamp-2 mb-2">
                                {decision.description}
                              </p>
                            )}
                            <div className="flex items-center gap-3 text-xs text-muted-foreground">
                              <span className={`flex items-center gap-1 ${status.color}`}>
                                {status.icon}
                                {decision.status === 'proposed' ? '待审批' :
                                 decision.status === 'approved' ? '已批准' :
                                 decision.status === 'rejected' ? '已拒绝' :
                                 decision.status === 'implemented' ? '已实施' : '已替代'}
                              </span>
                              <span>类型: {type.label}</span>
                              <span>
                                {new Date(decision.createdAt).toLocaleDateString('zh-CN')}
                              </span>
                            </div>
                          </div>
                        </div>
                      )
                    })}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Actions Tab */}
          <TabsContent value="actions">
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle className="text-base flex items-center gap-2">
                      <ListTodo className="h-5 w-5 text-primary" />
                      行动项
                    </CardTitle>
                    <CardDescription>
                      共 {actionItems.length} 个待办事项
                    </CardDescription>
                  </div>
                  <Link href={`/projects/${projectId}/actions`}>
                    <Button variant="outline" size="sm">
                      查看全部
                      <ChevronRight className="h-4 w-4 ml-1" />
                    </Button>
                  </Link>
                </div>
              </CardHeader>
              <CardContent>
                {loading.actionItems ? (
                  <div className="flex items-center justify-center py-8">
                    <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                  </div>
                ) : actionItems.length === 0 ? (
                  <EmptyState
                    {...emptyStatePresets.actionItems}
                    variant="minimal"
                    action={{
                      label: '发起讨论',
                      href: `/projects/${projectId}/discuss`,
                    }}
                  />
                ) : (
                  <div className="space-y-3">
                    {actionItems.slice(0, 5).map((item) => {
                      const priorityConfig: Record<string, { label: string; color: string }> = {
                        urgent: { label: '紧急', color: 'text-red-500 bg-red-50 dark:bg-red-950' },
                        high: { label: '高', color: 'text-orange-500 bg-orange-50 dark:bg-orange-950' },
                        medium: { label: '中', color: 'text-yellow-500 bg-yellow-50 dark:bg-yellow-950' },
                        low: { label: '低', color: 'text-green-500 bg-green-50 dark:bg-green-950' },
                      }
                      const actionStatusConfig: Record<string, { icon: React.ReactNode; label: string; color: string }> = {
                        pending: { icon: <Circle className="h-4 w-4" />, label: '待处理', color: 'text-gray-500' },
                        in_progress: { icon: <PlayCircle className="h-4 w-4" />, label: '进行中', color: 'text-blue-500' },
                        completed: { icon: <CheckCircle2 className="h-4 w-4" />, label: '已完成', color: 'text-green-500' },
                        blocked: { icon: <PauseCircle className="h-4 w-4" />, label: '已阻塞', color: 'text-red-500' },
                        canceled: { icon: <XCircle className="h-4 w-4" />, label: '已取消', color: 'text-gray-400' },
                      }
                      const priority = priorityConfig[item.priority] || priorityConfig.medium
                      const status = actionStatusConfig[item.status] || actionStatusConfig.pending
                      const isOverdue = item.dueDate && new Date(item.dueDate) < new Date() && item.status !== 'completed'

                      return (
                        <div key={item.id} className={`flex items-start gap-3 p-3 rounded-lg border transition-colors ${isOverdue ? 'border-red-200 dark:border-red-900 bg-red-50/50 dark:bg-red-950/20' : 'hover:bg-muted/50'}`}>
                          <div className={`shrink-0 ${status.color}`}>
                            {status.icon}
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 mb-1">
                              <span className={`font-medium truncate ${item.status === 'completed' ? 'line-through text-muted-foreground' : ''}`}>
                                {item.title}
                              </span>
                              <Badge className={`text-xs shrink-0 ${priority.color}`}>
                                {priority.label}
                              </Badge>
                            </div>
                            {item.description && (
                              <p className="text-sm text-muted-foreground line-clamp-1 mb-2">
                                {item.description}
                              </p>
                            )}
                            <div className="flex items-center justify-between">
                              <div className="flex items-center gap-3 text-xs text-muted-foreground">
                                <span className={status.color}>{status.label}</span>
                                {item.assignee && (
                                  <span>负责: {item.assignee === 'user' ? '用户' : item.assignee}</span>
                                )}
                                {item.dueDate && (
                                  <span className={isOverdue ? 'text-red-500 font-medium' : ''}>
                                    截止: {new Date(item.dueDate).toLocaleDateString('zh-CN')}
                                  </span>
                                )}
                              </div>
                              {item.progress > 0 && item.status !== 'completed' && (
                                <div className="flex items-center gap-2">
                                  <Progress value={item.progress} className="w-16 h-1.5" />
                                  <span className="text-xs text-muted-foreground">{item.progress}%</span>
                                </div>
                              )}
                            </div>
                          </div>
                        </div>
                      )
                    })}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Standups Tab */}
          <TabsContent value="standups">
            <StandupPanel projectId={projectId} />
          </TabsContent>

          {/* Analytics Tab (for completed projects) */}
          {project.status === 'completed' && (
            <TabsContent value="analytics">
              <Card>
                <CardHeader>
                  <CardTitle className="text-base flex items-center gap-2">
                    <BarChart3 className="h-5 w-5 text-primary" />
                    数据分析
                  </CardTitle>
                  <CardDescription>项目上线后的运行数据</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    <div className="text-center p-4 bg-muted/50 rounded-lg">
                      <div className="text-2xl font-bold">--</div>
                      <div className="text-sm text-muted-foreground">总访问量</div>
                    </div>
                    <div className="text-center p-4 bg-muted/50 rounded-lg">
                      <div className="text-2xl font-bold">--</div>
                      <div className="text-sm text-muted-foreground">独立用户</div>
                    </div>
                    <div className="text-center p-4 bg-muted/50 rounded-lg">
                      <div className="text-2xl font-bold">--</div>
                      <div className="text-sm text-muted-foreground">平均停留</div>
                    </div>
                    <div className="text-center p-4 bg-muted/50 rounded-lg">
                      <div className="text-2xl font-bold">--</div>
                      <div className="text-sm text-muted-foreground">转化率</div>
                    </div>
                  </div>
                  <p className="text-sm text-muted-foreground text-center mt-4">
                    详细分析数据将在集成 Google Analytics 后显示
                  </p>
                </CardContent>
              </Card>
            </TabsContent>
          )}
        </Tabs>
      </main>
    </div>
  )
}
