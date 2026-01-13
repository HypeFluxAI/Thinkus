import { describe, it, expect, vi, beforeEach, beforeAll } from 'vitest'

// Mock mongoose before importing the route
vi.mock('mongoose', () => ({
  default: {
    connection: {
      readyState: 1,
    },
    connect: vi.fn().mockResolvedValue(undefined),
  },
  connection: {
    readyState: 1,
  },
}))

// Mock the database connection module
vi.mock('@/lib/db/connection', () => ({
  default: vi.fn().mockResolvedValue(undefined),
}))

vi.mock('@/lib/db/connect', () => ({
  connectDB: vi.fn().mockResolvedValue(undefined),
}))

// Import after mocks are set up
import { GET } from '@/app/api/health/route'

describe('Health API', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('should return healthy status', async () => {
    const response = await GET()
    const data = await response.json()

    expect(response.status).toBe(200)
    expect(data.status).toBeDefined()
    expect(data.timestamp).toBeDefined()
    expect(data.version).toBeDefined()
  })

  it('should include services info', async () => {
    const response = await GET()
    const data = await response.json()

    expect(data.services).toBeDefined()
    expect(data.services.api).toBeDefined()
    expect(data.services.api.status).toBe('running')
  })

  it('should return valid ISO timestamp', async () => {
    const response = await GET()
    const data = await response.json()

    const timestamp = new Date(data.timestamp)
    expect(timestamp.toISOString()).toBe(data.timestamp)
  })

  it('should return correct content-type', async () => {
    const response = await GET()

    expect(response.headers.get('content-type')).toContain('application/json')
  })
})
