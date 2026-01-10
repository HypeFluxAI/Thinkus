'use client'

import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import {
  Check,
  Sparkles,
  Zap,
  Shield,
  Clock,
  Code,
  ArrowRight,
  HelpCircle,
} from 'lucide-react'

const PRICING_TIERS = [
  {
    id: 'L1',
    name: '简单应用',
    description: '落地页和展示站',
    price: 49,
    pages: '3-5页',
    time: '数小时',
    popular: false,
    features: [
      '响应式设计',
      '基础SEO优化',
      '联系表单',
      '社交媒体集成',
      '30天技术支持',
    ],
    examples: ['个人作品集', '活动落地页', '产品介绍页'],
  },
  {
    id: 'L2',
    name: '标准应用',
    description: '完整功能应用',
    price: 199,
    pages: '5-10页',
    time: '1天',
    popular: true,
    features: [
      '用户注册登录',
      '核心业务功能',
      '管理后台',
      '数据库集成',
      '90天技术支持',
    ],
    examples: ['博客系统', '预约系统', '会员网站'],
  },
  {
    id: 'L3',
    name: '复杂应用',
    description: '多角色复杂业务',
    price: 499,
    pages: '10-20页',
    time: '2-3天',
    popular: false,
    features: [
      '多用户角色',
      '复杂业务流程',
      '第三方集成',
      '数据分析',
      '180天技术支持',
    ],
    examples: ['电商平台', 'SaaS应用', '社区平台'],
  },
  {
    id: 'L4',
    name: '企业级',
    description: '高性能企业应用',
    price: 999,
    pages: '20-50页',
    time: '3-5天',
    popular: false,
    features: [
      '高性能架构',
      '企业级安全',
      '多系统集成',
      'API开放',
      '1年技术支持',
    ],
    examples: ['企业管理系统', 'CRM系统', '协作平台'],
  },
]

const ADDONS = [
  { name: 'SEO优化', price: 99, description: '搜索引擎优化和提交' },
  { name: '数据分析', price: 149, description: 'Google Analytics集成' },
  { name: '优先开发', price: 199, description: '开发速度提升50%' },
  { name: '延长支持', price: 299, description: '技术支持延长至1年' },
]

const FAQ = [
  {
    q: '开发需要多长时间？',
    a: '根据项目复杂度，从数小时到1-2周不等。我们的AI开发团队24小时不间断工作，确保最快交付。',
  },
  {
    q: '代码归谁所有？',
    a: '100%归您所有。我们提供完整源代码，您可以自由修改、部署和商用。',
  },
  {
    q: '如果不满意怎么办？',
    a: '我们提供100%满意保证。如果最终产品不符合需求，可以全额退款。',
  },
  {
    q: '支持什么技术栈？',
    a: '我们主要使用Next.js、React、TypeScript等现代技术栈，也支持Vue、Python等其他技术。',
  },
]

