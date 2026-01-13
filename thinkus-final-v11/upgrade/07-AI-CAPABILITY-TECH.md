# Thinkus AI能力增强方案 - 技术架构文档

> **版本**: v1.0 | **日期**: 2026-01-15
>
> **给AI工程师**: 本文档包含Skills/Subagents/MCP/Browser的完整技术实现方案

---

## 一、架构总览

### 1.1 系统架构图

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                              用户请求                                        │
│                                  │                                           │
│                                  ▼                                           │
│  ┌───────────────────────────────────────────────────────────────────────┐  │
│  │                         AI Orchestrator                                │  │
│  │                        (任务编排中心)                                  │  │
│  └───────────────────────────────┬───────────────────────────────────────┘  │
│                                  │                                           │
│     ┌────────────────────────────┼────────────────────────────┐             │
│     │                            │                            │             │
│     ▼                            ▼                            ▼             │
│  ┌─────────────┐          ┌─────────────┐          ┌─────────────┐         │
│  │   Skill     │          │  Subagent   │          │    MCP      │         │
│  │   Loader    │          │  Manager    │          │   Client    │         │
│  │  加载技能   │          │  任务分解   │          │  服务连接   │         │
│  └──────┬──────┘          └──────┬──────┘          └──────┬──────┘         │
│         │                        │                        │                 │
│         ▼                        ▼                        ▼                 │
│  ┌─────────────┐          ┌─────────────┐          ┌─────────────┐         │
│  │   Skill     │          │   Agent     │          │    MCP      │         │
│  │   Store     │          │   Pool      │          │   Registry  │         │
│  └─────────────┘          └─────────────┘          └─────────────┘         │
│                                                                              │
│  ┌───────────────────────────────────────────────────────────────────────┐  │
│  │                        Browser Service                                 │  │
│  │  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐                 │  │
│  │  │ Live Preview │  │  Auto Test   │  │  Analyzer    │                 │  │
│  │  └──────────────┘  └──────────────┘  └──────────────┘                 │  │
│  └───────────────────────────────────────────────────────────────────────┘  │
│                                                                              │
└─────────────────────────────────────────────────────────────────────────────┘
```

---

## 二、Skills 技能系统

### 2.1 数据模型

```sql
-- 技能表
CREATE TABLE skills (
    id              VARCHAR(100) PRIMARY KEY,
    name            VARCHAR(200) NOT NULL,
    version         VARCHAR(20) NOT NULL,
    description     TEXT,
    category        VARCHAR(50) NOT NULL,
    owner_type      VARCHAR(20) NOT NULL,
    owner_id        VARCHAR(36),
    knowledge       JSONB NOT NULL,
    procedures      JSONB NOT NULL,
    templates       JSONB NOT NULL,
    best_practices  JSONB NOT NULL,
    applicable_roles TEXT[],
    applicable_project_types TEXT[],
    tags            TEXT[],
    usage_count     INT DEFAULT 0,
    created_at      TIMESTAMP DEFAULT NOW(),
    updated_at      TIMESTAMP DEFAULT NOW()
);

-- 项目技能关联
CREATE TABLE project_skills (
    project_id      VARCHAR(36) NOT NULL,
    skill_id        VARCHAR(100) NOT NULL,
    enabled         BOOLEAN DEFAULT true,
    priority        INT DEFAULT 0,
    PRIMARY KEY (project_id, skill_id)
);
```

```typescript
interface Skill {
  id: string
  name: string
  version: string
  description: string
  category: 'tech' | 'design' | 'business' | 'product'
  ownerType: 'system' | 'user'
  ownerId?: string
  knowledge: string[]
  procedures: Procedure[]
  templates: TemplateRef[]
  bestPractices: string[]
  applicableRoles: string[]
  applicableProjectTypes: string[]
  tags: string[]
}

interface Procedure {
  name: string
  steps: string[]
  inputs?: string[]
  outputs?: string[]
}
```

### 2.2 Skill Loader

```typescript
class SkillLoader {
  constructor(
    private skillStore: SkillStore,
    private claude: ClaudeClient
  ) {}
  
