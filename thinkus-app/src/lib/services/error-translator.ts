/**
 * 错误翻译服务
 * 将技术错误翻译为小白用户能理解的人话
 */

import {
  FRIENDLY_ERRORS,
  FriendlyError,
  ErrorCategory,
  ErrorSeverity,
  SEVERITY_CONFIG,
  ERROR_CATEGORY_LABELS,
} from '@/lib/errors/friendly-errors'

export interface TranslatedError {
  /** 原始错误信息 */
  original: string
  /** 匹配的友好错误 */
  friendly: FriendlyError
  /** 是否找到匹配 */
  matched: boolean
  /** 翻译时间 */
  translatedAt: Date
}

export interface RetryConfig {
  /** 是否可重试 */
  canRetry: boolean
  /** 重试延迟(秒) */
  delay: number
  /** 最大重试次数 */
  maxRetries: number
  /** 当前重试次数 */
  currentRetry: number
}

export interface ErrorHistory {
  /** 错误代码 */
  code: string
  /** 发生次数 */
  count: number
  /** 首次发生 */
  firstOccurred: Date
  /** 最后发生 */
  lastOccurred: Date
}

/**
 * 错误翻译服务类
 */
export class ErrorTranslatorService {
  private errorHistory: Map<string, ErrorHistory> = new Map()
  private retryCounters: Map<string, number> = new Map()

  /**
   * 将技术错误翻译为人话
   */
  translateError(errorMessage: string): TranslatedError {
    const normalizedMessage = errorMessage.toLowerCase()

    // 遍历所有友好错误定义，找到匹配的
    for (const friendlyError of FRIENDLY_ERRORS) {
      const pattern = typeof friendlyError.pattern === 'string'
        ? new RegExp(friendlyError.pattern, 'i')
        : friendlyError.pattern

      if (pattern.test(normalizedMessage)) {
        // 记录错误历史
        this.recordError(friendlyError.code)

        return {
          original: errorMessage,
          friendly: friendlyError,
          matched: true,
          translatedAt: new Date(),
        }
      }
    }

    // 没有找到匹配，使用最后一个（通用错误）
    const fallback = FRIENDLY_ERRORS[FRIENDLY_ERRORS.length - 1]
    this.recordError(fallback.code)

    return {
      original: errorMessage,
      friendly: fallback,
      matched: false,
      translatedAt: new Date(),
    }
  }

  /**
   * 获取重试配置
   */
  getRetryConfig(errorCode: string): RetryConfig {
    const friendlyError = FRIENDLY_ERRORS.find(e => e.code === errorCode)
    const currentRetry = this.retryCounters.get(errorCode) || 0

    if (!friendlyError || !friendlyError.canRetry) {
      return {
        canRetry: false,
        delay: 0,
        maxRetries: 0,
        currentRetry,
      }
    }

    const maxRetries = friendlyError.maxRetries || 3
    const canRetry = currentRetry < maxRetries

    return {
      canRetry,
      delay: friendlyError.retryDelay || 10,
      maxRetries,
      currentRetry,
    }
  }

  /**
   * 判断是否应该自动重试
   */
  shouldAutoRetry(errorCode: string): boolean {
    const config = this.getRetryConfig(errorCode)
    return config.canRetry && config.currentRetry < config.maxRetries
  }

  /**
   * 增加重试计数
   */
  incrementRetryCount(errorCode: string): number {
    const current = this.retryCounters.get(errorCode) || 0
    const newCount = current + 1
    this.retryCounters.set(errorCode, newCount)
    return newCount
  }

  /**
   * 重置重试计数
   */
  resetRetryCount(errorCode: string): void {
    this.retryCounters.delete(errorCode)
  }

  /**
   * 判断是否是致命错误（不可恢复）
   */
  isFatalError(errorCode: string): boolean {
    const friendlyError = FRIENDLY_ERRORS.find(e => e.code === errorCode)
    return friendlyError?.severity === 'fatal'
  }

  /**
   * 获取错误的严重程度
   */
  getSeverity(errorCode: string): ErrorSeverity {
    const friendlyError = FRIENDLY_ERRORS.find(e => e.code === errorCode)
    return friendlyError?.severity || 'error'
  }

  /**
   * 获取错误分类
   */
  getCategory(errorCode: string): ErrorCategory {
    const friendlyError = FRIENDLY_ERRORS.find(e => e.code === errorCode)
    return friendlyError?.category || 'unknown'
  }

  /**
   * 获取错误分类的人话描述
   */
  getCategoryLabel(category: ErrorCategory): string {
    return ERROR_CATEGORY_LABELS[category] || '其他问题'
  }

