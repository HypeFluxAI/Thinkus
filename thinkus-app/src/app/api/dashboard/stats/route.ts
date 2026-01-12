import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import mongoose from 'mongoose'
import { authOptions } from '@/lib/auth/options'
import {
  Project,
  Discussion,
  Decision,
  ActionItem,
  Subscription,
  UserExecutive,
} from '@/lib/db/models'
import dbConnect from '@/lib/db/connection'

// GET /api/dashboard/stats - 获取仪表盘统计数据
export async function GET() {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    await dbConnect()
    const userId = new mongoose.Types.ObjectId(session.user.id)

    // 并行获取所有统计数据
    const [
      projectStats,
      discussionStats,
      decisionStats,
      actionItemStats,
      subscriptionData,
      executiveStats,
      recentProjects,
      recentDiscussions,
      overdueItems,
      upcomingItems,
    ] = await Promise.all([
      // 项目统计
      getProjectStats(userId),
      // 讨论统计
      getDiscussionStats(userId),
      // 决策统计
      getDecisionStats(userId),
      // 行动项统计
      getActionItemStats(userId),
      // 订阅信息
      Subscription.getOrCreateSubscription(userId),
      // 高管使用统计
      getExecutiveStats(userId),
      // 最近项目
      Project.find({ userId })
        .sort({ updatedAt: -1 })
        .limit(5)
        .select('name icon phase status updatedAt')
        .lean(),
      // 最近讨论
      Discussion.find({ userId })
        .sort({ updatedAt: -1 })
        .limit(5)
        .select('topic status participants concludedAt createdAt')
        .populate('projectId', 'name')
        .lean(),
      // 逾期行动项
      ActionItem.find({
        userId,
        status: { $in: ['pending', 'in_progress'] },
        dueDate: { $lt: new Date() },
      })
        .sort({ dueDate: 1 })
        .limit(5)
        .populate('projectId', 'name')
        .lean(),
      // 即将到期的行动项
      ActionItem.find({
        userId,
        status: { $in: ['pending', 'in_progress'] },
        dueDate: {
          $gte: new Date(),
          $lte: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 未来7天
        },
      })
        .sort({ dueDate: 1 })
        .limit(5)
        .populate('projectId', 'name')
        .lean(),
    ])

    return NextResponse.json({
      stats: {
        projects: projectStats,
        discussions: discussionStats,
        decisions: decisionStats,
        actionItems: actionItemStats,
        executives: executiveStats,
      },
      subscription: {
        plan: subscriptionData.plan,
        status: subscriptionData.status,
        usage: subscriptionData.usage,
        currentPeriodEnd: subscriptionData.currentPeriodEnd,
      },
      recent: {
        projects: recentProjects.map((p) => ({
          id: p._id.toString(),
          name: p.name,
          icon: p.icon,
          phase: p.phase,
          status: p.status,
          updatedAt: p.updatedAt,
        })),
        discussions: recentDiscussions.map((d) => ({
          id: d._id.toString(),
          topic: d.topic,
          status: d.status,
          participantCount: d.participants?.length || 0,
          projectName: (d.projectId as { name?: string })?.name,
          createdAt: d.createdAt,
        })),
      },
      actionItems: {
        overdue: overdueItems.map((item) => ({
          id: item._id.toString(),
          title: item.title,
          priority: item.priority,
          dueDate: item.dueDate,
          projectName: (item.projectId as { name?: string })?.name,
        })),
        upcoming: upcomingItems.map((item) => ({
          id: item._id.toString(),
          title: item.title,
          priority: item.priority,
          dueDate: item.dueDate,
          projectName: (item.projectId as { name?: string })?.name,
        })),
      },
    })
  } catch (error) {
    console.error('Get dashboard stats error:', error)
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 })
  }
}

// 获取项目统计
async function getProjectStats(userId: mongoose.Types.ObjectId) {
  const [total, byPhase, byStatus] = await Promise.all([
    Project.countDocuments({ userId }),
    Project.aggregate([
      { $match: { userId } },
      { $group: { _id: '$phase', count: { $sum: 1 } } },
    ]),
    Project.aggregate([
      { $match: { userId } },
      { $group: { _id: '$status', count: { $sum: 1 } } },
    ]),
  ])

  const phaseMap: Record<string, number> = {}
  for (const item of byPhase) {
    phaseMap[item._id] = item.count
  }

  const statusMap: Record<string, number> = {}
  for (const item of byStatus) {
    statusMap[item._id] = item.count
  }

  return {
    total,
    byPhase: phaseMap,
    byStatus: statusMap,
    active: statusMap['active'] || 0,
    completed: statusMap['completed'] || 0,
  }
}

