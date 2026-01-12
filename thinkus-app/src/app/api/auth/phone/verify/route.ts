import { NextRequest, NextResponse } from 'next/server'
import dbConnect from '@/lib/db/connection'
import { VerificationCode, User, InvitationCode } from '@/lib/db/models'
import { isValidPhone, normalizePhone } from '@/lib/sms/config'
import { sign } from 'jsonwebtoken'

// POST /api/auth/phone/verify - 验证手机验证码并登录/注册
export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const { phone, code, invitationCode } = body as {
      phone: string
      code: string
      invitationCode?: string
    }

    if (!phone || !code) {
      return NextResponse.json(
        { error: '请输入手机号和验证码' },
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

    // 验证验证码
    const verifyResult = await VerificationCode.verifyCode(
      normalizedPhone,
      code,
      'phone_login'
    )

    if (!verifyResult.valid) {
      return NextResponse.json(
        { error: verifyResult.error || '验证码错误' },
        { status: 400 }
      )
    }

    // 查找或创建用户
    let user = await User.findOne({ phone: normalizedPhone })
    let isNewUser = false

    if (!user) {
      isNewUser = true

      // 验证邀请码 (如果提供)
      let invitedBy = null
      let inviteBenefits = null

      if (invitationCode) {
        const result = await InvitationCode.validateCode(invitationCode)
        if (result.valid && result.invitation) {
          invitedBy = result.invitation.createdBy
          inviteBenefits = result.invitation.benefits
        }
      }

      // 创建新用户
      user = await User.create({
        phone: normalizedPhone,
        name: `用户${normalizedPhone.slice(-4)}`, // 默认用手机号后4位作为名称
        phoneVerified: true,
        status: 'active',
        ...(invitedBy && typeof invitedBy !== 'string' && { invitedBy }),
        ...(invitationCode && { invitationCode }),
      })

      // 使用邀请码
      if (invitationCode) {
        await InvitationCode.useCode(invitationCode, user._id)
      }

      // TODO: 如果有邀请福利，应用到用户订阅
      if (inviteBenefits) {
        console.log(`New user ${user._id} has invite benefits:`, inviteBenefits)
      }
    } else {
      // 更新手机验证状态
      if (!user.phoneVerified) {
        user.phoneVerified = true
        await user.save()
      }
    }

    // 更新最后登录时间
    user.lastLoginAt = new Date()
    await user.save()

    // 生成临时 token 用于 NextAuth 回调
    // 这个 token 会被 NextAuth CredentialsProvider 使用
    const token = sign(
      {
        userId: user._id.toString(),
        phone: normalizedPhone,
      },
      process.env.NEXTAUTH_SECRET || 'fallback-secret',
      { expiresIn: '5m' } // 5分钟有效期
    )

    return NextResponse.json({
      success: true,
      isNewUser,
      user: {
        id: user._id.toString(),
        phone: user.phone,
        name: user.name,
        avatar: user.avatar,
      },
      // 返回凭证供 NextAuth 使用
      credentials: {
        phone: normalizedPhone,
        token,
      },
    })
  } catch (error) {
    console.error('Verify phone code error:', error)
    return NextResponse.json(
      { error: '验证失败，请稍后重试' },
      { status: 500 }
    )
  }
}
