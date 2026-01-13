import mongoose, { Document, Schema, Model } from 'mongoose'
import { type AgentId } from '@/lib/config/executives'

/**
 * 决策记录
 */
export interface SummaryDecision {
  what: string                         // 做了什么决策
  why: string                          // 为什么这样决策
  who: string                          // 谁做的决策 (高管ID或用户)
  confidence: 'high' | 'medium' | 'low'
}

/**
 * 产物引用
 */
export interface SummaryArtifactRef {
  ref: string                          // ART-xxx
  locator: string                      // 文件路径或位置
  desc: string                         // 简短描述
}

/**
 * Session Summary 接口
 */
export interface ISessionSummary extends Document {
  _id: mongoose.Types.ObjectId
  sessionId: string                    // 会话ID (唯一)
  userId: mongoose.Types.ObjectId
  projectId?: mongoose.Types.ObjectId
  agentId?: AgentId                    // 主要参与的高管

  // 结构化内容
  goal?: string                        // 本次会话的主要目标
  constraints: string[]                // 约束条件
  decisions: SummaryDecision[]         // 决策记录
  progress: string[]                   // 完成的事项
  artifacts: SummaryArtifactRef[]      // 关联的产物
  nextActions: string[]                // 下一步行动
  risks: string[]                      // 风险项
  openQuestions: string[]              // 未解决的问题

  // 消息轨迹引用
  trajectoryStart: number              // 起始消息索引
  trajectoryEnd: number                // 结束消息索引
  messageCount: number                 // 消息总数

  // 统计信息
  tokensUsed?: number                  // 消耗的 token 数

  // 时间戳
  createdAt: Date
  updatedAt: Date
}

// Session Summary Schema
const sessionSummarySchema = new Schema<ISessionSummary>(
  {
    sessionId: {
      type: String,
      required: true,
      unique: true,
      index: true,
    },
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
    agentId: {
      type: String,
      enum: [
        'mike', 'elena', 'rachel', 'chloe',
        'david', 'james', 'kevin', 'alex',
        'lisa', 'marcus', 'nina', 'sarah',
        'frank', 'tom', 'iris',
        'nathan', 'oscar', 'victor',
      ],
    },
    goal: String,
    constraints: {
      type: [String],
      default: [],
    },
    decisions: {
      type: [{
        what: { type: String, required: true },
        why: { type: String, required: true },
        who: { type: String, required: true },
        confidence: {
          type: String,
          enum: ['high', 'medium', 'low'],
          default: 'medium',
        },
      }],
      default: [],
    },
    progress: {
      type: [String],
      default: [],
    },
    artifacts: {
      type: [{
        ref: { type: String, required: true },
        locator: { type: String, required: true },
        desc: { type: String, required: true },
      }],
      default: [],
    },
    nextActions: {
      type: [String],
      default: [],
    },
    risks: {
      type: [String],
      default: [],
    },
    openQuestions: {
      type: [String],
      default: [],
    },
    trajectoryStart: {
      type: Number,
      default: 0,
    },
    trajectoryEnd: {
      type: Number,
      default: 0,
    },
    messageCount: {
      type: Number,
      default: 0,
    },
    tokensUsed: Number,
  },
  {
    timestamps: true,
    collection: 'session_summaries',
  }
)

// 索引
sessionSummarySchema.index({ userId: 1, updatedAt: -1 })
sessionSummarySchema.index({ userId: 1, projectId: 1, updatedAt: -1 })

// 静态方法: 创建或更新会话摘要
sessionSummarySchema.statics.upsertSummary = async function (data: {
  sessionId: string
  userId: mongoose.Types.ObjectId
  projectId?: mongoose.Types.ObjectId
  agentId?: AgentId
  goal?: string
  constraints?: string[]
  decisions?: SummaryDecision[]
  progress?: string[]
  artifacts?: SummaryArtifactRef[]
  nextActions?: string[]
  risks?: string[]
  openQuestions?: string[]
  trajectoryStart?: number
  trajectoryEnd?: number
  messageCount?: number
  tokensUsed?: number
}): Promise<ISessionSummary> {
  const { sessionId, ...updateData } = data

  return this.findOneAndUpdate(
    { sessionId },
    {
      $set: updateData,
      $setOnInsert: { sessionId },
    },
    {
      upsert: true,
      new: true,
      runValidators: true,
    }
  )
}

