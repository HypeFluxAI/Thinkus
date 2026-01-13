'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import { Progress } from '@/components/ui/progress'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import {
  BarChart3,
  TrendingUp,
  DollarSign,
  Zap,
  Clock,
  CheckCircle,
  XCircle,
  Activity,
} from 'lucide-react'

interface UsageStats {
  totalRequests: number
  totalTokens: number
  totalInputTokens: number
  totalOutputTokens: number
  totalCost: number
  byModel: Record<string, { requests: number; tokens: number; cost: number }>
  byType: Record<string, { requests: number; tokens: number; cost: number }>
}

interface DailyUsage {
  date: string
  tokens: number
  cost: number
  requests: number
}

interface RecentRequest {
  _id: string
  model: string
  usageType: string
  inputTokens: number
  outputTokens: number
  totalTokens: number
  estimatedCost: number
  success: boolean
  createdAt: string
}

const MODEL_LABELS: Record<string, string> = {
  'claude-opus-4': 'Claude Opus 4',
  'claude-sonnet-4': 'Claude Sonnet 4',
  'claude-haiku': 'Claude Haiku',
  'gpt-4': 'GPT-4',
  'gpt-4-turbo': 'GPT-4 Turbo',
  'gpt-3.5-turbo': 'GPT-3.5 Turbo',
  'text-embedding-3-small': 'Embedding Small',
  'text-embedding-3-large': 'Embedding Large',
}

const TYPE_LABELS: Record<string, string> = {
  discussion: '团队讨论',
  standup: '每日例会',
  expert_consultation: '专家咨询',
  skill_distillation: '技能蒸馏',
  decision_analysis: '决策分析',
  embedding: '嵌入向量',
  other: '其他',
}

const MODEL_COLORS: Record<string, string> = {
  'claude-opus-4': 'bg-purple-500',
  'claude-sonnet-4': 'bg-blue-500',
  'claude-haiku': 'bg-green-500',
  'gpt-4': 'bg-emerald-500',
  'gpt-4-turbo': 'bg-teal-500',
  'gpt-3.5-turbo': 'bg-cyan-500',
  'text-embedding-3-small': 'bg-gray-400',
  'text-embedding-3-large': 'bg-gray-500',
}

