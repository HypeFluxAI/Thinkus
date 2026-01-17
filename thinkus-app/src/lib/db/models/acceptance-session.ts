import mongoose, { Schema, Document, Model, Types } from 'mongoose'

// 验收状态
export type AcceptanceStatus =
  | 'pending'        // 等待开始
  | 'active'         // 进行中
  | 'warning'        // 临近超时
  | 'final_warning'  // 最后警告
  | 'auto_passed'    // 自动通过（超时）
  | 'passed'         // 用户确认通过
  | 'rejected'       // 用户拒绝
  | 'escalated'      // 已升级人工

// 检查项状态
export type CheckItemStatus = 'pending' | 'passed' | 'failed' | 'skipped'

// 验收检查项
export interface AcceptanceCheckItem {
  id: string
  category: 'functionality' | 'ui' | 'performance' | 'security' | 'mobile' | 'other'
  question: string      // 检查问题
  questionZh?: string   // 中文问题
  status: CheckItemStatus
  feedback?: 'good' | 'bad' | 'skip'
  comment?: string      // 用户备注
  checkedAt?: Date
}

// 验收问题报告
export interface AcceptanceIssue {
  id: string
  checkItemId?: string
  type: 'bug' | 'suggestion' | 'question' | 'complaint'
  severity: 'critical' | 'high' | 'medium' | 'low'
  description: string
  screenshot?: string   // 截图URL
  status: 'open' | 'acknowledged' | 'fixing' | 'fixed' | 'wont_fix'
  createdAt: Date
  resolvedAt?: Date
  resolution?: string
}

export interface IAcceptanceSession extends Document {
  _id: Types.ObjectId
  deliverySessionId: Types.ObjectId
  projectId: Types.ObjectId
  userId: Types.ObjectId

  // 状态
  status: AcceptanceStatus

  // 倒计时
  timeoutMinutes: number      // 超时时间（分钟）
  startedAt?: Date
  expiresAt?: Date
  remainingSeconds?: number

  // 检查项
  checkItems: AcceptanceCheckItem[]
  passedCount: number
  failedCount: number
  skippedCount: number

  // 问题
  issues: AcceptanceIssue[]

  // 签收信息
  signature?: {
    signedAt: Date
    signedBy: string
    satisfactionScore?: 1 | 2 | 3 | 4 | 5  // 满意度1-5
    comment?: string
    ipAddress?: string
  }

  // 提醒记录
  reminders: Array<{
    type: 'email' | 'sms' | 'in_app'
    sentAt: Date
    stage: 'first' | 'warning' | 'final'
  }>

  // 人工介入
  escalation?: {
    escalatedAt: Date
    reason: string
    assignedTo?: string
    status: 'pending' | 'in_progress' | 'resolved'
    resolvedAt?: Date
    resolution?: string
  }

  completedAt?: Date
  createdAt: Date
  updatedAt: Date
}

// 检查项Schema
const checkItemSchema = new Schema<AcceptanceCheckItem>(
  {
    id: { type: String, required: true },
    category: {
      type: String,
      enum: ['functionality', 'ui', 'performance', 'security', 'mobile', 'other'],
      required: true,
    },
    question: { type: String, required: true },
    questionZh: String,
    status: {
      type: String,
      enum: ['pending', 'passed', 'failed', 'skipped'],
      default: 'pending',
    },
    feedback: {
      type: String,
      enum: ['good', 'bad', 'skip'],
    },
    comment: String,
    checkedAt: Date,
  },
  { _id: false }
)

// 问题报告Schema
const issueSchema = new Schema<AcceptanceIssue>(
  {
    id: { type: String, required: true },
    checkItemId: String,
    type: {
      type: String,
      enum: ['bug', 'suggestion', 'question', 'complaint'],
      required: true,
    },
    severity: {
      type: String,
      enum: ['critical', 'high', 'medium', 'low'],
      default: 'medium',
    },
    description: { type: String, required: true },
    screenshot: String,
    status: {
      type: String,
      enum: ['open', 'acknowledged', 'fixing', 'fixed', 'wont_fix'],
      default: 'open',
    },
    createdAt: { type: Date, default: Date.now },
    resolvedAt: Date,
    resolution: String,
  },
  { _id: false }
)

