import { NextRequest, NextResponse } from 'next/server'
import { connectDB } from '@/lib/db/connect'
import { runScheduledStandups } from '@/lib/services/standup-service'

/**
 * POST /api/cron/standups
 * 执行到期的自动例会
 *
 * 此端点应由外部 cron 服务调用（如 Vercel Cron、GitHub Actions 等）
 * 建议每小时执行一次
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

    // 执行到期的例会
    const result = await runScheduledStandups()

    return NextResponse.json({
      success: true,
      ...result,
      timestamp: new Date().toISOString(),
    })
  } catch (error) {
    console.error('Failed to run scheduled standups:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

/**
 * GET /api/cron/standups
 * 健康检查端点
 */
export async function GET() {
  return NextResponse.json({
    status: 'ok',
    description: 'Standup cron endpoint',
    schedule: 'Recommended: every hour (0 * * * *)',
  })
}
