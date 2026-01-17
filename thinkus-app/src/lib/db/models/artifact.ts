import mongoose, { Document, Schema, Model } from 'mongoose'

/**
 * Artifact 产物类型
 * 用于存储工具执行结果的完整内容
 */
export type ArtifactType =
  | 'code'           // 代码文件
  | 'document'       // 文档
  | 'report'         // 分析报告
  | 'design'         // 设计稿
  | 'data'           // 数据文件
  | 'config'         // 配置文件
  | 'other'          // 其他

/**
 * 存储类型
 */
export type StorageType = 'r2' | 's3' | 'local' | 'inline'

/**
 * Artifact 接口
 */
export interface IArtifact extends Document {
  _id: mongoose.Types.ObjectId
  userId: mongoose.Types.ObjectId
  projectId?: mongoose.Types.ObjectId
  sessionId: string                    // 会话ID
  toolCallId?: string                  // 触发的工具调用ID

  // 内容定位
  storageType: StorageType
  storagePath: string                  // 存储路径或内联内容
  mimeType?: string
  sizeBytes?: number

  // 压缩摘要 (Compact)
  compactSummary: string               // <500 tokens的摘要
  artifactType: ArtifactType

  // 元数据
  fileName?: string                    // 原始文件名
  metadata?: Record<string, unknown>   // 额外元数据

  // 时间戳
  createdAt: Date
  updatedAt: Date
  expiresAt?: Date                     // 过期时间

  // 实例方法
  toCompact(): ArtifactCompact
}

/**
 * Artifact Compact 格式 (注入上下文)
 */
export interface ArtifactCompact {
  ref: string                          // ART-xxx
  type: ArtifactType
  path?: string                        // 文件路径
  fileName?: string
  summary: string                      // 摘要
  size: string                         // "200行 / 4.2KB"
  locators: ArtifactLocator[]          // 支持的定位方式
}

export interface ArtifactLocator {
  type: 'lines' | 'bytes' | 'jsonpath' | 'search'
  example: string
}

// Artifact Schema
const artifactSchema = new Schema<IArtifact>(
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
      index: true,
    },
    sessionId: {
      type: String,
      required: true,
      index: true,
    },
    toolCallId: {
      type: String,
      index: true,
    },
    storageType: {
      type: String,
      enum: ['r2', 's3', 'local', 'inline'],
      required: true,
    },
    storagePath: {
      type: String,
      required: true,
    },
    mimeType: String,
    sizeBytes: Number,
    compactSummary: {
      type: String,
      required: true,
    },
    artifactType: {
      type: String,
      enum: ['code', 'document', 'report', 'design', 'data', 'config', 'other'],
      required: true,
    },
    fileName: String,
    metadata: {
      type: Schema.Types.Mixed,
    },
    expiresAt: Date,
  },
  {
    timestamps: true,
    collection: 'artifacts',
  }
)

// 索引
artifactSchema.index({ userId: 1, sessionId: 1 })
artifactSchema.index({ userId: 1, projectId: 1, createdAt: -1 })
artifactSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 })

// 静态方法: 创建 Artifact
artifactSchema.statics.createArtifact = async function (data: {
  userId: mongoose.Types.ObjectId
  projectId?: mongoose.Types.ObjectId
  sessionId: string
  toolCallId?: string
  storageType: StorageType
  storagePath: string
  mimeType?: string
  sizeBytes?: number
  compactSummary: string
  artifactType: ArtifactType
  fileName?: string
  metadata?: Record<string, unknown>
  expiresAt?: Date
}): Promise<IArtifact> {
  return this.create(data)
}

// 静态方法: 获取会话的所有 Artifact
artifactSchema.statics.getSessionArtifacts = async function (
  sessionId: string
): Promise<IArtifact[]> {
  return this.find({ sessionId }).sort({ createdAt: -1 })
}

// 静态方法: 获取项目的所有 Artifact
artifactSchema.statics.getProjectArtifacts = async function (
  userId: mongoose.Types.ObjectId,
  projectId: mongoose.Types.ObjectId,
  limit = 50
): Promise<IArtifact[]> {
  return this.find({ userId, projectId })
    .sort({ createdAt: -1 })
    .limit(limit)
}

// 静态方法: 生成 Compact 格式
artifactSchema.methods.toCompact = function (): ArtifactCompact {
  const artifact = this as IArtifact

  // 根据类型确定支持的定位方式
  const locators: ArtifactLocator[] = []

  if (artifact.artifactType === 'code' || artifact.artifactType === 'document') {
    locators.push({ type: 'lines', example: 'lines="1-50"' })
    locators.push({ type: 'search', example: 'search="function"' })
  }

  if (artifact.artifactType === 'data') {
    locators.push({ type: 'jsonpath', example: 'path="$.data[0]"' })
  }

  locators.push({ type: 'bytes', example: 'bytes="0-1000"' })

  // 格式化大小
  let sizeStr = ''
  if (artifact.sizeBytes) {
    if (artifact.sizeBytes < 1024) {
      sizeStr = `${artifact.sizeBytes}B`
    } else if (artifact.sizeBytes < 1024 * 1024) {
      sizeStr = `${(artifact.sizeBytes / 1024).toFixed(1)}KB`
    } else {
      sizeStr = `${(artifact.sizeBytes / 1024 / 1024).toFixed(1)}MB`
    }
  }

  return {
    ref: `ART-${artifact._id.toString().slice(-8).toUpperCase()}`,
    type: artifact.artifactType,
    path: artifact.storagePath,
    fileName: artifact.fileName,
    summary: artifact.compactSummary,
    size: sizeStr,
    locators,
  }
}

// 模型接口扩展
export interface IArtifactModel extends Model<IArtifact> {
  createArtifact(data: {
    userId: mongoose.Types.ObjectId
    projectId?: mongoose.Types.ObjectId
    sessionId: string
    toolCallId?: string
    storageType: StorageType
    storagePath: string
    mimeType?: string
    sizeBytes?: number
    compactSummary: string
    artifactType: ArtifactType
    fileName?: string
    metadata?: Record<string, unknown>
    expiresAt?: Date
  }): Promise<IArtifact>
  getSessionArtifacts(sessionId: string): Promise<IArtifact[]>
  getProjectArtifacts(
    userId: mongoose.Types.ObjectId,
    projectId: mongoose.Types.ObjectId,
    limit?: number
  ): Promise<IArtifact[]>
}

// 导出模型
export const Artifact =
  (mongoose.models.Artifact as IArtifactModel) ||
  mongoose.model<IArtifact, IArtifactModel>('Artifact', artifactSchema)
