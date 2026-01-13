'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Skeleton } from '@/components/ui/skeleton'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog'
import {
  ArrowLeft,
  Brain,
  Search,
  Trash2,
  User,
  Folder,
  Bot,
  MessageSquare,
  Target,
  ThumbsUp,
  Settings,
  Clock,
  TrendingUp,
  AlertCircle,
} from 'lucide-react'
import { toast } from 'sonner'

interface Memory {
  _id: string
  type: 'user_preference' | 'project_context' | 'discussion_insight' | 'decision' | 'feedback'
  layer: 'user' | 'project' | 'agent'
  content: string
  summary?: string
  importance: number
  accessCount: number
  agentId?: string
  projectId?: {
    _id: string
    name: string
  }
  vectorId: string
  createdAt: string
  lastAccessedAt?: string
}

interface MemoryStats {
  total: number
  byType: Record<string, number>
  byLayer: Record<string, number>
}

const TYPE_INFO: Record<string, { label: string; icon: React.ReactNode; color: string }> = {
  user_preference: { label: '用户偏好', icon: <User className="h-4 w-4" />, color: 'text-blue-500' },
  project_context: { label: '项目上下文', icon: <Folder className="h-4 w-4" />, color: 'text-green-500' },
  discussion_insight: { label: '讨论洞察', icon: <MessageSquare className="h-4 w-4" />, color: 'text-purple-500' },
  decision: { label: '决策记录', icon: <Target className="h-4 w-4" />, color: 'text-orange-500' },
  feedback: { label: '反馈信息', icon: <ThumbsUp className="h-4 w-4" />, color: 'text-pink-500' },
}

const LAYER_INFO: Record<string, { label: string; icon: React.ReactNode }> = {
  user: { label: '用户级', icon: <User className="h-4 w-4" /> },
  project: { label: '项目级', icon: <Folder className="h-4 w-4" /> },
  agent: { label: '高管级', icon: <Bot className="h-4 w-4" /> },
}

const TYPE_FILTERS = [
  { value: 'all', label: '全部类型' },
  { value: 'user_preference', label: '用户偏好' },
  { value: 'project_context', label: '项目上下文' },
  { value: 'discussion_insight', label: '讨论洞察' },
  { value: 'decision', label: '决策记录' },
  { value: 'feedback', label: '反馈信息' },
]

const LAYER_FILTERS = [
  { value: 'all', label: '全部层级' },
  { value: 'user', label: '用户级' },
  { value: 'project', label: '项目级' },
  { value: 'agent', label: '高管级' },
]

