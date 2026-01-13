import Anthropic from '@anthropic-ai/sdk'

/**
 * 模型配置
 */
export interface ModelConfig {
  id: string
  name: string
  costPer1kInput: number      // 每1k输入token成本 (USD)
  costPer1kOutput: number     // 每1k输出token成本 (USD)
  maxTokens: number
  capabilities: string[]
  latencyMs: number           // 平均延迟
}

/**
 * 任务类型
 */
export type TaskType =
  | 'complexity_assessment'   // 复杂度评估
  | 'requirement_analysis'    // 需求分析
  | 'code_generation'         // 代码生成
  | 'ui_design'              // UI设计
  | 'test_generation'         // 测试生成
  | 'bug_fix'                // Bug修复
  | 'growth_advice'          // 增长建议
  | 'document_processing'     // 文档处理
  | 'general_chat'           // 通用对话
  | 'memory_control'         // 记忆控制
  | 'summary_generation'      // 摘要生成

/**
 * 任务复杂度
 */
export type Complexity = 'simple' | 'medium' | 'complex'

/**
 * 任务上下文
 */
export interface TaskContext {
  description: string
  estimatedLines?: number
  codeComplexity?: 'low' | 'medium' | 'high'
  requiresArchitecture?: boolean
  requiresSecurityReview?: boolean
}

/**
 * 模型选择结果
 */
export interface ModelSelection {
  model: ModelConfig
  reason: string
  estimatedCost: number
}

// 模型配置表
export const MODEL_CONFIG: Record<string, ModelConfig> = {
  'claude-opus-4': {
    id: 'claude-opus-4-20250514',
    name: 'Claude Opus 4',
    costPer1kInput: 0.015,
    costPer1kOutput: 0.075,
    maxTokens: 200000,
    capabilities: ['complex_reasoning', 'architecture', 'security_audit', 'creative'],
    latencyMs: 3000,
  },
  'claude-sonnet-4': {
    id: 'claude-sonnet-4-20250514',
    name: 'Claude Sonnet 4',
    costPer1kInput: 0.003,
    costPer1kOutput: 0.015,
    maxTokens: 200000,
    capabilities: ['code_generation', 'ui_design', 'general', 'analysis'],
    latencyMs: 1500,
  },
  'claude-haiku': {
    id: 'claude-3-5-haiku-20241022',
    name: 'Claude Haiku',
    costPer1kInput: 0.0008,
    costPer1kOutput: 0.004,
    maxTokens: 200000,
    capabilities: ['simple_tasks', 'classification', 'formatting', 'extraction'],
    latencyMs: 500,
  },
}

// 任务类型到模型的映射规则
const TASK_MODEL_RULES: Record<TaskType, {
  simple?: string
  default: string
  complex?: string
}> = {
  // 复杂度评估 - 用最便宜的
  complexity_assessment: {
    default: 'claude-haiku',
  },

  // 需求分析 - 标准，复杂用高端
  requirement_analysis: {
    default: 'claude-sonnet-4',
    complex: 'claude-opus-4',
  },

  // 代码生成 - 根据复杂度分层
  code_generation: {
    simple: 'claude-haiku',
    default: 'claude-sonnet-4',
    complex: 'claude-opus-4',
  },

  // UI设计 - 标准
  ui_design: {
    default: 'claude-sonnet-4',
  },

  // 测试生成 - 便宜
  test_generation: {
    default: 'claude-haiku',
    complex: 'claude-sonnet-4',
  },

  // Bug修复 - 根据复杂度
  bug_fix: {
    simple: 'claude-haiku',
    default: 'claude-sonnet-4',
  },

  // 增长建议 - 标准
  growth_advice: {
    default: 'claude-sonnet-4',
  },

  // 文档处理 - 标准
  document_processing: {
    simple: 'claude-haiku',
    default: 'claude-sonnet-4',
  },

  // 通用对话 - 标准
  general_chat: {
    simple: 'claude-haiku',
    default: 'claude-sonnet-4',
  },

  // 记忆控制 - 最便宜
  memory_control: {
    default: 'claude-haiku',
  },

  // 摘要生成 - 便宜
  summary_generation: {
    default: 'claude-haiku',
    complex: 'claude-sonnet-4',
  },
}

// Anthropic 客户端
const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
})

/**
 * Model Router Service
 * 根据任务类型和复杂度选择最合适的模型
 */
export class ModelRouterService {
  /**
   * 选择最合适的模型
   */
  async selectModel(
    taskType: TaskType,
    context: TaskContext
  ): Promise<ModelSelection> {
    // 1. 快速评估复杂度
    const complexity = await this.assessComplexity(context)

    // 2. 根据规则选择模型
    const rule = TASK_MODEL_RULES[taskType]
    let modelKey: string

    if (complexity === 'simple' && rule.simple) {
      modelKey = rule.simple
    } else if (complexity === 'complex' && rule.complex) {
      modelKey = rule.complex
    } else {
      modelKey = rule.default
    }

    const model = MODEL_CONFIG[modelKey]

    // 3. 估算成本
    const estimatedTokens = this.estimateTokens(context)
    const estimatedCost = this.calculateCost(model, estimatedTokens)

    return {
      model,
      reason: `任务类型: ${taskType}, 复杂度: ${complexity}`,
      estimatedCost,
    }
  }

