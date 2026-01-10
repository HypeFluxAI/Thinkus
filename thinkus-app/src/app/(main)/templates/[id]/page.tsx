'use client'

import { useState, use } from 'react'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Separator } from '@/components/ui/separator'
import {
  ArrowLeft,
  Star,
  Download,
  Heart,
  Eye,
  Share2,
  Check,
  Sparkles,
  Zap,
  Clock,
  Users,
  Code,
  Shield,
  MessageSquare,
  ChevronRight,
  ExternalLink,
} from 'lucide-react'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'

// Mock template data
const TEMPLATE = {
  id: '1',
  name: '电商精品店',
  description: '现代化的电商解决方案，支持产品展示、购物车、在线支付。适合中小型电商创业者快速启动在线业务。',
  longDescription: `
    这是一个功能完整的电商解决方案，专为中小型商家设计。模板包含从产品展示到订单管理的完整流程，
    让您可以在几小时内启动自己的在线商店。

    主要特点：
    - 响应式设计，完美适配桌面和移动设备
    - 集成Stripe支付，支持多种支付方式
    - 完整的后台管理系统
    - SEO优化，帮助您获得更多搜索流量
    - 性能优化，加载速度快
  `,
  category: 'ecommerce',
  image: '/templates/ecommerce.png',
  price: 299,
  originalPrice: 499,
  rating: 4.9,
  reviews: 128,
  downloads: 1234,
  features: [
    '产品管理 - 无限产品、分类、标签',
    '购物车 - 持久化购物车、优惠券',
    'Stripe支付 - 信用卡、Apple Pay',
    '订单管理 - 状态追踪、退款处理',
    '库存追踪 - 低库存提醒、变体管理',
    '用户系统 - 注册登录、订单历史',
    '邮件通知 - 订单确认、发货通知',
    'SEO优化 - 元标签、结构化数据',
  ],
  techStack: [
    { name: 'Next.js 14', category: 'Frontend' },
    { name: 'React 18', category: 'Frontend' },
    { name: 'TypeScript', category: 'Language' },
    { name: 'Tailwind CSS', category: 'Styling' },
    { name: 'tRPC', category: 'API' },
    { name: 'MongoDB', category: 'Database' },
    { name: 'Redis', category: 'Cache' },
    { name: 'Stripe', category: 'Payment' },
  ],
  screenshots: [
    { title: '首页', url: '/screenshots/home.png' },
    { title: '产品列表', url: '/screenshots/products.png' },
    { title: '产品详情', url: '/screenshots/product-detail.png' },
    { title: '购物车', url: '/screenshots/cart.png' },
    { title: '结账', url: '/screenshots/checkout.png' },
    { title: '后台管理', url: '/screenshots/admin.png' },
  ],
  author: {
    name: 'Thinkus Team',
    avatar: '/avatars/thinkus.png',
    verified: true,
    templates: 12,
  },
  createdAt: new Date('2025-12-01'),
  updatedAt: new Date('2026-01-05'),
  isPremium: true,
}

const REVIEWS = [
  {
    id: '1',
    user: '李明',
    avatar: null,
    rating: 5,
    date: '2026-01-08',
    content: '非常棒的模板！代码质量高，文档清晰。我只用了一天就上线了自己的网店。',
    helpful: 23,
  },
  {
    id: '2',
    user: '王芳',
    avatar: null,
    rating: 5,
    date: '2026-01-05',
    content: '支付集成做得很好，Stripe配置简单。客服响应也很快，有问必答。',
    helpful: 18,
  },
  {
    id: '3',
    user: '张伟',
    avatar: null,
    rating: 4,
    date: '2025-12-28',
    content: '功能齐全，唯一的建议是希望能增加更多主题配色选项。',
    helpful: 12,
  },
]

const RELATED_TEMPLATES = [
  {
    id: '2',
    name: 'SaaS启动器',
    price: 399,
    rating: 4.8,
  },
  {
    id: '7',
    name: '移动端商城',
    price: 599,
    rating: 4.9,
  },
  {
    id: '8',
    name: '预约系统',
    price: 249,
    rating: 4.6,
  },
]

