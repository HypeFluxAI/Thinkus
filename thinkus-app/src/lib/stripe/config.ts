'use server'

import Stripe from 'stripe'

if (!process.env.STRIPE_SECRET_KEY) {
  throw new Error('STRIPE_SECRET_KEY is not set')
}

export const stripe = new Stripe(process.env.STRIPE_SECRET_KEY, {
  apiVersion: '2025-05-28.basil',
  typescript: true,
})

// Price IDs for different complexity levels
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
