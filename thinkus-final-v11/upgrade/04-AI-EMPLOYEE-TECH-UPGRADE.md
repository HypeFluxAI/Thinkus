# Thinkus AI员工增强方案 - 技术架构文档

> **版本**: v1.0 | **日期**: 2026-01-15
>
> **给AI工程师**: 本文档包含完整的技术实现方案，可直接基于此开发

---

## 一、架构总览

### 1.1 整体架构图

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                              用户请求                                        │
│                                  │                                           │
│                                  ▼                                           │
│  ┌───────────────────────────────────────────────────────────────────────┐  │
│  │                         Employee Core                                  │  │
│  │                     (单人格对话，对外统一)                            │  │
│  └───────────────────────────────┬───────────────────────────────────────┘  │
│                                  │                                           │
│          ┌───────────────────────┼───────────────────────┐                  │
│          │                       │                       │                  │
│          ▼                       ▼                       ▼                  │
│  ┌───────────────┐      ┌───────────────┐      ┌───────────────┐           │
│  │    Memory     │      │    Planner    │      │   Knowledge   │           │
│  │  Controller   │      │    规划器     │      │   Manager     │           │
│  │  (记忆控制)   │      │               │      │  (知识管理)   │           │
│  └───────┬───────┘      └───────┬───────┘      └───────┬───────┘           │
│          │                      │                      │                    │
│          ▼                      ▼                      ▼                    │
│  ┌───────────────┐      ┌───────────────┐      ┌───────────────┐           │
│  │   Retriever   │      │   Executor    │      │  Compressor   │           │
│  │   (检索器)    │      │   (执行器)    │      │   (压缩器)    │           │
│  │  Catalog/     │      │   沙盒执行    │      │  摘要/合并    │           │
│  │  Details      │      │               │      │               │           │
│  └───────┬───────┘      └───────┬───────┘      └───────┬───────┘           │
│          │                      │                      │                    │
│          └──────────────────────┼──────────────────────┘                    │
│                                 │                                            │
│                                 ▼                                            │
│  ┌───────────────────────────────────────────────────────────────────────┐  │
│  │                         Storage Layer                                  │  │
│  │                                                                        │  │
│  │  ┌─────────────┐ ┌─────────────┐ ┌─────────────┐ ┌─────────────┐     │  │
│  │  │   Memory    │ │  Artifact   │ │   Session   │ │   Vector    │     │  │
│  │  │   Store     │ │   Store     │ │   Summary   │ │   Index     │     │  │
│  │  │ PostgreSQL  │ │   S3/R2     │ │  PostgreSQL │ │  Pinecone   │     │  │
│  │  └─────────────┘ └─────────────┘ └─────────────┘ └─────────────┘     │  │
│  │                                                                        │  │
│  └───────────────────────────────────────────────────────────────────────┘  │
│                                                                              │
└─────────────────────────────────────────────────────────────────────────────┘
```

### 1.2 模块依赖关系

```
Memory Controller
       │
       ├──► Retriever ──► Vector Index (Pinecone)
       │                      │
       │                      └──► Memory Store (PostgreSQL)
       │
Planner ──► Executor ──► Artifact Store (S3/R2)
       │
Knowledge Manager ──► Compressor ──► Memory Store
                              │
                              └──► Session Summary Store
```

---

## 二、数据模型设计

### 2.1 Memory (长期记忆)

```sql
-- PostgreSQL Schema
CREATE TABLE memories (
    id              VARCHAR(36) PRIMARY KEY,
    user_id         VARCHAR(36) NOT NULL,
    role_id         VARCHAR(36) NOT NULL,      -- 哪个高管的记忆
    project_id      VARCHAR(36),               -- NULL表示跨项目记忆
    session_id      VARCHAR(36),               -- 产生该记忆的会话
    
    -- 内容
    type            VARCHAR(50) NOT NULL,      -- project_decision, user_preference, etc
    content         TEXT NOT NULL,             -- 完整内容
    summary         VARCHAR(200) NOT NULL,     -- 摘要 (用于Catalog)
    
    -- 质量指标
    importance      SMALLINT DEFAULT 3,        -- 1-5
    confidence      DECIMAL(3,2) DEFAULT 1.0,  -- 0.00-1.00
    freshness       DECIMAL(5,2) DEFAULT 5.0,  -- 衰减后的新鲜度
    evidence_count  INT DEFAULT 1,             -- 支撑证据数量
    
    -- 隔离与可见性
    visibility      VARCHAR(20) DEFAULT 'private',  -- private, project, global
    
    -- 状态
    status          VARCHAR(20) DEFAULT 'active',   -- active, suppressed, frozen, replaced
    superseded_by   VARCHAR(36),               -- 被哪条记忆替换
    
    -- 向量
    vector_id       VARCHAR(100),              -- Pinecone中的ID
    
    -- 元数据
    source          VARCHAR(50),               -- discussion, user_input, inference
    tags            TEXT[],                    -- 标签数组
    
    -- 时间戳
    created_at      TIMESTAMP DEFAULT NOW(),
    updated_at      TIMESTAMP DEFAULT NOW(),
    last_accessed   TIMESTAMP,
    
    -- 索引
    CONSTRAINT fk_user FOREIGN KEY (user_id) REFERENCES users(id),
    CONSTRAINT fk_role FOREIGN KEY (role_id) REFERENCES roles(id)
);

