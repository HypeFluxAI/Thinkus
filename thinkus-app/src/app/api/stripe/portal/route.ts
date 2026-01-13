import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { connectDB } from '@/lib/db/connect'
import { Subscription } from '@/lib/db/models'
import { createPortalSession } from '@/lib/stripe'

/**
 * POST /api/stripe/portal
 * 创建 Stripe 客户门户会话
 */
export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    await connectDB()

    // 获取订阅
    const subscription = await Subscription.findOne({ userId: session.user.id })
    if (!subscription?.stripeCustomerId) {
      return NextResponse.json(
        { error: 'No Stripe customer found. Please subscribe first.' },
        { status: 400 }
      )
    }

    // 创建门户会话
    const origin = req.headers.get('origin') || 'http://localhost:3000'
    const portalSession = await createPortalSession(
      subscription.stripeCustomerId,
      `${origin}/dashboard/settings/billing`
    )

    return NextResponse.json({
      success: true,
      url: portalSession.url,
    })
  } catch (error) {
    console.error('Failed to create portal session:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
