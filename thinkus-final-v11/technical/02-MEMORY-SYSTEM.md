# Thinkus 记忆系统

> **版本: v11.0 | 日期: 2026-01-15**
>
> **让AI高管"记住"用户，越用越懂你**

---

## 1. 系统概述

### 1.1 设计目标

```yaml
核心目标:
  - AI高管能够记住与用户的历史交互
  - 随着使用时间增长，越来越了解用户
  - 不同项目的记忆相互隔离
  - 跨项目的用户偏好可以共享

技术要求:
  - 高效的向量检索
  - 严格的数据隔离
  - 记忆的持续进化
  - 成本可控
```

### 1.2 双层记忆架构

```
┌─────────────────────────────────────────────────────────────────────────┐
│                                                                          │
│   双层记忆架构                                                           │
│                                                                          │
│   ┌─────────────────────────────────────────────────────────────────┐   │
│   │  Layer 1: 跨项目记忆 (用户偏好)                                 │   │
│   │  ═══════════════════════════════                                │   │
│   │  - 沟通风格偏好                                                 │   │
│   │  - 决策习惯                                                     │   │
│   │  - 技术栈偏好                                                   │   │
│   │  - 常见问题                                                     │   │
│   │                                                                  │   │
│   │  存储: user_{userId}_{agentId} (无projectId过滤)                │   │
│   │  生命周期: 永久 (除非用户删除)                                  │   │
│   └─────────────────────────────────────────────────────────────────┘   │
│                                                                          │
│   ┌─────────────────────────────────────────────────────────────────┐   │
│   │  Layer 2: 项目专属记忆                                          │   │
│   │  ═══════════════════════                                        │   │
│   │  - 项目决策                                                     │   │
│   │  - 讨论结论                                                     │   │
│   │  - 技术方案                                                     │   │
│   │  - 进度里程碑                                                   │   │
│   │                                                                  │   │
│   │  存储: user_{userId}_{agentId} (带projectId过滤)                │   │
│   │  生命周期: 项目存在期间                                         │   │
│   └─────────────────────────────────────────────────────────────────┘   │
│                                                                          │
└─────────────────────────────────────────────────────────────────────────┘
```

---

## 2. 技术实现

### 2.1 Pinecone配置

```typescript
// Pinecone索引配置
const PINECONE_CONFIG = {
  indexName: 'thinkus-memories',
  dimension: 1536,  // OpenAI text-embedding-3-small
  metric: 'cosine',
  spec: {
    serverless: {
      cloud: 'aws',
      region: 'us-east-1'
    }
  }
}

// 初始化Pinecone
import { Pinecone } from '@pinecone-database/pinecone'

const pinecone = new Pinecone({
  apiKey: process.env.PINECONE_API_KEY
})

const index = pinecone.index(PINECONE_CONFIG.indexName)
```

### 2.2 向量存储结构

```typescript
interface MemoryVector {
  id: string                    // 唯一ID: memory_{memoryId}
  values: number[]              // 1536维向量
  metadata: {
    // 隔离字段
    userId: string
    agentId: AgentId
    projectId?: string          // 为空表示跨项目记忆
    
    // 内容
    type: MemoryType
    content: string
    summary: string
    
    // 元数据
    importance: 1 | 2 | 3 | 4 | 5
    confidence: number
    source: 'discussion' | 'user_input' | 'data_analysis' | 'feedback'
    tags: string[]
    
    // 时间
    createdAt: string           // ISO格式
  }
}
```

### 2.3 Embedding生成

```typescript
import OpenAI from 'openai'

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY
})

class EmbeddingService {
  private model = 'text-embedding-3-small'
  
  async embed(text: string): Promise<number[]> {
    const response = await openai.embeddings.create({
      model: this.model,
      input: text
    })
    return response.data[0].embedding
  }
  
  async embedBatch(texts: string[]): Promise<number[][]> {
    const response = await openai.embeddings.create({
      model: this.model,
      input: texts
    })
    return response.data.map(d => d.embedding)
  }
}
```

---

## 3. 记忆写入

### 3.1 写入流程

```
┌─────────────────────────────────────────────────────────────────────────┐
│                                                                          │
│   记忆写入流程                                                           │
│                                                                          │
│   讨论结束                                                               │
│       │                                                                  │
│       ▼                                                                  │
│   ┌─────────────┐                                                       │
│   │ 分析讨论    │  ← Claude分析讨论内容                                 │
│   └──────┬──────┘                                                       │
│          │                                                               │
│          ▼                                                               │
│   ┌─────────────┐                                                       │
│   │ 提取记忆点  │  ← 识别值得记住的信息                                 │
│   └──────┬──────┘                                                       │
│          │                                                               │
│          ▼                                                               │
│   ┌─────────────┐                                                       │
│   │ 生成向量    │  ← OpenAI Embedding                                   │
│   └──────┬──────┘                                                       │
│          │                                                               │
│          ▼                                                               │
│   ┌─────────────┐                                                       │
│   │ 存储记忆    │  ← Pinecone + MongoDB                                 │
│   └─────────────┘                                                       │
│                                                                          │
└─────────────────────────────────────────────────────────────────────────┘
```