-- 索引设计
CREATE INDEX idx_memories_user_role ON memories(user_id, role_id);
CREATE INDEX idx_memories_project ON memories(user_id, project_id);
CREATE INDEX idx_memories_type ON memories(user_id, type);
CREATE INDEX idx_memories_status ON memories(status) WHERE status = 'active';
CREATE INDEX idx_memories_freshness ON memories(freshness DESC);
```

```typescript
// TypeScript Interface
interface Memory {
  id: string
  userId: string
  roleId: string
  projectId?: string
  sessionId?: string
  
  type: MemoryType
  content: string
  summary: string
  
  importance: 1 | 2 | 3 | 4 | 5
  confidence: number
  freshness: number
  evidenceCount: number
  
  visibility: 'private' | 'project' | 'global'
  status: 'active' | 'suppressed' | 'frozen' | 'replaced'
  supersededBy?: string
  
  vectorId?: string
  source: 'discussion' | 'user_input' | 'inference' | 'system'
  tags: string[]
  
  createdAt: Date
  updatedAt: Date
  lastAccessed?: Date
}

type MemoryType = 
  | 'project_decision'       // 项目决策
  | 'user_preference'        // 用户偏好
  | 'discussion_conclusion'  // 讨论结论
  | 'action_item'           // 待办事项
  | 'constraint'            // 约束条件
  | 'risk'                  // 风险项
  | 'feedback'              // 用户反馈
```

### 2.2 Artifact (工具产物)

```sql
CREATE TABLE artifacts (
    id              VARCHAR(36) PRIMARY KEY,
    user_id         VARCHAR(36) NOT NULL,
    project_id      VARCHAR(36),
    session_id      VARCHAR(36) NOT NULL,
    tool_call_id    VARCHAR(100),              -- 触发的工具调用ID
    
    -- 内容定位
    storage_type    VARCHAR(20) NOT NULL,      -- s3, r2, local
    storage_path    VARCHAR(500) NOT NULL,     -- 存储路径
    mime_type       VARCHAR(100),
    size_bytes      BIGINT,
    
    -- 压缩摘要
    compact_summary TEXT,                      -- <500 tokens的摘要
    
    -- 元数据
    metadata        JSONB,                     -- 额外元数据
    
    -- 时间戳
    created_at      TIMESTAMP DEFAULT NOW(),
    expires_at      TIMESTAMP,                 -- 过期时间
    
    CONSTRAINT fk_user FOREIGN KEY (user_id) REFERENCES users(id)
);

CREATE INDEX idx_artifacts_user_project ON artifacts(user_id, project_id);
CREATE INDEX idx_artifacts_session ON artifacts(session_id);
```

```typescript
interface Artifact {
  id: string
  userId: string
  projectId?: string
  sessionId: string
  toolCallId?: string
  
  storageType: 's3' | 'r2' | 'local'
  storagePath: string
  mimeType?: string
  sizeBytes?: number
  
  compactSummary?: string
  
  metadata?: Record<string, any>
  
  createdAt: Date
  expiresAt?: Date
}

// Compact格式 (注入上下文)
interface ArtifactCompact {
  ref: string                    // ART-001
  type: string                   // 代码文件, 分析报告, 设计稿
  path?: string                  // /src/user.service.ts
  summary: string                // 200字以内摘要
  size: string                   // "200行 / 4.2KB"
  locator: ArtifactLocator[]     // 支持的定位方式
}

interface ArtifactLocator {
  type: 'lines' | 'bytes' | 'jsonpath' | 'search'
  example: string                // lines="1-50"
}
```

### 2.3 Session Summary (会话摘要)

```sql
CREATE TABLE session_summaries (
    id              VARCHAR(36) PRIMARY KEY,
    session_id      VARCHAR(36) NOT NULL UNIQUE,
    user_id         VARCHAR(36) NOT NULL,
    project_id      VARCHAR(36),
    
    -- 结构化内容
    goal            TEXT,
    constraints     TEXT[],
    decisions       JSONB,                     -- [{what, why, who, confidence}]
    progress        TEXT[],
    artifacts       JSONB,                     -- [{ref, locator, desc}]
    next_actions    TEXT[],
    risks           TEXT[],
    open_questions  TEXT[],
    
    -- 原始轨迹引用
    trajectory_start INT,                      -- 起始消息索引
    trajectory_end   INT,                      -- 结束消息索引
    
    -- 时间戳
    created_at      TIMESTAMP DEFAULT NOW(),
    updated_at      TIMESTAMP DEFAULT NOW(),
    
    CONSTRAINT fk_user FOREIGN KEY (user_id) REFERENCES users(id)
);

CREATE INDEX idx_session_summaries_user ON session_summaries(user_id);
CREATE INDEX idx_session_summaries_project ON session_summaries(user_id, project_id);
```

```typescript
interface SessionSummary {
  id: string
  sessionId: string
  userId: string
  projectId?: string
  
  goal?: string
  constraints: string[]
  decisions: Decision[]
  progress: string[]
  artifacts: ArtifactRef[]
  nextActions: string[]
  risks: string[]
  openQuestions: string[]
  
  trajectoryStart: number
  trajectoryEnd: number
  
  createdAt: Date
  updatedAt: Date
}

interface Decision {
  what: string
  why: string
  who: string                    // 哪个高管做的决策
  confidence: 'high' | 'medium' | 'low'
}

interface ArtifactRef {
  ref: string                    // ART-001
  locator: string                // /docs/tech-spec.md
  desc: string                   // 技术方案文档
}
```

---

## 三、核心服务实现

### 3.1 Memory Controller Service

```typescript
/**
 * 记忆控制器 - 决定是否需要记忆、检索模式、token预算
 */