  /**
   * 快速选择模型 (不进行AI复杂度评估)
   */
  selectModelFast(
    taskType: TaskType,
    complexity: Complexity = 'medium'
  ): ModelConfig {
    const rule = TASK_MODEL_RULES[taskType]
    let modelKey: string

    if (complexity === 'simple' && rule.simple) {
      modelKey = rule.simple
    } else if (complexity === 'complex' && rule.complex) {
      modelKey = rule.complex
    } else {
      modelKey = rule.default
    }

    return MODEL_CONFIG[modelKey]
  }

  /**
   * 获取模型ID
   */
  getModelId(taskType: TaskType, complexity: Complexity = 'medium'): string {
    return this.selectModelFast(taskType, complexity).id
  }

  /**
   * 评估任务复杂度
   */
  async assessComplexity(context: TaskContext): Promise<Complexity> {
    // 快速规则判断
    if (context.requiresArchitecture || context.requiresSecurityReview) {
      return 'complex'
    }

    if (context.codeComplexity === 'high') {
      return 'complex'
    }

    if (context.estimatedLines && context.estimatedLines < 50) {
      return 'simple'
    }

    if (context.estimatedLines && context.estimatedLines > 500) {
      return 'complex'
    }

    // 使用 Haiku 快速评估
    try {
      const response = await anthropic.messages.create({
        model: MODEL_CONFIG['claude-haiku'].id,
        max_tokens: 10,
        messages: [{
          role: 'user',
          content: `评估任务复杂度，只返回 simple/medium/complex 中的一个:
任务: ${context.description.slice(0, 200)}
${context.estimatedLines ? `代码量: ${context.estimatedLines}行` : ''}`
        }]
      })

      const textBlock = response.content.find(block => block.type === 'text')
      const result = textBlock?.text?.trim().toLowerCase()

      if (result === 'simple' || result === 'medium' || result === 'complex') {
        return result
      }
    } catch (error) {
      console.error('Complexity assessment failed:', error)
    }

    return 'medium'
  }

  /**
   * 估算 token 数量
   */
  private estimateTokens(context: TaskContext): { input: number; output: number } {
    // 基础估算
    let inputTokens = 500 // 系统提示词
    let outputTokens = 1000 // 默认输出

    // 根据描述长度估算
    inputTokens += Math.ceil(context.description.length / 4)

    // 根据代码行数估算输出
    if (context.estimatedLines) {
      outputTokens = Math.max(outputTokens, context.estimatedLines * 10)
    }

    return { input: inputTokens, output: outputTokens }
  }

  /**
   * 计算成本
   */
  private calculateCost(
    model: ModelConfig,
    tokens: { input: number; output: number }
  ): number {
    const inputCost = (tokens.input / 1000) * model.costPer1kInput
    const outputCost = (tokens.output / 1000) * model.costPer1kOutput
    return Math.round((inputCost + outputCost) * 10000) / 10000
  }

  /**
   * 计算实际成本
   */
  calculateActualCost(
    modelId: string,
    inputTokens: number,
    outputTokens: number
  ): number {
    const model = Object.values(MODEL_CONFIG).find(m => m.id === modelId)
    if (!model) return 0

    const inputCost = (inputTokens / 1000) * model.costPer1kInput
    const outputCost = (outputTokens / 1000) * model.costPer1kOutput
    return Math.round((inputCost + outputCost) * 10000) / 10000
  }

  /**
   * 获取成本节省比例
   */
  getCostSavings(
    actualModel: string,
    inputTokens: number,
    outputTokens: number
  ): { saved: number; percentage: number } {
    // 如果全部使用 Sonnet 的成本
    const sonnetCost = this.calculateActualCost(
      MODEL_CONFIG['claude-sonnet-4'].id,
      inputTokens,
      outputTokens
    )

    // 实际成本
    const actualCost = this.calculateActualCost(actualModel, inputTokens, outputTokens)

    const saved = sonnetCost - actualCost
    const percentage = sonnetCost > 0 ? Math.round((saved / sonnetCost) * 100) : 0

    return { saved, percentage }
  }
}

// 导出单例
export const modelRouter = new ModelRouterService()

/**
 * 便捷函数：获取模型ID
 */
export function getModelForTask(
  taskType: TaskType,
  complexity: Complexity = 'medium'
): string {
  return modelRouter.getModelId(taskType, complexity)
}

/**
 * 便捷函数：获取 Haiku 模型ID
 */
export function getHaikuModel(): string {
  return MODEL_CONFIG['claude-haiku'].id
}

/**
 * 便捷函数：获取 Sonnet 模型ID
 */
export function getSonnetModel(): string {
  return MODEL_CONFIG['claude-sonnet-4'].id
}

/**
 * 便捷函数：获取 Opus 模型ID
 */
export function getOpusModel(): string {
  return MODEL_CONFIG['claude-opus-4'].id
}
