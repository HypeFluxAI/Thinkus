# Thinkus 系统优化升级 - 技术架构文档

> **版本**: v1.0 | **日期**: 2026-01-15
>
> **定位**: 基于已有系统的技术增强，完整代码实现
>
> **给AI工程师**: 本文档包含完整的TypeScript实现代码，可直接集成到现有系统

---

## 一、优化模块概览

### 1.1 与现有系统的关系

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                                                                              │
│  本次优化不是新建系统，而是增强已有模块                                     │
│                                                                              │
│  ┌─────────────────────────────────────────────────────────────────────┐   │
│  │                         已有模块                                     │   │
│  │                                                                      │   │
│  │  • Subagents (06-AI-CAPABILITY)      ← 增强: Magic Keyword触发     │   │
│  │  • Auto-Verify (08-AUTO-VERIFY)      ← 增强: Todo Continuation     │   │
│  │  • Auto-Verify (08-AUTO-VERIFY)      ← 增强: Comment Checker       │   │
│  │  • Memory Controller (03-AI-EMPLOYEE) ← 增强: Context Monitor      │   │
│  │  • 基础架构                          ← 增强: Session Recovery      │   │
│  │  • AI高管体系 (18人)                 ← 增强: 新增Librarian         │   │
│  └─────────────────────────────────────────────────────────────────────┘   │
│                                                                              │
└─────────────────────────────────────────────────────────────────────────────┘
```

### 1.2 文件结构

```
src/
├── optimization/                    # 新增优化模块目录
│   ├── keyword-detector/           # Magic Keyword检测
│   │   ├── types.ts
│   │   ├── KeywordDetector.ts
│   │   └── index.ts
│   ├── todo-tracker/               # Todo追踪
│   │   ├── types.ts
│   │   ├── TodoTracker.ts
│   │   └── index.ts
│   ├── comment-checker/            # 注释检查
│   │   ├── types.ts
│   │   ├── CommentChecker.ts
│   │   └── index.ts
│   ├── context-monitor/            # 上下文监控
│   │   ├── types.ts
│   │   ├── ContextWindowMonitor.ts
│   │   └── index.ts
│   ├── session-recovery/           # 会话恢复
│   │   ├── types.ts
│   │   ├── SessionRecovery.ts
│   │   └── index.ts
│   └── index.ts                    # 统一导出
│
├── agents/
│   └── librarian/                  # 新增研究员角色
│       ├── LibrarianAgent.ts
│       └── index.ts
│
└── 现有模块/                        # 需要修改的现有文件
    ├── orchestrator/AIOrchestrator.ts    # 集成Keyword Detector
    ├── verify/VerifyOrchestrator.ts      # 集成Todo + Comment
    └── memory/MemoryController.ts        # 集成Context Monitor
```

---

## 二、[优化1] Magic Keyword Detector

### 2.1 功能说明

```yaml
作用: 检测用户输入中的关键词，自动触发对应模式
集成点: AIOrchestrator.handleRequest() 的入口处
原理: 在处理用户请求前，先检测关键词，设置相应的配置开关
```

### 2.2 完整实现

```typescript
// src/optimization/keyword-detector/types.ts

export type DetectedMode = 'ultrawork' | 'search' | 'analyze'

export interface KeywordConfig {
  mode: DetectedMode
  keywords: {
    zh: string[]
    en: string[]
  }
  triggers: {
    enableSubagents: boolean
    enableTodoContinuation: boolean
    enableFullVerify: boolean
    priorityAgents?: string[]
  }
}

export interface KeywordDetectionResult {
  detected: boolean
  mode?: DetectedMode
  matchedKeyword?: string
  triggers?: KeywordConfig['triggers']
  cleanedPrompt: string
}
```

```typescript
// src/optimization/keyword-detector/KeywordDetector.ts

import { DetectedMode, KeywordConfig, KeywordDetectionResult } from './types'

export class KeywordDetector {
  private configs: KeywordConfig[] = [
    {
      mode: 'ultrawork',
      keywords: {
        zh: ['全力', '开工', '猛干', '冲', '加油干', '使劲干'],
        en: ['ultrawork', 'ulw', 'fullpower', 'gogogo', 'allout']
      },
      triggers: {
        enableSubagents: true,
        enableTodoContinuation: true,
        enableFullVerify: true
      }
    },
    {
      mode: 'search',
      keywords: {
        zh: ['搜索', '找一下', '查一下', '研究一下', '调查'],
        en: ['search', 'find', 'research', 'lookup']
      },
      triggers: {
        enableSubagents: true,
        enableTodoContinuation: false,
        enableFullVerify: false,
        priorityAgents: ['librarian']
      }
    },
    {
      mode: 'analyze',
      keywords: {
        zh: ['分析', '调研', '诊断', '评估', '审查'],
        en: ['analyze', 'investigate', 'diagnose', 'evaluate']
      },
      triggers: {
        enableSubagents: true,
        enableTodoContinuation: false,
        enableFullVerify: false,
        priorityAgents: ['david', 'elena', 'grace', 'frank']
      }
    }
  ]

