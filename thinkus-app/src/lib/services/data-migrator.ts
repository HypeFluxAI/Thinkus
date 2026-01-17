/**
 * 数据迁移工具服务
 *
 * 功能：
 * - 用户历史数据导入
 * - 多种数据源支持 (Excel/CSV/JSON/SQL)
 * - 数据清洗和转换
 * - 字段映射配置
 * - 迁移进度追踪
 * - 回滚支持
 *
 * 注意: 此服务的 Python 版本在 services/py-data-migrator 中
 * Python 版本支持更复杂的数据处理（Pandas/NumPy）
 */

// 数据源类型
export type DataSourceType =
  | 'excel'      // Excel 文件
  | 'csv'        // CSV 文件
  | 'json'       // JSON 文件
  | 'mysql'      // MySQL 数据库
  | 'postgresql' // PostgreSQL 数据库
  | 'mongodb'    // MongoDB 数据库
  | 'api'        // 外部 API

// 迁移状态
export type MigrationStatus =
  | 'pending'      // 待开始
  | 'analyzing'    // 分析中
  | 'mapping'      // 字段映射中
  | 'validating'   // 验证中
  | 'migrating'    // 迁移中
  | 'completed'    // 完成
  | 'failed'       // 失败
  | 'rolled_back'  // 已回滚

// 字段类型
export type FieldType =
  | 'string'
  | 'number'
  | 'boolean'
  | 'date'
  | 'datetime'
  | 'email'
  | 'phone'
  | 'url'
  | 'json'
  | 'array'
  | 'unknown'

// 数据源配置
export interface DataSourceConfig {
  type: DataSourceType
  // 文件源
  filePath?: string
  fileContent?: string  // Base64
  encoding?: string
  delimiter?: string  // CSV
  sheet?: string      // Excel

  // 数据库源
  host?: string
  port?: number
  database?: string
  username?: string
  password?: string
  table?: string
  query?: string

  // API 源
  apiUrl?: string
  apiKey?: string
  headers?: Record<string, string>
}

// 源字段
export interface SourceField {
  name: string
  type: FieldType
  nullable: boolean
  sampleValues: string[]
  uniqueCount: number
  nullCount: number
}

// 目标字段
export interface TargetField {
  name: string
  type: FieldType
  required: boolean
  defaultValue?: string
  validation?: string  // 正则表达式
}

// 字段映射
export interface FieldMapping {
  sourceField: string
  targetField: string
  transform?: TransformType
  transformConfig?: Record<string, unknown>
  defaultValue?: string
}

// 转换类型
export type TransformType =
  | 'none'           // 不转换
  | 'trim'           // 去除空格
  | 'uppercase'      // 大写
  | 'lowercase'      // 小写
  | 'date_format'    // 日期格式转换
  | 'number_format'  // 数字格式转换
  | 'split'          // 拆分
  | 'concat'         // 合并
  | 'lookup'         // 查表替换
  | 'custom'         // 自定义

// 数据分析结果
export interface DataAnalysis {
  totalRows: number
  totalColumns: number
  fields: SourceField[]
  sampleData: Record<string, unknown>[]
  issues: DataIssue[]
  suggestedMappings: FieldMapping[]
}

// 数据问题
export interface DataIssue {
  field: string
  type: 'missing' | 'invalid' | 'duplicate' | 'format' | 'encoding'
  severity: 'error' | 'warning' | 'info'
  count: number
  description: string
  suggestion: string
}

// 迁移任务
export interface MigrationTask {
  id: string
  projectId: string
  name: string
  description: string

  // 配置
  source: DataSourceConfig
  targetCollection: string  // MongoDB collection
  mappings: FieldMapping[]

  // 状态
  status: MigrationStatus
  progress: number  // 0-100
  currentStep: string

  // 统计
  stats: {
    totalRecords: number
    processedRecords: number
    successRecords: number
    failedRecords: number
    skippedRecords: number
  }

  // 时间
  createdAt: Date
  startedAt?: Date
  completedAt?: Date

  // 错误
  errors: MigrationError[]

