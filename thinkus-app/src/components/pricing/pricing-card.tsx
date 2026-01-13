'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { useSession } from 'next-auth/react'
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { useToast } from '@/components/ui/use-toast'
import { Check, Loader2, Sparkles } from 'lucide-react'
import { cn } from '@/lib/utils'
import type { SubscriptionPlan } from '@/lib/config/subscription-plans'

interface PricingCardProps {
  plan: SubscriptionPlan
  name: string
  nameCn: string
  price: number
  priceYearly: number
  features: {
    maxProjects: number
    maxDiscussionsPerMonth: number
    maxExecutives: number
    maxMessagesPerDay: number
    memoryEnabled: boolean
    prioritySupport: boolean
    customBranding: boolean
  }
  billingCycle: 'monthly' | 'yearly'
  isPopular?: boolean
  currentPlan?: SubscriptionPlan
}

export function PricingCard({
  plan,
  name,
  nameCn,
  price,
  priceYearly,
  features,
  billingCycle,
  isPopular,
  currentPlan,
}: PricingCardProps) {
  const { data: session } = useSession()
  const router = useRouter()
  const { toast } = useToast()
  const [loading, setLoading] = useState(false)

  const displayPrice = billingCycle === 'yearly' ? priceYearly : price
  const monthlyEquivalent = billingCycle === 'yearly' ? Math.round(priceYearly / 12) : price
  const isCurrentPlan = currentPlan === plan
  const isFree = plan === 'free'

  const featureList = [
    {
      text: features.maxProjects === -1 ? '无限项目' : `${features.maxProjects} 个项目`,
      included: true,
    },
    {
      text: features.maxDiscussionsPerMonth === -1
        ? '无限讨论'
        : `${features.maxDiscussionsPerMonth} 次讨论/月`,
      included: true,
    },
    {
      text: `${features.maxExecutives} 位AI高管`,
      included: true,
    },
    {
      text: features.maxMessagesPerDay === -1
        ? '无限消息'
        : `${features.maxMessagesPerDay} 条消息/天`,
      included: true,
    },
    {
      text: 'AI记忆系统',
      included: features.memoryEnabled,
    },
    {
      text: '优先支持',
      included: features.prioritySupport,
    },
    {
      text: '自定义品牌',
      included: features.customBranding,
    },
  ]

  const handleSubscribe = async () => {
    if (!session) {
      router.push('/login?callbackUrl=/pricing')
      return
    }

    if (isFree || isCurrentPlan) return

    try {
      setLoading(true)
      const response = await fetch('/api/stripe/checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ plan, billingCycle }),
      })

      const data = await response.json()

      if (data.success && data.url) {
        window.location.href = data.url
      } else {
        throw new Error(data.error || 'Failed to create checkout session')
      }
    } catch (error) {
      console.error('Checkout error:', error)
      toast({
        title: '订阅失败',
        description: '无法创建支付会话，请稍后重试',
        variant: 'destructive',
      })
    } finally {
      setLoading(false)
    }
  }

  return (
    <Card
      className={cn(
        'relative flex flex-col',
        isPopular && 'border-primary shadow-lg scale-105 z-10'
      )}
    >
      {isPopular && (
        <Badge className="absolute -top-3 left-1/2 -translate-x-1/2 bg-primary">
          <Sparkles className="h-3 w-3 mr-1" />
          最受欢迎
        </Badge>
      )}

      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          <span>{nameCn}</span>
          <span className="text-sm font-normal text-muted-foreground">{name}</span>
        </CardTitle>
        <CardDescription>
          {plan === 'free' && '免费体验核心功能'}
          {plan === 'starter' && '适合个人创业者和小团队'}
          {plan === 'professional' && '适合成长中的企业'}
          {plan === 'enterprise' && '适合大型组织'}
        </CardDescription>
      </CardHeader>

      <CardContent className="flex-1">
        <div className="mb-6">
          <div className="flex items-baseline gap-1">
            <span className="text-4xl font-bold">
              ${displayPrice === 0 ? '0' : monthlyEquivalent}
            </span>
            <span className="text-muted-foreground">/月</span>
          </div>
          {billingCycle === 'yearly' && displayPrice > 0 && (
            <p className="text-sm text-muted-foreground mt-1">
              年付 ${displayPrice} (节省 {Math.round((1 - priceYearly / (price * 12)) * 100)}%)
            </p>
          )}
        </div>

        <ul className="space-y-3">
          {featureList.map((feature, index) => (
            <li
              key={index}
              className={cn(
                'flex items-center gap-2 text-sm',
                !feature.included && 'text-muted-foreground line-through'
              )}
            >
              <Check
                className={cn(
                  'h-4 w-4 shrink-0',
                  feature.included ? 'text-primary' : 'text-muted-foreground'
                )}
              />
              {feature.text}
            </li>
          ))}
        </ul>
      </CardContent>

      <CardFooter>
        <Button
          className="w-full"
          variant={isPopular ? 'default' : 'outline'}
          disabled={loading || isFree || isCurrentPlan}
          onClick={handleSubscribe}
        >
          {loading && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
          {isCurrentPlan ? '当前计划' : isFree ? '免费使用' : '立即订阅'}
        </Button>
      </CardFooter>
    </Card>
  )
}
