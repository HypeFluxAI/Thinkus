import mongoose, { Schema, Document, Model } from 'mongoose'

// OAuth 提供商接口
export interface OAuthProvider {
  provider: 'google' | 'github' | 'wechat'
  providerId: string
}

// 通知设置接口
export interface NotificationSettings {
  email: boolean
  push: boolean
  sms: boolean
  dailySummary: boolean
  weeklyReport: boolean
}

// 用户设置接口
export interface UserSettings {
  language: 'zh' | 'en'
  theme: 'light' | 'dark' | 'system'
  timezone: string
  notifications: NotificationSettings
}

// 用户统计接口
export interface UserStats {
  totalProjects: number
  completedProjects: number
  totalSpent: number
  totalDiscussions: number
}

// 用户资料接口
export interface UserProfile {
  bio?: string
  company?: string
  website?: string
  location?: string
}

export interface IUser extends Document {
  _id: mongoose.Types.ObjectId
  email?: string
  phone?: string
  name: string
  avatar?: string

  // 个人资料
  profile: UserProfile

  // 认证
  password?: string
  phoneVerified: boolean
  providers: OAuthProvider[]

  // 邀请相关 (v11新增)
  invitedBy?: mongoose.Types.ObjectId
  invitationCode?: string

  // 状态
  status: 'active' | 'suspended' | 'deleted'
  emailVerified: boolean

  // 统计
  stats: UserStats

  // 设置
  settings: UserSettings

  // 时间戳
  createdAt: Date
  updatedAt: Date
  lastLoginAt?: Date
}

// OAuth 提供商 Schema
const providerSchema = new Schema(
  {
    provider: {
      type: String,
      enum: ['google', 'github', 'wechat'],
      required: true,
    },
    providerId: {
      type: String,
      required: true,
    },
  },
  { _id: false }
)

// 通知设置 Schema
const notificationSettingsSchema = new Schema(
  {
    email: { type: Boolean, default: true },
    push: { type: Boolean, default: true },
    sms: { type: Boolean, default: false },
    dailySummary: { type: Boolean, default: true },
    weeklyReport: { type: Boolean, default: true },
  },
  { _id: false }
)

// 用户设置 Schema
const userSettingsSchema = new Schema(
  {
    language: { type: String, enum: ['zh', 'en'], default: 'zh' },
    theme: { type: String, enum: ['light', 'dark', 'system'], default: 'system' },
    timezone: { type: String, default: 'Asia/Shanghai' },
    notifications: { type: notificationSettingsSchema, default: () => ({}) },
  },
  { _id: false }
)

// 用户统计 Schema
const userStatsSchema = new Schema(
  {
    totalProjects: { type: Number, default: 0 },
    completedProjects: { type: Number, default: 0 },
    totalSpent: { type: Number, default: 0 },
    totalDiscussions: { type: Number, default: 0 },
  },
  { _id: false }
)

// 用户资料 Schema
const userProfileSchema = new Schema(
  {
    bio: { type: String, maxlength: 500 },
    company: { type: String, maxlength: 100 },
    website: { type: String, maxlength: 200 },
    location: { type: String, maxlength: 100 },
  },
  { _id: false }
)

const UserSchema = new Schema<IUser>(
  {
    email: {
      type: String,
      
      lowercase: true,
      trim: true,
    },
    phone: {
      type: String,
      
      trim: true,
    },
    name: {
      type: String,
      required: true,
      trim: true,
    },
    avatar: {
      type: String,
    },
    // 个人资料
    profile: {
      type: userProfileSchema,
      default: () => ({}),
    },
    password: {
      type: String,
    },
    phoneVerified: {
      type: Boolean,
      default: false,
    },
    providers: {
      type: [providerSchema],
      default: [],
    },
    // 邀请相关 (v11新增)
    invitedBy: {
      type: Schema.Types.ObjectId,
      ref: 'User',
    },
    invitationCode: {
      type: String,
    },
    // 状态
    status: {
      type: String,
      enum: ['active', 'suspended', 'deleted'],
      default: 'active',
    },
    emailVerified: {
      type: Boolean,
      default: false,
    },
    // 统计
    stats: {
      type: userStatsSchema,
      default: () => ({}),
    },
    // 设置
    settings: {
      type: userSettingsSchema,
      default: () => ({}),
    },
    // 最后登录时间
    lastLoginAt: {
      type: Date,
    },
  },
  {
    timestamps: true,
  }
)

// 索引
UserSchema.index({ email: 1 }, { unique: true, sparse: true })
UserSchema.index({ phone: 1 }, { unique: true, sparse: true })
UserSchema.index({ status: 1 })
UserSchema.index({ invitedBy: 1 })
UserSchema.index({ createdAt: -1 })

// 静态方法: 通过邀请码查找邀请人
UserSchema.statics.findByInvitationCode = async function (
  invitationCode: string
): Promise<IUser | null> {
  // 这里需要通过InvitationCode模型查找
  // 暂时返回null，实际逻辑在注册流程中处理
  return null
}

// 实例方法: 更新最后登录时间
UserSchema.methods.updateLastLogin = async function (): Promise<void> {
  this.lastLoginAt = new Date()
  await this.save()
}

// 实例方法: 增加项目计数
UserSchema.methods.incrementProjectCount = async function (): Promise<void> {
  this.stats.totalProjects += 1
  await this.save()
}

// 实例方法: 增加讨论计数
UserSchema.methods.incrementDiscussionCount = async function (): Promise<void> {
  this.stats.totalDiscussions += 1
  await this.save()
}

const User: Model<IUser> = mongoose.models.User || mongoose.model<IUser>('User', UserSchema)

export default User
