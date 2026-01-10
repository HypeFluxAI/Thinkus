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
} from '@/lib/ai/experts/config'
import { getExpertSystemPrompt, getSynthesizerPrompt } from '@/lib/ai/experts/prompts'

const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
})

interface DiscussionRequest {
  projectId: string
  requirement: string
  features: Array<{ name: string; description: string; priority: string }>
  mode: DiscussionMode
  projectType?: string
  complexity?: string
}

export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session) {
      return new Response('Unauthorized', { status: 401 })
    }

    const body: DiscussionRequest = await req.json()
    const { requirement, features, mode, projectType = 'web', complexity = 'L2' } = body

    const experts = selectExperts(projectType, complexity)
    const modeConfig = DISCUSSION_MODES[mode]
    const phases = modeConfig.phases

    const encoder = new TextEncoder()

    const readable = new ReadableStream({
      async start(controller) {
        const sendEvent = (type: string, data: unknown) => {
          controller.enqueue(
            encoder.encode(`data: ${JSON.stringify({ type, ...data as object })}\n\n`)
          )
        }

        try {
          const discussionHistory: Array<{ expertId: string; content: string }> = []

          // Process each phase
          for (const phase of phases) {
            sendEvent('phase_start', { phase, phaseName: getPhaseNameChinese(phase) })

            // Each expert speaks in this phase
            for (const expert of experts) {
              sendEvent('expert_speaking', { expertId: expert.id, expertName: expert.name })

              const systemPrompt = getExpertSystemPrompt(expert, phase)
              const userPrompt = buildExpertPrompt(
                requirement,
                features,
                phase,
                discussionHistory,
                experts
              )

              let fullContent = ''

              const stream = await anthropic.messages.stream({
                model: 'claude-sonnet-4-20250514',
                max_tokens: 256,
                temperature: 0.8,
                system: systemPrompt,
                messages: [{ role: 'user', content: userPrompt }],
              })

              for await (const event of stream) {
                if (event.type === 'content_block_delta' && event.delta.type === 'text_delta') {
                  fullContent += event.delta.text
                  sendEvent('expert_message_delta', {
                    expertId: expert.id,
                    content: event.delta.text,
                  })
                }
              }

              discussionHistory.push({ expertId: expert.id, content: fullContent })
              sendEvent('expert_message_complete', {
                expertId: expert.id,
                content: fullContent,
              })

              // Small delay between experts for natural flow
              await new Promise(resolve => setTimeout(resolve, 500))
            }

            sendEvent('phase_complete', { phase })
          }

          // Generate final synthesis
          sendEvent('synthesis_start', {})

          const synthesisPrompt = getSynthesizerPrompt(
            requirement,
            features,
            discussionHistory,
            experts
          )

          const synthesisResponse = await anthropic.messages.create({
            model: 'claude-sonnet-4-20250514',
            max_tokens: 2048,
            system: '你是一个专业的产品方案整理者。请根据专家讨论结果生成结构化的产品方案。',
            messages: [{ role: 'user', content: synthesisPrompt }],
          })

          const synthesisContent =
            synthesisResponse.content[0].type === 'text'
              ? synthesisResponse.content[0].text
              : ''

          // Extract JSON from synthesis
          let proposal = null
          const jsonMatch = synthesisContent.match(/```json\s*([\s\S]*?)\s*```/)
          if (jsonMatch) {
            try {
              proposal = JSON.parse(jsonMatch[1])
            } catch {
              // JSON parse failed
            }
          }

          sendEvent('synthesis_complete', { proposal })
          sendEvent('discussion_complete', { discussionHistory, proposal })

          controller.close()
        } catch (error) {
          console.error('Discussion error:', error)
          sendEvent('error', { message: 'Discussion failed' })
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

function getPhaseNameChinese(phase: DiscussionPhase): string {
  const names: Record<DiscussionPhase, string> = {
    understanding: '需求理解',
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
  history: Array<{ expertId: string; content: string }>,
  experts: typeof CORE_EXPERTS
): string {
  const featuresText = features.map(f => `- ${f.name}: ${f.description}`).join('\n')
  const historyText = history
    .slice(-6) // Only last 6 messages for context
    .map(m => {
      const expert = experts.find(e => e.id === m.expertId)
      return `${expert?.name}: ${m.content}`
    })
    .join('\n\n')

  return `## 用户需求
${requirement}

## 已识别的功能
${featuresText}

${historyText ? `## 之前的讨论\n${historyText}\n` : ''}

现在轮到你发言了。请从你的专业角度，针对当前阶段（${getPhaseNameChinese(phase)}）给出你的观点。`
}
