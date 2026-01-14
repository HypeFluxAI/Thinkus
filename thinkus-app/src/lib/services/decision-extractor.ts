import Anthropic from '@anthropic-ai/sdk'
import mongoose from 'mongoose'
import { type AgentId, EXECUTIVES } from '@/lib/config/executives'
import { Decision, ActionItem, type IDiscussion } from '@/lib/db/models'
import type { DecisionType, DecisionImportance } from '@/lib/db/models'
import * as gemini from '@/lib/ai/gemini'

// 检查使用哪个 AI 服务
const useGemini = !process.env.ANTHROPIC_API_KEY && process.env.GOOGLE_API_KEY

const anthropic = useGemini ? null : new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
})

// 决策提取结果
interface ExtractedDecision {
  title: string
  description: string
  type: DecisionType
  importance: DecisionImportance
  proposedBy: string
  rationale?: string
  risks?: string[]
  actionItems?: Array<{
    title: string
    description?: string
    assignee: string
    priority: 'urgent' | 'high' | 'medium' | 'low'
    category: string
  }>
}

// 决策提取提示词
const DECISION_EXTRACTION_PROMPT = `分析讨论内容，提取所有决策和行动项。

## 输出格式
严格按以下JSON格式输出：
\`\`\`json
{
  "decisions": [
    {
      "title": "决策标题（简洁）",
      "description": "决策详细描述",
      "type": "feature/technical/design/business/priority/resource/other",
      "importance": "critical/high/medium/low",
      "proposedBy": "提议者的agentId或user",
      "rationale": "决策理由",
      "risks": ["潜在风险1", "潜在风险2"],
      "actionItems": [
        {
          "title": "行动项标题",
          "description": "行动项描述",
          "assignee": "负责人agentId或user",
          "priority": "urgent/high/medium/low",
          "category": "development/design/research/review/meeting/documentation/testing/deployment/other"
        }
      ]
    }
  ]
}
\`\`\`

## 决策类型说明
- feature: 功能相关决策
- technical: 技术架构决策
- design: 设计相关决策
- business: 业务策略决策
- priority: 优先级决策
- resource: 资源分配决策
- other: 其他决策

## 重要性判断
- critical: 影响项目成败的关键决策
- high: 重要但非关键的决策
- medium: 常规决策
- low: 次要决策

## 注意事项
1. 只提取明确的决策，不要推测
2. 每个决策必须有明确的结论
3. 行动项要具体可执行
4. assignee必须从讨论参与者中选择`

/**
 * 从讨论中提取决策
 */
