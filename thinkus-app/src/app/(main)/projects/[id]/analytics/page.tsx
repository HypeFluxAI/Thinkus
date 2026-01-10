'use client'

import { useState, use } from 'react'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  ArrowLeft,
  ArrowUp,
  ArrowDown,
  Users,
  Eye,
  Clock,
  MousePointer,
  Globe,
  Smartphone,
  Monitor,
  TrendingUp,
  BarChart3,
  PieChart,
  Calendar,
  Download,
} from 'lucide-react'

interface AnalyticsData {
  visitors: number
  pageViews: number
  avgDuration: string
  bounceRate: number
  conversionRate: number
}

interface MetricChange {
  value: number
  isPositive: boolean
}

const MOCK_DATA: AnalyticsData = {
  visitors: 1234,
  pageViews: 5678,
  avgDuration: '2:34',
  bounceRate: 42.5,
  conversionRate: 3.2,
}

const METRIC_CHANGES: Record<string, MetricChange> = {
  visitors: { value: 12.5, isPositive: true },
  pageViews: { value: 8.3, isPositive: true },
  avgDuration: { value: 5.2, isPositive: true },
  bounceRate: { value: 3.1, isPositive: false },
  conversionRate: { value: 0.8, isPositive: true },
}

const TOP_PAGES = [
  { path: '/', views: 2345, avgTime: '1:45' },
  { path: '/products', views: 1234, avgTime: '3:12' },
  { path: '/cart', views: 567, avgTime: '2:30' },
  { path: '/checkout', views: 234, avgTime: '4:15' },
  { path: '/about', views: 189, avgTime: '1:20' },
]

const TRAFFIC_SOURCES = [
  { source: '直接访问', visits: 456, percentage: 37 },
  { source: '搜索引擎', visits: 345, percentage: 28 },
  { source: '社交媒体', visits: 234, percentage: 19 },
  { source: '外部链接', visits: 123, percentage: 10 },
  { source: '邮件营销', visits: 76, percentage: 6 },
]

const DEVICE_STATS = [
  { device: '桌面', icon: Monitor, percentage: 58, color: 'bg-blue-500' },
  { device: '手机', icon: Smartphone, percentage: 35, color: 'bg-green-500' },
  { device: '平板', icon: Monitor, percentage: 7, color: 'bg-orange-500' },
]

const DAILY_VISITORS = [
  { day: '周一', visitors: 145 },
  { day: '周二', visitors: 178 },
  { day: '周三', visitors: 234 },
  { day: '周四', visitors: 189 },
  { day: '周五', visitors: 256 },
  { day: '周六', visitors: 312 },
  { day: '周日', visitors: 287 },
]

