import mongoose, { Document, Schema, Model } from 'mongoose'

/**
 * 事件类型
 */
export type AnalyticsEventType =
  | 'page_view'       // 页面访问
  | 'click'           // 点击事件
  | 'signup'          // 注册
  | 'login'           // 登录
  | 'purchase'        // 购买
  | 'conversion'      // 转化
  | 'bounce'          // 跳出
  | 'session_start'   // 会话开始
  | 'session_end'     // 会话结束
  | 'custom'          // 自定义事件

/**
 * 分析事件接口
 */
export interface IAnalyticsEvent extends Document {
  _id: mongoose.Types.ObjectId
  projectId: mongoose.Types.ObjectId
  event: AnalyticsEventType | string  // 允许自定义事件名

  // 事件数据
  data?: Record<string, unknown>

  // 页面信息
  url?: string
  referrer?: string

  // 用户信息 (匿名)
  userId?: string              // 匿名用户ID
  sessionId: string

  // 设备信息
  device?: {
    type: 'desktop' | 'mobile' | 'tablet'
    os?: string
    browser?: string
  }

  // 地理位置
  geo?: {
    country?: string
    city?: string
    timezone?: string
  }

  // 时间戳
  timestamp: Date
  createdAt: Date
}

// AnalyticsEvent Schema
const analyticsEventSchema = new Schema<IAnalyticsEvent>(
  {
    projectId: {
      type: Schema.Types.ObjectId,
      ref: 'Project',
      required: true,
      index: true,
    },
    event: {
      type: String,
      required: true,
      index: true,
    },
    data: {
      type: Schema.Types.Mixed,
    },
    url: String,
    referrer: String,
    userId: String,
    sessionId: {
      type: String,
      required: true,
      index: true,
    },
    device: {
      type: {
        type: String,
        enum: ['desktop', 'mobile', 'tablet'],
      },
      os: String,
      browser: String,
    },
    geo: {
      country: String,
      city: String,
      timezone: String,
    },
    timestamp: {
      type: Date,
      required: true,
      default: Date.now,
      index: true,
    },
  },
  {
    timestamps: true,
    collection: 'analytics_events',
  }
)

// 复合索引
analyticsEventSchema.index({ projectId: 1, timestamp: -1 })
analyticsEventSchema.index({ projectId: 1, event: 1, timestamp: -1 })
analyticsEventSchema.index({ projectId: 1, sessionId: 1 })
// TTL 索引 - 90天后自动删除
analyticsEventSchema.index({ createdAt: 1 }, { expireAfterSeconds: 90 * 24 * 3600 })

// 静态方法: 记录事件
analyticsEventSchema.statics.track = async function (data: {
  projectId: mongoose.Types.ObjectId
  event: AnalyticsEventType | string
  sessionId: string
  url?: string
  referrer?: string
  userId?: string
  data?: Record<string, unknown>
  device?: {
    type: 'desktop' | 'mobile' | 'tablet'
    os?: string
    browser?: string
  }
  geo?: {
    country?: string
    city?: string
    timezone?: string
  }
}): Promise<IAnalyticsEvent> {
  return this.create({
    ...data,
    timestamp: new Date(),
  })
}

// 静态方法: 获取项目事件
analyticsEventSchema.statics.getProjectEvents = async function (
  projectId: mongoose.Types.ObjectId,
  options: {
    start?: Date
    end?: Date
    event?: string
    limit?: number
  } = {}
): Promise<IAnalyticsEvent[]> {
  const { start, end, event, limit = 1000 } = options

  const query: Record<string, unknown> = { projectId }

  if (start || end) {
    query.timestamp = {}
    if (start) (query.timestamp as Record<string, Date>).$gte = start
    if (end) (query.timestamp as Record<string, Date>).$lte = end
  }

  if (event) {
    query.event = event
  }

  return this.find(query)
    .sort({ timestamp: -1 })
    .limit(limit)
}

// 静态方法: 获取事件计数
analyticsEventSchema.statics.countEvents = async function (
  projectId: mongoose.Types.ObjectId,
  options: {
    start?: Date
    end?: Date
    event?: string
  } = {}
): Promise<number> {
  const { start, end, event } = options

  const query: Record<string, unknown> = { projectId }

  if (start || end) {
    query.timestamp = {}
    if (start) (query.timestamp as Record<string, Date>).$gte = start
    if (end) (query.timestamp as Record<string, Date>).$lte = end
  }

  if (event) {
    query.event = event
  }

  return this.countDocuments(query)
}

