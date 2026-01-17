/**
 * Session Recovery
 * 会话恢复，处理各类错误并尝试自动恢复
 */

import { ErrorType, RecoveryResult, SessionRecoveryConfig, ErrorPattern } from './types'

export class SessionRecovery {
  private config: SessionRecoveryConfig = {
    maxRetries: 3,
    retryDelays: [1000, 2000, 5000],
    enableAutoRecovery: true
  }

  private errorPatterns: ErrorPattern[] = [
    { pattern: /rate.?limit|429/i, type: 'rate_limit' },
    { pattern: /timeout/i, type: 'timeout' },
    { pattern: /context.*(exceed|too.?long|limit)/i, type: 'context_exceeded' },
    { pattern: /thinking/i, type: 'thinking_block' },
    { pattern: /empty|no.?content/i, type: 'empty_message' },
    { pattern: /network|connection|ECONNREFUSED|ENOTFOUND/i, type: 'network_error' },
    { pattern: /auth|unauthorized|401|403/i, type: 'auth_error' },
  ]

  /**
   * 更新配置
   */
  updateConfig(config: Partial<SessionRecoveryConfig>): void {
    this.config = { ...this.config, ...config }
  }

  /**
   * 添加自定义错误模式
   */
  addErrorPattern(pattern: ErrorPattern): void {
    this.errorPatterns.push(pattern)
  }

  /**
   * 分析错误类型
   */
  analyzeError(error: Error | string): ErrorType {
    const msg = typeof error === 'string' ? error : error.message
    const lowerMsg = msg.toLowerCase()

    for (const { pattern, type } of this.errorPatterns) {
      if (typeof pattern === 'string') {
        if (lowerMsg.includes(pattern.toLowerCase())) {
          return type
        }
      } else if (pattern.test(msg)) {
        return type
      }
    }

    return 'unknown'
  }

  /**
   * 尝试恢复
   */
  async recover(
    error: Error | string,
    retryFn: () => Promise<unknown>,
    compactFn?: () => Promise<void>
  ): Promise<RecoveryResult> {
    if (!this.config.enableAutoRecovery) {
      return {
        success: false,
        errorType: this.analyzeError(error),
        action: '自动恢复已禁用',
        userNotification: '请手动重试'
      }
    }

    const errorType = this.analyzeError(error)

    switch (errorType) {
      case 'rate_limit':
        return this.handleWithRetry(errorType, retryFn, '服务繁忙，等待重试中...')

      case 'timeout':
        return this.handleWithRetry(errorType, retryFn, '请求超时，重试中...')

      case 'context_exceeded':
        return this.handleContextExceeded(errorType, retryFn, compactFn)

      case 'thinking_block':
      case 'empty_message':
        return this.handleWithRetry(errorType, retryFn, '响应异常，重试中...')

      case 'network_error':
        return this.handleWithRetry(errorType, retryFn, '网络问题，重试中...')

      case 'auth_error':
        return {
          success: false,
          errorType,
          action: '认证失败',
          userNotification: '请检查API密钥配置'
        }

      default:
        return {
          success: false,
          errorType,
          action: '未知错误',
          userNotification: '遇到问题，请重试'
        }
    }
  }

  /**
   * 处理需要压缩的情况
   */
  private async handleContextExceeded(
    errorType: ErrorType,
    retryFn: () => Promise<unknown>,
    compactFn?: () => Promise<void>
  ): Promise<RecoveryResult> {
    if (compactFn) {
      try {
        await compactFn()
        await retryFn()
        return {
          success: true,
          errorType,
          action: '压缩后重试成功'
        }
      } catch {
        return {
          success: false,
          errorType,
          action: '压缩后仍失败',
          userNotification: '对话过长，请开始新会话'
        }
      }
    }

    return {
      success: false,
      errorType,
      action: '无法压缩',
      userNotification: '对话过长，请开始新会话'
    }
  }

  /**
   * 带重试的恢复
   */
  private async handleWithRetry(
    errorType: ErrorType,
    retryFn: () => Promise<unknown>,
    userMessage: string
  ): Promise<RecoveryResult> {
    for (let i = 0; i < this.config.maxRetries; i++) {
      await this.sleep(this.config.retryDelays[i] || this.config.retryDelays[this.config.retryDelays.length - 1])

      try {
        await retryFn()
        return {
          success: true,
          errorType,
          action: `第${i + 1}次重试成功`,
          retryCount: i + 1
        }
      } catch {
        continue
      }
    }

    return {
      success: false,
      errorType,
      action: '重试失败',
      retryCount: this.config.maxRetries,
      userNotification: userMessage.replace('重试中...', '请稍后再试')
    }
  }

  private sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms))
  }

  /**
   * 获取错误类型的用户友好描述
   */
  getErrorDescription(errorType: ErrorType): string {
    const descriptions: Record<ErrorType, string> = {
      rate_limit: 'API调用频率超限',
      timeout: '请求超时',
      context_exceeded: '对话上下文过长',
      thinking_block: 'AI思考过程异常',
      empty_message: '收到空响应',
      network_error: '网络连接问题',
      auth_error: '认证失败',
      unknown: '未知错误'
    }
    return descriptions[errorType]
  }

  /**
   * 判断错误是否可恢复
   */
  isRecoverable(errorType: ErrorType): boolean {
    const nonRecoverable: ErrorType[] = ['auth_error']
    return !nonRecoverable.includes(errorType)
  }

  /**
   * 获取建议的等待时间
   */
  getSuggestedWaitTime(errorType: ErrorType): number {
    const waitTimes: Record<ErrorType, number> = {
      rate_limit: 5000,
      timeout: 2000,
      context_exceeded: 0,
      thinking_block: 1000,
      empty_message: 1000,
      network_error: 3000,
      auth_error: 0,
      unknown: 2000
    }
    return waitTimes[errorType]
  }
}

export const sessionRecovery = new SessionRecovery()
