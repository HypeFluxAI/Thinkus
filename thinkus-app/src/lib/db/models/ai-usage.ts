import mongoose, { Schema, Document, Model, Types } from 'mongoose'

// AI 模型类型
export type AIModel =
  | 'claude-opus-4'
  | 'claude-sonnet-4'
  | 'claude-haiku'
  | 'gpt-4'
  | 'gpt-4-turbo'
  | 'gpt-3.5-turbo'
  | 'text-embedding-3-small'
  | 'text-embedding-3-large'
  | 'gemini-3-pro-preview'
  | 'gemini-3-flash-preview'
  | 'gemini-2.5-pro'
  | 'gemini-2.5-flash'
  | 'gemini-2.5-flash-lite'
  | 'gemini-2.0-flash'
  | 'gemini-2.0-flash-lite'

// 使用类型
export type UsageType =
  | 'discussion'
  | 'standup'
  | 'expert_consultation'
  | 'skill_distillation'
  | 'decision_analysis'
  | 'code_generation'
  | 'embedding'
  | 'other'

// AI 使用记录接口
export interface IAIUsage extends Document {
  _id: Types.ObjectId
  userId: Types.ObjectId
  projectId?: Types.ObjectId

  // 使用详情
  aiModel: AIModel
  usageType: UsageType

  // Token 统计
  inputTokens: number
  outputTokens: number
  totalTokens: number

  // 成本估算 (美元)
  estimatedCost: number

  // 请求详情
  requestId?: string
  latencyMs?: number
  success: boolean
  errorMessage?: string

  // 元数据
  metadata?: Record<string, unknown>

  createdAt: Date
}

// 使用统计接口
export interface UsageStats {
  totalRequests: number
  totalTokens: number
  totalInputTokens: number
  totalOutputTokens: number
  totalCost: number
  byModel: Record<string, { requests: number; tokens: number; cost: number }>
  byType: Record<string, { requests: number; tokens: number; cost: number }>
}

// 模型定价 (每 1M tokens)
export const MODEL_PRICING: Record<AIModel, { input: number; output: number }> = {
  'claude-opus-4': { input: 15.0, output: 75.0 },
  'claude-sonnet-4': { input: 3.0, output: 15.0 },
  'claude-haiku': { input: 0.25, output: 1.25 },
  'gpt-4': { input: 30.0, output: 60.0 },
  'gpt-4-turbo': { input: 10.0, output: 30.0 },
  'gpt-3.5-turbo': { input: 0.5, output: 1.5 },
  'text-embedding-3-small': { input: 0.02, output: 0 },
  'text-embedding-3-large': { input: 0.13, output: 0 },
  // Gemini 3.0 models (preview)
  'gemini-3-pro-preview': { input: 1.5, output: 6.0 },
  'gemini-3-flash-preview': { input: 0.10, output: 0.40 },
  // Gemini 2.5 models
  'gemini-2.5-pro': { input: 1.25, output: 5.0 },
  'gemini-2.5-flash': { input: 0.075, output: 0.30 },
  'gemini-2.5-flash-lite': { input: 0.0375, output: 0.15 },
  // Gemini 2.0 models
  'gemini-2.0-flash': { input: 0.075, output: 0.30 },
  'gemini-2.0-flash-lite': { input: 0.0375, output: 0.15 },
}

// 模型接口
export interface IAIUsageModel extends Model<IAIUsage> {
  recordUsage(data: {
    userId: Types.ObjectId
    projectId?: Types.ObjectId
    aiModel: AIModel
    usageType: UsageType
    inputTokens: number
    outputTokens: number
    latencyMs?: number
    success?: boolean
    errorMessage?: string
    metadata?: Record<string, unknown>
  }): Promise<IAIUsage>

  getUserStats(
    userId: Types.ObjectId,
    period?: 'day' | 'week' | 'month' | 'all'
  ): Promise<UsageStats>

  getProjectStats(projectId: Types.ObjectId): Promise<UsageStats>

  getDailyUsage(
    userId: Types.ObjectId,
    days?: number
  ): Promise<Array<{ date: string; tokens: number; cost: number; requests: number }>>
}

