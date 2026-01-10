import Anthropic from '@anthropic-ai/sdk'

const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
})

export type ClaudeModel = 'claude-opus-4-20250514' | 'claude-sonnet-4-20250514' | 'claude-3-5-haiku-20241022'

export interface ChatOptions {
  model?: ClaudeModel
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

export async function chat(options: ChatOptions): Promise<ChatResponse> {
  const response = await anthropic.messages.create({
    model: options.model || 'claude-sonnet-4-20250514',
    max_tokens: options.maxTokens || 2000,
    temperature: options.temperature || 0.7,
    system: options.system,
    messages: options.messages,
  })

  return {
    content: response.content[0].type === 'text' ? response.content[0].text : '',
    usage: {
      inputTokens: response.usage.input_tokens,
      outputTokens: response.usage.output_tokens,
    },
  }
}

export interface StreamChatOptions {
  model?: ClaudeModel
  system: string
  messages: Array<{ role: 'user' | 'assistant'; content: string }>
  maxTokens?: number
  temperature?: number
  onChunk: (chunk: string) => void
  onComplete?: (fullContent: string) => void
}

export async function streamChat(options: StreamChatOptions): Promise<void> {
  const stream = await anthropic.messages.stream({
    model: options.model || 'claude-sonnet-4-20250514',
    max_tokens: options.maxTokens || 2000,
    temperature: options.temperature || 0.7,
    system: options.system,
    messages: options.messages,
  })

  let fullContent = ''

  for await (const event of stream) {
    if (event.type === 'content_block_delta' && event.delta.type === 'text_delta') {
      const text = event.delta.text
      fullContent += text
      options.onChunk(text)
    }
  }

  options.onComplete?.(fullContent)
}
