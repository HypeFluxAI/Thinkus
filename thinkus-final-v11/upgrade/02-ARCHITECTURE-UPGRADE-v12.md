# Thinkus 技术架构升级文档 v12

> **版本**: v12 | **日期**: 2026-01-15
>
> **核心聚焦**: 帮用户开发产品 → 运营维护 → 赚到钱

---

## 一、架构升级总览

### 1.1 原架构 vs 新架构

```
原架构 (v11):
┌─────────────────────────────────────────────────────────────────┐
│  用户文字描述 → tRPC API → AI对话生成代码 → 返回代码文件       │
│                                                                  │
│  问题:                                                           │
│  - 只支持文字输入                                                │
│  - AI不执行代码，只生成                                          │
│  - 用户看不到过程                                                │
│  - 所有任务用同一个模型                                          │
└─────────────────────────────────────────────────────────────────┘

新架构 (v12):
┌─────────────────────────────────────────────────────────────────┐
│                                                                  │
│  多格式输入 ──→ 文档处理层 ──→ 需求理解                        │
│  (PDF/图片/Excel)     ↓                                         │
│                    结构化需求                                    │
│                       ↓                                          │
│                  任务调度层 ──→ 选择模型 (分层调度)             │
│                       ↓         匹配经验 (经验库)               │
│                  AI执行层 ──→ 在沙盒中执行                      │
│                       ↓                                          │
│                  实时推送层 ──→ 工作直播给用户                  │
│                       ↓                                          │
│                  运营数据层 ──→ 收集分析 → 增长建议             │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
```

### 1.2 新增组件清单

| 组件 | 类型 | 优先级 | 说明 |
|------|------|--------|------|
| DocumentProcessor | 新增 | P1 | 多格式文档处理 |
| ModelRouter | 新增 | P0 | 分层模型调度 |
| ExperienceLibrary | 新增 | P0 | 经验库存储和匹配 |
| SandboxManager | 新增 | P1 | 开发沙盒管理 |
| RealtimeStream | 新增 | P1 | 实时推送服务 |
| AnalyticsService | 新增 | P2 | 运营数据分析 |
| GrowthAdvisor | 新增 | P2 | 增长建议引擎 |

---

## 二、[新增] 文档处理层

### 2.1 架构设计

```
┌─────────────────────────────────────────────────────────────────┐
│                     DocumentProcessor                            │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│  ┌──────────┐  ┌──────────┐  ┌──────────┐  ┌──────────┐       │
│  │ PDF处理  │  │ 图片处理 │  │ Excel    │  │ 网页抓取 │       │
│  │ Mistral  │  │ Claude   │  │ SheetJS  │  │ Puppeteer│       │
│  │ OCR      │  │ Vision   │  │          │  │          │       │
│  └────┬─────┘  └────┬─────┘  └────┬─────┘  └────┬─────┘       │
│       │             │             │             │               │
│       └─────────────┴──────┬──────┴─────────────┘               │
│                            ▼                                     │
│                    ┌──────────────┐                             │
│                    │ 需求整合器   │                             │
│                    │ Claude       │                             │
│                    └──────┬───────┘                             │
│                           ▼                                      │
│                   结构化需求文档                                 │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
```

### 2.2 接口定义

```typescript
// 文档处理服务接口
interface DocumentProcessor {
  // 处理上传的文件
  process(files: UploadedFile[]): Promise<ProcessedResult>
  
  // 处理URL链接
  processURL(url: string): Promise<ProcessedResult>
}

// 上传文件
interface UploadedFile {
  id: string
  name: string
  type: FileType
  size: number
  buffer: Buffer
}

type FileType = 
  | 'pdf' 
  | 'word' 
  | 'excel' 
  | 'image' 
  | 'markdown' 
  | 'text'

// 处理结果
interface ProcessedResult {
  // 识别的文件内容类型
  contentType: ContentType
  
  // 提取的原始内容
  rawContent: string
  
  // AI理解后的结构化内容
  structured: StructuredContent
  
  // 置信度
  confidence: number
}

type ContentType = 
  | 'requirement_doc'   // 需求文档
  | 'feature_list'      // 功能列表
  | 'ui_reference'      // UI参考
  | 'sketch'            // 草图
  | 'data_template'     // 数据模板
  | 'business_doc'      // 业务文档

// 结构化内容
interface StructuredContent {
  summary: string
  features?: FeatureItem[]
  uiElements?: UIElement[]
  dataStructure?: DataField[]
  references?: Reference[]
}
```

### 2.3 各格式处理实现

