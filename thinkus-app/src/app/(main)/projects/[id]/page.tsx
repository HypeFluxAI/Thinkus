'use client'

import { useState, use } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Separator } from '@/components/ui/separator'
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
  ExternalLink,
  FileText,
  Zap,
  CreditCard,
  AlertTriangle,
  Lightbulb,
  BarChart3,
} from 'lucide-react'

interface ProjectDetail {
  id: string
  name: string
  description: string
  status: 'draft' | 'pending_payment' | 'paid' | 'in_progress' | 'completed'
  complexity: string
  price: number
  createdAt: Date
  updatedAt: Date
  progress?: number
  proposal?: {
    positioning: string
    features: Array<{
      id: string
      name: string
      description: string
      priority: string
    }>
    techStack: {
      frontend: string[]
      backend: string[]
      database: string[]
    }
    risks: string[]
    recommendations: string[]
  }
  demoUrl?: string
  repoUrl?: string
}

const STATUS_CONFIG = {
  draft: { label: '草稿', color: 'bg-gray-500' },
  pending_payment: { label: '待支付', color: 'bg-yellow-500' },
  paid: { label: '已支付', color: 'bg-blue-500' },
  in_progress: { label: '开发中', color: 'bg-primary' },
  completed: { label: '已完成', color: 'bg-green-500' },
}

// Mock data
const MOCK_PROJECT: ProjectDetail = {
  id: '1',
  name: '宠物电商平台',
  description: '一个综合性的宠物用品电商网站，支持商品浏览、购物车、在线支付等功能',
  status: 'in_progress',
  complexity: 'L3',
  price: 499,
  createdAt: new Date('2026-01-10'),
  updatedAt: new Date('2026-01-11'),
  progress: 65,
  proposal: {
    positioning: '面向宠物爱好者的一站式购物平台',
    features: [
      { id: '1', name: '用户注册登录', description: '邮箱/手机号注册，OAuth登录', priority: 'P0' },
      { id: '2', name: '商品浏览', description: '分类浏览、搜索、筛选', priority: 'P0' },
      { id: '3', name: '购物车', description: '添加商品、数量管理、价格计算', priority: 'P0' },
      { id: '4', name: '在线支付', description: 'Stripe支付集成', priority: 'P0' },
      { id: '5', name: '订单管理', description: '订单查看、物流跟踪', priority: 'P1' },
      { id: '6', name: '用户评价', description: '商品评价、评分系统', priority: 'P2' },
    ],
    techStack: {
      frontend: ['Next.js 14', 'TypeScript', 'Tailwind CSS', 'shadcn/ui'],
      backend: ['tRPC', 'Node.js', 'Stripe'],
      database: ['MongoDB', 'Redis'],
    },
    risks: [
      '支付集成需要商户账号审核',
      '商品图片需要CDN加速',
    ],
    recommendations: [
      '建议集成Google Analytics追踪用户行为',
      '建议添加邮件通知功能',
    ],
  },
  demoUrl: 'https://demo.thinkus.dev/pet-shop',
  repoUrl: 'https://github.com/thinkus-projects/pet-shop',
}

