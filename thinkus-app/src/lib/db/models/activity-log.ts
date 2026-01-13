import mongoose, { Schema, Document, Model, Types } from 'mongoose'

// 活动类型
export type ActivityType =
  | 'project_created'
  | 'project_updated'
  | 'project_deleted'
  | 'discussion_started'
  | 'discussion_completed'
  | 'decision_proposed'
  | 'decision_approved'
  | 'decision_rejected'
  | 'action_created'
  | 'action_completed'
  | 'standup_held'
  | 'expert_consulted'
  | 'payment_made'
  | 'settings_updated'
  | 'user_login'
  | 'user_logout'

// 活动实体类型
export type ActivityEntity =
  | 'project'
  | 'discussion'
  | 'decision'
  | 'action_item'
  | 'standup'
  | 'expert'
  | 'payment'
  | 'user'

// 活动日志接口
export interface IActivityLog extends Document {
  _id: Types.ObjectId
  userId: Types.ObjectId
  projectId?: Types.ObjectId

  // 活动类型
  type: ActivityType
  entity: ActivityEntity
  entityId?: Types.ObjectId

  // 活动描述
  title: string
  description?: string

  // 执行者（可能是 AI 高管）
  actor?: {
    type: 'user' | 'ai_executive' | 'system'
    id?: string
    name?: string
  }

  // 变更详情
  changes?: {
    field: string
    oldValue?: unknown
    newValue?: unknown
  }[]

  // 元数据
  metadata?: Record<string, unknown>

  // IP 地址（用于安全审计）
  ipAddress?: string
  userAgent?: string

  createdAt: Date
}

// 模型接口
export interface IActivityLogModel extends Model<IActivityLog> {
  log(data: {
    userId: Types.ObjectId
    projectId?: Types.ObjectId
    type: ActivityType
    entity: ActivityEntity
    entityId?: Types.ObjectId
    title: string
    description?: string
    actor?: {
      type: 'user' | 'ai_executive' | 'system'
      id?: string
      name?: string
    }
    changes?: { field: string; oldValue?: unknown; newValue?: unknown }[]
    metadata?: Record<string, unknown>
    ipAddress?: string
    userAgent?: string
  }): Promise<IActivityLog>

  getUserActivity(
    userId: Types.ObjectId,
    options?: {
      projectId?: Types.ObjectId
      type?: ActivityType
      entity?: ActivityEntity
      limit?: number
      offset?: number
    }
  ): Promise<IActivityLog[]>

  getProjectActivity(
    projectId: Types.ObjectId,
    limit?: number
  ): Promise<IActivityLog[]>

  getActivityStats(
    userId: Types.ObjectId,
    days?: number
  ): Promise<{
    total: number
    byType: Record<string, number>
    byEntity: Record<string, number>
    dailyActivity: { date: string; count: number }[]
  }>
}

const ActivityLogSchema = new Schema<IActivityLog>(
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
    type: {
      type: String,
      enum: [
        'project_created',
        'project_updated',
        'project_deleted',
        'discussion_started',
        'discussion_completed',
        'decision_proposed',
        'decision_approved',
        'decision_rejected',
        'action_created',
        'action_completed',
        'standup_held',
        'expert_consulted',
        'payment_made',
        'settings_updated',
        'user_login',
        'user_logout',
      ],
      required: true,
      index: true,
    },
    entity: {
      type: String,
      enum: ['project', 'discussion', 'decision', 'action_item', 'standup', 'expert', 'payment', 'user'],
      required: true,
    },
    entityId: {
      type: Schema.Types.ObjectId,
    },
    title: {
      type: String,
      required: true,
    },
    description: String,
    actor: {
      type: {
        type: String,
        enum: ['user', 'ai_executive', 'system'],
      },
      id: String,
      name: String,
    },
    changes: [
      {
        field: String,
        oldValue: Schema.Types.Mixed,
        newValue: Schema.Types.Mixed,
      },
    ],
    metadata: Schema.Types.Mixed,
    ipAddress: String,
    userAgent: String,
  },
  {
    timestamps: true,
    collection: 'activity_logs',
  }
)