### 3.2 实现代码

```typescript
class MemoryWriteService {
  constructor(
    private embeddingService: EmbeddingService,
    private pinecone: Pinecone
  ) {}
  
  // 从讨论中提取并存储记忆
  async extractAndStoreMemories(discussion: IDiscussion) {
    // 1. 使用Claude分析讨论，提取记忆点
    const memoryPoints = await this.extractMemoryPoints(discussion)
    
    // 2. 为每个记忆点生成向量并存储
    for (const point of memoryPoints) {
      await this.storeMemory({
        userId: discussion.userId,
        agentId: point.relevantAgent,
        projectId: discussion.projectId,
        type: point.type,
        content: point.content,
        summary: point.summary,
        importance: point.importance,
        source: 'discussion',
        tags: point.tags
      })
    }
  }
  
  private async extractMemoryPoints(discussion: IDiscussion): Promise<MemoryPoint[]> {
    const response = await claude.messages.create({
      model: 'claude-3-5-sonnet-20241022',
      max_tokens: 2000,
      messages: [{
        role: 'user',
        content: `分析以下讨论，提取值得记忆的要点：

讨论主题：${discussion.topic}
参与者：${discussion.participants.join(', ')}

消息记录：
${discussion.messages.map(m => 
  `[${m.agentId || 'user'}]: ${m.content}`
).join('\n')}

请提取以下类型的记忆点：
1. 项目决策：做出的重要决定
2. 用户偏好：用户表达的喜好或不满
3. 讨论结论：达成的共识
4. 待办事项：需要跟进的任务

返回JSON数组：
[{
  "type": "project_decision" | "user_preference" | "discussion_conclusion" | "action_item",
  "content": "完整内容",
  "summary": "简短摘要 (50字以内)",
  "importance": 1-5,
  "tags": ["tag1", "tag2"],
  "relevantAgent": "最相关的高管ID",
  "isProjectSpecific": true/false  // 是否仅与当前项目相关
}]`
      }]
    })
    
    return JSON.parse(response.content[0].text)
  }
  
  async storeMemory(input: MemoryInput) {
    const memoryId = generateId()
    
    // 1. 生成向量
    const vector = await this.embeddingService.embed(
      `${input.summary}\n${input.content}`
    )
    
    // 2. 存储到Pinecone
    const namespace = `user_${input.userId}_${input.agentId}`
    await this.pinecone.index('thinkus-memories').namespace(namespace).upsert([{
      id: `memory_${memoryId}`,
      values: vector,
      metadata: {
        userId: input.userId,
        agentId: input.agentId,
        projectId: input.projectId,
        type: input.type,
        content: input.content,
        summary: input.summary,
        importance: input.importance,
        confidence: 1.0,
        source: input.source,
        tags: input.tags,
        createdAt: new Date().toISOString()
      }
    }])
    
    // 3. 存储元数据到MongoDB
    await db.memories.create({
      _id: memoryId,
      userId: input.userId,
      agentId: input.agentId,
      projectId: input.projectId,
      type: input.type,
      content: input.content,
      summary: input.summary,
      vectorId: `memory_${memoryId}`,
      namespace,
      metadata: {
        importance: input.importance,
        confidence: 1.0,
        source: input.source,
        tags: input.tags
      },
      accessCount: 0,
      status: 'active',
      createdAt: new Date()
    })
    
    return memoryId
  }
}
```

---

## 4. 记忆检索

### 4.1 检索流程

