/**
 * AI Capability Detector
 * 检测用户需求中的AI功能需求，推荐合适的AI组件
 */

import {
  AICapabilityType,
  AICapabilityConfig,
  CapabilityDetectionResult,
  AICapabilitySuggestion,
  UsageEstimate
} from './types'

export class AICapabilityDetector {
  private capabilities: AICapabilityConfig[] = [
    {
      type: 'chatbot',
      keywords: {
        zh: ['聊天', '机器人', '客服', 'FAQ', '问答', '对话', '智能助手'],
        en: ['chatbot', 'chat bot', 'customer service', 'faq', 'qa', 'assistant']
      },
      component: 'AIChatBot',
      description: '智能对话机器人，支持多轮对话和上下文理解',
      complexity: 'medium',
      estimatedTokensPerRequest: 1000
    },
    {
      type: 'image_gen',
      keywords: {
        zh: ['生成图片', '头像', '图像', '图片生成', 'AI绘画', '画图'],
        en: ['image generation', 'avatar', 'generate image', 'ai art', 'picture']
      },
      component: 'AIImageGenerator',
      description: '图像生成组件，支持文本到图像转换',
      complexity: 'high',
      estimatedTokensPerRequest: 0 // 使用图像API
    },
    {
      type: 'content_gen',
      keywords: {
        zh: ['生成文案', '写内容', '文章生成', '写作助手', '文本生成', '创作'],
        en: ['content generation', 'write content', 'copywriting', 'text generation']
      },
      component: 'AIContentGenerator',
      description: '内容生成组件，支持各类文本创作',
      complexity: 'medium',
      estimatedTokensPerRequest: 2000
    },
    {
      type: 'summarizer',
      keywords: {
        zh: ['摘要', '总结', '概括', '提炼', '精简'],
        en: ['summary', 'summarize', 'abstract', 'condense', 'brief']
      },
      component: 'AISummarizer',
      description: '文本摘要组件，自动提取关键信息',
      complexity: 'low',
      estimatedTokensPerRequest: 500
    },
    {
      type: 'recommendation',
      keywords: {
        zh: ['推荐', '个性化', '智能推荐', '猜你喜欢', '相关推荐'],
        en: ['recommendation', 'personalize', 'suggest', 'related', 'similar']
      },
      component: 'AIRecommendation',
      description: '智能推荐组件，基于用户行为推荐内容',
      complexity: 'high',
      estimatedTokensPerRequest: 800
    },
    {
      type: 'translator',
      keywords: {
        zh: ['翻译', '多语言', '国际化', '语言转换'],
        en: ['translate', 'translation', 'multilingual', 'i18n', 'localize']
      },
      component: 'AITranslator',
      description: '智能翻译组件，支持多语言互译',
      complexity: 'low',
      estimatedTokensPerRequest: 300
    },
    {
      type: 'code_assist',
      keywords: {
        zh: ['代码助手', '代码生成', '编程助手', '代码补全', '代码审查'],
        en: ['code assistant', 'code generation', 'coding helper', 'autocomplete', 'code review']
      },
      component: 'AICodeAssistant',
      description: '代码助手组件，支持代码生成和审查',
      complexity: 'high',
      estimatedTokensPerRequest: 1500
    },
    {
      type: 'voice_assist',
      keywords: {
        zh: ['语音', '语音识别', '语音合成', 'TTS', 'STT', '语音助手'],
        en: ['voice', 'speech recognition', 'text to speech', 'tts', 'stt', 'voice assistant']
      },
      component: 'AIVoiceAssistant',
      description: '语音助手组件，支持语音识别和合成',
      complexity: 'high',
      estimatedTokensPerRequest: 0 // 使用语音API
    },
    {
      type: 'data_analysis',
      keywords: {
        zh: ['数据分析', '数据洞察', '统计分析', '趋势分析', '报表'],
        en: ['data analysis', 'analytics', 'statistics', 'trend analysis', 'report']
      },
      component: 'AIDataAnalyzer',
      description: '数据分析组件，自动生成数据洞察',
      complexity: 'high',
      estimatedTokensPerRequest: 2000
    },
    {
      type: 'sentiment_analysis',
      keywords: {
        zh: ['情感分析', '舆情', '评论分析', '情绪识别', '口碑分析'],
        en: ['sentiment analysis', 'opinion mining', 'emotion detection', 'review analysis']
      },
      component: 'AISentimentAnalyzer',
      description: '情感分析组件，分析文本情感倾向',
      complexity: 'medium',
      estimatedTokensPerRequest: 400
    }
  ]

  /**
   * 检测文本中的AI功能需求
   */
  detect(text: string): CapabilityDetectionResult {
    const lowerText = text.toLowerCase()
    const detectedCapabilities: AICapabilityType[] = []
    const matchedKeywords: string[] = []
    const suggestions: AICapabilitySuggestion[] = []

    for (const capability of this.capabilities) {
      let matched = false

      // 检测中文关键词
      for (const keyword of capability.keywords.zh) {
        if (text.includes(keyword)) {
          matched = true
          matchedKeywords.push(keyword)
        }
      }

      // 检测英文关键词
      for (const keyword of capability.keywords.en) {
        if (lowerText.includes(keyword.toLowerCase())) {
          matched = true
          matchedKeywords.push(keyword)
        }
      }

      if (matched && !detectedCapabilities.includes(capability.type)) {
        detectedCapabilities.push(capability.type)
        suggestions.push(this.generateSuggestion(capability))
      }
    }

    return {
      detected: detectedCapabilities.length > 0,
      capabilities: detectedCapabilities,
      matchedKeywords: [...new Set(matchedKeywords)],
      suggestions
    }
  }