class MemoryControllerService {
  constructor(
    private claude: ClaudeClient,
    private config: MemoryControllerConfig
  ) {}

  /**
   * 分析用户消息，决定记忆策略
   */
  async analyze(input: MemoryControllerInput): Promise<MemoryControllerOutput> {
    const prompt = this.buildPrompt(input)
    
    const response = await this.claude.messages.create({
      model: 'claude-3-haiku-20240307',  // 用便宜的模型做判断
      max_tokens: 200,
      messages: [{ role: 'user', content: prompt }]
    })
    
    return this.parseResponse(response.content[0].text)
  }

  private buildPrompt(input: MemoryControllerInput): string {
    return `分析用户消息，决定是否需要检索记忆。

用户消息: "${input.userMessage}"

当前上下文:
- 项目ID: ${input.projectId || '无'}
- 高管: ${input.roleId}
- 会话消息数: ${input.messageCount}

判断规则:
1. 如果用户提到"之前"/"上次"/"我说过"等历史引用 → 需要记忆
2. 如果涉及项目历史决策 → 需要记忆
3. 如果需要个性化建议 → 需要记忆
4. 如果是通用问答或明确的新任务 → 不需要记忆

返回JSON (不要任何其他内容):
{
  "need_memory": "yes|no|maybe",
  "memory_types": ["project_decision", "user_preference"],
  "retrieval_mode": "catalog|details",
  "budget_tokens": 500,
  "time_range": "last_7_days|last_30_days|all",
  "notes": "简短说明原因"
}`
  }

  private parseResponse(text: string): MemoryControllerOutput {
    try {
      const json = JSON.parse(text)
      return {
        needMemory: json.need_memory as 'yes' | 'no' | 'maybe',
        memoryTypes: json.memory_types || [],
        retrievalMode: json.retrieval_mode || 'catalog',
        budgetTokens: json.budget_tokens || 500,
        timeRange: json.time_range || 'last_30_days',
        notes: json.notes
      }
    } catch {
      // 解析失败，返回保守默认值
      return {
        needMemory: 'maybe',
        memoryTypes: [],
        retrievalMode: 'catalog',
        budgetTokens: 300,
        timeRange: 'last_30_days',
        notes: 'Parse failed, using defaults'
      }
    }
  }
}

interface MemoryControllerInput {
  userMessage: string
  projectId?: string
  roleId: string
  messageCount: number
  recentContext?: string
}

interface MemoryControllerOutput {
  needMemory: 'yes' | 'no' | 'maybe'
  memoryTypes: MemoryType[]
  retrievalMode: 'catalog' | 'details'
  budgetTokens: number
  timeRange: 'last_7_days' | 'last_30_days' | 'all'
  notes?: string
}
```

### 3.2 Memory Retriever Service

```typescript
/**
 * 记忆检索器 - 两阶段检索 (Catalog → Details)
 */
class MemoryRetrieverService {
  constructor(
    private pinecone: Pinecone,
    private db: Database,
    private embedding: EmbeddingService
  ) {}

  /**
   * 阶段1: Catalog检索 - 返回记忆目录
   */
  async retrieveCatalog(input: RetrievalInput): Promise<MemoryCatalogEntry[]> {
    // 1. 生成查询向量
    const queryVector = await this.embedding.embed(input.query)
    
    // 2. 向量检索
    const namespace = `user_${input.userId}_${input.roleId}`
    const results = await this.pinecone
      .index('thinkus-memories')
      .namespace(namespace)
      .query({
        vector: queryVector,
        topK: input.limit || 10,
        filter: this.buildFilter(input),
        includeMetadata: true
      })
    
    // 3. 转换为Catalog格式
    return results.matches.map(match => ({
      id: match.id.replace('memory_', ''),
      summary: match.metadata?.summary as string,
      type: match.metadata?.type as MemoryType,
      importance: match.metadata?.importance as number,
      createdAt: new Date(match.metadata?.createdAt as string),
      tags: match.metadata?.tags as string[],
      score: match.score
    }))
  }

  /**
   * 阶段2: Details获取 - 返回完整内容
   */
  async retrieveDetails(memoryIds: string[]): Promise<MemoryDetails[]> {
    const memories = await this.db.memories.findMany({
      where: {
        id: { in: memoryIds },
        status: 'active'
      }
    })
    
    // 更新访问时间和新鲜度
    await this.updateAccessStats(memoryIds)
    
    return memories.map(m => ({
      id: m.id,
      summary: m.summary,
      content: m.content,
      context: this.buildContext(m),
      decisions: this.extractDecisions(m),
      refs: this.extractRefs(m)
    }))
  }

  /**
   * 一站式检索 - 根据模式自动处理
   */
  async retrieve(input: RetrievalInput): Promise<RetrievalResult> {
    if (input.mode === 'catalog') {
      const catalog = await this.retrieveCatalog(input)
      return { mode: 'catalog', catalog, details: [] }
    } else {
      // Details模式: 先Catalog再Details
      const catalog = await this.retrieveCatalog(input)
      
      // 取前N个最相关的
      const topIds = catalog.slice(0, 5).map(c => c.id)
      const details = await this.retrieveDetails(topIds)
      
      return { mode: 'details', catalog, details }
    }
  }

