import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { connectDB } from '@/lib/db/connect'
import { ExpertConsultation, Subscription, SUBSCRIPTION_PLANS } from '@/lib/db/models'
import { EXTERNAL_EXPERTS, getExpert, type ExpertId } from '@/lib/config/external-experts'

/**
 * GET /api/experts
 * 获取专家列表或用户咨询记录
 */
export async function GET(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { searchParams } = new URL(req.url)
    const action = searchParams.get('action')

    // 获取专家列表
    if (action === 'list') {
      const experts = Object.values(EXTERNAL_EXPERTS).map((expert) => ({
        id: expert.id,
        name: expert.name,
        nameCn: expert.nameCn,
        title: expert.title,
        titleCn: expert.titleCn,
        domain: expert.domain,
        color: expert.color,
        avatar: expert.avatar,
        background: expert.background,
        expertise: expert.expertise,
        consultationFee: expert.consultationFee,
      }))

      return NextResponse.json({
        success: true,
        experts,
      })
    }

    // 获取用户咨询记录
    await connectDB()
    const expertId = searchParams.get('expertId') as ExpertId | null
    const consultationId = searchParams.get('consultationId')

    // 获取单个咨询详情
    if (consultationId) {
      const consultation = await ExpertConsultation.findOne({
        _id: consultationId,
        userId: session.user.id,
      })

      if (!consultation) {
        return NextResponse.json(
          { error: 'Consultation not found' },
          { status: 404 }
        )
      }

      const expert = getExpert(consultation.expertId as ExpertId)

      return NextResponse.json({
        success: true,
        consultation: {
          id: consultation._id.toString(),
          expertId: consultation.expertId,
          expertName: expert?.nameCn || consultation.expertId,
          expertAvatar: expert?.avatar || '👤',
          topic: consultation.topic,
          messages: consultation.messages,
          status: consultation.status,
          creditsUsed: consultation.creditsUsed,
          createdAt: consultation.createdAt,
          completedAt: consultation.completedAt,
        },
      })
    }

    // 获取用户咨询列表
    const consultations = await ExpertConsultation.getUserConsultations(
      session.user.id as any,
      { expertId: expertId || undefined, limit: 50 }
    )

    // 获取咨询统计
    const stats = await ExpertConsultation.getConsultationStats(session.user.id as any)

    // 获取用户剩余额度
    const subscription = await Subscription.getOrCreateSubscription(session.user.id as any)
    const planFeatures = SUBSCRIPTION_PLANS[subscription.plan].features

    // 简化额度计算 - 专业版和企业版有专家咨询额度
    const monthlyCredits = subscription.plan === 'enterprise' ? 20
      : subscription.plan === 'professional' ? 10
      : subscription.plan === 'starter' ? 5
      : 0

    return NextResponse.json({
      success: true,
      consultations: consultations.map((c) => {
        const expert = getExpert(c.expertId as ExpertId)
        return {
          id: c._id.toString(),
          expertId: c.expertId,
          expertName: expert?.nameCn || c.expertId,
          expertAvatar: expert?.avatar || '👤',
          topic: c.topic,
          status: c.status,
          messagesCount: c.messages?.length || 0,
          creditsUsed: c.creditsUsed,
          createdAt: c.createdAt,
          completedAt: c.completedAt,
        }
      }),
      stats: {
        ...stats,
        monthlyCredits,
        remainingCredits: Math.max(0, monthlyCredits - stats.totalCreditsUsed),
      },
    })
  } catch (error) {
    console.error('Failed to get experts:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

/**
 * POST /api/experts
 * 开始咨询或发送消息
 */
export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    await connectDB()
    const body = await req.json()
    const { action } = body

    // 开始新咨询
    if (action === 'start') {
      const { expertId, topic, projectId } = body

      // 验证专家
      const expert = getExpert(expertId)
      if (!expert) {
        return NextResponse.json(
          { error: 'Expert not found' },
          { status: 404 }
        )
      }

      // 检查额度
      const subscription = await Subscription.getOrCreateSubscription(session.user.id as any)
      const monthlyCredits = subscription.plan === 'enterprise' ? 20
        : subscription.plan === 'professional' ? 10
        : subscription.plan === 'starter' ? 5
        : 0

      const stats = await ExpertConsultation.getConsultationStats(session.user.id as any)
      const remainingCredits = monthlyCredits - stats.totalCreditsUsed

      if (remainingCredits < expert.consultationFee) {
        return NextResponse.json(
          { error: '咨询额度不足', code: 'INSUFFICIENT_CREDITS' },
          { status: 400 }
        )
      }

      // 创建咨询
      const consultation = await ExpertConsultation.startConsultation({
        userId: session.user.id as any,
        projectId: projectId || undefined,
        expertId,
        topic,
        creditsUsed: expert.consultationFee,
      })

      return NextResponse.json({
        success: true,
        consultation: {
          id: consultation._id.toString(),
          expertId: consultation.expertId,
          topic: consultation.topic,
          status: consultation.status,
        },
      })
    }

    // 发送消息
    if (action === 'message') {
      const { consultationId, content } = body

      // 获取咨询
      const consultation = await ExpertConsultation.findOne({
        _id: consultationId,
        userId: session.user.id,
        status: 'active',
      })

      if (!consultation) {
        return NextResponse.json(
          { error: 'Active consultation not found' },
          { status: 404 }
        )
      }

      // 添加用户消息
      await ExpertConsultation.addMessage(consultation._id, {
        role: 'user',
        content,
      })

      // 获取专家配置生成回复
      const expert = getExpert(consultation.expertId as ExpertId)
      if (!expert) {
        return NextResponse.json(
          { error: 'Expert configuration not found' },
          { status: 500 }
        )
      }

      // 使用Claude生成专家回复
      const Anthropic = (await import('@anthropic-ai/sdk')).default
      const anthropic = new Anthropic({
        apiKey: process.env.ANTHROPIC_API_KEY,
      })

      // 构建消息历史
      const updatedConsultation = await ExpertConsultation.findById(consultationId)
      const messageHistory = (updatedConsultation?.messages || []).map((m) => ({
        role: (m.role === 'user' ? 'user' : 'assistant') as 'user' | 'assistant',
        content: m.content,
      }))

      const response = await anthropic.messages.create({
        model: 'claude-sonnet-4-20250514',
        max_tokens: 2000,
        system: `${expert.systemPrompt}

当前咨询主题: ${consultation.topic}

请以专家身份回答用户的问题。回答应该专业、有深度，同时易于理解。`,
        messages: messageHistory,
      })

      const expertReply = response.content[0].type === 'text'
        ? response.content[0].text
        : ''

      // 添加专家回复
      const finalConsultation = await ExpertConsultation.addMessage(consultation._id, {
        role: 'expert',
        content: expertReply,
      })

      return NextResponse.json({
        success: true,
        message: {
          role: 'expert',
          content: expertReply,
          createdAt: new Date(),
        },
        consultation: {
          id: finalConsultation?._id.toString(),
          messagesCount: finalConsultation?.messages.length || 0,
        },
      })
    }

    return NextResponse.json(
      { error: 'Invalid action' },
      { status: 400 }
    )
  } catch (error) {
    console.error('Failed to process expert request:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

/**
 * PATCH /api/experts
 * 完成咨询或更新状态
 */
export async function PATCH(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    await connectDB()
    const body = await req.json()
    const { consultationId, action } = body

    if (!consultationId) {
      return NextResponse.json(
        { error: 'Missing consultationId' },
        { status: 400 }
      )
    }

    // 验证咨询所有权
    const consultation = await ExpertConsultation.findOne({
      _id: consultationId,
      userId: session.user.id,
    })

    if (!consultation) {
      return NextResponse.json(
        { error: 'Consultation not found' },
        { status: 404 }
      )
    }

    if (action === 'complete') {
      const updated = await ExpertConsultation.completeConsultation(consultation._id)

      return NextResponse.json({
        success: true,
        consultation: {
          id: updated?._id.toString(),
          status: updated?.status,
          completedAt: updated?.completedAt,
        },
      })
    }

    return NextResponse.json(
      { error: 'Invalid action' },
      { status: 400 }
    )
  } catch (error) {
    console.error('Failed to update consultation:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
