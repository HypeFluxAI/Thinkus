/**
 * AI Engine gRPC Client
 * Communicates with the py-ai-engine service for AI employee functionality
 */

import * as grpc from '@grpc/grpc-js'
import * as protoLoader from '@grpc/proto-loader'
import path from 'path'

// Service URL
export const AI_ENGINE_URL = process.env.GRPC_AI_ENGINE_URL || 'localhost:50054'
const PROTO_DIR = path.join(process.cwd(), '..', 'services', 'proto')

// Types
export interface Message {
  role: string
  content: string
  employeeId?: string
  timestamp?: number
}

export interface Artifact {
  type: string      // code, diagram, document, checklist
  title: string
  content: string
  language?: string
}

export interface ChatRequest {
  employeeId: string
  projectId: string
  userId: string
  message: string
  context?: Message[]
  metadata?: Record<string, string>
}

export interface ChatResponse {
  employeeId: string
  message: string
  suggestions: string[]
  artifacts: Artifact[]
  confidence: number
  tokensUsed: number
}

export interface Employee {
  id: string
  name: string
  title: string
  department: string
  avatar: string
  description: string
  capabilities: string[]
  specialties: string[]
  personality: string
  isAvailable: boolean
}

export interface Discussion {
  id: string
  projectId: string
  topic: string
  participantIds: string[]
  messages: DiscussionMessage[]
  status: string
  createdAt: number
  updatedAt: number
}

export interface DiscussionMessage {
  id: string
  employeeId: string
  employeeName: string
  content: string
  artifacts: Artifact[]
  timestamp: number
}

// Client singleton
let aiEmployeeClient: any = null

/**
 * Get or create AI Employee service client
 */
function getAIEmployeeClient(): any {
  if (aiEmployeeClient) return aiEmployeeClient

  const protoPath = path.join(PROTO_DIR, 'ai-employee.proto')
  const packageDefinition = protoLoader.loadSync(protoPath, {
    keepCase: true,
    longs: String,
    enums: String,
    defaults: true,
    oneofs: true,
    includeDirs: [PROTO_DIR],
  })

  const proto = grpc.loadPackageDefinition(packageDefinition) as any
  aiEmployeeClient = new proto.thinkus.aiemployee.AIEmployeeService(
    AI_ENGINE_URL,
    grpc.credentials.createInsecure()
  )

  return aiEmployeeClient
}

/**
 * Chat with an AI employee
 */
export async function chat(request: ChatRequest): Promise<ChatResponse> {
  const client = getAIEmployeeClient()

  return new Promise((resolve, reject) => {
    client.Chat(
      {
        employee_id: request.employeeId,
        project_id: request.projectId,
        user_id: request.userId,
        message: request.message,
        context: (request.context || []).map(m => ({
          role: m.role,
          content: m.content,
          employee_id: m.employeeId || '',
          timestamp: m.timestamp || Date.now()
        })),
        metadata: request.metadata || {}
      },
      (error: grpc.ServiceError | null, response: any) => {
        if (error) {
          reject(error)
        } else {
          resolve({
            employeeId: response.employee_id,
            message: response.message,
            suggestions: response.suggestions || [],
            artifacts: (response.artifacts || []).map((a: any) => ({
              type: a.type,
              title: a.title,
              content: a.content,
              language: a.language
            })),
            confidence: response.confidence,
            tokensUsed: response.tokens_used
          })
        }
      }
    )
  })
}

/**
 * Chat with streaming response
 */
export function chatStream(
  request: ChatRequest,
  onChunk: (content: string) => void,
  onError?: (error: Error) => void,
  onEnd?: () => void
): () => void {
  const client = getAIEmployeeClient()

  const stream = client.ChatStream({
    employee_id: request.employeeId,
    project_id: request.projectId,
    user_id: request.userId,
    message: request.message,
    context: (request.context || []).map(m => ({
      role: m.role,
      content: m.content,
      employee_id: m.employeeId || '',
      timestamp: m.timestamp || Date.now()
    })),
    metadata: request.metadata || {}
  })

  stream.on('data', (chunk: any) => {
    if (!chunk.is_done) {
      onChunk(chunk.content)
    }
  })

  stream.on('error', (error: Error) => {
    if (onError) onError(error)
  })

  stream.on('end', () => {
    if (onEnd) onEnd()
  })

  // Return cancel function
  return () => {
    stream.cancel()
  }
}

/**
 * Get employee by ID
 */
export async function getEmployee(employeeId: string): Promise<Employee> {
  const client = getAIEmployeeClient()

  return new Promise((resolve, reject) => {
    client.GetEmployee(
      { employee_id: employeeId },
      (error: grpc.ServiceError | null, response: any) => {
        if (error) {
          reject(error)
        } else {
          resolve({
            id: response.id,
            name: response.name,
            title: response.title,
            department: response.department,
            avatar: response.avatar,
            description: response.description,
            capabilities: response.capabilities || [],
            specialties: response.specialties || [],
            personality: response.personality,
            isAvailable: response.is_available
          })
        }
      }
    )
  })
}

