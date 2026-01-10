import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Sparkles, Rocket, Users, Zap, ArrowRight } from 'lucide-react'

export default function HomePage() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background to-primary/5">
      {/* Header */}
      <header className="container mx-auto px-4 py-6">
        <nav className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Sparkles className="h-6 w-6 text-primary" />
            <span className="font-bold text-xl">Thinkus</span>
          </div>
          <div className="flex items-center gap-4">
            <Link href="/login">
              <Button variant="ghost">登录</Button>
            </Link>
            <Link href="/register">
              <Button>开始使用</Button>
            </Link>
          </div>
        </nav>
      </header>

      {/* Hero Section */}
      <main className="container mx-auto px-4 py-20">
        <div className="text-center max-w-3xl mx-auto">
          <div className="inline-flex items-center gap-2 bg-primary/10 text-primary px-4 py-2 rounded-full text-sm font-medium mb-6">
            <Sparkles className="h-4 w-4" />
            AI驱动的创业成功平台
          </div>

          <h1 className="text-4xl md:text-6xl font-bold mb-6 leading-tight">
            把你的想法
            <br />
            <span className="text-primary">变成产品</span>
          </h1>

          <p className="text-xl text-muted-foreground mb-8 max-w-2xl mx-auto">
            告诉AI你的创业想法，专家团队将为你规划方案、生成代码、部署上线。
            从想法到产品，最快只需要一天。
          </p>

          <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
            <Link href="/register">
              <Button size="lg" className="text-lg px-8">
                免费开始
                <ArrowRight className="ml-2 h-5 w-5" />
              </Button>
            </Link>
            <Link href="/login">
              <Button size="lg" variant="outline" className="text-lg px-8">
                已有账号？登录
              </Button>
            </Link>
          </div>
        </div>

        {/* Features */}
        <div className="grid md:grid-cols-3 gap-8 mt-24">
          <div className="text-center p-6">
            <div className="inline-flex items-center justify-center w-12 h-12 bg-primary/10 rounded-lg mb-4">
              <Users className="h-6 w-6 text-primary" />
            </div>
            <h3 className="text-lg font-semibold mb-2">AI专家团队</h3>
            <p className="text-muted-foreground">
              产品经理、设计师、架构师多角度分析，确保方案可行
            </p>
          </div>

          <div className="text-center p-6">
            <div className="inline-flex items-center justify-center w-12 h-12 bg-primary/10 rounded-lg mb-4">
              <Zap className="h-6 w-6 text-primary" />
            </div>
            <h3 className="text-lg font-semibold mb-2">极速开发</h3>
            <p className="text-muted-foreground">
              基于结构化规格系统，AI精准生成代码，几乎不返工
            </p>
          </div>

          <div className="text-center p-6">
            <div className="inline-flex items-center justify-center w-12 h-12 bg-primary/10 rounded-lg mb-4">
              <Rocket className="h-6 w-6 text-primary" />
            </div>
            <h3 className="text-lg font-semibold mb-2">一键上线</h3>
            <p className="text-muted-foreground">
              自动部署到云端，提供完整的代码和运营支持
            </p>
          </div>
        </div>

        {/* Pricing Preview */}
        <div className="mt-24 text-center">
          <h2 className="text-2xl font-bold mb-4">简单透明的定价</h2>
          <p className="text-muted-foreground mb-8">
            根据项目复杂度，从 $49 起
          </p>
          <div className="flex flex-wrap justify-center gap-4">
            <div className="bg-card border rounded-lg px-6 py-4">
              <div className="text-2xl font-bold">$49</div>
              <div className="text-sm text-muted-foreground">简单落地页</div>
            </div>
            <div className="bg-card border rounded-lg px-6 py-4">
              <div className="text-2xl font-bold">$199</div>
              <div className="text-sm text-muted-foreground">标准应用</div>
            </div>
            <div className="bg-card border rounded-lg px-6 py-4">
              <div className="text-2xl font-bold">$499</div>
              <div className="text-sm text-muted-foreground">复杂应用</div>
            </div>
            <div className="bg-card border rounded-lg px-6 py-4">
              <div className="text-2xl font-bold">$999+</div>
              <div className="text-sm text-muted-foreground">企业级应用</div>
            </div>
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="container mx-auto px-4 py-8 mt-20 border-t">
        <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <Sparkles className="h-5 w-5 text-primary" />
            <span className="font-semibold">Thinkus</span>
          </div>
          <p className="text-sm text-muted-foreground">
            © 2026 Thinkus. All rights reserved.
          </p>
        </div>
      </footer>
    </div>
  )
}
