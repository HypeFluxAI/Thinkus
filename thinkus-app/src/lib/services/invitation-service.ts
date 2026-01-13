import mongoose from 'mongoose'
import Anthropic from '@anthropic-ai/sdk'
import { InvitationCode, Waitlist, User, type IInvitationCode, type InvitationCodeTier } from '@/lib/db/models'
import { getHaikuModel } from '@/lib/ai/model-router'

/**
 * 排队统计信息
 */
export interface QueueStats {
  totalWaiting: number           // 总排队人数
  todayReleased: number          // 今日已释放名额
  dailyQuota: number             // 每日名额
  remainingToday: number         // 今日剩余名额
  estimatedWaitDays: number      // 预计等待天数
  userPosition?: number          // 用户当前位置 (如果有)
  userAheadCount?: number        // 用户前面还有多少人
}

/**
 * 贡献类型
 */
export type ContributionType =
  | 'bug_report'          // Bug 反馈
  | 'case_featured'       // 案例被官方展示
  | 'template_popular'    // 模板被广泛使用
  | 'referral_paid'       // 推荐用户付费
  | 'content_creation'    // 内容创作
  | 'community_help'      // 社区帮助

/**
 * 贡献奖励配置
 */
const CONTRIBUTION_REWARDS: Record<ContributionType, {
  tier: InvitationCodeTier
  count: number
  description: string
}> = {
  bug_report: {
    tier: 'common',
    count: 1,
    description: '提交有价值的Bug反馈',
  },
  case_featured: {
    tier: 'rare',
    count: 1,
    description: '产品案例被官方展示',
  },
  template_popular: {
    tier: 'rare',
    count: 1,
    description: '创建的公开模板被使用100次',
  },
  referral_paid: {
    tier: 'common',
    count: 1,
    description: '推荐的用户完成付费',
  },
  content_creation: {
    tier: 'common',
    count: 1,
    description: '创作优质内容',
  },
  community_help: {
    tier: 'common',
    count: 1,
    description: '帮助社区成员解决问题',
  },
}

/**
 * 限时活动配置
 */
interface LimitedTimeEvent {
  id: string
  name: string
  description: string
  scheduleType: 'weekly' | 'monthly' | 'special'
  dayOfWeek?: number             // 0-6 for weekly
  dayOfMonth?: number            // 1-31 for monthly
  startHour: number              // 24h format
  durationMinutes: number
  bonusSlots: number
  isActive: boolean
}

// 默认活动配置
const DEFAULT_EVENTS: LimitedTimeEvent[] = [
  {
    id: 'creators_night',
    name: '创造者之夜',
    description: '每周三晚8点，额外释放100个名额',
    scheduleType: 'weekly',
    dayOfWeek: 3, // Wednesday
    startHour: 20, // 8 PM
    durationMinutes: 60,
    bonusSlots: 100,
    isActive: true,
  },
]

// 每日基础名额
const DAILY_QUOTA = 50

// Anthropic 客户端
const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
})

/**
 * Invitation Service
 * 极致邀请系统服务
 */
export class InvitationService {
  private events: LimitedTimeEvent[] = DEFAULT_EVENTS

  /**
   * 获取排队统计信息
   */
  async getQueueStats(email?: string): Promise<QueueStats> {
    const [totalWaiting, todayApproved] = await Promise.all([
      // 总排队人数
      Waitlist.countDocuments({
        'review.status': 'pending',
        converted: false,
      }),
      // 今日已批准
      Waitlist.countDocuments({
        'review.status': 'approved',
        'review.reviewedAt': {
          $gte: this.getTodayStart(),
          $lt: this.getTodayEnd(),
        },
      }),
    ])

    // 计算今日剩余名额 (考虑活动加成)
    const eventBonus = this.getActiveEventBonus()
    const dailyQuota = DAILY_QUOTA + eventBonus
    const remainingToday = Math.max(0, dailyQuota - todayApproved)

    // 计算预计等待天数
    const avgDailyRelease = DAILY_QUOTA * 0.9 // 假设90%利用率
    const estimatedWaitDays = Math.ceil(totalWaiting / avgDailyRelease)

    const stats: QueueStats = {
      totalWaiting,
      todayReleased: todayApproved,
      dailyQuota,
      remainingToday,
      estimatedWaitDays,
    }

    // 如果提供了邮箱，获取用户位置
    if (email) {
      const userWaitlist = await Waitlist.findOne({ email })
      if (userWaitlist && !userWaitlist.converted) {
        stats.userPosition = userWaitlist.queue.position
        stats.userAheadCount = await userWaitlist.getAheadCount()
      }
    }

    return stats
  }