/**
 * List all employees
 */
export async function listEmployees(department?: string): Promise<Employee[]> {
  const client = getAIEmployeeClient()

  return new Promise((resolve, reject) => {
    client.ListEmployees(
      { department },
      (error: grpc.ServiceError | null, response: any) => {
        if (error) {
          reject(error)
        } else {
          resolve(
            (response.employees || []).map((e: any) => ({
              id: e.id,
              name: e.name,
              title: e.title,
              department: e.department,
              avatar: e.avatar,
              description: e.description,
              capabilities: e.capabilities || [],
              specialties: e.specialties || [],
              personality: e.personality,
              isAvailable: e.is_available
            }))
          )
        }
      }
    )
  })
}

/**
 * Start a discussion with multiple employees
 */
export async function startDiscussion(
  projectId: string,
  userId: string,
  topic: string,
  employeeIds: string[],
  initialMessage: string
): Promise<Discussion> {
  const client = getAIEmployeeClient()

  return new Promise((resolve, reject) => {
    client.StartDiscussion(
      {
        project_id: projectId,
        user_id: userId,
        topic,
        employee_ids: employeeIds,
        initial_message: initialMessage
      },
      (error: grpc.ServiceError | null, response: any) => {
        if (error) {
          reject(error)
        } else {
          const discussion = response.discussion
          resolve({
            id: discussion.id,
            projectId: discussion.project_id,
            topic: discussion.topic,
            participantIds: discussion.participant_ids || [],
            messages: (discussion.messages || []).map((m: any) => ({
              id: m.id,
              employeeId: m.employee_id,
              employeeName: m.employee_name,
              content: m.content,
              artifacts: (m.artifacts || []).map((a: any) => ({
                type: a.type,
                title: a.title,
                content: a.content,
                language: a.language
              })),
              timestamp: m.timestamp
            })),
            status: discussion.status,
            createdAt: discussion.created_at,
            updatedAt: discussion.updated_at
          })
        }
      }
    )
  })
}

/**
 * Add message to discussion
 */
export async function addToDiscussion(
  discussionId: string,
  message: string,
  targetEmployeeId?: string
): Promise<{ discussion: Discussion; newMessages: DiscussionMessage[] }> {
  const client = getAIEmployeeClient()

  return new Promise((resolve, reject) => {
    client.AddToDiscussion(
      {
        discussion_id: discussionId,
        message,
        target_employee_id: targetEmployeeId
      },
      (error: grpc.ServiceError | null, response: any) => {
        if (error) {
          reject(error)
        } else {
          const discussion = response.discussion
          resolve({
            discussion: {
              id: discussion.id,
              projectId: discussion.project_id,
              topic: discussion.topic,
              participantIds: discussion.participant_ids || [],
              messages: (discussion.messages || []).map((m: any) => ({
                id: m.id,
                employeeId: m.employee_id,
                employeeName: m.employee_name,
                content: m.content,
                artifacts: (m.artifacts || []).map((a: any) => ({
                  type: a.type,
                  title: a.title,
                  content: a.content,
                  language: a.language
                })),
                timestamp: m.timestamp
              })),
              status: discussion.status,
              createdAt: discussion.created_at,
              updatedAt: discussion.updated_at
            },
            newMessages: (response.new_messages || []).map((m: any) => ({
              id: m.id,
              employeeId: m.employee_id,
              employeeName: m.employee_name,
              content: m.content,
              artifacts: (m.artifacts || []).map((a: any) => ({
                type: a.type,
                title: a.title,
                content: a.content,
                language: a.language
              })),
              timestamp: m.timestamp
            }))
          })
        }
      }
    )
  })
}

/**
 * Get discussion by ID
 */
export async function getDiscussion(discussionId: string): Promise<Discussion> {
  const client = getAIEmployeeClient()

  return new Promise((resolve, reject) => {
    client.GetDiscussion(
      { discussion_id: discussionId },
      (error: grpc.ServiceError | null, response: any) => {
        if (error) {
          reject(error)
        } else {
          resolve({
            id: response.id,
            projectId: response.project_id,
            topic: response.topic,
            participantIds: response.participant_ids || [],
            messages: (response.messages || []).map((m: any) => ({
              id: m.id,
              employeeId: m.employee_id,
              employeeName: m.employee_name,
              content: m.content,
              artifacts: (m.artifacts || []).map((a: any) => ({
                type: a.type,
                title: a.title,
                content: a.content,
                language: a.language
              })),
              timestamp: m.timestamp
            })),
            status: response.status,
            createdAt: response.created_at,
            updatedAt: response.updated_at
          })
        }
      }
    )
  })
}

/**
 * Close client connection
 */
export function close(): void {
  if (aiEmployeeClient) {
    aiEmployeeClient.close()
    aiEmployeeClient = null
  }
}
