import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth/config'
import dbConnect from '@/lib/db/connection'
import { Project, Notification, DeliverySession, DeliveryEvent } from '@/lib/db/models'
import mongoose from 'mongoose'

// GET /api/delivery/[projectId]/notifications - 获取交付相关通知
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ projectId: string }> }
) {
  const { projectId } = await params
  const searchParams = request.nextUrl.searchParams
  const limit = parseInt(searchParams.get('limit') || '20', 10)
  const offset = parseInt(searchParams.get('offset') || '0', 10)
  const unreadOnly = searchParams.get('unread') === 'true'

  const session = await getServerSession(authOptions)
  if (!session?.user?.id) {
    return NextResponse.json({ error: '未授权' }, { status: 401 })
  }

  await dbConnect()

  const project = await Project.findById(projectId)
  if (!project || project.userId.toString() !== session.user.id) {
    return NextResponse.json({ error: '项目不存在或无权限' }, { status: 403 })
  }

  // 获取交付会话
  const deliverySession = await DeliverySession.findOne({ projectId }).sort({ createdAt: -1 })

  // 构建查询条件
  const query: Record<string, unknown> = {
    userId: new mongoose.Types.ObjectId(session.user.id),
    $or: [
      { 'relatedTo.type': 'project', 'relatedTo.id': new mongoose.Types.ObjectId(projectId) },
      { 'metadata.deliverySessionId': deliverySession?._id?.toString() },
      { type: { $in: ['delivery_progress', 'acceptance_required', 'delivery_complete'] } },
    ],
  }

  if (unreadOnly) {
    query.readAt = { $exists: false }
  }

  // 获取通知
  const notifications = await Notification.find(query)
    .sort({ createdAt: -1 })
    .skip(offset)
    .limit(limit)

  const total = await Notification.countDocuments(query)
  const unreadCount = await Notification.countDocuments({
    ...query,
    readAt: { $exists: false },
  })

  // 获取最近的交付事件作为补充通知
  let deliveryEvents: Array<{
    id: string
    type: string
    title: string
    body: string
    priority: string
    createdAt: Date
    read: boolean
    source: string
  }> = []
  if (deliverySession) {
    const events = await DeliveryEvent.find({
      sessionId: deliverySession._id,
      level: { $in: ['info', 'success', 'warning', 'error'] },
    })
      .sort({ timestamp: -1 })
      .limit(10)

    deliveryEvents = events.map((e) => ({
      id: `event_${e._id}`,
      type: 'delivery_event',
      title: e.eventType.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase()),
      body: e.message,
      priority: e.level === 'error' ? 'urgent' : e.level === 'warning' ? 'high' : 'normal',
      createdAt: e.timestamp,
      read: true, // 事件默认已读
      source: 'delivery_event',
    }))
  }

  return NextResponse.json({
    notifications: notifications.map((n) => ({
      id: n._id.toString(),
      type: n.type,
      title: n.title,
      body: n.body,
      priority: n.priority,
      createdAt: n.createdAt,
      readAt: n.readAt,
      actionUrl: n.actionUrl,
      metadata: n.metadata,
    })),
    deliveryEvents,
    pagination: {
      total,
      offset,
      limit,
      hasMore: offset + notifications.length < total,
    },
    unreadCount,
  })
}

// POST /api/delivery/[projectId]/notifications - 标记通知已读
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ projectId: string }> }
) {
  const { projectId } = await params
  const body = await request.json()

  const session = await getServerSession(authOptions)
  if (!session?.user?.id) {
    return NextResponse.json({ error: '未授权' }, { status: 401 })
  }

  await dbConnect()

  const project = await Project.findById(projectId)
  if (!project || project.userId.toString() !== session.user.id) {
    return NextResponse.json({ error: '项目不存在或无权限' }, { status: 403 })
  }

  // 标记单个通知已读
  if (body.notificationId) {
    await Notification.findOneAndUpdate(
      {
        _id: new mongoose.Types.ObjectId(body.notificationId),
        userId: new mongoose.Types.ObjectId(session.user.id),
      },
      { $set: { readAt: new Date() } }
    )
    return NextResponse.json({ message: '已标记为已读' })
  }

  // 标记所有通知已读
  if (body.markAllRead) {
    const deliverySession = await DeliverySession.findOne({ projectId }).sort({ createdAt: -1 })

    await Notification.updateMany(
      {
        userId: new mongoose.Types.ObjectId(session.user.id),
        readAt: { $exists: false },
        $or: [
          { 'relatedTo.type': 'project', 'relatedTo.id': new mongoose.Types.ObjectId(projectId) },
          { 'metadata.deliverySessionId': deliverySession?._id?.toString() },
        ],
      },
      { $set: { readAt: new Date() } }
    )
    return NextResponse.json({ message: '已全部标记为已读' })
  }

  return NextResponse.json({ error: '无效的请求' }, { status: 400 })
}

// DELETE /api/delivery/[projectId]/notifications - 删除通知
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ projectId: string }> }
) {
  const { projectId } = await params
  const searchParams = request.nextUrl.searchParams
  const notificationId = searchParams.get('id')

  const session = await getServerSession(authOptions)
  if (!session?.user?.id) {
    return NextResponse.json({ error: '未授权' }, { status: 401 })
  }

  await dbConnect()

  const project = await Project.findById(projectId)
  if (!project || project.userId.toString() !== session.user.id) {
    return NextResponse.json({ error: '项目不存在或无权限' }, { status: 403 })
  }

  if (notificationId) {
    await Notification.findOneAndDelete({
      _id: new mongoose.Types.ObjectId(notificationId),
      userId: new mongoose.Types.ObjectId(session.user.id),
    })
    return NextResponse.json({ message: '通知已删除' })
  }

  return NextResponse.json({ error: '需要指定通知 ID' }, { status: 400 })
}
