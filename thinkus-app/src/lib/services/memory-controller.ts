import Anthropic from '@anthropic-ai/sdk'
import { type AgentId } from '@/lib/config/executives'
import { type MemoryType } from '@/lib/vector/pinecone'
import * as gemini from '@/lib/ai/gemini'

// 检查使用哪个 AI 服务
const useGemini = !process.env.ANTHROPIC_API_KEY && process.env.GOOGLE_API_KEY

/**
 * 记忆控制器输入
 */
export interface MemoryControllerInput {
  userMessage: string
  projectId?: string
  agentId: AgentId
  messageCount: number
  recentContext?: string  // 最近几条消息的上下文
}

/**
 * 记忆控制器输出
 */
export interface MemoryControllerOutput {
  needMemory: 'yes' | 'no' | 'maybe'
  memoryTypes: MemoryType[]
  retrievalMode: 'catalog' | 'details'
  budgetTokens: number
  timeRange: 'last_7_days' | 'last_30_days' | 'all'
  notes?: string
}

/**
 * 记忆目录条目
 */
export interface MemoryCatalogEntry {
  id: string
  summary: string
  type: MemoryType
  importance: number
  createdAt: Date
  tags?: string[]
  score?: number
}

/**
 * 记忆详情
 */
export interface MemoryDetails {
  id: string
  summary: string
  content: string
  context?: string
  decisions?: string[]
}

/**
 * 检索结果
 */
export interface RetrievalResult {
  mode: 'catalog' | 'details'
  catalog: MemoryCatalogEntry[]
  details: MemoryDetails[]
}

// Anthropic 客户端
const anthropic = useGemini ? null : new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
})

/**
 * Memory Controller Service
 * 智能判断是否需要记忆、检索模式、token 预算
 */
export class MemoryControllerService {
  /**
   * 分析用户消息，决定记忆策略
   */
  async analyze(input: MemoryControllerInput): Promise<MemoryControllerOutput> {
    const { userMessage, projectId, agentId, messageCount, recentContext } = input

    // 快速规则判断
    const quickResult = this.quickAnalysis(userMessage)
    if (quickResult.needMemory === 'no') {
      return quickResult
    }

    // AI 分析
    try {
      const prompt = this.buildPrompt(userMessage, projectId, agentId, messageCount, recentContext)

      let text = ''

      if (useGemini) {
        const response = await gemini.createMessage({
          max_tokens: 200,
          messages: [{ role: 'user', content: prompt }]
        })
        text = response.content[0]?.text || ''
      } else {
        const response = await anthropic!.messages.create({
          model: 'claude-3-5-haiku-20241022',  // 用便宜的模型做判断
          max_tokens: 200,
          messages: [{ role: 'user', content: prompt }]
        })
        const textBlock = response.content.find(block => block.type === 'text')
        text = textBlock?.text || ''
      }

      return this.parseResponse(text)
    } catch (error) {
      console.error('Memory controller AI analysis failed:', error)
      // 降级到保守策略
      return {
        needMemory: 'maybe',
        memoryTypes: [],
        retrievalMode: 'catalog',
        budgetTokens: 300,
        timeRange: 'last_30_days',
        notes: 'AI analysis failed, using conservative defaults',
      }
    }
  }

  /**
   * 快速规则分析
   */
  private quickAnalysis(message: string): MemoryControllerOutput {
    const lowerMessage = message.toLowerCase()

    // 明确需要记忆的模式
    const memoryNeededPatterns = [
      '之前', '上次', '我说过', '我们讨论过',
      '记得吗', '你记得', '历史', '以前',
      '我喜欢', '我不喜欢', '我偏好', '我习惯',
      '上一次', '那次', '之前提到',
    ]

    for (const pattern of memoryNeededPatterns) {
      if (lowerMessage.includes(pattern)) {
        return {
          needMemory: 'yes',
          memoryTypes: ['user_preference', 'project_context', 'discussion_insight'],
          retrievalMode: 'details',
          budgetTokens: 800,
          timeRange: 'last_30_days',
          notes: `匹配模式: ${pattern}`,
        }
      }
    }

    // 明确不需要记忆的模式
    const noMemoryPatterns = [
      '你好', '谢谢', '好的', '明白了',
      '什么是', '怎么', '如何', '帮我解释',
      '帮我写', '生成', '创建',
    ]

    // 如果是纯粹的新任务请求，不需要记忆
    for (const pattern of noMemoryPatterns) {
      if (lowerMessage.startsWith(pattern)) {
        return {
          needMemory: 'no',
          memoryTypes: [],
          retrievalMode: 'catalog',
          budgetTokens: 0,
          timeRange: 'last_30_days',
          notes: `新任务模式: ${pattern}`,
        }
      }
    }

    // 默认需要进一步分析
    return {
      needMemory: 'maybe',
      memoryTypes: [],
      retrievalMode: 'catalog',
      budgetTokens: 300,
      timeRange: 'last_30_days',
    }
  }

