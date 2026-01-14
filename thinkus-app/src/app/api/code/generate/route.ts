import { NextRequest } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { connectDB } from '@/lib/db/connect'
import { Project, AIUsage } from '@/lib/db/models'
import Anthropic from '@anthropic-ai/sdk'
import * as gemini from '@/lib/ai/gemini'

// 检查使用哪个 AI 服务
const useGemini = !process.env.ANTHROPIC_API_KEY && process.env.GOOGLE_API_KEY

const anthropic = useGemini ? null : new Anthropic()

/**
 * POST /api/code/generate
 * 流式生成代码文件
 */
export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401,
        headers: { 'Content-Type': 'application/json' },
      })
    }

    await connectDB()

    const { projectId, filePath, description, context } = await req.json()

    if (!projectId || !filePath) {
      return new Response(JSON.stringify({ error: 'Missing required fields' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      })
    }

    // Verify project ownership
    const project = await Project.findOne({
      _id: projectId,
      userId: session.user.id,
    })

    if (!project) {
      return new Response(JSON.stringify({ error: 'Project not found' }), {
        status: 404,
        headers: { 'Content-Type': 'application/json' },
      })
    }

    // Determine file type and generate appropriate prompt
    const ext = filePath.split('.').pop()?.toLowerCase()
    const isComponent = filePath.includes('component') || ext === 'tsx'
    const isPage = filePath.includes('page') || filePath.includes('/app/')
    const isApi = filePath.includes('/api/')
    const isUtil = filePath.includes('util') || filePath.includes('lib')

    const systemPrompt = `You are an expert code generator for modern web applications.
Generate clean, well-structured, production-ready code.

Project: ${project.name}
${project.description ? `Description: ${project.description}` : ''}
Tech Stack: Next.js 14, TypeScript, Tailwind CSS, shadcn/ui

Guidelines:
- Use TypeScript with proper types
- Follow React best practices and hooks patterns
- Use Tailwind CSS for styling
- Include proper error handling
- Add helpful comments for complex logic
- Use shadcn/ui components when appropriate
- Follow the file path naming conventions

Output ONLY the code, no explanations or markdown code blocks.`

    const userPrompt = `Generate the code for: ${filePath}

${description ? `Purpose: ${description}` : ''}
${context ? `Additional context: ${context}` : ''}

${isComponent ? 'This is a React component. Include proper TypeScript interfaces and export.' : ''}
${isPage ? 'This is a Next.js page. Use appropriate page conventions.' : ''}
${isApi ? 'This is an API route. Include proper request/response handling.' : ''}
${isUtil ? 'This is a utility/lib file. Focus on reusability and proper exports.' : ''}`

    // Create streaming response
    const encoder = new TextEncoder()
    let totalInputTokens = 0
    let totalOutputTokens = 0

    const stream = new ReadableStream({
      async start(controller) {
        try {
          if (useGemini) {
            // 使用 Gemini
            const generator = gemini.streamMessage({
              system: systemPrompt,
              max_tokens: 4096,
              messages: [{ role: 'user', content: userPrompt }],
            })

            let outputLength = 0
            for await (const event of generator) {
              if (event.type === 'content_block_delta' && event.delta?.text) {
                outputLength += event.delta.text.length
                const data = JSON.stringify({ content: event.delta.text })
                controller.enqueue(encoder.encode(`data: ${data}\n\n`))
              }
            }
            totalOutputTokens = Math.ceil(outputLength / 4)
            totalInputTokens = Math.ceil((systemPrompt.length + userPrompt.length) / 4)
          } else {
            // 使用 Anthropic
            const response = await anthropic!.messages.create({
              model: 'claude-sonnet-4-20250514',
              max_tokens: 4096,
              stream: true,
              system: systemPrompt,
              messages: [
                { role: 'user', content: userPrompt },
              ],
            })

            for await (const event of response) {
              if (event.type === 'content_block_delta') {
                const delta = event.delta as { type: string; text?: string }
                if (delta.type === 'text_delta' && delta.text) {
                  const data = JSON.stringify({ content: delta.text })
                  controller.enqueue(encoder.encode(`data: ${data}\n\n`))
                }
              } else if (event.type === 'message_delta') {
                const usage = (event as { usage?: { output_tokens: number } }).usage
                if (usage) {
                  totalOutputTokens = usage.output_tokens
                }
              } else if (event.type === 'message_start') {
                const message = (event as { message?: { usage?: { input_tokens: number } } }).message
                if (message?.usage) {
                  totalInputTokens = message.usage.input_tokens
                }
              }
            }
          }

          // Record AI usage
          try {
            await AIUsage.recordUsage({
              userId: session.user.id as any,
              projectId: projectId,
              aiModel: useGemini ? 'gemini-2.0-flash' : 'claude-sonnet-4',
              usageType: 'code_generation',
              inputTokens: totalInputTokens,
              outputTokens: totalOutputTokens,
              metadata: {
                filePath,
                description,
              },
            })
          } catch (usageError) {
            console.error('Failed to record AI usage:', usageError)
          }

          controller.enqueue(encoder.encode('data: [DONE]\n\n'))
          controller.close()
        } catch (error) {
          console.error('Code generation error:', error)
          const errorData = JSON.stringify({ error: 'Generation failed' })
          controller.enqueue(encoder.encode(`data: ${errorData}\n\n`))
          controller.close()
        }
      },
    })

    return new Response(stream, {
      headers: {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache',
        'Connection': 'keep-alive',
      },
    })
  } catch (error) {
    console.error('Code generation error:', error)
    return new Response(JSON.stringify({ error: 'Internal server error' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    })
  }
}