  // 回滚信息
  rollbackData?: {
    backupCollection: string
    canRollback: boolean
  }
}

// 迁移错误
export interface MigrationError {
  row: number
  field?: string
  value?: string
  error: string
  timestamp: Date
}

// 目标表配置
const TARGET_COLLECTIONS: Record<string, TargetField[]> = {
  users: [
    { name: 'name', type: 'string', required: true },
    { name: 'email', type: 'email', required: true },
    { name: 'phone', type: 'phone', required: false },
    { name: 'createdAt', type: 'datetime', required: false },
  ],
  products: [
    { name: 'name', type: 'string', required: true },
    { name: 'description', type: 'string', required: false },
    { name: 'price', type: 'number', required: true },
    { name: 'stock', type: 'number', required: false },
    { name: 'category', type: 'string', required: false },
    { name: 'imageUrl', type: 'url', required: false },
  ],
  orders: [
    { name: 'orderNumber', type: 'string', required: true },
    { name: 'customerId', type: 'string', required: true },
    { name: 'totalAmount', type: 'number', required: true },
    { name: 'status', type: 'string', required: true },
    { name: 'createdAt', type: 'datetime', required: true },
  ],
  customers: [
    { name: 'name', type: 'string', required: true },
    { name: 'email', type: 'email', required: true },
    { name: 'phone', type: 'phone', required: false },
    { name: 'address', type: 'string', required: false },
    { name: 'createdAt', type: 'datetime', required: false },
  ],
}

// 常见字段名映射
const FIELD_NAME_ALIASES: Record<string, string[]> = {
  name: ['名称', '姓名', 'name', 'title', '名字', 'fullname', 'full_name'],
  email: ['邮箱', '邮件', 'email', 'mail', 'e-mail', '电子邮箱'],
  phone: ['电话', '手机', 'phone', 'mobile', 'tel', '联系电话', 'telephone'],
  price: ['价格', '单价', 'price', 'amount', '金额', 'cost'],
  stock: ['库存', '数量', 'stock', 'quantity', 'qty', '存量'],
  createdAt: ['创建时间', '添加时间', 'created_at', 'createdAt', 'create_time', 'createTime'],
  address: ['地址', 'address', '收货地址', '详细地址'],
  status: ['状态', 'status', 'state'],
  category: ['分类', '类别', 'category', 'type', '产品分类'],
  description: ['描述', '说明', 'description', 'desc', '详情', '简介'],
}

export class DataMigratorService {
  private tasks: Map<string, MigrationTask> = new Map()

  /**
   * 创建迁移任务
   */
  createTask(input: {
    projectId: string
    name: string
    description?: string
    source: DataSourceConfig
    targetCollection: string
  }): MigrationTask {
    const id = `mig_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`

    const task: MigrationTask = {
      id,
      projectId: input.projectId,
      name: input.name,
      description: input.description || '',
      source: input.source,
      targetCollection: input.targetCollection,
      mappings: [],
      status: 'pending',
      progress: 0,
      currentStep: '等待开始',
      stats: {
        totalRecords: 0,
        processedRecords: 0,
        successRecords: 0,
        failedRecords: 0,
        skippedRecords: 0,
      },
      createdAt: new Date(),
      errors: [],
    }

    this.tasks.set(id, task)
    return task
  }

  /**
   * 分析数据源
   */
  async analyzeSource(taskId: string): Promise<DataAnalysis> {
    const task = this.tasks.get(taskId)
    if (!task) throw new Error('任务不存在')

    this.updateTask(taskId, {
      status: 'analyzing',
      currentStep: '分析数据源...',
    })

    // 模拟数据分析（实际实现需要根据数据源类型解析）
    const analysis = await this.doAnalyzeSource(task.source)

    // 生成建议映射
    const targetFields = TARGET_COLLECTIONS[task.targetCollection] || []
    const suggestedMappings = this.generateSuggestedMappings(analysis.fields, targetFields)
    analysis.suggestedMappings = suggestedMappings

    this.updateTask(taskId, {
      status: 'mapping',
      currentStep: '等待字段映射',
      stats: { ...task.stats, totalRecords: analysis.totalRows },
    })

    return analysis
  }

