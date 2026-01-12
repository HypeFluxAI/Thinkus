import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth/options'
import dbConnect from '@/lib/db/connection'
import User from '@/lib/db/models/user'
import { VerificationCode } from '@/lib/db/models'

// 简单的邮箱格式验证
function isValidEmail(email: string): boolean {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
  return emailRegex.test(email)
}

// POST /api/user/bind-email - 发送绑定邮箱验证码
export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await req.json()
    const { email } = body as { email: string }

    if (!email) {
      return NextResponse.json({ error: '请输入邮箱' }, { status: 400 })
    }

    const normalizedEmail = email.toLowerCase().trim()

    if (!isValidEmail(normalizedEmail)) {
      return NextResponse.json({ error: '邮箱格式不正确' }, { status: 400 })
    }

    await dbConnect()

    // 检查邮箱是否已被其他用户绑定
    const existingUser = await User.findOne({ email: normalizedEmail })
    if (existingUser && existingUser._id.toString() !== session.user.id) {
      return NextResponse.json({ error: '该邮箱已被其他账户绑定' }, { status: 400 })
    }

    // 检查当前用户是否已有邮箱
    const currentUser = await User.findById(session.user.id)
    if (currentUser?.email) {
      return NextResponse.json({ error: '您已绑定邮箱，如需更换请联系客服' }, { status: 400 })
    }

    // 生成验证码
    let verificationCode
    try {
      verificationCode = await VerificationCode.generateCode(normalizedEmail, 'email_verify')
    } catch (error) {
      if (error instanceof Error) {
        return NextResponse.json({ error: error.message }, { status: 429 })
      }
      throw error
    }

    // TODO: 发送邮件验证码
    // 目前先打印到控制台，实际部署时需要集成邮件服务
    console.log(`\n${'='.repeat(50)}`)
    console.log(`📧 Email Verification Code`)
    console.log(`   Email: ${normalizedEmail}`)
    console.log(`   Code:  ${verificationCode.code}`)
    console.log(`${'='.repeat(50)}\n`)

    return NextResponse.json({
      success: true,
      message: '验证码已发送到您的邮箱',
      // 开发环境返回验证码，方便测试
      ...(process.env.NODE_ENV === 'development' && { code: verificationCode.code }),
    })
  } catch (error) {
    console.error('Send bind email code error:', error)
    return NextResponse.json({ error: '发送验证码失败' }, { status: 500 })
  }
}

// PUT /api/user/bind-email - 验证并绑定邮箱
export async function PUT(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await req.json()
    const { email, code } = body as { email: string; code: string }

    if (!email || !code) {
      return NextResponse.json({ error: '请输入邮箱和验证码' }, { status: 400 })
    }

    const normalizedEmail = email.toLowerCase().trim()

    if (!isValidEmail(normalizedEmail)) {
      return NextResponse.json({ error: '邮箱格式不正确' }, { status: 400 })
    }

    await dbConnect()

    // 验证验证码
    const verifyResult = await VerificationCode.verifyCode(normalizedEmail, code, 'email_verify')
    if (!verifyResult.valid) {
      return NextResponse.json({ error: verifyResult.error || '验证码错误' }, { status: 400 })
    }

    // 再次检查邮箱是否已被绑定
    const existingUser = await User.findOne({ email: normalizedEmail })
    if (existingUser && existingUser._id.toString() !== session.user.id) {
      return NextResponse.json({ error: '该邮箱已被其他账户绑定' }, { status: 400 })
    }

    // 绑定邮箱
    const user = await User.findByIdAndUpdate(
      session.user.id,
      {
        $set: {
          email: normalizedEmail,
          emailVerified: true,
        },
      },
      { new: true }
    )

    if (!user) {
      return NextResponse.json({ error: '用户不存在' }, { status: 404 })
    }

    return NextResponse.json({
      success: true,
      message: '邮箱绑定成功',
      email: normalizedEmail,
    })
  } catch (error) {
    console.error('Bind email error:', error)
    return NextResponse.json({ error: '绑定邮箱失败' }, { status: 500 })
  }
}