export default function MemoriesPage() {
  const [loading, setLoading] = useState(true)
  const [memories, setMemories] = useState<Memory[]>([])
  const [stats, setStats] = useState<MemoryStats | null>(null)
  const [searchQuery, setSearchQuery] = useState('')
  const [typeFilter, setTypeFilter] = useState('all')
  const [layerFilter, setLayerFilter] = useState('all')
  const [deleting, setDeleting] = useState<string | null>(null)

  useEffect(() => {
    loadMemories()
  }, [typeFilter, layerFilter])

  const loadMemories = async () => {
    try {
      setLoading(true)
      const params = new URLSearchParams()
      if (typeFilter !== 'all') params.set('type', typeFilter)
      if (layerFilter !== 'all') params.set('layer', layerFilter)
      params.set('limit', '100')

      const response = await fetch(`/api/memories?${params}`)
      if (response.ok) {
        const data = await response.json()
        setMemories(data.memories || [])
        setStats(data.stats || null)
      }
    } catch (error) {
      console.error('Failed to load memories:', error)
      toast.error('加载记忆失败')
    } finally {
      setLoading(false)
    }
  }

  const handleSearch = async () => {
    if (!searchQuery.trim()) {
      loadMemories()
      return
    }

    try {
      setLoading(true)
      const params = new URLSearchParams({
        query: searchQuery,
        limit: '50',
      })

      const response = await fetch(`/api/memories?${params}`)
      if (response.ok) {
        const data = await response.json()
        setMemories(data.memories || [])
      }
    } catch (error) {
      console.error('Failed to search memories:', error)
      toast.error('搜索失败')
    } finally {
      setLoading(false)
    }
  }

  const handleDelete = async (memory: Memory) => {
    try {
      setDeleting(memory._id)
      const params = new URLSearchParams({
        vectorId: memory.vectorId,
      })
      if (memory.agentId) params.set('agentId', memory.agentId)
      if (memory.projectId) params.set('projectId', memory.projectId._id)

      const response = await fetch(`/api/memories?${params}`, {
        method: 'DELETE',
      })

      if (response.ok) {
        setMemories(memories.filter(m => m._id !== memory._id))
        toast.success('记忆已删除')
      } else {
        throw new Error('Delete failed')
      }
    } catch (error) {
      console.error('Failed to delete memory:', error)
      toast.error('删除失败')
    } finally {
      setDeleting(null)
    }
  }

  const formatTime = (dateStr: string) => {
    const date = new Date(dateStr)
    const now = new Date()
    const diff = now.getTime() - date.getTime()
    const days = Math.floor(diff / 86400000)

    if (days < 1) return '今天'
    if (days < 7) return `${days} 天前`
    if (days < 30) return `${Math.floor(days / 7)} 周前`
    return date.toLocaleDateString('zh-CN')
  }

  const filteredMemories = memories.filter(memory =>
    searchQuery
      ? memory.content.toLowerCase().includes(searchQuery.toLowerCase()) ||
        memory.summary?.toLowerCase().includes(searchQuery.toLowerCase())
      : true
  )

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b bg-background/80 backdrop-blur-sm sticky top-0 z-50">
        <div className="container mx-auto px-4 h-14 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Link href="/dashboard">
              <Button variant="ghost" size="icon">
                <ArrowLeft className="h-4 w-4" />
              </Button>
            </Link>
            <div className="flex items-center gap-2">
              <Brain className="h-5 w-5 text-primary" />
              <span className="font-semibold">AI 记忆管理</span>
            </div>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 py-6 max-w-6xl">
        {/* Stats Cards */}
        {stats && (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
            <Card>
              <CardContent className="p-4">
                <div className="flex items-center gap-2 text-muted-foreground mb-1">
                  <Brain className="h-4 w-4" />
                  <span className="text-sm">总记忆</span>
                </div>
                <div className="text-2xl font-bold">{stats.total}</div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4">
                <div className="flex items-center gap-2 text-muted-foreground mb-1">
                  <User className="h-4 w-4" />
                  <span className="text-sm">用户级</span>
                </div>
                <div className="text-2xl font-bold">{stats.byLayer.user || 0}</div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4">
                <div className="flex items-center gap-2 text-muted-foreground mb-1">
                  <Folder className="h-4 w-4" />
                  <span className="text-sm">项目级</span>
                </div>
                <div className="text-2xl font-bold">{stats.byLayer.project || 0}</div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4">
                <div className="flex items-center gap-2 text-muted-foreground mb-1">
                  <Bot className="h-4 w-4" />
                  <span className="text-sm">高管级</span>
                </div>
                <div className="text-2xl font-bold">{stats.byLayer.agent || 0}</div>
              </CardContent>
            </Card>
          </div>
        )}

        {/* Filters */}
        <div className="flex flex-col md:flex-row gap-4 mb-6">
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="搜索记忆内容..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
              className="pl-10"
            />
          </div>
          <Select value={typeFilter} onValueChange={setTypeFilter}>
            <SelectTrigger className="w-full md:w-40">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {TYPE_FILTERS.map(filter => (
                <SelectItem key={filter.value} value={filter.value}>
                  {filter.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select value={layerFilter} onValueChange={setLayerFilter}>
            <SelectTrigger className="w-full md:w-40">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {LAYER_FILTERS.map(filter => (
                <SelectItem key={filter.value} value={filter.value}>
                  {filter.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Info Banner */}
        <Card className="mb-6 border-blue-200 bg-blue-50 dark:border-blue-900 dark:bg-blue-950/20">
          <CardContent className="p-4 flex gap-3">
            <AlertCircle className="h-5 w-5 text-blue-500 flex-shrink-0 mt-0.5" />
            <div className="text-sm">
              <p className="font-medium text-blue-700 dark:text-blue-400">关于 AI 记忆</p>
              <p className="text-blue-600 dark:text-blue-300 mt-1">
                AI 记忆是您与 AI 高管团队互动过程中积累的重要信息。这些记忆帮助 AI 更好地理解您的偏好、项目背景和历史决策，从而提供更个性化的建议。
              </p>
            </div>
          </CardContent>
        </Card>

        {/* Memory List */}
        {loading ? (
          <div className="space-y-4">
            {[1, 2, 3, 4, 5].map(i => (
              <Card key={i}>
                <CardContent className="p-4">
                  <Skeleton className="h-4 w-1/3 mb-2" />
                  <Skeleton className="h-20 w-full mb-2" />
                  <Skeleton className="h-4 w-1/4" />
                </CardContent>
              </Card>
            ))}
          </div>
        ) : filteredMemories.length === 0 ? (
          <Card>
            <CardContent className="p-12 text-center">
              <Brain className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
              <h3 className="text-lg font-medium mb-2">暂无记忆</h3>
              <p className="text-muted-foreground">
                与 AI 高管团队互动后，相关记忆将显示在这里
              </p>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-4">
            {filteredMemories.map(memory => {
              const typeInfo = TYPE_INFO[memory.type] || {
                label: memory.type,
                icon: <Settings className="h-4 w-4" />,
                color: 'text-gray-500',
              }
              const layerInfo = LAYER_INFO[memory.layer] || {
                label: memory.layer,
                icon: <Settings className="h-4 w-4" />,
              }

              return (
                <Card key={memory._id} className="hover:shadow-md transition-shadow">
                  <CardContent className="p-4">
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex-1 min-w-0">
                        {/* Header */}
                        <div className="flex items-center gap-2 mb-2 flex-wrap">
                          <div className={`flex items-center gap-1 ${typeInfo.color}`}>
                            {typeInfo.icon}
                            <span className="text-sm font-medium">{typeInfo.label}</span>
                          </div>
                          <Badge variant="outline" className="text-xs">
                            {layerInfo.icon}
                            <span className="ml-1">{layerInfo.label}</span>
                          </Badge>
                          {memory.projectId && (
                            <Link href={`/projects/${memory.projectId._id}`}>
                              <Badge variant="secondary" className="text-xs hover:bg-secondary/80">
                                <Folder className="h-3 w-3 mr-1" />
                                {memory.projectId.name}
                              </Badge>
                            </Link>
                          )}
                          {memory.agentId && (
                            <Badge variant="secondary" className="text-xs">
                              <Bot className="h-3 w-3 mr-1" />
                              {memory.agentId}
                            </Badge>
                          )}
                        </div>

                        {/* Content */}
                        <div className="mb-3">
                          {memory.summary && (
                            <p className="font-medium mb-1">{memory.summary}</p>
                          )}
                          <p className="text-sm text-muted-foreground line-clamp-3">
                            {memory.content}
                          </p>
                        </div>

                        {/* Meta */}
                        <div className="flex items-center gap-4 text-xs text-muted-foreground">
                          <span className="flex items-center gap-1">
                            <Clock className="h-3 w-3" />
                            {formatTime(memory.createdAt)}
                          </span>
                          <span className="flex items-center gap-1">
                            <TrendingUp className="h-3 w-3" />
                            重要度: {memory.importance}/10
                          </span>
                          <span className="flex items-center gap-1">
                            <Search className="h-3 w-3" />
                            访问: {memory.accessCount}次
                          </span>
                        </div>
                      </div>

                      {/* Actions */}
                      <AlertDialog>
                        <AlertDialogTrigger asChild>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="text-muted-foreground hover:text-destructive"
                            disabled={deleting === memory._id}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </AlertDialogTrigger>
                        <AlertDialogContent>
                          <AlertDialogHeader>
                            <AlertDialogTitle>确认删除记忆？</AlertDialogTitle>
                            <AlertDialogDescription>
                              删除后，AI 将不再记住这条信息。此操作无法撤销。
                            </AlertDialogDescription>
                          </AlertDialogHeader>
                          <AlertDialogFooter>
                            <AlertDialogCancel>取消</AlertDialogCancel>
                            <AlertDialogAction
                              onClick={() => handleDelete(memory)}
                              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                            >
                              删除
                            </AlertDialogAction>
                          </AlertDialogFooter>
                        </AlertDialogContent>
                      </AlertDialog>
                    </div>
                  </CardContent>
                </Card>
              )
            })}
          </div>
        )}
      </main>
    </div>
  )
}
