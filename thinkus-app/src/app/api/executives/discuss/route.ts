import { NextRequest } from 'next/server'
import Anthropic from '@anthropic-ai/sdk'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth/options'
import {
  AI_EXECUTIVES,
  AgentId,
  ProjectPhase,
  selectParticipants,
  getTopicExperts,
  PHASE_CORE_AGENTS,
  DecisionLevel,
} from '@/lib/config/ai-executives'
import {
  buildAgentPrompt,
  getDiscussionOrchestratorPrompt,
  getAgentResponsePrompt,
  getDiscussionSummaryPrompt,
  getDecisionClassificationPrompt,
} from '@/lib/ai/executives/prompts'
import * as gemini from '@/lib/ai/gemini'
import { Project } from '@/lib/db/models/project'
import { connectDB } from '@/lib/db/connect'

// 检查使用哪个 AI 服务
const useGemini = !process.env.ANTHROPIC_API_KEY && process.env.GOOGLE_API_KEY

const anthropic = useGemini ? null : new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
})

interface ExecutiveDiscussionMessage {
  agentId: string
  content: string
  role?: 'user' | 'executive' | 'system'
  round?: number
  timestamp?: Date
}

interface ExecutiveDiscussionRequest {
  projectId?: string
  topic: string
  description?: string
  projectPhase: ProjectPhase
  maxRounds?: number
  participants?: AgentId[]
  existingHistory?: ExecutiveDiscussionMessage[]
  userMessage?: string
}

interface OrchestratorResponse {
  nextAgentId: string
  prompt: string
  shouldContinue: boolean
  reason?: string
  keyInsights?: string[]
  consensusLevel?: number
}

interface DecisionClassificationResult {
  level: DecisionLevel
  score: number
  factors: Array<{ name: string; score: number; reason: string }>
  recommendation: 'auto_execute' | 'execute_notify' | 'confirm_first' | 'critical_review'
  rationale: string
}

/**
 * POST /api/executives/discuss
 * 高管团队讨论API - 使用AI自治系统
 */
