import { NextRequest } from 'next/server'
import Anthropic from '@anthropic-ai/sdk'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth/options'
import {
  CORE_EXPERTS,
  selectExperts,
  DiscussionPhase,
  DISCUSSION_MODES,
  DiscussionMode,
  getPhaseConfig,
  Expert,
} from '@/lib/ai/experts/config'
import {
  getExpertSystemPrompt,
  getBrainstormingPrompt,
  getSynthesizerPrompt,
  getOrchestratorPrompt,
} from '@/lib/ai/experts/prompts'
import * as gemini from '@/lib/ai/gemini'
import { calculateProjectPrice } from '@/lib/pricing/calculator'

// 检查使用哪个 AI 服务
const useGemini = !process.env.ANTHROPIC_API_KEY && process.env.GOOGLE_API_KEY

const anthropic = useGemini ? null : new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
})

interface DiscussionMessage {
  expertId: string
  content: string
  role?: 'user' | 'expert' | 'system'
  round?: number
  phase?: DiscussionPhase
  tokensUsed?: number
}

interface DiscussionRequest {
  projectId?: string
  requirement: string
  features: Array<{ name: string; description: string; priority: string }>
  mode: DiscussionMode
  projectType?: string
  complexity?: string
  // For continuing a discussion
  existingHistory?: DiscussionMessage[]
  userMessage?: string
}

interface OrchestratorResponse {
  nextExpertId: string
  prompt: string
  shouldContinue: boolean
  reason?: string
  discussionQuality?: string
  suggestedTopic?: string
  keyInsights?: string[]
  phaseSummary?: string
}

