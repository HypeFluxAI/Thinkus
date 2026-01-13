'use client'

import { useState, useEffect } from 'react'
import { useSearchParams } from 'next/navigation'
import { useSession } from 'next-auth/react'
import { Switch } from '@/components/ui/switch'
import { Label } from '@/components/ui/label'
import { useToast } from '@/components/ui/use-toast'
import { PricingCard } from '@/components/pricing/pricing-card'
import { FeatureComparison } from '@/components/pricing/feature-comparison'
import { SUBSCRIPTION_PLANS, type SubscriptionPlan } from '@/lib/config/subscription-plans'

export default function PricingPage() {
  const { data: session } = useSession()
  const searchParams = useSearchParams()
  const { toast } = useToast()
  const [billingCycle, setBillingCycle] = useState<'monthly' | 'yearly'>('monthly')
  const [currentPlan, setCurrentPlan] = useState<SubscriptionPlan>('free')
  const [loading, setLoading] = useState(false)

  // 检查 URL 参数
  useEffect(() => {
    if (searchParams.get('canceled') === 'true') {
      toast({
        title: '支付已取消',
        description: '您可以随时重新选择订阅计划',
      })
    }
  }, [searchParams, toast])

  // 获取当前订阅
  useEffect(() => {
    if (session?.user) {
      fetchSubscription()
    }
  }, [session])

  const fetchSubscription = async () => {
    try {
      setLoading(true)
      const response = await fetch('/api/subscriptions')
      const data = await response.json()
      if (data.success) {
        setCurrentPlan(data.subscription.plan)
      }
    } catch (error) {
      console.error('Failed to fetch subscription:', error)
    } finally {
      setLoading(false)
    }
  }

  const plans = Object.entries(SUBSCRIPTION_PLANS) as [SubscriptionPlan, typeof SUBSCRIPTION_PLANS.free][]

  return (
    <div className="container max-w-6xl py-12">
      <div className="text-center mb-12">
        <h1 className="text-4xl font-bold mb-4">选择适合您的计划</h1>
        <p className="text-xl text-muted-foreground mb-8">
          无论您是个人创业者还是大型企业，我们都有适合您的方案
        </p>

        {/* 计费周期切换 */}
        <div className="flex items-center justify-center gap-4">
          <Label
            htmlFor="billing-cycle"
            className={billingCycle === 'monthly' ? 'font-semibold' : 'text-muted-foreground'}
          >
            月付
          </Label>
          <Switch
            id="billing-cycle"
            checked={billingCycle === 'yearly'}
            onCheckedChange={(checked) => setBillingCycle(checked ? 'yearly' : 'monthly')}
          />
          <Label
            htmlFor="billing-cycle"
            className={billingCycle === 'yearly' ? 'font-semibold' : 'text-muted-foreground'}
          >
            年付
            <span className="ml-2 text-xs text-primary">(省17%)</span>
          </Label>
        </div>
      </div>

      {/* 定价卡片 */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {plans.map(([plan, config]) => (
          <PricingCard
            key={plan}
            plan={plan}
            name={config.name}
            nameCn={config.nameCn}
            price={config.price}
            priceYearly={config.priceYearly}
            features={config.features}
            billingCycle={billingCycle}
            isPopular={plan === 'professional'}
            currentPlan={currentPlan}
          />
        ))}
      </div>

      {/* Feature Comparison */}
      <div className="mt-16">
        <h2 className="text-2xl font-bold text-center mb-4">功能对比</h2>
        <p className="text-center text-muted-foreground mb-8">
          详细了解各个计划包含的功能
        </p>
        <FeatureComparison className="border rounded-lg" />
      </div>

      {/* FAQ */}
      <div className="mt-16">
        <h2 className="text-2xl font-bold text-center mb-8">常见问题</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 max-w-4xl mx-auto">
          <div className="space-y-2">
            <h3 className="font-semibold">什么是AI高管？</h3>
            <p className="text-sm text-muted-foreground">
              AI高管是我们平台的核心功能，每位高管都有独特的专业背景和思维模式，可以从不同角度帮助您分析业务问题。
            </p>
          </div>
          <div className="space-y-2">
            <h3 className="font-semibold">可以随时取消订阅吗？</h3>
            <p className="text-sm text-muted-foreground">
              是的，您可以随时取消订阅。取消后，您的订阅将在当前计费周期结束时终止。
            </p>
          </div>
          <div className="space-y-2">
            <h3 className="font-semibold">支持哪些支付方式？</h3>
            <p className="text-sm text-muted-foreground">
              我们通过Stripe处理支付，支持所有主流信用卡和借记卡。
            </p>
          </div>
          <div className="space-y-2">
            <h3 className="font-semibold">可以升级或降级计划吗？</h3>
            <p className="text-sm text-muted-foreground">
              可以随时升级或降级您的计划。升级将立即生效，降级将在下一个计费周期生效。
            </p>
          </div>
          <div className="space-y-2">
            <h3 className="font-semibold">新用户有试用期吗？</h3>
            <p className="text-sm text-muted-foreground">
              是的，新用户首次订阅付费计划时可享受7天免费试用。
            </p>
          </div>
          <div className="space-y-2">
            <h3 className="font-semibold">如何获得邀请码？</h3>
            <p className="text-sm text-muted-foreground">
              付费用户可以获得邀请码邀请朋友使用。您也可以申请排队等待邀请。
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}
