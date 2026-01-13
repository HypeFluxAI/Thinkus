import Anthropic from '@anthropic-ai/sdk'
import { Decision, Project, Notification, ActionItem } from '@/lib/db/models'
import { getExecutive, type AgentId } from '@/lib/config/executives'
import type { IDecision, DecisionImportance, DecisionType } from '@/lib/db/models/decision'

const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
})

/**
 * 决策风险等级
 */
export type RiskLevel = 'low' | 'medium' | 'high' | 'critical'

/**
 * 决策评估结果
 */
export interface DecisionAssessment {
  riskLevel: RiskLevel
  riskScore: number // 0-100
  requiresUserConfirmation: boolean
  autoExecutable: boolean
  estimatedImpact: {
    scope: 'minimal' | 'moderate' | 'significant' | 'transformative'
    reversibility: 'easily' | 'with_effort' | 'difficult' | 'irreversible'
    costImplication: 'none' | 'low' | 'medium' | 'high'
  }
  recommendations: string[]
  warnings: string[]
}

/**
 * 评估决策风险
 */
export async function assessDecisionRisk(
  decision: IDecision,
  projectContext?: { phase: string; budget?: number; complexity?: string }
): Promise<DecisionAssessment> {
  // 基础风险评分
  let baseScore = 0

  // 根据重要性评分
  const importanceScores: Record<DecisionImportance, number> = {
    critical: 80,
    high: 60,
    medium: 40,
    low: 20,
  }
  baseScore += importanceScores[decision.importance] || 40

  // 根据类型评分
  const typeScores: Record<DecisionType, number> = {
    business: 15,
    technical: 10,
    feature: 8,
    design: 5,
    priority: 12,
    resource: 15,
    other: 5,
  }
  baseScore += typeScores[decision.type] || 5

  // 是否有风险描述
  if (decision.risks && decision.risks.length > 0) {
    baseScore += decision.risks.length * 5
  }

  // 限制分数范围
  const riskScore = Math.min(100, Math.max(0, baseScore))

  // 确定风险等级
  let riskLevel: RiskLevel
  if (riskScore >= 80) {
    riskLevel = 'critical'
  } else if (riskScore >= 60) {
    riskLevel = 'high'
  } else if (riskScore >= 40) {
    riskLevel = 'medium'
  } else {
    riskLevel = 'low'
  }

  // 确定是否需要用户确认
  const requiresUserConfirmation =
    riskLevel === 'critical' ||
    riskLevel === 'high' ||
    decision.importance === 'critical' ||
    decision.type === 'business' ||
    decision.type === 'resource'

  // 确定是否可以自动执行
  const autoExecutable =
    !requiresUserConfirmation &&
    riskLevel === 'low' &&
    decision.importance !== 'critical' &&
    decision.importance !== 'high'

  // 评估影响范围
  const estimatedImpact = {
    scope: riskScore >= 70 ? 'transformative' as const :
           riskScore >= 50 ? 'significant' as const :
           riskScore >= 30 ? 'moderate' as const : 'minimal' as const,
    reversibility: decision.type === 'business' || decision.type === 'resource'
      ? 'difficult' as const
      : riskScore >= 60
        ? 'with_effort' as const
        : 'easily' as const,
    costImplication: decision.type === 'resource'
      ? 'high' as const
      : riskScore >= 60
        ? 'medium' as const
        : riskScore >= 30
          ? 'low' as const
          : 'none' as const,
  }

  // 生成建议
  const recommendations: string[] = []
  const warnings: string[] = []

  if (riskLevel === 'critical' || riskLevel === 'high') {
    recommendations.push('建议在执行前进行团队讨论')
    recommendations.push('考虑制定回滚计划')
  }

  if (decision.type === 'business') {
    recommendations.push('评估对业务目标的长期影响')
  }

  if (decision.type === 'technical') {
    recommendations.push('确保技术可行性和团队能力匹配')
  }

  if (decision.risks && decision.risks.length > 0) {
    warnings.push(`已识别 ${decision.risks.length} 个潜在风险点`)
  }

  if (decision.importance === 'critical' && !decision.rationale) {
    warnings.push('关键决策缺少决策依据说明')
  }

  return {
    riskLevel,
    riskScore,
    requiresUserConfirmation,
    autoExecutable,
    estimatedImpact,
    recommendations,
    warnings,
  }
}

