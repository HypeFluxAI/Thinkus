import { z } from 'zod'
import { router, protectedProcedure } from '../trpc'
import { Notification } from '@/lib/db/models'
import { TRPCError } from '@trpc/server'
import mongoose from 'mongoose'

export const notificationRouter = router({
  // 获取通知列表
  list: protectedProcedure
    .input(
      z.object({
        unreadOnly: z.boolean().optional(),
        limit: z.number().min(1).max(50).optional(),
        skip: z.number().min(0).optional(),
        type: z.enum([
          'decision_pending',
          'decision_executed',
          'discussion_concluded',
          'deliverable_ready',
          'phase_changed',
          'daily_summary',
          'invitation_received',
          'system_alert',
        ]).optional(),
      }).optional()
    )
    .query(async ({ ctx, input }) => {
      const userId = new mongoose.Types.ObjectId(ctx.user.id)
      const result = await Notification.getUserNotifications(userId, input || {})

      return {
        notifications: result.notifications.map(n => ({
          id: n._id.toString(),
          type: n.type,
          title: n.title,
          body: n.body,
          relatedTo: n.relatedTo
            ? {
                type: n.relatedTo.type,
                id: n.relatedTo.id.toString(),
              }
            : undefined,
          actions: n.actions,
          read: n.read,
          readAt: n.readAt,
          priority: n.priority,
          createdAt: n.createdAt,
        })),
        total: result.total,
        unreadCount: result.unreadCount,
      }
    }),

  // 获取未读数量
  unreadCount: protectedProcedure.query(async ({ ctx }) => {
    const userId = new mongoose.Types.ObjectId(ctx.user.id)
    const count = await Notification.getUnreadCount(userId)
    return { count }
  }),

  // 标记单个为已读
  markAsRead: protectedProcedure
    .input(z.object({ notificationId: z.string() }))
    .mutation(async ({ ctx, input }) => {
      const userId = new mongoose.Types.ObjectId(ctx.user.id)
      const notificationId = new mongoose.Types.ObjectId(input.notificationId)

      const notification = await Notification.markAsRead(notificationId, userId)

      if (!notification) {
        throw new TRPCError({
          code: 'NOT_FOUND',
          message: '通知不存在',
        })
      }

      return { success: true }
    }),

  // 标记所有为已读
  markAllAsRead: protectedProcedure.mutation(async ({ ctx }) => {
    const userId = new mongoose.Types.ObjectId(ctx.user.id)
    const count = await Notification.markAllAsRead(userId)
    return { success: true, count }
  }),

  // 删除通知
  delete: protectedProcedure
    .input(z.object({ notificationId: z.string() }))
    .mutation(async ({ ctx, input }) => {
      const userId = new mongoose.Types.ObjectId(ctx.user.id)
      const notificationId = new mongoose.Types.ObjectId(input.notificationId)

      const result = await Notification.deleteOne({ _id: notificationId, userId })

      if (result.deletedCount === 0) {
        throw new TRPCError({
          code: 'NOT_FOUND',
          message: '通知不存在',
        })
      }

      return { success: true }
    }),
})
