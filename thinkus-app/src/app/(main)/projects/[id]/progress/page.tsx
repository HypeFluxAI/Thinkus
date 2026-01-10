'use client'

import { useState, useEffect, use } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Progress } from '@/components/ui/progress'
import {
  ArrowLeft,
  CheckCircle2,
  Circle,
  Loader2,
  Code,
  Database,
  Layout,
  TestTube,
  Rocket,
  Clock,
  RefreshCw,
} from 'lucide-react'
import Link from 'next/link'

interface DevelopmentPhase {
  id: string
  name: string
  description: string
  status: 'pending' | 'in_progress' | 'completed'
  icon: React.ElementType
  tasks: Array<{
    name: string
    status: 'pending' | 'in_progress' | 'completed'
  }>
}

const DEVELOPMENT_PHASES: DevelopmentPhase[] = [
  {
    id: 'planning',
    name: '架构规划',
    description: 'AI分析需求，规划技术架构',
    status: 'completed',
    icon: Layout,
    tasks: [
      { name: '需求分析', status: 'completed' },
      { name: '技术选型', status: 'completed' },
      { name: '架构设计', status: 'completed' },
    ],
  },
  {
    id: 'database',
    name: '数据库设计',
    description: '设计数据模型和数据库结构',
    status: 'completed',
    icon: Database,
    tasks: [
      { name: '数据模型设计', status: 'completed' },
      { name: '数据库创建', status: 'completed' },
      { name: '索引优化', status: 'completed' },
    ],
  },
  {
    id: 'backend',
    name: '后端开发',
    description: '构建API和业务逻辑',
    status: 'in_progress',
    icon: Code,
    tasks: [
      { name: 'API路由搭建', status: 'completed' },
      { name: '业务逻辑实现', status: 'in_progress' },
      { name: '认证授权', status: 'pending' },
    ],
  },
  {
    id: 'frontend',
    name: '前端开发',
    description: '构建用户界面',
    status: 'pending',
    icon: Layout,
    tasks: [
      { name: '页面组件开发', status: 'pending' },
      { name: '状态管理', status: 'pending' },
      { name: 'UI/UX优化', status: 'pending' },
    ],
  },
  {
    id: 'testing',
    name: '测试验证',
    description: '功能测试和性能优化',
    status: 'pending',
    icon: TestTube,
    tasks: [
      { name: '单元测试', status: 'pending' },
      { name: '集成测试', status: 'pending' },
      { name: '性能优化', status: 'pending' },
    ],
  },
  {
    id: 'deployment',
    name: '部署上线',
    description: '部署到生产环境',
    status: 'pending',
    icon: Rocket,
    tasks: [
      { name: '环境配置', status: 'pending' },
      { name: '部署发布', status: 'pending' },
      { name: '域名配置', status: 'pending' },
    ],
  },
]

