import { NextRequest, NextResponse } from 'next/server'
import { connectDB } from '@/lib/db/connect'
import VerificationCode from '@/lib/db/models/verification-code'

/**
 * POST /api/auth/reset-password/validate
 * 验证密码重置令牌是否有效
 */
export async function POST(req: NextRequest) {
  try {
    const { token, email } = await req.json()

    if (!token || !email) {
      return NextResponse.json(
        { error: '缺少必要参数' },
        { status: 400 }
      )
    }

    await connectDB()

    // Check if verification code exists and is valid
    const verificationCode = await VerificationCode.findOne({
      target: email.toLowerCase(),
      type: 'password_reset',
      code: token,
      verified: false,
    })

    if (!verificationCode) {
      return NextResponse.json(
        { error: '验证码不存在' },
        { status: 400 }
      )
    }

    // Check if expired
    if (verificationCode.expiresAt < new Date()) {
      return NextResponse.json(
        { error: '验证码已过期' },
        { status: 400 }
      )
    }

    // Check attempts
    if (verificationCode.attempts >= 5) {
      return NextResponse.json(
        { error: '验证码错误次数过多' },
        { status: 400 }
      )
    }

    return NextResponse.json({
      valid: true,
    })
  } catch (error) {
    console.error('Validate reset token error:', error)
    return NextResponse.json(
      { error: '验证失败' },
      { status: 500 }
    )
  }
}