  /**
   * 加载适用的技能
   */
  async loadSkills(context: SkillContext): Promise<LoadedSkills> {
    // 1. 获取项目已启用的技能
    const projectSkills = context.projectId 
      ? await this.skillStore.getProjectSkills(context.projectId)
      : []
    
    // 2. 获取用户自定义技能
    const userSkills = await this.skillStore.getUserSkills(context.userId)
    
    // 3. 自动推荐技能
    const recommendedSkills = await this.recommendSkills(context)
    
    // 4. 合并去重
    const allSkills = this.mergeSkills([
      ...projectSkills,
      ...userSkills,
      ...recommendedSkills
    ])
    
    // 5. 过滤适用于当前角色的技能
    const applicableSkills = allSkills.filter(skill =>
      skill.applicableRoles.length === 0 ||
      skill.applicableRoles.includes(context.roleId)
    )
    
    // 6. 生成Prompt文本
    const promptText = this.formatSkillsForPrompt(applicableSkills)
    
    return {
      skills: applicableSkills,
      promptText,
      totalTokens: this.estimateTokens(promptText)
    }
  }
  
  /**
   * 格式化技能为Prompt
   */
  formatSkillsForPrompt(skills: Skill[]): string {
    if (skills.length === 0) return ''
    
    return `
## 专业技能

${skills.map(skill => `
### ${skill.name}

**知识要点:**
${skill.knowledge.map(k => `- ${k}`).join('\n')}

**执行流程:**
${skill.procedures.map(p => `
#### ${p.name}
${p.steps.map((s, i) => `${i + 1}. ${s}`).join('\n')}
`).join('\n')}

**最佳实践:**
${skill.bestPractices.map(b => `- ${b}`).join('\n')}
`).join('\n\n---\n\n')}
`
  }
  
  /**
   * 自动推荐技能
   */
  private async recommendSkills(context: SkillContext): Promise<Skill[]> {
    const allSystemSkills = await this.skillStore.getSystemSkills()
    
    const response = await this.claude.messages.create({
      model: 'claude-3-haiku-20240307',
      max_tokens: 500,
      messages: [{
        role: 'user',
        content: `根据任务推荐技能ID:
任务: ${context.taskDescription}
角色: ${context.roleId}
可用技能: ${allSystemSkills.map(s => `${s.id}: ${s.description}`).join('\n')}
返回JSON数组: ["skill-id-1", "skill-id-2"]`
      }]
    })
    
    try {
      const skillIds = JSON.parse(response.content[0].text)
      return allSystemSkills.filter(s => skillIds.includes(s.id))
    } catch {
      return []
    }
  }
}
```

### 2.3 预设系统技能示例

```typescript
// Next.js App Router 技能
export const NextJSSkill: Skill = {
  id: 'nextjs-app-router',
  name: 'Next.js App Router',
  version: '1.0',
  description: 'Next.js 14+ App Router 开发最佳实践',
  category: 'tech',
  ownerType: 'system',
  
  knowledge: [
    'App Router使用文件系统路由，page.tsx定义页面',
    'Server Components是默认的，需要"use client"启用客户端',
    'Server Actions处理表单，无需API路由',
    'loading.tsx和error.tsx处理加载和错误状态'
  ],
  
  procedures: [
    {
      name: '创建新页面',
      steps: [
        '在app目录下创建文件夹',
        '创建page.tsx文件',
        '如需布局创建layout.tsx',
        '如需加载状态创建loading.tsx'
      ]
    },
    {
      name: '数据获取',
      steps: [
        '在Server Component中使用async/await',
        '使用fetch并设置cache选项',
        '动态数据用cache: "no-store"',
        '静态数据用cache: "force-cache"'
      ]
    }
  ],
  
  templates: [
    { name: '基础页面', path: 'nextjs/page.tsx' },
    { name: 'API路由', path: 'nextjs/route.ts' }
  ],
  
  bestPractices: [
    '优先使用Server Components',
    '使用Suspense包裹异步组件',
    '使用Image组件优化图片',
    '使用Link组件客户端导航'
  ],
  
  applicableRoles: ['david'],
  applicableProjectTypes: ['web', 'saas', 'ecommerce'],
  tags: ['nextjs', 'react', 'frontend']
}

