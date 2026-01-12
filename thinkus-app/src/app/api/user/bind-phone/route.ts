import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth/options'
import dbConnect from '@/lib/db/connection'
import User from '@/lib/db/models/user'
import { VerificationCode } from '@/lib/db/models'
import { sendSmsCode, isValidPhone, normalizePhone } from '@/lib/sms/config'

// POST /api/user/bind-phone - 发送绑定手机号验证码
export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await req.json()
    const { phone } = body as { phone: string }

    if (!phone) {
      return NextResponse.json({ error: '请输入手机号' }, { status: 400 })
    }

    if (!isValidPhone(phone)) {
      return NextResponse.json({ error: '手机号格式不正确' }, { status: 400 })
    }

    const normalizedPhone = normalizePhone(phone)

    await dbConnect()

    // 检查手机号是否已被其他用户绑定
    const existingUser = await User.findOne({ phone: normalizedPhone })
    if (existingUser && existingUser._id.toString() !== session.user.id) {
      return NextResponse.json({ error: '该手机号已被其他账户绑定' }, { status: 400 })
    }

    // 检查当前用户是否已有手机号
    const currentUser = await User.findById(session.user.id)
    if (currentUser?.phone) {
      return NextResponse.json({ error: '您已绑定手机号，如需更换请联系客服' }, { status: 400 })
    }

    // 生成验证码
    let verificationCode
    try {
      verificationCode = await VerificationCode.generateCode(normalizedPhone, 'phone_bind')
    } catch (error) {
      if (error instanceof Error) {
        return NextResponse.json({ error: error.message }, { status: 429 })
      }
      throw error
    }

    // 发送短信
    const result = await sendSmsCode(normalizedPhone, verificationCode.code)

    if (!result.success) {
      await VerificationCode.deleteOne({ _id: verificationCode._id })
      return NextResponse.json({ error: result.error || '短信发送失败' }, { status: 500 })
    }

    return NextResponse.json({
      success: true,
      message: '验证码已发送',
      ...(process.env.NODE_ENV === 'development' && { code: verificationCode.code }),
    })
  } catch (error) {
    console.error('Send bind phone code error:', error)
    return NextResponse.json({ error: '发送验证码失败' }, { status: 500 })
  }
}

// PUT /api/user/bind-phone - 验证并绑定手机号
export async function PUT(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await req.json()
    const { phone, code } = body as { phone: string; code: string }

    if (!phone || !code) {
      return NextResponse.json({ error: '请输入手机号和验证码' }, { status: 400 })
    }

    if (!isValidPhone(phone)) {
      return NextResponse.json({ error: '手机号格式不正确' }, { status: 400 })
    }

    const normalizedPhone = normalizePhone(phone)

    await dbConnect()

    // 验证验证码
    const verifyResult = await VerificationCode.verifyCode(normalizedPhone, code, 'phone_bind')
    if (!verifyResult.valid) {
      return NextResponse.json({ error: verifyResult.error || '验证码错误' }, { status: 400 })
    }

    // 再次检查手机号是否已被绑定
    const existingUser = await User.findOne({ phone: normalizedPhone })
    if (existingUser && existingUser._id.toString() !== session.user.id) {
      return NextResponse.json({ error: '该手机号已被其他账户绑定' }, { status: 400 })
    }

    // 绑定手机号
    const user = await User.findByIdAndUpdate(
      session.user.id,
      {
        $set: {
          phone: normalizedPhone,
          phoneVerified: true,
        },
      },
      { new: true }
    )

    if (!user) {
      return NextResponse.json({ error: '用户不存在' }, { status: 404 })
    }

    return NextResponse.json({
      success: true,
      message: '手机号绑定成功',
      phone: normalizedPhone,
    })
  } catch (error) {
    console.error('Bind phone error:', error)
    return NextResponse.json({ error: '绑定手机号失败' }, { status: 500 })
  }
}
