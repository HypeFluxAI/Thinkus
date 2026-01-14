import Anthropic from '@anthropic-ai/sdk'
import { EXECUTIVES, type AgentId } from '@/lib/config/executives'
import { type IUserExecutive } from '@/lib/db/models/user-executive'
import { buildExecutiveSystemPrompt } from './executive-prompt'
import * as gemini from '@/lib/ai/gemini'

// 检查使用哪个 AI 服务
const useGemini = !process.env.ANTHROPIC_API_KEY && process.env.GOOGLE_API_KEY

const anthropic = useGemini ? null : new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
})

// 讨论阶段
export type DiscussionStage =
  | 'opening'        // 开场
  | 'exploration'    // 探索问题
  | 'debate'         // 讨论争辩
  | 'synthesis'      // 综合意见
  | 'conclusion'     // 总结结论

// 讨论消息
export interface OrchestratorMessage {
  agentId: AgentId
  content: string
  stage: DiscussionStage
  timestamp: Date
}

// 讨论上下文
export interface DiscussionContext {
  topic: string
  context?: string
  projectName?: string
  projectPhase?: string
  participants: AgentId[]
  userExecutives?: Map<AgentId, IUserExecutive>
  messages: OrchestratorMessage[]
  currentStage: DiscussionStage
}

// 阶段配置
const STAGE_CONFIG: Record<DiscussionStage, {
  name: string
  nameCn: string
  maxRounds: number
  instruction: string
}> = {
  opening: {
    name: 'Opening',
    nameCn: '开场',
    maxRounds: 1,
    instruction: '简要介绍你对这个话题的初步看法，1-2句话即可。',
  },
  exploration: {
    name: 'Exploration',
    nameCn: '探索',
    maxRounds: 2,
    instruction: '深入分析问题，提出你专业领域的见解和可能的方案。',
  },
  debate: {
    name: 'Debate',
    nameCn: '讨论',
    maxRounds: 2,
    instruction: '回应其他高管的观点，提出你的补充或不同意见。',
  },
  synthesis: {
    name: 'Synthesis',
    nameCn: '综合',
    maxRounds: 1,
    instruction: '综合各方意见，提出可行的方案建议。',
  },
  conclusion: {
    name: 'Conclusion',
    nameCn: '总结',
    maxRounds: 1,
    instruction: '总结讨论要点，给出你的最终建议。',
  },
}

// 阶段顺序
const STAGE_ORDER: DiscussionStage[] = [
  'opening',
  'exploration',
  'debate',
  'synthesis',
  'conclusion',
]

/**
 * 获取下一个阶段
 */
export function getNextStage(currentStage: DiscussionStage): DiscussionStage | null {
  const currentIndex = STAGE_ORDER.indexOf(currentStage)
  if (currentIndex === -1 || currentIndex >= STAGE_ORDER.length - 1) {
    return null
  }
  return STAGE_ORDER[currentIndex + 1]
}

/**
 * 获取阶段配置
 */
export function getStageConfig(stage: DiscussionStage) {
  return STAGE_CONFIG[stage]
}

/**
 * 构建讨论prompt
 */
