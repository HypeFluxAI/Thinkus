import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import mongoose from 'mongoose'
import { authOptions } from '@/lib/auth/options'
import { Decision } from '@/lib/db/models'
import dbConnect from '@/lib/db/connection'

// GET /api/decisions - 获取用户的决策列表
export async function GET(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { searchParams } = new URL(req.url)
    const projectId = searchParams.get('projectId')
    const status = searchParams.get('status')
    const type = searchParams.get('type')
    const limit = parseInt(searchParams.get('limit') || '50')

    await dbConnect()
    const userId = new mongoose.Types.ObjectId(session.user.id)

    const query: Record<string, unknown> = { userId }
    if (projectId) {
      query.projectId = new mongoose.Types.ObjectId(projectId)
    }
    if (status) {
      query.status = status
    }
    if (type) {
      query.type = type
    }

    const decisions = await Decision.find(query)
      .sort({ createdAt: -1 })
      .limit(limit)
      .populate('projectId', 'name icon')
      .populate('discussionId', 'topic')
      .lean()

    return NextResponse.json({
      decisions: decisions.map((decision) => ({
        id: decision._id.toString(),
        title: decision.title,
        description: decision.description,
        type: decision.type,
        importance: decision.importance,
        status: decision.status,
        rationale: decision.rationale,
        alternatives: decision.alternatives,
        risks: decision.risks,
        proposedBy: decision.proposedBy,
        approvedBy: decision.approvedBy,
        approvedAt: decision.approvedAt,
        implementedAt: decision.implementedAt,
        supersededBy: decision.supersededBy,
        project: decision.projectId ? {
          id: (decision.projectId as unknown as { _id: mongoose.Types.ObjectId; name: string; icon?: string })._id.toString(),
          name: (decision.projectId as unknown as { name: string }).name,
          icon: (decision.projectId as unknown as { icon?: string }).icon,
        } : null,
        discussion: decision.discussionId ? {
          id: (decision.discussionId as unknown as { _id: mongoose.Types.ObjectId })._id.toString(),
          topic: (decision.discussionId as unknown as { topic: string }).topic,
        } : null,
        tags: decision.tags,
        createdAt: decision.createdAt,
        updatedAt: decision.updatedAt,
      })),
    })
  } catch (error) {
    console.error('Get decisions error:', error)
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 })
  }
}

// POST /api/decisions - 创建新的决策
export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await req.json()
    const {
      projectId,
      discussionId,
      title,
      description,
      type = 'other',
      importance = 'medium',
      rationale,
      alternatives,
      risks,
      proposedBy = 'user',
      tags,
    } = body

    if (!projectId || !title) {
      return NextResponse.json(
        { error: 'Project ID and title are required' },
        { status: 400 }
      )
    }

    await dbConnect()
    const userId = new mongoose.Types.ObjectId(session.user.id)

    const decision = await Decision.create({
      userId,
      projectId: new mongoose.Types.ObjectId(projectId),
      discussionId: discussionId ? new mongoose.Types.ObjectId(discussionId) : undefined,
      title,
      description,
      type,
      importance,
      status: 'proposed',
      rationale,
      alternatives,
      risks,
      proposedBy,
      tags,
    })

    return NextResponse.json({
      success: true,
      decision: {
        id: decision._id.toString(),
        title: decision.title,
        status: decision.status,
      },
    })
  } catch (error) {
    console.error('Create decision error:', error)
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 })
  }
}
