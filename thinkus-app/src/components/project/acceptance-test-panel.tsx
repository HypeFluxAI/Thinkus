'use client'

import * as React from 'react'
import { useState, useCallback } from 'react'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Progress } from '@/components/ui/progress'
import {
  acceptanceTester,
  TestScenario,
  TestStep,
  AcceptanceTestReport,
  ScenarioType,
  TestPriority
} from '@/lib/services/acceptance-tester'

export interface AcceptanceTestPanelProps {
  /** 项目ID */
  projectId: string
  /** 项目名称 */
  projectName: string
  /** 产品类型 */
  productType: string
  /** 产品URL */
  baseUrl: string
  /** 测试完成回调 */
  onComplete?: (report: AcceptanceTestReport) => void
  /** 自定义样式 */
  className?: string
}

// 优先级配置
const PRIORITY_CONFIG: Record<TestPriority, { label: string; color: string; icon: string }> = {
  critical: { label: '关键', color: 'text-red-600 bg-red-100 dark:bg-red-900/30', icon: '🔴' },
  high: { label: '重要', color: 'text-orange-600 bg-orange-100 dark:bg-orange-900/30', icon: '🟠' },
  medium: { label: '中等', color: 'text-yellow-600 bg-yellow-100 dark:bg-yellow-900/30', icon: '🟡' },
  low: { label: '次要', color: 'text-green-600 bg-green-100 dark:bg-green-900/30', icon: '🟢' }
}

type TestState = 'idle' | 'running' | 'completed'

/**
 * 验收测试面板组件
 */
