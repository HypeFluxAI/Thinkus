/**
 * AI Engine Microservice Client
 * Connects to the py-ai-engine service
 */

const AI_ENGINE_URL = process.env.AI_ENGINE_URL || 'http://localhost:8016'

export interface AIEmployee {
  id: string
  name: string
  title: string
  department: string
  avatar: string
  description: string
  capabilities: string[]
  specialties: string[]
  personality: string
  is_available: boolean
}

export interface ChatRequest {
  employee_id: string
  project_id: string
  user_id: string
  message: string
  context?: Array<{ role: string; content: string }>
  metadata?: Record<string, string>
}

export interface ChatResponse {
  employee_id: string
  message: string
  suggestions: string[]
  artifacts: Array<Record<string, unknown>>
  confidence: number
  tokens_used: number
}

/**
 * Check if the AI Engine service is healthy
 */
export async function checkHealth(): Promise<{ status: string; employees_loaded: number }> {
  const response = await fetch(`${AI_ENGINE_URL}/health`, {
    method: 'GET',
    headers: { 'Content-Type': 'application/json' },
  })

  if (!response.ok) {
    throw new Error(`AI Engine health check failed: ${response.statusText}`)
  }

  return response.json()
}

/**
 * List all available AI employees
 */
export async function listEmployees(): Promise<AIEmployee[]> {
  const response = await fetch(`${AI_ENGINE_URL}/api/v1/employees`, {
    method: 'GET',
    headers: { 'Content-Type': 'application/json' },
  })

  if (!response.ok) {
    throw new Error(`Failed to list employees: ${response.statusText}`)
  }

  return response.json()
}

/**
 * Get a specific AI employee by ID
 */
export async function getEmployee(employeeId: string): Promise<AIEmployee> {
  const response = await fetch(`${AI_ENGINE_URL}/api/v1/employees/${employeeId}`, {
    method: 'GET',
    headers: { 'Content-Type': 'application/json' },
  })

  if (!response.ok) {
    throw new Error(`Failed to get employee ${employeeId}: ${response.statusText}`)
  }

  return response.json()
}

/**
 * Chat with an AI employee (non-streaming)
 */
export async function chat(request: ChatRequest): Promise<ChatResponse> {
  const response = await fetch(`${AI_ENGINE_URL}/api/v1/chat`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(request),
  })

  if (!response.ok) {
    const error = await response.text()
    throw new Error(`Chat failed: ${error}`)
  }

  return response.json()
}

/**
 * Chat with an AI employee (streaming)
 * Returns a ReadableStream that emits SSE events
 */
export async function chatStream(request: ChatRequest): Promise<ReadableStream<Uint8Array>> {
  const response = await fetch(`${AI_ENGINE_URL}/api/v1/chat/stream`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(request),
  })

  if (!response.ok) {
    const error = await response.text()
    throw new Error(`Stream chat failed: ${error}`)
  }

  if (!response.body) {
    throw new Error('No response body')
  }

  return response.body
}

/**
 * Map existing executive ID to py-ai-engine employee ID
 */
export function mapExecutiveToEmployee(agentId: string): string | null {
  const mapping: Record<string, string> = {
    'mike': 'mike_pm',
    'david': 'david_tech',
    'elena': 'elena_ux',
    'kevin': 'kevin_qa',
    // Add more mappings as employees are added to py-ai-engine
  }
  return mapping[agentId] || null
}

/**
 * Check if an executive can be handled by py-ai-engine
 */
export function canUseMicroservice(agentId: string): boolean {
  return mapExecutiveToEmployee(agentId) !== null
}

// ============ Memory System API ============

export interface MemoryItem {
  memory_id: string
  owner_id: string
  employee_id: string
  project_id: string
  type: string
  tier: string
  content: string
  summary: string
  keywords: string[]
  confidence: number
  status: string
  access_count: number
  created_at: string
  last_seen: string
}

export interface MemoryStats {
  total: number
  by_tier: Record<string, number>
  by_type: Record<string, number>
  total_tokens: number
}

export interface MemoryListResponse {
  memories: MemoryItem[]
  total: number
  stats: MemoryStats
}

export interface MemorySearchRequest {
  query: string
  employee_id: string
  project_id: string
  tenant_id?: string
  filters?: {
    tier?: string[]
    type?: string[]
    date_range?: { start: string; end: string }
  }
  limit?: number
}

/**
 * List memories for an employee
 */
