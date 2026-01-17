import { NextRequest } from 'next/server'
import {
  realtimeProgressDashboard,
  acceptanceTimeoutHandler,
  errorAutoFixTree,
} from '@/lib/services'

/**
 * GET /api/delivery/stream?projectId=xxx
 * SSE 实时交付更新流
 */
export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams
  const projectId = searchParams.get('projectId')

  if (!projectId) {
    return new Response('Missing projectId', { status: 400 })
  }

  // 创建 SSE 响应
  const encoder = new TextEncoder()
  let intervalId: NodeJS.Timeout | null = null

  const stream = new ReadableStream({
    start(controller) {
      // 发送初始连接消息
      const sendEvent = (event: string, data: unknown) => {
        const message = `event: ${event}\ndata: ${JSON.stringify(data)}\n\n`
        controller.enqueue(encoder.encode(message))
      }

      // 初始数据
      const progressSession = realtimeProgressDashboard.getSession(projectId)
      if (progressSession) {
        sendEvent('progress', progressSession)
      }

      // 发送心跳和更新
      intervalId = setInterval(() => {
        try {
          // 进度更新
          const currentProgress = realtimeProgressDashboard.getSession(projectId)
          if (currentProgress) {
            sendEvent('progress', currentProgress)
          }

          // 检查验收会话
          // 注意：这里需要根据实际的会话ID来获取
          // 简化处理，只推送进度更新

          // 心跳
          sendEvent('heartbeat', { timestamp: Date.now() })
        } catch (error) {
          console.error('SSE 推送错误:', error)
        }
      }, 2000) // 每2秒更新一次

      // 发送连接成功消息
      sendEvent('connected', {
        projectId,
        timestamp: Date.now(),
        message: '已连接到实时更新流'
      })
    },

    cancel() {
      // 客户端断开连接时清理
      if (intervalId) {
        clearInterval(intervalId)
      }
    }
  })

  return new Response(stream, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      'Connection': 'keep-alive',
    },
  })
}
