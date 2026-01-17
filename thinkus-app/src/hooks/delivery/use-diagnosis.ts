'use client'

import { useState, useCallback } from 'react'
import type { DiagnosisReport, DiagnosisConfig } from '@/lib/services'

interface UseDiagnosisOptions {
  projectId: string
  onComplete?: (report: DiagnosisReport) => void
  onError?: (error: string) => void
}

interface UseDiagnosisReturn {
  report: DiagnosisReport | null
  isRunning: boolean
  progress: number
  currentStep: string | null
  error: string | null
  startDiagnosis: (config?: DiagnosisConfig) => Promise<void>
  sendToSupport: (message?: string) => Promise<void>
  generateHtml: () => Promise<string | null>
  reset: () => void
}

// 诊断步骤
const DIAGNOSIS_STEPS = [
  { key: 'browser', label: '收集浏览器信息' },
  { key: 'network', label: '检测网络状态' },
  { key: 'performance', label: '分析性能指标' },
  { key: 'storage', label: '检查存储空间' },
  { key: 'errors', label: '收集错误日志' },
  { key: 'api', label: '检测API状态' },
  { key: 'analyzing', label: '分析诊断结果' },
]

/**
 * 一键诊断 Hook
 */
export function useDiagnosis({
  projectId,
  onComplete,
  onError
}: UseDiagnosisOptions): UseDiagnosisReturn {
  const [report, setReport] = useState<DiagnosisReport | null>(null)
  const [isRunning, setIsRunning] = useState(false)
  const [progress, setProgress] = useState(0)
  const [currentStep, setCurrentStep] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  // 收集客户端浏览器信息
  const collectBrowserInfo = useCallback(() => {
    const nav = navigator as Navigator & {
      connection?: {
        effectiveType?: string
        downlink?: number
        rtt?: number
      }
    }

    return {
      name: getBrowserName(),
      version: getBrowserVersion(),
      platform: navigator.platform,
      language: navigator.language,
      screenResolution: `${window.screen.width}x${window.screen.height}`,
      viewportSize: `${window.innerWidth}x${window.innerHeight}`,
      cookiesEnabled: navigator.cookieEnabled,
      doNotTrack: navigator.doNotTrack === '1',
    }
  }, [])

  // 收集网络信息
  const collectNetworkInfo = useCallback(() => {
    const nav = navigator as Navigator & {
      connection?: {
        effectiveType?: string
        downlink?: number
        rtt?: number
      }
    }

    return {
      online: navigator.onLine,
      connectionType: nav.connection?.effectiveType || 'unknown',
      downlink: nav.connection?.downlink || 0,
      rtt: nav.connection?.rtt || 0,
    }
  }, [])

  // 收集性能信息
  const collectPerformanceInfo = useCallback(() => {
    const perf = performance as Performance & {
      memory?: {
        usedJSHeapSize: number
        totalJSHeapSize: number
      }
    }
    const timing = performance.timing

    return {
      loadTime: timing.loadEventEnd - timing.navigationStart,
      domReady: timing.domContentLoadedEventEnd - timing.navigationStart,
      memoryUsage: perf.memory?.usedJSHeapSize || 0,
    }
  }, [])

  // 开始诊断
  const startDiagnosis = useCallback(async (config?: DiagnosisConfig) => {
    setIsRunning(true)
    setProgress(0)
    setError(null)

    try {
      // 模拟步骤进度
      for (let i = 0; i < DIAGNOSIS_STEPS.length - 1; i++) {
        setCurrentStep(DIAGNOSIS_STEPS[i].label)
        setProgress(((i + 1) / DIAGNOSIS_STEPS.length) * 80)
        await new Promise(resolve => setTimeout(resolve, 500))
      }

      setCurrentStep(DIAGNOSIS_STEPS[DIAGNOSIS_STEPS.length - 1].label)
      setProgress(90)

      // 收集客户端信息
      const browserInfo = collectBrowserInfo()
      const networkInfo = collectNetworkInfo()
      const performanceInfo = collectPerformanceInfo()

      // 调用后端诊断
      const response = await fetch(`/api/delivery/${projectId}/diagnosis`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          clientData: {
            browser: browserInfo,
            network: networkInfo,
            performance: performanceInfo,
          },
          config,
        })
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || '诊断失败')
      }

      const data = await response.json()

      // 合并客户端信息
      const finalReport: DiagnosisReport = {
        ...data.report,
        browser: { ...data.report.browser, ...browserInfo },
        network: { ...data.report.network, ...networkInfo },
        performance: { ...data.report.performance, ...performanceInfo },
      }

      setReport(finalReport)
      setProgress(100)
      setCurrentStep(null)
      onComplete?.(finalReport)
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : '诊断失败'
      setError(errorMessage)
      onError?.(errorMessage)
    } finally {
      setIsRunning(false)
    }
  }, [projectId, collectBrowserInfo, collectNetworkInfo, collectPerformanceInfo, onComplete, onError])

  // 发送给客服
  const sendToSupport = useCallback(async (message?: string) => {
    if (!report) {
      setError('没有诊断报告')
      return
    }

    try {
      const response = await fetch('/api/delivery/diagnosis', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'sendToSupport',
          reportId: report.id,
          supportRequest: { message }
        })
      })

      const data = await response.json()

      if (!data.success) {
        throw new Error(data.error)
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : '发送失败')
    }
  }, [report])

  // 生成HTML报告
  const generateHtml = useCallback(async (): Promise<string | null> => {
    if (!report) {
      setError('没有诊断报告')
      return null
    }

    try {
      const response = await fetch('/api/delivery/diagnosis', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'generateHtml',
          reportId: report.id
        })
      })

      const data = await response.json()

      if (!data.success) {
        throw new Error(data.error)
      }

      return data.data.html
    } catch (err) {
      setError(err instanceof Error ? err.message : '生成报告失败')
      return null
    }
  }, [report])

  // 重置
  const reset = useCallback(() => {
    setReport(null)
    setProgress(0)
    setCurrentStep(null)
    setError(null)
  }, [])

  return {
    report,
    isRunning,
    progress,
    currentStep,
    error,
    startDiagnosis,
    sendToSupport,
    generateHtml,
    reset
  }
}

// 辅助函数
function getBrowserName(): string {
  const ua = navigator.userAgent
  if (ua.includes('Chrome')) return 'Chrome'
  if (ua.includes('Firefox')) return 'Firefox'
  if (ua.includes('Safari')) return 'Safari'
  if (ua.includes('Edge')) return 'Edge'
  if (ua.includes('Opera')) return 'Opera'
  return 'Unknown'
}

function getBrowserVersion(): string {
  const ua = navigator.userAgent
  const match = ua.match(/(Chrome|Firefox|Safari|Edge|Opera)[\/\s](\d+)/i)
  return match ? match[2] : 'Unknown'
}
