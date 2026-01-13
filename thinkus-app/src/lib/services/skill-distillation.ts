import Anthropic from '@anthropic-ai/sdk'
import { ExpertConsultation, type IExpertConsultation } from '@/lib/db/models'
import { DistilledSkill, type SkillCategory } from '@/lib/db/models/distilled-skill'
import { getExpert, type ExpertId } from '@/lib/config/external-experts'
import { generateEmbedding } from '@/lib/vector/embedding'
import { getPineconeClient, generateNamespace } from '@/lib/vector/pinecone'

const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
})

interface DistilledInsight {
  title: string
  content: string
  summary: string
  category: SkillCategory
  tags: string[]
  qualityScore: number
}

/**
 * 从完成的咨询中蒸馏技能
 */
export async function distillSkillsFromConsultation(
  consultationId: string
): Promise<number> {
  // 获取咨询记录
  const consultation = await ExpertConsultation.findById(consultationId)
  if (!consultation || consultation.status !== 'completed') {
    throw new Error('Consultation not found or not completed')
  }

  if (consultation.isDistilled) {
    return 0 // 已经蒸馏过
  }

  const expert = getExpert(consultation.expertId as ExpertId)
  if (!expert) {
    throw new Error('Expert not found')
  }

  // 构建对话内容
  const conversationText = consultation.messages
    .map((m) => `[${m.role === 'user' ? '用户' : expert.nameCn}]: ${m.content}`)
    .join('\n\n')

  // 使用Claude提取洞察
  const insights = await extractInsights(conversationText, expert.nameCn, consultation.topic)

  if (insights.length === 0) {
    // 标记为已蒸馏但无内容
    await ExpertConsultation.findByIdAndUpdate(consultationId, {
      $set: { isDistilled: true, distilledInsights: [] },
    })
    return 0
  }

  // 存储蒸馏的技能
  const storedSkills = await Promise.all(
    insights.map(async (insight) => {
      // 生成向量嵌入
      let vectorId: string | undefined
      let namespace: string | undefined

      try {
        const embedding = await generateEmbedding(insight.content)
        const pinecone = getPineconeClient()
        const index = pinecone.index(process.env.PINECONE_INDEX!)

        namespace = `skills_${expert.domain}`
        vectorId = `skill_${consultationId}_${Date.now()}_${Math.random().toString(36).slice(2)}`

        await index.namespace(namespace).upsert([
          {
            id: vectorId,
            values: embedding,
            metadata: {
              type: 'distilled_skill',
              expertId: expert.id,
              domain: expert.domain,
              category: insight.category,
              title: insight.title,
              summary: insight.summary,
            },
          },
        ])
      } catch (error) {
        console.error('Failed to store skill embedding:', error)
      }

      // 存储到MongoDB
      return DistilledSkill.create({
        sourceConsultationId: consultation._id,
        expertId: expert.id,
        expertDomain: expert.domain,
        title: insight.title,
        content: insight.content,
        summary: insight.summary,
        category: insight.category,
        tags: insight.tags,
        vectorId,
        namespace,
        qualityScore: insight.qualityScore,
        isPublished: insight.qualityScore >= 7, // 高质量自动发布
        isDistributed: false,
      })
    })
  )

  // 更新咨询记录
  await ExpertConsultation.findByIdAndUpdate(consultationId, {
    $set: {
      isDistilled: true,
      distilledInsights: storedSkills.map((s) => s.summary),
    },
  })

  return storedSkills.length
}

/**
 * 使用Claude提取洞察
 */
async function extractInsights(
  conversationText: string,
  expertName: string,
  topic: string
): Promise<DistilledInsight[]> {
  const response = await anthropic.messages.create({
    model: 'claude-sonnet-4-20250514',
    max_tokens: 3000,
    messages: [
      {
        role: 'user',
        content: `分析以下专家咨询对话，提取可复用的知识洞察。

咨询主题: ${topic}
专家: ${expertName}

对话内容:
${conversationText}

请提取值得分享的知识点。每个知识点需要:
1. 匿名化处理 - 移除所有具体公司名、人名、项目名等敏感信息
2. 通用化表达 - 让知识适用于更广泛的场景
3. 结构化呈现 - 清晰的标题和内容

返回JSON数组，每个元素包含:
- title: 简短标题 (10-20字)
- content: 完整内容 (已匿名化，200-500字)
- summary: 一句话摘要 (50字内)
- category: 类别 (strategy/implementation/best_practice/pitfall/framework/tool)
- tags: 相关标签数组 (3-5个)
- qualityScore: 质量评分1-10 (基于实用性、普适性、深度)

只提取真正有价值的洞察，如果对话没有值得提取的内容，返回空数组 []。

返回格式:
\`\`\`json
[...]
\`\`\``,
      },
    ],
  })

  const content = response.content[0].type === 'text' ? response.content[0].text : ''
  const jsonMatch = content.match(/```json\s*([\s\S]*?)\s*```/)

  if (jsonMatch) {
    try {
      return JSON.parse(jsonMatch[1])
    } catch {
      return []
    }
  }

  return []
}

/**
 * 获取相关技能用于增强AI高管
 */
export async function getRelevantSkills(
  query: string,
  domain?: string,
  limit: number = 5
): Promise<Array<{
  title: string
  content: string
  category: SkillCategory
  relevance: number
}>> {
  try {
    // 生成查询向量
    const embedding = await generateEmbedding(query)
    const pinecone = getPineconeClient()
    const index = pinecone.index(process.env.PINECONE_INDEX!)

    // 搜索相关技能
    const namespace = domain ? `skills_${domain}` : undefined
    const results = await index.namespace(namespace || '').query({
      vector: embedding,
      topK: limit,
      includeMetadata: true,
      filter: {
        type: 'distilled_skill',
      },
    })

    if (!results.matches || results.matches.length === 0) {
      return []
    }

    // 获取完整内容
    const skillIds = results.matches
      .filter((m) => m.id.startsWith('skill_'))
      .map((m) => m.id)

    const skills = await DistilledSkill.find({
      vectorId: { $in: skillIds },
      isPublished: true,
    }).lean()

    // 按相关度排序
    return results.matches
      .map((match) => {
        const skill = skills.find((s) => s.vectorId === match.id)
        if (!skill) return null
        return {
          title: skill.title,
          content: skill.content,
          category: skill.category,
          relevance: match.score || 0,
        }
      })
      .filter(Boolean) as Array<{
        title: string
        content: string
        category: SkillCategory
        relevance: number
      }>
  } catch (error) {
    console.error('Failed to get relevant skills:', error)
    return []
  }
}

/**
 * 定期蒸馏任务 - 处理未蒸馏的完成咨询
 */
export async function runDistillationJob(): Promise<{
  processed: number
  skillsExtracted: number
}> {
  // 获取未蒸馏的完成咨询
  const consultations = await ExpertConsultation.find({
    status: 'completed',
    isDistilled: false,
    completedAt: {
      $lte: new Date(Date.now() - 60 * 60 * 1000), // 完成超过1小时
    },
  }).limit(10)

  let processed = 0
  let skillsExtracted = 0

  for (const consultation of consultations) {
    try {
      const count = await distillSkillsFromConsultation(consultation._id.toString())
      processed++
      skillsExtracted += count
    } catch (error) {
      console.error(`Failed to distill consultation ${consultation._id}:`, error)
    }
  }

  return { processed, skillsExtracted }
}
