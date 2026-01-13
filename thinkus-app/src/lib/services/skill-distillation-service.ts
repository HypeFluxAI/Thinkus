import Anthropic from '@anthropic-ai/sdk'
import { ExpertConsultation, DistilledSkill } from '@/lib/db/models'
import { getExpert, type ExpertId, type ExpertDomain } from '@/lib/config/external-experts'
import type { IExpertConsultation } from '@/lib/db/models/expert-consultation'
import type { SkillCategory } from '@/lib/db/models/distilled-skill'

const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
})

/**
 * 蒸馏后的技能
 */
interface ExtractedSkill {
  title: string
  content: string
  summary: string
  category: SkillCategory
  tags: string[]
  qualityScore: number
}

/**
 * 从专家咨询中提取可蒸馏的技能
 */
async function extractSkillsFromConsultation(
  consultation: IExpertConsultation
): Promise<ExtractedSkill[]> {
  const expert = getExpert(consultation.expertId)
  if (!expert) return []

  // 构建对话内容
  const conversationText = consultation.messages
    .map(m => `${m.role === 'user' ? '用户' : '专家'}: ${m.content}`)
    .join('\n\n')

  const response = await anthropic.messages.create({
    model: 'claude-sonnet-4-20250514',
    max_tokens: 2000,
    messages: [
      {
        role: 'user',
        content: `你是一个技能蒸馏专家。请分析以下专家咨询对话，提取可复用的技能、最佳实践和洞见。

专家领域: ${expert.domain}
专家专长: ${expert.expertise.join('、')}

对话内容:
${conversationText}

请提取 1-3 个最有价值的可复用技能/洞见。每个技能需要：
1. 匿名化处理 - 移除所有具体的项目名称、公司名称、个人信息
2. 泛化处理 - 将具体案例转化为通用方法论
3. 结构化整理 - 清晰的标题、内容和摘要

返回 JSON 格式:
\`\`\`json
{
  "skills": [
    {
      "title": "技能标题（简洁，10字以内）",
      "content": "详细内容（200-500字，包含具体方法、步骤或建议）",
      "summary": "一句话摘要（50字以内）",
      "category": "strategy|implementation|best_practice|pitfall|framework|tool",
      "tags": ["标签1", "标签2"],
      "qualityScore": 7
    }
  ]
}
\`\`\`

分类说明:
- strategy: 战略建议、方向性指导
- implementation: 具体实施方法、步骤
- best_practice: 行业最佳实践
- pitfall: 常见陷阱和避坑指南
- framework: 思考框架、决策模型
- tool: 工具推荐和使用技巧

质量评分 (1-10):
- 7-10: 高价值，可直接应用
- 4-6: 有参考价值
- 1-3: 较为常见的知识

如果对话没有可提取的有价值技能，返回空数组。`,
      },
    ],
  })

  const content = response.content[0].type === 'text' ? response.content[0].text : ''
  const jsonMatch = content.match(/```json\s*([\s\S]*?)\s*```/)

  if (jsonMatch) {
    try {
      const data = JSON.parse(jsonMatch[1])
      return (data.skills || []).filter((s: ExtractedSkill) => s.qualityScore >= 5)
    } catch {
      // 解析失败
    }
  }

  return []
}

/**
 * 从单个咨询中蒸馏技能
 */
export async function distillFromConsultation(
  consultationId: string
): Promise<{
  success: boolean
  skillsCreated: number
  skills: Array<{ id: string; title: string }>
}> {
  const consultation = await ExpertConsultation.findById(consultationId)
  if (!consultation) {
    throw new Error('Consultation not found')
  }

  if (consultation.isDistilled) {
    return { success: true, skillsCreated: 0, skills: [] }
  }

  if (consultation.status !== 'completed') {
    throw new Error('Can only distill from completed consultations')
  }

  const expert = getExpert(consultation.expertId)
  if (!expert) {
    throw new Error('Expert not found')
  }

  // 提取技能
  const extractedSkills = await extractSkillsFromConsultation(consultation)

  if (extractedSkills.length === 0) {
    // 标记为已蒸馏，但没有提取到技能
    await ExpertConsultation.findByIdAndUpdate(consultationId, {
      $set: { isDistilled: true },
    })
    return { success: true, skillsCreated: 0, skills: [] }
  }

  // 创建蒸馏技能
  const createdSkills = await Promise.all(
    extractedSkills.map(skill =>
      DistilledSkill.create({
        sourceConsultationId: consultation._id,
        expertId: consultation.expertId,
        expertDomain: expert.domain as ExpertDomain,
        title: skill.title,
        content: skill.content,
        summary: skill.summary,
        category: skill.category,
        tags: skill.tags,
        vectorId: `vec-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`, // 后续可以用于向量索引
        namespace: `skills-${expert.domain}`,
        qualityScore: skill.qualityScore,
        isPublished: skill.qualityScore >= 7, // 高质量自动发布
        isDistributed: false,
      })
    )
  )

  // 更新咨询记录
  await ExpertConsultation.findByIdAndUpdate(consultationId, {
    $set: {
      isDistilled: true,
      distilledInsights: extractedSkills.map(s => s.summary),
    },
  })

  return {
    success: true,
    skillsCreated: createdSkills.length,
    skills: createdSkills.map(s => ({
      id: s._id.toString(),
      title: s.title,
    })),
  }
}

/**
 * 批量处理待蒸馏的咨询
 */
