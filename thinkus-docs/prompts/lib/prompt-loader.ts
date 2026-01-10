// lib/prompts/prompt-loader.ts
// 提示词加载器 - 读取、解析、渲染提示词

import fs from 'fs'
import path from 'path'
import matter from 'gray-matter'

// ============================================================
// 类型定义
// ============================================================

export interface PromptConfig {
  id: string
  version: string
  model: 'claude-opus' | 'claude-sonnet' | 'claude-haiku'
  temperature: number
  maxTokens: number
  tags?: string[]
}

export interface PromptTemplate {
  config: PromptConfig
  content: string
  filePath: string
}

export interface RenderedPrompt {
  config: PromptConfig
  systemPrompt: string
  estimatedTokens: number
}

export interface PromptExecution {
  promptId: string
  version: string
  input: Record<string, any>
  output: string
  metrics: {
    inputTokens: number
    outputTokens: number
    latencyMs: number
    formatValid: boolean
    taskCompleted: boolean
  }
  timestamp: Date
}

// ============================================================
// 提示词加载器
// ============================================================

export class PromptLoader {
  private basePath: string
  private cache: Map<string, PromptTemplate> = new Map()
  private cacheEnabled: boolean

  constructor(basePath: string, cacheEnabled = true) {
    this.basePath = basePath
    this.cacheEnabled = cacheEnabled
  }

  /**
   * 加载单个提示词
   */
  async load(promptPath: string): Promise<PromptTemplate> {
    const fullPath = path.join(this.basePath, promptPath)
    const cacheKey = fullPath

    // 检查缓存
    if (this.cacheEnabled && this.cache.has(cacheKey)) {
      return this.cache.get(cacheKey)!
    }

    // 读取文件
    const fileContent = await fs.promises.readFile(fullPath, 'utf-8')
    
    // 解析 frontmatter
    const { data, content } = matter(fileContent)
    
    const template: PromptTemplate = {
      config: {
        id: data.id || path.basename(promptPath, '.md'),
        version: data.version || '1.0.0',
        model: data.model || 'claude-sonnet',
        temperature: data.temperature ?? 0.7,
        maxTokens: data.maxTokens || data.max_tokens || 2000,
        tags: data.tags || [],
      },
      content: content.trim(),
      filePath: fullPath,
    }

    // 存入缓存
    if (this.cacheEnabled) {
      this.cache.set(cacheKey, template)
    }

    return template
  }

  /**
   * 渲染提示词 - 替换变量
   */
  render(template: PromptTemplate, variables: Record<string, any>): RenderedPrompt {
    let rendered = template.content

    // 替换 {variable} 格式的变量
    rendered = rendered.replace(/\{(\w+)\}/g, (match, key) => {
      if (key in variables) {
        const value = variables[key]
        // 如果是对象或数组，转为JSON
        if (typeof value === 'object') {
          return JSON.stringify(value, null, 2)
        }
        return String(value)
      }
      // 未提供的变量保持原样（可能是示例中的占位符）
      return match
    })

    // 替换 ${variable} 格式的变量（兼容）
    rendered = rendered.replace(/\$\{(\w+)\}/g, (match, key) => {
      if (key in variables) {
        const value = variables[key]
        if (typeof value === 'object') {
          return JSON.stringify(value, null, 2)
        }
        return String(value)
      }
      return match
    })

    // 估算token数（简单估算：4字符约1token）
    const estimatedTokens = Math.ceil(rendered.length / 4)

    return {
      config: template.config,
      systemPrompt: rendered,
      estimatedTokens,
    }
  }

  /**
   * 加载并渲染提示词（组合方法）
   */
  async loadAndRender(
    promptPath: string, 
    variables: Record<string, any>
  ): Promise<RenderedPrompt> {
    const template = await this.load(promptPath)
    return this.render(template, variables)
  }

  /**
   * 清除缓存
   */
  clearCache(promptPath?: string): void {
    if (promptPath) {
      const fullPath = path.join(this.basePath, promptPath)
      this.cache.delete(fullPath)
    } else {
      this.cache.clear()
    }
  }

