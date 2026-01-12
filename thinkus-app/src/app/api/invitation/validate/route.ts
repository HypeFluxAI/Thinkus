import { NextRequest, NextResponse } from 'next/server'
import dbConnect from '@/lib/db/connection'
import { InvitationCode } from '@/lib/db/models'

// POST /api/invitation/validate - 验证邀请码
export async function POST(request: NextRequest) {
  try {
    await dbConnect()

    const body = await request.json()
    const { code, email } = body

    if (!code) {
      return NextResponse.json(
        { valid: false, error: '请提供邀请码' },
        { status: 400 }
      )
    }

    const result = await InvitationCode.validateCode(code, email)

    if (!result.valid) {
      return NextResponse.json(
        { valid: false, error: result.error },
        { status: 400 }
      )
    }

    // 返回邀请码信息
    return NextResponse.json({
      valid: true,
      tier: result.invitation?.tier,
      benefits: result.invitation?.benefits,
      expiresAt: result.invitation?.expiresAt,
    })
  } catch (error) {
    console.error('Invitation validation error:', error)
    return NextResponse.json(
      { valid: false, error: '验证失败，请稍后重试' },
      { status: 500 }
    )
  }
}
