import { z } from 'zod'
import { router, protectedProcedure } from '../trpc'
import Project from '@/lib/db/models/project'
import { TRPCError } from '@trpc/server'

export const projectRouter = router({
  list: protectedProcedure.query(async ({ ctx }) => {
    const projects = await Project.find({ userId: ctx.user.id })
      .sort({ createdAt: -1 })
      .lean()
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
      }).lean()

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
        status: z.enum(['draft', 'discussing', 'confirmed', 'paid', 'in_progress', 'completed', 'cancelled']).optional(),
      })
    )
    .mutation(async ({ input, ctx }) => {
      const project = await Project.findOneAndUpdate(
        { _id: input.id, userId: ctx.user.id },
        { $set: input },
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
