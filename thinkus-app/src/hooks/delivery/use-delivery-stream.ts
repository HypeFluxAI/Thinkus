'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import type { ProgressSession } from '@/lib/services'

interface UseDeliveryStreamOptions {
  projectId: string
  onProgress?: (session: ProgressSession) => void
  onError?: (error: string) => void
  onConnected?: () => void
  onDisconnected?: () => void
  autoReconnect?: boolean
  reconnectInterval?: number
}

interface UseDeliveryStreamReturn {
  isConnected: boolean
  latestProgress: ProgressSession | null
  error: string | null
  connect: () => void
  disconnect: () => void
}

/**
 * 交付实时更新流 Hook (SSE)
 */
export function useDeliveryStream({
  projectId,
  onProgress,
  onError,
  onConnected,
  onDisconnected,
  autoReconnect = true,
  reconnectInterval = 5000
}: UseDeliveryStreamOptions): UseDeliveryStreamReturn {
  const [isConnected, setIsConnected] = useState(false)
  const [latestProgress, setLatestProgress] = useState<ProgressSession | null>(null)
  const [error, setError] = useState<string | null>(null)

  const eventSourceRef = useRef<EventSource | null>(null)
  const reconnectTimeoutRef = useRef<NodeJS.Timeout | null>(null)

  // 清理重连定时器
  const clearReconnectTimeout = useCallback(() => {
    if (reconnectTimeoutRef.current) {
      clearTimeout(reconnectTimeoutRef.current)
      reconnectTimeoutRef.current = null
    }
  }, [])

  // 断开连接
  const disconnect = useCallback(() => {
    clearReconnectTimeout()

    if (eventSourceRef.current) {
      eventSourceRef.current.close()
      eventSourceRef.current = null
    }

    setIsConnected(false)
    onDisconnected?.()
  }, [clearReconnectTimeout, onDisconnected])

  // 连接
  const connect = useCallback(() => {
    // 先断开已有连接
    if (eventSourceRef.current) {
      eventSourceRef.current.close()
    }

    clearReconnectTimeout()
    setError(null)

    try {
      const eventSource = new EventSource(`/api/delivery/stream?projectId=${projectId}`)
      eventSourceRef.current = eventSource

      // 连接成功
      eventSource.addEventListener('connected', (event) => {
        setIsConnected(true)
        setError(null)
        onConnected?.()
        console.log('SSE 已连接:', JSON.parse(event.data))
      })

      // 进度更新
      eventSource.addEventListener('progress', (event) => {
        try {
          const data = JSON.parse(event.data) as ProgressSession
          setLatestProgress(data)
          onProgress?.(data)
        } catch (err) {
          console.error('解析进度数据失败:', err)
        }
      })

      // 心跳
      eventSource.addEventListener('heartbeat', () => {
        // 收到心跳，保持连接
      })

      // 错误处理
      eventSource.onerror = () => {
        setIsConnected(false)
        const errorMessage = 'SSE 连接错误'
        setError(errorMessage)
        onError?.(errorMessage)

        eventSource.close()
        eventSourceRef.current = null

        // 自动重连
        if (autoReconnect) {
          reconnectTimeoutRef.current = setTimeout(() => {
            console.log('尝试重新连接 SSE...')
            connect()
          }, reconnectInterval)
        }
      }

    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : '连接失败'
      setError(errorMessage)
      onError?.(errorMessage)
    }
  }, [projectId, onProgress, onError, onConnected, autoReconnect, reconnectInterval, clearReconnectTimeout])

  // 组件挂载时自动连接
  useEffect(() => {
    if (projectId) {
      connect()
    }

    return () => {
      disconnect()
    }
  }, [projectId]) // 注意：不要把 connect/disconnect 加入依赖数组，避免无限循环

  return {
    isConnected,
    latestProgress,
    error,
    connect,
    disconnect
  }
}
