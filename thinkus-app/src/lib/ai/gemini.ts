import { GoogleGenerativeAI } from '@google/generative-ai'

// Gemini 客户端
const genAI = new GoogleGenerativeAI(process.env.GOOGLE_API_KEY || '')

// Mock mode - 用于API限流时的测试
const ENABLE_MOCK_MODE = process.env.AI_MOCK_MODE === 'true'

// Mock 响应生成器
function generateMockResponse(messages: Array<{ role: string; content: string }>, context?: string): string {
  const lastMessage = messages[messages.length - 1]?.content || ''

  // 根据上下文生成合适的mock响应
  if (context?.includes('executive') || context?.includes('讨论')) {
    return `[Mock AI Response] 作为专家顾问，我对这个问题有以下看法：

1. **技术可行性**：这个方案在技术上是可行的，建议采用现代化的技术栈来实现。

2. **市场机会**：根据市场分析，目标用户群体有明确的需求痛点。

3. **建议**：建议分阶段实施，先做MVP验证市场需求。

这是一个很好的想法，让我们继续深入讨论具体的实施细节。`
  }

  if (context?.includes('code') || context?.includes('代码')) {
    return `[Mock AI Response] 我来帮你生成代码：

\`\`\`typescript
// 示例代码
export function example() {
  console.log('Hello from mock mode');
  return { success: true };
}
\`\`\`

这是一个基础实现，你可以根据需要进行扩展。`
  }

  return `[Mock AI Response] 收到您的消息："${lastMessage.substring(0, 50)}..."。

这是一个模拟响应（AI API暂时不可用，使用mock模式）。实际功能正常时会有真实的AI响应。`
}

// 模型映射：Claude -> Gemini
// 使用 gemini-3-flash-preview (2026年最新版本)
export const MODEL_MAP = {
  'claude-opus-4-20250514': 'gemini-3-pro-preview',     // 最强模型 -> Gemini 3.0 Pro
  'claude-sonnet-4-20250514': 'gemini-3-flash-preview', // 标准模型 -> Gemini 3.0 Flash
  'claude-3-5-haiku-20241022': 'gemini-2.5-flash-lite', // 快速模型 -> Gemini 2.5 Flash Lite
} as const

export type GeminiModel = 'gemini-3-pro-preview' | 'gemini-3-flash-preview' | 'gemini-2.5-flash-lite' | 'gemini-2.5-flash' | 'gemini-2.5-pro'

// 获取 Gemini 模型实例
export function getModel(modelId?: string) {
  // 默认使用 gemini-3-flash-preview，这是当前最新的模型
  const geminiModel = modelId
    ? MODEL_MAP[modelId as keyof typeof MODEL_MAP] || 'gemini-3-flash-preview'
    : 'gemini-3-flash-preview'
  return genAI.getGenerativeModel({ model: geminiModel })
}

export interface ChatOptions {
  model?: string
  system: string
  messages: Array<{ role: 'user' | 'assistant'; content: string }>
  maxTokens?: number
  temperature?: number
}

export interface ChatResponse {
  content: string
  usage: {
    inputTokens: number
    outputTokens: number
  }
}

// 将消息转换为 Gemini 格式的内容数组
function buildContents(messages: Array<{ role: 'user' | 'assistant'; content: string }>, system?: string) {
  const contents: Array<{ role: 'user' | 'model'; parts: Array<{ text: string }> }> = []

  for (let i = 0; i < messages.length; i++) {
    const msg = messages[i]
    let text = msg.content

    // 在第一条用户消息前加入系统提示
    if (i === 0 && msg.role === 'user' && system) {
      text = `[系统指令]\n${system}\n\n[用户消息]\n${msg.content}`
    }

    contents.push({
      role: msg.role === 'assistant' ? 'model' : 'user',
      parts: [{ text }],
    })
  }

  return contents
}

// 非流式聊天
export async function chat(options: ChatOptions): Promise<ChatResponse> {
  // Mock 模式
  if (ENABLE_MOCK_MODE) {
    const mockContent = generateMockResponse(options.messages, options.system)
    return {
      content: mockContent,
      usage: { inputTokens: 100, outputTokens: 50 },
    }
  }

  const model = getModel(options.model)

  const contents = buildContents(options.messages, options.system)

  try {
    const result = await model.generateContent({
      contents,
      generationConfig: {
        maxOutputTokens: options.maxTokens || 2000,
        temperature: options.temperature || 0.7,
      },
    })

    const response = result.response

    return {
      content: response.text(),
      usage: {
        inputTokens: response.usageMetadata?.promptTokenCount || 0,
        outputTokens: response.usageMetadata?.candidatesTokenCount || 0,
      },
    }
  } catch (error: unknown) {
    // 如果是限流错误，返回 mock 响应
    const errorMessage = error instanceof Error ? error.message : String(error)
    if (errorMessage.includes('429') || errorMessage.includes('quota') || errorMessage.includes('RESOURCE_EXHAUSTED')) {
      console.warn('[Gemini] Rate limited, using mock response')
      const mockContent = generateMockResponse(options.messages, options.system)
      return {
        content: mockContent,
        usage: { inputTokens: 100, outputTokens: 50 },
      }
    }
    throw error
  }
}

