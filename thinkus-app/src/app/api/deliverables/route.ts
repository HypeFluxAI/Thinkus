import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { connectDB } from '@/lib/db/connect'
import { Deliverable, Project } from '@/lib/db/models'
import type { DeliverableType, DeliverableStatus } from '@/lib/db/models/deliverable'
import type { AgentId } from '@/lib/config/executives'

/**
 * GET /api/deliverables
 * 获取交付物列表
 */
export async function GET(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    await connectDB()
    const { searchParams } = new URL(req.url)

    const projectId = searchParams.get('projectId')
    const type = searchParams.get('type') as DeliverableType | null
    const status = searchParams.get('status') as DeliverableStatus | null
    const limit = parseInt(searchParams.get('limit') || '50')

    // 构建查询
    const filter: Record<string, unknown> = { userId: session.user.id }
    if (projectId) filter.projectId = projectId
    if (type) filter.type = type
    if (status) filter.status = status

    const deliverables = await Deliverable.find(filter)
      .sort({ priority: -1, createdAt: -1 })
      .limit(limit)
      .lean()

    // 获取统计
    let stats = null
    if (projectId) {
      stats = await Deliverable.getDeliverableStats(projectId as any)
    }

    // 格式化
    const formattedDeliverables = deliverables.map((d) => ({
      id: d._id.toString(),
      name: d.name,
      description: d.description,
      type: d.type,
      status: d.status,
      content: d.content,
      fileUrl: d.fileUrl,
      fileMeta: d.fileMeta,
      currentVersion: d.currentVersion,
      versionsCount: d.versions?.length || 0,
      createdBy: d.createdBy,
      reviewedBy: d.reviewedBy,
      reviewNotes: d.reviewNotes,
      reviewedAt: d.reviewedAt,
      priority: d.priority,
      dueDate: d.dueDate,
      tags: d.tags,
      projectId: d.projectId?.toString(),
      createdAt: d.createdAt,
      updatedAt: d.updatedAt,
    }))

    return NextResponse.json({
      success: true,
      deliverables: formattedDeliverables,
      stats,
    })
  } catch (error) {
    console.error('Failed to get deliverables:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

/**
 * POST /api/deliverables
 * 创建新交付物
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
      projectId,
      name,
      description,
      type,
      content,
      fileUrl,
      fileMeta,
      priority = 'medium',
      dueDate,
      tags,
      createdBy = 'user',
    } = body

    if (!projectId || !name || !type) {
      return NextResponse.json(
        { error: 'Missing required fields: projectId, name, type' },
        { status: 400 }
      )
    }

    // 验证项目所有权
    const project = await Project.findOne({
      _id: projectId,
      userId: session.user.id,
    })

    if (!project) {
      return NextResponse.json(
        { error: 'Project not found' },
        { status: 404 }
      )
    }

    // 创建交付物
    const deliverable = await Deliverable.create({
      userId: session.user.id,
      projectId,
      name,
      description,
      type,
      status: 'draft',
      content,
      fileUrl,
      fileMeta,
      currentVersion: '1.0.0',
      versions: content || fileUrl ? [{
        version: '1.0.0',
        content,
        fileUrl,
        fileMeta,
        changes: '初始版本',
        createdBy,
        createdAt: new Date(),
      }] : [],
      createdBy,
      priority,
      dueDate: dueDate ? new Date(dueDate) : undefined,
      tags,
    })

    return NextResponse.json({
      success: true,
      deliverable: {
        id: deliverable._id.toString(),
        name: deliverable.name,
        type: deliverable.type,
        status: deliverable.status,
      },
    })
  } catch (error) {
    console.error('Failed to create deliverable:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

/**
 * PATCH /api/deliverables
 * 更新交付物
 */
export async function PATCH(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    await connectDB()
    const body = await req.json()
    const { id, action, ...data } = body

    if (!id) {
      return NextResponse.json({ error: 'Missing id' }, { status: 400 })
    }

    // 获取交付物
    const deliverable = await Deliverable.findOne({
      _id: id,
      userId: session.user.id,
    })

    if (!deliverable) {
      return NextResponse.json(
        { error: 'Deliverable not found' },
        { status: 404 }
      )
    }

    // 处理不同操作
    switch (action) {
      case 'update_status': {
        const { status, reviewedBy, reviewNotes } = data
        const updated = await Deliverable.updateStatus(id, status, {
          reviewedBy,
          reviewNotes,
        })
        return NextResponse.json({
          success: true,
          deliverable: { id, status: updated?.status },
        })
      }

      case 'add_version': {
        const { version, content, fileUrl, fileMeta, changes, createdBy = 'user' } = data
        const updated = await Deliverable.addVersion(id, {
          version,
          content,
          fileUrl,
          fileMeta,
          changes,
          createdBy,
        })
        return NextResponse.json({
          success: true,
          deliverable: {
            id,
            currentVersion: updated?.currentVersion,
            versionsCount: updated?.versions?.length,
          },
        })
      }

      default: {
        // 普通更新
        const allowedFields = ['name', 'description', 'content', 'priority', 'dueDate', 'tags']
        const updateData: Record<string, unknown> = {}
        for (const field of allowedFields) {
          if (data[field] !== undefined) {
            updateData[field] = data[field]
          }
        }

        await Deliverable.findByIdAndUpdate(id, { $set: updateData })
        return NextResponse.json({ success: true })
      }
    }
  } catch (error) {
    console.error('Failed to update deliverable:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

/**
 * DELETE /api/deliverables
 * 删除交付物
 */
export async function DELETE(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    await connectDB()
    const { searchParams } = new URL(req.url)
    const id = searchParams.get('id')

    if (!id) {
      return NextResponse.json({ error: 'Missing id' }, { status: 400 })
    }

    const result = await Deliverable.deleteOne({
      _id: id,
      userId: session.user.id,
    })

    if (result.deletedCount === 0) {
      return NextResponse.json(
        { error: 'Deliverable not found' },
        { status: 404 }
      )
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Failed to delete deliverable:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
