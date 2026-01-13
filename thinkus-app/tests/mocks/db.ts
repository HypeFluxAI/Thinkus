import { vi } from 'vitest'

// Mock MongoDB connection
export const mockConnectDB = vi.fn().mockResolvedValue(undefined)

// Mock Mongoose models
export const createMockModel = <T>(defaultData: Partial<T> = {}) => {
  const mockDoc = {
    ...defaultData,
    _id: 'mock-id',
    save: vi.fn().mockResolvedValue(defaultData),
    toJSON: vi.fn().mockReturnValue(defaultData),
    toObject: vi.fn().mockReturnValue(defaultData),
  }

  return {
    find: vi.fn().mockReturnValue({
      sort: vi.fn().mockReturnThis(),
      skip: vi.fn().mockReturnThis(),
      limit: vi.fn().mockReturnThis(),
      lean: vi.fn().mockResolvedValue([]),
      exec: vi.fn().mockResolvedValue([]),
    }),
    findOne: vi.fn().mockResolvedValue(null),
    findById: vi.fn().mockResolvedValue(null),
    findByIdAndUpdate: vi.fn().mockResolvedValue(null),
    findByIdAndDelete: vi.fn().mockResolvedValue(null),
    findOneAndUpdate: vi.fn().mockResolvedValue(null),
    create: vi.fn().mockResolvedValue(mockDoc),
    countDocuments: vi.fn().mockResolvedValue(0),
    updateMany: vi.fn().mockResolvedValue({ modifiedCount: 0 }),
    deleteMany: vi.fn().mockResolvedValue({ deletedCount: 0 }),
    aggregate: vi.fn().mockResolvedValue([]),
  }
}

// Mock specific models
export const mockUser = createMockModel({
  email: 'test@example.com',
  name: 'Test User',
})

export const mockProject = createMockModel({
  name: 'Test Project',
  userId: 'user-123',
})

export const mockSubscription = createMockModel({
  userId: 'user-123',
  plan: 'free',
  status: 'active',
})

export const mockDiscussion = createMockModel({
  projectId: 'project-123',
  topic: 'Test Discussion',
})