const AIUsageSchema = new Schema<IAIUsage>(
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
    aiModel: {
      type: String,
      enum: [
        'claude-opus-4',
        'claude-sonnet-4',
        'claude-haiku',
        'gpt-4',
        'gpt-4-turbo',
        'gpt-3.5-turbo',
        'text-embedding-3-small',
        'text-embedding-3-large',
        'gemini-3-pro-preview',
        'gemini-3-flash-preview',
        'gemini-2.5-pro',
        'gemini-2.5-flash',
        'gemini-2.5-flash-lite',
        'gemini-2.0-flash',
        'gemini-2.0-flash-lite',
      ],
      required: true,
    },
    usageType: {
      type: String,
      enum: [
        'discussion',
        'standup',
        'expert_consultation',
        'skill_distillation',
        'decision_analysis',
        'code_generation',
        'embedding',
        'other',
      ],
      required: true,
    },
    inputTokens: {
      type: Number,
      required: true,
      default: 0,
    },
    outputTokens: {
      type: Number,
      required: true,
      default: 0,
    },
    totalTokens: {
      type: Number,
      required: true,
      default: 0,
    },
    estimatedCost: {
      type: Number,
      required: true,
      default: 0,
    },
    requestId: String,
    latencyMs: Number,
    success: {
      type: Boolean,
      default: true,
    },
    errorMessage: String,
    metadata: Schema.Types.Mixed,
  },
  {
    timestamps: true,
    collection: 'ai_usage',
  }
)

// 索引
AIUsageSchema.index({ userId: 1, createdAt: -1 })
AIUsageSchema.index({ userId: 1, aiModel: 1 })
AIUsageSchema.index({ userId: 1, usageType: 1 })
AIUsageSchema.index({ projectId: 1, createdAt: -1 })
AIUsageSchema.index({ createdAt: -1 })

// 计算成本
function calculateCost(model: AIModel, inputTokens: number, outputTokens: number): number {
  const pricing = MODEL_PRICING[model]
  if (!pricing) return 0

  const inputCost = (inputTokens / 1_000_000) * pricing.input
  const outputCost = (outputTokens / 1_000_000) * pricing.output
  return Math.round((inputCost + outputCost) * 100000) / 100000 // 保留5位小数
}

// 记录使用
AIUsageSchema.statics.recordUsage = async function (data: {
  userId: Types.ObjectId
  projectId?: Types.ObjectId
  aiModel: AIModel
  usageType: UsageType
  inputTokens: number
  outputTokens: number
  latencyMs?: number
  success?: boolean
  errorMessage?: string
  metadata?: Record<string, unknown>
}): Promise<IAIUsage> {
  const totalTokens = data.inputTokens + data.outputTokens
  const estimatedCost = calculateCost(data.aiModel, data.inputTokens, data.outputTokens)

  return this.create({
    ...data,
    totalTokens,
    estimatedCost,
    success: data.success ?? true,
  })
}

// 获取用户统计
AIUsageSchema.statics.getUserStats = async function (
  userId: Types.ObjectId,
  period: 'day' | 'week' | 'month' | 'all' = 'month'
): Promise<UsageStats> {
  let dateFilter: Date | undefined
  const now = new Date()

  switch (period) {
    case 'day':
      dateFilter = new Date(now.getTime() - 24 * 60 * 60 * 1000)
      break
    case 'week':
      dateFilter = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000)
      break
    case 'month':
      dateFilter = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000)
      break
  }

  const matchStage: Record<string, unknown> = { userId }
  if (dateFilter) {
    matchStage.createdAt = { $gte: dateFilter }
  }

  const [totals, byModel, byType] = await Promise.all([
    this.aggregate([
      { $match: matchStage },
      {
        $group: {
          _id: null,
          totalRequests: { $sum: 1 },
          totalTokens: { $sum: '$totalTokens' },
          totalInputTokens: { $sum: '$inputTokens' },
          totalOutputTokens: { $sum: '$outputTokens' },
          totalCost: { $sum: '$estimatedCost' },
        },
      },
    ]),
    this.aggregate([
      { $match: matchStage },
      {
        $group: {
          _id: '$aiModel',
          requests: { $sum: 1 },
          tokens: { $sum: '$totalTokens' },
          cost: { $sum: '$estimatedCost' },
        },
      },
    ]),
    this.aggregate([
      { $match: matchStage },
      {
        $group: {
          _id: '$usageType',
          requests: { $sum: 1 },
          tokens: { $sum: '$totalTokens' },
          cost: { $sum: '$estimatedCost' },
        },
      },
    ]),
  ])

  const byModelMap: Record<string, { requests: number; tokens: number; cost: number }> = {}
  for (const item of byModel) {
    byModelMap[item._id] = {
      requests: item.requests,
      tokens: item.tokens,
      cost: Math.round(item.cost * 100) / 100,
    }
  }

  const byTypeMap: Record<string, { requests: number; tokens: number; cost: number }> = {}
  for (const item of byType) {
    byTypeMap[item._id] = {
      requests: item.requests,
      tokens: item.tokens,
      cost: Math.round(item.cost * 100) / 100,
    }
  }

  const total = totals[0] || {
    totalRequests: 0,
    totalTokens: 0,
    totalInputTokens: 0,
    totalOutputTokens: 0,
    totalCost: 0,
  }

  return {
    totalRequests: total.totalRequests,
    totalTokens: total.totalTokens,
    totalInputTokens: total.totalInputTokens,
    totalOutputTokens: total.totalOutputTokens,
    totalCost: Math.round(total.totalCost * 100) / 100,
    byModel: byModelMap,
    byType: byTypeMap,
  }
}