  /**
   * 构建 AI 分析提示
   */
  private buildPrompt(
    userMessage: string,
    projectId: string | undefined,
    agentId: AgentId,
    messageCount: number,
    recentContext?: string
  ): string {
    return `分析用户消息，决定是否需要检索记忆。

用户消息: "${userMessage}"

当前上下文:
- 项目ID: ${projectId || '无'}
- 高管: ${agentId}
- 会话消息数: ${messageCount}
${recentContext ? `- 最近上下文: ${recentContext.slice(0, 200)}` : ''}

判断规则:
1. 如果用户提到"之前"/"上次"/"我说过"等历史引用 → 需要记忆
2. 如果涉及项目历史决策 → 需要记忆
3. 如果需要个性化建议 → 需要记忆
4. 如果是通用问答或明确的新任务 → 不需要记忆
5. 如果上下文已经足够 → 不需要记忆

返回JSON (不要任何其他内容):
{
  "need_memory": "yes|no|maybe",
  "memory_types": ["user_preference", "project_context", "discussion_insight", "decision", "feedback"],
  "retrieval_mode": "catalog|details",
  "budget_tokens": 300,
  "time_range": "last_7_days|last_30_days|all",
  "notes": "简短说明原因"
}

只选择相关的 memory_types，不需要全部。
budget_tokens 建议: 简单参考200-500, 深度参考500-1500, 全面回顾1500-3000`
  }

  /**
   * 解析 AI 响应
   */
  private parseResponse(text: string): MemoryControllerOutput {
    try {
      // 尝试提取 JSON
      const jsonMatch = text.match(/\{[\s\S]*\}/)
      if (!jsonMatch) {
        throw new Error('No JSON found in response')
      }

      const json = JSON.parse(jsonMatch[0])

      return {
        needMemory: this.validateNeedMemory(json.need_memory),
        memoryTypes: this.validateMemoryTypes(json.memory_types),
        retrievalMode: this.validateRetrievalMode(json.retrieval_mode),
        budgetTokens: this.validateBudgetTokens(json.budget_tokens),
        timeRange: this.validateTimeRange(json.time_range),
        notes: json.notes,
      }
    } catch (error) {
      console.error('Failed to parse memory controller response:', error)
      // 返回保守默认值
      return {
        needMemory: 'maybe',
        memoryTypes: [],
        retrievalMode: 'catalog',
        budgetTokens: 300,
        timeRange: 'last_30_days',
        notes: 'Parse failed, using defaults',
      }
    }
  }

  private validateNeedMemory(value: unknown): 'yes' | 'no' | 'maybe' {
    if (value === 'yes' || value === 'no' || value === 'maybe') {
      return value
    }
    return 'maybe'
  }

  private validateMemoryTypes(value: unknown): MemoryType[] {
    if (!Array.isArray(value)) return []

    const validTypes: MemoryType[] = [
      'user_preference',
      'project_context',
      'discussion_insight',
      'decision',
      'feedback',
    ]

    return value.filter(v => validTypes.includes(v as MemoryType)) as MemoryType[]
  }

  private validateRetrievalMode(value: unknown): 'catalog' | 'details' {
    if (value === 'catalog' || value === 'details') {
      return value
    }
    return 'catalog'
  }

  private validateBudgetTokens(value: unknown): number {
    const num = Number(value)
    if (isNaN(num) || num < 0) return 300
    return Math.min(num, 3000) // 最大 3000 tokens
  }

  private validateTimeRange(value: unknown): 'last_7_days' | 'last_30_days' | 'all' {
    if (value === 'last_7_days' || value === 'last_30_days' || value === 'all') {
      return value
    }
    return 'last_30_days'
  }
}

// 导出单例
export const memoryController = new MemoryControllerService()
