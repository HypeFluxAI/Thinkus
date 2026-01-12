import mongoose, { Document, Schema, Model } from 'mongoose'
import { type AgentId } from '@/lib/config/executives'

// 记忆类型
export type MemoryType =
  | 'user_preference'
  | 'project_context'
  | 'discussion_insight'
  | 'decision'
  | 'feedback'

// 记忆层级
export type MemoryLayer = 'user' | 'project' | 'agent'

// Memory接口
export interface IMemory extends Document {
  _id: mongoose.Types.ObjectId
  userId: mongoose.Types.ObjectId

  // 关联
  projectId?: mongoose.Types.ObjectId
  agentId?: AgentId
  discussionId?: mongoose.Types.ObjectId

  // 内容
  type: MemoryType
  layer: MemoryLayer
  content: string
  summary?: string

  // 向量索引
  vectorId: string  // Pinecone中的ID
  namespace: string // Pinecone命名空间

  // 重要性和有效性
  importance: number  // 1-10
  accessCount: number
  lastAccessedAt?: Date
  expiresAt?: Date

  // 来源
  source: {
    type: 'discussion' | 'feedback' | 'manual' | 'system'
    id?: string
  }

  createdAt: Date
  updatedAt: Date
}

// Memory Schema
const memorySchema = new Schema<IMemory>(
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
    agentId: {
      type: String,
      enum: [
        'mike', 'elena', 'rachel', 'chloe',
        'david', 'james', 'kevin', 'alex',
        'lisa', 'marcus', 'nina', 'sarah',
        'frank', 'tom', 'iris',
        'nathan', 'oscar', 'victor',
      ],
      index: true,
    },
    discussionId: {
      type: Schema.Types.ObjectId,
      ref: 'Discussion',
    },
    type: {
      type: String,
      enum: ['user_preference', 'project_context', 'discussion_insight', 'decision', 'feedback'],
      required: true,
      index: true,
    },
    layer: {
      type: String,
      enum: ['user', 'project', 'agent'],
      required: true,
      index: true,
    },
    content: {
      type: String,
      required: true,
    },
    summary: String,
    vectorId: {
      type: String,
      required: true,
      unique: true,
    },
    namespace: {
      type: String,
      required: true,
    },
    importance: {
      type: Number,
      min: 1,
      max: 10,
      default: 5,
    },
    accessCount: {
      type: Number,
      default: 0,
    },
    lastAccessedAt: Date,
    expiresAt: Date,
    source: {
      type: {
        type: String,
        enum: ['discussion', 'feedback', 'manual', 'system'],
        required: true,
      },
      id: String,
    },
  },
  {
    timestamps: true,
    collection: 'memories',
  }
)

// 索引
memorySchema.index({ userId: 1, type: 1 })
memorySchema.index({ userId: 1, layer: 1 })
memorySchema.index({ userId: 1, agentId: 1, type: 1 })
memorySchema.index({ userId: 1, projectId: 1, type: 1 })
memorySchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 })

// 静态方法: 创建记忆
memorySchema.statics.createMemory = async function (data: {
  userId: mongoose.Types.ObjectId
  projectId?: mongoose.Types.ObjectId
  agentId?: AgentId
  discussionId?: mongoose.Types.ObjectId
  type: MemoryType
  layer: MemoryLayer
  content: string
  summary?: string
  vectorId: string
  namespace: string
  importance?: number
  source: { type: 'discussion' | 'feedback' | 'manual' | 'system'; id?: string }
  expiresAt?: Date
}): Promise<IMemory> {
  return this.create({
    ...data,
    importance: data.importance || 5,
    accessCount: 0,
  })
}

// 静态方法: 获取用户记忆
memorySchema.statics.getUserMemories = async function (
  userId: mongoose.Types.ObjectId,
  options: {
    type?: MemoryType
    layer?: MemoryLayer
    agentId?: AgentId
    projectId?: mongoose.Types.ObjectId
    limit?: number
  } = {}
): Promise<IMemory[]> {
  const { type, layer, agentId, projectId, limit = 50 } = options

  const query: Record<string, unknown> = { userId }
  if (type) query.type = type
  if (layer) query.layer = layer
  if (agentId) query.agentId = agentId
  if (projectId) query.projectId = projectId

  return this.find(query)
    .sort({ importance: -1, createdAt: -1 })
    .limit(limit)
}

// 静态方法: 增加访问计数
memorySchema.statics.incrementAccessCount = async function (
  vectorId: string
): Promise<void> {
  await this.findOneAndUpdate(
    { vectorId },
    {
      $inc: { accessCount: 1 },
      $set: { lastAccessedAt: new Date() },
    }
  )
}

// 静态方法: 按vectorId删除
memorySchema.statics.deleteByVectorId = async function (
  vectorId: string
): Promise<void> {
  await this.deleteOne({ vectorId })
}

// 静态方法: 获取记忆统计
memorySchema.statics.getMemoryStats = async function (
  userId: mongoose.Types.ObjectId
): Promise<{
  total: number
  byType: Record<MemoryType, number>
  byLayer: Record<MemoryLayer, number>
}> {
  const [total, byType, byLayer] = await Promise.all([
    this.countDocuments({ userId }),
    this.aggregate([
      { $match: { userId } },
      { $group: { _id: '$type', count: { $sum: 1 } } },
    ]),
    this.aggregate([
      { $match: { userId } },
      { $group: { _id: '$layer', count: { $sum: 1 } } },
    ]),
  ])

  const typeStats: Record<MemoryType, number> = {
    user_preference: 0,
    project_context: 0,
    discussion_insight: 0,
    decision: 0,
    feedback: 0,
  }

  const layerStats: Record<MemoryLayer, number> = {
    user: 0,
    project: 0,
    agent: 0,
  }

  byType.forEach((item: { _id: MemoryType; count: number }) => {
    typeStats[item._id] = item.count
  })

  byLayer.forEach((item: { _id: MemoryLayer; count: number }) => {
    layerStats[item._id] = item.count
  })

  return { total, byType: typeStats, byLayer: layerStats }
}

// 模型接口扩展
export interface IMemoryModel extends Model<IMemory> {
  createMemory(data: {
    userId: mongoose.Types.ObjectId
    projectId?: mongoose.Types.ObjectId
    agentId?: AgentId
    discussionId?: mongoose.Types.ObjectId
    type: MemoryType
    layer: MemoryLayer
    content: string
    summary?: string
    vectorId: string
    namespace: string
    importance?: number
    source: { type: 'discussion' | 'feedback' | 'manual' | 'system'; id?: string }
    expiresAt?: Date
  }): Promise<IMemory>
  getUserMemories(
    userId: mongoose.Types.ObjectId,
    options?: {
      type?: MemoryType
      layer?: MemoryLayer
      agentId?: AgentId
      projectId?: mongoose.Types.ObjectId
      limit?: number
    }
  ): Promise<IMemory[]>
  incrementAccessCount(vectorId: string): Promise<void>
  deleteByVectorId(vectorId: string): Promise<void>
  getMemoryStats(userId: mongoose.Types.ObjectId): Promise<{
    total: number
    byType: Record<MemoryType, number>
    byLayer: Record<MemoryLayer, number>
  }>
}

// 导出模型
export const Memory =
  (mongoose.models.Memory as IMemoryModel) ||
  mongoose.model<IMemory, IMemoryModel>('Memory', memorySchema)
