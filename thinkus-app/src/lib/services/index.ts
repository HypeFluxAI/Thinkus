// 服务层统一导出

// 记忆相关服务
export {
  getUserPreferencesContext,
  getRelevantMemoriesContext,
  getProjectHistoryContext,
  enhanceConversationContext,
  buildEnhancedSystemPrompt,
  smartEnhanceContext,
  buildSmartEnhancedSystemPrompt,
  type EnhancedContext,
} from './memory-injector'

// 记忆控制器 (Phase 0 新增)
export {
  memoryController,
  MemoryControllerService,
  type MemoryControllerInput,
  type MemoryControllerOutput,
  type MemoryCatalogEntry,
  type MemoryDetails,
  type RetrievalResult,
} from './memory-controller'

// Artifact 服务 (Phase 0 新增)
export {
  artifactService,
  ArtifactService,
} from './artifact-service'

// 会话摘要服务 (Phase 0 新增)
export {
  sessionSummaryService,
  SessionSummaryService,
} from './session-summary-service'

// 记忆维护服务
export {
  memoryMaintenanceService,
  type MemoryHealthStatus,
  type MaintenanceResult,
} from './memory-maintenance-service'

// 讨论编排服务
export {
  discussionOrchestrator,
} from './discussion-orchestrator'

// 决策服务
export {
  decisionService,
} from './decision-service'

// 决策提取服务
export {
  decisionExtractor,
} from './decision-extractor'

// 高管服务
export {
  executiveService,
} from './executive-service'

// 技能蒸馏服务
export {
  skillDistillationService,
} from './skill-distillation-service'

// 例会服务
export {
  standupService,
} from './standup-service'

// 活动日志服务
export {
  activityService,
} from './activity-service'

// 话题分析服务
export {
  topicAnalyzer,
} from './topic-analyzer'

// 偏好提取服务
export {
  preferenceExtractor,
} from './preference-extractor'

// 经验库服务 (Phase 1 新增)
export {
  experienceService,
  ExperienceService,
  type ExperienceMatchRequest,
  type ExperienceMatchResult,
  type ExperienceCollectInput,
} from './experience-service'

// 邀请系统服务 (Phase 1 新增)
export {
  invitationService,
  InvitationService,
  type QueueStats,
  type ContributionType,
} from './invitation-service'

// 文档处理服务 (Phase 2 新增)
export {
  documentProcessor,
  DocumentProcessorService,
  type FileType,
  type UploadedFile,
  type ContentType,
  type FeatureItem,
  type UIElement,
  type DataField,
  type Reference,
  type StructuredContent,
  type ProcessedResult,
  type IntegratedRequirement,
} from './document-processor'

// 需求整合器 (Phase 2 新增)
export {
  requirementIntegrator,
  RequirementIntegratorService,
  type IntegrationInput,
  type IntegrationOutput,
} from './requirement-integrator'

// 沙盒管理器 (Phase 3 新增)
export {
  sandboxManager,
  SandboxManagerService,
  type SandboxImage,
  type SandboxStatus,
  type SandboxConfig,
  type Sandbox,
  type ExecResult,
  type FileInfo,
  type SandboxEvent,
} from './sandbox-manager'

// 实时推送服务 (Phase 3 新增)
export {
  realtimeStream,
  RealtimeStreamService,
  createSSEStream,
  type StreamEventType,
  type StreamEvent,
  type CodeChangeEvent,
  type TerminalOutputEvent,
  type AgentStatusEvent,
  type ProgressEvent,
  type PreviewUpdateEvent,
  type ErrorEvent,
  type MessageEvent,
} from './realtime-stream'

// 数据分析服务 (Phase 4 新增)
export {
  analyticsService,
  AnalyticsService,
  type Period,
  type ProjectStats,
  type TrendData,
  type FunnelStep,
  type Benchmark,
} from './analytics-service'

// 增长建议服务 (Phase 4 新增)
export {
  growthAdvisor,
  GrowthAdvisorService,
  type AdviceType,
  type AdvicePriority,
  type GrowthAdvice,
  type GrowthAdviceRecord,
} from './growth-advisor'

// 错误翻译服务 (小白用户优化)
export {
  errorTranslator,
  ErrorTranslatorService,
  translateError,
  shouldAutoRetry,
  isFatalError,
  type TranslatedError,
  type RetryConfig,
  type ErrorStats,
} from './error-translator'

// 状态聚合服务 (小白用户优化)
export {
  statusAggregator,
  StatusAggregatorService,
  type DeploymentInfo,
  type DatabaseInfo,
  type DomainInfo,
  type ApiHealthInfo,
  type ProjectStatusInput,
} from './status-aggregator'

// 子域名管理服务 (小白用户优化)
export {
  subdomainManager,
  SubdomainManagerService,
  type SubdomainRecord,
  type SubdomainStatus,
  type SSLStatus,
  type SubdomainConfigResult,
  type AvailabilityResult,
} from './subdomain-manager'