  /**
   * 检测prompt中的关键词
   */
  detect(prompt: string): KeywordDetectionResult {
    const lowerPrompt = prompt.toLowerCase()
    
    for (const config of this.configs) {
      // 检测中文
      for (const keyword of config.keywords.zh) {
        if (prompt.includes(keyword)) {
          return {
            detected: true,
            mode: config.mode,
            matchedKeyword: keyword,
            triggers: config.triggers,
            cleanedPrompt: this.removeKeyword(prompt, keyword)
          }
        }
      }
      
      // 检测英文
      for (const keyword of config.keywords.en) {
        if (lowerPrompt.includes(keyword.toLowerCase())) {
          return {
            detected: true,
            mode: config.mode,
            matchedKeyword: keyword,
            triggers: config.triggers,
            cleanedPrompt: this.removeKeyword(prompt, keyword)
          }
        }
      }
    }
    
    return { detected: false, cleanedPrompt: prompt }
  }

  private removeKeyword(prompt: string, keyword: string): string {
    const regex = new RegExp(`\\s*${keyword}\\s*`, 'gi')
    return prompt.replace(regex, ' ').trim()
  }

  /**
   * 生成激活提示消息
   */
  generateActivationMessage(result: KeywordDetectionResult): string {
    if (!result.detected || !result.mode) return ''
    
    const messages: Record<DetectedMode, string> = {
      ultrawork: `🚀 「全力模式」已启动
• 并行执行: ✓
• 任务追踪: ✓
• 完整验证: ✓
完成后会通知您`,
      search: `🔍 「搜索模式」已启动
• 研究员已就位
• 搜索官方文档+GitHub+网络`,
      analyze: `📊 「分析模式」已启动
• 多维度并行分析
• 技术/设计/商业/市场`
    }
    
    return messages[result.mode]
  }
}

export const keywordDetector = new KeywordDetector()
```

### 2.3 集成到 AIOrchestrator

```typescript
// src/orchestrator/AIOrchestrator.ts (修改)

import { keywordDetector } from '../optimization/keyword-detector'
import { todoTracker } from '../optimization/todo-tracker'

class AIOrchestrator {
  async handleRequest(projectId: string, userId: string, prompt: string) {
    // ===== [新增] Step 0: 检测Magic Keyword =====
    const keywordResult = keywordDetector.detect(prompt)
    
    if (keywordResult.detected) {
      // 发送激活消息到前端
      await this.realtimeStream.emit(projectId, {
        type: 'mode_activated',
        data: {
          mode: keywordResult.mode,
          message: keywordDetector.generateActivationMessage(keywordResult)
        }
      })
      
      // 应用触发器
      const triggers = keywordResult.triggers!
      if (triggers.enableSubagents) {
        this.config.parallelMode = true
      }
      if (triggers.enableTodoContinuation) {
        todoTracker.enable(projectId)
      }
      if (triggers.enableFullVerify) {
        this.config.fullVerify = true
      }
      if (triggers.priorityAgents) {
        this.config.priorityAgents = triggers.priorityAgents
      }
    }
    
    // 使用清理后的prompt继续
    const cleanedPrompt = keywordResult.cleanedPrompt
    
    // ===== 原有流程继续 =====
    // ... 后续处理逻辑不变
  }
}
```

---

## 三、[优化2] Todo Continuation Enforcer

### 3.1 功能说明

```yaml
作用: 追踪所有TODO，确保AI完成所有任务才能结束
集成点: VerifyOrchestrator 验证通过后的检查点
原理: 
  1. 从用户需求中提取TODO
  2. 从代码注释中提取TODO
  3. 验证失败转为TODO
  4. AI尝试结束时检查是否全部完成
```

### 3.2 完整实现

```typescript
// src/optimization/todo-tracker/types.ts

export interface TodoItem {
  id: string
  description: string
  source: 'user_requirement' | 'code_comment' | 'ai_identified' | 'verify_failure'
  status: 'pending' | 'in_progress' | 'completed' | 'blocked'
  assignedTo?: string
  createdAt: Date
  completedAt?: Date
  blockReason?: string
}

export interface TodoCheckResult {
  canStop: boolean
  reason: string
  incompleteTodos: TodoItem[]
  stats: {
    total: number
    completed: number
    pending: number
    blocked: number
  }
}
```

```typescript
// src/optimization/todo-tracker/TodoTracker.ts

import Anthropic from '@anthropic-ai/sdk'
import { TodoItem, TodoCheckResult } from './types'

export class TodoTracker {
  private todos: Map<string, TodoItem[]> = new Map() // projectId -> todos
  private enabled: Map<string, boolean> = new Map()
  private iterations: Map<string, number> = new Map()
  private maxIterations = 50

  constructor(private claude: Anthropic) {}

  enable(projectId: string): void {
    this.enabled.set(projectId, true)
    this.iterations.set(projectId, 0)
  }

  disable(projectId: string): void {
    this.enabled.set(projectId, false)
  }

  isEnabled(projectId: string): boolean {
    return this.enabled.get(projectId) || false
  }

