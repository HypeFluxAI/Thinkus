// 订阅计划类型
export type SubscriptionPlan = 'free' | 'starter' | 'professional' | 'enterprise'

// 订阅状态
export type SubscriptionStatus = 'active' | 'canceled' | 'past_due' | 'trialing' | 'paused'

// 订阅计划功能
export interface SubscriptionFeatures {
  maxProjects: number
  maxDiscussionsPerMonth: number
  maxExecutives: number
  maxMessagesPerDay: number
  memoryEnabled: boolean
  prioritySupport: boolean
  customBranding: boolean
}

// 订阅计划配置
export interface SubscriptionPlanConfig {
  name: string
  nameCn: string
  price: number
  priceYearly: number
  features: SubscriptionFeatures
}

// 订阅计划配置
export const SUBSCRIPTION_PLANS: Record<SubscriptionPlan, SubscriptionPlanConfig> = {
  free: {
    name: 'Free',
    nameCn: '免费版',
    price: 0,
    priceYearly: 0,
    features: {
      maxProjects: 1,
      maxDiscussionsPerMonth: 5,
      maxExecutives: 3,
      maxMessagesPerDay: 20,
      memoryEnabled: false,
      prioritySupport: false,
      customBranding: false,
    },
  },
  starter: {
    name: 'Starter',
    nameCn: '入门版',
    price: 29,
    priceYearly: 290, // ~17% 折扣
    features: {
      maxProjects: 5,
      maxDiscussionsPerMonth: 50,
      maxExecutives: 6,
      maxMessagesPerDay: 100,
      memoryEnabled: true,
      prioritySupport: false,
      customBranding: false,
    },
  },
  professional: {
    name: 'Professional',
    nameCn: '专业版',
    price: 99,
    priceYearly: 990, // ~17% 折扣
    features: {
      maxProjects: 20,
      maxDiscussionsPerMonth: 200,
      maxExecutives: 12,
      maxMessagesPerDay: 500,
      memoryEnabled: true,
      prioritySupport: true,
      customBranding: false,
    },
  },
  enterprise: {
    name: 'Enterprise',
    nameCn: '企业版',
    price: 299,
    priceYearly: 2990, // ~17% 折扣
    features: {
      maxProjects: -1, // 无限制
      maxDiscussionsPerMonth: -1,
      maxExecutives: 18,
      maxMessagesPerDay: -1,
      memoryEnabled: true,
      prioritySupport: true,
      customBranding: true,
    },
  },
} as const
