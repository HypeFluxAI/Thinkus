'use client'

import { useState, useCallback } from 'react'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
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
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { useToast } from '@/components/ui/use-toast'
import {
  Brain,
  Search,
  RefreshCw,
  Download,
  Settings,
  Loader2,
  Sparkles,
  Archive,
  Snowflake,
} from 'lucide-react'
import { trpc } from '@/lib/trpc/client'
import { MemoryStats } from './memory-stats'
import { MemoryCard, type MemoryItemData } from './memory-card'

type MemoryTier = 'CORE' | 'RELEVANT' | 'COLD'
type MemoryType = 'fact' | 'preference' | 'decision' | 'context' | 'insight'

interface MemoryPanelProps {
  employeeId: string
  projectId?: string
}

const TIER_OPTIONS = [
  { value: 'CORE', label: '核心记忆', icon: Sparkles },
  { value: 'RELEVANT', label: '相关记忆', icon: Archive },
  { value: 'COLD', label: '冷存储', icon: Snowflake },
]

const TYPE_OPTIONS = [
  { value: 'fact', label: '事实' },
  { value: 'preference', label: '偏好' },
  { value: 'decision', label: '决策' },
  { value: 'context', label: '上下文' },
  { value: 'insight', label: '洞察' },
]

export function MemoryPanel({ employeeId, projectId }: MemoryPanelProps) {
  const { toast } = useToast()
  const utils = trpc.useUtils()

  // Filters
  const [searchQuery, setSearchQuery] = useState('')
  const [tierFilter, setTierFilter] = useState<MemoryTier | 'all'>('all')
  const [typeFilter, setTypeFilter] = useState<MemoryType | 'all'>('all')

  // Dialogs
  const [detailDialogOpen, setDetailDialogOpen] = useState(false)
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false)
  const [selectedMemory, setSelectedMemory] = useState<MemoryItemData | null>(null)

  // Query memories
  const memoriesQuery = trpc.memory.list.useQuery(
    {
      employeeId,
      projectId,
      tier: tierFilter !== 'all' ? tierFilter : undefined,
      type: typeFilter !== 'all' ? typeFilter : undefined,
      limit: 100,
    },
    {
      enabled: !!employeeId,
    }
  )

  // Search memories (only when searchQuery is set)
  const searchQuery_enabled = searchQuery.length > 0 && !!employeeId && !!projectId
  const searchMemoriesQuery = trpc.memory.search.useQuery(
    {
      query: searchQuery,
      employeeId,
      projectId: projectId || '',
      filters: {
        tier: tierFilter !== 'all' ? [tierFilter] : undefined,
        type: typeFilter !== 'all' ? [typeFilter] : undefined,
      },
      limit: 50,
    },
    {
      enabled: searchQuery_enabled,
    }
  )

  // Delete mutation
  const deleteMutation = trpc.memory.delete.useMutation({
    onSuccess: () => {
      toast({ title: '删除成功', description: '记忆已删除' })
      setDeleteDialogOpen(false)
      setSelectedMemory(null)
      utils.memory.list.invalidate()
    },
    onError: (error) => {
      toast({
        title: '删除失败',
        description: error.message,
        variant: 'destructive',
      })
    },
  })

  // Update tier mutation
  const updateTierMutation = trpc.memory.updateTier.useMutation({
    onSuccess: () => {
      toast({ title: '更新成功', description: '记忆层级已更新' })
      utils.memory.list.invalidate()
    },
    onError: (error) => {
      toast({
        title: '更新失败',
        description: error.message,
        variant: 'destructive',
      })
    },
  })

  // Maintenance mutation
  const maintenanceMutation = trpc.memory.runMaintenance.useMutation({
    onSuccess: (data) => {
      toast({
        title: '维护完成',
        description: `维护任务已执行`,
      })
      utils.memory.list.invalidate()
    },
    onError: (error) => {
      toast({
        title: '维护失败',
        description: error.message,
        variant: 'destructive',
      })
    },
  })

  // Export URL query
  const exportUrlQuery = trpc.memory.exportUrl.useQuery(
    { employeeId, format: 'json', projectId },
    { enabled: false }
  )

  // Handlers
  const handleRefresh = useCallback(() => {
    memoriesQuery.refetch()
  }, [memoriesQuery])

  const handleSearch = useCallback(() => {
    if (searchQuery) {
      searchMemoriesQuery.refetch()
    }
  }, [searchQuery, searchMemoriesQuery])

  const handleDelete = useCallback(async () => {
    if (!selectedMemory) return
    deleteMutation.mutate({
      employeeId,
      memoryId: selectedMemory.id,
    })
  }, [selectedMemory, employeeId, deleteMutation])

  const handleTierChange = useCallback(
    (memoryId: string, tier: MemoryTier) => {
      updateTierMutation.mutate({
        employeeId,
        memoryId,
        tier,
      })
    },
    [employeeId, updateTierMutation]
  )

  const handleExport = useCallback(async () => {
    const AI_ENGINE_URL = process.env.NEXT_PUBLIC_AI_ENGINE_URL || 'http://localhost:8016'
    const params = new URLSearchParams()
    params.set('format', 'json')
    if (projectId) params.set('project_id', projectId)

    const url = `${AI_ENGINE_URL}/api/v1/memory/${employeeId}/export?${params}`
    window.open(url, '_blank')
  }, [employeeId, projectId])

  const handleMaintenance = useCallback(() => {
    maintenanceMutation.mutate({ employeeId, projectId })
  }, [employeeId, projectId, maintenanceMutation])

  const handleCardClick = useCallback((memory: MemoryItemData) => {
    setSelectedMemory(memory)
    setDetailDialogOpen(true)
  }, [])

  const handleDeleteClick = useCallback((memoryId: string) => {
    const memory = memories.find(m => m.id === memoryId)
    if (memory) {
      setSelectedMemory(memory)
      setDeleteDialogOpen(true)
    }
  }, [])

  // Use search results if searching, otherwise use list results
  const memories = searchQuery_enabled
    ? (searchMemoriesQuery.data?.memories || [])
    : (memoriesQuery.data?.memories || [])

  const stats = memoriesQuery.data?.stats || null
  const loading = memoriesQuery.isLoading || (searchQuery_enabled && searchMemoriesQuery.isLoading)

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Brain className="h-6 w-6 text-primary" />
          <div>
            <h2 className="text-xl font-semibold">AI员工记忆系统</h2>
            <p className="text-sm text-muted-foreground">
              查看和管理 {employeeId} 的记忆数据
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={handleMaintenance}
            disabled={maintenanceMutation.isPending}
          >
            {maintenanceMutation.isPending ? (
              <Loader2 className="h-4 w-4 mr-1 animate-spin" />
            ) : (
              <Settings className="h-4 w-4 mr-1" />
            )}
            维护
          </Button>
          <Button variant="outline" size="sm" onClick={handleExport}>
            <Download className="h-4 w-4 mr-1" />
            导出
          </Button>
          <Button variant="outline" size="sm" onClick={handleRefresh} disabled={loading}>
            <RefreshCw className={`h-4 w-4 mr-1 ${loading ? 'animate-spin' : ''}`} />
            刷新
          </Button>
        </div>
      </div>

      {/* Stats */}
      <MemoryStats stats={stats} loading={memoriesQuery.isLoading} />

      {/* Filters */}
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
              <Button variant="secondary" onClick={handleSearch} disabled={!searchQuery}>
                <Search className="h-4 w-4" />
              </Button>
            </div>
            <Select
              value={tierFilter}
              onValueChange={(v) => setTierFilter(v as MemoryTier | 'all')}
            >
              <SelectTrigger className="w-[150px]">
                <SelectValue placeholder="记忆层级" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">全部层级</SelectItem>
                {TIER_OPTIONS.map(({ value, label, icon: Icon }) => (
                  <SelectItem key={value} value={value}>
                    <div className="flex items-center gap-2">
                      <Icon className="h-4 w-4" />
                      {label}
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select
              value={typeFilter}
              onValueChange={(v) => setTypeFilter(v as MemoryType | 'all')}
            >
              <SelectTrigger className="w-[150px]">
                <SelectValue placeholder="记忆类型" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">全部类型</SelectItem>
                {TYPE_OPTIONS.map(({ value, label }) => (
                  <SelectItem key={value} value={value}>
                    {label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Memory List */}
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
              记忆会在与AI员工对话过程中自动生成
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {memories.map((memory) => (
            <MemoryCard
              key={memory.id}
              memory={memory}
              onClick={handleCardClick}
              onDelete={handleDeleteClick}
              onTierChange={handleTierChange}
            />
          ))}
        </div>
      )}

      {/* Detail Dialog */}
      <Dialog open={detailDialogOpen} onOpenChange={setDetailDialogOpen}>
        <DialogContent className="max-w-lg">
          {selectedMemory && (
            <>
              <DialogHeader>
                <div className="flex items-center gap-2 mb-2">
                  <Badge variant="outline">
                    {selectedMemory.tier}
                  </Badge>
                  <Badge variant="secondary">
                    {selectedMemory.type}
                  </Badge>
                  {selectedMemory.status === 'OUTDATED' && (
                    <Badge variant="destructive">已过时</Badge>
                  )}
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

                {selectedMemory.keywords.length > 0 && (
                  <div>
                    <Label className="text-sm text-muted-foreground">关键词</Label>
                    <div className="flex flex-wrap gap-1 mt-1">
                      {selectedMemory.keywords.map((kw, idx) => (
                        <Badge key={idx} variant="secondary" className="text-xs">
                          {kw}
                        </Badge>
                      ))}
                    </div>
                  </div>
                )}

                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <Label className="text-muted-foreground">置信度</Label>
                    <p className="mt-1 font-medium">
                      {Math.round(selectedMemory.confidence * 100)}%
                    </p>
                  </div>
                  <div>
                    <Label className="text-muted-foreground">访问次数</Label>
                    <p className="mt-1 font-medium">{selectedMemory.accessCount}</p>
                  </div>
                  <div>
                    <Label className="text-muted-foreground">员工ID</Label>
                    <p className="mt-1 font-medium">{selectedMemory.employeeId}</p>
                  </div>
                  <div>
                    <Label className="text-muted-foreground">最后访问</Label>
                    <p className="mt-1 font-medium">
                      {new Date(selectedMemory.lastSeen).toLocaleDateString('zh-CN')}
                    </p>
                  </div>
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

      {/* Delete Confirmation */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>确认删除</AlertDialogTitle>
            <AlertDialogDescription>
              确定要删除这条记忆吗？此操作无法撤销。
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deleteMutation.isPending}>取消</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} disabled={deleteMutation.isPending}>
              {deleteMutation.isPending && <Loader2 className="h-4 w-4 mr-1 animate-spin" />}
              删除
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