```typescript
class MemoryRetrievalService {
  // 检索相关记忆
  async retrieveRelevantMemories(params: {
    userId: string
    agentId: AgentId
    projectId: string
    query: string
    limit?: number
  }): Promise<Memory[]> {
    const { userId, agentId, projectId, query, limit = 6 } = params
    
    // 1. 生成查询向量
    const queryVector = await this.embeddingService.embed(query)
    
    const namespace = `user_${userId}_${agentId}`
    
    // 2. 检索Layer 1: 跨项目记忆
    const layer1Results = await this.pinecone
      .index('thinkus-memories')
      .namespace(namespace)
      .query({
        vector: queryVector,
        topK: 3,
        filter: {
          projectId: { $exists: false }  // 跨项目记忆没有projectId
        },
        includeMetadata: true
      })
    
    // 3. 检索Layer 2: 项目专属记忆
    const layer2Results = await this.pinecone
      .index('thinkus-memories')
      .namespace(namespace)
      .query({
        vector: queryVector,
        topK: 5,
        filter: { projectId },
        includeMetadata: true
      })
    
    // 4. 合并并排序
    const allResults = [...layer1Results.matches, ...layer2Results.matches]
    
    // 5. 按相关度和重要性综合排序
    const sorted = allResults.sort((a, b) => {
      const scoreA = a.score * (a.metadata.importance / 5)
      const scoreB = b.score * (b.metadata.importance / 5)
      return scoreB - scoreA
    })
    
    // 6. 取前N条
    const topMemories = sorted.slice(0, limit)
    
    // 7. 更新访问统计
    await this.updateAccessStats(topMemories.map(m => m.id))
    
    return topMemories.map(m => ({
      id: m.id,
      type: m.metadata.type,
      content: m.metadata.content,
      summary: m.metadata.summary,
      importance: m.metadata.importance,
      relevanceScore: m.score
    }))
  }
  
  private async updateAccessStats(memoryIds: string[]) {
    await db.memories.updateMany(
      { vectorId: { $in: memoryIds } },
      { 
        $inc: { accessCount: 1 },
        $set: { lastAccessedAt: new Date() }
      }
    )
  }
}
```

### 4.2 记忆注入到Prompt

```typescript
class PromptInjector {
  formatMemoriesForPrompt(memories: Memory[]): string {
    if (memories.length === 0) {
      return '暂无相关历史记忆。'
    }
    
    const sections = {
      decisions: [] as string[],
      preferences: [] as string[],
      conclusions: [] as string[],
      insights: [] as string[]
    }
    
    for (const memory of memories) {
      const line = `- ${memory.summary}`
      
      switch (memory.type) {
        case 'project_decision':
          sections.decisions.push(line)
          break
        case 'user_preference':
        case 'user_feedback':
          sections.preferences.push(line)
          break
        case 'discussion_conclusion':
          sections.conclusions.push(line)
          break
        case 'data_insight':
          sections.insights.push(line)
          break
      }
    }
    
    let output = ''
    
    if (sections.decisions.length > 0) {
      output += `## 相关决策\n${sections.decisions.join('\n')}\n\n`
    }
    if (sections.preferences.length > 0) {
      output += `## 用户偏好\n${sections.preferences.join('\n')}\n\n`
    }
    if (sections.conclusions.length > 0) {
      output += `## 历史结论\n${sections.conclusions.join('\n')}\n\n`
    }
    if (sections.insights.length > 0) {
      output += `## 数据洞察\n${sections.insights.join('\n')}\n\n`
    }
    
    return output.trim()
  }
}
```

---

## 5. 记忆进化

### 5.1 记忆合并

```typescript
// 相似记忆合并，避免冗余
class MemoryEvolutionService {
  // 定期运行，合并相似记忆
  async consolidateMemories(userId: string, agentId: AgentId) {
    const namespace = `user_${userId}_${agentId}`
    
    // 1. 获取所有记忆
    const allMemories = await db.memories.find({
      userId,
      agentId,
      status: 'active'
    }).toArray()
    
    // 2. 检测相似记忆组
    const similarGroups = await this.findSimilarGroups(allMemories)
    
    // 3. 合并每个组
    for (const group of similarGroups) {
      if (group.length > 1) {
        await this.mergeMemories(group)
      }
    }
  }
  
