'use client'

import { useState, useEffect, useCallback } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'
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
import { ScrollArea } from '@/components/ui/scroll-area'
import { Slider } from '@/components/ui/slider'
import { useToast } from '@/components/ui/use-toast'
import {
  Brain,
  Plus,
  Search,
  Trash2,
  User,
  Folder,
  Bot,
  Lightbulb,
  MessageSquare,
  ThumbsUp,
  GitBranch,
  Heart,
  Clock,
  TrendingUp,
  RefreshCw,
  Loader2,
  Eye,
} from 'lucide-react'
import type { MemoryType, MemoryLayer } from '@/lib/db/models/memory'
import type { AgentId } from '@/lib/config/executives'

// 记忆类型配置
const TYPE_CONFIG: Record<MemoryType, { label: string; icon: React.ElementType; color: string }> = {
  user_preference: { label: '用户偏好', icon: Heart, color: 'bg-pink-100 text-pink-700' },
  project_context: { label: '项目上下文', icon: Folder, color: 'bg-blue-100 text-blue-700' },
  discussion_insight: { label: '讨论洞察', icon: Lightbulb, color: 'bg-yellow-100 text-yellow-700' },
  decision: { label: '决策记录', icon: GitBranch, color: 'bg-purple-100 text-purple-700' },
  feedback: { label: '反馈意见', icon: ThumbsUp, color: 'bg-green-100 text-green-700' },
}

// 记忆层级配置
const LAYER_CONFIG: Record<MemoryLayer, { label: string; icon: React.ElementType; color: string }> = {
  user: { label: '用户层', icon: User, color: 'bg-indigo-100 text-indigo-700' },
  project: { label: '项目层', icon: Folder, color: 'bg-cyan-100 text-cyan-700' },
  agent: { label: '高管层', icon: Bot, color: 'bg-orange-100 text-orange-700' },
}

// Memory 接口
interface Memory {
  id: string
  type: MemoryType
  layer: MemoryLayer
  content: string
  summary?: string
  importance: number
  accessCount: number
  agentId?: AgentId
  projectId?: string
  vectorId: string
  source: {
    type: 'discussion' | 'feedback' | 'manual' | 'system'
    id?: string
  }
  createdAt: string
  lastAccessedAt?: string
}

// 统计接口
interface MemoryStats {
  total: number
  byType: Record<MemoryType, number>
  byLayer: Record<MemoryLayer, number>
}

interface MemoriesPanelProps {
  projectId?: string
  agentId?: AgentId
}

