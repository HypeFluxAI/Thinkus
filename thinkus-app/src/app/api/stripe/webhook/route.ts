import { NextRequest, NextResponse } from 'next/server'
import { headers } from 'next/headers'
import Stripe from 'stripe'
import { connectDB } from '@/lib/db/connect'
import { Subscription, Payment, User, InvitationCode } from '@/lib/db/models'
import { constructWebhookEvent, getPlanFromPriceId } from '@/lib/stripe'
import type { SubscriptionStatus } from '@/lib/db/models/subscription'

/**
 * POST /api/stripe/webhook
 * 处理 Stripe Webhook 事件
 */
export async function POST(req: NextRequest) {
  const body = await req.text()
  const headersList = await headers()
  const signature = headersList.get('stripe-signature')

  if (!signature) {
    return NextResponse.json(
      { error: 'Missing stripe-signature header' },
      { status: 400 }
    )
  }

  let event: Stripe.Event

  try {
    event = constructWebhookEvent(body, signature)
  } catch (err) {
    console.error('Webhook signature verification failed:', err)
    return NextResponse.json(
      { error: 'Invalid signature' },
      { status: 400 }
    )
  }

  await connectDB()

  try {
    switch (event.type) {
      case 'checkout.session.completed':
        await handleCheckoutCompleted(event.data.object as Stripe.Checkout.Session)
        break

      case 'customer.subscription.created':
        await handleSubscriptionCreated(event.data.object as Stripe.Subscription)
        break

      case 'customer.subscription.updated':
        await handleSubscriptionUpdated(event.data.object as Stripe.Subscription)
        break

      case 'customer.subscription.deleted':
        await handleSubscriptionDeleted(event.data.object as Stripe.Subscription)
        break

      case 'invoice.paid':
        await handleInvoicePaid(event.data.object as Stripe.Invoice)
        break

      case 'invoice.payment_failed':
        await handleInvoicePaymentFailed(event.data.object as Stripe.Invoice)
        break

      default:
        console.log(`Unhandled event type: ${event.type}`)
    }

    return NextResponse.json({ received: true })
  } catch (error) {
    console.error('Webhook handler error:', error)
    return NextResponse.json(
      { error: 'Webhook handler failed' },
      { status: 500 }
    )
  }
}

/**
 * 处理 Checkout 完成
 */
async function handleCheckoutCompleted(session: Stripe.Checkout.Session) {
  const userId = session.metadata?.userId
  if (!userId) {
    console.error('No userId in checkout session metadata')
    return
  }

  const subscriptionId = session.subscription as string
  if (!subscriptionId) {
    console.error('No subscription in checkout session')
    return
  }

  console.log(`Checkout completed for user ${userId}, subscription ${subscriptionId}`)
}

/**
 * 处理订阅创建
 */
async function handleSubscriptionCreated(stripeSubscription: Stripe.Subscription) {
  const userId = stripeSubscription.metadata?.userId
  if (!userId) {
    console.error('No userId in subscription metadata')
    return
  }

  const priceId = stripeSubscription.items.data[0]?.price.id
  const planInfo = getPlanFromPriceId(priceId)

  if (!planInfo) {
    console.error(`Unknown price ID: ${priceId}`)
    return
  }

  // 更新订阅
  await Subscription.findOneAndUpdate(
    { userId },
    {
      $set: {
        plan: planInfo.plan,
        status: mapStripeStatus(stripeSubscription.status),
        stripeSubscriptionId: stripeSubscription.id,
        stripePriceId: priceId,
        billingCycle: planInfo.billingCycle,
        currentPeriodStart: new Date((stripeSubscription as any).current_period_start * 1000),
        currentPeriodEnd: new Date((stripeSubscription as any).current_period_end * 1000),
        trialStart: stripeSubscription.trial_start
          ? new Date(stripeSubscription.trial_start * 1000)
          : undefined,
        trialEnd: stripeSubscription.trial_end
          ? new Date(stripeSubscription.trial_end * 1000)
          : undefined,
      },
    }
  )

  // 为付费用户生成邀请码
  if (['starter', 'professional', 'enterprise'].includes(planInfo.plan)) {
    await generateInvitationCodesForUser(userId, planInfo.plan)
  }

  console.log(`Subscription created for user ${userId}: ${planInfo.plan}`)
}

/**
 * 处理订阅更新
 */
async function handleSubscriptionUpdated(stripeSubscription: Stripe.Subscription) {
  const userId = stripeSubscription.metadata?.userId
  if (!userId) {
    console.error('No userId in subscription metadata')
    return
  }

  const priceId = stripeSubscription.items.data[0]?.price.id
  const planInfo = getPlanFromPriceId(priceId)

  const updateData: Record<string, unknown> = {
    status: mapStripeStatus(stripeSubscription.status),
    currentPeriodStart: new Date((stripeSubscription as any).current_period_start * 1000),
    currentPeriodEnd: new Date((stripeSubscription as any).current_period_end * 1000),
    cancelAtPeriodEnd: stripeSubscription.cancel_at_period_end,
  }

  if (stripeSubscription.canceled_at) {
    updateData.canceledAt = new Date(stripeSubscription.canceled_at * 1000)
  }

  if (planInfo) {
    updateData.plan = planInfo.plan
    updateData.stripePriceId = priceId
    updateData.billingCycle = planInfo.billingCycle
  }

  await Subscription.findOneAndUpdate({ userId }, { $set: updateData })

  console.log(`Subscription updated for user ${userId}`)
}

