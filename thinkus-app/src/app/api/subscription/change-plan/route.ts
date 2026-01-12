import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import mongoose from 'mongoose'
import { authOptions } from '@/lib/auth/options'
import { Subscription, SUBSCRIPTION_PLANS, Notification } from '@/lib/db/models'
import type { SubscriptionPlan } from '@/lib/db/models'
import dbConnect from '@/lib/db/connection'
import {
  changeSubscriptionPlan,
  getSubscriptionPriceId,
  type SubscriptionPlanKey,
  type BillingCycle,
} from '@/lib/stripe/config'

interface ChangePlanRequest {
  newPlan: SubscriptionPlanKey
  billingCycle?: BillingCycle
}

// POST /api/subscription/change-plan - 更换订阅计划
export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body: ChangePlanRequest = await req.json()
    const { newPlan, billingCycle } = body

    // 验证计划
    if (!['starter', 'professional', 'enterprise'].includes(newPlan)) {
      return NextResponse.json({ error: 'Invalid plan' }, { status: 400 })
    }

    await dbConnect()
    const userId = new mongoose.Types.ObjectId(session.user.id)

    // 获取当前订阅
    const subscription = await Subscription.findOne({ userId })
    if (!subscription) {
      return NextResponse.json({ error: 'No subscription found' }, { status: 404 })
    }

    // 检查是否有活跃的 Stripe 订阅
    if (!subscription.stripeSubscriptionId) {
      return NextResponse.json(
        { error: 'No active Stripe subscription. Please subscribe first.' },
        { status: 400 }
      )
    }

    // 检查是否是免费计划（免费计划不能更换，需要先订阅）
    if (subscription.plan === 'free') {
      return NextResponse.json(
        { error: 'Please use checkout to subscribe first.' },
        { status: 400 }
      )
    }

    // 检查是否相同计划
    if (subscription.plan === newPlan) {
      return NextResponse.json(
        { error: 'Already on this plan' },
        { status: 400 }
      )
    }

    // 确定计费周期
    const targetBillingCycle = billingCycle || subscription.billingCycle

    // 获取新计划的价格 ID
    const newPriceId = getSubscriptionPriceId(newPlan, targetBillingCycle)

    // 计算升级还是降级
    const currentPlanPrice = SUBSCRIPTION_PLANS[subscription.plan].price
    const newPlanPrice = SUBSCRIPTION_PLANS[newPlan].price
    const isUpgrade = newPlanPrice > currentPlanPrice

    // 调用 Stripe 更换计划
    const updatedStripeSubscription = await changeSubscriptionPlan(
      subscription.stripeSubscriptionId,
      newPriceId
    ) as unknown as {
      current_period_start: number
      current_period_end: number
    }

    // 更新本地订阅记录
    const oldPlan = subscription.plan
    subscription.plan = newPlan as SubscriptionPlan
    subscription.billingCycle = targetBillingCycle
    subscription.stripePriceId = newPriceId

    // 如果是升级，更新周期
    if (isUpgrade) {
      subscription.currentPeriodStart = new Date(
        updatedStripeSubscription.current_period_start * 1000
      )
      subscription.currentPeriodEnd = new Date(
        updatedStripeSubscription.current_period_end * 1000
      )
    }

    await subscription.save()

    // 发送通知
    await Notification.createNotification({
      userId,
      type: 'subscription_updated',
      title: isUpgrade ? '计划已升级' : '计划已更改',
      body: `您已${isUpgrade ? '升级' : '更改'}到 ${SUBSCRIPTION_PLANS[newPlan].nameCn} 计划。`,
      relatedTo: {
        type: 'subscription',
        id: subscription._id,
      },
      priority: 'high',
      channels: ['app'],
    })

    return NextResponse.json({
      success: true,
      message: isUpgrade
        ? `Successfully upgraded to ${newPlan} plan`
        : `Successfully changed to ${newPlan} plan`,
      subscription: {
        plan: subscription.plan,
        planDetails: SUBSCRIPTION_PLANS[newPlan],
        billingCycle: subscription.billingCycle,
        currentPeriodEnd: subscription.currentPeriodEnd,
      },
      prorated: true,
      isUpgrade,
      previousPlan: oldPlan,
    })
  } catch (error) {
    console.error('Change plan error:', error)
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 })
  }
}

// GET /api/subscription/change-plan - 获取计划变更预览
export async function GET(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { searchParams } = new URL(req.url)
    const newPlan = searchParams.get('newPlan') as SubscriptionPlanKey | null
    const billingCycle = searchParams.get('billingCycle') as BillingCycle | null

    if (!newPlan || !['starter', 'professional', 'enterprise'].includes(newPlan)) {
      return NextResponse.json({ error: 'Invalid plan' }, { status: 400 })
    }

    await dbConnect()
    const userId = new mongoose.Types.ObjectId(session.user.id)

    // 获取当前订阅
    const subscription = await Subscription.findOne({ userId })
    if (!subscription) {
      return NextResponse.json({ error: 'No subscription found' }, { status: 404 })
    }

    const currentPlan = subscription.plan
    const targetBillingCycle = billingCycle || subscription.billingCycle

    // 获取计划价格
    const currentPlanDetails = SUBSCRIPTION_PLANS[currentPlan]
    const newPlanDetails = SUBSCRIPTION_PLANS[newPlan]

    const currentPrice =
      targetBillingCycle === 'yearly'
        ? currentPlanDetails.priceYearly
        : currentPlanDetails.price * 12
    const newPrice =
      targetBillingCycle === 'yearly'
        ? newPlanDetails.priceYearly
        : newPlanDetails.price * 12

    const isUpgrade = newPrice > currentPrice

    // 计算剩余天数和按比例金额
    const now = new Date()
    const periodEnd = new Date(subscription.currentPeriodEnd)
    const periodStart = new Date(subscription.currentPeriodStart)
    const totalDays = Math.ceil(
      (periodEnd.getTime() - periodStart.getTime()) / (1000 * 60 * 60 * 24)
    )
    const remainingDays = Math.max(
      0,
      Math.ceil((periodEnd.getTime() - now.getTime()) / (1000 * 60 * 60 * 24))
    )

    // 按比例计算
    const dailyRateCurrent = currentPrice / 365
    const dailyRateNew = newPrice / 365
    const creditAmount = Math.round(dailyRateCurrent * remainingDays * 100) / 100
    const chargeAmount = Math.round(dailyRateNew * remainingDays * 100) / 100
    const proratedAmount = Math.round((chargeAmount - creditAmount) * 100) / 100

    return NextResponse.json({
      preview: {
        currentPlan: {
          id: currentPlan,
          name: currentPlanDetails.nameCn,
          price: currentPlanDetails.price,
        },
        newPlan: {
          id: newPlan,
          name: newPlanDetails.nameCn,
          price: newPlanDetails.price,
          features: newPlanDetails.features,
        },
        billingCycle: targetBillingCycle,
        isUpgrade,
        remainingDays,
        creditAmount: isUpgrade ? creditAmount : 0,
        chargeAmount: isUpgrade ? chargeAmount : 0,
        proratedAmount: isUpgrade ? proratedAmount : 0,
        effectiveImmediately: true,
        note: isUpgrade
          ? '升级将立即生效，按剩余天数计算差价'
          : '降级将在当前计费周期结束后生效',
      },
    })
  } catch (error) {
    console.error('Preview plan change error:', error)
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 })
  }
}
