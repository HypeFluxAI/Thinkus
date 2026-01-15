'use client'

import * as React from 'react'
import { useState, useCallback, useEffect } from 'react'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Textarea } from '@/components/ui/textarea'
import {
  issueReporter,
  IssueType,
  IssueReport,
  DiagnosisResult,
  ISSUE_TYPE_CONFIG
} from '@/lib/services/issue-reporter'

export interface IssueReportDialogProps {
  /** 项目ID */
  projectId: string
  /** 用户ID */
  userId: string
  /** 是否显示 */
  open: boolean
  /** 关闭回调 */
  onClose: () => void
  /** 提交成功回调 */
  onSubmit?: (report: IssueReport) => void
  /** 预设的问题类型 */
  presetType?: IssueType
}

type Step = 'select_type' | 'describe' | 'diagnosing' | 'result'

/**
 * 一键报障对话框组件
 */
export function IssueReportDialog({
  projectId,
  userId,
  open,
  onClose,
  onSubmit,
  presetType
}: IssueReportDialogProps) {
  const [step, setStep] = useState<Step>('select_type')
  const [selectedType, setSelectedType] = useState<IssueType | null>(presetType || null)
  const [description, setDescription] = useState('')
  const [report, setReport] = useState<IssueReport | null>(null)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [autoFixResult, setAutoFixResult] = useState<{ success: boolean; message: string } | null>(null)

  // 重置状态
  useEffect(() => {
    if (open) {
      setStep(presetType ? 'describe' : 'select_type')
      setSelectedType(presetType || null)
      setDescription('')
      setReport(null)
      setAutoFixResult(null)
    }
  }, [open, presetType])

  // 选择问题类型
  const handleSelectType = useCallback((type: IssueType) => {
    setSelectedType(type)
    setStep('describe')
  }, [])

  // 提交报告
  const handleSubmit = useCallback(async () => {
    if (!selectedType) return

    setIsSubmitting(true)
    setStep('diagnosing')

    try {
      // 收集系统信息
      const systemInfo = {
        browser: navigator.userAgent,
        screenResolution: `${window.screen.width}x${window.screen.height}`,
        networkStatus: navigator.onLine ? 'online' : 'offline' as const,
        currentUrl: window.location.href
      }

      const newReport = await issueReporter.createReport({
        projectId,
        userId,
        type: selectedType,
        description: description || ISSUE_TYPE_CONFIG[selectedType].description,
        systemInfo
      })

      setReport(newReport)
      setStep('result')
      onSubmit?.(newReport)
    } catch (error) {
      console.error('Failed to create report:', error)
    } finally {
      setIsSubmitting(false)
    }
  }, [projectId, userId, selectedType, description, onSubmit])

  // 执行自动修复
  const handleAutoFix = useCallback(async () => {
    if (!report?.diagnosis?.autoFixSuggestions[0]) return

    setIsSubmitting(true)
    try {
      const result = await issueReporter.executeAutoFix(
        report.diagnosis.autoFixSuggestions[0]
      )
      setAutoFixResult(result)
    } catch (error) {
      setAutoFixResult({ success: false, message: '修复失败，请联系客服' })
    } finally {
      setIsSubmitting(false)
    }
  }, [report])

  if (!open) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <Card className="w-full max-w-lg max-h-[90vh] overflow-y-auto">
        {/* 步骤1: 选择问题类型 */}
        {step === 'select_type' && (
          <>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <span className="text-2xl">🔧</span>
                遇到什么问题了？
              </CardTitle>
              <CardDescription>
                选择最接近您问题的类型，我们会帮您快速解决
              </CardDescription>
            </CardHeader>
            <CardContent className="grid gap-2">
              {Object.entries(ISSUE_TYPE_CONFIG).map(([type, config]) => (
                <button
                  key={type}
                  onClick={() => handleSelectType(type as IssueType)}
                  className={cn(
                    'flex items-center gap-3 p-4 rounded-lg border text-left',
                    'hover:bg-muted/50 transition-colors',
                    selectedType === type && 'border-blue-500 bg-blue-50 dark:bg-blue-950/30'
                  )}
                >
                  <span className="text-2xl">{config.icon}</span>
                  <div>
                    <div className="font-medium">{config.label}</div>
                    <div className="text-sm text-muted-foreground">{config.description}</div>
                  </div>
                </button>
              ))}
              <div className="mt-4 flex justify-end">
                <Button variant="ghost" onClick={onClose}>
                  取消
                </Button>
              </div>
            </CardContent>
          </>
        )}

        {/* 步骤2: 描述问题 */}
        {step === 'describe' && selectedType && (
          <>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <span className="text-2xl">{ISSUE_TYPE_CONFIG[selectedType].icon}</span>
                {ISSUE_TYPE_CONFIG[selectedType].label}
              </CardTitle>
              <CardDescription>
                简单描述一下您遇到的问题（可选）
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <Textarea
                placeholder="例如：点击提交按钮后页面一直加载中..."
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                rows={4}
              />

              {/* 快速修复提示 */}
              <div className="bg-yellow-50 dark:bg-yellow-950/30 border border-yellow-200 dark:border-yellow-800 rounded-lg p-4">
                <div className="flex items-start gap-3">
                  <span className="text-xl">💡</span>
                  <div>
                    <div className="font-medium text-yellow-700 dark:text-yellow-300 mb-2">
                      先试试这些方法
                    </div>
                    <ul className="text-sm text-yellow-600 dark:text-yellow-400 space-y-1">
                      {ISSUE_TYPE_CONFIG[selectedType].quickFixes.map((fix, index) => (
                        <li key={index}>• {fix}</li>
                      ))}
                    </ul>
                  </div>
                </div>
              </div>

              <div className="flex gap-2 justify-end">
                <Button variant="outline" onClick={() => setStep('select_type')}>
                  返回
                </Button>
                <Button onClick={handleSubmit} disabled={isSubmitting}>
                  {isSubmitting ? '正在分析...' : '提交并诊断'}
                </Button>
              </div>
            </CardContent>
          </>
        )}

        {/* 步骤3: 诊断中 */}
        {step === 'diagnosing' && (
          <CardContent className="py-12 text-center">
            <div className="text-6xl mb-4 animate-pulse">🔍</div>
            <h3 className="text-xl font-semibold mb-2">正在智能诊断...</h3>
            <p className="text-muted-foreground">
              系统正在分析问题原因，请稍候
            </p>
            <div className="mt-6 flex justify-center gap-2">
              <div className="w-2 h-2 rounded-full bg-blue-500 animate-bounce" style={{ animationDelay: '0ms' }} />
              <div className="w-2 h-2 rounded-full bg-blue-500 animate-bounce" style={{ animationDelay: '150ms' }} />
              <div className="w-2 h-2 rounded-full bg-blue-500 animate-bounce" style={{ animationDelay: '300ms' }} />
            </div>
          </CardContent>
        )}

        {/* 步骤4: 诊断结果 */}
        {step === 'result' && report && (
          <>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                {report.diagnosis?.canAutoFix ? (
                  <>
                    <span className="text-2xl">✅</span>
                    找到解决方案
                  </>
                ) : report.diagnosis?.needsHumanSupport ? (
                  <>
                    <span className="text-2xl">👨‍💻</span>
                    需要人工处理
                  </>
                ) : (
                  <>
                    <span className="text-2xl">📋</span>
                    诊断完成
                  </>
                )}
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* 可能的原因 */}
              {report.diagnosis && report.diagnosis.possibleCauses.length > 0 && (
                <div className="space-y-2">
                  <h4 className="font-medium flex items-center gap-2">
                    <span>🔎</span> 可能的原因
                  </h4>
                  <div className="space-y-2">
                    {report.diagnosis.possibleCauses.slice(0, 3).map((cause, index) => (
                      <div
                        key={index}
                        className={cn(
                          'flex items-center justify-between p-3 rounded-lg',
                          index === 0 ? 'bg-blue-50 dark:bg-blue-950/30' : 'bg-muted/50'
                        )}
                      >
                        <span>{cause.cause}</span>
                        <span className="text-sm text-muted-foreground">
                          {cause.probability}% 可能
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* 自动修复结果 */}
              {autoFixResult && (
                <div className={cn(
                  'p-4 rounded-lg',
                  autoFixResult.success
                    ? 'bg-green-50 dark:bg-green-950/30 border border-green-200 dark:border-green-800'
                    : 'bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-800'
                )}>
                  <div className="flex items-start gap-3">
                    <span className="text-2xl">{autoFixResult.success ? '✅' : '❌'}</span>
                    <div>
                      <div className="font-medium">
                        {autoFixResult.success ? '修复已执行' : '修复失败'}
                      </div>
                      <div className="text-sm text-muted-foreground">
                        {autoFixResult.message}
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* 自动修复建议 */}
              {!autoFixResult && report.diagnosis?.canAutoFix && report.diagnosis.autoFixSuggestions[0] && (
                <div className="bg-green-50 dark:bg-green-950/30 border border-green-200 dark:border-green-800 rounded-lg p-4">
                  <div className="flex items-start gap-3">
                    <span className="text-2xl">🔧</span>
                    <div className="flex-1">
                      <div className="font-medium text-green-700 dark:text-green-300">
                        {report.diagnosis.autoFixSuggestions[0].title}
                      </div>
                      <div className="text-sm text-green-600 dark:text-green-400 mb-3">
                        {report.diagnosis.autoFixSuggestions[0].description}
                      </div>
                      <Button
                        size="sm"
                        onClick={handleAutoFix}
                        disabled={isSubmitting}
                      >
                        {isSubmitting ? '执行中...' : '一键修复'}
                      </Button>
                    </div>
                  </div>
                </div>
              )}

              {/* 手动修复步骤 */}
              {report.diagnosis && report.diagnosis.manualFixSteps.length > 0 && (
                <div className="space-y-2">
                  <h4 className="font-medium flex items-center gap-2">
                    <span>📝</span> 手动解决步骤
                  </h4>
                  <ol className="space-y-2 pl-6 list-decimal text-sm text-muted-foreground">
                    {report.diagnosis.manualFixSteps.map((step, index) => (
                      <li key={index}>{step}</li>
                    ))}
                  </ol>
                </div>
              )}

              {/* 需要人工支持 */}
              {report.diagnosis?.needsHumanSupport && (
                <div className="bg-orange-50 dark:bg-orange-950/30 border border-orange-200 dark:border-orange-800 rounded-lg p-4">
                  <div className="flex items-start gap-3">
                    <span className="text-2xl">👨‍💻</span>
                    <div>
                      <div className="font-medium text-orange-700 dark:text-orange-300">
                        已通知客服团队
                      </div>
                      <div className="text-sm text-orange-600 dark:text-orange-400">
                        问题编号：{report.id}
                        <br />
                        预计响应时间：{report.diagnosis.estimatedFixTime} 分钟内
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* 操作按钮 */}
              <div className="flex gap-2 justify-end pt-4">
                <Button variant="outline" onClick={onClose}>
                  关闭
                </Button>
                {!report.diagnosis?.needsHumanSupport && (
                  <Button
                    variant="ghost"
                    onClick={() => {
                      // 联系客服
                      const summary = issueReporter.generateReportSummary(report)
                      const mailtoUrl = `mailto:support@thinkus.app?subject=${encodeURIComponent(`问题反馈 #${report.id}`)}&body=${encodeURIComponent(summary)}`
                      window.open(mailtoUrl)
                    }}
                  >
                    联系客服
                  </Button>
                )}
              </div>
            </CardContent>
          </>
        )}
      </Card>
    </div>
  )
}

/**
 * 报障悬浮按钮
 */
export function IssueReportButton({
  onClick,
  className
}: {
  onClick: () => void
  className?: string
}) {
  return (
    <button
      onClick={onClick}
      className={cn(
        'fixed bottom-6 left-6 z-50',
        'w-12 h-12 rounded-full',
        'bg-orange-500 hover:bg-orange-600',
        'text-white text-xl',
        'shadow-lg hover:shadow-xl',
        'transition-all hover:scale-110',
        'flex items-center justify-center',
        className
      )}
      title="遇到问题？点击反馈"
    >
      🆘
    </button>
  )
}
