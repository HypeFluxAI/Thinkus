import { NextRequest } from 'next/server'
import Anthropic from '@anthropic-ai/sdk'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth/options'
import * as gemini from '@/lib/ai/gemini'

// 检查使用哪个 AI 服务
const useGemini = !process.env.ANTHROPIC_API_KEY && process.env.GOOGLE_API_KEY

const anthropic = useGemini ? null : new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
})

const SYSTEM_PROMPT = `你是小T，Thinkus平台的AI产品顾问。你的职责是帮助用户理解和完善他们的产品需求。

## 你的角色
- 友好、专业的产品顾问
- 善于倾听和提问
- 能快速理解用户需求并给出建议

## 对话原则
1. 首先理解用户想要做什么
2. 通过提问澄清模糊的需求
3. 识别核心功能和优先级
4. 给出专业但易懂的建议

## 输出要求
- 使用中文回复
- 保持回复简洁，每次不超过200字
- 适时总结已识别的功能
- 在合适的时候询问是否可以开始专家讨论

## 功能识别
当识别到具体功能时，在回复末尾用JSON格式输出：
\`\`\`json
{"features": [{"name": "功能名", "description": "描述", "priority": "P0/P1/P2"}]}
\`\`\`

优先级定义：
- P0: 核心必备功能
- P1: 重要功能
- P2: 锦上添花功能`

export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session) {
      return new Response('Unauthorized', { status: 401 })
    }

    const { messages, projectId } = await req.json()

    if (!messages || !Array.isArray(messages)) {
      return new Response('Invalid messages', { status: 400 })
    }

    const formattedMessages = messages.map((m: { role: string; content: string }) => ({
      role: m.role as 'user' | 'assistant',
      content: m.content,
    }))

    const encoder = new TextEncoder()

    let isClosed = false

    const readable = new ReadableStream({
      async start(controller) {
        // Helper to safely enqueue data
        const safeEnqueue = (data: Uint8Array) => {
          if (isClosed) return false
          try {
            controller.enqueue(data)
            return true
          } catch {
            isClosed = true
            return false
          }
        }

        try {
          if (useGemini) {
            // 使用 Gemini
            const generator = gemini.streamMessage({
              system: SYSTEM_PROMPT,
              max_tokens: 1024,
              messages: formattedMessages,
            })

            for await (const event of generator) {
              if (event.type === 'content_block_delta' && event.delta?.text) {
                const data = JSON.stringify({ type: 'text', content: event.delta.text })
                if (!safeEnqueue(encoder.encode(`data: ${data}\n\n`))) break
              }
            }
          } else {
            // 使用 Anthropic
            const stream = await anthropic!.messages.stream({
              model: 'claude-sonnet-4-20250514',
              max_tokens: 1024,
              system: SYSTEM_PROMPT,
              messages: formattedMessages,
            })

            for await (const event of stream) {
              if (event.type === 'content_block_delta' && event.delta.type === 'text_delta') {
                const data = JSON.stringify({ type: 'text', content: event.delta.text })
                if (!safeEnqueue(encoder.encode(`data: ${data}\n\n`))) break
              }
            }
          }

          if (!isClosed) {
            safeEnqueue(encoder.encode(`data: ${JSON.stringify({ type: 'done' })}\n\n`))
            controller.close()
            isClosed = true
          }
        } catch (error) {
          if (!isClosed) {
            console.error('Stream error:', error)
            try {
              controller.error(error)
            } catch {
              // Controller already closed
            }
          }
        }
      },
      cancel() {
        isClosed = true
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
    console.error('Chat API error:', error)
    return new Response('Internal Server Error', { status: 500 })
  }
}