// 教程生成服务 (小白用户优化 P1)
export {
  tutorialGenerator,
  TutorialGeneratorService,
  type TutorialType,
  type TutorialStep,
  type Tutorial,
  type TutorialGenerateOptions,
} from './tutorial-generator'

// 一键报障服务 (小白用户优化 P1)
export {
  issueReporter,
  IssueReporterService,
  type IssueType,
  type DiagnosisResult,
  type AutoFixSuggestion,
  type IssueReport,
  type IssueReportInput,
  ISSUE_TYPE_CONFIG,
} from './issue-reporter'

// 交付信息存档服务 (小白用户优化 P1)
export {
  deliveryArchive,
  DeliveryArchiveService,
  type DeliveryInfo,
  type AdminCredentials,
  type DatabaseInfo,
  type DomainInfo,
  type EmailRecord,
  type DeliveryArchiveInput,
} from './delivery-archive'

// 构建自动修复服务 (小白用户优化 P2)
export {
  buildAutoFixer,
  BuildAutoFixerService,
  type BuildErrorType,
  type BuildError,
  type FixStrategy,
  type FixContext,
  type FixAttempt,
  type FixResult,
  type BuildFixReport,
} from './build-auto-fixer'

// 可视化配置编辑器服务 (小白用户优化 P2)
export {
  visualConfigEditor,
  VisualConfigEditorService,
  type ConfigType,
  type FieldType,
  type ConfigField,
  type ConfigGroup,
  type ConfigCategory,
  type ConfigValues,
  type ConfigChange,
  type ValidationResult,
} from './visual-config-editor'

// 续费提醒服务 (小白用户优化 P2)
export {
  renewalReminder,
  RenewalReminderService,
  type ServiceType,
  type ReminderChannel,
  type ReminderStatus,
  type ServiceRecord,
  type ReminderRecord,
  type ReminderConfig,
  type RenewalSummary,
} from './renewal-reminder'

// 自动化验收测试服务 (交付自动化 P0)
export {
  acceptanceTester,
  AcceptanceTesterService,
  type TestScenarioType,
  type TestPriority,
  type TestStepStatus,
  type TestStep,
  type TestScenario,
  type AcceptanceTestReport,
  type AcceptanceTestConfig,
} from './acceptance-tester'

// 交付自检清单服务 (交付自动化 P0)
export {
  deliveryChecklist,
  DeliveryChecklistService,
  type CheckCategory,
  type CheckStatus,
  type CheckImportance,
  type ChecklistItem,
  type DeliveryChecklist,
  type ChecklistReport,
} from './delivery-checklist'

// 一键交付编排服务 (交付自动化 P0)
export {
  oneClickDelivery,
  OneClickDeliveryService,
  type DeliveryStage,
  type StepStatus,
  type DeliveryStep,
  type DeliveryConfig,
  type DeliveryResult,
  type DeliveryOutput,
} from './one-click-delivery'

// 用户账号初始化服务 (交付自动化 P0)
export {
  userOnboarding,
  UserOnboardingService,
  type AccountType,
  type NotificationChannel,
  type PasswordStrength,
  type UserAccount,
  type OnboardingResult,
} from './user-onboarding'

// 用户活跃度追踪服务 (交付后跟踪 P0)
export {
  userActivityTracker,
  UserActivityTrackerService,
  type ActivityLevel,
  type HealthStatus,
  type UserActionType,
  type UserAction,
  type ActivityMetrics,
  type UserHealthReport,
  type RiskFactor,
  type RecommendedAction,
  type CareTrigger,
  type CareRecord,
  type ActivityTrackingConfig,
} from './user-activity-tracker'

// 持续运维自愈服务 (交付后跟踪 P0)
export {
  autoOps,
  AutoOpsService,
  type CheckType,
  type CheckResultStatus,
  type CheckResult,
  type InspectionReport,
  type Issue,
  type AutoFixAttempt,
  type Alert,
  type HealingStrategy,
  type HealingAction,
  type HealingContext,
  type HealingResult,
  type ProjectOpsConfig,
  type OpsDashboard,
} from './auto-ops'

// 内部交付看板服务 (交付后跟踪 P1)
export {
  deliveryDashboard,
  DeliveryDashboardService,
  type DeliveryPhase,
  type Priority,
  type SLAStatus,
  type DeliveryProject,
  type DeliveryTask,
  type TeamMember,
  type KanbanView,
  type KanbanColumn,
  type DashboardStats,
  type TimelineEvent,
  type DeliveryFilter,
} from './delivery-dashboard'

// 满意度收集服务 (交付后跟踪 P1)
export {
  satisfactionCollector,
  SatisfactionCollectorService,
  type RatingType,
  type SatisfactionDimension,
  type FeedbackStatus,
  type NPSCategory,
  type SatisfactionSurvey,
  type SurveyResponse,
  type SatisfactionStats,
  type ImprovementSuggestion,
  type SurveyTemplate,
  type SurveyQuestion,
} from './satisfaction-collector'