export default function PricingPage() {
  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b">
        <div className="container mx-auto px-4 h-16 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2">
            <Sparkles className="h-6 w-6 text-primary" />
            <span className="font-bold text-xl">Thinkus</span>
          </Link>
          <div className="flex items-center gap-4">
            <Link href="/login">
              <Button variant="ghost">登录</Button>
            </Link>
            <Link href="/create">
              <Button>开始创建</Button>
            </Link>
          </div>
        </div>
      </header>

      <main>
        {/* Hero */}
        <section className="py-16 md:py-24 text-center">
          <div className="container mx-auto px-4">
            <Badge variant="secondary" className="mb-4">
              透明定价
            </Badge>
            <h1 className="text-4xl md:text-5xl font-bold mb-4">
              简单、透明的定价
            </h1>
            <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
              根据项目复杂度选择合适的方案，所有价格固定透明，没有隐藏费用
            </p>
          </div>
        </section>

        {/* Pricing Cards */}
        <section className="pb-16">
          <div className="container mx-auto px-4">
            <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
              {PRICING_TIERS.map(tier => (
                <Card
                  key={tier.id}
                  className={tier.popular ? 'border-primary shadow-lg relative' : ''}
                >
                  {tier.popular && (
                    <div className="absolute -top-3 left-1/2 -translate-x-1/2">
                      <Badge className="bg-primary">最受欢迎</Badge>
                    </div>
                  )}
                  <CardHeader>
                    <Badge variant="outline" className="w-fit mb-2">
                      {tier.id}
                    </Badge>
                    <CardTitle>{tier.name}</CardTitle>
                    <CardDescription>{tier.description}</CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div>
                      <span className="text-4xl font-bold">${tier.price}</span>
                      <span className="text-muted-foreground"> USD</span>
                    </div>
                    <div className="flex items-center gap-4 text-sm text-muted-foreground">
                      <span className="flex items-center gap-1">
                        <Code className="h-4 w-4" />
                        {tier.pages}
                      </span>
                      <span className="flex items-center gap-1">
                        <Clock className="h-4 w-4" />
                        {tier.time}
                      </span>
                    </div>
                    <ul className="space-y-2">
                      {tier.features.map(feature => (
                        <li key={feature} className="flex items-center gap-2 text-sm">
                          <Check className="h-4 w-4 text-green-500 shrink-0" />
                          {feature}
                        </li>
                      ))}
                    </ul>
                    <div className="pt-4">
                      <p className="text-xs text-muted-foreground mb-2">适用于:</p>
                      <div className="flex flex-wrap gap-1">
                        {tier.examples.map(example => (
                          <Badge key={example} variant="secondary" className="text-xs">
                            {example}
                          </Badge>
                        ))}
                      </div>
                    </div>
                    <Link href="/create" className="block pt-4">
                      <Button className="w-full" variant={tier.popular ? 'default' : 'outline'}>
                        开始创建
                        <ArrowRight className="ml-2 h-4 w-4" />
                      </Button>
                    </Link>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        </section>

        {/* Add-ons */}
        <section className="py-16 bg-muted/30">
          <div className="container mx-auto px-4">
            <div className="text-center mb-12">
              <h2 className="text-3xl font-bold mb-4">增值服务</h2>
              <p className="text-muted-foreground">可选的附加服务，让您的产品更完善</p>
            </div>
            <div className="grid md:grid-cols-4 gap-6 max-w-4xl mx-auto">
              {ADDONS.map(addon => (
                <Card key={addon.name}>
                  <CardContent className="p-6 text-center">
                    <h3 className="font-medium mb-1">{addon.name}</h3>
                    <p className="text-2xl font-bold mb-2">${addon.price}</p>
                    <p className="text-sm text-muted-foreground">{addon.description}</p>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        </section>

        {/* Guarantees */}
        <section className="py-16">
          <div className="container mx-auto px-4">
            <div className="grid md:grid-cols-3 gap-8 max-w-4xl mx-auto">
              <div className="text-center">
                <div className="w-16 h-16 rounded-full bg-green-500/10 flex items-center justify-center mx-auto mb-4">
                  <Shield className="h-8 w-8 text-green-500" />
                </div>
                <h3 className="font-medium mb-2">100%满意保证</h3>
                <p className="text-sm text-muted-foreground">
                  不满意全额退款，没有任何风险
                </p>
              </div>
              <div className="text-center">
                <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center mx-auto mb-4">
                  <Zap className="h-8 w-8 text-primary" />
                </div>
                <h3 className="font-medium mb-2">极速交付</h3>
                <p className="text-sm text-muted-foreground">
                  AI团队24小时开发，最快数小时交付
                </p>
              </div>
              <div className="text-center">
                <div className="w-16 h-16 rounded-full bg-blue-500/10 flex items-center justify-center mx-auto mb-4">
                  <Code className="h-8 w-8 text-blue-500" />
                </div>
                <h3 className="font-medium mb-2">完整代码</h3>
                <p className="text-sm text-muted-foreground">
                  源代码100%归您所有，自由修改部署
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* FAQ */}
        <section className="py-16 bg-muted/30">
          <div className="container mx-auto px-4">
            <div className="text-center mb-12">
              <h2 className="text-3xl font-bold mb-4">常见问题</h2>
            </div>
            <div className="grid md:grid-cols-2 gap-6 max-w-4xl mx-auto">
              {FAQ.map((item, index) => (
                <Card key={index}>
                  <CardContent className="p-6">
                    <h3 className="font-medium flex items-center gap-2 mb-2">
                      <HelpCircle className="h-4 w-4 text-primary" />
                      {item.q}
                    </h3>
                    <p className="text-sm text-muted-foreground">{item.a}</p>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        </section>

        {/* CTA */}
        <section className="py-16">
          <div className="container mx-auto px-4 text-center">
            <h2 className="text-3xl font-bold mb-4">准备好开始了吗？</h2>
            <p className="text-muted-foreground mb-8">
              只需描述您的想法，AI团队将帮您实现
            </p>
            <Link href="/create">
              <Button size="lg">
                <Sparkles className="mr-2 h-5 w-5" />
                免费开始
              </Button>
            </Link>
          </div>
        </section>
      </main>

      {/* Footer */}
      <footer className="border-t py-8">
        <div className="container mx-auto px-4 text-center text-sm text-muted-foreground">
          © 2026 Thinkus. All rights reserved.
        </div>
      </footer>
    </div>
  )
}
