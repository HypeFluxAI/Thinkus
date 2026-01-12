'use client'

import { useState, use } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import {
  Database,
  Globe,
  Key,
  Copy,
  Check,
  ExternalLink,
  Download,
  RefreshCw,
  HardDrive,
  FolderOpen,
  GitBranch,
  Settings,
  Shield,
  FileCode,
} from 'lucide-react'
import { toast } from 'sonner'

interface Asset {
  id: string
  type: 'code' | 'database' | 'domain' | 'storage' | 'api'
  name: string
  value: string
  status: 'active' | 'pending' | 'inactive'
  createdAt: Date
}

// Mock data
const MOCK_ASSETS: Asset[] = [
  {
    id: '1',
    type: 'code',
    name: 'GitHub Repository',
    value: 'https://github.com/thinkus-projects/pet-shop',
    status: 'active',
    createdAt: new Date('2026-01-10'),
  },
  {
    id: '2',
    type: 'domain',
    name: '演示域名',
    value: 'pet-shop.thinkus.dev',
    status: 'active',
    createdAt: new Date('2026-01-10'),
  },
  {
    id: '3',
    type: 'database',
    name: 'MongoDB Atlas',
    value: 'mongodb+srv://cluster0.xxxxx.mongodb.net/petshop',
    status: 'active',
    createdAt: new Date('2026-01-10'),
  },
  {
    id: '4',
    type: 'storage',
    name: 'Cloudflare R2',
    value: 'petshop-assets.r2.cloudflarestorage.com',
    status: 'active',
    createdAt: new Date('2026-01-10'),
  },
  {
    id: '5',
    type: 'api',
    name: 'Stripe API',
    value: 'sk_live_xxxx...xxxx',
    status: 'active',
    createdAt: new Date('2026-01-10'),
  },
]

const ASSET_ICONS = {
  code: GitBranch,
  database: Database,
  domain: Globe,
  storage: HardDrive,
  api: Key,
}

const ASSET_COLORS = {
  code: 'text-purple-500',
  database: 'text-green-500',
  domain: 'text-blue-500',
  storage: 'text-orange-500',
  api: 'text-yellow-500',
}