  /**
   * 实际分析数据源
   */
  private async doAnalyzeSource(source: DataSourceConfig): Promise<DataAnalysis> {
    // 这里应该根据 source.type 实际解析数据
    // 目前返回模拟数据

    const mockFields: SourceField[] = [
      { name: '姓名', type: 'string', nullable: false, sampleValues: ['张三', '李四', '王五'], uniqueCount: 100, nullCount: 0 },
      { name: '邮箱', type: 'email', nullable: false, sampleValues: ['a@example.com', 'b@example.com'], uniqueCount: 100, nullCount: 0 },
      { name: '手机号', type: 'phone', nullable: true, sampleValues: ['13800138000', '13900139000'], uniqueCount: 95, nullCount: 5 },
      { name: '注册日期', type: 'date', nullable: false, sampleValues: ['2024-01-01', '2024-02-15'], uniqueCount: 50, nullCount: 0 },
    ]

    const mockIssues: DataIssue[] = [
      {
        field: '手机号',
        type: 'missing',
        severity: 'warning',
        count: 5,
        description: '5 条记录缺少手机号',
        suggestion: '可以使用默认值或跳过这些记录',
      },
    ]

    return {
      totalRows: 100,
      totalColumns: mockFields.length,
      fields: mockFields,
      sampleData: [
        { '姓名': '张三', '邮箱': 'zhangsan@example.com', '手机号': '13800138000', '注册日期': '2024-01-01' },
        { '姓名': '李四', '邮箱': 'lisi@example.com', '手机号': '13900139000', '注册日期': '2024-02-15' },
      ],
      issues: mockIssues,
      suggestedMappings: [],
    }
  }

  /**
   * 生成建议映射
   */
  private generateSuggestedMappings(sourceFields: SourceField[], targetFields: TargetField[]): FieldMapping[] {
    const mappings: FieldMapping[] = []

    for (const target of targetFields) {
      // 查找别名匹配
      const aliases = FIELD_NAME_ALIASES[target.name] || [target.name]

      const matched = sourceFields.find(source => {
        const sourceLower = source.name.toLowerCase()
        return aliases.some(alias => {
          const aliasLower = alias.toLowerCase()
          return sourceLower === aliasLower ||
                 sourceLower.includes(aliasLower) ||
                 aliasLower.includes(sourceLower)
        })
      })

      if (matched) {
        mappings.push({
          sourceField: matched.name,
          targetField: target.name,
          transform: 'none',
        })
      }
    }

    return mappings
  }

  /**
   * 设置字段映射
   */
  setMappings(taskId: string, mappings: FieldMapping[]): boolean {
    const task = this.tasks.get(taskId)
    if (!task) return false

    this.updateTask(taskId, {
      mappings,
      status: 'validating',
      currentStep: '验证映射配置',
    })

    return true
  }

  /**
   * 验证映射
   */
  validateMappings(taskId: string): DataIssue[] {
    const task = this.tasks.get(taskId)
    if (!task) return []

    const issues: DataIssue[] = []
    const targetFields = TARGET_COLLECTIONS[task.targetCollection] || []

    // 检查必填字段
    for (const target of targetFields) {
      if (target.required) {
        const mapped = task.mappings.find(m => m.targetField === target.name)
        if (!mapped) {
          issues.push({
            field: target.name,
            type: 'missing',
            severity: 'error',
            count: 1,
            description: `必填字段 "${target.name}" 未映射`,
            suggestion: '请选择一个源字段映射到此字段，或设置默认值',
          })
        }
      }
    }

    return issues
  }

