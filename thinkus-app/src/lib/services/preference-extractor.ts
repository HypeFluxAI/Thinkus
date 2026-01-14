import Anthropic from '@anthropic-ai/sdk'
import mongoose from 'mongoose'
import { type AgentId, EXECUTIVES } from '@/lib/config/executives'
import { UserExecutive, Memory, type IDiscussion } from '@/lib/db/models'
import { storeMemory } from '@/lib/vector/memory-service'
import { generateNamespace } from '@/lib/vector/pinecone'
import type { CommunicationStyle, DecisionStyle } from '@/lib/db/models/user-executive'
import * as gemini from '@/lib/ai/gemini'

// 检查使用哪个 AI 服务
const useGemini = !process.env.ANTHROPIC_API_KEY && process.env.GOOGLE_API_KEY

const anthropic = useGemini ? null : new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
})

// 偏好提取结果
export interface ExtractedPreferences {
  communicationStyle?: CommunicationStyle
  focusAreas?: string[]
  dislikes?: string[]
  decisionStyle?: DecisionStyle
  insights?: string[]
}

// 偏好提取提示词
const PREFERENCE_EXTRACTION_PROMPT = `分析用户与AI高管的对话，提取用户偏好信息。

## 输出格式
严格按以下JSON格式输出：
\`\`\`json
{
  "communicationStyle": "formal/casual/concise/detailed 或 null",
  "focusAreas": ["用户关注的领域"],
  "dislikes": ["用户不喜欢的事物"],
  "decisionStyle": "fast/careful/data-driven 或 null",
  "insights": ["其他重要洞察"]
}
\`\`\`

## 分析要点
1. communicationStyle: 用户偏好的沟通方式
   - formal: 正式、专业
   - casual: 轻松、随意
   - concise: 简洁、直接
   - detailed: 详细、全面

2. focusAreas: 用户经常提到或关心的领域

3. dislikes: 用户明确表示不喜欢或反对的事物

4. decisionStyle: 用户的决策风格
   - fast: 快速决策
   - careful: 谨慎分析
   - data-driven: 数据驱动

5. insights: 其他有价值的用户特征

注意：如果无法确定某项，返回null或空数组`

/**
 * 从讨论中提取用户偏好
 */
export async function extractPreferencesFromDiscussion(
  discussion: IDiscussion
): Promise<ExtractedPreferences> {
  // 构建对话文本
  const messagesText = discussion.messages
    .map((msg: { role: string; agentId?: string; content: string }) => {
      if (msg.role === 'user') {
        return `用户: ${msg.content}`
      } else if (msg.role === 'agent' && msg.agentId) {
        const exec = EXECUTIVES[msg.agentId as AgentId]
        return `${exec?.nameCn || msg.agentId}: ${msg.content}`
      }
      return ''
    })
    .filter(Boolean)
    .join('\n\n')

  if (messagesText.length < 100) {
    // 对话太短，无法提取有意义的偏好
    return {}
  }

  const userPrompt = `## 讨论话题
${discussion.topic}

## 对话记录
${messagesText}

请分析以上对话，提取用户偏好。`

  try {
    let content = ''

    if (useGemini) {
      const response = await gemini.createMessage({
        system: PREFERENCE_EXTRACTION_PROMPT,
        max_tokens: 512,
        temperature: 0.3,
        messages: [{ role: 'user', content: userPrompt }],
      })
      content = response.content[0]?.text || ''
    } else {
      const response = await anthropic!.messages.create({
        model: 'claude-3-5-haiku-20241022',
        max_tokens: 512,
        temperature: 0.3,
        system: PREFERENCE_EXTRACTION_PROMPT,
        messages: [{ role: 'user', content: userPrompt }],
      })
      content = response.content[0].type === 'text' ? response.content[0].text : ''
    }

    // 提取JSON
    const jsonMatch = content.match(/```json\s*([\s\S]*?)\s*```/)
    if (jsonMatch) {
      const parsed = JSON.parse(jsonMatch[1])
      return validatePreferences(parsed)
    }

    try {
      const parsed = JSON.parse(content)
      return validatePreferences(parsed)
    } catch {
      return {}
    }
  } catch (error) {
    console.error('Preference extraction error:', error)
    return {}
  }
}

/**
 * 验证提取的偏好
 */
function validatePreferences(data: Record<string, unknown>): ExtractedPreferences {
  const validCommunicationStyles: CommunicationStyle[] = ['formal', 'casual', 'concise', 'detailed']
  const validDecisionStyles: DecisionStyle[] = ['fast', 'careful', 'data-driven']

  return {
    communicationStyle: validCommunicationStyles.includes(data.communicationStyle as CommunicationStyle)
      ? (data.communicationStyle as CommunicationStyle)
      : undefined,
    focusAreas: Array.isArray(data.focusAreas)
      ? data.focusAreas.filter((s): s is string => typeof s === 'string')
      : undefined,
    dislikes: Array.isArray(data.dislikes)
      ? data.dislikes.filter((s): s is string => typeof s === 'string')
      : undefined,
    decisionStyle: validDecisionStyles.includes(data.decisionStyle as DecisionStyle)
      ? (data.decisionStyle as DecisionStyle)
      : undefined,
    insights: Array.isArray(data.insights)
      ? data.insights.filter((s): s is string => typeof s === 'string')
      : undefined,
  }
}