  /**
   * 列出所有提示词
   */
  async listPrompts(subPath = ''): Promise<string[]> {
    const dirPath = path.join(this.basePath, subPath)
    const prompts: string[] = []

    const scanDir = async (dir: string, prefix: string) => {
      const entries = await fs.promises.readdir(dir, { withFileTypes: true })
      
      for (const entry of entries) {
        const relativePath = path.join(prefix, entry.name)
        
        if (entry.isDirectory()) {
          await scanDir(path.join(dir, entry.name), relativePath)
        } else if (entry.name.endsWith('.md')) {
          prompts.push(relativePath)
        }
      }
    }

    await scanDir(dirPath, subPath)
    return prompts
  }
}

// ============================================================
// 提示词管理器 - 带版本和A/B测试支持
// ============================================================

export class PromptManager {
  private loader: PromptLoader
  private abTests: Map<string, ABTest> = new Map()
  private metrics: PromptMetricsCollector

  constructor(basePath: string) {
    this.loader = new PromptLoader(basePath)
    this.metrics = new PromptMetricsCollector()
  }

  /**
   * 获取提示词（考虑A/B测试）
   */
  async getPrompt(
    promptId: string,
    variables: Record<string, any>,
    context?: { projectId?: string; userId?: string }
  ): Promise<RenderedPrompt & { version: string }> {
    // 检查是否有A/B测试
    const abTest = this.abTests.get(promptId)
    let version = 'current'

    if (abTest && abTest.status === 'running') {
      // 根据context决定分配哪个版本
      version = this.assignABTestVersion(abTest, context)
    }

    // 构建路径
    const promptPath = this.buildPromptPath(promptId, version)
    
    // 加载并渲染
    const rendered = await this.loader.loadAndRender(promptPath, variables)

    return {
      ...rendered,
      version: rendered.config.version,
    }
  }

  /**
   * 记录执行结果
   */
  async recordExecution(execution: PromptExecution): Promise<void> {
    await this.metrics.record(execution)
    
    // 如果在A/B测试中，更新测试数据
    const abTest = this.abTests.get(execution.promptId)
    if (abTest && abTest.status === 'running') {
      await this.updateABTestMetrics(abTest, execution)
    }
  }

  /**
   * 创建A/B测试
   */
  createABTest(config: ABTestConfig): ABTest {
    const test: ABTest = {
      id: `ab_${Date.now()}`,
      promptId: config.promptId,
      versionA: config.versionA,
      versionB: config.versionB,
      trafficSplit: config.trafficSplit || 0.1,
      status: 'running',
      startedAt: new Date(),
      metrics: {
        A: { executions: 0, successRate: 0, avgLatency: 0 },
        B: { executions: 0, successRate: 0, avgLatency: 0 },
      },
    }

    this.abTests.set(config.promptId, test)
    return test
  }

  /**
   * 获取提示词指标
   */
  async getMetrics(promptId: string): Promise<PromptMetrics> {
    return this.metrics.getMetrics(promptId)
  }

  // 私有方法

  private buildPromptPath(promptId: string, version: string): string {
    // promptId 格式: "requirement/understand" 或 "discussion/mike-pm"
    if (version === 'current') {
      return `agents/${promptId}.md`
    }
    return `agents/${promptId}.v${version}.md`
  }

  private assignABTestVersion(
    test: ABTest, 
    context?: { projectId?: string }
  ): string {
    // 使用projectId进行一致性hash，确保同一项目始终使用同一版本
    if (context?.projectId) {
      const hash = this.simpleHash(context.projectId)
      return hash % 100 < test.trafficSplit * 100 ? test.versionB : test.versionA
    }
    // 随机分配
    return Math.random() < test.trafficSplit ? test.versionB : test.versionA
  }

  private simpleHash(str: string): number {
    let hash = 0
    for (let i = 0; i < str.length; i++) {
      hash = ((hash << 5) - hash) + str.charCodeAt(i)
      hash |= 0
    }
    return Math.abs(hash)
  }

  private async updateABTestMetrics(
    test: ABTest, 
    execution: PromptExecution
  ): Promise<void> {
    const variant = execution.version === test.versionB ? 'B' : 'A'
    const metrics = test.metrics[variant]
    
    metrics.executions++
    // 更新成功率（滑动平均）
    const success = execution.metrics.taskCompleted ? 1 : 0
    metrics.successRate = (metrics.successRate * (metrics.executions - 1) + success) / metrics.executions
    // 更新延迟（滑动平均）
    metrics.avgLatency = (metrics.avgLatency * (metrics.executions - 1) + execution.metrics.latencyMs) / metrics.executions
  }
}

