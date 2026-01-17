/**
 * Optimization Modules - v12 优化模块
 * 统一导出所有优化相关功能
 */

// Magic Keyword Detector - 关键词检测器
export {
  KeywordDetector,
  keywordDetector,
  type DetectedMode,
  type KeywordConfig,
  type KeywordDetectionResult,
} from './keyword-detector'

// Todo Tracker - 任务追踪器
export {
  TodoTracker,
  todoTracker,
  initTodoTracker,
  getTodoTracker,
  type TodoItem,
  type TodoCheckResult,
  type TodoSource,
  type TodoStatus,
  type TodoTrackerConfig,
} from './todo-tracker'

// Comment Checker - 注释检查器
export {
  CommentChecker,
  commentChecker,
  type CommentType,
  type CommentIssue,
  type CommentCheckResult,
  type CommentCheckerConfig,
} from './comment-checker'

// Context Window Monitor - 上下文监控器
export {
  ContextWindowMonitor,
  contextWindowMonitor,
  type ContextStatus,
  type ContextAction,
  type ContextCheckResult,
  type CompactResult,
  type Message,
  type ContextMonitorConfig,
} from './context-monitor'

// Session Recovery - 会话恢复
export {
  SessionRecovery,
  sessionRecovery,
  type ErrorType,
  type RecoveryResult,
  type SessionRecoveryConfig,
  type ErrorPattern,
} from './session-recovery'

// 集成服务 - 统一管理优化模块
export {
  OptimizationIntegration,
  optimizationIntegration,
  type OptimizationConfig,
} from './integration'
