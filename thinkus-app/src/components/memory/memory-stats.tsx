'use client'

import { Card, CardContent } from '@/components/ui/card'
import {
  Brain,
  Sparkles,
  Archive,
  Snowflake,
  Database,
  FileText,
  Heart,
  GitBranch,
  Lightbulb,
} from 'lucide-react'

interface MemoryStatsProps {
  stats: {
    total: number
    byTier: Record<string, number>
    byType: Record<string, number>
    totalTokens: number
  } | null
  loading?: boolean
}

const TIER_CONFIG: Record<string, { label: string; icon: React.ElementType; color: string }> = {
  CORE: { label: '核心记忆', icon: Sparkles, color: 'text-yellow-500' },
  RELEVANT: { label: '相关记忆', icon: Archive, color: 'text-blue-500' },
  COLD: { label: '冷存储', icon: Snowflake, color: 'text-slate-400' },
}

const TYPE_CONFIG: Record<string, { label: string; icon: React.ElementType; color: string }> = {
  fact: { label: '事实', icon: Database, color: 'text-green-500' },
  preference: { label: '偏好', icon: Heart, color: 'text-pink-500' },
  decision: { label: '决策', icon: GitBranch, color: 'text-purple-500' },
  context: { label: '上下文', icon: FileText, color: 'text-cyan-500' },
  insight: { label: '洞察', icon: Lightbulb, color: 'text-yellow-500' },
}

export function MemoryStats({ stats, loading }: MemoryStatsProps) {
  if (loading) {
    return (
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[1, 2, 3, 4].map(i => (
          <Card key={i}>
            <CardContent className="p-4">
              <div className="animate-pulse">
                <div className="h-4 bg-muted rounded w-20 mb-2" />
                <div className="h-8 bg-muted rounded w-12" />
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    )
  }

  if (!stats) return null

  return (
    <div className="space-y-4">
      {/* 总体统计 */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">总记忆数</p>
                <p className="text-2xl font-bold">{stats.total}</p>
              </div>
              <Brain className="h-8 w-8 text-primary opacity-50" />
            </div>
          </CardContent>
        </Card>

        {Object.entries(TIER_CONFIG).map(([tier, config]) => {
          const count = stats.byTier[tier] || 0
          const Icon = config.icon
          return (
            <Card key={tier}>
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-muted-foreground">{config.label}</p>
                    <p className="text-2xl font-bold">{count}</p>
                  </div>
                  <Icon className={`h-8 w-8 ${config.color} opacity-50`} />
                </div>
              </CardContent>
            </Card>
          )
        })}
      </div>

      {/* 按类型统计 */}
      <Card>
        <CardContent className="p-4">
          <div className="flex items-center justify-between mb-3">
            <p className="text-sm font-medium">按类型分布</p>
            <p className="text-xs text-muted-foreground">
              总Token: {stats.totalTokens.toLocaleString()}
            </p>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
            {Object.entries(TYPE_CONFIG).map(([type, config]) => {
              const count = stats.byType[type] || 0
              const Icon = config.icon
              const percentage = stats.total > 0 ? Math.round((count / stats.total) * 100) : 0
              return (
                <div
                  key={type}
                  className="flex items-center gap-2 p-2 rounded-lg bg-muted/50"
                >
                  <Icon className={`h-4 w-4 ${config.color}`} />
                  <div className="flex-1 min-w-0">
                    <p className="text-xs text-muted-foreground truncate">{config.label}</p>
                    <p className="text-sm font-medium">
                      {count} <span className="text-xs text-muted-foreground">({percentage}%)</span>
                    </p>
                  </div>
                </div>
              )
            })}
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
