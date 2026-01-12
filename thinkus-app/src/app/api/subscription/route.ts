import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import mongoose from 'mongoose'
import { authOptions } from '@/lib/auth/options'
import { Subscription, SUBSCRIPTION_PLANS, Payment } from '@/lib/db/models'
import dbConnect from '@/lib/db/connection'

// GET /api/subscription - 获取当前用户的订阅信息
export async function GET() {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    await dbConnect()
    const userId = new mongoose.Types.ObjectId(session.user.id)

    // 获取或创建订阅
    const subscription = await Subscription.getOrCreateSubscription(userId)

    // 获取计划详情
    const planDetails = SUBSCRIPTION_PLANS[subscription.plan]

    // 检查各项限制
    const [projectsLimit, discussionsLimit, messagesLimit] = await Promise.all([
      Subscription.checkLimit(userId, 'projects'),
      Subscription.checkLimit(userId, 'discussions'),
      Subscription.checkLimit(userId, 'messages'),
    ])

    return NextResponse.json({
      subscription: {
        id: subscription._id.toString(),
        plan: subscription.plan,
        planDetails: {
          name: planDetails.name,
          nameCn: planDetails.nameCn,
          price: planDetails.price,
          priceYearly: planDetails.priceYearly,
          features: planDetails.features,
        },
        status: subscription.status,
        billingCycle: subscription.billingCycle,
        currentPeriodStart: subscription.currentPeriodStart,
        currentPeriodEnd: subscription.currentPeriodEnd,
        cancelAtPeriodEnd: subscription.cancelAtPeriodEnd,
        usage: subscription.usage,
        limits: {
          projects: projectsLimit,
          discussions: discussionsLimit,
          messages: messagesLimit,
        },
      },
    })
  } catch (error) {
    console.error('Get subscription error:', error)
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 })
  }
}
