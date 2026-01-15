'use client'

import * as React from 'react'
import { useState, useEffect, useCallback } from 'react'
import { cn } from '@/lib/utils'
import { Button } from './button'
import { Card, CardContent } from './card'
import {
  errorTranslator,
  TranslatedError,
  translateError
} from '@/lib/services/error-translator'
import { SEVERITY_CONFIG, ErrorSeverity } from '@/lib/errors/friendly-errors'

export interface FriendlyErrorProps {
  /** 错误信息（可以是 Error 对象、字符串或任意对象） */
  error: unknown
  /** 重试回调 */
  onRetry?: () => void | Promise<void>
  /** 联系客服回调 */
  onContactSupport?: () => void
  /** 关闭回调 */
  onDismiss?: () => void
  /** 自定义样式 */
  className?: string
  /** 是否显示详细信息（用于调试） */
  showDetails?: boolean
  /** 是否自动重试 */
  autoRetry?: boolean
  /** 是否显示客服入口 */
  showSupport?: boolean
  /** 客服邮箱 */
  supportEmail?: string
  /** 尺寸 */
  size?: 'sm' | 'md' | 'lg'
}

/**
 * 友好错误展示组件
 * 将技术错误翻译为小白用户能理解的人话
 */
export function FriendlyError({
  error,
  onRetry,
  onContactSupport,
  onDismiss,
  className,
  showDetails = false,
  autoRetry = false,
  showSupport = true,
  supportEmail = 'support@thinkus.app',
  size = 'md'
}: FriendlyErrorProps) {
  const [translatedError, setTranslatedError] = useState<TranslatedError | null>(null)
  const [countdown, setCountdown] = useState<number>(0)
  const [isRetrying, setIsRetrying] = useState(false)
  const [showOriginal, setShowOriginal] = useState(false)

  // 翻译错误
  useEffect(() => {
    const translated = translateError(error)
    setTranslatedError(translated)

    // 如果启用自动重试且可重试
    if (autoRetry && translated.retryConfig?.canRetry) {
      setCountdown(translated.retryConfig.retryDelay)
    }
  }, [error, autoRetry])

  // 倒计时逻辑
  useEffect(() => {
    if (countdown <= 0) return

    const timer = setInterval(() => {
      setCountdown(prev => {
        if (prev <= 1) {
          // 倒计时结束，触发自动重试
          if (autoRetry && onRetry) {
            handleRetry()
          }
          return 0
        }
        return prev - 1
      })
    }, 1000)

    return () => clearInterval(timer)
  }, [countdown, autoRetry, onRetry])

  // 处理重试
  const handleRetry = useCallback(async () => {
    if (!onRetry || !translatedError || isRetrying) return

    setIsRetrying(true)
    errorTranslator.recordRetry(translatedError.error.code)

    try {
      await onRetry()
      // 重试成功，重置计数
      errorTranslator.resetRetry(translatedError.error.code)
    } catch {
      // 重试失败，更新翻译
      const newTranslated = translateError(error)
      setTranslatedError(newTranslated)

      // 如果还可以重试，设置新的倒计时
      if (newTranslated.retryConfig?.canRetry) {
        setCountdown(newTranslated.retryConfig.retryDelay)
      }
    } finally {
      setIsRetrying(false)
    }
  }, [onRetry, translatedError, isRetrying, error])

  // 处理联系客服
  const handleContactSupport = useCallback(() => {
    if (onContactSupport) {
      onContactSupport()
    } else if (translatedError) {
      // 默认行为：打开邮件客户端
      const subject = encodeURIComponent(`问题反馈: ${translatedError.error.title}`)
      const body = encodeURIComponent(errorTranslator.generateErrorSummary(translatedError))
      window.open(`mailto:${supportEmail}?subject=${subject}&body=${body}`)
    }
  }, [onContactSupport, translatedError, supportEmail])

  if (!translatedError) return null

  const { error: friendlyError, retryConfig } = translatedError
  const severityConfig = SEVERITY_CONFIG[friendlyError.severity]

  // 尺寸配置
  const sizeConfig = {
    sm: {
      icon: 'text-3xl',
      title: 'text-base',
      description: 'text-sm',
      padding: 'p-4',
      gap: 'gap-3'
    },
    md: {
      icon: 'text-5xl',
      title: 'text-lg',
      description: 'text-base',
      padding: 'p-6',
      gap: 'gap-4'
    },
    lg: {
      icon: 'text-7xl',
      title: 'text-xl',
      description: 'text-lg',
      padding: 'p-8',
      gap: 'gap-5'
    }
  }

  const currentSize = sizeConfig[size]

  return (
    <Card
      className={cn(
        'border-2 transition-all duration-200',
        severityConfig.borderColor,
        severityConfig.bgColor,
        className
      )}
    >
      <CardContent className={cn('flex flex-col items-center text-center', currentSize.padding, currentSize.gap)}>
        {/* 图标 */}
        <div className={cn(currentSize.icon, 'animate-bounce-slow')}>
          {friendlyError.icon}
        </div>

        {/* 标题 */}
        <h3 className={cn('font-semibold', currentSize.title, severityConfig.color)}>
          {friendlyError.title}
        </h3>

        {/* 描述 */}
        <p className={cn('text-muted-foreground', currentSize.description)}>
          {friendlyError.description}
        </p>

        {/* 建议操作 */}
        <p className={cn('text-muted-foreground/80', currentSize.description)}>
          {friendlyError.suggestion}
        </p>

        {/* 倒计时提示 */}
        {countdown > 0 && (
          <p className="text-sm text-muted-foreground animate-pulse">
            {countdown} 秒后自动重试...
          </p>
        )}

        {/* 操作按钮 */}
        <div className="flex flex-wrap items-center justify-center gap-3 mt-2">
          {/* 重试按钮 */}
          {onRetry && retryConfig?.canRetry && (
            <Button
              onClick={handleRetry}
              disabled={isRetrying || countdown > 0}
              variant="default"
              size={size === 'sm' ? 'sm' : 'default'}
            >
              {isRetrying ? (
                <>
                  <span className="animate-spin mr-2">↻</span>
                  重试中...
                </>
              ) : countdown > 0 ? (
                `${countdown}秒后重试`
              ) : (
                '立即重试'
              )}
            </Button>
          )}

          {/* 联系客服 */}
          {showSupport && (
            <Button
              onClick={handleContactSupport}
              variant="outline"
              size={size === 'sm' ? 'sm' : 'default'}
            >
              联系客服
            </Button>
          )}

          {/* 关闭按钮 */}
          {onDismiss && (
            <Button
              onClick={onDismiss}
              variant="ghost"
              size={size === 'sm' ? 'sm' : 'default'}
            >
              关闭
            </Button>
          )}
        </div>

        {/* 重试次数提示 */}
        {retryConfig && retryConfig.currentRetry > 0 && (
          <p className="text-xs text-muted-foreground">
            已重试 {retryConfig.currentRetry}/{retryConfig.maxRetries} 次
          </p>
        )}

        {/* 详细信息（调试用） */}
        {showDetails && (
          <div className="w-full mt-4 pt-4 border-t border-dashed">
            <button
              onClick={() => setShowOriginal(!showOriginal)}
              className="text-xs text-muted-foreground hover:text-foreground transition-colors"
            >
              {showOriginal ? '隐藏技术详情 ▲' : '显示技术详情 ▼'}
            </button>
            {showOriginal && (
              <div className="mt-2 p-3 bg-muted/50 rounded-md text-left">
                <p className="text-xs font-mono text-muted-foreground break-all">
                  <span className="font-semibold">错误代码:</span> {friendlyError.code}
                </p>
                <p className="text-xs font-mono text-muted-foreground break-all mt-1">
                  <span className="font-semibold">原始信息:</span> {translatedError.originalMessage}
                </p>
                <p className="text-xs font-mono text-muted-foreground mt-1">
                  <span className="font-semibold">错误分类:</span> {friendlyError.category}
                </p>
                <p className="text-xs font-mono text-muted-foreground mt-1">
                  <span className="font-semibold">时间:</span> {translatedError.timestamp.toLocaleString('zh-CN')}
                </p>
              </div>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  )
}

/**
 * 内联友好错误（小型版本，适合Toast或列表项）
 */
export function FriendlyErrorInline({
  error,
  onRetry,
  onDismiss,
  className
}: Pick<FriendlyErrorProps, 'error' | 'onRetry' | 'onDismiss' | 'className'>) {
  const translatedError = translateError(error)
  const { error: friendlyError } = translatedError
  const severityConfig = SEVERITY_CONFIG[friendlyError.severity]

  return (
    <div
      className={cn(
        'flex items-center gap-3 p-3 rounded-lg border',
        severityConfig.borderColor,
        severityConfig.bgColor,
        className
      )}
    >
      <span className="text-2xl flex-shrink-0">{friendlyError.icon}</span>
      <div className="flex-1 min-w-0">
        <p className={cn('font-medium text-sm', severityConfig.color)}>
          {friendlyError.title}
        </p>
        <p className="text-xs text-muted-foreground truncate">
          {friendlyError.description}
        </p>
      </div>
      <div className="flex items-center gap-2 flex-shrink-0">
        {onRetry && translatedError.retryConfig?.canRetry && (
          <Button size="sm" variant="ghost" onClick={onRetry}>
            重试
          </Button>
        )}
        {onDismiss && (
          <Button size="sm" variant="ghost" onClick={onDismiss}>
            ✕
          </Button>
        )}
      </div>
    </div>
  )
}

/**
 * 错误边界的友好错误展示
 */
export function FriendlyErrorBoundary({
  error,
  resetErrorBoundary
}: {
  error: Error
  resetErrorBoundary: () => void
}) {
  return (
    <div className="min-h-[400px] flex items-center justify-center p-8">
      <FriendlyError
        error={error}
        onRetry={resetErrorBoundary}
        showDetails={process.env.NODE_ENV === 'development'}
        size="lg"
      />
    </div>
  )
}

// 自定义动画样式（添加到全局CSS或tailwind.config.js）
// @keyframes bounce-slow {
//   0%, 100% { transform: translateY(0); }
//   50% { transform: translateY(-10px); }
// }
// .animate-bounce-slow { animation: bounce-slow 2s infinite; }
