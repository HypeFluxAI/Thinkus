import mongoose, { Schema, Document, Model, Types } from 'mongoose'

// 订阅计划类型
export type SubscriptionPlan = 'free' | 'starter' | 'professional' | 'enterprise'

// 订阅状态
export type SubscriptionStatus = 'active' | 'canceled' | 'past_due' | 'trialing' | 'paused'

// 订阅计划配置
export const SUBSCRIPTION_PLANS = {
  free: {
    name: 'Free',
    nameCn: '免费版',
    price: 0,
    priceYearly: 0,
    features: {
      maxProjects: 1,
      maxDiscussionsPerMonth: 5,
      maxExecutives: 3,
      maxMessagesPerDay: 20,
      memoryEnabled: false,
      prioritySupport: false,
      customBranding: false,
    },
  },
  starter: {
    name: 'Starter',
    nameCn: '入门版',
    price: 29,
    priceYearly: 290, // ~17% 折扣
    features: {
      maxProjects: 5,
      maxDiscussionsPerMonth: 50,
      maxExecutives: 6,
      maxMessagesPerDay: 100,
      memoryEnabled: true,
      prioritySupport: false,
      customBranding: false,
    },
  },
  professional: {
    name: 'Professional',
    nameCn: '专业版',
    price: 99,
    priceYearly: 990, // ~17% 折扣
    features: {
      maxProjects: 20,
      maxDiscussionsPerMonth: 200,
      maxExecutives: 12,
      maxMessagesPerDay: 500,
      memoryEnabled: true,
      prioritySupport: true,
      customBranding: false,
    },
  },
  enterprise: {
    name: 'Enterprise',
    nameCn: '企业版',
    price: 299,
    priceYearly: 2990, // ~17% 折扣
    features: {
      maxProjects: -1, // 无限制
      maxDiscussionsPerMonth: -1,
      maxExecutives: 18,
      maxMessagesPerDay: -1,
      memoryEnabled: true,
      prioritySupport: true,
      customBranding: true,
    },
  },
} as const

// 订阅接口
export interface ISubscription extends Document {
  _id: Types.ObjectId
  userId: Types.ObjectId
  plan: SubscriptionPlan
  status: SubscriptionStatus

  // Stripe 信息
  stripeCustomerId?: string
  stripeSubscriptionId?: string
  stripePriceId?: string

  // 计费周期
  billingCycle: 'monthly' | 'yearly'
  currentPeriodStart: Date
  currentPeriodEnd: Date

  // 试用期
  trialStart?: Date
  trialEnd?: Date

  // 取消信息
  canceledAt?: Date
  cancelReason?: string
  cancelAtPeriodEnd: boolean

  // 使用量跟踪
  usage: {
    projectsCreated: number
    discussionsThisMonth: number
    messagesThisDay: number
    lastResetDate: Date
  }

  createdAt: Date
  updatedAt: Date
}

// 订阅模型方法
export interface ISubscriptionModel extends Model<ISubscription> {
  getOrCreateSubscription(userId: Types.ObjectId): Promise<ISubscription>
  checkLimit(userId: Types.ObjectId, limitType: 'projects' | 'discussions' | 'messages'): Promise<{
    allowed: boolean
    current: number
    limit: number
  }>
  incrementUsage(userId: Types.ObjectId, usageType: 'projects' | 'discussions' | 'messages'): Promise<void>
  resetDailyUsage(): Promise<number>
  resetMonthlyUsage(): Promise<number>
}

