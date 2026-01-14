import { NextRequest, NextResponse } from 'next/server'
import Anthropic from '@anthropic-ai/sdk'
import { getServerSession } from 'next-auth'
import mongoose from 'mongoose'
import { authOptions } from '@/lib/auth/options'
import { Discussion, UserExecutive, Project } from '@/lib/db/models'
import { EXECUTIVES, type AgentId } from '@/lib/config/executives'
import { extractAndStoreInsights, extractDecisionsFromDiscussion as extractDecisionsToMemory } from '@/lib/services/preference-extractor'
import { extractDecisionsFromDiscussion } from '@/lib/services/decision-extractor'
import dbConnect from '@/lib/db/connection'
import * as gemini from '@/lib/ai/gemini'

// 检查使用哪个 AI 服务
const useGemini = !process.env.ANTHROPIC_API_KEY && process.env.GOOGLE_API_KEY

const anthropic = useGemini ? null : new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
})

interface ConcludeRequest {
  discussionId: string
  autoGenerate?: boolean
  summary?: string
  conclusions?: string[]
  actionItems?: Array<{
    description: string
    assignee: AgentId
    dueDate?: string
  }>
}

// 用于生成结论的系统提示词
const CONCLUSION_SYSTEM_PROMPT = `你是一个专业的讨论总结专家。你的任务是分析高管讨论内容，生成结构化的总结。

## 输出格式
请严格按照以下JSON格式输出：

\`\`\`json
{
  "summary": "讨论的核心总结，2-3句话概括主要结论和决定",
  "conclusions": [
    "结论1：具体的结论点",
    "结论2：具体的结论点",
    "结论3：具体的结论点"
  ],
  "actionItems": [
    {
      "description": "具体的行动项描述",
      "assignee": "负责人的agentId（如mike、elena等）",
      "priority": "high/medium/low"
    }
  ]
}
\`\`\`

## 要求
1. summary要精炼，突出最重要的决定
2. conclusions要具体可执行，不要空泛
3. actionItems要指定明确的负责人（从讨论参与者中选择）
4. 确保输出是有效的JSON格式`

export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body: ConcludeRequest = await req.json()
    const { discussionId, autoGenerate = false, summary, conclusions, actionItems } = body

    if (!discussionId) {
      return NextResponse.json({ error: 'Discussion ID required' }, { status: 400 })
    }

    await dbConnect()
    const userId = new mongoose.Types.ObjectId(session.user.id)

    // 获取讨论
    const discussion = await Discussion.findOne({
      _id: new mongoose.Types.ObjectId(discussionId),
      userId,
      status: 'active',
    })

    if (!discussion) {
      return NextResponse.json({ error: 'Discussion not found or already concluded' }, { status: 404 })
    }

    let finalSummary = summary
    let finalConclusions = conclusions
    let finalActionItems = actionItems

    // 自动生成结论
    if (autoGenerate) {
      const generated = await generateConclusions(discussion)
      finalSummary = generated.summary
      finalConclusions = generated.conclusions
      finalActionItems = generated.actionItems
    }

    if (!finalSummary) {
      return NextResponse.json({ error: 'Summary is required' }, { status: 400 })
    }

    // 结束讨论
    const formattedActionItems = finalActionItems?.map(item => ({
      description: item.description,
      assignee: item.assignee as AgentId,
      status: 'pending' as const,
      dueDate: item.dueDate ? new Date(item.dueDate) : undefined,
    }))

    await discussion.conclude({
      summary: finalSummary,
      conclusions: finalConclusions,
      actionItems: formattedActionItems,
    })

    // 更新项目统计
    await Project.findByIdAndUpdate(discussion.projectId, {
      $inc: { 'stats.totalDiscussions': 1 },
    })

    // 更新参与高管的使用统计
    await Promise.all(
      discussion.participants.map((agentId: string) =>
        UserExecutive.findOneAndUpdate(
          { userId, agentId },
          {
            $inc: {
              'usageStats.totalDiscussions': 1,
              'usageStats.totalMessages': discussion.messages.filter(
                (m: { agentId?: string }) => m.agentId === agentId
              ).length,
            },
            $set: { 'usageStats.lastActiveAt': new Date() },
          }
        )
      )
    )

    // 重新获取更新后的讨论数据
    const updatedDiscussion = await Discussion.findById(discussion._id)
    if (updatedDiscussion) {
      // 提取决策和行动项到数据库（始终执行）
      extractDecisionsFromDiscussion(updatedDiscussion).catch((err) => {
        console.error('Failed to extract decisions:', err)
      })

      // 提取并存储记忆到向量库（仅在配置了向量数据库时执行）
      if (process.env.PINECONE_API_KEY && process.env.OPENAI_API_KEY) {
        // 提取洞察并存储
        extractAndStoreInsights(updatedDiscussion).catch((err) => {
          console.error('Failed to extract insights:', err)
        })

        // 提取决策到记忆
        extractDecisionsToMemory(updatedDiscussion).catch((err) => {
          console.error('Failed to extract decisions to memory:', err)
        })
      }
    }

    return NextResponse.json({
      success: true,
      discussion: {
        id: discussion._id.toString(),
        summary: finalSummary,
        conclusions: finalConclusions,
        actionItems: formattedActionItems,
        status: 'concluded',
        concludedAt: new Date(),
      },
    })
  } catch (error) {
    console.error('Conclude discussion error:', error)
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 })
  }
}

