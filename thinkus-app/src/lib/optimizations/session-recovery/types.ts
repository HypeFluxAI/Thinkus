/**
 * Session Recovery Types
 * 会话恢复，处理各类错误
 */

export type ErrorType =
  | 'rate_limit'
  | 'timeout'
  | 'context_exceeded'
  | 'thinking_block'
  | 'empty_message'
  | 'network_error'
  | 'auth_error'
  | 'unknown'

export interface RecoveryResult {
  success: boolean
  errorType: ErrorType
  action: string
  retryCount?: number
  userNotification?: string
}

export interface SessionRecoveryConfig {
  maxRetries: number
  retryDelays: number[]
  enableAutoRecovery: boolean
}

export interface ErrorPattern {
  pattern: RegExp | string
  type: ErrorType
}
