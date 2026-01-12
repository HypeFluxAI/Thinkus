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
