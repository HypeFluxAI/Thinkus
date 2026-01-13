import mongoose, { Document, Schema, Model } from 'mongoose'

/**
 * 经验类型
 */
export type ExperienceType =
  | 'project'       // 完整项目模板
  | 'module'        // 功能模块
  | 'component'     // UI组件
  | 'solution'      // 问题解决方案

/**
 * 项目类别
 */
export type ProjectCategory =
  | 'ecommerce'     // 电商
  | 'education'     // 教育
  | 'social'        // 社交
  | 'tool'          // 工具
  | 'saas'          // SaaS
  | 'content'       // 内容
  | 'marketplace'   // 市场
  | 'other'         // 其他

/**
 * 复杂度等级
 */
export type ComplexityLevel = 'L1' | 'L2' | 'L3' | 'L4' | 'L5'

/**
 * 代码文件
 */
export interface CodeFile {
  path: string
  content: string
  language?: string
}

/**
 * Experience 接口
 */
export interface IExperience extends Document {
  _id: mongoose.Types.ObjectId
  type: ExperienceType

  // 基本信息
  name: string
  description: string
  category: ProjectCategory
  complexity?: ComplexityLevel
  tags: string[]

  // 技术栈
  techStack: string[]

  // 功能列表
  features: string[]

  // 代码内容 (模块和组件类型)
  code?: {
    files: CodeFile[]
    dependencies: string[]
    setupInstructions?: string
  }

  // 质量指标
  quality: number              // 1-5分
  userSatisfaction?: number    // 用户满意度
  bugRate?: number             // bug率

  // 适用条件
  applicableTo?: {
    projectTypes: ProjectCategory[]
    techStacks: string[]
    minComplexity?: ComplexityLevel
    maxComplexity?: ComplexityLevel
  }

  // 向量索引
  vectorId: string             // Pinecone中的ID

  // 统计
  usageCount: number
  lastUsedAt?: Date

  // 来源
  sourceProjectId?: mongoose.Types.ObjectId
  isPublic: boolean            // 是否公开

  // 时间戳
  createdAt: Date
  updatedAt: Date
}

// Experience Schema
const experienceSchema = new Schema<IExperience>(
  {
    type: {
      type: String,
      enum: ['project', 'module', 'component', 'solution'],
      required: true,
      index: true,
    },
    name: {
      type: String,
      required: true,
    },
    description: {
      type: String,
      required: true,
    },
    category: {
      type: String,
      enum: ['ecommerce', 'education', 'social', 'tool', 'saas', 'content', 'marketplace', 'other'],
      required: true,
      index: true,
    },
    complexity: {
      type: String,
      enum: ['L1', 'L2', 'L3', 'L4', 'L5'],
    },
    tags: {
      type: [String],
      default: [],
      index: true,
    },
    techStack: {
      type: [String],
      default: [],
    },
    features: {
      type: [String],
      default: [],
    },
    code: {
      files: [{
        path: { type: String, required: true },
        content: { type: String, required: true },
        language: String,
      }],
      dependencies: [String],
      setupInstructions: String,
    },
    quality: {
      type: Number,
      min: 1,
      max: 5,
      default: 3,
    },
    userSatisfaction: {
      type: Number,
      min: 1,
      max: 5,
    },
    bugRate: Number,
    applicableTo: {
      projectTypes: [{
        type: String,
        enum: ['ecommerce', 'education', 'social', 'tool', 'saas', 'content', 'marketplace', 'other'],
      }],
      techStacks: [String],
      minComplexity: {
        type: String,
        enum: ['L1', 'L2', 'L3', 'L4', 'L5'],
      },
      maxComplexity: {
        type: String,
        enum: ['L1', 'L2', 'L3', 'L4', 'L5'],
      },
    },
    vectorId: {
      type: String,
      required: true,
      unique: true,
    },
    usageCount: {
      type: Number,
      default: 0,
    },
    lastUsedAt: Date,
    sourceProjectId: {
      type: Schema.Types.ObjectId,
      ref: 'Project',
    },
    isPublic: {
      type: Boolean,
      default: true,
    },
  },
  {
    timestamps: true,
    collection: 'experiences',
  }
)

