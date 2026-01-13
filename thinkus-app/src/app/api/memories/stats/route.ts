import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { connectDB } from '@/lib/db/connect'
import { Memory } from '@/lib/db/models'
import { Types } from 'mongoose'

/**
 * GET /api/memories/stats
 * 获取记忆统计
 */
export async function GET(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    await connectDB()

    const userId = new Types.ObjectId(session.user.id)
    const stats = await Memory.getMemoryStats(userId)

    // Get recent memories
    const recentMemories = await Memory.find({ userId })
      .sort({ createdAt: -1 })
      .limit(5)
      .populate('projectId', 'name')
      .lean()

    // Get most accessed memories
    const popularMemories = await Memory.find({ userId })
      .sort({ accessCount: -1 })
      .limit(5)
      .populate('projectId', 'name')
      .lean()

    return NextResponse.json({
      success: true,
      stats,
      recentMemories,
      popularMemories,
    })
  } catch (error) {
    console.error('Failed to get memory stats:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
