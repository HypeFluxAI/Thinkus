import { NextRequest, NextResponse } from 'next/server'
import {
  acceptanceTimeoutHandler,
  type TimeoutConfig,
} from '@/lib/services'

/**
 * GET /api/delivery/acceptance?sessionId=xxx
 * 获取验收会话状态
 */
export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams
    const sessionId = searchParams.get('sessionId')

    if (!sessionId) {
      return NextResponse.json(
        { error: '缺少 sessionId 参数' },
        { status: 400 }
      )
    }

    const session = acceptanceTimeoutHandler.getSession(sessionId)

    if (!session) {
      return NextResponse.json(
        { error: '未找到验收会话' },
        { status: 404 }
      )
    }

    return NextResponse.json({
      success: true,
      data: session
    })
  } catch (error) {
    console.error('获取验收会话失败:', error)
    return NextResponse.json(
      { error: '获取验收会话失败' },
      { status: 500 }
    )
  }
}

/**
 * POST /api/delivery/acceptance
 * 创建或操作验收会话
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { action, projectId, userId, sessionId, itemId, config } = body

    // 创建验收会话
    if (action === 'create') {
      if (!projectId || !userId) {
        return NextResponse.json(
          { error: '缺少 projectId 或 userId' },
          { status: 400 }
        )
      }

      const session = acceptanceTimeoutHandler.createSession(
        projectId,
        userId,
        config as Partial<TimeoutConfig>
      )

      return NextResponse.json({
        success: true,
        data: session,
        message: '验收会话已创建'
      })
    }

    // 需要 sessionId 的操作
    if (!sessionId) {
      return NextResponse.json(
        { error: '缺少 sessionId' },
        { status: 400 }
      )
    }

    // 开始倒计时
    if (action === 'start') {
      const session = acceptanceTimeoutHandler.startCountdown(sessionId, {
        onWarning: (s) => console.log('验收警告:', s.id),
        onFinalWarning: (s) => console.log('验收最终警告:', s.id),
        onTimeout: (s) => console.log('验收超时:', s.id),
        onComplete: (s) => console.log('验收完成:', s.id),
      })

      return NextResponse.json({
        success: true,
        data: session,
        message: '倒计时已开始'
      })
    }

    // 完成检查项
    if (action === 'completeItem' && itemId) {
      const session = acceptanceTimeoutHandler.completeItem(sessionId, itemId)

      return NextResponse.json({
        success: true,
        data: session,
        message: '检查项已完成'
      })
    }

    // 延长时间
    if (action === 'extend') {
      const extraMs = body.extraMs || 2 * 60 * 1000 // 默认延长2分钟
      const session = acceptanceTimeoutHandler.extendTime(sessionId, extraMs)

      return NextResponse.json({
        success: true,
        data: session,
        message: '时间已延长'
      })
    }

    // 完成验收
    if (action === 'complete') {
      const session = acceptanceTimeoutHandler.completeAcceptance(sessionId)

      return NextResponse.json({
        success: true,
        data: session,
        message: '验收已完成'
      })
    }

    // 升级到人工
    if (action === 'escalate') {
      const session = acceptanceTimeoutHandler.escalateToHuman(sessionId, body.reason || '用户请求')

      return NextResponse.json({
        success: true,
        data: session,
        message: '已转接人工处理'
      })
    }

    return NextResponse.json(
      { error: '未知操作' },
      { status: 400 }
    )
  } catch (error) {
    console.error('验收操作失败:', error)
    return NextResponse.json(
      { error: '验收操作失败' },
      { status: 500 }
    )
  }
}