export default function AssetsPage({ params }: { params: Promise<{ id: string }> }) {
  const { id: projectId } = use(params)
  const [copiedId, setCopiedId] = useState<string | null>(null)
  const [assets] = useState<Asset[]>(MOCK_ASSETS)

  const copyToClipboard = (text: string, id: string) => {
    navigator.clipboard.writeText(text)
    setCopiedId(id)
    toast.success('已复制到剪贴板')
    setTimeout(() => setCopiedId(null), 2000)
  }

  const getAssetsByType = (type: Asset['type']) => assets.filter(a => a.type === type)

  const renderAssetCard = (asset: Asset) => {
    const Icon = ASSET_ICONS[asset.type]
    const colorClass = ASSET_COLORS[asset.type]

    return (
      <Card key={asset.id}>
        <CardContent className="p-4">
          <div className="flex items-start justify-between">
            <div className="flex items-start gap-3">
              <div className={`w-10 h-10 rounded-lg bg-muted flex items-center justify-center ${colorClass}`}>
                <Icon className="h-5 w-5" />
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <span className="font-medium">{asset.name}</span>
                  <Badge
                    variant={asset.status === 'active' ? 'default' : 'secondary'}
                    className="text-xs"
                  >
                    {asset.status === 'active' ? '活跃' : '待配置'}
                  </Badge>
                </div>
                <div className="flex items-center gap-2 mt-1">
                  <code className="text-sm text-muted-foreground font-mono truncate max-w-[300px]">
                    {asset.value}
                  </code>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-6 w-6 shrink-0"
                    onClick={() => copyToClipboard(asset.value, asset.id)}
                  >
                    {copiedId === asset.id ? (
                      <Check className="h-3 w-3 text-green-500" />
                    ) : (
                      <Copy className="h-3 w-3" />
                    )}
                  </Button>
                </div>
              </div>
            </div>
            <div className="flex gap-1">
              {asset.type === 'code' && (
                <a href={asset.value} target="_blank" rel="noopener noreferrer">
                  <Button variant="ghost" size="icon">
                    <ExternalLink className="h-4 w-4" />
                  </Button>
                </a>
              )}
              {asset.type === 'domain' && (
                <a href={`https://${asset.value}`} target="_blank" rel="noopener noreferrer">
                  <Button variant="ghost" size="icon">
                    <ExternalLink className="h-4 w-4" />
                  </Button>
                </a>
              )}
              <Button variant="ghost" size="icon">
                <Settings className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>
    )
  }

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
              </div>
              <p className="text-sm text-muted-foreground mt-1">
                管理项目相关的代码、域名、数据库等资产
              </p>
            </div>
            <Button variant="outline" size="sm">
              <RefreshCw className="h-4 w-4 mr-2" />
              同步状态
            </Button>
          </div>
        </div>
      </div>

      <main className="container mx-auto px-4 py-6 max-w-4xl">
        {/* Overview Stats */}
        <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mb-6">
          {Object.entries(ASSET_ICONS).map(([type, Icon]) => {
            const count = getAssetsByType(type as Asset['type']).length
            const colorClass = ASSET_COLORS[type as Asset['type']]
            return (
              <Card key={type}>
                <CardContent className="p-4 text-center">
                  <Icon className={`h-6 w-6 mx-auto mb-2 ${colorClass}`} />
                  <div className="text-2xl font-bold">{count}</div>
                  <div className="text-xs text-muted-foreground capitalize">{type}</div>
                </CardContent>
              </Card>
            )
          })}
        </div>

        {/* Tabs */}
        <Tabs defaultValue="all">
          <TabsList className="mb-4">
            <TabsTrigger value="all">全部</TabsTrigger>
            <TabsTrigger value="code">代码</TabsTrigger>
            <TabsTrigger value="database">数据库</TabsTrigger>
            <TabsTrigger value="domain">域名</TabsTrigger>
            <TabsTrigger value="storage">存储</TabsTrigger>
            <TabsTrigger value="api">API密钥</TabsTrigger>
          </TabsList>

          <TabsContent value="all" className="space-y-4">
            {assets.map(renderAssetCard)}
          </TabsContent>

          {Object.keys(ASSET_ICONS).map(type => (
            <TabsContent key={type} value={type} className="space-y-4">
              {getAssetsByType(type as Asset['type']).length === 0 ? (
                <Card>
                  <CardContent className="p-8 text-center">
                    <p className="text-muted-foreground">暂无此类型资产</p>
                  </CardContent>
                </Card>
              ) : (
                getAssetsByType(type as Asset['type']).map(renderAssetCard)
              )}
            </TabsContent>
          ))}
        </Tabs>

        {/* Quick Actions */}
        <Card className="mt-6">
          <CardHeader>
            <CardTitle className="text-base">快速操作</CardTitle>
            <CardDescription>常用资产管理操作</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid md:grid-cols-3 gap-4">
              <Button variant="outline" className="justify-start">
                <Download className="h-4 w-4 mr-2" />
                下载所有代码
              </Button>
              <Button variant="outline" className="justify-start">
                <Database className="h-4 w-4 mr-2" />
                导出数据库
              </Button>
              <Button variant="outline" className="justify-start">
                <Shield className="h-4 w-4 mr-2" />
                更新SSL证书
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* File Structure Preview */}
        <Card className="mt-6">
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <FileCode className="h-4 w-4" />
              项目结构
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="font-mono text-sm space-y-1">
              {[
                { name: 'src/', type: 'folder', size: '2.4 MB' },
                { name: '├── app/', type: 'folder', size: '1.2 MB' },
                { name: '├── components/', type: 'folder', size: '856 KB' },
                { name: '├── lib/', type: 'folder', size: '324 KB' },
                { name: '└── styles/', type: 'folder', size: '48 KB' },
                { name: 'public/', type: 'folder', size: '1.1 MB' },
                { name: 'package.json', type: 'file', size: '2.1 KB' },
                { name: 'README.md', type: 'file', size: '4.5 KB' },
              ].map((item, index) => (
                <div key={index} className="flex items-center justify-between py-1 px-2 hover:bg-muted/50 rounded">
                  <div className="flex items-center gap-2">
                    {item.type === 'folder' ? (
                      <FolderOpen className="h-4 w-4 text-yellow-500" />
                    ) : (
                      <FileCode className="h-4 w-4 text-blue-500" />
                    )}
                    <span>{item.name}</span>
                  </div>
                  <span className="text-muted-foreground text-xs">{item.size}</span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </main>
    </div>
  )
}