```typescript
class DocumentProcessorImpl implements DocumentProcessor {
  constructor(
    private mistralOCR: MistralOCR,
    private claude: ClaudeClient,
    private puppeteer: PuppeteerService
  ) {}
  
  async process(files: UploadedFile[]): Promise<ProcessedResult[]> {
    return Promise.all(files.map(file => this.processFile(file)))
  }
  
  private async processFile(file: UploadedFile): Promise<ProcessedResult> {
    // 1. 根据文件类型提取原始内容
    const rawContent = await this.extractContent(file)
    
    // 2. AI理解并结构化
    const structured = await this.understand(rawContent, file.type)
    
    return {
      contentType: this.detectContentType(structured),
      rawContent,
      structured,
      confidence: structured.confidence
    }
  }
  
  private async extractContent(file: UploadedFile): Promise<string> {
    switch (file.type) {
      case 'pdf':
        // 使用Mistral OCR，支持扫描件
        return this.mistralOCR.extract(file.buffer)
        
      case 'image':
        // 使用Claude Vision
        return this.claude.vision(file.buffer, {
          prompt: '描述这个图片中的UI元素、布局和设计风格'
        })
        
      case 'excel':
        // 使用SheetJS解析
        const workbook = XLSX.read(file.buffer)
        return this.excelToText(workbook)
        
      case 'word':
        // 使用mammoth.js
        const result = await mammoth.extractRawText({ buffer: file.buffer })
        return result.value
        
      default:
        return file.buffer.toString('utf-8')
    }
  }
  
  private async understand(content: string, fileType: FileType): Promise<StructuredContent> {
    const prompt = this.buildUnderstandPrompt(content, fileType)
    
    const response = await this.claude.messages.create({
      model: 'claude-3-5-sonnet-20241022',
      max_tokens: 4000,
      messages: [{ role: 'user', content: prompt }]
    })
    
    return JSON.parse(response.content[0].text)
  }
  
  private buildUnderstandPrompt(content: string, fileType: FileType): string {
    return `
分析以下${fileType}文件内容，提取产品需求相关信息。

文件内容:
${content}

请返回JSON格式:
{
  "summary": "内容摘要",
  "features": [{"name": "功能名", "description": "描述", "priority": "P0/P1/P2"}],
  "uiElements": [{"type": "组件类型", "description": "描述"}],
  "dataStructure": [{"name": "字段名", "type": "类型", "description": "描述"}],
  "confidence": 0.95
}
`
  }
}
```

### 2.4 需求整合器

```typescript
// 将多个文件的提取结果整合为统一的需求文档
class RequirementIntegrator {
  async integrate(results: ProcessedResult[], userDescription: string): Promise<IntegratedRequirement> {
    // 合并所有来源的功能列表
    const allFeatures = this.mergeFeatures(results)
    
    // 合并UI参考
    const uiReferences = results
      .filter(r => r.contentType === 'ui_reference')
      .map(r => r.structured)
    
    // 使用Claude整合
    const integrated = await this.claude.messages.create({
      model: 'claude-3-5-sonnet-20241022',
      max_tokens: 4000,
      messages: [{
        role: 'user',
        content: `
综合以下信息，生成统一的产品需求:

用户描述: ${userDescription}

从文件中提取的功能: ${JSON.stringify(allFeatures)}

UI参考: ${JSON.stringify(uiReferences)}

请整合并去重，返回结构化的需求文档。
`
      }]
    })
    
    return JSON.parse(integrated.content[0].text)
  }
}
```

---

## 三、[新增] 分层模型调度

### 3.1 设计目标

```yaml
目标: 在保证质量的前提下，降低50%的AI调用成本

原则:
  - 简单任务用便宜模型 (Haiku)
  - 中等任务用标准模型 (Sonnet)
  - 复杂任务用高端模型 (Opus)
```

### 3.2 模型配置

```typescript
// 模型配置
const MODEL_CONFIG = {
  'claude-3-opus': {
    id: 'claude-3-opus-20240229',
    costPer1kInput: 0.015,
    costPer1kOutput: 0.075,
    maxTokens: 200000,
    capabilities: ['complex_reasoning', 'architecture', 'security_audit'],
    latencyMs: 3000
  },
  'claude-3-5-sonnet': {
    id: 'claude-3-5-sonnet-20241022',
    costPer1kInput: 0.003,
    costPer1kOutput: 0.015,
    maxTokens: 200000,
    capabilities: ['code_generation', 'ui_design', 'general'],
    latencyMs: 1500
  },
  'claude-3-haiku': {
    id: 'claude-3-haiku-20240307',
    costPer1kInput: 0.00025,
    costPer1kOutput: 0.00125,
    maxTokens: 200000,
    capabilities: ['simple_tasks', 'classification', 'formatting'],
    latencyMs: 500
  }
}

// 任务类型到模型的映射规则
const TASK_MODEL_RULES = {
  // 复杂度评估 - 用最便宜的
  complexity_assessment: {
    default: 'claude-3-haiku'
  },
  
  // 需求分析 - 标准，复杂用高端
  requirement_analysis: {
    default: 'claude-3-5-sonnet',
    complex: 'claude-3-opus'
  },
  
  // 代码生成 - 根据复杂度分层
  code_generation: {
    simple: 'claude-3-haiku',    // 简单代码、格式化
    default: 'claude-3-5-sonnet', // 普通功能
    complex: 'claude-3-opus'      // 复杂架构
  },
  
  // UI设计 - 标准
  ui_design: {
    default: 'claude-3-5-sonnet'
  },
  
  // 测试生成 - 便宜
  test_generation: {
    default: 'claude-3-haiku',
    complex: 'claude-3-5-sonnet'
  },
  
  // Bug修复 - 根据复杂度
  bug_fix: {
    simple: 'claude-3-haiku',
    default: 'claude-3-5-sonnet'
  },
  
  // 增长建议 - 标准
  growth_advice: {
    default: 'claude-3-5-sonnet'
  }
}
```

