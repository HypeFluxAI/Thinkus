import mongoose, { Schema, Document, Model, Types } from 'mongoose'

// 支付状态
export type PaymentStatus = 'pending' | 'processing' | 'succeeded' | 'failed' | 'refunded' | 'canceled'

// 支付类型
export type PaymentType = 'subscription' | 'one_time' | 'addon'

// 支付接口
export interface IPayment extends Document {
  _id: Types.ObjectId
  userId: Types.ObjectId
  subscriptionId?: Types.ObjectId
  projectId?: Types.ObjectId

  // 支付信息
  amount: number
  currency: string
  status: PaymentStatus
  type: PaymentType

  // Stripe 信息
  stripePaymentIntentId?: string
  stripeInvoiceId?: string
  stripeChargeId?: string

  // 描述信息
  description: string
  metadata?: Record<string, string>

  // 发票信息
  invoiceNumber?: string
  invoiceUrl?: string
  receiptUrl?: string

  // 退款信息
  refundedAmount?: number
  refundedAt?: Date
  refundReason?: string

  // 失败信息
  failureCode?: string
  failureMessage?: string

  paidAt?: Date
  createdAt: Date
  updatedAt: Date
}

// 支付模型方法
export interface IPaymentModel extends Model<IPayment> {
  getUserPayments(userId: Types.ObjectId, options?: {
    status?: PaymentStatus
    limit?: number
    skip?: number
  }): Promise<IPayment[]>
  getTotalSpent(userId: Types.ObjectId): Promise<number>
  getMonthlyRevenue(year: number, month: number): Promise<number>
}

const PaymentSchema = new Schema<IPayment>(
  {
    userId: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    subscriptionId: {
      type: Schema.Types.ObjectId,
      ref: 'Subscription',
    },
    projectId: {
      type: Schema.Types.ObjectId,
      ref: 'Project',
    },

    // 支付信息
    amount: {
      type: Number,
      required: true,
    },
    currency: {
      type: String,
      default: 'usd',
    },
    status: {
      type: String,
      enum: ['pending', 'processing', 'succeeded', 'failed', 'refunded', 'canceled'],
      default: 'pending',
    },
    type: {
      type: String,
      enum: ['subscription', 'one_time', 'addon'],
      required: true,
    },

    // Stripe 信息
    stripePaymentIntentId: {
      type: String,
      
    },
    stripeInvoiceId: String,
    stripeChargeId: String,

    // 描述信息
    description: {
      type: String,
      required: true,
    },
    metadata: {
      type: Map,
      of: String,
    },

    // 发票信息
    invoiceNumber: String,
    invoiceUrl: String,
    receiptUrl: String,

    // 退款信息
    refundedAmount: Number,
    refundedAt: Date,
    refundReason: String,

    // 失败信息
    failureCode: String,
    failureMessage: String,

    paidAt: Date,
  },
  {
    timestamps: true,
  }
)

// 索引
PaymentSchema.index({ userId: 1, createdAt: -1 })
PaymentSchema.index({ stripePaymentIntentId: 1 }, { sparse: true })
PaymentSchema.index({ stripeInvoiceId: 1 }, { sparse: true })
PaymentSchema.index({ status: 1 })
PaymentSchema.index({ createdAt: -1 })
PaymentSchema.index({ paidAt: -1 })

// 获取用户支付记录
PaymentSchema.statics.getUserPayments = async function (
  userId: Types.ObjectId,
  options: { status?: PaymentStatus; limit?: number; skip?: number } = {}
): Promise<IPayment[]> {
  const { status, limit = 20, skip = 0 } = options

  const query: Record<string, unknown> = { userId }
  if (status) {
    query.status = status
  }

  return this.find(query)
    .sort({ createdAt: -1 })
    .skip(skip)
    .limit(limit)
    .exec()
}

// 获取用户总消费
PaymentSchema.statics.getTotalSpent = async function (
  userId: Types.ObjectId
): Promise<number> {
  const result = await this.aggregate([
    { $match: { userId, status: 'succeeded' } },
    { $group: { _id: null, total: { $sum: '$amount' } } },
  ])

  return result[0]?.total || 0
}

// 获取月度收入
PaymentSchema.statics.getMonthlyRevenue = async function (
  year: number,
  month: number
): Promise<number> {
  const startDate = new Date(year, month - 1, 1)
  const endDate = new Date(year, month, 1)

  const result = await this.aggregate([
    {
      $match: {
        status: 'succeeded',
        paidAt: { $gte: startDate, $lt: endDate },
      },
    },
    { $group: { _id: null, total: { $sum: '$amount' } } },
  ])

  return result[0]?.total || 0
}

// 避免模型重复编译
export const Payment = (mongoose.models.Payment as IPaymentModel) ||
  mongoose.model<IPayment, IPaymentModel>('Payment', PaymentSchema)
