import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import mongoose from 'mongoose'
import { authOptions } from '@/lib/auth/options'
import { Subscription } from '@/lib/db/models'
import dbConnect from '@/lib/db/connection'
import { cancelSubscription, resumeSubscription } from '@/lib/stripe/config'

interface CancelRequest {
  action: 'cancel' | 'resume'
  immediate?: boolean
  reason?: string
}

// POST /api/subscription/cancel - 取消或恢复订阅
export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body: CancelRequest = await req.json()
    const { action, immediate = false, reason } = body

    await dbConnect()
    const userId = new mongoose.Types.ObjectId(session.user.id)

    // 获取订阅
    const subscription = await Subscription.findOne({ userId })
    if (!subscription) {
      return NextResponse.json({ error: 'No subscription found' }, { status: 404 })
    }

    if (!subscription.stripeSubscriptionId) {
      return NextResponse.json(
        { error: 'No active Stripe subscription' },
        { status: 400 }
      )
    }

    if (action === 'cancel') {
      // 取消订阅
      await cancelSubscription(subscription.stripeSubscriptionId, !immediate)

      // 更新本地数据库
      subscription.cancelAtPeriodEnd = !immediate
      if (immediate) {
        subscription.status = 'canceled'
        subscription.canceledAt = new Date()
      }
      subscription.cancelReason = reason
      await subscription.save()

      return NextResponse.json({
        success: true,
        message: immediate
          ? 'Subscription canceled immediately'
          : 'Subscription will be canceled at the end of the billing period',
        cancelAtPeriodEnd: !immediate,
        currentPeriodEnd: subscription.currentPeriodEnd,
      })
    } else if (action === 'resume') {
      // 检查是否可以恢复
      if (!subscription.cancelAtPeriodEnd) {
        return NextResponse.json(
          { error: 'Subscription is not scheduled for cancellation' },
          { status: 400 }
        )
      }

      // 恢复订阅
      await resumeSubscription(subscription.stripeSubscriptionId)

      // 更新本地数据库
      subscription.cancelAtPeriodEnd = false
      subscription.cancelReason = undefined
      await subscription.save()

      return NextResponse.json({
        success: true,
        message: 'Subscription resumed successfully',
      })
    } else {
      return NextResponse.json({ error: 'Invalid action' }, { status: 400 })
    }
  } catch (error) {
    console.error('Cancel/resume subscription error:', error)
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 })
  }
}
