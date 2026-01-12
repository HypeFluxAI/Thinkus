import mongoose, { Document, Schema, Model } from 'mongoose'

// 申请者角色类型
export type ApplicantRole = 'founder' | 'pm' | 'developer' | 'student' | 'other'

// 审核状态类型
export type ReviewStatus = 'pending' | 'approved' | 'rejected'

// 优先级类型
export type QueuePriority = 'high' | 'normal'

// Waitlist 接口
export interface IWaitlist extends Document {
  _id: mongoose.Types.ObjectId
  email: string

  // 申请信息
  application: {
    projectIdea: string
    role: ApplicantRole
    referralSource?: string
    socialLinks?: string[]
  }

  // 排队信息
  queue: {
    position: number
    appliedAt: Date
    score: number
    priority: QueuePriority
  }

  // 审核
  review: {
    status: ReviewStatus
    reviewedAt?: Date
    reviewedBy?: string
  }

  // 邀请码
  invitationCode?: string
  invitationExpiresAt?: Date

  // 转化
  converted: boolean
  convertedUserId?: mongoose.Types.ObjectId

  createdAt: Date

  // 实例方法
  getAheadCount(): Promise<number>
}

// 申请信息Schema
const applicationSchema = new Schema(
  {
    projectIdea: {
      type: String,
      required: true,
      maxlength: 2000,
    },
    role: {
      type: String,
      enum: ['founder', 'pm', 'developer', 'student', 'other'],
      required: true,
    },
    referralSource: { type: String, maxlength: 200 },
    socialLinks: [{ type: String, maxlength: 500 }],
  },
  { _id: false }
)

// 排队信息Schema
const queueSchema = new Schema(
  {
    position: {
      type: Number,
      required: true,
      min: 1,
    },
    appliedAt: {
      type: Date,
      required: true,
      default: Date.now,
    },
    score: {
      type: Number,
      default: 0,
      min: 0,
      max: 100,
    },
    priority: {
      type: String,
      enum: ['high', 'normal'],
      default: 'normal',
    },
  },
  { _id: false }
)

// 审核Schema
const reviewSchema = new Schema(
  {
    status: {
      type: String,
      enum: ['pending', 'approved', 'rejected'],
      default: 'pending',
    },
    reviewedAt: { type: Date },
    reviewedBy: { type: String },
  },
  { _id: false }
)

// Waitlist Schema
const waitlistSchema = new Schema<IWaitlist>(
  {
    email: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true,
      index: true,
    },
    application: {
      type: applicationSchema,
      required: true,
    },
    queue: {
      type: queueSchema,
      required: true,
    },
    review: {
      type: reviewSchema,
      default: () => ({ status: 'pending' }),
    },
    invitationCode: { type: String },
    invitationExpiresAt: { type: Date },
    converted: { type: Boolean, default: false },
    convertedUserId: {
      type: Schema.Types.ObjectId,
      ref: 'User',
    },
  },
  {
    timestamps: true,
    collection: 'waitlist',
  }
)

// 索引
waitlistSchema.index({ 'queue.position': 1 })
waitlistSchema.index({ 'queue.score': -1 })
waitlistSchema.index({ 'review.status': 1 })
waitlistSchema.index({ converted: 1 })

// 静态方法: 获取下一个排队位置
waitlistSchema.statics.getNextPosition = async function (): Promise<number> {
  const last = await this.findOne().sort({ 'queue.position': -1 })
  return last ? last.queue.position + 1 : 1
}

// 静态方法: 计算申请分数
waitlistSchema.statics.calculateScore = function (application: {
  projectIdea: string
  role: ApplicantRole
  referralSource?: string
  socialLinks?: string[]
}): number {
  let score = 0

  // 项目想法长度 (最多30分)
  const ideaLength = application.projectIdea.length
  if (ideaLength > 500) score += 30
  else if (ideaLength > 200) score += 20
  else if (ideaLength > 100) score += 10

  // 角色加分 (最多20分)
  const roleScores: Record<ApplicantRole, number> = {
    founder: 20,
    pm: 15,
    developer: 15,
    student: 10,
    other: 5,
  }
  score += roleScores[application.role]

  // 推荐来源 (最多20分)
  if (application.referralSource) {
    if (application.referralSource.toLowerCase().includes('friend')) score += 20
    else if (application.referralSource.toLowerCase().includes('twitter')) score += 15
    else if (application.referralSource.toLowerCase().includes('reddit')) score += 10
    else score += 5
  }

  // 社交链接 (最多30分)
  if (application.socialLinks && application.socialLinks.length > 0) {
    score += Math.min(application.socialLinks.length * 10, 30)
  }

  return Math.min(score, 100)
}

