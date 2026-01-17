'use client'

import * as React from 'react'
import { useState, useEffect, useCallback } from 'react'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Progress } from '@/components/ui/progress'
import {
  deliveryStateManager,
  DeliveryState,
  DeliveryStage,
  StageStatus,
  StateChangeEvent,
  DeliveryOutputs,
} from '@/lib/services/delivery-state-manager'
import {
  deliveryReadySignal,
  ReadinessResult,
  ReadinessStatus,
  CheckStatus,
} from '@/lib/services/delivery-ready-signal'

// ============================================================================
// 类型定义
// ============================================================================

export interface UserDeliveryProgressProps {
  /** 项目ID */
  projectId: string
  /** 项目名称 */
  projectName: string
  /** 产品类型 */
  productType?: string
  /** 自定义样式 */
  className?: string
  /** 联系客服回调 */
  onContactSupport?: () => void
  /** 交付完成回调 */
  onDeliveryComplete?: (outputs: DeliveryOutputs) => void
}

// ============================================================================
// 常量配置
// ============================================================================

/** 阶段图标 */
const STAGE_ICONS: Record<DeliveryStage, string> = {
  queued: '📋',
  initializing: '⚙️',
  code_generating: '💻',
  testing: '🧪',
  gate_checking: '🔍',
  deploying: '🚀',
  verifying: '✔️',
  configuring: '🔧',
  data_initializing: '📊',
  account_creating: '👤',
  acceptance: '📝',
  signing: '✍️',
  ready: '🎯',
  delivered: '🎉',
  failed: '❌',
  recovering: '🔄',
  cancelled: '⛔',
}

/** 阶段人话名称 */
const STAGE_LABELS: Record<DeliveryStage, string> = {
  queued: '排队中',
  initializing: '准备环境',
  code_generating: '编写代码',
  testing: '测试验证',
  gate_checking: '质量检查',
  deploying: '部署上线',
  verifying: '确认部署',
  configuring: '配置服务',
  data_initializing: '初始化数据',
  account_creating: '创建账号',
  acceptance: '等待验收',
  signing: '等待签收',
  ready: '已就绪',
  delivered: '已交付',
  failed: '遇到问题',
  recovering: '正在恢复',
  cancelled: '已取消',
}

/** 状态颜色 */
const STATUS_COLORS: Record<string, { bg: string; text: string; border: string }> = {
  active: {
    bg: 'bg-blue-50 dark:bg-blue-950/20',
    text: 'text-blue-700 dark:text-blue-300',
    border: 'border-blue-200 dark:border-blue-800',
  },
  completed: {
    bg: 'bg-green-50 dark:bg-green-950/20',
    text: 'text-green-700 dark:text-green-300',
    border: 'border-green-200 dark:border-green-800',
  },
  failed: {
    bg: 'bg-red-50 dark:bg-red-950/20',
    text: 'text-red-700 dark:text-red-300',
    border: 'border-red-200 dark:border-red-800',
  },
  paused: {
    bg: 'bg-yellow-50 dark:bg-yellow-950/20',
    text: 'text-yellow-700 dark:text-yellow-300',
    border: 'border-yellow-200 dark:border-yellow-800',
  },
  cancelled: {
    bg: 'bg-gray-50 dark:bg-gray-950/20',
    text: 'text-gray-700 dark:text-gray-300',
    border: 'border-gray-200 dark:border-gray-800',
  },
}

/** 鼓励话语 */
const ENCOURAGEMENTS = [
  '请放心，一切进展顺利 ☺️',
  '正在努力为您准备产品...',
  '马上就好，请稍等片刻 ⏳',
  '您的产品正在打造中...',
  '请耐心等待，好产品值得期待！',
]

// ============================================================================
// 主组件
// ============================================================================

/**
 * 用户交付进度面板
 * 为小白用户提供简单易懂的实时交付进度展示
 */
