import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth/options'
import { connectDB } from '@/lib/db/connect'
import Project from '@/lib/db/models/project'
import { Types } from 'mongoose'

interface ProposalFeature {
  id: string
  name: string
  description: string
  priority: 'P0' | 'P1' | 'P2'
  approved?: boolean
  expertNotes?: string
  includedInMvp?: boolean
}

interface ProposalData {
  positioning?: string
  features: ProposalFeature[]
  techStack: {
    frontend: string[]
    backend: string[]
    database: string[]
  }
  pricing: {
    base: number
    addons: Array<{ name: string; price: number }>
    total: number
  }
  risks?: string[]
  recommendations?: string[]
  deferredFeatures?: Array<{
    name: string
    reason: string
    suggestedPhase?: string
  }>
}

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)

    if (!session?.user?.id) {
      return NextResponse.json(
        { error: '未授权' },
        { status: 401 }
      )
    }

    const body = await request.json()
    const { proposal } = body as { proposal: ProposalData }

    if (!proposal) {
      return NextResponse.json(
        { error: '缺少方案数据' },
        { status: 400 }
      )
    }

    await connectDB()

    // 从功能列表中提取项目名称，或使用默认名称
    const projectName = proposal.positioning?.slice(0, 50) ||
      (proposal.features[0]?.name ? `${proposal.features[0].name} 项目` : '测试项目')

    // 创建项目
    const project = new Project({
      userId: new Types.ObjectId(session.user.id),
      name: projectName,
      description: proposal.positioning || '通过 Thinkus 创建的项目',
      type: 'web',
      phase: 'definition', // 已完成讨论，进入定义阶段
      phaseHistory: [
        { phase: 'ideation', startedAt: new Date(), completedAt: new Date() },
        { phase: 'definition', startedAt: new Date() },
      ],
      complexity: 'L2',
      requirement: {
        original: proposal.positioning || '',
        clarified: proposal.positioning || '',
      },
      proposal: {
        positioning: proposal.positioning,
        features: proposal.features.map(f => ({
          id: f.id,
          name: f.name,
          description: f.description,
          priority: f.priority,
        })),
        techStack: proposal.techStack,
        pricing: proposal.pricing,
        risks: proposal.risks || [],
        recommendations: proposal.recommendations || [],
      },
      progress: {
        percentage: 10,
        currentStage: '方案已确认',
        logs: [
          {
            timestamp: new Date(),
            message: '项目创建成功（测试模式）',
            type: 'success',
          },
          {
            timestamp: new Date(),
            message: '专家讨论已完成，方案已确认',
            type: 'info',
          },
        ],
      },
      status: 'in_progress',
      config: {
        autoRun: false,
        notifyLevel: 2,
      },
      stats: {
        totalDiscussions: 1,
        totalDecisions: 0,
        totalDeliverables: 0,
      },
    })

    await project.save()

    return NextResponse.json({
      success: true,
      projectId: project._id.toString(),
      message: '测试项目创建成功',
    })

  } catch (error) {
    console.error('[Create Test Project] Error:', error)
    return NextResponse.json(
      { error: '创建项目失败' },
      { status: 500 }
    )
  }
}
