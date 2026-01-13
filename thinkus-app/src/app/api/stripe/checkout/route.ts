import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { connectDB } from '@/lib/db/connect'
import { User, Subscription } from '@/lib/db/models'
import {
  getOrCreateStripeCustomer,
  createCheckoutSession,
  STRIPE_PRICE_IDS,
} from '@/lib/stripe'
import type { SubscriptionPlan } from '@/lib/db/models/subscription'

/**
 * POST /api/stripe/checkout
 * 创建 Stripe Checkout Session
 */
export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    await connectDB()
    const body = await req.json()

    const { plan, billingCycle = 'monthly' } = body as {
      plan: SubscriptionPlan
      billingCycle?: 'monthly' | 'yearly'
    }

    // 验证计划
    if (!plan || !['starter', 'professional', 'enterprise'].includes(plan)) {
      return NextResponse.json(
        { error: 'Invalid plan' },
        { status: 400 }
      )
    }

    // 获取价格 ID
    const priceId = STRIPE_PRICE_IDS[plan]?.[billingCycle]
    if (!priceId) {
      return NextResponse.json(
        { error: 'Price not configured for this plan' },
        { status: 400 }
      )
    }

    // 获取用户
    const user = await User.findById(session.user.id)
    if (!user) {
      return NextResponse.json(
        { error: 'User not found' },
        { status: 404 }
      )
    }

    // 获取或创建 Stripe Customer
    const customer = await getOrCreateStripeCustomer(
      session.user.id,
      user.email || '',
      user.name
    )

    // 更新用户的 Stripe Customer ID
    const subscription = await Subscription.getOrCreateSubscription(user._id)
    if (!subscription.stripeCustomerId) {
      subscription.stripeCustomerId = customer.id
      await subscription.save()
    }

    // 确定试用期 (新用户可享受7天试用)
    const isNewSubscriber = subscription.plan === 'free'
    const trialDays = isNewSubscriber ? 7 : 0

    // 创建 Checkout Session
    const origin = req.headers.get('origin') || 'http://localhost:3000'
    const checkoutSession = await createCheckoutSession({
      customerId: customer.id,
      priceId,
      userId: session.user.id,
      successUrl: `${origin}/dashboard/settings/billing?success=true`,
      cancelUrl: `${origin}/pricing?canceled=true`,
      trialDays,
    })

    return NextResponse.json({
      success: true,
      sessionId: checkoutSession.id,
      url: checkoutSession.url,
    })
  } catch (error) {
    console.error('Failed to create checkout session:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