  /**
   * 生成功能建议
   */
  private generateSuggestion(capability: AICapabilityConfig): AICapabilitySuggestion {
    const apiOptions = this.getApiOptions(capability.type)
    const implementationHints = this.getImplementationHints(capability.type)

    return {
      type: capability.type,
      component: capability.component,
      description: capability.description,
      complexity: capability.complexity,
      apiOptions,
      implementationHints
    }
  }

  /**
   * 获取API选项
   */
  private getApiOptions(type: AICapabilityType): string[] {
    const options: Record<AICapabilityType, string[]> = {
      chatbot: ['Claude API', 'OpenAI GPT', '自定义模型'],
      image_gen: ['DALL-E', 'Stable Diffusion', 'Midjourney API'],
      content_gen: ['Claude API', 'OpenAI GPT', '自定义模型'],
      summarizer: ['Claude Haiku', 'OpenAI GPT-3.5', '本地模型'],
      recommendation: ['Claude API', '协同过滤', '基于内容推荐'],
      translator: ['DeepL API', 'Google Translate', 'Claude API'],
      code_assist: ['Claude API', 'GitHub Copilot', 'OpenAI Codex'],
      voice_assist: ['Whisper API', 'Google Speech', 'Azure Speech'],
      data_analysis: ['Claude API', 'OpenAI GPT-4', '自定义分析'],
      sentiment_analysis: ['Claude Haiku', 'BERT', '专用模型']
    }
    return options[type] || []
  }

  /**
   * 获取实现建议
   */
  private getImplementationHints(type: AICapabilityType): string[] {
    const hints: Record<AICapabilityType, string[]> = {
      chatbot: [
        '使用流式响应提升用户体验',
        '实现对话历史管理',
        '考虑添加意图识别'
      ],
      image_gen: [
        '添加生成进度提示',
        '实现图片缓存',
        '添加风格选项'
      ],
      content_gen: [
        '提供模板选择',
        '支持草稿保存',
        '添加长度控制'
      ],
      summarizer: [
        '支持多种摘要长度',
        '添加关键词提取',
        '支持批量处理'
      ],
      recommendation: [
        '收集用户反馈优化模型',
        '实现冷启动策略',
        '添加多样性控制'
      ],
      translator: [
        '支持语言自动检测',
        '添加术语库',
        '支持批量翻译'
      ],
      code_assist: [
        '集成IDE插件',
        '支持多语言',
        '添加代码解释功能'
      ],
      voice_assist: [
        '支持多种语言',
        '添加噪音处理',
        '优化响应延迟'
      ],
      data_analysis: [
        '支持可视化输出',
        '添加异常检测',
        '支持自然语言查询'
      ],
      sentiment_analysis: [
        '支持多维度情感',
        '添加关键词归因',
        '支持批量分析'
      ]
    }
    return hints[type] || []
  }

  /**
   * 估算使用量
   */
  estimateUsage(
    capabilities: AICapabilityType[],
    dailyRequests: number
  ): UsageEstimate {
    let totalTokens = 0
    const recommendations: string[] = []

    for (const type of capabilities) {
      const config = this.capabilities.find(c => c.type === type)
      if (config) {
        totalTokens += config.estimatedTokensPerRequest * dailyRequests

        if (config.complexity === 'high') {
          recommendations.push(`${config.component}: 考虑使用缓存减少API调用`)
        }
      }
    }

    // 估算成本 (假设 $3/1M tokens)
    const monthlyCost = (totalTokens * 30 * 3) / 1000000

    if (monthlyCost > 100) {
      recommendations.push('建议优化prompt长度减少token消耗')
    }

    if (capabilities.length > 3) {
      recommendations.push('建议分阶段实现功能，优先核心需求')
    }

    return {
      totalCapabilities: capabilities.length,
      estimatedDailyTokens: totalTokens,
      estimatedMonthlyCost: monthlyCost,
      recommendations
    }
  }

  /**
   * 获取所有支持的能力
   */
  getSupportedCapabilities(): AICapabilityConfig[] {
    return [...this.capabilities]
  }

  /**
   * 添加自定义能力
   */
  addCapability(config: AICapabilityConfig): void {
    this.capabilities.push(config)
  }

  /**
   * 生成能力报告
   */
  generateReport(result: CapabilityDetectionResult): string {
    if (!result.detected) {
      return '未检测到AI功能需求'
    }

    let report = `🤖 AI功能检测报告\n\n`
    report += `检测到 ${result.capabilities.length} 个AI功能需求:\n\n`

    for (const suggestion of result.suggestions) {
      const complexityIcon = {
        low: '🟢',
        medium: '🟡',
        high: '🔴'
      }[suggestion.complexity]

      report += `${complexityIcon} ${suggestion.component}\n`
      report += `   ${suggestion.description}\n`
      report += `   推荐API: ${suggestion.apiOptions.slice(0, 2).join(', ')}\n\n`
    }

    return report
  }
}

export const aiCapabilityDetector = new AICapabilityDetector()
