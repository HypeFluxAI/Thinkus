// 交付相关类型定义

// ============ 进度追踪类型 ============

/** 交付阶段 */
export type DeliveryStage =
  | 'queued'
  | 'preparing'
  | 'coding'
  | 'testing'
  | 'fixing'
  | 'deploying'
  | 'configuring'
  | 'verifying'
  | 'almost_done'
  | 'completed'
  | 'paused'
  | 'error'

/** 阶段状态 */
export type StageStatus = 'pending' | 'running' | 'completed' | 'failed' | 'skipped'

/** 阶段信息 */
export interface StageInfo {
  stage: DeliveryStage
  status: StageStatus
  startedAt?: Date
  completedAt?: Date
  progress?: number
  message?: string
}

/** 进度事件 */
export interface ProgressEvent {
  id: string
  type: 'info' | 'success' | 'warning' | 'error'
  message: string
  timestamp: Date
  details?: Record<string, unknown>
}

/** 进度会话 */
export interface ProgressSession {
  id: string
  projectId: string
  currentStage: DeliveryStage
  overallProgress: number
  stages: StageInfo[]
  events: ProgressEvent[]
  startedAt: Date
  estimatedEndAt?: Date
  completedAt?: Date
}

// ============ 验收超时类型 ============

/** 验收状态 */
export type AcceptanceStatus =
  | 'pending'
  | 'active'
  | 'warning'
  | 'final_warning'
  | 'auto_passed'
  | 'escalated'
  | 'completed'

/** 验收检查项 */
export interface AcceptanceItem {
  id: string
  category: string
  question: string
  helpText?: string
  completed: boolean
  feedback?: 'good' | 'bad' | 'skip'
  issue?: string
  completedAt?: Date
}

/** 验收会话 */
export interface AcceptanceSession {
  id: string
  projectId: string
  status: AcceptanceStatus
  timeoutMinutes: number
  startedAt?: Date
  expiresAt?: Date
  items: AcceptanceItem[]
  completedItems: number
  totalItems: number
  warningAt?: Date
  finalWarningAt?: Date
  escalatedAt?: Date
  completedAt?: Date
  signature?: {
    signedBy: string
    signedAt: Date
    agreed: boolean
  }
}

// ============ 通知类型 ============

/** 通知优先级 */
export type NotificationPriority = 'low' | 'normal' | 'high' | 'urgent' | 'critical'

/** 通知类型 */
export type NotificationType =
  | 'delivery_complete'
  | 'deployment_success'
  | 'deployment_failed'
  | 'test_passed'
  | 'test_failed'
  | 'acceptance_required'
  | 'acceptance_warning'
  | 'acceptance_timeout'
  | 'error_detected'
  | 'error_fixed'
  | 'renewal_reminder'
  | 'security_alert'
  | 'maintenance'
  | 'feature_update'

/** 通知渠道 */
export type NotificationChannel = 'in_app' | 'email' | 'sms' | 'wechat' | 'push' | 'phone' | 'webhook'

/** 通知 */
export interface Notification {
  id: string
  type: NotificationType
  priority: NotificationPriority
  title: string
  message: string
  channels: NotificationChannel[]
  read: boolean
  sentAt: Date
  readAt?: Date
  actionUrl?: string
  actionLabel?: string
  metadata?: Record<string, unknown>
}

/** 通知偏好设置 */
export interface NotificationPreferences {
  enabledTypes: NotificationType[]
  enabledChannels: NotificationChannel[]
  quietHoursStart?: string // HH:mm 格式
  quietHoursEnd?: string   // HH:mm 格式
  emailFrequency: 'instant' | 'hourly' | 'daily' | 'weekly'
  language: 'zh-CN' | 'en-US'
}

// ============ 诊断类型 ============

/** 诊断问题类型 */
export type DiagnosisIssueType =
  | 'cannot_access'
  | 'login_failed'
  | 'feature_broken'
  | 'slow_performance'
  | 'data_error'
  | 'display_error'
  | 'payment_issue'
  | 'other'

/** 诊断类别 */
export type DiagnosisCategory =
  | 'browser'
  | 'network'
  | 'performance'
  | 'storage'
  | 'errors'
  | 'api'
  | 'resources'
  | 'screenshots'

/** 诊断类别结果 */
export interface DiagnosisCategoryResult {
  category: DiagnosisCategory
  status: 'healthy' | 'warning' | 'error'
  score: number
  issues: string[]
  data?: Record<string, unknown>
}

/** 诊断报告 */
export interface DiagnosisReport {
  id: string
  projectId: string
  status: 'idle' | 'collecting' | 'analyzing' | 'complete' | 'error'
  overallScore: number
  categories: DiagnosisCategoryResult[]
  browser: {
    name: string
    version: string
    platform: string
    language: string
    screenResolution: string
    viewportSize: string
    cookiesEnabled: boolean
    doNotTrack: boolean
  }
  network: {
    online: boolean
    connectionType: string
    downlink: number
    rtt: number
  }
  performance: {
    loadTime: number
    domReady: number
    memoryUsage: number
  }
  issues: DiagnosisIssue[]
  suggestions: string[]
  createdAt: Date
  completedAt?: Date
}

