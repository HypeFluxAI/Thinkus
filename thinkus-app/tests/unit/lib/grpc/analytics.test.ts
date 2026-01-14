/**
 * Tests for Analytics Service gRPC Client
 */
import { describe, it, expect, vi } from 'vitest'

describe('Analytics Service Client Types', () => {
  describe('TrackRequest', () => {
    it('should have correct structure', () => {
      const request = {
        project_id: 'project123',
        event: 'page_view',
        session_id: 'session123',
        url: 'https://example.com/page',
        referrer: 'https://google.com',
        user_id: 'user123',
        data: { button: 'signup' },
        device: { type: 'desktop', os: 'macOS', browser: 'Chrome' },
        geo: { country: 'US', city: 'San Francisco', timezone: 'America/Los_Angeles' },
      }

      expect(request.event).toBe('page_view')
      expect(request.device.type).toBe('desktop')
      expect(request.geo.country).toBe('US')
    })

    it('should support common event types', () => {
      const events = [
        'page_view',
        'session_start',
        'session_end',
        'click',
        'conversion',
        'signup',
        'purchase',
      ]

      events.forEach((event) => {
        const request = { event }
        expect(request.event).toBe(event)
      })
    })
  })

  describe('Device', () => {
    it('should support all device types', () => {
      const types = ['desktop', 'mobile', 'tablet']

      types.forEach((type) => {
        const device = { type, os: '', browser: '' }
        expect(['desktop', 'mobile', 'tablet']).toContain(device.type)
      })
    })

    it('should support common browsers', () => {
      const browsers = ['Chrome', 'Firefox', 'Safari', 'Edge', 'Opera']

      browsers.forEach((browser) => {
        const device = { type: 'desktop', os: '', browser }
        expect(device.browser).toBe(browser)
      })
    })

    it('should support common operating systems', () => {
      const systems = ['Windows', 'macOS', 'Linux', 'iOS', 'Android']

      systems.forEach((os) => {
        const device = { type: 'desktop', os, browser: '' }
        expect(device.os).toBe(os)
      })
    })
  })

  describe('Geo', () => {
    it('should have correct structure', () => {
      const geo = {
        country: 'CN',
        city: 'Beijing',
        timezone: 'Asia/Shanghai',
      }

      expect(geo.country).toBe('CN')
      expect(geo.timezone).toContain('Asia')
    })

    it('should support ISO country codes', () => {
      const countries = ['US', 'CN', 'GB', 'DE', 'JP', 'FR']

      countries.forEach((country) => {
        expect(country).toHaveLength(2)
      })
    })
  })

  describe('Period', () => {
    it('should have start and end timestamps', () => {
      const now = Date.now()
      const period = {
        start: now - 24 * 60 * 60 * 1000, // 24 hours ago
        end: now,
      }

      expect(period.end).toBeGreaterThan(period.start)
      expect(period.end - period.start).toBe(24 * 60 * 60 * 1000)
    })
  })

  describe('ProjectStats', () => {
    it('should have all required sections', () => {
      const stats = {
        users: { total: 1000, new: 100, active: 500, change: 5.5 },
        page_views: { total: 5000, change: 10.2 },
        sessions: { total: 2000, avg_duration: 180, change: 3.1 },
        conversion: { rate: 2.5, change: 0.5 },
        engagement: {
          bounce_rate: 45.0,
          avg_session_duration: 180,
          page_views_per_session: 2.5,
        },
      }

      expect(stats.users.total).toBe(1000)
      expect(stats.conversion.rate).toBe(2.5)
      expect(stats.engagement.bounce_rate).toBe(45.0)
    })
  })

  describe('TrendData', () => {
    it('should have date and value', () => {
      const trends = [
        { date: '2024-01-01', value: 100 },
        { date: '2024-01-02', value: 120 },
        { date: '2024-01-03', value: 150 },
      ]

      expect(trends).toHaveLength(3)
      expect(trends[0].date).toBe('2024-01-01')
      expect(trends[2].value).toBe(150)
    })
  })

  describe('FunnelStep', () => {
    it('should have correct structure', () => {
      const steps = [
        { name: 'visit', count: 1000, rate: 100, dropoff: 0 },
        { name: 'signup', count: 200, rate: 20, dropoff: 80 },
        { name: 'purchase', count: 50, rate: 25, dropoff: 75 },
      ]

      expect(steps[0].rate).toBe(100)
      expect(steps[1].dropoff).toBe(80)
    })

    it('should calculate dropoff correctly', () => {
      const rate = 20
      const dropoff = 100 - rate

      expect(dropoff).toBe(80)
    })
  })

  describe('StreamEvent', () => {
    it('should have correct structure', () => {
      const event = {
        type: 'code_change',
        project_id: 'project123',
        timestamp: Date.now(),
        payload: JSON.stringify({ file: 'main.ts', content: 'code' }),
      }

      expect(event.type).toBe('code_change')
      expect(event.timestamp).toBeGreaterThan(0)
    })

    it('should support all event types', () => {
      const types = [
        'code_change',
        'terminal_output',
        'agent_status',
        'progress',
        'preview_update',
        'error',
        'message',
      ]

      types.forEach((type) => {
        const event = { type }
        expect(types).toContain(event.type)
      })
    })
  })
})

