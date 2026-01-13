'use client'

import { useState, useEffect } from 'react'
import { useSearchParams } from 'next/navigation'
import Link from 'next/link'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Progress } from '@/components/ui/progress'
import { Skeleton } from '@/components/ui/skeleton'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog'
import { useToast } from '@/components/ui/use-toast'
import {
  CreditCard,
  Receipt,
  Zap,
  Calendar,
  ExternalLink,
  AlertTriangle,
  CheckCircle2,
  Loader2,
  Settings,
} from 'lucide-react'

interface SubscriptionData {
  subscription: {
    id: string
    plan: string
    planName: string
    planNameCn: string
    status: string
    billingCycle: string
    currentPeriodStart: string
    currentPeriodEnd: string
    cancelAtPeriodEnd: boolean
    trialEnd?: string
    features: {
      maxProjects: number
      maxDiscussionsPerMonth: number
      maxExecutives: number
      maxMessagesPerDay: number
      memoryEnabled: boolean
      prioritySupport: boolean
      customBranding: boolean
    }
    price: number
  }
  usage: {
    projects: { allowed: boolean; current: number; limit: number }
    discussions: { allowed: boolean; current: number; limit: number }
    messages: { allowed: boolean; current: number; limit: number }
  }
  payments: Array<{
    id: string
    amount: number
    currency: string
    status: string
    description: string
    paidAt: string
    receiptUrl?: string
  }>
  invoices: Array<{
    id: string
    amount: number
    status: string
    date: string
    invoiceUrl?: string
  }>
  upcomingInvoice?: {
    amount: number
    dueDate: string
  }
  stripeInfo?: {
    currentPeriodEnd: string
    cancelAtPeriodEnd: boolean
  }
}