/** 诊断问题 */
export interface DiagnosisIssue {
  id: string
  category: DiagnosisCategory
  severity: 'info' | 'warning' | 'error' | 'critical'
  title: string
  description: string
  suggestion?: string
}

/** 诊断配置 */
export interface DiagnosisConfig {
  projectUrl?: string
  includeScreenshot?: boolean
  includePerformance?: boolean
  includeNetwork?: boolean
  timeout?: number
}

// ============ 首登引导类型 ============

/** 引导步骤 */
export type LoginGuideStep =
  | 'visit_login'
  | 'enter_credentials'
  | 'click_login'
  | 'verify_success'

/** 失败原因 */
export type LoginFailureReason =
  | 'wrong_password'
  | 'wrong_username'
  | 'account_locked'
  | 'account_not_found'
  | 'network_error'
  | 'server_error'
  | 'captcha_failed'
  | 'mfa_required'
  | 'session_expired'
  | 'unknown'

/** 引导会话 */
export interface LoginGuideSession {
  id: string
  projectId: string
  userId: string
  currentStep: LoginGuideStep
  steps: {
    step: LoginGuideStep
    status: 'pending' | 'in_progress' | 'completed' | 'failed'
    completedAt?: Date
    attempts?: number
    failureReason?: LoginFailureReason
  }[]
  credentials: {
    loginUrl: string
    username: string
    password: string
  }
  completed: boolean
  loginSucceeded: boolean
  failureHistory: {
    reason: LoginFailureReason
    timestamp: Date
    details?: string
  }[]
  createdAt: Date
  completedAt?: Date
}

// ============ 错误自动修复类型 ============

/** 错误类型 */
export type ErrorType =
  | 'network'
  | 'timeout'
  | 'resource'
  | 'dependency'
  | 'permission'
  | 'configuration'
  | 'external_service'
  | 'code_error'
  | 'data_error'
  | 'unknown'

/** 修复策略 */
export type FixStrategy =
  | 'retry'
  | 'backoff'
  | 'restart'
  | 'reconnect'
  | 'reconfigure'
  | 'rollback'
  | 'fallback'
  | 'skip'
  | 'manual'
  | 'escalate'

/** 修复尝试 */
export interface FixAttempt {
  id: string
  strategy: FixStrategy
  description: string
  status: 'pending' | 'running' | 'success' | 'failed' | 'skipped'
  startedAt?: Date
  completedAt?: Date
  error?: string
  result?: string
}

/** 自动修复会话 */
export interface AutoFixSession {
  id: string
  projectId: string
  errorType: ErrorType
  errorMessage: string
  errorStack?: string
  status: 'fixing' | 'success' | 'failed' | 'escalated' | 'manual'
  attempts: FixAttempt[]
  currentAttemptIndex: number
  maxAttempts: number
  humanInterventionRequired: boolean
  escalatedAt?: Date
  resolvedAt?: Date
  summary?: string
  createdAt: Date
}

// ============ 交付产物类型 ============

/** 交付产物 */
export interface DeliveryOutputs {
  productUrl?: string
  adminUrl?: string
  domain?: string
  credentials?: {
    username: string
    password: string
    note?: string
  }
  testReportUrl?: string
  documentationUrl?: string
  sourceCodeUrl?: string
  backupUrl?: string
  monitoringUrl?: string
  statusPageUrl?: string
}

/** 交付摘要 */
export interface DeliverySummary {
  projectId: string
  projectName: string
  status: 'in_progress' | 'completed' | 'failed'
  progress: number
  currentStage: DeliveryStage
  outputs: DeliveryOutputs
  startedAt: Date
  estimatedEndAt?: Date
  completedAt?: Date
  issues?: string[]
  nextSteps?: string[]
}

// ============ SSE 事件类型 ============

/** SSE 事件类型 */
export type SSEEventType =
  | 'connected'
  | 'progress'
  | 'heartbeat'
  | 'stage_change'
  | 'error'
  | 'acceptance_update'
  | 'notification'

/** SSE 事件 */
export interface SSEEvent<T = unknown> {
  event: SSEEventType
  data: T
  timestamp: number
}

// ============ API 响应类型 ============

/** 通用 API 响应 */
export interface ApiResponse<T = unknown> {
  success: boolean
  data?: T
  error?: string
  message?: string
}

/** 分页响应 */
export interface PaginatedResponse<T> {
  items: T[]
  total: number
  page: number
  pageSize: number
  hasMore: boolean
}

// ============ 工具类型 ============

/** 时间格式化选项 */
export interface TimeFormatOptions {
  showSeconds?: boolean
  showDate?: boolean
  relative?: boolean
}

/** 状态颜色配置 */
export interface StatusColorConfig {
  text: string
  bg: string
  border?: string
  icon?: string
}

/** 状态配置 */
export interface StatusConfig<T extends string> {
  status: T
  label: string
  labelCn: string
  color: StatusColorConfig
  icon?: string
  description?: string
}
