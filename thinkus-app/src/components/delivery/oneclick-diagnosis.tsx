'use client'

import { useState, useEffect } from 'react'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import { Progress } from '@/components/ui/progress'
import {
  oneclickDiagnosis,
  type DiagnosisReport,
  type DiagnosisCategory,
} from '@/lib/services'

interface OneclickDiagnosisProps {
  projectId: string
  projectUrl: string
  onComplete?: (report: DiagnosisReport) => void
  onNeedSupport?: () => void
  className?: string
}

// 诊断类别配置
const CATEGORY_CONFIG: Record<DiagnosisCategory, {
  icon: string
  label: string
  description: string
}> = {
  browser: {
    icon: '🌐',
    label: '浏览器环境',
    description: '检测浏览器版本和兼容性'
  },
  network: {
    icon: '📡',
    label: '网络连接',
    description: '检测网络状态和连接速度'
  },
  performance: {
    icon: '⚡',
    label: '性能指标',
    description: '检测页面加载和响应速度'
  },
  storage: {
    icon: '💾',
    label: '存储空间',
    description: '检测本地存储使用情况'
  },
  errors: {
    icon: '🐛',
    label: '错误日志',
    description: '收集最近的错误信息'
  },
  api: {
    icon: '🔌',
    label: 'API状态',
    description: '检测后端服务连接状态'
  },
  resources: {
    icon: '📦',
    label: '资源加载',
    description: '检测页面资源加载情况'
  },
  screenshots: {
    icon: '📸',
    label: '页面截图',
    description: '捕获当前页面状态'
  }
}

// 诊断状态配置
const STATUS_CONFIG = {
  idle: {
    icon: '🔍',
    label: '准备诊断',
    color: 'text-gray-600',
    bgColor: 'bg-gray-100'
  },
  collecting: {
    icon: '⏳',
    label: '收集中...',
    color: 'text-blue-600',
    bgColor: 'bg-blue-100'
  },
  analyzing: {
    icon: '🧠',
    label: '分析中...',
    color: 'text-purple-600',
    bgColor: 'bg-purple-100'
  },
  complete: {
    icon: '✅',
    label: '诊断完成',
    color: 'text-green-600',
    bgColor: 'bg-green-100'
  },
  error: {
    icon: '❌',
    label: '诊断失败',
    color: 'text-red-600',
    bgColor: 'bg-red-100'
  }
}

type DiagnosisStatus = 'idle' | 'collecting' | 'analyzing' | 'complete' | 'error'

/**
 * 一键诊断按钮组件
 */