  private buildFilter(input: RetrievalInput): object {
    const filter: any = {
      status: 'active'
    }
    
    if (input.projectId) {
      // 项目记忆 OR 跨项目记忆
      filter.$or = [
        { projectId: input.projectId },
        { projectId: { $exists: false } }
      ]
    }
    
    if (input.memoryTypes?.length) {
      filter.type = { $in: input.memoryTypes }
    }
    
    if (input.timeRange) {
      const days = input.timeRange === 'last_7_days' ? 7 
                 : input.timeRange === 'last_30_days' ? 30 
                 : 365
      const since = new Date(Date.now() - days * 24 * 60 * 60 * 1000)
      filter.createdAt = { $gte: since.toISOString() }
    }
    
    return filter
  }

  private async updateAccessStats(memoryIds: string[]) {
    const now = new Date()
    await this.db.memories.updateMany({
      where: { id: { in: memoryIds } },
      data: {
        lastAccessed: now,
        // 提升新鲜度 (访问时 +0.5，最高5)
        freshness: { increment: 0.5 }
      }
    })
  }
}

interface RetrievalInput {
  userId: string
  roleId: string
  projectId?: string
  query: string
  mode: 'catalog' | 'details'
  memoryTypes?: MemoryType[]
  timeRange?: 'last_7_days' | 'last_30_days' | 'all'
  limit?: number
}

interface MemoryCatalogEntry {
  id: string
  summary: string
  type: MemoryType
  importance: number
  createdAt: Date
  tags: string[]
  score?: number
}

interface MemoryDetails {
  id: string
  summary: string
  content: string
  context: string
  decisions: string[]
  refs: ArtifactRef[]
}

interface RetrievalResult {
  mode: 'catalog' | 'details'
  catalog: MemoryCatalogEntry[]
  details: MemoryDetails[]
}
```

### 3.3 Artifact Service

```typescript
/**
 * 产物管理服务 - 存储和检索工具结果
 */
class ArtifactService {
  constructor(
    private s3: S3Client,
    private db: Database,
    private claude: ClaudeClient
  ) {}

  /**
   * 存储产物 (Full内容)
   */
  async store(input: ArtifactStoreInput): Promise<Artifact> {
    const artifactId = generateId('art')
    
    // 1. 上传到S3
    const storagePath = `artifacts/${input.userId}/${input.sessionId}/${artifactId}`
    await this.s3.send(new PutObjectCommand({
      Bucket: process.env.ARTIFACT_BUCKET,
      Key: storagePath,
      Body: input.content,
      ContentType: input.mimeType
    }))
    
    // 2. 生成Compact摘要
    const compactSummary = await this.generateCompact(input)
    
    // 3. 存储元数据
    const artifact = await this.db.artifacts.create({
      data: {
        id: artifactId,
        userId: input.userId,
        projectId: input.projectId,
        sessionId: input.sessionId,
        toolCallId: input.toolCallId,
        storageType: 's3',
        storagePath,
        mimeType: input.mimeType,
        sizeBytes: Buffer.byteLength(input.content),
        compactSummary,
        metadata: input.metadata,
        expiresAt: input.expiresAt
      }
    })
    
    return artifact
  }

  /**
   * 获取产物 (支持局部读取)
   */
  async get(artifactId: string, options?: ArtifactGetOptions): Promise<string> {
    const artifact = await this.db.artifacts.findUnique({
      where: { id: artifactId }
    })
    
    if (!artifact) throw new Error('Artifact not found')
    
    // 获取完整内容
    const response = await this.s3.send(new GetObjectCommand({
      Bucket: process.env.ARTIFACT_BUCKET,
      Key: artifact.storagePath
    }))
    const content = await response.Body?.transformToString()
    
    if (!content) throw new Error('Artifact content is empty')
    
    // 局部读取
    if (options?.lines) {
      return this.extractLines(content, options.lines)
    }
    if (options?.bytes) {
      return this.extractBytes(content, options.bytes)
    }
    if (options?.jsonPath) {
      return this.extractJsonPath(content, options.jsonPath)
    }
    if (options?.search) {
      return this.extractSearch(content, options.search)
    }
    
    return content
  }

  /**
   * 获取Compact (用于注入上下文)
   */
  async getCompact(artifactId: string): Promise<ArtifactCompact> {
    const artifact = await this.db.artifacts.findUnique({
      where: { id: artifactId }
    })
    
    if (!artifact) throw new Error('Artifact not found')
    
    return {
      ref: artifact.id,
      type: this.getArtifactType(artifact.mimeType),
      path: artifact.metadata?.path,
      summary: artifact.compactSummary || '',
      size: this.formatSize(artifact.sizeBytes, artifact.mimeType),
      locator: this.getLocators(artifact.mimeType)
    }
  }

  /**
   * 生成Compact摘要
   */
  private async generateCompact(input: ArtifactStoreInput): Promise<string> {
    // 对于小内容，直接截断
    if (input.content.length < 500) {
      return input.content
    }
    
    // 对于大内容，用AI生成摘要
    const response = await this.claude.messages.create({
      model: 'claude-3-haiku-20240307',
      max_tokens: 300,
      messages: [{
        role: 'user',
        content: `生成以下内容的简短摘要 (不超过200字):

类型: ${input.mimeType}
内容:
${input.content.slice(0, 3000)}
${input.content.length > 3000 ? '...(截断)' : ''}

要求:
1. 说明这是什么类型的内容
2. 概括主要内容/功能
3. 如果是代码，列出主要函数/类
4. 如果是文档，列出主要章节`
      }]
    })
    
    return response.content[0].text
  }

  private extractLines(content: string, range: string): string {
    const [start, end] = range.split('-').map(Number)
    const lines = content.split('\n')
    return lines.slice(start - 1, end).join('\n')
  }

  private extractBytes(content: string, range: string): string {
    const [start, end] = range.split('-').map(Number)
    return content.slice(start, end)
  }

