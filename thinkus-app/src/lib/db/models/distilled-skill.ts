import mongoose, { Document, Schema, Model } from 'mongoose'
import type { ExpertId, ExpertDomain } from '@/lib/config/external-experts'

// 技能类别
export type SkillCategory =
  | 'strategy'       // 战略建议
  | 'implementation' // 实施方法
  | 'best_practice'  // 最佳实践
  | 'pitfall'        // 常见陷阱
  | 'framework'      // 思维框架
  | 'tool'           // 工具推荐

// 蒸馏技能接口
export interface IDistilledSkill extends Document {
  _id: mongoose.Types.ObjectId

  // 来源
  sourceConsultationId: mongoose.Types.ObjectId
  expertId: ExpertId
  expertDomain: ExpertDomain

  // 内容 (已匿名化)
  title: string
  content: string
  summary: string
  category: SkillCategory
  tags: string[]

  // 向量索引
  vectorId?: string
  namespace?: string

  // 质量和使用
  qualityScore: number  // 1-10
  useCount: number
  helpfulCount: number

  // 分发状态
  isPublished: boolean
  isDistributed: boolean
  distributedAt?: Date

  createdAt: Date
  updatedAt: Date
}

// 静态方法接口
export interface IDistilledSkillModel extends Model<IDistilledSkill> {
  getSkillsByDomain(domain: ExpertDomain, limit?: number): Promise<IDistilledSkill[]>
  getTopSkills(limit?: number): Promise<IDistilledSkill[]>
  incrementUseCount(skillId: mongoose.Types.ObjectId): Promise<void>
  markAsHelpful(skillId: mongoose.Types.ObjectId): Promise<void>
}

// Schema定义
const distilledSkillSchema = new Schema<IDistilledSkill>(
  {
    sourceConsultationId: {
      type: Schema.Types.ObjectId,
      ref: 'ExpertConsultation',
      required: true,
    },
    expertId: {
      type: String,
      required: true,
      index: true,
    },
    expertDomain: {
      type: String,
      required: true,
      index: true,
    },
    title: {
      type: String,
      required: true,
    },
    content: {
      type: String,
      required: true,
    },
    summary: {
      type: String,
      required: true,
    },
    category: {
      type: String,
      enum: ['strategy', 'implementation', 'best_practice', 'pitfall', 'framework', 'tool'],
      required: true,
      index: true,
    },
    tags: [String],
    vectorId: String,
    namespace: String,
    qualityScore: {
      type: Number,
      min: 1,
      max: 10,
      default: 5,
    },
    useCount: {
      type: Number,
      default: 0,
    },
    helpfulCount: {
      type: Number,
      default: 0,
    },
    isPublished: {
      type: Boolean,
      default: false,
    },
    isDistributed: {
      type: Boolean,
      default: false,
    },
    distributedAt: Date,
  },
  {
    timestamps: true,
    collection: 'distilled_skills',
  }
)

// 索引
distilledSkillSchema.index({ expertDomain: 1, qualityScore: -1 })
distilledSkillSchema.index({ category: 1, isPublished: 1 })
distilledSkillSchema.index({ tags: 1 })
distilledSkillSchema.index({ qualityScore: -1, useCount: -1 })

// 静态方法: 按领域获取技能
distilledSkillSchema.statics.getSkillsByDomain = async function(
  domain: ExpertDomain,
  limit: number = 20
): Promise<IDistilledSkill[]> {
  return this.find({ expertDomain: domain, isPublished: true })
    .sort({ qualityScore: -1, useCount: -1 })
    .limit(limit)
    .lean()
}

// 静态方法: 获取顶级技能
distilledSkillSchema.statics.getTopSkills = async function(
  limit: number = 50
): Promise<IDistilledSkill[]> {
  return this.find({ isPublished: true })
    .sort({ qualityScore: -1, helpfulCount: -1 })
    .limit(limit)
    .lean()
}

// 静态方法: 增加使用计数
distilledSkillSchema.statics.incrementUseCount = async function(
  skillId: mongoose.Types.ObjectId
): Promise<void> {
  await this.findByIdAndUpdate(skillId, { $inc: { useCount: 1 } })
}

// 静态方法: 标记为有用
distilledSkillSchema.statics.markAsHelpful = async function(
  skillId: mongoose.Types.ObjectId
): Promise<void> {
  await this.findByIdAndUpdate(skillId, { $inc: { helpfulCount: 1 } })
}

// 导出模型
export const DistilledSkill =
  (mongoose.models.DistilledSkill as IDistilledSkillModel) ||
  mongoose.model<IDistilledSkill, IDistilledSkillModel>('DistilledSkill', distilledSkillSchema)
