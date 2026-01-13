'use client'

import { use } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import {
  Database,
  Globe,
  Key,
  HardDrive,
  FolderOpen,
  GitBranch,
  Clock,
} from 'lucide-react'

const ASSET_FEATURES = [
  {
    icon: GitBranch,
    name: '代码仓库管理',
    description: '连接 GitHub/GitLab，管理项目代码',
  },
  {
    icon: Database,
    name: '数据库连接',
    description: '管理 MongoDB、PostgreSQL 等数据库',
  },
  {
    icon: Globe,
    name: '域名管理',
    description: '配置自定义域名和 SSL 证书',
  },
  {
    icon: HardDrive,
    name: '存储服务',
    description: '管理云存储和 CDN 资源',
  },
  {
    icon: Key,
    name: 'API 密钥',
    description: '安全管理第三方服务密钥',
  },
]

export default function AssetsPage({ params }: { params: Promise<{ id: string }> }) {
  const { id: projectId } = use(params)

  return (
    <div className="bg-background">
      {/* Page Header */}
      <div className="border-b bg-muted/30">
        <div className="container mx-auto px-4 py-4 max-w-4xl">
          <div className="flex items-center justify-between">
            <div>
              <div className="flex items-center gap-3">
                <FolderOpen className="h-5 w-5 text-primary" />
                <h1 className="font-semibold text-lg">资产管理</h1>
                <Badge variant="secondary" className="bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400">
                  <Clock className="h-3 w-3 mr-1" />
                  即将推出
                </Badge>
              </div>
              <p className="text-sm text-muted-foreground mt-1">
                管理项目相关的代码、域名、数据库等资产
              </p>
            </div>
          </div>
        </div>
      </div>

      <main className="container mx-auto px-4 py-8 max-w-4xl">
        {/* Coming Soon Notice */}
        <Card className="mb-8 border-amber-200 dark:border-amber-800 bg-amber-50/50 dark:bg-amber-950/20">
          <CardContent className="p-6 text-center">
            <div className="w-16 h-16 bg-amber-100 dark:bg-amber-900/30 rounded-full flex items-center justify-center mx-auto mb-4">
              <FolderOpen className="h-8 w-8 text-amber-600 dark:text-amber-400" />
            </div>
            <h2 className="text-xl font-semibold mb-2">资产管理功能即将上线</h2>
            <p className="text-muted-foreground max-w-md mx-auto">
              我们正在开发完善的资产管理系统，帮助您统一管理项目相关的所有资源。
            </p>
          </CardContent>
        </Card>

        {/* Preview Stats */}
        <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mb-8">
          {[
            { icon: GitBranch, label: '代码', color: 'text-purple-500' },
            { icon: Database, label: '数据库', color: 'text-green-500' },
            { icon: Globe, label: '域名', color: 'text-blue-500' },
            { icon: HardDrive, label: '存储', color: 'text-orange-500' },
            { icon: Key, label: 'API', color: 'text-yellow-500' },
          ].map((item) => (
            <Card key={item.label} className="opacity-60">
              <CardContent className="p-4 text-center">
                <item.icon className={`h-6 w-6 mx-auto mb-2 ${item.color}`} />
                <div className="text-2xl font-bold text-muted-foreground">--</div>
                <div className="text-xs text-muted-foreground">{item.label}</div>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Feature Preview */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">功能预览</CardTitle>
            <CardDescription>资产管理将支持以下功能</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid md:grid-cols-2 gap-4">
              {ASSET_FEATURES.map((feature) => (
                <div
                  key={feature.name}
                  className="flex items-start gap-3 p-4 rounded-lg bg-muted/50"
                >
                  <div className="w-10 h-10 rounded-lg bg-background flex items-center justify-center shrink-0">
                    <feature.icon className="h-5 w-5 text-muted-foreground" />
                  </div>
                  <div>
                    <h3 className="font-medium">{feature.name}</h3>
                    <p className="text-sm text-muted-foreground">{feature.description}</p>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </main>
    </div>
  )
}