  /**
   * 从用户需求提取TODO
   */
  async extractFromRequirement(projectId: string, requirement: string): Promise<TodoItem[]> {
    const response = await this.claude.messages.create({
      model: 'claude-3-haiku-20240307',
      max_tokens: 1000,
      messages: [{
        role: 'user',
        content: `从需求中提取任务列表，返回JSON数组:
需求: ${requirement}

返回格式: [{"description": "任务描述"}]
只返回JSON。`
      }]
    })

    try {
      const items = JSON.parse(response.content[0].type === 'text' ? response.content[0].text : '[]')
      const todos: TodoItem[] = items.map((item: any, i: number) => ({
        id: `${projectId}-req-${Date.now()}-${i}`,
        description: item.description,
        source: 'user_requirement' as const,
        status: 'pending' as const,
        createdAt: new Date()
      }))

      const existing = this.todos.get(projectId) || []
      this.todos.set(projectId, [...existing, ...todos])
      return todos
    } catch {
      return []
    }
  }

  /**
   * 从代码注释提取TODO
   */
  extractFromCode(projectId: string, code: string): TodoItem[] {
    const todoRegex = /\/\/\s*TODO:\s*(.+)/gi
    const newTodos: TodoItem[] = []
    let match

    while ((match = todoRegex.exec(code)) !== null) {
      newTodos.push({
        id: `${projectId}-code-${Date.now()}-${newTodos.length}`,
        description: match[1].trim(),
        source: 'code_comment',
        status: 'pending',
        createdAt: new Date()
      })
    }

    if (newTodos.length > 0) {
      const existing = this.todos.get(projectId) || []
      this.todos.set(projectId, [...existing, ...newTodos])
    }

    return newTodos
  }

  /**
   * 添加验证失败的TODO
   */
  addVerifyFailure(projectId: string, description: string): TodoItem {
    const todo: TodoItem = {
      id: `${projectId}-verify-${Date.now()}`,
      description,
      source: 'verify_failure',
      status: 'pending',
      createdAt: new Date()
    }

    const existing = this.todos.get(projectId) || []
    this.todos.set(projectId, [...existing, todo])
    return todo
  }

  /**
   * 标记TODO完成
   */
  markCompleted(projectId: string, todoId: string): void {
    const todos = this.todos.get(projectId) || []
    const todo = todos.find(t => t.id === todoId)
    if (todo) {
      todo.status = 'completed'
      todo.completedAt = new Date()
    }
  }

  /**
   * 通过描述匹配并完成TODO
   */
  markCompletedByDescription(projectId: string, description: string): void {
    const todos = this.todos.get(projectId) || []
    for (const todo of todos) {
      if (todo.status === 'pending' && 
          todo.description.toLowerCase().includes(description.toLowerCase())) {
        todo.status = 'completed'
        todo.completedAt = new Date()
      }
    }
  }

  /**
   * 检查是否可以停止
   */
  checkCanStop(projectId: string): TodoCheckResult {
    if (!this.isEnabled(projectId)) {
      return {
        canStop: true,
        reason: 'Todo tracking disabled',
        incompleteTodos: [],
        stats: { total: 0, completed: 0, pending: 0, blocked: 0 }
      }
    }

    const todos = this.todos.get(projectId) || []
    const completed = todos.filter(t => t.status === 'completed')
    const pending = todos.filter(t => t.status === 'pending' || t.status === 'in_progress')
    const blocked = todos.filter(t => t.status === 'blocked')

    const stats = {
      total: todos.length,
      completed: completed.length,
      pending: pending.length,
      blocked: blocked.length
    }

    // 检查迭代次数
    const currentIteration = (this.iterations.get(projectId) || 0) + 1
    this.iterations.set(projectId, currentIteration)

    if (currentIteration >= this.maxIterations) {
      return {
        canStop: true,
        reason: `达到最大迭代次数(${this.maxIterations})`,
        incompleteTodos: pending,
        stats
      }
    }

    // 全部完成
    if (pending.length === 0) {
      return {
        canStop: true,
        reason: '所有任务已完成',
        incompleteTodos: [],
        stats
      }
    }

    // 还有未完成的
    return {
      canStop: false,
      reason: `还有 ${pending.length} 个任务未完成`,
      incompleteTodos: pending,
      stats
    }
  }

  /**
   * 生成继续工作的提示
   */
  generateContinuationPrompt(projectId: string): string {
    const result = this.checkCanStop(projectId)
    if (result.canStop) return ''

    const todoList = result.incompleteTodos
      .map(t => `- ${t.description}`)
      .join('\n')

    return `
[系统] 检测到未完成的任务，请继续:

${todoList}

请完成以上任务后再结束。`
  }

  /**
   * 获取TODO列表
   */
  getTodos(projectId: string): TodoItem[] {
    return this.todos.get(projectId) || []
  }

  /**
   * 清理项目TODO
   */
  clear(projectId: string): void {
    this.todos.delete(projectId)
    this.iterations.delete(projectId)
    this.enabled.delete(projectId)
  }
}

// 需要在应用启动时初始化
let todoTrackerInstance: TodoTracker | null = null

export function initTodoTracker(claude: Anthropic): TodoTracker {
  todoTrackerInstance = new TodoTracker(claude)
  return todoTrackerInstance
}

