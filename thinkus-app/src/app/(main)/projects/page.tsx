'use client'

import { useState } from 'react'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  Plus,
  Search,
  Filter,
  Clock,
  CheckCircle2,
  Loader2,
  CreditCard,
  FileText,
  MoreHorizontal,
  ExternalLink,
  Trash2,
  Eye,
  Sparkles,
  LayoutTemplate,
} from 'lucide-react'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog'
import { trpc } from '@/lib/trpc/client'
import { toast } from 'sonner'
import type { IProject, ProjectStatus } from '@/lib/db/models/project'

const STATUS_CONFIG: Record<ProjectStatus, { label: string; color: string; icon: React.ComponentType<{ className?: string }> }> = {
  draft: { label: '草稿', color: 'bg-gray-500', icon: FileText },
  discussing: { label: '讨论中', color: 'bg-blue-500', icon: Loader2 },
  confirmed: { label: '已确认', color: 'bg-indigo-500', icon: CheckCircle2 },
  pending_payment: { label: '待支付', color: 'bg-yellow-500', icon: CreditCard },
  paid: { label: '已支付', color: 'bg-blue-500', icon: CheckCircle2 },
  in_progress: { label: '开发中', color: 'bg-primary', icon: Loader2 },
  completed: { label: '已完成', color: 'bg-green-500', icon: CheckCircle2 },
  cancelled: { label: '已取消', color: 'bg-red-500', icon: FileText },
  active: { label: '活跃', color: 'bg-green-500', icon: CheckCircle2 },
  paused: { label: '已暂停', color: 'bg-yellow-500', icon: Clock },
  archived: { label: '已归档', color: 'bg-gray-500', icon: FileText },
}

