import { NextRequest, NextResponse } from 'next/server'
import { connectDB } from '@/lib/db/connect'
import { processAutoDecisions } from '@/lib/services/decision-service'

/**
 * POST /api/cron/decisions
 * 处理可自动执行的决策
 *
 * 此端点应由外部 cron 服务调用（如 Vercel Cron、GitHub Actions 等）
 * 建议每 5 分钟执行一次
 */
export async function POST(req: NextRequest) {
  try {
    // 验证 cron secret
    const authHeader = req.headers.get('authorization')
    const cronSecret = process.env.CRON_SECRET

    if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    await connectDB()

    // 处理自动决策
    const result = await processAutoDecisions()

    return NextResponse.json({
      success: true,
      ...result,
      timestamp: new Date().toISOString(),
    })
  } catch (error) {
    console.error('Failed to process auto decisions:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

/**
 * GET /api/cron/decisions
 * 健康检查端点
 */
export async function GET() {
  return NextResponse.json({
    status: 'ok',
    description: 'Decision auto-execution cron endpoint',
    schedule: 'Recommended: every 5 minutes (*/5 * * * *)',
    levels: {
      L0: 'Low importance - Auto approve & execute immediately',
      L1: 'Medium importance - Auto approve after 5min, execute after 2min',
      L2: 'High importance - Requires user confirmation',
      L3: 'Critical - Requires user deep involvement',
    },
  })
}
