/**
 * 交付队列管理服务
 *
 * 功能：
 * - 多项目并行交付调度
 * - 优先级队列管理
 * - 资源限制和负载均衡
 * - 失败重试和异常处理
 * - 交付进度实时追踪
 */

// 交付优先级
export type DeliveryPriority = 'urgent' | 'high' | 'normal' | 'low'

// 队列项状态
export type QueueItemStatus =
  | 'queued'      // 排队中
  | 'preparing'   // 准备中
  | 'running'     // 执行中
  | 'paused'      // 已暂停
  | 'completed'   // 已完成
  | 'failed'      // 失败
  | 'cancelled'   // 已取消

// 失败原因分类
export type FailureReason =
  | 'build_failed'        // 构建失败
  | 'test_failed'         // 测试失败
  | 'deploy_failed'       // 部署失败
  | 'gate_blocked'        // 门禁不通过
  | 'timeout'             // 超时
  | 'resource_exhausted'  // 资源耗尽
  | 'manual_cancel'       // 手动取消
  | 'dependency_failed'   // 依赖失败
  | 'unknown'             // 未知错误

// 队列项
export interface QueueItem {
  id: string
  projectId: string
  projectName: string
  clientName: string
  clientEmail: string
  productType: string
  priority: DeliveryPriority
  status: QueueItemStatus

  // 时间信息
  queuedAt: Date
  startedAt?: Date
  completedAt?: Date
  estimatedDuration: number  // 分钟
  actualDuration?: number

  // 执行信息
  currentStage?: string
  progress: number  // 0-100
  assignedWorker?: string
  retryCount: number
  maxRetries: number

  // 失败信息
  failureReason?: FailureReason
  errorMessage?: string
  errorDetails?: string

  // 配置
  config: {
    skipTests?: boolean
    skipAcceptance?: boolean
    autoSign?: boolean
    customDomain?: string
    notifyOnComplete?: boolean
  }

  // 输出
  outputs?: {
    productUrl?: string
    adminUrl?: string
    deploymentId?: string
  }
}

// 队列统计
export interface QueueStats {
  totalQueued: number
  totalRunning: number
  totalCompleted: number
  totalFailed: number

  byPriority: Record<DeliveryPriority, number>
  byStatus: Record<QueueItemStatus, number>

  averageWaitTime: number      // 平均等待时间（分钟）
  averageDeliveryTime: number  // 平均交付时间（分钟）
  successRate: number          // 成功率

  todayCompleted: number
  todayFailed: number
}

// 工作节点
export interface WorkerNode {
  id: string
  name: string
  status: 'idle' | 'busy' | 'offline'
  currentItem?: string
  completedCount: number
  failedCount: number
  lastActiveAt: Date
  capabilities: string[]  // 支持的产品类型
}

// 队列配置
export interface QueueConfig {
  maxConcurrent: number        // 最大并行数
  maxRetries: number           // 最大重试次数
  retryDelayMinutes: number    // 重试间隔
  timeoutMinutes: number       // 超时时间
  priorityWeights: Record<DeliveryPriority, number>
}

// 优先级权重
const PRIORITY_WEIGHTS: Record<DeliveryPriority, number> = {
  urgent: 100,
  high: 50,
  normal: 10,
  low: 1,
}

// 预估交付时间（分钟）
const ESTIMATED_DURATION: Record<string, number> = {
  'web-app': 30,
  'ecommerce': 45,
  'mobile-app': 60,
  'api-service': 20,
  'mini-program': 40,
  'default': 35,
}

// 失败原因的人话描述
const FAILURE_DESCRIPTIONS: Record<FailureReason, { title: string; suggestion: string }> = {
  build_failed: {
    title: '构建失败',
    suggestion: '请检查代码是否有语法错误，依赖是否正确安装',
  },
  test_failed: {
    title: '测试未通过',
    suggestion: '部分测试用例失败，请检查功能是否完整实现',
  },
  deploy_failed: {
    title: '部署失败',
    suggestion: '云平台部署出错，可能是配置问题或资源限制',
  },
  gate_blocked: {
    title: '质量门禁不通过',
    suggestion: '有关键检查项未通过，需要先修复问题',
  },
  timeout: {
    title: '执行超时',
    suggestion: '交付过程超时，可能是网络问题或项目过大',
  },
  resource_exhausted: {
    title: '资源不足',
    suggestion: '服务器资源紧张，请稍后重试',
  },
  manual_cancel: {
    title: '手动取消',
    suggestion: '交付已被手动取消',
  },
  dependency_failed: {
    title: '依赖项失败',
    suggestion: '前置依赖项执行失败，请先处理依赖问题',
  },
  unknown: {
    title: '未知错误',
    suggestion: '发生未知错误，请联系技术支持',
  },
}

