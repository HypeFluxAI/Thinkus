import { NextRequest, NextResponse } from 'next/server'
import { connectDB } from '@/lib/db/connect'
import { runMemoryMaintenance } from '@/lib/services/memory-maintenance-service'

/**
 * POST /api/cron/memory-maintenance
 * 执行记忆维护（老化和清理）
 *
 * 此端点应由外部 cron 服务调用
 * 建议每天执行一次（如凌晨 3 点）
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

    // 执行记忆维护
    const result = await runMemoryMaintenance()

    // 注意：如果使用 Pinecone，需要在这里删除向量
    // 可以通过 result.cleaned.vectorIds 获取需要删除的向量 ID
    // const pinecone = new Pinecone()
    // const index = pinecone.index('memories')
    // await index.deleteMany(result.cleaned.vectorIds)

    return NextResponse.json({
      success: true,
      ...result,
    })
  } catch (error) {
    console.error('Failed to run memory maintenance:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

/**
 * GET /api/cron/memory-maintenance
 * 健康检查端点
 */
export async function GET() {
  return NextResponse.json({
    status: 'ok',
    description: 'Memory maintenance cron endpoint',
    schedule: 'Recommended: daily at 3 AM (0 3 * * *)',
    operations: [
      'Age memories (reduce importance for inactive memories)',
      'Cleanup expired/low-value memories',
      'Note: Pinecone vectors should be cleaned after this',
    ],
  })
}
