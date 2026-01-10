import { z } from 'zod'
import { router, protectedProcedure, publicProcedure } from '../trpc'
import User from '@/lib/db/models/user'
import bcrypt from 'bcryptjs'
import { TRPCError } from '@trpc/server'

export const userRouter = router({
  register: publicProcedure
    .input(
      z.object({
        email: z.string().email('请输入有效的邮箱'),
        password: z.string().min(8, '密码至少8位'),
        name: z.string().min(2, '姓名至少2个字符'),
      })
    )
    .mutation(async ({ input }) => {
      const existingUser = await User.findOne({ email: input.email })

      if (existingUser) {
        throw new TRPCError({ code: 'CONFLICT', message: '该邮箱已注册' })
      }

      const hashedPassword = await bcrypt.hash(input.password, 12)

      const user = await User.create({
        email: input.email,
        password: hashedPassword,
        name: input.name,
        authProvider: 'email',
      })

      return {
        user: {
          id: user._id.toString(),
          email: user.email,
          name: user.name,
        },
      }
    }),

  me: protectedProcedure.query(async ({ ctx }) => {
    const user = await User.findById(ctx.user.id).lean()

    if (!user) {
      throw new TRPCError({ code: 'NOT_FOUND', message: '用户不存在' })
    }

    return {
      user: {
        id: user._id.toString(),
        email: user.email,
        name: user.name,
        avatar: user.avatar,
        stats: user.stats,
        settings: user.settings,
      },
    }
  }),

  updateSettings: protectedProcedure
    .input(
      z.object({
        name: z.string().optional(),
        language: z.string().optional(),
        theme: z.enum(['light', 'dark', 'system']).optional(),
        notifications: z.boolean().optional(),
      })
    )
    .mutation(async ({ input, ctx }) => {
      const updateData: Record<string, unknown> = {}

      if (input.name) updateData.name = input.name
      if (input.language) updateData['settings.language'] = input.language
      if (input.theme) updateData['settings.theme'] = input.theme
      if (input.notifications !== undefined) updateData['settings.notifications'] = input.notifications

      const user = await User.findByIdAndUpdate(ctx.user.id, { $set: updateData }, { new: true }).lean()

      if (!user) {
        throw new TRPCError({ code: 'NOT_FOUND', message: '用户不存在' })
      }

      return { success: true }
    }),
})