  /**
   * 执行迁移
   */
  async executeMigration(
    taskId: string,
    onProgress?: (progress: number, message: string) => void
  ): Promise<MigrationTask> {
    const task = this.tasks.get(taskId)
    if (!task) throw new Error('任务不存在')

    // 验证映射
    const issues = this.validateMappings(taskId)
    const hasErrors = issues.some(i => i.severity === 'error')
    if (hasErrors) {
      throw new Error('映射验证失败，请先修复错误')
    }

    this.updateTask(taskId, {
      status: 'migrating',
      startedAt: new Date(),
      currentStep: '开始迁移...',
    })

    try {
      // 创建备份集合
      const backupCollection = `${task.targetCollection}_backup_${Date.now()}`
      this.updateTask(taskId, {
        rollbackData: {
          backupCollection,
          canRollback: true,
        },
      })

      // 模拟迁移过程
      const totalRecords = task.stats.totalRecords
      let processed = 0
      let success = 0
      let failed = 0
      let skipped = 0

      while (processed < totalRecords) {
        // 模拟批量处理
        const batchSize = Math.min(10, totalRecords - processed)

        for (let i = 0; i < batchSize; i++) {
          // 模拟单条记录处理
          const random = Math.random()
          if (random < 0.95) {
            success++
          } else if (random < 0.98) {
            failed++
            const updatedTask = this.tasks.get(taskId)!
            updatedTask.errors.push({
              row: processed + i + 1,
              error: '数据格式错误',
              timestamp: new Date(),
            })
          } else {
            skipped++
          }
        }

        processed += batchSize
        const progress = Math.round((processed / totalRecords) * 100)

        this.updateTask(taskId, {
          progress,
          currentStep: `正在迁移 ${processed}/${totalRecords}...`,
          stats: {
            totalRecords,
            processedRecords: processed,
            successRecords: success,
            failedRecords: failed,
            skippedRecords: skipped,
          },
        })

        onProgress?.(progress, `已处理 ${processed}/${totalRecords} 条记录`)

        // 模拟延迟
        await new Promise(r => setTimeout(r, 100))
      }

      this.updateTask(taskId, {
        status: 'completed',
        progress: 100,
        currentStep: '迁移完成',
        completedAt: new Date(),
      })

    } catch (error) {
      this.updateTask(taskId, {
        status: 'failed',
        currentStep: '迁移失败',
        completedAt: new Date(),
      })
      throw error
    }

    return this.tasks.get(taskId)!
  }

  /**
   * 回滚迁移
   */
  async rollback(taskId: string): Promise<boolean> {
    const task = this.tasks.get(taskId)
    if (!task) return false

    if (!task.rollbackData?.canRollback) {
      throw new Error('此任务无法回滚')
    }

    this.updateTask(taskId, {
      currentStep: '正在回滚...',
    })

    // 模拟回滚
    await new Promise(r => setTimeout(r, 1000))

    this.updateTask(taskId, {
      status: 'rolled_back',
      currentStep: '已回滚',
      rollbackData: {
        ...task.rollbackData,
        canRollback: false,
      },
    })

    return true
  }

  /**
   * 更新任务
   */
  private updateTask(taskId: string, updates: Partial<MigrationTask>): void {
    const task = this.tasks.get(taskId)
    if (!task) return

    Object.assign(task, updates)
    this.tasks.set(taskId, task)
  }

  /**
   * 获取任务
   */
  getTask(taskId: string): MigrationTask | undefined {
    return this.tasks.get(taskId)
  }

