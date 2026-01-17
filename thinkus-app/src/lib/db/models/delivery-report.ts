import mongoose, { Schema, Document, Model, Types } from 'mongoose'

// 报告类型
export type DeliveryReportType = 'delivery' | 'test' | 'acceptance' | 'summary'

// 报告状态
export type ReportStatus = 'draft' | 'generated' | 'sent' | 'viewed' | 'signed'

// 测试报告数据
export interface TestReportData {
  framework: 'playwright' | 'vitest' | 'jest' | 'other'
  totalTests: number
  passed: number
  failed: number
  skipped: number
  passRate: number
  duration: number
  coverage?: {
    lines: number
    branches: number
    functions: number
    statements: number
  }
  screenshots?: Array<{
    name: string
    url: string
    status: 'passed' | 'failed'
  }>
  failedTests?: Array<{
    name: string
    error: string
    file?: string
    line?: number
  }>
  browserResults?: Array<{
    browser: string
    passed: number
    failed: number
  }>
}

// 验收报告数据
export interface AcceptanceReportData {
  totalItems: number
  passed: number
  failed: number
  skipped: number
  passRate: number
  issues: Array<{
    id: string
    type: string
    severity: string
    description: string
    status: string
  }>
  signature?: {
    signedAt: Date
    signedBy: string
    satisfactionScore: number
    comment?: string
  }
}

// 交付报告数据
export interface DeliveryReportData {
  projectName: string
  productType: string
  clientName?: string
  clientEmail?: string

  // 产品信息
  productUrl: string
  adminUrl?: string
  domain?: string

  // 凭证（加密存储）
  credentials?: {
    adminUsername: string
    adminPasswordEncrypted: string  // 加密后的密码
    databaseHost?: string
    databaseName?: string
  }

  // 各阶段摘要
  buildSummary?: {
    duration: number
    size?: number
    framework?: string
    node?: string
  }
  testSummary?: TestReportData
  acceptanceSummary?: AcceptanceReportData
  deploySummary?: {
    platform: string
    region?: string
    deploymentId: string
    deployedAt: Date
    sslStatus: string
  }

  // 快速入门
  quickStartGuide?: string

  // 支持信息
  supportEmail?: string
  supportPhone?: string
  documentationUrl?: string
}

export interface IDeliveryReport extends Document {
  _id: Types.ObjectId
  deliverySessionId: Types.ObjectId
  projectId: Types.ObjectId
  userId: Types.ObjectId

  // 报告信息
  type: DeliveryReportType
  title: string
  status: ReportStatus

  // 报告数据
  data: DeliveryReportData | TestReportData | AcceptanceReportData

  // 生成的文件
  files?: Array<{
    type: 'html' | 'pdf' | 'json'
    url: string
    size?: number
    generatedAt: Date
  }>

  // 发送记录
  sentHistory?: Array<{
    channel: 'email' | 'sms' | 'download'
    sentTo: string
    sentAt: Date
    opened?: boolean
    openedAt?: Date
  }>

  // QR码
  qrCodeUrl?: string

  // 有效期
  expiresAt?: Date

  // 访问控制
  accessCode?: string  // 访问码
  viewCount: number

  generatedAt?: Date
  createdAt: Date
  updatedAt: Date
}

const DeliveryReportSchema = new Schema<IDeliveryReport>(
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

    // 报告信息
    type: {
      type: String,
      enum: ['delivery', 'test', 'acceptance', 'summary'],
      required: true,
    },
    title: {
      type: String,
      required: true,
    },
    status: {
      type: String,
      enum: ['draft', 'generated', 'sent', 'viewed', 'signed'],
      default: 'draft',
    },

    // 报告数据
    data: {
      type: Schema.Types.Mixed,
      required: true,
    },

    // 生成的文件
    files: [{
      type: {
        type: String,
        enum: ['html', 'pdf', 'json'],
      },
      url: String,
      size: Number,
      generatedAt: Date,
    }],

    // 发送记录
    sentHistory: [{
      channel: {
        type: String,
        enum: ['email', 'sms', 'download'],
      },
      sentTo: String,
      sentAt: Date,
      opened: Boolean,
      openedAt: Date,
    }],

    // QR码
    qrCodeUrl: String,

    // 有效期（默认90天）
    expiresAt: {
      type: Date,
      default: () => new Date(Date.now() + 90 * 24 * 60 * 60 * 1000),
    },

    // 访问控制
    accessCode: String,
    viewCount: { type: Number, default: 0 },

    generatedAt: Date,
  },
  {
    timestamps: true,
  }
)

// 索引
DeliveryReportSchema.index({ deliverySessionId: 1, type: 1 })
DeliveryReportSchema.index({ projectId: 1, createdAt: -1 })
DeliveryReportSchema.index({ accessCode: 1 })
DeliveryReportSchema.index({ expiresAt: 1 })

// 静态方法：根据访问码获取报告
DeliveryReportSchema.statics.getByAccessCode = async function (
  accessCode: string
): Promise<IDeliveryReport | null> {
  return this.findOne({
    accessCode,
    expiresAt: { $gt: new Date() },
  })
}

// 静态方法：获取项目的所有报告
DeliveryReportSchema.statics.getByProject = async function (
  projectId: Types.ObjectId
): Promise<IDeliveryReport[]> {
  return this.find({ projectId }).sort({ createdAt: -1 })
}

// 实例方法：记录查看
DeliveryReportSchema.methods.recordView = async function (): Promise<void> {
  this.viewCount += 1
  if (this.status === 'sent') {
    this.status = 'viewed'
  }
  await this.save()
}

// 实例方法：记录发送
DeliveryReportSchema.methods.recordSent = async function (
  channel: 'email' | 'sms' | 'download',
  sentTo: string
): Promise<void> {
  if (!this.sentHistory) this.sentHistory = []
  this.sentHistory.push({
    channel,
    sentTo,
    sentAt: new Date(),
    opened: false,
  })
  if (this.status === 'generated') {
    this.status = 'sent'
  }
  await this.save()
}

// 实例方法：生成访问码
DeliveryReportSchema.methods.generateAccessCode = async function (): Promise<string> {
  const code = `DR${Date.now().toString(36).toUpperCase()}${Math.random().toString(36).substr(2, 6).toUpperCase()}`
  this.accessCode = code
  await this.save()
  return code
}

export interface IDeliveryReportModel extends Model<IDeliveryReport> {
  getByAccessCode(accessCode: string): Promise<IDeliveryReport | null>
  getByProject(projectId: Types.ObjectId): Promise<IDeliveryReport[]>
}

const DeliveryReport: IDeliveryReportModel =
  (mongoose.models.DeliveryReport as IDeliveryReportModel) ||
  mongoose.model<IDeliveryReport, IDeliveryReportModel>('DeliveryReport', DeliveryReportSchema)

export { DeliveryReport }
export default DeliveryReport