export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return new Response('Unauthorized', { status: 401 })
    }

    const body: ExecutiveDiscussionRequest = await req.json()
    const {
      projectId,
      topic,
      description,
      projectPhase = 'development',
      maxRounds = 6,
      participants: requestedParticipants,
      existingHistory = [],
      userMessage,
    } = body

    // 获取项目信息（如果有 projectId）
    let projectContext: { name: string; description: string; phase: string } | undefined
    if (projectId) {
      try {
        await connectDB()
        const project = await Project.findById(projectId)
        if (project) {
          projectContext = {
            name: project.name,
            description: project.description || topic,
            phase: project.phase || projectPhase,
          }
        }
      } catch (e) {
        console.warn('Failed to fetch project:', e)
      }
    }

    // 选择参与讨论的高管
    const participants = requestedParticipants || selectParticipants({
      phase: projectPhase,
      topic,
      maxParticipants: 5,
    })

    const encoder = new TextEncoder()

    const readable = new ReadableStream({
      async start(controller) {
        const sendEvent = (type: string, data: unknown) => {
          controller.enqueue(
            encoder.encode(`data: ${JSON.stringify({ type, ...data as object })}\n\n`)
          )
        }

        try {
          const discussionHistory: ExecutiveDiscussionMessage[] = [...existingHistory]
          let totalTokensUsed = 0
          let currentRound = existingHistory.length > 0
            ? Math.max(...existingHistory.map(m => m.round || 1))
            : 0

          // 如果用户发送了新消息
          if (userMessage) {
            currentRound++
            discussionHistory.push({
              agentId: 'user',
              content: userMessage,
              role: 'user',
              round: currentRound,
              timestamp: new Date(),
            })
            sendEvent('user_message', { content: userMessage, round: currentRound })
          }

          // 发送初始状态
          sendEvent('discussion_init', {
            topic,
            description,
            projectPhase,
            participants: participants.map(id => {
              const exec = AI_EXECUTIVES[id]
              return {
                id,
                name: exec.name,
                title: exec.title,
                category: exec.category,
              }
            }),
            maxRounds,
            currentRound,
            totalMessages: discussionHistory.length,
          })

          // 进行讨论
          let round = currentRound
          let shouldContinue = true

          while (shouldContinue && round < maxRounds) {
            round++

            sendEvent('round_start', { round })

            // 使用编排器决定谁发言
            const orchestratorResult = await getOrchestratorDecision(
              topic,
              description || '',
              participants,
              discussionHistory,
              round,
              maxRounds
            )

            sendEvent('orchestrator_decision', {
              nextAgent: orchestratorResult.nextAgentId,
              shouldContinue: orchestratorResult.shouldContinue,
              keyInsights: orchestratorResult.keyInsights,
              consensusLevel: orchestratorResult.consensusLevel,
            })

            if (!orchestratorResult.shouldContinue) {
              shouldContinue = false
              sendEvent('discussion_converging', {
                reason: orchestratorResult.reason,
                consensusLevel: orchestratorResult.consensusLevel,
              })
              break
            }

            // 获取下一位发言的高管
            const currentAgent = orchestratorResult.nextAgentId as AgentId
            const executive = AI_EXECUTIVES[currentAgent]

            if (!executive) {
              // 如果没有找到高管，选择一个默认的
              const fallbackAgent = participants[round % participants.length]
              sendEvent('expert_speaking', {
                agentId: fallbackAgent,
                agentName: AI_EXECUTIVES[fallbackAgent].name,
                round,
              })
            } else {
              sendEvent('expert_speaking', {
                agentId: currentAgent,
                agentName: executive.name,
                agentTitle: executive.title,
                round,
              })
            }

            // 构建高管的系统提示
            const systemPrompt = buildAgentPrompt({
              executive: executive || AI_EXECUTIVES[participants[0]],
              topic,
              project: projectContext,
            })

            // 构建用户提示
            const userPrompt = getAgentResponsePrompt({
              agentId: currentAgent || participants[0],
              topic,
              previousMessages: discussionHistory.map(m => ({
                agentId: m.agentId,
                content: m.content,
              })),
              orchestratorGuidance: orchestratorResult.prompt,
              projectContext,
            })

            let fullContent = ''
            let tokensUsed = 0

            // 流式生成高管回复
            if (useGemini) {
              // 使用 Gemini
              const generator = gemini.streamMessage({
                system: systemPrompt,
                max_tokens: 2048,
                temperature: 0.8,
                messages: [{ role: 'user', content: userPrompt }],
              })

              for await (const event of generator) {
                if (event.type === 'content_block_delta' && event.delta?.text) {
                  fullContent += event.delta.text
                  sendEvent('expert_message_delta', {
                    agentId: currentAgent || participants[0],
                    content: event.delta.text,
                    round,
                  })
                }
              }
              tokensUsed = Math.ceil(fullContent.length / 4) // 估算
              totalTokensUsed += tokensUsed
            } else {
              // 使用 Anthropic
              const stream = await anthropic!.messages.stream({
                model: 'claude-sonnet-4-20250514',
                max_tokens: 2048,
                temperature: 0.8,
                system: systemPrompt,
                messages: [{ role: 'user', content: userPrompt }],
              })

              for await (const event of stream) {
                if (event.type === 'content_block_delta' && event.delta.type === 'text_delta') {
                  fullContent += event.delta.text
                  sendEvent('expert_message_delta', {
                    agentId: currentAgent || participants[0],
                    content: event.delta.text,
                    round,
                  })
                }
                if (event.type === 'message_delta' && event.usage) {
                  tokensUsed = event.usage.output_tokens
                }
              }

              // 获取最终token使用量
              const finalMessage = await stream.finalMessage()
              tokensUsed = finalMessage.usage.input_tokens + finalMessage.usage.output_tokens
              totalTokensUsed += tokensUsed
            }

            // 记录消息
            discussionHistory.push({
              agentId: currentAgent || participants[0],
              content: fullContent,
              role: 'executive',
              round,
              timestamp: new Date(),
            })

            sendEvent('expert_message_complete', {
              agentId: currentAgent || participants[0],
              content: fullContent,
              round,
              tokensUsed,
            })

            sendEvent('round_complete', {
              round,
              totalTokensUsed,
            })

            // 短暂延迟，确保自然流程
            await new Promise(resolve => setTimeout(resolve, 200))
          }

          // 生成讨论总结
          sendEvent('summary_start', { totalRounds: round })

          const summaryPrompt = getDiscussionSummaryPrompt(
            discussionHistory.map(m => ({
              agentId: m.agentId,
              content: m.content,
            }))
          )

          let summaryContent = ''

          if (useGemini) {
            // 使用 Gemini
            const generator = gemini.streamMessage({
              system: '你是一个专业的讨论总结者。请分析高管团队的讨论，提取关键决策、行动项和共识。',
              max_tokens: 2048,
              temperature: 0.3,
              messages: [{ role: 'user', content: summaryPrompt }],
            })

            for await (const event of generator) {
              if (event.type === 'content_block_delta' && event.delta?.text) {
                summaryContent += event.delta.text
              }
            }
            totalTokensUsed += Math.ceil(summaryContent.length / 4)
          } else {
            // 使用 Anthropic
            const summaryStream = await anthropic!.messages.stream({
              model: 'claude-sonnet-4-20250514',
              max_tokens: 2048,
              temperature: 0.3,
              system: '你是一个专业的讨论总结者。请分析高管团队的讨论，提取关键决策、行动项和共识。',
              messages: [{ role: 'user', content: summaryPrompt }],
            })

            for await (const event of summaryStream) {
              if (event.type === 'content_block_delta' && event.delta.type === 'text_delta') {
                summaryContent += event.delta.text
              }
            }

            const summaryFinal = await summaryStream.finalMessage()
            totalTokensUsed += summaryFinal.usage.input_tokens + summaryFinal.usage.output_tokens
          }

          // 解析总结结果
          let summary = null
          const jsonMatch = summaryContent.match(/```json\s*([\s\S]*?)\s*```/)
          if (jsonMatch) {
            try {
              summary = JSON.parse(jsonMatch[1])
            } catch {
              summary = { summary: summaryContent }
            }
          } else {
            summary = { summary: summaryContent }
          }

          sendEvent('summary_complete', { summary })

          // 对讨论结果进行决策分级
          if (summary?.keyDecisions && summary.keyDecisions.length > 0) {
            sendEvent('classification_start', {})

            for (const decision of summary.keyDecisions) {
              const classification = await classifyDecision(
                decision.decision,
                topic,
                description || ''
              )

              sendEvent('decision_classified', {
                decision: decision.decision,
                classification,
              })
            }

            sendEvent('classification_complete', {})
          }

          // 完成讨论
          sendEvent('discussion_complete', {
            topic,
            participants,
            totalRounds: round,
            totalTokensUsed,
            summary,
          })

          controller.close()
        } catch (error) {
          console.error('Executive discussion error:', error)
          sendEvent('error', { message: 'Discussion failed', error: String(error) })
          controller.error(error)
        }
      },
    })

    return new Response(readable, {
      headers: {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache',
        Connection: 'keep-alive',
      },
    })
  } catch (error) {
    console.error('Executive discussion API error:', error)
    return new Response('Internal Server Error', { status: 500 })
  }
}

