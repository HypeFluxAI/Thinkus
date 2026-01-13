import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Sparkles } from 'lucide-react'

export default function MarketingLayout({
  children,
}: {
  children: React.ReactNode
}) {
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
            <Link href="/templates" className="text-sm text-muted-foreground hover:text-foreground">
              模板
            </Link>
            <Link href="/cases" className="text-sm text-muted-foreground hover:text-foreground">
              案例
            </Link>
            <Link href="/pricing" className="text-sm text-muted-foreground hover:text-foreground">
              定价
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

      {/* Main Content */}
      <main>{children}</main>

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
                <li><Link href="/templates" className="hover:text-foreground">模板市场</Link></li>
                <li><Link href="/cases" className="hover:text-foreground">成功案例</Link></li>
                <li><Link href="/create" className="hover:text-foreground">创建项目</Link></li>
              </ul>
            </div>
            <div>
              <h4 className="font-medium mb-4">资源</h4>
              <ul className="space-y-2 text-sm text-muted-foreground">
                <li><Link href="/help" className="hover:text-foreground">帮助中心</Link></li>
                <li><Link href="#" className="hover:text-foreground">文档</Link></li>
                <li><Link href="#" className="hover:text-foreground">博客</Link></li>
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