export interface StreamChatOptions {
  model?: string
  system: string
  messages: Array<{ role: 'user' | 'assistant'; content: string }>
  maxTokens?: number
  temperature?: number
  onChunk: (chunk: string) => void
  onComplete?: (fullContent: string) => void
}

// 流式聊天
export async function streamChat(options: StreamChatOptions): Promise<void> {
  // Mock 模式
  if (ENABLE_MOCK_MODE) {
    const mockContent = generateMockResponse(options.messages, options.system)
    // 模拟流式输出
    const words = mockContent.split(' ')
    for (const word of words) {
      options.onChunk(word + ' ')
      await new Promise(resolve => setTimeout(resolve, 30))
    }
    options.onComplete?.(mockContent)
    return
  }

  const model = getModel(options.model)

  const contents = buildContents(options.messages, options.system)

  try {
    const result = await model.generateContentStream({
      contents,
      generationConfig: {
        maxOutputTokens: options.maxTokens || 2000,
        temperature: options.temperature || 0.7,
      },
    })

    let fullContent = ''

    for await (const chunk of result.stream) {
      const text = chunk.text()
      if (text) {
        fullContent += text
        options.onChunk(text)
      }
    }

    options.onComplete?.(fullContent)
  } catch (error: unknown) {
    // 如果是限流错误，使用 mock 响应
    const errorMessage = error instanceof Error ? error.message : String(error)
    if (errorMessage.includes('429') || errorMessage.includes('quota') || errorMessage.includes('RESOURCE_EXHAUSTED')) {
      console.warn('[Gemini] Rate limited, using mock response for stream')
      const mockContent = generateMockResponse(options.messages, options.system)
      const words = mockContent.split(' ')
      for (const word of words) {
        options.onChunk(word + ' ')
        await new Promise(resolve => setTimeout(resolve, 30))
      }
      options.onComplete?.(mockContent)
      return
    }
    throw error
  }
}

// 简单的消息创建（兼容 Anthropic API 风格）
export async function createMessage(options: {
  model?: string
  system?: string
  max_tokens?: number
  temperature?: number
  messages: Array<{ role: 'user' | 'assistant'; content: string }>
}): Promise<{
  content: Array<{ type: 'text'; text: string }>
  usage: { input_tokens: number; output_tokens: number }
}> {
  // Mock 模式
  if (ENABLE_MOCK_MODE) {
    const mockContent = generateMockResponse(options.messages, options.system)
    return {
      content: [{ type: 'text', text: mockContent }],
      usage: { input_tokens: 100, output_tokens: 50 },
    }
  }

  const model = getModel(options.model)

  const contents = buildContents(options.messages, options.system)

  try {
    const result = await model.generateContent({
      contents,
      generationConfig: {
        maxOutputTokens: options.max_tokens || 2000,
        temperature: options.temperature || 0.7,
      },
    })

    const response = result.response

    return {
      content: [{ type: 'text', text: response.text() }],
      usage: {
        input_tokens: response.usageMetadata?.promptTokenCount || 0,
        output_tokens: response.usageMetadata?.candidatesTokenCount || 0,
      },
    }
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : String(error)
    if (errorMessage.includes('429') || errorMessage.includes('quota') || errorMessage.includes('RESOURCE_EXHAUSTED')) {
      console.warn('[Gemini] Rate limited, using mock response')
      const mockContent = generateMockResponse(options.messages, options.system)
      return {
        content: [{ type: 'text', text: mockContent }],
        usage: { input_tokens: 100, output_tokens: 50 },
      }
    }
    throw error
  }
}

// 流式消息创建（兼容 Anthropic API 风格）
export async function* streamMessage(options: {
  model?: string
  system?: string
  max_tokens?: number
  temperature?: number
  messages: Array<{ role: 'user' | 'assistant'; content: string }>
}): AsyncGenerator<{ type: string; delta?: { type: string; text: string } }> {
  // Mock 模式
  if (ENABLE_MOCK_MODE) {
    const mockContent = generateMockResponse(options.messages, options.system)
    const words = mockContent.split(' ')
    for (const word of words) {
      yield {
        type: 'content_block_delta',
        delta: { type: 'text_delta', text: word + ' ' },
      }
      await new Promise(resolve => setTimeout(resolve, 30))
    }
    return
  }

  const model = getModel(options.model)

  const contents = buildContents(options.messages, options.system)

  try {
    const result = await model.generateContentStream({
      contents,
      generationConfig: {
        maxOutputTokens: options.max_tokens || 2000,
        temperature: options.temperature || 0.7,
      },
    })

    for await (const chunk of result.stream) {
      const text = chunk.text()
      if (text) {
        yield {
          type: 'content_block_delta',
          delta: { type: 'text_delta', text },
        }
      }
    }
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : String(error)
    if (errorMessage.includes('429') || errorMessage.includes('quota') || errorMessage.includes('RESOURCE_EXHAUSTED')) {
      console.warn('[Gemini] Rate limited, using mock response for stream')
      const mockContent = generateMockResponse(options.messages, options.system)
      const words = mockContent.split(' ')
      for (const word of words) {
        yield {
          type: 'content_block_delta',
          delta: { type: 'text_delta', text: word + ' ' },
        }
        await new Promise(resolve => setTimeout(resolve, 30))
      }
      return
    }
    throw error
  }
}

// 导出 genAI 实例供直接使用
export { genAI }
