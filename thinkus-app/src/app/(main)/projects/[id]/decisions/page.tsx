'use client'

import { useState, useEffect, use } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
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
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import {
  Target,
  Search,
  Filter,
  Circle,
  CheckCircle2,
  XCircle,
  Rocket,
  AlertTriangle,
  Loader2,
  MoreVertical,
  Trash2,
  Eye,
} from 'lucide-react'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'

interface Decision {
  id: string
  title: string
  description?: string
  type: string
  importance: string
  status: string
  reasoning?: string
  alternatives?: string[]
  risks?: string[]
  proposedBy: string
  approvedBy?: string
  approvedAt?: string
  implementedAt?: string
  project?: {
    id: string
    name: string
    icon?: string
  }
  discussion?: {
    id: string
    topic: string
  }
  tags?: string[]
  createdAt: string
  updatedAt: string
}

const TYPE_CONFIG: Record<string, { label: string; color: string }> = {
  feature: { label: '功能', color: 'bg-blue-500' },
  technical: { label: '技术', color: 'bg-purple-500' },
  design: { label: '设计', color: 'bg-pink-500' },
  business: { label: '商业', color: 'bg-green-500' },
  priority: { label: '优先级', color: 'bg-orange-500' },
  resource: { label: '资源', color: 'bg-yellow-500' },
  other: { label: '其他', color: 'bg-gray-500' },
}

const IMPORTANCE_CONFIG: Record<string, { label: string; variant: 'default' | 'secondary' | 'destructive' | 'outline' }> = {
  critical: { label: '关键', variant: 'destructive' },
  high: { label: '高', variant: 'default' },
  medium: { label: '中', variant: 'secondary' },
  low: { label: '低', variant: 'outline' },
}

const STATUS_CONFIG: Record<string, { icon: React.ReactNode; label: string; color: string }> = {
  proposed: { icon: <Circle className="h-4 w-4" />, label: '待审批', color: 'text-gray-500' },
  approved: { icon: <CheckCircle2 className="h-4 w-4" />, label: '已批准', color: 'text-green-500' },
  rejected: { icon: <XCircle className="h-4 w-4" />, label: '已拒绝', color: 'text-red-500' },
  implemented: { icon: <Rocket className="h-4 w-4" />, label: '已实施', color: 'text-blue-500' },
  superseded: { icon: <AlertTriangle className="h-4 w-4" />, label: '已替代', color: 'text-yellow-500' },
}