// ============================================================
// 指标收集器
// ============================================================

export class PromptMetricsCollector {
  private executions: Map<string, PromptExecution[]> = new Map()

  async record(execution: PromptExecution): Promise<void> {
    const key = execution.promptId
    if (!this.executions.has(key)) {
      this.executions.set(key, [])
    }
    
    const list = this.executions.get(key)!
    list.push(execution)
    
    // 只保留最近1000条
    if (list.length > 1000) {
      list.shift()
    }
  }

  async getMetrics(promptId: string): Promise<PromptMetrics> {
    const executions = this.executions.get(promptId) || []
    
    if (executions.length === 0) {
      return {
        promptId,
        totalExecutions: 0,
        formatAccuracy: 0,
        taskSuccessRate: 0,
        avgInputTokens: 0,
        avgOutputTokens: 0,
        avgLatencyMs: 0,
        reworkRate: 0,
      }
    }

    const total = executions.length
    const formatValid = executions.filter(e => e.metrics.formatValid).length
    const taskSuccess = executions.filter(e => e.metrics.taskCompleted).length
    const avgInput = executions.reduce((sum, e) => sum + e.metrics.inputTokens, 0) / total
    const avgOutput = executions.reduce((sum, e) => sum + e.metrics.outputTokens, 0) / total
    const avgLatency = executions.reduce((sum, e) => sum + e.metrics.latencyMs, 0) / total

    return {
      promptId,
      totalExecutions: total,
      formatAccuracy: (formatValid / total) * 100,
      taskSuccessRate: (taskSuccess / total) * 100,
      avgInputTokens: Math.round(avgInput),
      avgOutputTokens: Math.round(avgOutput),
      avgLatencyMs: Math.round(avgLatency),
      reworkRate: 0, // 需要额外逻辑计算
    }
  }
}

// ============================================================
// 类型定义（补充）
// ============================================================

interface ABTestConfig {
  promptId: string
  versionA: string
  versionB: string
  trafficSplit?: number
}

interface ABTest {
  id: string
  promptId: string
  versionA: string
  versionB: string
  trafficSplit: number
  status: 'running' | 'completed' | 'cancelled'
  startedAt: Date
  endedAt?: Date
  metrics: {
    A: { executions: number; successRate: number; avgLatency: number }
    B: { executions: number; successRate: number; avgLatency: number }
  }
  result?: {
    winner: 'A' | 'B' | 'tie'
    confidence: number
  }
}

interface PromptMetrics {
  promptId: string
  totalExecutions: number
  formatAccuracy: number
  taskSuccessRate: number
  avgInputTokens: number
  avgOutputTokens: number
  avgLatencyMs: number
  reworkRate: number
}

// ============================================================
// 导出单例
// ============================================================

let promptManager: PromptManager | null = null

export function getPromptManager(): PromptManager {
  if (!promptManager) {
    const basePath = process.env.PROMPTS_PATH || './prompts'
    promptManager = new PromptManager(basePath)
  }
  return promptManager
}

// ============================================================
// 使用示例
// ============================================================

/*
import { getPromptManager } from '@/lib/prompts/prompt-loader'

// 获取提示词
const pm = getPromptManager()
const prompt = await pm.getPrompt('requirement/understand', {
  user_input: '我想做一个宠物社交App',
  conversation_history: [],
})

// 调用Claude
const response = await claude.complete({
  model: prompt.config.model,
  temperature: prompt.config.temperature,
  max_tokens: prompt.config.maxTokens,
  system: prompt.systemPrompt,
  messages: [{ role: 'user', content: userMessage }],
})

// 记录执行结果
await pm.recordExecution({
  promptId: 'requirement/understand',
  version: prompt.version,
  input: { user_input: '...' },
  output: response.content,
  metrics: {
    inputTokens: response.usage.input_tokens,
    outputTokens: response.usage.output_tokens,
    latencyMs: responseTime,
    formatValid: validateFormat(response.content),
    taskCompleted: true,
  },
  timestamp: new Date(),
})

// 获取指标
const metrics = await pm.getMetrics('requirement/understand')
console.log(metrics)
*/
