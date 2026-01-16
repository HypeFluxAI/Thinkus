'use client'

import { useState, useEffect, useCallback, useRef } from 'react'

/**
 * 事件类型
 */
export type EventType =
  | 'progress'
  | 'agent_status'
  | 'code_change'
  | 'file_change'
  | 'terminal_output'
  | 'message'
  | 'error'
  | 'preview_update'

/**
 * 基础事件
 */
export interface StreamEvent {
  id: string
  type: EventType
  projectId: string
  timestamp: number
  data: unknown
}

/**
 * 进度数据
 */
export interface ProgressData {
  phase: string
  progress: number
  message: string
  subTasks?: {
    name: string
    status: 'pending' | 'running' | 'done' | 'error'
  }[]
}

/**
 * Agent 状态
 */
export interface AgentStatus {
  agentId: string
  agentName: string
  status: 'working' | 'waiting' | 'idle' | 'thinking' | 'error'
  task?: string
  progress?: number
}

/**
 * 代码变更
 */
export interface CodeChange {
  file: string
  content?: string
  action?: 'create' | 'update' | 'delete' | 'chunk'
  chunk?: string
  agentName?: string
}

/**
 * 日志条目
 */
export interface LogEntry {
  timestamp: string
  message: string
  type: 'info' | 'success' | 'warning' | 'error'
  agentName?: string
}

/**
 * Hook 返回值
 */
export interface UseDevelopmentEventsReturn {
  // 连接状态
  isConnected: boolean
  connectionError: string | null

  // 进度
  progress: number
  phase: string
  progressMessage: string
  subTasks: ProgressData['subTasks']

  // AI 团队状态
  agents: AgentStatus[]

  // 当前文件和代码
  currentFile: string
  codeContent: string
  completedFiles: string[]

  // 日志
  logs: LogEntry[]

  // 原始事件
  events: StreamEvent[]

  // 控制方法
  reconnect: () => void
  clearLogs: () => void
}

/**
 * 开发事件 Hook - 连接 SSE 并管理状态
 */
export function useDevelopmentEvents(projectId: string): UseDevelopmentEventsReturn {
  // 连接状态
  const [isConnected, setIsConnected] = useState(false)
  const [connectionError, setConnectionError] = useState<string | null>(null)

  // 进度状态
  const [progress, setProgress] = useState(0)
  const [phase, setPhase] = useState('准备中')
  const [progressMessage, setProgressMessage] = useState('')
  const [subTasks, setSubTasks] = useState<ProgressData['subTasks']>([])

  // AI 团队状态
  const [agents, setAgents] = useState<AgentStatus[]>([])

  // 代码状态
  const [currentFile, setCurrentFile] = useState('')
  const [codeContent, setCodeContent] = useState('')
  const [completedFiles, setCompletedFiles] = useState<string[]>([])

  // 日志
  const [logs, setLogs] = useState<LogEntry[]>([])

  // 原始事件
  const [events, setEvents] = useState<StreamEvent[]>([])

  // EventSource ref
  const eventSourceRef = useRef<EventSource | null>(null)
  const reconnectTimeoutRef = useRef<NodeJS.Timeout | null>(null)

  // 添加日志
  const addLog = useCallback((message: string, type: LogEntry['type'] = 'info', agentName?: string) => {
    const now = new Date()
    const timestamp = now.toLocaleTimeString('zh-CN', { hour12: false })
    setLogs(prev => [...prev.slice(-99), { timestamp, message, type, agentName }])
  }, [])

  // 处理事件
  const handleEvent = useCallback((event: StreamEvent) => {
    setEvents(prev => [...prev.slice(-99), event])

    switch (event.type) {
      case 'progress': {
        const data = event.data as ProgressData
        setProgress(data.progress)
        setPhase(data.phase)
        setProgressMessage(data.message)
        if (data.subTasks) {
          setSubTasks(data.subTasks)
        }
        break
      }

      case 'agent_status': {
        const data = event.data as AgentStatus
        setAgents(prev => {
          const existing = prev.find(a => a.agentId === data.agentId)
          if (existing) {
            return prev.map(a => a.agentId === data.agentId ? data : a)
          }
          return [...prev, data]
        })
        break
      }

      case 'code_change': {
        const data = event.data as CodeChange
        if (data.content) {
          setCurrentFile(data.file)
          setCodeContent(data.content)
          setCompletedFiles(prev =>
            prev.includes(data.file) ? prev : [...prev, data.file]
          )
          addLog(`文件 ${data.file} 生成完成`, 'success', data.agentName)
        }
        break
      }

      case 'file_change': {
        const data = event.data as CodeChange
        if (data.action === 'chunk' && data.chunk) {
          // 流式代码片段
          if (data.file !== currentFile) {
            setCurrentFile(data.file)
            setCodeContent(data.chunk)
          } else {
            setCodeContent(prev => prev + data.chunk)
          }
        }
        break
      }

      case 'message': {
        const data = event.data as { role: string; content: string; agentName?: string }
        if (data.role === 'system') {
          addLog(data.content, 'info')
        } else if (data.role === 'assistant') {
          addLog(data.content, 'info', data.agentName)
        }
        break
      }

      case 'error': {
        const data = event.data as { code: string; message: string }
        addLog(`错误: ${data.message}`, 'error')
        break
      }

      case 'terminal_output': {
        const data = event.data as { output: string; isError: boolean }
        addLog(data.output, data.isError ? 'error' : 'info')
        break
      }
    }
  }, [addLog, currentFile])

  // 连接 SSE
  const connect = useCallback(() => {
    if (eventSourceRef.current) {
      eventSourceRef.current.close()
    }

    setConnectionError(null)
    addLog('正在连接实时事件流...', 'info')

    const eventSource = new EventSource(`/api/projects/${projectId}/events`)
    eventSourceRef.current = eventSource

    eventSource.onopen = () => {
      setIsConnected(true)
      setConnectionError(null)
      addLog('已连接到实时事件流', 'success')
    }

    eventSource.onmessage = (e) => {
      try {
        const event = JSON.parse(e.data) as StreamEvent
        handleEvent(event)
      } catch (error) {
        console.error('[SSE] Parse error:', error)
      }
    }

    eventSource.onerror = () => {
      setIsConnected(false)
      eventSource.close()

      // 尝试重连
      if (!reconnectTimeoutRef.current) {
        setConnectionError('连接断开，3秒后重试...')
        addLog('连接断开，尝试重连...', 'warning')

        reconnectTimeoutRef.current = setTimeout(() => {
          reconnectTimeoutRef.current = null
          connect()
        }, 3000)
      }
    }
  }, [projectId, handleEvent, addLog])

  // 重连
  const reconnect = useCallback(() => {
    if (reconnectTimeoutRef.current) {
      clearTimeout(reconnectTimeoutRef.current)
      reconnectTimeoutRef.current = null
    }
    connect()
  }, [connect])

  // 清除日志
  const clearLogs = useCallback(() => {
    setLogs([])
  }, [])

  // 初始化连接
  useEffect(() => {
    connect()

    return () => {
      if (eventSourceRef.current) {
        eventSourceRef.current.close()
      }
      if (reconnectTimeoutRef.current) {
        clearTimeout(reconnectTimeoutRef.current)
      }
    }
  }, [connect])

  return {
    isConnected,
    connectionError,
    progress,
    phase,
    progressMessage,
    subTasks,
    agents,
    currentFile,
    codeContent,
    completedFiles,
    logs,
    events,
    reconnect,
    clearLogs,
  }
}