export class DeliveryQueueService {
  private queue: Map<string, QueueItem> = new Map()
  private workers: Map<string, WorkerNode> = new Map()
  private config: QueueConfig = {
    maxConcurrent: 3,
    maxRetries: 2,
    retryDelayMinutes: 5,
    timeoutMinutes: 60,
    priorityWeights: PRIORITY_WEIGHTS,
  }
  private isProcessing = false
  private processInterval?: NodeJS.Timeout

  /**
   * 添加到队列
   */
  addToQueue(input: {
    projectId: string
    projectName: string
    clientName: string
    clientEmail: string
    productType: string
    priority?: DeliveryPriority
    config?: QueueItem['config']
  }): QueueItem {
    const id = `dq_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`

    const item: QueueItem = {
      id,
      projectId: input.projectId,
      projectName: input.projectName,
      clientName: input.clientName,
      clientEmail: input.clientEmail,
      productType: input.productType,
      priority: input.priority || 'normal',
      status: 'queued',
      queuedAt: new Date(),
      estimatedDuration: ESTIMATED_DURATION[input.productType] || ESTIMATED_DURATION.default,
      progress: 0,
      retryCount: 0,
      maxRetries: this.config.maxRetries,
      config: input.config || {},
    }

    this.queue.set(id, item)

    // 尝试立即处理
    this.tryProcessNext()

    return item
  }

  /**
   * 批量添加到队列
   */
  addBatchToQueue(items: Array<{
    projectId: string
    projectName: string
    clientName: string
    clientEmail: string
    productType: string
    priority?: DeliveryPriority
    config?: QueueItem['config']
  }>): QueueItem[] {
    return items.map(item => this.addToQueue(item))
  }

  /**
   * 获取队列项
   */
  getItem(id: string): QueueItem | undefined {
    return this.queue.get(id)
  }

  /**
   * 获取项目的队列项
   */
  getItemByProject(projectId: string): QueueItem | undefined {
    return Array.from(this.queue.values()).find(item => item.projectId === projectId)
  }

  /**
   * 更新队列项
   */
  updateItem(id: string, updates: Partial<QueueItem>): QueueItem | undefined {
    const item = this.queue.get(id)
    if (!item) return undefined

    const updated = { ...item, ...updates }
    this.queue.set(id, updated)
    return updated
  }

  /**
   * 取消队列项
   */
  cancelItem(id: string, reason?: string): boolean {
    const item = this.queue.get(id)
    if (!item) return false

    if (item.status === 'completed' || item.status === 'cancelled') {
      return false
    }

    this.updateItem(id, {
      status: 'cancelled',
      failureReason: 'manual_cancel',
      errorMessage: reason || '手动取消',
      completedAt: new Date(),
    })

    return true
  }

  /**
   * 暂停队列项
   */
  pauseItem(id: string): boolean {
    const item = this.queue.get(id)
    if (!item || item.status !== 'running') return false

    this.updateItem(id, { status: 'paused' })
    return true
  }

  /**
   * 恢复队列项
   */
  resumeItem(id: string): boolean {
    const item = this.queue.get(id)
    if (!item || item.status !== 'paused') return false

    this.updateItem(id, { status: 'queued' })
    this.tryProcessNext()
    return true
  }

  /**
   * 重试失败项
   */
  retryItem(id: string): boolean {
    const item = this.queue.get(id)
    if (!item || item.status !== 'failed') return false

    this.updateItem(id, {
      status: 'queued',
      retryCount: item.retryCount + 1,
      failureReason: undefined,
      errorMessage: undefined,
      errorDetails: undefined,
      progress: 0,
    })

    this.tryProcessNext()
    return true
  }

