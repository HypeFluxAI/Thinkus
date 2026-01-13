'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import { useToast } from '@/components/ui/use-toast'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'
import {
  Target,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  Loader2,
  Clock,
  ChevronRight,
  Zap,
  Shield,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import Link from 'next/link'

interface Decision {
  id: string
  title: string
  description: string
  type: string
  importance: string
  status: string
  rationale?: string
  risks?: string[]
  proposedBy: string
  project?: {
    id: string
    name: string
  }
  createdAt: string
}

interface DecisionPanelProps {
  projectId?: string
  showAll?: boolean
  limit?: number
}

const IMPORTANCE_CONFIG: Record<string, { label: string; color: string; bgColor: string }> = {
  critical: { label: '关键', color: 'text-red-600', bgColor: 'bg-red-100 dark:bg-red-900/30' },
  high: { label: '重要', color: 'text-orange-600', bgColor: 'bg-orange-100 dark:bg-orange-900/30' },
  medium: { label: '中等', color: 'text-yellow-600', bgColor: 'bg-yellow-100 dark:bg-yellow-900/30' },
  low: { label: '一般', color: 'text-green-600', bgColor: 'bg-green-100 dark:bg-green-900/30' },
}

const TYPE_CONFIG: Record<string, { label: string; icon: React.ReactNode }> = {
  feature: { label: '功能', icon: <Zap className="h-3 w-3" /> },
  technical: { label: '技术', icon: <Shield className="h-3 w-3" /> },
  design: { label: '设计', icon: <Target className="h-3 w-3" /> },
  business: { label: '商业', icon: <Target className="h-3 w-3" /> },
  priority: { label: '优先级', icon: <Target className="h-3 w-3" /> },
  resource: { label: '资源', icon: <Target className="h-3 w-3" /> },
  other: { label: '其他', icon: <Target className="h-3 w-3" /> },
}

export function DecisionPanel({ projectId, showAll = false, limit = 10 }: DecisionPanelProps) {
  const { toast } = useToast()
  const [decisions, setDecisions] = useState<Decision[]>([])
  const [loading, setLoading] = useState(true)
  const [actionLoading, setActionLoading] = useState<string | null>(null)

  // 详情对话框
  const [selectedDecision, setSelectedDecision] = useState<Decision | null>(null)
  const [detailOpen, setDetailOpen] = useState(false)

  // 拒绝对话框
  const [rejectDialogOpen, setRejectDialogOpen] = useState(false)
  const [rejectReason, setRejectReason] = useState('')

  // 加载待确认决策
  const loadDecisions = async () => {
    try {
      setLoading(true)
      const url = projectId
        ? `/api/decisions?projectId=${projectId}&status=proposed&limit=${limit}`
        : `/api/decisions?status=proposed&limit=${limit}`
      const response = await fetch(url)
      const data = await response.json()
      setDecisions(data.decisions || [])
    } catch (error) {
      console.error('Failed to load decisions:', error)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadDecisions()
  }, [projectId])

  // 批准决策
  const handleApprove = async (decisionId: string) => {
    try {
      setActionLoading(decisionId)
      const response = await fetch(`/api/decisions/${decisionId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: 'approved' }),
      })

      if (response.ok) {
        toast({
          title: '决策已批准',
          description: '该决策已标记为已批准',
        })
        setDecisions((prev) => prev.filter((d) => d.id !== decisionId))
        setDetailOpen(false)
      } else {
        throw new Error('Failed to approve')
      }
    } catch (error) {
      console.error('Failed to approve decision:', error)
      toast({
        title: '操作失败',
        variant: 'destructive',
      })
    } finally {
      setActionLoading(null)
    }
  }

  // 拒绝决策
  const handleReject = async () => {
    if (!selectedDecision) return

    try {
      setActionLoading(selectedDecision.id)
      const response = await fetch(`/api/decisions/${selectedDecision.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          status: 'rejected',
          metadata: { rejectionReason: rejectReason },
        }),
      })

      if (response.ok) {
        toast({
          title: '决策已拒绝',
          description: rejectReason ? `原因：${rejectReason}` : '该决策已被拒绝',
        })
        setDecisions((prev) => prev.filter((d) => d.id !== selectedDecision.id))
        setRejectDialogOpen(false)
        setDetailOpen(false)
        setRejectReason('')
      } else {
        throw new Error('Failed to reject')
      }
    } catch (error) {
      console.error('Failed to reject decision:', error)
      toast({
        title: '操作失败',
        variant: 'destructive',
      })
    } finally {
      setActionLoading(null)
    }
  }

  // 格式化时间
  const formatTime = (dateStr: string) => {
    const date = new Date(dateStr)
    const now = new Date()
    const diffMs = now.getTime() - date.getTime()
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24))

    if (diffDays === 0) return '今天'
    if (diffDays === 1) return '昨天'
    if (diffDays < 7) return `${diffDays}天前`
    return date.toLocaleDateString('zh-CN')
  }

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <Skeleton className="h-6 w-32" />
          <Skeleton className="h-4 w-48" />
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {[1, 2, 3].map((i) => (
              <Skeleton key={i} className="h-20" />
            ))}
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <>
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="text-base flex items-center gap-2">
                <Target className="h-5 w-5 text-primary" />
                待确认决策
              </CardTitle>
              <CardDescription>
                {decisions.length > 0
                  ? `${decisions.length} 个决策等待您的确认`
                  : '暂无待确认的决策'}
              </CardDescription>
            </div>
            {showAll && decisions.length > 0 && (
              <Link href={projectId ? `/projects/${projectId}/decisions` : '/decisions'}>
                <Button variant="outline" size="sm">
                  查看全部
                  <ChevronRight className="h-4 w-4 ml-1" />
                </Button>
              </Link>
            )}
          </div>
        </CardHeader>
        <CardContent>
          {decisions.length === 0 ? (
            <div className="text-center py-8">
              <CheckCircle2 className="h-12 w-12 mx-auto text-green-500 mb-4" />
              <p className="text-muted-foreground">所有决策都已处理完毕</p>
            </div>
          ) : (
            <div className="space-y-3">
              {decisions.map((decision) => {
                const importance = IMPORTANCE_CONFIG[decision.importance] || IMPORTANCE_CONFIG.medium
                const type = TYPE_CONFIG[decision.type] || TYPE_CONFIG.other

                return (
                  <div
                    key={decision.id}
                    className={cn(
                      'p-4 rounded-lg border cursor-pointer hover:shadow-md transition-shadow',
                      decision.importance === 'critical' && 'border-red-200 dark:border-red-900'
                    )}
                    onClick={() => {
                      setSelectedDecision(decision)
                      setDetailOpen(true)
                    }}
                  >
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <span className="font-medium truncate">{decision.title}</span>
                          <Badge className={cn('text-xs', importance.bgColor, importance.color)}>
                            {importance.label}
                          </Badge>
                          <Badge variant="outline" className="text-xs">
                            {type.icon}
                            <span className="ml-1">{type.label}</span>
                          </Badge>
                        </div>
                        <p className="text-sm text-muted-foreground line-clamp-2 mb-2">
                          {decision.description}
                        </p>
                        <div className="flex items-center gap-4 text-xs text-muted-foreground">
                          <span className="flex items-center gap-1">
                            <Clock className="h-3 w-3" />
                            {formatTime(decision.createdAt)}
                          </span>
                          {decision.project && (
                            <span>项目: {decision.project.name}</span>
                          )}
                          {decision.risks && decision.risks.length > 0 && (
                            <span className="flex items-center gap-1 text-yellow-600">
                              <AlertTriangle className="h-3 w-3" />
                              {decision.risks.length} 个风险
                            </span>
                          )}
                        </div>
                      </div>
                      <div className="flex gap-2 shrink-0">
                        <Button
                          size="sm"
                          variant="outline"
                          className="text-red-600 hover:text-red-700 hover:bg-red-50"
                          onClick={(e) => {
                            e.stopPropagation()
                            setSelectedDecision(decision)
                            setRejectDialogOpen(true)
                          }}
                          disabled={actionLoading === decision.id}
                        >
                          <XCircle className="h-4 w-4" />
                        </Button>
                        <Button
                          size="sm"
                          onClick={(e) => {
                            e.stopPropagation()
                            handleApprove(decision.id)
                          }}
                          disabled={actionLoading === decision.id}
                        >
                          {actionLoading === decision.id ? (
                            <Loader2 className="h-4 w-4 animate-spin" />
                          ) : (
                            <CheckCircle2 className="h-4 w-4" />
                          )}
                        </Button>
                      </div>
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </CardContent>
      </Card>

      {/* 决策详情对话框 */}
      <Dialog open={detailOpen} onOpenChange={setDetailOpen}>
        <DialogContent className="max-w-lg">
          {selectedDecision && (
            <>
              <DialogHeader>
                <DialogTitle>{selectedDecision.title}</DialogTitle>
                <DialogDescription>
                  {TYPE_CONFIG[selectedDecision.type]?.label || '其他'} 决策 ·{' '}
                  {IMPORTANCE_CONFIG[selectedDecision.importance]?.label || '中等'} 优先级
                </DialogDescription>
              </DialogHeader>

              <div className="space-y-4">
                <div>
                  <Label className="text-sm text-muted-foreground">描述</Label>
                  <p className="text-sm mt-1">{selectedDecision.description}</p>
                </div>

                {selectedDecision.rationale && (
                  <div>
                    <Label className="text-sm text-muted-foreground">决策依据</Label>
                    <p className="text-sm mt-1">{selectedDecision.rationale}</p>
                  </div>
                )}

                {selectedDecision.risks && selectedDecision.risks.length > 0 && (
                  <div>
                    <Label className="text-sm text-muted-foreground flex items-center gap-1">
                      <AlertTriangle className="h-3 w-3 text-yellow-500" />
                      潜在风险
                    </Label>
                    <ul className="text-sm mt-1 space-y-1">
                      {selectedDecision.risks.map((risk, i) => (
                        <li key={i} className="flex items-start gap-2">
                          <span className="text-yellow-500">•</span>
                          {risk}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}

                <div className="text-xs text-muted-foreground">
                  提议者: {selectedDecision.proposedBy} · {formatTime(selectedDecision.createdAt)}
                </div>
              </div>

              <DialogFooter>
                <Button
                  variant="outline"
                  onClick={() => {
                    setRejectDialogOpen(true)
                  }}
                  disabled={actionLoading === selectedDecision.id}
                >
                  <XCircle className="h-4 w-4 mr-2" />
                  拒绝
                </Button>
                <Button
                  onClick={() => handleApprove(selectedDecision.id)}
                  disabled={actionLoading === selectedDecision.id}
                >
                  {actionLoading === selectedDecision.id ? (
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  ) : (
                    <CheckCircle2 className="h-4 w-4 mr-2" />
                  )}
                  批准
                </Button>
              </DialogFooter>
            </>
          )}
        </DialogContent>
      </Dialog>

      {/* 拒绝原因对话框 */}
      <Dialog open={rejectDialogOpen} onOpenChange={setRejectDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>拒绝决策</DialogTitle>
            <DialogDescription>
              请提供拒绝原因（可选）
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <Textarea
              placeholder="请输入拒绝原因..."
              value={rejectReason}
              onChange={(e) => setRejectReason(e.target.value)}
              rows={4}
            />
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setRejectDialogOpen(false)}>
              取消
            </Button>
            <Button
              variant="destructive"
              onClick={handleReject}
              disabled={actionLoading === selectedDecision?.id}
            >
              {actionLoading === selectedDecision?.id ? (
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              ) : (
                <XCircle className="h-4 w-4 mr-2" />
              )}
              确认拒绝
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  )
}
