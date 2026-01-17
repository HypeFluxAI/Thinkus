/**
 * 事件类型
 */
export type StreamEventType =
  | 'code_change'       // 代码变更
  | 'terminal_output'   // 终端输出
  | 'agent_status'      // Agent 状态变更
  | 'progress'          // 进度更新
  | 'preview_update'    // 预览更新
  | 'error'             // 错误
  | 'message'           // 消息
  | 'file_change'       // 文件变更
  | 'sandbox_status'    // 沙盒状态
  | 'ui_test_result'    // UI 测试结果

/**
 * 基础事件
 */
export interface StreamEvent {
  id: string
  type: StreamEventType
  projectId: string
  timestamp: number
  data: unknown
}

/**
 * 代码变更事件
 */
export interface CodeChangeEvent extends StreamEvent {
  type: 'code_change'
  data: {
    file: string
    content: string
    diff?: string
    agentId?: string
    agentName?: string
    language?: string
  }
}

/**
 * 终端输出事件
 */
export interface TerminalOutputEvent extends StreamEvent {
  type: 'terminal_output'
  data: {
    sandboxId: string
    output: string
    isError: boolean
    command?: string
  }
}

/**
 * Agent 状态事件
 */
export interface AgentStatusEvent extends StreamEvent {
  type: 'agent_status'
  data: {
    agentId: string
    agentName: string
    status: 'working' | 'waiting' | 'idle' | 'thinking' | 'error'
    task?: string
    progress?: number
  }
}

/**
 * 进度事件
 */
export interface ProgressEvent extends StreamEvent {
  type: 'progress'
  data: {
    phase: string
    progress: number        // 0-100
    message: string
    subTasks?: {
      name: string
      status: 'pending' | 'running' | 'done' | 'error'
    }[]
  }
}

/**
 * 预览更新事件
 */
export interface PreviewUpdateEvent extends StreamEvent {
  type: 'preview_update'
  data: {
    url: string
    status: 'loading' | 'ready' | 'error'
    screenshot?: string     // base64
  }
}

/**
 * 错误事件
 */
export interface ErrorEvent extends StreamEvent {
  type: 'error'
  data: {
    code: string
    message: string
    details?: string
    recoverable: boolean
  }
}

/**
 * 消息事件
 */
export interface MessageEvent extends StreamEvent {
  type: 'message'
  data: {
    role: 'user' | 'assistant' | 'system'
    content: string
    agentId?: string
    agentName?: string
  }
}

/**
 * UI 测试结果事件
 */
export interface UITestResultEvent extends StreamEvent {
  type: 'ui_test_result'
  data: {
    iteration: number
    passed: boolean
    results: {
      testName: string
      passed: boolean
      score: number
      issueCount: number
    }[]
  }
}

/**
 * 房间订阅者
 */
interface RoomSubscriber {
  id: string
  callback: (event: StreamEvent) => void
  joinedAt: Date
}

/**
 * 房间
 */
interface Room {
  projectId: string
  subscribers: Map<string, RoomSubscriber>
  lastEventAt: Date
  eventHistory: StreamEvent[]
}

/**
 * Realtime Stream Service
 * 实时推送服务 - 管理 WebSocket 风格的事件推送
 */
export class RealtimeStreamService {
  // 房间存储
  private rooms = new Map<string, Room>()

  // 事件历史限制
  private historyLimit = 100

  // 全局事件监听器
  private globalListeners: ((event: StreamEvent) => void)[] = []

  /**
   * 订阅项目事件
   */
  subscribe(
    projectId: string,
    callback: (event: StreamEvent) => void
  ): string {
    // 获取或创建房间
    let room = this.rooms.get(projectId)
    if (!room) {
      room = {
        projectId,
        subscribers: new Map(),
        lastEventAt: new Date(),
        eventHistory: [],
      }
      this.rooms.set(projectId, room)
    }

    // 生成订阅者 ID
    const subscriberId = `sub_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`

    // 添加订阅者
    room.subscribers.set(subscriberId, {
      id: subscriberId,
      callback,
      joinedAt: new Date(),
    })

    // 发送最近的事件历史
    for (const event of room.eventHistory.slice(-10)) {
      try {
        callback(event)
      } catch (error) {
        console.error('Error sending history event:', error)
      }
    }

    return subscriberId
  }