  /**
   * 调整优先级
   */
  changePriority(id: string, priority: DeliveryPriority): boolean {
    const item = this.queue.get(id)
    if (!item || item.status !== 'queued') return false

    this.updateItem(id, { priority })
    return true
  }

  /**
   * 获取队列列表
   */
  getQueue(filter?: {
    status?: QueueItemStatus[]
    priority?: DeliveryPriority[]
    productType?: string[]
  }): QueueItem[] {
    let items = Array.from(this.queue.values())

    if (filter?.status) {
      items = items.filter(item => filter.status!.includes(item.status))
    }

    if (filter?.priority) {
      items = items.filter(item => filter.priority!.includes(item.priority))
    }

    if (filter?.productType) {
      items = items.filter(item => filter.productType!.includes(item.productType))
    }

    // 按优先级和入队时间排序
    return items.sort((a, b) => {
      const priorityDiff = PRIORITY_WEIGHTS[b.priority] - PRIORITY_WEIGHTS[a.priority]
      if (priorityDiff !== 0) return priorityDiff
      return a.queuedAt.getTime() - b.queuedAt.getTime()
    })
  }

  /**
   * 获取下一个要处理的项
   */
  getNextItem(): QueueItem | undefined {
    const queuedItems = this.getQueue({ status: ['queued'] })
    return queuedItems[0]
  }

  /**
   * 获取正在执行的项
   */
  getRunningItems(): QueueItem[] {
    return this.getQueue({ status: ['running', 'preparing'] })
  }

  /**
   * 尝试处理下一个
   */
  private tryProcessNext(): void {
    const runningCount = this.getRunningItems().length
    if (runningCount >= this.config.maxConcurrent) {
      return
    }

    const nextItem = this.getNextItem()
    if (!nextItem) {
      return
    }

    // 开始执行（实际执行由外部触发）
    this.updateItem(nextItem.id, {
      status: 'preparing',
      startedAt: new Date(),
    })
  }

  /**
   * 标记开始执行
   */
  markRunning(id: string, workerId?: string): boolean {
    const item = this.queue.get(id)
    if (!item || item.status !== 'preparing') return false

    this.updateItem(id, {
      status: 'running',
      assignedWorker: workerId,
    })

    return true
  }

  /**
   * 更新进度
   */
  updateProgress(id: string, progress: number, stage?: string): boolean {
    const item = this.queue.get(id)
    if (!item || item.status !== 'running') return false

    this.updateItem(id, {
      progress: Math.min(100, Math.max(0, progress)),
      currentStage: stage,
    })

    return true
  }

  /**
   * 标记完成
   */
  markCompleted(id: string, outputs?: QueueItem['outputs']): boolean {
    const item = this.queue.get(id)
    if (!item) return false

    const now = new Date()
    const duration = item.startedAt
      ? Math.round((now.getTime() - item.startedAt.getTime()) / 60000)
      : 0

    this.updateItem(id, {
      status: 'completed',
      progress: 100,
      completedAt: now,
      actualDuration: duration,
      outputs,
    })

    // 释放worker
    if (item.assignedWorker) {
      this.releaseWorker(item.assignedWorker)
    }

    // 尝试处理下一个
    this.tryProcessNext()

    return true
  }

  /**
   * 标记失败
   */
  markFailed(id: string, reason: FailureReason, errorMessage: string, errorDetails?: string): boolean {
    const item = this.queue.get(id)
    if (!item) return false

    // 检查是否可以重试
    if (item.retryCount < item.maxRetries && this.canRetry(reason)) {
      // 延迟重试
      setTimeout(() => {
        this.retryItem(id)
      }, this.config.retryDelayMinutes * 60 * 1000)

      this.updateItem(id, {
        status: 'queued',
        retryCount: item.retryCount + 1,
        failureReason: reason,
        errorMessage,
        errorDetails,
      })
    } else {
      // 最终失败
      const now = new Date()
      const duration = item.startedAt
        ? Math.round((now.getTime() - item.startedAt.getTime()) / 60000)
        : 0

      this.updateItem(id, {
        status: 'failed',
        completedAt: now,
        actualDuration: duration,
        failureReason: reason,
        errorMessage,
        errorDetails,
      })
    }

    // 释放worker
    if (item.assignedWorker) {
      this.releaseWorker(item.assignedWorker)
    }

    // 尝试处理下一个
    this.tryProcessNext()

    return true
  }

