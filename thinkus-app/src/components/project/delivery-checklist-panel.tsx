'use client'

import * as React from 'react'
import { useState, useCallback, useMemo } from 'react'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Progress } from '@/components/ui/progress'
import {
  deliveryChecklist,
  DeliveryChecklist,
  ChecklistItem,
  CheckCategory,
  CheckStatus,
  CheckImportance
} from '@/lib/services/delivery-checklist'

export interface DeliveryChecklistPanelProps {
  /** 项目ID */
  projectId: string
  /** 项目名称 */
  projectName: string
  /** 检查完成回调 */
  onComplete?: (checklist: DeliveryChecklist) => void
  /** 自定义样式 */
  className?: string
}

// 状态图标
const STATUS_ICONS: Record<CheckStatus, string> = {
  pending: '⏳',
  checking: '🔄',
  passed: '✅',
  failed: '❌',
  warning: '⚠️',
  manual_required: '👤'
}

// 重要性配置
const IMPORTANCE_CONFIG: Record<CheckImportance, { label: string; color: string }> = {
  blocker: { label: '阻塞', color: 'text-red-600 bg-red-100 dark:bg-red-900/30' },
  critical: { label: '关键', color: 'text-orange-600 bg-orange-100 dark:bg-orange-900/30' },
  important: { label: '重要', color: 'text-yellow-600 bg-yellow-100 dark:bg-yellow-900/30' },
  optional: { label: '可选', color: 'text-gray-600 bg-gray-100 dark:bg-gray-800' }
}

type PanelState = 'idle' | 'running' | 'completed'

/**
 * 交付自检清单面板
 */
