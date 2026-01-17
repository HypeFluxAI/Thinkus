/**
 * Context Window Monitor Types
 * 监控上下文使用率，提前压缩避免撞墙
 */

export type ContextStatus = 'normal' | 'warning' | 'critical' | 'emergency'
export type ContextAction = 'continue' | 'warn' | 'compact' | 'emergency_compact'

export interface ContextCheckResult {
  status: ContextStatus
  usage: number
  usedTokens: number
  maxTokens: number
  action: ContextAction
  message?: string
}

export interface CompactResult {
  success: boolean
  originalTokens: number
  compactedTokens: number
  summary: string
}

export interface Message {
  role: 'user' | 'assistant' | 'system'
  content: string
}

export interface ContextMonitorConfig {
  thresholds: {
    warning: number
    compact: number
    emergency: number
  }
  compactSettings: {
    keepCountNormal: number
    keepCountEmergency: number
  }
}