  /**
   * 是否可以重试
   */
  private canRetry(reason: FailureReason): boolean {
    // 某些失败原因不能重试
    const nonRetryable: FailureReason[] = ['manual_cancel', 'gate_blocked']
    return !nonRetryable.includes(reason)
  }

  /**
   * 注册工作节点
   */
  registerWorker(id: string, name: string, capabilities: string[] = []): WorkerNode {
    const worker: WorkerNode = {
      id,
      name,
      status: 'idle',
      completedCount: 0,
      failedCount: 0,
      lastActiveAt: new Date(),
      capabilities,
    }

    this.workers.set(id, worker)
    return worker
  }

  /**
   * 获取空闲工作节点
   */
  getIdleWorker(productType?: string): WorkerNode | undefined {
    const workers = Array.from(this.workers.values())
      .filter(w => w.status === 'idle')
      .filter(w => !productType || w.capabilities.length === 0 || w.capabilities.includes(productType))

    return workers[0]
  }

  /**
   * 分配工作节点
   */
  assignWorker(workerId: string, itemId: string): boolean {
    const worker = this.workers.get(workerId)
    if (!worker || worker.status !== 'idle') return false

    worker.status = 'busy'
    worker.currentItem = itemId
    worker.lastActiveAt = new Date()
    this.workers.set(workerId, worker)

    return true
  }

  /**
   * 释放工作节点
   */
  releaseWorker(workerId: string): void {
    const worker = this.workers.get(workerId)
    if (!worker) return

    worker.status = 'idle'
    worker.currentItem = undefined
    worker.lastActiveAt = new Date()
    this.workers.set(workerId, worker)
  }

  /**
   * 获取队列统计
   */
  getStats(): QueueStats {
    const items = Array.from(this.queue.values())

    const byStatus: Record<QueueItemStatus, number> = {
      queued: 0,
      preparing: 0,
      running: 0,
      paused: 0,
      completed: 0,
      failed: 0,
      cancelled: 0,
    }

    const byPriority: Record<DeliveryPriority, number> = {
      urgent: 0,
      high: 0,
      normal: 0,
      low: 0,
    }

    let totalWaitTime = 0
    let totalDeliveryTime = 0
    let waitCount = 0
    let deliveryCount = 0

    const today = new Date()
    today.setHours(0, 0, 0, 0)
    let todayCompleted = 0
    let todayFailed = 0

    for (const item of items) {
      byStatus[item.status]++
      byPriority[item.priority]++

      // 计算等待时间
      if (item.startedAt) {
        const wait = (item.startedAt.getTime() - item.queuedAt.getTime()) / 60000
        totalWaitTime += wait
        waitCount++
      }

      // 计算交付时间
      if (item.actualDuration) {
        totalDeliveryTime += item.actualDuration
        deliveryCount++
      }

      // 今日统计
      if (item.completedAt && item.completedAt >= today) {
        if (item.status === 'completed') todayCompleted++
        if (item.status === 'failed') todayFailed++
      }
    }

    const completed = byStatus.completed
    const failed = byStatus.failed
    const total = completed + failed

    return {
      totalQueued: byStatus.queued + byStatus.preparing,
      totalRunning: byStatus.running,
      totalCompleted: completed,
      totalFailed: failed,
      byPriority,
      byStatus,
      averageWaitTime: waitCount > 0 ? Math.round(totalWaitTime / waitCount) : 0,
      averageDeliveryTime: deliveryCount > 0 ? Math.round(totalDeliveryTime / deliveryCount) : 0,
      successRate: total > 0 ? Math.round((completed / total) * 100) : 100,
      todayCompleted,
      todayFailed,
    }
  }

  /**
   * 获取预计等待时间
   */
  getEstimatedWaitTime(priority: DeliveryPriority): number {
    const queuedItems = this.getQueue({ status: ['queued', 'preparing', 'running'] })

    let totalTime = 0
    for (const item of queuedItems) {
      // 只计算优先级更高或相同的项
      if (PRIORITY_WEIGHTS[item.priority] >= PRIORITY_WEIGHTS[priority]) {
        totalTime += item.estimatedDuration - (item.progress / 100 * item.estimatedDuration)
      }
    }

    // 考虑并行处理
    return Math.ceil(totalTime / this.config.maxConcurrent)
  }

