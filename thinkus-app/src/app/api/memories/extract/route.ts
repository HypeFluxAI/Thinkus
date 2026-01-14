import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { connectDB } from '@/lib/db/connect'
import { Discussion, Memory } from '@/lib/db/models'
import Anthropic from '@anthropic-ai/sdk'
import { storeMemories } from '@/lib/vector/memory-service'
import type { MemoryType } from '@/lib/vector/pinecone'
import type { AgentId } from '@/lib/config/executives'
import * as gemini from '@/lib/ai/gemini'

// 检查使用哪个 AI 服务
const useGemini = !process.env.ANTHROPIC_API_KEY && process.env.GOOGLE_API_KEY

const anthropic = useGemini ? null : new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
})

interface MemoryPoint {
  type: MemoryType
  content: string
  summary: string
  importance: number
  tags: string[]
  relevantAgent: AgentId
  isProjectSpecific: boolean
}

/**
 * POST /api/memories/extract
 * 从讨论中提取记忆
 */
export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    await connectDB()
    const body = await req.json()
    const { discussionId } = body

    if (!discussionId) {
      return NextResponse.json(
        { error: 'Missing discussionId' },
        { status: 400 }
      )
    }

    // 获取讨论
    const discussion = await Discussion.findOne({
      _id: discussionId,
      userId: session.user.id,
    })

    if (!discussion) {
      return NextResponse.json(
        { error: 'Discussion not found' },
        { status: 404 }
      )
    }

    // 使用Claude分析讨论，提取记忆点
    const memoryPoints = await extractMemoryPoints(discussion)

    if (memoryPoints.length === 0) {
      return NextResponse.json({
        success: true,
        extracted: 0,
        message: '没有发现值得记忆的内容',
      })
    }

    // 批量存储记忆到Pinecone
    const memoriesToStore = memoryPoints.map((point) => ({
      content: point.content,
      summary: point.summary,
      type: point.type,
      importance: point.importance,
      userId: session.user.id,
      agentId: point.relevantAgent,
      projectId: point.isProjectSpecific ? discussion.projectId?.toString() : undefined,
      discussionId: discussionId,
    }))

    const vectorIds = await storeMemories(memoriesToStore)

    // 同时存储到MongoDB
    const mongoMemories = await Promise.all(
      memoryPoints.map(async (point, index) => {
        const namespace = point.relevantAgent
          ? `user_${session.user.id}_agent_${point.relevantAgent}`
          : point.isProjectSpecific && discussion.projectId
          ? `user_${session.user.id}_project_${discussion.projectId}`
          : `user_${session.user.id}`

        const layer = point.isProjectSpecific ? 'project' : point.relevantAgent ? 'agent' : 'user'

        return Memory.createMemory({
          userId: session.user.id as any,
          projectId: point.isProjectSpecific ? discussion.projectId : undefined,
          agentId: point.relevantAgent,
          discussionId: discussionId as any,
          type: point.type,
          layer,
          content: point.content,
          summary: point.summary,
          vectorId: vectorIds[index],
          namespace,
          importance: point.importance,
          source: { type: 'discussion', id: discussionId },
        })
      })
    )

    return NextResponse.json({
      success: true,
      extracted: memoryPoints.length,
      memories: memoryPoints.map((point, index) => ({
        type: point.type,
        summary: point.summary,
        importance: point.importance,
        vectorId: vectorIds[index],
      })),
    })
  } catch (error) {
    console.error('Failed to extract memories:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

/**
 * 从讨论中提取记忆点
 */
async function extractMemoryPoints(discussion: any): Promise<MemoryPoint[]> {
  const messages = discussion.messages || []
  if (messages.length === 0) return []

  const messagesText = messages
    .map((m: any) => `[${m.agentId || 'user'}]: ${m.content}`)
    .join('\n')

  const userPrompt = `分析以下讨论，提取值得记忆的要点。

讨论主题：${discussion.topic || '未指定'}
参与者：${(discussion.participants || []).join(', ')}

消息记录：
${messagesText}

请提取以下类型的记忆点：
1. project_context - 项目相关的重要信息
2. user_preference - 用户表达的偏好、喜好或不满
3. discussion_insight - 讨论中产生的洞察和见解
4. decision - 做出的重要决策
5. feedback - 用户的反馈意见

返回JSON数组，每个元素包含：
- type: 记忆类型（上述5种之一）
- content: 完整内容（详细描述）
- summary: 简短摘要（50字以内）
- importance: 重要性1-10（10最重要）
- tags: 相关标签数组
- relevantAgent: 最相关的高管ID（mike/elena/david/james/kevin/alex/lisa/marcus/nina/sarah/frank/tom/iris/nathan/oscar/victor/rachel/chloe）
- isProjectSpecific: 是否仅与当前项目相关（true/false）

只提取真正有价值的记忆点，不要提取日常对话。如果没有值得记忆的内容，返回空数组 []。

返回格式：
\`\`\`json
[...]
\`\`\``

  let content = ''

  if (useGemini) {
    const response = await gemini.createMessage({
      max_tokens: 2000,
      messages: [{ role: 'user', content: userPrompt }],
    })
    content = response.content[0]?.text || ''
  } else {
    const response = await anthropic!.messages.create({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 2000,
      messages: [{ role: 'user', content: userPrompt }],
    })
    content = response.content[0].type === 'text' ? response.content[0].text : ''
  }
  const jsonMatch = content.match(/```json\s*([\s\S]*?)\s*```/)

  if (jsonMatch) {
    try {
      return JSON.parse(jsonMatch[1])
    } catch {
      return []
    }
  }

  return []
}