  /**
   * 取消订阅
   */
  unsubscribe(projectId: string, subscriberId: string): void {
    const room = this.rooms.get(projectId)
    if (room) {
      room.subscribers.delete(subscriberId)

      // 如果房间没有订阅者，清理房间
      if (room.subscribers.size === 0) {
        // 保留一段时间再删除
        setTimeout(() => {
          const currentRoom = this.rooms.get(projectId)
          if (currentRoom && currentRoom.subscribers.size === 0) {
            this.rooms.delete(projectId)
          }
        }, 60000) // 1分钟后删除空房间
      }
    }
  }

  /**
   * 获取房间订阅者数量
   */
  getSubscriberCount(projectId: string): number {
    const room = this.rooms.get(projectId)
    return room?.subscribers.size || 0
  }

  /**
   * 推送代码变更
   */
  pushCodeChange(
    projectId: string,
    file: string,
    content: string,
    options?: {
      diff?: string
      agentId?: string
      agentName?: string
      language?: string
    }
  ): void {
    this.push({
      id: this.generateEventId(),
      type: 'code_change',
      projectId,
      timestamp: Date.now(),
      data: {
        file,
        content,
        diff: options?.diff,
        agentId: options?.agentId,
        agentName: options?.agentName,
        language: options?.language || this.detectLanguage(file),
      },
    } as CodeChangeEvent)
  }

  /**
   * 推送终端输出
   */
  pushTerminalOutput(
    projectId: string,
    sandboxId: string,
    output: string,
    options?: {
      isError?: boolean
      command?: string
    }
  ): void {
    this.push({
      id: this.generateEventId(),
      type: 'terminal_output',
      projectId,
      timestamp: Date.now(),
      data: {
        sandboxId,
        output,
        isError: options?.isError || false,
        command: options?.command,
      },
    } as TerminalOutputEvent)
  }

  /**
   * 推送 Agent 状态
   */
  pushAgentStatus(
    projectId: string,
    agentId: string,
    agentName: string,
    status: 'working' | 'waiting' | 'idle' | 'thinking' | 'error',
    options?: {
      task?: string
      progress?: number
    }
  ): void {
    this.push({
      id: this.generateEventId(),
      type: 'agent_status',
      projectId,
      timestamp: Date.now(),
      data: {
        agentId,
        agentName,
        status,
        task: options?.task,
        progress: options?.progress,
      },
    } as AgentStatusEvent)
  }

  /**
   * 推送进度更新
   */
  pushProgress(
    projectId: string,
    phase: string,
    progress: number,
    message: string,
    subTasks?: { name: string; status: 'pending' | 'running' | 'done' | 'error' }[]
  ): void {
    this.push({
      id: this.generateEventId(),
      type: 'progress',
      projectId,
      timestamp: Date.now(),
      data: {
        phase,
        progress: Math.min(100, Math.max(0, progress)),
        message,
        subTasks,
      },
    } as ProgressEvent)
  }

  /**
   * 推送预览更新
   */
  pushPreviewUpdate(
    projectId: string,
    url: string,
    status: 'loading' | 'ready' | 'error',
    screenshot?: string
  ): void {
    this.push({
      id: this.generateEventId(),
      type: 'preview_update',
      projectId,
      timestamp: Date.now(),
      data: {
        url,
        status,
        screenshot,
      },
    } as PreviewUpdateEvent)
  }

  /**
   * 推送错误
   */
  pushError(
    projectId: string,
    code: string,
    message: string,
    options?: {
      details?: string
      recoverable?: boolean
    }
  ): void {
    this.push({
      id: this.generateEventId(),
      type: 'error',
      projectId,
      timestamp: Date.now(),
      data: {
        code,
        message,
        details: options?.details,
        recoverable: options?.recoverable ?? true,
      },
    } as ErrorEvent)
  }

  /**
   * 推送消息
   */
  pushMessage(
    projectId: string,
    role: 'user' | 'assistant' | 'system',
    content: string,
    options?: {
      agentId?: string
      agentName?: string
    }
  ): void {
    this.push({
      id: this.generateEventId(),
      type: 'message',
      projectId,
      timestamp: Date.now(),
      data: {
        role,
        content,
        agentId: options?.agentId,
        agentName: options?.agentName,
      },
    } as MessageEvent)
  }

  /**
   * 推送自定义事件
   */
  pushEvent(
    projectId: string,
    event: { type: string; data: Record<string, unknown> }
  ): void {
    this.push({
      id: this.generateEventId(),
      type: event.type as StreamEvent['type'],
      projectId,
      timestamp: Date.now(),
      data: event.data,
    } as StreamEvent)
  }

