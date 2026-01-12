import mongoose, { Document, Schema, Model } from 'mongoose'

// Webhook 事件来源
export type WebhookSource = 'stripe'

// Webhook 事件状态
export type WebhookEventStatus = 'pending' | 'processed' | 'failed' | 'skipped'

// WebhookEvent 接口
export interface IWebhookEvent extends Document {
  _id: mongoose.Types.ObjectId
  source: WebhookSource
  eventId: string // Stripe event ID (evt_xxx)
  eventType: string // e.g., checkout.session.completed
  status: WebhookEventStatus
  processedAt?: Date
  error?: string
  retryCount: number
  payload?: Record<string, unknown>
  createdAt: Date
  updatedAt: Date
}

// WebhookEvent 模型方法
export interface IWebhookEventModel extends Model<IWebhookEvent> {
  isProcessed(source: WebhookSource, eventId: string): Promise<boolean>
  markAsProcessed(source: WebhookSource, eventId: string): Promise<IWebhookEvent>
  markAsFailed(source: WebhookSource, eventId: string, error: string): Promise<IWebhookEvent>
  createEvent(data: {
    source: WebhookSource
    eventId: string
    eventType: string
    payload?: Record<string, unknown>
  }): Promise<IWebhookEvent>
  cleanupOldEvents(daysOld?: number): Promise<number>
}

// WebhookEvent Schema
const webhookEventSchema = new Schema<IWebhookEvent>(
  {
    source: {
      type: String,
      enum: ['stripe'],
      required: true,
    },
    eventId: {
      type: String,
      required: true,
    },
    eventType: {
      type: String,
      required: true,
    },
    status: {
      type: String,
      enum: ['pending', 'processed', 'failed', 'skipped'],
      default: 'pending',
    },
    processedAt: {
      type: Date,
    },
    error: {
      type: String,
    },
    retryCount: {
      type: Number,
      default: 0,
    },
    payload: {
      type: Schema.Types.Mixed,
    },
  },
  {
    timestamps: true,
    collection: 'webhook_events',
  }
)

// 复合唯一索引：每个来源的每个事件ID只能有一条记录
webhookEventSchema.index({ source: 1, eventId: 1 }, { unique: true })
webhookEventSchema.index({ status: 1 })
webhookEventSchema.index({ createdAt: -1 })

// 静态方法：检查事件是否已处理
webhookEventSchema.statics.isProcessed = async function (
  source: WebhookSource,
  eventId: string
): Promise<boolean> {
  const event = await this.findOne({ source, eventId })
  return event?.status === 'processed'
}

// 静态方法：创建事件记录
webhookEventSchema.statics.createEvent = async function (data: {
  source: WebhookSource
  eventId: string
  eventType: string
  payload?: Record<string, unknown>
}): Promise<IWebhookEvent> {
  try {
    return await this.create({
      source: data.source,
      eventId: data.eventId,
      eventType: data.eventType,
      status: 'pending',
      payload: data.payload,
      retryCount: 0,
    })
  } catch (error) {
    // 如果是重复键错误，返回已存在的记录
    if ((error as { code?: number }).code === 11000) {
      const existing = await this.findOne({
        source: data.source,
        eventId: data.eventId,
      })
      if (existing) return existing
    }
    throw error
  }
}

// 静态方法：标记为已处理
webhookEventSchema.statics.markAsProcessed = async function (
  source: WebhookSource,
  eventId: string
): Promise<IWebhookEvent> {
  const event = await this.findOneAndUpdate(
    { source, eventId },
    {
      $set: {
        status: 'processed',
        processedAt: new Date(),
      },
    },
    { new: true }
  )
  if (!event) {
    throw new Error(`Webhook event not found: ${source}/${eventId}`)
  }
  return event
}

// 静态方法：标记为失败
webhookEventSchema.statics.markAsFailed = async function (
  source: WebhookSource,
  eventId: string,
  error: string
): Promise<IWebhookEvent> {
  const event = await this.findOneAndUpdate(
    { source, eventId },
    {
      $set: {
        status: 'failed',
        error,
      },
      $inc: { retryCount: 1 },
    },
    { new: true }
  )
  if (!event) {
    throw new Error(`Webhook event not found: ${source}/${eventId}`)
  }
  return event
}

// 静态方法：清理旧事件
webhookEventSchema.statics.cleanupOldEvents = async function (
  daysOld: number = 30
): Promise<number> {
  const cutoffDate = new Date()
  cutoffDate.setDate(cutoffDate.getDate() - daysOld)

  const result = await this.deleteMany({
    createdAt: { $lt: cutoffDate },
    status: { $in: ['processed', 'skipped'] },
  })
  return result.deletedCount
}

// 导出模型
export const WebhookEvent =
  (mongoose.models.WebhookEvent as IWebhookEventModel) ||
  mongoose.model<IWebhookEvent, IWebhookEventModel>('WebhookEvent', webhookEventSchema)
