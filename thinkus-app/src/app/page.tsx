import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import {
  Sparkles,
  Rocket,
  Users,
  Zap,
  ArrowRight,
  Check,
  Star,
  Shield,
  Code,
  MessageSquare,
  Play,
} from 'lucide-react'

const FEATURES = [
  {
    icon: MessageSquare,
    title: '自然对话',
    description: '像聊天一样描述您的想法，AI自动理解并识别功能需求',
  },
  {
    icon: Users,
    title: 'AI专家团队',
    description: '产品经理、设计师、架构师多角度分析，确保方案可行',
  },
  {
    icon: Zap,
    title: '极速开发',
    description: '基于结构化规格系统，AI精准生成代码，几乎不返工',
  },
  {
    icon: Rocket,
    title: '一键上线',
    description: '自动部署到云端，提供完整的代码和运营支持',
  },
  {
    icon: Shield,
    title: '满意保证',
    description: '不满意全额退款，100%代码所有权归您',
  },
  {
    icon: Code,
    title: '现代技术',
    description: 'Next.js、React、TypeScript等现代技术栈',
  },
]

const TESTIMONIALS = [
  {
    name: '李明',
    role: '独立开发者',
    content: '从想法到上线只用了2天，比我预期快了10倍。代码质量也很高，几乎不用修改。',
    rating: 5,
  },
  {
    name: '王芳',
    role: '产品经理',
    content: 'AI专家团队的讨论很专业，帮我发现了很多没考虑到的问题，最终方案比我最初想的好多了。',
    rating: 5,
  },
  {
    name: '张伟',
    role: '创业者',
    content: '作为非技术人员，终于可以把想法变成真正的产品了。价格也很合理，强烈推荐！',
    rating: 5,
  },
]

const PROCESS_STEPS = [
  { step: '1', title: '描述想法', desc: '用自然语言告诉AI你想做什么' },
  { step: '2', title: '专家讨论', desc: 'AI团队多角度分析优化方案' },
  { step: '3', title: '确认方案', desc: '查看功能、价格，确认开发' },
  { step: '4', title: '极速开发', desc: 'AI团队24小时不间断开发' },
  { step: '5', title: '上线运营', desc: '自动部署，开始您的创业之旅' },
]