export default function AnalyticsPage({ params }: { params: Promise<{ id: string }> }) {
  const { id: projectId } = use(params)
  const [timeRange, setTimeRange] = useState('7d')

  const renderMetricCard = (
    title: string,
    value: string | number,
    icon: React.ReactNode,
    changeKey: string
  ) => {
    const change = METRIC_CHANGES[changeKey]
    return (
      <Card>
        <CardContent className="p-6">
          <div className="flex items-center justify-between">
            <div className="p-2 rounded-lg bg-muted">{icon}</div>
            <div
              className={`flex items-center gap-1 text-sm ${
                change.isPositive ? 'text-green-500' : 'text-red-500'
              }`}
            >
              {change.isPositive ? (
                <ArrowUp className="h-4 w-4" />
              ) : (
                <ArrowDown className="h-4 w-4" />
              )}
              {change.value}%
            </div>
          </div>
          <div className="mt-4">
            <div className="text-2xl font-bold">{value}</div>
            <div className="text-sm text-muted-foreground">{title}</div>
          </div>
        </CardContent>
      </Card>
    )
  }

  const maxVisitors = Math.max(...DAILY_VISITORS.map(d => d.visitors))

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b sticky top-0 z-50 bg-background/80 backdrop-blur-sm">
        <div className="container mx-auto px-4 h-14 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Link href={`/projects/${projectId}`}>
              <Button variant="ghost" size="icon">
                <ArrowLeft className="h-4 w-4" />
              </Button>
            </Link>
            <span className="font-semibold">数据分析</span>
          </div>
          <div className="flex items-center gap-2">
            <Select value={timeRange} onValueChange={setTimeRange}>
              <SelectTrigger className="w-[140px]">
                <Calendar className="h-4 w-4 mr-2" />
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="24h">过去24小时</SelectItem>
                <SelectItem value="7d">过去7天</SelectItem>
                <SelectItem value="30d">过去30天</SelectItem>
                <SelectItem value="90d">过去90天</SelectItem>
              </SelectContent>
            </Select>
            <Button variant="outline" size="sm">
              <Download className="h-4 w-4 mr-2" />
              导出
            </Button>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 py-6 max-w-6xl">
        {/* Key Metrics */}
        <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mb-6">
          {renderMetricCard(
            '访客数',
            MOCK_DATA.visitors.toLocaleString(),
            <Users className="h-5 w-5" />,
            'visitors'
          )}
          {renderMetricCard(
            '页面浏览',
            MOCK_DATA.pageViews.toLocaleString(),
            <Eye className="h-5 w-5" />,
            'pageViews'
          )}
          {renderMetricCard(
            '平均停留',
            MOCK_DATA.avgDuration,
            <Clock className="h-5 w-5" />,
            'avgDuration'
          )}
          {renderMetricCard(
            '跳出率',
            `${MOCK_DATA.bounceRate}%`,
            <MousePointer className="h-5 w-5" />,
            'bounceRate'
          )}
          {renderMetricCard(
            '转化率',
            `${MOCK_DATA.conversionRate}%`,
            <TrendingUp className="h-5 w-5" />,
            'conversionRate'
          )}
        </div>

        {/* Charts Row */}
        <div className="grid md:grid-cols-2 gap-6 mb-6">
          {/* Visitors Chart */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                <BarChart3 className="h-4 w-4" />
                访客趋势
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="h-48 flex items-end justify-between gap-2">
                {DAILY_VISITORS.map(day => (
                  <div key={day.day} className="flex-1 flex flex-col items-center gap-1">
                    <div
                      className="w-full bg-primary rounded-t transition-all hover:bg-primary/80"
                      style={{
                        height: `${(day.visitors / maxVisitors) * 160}px`,
                      }}
                    />
                    <span className="text-xs text-muted-foreground">{day.day}</span>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Device Distribution */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                <PieChart className="h-4 w-4" />
                设备分布
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {DEVICE_STATS.map(stat => {
                  const Icon = stat.icon
                  return (
                    <div key={stat.device} className="flex items-center gap-4">
                      <Icon className="h-5 w-5 text-muted-foreground" />
                      <div className="flex-1">
                        <div className="flex items-center justify-between mb-1">
                          <span className="text-sm font-medium">{stat.device}</span>
                          <span className="text-sm text-muted-foreground">{stat.percentage}%</span>
                        </div>
                        <div className="h-2 bg-muted rounded-full overflow-hidden">
                          <div
                            className={`h-full ${stat.color} rounded-full`}
                            style={{ width: `${stat.percentage}%` }}
                          />
                        </div>
                      </div>
                    </div>
                  )
                })}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Tables Row */}
        <div className="grid md:grid-cols-2 gap-6">
          {/* Top Pages */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base">热门页面</CardTitle>
              <CardDescription>按浏览量排序</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                {TOP_PAGES.map((page, index) => (
                  <div
                    key={page.path}
                    className="flex items-center justify-between py-2 border-b last:border-0"
                  >
                    <div className="flex items-center gap-3">
                      <span className="text-sm text-muted-foreground w-6">{index + 1}</span>
                      <code className="text-sm">{page.path}</code>
                    </div>
                    <div className="flex items-center gap-4 text-sm text-muted-foreground">
                      <span>{page.views.toLocaleString()} 次</span>
                      <span>{page.avgTime}</span>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Traffic Sources */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                <Globe className="h-4 w-4" />
                流量来源
              </CardTitle>
              <CardDescription>访客从哪里来</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {TRAFFIC_SOURCES.map(source => (
                  <div key={source.source} className="space-y-1">
                    <div className="flex items-center justify-between text-sm">
                      <span>{source.source}</span>
                      <span className="text-muted-foreground">
                        {source.visits} ({source.percentage}%)
                      </span>
                    </div>
                    <div className="h-2 bg-muted rounded-full overflow-hidden">
                      <div
                        className="h-full bg-primary rounded-full"
                        style={{ width: `${source.percentage}%` }}
                      />
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Integration Banner */}
        <Card className="mt-6 bg-muted/30">
          <CardContent className="p-6">
            <div className="flex flex-col md:flex-row items-center justify-between gap-4">
              <div>
                <h3 className="font-medium mb-1">连接更多数据源</h3>
                <p className="text-sm text-muted-foreground">
                  集成 Google Analytics、Mixpanel 等工具获取更详细的数据分析
                </p>
              </div>
              <Button>
                配置集成
              </Button>
            </div>
          </CardContent>
        </Card>
      </main>
    </div>
  )
}