const AcceptanceSessionSchema = new Schema<IAcceptanceSession>(
  {
    deliverySessionId: {
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

    // 状态
    status: {
      type: String,
      enum: ['pending', 'active', 'warning', 'final_warning', 'auto_passed', 'passed', 'rejected', 'escalated'],
      default: 'pending',
    },

    // 倒计时
    timeoutMinutes: {
      type: Number,
      default: 72 * 60,  // 默认72小时
    },
    startedAt: Date,
    expiresAt: Date,
    remainingSeconds: Number,

    // 检查项
    checkItems: {
      type: [checkItemSchema],
      default: [],
    },
    passedCount: { type: Number, default: 0 },
    failedCount: { type: Number, default: 0 },
    skippedCount: { type: Number, default: 0 },

    // 问题
    issues: {
      type: [issueSchema],
      default: [],
    },

    // 签收信息
    signature: {
      signedAt: Date,
      signedBy: String,
      satisfactionScore: {
        type: Number,
        min: 1,
        max: 5,
      },
      comment: String,
      ipAddress: String,
    },

    // 提醒记录
    reminders: [{
      type: {
        type: String,
        enum: ['email', 'sms', 'in_app'],
      },
      sentAt: Date,
      stage: {
        type: String,
        enum: ['first', 'warning', 'final'],
      },
    }],

    // 人工介入
    escalation: {
      escalatedAt: Date,
      reason: String,
      assignedTo: String,
      status: {
        type: String,
        enum: ['pending', 'in_progress', 'resolved'],
      },
      resolvedAt: Date,
      resolution: String,
    },

    completedAt: Date,
  },
  {
    timestamps: true,
  }
)

// 索引
AcceptanceSessionSchema.index({ deliverySessionId: 1 })
AcceptanceSessionSchema.index({ projectId: 1, createdAt: -1 })
AcceptanceSessionSchema.index({ status: 1, expiresAt: 1 })
AcceptanceSessionSchema.index({ expiresAt: 1 })

// 静态方法：获取即将超时的验收会话
AcceptanceSessionSchema.statics.getExpiringSoon = async function (
  withinMinutes = 60
): Promise<IAcceptanceSession[]> {
  const now = new Date()
  const threshold = new Date(now.getTime() + withinMinutes * 60 * 1000)

  return this.find({
    status: { $in: ['active', 'warning'] },
    expiresAt: {
      $gte: now,
      $lte: threshold,
    },
  }).sort({ expiresAt: 1 })
}

// 静态方法：获取已超时的验收会话
AcceptanceSessionSchema.statics.getExpired = async function (): Promise<IAcceptanceSession[]> {
  return this.find({
    status: { $in: ['active', 'warning', 'final_warning'] },
    expiresAt: { $lt: new Date() },
  })
}

// 实例方法：开始验收
AcceptanceSessionSchema.methods.start = async function (
  defaultCheckItems: Omit<AcceptanceCheckItem, 'status' | 'feedback'>[]
): Promise<void> {
  this.status = 'active'
  this.startedAt = new Date()
  this.expiresAt = new Date(Date.now() + this.timeoutMinutes * 60 * 1000)
  this.checkItems = defaultCheckItems.map(item => ({
    ...item,
    status: 'pending',
  }))
  await this.save()
}

// 实例方法：更新检查项
AcceptanceSessionSchema.methods.updateCheckItem = async function (
  itemId: string,
  feedback: 'good' | 'bad' | 'skip',
  comment?: string
): Promise<void> {
  const item = this.checkItems.find((i: AcceptanceCheckItem) => i.id === itemId)
  if (item) {
    item.feedback = feedback
    item.status = feedback === 'good' ? 'passed' : feedback === 'bad' ? 'failed' : 'skipped'
    item.checkedAt = new Date()
    if (comment) item.comment = comment
  }

  // 更新计数
  this.passedCount = this.checkItems.filter((i: AcceptanceCheckItem) => i.status === 'passed').length
  this.failedCount = this.checkItems.filter((i: AcceptanceCheckItem) => i.status === 'failed').length
  this.skippedCount = this.checkItems.filter((i: AcceptanceCheckItem) => i.status === 'skipped').length

  await this.save()
}

// 实例方法：报告问题
AcceptanceSessionSchema.methods.reportIssue = async function (
  issue: Omit<AcceptanceIssue, 'id' | 'status' | 'createdAt'>
): Promise<string> {
  const id = `issue_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
  this.issues.push({
    ...issue,
    id,
    status: 'open',
    createdAt: new Date(),
  })
  await this.save()
  return id
}

// 实例方法：签收
AcceptanceSessionSchema.methods.sign = async function (
  signedBy: string,
  satisfactionScore: 1 | 2 | 3 | 4 | 5,
  comment?: string,
  ipAddress?: string
): Promise<void> {
  this.status = 'passed'
  this.completedAt = new Date()
  this.signature = {
    signedAt: new Date(),
    signedBy,
    satisfactionScore,
    comment,
    ipAddress,
  }
  await this.save()
}

// 实例方法：自动通过
AcceptanceSessionSchema.methods.autoPass = async function (): Promise<void> {
  this.status = 'auto_passed'
  this.completedAt = new Date()
  await this.save()
}

// 实例方法：升级人工
AcceptanceSessionSchema.methods.escalate = async function (
  reason: string,
  assignedTo?: string
): Promise<void> {
  this.status = 'escalated'
  this.escalation = {
    escalatedAt: new Date(),
    reason,
    assignedTo,
    status: 'pending',
  }
  await this.save()
}

export interface IAcceptanceSessionModel extends Model<IAcceptanceSession> {
  getExpiringSoon(withinMinutes?: number): Promise<IAcceptanceSession[]>
  getExpired(): Promise<IAcceptanceSession[]>
}

const AcceptanceSession: IAcceptanceSessionModel =
  (mongoose.models.AcceptanceSession as IAcceptanceSessionModel) ||
  mongoose.model<IAcceptanceSession, IAcceptanceSessionModel>('AcceptanceSession', AcceptanceSessionSchema)

export { AcceptanceSession }
export default AcceptanceSession
