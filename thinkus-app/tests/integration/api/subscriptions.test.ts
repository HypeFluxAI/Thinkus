import { describe, it, expect, vi, beforeEach } from 'vitest'
import { NextRequest } from 'next/server'

// Mock all external dependencies before imports
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

// Mock the Subscription model
const mockSubscription = {
  _id: { toString: () => 'sub-123' },
  plan: 'starter',
  status: 'active',
  billingCycle: 'monthly',
  currentPeriodStart: new Date(),
  currentPeriodEnd: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
  cancelAtPeriodEnd: false,
  stripeSubscriptionId: null,
  stripeCustomerId: null,
  save: vi.fn().mockResolvedValue(true),
}

vi.mock('@/lib/db/models', () => ({
  Subscription: {
    getOrCreateSubscription: vi.fn().mockResolvedValue(mockSubscription),
    checkLimit: vi.fn().mockResolvedValue({ allowed: true, current: 0, limit: 5 }),
    findOne: vi.fn().mockResolvedValue(null),
  },
  Payment: {
    getUserPayments: vi.fn().mockResolvedValue([]),
  },
  SUBSCRIPTION_PLANS: {
    free: { name: 'Free', nameCn: '免费版', price: 0, priceYearly: 0, features: {} },
    starter: { name: 'Starter', nameCn: '入门版', price: 29, priceYearly: 290, features: {} },
  },
}))

vi.mock('@/lib/stripe', () => ({
  getSubscription: vi.fn(),
  cancelSubscriptionAtPeriodEnd: vi.fn(),
  resumeSubscription: vi.fn(),
  getInvoices: vi.fn().mockResolvedValue([]),
  getUpcomingInvoice: vi.fn().mockResolvedValue(null),
}))

import { getServerSession } from 'next-auth'

describe('Subscriptions API', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('Authentication checks', () => {
    it('should return 401 for unauthenticated GET request', async () => {
      vi.mocked(getServerSession).mockResolvedValue(null)

      // Dynamically import after mocks are set
      const { GET } = await import('@/app/api/subscriptions/route')

      const request = new NextRequest('http://localhost:3000/api/subscriptions')
      const response = await GET(request)
      const data = await response.json()

      expect(response.status).toBe(401)
      expect(data.error).toBe('Unauthorized')
    })

    it('should return 401 for unauthenticated PATCH request', async () => {
      vi.mocked(getServerSession).mockResolvedValue(null)

      const { PATCH } = await import('@/app/api/subscriptions/route')

      const request = new NextRequest('http://localhost:3000/api/subscriptions', {
        method: 'PATCH',
        body: JSON.stringify({ action: 'cancel' }),
      })
      const response = await PATCH(request)
      const data = await response.json()

      expect(response.status).toBe(401)
      expect(data.error).toBe('Unauthorized')
    })
  })

  describe('Authenticated requests', () => {
    const mockSession = {
      user: { id: 'user-123', email: 'test@example.com', name: 'Test' },
    }

    it('should return subscription data for authenticated user', async () => {
      vi.mocked(getServerSession).mockResolvedValue(mockSession as any)

      const { GET } = await import('@/app/api/subscriptions/route')

      const request = new NextRequest('http://localhost:3000/api/subscriptions')
      const response = await GET(request)
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.success).toBe(true)
      expect(data.subscription).toBeDefined()
    })
  })
})
