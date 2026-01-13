'use client'

import { useState, useEffect, use } from 'react'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Skeleton } from '@/components/ui/skeleton'
import {
  Sparkles,
  Lock,
  Eye,
  MessageSquare,
  Target,
  CheckSquare,
  Calendar,
  Loader2,
  AlertCircle,
  ArrowRight,
  FileText,
} from 'lucide-react'
import { toast } from 'sonner'

interface ProjectInfo {
  _id: string
  name: string
  description?: string
  status: string
  phase: string
  type: string
  complexity: string
  createdAt: string
}

interface ShareInfo {
  permission: string
  title?: string
  message?: string
  createdAt: string
}

interface Discussion {
  _id: string
  topic: string
  status: string
  messageCount: number
  createdAt: string
}

interface Decision {
  _id: string
  title: string
  status: string
  importance: string
  createdAt: string
}

interface ActionItem {
  _id: string
  title: string
  status: string
  priority: string
  dueDate?: string
}

const STATUS_COLORS: Record<string, string> = {
  draft: 'bg-gray-500',
  active: 'bg-blue-500',
  completed: 'bg-green-500',
  paused: 'bg-yellow-500',
  cancelled: 'bg-red-500',
}

const PHASE_LABELS: Record<string, string> = {
  ideation: '构思阶段',
  planning: '规划阶段',
  design: '设计阶段',
  development: '开发阶段',
  testing: '测试阶段',
  launch: '上线阶段',
  growth: '增长阶段',
}

