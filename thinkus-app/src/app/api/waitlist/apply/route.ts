import { NextRequest, NextResponse } from 'next/server'
import dbConnect from '@/lib/db/connection'
import { Waitlist, type ApplicantRole } from '@/lib/db/models'

// POST /api/waitlist/apply - 提交排队申请
export async function POST(request: NextRequest) {
  try {
    await dbConnect()

    const body = await request.json()
    const { email, projectIdea, role, referralSource, socialLinks } = body

    // 验证必填字段
    if (!email || !projectIdea || !role) {
      return NextResponse.json(
        { error: '请填写所有必填字段' },
        { status: 400 }
      )
    }

    // 验证邮箱格式
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    if (!emailRegex.test(email)) {
      return NextResponse.json(
        { error: '请输入有效的邮箱地址' },
        { status: 400 }
      )
    }

    // 验证角色
    const validRoles: ApplicantRole[] = ['founder', 'pm', 'developer', 'student', 'other']
    if (!validRoles.includes(role)) {
      return NextResponse.json(
        { error: '请选择有效的角色' },
        { status: 400 }
      )
    }

    // 验证项目想法长度
    if (projectIdea.length < 50) {
      return NextResponse.json(
        { error: '请详细描述你的项目想法（至少50个字符）' },
        { status: 400 }
      )
    }

    if (projectIdea.length > 2000) {
      return NextResponse.json(
        { error: '项目想法描述过长（最多2000个字符）' },
        { status: 400 }
      )
    }

    // 检查邮箱是否已申请
    const existingApplication = await Waitlist.findOne({ email: email.toLowerCase() })
    if (existingApplication) {
      // 如果已申请，返回状态信息
      return NextResponse.json(
        {
          error: '该邮箱已提交申请',
          status: existingApplication.review.status,
          position: existingApplication.queue.position,
        },
        { status: 409 }
      )
    }

    // 创建申请
    const application = await Waitlist.createApplication({
      email,
      projectIdea,
      role,
      referralSource,
      socialLinks: socialLinks?.filter((link: string) => link.trim()),
    })

    // 获取前面的人数
    const aheadCount = await application.getAheadCount()

    return NextResponse.json({
      success: true,
      message: '申请已提交！',
      data: {
        email: application.email,
        position: application.queue.position,
        aheadCount,
        score: application.queue.score,
        priority: application.queue.priority,
        appliedAt: application.queue.appliedAt,
      },
    })
  } catch (error) {
    console.error('Waitlist apply error:', error)
    return NextResponse.json(
      { error: '提交申请时发生错误，请稍后重试' },
      { status: 500 }
    )
  }
}

// GET /api/waitlist/apply?email=xxx - 查询申请状态
export async function GET(request: NextRequest) {
  try {
    await dbConnect()

    const { searchParams } = new URL(request.url)
    const email = searchParams.get('email')

    if (!email) {
      return NextResponse.json(
        { error: '请提供邮箱地址' },
        { status: 400 }
      )
    }

    const application = await Waitlist.findOne({ email: email.toLowerCase() })

    if (!application) {
      return NextResponse.json(
        { error: '未找到该邮箱的申请记录' },
        { status: 404 }
      )
    }

    // 获取前面的人数
    const aheadCount = await application.getAheadCount()

    return NextResponse.json({
      success: true,
      data: {
        email: application.email,
        position: application.queue.position,
        aheadCount,
        score: application.queue.score,
        priority: application.queue.priority,
        appliedAt: application.queue.appliedAt,
        reviewStatus: application.review.status,
        invitationCode: application.review.status === 'approved' ? application.invitationCode : undefined,
        invitationExpiresAt: application.review.status === 'approved' ? application.invitationExpiresAt : undefined,
        converted: application.converted,
      },
    })
  } catch (error) {
    console.error('Waitlist status check error:', error)
    return NextResponse.json(
      { error: '查询状态时发生错误，请稍后重试' },
      { status: 500 }
    )
  }
}
