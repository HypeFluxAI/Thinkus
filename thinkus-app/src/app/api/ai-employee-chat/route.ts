import { NextRequest } from 'next/server'
import { getServerSession } from 'next-auth'
import mongoose from 'mongoose'
import { authOptions } from '@/lib/auth/options'
import { Discussion } from '@/lib/db/models'
import dbConnect from '@/lib/db/connection'
import * as aiEngine from '@/lib/services/ai-engine-client'

interface ChatRequest {
  employeeId: string
  messages: Array<{ role: 'user' | 'assistant'; content: string }>
  projectId?: string
  discussionId?: string
}

export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return new Response('Unauthorized', { status: 401 })
    }

    const body: ChatRequest = await req.json()
    const { employeeId, messages, projectId, discussionId } = body

    if (!messages || !Array.isArray(messages) || messages.length === 0) {
      return new Response('Invalid messages', { status: 400 })
    }

    await dbConnect()
    const userId = session.user.id

    // Get the last user message
    const lastUserMessage = messages[messages.length - 1]

    // Build context from previous messages
    const context = messages.slice(0, -1).map(m => ({
      role: m.role === 'user' ? 'user' : 'assistant',
      content: m.content,
    }))

    const encoder = new TextEncoder()

    const readable = new ReadableStream({
      async start(controller) {
        const sendEvent = (type: string, data: unknown) => {
          controller.enqueue(
            encoder.encode(`data: ${JSON.stringify({ type, ...data as object })}\n\n`)
          )
        }

        try {
          // Get employee info for metadata
          let employeeInfo: aiEngine.AIEmployee | null = null
          try {
            employeeInfo = await aiEngine.getEmployee(employeeId)
          } catch {
            // If we can't get employee info, continue anyway
          }

          // Send start event
          sendEvent('start', {
            employeeId,
            employeeName: employeeInfo?.name || employeeId,
            employeeTitle: employeeInfo?.title || 'AI Employee',
            employeeAvatar: employeeInfo?.avatar || '🤖',
          })

          // Get streaming response from py-ai-engine
          const stream = await aiEngine.chatStream({
            employee_id: employeeId,
            project_id: projectId || 'default',
            user_id: userId,
            message: lastUserMessage.content,
            context,
          })

          const reader = stream.getReader()
          const decoder = new TextDecoder()
          let fullContent = ''

          while (true) {
            const { done, value } = await reader.read()
            if (done) break

            const chunk = decoder.decode(value, { stream: true })

            // Parse SSE format from py-ai-engine
            const lines = chunk.split('\n')
            for (const line of lines) {
              if (line.startsWith('data: ')) {
                const data = line.slice(6)
                if (data === '[DONE]') {
                  continue
                }
                // py-ai-engine sends JSON-encoded chunks to preserve newlines
                try {
                  const parsed = JSON.parse(data)
                  if (parsed.text) {
                    fullContent += parsed.text
                    sendEvent('delta', { content: parsed.text })
                  } else if (parsed.error) {
                    sendEvent('error', { message: parsed.error })
                  }
                } catch {
                  // Fallback for raw text (backwards compatibility)
                  fullContent += data
                  sendEvent('delta', { content: data })
                }
              }
            }
          }

          // Save to discussion if discussionId provided
          if (discussionId) {
            try {
              const discussion = await Discussion.findOne({
                _id: new mongoose.Types.ObjectId(discussionId),
                userId: new mongoose.Types.ObjectId(userId),
                status: 'active',
              })

              if (discussion) {
                await discussion.addMessage({
                  role: 'user',
                  content: lastUserMessage.content,
                })
                await discussion.addMessage({
                  role: 'agent',
                  agentId: employeeId,
                  content: fullContent,
                })
              }
            } catch (dbError) {
              console.error('Failed to save messages to discussion:', dbError)
            }
          }

          // Send done event
          sendEvent('done', {
            content: fullContent,
            employeeId,
          })

          controller.close()
        } catch (error) {
          console.error('AI Employee chat error:', error)
          sendEvent('error', {
            message: error instanceof Error ? error.message : 'Chat failed',
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
    console.error('AI Employee chat API error:', error)
    return new Response('Internal Server Error', { status: 500 })
  }
}
