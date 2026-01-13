import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { connectDB } from '@/lib/db/connect'
import { Memory } from '@/lib/db/models'
import {
  storeMemory,
  retrieveMemories,
  deleteMemory,
  formatMemoriesAsContext,
} from '@/lib/vector/memory-service'
import type { MemoryType } from '@/lib/vector/pinecone'
import type { AgentId } from '@/lib/config/executives'

/**
 * GET /api/memories
 * 获取用户记忆列表或检索相关记忆
 */
export async function GET(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    await connectDB()
    const { searchParams } = new URL(req.url)

    const query = searchParams.get('query')
    const type = searchParams.get('type') as MemoryType | null
    const agentId = searchParams.get('agentId') as AgentId | null
    const projectId = searchParams.get('projectId')
    const limit = parseInt(searchParams.get('limit') || '20')

    // 如果有查询，使用向量检索
    if (query) {
      const memories = await retrieveMemories({
        query,
        userId: session.user.id,
        agentId: agentId || undefined,
        projectId: projectId || undefined,
        type: type || undefined,
        topK: limit,
        minScore: 0.6,
      })

      return NextResponse.json({
        success: true,
        memories,
        context: formatMemoriesAsContext(memories),
      })
    }

    // 否则返回MongoDB中的记忆列表
    const filter: Record<string, unknown> = { userId: session.user.id }
    if (type) filter.type = type
    if (agentId) filter.agentId = agentId
    if (projectId) filter.projectId = projectId

    const memories = await Memory.find(filter)
      .sort({ importance: -1, createdAt: -1 })
      .limit(limit)
      .lean()

    // 获取统计
    const stats = await Memory.getMemoryStats(session.user.id as any)

    return NextResponse.json({
      success: true,
      memories,
      stats,
    })
  } catch (error) {
    console.error('Failed to get memories:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

/**
 * POST /api/memories
 * 创建新记忆
 */
export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    await connectDB()
    const body = await req.json()

    const {
      content,
      summary,
      type,
      importance = 5,
      agentId,
      projectId,
      discussionId,
    } = body

    if (!content || !type) {
      return NextResponse.json(
        { error: 'Missing required fields: content, type' },
        { status: 400 }
      )
    }

    // 存储到Pinecone
    const vectorId = await storeMemory({
      content,
      summary,
      type,
      importance,
      userId: session.user.id,
      agentId,
      projectId,
      discussionId,
    })

    // 同时存储到MongoDB
    const namespace = agentId
      ? `user_${session.user.id}_agent_${agentId}`
      : projectId
      ? `user_${session.user.id}_project_${projectId}`
      : `user_${session.user.id}`

    const layer = projectId ? 'project' : agentId ? 'agent' : 'user'

    const memory = await Memory.createMemory({
      userId: session.user.id as any,
      projectId: projectId ? (projectId as any) : undefined,
      agentId,
      discussionId: discussionId ? (discussionId as any) : undefined,
      type,
      layer,
      content,
      summary,
      vectorId,
      namespace,
      importance,
      source: { type: 'manual' },
    })

    return NextResponse.json({
      success: true,
      memory: {
        id: memory._id.toString(),
        vectorId,
        content,
        summary,
        type,
        importance,
      },
    })
  } catch (error) {
    console.error('Failed to create memory:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

/**
 * DELETE /api/memories
 * 删除记忆
 */
export async function DELETE(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    await connectDB()
    const { searchParams } = new URL(req.url)
    const vectorId = searchParams.get('vectorId')
    const agentId = searchParams.get('agentId') as AgentId | null
    const projectId = searchParams.get('projectId')

    if (!vectorId) {
      return NextResponse.json(
        { error: 'Missing vectorId' },
        { status: 400 }
      )
    }

    // 从Pinecone删除
    await deleteMemory({
      id: vectorId,
      userId: session.user.id,
      agentId: agentId || undefined,
      projectId: projectId || undefined,
    })

    // 从MongoDB删除
    await Memory.deleteByVectorId(vectorId)

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Failed to delete memory:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