  private extractJsonPath(content: string, path: string): string {
    const obj = JSON.parse(content)
    const result = jsonpath.query(obj, path)
    return JSON.stringify(result, null, 2)
  }

  private extractSearch(content: string, keyword: string): string {
    const lines = content.split('\n')
    const matchIndexes: number[] = []
    
    lines.forEach((line, i) => {
      if (line.includes(keyword)) {
        matchIndexes.push(i)
      }
    })
    
    if (matchIndexes.length === 0) return ''
    
    // 返回匹配行及前后5行上下文
    const contextLines = 5
    const result: string[] = []
    
    matchIndexes.forEach(idx => {
      const start = Math.max(0, idx - contextLines)
      const end = Math.min(lines.length, idx + contextLines + 1)
      result.push(`// Lines ${start + 1}-${end}`)
      result.push(...lines.slice(start, end))
      result.push('')
    })
    
    return result.join('\n')
  }
}

interface ArtifactStoreInput {
  userId: string
  projectId?: string
  sessionId: string
  toolCallId?: string
  content: string
  mimeType: string
  metadata?: Record<string, any>
  expiresAt?: Date
}

interface ArtifactGetOptions {
  lines?: string      // "1-50"
  bytes?: string      // "0-1000"
  jsonPath?: string   // "$.data.users"
  search?: string     // "function login"
}
```

### 3.4 Session Summary Service

```typescript
/**
 * 会话摘要服务 - 生成和管理会话摘要
 */
class SessionSummaryService {
  constructor(
    private claude: ClaudeClient,
    private db: Database
  ) {}

  /**
   * 生成会话摘要
   */
  async generate(input: SessionSummaryInput): Promise<SessionSummary> {
    const prompt = this.buildPrompt(input)
    
    const response = await this.claude.messages.create({
      model: 'claude-3-5-sonnet-20241022',
      max_tokens: 2000,
      messages: [{ role: 'user', content: prompt }]
    })
    
    const summaryData = JSON.parse(response.content[0].text)
    
    // 存储到数据库
    const summary = await this.db.sessionSummaries.upsert({
      where: { sessionId: input.sessionId },
      create: {
        id: generateId('sum'),
        sessionId: input.sessionId,
        userId: input.userId,
        projectId: input.projectId,
        ...summaryData,
        trajectoryStart: input.trajectoryStart,
        trajectoryEnd: input.trajectoryEnd
      },
      update: {
        ...summaryData,
        trajectoryEnd: input.trajectoryEnd,
        updatedAt: new Date()
      }
    })
    
    return summary
  }

  /**
   * 获取最近的会话摘要
   */
  async getRecent(userId: string, projectId?: string, limit = 5): Promise<SessionSummary[]> {
    return this.db.sessionSummaries.findMany({
      where: {
        userId,
        ...(projectId ? { projectId } : {})
      },
      orderBy: { updatedAt: 'desc' },
      take: limit
    })
  }

  /**
   * 获取特定会话的摘要
   */
  async getBySessionId(sessionId: string): Promise<SessionSummary | null> {
    return this.db.sessionSummaries.findUnique({
      where: { sessionId }
    })
  }

  private buildPrompt(input: SessionSummaryInput): string {
    return `分析以下会话，生成结构化摘要。

会话消息:
${input.messages.map((m, i) => 
  `[${i}] ${m.role}: ${m.content.slice(0, 500)}${m.content.length > 500 ? '...' : ''}`
).join('\n\n')}

请返回JSON格式的摘要 (不要任何其他内容):
{
  "goal": "本次会话的主要目标",
  "constraints": ["约束条件1", "约束条件2"],
  "decisions": [
    {
      "what": "做了什么决策",
      "why": "为什么这样决策",
      "who": "哪个高管/用户",
      "confidence": "high|medium|low"
    }
  ],
  "progress": ["完成的事项1", "完成的事项2"],
  "artifacts": [
    {
      "ref": "ART-xxx",
      "locator": "文件路径或位置",
      "desc": "简短描述"
    }
  ],
  "next_actions": ["下一步行动1", "下一步行动2"],
  "risks": ["风险项1", "风险项2"],
  "open_questions": ["未解决的问题1"]
}`
  }
}

interface SessionSummaryInput {
  sessionId: string
  userId: string
  projectId?: string
  messages: Array<{
    role: string
    content: string
  }>
  trajectoryStart: number
  trajectoryEnd: number
}
```

### 3.5 Knowledge Manager Service

```typescript
/**
 * 知识管理服务 - 记忆写入、压缩、衰减、纠错
 */
class KnowledgeManagerService {
  constructor(
    private db: Database,
    private pinecone: Pinecone,
    private embedding: EmbeddingService,
    private claude: ClaudeClient
  ) {}

  /**
   * 从会话中提取并写入记忆
   */
  async extractAndWrite(input: MemoryExtractionInput): Promise<Memory[]> {
    // 1. 提取记忆候选
    const candidates = await this.extractCandidates(input)
    
    // 2. 评估每个候选
    const evaluated = await Promise.all(
      candidates.map(c => this.evaluateCandidate(c, input))
    )
    
    // 3. 过滤低质量候选
    const qualified = evaluated.filter(e => e.score >= 0.6)
    
    // 4. 检查重复和合并
    const deduplicated = await this.deduplicateAndMerge(qualified, input)
    
    // 5. 写入存储
    return Promise.all(
      deduplicated.map(c => this.writeMemory(c, input))
    )
  }