// 使用AI自动生成讨论结论
async function generateConclusions(discussion: InstanceType<typeof Discussion>): Promise<{
  summary: string
  conclusions: string[]
  actionItems: Array<{
    description: string
    assignee: AgentId
    priority: string
  }>
}> {
  // 构建讨论历史文本
  const messagesText = discussion.messages
    .map((msg: { role: string; agentId?: string; content: string }) => {
      if (msg.role === 'user') {
        return `用户: ${msg.content}`
      } else if (msg.role === 'agent' && msg.agentId) {
        const exec = EXECUTIVES[msg.agentId as AgentId]
        return `${exec?.nameCn || msg.agentId} (${exec?.titleCn || '高管'}): ${msg.content}`
      } else {
        return `系统: ${msg.content}`
      }
    })
    .join('\n\n')

  const participantsInfo = discussion.participants
    .map((id: string) => {
      const exec = EXECUTIVES[id as AgentId]
      return `- ${id}: ${exec?.nameCn || id} (${exec?.titleCn || '高管'})`
    })
    .join('\n')

  const userPrompt = `## 讨论主题
${discussion.topic}

${discussion.context ? `## 背景\n${discussion.context}\n` : ''}
## 参与高管
${participantsInfo}

## 讨论记录
${messagesText}

请分析以上讨论内容，生成结构化的总结。`

  try {
    let content = ''

    if (useGemini) {
      const response = await gemini.createMessage({
        system: CONCLUSION_SYSTEM_PROMPT,
        max_tokens: 1024,
        temperature: 0.3,
        messages: [{ role: 'user', content: userPrompt }],
      })
      content = response.content[0]?.text || ''
    } else {
      const response = await anthropic!.messages.create({
        model: 'claude-sonnet-4-20250514',
        max_tokens: 1024,
        temperature: 0.3,
        system: CONCLUSION_SYSTEM_PROMPT,
        messages: [{ role: 'user', content: userPrompt }],
      })
      content = response.content[0].type === 'text' ? response.content[0].text : ''
    }

    // 提取JSON
    const jsonMatch = content.match(/```json\s*([\s\S]*?)\s*```/)
    if (jsonMatch) {
      const parsed = JSON.parse(jsonMatch[1])
      return {
        summary: parsed.summary || '讨论已完成',
        conclusions: parsed.conclusions || [],
        actionItems: (parsed.actionItems || []).map((item: { description: string; assignee: string; priority?: string }) => ({
          description: item.description,
          assignee: validateAgentId(item.assignee, discussion.participants) as AgentId,
          priority: item.priority || 'medium',
        })),
      }
    }

    // 如果没有找到JSON，尝试直接解析
    try {
      const parsed = JSON.parse(content)
      return {
        summary: parsed.summary || '讨论已完成',
        conclusions: parsed.conclusions || [],
        actionItems: (parsed.actionItems || []).map((item: { description: string; assignee: string; priority?: string }) => ({
          description: item.description,
          assignee: validateAgentId(item.assignee, discussion.participants) as AgentId,
          priority: item.priority || 'medium',
        })),
      }
    } catch {
      // 解析失败，返回默认值
      return {
        summary: '讨论已完成，请查看详细记录。',
        conclusions: [],
        actionItems: [],
      }
    }
  } catch (error) {
    console.error('Failed to generate conclusions:', error)
    return {
      summary: '讨论已完成。',
      conclusions: [],
      actionItems: [],
    }
  }
}

// 验证agentId是否有效
function validateAgentId(agentId: string, participants: string[]): string {
  if (participants.includes(agentId) && EXECUTIVES[agentId as AgentId]) {
    return agentId
  }
  // 返回第一个参与者作为默认值
  return participants[0] || 'mike'
}