  /**
   * 推送通用事件
   */
  push(event: StreamEvent): void {
    const room = this.rooms.get(event.projectId)

    if (room) {
      // 更新房间状态
      room.lastEventAt = new Date()

      // 添加到历史
      room.eventHistory.push(event)
      if (room.eventHistory.length > this.historyLimit) {
        room.eventHistory.shift()
      }

      // 推送给所有订阅者
      for (const subscriber of room.subscribers.values()) {
        try {
          subscriber.callback(event)
        } catch (error) {
          console.error(`Error pushing event to subscriber ${subscriber.id}:`, error)
        }
      }
    }

    // 全局监听器
    for (const listener of this.globalListeners) {
      try {
        listener(event)
      } catch (error) {
        console.error('Error in global listener:', error)
      }
    }
  }

  /**
   * 添加全局监听器
   */
  addGlobalListener(callback: (event: StreamEvent) => void): void {
    this.globalListeners.push(callback)
  }

  /**
   * 移除全局监听器
   */
  removeGlobalListener(callback: (event: StreamEvent) => void): void {
    const index = this.globalListeners.indexOf(callback)
    if (index > -1) {
      this.globalListeners.splice(index, 1)
    }
  }

  /**
   * 获取事件历史
   */
  getEventHistory(projectId: string, limit = 50): StreamEvent[] {
    const room = this.rooms.get(projectId)
    if (!room) return []

    return room.eventHistory.slice(-limit)
  }

  /**
   * 清理房间
   */
  cleanupRoom(projectId: string): void {
    this.rooms.delete(projectId)
  }

  /**
   * 获取活跃房间列表
   */
  getActiveRooms(): { projectId: string; subscriberCount: number; lastEventAt: Date }[] {
    const result: { projectId: string; subscriberCount: number; lastEventAt: Date }[] = []

    for (const [projectId, room] of this.rooms.entries()) {
      result.push({
        projectId,
        subscriberCount: room.subscribers.size,
        lastEventAt: room.lastEventAt,
      })
    }

    return result.sort((a, b) => b.lastEventAt.getTime() - a.lastEventAt.getTime())
  }

  // ============ 私有方法 ============

  /**
   * 生成事件 ID
   */
  private generateEventId(): string {
    return `evt_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`
  }

  /**
   * 检测文件语言
   */
  private detectLanguage(filePath: string): string {
    const ext = filePath.split('.').pop()?.toLowerCase()

    const langMap: Record<string, string> = {
      ts: 'typescript',
      tsx: 'typescript',
      js: 'javascript',
      jsx: 'javascript',
      py: 'python',
      rb: 'ruby',
      go: 'go',
      rs: 'rust',
      java: 'java',
      kt: 'kotlin',
      swift: 'swift',
      cpp: 'cpp',
      c: 'c',
      h: 'c',
      css: 'css',
      scss: 'scss',
      less: 'less',
      html: 'html',
      xml: 'xml',
      json: 'json',
      yaml: 'yaml',
      yml: 'yaml',
      md: 'markdown',
      sql: 'sql',
      sh: 'shell',
      bash: 'shell',
    }

    return ext ? langMap[ext] || 'plaintext' : 'plaintext'
  }
}

// 导出单例
export const realtimeStream = new RealtimeStreamService()

/**
 * 创建 SSE 响应流
 * 用于 Next.js API 路由
 */
export function createSSEStream(
  projectId: string,
  onClose?: () => void
): {
  stream: ReadableStream
  subscriberId: string
} {
  let subscriberId: string

  const stream = new ReadableStream({
    start(controller) {
      const encoder = new TextEncoder()

      // 订阅事件
      subscriberId = realtimeStream.subscribe(projectId, (event) => {
        const data = `data: ${JSON.stringify(event)}\n\n`
        controller.enqueue(encoder.encode(data))
      })

      // 发送初始连接成功消息
      const connectEvent = {
        id: `evt_connect_${Date.now()}`,
        type: 'message',
        projectId,
        timestamp: Date.now(),
        data: {
          role: 'system',
          content: 'Connected to realtime stream',
        },
      }
      controller.enqueue(encoder.encode(`data: ${JSON.stringify(connectEvent)}\n\n`))
    },

    cancel() {
      if (subscriberId) {
        realtimeStream.unsubscribe(projectId, subscriberId)
      }
      onClose?.()
    },
  })

  return { stream, subscriberId: subscriberId! }
}
