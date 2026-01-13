import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { connectDB } from '@/lib/db/connect'
import User from '@/lib/db/models/user'

/**
 * GET /api/settings/automation
 * 获取用户自动化设置
 */
export async function GET() {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    await connectDB()

    const user = await User.findById(session.user.id).select('settings')

    return NextResponse.json({
      success: true,
      settings: user?.settings?.automation || null,
    })
  } catch (error) {
    console.error('Failed to get automation settings:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

/**
 * POST /api/settings/automation
 * 更新用户自动化设置
 */
export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    await connectDB()
    const body = await req.json()
    const { settings } = body

    // 验证设置
    if (!settings) {
      return NextResponse.json(
        { error: 'Settings are required' },
        { status: 400 }
      )
    }

    // 更新用户设置
    await User.findByIdAndUpdate(
      session.user.id,
      {
        $set: {
          'settings.automation': settings,
          'settings.autoExecution': settings.autoExecution,
        },
      },
      { new: true }
    )

    return NextResponse.json({
      success: true,
      message: 'Settings updated',
    })
  } catch (error) {
    console.error('Failed to update automation settings:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