export async function processUnDistilledConsultations(
  limit: number = 20
): Promise<{
  processed: number
  skillsCreated: number
  errors: number
}> {
  // 查找未蒸馏的已完成咨询
  const consultations = await ExpertConsultation.find({
    status: 'completed',
    isDistilled: { $ne: true },
    // 只处理消息数超过 3 的（有实质内容的）
    'messages.2': { $exists: true },
  })
    .sort({ completedAt: -1 })
    .limit(limit)
    .lean()

  let processed = 0
  let skillsCreated = 0
  let errors = 0

  for (const consultation of consultations) {
    try {
      const result = await distillFromConsultation(consultation._id.toString())
      skillsCreated += result.skillsCreated
      processed++
    } catch (error) {
      console.error(`Failed to distill consultation ${consultation._id}:`, error)
      errors++
      processed++
    }
  }

  return { processed, skillsCreated, errors }
}

/**
 * 从讨论中提取技能（当讨论包含有价值的洞见时）
 */
export async function distillFromDiscussion(
  discussionId: string,
  discussionContent: string,
  context: {
    topic: string
    projectName: string
    participants: string[]
  }
): Promise<ExtractedSkill[]> {
  const response = await anthropic.messages.create({
    model: 'claude-sonnet-4-20250514',
    max_tokens: 1500,
    messages: [
      {
        role: 'user',
        content: `分析以下项目讨论，提取可复用的技能和洞见。

讨论主题: ${context.topic}
参与者: ${context.participants.join('、')}

讨论内容:
${discussionContent}

请提取可复用的技能/洞见。需要：
1. 匿名化 - 移除项目/公司/个人信息
2. 泛化 - 转化为通用方法论
3. 结构化 - 清晰的标题和内容

返回 JSON:
\`\`\`json
{
  "skills": [
    {
      "title": "技能标题",
      "content": "详细内容",
      "summary": "摘要",
      "category": "strategy|implementation|best_practice|pitfall|framework|tool",
      "tags": ["标签"],
      "qualityScore": 7
    }
  ]
}
\`\`\`

如无价值技能，返回空数组。`,
      },
    ],
  })

  const content = response.content[0].type === 'text' ? response.content[0].text : ''
  const jsonMatch = content.match(/```json\s*([\s\S]*?)\s*```/)

  if (jsonMatch) {
    try {
      const data = JSON.parse(jsonMatch[1])
      return (data.skills || []).filter((s: ExtractedSkill) => s.qualityScore >= 6)
    } catch {
      // 解析失败
    }
  }

  return []
}

/**
 * 获取技能蒸馏统计
 */
export async function getDistillationStats(): Promise<{
  totalSkills: number
  publishedSkills: number
  byDomain: Record<string, number>
  byCategory: Record<string, number>
  avgQualityScore: number
  pendingConsultations: number
}> {
  const [
    totalSkills,
    publishedSkills,
    byDomain,
    byCategory,
    avgScore,
    pendingConsultations,
  ] = await Promise.all([
    DistilledSkill.countDocuments({}),
    DistilledSkill.countDocuments({ isPublished: true }),
    DistilledSkill.aggregate([
      { $group: { _id: '$expertDomain', count: { $sum: 1 } } },
    ]),
    DistilledSkill.aggregate([
      { $group: { _id: '$category', count: { $sum: 1 } } },
    ]),
    DistilledSkill.aggregate([
      { $group: { _id: null, avg: { $avg: '$qualityScore' } } },
    ]),
    ExpertConsultation.countDocuments({
      status: 'completed',
      isDistilled: { $ne: true },
      'messages.2': { $exists: true },
    }),
  ])

  const domainStats: Record<string, number> = {}
  byDomain.forEach((item: { _id: string; count: number }) => {
    domainStats[item._id] = item.count
  })

  const categoryStats: Record<string, number> = {}
  byCategory.forEach((item: { _id: string; count: number }) => {
    categoryStats[item._id] = item.count
  })

  return {
    totalSkills,
    publishedSkills,
    byDomain: domainStats,
    byCategory: categoryStats,
    avgQualityScore: avgScore[0]?.avg || 0,
    pendingConsultations,
  }
}

/**
 * 搜索相关技能
 */
export async function searchSkills(
  query: string,
  options: {
    domain?: ExpertDomain
    category?: SkillCategory
    limit?: number
  } = {}
): Promise<Array<{
  id: string
  title: string
  summary: string
  category: SkillCategory
  domain: ExpertDomain
  qualityScore: number
  useCount: number
}>> {
  const { domain, category, limit = 10 } = options

  const filter: Record<string, unknown> = {
    isPublished: true,
  }

  if (domain) filter.expertDomain = domain
  if (category) filter.category = category

  // 简单的文本搜索（生产环境应使用向量搜索）
  if (query) {
    filter.$or = [
      { title: { $regex: query, $options: 'i' } },
      { summary: { $regex: query, $options: 'i' } },
      { tags: { $in: [new RegExp(query, 'i')] } },
    ]
  }

  const skills = await DistilledSkill.find(filter)
    .sort({ qualityScore: -1, useCount: -1 })
    .limit(limit)
    .lean()

  return skills.map(s => ({
    id: s._id.toString(),
    title: s.title,
    summary: s.summary,
    category: s.category as SkillCategory,
    domain: s.expertDomain as ExpertDomain,
    qualityScore: s.qualityScore,
    useCount: s.useCount,
  }))
}
