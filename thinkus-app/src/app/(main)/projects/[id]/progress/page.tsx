'use client'

import { use } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Progress } from '@/components/ui/progress'
import {
  Code,
  Database,
  Layout,
  TestTube,
  Rocket,
  Clock,
  Circle,
} from 'lucide-react'

const PHASE_PREVIEW = [
  {
    icon: Layout,
    name: '架构规划',
    description: 'AI分析需求，规划技术架构',
  },
  {
    icon: Database,
    name: '数据库设计',
    description: '设计数据模型和数据库结构',
  },
  {
    icon: Code,
    name: '后端开发',
    description: '构建API和业务逻辑',
  },
  {
    icon: Layout,
    name: '前端开发',
    description: '构建用户界面',
  },
  {
    icon: TestTube,
    name: '测试验证',
    description: '功能测试和性能优化',
  },
  {
    icon: Rocket,
    name: '部署上线',
    description: '部署到生产环境',
  },
]

export default function ProgressPage({ params }: { params: Promise<{ id: string }> }) {
  const { id: projectId } = use(params)

  return (
    <div className="bg-background">
      {/* Page Header */}
      <div className="border-b bg-muted/30">
        <div className="container mx-auto px-4 py-4 max-w-4xl">
          <div className="flex items-center justify-between">
            <div>
              <div className="flex items-center gap-3">
                <Rocket className="h-5 w-5 text-primary" />
                <h1 className="font-semibold text-lg">开发进度</h1>
                <Badge variant="secondary" className="bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400">
                  <Clock className="h-3 w-3 mr-1" />
                  即将推出
                </Badge>
              </div>
              <p className="text-sm text-muted-foreground mt-1">
                实时追踪项目开发状态
              </p>
            </div>
          </div>
        </div>
      </div>

      <main className="container mx-auto px-4 py-8 max-w-4xl">
        {/* Coming Soon Notice */}
        <Card className="mb-8 border-amber-200 dark:border-amber-800 bg-amber-50/50 dark:bg-amber-950/20">
          <CardContent className="p-6 text-center">
            <div className="w-16 h-16 bg-amber-100 dark:bg-amber-900/30 rounded-full flex items-center justify-center mx-auto mb-4">
              <Rocket className="h-8 w-8 text-amber-600 dark:text-amber-400" />
            </div>
            <h2 className="text-xl font-semibold mb-2">开发进度追踪即将上线</h2>
            <p className="text-muted-foreground max-w-md mx-auto">
              我们正在开发实时进度追踪系统，让您随时了解项目开发状态。
            </p>
          </CardContent>
        </Card>

        {/* Progress Preview */}
        <Card className="mb-6 opacity-60">
          <CardContent className="p-6">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-4">
              <div>
                <h2 className="text-2xl font-bold text-muted-foreground">--%</h2>
                <p className="text-muted-foreground">等待项目开始开发</p>
              </div>
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Clock className="h-4 w-4" />
                <span>--:--</span>
              </div>
            </div>
            <Progress value={0} className="h-3" />
            <div className="flex justify-between mt-2 text-sm text-muted-foreground">
              <span>-- / -- 任务完成</span>
              <span>预计剩余: --</span>
            </div>
          </CardContent>
        </Card>

        {/* Phase Timeline Preview */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">开发阶段预览</CardTitle>
            <CardDescription>项目将经历以下开发阶段</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {PHASE_PREVIEW.map((phase, index) => (
                <div
                  key={phase.name}
                  className="flex items-center gap-4 p-4 rounded-lg bg-muted/50"
                >
                  <div className="relative">
                    <div className="w-10 h-10 rounded-full bg-background flex items-center justify-center">
                      <phase.icon className="h-5 w-5 text-muted-foreground" />
                    </div>
                    {index < PHASE_PREVIEW.length - 1 && (
                      <div className="absolute top-10 left-1/2 w-px h-4 bg-border -translate-x-1/2" />
                    )}
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <h3 className="font-medium">{phase.name}</h3>
                    </div>
                    <p className="text-sm text-muted-foreground">{phase.description}</p>
                  </div>
                  <Circle className="h-5 w-5 text-muted-foreground" />
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </main>
    </div>
  )
}
