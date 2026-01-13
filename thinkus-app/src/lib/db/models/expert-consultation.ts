import mongoose, { Document, Schema, Model } from 'mongoose'
import type { ExpertId } from '@/lib/config/external-experts'

// 咨询状态
export type ConsultationStatus = 'active' | 'completed' | 'expired'

// 咨询消息
export interface ConsultationMessage {
  role: 'user' | 'expert'
  content: string
  createdAt: Date
}

// 咨询记录接口
export interface IExpertConsultation extends Document {
  _id: mongoose.Types.ObjectId
  userId: mongoose.Types.ObjectId
  projectId?: mongoose.Types.ObjectId

  // 专家信息
  expertId: ExpertId

  // 咨询内容
  topic: string
  messages: ConsultationMessage[]

  // 状态
  status: ConsultationStatus

  // 费用
  creditsUsed: number

  // 技能蒸馏
  distilledInsights?: string[]
  isDistilled: boolean

  createdAt: Date
  updatedAt: Date
  completedAt?: Date
}

// 静态方法接口
export interface IExpertConsultationModel extends Model<IExpertConsultation> {
  startConsultation(data: {
    userId: mongoose.Types.ObjectId
    projectId?: mongoose.Types.ObjectId
    expertId: ExpertId
    topic: string
    creditsUsed: number
  }): Promise<IExpertConsultation>
  addMessage(
    consultationId: mongoose.Types.ObjectId,
    message: Omit<ConsultationMessage, 'createdAt'>
  ): Promise<IExpertConsultation | null>
  completeConsultation(consultationId: mongoose.Types.ObjectId): Promise<IExpertConsultation | null>
  getUserConsultations(
    userId: mongoose.Types.ObjectId,
    options?: { expertId?: ExpertId; limit?: number }
  ): Promise<IExpertConsultation[]>
  getConsultationStats(userId: mongoose.Types.ObjectId): Promise<{
    total: number
    byExpert: Record<string, number>
    totalCreditsUsed: number
  }>
}

// Schema定义
const expertConsultationSchema = new Schema<IExpertConsultation>(
  {
    userId: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    projectId: {
      type: Schema.Types.ObjectId,
      ref: 'Project',
      index: true,
    },
    expertId: {
      type: String,
      required: true,
      index: true,
    },
    topic: {
      type: String,
      required: true,
    },
    messages: [{
      role: {
        type: String,
        enum: ['user', 'expert'],
        required: true,
      },
      content: {
        type: String,
        required: true,
      },
      createdAt: {
        type: Date,
        default: Date.now,
      },
    }],
    status: {
      type: String,
      enum: ['active', 'completed', 'expired'],
      default: 'active',
      index: true,
    },
    creditsUsed: {
      type: Number,
      required: true,
      default: 1,
    },
    distilledInsights: [String],
    isDistilled: {
      type: Boolean,
      default: false,
    },
    completedAt: Date,
  },
  {
    timestamps: true,
    collection: 'expert_consultations',
  }
)

// 索引
expertConsultationSchema.index({ userId: 1, expertId: 1 })
expertConsultationSchema.index({ userId: 1, status: 1 })
expertConsultationSchema.index({ createdAt: -1 })

// 静态方法: 开始咨询
expertConsultationSchema.statics.startConsultation = async function(data: {
  userId: mongoose.Types.ObjectId
  projectId?: mongoose.Types.ObjectId
  expertId: ExpertId
  topic: string
  creditsUsed: number
}): Promise<IExpertConsultation> {
  return this.create({
    ...data,
    status: 'active',
    messages: [],
    isDistilled: false,
  })
}

// 静态方法: 添加消息
expertConsultationSchema.statics.addMessage = async function(
  consultationId: mongoose.Types.ObjectId,
  message: Omit<ConsultationMessage, 'createdAt'>
): Promise<IExpertConsultation | null> {
  return this.findByIdAndUpdate(
    consultationId,
    {
      $push: {
        messages: {
          ...message,
          createdAt: new Date(),
        },
      },
    },
    { new: true }
  )
}

// 静态方法: 完成咨询
expertConsultationSchema.statics.completeConsultation = async function(
  consultationId: mongoose.Types.ObjectId
): Promise<IExpertConsultation | null> {
  return this.findByIdAndUpdate(
    consultationId,
    {
      $set: {
        status: 'completed',
        completedAt: new Date(),
      },
    },
    { new: true }
  )
}

// 静态方法: 获取用户咨询记录
expertConsultationSchema.statics.getUserConsultations = async function(
  userId: mongoose.Types.ObjectId,
  options: { expertId?: ExpertId; limit?: number } = {}
): Promise<IExpertConsultation[]> {
  const { expertId, limit = 50 } = options

  const query: Record<string, unknown> = { userId }
  if (expertId) query.expertId = expertId

  return this.find(query)
    .sort({ createdAt: -1 })
    .limit(limit)
    .lean()
}

// 静态方法: 获取咨询统计
expertConsultationSchema.statics.getConsultationStats = async function(
  userId: mongoose.Types.ObjectId
): Promise<{
  total: number
  byExpert: Record<string, number>
  totalCreditsUsed: number
}> {
  const [total, byExpert, totalCredits] = await Promise.all([
    this.countDocuments({ userId }),
    this.aggregate([
      { $match: { userId } },
      { $group: { _id: '$expertId', count: { $sum: 1 } } },
    ]),
    this.aggregate([
      { $match: { userId } },
      { $group: { _id: null, total: { $sum: '$creditsUsed' } } },
    ]),
  ])

  const expertStats: Record<string, number> = {}
  byExpert.forEach((item: { _id: string; count: number }) => {
    expertStats[item._id] = item.count
  })

  return {
    total,
    byExpert: expertStats,
    totalCreditsUsed: totalCredits[0]?.total || 0,
  }
}

// 导出模型
export const ExpertConsultation =
  (mongoose.models.ExpertConsultation as IExpertConsultationModel) ||
  mongoose.model<IExpertConsultation, IExpertConsultationModel>(
    'ExpertConsultation',
    expertConsultationSchema
  )
