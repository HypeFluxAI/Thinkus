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
  ageMemories,
  boostMemoryImportance,
  cleanupMemories,
  consolidateMemories,
  getMemoryHealthStatus,
  runMemoryMaintenance,
} from './memory-maintenance-service'

// 讨论编排服务
export {
  type DiscussionStage,
  type OrchestratorMessage,
  type DiscussionContext,
  getNextStage,
  getStageConfig,
  generateAgentResponse,
  generateAgentResponseStream,
  executeDiscussionRound,
  generateDiscussionSummary,
  determineSpokenOrder,
} from './discussion-orchestrator'

// 决策服务
export {
  type RiskLevel,
  type DecisionAssessment,
  assessDecisionRisk,
  analyzeDecisionWithAI,
  approveDecision,
  rejectDecision,
  implementDecision,
  getPendingDecisions,
  assessProjectDecisions,
  autoApproveDecision,
  autoExecuteDecision,
  processAutoDecisions,
} from './decision-service'

// 决策提取服务
export {
  extractDecisionsFromDiscussion,
  getProjectDecisionSummary,
} from './decision-extractor'

// 高管服务
export {
  ExecutiveService,
} from './executive-service'

// 技能蒸馏服务
export {
  distillFromConsultation,
  processUnDistilledConsultations,
  distillFromDiscussion,
  getDistillationStats,
  searchSkills,
} from './skill-distillation-service'

// 例会服务
export {
  startStandup,
  generateParticipantReports,
  generateStandupMinutes,
  completeStandup,
  scheduleAutoDailyStandup,
  runScheduledStandups,
} from './standup-service'

// 活动日志服务
export {
  logProjectCreated,
  logProjectUpdated,
  logProjectDeleted,
  logDiscussionStarted,
  logDiscussionCompleted,
  logDecisionProposed,
  logDecisionApproved,
  logDecisionRejected,
  logActionCreated,
  logActionCompleted,
} from './activity-service'

// 话题分析服务
export {
  type TopicAnalysis,
  analyzeTopicWithAI,
  analyzeTopicQuick,
} from './topic-analyzer'

// 偏好提取服务
export {
  type ExtractedPreferences,
  extractPreferencesFromDiscussion,
  updateExecutivePreferences,
  extractAndStoreInsights,
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
  type TutorialFormat,
  type TutorialStep,
  type Tutorial,
  type TutorialTemplate,
} from './tutorial-generator'

// 一键报障服务 (小白用户优化 P1)
export {
  issueReporter,
  IssueReporterService,
  type IssueType,
  type IssueSeverity,
  type DiagnosisResult,
  type DiagnosisCause,
  type AutoFixSuggestion,
  type IssueReport,
  type SystemInfo,
  ISSUE_TYPE_CONFIG,
} from './issue-reporter'

// 交付信息存档服务 (小白用户优化 P1)
export {
  deliveryArchive,
  DeliveryArchiveService,
  type DeliveryInfo,
  type EmailRecord,
  type ResendOptions,
  type DeliverySummary,
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
  type ScenarioType,
  type TestPriority,
  type TestStatus,
  type TestStep,
  type TestScenario,
  type AcceptanceTestReport,
  type TestConfig,
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
  type CheckResult as DeliveryCheckResult,
} from './delivery-checklist'

// 一键交付编排服务 (交付自动化 P0)
export {
  oneClickDelivery,
  OneClickDeliveryService,
  type DeliveryStage as OneClickDeliveryStage,
  type StageStatus,
  type DeliveryStep,
  type DeliveryConfig as OneClickDeliveryConfig,
  type DeliveryResult,
} from './one-click-delivery'

// 用户账号初始化服务 (交付自动化 P0)
export {
  userOnboarding,
  UserOnboardingService,
  type AccountType,
  type AccountStatus,
  type NotificationChannel,
  type UserAccount,
  type CredentialInfo,
  type AccountConfig,
  type OnboardingResult,
} from './user-onboarding'

