import Anthropic from '@anthropic-ai/sdk'
import { Standup, Project, Discussion, ActionItem, Notification } from '@/lib/db/models'
import { EXECUTIVES, getExecutive, type AgentId } from '@/lib/config/executives'
import type { IStandup, ParticipantReport } from '@/lib/db/models/standup'

const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
})

/**
 * 开始例会
 */
export async function startStandup(standupId: string): Promise<IStandup> {
  const standup = await Standup.findById(standupId)
  if (!standup) {
    throw new Error('Standup not found')
  }

  if (standup.status !== 'scheduled') {
    throw new Error('Standup is not in scheduled state')
  }

  // 更新状态
  standup.status = 'in_progress'
  standup.startedAt = new Date()
  await standup.save()

  return standup
}

/**
 * 生成参会者汇报
 */
export async function generateParticipantReports(
  standupId: string
): Promise<ParticipantReport[]> {
  const standup = await Standup.findById(standupId).populate('projectId')
  if (!standup) {
    throw new Error('Standup not found')
  }

  const project = standup.projectId as any

  // 获取项目最近的活动
  const recentActions = await ActionItem.find({
    projectId: standup.projectId,
    updatedAt: { $gte: new Date(Date.now() - 24 * 60 * 60 * 1000) },
  }).limit(20)

  const recentDiscussions = await Discussion.find({
    projectId: standup.projectId,
    updatedAt: { $gte: new Date(Date.now() - 24 * 60 * 60 * 1000) },
  }).limit(10)

  const reports: ParticipantReport[] = []

  // 为每个参会者生成汇报
  for (const agentId of standup.participants) {
    const executive = getExecutive(agentId)
    if (!executive) continue

    // 该高管相关的行动项
    const agentActions = recentActions.filter(
      (a) => a.assignee === agentId || a.assignedBy === agentId
    )

    const report = await generateAgentReport({
      agentId,
      executive,
      project,
      recentActions: agentActions,
      recentDiscussions,
      standupType: standup.type,
    })

    reports.push(report)
  }

  // 保存汇报
  standup.reports = reports
  await standup.save()

  return reports
}

/**
 * 生成单个高管的汇报
 */
async function generateAgentReport(params: {
  agentId: AgentId
  executive: typeof EXECUTIVES[AgentId]
  project: any
  recentActions: any[]
  recentDiscussions: any[]
  standupType: string
}): Promise<ParticipantReport> {
  const { agentId, executive, project, recentActions, recentDiscussions, standupType } = params

  const actionsText = recentActions
    .map((a) => `- [${a.status}] ${a.title}`)
    .join('\n')

  const discussionsText = recentDiscussions
    .map((d) => `- ${d.topic}: ${d.summary || '进行中'}`)
    .join('\n')

  const response = await anthropic.messages.create({
    model: 'claude-sonnet-4-20250514',
    max_tokens: 1000,
    messages: [
      {
        role: 'user',
        content: `你是${executive.nameCn}（${executive.titleCn}），正在参加项目"${project.name}"的${standupType === 'daily' ? '每日' : standupType === 'weekly' ? '每周' : ''}例会。

你的专业领域：${executive.expertise.join('、')}

最近的行动项：
${actionsText || '暂无'}

最近的讨论：
${discussionsText || '暂无'}

请生成你的例会汇报，包括：
1. yesterday: 昨天/上周完成的工作（50-100字）
2. today: 今天/本周计划的工作（50-100字）
3. blockers: 遇到的阻碍问题（数组，每项简短描述）
4. highlights: 值得分享的亮点或成就（数组）
5. concerns: 需要关注的问题或风险（数组）

返回JSON格式：
\`\`\`json
{
  "yesterday": "...",
  "today": "...",
  "blockers": ["..."],
  "highlights": ["..."],
  "concerns": ["..."]
}
\`\`\``,
      },
    ],
  })

  const content = response.content[0].type === 'text' ? response.content[0].text : ''
  const jsonMatch = content.match(/```json\s*([\s\S]*?)\s*```/)

  if (jsonMatch) {
    try {
      const data = JSON.parse(jsonMatch[1])
      return {
        agentId,
        yesterday: data.yesterday,
        today: data.today,
        blockers: data.blockers || [],
        highlights: data.highlights || [],
        concerns: data.concerns || [],
      }
    } catch {
      // 解析失败，返回空汇报
    }
  }

  return {
    agentId,
    yesterday: '暂无更新',
    today: '继续推进当前工作',
    blockers: [],
    highlights: [],
    concerns: [],
  }
}

