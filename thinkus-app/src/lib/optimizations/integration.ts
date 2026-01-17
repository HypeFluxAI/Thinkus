/**
 * Optimization Integration
 * 将优化模块与现有系统集成
 */

import Anthropic from '@anthropic-ai/sdk'
import { realtimeStream } from '@/lib/services/realtime-stream'
import { keywordDetector, KeywordDetectionResult } from './keyword-detector'
import { todoTracker, getTodoTracker, initTodoTracker } from './todo-tracker'
import { commentChecker } from './comment-checker'
import { contextWindowMonitor } from './context-monitor'
import { sessionRecovery } from './session-recovery'
import type { OptimizationEvent } from '@/types/optimization-events'
import type { Message } from './context-monitor'

/**
 * 优化集成配置
 */
export interface OptimizationConfig {
  enableKeywordDetection: boolean
  enableTodoTracking: boolean
  enableCommentCheck: boolean
  enableContextMonitor: boolean
  enableSessionRecovery: boolean
}

const defaultConfig: OptimizationConfig = {
  enableKeywordDetection: true,
  enableTodoTracking: true,
  enableCommentCheck: true,
  enableContextMonitor: true,
  enableSessionRecovery: true
}

/**
 * 优化集成服务
 * 统一管理所有优化模块
 */
export class OptimizationIntegration {
  private config: OptimizationConfig
  private claude?: Anthropic

  constructor(config: Partial<OptimizationConfig> = {}) {
    this.config = { ...defaultConfig, ...config }
  }

  /**
   * 初始化
   */
  initialize(claude: Anthropic): void {
    this.claude = claude

    if (this.config.enableTodoTracking) {
      initTodoTracker(claude)
    }

    if (this.config.enableContextMonitor) {
      contextWindowMonitor.setClient(claude)
    }
  }

  /**
   * 发送优化事件
   */
  private async emitEvent(projectId: string, event: OptimizationEvent): Promise<void> {
    try {
      await realtimeStream.emit(projectId, {
        type: event.type,
        data: event.data
      })
    } catch (error) {
      console.error('Failed to emit optimization event:', error)
    }
  }

  /**
   * 处理用户输入（请求前）
   */
  async beforeRequest(
    projectId: string,
    prompt: string,
    messages: Message[],
    maxTokens: number
  ): Promise<{
    processedPrompt: string
    keywordResult?: KeywordDetectionResult
    contextInjection?: string
    shouldContinue: boolean
  }> {
    let processedPrompt = prompt
    let keywordResult: KeywordDetectionResult | undefined
    let contextInjection: string | undefined
    let shouldContinue = true

    // 1. Magic Keyword 检测
    if (this.config.enableKeywordDetection) {
      keywordResult = keywordDetector.detect(prompt)

      if (keywordResult.detected) {
        processedPrompt = keywordResult.cleanedPrompt

        // 发送模式激活事件
        await this.emitEvent(projectId, {
          type: 'mode_activated',
          data: {
            mode: keywordResult.mode!,
            message: keywordDetector.generateActivationMessage(keywordResult),
            timestamp: new Date()
          }
        })

        // 启用Todo追踪
        if (keywordResult.triggers?.enableTodoContinuation) {
          getTodoTracker().enable(projectId)
        }
      }
    }

    // 2. 上下文监控
    if (this.config.enableContextMonitor) {
      const usedTokens = contextWindowMonitor.estimateTokens(messages)
      const check = contextWindowMonitor.check(usedTokens, maxTokens)

      if (check.action === 'warn') {
        contextInjection = contextWindowMonitor.generateWarningPrompt(check.usage)

        await this.emitEvent(projectId, {
          type: 'context_warning',
          data: {
            sessionId: projectId,
            usage: check.usage,
            usedTokens: check.usedTokens,
            maxTokens: check.maxTokens,
            message: check.message || ''
          }
        })
      } else if (check.action === 'compact' || check.action === 'emergency_compact') {
        await this.emitEvent(projectId, {
          type: 'context_compacting',
          data: {
            sessionId: projectId,
            isEmergency: check.action === 'emergency_compact',
            status: check.status
          }
        })

        const compactResult = await contextWindowMonitor.compact(
          messages,
          check.action === 'emergency_compact'
        )

        if (compactResult.success) {
          await this.emitEvent(projectId, {
            type: 'context_compacted',
            data: {
              sessionId: projectId,
              originalTokens: compactResult.originalTokens,
              compactedTokens: compactResult.compactedTokens,
              savedTokens: compactResult.originalTokens - compactResult.compactedTokens
            }
          })
        }
      }
    }

    // 3. 从需求提取Todo
    if (this.config.enableTodoTracking && getTodoTracker().isEnabled(projectId)) {
      const todos = await getTodoTracker().extractFromRequirement(projectId, processedPrompt)

      if (todos.length > 0) {
        await this.emitEvent(projectId, {
          type: 'todo_list_created',
          data: {
            projectId,
            todos
          }
        })
      }
    }

    return {
      processedPrompt,
      keywordResult,
      contextInjection,
      shouldContinue
    }
  }