### 3.3 模型路由器实现

```typescript
interface ModelRouter {
  // 选择最合适的模型
  selectModel(taskType: TaskType, context: TaskContext): Promise<ModelConfig>
  
  // 评估任务复杂度
  assessComplexity(context: TaskContext): Promise<Complexity>
}

type Complexity = 'simple' | 'medium' | 'complex'

class ModelRouterImpl implements ModelRouter {
  async selectModel(taskType: TaskType, context: TaskContext): Promise<ModelConfig> {
    // 1. 快速评估复杂度 (用Haiku)
    const complexity = await this.assessComplexity(context)
    
    // 2. 根据规则选择模型
    const rule = TASK_MODEL_RULES[taskType]
    let modelKey: string
    
    if (complexity === 'simple' && rule.simple) {
      modelKey = rule.simple
    } else if (complexity === 'complex' && rule.complex) {
      modelKey = rule.complex
    } else {
      modelKey = rule.default
    }
    
    return MODEL_CONFIG[modelKey]
  }
  
  async assessComplexity(context: TaskContext): Promise<Complexity> {
    // 用Haiku快速评估，成本极低
    const response = await this.claude.messages.create({
      model: 'claude-3-haiku-20240307',
      max_tokens: 10,
      messages: [{
        role: 'user',
        content: `评估任务复杂度，只返回 simple/medium/complex:
任务: ${context.description}
代码量: ${context.estimatedLines || '未知'}行`
      }]
    })
    
    return response.content[0].text.trim() as Complexity
  }
}
```

### 3.4 成本对比

| 项目复杂度 | 原成本 (全Sonnet) | 新成本 (分层) | 节省 |
|------------|-------------------|---------------|------|
| L1 简单页面 | $3 | $0.8 | 73% |
| L2 基础应用 | $8 | $3 | 62% |
| L3 复杂应用 | $15 | $7 | 53% |
| L4 企业应用 | $30 | $15 | 50% |
| L5 大型系统 | $80 | $45 | 44% |

---

## 四、[新增] 经验库系统

### 4.1 设计目标

```yaml
目标: 相似项目复用80%代码，开发时间减少60%

核心思路:
  - 每个完成的项目都积累经验
  - 新项目自动匹配相似经验
  - 复用已验证的代码，只生成差异部分
```

### 4.2 经验数据模型

```typescript
// 经验类型
type ExperienceType = 
  | 'project'       // 完整项目模板
  | 'module'        // 功能模块
  | 'component'     // UI组件
  | 'solution'      // 问题解决方案

// 项目经验
interface ProjectExperience {
  id: string
  type: 'project'
  
  // 基本信息
  name: string
  description: string
  category: string           // 电商/教育/社交/工具...
  complexity: 'L1' | 'L2' | 'L3' | 'L4' | 'L5'
  
  // 内容
  features: string[]         // 功能列表
  techStack: string[]        // 技术栈
  codeStructure: object      // 代码结构
  
  // 质量指标
  quality: number            // 1-5分
  userSatisfaction: number   // 用户满意度
  bugRate: number            // bug率
  
  // 向量索引
  vectorId: string           // Pinecone向量ID
  
  // 统计
  usageCount: number
  lastUsedAt: Date
  
  createdAt: Date
}

// 模块经验
interface ModuleExperience {
  id: string
  type: 'module'
  
  // 基本信息
  name: string               // 用户认证/支付系统/评论系统...
  description: string
  category: string
  
  // 内容
  code: {
    files: { path: string, content: string }[]
    dependencies: string[]
  }
  
  // 适用条件
  applicableTo: {
    projectTypes: string[]
    techStacks: string[]
  }
  
  // 质量和统计
  quality: number
  usageCount: number
  vectorId: string
  
  createdAt: Date
}
```

### 4.3 经验库服务

```typescript
interface ExperienceLibrary {
  // 匹配相似经验
  match(requirement: Requirement, limit?: number): Promise<MatchResult[]>
  
  // 添加新经验 (项目完成后)
  add(experience: Experience): Promise<void>
  
  // 记录使用
  recordUsage(expId: string): Promise<void>
}

interface MatchResult {
  experience: Experience
  similarity: number         // 0-1
  applicability: 'direct' | 'partial' | 'reference'
  reusableParts: string[]    // 可复用的部分
}

class ExperienceLibraryImpl implements ExperienceLibrary {
  constructor(
    private pinecone: Pinecone,
    private db: Database,
    private embedding: EmbeddingService
  ) {}
  
  async match(requirement: Requirement, limit = 5): Promise<MatchResult[]> {
    // 1. 生成需求的向量
    const reqText = this.buildSearchText(requirement)
    const reqVector = await this.embedding.embed(reqText)
    
    // 2. Pinecone向量搜索
    const results = await this.pinecone
      .index('thinkus-experiences')
      .query({
        vector: reqVector,
        topK: limit * 2,
        filter: { quality: { $gte: 3 } },  // 只匹配高质量
        includeMetadata: true
      })
    
    // 3. 获取完整经验数据
    const experiences = await Promise.all(
      results.matches.map(m => this.db.experiences.findOne({ vectorId: m.id }))
    )
    
    // 4. 评估适用性
    return Promise.all(
      experiences.slice(0, limit).map(async exp => ({
        experience: exp,
        similarity: results.matches.find(m => m.id === exp.vectorId)?.score || 0,
        applicability: await this.assessApplicability(requirement, exp),
        reusableParts: await this.identifyReusableParts(requirement, exp)
      }))
    )
  }
  
  private buildSearchText(requirement: Requirement): string {
    return `
