'use client'

import { useState, useCallback, useRef } from 'react'
import type { FixSession, FixStrategy, ClassifiedError } from '@/lib/services'

interface UseAutofixOptions {
  projectId: string
  onFixStart?: () => void
  onFixSuccess?: (session: FixSession) => void
  onFixFailed?: (session: FixSession) => void
  onEscalate?: (session: FixSession) => void
  onError?: (error: string) => void
  maxAttempts?: number
  autoRetry?: boolean
}

interface UseAutofixReturn {
  session: FixSession | null
  isFixing: boolean
  error: string | null
  currentStrategy: FixStrategy | null
  progress: number
  attemptCount: number
  // 操作
  classifyError: (error: {
    code?: string
    message: string
    stack?: string
  }) => Promise<ClassifiedError | null>
  startFix: (classifiedError: ClassifiedError) => Promise<void>
  executeStrategy: (strategy: FixStrategy) => Promise<boolean>
  markSuccess: () => Promise<void>
  escalate: (reason?: string) => Promise<void>
  reset: () => void
}

/**
 * 错误自动修复 Hook
 */
export function useAutofix({
  projectId,
  onFixStart,
  onFixSuccess,
  onFixFailed,
  onEscalate,
  onError,
  maxAttempts = 3,
  autoRetry = true
}: UseAutofixOptions): UseAutofixReturn {
  const [session, setSession] = useState<FixSession | null>(null)
  const [isFixing, setIsFixing] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [currentStrategy, setCurrentStrategy] = useState<FixStrategy | null>(null)
  const [attemptCount, setAttemptCount] = useState(0)

  const abortControllerRef = useRef<AbortController | null>(null)

  // 分类错误
  const classifyError = useCallback(async (errorInfo: {
    code?: string
    message: string
    stack?: string
  }): Promise<ClassifiedError | null> => {
    try {
      const response = await fetch('/api/delivery/autofix', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'classify',
          projectId,
          error: errorInfo
        })
      })

      const data = await response.json()

      if (data.success) {
        return data.data as ClassifiedError
      } else {
        throw new Error(data.error)
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : '分类错误失败'
      setError(errorMessage)
      onError?.(errorMessage)
      return null
    }
  }, [projectId, onError])

  // 开始修复
  const startFix = useCallback(async (classifiedError: ClassifiedError) => {
    setIsFixing(true)
    setError(null)
    setAttemptCount(0)
    onFixStart?.()

    try {
      const response = await fetch('/api/delivery/autofix', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'create',
          projectId,
          classifiedError
        })
      })

      const data = await response.json()

      if (data.success) {
        setSession(data.data)

        // 如果启用自动重试，开始执行策略
        if (autoRetry && data.data.strategies.length > 0) {
          await executeStrategiesSequentially(data.data)
        }
      } else {
        throw new Error(data.error)
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : '开始修复失败'
      setError(errorMessage)
      onError?.(errorMessage)
      setIsFixing(false)
    }
  }, [projectId, autoRetry, onFixStart, onError])

  // 顺序执行策略
  const executeStrategiesSequentially = useCallback(async (fixSession: FixSession) => {
    let currentSession = fixSession

    for (let i = 0; i < currentSession.strategies.length && i < maxAttempts; i++) {
      const strategy = currentSession.strategies[i]
      setCurrentStrategy(strategy)
      setAttemptCount(i + 1)

      try {
        const response = await fetch('/api/delivery/autofix', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            action: 'execute',
            sessionId: currentSession.id,
            strategyIndex: i
          })
        })

        const data = await response.json()

        if (data.success) {
          currentSession = data.data
          setSession(currentSession)

          // 如果修复成功
          if (currentSession.status === 'success') {
            setIsFixing(false)
            setCurrentStrategy(null)
            onFixSuccess?.(currentSession)
            return
          }
        }
      } catch (err) {
        console.error('执行策略失败:', err)
      }

      // 等待一段时间再尝试下一个策略
      await new Promise(resolve => setTimeout(resolve, 1000))
    }

    // 所有策略都失败
    setIsFixing(false)
    setCurrentStrategy(null)

    if (currentSession.status === 'failed') {
      onFixFailed?.(currentSession)
    }
  }, [maxAttempts, onFixSuccess, onFixFailed])

  // 执行单个策略
  const executeStrategy = useCallback(async (strategy: FixStrategy): Promise<boolean> => {
    if (!session) {
      setError('没有活动会话')
      return false
    }

    setIsFixing(true)
    setCurrentStrategy(strategy)
    setError(null)

    try {
      const strategyIndex = session.strategies.indexOf(strategy)

      const response = await fetch('/api/delivery/autofix', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'execute',
          sessionId: session.id,
          strategyIndex: strategyIndex >= 0 ? strategyIndex : 0
        })
      })

      const data = await response.json()

      if (data.success) {
        setSession(data.data)
        setAttemptCount(prev => prev + 1)

        if (data.data.status === 'success') {
          setIsFixing(false)
          setCurrentStrategy(null)
          onFixSuccess?.(data.data)
          return true
        }
      } else {
        throw new Error(data.error)
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : '执行策略失败'
      setError(errorMessage)
      onError?.(errorMessage)
    } finally {
      setIsFixing(false)
      setCurrentStrategy(null)
    }

    return false
  }, [session, onFixSuccess, onError])

  // 标记成功
  const markSuccess = useCallback(async () => {
    if (!session) {
      setError('没有活动会话')
      return
    }

    try {
      const response = await fetch('/api/delivery/autofix', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'markSuccess',
          sessionId: session.id
        })
      })

      const data = await response.json()

      if (data.success) {
        setSession(data.data)
        onFixSuccess?.(data.data)
      } else {
        throw new Error(data.error)
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : '标记成功失败'
      setError(errorMessage)
      onError?.(errorMessage)
    }
  }, [session, onFixSuccess, onError])

  // 升级人工
  const escalate = useCallback(async (reason?: string) => {
    if (!session) {
      setError('没有活动会话')
      return
    }

    // 停止当前修复
    if (abortControllerRef.current) {
      abortControllerRef.current.abort()
    }

    setIsFixing(false)
    setCurrentStrategy(null)

    try {
      const response = await fetch('/api/delivery/autofix', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'escalate',
          sessionId: session.id,
          reason
        })
      })

      const data = await response.json()

      if (data.success) {
        setSession(data.data)
        onEscalate?.(data.data)
      } else {
        throw new Error(data.error)
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : '升级失败'
      setError(errorMessage)
      onError?.(errorMessage)
    }
  }, [session, onEscalate, onError])

  // 重置
  const reset = useCallback(() => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort()
    }
    setSession(null)
    setIsFixing(false)
    setError(null)
    setCurrentStrategy(null)
    setAttemptCount(0)
  }, [])

  // 计算进度
  const progress = session && session.strategies.length > 0
    ? Math.round((session.currentStrategyIndex / session.strategies.length) * 100)
    : 0

  return {
    session,
    isFixing,
    error,
    currentStrategy,
    progress,
    attemptCount,
    classifyError,
    startFix,
    executeStrategy,
    markSuccess,
    escalate,
    reset
  }
}
