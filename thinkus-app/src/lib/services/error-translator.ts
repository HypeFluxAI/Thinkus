/**
 * 错误翻译服务
 * 将技术错误信息翻译为小白用户能理解的人话
 */

import {
  FRIENDLY_ERRORS,
  FriendlyError,
  ErrorSeverity,
  ErrorCategory,
  ERROR_CATEGORY_LABELS,
  SEVERITY_CONFIG
} from '../errors/friendly-errors'

/**
 * 翻译后的错误信息
 */
export interface TranslatedError {
  /** 原始错误信息 */
  originalMessage: string
  /** 匹配到的错误定义 */
  error: FriendlyError
  /** 是否匹配到具体错误（非兜底） */
  isKnownError: boolean
  /** 重试配置 */
  retryConfig: RetryConfig | null
  /** 错误发生时间 */
  timestamp: Date
}

/**
 * 重试配置
 */
export interface RetryConfig {
  /** 是否可以重试 */
  canRetry: boolean
  /** 重试等待时间（秒） */
  retryDelay: number
  /** 最大重试次数 */
  maxRetries: number
  /** 当前重试次数 */
  currentRetry: number
}

/**
 * 错误统计
 */
export interface ErrorStats {
  /** 错误分类统计 */
  byCategory: Record<ErrorCategory, number>
  /** 严重程度统计 */
  bySeverity: Record<ErrorSeverity, number>
  /** 总错误数 */
  total: number
  /** 可重试错误数 */
  retryable: number
}

/**
 * 错误翻译服务类
 */
export class ErrorTranslatorService {
  private static instance: ErrorTranslatorService

  /** 错误历史记录（用于统计和分析） */
  private errorHistory: TranslatedError[] = []

  /** 最大历史记录数 */
  private readonly MAX_HISTORY = 100

  /** 重试计数器（按错误代码） */
  private retryCounters: Map<string, number> = new Map()

  private constructor() {}

  public static getInstance(): ErrorTranslatorService {
    if (!ErrorTranslatorService.instance) {
      ErrorTranslatorService.instance = new ErrorTranslatorService()
    }
    return ErrorTranslatorService.instance
  }

  /**
   * 翻译错误信息
   * @param error 原始错误（可以是 Error 对象、字符串或任意对象）
   * @returns 翻译后的错误信息
   */
  translateError(error: unknown): TranslatedError {
    const errorMessage = this.extractErrorMessage(error)
    const matchedError = this.findMatchingError(errorMessage)
    const isKnownError = matchedError.code !== 'UNKNOWN_ERROR'

    const currentRetry = this.retryCounters.get(matchedError.code) || 0

    const retryConfig: RetryConfig | null = matchedError.canRetry ? {
      canRetry: currentRetry < (matchedError.maxRetries || 1),
      retryDelay: matchedError.retryDelay || 30,
      maxRetries: matchedError.maxRetries || 1,
      currentRetry
    } : null

    const translated: TranslatedError = {
      originalMessage: errorMessage,
      error: matchedError,
      isKnownError,
      retryConfig,
      timestamp: new Date()
    }

    // 记录到历史
    this.addToHistory(translated)

    return translated
  }

  /**
   * 从各种错误格式中提取错误信息
   */
  private extractErrorMessage(error: unknown): string {
    if (error instanceof Error) {
      return error.message
    }
    if (typeof error === 'string') {
      return error
    }
    if (error && typeof error === 'object') {
      // 尝试常见的错误对象格式
      const obj = error as Record<string, unknown>
      if (obj.message && typeof obj.message === 'string') {
        return obj.message
      }
      if (obj.error && typeof obj.error === 'string') {
        return obj.error
      }
      if (obj.error && typeof obj.error === 'object') {
        const innerError = obj.error as Record<string, unknown>
        if (innerError.message && typeof innerError.message === 'string') {
          return innerError.message
        }
      }
      // 返回 JSON 字符串
      try {
        return JSON.stringify(error)
      } catch {
        return String(error)
      }
    }
    return String(error)
  }

  /**
   * 查找匹配的错误定义
   */
  private findMatchingError(errorMessage: string): FriendlyError {
    // 遍历所有错误定义（除了最后一个兜底错误）
    for (let i = 0; i < FRIENDLY_ERRORS.length - 1; i++) {
      const friendlyError = FRIENDLY_ERRORS[i]
      const pattern = friendlyError.pattern

      if (typeof pattern === 'string') {
        if (errorMessage.toLowerCase().includes(pattern.toLowerCase())) {
          return friendlyError
        }
      } else if (pattern instanceof RegExp) {
        if (pattern.test(errorMessage)) {
          return friendlyError
        }
      }
    }

    // 返回兜底错误
    return FRIENDLY_ERRORS[FRIENDLY_ERRORS.length - 1]
  }

