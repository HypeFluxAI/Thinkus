'use client'

import { useState, useEffect, useCallback, Component, ReactNode } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle, CardFooter } from '@/components/ui/card'
import { cn } from '@/lib/utils'
import { translateError, getErrorTranslator } from '@/lib/services/error-translator'
import { SEVERITY_CONFIG } from '@/lib/errors/friendly-errors'
import type { FriendlyError, ErrorSeverity } from '@/lib/errors/friendly-errors'

interface FriendlyErrorProps {
  /** 原始错误信息 */
  error: string | Error
  /** 重试回调 */
  onRetry?: () => void | Promise<void>
  /** 联系客服回调 */
  onContactSupport?: () => void
  /** 关闭回调 */
  onClose?: () => void
  /** 是否显示技术详情 */
  showTechnicalDetails?: boolean
  /** 自定义样式 */
  className?: string
  /** 是否紧凑模式 */
  compact?: boolean
}

/**
 * 友好错误展示组件
 * 大图标 + 简短标题 + 通俗描述 + 建议操作
 */
export function FriendlyError({
  error,
  onRetry,
  onContactSupport,
  onClose,
  showTechnicalDetails = false,
  className,
  compact = false,
}: FriendlyErrorProps) {
  const [isRetrying, setIsRetrying] = useState(false)
  const [countdown, setCountdown] = useState(0)
  const [showDetails, setShowDetails] = useState(false)

  const errorMessage = error instanceof Error ? error.message : error
  const translated = translateError(errorMessage)
  const { friendly } = translated
  const retryConfig = getErrorTranslator().getRetryConfig(friendly.code)
  const severityConfig = SEVERITY_CONFIG[friendly.severity]

  // 倒计时逻辑
  useEffect(() => {
    if (countdown <= 0) return

    const timer = setInterval(() => {
      setCountdown(prev => {
        if (prev <= 1) {
          clearInterval(timer)
          return 0
        }
        return prev - 1
      })
    }, 1000)

    return () => clearInterval(timer)
  }, [countdown])

  // 处理重试
  const handleRetry = useCallback(async () => {
    if (!onRetry || isRetrying) return

    setIsRetrying(true)
    try {
      await onRetry()
    } catch {
      // 重试失败，启动倒计时
      if (retryConfig.canRetry) {
        getErrorTranslator().incrementRetryCount(friendly.code)
        setCountdown(retryConfig.delay)
      }
    } finally {
      setIsRetrying(false)
    }
  }, [onRetry, isRetrying, retryConfig, friendly.code])

  // 紧凑模式
  if (compact) {
    return (
      <div
        className={cn(
          'flex items-center gap-3 p-3 rounded-lg border',
          severityConfig.bgColor,
          severityConfig.borderColor,
          className
        )}
      >
        <span className="text-2xl">{friendly.icon}</span>
        <div className="flex-1 min-w-0">
          <p className={cn('font-medium', severityConfig.color)}>{friendly.title}</p>
          <p className="text-sm text-muted-foreground truncate">{friendly.description}</p>
        </div>
        {retryConfig.canRetry && onRetry && (
          <Button
            size="sm"
            variant="outline"
            onClick={handleRetry}
            disabled={isRetrying || countdown > 0}
          >
            {countdown > 0 ? `${countdown}s` : isRetrying ? '重试中...' : '重试'}
          </Button>
        )}
      </div>
    )
  }

  return (
    <Card className={cn('overflow-hidden', className)}>
      <div className={cn('h-1', severityConfig.bgColor.replace('bg-', 'bg-'))} />
      <CardHeader className="text-center pb-2">
        <div className="text-5xl mb-4">{friendly.icon}</div>
        <CardTitle className={cn('text-xl', severityConfig.color)}>
          {friendly.title}
        </CardTitle>
      </CardHeader>
      <CardContent className="text-center space-y-4">
        <p className="text-muted-foreground">{friendly.description}</p>
        
        <div className={cn(
          'rounded-lg p-3',
          severityConfig.bgColor,
          'border',
          severityConfig.borderColor
        )}>
          <p className="text-sm font-medium">建议操作</p>
          <p className={cn('text-sm', severityConfig.color)}>{friendly.suggestion}</p>
        </div>

        {/* 倒计时显示 */}
        {countdown > 0 && (
          <div className="flex items-center justify-center gap-2 text-muted-foreground">
            <div className="w-8 h-8 rounded-full border-2 border-primary flex items-center justify-center text-sm font-bold">
              {countdown}
            </div>
            <span className="text-sm">秒后可以重试</span>
          </div>
        )}

        {/* 技术详情 */}
        {showTechnicalDetails && (
          <div className="pt-2">
            <button
              onClick={() => setShowDetails(!showDetails)}
              className="text-xs text-muted-foreground hover:text-foreground transition-colors"
            >
              {showDetails ? '隐藏技术详情' : '查看技术详情'}
            </button>
            {showDetails && (
              <div className="mt-2 p-2 bg-muted rounded text-xs text-left font-mono overflow-auto max-h-32">
                <p><strong>错误代码:</strong> {friendly.code}</p>
                <p><strong>分类:</strong> {friendly.category}</p>
                <p><strong>原始信息:</strong> {errorMessage}</p>
              </div>
            )}
          </div>
        )}
      </CardContent>
      <CardFooter className="flex justify-center gap-3 pt-0">
        {retryConfig.canRetry && onRetry && (
          <Button
            onClick={handleRetry}
            disabled={isRetrying || countdown > 0}
            className="min-w-24"
          >
            {countdown > 0 ? `${countdown}秒后重试` : isRetrying ? '重试中...' : '重试'}
          </Button>
        )}
        {onContactSupport && (
          <Button variant="outline" onClick={onContactSupport}>
            联系客服
          </Button>
        )}
        {onClose && (
          <Button variant="ghost" onClick={onClose}>
            关闭
          </Button>
        )}
      </CardFooter>
    </Card>
  )
}

