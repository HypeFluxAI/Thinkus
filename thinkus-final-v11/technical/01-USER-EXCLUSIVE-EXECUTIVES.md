# Thinkus 用户专属高管架构

> **版本: v11.0 | 日期: 2026-01-15**
>
> **每个用户拥有专属的18个AI高管实例，数据完全隔离**

---

## 1. 核心概念

### 1.1 用户专属 vs 共享实例

```yaml
传统方式 (共享实例):
  - 所有用户共用同一个AI实例
  - AI的知识是混合的
  - 可能泄露其他用户信息
  - 无法个性化

Thinkus方式 (用户专属):
  - 每个用户有18个专属AI高管实例
  - 每个高管只记得自己用户的信息
  - 完全数据隔离
  - 随着使用越来越了解用户
```

### 1.2 架构示意

```
┌─────────────────────────────────────────────────────────────────────────┐
│                                                                          │
│   用户A                           用户B                                  │
│   ═════                           ═════                                  │
│                                                                          │
│   ┌─────────────────────┐         ┌─────────────────────┐               │
│   │  用户A的Mike实例    │         │  用户B的Mike实例    │               │
│   │  - A的项目历史      │         │  - B的项目历史      │               │
│   │  - A的沟通偏好      │         │  - B的沟通偏好      │               │
│   │  - A的决策风格      │         │  - B的决策风格      │               │
│   └─────────────────────┘         └─────────────────────┘               │
│                                                                          │
│   ┌─────────────────────┐         ┌─────────────────────┐               │
│   │  用户A的Elena实例   │         │  用户B的Elena实例   │               │
│   │  - A的设计偏好      │         │  - B的设计偏好      │               │
│   │  - A的品牌风格      │         │  - B的品牌风格      │               │
│   └─────────────────────┘         └─────────────────────┘               │
│                                                                          │
│   ... (18个高管 × N个用户)                                              │
│                                                                          │
│   ════════════════════════════════════════════════════════════════════  │
│                                                                          │
│   共享专家 (所有用户共用，但无状态)                                      │
│                                                                          │
│   ┌─────────┐  ┌─────────┐  ┌─────────┐  ┌─────────┐                   │
│   │ AI专家  │  │ 区块链   │  │ 电商    │  │ SaaS    │  ...             │
│   │         │  │ 专家    │  │ 专家    │  │ 专家    │                   │
│   └─────────┘  └─────────┘  └─────────┘  └─────────┘                   │
│                                                                          │
└─────────────────────────────────────────────────────────────────────────┘
```

---

## 2. 数据隔离设计

### 2.1 隔离层次

```yaml
层次1 - 数据库层面:
  - MongoDB: 每个文档都有userId字段
  - 查询时强制带userId过滤
  - 索引设计确保查询隔离

层次2 - 向量存储层面:
  - Pinecone: 使用命名空间隔离
  - 命名空间格式: user_{userId}_{agentId}
  - 例: user_123_mike, user_123_elena

层次3 - 应用层面:
  - API层验证userId
  - 服务层验证访问权限
  - Prompt注入时只检索当前用户数据
```

### 2.2 命名空间设计

```typescript
// Pinecone命名空间策略
class NamespaceStrategy {
  // 获取高管记忆命名空间
  getAgentNamespace(userId: string, agentId: AgentId): string {
    return `user_${userId}_${agentId}`
    // 例: user_abc123_mike
  }
  
  // 获取项目命名空间
  getProjectNamespace(userId: string, projectId: string): string {
    return `user_${userId}_project_${projectId}`
    // 例: user_abc123_project_xyz789
  }
  
  // 获取用户所有命名空间 (用于删除账户)
  getUserNamespaces(userId: string): string[] {
    const agentNamespaces = AGENT_IDS.map(
      agentId => `user_${userId}_${agentId}`
    )
    // 还需要查询该用户的所有项目命名空间
    return agentNamespaces
  }
}
```

### 2.3 访问控制

```typescript
// 中间件确保数据隔离
const ensureUserIsolation = async (req, res, next) => {
  const { userId } = req.auth  // 从JWT获取
  const { resourceUserId } = req.params  // 请求的资源
  
  if (resourceUserId && resourceUserId !== userId) {
    return res.status(403).json({ error: '无权访问其他用户数据' })
  }
  
  // 注入userId到请求上下文
  req.context = { ...req.context, userId }
  next()
}

// 服务层示例
class MemoryService {
  async getMemories(userId: string, agentId: AgentId, query: string) {
    // 强制使用用户专属命名空间
    const namespace = this.namespaceStrategy.getAgentNamespace(userId, agentId)
    
    // 检索时只在该命名空间内搜索
    const results = await this.pinecone.query({
      namespace,
      vector: await this.embed(query),
      topK: 5
    })
    
    return results
  }
}
```