export function UserDeliveryProgress({
  projectId,
  projectName,
  productType,
  className,
  onContactSupport,
  onDeliveryComplete,
}: UserDeliveryProgressProps) {
  const [state, setState] = useState<DeliveryState | null>(null)
  const [readiness, setReadiness] = useState<ReadinessResult | null>(null)
  const [encouragement, setEncouragement] = useState('')
  const [showDetails, setShowDetails] = useState(false)

  // 初始化状态
  useEffect(() => {
    // 获取或创建交付状态
    let deliveryState = deliveryStateManager.getState(projectId)
    if (!deliveryState) {
      deliveryState = deliveryStateManager.createState(projectId)
    }
    setState(deliveryState)

    // 初始化就绪检查
    let readinessResult = deliveryReadySignal.getReadinessStatus(projectId)
    if (!readinessResult) {
      readinessResult = deliveryReadySignal.initializeChecks(projectId)
    }
    setReadiness(readinessResult)

    // 随机选择鼓励话语
    setEncouragement(ENCOURAGEMENTS[Math.floor(Math.random() * ENCOURAGEMENTS.length)])

    // 订阅状态变更
    const unsubscribeState = deliveryStateManager.onStateChange(projectId, (event) => {
      const newState = deliveryStateManager.getState(projectId)
      if (newState) {
        setState({ ...newState })

        // 完成时触发回调
        if (newState.status === 'completed' && onDeliveryComplete) {
          onDeliveryComplete(newState.outputs)
        }
      }
    })

    // 订阅就绪检查
    const unsubscribeReadiness = deliveryReadySignal.onEvent(projectId, () => {
      const newReadiness = deliveryReadySignal.getReadinessStatus(projectId)
      if (newReadiness) {
        setReadiness({ ...newReadiness })
      }
    })

    return () => {
      unsubscribeState()
      unsubscribeReadiness()
    }
  }, [projectId, onDeliveryComplete])

  // 定时更新鼓励话语
  useEffect(() => {
    if (state?.status !== 'active') return

    const timer = setInterval(() => {
      setEncouragement(ENCOURAGEMENTS[Math.floor(Math.random() * ENCOURAGEMENTS.length)])
    }, 10000)

    return () => clearInterval(timer)
  }, [state?.status])

  if (!state) {
    return (
      <Card className={cn('animate-pulse', className)}>
        <CardContent className="p-8 text-center">
          <div className="text-6xl mb-4 animate-bounce">⏳</div>
          <p className="text-muted-foreground">正在加载进度信息...</p>
        </CardContent>
      </Card>
    )
  }

  const statusColor = STATUS_COLORS[state.status] || STATUS_COLORS.active
  const isCompleted = state.status === 'completed'
  const isFailed = state.status === 'failed'
  const isActive = state.status === 'active'

  return (
    <Card className={cn('overflow-hidden', className)}>
      {/* 状态头部 */}
      <CardHeader className={cn(
        'border-b transition-colors',
        statusColor.bg,
        statusColor.border
      )}>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <span className="text-5xl animate-pulse">
              {STAGE_ICONS[state.currentStage]}
            </span>
            <div>
              <CardTitle className={cn('text-xl', statusColor.text)}>
                {STAGE_LABELS[state.currentStage]}
              </CardTitle>
              <CardDescription className="mt-1">
                {state.summary}
              </CardDescription>
            </div>
          </div>

          {/* 进度百分比 */}
          <div className="text-right">
            <div className={cn('text-4xl font-bold', statusColor.text)}>
              {state.progress}%
            </div>
            <div className="text-sm text-muted-foreground">完成进度</div>
          </div>
        </div>
      </CardHeader>

      <CardContent className="p-6 space-y-6">
        {/* 主进度条 */}
        <div className="space-y-2">
          <Progress value={state.progress} className="h-4" />
          {isActive && (
            <p className="text-sm text-muted-foreground text-center animate-fade-in">
              {encouragement}
            </p>
          )}
        </div>

        {/* 预计时间 */}
        {state.estimatedCompletionAt && isActive && (
          <div className="bg-blue-50 dark:bg-blue-950/20 rounded-lg p-4 text-center">
            <p className="text-sm text-muted-foreground mb-1">预计完成时间</p>
            <p className="text-2xl font-semibold text-blue-700 dark:text-blue-300">
              {formatEstimatedTime(state.estimatedCompletionAt)}
            </p>
          </div>
        )}

        {/* 阶段时间线 */}
        <div className="space-y-3">
          <button
            onClick={() => setShowDetails(!showDetails)}
            className="w-full flex items-center justify-between text-sm font-medium text-muted-foreground hover:text-foreground transition-colors"
          >
            <span className="flex items-center gap-2">
              <span>📋</span>
              <span>查看详细进度</span>
            </span>
            <span>{showDetails ? '▲' : '▼'}</span>
          </button>

          {showDetails && (
            <DeliveryTimeline
              projectId={projectId}
              currentStage={state.currentStage}
            />
          )}
        </div>

        {/* 就绪检查（接近完成时显示） */}
        {state.progress >= 70 && readiness && (
          <ReadinessChecklist readiness={readiness} />
        )}

        {/* 交付产物（完成时显示） */}
        {isCompleted && state.outputs && (
          <DeliveryOutputsPanel outputs={state.outputs} />
        )}

        {/* 错误信息 */}
        {isFailed && state.lastError && (
          <ErrorPanel
            error={state.lastError}
            onContactSupport={onContactSupport}
          />
        )}

        {/* 操作按钮 */}
        <div className="flex flex-wrap gap-3 justify-center">
          {isCompleted && state.outputs.productUrl && (
            <Button asChild size="lg" className="gap-2">
              <a href={state.outputs.productUrl} target="_blank" rel="noopener noreferrer">
                <span>🚀</span>
                <span>立即体验</span>
              </a>
            </Button>
          )}

          {isFailed && (
            <Button variant="outline" size="lg" onClick={onContactSupport} className="gap-2">
              <span>💬</span>
              <span>联系客服</span>
            </Button>
          )}

          {isActive && (
            <Button variant="ghost" size="sm" onClick={onContactSupport} className="gap-2">
              <span>❓</span>
              <span>有问题？联系我们</span>
            </Button>
          )}
        </div>
      </CardContent>
    </Card>
  )
}