/**
 * 使用 AI 分析决策
 */
export async function analyzeDecisionWithAI(
  decision: IDecision,
  projectName: string
): Promise<{
  analysis: string
  suggestedActions: string[]
  potentialRisks: string[]
  alternativeApproaches: string[]
}> {
  const response = await anthropic.messages.create({
    model: 'claude-sonnet-4-20250514',
    max_tokens: 1500,
    messages: [
      {
        role: 'user',
        content: `作为项目管理顾问，请分析以下决策：

项目: ${projectName}
决策标题: ${decision.title}
决策描述: ${decision.description}
决策类型: ${decision.type}
重要性: ${decision.importance}
决策依据: ${decision.rationale || '未提供'}
已知风险: ${decision.risks?.join('、') || '未识别'}

请提供：
1. 决策分析（100-150字）
2. 建议的后续行动（3-5项）
3. 潜在风险点（2-4项）
4. 可能的替代方案（2-3项）

返回JSON格式：
\`\`\`json
{
  "analysis": "...",
  "suggestedActions": ["..."],
  "potentialRisks": ["..."],
  "alternativeApproaches": ["..."]
}
\`\`\``,
      },
    ],
  })

  const content = response.content[0].type === 'text' ? response.content[0].text : ''
  const jsonMatch = content.match(/```json\s*([\s\S]*?)\s*```/)

  if (jsonMatch) {
    try {
      return JSON.parse(jsonMatch[1])
    } catch {
      // 解析失败
    }
  }

  return {
    analysis: '无法生成分析',
    suggestedActions: [],
    potentialRisks: [],
    alternativeApproaches: [],
  }
}

/**
 * 批准决策并创建行动项
 */
export async function approveDecision(
  decisionId: string,
  userId: string,
  approverName: string = 'user'
): Promise<IDecision> {
  const decision = await Decision.findById(decisionId).populate('projectId')
  if (!decision) {
    throw new Error('Decision not found')
  }

  // 更新决策状态
  decision.status = 'approved'
  decision.approvedAt = new Date()
  decision.approvedBy = decision.approvedBy || []
  if (!decision.approvedBy.includes(approverName as AgentId)) {
    decision.approvedBy.push(approverName as AgentId)
  }
  await decision.save()

  const project = decision.projectId as any

  // 发送通知
  await Notification.create({
    userId,
    type: 'decision_executed',
    title: '决策已批准',
    body: `"${decision.title}" 已被批准执行`,
    priority: decision.importance === 'critical' ? 'high' : 'normal',
    channels: ['app'],
    relatedTo: {
      type: 'decision',
      id: decision._id,
    },
    actions: [
      {
        label: '查看决策',
        url: `/projects/${project._id}/decisions`,
        primary: true,
      },
    ],
  })

  return decision
}

/**
 * 拒绝决策
 */
export async function rejectDecision(
  decisionId: string,
  userId: string,
  reason?: string
): Promise<IDecision> {
  const decision = await Decision.findById(decisionId).populate('projectId')
  if (!decision) {
    throw new Error('Decision not found')
  }

  decision.status = 'rejected'
  decision.rejectedBy = decision.rejectedBy || []
  decision.rejectedBy.push('user' as AgentId)

  if (reason) {
    decision.metadata = decision.metadata || {}
    decision.metadata.rejectionReason = reason
  }

  await decision.save()

  const project = decision.projectId as any

  // 发送通知
  await Notification.create({
    userId,
    type: 'decision_executed',
    title: '决策已拒绝',
    body: `"${decision.title}" 已被拒绝${reason ? `，原因：${reason}` : ''}`,
    priority: 'normal',
    channels: ['app'],
    relatedTo: {
      type: 'decision',
      id: decision._id,
    },
  })

  return decision
}

/**
 * 标记决策为已实施
 */
export async function implementDecision(
  decisionId: string,
  userId: string
): Promise<IDecision> {
  const decision = await Decision.findById(decisionId).populate('projectId')
  if (!decision) {
    throw new Error('Decision not found')
  }

  if (decision.status !== 'approved') {
    throw new Error('Only approved decisions can be implemented')
  }

  decision.status = 'implemented'
  decision.implementedAt = new Date()
  await decision.save()

  const project = decision.projectId as any

  // 发送通知
  await Notification.create({
    userId,
    type: 'decision_executed',
    title: '决策已实施',
    body: `"${decision.title}" 已完成实施`,
    priority: 'normal',
    channels: ['app'],
    relatedTo: {
      type: 'decision',
      id: decision._id,
    },
  })

  return decision
}

