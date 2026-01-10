import mongoose, { Schema, Document, Model, Types } from 'mongoose'

export type ProjectStatus = 'draft' | 'discussing' | 'confirmed' | 'paid' | 'in_progress' | 'completed' | 'cancelled'
export type ProjectType = 'web' | 'mobile' | 'game' | 'desktop' | 'blockchain' | 'finance' | 'healthcare'
export type ComplexityLevel = 'L1' | 'L2' | 'L3' | 'L4' | 'L5'

export interface IProject extends Document {
  userId: Types.ObjectId
  name: string
  icon?: string
  type: ProjectType
  status: ProjectStatus
  complexity: ComplexityLevel
  requirement: {
    original: string
    clarified?: string
  }
  proposal?: {
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
  }
  progress?: {
    percentage: number
    currentStage: string
    logs: Array<{
      timestamp: Date
      message: string
      type: 'info' | 'success' | 'warning' | 'error'
    }>
  }
  deployment?: {
    url?: string
    githubRepo?: string
    vercelProjectId?: string
  }
  createdAt: Date
  updatedAt: Date
}

const ProjectSchema = new Schema<IProject>(
  {
    userId: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    name: {
      type: String,
      required: true,
      trim: true,
    },
    icon: {
      type: String,
    },
    type: {
      type: String,
      enum: ['web', 'mobile', 'game', 'desktop', 'blockchain', 'finance', 'healthcare'],
      default: 'web',
    },
    status: {
      type: String,
      enum: ['draft', 'discussing', 'confirmed', 'paid', 'in_progress', 'completed', 'cancelled'],
      default: 'draft',
    },
    complexity: {
      type: String,
      enum: ['L1', 'L2', 'L3', 'L4', 'L5'],
      default: 'L2',
    },
    requirement: {
      original: { type: String, required: true },
      clarified: { type: String },
    },
    proposal: {
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
    },
    progress: {
      percentage: { type: Number, default: 0 },
      currentStage: String,
      logs: [{
        timestamp: { type: Date, default: Date.now },
        message: String,
        type: { type: String, enum: ['info', 'success', 'warning', 'error'] },
      }],
    },
    deployment: {
      url: String,
      githubRepo: String,
      vercelProjectId: String,
    },
  },
  {
    timestamps: true,
  }
)

ProjectSchema.index({ userId: 1, createdAt: -1 })
ProjectSchema.index({ userId: 1, status: 1 })
ProjectSchema.index({ status: 1 })

const Project: Model<IProject> = mongoose.models.Project || mongoose.model<IProject>('Project', ProjectSchema)

export default Project
