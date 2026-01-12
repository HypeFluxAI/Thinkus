import mongoose, { Document, Schema, Model } from 'mongoose'
import crypto from 'crypto'

// 邀请码生成器 (8位大写字母+数字)
const ALPHABET = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789'
function generateCode(): string {
  let result = ''
  const bytes = crypto.randomBytes(8)
  for (let i = 0; i < 8; i++) {
    result += ALPHABET[bytes[i] % ALPHABET.length]
  }
  return result
}

// 邀请码类型
export type InvitationCodeType = 'waitlist' | 'user_invite' | 'special'

// 邀请码稀有度
export type InvitationCodeTier = 'common' | 'rare' | 'legendary'

// 邀请码状态
export type InvitationCodeStatus = 'active' | 'used' | 'expired' | 'revoked'

// 邀请码福利接口
export interface InvitationBenefits {
  skipWaitlist: boolean
  trialDays?: number
  bonusQuota?: number
}

// InvitationCode 接口
export interface IInvitationCode extends Document {
  _id: mongoose.Types.ObjectId
  code: string

  type: InvitationCodeType
  tier: InvitationCodeTier

  createdBy: 'system' | mongoose.Types.ObjectId
  boundTo?: string // email

  status: InvitationCodeStatus
  usedBy?: mongoose.Types.ObjectId
  usedAt?: Date

  expiresAt: Date

  benefits: InvitationBenefits

  createdAt: Date
}

// 福利Schema
const benefitsSchema = new Schema(
  {
    skipWaitlist: { type: Boolean, default: true },
    trialDays: { type: Number, min: 0 },
    bonusQuota: { type: Number, min: 0 },
  },
  { _id: false }
)

// InvitationCode Schema
const invitationCodeSchema = new Schema<IInvitationCode>(
  {
    code: {
      type: String,
      required: true,
      unique: true,
      uppercase: true,
      trim: true,
      index: true,
    },
    type: {
      type: String,
      enum: ['waitlist', 'user_invite', 'special'],
      required: true,
    },
    tier: {
      type: String,
      enum: ['common', 'rare', 'legendary'],
      default: 'common',
    },
    createdBy: {
      type: Schema.Types.Mixed, // 'system' 或 ObjectId
      required: true,
    },
    boundTo: {
      type: String,
      lowercase: true,
      trim: true,
    },
    status: {
      type: String,
      enum: ['active', 'used', 'expired', 'revoked'],
      default: 'active',
    },
    usedBy: {
      type: Schema.Types.ObjectId,
      ref: 'User',
    },
    usedAt: { type: Date },
    expiresAt: {
      type: Date,
      required: true,
      index: true,
    },
    benefits: {
      type: benefitsSchema,
      default: () => ({ skipWaitlist: true }),
    },
  },
  {
    timestamps: true,
    collection: 'invitation_codes',
  }
)

// 索引
invitationCodeSchema.index({ status: 1 })
invitationCodeSchema.index({ type: 1, status: 1 })
invitationCodeSchema.index({ createdBy: 1 })

// 稀有度对应的福利配置
const TIER_BENEFITS: Record<InvitationCodeTier, InvitationBenefits> = {
  common: {
    skipWaitlist: true,
    trialDays: 7,
  },
  rare: {
    skipWaitlist: true,
    trialDays: 14,
    bonusQuota: 50,
  },
  legendary: {
    skipWaitlist: true,
    trialDays: 30,
    bonusQuota: 200,
  },
}

// 静态方法: 生成唯一邀请码
invitationCodeSchema.statics.generateUniqueCode = async function (): Promise<string> {
  let code: string
  let exists = true
  let attempts = 0
  const maxAttempts = 10

  while (exists && attempts < maxAttempts) {
    code = generateCode()
    exists = !!(await this.findOne({ code }))
    attempts++
  }

  if (exists) {
    throw new Error('Failed to generate unique invitation code')
  }

  return code!
}

// 静态方法: 创建排队邀请码
invitationCodeSchema.statics.createWaitlistCode = async function (
  email: string,
  tier: InvitationCodeTier = 'common'
): Promise<IInvitationCode> {
  const model = this as unknown as IInvitationCodeModel
  const code = await model.generateUniqueCode()

  return this.create({
    code,
    type: 'waitlist',
    tier,
    createdBy: 'system',
    boundTo: email,
    expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 7天
    benefits: TIER_BENEFITS[tier],
  })
}

// 静态方法: 创建用户邀请码
invitationCodeSchema.statics.createUserInviteCode = async function (
  userId: mongoose.Types.ObjectId,
  tier: InvitationCodeTier = 'common'
): Promise<IInvitationCode> {
  const model = this as unknown as IInvitationCodeModel
  const code = await model.generateUniqueCode()

  return this.create({
    code,
    type: 'user_invite',
    tier,
    createdBy: userId,
    expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // 30天
    benefits: TIER_BENEFITS[tier],
  })
}

