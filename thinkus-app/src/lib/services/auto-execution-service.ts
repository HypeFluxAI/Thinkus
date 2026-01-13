import { Decision, ActionItem, Notification, Project } from '@/lib/db/models'
import { assessDecisionRisk, approveDecision } from './decision-service'
import type { IDecision } from '@/lib/db/models/decision'
import type { IActionItem } from '@/lib/db/models/action-item'

/**
 * 自动执行配置
 */
export interface AutoExecutionConfig {
  // 是否启用自动执行
  enabled: boolean
  // 允许自动执行的最大风险等级
  maxRiskLevel: 'low' | 'medium'
  // 允许自动执行的决策类型
  allowedTypes: string[]
  // 排除的决策重要性
  excludedImportance: string[]
  // 是否发送通知
  sendNotification: boolean
}

/**
 * 默认自动执行配置
 */
export const DEFAULT_AUTO_EXECUTION_CONFIG: AutoExecutionConfig = {
  enabled: true,
  maxRiskLevel: 'low',
  allowedTypes: ['feature', 'design', 'priority'],
  excludedImportance: ['critical', 'high'],
  sendNotification: true,
}

/**
 * 自动执行结果
 */
export interface AutoExecutionResult {
  executed: number
  skipped: number
  failed: number
  details: Array<{
    decisionId: string
    title: string
    status: 'executed' | 'skipped' | 'failed'
    reason?: string
  }>
}

/**
 * 检查决策是否可以自动执行
 */
export async function canAutoExecute(
  decision: IDecision,
  config: AutoExecutionConfig = DEFAULT_AUTO_EXECUTION_CONFIG
): Promise<{ canExecute: boolean; reason?: string }> {
  if (!config.enabled) {
    return { canExecute: false, reason: '自动执行已禁用' }
  }

  // 检查决策类型
  if (!config.allowedTypes.includes(decision.type)) {
    return { canExecute: false, reason: `决策类型 ${decision.type} 不在允许列表中` }
  }

  // 检查决策重要性
  if (config.excludedImportance.includes(decision.importance)) {
    return { canExecute: false, reason: `决策重要性 ${decision.importance} 需要人工审核` }
  }

  // 评估风险
  const assessment = await assessDecisionRisk(decision)

  // 检查风险等级
  const riskLevelOrder = ['low', 'medium', 'high', 'critical']
  const maxRiskIndex = riskLevelOrder.indexOf(config.maxRiskLevel)
  const actualRiskIndex = riskLevelOrder.indexOf(assessment.riskLevel)

  if (actualRiskIndex > maxRiskIndex) {
    return {
      canExecute: false,
      reason: `风险等级 ${assessment.riskLevel} 超过允许的最大等级 ${config.maxRiskLevel}`,
    }
  }

  // 检查是否需要用户确认
  if (assessment.requiresUserConfirmation) {
    return { canExecute: false, reason: '该决策需要用户确认' }
  }

  return { canExecute: true }
}

/**
 * 自动执行单个决策
 */
export async function autoExecuteDecision(
  decisionId: string,
  userId: string,
  config: AutoExecutionConfig = DEFAULT_AUTO_EXECUTION_CONFIG
): Promise<{ success: boolean; reason?: string }> {
  const decision = await Decision.findById(decisionId)
  if (!decision) {
    return { success: false, reason: '决策不存在' }
  }

  if (decision.status !== 'proposed') {
    return { success: false, reason: '决策状态不是待审核' }
  }

  // 检查是否可以自动执行
  const checkResult = await canAutoExecute(decision, config)
  if (!checkResult.canExecute) {
    return { success: false, reason: checkResult.reason }
  }

  try {
    // 执行批准
    await approveDecision(decisionId, userId, 'auto-executor')

    // 发送通知
    if (config.sendNotification) {
      await Notification.create({
        userId: decision.userId,
        type: 'decision_executed',
        title: '决策已自动执行',
        body: `低风险决策 "${decision.title}" 已被系统自动批准`,
        priority: 'low',
        channels: ['app'],
        relatedTo: {
          type: 'decision',
          id: decision._id,
        },
      })
    }

    return { success: true }
  } catch (error) {
    console.error('Auto-execute decision error:', error)
    return {
      success: false,
      reason: error instanceof Error ? error.message : '执行失败',
    }
  }
}

/**
 * 批量自动执行决策
 */