  /**
   * 执行记忆衰减 (定时任务)
   */
  async decayMemories(): Promise<void> {
    const decayRate = 0.98  // 每天衰减2%
    
    await this.db.$executeRaw`
      UPDATE memories 
      SET freshness = GREATEST(freshness * ${decayRate}, 0.1)
      WHERE status = 'active'
        AND last_accessed < NOW() - INTERVAL '1 day'
    `
  }

  /**
   * 纠正记忆
   */
  async correctMemory(input: MemoryCorrectionInput): Promise<void> {
    const { memoryId, action, evidence, newContent } = input
    
    switch (action) {
      case 'suppress':
        // 降低权重但保留
        await this.db.memories.update({
          where: { id: memoryId },
          data: {
            confidence: { decrement: 0.3 },
            status: 'suppressed'
          }
        })
        break
        
      case 'freeze':
        // 冻结，不再用于检索
        await this.db.memories.update({
          where: { id: memoryId },
          data: { status: 'frozen' }
        })
        break
        
      case 'replace':
        // 创建新记忆替换旧的
        const oldMemory = await this.db.memories.findUnique({
          where: { id: memoryId }
        })
        
        if (oldMemory && newContent) {
          // 创建新记忆
          const newMemory = await this.writeMemory({
            type: oldMemory.type,
            content: newContent,
            summary: newContent.slice(0, 100),
            importance: oldMemory.importance
          }, {
            userId: oldMemory.userId,
            roleId: oldMemory.roleId,
            projectId: oldMemory.projectId
          })
          
          // 标记旧记忆被替换
          await this.db.memories.update({
            where: { id: memoryId },
            data: {
              status: 'replaced',
              supersededBy: newMemory.id
            }
          })
        }
        break
    }
  }

  /**
   * 合并相似记忆
   */
  async mergeMemories(memoryIds: string[]): Promise<Memory> {
    const memories = await this.db.memories.findMany({
      where: { id: { in: memoryIds } }
    })
    
    // 使用AI合并内容
    const mergedContent = await this.claude.messages.create({
      model: 'claude-3-haiku-20240307',
      max_tokens: 500,
      messages: [{
        role: 'user',
        content: `合并以下相似的记忆为一条:

${memories.map((m, i) => `[${i + 1}] ${m.content}`).join('\n\n')}

返回合并后的内容 (不要任何其他内容):`
      }]
    })
    
    // 创建合并后的记忆
    const merged = await this.writeMemory({
      type: memories[0].type,
      content: mergedContent.content[0].text,
      summary: mergedContent.content[0].text.slice(0, 100),
      importance: Math.max(...memories.map(m => m.importance)),
      confidence: Math.min(...memories.map(m => m.confidence)) + 0.1,
      evidenceCount: memories.reduce((sum, m) => sum + m.evidenceCount, 0)
    }, {
      userId: memories[0].userId,
      roleId: memories[0].roleId,
      projectId: memories[0].projectId
    })
    
    // 标记原记忆被合并
    await this.db.memories.updateMany({
      where: { id: { in: memoryIds } },
      data: {
        status: 'replaced',
        supersededBy: merged.id
      }
    })
    
    return merged
  }

  private async extractCandidates(input: MemoryExtractionInput): Promise<MemoryCandidate[]> {
    const response = await this.claude.messages.create({
      model: 'claude-3-5-sonnet-20241022',
      max_tokens: 2000,
      messages: [{
        role: 'user',
        content: `从以下对话中提取值得记忆的要点:

${input.conversation}

返回JSON数组:
[{
  "type": "project_decision|user_preference|discussion_conclusion|action_item|constraint|risk|feedback",
  "content": "完整内容",
  "summary": "50字以内摘要",
  "importance": 1-5,
  "tags": ["tag1", "tag2"]
}]`
      }]
    })
    
    return JSON.parse(response.content[0].text)
  }

  private async evaluateCandidate(
    candidate: MemoryCandidate,
    input: MemoryExtractionInput
  ): Promise<EvaluatedCandidate> {
    // 简单评分: 基于类型和重要性
    let score = candidate.importance / 5
    
    // 用户直接输入的权重更高
    if (candidate.type === 'user_preference') score += 0.2
    
    // 决策类权重更高
    if (candidate.type === 'project_decision') score += 0.1
    
    return { ...candidate, score: Math.min(score, 1) }
  }

  private async deduplicateAndMerge(
    candidates: EvaluatedCandidate[],
    input: MemoryExtractionInput
  ): Promise<EvaluatedCandidate[]> {
    // 检查与现有记忆的相似度
    const result: EvaluatedCandidate[] = []
    
    for (const candidate of candidates) {
      const similar = await this.findSimilarMemory(candidate, input)
      
      if (similar && similar.similarity > 0.85) {
        // 太相似，更新现有记忆而非创建新的
        await this.db.memories.update({
          where: { id: similar.memoryId },
          data: {
            confidence: { increment: 0.1 },
            evidenceCount: { increment: 1 },
            lastAccessed: new Date()
          }
        })
      } else {
        result.push(candidate)
      }
    }
    
    return result
  }

