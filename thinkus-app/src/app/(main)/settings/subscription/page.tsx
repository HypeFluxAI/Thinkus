'use client'

import { useState, useEffect } from 'react'
import { useSearchParams } from 'next/navigation'
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Progress } from '@/components/ui/progress'
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Alert, AlertDescription } from '@/components/ui/alert'
import {
  Check,
  Loader2,
  Crown,
  Zap,
  Building2,
  Sparkles,
  AlertCircle,
  CheckCircle2,
  ExternalLink,
} from 'lucide-react'
import { cn } from '@/lib/utils'

// 计划配置
const PLANS = [
  {
    id: 'free',
    name: '免费版',
    description: '适合个人探索和学习',
    price: { monthly: 0, yearly: 0 },
    icon: Sparkles,
    features: [
      '1 个项目',
      '5 次讨论/月',
      '3 位高管顾问',
      '20 条消息/天',
      '基础功能',
    ],
    limitations: ['无记忆功能', '无优先支持'],
  },
  {
    id: 'starter',
    name: '入门版',
    description: '适合个人创业者',
    price: { monthly: 29, yearly: 290 },
    icon: Zap,
    popular: true,
    features: [
      '5 个项目',
      '50 次讨论/月',
      '6 位高管顾问',
      '100 条消息/天',
      '记忆功能',
      '7 天免费试用',
    ],
    limitations: ['无优先支持'],
  },
  {
    id: 'professional',
    name: '专业版',
    description: '适合专业团队',
    price: { monthly: 99, yearly: 990 },
    icon: Crown,
    features: [
      '20 个项目',
      '200 次讨论/月',
      '12 位高管顾问',
      '500 条消息/天',
      '记忆功能',
      '优先支持',
    ],
    limitations: [],
  },
  {
    id: 'enterprise',
    name: '企业版',
    description: '适合大型企业',
    price: { monthly: 299, yearly: 2990 },
    icon: Building2,
    features: [
      '无限项目',
      '无限讨论',
      '全部 18 位高管',
      '无限消息',
      '记忆功能',
      '优先支持',
      '自定义品牌',
    ],
    limitations: [],
  },
]

interface SubscriptionData {
  subscription: {
    id: string
    plan: string
    planDetails: {
      name: string
      nameCn: string
      price: number
      priceYearly: number
      features: Record<string, number | boolean>
    }
    status: string
    billingCycle: 'monthly' | 'yearly'
    currentPeriodStart: string
    currentPeriodEnd: string
    cancelAtPeriodEnd: boolean
    usage: {
      projectsCreated: number
      discussionsThisMonth: number
      messagesThisDay: number
    }
    limits: {
      projects: { allowed: boolean; current: number; limit: number }
      discussions: { allowed: boolean; current: number; limit: number }
      messages: { allowed: boolean; current: number; limit: number }
    }
  }
}