// 用户活跃度追踪服务 (交付后跟踪 P0)
export {
  userActivityTracker,
  UserActivityTrackerService,
  type ActivityLevel,
  type HealthStatus as UserHealthStatus,
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
  type DeliveryPhase as DashboardDeliveryPhase,
  type Priority as DashboardPriority,
  type SLAStatus,
  type DeliveryProject,
  type DeliveryTask,
  type TeamMember as DashboardTeamMember,
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

// 统一交付入口服务 (小白用户完整闭环 P0)
export {
  unifiedDelivery,
  UnifiedDeliveryService,
  type DeliveryFlowStage,
  type StageStatus as DeliveryStageStatus,
  type FlowStage,
  type DeliveryFlowConfig,
  type DeliveryFlowState as UnifiedDeliveryFlowState,
  type ProgressCallback as UnifiedProgressCallback,
} from './unified-delivery'

// 用户端状态页服务 (小白用户完整闭环 P0)
export {
  userStatusPage,
  UserStatusPageService,
  type ComponentStatus,
  type StatusComponent,
  type StatusIncident,
  type IncidentUpdate,
  type ScheduledMaintenance,
  type UptimeDataPoint,
  type StatusPageData,
  type StatusPageConfig,
} from './user-status-page'

// 主动通知服务 (小白用户完整闭环 P0)
export {
  proactiveNotifier,
  ProactiveNotifierService,
  type NotificationType,
  type NotificationPriority,
  type NotificationChannel as ProactiveNotificationChannel,
  type NotificationStatus,
  type Notification,
  type NotificationTemplate,
  type NotificationPreferences,
  type NotificationRule,
  type NotificationTrigger,
  type NotificationCondition,
  type NotificationStats,
} from './proactive-notifier'

// 紧急联系通道服务 (小白用户完整闭环 P1)
export {
  emergencyContact,
  EmergencyContactService,
  type UrgencyLevel,
  type ContactChannel,
  type IssueCategory,
  type EmergencyRequest,
  type TimelineEvent as EmergencyTimelineEvent,
  type SupportAgent,
  type WorkingHours,
  type SLAConfig,
} from './emergency-contact'

// 数据备份恢复服务 (小白用户完整闭环 P1)
export {
  dataBackup,
  DataBackupService,
  type BackupType,
  type BackupStatus,
  type RestoreStatus,
  type BackupSchedule,
  type StorageLocation,
  type BackupRecord,
  type RestoreRecord,
  type BackupConfig,
  type BackupStats,
} from './data-backup'

// AI 引导验收服务 (小白用户 AI 自动化)
export {
  aiAcceptanceGuide,
  AIAcceptanceGuideService,
  type AIAcceptanceStep,
  type AIAcceptanceSession,
  type AcceptanceIssue,
  type AcceptanceResult,
} from './ai-acceptance-guide'

// E2E 测试执行器服务 (自动化交付 P0)
export {
  e2eTestExecutor,
  E2ETestExecutorService,
  type TestEnvironment,
  type TestCase,
  type TestStep as E2ETestStep,
  type TestAction,
  type TestResult,
  type StepResult,
  type E2ETestReport,
  type DeliveryIssue as E2EDeliveryIssue,
} from './e2e-test-executor'

// 简化版用户验收服务 (自动化交付 P0)
export {
  simpleAcceptance,
  SimpleAcceptanceService,
  type AcceptanceCheckItem,
  type SimpleAcceptanceSession,
  type AcceptanceOutcome,
  type SimpleIssueType,
  type UserFeedback,
  type AcceptanceIssueRecord,
} from './simple-acceptance'

// 交付报告生成服务 (自动化交付 P0)
export {
  deliveryReportGenerator,
  DeliveryReportGeneratorService,
  type DeliveryReportData,
  type DeliveryReport,
  type SignatureRequest,
  type Attachment,
} from './delivery-report-generator'

// 版本更新通知服务 (自动化交付 P0)
export {
  versionUpdateNotifier,
  VersionUpdateNotifierService,
  type UpdateType,
  type UpdatePriority,
  type UpdateStatus,
  type ChangelogItem,
  type VersionUpdate,
  type UpdateRecord,
  type UpdatePreferences,
  type UpdateCheckResult,
} from './version-update-notifier'

// 自动化交付编排器 (自动化交付 P0)
export {
  automatedDeliveryOrchestrator,
  AutomatedDeliveryOrchestrator,
  type DeliveryPhase as AutomatedDeliveryPhase,
  type PhaseStatus as AutomatedPhaseStatus,
  type DeliveryPhaseInfo,
  type AutomatedDeliveryConfig,
  type DeliveryFlowState as AutomatedDeliveryFlowState,
  type DeliveryOutputs,
  type TimelineEvent as DeliveryTimelineEvent,
  type ProgressCallback as AutomatedProgressCallback,
} from './automated-delivery-orchestrator'

// 真实云部署服务 (小白用户全自动交付 P0)
export {
  realCloudDeployer,
  RealCloudDeployerService,
  type CloudProvider,
  type FrameworkType,
  type DeploymentStatus,
  type DeploymentConfig,
  type DeploymentResult,
  type DeploymentProgress,
  type DeployProgressCallback,
} from './real-cloud-deployer'

// 交付门禁服务 (小白用户全自动交付 P0)
export {
  deliveryGate,
  DeliveryGateService,
  type GateCategory,
  type GateSeverity,
  type GateStatus,
  type GateCheck,
  type GateConfig,
  type GateResult,
} from './delivery-gate'

// 客户成功追踪服务 (小白用户全自动交付 P0)
export {
  customerSuccess,
  CustomerSuccessService,
  type SuccessStage,
  type SuccessMilestone,
  type InterventionType,
  type SuccessMetricType,
  type SuccessMetric,
  type Intervention,
  type CustomerProfile,
  type CustomerHealthReport,
} from './customer-success'

// SLA保障服务 (小白用户全自动交付 P0)
export {
  slaGuarantee,
  SLAGuaranteeService,
  type SLACategory,
  type SLADefinition,
  type SLARecord,
  type SLAStatus as SLARecordStatus,
  type SLAMetrics,
} from './sla-guarantee'

// 完整交付流程服务 (小白用户全自动交付 P0)
export {
  completeDeliveryWorkflow,
  CompleteDeliveryWorkflowService,
  type WorkflowStage,
  type StageStatus as WorkflowStageStatus,
  type WorkflowStageInfo,
  type CompleteDeliveryConfig,
  type WorkflowEvent,
  type WorkflowState,
  type ProgressCallback as WorkflowProgressCallback,
} from './complete-delivery-workflow'

// 交付队列管理服务 (内部运营工具)
export {
  deliveryQueue,
  DeliveryQueueService,
  type DeliveryPriority,
  type QueueItemStatus,
  type FailureReason,
  type QueueItem,
  type QueueStats as DeliveryQueueStats,
  type WorkerNode,
  type QueueConfig,
} from './delivery-queue'

// 运营控制台服务 (内部运营工具)
export {
  opsConsole,
  OpsConsoleService,
  type OperationType,
  type OperationLog,
  type Operator,
  type AnomalyType,
  type Anomaly,
  type SOPStep,
  type OpsMetrics,
  type QuickAction,
} from './ops-console'

// 数据迁移工具服务 (内部运营工具)
export {
  dataMigrator,
  DataMigratorService,
  type DataSourceType,
  type MigrationStatus,
  type FieldType as MigrationFieldType,
  type DataSourceConfig,
  type SourceField,
  type TargetField,
  type FieldMapping,
  type TransformType,
  type DataAnalysis,
  type DataIssue,
  type MigrationTask,
  type MigrationError,
} from './data-migrator'

// 测试数据生成服务 (内部运营工具)
export {
  testDataGenerator,
  TestDataGeneratorService,
  type TestDataType,
  type GenerateConfig,
  type BatchGenerateConfig,
  type GenerateResult,
} from './test-data-generator'

// 多环境管理服务 (内部运营工具)
export {
  environmentManager,
  EnvironmentManagerService,
  type EnvironmentType,
  type EnvironmentStatus,
  type EnvironmentConfig,
  type DeploymentVersion,
  type EnvironmentDiff,
  type HealthCheckResult,
} from './environment-manager'

// 客户沟通日志服务 (内部运营工具)
export {
  communicationLog,
  CommunicationLogService,
  type CommunicationChannel,
  type CommunicationType,
  type CommunicationDirection,
  type CommunicationRecord,
  type CommunicationStats,
} from './communication-log'

// 一键交付触发器服务 (内部运营工具)
export {
  deliveryTrigger,
  DeliveryTriggerService,
  type DeliveryMode,
  type DeliveryPhase,
  type PhaseStatus,
  type DeliveryConfig,
  type PhaseResult,
  type DeliveryState,
} from './delivery-trigger'

// 运营交付看板服务 (内部运营工具)
export {
  opsDeliveryBoard,
  OpsDeliveryBoardService,
  type DeliveryStage,
  type Priority,
  type HealthStatus,
  type DeliveryItem,
  type Blocker,
  type Activity,
  type BoardColumn,
  type BoardStats,
  type TeamMember,
} from './ops-delivery-board'

// 内部预演服务 (小白用户交付优化 P1)
export {
  internalPreview,
  InternalPreviewService,
  type PreviewStatus,
  type PreviewReviewer,
  type PreviewCheckItem,
  type PreviewConfig,
  type PreviewEnvironment,
  type PreviewApproval,
  type PreviewRejection,
  type AutoTestResult,
  type PreviewProgressCallback,
} from './internal-preview'

// 增强交付报告服务 (小白用户交付优化 P1)
export {
  enhancedDeliveryReport,
  EnhancedDeliveryReportService,
  type VideoTutorial,
  type QuickStartStep,
  type FAQItem,
  type EmergencyContact,
  type EnhancedReportConfig,
  type EnhancedDeliveryReport,
} from './enhanced-delivery-report'

// 续费预警系统 (小白用户交付优化 P1)
export {
  renewalAlertSystem,
  RenewalAlertSystem,
  type ServiceType as RenewalServiceType,
  type AlertStage,
  type NotifyChannel as RenewalNotifyChannel,
  type ServiceStatus as RenewalServiceStatus,
  type ServiceConfig as RenewalServiceConfig,
  type AlertSchedule,
  type RegisteredService,
  type AlertRecord,
  type RenewalAttempt,
  type RenewalAlertConfig,
  type UserAlertPreferences,
  type RenewalSummary as EnhancedRenewalSummary,
  type ExpiringService,
  type UpcomingRenewal,
} from './renewal-alert-system'

// 交付质量评分服务 (交付闭环补全 P0)
export {
  deliveryQualityScorer,
  DeliveryQualityScorerService,
  type QualityDimension,
  type QualityGrade,
  type QualityStatus,
  type DimensionScore,
  type ScoreDetail,
  type BaselineComparison,
  type ImprovementPlan,
  type QualityReport,
  type QualityCheckConfig,
  type TestResults as QualityTestResults,
  type DeploymentInfo as QualityDeploymentInfo,
  type UserFeedback as QualityUserFeedback,
} from './delivery-quality-scorer'

// 交付延期管理服务 (交付闭环补全 P0)
export {
  deliveryDelayManager,
  DeliveryDelayManagerService,
  type DelayStatus,
  type DelayReasonType,
  type DelayDetection,
  type RiskFactor as DelayRiskFactor,
  type DelayReason,
  type RecommendedAction as DelayRecommendedAction,
  type CommunicationPlan,
  type CompensationPlan,
  type Reschedule,
  type DelayConfig,
  type Milestone as DelayMilestone,
} from './delivery-delay-manager'

// 反向确认反馈服务 (交付闭环补全 P0)
export {
  deliveryAckSystem,
  DeliveryAckSystemService,
  type NotificationType as AckNotificationType,
  type TrackingEventType,
  type AckChannel,
  type AcknowledgeStatus,
  type NotificationRecord,
  type TrackingEvent,
  type AcknowledgeReceipt,
  type AckStatistics,
  type SendWithAckConfig,
} from './delivery-ack-system'

// ============================================
// 小白用户交付体验优化系统 (P0-P2)
// ============================================

// 测试质量红绿灯服务 (P0)
export {
  qualityRedGreenLight,
  QualityRedGreenLightService,
  type TrafficLightStatus,
  type CheckCategory as TrafficLightCategory,
  type CheckItemResult,
  type OverallConclusion,
  type TrafficLightReport,
} from './quality-red-green-light'

// 部署失败人话翻译服务 (P0)
export {
  deploymentFailureTranslator,
  DeploymentFailureTranslatorService,
  type FailureType,
  type RecoveryStatus,
  type TranslatedFailure,
  type RecoveryStep,
  type RecoveryProgress,
} from './deployment-failure-translator'

// 傻瓜式签收服务 (P0)
export {
  deliverySignOffSimple,
  DeliverySignOffSimpleService,
  type SignOffStatus,
  type SignOffMethod,
  type SimpleConfirmItem,
  type SignOffSession,
  type SignOffResult,
} from './delivery-sign-off-simple'

// 首次交付检查向导服务 (P0)
export {
  firstDeliveryChecklistWizard,
  FirstDeliveryChecklistWizardService,
  type CheckStepType,
  type CheckStep,
  type CheckWizardSession,
  type CheckIssue,
} from './first-delivery-checklist-wizard'

// 立即人工支持服务 (P0)
export {
  immediateHumanSupport,
  ImmediateHumanSupportService,
  type QuickIssueType,
  type SupportChannel,
  type UrgencyLevel as SupportUrgencyLevel,
  type SupportRequest,
  type SupportSlot,
} from './immediate-human-support'

// 首登魔力时刻服务 (P1)
export {
  firstLoginMagicMoment,
  FirstLoginMagicMomentService,
  type OnboardingStep,
  type OnboardingSession,
  type OnboardingBadge,
} from './first-login-magic-moment'

// 里程碑追踪服务 (P1)
export {
  milestoneTracker,
  MilestoneTrackerService,
  type MilestoneStatus,
  type OverallStatus,
  type Milestone,
  type MilestoneSession,
  type ProgressSummary,
} from './milestone-tracker'

// 侧边栏AI助手服务 (P1)
export {
  integratedAIChat,
  IntegratedAIChatService,
  type ChatMessage,
  type ChatSession,
  type SuggestedAction,
  type FAQResponse,
} from './integrated-ai-chat'

// 工单追踪系统服务 (P1)
export {
  supportTicketSystem,
  SupportTicketSystemService,
  type TicketStatus,
  type TicketPriority,
  type TicketCategory,
  type Ticket,
  type TicketReply,
  type TicketEvent,
} from './support-ticket-system'

// 首条数据创建向导服务 (P1)
export {
  firstDataCreationWizard,
  FirstDataCreationWizardService,
  type DataCreationStep,
  type DataCreationWizard,
} from './first-data-creation-wizard'

// 一键反馈系统服务 (P1)
export {
  oneClickFeedbackSystem,
  OneClickFeedbackSystemService,
  type FeedbackType,
  type Feedback,
} from './one-click-feedback-system'

// 上下文帮助系统服务 (P1)
export {
  contextualHelpSystem,
  ContextualHelpSystemService,
  type HelpTip,
  type ContextualHelp,
} from './contextual-help-system'

// 价格透明化服务 (P2)
export {
  pricingTransparency,
  PricingTransparencyService,
  type CostCategory,
  type CostItem,
  type CostBreakdown,
  type PaymentRecord,
  type UpcomingPayment,
  type BudgetEstimate,
} from './pricing-transparency'

// 知识库集成服务 (P2)
export {
  knowledgeBaseIntegration,
  KnowledgeBaseIntegrationService,
  type ArticleCategory,
  type KnowledgeArticle,
  type SearchResult,
  type FAQ,
} from './knowledge-base-integration'

// 一键导出数据服务 (P2)
export {
  dataExportOneClick,
  DataExportOneClickService,
  type ExportFormat,
  type ExportDataType,
  type ExportRequest,
  type ExportPreview,
} from './data-export-one-click'

// 简化邀请服务 (P2)
export {
  teamInvitationSimplified,
  TeamInvitationSimplifiedService,
  type TeamRole,
  type InviteMethod,
  type TeamMember as InviteTeamMember,
  type Invitation,
  type InviteTemplate,
} from './team-invitation-simplified'

// 赢回不活跃用户服务 (P2)
export {
  inactiveUserWinBack,
  InactiveUserWinBackService,
  type InactivityLevel,
  type WinBackActionType,
  type InactiveUser,
  type WinBackAttempt,
  type WinBackCampaign,
  type WinBackOffer,
} from './inactive-user-win-back'

// 流失再见流程服务 (P2)
export {
  churnExitExperience,
  ChurnExitExperienceService,
  type ChurnReason,
  type ExitStage,
  type ExitSession,
  type RetentionOffer,
  type ChurnAnalytics,
} from './churn-exit-experience'

// ============================================
// 小白用户全自动化交付闭环补全 (v3.7.6)
// ============================================

// 交付就绪信号系统 (P0-1)
export {
  deliveryReadySignal,
  DeliveryReadySignalService,
  type ReadinessCheck,
  type ReadinessCategory,
  type CheckStatus as ReadinessCheckStatus,
  type ReadinessStatus,
  type NotificationChannel as ReadinessNotificationChannel,
  type ReadinessNotificationConfig,
  type ReadinessResult,
  type ReadinessEvent,
} from './delivery-ready-signal'

// 统一交付状态管理器 (P0-3)
export {
  deliveryStateManager,
  DeliveryStateManagerService,
  type DeliveryStage as StateDeliveryStage,
  type StageStatus as StateStageStatus,
  type StageConfig,
  type StageResult,
  type DeliveryState as ManagedDeliveryState,
  type DeliveryOutputs as StateDeliveryOutputs,
  type StateChangeEvent,
  type StateChangeCallback,
} from './delivery-state-manager'

// 错误恢复编排器 (P1-1)
export {
  errorRecoveryOrchestrator,
  ErrorRecoveryOrchestratorService,
  type ErrorType,
  type RecoveryStrategy,
  type RecoveryStrategyType,
  type ClassifiedError,
  type RecoveryAction,
  type RecoverySession,
  type RecoveryReport,
} from './error-recovery-orchestrator'

// 智能问题诊断服务 (P1-2)
export {
  smartIssueDiagnosis,
  SmartIssueDiagnosisService,
  type DiagnosisIssueType,
  type DiagnosisCheckType,
  type DiagnosisCheckResult,
  type DiagnosisCause as SmartDiagnosisCause,
  type QuickFix,
  type DiagnosisSession,
  type DiagnosisReport,
} from './smart-issue-diagnosis'

// 分阶段用户引导系统 (P1-3)
export {
  phasedUserGuide,
  PhasedUserGuideService,
  type UserPhase,
  type GuideTask,
  type PhaseConfig,
  type TaskCompletion,
  type UserProgress,
  type PhaseReward,
  type StuckIntervention,
} from './phased-user-guide'

// ============================================
// 小白用户自动化交付新增服务 (v3.7.7)
// ============================================

// 验收超时自动处理服务 (P0-1)
export {
  acceptanceTimeoutHandler,
  AcceptanceTimeoutHandlerService,
  type TimeoutConfig,
  type TimeoutStatus,
  type TimeoutEventType,
  type TimeoutEvent,
  type TimeoutSession,
  type CountdownCallback,
  type TimeoutEventCallback,
  DEFAULT_TIMEOUT_CONFIG,
} from './acceptance-timeout-handler'

// 实时进度面板服务 (P0-2)
export {
  realtimeProgressDashboard,
  RealtimeProgressDashboardService,
  type ProgressStage,
  type NotificationChannel as ProgressNotificationChannel,
  type NotificationConfig as ProgressNotificationConfig,
  type ProgressEvent as RealtimeProgressEvent,
  type ProgressSession,
} from './realtime-progress-dashboard'

// 错误自动修复树服务 (P0-3)
export {
  errorAutoFixTree,
  ErrorAutoFixTreeService,
  type ErrorType as AutoFixErrorType,
  type FixStrategyType,
  type FixResult,
  type ClassifiedError as AutoFixClassifiedError,
  type FixContext,
  type FixAttemptResult,
  type FixSession,
  type FixProgressCallback,
} from './error-autofix-tree'

// 首登保障服务 (P0-4)
export {
  firstLoginGuard,
  FirstLoginGuardService,
  type LoginStatus,
  type LoginFailureReason,
  type LoginCredentials,
  type CredentialVerifyResult,
  type LoginGuardSession,
  type LoginAttempt,
  type AutoFixAttempt as LoginAutoFixAttempt,
  type LoginResultCallback,
} from './first-login-guard'

// 多渠道可靠通知服务 (P0-5)
export {
  reliableNotification,
  ReliableNotificationService,
  type NotificationChannel as ReliableNotificationChannel,
  type NotificationPriority as ReliableNotificationPriority,
  type NotificationType as ReliableNotificationType,
  type DeliveryStatus,
  type NotificationMessage,
  type DeliveryRecord,
  type DeliveryAttempt,
  type NotificationSession,
  type NotificationPreferences as ReliableNotificationPreferences,
  type DeliveryCallback,
} from './reliable-notification'

// 一键诊断收集服务 (P0-6)
export {
  oneclickDiagnosis,
  OneclickDiagnosisService,
  type DiagnosisCategory,
  type DiagnosisItemStatus,
  type DiagnosisItem,
  type BrowserInfo,
  type NetworkInfo,
  type PerformanceMetrics,
  type StorageInfo,
  type ErrorLog,
  type UserAction as DiagnosisUserAction,
  type ApiCall,
  type DiagnosisReport as OneclickDiagnosisReport,
  type CollectionConfig,
} from './oneclick-diagnosis'

// ============ 真实交付服务 (新增) ============

// Vercel 真实部署服务
export {
  VercelDeployerService,
  getVercelDeployer,
  deployToVercel,
  checkDeploymentStatus,
  rollbackDeployment,
  type VercelDeploymentState,
  type VercelFramework,
  type VercelDeployConfig,
  type DeploymentFile,
  type VercelDeploymentResult,
  type VercelProject,
  type VercelDomain,
  type DeployProgressCallback,
} from './vercel-deployer'

// Playwright E2E 测试服务
export {
  PlaywrightTesterService,
  runE2ETests,
  runHealthCheck,
  runCriticalPathTest,
  DEFAULT_TEST_SCENARIOS,
  ECOMMERCE_TEST_SCENARIOS,
  type TestStatus,
  type BrowserType,
  type DeviceType,
  type TestResult,
  type TestSuiteResult,
  type E2ETestReport,
  type E2ETestConfig,
  type TestScenario,
  type TestStep,
  type TestProgressCallback,
} from './playwright-tester'

// 邮件通知服务
export {
  EmailNotifierService,
  getEmailNotifier,
  sendEmail,
  sendDeliveryCompleteEmail,
  sendCredentialsEmail,
  type EmailPriority,
  type EmailType,
  type EmailAttachment,
  type EmailConfig,
  type EmailSendResult,
} from './email-notifier'

// 统一交付编排器
export {
  DeliveryOrchestratorService,
  getDeliveryOrchestrator,
  startDelivery,
  getDeliveryStatus,
  getDeliveryEvents,
  type ProductType,
  type DeliveryOrchestratorConfig,
  type DeliveryProgressCallback as OrchestratorProgressCallback,
  type DeliveryResult,
} from './delivery-orchestrator'

// 版本追踪服务 (v12 新增)
export {
  versionTracker,
  VersionTracker,
  type Version,
  type FileChange,
  type VersionMetadata,
  type VersionDiff,
  type RollbackResult,
  type VersionSearchOptions,
  type VersionTreeNode,
  type ChangeType,
  type EntityType,
} from './version-tracking'

// 计划先行服务 (v12 新增)
export {
  planFirstService,
  PlanFirstService,
  type DevelopmentPlan,
  type PlanStep,
  type PlanSubStep,
  type PlanContext,
  type PlanGenerationResult,
  type PlanExecutionProgress,
  type PlanModification,
  type PlanStepStatus,
  type PlanApprovalStatus,
  type PlanAlternative,
} from './plan-first'