项目类型: ${requirement.projectType}
功能: ${requirement.features.join(', ')}
技术栈: ${requirement.techStack?.join(', ') || '待定'}
`
  }
}
```

### 4.4 经验收集流程

```typescript
// 项目完成后自动收集经验
class ExperienceCollector {
  async collect(projectId: string): Promise<void> {
    const project = await this.db.projects.findById(projectId)
    
    // 1. 评估质量
    const quality = await this.assessQuality(project)
    if (quality.overall < 3) {
      console.log('质量不足，跳过收集')
      return
    }
    
    // 2. 匿名化处理
    const anonymized = this.anonymize(project)
    
    // 3. 提取项目经验
    await this.extractProjectExperience(anonymized, quality)
    
    // 4. 提取模块经验
    await this.extractModuleExperiences(anonymized, quality)
  }
  
  private async assessQuality(project: Project): Promise<QualityAssessment> {
    const feedback = await this.db.feedback.findByProject(project.id)
    const bugs = await this.db.bugs.countByProject(project.id)
    
    return {
      overall: this.calculateScore(feedback, bugs),
      userSatisfaction: feedback?.rating || 4,
      bugRate: bugs / 1000
    }
  }
  
  private anonymize(project: Project): AnonymizedProject {
    return {
      ...project,
      userId: null,
      name: `${project.category}-template-${Date.now()}`,
      // 移除敏感业务数据
    }
  }
}
```

### 4.5 预期效果

| 项目序号 | 复用率 | 生成率 | 开发时间 |
|----------|--------|--------|----------|
| 第1个电商 | 0% | 100% | 3天 |
| 第5个电商 | 50% | 50% | 1.5天 |
| 第20个电商 | 70% | 30% | 1天 |
| 第100个电商 | 85% | 15% | 6小时 |

---

## 五、[新增] 开发沙盒系统

### 5.1 架构设计

```
┌─────────────────────────────────────────────────────────────────┐
│                     SandboxManager                               │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│  ┌─────────────────────────────────────────────────────────┐    │
│  │                    Docker Host                           │    │
│  │  ┌─────────┐  ┌─────────┐  ┌─────────┐  ┌─────────┐    │    │
│  │  │Sandbox 1│  │Sandbox 2│  │Sandbox 3│  │   ...   │    │    │
│  │  │Project A│  │Project B│  │Project C│  │         │    │    │
│  │  │         │  │         │  │         │  │         │    │    │
│  │  │ Node.js │  │ Node.js │  │ Python  │  │         │    │    │
│  │  │ MongoDB │  │ Postgres│  │ MongoDB │  │         │    │    │
│  │  │ :3000   │  │ :3001   │  │ :3002   │  │         │    │    │
│  │  └─────────┘  └─────────┘  └─────────┘  └─────────┘    │    │
│  └─────────────────────────────────────────────────────────┘    │
│                              │                                   │
│                              ▼                                   │
│  ┌─────────────────────────────────────────────────────────┐    │
│  │                    Nginx Proxy                           │    │
│  │  sandbox-a.thinkus.ai → :3000                           │    │
│  │  sandbox-b.thinkus.ai → :3001                           │    │
│  └─────────────────────────────────────────────────────────┘    │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
```

### 5.2 接口定义

```typescript
interface SandboxManager {
  // 创建沙盒
  create(projectId: string, config: SandboxConfig): Promise<Sandbox>
  
  // 获取或创建
  getOrCreate(projectId: string): Promise<Sandbox>
  
  // 执行命令
  exec(sandboxId: string, command: string): Promise<ExecResult>
  
  // 文件操作
  writeFile(sandboxId: string, path: string, content: string): Promise<void>
  readFile(sandboxId: string, path: string): Promise<string>
  listFiles(sandboxId: string, dir: string): Promise<FileInfo[]>
  
  // 生命周期
  pause(sandboxId: string): Promise<void>
  resume(sandboxId: string): Promise<void>
  destroy(sandboxId: string): Promise<void>
  
  // 导出
  export(sandboxId: string): Promise<Buffer>  // 返回zip
}

interface Sandbox {
  id: string
  projectId: string
  status: 'creating' | 'running' | 'paused' | 'stopped'
  
  containerId: string
  previewUrl: string           // https://xxx.sandbox.thinkus.ai
  
  config: SandboxConfig
  
  createdAt: Date
  lastActiveAt: Date
  expiresAt: Date              // 7天后过期
}

interface SandboxConfig {
  image: 'node18' | 'node20' | 'python3' | 'full'
  cpu?: number                 // 默认1核
  memory?: number              // 默认2GB
  disk?: number                // 默认10GB
  env?: Record<string, string>
  ttlHours?: number            // 默认168小时(7天)
}

interface ExecResult {
  exitCode: number
  stdout: string
  stderr: string
  duration: number
}
```