export default function ProjectsPage() {
  const [searchQuery, setSearchQuery] = useState('')
  const [statusFilter, setStatusFilter] = useState<string>('all')
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false)
  const [projectToDelete, setProjectToDelete] = useState<string | null>(null)

  const utils = trpc.useUtils()

  // 获取项目列表
  const { data, isLoading } = trpc.project.list.useQuery()

  // 删除项目
  const deleteMutation = trpc.project.delete.useMutation({
    onSuccess: () => {
      toast.success('项目已删除')
      utils.project.list.invalidate()
      setDeleteDialogOpen(false)
      setProjectToDelete(null)
    },
    onError: (error) => {
      toast.error(error.message || '删除失败')
    },
  })

  const projects = (data?.projects || []) as unknown as IProject[]

  const filteredProjects = projects.filter(project => {
    const matchesSearch =
      project.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (project.description || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
      (project.requirement?.original || '').toLowerCase().includes(searchQuery.toLowerCase())
    const matchesStatus = statusFilter === 'all' || project.status === statusFilter
    return matchesSearch && matchesStatus
  })

  const getStatusBadge = (status: ProjectStatus) => {
    const config = STATUS_CONFIG[status] || { label: status, color: 'bg-gray-500', icon: FileText }
    const Icon = config.icon
    return (
      <Badge className={`${config.color} text-white`}>
        {(status === 'in_progress' || status === 'discussing') && <Icon className="h-3 w-3 mr-1 animate-spin" />}
        {config.label}
      </Badge>
    )
  }

  const getProjectLink = (project: IProject) => {
    switch (project.status) {
      case 'in_progress':
      case 'paid':
        return `/projects/${project._id}/progress`
      case 'completed':
        return `/projects/${project._id}/complete`
      default:
        return `/projects/${project._id}`
    }
  }

  const handleDeleteClick = (projectId: string) => {
    setProjectToDelete(projectId)
    setDeleteDialogOpen(true)
  }

  const confirmDelete = () => {
    if (projectToDelete) {
      deleteMutation.mutate({ id: projectToDelete })
    }
  }

  // 计算统计数据
  const stats = {
    total: projects.length,
    inProgress: projects.filter(p => p.status === 'in_progress' || p.status === 'discussing').length,
    completed: projects.filter(p => p.status === 'completed').length,
    pendingPayment: projects.filter(p => p.status === 'pending_payment' || p.status === 'confirmed').length,
  }

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background">
        <header className="border-b sticky top-0 z-50 bg-background/80 backdrop-blur-sm">
          <div className="container mx-auto px-4 h-14 flex items-center justify-between">
            <div className="flex items-center gap-4">
              <Link href="/" className="flex items-center gap-2">
                <Sparkles className="h-5 w-5 text-primary" />
                <span className="font-bold">Thinkus</span>
              </Link>
              <span className="text-muted-foreground">/</span>
              <h1 className="font-semibold">我的项目</h1>
            </div>
          </div>
        </header>
        <main className="container mx-auto px-4 py-6">
          <div className="flex items-center justify-center py-12">
            <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
          </div>
        </main>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b sticky top-0 z-50 bg-background/80 backdrop-blur-sm">
        <div className="container mx-auto px-4 h-14 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Link href="/" className="flex items-center gap-2">
              <Sparkles className="h-5 w-5 text-primary" />
              <span className="font-bold">Thinkus</span>
            </Link>
            <span className="text-muted-foreground">/</span>
            <h1 className="font-semibold">我的项目</h1>
          </div>
          <div className="flex items-center gap-2">
            <Link href="/templates">
              <Button variant="outline" size="sm">
                <LayoutTemplate className="h-4 w-4 mr-2" />
                模板市场
              </Button>
            </Link>
            <Link href="/create">
              <Button size="sm">
                <Plus className="h-4 w-4 mr-2" />
                新建项目
              </Button>
            </Link>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 py-6">
        {/* Filters */}
        <div className="flex flex-col sm:flex-row gap-4 mb-6">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="搜索项目..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10"
            />
          </div>
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-full sm:w-[180px]">
              <Filter className="h-4 w-4 mr-2" />
              <SelectValue placeholder="筛选状态" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">全部状态</SelectItem>
              <SelectItem value="draft">草稿</SelectItem>
              <SelectItem value="discussing">讨论中</SelectItem>
              <SelectItem value="pending_payment">待支付</SelectItem>
              <SelectItem value="in_progress">开发中</SelectItem>
              <SelectItem value="completed">已完成</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
          <Card>
            <CardContent className="p-4">
              <div className="text-2xl font-bold">{stats.total}</div>
              <div className="text-sm text-muted-foreground">总项目数</div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <div className="text-2xl font-bold text-primary">
                {stats.inProgress}
              </div>
              <div className="text-sm text-muted-foreground">进行中</div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <div className="text-2xl font-bold text-green-500">
                {stats.completed}
              </div>
              <div className="text-sm text-muted-foreground">已完成</div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <div className="text-2xl font-bold text-yellow-500">
                {stats.pendingPayment}
              </div>
              <div className="text-sm text-muted-foreground">待处理</div>
            </CardContent>
          </Card>
        </div>

        {/* Project List */}
        {filteredProjects.length === 0 ? (
          <Card>
            <CardContent className="p-12 text-center">
              <FileText className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <h3 className="font-medium mb-2">
                {searchQuery || statusFilter !== 'all' ? '没有匹配的项目' : '还没有项目'}
              </h3>
              <p className="text-sm text-muted-foreground mb-4">
                {searchQuery || statusFilter !== 'all'
                  ? '尝试调整搜索条件'
                  : '创建您的第一个项目，开始您的创业之旅'}
              </p>
              {!searchQuery && statusFilter === 'all' && (
                <Link href="/create">
                  <Button>
                    <Plus className="h-4 w-4 mr-2" />
                    新建项目
                  </Button>
                </Link>
              )}
            </CardContent>
          </Card>
        ) : (
          <div className="grid gap-4">
            {filteredProjects.map(project => (
              <Card key={project._id?.toString()} className="hover:border-primary/50 transition-colors">
                <CardHeader className="pb-3">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <Link href={getProjectLink(project)}>
                          <CardTitle className="text-lg hover:text-primary transition-colors cursor-pointer">
                            {project.name}
                          </CardTitle>
                        </Link>
                        {getStatusBadge(project.status)}
                        <Badge variant="outline">{project.complexity}</Badge>
                      </div>
                      <CardDescription>
                        {project.description || project.requirement?.original || '暂无描述'}
                      </CardDescription>
                    </div>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon">
                          <MoreHorizontal className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem asChild>
                          <Link href={getProjectLink(project)} className="flex items-center">
                            <Eye className="h-4 w-4 mr-2" />
                            查看详情
                          </Link>
                        </DropdownMenuItem>
                        {project.status === 'completed' && project.deployment?.url && (
                          <DropdownMenuItem asChild>
                            <a href={project.deployment.url} target="_blank" rel="noopener noreferrer" className="flex items-center">
                              <ExternalLink className="h-4 w-4 mr-2" />
                              访问演示
                            </a>
                          </DropdownMenuItem>
                        )}
                        <DropdownMenuSeparator />
                        <DropdownMenuItem
                          className="text-destructive"
                          onClick={() => handleDeleteClick(project._id?.toString() || '')}
                        >
                          <Trash2 className="h-4 w-4 mr-2" />
                          删除项目
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="flex items-center justify-between text-sm">
                    <div className="flex items-center gap-4 text-muted-foreground">
                      <div className="flex items-center gap-1">
                        <Clock className="h-4 w-4" />
                        <span>
                          {new Date(project.updatedAt).toLocaleDateString('zh-CN', {
                            month: 'short',
                            day: 'numeric',
                          })}
                        </span>
                      </div>
                      {project.proposal?.pricing?.total && (
                        <span>${project.proposal.pricing.total}</span>
                      )}
                      <span className="capitalize">{project.type}</span>
                    </div>
                    {project.status === 'in_progress' && project.progress?.percentage !== undefined && (
                      <div className="flex items-center gap-2">
                        <div className="w-24 h-2 bg-muted rounded-full overflow-hidden">
                          <div
                            className="h-full bg-primary rounded-full transition-all"
                            style={{ width: `${project.progress.percentage}%` }}
                          />
                        </div>
                        <span className="text-xs text-muted-foreground">{project.progress.percentage}%</span>
                      </div>
                    )}
                    {(project.status === 'pending_payment' || project.status === 'confirmed') && (
                      <Link href={`/projects/${project._id}`}>
                        <Button size="sm">
                          <CreditCard className="h-4 w-4 mr-2" />
                          立即支付
                        </Button>
                      </Link>
                    )}
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </main>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>确认删除</AlertDialogTitle>
            <AlertDialogDescription>
              此操作无法撤销。删除后，项目的所有数据将永久丢失。
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>取消</AlertDialogCancel>
            <AlertDialogAction
              onClick={confirmDelete}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {deleteMutation.isPending ? (
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              ) : null}
              删除
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