  /**
   * 获取严重程度的样式配置
   */
  getSeverityConfig(severity: ErrorSeverity) {
    return SEVERITY_CONFIG[severity]
  }

  /**
   * 记录错误历史
   */
  private recordError(code: string): void {
    const now = new Date()
    const existing = this.errorHistory.get(code)

    if (existing) {
      existing.count++
      existing.lastOccurred = now
    } else {
      this.errorHistory.set(code, {
        code,
        count: 1,
        firstOccurred: now,
        lastOccurred: now,
      })
    }
  }

  /**
   * 获取错误历史
   */
  getErrorHistory(): ErrorHistory[] {
    return Array.from(this.errorHistory.values())
  }

  /**
   * 获取指定错误的历史
   */
  getErrorHistoryByCode(code: string): ErrorHistory | undefined {
    return this.errorHistory.get(code)
  }

  /**
   * 清除错误历史
   */
  clearErrorHistory(): void {
    this.errorHistory.clear()
    this.retryCounters.clear()
  }

  /**
   * 获取错误统计
   */
  getErrorStats(): {
    totalErrors: number
    byCategory: Record<ErrorCategory, number>
    bySeverity: Record<ErrorSeverity, number>
    topErrors: Array<{ code: string; count: number }>
  } {
    const byCategory: Record<ErrorCategory, number> = {
      network: 0,
      database: 0,
      deployment: 0,
      auth: 0,
      payment: 0,
      api: 0,
      build: 0,
      resource: 0,
      config: 0,
      unknown: 0,
    }

    const bySeverity: Record<ErrorSeverity, number> = {
      info: 0,
      warning: 0,
      error: 0,
      fatal: 0,
    }

    let totalErrors = 0
    const errorCounts: Array<{ code: string; count: number }> = []

    this.errorHistory.forEach((history, code) => {
      totalErrors += history.count
      errorCounts.push({ code, count: history.count })

      const friendlyError = FRIENDLY_ERRORS.find(e => e.code === code)
      if (friendlyError) {
        byCategory[friendlyError.category] = (byCategory[friendlyError.category] || 0) + history.count
        bySeverity[friendlyError.severity] = (bySeverity[friendlyError.severity] || 0) + history.count
      }
    })

    // 排序获取top错误
    errorCounts.sort((a, b) => b.count - a.count)
    const topErrors = errorCounts.slice(0, 10)

    return {
      totalErrors,
      byCategory,
      bySeverity,
      topErrors,
    }
  }

  /**
   * 生成用户友好的错误摘要
   */
  generateUserSummary(errorMessage: string): string {
    const translated = this.translateError(errorMessage)
    const { friendly } = translated

    return \`\${friendly.icon} \${friendly.title}\n\${friendly.description}\n\n建议: \${friendly.suggestion}\`
  }

  /**
   * 生成错误报告（用于客服）
   */
  generateSupportReport(errorMessage: string): {
    userFriendly: string
    technical: string
    suggestions: string[]
    canAutoFix: boolean
  } {
    const translated = this.translateError(errorMessage)
    const { friendly, original } = translated

    const suggestions: string[] = [friendly.suggestion]

    if (friendly.canRetry) {
      suggestions.push(\`可以\${friendly.retryDelay}秒后自动重试\`)
    }

    if (friendly.severity === 'fatal') {
      suggestions.push('需要技术支持介入')
    }

    return {
      userFriendly: \`\${friendly.title}: \${friendly.description}\`,
      technical: \`[\${friendly.code}] \${original}\`,
      suggestions,
      canAutoFix: friendly.canRetry && friendly.severity !== 'fatal',
    }
  }
}

// 单例实例
let errorTranslatorInstance: ErrorTranslatorService | null = null

/**
 * 获取错误翻译服务实例
 */
export function getErrorTranslator(): ErrorTranslatorService {
  if (!errorTranslatorInstance) {
    errorTranslatorInstance = new ErrorTranslatorService()
  }
  return errorTranslatorInstance
}

/**
 * 快捷方法：翻译错误
 */
export function translateError(errorMessage: string): TranslatedError {
  return getErrorTranslator().translateError(errorMessage)
}

/**
 * 快捷方法：判断是否应该自动重试
 */
export function shouldAutoRetry(errorCode: string): boolean {
  return getErrorTranslator().shouldAutoRetry(errorCode)
}

/**
 * 快捷方法：判断是否是致命错误
 */
export function isFatalError(errorCode: string): boolean {
  return getErrorTranslator().isFatalError(errorCode)
}

export default ErrorTranslatorService
