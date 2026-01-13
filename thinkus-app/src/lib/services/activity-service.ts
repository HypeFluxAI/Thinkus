import { ActivityLog, type ActivityType, type ActivityEntity } from '@/lib/db/models'
import { getExecutive, type AgentId } from '@/lib/config/executives'
import mongoose from 'mongoose'

type ObjectId = mongoose.Types.ObjectId | string

/**
 * 活动日志服务
 * 提供便捷的活动记录方法，自动记录各类系统活动
 */

interface LogOptions {
  userId: ObjectId
  projectId?: ObjectId
  entityId?: ObjectId
  description?: string
  metadata?: Record<string, unknown>
  ipAddress?: string
  userAgent?: string
}

/**
 * 记录项目创建
 */
export async function logProjectCreated(
  projectName: string,
  options: LogOptions
) {
  return ActivityLog.log({
    userId: options.userId as mongoose.Types.ObjectId,
    projectId: options.projectId as mongoose.Types.ObjectId,
    type: 'project_created',
    entity: 'project',
    entityId: options.entityId as mongoose.Types.ObjectId,
    title: `创建了项目 "${projectName}"`,
    description: options.description,
    actor: { type: 'user' },
    metadata: options.metadata,
    ipAddress: options.ipAddress,
    userAgent: options.userAgent,
  })
}

/**
 * 记录项目更新
 */
export async function logProjectUpdated(
  projectName: string,
  changes: { field: string; oldValue?: unknown; newValue?: unknown }[],
  options: LogOptions
) {
  return ActivityLog.log({
    userId: options.userId as mongoose.Types.ObjectId,
    projectId: options.projectId as mongoose.Types.ObjectId,
    type: 'project_updated',
    entity: 'project',
    entityId: options.entityId as mongoose.Types.ObjectId,
    title: `更新了项目 "${projectName}"`,
    description: options.description || `修改了 ${changes.map(c => c.field).join('、')}`,
    actor: { type: 'user' },
    changes,
    metadata: options.metadata,
    ipAddress: options.ipAddress,
    userAgent: options.userAgent,
  })
}

/**
 * 记录项目删除
 */
export async function logProjectDeleted(
  projectName: string,
  options: LogOptions
) {
  return ActivityLog.log({
    userId: options.userId as mongoose.Types.ObjectId,
    type: 'project_deleted',
    entity: 'project',
    entityId: options.entityId as mongoose.Types.ObjectId,
    title: `删除了项目 "${projectName}"`,
    description: options.description,
    actor: { type: 'user' },
    metadata: options.metadata,
    ipAddress: options.ipAddress,
    userAgent: options.userAgent,
  })
}

/**
 * 记录讨论开始
 */
export async function logDiscussionStarted(
  topic: string,
  agentIds: AgentId[],
  options: LogOptions
) {
  const agents = agentIds.map(id => getExecutive(id)?.nameCn || id).join('、')
  return ActivityLog.log({
    userId: options.userId as mongoose.Types.ObjectId,
    projectId: options.projectId as mongoose.Types.ObjectId,
    type: 'discussion_started',
    entity: 'discussion',
    entityId: options.entityId as mongoose.Types.ObjectId,
    title: `开始了讨论 "${topic}"`,
    description: `参与者: ${agents}`,
    actor: { type: 'user' },
    metadata: { ...options.metadata, participants: agentIds },
    ipAddress: options.ipAddress,
    userAgent: options.userAgent,
  })
}

/**
 * 记录讨论完成
 */
export async function logDiscussionCompleted(
  topic: string,
  summary: string,
  options: LogOptions
) {
  return ActivityLog.log({
    userId: options.userId as mongoose.Types.ObjectId,
    projectId: options.projectId as mongoose.Types.ObjectId,
    type: 'discussion_completed',
    entity: 'discussion',
    entityId: options.entityId as mongoose.Types.ObjectId,
    title: `讨论 "${topic}" 已结束`,
    description: summary.slice(0, 200),
    actor: { type: 'system' },
    metadata: options.metadata,
    ipAddress: options.ipAddress,
    userAgent: options.userAgent,
  })
}

/**
 * 记录决策提议
 */
