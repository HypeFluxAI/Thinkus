/**
 * Todo Tracker Types
 * 追踪所有TODO，确保AI完成所有任务才能结束
 */

export type TodoSource = 'user_requirement' | 'code_comment' | 'ai_identified' | 'verify_failure'
export type TodoStatus = 'pending' | 'in_progress' | 'completed' | 'blocked'

export interface TodoItem {
  id: string
  description: string
  source: TodoSource
  status: TodoStatus
  assignedTo?: string
  createdAt: Date
  completedAt?: Date
  blockReason?: string
}

export interface TodoCheckResult {
  canStop: boolean
  reason: string
  incompleteTodos: TodoItem[]
  stats: {
    total: number
    completed: number
    pending: number
    blocked: number
  }
}

export interface TodoTrackerConfig {
  maxIterations: number
  enableAutoExtract: boolean
  enableCodeCommentScan: boolean
}
