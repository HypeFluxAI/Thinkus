import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth/options'
import { connectDB } from '@/lib/db/connect'
import Project from '@/lib/db/models/project'
import type { ProjectStatusInput } from '@/lib/services/status-aggregator'

/**
 * GET /api/projects/[id]/status
 * 获取项目状态数据（用于红绿灯状态面板）
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json({ error: '请先登录' }, { status: 401 })
    }

    const { id: projectId } = await params

    await connectDB()

    const project = await Project.findById(projectId).lean()
    if (!project) {
      return NextResponse.json({ error: '项目不存在' }, { status: 404 })
    }

    // 检查权限
    if (project.userId.toString() !== session.user.id) {
      return NextResponse.json({ error: '无权访问此项目' }, { status: 403 })
    }

    // 构建状态输入数据（使用 Project 模型中实际存在的属性）
    const statusInput: ProjectStatusInput = {
      projectId,
      deployment: {
        url: project.deployment?.url,
        status: mapDeploymentStatus(project.status, project.deployment),
        lastDeployedAt: project.updatedAt,  // 使用项目更新时间作为部署时间
        platform: 'vercel'  // 默认平台
      },
      database: {
        connected: true,  // 默认已连接
        responseTime: undefined,
        lastCheckedAt: new Date()
      },
      domain: {
        domain: project.deployment?.url?.replace('https://', '').replace('http://', ''),
        sslStatus: 'valid',  // 默认 SSL 有效
        sslExpiresAt: undefined,
        dnsConfigured: !!project.deployment?.url
      },
      apiHealth: {
        healthy: project.status !== 'cancelled' && project.status !== 'paused',
        responseTime: undefined,
        errorRate: 0,
        lastCheckedAt: new Date()
      },
      recentErrors: 0,
      uptimeDays: calculateUptimeDays(project)
    }

    return NextResponse.json({
      success: true,
      statusInput
    })
  } catch (error) {
    console.error('Failed to get project status:', error)
    return NextResponse.json(
      { error: '获取项目状态失败' },
      { status: 500 }
    )
  }
}

/**
 * 映射部署状态
 */
function mapDeploymentStatus(
  projectStatus: string,
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  deployment?: any
): 'active' | 'building' | 'error' | 'pending' | 'unknown' {
  // 如果 deployment 有 status 字段，优先使用
  if (deployment?.status) {
    return deployment.status as 'active' | 'building' | 'error' | 'pending' | 'unknown'
  }

  // 否则根据项目状态推断
  switch (projectStatus) {
    case 'completed':
    case 'active':
      return 'active'
    case 'in_progress':
      return 'building'
    case 'error':
    case 'failed':
      return 'error'
    case 'pending_payment':
    case 'draft':
      return 'pending'
    default:
      return 'unknown'
  }
}

/**
 * 计算连续正常运行天数（基于项目更新时间）
 */
function calculateUptimeDays(project: { updatedAt?: Date; createdAt?: Date }): number {
  // 使用项目更新或创建时间计算
  const referenceDate = project.updatedAt || project.createdAt
  if (referenceDate) {
    const lastUpdate = new Date(referenceDate)
    const now = new Date()
    const diffMs = now.getTime() - lastUpdate.getTime()
    return Math.min(Math.floor(diffMs / (1000 * 60 * 60 * 24)), 30) // 最多显示30天
  }

  return 0
}