  /**
   * 处理AI响应（响应后）
   */
  async afterResponse(
    projectId: string,
    response: string,
    codeChanges?: Array<{ path: string; content: string }>
  ): Promise<{
    canComplete: boolean
    continuationPrompt?: string
    commentIssues?: number
  }> {
    let canComplete = true
    let continuationPrompt: string | undefined
    let commentIssues = 0

    // 1. 检查代码注释
    if (this.config.enableCommentCheck && codeChanges) {
      const results = commentChecker.checkFiles(
        codeChanges.map(c => ({ path: c.path, content: c.content }))
      )

      if (results.length > 0) {
        const summary = commentChecker.getSummaryReport(results)
        commentIssues = summary.totalIssues

        if (summary.redundant > 0) {
          await this.emitEvent(projectId, {
            type: 'comment_check_result',
            data: {
              projectId,
              issues: summary.totalIssues,
              suggestions: commentChecker.generateSuggestions(results),
              files: results.map(r => r.file)
            }
          })
        }
      }

      // 从新代码中提取Todo
      if (this.config.enableTodoTracking) {
        for (const change of codeChanges) {
          getTodoTracker().extractFromCode(projectId, change.content)
        }
      }
    }

    // 2. 检查Todo完成情况
    if (this.config.enableTodoTracking && getTodoTracker().isEnabled(projectId)) {
      const todoCheck = getTodoTracker().checkCanStop(projectId)

      if (!todoCheck.canStop) {
        canComplete = false
        continuationPrompt = getTodoTracker().generateContinuationPrompt(projectId)

        await this.emitEvent(projectId, {
          type: 'todo_continuation',
          data: {
            projectId,
            message: todoCheck.reason,
            todos: todoCheck.incompleteTodos,
            stats: todoCheck.stats
          }
        })
      }
    }

    return {
      canComplete,
      continuationPrompt,
      commentIssues
    }
  }

  /**
   * 处理错误（错误恢复）
   */
  async handleError(
    projectId: string,
    error: Error,
    retryFn: () => Promise<unknown>,
    compactFn?: () => Promise<void>
  ): Promise<{
    recovered: boolean
    userMessage?: string
  }> {
    if (!this.config.enableSessionRecovery) {
      return { recovered: false }
    }

    const errorType = sessionRecovery.analyzeError(error)

    await this.emitEvent(projectId, {
      type: 'session_recovering',
      data: {
        sessionId: projectId,
        errorType,
        retryCount: 0
      }
    })

    const result = await sessionRecovery.recover(error, retryFn, compactFn)

    if (result.success) {
      await this.emitEvent(projectId, {
        type: 'session_recovered',
        data: {
          sessionId: projectId,
          action: result.action,
          success: true
        }
      })
    } else {
      await this.emitEvent(projectId, {
        type: 'session_recovery_failed',
        data: {
          sessionId: projectId,
          errorType: result.errorType,
          message: result.action,
          userNotification: result.userNotification || '请重试'
        }
      })
    }

    return {
      recovered: result.success,
      userMessage: result.userNotification
    }
  }

  /**
   * 标记Todo完成
   */
  markTodoCompleted(projectId: string, description: string): void {
    if (this.config.enableTodoTracking) {
      getTodoTracker().markCompletedByDescription(projectId, description)
    }
  }

  /**
   * 清理项目资源
   */
  cleanup(projectId: string): void {
    if (this.config.enableTodoTracking) {
      getTodoTracker().clear(projectId)
    }
  }

  /**
   * 获取项目状态
   */
  getStatus(projectId: string): {
    todoStats?: { total: number; completed: number; pending: number }
    modeActive?: string
  } {
    const status: ReturnType<typeof this.getStatus> = {}

    if (this.config.enableTodoTracking && getTodoTracker().isEnabled(projectId)) {
      status.todoStats = getTodoTracker().getStats(projectId)
    }

    return status
  }
}

// 导出单例
export const optimizationIntegration = new OptimizationIntegration()