  /**
   * 获取队列位置
   */
  getQueuePosition(id: string): number {
    const item = this.queue.get(id)
    if (!item || item.status !== 'queued') return -1

    const queuedItems = this.getQueue({ status: ['queued'] })
    return queuedItems.findIndex(i => i.id === id) + 1
  }

  /**
   * 生成人话队列报告
   */
  generateQueueReport(): string {
    const stats = this.getStats()
    const running = this.getRunningItems()
    const queued = this.getQueue({ status: ['queued'] }).slice(0, 5)
    const failed = this.getQueue({ status: ['failed'] }).slice(0, 3)

    let report = '# 交付队列状态报告\n\n'

    // 概览
    report += '## 概览\n'
    report += `- 排队中: ${stats.totalQueued} 个项目\n`
    report += `- 执行中: ${stats.totalRunning} 个项目\n`
    report += `- 今日完成: ${stats.todayCompleted} 个\n`
    report += `- 今日失败: ${stats.todayFailed} 个\n`
    report += `- 成功率: ${stats.successRate}%\n`
    report += `- 平均交付时间: ${stats.averageDeliveryTime} 分钟\n\n`

    // 正在执行
    if (running.length > 0) {
      report += '## 正在执行\n'
      for (const item of running) {
        report += `- **${item.projectName}** (${item.clientName})\n`
        report += `  进度: ${item.progress}% | 阶段: ${item.currentStage || '准备中'}\n`
      }
      report += '\n'
    }

    // 排队中
    if (queued.length > 0) {
      report += '## 排队中\n'
      for (let i = 0; i < queued.length; i++) {
        const item = queued[i]
        const waitTime = this.getEstimatedWaitTime(item.priority)
        report += `${i + 1}. **${item.projectName}** - ${item.clientName}\n`
        report += `   优先级: ${item.priority} | 预计等待: ${waitTime} 分钟\n`
      }
      report += '\n'
    }

    // 最近失败
    if (failed.length > 0) {
      report += '## 最近失败\n'
      for (const item of failed) {
        const desc = FAILURE_DESCRIPTIONS[item.failureReason || 'unknown']
        report += `- **${item.projectName}**: ${desc.title}\n`
        report += `  ${desc.suggestion}\n`
        if (item.retryCount > 0) {
          report += `  已重试 ${item.retryCount} 次\n`
        }
      }
    }

    return report
  }

