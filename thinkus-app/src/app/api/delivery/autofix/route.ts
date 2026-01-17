import { NextRequest, NextResponse } from 'next/server'
import {
  errorAutoFixTree,
} from '@/lib/services'

/**
 * GET /api/delivery/autofix?sessionId=xxx
 * 获取修复会话状态
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

    const session = errorAutoFixTree.getSession(sessionId)

    if (!session) {
      return NextResponse.json(
        { error: '未找到修复会话' },
        { status: 404 }
      )
    }

    return NextResponse.json({
      success: true,
      data: session
    })
  } catch (error) {
    console.error('获取修复会话失败:', error)
    return NextResponse.json(
      { error: '获取修复会话失败' },
      { status: 500 }
    )
  }
}

/**
 * POST /api/delivery/autofix
 * 创建修复会话或执行修复
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { action, projectId, error: errorData, sessionId } = body

    // 分类错误
    if (action === 'classify') {
      if (!errorData) {
        return NextResponse.json(
          { error: '缺少错误信息' },
          { status: 400 }
        )
      }

      const classified = errorAutoFixTree.classifyError(
        errorData.code || 'UNKNOWN',
        errorData.message || '未知错误'
      )

      return NextResponse.json({
        success: true,
        data: classified
      })
    }

    // 创建修复会话
    if (action === 'create') {
      if (!projectId || !errorData) {
        return NextResponse.json(
          { error: '缺少 projectId 或错误信息' },
          { status: 400 }
        )
      }

      // 先分类错误
      const classified = errorAutoFixTree.classifyError(
        errorData.code || 'UNKNOWN',
        errorData.message || '未知错误'
      )

      // 创建修复会话
      const session = errorAutoFixTree.createFixSession(projectId, classified)

      return NextResponse.json({
        success: true,
        data: session,
        message: '修复会话已创建'
      })
    }

    // 需要 sessionId 的操作
    if (!sessionId) {
      return NextResponse.json(
        { error: '缺少 sessionId' },
        { status: 400 }
      )
    }

    // 执行自动修复
    if (action === 'execute') {
      const result = await errorAutoFixTree.executeAutoFix(sessionId, {
        onAttemptStart: (strategy) => {
          console.log('开始尝试:', strategy.humanMessage)
        },
        onAttemptComplete: (result) => {
          console.log('尝试结果:', result.result, result.humanMessage)
        },
        onAllComplete: (session) => {
          console.log('修复完成:', session.status)
        }
      })

      return NextResponse.json({
        success: true,
        data: result,
        message: result.status === 'success' ? '修复成功' : '修复完成'
      })
    }

    // 手动标记成功
    if (action === 'markSuccess') {
      const session = errorAutoFixTree.markAsSuccess(sessionId, body.summary || '手动标记为成功')

      return NextResponse.json({
        success: true,
        data: session,
        message: '已标记为成功'
      })
    }

    // 升级到人工
    if (action === 'escalate') {
      const session = errorAutoFixTree.escalateToHuman(sessionId, body.reason || '自动修复失败')

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
    console.error('修复操作失败:', error)
    return NextResponse.json(
      { error: '修复操作失败' },
      { status: 500 }
    )
  }
}
