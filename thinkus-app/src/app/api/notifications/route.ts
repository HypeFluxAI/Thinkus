import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { connectDB } from '@/lib/db/connect'
import { Notification } from '@/lib/db/models'
import type { NotificationType } from '@/lib/db/models/notification'

/**
 * GET /api/notifications
 * 获取用户通知列表
 */
export async function GET(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    await connectDB()
    const { searchParams } = new URL(req.url)
    const unreadOnly = searchParams.get('unreadOnly') === 'true'
    const limit = parseInt(searchParams.get('limit') || '20', 10)
    const skip = parseInt(searchParams.get('skip') || '0', 10)
    const type = searchParams.get('type') as NotificationType | null

    const result = await Notification.getUserNotifications(
      session.user.id as any,
      {
        unreadOnly,
        limit,
        skip,
        type: type || undefined,
      }
    )

    return NextResponse.json({
      success: true,
      notifications: result.notifications.map((n) => ({
        id: n._id.toString(),
        type: n.type,
        title: n.title,
        body: n.body,
        relatedTo: n.relatedTo
          ? {
              type: n.relatedTo.type,
              id: n.relatedTo.id.toString(),
            }
          : undefined,
        actions: n.actions,
        channels: n.channels,
        read: n.read,
        readAt: n.readAt,
        priority: n.priority,
        createdAt: n.createdAt,
      })),
      total: result.total,
      unreadCount: result.unreadCount,
    })
  } catch (error) {
    console.error('Failed to get notifications:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

/**
 * POST /api/notifications
 * 标记通知操作
 */
export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    await connectDB()
    const body = await req.json()
    const { action, notificationId } = body

    // 标记单个通知为已读
    if (action === 'markAsRead' && notificationId) {
      const notification = await Notification.markAsRead(
        notificationId as any,
        session.user.id as any
      )

      if (!notification) {
        return NextResponse.json(
          { error: 'Notification not found' },
          { status: 404 }
        )
      }

      return NextResponse.json({
        success: true,
        notification: {
          id: notification._id.toString(),
          read: notification.read,
          readAt: notification.readAt,
        },
      })
    }

    // 标记所有通知为已读
    if (action === 'markAllAsRead') {
      const count = await Notification.markAllAsRead(session.user.id as any)

      return NextResponse.json({
        success: true,
        markedCount: count,
      })
    }

    return NextResponse.json(
      { error: 'Invalid action' },
      { status: 400 }
    )
  } catch (error) {
    console.error('Failed to update notification:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

/**
 * DELETE /api/notifications
 * 删除通知
 */
export async function DELETE(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    await connectDB()
    const { searchParams } = new URL(req.url)
    const notificationId = searchParams.get('id')

    if (!notificationId) {
      return NextResponse.json(
        { error: 'Missing notification id' },
        { status: 400 }
      )
    }

    const result = await Notification.deleteOne({
      _id: notificationId,
      userId: session.user.id,
    })

    if (result.deletedCount === 0) {
      return NextResponse.json(
        { error: 'Notification not found' },
        { status: 404 }
      )
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Failed to delete notification:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
