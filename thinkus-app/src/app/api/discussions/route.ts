import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import mongoose from 'mongoose'
import { authOptions } from '@/lib/auth/options'
import { Discussion } from '@/lib/db/models'
import dbConnect from '@/lib/db/connection'

// GET /api/discussions - 获取讨论列表
export async function GET(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    await dbConnect()
    const userId = new mongoose.Types.ObjectId(session.user.id)

    const { searchParams } = new URL(req.url)
    const projectId = searchParams.get('projectId')
    const status = searchParams.get('status') as 'active' | 'concluded' | 'cancelled' | null
    const limit = parseInt(searchParams.get('limit') || '20', 10)
    const skip = parseInt(searchParams.get('skip') || '0', 10)

    // Build query
    const query: Record<string, unknown> = { userId }

    if (projectId) {
      query.projectId = new mongoose.Types.ObjectId(projectId)
    }

    if (status) {
      query.status = status
    }

    // Fetch discussions
    const [discussions, total] = await Promise.all([
      Discussion.find(query)
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .populate('projectId', 'name')
        .lean(),
      Discussion.countDocuments(query),
    ])

    return NextResponse.json({
      discussions: discussions.map(d => ({
        id: d._id.toString(),
        projectId: d.projectId?._id?.toString() || d.projectId?.toString(),
        projectName: (d.projectId as { name?: string })?.name,
        topic: d.topic,
        context: d.context,
        trigger: d.trigger,
        participants: d.participants,
        messageCount: d.messages?.length || 0,
        status: d.status,
        summary: d.summary,
        conclusions: d.conclusions,
        createdAt: d.createdAt,
        concludedAt: d.concludedAt,
      })),
      total,
      hasMore: skip + discussions.length < total,
    })
  } catch (error) {
    console.error('Get discussions error:', error)
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 })
  }
}

// POST /api/discussions - 创建新讨论
export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    await dbConnect()
    const userId = new mongoose.Types.ObjectId(session.user.id)

    const body = await req.json()
    const { projectId, topic, context, participants = [] } = body

    if (!projectId || !topic) {
      return NextResponse.json(
        { error: 'Project ID and topic are required' },
        { status: 400 }
      )
    }

    const discussion = await Discussion.create({
      projectId: new mongoose.Types.ObjectId(projectId),
      userId,
      topic,
      context,
      participants,
      trigger: 'user',
      messages: [],
      status: 'active',
    })

    return NextResponse.json({
      discussion: {
        id: discussion._id.toString(),
        topic: discussion.topic,
        participants: discussion.participants,
        status: discussion.status,
        createdAt: discussion.createdAt,
      },
    })
  } catch (error) {
    console.error('Create discussion error:', error)
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 })
  }
}
