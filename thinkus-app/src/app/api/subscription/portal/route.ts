import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import mongoose from 'mongoose'
import { authOptions } from '@/lib/auth/options'
import { Subscription } from '@/lib/db/models'
import dbConnect from '@/lib/db/connection'
import { createBillingPortalSession, getAppUrl } from '@/lib/stripe/config'

// POST /api/subscription/portal - 创建Stripe客户门户会话
export async function POST() {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    await dbConnect()
    const userId = new mongoose.Types.ObjectId(session.user.id)

    // 获取订阅
    const subscription = await Subscription.findOne({ userId })
    if (!subscription?.stripeCustomerId) {
      return NextResponse.json(
        { error: 'No Stripe customer found. Please subscribe first.' },
        { status: 400 }
      )
    }

    // 创建门户会话
    const appUrl = getAppUrl()
    const portalSession = await createBillingPortalSession({
      customerId: subscription.stripeCustomerId,
      returnUrl: `${appUrl}/settings/subscription`,
    })

    return NextResponse.json({
      portalUrl: portalSession.url,
    })
  } catch (error) {
    console.error('Portal session error:', error)
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 })
  }
}
