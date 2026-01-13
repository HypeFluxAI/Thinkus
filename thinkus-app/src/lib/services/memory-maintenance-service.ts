import Anthropic from '@anthropic-ai/sdk'
import { Memory } from '@/lib/db/models'
import type { IMemory, MemoryType, MemoryLayer } from '@/lib/db/models/memory'

const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
})

/**
 * 记忆老化配置
 */
interface AgingConfig {
  // 多少天后开始老化
  agingStartDays: number
  // 每次老化降低的重要性
  agingDecrement: number
  // 最低重要性（不会降到此值以下）
  minImportance: number
  // 访问可提升的重要性
  accessBoost: number
  // 最高重要性
  maxImportance: number
}

const DEFAULT_AGING_CONFIG: AgingConfig = {
  agingStartDays: 30,
  agingDecrement: 1,
  minImportance: 1,
  accessBoost: 0.5,
  maxImportance: 10,
}

/**
 * 记忆清理配置
 */
interface CleanupConfig {
  // 低于此重要性且超过此天数未访问的记忆将被清理
  cleanupImportanceThreshold: number
  cleanupInactiveDays: number
  // 每次最多清理数量
  maxCleanupCount: number
}

const DEFAULT_CLEANUP_CONFIG: CleanupConfig = {
  cleanupImportanceThreshold: 2,
  cleanupInactiveDays: 90,
  maxCleanupCount: 100,
}

/**
 * 执行记忆老化
 * 对长时间未访问的记忆降低重要性
 */
export async function ageMemories(
  userId?: string,
  config: Partial<AgingConfig> = {}
): Promise<{
  processed: number
  aged: number
}> {
  const cfg = { ...DEFAULT_AGING_CONFIG, ...config }

  const agingDate = new Date()
  agingDate.setDate(agingDate.getDate() - cfg.agingStartDays)

  // 查找需要老化的记忆
  const query: Record<string, unknown> = {
    importance: { $gt: cfg.minImportance },
    $or: [
      { lastAccessedAt: { $lt: agingDate } },
      { lastAccessedAt: { $exists: false }, createdAt: { $lt: agingDate } },
    ],
  }

  if (userId) {
    query.userId = userId
  }

  const memories = await Memory.find(query).limit(500)

  let processed = 0
  let aged = 0

  for (const memory of memories) {
    try {
      const newImportance = Math.max(
        cfg.minImportance,
        memory.importance - cfg.agingDecrement
      )

      if (newImportance < memory.importance) {
        await Memory.findByIdAndUpdate(memory._id, {
          $set: { importance: newImportance },
        })
        aged++
      }

      processed++
    } catch (error) {
      console.error(`Failed to age memory ${memory._id}:`, error)
      processed++
    }
  }

  return { processed, aged }
}

/**
 * 当记忆被访问时，提升其重要性
 */
export async function boostMemoryImportance(
  vectorId: string,
  config: Partial<AgingConfig> = {}
): Promise<void> {
  const cfg = { ...DEFAULT_AGING_CONFIG, ...config }

  await Memory.findOneAndUpdate(
    { vectorId },
    {
      $inc: { accessCount: 1, importance: cfg.accessBoost },
      $set: { lastAccessedAt: new Date() },
      $max: { importance: cfg.maxImportance },
    }
  )
}

/**
 * 清理过期和低价值记忆
 */
export async function cleanupMemories(
  userId?: string,
  config: Partial<CleanupConfig> = {}
): Promise<{
  deleted: number
  vectorIds: string[]
}> {
  const cfg = { ...DEFAULT_CLEANUP_CONFIG, ...config }

  const inactiveDate = new Date()
  inactiveDate.setDate(inactiveDate.getDate() - cfg.cleanupInactiveDays)

  // 查找需要清理的记忆
  const query: Record<string, unknown> = {
    importance: { $lte: cfg.cleanupImportanceThreshold },
    $or: [
      { lastAccessedAt: { $lt: inactiveDate } },
      { lastAccessedAt: { $exists: false }, createdAt: { $lt: inactiveDate } },
    ],
    // 排除用户偏好类型，这些应该保留更久
    type: { $ne: 'user_preference' },
  }

  if (userId) {
    query.userId = userId
  }

  const memories = await Memory.find(query)
    .select('_id vectorId')
    .limit(cfg.maxCleanupCount)
    .lean()

  const vectorIds = memories.map(m => m.vectorId)

  if (memories.length > 0) {
    await Memory.deleteMany({
      _id: { $in: memories.map(m => m._id) },
    })

    // 注意：还需要从 Pinecone 中删除对应的向量
    // 这应该在调用此函数后单独处理
  }

  return {
    deleted: memories.length,
    vectorIds,
  }
}

/**
 * 合并相似记忆
 * 使用 AI 分析并合并内容相似的记忆
 */
