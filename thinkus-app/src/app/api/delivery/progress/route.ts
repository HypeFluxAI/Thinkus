import { NextRequest, NextResponse } from 'next/server'
import {
  realtimeProgressDashboard,
  type ProgressStage,
} from '@/lib/services'

/**
 * GET /api/delivery/progress?projectId=xxx
 * 获取项目交付进度
 */
export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams
    const projectId = searchParams.get('projectId')

    if (!projectId) {
      return NextResponse.json(
        { error: '缺少 projectId 参数' },
        { status: 400 }
      )
    }

    const session = realtimeProgressDashboard.getSession(projectId)

    if (!session) {
      return NextResponse.json(
        { error: '未找到进度会话' },
        { status: 404 }
      )
    }

    return NextResponse.json({
      success: true,
      data: session
    })
  } catch (error) {
    console.error('获取进度失败:', error)
    return NextResponse.json(
      { error: '获取进度失败' },
      { status: 500 }
    )
  }
}

/**
 * POST /api/delivery/progress
 * 创建或更新进度会话
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { projectId, projectName, action, stage, progress, message } = body

    if (!projectId) {
      return NextResponse.json(
        { error: '缺少 projectId 参数' },
        { status: 400 }
      )
    }

    let session = realtimeProgressDashboard.getSession(projectId)

    // 创建新会话
    if (action === 'create' || !session) {
      session = realtimeProgressDashboard.createSession(projectId, projectName || '项目')
      return NextResponse.json({
        success: true,
        data: session,
        message: '进度会话已创建'
      })
    }

    // 更新阶段
    if (action === 'updateStage' && stage) {
      session = realtimeProgressDashboard.updateStage(projectId, stage as ProgressStage)
      return NextResponse.json({
        success: true,
        data: session,
        message: '阶段已更新'
      })
    }

    // 更新进度
    if (action === 'updateProgress' && typeof progress === 'number') {
      session = realtimeProgressDashboard.updateProgress(projectId, progress)
      return NextResponse.json({
        success: true,
        data: session,
        message: '进度已更新'
      })
    }

    // 添加事件
    if (action === 'addEvent' && message) {
      session = realtimeProgressDashboard.addEvent(projectId, message, body.isError || false)
      return NextResponse.json({
        success: true,
        data: session,
        message: '事件已添加'
      })
    }

    return NextResponse.json({
      success: true,
      data: session
    })
  } catch (error) {
    console.error('更新进度失败:', error)
    return NextResponse.json(
      { error: '更新进度失败' },
      { status: 500 }
    )
  }
}
