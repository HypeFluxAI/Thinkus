import { z } from 'zod'
import { router, protectedProcedure } from '../trpc'
import Project, { type IProject } from '@/lib/db/models/project'
import { TRPCError } from '@trpc/server'

export const projectRouter = router({
  list: protectedProcedure.query(async ({ ctx }) => {
    const projects = await Project.find({ userId: ctx.user.id })
      .sort({ createdAt: -1 })
      .lean<IProject[]>()
    return { projects }
  }),

  create: protectedProcedure
    .input(
      z.object({
        name: z.string().optional(),
        requirement: z.string().min(1, '请描述您的需求'),
      })
    )
    .mutation(async ({ input, ctx }) => {
      const project = await Project.create({
        userId: ctx.user.id,
        name: input.name || '新项目',
        requirement: {
          original: input.requirement,
        },
        status: 'draft',
      })
      return { project }
    }),

  getById: protectedProcedure
    .input(z.object({ id: z.string() }))
    .query(async ({ input, ctx }) => {
      const project = await Project.findOne({
        _id: input.id,
        userId: ctx.user.id,
      }).lean<IProject>()

      if (!project) {
        throw new TRPCError({ code: 'NOT_FOUND', message: '项目不存在' })
      }

      return { project }
    }),

  update: protectedProcedure
    .input(
      z.object({
        id: z.string(),
        name: z.string().optional(),
        description: z.string().optional(),
        oneLiner: z.string().optional(),
        icon: z.string().optional(),
        type: z.enum(['web', 'mobile', 'game', 'desktop', 'blockchain', 'other']).optional(),
        industry: z.string().optional(),
        status: z.enum(['active', 'paused', 'completed', 'archived']).optional(),
        config: z.object({
          autoRun: z.boolean().optional(),
          notifyLevel: z.number().min(0).max(3).optional(),
        }).optional(),
      })
    )
    .mutation(async ({ input, ctx }) => {
      const { id, config, ...rest } = input

      // Build update object
      const updateData: Record<string, unknown> = { ...rest }

      // Handle nested config updates
      if (config) {
        if (config.autoRun !== undefined) {
          updateData['config.autoRun'] = config.autoRun
        }
        if (config.notifyLevel !== undefined) {
          updateData['config.notifyLevel'] = config.notifyLevel
        }
      }

      const project = await Project.findOneAndUpdate(
        { _id: id, userId: ctx.user.id },
        { $set: updateData },
        { new: true }
      ).lean()

      if (!project) {
        throw new TRPCError({ code: 'NOT_FOUND', message: '项目不存在' })
      }

      return { project }
    }),

  delete: protectedProcedure
    .input(z.object({ id: z.string() }))
    .mutation(async ({ input, ctx }) => {
      const result = await Project.deleteOne({
        _id: input.id,
        userId: ctx.user.id,
      })

      if (result.deletedCount === 0) {
        throw new TRPCError({ code: 'NOT_FOUND', message: '项目不存在' })
      }

      return { success: true }
    }),
})
