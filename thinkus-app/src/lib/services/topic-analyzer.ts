import Anthropic from '@anthropic-ai/sdk'
import { EXECUTIVES, EXECUTIVES_BY_GROUP, type AgentId, type AgentGroup } from '@/lib/config/executives'
import { PROJECT_PHASES, type ProjectPhase } from '@/lib/config/project-phases'

const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
})

// 话题分析结果
export interface TopicAnalysis {
  // 主要话题类别
  primaryCategory: AgentGroup
  // 相关话题类别
  relatedCategories: AgentGroup[]
  // 推荐的高管
  recommendedAgents: AgentId[]
  // 话题复杂度
  complexity: 'simple' | 'medium' | 'complex'
  // 是否需要跨部门协作
  crossDepartment: boolean
  // 关键词提取
  keywords: string[]
  // 讨论焦点建议
  focusPoints: string[]
}

// 话题分析提示词
const TOPIC_ANALYSIS_PROMPT = `你是一个AI产品公司的话题分析专家。分析用户提出的讨论话题，确定：
1. 话题属于哪个主要类别
2. 涉及哪些相关领域
3. 话题复杂度
4. 是否需要跨部门协作

## 部门类别
- product_design: 产品设计（需求分析、UX设计、内容策略、品牌设计）
- technology: 技术（架构、测试、DevOps、安全）
- growth_operations: 增长运营（增长、营销、客户成功、数据分析）
- finance_legal: 财务法务（财务、法务、投融资）
- strategic_support: 战略支持（战略规划、运维、销售）

## 高管列表
产品设计组: mike(产品)、elena(UX)、rachel(内容)、chloe(品牌)
技术组: david(架构)、james(QA)、kevin(DevOps)、alex(安全)
增长运营组: lisa(增长)、marcus(营销)、nina(客服)、sarah(数据)
财务法务组: frank(财务)、tom(法务)、iris(投融资)
战略支持组: nathan(战略)、oscar(运维)、victor(销售)

## 输出格式
严格按以下JSON格式输出：
\`\`\`json
{
  "primaryCategory": "类别ID",
  "relatedCategories": ["相关类别ID"],
  "recommendedAgents": ["高管ID列表，最多5个"],
  "complexity": "simple/medium/complex",
  "crossDepartment": true/false,
  "keywords": ["关键词"],
  "focusPoints": ["讨论焦点建议"]
}
\`\`\``

/**
 * 使用AI分析话题
 */
export async function analyzeTopicWithAI(params: {
  topic: string
  context?: string
  phase?: ProjectPhase
}): Promise<TopicAnalysis> {
  const { topic, context, phase } = params

  let userPrompt = `## 讨论话题\n${topic}`
  if (context) {
    userPrompt += `\n\n## 背景信息\n${context}`
  }
  if (phase) {
    const phaseConfig = PROJECT_PHASES[phase]
    userPrompt += `\n\n## 项目阶段\n${phaseConfig.nameCn} - ${phaseConfig.description}`
  }

  try {
    const response = await anthropic.messages.create({
      model: 'claude-3-5-haiku-20241022',
      max_tokens: 512,
      temperature: 0.3,
      system: TOPIC_ANALYSIS_PROMPT,
      messages: [{ role: 'user', content: userPrompt }],
    })

    const content = response.content[0].type === 'text' ? response.content[0].text : ''

    // 提取JSON
    const jsonMatch = content.match(/```json\s*([\s\S]*?)\s*```/)
    if (jsonMatch) {
      const parsed = JSON.parse(jsonMatch[1])
      return validateAndEnhanceAnalysis(parsed, phase)
    }

    // 尝试直接解析
    try {
      const parsed = JSON.parse(content)
      return validateAndEnhanceAnalysis(parsed, phase)
    } catch {
      // 解析失败，返回默认分析
      return getDefaultAnalysis(topic, phase)
    }
  } catch (error) {
    console.error('Topic analysis error:', error)
    return getDefaultAnalysis(topic, phase)
  }
}

/**
 * 验证并增强分析结果
 */
function validateAndEnhanceAnalysis(
  analysis: Partial<TopicAnalysis>,
  phase?: ProjectPhase
): TopicAnalysis {
  // 验证主类别
  const validCategories: AgentGroup[] = [
    'product_design',
    'technology',
    'growth_operations',
    'finance_legal',
    'strategic_support',
  ]

  const primaryCategory = validCategories.includes(analysis.primaryCategory as AgentGroup)
    ? (analysis.primaryCategory as AgentGroup)
    : 'product_design'

  // 验证相关类别
  const relatedCategories = (analysis.relatedCategories || [])
    .filter(c => validCategories.includes(c as AgentGroup)) as AgentGroup[]

  // 验证推荐高管
  const allAgentIds = Object.keys(EXECUTIVES) as AgentId[]
  let recommendedAgents = (analysis.recommendedAgents || [])
    .filter(id => allAgentIds.includes(id as AgentId)) as AgentId[]

  // 确保包含阶段核心高管
  if (phase) {
    const coreAgents = PROJECT_PHASES[phase].coreAgents
    for (const agent of coreAgents) {
      if (!recommendedAgents.includes(agent)) {
        recommendedAgents.unshift(agent)
      }
    }
  }

  // 限制最多5个高管
  recommendedAgents = recommendedAgents.slice(0, 5)

  // 验证复杂度
  const validComplexity = ['simple', 'medium', 'complex'] as const
  const complexity = validComplexity.includes(analysis.complexity as typeof validComplexity[number])
    ? (analysis.complexity as 'simple' | 'medium' | 'complex')
    : 'medium'

  return {
    primaryCategory,
    relatedCategories,
    recommendedAgents,
    complexity,
    crossDepartment: analysis.crossDepartment ?? relatedCategories.length > 0,
    keywords: analysis.keywords || [],
    focusPoints: analysis.focusPoints || [],
  }
}