export function OneclickDiagnosisButton({
  projectId,
  projectUrl,
  onComplete,
  onNeedSupport,
  className
}: OneclickDiagnosisProps) {
  const [status, setStatus] = useState<DiagnosisStatus>('idle')
  const [progress, setProgress] = useState(0)
  const [currentCategory, setCurrentCategory] = useState<DiagnosisCategory | null>(null)
  const [report, setReport] = useState<DiagnosisReport | null>(null)
  const [error, setError] = useState<string | null>(null)

  // 执行诊断
  const runDiagnosis = async () => {
    setStatus('collecting')
    setProgress(0)
    setError(null)

    try {
      // 模拟诊断过程
      const categories: DiagnosisCategory[] = [
        'browser', 'network', 'performance', 'storage', 'errors', 'api', 'resources'
      ]

      for (let i = 0; i < categories.length; i++) {
        setCurrentCategory(categories[i])
        setProgress(((i + 1) / categories.length) * 80)
        await new Promise(resolve => setTimeout(resolve, 500))
      }

      setStatus('analyzing')
      setProgress(90)

      // 调用诊断服务
      const diagnosisReport = await oneclickDiagnosis.startDiagnosis(projectId, {
        projectUrl,
        includeScreenshot: true,
        includePerformance: true,
        includeNetwork: true
      })

      setReport(diagnosisReport)
      setStatus('complete')
      setProgress(100)
      onComplete?.(diagnosisReport)
    } catch (err) {
      setStatus('error')
      setError(err instanceof Error ? err.message : '诊断过程中发生错误')
    }
  }

  const statusConfig = STATUS_CONFIG[status]

  return (
    <div className={cn(
      'rounded-2xl shadow-lg bg-white overflow-hidden',
      className
    )}>
      {/* 头部 */}
      <div className={cn(
        'p-6 text-center',
        status === 'complete' ? 'bg-gradient-to-br from-green-500 to-emerald-600' :
        status === 'error' ? 'bg-gradient-to-br from-red-500 to-rose-600' :
        'bg-gradient-to-br from-blue-500 to-indigo-600'
      )}>
        <div className={cn(
          'text-5xl mb-3',
          status === 'collecting' || status === 'analyzing' ? 'animate-pulse' : ''
        )}>
          {statusConfig.icon}
        </div>
        <h2 className="text-xl font-bold text-white mb-1">{statusConfig.label}</h2>
        {status === 'idle' && (
          <p className="text-white/80 text-sm">一键收集诊断信息，快速定位问题</p>
        )}
      </div>

      {/* 进度 */}
      {(status === 'collecting' || status === 'analyzing') && (
        <div className="px-6 py-4 border-b">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm text-gray-600">
              {currentCategory && CATEGORY_CONFIG[currentCategory]?.label}
            </span>
            <span className="text-sm font-medium">{Math.round(progress)}%</span>
          </div>
          <Progress value={progress} className="h-2" />
        </div>
      )}

      {/* 诊断类别列表 */}
      {status === 'collecting' && (
        <div className="px-6 py-4">
          <div className="space-y-2">
            {Object.entries(CATEGORY_CONFIG).map(([key, config]) => {
              const categoryKey = key as DiagnosisCategory
              const isCurrent = currentCategory === categoryKey
              const isCompleted = currentCategory &&
                Object.keys(CATEGORY_CONFIG).indexOf(key) <
                Object.keys(CATEGORY_CONFIG).indexOf(currentCategory)

              return (
                <div
                  key={key}
                  className={cn(
                    'flex items-center gap-3 p-2 rounded-lg transition-colors',
                    isCurrent && 'bg-blue-50',
                    isCompleted && 'opacity-60'
                  )}
                >
                  <div className={cn(
                    'w-8 h-8 rounded-full flex items-center justify-center text-lg',
                    isCompleted ? 'bg-green-100' :
                    isCurrent ? 'bg-blue-100' : 'bg-gray-100'
                  )}>
                    {isCompleted ? '✅' : config.icon}
                  </div>
                  <div className="flex-1">
                    <div className={cn(
                      'text-sm font-medium',
                      isCurrent ? 'text-blue-700' : 'text-gray-600'
                    )}>
                      {config.label}
                    </div>
                  </div>
                  {isCurrent && (
                    <div className="w-4 h-4 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
                  )}
                </div>
              )
            })}
          </div>
        </div>
      )}

      {/* 诊断结果 */}
      {status === 'complete' && report && (
        <DiagnosisReportPanel report={report} />
      )}

      {/* 错误信息 */}
      {status === 'error' && error && (
        <div className="px-6 py-4">
          <div className="p-4 rounded-xl bg-red-50 border border-red-200">
            <div className="flex items-start gap-3">
              <span className="text-2xl">❌</span>
              <div>
                <div className="font-semibold text-red-700 mb-1">诊断失败</div>
                <div className="text-sm text-red-600">{error}</div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 操作按钮 */}
      <div className="px-6 py-4 border-t flex gap-3">
        {status === 'idle' && (
          <Button className="flex-1" onClick={runDiagnosis}>
            开始诊断
          </Button>
        )}
        {(status === 'collecting' || status === 'analyzing') && (
          <Button className="flex-1" disabled>
            正在诊断...
          </Button>
        )}
        {status === 'complete' && (
          <>
            <Button variant="outline" className="flex-1" onClick={runDiagnosis}>
              重新诊断
            </Button>
            <Button className="flex-1" onClick={onNeedSupport}>
              发送给客服
            </Button>
          </>
        )}
        {status === 'error' && (
          <>
            <Button variant="outline" className="flex-1" onClick={runDiagnosis}>
              重试
            </Button>
            <Button className="flex-1" onClick={onNeedSupport}>
              联系客服
            </Button>
          </>
        )}
      </div>
    </div>
  )
}

/**
 * 诊断报告面板
 */
function DiagnosisReportPanel({ report }: { report: DiagnosisReport }) {
  const [expandedSections, setExpandedSections] = useState<Set<string>>(new Set(['problems']))

  const toggleSection = (section: string) => {
    const newExpanded = new Set(expandedSections)
    if (newExpanded.has(section)) {
      newExpanded.delete(section)
    } else {
      newExpanded.add(section)
    }
    setExpandedSections(newExpanded)
  }

  return (
    <div className="px-6 py-4">
      {/* 摘要 */}
      <div className="mb-4 p-4 rounded-xl bg-gray-50">
        <div className="text-sm text-gray-600 mb-2">诊断摘要</div>
        <div className="text-sm text-gray-900">{report.summary}</div>
      </div>

      {/* 发现的问题 */}
      {report.problems.length > 0 && (
        <div className="mb-4">
          <button
            className="w-full flex items-center justify-between p-3 rounded-lg bg-red-50 hover:bg-red-100 transition-colors"
            onClick={() => toggleSection('problems')}
          >
            <div className="flex items-center gap-2">
              <span className="text-lg">🐛</span>
              <span className="font-medium text-red-700">
                发现 {report.problems.length} 个问题
              </span>
            </div>
            <span className="text-red-600">
              {expandedSections.has('problems') ? '▼' : '▶'}
            </span>
          </button>
          {expandedSections.has('problems') && (
            <div className="mt-2 space-y-2">
              {report.problems.map((problem, index) => (
                <div
                  key={index}
                  className="p-3 rounded-lg bg-white border border-red-200"
                >
                  <div className="font-medium text-red-700 mb-1">
                    {problem.title}
                  </div>
                  <div className="text-sm text-red-600">
                    {problem.description}
                  </div>
                  {problem.suggestion && (
                    <div className="mt-2 text-sm text-gray-600">
                      💡 建议：{problem.suggestion}
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* 浏览器信息 */}
      <div className="mb-4">
        <button
          className="w-full flex items-center justify-between p-3 rounded-lg bg-gray-50 hover:bg-gray-100 transition-colors"
          onClick={() => toggleSection('browser')}
        >
          <div className="flex items-center gap-2">
            <span className="text-lg">🌐</span>
            <span className="font-medium text-gray-700">浏览器信息</span>
          </div>
          <span className="text-gray-600">
            {expandedSections.has('browser') ? '▼' : '▶'}
          </span>
        </button>
        {expandedSections.has('browser') && (
          <div className="mt-2 p-3 rounded-lg bg-white border text-sm">
            <div className="grid grid-cols-2 gap-2">
              <div className="text-gray-500">浏览器</div>
              <div>{report.browser.name} {report.browser.version}</div>
              <div className="text-gray-500">操作系统</div>
              <div>{report.browser.platform}</div>
              <div className="text-gray-500">语言</div>
              <div>{report.browser.language}</div>
              <div className="text-gray-500">屏幕分辨率</div>
              <div>{report.browser.screenResolution}</div>
            </div>
          </div>
        )}
      </div>

      {/* 网络信息 */}
      <div className="mb-4">
        <button
          className="w-full flex items-center justify-between p-3 rounded-lg bg-gray-50 hover:bg-gray-100 transition-colors"
          onClick={() => toggleSection('network')}
        >
          <div className="flex items-center gap-2">
            <span className="text-lg">📡</span>
            <span className="font-medium text-gray-700">网络状态</span>
          </div>
          <span className="text-gray-600">
            {expandedSections.has('network') ? '▼' : '▶'}
          </span>
        </button>
        {expandedSections.has('network') && (
          <div className="mt-2 p-3 rounded-lg bg-white border text-sm">
            <div className="grid grid-cols-2 gap-2">
              <div className="text-gray-500">连接状态</div>
              <div className={report.network.online ? 'text-green-600' : 'text-red-600'}>
                {report.network.online ? '在线' : '离线'}
              </div>
              <div className="text-gray-500">连接类型</div>
              <div>{report.network.connectionType}</div>
              <div className="text-gray-500">下载速度</div>
              <div>{report.network.downlink} Mbps</div>
              <div className="text-gray-500">延迟</div>
              <div>{report.network.rtt} ms</div>
            </div>
          </div>
        )}
      </div>

      {/* 性能指标 */}
      {report.performance && (
        <div className="mb-4">
          <button
            className="w-full flex items-center justify-between p-3 rounded-lg bg-gray-50 hover:bg-gray-100 transition-colors"
            onClick={() => toggleSection('performance')}
          >
            <div className="flex items-center gap-2">
              <span className="text-lg">⚡</span>
              <span className="font-medium text-gray-700">性能指标</span>
            </div>
            <span className="text-gray-600">
              {expandedSections.has('performance') ? '▼' : '▶'}
            </span>
          </button>
          {expandedSections.has('performance') && (
            <div className="mt-2 p-3 rounded-lg bg-white border text-sm">
              <div className="grid grid-cols-2 gap-2">
                <div className="text-gray-500">页面加载时间</div>
                <div>{report.performance.loadTime} ms</div>
                <div className="text-gray-500">DOM Ready</div>
                <div>{report.performance.domReady} ms</div>
                <div className="text-gray-500">内存使用</div>
                <div>{Math.round(report.performance.memoryUsage / 1024 / 1024)} MB</div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* 报告ID */}
      <div className="text-xs text-gray-400 text-center mt-4">
        报告ID: {report.id} | 生成时间: {new Date(report.createdAt).toLocaleString('zh-CN')}
      </div>
    </div>
  )
}

/**
 * 悬浮诊断按钮
 */
export function FloatingDiagnosisButton({
  onClick,
  className
}: {
  onClick?: () => void
  className?: string
}) {
  return (
    <button
      className={cn(
        'fixed bottom-24 right-6 z-50',
        'w-14 h-14 rounded-full bg-blue-500 text-white shadow-lg',
        'flex items-center justify-center text-2xl',
        'hover:bg-blue-600 hover:shadow-xl transition-all',
        'active:scale-95',
        className
      )}
      onClick={onClick}
    >
      🔍
    </button>
  )
}

/**
 * 诊断状态徽章
 */
export function DiagnosisStatusBadge({
  status,
  className
}: {
  status: DiagnosisStatus
  className?: string
}) {
  const config = STATUS_CONFIG[status]

  return (
    <div className={cn(
      'inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm font-medium',
      config.bgColor,
      config.color,
      className
    )}>
      <span className={status === 'collecting' || status === 'analyzing' ? 'animate-pulse' : ''}>
        {config.icon}
      </span>
      <span>{config.label}</span>
    </div>
  )
}
