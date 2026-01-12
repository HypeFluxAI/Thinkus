import Stripe from 'stripe'

if (!process.env.STRIPE_SECRET_KEY) {
  throw new Error('STRIPE_SECRET_KEY is not set')
}

export const stripe = new Stripe(process.env.STRIPE_SECRET_KEY, {
  apiVersion: '2025-12-15.clover',
  typescript: true,
})

// Price IDs for different complexity levels (一次性项目支付)
export const PRICE_CONFIG: Record<string, { amount: number; description: string }> = {
  L1: { amount: 99, description: '简单应用 - 3-5页落地页' },
  L2: { amount: 299, description: '标准应用 - 5-10页标准应用' },
  L3: { amount: 599, description: '复杂应用 - 10-20页复杂应用' },
  L4: { amount: 1299, description: '企业级应用 - 20-50页企业应用' },
  L5: { amount: 2999, description: '平台级产品 - 50+页平台产品' },
}

export function getPriceForComplexity(complexity: string): number {
  return PRICE_CONFIG[complexity]?.amount || PRICE_CONFIG.L2.amount
}

// ========== 订阅计划配置 ==========

// 订阅价格ID (需要在Stripe Dashboard中创建对应的Price)
export const SUBSCRIPTION_PRICE_IDS = {
  starter: {
    monthly: process.env.STRIPE_PRICE_STARTER_MONTHLY || '',
    yearly: process.env.STRIPE_PRICE_STARTER_YEARLY || '',
  },
  professional: {
    monthly: process.env.STRIPE_PRICE_PROFESSIONAL_MONTHLY || '',
    yearly: process.env.STRIPE_PRICE_PROFESSIONAL_YEARLY || '',
  },
  enterprise: {
    monthly: process.env.STRIPE_PRICE_ENTERPRISE_MONTHLY || '',
    yearly: process.env.STRIPE_PRICE_ENTERPRISE_YEARLY || '',
  },
} as const

// 订阅计划类型
export type SubscriptionPlanKey = 'starter' | 'professional' | 'enterprise'
export type BillingCycle = 'monthly' | 'yearly'

// 获取订阅价格ID
export function getSubscriptionPriceId(
  plan: SubscriptionPlanKey,
  billingCycle: BillingCycle
): string {
  const priceId = SUBSCRIPTION_PRICE_IDS[plan]?.[billingCycle]
  if (!priceId) {
    throw new Error(`Price ID not configured for ${plan} ${billingCycle}`)
  }
  return priceId
}

// 获取应用URL
export function getAppUrl(): string {
  return process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'
}

// ========== Stripe客户管理 ==========

// 创建或获取Stripe客户
export async function getOrCreateStripeCustomer(params: {
  userId: string
  email: string
  name?: string
  existingCustomerId?: string
}): Promise<Stripe.Customer> {
  const { userId, email, name, existingCustomerId } = params

  // 如果已有客户ID，尝试获取
  if (existingCustomerId) {
    try {
      const customer = await stripe.customers.retrieve(existingCustomerId)
      if (!customer.deleted) {
        return customer as Stripe.Customer
      }
    } catch {
      // 客户不存在，继续创建新的
    }
  }

  // 查找是否有同邮箱的客户
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

// ========== 订阅管理 ==========

// 创建订阅Checkout会话
export async function createSubscriptionCheckoutSession(params: {
  customerId: string
  priceId: string
  successUrl: string
  cancelUrl: string
  trialDays?: number
  metadata?: Record<string, string>
}): Promise<Stripe.Checkout.Session> {
  const { customerId, priceId, successUrl, cancelUrl, trialDays, metadata } = params

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
    metadata,
    allow_promotion_codes: true,
  }

  // 添加试用期
  if (trialDays && trialDays > 0) {
    sessionParams.subscription_data = {
      trial_period_days: trialDays,
    }
  }

  return stripe.checkout.sessions.create(sessionParams)
}

// 创建客户门户会话 (用于管理订阅)
export async function createBillingPortalSession(params: {
  customerId: string
  returnUrl: string
}): Promise<Stripe.BillingPortal.Session> {
  return stripe.billingPortal.sessions.create({
    customer: params.customerId,
    return_url: params.returnUrl,
  })
}

// 取消订阅
export async function cancelSubscription(
  subscriptionId: string,
  cancelAtPeriodEnd: boolean = true
): Promise<Stripe.Subscription> {
  if (cancelAtPeriodEnd) {
    return stripe.subscriptions.update(subscriptionId, {
      cancel_at_period_end: true,
    })
  } else {
    return stripe.subscriptions.cancel(subscriptionId)
  }
}

// 恢复取消的订阅
export async function resumeSubscription(
  subscriptionId: string
): Promise<Stripe.Subscription> {
  return stripe.subscriptions.update(subscriptionId, {
    cancel_at_period_end: false,
  })
}

// 更改订阅计划
export async function changeSubscriptionPlan(
  subscriptionId: string,
  newPriceId: string
): Promise<Stripe.Subscription> {
  // 获取当前订阅
  const subscription = await stripe.subscriptions.retrieve(subscriptionId)

  // 更新订阅项
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

// 获取订阅详情
export async function getSubscription(
  subscriptionId: string
): Promise<Stripe.Subscription> {
  return stripe.subscriptions.retrieve(subscriptionId, {
    expand: ['default_payment_method', 'latest_invoice'],
  })
}

// 获取客户的发票列表
export async function getCustomerInvoices(
  customerId: string,
  limit: number = 10
): Promise<Stripe.Invoice[]> {
  const invoices = await stripe.invoices.list({
    customer: customerId,
    limit,
  })
  return invoices.data
}
