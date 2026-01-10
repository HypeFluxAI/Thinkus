'use client'

import { useState, useEffect } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Separator } from '@/components/ui/separator'
import {
  ArrowLeft,
  Check,
  CreditCard,
  Rocket,
  Shield,
  Zap,
  Code,
  Database,
  Layout,
  AlertTriangle,
  Lightbulb,
} from 'lucide-react'
import Link from 'next/link'
import { toast } from 'sonner'

interface Proposal {
  projectName: string
  positioning: string
  features: Array<{
    id: string
    name: string
    description: string
    priority: string
    approved: boolean
  }>
  techStack: {
    frontend: string[]
    backend: string[]
    database: string[]
  }
  risks: string[]
  recommendations: string[]
  estimatedComplexity: string
  estimatedPrice: number
}

const COMPLEXITY_INFO: Record<string, { name: string; description: string; time: string }> = {
  L1: { name: '简单', description: '3-5页落地页', time: '数小时' },
  L2: { name: '标准', description: '5-10页标准应用', time: '1天' },
  L3: { name: '复杂', description: '10-20页复杂应用', time: '2-3天' },
  L4: { name: '企业级', description: '20-50页企业应用', time: '3-5天' },
  L5: { name: '平台级', description: '50+页平台产品', time: '1-2周' },
}