export function getTodoTracker(): TodoTracker {
  if (!todoTrackerInstance) {
    throw new Error('TodoTracker not initialized')
  }
  return todoTrackerInstance
}
```

### 3.3 集成到 VerifyOrchestrator

```typescript
// src/verify/VerifyOrchestrator.ts (修改)

import { getTodoTracker } from '../optimization/todo-tracker'

class VerifyOrchestrator {
  async verify(projectId: string, changes: FileChange[], config: VerifyConfig): Promise<VerifySession> {
    // ... 原有验证逻辑 ...

    // ===== [新增] 验证通过后检查TODO =====
    if (session.finalStatus === 'passed') {
      const todoTracker = getTodoTracker()
      
      // 从新代码中提取TODO注释
      for (const change of changes) {
        if (change.type !== 'deleted' && /\.(ts|tsx|js|jsx)$/.test(change.path)) {
          const content = await this.sandboxManager.readFile(projectId, change.path)
          todoTracker.extractFromCode(projectId, content)
        }
      }

      // 检查是否可以结束
      const todoCheck = todoTracker.checkCanStop(projectId)

      if (!todoCheck.canStop) {
        // 通知前端
        await this.realtimeStream.emit(projectId, {
          type: 'todo_continuation',
          data: {
            message: todoCheck.reason,
            todos: todoCheck.incompleteTodos,
            stats: todoCheck.stats
          }
        })

        // 设置继续标志
        session.needsContinuation = true
        session.continuationPrompt = todoTracker.generateContinuationPrompt(projectId)
      }
    }

    return session
  }
}
```

---

## 四、[优化3] Comment Checker

### 4.1 功能说明

```yaml
作用: 检查代码注释质量，清理冗余注释，让代码更专业
集成点: Auto-Verify流程中，在构建检查之后
原理: 
  1. 识别有效注释模式（TODO/JSDoc/指令等）
  2. 检测冗余注释（废话注释/AI标记等）
  3. 自动清理或提示
```

### 4.2 完整实现

```typescript
// src/optimization/comment-checker/types.ts

export type CommentType = 'valid' | 'suspicious' | 'redundant'

export interface CommentIssue {
  line: number
  content: string
  type: CommentType
  reason: string
  suggestion?: string
}

export interface CommentCheckResult {
  file: string
  issues: CommentIssue[]
  summary: {
    total: number
    valid: number
    suspicious: number
    redundant: number
  }
}
```

```typescript
// src/optimization/comment-checker/CommentChecker.ts

import { CommentType, CommentIssue, CommentCheckResult } from './types'

export class CommentChecker {
  // 有效注释模式
  private validPatterns: RegExp[] = [
    /^\s*\/\/\s*TODO:/i,
    /^\s*\/\/\s*FIXME:/i,
    /^\s*\/\/\s*HACK:/i,
    /^\s*\/\/\s*NOTE:/i,
    /^\s*\/\/\s*@ts-/i,
    /^\s*\/\/\s*eslint-/i,
    /^\s*\/\*\*[\s\S]*?\*\//,  // JSDoc
  ]

  // 冗余注释模式
  private redundantPatterns: RegExp[] = [
    /^\s*\/\/\s*(获取|设置|返回|创建|删除|更新).{0,10}$/,
    /^\s*\/\/\s*(This|The|A)\s+(function|method|class)/i,
    /^\s*\/\/\s*Created by/i,
    /^\s*\/\/\s*Generated/i,
    /^\s*\/\/\s*[-=]{3,}$/,
    /^\s*\/\/\s*$/,
  ]

  /**
   * 检查单个文件
   */
  checkFile(filePath: string, content: string): CommentCheckResult {
    const lines = content.split('\n')
    const issues: CommentIssue[] = []

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i]
      const lineNumber = i + 1

      // 检测单行注释
      const commentMatch = line.match(/\/\/(.*)$/)
      if (commentMatch) {
        const result = this.classifyComment(commentMatch[0], line)
        if (result.type !== 'valid') {
          issues.push({
            line: lineNumber,
            content: commentMatch[0],
            ...result
          })
        }
      }
    }

    return {
      file: filePath,
      issues,
      summary: {
        total: issues.length,
        valid: 0,
        suspicious: issues.filter(i => i.type === 'suspicious').length,
        redundant: issues.filter(i => i.type === 'redundant').length
      }
    }
  }

  private classifyComment(comment: string, fullLine: string): { type: CommentType; reason: string; suggestion?: string } {
    // 检查有效模式
    for (const pattern of this.validPatterns) {
      if (pattern.test(comment)) {
        return { type: 'valid', reason: '有效注释' }
      }
    }

    // 检查冗余模式
    for (const pattern of this.redundantPatterns) {
      if (pattern.test(comment)) {
        return {
          type: 'redundant',
          reason: '冗余注释',
          suggestion: '建议删除'
        }
      }
    }

    // 检查行内注释
    const codeBeforeComment = fullLine.split('//')[0].trim()
    if (codeBeforeComment.length > 0) {
      return {
        type: 'suspicious',
        reason: '行内注释，请确认必要性',
        suggestion: '如代码自解释，可删除'
      }
    }

    return {
      type: 'suspicious',
      reason: '独立注释行',
      suggestion: '确认是否必要'
    }
  }

  /**
   * 自动清理冗余注释
   */
  autoClean(content: string): { cleaned: string; removedCount: number } {
    const lines = content.split('\n')
    const cleanedLines: string[] = []
    let removed = 0

    for (const line of lines) {
      let shouldRemove = false
      for (const pattern of this.redundantPatterns) {
        if (pattern.test(line)) {
          shouldRemove = true
          removed++
          break
        }
      }
      if (!shouldRemove) {
        cleanedLines.push(line)
      }
    }

    return {
      cleaned: cleanedLines.join('\n'),
      removedCount: removed
    }
  }

  /**
   * 生成修复建议
   */
  generateSuggestions(results: CommentCheckResult[]): string {
    const allIssues = results.flatMap(r => r.issues.map(i => ({ ...i, file: r.file })))
    
    if (allIssues.length === 0) {
      return '✅ 注释质量检查通过'
    }

    const redundant = allIssues.filter(i => i.type === 'redundant')
    let msg = `📝 发现 ${allIssues.length} 处注释问题:\n\n`

    if (redundant.length > 0) {
      msg += `🗑️ 冗余注释 (${redundant.length}处):\n`
      redundant.slice(0, 5).forEach(i => {
        msg += `  ${i.file}:${i.line}\n`
      })
    }

    return msg
  }
}