/**
 * 更新用户高管的偏好
 */
export async function updateExecutivePreferences(
  userId: mongoose.Types.ObjectId,
  agentId: AgentId,
  preferences: ExtractedPreferences
): Promise<void> {
  const userExecutive = await UserExecutive.findOne({ userId, agentId })
  if (!userExecutive) return

  // 合并偏好
  const existingPrefs = userExecutive.learnedPreferences || {}

  // 更新沟通风格（覆盖）
  if (preferences.communicationStyle) {
    existingPrefs.communicationStyle = preferences.communicationStyle
  }

  // 更新决策风格（覆盖）
  if (preferences.decisionStyle) {
    existingPrefs.decisionStyle = preferences.decisionStyle
  }

  // 合并关注领域（去重）
  if (preferences.focusAreas && preferences.focusAreas.length > 0) {
    const existingAreas = existingPrefs.focusAreas || []
    const merged = Array.from(new Set([...existingAreas, ...preferences.focusAreas]))
    existingPrefs.focusAreas = merged.slice(0, 10) // 最多保留10个
  }

  // 合并不喜欢的事物（去重）
  if (preferences.dislikes && preferences.dislikes.length > 0) {
    const existingDislikes = existingPrefs.dislikes || []
    const merged = Array.from(new Set([...existingDislikes, ...preferences.dislikes]))
    existingPrefs.dislikes = merged.slice(0, 10)
  }

  // 更新数据库
  await UserExecutive.findOneAndUpdate(
    { userId, agentId },
    { $set: { learnedPreferences: existingPrefs } }
  )
}

/**
 * 从讨论中提取洞察并存储为记忆
 */
export async function extractAndStoreInsights(
  discussion: IDiscussion
): Promise<string[]> {
  const userId = discussion.userId.toString()
  const storedIds: string[] = []

  // 提取偏好
  const preferences = await extractPreferencesFromDiscussion(discussion)

  // 更新参与高管的偏好
  for (const agentId of discussion.participants) {
    await updateExecutivePreferences(
      discussion.userId,
      agentId as AgentId,
      preferences
    )
  }

  // 存储偏好洞察到向量库
  if (preferences.insights && preferences.insights.length > 0) {
    for (const insight of preferences.insights) {
      try {
        const vectorId = await storeMemory({
          content: insight,
          type: 'user_preference',
          importance: 6,
          userId,
          discussionId: discussion._id.toString(),
        })

        // 同时存储到MongoDB
        await Memory.createMemory({
          userId: discussion.userId,
          discussionId: discussion._id,
          type: 'user_preference',
          layer: 'user',
          content: insight,
          vectorId,
          namespace: generateNamespace({ userId }),
          importance: 6,
          source: { type: 'discussion', id: discussion._id.toString() },
        })

        storedIds.push(vectorId)
      } catch (error) {
        console.error('Failed to store insight:', error)
      }
    }
  }

  // 存储讨论结论作为项目记忆
  if (discussion.summary && discussion.projectId) {
    try {
      const content = `讨论话题: ${discussion.topic}\n结论: ${discussion.summary}`
      const vectorId = await storeMemory({
        content,
        summary: discussion.summary,
        type: 'discussion_insight',
        importance: 7,
        userId,
        projectId: discussion.projectId.toString(),
        discussionId: discussion._id.toString(),
      })

      await Memory.createMemory({
        userId: discussion.userId,
        projectId: discussion.projectId,
        discussionId: discussion._id,
        type: 'discussion_insight',
        layer: 'project',
        content,
        summary: discussion.summary,
        vectorId,
        namespace: generateNamespace({
          userId,
          projectId: discussion.projectId.toString(),
        }),
        importance: 7,
        source: { type: 'discussion', id: discussion._id.toString() },
      })

      storedIds.push(vectorId)
    } catch (error) {
      console.error('Failed to store discussion summary:', error)
    }
  }

  return storedIds
}

/**
 * 从讨论结论中提取关键决策
 */
export async function extractDecisionsFromDiscussion(
  discussion: IDiscussion
): Promise<string[]> {
  if (!discussion.conclusions || discussion.conclusions.length === 0) {
    return []
  }

  const userId = discussion.userId.toString()
  const storedIds: string[] = []

  for (const conclusion of discussion.conclusions) {
    try {
      const vectorId = await storeMemory({
        content: conclusion,
        type: 'decision',
        importance: 8,
        userId,
        projectId: discussion.projectId?.toString(),
        discussionId: discussion._id.toString(),
      })

      await Memory.createMemory({
        userId: discussion.userId,
        projectId: discussion.projectId,
        discussionId: discussion._id,
        type: 'decision',
        layer: discussion.projectId ? 'project' : 'user',
        content: conclusion,
        vectorId,
        namespace: generateNamespace({
          userId,
          projectId: discussion.projectId?.toString(),
        }),
        importance: 8,
        source: { type: 'discussion', id: discussion._id.toString() },
      })

      storedIds.push(vectorId)
    } catch (error) {
      console.error('Failed to store decision:', error)
    }
  }

  return storedIds
}