  private async writeMemory(
    candidate: MemoryCandidate,
    context: MemoryContext
  ): Promise<Memory> {
    const memoryId = generateId('mem')
    
    // 生成向量
    const vector = await this.embedding.embed(
      `${candidate.summary}\n${candidate.content}`
    )
    
    // 存储到Pinecone
    const namespace = `user_${context.userId}_${context.roleId}`
    await this.pinecone
      .index('thinkus-memories')
      .namespace(namespace)
      .upsert([{
        id: `memory_${memoryId}`,
        values: vector,
        metadata: {
          userId: context.userId,
          roleId: context.roleId,
          projectId: context.projectId,
          type: candidate.type,
          content: candidate.content,
          summary: candidate.summary,
          importance: candidate.importance,
          confidence: candidate.confidence || 1.0,
          tags: candidate.tags,
          createdAt: new Date().toISOString()
        }
      }])
    
    // 存储到PostgreSQL
    return this.db.memories.create({
      data: {
        id: memoryId,
        userId: context.userId,
        roleId: context.roleId,
        projectId: context.projectId,
        sessionId: context.sessionId,
        type: candidate.type,
        content: candidate.content,
        summary: candidate.summary,
        importance: candidate.importance,
        confidence: candidate.confidence || 1.0,
        freshness: candidate.importance,
        evidenceCount: candidate.evidenceCount || 1,
        visibility: candidate.visibility || 'private',
        vectorId: `memory_${memoryId}`,
        source: context.source || 'discussion',
        tags: candidate.tags
      }
    })
  }
}

interface MemoryExtractionInput {
  userId: string
  roleId: string
  projectId?: string
  sessionId?: string
  conversation: string
  source?: string
}

interface MemoryCandidate {
  type: MemoryType
  content: string
  summary: string
  importance: number
  tags: string[]
  confidence?: number
  evidenceCount?: number
  visibility?: string
}

interface EvaluatedCandidate extends MemoryCandidate {
  score: number
}

interface MemoryCorrectionInput {
  memoryId: string
  action: 'suppress' | 'freeze' | 'replace'
  evidence?: string
  newContent?: string
}
```

---

## 四、API设计

### 4.1 Memory API

```typescript
// POST /api/memory/control
// 判断是否需要记忆
interface MemoryControlRequest {
  userMessage: string
  projectId?: string
  roleId: string
  messageCount: number
}

interface MemoryControlResponse {
  needMemory: 'yes' | 'no' | 'maybe'
  memoryTypes: string[]
  retrievalMode: 'catalog' | 'details'
  budgetTokens: number
  timeRange: string
}

// POST /api/memory/retrieve
// 检索记忆
interface MemoryRetrieveRequest {
  userId: string
  roleId: string
  projectId?: string
  query: string
  mode: 'catalog' | 'details'
  memoryTypes?: string[]
  timeRange?: string
  limit?: number
}

interface MemoryRetrieveResponse {
  mode: string
  catalog: MemoryCatalogEntry[]
  details: MemoryDetails[]
}

// POST /api/memory/write
// 写入记忆
interface MemoryWriteRequest {
  userId: string
  roleId: string
  projectId?: string
  sessionId?: string
  conversation: string
}

interface MemoryWriteResponse {
  memories: Memory[]
}

// POST /api/memory/correct
// 纠正记忆
interface MemoryCorrectionRequest {
  memoryId: string
  action: 'suppress' | 'freeze' | 'replace'
  evidence?: string
  newContent?: string
}
```

### 4.2 Artifact API

```typescript
// POST /api/artifacts
// 存储产物
interface ArtifactStoreRequest {
  userId: string
  projectId?: string
  sessionId: string
  toolCallId?: string
  content: string  // base64 for binary
  mimeType: string
  metadata?: Record<string, any>
}

interface ArtifactStoreResponse {
  artifact: Artifact
  compact: ArtifactCompact
}

// GET /api/artifacts/:id
// 获取产物 (支持局部读取)
interface ArtifactGetParams {
  lines?: string      // "1-50"
  bytes?: string      // "0-1000"
  jsonPath?: string   // "$.data"
  search?: string     // "function"
}

// GET /api/artifacts/:id/compact
// 获取Compact摘要
interface ArtifactCompactResponse {
  compact: ArtifactCompact
}
```

### 4.3 Session Summary API

```typescript
// POST /api/session/summary
// 生成会话摘要
interface SessionSummaryRequest {
  sessionId: string
  userId: string
  projectId?: string
  messages: Array<{
    role: string
    content: string
  }>
  trajectoryStart: number
  trajectoryEnd: number
}

interface SessionSummaryResponse {
  summary: SessionSummary
}

// GET /api/session/summary/:sessionId
// 获取特定会话摘要

// GET /api/session/summaries
// 获取最近的会话摘要
interface SessionSummariesParams {
  userId: string
  projectId?: string
  limit?: number
}
```

---

## 五、集成到现有系统

### 5.1 修改AI对话流程

```typescript
// 原流程
async function handleUserMessage(message: UserMessage) {
  // 1. 直接检索记忆
  const memories = await memoryService.retrieve(...)
  
  // 2. 构建prompt
  const prompt = buildPrompt(message, memories)
  
  // 3. 调用AI
  const response = await claude.messages.create(...)
  
  // 4. 返回结果
  return response
}

