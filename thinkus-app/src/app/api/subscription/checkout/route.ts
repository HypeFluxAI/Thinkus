import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import mongoose from 'mongoose'
import { authOptions } from '@/lib/auth/options'
import { Subscription } from '@/lib/db/models'
import User from '@/lib/db/models/user'
import dbConnect from '@/lib/db/connection'
import {
  getOrCreateStripeCustomer,
  createSubscriptionCheckoutSession,
  getSubscriptionPriceId,
  getAppUrl,
  type SubscriptionPlanKey,
  type BillingCycle,
} from '@/lib/stripe/config'

interface CheckoutRequest {
  plan: SubscriptionPlanKey
  billingCycle: BillingCycle
}

// POST /api/subscription/checkout - 创建订阅结账会话
export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body: CheckoutRequest = await req.json()
    const { plan, billingCycle } = body

    // 验证计划
    if (!['starter', 'professional', 'enterprise'].includes(plan)) {
      return NextResponse.json({ error: 'Invalid plan' }, { status: 400 })
    }

    // 验证计费周期
    if (!['monthly', 'yearly'].includes(billingCycle)) {
      return NextResponse.json({ error: 'Invalid billing cycle' }, { status: 400 })
    }

    await dbConnect()
    const userId = new mongoose.Types.ObjectId(session.user.id)

    // 获取用户信息
    const user = await User.findById(userId)
    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 })
    }

    // Stripe 需要邮箱进行结账
    if (!user.email) {
      return NextResponse.json(
        { error: 'Please add an email to your account before subscribing' },
        { status: 400 }
      )
    }

    // 获取当前订阅
    const subscription = await Subscription.getOrCreateSubscription(userId)

    // 检查是否已有活跃的付费订阅
    if (subscription.plan !== 'free' && subscription.status === 'active') {
      return NextResponse.json(
        { error: 'Already has active subscription. Use upgrade/downgrade instead.' },
        { status: 400 }
      )
    }

    // 获取或创建Stripe客户
    const stripeCustomer = await getOrCreateStripeCustomer({
      userId: session.user.id,
      email: user.email,
      name: user.name,
      existingCustomerId: subscription.stripeCustomerId,
    })

    // 更新订阅的Stripe客户ID
    if (!subscription.stripeCustomerId) {
      subscription.stripeCustomerId = stripeCustomer.id
      await subscription.save()
    }

    // 获取价格ID
    const priceId = getSubscriptionPriceId(plan, billingCycle)

    // 创建Checkout会话
    const appUrl = getAppUrl()
    const checkoutSession = await createSubscriptionCheckoutSession({
      customerId: stripeCustomer.id,
      priceId,
      successUrl: `${appUrl}/settings/subscription?success=true`,
      cancelUrl: `${appUrl}/settings/subscription?canceled=true`,
      trialDays: 7, // 7天免费试用
      metadata: {
        userId: session.user.id,
        plan,
        billingCycle,
      },
    })

    return NextResponse.json({
      checkoutUrl: checkoutSession.url,
      sessionId: checkoutSession.id,
    })
  } catch (error) {
    console.error('Checkout error:', error)
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 })
  }
}