  /**
   * 记录重试
   */
  recordRetry(errorCode: string): void {
    const current = this.retryCounters.get(errorCode) || 0
    this.retryCounters.set(errorCode, current + 1)
  }

  /**
   * 重置重试计数
   */
  resetRetry(errorCode: string): void {
    this.retryCounters.delete(errorCode)
  }

  /**
   * 重置所有重试计数
   */
  resetAllRetries(): void {
    this.retryCounters.clear()
  }

  /**
   * 获取重试配置
   */
  getRetryConfig(errorCode: string): RetryConfig | null {
    const errorDef = FRIENDLY_ERRORS.find(e => e.code === errorCode)
    if (!errorDef || !errorDef.canRetry) {
      return null
    }

    const currentRetry = this.retryCounters.get(errorCode) || 0
    return {
      canRetry: currentRetry < (errorDef.maxRetries || 1),
      retryDelay: errorDef.retryDelay || 30,
      maxRetries: errorDef.maxRetries || 1,
      currentRetry
    }
  }

  /**
   * 判断是否应该自动重试
   */
  shouldAutoRetry(error: unknown): boolean {
    const translated = this.translateError(error)
    return translated.retryConfig?.canRetry ?? false
  }

  /**
   * 获取错误统计
   */
  getErrorStats(): ErrorStats {
    const stats: ErrorStats = {
      byCategory: {
        network: 0,
        database: 0,
        deployment: 0,
        auth: 0,
        payment: 0,
        api: 0,
        build: 0,
        resource: 0,
        config: 0,
        unknown: 0
      },
      bySeverity: {
        info: 0,
        warning: 0,
        error: 0,
        fatal: 0
      },
      total: this.errorHistory.length,
      retryable: 0
    }

    for (const error of this.errorHistory) {
      stats.byCategory[error.error.category]++
      stats.bySeverity[error.error.severity]++
      if (error.retryConfig?.canRetry) {
        stats.retryable++
      }
    }

    return stats
  }

  /**
   * 获取最近的错误
   */
  getRecentErrors(count: number = 10): TranslatedError[] {
    return this.errorHistory.slice(-count)
  }

  /**
   * 清除错误历史
   */
  clearHistory(): void {
    this.errorHistory = []
  }

  /**
   * 添加到历史记录
   */
  private addToHistory(error: TranslatedError): void {
    this.errorHistory.push(error)
    // 保持历史记录在最大限制内
    if (this.errorHistory.length > this.MAX_HISTORY) {
      this.errorHistory.shift()
    }
  }

  /**
   * 获取错误分类的人话标签
   */
  getCategoryLabel(category: ErrorCategory): string {
    return ERROR_CATEGORY_LABELS[category]
  }

  /**
   * 获取严重程度的配置
   */
  getSeverityConfig(severity: ErrorSeverity) {
    return SEVERITY_CONFIG[severity]
  }

  /**
   * 生成用户友好的错误摘要
   * 用于发送给客服或技术支持
   */
  generateErrorSummary(error: TranslatedError): string {
    const lines = [
      `【错误报告】`,
      `时间: ${error.timestamp.toLocaleString('zh-CN')}`,
      `类型: ${this.getCategoryLabel(error.error.category)}`,
      `代码: ${error.error.code}`,
      `描述: ${error.error.title} - ${error.error.description}`,
      `原始信息: ${error.originalMessage.substring(0, 200)}`,
      `是否可重试: ${error.retryConfig?.canRetry ? '是' : '否'}`,
      error.retryConfig ? `重试次数: ${error.retryConfig.currentRetry}/${error.retryConfig.maxRetries}` : ''
    ].filter(Boolean)

    return lines.join('\n')
  }

  /**
   * 批量翻译错误
   */
  translateErrors(errors: unknown[]): TranslatedError[] {
    return errors.map(error => this.translateError(error))
  }

  /**
   * 检查是否是致命错误（不应重试）
   */
  isFatalError(error: unknown): boolean {
    const translated = this.translateError(error)
    return translated.error.severity === 'fatal'
  }

  /**
   * 获取建议的等待时间（基于错误类型）
   */
  getSuggestedWaitTime(error: unknown): number {
    const translated = this.translateError(error)
    return translated.retryConfig?.retryDelay || 30
  }
}

// 导出单例实例
export const errorTranslator = ErrorTranslatorService.getInstance()

// 导出便捷方法
export const translateError = (error: unknown) => errorTranslator.translateError(error)
export const shouldAutoRetry = (error: unknown) => errorTranslator.shouldAutoRetry(error)
export const isFatalError = (error: unknown) => errorTranslator.isFatalError(error)
