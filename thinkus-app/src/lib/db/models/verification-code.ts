import mongoose, { Schema, Document, Model } from 'mongoose'

// 验证码类型
export type VerificationCodeType = 'phone_login' | 'phone_bind' | 'email_verify' | 'password_reset'

export interface IVerificationCode extends Document {
  _id: mongoose.Types.ObjectId
  target: string // 手机号或邮箱
  code: string // 6位验证码
  type: VerificationCodeType
  attempts: number // 尝试次数
  verified: boolean // 是否已验证
  expiresAt: Date
  createdAt: Date
  updatedAt: Date
}

// 静态方法接口
interface IVerificationCodeModel extends Model<IVerificationCode> {
  generateCode(target: string, type: VerificationCodeType): Promise<IVerificationCode>
  verifyCode(target: string, code: string, type: VerificationCodeType): Promise<{ valid: boolean; error?: string }>
  cleanupExpired(): Promise<number>
}

const VerificationCodeSchema = new Schema<IVerificationCode>(
  {
    target: {
      type: String,
      required: true,
      trim: true,
    },
    code: {
      type: String,
      required: true,
    },
    type: {
      type: String,
      enum: ['phone_login', 'phone_bind', 'email_verify', 'password_reset'],
      required: true,
    },
    attempts: {
      type: Number,
      default: 0,
    },
    verified: {
      type: Boolean,
      default: false,
    },
    expiresAt: {
      type: Date,
      required: true,
    },
  },
  {
    timestamps: true,
  }
)

// 索引
VerificationCodeSchema.index({ target: 1, type: 1 })
VerificationCodeSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 }) // TTL索引，自动清理过期数据

// 生成6位随机验证码
function generateRandomCode(): string {
  return Math.floor(100000 + Math.random() * 900000).toString()
}

// 静态方法: 生成验证码
VerificationCodeSchema.statics.generateCode = async function (
  target: string,
  type: VerificationCodeType
): Promise<IVerificationCode> {
  // 删除该目标的旧验证码
  await this.deleteMany({ target, type })

  // 检查发送频率限制 (同一目标每分钟只能发送1次)
  const recentCode = await this.findOne({
    target,
    type,
    createdAt: { $gte: new Date(Date.now() - 60 * 1000) },
  })

  if (recentCode) {
    throw new Error('发送太频繁，请稍后再试')
  }

  // 生成新验证码
  const code = generateRandomCode()
  const expiresAt = new Date(Date.now() + 5 * 60 * 1000) // 5分钟有效期

  const verificationCode = await this.create({
    target,
    code,
    type,
    expiresAt,
  })

  return verificationCode
}

// 静态方法: 验证验证码
VerificationCodeSchema.statics.verifyCode = async function (
  target: string,
  code: string,
  type: VerificationCodeType
): Promise<{ valid: boolean; error?: string }> {
  const verificationCode = await this.findOne({
    target,
    type,
    verified: false,
  })

  if (!verificationCode) {
    return { valid: false, error: '验证码不存在或已过期' }
  }

  // 检查是否过期
  if (verificationCode.expiresAt < new Date()) {
    await verificationCode.deleteOne()
    return { valid: false, error: '验证码已过期' }
  }

  // 检查尝试次数 (最多5次)
  if (verificationCode.attempts >= 5) {
    await verificationCode.deleteOne()
    return { valid: false, error: '验证码错误次数过多，请重新获取' }
  }

  // 验证码比较
  if (verificationCode.code !== code) {
    verificationCode.attempts += 1
    await verificationCode.save()
    return { valid: false, error: `验证码错误，还剩 ${5 - verificationCode.attempts} 次机会` }
  }

  // 验证成功
  verificationCode.verified = true
  await verificationCode.save()

  // 删除验证码 (已使用)
  await verificationCode.deleteOne()

  return { valid: true }
}

// 静态方法: 清理过期验证码
VerificationCodeSchema.statics.cleanupExpired = async function (): Promise<number> {
  const result = await this.deleteMany({
    expiresAt: { $lt: new Date() },
  })
  return result.deletedCount
}

const VerificationCode: IVerificationCodeModel =
  (mongoose.models.VerificationCode as IVerificationCodeModel) ||
  mongoose.model<IVerificationCode, IVerificationCodeModel>('VerificationCode', VerificationCodeSchema)

export default VerificationCode