const SubscriptionSchema = new Schema<ISubscription>(
  {
    userId: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      unique: true,
    },
    plan: {
      type: String,
      enum: ['free', 'starter', 'professional', 'enterprise'],
      default: 'free',
    },
    status: {
      type: String,
      enum: ['active', 'canceled', 'past_due', 'trialing', 'paused'],
      default: 'active',
    },

    // Stripe 信息
    stripeCustomerId: String,
    stripeSubscriptionId: String,
    stripePriceId: String,

    // 计费周期
    billingCycle: {
      type: String,
      enum: ['monthly', 'yearly'],
      default: 'monthly',
    },
    currentPeriodStart: {
      type: Date,
      default: Date.now,
    },
    currentPeriodEnd: {
      type: Date,
      default: () => new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // 30天后
    },

    // 试用期
    trialStart: Date,
    trialEnd: Date,

    // 取消信息
    canceledAt: Date,
    cancelReason: String,
    cancelAtPeriodEnd: {
      type: Boolean,
      default: false,
    },

    // 使用量跟踪
    usage: {
      projectsCreated: { type: Number, default: 0 },
      discussionsThisMonth: { type: Number, default: 0 },
      messagesThisDay: { type: Number, default: 0 },
      lastResetDate: { type: Date, default: Date.now },
    },
  },
  {
    timestamps: true,
  }
)

// 索引
SubscriptionSchema.index({ userId: 1 }, { unique: true })
SubscriptionSchema.index({ stripeCustomerId: 1 })
SubscriptionSchema.index({ stripeSubscriptionId: 1 })
SubscriptionSchema.index({ status: 1 })
SubscriptionSchema.index({ currentPeriodEnd: 1 })

// 获取或创建订阅
SubscriptionSchema.statics.getOrCreateSubscription = async function (
  userId: Types.ObjectId
): Promise<ISubscription> {
  let subscription = await this.findOne({ userId })

  if (!subscription) {
    subscription = await this.create({
      userId,
      plan: 'free',
      status: 'active',
      billingCycle: 'monthly',
      currentPeriodStart: new Date(),
      currentPeriodEnd: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
      usage: {
        projectsCreated: 0,
        discussionsThisMonth: 0,
        messagesThisDay: 0,
        lastResetDate: new Date(),
      },
    })
  }

  return subscription
}

// 检查使用限制
SubscriptionSchema.statics.checkLimit = async function (
  userId: Types.ObjectId,
  limitType: 'projects' | 'discussions' | 'messages'
): Promise<{ allowed: boolean; current: number; limit: number }> {
  const model = this as unknown as ISubscriptionModel
  const subscription = await model.getOrCreateSubscription(userId)
  const planFeatures = SUBSCRIPTION_PLANS[subscription.plan].features

  let current: number
  let limit: number

  switch (limitType) {
    case 'projects':
      current = subscription.usage.projectsCreated
      limit = planFeatures.maxProjects
      break
    case 'discussions':
      current = subscription.usage.discussionsThisMonth
      limit = planFeatures.maxDiscussionsPerMonth
      break
    case 'messages':
      current = subscription.usage.messagesThisDay
      limit = planFeatures.maxMessagesPerDay
      break
  }

  // -1 表示无限制
  const allowed = limit === -1 || current < limit

  return { allowed, current, limit }
}

// 增加使用量
SubscriptionSchema.statics.incrementUsage = async function (
  userId: Types.ObjectId,
  usageType: 'projects' | 'discussions' | 'messages'
): Promise<void> {
  const updateField = {
    projects: 'usage.projectsCreated',
    discussions: 'usage.discussionsThisMonth',
    messages: 'usage.messagesThisDay',
  }[usageType]

  await this.findOneAndUpdate(
    { userId },
    { $inc: { [updateField]: 1 } }
  )
}

// 重置每日使用量
SubscriptionSchema.statics.resetDailyUsage = async function (): Promise<number> {
  const result = await this.updateMany(
    {},
    {
      $set: {
        'usage.messagesThisDay': 0,
        'usage.lastResetDate': new Date(),
      },
    }
  )
  return result.modifiedCount
}

// 重置每月使用量
SubscriptionSchema.statics.resetMonthlyUsage = async function (): Promise<number> {
  const result = await this.updateMany(
    {},
    {
      $set: {
        'usage.discussionsThisMonth': 0,
      },
    }
  )
  return result.modifiedCount
}

// 避免模型重复编译
export const Subscription = (mongoose.models.Subscription as ISubscriptionModel) ||
  mongoose.model<ISubscription, ISubscriptionModel>('Subscription', SubscriptionSchema)