export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session) {
      return new Response('Unauthorized', { status: 401 })
    }

    const body: DiscussionRequest = await req.json()
    const {
      requirement,
      features,
      mode,
      projectType = 'web',
      complexity = 'L2',
      existingHistory = [],
      userMessage,
    } = body

    const experts = selectExperts(projectType, complexity)
    const modeConfig = DISCUSSION_MODES[mode]
    const phases = modeConfig.phases
    const targetRounds = modeConfig.targetRounds

    const encoder = new TextEncoder()

    const readable = new ReadableStream({
      async start(controller) {
        const sendEvent = (type: string, data: unknown) => {
          controller.enqueue(
            encoder.encode(`data: ${JSON.stringify({ type, ...data as object })}\n\n`)
          )
        }

        try {
          const discussionHistory: DiscussionMessage[] = [...existingHistory]
          let totalTokensUsed = existingHistory.reduce((sum, m) => sum + (m.tokensUsed || 0), 0)
          let currentRound = existingHistory.length > 0
            ? Math.max(...existingHistory.map(m => m.round || 1))
            : 0

          // If user sent a new message, add it to history
          if (userMessage) {
            currentRound++
            discussionHistory.push({
              expertId: 'user',
              content: userMessage,
              role: 'user',
              round: currentRound,
            })
            sendEvent('user_message', { content: userMessage, round: currentRound })
          }

          // Send initial state
          sendEvent('discussion_init', {
            experts: experts.map(e => ({ id: e.id, name: e.name, title: e.title, avatar: e.avatar, color: e.color })),
            mode,
            targetRounds,
            currentRound,
            totalMessages: discussionHistory.length,
          })

          // Process each phase
          for (const phaseId of phases) {
            const phaseConfig = getPhaseConfig(phaseId)
            const isBrainstorming = phaseId === 'brainstorming'

            sendEvent('phase_start', {
              phase: phaseId,
              phaseName: phaseConfig.name,
              minRounds: phaseConfig.minRounds,
              maxRounds: phaseConfig.maxRounds,
            })

            let phaseRounds = 0
            let shouldContinuePhase = true

            // Dynamic rounds for brainstorming, fixed for others
            while (shouldContinuePhase) {
              currentRound++
              phaseRounds++

              sendEvent('round_start', { round: currentRound, phaseRound: phaseRounds })

              // Use orchestrator to decide who speaks next (for brainstorming)
              let orchestratorResult: OrchestratorResponse | null = null
              let nextExperts: Expert[] = experts

              if (isBrainstorming && phaseRounds > 1) {
                // Let orchestrator decide
                orchestratorResult = await getOrchestratorDecision(
                  requirement,
                  features,
                  experts,
                  phaseId,
                  discussionHistory,
                  currentRound,
                  targetRounds
                )

                sendEvent('orchestrator_decision', {
                  shouldContinue: orchestratorResult.shouldContinue,
                  suggestedTopic: orchestratorResult.suggestedTopic,
                  keyInsights: orchestratorResult.keyInsights,
                })

                if (!orchestratorResult.shouldContinue) {
                  shouldContinuePhase = false
                  sendEvent('phase_converging', {
                    reason: orchestratorResult.reason,
                    summary: orchestratorResult.phaseSummary,
                  })
                  break
                }

                // Decide which experts speak this round
                if (orchestratorResult.nextExpertId) {
                  const nextExpert = experts.find(e => e.id === orchestratorResult!.nextExpertId)
                  if (nextExpert) {
                    nextExperts = [nextExpert]
                  }
                }
              }

              // Each selected expert speaks
              for (const expert of nextExperts) {
                sendEvent('expert_speaking', {
                  expertId: expert.id,
                  expertName: expert.name,
                  round: currentRound,
                })

                const systemPrompt = getExpertSystemPrompt(expert, phaseId, currentRound)
                let userPrompt: string

                if (isBrainstorming) {
                  userPrompt = getBrainstormingPrompt(
                    expert,
                    requirement,
                    features,
                    discussionHistory,
                    experts,
                    currentRound,
                    orchestratorResult?.prompt
                  )
                } else {
                  userPrompt = buildExpertPrompt(
                    requirement,
                    features,
                    phaseId,
                    discussionHistory,
                    experts
                  )
                }

                let fullContent = ''
                let tokensUsed = 0

                const maxTokens = isBrainstorming ? 512 : 256

                if (useGemini) {
                  // 使用 Gemini
                  const generator = gemini.streamMessage({
                    system: systemPrompt,
                    max_tokens: maxTokens,
                    temperature: isBrainstorming ? 0.9 : 0.8,
                    messages: [{ role: 'user', content: userPrompt }],
                  })

                  for await (const event of generator) {
                    if (event.type === 'content_block_delta' && event.delta?.text) {
                      fullContent += event.delta.text
                      sendEvent('expert_message_delta', {
                        expertId: expert.id,
                        content: event.delta.text,
                        round: currentRound,
                      })
                    }
                  }
                  tokensUsed = Math.ceil(fullContent.length / 4)
                  totalTokensUsed += tokensUsed
                } else {
                  // 使用 Anthropic
                  const stream = await anthropic!.messages.stream({
                    model: 'claude-sonnet-4-20250514',
                    max_tokens: maxTokens,
                    temperature: isBrainstorming ? 0.9 : 0.8,
                    system: systemPrompt,
                    messages: [{ role: 'user', content: userPrompt }],
                  })

                  for await (const event of stream) {
                    if (event.type === 'content_block_delta' && event.delta.type === 'text_delta') {
                      fullContent += event.delta.text
                      sendEvent('expert_message_delta', {
                        expertId: expert.id,
                        content: event.delta.text,
                        round: currentRound,
                      })
                    }
                    if (event.type === 'message_delta' && event.usage) {
                      tokensUsed = event.usage.output_tokens
                    }
                  }

                  // Get final token usage
                  const finalMessage = await stream.finalMessage()
                  tokensUsed = finalMessage.usage.input_tokens + finalMessage.usage.output_tokens
                  totalTokensUsed += tokensUsed
                }

                discussionHistory.push({
                  expertId: expert.id,
                  content: fullContent,
                  role: 'expert',
                  round: currentRound,
                  phase: phaseId,
                  tokensUsed,
                })

                sendEvent('expert_message_complete', {
                  expertId: expert.id,
                  content: fullContent,
                  round: currentRound,
                  tokensUsed,
                  totalTokensUsed,
                })

                // Small delay between experts for natural flow
                await new Promise(resolve => setTimeout(resolve, 300))
              }

              sendEvent('round_complete', {
                round: currentRound,
                phaseRound: phaseRounds,
                totalTokensUsed,
              })

              // Check if phase should continue
              if (!isBrainstorming) {
                // For non-brainstorming phases, use maxRounds
                if (phaseRounds >= phaseConfig.maxRounds) {
                  shouldContinuePhase = false
                }
              } else {
                // For brainstorming, check if we've reached target rounds
                if (phaseRounds >= phaseConfig.maxRounds) {
                  shouldContinuePhase = false
                }
                // Also stop if orchestrator says to
                if (orchestratorResult && !orchestratorResult.shouldContinue) {
                  shouldContinuePhase = false
                }
              }
            }

            sendEvent('phase_complete', {
              phase: phaseId,
              rounds: phaseRounds,
              totalTokensUsed,
            })
          }

          // Generate final synthesis
          sendEvent('synthesis_start', { totalRounds: currentRound })

          const synthesisPrompt = getSynthesizerPrompt(
            requirement,
            features,
            discussionHistory,
            experts,
            totalTokensUsed
          )

          let synthesisContent = ''
          let synthesisTokens = 0

          if (useGemini) {
            // 使用 Gemini
            const generator = gemini.streamMessage({
              system: '你是一个专业的产品方案整理者。请根据专家讨论结果生成结构化的产品方案。',
              max_tokens: 4096,
              temperature: 0.3,
              messages: [{ role: 'user', content: synthesisPrompt }],
            })

            for await (const event of generator) {
              if (event.type === 'content_block_delta' && event.delta?.text) {
                synthesisContent += event.delta.text
                sendEvent('synthesis_delta', { content: event.delta.text })
              }
            }
            synthesisTokens = Math.ceil(synthesisContent.length / 4)
            totalTokensUsed += synthesisTokens
          } else {
            // 使用 Anthropic
            const synthesisStream = await anthropic!.messages.stream({
              model: 'claude-sonnet-4-20250514',
              max_tokens: 4096,
              temperature: 0.3,
              system: '你是一个专业的产品方案整理者。请根据专家讨论结果生成结构化的产品方案。',
              messages: [{ role: 'user', content: synthesisPrompt }],
            })

            for await (const event of synthesisStream) {
              if (event.type === 'content_block_delta' && event.delta.type === 'text_delta') {
                synthesisContent += event.delta.text
                sendEvent('synthesis_delta', { content: event.delta.text })
              }
            }

            const synthesisFinal = await synthesisStream.finalMessage()
            synthesisTokens = synthesisFinal.usage.input_tokens + synthesisFinal.usage.output_tokens
            totalTokensUsed += synthesisTokens
          }

          // Extract JSON from synthesis with improved error handling
          let proposal = null
          let jsonExtractError = null

          // 尝试多种方式提取 JSON
          const jsonMatch = synthesisContent.match(/```json\s*([\s\S]*?)\s*```/)
          let jsonString = jsonMatch ? jsonMatch[1] : null

          // 如果没有找到 ```json``` 块，尝试找纯 JSON 对象
          if (!jsonString) {
            const jsonObjectMatch = synthesisContent.match(/\{[\s\S]*"projectName"[\s\S]*"features"[\s\S]*\}/)
            if (jsonObjectMatch) {
              jsonString = jsonObjectMatch[0]
            }
          }

          if (jsonString) {
            try {
              // 清理可能的问题字符
              jsonString = jsonString
                .replace(/[\x00-\x1F\x7F]/g, '') // 移除控制字符
                .replace(/,\s*([}\]])/g, '$1') // 移除尾随逗号
                .trim()

              proposal = JSON.parse(jsonString)

              // 确保 features 数组存在且格式正确
              if (!proposal.features || !Array.isArray(proposal.features)) {
                console.warn('[Discuss API] proposal.features is missing or invalid, using original features')
                proposal.features = features.map((f, index) => ({
                  id: `feature-${Date.now()}-${index}`,
                  name: f.name,
                  description: f.description,
                  priority: f.priority || 'P1',
                  approved: true,
                }))
              } else {
                // 确保每个 feature 有必要的字段
                proposal.features = proposal.features.map((f: any, index: number) => ({
                  id: f.id || `feature-${Date.now()}-${index}`,
                  name: f.name || `功能${index + 1}`,
                  description: f.description || '',
                  priority: f.priority || 'P1',
                  approved: f.approved !== false,
                  expertNotes: f.expertNotes || '',
                }))
              }

              // Calculate price based on feature token consumption
              const priceResult = calculateProjectPrice(proposal.features)
              proposal.estimatedPrice = priceResult.finalPrice
              proposal.estimatedTokens = priceResult.estimatedTokens
              proposal.tokenCost = priceResult.tokenCost
              proposal.priceBreakdown = priceResult.breakdown
              proposal.tokenUsage = totalTokensUsed
            } catch (e) {
              jsonExtractError = e
              console.error('[Discuss API] JSON parse failed:', e, '\nJSON string:', jsonString?.substring(0, 500))
            }
          } else {
            console.warn('[Discuss API] No JSON found in synthesis content')
          }

          // 如果 JSON 解析失败，使用原始功能创建基本方案
          if (!proposal) {
            console.warn('[Discuss API] Creating fallback proposal from original features')
            const priceResult = calculateProjectPrice(features)
            proposal = {
              projectName: '新项目',
              positioning: requirement.substring(0, 200),
              features: features.map((f, index) => ({
                id: `feature-${Date.now()}-${index}`,
                name: f.name,
                description: f.description,
                priority: f.priority || 'P1',
                approved: true,
              })),
              techStack: {
                frontend: ['React', 'Next.js', 'TypeScript'],
                backend: ['Node.js', 'tRPC'],
                database: ['MongoDB'],
              },
              risks: ['AI 生成的方案可能需要人工调整'],
              recommendations: ['建议与专家进一步讨论细节'],
              estimatedComplexity: 'L2',
              estimatedPrice: priceResult.finalPrice,
              estimatedTokens: priceResult.estimatedTokens,
              tokenCost: priceResult.tokenCost,
              priceBreakdown: priceResult.breakdown,
              tokenUsage: totalTokensUsed,
              _parseError: jsonExtractError?.toString(),
            }
          }

          sendEvent('synthesis_complete', {
            proposal,
            totalTokensUsed,
            synthesisTokens,
          })

          sendEvent('discussion_complete', {
            discussionHistory,
            proposal,
            totalRounds: currentRound,
            totalTokensUsed,
            estimatedCost: totalTokensUsed * 0.00001 * 2,
          })

          controller.close()
        } catch (error) {
          console.error('Discussion error:', error)
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
    console.error('Discussion API error:', error)
    return new Response('Internal Server Error', { status: 500 })
  }
}

