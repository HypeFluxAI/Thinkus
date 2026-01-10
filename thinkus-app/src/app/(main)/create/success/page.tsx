'use client'

import { useEffect, useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { CheckCircle2, Rocket, ArrowRight, Loader2 } from 'lucide-react'
import Link from 'next/link'
import confetti from 'canvas-confetti'

export default function SuccessPage() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const [isVerifying, setIsVerifying] = useState(true)

  const sessionId = searchParams.get('session_id')
  const projectId = searchParams.get('project_id')

  useEffect(() => {
    // Trigger confetti animation
    const duration = 3 * 1000
    const animationEnd = Date.now() + duration
    const defaults = { startVelocity: 30, spread: 360, ticks: 60, zIndex: 0 }

    function randomInRange(min: number, max: number) {
      return Math.random() * (max - min) + min
    }

    const interval: ReturnType<typeof setInterval> = setInterval(function () {
      const timeLeft = animationEnd - Date.now()

      if (timeLeft <= 0) {
        return clearInterval(interval)
      }

      const particleCount = 50 * (timeLeft / duration)

      confetti({
        ...defaults,
        particleCount,
        origin: { x: randomInRange(0.1, 0.3), y: Math.random() - 0.2 },
      })
      confetti({
        ...defaults,
        particleCount,
        origin: { x: randomInRange(0.7, 0.9), y: Math.random() - 0.2 },
      })
    }, 250)

    // Verify payment (optional - webhook handles the actual update)
    setIsVerifying(false)

    return () => clearInterval(interval)
  }, [sessionId])

  if (isVerifying) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="h-8 w-8 animate-spin mx-auto mb-4 text-primary" />
          <p className="text-muted-foreground">验证支付中...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-background to-muted flex items-center justify-center p-4">
      <Card className="max-w-lg w-full">
        <CardContent className="p-8 text-center">
          {/* Success Icon */}
          <div className="mb-6 relative">
            <div className="w-20 h-20 rounded-full bg-green-100 dark:bg-green-900/30 flex items-center justify-center mx-auto">
              <CheckCircle2 className="h-10 w-10 text-green-500" />
            </div>
            <div className="absolute -top-2 -right-2 w-8 h-8 rounded-full bg-primary/20 flex items-center justify-center animate-bounce">
              <Rocket className="h-4 w-4 text-primary" />
            </div>
          </div>

          {/* Title */}
          <h1 className="text-2xl font-bold mb-2">支付成功！</h1>
          <p className="text-muted-foreground mb-6">
            感谢您的信任，我们的AI团队已开始为您构建产品
          </p>

          {/* Timeline Preview */}
          <div className="bg-muted/50 rounded-lg p-4 mb-6 text-left">
            <h3 className="font-medium mb-3 text-sm">接下来会发生什么：</h3>
            <div className="space-y-3 text-sm">
              <div className="flex items-center gap-3">
                <div className="w-6 h-6 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-xs font-bold">
                  1
                </div>
                <span>AI正在分析您的需求并规划架构</span>
              </div>
              <div className="flex items-center gap-3">
                <div className="w-6 h-6 rounded-full bg-muted-foreground/30 flex items-center justify-center text-xs font-bold">
                  2
                </div>
                <span className="text-muted-foreground">生成代码并构建功能模块</span>
              </div>
              <div className="flex items-center gap-3">
                <div className="w-6 h-6 rounded-full bg-muted-foreground/30 flex items-center justify-center text-xs font-bold">
                  3
                </div>
                <span className="text-muted-foreground">测试验证并部署上线</span>
              </div>
            </div>
          </div>

          {/* Actions */}
          <div className="space-y-3">
            <Link href={projectId ? `/projects/${projectId}/progress` : '/dashboard'} className="block">
              <Button className="w-full" size="lg">
                查看开发进度
                <ArrowRight className="ml-2 h-4 w-4" />
              </Button>
            </Link>
            <Link href="/dashboard" className="block">
              <Button variant="outline" className="w-full">
                返回控制台
              </Button>
            </Link>
          </div>

          {/* Support Info */}
          <p className="text-xs text-muted-foreground mt-6">
            有任何问题？联系我们的支持团队
          </p>
        </CardContent>
      </Card>
    </div>
  )
}
