import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth/config'
import dbConnect from '@/lib/db/connection'
import { DeliverySession, DeliveryEvent, AcceptanceSession, DeliveryReport, Project } from '@/lib/db/models'

// GET /api/delivery/[projectId] - 获取交付状态
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ projectId: string }> }
) {
  const { projectId } = await params

  const session = await getServerSession(authOptions)
  if (!session?.user?.id) {
    return NextResponse.json({ error: '未授权' }, { status: 401 })
  }

  await dbConnect()

  // 验证项目权限
  const project = await Project.findById(projectId)
  if (!project || project.userId.toString() !== session.user.id) {
    return NextResponse.json({ error: '项目不存在或无权限' }, { status: 403 })
  }

  // 获取最新交付会话
  const deliverySession = await DeliverySession.findOne({ projectId }).sort({ createdAt: -1 })
  if (!deliverySession) {
    return NextResponse.json({ error: '未找到交付会话' }, { status: 404 })
  }

  // 获取最近事件
  const recentEvents = await DeliveryEvent.find({ sessionId: deliverySession._id })
    .sort({ timestamp: -1 })
    .limit(50)

  // 获取验收会话
  const acceptanceSession = await AcceptanceSession.findOne({
    deliverySessionId: deliverySession._id
  })

  // 获取交付报告
  const deliveryReport = await DeliveryReport.findOne({
    deliverySessionId: deliverySession._id
  })

  return NextResponse.json({
    session: {
      id: deliverySession._id.toString(),
      projectId: deliverySession.projectId.toString(),
      stage: deliverySession.stage,
      status: deliverySession.status,
      progress: deliverySession.progress,
      currentTask: deliverySession.currentTask,
      outputs: deliverySession.outputs,
      config: deliverySession.config,
      startedAt: deliverySession.startedAt,
      completedAt: deliverySession.completedAt,
      estimatedCompletion: deliverySession.estimatedCompletion,
      error: deliverySession.error,
    },
    events: recentEvents.map((e) => ({
      id: e._id.toString(),
      type: e.eventType,
      stage: e.stage,
      message: e.message,
      timestamp: e.timestamp,
      level: e.level,
      data: e.data,
    })),
    acceptance: acceptanceSession ? {
      id: acceptanceSession._id.toString(),
      status: acceptanceSession.status,
      items: acceptanceSession.items,
      issues: acceptanceSession.issues,
      startedAt: acceptanceSession.startedAt,
      completedAt: acceptanceSession.completedAt,
      signature: acceptanceSession.signature,
    } : null,
    report: deliveryReport ? {
      id: deliveryReport._id.toString(),
      status: deliveryReport.status,
      accessCode: deliveryReport.accessCode,
      viewUrl: `/delivery/report/${deliveryReport._id}`,
    } : null,
  })
}
