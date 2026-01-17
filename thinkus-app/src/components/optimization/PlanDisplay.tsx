'use client'

import { useState } from 'react'
import { cn } from '@/lib/utils'
import type { DevelopmentPlan, PlanStep, PlanStepStatus } from '@/lib/services'

interface PlanDisplayProps {
  plan: DevelopmentPlan
  progress?: {
    currentStepIndex: number
    completedSteps: number
    totalSteps: number
    progressPercentage: number
  }
  onApprove?: () => void
  onReject?: (reason?: string) => void
  onModify?: (stepId: string, changes: Partial<PlanStep>) => void
  className?: string
}

const statusConfig: Record<PlanStepStatus, {
  icon: string
  color: string
  bg: string
}> = {
  pending: {
    icon: '⬜',
    color: 'text-gray-500',
    bg: 'bg-gray-100 dark:bg-gray-800'
  },
  in_progress: {
    icon: '🔄',
    color: 'text-blue-600',
    bg: 'bg-blue-100 dark:bg-blue-900/30'
  },
  completed: {
    icon: '✅',
    color: 'text-green-600',
    bg: 'bg-green-100 dark:bg-green-900/30'
  },
  skipped: {
    icon: '⏭️',
    color: 'text-gray-400',
    bg: 'bg-gray-100 dark:bg-gray-800'
  },
  failed: {
    icon: '❌',
    color: 'text-red-600',
    bg: 'bg-red-100 dark:bg-red-900/30'
  }
}

export function PlanDisplay({
  plan,
  progress,
  onApprove,
  onReject,
  onModify,
  className
}: PlanDisplayProps) {
  const [editingStepId, setEditingStepId] = useState<string | null>(null)
  const [rejectReason, setRejectReason] = useState('')
  const [showRejectInput, setShowRejectInput] = useState(false)

  const isPending = plan.approvalStatus === 'pending'
  const progressPercentage = progress?.progressPercentage || 0

  return (
    <div className={cn('rounded-lg border bg-card overflow-hidden', className)}>
      {/* Header */}
      <div className="p-4 border-b bg-gradient-to-r from-blue-50 to-purple-50 dark:from-blue-900/20 dark:to-purple-900/20">
        <div className="flex items-start justify-between gap-4">
          <div>
            <h3 className="font-medium flex items-center gap-2">
              <span>📋</span>
              <span>{plan.title}</span>
            </h3>
            <p className="text-sm text-muted-foreground mt-1">
              {plan.overview}
            </p>
          </div>
          <div className="flex flex-col items-end gap-1">
            <span
              className={cn(
                'text-xs px-2 py-1 rounded-full',
                plan.approvalStatus === 'pending' && 'bg-amber-100 text-amber-700 dark:bg-amber-900/30',
                plan.approvalStatus === 'approved' && 'bg-green-100 text-green-700 dark:bg-green-900/30',
                plan.approvalStatus === 'rejected' && 'bg-red-100 text-red-700 dark:bg-red-900/30',
                plan.approvalStatus === 'modified' && 'bg-blue-100 text-blue-700 dark:bg-blue-900/30'
              )}
            >
              {plan.approvalStatus === 'pending' && '待审批'}
              {plan.approvalStatus === 'approved' && '已批准'}
              {plan.approvalStatus === 'rejected' && '已拒绝'}
              {plan.approvalStatus === 'modified' && '已修改'}
            </span>
          </div>
        </div>

        {/* Progress bar */}
        {progress && (
          <div className="mt-4">
            <div className="flex items-center justify-between text-xs mb-1">
              <span>执行进度</span>
              <span>{progress.completedSteps}/{progress.totalSteps} 步骤</span>
            </div>
            <div className="h-2 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
              <div
                className="h-full bg-gradient-to-r from-blue-500 to-green-500 transition-all duration-500"
                style={{ width: `${progressPercentage}%` }}
              />
            </div>
          </div>
        )}
      </div>

      {/* Steps */}
      <div className="divide-y">
        {plan.steps.map((step, index) => {
          const config = statusConfig[step.status]
          const isEditing = editingStepId === step.id
          const isCurrent = progress?.currentStepIndex === index

          return (
            <div
              key={step.id}
              className={cn(
                'p-4 transition-colors',
                isCurrent && 'bg-blue-50/50 dark:bg-blue-900/10'
              )}
            >
              <div className="flex items-start gap-3">
                {/* Step number */}
                <div
                  className={cn(
                    'flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium',
                    config.bg,
                    config.color
                  )}
                >
                  {step.status === 'pending' ? step.order : config.icon}
                </div>

                {/* Step content */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between gap-2">
                    <h4 className={cn('font-medium', step.status === 'completed' && 'line-through opacity-60')}>
                      {step.title}
                    </h4>
                    {step.estimatedDuration && (
                      <span className="text-xs text-muted-foreground">
                        ⏱️ {step.estimatedDuration}
                      </span>
                    )}
                  </div>

                  <p className="text-sm text-muted-foreground mt-1">
                    {step.description}
                  </p>

                  {/* Sub-steps */}
                  {step.subSteps && step.subSteps.length > 0 && (
                    <div className="mt-2 space-y-1 pl-4 border-l-2 border-gray-200 dark:border-gray-700">
                      {step.subSteps.map((sub) => (
                        <div key={sub.id} className="flex items-center gap-2 text-sm">
                          <span>{sub.status === 'completed' ? '✓' : '○'}</span>
                          <span className={cn(sub.status === 'completed' && 'line-through opacity-60')}>
                            {sub.title}
                          </span>
                        </div>
                      ))}
                    </div>
                  )}

                  {/* Edit button */}
                  {isPending && onModify && (
                    <button
                      onClick={() => setEditingStepId(isEditing ? null : step.id)}
                      className="text-xs text-blue-600 hover:text-blue-700 mt-2"
                    >
                      {isEditing ? '取消编辑' : '编辑'}
                    </button>
                  )}
                </div>
              </div>
            </div>
          )
        })}
      </div>

      {/* Actions */}
      {isPending && (onApprove || onReject) && (
        <div className="p-4 border-t bg-gray-50 dark:bg-gray-800/50">
          {showRejectInput ? (
            <div className="space-y-3">
              <textarea
                value={rejectReason}
                onChange={(e) => setRejectReason(e.target.value)}
                placeholder="请说明拒绝原因或修改建议..."
                className="w-full px-3 py-2 text-sm border rounded-lg resize-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                rows={3}
              />
              <div className="flex gap-2">
                <button
                  onClick={() => {
                    onReject?.(rejectReason)
                    setShowRejectInput(false)
                    setRejectReason('')
                  }}
                  className="px-4 py-2 text-sm bg-red-500 text-white rounded-lg hover:bg-red-600 transition-colors"
                >
                  确认拒绝
                </button>
                <button
                  onClick={() => {
                    setShowRejectInput(false)
                    setRejectReason('')
                  }}
                  className="px-4 py-2 text-sm border rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
                >
                  取消
                </button>
              </div>
            </div>
          ) : (
            <div className="flex gap-3">
              {onApprove && (
                <button
                  onClick={onApprove}
                  className="flex-1 px-4 py-2 text-sm bg-green-500 text-white rounded-lg hover:bg-green-600 transition-colors"
                >
                  ✓ 批准计划
                </button>
              )}
              {onReject && (
                <button
                  onClick={() => setShowRejectInput(true)}
                  className="flex-1 px-4 py-2 text-sm border rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
                >
                  ✗ 需要修改
                </button>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  )
}