export default function SubscriptionPage() {
  const searchParams = useSearchParams()
  const [subscription, setSubscription] = useState<SubscriptionData['subscription'] | null>(null)
  const [loading, setLoading] = useState(true)
  const [checkoutLoading, setCheckoutLoading] = useState<string | null>(null)
  const [portalLoading, setPortalLoading] = useState(false)
  const [billingCycle, setBillingCycle] = useState<'monthly' | 'yearly'>('monthly')
  const [notification, setNotification] = useState<{ type: 'success' | 'error'; message: string } | null>(null)

  // 检查URL参数显示通知
  useEffect(() => {
    if (searchParams.get('success') === 'true') {
      setNotification({ type: 'success', message: '订阅成功！感谢您的支持。' })
    } else if (searchParams.get('canceled') === 'true') {
      setNotification({ type: 'error', message: '订阅已取消。' })
    }
  }, [searchParams])

  // 加载订阅信息
  useEffect(() => {
    loadSubscription()
  }, [])

  const loadSubscription = async () => {
    try {
      const res = await fetch('/api/subscription')
      if (res.ok) {
        const data: SubscriptionData = await res.json()
        setSubscription(data.subscription)
        setBillingCycle(data.subscription.billingCycle)
      }
    } catch (error) {
      console.error('Failed to load subscription:', error)
    } finally {
      setLoading(false)
    }
  }

  // 创建Checkout会话
  const handleCheckout = async (plan: string) => {
    if (plan === 'free') return

    setCheckoutLoading(plan)
    try {
      const res = await fetch('/api/subscription/checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ plan, billingCycle }),
      })

      if (res.ok) {
        const data = await res.json()
        window.location.href = data.checkoutUrl
      } else {
        const error = await res.json()
        setNotification({ type: 'error', message: error.error || '创建订阅失败' })
      }
    } catch (error) {
      setNotification({ type: 'error', message: '网络错误，请重试' })
    } finally {
      setCheckoutLoading(null)
    }
  }

  // 打开客户门户
  const handleOpenPortal = async () => {
    setPortalLoading(true)
    try {
      const res = await fetch('/api/subscription/portal', {
        method: 'POST',
      })

      if (res.ok) {
        const data = await res.json()
        window.location.href = data.portalUrl
      } else {
        const error = await res.json()
        setNotification({ type: 'error', message: error.error || '无法打开管理页面' })
      }
    } catch (error) {
      setNotification({ type: 'error', message: '网络错误，请重试' })
    } finally {
      setPortalLoading(false)
    }
  }

  // 格式化限制显示
  const formatLimit = (limit: number) => {
    return limit === -1 ? '无限' : limit.toString()
  }

  // 计算使用百分比
  const getUsagePercentage = (current: number, limit: number) => {
    if (limit === -1) return 0
    return Math.min((current / limit) * 100, 100)
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold">订阅管理</h2>
        <p className="text-muted-foreground">管理您的订阅计划和账单</p>
      </div>

      {/* 通知 */}
      {notification && (
        <Alert variant={notification.type === 'success' ? 'default' : 'destructive'}>
          {notification.type === 'success' ? (
            <CheckCircle2 className="h-4 w-4" />
          ) : (
            <AlertCircle className="h-4 w-4" />
          )}
          <AlertDescription>{notification.message}</AlertDescription>
        </Alert>
      )}

      {/* 当前订阅状态 */}
      {subscription && subscription.plan !== 'free' && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center justify-between">
              <span>当前订阅</span>
              <Badge
                variant={
                  subscription.status === 'active'
                    ? 'default'
                    : subscription.status === 'trialing'
                      ? 'secondary'
                      : 'destructive'
                }
              >
                {subscription.status === 'active'
                  ? '活跃'
                  : subscription.status === 'trialing'
                    ? '试用中'
                    : subscription.status === 'past_due'
                      ? '逾期'
                      : '已取消'}
              </Badge>
            </CardTitle>
            <CardDescription>
              {subscription.planDetails.nameCn} - {subscription.billingCycle === 'monthly' ? '月付' : '年付'}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* 使用量 */}
            <div className="grid gap-4 md:grid-cols-3">
              <div className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span>项目</span>
                  <span>
                    {subscription.limits.projects.current} / {formatLimit(subscription.limits.projects.limit)}
                  </span>
                </div>
                <Progress value={getUsagePercentage(subscription.limits.projects.current, subscription.limits.projects.limit)} />
              </div>
              <div className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span>本月讨论</span>
                  <span>
                    {subscription.limits.discussions.current} / {formatLimit(subscription.limits.discussions.limit)}
                  </span>
                </div>
                <Progress value={getUsagePercentage(subscription.limits.discussions.current, subscription.limits.discussions.limit)} />
              </div>
              <div className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span>今日消息</span>
                  <span>
                    {subscription.limits.messages.current} / {formatLimit(subscription.limits.messages.limit)}
                  </span>
                </div>
                <Progress value={getUsagePercentage(subscription.limits.messages.current, subscription.limits.messages.limit)} />
              </div>
            </div>

            {/* 周期信息 */}
            <div className="text-sm text-muted-foreground">
              当前周期：{new Date(subscription.currentPeriodStart).toLocaleDateString('zh-CN')} -{' '}
              {new Date(subscription.currentPeriodEnd).toLocaleDateString('zh-CN')}
            </div>

            {subscription.cancelAtPeriodEnd && (
              <Alert variant="destructive">
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>
                  您的订阅将在 {new Date(subscription.currentPeriodEnd).toLocaleDateString('zh-CN')} 结束后取消
                </AlertDescription>
              </Alert>
            )}
          </CardContent>
          <CardFooter>
            <Button onClick={handleOpenPortal} disabled={portalLoading}>
              {portalLoading ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <ExternalLink className="h-4 w-4 mr-2" />}
              管理订阅
            </Button>
          </CardFooter>
        </Card>
      )}

      {/* 计费周期选择 */}
      <div className="flex justify-center">
        <Tabs value={billingCycle} onValueChange={(v) => setBillingCycle(v as 'monthly' | 'yearly')}>
          <TabsList>
            <TabsTrigger value="monthly">月付</TabsTrigger>
            <TabsTrigger value="yearly">
              年付
              <Badge variant="secondary" className="ml-2 text-xs">
                省17%
              </Badge>
            </TabsTrigger>
          </TabsList>
        </Tabs>
      </div>

      {/* 计划列表 */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {PLANS.map((plan) => {
          const Icon = plan.icon
          const isCurrentPlan = subscription?.plan === plan.id
          const price = billingCycle === 'monthly' ? plan.price.monthly : plan.price.yearly

          return (
            <Card
              key={plan.id}
              className={cn(
                'relative',
                plan.popular && 'border-primary shadow-lg',
                isCurrentPlan && 'ring-2 ring-primary'
              )}
            >
              {plan.popular && (
                <div className="absolute -top-3 left-1/2 -translate-x-1/2">
                  <Badge>推荐</Badge>
                </div>
              )}
              <CardHeader>
                <div className="flex items-center gap-2">
                  <Icon className="h-5 w-5 text-primary" />
                  <CardTitle className="text-lg">{plan.name}</CardTitle>
                </div>
                <CardDescription>{plan.description}</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <span className="text-3xl font-bold">${price}</span>
                  <span className="text-muted-foreground">/{billingCycle === 'monthly' ? '月' : '年'}</span>
                </div>

                <ul className="space-y-2">
                  {plan.features.map((feature, i) => (
                    <li key={i} className="flex items-center gap-2 text-sm">
                      <Check className="h-4 w-4 text-green-500" />
                      {feature}
                    </li>
                  ))}
                  {plan.limitations.map((limitation, i) => (
                    <li key={i} className="flex items-center gap-2 text-sm text-muted-foreground">
                      <span className="h-4 w-4 text-center">-</span>
                      {limitation}
                    </li>
                  ))}
                </ul>
              </CardContent>
              <CardFooter>
                {isCurrentPlan ? (
                  <Button variant="outline" className="w-full" disabled>
                    当前计划
                  </Button>
                ) : plan.id === 'free' ? (
                  <Button variant="outline" className="w-full" disabled>
                    免费版
                  </Button>
                ) : (
                  <Button
                    className="w-full"
                    onClick={() => handleCheckout(plan.id)}
                    disabled={checkoutLoading !== null}
                  >
                    {checkoutLoading === plan.id ? (
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    ) : null}
                    {subscription?.plan === 'free' ? '开始试用' : '升级'}
                  </Button>
                )}
              </CardFooter>
            </Card>
          )
        })}
      </div>

      {/* 常见问题 */}
      <Card>
        <CardHeader>
          <CardTitle>常见问题</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <h4 className="font-medium">试用期内可以取消吗？</h4>
            <p className="text-sm text-muted-foreground">
              是的，在7天试用期内随时可以取消，不会产生任何费用。
            </p>
          </div>
          <div>
            <h4 className="font-medium">升级或降级如何计费？</h4>
            <p className="text-sm text-muted-foreground">
              升级时会按比例收取差价，降级会在当前周期结束后生效。
            </p>
          </div>
          <div>
            <h4 className="font-medium">支持哪些支付方式？</h4>
            <p className="text-sm text-muted-foreground">
              我们通过Stripe支持信用卡、借记卡等多种支付方式。
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
