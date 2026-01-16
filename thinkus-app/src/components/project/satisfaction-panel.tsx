'use client'

import * as React from 'react'
import { useState, useCallback, useEffect, useMemo } from 'react'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Progress } from '@/components/ui/progress'
import {
  satisfactionCollector,
  SatisfactionStats,
  SatisfactionSurvey,
  ImprovementSuggestion,
  SatisfactionDimension
} from '@/lib/services/satisfaction-collector'

export interface SatisfactionPanelProps {
  /** 项目ID (不传则显示全局统计) */
  projectId?: string
  /** 自定义样式 */
  className?: string
}

/**
 * 满意度面板
 */
export function SatisfactionPanel({
  projectId,
  className
}: SatisfactionPanelProps) {
  const [loading, setLoading] = useState(true)
  const [stats, setStats] = useState<SatisfactionStats | null>(null)
  const [suggestions, setSuggestions] = useState<ImprovementSuggestion[]>([])
  const [expandedSection, setExpandedSection] = useState<string | null>(null)

  const dimensionConfig = useMemo(() => satisfactionCollector.getDimensionConfig(), [])

  // 加载数据
  const loadData = useCallback(async () => {
    setLoading(true)
    try {
      const statsData = projectId
        ? satisfactionCollector.getProjectStats(projectId)
        : satisfactionCollector.getGlobalStats()
      setStats(statsData)

      const suggestionsData = satisfactionCollector.getSuggestions({ projectId })
      setSuggestions(suggestionsData)
    } catch (error) {
      console.error('加载满意度数据失败:', error)
    } finally {
      setLoading(false)
    }
  }, [projectId])

  useEffect(() => {
    loadData()
  }, [loadData])

  if (loading) {
    return (
      <Card className={cn('overflow-hidden', className)}>
        <CardContent className="p-8 text-center">
          <div className="text-4xl mb-4 animate-pulse">📊</div>
          <p className="text-muted-foreground">加载满意度数据...</p>
        </CardContent>
      </Card>
    )
  }

  if (!stats) {
    return (
      <Card className={cn('overflow-hidden', className)}>
        <CardContent className="p-8 text-center">
          <div className="text-4xl mb-4">📋</div>
          <p className="text-muted-foreground">暂无满意度数据</p>
        </CardContent>
      </Card>
    )
  }

  // NPS等级
  const npsLevel = stats.npsScore >= 50 ? 'excellent' :
                   stats.npsScore >= 30 ? 'good' :
                   stats.npsScore >= 0 ? 'average' : 'poor'

  const npsConfig = {
    excellent: { label: '优秀', color: 'text-green-600', bg: 'bg-green-50 dark:bg-green-950/20' },
    good: { label: '良好', color: 'text-blue-600', bg: 'bg-blue-50 dark:bg-blue-950/20' },
    average: { label: '一般', color: 'text-yellow-600', bg: 'bg-yellow-50 dark:bg-yellow-950/20' },
    poor: { label: '需改进', color: 'text-red-600', bg: 'bg-red-50 dark:bg-red-950/20' }
  }

  return (
    <Card className={cn('overflow-hidden', className)}>
      <CardHeader className="border-b">
        <CardTitle className="flex items-center gap-2">
          <span className="text-2xl">📊</span>
          满意度统计
        </CardTitle>
        <CardDescription>
          {stats.responseCount} 份有效反馈 | 回复率 {stats.responseRate.toFixed(0)}%
        </CardDescription>
      </CardHeader>

      <CardContent className="p-6 space-y-6">
        {/* NPS评分 */}
        <div className={cn('rounded-lg p-6 text-center', npsConfig[npsLevel].bg)}>
          <p className="text-sm text-muted-foreground mb-2">NPS 净推荐值</p>
          <p className={cn('text-5xl font-bold mb-2', npsConfig[npsLevel].color)}>
            {stats.npsScore}
          </p>
          <p className={cn('text-lg font-medium', npsConfig[npsLevel].color)}>
            {npsConfig[npsLevel].label}
          </p>
        </div>

        {/* NPS分布 */}
        <div>
          <p className="text-sm font-medium mb-3">用户分布</p>
          <div className="flex h-8 rounded-lg overflow-hidden mb-2">
            {stats.npsDistribution.promoters > 0 && (
              <div
                className="bg-green-500 flex items-center justify-center text-white text-xs font-medium"
                style={{
                  width: `${(stats.npsDistribution.promoters / stats.responseCount) * 100}%`
                }}
              >
                {stats.npsDistribution.promoters}
              </div>
            )}
            {stats.npsDistribution.passives > 0 && (
              <div
                className="bg-yellow-500 flex items-center justify-center text-white text-xs font-medium"
                style={{
                  width: `${(stats.npsDistribution.passives / stats.responseCount) * 100}%`
                }}
              >
                {stats.npsDistribution.passives}
              </div>
            )}
            {stats.npsDistribution.detractors > 0 && (
              <div
                className="bg-red-500 flex items-center justify-center text-white text-xs font-medium"
                style={{
                  width: `${(stats.npsDistribution.detractors / stats.responseCount) * 100}%`
                }}
              >
                {stats.npsDistribution.detractors}
              </div>
            )}
          </div>
          <div className="flex justify-between text-xs text-muted-foreground">
            <span>🟢 推荐者 ({stats.npsDistribution.promoters})</span>
            <span>🟡 中立者 ({stats.npsDistribution.passives})</span>
            <span>🔴 批评者 ({stats.npsDistribution.detractors})</span>
          </div>
        </div>

        {/* 维度评分 */}
        {stats.dimensionAverages.length > 0 && (
          <div>
            <button
              className="w-full flex items-center justify-between font-medium mb-3"
              onClick={() => setExpandedSection(expandedSection === 'dimensions' ? null : 'dimensions')}
            >
              <div className="flex items-center gap-2">
                <span>⭐</span>
                维度评分
              </div>
              <span className="text-muted-foreground">
                {expandedSection === 'dimensions' ? '▲' : '▼'}
              </span>
            </button>

            {expandedSection === 'dimensions' && (
              <div className="space-y-3">
                {stats.dimensionAverages.map((dim, i) => {
                  const config = dimensionConfig[dim.dimension]
                  const percent = (dim.average / 5) * 100

                  return (
                    <div key={i}>
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-sm flex items-center gap-2">
                          <span>{config.icon}</span>
                          {config.label}
                        </span>
                        <span className="text-sm font-medium">{dim.average.toFixed(1)}/5</span>
                      </div>
                      <Progress
                        value={percent}
                        className={cn(
                          'h-2',
                          percent >= 80 && '[&>div]:bg-green-500',
                          percent >= 60 && percent < 80 && '[&>div]:bg-blue-500',
                          percent >= 40 && percent < 60 && '[&>div]:bg-yellow-500',
                          percent < 40 && '[&>div]:bg-red-500'
                        )}
                      />
                    </div>
                  )
                })}
              </div>
            )}
          </div>
        )}

        {/* 用户反馈 */}
        {(stats.topPositives.length > 0 || stats.topNegatives.length > 0) && (
          <div>
            <button
              className="w-full flex items-center justify-between font-medium mb-3"
              onClick={() => setExpandedSection(expandedSection === 'feedback' ? null : 'feedback')}
            >
              <div className="flex items-center gap-2">
                <span>💬</span>
                用户反馈
              </div>
              <span className="text-muted-foreground">
                {expandedSection === 'feedback' ? '▲' : '▼'}
              </span>
            </button>

            {expandedSection === 'feedback' && (
              <div className="space-y-4">
                {stats.topPositives.length > 0 && (
                  <div className="bg-green-50 dark:bg-green-950/20 rounded-lg p-4">
                    <h5 className="font-medium text-green-700 dark:text-green-300 mb-2">💚 好评</h5>
                    <ul className="space-y-1 text-sm">
                      {stats.topPositives.map((feedback, i) => (
                        <li key={i} className="text-green-600 dark:text-green-400">"{feedback}"</li>
                      ))}
                    </ul>
                  </div>
                )}

                {stats.topNegatives.length > 0 && (
                  <div className="bg-yellow-50 dark:bg-yellow-950/20 rounded-lg p-4">
                    <h5 className="font-medium text-yellow-700 dark:text-yellow-300 mb-2">💡 建议</h5>
                    <ul className="space-y-1 text-sm">
                      {stats.topNegatives.map((feedback, i) => (
                        <li key={i} className="text-yellow-600 dark:text-yellow-400">"{feedback}"</li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
            )}
          </div>
        )}

        {/* 改进建议 */}
        {suggestions.length > 0 && (
          <div>
            <button
              className="w-full flex items-center justify-between font-medium mb-3"
              onClick={() => setExpandedSection(expandedSection === 'suggestions' ? null : 'suggestions')}
            >
              <div className="flex items-center gap-2">
                <span>🎯</span>
                待改进项 ({suggestions.filter(s => s.status === 'new').length})
              </div>
              <span className="text-muted-foreground">
                {expandedSection === 'suggestions' ? '▲' : '▼'}
              </span>
            </button>

            {expandedSection === 'suggestions' && (
              <div className="space-y-2">
                {suggestions.slice(0, 5).map((suggestion, i) => (
                  <div
                    key={i}
                    className="flex items-start gap-3 p-3 bg-gray-50 dark:bg-gray-800/50 rounded-lg"
                  >
                    <span className={cn(
                      'px-2 py-0.5 rounded text-xs font-medium',
                      suggestion.priority === 'high' && 'bg-red-100 text-red-700',
                      suggestion.priority === 'medium' && 'bg-yellow-100 text-yellow-700',
                      suggestion.priority === 'low' && 'bg-green-100 text-green-700'
                    )}>
                      {suggestion.priority === 'high' ? '高' :
                       suggestion.priority === 'medium' ? '中' : '低'}
                    </span>
                    <div className="flex-1">
                      <p className="text-sm">{suggestion.suggestion}</p>
                      <p className="text-xs text-muted-foreground mt-1">
                        {dimensionConfig[suggestion.dimension].label}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* 无数据提示 */}
        {stats.responseCount === 0 && (
          <div className="text-center py-6">
            <div className="text-4xl mb-2">📭</div>
            <p className="text-muted-foreground">暂无用户反馈</p>
            <p className="text-sm text-muted-foreground mt-1">发送满意度调查后这里将显示统计数据</p>
          </div>
        )}

        {/* 刷新按钮 */}
        <Button variant="outline" onClick={loadData} className="w-full">
          🔄 刷新数据
        </Button>
      </CardContent>
    </Card>
  )
}

/**
 * NPS评分徽章
 */
export function NPSBadge({
  score,
  size = 'md',
  onClick,
  className
}: {
  score: number
  size?: 'sm' | 'md' | 'lg'
  onClick?: () => void
  className?: string
}) {
  const level = score >= 50 ? 'excellent' :
                score >= 30 ? 'good' :
                score >= 0 ? 'average' : 'poor'

  const config = {
    excellent: { label: '优秀', color: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300' },
    good: { label: '良好', color: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300' },
    average: { label: '一般', color: 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-300' },
    poor: { label: '需改进', color: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-300' }
  }

  const sizeConfig = {
    sm: 'px-2 py-1 text-xs',
    md: 'px-3 py-1.5 text-sm',
    lg: 'px-4 py-2 text-base'
  }

  return (
    <button
      onClick={onClick}
      className={cn(
        'inline-flex items-center gap-1.5 rounded-full font-medium transition-colors hover:opacity-80',
        config[level].color,
        sizeConfig[size],
        className
      )}
    >
      <span>NPS {score}</span>
      <span className="opacity-75">({config[level].label})</span>
    </button>
  )
}

/**
 * 满意度星星评分
 */
export function SatisfactionStars({
  score,
  maxScore = 5,
  size = 'md',
  className
}: {
  score: number
  maxScore?: number
  size?: 'sm' | 'md' | 'lg'
  className?: string
}) {
  const fullStars = Math.floor(score)
  const hasHalfStar = score - fullStars >= 0.5
  const emptyStars = maxScore - fullStars - (hasHalfStar ? 1 : 0)

  const sizeConfig = {
    sm: 'text-sm',
    md: 'text-lg',
    lg: 'text-2xl'
  }

  return (
    <span className={cn('inline-flex items-center', sizeConfig[size], className)}>
      {'⭐'.repeat(fullStars)}
      {hasHalfStar && '✨'}
      {'☆'.repeat(emptyStars)}
      <span className="ml-2 text-muted-foreground text-sm">
        {score.toFixed(1)}/{maxScore}
      </span>
    </span>
  )
}

/**
 * 迷你满意度指示器
 */
export function SatisfactionIndicator({
  score,
  type = 'nps',
  className
}: {
  score: number
  type?: 'nps' | 'rating'
  className?: string
}) {
  let color: string
  let emoji: string

  if (type === 'nps') {
    if (score >= 50) { color = 'text-green-600'; emoji = '😊' }
    else if (score >= 30) { color = 'text-blue-600'; emoji = '🙂' }
    else if (score >= 0) { color = 'text-yellow-600'; emoji = '😐' }
    else { color = 'text-red-600'; emoji = '😟' }
  } else {
    if (score >= 4) { color = 'text-green-600'; emoji = '😊' }
    else if (score >= 3) { color = 'text-yellow-600'; emoji = '🙂' }
    else { color = 'text-red-600'; emoji = '😟' }
  }

  return (
    <span className={cn('inline-flex items-center gap-1', color, className)}>
      <span>{emoji}</span>
      <span className="font-medium">{score}</span>
    </span>
  )
}
