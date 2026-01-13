import { NextRequest, NextResponse } from 'next/server'
import { connectDB } from '@/lib/db/connect'
import { runScheduledStandups } from '@/lib/services/standup-service'
import { runDistillationJob } from '@/lib/services/skill-distillation'
import { runAutoExecution, DEFAULT_AUTO_EXECUTION_CONFIG } from '@/lib/services/auto-execution-service'
import { Notification, User } from '@/lib/db/models'

// Cron secret for authentication
const CRON_SECRET = process.env.CRON_SECRET

/**
 * GET /api/cron
 * Main cron endpoint - called by external cron service (e.g., Vercel Cron)
 *
 * Query params:
 * - job: 'standups' | 'distillation' | 'cleanup' | 'all'
 *
 * Headers:
 * - Authorization: Bearer <CRON_SECRET>
 */
export async function GET(req: NextRequest) {
  try {
    // Verify cron secret
    const authHeader = req.headers.get('authorization')
    if (CRON_SECRET && authHeader !== `Bearer ${CRON_SECRET}`) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    await connectDB()

    const { searchParams } = new URL(req.url)
    const job = searchParams.get('job') || 'all'

    const results: Record<string, unknown> = {
      timestamp: new Date().toISOString(),
      job,
    }

    // Run scheduled standups
    if (job === 'standups' || job === 'all') {
      try {
        const standupResult = await runScheduledStandups()
        results.standups = {
          success: true,
          ...standupResult,
        }
      } catch (error) {
        console.error('Standup cron error:', error)
        results.standups = {
          success: false,
          error: error instanceof Error ? error.message : 'Unknown error',
        }
      }
    }

    // Run skill distillation
    if (job === 'distillation' || job === 'all') {
      try {
        const distillResult = await runDistillationJob()
        results.distillation = {
          success: true,
          ...distillResult,
        }
      } catch (error) {
        console.error('Distillation cron error:', error)
        results.distillation = {
          success: false,
          error: error instanceof Error ? error.message : 'Unknown error',
        }
      }
    }

    // Cleanup old notifications
    if (job === 'cleanup' || job === 'all') {
      try {
        const deletedCount = await Notification.deleteOldNotifications(30)
        results.cleanup = {
          success: true,
          deletedNotifications: deletedCount,
        }
      } catch (error) {
        console.error('Cleanup cron error:', error)
        results.cleanup = {
          success: false,
          error: error instanceof Error ? error.message : 'Unknown error',
        }
      }
    }

    // Auto-execute low-risk decisions
    if (job === 'auto-execute' || job === 'all') {
      try {
        // Get all users with auto-execution enabled
        const users = await User.find({
          'settings.autoExecution.enabled': true,
        }).select('_id settings.autoExecution').limit(100)

        let totalExecuted = 0
        let totalSkipped = 0

        for (const user of users) {
          const autoExec = user.settings?.autoExecution
          const userConfig = (typeof autoExec === 'object' && autoExec !== null)
            ? autoExec
            : DEFAULT_AUTO_EXECUTION_CONFIG
          const result = await runAutoExecution(
            user._id.toString(),
            undefined,
            userConfig as any
          )
          totalExecuted += result.executed
          totalSkipped += result.skipped
        }

        results.autoExecute = {
          success: true,
          usersProcessed: users.length,
          totalExecuted,
          totalSkipped,
        }
      } catch (error) {
        console.error('Auto-execute cron error:', error)
        results.autoExecute = {
          success: false,
          error: error instanceof Error ? error.message : 'Unknown error',
        }
      }
    }

    return NextResponse.json({
      success: true,
      results,
    })
  } catch (error) {
    console.error('Cron job error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

// Also support POST for webhook-style cron services
export async function POST(req: NextRequest) {
  return GET(req)
}