export default function ProgressPage({ params }: { params: Promise<{ id: string }> }) {
  const { id: projectId } = use(params)
  const router = useRouter()
  const [phases, setPhases] = useState<DevelopmentPhase[]>(DEVELOPMENT_PHASES)
  const [isRefreshing, setIsRefreshing] = useState(false)
  const [lastUpdated, setLastUpdated] = useState(new Date())

  // Calculate overall progress
  const totalTasks = phases.reduce((acc, phase) => acc + phase.tasks.length, 0)
  const completedTasks = phases.reduce(
    (acc, phase) => acc + phase.tasks.filter(t => t.status === 'completed').length,
    0
  )
  const progressPercentage = Math.round((completedTasks / totalTasks) * 100)

  // Get current phase
  const currentPhase = phases.find(p => p.status === 'in_progress') || phases[0]

  // Simulate progress updates
  useEffect(() => {
    const interval = setInterval(() => {
      setPhases(prev => {
        const newPhases = [...prev]
        // Find current in_progress task and potentially complete it
        for (const phase of newPhases) {
          const inProgressTask = phase.tasks.find(t => t.status === 'in_progress')
          if (inProgressTask && Math.random() > 0.7) {
            inProgressTask.status = 'completed'
            // Start next pending task
            const nextPending = phase.tasks.find(t => t.status === 'pending')
            if (nextPending) {
              nextPending.status = 'in_progress'
            } else {
              // Phase complete, start next phase
              phase.status = 'completed'
              const nextPhase = newPhases.find(p => p.status === 'pending')
              if (nextPhase) {
                nextPhase.status = 'in_progress'
                const firstTask = nextPhase.tasks[0]
                if (firstTask) firstTask.status = 'in_progress'
              }
            }
            setLastUpdated(new Date())
            break
          }
        }
        return newPhases
      })
    }, 5000)

    return () => clearInterval(interval)
  }, [])

  const handleRefresh = () => {
    setIsRefreshing(true)
    setTimeout(() => {
      setLastUpdated(new Date())
      setIsRefreshing(false)
    }, 1000)
  }

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'completed':
        return <CheckCircle2 className="h-5 w-5 text-green-500" />
      case 'in_progress':
        return <Loader2 className="h-5 w-5 text-primary animate-spin" />
      default:
        return <Circle className="h-5 w-5 text-muted-foreground" />
    }
  }

  const isCompleted = progressPercentage === 100

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b sticky top-0 z-50 bg-background/80 backdrop-blur-sm">
        <div className="container mx-auto px-4 h-14 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Link href="/dashboard">
              <Button variant="ghost" size="icon">
                <ArrowLeft className="h-4 w-4" />
              </Button>
            </Link>
            <div>
              <span className="font-semibold">开发进度</span>
              <Badge variant="secondary" className="ml-2">
                {isCompleted ? '已完成' : '开发中'}
              </Badge>
            </div>
          </div>
          <Button variant="outline" size="sm" onClick={handleRefresh} disabled={isRefreshing}>
            <RefreshCw className={`h-4 w-4 mr-2 ${isRefreshing ? 'animate-spin' : ''}`} />
            刷新
          </Button>
        </div>
      </header>

      <main className="container mx-auto px-4 py-8 max-w-4xl">
        {/* Progress Overview */}
        <Card className="mb-6">
          <CardContent className="p-6">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-4">
              <div>
                <h2 className="text-2xl font-bold">{progressPercentage}%</h2>
                <p className="text-muted-foreground">
                  {isCompleted ? '项目已完成！' : `当前: ${currentPhase?.name}`}
                </p>
              </div>
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Clock className="h-4 w-4" />
                <span>
                  最后更新: {lastUpdated.toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit' })}
                </span>
              </div>
            </div>
            <Progress value={progressPercentage} className="h-3" />
            <div className="flex justify-between mt-2 text-sm text-muted-foreground">
              <span>{completedTasks} / {totalTasks} 任务完成</span>
              <span>预计剩余: {isCompleted ? '0' : Math.max(1, Math.ceil((100 - progressPercentage) / 20))} 小时</span>
            </div>
          </CardContent>
        </Card>

        {/* Phase Timeline */}
        <div className="space-y-4">
          {phases.map((phase, index) => {
            const PhaseIcon = phase.icon
            return (
              <Card
                key={phase.id}
                className={phase.status === 'in_progress' ? 'border-primary' : ''}
              >
                <CardHeader className="pb-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div
                        className={`w-10 h-10 rounded-full flex items-center justify-center ${
                          phase.status === 'completed'
                            ? 'bg-green-100 dark:bg-green-900/30'
                            : phase.status === 'in_progress'
                            ? 'bg-primary/20'
                            : 'bg-muted'
                        }`}
                      >
                        <PhaseIcon
                          className={`h-5 w-5 ${
                            phase.status === 'completed'
                              ? 'text-green-500'
                              : phase.status === 'in_progress'
                              ? 'text-primary'
                              : 'text-muted-foreground'
                          }`}
                        />
                      </div>
                      <div>
                        <CardTitle className="text-base flex items-center gap-2">
                          {phase.name}
                          {phase.status === 'in_progress' && (
                            <Badge variant="default" className="text-xs">
                              进行中
                            </Badge>
                          )}
                        </CardTitle>
                        <CardDescription>{phase.description}</CardDescription>
                      </div>
                    </div>
                    {getStatusIcon(phase.status)}
                  </div>
                </CardHeader>

                {(phase.status === 'in_progress' || phase.status === 'completed') && (
                  <CardContent className="pt-0">
                    <div className="ml-[52px] space-y-2">
                      {phase.tasks.map((task, taskIndex) => (
                        <div
                          key={taskIndex}
                          className="flex items-center gap-2 text-sm"
                        >
                          {task.status === 'completed' ? (
                            <CheckCircle2 className="h-4 w-4 text-green-500" />
                          ) : task.status === 'in_progress' ? (
                            <Loader2 className="h-4 w-4 text-primary animate-spin" />
                          ) : (
                            <Circle className="h-4 w-4 text-muted-foreground" />
                          )}
                          <span
                            className={
                              task.status === 'completed'
                                ? 'text-muted-foreground line-through'
                                : task.status === 'in_progress'
                                ? 'text-foreground font-medium'
                                : 'text-muted-foreground'
                            }
                          >
                            {task.name}
                          </span>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                )}
              </Card>
            )
          })}
        </div>

        {/* Completion CTA */}
        {isCompleted && (
          <Card className="mt-6 border-green-500/50 bg-green-500/5">
            <CardContent className="p-6 text-center">
              <CheckCircle2 className="h-12 w-12 text-green-500 mx-auto mb-4" />
              <h3 className="text-xl font-bold mb-2">项目开发完成！</h3>
              <p className="text-muted-foreground mb-4">
                您的产品已准备就绪，点击下方按钮查看和下载
              </p>
              <Link href={`/projects/${projectId}/complete`}>
                <Button size="lg">
                  <Rocket className="mr-2 h-5 w-5" />
                  查看完成项目
                </Button>
              </Link>
            </CardContent>
          </Card>
        )}
      </main>
    </div>
  )
}
