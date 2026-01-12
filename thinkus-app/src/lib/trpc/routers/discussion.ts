import { z } from 'zod'
import { router, protectedProcedure } from '../trpc'
import { Discussion, UserExecutive, Project } from '@/lib/db/models'
import { EXECUTIVES, type AgentId } from '@/lib/config/executives'
import { PROJECT_PHASES, scheduleDiscussionAgents } from '@/lib/config/project-phases'
import { TRPCError } from '@trpc/server'
import mongoose from 'mongoose'

// 高管ID验证
const agentIdSchema = z.enum([
  'mike', 'elena', 'rachel', 'chloe',
  'david', 'james', 'kevin', 'alex',
  'lisa', 'marcus', 'nina', 'sarah',
  'frank', 'tom', 'iris',
  'nathan', 'oscar', 'victor',
])

export const discussionRouter = router({
  // 创建新讨论
  create: protectedProcedure
    .input(
      z.object({
        projectId: z.string(),
        topic: z.string().min(1).max(500),
        context: z.string().max(2000).optional(),
        participants: z.array(agentIdSchema).optional(),
        autoSchedule: z.boolean().optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const userId = new mongoose.Types.ObjectId(ctx.user.id)
      const projectId = new mongoose.Types.ObjectId(input.projectId)

      // 验证项目存在且属于当前用户
      const project = await Project.findOne({ _id: projectId, userId })
      if (!project) {
        throw new TRPCError({
          code: 'NOT_FOUND',
          message: '项目不存在',
        })
      }

      // 确定参与者
      let participants: AgentId[]
      if (input.participants && input.participants.length > 0) {
        participants = input.participants as AgentId[]
      } else if (input.autoSchedule !== false) {
        // 智能调度：根据项目阶段和话题自动选择高管
        participants = scheduleDiscussionAgents({
          phase: project.phase,
          topic: input.topic,
          complexity: 'medium',
        })
      } else {
        // 默认选择阶段核心高管
        participants = PROJECT_PHASES[project.phase].coreAgents
      }

      // 创建讨论
      const discussion = await Discussion.createDiscussion({
        projectId,
        userId,
        topic: input.topic,
        context: input.context,
        trigger: 'user',
        participants,
      })

      return {
        discussion: {
          id: discussion._id.toString(),
          topic: discussion.topic,
          participants: discussion.participants,
          status: discussion.status,
          createdAt: discussion.createdAt,
        },
        participantDetails: participants.map(id => ({
          agentId: id,
          name: EXECUTIVES[id].nameCn,
          title: EXECUTIVES[id].titleCn,
          color: EXECUTIVES[id].color,
        })),
      }
    }),

  // 获取讨论详情
  getById: protectedProcedure
    .input(z.object({ discussionId: z.string() }))
    .query(async ({ ctx, input }) => {
      const userId = new mongoose.Types.ObjectId(ctx.user.id)
      const discussionId = new mongoose.Types.ObjectId(input.discussionId)

      const discussion = await Discussion.findOne({ _id: discussionId, userId })
      if (!discussion) {
        throw new TRPCError({
          code: 'NOT_FOUND',
          message: '讨论不存在',
        })
      }

      return {
        id: discussion._id.toString(),
        projectId: discussion.projectId.toString(),
        topic: discussion.topic,
        context: discussion.context,
        trigger: discussion.trigger,
        participants: discussion.participants,
        messages: discussion.messages,
        summary: discussion.summary,
        conclusions: discussion.conclusions,
        actionItems: discussion.actionItems,
        status: discussion.status,
        createdAt: discussion.createdAt,
        concludedAt: discussion.concludedAt,
        participantDetails: discussion.participants.map((id: string) => ({
          agentId: id,
          name: EXECUTIVES[id as AgentId].nameCn,
          title: EXECUTIVES[id as AgentId].titleCn,
          color: EXECUTIVES[id as AgentId].color,
        })),
      }
    }),

  // 获取项目讨论列表
  listByProject: protectedProcedure
    .input(
      z.object({
        projectId: z.string(),
        status: z.enum(['active', 'concluded', 'cancelled']).optional(),
        limit: z.number().min(1).max(50).optional(),
        skip: z.number().min(0).optional(),
      })
    )
    .query(async ({ ctx, input }) => {
      const userId = new mongoose.Types.ObjectId(ctx.user.id)
      const projectId = new mongoose.Types.ObjectId(input.projectId)

      // 验证项目属于用户
      const project = await Project.findOne({ _id: projectId, userId })
      if (!project) {
        throw new TRPCError({
          code: 'NOT_FOUND',
          message: '项目不存在',
        })
      }

      const result = await Discussion.getProjectDiscussions(projectId, {
        status: input.status,
        limit: input.limit,
        skip: input.skip,
      })

      return {
        discussions: result.discussions.map(d => ({
          id: d._id.toString(),
          topic: d.topic,
          participants: d.participants,
          messageCount: d.messages.length,
          status: d.status,
          createdAt: d.createdAt,
          concludedAt: d.concludedAt,
        })),
        total: result.total,
      }
    }),

  // 获取用户最近讨论
  getRecent: protectedProcedure
    .input(z.object({ limit: z.number().min(1).max(20).optional() }))
    .query(async ({ ctx, input }) => {
      const userId = new mongoose.Types.ObjectId(ctx.user.id)
      const discussions = await Discussion.getUserRecentDiscussions(userId, input.limit)

      return discussions.map(d => ({
        id: d._id.toString(),
        projectId: d.projectId.toString(),
        topic: d.topic,
        participants: d.participants,
        status: d.status,
        createdAt: d.createdAt,
      }))
    }),

  // 添加消息到讨论
  addMessage: protectedProcedure
    .input(
      z.object({
        discussionId: z.string(),
        content: z.string().min(1),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const userId = new mongoose.Types.ObjectId(ctx.user.id)
      const discussionId = new mongoose.Types.ObjectId(input.discussionId)

      const discussion = await Discussion.findOne({
        _id: discussionId,
        userId,
        status: 'active',
      })

      if (!discussion) {
        throw new TRPCError({
          code: 'NOT_FOUND',
          message: '讨论不存在或已结束',
        })
      }

      await discussion.addMessage({
        role: 'user',
        content: input.content,
      })

      return { success: true }
    }),

  // 结束讨论
  conclude: protectedProcedure
    .input(
      z.object({
        discussionId: z.string(),
        summary: z.string().min(1),
        conclusions: z.array(z.string()).optional(),
        actionItems: z.array(
          z.object({
            description: z.string(),
            assignee: agentIdSchema,
            dueDate: z.string().optional(),
          })
        ).optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const userId = new mongoose.Types.ObjectId(ctx.user.id)
      const discussionId = new mongoose.Types.ObjectId(input.discussionId)

      const discussion = await Discussion.findOne({
        _id: discussionId,
        userId,
        status: 'active',
      })

      if (!discussion) {
        throw new TRPCError({
          code: 'NOT_FOUND',
          message: '讨论不存在或已结束',
        })
      }

      const actionItems = input.actionItems?.map(item => ({
        description: item.description,
        assignee: item.assignee as AgentId,
        status: 'pending' as const,
        dueDate: item.dueDate ? new Date(item.dueDate) : undefined,
      }))

      await discussion.conclude({
        summary: input.summary,
        conclusions: input.conclusions,
        actionItems,
      })

      // 更新用户和项目的讨论计数
      await Promise.all([
        Project.findByIdAndUpdate(discussion.projectId, {
          $inc: { 'stats.totalDiscussions': 1 },
        }),
        // 更新参与高管的使用统计
        ...discussion.participants.map((agentId: string) =>
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
        ),
      ])

      return { success: true }
    }),

  // 取消讨论
  cancel: protectedProcedure
    .input(z.object({ discussionId: z.string() }))
    .mutation(async ({ ctx, input }) => {
      const userId = new mongoose.Types.ObjectId(ctx.user.id)
      const discussionId = new mongoose.Types.ObjectId(input.discussionId)

      const discussion = await Discussion.findOne({
        _id: discussionId,
        userId,
        status: 'active',
      })

      if (!discussion) {
        throw new TRPCError({
          code: 'NOT_FOUND',
          message: '讨论不存在或已结束',
        })
      }

      await discussion.cancel()
      return { success: true }
    }),

  // 获取智能推荐的参与者
  getRecommendedParticipants: protectedProcedure
    .input(
      z.object({
        projectId: z.string(),
        topic: z.string(),
        complexity: z.enum(['simple', 'medium', 'complex']).optional(),
      })
    )
    .query(async ({ ctx, input }) => {
      const userId = new mongoose.Types.ObjectId(ctx.user.id)
      const projectId = new mongoose.Types.ObjectId(input.projectId)

      const project = await Project.findOne({ _id: projectId, userId })
      if (!project) {
        throw new TRPCError({
          code: 'NOT_FOUND',
          message: '项目不存在',
        })
      }

      const participants = scheduleDiscussionAgents({
        phase: project.phase,
        topic: input.topic,
        complexity: input.complexity || 'medium',
      })

      return {
        participants: participants.map(id => ({
          agentId: id,
          name: EXECUTIVES[id].nameCn,
          title: EXECUTIVES[id].titleCn,
          color: EXECUTIVES[id].color,
          isCore: PROJECT_PHASES[project.phase].coreAgents.includes(id),
        })),
        phase: project.phase,
        phaseName: PROJECT_PHASES[project.phase].nameCn,
      }
    }),
})
