'use client'

import { useState, use } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Separator } from '@/components/ui/separator'
import {
  ArrowLeft,
  Download,
  ExternalLink,
  Github,
  Globe,
  Code,
  FileCode,
  FolderOpen,
  Copy,
  Check,
  Rocket,
  Star,
  MessageSquare,
} from 'lucide-react'
import Link from 'next/link'
import { toast } from 'sonner'

interface DeliveryFile {
  name: string
  size: string
  type: 'folder' | 'file'
  icon: React.ElementType
}

const DELIVERY_FILES: DeliveryFile[] = [
  { name: 'src/', size: '2.4 MB', type: 'folder', icon: FolderOpen },
  { name: 'public/', size: '856 KB', type: 'folder', icon: FolderOpen },
  { name: 'package.json', size: '2.1 KB', type: 'file', icon: FileCode },
  { name: 'README.md', size: '4.5 KB', type: 'file', icon: FileCode },
  { name: 'docker-compose.yml', size: '1.2 KB', type: 'file', icon: FileCode },
  { name: '.env.example', size: '512 B', type: 'file', icon: FileCode },
]

export default function CompletePage({ params }: { params: Promise<{ id: string }> }) {
  const { id: projectId } = use(params)
  const [copiedUrl, setCopiedUrl] = useState(false)

  // Mock project data
  const project = {
    name: '宠物电商平台',
    demoUrl: 'https://demo.thinkus.dev/pet-shop',
    repoUrl: 'https://github.com/thinkus-projects/pet-shop',
    deployedAt: new Date().toLocaleDateString('zh-CN'),
    techStack: ['Next.js 14', 'TypeScript', 'Tailwind CSS', 'MongoDB', 'Stripe'],
    features: [
      '用户注册登录',
      '商品浏览搜索',
      '购物车管理',
      '订单支付',
      '用户中心',
    ],
  }

  const handleCopyUrl = () => {
    navigator.clipboard.writeText(project.demoUrl)
    setCopiedUrl(true)
    toast.success('链接已复制')
    setTimeout(() => setCopiedUrl(false), 2000)
  }

  const handleDownload = () => {
    toast.success('下载已开始，请稍候...')
    // In real implementation, this would trigger a file download
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b sticky top-0 z-50 bg-background/80 backdrop-blur-sm">
        <div className="container mx-auto px-4 h-14 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Link href="/dashboard">
              <Button variant="ghost" size="icon">
                <ArrowLeft className="h-4 w-4" />
              </Button>
            </Link>
            <div>
              <span className="font-semibold">{project.name}</span>
              <Badge variant="secondary" className="ml-2 bg-green-500/10 text-green-500">
                已完成
              </Badge>
            </div>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 py-8 max-w-4xl">
        {/* Success Banner */}
        <Card className="mb-6 border-green-500/50 bg-gradient-to-r from-green-500/10 to-emerald-500/10">
          <CardContent className="p-6">
            <div className="flex flex-col md:flex-row items-center gap-6">
              <div className="w-16 h-16 rounded-full bg-green-500/20 flex items-center justify-center shrink-0">
                <Rocket className="h-8 w-8 text-green-500" />
              </div>
              <div className="flex-1 text-center md:text-left">
                <h1 className="text-2xl font-bold mb-2">您的产品已准备就绪！</h1>
                <p className="text-muted-foreground">
                  完成时间: {project.deployedAt} · 代码100%归您所有
                </p>
              </div>
              <div className="flex gap-2">
                <a href={project.demoUrl} target="_blank" rel="noopener noreferrer">
                  <Button>
                    <Globe className="mr-2 h-4 w-4" />
                    查看演示
                  </Button>
                </a>
                <Button variant="outline" onClick={handleDownload}>
                  <Download className="mr-2 h-4 w-4" />
                  下载代码
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>

        <div className="grid md:grid-cols-2 gap-6">
          {/* Quick Links */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base">快速访问</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex items-center justify-between p-3 rounded-lg bg-muted/50">
                <div className="flex items-center gap-3">
                  <Globe className="h-5 w-5 text-primary" />
                  <div>
                    <p className="font-medium text-sm">演示站点</p>
                    <p className="text-xs text-muted-foreground truncate max-w-[200px]">
                      {project.demoUrl}
                    </p>
                  </div>
                </div>
                <div className="flex gap-1">
                  <Button variant="ghost" size="icon" onClick={handleCopyUrl}>
                    {copiedUrl ? (
                      <Check className="h-4 w-4 text-green-500" />
                    ) : (
                      <Copy className="h-4 w-4" />
                    )}
                  </Button>
                  <a href={project.demoUrl} target="_blank" rel="noopener noreferrer">
                    <Button variant="ghost" size="icon">
                      <ExternalLink className="h-4 w-4" />
                    </Button>
                  </a>
                </div>
              </div>

              <div className="flex items-center justify-between p-3 rounded-lg bg-muted/50">
                <div className="flex items-center gap-3">
                  <Github className="h-5 w-5" />
                  <div>
                    <p className="font-medium text-sm">代码仓库</p>
                    <p className="text-xs text-muted-foreground">私有仓库已创建</p>
                  </div>
                </div>
                <a href={project.repoUrl} target="_blank" rel="noopener noreferrer">
                  <Button variant="ghost" size="icon">
                    <ExternalLink className="h-4 w-4" />
                  </Button>
                </a>
              </div>
            </CardContent>
          </Card>

          {/* Tech Stack */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                <Code className="h-4 w-4" />
                技术栈
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex flex-wrap gap-2">
                {project.techStack.map(tech => (
                  <Badge key={tech} variant="secondary">
                    {tech}
                  </Badge>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Features Delivered */}
        <Card className="mt-6">
          <CardHeader>
            <CardTitle className="text-base">交付功能</CardTitle>
            <CardDescription>以下功能已全部实现并测试通过</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid md:grid-cols-2 gap-2">
              {project.features.map((feature, index) => (
                <div key={index} className="flex items-center gap-2 p-2">
                  <Check className="h-4 w-4 text-green-500" />
                  <span className="text-sm">{feature}</span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* File Structure */}
        <Card className="mt-6">
          <CardHeader>
            <CardTitle className="text-base">项目文件</CardTitle>
            <CardDescription>完整源代码结构</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-1">
              {DELIVERY_FILES.map(file => {
                const FileIcon = file.icon
                return (
                  <div
                    key={file.name}
                    className="flex items-center justify-between py-2 px-3 rounded-lg hover:bg-muted/50"
                  >
                    <div className="flex items-center gap-3">
                      <FileIcon
                        className={`h-4 w-4 ${
                          file.type === 'folder' ? 'text-yellow-500' : 'text-blue-500'
                        }`}
                      />
                      <span className="text-sm font-mono">{file.name}</span>
                    </div>
                    <span className="text-xs text-muted-foreground">{file.size}</span>
                  </div>
                )
              })}
            </div>
            <Separator className="my-4" />
            <Button className="w-full" onClick={handleDownload}>
              <Download className="mr-2 h-4 w-4" />
              下载完整项目 (ZIP)
            </Button>
          </CardContent>
        </Card>

        {/* Feedback CTA */}
        <Card className="mt-6 bg-muted/30">
          <CardContent className="p-6">
            <div className="flex flex-col md:flex-row items-center gap-4 text-center md:text-left">
              <div className="flex-1">
                <h3 className="font-medium mb-1">满意您的产品吗？</h3>
                <p className="text-sm text-muted-foreground">
                  您的反馈对我们很重要，帮助我们持续改进
                </p>
              </div>
              <div className="flex gap-2">
                <Button variant="outline">
                  <Star className="mr-2 h-4 w-4" />
                  给个好评
                </Button>
                <Button variant="ghost">
                  <MessageSquare className="mr-2 h-4 w-4" />
                  提交反馈
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      </main>
    </div>
  )
}
