import {
  getPineconeIndex,
  generateNamespace,
  type MemoryType,
  type MemoryMetadata,
} from './pinecone'
import { generateEmbedding, generateEmbeddings } from './embedding'
import { type AgentId } from '@/lib/config/executives'

/**
 * 记忆条目
 */
export interface MemoryEntry {
  id: string
  content: string
  summary?: string
  type: MemoryType
  importance: number
  metadata: {
    userId: string
    agentId?: AgentId
    projectId?: string
    discussionId?: string
  }
  createdAt: Date
  score?: number  // 检索时的相似度分数
}

/**
 * 存储记忆
 */
export async function storeMemory(params: {
  content: string
  summary?: string
  type: MemoryType
  importance?: number
  userId: string
  agentId?: AgentId
  projectId?: string
  discussionId?: string
}): Promise<string> {
  const {
    content,
    summary,
    type,
    importance = 5,
    userId,
    agentId,
    projectId,
    discussionId,
  } = params

  // 生成向量
  const textToEmbed = summary || content
  const embedding = await generateEmbedding(textToEmbed)

  // 生成唯一ID
  const id = `mem_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`

  // 确定命名空间
  const namespace = generateNamespace({
    userId,
    agentId,
    projectId: !agentId ? projectId : undefined,
  })

  // 构建元数据
  const metadata: MemoryMetadata = {
    type,
    userId,
    agentId,
    projectId,
    discussionId,
    content,
    summary,
    importance,
    createdAt: new Date().toISOString(),
  }

  // 存储到Pinecone
  const index = getPineconeIndex()
  await index.namespace(namespace).upsert([
    {
      id,
      values: embedding,
      metadata: metadata as unknown as Record<string, string | number | boolean | string[]>,
    },
  ])

  return id
}

/**
 * 批量存储记忆
 */
export async function storeMemories(
  memories: Array<{
    content: string
    summary?: string
    type: MemoryType
    importance?: number
    userId: string
    agentId?: AgentId
    projectId?: string
    discussionId?: string
  }>
): Promise<string[]> {
  if (memories.length === 0) return []

  // 生成所有向量
  const textsToEmbed = memories.map(m => m.summary || m.content)
  const embeddings = await generateEmbeddings(textsToEmbed)

  // 按命名空间分组
  const namespaceGroups: Record<
    string,
    Array<{
      id: string
      values: number[]
      metadata: Record<string, string | number | boolean | string[]>
    }>
  > = {}

  const ids: string[] = []

  memories.forEach((memory, index) => {
    const id = `mem_${Date.now()}_${index}_${Math.random().toString(36).substring(2, 9)}`
    ids.push(id)

    const namespace = generateNamespace({
      userId: memory.userId,
      agentId: memory.agentId,
      projectId: !memory.agentId ? memory.projectId : undefined,
    })

    const metadata: MemoryMetadata = {
      type: memory.type,
      userId: memory.userId,
      agentId: memory.agentId,
      projectId: memory.projectId,
      discussionId: memory.discussionId,
      content: memory.content,
      summary: memory.summary,
      importance: memory.importance || 5,
      createdAt: new Date().toISOString(),
    }

    if (!namespaceGroups[namespace]) {
      namespaceGroups[namespace] = []
    }

    namespaceGroups[namespace].push({
      id,
      values: embeddings[index],
      metadata: metadata as unknown as Record<string, string | number | boolean | string[]>,
    })
  })

  // 按命名空间批量存储
  const index = getPineconeIndex()
  await Promise.all(
    Object.entries(namespaceGroups).map(([namespace, records]) =>
      index.namespace(namespace).upsert(records)
    )
  )

  return ids
}

/**
 * 检索相关记忆
 */