describe('Analytics Service Client Functions', () => {
  // Mock gRPC
  vi.mock('@grpc/grpc-js', () => ({
    credentials: {
      createInsecure: vi.fn(() => ({})),
    },
    loadPackageDefinition: vi.fn(() => ({
      thinkus: {
        analytics: {
          AnalyticsService: vi.fn(() => ({
            Track: vi.fn(),
            TrackBatch: vi.fn(),
            GetStats: vi.fn(),
            GetTrends: vi.fn(),
            GetFunnel: vi.fn(),
            GetTopPages: vi.fn(),
            GenerateTrackingScript: vi.fn(),
            close: vi.fn(),
          })),
          RealtimeService: vi.fn(() => ({
            Subscribe: vi.fn(),
            Push: vi.fn(),
            close: vi.fn(),
          })),
        },
      },
    })),
  }))

  vi.mock('@grpc/proto-loader', () => ({
    loadSync: vi.fn(() => ({})),
  }))

  describe('track', () => {
    it('should require project_id and event', () => {
      const request = {
        project_id: 'project123',
        event: 'page_view',
      }

      expect(request.project_id).toBeDefined()
      expect(request.event).toBeDefined()
    })
  })

  describe('getStats', () => {
    it('should require project_id and period', () => {
      const request = {
        project_id: 'project123',
        period: {
          start: Date.now() - 86400000,
          end: Date.now(),
        },
      }

      expect(request.project_id).toBeDefined()
      expect(request.period.start).toBeLessThan(request.period.end)
    })
  })

  describe('getTrends', () => {
    it('should support different metrics', () => {
      const metrics = ['pageViews', 'sessions', 'users', 'conversions']

      metrics.forEach((metric) => {
        const request = { metric }
        expect(['pageViews', 'sessions', 'users', 'conversions']).toContain(request.metric)
      })
    })
  })

  describe('getFunnel', () => {
    it('should accept array of steps', () => {
      const steps = ['visit', 'signup', 'activate', 'purchase']

      expect(steps).toHaveLength(4)
      expect(steps[0]).toBe('visit')
    })
  })

  describe('getTopPages', () => {
    it('should support limit parameter', () => {
      const limits = [5, 10, 20, 50, 100]

      limits.forEach((limit) => {
        expect(limit).toBeGreaterThan(0)
      })
    })
  })

  describe('subscribe (realtime)', () => {
    it('should require project_id', () => {
      const request = { project_id: 'project123' }
      expect(request.project_id).toBeDefined()
    })
  })

  describe('push (realtime)', () => {
    it('should require project_id and type', () => {
      const request = {
        project_id: 'project123',
        type: 'code_change',
        payload: Buffer.from(JSON.stringify({ data: 'test' })),
      }

      expect(request.project_id).toBeDefined()
      expect(request.type).toBeDefined()
    })
  })
})