// 获取项目统计
AIUsageSchema.statics.getProjectStats = async function (
  projectId: Types.ObjectId
): Promise<UsageStats> {
  const [totals, byModel, byType] = await Promise.all([
    this.aggregate([
      { $match: { projectId } },
      {
        $group: {
          _id: null,
          totalRequests: { $sum: 1 },
          totalTokens: { $sum: '$totalTokens' },
          totalInputTokens: { $sum: '$inputTokens' },
          totalOutputTokens: { $sum: '$outputTokens' },
          totalCost: { $sum: '$estimatedCost' },
        },
      },
    ]),
    this.aggregate([
      { $match: { projectId } },
      {
        $group: {
          _id: '$aiModel',
          requests: { $sum: 1 },
          tokens: { $sum: '$totalTokens' },
          cost: { $sum: '$estimatedCost' },
        },
      },
    ]),
    this.aggregate([
      { $match: { projectId } },
      {
        $group: {
          _id: '$usageType',
          requests: { $sum: 1 },
          tokens: { $sum: '$totalTokens' },
          cost: { $sum: '$estimatedCost' },
        },
      },
    ]),
  ])

  const byModelMap: Record<string, { requests: number; tokens: number; cost: number }> = {}
  for (const item of byModel) {
    byModelMap[item._id] = {
      requests: item.requests,
      tokens: item.tokens,
      cost: Math.round(item.cost * 100) / 100,
    }
  }

  const byTypeMap: Record<string, { requests: number; tokens: number; cost: number }> = {}
  for (const item of byType) {
    byTypeMap[item._id] = {
      requests: item.requests,
      tokens: item.tokens,
      cost: Math.round(item.cost * 100) / 100,
    }
  }

  const total = totals[0] || {
    totalRequests: 0,
    totalTokens: 0,
    totalInputTokens: 0,
    totalOutputTokens: 0,
    totalCost: 0,
  }

  return {
    totalRequests: total.totalRequests,
    totalTokens: total.totalTokens,
    totalInputTokens: total.totalInputTokens,
    totalOutputTokens: total.totalOutputTokens,
    totalCost: Math.round(total.totalCost * 100) / 100,
    byModel: byModelMap,
    byType: byTypeMap,
  }
}

// 获取每日使用
AIUsageSchema.statics.getDailyUsage = async function (
  userId: Types.ObjectId,
  days: number = 30
): Promise<Array<{ date: string; tokens: number; cost: number; requests: number }>> {
  const startDate = new Date()
  startDate.setDate(startDate.getDate() - days)
  startDate.setHours(0, 0, 0, 0)

  const results = await this.aggregate([
    {
      $match: {
        userId,
        createdAt: { $gte: startDate },
      },
    },
    {
      $group: {
        _id: {
          $dateToString: { format: '%Y-%m-%d', date: '$createdAt' },
        },
        tokens: { $sum: '$totalTokens' },
        cost: { $sum: '$estimatedCost' },
        requests: { $sum: 1 },
      },
    },
    { $sort: { _id: 1 } },
  ])

  return results.map((r) => ({
    date: r._id,
    tokens: r.tokens,
    cost: Math.round(r.cost * 100) / 100,
    requests: r.requests,
  }))
}

export const AIUsage =
  (mongoose.models.AIUsage as IAIUsageModel) ||
  mongoose.model<IAIUsage, IAIUsageModel>('AIUsage', AIUsageSchema)
