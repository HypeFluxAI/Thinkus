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
  | 'ideation'
  | 'challenge'
  | 'synthesis'
  | 'validation'

export interface DiscussionPhaseConfig {
  id: DiscussionPhase
  name: string
  goal: string
  maxRounds: number
}

export const DISCUSSION_PHASES: DiscussionPhaseConfig[] = [
  {
    id: 'understanding',
    name: '需求理解',
    goal: '确保正确理解用户需求',
    maxRounds: 1,
  },
  {
    id: 'ideation',
    name: '方案构思',
    goal: '各角度提出建议',
    maxRounds: 1,
  },
  {
    id: 'challenge',
    name: '挑战质疑',
    goal: '发现问题和风险',
    maxRounds: 2,
  },
  {
    id: 'synthesis',
    name: '方案综合',
    goal: '形成统一方案',
    maxRounds: 1,
  },
  {
    id: 'validation',
    name: '最终确认',
    goal: '所有专家确认',
    maxRounds: 1,
  },
]

export type DiscussionMode = 'quick' | 'standard' | 'deep' | 'expert'

export const DISCUSSION_MODES: Record<DiscussionMode, {
  name: string
  phases: DiscussionPhase[]
  description: string
}> = {
  quick: {
    name: '快速模式',
    phases: ['understanding', 'synthesis'],
    description: '30秒-1分钟，直接看结论',
  },
  standard: {
    name: '标准模式',
    phases: ['understanding', 'ideation', 'challenge', 'synthesis'],
    description: '2-3分钟，观看关键讨论',
  },
  deep: {
    name: '深度模式',
    phases: ['understanding', 'ideation', 'challenge', 'synthesis', 'validation'],
    description: '5-10分钟，完整参与',
  },
  expert: {
    name: '专家模式',
    phases: ['understanding', 'ideation', 'challenge', 'synthesis', 'validation'],
    description: '用户主导讨论',
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