export async function logDecisionProposed(
  title: string,
  proposedBy: AgentId | 'user',
  options: LogOptions
) {
  const proposerName = proposedBy === 'user'
    ? '用户'
    : getExecutive(proposedBy)?.nameCn || proposedBy

  return ActivityLog.log({
    userId: options.userId as mongoose.Types.ObjectId,
    projectId: options.projectId as mongoose.Types.ObjectId,
    type: 'decision_proposed',
    entity: 'decision',
    entityId: options.entityId as mongoose.Types.ObjectId,
    title: `${proposerName} 提议了决策 "${title}"`,
    description: options.description,
    actor: proposedBy === 'user'
      ? { type: 'user' }
      : { type: 'ai_executive', id: proposedBy, name: proposerName },
    metadata: options.metadata,
    ipAddress: options.ipAddress,
    userAgent: options.userAgent,
  })
}

/**
 * 记录决策批准
 */
export async function logDecisionApproved(
  title: string,
  approvedBy: (AgentId | 'user')[],
  options: LogOptions
) {
  const approvers = approvedBy.map(id =>
    id === 'user' ? '用户' : getExecutive(id as AgentId)?.nameCn || id
  ).join('、')

  return ActivityLog.log({
    userId: options.userId as mongoose.Types.ObjectId,
    projectId: options.projectId as mongoose.Types.ObjectId,
    type: 'decision_approved',
    entity: 'decision',
    entityId: options.entityId as mongoose.Types.ObjectId,
    title: `决策 "${title}" 已被批准`,
    description: `批准者: ${approvers}`,
    actor: approvedBy.includes('user')
      ? { type: 'user' }
      : { type: 'system' },
    metadata: { ...options.metadata, approvedBy },
    ipAddress: options.ipAddress,
    userAgent: options.userAgent,
  })
}

/**
 * 记录决策拒绝
 */
export async function logDecisionRejected(
  title: string,
  reason?: string,
  options?: LogOptions
) {
  if (!options) return

  return ActivityLog.log({
    userId: options.userId as mongoose.Types.ObjectId,
    projectId: options.projectId as mongoose.Types.ObjectId,
    type: 'decision_rejected',
    entity: 'decision',
    entityId: options.entityId as mongoose.Types.ObjectId,
    title: `决策 "${title}" 已被拒绝`,
    description: reason,
    actor: { type: 'user' },
    metadata: { ...options.metadata, reason },
    ipAddress: options.ipAddress,
    userAgent: options.userAgent,
  })
}

/**
 * 记录行动项创建
 */
export async function logActionCreated(
  title: string,
  assignedTo: AgentId | 'user',
  options: LogOptions
) {
  const assigneeName = assignedTo === 'user'
    ? '用户'
    : getExecutive(assignedTo)?.nameCn || assignedTo

  return ActivityLog.log({
    userId: options.userId as mongoose.Types.ObjectId,
    projectId: options.projectId as mongoose.Types.ObjectId,
    type: 'action_created',
    entity: 'action_item',
    entityId: options.entityId as mongoose.Types.ObjectId,
    title: `创建了行动项 "${title}"`,
    description: `分配给: ${assigneeName}`,
    actor: { type: 'user' },
    metadata: { ...options.metadata, assignedTo },
    ipAddress: options.ipAddress,
    userAgent: options.userAgent,
  })
}

/**
 * 记录行动项完成
 */
export async function logActionCompleted(
  title: string,
  completedBy: AgentId | 'user',
  options: LogOptions
) {
  const completerName = completedBy === 'user'
    ? '用户'
    : getExecutive(completedBy)?.nameCn || completedBy

  return ActivityLog.log({
    userId: options.userId as mongoose.Types.ObjectId,
    projectId: options.projectId as mongoose.Types.ObjectId,
    type: 'action_completed',
    entity: 'action_item',
    entityId: options.entityId as mongoose.Types.ObjectId,
    title: `行动项 "${title}" 已完成`,
    description: `完成者: ${completerName}`,
    actor: completedBy === 'user'
      ? { type: 'user' }
      : { type: 'ai_executive', id: completedBy, name: completerName },
    metadata: { ...options.metadata, completedBy },
    ipAddress: options.ipAddress,
    userAgent: options.userAgent,
  })
}

