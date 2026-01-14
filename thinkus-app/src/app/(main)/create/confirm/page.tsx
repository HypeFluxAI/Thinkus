'use client'

import { useState, useEffect } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Separator } from '@/components/ui/separator'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'
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
  Loader2,
  Edit,
  Save,
  MessageCircle,
  Trash2,
} from 'lucide-react'
import Link from 'next/link'
import { toast } from 'sonner'

interface Feature {
  id: string
  name: string
  description: string
  priority: string
  approved: boolean
}

interface PriceBreakdown {
  p0Count: number
  p1Count: number
  p2Count: number
  p0Tokens: number
  p1Tokens: number
  p2Tokens: number
  baseTokens: number
  integrationTokens: number
}

interface Proposal {
  projectName: string
  positioning: string
  features: Feature[]
  techStack: {
    frontend: string[]
    backend: string[]
    database: string[]
  }
  risks: string[]
  recommendations: string[]
  estimatedComplexity: string
  estimatedPrice: number
  estimatedTokens?: number
  tokenCost?: number
  priceBreakdown?: PriceBreakdown
}

// 根据功能数量估算开发时间
function getEstimatedTime(features: Feature[]): string {
  const total = features.length
  if (total <= 3) return '数小时'
  if (total <= 6) return '1天'
  if (total <= 10) return '2-3天'
  if (total <= 15) return '3-5天'
  return '1-2周'
}

// 客户端价格计算函数（与服务端保持一致）
const TOKEN_ESTIMATES = {
  perFeature: { P0: 80000, P1: 50000, P2: 25000 },
  projectBase: 50000,
  integrationOverhead: 0.2,
}
const TOKEN_PRICE_PER_MILLION = 11
const PROFIT_MULTIPLIER = 4
const MIN_PRICE = 29

function recalculatePrice(features: Feature[]): {
  estimatedPrice: number
  estimatedTokens: number
  tokenCost: number
  priceBreakdown: PriceBreakdown
} {
  const p0Features = features.filter(f => f.priority === 'P0')
  const p1Features = features.filter(f => f.priority === 'P1')
  const p2Features = features.filter(f => f.priority === 'P2')

  const p0Tokens = p0Features.length * TOKEN_ESTIMATES.perFeature.P0
  const p1Tokens = p1Features.length * TOKEN_ESTIMATES.perFeature.P1
  const p2Tokens = p2Features.length * TOKEN_ESTIMATES.perFeature.P2
  const baseTokens = TOKEN_ESTIMATES.projectBase
  const featureTokens = p0Tokens + p1Tokens + p2Tokens + baseTokens
  const integrationTokens = Math.round(featureTokens * TOKEN_ESTIMATES.integrationOverhead)
  const estimatedTokens = featureTokens + integrationTokens
  const tokenCost = (estimatedTokens / 1_000_000) * TOKEN_PRICE_PER_MILLION
  const rawPrice = tokenCost * PROFIT_MULTIPLIER
  const estimatedPrice = Math.max(MIN_PRICE, Math.ceil(rawPrice))

  return {
    estimatedPrice,
    estimatedTokens,
    tokenCost: Math.round(tokenCost * 100) / 100,
    priceBreakdown: {
      p0Count: p0Features.length,
      p1Count: p1Features.length,
      p2Count: p2Features.length,
      p0Tokens,
      p1Tokens,
      p2Tokens,
      baseTokens,
      integrationTokens,
    },
  }
}

// 从 URL 或 sessionStorage 获取讨论参数
function getDiscussionParams() {
  if (typeof window !== 'undefined') {
    const saved = sessionStorage.getItem('discussionParams')
    if (saved) {
      try {
        return JSON.parse(saved)
      } catch {
        return null
      }
    }
  }
  return null
}