// 电商平台技能
export const EcommerceSkill: Skill = {
  id: 'ecommerce',
  name: '电商平台',
  version: '1.0',
  description: '电商平台开发最佳实践',
  category: 'product',
  ownerType: 'system',
  
  knowledge: [
    '购物车：未登录存localStorage，登录后同步服务端',
    '库存：下单预扣，支付确认，超时释放',
    '订单状态机：待支付→已支付→已发货→已完成',
    '价格计算必须在服务端，防止篡改'
  ],
  
  procedures: [
    {
      name: '实现购物车',
      steps: [
        '创建Cart Context管理状态',
        '实现addItem/removeItem/updateQuantity',
        '计算小计和总价',
        '登录时同步到服务端'
      ]
    },
    {
      name: '实现支付流程',
      steps: [
        '创建订单，状态=待支付',
        '调用Stripe创建PaymentIntent',
        '前端使用Stripe Elements',
        'Webhook接收支付结果',
        '更新订单状态'
      ]
    }
  ],
  
  templates: [
    { name: '商品列表', path: 'ecommerce/product-list.tsx' },
    { name: '购物车', path: 'ecommerce/cart.tsx' },
    { name: '结算页', path: 'ecommerce/checkout.tsx' }
  ],
  
  bestPractices: [
    '使用乐观更新提升购物车体验',
    'Webhook处理必须幂等',
    '敏感操作记录审计日志'
  ],
  
  applicableRoles: ['david', 'mike', 'frank'],
  applicableProjectTypes: ['ecommerce'],
  tags: ['ecommerce', 'payment', 'cart']
}
```

---

## 三、Subagents 并行协作

### 3.1 数据模型

```typescript
interface SubTask {
  id: string
  name: string
  description: string
  assignedRole: string
  input: any
  expectedOutput?: string
  dependencies: string[]
  priority: number
  status: 'pending' | 'running' | 'completed' | 'failed'
}

interface SubTaskResult {
  taskId: string
  status: 'success' | 'failed'
  output: any
  error?: string
  duration: number
  tokenUsage: number
}

interface SubagentExecution {
  id: string
  mainTaskId: string
  subTasks: SubTask[]
  results: SubTaskResult[]
  aggregatedResult?: any
  totalDuration: number
}
```

### 3.2 Subagent Manager

```typescript
class SubagentManager {
  constructor(
    private claude: ClaudeClient,
    private skillLoader: SkillLoader,
    private realtimeStream: RealtimeStreamService
  ) {}
  
  /**
   * 执行并行任务
   */
  async executeParallel(
    mainTask: string,
    context: ExecutionContext
  ): Promise<SubagentExecution> {
    const executionId = generateId('exec')
    const startTime = Date.now()
    
    // 1. 分解任务
    const subTasks = await this.decomposeTask(mainTask, context)
    
    // 2. 通知前端
    await this.realtimeStream.emit(context.projectId, {
      type: 'subagent_start',
      data: { executionId, subTasks }
    })
    
    // 3. 并行执行
    const results = await this.executeSubTasks(subTasks, context)
    
    // 4. 汇总结果
    const aggregatedResult = await this.aggregateResults(mainTask, results)
    
    return {
      id: executionId,
      mainTaskId: context.taskId,
      subTasks,
      results,
      aggregatedResult,
      totalDuration: Date.now() - startTime
    }
  }
  
  /**
   * 分解任务
   */
  async decomposeTask(
    mainTask: string,
    context: ExecutionContext
  ): Promise<SubTask[]> {
    const response = await this.claude.messages.create({
      model: 'claude-3-5-sonnet-20241022',
      max_tokens: 2000,
      messages: [{
        role: 'user',
        content: `将任务分解为可并行的子任务:

主任务: ${mainTask}
可用角色: ${context.availableRoles.join(', ')}

返回JSON数组:
[{
  "id": "task-1",
  "name": "任务名称",
  "description": "详细描述",
  "assignedRole": "角色ID",
  "input": "输入",
  "dependencies": [],
  "priority": 3
}]`
      }]
    })
    
    return JSON.parse(response.content[0].text).map((t: any) => ({
      ...t,
      status: 'pending'
    }))
  }
  