export function DeliveryChecklistPanel({
  projectId,
  projectName,
  onComplete,
  className
}: DeliveryChecklistPanelProps) {
  const [state, setState] = useState<PanelState>('idle')
  const [checklist, setChecklist] = useState<DeliveryChecklist | null>(null)
  const [progress, setProgress] = useState(0)
  const [currentItem, setCurrentItem] = useState<string>('')
  const [expandedCategory, setExpandedCategory] = useState<CheckCategory | null>(null)

  const categoryConfig = useMemo(() => deliveryChecklist.getCategoryConfig(), [])

  // 开始检查
  const startCheck = useCallback(async () => {
    setState('running')
    setProgress(0)

    // 创建清单
    const newChecklist = deliveryChecklist.createChecklist(projectId, projectName)
    setChecklist(newChecklist)

    // 执行自动检查
    const updatedChecklist = await deliveryChecklist.runAutomaticChecks(
      newChecklist,
      (item, prog) => {
        setCurrentItem(item.name)
        setProgress(prog)
        setChecklist(prev => prev ? { ...prev, items: [...prev.items] } : null)
      }
    )

    setChecklist(updatedChecklist)
    setState('completed')
    onComplete?.(updatedChecklist)
  }, [projectId, projectName, onComplete])

  // 手动确认
  const handleManualConfirm = useCallback((itemId: string, passed: boolean) => {
    if (!checklist) return

    const updated = deliveryChecklist.confirmItem(checklist, itemId, passed)
    setChecklist(updated)
  }, [checklist])

  // 重新检查
  const rerunCheck = useCallback(() => {
    setChecklist(null)
    startCheck()
  }, [startCheck])

  // 按类别分组
  const groupedItems = useMemo(() => {
    if (!checklist) return new Map()
    return deliveryChecklist.groupByCategory(checklist.items)
  }, [checklist])

  // 排序后的类别
  const sortedCategories = useMemo(() => {
    return Array.from(groupedItems.keys())
      .sort((a, b) => categoryConfig[a].order - categoryConfig[b].order)
  }, [groupedItems, categoryConfig])

  return (
    <Card className={cn('overflow-hidden', className)}>
      <CardHeader className={cn(
        'border-b',
        state === 'completed' && checklist?.overallStatus === 'ready' && 'bg-green-50 dark:bg-green-950/20',
        state === 'completed' && checklist?.overallStatus === 'not_ready' && 'bg-red-50 dark:bg-red-950/20',
        state === 'completed' && checklist?.overallStatus === 'ready_with_warnings' && 'bg-yellow-50 dark:bg-yellow-950/20'
      )}>
        <CardTitle className="flex items-center gap-2">
          {state === 'idle' && (
            <>
              <span className="text-2xl">📋</span>
              交付前自检清单
            </>
          )}
          {state === 'running' && (
            <>
              <span className="text-2xl animate-spin">🔍</span>
              正在检查...
            </>
          )}
          {state === 'completed' && checklist?.overallStatus === 'ready' && (
            <>
              <span className="text-2xl">✅</span>
              检查通过，可以交付
            </>
          )}
          {state === 'completed' && checklist?.overallStatus === 'ready_with_warnings' && (
            <>
              <span className="text-2xl">⚠️</span>
              可交付，但有警告
            </>
          )}
          {state === 'completed' && checklist?.overallStatus === 'not_ready' && (
            <>
              <span className="text-2xl">❌</span>
              未就绪，需要修复
            </>
          )}
        </CardTitle>
        <CardDescription>
          {state === 'idle' && '在交付前检查所有必要条件是否满足'}
          {state === 'running' && `正在检查: ${currentItem}`}
          {state === 'completed' && checklist && `就绪度: ${checklist.readinessScore.toFixed(1)}%`}
        </CardDescription>
      </CardHeader>

      <CardContent className="p-6">
        {/* 待开始状态 */}
        {state === 'idle' && (
          <div className="text-center py-8">
            <div className="text-6xl mb-4">📋</div>
            <h3 className="text-xl font-semibold mb-2">开始交付前检查</h3>
            <p className="text-muted-foreground mb-6">
              系统将自动检查部署、安全、数据等多项内容
            </p>
            <Button size="lg" onClick={startCheck}>
              🔍 开始检查
            </Button>
          </div>
        )}

        {/* 运行中状态 */}
        {state === 'running' && (
          <div className="py-8">
            <Progress value={progress} className="h-3 mb-4" />
            <p className="text-center text-muted-foreground">
              正在检查: {currentItem}
            </p>
          </div>
        )}

        {/* 完成状态 */}
        {state === 'completed' && checklist && (
          <div className="space-y-6">
            {/* 就绪度进度条 */}
            <div>
              <div className="flex justify-between mb-2">
                <span className="text-sm font-medium">就绪度</span>
                <span className="text-sm text-muted-foreground">
                  {checklist.readinessScore.toFixed(1)}%
                </span>
              </div>
              <Progress
                value={checklist.readinessScore}
                className={cn(
                  'h-3',
                  checklist.readinessScore >= 90 && '[&>div]:bg-green-500',
                  checklist.readinessScore >= 70 && checklist.readinessScore < 90 && '[&>div]:bg-yellow-500',
                  checklist.readinessScore < 70 && '[&>div]:bg-red-500'
                )}
              />
            </div>

            {/* 阻塞问题 */}
            {checklist.blockers.length > 0 && (
              <div className="bg-red-50 dark:bg-red-950/20 border border-red-200 dark:border-red-800 rounded-lg p-4">
                <h4 className="font-medium text-red-700 dark:text-red-300 flex items-center gap-2 mb-3">
                  <span>🚫</span>
                  阻塞问题 ({checklist.blockers.length})
                </h4>
                <ul className="space-y-1 text-sm text-red-600 dark:text-red-400">
                  {checklist.blockers.map((blocker, i) => (
                    <li key={i}>• {blocker}</li>
                  ))}
                </ul>
              </div>
            )}

            {/* 警告 */}
            {checklist.warnings.length > 0 && (
              <div className="bg-yellow-50 dark:bg-yellow-950/20 border border-yellow-200 dark:border-yellow-800 rounded-lg p-4">
                <h4 className="font-medium text-yellow-700 dark:text-yellow-300 flex items-center gap-2 mb-3">
                  <span>⚠️</span>
                  警告 ({checklist.warnings.length})
                </h4>
                <ul className="space-y-1 text-sm text-yellow-600 dark:text-yellow-400">
                  {checklist.warnings.map((warning, i) => (
                    <li key={i}>• {warning}</li>
                  ))}
                </ul>
              </div>
            )}

            {/* 分类检查项 */}
            <div className="space-y-2">
              {sortedCategories.map(category => {
                const items = groupedItems.get(category)!
                const config = categoryConfig[category]
                const passedCount = items.filter(i => i.status === 'passed').length
                const isExpanded = expandedCategory === category

                return (
                  <div key={category} className="border rounded-lg overflow-hidden">
                    <button
                      onClick={() => setExpandedCategory(isExpanded ? null : category)}
                      className="w-full flex items-center justify-between p-4 hover:bg-gray-50 dark:hover:bg-gray-800/50"
                    >
                      <div className="flex items-center gap-3">
                        <span className="text-xl">{config.icon}</span>
                        <span className="font-medium">{config.label}</span>
                      </div>
                      <div className="flex items-center gap-3">
                        <span className={cn(
                          'text-sm',
                          passedCount === items.length && 'text-green-600',
                          passedCount < items.length && 'text-orange-600'
                        )}>
                          {passedCount}/{items.length}
                        </span>
                        <span className="text-muted-foreground">
                          {isExpanded ? '▲' : '▼'}
                        </span>
                      </div>
                    </button>

                    {isExpanded && (
                      <div className="border-t p-4 bg-gray-50 dark:bg-gray-800/30 space-y-2">
                        {items.map(item => (
                          <ChecklistItemRow
                            key={item.id}
                            item={item}
                            onManualConfirm={handleManualConfirm}
                          />
                        ))}
                      </div>
                    )}
                  </div>
                )
              })}
            </div>

            {/* 操作按钮 */}
            <div className="flex gap-3 justify-end">
              <Button variant="outline" onClick={rerunCheck}>
                🔄 重新检查
              </Button>
              {checklist.overallStatus !== 'not_ready' && (
                <Button>
                  ✅ 确认交付
                </Button>
              )}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  )
}

/**
 * 检查项行组件
 */
function ChecklistItemRow({
  item,
  onManualConfirm
}: {
  item: ChecklistItem
  onManualConfirm: (id: string, passed: boolean) => void
}) {
  const importanceConfig = IMPORTANCE_CONFIG[item.importance]
  const needsManualConfirm = !item.isAutomatic && item.status === 'pending'

  return (
    <div className={cn(
      'flex items-start justify-between p-3 rounded-lg',
      item.status === 'passed' && 'bg-green-50 dark:bg-green-950/20',
      item.status === 'failed' && 'bg-red-50 dark:bg-red-950/20',
      item.status === 'warning' && 'bg-yellow-50 dark:bg-yellow-950/20',
      (item.status === 'pending' || item.status === 'manual_required') && 'bg-white dark:bg-gray-900'
    )}>
      <div className="flex items-start gap-3">
        <span className="text-lg mt-0.5">{STATUS_ICONS[item.status]}</span>
        <div>
          <div className="font-medium flex items-center gap-2">
            {item.name}
            <span className={cn('text-xs px-1.5 py-0.5 rounded', importanceConfig.color)}>
              {importanceConfig.label}
            </span>
          </div>
          <div className="text-sm text-muted-foreground">{item.description}</div>
          {item.result && (
            <div className={cn(
              'text-sm mt-1',
              item.status === 'failed' && 'text-red-600 dark:text-red-400',
              item.status === 'passed' && 'text-green-600 dark:text-green-400'
            )}>
              {item.result}
            </div>
          )}
          {item.suggestion && (
            <div className="text-sm text-blue-600 dark:text-blue-400 mt-1">
              💡 {item.suggestion}
            </div>
          )}
        </div>
      </div>

      {needsManualConfirm && (
        <div className="flex gap-2 ml-4">
          <Button
            size="sm"
            variant="outline"
            onClick={() => onManualConfirm(item.id, false)}
          >
            ❌
          </Button>
          <Button
            size="sm"
            onClick={() => onManualConfirm(item.id, true)}
          >
            ✅
          </Button>
        </div>
      )}
    </div>
  )
}

/**
 * 交付就绪徽章
 */
export function DeliveryReadinessBadge({
  status,
  score,
  onClick,
  className
}: {
  status: 'ready' | 'ready_with_warnings' | 'not_ready' | 'pending'
  score?: number
  onClick?: () => void
  className?: string
}) {
  const config = {
    ready: { icon: '✅', label: '可交付', color: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300' },
    ready_with_warnings: { icon: '⚠️', label: '有警告', color: 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-300' },
    not_ready: { icon: '❌', label: '未就绪', color: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-300' },
    pending: { icon: '📋', label: '待检查', color: 'bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300' }
  }

  const cfg = config[status]

  return (
    <button
      onClick={onClick}
      className={cn(
        'inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm font-medium transition-colors hover:opacity-80',
        cfg.color,
        className
      )}
    >
      <span>{cfg.icon}</span>
      <span>{cfg.label}</span>
      {score !== undefined && (
        <span className="opacity-75">({score.toFixed(0)}%)</span>
      )}
    </button>
  )
}
