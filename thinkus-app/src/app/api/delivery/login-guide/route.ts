import { NextRequest, NextResponse } from 'next/server'
import {
  firstLoginGuard,
  type LoginCredentials,
} from '@/lib/services'

/**
 * GET /api/delivery/login-guide?sessionId=xxx
 * 获取登录引导会话
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

    const session = firstLoginGuard.getSession(sessionId)

    if (!session) {
      return NextResponse.json(
        { error: '未找到登录引导会话' },
        { status: 404 }
      )
    }

    return NextResponse.json({
      success: true,
      data: session
    })
  } catch (error) {
    console.error('获取登录引导失败:', error)
    return NextResponse.json(
      { error: '获取登录引导失败' },
      { status: 500 }
    )
  }
}

/**
 * POST /api/delivery/login-guide
 * 创建或操作登录引导会话
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { action, projectId, userId, credentials, sessionId } = body

    // 创建登录引导会话
    if (action === 'create') {
      if (!projectId || !userId || !credentials) {
        return NextResponse.json(
          { error: '缺少必要参数' },
          { status: 400 }
        )
      }

      const session = firstLoginGuard.createSession(
        projectId,
        userId,
        credentials as LoginCredentials
      )

      return NextResponse.json({
        success: true,
        data: session,
        message: '登录引导会话已创建'
      })
    }

    // 需要 sessionId 的操作
    if (!sessionId) {
      return NextResponse.json(
        { error: '缺少 sessionId' },
        { status: 400 }
      )
    }

    // 完成步骤
    if (action === 'completeStep') {
      const session = firstLoginGuard.completeStep(sessionId)

      return NextResponse.json({
        success: true,
        data: session,
        message: '步骤已完成'
      })
    }

    // 记录登录失败
    if (action === 'recordFailure') {
      const session = firstLoginGuard.recordLoginFailure(sessionId, body.reason || 'unknown')

      return NextResponse.json({
        success: true,
        data: session,
        message: '已记录登录失败'
      })
    }

    // 标记登录成功
    if (action === 'markSuccess') {
      const session = firstLoginGuard.markLoginSuccess(sessionId)

      return NextResponse.json({
        success: true,
        data: session,
        message: '登录成功！'
      })
    }

    // 重置密码
    if (action === 'resetPassword') {
      const result = await firstLoginGuard.resetPassword(sessionId)

      return NextResponse.json({
        success: true,
        data: result,
        message: '密码重置链接已发送'
      })
    }

    // 请求支持
    if (action === 'requestSupport') {
      const result = await firstLoginGuard.requestSupport(sessionId, body.issue || '登录问题')

      return NextResponse.json({
        success: true,
        data: result,
        message: '已提交支持请求'
      })
    }

    return NextResponse.json(
      { error: '未知操作' },
      { status: 400 }
    )
  } catch (error) {
    console.error('登录引导操作失败:', error)
    return NextResponse.json(
      { error: '登录引导操作失败' },
      { status: 500 }
    )
  }
}
