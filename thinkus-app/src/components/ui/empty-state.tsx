'use client'

import * as React from 'react'
import { cn } from '@/lib/utils'
import { Button } from './button'
import { LucideIcon, Inbox, FileText, Rocket, MessageSquare, Target, ListTodo, Users, FolderOpen } from 'lucide-react'

interface EmptyStateProps {
  icon?: LucideIcon
  title: string
  description?: string
  action?: {
    label: string
    onClick?: () => void
    href?: string
  }
  secondaryAction?: {
    label: string
    onClick?: () => void
    href?: string
  }
  variant?: 'default' | 'minimal' | 'card'
  className?: string
  children?: React.ReactNode
}

// Preset empty state configurations
export const emptyStatePresets = {
  projects: {
    icon: Rocket,
    title: '还没有项目',
    description: '创建你的第一个项目，让AI帮你实现想法',
  },
  discussions: {
    icon: MessageSquare,
    title: '暂无讨论',
    description: '发起一次讨论，让AI团队帮你分析方案',
  },
  decisions: {
    icon: Target,
    title: '暂无决策记录',
    description: '在讨论中做出的决策会自动记录在这里',
  },
  actionItems: {
    icon: ListTodo,
    title: '暂无行动项',
    description: '在讨论中产生的待办事项会自动添加到这里',
  },
  features: {
    icon: Rocket,
    title: '暂无功能清单',
    description: '完成需求讨论后会生成功能清单',
  },
  files: {
    icon: FolderOpen,
    title: '暂无文件',
    description: '项目相关的文件会显示在这里',
  },
  team: {
    icon: Users,
    title: '暂无团队成员',
    description: '邀请成员加入项目协作',
  },
  documents: {
    icon: FileText,
    title: '暂无文档',
    description: '项目文档会显示在这里',
  },
  generic: {
    icon: Inbox,
    title: '暂无数据',
    description: '这里还没有任何内容',
  },
} as const

export function EmptyState({
  icon: Icon = Inbox,
  title,
  description,
  action,
  secondaryAction,
  variant = 'default',
  className,
  children,
}: EmptyStateProps) {
  const ActionWrapper = action?.href ? 'a' : 'div'

  return (
    <div
      className={cn(
        'flex flex-col items-center justify-center text-center',
        variant === 'default' && 'py-12 px-4',
        variant === 'minimal' && 'py-8 px-4',
        variant === 'card' && 'py-12 px-6 rounded-lg border border-dashed bg-muted/20',
        className
      )}
    >
      {/* Animated icon container */}
      <div className={cn(
        'relative mb-4',
        variant === 'card' && 'mb-6'
      )}>
        {/* Background glow effect */}
        <div className="absolute inset-0 bg-primary/5 rounded-full blur-xl scale-150" />

        {/* Icon circle */}
        <div className={cn(
          'relative flex items-center justify-center rounded-full',
          'bg-gradient-to-br from-muted to-muted/50',
          'transition-transform duration-300 hover:scale-105',
          variant === 'default' && 'w-16 h-16',
          variant === 'minimal' && 'w-12 h-12',
          variant === 'card' && 'w-20 h-20',
        )}>
          <Icon className={cn(
            'text-muted-foreground/60',
            variant === 'default' && 'h-8 w-8',
            variant === 'minimal' && 'h-6 w-6',
            variant === 'card' && 'h-10 w-10',
          )} />
        </div>
      </div>

      {/* Title */}
      <h3 className={cn(
        'font-medium text-foreground',
        variant === 'default' && 'text-lg mb-2',
        variant === 'minimal' && 'text-base mb-1',
        variant === 'card' && 'text-xl mb-2',
      )}>
        {title}
      </h3>

      {/* Description */}
      {description && (
        <p className={cn(
          'text-muted-foreground max-w-sm',
          variant === 'default' && 'text-sm mb-6',
          variant === 'minimal' && 'text-xs mb-4',
          variant === 'card' && 'text-sm mb-6',
        )}>
          {description}
        </p>
      )}

      {/* Actions */}
      {(action || secondaryAction) && (
        <div className="flex items-center gap-3">
          {action && (
            action.href ? (
              <a href={action.href}>
                <Button size={variant === 'minimal' ? 'sm' : 'default'}>
                  {action.label}
                </Button>
              </a>
            ) : (
              <Button
                size={variant === 'minimal' ? 'sm' : 'default'}
                onClick={action.onClick}
              >
                {action.label}
              </Button>
            )
          )}
          {secondaryAction && (
            secondaryAction.href ? (
              <a href={secondaryAction.href}>
                <Button variant="outline" size={variant === 'minimal' ? 'sm' : 'default'}>
                  {secondaryAction.label}
                </Button>
              </a>
            ) : (
              <Button
                variant="outline"
                size={variant === 'minimal' ? 'sm' : 'default'}
                onClick={secondaryAction.onClick}
              >
                {secondaryAction.label}
              </Button>
            )
          )}
        </div>
      )}

      {/* Custom content */}
      {children}
    </div>
  )
}

// Quick preset component
interface EmptyStatePresetProps {
  preset: keyof typeof emptyStatePresets
  action?: EmptyStateProps['action']
  secondaryAction?: EmptyStateProps['secondaryAction']
  variant?: EmptyStateProps['variant']
  className?: string
}

export function EmptyStatePreset({
  preset,
  action,
  secondaryAction,
  variant,
  className,
}: EmptyStatePresetProps) {
  const config = emptyStatePresets[preset]
  return (
    <EmptyState
      icon={config.icon}
      title={config.title}
      description={config.description}
      action={action}
      secondaryAction={secondaryAction}
      variant={variant}
      className={className}
    />
  )
}
