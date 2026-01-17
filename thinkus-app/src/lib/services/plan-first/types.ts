/**
 * Plan-First Mode Types
 * 计划先行模式，先展示开发计划再开始执行
 */

export type PlanStepStatus = 'pending' | 'in_progress' | 'completed' | 'skipped' | 'failed'
export type PlanApprovalStatus = 'pending' | 'approved' | 'rejected' | 'modified'

export interface PlanStep {
  id: string
  title: string
  description: string
  estimatedDuration?: string
  dependencies: string[]
  status: PlanStepStatus
  order: number
  subSteps?: PlanSubStep[]
  aiNotes?: string
  userFeedback?: string
}

export interface PlanSubStep {
  id: string
  title: string
  status: PlanStepStatus
}

export interface DevelopmentPlan {
  id: string
  projectId: string
  sessionId: string
  title: string
  overview: string
  steps: PlanStep[]
  approvalStatus: PlanApprovalStatus
  createdAt: Date
  approvedAt?: Date
  modifiedAt?: Date
  userModifications?: string
  aiModel: string
  context: PlanContext
}

export interface PlanContext {
  userRequirement: string
  technicalContext?: string
  constraints?: string[]
  preferences?: string[]
}

export interface PlanGenerationResult {
  plan: DevelopmentPlan
  confidence: number
  alternatives?: PlanAlternative[]
  warnings?: string[]
}

export interface PlanAlternative {
  id: string
  title: string
  description: string
  tradeoffs: string[]
}

export interface PlanExecutionProgress {
  planId: string
  currentStepIndex: number
  completedSteps: number
  totalSteps: number
  progressPercentage: number
  estimatedRemainingTime?: string
  status: 'executing' | 'paused' | 'completed' | 'failed'
}

export interface PlanModification {
  stepId: string
  action: 'add' | 'remove' | 'modify' | 'reorder'
  newValue?: Partial<PlanStep>
  reason?: string
}
