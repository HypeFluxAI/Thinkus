import { NextRequest, NextResponse } from 'next/server'
import { connectDB } from '@/lib/db/connect'
import { processUnDistilledConsultations, getDistillationStats } from '@/lib/services/skill-distillation-service'

/**
 * POST /api/cron/skill-distillation
 * 处理待蒸馏的专家咨询，提取可复用技能
 *
 * 此端点应由外部 cron 服务调用
 * 建议每天执行 2-3 次（如早上、下午、晚上各一次）
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

    // 处理待蒸馏的咨询
    const result = await processUnDistilledConsultations(20)

    return NextResponse.json({
      success: true,
      ...result,
      timestamp: new Date().toISOString(),
    })
  } catch (error) {
    console.error('Failed to process skill distillation:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

/**
 * GET /api/cron/skill-distillation
 * 获取技能蒸馏统计
 */
export async function GET() {
  try {
    await connectDB()
    const stats = await getDistillationStats()

    return NextResponse.json({
      status: 'ok',
      description: 'Skill distillation cron endpoint',
      schedule: 'Recommended: 2-3 times daily (0 9,14,21 * * *)',
      stats,
    })
  } catch (error) {
    console.error('Failed to get distillation stats:', error)
    return NextResponse.json({
      status: 'ok',
      description: 'Skill distillation cron endpoint',
      schedule: 'Recommended: 2-3 times daily (0 9,14,21 * * *)',
      stats: null,
      error: 'Failed to load stats',
    })
  }
}
