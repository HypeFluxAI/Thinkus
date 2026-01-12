import mongoose, { Schema, Document, Model, Types } from 'mongoose'
import type { AgentId } from '@/lib/config/executives'

// 决策类型
export type DecisionType =
  | 'feature' // 功能决策
  | 'technical' // 技术决策
  | 'design' // 设计决策
  | 'business' // 业务决策
  | 'priority' // 优先级决策
  | 'resource' // 资源分配决策
  | 'other' // 其他

// 决策状态
export type DecisionStatus =
  | 'proposed' // 提议中
  | 'approved' // 已批准
  | 'rejected' // 已拒绝
  | 'implemented' // 已实施
  | 'superseded' // 已被替代

// 决策重要性
export type DecisionImportance = 'critical' | 'high' | 'medium' | 'low'

// 决策接口
export interface IDecision extends Document {
  _id: Types.ObjectId
  userId: Types.ObjectId
  projectId: Types.ObjectId
  discussionId?: Types.ObjectId

  // 决策内容
  title: string
  description: string
  type: DecisionType
  status: DecisionStatus
  importance: DecisionImportance

  // 决策参与者
  proposedBy: AgentId | 'user'
  approvedBy?: Array<AgentId | 'user'>
  rejectedBy?: Array<AgentId | 'user'>

  // 决策依据
  rationale?: string
  alternatives?: Array<{
    description: string
    pros: string[]
    cons: string[]
  }>
  risks?: string[]
  dependencies?: Types.ObjectId[] // 依赖的其他决策

  // 关联行动项
  actionItems?: Types.ObjectId[]

  // 标签和元数据
  tags?: string[]
  metadata?: Record<string, unknown>

  // 时间追踪
  proposedAt: Date
  approvedAt?: Date
  implementedAt?: Date
  supersededBy?: Types.ObjectId
  supersededAt?: Date

  createdAt: Date
  updatedAt: Date
}

// 决策模型方法
export interface IDecisionModel extends Model<IDecision> {
  getProjectDecisions(
    projectId: Types.ObjectId,
    options?: {
      status?: DecisionStatus
      type?: DecisionType
      importance?: DecisionImportance
      limit?: number
      skip?: number
    }
  ): Promise<IDecision[]>
  getRecentDecisions(
    userId: Types.ObjectId,
    limit?: number
  ): Promise<IDecision[]>
  getDecisionStats(projectId: Types.ObjectId): Promise<{
    total: number
    byStatus: Record<DecisionStatus, number>
    byType: Record<DecisionType, number>
    byImportance: Record<DecisionImportance, number>
  }>
}

const DecisionSchema = new Schema<IDecision>(
  {
    userId: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    projectId: {
      type: Schema.Types.ObjectId,
      ref: 'Project',
      required: true,
    },
    discussionId: {
      type: Schema.Types.ObjectId,
      ref: 'Discussion',
    },

    // 决策内容
    title: {
      type: String,
      required: true,
      trim: true,
    },
    description: {
      type: String,
      required: true,
    },
    type: {
      type: String,
      enum: ['feature', 'technical', 'design', 'business', 'priority', 'resource', 'other'],
      default: 'other',
    },
    status: {
      type: String,
      enum: ['proposed', 'approved', 'rejected', 'implemented', 'superseded'],
      default: 'proposed',
    },
    importance: {
      type: String,
      enum: ['critical', 'high', 'medium', 'low'],
      default: 'medium',
    },

    // 决策参与者
    proposedBy: {
      type: String,
      required: true,
    },
    approvedBy: [String],
    rejectedBy: [String],

    // 决策依据
    rationale: String,
    alternatives: [
      {
        description: String,
        pros: [String],
        cons: [String],
      },
    ],
    risks: [String],
    dependencies: [
      {
        type: Schema.Types.ObjectId,
        ref: 'Decision',
      },
    ],

    // 关联行动项
    actionItems: [
      {
        type: Schema.Types.ObjectId,
        ref: 'ActionItem',
      },
    ],

    // 标签和元数据
    tags: [String],
    metadata: Schema.Types.Mixed,

    // 时间追踪
    proposedAt: {
      type: Date,
      default: Date.now,
    },
    approvedAt: Date,
    implementedAt: Date,
    supersededBy: {
      type: Schema.Types.ObjectId,
      ref: 'Decision',
    },
    supersededAt: Date,
  },
  {
    timestamps: true,
  }
)

// 索引
DecisionSchema.index({ userId: 1, createdAt: -1 })
DecisionSchema.index({ projectId: 1, createdAt: -1 })
DecisionSchema.index({ projectId: 1, status: 1 })
DecisionSchema.index({ projectId: 1, type: 1 })
DecisionSchema.index({ discussionId: 1 })
DecisionSchema.index({ tags: 1 })

// 获取项目决策
DecisionSchema.statics.getProjectDecisions = async function (
  projectId: Types.ObjectId,
  options: {
    status?: DecisionStatus
    type?: DecisionType
    importance?: DecisionImportance
    limit?: number
    skip?: number
  } = {}
): Promise<IDecision[]> {
  const { status, type, importance, limit = 50, skip = 0 } = options

  const query: Record<string, unknown> = { projectId }
  if (status) query.status = status
  if (type) query.type = type
  if (importance) query.importance = importance

  return this.find(query)
    .sort({ createdAt: -1 })
    .skip(skip)
    .limit(limit)
    .populate('discussionId', 'topic')
    .exec()
}

// 获取用户最近决策
DecisionSchema.statics.getRecentDecisions = async function (
  userId: Types.ObjectId,
  limit: number = 10
): Promise<IDecision[]> {
  return this.find({ userId })
    .sort({ createdAt: -1 })
    .limit(limit)
    .populate('projectId', 'name icon')
    .exec()
}

// 获取项目决策统计
DecisionSchema.statics.getDecisionStats = async function (
  projectId: Types.ObjectId
): Promise<{
  total: number
  byStatus: Record<DecisionStatus, number>
  byType: Record<DecisionType, number>
  byImportance: Record<DecisionImportance, number>
}> {
  const [total, statusAgg, typeAgg, importanceAgg] = await Promise.all([
    this.countDocuments({ projectId }),
    this.aggregate([
      { $match: { projectId } },
      { $group: { _id: '$status', count: { $sum: 1 } } },
    ]),
    this.aggregate([
      { $match: { projectId } },
      { $group: { _id: '$type', count: { $sum: 1 } } },
    ]),
    this.aggregate([
      { $match: { projectId } },
      { $group: { _id: '$importance', count: { $sum: 1 } } },
    ]),
  ])

  const byStatus = {} as Record<DecisionStatus, number>
  for (const item of statusAgg) {
    byStatus[item._id as DecisionStatus] = item.count
  }

  const byType = {} as Record<DecisionType, number>
  for (const item of typeAgg) {
    byType[item._id as DecisionType] = item.count
  }

  const byImportance = {} as Record<DecisionImportance, number>
  for (const item of importanceAgg) {
    byImportance[item._id as DecisionImportance] = item.count
  }

  return { total, byStatus, byType, byImportance }
}

// 避免模型重复编译
export const Decision = (mongoose.models.Decision as IDecisionModel) ||
  mongoose.model<IDecision, IDecisionModel>('Decision', DecisionSchema)
