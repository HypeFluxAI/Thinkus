import mongoose, { Schema, Document, Model, Types } from 'mongoose'
import type { AgentId } from '@/lib/config/executives'

// 行动项状态
export type ActionItemStatus = 'pending' | 'in_progress' | 'completed' | 'blocked' | 'canceled'

// 行动项优先级
export type ActionItemPriority = 'urgent' | 'high' | 'medium' | 'low'

// 行动项类别
export type ActionItemCategory =
  | 'development' // 开发任务
  | 'design' // 设计任务
  | 'research' // 研究调查
  | 'review' // 审核评审
  | 'meeting' // 会议
  | 'documentation' // 文档
  | 'testing' // 测试
  | 'deployment' // 部署
  | 'other' // 其他

// 行动项接口
export interface IActionItem extends Document {
  _id: Types.ObjectId
  userId: Types.ObjectId
  projectId: Types.ObjectId
  discussionId?: Types.ObjectId
  decisionId?: Types.ObjectId

  // 行动项内容
  title: string
  description?: string
  category: ActionItemCategory
  status: ActionItemStatus
  priority: ActionItemPriority

  // 分配
  assignee: AgentId | 'user'
  assignedBy: AgentId | 'user' | 'system'

  // 时间
  dueDate?: Date
  startedAt?: Date
  completedAt?: Date
  estimatedHours?: number
  actualHours?: number

  // 进度
  progress?: number // 0-100
  blockedReason?: string
  notes?: string

  // 检查项
  checklist?: Array<{
    id: string
    text: string
    completed: boolean
  }>

  // 依赖
  dependencies?: Types.ObjectId[]
  blockedBy?: Types.ObjectId[]

  // 标签
  tags?: string[]

  createdAt: Date
  updatedAt: Date
}

// 行动项模型方法
export interface IActionItemModel extends Model<IActionItem> {
  getProjectActionItems(
    projectId: Types.ObjectId,
    options?: {
      status?: ActionItemStatus
      assignee?: string
      priority?: ActionItemPriority
      limit?: number
    }
  ): Promise<IActionItem[]>
  getUserActionItems(
    userId: Types.ObjectId,
    options?: {
      status?: ActionItemStatus
      projectId?: Types.ObjectId
      limit?: number
    }
  ): Promise<IActionItem[]>
  getOverdueItems(userId: Types.ObjectId): Promise<IActionItem[]>
  getActionItemStats(projectId: Types.ObjectId): Promise<{
    total: number
    completed: number
    pending: number
    inProgress: number
    blocked: number
    overdue: number
  }>
}

const ActionItemSchema = new Schema<IActionItem>(
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
    decisionId: {
      type: Schema.Types.ObjectId,
      ref: 'Decision',
    },

    // 行动项内容
    title: {
      type: String,
      required: true,
      trim: true,
    },
    description: String,
    category: {
      type: String,
      enum: ['development', 'design', 'research', 'review', 'meeting', 'documentation', 'testing', 'deployment', 'other'],
      default: 'other',
    },
    status: {
      type: String,
      enum: ['pending', 'in_progress', 'completed', 'blocked', 'canceled'],
      default: 'pending',
    },
    priority: {
      type: String,
      enum: ['urgent', 'high', 'medium', 'low'],
      default: 'medium',
    },

    // 分配
    assignee: {
      type: String,
      required: true,
    },
    assignedBy: {
      type: String,
      default: 'system',
    },

    // 时间
    dueDate: Date,
    startedAt: Date,
    completedAt: Date,
    estimatedHours: Number,
    actualHours: Number,

    // 进度
    progress: {
      type: Number,
      min: 0,
      max: 100,
      default: 0,
    },
    blockedReason: String,
    notes: String,

    // 检查项
    checklist: [
      {
        id: String,
        text: String,
        completed: { type: Boolean, default: false },
      },
    ],

    // 依赖
    dependencies: [
      {
        type: Schema.Types.ObjectId,
        ref: 'ActionItem',
      },
    ],
    blockedBy: [
      {
        type: Schema.Types.ObjectId,
        ref: 'ActionItem',
      },
    ],

    // 标签
    tags: [String],
  },
  {
    timestamps: true,
  }
)

// 索引
ActionItemSchema.index({ userId: 1, status: 1 })
ActionItemSchema.index({ projectId: 1, status: 1 })
ActionItemSchema.index({ projectId: 1, assignee: 1 })
ActionItemSchema.index({ discussionId: 1 })
ActionItemSchema.index({ decisionId: 1 })
ActionItemSchema.index({ dueDate: 1 })
ActionItemSchema.index({ status: 1, dueDate: 1 })

// 获取项目行动项
ActionItemSchema.statics.getProjectActionItems = async function (
  projectId: Types.ObjectId,
  options: {
    status?: ActionItemStatus
    assignee?: string
    priority?: ActionItemPriority
    limit?: number
  } = {}
): Promise<IActionItem[]> {
  const { status, assignee, priority, limit = 50 } = options

  const query: Record<string, unknown> = { projectId }
  if (status) query.status = status
  if (assignee) query.assignee = assignee
  if (priority) query.priority = priority

  return this.find(query)
    .sort({ priority: 1, dueDate: 1, createdAt: -1 })
    .limit(limit)
    .populate('discussionId', 'topic')
    .populate('decisionId', 'title')
    .exec()
}

// 获取用户行动项
ActionItemSchema.statics.getUserActionItems = async function (
  userId: Types.ObjectId,
  options: {
    status?: ActionItemStatus
    projectId?: Types.ObjectId
    limit?: number
  } = {}
): Promise<IActionItem[]> {
  const { status, projectId, limit = 50 } = options

  const query: Record<string, unknown> = { userId }
  if (status) query.status = status
  if (projectId) query.projectId = projectId

  return this.find(query)
    .sort({ priority: 1, dueDate: 1, createdAt: -1 })
    .limit(limit)
    .populate('projectId', 'name icon')
    .exec()
}

// 获取逾期行动项
ActionItemSchema.statics.getOverdueItems = async function (
  userId: Types.ObjectId
): Promise<IActionItem[]> {
  return this.find({
    userId,
    status: { $in: ['pending', 'in_progress'] },
    dueDate: { $lt: new Date() },
  })
    .sort({ dueDate: 1 })
    .populate('projectId', 'name icon')
    .exec()
}

// 获取行动项统计
ActionItemSchema.statics.getActionItemStats = async function (
  projectId: Types.ObjectId
): Promise<{
  total: number
  completed: number
  pending: number
  inProgress: number
  blocked: number
  overdue: number
}> {
  const now = new Date()

  const [total, completed, pending, inProgress, blocked, overdue] = await Promise.all([
    this.countDocuments({ projectId }),
    this.countDocuments({ projectId, status: 'completed' }),
    this.countDocuments({ projectId, status: 'pending' }),
    this.countDocuments({ projectId, status: 'in_progress' }),
    this.countDocuments({ projectId, status: 'blocked' }),
    this.countDocuments({
      projectId,
      status: { $in: ['pending', 'in_progress'] },
      dueDate: { $lt: now },
    }),
  ])

  return { total, completed, pending, inProgress, blocked, overdue }
}

// 避免模型重复编译
export const ActionItem = (mongoose.models.ActionItem as IActionItemModel) ||
  mongoose.model<IActionItem, IActionItemModel>('ActionItem', ActionItemSchema)
