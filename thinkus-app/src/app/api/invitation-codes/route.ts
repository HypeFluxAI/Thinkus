import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import mongoose from 'mongoose'
import { authOptions } from '@/lib/auth/options'
import { InvitationCode, Subscription, SUBSCRIPTION_PLANS } from '@/lib/db/models'
import dbConnect from '@/lib/db/connection'

// 每个计划允许的邀请码数量
const INVITE_LIMITS = {
  free: 3,
  starter: 10,
  professional: 30,
  enterprise: -1, // 无限
} as const

// GET /api/invitation-codes - 获取用户的邀请码列表
export async function GET() {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    await dbConnect()
    const userId = new mongoose.Types.ObjectId(session.user.id)

    // 获取用户的邀请码
    const [codes, subscription] = await Promise.all([
      InvitationCode.getUserInviteCodes(userId),
      Subscription.getOrCreateSubscription(userId),
    ])

    // 计算统计信息
    const activeCount = codes.filter(
      c => c.status === 'active' && c.expiresAt > new Date()
    ).length
    const usedCount = codes.filter(c => c.status === 'used').length
    const totalGenerated = codes.length

    // 获取邀请限额
    const plan = subscription.plan
    const inviteLimit = INVITE_LIMITS[plan]
    const canGenerate = inviteLimit === -1 || totalGenerated < inviteLimit

    return NextResponse.json({
      codes: codes.map(c => ({
        id: c._id.toString(),
        code: c.code,
        tier: c.tier,
        status: c.status,
        usedBy: c.usedBy?.toString(),
        usedAt: c.usedAt,
        expiresAt: c.expiresAt,
        benefits: c.benefits,
        createdAt: c.createdAt,
      })),
      stats: {
        active: activeCount,
        used: usedCount,
        total: totalGenerated,
        limit: inviteLimit,
        remaining: inviteLimit === -1 ? -1 : Math.max(0, inviteLimit - totalGenerated),
      },
      canGenerate,
      plan: {
        name: SUBSCRIPTION_PLANS[plan].nameCn,
        inviteLimit,
      },
    })
  } catch (error) {
    console.error('Get user invitation codes error:', error)
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 })
  }
}

// POST /api/invitation-codes - 创建用户邀请码
export async function POST() {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    await dbConnect()
    const userId = new mongoose.Types.ObjectId(session.user.id)

    // 获取用户订阅信息
    const subscription = await Subscription.getOrCreateSubscription(userId)
    const plan = subscription.plan

    // 检查邀请限额
    const existingCodes = await InvitationCode.find({
      createdBy: userId,
      type: 'user_invite',
    }).countDocuments()

    const inviteLimit = INVITE_LIMITS[plan]
    if (inviteLimit !== -1 && existingCodes >= inviteLimit) {
      return NextResponse.json(
        {
          error: `You have reached the invitation limit for your plan (${inviteLimit}). Upgrade to get more invites.`,
          limit: inviteLimit,
          used: existingCodes,
        },
        { status: 403 }
      )
    }

    // 根据计划确定邀请码等级
    let tier: 'common' | 'rare' | 'legendary' = 'common'
    if (plan === 'professional') {
      tier = 'rare'
    } else if (plan === 'enterprise') {
      tier = 'legendary'
    }

    // 创建邀请码
    const invitation = await InvitationCode.createUserInviteCode(userId, tier)

    return NextResponse.json({
      success: true,
      code: {
        id: invitation._id.toString(),
        code: invitation.code,
        tier: invitation.tier,
        expiresAt: invitation.expiresAt,
        benefits: invitation.benefits,
      },
      stats: {
        used: existingCodes + 1,
        limit: inviteLimit,
        remaining: inviteLimit === -1 ? -1 : Math.max(0, inviteLimit - existingCodes - 1),
      },
    })
  } catch (error) {
    console.error('Create user invitation code error:', error)
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 })
  }
}
