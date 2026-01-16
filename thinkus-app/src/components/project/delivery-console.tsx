'use client'

import * as React from 'react'
import { useState, useCallback } from 'react'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Progress } from '@/components/ui/progress'
import {
  oneClickDelivery,
  DeliveryConfig,
  DeliveryStep,
  DeliveryResult,
  DeliveryStage
} from '@/lib/services/one-click-delivery'

export interface DeliveryConsoleProps {
  /** 项目ID */
  projectId: string
  /** 项目名称 */
  projectName: string
  /** 产品类型 */
  productType: string
  /** 产品URL */
  baseUrl: string
  /** 管理员邮箱 */
  adminEmail: string
  /** 自定义域名 */
  customDomain?: string
  /** 交付完成回调 */
  onComplete?: (result: DeliveryResult) => void
  /** 自定义样式 */
  className?: string
}

type ConsoleState = 'config' | 'running' | 'completed'

/**
 * 一键交付控制台
 */
export function DeliveryConsole({
  projectId,
  projectName,
  productType,
  baseUrl,
  adminEmail,
  customDomain,
  onComplete,
  className
}: DeliveryConsoleProps) {
  const [state, setState] = useState<ConsoleState>('config')
  const [config, setConfig] = useState<DeliveryConfig>({
    projectId,
    projectName,
    productType,
    baseUrl,
    adminEmail,
    customDomain,
    enableMonitoring: true,
    enableBackup: true,
    enableTutorial: true,
    notifyOnComplete: true
  })
  const [currentStage, setCurrentStage] = useState<DeliveryStage>('preparation')
  const [progress, setProgress] = useState(0)
  const [steps, setSteps] = useState<DeliveryStep[]>([])
  const [currentStep, setCurrentStep] = useState<DeliveryStep | null>(null)
  const [result, setResult] = useState<DeliveryResult | null>(null)

  const stageConfig = oneClickDelivery.getStageConfig()

  // 开始交付
  const startDelivery = useCallback(async () => {
    setState('running')
    setProgress(0)

    const deliveryResult = await oneClickDelivery.executeDelivery(
      config,
      (step, overallProgress) => {
        setCurrentStep(step)
        setProgress(overallProgress)
        setSteps(prev => {
          const index = prev.findIndex(s => s.id === step.id)
          if (index >= 0) {
            const newSteps = [...prev]
            newSteps[index] = step
            return newSteps
          }
          return [...prev, step]
        })
      },
      (stage) => {
        setCurrentStage(stage)
      }
    )

    setResult(deliveryResult)
    setState('completed')
    onComplete?.(deliveryResult)
  }, [config, onComplete])

  // 更新配置
  const updateConfig = useCallback((key: keyof DeliveryConfig, value: unknown) => {
    setConfig(prev => ({ ...prev, [key]: value }))
  }, [])

  return (
    <Card className={cn('overflow-hidden', className)}>
      <CardHeader className={cn(
        'border-b',
        state === 'completed' && result?.status === 'success' && 'bg-green-50 dark:bg-green-950/20',
        state === 'completed' && result?.status === 'failed' && 'bg-red-50 dark:bg-red-950/20',
        state === 'completed' && result?.status === 'partial' && 'bg-yellow-50 dark:bg-yellow-950/20'
      )}>
        <CardTitle className="flex items-center gap-2">
          {state === 'config' && (
            <>
              <span className="text-2xl">🎁</span>
              一键交付
            </>
          )}
          {state === 'running' && (
            <>
              <span className="text-2xl animate-pulse">🚀</span>
              正在交付...
            </>
          )}
          {state === 'completed' && result?.status === 'success' && (
            <>
              <span className="text-2xl">🎉</span>
              交付成功！
            </>
          )}
          {state === 'completed' && result?.status === 'partial' && (
            <>
              <span className="text-2xl">⚠️</span>
              部分完成
            </>
          )}
          {state === 'completed' && result?.status === 'failed' && (
            <>
              <span className="text-2xl">❌</span>
              交付失败
            </>
          )}
        </CardTitle>
        <CardDescription>
          {state === 'config' && '配置交付选项，一键完成所有交付步骤'}
          {state === 'running' && `${stageConfig[currentStage].icon} ${stageConfig[currentStage].label}阶段`}
          {state === 'completed' && result && `总耗时: ${(result.duration / 1000).toFixed(1)} 秒`}
        </CardDescription>
      </CardHeader>

      <CardContent className="p-6">
        {/* 配置阶段 */}
        {state === 'config' && (
          <div className="space-y-6">
            {/* 基本信息 */}
            <div className="bg-gray-50 dark:bg-gray-800/50 rounded-lg p-4">
              <h4 className="font-medium mb-3">📋 项目信息</h4>
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <span className="text-muted-foreground">项目名称:</span>
                  <span className="ml-2 font-medium">{projectName}</span>
                </div>
                <div>
                  <span className="text-muted-foreground">产品类型:</span>
                  <span className="ml-2 font-medium">{productType}</span>
                </div>
                <div>
                  <span className="text-muted-foreground">产品URL:</span>
                  <span className="ml-2 font-medium">{baseUrl}</span>
                </div>
                <div>
                  <span className="text-muted-foreground">管理员邮箱:</span>
                  <span className="ml-2 font-medium">{adminEmail}</span>
                </div>
              </div>
            </div>

            {/* 可选配置 */}
            <div className="space-y-3">
              <h4 className="font-medium">⚙️ 交付选项</h4>

              <label className="flex items-center gap-3 p-3 rounded-lg border cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-800/50">
                <input
                  type="checkbox"
                  checked={config.enableMonitoring}
                  onChange={e => updateConfig('enableMonitoring', e.target.checked)}
                  className="w-5 h-5"
                />
                <div>
                  <div className="font-medium">📊 启用错误监控</div>
                  <div className="text-sm text-muted-foreground">自动配置 Sentry 错误追踪</div>
                </div>
              </label>

              <label className="flex items-center gap-3 p-3 rounded-lg border cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-800/50">
                <input
                  type="checkbox"
                  checked={config.enableBackup}
                  onChange={e => updateConfig('enableBackup', e.target.checked)}
                  className="w-5 h-5"
                />
                <div>
                  <div className="font-medium">💾 启用自动备份</div>
                  <div className="text-sm text-muted-foreground">每日自动备份数据库</div>
                </div>
              </label>

              <label className="flex items-center gap-3 p-3 rounded-lg border cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-800/50">
                <input
                  type="checkbox"
                  checked={config.enableTutorial}
                  onChange={e => updateConfig('enableTutorial', e.target.checked)}
                  className="w-5 h-5"
                />
                <div>
                  <div className="font-medium">📖 生成使用教程</div>
                  <div className="text-sm text-muted-foreground">为用户生成入门指南</div>
                </div>
              </label>

              <label className="flex items-center gap-3 p-3 rounded-lg border cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-800/50">
                <input
                  type="checkbox"
                  checked={config.notifyOnComplete}
                  onChange={e => updateConfig('notifyOnComplete', e.target.checked)}
                  className="w-5 h-5"
                />
                <div>
                  <div className="font-medium">📧 发送交付通知</div>
                  <div className="text-sm text-muted-foreground">交付完成后发送邮件通知</div>
                </div>
              </label>
            </div>

            {/* 开始按钮 */}
            <Button size="lg" className="w-full" onClick={startDelivery}>
              🚀 开始一键交付
            </Button>
          </div>
        )}

        {/* 运行中阶段 */}
        {state === 'running' && (
          <div className="space-y-6">
            {/* 总进度 */}
            <div>
              <div className="flex justify-between mb-2">
                <span className="font-medium">总进度</span>
                <span className="text-muted-foreground">{progress.toFixed(0)}%</span>
              </div>
              <Progress value={progress} className="h-3" />
            </div>

            {/* 阶段指示器 */}
            <div className="flex justify-between">
              {Object.entries(stageConfig).map(([stage, cfg]) => (
                <div
                  key={stage}
                  className={cn(
                    'flex flex-col items-center gap-1',
                    currentStage === stage && 'text-blue-600',
                    steps.some(s => s.stage === stage && s.status === 'completed') && 'text-green-600',
                    steps.some(s => s.stage === stage && s.status === 'failed') && 'text-red-600'
                  )}
                >
                  <span className={cn(
                    'text-2xl',
                    currentStage === stage && 'animate-bounce'
                  )}>
                    {cfg.icon}
                  </span>
                  <span className="text-xs">{cfg.label}</span>
                </div>
              ))}
            </div>

            {/* 当前步骤 */}
            {currentStep && (
              <div className="bg-blue-50 dark:bg-blue-950/20 rounded-lg p-4">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-full bg-blue-500 flex items-center justify-center">
                    <span className="text-white animate-spin">⏳</span>
                  </div>
                  <div>
                    <div className="font-medium">{currentStep.name}</div>
                    <div className="text-sm text-muted-foreground">{currentStep.description}</div>
                  </div>
                </div>
                <Progress value={currentStep.progress} className="h-1 mt-3" />
              </div>
            )}

            {/* 已完成步骤 */}
            <div className="space-y-2 max-h-60 overflow-y-auto">
              {steps.filter(s => s.status !== 'pending' && s.id !== currentStep?.id).map(step => (
                <div
                  key={step.id}
                  className={cn(
                    'flex items-center gap-3 p-2 rounded-lg text-sm',
                    step.status === 'completed' && 'bg-green-50 dark:bg-green-950/20',
                    step.status === 'failed' && 'bg-red-50 dark:bg-red-950/20'
                  )}
                >
                  <span>
                    {step.status === 'completed' ? '✅' : step.status === 'failed' ? '❌' : '⏭️'}
                  </span>
                  <span className="flex-1">{step.name}</span>
                  {step.duration && (
                    <span className="text-muted-foreground">
                      {(step.duration / 1000).toFixed(1)}s
                    </span>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* 完成阶段 */}
        {state === 'completed' && result && (
          <div className="space-y-6">
            {/* 结果摘要 */}
            <div className={cn(
              'rounded-lg p-4',
              result.status === 'success' && 'bg-green-50 dark:bg-green-950/20',
              result.status === 'partial' && 'bg-yellow-50 dark:bg-yellow-950/20',
              result.status === 'failed' && 'bg-red-50 dark:bg-red-950/20'
            )}>
              <pre className="text-sm whitespace-pre-wrap font-sans">
                {result.report}
              </pre>
            </div>

            {/* 交付信息 */}
            {result.status !== 'failed' && (
              <div className="space-y-4">
                <h4 className="font-medium flex items-center gap-2">
                  <span>🎁</span>
                  交付信息
                </h4>

                <div className="grid gap-4">
                  {/* 产品URL */}
                  <div className="bg-gray-50 dark:bg-gray-800/50 rounded-lg p-4">
                    <div className="text-sm text-muted-foreground mb-1">产品地址</div>
                    <a
                      href={result.outputs.productUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-blue-600 hover:underline font-medium"
                    >
                      {result.outputs.productUrl}
                    </a>
                  </div>

                  {/* 管理后台 */}
                  <div className="bg-gray-50 dark:bg-gray-800/50 rounded-lg p-4">
                    <div className="text-sm text-muted-foreground mb-1">管理后台</div>
                    <a
                      href={result.outputs.adminUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-blue-600 hover:underline font-medium"
                    >
                      {result.outputs.adminUrl}
                    </a>
                  </div>

                  {/* 管理员凭证 */}
                  <div className="bg-yellow-50 dark:bg-yellow-950/20 rounded-lg p-4">
                    <div className="text-sm text-muted-foreground mb-2">管理员账号</div>
                    <div className="space-y-1 font-mono text-sm">
                      <div>用户名: {result.outputs.adminCredentials.username}</div>
                      <div>初始密码: {result.outputs.adminCredentials.password}</div>
                    </div>
                    <div className="text-xs text-yellow-600 dark:text-yellow-400 mt-2">
                      ⚠️ 首次登录后请立即修改密码
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* 后续步骤 */}
            <div className="space-y-3">
              <h4 className="font-medium flex items-center gap-2">
                <span>📋</span>
                后续步骤
              </h4>
              <ul className="space-y-2">
                {result.nextSteps.map((step, i) => (
                  <li key={i} className="flex items-start gap-2 text-sm">
                    <span className="text-blue-500">•</span>
                    <span>{step}</span>
                  </li>
                ))}
              </ul>
            </div>

            {/* 操作按钮 */}
            <div className="flex gap-3 justify-end">
              {result.status === 'failed' && (
                <Button onClick={() => setState('config')}>
                  🔄 重新配置
                </Button>
              )}
              {result.status !== 'failed' && (
                <Button>
                  📧 发送交付邮件
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
 * 交付状态徽章
 */
export function DeliveryStatusBadge({
  status,
  onClick,
  className
}: {
  status: 'pending' | 'running' | 'success' | 'partial' | 'failed'
  onClick?: () => void
  className?: string
}) {
  const config = {
    pending: { icon: '📦', label: '待交付', color: 'bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300' },
    running: { icon: '🚀', label: '交付中', color: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300' },
    success: { icon: '✅', label: '已交付', color: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300' },
    partial: { icon: '⚠️', label: '部分完成', color: 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-300' },
    failed: { icon: '❌', label: '交付失败', color: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-300' }
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
    </button>
  )
}
