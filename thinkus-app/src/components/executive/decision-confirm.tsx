'use client'

import { useState } from 'react'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'
import {
  AlertTriangle,
  Shield,
  CheckCircle2,
  XCircle,
  Clock,
  FileText,
} from 'lucide-react'
import { EXECUTIVES, type AgentId } from '@/lib/config/executives'
import {
  DECISION_LEVEL_DESCRIPTIONS,
  type DecisionLevel,
  type RiskFactor,
} from '@/lib/config/ai-executives'

interface DecisionConfirmDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  decision: {
    id: string
    title: string
    description: string
    level: DecisionLevel
    proposedBy: AgentId
    proposedAction: string
    riskFactors?: RiskFactor[]
    projectName?: string
    expiresAt?: Date
  }
  onApprove: (decisionId: string, notes?: string) => void
  onReject: (decisionId: string, reason?: string) => void
  onDefer?: (decisionId: string) => void
}

export function DecisionConfirmDialog({
  open,
  onOpenChange,
  decision,
  onApprove,
  onReject,
  onDefer,
}: DecisionConfirmDialogProps) {
  const [notes, setNotes] = useState('')
  const [isProcessing, setIsProcessing] = useState(false)

  const exec = EXECUTIVES[decision.proposedBy]
  const levelConfig = DECISION_LEVEL_DESCRIPTIONS[decision.level]

  const getLevelIcon = () => {
    switch (decision.level) {
      case 'L0_AUTO':
        return <CheckCircle2 className="h-5 w-5 text-green-500" />
      case 'L1_NOTIFY':
        return <Clock className="h-5 w-5 text-blue-500" />
      case 'L2_CONFIRM':
        return <Shield className="h-5 w-5 text-yellow-500" />
      case 'L3_CRITICAL':
        return <AlertTriangle className="h-5 w-5 text-red-500" />
      default:
        return <FileText className="h-5 w-5" />
    }
  }

  const getLevelBadgeVariant = () => {
    switch (decision.level) {
      case 'L0_AUTO': return 'secondary'
      case 'L1_NOTIFY': return 'outline'
      case 'L2_CONFIRM': return 'default'
      case 'L3_CRITICAL': return 'destructive'
      default: return 'secondary'
    }
  }

  const handleApprove = async () => {
    setIsProcessing(true)
    try {
      await onApprove(decision.id, notes)
      onOpenChange(false)
    } finally {
      setIsProcessing(false)
    }
  }

  const handleReject = async () => {
    setIsProcessing(true)
    try {
      await onReject(decision.id, notes)
      onOpenChange(false)
    } finally {
      setIsProcessing(false)
    }
  }

  const handleDefer = async () => {
    if (!onDefer) return
    setIsProcessing(true)
    try {
      await onDefer(decision.id)
      onOpenChange(false)
    } finally {
      setIsProcessing(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <div className="flex items-center gap-3">
            {getLevelIcon()}
            <div>
              <DialogTitle>{decision.title}</DialogTitle>
              <DialogDescription>
                <Badge variant={getLevelBadgeVariant()} className="mt-1">
                  {levelConfig?.name || decision.level}
                </Badge>
                {decision.projectName && (
                  <span className="ml-2 text-muted-foreground">
                    项目: {decision.projectName}
                  </span>
                )}
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        <div className="space-y-4">
          {/* Proposer */}
          <div className="flex items-center gap-2 p-3 bg-muted/50 rounded-lg">
            <Avatar className="h-8 w-8">
              <AvatarFallback
                style={{ backgroundColor: exec?.color }}
                className="text-white text-sm"
              >
                {exec?.avatar}
              </AvatarFallback>
            </Avatar>
            <div>
              <p className="text-sm font-medium">{exec?.nameCn} 提议</p>
              <p className="text-xs text-muted-foreground">{exec?.titleCn}</p>
            </div>
          </div>

          {/* Description */}
          <div>
            <Label className="text-sm font-medium">决策说明</Label>
            <p className="text-sm text-muted-foreground mt-1">{decision.description}</p>
          </div>

          {/* Proposed Action */}
          <div>
            <Label className="text-sm font-medium">提议操作</Label>
            <p className="text-sm text-muted-foreground mt-1 p-3 bg-muted/50 rounded-lg">
              {decision.proposedAction}
            </p>
          </div>

          {/* Risk Factors */}
          {decision.riskFactors && decision.riskFactors.length > 0 && (
            <div>
              <Label className="text-sm font-medium">风险评估</Label>
              <div className="mt-2 space-y-2">
                {decision.riskFactors.map((factor, index) => (
                  <div key={index} className="flex items-center justify-between text-sm">
                    <span className="text-muted-foreground">{factor.name}</span>
                    <div className="flex items-center gap-2">
                      <div className="w-24 h-2 bg-muted rounded-full overflow-hidden">
                        <div
                          className={`h-full ${
                            factor.score >= 15
                              ? 'bg-red-500'
                              : factor.score >= 10
                              ? 'bg-yellow-500'
                              : 'bg-green-500'
                          }`}
                          style={{ width: `${(factor.score / 20) * 100}%` }}
                        />
                      </div>
                      <span className="w-8 text-right">{factor.score}/20</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Expiration */}
          {decision.expiresAt && (
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Clock className="h-4 w-4" />
              <span>
                请在 {new Date(decision.expiresAt).toLocaleString('zh-CN')} 前确认
              </span>
            </div>
          )}

          {/* Notes */}
          <div>
            <Label htmlFor="notes" className="text-sm font-medium">
              备注 (可选)
            </Label>
            <Textarea
              id="notes"
              placeholder="添加您的备注或反馈..."
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              className="mt-1"
              rows={3}
            />
          </div>
        </div>

        <DialogFooter className="flex-col sm:flex-row gap-2">
          {onDefer && (
            <Button
              variant="outline"
              onClick={handleDefer}
              disabled={isProcessing}
              className="sm:mr-auto"
            >
              <Clock className="h-4 w-4 mr-2" />
              稍后决定
            </Button>
          )}
          <Button
            variant="outline"
            onClick={handleReject}
            disabled={isProcessing}
          >
            <XCircle className="h-4 w-4 mr-2" />
            拒绝
          </Button>
          <Button onClick={handleApprove} disabled={isProcessing}>
            <CheckCircle2 className="h-4 w-4 mr-2" />
            批准
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
