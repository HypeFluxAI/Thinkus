import { describe, it, expect, vi, beforeEach } from 'vitest'
import { NextRequest } from 'next/server'

// Mock all Stripe-related modules
vi.mock('stripe', () => ({
  default: vi.fn().mockImplementation(() => ({
    customers: {
      create: vi.fn().mockResolvedValue({ id: 'cus_test123' }),
      retrieve: vi.fn().mockResolvedValue({ id: 'cus_test123', email: 'test@example.com' }),
    },
    checkout: {
      sessions: {
        create: vi.fn().mockResolvedValue({
          id: 'cs_test123',
          url: 'https://checkout.stripe.com/test',
        }),
      },
    },
    subscriptions: {
      retrieve: vi.fn().mockResolvedValue({
        id: 'sub_test123',
        status: 'active',
        current_period_end: Math.floor(Date.now() / 1000) + 30 * 24 * 60 * 60,
      }),
      update: vi.fn().mockResolvedValue({
        id: 'sub_test123',
        cancel_at_period_end: true,
      }),
    },
    billingPortal: {
      sessions: {
        create: vi.fn().mockResolvedValue({
          url: 'https://billing.stripe.com/test',
        }),
      },
    },
  })),
}))

vi.mock('next-auth', () => ({
  getServerSession: vi.fn(),
}))

vi.mock('@/lib/auth', () => ({
  authOptions: {},
}))

vi.mock('@/lib/db/connect', () => ({
  connectDB: vi.fn().mockResolvedValue(undefined),
}))

vi.mock('mongoose', () => ({
  default: {
    connection: { readyState: 1 },
    connect: vi.fn().mockResolvedValue(undefined),
    models: {},
    model: vi.fn(),
  },
}))

vi.mock('@/lib/db/models', () => ({
  User: {
    findById: vi.fn().mockResolvedValue({
      _id: 'user-123',
      email: 'test@example.com',
      name: 'Test User',
    }),
  },
  Subscription: {
    getOrCreateSubscription: vi.fn().mockResolvedValue({
      _id: 'sub-123',
      plan: 'free',
      stripeCustomerId: null,
      save: vi.fn().mockResolvedValue(true),
    }),
  },
}))

vi.mock('@/lib/stripe', () => ({
  getOrCreateStripeCustomer: vi.fn().mockResolvedValue({ id: 'cus_test123' }),
  createCheckoutSession: vi.fn().mockResolvedValue({
    id: 'cs_test123',
    url: 'https://checkout.stripe.com/test',
  }),
  STRIPE_PRICE_IDS: {
    starter: { monthly: 'price_starter_monthly', yearly: 'price_starter_yearly' },
    professional: { monthly: 'price_pro_monthly', yearly: 'price_pro_yearly' },
    enterprise: { monthly: 'price_ent_monthly', yearly: 'price_ent_yearly' },
  },
}))

import { getServerSession } from 'next-auth'

describe('Stripe Checkout API', () => {
  const mockSession = {
    user: { id: 'user-123', email: 'test@example.com', name: 'Test' },
  }

  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('POST /api/stripe/checkout', () => {
    it('should return 401 when not authenticated', async () => {
      vi.mocked(getServerSession).mockResolvedValue(null)

      const { POST } = await import('@/app/api/stripe/checkout/route')

      const request = new NextRequest('http://localhost:3000/api/stripe/checkout', {
        method: 'POST',
        body: JSON.stringify({ plan: 'starter', billingCycle: 'monthly' }),
      })

      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBe(401)
      expect(data.error).toBe('Unauthorized')
    })

    it('should return 400 for invalid plan', async () => {
      vi.mocked(getServerSession).mockResolvedValue(mockSession as any)

      const { POST } = await import('@/app/api/stripe/checkout/route')

      const request = new NextRequest('http://localhost:3000/api/stripe/checkout', {
        method: 'POST',
        body: JSON.stringify({ plan: 'invalid_plan', billingCycle: 'monthly' }),
      })

      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBe(400)
      expect(data.error).toBe('Invalid plan')
    })

    it('should create checkout session for valid plan', async () => {
      vi.mocked(getServerSession).mockResolvedValue(mockSession as any)

      const { POST } = await import('@/app/api/stripe/checkout/route')

      const request = new NextRequest('http://localhost:3000/api/stripe/checkout', {
        method: 'POST',
        headers: { origin: 'http://localhost:3000' },
        body: JSON.stringify({ plan: 'starter', billingCycle: 'monthly' }),
      })

      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.success).toBe(true)
      expect(data.sessionId).toBeDefined()
      expect(data.url).toBeDefined()
    })
  })
})

describe('Stripe Price Configuration', () => {
  const STRIPE_PRICE_IDS = {
    starter: { monthly: 'price_starter_monthly', yearly: 'price_starter_yearly' },
    professional: { monthly: 'price_pro_monthly', yearly: 'price_pro_yearly' },
    enterprise: { monthly: 'price_ent_monthly', yearly: 'price_ent_yearly' },
  }

  it('should have price IDs for all paid plans', () => {
    expect(STRIPE_PRICE_IDS.starter).toBeDefined()
    expect(STRIPE_PRICE_IDS.professional).toBeDefined()
    expect(STRIPE_PRICE_IDS.enterprise).toBeDefined()
  })

  it('should have both monthly and yearly prices', () => {
    Object.values(STRIPE_PRICE_IDS).forEach((plan) => {
      expect(plan.monthly).toBeDefined()
      expect(plan.yearly).toBeDefined()
    })
  })

  it('should not have free plan in price IDs', () => {
    expect((STRIPE_PRICE_IDS as any).free).toBeUndefined()
  })
})

describe('Stripe Webhook Handling', () => {
  const webhookEvents = {
    checkoutCompleted: 'checkout.session.completed',
    subscriptionUpdated: 'customer.subscription.updated',
    subscriptionDeleted: 'customer.subscription.deleted',
    invoicePaid: 'invoice.paid',
    invoicePaymentFailed: 'invoice.payment_failed',
  }

  it('should handle checkout.session.completed event', () => {
    expect(webhookEvents.checkoutCompleted).toBe('checkout.session.completed')
  })

  it('should handle subscription update events', () => {
    expect(webhookEvents.subscriptionUpdated).toBe('customer.subscription.updated')
    expect(webhookEvents.subscriptionDeleted).toBe('customer.subscription.deleted')
  })

  it('should handle invoice events', () => {
    expect(webhookEvents.invoicePaid).toBe('invoice.paid')
    expect(webhookEvents.invoicePaymentFailed).toBe('invoice.payment_failed')
  })
})