// 静态方法: 获取独立用户数
analyticsEventSchema.statics.getUniqueUsers = async function (
  projectId: mongoose.Types.ObjectId,
  options: {
    start?: Date
    end?: Date
  } = {}
): Promise<number> {
  const { start, end } = options

  const match: Record<string, unknown> = { projectId }

  if (start || end) {
    match.timestamp = {}
    if (start) (match.timestamp as Record<string, Date>).$gte = start
    if (end) (match.timestamp as Record<string, Date>).$lte = end
  }

  const result = await this.aggregate([
    { $match: match },
    { $group: { _id: '$sessionId' } },
    { $count: 'count' },
  ])

  return result[0]?.count || 0
}

// 静态方法: 获取热门页面
analyticsEventSchema.statics.getTopPages = async function (
  projectId: mongoose.Types.ObjectId,
  options: {
    start?: Date
    end?: Date
    limit?: number
  } = {}
): Promise<{ url: string; views: number }[]> {
  const { start, end, limit = 10 } = options

  const match: Record<string, unknown> = {
    projectId,
    event: 'page_view',
    url: { $exists: true },
  }

  if (start || end) {
    match.timestamp = {}
    if (start) (match.timestamp as Record<string, Date>).$gte = start
    if (end) (match.timestamp as Record<string, Date>).$lte = end
  }

  return this.aggregate([
    { $match: match },
    { $group: { _id: '$url', views: { $sum: 1 } } },
    { $sort: { views: -1 } },
    { $limit: limit },
    { $project: { url: '$_id', views: 1, _id: 0 } },
  ])
}

// 静态方法: 获取每日统计
analyticsEventSchema.statics.getDailyStats = async function (
  projectId: mongoose.Types.ObjectId,
  options: {
    start?: Date
    end?: Date
  } = {}
): Promise<{
  date: string
  pageViews: number
  sessions: number
  users: number
}[]> {
  const { start, end } = options

  const match: Record<string, unknown> = { projectId }

  if (start || end) {
    match.timestamp = {}
    if (start) (match.timestamp as Record<string, Date>).$gte = start
    if (end) (match.timestamp as Record<string, Date>).$lte = end
  }

  return this.aggregate([
    { $match: match },
    {
      $group: {
        _id: {
          $dateToString: { format: '%Y-%m-%d', date: '$timestamp' },
        },
        pageViews: {
          $sum: { $cond: [{ $eq: ['$event', 'page_view'] }, 1, 0] },
        },
        sessions: { $addToSet: '$sessionId' },
        users: { $addToSet: '$userId' },
      },
    },
    {
      $project: {
        date: '$_id',
        pageViews: 1,
        sessions: { $size: '$sessions' },
        users: { $size: '$users' },
        _id: 0,
      },
    },
    { $sort: { date: 1 } },
  ])
}

// 模型接口扩展
export interface IAnalyticsEventModel extends Model<IAnalyticsEvent> {
  track(data: {
    projectId: mongoose.Types.ObjectId
    event: AnalyticsEventType | string
    sessionId: string
    url?: string
    referrer?: string
    userId?: string
    data?: Record<string, unknown>
    device?: {
      type: 'desktop' | 'mobile' | 'tablet'
      os?: string
      browser?: string
    }
    geo?: {
      country?: string
      city?: string
      timezone?: string
    }
  }): Promise<IAnalyticsEvent>
  getProjectEvents(
    projectId: mongoose.Types.ObjectId,
    options?: {
      start?: Date
      end?: Date
      event?: string
      limit?: number
    }
  ): Promise<IAnalyticsEvent[]>
  countEvents(
    projectId: mongoose.Types.ObjectId,
    options?: {
      start?: Date
      end?: Date
      event?: string
    }
  ): Promise<number>
  getUniqueUsers(
    projectId: mongoose.Types.ObjectId,
    options?: {
      start?: Date
      end?: Date
    }
  ): Promise<number>
  getTopPages(
    projectId: mongoose.Types.ObjectId,
    options?: {
      start?: Date
      end?: Date
      limit?: number
    }
  ): Promise<{ url: string; views: number }[]>
  getDailyStats(
    projectId: mongoose.Types.ObjectId,
    options?: {
      start?: Date
      end?: Date
    }
  ): Promise<{
    date: string
    pageViews: number
    sessions: number
    users: number
  }[]>
}

// 导出模型
export const AnalyticsEvent =
  (mongoose.models.AnalyticsEvent as IAnalyticsEventModel) ||
  mongoose.model<IAnalyticsEvent, IAnalyticsEventModel>('AnalyticsEvent', analyticsEventSchema)
