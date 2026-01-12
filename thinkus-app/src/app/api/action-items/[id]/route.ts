import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import mongoose from 'mongoose'
import { authOptions } from '@/lib/auth/options'
import { ActionItem } from '@/lib/db/models'
import dbConnect from '@/lib/db/connection'

interface RouteParams {
  params: Promise<{ id: string }>
}

// GET /api/action-items/[id] - 获取行动项详情
export async function GET(req: NextRequest, { params }: RouteParams) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { id } = await params

    await dbConnect()
    const userId = new mongoose.Types.ObjectId(session.user.id)

    const actionItem = await ActionItem.findOne({
      _id: new mongoose.Types.ObjectId(id),
      userId,
    })
      .populate('projectId', 'name icon')
      .populate('decisionId', 'title description')
      .populate('discussionId', 'topic')

    if (!actionItem) {
      return NextResponse.json({ error: 'Action item not found' }, { status: 404 })
    }

    return NextResponse.json({
      actionItem: {
        id: actionItem._id.toString(),
        title: actionItem.title,
        description: actionItem.description,
        category: actionItem.category,
        status: actionItem.status,
        priority: actionItem.priority,
        assignee: actionItem.assignee,
        assignedBy: actionItem.assignedBy,
        dueDate: actionItem.dueDate,
        startedAt: actionItem.startedAt,
        completedAt: actionItem.completedAt,
        progress: actionItem.progress,
        blockedReason: actionItem.blockedReason,
        notes: actionItem.notes,
        checklist: actionItem.checklist,
        estimatedHours: actionItem.estimatedHours,
        actualHours: actionItem.actualHours,
        tags: actionItem.tags,
        project: actionItem.projectId,
        decision: actionItem.decisionId,
        discussion: actionItem.discussionId,
        createdAt: actionItem.createdAt,
        updatedAt: actionItem.updatedAt,
      },
    })
  } catch (error) {
    console.error('Get action item error:', error)
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 })
  }
}

// PATCH /api/action-items/[id] - 更新行动项
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

    // 查找行动项
    const actionItem = await ActionItem.findOne({
      _id: new mongoose.Types.ObjectId(id),
      userId,
    })

    if (!actionItem) {
      return NextResponse.json({ error: 'Action item not found' }, { status: 404 })
    }

    // 允许更新的字段
    const allowedUpdates = [
      'title', 'description', 'category', 'status', 'priority',
      'assignee', 'dueDate', 'progress', 'blockedReason', 'notes',
      'checklist', 'estimatedHours', 'actualHours', 'tags'
    ]

    const updates: Record<string, unknown> = {}

    for (const field of allowedUpdates) {
      if (body[field] !== undefined) {
        updates[field] = body[field]
      }
    }

    // 处理状态变化的时间戳
    if (body.status) {
      if (body.status === 'in_progress' && actionItem.status === 'pending') {
        updates.startedAt = new Date()
      } else if (body.status === 'completed') {
        updates.completedAt = new Date()
        updates.progress = 100
      }
    }

    // 更新
    const updatedItem = await ActionItem.findByIdAndUpdate(
      id,
      { $set: updates },
      { new: true }
    )

    return NextResponse.json({
      success: true,
      actionItem: {
        id: updatedItem?._id.toString(),
        status: updatedItem?.status,
        progress: updatedItem?.progress,
      },
    })
  } catch (error) {
    console.error('Update action item error:', error)
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 })
  }
}

// DELETE /api/action-items/[id] - 删除行动项
export async function DELETE(req: NextRequest, { params }: RouteParams) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { id } = await params

    await dbConnect()
    const userId = new mongoose.Types.ObjectId(session.user.id)

    const result = await ActionItem.findOneAndDelete({
      _id: new mongoose.Types.ObjectId(id),
      userId,
    })

    if (!result) {
      return NextResponse.json({ error: 'Action item not found' }, { status: 404 })
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Delete action item error:', error)
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 })
  }
}
