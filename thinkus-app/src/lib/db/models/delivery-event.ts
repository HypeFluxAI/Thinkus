import mongoose, { Schema, Document, Model, Types } from 'mongoose'
import type { DeliveryStage } from './delivery-session'

// 事件类型
export type DeliveryEventType =
  | 'stage_started'      // 阶段开始
  | 'stage_completed'    // 阶段完成
  | 'stage_failed'       // 阶段失败
  | 'stage_skipped'      // 阶段跳过
  | 'progress_update'    // 进度更新
  | 'log_output'         // 日志输出
  | 'build_log'          // 构建日志
  | 'test_result'        // 测试结果
  | 'deploy_status'      // 部署状态
  | 'error_occurred'     // 错误发生
  | 'auto_fix_started'   // 自动修复开始
  | 'auto_fix_completed' // 自动修复完成
  | 'auto_fix_failed'    // 自动修复失败
  | 'user_action'        // 用户操作
  | 'notification_sent'  // 通知发送
  | 'acceptance_update'  // 验收更新
  | 'rollback_triggered' // 回滚触发
  | 'system_message'     // 系统消息

// 事件级别
export type EventLevel = 'debug' | 'info' | 'warning' | 'error' | 'success'

export interface IDeliveryEvent extends Document {
  _id: Types.ObjectId
  sessionId: Types.ObjectId
  projectId: Types.ObjectId
  userId: Types.ObjectId

  // 事件信息
  type: DeliveryEventType
  level: EventLevel
  stage?: DeliveryStage
  message: string
  messageZh?: string  // 中文人话消息

  // 详细数据
  data?: {
    progress?: number
    duration?: number
    error?: {
      code?: string
      message: string
      stack?: string
    }
    testResults?: {
      total: number
      passed: number
      failed: number
      skipped: number
    }
    deployInfo?: {
      url?: string
      deploymentId?: string
      status?: string
    }
    buildInfo?: {
      command?: string
      exitCode?: number
      output?: string
    }
    [key: string]: unknown
  }

  // 元数据
  source?: string  // 事件来源（system/user/webhook）
  correlationId?: string  // 关联ID，用于追踪相关事件

  createdAt: Date
}

const DeliveryEventSchema = new Schema<IDeliveryEvent>(
  {
    sessionId: {
      type: Schema.Types.ObjectId,
      ref: 'DeliverySession',
      required: true,
      index: true,
    },
    projectId: {
      type: Schema.Types.ObjectId,
      ref: 'Project',
      required: true,
      index: true,
    },
    userId: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },

    // 事件信息
    type: {
      type: String,
      enum: [
        'stage_started', 'stage_completed', 'stage_failed', 'stage_skipped',
        'progress_update', 'log_output', 'build_log', 'test_result',
        'deploy_status', 'error_occurred', 'auto_fix_started',
        'auto_fix_completed', 'auto_fix_failed', 'user_action',
        'notification_sent', 'acceptance_update', 'rollback_triggered',
        'system_message',
      ],
      required: true,
    },
    level: {
      type: String,
      enum: ['debug', 'info', 'warning', 'error', 'success'],
      default: 'info',
    },
    stage: {
      type: String,
      enum: ['queued', 'preparing', 'building', 'testing', 'deploying', 'verifying', 'configuring', 'notifying', 'acceptance', 'completed', 'failed', 'cancelled', 'paused'],
    },
    message: {
      type: String,
      required: true,
    },
    messageZh: String,

    // 详细数据
    data: Schema.Types.Mixed,

    // 元数据
    source: {
      type: String,
      default: 'system',
    },
    correlationId: String,
  },
  {
    timestamps: { createdAt: true, updatedAt: false },
  }
)

// 索引
DeliveryEventSchema.index({ sessionId: 1, createdAt: -1 })
DeliveryEventSchema.index({ projectId: 1, createdAt: -1 })
DeliveryEventSchema.index({ type: 1, createdAt: -1 })
DeliveryEventSchema.index({ level: 1 })
DeliveryEventSchema.index({ createdAt: -1 })
// TTL索引：30天后自动删除
DeliveryEventSchema.index({ createdAt: 1 }, { expireAfterSeconds: 30 * 24 * 60 * 60 })

// 静态方法：获取会话的所有事件
DeliveryEventSchema.statics.getBySession = async function (
  sessionId: Types.ObjectId,
  options?: { limit?: number; types?: DeliveryEventType[]; level?: EventLevel }
): Promise<IDeliveryEvent[]> {
  const query: Record<string, unknown> = { sessionId }
  if (options?.types) query.type = { $in: options.types }
  if (options?.level) query.level = options.level

  return this.find(query)
    .sort({ createdAt: -1 })
    .limit(options?.limit || 100)
}

// 静态方法：获取最近的错误事件
DeliveryEventSchema.statics.getRecentErrors = async function (
  sessionId: Types.ObjectId,
  limit = 10
): Promise<IDeliveryEvent[]> {
  return this.find({
    sessionId,
    level: 'error',
  })
    .sort({ createdAt: -1 })
    .limit(limit)
}

// 静态方法：创建进度更新事件
DeliveryEventSchema.statics.createProgressEvent = async function (
  sessionId: Types.ObjectId,
  projectId: Types.ObjectId,
  userId: Types.ObjectId,
  stage: DeliveryStage,
  progress: number,
  message: string,
  messageZh?: string
): Promise<IDeliveryEvent> {
  return this.create({
    sessionId,
    projectId,
    userId,
    type: 'progress_update',
    level: 'info',
    stage,
    message,
    messageZh,
    data: { progress },
  })
}

// 静态方法：创建错误事件
DeliveryEventSchema.statics.createErrorEvent = async function (
  sessionId: Types.ObjectId,
  projectId: Types.ObjectId,
  userId: Types.ObjectId,
  stage: DeliveryStage,
  error: { code?: string; message: string; stack?: string },
  messageZh?: string
): Promise<IDeliveryEvent> {
  return this.create({
    sessionId,
    projectId,
    userId,
    type: 'error_occurred',
    level: 'error',
    stage,
    message: error.message,
    messageZh,
    data: { error },
  })
}

export interface IDeliveryEventModel extends Model<IDeliveryEvent> {
  getBySession(
    sessionId: Types.ObjectId,
    options?: { limit?: number; types?: DeliveryEventType[]; level?: EventLevel }
  ): Promise<IDeliveryEvent[]>
  getRecentErrors(sessionId: Types.ObjectId, limit?: number): Promise<IDeliveryEvent[]>
  createProgressEvent(
    sessionId: Types.ObjectId,
    projectId: Types.ObjectId,
    userId: Types.ObjectId,
    stage: DeliveryStage,
    progress: number,
    message: string,
    messageZh?: string
  ): Promise<IDeliveryEvent>
  createErrorEvent(
    sessionId: Types.ObjectId,
    projectId: Types.ObjectId,
    userId: Types.ObjectId,
    stage: DeliveryStage,
    error: { code?: string; message: string; stack?: string },
    messageZh?: string
  ): Promise<IDeliveryEvent>
}

const DeliveryEvent: IDeliveryEventModel =
  (mongoose.models.DeliveryEvent as IDeliveryEventModel) ||
  mongoose.model<IDeliveryEvent, IDeliveryEventModel>('DeliveryEvent', DeliveryEventSchema)

export { DeliveryEvent }
export default DeliveryEvent
