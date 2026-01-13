'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import {
  FileText,
  Image,
  Code,
  FileCode,
  Box,
  File,
  Plus,
  MoreVertical,
  CheckCircle2,
  Clock,
  XCircle,
  AlertTriangle,
  Edit,
  Trash2,
  Eye,
  Download,
  History,
  Send,
  Loader2,
} from 'lucide-react'
import { toast } from 'sonner'
import { EXECUTIVES, type AgentId } from '@/lib/config/executives'
import type { DeliverableType, DeliverableStatus } from '@/lib/db/models/deliverable'

interface Deliverable {
  id: string
  name: string
  description?: string
  type: DeliverableType
  status: DeliverableStatus
  content?: string
  fileUrl?: string
  fileMeta?: {
    name: string
    size: number
    type: string
  }
  currentVersion: string
  versionsCount: number
  createdBy: AgentId | 'user'
  reviewedBy?: AgentId | 'user'
  reviewNotes?: string
  reviewedAt?: Date
  priority: 'high' | 'medium' | 'low'
  dueDate?: Date
  tags?: string[]
  projectId: string
  createdAt: Date
  updatedAt: Date
}

interface DeliverablesPanelProps {
  projectId: string
  className?: string
}

const TYPE_CONFIG: Record<DeliverableType, { label: string; icon: React.ReactNode; color: string }> = {
  document: { label: '文档', icon: <FileText className="h-4 w-4" />, color: 'bg-blue-500' },
  design: { label: '设计稿', icon: <Image className="h-4 w-4" />, color: 'bg-purple-500' },
  code: { label: '代码', icon: <Code className="h-4 w-4" />, color: 'bg-green-500' },
  report: { label: '报告', icon: <FileText className="h-4 w-4" />, color: 'bg-orange-500' },
  prototype: { label: '原型', icon: <Box className="h-4 w-4" />, color: 'bg-pink-500' },
  api: { label: 'API文档', icon: <FileCode className="h-4 w-4" />, color: 'bg-cyan-500' },
  asset: { label: '资产文件', icon: <File className="h-4 w-4" />, color: 'bg-yellow-500' },
  other: { label: '其他', icon: <File className="h-4 w-4" />, color: 'bg-gray-500' },
}

const STATUS_CONFIG: Record<DeliverableStatus, { label: string; icon: React.ReactNode; variant: 'default' | 'secondary' | 'destructive' | 'outline' }> = {
  draft: { label: '草稿', icon: <Edit className="h-3 w-3" />, variant: 'secondary' },
  pending_review: { label: '待审核', icon: <Clock className="h-3 w-3" />, variant: 'outline' },
  approved: { label: '已批准', icon: <CheckCircle2 className="h-3 w-3" />, variant: 'default' },
  rejected: { label: '已拒绝', icon: <XCircle className="h-3 w-3" />, variant: 'destructive' },
  revision: { label: '需修改', icon: <AlertTriangle className="h-3 w-3" />, variant: 'outline' },
  delivered: { label: '已交付', icon: <CheckCircle2 className="h-3 w-3" />, variant: 'default' },
}

