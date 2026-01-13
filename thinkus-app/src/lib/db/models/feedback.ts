import mongoose, { Schema, Document, Model, Types } from 'mongoose'

// 反馈类型
export type FeedbackType =
  | 'bug'
  | 'feature'
  | 'improvement'
  | 'question'
  | 'praise'
  | 'other'

// 反馈状态
export type FeedbackStatus =
  | 'pending'
  | 'reviewing'
  | 'in_progress'
  | 'resolved'
  | 'closed'

// 反馈优先级
export type FeedbackPriority = 'low' | 'medium' | 'high' | 'urgent'

// 反馈接口
export interface IFeedback extends Document {
  _id: Types.ObjectId
  userId: Types.ObjectId

  // 反馈内容
  type: FeedbackType
  title: string
  content: string

  // 上下文信息
  page?: string
  projectId?: Types.ObjectId

  // 状态
  status: FeedbackStatus
  priority: FeedbackPriority

  // 评分 (1-5)
  rating?: number

  // 附件
  attachments?: string[]

  // 管理员回复
  adminResponse?: string
  respondedAt?: Date
  respondedBy?: Types.ObjectId

  // 元数据
  userAgent?: string
  metadata?: Record<string, unknown>

  createdAt: Date
  updatedAt: Date
}

// 模型接口
export interface IFeedbackModel extends Model<IFeedback> {
  submitFeedback(data: {
    userId: Types.ObjectId
    type: FeedbackType
    title: string
    content: string
    page?: string
    projectId?: Types.ObjectId
    rating?: number
    attachments?: string[]
    userAgent?: string
    metadata?: Record<string, unknown>
  }): Promise<IFeedback>

  getUserFeedback(
    userId: Types.ObjectId,
    limit?: number
  ): Promise<IFeedback[]>

  getFeedbackStats(): Promise<{
    total: number
    byType: Record<string, number>
    byStatus: Record<string, number>
    avgRating: number
  }>
}

const FeedbackSchema = new Schema<IFeedback>(
  {
    userId: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    type: {
      type: String,
      enum: ['bug', 'feature', 'improvement', 'question', 'praise', 'other'],
      required: true,
    },
    title: {
      type: String,
      required: true,
      maxlength: 200,
    },
    content: {
      type: String,
      required: true,
      maxlength: 5000,
    },
    page: String,
    projectId: {
      type: Schema.Types.ObjectId,
      ref: 'Project',
    },
    status: {
      type: String,
      enum: ['pending', 'reviewing', 'in_progress', 'resolved', 'closed'],
      default: 'pending',
    },
    priority: {
      type: String,
      enum: ['low', 'medium', 'high', 'urgent'],
      default: 'medium',
    },
    rating: {
      type: Number,
      min: 1,
      max: 5,
    },
    attachments: [String],
    adminResponse: String,
    respondedAt: Date,
    respondedBy: {
      type: Schema.Types.ObjectId,
      ref: 'User',
    },
    userAgent: String,
    metadata: Schema.Types.Mixed,
  },
  {
    timestamps: true,
    collection: 'feedback',
  }
)

// 索引
FeedbackSchema.index({ userId: 1, createdAt: -1 })
FeedbackSchema.index({ status: 1, createdAt: -1 })
FeedbackSchema.index({ type: 1, status: 1 })
FeedbackSchema.index({ createdAt: -1 })

// 提交反馈
FeedbackSchema.statics.submitFeedback = async function (data: {
  userId: Types.ObjectId
  type: FeedbackType
  title: string
  content: string
  page?: string
  projectId?: Types.ObjectId
  rating?: number
  attachments?: string[]
  userAgent?: string
  metadata?: Record<string, unknown>
}): Promise<IFeedback> {
  // 根据类型设置默认优先级
  let priority: FeedbackPriority = 'medium'
  if (data.type === 'bug') {
    priority = 'high'
  } else if (data.type === 'praise' || data.type === 'other') {
    priority = 'low'
  }

  return this.create({
    ...data,
    priority,
    status: 'pending',
  })
}

// 获取用户反馈
FeedbackSchema.statics.getUserFeedback = async function (
  userId: Types.ObjectId,
  limit: number = 20
): Promise<IFeedback[]> {
  return this.find({ userId })
    .sort({ createdAt: -1 })
    .limit(limit)
    .lean()
}

// 获取反馈统计
FeedbackSchema.statics.getFeedbackStats = async function (): Promise<{
  total: number
  byType: Record<string, number>
  byStatus: Record<string, number>
  avgRating: number
}> {
  const [total, byType, byStatus, ratingResult] = await Promise.all([
    this.countDocuments(),
    this.aggregate([
      { $group: { _id: '$type', count: { $sum: 1 } } },
    ]),
    this.aggregate([
      { $group: { _id: '$status', count: { $sum: 1 } } },
    ]),
    this.aggregate([
      { $match: { rating: { $exists: true, $ne: null } } },
      { $group: { _id: null, avgRating: { $avg: '$rating' } } },
    ]),
  ])

  const byTypeMap: Record<string, number> = {}
  for (const item of byType) {
    byTypeMap[item._id] = item.count
  }

  const byStatusMap: Record<string, number> = {}
  for (const item of byStatus) {
    byStatusMap[item._id] = item.count
  }

  return {
    total,
    byType: byTypeMap,
    byStatus: byStatusMap,
    avgRating: ratingResult[0]?.avgRating || 0,
  }
}

export const Feedback =
  (mongoose.models.Feedback as IFeedbackModel) ||
  mongoose.model<IFeedback, IFeedbackModel>('Feedback', FeedbackSchema)
