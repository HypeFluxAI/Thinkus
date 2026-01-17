import { NextRequest } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth/config'
import dbConnect from '@/lib/db/connection'
import { DeliverySession, DeliveryEvent, Project } from '@/lib/db/models'

// SSE 实时交付进度推送
// 允许前端订阅交付进度更新

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

// 存储活跃的 SSE 连接
const activeConnections = new Map<string, Set<ReadableStreamDefaultController>>()

// 广播消息到所有订阅者
export function broadcastDeliveryProgress(projectId: string, data: unknown) {
  const connections = activeConnections.get(projectId)
  if (connections) {
    const message = `data: ${JSON.stringify(data)}\n\n`
    const encoder = new TextEncoder()
    connections.forEach((controller) => {
      try {
        controller.enqueue(encoder.encode(message))
      } catch {
        // 连接已关闭，忽略
      }
    })
  }
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ projectId: string }> }
) {
  const { projectId } = await params

  // 验证用户身份
  const session = await getServerSession(authOptions)
  if (!session?.user?.id) {
    return new Response(JSON.stringify({ error: '未授权' }), {
      status: 401,
      headers: { 'Content-Type': 'application/json' },
    })
  }

  await dbConnect()

  // 验证项目权限
  const project = await Project.findById(projectId)
  if (!project || project.userId.toString() !== session.user.id) {
    return new Response(JSON.stringify({ error: '项目不存在或无权限' }), {
      status: 403,
      headers: { 'Content-Type': 'application/json' },
    })
  }

  // 获取当前交付会话
  const deliverySession = await DeliverySession.findOne({ projectId }).sort({ createdAt: -1 })

  // 创建 SSE 流
  const stream = new ReadableStream({
    start: async (controller) => {
      const encoder = new TextEncoder()

      // 添加到活跃连接
      if (!activeConnections.has(projectId)) {
        activeConnections.set(projectId, new Set())
      }
      activeConnections.get(projectId)!.add(controller)

      // 发送初始状态
      const initialData = {
        type: 'init',
        timestamp: new Date().toISOString(),
        session: deliverySession ? {
          id: deliverySession._id.toString(),
          stage: deliverySession.stage,
          status: deliverySession.status,
          progress: deliverySession.progress,
          currentTask: deliverySession.currentTask,
          outputs: deliverySession.outputs,
          startedAt: deliverySession.startedAt,
          estimatedCompletion: deliverySession.estimatedCompletion,
        } : null,
      }

      controller.enqueue(encoder.encode(`data: ${JSON.stringify(initialData)}\n\n`))

      // 发送最近的事件
      if (deliverySession) {
        const recentEvents = await DeliveryEvent.find({ sessionId: deliverySession._id })
          .sort({ timestamp: -1 })
          .limit(20)

        const eventsData = {
          type: 'recent_events',
          events: recentEvents.map((e) => ({
            id: e._id.toString(),
            type: e.eventType,
            stage: e.stage,
            message: e.message,
            timestamp: e.timestamp,
            level: e.level,
          })),
        }

        controller.enqueue(encoder.encode(`data: ${JSON.stringify(eventsData)}\n\n`))
      }

      // 心跳保持连接
      const heartbeatInterval = setInterval(() => {
        try {
          controller.enqueue(encoder.encode(`: heartbeat\n\n`))
        } catch {
          clearInterval(heartbeatInterval)
        }
      }, 30000) // 30秒心跳

      // 定期轮询数据库更新
      const pollInterval = setInterval(async () => {
        try {
          const currentSession = await DeliverySession.findOne({ projectId }).sort({ createdAt: -1 })
          if (currentSession) {
            // 检查是否有更新
            const lastEventTime = deliverySession?.updatedAt || new Date(0)
            const newEvents = await DeliveryEvent.find({
              sessionId: currentSession._id,
              timestamp: { $gt: lastEventTime },
            }).sort({ timestamp: 1 })

            // 发送新事件
            for (const event of newEvents) {
              const eventData = {
                type: 'event',
                event: {
                  id: event._id.toString(),
                  type: event.eventType,
                  stage: event.stage,
                  message: event.message,
                  timestamp: event.timestamp,
                  level: event.level,
                  data: event.data,
                },
              }
              controller.enqueue(encoder.encode(`data: ${JSON.stringify(eventData)}\n\n`))
            }

            // 发送阶段更新
            if (currentSession.stage !== deliverySession?.stage ||
                currentSession.progress !== deliverySession?.progress) {
              const stageData = {
                type: 'stage_update',
                stage: currentSession.stage,
                status: currentSession.status,
                progress: currentSession.progress,
                currentTask: currentSession.currentTask,
                outputs: currentSession.outputs,
              }
              controller.enqueue(encoder.encode(`data: ${JSON.stringify(stageData)}\n\n`))
            }

            // 检查是否完成
            if (currentSession.status === 'completed' || currentSession.status === 'failed') {
              const completeData = {
                type: 'complete',
                status: currentSession.status,
                outputs: currentSession.outputs,
                completedAt: currentSession.completedAt,
                error: currentSession.error,
              }
              controller.enqueue(encoder.encode(`data: ${JSON.stringify(completeData)}\n\n`))
              clearInterval(pollInterval)
              clearInterval(heartbeatInterval)
              controller.close()
            }
          }
        } catch (error) {
          console.error('[SSE] Poll error:', error)
        }
      }, 2000) // 2秒轮询

      // 清理函数
      request.signal.addEventListener('abort', () => {
        clearInterval(heartbeatInterval)
        clearInterval(pollInterval)
        activeConnections.get(projectId)?.delete(controller)
        if (activeConnections.get(projectId)?.size === 0) {
          activeConnections.delete(projectId)
        }
      })
    },
  })

  return new Response(stream, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache, no-transform',
      'Connection': 'keep-alive',
      'X-Accel-Buffering': 'no',
    },
  })
}
