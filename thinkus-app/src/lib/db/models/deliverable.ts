import mongoose, { Document, Schema, Model } from 'mongoose'
import { type AgentId } from '@/lib/config/executives'

// 交付物类型
export type DeliverableType =
  | 'document'      // 文档
  | 'design'        // 设计稿
  | 'code'          // 代码
  | 'report'        // 报告
  | 'prototype'     // 原型
  | 'api'           // API文档
  | 'asset'         // 资产文件
  | 'other'         // 其他

// 交付物状态
export type DeliverableStatus =
  | 'draft'         // 草稿
  | 'pending_review' // 待审核
  | 'approved'      // 已批准
  | 'rejected'      // 已拒绝
  | 'revision'      // 需修改
  | 'delivered'     // 已交付

// 版本记录
export interface DeliverableVersion {
  version: string
  content?: string
  fileUrl?: string
  fileMeta?: {
    name: string
    size: number
    type: string
  }
  changes: string
  createdBy: AgentId | 'user'
  createdAt: Date
}

// Deliverable接口
export interface IDeliverable extends Document {
  _id: mongoose.Types.ObjectId
  userId: mongoose.Types.ObjectId
  projectId: mongoose.Types.ObjectId
  discussionId?: mongoose.Types.ObjectId

  // 基本信息
  name: string
  description?: string
  type: DeliverableType
  status: DeliverableStatus

  // 内容
  content?: string          // 文本内容（文档/代码等）
  fileUrl?: string          // 文件URL
  fileMeta?: {
    name: string
    size: number
    type: string
  }

  // 版本管理
  currentVersion: string
  versions: DeliverableVersion[]

  // 负责人和审核
  createdBy: AgentId | 'user'
  reviewedBy?: AgentId | 'user'
  reviewNotes?: string
  reviewedAt?: Date

  // 优先级和截止日期
  priority: 'high' | 'medium' | 'low'
  dueDate?: Date

  // 标签
  tags?: string[]

  createdAt: Date
  updatedAt: Date
}

// Deliverable Schema
const deliverableSchema = new Schema<IDeliverable>(
  {
    userId: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    projectId: {
      type: Schema.Types.ObjectId,
      ref: 'Project',
      required: true,
      index: true,
    },
    discussionId: {
      type: Schema.Types.ObjectId,
      ref: 'Discussion',
    },
    name: {
      type: String,
      required: true,
    },
    description: String,
    type: {
      type: String,
      enum: ['document', 'design', 'code', 'report', 'prototype', 'api', 'asset', 'other'],
      required: true,
      index: true,
    },
    status: {
      type: String,
      enum: ['draft', 'pending_review', 'approved', 'rejected', 'revision', 'delivered'],
      default: 'draft',
      index: true,
    },
    content: String,
    fileUrl: String,
    fileMeta: {
      name: String,
      size: Number,
      type: String,
    },
    currentVersion: {
      type: String,
      default: '1.0.0',
    },
    versions: [{
      version: { type: String, required: true },
      content: String,
      fileUrl: String,
      fileMeta: {
        name: String,
        size: Number,
        type: String,
      },
      changes: { type: String, required: true },
      createdBy: { type: String, required: true },
      createdAt: { type: Date, default: Date.now },
    }],
    createdBy: {
      type: String,
      required: true,
    },
    reviewedBy: String,
    reviewNotes: String,
    reviewedAt: Date,
    priority: {
      type: String,
      enum: ['high', 'medium', 'low'],
      default: 'medium',
    },
    dueDate: Date,
    tags: [String],
  },
  {
    timestamps: true,
    collection: 'deliverables',
  }
)

// 索引
deliverableSchema.index({ userId: 1, projectId: 1 })
deliverableSchema.index({ projectId: 1, type: 1 })
deliverableSchema.index({ projectId: 1, status: 1 })

