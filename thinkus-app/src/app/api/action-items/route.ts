import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import mongoose from 'mongoose'
import { authOptions } from '@/lib/auth/options'
import { ActionItem } from '@/lib/db/models'
import dbConnect from '@/lib/db/connection'

// GET /api/action-items - 获取用户的行动项列表
export async function GET(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { searchParams } = new URL(req.url)
    const projectId = searchParams.get('projectId')
    const status = searchParams.get('status')
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

    const actionItems = await ActionItem.find(query)
      .sort({ priority: 1, dueDate: 1, createdAt: -1 })
      .limit(limit)
      .populate('projectId', 'name icon')
      .populate('decisionId', 'title')
      .lean()

    // 获取逾期数量
    const overdueCount = await ActionItem.countDocuments({
      userId,
      status: { $in: ['pending', 'in_progress'] },
      dueDate: { $lt: new Date() },
    })

    return NextResponse.json({
      actionItems: actionItems.map((item) => ({
        id: item._id.toString(),
        title: item.title,
        description: item.description,
        category: item.category,
        status: item.status,
        priority: item.priority,
        assignee: item.assignee,
        dueDate: item.dueDate,
        progress: item.progress,
        project: item.projectId ? {
          id: (item.projectId as unknown as { _id: mongoose.Types.ObjectId; name: string; icon?: string })._id.toString(),
          name: (item.projectId as unknown as { name: string }).name,
          icon: (item.projectId as unknown as { icon?: string }).icon,
        } : null,
        decision: item.decisionId ? {
          id: (item.decisionId as unknown as { _id: mongoose.Types.ObjectId })._id.toString(),
          title: (item.decisionId as unknown as { title: string }).title,
        } : null,
        checklist: item.checklist,
        createdAt: item.createdAt,
        updatedAt: item.updatedAt,
      })),
      overdueCount,
    })
  } catch (error) {
    console.error('Get action items error:', error)
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 })
  }
}

// POST /api/action-items - 创建新的行动项
export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await req.json()
    const {
      projectId,
      decisionId,
      title,
      description,
      category = 'other',
      priority = 'medium',
      assignee = 'user',
      dueDate,
      checklist,
    } = body

    if (!projectId || !title) {
      return NextResponse.json(
        { error: 'Project ID and title are required' },
        { status: 400 }
      )
    }

    await dbConnect()
    const userId = new mongoose.Types.ObjectId(session.user.id)

    const actionItem = await ActionItem.create({
      userId,
      projectId: new mongoose.Types.ObjectId(projectId),
      decisionId: decisionId ? new mongoose.Types.ObjectId(decisionId) : undefined,
      title,
      description,
      category,
      priority,
      status: 'pending',
      assignee,
      assignedBy: 'user',
      dueDate: dueDate ? new Date(dueDate) : undefined,
      checklist: checklist?.map((text: string, index: number) => ({
        id: `item-${index}`,
        text,
        completed: false,
      })),
    })

    return NextResponse.json({
      success: true,
      actionItem: {
        id: actionItem._id.toString(),
        title: actionItem.title,
        status: actionItem.status,
      },
    })
  } catch (error) {
    console.error('Create action item error:', error)
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 })
  }
}
