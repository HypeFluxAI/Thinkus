export interface Expert {
  id: string
  name: string
  title: string
  avatar: string
  color: string
  focus: string
  personality: string
}

export const CORE_EXPERTS: Expert[] = [
  {
    id: 'mike',
    name: 'Mike',
    title: '产品经理',
    avatar: '👨‍💼',
    color: 'bg-blue-500',
    focus: '功能完整性、用户流程、商业价值',
    personality: '理性、全局视角、注重落地',
  },
  {
    id: 'elena',
    name: 'Elena',
    title: 'UX设计师',
    avatar: '👩‍🎨',
    color: 'bg-pink-500',
    focus: '用户体验、界面设计、交互流程',
    personality: '感性、用户视角、追求简洁',
  },
  {
    id: 'david',
    name: 'David',
    title: '技术架构师',
    avatar: '👨‍💻',
    color: 'bg-green-500',
    focus: '技术可行性、系统架构、性能安全',
    personality: '严谨、技术视角、注重可维护性',
  },
]

export const EXTENDED_EXPERTS: Expert[] = [
  {
    id: 'sarah',
    name: 'Sarah',
    title: '产品策略师',
    avatar: '👩‍💼',
    color: 'bg-purple-500',
    focus: '市场定位、竞争分析、商业模式',
    personality: '战略思维、市场敏感、注重差异化',
  },
  {
    id: 'alex',
    name: 'Alex',
    title: '安全专家',
    avatar: '🔒',
    color: 'bg-red-500',
    focus: '数据安全、隐私合规、风险防控',
    personality: '谨慎、安全第一、注重合规',
  },
  {
    id: 'lisa',
    name: 'Lisa',
    title: '增长专家',
    avatar: '📈',
    color: 'bg-orange-500',
    focus: '用户增长、留存策略、数据驱动',
    personality: '数据导向、增长思维、注重转化',
  },
]

export type DiscussionPhase =
  | 'understanding'
  | 'brainstorming'
  | 'ideation'
  | 'challenge'
  | 'synthesis'
  | 'validation'

export interface DiscussionPhaseConfig {
  id: DiscussionPhase
  name: string
  goal: string
  minRounds: number
  maxRounds: number
  allowUserInput: boolean
}

export const DISCUSSION_PHASES: DiscussionPhaseConfig[] = [
  {
    id: 'understanding',
    name: '需求理解',
    goal: '确保正确理解用户需求',
    minRounds: 1,
    maxRounds: 3,
    allowUserInput: true,
  },
  {
    id: 'brainstorming',
    name: '头脑风暴',
    goal: '深度探索各种可能性，发散思维',
    minRounds: 3,
    maxRounds: 15,
    allowUserInput: true,
  },
  {
    id: 'ideation',
    name: '方案构思',
    goal: '各角度提出建议',
    minRounds: 1,
    maxRounds: 5,
    allowUserInput: true,
  },
  {
    id: 'challenge',
    name: '挑战质疑',
    goal: '发现问题和风险',
    minRounds: 1,
    maxRounds: 5,
    allowUserInput: true,
  },
  {
    id: 'synthesis',
    name: '方案综合',
    goal: '形成统一方案',
    minRounds: 1,
    maxRounds: 3,
    allowUserInput: false,
  },
  {
    id: 'validation',
    name: '最终确认',
    goal: '所有专家确认',
    minRounds: 1,
    maxRounds: 2,
    allowUserInput: true,
  },
]

export type DiscussionMode = 'quick' | 'standard' | 'deep' | 'brainstorm' | 'expert'

export interface DiscussionModeConfig {
  name: string
  phases: DiscussionPhase[]
  description: string
  estimatedMinutes: string
  targetRounds: number
}

export const DISCUSSION_MODES: Record<DiscussionMode, DiscussionModeConfig> = {
  quick: {
    name: '快速模式',
    phases: ['understanding', 'synthesis'],
    description: '快速生成方案，约1分钟',
    estimatedMinutes: '1',
    targetRounds: 6,
  },
  standard: {
    name: '标准模式',
    phases: ['understanding', 'ideation', 'challenge', 'synthesis'],
    description: '标准讨论流程，约3分钟',
    estimatedMinutes: '3',
    targetRounds: 15,
  },
  deep: {
    name: '深度模式',
    phases: ['understanding', 'ideation', 'challenge', 'synthesis', 'validation'],
    description: '深度探索需求，约5分钟',
    estimatedMinutes: '5',
    targetRounds: 20,
  },
  brainstorm: {
    name: '头脑风暴',
    phases: ['understanding', 'brainstorming', 'challenge', 'synthesis'],
    description: '充分探索需求，约8分钟',
    estimatedMinutes: '8',
    targetRounds: 25,
  },
  expert: {
    name: '专家模式',
    phases: ['understanding', 'brainstorming', 'ideation', 'challenge', 'synthesis', 'validation'],
    description: '完整专家讨论，约10分钟',
    estimatedMinutes: '10',
    targetRounds: 30,
  },
}

export function getExpertById(id: string): Expert | undefined {
  return [...CORE_EXPERTS, ...EXTENDED_EXPERTS].find(e => e.id === id)
}

export function selectExperts(projectType: string, complexity: string): Expert[] {
  const experts = [...CORE_EXPERTS]

  // Add extended experts based on conditions
  if (['L3', 'L4', 'L5'].includes(complexity)) {
    const sarah = EXTENDED_EXPERTS.find(e => e.id === 'sarah')
    const lisa = EXTENDED_EXPERTS.find(e => e.id === 'lisa')
    if (sarah) experts.push(sarah)
    if (lisa) experts.push(lisa)
  }

  if (['blockchain', 'finance', 'healthcare'].includes(projectType)) {
    const alex = EXTENDED_EXPERTS.find(e => e.id === 'alex')
    if (alex) experts.push(alex)
  }

  return experts
}

export function getPhaseConfig(phase: DiscussionPhase): DiscussionPhaseConfig {
  return DISCUSSION_PHASES.find(p => p.id === phase) || DISCUSSION_PHASES[0]
}
