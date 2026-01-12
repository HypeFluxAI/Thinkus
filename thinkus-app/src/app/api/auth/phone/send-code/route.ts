import { NextRequest, NextResponse } from 'next/server'
import dbConnect from '@/lib/db/connection'
import { VerificationCode } from '@/lib/db/models'
import { sendSmsCode, isValidPhone, normalizePhone } from '@/lib/sms/config'

// POST /api/auth/phone/send-code - 发送手机验证码
export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const { phone } = body as { phone: string }

    if (!phone) {
      return NextResponse.json(
        { error: '请输入手机号' },
        { status: 400 }
      )
    }

    // 验证手机号格式
    if (!isValidPhone(phone)) {
      return NextResponse.json(
        { error: '手机号格式不正确' },
        { status: 400 }
      )
    }

    // 标准化手机号
    const normalizedPhone = normalizePhone(phone)

    await dbConnect()

    // 生成验证码
    let verificationCode
    try {
      verificationCode = await VerificationCode.generateCode(normalizedPhone, 'phone_login')
    } catch (error) {
      if (error instanceof Error) {
        return NextResponse.json(
          { error: error.message },
          { status: 429 } // Too Many Requests
        )
      }
      throw error
    }

    // 发送短信
    const result = await sendSmsCode(normalizedPhone, verificationCode.code)

    if (!result.success) {
      // 发送失败，删除验证码记录
      await VerificationCode.deleteOne({ _id: verificationCode._id })
      return NextResponse.json(
        { error: result.error || '短信发送失败' },
        { status: 500 }
      )
    }

    return NextResponse.json({
      success: true,
      message: '验证码已发送',
      // 开发环境返回验证码，方便测试
      ...(process.env.NODE_ENV === 'development' && { code: verificationCode.code }),
    })
  } catch (error) {
    console.error('Send SMS code error:', error)
    return NextResponse.json(
      { error: '发送验证码失败，请稍后重试' },
      { status: 500 }
    )
  }
}
