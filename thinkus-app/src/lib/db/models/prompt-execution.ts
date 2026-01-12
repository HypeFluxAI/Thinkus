import mongoose, { Document, Schema, Model } from 'mongoose'

// 执行指标接口
export interface ExecutionMetrics {
  inputTokens: number
  outputTokens: number
  latencyMs: number
  formatValid?: boolean
  taskCompleted?: boolean
  userRating?: number
}

// PromptExecution 接口
export interface IPromptExecution extends Document {
  _id: mongoose.Types.ObjectId
  userId?: mongoose.Types.ObjectId
  projectId?: mongoose.Types.ObjectId

  // 提示词信息
  promptId: string
  promptVersion: string

  // 输入输出
  input: Record<string, unknown>
  output: string

  // 指标
  metrics: ExecutionMetrics

  // 模型信息
  modelId: string
  temperature: number
  maxTokens: number

  // 错误信息
  error?: string

  createdAt: Date
}

// 聚合指标接口
export interface PromptMetrics {
  promptId: string
  totalExecutions: number
  avgInputTokens: number
  avgOutputTokens: number
  avgLatencyMs: number
  successRate: number
  avgUserRating?: number
  versions: string[]
}

// PromptExecution 模型方法
export interface IPromptExecutionModel extends Model<IPromptExecution> {
  getMetrics(promptId: string, days?: number): Promise<PromptMetrics>
  getVersionComparison(promptId: string, versionA: string, versionB: string): Promise<{
    versionA: PromptMetrics
    versionB: PromptMetrics
  }>
  cleanupOldExecutions(daysOld?: number): Promise<number>
}

// 执行指标 Schema
const metricsSchema = new Schema(
  {
    inputTokens: { type: Number, required: true },
    outputTokens: { type: Number, required: true },
    latencyMs: { type: Number, required: true },
    formatValid: { type: Boolean },
    taskCompleted: { type: Boolean },
    userRating: { type: Number, min: 1, max: 5 },
  },
  { _id: false }
)

// PromptExecution Schema
const promptExecutionSchema = new Schema<IPromptExecution>(
  {
    userId: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      index: true,
    },
    projectId: {
      type: Schema.Types.ObjectId,
      ref: 'Project',
      index: true,
    },
    promptId: {
      type: String,
      required: true,
      index: true,
    },
    promptVersion: {
      type: String,
      required: true,
    },
    input: {
      type: Schema.Types.Mixed,
      required: true,
    },
    output: {
      type: String,
      required: true,
    },
    metrics: {
      type: metricsSchema,
      required: true,
    },
    modelId: {
      type: String,
      required: true,
    },
    temperature: {
      type: Number,
      required: true,
    },
    maxTokens: {
      type: Number,
      required: true,
    },
    error: {
      type: String,
    },
  },
  {
    timestamps: true,
    collection: 'prompt_executions',
  }
)

// 索引
promptExecutionSchema.index({ promptId: 1, promptVersion: 1 })
promptExecutionSchema.index({ createdAt: -1 })
promptExecutionSchema.index({ promptId: 1, createdAt: -1 })

// 静态方法：获取提示词指标
promptExecutionSchema.statics.getMetrics = async function (
  promptId: string,
  days: number = 30
): Promise<PromptMetrics> {
  const cutoffDate = new Date()
  cutoffDate.setDate(cutoffDate.getDate() - days)

  const result = await this.aggregate([
    {
      $match: {
        promptId,
        createdAt: { $gte: cutoffDate },
      },
    },
    {
      $group: {
        _id: '$promptId',
        totalExecutions: { $sum: 1 },
        avgInputTokens: { $avg: '$metrics.inputTokens' },
        avgOutputTokens: { $avg: '$metrics.outputTokens' },
        avgLatencyMs: { $avg: '$metrics.latencyMs' },
        successCount: {
          $sum: {
            $cond: [{ $ne: ['$metrics.taskCompleted', false] }, 1, 0],
          },
        },
        ratingSum: {
          $sum: { $ifNull: ['$metrics.userRating', 0] },
        },
        ratingCount: {
          $sum: {
            $cond: [{ $gt: ['$metrics.userRating', 0] }, 1, 0],
          },
        },
        versions: { $addToSet: '$promptVersion' },
      },
    },
  ])

  if (result.length === 0) {
    return {
      promptId,
      totalExecutions: 0,
      avgInputTokens: 0,
      avgOutputTokens: 0,
      avgLatencyMs: 0,
      successRate: 0,
      versions: [],
    }
  }

  const data = result[0]
  return {
    promptId,
    totalExecutions: data.totalExecutions,
    avgInputTokens: Math.round(data.avgInputTokens),
    avgOutputTokens: Math.round(data.avgOutputTokens),
    avgLatencyMs: Math.round(data.avgLatencyMs),
    successRate: (data.successCount / data.totalExecutions) * 100,
    avgUserRating:
      data.ratingCount > 0
        ? Math.round((data.ratingSum / data.ratingCount) * 10) / 10
        : undefined,
    versions: data.versions.sort(),
  }
}

// 静态方法：版本比较
promptExecutionSchema.statics.getVersionComparison = async function (
  promptId: string,
  versionA: string,
  versionB: string
): Promise<{ versionA: PromptMetrics; versionB: PromptMetrics }> {
  const getVersionMetrics = async (version: string): Promise<PromptMetrics> => {
    const result = await this.aggregate([
      {
        $match: {
          promptId,
          promptVersion: version,
        },
      },
      {
        $group: {
          _id: '$promptVersion',
          totalExecutions: { $sum: 1 },
          avgInputTokens: { $avg: '$metrics.inputTokens' },
          avgOutputTokens: { $avg: '$metrics.outputTokens' },
          avgLatencyMs: { $avg: '$metrics.latencyMs' },
          successCount: {
            $sum: {
              $cond: [{ $ne: ['$metrics.taskCompleted', false] }, 1, 0],
            },
          },
        },
      },
    ])

    if (result.length === 0) {
      return {
        promptId,
        totalExecutions: 0,
        avgInputTokens: 0,
        avgOutputTokens: 0,
        avgLatencyMs: 0,
        successRate: 0,
        versions: [version],
      }
    }

    const data = result[0]
    return {
      promptId,
      totalExecutions: data.totalExecutions,
      avgInputTokens: Math.round(data.avgInputTokens),
      avgOutputTokens: Math.round(data.avgOutputTokens),
      avgLatencyMs: Math.round(data.avgLatencyMs),
      successRate: (data.successCount / data.totalExecutions) * 100,
      versions: [version],
    }
  }

  const [metricsA, metricsB] = await Promise.all([
    getVersionMetrics(versionA),
    getVersionMetrics(versionB),
  ])

  return { versionA: metricsA, versionB: metricsB }
}

// 静态方法：清理旧执行记录
promptExecutionSchema.statics.cleanupOldExecutions = async function (
  daysOld: number = 90
): Promise<number> {
  const cutoffDate = new Date()
  cutoffDate.setDate(cutoffDate.getDate() - daysOld)

  const result = await this.deleteMany({
    createdAt: { $lt: cutoffDate },
  })

  return result.deletedCount
}

// 导出模型
export const PromptExecution =
  (mongoose.models.PromptExecution as IPromptExecutionModel) ||
  mongoose.model<IPromptExecution, IPromptExecutionModel>(
    'PromptExecution',
    promptExecutionSchema
  )
