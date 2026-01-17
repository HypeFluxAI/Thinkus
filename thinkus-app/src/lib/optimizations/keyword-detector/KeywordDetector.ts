/**
 * Magic Keyword Detector
 * 检测用户输入中的关键词，自动触发对应模式
 */

import { DetectedMode, KeywordConfig, KeywordDetectionResult } from './types'

export class KeywordDetector {
  private configs: KeywordConfig[] = [
    {
      mode: 'ultrawork',
      keywords: {
        zh: ['全力', '开工', '猛干', '冲', '加油干', '使劲干'],
        en: ['ultrawork', 'ulw', 'fullpower', 'gogogo', 'allout']
      },
      triggers: {
        enableSubagents: true,
        enableTodoContinuation: true,
        enableFullVerify: true
      }
    },
    {
      mode: 'search',
      keywords: {
        zh: ['搜索', '找一下', '查一下', '研究一下', '调查'],
        en: ['search', 'find', 'research', 'lookup']
      },
      triggers: {
        enableSubagents: true,
        enableTodoContinuation: false,
        enableFullVerify: false,
        priorityAgents: ['librarian']
      }
    },
    {
      mode: 'analyze',
      keywords: {
        zh: ['分析', '调研', '诊断', '评估', '审查'],
        en: ['analyze', 'investigate', 'diagnose', 'evaluate']
      },
      triggers: {
        enableSubagents: true,
        enableTodoContinuation: false,
        enableFullVerify: false,
        priorityAgents: ['david', 'elena', 'grace', 'frank']
      }
    }
  ]

  /**
   * 检测prompt中的关键词
   */
  detect(prompt: string): KeywordDetectionResult {
    const lowerPrompt = prompt.toLowerCase()

    for (const config of this.configs) {
      // 检测中文
      for (const keyword of config.keywords.zh) {
        if (prompt.includes(keyword)) {
          return {
            detected: true,
            mode: config.mode,
            matchedKeyword: keyword,
            triggers: config.triggers,
            cleanedPrompt: this.removeKeyword(prompt, keyword)
          }
        }
      }

      // 检测英文
      for (const keyword of config.keywords.en) {
        if (lowerPrompt.includes(keyword.toLowerCase())) {
          return {
            detected: true,
            mode: config.mode,
            matchedKeyword: keyword,
            triggers: config.triggers,
            cleanedPrompt: this.removeKeyword(prompt, keyword)
          }
        }
      }
    }

    return { detected: false, cleanedPrompt: prompt }
  }

  private removeKeyword(prompt: string, keyword: string): string {
    const regex = new RegExp(`\\s*${keyword}\\s*`, 'gi')
    return prompt.replace(regex, ' ').trim()
  }

  /**
   * 生成激活提示消息
   */
  generateActivationMessage(result: KeywordDetectionResult): string {
    if (!result.detected || !result.mode) return ''

    const messages: Record<DetectedMode, string> = {
      ultrawork: `🚀 「全力模式」已启动
• 并行执行: ✓
• 任务追踪: ✓
• 完整验证: ✓
完成后会通知您`,
      search: `🔍 「搜索模式」已启动
• 研究员已就位
• 搜索官方文档+GitHub+网络`,
      analyze: `📊 「分析模式」已启动
• 多维度并行分析
• 技术/设计/商业/市场`
    }

    return messages[result.mode]
  }

  /**
   * 添加自定义关键词配置
   */
  addConfig(config: KeywordConfig): void {
    this.configs.push(config)
  }

  /**
   * 获取所有配置
   */
  getConfigs(): KeywordConfig[] {
    return [...this.configs]
  }
}

export const keywordDetector = new KeywordDetector()