  /**
   * AI 增强的申请评分
   */
  async evaluateApplication(application: {
    projectIdea: string
    role: string
    referralSource?: string
    socialLinks?: string[]
  }): Promise<{
    score: number
    breakdown: {
      ideaQuality: number
      roleValue: number
      socialPresence: number
      referralBonus: number
      industryRarity: number
    }
    feedback: string
  }> {
    try {
      // 基础分数
      let baseScore = 100

      // 1. 使用 AI 评估想法质量
      const ideaEvaluation = await this.evaluateIdeaQuality(application.projectIdea)

      // 2. 角色分数
      const roleScores: Record<string, number> = {
        founder: 30,
        pm: 25,
        developer: 25,
        student: 15,
        other: 10,
      }
      const roleValue = roleScores[application.role] || 10

      // 3. 社交资料完整度
      let socialPresence = 0
      if (application.socialLinks && application.socialLinks.length > 0) {
        socialPresence = Math.min(application.socialLinks.length * 10, 20)
      }

      // 4. 推荐人加成
      const referralBonus = application.referralSource ? 30 : 0

      // 5. 计算总分
      const totalScore = baseScore +
        ideaEvaluation.score +
        roleValue +
        socialPresence +
        referralBonus

      // 归一化到 0-100
      const normalizedScore = Math.min(100, Math.max(0, Math.round(totalScore / 2)))

      return {
        score: normalizedScore,
        breakdown: {
          ideaQuality: ideaEvaluation.score,
          roleValue,
          socialPresence,
          referralBonus,
          industryRarity: ideaEvaluation.industryRarity,
        },
        feedback: ideaEvaluation.feedback,
      }
    } catch (error) {
      console.error('Application evaluation failed:', error)

      // 降级到基础评分
      return {
        score: 50,
        breakdown: {
          ideaQuality: 20,
          roleValue: 20,
          socialPresence: 0,
          referralBonus: 0,
          industryRarity: 10,
        },
        feedback: '感谢您的申请！',
      }
    }
  }

  /**
   * 使用 AI 评估想法质量
   */
  private async evaluateIdeaQuality(projectIdea: string): Promise<{
    score: number
    industryRarity: number
    feedback: string
  }> {
    try {
      const response = await anthropic.messages.create({
        model: getHaikuModel(),
        max_tokens: 200,
        messages: [{
          role: 'user',
          content: `评估以下产品想法的质量，返回 JSON:

想法: "${projectIdea.slice(0, 500)}"

返回格式:
{
  "score": 10-50,
  "industryRarity": 10-30,
  "feedback": "一句话反馈"
}

评分标准:
- 10-20: 想法模糊，缺乏细节
- 20-35: 有基本方向，但不够具体
- 35-50: 清晰、具体、有潜力

行业稀缺度:
- 10: 常见领域 (电商、内容)
- 20: 中等 (教育、工具)
- 30: 稀缺 (医疗、金融)

只返回 JSON。`,
        }],
      })

      const textBlock = response.content.find(block => block.type === 'text')
      if (!textBlock || textBlock.type !== 'text') {
        throw new Error('No text response')
      }

      const jsonMatch = textBlock.text.match(/\{[\s\S]*\}/)
      if (!jsonMatch) {
        throw new Error('No JSON found')
      }

      return JSON.parse(jsonMatch[0])
    } catch (error) {
      console.error('Idea evaluation failed:', error)
      return {
        score: 25,
        industryRarity: 15,
        feedback: '感谢您分享您的想法！',
      }
    }
  }

  /**
   * 贡献奖励：发放邀请码
   */
  async rewardContribution(
    userId: mongoose.Types.ObjectId,
    contributionType: ContributionType
  ): Promise<IInvitationCode[]> {
    const reward = CONTRIBUTION_REWARDS[contributionType]
    if (!reward) {
      throw new Error(`Unknown contribution type: ${contributionType}`)
    }

    const codes: IInvitationCode[] = []

    for (let i = 0; i < reward.count; i++) {
      const code = await InvitationCode.createUserInviteCode(userId, reward.tier)
      codes.push(code)
    }

    // TODO: 发送通知给用户

    return codes
  }

  /**
   * 获取用户的邀请码和奖励统计
   */
  async getUserInviteStats(userId: mongoose.Types.ObjectId): Promise<{
    totalCodes: number
    usedCodes: number
    availableCodes: number
    successfulReferrals: number
    earnedByContribution: number
    codes: IInvitationCode[]
  }> {
    const codes = await InvitationCode.getUserInviteCodes(userId)

    const usedCodes = codes.filter(c => c.status === 'used').length
    const availableCodes = codes.filter(
      c => c.status === 'active' && c.expiresAt > new Date()
    ).length

    // 统计成功推荐
    const successfulReferrals = await User.countDocuments({
      referredBy: userId,
    })

    return {
      totalCodes: codes.length,
      usedCodes,
      availableCodes,
      successfulReferrals,
      earnedByContribution: codes.length - usedCodes, // 简化计算
      codes,
    }
  }

