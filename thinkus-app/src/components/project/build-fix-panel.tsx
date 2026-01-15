'use client'

import * as React from 'react'
import { useState, useCallback } from 'react'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Progress } from '@/components/ui/progress'
import {
  buildAutoFixer,
  BuildError,
  BuildFixReport,
  FixAttempt,
  BuildErrorType
} from '@/lib/services/build-auto-fixer'

export interface BuildFixPanelProps {
  /** 项目ID */
  projectId: string
  /** 构建日志 */
  buildLog: string
  /** 修复完成回调 */
  onFixComplete?: (report: BuildFixReport) => void
  /** 请求人工支持回调 */
  onRequestSupport?: (errors: BuildError[]) => void
  /** 自定义样式 */
  className?: string
}

// 错误类型图标
const ERROR_TYPE_ICONS: Record<BuildErrorType, string> = {
  dependency_missing: '📦',
  dependency_conflict: '⚔️',
  type_error: '🔤',
  syntax_error: '❗',
  import_error: '📥',
  env_missing: '🔑',
  memory_exceeded: '💾',
  timeout: '⏱️',
  node_version: '📗',
  build_script_error: '📜',
  asset_not_found: '🔍',
  config_invalid: '⚙️',
  unknown: '❓'
}

// 错误类型标签
const ERROR_TYPE_LABELS: Record<BuildErrorType, string> = {
  dependency_missing: '缺少依赖',
  dependency_conflict: '依赖冲突',
  type_error: '类型错误',
  syntax_error: '语法错误',
  import_error: '导入错误',
  env_missing: '缺少环境变量',
  memory_exceeded: '内存不足',
  timeout: '构建超时',
  node_version: 'Node版本问题',
  build_script_error: '脚本错误',
  asset_not_found: '文件丢失',
  config_invalid: '配置错误',
  unknown: '未知错误'
}

type FixStatus = 'idle' | 'analyzing' | 'fixing' | 'success' | 'partial' | 'failed'

/**
 * 构建修复面板组件
 */
