/**
 * AI Capability Detector Types
 * 检测用户需求中的AI功能需求
 */

export type AICapabilityType =
  | 'chatbot'
  | 'image_gen'
  | 'content_gen'
  | 'summarizer'
  | 'recommendation'
  | 'translator'
  | 'code_assist'
  | 'voice_assist'
  | 'data_analysis'
  | 'sentiment_analysis'

export interface AICapabilityConfig {
  type: AICapabilityType
  keywords: {
    zh: string[]
    en: string[]
  }
  component: string
  description: string
  complexity: 'low' | 'medium' | 'high'
  estimatedTokensPerRequest: number
}

export interface CapabilityDetectionResult {
  detected: boolean
  capabilities: AICapabilityType[]
  matchedKeywords: string[]
  suggestions: AICapabilitySuggestion[]
}

export interface AICapabilitySuggestion {
  type: AICapabilityType
  component: string
  description: string
  complexity: 'low' | 'medium' | 'high'
  apiOptions: string[]
  implementationHints: string[]
}

export interface UsageEstimate {
  totalCapabilities: number
  estimatedDailyTokens: number
  estimatedMonthlyCost: number
  recommendations: string[]
}