export default function ConfirmPage() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const [proposal, setProposal] = useState<Proposal | null>(null)
  const [isProcessing, setIsProcessing] = useState(false)
  const [isEditing, setIsEditing] = useState(false)
  const [editingFeature, setEditingFeature] = useState<Feature | null>(null)
  const [hasChanges, setHasChanges] = useState(false)

  useEffect(() => {
    const proposalParam = searchParams.get('proposal')
    if (proposalParam) {
      try {
        const parsedProposal = JSON.parse(decodeURIComponent(proposalParam))
        setProposal(parsedProposal)
        // 保存到 sessionStorage，方便返回时恢复
        sessionStorage.setItem('currentProposal', JSON.stringify(parsedProposal))
      } catch {
        // 尝试从 sessionStorage 恢复
        const saved = sessionStorage.getItem('currentProposal')
        if (saved) {
          setProposal(JSON.parse(saved))
        } else {
          toast.error('方案数据解析失败')
        }
      }
    } else {
      // 尝试从 sessionStorage 恢复
      const saved = sessionStorage.getItem('currentProposal')
      if (saved) {
        setProposal(JSON.parse(saved))
      }
    }
  }, [searchParams])

  // 返回讨论页面继续讨论
  const handleBackToDiscussion = () => {
    const discussionParams = getDiscussionParams()
    if (discussionParams) {
      const params = new URLSearchParams(discussionParams)
      router.push(`/create/discuss?${params.toString()}`)
    } else {
      // 如果没有保存的讨论参数，返回创建页面
      router.push('/create')
    }
  }

  // 更新功能
  const handleUpdateFeature = (featureId: string, updates: Partial<Feature>) => {
    if (!proposal) return
    const updatedFeatures = proposal.features.map(f =>
      f.id === featureId ? { ...f, ...updates } : f
    )
    // 重新计算价格
    const priceInfo = recalculatePrice(updatedFeatures)
    const updatedProposal = {
      ...proposal,
      features: updatedFeatures,
      ...priceInfo,
    }
    setProposal(updatedProposal)
    sessionStorage.setItem('currentProposal', JSON.stringify(updatedProposal))
    setHasChanges(true)
    setEditingFeature(null)
    toast.success('功能已更新，价格已重新计算')
  }

  // 删除功能
  const handleDeleteFeature = (featureId: string) => {
    if (!proposal) return
    const updatedFeatures = proposal.features.filter(f => f.id !== featureId)
    // 重新计算价格
    const priceInfo = recalculatePrice(updatedFeatures)
    const updatedProposal = {
      ...proposal,
      features: updatedFeatures,
      ...priceInfo,
    }
    setProposal(updatedProposal)
    sessionStorage.setItem('currentProposal', JSON.stringify(updatedProposal))
    setHasChanges(true)
    toast.success('功能已删除，价格已重新计算')
  }

  // 更新项目信息
  const handleUpdateProposal = (updates: Partial<Proposal>) => {
    if (!proposal) return
    const updatedProposal = { ...proposal, ...updates }
    setProposal(updatedProposal)
    sessionStorage.setItem('currentProposal', JSON.stringify(updatedProposal))
    setHasChanges(true)
  }

  const handlePayment = async () => {
    if (!proposal) return

    setIsProcessing(true)
    try {
      const response = await fetch('/api/checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ proposal }),
      })

      if (!response.ok) {
        throw new Error('Checkout failed')
      }

      const data = await response.json()

      if (data.url) {
        // Redirect to Stripe Checkout
        window.location.href = data.url
      } else {
        throw new Error('No checkout URL')
      }
    } catch (error) {
      console.error('Payment error:', error)
      toast.error('支付初始化失败，请重试')
      setIsProcessing(false)
    }
  }

  if (!proposal) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p className="text-muted-foreground">加载方案中...</p>
      </div>
    )
  }

  const estimatedTime = getEstimatedTime(proposal.features || [])
  const p0Features = proposal.features?.filter(f => f.priority === 'P0') || []
  const p1Features = proposal.features?.filter(f => f.priority === 'P1') || []
  const p2Features = proposal.features?.filter(f => f.priority === 'P2') || []

  return (
    <div className="min-h-screen bg-gradient-to-br from-background to-muted">
      {/* Header */}
      <header className="border-b bg-background/80 backdrop-blur-sm sticky top-0 z-50">
        <div className="container mx-auto px-4 h-14 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Button variant="ghost" size="icon" onClick={handleBackToDiscussion}>
              <ArrowLeft className="h-4 w-4" />
            </Button>
            <span className="font-semibold">确认方案</span>
            {hasChanges && (
              <Badge variant="secondary" className="text-xs">
                已修改
              </Badge>
            )}
          </div>
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" onClick={handleBackToDiscussion}>
              <MessageCircle className="h-4 w-4 mr-2" />
              继续讨论
            </Button>
            <Button
              variant={isEditing ? 'default' : 'outline'}
              size="sm"
              onClick={() => setIsEditing(!isEditing)}
            >
              <Edit className="h-4 w-4 mr-2" />
              {isEditing ? '完成编辑' : '编辑方案'}
            </Button>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 py-8 max-w-4xl">
        {/* Project Header */}
        <div className="text-center mb-8">
          <Badge variant="secondary" className="mb-4">
            {proposal.features?.length || 0} 个功能
          </Badge>
          <h1 className="text-3xl font-bold mb-2">{proposal.projectName}</h1>
          <p className="text-muted-foreground max-w-2xl mx-auto">{proposal.positioning}</p>
        </div>

        <div className="grid gap-6">
          {/* Pricing Card */}
          <Card className="border-primary/50">
            <CardContent className="p-6">
              <div className="flex flex-col md:flex-row items-start justify-between gap-6">
                <div className="flex-1">
                  <p className="text-sm text-muted-foreground mb-1">预估价格</p>
                  <div className="flex items-baseline gap-2 mb-2">
                    <span className="text-4xl font-bold">${proposal.estimatedPrice}</span>
                    <span className="text-muted-foreground">USD</span>
                  </div>
                  <p className="text-sm text-muted-foreground">
                    预计开发时间: {estimatedTime}
                  </p>
                  {/* 功能数量说明 */}
                  <div className="mt-3 flex flex-wrap gap-2 text-xs">
                    {p0Features.length > 0 && (
                      <Badge variant="outline" className="bg-red-500/10">
                        {p0Features.length} 个核心功能
                      </Badge>
                    )}
                    {p1Features.length > 0 && (
                      <Badge variant="outline" className="bg-yellow-500/10">
                        {p1Features.length} 个重要功能
                      </Badge>
                    )}
                    {p2Features.length > 0 && (
                      <Badge variant="outline" className="bg-green-500/10">
                        {p2Features.length} 个基础功能
                      </Badge>
                    )}
                  </div>
                </div>
                <div className="flex flex-col gap-2 w-full md:w-auto">
                  <Button size="lg" onClick={handlePayment} disabled={isProcessing}>
                    {isProcessing ? (
                      <>
                        <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                        处理中...
                      </>
                    ) : (
                      <>
                        <CreditCard className="mr-2 h-5 w-5" />
                        确认并支付
                      </>
                    )}
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
                      <li key={feature.id} className="flex items-start gap-2 group">
                        <Check className="h-4 w-4 text-green-500 mt-0.5 shrink-0" />
                        <div className="flex-1">
                          <span className="font-medium">{feature.name}</span>
                          <p className="text-sm text-muted-foreground">{feature.description}</p>
                        </div>
                        {isEditing && (
                          <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-6 w-6"
                              onClick={() => setEditingFeature(feature)}
                            >
                              <Edit className="h-3 w-3" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-6 w-6 text-destructive hover:text-destructive"
                              onClick={() => handleDeleteFeature(feature.id)}
                            >
                              <Trash2 className="h-3 w-3" />
                            </Button>
                          </div>
                        )}
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
                      <li key={feature.id} className="flex items-start gap-2 group">
                        <Check className="h-4 w-4 text-green-500 mt-0.5 shrink-0" />
                        <div className="flex-1">
                          <span className="font-medium">{feature.name}</span>
                          <p className="text-sm text-muted-foreground">{feature.description}</p>
                        </div>
                        {isEditing && (
                          <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-6 w-6"
                              onClick={() => setEditingFeature(feature)}
                            >
                              <Edit className="h-3 w-3" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-6 w-6 text-destructive hover:text-destructive"
                              onClick={() => handleDeleteFeature(feature.id)}
                            >
                              <Trash2 className="h-3 w-3" />
                            </Button>
                          </div>
                        )}
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
                      <li key={feature.id} className="flex items-start gap-2 group">
                        <Check className="h-4 w-4 text-green-500 mt-0.5 shrink-0" />
                        <div className="flex-1">
                          <span className="font-medium">{feature.name}</span>
                          <p className="text-sm text-muted-foreground">{feature.description}</p>
                        </div>
                        {isEditing && (
                          <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-6 w-6"
                              onClick={() => setEditingFeature(feature)}
                            >
                              <Edit className="h-3 w-3" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-6 w-6 text-destructive hover:text-destructive"
                              onClick={() => handleDeleteFeature(feature.id)}
                            >
                              <Trash2 className="h-3 w-3" />
                            </Button>
                          </div>
                        )}
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

      {/* Feature Edit Dialog */}
      <Dialog open={!!editingFeature} onOpenChange={(open) => !open && setEditingFeature(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>编辑功能</DialogTitle>
            <DialogDescription>修改功能名称、描述和优先级</DialogDescription>
          </DialogHeader>
          {editingFeature && (
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <label className="text-sm font-medium">功能名称</label>
                <Input
                  value={editingFeature.name}
                  onChange={(e) => setEditingFeature({ ...editingFeature, name: e.target.value })}
                  placeholder="功能名称"
                />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">功能描述</label>
                <Textarea
                  value={editingFeature.description}
                  onChange={(e) => setEditingFeature({ ...editingFeature, description: e.target.value })}
                  placeholder="功能描述"
                  rows={3}
                />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">优先级</label>
                <div className="flex gap-2">
                  {['P0', 'P1', 'P2'].map(priority => (
                    <Button
                      key={priority}
                      variant={editingFeature.priority === priority ? 'default' : 'outline'}
                      size="sm"
                      onClick={() => setEditingFeature({ ...editingFeature, priority })}
                    >
                      {priority === 'P0' && '核心必备'}
                      {priority === 'P1' && '重要功能'}
                      {priority === 'P2' && '锦上添花'}
                    </Button>
                  ))}
                </div>
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditingFeature(null)}>
              取消
            </Button>
            <Button
              onClick={() => {
                if (editingFeature) {
                  handleUpdateFeature(editingFeature.id, {
                    name: editingFeature.name,
                    description: editingFeature.description,
                    priority: editingFeature.priority,
                  })
                }
              }}
            >
              <Save className="h-4 w-4 mr-2" />
              保存
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
