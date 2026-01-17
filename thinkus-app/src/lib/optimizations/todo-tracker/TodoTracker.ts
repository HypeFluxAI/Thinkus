/**
 * Todo Tracker
 * 追踪所有TODO，确保AI完成所有任务才能结束
 */

import Anthropic from '@anthropic-ai/sdk'
import { TodoItem, TodoCheckResult, TodoTrackerConfig, TodoSource } from './types'
import { getHaikuModel } from '@/lib/ai/model-router'

export class TodoTracker {
  private todos: Map<string, TodoItem[]> = new Map() // projectId -> todos
  private enabled: Map<string, boolean> = new Map()
  private iterations: Map<string, number> = new Map()
  private config: TodoTrackerConfig = {
    maxIterations: 50,
    enableAutoExtract: true,
    enableCodeCommentScan: true
  }

  constructor(private claude?: Anthropic) {}

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
   * 设置Anthropic客户端
   */
  setClient(claude: Anthropic): void {
    this.claude = claude
  }

  /**
   * 更新配置
   */
  updateConfig(config: Partial<TodoTrackerConfig>): void {
    this.config = { ...this.config, ...config }
  }

  /**
   * 从用户需求提取TODO
   */
  async extractFromRequirement(projectId: string, requirement: string): Promise<TodoItem[]> {
    if (!this.claude || !this.config.enableAutoExtract) {
      return []
    }

    try {
      const response = await this.claude.messages.create({
        model: getHaikuModel(),
        max_tokens: 1000,
        messages: [{
          role: 'user',
          content: `从需求中提取任务列表，返回JSON数组:
需求: ${requirement}

返回格式: [{"description": "任务描述"}]
只返回JSON。`
        }]
      })

      const textBlock = response.content.find(block => block.type === 'text')
      if (!textBlock || textBlock.type !== 'text') {
        return []
      }

      const jsonMatch = textBlock.text.match(/\[[\s\S]*\]/)
      if (!jsonMatch) {
        return []
      }

      const items = JSON.parse(jsonMatch[0])
      const todos: TodoItem[] = items.map((item: { description: string }, i: number) => ({
        id: `${projectId}-req-${Date.now()}-${i}`,
        description: item.description,
        source: 'user_requirement' as TodoSource,
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
    if (!this.config.enableCodeCommentScan) {
      return []
    }

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
   * 手动添加TODO
   */
  addTodo(projectId: string, description: string, source: TodoSource = 'ai_identified'): TodoItem {
    const todo: TodoItem = {
      id: `${projectId}-${source}-${Date.now()}`,
      description,
      source,
      status: 'pending',
      createdAt: new Date()
    }

    const existing = this.todos.get(projectId) || []
    this.todos.set(projectId, [...existing, todo])
    return todo
  }

  /**
   * 添加验证失败的TODO
   */
  addVerifyFailure(projectId: string, description: string): TodoItem {
    return this.addTodo(projectId, description, 'verify_failure')
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
   * 标记TODO进行中
   */
  markInProgress(projectId: string, todoId: string): void {
    const todos = this.todos.get(projectId) || []
    const todo = todos.find(t => t.id === todoId)
    if (todo) {
      todo.status = 'in_progress'
    }
  }

  /**
   * 标记TODO阻塞
   */
  markBlocked(projectId: string, todoId: string, reason: string): void {
    const todos = this.todos.get(projectId) || []
    const todo = todos.find(t => t.id === todoId)
    if (todo) {
      todo.status = 'blocked'
      todo.blockReason = reason
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

    if (currentIteration >= this.config.maxIterations) {
      return {
        canStop: true,
        reason: `达到最大迭代次数(${this.config.maxIterations})`,
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
   * 获取TODO统计
   */
  getStats(projectId: string): TodoCheckResult['stats'] {
    const todos = this.todos.get(projectId) || []
    return {
      total: todos.length,
      completed: todos.filter(t => t.status === 'completed').length,
      pending: todos.filter(t => t.status === 'pending' || t.status === 'in_progress').length,
      blocked: todos.filter(t => t.status === 'blocked').length
    }
  }

  /**
   * 清理项目TODO
   */
  clear(projectId: string): void {
    this.todos.delete(projectId)
    this.iterations.delete(projectId)
    this.enabled.delete(projectId)
  }

  /**
   * 清理所有TODO
   */
  clearAll(): void {
    this.todos.clear()
    this.iterations.clear()
    this.enabled.clear()
  }
}

// 单例实例
let todoTrackerInstance: TodoTracker | null = null

export function initTodoTracker(claude?: Anthropic): TodoTracker {
  todoTrackerInstance = new TodoTracker(claude)
  return todoTrackerInstance
}

export function getTodoTracker(): TodoTracker {
  if (!todoTrackerInstance) {
    todoTrackerInstance = new TodoTracker()
  }
  return todoTrackerInstance
}

export const todoTracker = new TodoTracker()
