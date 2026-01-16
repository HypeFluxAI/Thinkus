'use client'

import React, { Component, type ReactNode } from 'react'
import { Button } from '@/components/ui/button'

interface DeliveryErrorBoundaryProps {
  children: ReactNode
  fallback?: ReactNode
  onError?: (error: Error, errorInfo: React.ErrorInfo) => void
  onReset?: () => void
}

interface DeliveryErrorBoundaryState {
  hasError: boolean
  error: Error | null
  errorInfo: React.ErrorInfo | null
}

/**
 * 交付系统错误边界组件
 * 捕获子组件中的错误，显示友好的错误界面
 */
export class DeliveryErrorBoundary extends Component<
  DeliveryErrorBoundaryProps,
  DeliveryErrorBoundaryState
> {
  constructor(props: DeliveryErrorBoundaryProps) {
    super(props)
    this.state = {
      hasError: false,
      error: null,
      errorInfo: null,
    }
  }

  static getDerivedStateFromError(error: Error): Partial<DeliveryErrorBoundaryState> {
    return { hasError: true, error }
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    this.setState({ errorInfo })
    this.props.onError?.(error, errorInfo)

    // 记录错误到控制台
    console.error('交付组件错误:', error, errorInfo)
  }

  handleReset = () => {
    this.setState({
      hasError: false,
      error: null,
      errorInfo: null,
    })
    this.props.onReset?.()
  }

  render() {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return this.props.fallback
      }

      return (
        <div className="rounded-2xl border border-red-200 bg-red-50 p-8 text-center">
          <div className="text-5xl mb-4">😵</div>
          <h3 className="text-lg font-semibold text-red-800 mb-2">
            哎呀，出了点问题
          </h3>
          <p className="text-sm text-red-600 mb-6">
            页面遇到了一些技术问题，我们正在努力修复
          </p>

          <div className="flex items-center justify-center gap-4">
            <Button
              variant="outline"
              onClick={this.handleReset}
              className="border-red-300 text-red-700 hover:bg-red-100"
            >
              重试
            </Button>
            <Button
              onClick={() => window.location.reload()}
              className="bg-red-600 hover:bg-red-700"
            >
              刷新页面
            </Button>
          </div>

          {process.env.NODE_ENV === 'development' && this.state.error && (
            <details className="mt-6 text-left">
              <summary className="cursor-pointer text-sm text-red-600 hover:text-red-800">
                查看技术详情
              </summary>
              <pre className="mt-2 p-4 bg-red-100 rounded text-xs text-red-800 overflow-auto max-h-48">
                {this.state.error.toString()}
                {this.state.errorInfo?.componentStack}
              </pre>
            </details>
          )}
        </div>
      )
    }

    return this.props.children
  }
}

/**
 * 交付加载状态组件
 */
export function DeliveryLoadingSkeleton({
  type = 'card',
  className = '',
}: {
  type?: 'card' | 'list' | 'progress' | 'inline'
  className?: string
}) {
  if (type === 'inline') {
    return (
      <span className={`inline-flex items-center gap-2 ${className}`}>
        <span className="w-4 h-4 rounded-full bg-gray-200 animate-pulse" />
        <span className="w-20 h-4 rounded bg-gray-200 animate-pulse" />
      </span>
    )
  }

  if (type === 'progress') {
    return (
      <div className={`rounded-2xl bg-white p-8 shadow-lg ${className}`}>
        <div className="flex items-center gap-4 mb-6">
          <div className="w-16 h-16 rounded-full bg-gray-200 animate-pulse" />
          <div className="flex-1">
            <div className="w-32 h-6 rounded bg-gray-200 animate-pulse mb-2" />
            <div className="w-48 h-4 rounded bg-gray-200 animate-pulse" />
          </div>
        </div>
        <div className="w-full h-3 rounded-full bg-gray-200 animate-pulse mb-4" />
        <div className="flex justify-between">
          <div className="w-20 h-4 rounded bg-gray-200 animate-pulse" />
          <div className="w-16 h-4 rounded bg-gray-200 animate-pulse" />
        </div>
      </div>
    )
  }

  if (type === 'list') {
    return (
      <div className={`space-y-4 ${className}`}>
        {[1, 2, 3].map((i) => (
          <div key={i} className="flex items-center gap-4 p-4 rounded-lg bg-white">
            <div className="w-10 h-10 rounded-full bg-gray-200 animate-pulse" />
            <div className="flex-1">
              <div className="w-48 h-4 rounded bg-gray-200 animate-pulse mb-2" />
              <div className="w-32 h-3 rounded bg-gray-200 animate-pulse" />
            </div>
            <div className="w-16 h-8 rounded bg-gray-200 animate-pulse" />
          </div>
        ))}
      </div>
    )
  }

  // card type (default)
  return (
    <div className={`rounded-2xl bg-white p-6 shadow ${className}`}>
      <div className="flex items-center gap-3 mb-4">
        <div className="w-8 h-8 rounded bg-gray-200 animate-pulse" />
        <div className="w-32 h-5 rounded bg-gray-200 animate-pulse" />
      </div>
      <div className="space-y-3">
        <div className="w-full h-4 rounded bg-gray-200 animate-pulse" />
        <div className="w-3/4 h-4 rounded bg-gray-200 animate-pulse" />
        <div className="w-1/2 h-4 rounded bg-gray-200 animate-pulse" />
      </div>
    </div>
  )
}