export const commentChecker = new CommentChecker()
```

### 4.3 集成到 VerifyBuildService

```typescript
// src/verify/services/VerifyBuildService.ts (新增方法)

import { commentChecker } from '../../optimization/comment-checker'

class VerifyBuildService {
  /**
   * [新增] 注释质量检查
   */
  async checkComments(projectId: string, files: string[]): Promise<VerifyResult> {
    const startTime = Date.now()
    const results: CommentCheckResult[] = []

    for (const file of files) {
      if (!/\.(ts|tsx|js|jsx)$/.test(file)) continue
      
      const content = await this.sandboxManager.readFile(projectId, file)
      const result = commentChecker.checkFile(file, content)
      
      if (result.summary.redundant > 0 || result.summary.suspicious > 0) {
        results.push(result)
      }
    }

    const totalIssues = results.reduce((sum, r) => sum + r.summary.redundant, 0)

    if (totalIssues === 0) {
      return {
        type: 'comment-check',
        status: 'passed',
        duration: Date.now() - startTime,
        message: '注释质量检查通过'
      }
    }

    return {
      type: 'comment-check',
      status: 'failed',
      duration: Date.now() - startTime,
      message: `发现 ${totalIssues} 处冗余注释`,
      data: { results, suggestions: commentChecker.generateSuggestions(results) }
    }
  }
}
```

---

## 五、[优化4] Context Window Monitor

### 5.1 功能说明

```yaml
作用: 主动监控上下文使用率，提前压缩避免撞墙
集成点: Memory Controller，每次AI响应前检查
原理:
  - 70%: 提醒AI还有空间，不要匆忙
  - 85%: 触发主动压缩
  - 95%: 紧急压缩
```

### 5.2 完整实现

```typescript
// src/optimization/context-monitor/types.ts

export type ContextStatus = 'normal' | 'warning' | 'critical' | 'emergency'

export interface ContextCheckResult {
  status: ContextStatus
  usage: number
  usedTokens: number
  maxTokens: number
  action: 'continue' | 'warn' | 'compact' | 'emergency_compact'
  message?: string
}

export interface CompactResult {
  success: boolean
  originalTokens: number
  compactedTokens: number
  summary: string
}
```

```typescript
// src/optimization/context-monitor/ContextWindowMonitor.ts

import Anthropic from '@anthropic-ai/sdk'
import { ContextStatus, ContextCheckResult, CompactResult } from './types'

interface Message {
  role: 'user' | 'assistant' | 'system'
  content: string
}

export class ContextWindowMonitor {
  private thresholds = {
    warning: 0.70,
    compact: 0.85,
    emergency: 0.95
  }

  constructor(private claude: Anthropic) {}

  /**
   * 检查上下文状态
   */
  check(usedTokens: number, maxTokens: number): ContextCheckResult {
    const usage = usedTokens / maxTokens

    if (usage >= this.thresholds.emergency) {
      return {
        status: 'emergency',
        usage,
        usedTokens,
        maxTokens,
        action: 'emergency_compact',
        message: `⚠️ 上下文 ${Math.round(usage * 100)}%，紧急压缩中...`
      }
    }

    if (usage >= this.thresholds.compact) {
      return {
        status: 'critical',
        usage,
        usedTokens,
        maxTokens,
        action: 'compact',
        message: `📦 上下文 ${Math.round(usage * 100)}%，优化压缩中...`
      }
    }

    if (usage >= this.thresholds.warning) {
      return {
        status: 'warning',
        usage,
        usedTokens,
        maxTokens,
        action: 'warn',
        message: `💡 上下文还有 ${Math.round((1 - usage) * 100)}% 空间，保持高质量输出`
      }
    }

    return {
      status: 'normal',
      usage,
      usedTokens,
      maxTokens,
      action: 'continue'
    }
  }