// 静态方法: 创建新申请
waitlistSchema.statics.createApplication = async function (data: {
  email: string
  projectIdea: string
  role: ApplicantRole
  referralSource?: string
  socialLinks?: string[]
}): Promise<IWaitlist> {
  const { email, projectIdea, role, referralSource, socialLinks } = data

  // 检查是否已存在
  const existing = await this.findOne({ email })
  if (existing) {
    throw new Error('Email already in waitlist')
  }

  const model = this as unknown as IWaitlistModel
  const position = await model.getNextPosition()
  const score = model.calculateScore({ projectIdea, role, referralSource, socialLinks })

  const application = new this({
    email,
    application: {
      projectIdea,
      role,
      referralSource,
      socialLinks,
    },
    queue: {
      position,
      appliedAt: new Date(),
      score,
      priority: score >= 70 ? 'high' : 'normal',
    },
    review: {
      status: 'pending',
    },
  })

  return application.save()
}

// 静态方法: 获取排队列表
waitlistSchema.statics.getQueueList = async function (options: {
  status?: ReviewStatus
  limit?: number
  skip?: number
}): Promise<{ list: IWaitlist[]; total: number }> {
  const { status, limit = 20, skip = 0 } = options

  const query: Record<string, unknown> = {}
  if (status) {
    query['review.status'] = status
  }

  const [list, total] = await Promise.all([
    this.find(query)
      .sort({ 'queue.priority': -1, 'queue.score': -1, 'queue.appliedAt': 1 })
      .skip(skip)
      .limit(limit),
    this.countDocuments(query),
  ])

  return { list, total }
}

// 静态方法: 批准申请
waitlistSchema.statics.approveApplication = async function (
  email: string,
  invitationCode: string,
  reviewedBy?: string
): Promise<IWaitlist | null> {
  return this.findOneAndUpdate(
    { email },
    {
      $set: {
        'review.status': 'approved',
        'review.reviewedAt': new Date(),
        'review.reviewedBy': reviewedBy,
        invitationCode,
        invitationExpiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 7天有效
      },
    },
    { new: true }
  )
}

// 静态方法: 拒绝申请
waitlistSchema.statics.rejectApplication = async function (
  email: string,
  reviewedBy?: string
): Promise<IWaitlist | null> {
  return this.findOneAndUpdate(
    { email },
    {
      $set: {
        'review.status': 'rejected',
        'review.reviewedAt': new Date(),
        'review.reviewedBy': reviewedBy,
      },
    },
    { new: true }
  )
}

// 静态方法: 标记为已转化
waitlistSchema.statics.markAsConverted = async function (
  email: string,
  userId: mongoose.Types.ObjectId
): Promise<IWaitlist | null> {
  return this.findOneAndUpdate(
    { email },
    {
      $set: {
        converted: true,
        convertedUserId: userId,
      },
    },
    { new: true }
  )
}

// 实例方法: 获取排队前面的人数
waitlistSchema.methods.getAheadCount = async function (): Promise<number> {
  const model = this.constructor as IWaitlistModel
  return model.countDocuments({
    'queue.position': { $lt: this.queue.position },
    'review.status': 'pending',
    converted: false,
  })
}

// 模型接口扩展
export interface IWaitlistModel extends Model<IWaitlist> {
  getNextPosition(): Promise<number>
  calculateScore(application: {
    projectIdea: string
    role: ApplicantRole
    referralSource?: string
    socialLinks?: string[]
  }): number
  createApplication(data: {
    email: string
    projectIdea: string
    role: ApplicantRole
    referralSource?: string
    socialLinks?: string[]
  }): Promise<IWaitlist>
  getQueueList(options: {
    status?: ReviewStatus
    limit?: number
    skip?: number
  }): Promise<{ list: IWaitlist[]; total: number }>
  approveApplication(
    email: string,
    invitationCode: string,
    reviewedBy?: string
  ): Promise<IWaitlist | null>
  rejectApplication(email: string, reviewedBy?: string): Promise<IWaitlist | null>
  markAsConverted(
    email: string,
    userId: mongoose.Types.ObjectId
  ): Promise<IWaitlist | null>
}

// 导出模型
export const Waitlist =
  (mongoose.models.Waitlist as IWaitlistModel) ||
  mongoose.model<IWaitlist, IWaitlistModel>('Waitlist', waitlistSchema)
