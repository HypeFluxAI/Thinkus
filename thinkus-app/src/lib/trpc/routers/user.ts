import { z } from 'zod'
import mongoose from 'mongoose'
import { router, protectedProcedure, publicProcedure } from '../trpc'
import User from '@/lib/db/models/user'
import { InvitationCode, UserExecutive, Waitlist, UserCredential } from '@/lib/db/models'
import type { CredentialServiceType } from '@/lib/db/models'
import bcrypt from 'bcryptjs'
import { TRPCError } from '@trpc/server'

export const userRouter = router({
  register: publicProcedure
    .input(
      z.object({
        email: z.string().email('请输入有效的邮箱'),
        password: z.string().min(8, '密码至少8位'),
        name: z.string().min(2, '姓名至少2个字符'),
        invitationCode: z.string().min(6, '请输入有效的邀请码'),
      })
    )
    .mutation(async ({ input }) => {
      // 1. 验证邀请码
      const codeValidation = await InvitationCode.validateCode(input.invitationCode, input.email)
      if (!codeValidation.valid || !codeValidation.invitation) {
        throw new TRPCError({
          code: 'BAD_REQUEST',
          message: codeValidation.error || '无效的邀请码',
        })
      }

      // 2. 检查邮箱是否已注册
      const existingUser = await User.findOne({ email: input.email })
      if (existingUser) {
        throw new TRPCError({ code: 'CONFLICT', message: '该邮箱已注册' })
      }

      // 3. 获取邀请人信息 (如果是用户邀请码)
      let invitedBy: mongoose.Types.ObjectId | undefined
      if (
        codeValidation.invitation.type === 'user_invite' &&
        codeValidation.invitation.createdBy !== 'system'
      ) {
        invitedBy = codeValidation.invitation.createdBy as mongoose.Types.ObjectId
      }

      // 4. 创建用户
      const hashedPassword = await bcrypt.hash(input.password, 12)
      const user = await User.create({
        email: input.email,
        password: hashedPassword,
        name: input.name,
        invitedBy,
        invitationCode: input.invitationCode,
        status: 'active',
        emailVerified: false,
        providers: [],
        stats: {
          totalProjects: 0,
          completedProjects: 0,
          totalSpent: 0,
          totalDiscussions: 0,
        },
        settings: {
          language: 'zh',
          theme: 'system',
          timezone: 'Asia/Shanghai',
          notifications: {
            email: true,
            push: true,
            sms: false,
            dailySummary: true,
            weeklyReport: true,
          },
        },
      })

      // 5. 为新用户创建18个高管实例
      try {
        await UserExecutive.createExecutivesForUser(user._id)
      } catch (error) {
        console.error('Failed to create executives for user:', error)
        // 不阻止注册，高管实例可以稍后重试创建
      }

      // 6. 标记邀请码为已使用
      await InvitationCode.useCode(input.invitationCode, user._id)

      // 7. 如果是waitlist来的，标记为已转化
      try {
        await Waitlist.markAsConverted(input.email, user._id)
      } catch {
        // 忽略错误，可能不是waitlist用户
      }

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
        phone: user.phone,
        name: user.name,
        avatar: user.avatar,
        profile: user.profile || {},
        stats: user.stats,
        settings: user.settings,
        emailVerified: user.emailVerified,
        phoneVerified: user.phoneVerified,
        createdAt: user.createdAt,
      },
    }
  }),

  // 更新个人资料
  updateProfile: protectedProcedure
    .input(
      z.object({
        name: z.string().min(1).max(50).optional(),
        avatar: z.string().url().optional(),
        bio: z.string().max(500).optional(),
        company: z.string().max(100).optional(),
        website: z.string().url().max(200).optional().or(z.literal('')),
        location: z.string().max(100).optional(),
      })
    )
    .mutation(async ({ input, ctx }) => {
      const updateData: Record<string, unknown> = {}

      if (input.name !== undefined) updateData.name = input.name
      if (input.avatar !== undefined) updateData.avatar = input.avatar
      if (input.bio !== undefined) updateData['profile.bio'] = input.bio
      if (input.company !== undefined) updateData['profile.company'] = input.company
      if (input.website !== undefined) updateData['profile.website'] = input.website || undefined
      if (input.location !== undefined) updateData['profile.location'] = input.location

      const user = await User.findByIdAndUpdate(
        ctx.user.id,
        { $set: updateData },
        { new: true }
      ).lean()

      if (!user) {
        throw new TRPCError({ code: 'NOT_FOUND', message: '用户不存在' })
      }

      return {
        success: true,
        user: {
          id: user._id.toString(),
          name: user.name,
          avatar: user.avatar,
          profile: user.profile || {},
        },
      }
    }),

  updateSettings: protectedProcedure
    .input(
      z.object({
        language: z.enum(['zh', 'en']).optional(),
        theme: z.enum(['light', 'dark', 'system']).optional(),
        timezone: z.string().optional(),
      })
    )
    .mutation(async ({ input, ctx }) => {
      const updateData: Record<string, unknown> = {}

      if (input.language) updateData['settings.language'] = input.language
      if (input.theme) updateData['settings.theme'] = input.theme
      if (input.timezone) updateData['settings.timezone'] = input.timezone

      const user = await User.findByIdAndUpdate(ctx.user.id, { $set: updateData }, { new: true }).lean()

      if (!user) {
        throw new TRPCError({ code: 'NOT_FOUND', message: '用户不存在' })
      }

      return { success: true, settings: user.settings }
    }),

  // 获取通知设置
  getNotificationSettings: protectedProcedure.query(async ({ ctx }) => {
    const user = await User.findById(ctx.user.id).select('settings.notifications').lean()

    if (!user) {
      throw new TRPCError({ code: 'NOT_FOUND', message: '用户不存在' })
    }

    return {
      settings: user.settings?.notifications || {
        email: true,
        push: true,
        sms: false,
        dailySummary: true,
        weeklyReport: true,
      },
    }
  }),

  // 更新通知设置
  updateNotificationSettings: protectedProcedure
    .input(
      z.object({
        email: z.boolean().optional(),
        push: z.boolean().optional(),
        sms: z.boolean().optional(),
        dailySummary: z.boolean().optional(),
        weeklyReport: z.boolean().optional(),
      })
    )
    .mutation(async ({ input, ctx }) => {
      const updateData: Record<string, unknown> = {}

      if (input.email !== undefined) updateData['settings.notifications.email'] = input.email
      if (input.push !== undefined) updateData['settings.notifications.push'] = input.push
      if (input.sms !== undefined) updateData['settings.notifications.sms'] = input.sms
      if (input.dailySummary !== undefined) updateData['settings.notifications.dailySummary'] = input.dailySummary
      if (input.weeklyReport !== undefined) updateData['settings.notifications.weeklyReport'] = input.weeklyReport

      const user = await User.findByIdAndUpdate(
        ctx.user.id,
        { $set: updateData },
        { new: true }
      ).lean()

      if (!user) {
        throw new TRPCError({ code: 'NOT_FOUND', message: '用户不存在' })
      }

      return {
        success: true,
        settings: user.settings?.notifications,
      }
    }),

  // ============ 凭证管理 ============

  // 获取用户所有凭证
  listCredentials: protectedProcedure.query(async ({ ctx }) => {
    const userId = new mongoose.Types.ObjectId(ctx.user.id)
    const credentials = await UserCredential.getUserCredentials(userId)

    return {
      credentials: credentials.map(c => ({
        id: c._id.toString(),
        name: c.name,
        service: c.service,
        keyPreview: `${c.keyPrefix}...${c.keySuffix}`,
        lastUsedAt: c.lastUsedAt,
        createdAt: c.createdAt,
      })),
    }
  }),

  // 添加凭证
  addCredential: protectedProcedure
    .input(
      z.object({
        name: z.string().min(1, '请输入凭证名称').max(100),
        service: z.enum([
          'anthropic',
          'openai',
          'stripe',
          'aws',
          'cloudflare',
          'mongodb',
          'github',
          'vercel',
          'custom',
        ]),
        key: z.string().min(1, '请输入 API 密钥'),
      })
    )
    .mutation(async ({ input, ctx }) => {
      const userId = new mongoose.Types.ObjectId(ctx.user.id)

      try {
        const credential = await UserCredential.createCredential(
          userId,
          input.name,
          input.service as CredentialServiceType,
          input.key
        )

        return {
          success: true,
          credential: {
            id: credential._id.toString(),
            name: credential.name,
            service: credential.service,
            keyPreview: `${credential.keyPrefix}...${credential.keySuffix}`,
            createdAt: credential.createdAt,
          },
        }
      } catch (error) {
        if (error instanceof Error && error.message === '已存在同名凭证') {
          throw new TRPCError({ code: 'CONFLICT', message: error.message })
        }
        throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR', message: '添加凭证失败' })
      }
    }),

  // 删除凭证
  deleteCredential: protectedProcedure
    .input(z.object({ id: z.string() }))
    .mutation(async ({ input, ctx }) => {
      const userId = new mongoose.Types.ObjectId(ctx.user.id)
      const credentialId = new mongoose.Types.ObjectId(input.id)

      const deleted = await UserCredential.deleteCredential(credentialId, userId)

      if (!deleted) {
        throw new TRPCError({ code: 'NOT_FOUND', message: '凭证不存在' })
      }

      return { success: true }
    }),

  // 获取解密后的凭证 (用于项目开发时)
  getCredentialKey: protectedProcedure
    .input(z.object({ id: z.string() }))
    .query(async ({ input, ctx }) => {
      const userId = new mongoose.Types.ObjectId(ctx.user.id)
      const credentialId = new mongoose.Types.ObjectId(input.id)

      const key = await UserCredential.getDecryptedKey(credentialId, userId)

      if (!key) {
        throw new TRPCError({ code: 'NOT_FOUND', message: '凭证不存在或解密失败' })
      }

      // 更新最后使用时间
      await UserCredential.updateLastUsed(credentialId)

      return { key }
    }),
})
