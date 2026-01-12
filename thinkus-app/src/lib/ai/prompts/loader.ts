import fs from 'fs'
import path from 'path'
import matter from 'gray-matter'
import {
  PromptConfig,
  LoadedPrompt,
  RenderedPrompt,
  PromptExecution,
  MODEL_MAP,
  DEFAULT_CONFIG,
} from './types'

// 提示词目录
const PROMPTS_DIR = path.join(process.cwd(), 'prompts/agents')

// 缓存已加载的提示词
const promptCache = new Map<string, LoadedPrompt>()

/**
 * 加载提示词文件
 * @param promptPath - 相对路径，如 'requirement/understand'
 * @returns 加载后的提示词对象
 */
export function loadPrompt(promptPath: string): LoadedPrompt {
  // 检查缓存
  if (promptCache.has(promptPath)) {
    return promptCache.get(promptPath)!
  }

  const fullPath = path.join(PROMPTS_DIR, `${promptPath}.md`)

  if (!fs.existsSync(fullPath)) {
    throw new Error(`Prompt file not found: ${fullPath}`)
  }

  const fileContent = fs.readFileSync(fullPath, 'utf-8')
  const { data, content } = matter(fileContent)

  const config: PromptConfig = {
    id: data.id || promptPath.replace(/\//g, '-'),
    version: data.version || '1.0.0',
    model: data.model || DEFAULT_CONFIG.model!,
    temperature: data.temperature ?? DEFAULT_CONFIG.temperature!,
    maxTokens: data.max_tokens || data.maxTokens || DEFAULT_CONFIG.maxTokens!,
    tags: data.tags || [],
  }

  const loadedPrompt: LoadedPrompt = {
    config,
    template: content.trim(),
    rawContent: fileContent,
  }

  // 存入缓存
  promptCache.set(promptPath, loadedPrompt)

  return loadedPrompt
}

/**
 * 渲染模板变量
 * @param template - 模板字符串
 * @param variables - 变量对象
 * @returns 渲染后的字符串
 */
export function renderTemplate(
  template: string,
  variables: Record<string, unknown>
): string {
  return template.replace(/\{(\w+)\}/g, (match, key) => {
    if (key in variables) {
      const value = variables[key]
      if (value === null || value === undefined) {
        return ''
      }
      if (typeof value === 'object') {
        return JSON.stringify(value, null, 2)
      }
      return String(value)
    }
    // 保留未匹配的变量
    return match
  })
}

/**
 * 获取渲染后的提示词
 * @param promptPath - 相对路径
 * @param variables - 变量对象
 * @returns 渲染后的提示词
 */
export function getPrompt(
  promptPath: string,
  variables: Record<string, unknown> = {}
): RenderedPrompt {
  const loaded = loadPrompt(promptPath)
  const systemPrompt = renderTemplate(loaded.template, variables)

  return {
    config: loaded.config,
    systemPrompt,
    claudeModel: MODEL_MAP[loaded.config.model],
  }
}

/**
 * 列出所有可用的提示词
 * @returns 提示词路径列表
 */
export function listPrompts(): string[] {
  const prompts: string[] = []

  function scanDir(dir: string, prefix: string = '') {
    if (!fs.existsSync(dir)) {
      return
    }

    const entries = fs.readdirSync(dir, { withFileTypes: true })

    for (const entry of entries) {
      if (entry.isDirectory()) {
        scanDir(path.join(dir, entry.name), `${prefix}${entry.name}/`)
      } else if (entry.name.endsWith('.md')) {
        const promptPath = `${prefix}${entry.name.replace('.md', '')}`
        prompts.push(promptPath)
      }
    }
  }

  scanDir(PROMPTS_DIR)
  return prompts
}

/**
 * 清除提示词缓存
 * @param promptPath - 可选，指定清除某个提示词的缓存
 */
export function clearCache(promptPath?: string): void {
  if (promptPath) {
    promptCache.delete(promptPath)
  } else {
    promptCache.clear()
  }
}

/**
 * 重新加载提示词
 * @param promptPath - 相对路径
 */
export function reloadPrompt(promptPath: string): LoadedPrompt {
  clearCache(promptPath)
  return loadPrompt(promptPath)
}

// ============ PromptManager 类 ============

class PromptManager {
  private executions: PromptExecution[] = []
  private maxExecutions: number = 1000

  /**
   * 获取渲染后的提示词
   */
  getPrompt(
    promptPath: string,
    variables: Record<string, unknown> = {}
  ): RenderedPrompt {
    return getPrompt(promptPath, variables)
  }

  /**
   * 加载原始提示词
   */
  loadPrompt(promptPath: string): LoadedPrompt {
    return loadPrompt(promptPath)
  }

  /**
   * 列出所有提示词
   */
  listPrompts(): string[] {
    return listPrompts()
  }

  /**
   * 记录执行结果
   */
  recordExecution(execution: PromptExecution): void {
    this.executions.push(execution)

    // 保持执行记录数量在限制内
    if (this.executions.length > this.maxExecutions) {
      this.executions = this.executions.slice(-this.maxExecutions)
    }
  }

  /**
   * 获取提示词的执行指标
   */
  getMetrics(promptId: string): {
    totalExecutions: number
    avgInputTokens: number
    avgOutputTokens: number
    avgLatencyMs: number
    successRate: number
  } {
    const executions = this.executions.filter(e => e.promptId === promptId)

    if (executions.length === 0) {
      return {
        totalExecutions: 0,
        avgInputTokens: 0,
        avgOutputTokens: 0,
        avgLatencyMs: 0,
        successRate: 0,
      }
    }

    const totalInputTokens = executions.reduce(
      (sum, e) => sum + e.metrics.inputTokens,
      0
    )
    const totalOutputTokens = executions.reduce(
      (sum, e) => sum + e.metrics.outputTokens,
      0
    )
    const totalLatency = executions.reduce(
      (sum, e) => sum + e.metrics.latencyMs,
      0
    )
    const successCount = executions.filter(
      e => e.metrics.taskCompleted !== false
    ).length

    return {
      totalExecutions: executions.length,
      avgInputTokens: Math.round(totalInputTokens / executions.length),
      avgOutputTokens: Math.round(totalOutputTokens / executions.length),
      avgLatencyMs: Math.round(totalLatency / executions.length),
      successRate: (successCount / executions.length) * 100,
    }
  }

  /**
   * 清除缓存
   */
  clearCache(promptPath?: string): void {
    clearCache(promptPath)
  }

  /**
   * 检查提示词是否存在
   */
  exists(promptPath: string): boolean {
    const fullPath = path.join(PROMPTS_DIR, `${promptPath}.md`)
    return fs.existsSync(fullPath)
  }
}

// 单例实例
let promptManagerInstance: PromptManager | null = null

/**
 * 获取 PromptManager 单例
 */
export function getPromptManager(): PromptManager {
  if (!promptManagerInstance) {
    promptManagerInstance = new PromptManager()
  }
  return promptManagerInstance
}

// 默认导出
export default {
  loadPrompt,
  renderTemplate,
  getPrompt,
  listPrompts,
  clearCache,
  reloadPrompt,
  getPromptManager,
}