  private async mergeMemories(memories: Memory[]) {
    // 使用Claude合并
    const response = await claude.messages.create({
      model: 'claude-3-haiku-20240307',
      max_tokens: 500,
      messages: [{
        role: 'user',
        content: `将以下相似的记忆合并为一条：

${memories.map(m => `- ${m.content}`).join('\n')}

返回JSON：
{
  "mergedContent": "合并后的完整内容",
  "mergedSummary": "合并后的摘要",
  "importance": 1-5
}`
      }]
    })
    
    const merged = JSON.parse(response.content[0].text)
    
    // 创建新记忆
    const firstMemory = memories[0]
    await this.storeMemory({
      userId: firstMemory.userId,
      agentId: firstMemory.agentId,
      projectId: firstMemory.projectId,
      type: firstMemory.type,
      content: merged.mergedContent,
      summary: merged.mergedSummary,
      importance: merged.importance,
      source: 'consolidation',
      tags: [...new Set(memories.flatMap(m => m.tags))]
    })
    
    // 标记旧记忆为已归档
    await db.memories.updateMany(
      { _id: { $in: memories.map(m => m._id) } },
      { $set: { status: 'archived' } }
    )
    
    // 从Pinecone删除旧向量
    const namespace = `user_${firstMemory.userId}_${firstMemory.agentId}`
    await this.pinecone
      .index('thinkus-memories')
      .namespace(namespace)
      .deleteMany(memories.map(m => m.vectorId))
  }
}
```

### 5.2 记忆遗忘

```typescript
// 低价值记忆的清理
class MemoryForgetService {
  // 定期清理低访问量的老旧记忆
  async cleanupOldMemories(userId: string, agentId: AgentId) {
    const cutoffDate = new Date()
    cutoffDate.setMonth(cutoffDate.getMonth() - 6)  // 6个月前
    
    // 查找候选删除的记忆
    const candidates = await db.memories.find({
      userId,
      agentId,
      status: 'active',
      importance: { $lte: 2 },  // 低重要性
      accessCount: { $lte: 2 },  // 低访问量
      createdAt: { $lt: cutoffDate }  // 超过6个月
    }).toArray()
    
    if (candidates.length === 0) return
    
    // 标记为已弃用
    await db.memories.updateMany(
      { _id: { $in: candidates.map(c => c._id) } },
      { $set: { status: 'deprecated' } }
    )
    
    // 从Pinecone删除
    const namespace = `user_${userId}_${agentId}`
    await this.pinecone
      .index('thinkus-memories')
      .namespace(namespace)
      .deleteMany(candidates.map(c => c.vectorId))
  }
}
```

---

## 6. 配额管理

### 6.1 套餐限制

```typescript
const MEMORY_LIMITS = {
  seed: 50,        // 每个高管最多50条记忆
  growth: 200,     // 每个高管最多200条记忆
  scale: 500,      // 每个高管最多500条记忆
  enterprise: Infinity  // 无限
}

class MemoryQuotaService {
  async checkQuota(userId: string, agentId: AgentId): Promise<{
    current: number
    limit: number
    canAdd: boolean
  }> {
    const user = await db.users.findOne({ _id: userId })
    const subscription = await db.subscriptions.findOne({ userId })
    
    const limit = MEMORY_LIMITS[subscription?.tier || 'seed']
    const current = await db.memories.count({
      userId,
      agentId,
      status: 'active'
    })
    
    return {
      current,
      limit,
      canAdd: current < limit
    }
  }
  
  async enforceQuota(userId: string, agentId: AgentId) {
    const quota = await this.checkQuota(userId, agentId)
    
    if (quota.current >= quota.limit) {
      // 触发记忆清理
      await this.memoryForgetService.cleanupOldMemories(userId, agentId)
      
      // 如果还是超限，强制删除最老的
      const stillOver = quota.current - quota.limit
      if (stillOver > 0) {
        const toDelete = await db.memories.find({
          userId,
          agentId,
          status: 'active'
        })
        .sort({ importance: 1, accessCount: 1, createdAt: 1 })
        .limit(stillOver)
        .toArray()
        
        // 删除
        await this.deleteMemories(toDelete)
      }
    }
  }
}
```

---

## 7. 总结

```
┌─────────────────────────────────────────────────────────────────────────┐
│                                                                          │
│   Thinkus 记忆系统                                                       │
│                                                                          │
│   双层架构:                                                              │
│   ══════════                                                             │
│   Layer 1: 跨项目记忆 (用户偏好、沟通风格)                               │
│   Layer 2: 项目专属记忆 (决策、结论、方案)                               │
│                                                                          │
│   技术栈:                                                                │
│   ══════════                                                             │
│   向量存储: Pinecone (命名空间隔离)                                      │
│   元数据: MongoDB                                                        │
│   Embedding: OpenAI text-embedding-3-small                               │
│   分析: Claude Sonnet                                                    │
│                                                                          │
│   核心流程:                                                              │
│   ══════════                                                             │
│   写入: 讨论结束 → 分析提取 → 向量化 → 存储                              │
│   检索: 查询 → 向量搜索 → 双层合并 → 排序返回                            │
│   进化: 相似合并 + 低价值遗忘                                            │
│                                                                          │
│   配额限制:                                                              │
│   ══════════                                                             │
│   Seed: 50条/高管                                                       │
│   Growth: 200条/高管                                                    │
│   Scale: 500条/高管                                                     │
│   Enterprise: 无限                                                      │
│                                                                          │
└─────────────────────────────────────────────────────────────────────────┘
```

---

**相关文档**:
- [用户专属高管](01-USER-EXCLUSIVE-EXECUTIVES.md)
- [技术架构](../core/02-ARCHITECTURE.md)
- [数据模型](../core/03-DATA-MODELS.md)
