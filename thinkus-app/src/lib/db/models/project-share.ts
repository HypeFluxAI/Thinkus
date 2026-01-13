import mongoose, { Document, Schema, Model, Types } from 'mongoose'

// 分享权限类型
export type SharePermission = 'view' | 'comment' | 'edit'

// 分享状态
export type ShareStatus = 'active' | 'expired' | 'revoked'

// 项目分享接口
export interface IProjectShare extends Document {
  _id: Types.ObjectId
  projectId: Types.ObjectId
  userId: Types.ObjectId  // 创建分享的用户

  // 分享配置
  shareToken: string  // 唯一分享令牌
  permission: SharePermission
  status: ShareStatus

  // 分享对象 (可选，空则为公开链接)
  sharedWithEmail?: string
  sharedWithUserId?: Types.ObjectId

  // 密码保护 (可选)
  password?: string
  passwordHash?: string

  // 有效期
  expiresAt?: Date

  // 访问统计
  viewCount: number
  lastViewedAt?: Date

  // 元数据
  title?: string  // 自定义分享标题
  message?: string  // 分享留言

  createdAt: Date
  updatedAt: Date
}

// 模型接口
export interface IProjectShareModel extends Model<IProjectShare> {
  createShare(data: {
    projectId: Types.ObjectId
    userId: Types.ObjectId
    permission?: SharePermission
    sharedWithEmail?: string
    password?: string
    expiresAt?: Date
    title?: string
    message?: string
  }): Promise<IProjectShare>

  getByToken(token: string): Promise<IProjectShare | null>

  getProjectShares(projectId: Types.ObjectId): Promise<IProjectShare[]>

  revokeShare(shareId: Types.ObjectId, userId: Types.ObjectId): Promise<boolean>

  incrementViewCount(token: string): Promise<void>
}

// 生成分享令牌
function generateShareToken(): string {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789'
  let token = ''
  for (let i = 0; i < 16; i++) {
    token += chars.charAt(Math.floor(Math.random() * chars.length))
  }
  return token
}

const projectShareSchema = new Schema<IProjectShare>(
  {
    projectId: {
      type: Schema.Types.ObjectId,
      ref: 'Project',
      required: true,
      index: true,
    },
    userId: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    shareToken: {
      type: String,
      required: true,
      unique: true,
      index: true,
    },
    permission: {
      type: String,
      enum: ['view', 'comment', 'edit'],
      default: 'view',
    },
    status: {
      type: String,
      enum: ['active', 'expired', 'revoked'],
      default: 'active',
    },
    sharedWithEmail: {
      type: String,
      sparse: true,
    },
    sharedWithUserId: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      sparse: true,
    },
    password: String,
    passwordHash: String,
    expiresAt: {
      type: Date,
      index: true,
    },
    viewCount: {
      type: Number,
      default: 0,
    },
    lastViewedAt: Date,
    title: String,
    message: String,
  },
  {
    timestamps: true,
    collection: 'project_shares',
  }
)

// 索引
projectShareSchema.index({ projectId: 1, status: 1 })
projectShareSchema.index({ userId: 1, status: 1 })
projectShareSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 })

// 静态方法: 创建分享
projectShareSchema.statics.createShare = async function (data: {
  projectId: Types.ObjectId
  userId: Types.ObjectId
  permission?: SharePermission
  sharedWithEmail?: string
  password?: string
  expiresAt?: Date
  title?: string
  message?: string
}): Promise<IProjectShare> {
  const shareToken = generateShareToken()

  // 如果有密码，需要哈希处理
  let passwordHash: string | undefined
  if (data.password) {
    const bcrypt = await import('bcryptjs')
    passwordHash = await bcrypt.hash(data.password, 10)
  }

  return this.create({
    ...data,
    shareToken,
    passwordHash,
    password: undefined,  // 不存储明文密码
    permission: data.permission || 'view',
    status: 'active',
    viewCount: 0,
  })
}

// 静态方法: 通过令牌获取分享
projectShareSchema.statics.getByToken = async function (
  token: string
): Promise<IProjectShare | null> {
  const share = await this.findOne({
    shareToken: token,
    status: 'active',
  }).populate('projectId', 'name description status phase')

  if (!share) return null

  // 检查是否过期
  if (share.expiresAt && share.expiresAt < new Date()) {
    share.status = 'expired'
    await share.save()
    return null
  }

  return share
}

// 静态方法: 获取项目的所有分享
projectShareSchema.statics.getProjectShares = async function (
  projectId: Types.ObjectId
): Promise<IProjectShare[]> {
  return this.find({ projectId })
    .sort({ createdAt: -1 })
    .lean()
}

// 静态方法: 撤销分享
projectShareSchema.statics.revokeShare = async function (
  shareId: Types.ObjectId,
  userId: Types.ObjectId
): Promise<boolean> {
  const result = await this.updateOne(
    { _id: shareId, userId },
    { status: 'revoked' }
  )
  return result.modifiedCount > 0
}

// 静态方法: 增加查看次数
projectShareSchema.statics.incrementViewCount = async function (
  token: string
): Promise<void> {
  await this.updateOne(
    { shareToken: token },
    {
      $inc: { viewCount: 1 },
      $set: { lastViewedAt: new Date() },
    }
  )
}

export const ProjectShare =
  (mongoose.models.ProjectShare as IProjectShareModel) ||
  mongoose.model<IProjectShare, IProjectShareModel>('ProjectShare', projectShareSchema)