export default function ProjectDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id: projectId } = use(params)
  const router = useRouter()
  const [project] = useState<ProjectDetail>(MOCK_PROJECT)

  const statusConfig = STATUS_CONFIG[project.status]

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
    }
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b sticky top-0 z-50 bg-background/80 backdrop-blur-sm">
        <div className="container mx-auto px-4 h-14 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Link href="/projects">
              <Button variant="ghost" size="icon">
                <ArrowLeft className="h-4 w-4" />
              </Button>
            </Link>
            <div className="flex items-center gap-2">
              <span className="font-semibold">{project.name}</span>
              <Badge className={`${statusConfig.color} text-white`}>{statusConfig.label}</Badge>
            </div>
          </div>
          {getActionButton()}
        </div>
      </header>

      <main className="container mx-auto px-4 py-6 max-w-5xl">
        {/* Overview */}
        <Card className="mb-6">
          <CardContent className="p-6">
            <div className="flex flex-col md:flex-row justify-between gap-4">
              <div>
                <h1 className="text-2xl font-bold mb-2">{project.name}</h1>
                <p className="text-muted-foreground mb-4">{project.description}</p>
                <div className="flex flex-wrap gap-2">
                  <Badge variant="outline">{project.complexity}</Badge>
                  <Badge variant="secondary">${project.price}</Badge>
                </div>
              </div>
              <div className="flex flex-col gap-2 text-sm text-muted-foreground">
                <div className="flex items-center gap-2">
                  <Clock className="h-4 w-4" />
                  <span>创建于 {project.createdAt.toLocaleDateString('zh-CN')}</span>
                </div>
                <div className="flex items-center gap-2">
                  <Clock className="h-4 w-4" />
                  <span>更新于 {project.updatedAt.toLocaleDateString('zh-CN')}</span>
                </div>
              </div>
            </div>

            {/* Progress bar for in_progress status */}
            {project.status === 'in_progress' && project.progress !== undefined && (
              <div className="mt-6">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm font-medium">开发进度</span>
                  <span className="text-sm text-muted-foreground">{project.progress}%</span>
                </div>
                <div className="w-full h-2 bg-muted rounded-full overflow-hidden">
                  <div
                    className="h-full bg-primary rounded-full transition-all"
                    style={{ width: `${project.progress}%` }}
                  />
                </div>
              </div>
            )}

            {/* Quick links for completed projects */}
            {project.status === 'completed' && (project.demoUrl || project.repoUrl) && (
              <div className="mt-6 flex gap-2">
                {project.demoUrl && (
                  <a href={project.demoUrl} target="_blank" rel="noopener noreferrer">
                    <Button variant="outline" size="sm">
                      <Globe className="h-4 w-4 mr-2" />
                      演示站点
                    </Button>
                  </a>
                )}
                {project.repoUrl && (
                  <a href={project.repoUrl} target="_blank" rel="noopener noreferrer">
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

        {/* Tabs */}
        <Tabs defaultValue="proposal" className="space-y-4">
          <TabsList>
            <TabsTrigger value="proposal">方案详情</TabsTrigger>
            <TabsTrigger value="features">功能清单</TabsTrigger>
            <TabsTrigger value="tech">技术栈</TabsTrigger>
            {project.status === 'completed' && (
              <TabsTrigger value="analytics">数据分析</TabsTrigger>
            )}
          </TabsList>

          {/* Proposal Tab */}
          <TabsContent value="proposal" className="space-y-4">
            {project.proposal && (
              <>
                <Card>
                  <CardHeader>
                    <CardTitle className="text-base">产品定位</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="text-muted-foreground">{project.proposal.positioning}</p>
                  </CardContent>
                </Card>

                <div className="grid md:grid-cols-2 gap-4">
                  {project.proposal.risks.length > 0 && (
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

                  {project.proposal.recommendations.length > 0 && (
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
                  共 {project.proposal?.features.length || 0} 个功能
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {['P0', 'P1', 'P2'].map(priority => {
                    const features = project.proposal?.features.filter(f => f.priority === priority) || []
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
                <div className="grid md:grid-cols-3 gap-6">
                  <div className="space-y-3">
                    <div className="flex items-center gap-2 font-medium">
                      <Layout className="h-4 w-4" />
                      前端
                    </div>
                    <div className="flex flex-wrap gap-2">
                      {project.proposal?.techStack.frontend.map(tech => (
                        <Badge key={tech} variant="secondary">
                          {tech}
                        </Badge>
                      ))}
                    </div>
                  </div>
                  <div className="space-y-3">
                    <div className="flex items-center gap-2 font-medium">
                      <Zap className="h-4 w-4" />
                      后端
                    </div>
                    <div className="flex flex-wrap gap-2">
                      {project.proposal?.techStack.backend.map(tech => (
                        <Badge key={tech} variant="secondary">
                          {tech}
                        </Badge>
                      ))}
                    </div>
                  </div>
                  <div className="space-y-3">
                    <div className="flex items-center gap-2 font-medium">
                      <Database className="h-4 w-4" />
                      数据库
                    </div>
                    <div className="flex flex-wrap gap-2">
                      {project.proposal?.techStack.database.map(tech => (
                        <Badge key={tech} variant="secondary">
                          {tech}
                        </Badge>
                      ))}
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
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
                      <div className="text-2xl font-bold">1,234</div>
                      <div className="text-sm text-muted-foreground">总访问量</div>
                    </div>
                    <div className="text-center p-4 bg-muted/50 rounded-lg">
                      <div className="text-2xl font-bold">456</div>
                      <div className="text-sm text-muted-foreground">独立用户</div>
                    </div>
                    <div className="text-center p-4 bg-muted/50 rounded-lg">
                      <div className="text-2xl font-bold">2:34</div>
                      <div className="text-sm text-muted-foreground">平均停留</div>
                    </div>
                    <div className="text-center p-4 bg-muted/50 rounded-lg">
                      <div className="text-2xl font-bold">3.2%</div>
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