export async function consolidateMemories(
  userId: string,
  projectId?: string
): Promise<{
  analyzed: number
  merged: number
}> {
  const query: Record<string, unknown> = {
    userId,
    importance: { $lt: 5 }, // 只合并低重要性记忆
  }

  if (projectId) {
    query.projectId = projectId
  }

  // 获取候选记忆
  const memories = await Memory.find(query)
    .sort({ createdAt: -1 })
    .limit(50)
    .lean()

  if (memories.length < 2) {
    return { analyzed: 0, merged: 0 }
  }

  // 按类型分组
  const byType: Record<string, IMemory[]> = {}
  for (const memory of memories) {
    if (!byType[memory.type]) {
      byType[memory.type] = []
    }
    byType[memory.type].push(memory as IMemory)
  }

  let analyzed = 0
  let merged = 0

  // 对每种类型的记忆进行合并分析
  for (const [type, typeMemories] of Object.entries(byType)) {
    if (typeMemories.length < 2) continue

    try {
      const result = await analyzeAndMergeMemories(typeMemories)
      analyzed += typeMemories.length

      if (result.mergedMemories.length > 0) {
        // 删除被合并的记忆
        for (const group of result.mergedMemories) {
          if (group.sourceIds.length > 1) {
            // 保留第一个，删除其他
            const [keep, ...remove] = group.sourceIds
            await Memory.deleteMany({
              _id: { $in: remove },
            })

            // 更新保留的记忆内容
            await Memory.findByIdAndUpdate(keep, {
              $set: {
                content: group.mergedContent,
                summary: group.summary,
                importance: Math.max(...typeMemories
                  .filter(m => group.sourceIds.includes(m._id.toString()))
                  .map(m => m.importance)),
              },
            })

            merged += group.sourceIds.length - 1
          }
        }
      }
    } catch (error) {
      console.error(`Failed to consolidate memories of type ${type}:`, error)
    }
  }

  return { analyzed, merged }
}

/**
 * 使用 AI 分析并合并相似记忆
 */
async function analyzeAndMergeMemories(memories: IMemory[]): Promise<{
  mergedMemories: Array<{
    sourceIds: string[]
    mergedContent: string
    summary: string
  }>
}> {
  const memorySummaries = memories.map((m, i) => ({
    id: m._id.toString(),
    index: i,
    content: m.content.slice(0, 200),
    type: m.type,
  }))

  const response = await anthropic.messages.create({
    model: 'claude-sonnet-4-20250514',
    max_tokens: 1500,
    messages: [
      {
        role: 'user',
        content: `分析以下记忆条目，找出可以合并的相似条目。

记忆列表:
${memorySummaries.map(m => `[${m.index}] (${m.type}) ${m.content}`).join('\n')}

请识别内容相似或重复的记忆组，并为每组生成合并后的内容。

返回 JSON 格式:
\`\`\`json
{
  "mergedMemories": [
    {
      "sourceIndexes": [0, 3],
      "mergedContent": "合并后的完整内容...",
      "summary": "简短摘要"
    }
  ]
}
\`\`\`

如果没有可合并的记忆，返回空数组。只合并真正相似的记忆，不要强行合并。`,
      },
    ],
  })

  const content = response.content[0].type === 'text' ? response.content[0].text : ''
  const jsonMatch = content.match(/```json\s*([\s\S]*?)\s*```/)

  if (jsonMatch) {
    try {
      const data = JSON.parse(jsonMatch[1])
      return {
        mergedMemories: (data.mergedMemories || []).map((m: any) => ({
          sourceIds: (m.sourceIndexes || []).map((i: number) => memories[i]?._id.toString()).filter(Boolean),
          mergedContent: m.mergedContent,
          summary: m.summary,
        })),
      }
    } catch {
      // 解析失败
    }
  }

  return { mergedMemories: [] }
}

/**
 * 获取记忆健康状态
 */
export async function getMemoryHealthStatus(userId: string): Promise<{
  total: number
  healthy: number
  aging: number
  expiring: number
  recommendations: string[]
}> {
  const now = new Date()
  const agingDate = new Date()
  agingDate.setDate(agingDate.getDate() - 30)
  const expiringDate = new Date()
  expiringDate.setDate(expiringDate.getDate() - 60)

  const [total, healthy, aging, expiring] = await Promise.all([
    Memory.countDocuments({ userId }),
    Memory.countDocuments({ userId, importance: { $gte: 5 } }),
    Memory.countDocuments({
      userId,
      importance: { $gte: 3, $lt: 5 },
      $or: [
        { lastAccessedAt: { $lt: agingDate } },
        { lastAccessedAt: { $exists: false }, createdAt: { $lt: agingDate } },
      ],
    }),
    Memory.countDocuments({
      userId,
      importance: { $lt: 3 },
      $or: [
        { lastAccessedAt: { $lt: expiringDate } },
        { lastAccessedAt: { $exists: false }, createdAt: { $lt: expiringDate } },
      ],
    }),
  ])

  const recommendations: string[] = []

  if (expiring > 10) {
    recommendations.push(`有 ${expiring} 条记忆即将过期，建议清理或重新访问重要内容`)
  }

  if (aging > total * 0.3) {
    recommendations.push('超过 30% 的记忆正在老化，建议回顾重要信息')
  }

  if (total > 1000) {
    recommendations.push('记忆数量较多，建议定期整理以保持系统效率')
  }

  return {
    total,
    healthy,
    aging,
    expiring,
    recommendations,
  }
}

/**
 * 执行完整的记忆维护周期
 */
export async function runMemoryMaintenance(userId?: string): Promise<{
  aged: { processed: number; aged: number }
  cleaned: { deleted: number; vectorIds: string[] }
  timestamp: string
}> {
  // 1. 执行老化
  const aged = await ageMemories(userId)

  // 2. 清理过期记忆
  const cleaned = await cleanupMemories(userId)

  // 注意：cleaned.vectorIds 需要从 Pinecone 中删除
  // 这应该由调用者处理，因为需要 Pinecone 客户端

  return {
    aged,
    cleaned,
    timestamp: new Date().toISOString(),
  }
}