### 5.3 Docker实现

```typescript
import Docker from 'dockerode'

class DockerSandboxManager implements SandboxManager {
  private docker: Docker
  
  constructor() {
    this.docker = new Docker()
  }
  
  async create(projectId: string, config: SandboxConfig): Promise<Sandbox> {
    const sandboxId = `sandbox-${projectId}-${Date.now()}`
    
    // 1. 创建容器
    const container = await this.docker.createContainer({
      name: sandboxId,
      Image: this.getImage(config.image),
      Env: this.buildEnv(config.env),
      HostConfig: {
        Memory: (config.memory || 2048) * 1024 * 1024,
        CpuCount: config.cpu || 1,
        PortBindings: {
          '3000/tcp': [{ HostPort: '' }],  // 动态端口
          '5173/tcp': [{ HostPort: '' }]
        }
      },
      WorkingDir: '/workspace'
    })
    
    // 2. 启动
    await container.start()
    
    // 3. 获取端口
    const info = await container.inspect()
    const port = info.NetworkSettings.Ports['3000/tcp'][0].HostPort
    
    // 4. 配置Nginx代理
    await this.setupProxy(sandboxId, port)
    
    // 5. 初始化项目
    await this.initProject(sandboxId, config)
    
    const sandbox: Sandbox = {
      id: sandboxId,
      projectId,
      status: 'running',
      containerId: container.id,
      previewUrl: `https://${sandboxId}.sandbox.thinkus.ai`,
      config,
      createdAt: new Date(),
      lastActiveAt: new Date(),
      expiresAt: new Date(Date.now() + (config.ttlHours || 168) * 3600000)
    }
    
    await this.db.sandboxes.create(sandbox)
    return sandbox
  }
  
  async exec(sandboxId: string, command: string): Promise<ExecResult> {
    const sandbox = await this.db.sandboxes.findById(sandboxId)
    const container = this.docker.getContainer(sandbox.containerId)
    
    const exec = await container.exec({
      Cmd: ['sh', '-c', command],
      AttachStdout: true,
      AttachStderr: true
    })
    
    const start = Date.now()
    const stream = await exec.start({ hijack: true })
    
    return new Promise((resolve) => {
      let stdout = '', stderr = ''
      
      stream.on('data', (chunk: Buffer) => {
        // Docker多路复用流解析
        const header = chunk.slice(0, 8)
        const type = header[0]  // 1=stdout, 2=stderr
        const data = chunk.slice(8).toString()
        
        if (type === 1) stdout += data
        else stderr += data
      })
      
      stream.on('end', async () => {
        const info = await exec.inspect()
        resolve({
          exitCode: info.ExitCode,
          stdout,
          stderr,
          duration: Date.now() - start
        })
      })
    })
  }
  
  async writeFile(sandboxId: string, path: string, content: string): Promise<void> {
    // 使用exec写入文件
    const escaped = content.replace(/'/g, "'\\''")
    await this.exec(sandboxId, `cat > ${path} << 'THINKUS_EOF'\n${content}\nTHINKUS_EOF`)
    
    // 触发文件变更事件 (用于直播)
    await this.eventEmitter.emit('file_change', { sandboxId, path, content })
  }
  
  private getImage(type: string): string {
    return {
      'node18': 'thinkus/sandbox-node18:latest',
      'node20': 'thinkus/sandbox-node20:latest',
      'python3': 'thinkus/sandbox-python3:latest',
      'full': 'thinkus/sandbox-full:latest'
    }[type] || 'thinkus/sandbox-node20:latest'
  }
}
```

### 5.4 沙盒镜像Dockerfile

```dockerfile
# Dockerfile.sandbox-node20
FROM node:20-alpine

# 安装工具
RUN apk add --no-cache \
    git curl bash python3 make g++ \
    chromium

# 全局npm包
RUN npm install -g \
    typescript ts-node \
    eslint prettier \
    vite next \
    pm2

# 工作目录
WORKDIR /workspace

# 非root用户
RUN adduser -D -u 1000 developer
USER developer