  /**
   * 执行压缩
   */
  async compact(messages: Message[], isEmergency: boolean = false): Promise<CompactResult> {
    const keepCount = isEmergency ? 2 : 6  // 紧急保留1轮，正常保留3轮
    
    if (messages.length <= keepCount) {
      return {
        success: true,
        originalTokens: 0,
        compactedTokens: 0,
        summary: '消息数量较少，无需压缩'
      }
    }

    const recentMessages = messages.slice(-keepCount)
    const oldMessages = messages.slice(0, -keepCount)

    // 生成摘要
    const summary = await this.generateSummary(oldMessages, isEmergency)

    return {
      success: true,
      originalTokens: this.estimateTokens(oldMessages),
      compactedTokens: this.estimateTokens([{ role: 'system', content: summary }]),
      summary
    }
  }

  private async generateSummary(messages: Message[], brief: boolean): Promise<string> {
    const maxTokens = brief ? 200 : 500
    const prompt = brief
      ? `用50字总结核心内容:\n${messages.map(m => `[${m.role}]: ${m.content}`).join('\n')}`
      : `压缩为摘要，保留关键信息:\n${messages.map(m => `[${m.role}]: ${m.content}`).join('\n')}\n\n格式:\n- 用户需求: xxx\n- 已完成: xxx\n- 进度: xxx`

    const response = await this.claude.messages.create({
      model: 'claude-3-haiku-20240307',
      max_tokens: maxTokens,
      messages: [{ role: 'user', content: prompt }]
    })

    return response.content[0].type === 'text' ? response.content[0].text : ''
  }

  private estimateTokens(messages: Message[]): number {
    return messages.reduce((sum, m) => sum + Math.ceil(m.content.length / 4), 0)
  }

  /**
   * 生成警告提示
   */
  generateWarningPrompt(usage: number): string {
    return `[系统] 上下文使用率 ${Math.round(usage * 100)}%，还有空间，请保持高质量输出。`
  }
}
```

### 5.3 集成到 Memory Controller

```typescript
// src/memory/MemoryController.ts (修改)

import { ContextWindowMonitor } from '../optimization/context-monitor'

class MemoryController {
  private contextMonitor: ContextWindowMonitor

  constructor(claude: Anthropic) {
    this.contextMonitor = new ContextWindowMonitor(claude)
  }

  /**
   * [修改] 处理请求前检查上下文
   */
  async beforeRequest(messages: Message[], maxTokens: number): Promise<{
    messages: Message[]
    injectedPrompt?: string
  }> {
    const usedTokens = this.estimateTokens(messages)
    const check = this.contextMonitor.check(usedTokens, maxTokens)

    // 需要压缩
    if (check.action === 'compact' || check.action === 'emergency_compact') {
      const isEmergency = check.action === 'emergency_compact'
      const compactResult = await this.contextMonitor.compact(messages, isEmergency)
      
      if (compactResult.success) {
        const keepCount = isEmergency ? 2 : 6
        const summaryMessage: Message = {
          role: 'system',
          content: `[会话摘要]\n${compactResult.summary}\n\n[继续对话]`
        }
        
        return {
          messages: [summaryMessage, ...messages.slice(-keepCount)],
          injectedPrompt: check.message
        }
      }
    }

    // 需要警告
    if (check.action === 'warn') {
      return {
        messages,
        injectedPrompt: this.contextMonitor.generateWarningPrompt(check.usage)
      }
    }

    return { messages }
  }
}
```

---

## 六、[优化5] Session Recovery

### 6.1 完整实现

```typescript
// src/optimization/session-recovery/SessionRecovery.ts

type ErrorType = 'rate_limit' | 'timeout' | 'context_exceeded' | 'thinking_block' | 'empty_message' | 'unknown'

interface RecoveryResult {
  success: boolean
  errorType: ErrorType
  action: string
  userNotification?: string
}

export class SessionRecovery {
  private maxRetries = 3
  private retryDelays = [1000, 2000, 5000]

  /**
   * 分析错误类型
   */
  analyzeError(error: Error): ErrorType {
    const msg = error.message.toLowerCase()
    
    if (msg.includes('rate limit') || msg.includes('429')) return 'rate_limit'
    if (msg.includes('timeout')) return 'timeout'
    if (msg.includes('context') && msg.includes('exceed')) return 'context_exceeded'
    if (msg.includes('thinking')) return 'thinking_block'
    if (msg.includes('empty')) return 'empty_message'
    
    return 'unknown'
  }

  /**
   * 尝试恢复
   */
  async recover(
    error: Error,
    retryFn: () => Promise<any>,
    compactFn?: () => Promise<void>
  ): Promise<RecoveryResult> {
    const errorType = this.analyzeError(error)

    switch (errorType) {
      case 'rate_limit':
        return this.handleWithRetry(errorType, retryFn)
      
      case 'context_exceeded':
        if (compactFn) {
          await compactFn()
          try {
            await retryFn()
            return { success: true, errorType, action: '压缩后重试成功' }
          } catch {
            return { success: false, errorType, action: '压缩后仍失败', userNotification: '请开始新会话' }
          }
        }
        return { success: false, errorType, action: '无法压缩', userNotification: '请开始新会话' }
      
      case 'thinking_block':
      case 'empty_message':
        // 这些通常可以通过重试解决
        return this.handleWithRetry(errorType, retryFn)
      
      default:
        return { success: false, errorType, action: '未知错误', userNotification: '遇到问题，请重试' }
    }
  }

