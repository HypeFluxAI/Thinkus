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