/**
 * 获取用户待确认的决策
 */
export async function getPendingDecisions(
  userId: string,
  options: { limit?: number; projectId?: string } = {}
): Promise<{
  decisions: IDecision[]
  byImportance: Record<DecisionImportance, number>
}> {
  const { limit = 20, projectId } = options

  const query: Record<string, unknown> = {
    userId,
    status: 'proposed',
  }

  if (projectId) {
    query.projectId = projectId
  }

  const decisions = await Decision.find(query)
    .sort({ importance: -1, createdAt: -1 })
    .limit(limit)
    .populate('projectId', 'name')
    .lean()

  // 按重要性统计
  const byImportance: Record<DecisionImportance, number> = {
    critical: 0,
    high: 0,
    medium: 0,
    low: 0,
  }

  for (const d of decisions) {
    byImportance[d.importance]++
  }

  return {
    decisions: decisions as IDecision[],
    byImportance,
  }
}

/**
 * 批量评估项目决策
 */
export async function assessProjectDecisions(
  projectId: string
): Promise<{
  totalPending: number
  criticalCount: number
  requiresAttention: IDecision[]
  autoExecutable: IDecision[]
}> {
  const decisions = await Decision.find({
    projectId,
    status: 'proposed',
  }).lean()

  const requiresAttention: IDecision[] = []
  const autoExecutable: IDecision[] = []

  for (const decision of decisions) {
    const assessment = await assessDecisionRisk(decision as IDecision)

    if (assessment.requiresUserConfirmation) {
      requiresAttention.push(decision as IDecision)
    } else if (assessment.autoExecutable) {
      autoExecutable.push(decision as IDecision)
    }
  }

  const criticalCount = decisions.filter(
    (d) => d.importance === 'critical'
  ).length

  return {
    totalPending: decisions.length,
    criticalCount,
    requiresAttention,
    autoExecutable,
  }
}

/**
 * 根据决策类型获取相关高管批准人
 */
function getRelevantApprovers(decision: IDecision): AgentId[] {
  const typeApprovers: Record<string, AgentId[]> = {
    feature: ['mike', 'elena'],
    technical: ['david', 'james'],
    design: ['elena', 'chloe'],
    business: ['lisa', 'marcus'],
    priority: ['mike', 'frank'],
    resource: ['frank', 'sarah'],
    other: ['mike'],
  }

  return typeApprovers[decision.type] || ['mike']
}

/**
 * 自动批准决策
 */
export async function autoApproveDecision(
  decision: IDecision
): Promise<IDecision> {
  // 确定批准的高管
  const approvers = getRelevantApprovers(decision)

  // 更新决策状态
  decision.status = 'approved'
  decision.approvedBy = approvers
  decision.approvedAt = new Date()
  await decision.save()

  // 发送通知
  await Notification.create({
    userId: decision.userId,
    type: 'decision_executed',
    title: '决策已自动批准',
    body: `L0/L1 级决策 "${decision.title}" 已由 ${approvers.map(a => getExecutive(a)?.nameCn || a).join('、')} 批准`,
    priority: 'normal',
    channels: ['app'],
    relatedTo: {
      type: 'decision',
      id: decision._id,
    },
  })

  return decision
}

/**
 * 生成执行计划
 */