/**
 * 交付空状态组件
 */
export function DeliveryEmptyState({
  icon = '📭',
  title = '暂无数据',
  description = '这里空空如也',
  action,
  actionLabel = '开始',
  className = '',
}: {
  icon?: string
  title?: string
  description?: string
  action?: () => void
  actionLabel?: string
  className?: string
}) {
  return (
    <div className={`rounded-2xl bg-gray-50 border-2 border-dashed border-gray-200 p-12 text-center ${className}`}>
      <div className="text-5xl mb-4">{icon}</div>
      <h3 className="text-lg font-semibold text-gray-700 mb-2">{title}</h3>
      <p className="text-sm text-gray-500 mb-6">{description}</p>
      {action && (
        <Button onClick={action}>
          {actionLabel}
        </Button>
      )}
    </div>
  )
}

/**
 * 交付成功状态组件
 */
export function DeliverySuccessState({
  icon = '🎉',
  title = '操作成功',
  description = '已成功完成',
  action,
  actionLabel = '继续',
  secondaryAction,
  secondaryActionLabel = '返回',
  className = '',
}: {
  icon?: string
  title?: string
  description?: string
  action?: () => void
  actionLabel?: string
  secondaryAction?: () => void
  secondaryActionLabel?: string
  className?: string
}) {
  return (
    <div className={`rounded-2xl bg-green-50 border border-green-200 p-12 text-center ${className}`}>
      <div className="text-6xl mb-4 animate-bounce">{icon}</div>
      <h3 className="text-xl font-bold text-green-800 mb-2">{title}</h3>
      <p className="text-sm text-green-600 mb-6">{description}</p>
      <div className="flex items-center justify-center gap-4">
        {secondaryAction && (
          <Button variant="outline" onClick={secondaryAction}>
            {secondaryActionLabel}
          </Button>
        )}
        {action && (
          <Button onClick={action} className="bg-green-600 hover:bg-green-700">
            {actionLabel}
          </Button>
        )}
      </div>
    </div>
  )
}

/**
 * 交付警告提示组件
 */
export function DeliveryWarning({
  icon = '⚠️',
  title,
  description,
  action,
  actionLabel = '了解详情',
  dismissible = true,
  onDismiss,
  className = '',
}: {
  icon?: string
  title: string
  description?: string
  action?: () => void
  actionLabel?: string
  dismissible?: boolean
  onDismiss?: () => void
  className?: string
}) {
  return (
    <div className={`relative rounded-xl bg-amber-50 border border-amber-200 p-4 ${className}`}>
      {dismissible && (
        <button
          onClick={onDismiss}
          className="absolute top-2 right-2 text-amber-400 hover:text-amber-600"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      )}
      <div className="flex items-start gap-3">
        <span className="text-2xl flex-shrink-0">{icon}</span>
        <div className="flex-1 min-w-0">
          <h4 className="font-medium text-amber-800">{title}</h4>
          {description && (
            <p className="text-sm text-amber-700 mt-1">{description}</p>
          )}
          {action && (
            <button
              onClick={action}
              className="text-sm text-amber-600 hover:text-amber-800 underline mt-2"
            >
              {actionLabel}
            </button>
          )}
        </div>
      </div>
    </div>
  )
}

/**
 * 交付信息提示组件
 */
export function DeliveryInfo({
  icon = '💡',
  title,
  description,
  className = '',
}: {
  icon?: string
  title?: string
  description: string
  className?: string
}) {
  return (
    <div className={`rounded-xl bg-blue-50 border border-blue-200 p-4 ${className}`}>
      <div className="flex items-start gap-3">
        <span className="text-xl flex-shrink-0">{icon}</span>
        <div className="flex-1 min-w-0">
          {title && (
            <h4 className="font-medium text-blue-800 mb-1">{title}</h4>
          )}
          <p className="text-sm text-blue-700">{description}</p>
        </div>
      </div>
    </div>
  )
}
