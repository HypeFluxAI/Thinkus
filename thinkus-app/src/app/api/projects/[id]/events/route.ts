import { NextRequest } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth/options'
import { connectDB } from '@/lib/db/connect'
import Project from '@/lib/db/models/project'
import { realtimeStream, createSSEStream } from '@/lib/services/realtime-stream'

/**
 * GET /api/projects/[id]/events
 * SSE 实时事件流 - 推送开发进度、代码变更、AI 状态等
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions)

    if (!session?.user?.id) {
      return new Response(JSON.stringify({ error: '未授权' }), {
        status: 401,
        headers: { 'Content-Type': 'application/json' },
      })
    }

    const { id: projectId } = await params

    await connectDB()

    // 验证项目归属
    const project = await Project.findById(projectId).lean()

    if (!project) {
      return new Response(JSON.stringify({ error: '项目不存在' }), {
        status: 404,
        headers: { 'Content-Type': 'application/json' },
      })
    }

    if (project.userId.toString() !== session.user.id) {
      return new Response(JSON.stringify({ error: '无权访问' }), {
        status: 403,
        headers: { 'Content-Type': 'application/json' },
      })
    }

    // 创建 SSE 流
    const { stream } = createSSEStream(projectId, () => {
      console.log(`[SSE] Client disconnected from project ${projectId}`)
    })

    return new Response(stream, {
      headers: {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache, no-transform',
        'Connection': 'keep-alive',
        'X-Accel-Buffering': 'no',
      },
    })

  } catch (error) {
    console.error('[Events SSE] Error:', error)
    return new Response(JSON.stringify({ error: '连接失败' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    })
  }
}

// 禁用动态路由缓存
export const dynamic = 'force-dynamic'