async function generateExecutionPlan(decision: IDecision): Promise<{
  tasks: Array<{
    title: string
    description: string
    assignee: AgentId
    priority: 'high' | 'medium' | 'low'
    dueDate?: number // 天数
  }>
}> {
  const project = await Project.findById(decision.projectId)

  const response = await anthropic.messages.create({
    model: 'claude-sonnet-4-20250514',
    max_tokens: 1500,
    messages: [
      {
        role: 'user',
        content: `你是一个项目执行专家。请为以下决策生成具体的执行计划。

决策标题: ${decision.title}
决策描述: ${decision.description}
决策类型: ${decision.type}
决策重要性: ${decision.importance}
项目名称: ${project?.name || '未知'}
项目阶段: ${project?.phase || '未知'}

请生成 2-5 个具体的执行任务，每个任务包括:
- title: 任务标题 (简洁明了)
- description: 任务描述 (具体说明需要做什么)
- assignee: 负责人 ID (从以下选择: mike, elena, david, james, lisa, chloe, rachel, kevin, frank, marcus)
- priority: 优先级 (high/medium/low)
- dueDate: 截止天数 (可选，1-14)

返回 JSON 格式:
\`\`\`json
{
  "tasks": [
    {
      "title": "...",
      "description": "...",
      "assignee": "...",
      "priority": "...",
      "dueDate": 3
    }
  ]
}
\`\`\``,
      },
    ],
  })

  const content = response.content[0].type === 'text' ? response.content[0].text : ''
  const jsonMatch = content.match(/```json\s*([\s\S]*?)\s*```/)

  if (jsonMatch) {
    try {
      return JSON.parse(jsonMatch[1])
    } catch {
      // 解析失败
    }
  }

  // 默认执行计划
  return {
    tasks: [
      {
        title: `执行决策: ${decision.title}`,
        description: decision.description,
        assignee: 'mike' as AgentId,
        priority: 'medium',
        dueDate: 7,
      },
    ],
  }
}

/**
 * 自动执行决策（创建相关行动项）
 */
export async function autoExecuteDecision(decision: IDecision): Promise<IDecision> {
  // 生成执行计划
  const executionPlan = await generateExecutionPlan(decision)

  // 创建行动项
  const actionItems = await Promise.all(
    executionPlan.tasks.map((task) =>
      ActionItem.create({
        userId: decision.userId,
        projectId: decision.projectId,
        decisionId: decision._id,
        title: task.title,
        description: task.description,
        status: 'pending',
        priority: task.priority,
        assignee: task.assignee,
        assignedBy: 'system',
        dueDate: task.dueDate ? new Date(Date.now() + task.dueDate * 24 * 60 * 60 * 1000) : undefined,
        category: 'development',
      })
    )
  )

  // 更新决策状态
  decision.status = 'implemented'
  decision.implementedAt = new Date()
  decision.actionItems = actionItems.map((a) => a._id)
  await decision.save()

  // 通知用户
  await Notification.create({
    userId: decision.userId,
    type: 'decision_executed',
    title: '决策已自动执行',
    body: `决策 "${decision.title}" 已自动执行，创建了 ${actionItems.length} 个行动项`,
    priority: 'normal',
    channels: ['app'],
    relatedTo: {
      type: 'decision',
      id: decision._id,
    },
  })

  return decision
}

/**
 * 处理待处理的自动决策
 * 此函数应由 cron 任务定期调用
 */
export async function processAutoDecisions(): Promise<{
  processed: number
  approved: number
  executed: number
}> {
  let processed = 0
  let approved = 0
  let executed = 0

  // 1. 处理可自动批准的决策 (low, medium importance)
  const pendingDecisions = await Decision.find({
    status: 'proposed',
    importance: { $in: ['low', 'medium'] },
    proposedAt: { $lte: new Date(Date.now() - 5 * 60 * 1000) }, // 提议超过 5 分钟
  }).limit(20)

  for (const decision of pendingDecisions) {
    try {
      const assessment = await assessDecisionRisk(decision)
      if (!assessment.requiresUserConfirmation) {
        await autoApproveDecision(decision)
        approved++
      }
      processed++
    } catch (error) {
      console.error(`Failed to auto-approve decision ${decision._id}:`, error)
      processed++
    }
  }

  // 2. 处理可自动执行的决策
  const approvedDecisions = await Decision.find({
    status: 'approved',
    importance: { $in: ['low', 'medium'] },
    approvedAt: { $lte: new Date(Date.now() - 2 * 60 * 1000) }, // 批准超过 2 分钟
  }).limit(20)

  for (const decision of approvedDecisions) {
    try {
      const assessment = await assessDecisionRisk(decision)
      if (assessment.autoExecutable) {
        await autoExecuteDecision(decision)
        executed++
      }
      processed++
    } catch (error) {
      console.error(`Failed to auto-execute decision ${decision._id}:`, error)
      processed++
    }
  }

  return { processed, approved, executed }
}
