import Stripe from 'stripe'

if (!process.env.STRIPE_SECRET_KEY) {
  throw new Error('STRIPE_SECRET_KEY is not set')
}

export const stripe = new Stripe(process.env.STRIPE_SECRET_KEY, {
  apiVersion: '2025-12-15.clover',
  typescript: true,
})

// ========== Token 消耗定价算法 ==========

// 每个功能的预估token消耗（开发+测试完整周期）
const TOKEN_ESTIMATES = {
  // 每个功能按优先级的token消耗
  perFeature: {
    P0: 80000,   // 核心功能：需求分析(5k) + 设计(10k) + 代码生成(30k) + 测试(15k) + 调试修复(20k)
    P1: 50000,   // 重要功能：需求(3k) + 设计(5k) + 代码(20k) + 测试(10k) + 调试(12k)
    P2: 25000,   // 简单功能：需求(2k) + 设计(3k) + 代码(10k) + 测试(5k) + 调试(5k)
  },
  // 项目基础开销（架构设计、配置、部署等）
  projectBase: 50000,
  // 集成测试额外开销比例
  integrationOverhead: 0.2, // 20%
}

// Claude API 价格 (USD per 1M tokens)
// Sonnet: Input $3, Output $15, 假设 1:2 输入输出比例 ≈ $11/1M
const TOKEN_PRICE_PER_MILLION = 11

// 利润倍数
const PROFIT_MULTIPLIER = 4

// 最低价格保障
const MIN_PRICE = 29

/**
 * 根据功能列表计算项目价格
 * 价格 = (预估token消耗 × token单价) × 4倍
 */
export function calculateProjectPrice(features: Array<{ priority: string }>): {
  estimatedTokens: number
  tokenCost: number
  finalPrice: number
  breakdown: {
    p0Count: number
    p1Count: number
    p2Count: number
    p0Tokens: number
    p1Tokens: number
    p2Tokens: number
    baseTokens: number
    integrationTokens: number
  }
} {
  const p0Features = features.filter(f => f.priority === 'P0')
  const p1Features = features.filter(f => f.priority === 'P1')
  const p2Features = features.filter(f => f.priority === 'P2')

  // 计算各类功能的token消耗
  const p0Tokens = p0Features.length * TOKEN_ESTIMATES.perFeature.P0
  const p1Tokens = p1Features.length * TOKEN_ESTIMATES.perFeature.P1
  const p2Tokens = p2Features.length * TOKEN_ESTIMATES.perFeature.P2
  const baseTokens = TOKEN_ESTIMATES.projectBase

  // 功能总token
  const featureTokens = p0Tokens + p1Tokens + p2Tokens + baseTokens

  // 集成测试开销
  const integrationTokens = Math.round(featureTokens * TOKEN_ESTIMATES.integrationOverhead)

  // 总token消耗
  const estimatedTokens = featureTokens + integrationTokens

  // Token成本 (USD)
  const tokenCost = (estimatedTokens / 1_000_000) * TOKEN_PRICE_PER_MILLION

  // 最终价格 = token成本 × 4，向上取整到整数
  const rawPrice = tokenCost * PROFIT_MULTIPLIER
  const finalPrice = Math.max(MIN_PRICE, Math.ceil(rawPrice))

  return {
    estimatedTokens,
    tokenCost: Math.round(tokenCost * 100) / 100,
    finalPrice,
    breakdown: {
      p0Count: p0Features.length,
      p1Count: p1Features.length,
      p2Count: p2Features.length,
      p0Tokens,
      p1Tokens,
      p2Tokens,
      baseTokens,
      integrationTokens,
    },
  }
}

// Price IDs for different complexity levels (保留用于参考，实际价格由算法计算)
export const PRICE_CONFIG: Record<string, { amount: number; description: string }> = {
  L1: { amount: 29, description: '简单应用 - 1-3个功能' },
  L2: { amount: 49, description: '标准应用 - 4-6个功能' },
  L3: { amount: 99, description: '复杂应用 - 7-10个功能' },
  L4: { amount: 199, description: '企业级应用 - 11-15个功能' },
  L5: { amount: 399, description: '平台级产品 - 15+个功能' },
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
