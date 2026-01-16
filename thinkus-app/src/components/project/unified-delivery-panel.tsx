'use client'

import * as React from 'react'
import { useState, useCallback, useEffect } from 'react'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Progress } from '@/components/ui/progress'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Switch } from '@/components/ui/switch'
import {
  unifiedDelivery,
  DeliveryFlowState,
  DeliveryFlowConfig,
  DeliveryFlowStage,
  StageStatus,
  FlowStage
} from '@/lib/services/unified-delivery'

export interface UnifiedDeliveryPanelProps {
  /** 项目ID */
  projectId: string
  /** 项目名称 */
  projectName: string
  /** 产品类型 */
  productType: string
  /** 自定义样式 */
  className?: string
  /** 交付完成回调 */
  onDeliveryComplete?: (state: DeliveryFlowState) => void
}

/**
 * 统一交付面板 - 一键完成整个交付流程
 */
export function UnifiedDeliveryPanel({
  projectId,
  projectName,
  productType,
  className,
  onDeliveryComplete
}: UnifiedDeliveryPanelProps) {
  const [phase, setPhase] = useState<'config' | 'running' | 'completed' | 'failed'>('config')
  const [flowState, setFlowState] = useState<DeliveryFlowState | null>(null)
  const [config, setConfig] = useState<Partial<DeliveryFlowConfig>>({
    projectId,
    projectName,
    productType,
    clientName: '',
    clientEmail: '',
    clientPhone: '',
    notifyChannels: ['email'],
    sendWelcomeEmail: true,
    scheduleSurvey: true,
    enableMonitoring: true,
    enableBackup: true,
    skipAcceptanceTest: false,
    skipChecklist: false,
    autoRetryOnFailure: true,
    maxRetries: 3
  })

  const stageConfig = unifiedDelivery.getStageConfig()

  // 开始交付
  const startDelivery = useCallback(async () => {
    if (!config.clientEmail || !config.clientName) {
      alert('请填写客户信息')
      return
    }

    const flow = unifiedDelivery.createFlow(config as DeliveryFlowConfig)
    setFlowState(flow)
    setPhase('running')

    try {
      const result = await unifiedDelivery.startFlow(flow.id, (state) => {
        setFlowState({ ...state })
      })

      if (result.status === 'completed') {
        setPhase('completed')
        onDeliveryComplete?.(result)
      } else {
        setPhase('failed')
      }
    } catch (error) {
      setPhase('failed')
    }
  }, [config, onDeliveryComplete])

  // 重试失败阶段
  const retryFailed = useCallback(async () => {
    if (!flowState) return

    setPhase('running')
    const result = await unifiedDelivery.retryFailedStage(flowState.id, (state) => {
      setFlowState({ ...state })
    })

    if (result?.status === 'completed') {
      setPhase('completed')
      onDeliveryComplete?.(result)
    } else {
      setPhase('failed')
    }
  }, [flowState, onDeliveryComplete])

  // 配置阶段
  if (phase === 'config') {
    return (
      <Card className={cn('overflow-hidden', className)}>
        <CardHeader className="border-b bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-blue-950/20 dark:to-indigo-950/20">
          <CardTitle className="flex items-center gap-2">
            <span className="text-2xl">🚀</span>
            一键交付
          </CardTitle>
          <CardDescription>
            配置交付参数，一键完成全流程
          </CardDescription>
        </CardHeader>

        <CardContent className="p-6 space-y-6">
          {/* 客户信息 */}
          <div className="space-y-4">
            <h4 className="font-medium flex items-center gap-2">
              <span>👤</span> 客户信息
            </h4>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="clientName">客户姓名 *</Label>
                <Input
                  id="clientName"
                  value={config.clientName || ''}
                  onChange={(e) => setConfig({ ...config, clientName: e.target.value })}
                  placeholder="张三"
                />
              </div>
              <div>
                <Label htmlFor="clientEmail">客户邮箱 *</Label>
                <Input
                  id="clientEmail"
                  type="email"
                  value={config.clientEmail || ''}
                  onChange={(e) => setConfig({ ...config, clientEmail: e.target.value })}
                  placeholder="client@example.com"
                />
              </div>
            </div>

            <div>
              <Label htmlFor="clientPhone">客户电话</Label>
              <Input
                id="clientPhone"
                value={config.clientPhone || ''}
                onChange={(e) => setConfig({ ...config, clientPhone: e.target.value })}
                placeholder="13800138000"
              />
            </div>
          </div>

          {/* 部署配置 */}
          <div className="space-y-4">
            <h4 className="font-medium flex items-center gap-2">
              <span>🌐</span> 部署配置
            </h4>

            <div>
              <Label htmlFor="customDomain">自定义域名</Label>
              <Input
                id="customDomain"
                value={config.customDomain || ''}
                onChange={(e) => setConfig({ ...config, customDomain: e.target.value })}
                placeholder="example.com (可选)"
              />
            </div>

            <div className="flex items-center justify-between">
              <div>
                <p className="font-medium">启用自动备份</p>
                <p className="text-sm text-muted-foreground">定期备份数据库</p>
              </div>
              <Switch
                checked={config.enableBackup}
                onCheckedChange={(checked) => setConfig({ ...config, enableBackup: checked })}
              />
            </div>

            <div className="flex items-center justify-between">
              <div>
                <p className="font-medium">启用运维监控</p>
                <p className="text-sm text-muted-foreground">自动检测异常并修复</p>
              </div>
              <Switch
                checked={config.enableMonitoring}
                onCheckedChange={(checked) => setConfig({ ...config, enableMonitoring: checked })}
              />
            </div>
          </div>

          {/* 通知配置 */}
          <div className="space-y-4">
            <h4 className="font-medium flex items-center gap-2">
              <span>📧</span> 通知配置
            </h4>

            <div className="flex items-center justify-between">
              <div>
                <p className="font-medium">发送欢迎邮件</p>
                <p className="text-sm text-muted-foreground">包含登录信息和使用指南</p>
              </div>
              <Switch
                checked={config.sendWelcomeEmail}
                onCheckedChange={(checked) => setConfig({ ...config, sendWelcomeEmail: checked })}
              />
            </div>

            <div className="flex items-center justify-between">
              <div>
                <p className="font-medium">安排满意度调查</p>
                <p className="text-sm text-muted-foreground">交付后发送满意度调查</p>
              </div>
              <Switch
                checked={config.scheduleSurvey}
                onCheckedChange={(checked) => setConfig({ ...config, scheduleSurvey: checked })}
              />
            </div>
          </div>

          {/* 高级选项 */}
          <div className="space-y-4">
            <h4 className="font-medium flex items-center gap-2">
              <span>⚙️</span> 高级选项
            </h4>

            <div className="flex items-center justify-between">
              <div>
                <p className="font-medium">跳过验收测试</p>
                <p className="text-sm text-muted-foreground">不推荐，但可加快交付</p>
              </div>
              <Switch
                checked={config.skipAcceptanceTest}
                onCheckedChange={(checked) => setConfig({ ...config, skipAcceptanceTest: checked })}
              />
            </div>

            <div className="flex items-center justify-between">
              <div>
                <p className="font-medium">失败自动重试</p>
                <p className="text-sm text-muted-foreground">最多重试 {config.maxRetries} 次</p>
              </div>
              <Switch
                checked={config.autoRetryOnFailure}
                onCheckedChange={(checked) => setConfig({ ...config, autoRetryOnFailure: checked })}
              />
            </div>
          </div>

          {/* 预计时间 */}
          <div className="bg-gray-50 dark:bg-gray-800/50 rounded-lg p-4">
            <p className="text-sm text-muted-foreground mb-2">预计交付时间</p>
            <p className="text-2xl font-bold">
              约 {Object.values(stageConfig).reduce((sum, s) => sum + s.estimatedMinutes, 0)} 分钟
            </p>
          </div>

          <Button onClick={startDelivery} className="w-full" size="lg">
            <span className="mr-2">🚀</span>
            开始一键交付
          </Button>
        </CardContent>
      </Card>
    )
  }

  // 运行中/完成/失败阶段
  return (
    <Card className={cn('overflow-hidden', className)}>
      <CardHeader className={cn(
        'border-b',
        phase === 'completed' && 'bg-gradient-to-r from-green-50 to-emerald-50 dark:from-green-950/20 dark:to-emerald-950/20',
        phase === 'failed' && 'bg-gradient-to-r from-red-50 to-orange-50 dark:from-red-950/20 dark:to-orange-950/20',
        phase === 'running' && 'bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-blue-950/20 dark:to-indigo-950/20'
      )}>
        <CardTitle className="flex items-center gap-2">
          <span className="text-2xl">
            {phase === 'completed' ? '✅' : phase === 'failed' ? '❌' : '⏳'}
          </span>
          {phase === 'completed' ? '交付完成' : phase === 'failed' ? '交付失败' : '交付进行中'}
        </CardTitle>
        <CardDescription>
          {flowState && (
            <>
              进度: {flowState.overallProgress}% |
              完成: {flowState.stats.completedStages}/{flowState.stats.totalStages}
            </>
          )}
        </CardDescription>
      </CardHeader>

      <CardContent className="p-6 space-y-6">
        {/* 总体进度 */}
        {flowState && (
          <div>
            <div className="flex justify-between mb-2">
              <span className="text-sm font-medium">总体进度</span>
              <span className="text-sm text-muted-foreground">{flowState.overallProgress}%</span>
            </div>
            <Progress value={flowState.overallProgress} className="h-3" />
          </div>
        )}

        {/* 阶段列表 */}
        {flowState && (
          <div className="space-y-3">
            {flowState.stages.map((stage, index) => (
              <DeliveryStageRow
                key={stage.stage}
                stage={stage}
                config={stageConfig[stage.stage]}
                isActive={flowState.currentStage === stage.stage}
              />
            ))}
          </div>
        )}

        {/* 交付产物 */}
        {phase === 'completed' && flowState?.outputs && (
          <div className="bg-green-50 dark:bg-green-950/20 rounded-lg p-4 space-y-3">
            <h4 className="font-medium text-green-700 dark:text-green-300">
              🎉 交付产物
            </h4>

            {flowState.outputs.productUrl && (
              <div className="flex items-center justify-between">
                <span className="text-sm">产品地址</span>
                <a
                  href={flowState.outputs.productUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-sm text-blue-600 hover:underline"
                >
                  {flowState.outputs.productUrl}
                </a>
              </div>
            )}

            {flowState.outputs.adminUrl && (
              <div className="flex items-center justify-between">
                <span className="text-sm">管理后台</span>
                <a
                  href={flowState.outputs.adminUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-sm text-blue-600 hover:underline"
                >
                  {flowState.outputs.adminUrl}
                </a>
              </div>
            )}

            {flowState.outputs.adminCredentials && (
              <div className="bg-white dark:bg-gray-800 rounded p-3 text-sm">
                <p className="font-medium mb-1">管理员账号</p>
                <p>邮箱: {flowState.outputs.adminCredentials.email}</p>
                <p>临时密码: {flowState.outputs.adminCredentials.tempPassword}</p>
              </div>
            )}
          </div>
        )}

        {/* 错误信息 */}
        {phase === 'failed' && flowState && (
          <div className="bg-red-50 dark:bg-red-950/20 rounded-lg p-4 space-y-3">
            <h4 className="font-medium text-red-700 dark:text-red-300">
              ❌ 错误信息
            </h4>

            {flowState.stages.filter(s => s.status === 'failed').map(stage => (
              <div key={stage.stage} className="text-sm">
                <p className="font-medium">{stage.name}</p>
                <p className="text-red-600">{stage.error}</p>
              </div>
            ))}

            <Button onClick={retryFailed} variant="outline" className="w-full mt-2">
              🔄 重试失败阶段
            </Button>
          </div>
        )}

        {/* 统计 */}
        {flowState && (
          <div className="grid grid-cols-4 gap-4 text-center">
            <div className="bg-gray-50 dark:bg-gray-800/50 rounded-lg p-3">
              <p className="text-2xl font-bold text-green-600">{flowState.stats.completedStages}</p>
              <p className="text-xs text-muted-foreground">完成</p>
            </div>
            <div className="bg-gray-50 dark:bg-gray-800/50 rounded-lg p-3">
              <p className="text-2xl font-bold text-gray-600">{flowState.stats.skippedStages}</p>
              <p className="text-xs text-muted-foreground">跳过</p>
            </div>
            <div className="bg-gray-50 dark:bg-gray-800/50 rounded-lg p-3">
              <p className="text-2xl font-bold text-red-600">{flowState.stats.failedStages}</p>
              <p className="text-xs text-muted-foreground">失败</p>
            </div>
            <div className="bg-gray-50 dark:bg-gray-800/50 rounded-lg p-3">
              <p className="text-2xl font-bold">
                {Math.round(flowState.stats.totalTimeMs / 1000 / 60)}
              </p>
              <p className="text-xs text-muted-foreground">分钟</p>
            </div>
          </div>
        )}

        {/* 生成报告 */}
        {phase === 'completed' && flowState && (
          <Button
            variant="outline"
            className="w-full"
            onClick={() => {
              const summary = unifiedDelivery.generateDeliverySummary(flowState)
              // 下载 markdown 文件
              const blob = new Blob([summary], { type: 'text/markdown' })
              const url = URL.createObjectURL(blob)
              const a = document.createElement('a')
              a.href = url
              a.download = `delivery-report-${flowState.id}.md`
              a.click()
              URL.revokeObjectURL(url)
            }}
          >
            📄 下载交付报告
          </Button>
        )}
      </CardContent>
    </Card>
  )
}

/**
 * 单个交付阶段行
 */
function DeliveryStageRow({
  stage,
  config,
  isActive
}: {
  stage: FlowStage
  config: { name: string; icon: string; estimatedMinutes: number }
  isActive: boolean
}) {
  const statusConfig: Record<StageStatus, { color: string; icon: string }> = {
    pending: { color: 'text-gray-400', icon: '⏳' },
    running: { color: 'text-blue-600', icon: '🔄' },
    completed: { color: 'text-green-600', icon: '✅' },
    failed: { color: 'text-red-600', icon: '❌' },
    skipped: { color: 'text-gray-500', icon: '⏭️' }
  }

  const statusCfg = statusConfig[stage.status]

  return (
    <div className={cn(
      'flex items-center gap-3 p-3 rounded-lg transition-colors',
      isActive && 'bg-blue-50 dark:bg-blue-950/20 ring-1 ring-blue-200',
      stage.status === 'completed' && 'bg-green-50/50 dark:bg-green-950/10',
      stage.status === 'failed' && 'bg-red-50/50 dark:bg-red-950/10'
    )}>
      <span className="text-xl">{config.icon}</span>

      <div className="flex-1">
        <div className="flex items-center justify-between">
          <span className="font-medium">{stage.name}</span>
          <span className={cn('text-sm', statusCfg.color)}>
            {statusCfg.icon} {stage.status === 'running' ? `${stage.progress}%` : ''}
          </span>
        </div>

        {stage.status === 'running' && (
          <Progress value={stage.progress} className="h-1 mt-1" />
        )}

        {stage.error && (
          <p className="text-xs text-red-600 mt-1">{stage.error}</p>
        )}
      </div>
    </div>
  )
}

/**
 * 快速交付按钮
 */
export function QuickDeliveryButton({
  projectId,
  projectName,
  onClick,
  className
}: {
  projectId: string
  projectName: string
  onClick?: () => void
  className?: string
}) {
  return (
    <Button
      onClick={onClick}
      className={cn(
        'bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700',
        className
      )}
      size="lg"
    >
      <span className="mr-2">🚀</span>
      一键交付
    </Button>
  )
}

/**
 * 交付状态徽章
 */
export function DeliveryStatusBadge({
  status,
  progress,
  className
}: {
  status: 'idle' | 'running' | 'paused' | 'completed' | 'failed'
  progress?: number
  className?: string
}) {
  const statusConfig = {
    idle: { label: '待交付', color: 'bg-gray-100 text-gray-700', icon: '⏳' },
    running: { label: '交付中', color: 'bg-blue-100 text-blue-700', icon: '🔄' },
    paused: { label: '已暂停', color: 'bg-yellow-100 text-yellow-700', icon: '⏸️' },
    completed: { label: '已交付', color: 'bg-green-100 text-green-700', icon: '✅' },
    failed: { label: '交付失败', color: 'bg-red-100 text-red-700', icon: '❌' }
  }

  const cfg = statusConfig[status]

  return (
    <span className={cn(
      'inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-sm font-medium',
      cfg.color,
      className
    )}>
      <span>{cfg.icon}</span>
      <span>{cfg.label}</span>
      {status === 'running' && progress !== undefined && (
        <span className="ml-1 opacity-75">({progress}%)</span>
      )}
    </span>
  )
}
