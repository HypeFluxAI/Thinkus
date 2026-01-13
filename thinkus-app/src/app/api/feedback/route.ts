import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { connectDB } from '@/lib/db/connect'
import { Feedback } from '@/lib/db/models'
import { Types } from 'mongoose'

/**
 * GET /api/feedback
 * 获取用户反馈列表
 */
export async function GET(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    await connectDB()

    const { searchParams } = new URL(req.url)
    const limit = parseInt(searchParams.get('limit') || '20')

    const feedback = await Feedback.getUserFeedback(
      new Types.ObjectId(session.user.id),
      limit
    )

    return NextResponse.json({
      success: true,
      feedback,
    })
  } catch (error) {
    console.error('Failed to get feedback:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

/**
 * POST /api/feedback
 * 提交反馈
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
      type,
      title,
      content,
      page,
      projectId,
      rating,
      attachments,
    } = body

    // 验证必填字段
    if (!type || !title || !content) {
      return NextResponse.json(
        { error: 'Missing required fields: type, title, content' },
        { status: 400 }
      )
    }

    // 验证类型
    const validTypes = ['bug', 'feature', 'improvement', 'question', 'praise', 'other']
    if (!validTypes.includes(type)) {
      return NextResponse.json(
        { error: 'Invalid feedback type' },
        { status: 400 }
      )
    }

    // 验证评分
    if (rating !== undefined && (rating < 1 || rating > 5)) {
      return NextResponse.json(
        { error: 'Rating must be between 1 and 5' },
        { status: 400 }
      )
    }

    // 获取 User-Agent
    const userAgent = req.headers.get('user-agent') || undefined

    const feedback = await Feedback.submitFeedback({
      userId: new Types.ObjectId(session.user.id),
      type,
      title,
      content,
      page,
      projectId: projectId ? new Types.ObjectId(projectId) : undefined,
      rating,
      attachments,
      userAgent,
      metadata: {
        submittedFrom: 'web',
      },
    })

    return NextResponse.json({
      success: true,
      feedback: {
        id: feedback._id,
        status: feedback.status,
      },
    })
  } catch (error) {
    console.error('Failed to submit feedback:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
