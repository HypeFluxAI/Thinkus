import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import mongoose from 'mongoose'
import { authOptions } from '@/lib/auth/options'
import { Decision } from '@/lib/db/models'
import dbConnect from '@/lib/db/connection'

interface RouteParams {
  params: Promise<{ id: string }>
}

// GET /api/decisions/[id] - 获取决策详情
export async function GET(req: NextRequest, { params }: RouteParams) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { id } = await params

    await dbConnect()
    const userId = new mongoose.Types.ObjectId(session.user.id)

    const decision = await Decision.findOne({
      _id: new mongoose.Types.ObjectId(id),
      userId,
    })
      .populate('projectId', 'name icon')
      .populate('discussionId', 'topic status')

    if (!decision) {
      return NextResponse.json({ error: 'Decision not found' }, { status: 404 })
    }

    return NextResponse.json({
      decision: {
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
        project: decision.projectId,
        discussion: decision.discussionId,
        tags: decision.tags,
        createdAt: decision.createdAt,
        updatedAt: decision.updatedAt,
      },
    })
  } catch (error) {
    console.error('Get decision error:', error)
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 })
  }
}

// PATCH /api/decisions/[id] - 更新决策
export async function PATCH(req: NextRequest, { params }: RouteParams) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { id } = await params
    const body = await req.json()

    await dbConnect()
    const userId = new mongoose.Types.ObjectId(session.user.id)

    // 查找决策
    const decision = await Decision.findOne({
      _id: new mongoose.Types.ObjectId(id),
      userId,
    })

    if (!decision) {
      return NextResponse.json({ error: 'Decision not found' }, { status: 404 })
    }

    // 允许更新的字段
    const allowedUpdates = [
      'title', 'description', 'type', 'importance', 'status',
      'reasoning', 'alternatives', 'risks', 'tags'
    ]

    const updates: Record<string, unknown> = {}

    for (const field of allowedUpdates) {
      if (body[field] !== undefined) {
        updates[field] = body[field]
      }
    }

    // 处理状态变化的时间戳
    if (body.status) {
      if (body.status === 'approved' && decision.status !== 'approved') {
        updates.approvedAt = new Date()
        updates.approvedBy = session.user.name || 'user'
      } else if (body.status === 'implemented' && decision.status !== 'implemented') {
        updates.implementedAt = new Date()
      } else if (body.status === 'superseded' && body.supersededBy) {
        updates.supersededBy = new mongoose.Types.ObjectId(body.supersededBy)
      }
    }

    // 更新
    const updatedDecision = await Decision.findByIdAndUpdate(
      id,
      { $set: updates },
      { new: true }
    )

    return NextResponse.json({
      success: true,
      decision: {
        id: updatedDecision?._id.toString(),
        title: updatedDecision?.title,
        status: updatedDecision?.status,
      },
    })
  } catch (error) {
    console.error('Update decision error:', error)
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 })
  }
}

// DELETE /api/decisions/[id] - 删除决策
export async function DELETE(req: NextRequest, { params }: RouteParams) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { id } = await params

    await dbConnect()
    const userId = new mongoose.Types.ObjectId(session.user.id)

    const result = await Decision.findOneAndDelete({
      _id: new mongoose.Types.ObjectId(id),
      userId,
    })

    if (!result) {
      return NextResponse.json({ error: 'Decision not found' }, { status: 404 })
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Delete decision error:', error)
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 })
  }
}