# 保持运行
CMD ["tail", "-f", "/dev/null"]
```

---

## 六、[新增] 实时推送层

### 6.1 架构设计

```
┌─────────────────────────────────────────────────────────────────┐
│                     RealtimeStreamService                        │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│  事件源:                                                         │
│  ┌──────────┐  ┌──────────┐  ┌──────────┐                      │
│  │ 沙盒文件 │  │ 沙盒终端 │  │ Agent    │                      │
│  │ 变更事件 │  │ 输出事件 │  │ 状态事件 │                      │
│  └────┬─────┘  └────┬─────┘  └────┬─────┘                      │
│       │             │             │                              │
│       └─────────────┼─────────────┘                              │
│                     ▼                                            │
│              ┌──────────────┐                                   │
│              │ Event Router │                                   │
│              └──────┬───────┘                                   │
│                     │                                            │
│       ┌─────────────┼─────────────┐                              │
│       ▼             ▼             ▼                              │
│  ┌──────────┐  ┌──────────┐  ┌──────────┐                      │
│  │ Project  │  │ Project  │  │ Project  │                      │
│  │ Room A   │  │ Room B   │  │ Room C   │                      │
│  │ (users)  │  │ (users)  │  │ (users)  │                      │
│  └──────────┘  └──────────┘  └──────────┘                      │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
```

### 6.2 事件类型

```typescript
// 事件基类
interface StreamEvent {
  type: EventType
  projectId: string
  timestamp: number
  data: any
}

type EventType = 
  | 'code_change'      // 代码变更
  | 'terminal_output'  // 终端输出
  | 'agent_status'     // Agent状态变更
  | 'progress'         // 进度更新
  | 'preview_update'   // 预览更新
  | 'error'            // 错误

// 代码变更事件
interface CodeChangeEvent extends StreamEvent {
  type: 'code_change'
  data: {
    file: string
    content: string
    diff?: string
    agentId: string
    agentName: string
  }
}

// Agent状态事件
interface AgentStatusEvent extends StreamEvent {
  type: 'agent_status'
  data: {
    agentId: string
    agentName: string
    status: 'working' | 'waiting' | 'idle'
    task?: string
  }
}

// 进度事件
interface ProgressEvent extends StreamEvent {
  type: 'progress'
  data: {
    phase: string
    progress: number  // 0-100
    message: string
  }
}
```

### 6.3 WebSocket服务实现

```typescript
import { Server as SocketIO } from 'socket.io'

class RealtimeStreamService {
  private io: SocketIO
  
  constructor(httpServer: HttpServer) {
    this.io = new SocketIO(httpServer, {
      cors: { origin: '*' },
      transports: ['websocket', 'polling']
    })
    
    this.setupHandlers()
  }
  
  private setupHandlers() {
    this.io.on('connection', (socket) => {
      // 加入项目房间
      socket.on('join_project', (projectId: string) => {
        socket.join(`project:${projectId}`)
        console.log(`用户加入项目 ${projectId}`)
      })
      
      // 离开项目房间
      socket.on('leave_project', (projectId: string) => {
        socket.leave(`project:${projectId}`)
      })
      
      // 用户发送消息 (与AI互动)
      socket.on('user_message', async (data: { projectId: string, message: string }) => {
        await this.handleUserMessage(data.projectId, data.message, socket)
      })
    })
  }
  
  // 推送代码变更
  async pushCodeChange(projectId: string, file: string, content: string, agent: Agent) {
    this.io.to(`project:${projectId}`).emit('code_change', {
      type: 'code_change',
      projectId,
      timestamp: Date.now(),
      data: {
        file,
        content,
        agentId: agent.id,
        agentName: agent.name
      }
    })
  }
  
  // 推送Agent状态
  async pushAgentStatus(projectId: string, agent: Agent, status: string, task?: string) {
    this.io.to(`project:${projectId}`).emit('agent_status', {
      type: 'agent_status',
      projectId,
      timestamp: Date.now(),
      data: {
        agentId: agent.id,
        agentName: agent.name,
        status,
        task
      }
    })
  }
  
  // 推送进度
  async pushProgress(projectId: string, phase: string, progress: number, message: string) {
    this.io.to(`project:${projectId}`).emit('progress', {
      type: 'progress',
      projectId,
      timestamp: Date.now(),
      data: { phase, progress, message }
    })
  }
}
```

### 6.4 前端接收示例

```typescript
// React Hook
function useProjectStream(projectId: string) {
  const [codeChanges, setCodeChanges] = useState<CodeChange[]>([])
  const [agentStatus, setAgentStatus] = useState<Record<string, AgentStatus>>({})
  const [progress, setProgress] = useState({ phase: '', progress: 0 })
  
  useEffect(() => {
    const socket = io(WS_URL)
    
    socket.emit('join_project', projectId)
    
    socket.on('code_change', (event: CodeChangeEvent) => {
      setCodeChanges(prev => [...prev, event.data])
    })
    
    socket.on('agent_status', (event: AgentStatusEvent) => {
      setAgentStatus(prev => ({
        ...prev,
        [event.data.agentId]: event.data
      }))
    })
    
    socket.on('progress', (event: ProgressEvent) => {
      setProgress(event.data)
    })
    
    return () => {
      socket.emit('leave_project', projectId)
      socket.disconnect()
    }
  }, [projectId])
  
  return { codeChanges, agentStatus, progress }
}
```

---

## 七、[新增] 运营数据服务

### 7.1 数据收集

```typescript
// 嵌入用户产品的统计代码
const TRACKING_SCRIPT = `
<script>
(function() {
  const THINKUS_PROJECT_ID = '{{PROJECT_ID}}';
  const THINKUS_API = 'https://analytics.thinkus.ai';
  
  // 页面访问
  function trackPageView() {
    fetch(THINKUS_API + '/track', {
      method: 'POST',
      body: JSON.stringify({
        projectId: THINKUS_PROJECT_ID,
        event: 'page_view',
        url: location.href,
        referrer: document.referrer,
        timestamp: Date.now()
      })
    });
  }
  
  // 用户事件
  window.thinkusTrack = function(event, data) {
    fetch(THINKUS_API + '/track', {
      method: 'POST',
      body: JSON.stringify({
        projectId: THINKUS_PROJECT_ID,
        event: event,
        data: data,
        timestamp: Date.now()
      })
    });
  };
  
  trackPageView();
})();
</script>
`
```

### 7.2 数据分析服务

```typescript
interface AnalyticsService {
  // 获取项目统计
  getStats(projectId: string, period: Period): Promise<ProjectStats>
  