// 索引
experienceSchema.index({ type: 1, category: 1 })
experienceSchema.index({ quality: -1, usageCount: -1 })
experienceSchema.index({ techStack: 1 })
experienceSchema.index({ tags: 1 })

// 静态方法: 创建经验
experienceSchema.statics.createExperience = async function (data: {
  type: ExperienceType
  name: string
  description: string
  category: ProjectCategory
  complexity?: ComplexityLevel
  tags?: string[]
  techStack?: string[]
  features?: string[]
  code?: {
    files: CodeFile[]
    dependencies: string[]
    setupInstructions?: string
  }
  quality?: number
  applicableTo?: {
    projectTypes: ProjectCategory[]
    techStacks: string[]
    minComplexity?: ComplexityLevel
    maxComplexity?: ComplexityLevel
  }
  vectorId: string
  sourceProjectId?: mongoose.Types.ObjectId
  isPublic?: boolean
}): Promise<IExperience> {
  return this.create({
    ...data,
    tags: data.tags || [],
    techStack: data.techStack || [],
    features: data.features || [],
    quality: data.quality || 3,
    usageCount: 0,
    isPublic: data.isPublic ?? true,
  })
}

// 静态方法: 按类型和类别查找
experienceSchema.statics.findByTypeAndCategory = async function (
  type: ExperienceType,
  category: ProjectCategory,
  options: {
    minQuality?: number
    techStack?: string[]
    limit?: number
  } = {}
): Promise<IExperience[]> {
  const { minQuality = 3, techStack, limit = 20 } = options

  const query: Record<string, unknown> = {
    type,
    category,
    quality: { $gte: minQuality },
    isPublic: true,
  }

  if (techStack && techStack.length > 0) {
    query.techStack = { $in: techStack }
  }

  return this.find(query)
    .sort({ quality: -1, usageCount: -1 })
    .limit(limit)
}

// 静态方法: 增加使用计数
experienceSchema.statics.incrementUsage = async function (
  experienceId: mongoose.Types.ObjectId
): Promise<void> {
  await this.findByIdAndUpdate(experienceId, {
    $inc: { usageCount: 1 },
    $set: { lastUsedAt: new Date() },
  })
}

// 静态方法: 获取热门经验
experienceSchema.statics.getPopular = async function (
  type?: ExperienceType,
  limit = 10
): Promise<IExperience[]> {
  const query: Record<string, unknown> = {
    quality: { $gte: 3 },
    isPublic: true,
  }

  if (type) {
    query.type = type
  }

  return this.find(query)
    .sort({ usageCount: -1, quality: -1 })
    .limit(limit)
}

// 模型接口扩展
export interface IExperienceModel extends Model<IExperience> {
  createExperience(data: {
    type: ExperienceType
    name: string
    description: string
    category: ProjectCategory
    complexity?: ComplexityLevel
    tags?: string[]
    techStack?: string[]
    features?: string[]
    code?: {
      files: CodeFile[]
      dependencies: string[]
      setupInstructions?: string
    }
    quality?: number
    applicableTo?: {
      projectTypes: ProjectCategory[]
      techStacks: string[]
      minComplexity?: ComplexityLevel
      maxComplexity?: ComplexityLevel
    }
    vectorId: string
    sourceProjectId?: mongoose.Types.ObjectId
    isPublic?: boolean
  }): Promise<IExperience>
  findByTypeAndCategory(
    type: ExperienceType,
    category: ProjectCategory,
    options?: {
      minQuality?: number
      techStack?: string[]
      limit?: number
    }
  ): Promise<IExperience[]>
  incrementUsage(experienceId: mongoose.Types.ObjectId): Promise<void>
  getPopular(type?: ExperienceType, limit?: number): Promise<IExperience[]>
}

// 导出模型
export const Experience =
  (mongoose.models.Experience as IExperienceModel) ||
  mongoose.model<IExperience, IExperienceModel>('Experience', experienceSchema)
