'use client'

import { useState } from 'react'
import { cn } from '@/lib/utils'
import type { Version } from '@/lib/services'

interface VersionHistoryProps {
  versions: Version[]
  currentVersionId?: string
  onRollback?: (versionId: string) => void
  onViewDiff?: (fromId: string, toId: string) => void
  className?: string
}

export function VersionHistory({
  versions,
  currentVersionId,
  onRollback,
  onViewDiff,
  className
}: VersionHistoryProps) {
  const [expandedId, setExpandedId] = useState<string | null>(null)
  const [compareMode, setCompareMode] = useState(false)
  const [compareFrom, setCompareFrom] = useState<string | null>(null)

  const formatDate = (date: Date) => {
    return new Date(date).toLocaleString('zh-CN', {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    })
  }

  const handleVersionClick = (versionId: string) => {
    if (compareMode) {
      if (compareFrom === null) {
        setCompareFrom(versionId)
      } else if (compareFrom !== versionId) {
        onViewDiff?.(compareFrom, versionId)
        setCompareMode(false)
        setCompareFrom(null)
      }
    } else {
      setExpandedId(expandedId === versionId ? null : versionId)
    }
  }

  return (
    <div className={cn('rounded-lg border bg-card', className)}>
      <div className="p-4 border-b flex items-center justify-between">
        <h3 className="font-medium flex items-center gap-2">
          <span>📜</span>
          <span>版本历史</span>
        </h3>
        <button
          onClick={() => {
            setCompareMode(!compareMode)
            setCompareFrom(null)
          }}
          className={cn(
            'text-xs px-2 py-1 rounded transition-colors',
            compareMode
              ? 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400'
              : 'hover:bg-gray-100 dark:hover:bg-gray-800'
          )}
        >
          {compareMode ? '取消对比' : '版本对比'}
        </button>
      </div>

      {compareMode && (
        <div className="px-4 py-2 bg-blue-50 dark:bg-blue-900/20 text-xs text-blue-700 dark:text-blue-400">
          {compareFrom ? '选择要对比的目标版本' : '选择起始版本进行对比'}
        </div>
      )}

      <div className="max-h-[400px] overflow-y-auto">
        {versions.length === 0 ? (
          <div className="p-8 text-center text-muted-foreground">
            暂无版本记录
          </div>
        ) : (
          <div className="divide-y">
            {versions.map((version) => (
              <div
                key={version.id}
                className={cn(
                  'transition-colors cursor-pointer',
                  version.id === currentVersionId && 'bg-green-50 dark:bg-green-900/20',
                  compareFrom === version.id && 'bg-blue-100 dark:bg-blue-900/30'
                )}
              >
                <div
                  className="p-4 hover:bg-gray-50 dark:hover:bg-gray-800/50"
                  onClick={() => handleVersionClick(version.id)}
                >
                  <div className="flex items-center justify-between mb-1">
                    <div className="flex items-center gap-2">
                      <span className="font-mono text-sm font-medium">
                        v{version.version}
                      </span>
                      {version.id === currentVersionId && (
                        <span className="text-xs px-1.5 py-0.5 rounded bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400">
                          当前
                        </span>
                      )}
                      {version.tags.map((tag) => (
                        <span
                          key={tag}
                          className="text-xs px-1.5 py-0.5 rounded bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400"
                        >
                          {tag}
                        </span>
                      ))}
                    </div>
                    <span className="text-xs text-muted-foreground">
                      {formatDate(version.createdAt)}
                    </span>
                  </div>

                  <p className="text-sm font-medium mb-1">{version.title}</p>
                  <p className="text-xs text-muted-foreground line-clamp-2">
                    {version.description}
                  </p>

                  <div className="flex items-center gap-4 mt-2 text-xs text-muted-foreground">
                    <span>📁 {version.metadata.totalFiles} 文件</span>
                    <span className="text-green-600">+{version.metadata.totalLinesAdded}</span>
                    <span className="text-red-600">-{version.metadata.totalLinesRemoved}</span>
                  </div>
                </div>

                {expandedId === version.id && (
                  <div className="px-4 pb-4 space-y-3 animate-in slide-in-from-top-1 duration-200">
                    <div className="text-xs text-muted-foreground">
                      变更文件:
                    </div>
                    <div className="space-y-1">
                      {version.changes.slice(0, 5).map((change, i) => (
                        <div
                          key={i}
                          className="flex items-center gap-2 text-xs font-mono"
                        >
                          <span
                            className={cn(
                              'px-1 rounded',
                              change.type === 'create' && 'bg-green-100 text-green-700',
                              change.type === 'update' && 'bg-blue-100 text-blue-700',
                              change.type === 'delete' && 'bg-red-100 text-red-700'
                            )}
                          >
                            {change.type === 'create' ? 'A' : change.type === 'delete' ? 'D' : 'M'}
                          </span>
                          <span className="truncate">{change.path}</span>
                        </div>
                      ))}
                      {version.changes.length > 5 && (
                        <div className="text-xs text-muted-foreground">
                          ... 还有 {version.changes.length - 5} 个文件
                        </div>
                      )}
                    </div>

                    {onRollback && version.id !== currentVersionId && (
                      <button
                        onClick={(e) => {
                          e.stopPropagation()
                          onRollback(version.id)
                        }}
                        className="text-xs px-3 py-1.5 rounded bg-amber-100 text-amber-700 hover:bg-amber-200 dark:bg-amber-900/30 dark:text-amber-400 dark:hover:bg-amber-900/50 transition-colors"
                      >
                        回滚到此版本
                      </button>
                    )}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
