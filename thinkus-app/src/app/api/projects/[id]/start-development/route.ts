import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth/options'
import { connectDB } from '@/lib/db/connect'
import Project from '@/lib/db/models/project'
import { developmentOrchestrator } from '@/lib/services/development-orchestrator'

/**
 * POST /api/projects/[id]/start-development
 * 启动项目开发流程
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions)

    if (!session?.user?.id) {
      return NextResponse.json(
        { error: '未授权' },
        { status: 401 }
      )
    }

    const { id: projectId } = await params

    await connectDB()

    // 验证项目
    const project = await Project.findById(projectId)

    if (!project) {
      return NextResponse.json(
        { error: '项目不存在' },
        { status: 404 }
      )
    }

    if (project.userId.toString() !== session.user.id) {
      return NextResponse.json(
        { error: '无权访问此项目' },
        { status: 403 }
      )
    }

    // 检查是否已经在开发中
    if (project.phase === 'development') {
      // 获取现有会话
      const existingSession = developmentOrchestrator.getSession(projectId)
      if (existingSession && existingSession.status === 'running') {
        return NextResponse.json({
          success: true,
          message: '开发已在进行中',
          session: {
            status: existingSession.status,
            progress: existingSession.featureResults.length > 0
              ? Math.round((existingSession.currentFeatureIndex / existingSession.featureResults.length) * 100)
              : 0,
            currentFeature: existingSession.featureResults[existingSession.currentFeatureIndex]?.featureName,
          },
        })
      }
    }

    // 检查是否有方案
    if (!project.proposal || !project.proposal.features?.length) {
      return NextResponse.json(
        { error: '项目还没有确认的方案，请先完成专家讨论' },
        { status: 400 }
      )
    }

    // 更新项目状态为开发阶段
    const previousPhase = project.phase

    // 完成当前阶段
    const currentPhaseEntry = project.phaseHistory.find(
      (h: { phase: string; completedAt?: Date }) => h.phase === project.phase && !h.completedAt
    )
    if (currentPhaseEntry) {
      currentPhaseEntry.completedAt = new Date()
    }

    // 开始开发阶段
    project.phase = 'development'
    project.phaseHistory.push({
      phase: 'development',
      startedAt: new Date(),
    })

    // 更新进度
    project.progress = {
      percentage: 0,
      currentStage: '准备开发环境',
      logs: [
        ...(project.progress?.logs || []),
        {
          timestamp: new Date(),
          message: '开发流程已启动',
          type: 'info',
        },
      ],
    }

    await project.save()

    // 启动开发编排器 (异步执行，不阻塞响应)
    developmentOrchestrator.start(projectId, session.user.id).catch(err => {
      console.error('[Start Development] Orchestrator error:', err)
    })

    return NextResponse.json({
      success: true,
      message: '开发已启动',
      projectId,
      previousPhase,
      currentPhase: 'development',
    })

  } catch (error) {
    console.error('[Start Development] Error:', error)
    return NextResponse.json(
      { error: '启动开发失败' },
      { status: 500 }
    )
  }
}

/**
 * GET /api/projects/[id]/start-development
 * 获取开发状态
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions)

    if (!session?.user?.id) {
      return NextResponse.json(
        { error: '未授权' },
        { status: 401 }
      )
    }

    const { id: projectId } = await params

    // 获取会话状态
    const devSession = developmentOrchestrator.getSession(projectId)

    if (!devSession) {
      return NextResponse.json({
        status: 'not_started',
        message: '开发尚未启动',
      })
    }

    const completedFeatures = devSession.featureResults.filter(f => f.status === 'completed' || f.status === 'degraded').length
    const totalFeatures = devSession.featureResults.length
    const progress = totalFeatures > 0 ? Math.round((completedFeatures / totalFeatures) * 100) : 0

    return NextResponse.json({
      status: devSession.status,
      progress,
      currentFeatureIndex: devSession.currentFeatureIndex,
      currentFeature: devSession.featureResults[devSession.currentFeatureIndex]?.featureName,
      totalFeatures,
      completedFeatures,
      startedAt: devSession.startedAt,
      completedAt: devSession.completedAt,
      features: devSession.featureResults.map(f => ({
        id: f.featureId,
        name: f.featureName,
        status: f.status,
        score: f.score,
        priority: f.priority,
      })),
    })

  } catch (error) {
    console.error('[Development Status] Error:', error)
    return NextResponse.json(
      { error: '获取状态失败' },
      { status: 500 }
    )
  }
}
