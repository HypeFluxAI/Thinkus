import mongoose, { Document, Schema, Model } from 'mongoose'

// 通知类型
export type NotificationType =
  | 'decision_pending'      // 待确认决策
  | 'decision_executed'     // 决策已执行
  | 'discussion_concluded'  // 讨论结束
  | 'deliverable_ready'     // 交付物就绪
  | 'phase_changed'         // 阶段变更
  | 'daily_summary'         // 每日摘要
  | 'invitation_received'   // 收到邀请
  | 'system_alert'          // 系统提醒
  | 'payment_succeeded'     // 支付成功
  | 'payment_failed'        // 支付失败
  | 'subscription_created'  // 订阅创建
  | 'subscription_updated'  // 订阅更新
  | 'subscription_canceled' // 订阅取消
  | 'refund_processed'      // 退款处理完成
  | 'trial_ending'          // 试用期即将结束

// 通知优先级
export type NotificationPriority = 'low' | 'normal' | 'high' | 'urgent'

// 通知渠道
export type NotificationChannel = 'app' | 'email' | 'sms'

// 关联类型
export type RelatedToType = 'project' | 'discussion' | 'decision' | 'deliverable' | 'subscription' | 'payment'

// 通知动作接口
export interface NotificationAction {
  label: string
  url: string
  primary?: boolean
}

// 通知关联接口
export interface NotificationRelatedTo {
  type: RelatedToType
  id: mongoose.Types.ObjectId
}

// Notification 接口
export interface INotification extends Document {
  _id: mongoose.Types.ObjectId
  userId: mongoose.Types.ObjectId

  type: NotificationType
  title: string
  body: string

  relatedTo?: NotificationRelatedTo
  actions?: NotificationAction[]

  channels: NotificationChannel[]

  read: boolean
  readAt?: Date

  priority: NotificationPriority

  createdAt: Date
}

// 关联Schema
const relatedToSchema = new Schema(
  {
    type: {
      type: String,
      enum: ['project', 'discussion', 'decision', 'deliverable', 'subscription', 'payment'],
      required: true,
    },
    id: {
      type: Schema.Types.ObjectId,
      required: true,
    },
  },
  { _id: false }
)

// 动作Schema
const actionSchema = new Schema(
  {
    label: { type: String, required: true },
    url: { type: String, required: true },
    primary: { type: Boolean, default: false },
  },
  { _id: false }
)

// Notification Schema
const notificationSchema = new Schema<INotification>(
  {
    userId: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    type: {
      type: String,
      enum: [
        'decision_pending',
        'decision_executed',
        'discussion_concluded',
        'deliverable_ready',
        'phase_changed',
        'daily_summary',
        'invitation_received',
        'system_alert',
        'payment_succeeded',
        'payment_failed',
        'subscription_created',
        'subscription_updated',
        'subscription_canceled',
        'refund_processed',
        'trial_ending',
      ],
      required: true,
    },
    title: {
      type: String,
      required: true,
      maxlength: 200,
    },
    body: {
      type: String,
      required: true,
      maxlength: 1000,
    },
    relatedTo: {
      type: relatedToSchema,
    },
    actions: {
      type: [actionSchema],
      default: [],
    },
    channels: {
      type: [String],
      enum: ['app', 'email', 'sms'],
      default: ['app'],
    },
    read: {
      type: Boolean,
      default: false,
    },
    readAt: {
      type: Date,
    },
    priority: {
      type: String,
      enum: ['low', 'normal', 'high', 'urgent'],
      default: 'normal',
    },
  },
  {
    timestamps: true,
    collection: 'notifications',
  }
)

// 索引
notificationSchema.index({ userId: 1, read: 1, createdAt: -1 })
notificationSchema.index({ userId: 1, type: 1 })
notificationSchema.index({ createdAt: -1 })

