'use client'

import { useSession, signOut } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { trpc } from '@/lib/trpc/client'
import { Plus, Rocket, Clock, CheckCircle, LogOut, Sparkles } from 'lucide-react'
import Link from 'next/link'

export default function DashboardPage() {
  const { data: session } = useSession()
  const router = useRouter()

  const { data: projectsData, isLoading } = trpc.project.list.useQuery()

  const projects = projectsData?.projects || []
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
      {/* Header */}
      <header className="border-b bg-background/80 backdrop-blur-sm sticky top-0 z-50">
        <div className="container mx-auto px-4 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Sparkles className="h-6 w-6 text-primary" />
            <span className="font-bold text-xl">Thinkus</span>
          </div>
          <div className="flex items-center gap-4">
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

      <main className="container mx-auto px-4 py-8">
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

        {/* Stats */}
        <section className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-8">
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center gap-4">
                <div className="p-3 bg-primary/10 rounded-lg">
                  <Rocket className="h-6 w-6 text-primary" />
                </div>
                <div>
                  <p className="text-2xl font-bold">{projects.length}</p>
                  <p className="text-sm text-muted-foreground">全部项目</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center gap-4">
                <div className="p-3 bg-orange-100 dark:bg-orange-900/20 rounded-lg">
                  <Clock className="h-6 w-6 text-orange-600" />
                </div>
                <div>
                  <p className="text-2xl font-bold">{inProgressProjects.length}</p>
                  <p className="text-sm text-muted-foreground">进行中</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center gap-4">
                <div className="p-3 bg-green-100 dark:bg-green-900/20 rounded-lg">
                  <CheckCircle className="h-6 w-6 text-green-600" />
                </div>
                <div>
                  <p className="text-2xl font-bold">{completedProjects.length}</p>
                  <p className="text-sm text-muted-foreground">已完成</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </section>

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
              <CardContent className="p-12 text-center">
                <Rocket className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
                <h3 className="text-lg font-medium mb-2">还没有项目</h3>
                <p className="text-muted-foreground mb-4">创建你的第一个项目，让AI帮你实现想法</p>
                <Button onClick={() => router.push('/create')}>
                  <Plus className="mr-2 h-4 w-4" />
                  创建项目
                </Button>
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
