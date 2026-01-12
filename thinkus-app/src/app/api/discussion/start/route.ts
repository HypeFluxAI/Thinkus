import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import mongoose from 'mongoose'
import { authOptions } from '@/lib/auth/options'
import { Discussion, Project } from '@/lib/db/models'
import { EXECUTIVES, type AgentId } from '@/lib/config/executives'
import { scheduleDiscussionAgents } from '@/lib/config/project-phases'
import dbConnect from '@/lib/db/connection'

interface StartDiscussionRequest {
  projectId: string
  topic: string
  context?: string
  participants?: AgentId[]
  autoSchedule?: boolean
  initialMessage?: string
}

export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body: StartDiscussionRequest = await req.json()
    const {
      projectId,
      topic,
      context,
      participants,
      autoSchedule = true,
      initialMessage,
    } = body

    if (!projectId || !topic) {
      return NextResponse.json({ error: 'Project ID and topic are required' }, { status: 400 })
    }

    await dbConnect()
    const userId = new mongoose.Types.ObjectId(session.user.id)

    // 验证项目存在且属于当前用户
    const project = await Project.findOne({
      _id: new mongoose.Types.ObjectId(projectId),
      userId,
    })

    if (!project) {
      return NextResponse.json({ error: 'Project not found' }, { status: 404 })
    }

    // 确定参与者
    let finalParticipants: AgentId[]
    if (participants && participants.length > 0) {
      // 验证参与者ID
      finalParticipants = participants.filter(id => EXECUTIVES[id])
    } else if (autoSchedule) {
      // 智能调度
      finalParticipants = scheduleDiscussionAgents({
        phase: project.phase,
        topic,
        complexity: 'medium',
      })
    } else {
      // 默认使用项目阶段核心高管
      finalParticipants = ['mike', 'elena', 'david'] as AgentId[]
    }

    // 创建讨论
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

    // 如果有初始消息，添加到讨论中
    if (initialMessage) {
      await discussion.addMessage({
        role: 'user',
        content: initialMessage,
      })
    }

    // 返回讨论信息
    return NextResponse.json({
      discussion: {
        id: discussion._id.toString(),
        projectId: discussion.projectId.toString(),
        topic: discussion.topic,
        context: discussion.context,
        status: discussion.status,
        createdAt: discussion.createdAt,
        participants: finalParticipants,
        participantDetails: finalParticipants.map(id => ({
          agentId: id,
          name: EXECUTIVES[id].nameCn,
          title: EXECUTIVES[id].titleCn,
          color: EXECUTIVES[id].color,
          avatar: EXECUTIVES[id].avatar,
        })),
      },
      project: {
        id: project._id.toString(),
        name: project.name,
        phase: project.phase,
      },
    })
  } catch (error) {
    console.error('Start discussion error:', error)
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 })
  }
}