export function AcceptanceTestPanel({
  projectId,
  projectName,
  productType,
  baseUrl,
  onComplete,
  className
}: AcceptanceTestPanelProps) {
  const [state, setState] = useState<TestState>('idle')
  const [progress, setProgress] = useState(0)
  const [progressMessage, setProgressMessage] = useState('')
  const [report, setReport] = useState<AcceptanceTestReport | null>(null)
  const [expandedScenario, setExpandedScenario] = useState<string | null>(null)

  // 开始测试
  const startTest = useCallback(async () => {
    setState('running')
    setProgress(0)
    setProgressMessage('准备测试环境...')

    const testReport = await acceptanceTester.runAcceptanceTest(
      projectId,
      projectName,
      productType,
      { baseUrl },
      (message, prog) => {
        setProgressMessage(message)
        setProgress(prog)
      }
    )

    setReport(testReport)
    setState('completed')
    onComplete?.(testReport)
  }, [projectId, projectName, productType, baseUrl, onComplete])

  // 重新测试
  const rerunTest = useCallback(() => {
    setReport(null)
    startTest()
  }, [startTest])

  return (
    <Card className={cn('overflow-hidden', className)}>
      <CardHeader className={cn(
        'border-b',
        state === 'completed' && report?.overallStatus === 'passed' && 'bg-green-50 dark:bg-green-950/20',
        state === 'completed' && report?.overallStatus === 'failed' && 'bg-red-50 dark:bg-red-950/20',
        state === 'completed' && report?.overallStatus === 'partial' && 'bg-yellow-50 dark:bg-yellow-950/20'
      )}>
        <CardTitle className="flex items-center gap-2">
          {state === 'idle' && (
            <>
              <span className="text-2xl">🧪</span>
              自动化验收测试
            </>
          )}
          {state === 'running' && (
            <>
              <span className="text-2xl animate-pulse">🔬</span>
              正在测试...
            </>
          )}
          {state === 'completed' && report?.overallStatus === 'passed' && (
            <>
              <span className="text-2xl">✅</span>
              测试全部通过
            </>
          )}
          {state === 'completed' && report?.overallStatus === 'failed' && (
            <>
              <span className="text-2xl">❌</span>
              测试发现问题
            </>
          )}
          {state === 'completed' && report?.overallStatus === 'partial' && (
            <>
              <span className="text-2xl">⚠️</span>
              测试部分通过
            </>
          )}
        </CardTitle>
        <CardDescription>
          {state === 'idle' && '在交付前自动验证产品的核心功能是否正常工作'}
          {state === 'running' && progressMessage}
          {state === 'completed' && report && `通过率: ${report.summary.passRate.toFixed(1)}%`}
        </CardDescription>
      </CardHeader>

      <CardContent className="p-6">
        {/* 待开始状态 */}
        {state === 'idle' && (
          <div className="text-center py-8">
            <div className="text-6xl mb-4">🧪</div>
            <h3 className="text-xl font-semibold mb-2">准备好验收测试了吗？</h3>
            <p className="text-muted-foreground mb-6">
              系统将自动测试{productType === 'ecommerce' ? '电商' : productType === 'saas' ? 'SaaS' : 'Web'}应用的核心功能
            </p>
            <Button size="lg" onClick={startTest}>
              🚀 开始验收测试
            </Button>
          </div>
        )}

        {/* 运行中状态 */}
        {state === 'running' && (
          <div className="py-8">
            <Progress value={progress} className="h-3 mb-4" />
            <p className="text-center text-muted-foreground">{progressMessage}</p>
            <div className="flex justify-center gap-2 mt-6">
              <div className="w-3 h-3 rounded-full bg-blue-500 animate-bounce" style={{ animationDelay: '0ms' }} />
              <div className="w-3 h-3 rounded-full bg-blue-500 animate-bounce" style={{ animationDelay: '150ms' }} />
              <div className="w-3 h-3 rounded-full bg-blue-500 animate-bounce" style={{ animationDelay: '300ms' }} />
            </div>
          </div>
        )}

        {/* 完成状态 */}
        {state === 'completed' && report && (
          <div className="space-y-6">
            {/* 汇总统计 */}
            <div className="grid grid-cols-4 gap-4">
              <StatCard
                label="总计"
                value={report.summary.total}
                icon="📋"
              />
              <StatCard
                label="通过"
                value={report.summary.passed}
                icon="✅"
                color="text-green-600"
              />
              <StatCard
                label="失败"
                value={report.summary.failed}
                icon="❌"
                color="text-red-600"
              />
              <StatCard
                label="跳过"
                value={report.summary.skipped}
                icon="⏭️"
                color="text-gray-500"
              />
            </div>

            {/* 阻塞问题 */}
            {report.blockers.length > 0 && (
              <div className="bg-red-50 dark:bg-red-950/20 border border-red-200 dark:border-red-800 rounded-lg p-4">
                <h4 className="font-medium text-red-700 dark:text-red-300 flex items-center gap-2 mb-3">
                  <span>🚫</span>
                  阻塞问题 ({report.blockers.length})
                </h4>
                <ul className="space-y-1 text-sm text-red-600 dark:text-red-400">
                  {report.blockers.map((blocker, i) => (
                    <li key={i}>• {blocker}</li>
                  ))}
                </ul>
              </div>
            )}

            {/* 警告 */}
            {report.warnings.length > 0 && (
              <div className="bg-yellow-50 dark:bg-yellow-950/20 border border-yellow-200 dark:border-yellow-800 rounded-lg p-4">
                <h4 className="font-medium text-yellow-700 dark:text-yellow-300 flex items-center gap-2 mb-3">
                  <span>⚠️</span>
                  警告 ({report.warnings.length})
                </h4>
                <ul className="space-y-1 text-sm text-yellow-600 dark:text-yellow-400">
                  {report.warnings.map((warning, i) => (
                    <li key={i}>• {warning}</li>
                  ))}
                </ul>
              </div>
            )}

            {/* 测试场景列表 */}
            <div className="space-y-2">
              <h4 className="font-medium flex items-center gap-2">
                <span>📝</span>
                测试详情
              </h4>
              {report.scenarios.map(scenario => (
                <ScenarioCard
                  key={scenario.id}
                  scenario={scenario}
                  expanded={expandedScenario === scenario.id}
                  onToggle={() => setExpandedScenario(
                    expandedScenario === scenario.id ? null : scenario.id
                  )}
                />
              ))}
            </div>

            {/* 建议 */}
            <div className={cn(
              'p-4 rounded-lg',
              report.overallStatus === 'passed' && 'bg-green-50 dark:bg-green-950/20 border border-green-200 dark:border-green-800',
              report.overallStatus === 'failed' && 'bg-red-50 dark:bg-red-950/20 border border-red-200 dark:border-red-800',
              report.overallStatus === 'partial' && 'bg-yellow-50 dark:bg-yellow-950/20 border border-yellow-200 dark:border-yellow-800'
            )}>
              <p className="font-medium">{report.recommendation}</p>
            </div>

            {/* 操作按钮 */}
            <div className="flex gap-3 justify-end">
              <Button variant="outline" onClick={rerunTest}>
                🔄 重新测试
              </Button>
              {report.overallStatus === 'passed' && (
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
 * 统计卡片
 */
function StatCard({
  label,
  value,
  icon,
  color
}: {
  label: string
  value: number
  icon: string
  color?: string
}) {
  return (
    <div className="bg-gray-50 dark:bg-gray-800/50 rounded-lg p-4 text-center">
      <div className="text-2xl mb-1">{icon}</div>
      <div className={cn('text-2xl font-bold', color)}>{value}</div>
      <div className="text-sm text-muted-foreground">{label}</div>
    </div>
  )
}

/**
 * 场景卡片
 */
function ScenarioCard({
  scenario,
  expanded,
  onToggle
}: {
  scenario: TestScenario
  expanded: boolean
  onToggle: () => void
}) {
  const priorityConfig = PRIORITY_CONFIG[scenario.priority]
  const statusIcon = scenario.status === 'passed' ? '✅' : scenario.status === 'failed' ? '❌' : '⏭️'

  return (
    <div className="border rounded-lg overflow-hidden">
      <button
        onClick={onToggle}
        className="w-full flex items-center justify-between p-4 hover:bg-gray-50 dark:hover:bg-gray-800/50"
      >
        <div className="flex items-center gap-3">
          <span className="text-xl">{statusIcon}</span>
          <div className="text-left">
            <div className="font-medium">{scenario.name}</div>
            <div className="text-sm text-muted-foreground">
              {scenario.steps.filter(s => s.status === 'passed').length}/{scenario.steps.length} 步骤通过
            </div>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <span className={cn('px-2 py-1 rounded text-xs', priorityConfig.color)}>
            {priorityConfig.icon} {priorityConfig.label}
          </span>
          <span className="text-muted-foreground">
            {expanded ? '▲' : '▼'}
          </span>
        </div>
      </button>

      {expanded && (
        <div className="border-t p-4 bg-gray-50 dark:bg-gray-800/30">
          <div className="space-y-2">
            {scenario.steps.map(step => (
              <StepItem key={step.id} step={step} />
            ))}
          </div>
        </div>
      )}
    </div>
  )
}

/**
 * 步骤项
 */
function StepItem({ step }: { step: TestStep }) {
  const statusIcon = step.status === 'passed' ? '✅' : step.status === 'failed' ? '❌' : '⏭️'

  return (
    <div className={cn(
      'flex items-start gap-3 p-3 rounded-lg',
      step.status === 'passed' && 'bg-green-50 dark:bg-green-950/20',
      step.status === 'failed' && 'bg-red-50 dark:bg-red-950/20',
      step.status === 'skipped' && 'bg-gray-100 dark:bg-gray-800'
    )}>
      <span className="text-lg">{statusIcon}</span>
      <div className="flex-1 min-w-0">
        <div className="font-medium">{step.name}</div>
        <div className="text-sm text-muted-foreground">{step.description}</div>
        {step.error && (
          <div className="text-sm text-red-600 dark:text-red-400 mt-1">
            错误: {step.error}
          </div>
        )}
        {step.duration && (
          <div className="text-xs text-muted-foreground mt-1">
            耗时: {step.duration}ms
          </div>
        )}
      </div>
    </div>
  )
}

/**
 * 验收测试结果徽章
 */
export function AcceptanceTestBadge({
  status,
  passRate,
  onClick,
  className
}: {
  status: 'passed' | 'failed' | 'partial' | 'pending'
  passRate?: number
  onClick?: () => void
  className?: string
}) {
  const config = {
    passed: { icon: '✅', label: '验收通过', color: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300' },
    failed: { icon: '❌', label: '验收失败', color: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-300' },
    partial: { icon: '⚠️', label: '部分通过', color: 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-300' },
    pending: { icon: '🧪', label: '待测试', color: 'bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300' }
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
      {passRate !== undefined && (
        <span className="opacity-75">({passRate.toFixed(0)}%)</span>
      )}
    </button>
  )
}
