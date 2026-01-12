import mongoose, { Schema, Document, Model, Types } from 'mongoose'
import { type ProjectPhase } from '@/lib/config/project-phases'

export type ProjectStatus = 'draft' | 'discussing' | 'confirmed' | 'pending_payment' | 'paid' | 'in_progress' | 'completed' | 'cancelled' | 'active' | 'paused' | 'archived'
export type ProjectType = 'web' | 'mobile' | 'game' | 'desktop' | 'blockchain' | 'other'
export type ComplexityLevel = 'L1' | 'L2' | 'L3' | 'L4' | 'L5'
export type DecisionLevel = 0 | 1 | 2 | 3

// 阶段历史记录
export interface PhaseHistoryEntry {
  phase: ProjectPhase
  startedAt: Date
  completedAt?: Date
}

// 项目配置
export interface ProjectConfig {
  autoRun: boolean
  notifyLevel: DecisionLevel
}

// 项目统计
export interface ProjectStats {
  totalDiscussions: number
  totalDecisions: number
  totalDeliverables: number
}

export interface IProject extends Document {
  _id: Types.ObjectId
  userId: Types.ObjectId

  // 基础信息
  name: string
  description: string
  oneLiner?: string
  icon?: string

  // 类型
  type: ProjectType
  industry?: string

  // 阶段 (v11新增)
  phase: ProjectPhase
  phaseHistory: PhaseHistoryEntry[]

  // 配置 (v11新增)
  config: ProjectConfig

  // 统计 (v11新增)
  stats: ProjectStats

  // 复杂度
  complexity: ComplexityLevel

  // 需求 (保留兼容)
  requirement?: {
    original: string
    clarified?: string
  }

  // 方案 (保留兼容)
  proposal?: {
    positioning?: string
    features: Array<{
      id: string
      name: string
      description: string
      priority: 'P0' | 'P1' | 'P2'
    }>
    techStack: {
      frontend: string[]
      backend: string[]
      database: string[]
    }
    pricing: {
      base: number
      addons: Array<{ name: string; price: number }>
      total: number
    }
    risks?: string[]
    recommendations?: string[]
  }

  // 进度 (保留兼容)
  progress?: {
    percentage: number
    currentStage: string
    logs: Array<{
      timestamp: Date
      message: string
      type: 'info' | 'success' | 'warning' | 'error'
    }>
  }

  // 部署 (保留兼容)
  deployment?: {
    url?: string
    githubRepo?: string
    vercelProjectId?: string
  }

  // 状态
  status: ProjectStatus

  createdAt: Date
  updatedAt: Date
}

// 阶段历史 Schema
const phaseHistorySchema = new Schema(
  {
    phase: {
      type: String,
      enum: ['ideation', 'definition', 'design', 'development', 'prelaunch', 'growth'],
      required: true,
    },
    startedAt: { type: Date, required: true },
    completedAt: { type: Date },
  },
  { _id: false }
)

// 项目配置 Schema
const projectConfigSchema = new Schema(
  {
    autoRun: { type: Boolean, default: false },
    notifyLevel: { type: Number, enum: [0, 1, 2, 3], default: 2 },
  },
  { _id: false }
)

// 项目统计 Schema
const projectStatsSchema = new Schema(
  {
    totalDiscussions: { type: Number, default: 0 },
    totalDecisions: { type: Number, default: 0 },
    totalDeliverables: { type: Number, default: 0 },
  },
  { _id: false }
)