  private async handleWithRetry(errorType: ErrorType, retryFn: () => Promise<any>): Promise<RecoveryResult> {
    for (let i = 0; i < this.maxRetries; i++) {
      await this.sleep(this.retryDelays[i])
      try {
        await retryFn()
        return { success: true, errorType, action: `第${i + 1}次重试成功` }
      } catch {
        continue
      }
    }
    return { success: false, errorType, action: '重试失败', userNotification: '服务繁忙，请稍后再试' }
  }

  private sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms))
  }
}

export const sessionRecovery = new SessionRecovery()
```

---

## 七、[优化6] Librarian Agent (研究员)

### 7.1 完整实现

```typescript
// src/agents/librarian/LibrarianAgent.ts

import Anthropic from '@anthropic-ai/sdk'

interface ResearchResult {
  topic: string
  findings: string[]
  codeExamples: string[]
  recommendations: string[]
  references: string[]
}

export class LibrarianAgent {
  private agentId = 'librarian'
  private name = '研究员'
  private model = 'claude-3-5-sonnet-20241022'  // 用Sonnet，平衡成本和质量

  constructor(
    private claude: Anthropic,
    private mcpClient?: any  // MCP客户端，可选
  ) {}

  /**
   * 执行研究任务
   */
  async research(topic: string, context?: string): Promise<ResearchResult> {
    // Step 1: 搜索官方文档 (通过MCP)
    let docResults = ''
    if (this.mcpClient) {
      try {
        docResults = await this.searchDocs(topic)
      } catch {
        // MCP不可用，继续
      }
    }

    // Step 2: 使用Claude进行深度研究
    const response = await this.claude.messages.create({
      model: this.model,
      max_tokens: 4000,
      system: `你是研究员(Librarian)，专门负责技术调研。
你的职责:
1. 查找和分析技术方案
2. 研究开源实现
3. 收集最佳实践
4. 提供代码示例

输出格式必须是结构化的研究报告。`,
      messages: [{
        role: 'user',
        content: `请研究以下主题:

主题: ${topic}
${context ? `背景: ${context}` : ''}
${docResults ? `相关文档:\n${docResults}` : ''}

请提供:
1. 关键发现 (3-5条)
2. 代码示例 (如适用)
3. 推荐做法
4. 参考资源

以JSON格式返回:
{
  "findings": ["发现1", "发现2"],
  "codeExamples": ["代码1"],
  "recommendations": ["建议1"],
  "references": ["链接1"]
}`
      }]
    })

    try {
      const text = response.content[0].type === 'text' ? response.content[0].text : '{}'
      // 提取JSON
      const jsonMatch = text.match(/\{[\s\S]*\}/)
      const data = jsonMatch ? JSON.parse(jsonMatch[0]) : {}
      
      return {
        topic,
        findings: data.findings || [],
        codeExamples: data.codeExamples || [],
        recommendations: data.recommendations || [],
        references: data.references || []
      }
    } catch {
      return {
        topic,
        findings: ['研究完成，但解析结果失败'],
        codeExamples: [],
        recommendations: [],
        references: []
      }
    }
  }

  /**
   * 通过MCP搜索文档
   */
  private async searchDocs(query: string): Promise<string> {
    if (!this.mcpClient) return ''
    
    // 调用context7 MCP获取官方文档
    try {
      const result = await this.mcpClient.call('context7', 'search', { query })
      return result?.content || ''
    } catch {
      return ''
    }
  }

  /**
   * 格式化研究报告
   */
  formatReport(result: ResearchResult): string {
    let report = `📚 研究报告: ${result.topic}\n\n`

    if (result.findings.length > 0) {
      report += `## 关键发现\n`
      result.findings.forEach((f, i) => {
        report += `${i + 1}. ${f}\n`
      })
      report += '\n'
    }

    if (result.codeExamples.length > 0) {
      report += `## 代码示例\n`
      result.codeExamples.forEach(code => {
        report += `\`\`\`\n${code}\n\`\`\`\n`
      })
      report += '\n'
    }

    if (result.recommendations.length > 0) {
      report += `## 推荐做法\n`
      result.recommendations.forEach((r, i) => {
        report += `${i + 1}. ${r}\n`
      })
      report += '\n'
    }

    if (result.references.length > 0) {
      report += `## 参考资源\n`
      result.references.forEach(ref => {
        report += `- ${ref}\n`
      })
    }

    return report
  }
}
```

### 7.2 注册到AI高管系统

```typescript
// src/agents/index.ts (修改)

import { LibrarianAgent } from './librarian/LibrarianAgent'