  /**
   * 生成用户邀请码 (付费用户每月配额)
   */
  async generateUserInviteCode(
    userId: mongoose.Types.ObjectId,
    tier: InvitationCodeTier = 'common'
  ): Promise<IInvitationCode | null> {
    // 检查用户是否有资格 (付费用户)
    const user = await User.findById(userId)
    if (!user) {
      throw new Error('User not found')
    }

    // 检查本月是否已生成
    const thisMonth = new Date()
    thisMonth.setDate(1)
    thisMonth.setHours(0, 0, 0, 0)

    const monthlyCount = await InvitationCode.countDocuments({
      createdBy: userId,
      type: 'user_invite',
      createdAt: { $gte: thisMonth },
    })

    // 付费用户每月限额
    const monthlyLimit = 1 // 可以根据订阅等级调整

    if (monthlyCount >= monthlyLimit) {
      throw new Error('Monthly invitation code limit reached')
    }

    return InvitationCode.createUserInviteCode(userId, tier)
  }

  /**
   * 获取当前活动状态
   */
  getActiveEvent(): LimitedTimeEvent | null {
    const now = new Date()
    const currentDay = now.getDay()
    const currentHour = now.getHours()
    const currentMinute = now.getMinutes()

    for (const event of this.events) {
      if (!event.isActive) continue

      if (event.scheduleType === 'weekly' && event.dayOfWeek !== undefined) {
        if (currentDay !== event.dayOfWeek) continue

        const eventStart = event.startHour * 60
        const eventEnd = eventStart + event.durationMinutes
        const currentTime = currentHour * 60 + currentMinute

        if (currentTime >= eventStart && currentTime < eventEnd) {
          return event
        }
      }
    }

    return null
  }

  /**
   * 获取当前活动加成名额
   */
  getActiveEventBonus(): number {
    const activeEvent = this.getActiveEvent()
    return activeEvent?.bonusSlots || 0
  }

  /**
   * 获取下一个活动时间
   */
  getNextEventTime(): {
    event: LimitedTimeEvent
    startTime: Date
    remainingSeconds: number
  } | null {
    const now = new Date()

    for (const event of this.events) {
      if (!event.isActive) continue

      if (event.scheduleType === 'weekly' && event.dayOfWeek !== undefined) {
        const nextDate = new Date(now)
        const daysUntil = (event.dayOfWeek - now.getDay() + 7) % 7 || 7

        // 如果今天就是活动日，检查时间是否已过
        if (daysUntil === 7 || daysUntil === 0) {
          const eventTime = event.startHour * 60
          const currentTime = now.getHours() * 60 + now.getMinutes()

          if (currentTime >= eventTime + event.durationMinutes) {
            // 活动已结束，计算下周
            nextDate.setDate(now.getDate() + 7)
          } else if (currentTime < eventTime) {
            // 活动还没开始
            nextDate.setDate(now.getDate())
          } else {
            // 活动进行中
            return null
          }
        } else {
          nextDate.setDate(now.getDate() + daysUntil)
        }

        nextDate.setHours(event.startHour, 0, 0, 0)

        const remainingSeconds = Math.floor((nextDate.getTime() - now.getTime()) / 1000)

        return {
          event,
          startTime: nextDate,
          remainingSeconds,
        }
      }
    }

    return null
  }

  /**
   * 批量释放名额 (按分数排序)
   */
  async releaseSlots(count: number): Promise<{
    released: number
    emails: string[]
  }> {
    // 获取分数最高的待审批申请
    const { list } = await Waitlist.getQueueList({
      status: 'pending',
      limit: count,
    })

    const emails: string[] = []

    for (const applicant of list) {
      try {
        // 生成邀请码
        const invitation = await InvitationCode.createWaitlistCode(
          applicant.email,
          applicant.queue.score >= 80 ? 'rare' : 'common'
        )

        // 更新申请状态
        await Waitlist.approveApplication(
          applicant.email,
          invitation.code,
          'system'
        )

        emails.push(applicant.email)

        // TODO: 发送邮件通知
      } catch (error) {
        console.error(`Failed to release slot for ${applicant.email}:`, error)
      }
    }

    return {
      released: emails.length,
      emails,
    }
  }

  // ============ 私有方法 ============

  private getTodayStart(): Date {
    const today = new Date()
    today.setHours(0, 0, 0, 0)
    return today
  }

  private getTodayEnd(): Date {
    const today = new Date()
    today.setHours(23, 59, 59, 999)
    return today
  }
}

// 导出单例
export const invitationService = new InvitationService()