  /**
   * 并行执行子任务
   */
  async executeSubTasks(
    subTasks: SubTask[],
    context: ExecutionContext
  ): Promise<SubTaskResult[]> {
    const results: Map<string, SubTaskResult> = new Map()
    const pending = [...subTasks]
    
    while (pending.length > 0) {
      // 找出可执行的任务（依赖已完成）
      const executable = pending.filter(task =>
        task.dependencies.every(dep => 
          results.has(dep) && results.get(dep)!.status === 'success'
        )
      )
      
      if (executable.length === 0 && pending.length > 0) {
        // 检查依赖失败
        const failed = pending.filter(task =>
          task.dependencies.some(dep =>
            results.has(dep) && results.get(dep)!.status === 'failed'
          )
        )
        
        failed.forEach(task => {
          results.set(task.id, {
            taskId: task.id,
            status: 'failed',
            output: null,
            error: 'Dependency failed',
            duration: 0,
            tokenUsage: 0
          })
          pending.splice(pending.indexOf(task), 1)
        })
        
        if (failed.length === 0) {
          throw new Error('Circular dependency detected')
        }
        continue
      }
      
      // 并行执行
      const batchResults = await Promise.all(
        executable.map(task => this.executeSubTask(task, context, results))
      )
      
      batchResults.forEach(result => results.set(result.taskId, result))
      executable.forEach(task => {
        pending.splice(pending.findIndex(t => t.id === task.id), 1)
      })
      
      // 实时推送进度
      await this.realtimeStream.emit(context.projectId, {
        type: 'subagent_progress',
        data: {
          completed: results.size,
          total: subTasks.length,
          latestResults: batchResults
        }
      })
    }
    
    return Array.from(results.values())
  }
  
