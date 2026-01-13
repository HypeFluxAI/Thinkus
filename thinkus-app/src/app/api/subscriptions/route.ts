import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { connectDB } from '@/lib/db/connect'
import { Subscription, Payment, SUBSCRIPTION_PLANS } from '@/lib/db/models'
import {
  getSubscription,
  cancelSubscriptionAtPeriodEnd,
  resumeSubscription,
  getInvoices,
  getUpcomingInvoice,
} from '@/lib/stripe'

/**
 * GET /api/subscriptions
 * 获取当前用户的订阅信息
 */
export async function GET(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    await connectDB()

    // 获取订阅
    const subscription = await Subscription.getOrCreateSubscription(
      session.user.id as any
    )

    // 获取计划功能
    const planFeatures = SUBSCRIPTION_PLANS[subscription.plan]

    // 获取使用量限制状态
    const [projectsLimit, discussionsLimit, messagesLimit] = await Promise.all([
      Subscription.checkLimit(session.user.id as any, 'projects'),
      Subscription.checkLimit(session.user.id as any, 'discussions'),
      Subscription.checkLimit(session.user.id as any, 'messages'),
    ])

    // 获取支付历史
    const payments = await Payment.getUserPayments(session.user.id as any, {
      limit: 10,
    })

    // 如果有 Stripe 订阅，获取额外信息
    let stripeInfo = null
    let invoices: Array<{
      id: string
      amount: number
      status: string
      date: Date
      invoiceUrl?: string
    }> = []
    let upcomingInvoice = null

    if (subscription.stripeSubscriptionId) {
      try {
        const stripeSub = await getSubscription(subscription.stripeSubscriptionId)
        stripeInfo = {
          currentPeriodEnd: new Date((stripeSub as any).current_period_end * 1000),
          cancelAtPeriodEnd: stripeSub.cancel_at_period_end,
        }
      } catch (err) {
        console.error('Failed to get Stripe subscription:', err)
      }

      if (subscription.stripeCustomerId) {
        try {
          const stripeInvoices = await getInvoices(subscription.stripeCustomerId, 5)
          invoices = stripeInvoices.map((inv) => ({
            id: inv.id,
            amount: (inv.amount_paid || 0) / 100,
            status: inv.status || 'unknown',
            date: new Date(inv.created * 1000),
            invoiceUrl: inv.hosted_invoice_url || undefined,
          }))

          upcomingInvoice = await getUpcomingInvoice(subscription.stripeCustomerId)
        } catch (err) {
          console.error('Failed to get invoices:', err)
        }
      }
    }

    return NextResponse.json({
      success: true,
      subscription: {
        id: subscription._id.toString(),
        plan: subscription.plan,
        planName: planFeatures.name,
        planNameCn: planFeatures.nameCn,
        status: subscription.status,
        billingCycle: subscription.billingCycle,
        currentPeriodStart: subscription.currentPeriodStart,
        currentPeriodEnd: subscription.currentPeriodEnd,
        cancelAtPeriodEnd: subscription.cancelAtPeriodEnd,
        trialEnd: subscription.trialEnd,
        features: planFeatures.features,
        price: subscription.billingCycle === 'yearly'
          ? planFeatures.priceYearly
          : planFeatures.price,
      },
      usage: {
        projects: projectsLimit,
        discussions: discussionsLimit,
        messages: messagesLimit,
      },
      payments: payments.map((p) => ({
        id: p._id.toString(),
        amount: p.amount,
        currency: p.currency,
        status: p.status,
        description: p.description,
        paidAt: p.paidAt,
        receiptUrl: p.receiptUrl,
      })),
      invoices,
      upcomingInvoice: upcomingInvoice
        ? {
            amount: (upcomingInvoice.amount_due || 0) / 100,
            dueDate: upcomingInvoice.due_date
              ? new Date(upcomingInvoice.due_date * 1000)
              : null,
          }
        : null,
      stripeInfo,
    })
  } catch (error) {
    console.error('Failed to get subscription:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

/**
 * PATCH /api/subscriptions
 * 更新订阅 (取消/恢复)
 */
export async function PATCH(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    await connectDB()
    const body = await req.json()
    const { action } = body

    const subscription = await Subscription.findOne({ userId: session.user.id })
    if (!subscription) {
      return NextResponse.json(
        { error: 'Subscription not found' },
        { status: 404 }
      )
    }

    if (!subscription.stripeSubscriptionId) {
      return NextResponse.json(
        { error: 'No active Stripe subscription' },
        { status: 400 }
      )
    }

    switch (action) {
      case 'cancel': {
        // 在周期结束时取消
        await cancelSubscriptionAtPeriodEnd(subscription.stripeSubscriptionId)
        subscription.cancelAtPeriodEnd = true
        await subscription.save()

        return NextResponse.json({
          success: true,
          message: '订阅将在当前周期结束后取消',
        })
      }

      case 'resume': {
        // 恢复已取消的订阅
        await resumeSubscription(subscription.stripeSubscriptionId)
        subscription.cancelAtPeriodEnd = false
        subscription.canceledAt = undefined
        subscription.cancelReason = undefined
        await subscription.save()

        return NextResponse.json({
          success: true,
          message: '订阅已恢复',
        })
      }

      default:
        return NextResponse.json(
          { error: 'Invalid action' },
          { status: 400 }
        )
    }
  } catch (error) {
    console.error('Failed to update subscription:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
