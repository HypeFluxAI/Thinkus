import { type AgentId } from './executives'

// 项目阶段类型
export type ProjectPhase =
  | 'ideation'     // 想法探索
  | 'definition'   // 需求定义
  | 'design'       // 设计阶段
  | 'development'  // 开发阶段
  | 'prelaunch'    // 发布准备
  | 'growth'       // 增长运营

// 阶段配置接口
export interface PhaseConfig {
  id: ProjectPhase
  name: string
  nameCn: string
  description: string
  estimatedDuration: string
  coreAgents: AgentId[]
  optionalAgents: AgentId[]
  deliverables: string[]
  nextPhase?: ProjectPhase
}

// 阶段配置
export const PROJECT_PHASES: Record<ProjectPhase, PhaseConfig> = {
  ideation: {
    id: 'ideation',
    name: 'Ideation',
    nameCn: '想法探索',
    description: '明确要做什么、为谁做、解决什么问题',
    estimatedDuration: '1-2周',
    coreAgents: ['mike', 'nathan'],
    optionalAgents: ['sarah', 'marcus', 'frank'],
    deliverables: [
      '项目定义文档',
      '目标用户画像',
      '价值主张画布',
      '竞品分析报告',
    ],
    nextPhase: 'definition',
  },
  definition: {
    id: 'definition',
    name: 'Definition',
    nameCn: '需求定义',
    description: '明确做什么功能、优先级、MVP范围',
    estimatedDuration: '1-2周',
    coreAgents: ['mike', 'elena', 'david'],
    optionalAgents: ['sarah', 'james', 'alex'],
    deliverables: [
      'PRD文档',
      '用户故事地图',
      '技术方案评估',
      'MVP功能清单',
    ],
    nextPhase: 'design',
  },
  design: {
    id: 'design',
    name: 'Design',
    nameCn: '设计阶段',
    description: '完成UI设计、技术架构、开发准备',
    estimatedDuration: '1-3周',
    coreAgents: ['elena', 'david'],
    optionalAgents: ['mike', 'kevin', 'alex', 'chloe'],
    deliverables: [
      'UI设计稿',
      '设计规范',
      '技术架构文档',
      '数据库设计',
      'API设计',
    ],
    nextPhase: 'development',
  },
  development: {
    id: 'development',
    name: 'Development',
    nameCn: '开发阶段',
    description: '完成MVP开发、测试、修复',
    estimatedDuration: '4-12周',
    coreAgents: ['david', 'james'],
    optionalAgents: ['mike', 'elena', 'kevin', 'alex'],
    deliverables: [
      '可运行的MVP',
      '测试报告',
      '部署文档',
    ],
    nextPhase: 'prelaunch',
  },
  prelaunch: {
    id: 'prelaunch',
    name: 'Pre-launch',
    nameCn: '发布准备',
    description: '准备上线、制定发布策略',
    estimatedDuration: '1-2周',
    coreAgents: ['kevin', 'lisa', 'marcus'],
    optionalAgents: ['mike', 'james', 'nina', 'tom'],
    deliverables: [
      '部署完成',
      '监控体系',
      '发布公告',
      '客服FAQ',
      '合规文件',
    ],
    nextPhase: 'growth',
  },
  growth: {
    id: 'growth',
    name: 'Growth',
    nameCn: '增长运营',
    description: '获取用户、优化产品、持续增长',
    estimatedDuration: '持续',
    coreAgents: ['lisa', 'sarah', 'marcus'],
    optionalAgents: ['mike', 'nina', 'frank', 'david'],
    deliverables: [
      '每日数据报告',
      '每周增长复盘',
      '每月深度分析',
    ],
  },
}

// 阶段顺序
export const PHASE_ORDER: ProjectPhase[] = [
  'ideation',
  'definition',
  'design',
  'development',
  'prelaunch',
  'growth',
]

