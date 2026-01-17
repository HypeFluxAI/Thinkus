'use client'

import { useState, useEffect, useCallback } from 'react'
import type { ProgressSession, ProgressStage } from '@/lib/services'

interface UseDeliveryProgressOptions {
  projectId: string
  pollInterval?: number // 轮询间隔（毫秒）
  autoStart?: boolean
}

interface UseDeliveryProgressReturn {
  session: ProgressSession | null
  isLoading: boolean
  error: string | null
  refresh: () => Promise<void>
  updateStage: (stage: ProgressStage) => Promise<void>
  updateProgress: (progress: number) => Promise<void>
  addEvent: (message: string, isError?: boolean) => Promise<void>
}

/**
 * 交付进度 Hook
 */
export function useDeliveryProgress({
  projectId,
  pollInterval = 5000,
  autoStart = true
}: UseDeliveryProgressOptions): UseDeliveryProgressReturn {
  const [session, setSession] = useState<ProgressSession | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // 获取进度
  const refresh = useCallback(async () => {
    if (!projectId) return

    setIsLoading(true)
    setError(null)

    try {
      const response = await fetch(`/api/delivery/${projectId}`)
      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || '获取进度失败')
      }
      const data = await response.json()
      setSession(data.session as ProgressSession)
    } catch (err) {
      setError(err instanceof Error ? err.message : '网络错误')
    } finally {
      setIsLoading(false)
    }
  }, [projectId])

  // 更新阶段
  const updateStage = useCallback(async (stage: ProgressStage) => {
    try {
      const response = await fetch('/api/delivery/progress', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          projectId,
          action: 'updateStage',
          stage
        })
      })
      const data = await response.json()

      if (data.success) {
        setSession(data.data)
      } else {
        throw new Error(data.error)
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : '更新阶段失败')
    }
  }, [projectId])

  // 更新进度
  const updateProgress = useCallback(async (progress: number) => {
    try {
      const response = await fetch('/api/delivery/progress', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          projectId,
          action: 'updateProgress',
          progress
        })
      })
      const data = await response.json()

      if (data.success) {
        setSession(data.data)
      } else {
        throw new Error(data.error)
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : '更新进度失败')
    }
  }, [projectId])

  // 添加事件
  const addEvent = useCallback(async (message: string, isError = false) => {
    try {
      const response = await fetch('/api/delivery/progress', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          projectId,
          action: 'addEvent',
          message,
          isError
        })
      })
      const data = await response.json()

      if (data.success) {
        setSession(data.data)
      } else {
        throw new Error(data.error)
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : '添加事件失败')
    }
  }, [projectId])

  // 自动轮询
  useEffect(() => {
    if (!autoStart || !projectId) return

    refresh()

    const interval = setInterval(refresh, pollInterval)
    return () => clearInterval(interval)
  }, [autoStart, projectId, pollInterval, refresh])

  return {
    session,
    isLoading,
    error,
    refresh,
    updateStage,
    updateProgress,
    addEvent
  }
}
