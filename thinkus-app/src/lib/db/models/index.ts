// 数据模型统一导出

// 用户相关
export { default as User } from './user'
export type { IUser, OAuthProvider, NotificationSettings, UserSettings, UserStats } from './user'

// 用户专属高管
export { UserExecutive, MemoryType } from './user-executive'
export type {
  IUserExecutive,
  IUserExecutiveModel,
  CommunicationStyle,
  DecisionStyle,
} from './user-executive'

// 项目相关
export { default as Project } from './project'
export type {
  IProject,
  ProjectStatus,
  ProjectType,
  ComplexityLevel,
  DecisionLevel,
  PhaseHistoryEntry,
  ProjectConfig,
  ProjectStats,
} from './project'

// 排队系统
export { Waitlist } from './waitlist'
export type {
  IWaitlist,
  IWaitlistModel,
  ApplicantRole,
  ReviewStatus,
  QueuePriority,
} from './waitlist'

// 邀请码
export { InvitationCode, TIER_BENEFITS } from './invitation-code'
export type {
  IInvitationCode,
  IInvitationCodeModel,
  InvitationCodeType,
  InvitationCodeTier,
  InvitationCodeStatus,
  InvitationBenefits,
} from './invitation-code'

// 通知
export { Notification } from './notification'
export type {
  INotification,
  INotificationModel,
  NotificationType,
  NotificationPriority,
  NotificationChannel,
  NotificationAction,
  NotificationRelatedTo,
} from './notification'

// 讨论
export { Discussion } from './discussion'
export type {
  IDiscussion,
  IDiscussionModel,
  DiscussionTrigger,
  DiscussionStatus,
  DiscussionMessage,
  MessageRole,
  ActionItem as DiscussionActionItem,
  ActionItemStatus as DiscussionActionItemStatus,
} from './discussion'

// 记忆
export { Memory } from './memory'
export type {
  IMemory,
  IMemoryModel,
  MemoryType as MemoryDocType,
  MemoryLayer,
} from './memory'

// 订阅
export { Subscription, SUBSCRIPTION_PLANS } from './subscription'
export type {
  ISubscription,
  ISubscriptionModel,
  SubscriptionPlan,
  SubscriptionStatus,
} from './subscription'

// 支付
export { Payment } from './payment'
export type {
  IPayment,
  IPaymentModel,
  PaymentStatus,
  PaymentType,
} from './payment'

// 决策
export { Decision } from './decision'
export type {
  IDecision,
  IDecisionModel,
  DecisionType,
  DecisionStatus,
  DecisionImportance,
} from './decision'

// 行动项
export { ActionItem } from './action-item'
export type {
  IActionItem,
  IActionItemModel,
  ActionItemStatus,
  ActionItemPriority,
  ActionItemCategory,
} from './action-item'

// Webhook 事件
export { WebhookEvent } from './webhook-event'
export type {
  IWebhookEvent,
  IWebhookEventModel,
  WebhookSource,
  WebhookEventStatus,
} from './webhook-event'

// 提示词执行记录
export { PromptExecution } from './prompt-execution'
export type {
  IPromptExecution,
  IPromptExecutionModel,
  ExecutionMetrics,
  PromptMetrics,
} from './prompt-execution'

// 验证码
export { default as VerificationCode } from './verification-code'
export type { IVerificationCode, VerificationCodeType } from './verification-code'

// 用户凭证
export { UserCredential } from './user-credential'
export type { IUserCredential, CredentialServiceType } from './user-credential'

// 交付物
export { Deliverable } from './deliverable'
export type {
  IDeliverable,
  IDeliverableModel,
  DeliverableType,
  DeliverableStatus,
  DeliverableVersion,
} from './deliverable'

// 外部专家咨询
export { ExpertConsultation } from './expert-consultation'
export type {
  IExpertConsultation,
  IExpertConsultationModel,
  ConsultationStatus,
  ConsultationMessage,
} from './expert-consultation'

// 蒸馏技能
export { DistilledSkill } from './distilled-skill'
export type {
  IDistilledSkill,
  IDistilledSkillModel,
  SkillCategory,
} from './distilled-skill'

// 例会
export { Standup } from './standup'
export type {
  IStandup,
  IStandupModel,
  StandupType,
  StandupStatus,
  AgendaItem,
  ParticipantReport,
} from './standup'

// AI 使用统计
export { AIUsage, MODEL_PRICING } from './ai-usage'
export type {
  IAIUsage,
  IAIUsageModel,
  AIModel,
  UsageType,
  UsageStats,
} from './ai-usage'

// 用户反馈
export { Feedback } from './feedback'
export type {
  IFeedback,
  IFeedbackModel,
  FeedbackType,
  FeedbackStatus,
  FeedbackPriority,
} from './feedback'

// 活动日志
export { ActivityLog } from './activity-log'
export type {
  IActivityLog,
  IActivityLogModel,
  ActivityType,
  ActivityEntity,
} from './activity-log'

// 项目分享
export { ProjectShare } from './project-share'
export type {
  IProjectShare,
  IProjectShareModel,
  SharePermission,
  ShareStatus,
} from './project-share'

// Artifact 产物存储
export { Artifact } from './artifact'
export type {
  IArtifact,
  IArtifactModel,
  ArtifactType,
  StorageType,
  ArtifactCompact,
  ArtifactLocator,
} from './artifact'

// 会话摘要
export { SessionSummary } from './session-summary'
export type {
  ISessionSummary,
  ISessionSummaryModel,
  SummaryDecision,
  SummaryArtifactRef,
} from './session-summary'

// 经验库
export { Experience } from './experience'
export type {
  IExperience,
  IExperienceModel,
  ExperienceType,
  ProjectCategory,
  ComplexityLevel as ExperienceComplexityLevel,
  CodeFile,
} from './experience'

// 分析事件 (Phase 4 新增)
export { AnalyticsEvent } from './analytics-event'
export type {
  IAnalyticsEvent,
  IAnalyticsEventModel,
  AnalyticsEventType,
} from './analytics-event'

// 交付会话
export { DeliverySession } from './delivery-session'
export type {
  IDeliverySession,
  IDeliverySessionModel,
  DeliveryStage,
  StageStatus,
  StageInfo,
  DeliveryOutputs,
  DeliveryConfig,
} from './delivery-session'

// 交付事件
export { DeliveryEvent } from './delivery-event'
export type {
  IDeliveryEvent,
  IDeliveryEventModel,
  DeliveryEventType,
  EventLevel,
} from './delivery-event'

// 验收会话
export { AcceptanceSession } from './acceptance-session'
export type {
  IAcceptanceSession,
  IAcceptanceSessionModel,
  AcceptanceStatus,
  CheckItemStatus,
  AcceptanceCheckItem,
  AcceptanceIssue,
} from './acceptance-session'

// 交付报告
export { DeliveryReport } from './delivery-report'
export type {
  IDeliveryReport,
  IDeliveryReportModel,
  DeliveryReportType,
  ReportStatus,
  TestReportData,
  AcceptanceReportData,
  DeliveryReportData,
} from './delivery-report'
