import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import mongoose from 'mongoose'
import { authOptions } from '@/lib/auth/options'
import { Subscription } from '@/lib/db/models'
import dbConnect from '@/lib/db/connection'
import { getCustomerInvoices } from '@/lib/stripe/config'

// GET /api/subscription/invoices - 获取 Stripe 发票列表
export async function GET(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { searchParams } = new URL(req.url)
    const limit = Math.min(parseInt(searchParams.get('limit') || '10'), 50)

    await dbConnect()
    const userId = new mongoose.Types.ObjectId(session.user.id)

    // 获取订阅
    const subscription = await Subscription.findOne({ userId })
    if (!subscription?.stripeCustomerId) {
      return NextResponse.json({
        invoices: [],
        message: 'No billing history available',
      })
    }

    // 从 Stripe 获取发票
    const stripeInvoices = await getCustomerInvoices(
      subscription.stripeCustomerId,
      limit
    )

    // 格式化发票数据
    const invoices = stripeInvoices.map(inv => {
      const invoice = inv as unknown as {
        id: string
        number: string | null
        status: string | null
        amount_paid: number
        amount_due: number
        currency: string
        description: string | null
        hosted_invoice_url: string | null
        invoice_pdf: string | null
        period_start: number | null
        period_end: number | null
        created: number
        due_date: number | null
        paid: boolean
        status_transitions?: { paid_at: number | null }
      }
      return {
        id: invoice.id,
        number: invoice.number,
        status: invoice.status,
        amount: invoice.amount_paid / 100,
        amountDue: invoice.amount_due / 100,
        currency: invoice.currency,
        description: invoice.description || `Invoice ${invoice.number}`,
        hostedInvoiceUrl: invoice.hosted_invoice_url,
        invoicePdf: invoice.invoice_pdf,
        periodStart: invoice.period_start
          ? new Date(invoice.period_start * 1000)
          : null,
        periodEnd: invoice.period_end
          ? new Date(invoice.period_end * 1000)
          : null,
        created: new Date(invoice.created * 1000),
        dueDate: invoice.due_date ? new Date(invoice.due_date * 1000) : null,
        paid: invoice.paid,
        paidAt: invoice.status_transitions?.paid_at
          ? new Date(invoice.status_transitions.paid_at * 1000)
          : null,
      }
    })

    return NextResponse.json({
      invoices,
      hasMore: stripeInvoices.length === limit,
    })
  } catch (error) {
    console.error('Get invoices error:', error)
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 })
  }
}
