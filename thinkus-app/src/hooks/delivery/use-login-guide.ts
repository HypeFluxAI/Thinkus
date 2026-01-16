'use client'

import { useState, useCallback } from 'react'
import type { LoginGuardSession, GuideStep } from '@/lib/services'

interface UseLoginGuideOptions {
  projectId: string
  userId: string
  onStepComplete?: (step: GuideStep['type']) => void
  onLoginSuccess?: () => void
  onLoginFailure?: (reason: string) => void
  onError?: (error: string) => void
}

interface UseLoginGuideReturn {
  session: LoginGuardSession | null
  isLoading: boolean
  error: string | null
  currentStep: GuideStep | null
  progress: number
  isCompleted: boolean
  isSuccess: boolean
  // 操作
  create: (credentials: {
    loginUrl: string
    username: string
    password: string
    mfaEnabled?: boolean
  }) => Promise<void>
  completeStep: (step: GuideStep['type']) => Promise<void>
  recordFailure: (reason: string, details?: string) => Promise<void>
  markSuccess: () => Promise<void>
  resetPassword: () => Promise<void>
  requestSupport: (message?: string) => Promise<void>
  reset: () => void
}

/**
 * 首次登录引导 Hook
 */
export function useLoginGuide({
  projectId,
  userId,
  onStepComplete,
  onLoginSuccess,
  onLoginFailure,
  onError
}: UseLoginGuideOptions): UseLoginGuideReturn {
  const [session, setSession] = useState<LoginGuardSession | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // 创建登录引导会话
  const create = useCallback(async (credentials: {
    loginUrl: string
    username: string
    password: string
    mfaEnabled?: boolean
  }) => {
    setIsLoading(true)
    setError(null)

    try {
      const response = await fetch('/api/delivery/login-guide', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'create',
          projectId,
          userId,
          credentials
        })
      })

      const data = await response.json()

      if (data.success) {
        setSession(data.data)
      } else {
        throw new Error(data.error)
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : '创建会话失败'
      setError(errorMessage)
      onError?.(errorMessage)
    } finally {
      setIsLoading(false)
    }
  }, [projectId, userId, onError])

  // 完成步骤
  const completeStep = useCallback(async (step: GuideStep['type']) => {
    if (!session) {
      setError('没有活动会话')
      return
    }

    setIsLoading(true)
    setError(null)

    try {
      const response = await fetch('/api/delivery/login-guide', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'completeStep',
          sessionId: session.id,
          step
        })
      })

      const data = await response.json()

      if (data.success) {
        setSession(data.data)
        onStepComplete?.(step)
      } else {
        throw new Error(data.error)
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : '完成步骤失败'
      setError(errorMessage)
      onError?.(errorMessage)
    } finally {
      setIsLoading(false)
    }
  }, [session, onStepComplete, onError])

  // 记录失败
  const recordFailure = useCallback(async (reason: string, details?: string) => {
    if (!session) {
      setError('没有活动会话')
      return
    }

    setIsLoading(true)
    setError(null)

    try {
      const response = await fetch('/api/delivery/login-guide', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'recordFailure',
          sessionId: session.id,
          reason,
          details
        })
      })

      const data = await response.json()

      if (data.success) {
        setSession(data.data)
        onLoginFailure?.(reason)
      } else {
        throw new Error(data.error)
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : '记录失败'
      setError(errorMessage)
      onError?.(errorMessage)
    } finally {
      setIsLoading(false)
    }
  }, [session, onLoginFailure, onError])

  // 标记成功
  const markSuccess = useCallback(async () => {
    if (!session) {
      setError('没有活动会话')
      return
    }

    setIsLoading(true)
    setError(null)

    try {
      const response = await fetch('/api/delivery/login-guide', {
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
        onLoginSuccess?.()
      } else {
        throw new Error(data.error)
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : '标记成功失败'
      setError(errorMessage)
      onError?.(errorMessage)
    } finally {
      setIsLoading(false)
    }
  }, [session, onLoginSuccess, onError])

  // 重置密码
  const resetPassword = useCallback(async () => {
    if (!session) {
      setError('没有活动会话')
      return
    }

    setIsLoading(true)
    setError(null)

    try {
      const response = await fetch('/api/delivery/login-guide', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'resetPassword',
          sessionId: session.id
        })
      })

      const data = await response.json()

      if (data.success) {
        setSession(data.data)
      } else {
        throw new Error(data.error)
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : '重置密码失败'
      setError(errorMessage)
      onError?.(errorMessage)
    } finally {
      setIsLoading(false)
    }
  }, [session, onError])

  // 请求人工支持
  const requestSupport = useCallback(async (message?: string) => {
    if (!session) {
      setError('没有活动会话')
      return
    }

    setIsLoading(true)
    setError(null)

    try {
      const response = await fetch('/api/delivery/login-guide', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'requestSupport',
          sessionId: session.id,
          message
        })
      })

      const data = await response.json()

      if (!data.success) {
        throw new Error(data.error)
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : '请求支持失败'
      setError(errorMessage)
      onError?.(errorMessage)
    } finally {
      setIsLoading(false)
    }
  }, [session, onError])

  // 重置
  const reset = useCallback(() => {
    setSession(null)
    setError(null)
  }, [])

  // 计算当前步骤
  const currentStep = session?.guideSteps[session.currentStepIndex] || null

  // 计算进度
  const progress = session
    ? Math.round((session.currentStepIndex / session.guideSteps.length) * 100)
    : 0

  // 判断是否完成
  const isCompleted = session?.status === 'completed'
  const isSuccess = session?.status === 'completed' && session?.loginSuccessful === true

  return {
    session,
    isLoading,
    error,
    currentStep,
    progress,
    isCompleted,
    isSuccess,
    create,
    completeStep,
    recordFailure,
    markSuccess,
    resetPassword,
    requestSupport,
    reset
  }
}