// 索引
ActivityLogSchema.index({ userId: 1, createdAt: -1 })
ActivityLogSchema.index({ projectId: 1, createdAt: -1 })
ActivityLogSchema.index({ userId: 1, type: 1, createdAt: -1 })
ActivityLogSchema.index({ createdAt: -1 })

// 记录活动
ActivityLogSchema.statics.log = async function (data: {
  userId: Types.ObjectId
  projectId?: Types.ObjectId
  type: ActivityType
  entity: ActivityEntity
  entityId?: Types.ObjectId
  title: string
  description?: string
  actor?: {
    type: 'user' | 'ai_executive' | 'system'
    id?: string
    name?: string
  }
  changes?: { field: string; oldValue?: unknown; newValue?: unknown }[]
  metadata?: Record<string, unknown>
  ipAddress?: string
  userAgent?: string
}): Promise<IActivityLog> {
  return this.create(data)
}

// 获取用户活动
ActivityLogSchema.statics.getUserActivity = async function (
  userId: Types.ObjectId,
  options: {
    projectId?: Types.ObjectId
    type?: ActivityType
    entity?: ActivityEntity
    limit?: number
    offset?: number
  } = {}
): Promise<IActivityLog[]> {
  const { projectId, type, entity, limit = 50, offset = 0 } = options

  const query: Record<string, unknown> = { userId }
  if (projectId) query.projectId = projectId
  if (type) query.type = type
  if (entity) query.entity = entity

  return this.find(query)
    .sort({ createdAt: -1 })
    .skip(offset)
    .limit(limit)
    .populate('projectId', 'name')
    .lean()
}

// 获取项目活动
ActivityLogSchema.statics.getProjectActivity = async function (
  projectId: Types.ObjectId,
  limit: number = 50
): Promise<IActivityLog[]> {
  return this.find({ projectId })
    .sort({ createdAt: -1 })
    .limit(limit)
    .lean()
}

// 获取活动统计
ActivityLogSchema.statics.getActivityStats = async function (
  userId: Types.ObjectId,
  days: number = 30
): Promise<{
  total: number
  byType: Record<string, number>
  byEntity: Record<string, number>
  dailyActivity: { date: string; count: number }[]
}> {
  const startDate = new Date()
  startDate.setDate(startDate.getDate() - days)
  startDate.setHours(0, 0, 0, 0)

  const matchStage = {
    userId,
    createdAt: { $gte: startDate },
  }

  const [total, byType, byEntity, dailyActivity] = await Promise.all([
    this.countDocuments(matchStage),
    this.aggregate([
      { $match: matchStage },
      { $group: { _id: '$type', count: { $sum: 1 } } },
    ]),
    this.aggregate([
      { $match: matchStage },
      { $group: { _id: '$entity', count: { $sum: 1 } } },
    ]),
    this.aggregate([
      { $match: matchStage },
      {
        $group: {
          _id: { $dateToString: { format: '%Y-%m-%d', date: '$createdAt' } },
          count: { $sum: 1 },
        },
      },
      { $sort: { _id: 1 } },
    ]),
  ])

  const byTypeMap: Record<string, number> = {}
  for (const item of byType) {
    byTypeMap[item._id] = item.count
  }

  const byEntityMap: Record<string, number> = {}
  for (const item of byEntity) {
    byEntityMap[item._id] = item.count
  }

  return {
    total,
    byType: byTypeMap,
    byEntity: byEntityMap,
    dailyActivity: dailyActivity.map((d) => ({
      date: d._id,
      count: d.count,
    })),
  }
}

export const ActivityLog =
  (mongoose.models.ActivityLog as IActivityLogModel) ||
  mongoose.model<IActivityLog, IActivityLogModel>('ActivityLog', ActivityLogSchema)
