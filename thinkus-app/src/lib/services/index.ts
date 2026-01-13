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
