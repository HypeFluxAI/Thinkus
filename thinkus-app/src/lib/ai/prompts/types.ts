import type { ClaudeModel } from '../claude'

// 提示词配置
export interface PromptConfig {
  id: string
  version: string
  model: 'claude-opus' | 'claude-sonnet' | 'claude-haiku'
  temperature: number
  maxTokens: number
  tags?: string[]
}

// 加载后的提示词
export interface LoadedPrompt {
  config: PromptConfig
  template: string
  rawContent: string
}

// 渲染后的提示词（可直接使用）
export interface RenderedPrompt {
  config: PromptConfig
  systemPrompt: string
  claudeModel: ClaudeModel
}

// 提示词执行记录
export interface PromptExecution {
  promptId: string
  version: string
  input: Record<string, unknown>
  output: string
  metrics: {
    inputTokens: number
    outputTokens: number
    latencyMs: number
    formatValid?: boolean
    taskCompleted?: boolean
  }
  timestamp: Date
}

// 模型映射
export const MODEL_MAP: Record<PromptConfig['model'], ClaudeModel> = {
  'claude-opus': 'claude-opus-4-20250514',
  'claude-sonnet': 'claude-sonnet-4-20250514',
  'claude-haiku': 'claude-3-5-haiku-20241022',
}

// 默认配置
export const DEFAULT_CONFIG: Partial<PromptConfig> = {
  model: 'claude-sonnet',
  temperature: 0.7,
  maxTokens: 2000,
}
