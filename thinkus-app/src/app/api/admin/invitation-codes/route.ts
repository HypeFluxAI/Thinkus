import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import mongoose from 'mongoose'
import { authOptions } from '@/lib/auth/options'
import { InvitationCode, TIER_BENEFITS } from '@/lib/db/models'
import type { InvitationCodeType, InvitationCodeTier, InvitationCodeStatus } from '@/lib/db/models'
import User from '@/lib/db/models/user'
import dbConnect from '@/lib/db/connection'

// 管理员邮箱列表（生产环境应该从数据库或环境变量获取）
const ADMIN_EMAILS = process.env.ADMIN_EMAILS?.split(',') || ['admin@thinkus.com']

// 检查是否是管理员
async function isAdmin(userId: string): Promise<boolean> {
  const user = await User.findById(userId).select('email').lean()
  if (!user || !user.email) return false
  return ADMIN_EMAILS.includes(user.email)
}

// GET /api/admin/invitation-codes - 获取邀请码列表
export async function GET(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    await dbConnect()

    // 检查管理员权限
    if (!(await isAdmin(session.user.id))) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const { searchParams } = new URL(req.url)
    const limit = Math.min(parseInt(searchParams.get('limit') || '50'), 200)
    const skip = parseInt(searchParams.get('skip') || '0')
    const status = searchParams.get('status') as InvitationCodeStatus | null
    const type = searchParams.get('type') as InvitationCodeType | null
    const tier = searchParams.get('tier') as InvitationCodeTier | null
    const search = searchParams.get('search')

    // 构建查询条件
    const query: Record<string, unknown> = {}
    if (status) query.status = status
    if (type) query.type = type
    if (tier) query.tier = tier
    if (search) {
      query.$or = [
        { code: { $regex: search.toUpperCase(), $options: 'i' } },
        { boundTo: { $regex: search, $options: 'i' } },
      ]
    }

    // 获取邀请码
    const [codes, total, stats] = await Promise.all([
      InvitationCode.find(query)
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .populate('usedBy', 'name email')
        .lean(),
      InvitationCode.countDocuments(query),
      InvitationCode.aggregate([
        {
          $group: {
            _id: '$status',
            count: { $sum: 1 },
          },
        },
      ]),
    ])

    // 格式化统计数据
    const statsMap = stats.reduce(
      (acc, s) => {
        acc[s._id as string] = s.count
        return acc
      },
      { active: 0, used: 0, expired: 0, revoked: 0 } as Record<string, number>
    )

    return NextResponse.json({
      codes: codes.map(c => ({
        id: c._id.toString(),
        code: c.code,
        type: c.type,
        tier: c.tier,
        status: c.status,
        boundTo: c.boundTo,
        createdBy: c.createdBy === 'system' ? 'system' : c.createdBy?.toString(),
        usedBy: c.usedBy
          ? {
              id: (c.usedBy as { _id: mongoose.Types.ObjectId })._id.toString(),
              name: (c.usedBy as { name?: string }).name,
              email: (c.usedBy as { email?: string }).email,
            }
          : null,
        usedAt: c.usedAt,
        expiresAt: c.expiresAt,
        benefits: c.benefits,
        createdAt: c.createdAt,
      })),
      pagination: {
        total,
        limit,
        skip,
        hasMore: skip + codes.length < total,
      },
      stats: statsMap,
    })
  } catch (error) {
    console.error('Get invitation codes error:', error)
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 })
  }
}

// POST /api/admin/invitation-codes - 创建邀请码
export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    await dbConnect()

    // 检查管理员权限
    if (!(await isAdmin(session.user.id))) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const body = await req.json()
    const {
      type = 'special',
      tier = 'common',
      boundTo,
      expiresInDays = 30,
      count = 1,
      customBenefits,
    } = body as {
      type?: InvitationCodeType
      tier?: InvitationCodeTier
      boundTo?: string
      expiresInDays?: number
      count?: number
      customBenefits?: {
        skipWaitlist?: boolean
        trialDays?: number
        bonusQuota?: number
      }
    }

    // 验证参数
    if (count < 1 || count > 100) {
      return NextResponse.json(
        { error: 'Count must be between 1 and 100' },
        { status: 400 }
      )
    }

    const codes: Array<{
      id: string
      code: string
      type: InvitationCodeType
      tier: InvitationCodeTier
      boundTo?: string
      expiresAt: Date
      benefits: typeof TIER_BENEFITS.common
    }> = []

    for (let i = 0; i < count; i++) {
      let invitation

      if (type === 'waitlist' && boundTo) {
        invitation = await InvitationCode.createWaitlistCode(boundTo, tier)
      } else if (type === 'special') {
        invitation = await InvitationCode.createSpecialCode({
          tier,
          boundTo: count === 1 ? boundTo : undefined, // 批量生成时不绑定邮箱
          expiresInDays,
          customBenefits,
        })
      } else {
        // 默认创建特殊邀请码
        invitation = await InvitationCode.createSpecialCode({
          tier,
          boundTo: count === 1 ? boundTo : undefined,
          expiresInDays,
          customBenefits,
        })
      }

      codes.push({
        id: invitation._id.toString(),
        code: invitation.code,
        type: invitation.type,
        tier: invitation.tier,
        boundTo: invitation.boundTo,
        expiresAt: invitation.expiresAt,
        benefits: invitation.benefits,
      })
    }

    return NextResponse.json({
      success: true,
      message: `Created ${codes.length} invitation code(s)`,
      codes,
    })
  } catch (error) {
    console.error('Create invitation code error:', error)
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 })
  }
}

// DELETE /api/admin/invitation-codes - 批量撤销邀请码
export async function DELETE(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    await dbConnect()

    // 检查管理员权限
    if (!(await isAdmin(session.user.id))) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const body = await req.json()
    const { codes } = body as { codes: string[] }

    if (!codes || !Array.isArray(codes) || codes.length === 0) {
      return NextResponse.json(
        { error: 'Please provide an array of codes to revoke' },
        { status: 400 }
      )
    }

    // 批量撤销
    const result = await InvitationCode.updateMany(
      {
        code: { $in: codes.map(c => c.toUpperCase()) },
        status: 'active',
      },
      { $set: { status: 'revoked' } }
    )

    return NextResponse.json({
      success: true,
      message: `Revoked ${result.modifiedCount} invitation code(s)`,
      revokedCount: result.modifiedCount,
    })
  } catch (error) {
    console.error('Revoke invitation codes error:', error)
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 })
  }
}