---

## 3. 高管实例管理

### 3.1 用户注册时初始化

```typescript
// 用户注册后创建18个高管实例
async function initializeUserExecutives(userId: string) {
  const executives: IUserExecutive[] = AGENT_IDS.map(agentId => ({
    userId,
    agentId,
    status: 'active',
    memoryStats: {
      totalMemories: 0,
      memoryByType: {}
    },
    learnedPreferences: {},
    usageStats: {
      totalDiscussions: 0,
      totalMessages: 0
    },
    createdAt: new Date(),
    updatedAt: new Date()
  }))
  
  await db.userExecutives.insertMany(executives)
  
  // 创建Pinecone命名空间 (Pinecone会在首次写入时自动创建)
  // 这里可以预热或验证
}
```

### 3.2 高管状态追踪

```typescript
interface IUserExecutive {
  userId: string
  agentId: AgentId
  status: 'active' | 'suspended'
  
  // 记忆统计
  memoryStats: {
    totalMemories: number
    lastMemoryAt?: Date
    memoryByType: Record<MemoryType, number>
  }
  
  // 学习到的偏好
  learnedPreferences: {
    communicationStyle?: 'formal' | 'casual' | 'concise' | 'detailed'
    focusAreas?: string[]
    dislikes?: string[]
    decisionStyle?: 'fast' | 'careful' | 'data-driven'
    customInstructions?: string
  }
  
  // 使用统计
  usageStats: {
    totalDiscussions: number
    totalMessages: number
    lastActiveAt?: Date
    averageResponseRating?: number
  }
}
```

### 3.3 偏好学习

```typescript
// 从交互中学习用户偏好
class PreferenceLearner {
  async learnFromDiscussion(
    userId: string,
    agentId: AgentId,
    discussion: IDiscussion
  ) {
    // 分析讨论内容
    const analysis = await this.analyzeDiscussion(discussion)
    
    // 提取偏好信号
    const signals = await this.extractPreferenceSignals(analysis)
    
    // 更新高管实例的偏好
    if (signals.length > 0) {
      await this.updatePreferences(userId, agentId, signals)
    }
  }
  
  private async extractPreferenceSignals(analysis: any): Promise<PreferenceSignal[]> {
    // 使用Claude分析
    const response = await claude.messages.create({
      model: 'claude-3-haiku-20240307',
      max_tokens: 500,
      messages: [{
        role: 'user',
        content: `分析以下对话，提取用户偏好信号：
        
${JSON.stringify(analysis)}

可能的偏好类型：
- communicationStyle: formal/casual/concise/detailed
- focusAreas: 用户关注的领域
- dislikes: 用户不喜欢的内容/风格
- decisionStyle: fast/careful/data-driven

返回JSON数组：
[{"type": "communicationStyle", "value": "...", "confidence": 0-1}]`
      }]
    })
    
    return JSON.parse(response.content[0].text)
  }
}
```

---

## 4. Prompt注入

### 4.1 构建高管Prompt

```typescript
class PromptBuilder {
  async buildAgentPrompt(params: {
    userId: string
    agentId: AgentId
    projectId: string
    topic: string
  }): Promise<string> {
    const { userId, agentId, projectId, topic } = params
    
    // 1. 获取高管基础人设
    const persona = await this.getAgentPersona(agentId)
    
    // 2. 获取用户专属偏好
    const executive = await db.userExecutives.findOne({ userId, agentId })
    const preferences = executive?.learnedPreferences || {}
    
    // 3. 获取相关记忆
    const memories = await this.memoryService.getRelevantMemories(
      userId, agentId, projectId, topic
    )
    
    // 4. 获取项目上下文
    const project = await db.projects.findOne({ _id: projectId, userId })
    
    // 5. 组装Prompt
    return `
# 角色设定
${persona.name}，${persona.title}

${persona.background}

## 性格特点
${persona.personality}

## 专业能力
${persona.expertise.join('、')}

# 用户偏好
${this.formatPreferences(preferences)}

# 记忆上下文
${this.formatMemories(memories)}

# 当前项目
项目名称：${project.name}
项目阶段：${project.phase}
项目描述：${project.description}

# 当前话题
${topic}

