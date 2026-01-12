import mongoose, { Document, Schema, Model } from 'mongoose'
import { type AgentId } from '@/lib/config/executives'

// 记忆类型枚举
export enum MemoryType {
  PROJECT_CONTEXT = 'project_context',
  PROJECT_DECISION = 'project_decision',
  USER_PREFERENCE = 'user_preference',
  USER_FEEDBACK = 'user_feedback',
  DISCUSSION_INSIGHT = 'discussion_insight',
  DISCUSSION_CONCLUSION = 'discussion_conclusion',
  DATA_INSIGHT = 'data_insight',
}

// 沟通风格类型
export type CommunicationStyle = 'formal' | 'casual' | 'concise' | 'detailed'

// 决策风格类型
export type DecisionStyle = 'fast' | 'careful' | 'data-driven'

// 用户专属高管接口
export interface IUserExecutive extends Document {
  _id: mongoose.Types.ObjectId
  userId: mongoose.Types.ObjectId
  agentId: AgentId

  // 实例状态
  status: 'active' | 'suspended'

  // 记忆统计
  memoryStats: {
    totalMemories: number
    lastMemoryAt?: Date
    memoryByType: Map<string, number>
  }

  // 学习到的偏好
  learnedPreferences: {
    communicationStyle?: CommunicationStyle
    focusAreas?: string[]
    dislikes?: string[]
    decisionStyle?: DecisionStyle
    customInstructions?: string
  }

  // 使用统计
  usageStats: {
    totalDiscussions: number
    totalMessages: number
    lastActiveAt?: Date
    averageResponseRating?: number
  }

  createdAt: Date
  updatedAt: Date

  // 实例方法
  updatePreferences(preferences: Partial<IUserExecutive['learnedPreferences']>): Promise<void>
}

// 记忆统计Schema
const memoryStatsSchema = new Schema(
  {
    totalMemories: { type: Number, default: 0 },
    lastMemoryAt: { type: Date },
    memoryByType: {
      type: Map,
      of: Number,
      default: () => new Map(Object.values(MemoryType).map(t => [t, 0])),
    },
  },
  { _id: false }
)

// 学习偏好Schema
const learnedPreferencesSchema = new Schema(
  {
    communicationStyle: {
      type: String,
      enum: ['formal', 'casual', 'concise', 'detailed'],
    },
    focusAreas: [{ type: String }],
    dislikes: [{ type: String }],
    decisionStyle: {
      type: String,
      enum: ['fast', 'careful', 'data-driven'],
    },
    customInstructions: { type: String },
  },
  { _id: false }
)

// 使用统计Schema
const usageStatsSchema = new Schema(
  {
    totalDiscussions: { type: Number, default: 0 },
    totalMessages: { type: Number, default: 0 },
    lastActiveAt: { type: Date },
    averageResponseRating: { type: Number, min: 0, max: 5 },
  },
  { _id: false }
)

// UserExecutive Schema
const userExecutiveSchema = new Schema(
  {
    userId: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    agentId: {
      type: String,
      required: true,
      enum: [
        'mike', 'elena', 'rachel', 'chloe',
        'david', 'james', 'kevin', 'alex',
        'lisa', 'marcus', 'nina', 'sarah',
        'frank', 'tom', 'iris',
        'nathan', 'oscar', 'victor',
      ],
    },
    status: {
      type: String,
      enum: ['active', 'suspended'],
      default: 'active',
    },
    memoryStats: {
      type: memoryStatsSchema,
      default: () => ({
        totalMemories: 0,
        memoryByType: Object.values(MemoryType).reduce(
          (acc, t) => ({ ...acc, [t]: 0 }),
          {}
        ),
      }),
    },
    learnedPreferences: {
      type: learnedPreferencesSchema,
      default: () => ({}),
    },
    usageStats: {
      type: usageStatsSchema,
      default: () => ({
        totalDiscussions: 0,
        totalMessages: 0,
      }),
    },
  },
  {
    timestamps: true,
    collection: 'user_executives',
  }
)

// 复合唯一索引: 每个用户每个高管只能有一个实例
userExecutiveSchema.index({ userId: 1, agentId: 1 }, { unique: true })

// 查询索引
userExecutiveSchema.index({ userId: 1, status: 1 })

// 静态方法: 为新用户创建18个高管实例
userExecutiveSchema.statics.createExecutivesForUser = async function (
  userId: mongoose.Types.ObjectId
): Promise<IUserExecutive[]> {
  const agentIds: AgentId[] = [
    'mike', 'elena', 'rachel', 'chloe',
    'david', 'james', 'kevin', 'alex',
    'lisa', 'marcus', 'nina', 'sarah',
    'frank', 'tom', 'iris',
    'nathan', 'oscar', 'victor',
  ]

  const executives = agentIds.map(agentId => ({
    userId,
    agentId,
    status: 'active',
    memoryStats: {
      totalMemories: 0,
      memoryByType: Object.values(MemoryType).reduce(
        (acc, t) => ({ ...acc, [t]: 0 }),
        {}
      ),
    },
    learnedPreferences: {},
    usageStats: {
      totalDiscussions: 0,
      totalMessages: 0,
    },
  }))

  return this.insertMany(executives)
}

// 静态方法: 获取用户的所有高管实例
userExecutiveSchema.statics.getExecutivesByUser = async function (
  userId: mongoose.Types.ObjectId
): Promise<IUserExecutive[]> {
  return this.find({ userId, status: 'active' }).sort({ agentId: 1 })
}

// 静态方法: 获取用户的特定高管实例
userExecutiveSchema.statics.getExecutive = async function (
  userId: mongoose.Types.ObjectId,
  agentId: AgentId
): Promise<IUserExecutive | null> {
  return this.findOne({ userId, agentId })
}

// 实例方法: 增加讨论计数
userExecutiveSchema.methods.incrementDiscussion = async function (): Promise<void> {
  this.usageStats.totalDiscussions += 1
  this.usageStats.lastActiveAt = new Date()
  await this.save()
}

// 实例方法: 增加消息计数
userExecutiveSchema.methods.incrementMessages = async function (
  count: number = 1
): Promise<void> {
  this.usageStats.totalMessages += count
  this.usageStats.lastActiveAt = new Date()
  await this.save()
}

// 实例方法: 增加记忆计数
userExecutiveSchema.methods.incrementMemory = async function (
  memoryType: MemoryType
): Promise<void> {
  this.memoryStats.totalMemories += 1
  this.memoryStats.lastMemoryAt = new Date()

  // 更新特定类型的记忆计数
  const currentCount = this.memoryStats.memoryByType.get(memoryType) || 0
  this.memoryStats.memoryByType.set(memoryType, currentCount + 1)

  await this.save()
}

// 实例方法: 更新学习偏好
userExecutiveSchema.methods.updatePreferences = async function (
  preferences: Partial<IUserExecutive['learnedPreferences']>
): Promise<void> {
  Object.assign(this.learnedPreferences, preferences)
  await this.save()
}

// 模型接口扩展
export interface IUserExecutiveModel extends Model<IUserExecutive> {
  createExecutivesForUser(userId: mongoose.Types.ObjectId): Promise<IUserExecutive[]>
  getExecutivesByUser(userId: mongoose.Types.ObjectId): Promise<IUserExecutive[]>
  getExecutive(userId: mongoose.Types.ObjectId, agentId: AgentId): Promise<IUserExecutive | null>
}

// 导出模型
export const UserExecutive =
  (mongoose.models.UserExecutive as IUserExecutiveModel) ||
  mongoose.model<IUserExecutive, IUserExecutiveModel>('UserExecutive', userExecutiveSchema)