// 高管配置
export const AI_EXECUTIVES = {
  // ... 原有18个高管 ...
  
  // [新增] 第19个高管: 研究员
  librarian: {
    id: 'librarian',
    name: '研究员',
    role: 'Librarian',
    avatar: '📚',
    description: '专门负责技术调研、文档查找、开源实现研究',
    model: 'claude-3-5-sonnet-20241022',
    expertise: [
      '查找官方文档',
      '研究开源实现',
      '收集最佳实践',
      '提供参考资料'
    ],
    tools: ['context7', 'grep_app', 'web_search']
  }
}
```

---

## 八、WebSocket 事件定义

```typescript
// src/types/websocket-events.ts (新增)

// 优化相关的WebSocket事件
export type OptimizationEvent =
  // Magic Keyword
  | { type: 'mode_activated'; data: { mode: string; message: string } }
  
  // Todo Continuation
  | { type: 'todo_list_created'; data: { todos: TodoItem[] } }
  | { type: 'todo_updated'; data: { todoId: string; status: string } }
  | { type: 'todo_continuation'; data: { message: string; todos: TodoItem[]; stats: any } }
  
  // Comment Checker
  | { type: 'comment_check_result'; data: { issues: number; suggestions: string } }
  
  // Context Monitor
  | { type: 'context_warning'; data: { usage: number; message: string } }
  | { type: 'context_compacting'; data: { isEmergency: boolean } }
  | { type: 'context_compacted'; data: { savedTokens: number } }
  
  // Session Recovery
  | { type: 'session_recovering'; data: { errorType: string } }
  | { type: 'session_recovered'; data: { action: string } }
  | { type: 'session_recovery_failed'; data: { message: string } }
```

---

## 九、前端UI组件

### 9.1 Todo进度组件

```tsx
// components/TodoProgress.tsx

interface TodoProgressProps {
  todos: TodoItem[]
  stats: { total: number; completed: number; pending: number }
}

export function TodoProgress({ todos, stats }: TodoProgressProps) {
  const progress = stats.total > 0 ? (stats.completed / stats.total) * 100 : 0

  return (
    <div className="todo-progress">
      <div className="header">
        <span>📋 任务进度</span>
        <span>{stats.completed}/{stats.total}</span>
      </div>
      
      <div className="progress-bar">
        <div className="fill" style={{ width: `${progress}%` }} />
      </div>
      
      <div className="todo-list">
        {todos.map(todo => (
          <div key={todo.id} className={`todo-item ${todo.status}`}>
            <span className="icon">
              {todo.status === 'completed' ? '✅' : 
               todo.status === 'in_progress' ? '🔄' : '⬜'}
            </span>
            <span className="text">{todo.description}</span>
          </div>
        ))}
      </div>
    </div>
  )
}
```

### 9.2 模式激活提示组件

```tsx
// components/ModeActivation.tsx

interface ModeActivationProps {
  mode: string
  message: string
}

export function ModeActivation({ mode, message }: ModeActivationProps) {
  const icons: Record<string, string> = {
    ultrawork: '🚀',
    search: '🔍',
    analyze: '📊'
  }

  return (
    <div className={`mode-activation mode-${mode}`}>
      <span className="icon">{icons[mode] || '⚡'}</span>
      <div className="content">
        <pre>{message}</pre>
      </div>
    </div>
  )
}
```

---

## 十、开发清单

### 10.1 文件创建清单

```
需要创建的新文件:
├── src/optimization/
│   ├── keyword-detector/
│   │   ├── types.ts
│   │   ├── KeywordDetector.ts
│   │   └── index.ts
│   ├── todo-tracker/
│   │   ├── types.ts
│   │   ├── TodoTracker.ts
│   │   └── index.ts
│   ├── comment-checker/
│   │   ├── types.ts
│   │   ├── CommentChecker.ts
│   │   └── index.ts
│   ├── context-monitor/
│   │   ├── types.ts
│   │   ├── ContextWindowMonitor.ts
│   │   └── index.ts
│   ├── session-recovery/
│   │   ├── SessionRecovery.ts
│   │   └── index.ts
│   └── index.ts
├── src/agents/librarian/
│   ├── LibrarianAgent.ts
│   └── index.ts
└── components/
    ├── TodoProgress.tsx
    └── ModeActivation.tsx
```

### 10.2 文件修改清单

```
需要修改的现有文件:
├── src/orchestrator/AIOrchestrator.ts    # 集成KeywordDetector
├── src/verify/VerifyOrchestrator.ts      # 集成TodoTracker + CommentChecker
├── src/verify/services/VerifyBuildService.ts  # 新增checkComments方法
├── src/memory/MemoryController.ts        # 集成ContextWindowMonitor
├── src/agents/index.ts                   # 添加Librarian配置
└── src/types/websocket-events.ts         # 添加优化相关事件
```

### 10.3 开发顺序建议

```
Week 1:
  Day 1-2: KeywordDetector + 集成到Orchestrator
  Day 3-4: TodoTracker + 集成到VerifyOrchestrator
  Day 5: CommentChecker + 集成

Week 2:
  Day 1-2: ContextWindowMonitor + 集成到MemoryController
  Day 3: SessionRecovery
  Day 4-5: LibrarianAgent + MCP集成

Week 3:
  Day 1-2: 前端组件开发
  Day 3-5: 集成测试 + 优化
```

---

**配套文档**: [系统优化升级PRD](./11-OPTIMIZATION-PRD.md)