// ============================================================================
// 子组件
// ============================================================================

/**
 * 交付时间线
 */
function DeliveryTimeline({
  projectId,
  currentStage,
}: {
  projectId: string
  currentStage: DeliveryStage
}) {
  const stages = deliveryStateManager.getStagesForDisplay(projectId)

  // 过滤掉特殊阶段
  const displayStages = stages.filter(s =>
    !['failed', 'recovering', 'cancelled'].includes(s.stage)
  )

  return (
    <div className="space-y-2 pl-4 border-l-2 border-gray-200 dark:border-gray-700">
      {displayStages.map((stage, index) => {
        const isCompleted = stage.status === 'completed' || stage.status === 'skipped'
        const isCurrent = stage.isCurrent
        const isPending = stage.status === 'pending'

        return (
          <div
            key={stage.stage}
            className={cn(
              'relative pl-4 py-2 transition-all',
              isCurrent && 'bg-blue-50 dark:bg-blue-950/20 rounded-r-lg ml-[-1px] border-l-2 border-blue-500',
              isCompleted && 'opacity-60'
            )}
          >
            {/* 时间线节点 */}
            <div className={cn(
              'absolute left-[-9px] w-4 h-4 rounded-full border-2 bg-white dark:bg-gray-900',
              isCurrent && 'border-blue-500 bg-blue-500',
              isCompleted && 'border-green-500 bg-green-500',
              isPending && 'border-gray-300 dark:border-gray-600'
            )}>
              {isCurrent && (
                <span className="absolute inset-0 rounded-full animate-ping bg-blue-400 opacity-50" />
              )}
            </div>

            {/* 阶段内容 */}
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span>{STAGE_ICONS[stage.stage]}</span>
                <span className={cn(
                  'text-sm',
                  isCurrent && 'font-medium',
                  isPending && 'text-muted-foreground'
                )}>
                  {stage.name}
                </span>
              </div>

              <div className="flex items-center gap-2">
                {stage.duration && (
                  <span className="text-xs text-muted-foreground">
                    {formatDuration(stage.duration)}
                  </span>
                )}
                <StageStatusBadge status={stage.status} />
              </div>
            </div>

            {/* 错误信息 */}
            {stage.error && (
              <p className="mt-1 text-xs text-red-600 dark:text-red-400">
                {stage.error}
              </p>
            )}
          </div>
        )
      })}
    </div>
  )
}

