'use client'

import { cn } from '@/lib/utils'
import type { DetectedMode } from '@/lib/optimizations'

interface ModeActivationProps {
  mode: DetectedMode
  message: string
  className?: string
  onDismiss?: () => void
}

const modeConfig: Record<DetectedMode, {
  icon: string
  title: string
  gradient: string
  bgColor: string
}> = {
  ultrawork: {
    icon: '🚀',
    title: '全力模式',
    gradient: 'from-orange-500 to-red-500',
    bgColor: 'bg-orange-50 dark:bg-orange-900/20'
  },
  search: {
    icon: '🔍',
    title: '搜索模式',
    gradient: 'from-blue-500 to-cyan-500',
    bgColor: 'bg-blue-50 dark:bg-blue-900/20'
  },
  analyze: {
    icon: '📊',
    title: '分析模式',
    gradient: 'from-purple-500 to-pink-500',
    bgColor: 'bg-purple-50 dark:bg-purple-900/20'
  }
}

export function ModeActivation({ mode, message, className, onDismiss }: ModeActivationProps) {
  const config = modeConfig[mode]

  return (
    <div
      className={cn(
        'rounded-lg border overflow-hidden animate-in slide-in-from-top-2 duration-300',
        config.bgColor,
        className
      )}
    >
      <div className={cn('h-1 bg-gradient-to-r', config.gradient)} />

      <div className="p-4">
        <div className="flex items-start justify-between gap-4">
          <div className="flex items-start gap-3">
            <span className="text-2xl">{config.icon}</span>
            <div>
              <h4 className="font-medium text-sm mb-1">
                「{config.title}」已启动
              </h4>
              <pre className="text-xs text-muted-foreground whitespace-pre-wrap font-mono">
                {message}
              </pre>
            </div>
          </div>

          {onDismiss && (
            <button
              onClick={onDismiss}
              className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors"
              aria-label="关闭"
            >
              <svg
                className="w-4 h-4"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M6 18L18 6M6 6l12 12"
                />
              </svg>
            </button>
          )}
        </div>
      </div>
    </div>
  )
}

export function ModeIndicator({ mode }: { mode: DetectedMode }) {
  const config = modeConfig[mode]

  return (
    <div
      className={cn(
        'inline-flex items-center gap-1.5 px-2 py-1 rounded-full text-xs font-medium',
        config.bgColor
      )}
    >
      <span>{config.icon}</span>
      <span>{config.title}</span>
      <span className="relative flex h-2 w-2">
        <span
          className={cn(
            'animate-ping absolute inline-flex h-full w-full rounded-full opacity-75',
            `bg-gradient-to-r ${config.gradient}`
          )}
        />
        <span
          className={cn(
            'relative inline-flex rounded-full h-2 w-2',
            `bg-gradient-to-r ${config.gradient}`
          )}
        />
      </span>
    </div>
  )
}
