import mongoose, { Schema, Document, Model, Types } from 'mongoose'

// 交付阶段
export type DeliveryStage =
  | 'queued'           // 排队中
  | 'preparing'        // 准备中
  | 'building'         // 构建中
  | 'testing'          // 测试中
  | 'deploying'        // 部署中
  | 'verifying'        // 验证中
  | 'configuring'      // 配置中
  | 'notifying'        // 通知中
  | 'acceptance'       // 验收中
  | 'completed'        // 已完成
  | 'failed'           // 失败
  | 'cancelled'        // 已取消
  | 'paused'           // 已暂停

// 阶段状态
export type StageStatus = 'pending' | 'running' | 'completed' | 'failed' | 'skipped'

// 单个阶段信息
export interface StageInfo {
  stage: DeliveryStage
  status: StageStatus
  startedAt?: Date
  completedAt?: Date
  duration?: number
  error?: string
  retryCount: number
  output?: Record<string, unknown>
}

// 交付产物
export interface DeliveryOutputs {
  productUrl?: string
  adminUrl?: string
  vercelProjectId?: string
  vercelDeploymentId?: string
  domain?: string
  sslStatus?: 'pending' | 'active' | 'failed'
  credentials?: {
    username: string
    passwordHash: string  // 不存明文密码
    tempPassword?: string // 临时存储原始密码，仅用于发送邮件，发送后删除
    tempPasswordSent: boolean
  }
  testReport?: {
    total: number
    passed: number
    failed: number
    skipped: number
    reportUrl?: string
  }
  buildLogs?: string[]
}

// 交付配置
export interface DeliveryConfig {
  skipTests?: boolean
  skipAcceptance?: boolean
  autoSign?: boolean
  notifyChannels?: ('email' | 'sms' | 'wechat')[]
  customDomain?: string
  envVars?: Record<string, string>
  maxRetries?: number
}

export interface IDeliverySession extends Document {
  _id: Types.ObjectId
  projectId: Types.ObjectId
  userId: Types.ObjectId

  // 状态
  currentStage: DeliveryStage
  overallProgress: number  // 0-100
  status: 'active' | 'completed' | 'failed' | 'cancelled' | 'paused'

  // 阶段详情
  stages: StageInfo[]

  // 产物
  outputs: DeliveryOutputs

  // 配置
  config: DeliveryConfig

  // 统计
  totalDuration?: number
  startedAt: Date
  completedAt?: Date
  estimatedCompletionAt?: Date

  // 错误处理
  lastError?: {
    stage: DeliveryStage
    message: string
    code?: string
    timestamp: Date
    autoFixAttempted?: boolean
  }

  // 版本回滚
  previousDeploymentId?: string
  canRollback: boolean

  createdAt: Date
  updatedAt: Date
}

// 阶段信息Schema
const stageInfoSchema = new Schema<StageInfo>(
  {
    stage: {
      type: String,
      enum: ['queued', 'preparing', 'building', 'testing', 'deploying', 'verifying', 'configuring', 'notifying', 'acceptance', 'completed', 'failed', 'cancelled', 'paused'],
      required: true,
    },
    status: {
      type: String,
      enum: ['pending', 'running', 'completed', 'failed', 'skipped'],
      default: 'pending',
    },
    startedAt: Date,
    completedAt: Date,
    duration: Number,
    error: String,
    retryCount: { type: Number, default: 0 },
    output: Schema.Types.Mixed,
  },
  { _id: false }
)

// 交付产物Schema
const deliveryOutputsSchema = new Schema<DeliveryOutputs>(
  {
    productUrl: String,
    adminUrl: String,
    vercelProjectId: String,
    vercelDeploymentId: String,
    domain: String,
    sslStatus: {
      type: String,
      enum: ['pending', 'active', 'failed'],
    },
    credentials: {
      username: String,
      passwordHash: String,
      tempPassword: String, // 临时存储，发送邮件后删除
      tempPasswordSent: Boolean,
    },
    testReport: {
      total: Number,
      passed: Number,
      failed: Number,
      skipped: Number,
      reportUrl: String,
    },
    buildLogs: [String],
  },
  { _id: false }
)

// 交付配置Schema
const deliveryConfigSchema = new Schema<DeliveryConfig>(
  {
    skipTests: Boolean,
    skipAcceptance: Boolean,
    autoSign: Boolean,
    notifyChannels: [{ type: String, enum: ['email', 'sms', 'wechat'] }],
    customDomain: String,
    envVars: Schema.Types.Mixed,
    maxRetries: { type: Number, default: 3 },
  },
  { _id: false }
)

