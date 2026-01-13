import { beforeAll, afterAll, afterEach, vi } from 'vitest'
import { cleanup } from '@testing-library/react'

// React Testing Library cleanup
afterEach(() => {
  cleanup()
})

// Mock Next.js router
vi.mock('next/navigation', () => ({
  useRouter: () => ({
    push: vi.fn(),
    replace: vi.fn(),
    prefetch: vi.fn(),
    back: vi.fn(),
    forward: vi.fn(),
  }),
  usePathname: () => '/',
  useSearchParams: () => new URLSearchParams(),
}))

// Mock next-auth
vi.mock('next-auth/react', () => ({
  useSession: vi.fn(() => ({
    data: null,
    status: 'unauthenticated',
  })),
  signIn: vi.fn(),
  signOut: vi.fn(),
  getSession: vi.fn(),
}))

// Mock environment variables
process.env.MONGODB_URI = 'mongodb://localhost:27017/thinkus-test'
process.env.NEXTAUTH_SECRET = 'test-secret'
process.env.NEXTAUTH_URL = 'http://localhost:3000'

// Global test utilities
declare global {
  // eslint-disable-next-line no-var
  var testUtils: {
    createMockUser: (overrides?: Record<string, unknown>) => Record<string, unknown>
    createMockProject: (overrides?: Record<string, unknown>) => Record<string, unknown>
    createMockSession: (overrides?: Record<string, unknown>) => Record<string, unknown>
  }
}

globalThis.testUtils = {
  createMockUser: (overrides = {}) => ({
    _id: 'user-123',
    email: 'test@example.com',
    name: 'Test User',
    image: null,
    ...overrides,
  }),
  createMockProject: (overrides = {}) => ({
    _id: 'project-123',
    name: 'Test Project',
    description: 'Test description',
    userId: 'user-123',
    phase: 'ideation',
    status: 'active',
    ...overrides,
  }),
  createMockSession: (overrides = {}) => ({
    user: {
      id: 'user-123',
      email: 'test@example.com',
      name: 'Test User',
    },
    expires: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
    ...overrides,
  }),
}
