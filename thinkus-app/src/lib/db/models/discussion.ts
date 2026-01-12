import mongoose, { Document, Schema, Model } from 'mongoose'
import { type AgentId } from '@/lib/config/executives'

// 讨论触发方式
export type DiscussionTrigger = 'user' | 'scheduled' | 'event' | 'system'

// 讨论状态
export type DiscussionStatus = 'active' | 'concluded' | 'cancelled'

// 消息角色
export type MessageRole = 'user' | 'agent' | 'system'

// ActionItem状态
export type ActionItemStatus = 'pending' | 'in_progress' | 'completed'

// 讨论消息接口
export interface DiscussionMessage {
  id: string
  role: MessageRole
  agentId?: AgentId
  content: string
  metadata?: {
    thinking?: string
    references?: string[]
    confidence?: number
  }
  timestamp: Date
}

// ActionItem接口
export interface ActionItem {
  description: string
  assignee: AgentId
  status: ActionItemStatus
  dueDate?: Date
  completedAt?: Date
}

// Discussion 接口
export interface IDiscussion extends Document {
  _id: mongoose.Types.ObjectId
  projectId: mongoose.Types.ObjectId
  userId: mongoose.Types.ObjectId

  // 讨论主题
  topic: string
  context?: string

  // 触发方式
  trigger: DiscussionTrigger

  // 参与高管
  participants: AgentId[]

  // 消息历史
  messages: DiscussionMessage[]

  // 讨论结果
  summary?: string
  conclusions?: string[]
  actionItems?: ActionItem[]

  // 关联决策
  decisions?: mongoose.Types.ObjectId[]

  // 状态
  status: DiscussionStatus

  createdAt: Date
  concludedAt?: Date

  // 实例方法
  addMessage(message: { role: MessageRole; agentId?: AgentId; content: string; metadata?: { thinking?: string; references?: string[]; confidence?: number } }): Promise<IDiscussion>
  conclude(data: { summary: string; conclusions?: string[]; actionItems?: ActionItem[] }): Promise<IDiscussion>
  cancel(): Promise<IDiscussion>
  updateActionItemStatus(description: string, status: ActionItemStatus): Promise<IDiscussion>
}

// 消息Schema
const discussionMessageSchema = new Schema(
  {
    id: { type: String, required: true },
    role: {
      type: String,
      enum: ['user', 'agent', 'system'],
      required: true,
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
    content: { type: String, required: true },
    metadata: {
      thinking: String,
      references: [String],
      confidence: { type: Number, min: 0, max: 1 },
    },
    timestamp: { type: Date, default: Date.now },
  },
  { _id: false }
)

// ActionItem Schema
const actionItemSchema = new Schema(
  {
    description: { type: String, required: true },
    assignee: {
      type: String,
      enum: [
        'mike', 'elena', 'rachel', 'chloe',
        'david', 'james', 'kevin', 'alex',
        'lisa', 'marcus', 'nina', 'sarah',
        'frank', 'tom', 'iris',
        'nathan', 'oscar', 'victor',
      ],
      required: true,
    },
    status: {
      type: String,
      enum: ['pending', 'in_progress', 'completed'],
      default: 'pending',
    },
    dueDate: Date,
    completedAt: Date,
  },
  { _id: false }
)

// Discussion Schema
const discussionSchema = new Schema<IDiscussion>(
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
    topic: {
      type: String,
      required: true,
      maxlength: 500,
    },
    context: {
      type: String,
      maxlength: 2000,
    },
    trigger: {
      type: String,
      enum: ['user', 'scheduled', 'event', 'system'],
      default: 'user',
    },
    participants: {
      type: [String],
      enum: [
        'mike', 'elena', 'rachel', 'chloe',
        'david', 'james', 'kevin', 'alex',
        'lisa', 'marcus', 'nina', 'sarah',
        'frank', 'tom', 'iris',
        'nathan', 'oscar', 'victor',
      ],
      default: [],
    },
    messages: {
      type: [discussionMessageSchema],
      default: [],
    },
    summary: String,
    conclusions: [String],
    actionItems: {
      type: [actionItemSchema],
      default: [],
    },
    decisions: [{
      type: Schema.Types.ObjectId,
      ref: 'Decision',
    }],
    status: {
      type: String,
      enum: ['active', 'concluded', 'cancelled'],
      default: 'active',
    },
    concludedAt: Date,
  },
  {
    timestamps: true,
    collection: 'discussions',
  }
)