export async function extractDecisionsFromDiscussion(
  discussion: IDiscussion
): Promise<{
  decisions: mongoose.Types.ObjectId[]
  actionItems: mongoose.Types.ObjectId[]
}> {
  const createdDecisions: mongoose.Types.ObjectId[] = []
  const createdActionItems: mongoose.Types.ObjectId[] = []

  // 构建讨论文本
  const messagesText = discussion.messages
    .map((msg: { role: string; agentId?: string; content: string }) => {
      if (msg.role === 'user') {
        return `用户: ${msg.content}`
      } else if (msg.role === 'agent' && msg.agentId) {
        const exec = EXECUTIVES[msg.agentId as AgentId]
        return `${exec?.nameCn || msg.agentId}: ${msg.content}`
      }
      return ''
    })
    .filter(Boolean)
    .join('\n\n')

  if (messagesText.length < 200) {
    // 讨论内容太短，可能没有明确决策
    return { decisions: createdDecisions, actionItems: createdActionItems }
  }

  const participantsInfo = discussion.participants
    .map((id: string) => {
      const exec = EXECUTIVES[id as AgentId]
      return `- ${id}: ${exec?.nameCn || id}`
    })
    .join('\n')

  const userPrompt = `## 讨论话题
${discussion.topic}

${discussion.context ? `## 背景\n${discussion.context}\n` : ''}
## 参与者
${participantsInfo}
- user: 用户

## 讨论记录
${messagesText}

${discussion.summary ? `## 讨论总结\n${discussion.summary}\n` : ''}
${discussion.conclusions?.length ? `## 结论\n${discussion.conclusions.join('\n')}\n` : ''}

请提取所有决策和行动项。`

  try {
    let content = ''

    if (useGemini) {
      const response = await gemini.createMessage({
        system: DECISION_EXTRACTION_PROMPT,
        max_tokens: 2048,
        temperature: 0.3,
        messages: [{ role: 'user', content: userPrompt }],
      })
      content = response.content[0]?.text || ''
    } else {
      const response = await anthropic!.messages.create({
        model: 'claude-3-5-haiku-20241022',
        max_tokens: 2048,
        temperature: 0.3,
        system: DECISION_EXTRACTION_PROMPT,
        messages: [{ role: 'user', content: userPrompt }],
      })
      content = response.content[0].type === 'text' ? response.content[0].text : ''
    }

    // 提取JSON
    const jsonMatch = content.match(/```json\s*([\s\S]*?)\s*```/)
    let parsed: { decisions: ExtractedDecision[] } = { decisions: [] }

    if (jsonMatch) {
      parsed = JSON.parse(jsonMatch[1])
    } else {
      try {
        parsed = JSON.parse(content)
      } catch {
        return { decisions: createdDecisions, actionItems: createdActionItems }
      }
    }

    // 创建决策和行动项
    for (const decision of parsed.decisions || []) {
      try {
        // 验证并修正proposedBy
        const validProposedBy = validateParticipant(
          decision.proposedBy,
          discussion.participants
        )

        // 创建决策
        const newDecision = await Decision.create({
          userId: discussion.userId,
          projectId: discussion.projectId,
          discussionId: discussion._id,
          title: decision.title,
          description: decision.description,
          type: validateDecisionType(decision.type),
          importance: validateImportance(decision.importance),
          status: 'approved', // 讨论后的决策默认已批准
          proposedBy: validProposedBy,
          approvedBy: discussion.participants,
          rationale: decision.rationale,
          risks: decision.risks,
          proposedAt: new Date(),
          approvedAt: new Date(),
        })

        createdDecisions.push(newDecision._id)

        // 创建关联的行动项
        if (decision.actionItems && decision.actionItems.length > 0) {
          for (const item of decision.actionItems) {
            const validAssignee = validateParticipant(
              item.assignee,
              discussion.participants
            )

            const newActionItem = await ActionItem.create({
              userId: discussion.userId,
              projectId: discussion.projectId,
              discussionId: discussion._id,
              decisionId: newDecision._id,
              title: item.title,
              description: item.description,
              category: validateCategory(item.category),
              priority: validatePriority(item.priority),
              status: 'pending',
              assignee: validAssignee,
              assignedBy: 'system',
            })

            createdActionItems.push(newActionItem._id)
          }
        }
      } catch (error) {
        console.error('Failed to create decision:', error)
      }
    }

    // 更新决策的行动项引用
    for (const decisionId of createdDecisions) {
      const relatedItems = createdActionItems.filter(async (itemId) => {
        const item = await ActionItem.findById(itemId)
        return item?.decisionId?.equals(decisionId)
      })

      if (relatedItems.length > 0) {
        await Decision.findByIdAndUpdate(decisionId, {
          $set: { actionItems: relatedItems },
        })
      }
    }

    return { decisions: createdDecisions, actionItems: createdActionItems }
  } catch (error) {
    console.error('Decision extraction error:', error)
    return { decisions: createdDecisions, actionItems: createdActionItems }
  }
}

/**
 * 验证参与者
 */
function validateParticipant(id: string, participants: string[]): string {
  if (id === 'user') return 'user'
  if (participants.includes(id) && EXECUTIVES[id as AgentId]) {
    return id
  }
  return participants[0] || 'user'
}

/**
 * 验证决策类型
 */
function validateDecisionType(type: string): DecisionType {
  const validTypes: DecisionType[] = [
    'feature', 'technical', 'design', 'business', 'priority', 'resource', 'other'
  ]
  return validTypes.includes(type as DecisionType) ? (type as DecisionType) : 'other'
}

/**
 * 验证重要性
 */
function validateImportance(importance: string): DecisionImportance {
  const validImportance: DecisionImportance[] = ['critical', 'high', 'medium', 'low']
  return validImportance.includes(importance as DecisionImportance)
    ? (importance as DecisionImportance)
    : 'medium'
}

/**
 * 验证优先级
 */
function validatePriority(priority: string): 'urgent' | 'high' | 'medium' | 'low' {
  const validPriorities = ['urgent', 'high', 'medium', 'low'] as const
  return validPriorities.includes(priority as typeof validPriorities[number])
    ? (priority as typeof validPriorities[number])
    : 'medium'
}

/**
 * 验证类别
 */
function validateCategory(category: string): string {
  const validCategories = [
    'development', 'design', 'research', 'review',
    'meeting', 'documentation', 'testing', 'deployment', 'other'
  ]
  return validCategories.includes(category) ? category : 'other'
}

/**
 * 获取项目决策摘要
 */
export async function getProjectDecisionSummary(
  projectId: mongoose.Types.ObjectId
): Promise<{
  totalDecisions: number
  recentDecisions: Array<{
    id: string
    title: string
    type: DecisionType
    importance: DecisionImportance
    status: string
    createdAt: Date
  }>
  actionItemStats: {
    total: number
    completed: number
    pending: number
    overdue: number
  }
}> {
  const [decisions, actionItemStats] = await Promise.all([
    Decision.find({ projectId })
      .sort({ createdAt: -1 })
      .limit(10)
      .select('title type importance status createdAt')
      .lean(),
    ActionItem.getActionItemStats(projectId),
  ])

  return {
    totalDecisions: await Decision.countDocuments({ projectId }),
    recentDecisions: decisions.map((d) => ({
      id: d._id.toString(),
      title: d.title,
      type: d.type,
      importance: d.importance,
      status: d.status,
      createdAt: d.createdAt,
    })),
    actionItemStats,
  }
}