/**
 * 记录例会举行
 */
export async function logStandupHeld(
  title: string,
  participants: AgentId[],
  options: LogOptions
) {
  const participantNames = participants
    .map(id => getExecutive(id)?.nameCn || id)
    .join('、')

  return ActivityLog.log({
    userId: options.userId as mongoose.Types.ObjectId,
    projectId: options.projectId as mongoose.Types.ObjectId,
    type: 'standup_held',
    entity: 'standup',
    entityId: options.entityId as mongoose.Types.ObjectId,
    title: `举行了例会 "${title}"`,
    description: `参与者: ${participantNames}`,
    actor: { type: 'system' },
    metadata: { ...options.metadata, participants },
    ipAddress: options.ipAddress,
    userAgent: options.userAgent,
  })
}

/**
 * 记录专家咨询
 */
export async function logExpertConsulted(
  expertId: string,
  expertName: string,
  topic: string,
  options: LogOptions
) {
  return ActivityLog.log({
    userId: options.userId as mongoose.Types.ObjectId,
    projectId: options.projectId as mongoose.Types.ObjectId,
    type: 'expert_consulted',
    entity: 'expert',
    entityId: options.entityId as mongoose.Types.ObjectId,
    title: `咨询了专家 ${expertName}`,
    description: topic,
    actor: { type: 'user' },
    metadata: { ...options.metadata, expertId, expertName },
    ipAddress: options.ipAddress,
    userAgent: options.userAgent,
  })
}

/**
 * 记录支付
 */
export async function logPaymentMade(
  amount: number,
  planName: string,
  options: LogOptions
) {
  return ActivityLog.log({
    userId: options.userId as mongoose.Types.ObjectId,
    type: 'payment_made',
    entity: 'payment',
    entityId: options.entityId as mongoose.Types.ObjectId,
    title: `订阅了 ${planName} 计划`,
    description: `支付金额: ¥${amount}`,
    actor: { type: 'user' },
    metadata: { ...options.metadata, amount, planName },
    ipAddress: options.ipAddress,
    userAgent: options.userAgent,
  })
}

/**
 * 记录用户登录
 */
export async function logUserLogin(
  method: 'email' | 'phone' | 'google' | 'github',
  options: LogOptions
) {
  const methodNames = {
    email: '邮箱',
    phone: '手机',
    google: 'Google',
    github: 'GitHub',
  }

  return ActivityLog.log({
    userId: options.userId as mongoose.Types.ObjectId,
    type: 'user_login',
    entity: 'user',
    title: `通过${methodNames[method]}登录`,
    actor: { type: 'user' },
    metadata: { ...options.metadata, method },
    ipAddress: options.ipAddress,
    userAgent: options.userAgent,
  })
}

/**
 * 记录用户登出
 */
export async function logUserLogout(options: LogOptions) {
  return ActivityLog.log({
    userId: options.userId as mongoose.Types.ObjectId,
    type: 'user_logout',
    entity: 'user',
    title: '用户登出',
    actor: { type: 'user' },
    metadata: options.metadata,
    ipAddress: options.ipAddress,
    userAgent: options.userAgent,
  })
}

/**
 * 记录设置更新
 */
export async function logSettingsUpdated(
  settingName: string,
  changes: { field: string; oldValue?: unknown; newValue?: unknown }[],
  options: LogOptions
) {
  return ActivityLog.log({
    userId: options.userId as mongoose.Types.ObjectId,
    type: 'settings_updated',
    entity: 'user',
    title: `更新了${settingName}设置`,
    description: `修改了 ${changes.map(c => c.field).join('、')}`,
    actor: { type: 'user' },
    changes,
    metadata: options.metadata,
    ipAddress: options.ipAddress,
    userAgent: options.userAgent,
  })
}

/**
 * 批量记录活动（用于导入或批处理）
 */
export async function logBatch(
  activities: Array<{
    userId: ObjectId
    projectId?: ObjectId
    type: ActivityType
    entity: ActivityEntity
    entityId?: ObjectId
    title: string
    description?: string
    actor?: { type: 'user' | 'ai_executive' | 'system'; id?: string; name?: string }
    metadata?: Record<string, unknown>
  }>
) {
  return ActivityLog.insertMany(activities)
}
