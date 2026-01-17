import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth/config'
import dbConnect from '@/lib/db/connection'
import { DeliverySession, AcceptanceSession, Project } from '@/lib/db/models'
import mongoose from 'mongoose'

// GET /api/delivery/[projectId]/acceptance - 获取验收会话
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

  const project = await Project.findById(projectId)
  if (!project || project.userId.toString() !== session.user.id) {
    return NextResponse.json({ error: '项目不存在或无权限' }, { status: 403 })
  }

  const deliverySession = await DeliverySession.findOne({ projectId }).sort({ createdAt: -1 })
  if (!deliverySession) {
    return NextResponse.json({ error: '未找到交付会话' }, { status: 404 })
  }

  const acceptanceSession = await AcceptanceSession.findOne({
    deliverySessionId: deliverySession._id
  })

  if (!acceptanceSession) {
    return NextResponse.json({ error: '未找到验收会话' }, { status: 404 })
  }

  return NextResponse.json({
    id: acceptanceSession._id.toString(),
    status: acceptanceSession.status,
    items: acceptanceSession.items,
    issues: acceptanceSession.issues,
    startedAt: acceptanceSession.startedAt,
    completedAt: acceptanceSession.completedAt,
    expiresAt: acceptanceSession.expiresAt,
    signature: acceptanceSession.signature,
    remindersSent: acceptanceSession.remindersSent,
  })
}

// POST /api/delivery/[projectId]/acceptance - 开始验收
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ projectId: string }> }
) {
  const { projectId } = await params

  const session = await getServerSession(authOptions)
  if (!session?.user?.id) {
    return NextResponse.json({ error: '未授权' }, { status: 401 })
  }

  await dbConnect()

  const project = await Project.findById(projectId)
  if (!project || project.userId.toString() !== session.user.id) {
    return NextResponse.json({ error: '项目不存在或无权限' }, { status: 403 })
  }

  const deliverySession = await DeliverySession.findOne({ projectId }).sort({ createdAt: -1 })
  if (!deliverySession) {
    return NextResponse.json({ error: '未找到交付会话' }, { status: 404 })
  }

  // 检查是否已有验收会话
  let acceptanceSession = await AcceptanceSession.findOne({
    deliverySessionId: deliverySession._id
  })

  if (acceptanceSession) {
    // 如果已存在但状态不是 pending，返回现有会话
    if (acceptanceSession.status !== 'pending') {
      return NextResponse.json({
        message: '验收会话已存在',
        acceptance: {
          id: acceptanceSession._id.toString(),
          status: acceptanceSession.status,
        }
      })
    }

    // 更新为活跃状态
    acceptanceSession.status = 'active'
    acceptanceSession.startedAt = new Date()
    await acceptanceSession.save()
  } else {
    // 创建新的验收会话
    const defaultItems = [
      { id: 'homepage', category: 'functionality', description: '首页能正常打开', status: 'pending' },
      { id: 'login', category: 'functionality', description: '能正常登录系统', status: 'pending' },
      { id: 'admin', category: 'functionality', description: '后台管理可访问', status: 'pending' },
      { id: 'mobile', category: 'ui', description: '手机端显示正常', status: 'pending' },
      { id: 'core_feature', category: 'functionality', description: '核心功能可用', status: 'pending' },
      { id: 'satisfaction', category: 'experience', description: '整体使用满意', status: 'pending' },
    ]

    acceptanceSession = await AcceptanceSession.create({
      deliverySessionId: deliverySession._id,
      projectId: new mongoose.Types.ObjectId(projectId),
      userId: new mongoose.Types.ObjectId(session.user.id),
      status: 'active',
      items: defaultItems,
      issues: [],
      startedAt: new Date(),
      expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 7天后过期
    })
  }

  return NextResponse.json({
    message: '验收已开始',
    acceptance: {
      id: acceptanceSession._id.toString(),
      status: acceptanceSession.status,
      items: acceptanceSession.items,
      expiresAt: acceptanceSession.expiresAt,
    }
  })
}

