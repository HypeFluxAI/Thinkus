import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth/config'
import dbConnect from '@/lib/db/connection'
import { DeliverySession, Project, Notification } from '@/lib/db/models'
import mongoose from 'mongoose'

// 问题类型配置
const ISSUE_TYPES = {
  cannot_access: {
    label: '无法访问',
    icon: '🔒',
    priority: 'high',
    responseTime: '15分钟',
  },
  login_failed: {
    label: '登录失败',
    icon: '🔑',
    priority: 'high',
    responseTime: '15分钟',
  },
  feature_broken: {
    label: '功能故障',
    icon: '⚠️',
    priority: 'medium',
    responseTime: '30分钟',
  },
  slow_performance: {
    label: '速度很慢',
    icon: '🐢',
    priority: 'medium',
    responseTime: '30分钟',
  },
  display_error: {
    label: '显示异常',
    icon: '🖥️',
    priority: 'low',
    responseTime: '1小时',
  },
  data_issue: {
    label: '数据问题',
    icon: '💾',
    priority: 'high',
    responseTime: '15分钟',
  },
  other: {
    label: '其他问题',
    icon: '❓',
    priority: 'low',
    responseTime: '1小时',
  },
}

// POST /api/delivery/[projectId]/support - 提交支持请求
export async function POST(
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

  const issueType = body.issueType || 'other'
  const issueConfig = ISSUE_TYPES[issueType as keyof typeof ISSUE_TYPES] || ISSUE_TYPES.other

  // 创建支持请求
  const supportRequest = {
    id: `support_${Date.now()}`,
    projectId,
    userId: session.user.id,
    issueType,
    description: body.description || '',
    screenshot: body.screenshot,
    contactMethod: body.contactMethod || 'in_app',
    contactInfo: body.contactInfo,
    priority: issueConfig.priority,
    expectedResponseTime: issueConfig.responseTime,
    status: 'submitted',
    createdAt: new Date(),
    deliverySessionId: deliverySession?._id?.toString(),
    productUrl: deliverySession?.outputs?.productUrl,
  }

  // 创建通知（给用户确认已收到）
  await Notification.create({
    userId: new mongoose.Types.ObjectId(session.user.id),
    type: 'system',
    title: '支持请求已提交',
    body: `您的${issueConfig.label}问题已收到，我们将在${issueConfig.responseTime}内响应。`,
    priority: 'high',
    channels: ['app'],
    metadata: {
      supportRequestId: supportRequest.id,
    },
  })

  // TODO: 发送邮件通知给客服团队
  // TODO: 如果是高优先级，发送短信/钉钉通知

  return NextResponse.json({
    message: '支持请求已提交',
    request: {
      id: supportRequest.id,
      issueType: issueConfig.label,
      priority: issueConfig.priority,
      expectedResponseTime: issueConfig.responseTime,
      status: supportRequest.status,
      createdAt: supportRequest.createdAt,
    },
    contact: {
      email: 'support@thinkus.app',
      wechat: 'ThinkusSupport',
      phone: '400-xxx-xxxx',
      workingHours: '工作日 9:00-18:00',
    },
  })
}

// GET /api/delivery/[projectId]/support - 获取支持信息
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

  // 检查是否在工作时间
  const now = new Date()
  const hour = now.getHours()
  const day = now.getDay()
  const isWorkingHours = day >= 1 && day <= 5 && hour >= 9 && hour < 18

  return NextResponse.json({
    issueTypes: Object.entries(ISSUE_TYPES).map(([key, config]) => ({
      id: key,
      ...config,
    })),
    contact: {
      email: 'support@thinkus.app',
      wechat: 'ThinkusSupport',
      phone: '400-xxx-xxxx',
      workingHours: '工作日 9:00-18:00',
    },
    isWorkingHours,
    currentWaitTime: isWorkingHours ? '约15分钟' : '下个工作日响应',
    faq: [
      {
        question: '如何重置密码？',
        answer: '点击登录页面的"忘记密码"，输入邮箱即可收到重置链接。',
      },
      {
        question: '页面加载很慢怎么办？',
        answer: '请尝试清除浏览器缓存，或切换网络环境后重试。',
      },
      {
        question: '如何查看我的数据？',
        answer: '登录后台管理，在"数据"菜单中可以查看和导出所有数据。',
      },
    ],
  })
}