export default function TemplateDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params)
  const [isFavorite, setIsFavorite] = useState(false)
  const [selectedTab, setSelectedTab] = useState('overview')

  const template = TEMPLATE // In real app, fetch by id

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b sticky top-0 z-50 bg-background/80 backdrop-blur-sm">
        <div className="container mx-auto px-4 h-14 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Link href="/templates">
              <Button variant="ghost" size="icon">
                <ArrowLeft className="h-4 w-4" />
              </Button>
            </Link>
            <span className="font-medium">模板详情</span>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="ghost" size="icon" onClick={() => setIsFavorite(!isFavorite)}>
              <Heart className={`h-5 w-5 ${isFavorite ? 'fill-red-500 text-red-500' : ''}`} />
            </Button>
            <Button variant="ghost" size="icon">
              <Share2 className="h-5 w-5" />
            </Button>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 py-8">
        <div className="grid lg:grid-cols-3 gap-8">
          {/* Main Content */}
          <div className="lg:col-span-2 space-y-8">
            {/* Preview Image */}
            <div className="aspect-video bg-muted rounded-lg overflow-hidden relative">
              <div className="absolute inset-0 bg-gradient-to-br from-primary/20 to-primary/5 flex items-center justify-center">
                <Sparkles className="h-16 w-16 text-primary/50" />
              </div>
              {template.isPremium && (
                <Badge variant="secondary" className="absolute top-4 right-4">
                  <Zap className="h-3 w-3 mr-1" />
                  高级模板
                </Badge>
              )}
            </div>

            {/* Template Info */}
            <div>
              <div className="flex items-start justify-between mb-4">
                <div>
                  <h1 className="text-3xl font-bold mb-2">{template.name}</h1>
                  <p className="text-muted-foreground">{template.description}</p>
                </div>
              </div>

              <div className="flex flex-wrap items-center gap-4 text-sm">
                <div className="flex items-center gap-1">
                  <Star className="h-4 w-4 fill-yellow-400 text-yellow-400" />
                  <span className="font-medium">{template.rating}</span>
                  <span className="text-muted-foreground">({template.reviews} 评价)</span>
                </div>
                <div className="flex items-center gap-1 text-muted-foreground">
                  <Download className="h-4 w-4" />
                  <span>{template.downloads} 次下载</span>
                </div>
                <div className="flex items-center gap-1 text-muted-foreground">
                  <Clock className="h-4 w-4" />
                  <span>更新于 {template.updatedAt.toLocaleDateString('zh-CN')}</span>
                </div>
              </div>
            </div>

            {/* Tabs */}
            <Tabs value={selectedTab} onValueChange={setSelectedTab}>
              <TabsList>
                <TabsTrigger value="overview">概览</TabsTrigger>
                <TabsTrigger value="features">功能</TabsTrigger>
                <TabsTrigger value="techstack">技术栈</TabsTrigger>
                <TabsTrigger value="reviews">评价</TabsTrigger>
              </TabsList>

              <TabsContent value="overview" className="mt-6 space-y-6">
                <Card>
                  <CardHeader>
                    <CardTitle>关于此模板</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="text-muted-foreground whitespace-pre-line">
                      {template.longDescription}
                    </p>
                  </CardContent>
                </Card>

                {/* Screenshots */}
                <Card>
                  <CardHeader>
                    <CardTitle>截图预览</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                      {template.screenshots.map((screenshot, index) => (
                        <div key={index} className="aspect-video bg-muted rounded-lg overflow-hidden relative group cursor-pointer">
                          <div className="absolute inset-0 bg-gradient-to-br from-primary/10 to-transparent flex items-center justify-center">
                            <span className="text-sm text-muted-foreground">{screenshot.title}</span>
                          </div>
                          <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                            <Eye className="h-6 w-6 text-white" />
                          </div>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              </TabsContent>

              <TabsContent value="features" className="mt-6">
                <Card>
                  <CardHeader>
                    <CardTitle>包含功能</CardTitle>
                    <CardDescription>此模板包含以下核心功能</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="grid md:grid-cols-2 gap-4">
                      {template.features.map((feature, index) => (
                        <div key={index} className="flex items-start gap-3">
                          <div className="w-6 h-6 rounded-full bg-primary/10 flex items-center justify-center shrink-0 mt-0.5">
                            <Check className="h-4 w-4 text-primary" />
                          </div>
                          <span>{feature}</span>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              </TabsContent>

              <TabsContent value="techstack" className="mt-6">
                <Card>
                  <CardHeader>
                    <CardTitle>技术栈</CardTitle>
                    <CardDescription>此模板使用的技术和工具</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="flex flex-wrap gap-2">
                      {template.techStack.map((tech, index) => (
                        <Badge key={index} variant="outline" className="py-2 px-4">
                          <Code className="h-4 w-4 mr-2" />
                          {tech.name}
                          <span className="text-muted-foreground ml-2">({tech.category})</span>
                        </Badge>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              </TabsContent>

              <TabsContent value="reviews" className="mt-6 space-y-4">
                <Card>
                  <CardHeader>
                    <CardTitle>用户评价</CardTitle>
                    <CardDescription>
                      {template.reviews} 条评价，平均 {template.rating} 分
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-6">
                    {REVIEWS.map(review => (
                      <div key={review.id} className="pb-6 border-b last:border-0 last:pb-0">
                        <div className="flex items-start gap-4">
                          <Avatar>
                            <AvatarFallback>{review.user.charAt(0)}</AvatarFallback>
                          </Avatar>
                          <div className="flex-1">
                            <div className="flex items-center justify-between mb-1">
                              <span className="font-medium">{review.user}</span>
                              <span className="text-sm text-muted-foreground">{review.date}</span>
                            </div>
                            <div className="flex gap-0.5 mb-2">
                              {Array.from({ length: review.rating }).map((_, i) => (
                                <Star key={i} className="h-4 w-4 fill-yellow-400 text-yellow-400" />
                              ))}
                            </div>
                            <p className="text-sm text-muted-foreground">{review.content}</p>
                            <Button variant="ghost" size="sm" className="mt-2 text-xs">
                              有帮助 ({review.helpful})
                            </Button>
                          </div>
                        </div>
                      </div>
                    ))}
                  </CardContent>
                </Card>
              </TabsContent>
            </Tabs>
          </div>

          {/* Sidebar */}
          <div className="space-y-6">
            {/* Purchase Card */}
            <Card className="sticky top-20">
              <CardContent className="p-6">
                <div className="flex items-baseline gap-2 mb-4">
                  <span className="text-3xl font-bold">${template.price}</span>
                  {template.originalPrice && (
                    <span className="text-lg text-muted-foreground line-through">
                      ${template.originalPrice}
                    </span>
                  )}
                  {template.originalPrice && (
                    <Badge variant="secondary">
                      省 ${template.originalPrice - template.price}
                    </Badge>
                  )}
                </div>

                <div className="space-y-3 mb-6">
                  <Button className="w-full" size="lg">
                    <Sparkles className="mr-2 h-5 w-5" />
                    使用此模板
                  </Button>
                  <Button variant="outline" className="w-full" size="lg">
                    <ExternalLink className="mr-2 h-5 w-5" />
                    在线预览
                  </Button>
                </div>

                <Separator className="my-6" />

                <div className="space-y-4 text-sm">
                  <div className="flex items-center gap-3">
                    <Shield className="h-5 w-5 text-green-500" />
                    <span>30天退款保证</span>
                  </div>
                  <div className="flex items-center gap-3">
                    <Code className="h-5 w-5 text-blue-500" />
                    <span>完整源代码</span>
                  </div>
                  <div className="flex items-center gap-3">
                    <Users className="h-5 w-5 text-purple-500" />
                    <span>免费技术支持</span>
                  </div>
                  <div className="flex items-center gap-3">
                    <Zap className="h-5 w-5 text-yellow-500" />
                    <span>终身免费更新</span>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Author Card */}
            <Card>
              <CardHeader>
                <CardTitle className="text-base">开发者</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex items-center gap-3">
                  <Avatar className="h-12 w-12">
                    <AvatarFallback className="bg-primary/10 text-primary">T</AvatarFallback>
                  </Avatar>
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-medium">{template.author.name}</span>
                      {template.author.verified && (
                        <Badge variant="secondary" className="text-xs">
                          <Check className="h-3 w-3 mr-1" />
                          已认证
                        </Badge>
                      )}
                    </div>
                    <p className="text-sm text-muted-foreground">
                      {template.author.templates} 个模板
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Related Templates */}
            <Card>
              <CardHeader>
                <CardTitle className="text-base">相关模板</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {RELATED_TEMPLATES.map(related => (
                  <Link
                    key={related.id}
                    href={`/templates/${related.id}`}
                    className="flex items-center justify-between py-2 hover:bg-muted/50 -mx-2 px-2 rounded"
                  >
                    <div>
                      <div className="font-medium">{related.name}</div>
                      <div className="flex items-center gap-1 text-sm text-muted-foreground">
                        <Star className="h-3 w-3 fill-yellow-400 text-yellow-400" />
                        {related.rating}
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="font-medium">${related.price}</span>
                      <ChevronRight className="h-4 w-4 text-muted-foreground" />
                    </div>
                  </Link>
                ))}
              </CardContent>
            </Card>
          </div>
        </div>
      </main>
    </div>
  )
}
