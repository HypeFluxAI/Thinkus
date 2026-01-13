import { vi } from 'vitest'
import { NextRequest } from 'next/server'

// Create mock NextRequest
export function createMockRequest(
  method: string = 'GET',
  options: {
    url?: string
    body?: unknown
    headers?: Record<string, string>
    searchParams?: Record<string, string>
  } = {}
): NextRequest {
  const url = new URL(options.url || 'http://localhost:3000/api/test')

  if (options.searchParams) {
    Object.entries(options.searchParams).forEach(([key, value]) => {
      url.searchParams.set(key, value)
    })
  }

  const request = new NextRequest(url, {
    method,
    headers: new Headers(options.headers || {}),
    body: options.body ? JSON.stringify(options.body) : undefined,
  })

  return request
}

// Mock session for authenticated requests
export const mockAuthenticatedSession = {
  user: {
    id: 'user-123',
    email: 'test@example.com',
    name: 'Test User',
  },
  expires: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
}

// Mock getServerSession
export const mockGetServerSession = vi.fn()

// Setup authenticated request
export function setupAuthenticatedRequest() {
  mockGetServerSession.mockResolvedValue(mockAuthenticatedSession)
}

// Setup unauthenticated request
export function setupUnauthenticatedRequest() {
  mockGetServerSession.mockResolvedValue(null)
}

// Parse JSON response
export async function parseResponse(response: Response) {
  const text = await response.text()
  try {
    return JSON.parse(text)
  } catch {
    return text
  }
}
