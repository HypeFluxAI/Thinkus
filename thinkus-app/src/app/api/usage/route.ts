import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { connectDB } from '@/lib/db/connect'
import { AIUsage } from '@/lib/db/models'
import { Types } from 'mongoose'

/**
 * GET /api/usage
 * 获取用户 AI 使用统计
 */
export async function GET(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    await connectDB()

    const { searchParams } = new URL(req.url)
    const period = (searchParams.get('period') as 'day' | 'week' | 'month' | 'all') || 'month'
    const projectId = searchParams.get('projectId')

    const userId = new Types.ObjectId(session.user.id)

    // 获取统计数据
    let stats
    if (projectId) {
      stats = await AIUsage.getProjectStats(new Types.ObjectId(projectId))
    } else {
      stats = await AIUsage.getUserStats(userId, period)
    }

    // 获取每日使用趋势
    const dailyUsage = await AIUsage.getDailyUsage(
      userId,
      period === 'day' ? 1 : period === 'week' ? 7 : 30
    )

    // 获取最近请求
    const recentRequests = await AIUsage.find({ userId })
      .sort({ createdAt: -1 })
      .limit(10)
      .select('model usageType inputTokens outputTokens totalTokens estimatedCost success createdAt')
      .lean()

    return NextResponse.json({
      success: true,
      stats,
      dailyUsage,
      recentRequests,
    })
  } catch (error) {
    console.error('Failed to get usage stats:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

/**
 * POST /api/usage
 * 记录 AI 使用（内部调用）
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
      model: aiModel,
      usageType,
      inputTokens,
      outputTokens,
      latencyMs,
      success = true,
      errorMessage,
      metadata,
    } = body

    // 验证必填字段
    if (!aiModel || !usageType || inputTokens === undefined || outputTokens === undefined) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      )
    }

    const usage = await AIUsage.recordUsage({
      userId: new Types.ObjectId(session.user.id),
      projectId: projectId ? new Types.ObjectId(projectId) : undefined,
      aiModel,
      usageType,
      inputTokens,
      outputTokens,
      latencyMs,
      success,
      errorMessage,
      metadata,
    })

    return NextResponse.json({
      success: true,
      usage: {
        id: usage._id,
        totalTokens: usage.totalTokens,
        estimatedCost: usage.estimatedCost,
      },
    })
  } catch (error) {
    console.error('Failed to record usage:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