  // 获取趋势数据
  getTrends(projectId: string, metric: Metric, period: Period): Promise<TrendData[]>
  
  // 获取转化漏斗
  getFunnel(projectId: string, steps: string[]): Promise<FunnelData>
}

interface ProjectStats {
  users: {
    total: number
    new: number
    active: number
    change: number  // 百分比变化
  }
  revenue: {
    total: number
    change: number
  }
  conversion: {
    rate: number
    change: number
  }
  engagement: {
    avgSessionDuration: number
    bounceRate: number
  }
}

class AnalyticsServiceImpl implements AnalyticsService {
  async getStats(projectId: string, period: Period): Promise<ProjectStats> {
    const events = await this.db.analyticsEvents.find({
      projectId,
      timestamp: { $gte: period.start, $lte: period.end }
    })
    
    const prevEvents = await this.db.analyticsEvents.find({
      projectId,
      timestamp: { 
        $gte: period.start - (period.end - period.start),
        $lte: period.start 
      }
    })
    
    return {
      users: this.calculateUserStats(events, prevEvents),
      revenue: this.calculateRevenueStats(events, prevEvents),
      conversion: this.calculateConversionStats(events, prevEvents),
      engagement: this.calculateEngagementStats(events)
    }
  }
}
```

### 7.3 增长建议引擎

```typescript
interface GrowthAdvisor {
  // 生成增长建议
  generateAdvice(projectId: string): Promise<GrowthAdvice[]>
}

interface GrowthAdvice {
  id: string
  type: 'conversion' | 'revenue' | 'growth' | 'retention'
  priority: 'high' | 'medium' | 'low'
  
  problem: string           // 问题描述
  suggestion: string        // 建议方案
  expectedImpact: string    // 预期效果
  
  implementation: {
    type: 'feature' | 'optimization'
    estimatedCost: number   // 实现费用
    estimatedTime: string   // 实现时间
  }
}

class GrowthAdvisorImpl implements GrowthAdvisor {
  async generateAdvice(projectId: string): Promise<GrowthAdvice[]> {
    // 1. 获取项目统计数据
    const stats = await this.analyticsService.getStats(projectId, { days: 30 })
    
    // 2. 获取行业基准
    const project = await this.db.projects.findById(projectId)
    const benchmark = await this.getBenchmark(project.category)
    
    // 3. AI分析生成建议
    const response = await this.claude.messages.create({
      model: 'claude-3-5-sonnet-20241022',
      max_tokens: 2000,
      messages: [{
        role: 'user',
        content: `
分析以下产品数据，生成增长建议:

产品数据:
${JSON.stringify(stats, null, 2)}

行业基准:
${JSON.stringify(benchmark, null, 2)}

请生成3-5条具体可执行的增长建议，每条包含:
- 问题描述
- 建议方案
- 预期效果
- 实现方式和成本

返回JSON格式的GrowthAdvice数组。
`
      }]
    })
    
    return JSON.parse(response.content[0].text)
  }
  
  private async getBenchmark(category: string): Promise<Benchmark> {
    // 返回该类型产品的行业平均数据
    return {
      conversionRate: 5,      // 5%平均转化率
      bounceRate: 40,         // 40%跳出率
      avgSessionDuration: 180 // 3分钟平均停留
    }
  }
}
```

---

## 八、数据库Schema扩展

### 8.1 新增Collection

```typescript
// 沙盒表
interface SandboxDocument {
  _id: string
  projectId: string
  containerId: string
  status: 'creating' | 'running' | 'paused' | 'stopped'
  previewUrl: string
  config: SandboxConfig
  createdAt: Date
  lastActiveAt: Date
  expiresAt: Date
}

// 经验表
interface ExperienceDocument {
  _id: string
  type: 'project' | 'module' | 'component' | 'solution'
  name: string
  description: string
  category: string
  content: object
  quality: number
  usageCount: number
  vectorId: string
  createdAt: Date
}

// 分析事件表
interface AnalyticsEventDocument {
  _id: string
  projectId: string
  event: string
  data: object
  url?: string
  userId?: string
  sessionId: string
  timestamp: Date
}

