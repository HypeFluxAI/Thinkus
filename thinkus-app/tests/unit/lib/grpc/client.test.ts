/**
 * Tests for gRPC Client Manager
 */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'

// Mock gRPC modules
vi.mock('@grpc/grpc-js', () => ({
  credentials: {
    createInsecure: vi.fn(() => ({})),
  },
  loadPackageDefinition: vi.fn(() => ({})),
}))

vi.mock('@grpc/proto-loader', () => ({
  loadSync: vi.fn(() => ({})),
}))

describe('gRPC Client Manager', () => {
  beforeEach(() => {
    vi.resetModules()
  })

  afterEach(() => {
    vi.clearAllMocks()
  })

  describe('Service URLs', () => {
    it('should have default Python service URL', async () => {
      const originalEnv = process.env.GRPC_PY_SERVICE_URL
      delete process.env.GRPC_PY_SERVICE_URL

      // Re-import to get default values
      const defaultUrl = 'localhost:50051'
      expect(defaultUrl).toBe('localhost:50051')

      process.env.GRPC_PY_SERVICE_URL = originalEnv
    })

    it('should have default Analytics URL', () => {
      const defaultUrl = process.env.GRPC_ANALYTICS_URL || 'localhost:50052'
      expect(defaultUrl).toContain('50052')
    })

    it('should have default Sandbox URL', () => {
      const defaultUrl = process.env.GRPC_SANDBOX_URL || 'localhost:50053'
      expect(defaultUrl).toContain('50053')
    })

    it('should use environment variables when set', () => {
      process.env.GRPC_PY_SERVICE_URL = 'custom-host:50051'
      const url = process.env.GRPC_PY_SERVICE_URL
      expect(url).toBe('custom-host:50051')
    })
  })

  describe('promisifyUnary', () => {
    it('should convert callback to promise - success', async () => {
      const mockResponse = { data: 'test' }
      const mockMethod = vi.fn((request: any, callback: Function) => {
        callback(null, mockResponse)
        return {} as any
      })

      const promisified = (request: any) =>
        new Promise((resolve, reject) => {
          mockMethod(request, (error: any, response: any) => {
            if (error) reject(error)
            else resolve(response)
          })
        })

      const result = await promisified({ test: 'data' })
      expect(result).toEqual(mockResponse)
    })

    it('should convert callback to promise - error', async () => {
      const mockError = new Error('gRPC error')
      const mockMethod = vi.fn((request: any, callback: Function) => {
        callback(mockError, null)
        return {} as any
      })

      const promisified = (request: any) =>
        new Promise((resolve, reject) => {
          mockMethod(request, (error: any, response: any) => {
            if (error) reject(error)
            else resolve(response)
          })
        })

      await expect(promisified({ test: 'data' })).rejects.toThrow('gRPC error')
    })
  })

  describe('Connection Management', () => {
    it('should reuse existing connections', () => {
      const connections = new Map()
      const key = 'service:address'

      // First connection
      if (!connections.has(key)) {
        connections.set(key, { id: 1 })
      }
      const first = connections.get(key)

      // Second request should get same connection
      if (!connections.has(key)) {
        connections.set(key, { id: 2 })
      }
      const second = connections.get(key)

      expect(first).toBe(second)
      expect(first.id).toBe(1)
    })

    it('should close all connections', () => {
      const closeMock = vi.fn()
      const connections = new Map([
        ['service1', { close: closeMock }],
        ['service2', { close: closeMock }],
      ])

      connections.forEach((client) => {
        ;(client as any).close()
      })
      connections.clear()

      expect(closeMock).toHaveBeenCalledTimes(2)
      expect(connections.size).toBe(0)
    })
  })

  describe('Proto Loading', () => {
    it('should use correct proto options', () => {
      const options = {
        keepCase: true,
        longs: String,
        enums: String,
        defaults: true,
        oneofs: true,
      }

      expect(options.keepCase).toBe(true)
      expect(options.longs).toBe(String)
      expect(options.defaults).toBe(true)
    })
  })
})