export async function runAutoExecution(
  userId: string,
  projectId?: string,
  config: AutoExecutionConfig = DEFAULT_AUTO_EXECUTION_CONFIG
): Promise<AutoExecutionResult> {
  const result: AutoExecutionResult = {
    executed: 0,
    skipped: 0,
    failed: 0,
    details: [],
  }

  if (!config.enabled) {
    return result
  }

  // 获取待处理决策
  const query: Record<string, unknown> = {
    userId,
    status: 'proposed',
    type: { $in: config.allowedTypes },
    importance: { $nin: config.excludedImportance },
  }

  if (projectId) {
    query.projectId = projectId
  }

  const decisions = await Decision.find(query).limit(50)

  for (const decision of decisions) {
    const execResult = await autoExecuteDecision(
      decision._id.toString(),
      userId,
      config
    )

    if (execResult.success) {
      result.executed++
      result.details.push({
        decisionId: decision._id.toString(),
        title: decision.title,
        status: 'executed',
      })
    } else {
      result.skipped++
      result.details.push({
        decisionId: decision._id.toString(),
        title: decision.title,
        status: 'skipped',
        reason: execResult.reason,
      })
    }
  }

  return result
}

/**
 * 自动完成行动项
 */
export async function autoCompleteActionItems(
  userId: string,
  projectId?: string
): Promise<{ completed: number; items: string[] }> {
  // 查找已过期但标记为自动完成的行动项
  const query: Record<string, unknown> = {
    userId,
    status: { $in: ['pending', 'in_progress'] },
    category: 'auto',
    dueDate: { $lt: new Date() },
  }

  if (projectId) {
    query.projectId = projectId
  }

  const actionItems = await ActionItem.find(query).limit(20)
  const completedItems: string[] = []

  for (const item of actionItems) {
    try {
      item.status = 'completed'
      item.progress = 100
      await item.save()
      completedItems.push(item.title)
    } catch (error) {
      console.error(`Failed to auto-complete action item ${item._id}:`, error)
    }
  }

  return {
    completed: completedItems.length,
    items: completedItems,
  }
}

/**
 * 自动推进项目阶段
 */
export async function checkPhaseTransition(
  projectId: string
): Promise<{ shouldTransition: boolean; nextPhase: string | undefined; reason?: string }> {
  const project = await Project.findById(projectId)
  if (!project) {
    return { shouldTransition: false, nextPhase: undefined, reason: '项目不存在' }
  }

  // 检查当前阶段的完成条件
  const currentPhase = project.phase

  // 获取当前阶段的待办行动项
  const pendingActions = await ActionItem.countDocuments({
    projectId,
    status: { $in: ['pending', 'in_progress'] },
  })

  // 获取待确认决策
  const pendingDecisions = await Decision.countDocuments({
    projectId,
    status: 'proposed',
  })

  // 如果有待处理项目，不能自动推进
  if (pendingActions > 0 || pendingDecisions > 0) {
    return {
      shouldTransition: false,
      nextPhase: undefined,
      reason: `还有 ${pendingActions} 个行动项和 ${pendingDecisions} 个决策待处理`,
    }
  }

  // 阶段转换映射
  const phaseTransitions: Record<string, string> = {
    ideation: 'planning',
    planning: 'design',
    design: 'development',
    development: 'testing',
    testing: 'launch',
    launch: 'growth',
    growth: 'maintenance',
  }

  const nextPhase = phaseTransitions[currentPhase]
  if (!nextPhase) {
    return { shouldTransition: false, nextPhase: undefined, reason: '当前阶段没有下一阶段' }
  }

  return { shouldTransition: true, nextPhase }
}

/**
 * 运行所有自动执行任务
 */
export async function runAllAutoTasks(
  userId: string,
  projectId?: string,
  config: AutoExecutionConfig = DEFAULT_AUTO_EXECUTION_CONFIG
): Promise<{
  decisions: AutoExecutionResult
  actionItems: { completed: number; items: string[] }
  phaseCheck: { shouldTransition: boolean; nextPhase?: string }
}> {
  const decisions = await runAutoExecution(userId, projectId, config)
  const actionItems = await autoCompleteActionItems(userId, projectId)

  let phaseCheck = { shouldTransition: false, nextPhase: undefined as string | undefined }
  if (projectId) {
    phaseCheck = await checkPhaseTransition(projectId)
  }

  return {
    decisions,
    actionItems,
    phaseCheck,
  }
}