// 静态方法: 获取项目交付物
deliverableSchema.statics.getProjectDeliverables = async function(
  projectId: mongoose.Types.ObjectId,
  options: {
    type?: DeliverableType
    status?: DeliverableStatus
    limit?: number
  } = {}
): Promise<IDeliverable[]> {
  const { type, status, limit = 50 } = options

  const query: Record<string, unknown> = { projectId }
  if (type) query.type = type
  if (status) query.status = status

  return this.find(query)
    .sort({ priority: -1, createdAt: -1 })
    .limit(limit)
}

// 静态方法: 添加新版本
deliverableSchema.statics.addVersion = async function(
  deliverableId: mongoose.Types.ObjectId,
  version: Omit<DeliverableVersion, 'createdAt'>
): Promise<IDeliverable | null> {
  return this.findByIdAndUpdate(
    deliverableId,
    {
      $push: {
        versions: {
          ...version,
          createdAt: new Date(),
        },
      },
      $set: {
        currentVersion: version.version,
        content: version.content,
        fileUrl: version.fileUrl,
        fileMeta: version.fileMeta,
      },
    },
    { new: true }
  )
}

// 静态方法: 更新状态
deliverableSchema.statics.updateStatus = async function(
  deliverableId: mongoose.Types.ObjectId,
  status: DeliverableStatus,
  reviewInfo?: {
    reviewedBy: AgentId | 'user'
    reviewNotes?: string
  }
): Promise<IDeliverable | null> {
  const update: Record<string, unknown> = { status }

  if (reviewInfo) {
    update.reviewedBy = reviewInfo.reviewedBy
    update.reviewNotes = reviewInfo.reviewNotes
    update.reviewedAt = new Date()
  }

  return this.findByIdAndUpdate(deliverableId, { $set: update }, { new: true })
}

// 静态方法: 获取交付物统计
deliverableSchema.statics.getDeliverableStats = async function(
  projectId: mongoose.Types.ObjectId
): Promise<{
  total: number
  byType: Record<DeliverableType, number>
  byStatus: Record<DeliverableStatus, number>
}> {
  const [total, byType, byStatus] = await Promise.all([
    this.countDocuments({ projectId }),
    this.aggregate([
      { $match: { projectId } },
      { $group: { _id: '$type', count: { $sum: 1 } } },
    ]),
    this.aggregate([
      { $match: { projectId } },
      { $group: { _id: '$status', count: { $sum: 1 } } },
    ]),
  ])

  const typeStats: Record<DeliverableType, number> = {
    document: 0,
    design: 0,
    code: 0,
    report: 0,
    prototype: 0,
    api: 0,
    asset: 0,
    other: 0,
  }

  const statusStats: Record<DeliverableStatus, number> = {
    draft: 0,
    pending_review: 0,
    approved: 0,
    rejected: 0,
    revision: 0,
    delivered: 0,
  }

  byType.forEach((item: { _id: DeliverableType; count: number }) => {
    typeStats[item._id] = item.count
  })

  byStatus.forEach((item: { _id: DeliverableStatus; count: number }) => {
    statusStats[item._id] = item.count
  })

  return { total, byType: typeStats, byStatus: statusStats }
}

// 模型接口扩展
export interface IDeliverableModel extends Model<IDeliverable> {
  getProjectDeliverables(
    projectId: mongoose.Types.ObjectId,
    options?: {
      type?: DeliverableType
      status?: DeliverableStatus
      limit?: number
    }
  ): Promise<IDeliverable[]>
  addVersion(
    deliverableId: mongoose.Types.ObjectId,
    version: Omit<DeliverableVersion, 'createdAt'>
  ): Promise<IDeliverable | null>
  updateStatus(
    deliverableId: mongoose.Types.ObjectId,
    status: DeliverableStatus,
    reviewInfo?: {
      reviewedBy: AgentId | 'user'
      reviewNotes?: string
    }
  ): Promise<IDeliverable | null>
  getDeliverableStats(projectId: mongoose.Types.ObjectId): Promise<{
    total: number
    byType: Record<DeliverableType, number>
    byStatus: Record<DeliverableStatus, number>
  }>
}

// 导出模型
export const Deliverable =
  (mongoose.models.Deliverable as IDeliverableModel) ||
  mongoose.model<IDeliverable, IDeliverableModel>('Deliverable', deliverableSchema)