请基于以上背景，以${persona.name}的身份回应用户。
记住：你只服务于这一位用户，你对他/她的了解都来自以上记忆。
`
  }
  
  private formatPreferences(preferences: LearnedPreferences): string {
    const lines: string[] = []
    
    if (preferences.communicationStyle) {
      lines.push(`- 沟通风格偏好：${preferences.communicationStyle}`)
    }
    if (preferences.focusAreas?.length) {
      lines.push(`- 关注领域：${preferences.focusAreas.join('、')}`)
    }
    if (preferences.dislikes?.length) {
      lines.push(`- 注意避免：${preferences.dislikes.join('、')}`)
    }
    if (preferences.customInstructions) {
      lines.push(`- 特别指示：${preferences.customInstructions}`)
    }
    
    return lines.length > 0 ? lines.join('\n') : '暂无特别偏好记录'
  }
}
```

### 4.2 记忆检索与注入

```typescript
class MemoryService {
  async getRelevantMemories(
    userId: string,
    agentId: AgentId,
    projectId: string,
    topic: string
  ): Promise<Memory[]> {
    // 1. 生成查询向量
    const queryVector = await this.embed(topic)
    
    // 2. 搜索用户专属记忆 (Layer 1: 跨项目)
    const userMemories = await this.pinecone.query({
      namespace: `user_${userId}_${agentId}`,
      vector: queryVector,
      topK: 3,
      filter: { projectId: { $exists: false } }  // 跨项目记忆
    })
    
    // 3. 搜索项目专属记忆 (Layer 2: 当前项目)
    const projectMemories = await this.pinecone.query({
      namespace: `user_${userId}_${agentId}`,
      vector: queryVector,
      topK: 5,
      filter: { projectId }
    })
    
    // 4. 合并并按重要性排序
    const allMemories = [...userMemories.matches, ...projectMemories.matches]
      .sort((a, b) => {
        // 优先考虑相关度，其次考虑重要性
        const scoreA = a.score * (a.metadata.importance / 5)
        const scoreB = b.score * (b.metadata.importance / 5)
        return scoreB - scoreA
      })
      .slice(0, 6)  // 最多6条
    
    return allMemories.map(m => m.metadata as Memory)
  }
}
```

---

## 5. 技能蒸馏机制

### 5.1 设计理念

```yaml
问题:
  - 用户专属实例意味着每个高管只能从一个用户学习
  - 但高质量的技能应该能提升所有实例

解决方案 - 技能蒸馏:
  - 从用户交互中提取通用技能 (匿名化)
  - 蒸馏后的技能存入共享技能库
  - 所有实例静默获得技能提升
  - 用户数据绝对不共享

类比:
  - 每个高管是独立的员工
  - 但公司会组织培训 (共享技能)
  - 培训内容不涉及具体客户信息
```

### 5.2 蒸馏流程

```
┌─────────────────────────────────────────────────────────────────────────┐
│                                                                          │
│   技能蒸馏流程                                                           │
│                                                                          │
│   用户A讨论                     用户B讨论                                │
│       │                             │                                    │
│       ▼                             ▼                                    │
│   ┌─────────────────────────────────────────────────┐                   │
│   │                  匿名化处理                      │                   │
│   │  - 移除用户标识                                  │                   │
│   │  - 移除项目具体信息                              │                   │
│   │  - 只保留通用模式                                │                   │
│   └─────────────────────────────────────────────────┘                   │
│                         │                                                │
│                         ▼                                                │
│   ┌─────────────────────────────────────────────────┐                   │
│   │                  技能提取                        │                   │
│   │  - 高效的问题解决模式                            │                   │
│   │  - 专业领域知识                                  │                   │
│   │  - 沟通技巧改进                                  │                   │
│   └─────────────────────────────────────────────────┘                   │
│                         │                                                │
│                         ▼                                                │
│   ┌─────────────────────────────────────────────────┐                   │
│   │                共享技能库                        │                   │
│   └─────────────────────────────────────────────────┘                   │
│                         │                                                │
│          ┌──────────────┼──────────────┐                                │
│          ▼              ▼              ▼                                │
│   所有Mike实例    所有Elena实例   所有David实例 ...                     │
│                                                                          │
└─────────────────────────────────────────────────────────────────────────┘
```

### 5.3 实现代码

