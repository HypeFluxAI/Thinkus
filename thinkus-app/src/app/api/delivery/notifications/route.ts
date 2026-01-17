import { NextRequest, NextResponse } from 'next/server'
import {
  reliableNotification,
  type NotificationMessage,
  type NotificationChannel,
  type NotificationPriority,
} from '@/lib/services'

/**
 * GET /api/delivery/notifications?userId=xxx
 * 获取用户通知列表
 */
export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams
    const userId = searchParams.get('userId')
    const limit = parseInt(searchParams.get('limit') || '50')
    const unreadOnly = searchParams.get('unreadOnly') === 'true'

    if (!userId) {
      return NextResponse.json(
        { error: '缺少 userId 参数' },
        { status: 400 }
      )
    }

    const notifications = reliableNotification.getUserNotifications(userId, {
      limit,
      unreadOnly
    })

    const unreadCount = reliableNotification.getUnreadCount(userId)

    return NextResponse.json({
      success: true,
      data: {
        notifications,
        unreadCount,
        total: notifications.length
      }
    })
  } catch (error) {
    console.error('获取通知失败:', error)
    return NextResponse.json(
      { error: '获取通知失败' },
      { status: 500 }
    )
  }
}

/**
 * POST /api/delivery/notifications
 * 发送通知或操作通知
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { action, userId, notification, notificationId, notificationIds } = body

    // 发送通知
    if (action === 'send') {
      if (!userId || !notification) {
        return NextResponse.json(
          { error: '缺少必要参数' },
          { status: 400 }
        )
      }

      const result = await reliableNotification.send(userId, {
        type: notification.type || 'system',
        title: notification.title,
        body: notification.body,
        priority: notification.priority as NotificationPriority || 'normal',
        channels: notification.channels as NotificationChannel[] || ['in_app'],
        actions: notification.actions,
        metadata: notification.metadata
      })

      return NextResponse.json({
        success: true,
        data: result,
        message: '通知已发送'
      })
    }

    // 标记已读
    if (action === 'markAsRead') {
      if (!notificationId) {
        return NextResponse.json(
          { error: '缺少 notificationId' },
          { status: 400 }
        )
      }

      reliableNotification.markAsRead(notificationId)

      return NextResponse.json({
        success: true,
        message: '已标记为已读'
      })
    }

    // 批量标记已读
    if (action === 'markAllAsRead') {
      if (!userId) {
        return NextResponse.json(
          { error: '缺少 userId' },
          { status: 400 }
        )
      }

      reliableNotification.markAllAsRead(userId)

      return NextResponse.json({
        success: true,
        message: '已全部标记为已读'
      })
    }

    // 删除通知
    if (action === 'delete') {
      if (!notificationId) {
        return NextResponse.json(
          { error: '缺少 notificationId' },
          { status: 400 }
        )
      }

      reliableNotification.deleteNotification(notificationId)

      return NextResponse.json({
        success: true,
        message: '通知已删除'
      })
    }

    // 批量删除
    if (action === 'deleteMultiple') {
      if (!notificationIds || !Array.isArray(notificationIds)) {
        return NextResponse.json(
          { error: '缺少 notificationIds' },
          { status: 400 }
        )
      }

      notificationIds.forEach((id: string) => {
        reliableNotification.deleteNotification(id)
      })

      return NextResponse.json({
        success: true,
        message: `已删除 ${notificationIds.length} 条通知`
      })
    }

    // 更新偏好设置
    if (action === 'updatePreferences') {
      if (!userId || !body.preferences) {
        return NextResponse.json(
          { error: '缺少必要参数' },
          { status: 400 }
        )
      }

      reliableNotification.updatePreferences(userId, body.preferences)

      return NextResponse.json({
        success: true,
        message: '偏好设置已更新'
      })
    }

    // 获取偏好设置
    if (action === 'getPreferences') {
      if (!userId) {
        return NextResponse.json(
          { error: '缺少 userId' },
          { status: 400 }
        )
      }

      const preferences = reliableNotification.getPreferences(userId)

      return NextResponse.json({
        success: true,
        data: preferences
      })
    }

    return NextResponse.json(
      { error: '未知操作' },
      { status: 400 }
    )
  } catch (error) {
    console.error('通知操作失败:', error)
    return NextResponse.json(
      { error: '通知操作失败' },
      { status: 500 }
    )
  }
}
