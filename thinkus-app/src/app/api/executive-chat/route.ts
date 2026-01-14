import { NextRequest } from 'next/server'
import Anthropic from '@anthropic-ai/sdk'
import { getServerSession } from 'next-auth'
import mongoose from 'mongoose'
import { authOptions } from '@/lib/auth/options'
import { UserExecutive, Discussion, Project } from '@/lib/db/models'
import { EXECUTIVES, type AgentId } from '@/lib/config/executives'
import { buildExecutiveSystemPrompt } from '@/lib/services/executive-prompt'
import { enhanceConversationContext } from '@/lib/services/memory-injector'
import dbConnect from '@/lib/db/connection'
import * as gemini from '@/lib/ai/gemini'

// 检查使用哪个 AI 服务
const useGemini = !process.env.ANTHROPIC_API_KEY && process.env.GOOGLE_API_KEY

const anthropic = useGemini ? null : new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
})

interface ChatRequest {
  agentId: AgentId
  messages: Array<{ role: 'user' | 'assistant'; content: string }>
  projectId?: string
  discussionId?: string
  context?: string
}

export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return new Response('Unauthorized', { status: 401 })
    }

    const body: ChatRequest = await req.json()
    const { agentId, messages, projectId, discussionId, context } = body

    // 验证高管ID
    if (!EXECUTIVES[agentId]) {
      return new Response('Invalid agent ID', { status: 400 })
    }

    if (!messages || !Array.isArray(messages) || messages.length === 0) {
      return new Response('Invalid messages', { status: 400 })
    }

    await dbConnect()
    const userId = new mongoose.Types.ObjectId(session.user.id)

    // 获取用户专属高管实例
    const userExecutive = await UserExecutive.findOne({ userId, agentId })

    // 获取项目上下文（如果有）
    let projectContext: {
      name: string
      description?: string
      phase?: string
      type?: string
    } | undefined

    if (projectId) {
      const project = await Project.findOne({
        _id: new mongoose.Types.ObjectId(projectId),
        userId,
      })
      if (project) {
        projectContext = {
          name: project.name,
          description: project.description,
          phase: project.phase,
          type: project.type,
        }
      }
    }

    // 构建基础系统提示词
    let systemPrompt = buildExecutiveSystemPrompt({
      agentId,
      userExecutive,
      projectContext,
      discussionContext: context,
    })

    // 获取最后一条用户消息（用于存储和记忆检索）
    const lastUserMessage = messages[messages.length - 1]

    // 尝试注入记忆增强（如果Pinecone可用）
    if (process.env.PINECONE_API_KEY && process.env.OPENAI_API_KEY) {
      try {
        const enhancement = await enhanceConversationContext({
          query: lastUserMessage.content,
          userId,
          agentId,
          projectId: projectId ? new mongoose.Types.ObjectId(projectId) : undefined,
        })

        if (enhancement.fullEnhancement) {
          systemPrompt = `${systemPrompt}\n\n${enhancement.fullEnhancement}`
        }
      } catch (memoryError) {
        // 记忆增强失败不影响正常对话
        console.warn('Memory enhancement failed:', memoryError)
      }
    }

    const encoder = new TextEncoder()

    const readable = new ReadableStream({
      async start(controller) {
        const sendEvent = (type: string, data: unknown) => {
          controller.enqueue(
            encoder.encode(`data: ${JSON.stringify({ type, ...data as object })}\n\n`)
          )
        }

        try {
          // 发送开始事件
          sendEvent('start', {
            agentId,
            agentName: EXECUTIVES[agentId].nameCn,
            agentTitle: EXECUTIVES[agentId].titleCn,
            agentColor: EXECUTIVES[agentId].color,
            agentAvatar: EXECUTIVES[agentId].avatar,
          })

          let fullContent = ''

          // 创建流式响应
          if (useGemini) {
            // 使用 Gemini
            const generator = gemini.streamMessage({
              system: systemPrompt,
              max_tokens: 2048,
              temperature: 0.7,
              messages: messages.map(m => ({
                role: m.role,
                content: m.content,
              })),
            })

            for await (const event of generator) {
              if (event.type === 'content_block_delta' && event.delta?.text) {
                fullContent += event.delta.text
                sendEvent('delta', { content: event.delta.text })
              }
            }
          } else {
            // 使用 Anthropic
            const stream = await anthropic!.messages.stream({
              model: 'claude-sonnet-4-20250514',
              max_tokens: 2048,
              temperature: 0.7,
              system: systemPrompt,
              messages: messages.map(m => ({
                role: m.role,
                content: m.content,
              })),
            })

            // 流式输出
            for await (const event of stream) {
              if (event.type === 'content_block_delta' && event.delta.type === 'text_delta') {
                fullContent += event.delta.text
                sendEvent('delta', { content: event.delta.text })
              }
            }
          }

          // 存储消息到讨论（如果有discussionId）
          if (discussionId) {
            try {
              const discussion = await Discussion.findOne({
                _id: new mongoose.Types.ObjectId(discussionId),
                userId,
                status: 'active',
              })

              if (discussion) {
                // 存储用户消息
                await discussion.addMessage({
                  role: 'user',
                  content: lastUserMessage.content,
                })

                // 存储高管回复
                await discussion.addMessage({
                  role: 'agent',
                  agentId,
                  content: fullContent,
                })
              }
            } catch (dbError) {
              console.error('Failed to save messages to discussion:', dbError)
              // 不阻断响应
            }
          }

          // 更新高管使用统计
          if (userExecutive) {
            try {
              userExecutive.usageStats.totalMessages += 2 // 用户消息 + 高管回复
              userExecutive.usageStats.lastActiveAt = new Date()
              await userExecutive.save()
            } catch (statError) {
              console.error('Failed to update usage stats:', statError)
            }
          }

          // 发送完成事件
          sendEvent('done', {
            content: fullContent,
            agentId,
          })

          controller.close()
        } catch (error) {
          console.error('Stream error:', error)
          sendEvent('error', {
            message: error instanceof Error ? error.message : 'Stream failed',
          })
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
    console.error('Executive chat API error:', error)
    return new Response('Internal Server Error', { status: 500 })
  }
}