// 增长建议表
interface GrowthAdviceDocument {
  _id: string
  projectId: string
  advices: GrowthAdvice[]
  generatedAt: Date
  status: 'pending' | 'viewed' | 'implemented' | 'dismissed'
}
```

### 8.2 索引设计

```typescript
// 沙盒表
db.sandboxes.createIndex({ projectId: 1 }, { unique: true })
db.sandboxes.createIndex({ expiresAt: 1 }, { expireAfterSeconds: 0 })
db.sandboxes.createIndex({ status: 1, lastActiveAt: -1 })

// 经验表
db.experiences.createIndex({ type: 1, category: 1 })
db.experiences.createIndex({ vectorId: 1 }, { unique: true })
db.experiences.createIndex({ quality: -1, usageCount: -1 })

// 分析事件表
db.analyticsEvents.createIndex({ projectId: 1, timestamp: -1 })
db.analyticsEvents.createIndex({ projectId: 1, event: 1, timestamp: -1 })
db.analyticsEvents.createIndex({ timestamp: 1 }, { expireAfterSeconds: 90 * 24 * 3600 }) // 90天过期
```

---

## 九、部署架构

### 9.1 新增服务

```yaml
# docker-compose.yml 新增部分

services:
  # 沙盒管理服务
  sandbox-manager:
    image: thinkus/sandbox-manager:latest
    volumes:
      - /var/run/docker.sock:/var/run/docker.sock
    environment:
      - DOCKER_HOST=unix:///var/run/docker.sock
      - MONGO_URI=${MONGO_URI}
      - REDIS_URI=${REDIS_URI}
    depends_on:
      - mongodb
      - redis
  
  # 实时推送服务
  realtime-stream:
    image: thinkus/realtime-stream:latest
    ports:
      - "3001:3001"
    environment:
      - REDIS_URI=${REDIS_URI}
    depends_on:
      - redis
  
  # 分析服务
  analytics:
    image: thinkus/analytics:latest
    environment:
      - MONGO_URI=${MONGO_URI}
      - CLAUDE_API_KEY=${CLAUDE_API_KEY}
    depends_on:
      - mongodb
  
  # Nginx代理 (沙盒预览)
  sandbox-proxy:
    image: nginx:alpine
    ports:
      - "80:80"
      - "443:443"
    volumes:
      - ./nginx/sandbox.conf:/etc/nginx/conf.d/sandbox.conf
      - ./certs:/etc/nginx/certs
```

### 9.2 资源估算

```yaml
沙盒服务器:
  需求: 每个活跃项目1个沙盒 (1核2GB)
  估算: 100并发 = 100核200GB
  推荐: 4台 32核128GB 或 AWS ECS

实时推送:
  需求: WebSocket连接
  估算: 每用户1连接，峰值1000连接
  推荐: 2核4GB * 2实例

分析服务:
  需求: 事件存储和分析
  估算: 100万事件/月
  推荐: 2核4GB + MongoDB 20GB

向量数据库 (经验库):
  推荐: Pinecone Standard ($70/月)
```

---

## 十、开发计划

### Phase 1: 基础能力 (1-2周)

| 任务 | 工作量 | 负责 |
|------|--------|------|
| ModelRouter 分层调度 | 3天 | 后端 |
| ExperienceLibrary 基础版 | 5天 | 后端+AI |
| 邀请系统优化 | 3天 | 前端+后端 |

### Phase 2: 文档处理 (1周)

| 任务 | 工作量 | 负责 |
|------|--------|------|
| PDF处理 (Mistral OCR) | 2天 | 后端 |
| 图片处理 (Claude Vision) | 2天 | 后端 |
| Excel解析 | 1天 | 后端 |
| 需求整合器 | 2天 | AI |

### Phase 3: 沙盒和直播 (3周)

| 任务 | 工作量 | 负责 |
|------|--------|------|
| SandboxManager | 1周 | 后端+DevOps |
| 沙盒镜像构建 | 2天 | DevOps |
| RealtimeStream服务 | 3天 | 后端 |
| 直播前端界面 | 1周 | 前端 |

### Phase 4: 运营闭环 (2周)

| 任务 | 工作量 | 负责 |
|------|--------|------|
| 统计代码嵌入 | 2天 | 后端 |
| AnalyticsService | 4天 | 后端 |
| GrowthAdvisor | 3天 | AI |
| 仪表盘前端 | 4天 | 前端 |

---

## 十一、与原架构的关系

```yaml
保持不变:
  - Next.js + tRPC 应用层
  - MongoDB 数据存储
  - Pinecone 向量存储
  - Redis 缓存和队列
  - Cloudflare R2 文件存储
  - 18个AI高管系统
  - 记忆系统

新增:
  - DocumentProcessor (文档处理层)
  - ModelRouter (模型路由)
  - ExperienceLibrary (经验库)
  - SandboxManager (沙盒管理)
  - RealtimeStreamService (实时推送)
  - AnalyticsService (数据分析)
  - GrowthAdvisor (增长建议)

优化:
  - AI调用改为通过ModelRouter
  - 代码生成改为在Sandbox中执行
  - 添加经验匹配步骤
```

---

**配套文档**: [产品需求优化文档](./01-PRD-UPGRADE-v12.md)