export default function BillingPage() {
  const searchParams = useSearchParams()
  const { toast } = useToast()
  const [data, setData] = useState<SubscriptionData | null>(null)
  const [loading, setLoading] = useState(true)
  const [canceling, setCanceling] = useState(false)
  const [resuming, setResuming] = useState(false)
  const [portalLoading, setPortalLoading] = useState(false)

  useEffect(() => {
    if (searchParams.get('success') === 'true') {
      toast({
        title: '订阅成功',
        description: '感谢您的订阅！您的账户已升级。',
      })
    }
    fetchData()
  }, [searchParams, toast])

  const fetchData = async () => {
    try {
      setLoading(true)
      const response = await fetch('/api/subscriptions')
      const result = await response.json()
      if (result.success) {
        setData(result)
      }
    } catch (error) {
      console.error('Failed to fetch subscription:', error)
      toast({
        title: '加载失败',
        description: '无法获取订阅信息',
        variant: 'destructive',
      })
    } finally {
      setLoading(false)
    }
  }

  const handleCancel = async () => {
    try {
      setCanceling(true)
      const response = await fetch('/api/subscriptions', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'cancel' }),
      })
      const result = await response.json()
      if (result.success) {
        toast({
          title: '取消成功',
          description: result.message,
        })
        fetchData()
      } else {
        throw new Error(result.error)
      }
    } catch (error) {
      console.error('Failed to cancel:', error)
      toast({
        title: '操作失败',
        description: '无法取消订阅',
        variant: 'destructive',
      })
    } finally {
      setCanceling(false)
    }
  }

  const handleResume = async () => {
    try {
      setResuming(true)
      const response = await fetch('/api/subscriptions', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'resume' }),
      })
      const result = await response.json()
      if (result.success) {
        toast({
          title: '恢复成功',
          description: result.message,
        })
        fetchData()
      } else {
        throw new Error(result.error)
      }
    } catch (error) {
      console.error('Failed to resume:', error)
      toast({
        title: '操作失败',
        description: '无法恢复订阅',
        variant: 'destructive',
      })
    } finally {
      setResuming(false)
    }
  }

  const openPortal = async () => {
    try {
      setPortalLoading(true)
      const response = await fetch('/api/stripe/portal', {
        method: 'POST',
      })
      const result = await response.json()
      if (result.success && result.url) {
        window.location.href = result.url
      } else {
        throw new Error(result.error)
      }
    } catch (error) {
      console.error('Failed to open portal:', error)
      toast({
        title: '打开失败',
        description: '无法打开客户门户',
        variant: 'destructive',
      })
    } finally {
      setPortalLoading(false)
    }
  }

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString('zh-CN', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    })
  }

  const getStatusBadge = (status: string) => {
    const statusConfig: Record<string, { label: string; variant: 'default' | 'secondary' | 'destructive' | 'outline' }> = {
      active: { label: '活跃', variant: 'default' },
      trialing: { label: '试用中', variant: 'secondary' },
      past_due: { label: '逾期', variant: 'destructive' },
      canceled: { label: '已取消', variant: 'outline' },
      paused: { label: '已暂停', variant: 'outline' },
    }
    const config = statusConfig[status] || { label: status, variant: 'outline' as const }
    return <Badge variant={config.variant}>{config.label}</Badge>
  }

  const getUsagePercent = (current: number, limit: number) => {
    if (limit === -1) return 0
    return Math.min(100, (current / limit) * 100)
  }

  if (loading) {
    return (
      <div className="container max-w-4xl py-8 space-y-6">
        <Skeleton className="h-8 w-48" />
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <Skeleton className="h-48" />
          <Skeleton className="h-48" />
        </div>
        <Skeleton className="h-64" />
      </div>
    )
  }

  if (!data) {
    return (
      <div className="container max-w-4xl py-8">
        <Card>
          <CardContent className="py-12 text-center">
            <p className="text-muted-foreground">无法加载订阅信息</p>
            <Button className="mt-4" onClick={fetchData}>
              重试
            </Button>
          </CardContent>
        </Card>
      </div>
    )
  }

  const { subscription, usage, payments, invoices, upcomingInvoice } = data
  const isFree = subscription.plan === 'free'

  return (
    <div className="container max-w-4xl py-8 space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">账单和订阅</h1>
        {!isFree && (
          <Button variant="outline" onClick={openPortal} disabled={portalLoading}>
            {portalLoading ? (
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
            ) : (
              <Settings className="h-4 w-4 mr-2" />
            )}
            管理支付方式
          </Button>
        )}
      </div>

      {/* 订阅状态 */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <CreditCard className="h-5 w-5" />
              当前计划
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-2xl font-bold">{subscription.planNameCn}</p>
                <p className="text-sm text-muted-foreground">{subscription.planName}</p>
              </div>
              {getStatusBadge(subscription.status)}
            </div>

            {!isFree && (
              <>
                <div className="text-sm">
                  <p className="text-muted-foreground">
                    ${subscription.price}/{subscription.billingCycle === 'yearly' ? '年' : '月'}
                  </p>
                </div>
                <div className="flex items-center gap-2 text-sm">
                  <Calendar className="h-4 w-4 text-muted-foreground" />
                  <span>
                    {subscription.cancelAtPeriodEnd ? '将于' : '续费日期：'}
                    {formatDate(subscription.currentPeriodEnd)}
                    {subscription.cancelAtPeriodEnd && ' 到期取消'}
                  </span>
                </div>
              </>
            )}

            {subscription.trialEnd && new Date(subscription.trialEnd) > new Date() && (
              <div className="flex items-center gap-2 text-sm text-primary">
                <Zap className="h-4 w-4" />
                <span>试用期至 {formatDate(subscription.trialEnd)}</span>
              </div>
            )}

            <div className="pt-4 flex gap-2">
              {isFree ? (
                <Button asChild className="w-full">
                  <Link href="/pricing">升级计划</Link>
                </Button>
              ) : subscription.cancelAtPeriodEnd ? (
                <Button
                  variant="outline"
                  className="w-full"
                  onClick={handleResume}
                  disabled={resuming}
                >
                  {resuming && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                  恢复订阅
                </Button>
              ) : (
                <>
                  <Button asChild variant="outline" className="flex-1">
                    <Link href="/pricing">更改计划</Link>
                  </Button>
                  <AlertDialog>
                    <AlertDialogTrigger asChild>
                      <Button variant="ghost" className="text-destructive">
                        取消订阅
                      </Button>
                    </AlertDialogTrigger>
                    <AlertDialogContent>
                      <AlertDialogHeader>
                        <AlertDialogTitle>确认取消订阅？</AlertDialogTitle>
                        <AlertDialogDescription>
                          您的订阅将在当前计费周期结束后取消。在此之前，您仍可使用所有功能。
                        </AlertDialogDescription>
                      </AlertDialogHeader>
                      <AlertDialogFooter>
                        <AlertDialogCancel>保持订阅</AlertDialogCancel>
                        <AlertDialogAction onClick={handleCancel} disabled={canceling}>
                          {canceling && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                          确认取消
                        </AlertDialogAction>
                      </AlertDialogFooter>
                    </AlertDialogContent>
                  </AlertDialog>
                </>
              )}
            </div>
          </CardContent>
        </Card>

        {/* 使用量 */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Zap className="h-5 w-5" />
              使用量
            </CardTitle>
            <CardDescription>当前计费周期内的使用情况</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span>项目</span>
                <span>
                  {usage.projects.current} / {usage.projects.limit === -1 ? '无限' : usage.projects.limit}
                </span>
              </div>
              <Progress value={getUsagePercent(usage.projects.current, usage.projects.limit)} />
            </div>

            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span>本月讨论</span>
                <span>
                  {usage.discussions.current} / {usage.discussions.limit === -1 ? '无限' : usage.discussions.limit}
                </span>
              </div>
              <Progress value={getUsagePercent(usage.discussions.current, usage.discussions.limit)} />
            </div>

            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span>今日消息</span>
                <span>
                  {usage.messages.current} / {usage.messages.limit === -1 ? '无限' : usage.messages.limit}
                </span>
              </div>
              <Progress value={getUsagePercent(usage.messages.current, usage.messages.limit)} />
            </div>

            {(!usage.projects.allowed || !usage.discussions.allowed || !usage.messages.allowed) && (
              <div className="flex items-center gap-2 text-sm text-destructive pt-2">
                <AlertTriangle className="h-4 w-4" />
                <span>部分限额已用完</span>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* 即将到来的发票 */}
      {upcomingInvoice && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Receipt className="h-5 w-5" />
              下一次付款
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center justify-between">
              <div>
                <p className="font-medium">${upcomingInvoice.amount}</p>
                {upcomingInvoice.dueDate && (
                  <p className="text-sm text-muted-foreground">
                    预计于 {formatDate(upcomingInvoice.dueDate)} 扣款
                  </p>
                )}
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* 支付历史 */}
      {payments.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>支付历史</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {payments.map((payment) => (
                <div
                  key={payment.id}
                  className="flex items-center justify-between py-3 border-b last:border-0"
                >
                  <div className="flex items-center gap-3">
                    {payment.status === 'succeeded' ? (
                      <CheckCircle2 className="h-5 w-5 text-green-500" />
                    ) : (
                      <AlertTriangle className="h-5 w-5 text-destructive" />
                    )}
                    <div>
                      <p className="font-medium">{payment.description}</p>
                      <p className="text-sm text-muted-foreground">
                        {payment.paidAt ? formatDate(payment.paidAt) : '-'}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-4">
                    <span className="font-medium">
                      ${payment.amount} {payment.currency.toUpperCase()}
                    </span>
                    {payment.receiptUrl && (
                      <Button variant="ghost" size="sm" asChild>
                        <a href={payment.receiptUrl} target="_blank" rel="noopener noreferrer">
                          <ExternalLink className="h-4 w-4" />
                        </a>
                      </Button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* 发票 */}
      {invoices.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>发票</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {invoices.map((invoice) => (
                <div
                  key={invoice.id}
                  className="flex items-center justify-between py-3 border-b last:border-0"
                >
                  <div>
                    <p className="font-medium">${invoice.amount}</p>
                    <p className="text-sm text-muted-foreground">{formatDate(invoice.date)}</p>
                  </div>
                  <div className="flex items-center gap-4">
                    <Badge variant={invoice.status === 'paid' ? 'default' : 'secondary'}>
                      {invoice.status === 'paid' ? '已支付' : invoice.status}
                    </Badge>
                    {invoice.invoiceUrl && (
                      <Button variant="ghost" size="sm" asChild>
                        <a href={invoice.invoiceUrl} target="_blank" rel="noopener noreferrer">
                          <ExternalLink className="h-4 w-4" />
                        </a>
                      </Button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