export async function listMemories(
  employeeId: string,
  params?: {
    projectId?: string
    tier?: string
    type?: string
    limit?: number
    tenantId?: string
  }
): Promise<MemoryListResponse> {
  const searchParams = new URLSearchParams()
  if (params?.projectId) searchParams.set('project_id', params.projectId)
  if (params?.tier) searchParams.set('tier', params.tier)
  if (params?.type) searchParams.set('type', params.type)
  if (params?.limit) searchParams.set('limit', params.limit.toString())
  if (params?.tenantId) searchParams.set('tenant_id', params.tenantId)

  const url = `${AI_ENGINE_URL}/api/v1/memory/${employeeId}${searchParams.toString() ? '?' + searchParams : ''}`
  const response = await fetch(url, {
    method: 'GET',
    headers: { 'Content-Type': 'application/json' },
  })

  if (!response.ok) {
    throw new Error(`Failed to list memories: ${response.statusText}`)
  }

  return response.json()
}

/**
 * Search memories
 */
export async function searchMemories(request: MemorySearchRequest): Promise<MemoryListResponse> {
  const response = await fetch(`${AI_ENGINE_URL}/api/v1/memory/search`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(request),
  })

  if (!response.ok) {
    throw new Error(`Memory search failed: ${response.statusText}`)
  }

  return response.json()
}

/**
 * Delete a memory
 */
export async function deleteMemory(
  employeeId: string,
  memoryId: string,
  tenantId?: string
): Promise<{ success: boolean }> {
  const params = new URLSearchParams()
  if (tenantId) params.set('tenant_id', tenantId)
  const url = `${AI_ENGINE_URL}/api/v1/memory/${employeeId}/${memoryId}${params.toString() ? '?' + params : ''}`
  const response = await fetch(url, {
    method: 'DELETE',
    headers: { 'Content-Type': 'application/json' },
  })

  if (!response.ok) {
    throw new Error(`Failed to delete memory: ${response.statusText}`)
  }

  return response.json()
}

/**
 * Export memories
 */
export async function exportMemories(
  employeeId: string,
  format: 'json' | 'csv' = 'json',
  projectId?: string,
  tenantId?: string
): Promise<Blob> {
  const searchParams = new URLSearchParams()
  searchParams.set('format', format)
  if (projectId) searchParams.set('project_id', projectId)
  if (tenantId) searchParams.set('tenant_id', tenantId)

  const response = await fetch(
    `${AI_ENGINE_URL}/api/v1/memory/${employeeId}/export?${searchParams}`,
    {
      method: 'GET',
      headers: { Accept: format === 'json' ? 'application/json' : 'text/csv' },
    }
  )

  if (!response.ok) {
    throw new Error(`Failed to export memories: ${response.statusText}`)
  }

  return response.blob()
}

/**
 * Get memory stats
 */
export async function getMemoryStats(employeeId: string, projectId?: string, tenantId?: string): Promise<MemoryStats> {
  const searchParams = new URLSearchParams()
  if (projectId) searchParams.set('project_id', projectId)
  if (tenantId) searchParams.set('tenant_id', tenantId)

  const url = `${AI_ENGINE_URL}/api/v1/memory/${employeeId}/stats${searchParams.toString() ? '?' + searchParams : ''}`
  const response = await fetch(url, {
    method: 'GET',
    headers: { 'Content-Type': 'application/json' },
  })

  if (!response.ok) {
    throw new Error(`Failed to get memory stats: ${response.statusText}`)
  }

  return response.json()
}

/**
 * Trigger memory maintenance
 */
export async function runMemoryMaintenance(
  employeeId: string,
  projectId?: string,
  tenantId?: string
): Promise<{ success: boolean; results: Record<string, unknown> }> {
  const params = new URLSearchParams()
  if (tenantId) params.set('tenant_id', tenantId)
  const url = `${AI_ENGINE_URL}/api/v1/memory/${employeeId}/maintenance${params.toString() ? '?' + params : ''}`
  const response = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ project_id: projectId }),
  })

  if (!response.ok) {
    throw new Error(`Failed to run maintenance: ${response.statusText}`)
  }

  return response.json()
}

/**
 * Update memory tier
 */
export async function updateMemoryTier(
  employeeId: string,
  memoryId: string,
  newTier: string,
  tenantId?: string
): Promise<{ success: boolean }> {
  const params = new URLSearchParams()
  if (tenantId) params.set('tenant_id', tenantId)
  const url = `${AI_ENGINE_URL}/api/v1/memory/${employeeId}/${memoryId}/tier${params.toString() ? '?' + params : ''}`
  const response = await fetch(url, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ tier: newTier }),
  })

  if (!response.ok) {
    throw new Error(`Failed to update memory tier: ${response.statusText}`)
  }

  return response.json()
}
