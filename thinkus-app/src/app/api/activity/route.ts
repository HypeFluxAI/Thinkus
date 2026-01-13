import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { connectDB } from '@/lib/db/connect'
import { ActivityLog } from '@/lib/db/models'
import { Types } from 'mongoose'

/**
 * GET /api/activity
 * 获取用户活动日志
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
    const type = searchParams.get('type')
    const entity = searchParams.get('entity')
    const limit = parseInt(searchParams.get('limit') || '50')
    const offset = parseInt(searchParams.get('offset') || '0')

    const userId = new Types.ObjectId(session.user.id)

    const activities = await ActivityLog.getUserActivity(userId, {
      projectId: projectId ? new Types.ObjectId(projectId) : undefined,
      type: type as any,
      entity: entity as any,
      limit,
      offset,
    })

    return NextResponse.json({
      success: true,
      activities,
    })
  } catch (error) {
    console.error('Failed to get activity:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

/**
 * GET /api/activity/stats
 * 获取活动统计
 */
export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    await connectDB()
    const body = await req.json()
    const { days = 30 } = body

    const userId = new Types.ObjectId(session.user.id)
    const stats = await ActivityLog.getActivityStats(userId, days)

    return NextResponse.json({
      success: true,
      stats,
    })
  } catch (error) {
    console.error('Failed to get activity stats:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
