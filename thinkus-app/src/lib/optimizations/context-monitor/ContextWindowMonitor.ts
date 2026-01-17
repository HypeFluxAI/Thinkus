/**
 * Context Window Monitor
 * 主动监控上下文使用率，提前压缩避免撞墙
 */

import Anthropic from '@anthropic-ai/sdk'
import {
  ContextStatus,
  ContextCheckResult,
  CompactResult,
  Message,
  ContextMonitorConfig
} from './types'
import { getHaikuModel } from '@/lib/ai/model-router'

export class ContextWindowMonitor {
  private config: ContextMonitorConfig = {
    thresholds: {
      warning: 0.70,
      compact: 0.85,
      emergency: 0.95
    },
    compactSettings: {
      keepCountNormal: 6, // 保留3轮对话
      keepCountEmergency: 2 // 紧急时保留1轮
    }
  }

  constructor(private claude?: Anthropic) {}

  /**
   * 设置Anthropic客户端
   */
  setClient(claude: Anthropic): void {
    this.claude = claude
  }

  /**
   * 更新配置
   */
  updateConfig(config: Partial<ContextMonitorConfig>): void {
    if (config.thresholds) {
      this.config.thresholds = { ...this.config.thresholds, ...config.thresholds }
    }
    if (config.compactSettings) {
      this.config.compactSettings = { ...this.config.compactSettings, ...config.compactSettings }
    }
  }

  /**
   * 检查上下文状态
   */
  check(usedTokens: number, maxTokens: number): ContextCheckResult {
    const usage = usedTokens / maxTokens

    if (usage >= this.config.thresholds.emergency) {
      return {
        status: 'emergency',
        usage,
        usedTokens,
        maxTokens,
        action: 'emergency_compact',
        message: `⚠️ 上下文 ${Math.round(usage * 100)}%，紧急压缩中...`
      }
    }

    if (usage >= this.config.thresholds.compact) {
      return {
        status: 'critical',
        usage,
        usedTokens,
        maxTokens,
        action: 'compact',
        message: `📦 上下文 ${Math.round(usage * 100)}%，优化压缩中...`
      }
    }

    if (usage >= this.config.thresholds.warning) {
      return {
        status: 'warning',
        usage,
        usedTokens,
        maxTokens,
        action: 'warn',
        message: `💡 上下文还有 ${Math.round((1 - usage) * 100)}% 空间，保持高质量输出`
      }
    }

    return {
      status: 'normal',
      usage,
      usedTokens,
      maxTokens,
      action: 'continue'
    }
  }

  /**
   * 执行压缩
   */
  async compact(messages: Message[], isEmergency: boolean = false): Promise<CompactResult> {
    const keepCount = isEmergency
      ? this.config.compactSettings.keepCountEmergency
      : this.config.compactSettings.keepCountNormal

    if (messages.length <= keepCount) {
      return {
        success: true,
        originalTokens: 0,
        compactedTokens: 0,
        summary: '消息数量较少，无需压缩'
      }
    }

    const oldMessages = messages.slice(0, -keepCount)

    // 生成摘要
    const summary = await this.generateSummary(oldMessages, isEmergency)

    return {
      success: true,
      originalTokens: this.estimateTokens(oldMessages),
      compactedTokens: this.estimateTokens([{ role: 'system', content: summary }]),
      summary
    }
  }

  /**
   * 生成会话摘要
   */
  private async generateSummary(messages: Message[], brief: boolean): Promise<string> {
    if (!this.claude) {
      return this.generateFallbackSummary(messages, brief)
    }

    const maxTokens = brief ? 200 : 500
    const conversationText = messages.map(m => `[${m.role}]: ${m.content}`).join('\n')

    const prompt = brief
      ? `用50字总结核心内容:\n${conversationText}`
      : `压缩为摘要，保留关键信息:\n${conversationText}\n\n格式:\n- 用户需求: xxx\n- 已完成: xxx\n- 进度: xxx`

    try {
      const response = await this.claude.messages.create({
        model: getHaikuModel(),
        max_tokens: maxTokens,
        messages: [{ role: 'user', content: prompt }]
      })

      const textBlock = response.content.find(block => block.type === 'text')
      return textBlock && textBlock.type === 'text' ? textBlock.text : this.generateFallbackSummary(messages, brief)
    } catch {
      return this.generateFallbackSummary(messages, brief)
    }
  }

  /**
   * 降级摘要生成
   */
  private generateFallbackSummary(messages: Message[], brief: boolean): string {
    const userMessages = messages.filter(m => m.role === 'user')
    const lastUserMessage = userMessages[userMessages.length - 1]

    if (brief) {
      return lastUserMessage?.content.slice(0, 100) || '会话进行中'
    }

    return `会话摘要:
- 消息数: ${messages.length}
- 最后话题: ${lastUserMessage?.content.slice(0, 200) || '无'}`
  }

  /**
   * 估算token数量
   */
  estimateTokens(messages: Message[]): number {
    return messages.reduce((sum, m) => sum + Math.ceil(m.content.length / 4), 0)
  }

  /**
   * 估算字符串的token数
   */
  estimateStringTokens(text: string): number {
    return Math.ceil(text.length / 4)
  }

  /**
   * 生成警告提示
   */
  generateWarningPrompt(usage: number): string {
    return `[系统] 上下文使用率 ${Math.round(usage * 100)}%，还有空间，请保持高质量输出。`
  }

  /**
   * 获取状态标签
   */
  getStatusLabel(status: ContextStatus): string {
    const labels: Record<ContextStatus, string> = {
      normal: '🟢 正常',
      warning: '🟡 注意',
      critical: '🟠 需压缩',
      emergency: '🔴 紧急'
    }
    return labels[status]
  }

  /**
   * 创建压缩后的消息列表
   */
  createCompactedMessages(
    originalMessages: Message[],
    summary: string,
    keepCount: number
  ): Message[] {
    const summaryMessage: Message = {
      role: 'system',
      content: `[会话摘要]\n${summary}\n\n[继续对话]`
    }
    return [summaryMessage, ...originalMessages.slice(-keepCount)]
  }
}

export const contextWindowMonitor = new ContextWindowMonitor()
