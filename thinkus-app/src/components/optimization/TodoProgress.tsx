'use client'

import { cn } from '@/lib/utils'
import type { TodoItem } from '@/lib/optimizations'

interface TodoProgressProps {
  todos: TodoItem[]
  stats: {
    total: number
    completed: number
    pending: number
    blocked?: number
  }
  className?: string
  compact?: boolean
}

export function TodoProgress({ todos, stats, className, compact = false }: TodoProgressProps) {
  const progress = stats.total > 0 ? (stats.completed / stats.total) * 100 : 0

  const getStatusIcon = (status: TodoItem['status']) => {
    switch (status) {
      case 'completed':
        return '✅'
      case 'in_progress':
        return '🔄'
      case 'blocked':
        return '⛔'
      default:
        return '⬜'
    }
  }

  const getStatusColor = (status: TodoItem['status']) => {
    switch (status) {
      case 'completed':
        return 'text-green-600 dark:text-green-400'
      case 'in_progress':
        return 'text-blue-600 dark:text-blue-400'
      case 'blocked':
        return 'text-red-600 dark:text-red-400'
      default:
        return 'text-gray-500 dark:text-gray-400'
    }
  }

  if (compact) {
    return (
      <div className={cn('flex items-center gap-2', className)}>
        <div className="h-1.5 flex-1 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
          <div
            className="h-full bg-green-500 transition-all duration-300"
            style={{ width: `${progress}%` }}
          />
        </div>
        <span className="text-xs text-gray-500 dark:text-gray-400 whitespace-nowrap">
          {stats.completed}/{stats.total}
        </span>
      </div>
    )
  }

  return (
    <div className={cn('rounded-lg border bg-card p-4', className)}>
      <div className="flex items-center justify-between mb-3">
        <span className="text-sm font-medium flex items-center gap-2">
          <span>📋</span>
          <span>任务进度</span>
        </span>
        <span className="text-sm text-muted-foreground">
          {stats.completed}/{stats.total}
        </span>
      </div>

      <div className="h-2 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden mb-4">
        <div
          className="h-full bg-gradient-to-r from-blue-500 to-green-500 transition-all duration-500"
          style={{ width: `${progress}%` }}
        />
      </div>

      <div className="space-y-2 max-h-[200px] overflow-y-auto">
        {todos.map((todo) => (
          <div
            key={todo.id}
            className={cn(
              'flex items-start gap-2 text-sm p-2 rounded transition-colors',
              todo.status === 'in_progress' && 'bg-blue-50 dark:bg-blue-900/20',
              todo.status === 'completed' && 'opacity-60'
            )}
          >
            <span className="flex-shrink-0">{getStatusIcon(todo.status)}</span>
            <div className="flex-1 min-w-0">
              <span className={cn('block', getStatusColor(todo.status))}>
                {todo.description}
              </span>
              {todo.blockReason && (
                <span className="text-xs text-red-500 dark:text-red-400 mt-1 block">
                  阻塞原因: {todo.blockReason}
                </span>
              )}
            </div>
          </div>
        ))}
      </div>

      {stats.blocked && stats.blocked > 0 && (
        <div className="mt-3 pt-3 border-t text-xs text-amber-600 dark:text-amber-400">
          ⚠️ {stats.blocked} 个任务被阻塞
        </div>
      )}
    </div>
  )
}
