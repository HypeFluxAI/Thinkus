import { test, expect } from '@playwright/test'

test.describe('API Endpoints', () => {
  test.describe('Health Check', () => {
    test('should return healthy status', async ({ request }) => {
      const response = await request.get('/api/health')

      expect(response.status()).toBe(200)

      const data = await response.json()
      expect(data.status).toBe('healthy')
      expect(data.services).toBeDefined()
      expect(data.services.api.status).toBe('running')
    })

    test('should include timestamp', async ({ request }) => {
      const response = await request.get('/api/health')
      const data = await response.json()

      expect(data.timestamp).toBeDefined()
      // Should be valid ISO date
      expect(new Date(data.timestamp).toISOString()).toBe(data.timestamp)
    })
  })

  test.describe('Authentication Required Endpoints', () => {
    test('should return 401 for subscriptions without auth', async ({ request }) => {
      const response = await request.get('/api/subscriptions')

      expect(response.status()).toBe(401)

      const data = await response.json()
      expect(data.error).toBe('Unauthorized')
    })

    test('should return 401 for skills without auth', async ({ request }) => {
      const response = await request.get('/api/skills')

      expect(response.status()).toBe(401)

      const data = await response.json()
      expect(data.error).toBe('Unauthorized')
    })

    test('should return 401 for decisions without auth', async ({ request }) => {
      const response = await request.get('/api/decisions')

      expect(response.status()).toBe(401)

      const data = await response.json()
      expect(data.error).toBe('Unauthorized')
    })
  })

  test.describe('Cron Endpoints', () => {
    test('should return info for standups cron', async ({ request }) => {
      const response = await request.get('/api/cron/standups')

      expect(response.status()).toBe(200)

      const data = await response.json()
      expect(data.status).toBe('ok')
      expect(data.description).toBeDefined()
      expect(data.schedule).toBeDefined()
    })

    test('should return info for decisions cron', async ({ request }) => {
      const response = await request.get('/api/cron/decisions')

      expect(response.status()).toBe(200)

      const data = await response.json()
      expect(data.status).toBe('ok')
      expect(data.levels).toBeDefined()
    })

    test('should return info for memory-maintenance cron', async ({ request }) => {
      const response = await request.get('/api/cron/memory-maintenance')

      expect(response.status()).toBe(200)

      const data = await response.json()
      expect(data.status).toBe('ok')
      expect(data.operations).toBeDefined()
    })

    test('should return info for skill-distillation cron', async ({ request }) => {
      const response = await request.get('/api/cron/skill-distillation')

      expect(response.status()).toBe(200)

      const data = await response.json()
      expect(data.status).toBe('ok')
      expect(data.stats).toBeDefined()
    })
  })

  test.describe('Invitation Code Validation', () => {
    test('should validate invitation code format', async ({ request }) => {
      const response = await request.post('/api/invitation/validate', {
        data: { code: 'INVALID123' },
      })

      // API may return 200 with valid:false or 400 for invalid code
      expect([200, 400]).toContain(response.status())

      const data = await response.json()
      // Either valid is false or error is present
      expect(data.valid === false || data.error !== undefined).toBe(true)
    })

    test('should reject empty code', async ({ request }) => {
      const response = await request.post('/api/invitation/validate', {
        data: { code: '' },
      })

      const data = await response.json()
      expect(data.valid).toBe(false)
    })
  })
})