/**
 * 获取编排器决策
 */
async function getOrchestratorDecision(
  topic: string,
  description: string,
  participants: AgentId[],
  history: ExecutiveDiscussionMessage[],
  roundNumber: number,
  maxRounds: number
): Promise<OrchestratorResponse> {
  const prompt = getDiscussionOrchestratorPrompt({
    topic,
    participants,
    previousMessages: history.map(m => ({
      agentId: m.agentId,
      content: m.content,
    })),
    roundNumber,
  })

  const systemPrompt = `你是高管讨论的编排者。负责：
1. 决定下一个发言的高管
2. 提供发言指导
3. 判断讨论是否应该继续
4. 追踪关键洞察和共识程度

返回JSON格式的决策：
\`\`\`json
{
  "nextAgentId": "高管ID",
  "prompt": "给该高管的发言指导",
  "shouldContinue": true/false,
  "reason": "如果停止，说明原因",
  "keyInsights": ["洞察1", "洞察2"],
  "consensusLevel": 0-100
}
\`\`\``

  try {
    let content = ''

    if (useGemini) {
      const response = await gemini.createMessage({
        system: systemPrompt,
        max_tokens: 512,
        temperature: 0.5,
        messages: [{ role: 'user', content: prompt }],
      })
      content = response.content[0]?.text || ''
    } else {
      const response = await anthropic!.messages.create({
        model: 'claude-sonnet-4-20250514',
        max_tokens: 512,
        temperature: 0.5,
        system: systemPrompt,
        messages: [{ role: 'user', content: prompt }],
      })
      content = response.content[0].type === 'text' ? response.content[0].text : ''
    }
    const jsonMatch = content.match(/```json\s*([\s\S]*?)\s*```/)

    if (jsonMatch) {
      return JSON.parse(jsonMatch[1])
    }

    // 默认：继续讨论
    return {
      nextAgentId: participants[roundNumber % participants.length],
      prompt: '请根据之前的讨论继续分享你的专业见解',
      shouldContinue: roundNumber < maxRounds * 0.8,
    }
  } catch (error) {
    console.error('Orchestrator error:', error)
    return {
      nextAgentId: participants[roundNumber % participants.length],
      prompt: '请继续讨论',
      shouldContinue: roundNumber < maxRounds,
    }
  }
}

/**
 * 决策分级
 */
async function classifyDecision(
  decision: string,
  topic: string,
  context: string
): Promise<DecisionClassificationResult> {
  const prompt = getDecisionClassificationPrompt({
    title: decision,
    description: `来自关于"${topic}"的讨论。${context}`,
    category: 'discussion_outcome',
    proposedAction: decision,
  })

  try {
    let content = ''

    if (useGemini) {
      const response = await gemini.createMessage({
        system: '你是决策风险评估专家。分析决策的风险级别，返回JSON格式结果。',
        max_tokens: 512,
        temperature: 0.3,
        messages: [{ role: 'user', content: prompt }],
      })
      content = response.content[0]?.text || ''
    } else {
      const response = await anthropic!.messages.create({
        model: 'claude-sonnet-4-20250514',
        max_tokens: 512,
        temperature: 0.3,
        system: '你是决策风险评估专家。分析决策的风险级别，返回JSON格式结果。',
        messages: [{ role: 'user', content: prompt }],
      })
      content = response.content[0].type === 'text' ? response.content[0].text : ''
    }

    const jsonMatch = content.match(/```json\s*([\s\S]*?)\s*```/)

    if (jsonMatch) {
      return JSON.parse(jsonMatch[1])
    }

    // 默认：中等风险
    return {
      level: 'L1_NOTIFY',
      score: 35,
      factors: [],
      recommendation: 'execute_notify',
      rationale: '默认分类',
    }
  } catch (error) {
    console.error('Classification error:', error)
    return {
      level: 'L1_NOTIFY',
      score: 35,
      factors: [],
      recommendation: 'execute_notify',
      rationale: '分类失败，使用默认值',
    }
  }
}