// 话题关键词到高管的映射
export const TOPIC_AGENT_MAPPING: Record<string, AgentId[]> = {
  // 产品相关
  product: ['mike'],
  feature: ['mike'],
  requirement: ['mike'],
  prd: ['mike'],
  priority: ['mike'],

  // 设计相关
  design: ['elena', 'chloe'],
  ux: ['elena'],
  ui: ['elena', 'chloe'],
  interaction: ['elena'],
  brand: ['chloe'],

  // 技术相关
  tech: ['david', 'kevin'],
  architecture: ['david'],
  code: ['david'],
  database: ['david'],
  api: ['david'],
  deploy: ['kevin'],
  devops: ['kevin'],
  ci: ['kevin'],

  // 安全相关
  security: ['alex'],
  privacy: ['alex'],
  compliance: ['alex', 'tom'],

  // 测试相关
  test: ['james'],
  qa: ['james'],
  bug: ['james'],

  // 增长相关
  growth: ['lisa'],
  acquisition: ['lisa'],
  conversion: ['lisa'],

  // 营销相关
  marketing: ['marcus'],
  promotion: ['marcus'],
  campaign: ['marcus'],

  // 数据相关
  data: ['sarah'],
  analytics: ['sarah'],
  metrics: ['sarah'],

  // 客户相关
  customer: ['nina'],
  feedback: ['nina'],
  support: ['nina'],

  // 财务相关
  finance: ['frank'],
  pricing: ['frank'],
  cost: ['frank'],
  budget: ['frank'],

  // 法务相关
  legal: ['tom'],
  contract: ['tom'],

  // 融资相关
  funding: ['iris'],
  investor: ['iris'],
  pitch: ['iris'],

  // 战略相关
  strategy: ['nathan'],
  competitor: ['nathan'],
  market: ['nathan'],

  // 销售相关
  sales: ['victor'],
  partner: ['victor'],
}

// 获取阶段配置
export function getPhaseConfig(phase: ProjectPhase): PhaseConfig {
  return PROJECT_PHASES[phase]
}

// 获取阶段核心高管
export function getPhaseCoreAgents(phase: ProjectPhase): AgentId[] {
  return PROJECT_PHASES[phase].coreAgents
}

// 根据话题分析需要的高管
export function analyzeTopicAgents(topic: string): AgentId[] {
  const lowercaseTopic = topic.toLowerCase()
  const agents: Set<AgentId> = new Set()

  for (const [keyword, agentIds] of Object.entries(TOPIC_AGENT_MAPPING)) {
    if (lowercaseTopic.includes(keyword)) {
      agentIds.forEach(id => agents.add(id))
    }
  }

  return Array.from(agents)
}

// 智能调度 - 获取讨论参与者
export function scheduleDiscussionAgents(params: {
  phase: ProjectPhase
  topic: string
  complexity?: 'simple' | 'medium' | 'complex'
}): AgentId[] {
  const { phase, topic, complexity = 'medium' } = params

  // 1. 获取阶段核心高管
  const coreAgents = getPhaseCoreAgents(phase)

  // 2. 根据话题添加相关高管
  const topicAgents = analyzeTopicAgents(topic)

  // 3. 合并去重
  const allAgents = Array.from(new Set([...coreAgents, ...topicAgents]))

  // 4. 根据复杂度限制人数
  const maxAgents = {
    simple: 3,
    medium: 5,
    complex: 8,
  }[complexity]

  // 5. 优先保留核心高管
  if (allAgents.length <= maxAgents) {
    return allAgents
  }

  // 如果超过限制，优先保留核心高管，再补充话题相关高管
  const result = [...coreAgents]
  for (const agent of topicAgents) {
    if (result.length >= maxAgents) break
    if (!result.includes(agent)) {
      result.push(agent)
    }
  }

  return result
}

// 获取下一个阶段
export function getNextPhase(currentPhase: ProjectPhase): ProjectPhase | undefined {
  return PROJECT_PHASES[currentPhase].nextPhase
}

// 获取阶段索引
export function getPhaseIndex(phase: ProjectPhase): number {
  return PHASE_ORDER.indexOf(phase)
}

// 检查阶段是否可以转换
export function canTransitionToPhase(
  currentPhase: ProjectPhase,
  targetPhase: ProjectPhase
): boolean {
  const currentIndex = getPhaseIndex(currentPhase)
  const targetIndex = getPhaseIndex(targetPhase)

  // 只能向前一个阶段或向后任意阶段转换
  return targetIndex === currentIndex + 1 || targetIndex < currentIndex
}