/**
 * 生成例会纪要
 */
export async function generateStandupMinutes(
  standupId: string
): Promise<IStandup['minutes']> {
  const standup = await Standup.findById(standupId).populate('projectId')
  if (!standup) {
    throw new Error('Standup not found')
  }

  const project = standup.projectId as any

  // 构建汇报内容
  const reportsText = standup.reports
    .map((r) => {
      const exec = getExecutive(r.agentId)
      return `## ${exec?.nameCn || r.agentId} (${exec?.titleCn || ''})
昨日工作：${r.yesterday || '无'}
今日计划：${r.today || '无'}
阻碍问题：${r.blockers?.join('、') || '无'}
亮点：${r.highlights?.join('、') || '无'}
关注点：${r.concerns?.join('、') || '无'}`
    })
    .join('\n\n')

  // 议程内容
  const agendaText = standup.agenda
    .map((a) => {
      const exec = getExecutive(a.presenter)
      return `- ${a.topic} (${exec?.nameCn || a.presenter}): ${a.notes || '待讨论'}`
    })
    .join('\n')

  const response = await anthropic.messages.create({
    model: 'claude-sonnet-4-20250514',
    max_tokens: 2000,
    messages: [
      {
        role: 'user',
        content: `请根据以下例会内容生成会议纪要。

项目：${project.name}
例会类型：${standup.type === 'daily' ? '每日例会' : standup.type === 'weekly' ? '周例会' : '例会'}
参会人员：${standup.participants.map((p) => getExecutive(p)?.nameCn || p).join('、')}

## 议程
${agendaText || '常规汇报'}

## 各成员汇报
${reportsText}

请生成结构化的会议纪要，包括：
1. summary: 会议总结（100-200字，概述主要内容和结论）
2. keyDecisions: 关键决策（数组，每项简洁描述）
3. actionItems: 行动项（数组，每项包含task, assignee, priority）
4. nextSteps: 下一步计划（数组）

返回JSON格式：
\`\`\`json
{
  "summary": "...",
  "keyDecisions": ["..."],
  "actionItems": [
    {"task": "...", "assignee": "agentId", "priority": "high/medium/low"}
  ],
  "nextSteps": ["..."]
}
\`\`\``,
      },
    ],
  })

  const content = response.content[0].type === 'text' ? response.content[0].text : ''
  const jsonMatch = content.match(/```json\s*([\s\S]*?)\s*```/)

  if (jsonMatch) {
    try {
      const data = JSON.parse(jsonMatch[1])
      return {
        summary: data.summary,
        keyDecisions: data.keyDecisions || [],
        actionItems: (data.actionItems || []).map((item: any) => ({
          task: item.task,
          assignee: item.assignee,
          priority: item.priority || 'medium',
          dueDate: item.dueDate ? new Date(item.dueDate) : undefined,
        })),
        nextSteps: data.nextSteps || [],
        generatedAt: new Date(),
      }
    } catch {
      // 解析失败
    }
  }

  return {
    summary: '例会已完成，详情请查看各成员汇报。',
    keyDecisions: [],
    actionItems: [],
    nextSteps: [],
    generatedAt: new Date(),
  }
}

/**
 * 完成例会并生成纪要
 */
