import { NextRequest } from 'next/server'
import { getServerSession } from 'next-auth'
import mongoose from 'mongoose'
import { authOptions } from '@/lib/auth/options'
import { Discussion, UserExecutive, Project } from '@/lib/db/models'
import { EXECUTIVES, type AgentId } from '@/lib/config/executives'
import { scheduleDiscussionAgents } from '@/lib/config/project-phases'
import { analyzeTopicWithAI, analyzeTopicQuick } from '@/lib/services/topic-analyzer'
import {
  generateAgentResponseStream,
  getNextStage,
  getStageConfig,
  generateDiscussionSummary,
  type DiscussionContext,
  type DiscussionStage,
  type OrchestratorMessage,
} from '@/lib/services/discussion-orchestrator'
import dbConnect from '@/lib/db/connection'

interface MultiAgentRequest {
  projectId: string
  topic: string
  context?: string
  participants?: AgentId[]
  autoSchedule?: boolean
  useAIAnalysis?: boolean
  stages?: DiscussionStage[]
}

export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return new Response('Unauthorized', { status: 401 })
    }

    const body: MultiAgentRequest = await req.json()
    const {
      projectId,
      topic,
      context,
      participants,
      autoSchedule = true,
      useAIAnalysis = false,
      stages = ['opening', 'exploration', 'debate', 'synthesis'],
    } = body

    if (!projectId || !topic) {
      return new Response('Project ID and topic are required', { status: 400 })
    }

    await dbConnect()
    const userId = new mongoose.Types.ObjectId(session.user.id)

    // 获取项目
    const project = await Project.findOne({
      _id: new mongoose.Types.ObjectId(projectId),
      userId,
    })

    if (!project) {
      return new Response('Project not found', { status: 404 })
    }

    // 确定参与者
    let finalParticipants: AgentId[]
    if (participants && participants.length > 0) {
      finalParticipants = participants.filter(id => EXECUTIVES[id])
    } else if (autoSchedule) {
      if (useAIAnalysis) {
        const analysis = await analyzeTopicWithAI({
          topic,
          context,
          phase: project.phase,
        })
        finalParticipants = analysis.recommendedAgents
      } else {
        const quickAnalysis = analyzeTopicQuick({ topic, phase: project.phase })
        finalParticipants = quickAnalysis.recommendedAgents
      }
    } else {
      finalParticipants = scheduleDiscussionAgents({
        phase: project.phase,
        topic,
        complexity: 'medium',
      })
    }

    // 获取用户的高管实例
    const userExecutives = await UserExecutive.find({
      userId,
      agentId: { $in: finalParticipants },
    })

    const userExecutiveMap = new Map(
      userExecutives.map(ue => [ue.agentId as AgentId, ue])
    )

    // 创建讨论记录
    const discussion = await Discussion.create({
      projectId: project._id,
      userId,
      topic,
      context,
      trigger: 'user',
      participants: finalParticipants,
      messages: [],
      status: 'active',
    })

    // 构建讨论上下文
    const discussionContext: DiscussionContext = {
      topic,
      context,
      projectName: project.name,
      projectPhase: project.phase,
      participants: finalParticipants,
      userExecutives: userExecutiveMap,
      messages: [],
      currentStage: stages[0],
    }

    const encoder = new TextEncoder()

    const readable = new ReadableStream({
      async start(controller) {
        const sendEvent = (type: string, data: unknown) => {
          controller.enqueue(
            encoder.encode(`data: ${JSON.stringify({ type, ...data as object })}\n\n`)
          )
        }

        try {
          // 发送讨论开始事件
          sendEvent('discussion_start', {
            discussionId: discussion._id.toString(),
            topic,
            participants: finalParticipants.map(id => ({
              agentId: id,
              name: EXECUTIVES[id].nameCn,
              title: EXECUTIVES[id].titleCn,
              color: EXECUTIVES[id].color,
              avatar: EXECUTIVES[id].avatar,
            })),
            stages,
          })

          const allMessages: OrchestratorMessage[] = []

          // 执行每个阶段
          for (const stage of stages) {
            const stageConfig = getStageConfig(stage)
            sendEvent('stage_start', {
              stage,
              stageName: stageConfig.nameCn,
              description: stageConfig.instruction,
            })

            discussionContext.currentStage = stage

            // 每个参与者发言
            for (const agentId of finalParticipants) {
              const exec = EXECUTIVES[agentId]

              sendEvent('agent_start', {
                agentId,
                name: exec.nameCn,
                title: exec.titleCn,
                color: exec.color,
                avatar: exec.avatar,
                stage,
              })

              let fullContent = ''

              // 流式生成发言
              for await (const chunk of generateAgentResponseStream({
                context: discussionContext,
                agentId,
                stage,
              })) {
                fullContent += chunk
                sendEvent('agent_delta', {
                  agentId,
                  content: chunk,
                })
              }

              // 记录消息
              const message: OrchestratorMessage = {
                agentId,
                content: fullContent,
                stage,
                timestamp: new Date(),
              }
              allMessages.push(message)
              discussionContext.messages.push(message)

              // 存储到数据库
              await discussion.addMessage({
                role: 'agent',
                agentId,
                content: fullContent,
                metadata: { stage } as { thinking?: string; references?: string[]; confidence?: number },
              })

              sendEvent('agent_complete', {
                agentId,
                content: fullContent,
                stage,
              })

              // 短暂延迟
              await new Promise(resolve => setTimeout(resolve, 500))
            }

            sendEvent('stage_complete', { stage })
          }

          // 生成讨论总结
          sendEvent('summary_start', {})

          const summary = await generateDiscussionSummary(discussionContext)

          // 结束讨论
          await discussion.conclude({
            summary: summary.summary,
            conclusions: summary.conclusions,
            actionItems: summary.actionItems.map(item => ({
              description: item.description,
              assignee: item.assignee,
              status: 'pending' as const,
            })),
          })

          // 更新高管使用统计
          await Promise.all(
            finalParticipants.map(agentId =>
              UserExecutive.findOneAndUpdate(
                { userId, agentId },
                {
                  $inc: {
                    'usageStats.totalDiscussions': 1,
                    'usageStats.totalMessages': allMessages.filter(m => m.agentId === agentId).length,
                  },
                  $set: { 'usageStats.lastActiveAt': new Date() },
                }
              )
            )
          )

          // 更新项目统计
          await Project.findByIdAndUpdate(project._id, {
            $inc: { 'stats.totalDiscussions': 1 },
          })

          sendEvent('summary_complete', {
            summary: summary.summary,
            conclusions: summary.conclusions,
            actionItems: summary.actionItems,
          })

          sendEvent('discussion_complete', {
            discussionId: discussion._id.toString(),
            messageCount: allMessages.length,
          })

          controller.close()
        } catch (error) {
          console.error('Multi-agent discussion error:', error)
          sendEvent('error', {
            message: error instanceof Error ? error.message : 'Discussion failed',
          })
          controller.error(error)
        }
      },
    })

    return new Response(readable, {
      headers: {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache',
        Connection: 'keep-alive',
      },
    })
  } catch (error) {
    console.error('Multi-agent API error:', error)
    return new Response('Internal Server Error', { status: 500 })
  }
}