/**
 * 获取默认分析结果
 */
function getDefaultAnalysis(topic: string, phase?: ProjectPhase): TopicAnalysis {
  const lowercaseTopic = topic.toLowerCase()

  // 简单关键词匹配
  let primaryCategory: AgentGroup = 'product_design'
  const recommendedAgents: AgentId[] = []

  if (lowercaseTopic.match(/技术|架构|代码|开发|bug|测试|部署|安全/)) {
    primaryCategory = 'technology'
    recommendedAgents.push('david')
  } else if (lowercaseTopic.match(/增长|营销|推广|用户获取|数据|分析/)) {
    primaryCategory = 'growth_operations'
    recommendedAgents.push('lisa', 'sarah')
  } else if (lowercaseTopic.match(/财务|成本|预算|法务|合规|融资|投资/)) {
    primaryCategory = 'finance_legal'
    recommendedAgents.push('frank')
  } else if (lowercaseTopic.match(/战略|竞品|市场|销售/)) {
    primaryCategory = 'strategic_support'
    recommendedAgents.push('nathan')
  } else {
    recommendedAgents.push('mike')
  }

  // 添加阶段核心高管
  if (phase) {
    const coreAgents = PROJECT_PHASES[phase].coreAgents
    for (const agent of coreAgents) {
      if (!recommendedAgents.includes(agent)) {
        recommendedAgents.unshift(agent)
      }
    }
  }

  return {
    primaryCategory,
    relatedCategories: [],
    recommendedAgents: recommendedAgents.slice(0, 5),
    complexity: 'medium',
    crossDepartment: false,
    keywords: [],
    focusPoints: [],
  }
}

/**
 * 快速话题分析（不使用AI，基于规则）
 */
export function analyzeTopicQuick(params: {
  topic: string
  phase?: ProjectPhase
}): Pick<TopicAnalysis, 'recommendedAgents' | 'complexity'> {
  const { topic, phase } = params
  const lowercaseTopic = topic.toLowerCase()

  const agents: Set<AgentId> = new Set()

  // 关键词匹配
  const keywordMap: Record<string, AgentId[]> = {
    '产品': ['mike'],
    '需求': ['mike'],
    '功能': ['mike'],
    '设计': ['elena', 'chloe'],
    'UI': ['elena'],
    'UX': ['elena'],
    '交互': ['elena'],
    '品牌': ['chloe'],
    '技术': ['david'],
    '架构': ['david'],
    '代码': ['david'],
    '数据库': ['david'],
    '测试': ['james'],
    'QA': ['james'],
    'bug': ['james'],
    '部署': ['kevin'],
    '运维': ['kevin', 'oscar'],
    '安全': ['alex'],
    '隐私': ['alex'],
    '增长': ['lisa'],
    '获客': ['lisa'],
    '转化': ['lisa'],
    '营销': ['marcus'],
    '推广': ['marcus'],
    '客服': ['nina'],
    '反馈': ['nina'],
    '数据': ['sarah'],
    '分析': ['sarah'],
    '指标': ['sarah'],
    '财务': ['frank'],
    '成本': ['frank'],
    '预算': ['frank'],
    '法务': ['tom'],
    '合规': ['tom'],
    '隐私政策': ['tom'],
    '融资': ['iris'],
    '投资': ['iris'],
    '战略': ['nathan'],
    '竞品': ['nathan'],
    '市场': ['nathan', 'marcus'],
    '销售': ['victor'],
    '商务': ['victor'],
  }

  for (const [keyword, agentIds] of Object.entries(keywordMap)) {
    if (lowercaseTopic.includes(keyword)) {
      agentIds.forEach(id => agents.add(id))
    }
  }

  // 添加阶段核心高管
  if (phase) {
    PROJECT_PHASES[phase].coreAgents.forEach(id => agents.add(id))
  }

  // 如果没有匹配到任何高管，默认添加产品负责人
  if (agents.size === 0) {
    agents.add('mike')
  }

  // 评估复杂度
  let complexity: 'simple' | 'medium' | 'complex' = 'medium'
  if (topic.length < 20 && agents.size <= 2) {
    complexity = 'simple'
  } else if (topic.length > 100 || agents.size >= 4) {
    complexity = 'complex'
  }

  return {
    recommendedAgents: Array.from(agents).slice(0, 5),
    complexity,
  }
}