export default function ConfirmPage() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const [proposal, setProposal] = useState<Proposal | null>(null)
  const [isProcessing, setIsProcessing] = useState(false)

  useEffect(() => {
    const proposalParam = searchParams.get('proposal')
    if (proposalParam) {
      try {
        setProposal(JSON.parse(decodeURIComponent(proposalParam)))
      } catch {
        toast.error('方案数据解析失败')
      }
    }
  }, [searchParams])

  const handlePayment = async () => {
    setIsProcessing(true)
    // TODO: Integrate Stripe payment
    toast.success('支付功能即将上线')
    setIsProcessing(false)
  }

  if (!proposal) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p className="text-muted-foreground">加载方案中...</p>
      </div>
    )
  }

  const complexityInfo = COMPLEXITY_INFO[proposal.estimatedComplexity] || COMPLEXITY_INFO.L2
  const p0Features = proposal.features?.filter(f => f.priority === 'P0') || []
  const p1Features = proposal.features?.filter(f => f.priority === 'P1') || []
  const p2Features = proposal.features?.filter(f => f.priority === 'P2') || []

  return (
    <div className="min-h-screen bg-gradient-to-br from-background to-muted">
      {/* Header */}
      <header className="border-b bg-background/80 backdrop-blur-sm sticky top-0 z-50">
        <div className="container mx-auto px-4 h-14 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Link href="/create">
              <Button variant="ghost" size="icon">
                <ArrowLeft className="h-4 w-4" />
              </Button>
            </Link>
            <span className="font-semibold">确认方案</span>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 py-8 max-w-4xl">
        {/* Project Header */}
        <div className="text-center mb-8">
          <Badge variant="secondary" className="mb-4">
            {complexityInfo.name}应用
          </Badge>
          <h1 className="text-3xl font-bold mb-2">{proposal.projectName}</h1>
          <p className="text-muted-foreground max-w-2xl mx-auto">{proposal.positioning}</p>
        </div>

        <div className="grid gap-6">
          {/* Pricing Card */}
          <Card className="border-primary/50">
            <CardContent className="p-6">
              <div className="flex flex-col md:flex-row items-center justify-between gap-4">
                <div>
                  <p className="text-sm text-muted-foreground mb-1">预估价格</p>
                  <div className="flex items-baseline gap-2">
                    <span className="text-4xl font-bold">${proposal.estimatedPrice}</span>
                    <span className="text-muted-foreground">USD</span>
                  </div>
                  <p className="text-sm text-muted-foreground mt-1">
                    预计开发时间: {complexityInfo.time}
                  </p>
                </div>
                <div className="flex flex-col gap-2 w-full md:w-auto">
                  <Button size="lg" onClick={handlePayment} disabled={isProcessing}>
                    <CreditCard className="mr-2 h-5 w-5" />
                    确认并支付
                  </Button>
                  <p className="text-xs text-center text-muted-foreground">
                    安全支付 · 不满意全额退款
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Features */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Rocket className="h-5 w-5 text-primary" />
                功能清单
              </CardTitle>
              <CardDescription>
                共 {proposal.features?.length || 0} 个功能
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {p0Features.length > 0 && (
                <div>
                  <div className="flex items-center gap-2 mb-2">
                    <Badge className="bg-red-500">P0 核心必备</Badge>
                  </div>
                  <ul className="space-y-2">
                    {p0Features.map(feature => (
                      <li key={feature.id} className="flex items-start gap-2">
                        <Check className="h-4 w-4 text-green-500 mt-0.5 shrink-0" />
                        <div>
                          <span className="font-medium">{feature.name}</span>
                          <p className="text-sm text-muted-foreground">{feature.description}</p>
                        </div>
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {p1Features.length > 0 && (
                <div>
                  <div className="flex items-center gap-2 mb-2">
                    <Badge className="bg-yellow-500">P1 重要功能</Badge>
                  </div>
                  <ul className="space-y-2">
                    {p1Features.map(feature => (
                      <li key={feature.id} className="flex items-start gap-2">
                        <Check className="h-4 w-4 text-green-500 mt-0.5 shrink-0" />
                        <div>
                          <span className="font-medium">{feature.name}</span>
                          <p className="text-sm text-muted-foreground">{feature.description}</p>
                        </div>
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {p2Features.length > 0 && (
                <div>
                  <div className="flex items-center gap-2 mb-2">
                    <Badge className="bg-green-500">P2 锦上添花</Badge>
                  </div>
                  <ul className="space-y-2">
                    {p2Features.map(feature => (
                      <li key={feature.id} className="flex items-start gap-2">
                        <Check className="h-4 w-4 text-green-500 mt-0.5 shrink-0" />
                        <div>
                          <span className="font-medium">{feature.name}</span>
                          <p className="text-sm text-muted-foreground">{feature.description}</p>
                        </div>
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Tech Stack */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Code className="h-5 w-5 text-primary" />
                技术方案
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid md:grid-cols-3 gap-4">
                <div className="space-y-2">
                  <div className="flex items-center gap-2 text-sm font-medium">
                    <Layout className="h-4 w-4" />
                    前端
                  </div>
                  <div className="flex flex-wrap gap-1">
                    {proposal.techStack?.frontend?.map(tech => (
                      <Badge key={tech} variant="secondary">
                        {tech}
                      </Badge>
                    ))}
                  </div>
                </div>
                <div className="space-y-2">
                  <div className="flex items-center gap-2 text-sm font-medium">
                    <Zap className="h-4 w-4" />
                    后端
                  </div>
                  <div className="flex flex-wrap gap-1">
                    {proposal.techStack?.backend?.map(tech => (
                      <Badge key={tech} variant="secondary">
                        {tech}
                      </Badge>
                    ))}
                  </div>
                </div>
                <div className="space-y-2">
                  <div className="flex items-center gap-2 text-sm font-medium">
                    <Database className="h-4 w-4" />
                    数据库
                  </div>
                  <div className="flex flex-wrap gap-1">
                    {proposal.techStack?.database?.map(tech => (
                      <Badge key={tech} variant="secondary">
                        {tech}
                      </Badge>
                    ))}
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Risks & Recommendations */}
          <div className="grid md:grid-cols-2 gap-6">
            {proposal.risks && proposal.risks.length > 0 && (
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-base flex items-center gap-2">
                    <AlertTriangle className="h-4 w-4 text-yellow-500" />
                    注意事项
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <ul className="space-y-2 text-sm">
                    {proposal.risks.map((risk, index) => (
                      <li key={index} className="flex items-start gap-2">
                        <span className="text-yellow-500">•</span>
                        <span className="text-muted-foreground">{risk}</span>
                      </li>
                    ))}
                  </ul>
                </CardContent>
              </Card>
            )}

            {proposal.recommendations && proposal.recommendations.length > 0 && (
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-base flex items-center gap-2">
                    <Lightbulb className="h-4 w-4 text-primary" />
                    专家建议
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <ul className="space-y-2 text-sm">
                    {proposal.recommendations.map((rec, index) => (
                      <li key={index} className="flex items-start gap-2">
                        <span className="text-primary">•</span>
                        <span className="text-muted-foreground">{rec}</span>
                      </li>
                    ))}
                  </ul>
                </CardContent>
              </Card>
            )}
          </div>

          {/* Guarantees */}
          <Card className="bg-muted/50">
            <CardContent className="p-6">
              <div className="grid md:grid-cols-3 gap-4 text-center">
                <div className="flex flex-col items-center gap-2">
                  <Shield className="h-8 w-8 text-green-500" />
                  <span className="font-medium">100%满意保证</span>
                  <span className="text-sm text-muted-foreground">不满意全额退款</span>
                </div>
                <div className="flex flex-col items-center gap-2">
                  <Zap className="h-8 w-8 text-primary" />
                  <span className="font-medium">极速交付</span>
                  <span className="text-sm text-muted-foreground">AI加速开发</span>
                </div>
                <div className="flex flex-col items-center gap-2">
                  <Code className="h-8 w-8 text-blue-500" />
                  <span className="font-medium">完整代码</span>
                  <span className="text-sm text-muted-foreground">100%所有权归你</span>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </main>
    </div>
  )
}