// 静态方法: 获取最近的会话摘要
sessionSummarySchema.statics.getRecentSummaries = async function (
  userId: mongoose.Types.ObjectId,
  options: {
    projectId?: mongoose.Types.ObjectId
    limit?: number
  } = {}
): Promise<ISessionSummary[]> {
  const { projectId, limit = 5 } = options

  const query: Record<string, unknown> = { userId }
  if (projectId) query.projectId = projectId

  return this.find(query)
    .sort({ updatedAt: -1 })
    .limit(limit)
}

// 静态方法: 根据 sessionId 获取摘要
sessionSummarySchema.statics.getBySessionId = async function (
  sessionId: string
): Promise<ISessionSummary | null> {
  return this.findOne({ sessionId })
}

// 实例方法: 格式化为上下文文本
sessionSummarySchema.methods.toContextText = function (): string {
  const summary = this as ISessionSummary
  const parts: string[] = []

  if (summary.goal) {
    parts.push(`## 会话目标\n${summary.goal}`)
  }

  if (summary.constraints.length > 0) {
    parts.push(`## 约束条件\n${summary.constraints.map(c => `- ${c}`).join('\n')}`)
  }

  if (summary.decisions.length > 0) {
    const decisionLines = summary.decisions.map(d =>
      `- [${d.who}] ${d.what} (${d.confidence}置信度)\n  原因: ${d.why}`
    )
    parts.push(`## 已做决策\n${decisionLines.join('\n')}`)
  }

  if (summary.progress.length > 0) {
    parts.push(`## 已完成\n${summary.progress.map(p => `- ✅ ${p}`).join('\n')}`)
  }

  if (summary.nextActions.length > 0) {
    parts.push(`## 待处理\n${summary.nextActions.map(a => `- ⏳ ${a}`).join('\n')}`)
  }

  if (summary.openQuestions.length > 0) {
    parts.push(`## 待确认问题\n${summary.openQuestions.map(q => `- ❓ ${q}`).join('\n')}`)
  }

  if (summary.risks.length > 0) {
    parts.push(`## 风险项\n${summary.risks.map(r => `- ⚠️ ${r}`).join('\n')}`)
  }

  if (summary.artifacts.length > 0) {
    const artifactLines = summary.artifacts.map(a =>
      `- [${a.ref}] ${a.desc} (${a.locator})`
    )
    parts.push(`## 产物\n${artifactLines.join('\n')}`)
  }

  return parts.join('\n\n')
}

// 模型接口扩展
export interface ISessionSummaryModel extends Model<ISessionSummary> {
  upsertSummary(data: {
    sessionId: string
    userId: mongoose.Types.ObjectId
    projectId?: mongoose.Types.ObjectId
    agentId?: AgentId
    goal?: string
    constraints?: string[]
    decisions?: SummaryDecision[]
    progress?: string[]
    artifacts?: SummaryArtifactRef[]
    nextActions?: string[]
    risks?: string[]
    openQuestions?: string[]
    trajectoryStart?: number
    trajectoryEnd?: number
    messageCount?: number
    tokensUsed?: number
  }): Promise<ISessionSummary>
  getRecentSummaries(
    userId: mongoose.Types.ObjectId,
    options?: {
      projectId?: mongoose.Types.ObjectId
      limit?: number
    }
  ): Promise<ISessionSummary[]>
  getBySessionId(sessionId: string): Promise<ISessionSummary | null>
}

// 导出模型
export const SessionSummary =
  (mongoose.models.SessionSummary as ISessionSummaryModel) ||
  mongoose.model<ISessionSummary, ISessionSummaryModel>('SessionSummary', sessionSummarySchema)