const ProjectSchema = new Schema<IProject>(
  {
    userId: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    // 基础信息
    name: {
      type: String,
      required: true,
      trim: true,
    },
    description: {
      type: String,
      default: '',
    },
    oneLiner: {
      type: String,
    },
    icon: {
      type: String,
    },
    // 类型
    type: {
      type: String,
      enum: ['web', 'mobile', 'game', 'desktop', 'blockchain', 'other'],
      default: 'web',
    },
    industry: {
      type: String,
    },
    // 阶段 (v11新增)
    phase: {
      type: String,
      enum: ['ideation', 'definition', 'design', 'development', 'prelaunch', 'growth'],
      default: 'ideation',
    },
    phaseHistory: {
      type: [phaseHistorySchema],
      default: () => [{ phase: 'ideation', startedAt: new Date() }],
    },
    // 配置 (v11新增)
    config: {
      type: projectConfigSchema,
      default: () => ({ autoRun: false, notifyLevel: 2 }),
    },
    // 统计 (v11新增)
    stats: {
      type: projectStatsSchema,
      default: () => ({ totalDiscussions: 0, totalDecisions: 0, totalDeliverables: 0 }),
    },
    // 复杂度
    complexity: {
      type: String,
      enum: ['L1', 'L2', 'L3', 'L4', 'L5'],
      default: 'L2',
    },
    // 需求 (保留兼容)
    requirement: {
      original: { type: String },
      clarified: { type: String },
    },
    // 方案 (保留兼容)
    proposal: {
      positioning: String,
      features: [{
        id: String,
        name: String,
        description: String,
        priority: { type: String, enum: ['P0', 'P1', 'P2'] },
      }],
      techStack: {
        frontend: [String],
        backend: [String],
        database: [String],
      },
      pricing: {
        base: Number,
        addons: [{ name: String, price: Number }],
        total: Number,
      },
      risks: [String],
      recommendations: [String],
    },
    // 进度 (保留兼容)
    progress: {
      percentage: { type: Number, default: 0 },
      currentStage: String,
      logs: [{
        timestamp: { type: Date, default: Date.now },
        message: String,
        type: { type: String, enum: ['info', 'success', 'warning', 'error'] },
      }],
    },
    // 部署 (保留兼容)
    deployment: {
      url: String,
      githubRepo: String,
      vercelProjectId: String,
    },
    // 状态
    status: {
      type: String,
      enum: ['draft', 'discussing', 'confirmed', 'pending_payment', 'paid', 'in_progress', 'completed', 'cancelled', 'active', 'paused', 'archived'],
      default: 'draft',
    },
  },
  {
    timestamps: true,
  }
)

// 索引
ProjectSchema.index({ userId: 1, createdAt: -1 })
ProjectSchema.index({ userId: 1, status: 1 })
ProjectSchema.index({ userId: 1, phase: 1 })
ProjectSchema.index({ status: 1 })

// 静态方法: 更新阶段
ProjectSchema.statics.updatePhase = async function (
  projectId: Types.ObjectId,
  newPhase: ProjectPhase
): Promise<IProject | null> {
  const project = await this.findById(projectId)
  if (!project) return null

  // 完成当前阶段
  const currentPhaseEntry = project.phaseHistory.find(
    (h: PhaseHistoryEntry) => h.phase === project.phase && !h.completedAt
  )
  if (currentPhaseEntry) {
    currentPhaseEntry.completedAt = new Date()
  }

  // 开始新阶段
  project.phase = newPhase
  project.phaseHistory.push({
    phase: newPhase,
    startedAt: new Date(),
  })

  return project.save()
}

// 实例方法: 增加讨论计数
ProjectSchema.methods.incrementDiscussionCount = async function (): Promise<void> {
  this.stats.totalDiscussions += 1
  await this.save()
}

// 实例方法: 增加决策计数
ProjectSchema.methods.incrementDecisionCount = async function (): Promise<void> {
  this.stats.totalDecisions += 1
  await this.save()
}

// 实例方法: 增加交付物计数
ProjectSchema.methods.incrementDeliverableCount = async function (): Promise<void> {
  this.stats.totalDeliverables += 1
  await this.save()
}

const Project: Model<IProject> = mongoose.models.Project || mongoose.model<IProject>('Project', ProjectSchema)

export default Project
