import mongoose from 'mongoose'
import Anthropic from '@anthropic-ai/sdk'
import { type AgentId } from '@/lib/config/executives'
import {
  SessionSummary,
  type ISessionSummary,
  type SummaryDecision,
  type SummaryArtifactRef,
} from '@/lib/db/models'
import { artifactService } from './artifact-service'

/**
 * 消息接口
 */
interface ConversationMessage {
  role: 'user' | 'assistant' | 'system'
  content: string
  timestamp?: Date
}

/**
 * 生成摘要的输入
 */
interface GenerateSummaryInput {
  sessionId: string
  userId: mongoose.Types.ObjectId
  projectId?: mongoose.Types.ObjectId
  agentId?: AgentId
  messages: ConversationMessage[]
  trajectoryStart?: number
  trajectoryEnd?: number
}

/**
 * AI 生成的原始摘要结构
 */
interface RawSummaryOutput {
  goal?: string
  constraints?: string[]
  decisions?: Array<{
    what: string
    why: string
    who: string
    confidence: 'high' | 'medium' | 'low'
  }>
  progress?: string[]
  next_actions?: string[]
  risks?: string[]
  open_questions?: string[]
}

// Anthropic 客户端
const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
})

/**
 * Session Summary Service
 * 生成和管理会话摘要
 */
export class SessionSummaryService {
  /**
   * 生成会话摘要
   */
  async generate(input: GenerateSummaryInput): Promise<ISessionSummary> {
    const {
      sessionId,
      userId,
      projectId,
      agentId,
      messages,
      trajectoryStart = 0,
      trajectoryEnd = messages.length - 1,
    } = input

    // 使用 AI 生成摘要
    const rawSummary = await this.generateWithAI(messages)

    // 获取会话相关的 Artifacts
    const artifactCompacts = await artifactService.getSessionCompacts(sessionId)
    const artifacts: SummaryArtifactRef[] = artifactCompacts.map(c => ({
      ref: c.ref,
      locator: c.path || c.fileName || c.ref,
      desc: c.summary.slice(0, 100),
    }))

    // 创建或更新摘要
    const summary = await SessionSummary.upsertSummary({
      sessionId,
      userId,
      projectId,
      agentId,
      goal: rawSummary.goal,
      constraints: rawSummary.constraints || [],
      decisions: rawSummary.decisions || [],
      progress: rawSummary.progress || [],
      artifacts,
      nextActions: rawSummary.next_actions || [],
      risks: rawSummary.risks || [],
      openQuestions: rawSummary.open_questions || [],
      trajectoryStart,
      trajectoryEnd,
      messageCount: messages.length,
    })

    return summary
  }

  /**
   * 获取最近的会话摘要
   */
  async getRecent(
    userId: mongoose.Types.ObjectId,
    options?: {
      projectId?: mongoose.Types.ObjectId
      limit?: number
    }
  ): Promise<ISessionSummary[]> {
    return SessionSummary.getRecentSummaries(userId, options)
  }

  /**
   * 根据 sessionId 获取摘要
   */
  async getBySessionId(sessionId: string): Promise<ISessionSummary | null> {
    return SessionSummary.getBySessionId(sessionId)
  }

  /**
   * 格式化摘要为上下文文本
   */
  formatForContext(summary: ISessionSummary): string {
    return summary.toContextText()
  }

  /**
   * 格式化多个摘要为简洁的上下文
   */
  formatMultipleForContext(summaries: ISessionSummary[]): string {
    if (summaries.length === 0) return ''

    const lines: string[] = ['## 历史会话摘要']

    for (const summary of summaries.slice(0, 3)) {
      const date = summary.updatedAt.toLocaleDateString('zh-CN')
      const goal = summary.goal || '(无目标记录)'

      lines.push(`\n### ${date} 会话`)
      lines.push(`目标: ${goal}`)

      if (summary.decisions.length > 0) {
        const topDecisions = summary.decisions.slice(0, 2)
        lines.push(`关键决策: ${topDecisions.map(d => d.what).join('; ')}`)
      }

      if (summary.progress.length > 0) {
        lines.push(`完成: ${summary.progress.slice(0, 3).join(', ')}`)
      }

      if (summary.openQuestions.length > 0) {
        lines.push(`待确认: ${summary.openQuestions.slice(0, 2).join(', ')}`)
      }
    }

    return lines.join('\n')
  }

  /**
   * 判断是否需要生成新摘要
   */
  shouldGenerateSummary(
    messageCount: number,
    lastSummaryMessageCount: number
  ): boolean {
    // 每增加10条消息或首次超过5条消息时生成摘要
    const threshold = 10
    const minMessages = 5

    if (messageCount < minMessages) return false
    if (lastSummaryMessageCount === 0 && messageCount >= minMessages) return true
    return messageCount - lastSummaryMessageCount >= threshold
  }

  // ============ 私有方法 ============

  /**
   * 使用 AI 生成摘要
   */
  private async generateWithAI(messages: ConversationMessage[]): Promise<RawSummaryOutput> {
    // 构建对话文本
    const conversationText = messages
      .slice(-30) // 最多取最近30条消息
      .map((m, i) => {
        const content = m.content.slice(0, 500)
        const truncated = m.content.length > 500 ? '...(截断)' : ''
        return `[${i}] ${m.role}: ${content}${truncated}`
      })
      .join('\n\n')

    const prompt = `分析以下会话，生成结构化摘要。

会话消息:
${conversationText}

请返回JSON格式的摘要 (不要任何其他内容):
{
  "goal": "本次会话的主要目标 (一句话)",
  "constraints": ["约束条件1", "约束条件2"],
  "decisions": [
    {
      "what": "做了什么决策",
      "why": "为什么这样决策",
      "who": "用户/高管名称",
      "confidence": "high|medium|low"
    }
  ],
  "progress": ["完成的事项1", "完成的事项2"],
  "next_actions": ["下一步行动1", "下一步行动2"],
  "risks": ["风险项1"],
  "open_questions": ["未解决的问题1"]
}

注意:
1. 每个数组最多5项
2. 如果某类信息不存在，返回空数组
3. 只返回JSON，不要任何解释`

    try {
      const response = await anthropic.messages.create({
        model: 'claude-3-5-haiku-20241022',
        max_tokens: 1500,
        messages: [{ role: 'user', content: prompt }]
      })

      const textBlock = response.content.find(block => block.type === 'text')
      const text = textBlock?.text || '{}'

      // 尝试提取 JSON
      const jsonMatch = text.match(/\{[\s\S]*\}/)
      if (jsonMatch) {
        return JSON.parse(jsonMatch[0]) as RawSummaryOutput
      }

      return {}
    } catch (error) {
      console.error('Failed to generate summary with AI:', error)
      return {}
    }
  }
}

// 导出单例
export const sessionSummaryService = new SessionSummaryService()