```typescript
class SkillDistillationService {
  // 从高质量讨论中提取技能
  async distillSkills(discussion: IDiscussion) {
    // 1. 检查讨论质量 (只有高质量的才蒸馏)
    if (!this.isHighQuality(discussion)) {
      return
    }
    
    // 2. 匿名化处理
    const anonymized = await this.anonymize(discussion)
    
    // 3. 提取通用技能
    const skills = await this.extractSkills(anonymized)
    
    // 4. 存入共享技能库
    for (const skill of skills) {
      await this.saveToSharedSkillLibrary(skill)
    }
  }
  
  private async anonymize(discussion: IDiscussion): Promise<AnonymizedDiscussion> {
    // 使用Claude进行匿名化
    const response = await claude.messages.create({
      model: 'claude-3-haiku-20240307',
      max_tokens: 2000,
      messages: [{
        role: 'user',
        content: `将以下讨论内容匿名化，移除所有个人信息、公司名称、项目具体细节，只保留通用的问题解决模式：

${JSON.stringify(discussion.messages)}

返回匿名化后的内容，保持对话结构。`
      }]
    })
    
    return {
      agentId: discussion.participants[0],  // 保留高管类型
      topic: this.generalizeTopicHelper(discussion.topic),
      messages: JSON.parse(response.content[0].text)
    }
  }
  
  private async extractSkills(anonymized: AnonymizedDiscussion): Promise<Skill[]> {
    const response = await claude.messages.create({
      model: 'claude-3-5-sonnet-20241022',
      max_tokens: 1000,
      messages: [{
        role: 'user',
        content: `从以下匿名化的讨论中提取可复用的技能模式：

${JSON.stringify(anonymized)}

提取以下类型的技能：
1. 问题解决模式：通用的问题分析和解决方法
2. 专业知识点：领域专业知识
3. 沟通技巧：有效的沟通方式

返回JSON数组：
[{
  "type": "problem_solving" | "domain_knowledge" | "communication",
  "agentId": "${anonymized.agentId}",
  "title": "技能标题",
  "description": "技能描述",
  "applicableScenarios": ["适用场景1", "适用场景2"]
}]`
      }]
    })
    
    return JSON.parse(response.content[0].text)
  }
}
```

---

## 6. 账户生命周期

### 6.1 账户删除

```typescript
// 用户删除账户时清理所有数据
async function deleteUserAccount(userId: string) {
  // 1. 删除MongoDB数据
  await db.users.deleteOne({ _id: userId })
  await db.userExecutives.deleteMany({ userId })
  await db.projects.deleteMany({ userId })
  await db.discussions.deleteMany({ userId })
  await db.decisions.deleteMany({ userId })
  await db.memories.deleteMany({ userId })
  await db.subscriptions.deleteMany({ userId })
  await db.notifications.deleteMany({ userId })
  
  // 2. 删除Pinecone数据
  const namespaces = namespaceStrategy.getUserNamespaces(userId)
  for (const namespace of namespaces) {
    await pinecone.index('thinkus').namespace(namespace).deleteAll()
  }
  
  // 3. 删除其他存储 (如文件)
  await fileStorage.deleteUserFiles(userId)
  
  // 4. 记录删除日志 (合规)
  await auditLog.record({
    type: 'account_deletion',
    userId,
    timestamp: new Date()
  })
}
```

---

## 7. 总结

```
┌─────────────────────────────────────────────────────────────────────────┐
│                                                                          │
│   Thinkus 用户专属高管架构                                               │
│                                                                          │
│   核心设计:                                                              │
│   ══════════                                                             │
│   • 每个用户拥有18个专属AI高管实例                                       │
│   • 数据完全隔离 (MongoDB + Pinecone命名空间)                            │
│   • 高管只记得自己用户的信息                                             │
│   • 随着使用越来越了解用户偏好                                           │
│                                                                          │
│   隔离机制:                                                              │
│   ══════════                                                             │
│   • 数据库: userId字段 + 强制过滤                                        │
│   • 向量库: user_{userId}_{agentId} 命名空间                             │
│   • 应用层: API验证 + 服务层验证                                         │
│                                                                          │
│   技能蒸馏:                                                              │
│   ══════════                                                             │
│   • 从高质量讨论中提取通用技能                                           │
│   • 完全匿名化，不共享用户数据                                           │
│   • 所有实例静默获得技能提升                                             │
│                                                                          │
│   用户体验:                                                              │
│   ══════════                                                             │
│   • 高管"记得"之前的讨论                                                 │
│   • 高管了解用户的偏好和风格                                             │
│   • 高管随着使用变得更懂用户                                             │
│   • 用户数据绝对安全                                                     │
│                                                                          │
└─────────────────────────────────────────────────────────────────────────┘
```

---

**相关文档**:
- [PRD](../core/01-PRD.md)
- [技术架构](../core/02-ARCHITECTURE.md)
- [记忆系统](02-MEMORY-SYSTEM.md)
