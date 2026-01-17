/**
 * Optimization Events - WebSocket事件类型定义
 * v12 优化模块相关的实时事件
 */

import type { TodoItem, DetectedMode, ContextStatus } from '@/lib/optimizations'
import type { PlanStep } from '@/lib/services'

// ============ Magic Keyword Events ============
export interface ModeActivatedEvent {
  type: 'mode_activated'
  data: {
    mode: DetectedMode
    message: string
    timestamp: Date
  }
}

// ============ Todo Tracker Events ============
export interface TodoListCreatedEvent {
  type: 'todo_list_created'
  data: {
    projectId: string
    todos: TodoItem[]
  }
}

export interface TodoUpdatedEvent {
  type: 'todo_updated'
  data: {
    projectId: string
    todoId: string
    status: TodoItem['status']
    completedAt?: Date
  }
}

export interface TodoContinuationEvent {
  type: 'todo_continuation'
  data: {
    projectId: string
    message: string
    todos: TodoItem[]
    stats: {
      total: number
      completed: number
      pending: number
      blocked: number
    }
  }
}

// ============ Comment Checker Events ============
export interface CommentCheckResultEvent {
  type: 'comment_check_result'
  data: {
    projectId: string
    issues: number
    suggestions: string
    files: string[]
  }
}

// ============ Context Monitor Events ============
export interface ContextWarningEvent {
  type: 'context_warning'
  data: {
    sessionId: string
    usage: number
    usedTokens: number
    maxTokens: number
    message: string
  }
}

export interface ContextCompactingEvent {
  type: 'context_compacting'
  data: {
    sessionId: string
    isEmergency: boolean
    status: ContextStatus
  }
}

export interface ContextCompactedEvent {
  type: 'context_compacted'
  data: {
    sessionId: string
    originalTokens: number
    compactedTokens: number
    savedTokens: number
  }
}

// ============ Session Recovery Events ============
export interface SessionRecoveringEvent {
  type: 'session_recovering'
  data: {
    sessionId: string
    errorType: string
    retryCount: number
  }
}

export interface SessionRecoveredEvent {
  type: 'session_recovered'
  data: {
    sessionId: string
    action: string
    success: boolean
  }
}

export interface SessionRecoveryFailedEvent {
  type: 'session_recovery_failed'
  data: {
    sessionId: string
    errorType: string
    message: string
    userNotification: string
  }
}

// ============ Plan-First Events ============
export interface PlanGeneratedEvent {
  type: 'plan_generated'
  data: {
    projectId: string
    planId: string
    title: string
    stepsCount: number
  }
}

export interface PlanApprovedEvent {
  type: 'plan_approved'
  data: {
    projectId: string
    planId: string
  }
}

export interface PlanStepUpdatedEvent {
  type: 'plan_step_updated'
  data: {
    projectId: string
    planId: string
    stepId: string
    status: PlanStep['status']
  }
}

export interface PlanProgressEvent {
  type: 'plan_progress'
  data: {
    projectId: string
    planId: string
    currentStep: number
    totalSteps: number
    percentage: number
  }
}

// ============ Version Tracking Events ============
export interface VersionCreatedEvent {
  type: 'version_created'
  data: {
    projectId: string
    versionId: string
    version: string
    title: string
    filesChanged: number
  }
}

export interface RollbackStartedEvent {
  type: 'rollback_started'
  data: {
    projectId: string
    targetVersion: string
  }
}

export interface RollbackCompletedEvent {
  type: 'rollback_completed'
  data: {
    projectId: string
    targetVersion: string
    success: boolean
    restoredFiles: string[]
  }
}

// ============ AI Capability Events ============
export interface CapabilityDetectedEvent {
  type: 'capability_detected'
  data: {
    projectId: string
    capabilities: string[]
    suggestions: Array<{
      type: string
      component: string
      description: string
    }>
  }
}

// ============ Librarian Agent Events ============
export interface ResearchStartedEvent {
  type: 'research_started'
  data: {
    projectId: string
    topic: string
    depth: 'quick' | 'standard' | 'deep'
  }
}

export interface ResearchCompletedEvent {
  type: 'research_completed'
  data: {
    projectId: string
    topic: string
    findingsCount: number
    confidence: number
  }
}

// ============ Union Type ============
export type OptimizationEvent =
  // Mode
  | ModeActivatedEvent
  // Todo
  | TodoListCreatedEvent
  | TodoUpdatedEvent
  | TodoContinuationEvent
  // Comment
  | CommentCheckResultEvent
  // Context
  | ContextWarningEvent
  | ContextCompactingEvent
  | ContextCompactedEvent
  // Session
  | SessionRecoveringEvent
  | SessionRecoveredEvent
  | SessionRecoveryFailedEvent
  // Plan
  | PlanGeneratedEvent
  | PlanApprovedEvent
  | PlanStepUpdatedEvent
  | PlanProgressEvent
  // Version
  | VersionCreatedEvent
  | RollbackStartedEvent
  | RollbackCompletedEvent
  // Capability
  | CapabilityDetectedEvent
  // Research
  | ResearchStartedEvent
  | ResearchCompletedEvent

// ============ Event Handler Type ============
export type OptimizationEventHandler = (event: OptimizationEvent) => void

// ============ Event Emitter Interface ============
export interface OptimizationEventEmitter {
  emit(projectId: string, event: OptimizationEvent): Promise<void>
  subscribe(projectId: string, handler: OptimizationEventHandler): () => void
}