export function DeliverablesPanel({ projectId, className }: DeliverablesPanelProps) {
  const [deliverables, setDeliverables] = useState<Deliverable[]>([])
  const [loading, setLoading] = useState(true)
  const [showCreateDialog, setShowCreateDialog] = useState(false)
  const [showDetailDialog, setShowDetailDialog] = useState<Deliverable | null>(null)
  const [filterType, setFilterType] = useState<DeliverableType | 'all'>('all')
  const [filterStatus, setFilterStatus] = useState<DeliverableStatus | 'all'>('all')

  // 创建表单状态
  const [newDeliverable, setNewDeliverable] = useState({
    name: '',
    description: '',
    type: 'document' as DeliverableType,
    content: '',
    priority: 'medium' as 'high' | 'medium' | 'low',
  })
  const [creating, setCreating] = useState(false)

  // 获取交付物列表
  useEffect(() => {
    fetchDeliverables()
  }, [projectId, filterType, filterStatus])

  const fetchDeliverables = async () => {
    try {
      setLoading(true)
      const params = new URLSearchParams({ projectId })
      if (filterType !== 'all') params.append('type', filterType)
      if (filterStatus !== 'all') params.append('status', filterStatus)

      const res = await fetch(`/api/deliverables?${params}`)
      if (res.ok) {
        const data = await res.json()
        setDeliverables(data.deliverables || [])
      }
    } catch (error) {
      console.error('Failed to fetch deliverables:', error)
    } finally {
      setLoading(false)
    }
  }

  // 创建交付物
  const handleCreate = async () => {
    if (!newDeliverable.name.trim()) {
      toast.error('请输入交付物名称')
      return
    }

    setCreating(true)
    try {
      const res = await fetch('/api/deliverables', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          projectId,
          ...newDeliverable,
        }),
      })

      if (res.ok) {
        toast.success('交付物已创建')
        setShowCreateDialog(false)
        setNewDeliverable({
          name: '',
          description: '',
          type: 'document',
          content: '',
          priority: 'medium',
        })
        fetchDeliverables()
      } else {
        toast.error('创建失败')
      }
    } catch {
      toast.error('创建失败')
    } finally {
      setCreating(false)
    }
  }

  // 更新状态
  const handleUpdateStatus = async (id: string, status: DeliverableStatus) => {
    try {
      const res = await fetch('/api/deliverables', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id,
          action: 'update_status',
          status,
          reviewedBy: 'user',
        }),
      })

      if (res.ok) {
        toast.success('状态已更新')
        fetchDeliverables()
      }
    } catch {
      toast.error('更新失败')
    }
  }

  // 删除
  const handleDelete = async (id: string) => {
    if (!confirm('确定删除这个交付物吗？')) return

    try {
      const res = await fetch(`/api/deliverables?id=${id}`, {
        method: 'DELETE',
      })

      if (res.ok) {
        toast.success('已删除')
        fetchDeliverables()
      }
    } catch {
      toast.error('删除失败')
    }
  }

  const filteredDeliverables = deliverables

  return (
    <div className={className}>
      {/* 头部 */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <FileText className="h-5 w-5 text-primary" />
          <h3 className="font-semibold">交付物管理</h3>
          <Badge variant="secondary">{deliverables.length}</Badge>
        </div>
        <Button onClick={() => setShowCreateDialog(true)}>
          <Plus className="h-4 w-4 mr-2" />
          新增交付物
        </Button>
      </div>

      {/* 筛选 */}
      <div className="flex gap-2 mb-4">
        <Select value={filterType} onValueChange={(v) => setFilterType(v as DeliverableType | 'all')}>
          <SelectTrigger className="w-32">
            <SelectValue placeholder="类型" />
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

        <Select value={filterStatus} onValueChange={(v) => setFilterStatus(v as DeliverableStatus | 'all')}>
          <SelectTrigger className="w-32">
            <SelectValue placeholder="状态" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">全部状态</SelectItem>
            {Object.entries(STATUS_CONFIG).map(([key, config]) => (
              <SelectItem key={key} value={key}>
                {config.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* 列表 */}
      {loading ? (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </div>
      ) : filteredDeliverables.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center">
            <FileText className="h-12 w-12 mx-auto mb-4 text-muted-foreground/50" />
            <p className="text-muted-foreground mb-2">暂无交付物</p>
            <p className="text-sm text-muted-foreground">
              创建文档、设计稿、代码等项目交付物
            </p>
            <Button className="mt-4" onClick={() => setShowCreateDialog(true)}>
              <Plus className="h-4 w-4 mr-2" />
              创建第一个交付物
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {filteredDeliverables.map((deliverable) => {
            const typeConfig = TYPE_CONFIG[deliverable.type]
            const statusConfig = STATUS_CONFIG[deliverable.status]
            const creator = deliverable.createdBy === 'user'
              ? { name: '你', avatar: '👤' }
              : EXECUTIVES[deliverable.createdBy]

            return (
              <Card key={deliverable.id} className="hover:border-primary/50 transition-colors">
                <CardContent className="p-4">
                  <div className="flex items-start justify-between">
                    <div className="flex items-start gap-3">
                      <div className={`p-2 rounded-lg ${typeConfig.color}/10`}>
                        <span className={typeConfig.color.replace('bg-', 'text-')}>
                          {typeConfig.icon}
                        </span>
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <h4 className="font-medium">{deliverable.name}</h4>
                          <Badge variant={statusConfig.variant} className="gap-1">
                            {statusConfig.icon}
                            {statusConfig.label}
                          </Badge>
                          {deliverable.priority === 'high' && (
                            <Badge variant="destructive">高优</Badge>
                          )}
                        </div>
                        {deliverable.description && (
                          <p className="text-sm text-muted-foreground mt-1 line-clamp-2">
                            {deliverable.description}
                          </p>
                        )}
                        <div className="flex items-center gap-4 mt-2 text-xs text-muted-foreground">
                          <span className="flex items-center gap-1">
                            {typeConfig.icon}
                            {typeConfig.label}
                          </span>
                          <span className="flex items-center gap-1">
                            <History className="h-3 w-3" />
                            v{deliverable.currentVersion} ({deliverable.versionsCount}个版本)
                          </span>
                          <span>
                            创建者: {creator?.name || '未知'}
                          </span>
                        </div>
                      </div>
                    </div>

                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon">
                          <MoreVertical className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem onClick={() => setShowDetailDialog(deliverable)}>
                          <Eye className="h-4 w-4 mr-2" />
                          查看详情
                        </DropdownMenuItem>
                        {deliverable.fileUrl && (
                          <DropdownMenuItem asChild>
                            <a href={deliverable.fileUrl} target="_blank" rel="noopener noreferrer">
                              <Download className="h-4 w-4 mr-2" />
                              下载文件
                            </a>
                          </DropdownMenuItem>
                        )}
                        {deliverable.status === 'draft' && (
                          <DropdownMenuItem onClick={() => handleUpdateStatus(deliverable.id, 'pending_review')}>
                            <Send className="h-4 w-4 mr-2" />
                            提交审核
                          </DropdownMenuItem>
                        )}
                        {deliverable.status === 'pending_review' && (
                          <>
                            <DropdownMenuItem onClick={() => handleUpdateStatus(deliverable.id, 'approved')}>
                              <CheckCircle2 className="h-4 w-4 mr-2" />
                              批准
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={() => handleUpdateStatus(deliverable.id, 'revision')}>
                              <AlertTriangle className="h-4 w-4 mr-2" />
                              需要修改
                            </DropdownMenuItem>
                          </>
                        )}
                        {deliverable.status === 'approved' && (
                          <DropdownMenuItem onClick={() => handleUpdateStatus(deliverable.id, 'delivered')}>
                            <CheckCircle2 className="h-4 w-4 mr-2" />
                            标记为已交付
                          </DropdownMenuItem>
                        )}
                        <DropdownMenuItem
                          onClick={() => handleDelete(deliverable.id)}
                          className="text-destructive"
                        >
                          <Trash2 className="h-4 w-4 mr-2" />
                          删除
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>
                </CardContent>
              </Card>
            )
          })}
        </div>
      )}

      {/* 创建对话框 */}
      <Dialog open={showCreateDialog} onOpenChange={setShowCreateDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>新增交付物</DialogTitle>
            <DialogDescription>
              创建项目交付物，如文档、设计稿、代码等
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>名称 *</Label>
              <Input
                placeholder="例如：产品需求文档PRD"
                value={newDeliverable.name}
                onChange={(e) => setNewDeliverable({ ...newDeliverable, name: e.target.value })}
              />
            </div>

            <div className="space-y-2">
              <Label>类型 *</Label>
              <Select
                value={newDeliverable.type}
                onValueChange={(v) => setNewDeliverable({ ...newDeliverable, type: v as DeliverableType })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {Object.entries(TYPE_CONFIG).map(([key, config]) => (
                    <SelectItem key={key} value={key}>
                      <span className="flex items-center gap-2">
                        {config.icon}
                        {config.label}
                      </span>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>优先级</Label>
              <Select
                value={newDeliverable.priority}
                onValueChange={(v) => setNewDeliverable({ ...newDeliverable, priority: v as 'high' | 'medium' | 'low' })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="high">高</SelectItem>
                  <SelectItem value="medium">中</SelectItem>
                  <SelectItem value="low">低</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>描述</Label>
              <Textarea
                placeholder="简要描述这个交付物..."
                value={newDeliverable.description}
                onChange={(e) => setNewDeliverable({ ...newDeliverable, description: e.target.value })}
                rows={2}
              />
            </div>

            <div className="space-y-2">
              <Label>内容</Label>
              <Textarea
                placeholder="输入交付物内容..."
                value={newDeliverable.content}
                onChange={(e) => setNewDeliverable({ ...newDeliverable, content: e.target.value })}
                rows={6}
              />
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setShowCreateDialog(false)}>
              取消
            </Button>
            <Button onClick={handleCreate} disabled={creating}>
              {creating && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              创建
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* 详情对话框 */}
      {showDetailDialog && (
        <Dialog open={!!showDetailDialog} onOpenChange={() => setShowDetailDialog(null)}>
          <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
            <DialogHeader>
              <div className="flex items-center gap-2">
                {TYPE_CONFIG[showDetailDialog.type].icon}
                <DialogTitle>{showDetailDialog.name}</DialogTitle>
                <Badge variant={STATUS_CONFIG[showDetailDialog.status].variant}>
                  {STATUS_CONFIG[showDetailDialog.status].label}
                </Badge>
              </div>
              <DialogDescription>{showDetailDialog.description}</DialogDescription>
            </DialogHeader>

            <div className="space-y-4 py-4">
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <p className="text-muted-foreground">类型</p>
                  <p className="font-medium">{TYPE_CONFIG[showDetailDialog.type].label}</p>
                </div>
                <div>
                  <p className="text-muted-foreground">版本</p>
                  <p className="font-medium">v{showDetailDialog.currentVersion}</p>
                </div>
                <div>
                  <p className="text-muted-foreground">优先级</p>
                  <p className="font-medium capitalize">{showDetailDialog.priority}</p>
                </div>
                <div>
                  <p className="text-muted-foreground">创建者</p>
                  <p className="font-medium">
                    {showDetailDialog.createdBy === 'user'
                      ? '你'
                      : EXECUTIVES[showDetailDialog.createdBy]?.nameCn}
                  </p>
                </div>
              </div>

              {showDetailDialog.content && (
                <div>
                  <p className="text-sm text-muted-foreground mb-2">内容</p>
                  <div className="p-4 bg-muted/50 rounded-lg max-h-[300px] overflow-y-auto">
                    <pre className="text-sm whitespace-pre-wrap">{showDetailDialog.content}</pre>
                  </div>
                </div>
              )}

              {showDetailDialog.reviewNotes && (
                <div>
                  <p className="text-sm text-muted-foreground mb-2">审核备注</p>
                  <p className="text-sm p-3 bg-muted/50 rounded-lg">{showDetailDialog.reviewNotes}</p>
                </div>
              )}

              {showDetailDialog.tags && showDetailDialog.tags.length > 0 && (
                <div className="flex flex-wrap gap-2">
                  {showDetailDialog.tags.map((tag, index) => (
                    <Badge key={index} variant="secondary">{tag}</Badge>
                  ))}
                </div>
              )}
            </div>
          </DialogContent>
        </Dialog>
      )}
    </div>
  )
}
