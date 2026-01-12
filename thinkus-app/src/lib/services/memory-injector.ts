import mongoose from 'mongoose'
import { type AgentId } from '@/lib/config/executives'
import { UserExecutive, Memory } from '@/lib/db/models'
import {
  retrieveMemories,
  retrieveUserPreferences,
  formatMemoriesAsContext,
  type MemoryEntry,
} from '@/lib/vector/memory-service'
import type { MemoryType } from '@/lib/vector/pinecone'

/**
 * 对话上下文增强结果
 */
export interface EnhancedContext {
  // 用户偏好描述
  userPreferences?: string
  // 相关记忆上下文
  relevantMemories?: string
  // 项目历史上下文
  projectHistory?: string
  // 完整增强提示
  fullEnhancement: string
}

/**
 * 获取用户偏好上下文
 */
export async function getUserPreferencesContext(
  userId: mongoose.Types.ObjectId,
  agentId: AgentId
): Promise<string | undefined> {
  const userExecutive = await UserExecutive.findOne({ userId, agentId })
  if (!userExecutive?.learnedPreferences) return undefined

  const prefs = userExecutive.learnedPreferences
  const parts: string[] = []

  if (prefs.communicationStyle) {
    const styleMap: Record<string, string> = {
      formal: '正式、专业',
      casual: '轻松、随意',
      concise: '简洁、直接',
      detailed: '详细、全面',
    }
    parts.push(`沟通风格偏好: ${styleMap[prefs.communicationStyle] || prefs.communicationStyle}`)
  }

  if (prefs.decisionStyle) {
    const styleMap: Record<string, string> = {
      fast: '快速决策',
      careful: '谨慎分析',
      'data-driven': '数据驱动',
    }
    parts.push(`决策风格: ${styleMap[prefs.decisionStyle] || prefs.decisionStyle}`)
  }

  if (prefs.focusAreas && prefs.focusAreas.length > 0) {
    parts.push(`关注领域: ${prefs.focusAreas.join('、')}`)
  }

  if (prefs.dislikes && prefs.dislikes.length > 0) {
    parts.push(`避免提及: ${prefs.dislikes.join('、')}`)
  }

  if (prefs.customInstructions) {
    parts.push(`特别说明: ${prefs.customInstructions}`)
  }

  if (parts.length === 0) return undefined

  return `## 用户偏好\n${parts.join('\n')}`
}

/**
 * 获取相关记忆上下文
 */
export async function getRelevantMemoriesContext(params: {
  query: string
  userId: string
  agentId?: AgentId
  projectId?: string
  types?: MemoryType[]
  topK?: number
}): Promise<string | undefined> {
  const { query, userId, agentId, projectId, types, topK = 5 } = params

  try {
    // 检索相关记忆
    const memories: MemoryEntry[] = []

    // 1. 先检索用户级记忆（偏好）
    const userMemories = await retrieveUserPreferences({
      userId,
      query,
      topK: 3,
    })
    memories.push(...userMemories)

    // 2. 检索项目级记忆
    if (projectId) {
      const projectMemories = await retrieveMemories({
        query,
        userId,
        projectId,
        topK: 5,
      })
      memories.push(...projectMemories)
    }

    // 3. 检索高管级记忆
    if (agentId) {
      const agentMemories = await retrieveMemories({
        query,
        userId,
        agentId,
        topK: 3,
      })
      memories.push(...agentMemories)
    }

    if (memories.length === 0) return undefined

    // 去重并格式化
    const uniqueMemories = Array.from(
      new Map(memories.map(m => [m.id, m])).values()
    )

    // 增加访问计数
    for (const memory of uniqueMemories) {
      await Memory.incrementAccessCount(memory.id)
    }

    return formatMemoriesAsContext(uniqueMemories)
  } catch (error) {
    console.error('Failed to retrieve memories:', error)
    return undefined
  }
}

/**
 * 获取项目历史上下文
 */
export async function getProjectHistoryContext(params: {
  userId: mongoose.Types.ObjectId
  projectId: mongoose.Types.ObjectId
  limit?: number
}): Promise<string | undefined> {
  const { userId, projectId, limit = 10 } = params

  try {
    const memories = await Memory.getUserMemories(userId, {
      projectId,
      layer: 'project',
      limit,
    })

    if (memories.length === 0) return undefined

    const lines: string[] = ['## 项目历史']

    for (const memory of memories) {
      const date = memory.createdAt.toLocaleDateString('zh-CN')
      const content = memory.summary || memory.content.slice(0, 100)
      lines.push(`- [${date}] ${content}`)
    }

    return lines.join('\n')
  } catch (error) {
    console.error('Failed to get project history:', error)
    return undefined
  }
}

/**
 * 增强对话上下文
 */
export async function enhanceConversationContext(params: {
  query: string
  userId: mongoose.Types.ObjectId
  agentId: AgentId
  projectId?: mongoose.Types.ObjectId
  includePreferences?: boolean
  includeMemories?: boolean
  includeProjectHistory?: boolean
}): Promise<EnhancedContext> {
  const {
    query,
    userId,
    agentId,
    projectId,
    includePreferences = true,
    includeMemories = true,
    includeProjectHistory = true,
  } = params

  const parts: string[] = []

  // 获取用户偏好
  let userPreferences: string | undefined
  if (includePreferences) {
    userPreferences = await getUserPreferencesContext(userId, agentId)
    if (userPreferences) {
      parts.push(userPreferences)
    }
  }

  // 获取相关记忆
  let relevantMemories: string | undefined
  if (includeMemories) {
    relevantMemories = await getRelevantMemoriesContext({
      query,
      userId: userId.toString(),
      agentId,
      projectId: projectId?.toString(),
    })
    if (relevantMemories) {
      parts.push(relevantMemories)
    }
  }

  // 获取项目历史
  let projectHistory: string | undefined
  if (includeProjectHistory && projectId) {
    projectHistory = await getProjectHistoryContext({
      userId,
      projectId,
      limit: 5,
    })
    if (projectHistory) {
      parts.push(projectHistory)
    }
  }

  return {
    userPreferences,
    relevantMemories,
    projectHistory,
    fullEnhancement: parts.join('\n\n'),
  }
}

/**
 * 构建带记忆增强的系统提示词
 */
export async function buildEnhancedSystemPrompt(params: {
  basePrompt: string
  query: string
  userId: mongoose.Types.ObjectId
  agentId: AgentId
  projectId?: mongoose.Types.ObjectId
}): Promise<string> {
  const { basePrompt, query, userId, agentId, projectId } = params

  const enhancement = await enhanceConversationContext({
    query,
    userId,
    agentId,
    projectId,
  })

  if (!enhancement.fullEnhancement) {
    return basePrompt
  }

  return `${basePrompt}

${enhancement.fullEnhancement}`
}
