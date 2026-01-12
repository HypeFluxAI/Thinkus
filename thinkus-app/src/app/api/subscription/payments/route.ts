import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import mongoose from 'mongoose'
import { authOptions } from '@/lib/auth/options'
import { Payment } from '@/lib/db/models'
import dbConnect from '@/lib/db/connection'

// GET /api/subscription/payments - 获取支付历史
export async function GET(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { searchParams } = new URL(req.url)
    const limit = Math.min(parseInt(searchParams.get('limit') || '20'), 100)
    const skip = parseInt(searchParams.get('skip') || '0')
    const status = searchParams.get('status') as 'pending' | 'processing' | 'succeeded' | 'failed' | 'refunded' | 'canceled' | null
    const type = searchParams.get('type') as 'subscription' | 'one_time' | 'addon' | null

    await dbConnect()
    const userId = new mongoose.Types.ObjectId(session.user.id)

    // 构建查询条件
    const query: Record<string, unknown> = { userId }
    if (status) {
      query.status = status
    }
    if (type) {
      query.type = type
    }

    // 获取支付记录
    const [payments, total, totalSpent] = await Promise.all([
      Payment.find(query)
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .lean(),
      Payment.countDocuments(query),
      Payment.getTotalSpent(userId),
    ])

    return NextResponse.json({
      payments: payments.map(p => ({
        id: p._id.toString(),
        amount: p.amount,
        currency: p.currency,
        status: p.status,
        type: p.type,
        description: p.description,
        invoiceNumber: p.invoiceNumber,
        invoiceUrl: p.invoiceUrl,
        receiptUrl: p.receiptUrl,
        refundedAmount: p.refundedAmount,
        refundedAt: p.refundedAt,
        paidAt: p.paidAt,
        createdAt: p.createdAt,
      })),
      pagination: {
        total,
        limit,
        skip,
        hasMore: skip + payments.length < total,
      },
      summary: {
        totalSpent,
        currency: 'usd',
      },
    })
  } catch (error) {
    console.error('Get payments error:', error)
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 })
  }
}