export default function ProjectDecisionsPage({ params }: { params: Promise<{ id: string }> }) {
  const { id: projectId } = use(params)
  const router = useRouter()
  const [decisions, setDecisions] = useState<Decision[]>([])
  const [loading, setLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState('')
  const [typeFilter, setTypeFilter] = useState<string>('all')
  const [statusFilter, setStatusFilter] = useState<string>('all')
  const [selectedDecision, setSelectedDecision] = useState<Decision | null>(null)
  const [showDetailDialog, setShowDetailDialog] = useState(false)

  useEffect(() => {
    async function fetchDecisions() {
      try {
        const res = await fetch(`/api/decisions?projectId=${projectId}`)
        if (res.ok) {
          const data = await res.json()
          setDecisions(data.decisions || [])
        }
      } catch (error) {
        console.error('Failed to fetch decisions:', error)
      } finally {
        setLoading(false)
      }
    }

    fetchDecisions()
  }, [projectId])

  const filteredDecisions = decisions.filter((decision) => {
    const matchesSearch = !searchQuery ||
      decision.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      decision.description?.toLowerCase().includes(searchQuery.toLowerCase())
    const matchesType = typeFilter === 'all' || decision.type === typeFilter
    const matchesStatus = statusFilter === 'all' || decision.status === statusFilter
    return matchesSearch && matchesType && matchesStatus
  })

  const handleStatusChange = async (decisionId: string, newStatus: string) => {
    try {
      const res = await fetch(`/api/decisions/${decisionId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: newStatus }),
      })
      if (res.ok) {
        setDecisions(decisions.map(d =>
          d.id === decisionId ? { ...d, status: newStatus } : d
        ))
      }
    } catch (error) {
      console.error('Failed to update decision:', error)
    }
  }

  const handleDelete = async (decisionId: string) => {
    if (!confirm('确定要删除这个决策吗？')) return

    try {
      const res = await fetch(`/api/decisions/${decisionId}`, {
        method: 'DELETE',
      })
      if (res.ok) {
        setDecisions(decisions.filter(d => d.id !== decisionId))
      }
    } catch (error) {
      console.error('Failed to delete decision:', error)
    }
  }

  const openDetailDialog = (decision: Decision) => {
    setSelectedDecision(decision)
    setShowDetailDialog(true)
  }

  // Group decisions by status
  const groupedDecisions = {
    proposed: filteredDecisions.filter(d => d.status === 'proposed'),
    approved: filteredDecisions.filter(d => d.status === 'approved'),
    implemented: filteredDecisions.filter(d => d.status === 'implemented'),
    rejected: filteredDecisions.filter(d => d.status === 'rejected'),
    superseded: filteredDecisions.filter(d => d.status === 'superseded'),
  }

  return (
    <div className="bg-background">
      {/* Page Header */}
      <div className="border-b bg-muted/30">
        <div className="container mx-auto px-4 py-4 max-w-5xl">
          <div className="flex items-center gap-3">
            <Target className="h-5 w-5 text-primary" />
            <h1 className="font-semibold text-lg">项目决策</h1>
            <Badge variant="secondary">{decisions.length}</Badge>
          </div>
          <p className="text-sm text-muted-foreground mt-1">
            管理和跟踪项目中的所有重要决策
          </p>
        </div>
      </div>

      <main className="container mx-auto px-4 py-6 max-w-5xl">
        {/* Filters */}
        <Card className="mb-6">
          <CardContent className="p-4">
            <div className="flex flex-col sm:flex-row gap-4">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="搜索决策..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-9"
                />
              </div>
              <div className="flex gap-2">
                <Select value={typeFilter} onValueChange={setTypeFilter}>
                  <SelectTrigger className="w-[120px]">
                    <Filter className="h-4 w-4 mr-2" />
                    <SelectValue placeholder="类型" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">全部类型</SelectItem>
                    {Object.entries(TYPE_CONFIG).map(([key, config]) => (
                      <SelectItem key={key} value={key}>{config.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Select value={statusFilter} onValueChange={setStatusFilter}>
                  <SelectTrigger className="w-[120px]">
                    <SelectValue placeholder="状态" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">全部状态</SelectItem>
                    {Object.entries(STATUS_CONFIG).map(([key, config]) => (
                      <SelectItem key={key} value={key}>{config.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Stats Overview */}
        <div className="grid grid-cols-2 sm:grid-cols-5 gap-4 mb-6">
          {Object.entries(groupedDecisions).map(([status, items]) => {
            const config = STATUS_CONFIG[status]
            return (
              <Card key={status} className="cursor-pointer hover:border-primary/50 transition-colors"
                onClick={() => setStatusFilter(statusFilter === status ? 'all' : status)}>
                <CardContent className="p-4 flex items-center gap-3">
                  <div className={config.color}>{config.icon}</div>
                  <div>
                    <p className="text-xl font-bold">{items.length}</p>
                    <p className="text-xs text-muted-foreground">{config.label}</p>
                  </div>
                </CardContent>
              </Card>
            )
          })}
        </div>

        {/* Decisions List */}
        {loading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
          </div>
        ) : filteredDecisions.length === 0 ? (
          <Card>
            <CardContent className="p-12 text-center">
              <Target className="h-12 w-12 mx-auto mb-4 text-muted-foreground/50" />
              <h3 className="text-lg font-medium mb-2">
                {searchQuery || typeFilter !== 'all' || statusFilter !== 'all'
                  ? '没有找到匹配的决策'
                  : '暂无决策记录'}
              </h3>
              <p className="text-muted-foreground">
                {searchQuery || typeFilter !== 'all' || statusFilter !== 'all'
                  ? '尝试调整筛选条件'
                  : '在讨论中做出的决策会自动记录在这里'}
              </p>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-3">
            {filteredDecisions.map((decision) => {
              const type = TYPE_CONFIG[decision.type] || TYPE_CONFIG.other
              const importance = IMPORTANCE_CONFIG[decision.importance] || IMPORTANCE_CONFIG.medium
              const status = STATUS_CONFIG[decision.status] || STATUS_CONFIG.proposed

              return (
                <Card key={decision.id} className="hover:shadow-md transition-shadow">
                  <CardContent className="p-4">
                    <div className="flex items-start gap-4">
                      <div className={`w-3 h-3 rounded-full mt-1.5 ${type.color}`} />
                      <div className="flex-1 min-w-0">
                        <div className="flex items-start justify-between gap-2 mb-2">
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 flex-wrap mb-1">
                              <h3 className="font-medium truncate">{decision.title}</h3>
                              <Badge variant={importance.variant} className="text-xs shrink-0">
                                {importance.label}
                              </Badge>
                              <Badge variant="outline" className="text-xs shrink-0">
                                {type.label}
                              </Badge>
                            </div>
                            {decision.description && (
                              <p className="text-sm text-muted-foreground line-clamp-2">
                                {decision.description}
                              </p>
                            )}
                          </div>
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button variant="ghost" size="icon" className="shrink-0">
                                <MoreVertical className="h-4 w-4" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                              <DropdownMenuItem onClick={() => openDetailDialog(decision)}>
                                <Eye className="h-4 w-4 mr-2" />
                                查看详情
                              </DropdownMenuItem>
                              {decision.status === 'proposed' && (
                                <>
                                  <DropdownMenuItem onClick={() => handleStatusChange(decision.id, 'approved')}>
                                    <CheckCircle2 className="h-4 w-4 mr-2" />
                                    批准
                                  </DropdownMenuItem>
                                  <DropdownMenuItem onClick={() => handleStatusChange(decision.id, 'rejected')}>
                                    <XCircle className="h-4 w-4 mr-2" />
                                    拒绝
                                  </DropdownMenuItem>
                                </>
                              )}
                              {decision.status === 'approved' && (
                                <DropdownMenuItem onClick={() => handleStatusChange(decision.id, 'implemented')}>
                                  <Rocket className="h-4 w-4 mr-2" />
                                  标记已实施
                                </DropdownMenuItem>
                              )}
                              <DropdownMenuItem
                                onClick={() => handleDelete(decision.id)}
                                className="text-red-600"
                              >
                                <Trash2 className="h-4 w-4 mr-2" />
                                删除
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </div>
                        <div className="flex items-center gap-4 text-sm text-muted-foreground">
                          <span className={`flex items-center gap-1 ${status.color}`}>
                            {status.icon}
                            {status.label}
                          </span>
                          <span>提议者: {decision.proposedBy}</span>
                          <span>{new Date(decision.createdAt).toLocaleDateString('zh-CN')}</span>
                          {decision.discussion && (
                            <Link
                              href={`/projects/${projectId}/discuss/${decision.discussion.id}`}
                              className="text-primary hover:underline"
                            >
                              来自讨论
                            </Link>
                          )}
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              )
            })}
          </div>
        )}

        {/* Decision Detail Dialog */}
        <Dialog open={showDetailDialog} onOpenChange={setShowDetailDialog}>
          <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
            {selectedDecision && (
              <>
                <DialogHeader>
                  <div className="flex items-center gap-2">
                    <div className={`w-3 h-3 rounded-full ${TYPE_CONFIG[selectedDecision.type]?.color || 'bg-gray-500'}`} />
                    <DialogTitle>{selectedDecision.title}</DialogTitle>
                  </div>
                  <DialogDescription>
                    决策详情
                  </DialogDescription>
                </DialogHeader>
                <div className="space-y-4 py-4">
                  {/* Status and Meta */}
                  <div className="flex flex-wrap gap-2">
                    <Badge variant={IMPORTANCE_CONFIG[selectedDecision.importance]?.variant || 'secondary'}>
                      {IMPORTANCE_CONFIG[selectedDecision.importance]?.label || '中'}
                    </Badge>
                    <Badge variant="outline">
                      {TYPE_CONFIG[selectedDecision.type]?.label || '其他'}
                    </Badge>
                    <Badge variant="outline" className={STATUS_CONFIG[selectedDecision.status]?.color}>
                      {STATUS_CONFIG[selectedDecision.status]?.label || '未知'}
                    </Badge>
                  </div>

                  {/* Description */}
                  {selectedDecision.description && (
                    <div>
                      <h4 className="text-sm font-medium mb-1">描述</h4>
                      <p className="text-sm text-muted-foreground">{selectedDecision.description}</p>
                    </div>
                  )}

                  {/* Reasoning */}
                  {selectedDecision.reasoning && (
                    <div>
                      <h4 className="text-sm font-medium mb-1">决策理由</h4>
                      <p className="text-sm text-muted-foreground">{selectedDecision.reasoning}</p>
                    </div>
                  )}

                  {/* Alternatives */}
                  {selectedDecision.alternatives && selectedDecision.alternatives.length > 0 && (
                    <div>
                      <h4 className="text-sm font-medium mb-1">备选方案</h4>
                      <ul className="list-disc list-inside text-sm text-muted-foreground">
                        {selectedDecision.alternatives.map((alt, idx) => (
                          <li key={idx}>{alt}</li>
                        ))}
                      </ul>
                    </div>
                  )}

                  {/* Risks */}
                  {selectedDecision.risks && selectedDecision.risks.length > 0 && (
                    <div>
                      <h4 className="text-sm font-medium mb-1">风险</h4>
                      <ul className="list-disc list-inside text-sm text-muted-foreground">
                        {selectedDecision.risks.map((risk, idx) => (
                          <li key={idx}>{risk}</li>
                        ))}
                      </ul>
                    </div>
                  )}

                  {/* Timeline */}
                  <div className="pt-4 border-t">
                    <h4 className="text-sm font-medium mb-2">时间线</h4>
                    <div className="text-sm text-muted-foreground space-y-1">
                      <p>创建于: {new Date(selectedDecision.createdAt).toLocaleString('zh-CN')}</p>
                      {selectedDecision.approvedAt && (
                        <p>批准于: {new Date(selectedDecision.approvedAt).toLocaleString('zh-CN')} (by {selectedDecision.approvedBy})</p>
                      )}
                      {selectedDecision.implementedAt && (
                        <p>实施于: {new Date(selectedDecision.implementedAt).toLocaleString('zh-CN')}</p>
                      )}
                    </div>
                  </div>
                </div>
                <DialogFooter>
                  <Button variant="outline" onClick={() => setShowDetailDialog(false)}>
                    关闭
                  </Button>
                </DialogFooter>
              </>
            )}
          </DialogContent>
        </Dialog>
      </main>
    </div>
  )
}
