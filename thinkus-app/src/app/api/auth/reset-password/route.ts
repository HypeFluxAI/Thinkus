import { NextRequest, NextResponse } from 'next/server'
import { connectDB } from '@/lib/db/connect'
import User from '@/lib/db/models/user'
import VerificationCode from '@/lib/db/models/verification-code'
import bcrypt from 'bcryptjs'

/**
 * POST /api/auth/reset-password
 * 重置密码
 */
export async function POST(req: NextRequest) {
  try {
    const { token, email, password } = await req.json()

    if (!token || !email || !password) {
      return NextResponse.json(
        { error: '缺少必要参数' },
        { status: 400 }
      )
    }

    // Validate password
    if (password.length < 8) {
      return NextResponse.json(
        { error: '密码长度至少为8位' },
        { status: 400 }
      )
    }

    await connectDB()

    // Verify the code
    const result = await VerificationCode.verifyCode(
      email.toLowerCase(),
      token,
      'password_reset'
    )

    if (!result.valid) {
      return NextResponse.json(
        { error: result.error || '验证码无效或已过期' },
        { status: 400 }
      )
    }

    // Find user
    const user = await User.findOne({ email: email.toLowerCase() })

    if (!user) {
      return NextResponse.json(
        { error: '用户不存在' },
        { status: 404 }
      )
    }

    // Hash new password
    const hashedPassword = await bcrypt.hash(password, 12)

    // Update user password
    user.password = hashedPassword
    await user.save()

    return NextResponse.json({
      success: true,
      message: '密码重置成功',
    })
  } catch (error) {
    console.error('Reset password error:', error)
    return NextResponse.json(
      { error: '重置失败，请稍后重试' },
      { status: 500 }
    )
  }
}