function buildDiscussionPrompt(params: {
  context: DiscussionContext
  agentId: AgentId
  stage: DiscussionStage
}): string {
  const { context, agentId, stage } = params
  const stageConfig = STAGE_CONFIG[stage]
  const executive = EXECUTIVES[agentId]

  // 构建历史消息
  const historyText = context.messages
    .slice(-10) // 只取最近10条
    .map(msg => {
      const exec = EXECUTIVES[msg.agentId]
      return `【${exec.nameCn}】(${STAGE_CONFIG[msg.stage].nameCn}阶段): ${msg.content}`
    })
    .join('\n\n')

  let prompt = `## 讨论话题
${context.topic}

${context.context ? `## 背景信息\n${context.context}\n` : ''}
## 当前阶段
${stageConfig.nameCn} - ${stageConfig.instruction}

## 参与者
${context.participants.map(id => `- ${EXECUTIVES[id].nameCn} (${EXECUTIVES[id].titleCn})`).join('\n')}

${historyText ? `## 讨论历史\n${historyText}\n` : ''}
## 你的任务
作为${executive.nameCn}，现在轮到你发言。请从你的专业角度（${executive.expertise.join('、')}）给出观点。

要求：
- 保持简洁，50-150字
- 使用第一人称
- 结合你的专业背景
- ${stageConfig.instruction}`

  return prompt
}

/**
 * 生成单个高管的发言
 */
export async function generateAgentResponse(params: {
  context: DiscussionContext
  agentId: AgentId
  stage: DiscussionStage
}): Promise<string> {
  const { context, agentId, stage } = params

  // 获取用户偏好
  const userExecutive = context.userExecutives?.get(agentId)

  // 构建系统提示词
  const systemPrompt = buildExecutiveSystemPrompt({
    agentId,
    userExecutive,
    projectContext: context.projectName ? {
      name: context.projectName,
      phase: context.projectPhase,
    } : undefined,
  })

  // 构建用户提示词
  const userPrompt = buildDiscussionPrompt({
    context,
    agentId,
    stage,
  })

  try {
    let content = ''

    if (useGemini) {
      const response = await gemini.createMessage({
        system: systemPrompt,
        max_tokens: 512,
        temperature: 0.8,
        messages: [{ role: 'user', content: userPrompt }],
      })
      content = response.content[0]?.text || ''
    } else {
      const response = await anthropic!.messages.create({
        model: 'claude-sonnet-4-20250514',
        max_tokens: 512,
        temperature: 0.8,
        system: systemPrompt,
        messages: [{ role: 'user', content: userPrompt }],
      })
      content = response.content[0].type === 'text' ? response.content[0].text : ''
    }

    return content
  } catch (error) {
    console.error(`Failed to generate response for ${agentId}:`, error)
    throw error
  }
}

/**
 * 生成单个高管的流式发言
 */
export async function* generateAgentResponseStream(params: {
  context: DiscussionContext
  agentId: AgentId
  stage: DiscussionStage
}): AsyncGenerator<string, void, unknown> {
  const { context, agentId, stage } = params

  // 获取用户偏好
  const userExecutive = context.userExecutives?.get(agentId)

  // 构建系统提示词
  const systemPrompt = buildExecutiveSystemPrompt({
    agentId,
    userExecutive,
    projectContext: context.projectName ? {
      name: context.projectName,
      phase: context.projectPhase,
    } : undefined,
  })

  // 构建用户提示词
  const userPrompt = buildDiscussionPrompt({
    context,
    agentId,
    stage,
  })

  if (useGemini) {
    const generator = gemini.streamMessage({
      system: systemPrompt,
      max_tokens: 512,
      temperature: 0.8,
      messages: [{ role: 'user', content: userPrompt }],
    })

    for await (const event of generator) {
      if (event.type === 'content_block_delta' && event.delta?.text) {
        yield event.delta.text
      }
    }
  } else {
    const stream = await anthropic!.messages.stream({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 512,
      temperature: 0.8,
      system: systemPrompt,
      messages: [{ role: 'user', content: userPrompt }],
    })

    for await (const event of stream) {
      if (event.type === 'content_block_delta' && event.delta.type === 'text_delta') {
        yield event.delta.text
      }
    }
  }
}

/**
 * 执行一轮讨论（所有参与者依次发言）
 */
export async function executeDiscussionRound(params: {
  context: DiscussionContext
  stage: DiscussionStage
  onAgentStart?: (agentId: AgentId) => void
  onAgentMessage?: (agentId: AgentId, content: string) => void
  onAgentComplete?: (agentId: AgentId, fullContent: string) => void
}): Promise<OrchestratorMessage[]> {
  const { context, stage, onAgentStart, onAgentMessage, onAgentComplete } = params
  const messages: OrchestratorMessage[] = []

  for (const agentId of context.participants) {
    onAgentStart?.(agentId)

    let fullContent = ''

    // 使用流式生成
    for await (const chunk of generateAgentResponseStream({
      context: { ...context, messages: [...context.messages, ...messages] },
      agentId,
      stage,
    })) {
      fullContent += chunk
      onAgentMessage?.(agentId, chunk)
    }

    const message: OrchestratorMessage = {
      agentId,
      content: fullContent,
      stage,
      timestamp: new Date(),
    }

    messages.push(message)
    onAgentComplete?.(agentId, fullContent)

    // 短暂延迟，模拟自然对话
    await new Promise(resolve => setTimeout(resolve, 300))
  }

  return messages
}

/**
 * 生成讨论总结
 */
export async function generateDiscussionSummary(context: DiscussionContext): Promise<{
  summary: string
  conclusions: string[]
  actionItems: Array<{
    description: string
    assignee: AgentId
    priority: 'high' | 'medium' | 'low'
  }>
}> {
  const messagesText = context.messages
    .map(msg => {
      const exec = EXECUTIVES[msg.agentId]
      return `【${exec.nameCn}】(${STAGE_CONFIG[msg.stage].nameCn}): ${msg.content}`
    })
    .join('\n\n')

  const participantsInfo = context.participants
    .map(id => `- ${id}: ${EXECUTIVES[id].nameCn} (${EXECUTIVES[id].titleCn})`)
    .join('\n')

  const systemPrompt = `你是讨论总结专家。请分析讨论内容，生成结构化总结。

## 输出格式
严格按以下JSON格式输出：
\`\`\`json
{
  "summary": "2-3句话的核心总结",
  "conclusions": ["结论1", "结论2", "结论3"],
  "actionItems": [
    {"description": "行动项描述", "assignee": "负责人agentId", "priority": "high/medium/low"}
  ]
}
\`\`\`

注意：assignee必须是参与者中的agentId`

  const userPrompt = `## 讨论话题
${context.topic}

## 参与高管
${participantsInfo}

## 讨论记录
${messagesText}

请生成结构化的讨论总结。`

  try {
    let content = ''

    if (useGemini) {
      const response = await gemini.createMessage({
        system: systemPrompt,
        max_tokens: 1024,
        temperature: 0.3,
        messages: [{ role: 'user', content: userPrompt }],
      })
      content = response.content[0]?.text || ''
    } else {
      const response = await anthropic!.messages.create({
        model: 'claude-sonnet-4-20250514',
        max_tokens: 1024,
        temperature: 0.3,
        system: systemPrompt,
        messages: [{ role: 'user', content: userPrompt }],
      })
      content = response.content[0].type === 'text' ? response.content[0].text : ''
    }

    // 提取JSON
    const jsonMatch = content.match(/```json\s*([\s\S]*?)\s*```/)
    if (jsonMatch) {
      const parsed = JSON.parse(jsonMatch[1])
      return {
        summary: parsed.summary || '讨论已完成',
        conclusions: parsed.conclusions || [],
        actionItems: (parsed.actionItems || []).map((item: {
          description: string
          assignee: string
          priority?: string
        }) => ({
          description: item.description,
          assignee: context.participants.includes(item.assignee as AgentId)
            ? item.assignee as AgentId
            : context.participants[0],
          priority: (['high', 'medium', 'low'].includes(item.priority || '')
            ? item.priority
            : 'medium') as 'high' | 'medium' | 'low',
        })),
      }
    }

    return {
      summary: '讨论已完成，请查看详细记录。',
      conclusions: [],
      actionItems: [],
    }
  } catch (error) {
    console.error('Failed to generate summary:', error)
    return {
      summary: '讨论已完成。',
      conclusions: [],
      actionItems: [],
    }
  }
}

/**
 * 确定发言顺序
 */
export function determineSpokenOrder(params: {
  participants: AgentId[]
  stage: DiscussionStage
  topic?: string
}): AgentId[] {
  const { participants, stage, topic } = params

  // 简单策略：
  // - opening阶段按参与者顺序
  // - exploration阶段按专业相关性排序
  // - debate阶段随机打乱
  // - synthesis/conclusion阶段按参与者顺序

  if (stage === 'debate') {
    // 随机打乱
    return [...participants].sort(() => Math.random() - 0.5)
  }

  return participants
}