// 新流程
async function handleUserMessage(message: UserMessage) {
  // 1. 记忆控制器判断
  const control = await memoryController.analyze({
    userMessage: message.content,
    projectId: message.projectId,
    roleId: message.roleId,
    messageCount: getMessageCount(message.sessionId)
  })
  
  // 2. 按需检索记忆
  let memories: RetrievalResult | null = null
  if (control.needMemory !== 'no') {
    memories = await memoryRetriever.retrieve({
      userId: message.userId,
      roleId: message.roleId,
      projectId: message.projectId,
      query: message.content,
      mode: control.retrievalMode,
      memoryTypes: control.memoryTypes,
      timeRange: control.timeRange,
      limit: Math.floor(control.budgetTokens / 100)
    })
  }
  
  // 3. 获取相关Artifact的Compact
  const artifactCompacts = await getRelevantArtifactCompacts(message)
  
  // 4. 加载Session Summary (如果是新会话)
  const sessionSummary = await getSessionSummaryIfNeeded(message)
  
  // 5. 构建prompt (使用Compact而非Full)
  const prompt = buildPrompt(message, {
    memories: memories?.catalog || [],  // 或 memories?.details
    artifactCompacts,
    sessionSummary
  })
  
  // 6. 调用AI
  const response = await claude.messages.create(...)
  
  // 7. 处理工具调用结果
  if (response.toolCalls) {
    for (const call of response.toolCalls) {
      if (call.output) {
        // 存储为Artifact，注入Compact
        const artifact = await artifactService.store({
          userId: message.userId,
          sessionId: message.sessionId,
          toolCallId: call.id,
          content: call.output,
          mimeType: detectMimeType(call.output)
        })
        
        // 替换输出为Compact引用
        call.output = formatArtifactCompact(artifact)
      }
    }
  }
  
  // 8. 返回结果
  return response
}
```

### 5.2 定时任务

```typescript
// 记忆衰减 (每天运行一次)
cron.schedule('0 3 * * *', async () => {
  await knowledgeManager.decayMemories()
})

// 会话摘要生成 (会话结束时触发)
async function onSessionEnd(sessionId: string) {
  const session = await getSession(sessionId)
  
  await sessionSummaryService.generate({
    sessionId,
    userId: session.userId,
    projectId: session.projectId,
    messages: session.messages,
    trajectoryStart: 0,
    trajectoryEnd: session.messages.length - 1
  })
}
```

---

## 六、开发计划

### Phase 0: 止血 (1周)

| 任务 | 优先级 | 工作量 |
|------|--------|--------|
| Artifact存储服务 | P0 | 2天 |
| Compact生成 | P0 | 1天 |
| 引用注入格式 | P0 | 1天 |
| Session Summary Schema | P0 | 1天 |

### Phase 1: 可用 (2-3周)

| 任务 | 优先级 | 工作量 |
|------|--------|--------|
| Memory Controller | P0 | 3天 |
| 两阶段检索 | P0 | 3天 |
| Session Summary生成 | P1 | 2天 |
| 集成到对话流程 | P1 | 3天 |
| API开发 | P1 | 2天 |

### Phase 2: 稳定 (2-4周)

| 任务 | 优先级 | 工作量 |
|------|--------|--------|
| 记忆衰减任务 | P1 | 1天 |
| 记忆合并逻辑 | P1 | 2天 |
| Role隔离 | P1 | 2天 |
| 纠错机制 | P2 | 2天 |
| 用户管理界面 | P2 | 3天 |

### Phase 3: 强化 (持续)

| 任务 | 优先级 | 工作量 |
|------|--------|--------|
| 自动纠错检测 | P2 | 3天 |
| 跨高管Session共享 | P2 | 2天 |
| 性能优化 | P2 | 持续 |
| 监控和告警 | P2 | 2天 |

---

## 七、测试验证

### 7.1 单元测试

```typescript
describe('MemoryController', () => {
  it('should detect memory need for history reference', async () => {
    const result = await controller.analyze({
      userMessage: '我们上次讨论的技术方案是什么?',
      roleId: 'david',
      messageCount: 1
    })
    
    expect(result.needMemory).toBe('yes')
    expect(result.memoryTypes).toContain('project_decision')
  })
  
  it('should not need memory for general questions', async () => {
    const result = await controller.analyze({
      userMessage: 'React和Vue哪个更好?',
      roleId: 'david',
      messageCount: 1
    })
    
    expect(result.needMemory).toBe('no')
  })
})

describe('ArtifactService', () => {
  it('should generate compact for large content', async () => {
    const artifact = await service.store({
      content: 'x'.repeat(10000),
      mimeType: 'text/plain',
      ...
    })
    
    expect(artifact.compactSummary.length).toBeLessThan(500)
  })
  
  it('should support partial retrieval', async () => {
    const content = await service.get(artifactId, { lines: '1-10' })
    expect(content.split('\n').length).toBe(10)
  })
})
```

### 7.2 集成测试

```typescript
describe('Memory Flow', () => {
  it('should complete full memory cycle', async () => {
    // 1. 创建会话
    const session = await createSession(userId, projectId)
    
    // 2. 发送消息触发记忆提取
    await handleUserMessage({
      sessionId: session.id,
      content: '我喜欢简约的设计风格',
      ...
    })
    
    // 3. 验证记忆已写入
    const memories = await memoryRetriever.retrieve({
      userId,
      roleId: 'elena',
      query: '设计风格',
      mode: 'catalog'
    })
    
    expect(memories.catalog.length).toBeGreaterThan(0)
    expect(memories.catalog[0].summary).toContain('简约')
  })
})
```

### 7.3 跨模型测试

```yaml
测试目的:
  验证框架不会限制模型能力

测试方法:
  1. 同一任务在不同模型上运行
  2. 比较结果质量
  3. 如果强模型不提升 → 框架有问题

测试模型:
  - Claude 3 Haiku (基准)
  - Claude 3.5 Sonnet (中等)
  - Claude 3 Opus (最强)

预期:
  - Opus结果应明显优于Haiku
  - 如果差异不大，检查是否有harness hobbling
```

---

**配套文档**: [AI员工增强PRD文档](./03-AI-EMPLOYEE-PRD-UPGRADE.md)