export function MemoriesPanel({ projectId, agentId }: MemoriesPanelProps) {
  const { toast } = useToast()
  const [memories, setMemories] = useState<Memory[]>([])
  const [stats, setStats] = useState<MemoryStats | null>(null)
  const [loading, setLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState('')
  const [typeFilter, setTypeFilter] = useState<MemoryType | 'all'>('all')
  const [layerFilter, setLayerFilter] = useState<MemoryLayer | 'all'>('all')

  // 对话框状态
  const [createDialogOpen, setCreateDialogOpen] = useState(false)
  const [detailDialogOpen, setDetailDialogOpen] = useState(false)
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false)
  const [selectedMemory, setSelectedMemory] = useState<Memory | null>(null)

  // 创建表单
  const [newMemory, setNewMemory] = useState({
    type: 'user_preference' as MemoryType,
    layer: 'user' as MemoryLayer,
    content: '',
    summary: '',
    importance: 5,
  })
  const [creating, setCreating] = useState(false)
  const [deleting, setDeleting] = useState(false)

  // 加载记忆列表
  const loadMemories = useCallback(async () => {
    try {
      setLoading(true)
      const params = new URLSearchParams()
      if (projectId) params.set('projectId', projectId)
      if (agentId) params.set('agentId', agentId)
      if (typeFilter !== 'all') params.set('type', typeFilter)
      if (layerFilter !== 'all') params.set('layer', layerFilter)
      if (searchQuery) params.set('query', searchQuery)

      const response = await fetch(`/api/memories?${params}`)
      const data = await response.json()

      if (data.success) {
        setMemories(data.memories || [])
        setStats(data.stats || null)
      }
    } catch (error) {
      console.error('Failed to load memories:', error)
      toast({
        title: '加载失败',
        description: '无法加载记忆列表',
        variant: 'destructive',
      })
    } finally {
      setLoading(false)
    }
  }, [projectId, agentId, typeFilter, layerFilter, searchQuery, toast])

  useEffect(() => {
    loadMemories()
  }, [loadMemories])

  // 创建记忆
  const handleCreate = async () => {
    if (!newMemory.content.trim()) {
      toast({
        title: '请输入内容',
        description: '记忆内容不能为空',
        variant: 'destructive',
      })
      return
    }

    try {
      setCreating(true)
      const response = await fetch('/api/memories', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...newMemory,
          projectId,
          agentId,
        }),
      })

      const data = await response.json()

      if (data.success) {
        toast({
          title: '创建成功',
          description: '新记忆已添加',
        })
        setCreateDialogOpen(false)
        setNewMemory({
          type: 'user_preference',
          layer: 'user',
          content: '',
          summary: '',
          importance: 5,
        })
        loadMemories()
      } else {
        throw new Error(data.error)
      }
    } catch (error) {
      console.error('Failed to create memory:', error)
      toast({
        title: '创建失败',
        description: '无法创建记忆',
        variant: 'destructive',
      })
    } finally {
      setCreating(false)
    }
  }

  // 删除记忆
  const handleDelete = async () => {
    if (!selectedMemory) return

    try {
      setDeleting(true)
      const response = await fetch(`/api/memories?vectorId=${selectedMemory.vectorId}`, {
        method: 'DELETE',
      })

      const data = await response.json()

      if (data.success) {
        toast({
          title: '删除成功',
          description: '记忆已删除',
        })
        setDeleteDialogOpen(false)
        setSelectedMemory(null)
        loadMemories()
      } else {
        throw new Error(data.error)
      }
    } catch (error) {
      console.error('Failed to delete memory:', error)
      toast({
        title: '删除失败',
        description: '无法删除记忆',
        variant: 'destructive',
      })
    } finally {
      setDeleting(false)
    }
  }

  // 搜索记忆
  const handleSearch = () => {
    loadMemories()
  }

  // 渲染记忆卡片
  const renderMemoryCard = (memory: Memory) => {
    const typeConfig = TYPE_CONFIG[memory.type]
    const layerConfig = LAYER_CONFIG[memory.layer]
    const TypeIcon = typeConfig.icon
    const LayerIcon = layerConfig.icon

    return (
      <Card
        key={memory.id}
        className="cursor-pointer hover:shadow-md transition-shadow"
        onClick={() => {
          setSelectedMemory(memory)
          setDetailDialogOpen(true)
        }}
      >
        <CardContent className="p-4">
          <div className="flex items-start justify-between gap-3">
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 flex-wrap mb-2">
                <Badge className={typeConfig.color} variant="secondary">
                  <TypeIcon className="h-3 w-3 mr-1" />
                  {typeConfig.label}
                </Badge>
                <Badge className={layerConfig.color} variant="secondary">
                  <LayerIcon className="h-3 w-3 mr-1" />
                  {layerConfig.label}
                </Badge>
                {memory.agentId && (
                  <Badge variant="outline" className="text-xs">
                    {memory.agentId}
                  </Badge>
                )}
              </div>
              <p className="text-sm line-clamp-2 mb-2">
                {memory.summary || memory.content}
              </p>
              <div className="flex items-center gap-4 text-xs text-muted-foreground">
                <span className="flex items-center gap-1">
                  <TrendingUp className="h-3 w-3" />
                  重要性: {memory.importance}/10
                </span>
                <span className="flex items-center gap-1">
                  <Eye className="h-3 w-3" />
                  访问: {memory.accessCount}
                </span>
                <span className="flex items-center gap-1">
                  <Clock className="h-3 w-3" />
                  {new Date(memory.createdAt).toLocaleDateString('zh-CN')}
                </span>
              </div>
            </div>
            <Button
              variant="ghost"
              size="icon"
              className="shrink-0"
              onClick={(e) => {
                e.stopPropagation()
                setSelectedMemory(memory)
                setDeleteDialogOpen(true)
              }}
            >
              <Trash2 className="h-4 w-4 text-destructive" />
            </Button>
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <div className="space-y-6">
      {/* 头部和统计 */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Brain className="h-6 w-6 text-primary" />
          <div>
            <h2 className="text-xl font-semibold">记忆管理</h2>
            <p className="text-sm text-muted-foreground">
              管理AI高管的长期记忆
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={loadMemories} disabled={loading}>
            <RefreshCw className={`h-4 w-4 mr-1 ${loading ? 'animate-spin' : ''}`} />
            刷新
          </Button>
          <Dialog open={createDialogOpen} onOpenChange={setCreateDialogOpen}>
            <DialogTrigger asChild>
              <Button size="sm">
                <Plus className="h-4 w-4 mr-1" />
                添加记忆
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-lg">
              <DialogHeader>
                <DialogTitle>添加新记忆</DialogTitle>
                <DialogDescription>
                  手动添加一条记忆到系统
                </DialogDescription>
              </DialogHeader>

              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>记忆类型</Label>
                    <Select
                      value={newMemory.type}
                      onValueChange={(v) => setNewMemory({ ...newMemory, type: v as MemoryType })}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {Object.entries(TYPE_CONFIG).map(([key, config]) => (
                          <SelectItem key={key} value={key}>
                            <div className="flex items-center gap-2">
                              <config.icon className="h-4 w-4" />
                              {config.label}
                            </div>
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <Label>记忆层级</Label>
                    <Select
                      value={newMemory.layer}
                      onValueChange={(v) => setNewMemory({ ...newMemory, layer: v as MemoryLayer })}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {Object.entries(LAYER_CONFIG).map(([key, config]) => (
                          <SelectItem key={key} value={key}>
                            <div className="flex items-center gap-2">
                              <config.icon className="h-4 w-4" />
                              {config.label}
                            </div>
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div className="space-y-2">
                  <Label>记忆内容</Label>
                  <Textarea
                    placeholder="输入要记忆的内容..."
                    value={newMemory.content}
                    onChange={(e) => setNewMemory({ ...newMemory, content: e.target.value })}
                    rows={4}
                  />
                </div>

                <div className="space-y-2">
                  <Label>摘要 (可选)</Label>
                  <Input
                    placeholder="简短摘要..."
                    value={newMemory.summary}
                    onChange={(e) => setNewMemory({ ...newMemory, summary: e.target.value })}
                  />
                </div>

                <div className="space-y-2">
                  <Label>重要性: {newMemory.importance}/10</Label>
                  <Slider
                    value={[newMemory.importance]}
                    onValueChange={([v]) => setNewMemory({ ...newMemory, importance: v })}
                    min={1}
                    max={10}
                    step={1}
                  />
                </div>
              </div>

              <DialogFooter>
                <Button variant="outline" onClick={() => setCreateDialogOpen(false)}>
                  取消
                </Button>
                <Button onClick={handleCreate} disabled={creating}>
                  {creating && <Loader2 className="h-4 w-4 mr-1 animate-spin" />}
                  创建
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {/* 统计卡片 */}
      {stats && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">总记忆</p>
                  <p className="text-2xl font-bold">{stats.total}</p>
                </div>
                <Brain className="h-8 w-8 text-primary opacity-50" />
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">用户偏好</p>
                  <p className="text-2xl font-bold">{stats.byType.user_preference}</p>
                </div>
                <Heart className="h-8 w-8 text-pink-500 opacity-50" />
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">决策记录</p>
                  <p className="text-2xl font-bold">{stats.byType.decision}</p>
                </div>
                <GitBranch className="h-8 w-8 text-purple-500 opacity-50" />
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">讨论洞察</p>
                  <p className="text-2xl font-bold">{stats.byType.discussion_insight}</p>
                </div>
                <Lightbulb className="h-8 w-8 text-yellow-500 opacity-50" />
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* 筛选和搜索 */}
      <Card>
        <CardContent className="p-4">
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="flex-1 flex gap-2">
              <Input
                placeholder="搜索记忆内容..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
                className="flex-1"
              />
              <Button variant="secondary" onClick={handleSearch}>
                <Search className="h-4 w-4" />
              </Button>
            </div>
            <Select value={typeFilter} onValueChange={(v) => setTypeFilter(v as MemoryType | 'all')}>
              <SelectTrigger className="w-[150px]">
                <SelectValue placeholder="类型筛选" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">全部类型</SelectItem>
                {Object.entries(TYPE_CONFIG).map(([key, config]) => (
                  <SelectItem key={key} value={key}>
                    {config.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={layerFilter} onValueChange={(v) => setLayerFilter(v as MemoryLayer | 'all')}>
              <SelectTrigger className="w-[150px]">
                <SelectValue placeholder="层级筛选" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">全部层级</SelectItem>
                {Object.entries(LAYER_CONFIG).map(([key, config]) => (
                  <SelectItem key={key} value={key}>
                    {config.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* 记忆列表 */}
      {loading ? (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
      ) : memories.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center">
            <Brain className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
            <p className="text-muted-foreground">暂无记忆</p>
            <p className="text-sm text-muted-foreground mt-1">
              记忆会在讨论中自动提取，也可以手动添加
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {memories.map(renderMemoryCard)}
        </div>
      )}

      {/* 详情对话框 */}
      <Dialog open={detailDialogOpen} onOpenChange={setDetailDialogOpen}>
        <DialogContent className="max-w-lg">
          {selectedMemory && (
            <>
              <DialogHeader>
                <div className="flex items-center gap-2 mb-2">
                  <Badge className={TYPE_CONFIG[selectedMemory.type].color} variant="secondary">
                    {TYPE_CONFIG[selectedMemory.type].label}
                  </Badge>
                  <Badge className={LAYER_CONFIG[selectedMemory.layer].color} variant="secondary">
                    {LAYER_CONFIG[selectedMemory.layer].label}
                  </Badge>
                </div>
                <DialogTitle>记忆详情</DialogTitle>
                <DialogDescription>
                  创建于 {new Date(selectedMemory.createdAt).toLocaleString('zh-CN')}
                </DialogDescription>
              </DialogHeader>

              <div className="space-y-4">
                {selectedMemory.summary && (
                  <div>
                    <Label className="text-sm text-muted-foreground">摘要</Label>
                    <p className="mt-1">{selectedMemory.summary}</p>
                  </div>
                )}

                <div>
                  <Label className="text-sm text-muted-foreground">完整内容</Label>
                  <ScrollArea className="mt-1 h-[200px] rounded border p-3">
                    <p className="whitespace-pre-wrap">{selectedMemory.content}</p>
                  </ScrollArea>
                </div>

                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <Label className="text-muted-foreground">重要性</Label>
                    <p className="mt-1 font-medium">{selectedMemory.importance}/10</p>
                  </div>
                  <div>
                    <Label className="text-muted-foreground">访问次数</Label>
                    <p className="mt-1 font-medium">{selectedMemory.accessCount}</p>
                  </div>
                  <div>
                    <Label className="text-muted-foreground">来源</Label>
                    <p className="mt-1 font-medium">{selectedMemory.source.type}</p>
                  </div>
                  {selectedMemory.agentId && (
                    <div>
                      <Label className="text-muted-foreground">关联高管</Label>
                      <p className="mt-1 font-medium">{selectedMemory.agentId}</p>
                    </div>
                  )}
                </div>
              </div>

              <DialogFooter>
                <Button
                  variant="destructive"
                  onClick={() => {
                    setDetailDialogOpen(false)
                    setDeleteDialogOpen(true)
                  }}
                >
                  <Trash2 className="h-4 w-4 mr-1" />
                  删除
                </Button>
                <Button variant="outline" onClick={() => setDetailDialogOpen(false)}>
                  关闭
                </Button>
              </DialogFooter>
            </>
          )}
        </DialogContent>
      </Dialog>

      {/* 删除确认对话框 */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>确认删除</AlertDialogTitle>
            <AlertDialogDescription>
              确定要删除这条记忆吗？此操作无法撤销。
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deleting}>取消</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} disabled={deleting}>
              {deleting && <Loader2 className="h-4 w-4 mr-1 animate-spin" />}
              删除
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
