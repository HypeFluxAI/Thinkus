import { NextRequest, NextResponse } from 'next/server'
import { connectDB } from '@/lib/db/connect'
import User from '@/lib/db/models/user'
import VerificationCode from '@/lib/db/models/verification-code'
import crypto from 'crypto'

/**
 * POST /api/auth/forgot-password
 * 发送密码重置邮件
 */
export async function POST(req: NextRequest) {
  try {
    const { email } = await req.json()

    if (!email) {
      return NextResponse.json(
        { error: '请提供邮箱地址' },
        { status: 400 }
      )
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    if (!emailRegex.test(email)) {
      return NextResponse.json(
        { error: '请提供有效的邮箱地址' },
        { status: 400 }
      )
    }

    await connectDB()

    // Check if user exists
    const user = await User.findOne({ email: email.toLowerCase() })

    // Always return success to prevent email enumeration
    // But only send email if user exists
    if (!user) {
      // Don't reveal that the user doesn't exist
      return NextResponse.json({
        success: true,
        message: '如果该邮箱已注册，您将收到密码重置链接',
      })
    }

    // Generate verification code
    const verificationCode = await VerificationCode.generateCode(
      email.toLowerCase(),
      'password_reset'
    )

    // Generate a secure token for the reset link
    const resetToken = crypto.randomBytes(32).toString('hex')

    // Store token hash in verification code metadata
    // In production, you would send an email with the reset link
    // For now, we'll use the code directly

    // TODO: Send email with reset link
    // The link should be: /reset-password?token=CODE&email=EMAIL
    const resetLink = `${process.env.NEXTAUTH_URL || 'http://localhost:3000'}/reset-password?token=${verificationCode.code}&email=${encodeURIComponent(email)}`

    console.log('Password reset link:', resetLink)

    // In development, return the code for testing
    const isDev = process.env.NODE_ENV === 'development'

    return NextResponse.json({
      success: true,
      message: '如果该邮箱已注册，您将收到密码重置链接',
      ...(isDev && { code: verificationCode.code, resetLink }),
    })
  } catch (error) {
    console.error('Forgot password error:', error)

    // Handle rate limiting error
    if (error instanceof Error && error.message.includes('发送太频繁')) {
      return NextResponse.json(
        { error: error.message },
        { status: 429 }
      )
    }

    return NextResponse.json(
      { error: '发送失败，请稍后重试' },
      { status: 500 }
    )
  }
}
