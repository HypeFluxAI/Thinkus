'use client'

import { use } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { BarChart3, TrendingUp, Users, Eye, Clock, Sparkles } from 'lucide-react'

export default function AnalyticsPage({ params }: { params: Promise<{ id: string }> }) {
  const { id: projectId } = use(params)

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">数据分析</h2>
          <p className="text-muted-foreground">查看项目运营数据和用户行为分析</p>
        </div>
        <Badge variant="secondary" className="bg-primary/10 text-primary">
          <Sparkles className="h-3 w-3 mr-1" />
          即将推出
        </Badge>
      </div>

      {/* 功能预览卡片 */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card className="border-dashed opacity-60">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">访客数量</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-muted-foreground">--</div>
            <p className="text-xs text-muted-foreground">等待数据接入</p>
          </CardContent>
        </Card>
        <Card className="border-dashed opacity-60">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">页面浏览</CardTitle>
            <Eye className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-muted-foreground">--</div>
            <p className="text-xs text-muted-foreground">等待数据接入</p>
          </CardContent>
        </Card>
        <Card className="border-dashed opacity-60">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">平均时长</CardTitle>
            <Clock className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-muted-foreground">--</div>
            <p className="text-xs text-muted-foreground">等待数据接入</p>
          </CardContent>
        </Card>
        <Card className="border-dashed opacity-60">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">转化率</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-muted-foreground">--</div>
            <p className="text-xs text-muted-foreground">等待数据接入</p>
          </CardContent>
        </Card>
      </div>

      {/* 即将推出说明 */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <BarChart3 className="h-5 w-5" />
            数据分析功能即将推出
          </CardTitle>
          <CardDescription>
            我们正在开发强大的数据分析功能，帮助您了解产品表现
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <h4 className="font-medium">即将支持的功能：</h4>
              <ul className="text-sm text-muted-foreground space-y-1">
                <li>• 实时访客监控</li>
                <li>• 用户行为分析</li>
                <li>• 转化漏斗追踪</li>
                <li>• 自定义事件统计</li>
              </ul>
            </div>
            <div className="space-y-2">
              <h4 className="font-medium">数据可视化：</h4>
              <ul className="text-sm text-muted-foreground space-y-1">
                <li>• 趋势图表展示</li>
                <li>• 地理分布地图</li>
                <li>• 设备类型统计</li>
                <li>• 导出数据报表</li>
              </ul>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
