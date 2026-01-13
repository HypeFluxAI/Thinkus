import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { connectDB } from '@/lib/db/connect'
import { DistilledSkill } from '@/lib/db/models'
import type { ExpertDomain } from '@/lib/config/external-experts'

/**
 * GET /api/skills
 * 获取蒸馏技能列表
 */
export async function GET(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    await connectDB()

    const { searchParams } = new URL(req.url)
    const domain = searchParams.get('domain') as ExpertDomain | null
    const category = searchParams.get('category')
    const tag = searchParams.get('tag')
    const limit = parseInt(searchParams.get('limit') || '50')
    const offset = parseInt(searchParams.get('offset') || '0')
    const sort = searchParams.get('sort') || 'quality' // quality, popular, recent

    // Build query
    const query: Record<string, unknown> = { isPublished: true }
    if (domain) query.expertDomain = domain
    if (category) query.category = category
    if (tag) query.tags = tag

    // Build sort
    let sortQuery: Record<string, number> = {}
    switch (sort) {
      case 'popular':
        sortQuery = { useCount: -1, helpfulCount: -1 }
        break
      case 'recent':
        sortQuery = { createdAt: -1 }
        break
      case 'quality':
      default:
        sortQuery = { qualityScore: -1, helpfulCount: -1 }
    }

    const [skills, total] = await Promise.all([
      DistilledSkill.find(query)
        .sort(sortQuery as any)
        .skip(offset)
        .limit(limit)
        .lean(),
      DistilledSkill.countDocuments(query),
    ])

    // Get stats
    const stats = await DistilledSkill.aggregate([
      { $match: { isPublished: true } },
      {
        $group: {
          _id: null,
          total: { $sum: 1 },
          byDomain: { $push: '$expertDomain' },
          byCategory: { $push: '$category' },
        },
      },
    ])

    // Count by domain
    const domainCounts: Record<string, number> = {}
    const categoryCounts: Record<string, number> = {}
    if (stats[0]) {
      for (const d of stats[0].byDomain) {
        domainCounts[d] = (domainCounts[d] || 0) + 1
      }
      for (const c of stats[0].byCategory) {
        categoryCounts[c] = (categoryCounts[c] || 0) + 1
      }
    }

    return NextResponse.json({
      success: true,
      skills,
      total,
      hasMore: offset + skills.length < total,
      stats: {
        total: stats[0]?.total || 0,
        byDomain: domainCounts,
        byCategory: categoryCounts,
      },
    })
  } catch (error) {
    console.error('Failed to get skills:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

/**
 * POST /api/skills/helpful
 * 标记技能为有用
 */
export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    await connectDB()

    const { skillId, action } = await req.json()

    if (!skillId) {
      return NextResponse.json(
        { error: 'Missing skillId' },
        { status: 400 }
      )
    }

    if (action === 'helpful') {
      await DistilledSkill.markAsHelpful(skillId)
    } else if (action === 'use') {
      await DistilledSkill.incrementUseCount(skillId)
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Failed to update skill:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
