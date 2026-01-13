/**
 * AI高管系统入口
 *
 * 导出所有高管相关模块
 */

// 配置
export {
  AI_EXECUTIVES,
  AGENT_IDS,
  PHASE_CORE_AGENTS,
  TOPIC_EXPERTS,
  RISK_FACTOR_NAMES,
  DECISION_LEVEL_DESCRIPTIONS,
  getExecutive,
  getExecutivesByCategory,
  getPhaseAgents,
  getTopicExperts,
  selectParticipants,
  scoreToDecisionLevel,
  getAgentNamespace,
  getProjectNamespace,
  getUserNamespaces,
} from '@/lib/config/ai-executives'

export type {
  AgentId,
  AgentCategory,
  AIExecutive,
  ProjectPhase,
  DecisionLevel,
  RiskFactor,
  DecisionClassification,
  UserExecutive,
  CommunicationStyle,
  DecisionStyle,
  MemoryType,
} from '@/lib/config/ai-executives'

// 提示词
export {
  getExecutiveSystemPrompt,
  buildAgentPrompt,
  getDataSensingPrompt,
  getTopicAnalysisPrompt,
  getComplexityAssessmentPrompt,
  getDecisionClassificationPrompt,
  getExecutionAnalysisPrompt,
  getDiscussionOrchestratorPrompt,
  getAgentResponsePrompt,
  getDiscussionSummaryPrompt,
  getDailyStandupPrompt,
  getWeeklyReviewPrompt,
  generateExecutiveTeamIntro,
} from './prompts'

// 自治系统
export {
  AutonomousSystem,
  DataSensingEngine,
  WorkSchedulingEngine,
  DecisionClassificationEngine,
  ExecutionTrackingEngine,
  DiscussionManager,
  ScheduledTaskManager,
} from './autonomous'

export type {
  AIClient,
  DataChangeEvent,
  DataSensingResult,
  SchedulingRequest,
  SchedulingResult,
  DecisionRequest,
  ExecutionTask,
  ExecutionAnalysisResult,
  DiscussionMessage,
  DiscussionSession,
  ScheduledTask,
} from './autonomous'