// 静态方法: 创建特殊邀请码
invitationCodeSchema.statics.createSpecialCode = async function (options: {
  tier?: InvitationCodeTier
  boundTo?: string
  expiresInDays?: number
  customBenefits?: Partial<InvitationBenefits>
}): Promise<IInvitationCode> {
  const {
    tier = 'legendary',
    boundTo,
    expiresInDays = 90,
    customBenefits,
  } = options

  const model = this as unknown as IInvitationCodeModel
  const code = await model.generateUniqueCode()

  return this.create({
    code,
    type: 'special',
    tier,
    createdBy: 'system',
    boundTo,
    expiresAt: new Date(Date.now() + expiresInDays * 24 * 60 * 60 * 1000),
    benefits: { ...TIER_BENEFITS[tier], ...customBenefits },
  })
}

// 静态方法: 验证邀请码
invitationCodeSchema.statics.validateCode = async function (
  code: string,
  email?: string
): Promise<{
  valid: boolean
  invitation?: IInvitationCode
  error?: string
}> {
  const invitation = await this.findOne({ code: code.toUpperCase() })

  if (!invitation) {
    return { valid: false, error: 'Invalid invitation code' }
  }

  if (invitation.status === 'used') {
    return { valid: false, error: 'Invitation code already used' }
  }

  if (invitation.status === 'expired' || invitation.expiresAt < new Date()) {
    return { valid: false, error: 'Invitation code expired' }
  }

  if (invitation.status === 'revoked') {
    return { valid: false, error: 'Invitation code revoked' }
  }

  // 检查是否绑定到特定邮箱
  if (invitation.boundTo && email && invitation.boundTo !== email.toLowerCase()) {
    return { valid: false, error: 'Invitation code is bound to another email' }
  }

  return { valid: true, invitation }
}

// 静态方法: 使用邀请码
invitationCodeSchema.statics.useCode = async function (
  code: string,
  userId: mongoose.Types.ObjectId
): Promise<IInvitationCode | null> {
  return this.findOneAndUpdate(
    {
      code: code.toUpperCase(),
      status: 'active',
      expiresAt: { $gt: new Date() },
    },
    {
      $set: {
        status: 'used',
        usedBy: userId,
        usedAt: new Date(),
      },
    },
    { new: true }
  )
}

// 静态方法: 获取用户的邀请码列表
invitationCodeSchema.statics.getUserInviteCodes = async function (
  userId: mongoose.Types.ObjectId
): Promise<IInvitationCode[]> {
  return this.find({
    createdBy: userId,
    type: 'user_invite',
  }).sort({ createdAt: -1 })
}

// 静态方法: 获取用户可用的邀请码数量
invitationCodeSchema.statics.getAvailableCodesCount = async function (
  userId: mongoose.Types.ObjectId
): Promise<number> {
  return this.countDocuments({
    createdBy: userId,
    type: 'user_invite',
    status: 'active',
    expiresAt: { $gt: new Date() },
  })
}

// 静态方法: 过期处理
invitationCodeSchema.statics.expireOldCodes = async function (): Promise<number> {
  const result = await this.updateMany(
    {
      status: 'active',
      expiresAt: { $lt: new Date() },
    },
    {
      $set: { status: 'expired' },
    }
  )
  return result.modifiedCount
}

// 静态方法: 撤销邀请码
invitationCodeSchema.statics.revokeCode = async function (
  code: string
): Promise<IInvitationCode | null> {
  return this.findOneAndUpdate(
    { code: code.toUpperCase(), status: 'active' },
    { $set: { status: 'revoked' } },
    { new: true }
  )
}

// 模型接口扩展
export interface IInvitationCodeModel extends Model<IInvitationCode> {
  generateUniqueCode(): Promise<string>
  createWaitlistCode(email: string, tier?: InvitationCodeTier): Promise<IInvitationCode>
  createUserInviteCode(
    userId: mongoose.Types.ObjectId,
    tier?: InvitationCodeTier
  ): Promise<IInvitationCode>
  createSpecialCode(options: {
    tier?: InvitationCodeTier
    boundTo?: string
    expiresInDays?: number
    customBenefits?: Partial<InvitationBenefits>
  }): Promise<IInvitationCode>
  validateCode(
    code: string,
    email?: string
  ): Promise<{
    valid: boolean
    invitation?: IInvitationCode
    error?: string
  }>
  useCode(code: string, userId: mongoose.Types.ObjectId): Promise<IInvitationCode | null>
  getUserInviteCodes(userId: mongoose.Types.ObjectId): Promise<IInvitationCode[]>
  getAvailableCodesCount(userId: mongoose.Types.ObjectId): Promise<number>
  expireOldCodes(): Promise<number>
  revokeCode(code: string): Promise<IInvitationCode | null>
}

// 导出模型和配置
export const InvitationCode =
  (mongoose.models.InvitationCode as IInvitationCodeModel) ||
  mongoose.model<IInvitationCode, IInvitationCodeModel>(
    'InvitationCode',
    invitationCodeSchema
  )

export { TIER_BENEFITS }