  /**
   * 执行单个子任务
   */
  private async executeSubTask(
    task: SubTask,
    context: ExecutionContext,
    previousResults: Map<string, SubTaskResult>
  ): Promise<SubTaskResult> {
    const startTime = Date.now()
    task.status = 'running'
    
    try {
      // 加载技能
      const { promptText: skillsPrompt } = await this.skillLoader.loadSkills({
        roleId: task.assignedRole,
        projectType: context.projectType,
        taskDescription: task.description,
        projectId: context.projectId,
        userId: context.userId
      })
      
      // 构建依赖上下文
      const depContext = task.dependencies
        .map(depId => {
          const result = previousResults.get(depId)
          return result ? `[${depId}]: ${JSON.stringify(result.output)}` : ''
        })
        .filter(Boolean)
        .join('\n')
      
      // 执行
      const response = await this.claude.messages.create({
        model: 'claude-3-5-sonnet-20241022',
        max_tokens: 4000,
        messages: [{
          role: 'user',
          content: `你是${task.assignedRole}，执行任务:

${skillsPrompt}

## 任务
${task.description}

## 输入
${JSON.stringify(task.input)}

${depContext ? `## 依赖结果\n${depContext}` : ''}

请直接输出结果。`
        }]
      })
      
      task.status = 'completed'
      
      return {
        taskId: task.id,
        status: 'success',
        output: response.content[0].text,
        duration: Date.now() - startTime,
        tokenUsage: response.usage?.total_tokens || 0
      }
    } catch (error) {
      task.status = 'failed'
      return {
        taskId: task.id,
        status: 'failed',
        output: null,
        error: error.message,
        duration: Date.now() - startTime,
        tokenUsage: 0
      }
    }
  }
  
  /**
   * 汇总结果
   */
  async aggregateResults(
    mainTask: string,
    results: SubTaskResult[]
  ): Promise<any> {
    const success = results.filter(r => r.status === 'success')
    const failed = results.filter(r => r.status === 'failed')
    
    const response = await this.claude.messages.create({
      model: 'claude-3-5-sonnet-20241022',
      max_tokens: 4000,
      messages: [{
        role: 'user',
        content: `汇总子任务结果:

## 原始任务
${mainTask}

## 成功的子任务
${success.map(r => `### ${r.taskId}\n${r.output}`).join('\n\n')}

${failed.length > 0 ? `## 失败的子任务\n${failed.map(r => `- ${r.taskId}: ${r.error}`).join('\n')}` : ''}

请综合生成最终输出。`
      }]
    })
    
    return {
      summary: response.content[0].text,
      successCount: success.length,
      failedCount: failed.length
    }
  }
}
```

---

## 四、MCP 服务连接

### 4.1 数据模型

```sql
-- MCP服务注册
CREATE TABLE mcp_servers (
    id              VARCHAR(50) PRIMARY KEY,
    name            VARCHAR(100) NOT NULL,
    description     TEXT,
    category        VARCHAR(50) NOT NULL,
    connection_type VARCHAR(20) NOT NULL,
    auth_config     JSONB NOT NULL,
    capabilities    JSONB NOT NULL,
    status          VARCHAR(20) DEFAULT 'active'
);

-- 用户MCP连接
CREATE TABLE user_mcp_connections (
    id              VARCHAR(36) PRIMARY KEY,
    user_id         VARCHAR(36) NOT NULL,
    server_id       VARCHAR(50) NOT NULL,
    credentials     BYTEA NOT NULL,
    status          VARCHAR(20) DEFAULT 'active',
    metadata        JSONB,
    connected_at    TIMESTAMP DEFAULT NOW(),
    last_used_at    TIMESTAMP,
    UNIQUE (user_id, server_id)
);
```

```typescript
interface MCPServer {
  id: string
  name: string
  description: string
  category: 'dev' | 'analytics' | 'payment' | 'collaboration'
  connectionType: 'oauth' | 'apikey'
  authConfig: OAuthConfig | APIKeyConfig
  capabilities: MCPCapability[]
}

interface MCPCapability {
  name: string
  description: string
  inputSchema: JSONSchema
  outputSchema: JSONSchema
}
```

### 4.2 MCP Registry

```typescript
class MCPRegistry {
  private servers: Map<string, MCPServer> = new Map()
  
  constructor() {
    this.registerBuiltinServers()
  }
  
  private registerBuiltinServers() {
    // GitHub
    this.register({
      id: 'github',
      name: 'GitHub',
      description: '代码仓库管理',
      category: 'dev',
      connectionType: 'oauth',
      authConfig: {
        provider: 'github',
        authUrl: 'https://github.com/login/oauth/authorize',
        tokenUrl: 'https://github.com/login/oauth/access_token',
        scopes: ['repo', 'read:user'],
        clientId: process.env.GITHUB_CLIENT_ID!
      },
      capabilities: [
        {
          name: 'list_repos',
          description: '列出仓库',
          inputSchema: { type: 'object' },
          outputSchema: { type: 'array' }
        },
        {
          name: 'get_file',
          description: '获取文件',
          inputSchema: {
            type: 'object',
            properties: {
              repo: { type: 'string' },
              path: { type: 'string' }
            },
            required: ['repo', 'path']
          },
          outputSchema: { type: 'object' }
        },
        {
          name: 'create_or_update_file',
          description: '创建/更新文件',
          inputSchema: {
            type: 'object',
            properties: {
              repo: { type: 'string' },
              path: { type: 'string' },
              content: { type: 'string' },
              message: { type: 'string' }
            },
            required: ['repo', 'path', 'content', 'message']
          },
          outputSchema: { type: 'object' }
        },
        {
          name: 'create_pull_request',
          description: '创建PR',
          inputSchema: {
            type: 'object',
            properties: {
              repo: { type: 'string' },
              title: { type: 'string' },
              head: { type: 'string' },
              base: { type: 'string' }
            },
            required: ['repo', 'title', 'head', 'base']
          },
          outputSchema: { type: 'object' }
        }
      ]
    })
    
    // Vercel
    this.register({
      id: 'vercel',
      name: 'Vercel',
      description: '部署和域名',
      category: 'dev',
      connectionType: 'oauth',
      authConfig: {
        provider: 'vercel',
        authUrl: 'https://vercel.com/oauth/authorize',
        tokenUrl: 'https://vercel.com/oauth/access_token',
        scopes: [],
        clientId: process.env.VERCEL_CLIENT_ID!
      },
      capabilities: [
        {
          name: 'list_projects',
          description: '列出项目',
          inputSchema: { type: 'object' },
          outputSchema: { type: 'array' }
        },
        {
          name: 'create_deployment',
          description: '创建部署',
          inputSchema: {
            type: 'object',
            properties: {
              name: { type: 'string' },
              gitSource: { type: 'object' }
            },
            required: ['name']
          },
          outputSchema: { type: 'object' }
        },
        {
          name: 'add_domain',
          description: '添加域名',
          inputSchema: {
            type: 'object',
            properties: {
              projectId: { type: 'string' },
              domain: { type: 'string' }
            },
            required: ['projectId', 'domain']
          },
          outputSchema: { type: 'object' }
        }
      ]
    })
    
    // Stripe
    this.register({
      id: 'stripe',
      name: 'Stripe',
      description: '支付和收入',
      category: 'payment',
      connectionType: 'oauth',
      authConfig: {
        provider: 'stripe',
        authUrl: 'https://connect.stripe.com/oauth/authorize',
        tokenUrl: 'https://connect.stripe.com/oauth/token',
        scopes: ['read_write'],
        clientId: process.env.STRIPE_CLIENT_ID!
      },
      capabilities: [
        {
          name: 'get_balance',
          description: '获取余额',
          inputSchema: { type: 'object' },
          outputSchema: { type: 'object' }
        },
        {
          name: 'list_subscriptions',
          description: '列出订阅',
          inputSchema: {
            type: 'object',
            properties: {
              limit: { type: 'number' },
              status: { type: 'string' }
            }
          },
          outputSchema: { type: 'array' }
        },
        {
          name: 'get_revenue_stats',
          description: '收入统计',
          inputSchema: {
            type: 'object',
            properties: {
              startDate: { type: 'string' },
              endDate: { type: 'string' }
            }
          },
          outputSchema: { type: 'object' }
        }
      ]
    })
    
    // Google Analytics
    this.register({
      id: 'google-analytics',
      name: 'Google Analytics',
      description: '流量分析',
      category: 'analytics',
      connectionType: 'oauth',
      authConfig: {
        provider: 'google',
        authUrl: 'https://accounts.google.com/o/oauth2/v2/auth',
        tokenUrl: 'https://oauth2.googleapis.com/token',
        scopes: ['https://www.googleapis.com/auth/analytics.readonly'],
        clientId: process.env.GOOGLE_CLIENT_ID!
      },
      capabilities: [
        {
          name: 'get_report',
          description: '获取分析报告',
          inputSchema: {
            type: 'object',
            properties: {
              propertyId: { type: 'string' },
              startDate: { type: 'string' },
              endDate: { type: 'string' },
              metrics: { type: 'array' }
            },
            required: ['propertyId', 'startDate', 'endDate', 'metrics']
          },
          outputSchema: { type: 'object' }
        }
      ]
    })
  }
  
  register(server: MCPServer): void {
    this.servers.set(server.id, server)
  }
  
  get(serverId: string): MCPServer | undefined {
    return this.servers.get(serverId)
  }
  
  list(category?: string): MCPServer[] {
    const all = Array.from(this.servers.values())
    return category ? all.filter(s => s.category === category) : all
  }
}
```

### 4.3 MCP Client

```typescript
class MCPClient {
  constructor(
    private registry: MCPRegistry,
    private connectionStore: MCPConnectionStore,
    private encryption: EncryptionService
  ) {}
  
  /**
   * 调用MCP服务
   */
  async call(
    userId: string,
    serverId: string,
    capability: string,
    input: any
  ): Promise<any> {
    // 1. 获取服务
    const server = this.registry.get(serverId)
    if (!server) throw new MCPError('SERVER_NOT_FOUND')
    
    // 2. 获取连接
    const connection = await this.connectionStore.getConnection(userId, serverId)
    if (!connection) throw new MCPError('NOT_CONNECTED')
    
    // 3. 解密凭证
    const credentials = await this.encryption.decrypt(connection.credentials)
    
    // 4. 执行调用
    return this.executeCall(server, capability, credentials, input)
  }
  
  private async executeCall(
    server: MCPServer,
    capability: string,
    credentials: any,
    input: any
  ): Promise<any> {
    switch (server.id) {
      case 'github':
        return this.callGitHub(capability, credentials, input)
      case 'vercel':
        return this.callVercel(capability, credentials, input)
      case 'stripe':
        return this.callStripe(capability, credentials, input)
      case 'google-analytics':
        return this.callGoogleAnalytics(capability, credentials, input)
      default:
        throw new MCPError('UNSUPPORTED_SERVER')
    }
  }
  
  private async callGitHub(capability: string, credentials: any, input: any) {
    const octokit = new Octokit({ auth: credentials.accessToken })
    
    switch (capability) {
      case 'list_repos':
        const { data: repos } = await octokit.repos.listForAuthenticatedUser()
        return repos.map(r => ({ name: r.name, url: r.html_url }))
      
      case 'get_file':
        const { data: file } = await octokit.repos.getContent({
          owner: input.repo.split('/')[0],
          repo: input.repo.split('/')[1],
          path: input.path
        })
        return {
          content: Buffer.from((file as any).content, 'base64').toString('utf-8'),
          sha: (file as any).sha
        }
      
      case 'create_or_update_file':
        const [owner, repo] = input.repo.split('/')
        let sha: string | undefined
        try {
          const existing = await octokit.repos.getContent({ owner, repo, path: input.path })
          sha = (existing.data as any).sha
        } catch {}
        
        return octokit.repos.createOrUpdateFileContents({
          owner, repo,
          path: input.path,
          message: input.message,
          content: Buffer.from(input.content).toString('base64'),
          sha
        })
      
      case 'create_pull_request':
        const { data: pr } = await octokit.pulls.create({
          owner: input.repo.split('/')[0],
          repo: input.repo.split('/')[1],
          title: input.title,
          head: input.head,
          base: input.base || 'main'
        })
        return { number: pr.number, url: pr.html_url }
    }
  }
  
  private async callVercel(capability: string, credentials: any, input: any) {
    const headers = {
      'Authorization': `Bearer ${credentials.accessToken}`,
      'Content-Type': 'application/json'
    }
    
    switch (capability) {
      case 'list_projects':
        const res = await fetch('https://api.vercel.com/v9/projects', { headers })
        const { projects } = await res.json()
        return projects.map((p: any) => ({ id: p.id, name: p.name }))
      
      case 'create_deployment':
        return fetch('https://api.vercel.com/v13/deployments', {
          method: 'POST',
          headers,
          body: JSON.stringify(input)
        }).then(r => r.json())
      
      case 'add_domain':
        return fetch(`https://api.vercel.com/v10/projects/${input.projectId}/domains`, {
          method: 'POST',
          headers,
          body: JSON.stringify({ name: input.domain })
        }).then(r => r.json())
    }
  }
  
  private async callStripe(capability: string, credentials: any, input: any) {
    const stripe = new Stripe(credentials.accessToken)
    
    switch (capability) {
      case 'get_balance':
        return stripe.balance.retrieve()
      
      case 'list_subscriptions':
        return stripe.subscriptions.list({ limit: input.limit || 10 })
      
      case 'get_revenue_stats':
        const charges = await stripe.charges.list({
          created: {
            gte: Math.floor(new Date(input.startDate).getTime() / 1000),
            lte: Math.floor(new Date(input.endDate).getTime() / 1000)
          }
        })
        const total = charges.data
          .filter(c => c.status === 'succeeded')
          .reduce((sum, c) => sum + c.amount, 0)
        return { totalRevenue: total / 100, currency: 'usd' }
    }
  }
  
  private async callGoogleAnalytics(capability: string, credentials: any, input: any) {
    const headers = {
      'Authorization': `Bearer ${credentials.accessToken}`,
      'Content-Type': 'application/json'
    }
    
    switch (capability) {
      case 'get_report':
        return fetch(
          `https://analyticsdata.googleapis.com/v1beta/properties/${input.propertyId}:runReport`,
          {
            method: 'POST',
            headers,
            body: JSON.stringify({
              dateRanges: [{ startDate: input.startDate, endDate: input.endDate }],
              metrics: input.metrics.map((m: string) => ({ name: m }))
            })
          }
        ).then(r => r.json())
    }
  }
}

class MCPError extends Error {
  constructor(public code: string) {
    super(code)
  }
}
```

---

## 五、Browser Service 集成

### 5.1 集成 agent-browser

详细实现请参考 [05-AGENT-BROWSER-INTEGRATION.md](./05-AGENT-BROWSER-INTEGRATION.md)

```typescript
class BrowserService {
  constructor(private sandboxManager: SandboxManager) {}
  
  async open(projectId: string, url: string): Promise<void> {
    await this.exec(projectId, `open ${url}`)
    await this.exec(projectId, 'wait --load networkidle')
  }
  
  async getSnapshot(projectId: string, options?: { interactive?: boolean }): Promise<PageSnapshot> {
    const flags = options?.interactive ? '-i' : ''
    return this.exec(projectId, `snapshot ${flags} --json`)
  }
  
  async screenshot(projectId: string, options?: { device?: string }): Promise<string> {
    if (options?.device) {
      await this.exec(projectId, `set device "${options.device}"`)
    }
    const filename = `screenshot-${Date.now()}.png`
    await this.exec(projectId, `screenshot /tmp/${filename}`)
    return this.uploadScreenshot(projectId, filename)
  }
  
  async action(projectId: string, action: string, target: string, value?: string) {
    const cmd = value ? `${action} ${target} "${value}"` : `${action} ${target}`
    return this.exec(projectId, cmd)
  }
  
  private async exec(projectId: string, cmd: string) {
    return this.sandboxManager.execBrowserCommand(projectId, cmd)
  }
}
```

---

## 六、API 设计

### 6.1 Skills API

```typescript
// GET /api/skills
// 列出可用技能
interface ListSkillsResponse {
  system: Skill[]
  user: Skill[]
  recommended: Skill[]
}

// POST /api/skills
// 创建用户技能
interface CreateSkillRequest {
  name: string
  description: string
  category: string
  knowledge: string[]
  procedures: Procedure[]
  bestPractices: string[]
}

// PUT /api/projects/:projectId/skills
// 更新项目技能配置
interface UpdateProjectSkillsRequest {
  skills: { skillId: string; enabled: boolean; priority: number }[]
}
```

### 6.2 Subagents API

```typescript
// POST /api/subagents/execute
// 执行并行任务
interface ExecuteSubagentsRequest {
  task: string
  projectId?: string
  roles?: string[]
}

interface ExecuteSubagentsResponse {
  executionId: string
  subTasks: SubTask[]
  results: SubTaskResult[]
  aggregatedResult: any
  duration: number
}
```

### 6.3 MCP API

```typescript
// GET /api/mcp/servers
// 列出可用服务
interface ListServersResponse {
  servers: MCPServer[]
}

// POST /api/mcp/connect/:serverId
// 连接服务 (返回OAuth URL)
interface ConnectResponse {
  authUrl: string
}

// POST /api/mcp/call
// 调用服务
interface MCPCallRequest {
  serverId: string
  capability: string
  input: any
}

// GET /api/mcp/connections
// 获取用户连接的服务
interface ConnectionsResponse {
  connections: MCPConnection[]
}

// DELETE /api/mcp/connections/:serverId
// 断开服务连接
```

---

## 七、WebSocket 事件

```typescript
// Subagents事件
type SubagentEvent =
  | { type: 'subagent_start'; data: { executionId: string; subTasks: SubTask[] } }
  | { type: 'subagent_progress'; data: { completed: number; total: number; latestResults: SubTaskResult[] } }
  | { type: 'subagent_task_start'; data: { taskId: string; role: string } }
  | { type: 'subagent_complete'; data: { results: SubTaskResult[]; aggregatedResult: any } }

// Browser事件
type BrowserEvent =
  | { type: 'preview_update'; data: { screenshot: string; device: string } }
  | { type: 'test_progress'; data: { current: number; total: number; testName: string } }
  | { type: 'test_result'; data: { name: string; passed: boolean; error?: string } }
```

---

## 八、开发计划

### P0: Skills基础 (2周)

| 任务 | 工作量 |
|------|--------|
| 数据模型和Store | 2天 |
| SkillLoader实现 | 3天 |
| 预设系统技能 (10个) | 3天 |
| 集成到Agent流程 | 2天 |

### P1: Subagents (2周)

| 任务 | 工作量 |
|------|--------|
| SubagentManager实现 | 3天 |
| 任务分解逻辑 | 2天 |
| 并行执行和汇总 | 3天 |
| 前端进度展示 | 2天 |

### P2: MCP连接 (2周)

| 任务 | 工作量 |
|------|--------|
| MCP框架和Registry | 2天 |
| OAuth流程 | 2天 |
| GitHub MCP实现 | 2天 |
| Vercel MCP实现 | 2天 |
| Stripe/Analytics MCP | 2天 |

### P3: Browser集成 (已完成)

参考 [05-AGENT-BROWSER-INTEGRATION.md](./05-AGENT-BROWSER-INTEGRATION.md)

---

## 九、配置示例

### 环境变量

```bash
# MCP OAuth
GITHUB_CLIENT_ID=xxx
GITHUB_CLIENT_SECRET=xxx
VERCEL_CLIENT_ID=xxx
VERCEL_CLIENT_SECRET=xxx
STRIPE_CLIENT_ID=xxx
STRIPE_CLIENT_SECRET=xxx
GOOGLE_CLIENT_ID=xxx
GOOGLE_CLIENT_SECRET=xxx

# 加密
ENCRYPTION_KEY=xxx

# agent-browser
AGENT_BROWSER_HEADLESS=true
AGENT_BROWSER_TIMEOUT=30000
```

---

**配套文档**:
- [AI能力增强PRD](./06-AI-CAPABILITY-PRD.md)
- [agent-browser集成](./05-AGENT-BROWSER-INTEGRATION.md)