  /**
   * 获取项目的所有任务
   */
  getProjectTasks(projectId: string): MigrationTask[] {
    return Array.from(this.tasks.values())
      .filter(t => t.projectId === projectId)
      .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime())
  }

  /**
   * 获取目标表字段
   */
  getTargetFields(collection: string): TargetField[] {
    return TARGET_COLLECTIONS[collection] || []
  }

  /**
   * 获取支持的目标表
   */
  getSupportedCollections(): string[] {
    return Object.keys(TARGET_COLLECTIONS)
  }

  /**
   * 生成迁移报告
   */
  generateReport(taskId: string): string {
    const task = this.tasks.get(taskId)
    if (!task) return '任务不存在'

    const duration = task.completedAt && task.startedAt
      ? Math.round((task.completedAt.getTime() - task.startedAt.getTime()) / 1000)
      : 0

    let report = `# 数据迁移报告\n\n`
    report += `## 基本信息\n`
    report += `- 任务名称: ${task.name}\n`
    report += `- 目标表: ${task.targetCollection}\n`
    report += `- 状态: ${task.status}\n`
    report += `- 创建时间: ${task.createdAt.toLocaleString()}\n`
    if (task.completedAt) {
      report += `- 完成时间: ${task.completedAt.toLocaleString()}\n`
      report += `- 耗时: ${duration} 秒\n`
    }

    report += `\n## 迁移统计\n`
    report += `- 总记录数: ${task.stats.totalRecords}\n`
    report += `- 成功: ${task.stats.successRecords} ✅\n`
    report += `- 失败: ${task.stats.failedRecords} ❌\n`
    report += `- 跳过: ${task.stats.skippedRecords} ⏭️\n`
    report += `- 成功率: ${task.stats.totalRecords > 0 ? Math.round((task.stats.successRecords / task.stats.totalRecords) * 100) : 0}%\n`

    if (task.errors.length > 0) {
      report += `\n## 错误详情 (前10条)\n`
      for (const error of task.errors.slice(0, 10)) {
        report += `- 第 ${error.row} 行: ${error.error}\n`
      }
      if (task.errors.length > 10) {
        report += `- ... 还有 ${task.errors.length - 10} 条错误\n`
      }
    }

    report += `\n## 字段映射\n`
    for (const mapping of task.mappings) {
      report += `- ${mapping.sourceField} → ${mapping.targetField}`
      if (mapping.transform && mapping.transform !== 'none') {
        report += ` (转换: ${mapping.transform})`
      }
      report += '\n'
    }

    return report
  }

  /**
   * 生成迁移向导 HTML
   */
  generateWizardHtml(taskId: string): string {
    const task = this.tasks.get(taskId)

    return `
<!DOCTYPE html>
<html lang="zh-CN">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>数据迁移向导</title>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
      background: #f8fafc;
      min-height: 100vh;
      padding: 30px;
    }
    .container { max-width: 800px; margin: 0 auto; }

    .steps {
      display: flex;
      justify-content: space-between;
      margin-bottom: 40px;
      position: relative;
    }
    .steps::before {
      content: '';
      position: absolute;
      top: 20px;
      left: 50px;
      right: 50px;
      height: 2px;
      background: #e2e8f0;
    }
    .step {
      display: flex;
      flex-direction: column;
      align-items: center;
      position: relative;
      z-index: 1;
    }
    .step-circle {
      width: 40px;
      height: 40px;
      border-radius: 50%;
      background: #e2e8f0;
      display: flex;
      align-items: center;
      justify-content: center;
      font-weight: 600;
      margin-bottom: 8px;
    }
    .step.active .step-circle { background: #3b82f6; color: #fff; }
    .step.completed .step-circle { background: #22c55e; color: #fff; }
    .step-label { font-size: 12px; color: #64748b; }

    .card {
      background: #fff;
      border-radius: 12px;
      box-shadow: 0 1px 3px rgba(0,0,0,0.1);
      padding: 30px;
    }
    .card h2 { font-size: 18px; margin-bottom: 20px; }

    .mapping-row {
      display: flex;
      align-items: center;
      gap: 15px;
      padding: 12px 0;
      border-bottom: 1px solid #e2e8f0;
    }
    .mapping-source {
      flex: 1;
      padding: 10px;
      background: #f1f5f9;
      border-radius: 6px;
    }
    .mapping-arrow { color: #94a3b8; }
    .mapping-target {
      flex: 1;
    }
    .mapping-target select {
      width: 100%;
      padding: 10px;
      border: 1px solid #e2e8f0;
      border-radius: 6px;
      font-size: 14px;
    }

    .progress-bar {
      width: 100%;
      height: 20px;
      background: #e2e8f0;
      border-radius: 10px;
      overflow: hidden;
      margin: 20px 0;
    }
    .progress-fill {
      height: 100%;
      background: linear-gradient(90deg, #3b82f6, #22c55e);
      transition: width 0.3s;
    }

    .stats {
      display: grid;
      grid-template-columns: repeat(4, 1fr);
      gap: 15px;
      margin-top: 20px;
    }
    .stat {
      text-align: center;
      padding: 15px;
      background: #f8fafc;
      border-radius: 8px;
    }
    .stat-value { font-size: 24px; font-weight: bold; }
    .stat-label { font-size: 12px; color: #64748b; }

    .btn {
      padding: 12px 24px;
      border: none;
      border-radius: 8px;
      font-size: 14px;
      cursor: pointer;
      font-weight: 500;
    }
    .btn-primary { background: #3b82f6; color: #fff; }
    .btn-secondary { background: #e2e8f0; color: #475569; }
  </style>
</head>
<body>
  <div class="container">
    <div class="steps">
      <div class="step ${task?.status === 'pending' ? 'active' : task ? 'completed' : ''}">
        <div class="step-circle">1</div>
        <div class="step-label">上传数据</div>
      </div>
      <div class="step ${task?.status === 'analyzing' ? 'active' : ['mapping', 'validating', 'migrating', 'completed'].includes(task?.status || '') ? 'completed' : ''}">
        <div class="step-circle">2</div>
        <div class="step-label">分析数据</div>
      </div>
      <div class="step ${task?.status === 'mapping' || task?.status === 'validating' ? 'active' : ['migrating', 'completed'].includes(task?.status || '') ? 'completed' : ''}">
        <div class="step-circle">3</div>
        <div class="step-label">字段映射</div>
      </div>
      <div class="step ${task?.status === 'migrating' ? 'active' : task?.status === 'completed' ? 'completed' : ''}">
        <div class="step-circle">4</div>
        <div class="step-label">执行迁移</div>
      </div>
    </div>

    <div class="card">
      ${task?.status === 'migrating' ? `
        <h2>正在迁移...</h2>
        <p style="color: #64748b; margin-bottom: 20px;">${task.currentStep}</p>
        <div class="progress-bar">
          <div class="progress-fill" style="width: ${task.progress}%"></div>
        </div>
        <div style="text-align: center; color: #64748b;">${task.progress}%</div>
        <div class="stats">
          <div class="stat">
            <div class="stat-value">${task.stats.totalRecords}</div>
            <div class="stat-label">总记录</div>
          </div>
          <div class="stat">
            <div class="stat-value" style="color: #22c55e">${task.stats.successRecords}</div>
            <div class="stat-label">成功</div>
          </div>
          <div class="stat">
            <div class="stat-value" style="color: #ef4444">${task.stats.failedRecords}</div>
            <div class="stat-label">失败</div>
          </div>
          <div class="stat">
            <div class="stat-value">${task.stats.skippedRecords}</div>
            <div class="stat-label">跳过</div>
          </div>
        </div>
      ` : task?.status === 'completed' ? `
        <h2>✅ 迁移完成</h2>
        <div class="stats">
          <div class="stat">
            <div class="stat-value">${task.stats.totalRecords}</div>
            <div class="stat-label">总记录</div>
          </div>
          <div class="stat">
            <div class="stat-value" style="color: #22c55e">${task.stats.successRecords}</div>
            <div class="stat-label">成功</div>
          </div>
          <div class="stat">
            <div class="stat-value" style="color: #ef4444">${task.stats.failedRecords}</div>
            <div class="stat-label">失败</div>
          </div>
          <div class="stat">
            <div class="stat-value">${Math.round((task.stats.successRecords / task.stats.totalRecords) * 100)}%</div>
            <div class="stat-label">成功率</div>
          </div>
        </div>
      ` : `
        <h2>开始数据迁移</h2>
        <p style="color: #64748b;">上传您的数据文件，系统将自动分析并帮助您完成迁移。</p>
        <div style="margin-top: 30px; text-align: center;">
          <button class="btn btn-primary">📁 选择文件</button>
        </div>
      `}
    </div>
  </div>
</body>
</html>
`
  }
}

// 单例导出
export const dataMigrator = new DataMigratorService()
