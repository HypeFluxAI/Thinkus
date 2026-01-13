import { describe, it, expect } from 'vitest'
import { SUBSCRIPTION_PLANS, type SubscriptionPlan } from '@/lib/config/subscription-plans'

describe('Subscription Plans Configuration', () => {
  const plans: SubscriptionPlan[] = ['free', 'starter', 'professional', 'enterprise']

  it('should have all required plans', () => {
    plans.forEach((plan) => {
      expect(SUBSCRIPTION_PLANS[plan]).toBeDefined()
    })
  })

  it('should have correct structure for each plan', () => {
    plans.forEach((plan) => {
      const config = SUBSCRIPTION_PLANS[plan]

      // Basic properties
      expect(config.name).toBeDefined()
      expect(config.nameCn).toBeDefined()
      expect(typeof config.price).toBe('number')
      expect(typeof config.priceYearly).toBe('number')

      // Features
      expect(config.features).toBeDefined()
      expect(typeof config.features.maxProjects).toBe('number')
      expect(typeof config.features.maxDiscussionsPerMonth).toBe('number')
      expect(typeof config.features.maxExecutives).toBe('number')
      expect(typeof config.features.maxMessagesPerDay).toBe('number')
      expect(typeof config.features.memoryEnabled).toBe('boolean')
      expect(typeof config.features.prioritySupport).toBe('boolean')
      expect(typeof config.features.customBranding).toBe('boolean')
    })
  })

  it('should have free plan with zero price', () => {
    expect(SUBSCRIPTION_PLANS.free.price).toBe(0)
    expect(SUBSCRIPTION_PLANS.free.priceYearly).toBe(0)
  })

  it('should have yearly price lower per month than monthly', () => {
    plans.filter(p => p !== 'free').forEach((plan) => {
      const config = SUBSCRIPTION_PLANS[plan]
      const monthlyPerYear = config.price * 12
      expect(config.priceYearly).toBeLessThan(monthlyPerYear)
    })
  })

  it('should have increasing features from free to enterprise', () => {
    expect(SUBSCRIPTION_PLANS.free.features.maxProjects)
      .toBeLessThan(SUBSCRIPTION_PLANS.starter.features.maxProjects)

    expect(SUBSCRIPTION_PLANS.starter.features.maxProjects)
      .toBeLessThan(SUBSCRIPTION_PLANS.professional.features.maxProjects)

    // Enterprise has unlimited (-1)
    expect(SUBSCRIPTION_PLANS.enterprise.features.maxProjects).toBe(-1)
  })

  it('should have memory enabled only for paid plans', () => {
    expect(SUBSCRIPTION_PLANS.free.features.memoryEnabled).toBe(false)
    expect(SUBSCRIPTION_PLANS.starter.features.memoryEnabled).toBe(true)
    expect(SUBSCRIPTION_PLANS.professional.features.memoryEnabled).toBe(true)
    expect(SUBSCRIPTION_PLANS.enterprise.features.memoryEnabled).toBe(true)
  })

  it('should have priority support only for professional and enterprise', () => {
    expect(SUBSCRIPTION_PLANS.free.features.prioritySupport).toBe(false)
    expect(SUBSCRIPTION_PLANS.starter.features.prioritySupport).toBe(false)
    expect(SUBSCRIPTION_PLANS.professional.features.prioritySupport).toBe(true)
    expect(SUBSCRIPTION_PLANS.enterprise.features.prioritySupport).toBe(true)
  })

  it('should have custom branding only for enterprise', () => {
    expect(SUBSCRIPTION_PLANS.free.features.customBranding).toBe(false)
    expect(SUBSCRIPTION_PLANS.starter.features.customBranding).toBe(false)
    expect(SUBSCRIPTION_PLANS.professional.features.customBranding).toBe(false)
    expect(SUBSCRIPTION_PLANS.enterprise.features.customBranding).toBe(true)
  })
})