export function BuildFixPanel({
  projectId,
  buildLog,
  onFixComplete,
  onRequestSupport,
  className
}: BuildFixPanelProps) {
  const [status, setStatus] = useState<FixStatus>('idle')
  const [errors, setErrors] = useState<BuildError[]>([])
  const [attempts, setAttempts] = useState<FixAttempt[]>([])
  const [progress, setProgress] = useState(0)
  const [progressMessage, setProgressMessage] = useState('')
  const [report, setReport] = useState<BuildFixReport | null>(null)

  // 分析构建日志
  const analyzeLog = useCallback(() => {
    setStatus('analyzing')
    setProgress(10)
    setProgressMessage('正在分析构建日志...')

    // 模拟异步分析
    setTimeout(() => {
      const parsedErrors = buildAutoFixer.parseBuildLog(buildLog)
      setErrors(parsedErrors)
      setProgress(30)
      setProgressMessage(`发现 ${parsedErrors.length} 个问题`)

      // 短暂展示后切换到 idle 状态
      setTimeout(() => {
        setStatus('idle')
        setProgress(0)
      }, 1000)
    }, 500)
  }, [buildLog])

  // 开始自动修复
  const startAutoFix = useCallback(async () => {
    setStatus('fixing')
    setProgress(0)

    const fixReport = await buildAutoFixer.runAutoFixLoop(
      buildLog,
      {
        projectId,
        projectPath: '/project',
        buildCommand: 'npm run build',
        packageManager: 'npm',
        nodeVersion: '18',
        framework: 'nextjs',
        previousAttempts: []
      },
      (message) => {
        setProgressMessage(message)
        setProgress(prev => Math.min(prev + 15, 90))
      }
    )

    setReport(fixReport)
    setAttempts(fixReport.attempts)
    setProgress(100)

    if (fixReport.finalStatus === 'fixed') {
      setStatus('success')
    } else if (fixReport.finalStatus === 'partial') {
      setStatus('partial')
    } else {
      setStatus('failed')
    }

    onFixComplete?.(fixReport)
  }, [buildLog, projectId, onFixComplete])

  // 请求人工支持
  const handleRequestSupport = useCallback(() => {
    const remainingErrors = report?.remainingErrors || errors
    onRequestSupport?.(remainingErrors)
  }, [report, errors, onRequestSupport])

  // 初次渲染时自动分析
  React.useEffect(() => {
    if (buildLog && status === 'idle' && errors.length === 0) {
      analyzeLog()
    }
  }, [buildLog, status, errors.length, analyzeLog])

  return (
    <Card className={cn('overflow-hidden', className)}>
      <CardHeader className={cn(
        'border-b',
        status === 'success' && 'bg-green-50 dark:bg-green-950/20',
        status === 'failed' && 'bg-red-50 dark:bg-red-950/20',
        status === 'partial' && 'bg-yellow-50 dark:bg-yellow-950/20'
      )}>
        <CardTitle className="flex items-center gap-2">
          {status === 'analyzing' && (
            <>
              <span className="text-2xl animate-pulse">🔍</span>
              正在分析...
            </>
          )}
          {status === 'fixing' && (
            <>
              <span className="text-2xl animate-spin">🔧</span>
              正在修复...
            </>
          )}
          {status === 'success' && (
            <>
              <span className="text-2xl">✅</span>
              修复成功！
            </>
          )}
          {status === 'partial' && (
            <>
              <span className="text-2xl">⚠️</span>
              部分修复
            </>
          )}
          {status === 'failed' && (
            <>
              <span className="text-2xl">❌</span>
              需要人工处理
            </>
          )}
          {status === 'idle' && errors.length > 0 && (
            <>
              <span className="text-2xl">🔧</span>
              构建问题诊断
            </>
          )}
          {status === 'idle' && errors.length === 0 && (
            <>
              <span className="text-2xl">📋</span>
              等待分析
            </>
          )}
        </CardTitle>
        <CardDescription>
          {status === 'idle' && errors.length > 0 && `发现 ${errors.length} 个问题，可尝试自动修复`}
          {status === 'fixing' && progressMessage}
          {status === 'success' && '所有问题已自动修复，构建应该能正常进行了'}
          {status === 'partial' && `修复了部分问题，还有 ${report?.remainingErrors.length || 0} 个需要人工处理`}
          {status === 'failed' && '自动修复无法解决问题，需要技术人员协助'}
        </CardDescription>
      </CardHeader>

      <CardContent className="p-6">
        {/* 进度条 */}
        {(status === 'analyzing' || status === 'fixing') && (
          <div className="mb-6">
            <Progress value={progress} className="h-2" />
            <p className="text-sm text-muted-foreground mt-2 text-center">
              {progressMessage}
            </p>
          </div>
        )}

        {/* 问题列表 */}
        {errors.length > 0 && status !== 'analyzing' && (
          <div className="space-y-3 mb-6">
            <h4 className="font-medium flex items-center gap-2">
              <span>🔍</span>
              发现的问题
            </h4>
            <div className="space-y-2">
              {errors.map((error, index) => {
                const isFixed = report?.remainingErrors
                  ? !report.remainingErrors.some(e => e.type === error.type && e.message === error.message)
                  : false

                return (
                  <div
                    key={index}
                    className={cn(
                      'flex items-start gap-3 p-3 rounded-lg border',
                      isFixed
                        ? 'bg-green-50 dark:bg-green-950/20 border-green-200 dark:border-green-800'
                        : 'bg-gray-50 dark:bg-gray-800/50'
                    )}
                  >
                    <span className="text-xl">
                      {isFixed ? '✅' : ERROR_TYPE_ICONS[error.type]}
                    </span>
                    <div className="flex-1 min-w-0">
                      <div className="font-medium">
                        {ERROR_TYPE_LABELS[error.type]}
                        {isFixed && (
                          <span className="ml-2 text-xs text-green-600 dark:text-green-400">
                            已修复
                          </span>
                        )}
                      </div>
                      <div className="text-sm text-muted-foreground truncate">
                        {error.message}
                      </div>
                      {error.suggestion && !isFixed && (
                        <div className="text-xs text-blue-600 dark:text-blue-400 mt-1">
                          💡 {error.suggestion}
                        </div>
                      )}
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
        )}

        {/* 修复尝试记录 */}
        {attempts.length > 0 && (
          <div className="space-y-3 mb-6">
            <h4 className="font-medium flex items-center gap-2">
              <span>🔧</span>
              修复尝试
            </h4>
            <div className="space-y-2">
              {attempts.map((attempt, index) => (
                <div
                  key={index}
                  className={cn(
                    'flex items-center gap-3 p-3 rounded-lg',
                    attempt.success
                      ? 'bg-green-50 dark:bg-green-950/20'
                      : 'bg-red-50 dark:bg-red-950/20'
                  )}
                >
                  <span className="text-xl">
                    {attempt.success ? '✅' : '❌'}
                  </span>
                  <div className="flex-1">
                    <div className="font-medium">{attempt.strategyName}</div>
                    {attempt.changes.length > 0 && (
                      <div className="text-xs text-muted-foreground">
                        {attempt.changes.join(', ')}
                      </div>
                    )}
                    {attempt.error && (
                      <div className="text-xs text-red-600 dark:text-red-400">
                        {attempt.error}
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* 人话总结 */}
        {report?.humanReadableSummary && (
          <div className="bg-blue-50 dark:bg-blue-950/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4 mb-6">
            <pre className="text-sm whitespace-pre-wrap font-sans">
              {report.humanReadableSummary}
            </pre>
          </div>
        )}

        {/* 操作按钮 */}
        <div className="flex gap-3 justify-end">
          {status === 'idle' && errors.length > 0 && (
            <>
              <Button variant="outline" onClick={handleRequestSupport}>
                👨‍💻 请求人工支持
              </Button>
              <Button onClick={startAutoFix}>
                🔧 一键修复
              </Button>
            </>
          )}

          {status === 'partial' && (
            <>
              <Button variant="outline" onClick={handleRequestSupport}>
                👨‍💻 剩余问题请求支持
              </Button>
              <Button onClick={() => window.location.reload()}>
                🔄 重新构建
              </Button>
            </>
          )}

          {status === 'failed' && (
            <Button onClick={handleRequestSupport}>
              👨‍💻 联系技术支持
            </Button>
          )}

          {status === 'success' && (
            <Button onClick={() => window.location.reload()}>
              🔄 重新构建
            </Button>
          )}
        </div>
      </CardContent>
    </Card>
  )
}

/**
 * 构建状态徽章
 */
export function BuildStatusBadge({
  status,
  className
}: {
  status: 'building' | 'success' | 'failed' | 'fixing'
  className?: string
}) {
  const config = {
    building: {
      icon: '🔨',
      label: '构建中',
      color: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300'
    },
    success: {
      icon: '✅',
      label: '构建成功',
      color: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300'
    },
    failed: {
      icon: '❌',
      label: '构建失败',
      color: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-300'
    },
    fixing: {
      icon: '🔧',
      label: '自动修复中',
      color: 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-300'
    }
  }

  const cfg = config[status]

  return (
    <span className={cn(
      'inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-sm font-medium',
      cfg.color,
      className
    )}>
      <span>{cfg.icon}</span>
      <span>{cfg.label}</span>
    </span>
  )
}

/**
 * 构建错误提示条
 */
export function BuildErrorBanner({
  errorCount,
  onViewDetails,
  onAutoFix,
  className
}: {
  errorCount: number
  onViewDetails: () => void
  onAutoFix: () => void
  className?: string
}) {
  if (errorCount === 0) return null

  return (
    <div className={cn(
      'flex items-center justify-between gap-4 p-4 rounded-lg',
      'bg-red-50 dark:bg-red-950/20 border border-red-200 dark:border-red-800',
      className
    )}>
      <div className="flex items-center gap-3">
        <span className="text-2xl">❌</span>
        <div>
          <div className="font-medium text-red-700 dark:text-red-300">
            构建失败
          </div>
          <div className="text-sm text-red-600 dark:text-red-400">
            发现 {errorCount} 个问题
          </div>
        </div>
      </div>
      <div className="flex gap-2">
        <Button variant="outline" size="sm" onClick={onViewDetails}>
          查看详情
        </Button>
        <Button size="sm" onClick={onAutoFix}>
          🔧 一键修复
        </Button>
      </div>
    </div>
  )
}
