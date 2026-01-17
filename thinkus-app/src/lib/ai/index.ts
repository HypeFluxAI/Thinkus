// AI 模块统一导出

// Claude API 封装
export {
  chat,
  streamChat,
  type ClaudeModel,
  type ChatOptions,
  type ChatResponse,
  type StreamChatOptions,
} from './claude'

// 模型路由器 (Phase 1 新增)
export {
  modelRouter,
  ModelRouterService,
  MODEL_CONFIG,
  getModelForTask,
  getHaikuModel,
  getSonnetModel,
  getOpusModel,
  type ModelConfig,
  type TaskType,
  type Complexity,
  type TaskContext,
  type ModelSelection,
} from './model-router'

// AI能力检测器 (v12 新增)
export {
  aiCapabilityDetector,
  AICapabilityDetector,
  type AICapabilityType,
  type AICapabilityConfig,
  type CapabilityDetectionResult,
  type AICapabilitySuggestion,
  type UsageEstimate,
} from './capability-detector'

// 研究员 Agent (v12 新增)
export {
  librarianAgent,
  LibrarianAgent,
  type ResearchResult,
  type ResearchQuery,
  type LibrarianConfig,
  type ResearchFinding,
  type CodeExample,
  type Reference,
} from './agents/librarian'