export default function SharePage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = use(params)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [requiresPassword, setRequiresPassword] = useState(false)
  const [password, setPassword] = useState('')
  const [verifying, setVerifying] = useState(false)

  const [share, setShare] = useState<ShareInfo | null>(null)
  const [project, setProject] = useState<ProjectInfo | null>(null)
  const [discussions, setDiscussions] = useState<Discussion[]>([])
  const [decisions, setDecisions] = useState<Decision[]>([])
  const [actionItems, setActionItems] = useState<ActionItem[]>([])

  useEffect(() => {
    loadShareData()
  }, [token])

  const loadShareData = async () => {
    try {
      setLoading(true)
      setError(null)

      const response = await fetch(`/api/share/${token}`)
      const data = await response.json()

      if (!response.ok) {
        setError(data.error || '分享不存在或已过期')
        return
      }

      if (data.requiresPassword) {
        setRequiresPassword(true)
        setShare({ permission: 'view', title: data.title, message: data.message, createdAt: '' })
        return
      }

      setShare(data.share)
      setProject(data.project)
      setDiscussions(data.discussions || [])
      setDecisions(data.decisions || [])
      setActionItems(data.actionItems || [])
    } catch (err) {
      console.error('Failed to load share:', err)
      setError('加载失败，请重试')
    } finally {
      setLoading(false)
    }
  }

  const handleVerifyPassword = async () => {
    if (!password.trim()) {
      toast.error('请输入密码')
      return
    }

    try {
      setVerifying(true)
      const response = await fetch(`/api/share/${token}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ password }),
      })

      const data = await response.json()

      if (!response.ok) {
        toast.error(data.error || '密码错误')
        return
      }

      setRequiresPassword(false)
      setShare(data.share)
      setProject(data.project)
      setDiscussions(data.discussions || [])
      setDecisions(data.decisions || [])
      setActionItems(data.actionItems || [])
    } catch (err) {
      console.error('Failed to verify password:', err)
      toast.error('验证失败')
    } finally {
      setVerifying(false)
    }
  }

  // Loading state
  if (loading) {
    return (
      <div className="min-h-screen bg-background">
        <header className="border-b">
          <div className="container mx-auto px-4 h-14 flex items-center">
            <Skeleton className="h-6 w-32" />
          </div>
        </header>
        <main className="container mx-auto px-4 py-8 max-w-4xl">
          <Skeleton className="h-8 w-64 mb-4" />
          <Skeleton className="h-4 w-full mb-8" />
          <div className="grid gap-4">
            <Skeleton className="h-40" />
            <Skeleton className="h-40" />
          </div>
        </main>
      </div>
    )
  }

  // Error state
  if (error) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        <Card className="max-w-md w-full">
          <CardContent className="p-8 text-center">
            <AlertCircle className="h-12 w-12 mx-auto mb-4 text-destructive" />
            <h2 className="text-xl font-semibold mb-2">无法访问</h2>
            <p className="text-muted-foreground mb-6">{error}</p>
            <Link href="/">
              <Button>
                <Sparkles className="h-4 w-4 mr-2" />
                访问 Thinkus
              </Button>
            </Link>
          </CardContent>
        </Card>
      </div>
    )
  }

  // Password required state
  if (requiresPassword) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        <Card className="max-w-md w-full">
          <CardHeader className="text-center">
            <div className="mx-auto mb-4 w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center">
              <Lock className="h-6 w-6 text-primary" />
            </div>
            <CardTitle>{share?.title || '受保护的分享'}</CardTitle>
            <CardDescription>
              {share?.message || '此分享需要密码才能访问'}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="password">访问密码</Label>
              <Input
                id="password"
                type="password"
                placeholder="输入密码"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleVerifyPassword()}
              />
            </div>
            <Button
              className="w-full"
              onClick={handleVerifyPassword}
              disabled={verifying}
            >
              {verifying ? (
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              ) : (
                <ArrowRight className="h-4 w-4 mr-2" />
              )}
              验证密码
            </Button>
          </CardContent>
        </Card>
      </div>
    )
  }

  // Main content
  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b bg-background/80 backdrop-blur-sm sticky top-0 z-50">
        <div className="container mx-auto px-4 h-14 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2">
            <Sparkles className="h-5 w-5 text-primary" />
            <span className="font-semibold">Thinkus</span>
          </Link>
          <Badge variant="secondary">
            <Eye className="h-3 w-3 mr-1" />
            分享预览
          </Badge>
        </div>
      </header>

      <main className="container mx-auto px-4 py-8 max-w-4xl">
        {/* Share message */}
        {share?.message && (
          <Card className="mb-6 border-primary/20 bg-primary/5">
            <CardContent className="p-4">
              <p className="text-sm">{share.message}</p>
            </CardContent>
          </Card>
        )}

        {/* Project header */}
        <div className="mb-8">
          <div className="flex items-center gap-3 mb-2">
            <h1 className="text-2xl font-bold">{project?.name}</h1>
            <Badge className={STATUS_COLORS[project?.status || 'draft']}>
              {project?.status}
            </Badge>
            {project?.phase && (
              <Badge variant="outline">
                {PHASE_LABELS[project.phase] || project.phase}
              </Badge>
            )}
          </div>
          {project?.description && (
            <p className="text-muted-foreground">{project.description}</p>
          )}
          <div className="flex items-center gap-4 mt-4 text-sm text-muted-foreground">
            <span className="flex items-center gap-1">
              <FileText className="h-4 w-4" />
              {project?.type}
            </span>
            <span className="flex items-center gap-1">
              <Calendar className="h-4 w-4" />
              创建于 {project?.createdAt ? new Date(project.createdAt).toLocaleDateString('zh-CN') : ''}
            </span>
          </div>
        </div>

        {/* Project content */}
        <div className="grid gap-6">
          {/* Discussions */}
          {discussions.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="text-lg flex items-center gap-2">
                  <MessageSquare className="h-5 w-5" />
                  讨论记录
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {discussions.map(d => (
                    <div key={d._id} className="flex items-center justify-between p-3 border rounded-lg">
                      <div>
                        <p className="font-medium">{d.topic}</p>
                        <p className="text-xs text-muted-foreground">
                          {d.messageCount} 条消息 · {new Date(d.createdAt).toLocaleDateString('zh-CN')}
                        </p>
                      </div>
                      <Badge variant={d.status === 'concluded' ? 'default' : 'secondary'}>
                        {d.status === 'concluded' ? '已结束' : '进行中'}
                      </Badge>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Decisions */}
          {decisions.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="text-lg flex items-center gap-2">
                  <Target className="h-5 w-5" />
                  决策记录
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {decisions.map(d => (
                    <div key={d._id} className="flex items-center justify-between p-3 border rounded-lg">
                      <div>
                        <p className="font-medium">{d.title}</p>
                        <p className="text-xs text-muted-foreground">
                          {d.importance} · {new Date(d.createdAt).toLocaleDateString('zh-CN')}
                        </p>
                      </div>
                      <Badge variant={d.status === 'approved' ? 'default' : 'secondary'}>
                        {d.status === 'approved' ? '已批准' : d.status === 'rejected' ? '已拒绝' : '待定'}
                      </Badge>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Action Items */}
          {actionItems.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="text-lg flex items-center gap-2">
                  <CheckSquare className="h-5 w-5" />
                  行动项
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {actionItems.map(a => (
                    <div key={a._id} className="flex items-center justify-between p-3 border rounded-lg">
                      <div>
                        <p className="font-medium">{a.title}</p>
                        <p className="text-xs text-muted-foreground">
                          {a.priority} 优先级
                          {a.dueDate && ` · 截止 ${new Date(a.dueDate).toLocaleDateString('zh-CN')}`}
                        </p>
                      </div>
                      <Badge variant={a.status === 'completed' ? 'default' : 'secondary'}>
                        {a.status === 'completed' ? '已完成' : a.status === 'in_progress' ? '进行中' : '待处理'}
                      </Badge>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Empty state */}
          {discussions.length === 0 && decisions.length === 0 && actionItems.length === 0 && (
            <Card>
              <CardContent className="p-8 text-center">
                <Eye className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
                <h3 className="text-lg font-medium mb-2">仅限基本信息</h3>
                <p className="text-muted-foreground">
                  此分享仅包含项目基本信息
                </p>
              </CardContent>
            </Card>
          )}
        </div>

        {/* CTA */}
        <div className="mt-12 text-center">
          <p className="text-muted-foreground mb-4">
            想创建自己的项目？
          </p>
          <Link href="/register">
            <Button>
              <Sparkles className="h-4 w-4 mr-2" />
              免费开始使用 Thinkus
            </Button>
          </Link>
        </div>
      </main>

      {/* Footer */}
      <footer className="border-t mt-12 py-6">
        <div className="container mx-auto px-4 text-center text-sm text-muted-foreground">
          <p>由 Thinkus 提供技术支持</p>
        </div>
      </footer>
    </div>
  )
}
