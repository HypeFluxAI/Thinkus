import Stripe from 'stripe'
import { SUBSCRIPTION_PLANS, type SubscriptionPlan } from '@/lib/db/models/subscription'

// Stripe 客户端
export const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: '2025-12-15.clover',
  typescript: true,
})

// Stripe 价格 ID 配置 (需要在 Stripe Dashboard 中创建)
export const STRIPE_PRICE_IDS: Record<SubscriptionPlan, { monthly?: string; yearly?: string }> = {
  free: {},
  starter: {
    monthly: process.env.STRIPE_STARTER_MONTHLY_PRICE_ID,
    yearly: process.env.STRIPE_STARTER_YEARLY_PRICE_ID,
  },
  professional: {
    monthly: process.env.STRIPE_PROFESSIONAL_MONTHLY_PRICE_ID,
    yearly: process.env.STRIPE_PROFESSIONAL_YEARLY_PRICE_ID,
  },
  enterprise: {
    monthly: process.env.STRIPE_ENTERPRISE_MONTHLY_PRICE_ID,
    yearly: process.env.STRIPE_ENTERPRISE_YEARLY_PRICE_ID,
  },
}

/**
 * 创建或获取 Stripe Customer
 */
export async function getOrCreateStripeCustomer(
  userId: string,
  email: string,
  name?: string
): Promise<Stripe.Customer> {
  // 搜索现有客户
  const existingCustomers = await stripe.customers.list({
    email,
    limit: 1,
  })

  if (existingCustomers.data.length > 0) {
    return existingCustomers.data[0]
  }

  // 创建新客户
  return stripe.customers.create({
    email,
    name,
    metadata: {
      userId,
    },
  })
}

/**
 * 创建 Checkout Session
 */
export async function createCheckoutSession(options: {
  customerId: string
  priceId: string
  userId: string
  successUrl: string
  cancelUrl: string
  trialDays?: number
}): Promise<Stripe.Checkout.Session> {
  const { customerId, priceId, userId, successUrl, cancelUrl, trialDays } = options

  const sessionParams: Stripe.Checkout.SessionCreateParams = {
    customer: customerId,
    mode: 'subscription',
    payment_method_types: ['card'],
    line_items: [
      {
        price: priceId,
        quantity: 1,
      },
    ],
    success_url: successUrl,
    cancel_url: cancelUrl,
    metadata: {
      userId,
    },
    subscription_data: {
      metadata: {
        userId,
      },
    },
    allow_promotion_codes: true,
    billing_address_collection: 'auto',
  }

  // 添加试用期
  if (trialDays && trialDays > 0) {
    sessionParams.subscription_data!.trial_period_days = trialDays
  }

  return stripe.checkout.sessions.create(sessionParams)
}

/**
 * 创建客户门户会话
 */
export async function createPortalSession(
  customerId: string,
  returnUrl: string
): Promise<Stripe.BillingPortal.Session> {
  return stripe.billingPortal.sessions.create({
    customer: customerId,
    return_url: returnUrl,
  })
}

/**
 * 获取订阅详情
 */
export async function getSubscription(subscriptionId: string): Promise<Stripe.Subscription> {
  return stripe.subscriptions.retrieve(subscriptionId, {
    expand: ['default_payment_method', 'latest_invoice'],
  })
}

/**
 * 取消订阅 (在周期结束时)
 */
export async function cancelSubscriptionAtPeriodEnd(
  subscriptionId: string
): Promise<Stripe.Subscription> {
  return stripe.subscriptions.update(subscriptionId, {
    cancel_at_period_end: true,
  })
}

/**
 * 恢复已取消的订阅
 */
export async function resumeSubscription(
  subscriptionId: string
): Promise<Stripe.Subscription> {
  return stripe.subscriptions.update(subscriptionId, {
    cancel_at_period_end: false,
  })
}

/**
 * 更新订阅计划
 */
export async function updateSubscriptionPlan(
  subscriptionId: string,
  newPriceId: string
): Promise<Stripe.Subscription> {
  const subscription = await stripe.subscriptions.retrieve(subscriptionId)

  return stripe.subscriptions.update(subscriptionId, {
    items: [
      {
        id: subscription.items.data[0].id,
        price: newPriceId,
      },
    ],
    proration_behavior: 'create_prorations',
  })
}

/**
 * 获取发票列表
 */
export async function getInvoices(
  customerId: string,
  limit: number = 10
): Promise<Stripe.Invoice[]> {
  const invoices = await stripe.invoices.list({
    customer: customerId,
    limit,
  })
  return invoices.data
}

/**
 * 获取即将到来的发票预览
 */
export async function getUpcomingInvoice(
  customerId: string
): Promise<Stripe.Invoice | null> {
  try {
    // @ts-expect-error - Stripe API version mismatch
    return await stripe.invoices.retrieveUpcoming({
      customer: customerId,
    })
  } catch {
    return null
  }
}

/**
 * 验证 Webhook 签名
 */
export function constructWebhookEvent(
  payload: string | Buffer,
  signature: string
): Stripe.Event {
  return stripe.webhooks.constructEvent(
    payload,
    signature,
    process.env.STRIPE_WEBHOOK_SECRET!
  )
}

/**
 * 从 Stripe 价格 ID 获取计划信息
 */
export function getPlanFromPriceId(priceId: string): {
  plan: SubscriptionPlan
  billingCycle: 'monthly' | 'yearly'
} | null {
  for (const [plan, prices] of Object.entries(STRIPE_PRICE_IDS)) {
    if (prices.monthly === priceId) {
      return { plan: plan as SubscriptionPlan, billingCycle: 'monthly' }
    }
    if (prices.yearly === priceId) {
      return { plan: plan as SubscriptionPlan, billingCycle: 'yearly' }
    }
  }
  return null
}

/**
 * 计算计划价格 (分为单位)
 */
export function getPlanPriceInCents(
  plan: SubscriptionPlan,
  billingCycle: 'monthly' | 'yearly'
): number {
  const planConfig = SUBSCRIPTION_PLANS[plan]
  const price = billingCycle === 'yearly' ? planConfig.priceYearly : planConfig.price
  return price * 100 // 转换为分
}