export default function HomePage() {
  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b sticky top-0 z-50 bg-background/80 backdrop-blur-sm">
        <div className="container mx-auto px-4 h-16 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2">
            <Sparkles className="h-6 w-6 text-primary" />
            <span className="font-bold text-xl">Thinkus</span>
          </Link>
          <nav className="hidden md:flex items-center gap-6">
            <Link href="/pricing" className="text-sm text-muted-foreground hover:text-foreground">
              定价
            </Link>
            <Link href="#features" className="text-sm text-muted-foreground hover:text-foreground">
              功能
            </Link>
            <Link href="#process" className="text-sm text-muted-foreground hover:text-foreground">
              流程
            </Link>
          </nav>
          <div className="flex items-center gap-4">
            <Link href="/login">
              <Button variant="ghost">登录</Button>
            </Link>
            <Link href="/create">
              <Button>免费开始</Button>
            </Link>
          </div>
        </div>
      </header>

      <main>
        {/* Hero Section */}
        <section className="py-20 md:py-32 bg-gradient-to-b from-primary/5 to-background">
          <div className="container mx-auto px-4">
            <div className="text-center max-w-3xl mx-auto">
              <Badge variant="secondary" className="mb-6">
                <Sparkles className="h-3 w-3 mr-1" />
                AI驱动的创业成功平台
              </Badge>

              <h1 className="text-4xl md:text-6xl font-bold mb-6 leading-tight">
                把你的想法
                <br />
                <span className="text-primary">变成产品</span>
              </h1>

              <p className="text-xl text-muted-foreground mb-8 max-w-2xl mx-auto">
                告诉AI你的创业想法，专家团队将为你规划方案、生成代码、部署上线。
                <br className="hidden md:block" />
                从想法到产品，最快只需要一天。
              </p>

              <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
                <Link href="/create">
                  <Button size="lg" className="text-lg px-8">
                    免费开始
                    <ArrowRight className="ml-2 h-5 w-5" />
                  </Button>
                </Link>
                <Button size="lg" variant="outline" className="text-lg px-8">
                  <Play className="mr-2 h-5 w-5" />
                  观看演示
                </Button>
              </div>

              <p className="text-sm text-muted-foreground mt-4">
                无需信用卡 · 免费体验对话 · 满意后再付款
              </p>
            </div>
          </div>
        </section>

        {/* Process */}
        <section id="process" className="py-20 bg-muted/30">
          <div className="container mx-auto px-4">
            <div className="text-center mb-12">
              <h2 className="text-3xl font-bold mb-4">如何运作</h2>
              <p className="text-muted-foreground">简单5步，从想法到产品</p>
            </div>
            <div className="flex flex-wrap justify-center gap-4 max-w-5xl mx-auto">
              {PROCESS_STEPS.map((item, index) => (
                <div key={item.step} className="flex items-center">
                  <div className="text-center">
                    <div className="w-12 h-12 rounded-full bg-primary text-primary-foreground flex items-center justify-center font-bold text-lg mx-auto mb-2">
                      {item.step}
                    </div>
                    <h3 className="font-medium">{item.title}</h3>
                    <p className="text-sm text-muted-foreground max-w-[150px]">{item.desc}</p>
                  </div>
                  {index < PROCESS_STEPS.length - 1 && (
                    <ArrowRight className="h-6 w-6 text-muted-foreground mx-4 hidden md:block" />
                  )}
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Features */}
        <section id="features" className="py-20">
          <div className="container mx-auto px-4">
            <div className="text-center mb-12">
              <h2 className="text-3xl font-bold mb-4">为什么选择 Thinkus</h2>
              <p className="text-muted-foreground">我们的核心优势</p>
            </div>
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6 max-w-5xl mx-auto">
              {FEATURES.map(feature => {
                const Icon = feature.icon
                return (
                  <Card key={feature.title}>
                    <CardContent className="p-6">
                      <div className="w-12 h-12 rounded-lg bg-primary/10 flex items-center justify-center mb-4">
                        <Icon className="h-6 w-6 text-primary" />
                      </div>
                      <h3 className="font-semibold mb-2">{feature.title}</h3>
                      <p className="text-sm text-muted-foreground">{feature.description}</p>
                    </CardContent>
                  </Card>
                )
              })}
            </div>
          </div>
        </section>

        {/* Pricing Preview */}
        <section className="py-20 bg-muted/30">
          <div className="container mx-auto px-4">
            <div className="text-center mb-12">
              <h2 className="text-3xl font-bold mb-4">简单透明的定价</h2>
              <p className="text-muted-foreground">根据项目复杂度，选择合适的方案</p>
            </div>
            <div className="grid md:grid-cols-4 gap-4 max-w-4xl mx-auto">
              {[
                { price: 49, name: '简单应用', desc: '3-5页落地页' },
                { price: 199, name: '标准应用', desc: '5-10页应用', popular: true },
                { price: 499, name: '复杂应用', desc: '10-20页应用' },
                { price: 999, name: '企业级', desc: '20-50页应用' },
              ].map(tier => (
                <Card key={tier.name} className={tier.popular ? 'border-primary' : ''}>
                  <CardContent className="p-6 text-center">
                    {tier.popular && (
                      <Badge className="mb-2">推荐</Badge>
                    )}
                    <div className="text-3xl font-bold">${tier.price}</div>
                    <div className="font-medium mt-1">{tier.name}</div>
                    <div className="text-sm text-muted-foreground">{tier.desc}</div>
                  </CardContent>
                </Card>
              ))}
            </div>
            <div className="text-center mt-8">
              <Link href="/pricing">
                <Button variant="outline">
                  查看完整定价
                  <ArrowRight className="ml-2 h-4 w-4" />
                </Button>
              </Link>
            </div>
          </div>
        </section>

        {/* Testimonials */}
        <section className="py-20">
          <div className="container mx-auto px-4">
            <div className="text-center mb-12">
              <h2 className="text-3xl font-bold mb-4">用户评价</h2>
              <p className="text-muted-foreground">看看他们怎么说</p>
            </div>
            <div className="grid md:grid-cols-3 gap-6 max-w-5xl mx-auto">
              {TESTIMONIALS.map((testimonial, index) => (
                <Card key={index}>
                  <CardContent className="p-6">
                    <div className="flex gap-1 mb-4">
                      {Array.from({ length: testimonial.rating }).map((_, i) => (
                        <Star key={i} className="h-4 w-4 fill-yellow-400 text-yellow-400" />
                      ))}
                    </div>
                    <p className="text-sm mb-4">&ldquo;{testimonial.content}&rdquo;</p>
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-full bg-primary/20 flex items-center justify-center">
                        <span className="font-medium text-primary">
                          {testimonial.name.charAt(0)}
                        </span>
                      </div>
                      <div>
                        <div className="font-medium text-sm">{testimonial.name}</div>
                        <div className="text-xs text-muted-foreground">{testimonial.role}</div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        </section>

        {/* CTA */}
        <section className="py-20 bg-primary text-primary-foreground">
          <div className="container mx-auto px-4 text-center">
            <h2 className="text-3xl font-bold mb-4">准备好把想法变成产品了吗？</h2>
            <p className="text-primary-foreground/80 mb-8 max-w-xl mx-auto">
              只需描述您的想法，AI专家团队将帮您实现。无需技术背景，无需写代码。
            </p>
            <Link href="/create">
              <Button size="lg" variant="secondary" className="text-lg px-8">
                <Sparkles className="mr-2 h-5 w-5" />
                免费开始创建
              </Button>
            </Link>
          </div>
        </section>
      </main>

      {/* Footer */}
      <footer className="border-t py-12">
        <div className="container mx-auto px-4">
          <div className="grid md:grid-cols-4 gap-8">
            <div>
              <div className="flex items-center gap-2 mb-4">
                <Sparkles className="h-5 w-5 text-primary" />
                <span className="font-bold">Thinkus</span>
              </div>
              <p className="text-sm text-muted-foreground">
                AI驱动的创业成功平台，让任何人都能把想法变成产品
              </p>
            </div>
            <div>
              <h4 className="font-medium mb-4">产品</h4>
              <ul className="space-y-2 text-sm text-muted-foreground">
                <li><Link href="/pricing" className="hover:text-foreground">定价</Link></li>
                <li><Link href="/create" className="hover:text-foreground">创建项目</Link></li>
                <li><Link href="#" className="hover:text-foreground">案例展示</Link></li>
              </ul>
            </div>
            <div>
              <h4 className="font-medium mb-4">资源</h4>
              <ul className="space-y-2 text-sm text-muted-foreground">
                <li><Link href="#" className="hover:text-foreground">文档</Link></li>
                <li><Link href="#" className="hover:text-foreground">博客</Link></li>
                <li><Link href="#" className="hover:text-foreground">帮助中心</Link></li>
              </ul>
            </div>
            <div>
              <h4 className="font-medium mb-4">关于</h4>
              <ul className="space-y-2 text-sm text-muted-foreground">
                <li><Link href="#" className="hover:text-foreground">关于我们</Link></li>
                <li><Link href="#" className="hover:text-foreground">隐私政策</Link></li>
                <li><Link href="#" className="hover:text-foreground">服务条款</Link></li>
              </ul>
            </div>
          </div>
          <div className="border-t mt-8 pt-8 text-center text-sm text-muted-foreground">
            © 2026 Thinkus. All rights reserved.
          </div>
        </div>
      </footer>
    </div>
  )
}