// 获取讨论统计
async function getDiscussionStats(userId: mongoose.Types.ObjectId) {
  const now = new Date()
  const thisMonth = new Date(now.getFullYear(), now.getMonth(), 1)
  const lastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1)

  const [total, thisMonthCount, lastMonthCount, byStatus] = await Promise.all([
    Discussion.countDocuments({ userId }),
    Discussion.countDocuments({ userId, createdAt: { $gte: thisMonth } }),
    Discussion.countDocuments({
      userId,
      createdAt: { $gte: lastMonth, $lt: thisMonth },
    }),
    Discussion.aggregate([
      { $match: { userId } },
      { $group: { _id: '$status', count: { $sum: 1 } } },
    ]),
  ])

  const statusMap: Record<string, number> = {}
  for (const item of byStatus) {
    statusMap[item._id] = item.count
  }

  return {
    total,
    thisMonth: thisMonthCount,
    lastMonth: lastMonthCount,
    trend: lastMonthCount > 0 ? ((thisMonthCount - lastMonthCount) / lastMonthCount) * 100 : 0,
    concluded: statusMap['concluded'] || 0,
    active: statusMap['active'] || 0,
  }
}

// 获取决策统计
async function getDecisionStats(userId: mongoose.Types.ObjectId) {
  const [total, byStatus, byType, byImportance] = await Promise.all([
    Decision.countDocuments({ userId }),
    Decision.aggregate([
      { $match: { userId } },
      { $group: { _id: '$status', count: { $sum: 1 } } },
    ]),
    Decision.aggregate([
      { $match: { userId } },
      { $group: { _id: '$type', count: { $sum: 1 } } },
    ]),
    Decision.aggregate([
      { $match: { userId } },
      { $group: { _id: '$importance', count: { $sum: 1 } } },
    ]),
  ])

  const statusMap: Record<string, number> = {}
  for (const item of byStatus) {
    statusMap[item._id] = item.count
  }

  const typeMap: Record<string, number> = {}
  for (const item of byType) {
    typeMap[item._id] = item.count
  }

  const importanceMap: Record<string, number> = {}
  for (const item of byImportance) {
    importanceMap[item._id] = item.count
  }

  return {
    total,
    byStatus: statusMap,
    byType: typeMap,
    byImportance: importanceMap,
    implemented: statusMap['implemented'] || 0,
    approved: statusMap['approved'] || 0,
  }
}

// 获取行动项统计
async function getActionItemStats(userId: mongoose.Types.ObjectId) {
  const now = new Date()

  const [total, byStatus, byPriority, overdue, completedThisWeek] = await Promise.all([
    ActionItem.countDocuments({ userId }),
    ActionItem.aggregate([
      { $match: { userId } },
      { $group: { _id: '$status', count: { $sum: 1 } } },
    ]),
    ActionItem.aggregate([
      { $match: { userId } },
      { $group: { _id: '$priority', count: { $sum: 1 } } },
    ]),
    ActionItem.countDocuments({
      userId,
      status: { $in: ['pending', 'in_progress'] },
      dueDate: { $lt: now },
    }),
    ActionItem.countDocuments({
      userId,
      status: 'completed',
      completedAt: { $gte: new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000) },
    }),
  ])

  const statusMap: Record<string, number> = {}
  for (const item of byStatus) {
    statusMap[item._id] = item.count
  }

  const priorityMap: Record<string, number> = {}
  for (const item of byPriority) {
    priorityMap[item._id] = item.count
  }

  const completed = statusMap['completed'] || 0
  const completionRate = total > 0 ? (completed / total) * 100 : 0

  return {
    total,
    byStatus: statusMap,
    byPriority: priorityMap,
    pending: statusMap['pending'] || 0,
    inProgress: statusMap['in_progress'] || 0,
    completed,
    blocked: statusMap['blocked'] || 0,
    overdue,
    completedThisWeek,
    completionRate: Math.round(completionRate),
  }
}

// 获取高管使用统计
async function getExecutiveStats(userId: mongoose.Types.ObjectId) {
  const executives = await UserExecutive.find({ userId })
    .select('agentId usageStats')
    .lean()

  const totalMessages = executives.reduce(
    (sum, exec) => sum + (exec.usageStats?.totalMessages || 0),
    0
  )
  const totalDiscussions = executives.reduce(
    (sum, exec) => sum + (exec.usageStats?.totalDiscussions || 0),
    0
  )

  // 找出最活跃的高管
  const mostActive = executives
    .sort((a, b) => (b.usageStats?.totalMessages || 0) - (a.usageStats?.totalMessages || 0))
    .slice(0, 3)
    .map((exec) => ({
      agentId: exec.agentId,
      messages: exec.usageStats?.totalMessages || 0,
      discussions: exec.usageStats?.totalDiscussions || 0,
    }))

  return {
    activeCount: executives.filter((e) => (e.usageStats?.totalMessages || 0) > 0).length,
    totalMessages,
    totalDiscussions,
    mostActive,
  }
}
