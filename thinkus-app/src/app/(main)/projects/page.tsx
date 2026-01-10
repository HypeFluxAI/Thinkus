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

interface Project {
  id: string
  name: string
  description: string
  status: 'draft' | 'pending_payment' | 'paid' | 'in_progress' | 'completed'
  complexity: string
  price: number
  createdAt: Date
  updatedAt: Date
  progress?: number
}

const STATUS_CONFIG = {
  draft: { label: '草稿', color: 'bg-gray-500', icon: FileText },
  pending_payment: { label: '待支付', color: 'bg-yellow-500', icon: CreditCard },
  paid: { label: '已支付', color: 'bg-blue-500', icon: CheckCircle2 },
  in_progress: { label: '开发中', color: 'bg-primary', icon: Loader2 },
  completed: { label: '已完成', color: 'bg-green-500', icon: CheckCircle2 },
}

// Mock data - replace with real API call
const MOCK_PROJECTS: Project[] = [
  {
    id: '1',
    name: '宠物电商平台',
    description: '一个综合性的宠物用品电商网站',
    status: 'in_progress',
    complexity: 'L3',
    price: 499,
    createdAt: new Date('2026-01-10'),
    updatedAt: new Date('2026-01-11'),
    progress: 65,
  },
  {
    id: '2',
    name: '任务管理工具',
    description: '团队协作任务管理应用',
    status: 'completed',
    complexity: 'L2',
    price: 199,
    createdAt: new Date('2026-01-08'),
    updatedAt: new Date('2026-01-09'),
    progress: 100,
  },
  {
    id: '3',
    name: '个人博客',
    description: '简洁的个人技术博客',
    status: 'pending_payment',
    complexity: 'L1',
    price: 49,
    createdAt: new Date('2026-01-11'),
    updatedAt: new Date('2026-01-11'),
  },
  {
    id: '4',
    name: 'SaaS 数据分析平台',
    description: '企业级数据可视化和分析平台',
    status: 'draft',
    complexity: 'L4',
    price: 999,
    createdAt: new Date('2026-01-11'),
    updatedAt: new Date('2026-01-11'),
  },
]

export default function ProjectsPage() {
  const [searchQuery, setSearchQuery] = useState('')
  const [statusFilter, setStatusFilter] = useState<string>('all')
  const [projects] = useState<Project[]>(MOCK_PROJECTS)

  const filteredProjects = projects.filter(project => {
    const matchesSearch =
      project.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      project.description.toLowerCase().includes(searchQuery.toLowerCase())
    const matchesStatus = statusFilter === 'all' || project.status === statusFilter
    return matchesSearch && matchesStatus
  })

  const getStatusBadge = (status: Project['status']) => {
    const config = STATUS_CONFIG[status]
    return (
      <Badge className={`${config.color} text-white`}>
        {status === 'in_progress' && <Loader2 className="h-3 w-3 mr-1 animate-spin" />}
        {config.label}
      </Badge>
    )
  }

  const getProjectLink = (project: Project) => {
    switch (project.status) {
      case 'in_progress':
      case 'paid':
        return `/projects/${project.id}/progress`
      case 'completed':
        return `/projects/${project.id}/complete`
      default:
        return `/projects/${project.id}`
    }
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
              <div className="text-2xl font-bold">{projects.length}</div>
              <div className="text-sm text-muted-foreground">总项目数</div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <div className="text-2xl font-bold text-primary">
                {projects.filter(p => p.status === 'in_progress').length}
              </div>
              <div className="text-sm text-muted-foreground">开发中</div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <div className="text-2xl font-bold text-green-500">
                {projects.filter(p => p.status === 'completed').length}
              </div>
              <div className="text-sm text-muted-foreground">已完成</div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <div className="text-2xl font-bold text-yellow-500">
                {projects.filter(p => p.status === 'pending_payment').length}
              </div>
              <div className="text-sm text-muted-foreground">待支付</div>
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
              <Card key={project.id} className="hover:border-primary/50 transition-colors">
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
                      <CardDescription>{project.description}</CardDescription>
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
                        {project.status === 'completed' && (
                          <DropdownMenuItem>
                            <ExternalLink className="h-4 w-4 mr-2" />
                            访问演示
                          </DropdownMenuItem>
                        )}
                        <DropdownMenuSeparator />
                        <DropdownMenuItem className="text-destructive">
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
                          {project.updatedAt.toLocaleDateString('zh-CN', {
                            month: 'short',
                            day: 'numeric',
                          })}
                        </span>
                      </div>
                      <span>${project.price}</span>
                    </div>
                    {project.status === 'in_progress' && project.progress !== undefined && (
                      <div className="flex items-center gap-2">
                        <div className="w-24 h-2 bg-muted rounded-full overflow-hidden">
                          <div
                            className="h-full bg-primary rounded-full transition-all"
                            style={{ width: `${project.progress}%` }}
                          />
                        </div>
                        <span className="text-xs text-muted-foreground">{project.progress}%</span>
                      </div>
                    )}
                    {project.status === 'pending_payment' && (
                      <Button size="sm">
                        <CreditCard className="h-4 w-4 mr-2" />
                        立即支付
                      </Button>
                    )}
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </main>
    </div>
  )
}