export default function UsageAnalyticsPage() {
  const [loading, setLoading] = useState(true)
  const [period, setPeriod] = useState<'day' | 'week' | 'month'>('month')
  const [stats, setStats] = useState<UsageStats | null>(null)
  const [dailyUsage, setDailyUsage] = useState<DailyUsage[]>([])
  const [recentRequests, setRecentRequests] = useState<RecentRequest[]>([])

  useEffect(() => {
    loadUsageData()
  }, [period])

  const loadUsageData = async () => {
    try {
      setLoading(true)
      const response = await fetch(`/api/usage?period=${period}`)
      if (response.ok) {
        const data = await response.json()
        setStats(data.stats)
        setDailyUsage(data.dailyUsage || [])
        setRecentRequests(data.recentRequests || [])
      }
    } catch (error) {
      console.error('Failed to load usage data:', error)
    } finally {
      setLoading(false)
    }
  }

  // 格式化数字
  const formatNumber = (num: number) => {
    if (num >= 1000000) return `${(num / 1000000).toFixed(1)}M`
    if (num >= 1000) return `${(num / 1000).toFixed(1)}K`
    return num.toString()
  }

  // 格式化成本
  const formatCost = (cost: number) => {
    return `$${cost.toFixed(4)}`
  }

  // 计算模型使用占比
  const getModelPercentage = (model: string) => {
    if (!stats || stats.totalTokens === 0) return 0
    return ((stats.byModel[model]?.tokens || 0) / stats.totalTokens) * 100
  }

  // 获取最大每日使用量
  const maxDailyTokens = Math.max(...dailyUsage.map(d => d.tokens), 1)

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="flex justify-between items-center">
          <Skeleton className="h-8 w-48" />
          <Skeleton className="h-10 w-32" />
        </div>
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          {[1, 2, 3, 4].map(i => (
            <Skeleton key={i} className="h-32" />
          ))}
        </div>
        <Skeleton className="h-64" />
        <Skeleton className="h-96" />
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <BarChart3 className="h-6 w-6 text-primary" />
            AI 使用分析
          </h1>
          <p className="text-muted-foreground">
            查看 AI 服务使用情况和成本统计
          </p>
        </div>
        <Select value={period} onValueChange={(v) => setPeriod(v as 'day' | 'week' | 'month')}>
          <SelectTrigger className="w-32">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="day">今天</SelectItem>
            <SelectItem value="week">本周</SelectItem>
            <SelectItem value="month">本月</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardDescription className="flex items-center gap-1">
              <Zap className="h-4 w-4" />
              总请求数
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">{formatNumber(stats?.totalRequests || 0)}</div>
            <p className="text-xs text-muted-foreground mt-1">
              API 调用次数
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardDescription className="flex items-center gap-1">
              <Activity className="h-4 w-4" />
              总 Token 数
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">{formatNumber(stats?.totalTokens || 0)}</div>
            <div className="flex gap-2 text-xs text-muted-foreground mt-1">
              <span>输入: {formatNumber(stats?.totalInputTokens || 0)}</span>
              <span>输出: {formatNumber(stats?.totalOutputTokens || 0)}</span>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardDescription className="flex items-center gap-1">
              <DollarSign className="h-4 w-4" />
              预估成本
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">{formatCost(stats?.totalCost || 0)}</div>
            <p className="text-xs text-muted-foreground mt-1">
              基于 API 定价估算
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardDescription className="flex items-center gap-1">
              <TrendingUp className="h-4 w-4" />
              平均请求成本
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">
              {formatCost(stats?.totalRequests ? (stats.totalCost / stats.totalRequests) : 0)}
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              每次请求的平均成本
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Usage Breakdown */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* By Model */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">按模型分布</CardTitle>
            <CardDescription>各 AI 模型的使用占比</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {stats && Object.keys(stats.byModel).length > 0 ? (
              Object.entries(stats.byModel)
                .sort((a, b) => b[1].tokens - a[1].tokens)
                .map(([model, data]) => (
                  <div key={model} className="space-y-2">
                    <div className="flex justify-between text-sm">
                      <span className="flex items-center gap-2">
                        <div className={`w-3 h-3 rounded-full ${MODEL_COLORS[model] || 'bg-gray-400'}`} />
                        {MODEL_LABELS[model] || model}
                      </span>
                      <span className="text-muted-foreground">
                        {formatNumber(data.tokens)} tokens ({formatCost(data.cost)})
                      </span>
                    </div>
                    <Progress value={getModelPercentage(model)} className="h-2" />
                  </div>
                ))
            ) : (
              <div className="text-center py-8 text-muted-foreground">
                暂无使用数据
              </div>
            )}
          </CardContent>
        </Card>

        {/* By Type */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">按使用类型分布</CardTitle>
            <CardDescription>各功能的 AI 使用占比</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {stats && Object.keys(stats.byType).length > 0 ? (
              Object.entries(stats.byType)
                .sort((a, b) => b[1].tokens - a[1].tokens)
                .map(([type, data]) => {
                  const percentage = stats.totalTokens > 0
                    ? (data.tokens / stats.totalTokens) * 100
                    : 0
                  return (
                    <div key={type} className="space-y-2">
                      <div className="flex justify-between text-sm">
                        <span>{TYPE_LABELS[type] || type}</span>
                        <span className="text-muted-foreground">
                          {data.requests} 次 ({formatCost(data.cost)})
                        </span>
                      </div>
                      <Progress value={percentage} className="h-2" />
                    </div>
                  )
                })
            ) : (
              <div className="text-center py-8 text-muted-foreground">
                暂无使用数据
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Daily Usage Trend */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">每日使用趋势</CardTitle>
          <CardDescription>
            {period === 'day' ? '今日' : period === 'week' ? '过去 7 天' : '过去 30 天'}的使用情况
          </CardDescription>
        </CardHeader>
        <CardContent>
          {dailyUsage.length > 0 ? (
            <div className="space-y-2">
              <div className="flex gap-1 h-32 items-end">
                {dailyUsage.map((day, index) => (
                  <div
                    key={day.date}
                    className="flex-1 bg-primary/20 hover:bg-primary/40 rounded-t transition-colors relative group"
                    style={{ height: `${(day.tokens / maxDailyTokens) * 100}%`, minHeight: '4px' }}
                  >
                    {/* Tooltip */}
                    <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 px-2 py-1 bg-popover text-popover-foreground text-xs rounded shadow-lg opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap z-10">
                      <div className="font-medium">{day.date}</div>
                      <div>{formatNumber(day.tokens)} tokens</div>
                      <div>{formatCost(day.cost)}</div>
                    </div>
                  </div>
                ))}
              </div>
              <div className="flex justify-between text-xs text-muted-foreground">
                <span>{dailyUsage[0]?.date}</span>
                <span>{dailyUsage[dailyUsage.length - 1]?.date}</span>
              </div>
            </div>
          ) : (
            <div className="text-center py-8 text-muted-foreground">
              暂无每日数据
            </div>
          )}
        </CardContent>
      </Card>

      {/* Recent Requests */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">最近请求</CardTitle>
          <CardDescription>最近 10 次 AI 调用记录</CardDescription>
        </CardHeader>
        <CardContent>
          {recentRequests.length > 0 ? (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>时间</TableHead>
                  <TableHead>模型</TableHead>
                  <TableHead>类型</TableHead>
                  <TableHead className="text-right">Token</TableHead>
                  <TableHead className="text-right">成本</TableHead>
                  <TableHead className="text-center">状态</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {recentRequests.map((request) => (
                  <TableRow key={request._id}>
                    <TableCell className="text-sm text-muted-foreground">
                      {new Date(request.createdAt).toLocaleString('zh-CN', {
                        month: 'short',
                        day: 'numeric',
                        hour: '2-digit',
                        minute: '2-digit',
                      })}
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline" className="font-normal">
                        {MODEL_LABELS[request.model] || request.model}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-sm">
                      {TYPE_LABELS[request.usageType] || request.usageType}
                    </TableCell>
                    <TableCell className="text-right text-sm">
                      <span className="text-muted-foreground">
                        {formatNumber(request.inputTokens)}
                      </span>
                      <span className="mx-1">/</span>
                      <span>{formatNumber(request.outputTokens)}</span>
                    </TableCell>
                    <TableCell className="text-right text-sm font-medium">
                      {formatCost(request.estimatedCost)}
                    </TableCell>
                    <TableCell className="text-center">
                      {request.success ? (
                        <CheckCircle className="h-4 w-4 text-green-500 mx-auto" />
                      ) : (
                        <XCircle className="h-4 w-4 text-red-500 mx-auto" />
                      )}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          ) : (
            <div className="text-center py-8 text-muted-foreground">
              暂无请求记录
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