const DeliverySessionSchema = new Schema<IDeliverySession>(
  {
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
      index: true,
    },

    // 状态
    currentStage: {
      type: String,
      enum: ['queued', 'preparing', 'building', 'testing', 'deploying', 'verifying', 'configuring', 'notifying', 'acceptance', 'completed', 'failed', 'cancelled', 'paused'],
      default: 'queued',
    },
    overallProgress: {
      type: Number,
      default: 0,
      min: 0,
      max: 100,
    },
    status: {
      type: String,
      enum: ['active', 'completed', 'failed', 'cancelled', 'paused'],
      default: 'active',
    },

    // 阶段详情
    stages: {
      type: [stageInfoSchema],
      default: () => [
        { stage: 'queued', status: 'pending', retryCount: 0 },
        { stage: 'preparing', status: 'pending', retryCount: 0 },
        { stage: 'building', status: 'pending', retryCount: 0 },
        { stage: 'testing', status: 'pending', retryCount: 0 },
        { stage: 'deploying', status: 'pending', retryCount: 0 },
        { stage: 'verifying', status: 'pending', retryCount: 0 },
        { stage: 'configuring', status: 'pending', retryCount: 0 },
        { stage: 'notifying', status: 'pending', retryCount: 0 },
        { stage: 'acceptance', status: 'pending', retryCount: 0 },
      ],
    },

    // 产物
    outputs: {
      type: deliveryOutputsSchema,
      default: () => ({}),
    },

    // 配置
    config: {
      type: deliveryConfigSchema,
      default: () => ({}),
    },

    // 统计
    totalDuration: Number,
    startedAt: { type: Date, default: Date.now },
    completedAt: Date,
    estimatedCompletionAt: Date,

    // 错误处理
    lastError: {
      stage: String,
      message: String,
      code: String,
      timestamp: Date,
      autoFixAttempted: Boolean,
    },

    // 版本回滚
    previousDeploymentId: String,
    canRollback: { type: Boolean, default: false },
  },
  {
    timestamps: true,
  }
)

// 索引
DeliverySessionSchema.index({ projectId: 1, createdAt: -1 })
DeliverySessionSchema.index({ userId: 1, status: 1 })
DeliverySessionSchema.index({ status: 1, currentStage: 1 })
DeliverySessionSchema.index({ createdAt: -1 })

// 静态方法：获取项目最新交付会话
DeliverySessionSchema.statics.getLatestByProject = async function (
  projectId: Types.ObjectId
): Promise<IDeliverySession | null> {
  return this.findOne({ projectId }).sort({ createdAt: -1 })
}

// 静态方法：获取进行中的交付
DeliverySessionSchema.statics.getActiveDeliveries = async function (
  userId?: Types.ObjectId
): Promise<IDeliverySession[]> {
  const query: Record<string, unknown> = { status: 'active' }
  if (userId) query.userId = userId
  return this.find(query).sort({ createdAt: -1 })
}

// 实例方法：更新阶段状态
DeliverySessionSchema.methods.updateStage = async function (
  stage: DeliveryStage,
  status: StageStatus,
  output?: Record<string, unknown>,
  error?: string
): Promise<void> {
  const stageInfo = this.stages.find((s: StageInfo) => s.stage === stage)
  if (stageInfo) {
    stageInfo.status = status
    if (status === 'running') {
      stageInfo.startedAt = new Date()
    } else if (status === 'completed' || status === 'failed') {
      stageInfo.completedAt = new Date()
      if (stageInfo.startedAt) {
        stageInfo.duration = stageInfo.completedAt.getTime() - stageInfo.startedAt.getTime()
      }
    }
    if (output) stageInfo.output = output
    if (error) stageInfo.error = error
  }

  // 更新当前阶段
  if (status === 'running') {
    this.currentStage = stage
  }

  // 计算总进度
  const stageWeights: Record<DeliveryStage, number> = {
    queued: 5,
    preparing: 10,
    building: 20,
    testing: 15,
    deploying: 20,
    verifying: 10,
    configuring: 10,
    notifying: 5,
    acceptance: 5,
    completed: 0,
    failed: 0,
    cancelled: 0,
    paused: 0,
  }

  let completedWeight = 0
  for (const s of this.stages) {
    if (s.status === 'completed' || s.status === 'skipped') {
      completedWeight += stageWeights[s.stage as DeliveryStage] || 0
    }
  }
  this.overallProgress = Math.min(100, completedWeight)

  await this.save()
}

// 实例方法：标记完成
DeliverySessionSchema.methods.markCompleted = async function (): Promise<void> {
  this.status = 'completed'
  this.currentStage = 'completed'
  this.overallProgress = 100
  this.completedAt = new Date()
  if (this.startedAt) {
    this.totalDuration = this.completedAt.getTime() - this.startedAt.getTime()
  }
  await this.save()
}

// 实例方法：标记失败
DeliverySessionSchema.methods.markFailed = async function (
  stage: DeliveryStage,
  error: string,
  code?: string
): Promise<void> {
  this.status = 'failed'
  this.currentStage = 'failed'
  this.lastError = {
    stage,
    message: error,
    code,
    timestamp: new Date(),
  }
  await this.save()
}

export interface IDeliverySessionModel extends Model<IDeliverySession> {
  getLatestByProject(projectId: Types.ObjectId): Promise<IDeliverySession | null>
  getActiveDeliveries(userId?: Types.ObjectId): Promise<IDeliverySession[]>
}

const DeliverySession: IDeliverySessionModel =
  (mongoose.models.DeliverySession as IDeliverySessionModel) ||
  mongoose.model<IDeliverySession, IDeliverySessionModel>('DeliverySession', DeliverySessionSchema)

export { DeliverySession }
export default DeliverySession