export async function retrieveMemories(params: {
  query: string
  userId: string
  agentId?: AgentId
  projectId?: string
  type?: MemoryType
  topK?: number
  minScore?: number
}): Promise<MemoryEntry[]> {
  const {
    query,
    userId,
    agentId,
    projectId,
    type,
    topK = 10,
    minScore = 0.7,
  } = params

  // 生成查询向量
  const queryEmbedding = await generateEmbedding(query)

  // 确定命名空间
  const namespace = generateNamespace({
    userId,
    agentId,
    projectId: !agentId ? projectId : undefined,
  })

  // 构建过滤条件
  const filter: Record<string, string | number> = {}
  if (type) {
    filter.type = type
  }

  // 查询Pinecone
  const index = getPineconeIndex()
  const results = await index.namespace(namespace).query({
    vector: queryEmbedding,
    topK,
    includeMetadata: true,
    filter: Object.keys(filter).length > 0 ? filter : undefined,
  })

  // 转换结果
  const memories: MemoryEntry[] = []

  for (const match of results.matches || []) {
    if (match.score && match.score < minScore) continue

    const metadata = match.metadata as unknown as MemoryMetadata

    memories.push({
      id: match.id,
      content: metadata.content,
      summary: metadata.summary,
      type: metadata.type,
      importance: metadata.importance,
      metadata: {
        userId: metadata.userId,
        agentId: metadata.agentId as AgentId | undefined,
        projectId: metadata.projectId,
        discussionId: metadata.discussionId,
      },
      createdAt: new Date(metadata.createdAt),
      score: match.score,
    })
  }

  return memories
}

/**
 * 检索用户偏好记忆（跨高管）
 */
export async function retrieveUserPreferences(params: {
  userId: string
  query?: string
  topK?: number
}): Promise<MemoryEntry[]> {
  const { userId, query, topK = 20 } = params

  // 如果没有查询，使用通用偏好查询
  const searchQuery = query || '用户偏好 沟通风格 关注领域 决策方式'

  // 生成查询向量
  const queryEmbedding = await generateEmbedding(searchQuery)

  // 查询用户级命名空间
  const namespace = generateNamespace({ userId })

  const index = getPineconeIndex()
  const results = await index.namespace(namespace).query({
    vector: queryEmbedding,
    topK,
    includeMetadata: true,
    filter: { type: 'user_preference' },
  })

  // 转换结果
  const preferences: MemoryEntry[] = []

  for (const match of results.matches || []) {
    const metadata = match.metadata as unknown as MemoryMetadata

    preferences.push({
      id: match.id,
      content: metadata.content,
      summary: metadata.summary,
      type: metadata.type,
      importance: metadata.importance,
      metadata: {
        userId: metadata.userId,
        agentId: metadata.agentId as AgentId | undefined,
        projectId: metadata.projectId,
        discussionId: metadata.discussionId,
      },
      createdAt: new Date(metadata.createdAt),
      score: match.score,
    })
  }

  return preferences
}

/**
 * 删除记忆
 */
export async function deleteMemory(params: {
  id: string
  userId: string
  agentId?: AgentId
  projectId?: string
}): Promise<void> {
  const { id, userId, agentId, projectId } = params

  const namespace = generateNamespace({
    userId,
    agentId,
    projectId: !agentId ? projectId : undefined,
  })

  const index = getPineconeIndex()
  await index.namespace(namespace).deleteOne(id)
}

/**
 * 删除用户所有记忆
 */
export async function deleteUserMemories(userId: string): Promise<void> {
  const index = getPineconeIndex()
  const namespace = generateNamespace({ userId })
  await index.namespace(namespace).deleteAll()
}

/**
 * 格式化记忆为上下文文本
 */
export function formatMemoriesAsContext(memories: MemoryEntry[]): string {
  if (memories.length === 0) return ''

  const lines: string[] = ['## 相关记忆']

  // 按重要性和相似度排序
  const sorted = [...memories].sort((a, b) => {
    const scoreA = (a.score || 0) * a.importance
    const scoreB = (b.score || 0) * b.importance
    return scoreB - scoreA
  })

  for (const memory of sorted.slice(0, 5)) {
    const content = memory.summary || memory.content
    const date = memory.createdAt.toLocaleDateString('zh-CN')
    lines.push(`- [${date}] ${content}`)
  }

  return lines.join('\n')
}