/**
 * 内联友好错误组件（用于表单等场景）
 */
export function FriendlyErrorInline({
  error,
  onRetry,
  className,
}: {
  error: string | Error
  onRetry?: () => void
  className?: string
}) {
  const errorMessage = error instanceof Error ? error.message : error
  const translated = translateError(errorMessage)
  const { friendly } = translated
  const severityConfig = SEVERITY_CONFIG[friendly.severity]

  return (
    <div
      className={cn(
        'flex items-start gap-2 p-2 rounded-md text-sm',
        severityConfig.bgColor,
        severityConfig.borderColor,
        'border',
        className
      )}
    >
      <span>{friendly.icon}</span>
      <div className="flex-1">
        <span className={cn('font-medium', severityConfig.color)}>{friendly.title}</span>
        <span className="text-muted-foreground"> - {friendly.suggestion}</span>
      </div>
      {friendly.canRetry && onRetry && (
        <button
          onClick={onRetry}
          className={cn('underline hover:no-underline', severityConfig.color)}
        >
          重试
        </button>
      )}
    </div>
  )
}

/**
 * 错误边界组件
 */
interface FriendlyErrorBoundaryProps {
  children: ReactNode
  fallback?: ReactNode
  onError?: (error: Error, errorInfo: React.ErrorInfo) => void
  onReset?: () => void
}

interface FriendlyErrorBoundaryState {
  hasError: boolean
  error: Error | null
}

export class FriendlyErrorBoundary extends Component<
  FriendlyErrorBoundaryProps,
  FriendlyErrorBoundaryState
> {
  constructor(props: FriendlyErrorBoundaryProps) {
    super(props)
    this.state = { hasError: false, error: null }
  }

  static getDerivedStateFromError(error: Error): FriendlyErrorBoundaryState {
    return { hasError: true, error }
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error('FriendlyErrorBoundary caught an error:', error, errorInfo)
    this.props.onError?.(error, errorInfo)
  }

  handleReset = () => {
    this.setState({ hasError: false, error: null })
    this.props.onReset?.()
  }

  render() {
    if (this.state.hasError && this.state.error) {
      if (this.props.fallback) {
        return this.props.fallback
      }

      return (
        <div className="p-4">
          <FriendlyError
            error={this.state.error}
            onRetry={this.handleReset}
            showTechnicalDetails={process.env.NODE_ENV === 'development'}
          />
        </div>
      )
    }

    return this.props.children
  }
}

/**
 * Toast 风格的错误提示
 */
export function FriendlyErrorToast({
  error,
  onDismiss,
  autoHideDuration = 5000,
}: {
  error: string | Error
  onDismiss?: () => void
  autoHideDuration?: number
}) {
  const [visible, setVisible] = useState(true)

  const errorMessage = error instanceof Error ? error.message : error
  const translated = translateError(errorMessage)
  const { friendly } = translated
  const severityConfig = SEVERITY_CONFIG[friendly.severity]

  useEffect(() => {
    if (autoHideDuration > 0) {
      const timer = setTimeout(() => {
        setVisible(false)
        onDismiss?.()
      }, autoHideDuration)
      return () => clearTimeout(timer)
    }
  }, [autoHideDuration, onDismiss])

  if (!visible) return null

  return (
    <div
      className={cn(
        'fixed bottom-4 right-4 max-w-sm p-4 rounded-lg shadow-lg border animate-in slide-in-from-right-full',
        severityConfig.bgColor,
        severityConfig.borderColor
      )}
    >
      <div className="flex items-start gap-3">
        <span className="text-2xl">{friendly.icon}</span>
        <div className="flex-1">
          <p className={cn('font-medium', severityConfig.color)}>{friendly.title}</p>
          <p className="text-sm text-muted-foreground">{friendly.description}</p>
        </div>
        <button
          onClick={() => {
            setVisible(false)
            onDismiss?.()
          }}
          className="text-muted-foreground hover:text-foreground"
        >
          ✕
        </button>
      </div>
    </div>
  )
}

/**
 * 错误摘要卡片（用于仪表盘等）
 */
export function ErrorSummaryCard({ className }: { className?: string }) {
  const stats = getErrorTranslator().getErrorStats()

  if (stats.totalErrors === 0) {
    return (
      <Card className={className}>
        <CardContent className="flex items-center justify-center py-8">
          <div className="text-center text-muted-foreground">
            <span className="text-3xl">✨</span>
            <p className="mt-2">暂无错误记录</p>
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card className={className}>
      <CardHeader>
        <CardTitle className="text-lg">错误统计</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid grid-cols-4 gap-2 text-center text-sm">
          {Object.entries(stats.bySeverity).map(([severity, count]) => (
            <div key={severity}>
              <p className={cn('font-bold', SEVERITY_CONFIG[severity as ErrorSeverity].color)}>
                {count}
              </p>
              <p className="text-muted-foreground text-xs">
                {SEVERITY_CONFIG[severity as ErrorSeverity].label}
              </p>
            </div>
          ))}
        </div>
        {stats.topErrors.length > 0 && (
          <div>
            <p className="text-xs text-muted-foreground mb-2">常见错误</p>
            {stats.topErrors.slice(0, 3).map(err => (
              <div key={err.code} className="flex justify-between text-sm">
                <span className="truncate">{err.code}</span>
                <span className="text-muted-foreground">{err.count}次</span>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  )
}