// 静态方法: 创建通知
notificationSchema.statics.createNotification = async function (data: {
  userId: mongoose.Types.ObjectId
  type: NotificationType
  title: string
  body: string
  relatedTo?: NotificationRelatedTo
  actions?: NotificationAction[]
  channels?: NotificationChannel[]
  priority?: NotificationPriority
}): Promise<INotification> {
  return this.create({
    userId: data.userId,
    type: data.type,
    title: data.title,
    body: data.body,
    relatedTo: data.relatedTo,
    actions: data.actions || [],
    channels: data.channels || ['app'],
    priority: data.priority || 'normal',
    read: false,
  })
}

// 静态方法: 获取用户通知列表
notificationSchema.statics.getUserNotifications = async function (
  userId: mongoose.Types.ObjectId,
  options: {
    unreadOnly?: boolean
    limit?: number
    skip?: number
    type?: NotificationType
  } = {}
): Promise<{ notifications: INotification[]; total: number; unreadCount: number }> {
  const { unreadOnly = false, limit = 20, skip = 0, type } = options

  const query: Record<string, unknown> = { userId }
  if (unreadOnly) query.read = false
  if (type) query.type = type

  const [notifications, total, unreadCount] = await Promise.all([
    this.find(query).sort({ createdAt: -1 }).skip(skip).limit(limit),
    this.countDocuments(query),
    this.countDocuments({ userId, read: false }),
  ])

  return { notifications, total, unreadCount }
}

// 静态方法: 标记为已读
notificationSchema.statics.markAsRead = async function (
  notificationId: mongoose.Types.ObjectId,
  userId: mongoose.Types.ObjectId
): Promise<INotification | null> {
  return this.findOneAndUpdate(
    { _id: notificationId, userId },
    { $set: { read: true, readAt: new Date() } },
    { new: true }
  )
}

// 静态方法: 标记所有为已读
notificationSchema.statics.markAllAsRead = async function (
  userId: mongoose.Types.ObjectId
): Promise<number> {
  const result = await this.updateMany(
    { userId, read: false },
    { $set: { read: true, readAt: new Date() } }
  )
  return result.modifiedCount
}

// 静态方法: 获取未读数量
notificationSchema.statics.getUnreadCount = async function (
  userId: mongoose.Types.ObjectId
): Promise<number> {
  return this.countDocuments({ userId, read: false })
}

// 静态方法: 删除旧通知
notificationSchema.statics.deleteOldNotifications = async function (
  daysOld: number = 30
): Promise<number> {
  const cutoffDate = new Date()
  cutoffDate.setDate(cutoffDate.getDate() - daysOld)

  const result = await this.deleteMany({
    createdAt: { $lt: cutoffDate },
    read: true, // 只删除已读的
  })
  return result.deletedCount
}

// 模型接口扩展
export interface INotificationModel extends Model<INotification> {
  createNotification(data: {
    userId: mongoose.Types.ObjectId
    type: NotificationType
    title: string
    body: string
    relatedTo?: NotificationRelatedTo
    actions?: NotificationAction[]
    channels?: NotificationChannel[]
    priority?: NotificationPriority
  }): Promise<INotification>
  getUserNotifications(
    userId: mongoose.Types.ObjectId,
    options?: {
      unreadOnly?: boolean
      limit?: number
      skip?: number
      type?: NotificationType
    }
  ): Promise<{ notifications: INotification[]; total: number; unreadCount: number }>
  markAsRead(
    notificationId: mongoose.Types.ObjectId,
    userId: mongoose.Types.ObjectId
  ): Promise<INotification | null>
  markAllAsRead(userId: mongoose.Types.ObjectId): Promise<number>
  getUnreadCount(userId: mongoose.Types.ObjectId): Promise<number>
  deleteOldNotifications(daysOld?: number): Promise<number>
}

// 导出模型
export const Notification =
  (mongoose.models.Notification as INotificationModel) ||
  mongoose.model<INotification, INotificationModel>('Notification', notificationSchema)
