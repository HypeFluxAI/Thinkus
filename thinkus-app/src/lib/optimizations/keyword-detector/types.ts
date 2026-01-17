/**
 * Magic Keyword Detector Types
 * 检测用户输入中的关键词，自动触发对应模式
 */

export type DetectedMode = 'ultrawork' | 'search' | 'analyze'

export interface KeywordConfig {
  mode: DetectedMode
  keywords: {
    zh: string[]
    en: string[]
  }
  triggers: {
    enableSubagents: boolean
    enableTodoContinuation: boolean
    enableFullVerify: boolean
    priorityAgents?: string[]
  }
}

export interface KeywordDetectionResult {
  detected: boolean
  mode?: DetectedMode
  matchedKeyword?: string
  triggers?: KeywordConfig['triggers']
  cleanedPrompt: string
}
