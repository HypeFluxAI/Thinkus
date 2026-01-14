/**
 * 讨论会话管理工具
 * 为每个讨论会话生成唯一ID，避免不同项目的数据混淆
 */

const SESSION_ID_KEY = 'currentDiscussionSessionId'
const SESSION_DATA_PREFIX = 'discussionSession_'

export interface DiscussionSessionData {
  requirement: string
  features: Array<{
    id: string
    name: string
    description: string
    priority: string
    status?: string
  }>
  mode: string
  projectId?: string
  messages?: Array<{ role: string; content: string }>
  // 讨论进度
  progress?: {
    messages: Array<{
      expertId: string
      content: string
      round?: number
      isUser?: boolean
    }>
    proposal?: unknown
    currentRound?: number
    keyInsights?: string[]
    discussionHistory?: Array<{
      expertId: string
      content: string
      role?: string
      round?: number
    }>
  }
  // 讨论参数（用于返回继续讨论）
  discussionParams?: {
    requirement: string
    features: string
    mode: string
    projectType: string
    complexity: string
  }
  // 最终方案
  proposal?: unknown
  // 创建时间
  createdAt: number
}

/**
 * 生成新的会话ID
 */
function generateSessionId(): string {
  return `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
}

/**
 * 获取当前会话ID，如果不存在则创建新的
 */
export function getCurrentSessionId(): string {
  if (typeof window === 'undefined') return ''

  let sessionId = sessionStorage.getItem(SESSION_ID_KEY)
  if (!sessionId) {
    sessionId = generateSessionId()
    sessionStorage.setItem(SESSION_ID_KEY, sessionId)
  }
  return sessionId
}

/**
 * 创建新的讨论会话
 */
export function createNewSession(): string {
  if (typeof window === 'undefined') return ''

  const sessionId = generateSessionId()
  sessionStorage.setItem(SESSION_ID_KEY, sessionId)
  return sessionId
}

/**
 * 获取会话数据的存储key
 */
function getSessionKey(sessionId: string): string {
  return `${SESSION_DATA_PREFIX}${sessionId}`
}

/**
 * 保存讨论会话数据
 */
export function saveSessionData(data: Partial<DiscussionSessionData>): void {
  if (typeof window === 'undefined') return

  const sessionId = getCurrentSessionId()
  const key = getSessionKey(sessionId)

  // 获取现有数据并合并
  const existingData = getSessionData()
  const mergedData: DiscussionSessionData = {
    ...existingData,
    ...data,
    createdAt: existingData?.createdAt || Date.now(),
  } as DiscussionSessionData

  sessionStorage.setItem(key, JSON.stringify(mergedData))
}

/**
 * 获取讨论会话数据
 */
export function getSessionData(): DiscussionSessionData | null {
  if (typeof window === 'undefined') return null

  const sessionId = getCurrentSessionId()
  if (!sessionId) return null

  const key = getSessionKey(sessionId)
  const data = sessionStorage.getItem(key)

  if (!data) return null

  try {
    return JSON.parse(data)
  } catch {
    return null
  }
}

/**
 * 更新讨论进度
 */
export function updateProgress(progress: DiscussionSessionData['progress']): void {
  saveSessionData({ progress })
}

/**
 * 保存最终方案
 */
export function saveProposal(proposal: unknown): void {
  saveSessionData({ proposal })
}

/**
 * 获取最终方案
 */
export function getProposal(): unknown | null {
  const data = getSessionData()
  return data?.proposal || null
}

/**
 * 清除讨论进度（进入确认页面后）
 */
export function clearProgress(): void {
  const data = getSessionData()
  if (data) {
    saveSessionData({ ...data, progress: undefined })
  }
}

/**
 * 清除当前会话
 */
export function clearSession(): void {
  if (typeof window === 'undefined') return

  const sessionId = getCurrentSessionId()
  if (sessionId) {
    const key = getSessionKey(sessionId)
    sessionStorage.removeItem(key)
  }
  sessionStorage.removeItem(SESSION_ID_KEY)
}

/**
 * 清理过期的会话数据（超过24小时）
 */
export function cleanupExpiredSessions(): void {
  if (typeof window === 'undefined') return

  const now = Date.now()
  const maxAge = 24 * 60 * 60 * 1000 // 24小时

  for (let i = 0; i < sessionStorage.length; i++) {
    const key = sessionStorage.key(i)
    if (key?.startsWith(SESSION_DATA_PREFIX)) {
      try {
        const data = JSON.parse(sessionStorage.getItem(key) || '{}')
        if (data.createdAt && now - data.createdAt > maxAge) {
          sessionStorage.removeItem(key)
        }
      } catch {
        // 解析失败的数据直接删除
        if (key) sessionStorage.removeItem(key)
      }
    }
  }
}

// 兼容旧版本：迁移旧的 sessionStorage 数据到新格式
export function migrateOldSessionData(): void {
  if (typeof window === 'undefined') return

  const oldKeys = [
    'createDiscussionData',
    'discussionProgress',
    'discussionParams',
    'currentProposal',
  ]

  let hasOldData = false
  const migratedData: Partial<DiscussionSessionData> = {}

  // 检查并收集旧数据
  for (const key of oldKeys) {
    const value = sessionStorage.getItem(key)
    if (value) {
      hasOldData = true
      try {
        const parsed = JSON.parse(value)
        switch (key) {
          case 'createDiscussionData':
            migratedData.requirement = parsed.requirement
            migratedData.features = parsed.features
            migratedData.mode = parsed.mode
            migratedData.projectId = parsed.projectId
            migratedData.messages = parsed.messages
            break
          case 'discussionProgress':
            migratedData.progress = parsed
            break
          case 'discussionParams':
            migratedData.discussionParams = parsed
            break
          case 'currentProposal':
            migratedData.proposal = parsed
            break
        }
      } catch {
        // 解析失败，忽略
      }
    }
  }

  // 如果有旧数据，迁移到新格式
  if (hasOldData) {
    // 创建新会话并保存迁移的数据
    createNewSession()
    saveSessionData(migratedData)

    // 删除旧数据
    for (const key of oldKeys) {
      sessionStorage.removeItem(key)
    }

    console.log('[DiscussionSession] 已迁移旧的会话数据到新格式')
  }
}
