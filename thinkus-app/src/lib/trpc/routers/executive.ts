import { z } from 'zod'
import { router, protectedProcedure } from '../trpc'
import { UserExecutive, type IUserExecutive } from '@/lib/db/models'
import { EXECUTIVES, type AgentId } from '@/lib/config/executives'
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

export const executiveRouter = router({
  // 获取用户所有高管
  list: protectedProcedure.query(async ({ ctx }) => {
    const userId = new mongoose.Types.ObjectId(ctx.user.id)
    const executives = await UserExecutive.getExecutivesByUser(userId)

    // 合并配置信息
    return executives.map((exec: IUserExecutive) => ({
      id: exec._id.toString(),
      agentId: exec.agentId,
      status: exec.status,
      memoryStats: exec.memoryStats,
      learnedPreferences: exec.learnedPreferences,
      usageStats: exec.usageStats,
      // 静态配置
      config: EXECUTIVES[exec.agentId as AgentId],
    }))
  }),

  // 获取单个高管详情
  getByAgentId: protectedProcedure
    .input(z.object({ agentId: agentIdSchema }))
    .query(async ({ ctx, input }) => {
      const userId = new mongoose.Types.ObjectId(ctx.user.id)
      const executive = await UserExecutive.getExecutive(userId, input.agentId as AgentId)

      if (!executive) {
        throw new TRPCError({
          code: 'NOT_FOUND',
          message: '高管不存在',
        })
      }

      return {
        id: executive._id.toString(),
        agentId: executive.agentId,
        status: executive.status,
        memoryStats: executive.memoryStats,
        learnedPreferences: executive.learnedPreferences,
        usageStats: executive.usageStats,
        config: EXECUTIVES[executive.agentId as AgentId],
        createdAt: executive.createdAt,
        updatedAt: executive.updatedAt,
      }
    }),

  // 更新高管偏好设置
  updatePreferences: protectedProcedure
    .input(
      z.object({
        agentId: agentIdSchema,
        preferences: z.object({
          communicationStyle: z.enum(['formal', 'casual', 'concise', 'detailed']).optional(),
          focusAreas: z.array(z.string()).optional(),
          dislikes: z.array(z.string()).optional(),
          decisionStyle: z.enum(['fast', 'careful', 'data-driven']).optional(),
          customInstructions: z.string().max(500).optional(),
        }),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const userId = new mongoose.Types.ObjectId(ctx.user.id)
      const executive = await UserExecutive.getExecutive(userId, input.agentId as AgentId)

      if (!executive) {
        throw new TRPCError({
          code: 'NOT_FOUND',
          message: '高管不存在',
        })
      }

      await executive.updatePreferences(input.preferences)

      return { success: true }
    }),

  // 获取高管统计摘要
  getStats: protectedProcedure.query(async ({ ctx }) => {
    const userId = new mongoose.Types.ObjectId(ctx.user.id)
    const executives = await UserExecutive.getExecutivesByUser(userId)

    // 计算总体统计
    const totalStats = executives.reduce(
      (acc: { totalDiscussions: number; totalMessages: number; totalMemories: number }, exec: IUserExecutive) => ({
        totalDiscussions: acc.totalDiscussions + exec.usageStats.totalDiscussions,
        totalMessages: acc.totalMessages + exec.usageStats.totalMessages,
        totalMemories: acc.totalMemories + exec.memoryStats.totalMemories,
      }),
      { totalDiscussions: 0, totalMessages: 0, totalMemories: 0 }
    )

    // 找出最活跃的高管
    const sortedByActivity = [...executives].sort(
      (a: IUserExecutive, b: IUserExecutive) => b.usageStats.totalDiscussions - a.usageStats.totalDiscussions
    )
    const mostActive = sortedByActivity.slice(0, 5).map((exec: IUserExecutive) => ({
      agentId: exec.agentId,
      name: EXECUTIVES[exec.agentId as AgentId].nameCn,
      discussions: exec.usageStats.totalDiscussions,
    }))

    return {
      totalExecutives: executives.length,
      activeExecutives: executives.filter((e: IUserExecutive) => e.status === 'active').length,
      ...totalStats,
      mostActive,
    }
  }),

  // 获取按组分类的高管
  listByGroup: protectedProcedure.query(async ({ ctx }) => {
    const userId = new mongoose.Types.ObjectId(ctx.user.id)
    const executives = await UserExecutive.getExecutivesByUser(userId)

    // 按组分类
    const groups: Record<string, Array<{
      agentId: string
      nameCn: string
      titleCn: string
      status: string
      totalDiscussions: number
    }>> = {
      product: [],
      tech: [],
      growth: [],
      finance: [],
      strategy: [],
    }

    executives.forEach((exec: IUserExecutive) => {
      const config = EXECUTIVES[exec.agentId as AgentId]
      const item = {
        agentId: exec.agentId,
        nameCn: config.nameCn,
        titleCn: config.titleCn,
        status: exec.status,
        totalDiscussions: exec.usageStats.totalDiscussions,
      }

      if (groups[config.group]) {
        groups[config.group].push(item)
      }
    })

    return groups
  }),

  // 暂停/恢复高管
  toggleStatus: protectedProcedure
    .input(
      z.object({
        agentId: agentIdSchema,
        status: z.enum(['active', 'suspended']),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const userId = new mongoose.Types.ObjectId(ctx.user.id)
      const executive = await UserExecutive.findOneAndUpdate(
        { userId, agentId: input.agentId },
        { $set: { status: input.status } },
        { new: true }
      )

      if (!executive) {
        throw new TRPCError({
          code: 'NOT_FOUND',
          message: '高管不存在',
        })
      }

      return {
        success: true,
        status: executive.status,
      }
    }),

  // 初始化用户高管（如果缺失）
  initialize: protectedProcedure.mutation(async ({ ctx }) => {
    const userId = new mongoose.Types.ObjectId(ctx.user.id)
    const existingCount = await UserExecutive.countDocuments({ userId })

    if (existingCount >= 18) {
      return { success: true, message: '高管已完整初始化', count: existingCount }
    }

    // 创建缺失的高管
    const existingAgents = await UserExecutive.find({ userId }).select('agentId')
    const existingIds = new Set(existingAgents.map((e: IUserExecutive) => e.agentId))

    const allAgentIds: AgentId[] = Object.keys(EXECUTIVES) as AgentId[]
    const missingIds = allAgentIds.filter(id => !existingIds.has(id))

    if (missingIds.length > 0) {
      const newExecutives = missingIds.map(agentId => ({
        userId,
        agentId,
        status: 'active',
        memoryStats: {
          totalMemories: 0,
          memoryByType: {},
        },
        learnedPreferences: {},
        usageStats: {
          totalDiscussions: 0,
          totalMessages: 0,
        },
      }))

      await UserExecutive.insertMany(newExecutives)
    }

    return {
      success: true,
      message: `已初始化 ${missingIds.length} 个高管`,
      count: 18,
    }
  }),
})
