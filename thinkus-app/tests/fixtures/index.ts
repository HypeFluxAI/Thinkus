// Test fixtures for consistent test data

export const testUsers = {
  freeUser: {
    id: 'user-free-123',
    email: 'free@example.com',
    name: 'Free User',
    plan: 'free' as const,
  },
  starterUser: {
    id: 'user-starter-123',
    email: 'starter@example.com',
    name: 'Starter User',
    plan: 'starter' as const,
  },
  proUser: {
    id: 'user-pro-123',
    email: 'pro@example.com',
    name: 'Pro User',
    plan: 'professional' as const,
  },
  enterpriseUser: {
    id: 'user-enterprise-123',
    email: 'enterprise@example.com',
    name: 'Enterprise User',
    plan: 'enterprise' as const,
  },
}

export const testProjects = {
  ideationProject: {
    id: 'project-ideation-123',
    name: 'Ideation Project',
    description: 'A project in ideation phase',
    phase: 'ideation' as const,
    status: 'active' as const,
  },
  validationProject: {
    id: 'project-validation-123',
    name: 'Validation Project',
    description: 'A project in validation phase',
    phase: 'validation' as const,
    status: 'active' as const,
  },
  developmentProject: {
    id: 'project-dev-123',
    name: 'Development Project',
    description: 'A project in development phase',
    phase: 'development' as const,
    status: 'active' as const,
  },
}

export const testSubscriptions = {
  freeSubscription: {
    id: 'sub-free-123',
    plan: 'free' as const,
    status: 'active' as const,
    billingCycle: 'monthly' as const,
    usage: {
      projectsCreated: 0,
      discussionsThisMonth: 0,
      messagesThisDay: 0,
    },
  },
  starterSubscription: {
    id: 'sub-starter-123',
    plan: 'starter' as const,
    status: 'active' as const,
    billingCycle: 'monthly' as const,
    stripeSubscriptionId: 'sub_stripe_123',
    usage: {
      projectsCreated: 2,
      discussionsThisMonth: 10,
      messagesThisDay: 50,
    },
  },
}

export const testDiscussions = {
  multiAgentDiscussion: {
    id: 'disc-multi-123',
    topic: 'Business Strategy Discussion',
    type: 'multi-agent' as const,
    participants: ['ceo', 'cto', 'cfo'],
    status: 'active' as const,
  },
  singleAgentDiscussion: {
    id: 'disc-single-123',
    topic: 'Technical Review',
    type: 'single-agent' as const,
    participants: ['cto'],
    status: 'completed' as const,
  },
}

export const testDecisions = {
  l0Decision: {
    id: 'dec-l0-123',
    title: 'Auto-approve minor change',
    level: 'L0_AUTONOMOUS' as const,
    status: 'pending' as const,
    proposedAction: 'Update documentation',
  },
  l2Decision: {
    id: 'dec-l2-123',
    title: 'Major feature approval',
    level: 'L2_CONFIRM' as const,
    status: 'pending' as const,
    proposedAction: 'Implement new payment gateway',
  },
}

// Helper to create session mock
export function createSession(user: typeof testUsers.freeUser) {
  return {
    user: {
      id: user.id,
      email: user.email,
      name: user.name,
    },
    expires: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
  }
}

// Helper to create API response mock
export function createApiResponse<T>(data: T, success = true) {
  return {
    success,
    ...data,
  }
}

// Helper to create error response mock
export function createErrorResponse(error: string, status = 400) {
  return {
    error,
    status,
  }
}