export async function completeStandup(standupId: string): Promise<IStandup> {
  // 生成纪要
  const minutes = await generateStandupMinutes(standupId)

  // 完成例会
  const standup = await Standup.completeStandup(
    standupId as any,
    minutes
  )

  if (!standup) {
    throw new Error('Failed to complete standup')
  }

  // 创建行动项
  if (minutes?.actionItems && minutes.actionItems.length > 0) {
    await Promise.all(
      minutes.actionItems.map((item) =>
        ActionItem.create({
          userId: standup.userId,
          projectId: standup.projectId,
          title: item.task,
          description: `来自例会: ${standup.title}`,
          status: 'pending',
          priority: item.priority,
          assignee: item.assignee,
          assignedBy: 'system',
          dueDate: item.dueDate,
          category: 'meeting',
        })
      )
    )
  }

  // 发送通知
  await Notification.create({
    userId: standup.userId,
    type: 'discussion_concluded',
    title: '例会已完成',
    body: `${standup.title} 的会议纪要已生成`,
    priority: 'normal',
    channels: ['app'],
    relatedTo: {
      type: 'discussion',
      id: standup._id,
    },
  })

  return standup
}

/**
 * 自动安排每日例会
 */
export async function scheduleAutoDailyStandup(
  userId: string,
  projectId: string
): Promise<IStandup> {
  const project = await Project.findById(projectId)
  if (!project) {
    throw new Error('Project not found')
  }

  // 确定参会高管（根据项目阶段）
  const participants = getStandupParticipants(project.phase)

  // 设置明天早上9点
  const tomorrow = new Date()
  tomorrow.setDate(tomorrow.getDate() + 1)
  tomorrow.setHours(9, 0, 0, 0)

  return Standup.scheduleStandup({
    userId: userId as any,
    projectId: projectId as any,
    type: 'daily',
    title: `${project.name} - 每日例会`,
    scheduledAt: tomorrow,
    participants,
    isAutoGenerated: true,
    cronExpression: '0 9 * * 1-5', // 周一到周五早上9点
  })
}

/**
 * 根据项目阶段确定参会高管
 */
function getStandupParticipants(phase: string): AgentId[] {
  const phaseParticipants: Record<string, AgentId[]> = {
    ideation: ['mike', 'elena', 'nathan'],
    planning: ['mike', 'elena', 'david', 'frank'],
    design: ['elena', 'chloe', 'rachel', 'mike'],
    development: ['david', 'james', 'kevin', 'mike'],
    testing: ['james', 'david', 'nina'],
    launch: ['lisa', 'marcus', 'kevin', 'mike'],
    growth: ['lisa', 'marcus', 'sarah', 'nina'],
    maintenance: ['david', 'kevin', 'oscar', 'nina'],
  }

  return phaseParticipants[phase] || ['mike', 'david', 'lisa']
}

/**
 * 执行到期的自动例会
 */
export async function runScheduledStandups(): Promise<{
  processed: number
  completed: number
}> {
  // 获取到期的例会
  const dueStandups = await Standup.find({
    status: 'scheduled',
    isAutoGenerated: true,
    scheduledAt: { $lte: new Date() },
  }).limit(10)

  let processed = 0
  let completed = 0

  for (const standup of dueStandups) {
    try {
      // 开始例会
      await startStandup(standup._id.toString())

      // 生成汇报
      await generateParticipantReports(standup._id.toString())

      // 完成例会
      await completeStandup(standup._id.toString())

      processed++
      completed++

      // 如果是每日例会，安排下一次
      if (standup.type === 'daily' && standup.cronExpression) {
        await scheduleAutoDailyStandup(
          standup.userId.toString(),
          (standup.projectId as any).toString()
        )
      }
    } catch (error) {
      console.error(`Failed to run standup ${standup._id}:`, error)
      processed++
    }
  }

  return { processed, completed }
}
