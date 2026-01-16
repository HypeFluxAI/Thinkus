'use client'

import { useState, useEffect, useCallback } from 'react'
import type { TimeoutSession, TimeoutConfig } from '@/lib/services'

interface UseAcceptanceTimeoutOptions {
  sessionId?: string
  projectId?: string
  userId?: string
  config?: Partial<TimeoutConfig>
  onWarning?: () => void
  onFinalWarning?: () => void
  onTimeout?: () => void
  onComplete?: () => void
}

interface UseAcceptanceTimeoutReturn {
  session: TimeoutSession | null
  isLoading: boolean
  error: string | null
  remainingTime: number // 剩余毫秒
  isUrgent: boolean
  create: () => Promise<void>
  start: () => Promise<void>
  completeItem: (itemId: string) => Promise<void>
  extendTime: (extraMs?: number) => Promise<void>
  complete: () => Promise<void>
  escalate: (reason?: string) => Promise<void>
  refresh: () => Promise<void>
}

/**
 * 验收超时 Hook
 */
export function useAcceptanceTimeout({
  sessionId: initialSessionId,
  projectId,
  userId,
  config,
  onWarning,
  onFinalWarning,
  onTimeout,
  onComplete
}: UseAcceptanceTimeoutOptions): UseAcceptanceTimeoutReturn {
  const [session, setSession] = useState<TimeoutSession | null>(null)
  const [sessionId, setSessionId] = useState(initialSessionId)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [remainingTime, setRemainingTime] = useState(0)

  // 计算剩余时间
  useEffect(() => {
    if (!session) return

    const updateRemaining = () => {
      const remaining = Math.max(0, new Date(session.expiresAt).getTime() - Date.now())
      setRemainingTime(remaining)

      // 触发回调
      if (session.status === 'warning' && remaining <= session.config.finalWarningMs * 2) {
        onWarning?.()
      }
      if (session.status === 'final_warning' && remaining <= session.config.finalWarningMs) {
        onFinalWarning?.()
      }
      if (remaining === 0 && session.status !== 'auto_passed' && session.status !== 'completed') {
        onTimeout?.()
      }
      if (session.status === 'completed') {
        onComplete?.()
      }
    }

    updateRemaining()
    const interval = setInterval(updateRemaining, 1000)
    return () => clearInterval(interval)
  }, [session, onWarning, onFinalWarning, onTimeout, onComplete])

  // 获取会话
  const refresh = useCallback(async () => {
    if (!sessionId) return

    setIsLoading(true)
    setError(null)

    try {
      const response = await fetch(`/api/delivery/acceptance?sessionId=${sessionId}`)
      const data = await response.json()

      if (data.success) {
        setSession(data.data)
      } else {
        setError(data.error || '获取会话失败')
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : '网络错误')
    } finally {
      setIsLoading(false)
    }
  }, [sessionId])

  // 创建会话
  const create = useCallback(async () => {
    if (!projectId || !userId) {
      setError('缺少 projectId 或 userId')
      return
    }

    setIsLoading(true)
    setError(null)

    try {
      const response = await fetch('/api/delivery/acceptance', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'create',
          projectId,
          userId,
          config
        })
      })
      const data = await response.json()

      if (data.success) {
        setSession(data.data)
        setSessionId(data.data.id)
      } else {
        throw new Error(data.error)
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : '创建会话失败')
    } finally {
      setIsLoading(false)
    }
  }, [projectId, userId, config])

  // 开始倒计时
  const start = useCallback(async () => {
    if (!sessionId) return

    try {
      const response = await fetch('/api/delivery/acceptance', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'start',
          sessionId
        })
      })
      const data = await response.json()

      if (data.success) {
        setSession(data.data)
      } else {
        throw new Error(data.error)
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : '开始倒计时失败')
    }
  }, [sessionId])

  // 完成检查项
  const completeItem = useCallback(async (itemId: string) => {
    if (!sessionId) return

    try {
      const response = await fetch('/api/delivery/acceptance', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'completeItem',
          sessionId,
          itemId
        })
      })
      const data = await response.json()

      if (data.success) {
        setSession(data.data)
      } else {
        throw new Error(data.error)
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : '完成检查项失败')
    }
  }, [sessionId])

  // 延长时间
  const extendTime = useCallback(async (extraMs = 2 * 60 * 1000) => {
    if (!sessionId) return

    try {
      const response = await fetch('/api/delivery/acceptance', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'extend',
          sessionId,
          extraMs
        })
      })
      const data = await response.json()

      if (data.success) {
        setSession(data.data)
      } else {
        throw new Error(data.error)
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : '延长时间失败')
    }
  }, [sessionId])

  // 完成验收
  const complete = useCallback(async () => {
    if (!sessionId) return

    try {
      const response = await fetch('/api/delivery/acceptance', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'complete',
          sessionId
        })
      })
      const data = await response.json()

      if (data.success) {
        setSession(data.data)
        onComplete?.()
      } else {
        throw new Error(data.error)
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : '完成验收失败')
    }
  }, [sessionId, onComplete])

  // 升级到人工
  const escalate = useCallback(async (reason?: string) => {
    if (!sessionId) return

    try {
      const response = await fetch('/api/delivery/acceptance', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'escalate',
          sessionId,
          reason
        })
      })
      const data = await response.json()

      if (data.success) {
        setSession(data.data)
      } else {
        throw new Error(data.error)
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : '升级失败')
    }
  }, [sessionId])

  // 初始化
  useEffect(() => {
    if (initialSessionId) {
      refresh()
    }
  }, [initialSessionId, refresh])

  return {
    session,
    isLoading,
    error,
    remainingTime,
    isUrgent: remainingTime < 60000, // 最后1分钟
    create,
    start,
    completeItem,
    extendTime,
    complete,
    escalate,
    refresh
  }
}
