'use client'

import { useState } from 'react'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import {
  Search,
  Star,
  Eye,
  Download,
  Heart,
  Filter,
  SortAsc,
  Globe,
  ShoppingCart,
  Users,
  FileText,
  Smartphone,
  Building2,
  Sparkles,
  ChevronRight,
  Clock,
  Zap,
} from 'lucide-react'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'

interface Template {
  id: string
  name: string
  description: string
  category: string
  image: string
  price: number
  originalPrice?: number
  rating: number
  reviews: number
  downloads: number
  features: string[]
  techStack: string[]
  author: string
  isNew?: boolean
  isFeatured?: boolean
  isPremium?: boolean
}

const TEMPLATES: Template[] = [
  {
    id: '1',
    name: '电商精品店',
    description: '现代化的电商解决方案，支持产品展示、购物车、在线支付',
    category: 'ecommerce',
    image: '/templates/ecommerce.png',
    price: 299,
    originalPrice: 499,
    rating: 4.9,
    reviews: 128,
    downloads: 1234,
    features: ['产品管理', '购物车', 'Stripe支付', '订单管理', '库存追踪'],
    techStack: ['Next.js', 'TypeScript', 'MongoDB', 'Stripe'],
    author: 'Thinkus Team',
    isFeatured: true,
    isPremium: true,
  },
  {
    id: '2',
    name: 'SaaS启动器',
    description: '完整的SaaS应用模板，包含用户认证、订阅计费、仪表盘',
    category: 'saas',
    image: '/templates/saas.png',
    price: 399,
    originalPrice: 599,
    rating: 4.8,
    reviews: 89,
    downloads: 856,
    features: ['用户认证', '订阅计费', '管理后台', '团队管理', 'API文档'],
    techStack: ['Next.js', 'TypeScript', 'PostgreSQL', 'Stripe'],
    author: 'Thinkus Team',
    isFeatured: true,
    isPremium: true,
  },
  {
    id: '3',
    name: '博客平台',
    description: '简洁优雅的博客系统，支持Markdown、评论、SEO优化',
    category: 'content',
    image: '/templates/blog.png',
    price: 99,
    rating: 4.7,
    reviews: 234,
    downloads: 2345,
    features: ['Markdown编辑', '评论系统', 'SEO优化', '标签分类', 'RSS订阅'],
    techStack: ['Next.js', 'MDX', 'MongoDB'],
    author: 'Thinkus Team',
    isNew: true,
  },
  {
    id: '4',
    name: '企业官网',
    description: '专业的企业官网模板，展示公司信息、服务、团队',
    category: 'web',
    image: '/templates/corporate.png',
    price: 149,
    rating: 4.6,
    reviews: 167,
    downloads: 1567,
    features: ['响应式设计', '联系表单', '服务展示', '团队介绍', '新闻动态'],
    techStack: ['Next.js', 'TypeScript', 'Tailwind'],
    author: 'Thinkus Team',
  },
  {
    id: '5',
    name: '社交平台',
    description: '功能丰富的社交网络模板，支持动态、关注、私信',
    category: 'social',
    image: '/templates/social.png',
    price: 499,
    rating: 4.8,
    reviews: 56,
    downloads: 423,
    features: ['用户动态', '关注系统', '私信聊天', '通知推送', '搜索发现'],
    techStack: ['Next.js', 'TypeScript', 'MongoDB', 'WebSocket'],
    author: 'Thinkus Team',
    isPremium: true,
  },
  {
    id: '6',
    name: '在线课程',
    description: '教育平台模板，支持课程管理、视频播放、进度追踪',
    category: 'content',
    image: '/templates/course.png',
    price: 349,
    originalPrice: 499,
    rating: 4.7,
    reviews: 78,
    downloads: 678,
    features: ['课程管理', '视频播放', '进度追踪', '证书颁发', '测验系统'],
    techStack: ['Next.js', 'TypeScript', 'MongoDB', 'Mux'],
    author: 'Thinkus Team',
    isNew: true,
    isPremium: true,
  },
  {
    id: '7',
    name: '移动端商城',
    description: 'React Native跨平台电商应用，iOS和Android通用',
    category: 'mobile',
    image: '/templates/mobile-shop.png',
    price: 599,
    rating: 4.9,
    reviews: 34,
    downloads: 234,
    features: ['产品浏览', '购物车', '支付集成', '订单追踪', '推送通知'],
    techStack: ['React Native', 'Expo', 'MongoDB', 'Stripe'],
    author: 'Thinkus Team',
    isPremium: true,
  },
  {
    id: '8',
    name: '预约系统',
    description: '通用预约管理系统，适用于医疗、美容、健身等行业',
    category: 'saas',
    image: '/templates/booking.png',
    price: 249,
    rating: 4.6,
    reviews: 92,
    downloads: 756,
    features: ['日历视图', '预约管理', '提醒通知', '客户管理', '报表统计'],
    techStack: ['Next.js', 'TypeScript', 'PostgreSQL'],
    author: 'Thinkus Team',
  },
]