// 索引
discussionSchema.index({ projectId: 1, status: 1 })
discussionSchema.index({ userId: 1, createdAt: -1 })
discussionSchema.index({ projectId: 1, createdAt: -1 })

// 静态方法: 创建新讨论
discussionSchema.statics.createDiscussion = async function (data: {
  projectId: mongoose.Types.ObjectId
  userId: mongoose.Types.ObjectId
  topic: string
  context?: string
  trigger?: DiscussionTrigger
  participants: AgentId[]
}): Promise<IDiscussion> {
  return this.create({
    projectId: data.projectId,
    userId: data.userId,
    topic: data.topic,
    context: data.context,
    trigger: data.trigger || 'user',
    participants: data.participants,
    messages: [],
    status: 'active',
  })
}

// 静态方法: 获取项目的讨论列表
discussionSchema.statics.getProjectDiscussions = async function (
  projectId: mongoose.Types.ObjectId,
  options: {
    status?: DiscussionStatus
    limit?: number
    skip?: number
  } = {}
): Promise<{ discussions: IDiscussion[]; total: number }> {
  const { status, limit = 20, skip = 0 } = options

  const query: Record<string, unknown> = { projectId }
  if (status) query.status = status

  const [discussions, total] = await Promise.all([
    this.find(query).sort({ createdAt: -1 }).skip(skip).limit(limit),
    this.countDocuments(query),
  ])

  return { discussions, total }
}

// 静态方法: 获取用户最近的讨论
discussionSchema.statics.getUserRecentDiscussions = async function (
  userId: mongoose.Types.ObjectId,
  limit: number = 10
): Promise<IDiscussion[]> {
  return this.find({ userId })
    .sort({ createdAt: -1 })
    .limit(limit)
    .populate('projectId', 'name')
}

// 实例方法: 添加消息
discussionSchema.methods.addMessage = async function (message: {
  role: MessageRole
  agentId?: AgentId
  content: string
  metadata?: {
    thinking?: string
    references?: string[]
    confidence?: number
  }
}): Promise<IDiscussion> {
  const newMessage: DiscussionMessage = {
    id: `msg-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
    role: message.role,
    agentId: message.agentId,
    content: message.content,
    metadata: message.metadata,
    timestamp: new Date(),
  }

  this.messages.push(newMessage)
  return this.save()
}

// 实例方法: 结束讨论
discussionSchema.methods.conclude = async function (data: {
  summary: string
  conclusions?: string[]
  actionItems?: ActionItem[]
}): Promise<IDiscussion> {
  this.status = 'concluded'
  this.concludedAt = new Date()
  this.summary = data.summary
  this.conclusions = data.conclusions || []
  this.actionItems = data.actionItems || []
  return this.save()
}

// 实例方法: 取消讨论
discussionSchema.methods.cancel = async function (): Promise<IDiscussion> {
  this.status = 'cancelled'
  this.concludedAt = new Date()
  return this.save()
}

// 实例方法: 更新ActionItem状态
discussionSchema.methods.updateActionItemStatus = async function (
  index: number,
  status: ActionItemStatus
): Promise<IDiscussion> {
  if (this.actionItems && this.actionItems[index]) {
    this.actionItems[index].status = status
    if (status === 'completed') {
      this.actionItems[index].completedAt = new Date()
    }
  }
  return this.save()
}

// 模型接口扩展
export interface IDiscussionModel extends Model<IDiscussion> {
  createDiscussion(data: {
    projectId: mongoose.Types.ObjectId
    userId: mongoose.Types.ObjectId
    topic: string
    context?: string
    trigger?: DiscussionTrigger
    participants: AgentId[]
  }): Promise<IDiscussion>
  getProjectDiscussions(
    projectId: mongoose.Types.ObjectId,
    options?: {
      status?: DiscussionStatus
      limit?: number
      skip?: number
    }
  ): Promise<{ discussions: IDiscussion[]; total: number }>
  getUserRecentDiscussions(
    userId: mongoose.Types.ObjectId,
    limit?: number
  ): Promise<IDiscussion[]>
}

// 导出模型
export const Discussion =
  (mongoose.models.Discussion as IDiscussionModel) ||
  mongoose.model<IDiscussion, IDiscussionModel>('Discussion', discussionSchema)
