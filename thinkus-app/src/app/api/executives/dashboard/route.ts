import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { connectDB } from '@/lib/db/connect'
import { Decision } from '@/lib/db/models/decision'
import { Discussion } from '@/lib/db/models/discussion'
import { Project } from '@/lib/db/models/project'

/**
 * GET /api/executives/dashboard
 * 获取高管仪表盘数据
 */
export async function GET(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    await connectDB()
    const userId = session.user.id

    // 获取待确认的决策 (L2_CONFIRM 和 L3_CRITICAL)
    const pendingDecisions = await Decision.find({
      userId,
      status: 'proposed',
      level: { $in: ['L2_CONFIRM', 'L3_CRITICAL'] },
    })
      .sort({ createdAt: -1 })
      .limit(10)
      .lean()

    // 获取进行中的讨论
    const activeDiscussions = await Discussion.find({
      userId,
      status: 'active',
    })
      .sort({ updatedAt: -1 })
      .limit(5)
      .lean()

    // 获取项目名称映射
    const projectIds = [
      ...pendingDecisions.map(d => d.projectId),
      ...activeDiscussions.map(d => d.projectId),
    ].filter(Boolean)

    const projects = await Project.find({
      _id: { $in: projectIds },
    })
      .select('name')
      .lean()

    const projectMap = new Map(
      projects.map(p => [p._id.toString(), p.name])
    )

    // 格式化决策数据
    const formattedDecisions = pendingDecisions.map(d => ({
      id: d._id.toString(),
      title: d.title,
      description: d.description,
      level: d.level,
      proposedBy: d.proposedBy,
      proposedAction: d.proposedAction,
      riskFactors: d.riskFactors,
      projectId: d.projectId?.toString(),
      projectName: d.projectId ? projectMap.get(d.projectId.toString()) : undefined,
      createdAt: d.createdAt,
      expiresAt: d.expiresAt,
    }))

    // 格式化讨论数据
    const formattedDiscussions = activeDiscussions.map(d => ({
      id: d._id.toString(),
      topic: d.topic,
      projectId: d.projectId?.toString(),
      projectName: d.projectId ? projectMap.get(d.projectId.toString()) : undefined,
      participants: d.participants || [],
      currentRound: d.currentRound || 0,
      status: d.status,
      startedAt: d.createdAt,
    }))

    // 获取数据告警（从项目的监控数据中提取）
    // TODO: 实现数据感知引擎的告警存储
    const dataAlerts: any[] = []

    // 获取定时任务
    // TODO: 实现定时任务存储
    const scheduledTasks: any[] = []

    // 统计数据
    const stats = {
      pendingDecisions: formattedDecisions.length,
      activeDiscussions: formattedDiscussions.length,
      criticalAlerts: dataAlerts.filter(a =>
        a.severity === 'high' || a.severity === 'critical'
      ).length,
      activeExecutives: 18, // 固定18位高管
    }

    return NextResponse.json({
      success: true,
      data: {
        stats,
        pendingDecisions: formattedDecisions,
        activeDiscussions: formattedDiscussions,
        dataAlerts,
        scheduledTasks,
      },
    })
  } catch (error) {
    console.error('Failed to fetch executive dashboard:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

/**
 * POST /api/executives/dashboard
 * 执行高管操作（批准/拒绝决策等）
 */
export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    await connectDB()
    const userId = session.user.id
    const body = await req.json()

    const { action, decisionId, notes, reason } = body

    if (!action || !decisionId) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      )
    }

    // 验证决策存在且属于当前用户
    const decision = await Decision.findOne({
      _id: decisionId,
      userId,
    })

    if (!decision) {
      return NextResponse.json(
        { error: 'Decision not found' },
        { status: 404 }
      )
    }

    switch (action) {
      case 'approve':
        decision.status = 'approved'
        decision.approvedAt = new Date()
        decision.approvalNotes = notes
        await decision.save()

        // TODO: 触发执行追踪引擎
        // await executionTracking.createTask(decision)

        return NextResponse.json({
          success: true,
          message: '决策已批准',
          decision: {
            id: decision._id.toString(),
            status: decision.status,
          },
        })

      case 'reject':
        decision.status = 'rejected'
        decision.rejectedAt = new Date()
        decision.rejectionReason = reason || notes
        await decision.save()

        return NextResponse.json({
          success: true,
          message: '决策已拒绝',
          decision: {
            id: decision._id.toString(),
            status: decision.status,
          },
        })

      case 'defer':
        // 延长过期时间48小时
        const newExpiry = new Date()
        newExpiry.setHours(newExpiry.getHours() + 48)
        decision.expiresAt = newExpiry
        await decision.save()

        return NextResponse.json({
          success: true,
          message: '已延长决策期限',
          decision: {
            id: decision._id.toString(),
            expiresAt: decision.expiresAt,
          },
        })

      default:
        return NextResponse.json(
          { error: 'Invalid action' },
          { status: 400 }
        )
    }
  } catch (error) {
    console.error('Failed to process executive action:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
