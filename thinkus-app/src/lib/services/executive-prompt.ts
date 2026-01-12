import { EXECUTIVES, type AgentId, type ExecutiveConfig } from '@/lib/config/executives'
import { type IUserExecutive, type CommunicationStyle, type DecisionStyle } from '@/lib/db/models/user-executive'

/**
 * 构建高管对话的系统提示词
 * 结合高管人设 + 用户偏好 + 项目上下文
 */
export function buildExecutiveSystemPrompt(options: {
  agentId: AgentId
  userExecutive?: IUserExecutive | null
  projectContext?: {
    name: string
    description?: string
    phase?: string
    type?: string
  }
  discussionContext?: string
}): string {
  const { agentId, userExecutive, projectContext, discussionContext } = options
  const executive = EXECUTIVES[agentId]

  if (!executive) {
    throw new Error(`Unknown executive: ${agentId}`)
  }

  let prompt = executive.systemPrompt

  // 注入用户偏好
  if (userExecutive?.learnedPreferences) {
    const preferences = userExecutive.learnedPreferences
    const preferencesSection = buildPreferencesSection(preferences)
    if (preferencesSection) {
      prompt += `\n\n## 用户偏好\n基于过往交互，你了解到这位用户的特点：\n${preferencesSection}`
    }
  }

  // 注入项目上下文
  if (projectContext) {
    prompt += `\n\n## 当前项目\n- 项目名称：${projectContext.name}`
    if (projectContext.description) {
      prompt += `\n- 项目描述：${projectContext.description}`
    }
    if (projectContext.phase) {
      prompt += `\n- 当前阶段：${getPhaseNameCn(projectContext.phase)}`
    }
    if (projectContext.type) {
      prompt += `\n- 项目类型：${projectContext.type}`
    }
  }

  // 注入讨论上下文
  if (discussionContext) {
    prompt += `\n\n## 讨论背景\n${discussionContext}`
  }

  // 通用指令
  prompt += `\n\n## 回复要求
- 使用中文回复
- 保持专业但友好的语气
- 根据你的专业领域给出具体建议
- 如果问题超出你的专长，可以建议咨询其他高管`

  return prompt
}

/**
 * 构建用户偏好描述
 */
function buildPreferencesSection(preferences: IUserExecutive['learnedPreferences']): string {
  const parts: string[] = []

  if (preferences.communicationStyle) {
    parts.push(`- 沟通风格偏好：${getCommunicationStyleCn(preferences.communicationStyle)}`)
  }

  if (preferences.decisionStyle) {
    parts.push(`- 决策风格偏好：${getDecisionStyleCn(preferences.decisionStyle)}`)
  }

  if (preferences.focusAreas && preferences.focusAreas.length > 0) {
    parts.push(`- 关注领域：${preferences.focusAreas.join('、')}`)
  }

  if (preferences.dislikes && preferences.dislikes.length > 0) {
    parts.push(`- 不喜欢：${preferences.dislikes.join('、')}`)
  }

  if (preferences.customInstructions) {
    parts.push(`- 特别说明：${preferences.customInstructions}`)
  }

  return parts.join('\n')
}

/**
 * 沟通风格中文映射
 */
function getCommunicationStyleCn(style: CommunicationStyle): string {
  const map: Record<CommunicationStyle, string> = {
    formal: '正式、专业',
    casual: '轻松、随意',
    concise: '简洁、直接',
    detailed: '详细、全面',
  }
  return map[style] || style
}

/**
 * 决策风格中文映射
 */
function getDecisionStyleCn(style: DecisionStyle): string {
  const map: Record<DecisionStyle, string> = {
    fast: '快速决策，注重效率',
    careful: '谨慎分析，充分考虑',
    'data-driven': '数据驱动，用指标说话',
  }
  return map[style] || style
}

/**
 * 项目阶段中文名称
 */
function getPhaseNameCn(phase: string): string {
  const map: Record<string, string> = {
    ideation: '构思阶段',
    definition: '定义阶段',
    design: '设计阶段',
    development: '开发阶段',
    prelaunch: '预发布阶段',
    growth: '增长阶段',
  }
  return map[phase] || phase
}

/**
 * 获取高管简介（用于展示）
 */
export function getExecutiveBrief(agentId: AgentId): {
  name: string
  nameCn: string
  title: string
  titleCn: string
  avatar: string
  color: string
  expertise: string[]
} {
  const exec = EXECUTIVES[agentId]
  return {
    name: exec.name,
    nameCn: exec.nameCn,
    title: exec.title,
    titleCn: exec.titleCn,
    avatar: exec.avatar,
    color: exec.color,
    expertise: exec.expertise,
  }
}

/**
 * 根据话题推荐高管
 */
export function recommendExecutiveForTopic(topic: string): AgentId[] {
  const topicLower = topic.toLowerCase()
  const keywords: Record<string, AgentId[]> = {
    // 产品相关
    '产品': ['mike'],
    '需求': ['mike'],
    'prd': ['mike'],
    '功能': ['mike'],
    // 设计相关
    '设计': ['elena', 'chloe'],
    'ui': ['elena'],
    'ux': ['elena'],
    '交互': ['elena'],
    '品牌': ['chloe'],
    'logo': ['chloe'],
    // 技术相关
    '技术': ['david'],
    '架构': ['david'],
    '开发': ['david'],
    '代码': ['david'],
    '测试': ['james'],
    'qa': ['james'],
    'bug': ['james'],
    '部署': ['kevin'],
    'devops': ['kevin'],
    '运维': ['kevin', 'oscar'],
    '安全': ['alex'],
    // 增长相关
    '增长': ['lisa'],
    '获客': ['lisa'],
    '转化': ['lisa'],
    '营销': ['marcus'],
    '推广': ['marcus'],
    '客服': ['nina'],
    '用户反馈': ['nina'],
    '数据': ['sarah'],
    '分析': ['sarah'],
    // 财务法务
    '财务': ['frank'],
    '预算': ['frank'],
    '成本': ['frank'],
    '法务': ['tom'],
    '合规': ['tom'],
    '隐私': ['tom'],
    '融资': ['iris'],
    '投资': ['iris'],
    // 战略支持
    '战略': ['nathan'],
    '竞品': ['nathan'],
    '市场': ['nathan', 'marcus'],
    '销售': ['victor'],
    '商务': ['victor'],
  }

  const recommended: Set<AgentId> = new Set()

  for (const [keyword, agents] of Object.entries(keywords)) {
    if (topicLower.includes(keyword)) {
      agents.forEach(agent => recommended.add(agent))
    }
  }

  // 默认推荐产品负责人
  if (recommended.size === 0) {
    recommended.add('mike')
  }

  return Array.from(recommended).slice(0, 3)
}