// PATCH /api/delivery/[projectId]/acceptance - 更新验收项目
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ projectId: string }> }
) {
  const { projectId } = await params
  const body = await request.json()

  const session = await getServerSession(authOptions)
  if (!session?.user?.id) {
    return NextResponse.json({ error: '未授权' }, { status: 401 })
  }

  await dbConnect()

  const project = await Project.findById(projectId)
  if (!project || project.userId.toString() !== session.user.id) {
    return NextResponse.json({ error: '项目不存在或无权限' }, { status: 403 })
  }

  const deliverySession = await DeliverySession.findOne({ projectId }).sort({ createdAt: -1 })
  if (!deliverySession) {
    return NextResponse.json({ error: '未找到交付会话' }, { status: 404 })
  }

  const acceptanceSession = await AcceptanceSession.findOne({
    deliverySessionId: deliverySession._id
  })

  if (!acceptanceSession) {
    return NextResponse.json({ error: '未找到验收会话' }, { status: 404 })
  }

  if (acceptanceSession.status === 'completed') {
    return NextResponse.json({ error: '验收已完成，无法修改' }, { status: 400 })
  }

  // 更新验收项目
  if (body.itemId && body.status) {
    const itemIndex = acceptanceSession.items.findIndex((item: { id: string }) => item.id === body.itemId)
    if (itemIndex !== -1) {
      acceptanceSession.items[itemIndex].status = body.status
      if (body.notes) {
        acceptanceSession.items[itemIndex].notes = body.notes
      }
    }
  }

  // 添加问题报告
  if (body.issue) {
    acceptanceSession.issues.push({
      id: `issue_${Date.now()}`,
      itemId: body.issue.itemId,
      description: body.issue.description,
      severity: body.issue.severity || 'medium',
      screenshot: body.issue.screenshot,
      reportedAt: new Date(),
      status: 'open',
    })
  }

  await acceptanceSession.save()

  return NextResponse.json({
    message: '验收已更新',
    acceptance: {
      id: acceptanceSession._id.toString(),
      status: acceptanceSession.status,
      items: acceptanceSession.items,
      issues: acceptanceSession.issues,
    }
  })
}

// PUT /api/delivery/[projectId]/acceptance - 完成验收
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ projectId: string }> }
) {
  const { projectId } = await params
  const body = await request.json()

  const session = await getServerSession(authOptions)
  if (!session?.user?.id) {
    return NextResponse.json({ error: '未授权' }, { status: 401 })
  }

  await dbConnect()

  const project = await Project.findById(projectId)
  if (!project || project.userId.toString() !== session.user.id) {
    return NextResponse.json({ error: '项目不存在或无权限' }, { status: 403 })
  }

  const deliverySession = await DeliverySession.findOne({ projectId }).sort({ createdAt: -1 })
  if (!deliverySession) {
    return NextResponse.json({ error: '未找到交付会话' }, { status: 404 })
  }

  const acceptanceSession = await AcceptanceSession.findOne({
    deliverySessionId: deliverySession._id
  })

  if (!acceptanceSession) {
    return NextResponse.json({ error: '未找到验收会话' }, { status: 404 })
  }

  if (acceptanceSession.status === 'completed') {
    return NextResponse.json({ error: '验收已完成' }, { status: 400 })
  }

  // 检查是否有签名
  if (!body.signature) {
    return NextResponse.json({ error: '需要签名确认' }, { status: 400 })
  }

  // 计算通过率
  const passedItems = acceptanceSession.items.filter((item: { status: string }) => item.status === 'passed').length
  const totalItems = acceptanceSession.items.length
  const passRate = passedItems / totalItems

  // 完成验收
  acceptanceSession.status = 'completed'
  acceptanceSession.completedAt = new Date()
  acceptanceSession.signature = {
    name: body.signature.name || session.user.name || '用户',
    signedAt: new Date(),
    ipAddress: request.headers.get('x-forwarded-for') || request.headers.get('x-real-ip') || 'unknown',
    userAgent: request.headers.get('user-agent') || 'unknown',
    satisfaction: body.signature.satisfaction || 'satisfied',
  }

  await acceptanceSession.save()

  // 更新交付会话
  if (passRate >= 0.8) {
    deliverySession.stage = 'completed'
    deliverySession.status = 'completed'
    deliverySession.completedAt = new Date()
    await deliverySession.save()
  }

  return NextResponse.json({
    message: '验收已完成',
    acceptance: {
      id: acceptanceSession._id.toString(),
      status: acceptanceSession.status,
      passRate,
      signature: acceptanceSession.signature,
      completedAt: acceptanceSession.completedAt,
    }
  })
}