const CATEGORIES = [
  { id: 'all', name: '全部', icon: Sparkles },
  { id: 'web', name: 'Web应用', icon: Globe },
  { id: 'ecommerce', name: '电商', icon: ShoppingCart },
  { id: 'saas', name: 'SaaS', icon: Building2 },
  { id: 'social', name: '社交', icon: Users },
  { id: 'content', name: '内容', icon: FileText },
  { id: 'mobile', name: '移动端', icon: Smartphone },
]

export default function TemplatesPage() {
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedCategory, setSelectedCategory] = useState('all')
  const [sortBy, setSortBy] = useState('popular')
  const [favorites, setFavorites] = useState<string[]>([])

  const toggleFavorite = (id: string) => {
    setFavorites(prev =>
      prev.includes(id) ? prev.filter(f => f !== id) : [...prev, id]
    )
  }

  const filteredTemplates = TEMPLATES.filter(template => {
    const matchesSearch =
      template.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      template.description.toLowerCase().includes(searchQuery.toLowerCase())
    const matchesCategory =
      selectedCategory === 'all' || template.category === selectedCategory
    return matchesSearch && matchesCategory
  }).sort((a, b) => {
    switch (sortBy) {
      case 'popular':
        return b.downloads - a.downloads
      case 'rating':
        return b.rating - a.rating
      case 'newest':
        return (b.isNew ? 1 : 0) - (a.isNew ? 1 : 0)
      case 'price-low':
        return a.price - b.price
      case 'price-high':
        return b.price - a.price
      default:
        return 0
    }
  })

  const featuredTemplates = TEMPLATES.filter(t => t.isFeatured)

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b sticky top-0 z-50 bg-background/80 backdrop-blur-sm">
        <div className="container mx-auto px-4 h-14 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Link href="/" className="flex items-center gap-2">
              <Sparkles className="h-5 w-5 text-primary" />
              <span className="font-bold">Thinkus</span>
            </Link>
            <span className="text-muted-foreground">/</span>
            <span className="font-medium">模板市场</span>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="ghost" size="sm" asChild>
              <Link href="/projects">我的项目</Link>
            </Button>
            <Button size="sm" asChild>
              <Link href="/create">创建项目</Link>
            </Button>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 py-8">
        {/* Hero */}
        <div className="text-center mb-12">
          <h1 className="text-4xl font-bold mb-4">模板市场</h1>
          <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
            浏览精选的项目模板，快速启动您的下一个产品。所有模板均经过专业设计和测试。
          </p>
        </div>

        {/* Featured Templates */}
        {featuredTemplates.length > 0 && (
          <section className="mb-12">
            <div className="flex items-center justify-between mb-6">
              <div>
                <h2 className="text-2xl font-bold">精选模板</h2>
                <p className="text-muted-foreground">最受欢迎的项目模板</p>
              </div>
              <Button variant="ghost" size="sm">
                查看全部
                <ChevronRight className="ml-1 h-4 w-4" />
              </Button>
            </div>
            <div className="grid md:grid-cols-2 gap-6">
              {featuredTemplates.slice(0, 2).map(template => (
                <Card key={template.id} className="overflow-hidden group">
                  <div className="aspect-video bg-muted relative">
                    <div className="absolute inset-0 bg-gradient-to-br from-primary/20 to-primary/5 flex items-center justify-center">
                      <Sparkles className="h-12 w-12 text-primary/50" />
                    </div>
                    {template.isNew && (
                      <Badge className="absolute top-3 left-3">新品</Badge>
                    )}
                    {template.isPremium && (
                      <Badge variant="secondary" className="absolute top-3 right-3">
                        <Zap className="h-3 w-3 mr-1" />
                        高级
                      </Badge>
                    )}
                  </div>
                  <CardContent className="p-6">
                    <div className="flex items-start justify-between mb-2">
                      <div>
                        <h3 className="font-semibold text-lg">{template.name}</h3>
                        <p className="text-sm text-muted-foreground">{template.description}</p>
                      </div>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => toggleFavorite(template.id)}
                      >
                        <Heart
                          className={`h-5 w-5 ${
                            favorites.includes(template.id)
                              ? 'fill-red-500 text-red-500'
                              : ''
                          }`}
                        />
                      </Button>
                    </div>
                    <div className="flex items-center gap-4 text-sm text-muted-foreground mb-4">
                      <span className="flex items-center gap-1">
                        <Star className="h-4 w-4 fill-yellow-400 text-yellow-400" />
                        {template.rating}
                      </span>
                      <span className="flex items-center gap-1">
                        <Download className="h-4 w-4" />
                        {template.downloads}
                      </span>
                      <span className="flex items-center gap-1">
                        <Eye className="h-4 w-4" />
                        {template.reviews} 评价
                      </span>
                    </div>
                    <div className="flex flex-wrap gap-1 mb-4">
                      {template.techStack.map(tech => (
                        <Badge key={tech} variant="outline" className="text-xs">
                          {tech}
                        </Badge>
                      ))}
                    </div>
                    <div className="flex items-center justify-between">
                      <div className="flex items-baseline gap-2">
                        <span className="text-2xl font-bold">${template.price}</span>
                        {template.originalPrice && (
                          <span className="text-sm text-muted-foreground line-through">
                            ${template.originalPrice}
                          </span>
                        )}
                      </div>
                      <div className="flex gap-2">
                        <Button variant="outline" size="sm">
                          预览
                        </Button>
                        <Button size="sm">
                          使用模板
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </section>
        )}

        {/* Search and Filters */}
        <div className="flex flex-col md:flex-row gap-4 mb-6">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="搜索模板..."
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              className="pl-10"
            />
          </div>
          <Select value={sortBy} onValueChange={setSortBy}>
            <SelectTrigger className="w-[160px]">
              <SortAsc className="h-4 w-4 mr-2" />
              <SelectValue placeholder="排序" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="popular">最受欢迎</SelectItem>
              <SelectItem value="rating">评分最高</SelectItem>
              <SelectItem value="newest">最新上架</SelectItem>
              <SelectItem value="price-low">价格从低到高</SelectItem>
              <SelectItem value="price-high">价格从高到低</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Category Tabs */}
        <Tabs value={selectedCategory} onValueChange={setSelectedCategory} className="mb-8">
          <TabsList className="flex-wrap h-auto gap-2 bg-transparent p-0">
            {CATEGORIES.map(category => {
              const Icon = category.icon
              return (
                <TabsTrigger
                  key={category.id}
                  value={category.id}
                  className="data-[state=active]:bg-primary data-[state=active]:text-primary-foreground"
                >
                  <Icon className="h-4 w-4 mr-1" />
                  {category.name}
                </TabsTrigger>
              )
            })}
          </TabsList>
        </Tabs>

        {/* Template Grid */}
        <div className="grid md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
          {filteredTemplates.map(template => (
            <Card key={template.id} className="overflow-hidden group hover:shadow-lg transition-shadow">
              <div className="aspect-video bg-muted relative">
                <div className="absolute inset-0 bg-gradient-to-br from-primary/10 to-transparent flex items-center justify-center">
                  <Sparkles className="h-8 w-8 text-primary/30" />
                </div>
                {template.isNew && (
                  <Badge className="absolute top-2 left-2 text-xs">新品</Badge>
                )}
                {template.isPremium && (
                  <Badge variant="secondary" className="absolute top-2 right-2 text-xs">
                    <Zap className="h-3 w-3 mr-1" />
                    高级
                  </Badge>
                )}
                <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
                  <Button size="sm" variant="secondary">
                    <Eye className="h-4 w-4 mr-1" />
                    预览
                  </Button>
                </div>
              </div>
              <CardContent className="p-4">
                <div className="flex items-start justify-between mb-1">
                  <h3 className="font-medium truncate">{template.name}</h3>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8 shrink-0"
                    onClick={() => toggleFavorite(template.id)}
                  >
                    <Heart
                      className={`h-4 w-4 ${
                        favorites.includes(template.id)
                          ? 'fill-red-500 text-red-500'
                          : ''
                      }`}
                    />
                  </Button>
                </div>
                <p className="text-sm text-muted-foreground line-clamp-2 mb-3">
                  {template.description}
                </p>
                <div className="flex items-center gap-3 text-xs text-muted-foreground mb-3">
                  <span className="flex items-center gap-1">
                    <Star className="h-3 w-3 fill-yellow-400 text-yellow-400" />
                    {template.rating}
                  </span>
                  <span className="flex items-center gap-1">
                    <Download className="h-3 w-3" />
                    {template.downloads}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <div className="flex items-baseline gap-1">
                    <span className="font-bold">${template.price}</span>
                    {template.originalPrice && (
                      <span className="text-xs text-muted-foreground line-through">
                        ${template.originalPrice}
                      </span>
                    )}
                  </div>
                  <Button size="sm">使用</Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        {filteredTemplates.length === 0 && (
          <div className="text-center py-12">
            <Search className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
            <h3 className="text-lg font-medium mb-2">未找到匹配的模板</h3>
            <p className="text-muted-foreground">
              尝试调整搜索条件或浏览其他分类
            </p>
          </div>
        )}

        {/* CTA */}
        <Card className="mt-12 bg-gradient-to-r from-primary/10 to-primary/5">
          <CardContent className="p-8 text-center">
            <h2 className="text-2xl font-bold mb-2">没有找到合适的模板？</h2>
            <p className="text-muted-foreground mb-6">
              告诉我们您的想法，AI专家团队将为您定制专属解决方案
            </p>
            <Button size="lg" asChild>
              <Link href="/create">
                <Sparkles className="mr-2 h-5 w-5" />
                创建自定义项目
              </Link>
            </Button>
          </CardContent>
        </Card>
      </main>
    </div>
  )
}