/**
 * 阶段状态徽章
 */
function StageStatusBadge({ status }: { status: StageStatus }) {
  const config: Record<StageStatus, { label: string; color: string }> = {
    pending: { label: '等待', color: 'bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400' },
    running: { label: '进行中', color: 'bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-300' },
    completed: { label: '完成', color: 'bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-300' },
    failed: { label: '失败', color: 'bg-red-100 text-red-700 dark:bg-red-900 dark:text-red-300' },
    skipped: { label: '跳过', color: 'bg-gray-100 text-gray-500 dark:bg-gray-800 dark:text-gray-500' },
    retrying: { label: '重试中', color: 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900 dark:text-yellow-300' },
  }

  const cfg = config[status]

  return (
    <span className={cn(
      'text-xs px-2 py-0.5 rounded-full',
      cfg.color
    )}>
      {cfg.label}
    </span>
  )
}

/**
 * 就绪检查清单
 */
function ReadinessChecklist({ readiness }: { readiness: ReadinessResult }) {
  const checkIcon = (status: CheckStatus) => {
    switch (status) {
      case 'passed': return '✅'
      case 'failed': return '❌'
      case 'warning': return '⚠️'
      case 'checking': return '🔄'
      default: return '⏳'
    }
  }

  return (
    <div className="bg-gray-50 dark:bg-gray-800/50 rounded-lg p-4 space-y-3">
      <h4 className="font-medium flex items-center gap-2">
        <span>📋</span>
        <span>产品检查清单</span>
        <span className="text-sm text-muted-foreground">
          ({readiness.passedCount}/{readiness.checks.length} 完成)
        </span>
      </h4>

      <div className="space-y-2">
        {readiness.checks.slice(0, 5).map(check => (
          <div key={check.id} className="flex items-center gap-2 text-sm">
            <span>{checkIcon(check.status)}</span>
            <span className={cn(
              check.status === 'passed' && 'text-green-700 dark:text-green-300',
              check.status === 'failed' && 'text-red-700 dark:text-red-300',
            )}>
              {check.name}
            </span>
          </div>
        ))}

        {readiness.checks.length > 5 && (
          <p className="text-xs text-muted-foreground">
            还有 {readiness.checks.length - 5} 项检查...
          </p>
        )}
      </div>
    </div>
  )
}

/**
 * 交付产物面板
 */
function DeliveryOutputsPanel({ outputs }: { outputs: DeliveryOutputs }) {
  const [showPassword, setShowPassword] = useState(false)

  return (
    <div className="bg-green-50 dark:bg-green-950/20 rounded-lg p-4 space-y-4">
      <h4 className="font-medium flex items-center gap-2 text-green-700 dark:text-green-300">
        <span>🎉</span>
        <span>恭喜！您的产品已就绪</span>
      </h4>

      <div className="space-y-3">
        {outputs.productUrl && (
          <InfoRow
            icon="🌐"
            label="产品地址"
            value={outputs.productUrl}
            isLink
          />
        )}

        {outputs.adminUrl && (
          <InfoRow
            icon="⚙️"
            label="管理后台"
            value={outputs.adminUrl}
            isLink
          />
        )}

        {outputs.adminEmail && (
          <InfoRow
            icon="📧"
            label="登录账号"
            value={outputs.adminEmail}
          />
        )}

        {outputs.adminPassword && (
          <div className="flex items-center gap-3 text-sm">
            <span className="flex-shrink-0">🔑</span>
            <span className="text-muted-foreground min-w-[80px]">登录密码</span>
            <span className="font-medium font-mono">
              {showPassword ? outputs.adminPassword : '••••••••'}
            </span>
            <button
              onClick={() => setShowPassword(!showPassword)}
              className="text-blue-600 hover:text-blue-700 text-xs"
            >
              {showPassword ? '隐藏' : '显示'}
            </button>
          </div>
        )}

        {outputs.domain && (
          <InfoRow
            icon="🔗"
            label="域名"
            value={outputs.domain}
          />
        )}
      </div>

      <div className="bg-yellow-50 dark:bg-yellow-950/20 rounded p-3 text-sm">
        <p className="text-yellow-800 dark:text-yellow-200">
          ⚠️ 请妥善保管您的登录信息，首次登录后建议修改密码
        </p>
      </div>
    </div>
  )
}

/**
 * 信息行
 */
function InfoRow({
  icon,
  label,
  value,
  isLink = false,
}: {
  icon: string
  label: string
  value: string
  isLink?: boolean
}) {
  return (
    <div className="flex items-center gap-3 text-sm">
      <span className="flex-shrink-0">{icon}</span>
      <span className="text-muted-foreground min-w-[80px]">{label}</span>
      {isLink ? (
        <a
          href={value}
          target="_blank"
          rel="noopener noreferrer"
          className="font-medium text-blue-600 hover:text-blue-700 hover:underline truncate"
        >
          {value}
        </a>
      ) : (
        <span className="font-medium truncate">{value}</span>
      )}
    </div>
  )
}

/**
 * 错误面板
 */
function ErrorPanel({
  error,
  onContactSupport,
}: {
  error: { stage: DeliveryStage; code: string; message: string; occurredAt: Date }
  onContactSupport?: () => void
}) {
  return (
    <div className="bg-red-50 dark:bg-red-950/20 rounded-lg p-4 space-y-3">
      <h4 className="font-medium flex items-center gap-2 text-red-700 dark:text-red-300">
        <span>❌</span>
        <span>遇到了一些问题</span>
      </h4>

      <div className="text-sm space-y-2">
        <p className="text-red-600 dark:text-red-400">
          {error.message}
        </p>
        <p className="text-muted-foreground">
          问题发生在「{STAGE_LABELS[error.stage]}」阶段
        </p>
      </div>

      <div className="bg-white dark:bg-gray-800 rounded p-3 text-sm">
        <p className="text-gray-700 dark:text-gray-300">
          🤝 别担心，我们的技术团队已收到通知，正在处理中。
          如需帮助，请随时联系客服。
        </p>
      </div>

      {onContactSupport && (
        <Button
          variant="outline"
          size="sm"
          onClick={onContactSupport}
          className="w-full gap-2"
        >
          <span>💬</span>
          <span>联系客服获取帮助</span>
        </Button>
      )}
    </div>
  )
}

// ============================================================================
// 辅助组件
// ============================================================================

/**
 * 迷你进度指示器（用于列表等场景）
 */
export function DeliveryProgressIndicator({
  projectId,
  size = 'md',
  showLabel = true,
}: {
  projectId: string
  size?: 'sm' | 'md' | 'lg'
  showLabel?: boolean
}) {
  const state = deliveryStateManager.getState(projectId)

  if (!state) {
    return (
      <span className="text-muted-foreground text-sm">加载中...</span>
    )
  }

  const sizeClasses = {
    sm: 'text-sm',
    md: 'text-base',
    lg: 'text-lg',
  }

  return (
    <div className={cn('flex items-center gap-2', sizeClasses[size])}>
      <span>{STAGE_ICONS[state.currentStage]}</span>
      {showLabel && (
        <span className="text-muted-foreground">
          {STAGE_LABELS[state.currentStage]}
        </span>
      )}
      <span className="font-medium">{state.progress}%</span>
    </div>
  )
}

/**
 * 进度徽章
 */
export function DeliveryProgressBadge({
  projectId,
  className,
}: {
  projectId: string
  className?: string
}) {
  const state = deliveryStateManager.getState(projectId)

  if (!state) {
    return null
  }

  const statusColor = STATUS_COLORS[state.status] || STATUS_COLORS.active

  return (
    <div className={cn(
      'inline-flex items-center gap-2 px-3 py-1.5 rounded-full text-sm font-medium',
      statusColor.bg,
      statusColor.text,
      statusColor.border,
      'border',
      className
    )}>
      <span>{STAGE_ICONS[state.currentStage]}</span>
      <span>{STAGE_LABELS[state.currentStage]}</span>
      <span className="opacity-75">({state.progress}%)</span>
    </div>
  )
}

/**
 * 悬浮进度条（用于页面底部）
 */
export function DeliveryProgressBar({
  projectId,
  projectName,
  onViewDetails,
  className,
}: {
  projectId: string
  projectName: string
  onViewDetails?: () => void
  className?: string
}) {
  const state = deliveryStateManager.getState(projectId)

  if (!state || state.status === 'completed') {
    return null
  }

  return (
    <div className={cn(
      'fixed bottom-0 left-0 right-0 bg-white dark:bg-gray-900 border-t shadow-lg p-4',
      className
    )}>
      <div className="max-w-4xl mx-auto flex items-center gap-4">
        <span className="text-2xl animate-pulse">
          {STAGE_ICONS[state.currentStage]}
        </span>

        <div className="flex-1 min-w-0">
          <div className="flex items-center justify-between mb-1">
            <span className="text-sm font-medium truncate">
              {projectName} - {STAGE_LABELS[state.currentStage]}
            </span>
            <span className="text-sm font-bold">{state.progress}%</span>
          </div>
          <Progress value={state.progress} className="h-2" />
        </div>

        {onViewDetails && (
          <Button variant="ghost" size="sm" onClick={onViewDetails}>
            查看详情
          </Button>
        )}
      </div>
    </div>
  )
}

// ============================================================================
// 工具函数
// ============================================================================

/**
 * 格式化预计时间
 */
function formatEstimatedTime(date: Date): string {
  const now = new Date()
  const diff = date.getTime() - now.getTime()

  if (diff <= 0) return '即将完成'

  const minutes = Math.ceil(diff / 60000)

  if (minutes < 60) {
    return `约 ${minutes} 分钟`
  }

  const hours = Math.floor(minutes / 60)
  const remainMinutes = minutes % 60

  if (hours < 24) {
    return remainMinutes > 0 ? `约 ${hours} 小时 ${remainMinutes} 分钟` : `约 ${hours} 小时`
  }

  return `约 ${Math.ceil(hours / 24)} 天`
}

/**
 * 格式化持续时间
 */
function formatDuration(ms: number): string {
  const seconds = Math.round(ms / 1000)

  if (seconds < 60) {
    return `${seconds}秒`
  }

  const minutes = Math.floor(seconds / 60)
  const remainSeconds = seconds % 60

  if (minutes < 60) {
    return remainSeconds > 0 ? `${minutes}分${remainSeconds}秒` : `${minutes}分钟`
  }

  const hours = Math.floor(minutes / 60)
  const remainMinutes = minutes % 60

  return `${hours}小时${remainMinutes}分钟`
}
