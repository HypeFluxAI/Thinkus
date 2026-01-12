import { Pinecone } from '@pinecone-database/pinecone'

// Pinecone客户端单例
let pineconeClient: Pinecone | null = null

/**
 * 获取Pinecone客户端
 */
export function getPineconeClient(): Pinecone {
  if (!pineconeClient) {
    if (!process.env.PINECONE_API_KEY) {
      throw new Error('PINECONE_API_KEY environment variable is not set')
    }

    pineconeClient = new Pinecone({
      apiKey: process.env.PINECONE_API_KEY,
    })
  }

  return pineconeClient
}

// 索引名称
export const PINECONE_INDEX_NAME = process.env.PINECONE_INDEX_NAME || 'thinkus'

// 向量维度 (OpenAI text-embedding-3-small)
export const VECTOR_DIMENSION = 1536

/**
 * 获取Pinecone索引
 */
export function getPineconeIndex() {
  const client = getPineconeClient()
  return client.index(PINECONE_INDEX_NAME)
}

/**
 * 生成命名空间
 * 格式: user_{userId}_{agentId} 或 user_{userId}_project_{projectId}
 */
export function generateNamespace(params: {
  userId: string
  agentId?: string
  projectId?: string
}): string {
  const { userId, agentId, projectId } = params

  if (agentId) {
    return `user_${userId}_agent_${agentId}`
  }

  if (projectId) {
    return `user_${userId}_project_${projectId}`
  }

  return `user_${userId}`
}

/**
 * 记忆类型
 */
export type MemoryType =
  | 'user_preference'     // 用户偏好
  | 'project_context'     // 项目上下文
  | 'discussion_insight'  // 讨论洞察
  | 'decision'            // 决策记录
  | 'feedback'            // 用户反馈

/**
 * 记忆元数据
 */
export interface MemoryMetadata {
  type: MemoryType
  userId: string
  agentId?: string
  projectId?: string
  discussionId?: string
  content: string
  summary?: string
  importance: number  // 1-10
  createdAt: string
  expiresAt?: string
}

/**
 * 向量记录
 */
export interface VectorRecord {
  id: string
  values: number[]
  metadata: MemoryMetadata
}