async function getOrchestratorDecision(
  requirement: string,
  features: Array<{ name: string; description: string }>,
  experts: Expert[],
  phase: DiscussionPhase,
  history: DiscussionMessage[],
  roundNumber: number,
  targetRounds: number
): Promise<OrchestratorResponse> {
  const prompt = getOrchestratorPrompt(
    requirement,
    features,
    experts,
    phase,
    history,
    roundNumber,
    targetRounds
  )

  try {
    let content = ''

    if (useGemini) {
      const response = await gemini.createMessage({
        system: '你是讨论编排者，负责决定讨论流程。返回JSON格式的决策。',
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
        system: '你是讨论编排者，负责决定讨论流程。返回JSON格式的决策。',
        messages: [{ role: 'user', content: prompt }],
      })
      content = response.content[0].type === 'text' ? response.content[0].text : ''
    }

    const jsonMatch = content.match(/```json\s*([\s\S]*?)\s*```/)

    if (jsonMatch) {
      return JSON.parse(jsonMatch[1])
    }

    // Default: continue with first expert
    return {
      nextExpertId: experts[0].id,
      prompt: '请继续深入讨论',
      shouldContinue: roundNumber < targetRounds * 0.8, // Continue until 80% of target rounds
    }
  } catch (error) {
    console.error('Orchestrator error:', error)
    return {
      nextExpertId: experts[roundNumber % experts.length].id,
      prompt: '请继续讨论',
      shouldContinue: roundNumber < targetRounds,
    }
  }
}

function getPhaseNameChinese(phase: DiscussionPhase): string {
  const names: Record<DiscussionPhase, string> = {
    understanding: '需求理解',
    brainstorming: '头脑风暴',
    ideation: '方案构思',
    challenge: '挑战质疑',
    synthesis: '方案综合',
    validation: '最终确认',
  }
  return names[phase]
}

function buildExpertPrompt(
  requirement: string,
  features: Array<{ name: string; description: string }>,
  phase: DiscussionPhase,
  history: DiscussionMessage[],
  experts: Expert[]
): string {
  const featuresText = features.map(f => `- ${f.name}: ${f.description}`).join('\n')

  // Keep more history for context
  const recentHistory = history.slice(-12)
  const historyText = recentHistory
    .map(m => {
      if (m.role === 'user') {
        return `【用户】: ${m.content}`
      }
      const expert = experts.find(e => e.id === m.expertId)
      return `【${expert?.name}】: ${m.content}`
    })
    .join('\n\n')

  return `## 用户需求
${requirement}

## 已识别的功能
${featuresText}

${historyText ? `## 之前的讨论\n${historyText}\n` : ''}

现在轮到你发言了。请从你的专业角度，针对当前阶段（${getPhaseNameChinese(phase)}）给出你的观点。`
}
