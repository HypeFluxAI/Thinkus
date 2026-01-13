// 高管对话组件
export { ExecutiveChat, type ExecutiveMessage } from './executive-chat'

// 高管选择器
export { ExecutiveSelector, ExecutiveSelectorCompact } from './executive-selector'

// 多高管讨论
export { MultiAgentDiscussion } from './multi-agent-discussion'

// 高管卡片和团队展示
export {
  ExecutiveCard,
  ExecutiveTeamGrid,
  ExecutiveAvatarStack,
  SpeakingIndicator,
} from './executive-card'

// 决策确认对话框
export { DecisionConfirmDialog } from './decision-confirm'

// 高管讨论面板 (AI自治系统集成)
export {
  ExecutiveDiscussionPanel,
  DiscussionSummaryPanel,
} from './executive-discussion-panel'

// 定时任务 (每日站会/周复盘)
export {
  ScheduledTasks,
  TaskExecutionResult,
  type ScheduledTask,
} from './scheduled-tasks'