  /**
   * 生成队列面板 HTML
   */
  generateQueuePanelHtml(): string {
    const stats = this.getStats()
    const running = this.getRunningItems()
    const queued = this.getQueue({ status: ['queued'] }).slice(0, 10)

    return `
<!DOCTYPE html>
<html lang="zh-CN">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <meta http-equiv="refresh" content="10">
  <title>交付队列监控</title>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
      background: linear-gradient(135deg, #1a1a2e 0%, #16213e 100%);
      min-height: 100vh;
      color: #fff;
      padding: 20px;
    }
    .container { max-width: 1200px; margin: 0 auto; }
    h1 { font-size: 24px; margin-bottom: 20px; }

    .stats-grid {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(150px, 1fr));
      gap: 15px;
      margin-bottom: 30px;
    }
    .stat-card {
      background: rgba(255,255,255,0.1);
      padding: 20px;
      border-radius: 12px;
      text-align: center;
    }
    .stat-value { font-size: 32px; font-weight: bold; }
    .stat-label { font-size: 12px; color: rgba(255,255,255,0.6); margin-top: 5px; }

    .section { margin-bottom: 30px; }
    .section-title { font-size: 16px; margin-bottom: 15px; color: rgba(255,255,255,0.8); }

    .queue-item {
      background: rgba(255,255,255,0.05);
      padding: 15px;
      border-radius: 8px;
      margin-bottom: 10px;
      display: flex;
      align-items: center;
      gap: 15px;
    }
    .queue-position {
      width: 30px;
      height: 30px;
      background: rgba(255,255,255,0.1);
      border-radius: 50%;
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 14px;
    }
    .queue-info { flex: 1; }
    .queue-name { font-weight: 500; }
    .queue-client { font-size: 12px; color: rgba(255,255,255,0.6); }
    .queue-meta { font-size: 12px; color: rgba(255,255,255,0.5); }

    .priority-urgent { border-left: 3px solid #ef4444; }
    .priority-high { border-left: 3px solid #f59e0b; }
    .priority-normal { border-left: 3px solid #3b82f6; }
    .priority-low { border-left: 3px solid #6b7280; }

    .running-item {
      background: rgba(34, 197, 94, 0.1);
      border: 1px solid rgba(34, 197, 94, 0.3);
    }
    .progress-bar {
      width: 100%;
      height: 6px;
      background: rgba(255,255,255,0.1);
      border-radius: 3px;
      margin-top: 10px;
      overflow: hidden;
    }
    .progress-fill {
      height: 100%;
      background: linear-gradient(90deg, #22c55e, #16a34a);
      border-radius: 3px;
      transition: width 0.3s;
    }
    .stage-label { font-size: 11px; color: #22c55e; margin-top: 5px; }
  </style>
</head>
<body>
  <div class="container">
    <h1>📦 交付队列监控</h1>

    <div class="stats-grid">
      <div class="stat-card">
        <div class="stat-value">${stats.totalQueued}</div>
        <div class="stat-label">排队中</div>
      </div>
      <div class="stat-card">
        <div class="stat-value" style="color: #22c55e">${stats.totalRunning}</div>
        <div class="stat-label">执行中</div>
      </div>
      <div class="stat-card">
        <div class="stat-value">${stats.todayCompleted}</div>
        <div class="stat-label">今日完成</div>
      </div>
      <div class="stat-card">
        <div class="stat-value" style="color: ${stats.totalFailed > 0 ? '#ef4444' : 'inherit'}">${stats.todayFailed}</div>
        <div class="stat-label">今日失败</div>
      </div>
      <div class="stat-card">
        <div class="stat-value">${stats.successRate}%</div>
        <div class="stat-label">成功率</div>
      </div>
      <div class="stat-card">
        <div class="stat-value">${stats.averageDeliveryTime}</div>
        <div class="stat-label">平均耗时(分钟)</div>
      </div>
    </div>

    ${running.length > 0 ? `
    <div class="section">
      <div class="section-title">🚀 正在执行</div>
      ${running.map(item => `
        <div class="queue-item running-item">
          <div class="queue-info">
            <div class="queue-name">${item.projectName}</div>
            <div class="queue-client">${item.clientName}</div>
            <div class="progress-bar">
              <div class="progress-fill" style="width: ${item.progress}%"></div>
            </div>
            <div class="stage-label">${item.currentStage || '准备中'} - ${item.progress}%</div>
          </div>
        </div>
      `).join('')}
    </div>
    ` : ''}

    ${queued.length > 0 ? `
    <div class="section">
      <div class="section-title">⏳ 排队中</div>
      ${queued.map((item, i) => `
        <div class="queue-item priority-${item.priority}">
          <div class="queue-position">${i + 1}</div>
          <div class="queue-info">
            <div class="queue-name">${item.projectName}</div>
            <div class="queue-client">${item.clientName}</div>
            <div class="queue-meta">
              优先级: ${item.priority} |
              预计: ${item.estimatedDuration}分钟 |
              等待: ${this.getEstimatedWaitTime(item.priority)}分钟
            </div>
          </div>
        </div>
      `).join('')}
    </div>
    ` : '<div class="section"><div class="section-title">✅ 队列为空，没有待处理的项目</div></div>'}
  </div>
</body>
</html>
`
  }

  /**
   * 更新配置
   */
  updateConfig(updates: Partial<QueueConfig>): void {
    this.config = { ...this.config, ...updates }
  }

  /**
   * 清理已完成的旧项目
   */
  cleanup(daysToKeep: number = 7): number {
    const cutoff = new Date()
    cutoff.setDate(cutoff.getDate() - daysToKeep)

    let removed = 0
    for (const [id, item] of this.queue) {
      if (
        (item.status === 'completed' || item.status === 'failed' || item.status === 'cancelled') &&
        item.completedAt &&
        item.completedAt < cutoff
      ) {
        this.queue.delete(id)
        removed++
      }
    }

    return removed
  }
}

// 单例导出
export const deliveryQueue = new DeliveryQueueService()