/**
 * 处理订阅删除/取消
 */
async function handleSubscriptionDeleted(stripeSubscription: Stripe.Subscription) {
  const userId = stripeSubscription.metadata?.userId
  if (!userId) {
    console.error('No userId in subscription metadata')
    return
  }

  await Subscription.findOneAndUpdate(
    { userId },
    {
      $set: {
        plan: 'free',
        status: 'canceled',
        stripeSubscriptionId: null,
        stripePriceId: null,
        canceledAt: new Date(),
      },
    }
  )

  console.log(`Subscription canceled for user ${userId}`)
}

/**
 * 处理发票支付成功
 */
async function handleInvoicePaid(invoice: Stripe.Invoice) {
  const customerId = invoice.customer as string
  const subscription = await Subscription.findOne({ stripeCustomerId: customerId })

  if (!subscription) {
    console.error(`No subscription found for customer ${customerId}`)
    return
  }

  // 创建支付记录
  await Payment.create({
    userId: subscription.userId,
    subscriptionId: subscription._id,
    amount: (invoice.amount_paid || 0) / 100, // 从分转换为元
    currency: invoice.currency,
    status: 'succeeded',
    type: 'subscription',
    stripeInvoiceId: invoice.id,
    stripeChargeId: (invoice as any).charge as string,
    description: `订阅付款 - ${invoice.lines.data[0]?.description || 'Subscription'}`,
    invoiceNumber: invoice.number || undefined,
    invoiceUrl: invoice.hosted_invoice_url || undefined,
    receiptUrl: invoice.invoice_pdf || undefined,
    paidAt: new Date(),
  })

  console.log(`Invoice paid for user ${subscription.userId}: $${(invoice.amount_paid || 0) / 100}`)
}

/**
 * 处理发票支付失败
 */
async function handleInvoicePaymentFailed(invoice: Stripe.Invoice) {
  const customerId = invoice.customer as string
  const subscription = await Subscription.findOne({ stripeCustomerId: customerId })

  if (!subscription) {
    console.error(`No subscription found for customer ${customerId}`)
    return
  }

  // 更新订阅状态为 past_due
  await Subscription.findByIdAndUpdate(subscription._id, {
    $set: { status: 'past_due' },
  })

  // 创建失败的支付记录
  await Payment.create({
    userId: subscription.userId,
    subscriptionId: subscription._id,
    amount: (invoice.amount_due || 0) / 100,
    currency: invoice.currency,
    status: 'failed',
    type: 'subscription',
    stripeInvoiceId: invoice.id,
    description: `订阅付款失败 - ${invoice.lines.data[0]?.description || 'Subscription'}`,
    failureMessage: 'Payment failed',
  })

  console.log(`Invoice payment failed for user ${subscription.userId}`)

  // TODO: 发送邮件通知用户支付失败
}

/**
 * 映射 Stripe 订阅状态到我们的状态
 */
function mapStripeStatus(stripeStatus: Stripe.Subscription.Status): SubscriptionStatus {
  const statusMap: Record<Stripe.Subscription.Status, SubscriptionStatus> = {
    active: 'active',
    canceled: 'canceled',
    incomplete: 'active',
    incomplete_expired: 'canceled',
    past_due: 'past_due',
    paused: 'paused',
    trialing: 'trialing',
    unpaid: 'past_due',
  }
  return statusMap[stripeStatus] || 'active'
}

/**
 * 为付费用户生成邀请码
 */
async function generateInvitationCodesForUser(userId: string, plan: string) {
  const codeCount = {
    starter: 2,
    professional: 5,
    enterprise: 10,
  }[plan] || 0

  if (codeCount === 0) return

  const user = await User.findById(userId)
  if (!user) return

  // 检查是否已经有邀请码
  const existingCodes = await InvitationCode.countDocuments({
    createdBy: userId,
    type: 'user_invite',
  })

  const codesToGenerate = Math.max(0, codeCount - existingCodes)

  // 设置30天后过期
  const expiresAt = new Date()
  expiresAt.setDate(expiresAt.getDate() + 30)

  for (let i = 0; i < codesToGenerate; i++) {
    await InvitationCode.create({
      code: generateInviteCode(),
      type: 'user_invite',
      tier: 'common',
      createdBy: userId,
      boundTo: user.email,
      expiresAt,
      status: 'active',
      benefits: {
        skipWaitlist: true,
        trialDays: 7,
      },
    })
  }

  console.log(`Generated ${codesToGenerate} invitation codes for user ${userId}`)
}

/**
 * 生成随机邀请码
 */
function generateInviteCode(): string {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789'
  let code = ''
  for (let i = 0; i < 8; i++) {
    code += chars.charAt(Math.floor(Math.random() * chars.length))
  }
  return `TKS-${code}`
}

// 禁用 body 解析，因为我们需要原始 body 来验证签名
export const config = {
  api: {
    bodyParser: false,
  },
}
