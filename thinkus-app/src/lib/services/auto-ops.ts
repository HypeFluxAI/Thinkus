/**
 * 持续运维自愈服务
 *
 * 自动巡检、问题检测和自动修复
 * - 定时健康检查
 * - 异常自动告警
 * - 常见问题自动修复
 * - 故障自愈流程
 */

// ============================================================================
// 类型定义
// ============================================================================

/** 检查类型 */
export type CheckType =
  | 'health'          // 健康检查
  | 'ssl'             // SSL证书
  | 'domain'          // 域名状态
  | 'database'        // 数据库连接
  | 'storage'         // 存储空间
  | 'memory'          // 内存使用
  | 'cpu'             // CPU使用
  | 'response_time'   // 响应时间
  | 'error_rate'      // 错误率
  | 'backup'          // 备份状态

/** 检查结果状态 */
export type CheckResultStatus = 'healthy' | 'warning' | 'critical' | 'unknown'

/** 检查结果 */
export interface CheckResult {
  checkType: CheckType
  status: CheckResultStatus
  message: string
  value?: number | string
  threshold?: number | string
  checkedAt: Date
  autoFixable: boolean
  fixAction?: string
}

/** 巡检报告 */
export interface InspectionReport {
  id: string
  projectId: string
  inspectedAt: Date
  duration: number  // 耗时(毫秒)
  overallStatus: CheckResultStatus
  checks: CheckResult[]
  issues: Issue[]
  autoFixAttempts: AutoFixAttempt[]
  nextScheduledAt?: Date
}

/** 问题 */
export interface Issue {
  id: string
  projectId: string
  checkType: CheckType
  severity: 'critical' | 'warning' | 'info'
  title: string
  description: string
  detectedAt: Date
  resolvedAt?: Date
  autoFixed: boolean
  fixAttempts: number
  status: 'open' | 'fixing' | 'resolved' | 'escalated'
}

/** 自动修复尝试 */
export interface AutoFixAttempt {
  id: string
  issueId: string
  action: string
  startedAt: Date
  completedAt?: Date
  success: boolean
  error?: string
  rollbackAvailable: boolean
}

/** 告警 */
export interface Alert {
  id: string
  projectId: string
  issueId: string
  severity: 'critical' | 'warning' | 'info'
  title: string
  message: string
  channel: 'email' | 'sms' | 'webhook' | 'slack'
  sentAt: Date
  acknowledged: boolean
  acknowledgedAt?: Date
  acknowledgedBy?: string
}

/** 自愈策略 */
export interface HealingStrategy {
  checkType: CheckType
  condition: (result: CheckResult) => boolean
  action: HealingAction
  cooldownMinutes: number
  maxAttempts: number
}

/** 自愈动作 */
export interface HealingAction {
  name: string
  description: string
  execute: (projectId: string, context: HealingContext) => Promise<HealingResult>
  rollback?: (projectId: string, context: HealingContext) => Promise<void>
}

/** 自愈上下文 */
export interface HealingContext {
  checkResult: CheckResult
  issue: Issue
  previousAttempts: AutoFixAttempt[]
  projectConfig: ProjectOpsConfig
}

/** 自愈结果 */
export interface HealingResult {
  success: boolean
  message: string
  changes?: string[]
  requiresManualIntervention?: boolean
}

/** 项目运维配置 */
export interface ProjectOpsConfig {
  projectId: string
  productUrl: string
  adminUrl: string
  databaseUrl?: string
  monitoringEnabled: boolean
  autoHealingEnabled: boolean
  alertChannels: ('email' | 'sms' | 'webhook' | 'slack')[]
  alertEmails: string[]
  alertPhones?: string[]
  webhookUrl?: string
  slackWebhook?: string
  checkIntervalMinutes: number
  sslExpiryWarningDays: number
  storageWarningPercent: number
  responseTimeWarningMs: number
  errorRateWarningPercent: number
}

/** 运维仪表盘数据 */
export interface OpsDashboard {
  projectId: string
  currentStatus: CheckResultStatus
  uptime: {
    last24h: number
    last7d: number
    last30d: number
  }
  lastInspection?: InspectionReport
  openIssues: Issue[]
  recentAlerts: Alert[]
  autoFixStats: {
    totalAttempts: number
    successCount: number
    successRate: number
  }
  recommendations: string[]
}

// ============================================================================
// 检查配置
// ============================================================================

/** 检查类型配置 */
const CHECK_CONFIG: Record<CheckType, {
  label: string
  icon: string
  description: string
  defaultInterval: number  // 默认检查间隔(分钟)
}> = {
  health: {
    label: '服务健康',
    icon: '💚',
    description: '检查服务是否正常运行',
    defaultInterval: 5
  },
  ssl: {
    label: 'SSL证书',
    icon: '🔒',
    description: '检查SSL证书有效期',
    defaultInterval: 1440  // 每天
  },
  domain: {
    label: '域名状态',
    icon: '🌐',
    description: '检查域名解析是否正常',
    defaultInterval: 60
  },
  database: {
    label: '数据库连接',
    icon: '🗄️',
    description: '检查数据库连接状态',
    defaultInterval: 5
  },
  storage: {
    label: '存储空间',
    icon: '💾',
    description: '检查存储空间使用情况',
    defaultInterval: 60
  },
  memory: {
    label: '内存使用',
    icon: '🧠',
    description: '检查内存使用率',
    defaultInterval: 5
  },
  cpu: {
    label: 'CPU使用',
    icon: '⚡',
    description: '检查CPU使用率',
    defaultInterval: 5
  },
  response_time: {
    label: '响应时间',
    icon: '⏱️',
    description: '检查API响应时间',
    defaultInterval: 5
  },
  error_rate: {
    label: '错误率',
    icon: '❌',
    description: '检查错误发生率',
    defaultInterval: 15
  },
  backup: {
    label: '备份状态',
    icon: '💿',
    description: '检查备份是否正常执行',
    defaultInterval: 1440  // 每天
  }
}

// ============================================================================
// 自愈策略配置
// ============================================================================

/** 预定义自愈策略 */
const HEALING_STRATEGIES: HealingStrategy[] = [
  // 服务不健康 -> 重启服务
  {
    checkType: 'health',
    condition: (result) => result.status === 'critical',
    action: {
      name: 'restart_service',
      description: '重启服务',
      execute: async (projectId, context) => {
        // 模拟重启服务
        console.log(`[自愈] 重启项目 ${projectId} 的服务`)
        await sleep(2000)

        // 模拟检查重启结果
        const success = Math.random() > 0.2  // 80%成功率

        return {
          success,
          message: success ? '服务重启成功' : '服务重启失败，需要人工介入',
          changes: success ? ['服务已重启', '健康检查通过'] : undefined,
          requiresManualIntervention: !success
        }
      },
      rollback: async (projectId) => {
        console.log(`[回滚] 回滚项目 ${projectId} 的服务重启`)
      }
    },
    cooldownMinutes: 10,
    maxAttempts: 3
  },

  // 数据库连接失败 -> 重建连接池
  {
    checkType: 'database',
    condition: (result) => result.status === 'critical',
    action: {
      name: 'reconnect_database',
      description: '重建数据库连接',
      execute: async (projectId) => {
        console.log(`[自愈] 重建项目 ${projectId} 的数据库连接`)
        await sleep(1000)

        const success = Math.random() > 0.1  // 90%成功率

        return {
          success,
          message: success ? '数据库连接已重建' : '数据库连接重建失败',
          changes: success ? ['连接池已清空', '新连接已建立'] : undefined
        }
      }
    },
    cooldownMinutes: 5,
    maxAttempts: 5
  },

  // 响应时间过长 -> 清理缓存
  {
    checkType: 'response_time',
    condition: (result) => result.status === 'warning' || result.status === 'critical',
    action: {
      name: 'clear_cache',
      description: '清理缓存',
      execute: async (projectId) => {
        console.log(`[自愈] 清理项目 ${projectId} 的缓存`)
        await sleep(500)

        return {
          success: true,
          message: '缓存已清理',
          changes: ['Redis缓存已清空', 'CDN缓存已刷新']
        }
      }
    },
    cooldownMinutes: 30,
    maxAttempts: 2
  },

  // 内存使用过高 -> 触发GC或重启
  {
    checkType: 'memory',
    condition: (result) => result.status === 'critical',
    action: {
      name: 'memory_cleanup',
      description: '内存清理',
      execute: async (projectId) => {
        console.log(`[自愈] 清理项目 ${projectId} 的内存`)
        await sleep(1500)

        const success = Math.random() > 0.3

        return {
          success,
          message: success ? '内存清理成功' : '内存清理效果不明显，可能需要扩容',
          changes: success ? ['触发GC', '释放了 30% 内存'] : undefined,
          requiresManualIntervention: !success
        }
      }
    },
    cooldownMinutes: 15,
    maxAttempts: 2
  },

  // 存储空间不足 -> 清理临时文件
  {
    checkType: 'storage',
    condition: (result) => result.status === 'warning' || result.status === 'critical',
    action: {
      name: 'cleanup_storage',
      description: '清理临时文件',
      execute: async (projectId) => {
        console.log(`[自愈] 清理项目 ${projectId} 的临时文件`)
        await sleep(2000)

        return {
          success: true,
          message: '临时文件已清理',
          changes: ['清理了日志文件', '清理了临时上传', '释放了 2GB 空间']
        }
      }
    },
    cooldownMinutes: 60,
    maxAttempts: 1
  },

  // 错误率过高 -> 限流保护
  {
    checkType: 'error_rate',
    condition: (result) => result.status === 'critical',
    action: {
      name: 'enable_rate_limit',
      description: '启用限流保护',
      execute: async (projectId) => {
        console.log(`[自愈] 为项目 ${projectId} 启用限流保护`)
        await sleep(500)

        return {
          success: true,
          message: '已启用限流保护',
          changes: ['API限流已开启', '请求速率限制为 100/分钟'],
          requiresManualIntervention: true  // 需要人工排查根本原因
        }
      },
      rollback: async (projectId) => {
        console.log(`[回滚] 关闭项目 ${projectId} 的限流保护`)
      }
    },
    cooldownMinutes: 60,
    maxAttempts: 1
  }
]

// ============================================================================
// 辅助函数
// ============================================================================

function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms))
}

function generateId(): string {
  return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`
}

// ============================================================================
// 自动运维服务
// ============================================================================

export class AutoOpsService {
  // 模拟存储
  private configs: Map<string, ProjectOpsConfig> = new Map()
  private inspections: InspectionReport[] = []
  private issues: Issue[] = []
  private alerts: Alert[] = []
  private fixAttempts: AutoFixAttempt[] = []
  private healingCooldowns: Map<string, Date> = new Map()

  /**
   * 注册项目运维配置
   */
  registerProject(config: ProjectOpsConfig): void {
    this.configs.set(config.projectId, config)
  }

  /**
   * 执行单项检查
   */
  async runCheck(projectId: string, checkType: CheckType): Promise<CheckResult> {
    const config = this.configs.get(projectId)
    if (!config) {
      return {
        checkType,
        status: 'unknown',
        message: '项目未配置',
        checkedAt: new Date(),
        autoFixable: false
      }
    }

    // 根据检查类型执行检查
    switch (checkType) {
      case 'health':
        return this.checkHealth(config)
      case 'ssl':
        return this.checkSSL(config)
      case 'domain':
        return this.checkDomain(config)
      case 'database':
        return this.checkDatabase(config)
      case 'storage':
        return this.checkStorage(config)
      case 'memory':
        return this.checkMemory(config)
      case 'cpu':
        return this.checkCPU(config)
      case 'response_time':
        return this.checkResponseTime(config)
      case 'error_rate':
        return this.checkErrorRate(config)
      case 'backup':
        return this.checkBackup(config)
      default:
        return {
          checkType,
          status: 'unknown',
          message: '未知检查类型',
          checkedAt: new Date(),
          autoFixable: false
        }
    }
  }

  /**
   * 健康检查
   */
  private async checkHealth(config: ProjectOpsConfig): Promise<CheckResult> {
    try {
      const start = Date.now()
      const response = await fetch(`${config.productUrl}/api/health`, {
        method: 'GET',
        signal: AbortSignal.timeout(5000)
      }).catch(() => null)

      const latency = Date.now() - start

      if (!response) {
        return {
          checkType: 'health',
          status: 'critical',
          message: '服务无响应',
          checkedAt: new Date(),
          autoFixable: true,
          fixAction: '重启服务'
        }
      }

      if (!response.ok) {
        return {
          checkType: 'health',
          status: 'critical',
          message: `服务返回错误: ${response.status}`,
          value: response.status,
          checkedAt: new Date(),
          autoFixable: true,
          fixAction: '重启服务'
        }
      }

      return {
        checkType: 'health',
        status: latency > 3000 ? 'warning' : 'healthy',
        message: latency > 3000 ? '服务响应较慢' : '服务正常',
        value: `${latency}ms`,
        checkedAt: new Date(),
        autoFixable: false
      }
    } catch {
      return {
        checkType: 'health',
        status: 'critical',
        message: '健康检查失败',
        checkedAt: new Date(),
        autoFixable: true,
        fixAction: '重启服务'
      }
    }
  }

  /**
   * SSL证书检查
   */
  private async checkSSL(config: ProjectOpsConfig): Promise<CheckResult> {
    // 模拟SSL检查
    const daysUntilExpiry = Math.floor(Math.random() * 90)  // 模拟0-90天

    let status: CheckResultStatus = 'healthy'
    let message = 'SSL证书有效'

    if (daysUntilExpiry <= 7) {
      status = 'critical'
      message = `SSL证书将在 ${daysUntilExpiry} 天后过期，请立即续期`
    } else if (daysUntilExpiry <= config.sslExpiryWarningDays) {
      status = 'warning'
      message = `SSL证书将在 ${daysUntilExpiry} 天后过期`
    }

    return {
      checkType: 'ssl',
      status,
      message,
      value: `${daysUntilExpiry}天`,
      threshold: `${config.sslExpiryWarningDays}天`,
      checkedAt: new Date(),
      autoFixable: false  // SSL续期通常需要人工操作
    }
  }

  /**
   * 域名检查
   */
  private async checkDomain(config: ProjectOpsConfig): Promise<CheckResult> {
    try {
      const url = new URL(config.productUrl)
      // 模拟DNS解析检查
      const resolved = Math.random() > 0.05  // 95%正常

      if (!resolved) {
        return {
          checkType: 'domain',
          status: 'critical',
          message: '域名解析失败',
          value: url.hostname,
          checkedAt: new Date(),
          autoFixable: false
        }
      }

      return {
        checkType: 'domain',
        status: 'healthy',
        message: '域名解析正常',
        value: url.hostname,
        checkedAt: new Date(),
        autoFixable: false
      }
    } catch {
      return {
        checkType: 'domain',
        status: 'unknown',
        message: '域名检查失败',
        checkedAt: new Date(),
        autoFixable: false
      }
    }
  }

  /**
   * 数据库检查
   */
  private async checkDatabase(config: ProjectOpsConfig): Promise<CheckResult> {
    // 模拟数据库连接检查
    const connected = Math.random() > 0.02  // 98%正常
    const latency = Math.floor(Math.random() * 200)

    if (!connected) {
      return {
        checkType: 'database',
        status: 'critical',
        message: '数据库连接失败',
        checkedAt: new Date(),
        autoFixable: true,
        fixAction: '重建数据库连接'
      }
    }

    if (latency > 100) {
      return {
        checkType: 'database',
        status: 'warning',
        message: '数据库响应较慢',
        value: `${latency}ms`,
        threshold: '100ms',
        checkedAt: new Date(),
        autoFixable: false
      }
    }

    return {
      checkType: 'database',
      status: 'healthy',
      message: '数据库连接正常',
      value: `${latency}ms`,
      checkedAt: new Date(),
      autoFixable: false
    }
  }

  /**
   * 存储空间检查
   */
  private async checkStorage(config: ProjectOpsConfig): Promise<CheckResult> {
    // 模拟存储使用率
    const usagePercent = Math.floor(Math.random() * 100)

    let status: CheckResultStatus = 'healthy'
    let message = '存储空间充足'

    if (usagePercent >= 95) {
      status = 'critical'
      message = '存储空间严重不足'
    } else if (usagePercent >= config.storageWarningPercent) {
      status = 'warning'
      message = '存储空间不足'
    }

    return {
      checkType: 'storage',
      status,
      message,
      value: `${usagePercent}%`,
      threshold: `${config.storageWarningPercent}%`,
      checkedAt: new Date(),
      autoFixable: status !== 'healthy',
      fixAction: status !== 'healthy' ? '清理临时文件' : undefined
    }
  }

  /**
   * 内存检查
   */
  private async checkMemory(config: ProjectOpsConfig): Promise<CheckResult> {
    const usagePercent = Math.floor(Math.random() * 100)

    let status: CheckResultStatus = 'healthy'
    let message = '内存使用正常'

    if (usagePercent >= 95) {
      status = 'critical'
      message = '内存使用严重过高'
    } else if (usagePercent >= 80) {
      status = 'warning'
      message = '内存使用偏高'
    }

    return {
      checkType: 'memory',
      status,
      message,
      value: `${usagePercent}%`,
      threshold: '80%',
      checkedAt: new Date(),
      autoFixable: status === 'critical',
      fixAction: status === 'critical' ? '内存清理' : undefined
    }
  }

  /**
   * CPU检查
   */
  private async checkCPU(config: ProjectOpsConfig): Promise<CheckResult> {
    const usagePercent = Math.floor(Math.random() * 100)

    let status: CheckResultStatus = 'healthy'
    let message = 'CPU使用正常'

    if (usagePercent >= 95) {
      status = 'critical'
      message = 'CPU使用严重过高'
    } else if (usagePercent >= 80) {
      status = 'warning'
      message = 'CPU使用偏高'
    }

    return {
      checkType: 'cpu',
      status,
      message,
      value: `${usagePercent}%`,
      threshold: '80%',
      checkedAt: new Date(),
      autoFixable: false  // CPU问题通常需要扩容
    }
  }

  /**
   * 响应时间检查
   */
  private async checkResponseTime(config: ProjectOpsConfig): Promise<CheckResult> {
    // 模拟响应时间
    const responseTime = Math.floor(Math.random() * 2000)

    let status: CheckResultStatus = 'healthy'
    let message = '响应时间正常'

    if (responseTime >= config.responseTimeWarningMs * 2) {
      status = 'critical'
      message = '响应时间严重过长'
    } else if (responseTime >= config.responseTimeWarningMs) {
      status = 'warning'
      message = '响应时间偏长'
    }

    return {
      checkType: 'response_time',
      status,
      message,
      value: `${responseTime}ms`,
      threshold: `${config.responseTimeWarningMs}ms`,
      checkedAt: new Date(),
      autoFixable: status !== 'healthy',
      fixAction: status !== 'healthy' ? '清理缓存' : undefined
    }
  }

  /**
   * 错误率检查
   */
  private async checkErrorRate(config: ProjectOpsConfig): Promise<CheckResult> {
    // 模拟错误率
    const errorRate = Math.random() * 10

    let status: CheckResultStatus = 'healthy'
    let message = '错误率正常'

    if (errorRate >= config.errorRateWarningPercent * 2) {
      status = 'critical'
      message = '错误率严重过高'
    } else if (errorRate >= config.errorRateWarningPercent) {
      status = 'warning'
      message = '错误率偏高'
    }

    return {
      checkType: 'error_rate',
      status,
      message,
      value: `${errorRate.toFixed(2)}%`,
      threshold: `${config.errorRateWarningPercent}%`,
      checkedAt: new Date(),
      autoFixable: status === 'critical',
      fixAction: status === 'critical' ? '启用限流保护' : undefined
    }
  }

  /**
   * 备份状态检查
   */
  private async checkBackup(config: ProjectOpsConfig): Promise<CheckResult> {
    // 模拟备份状态
    const hoursSinceLastBackup = Math.floor(Math.random() * 48)

    let status: CheckResultStatus = 'healthy'
    let message = '备份状态正常'

    if (hoursSinceLastBackup >= 48) {
      status = 'critical'
      message = '超过48小时未备份'
    } else if (hoursSinceLastBackup >= 24) {
      status = 'warning'
      message = '超过24小时未备份'
    }

    return {
      checkType: 'backup',
      status,
      message,
      value: `${hoursSinceLastBackup}小时前`,
      threshold: '24小时',
      checkedAt: new Date(),
      autoFixable: false
    }
  }

  /**
   * 执行完整巡检
   */
  async runInspection(projectId: string): Promise<InspectionReport> {
    const startTime = Date.now()
    const config = this.configs.get(projectId)

    if (!config) {
      throw new Error(`项目 ${projectId} 未配置`)
    }

    // 执行所有检查
    const checkTypes: CheckType[] = [
      'health', 'ssl', 'domain', 'database', 'storage',
      'memory', 'cpu', 'response_time', 'error_rate', 'backup'
    ]

    const checks: CheckResult[] = []
    for (const checkType of checkTypes) {
      const result = await this.runCheck(projectId, checkType)
      checks.push(result)
    }

    // 确定整体状态
    let overallStatus: CheckResultStatus = 'healthy'
    if (checks.some(c => c.status === 'critical')) overallStatus = 'critical'
    else if (checks.some(c => c.status === 'warning')) overallStatus = 'warning'

    // 创建或更新问题
    const issues: Issue[] = []
    const autoFixAttempts: AutoFixAttempt[] = []

    for (const check of checks) {
      if (check.status === 'critical' || check.status === 'warning') {
        // 创建问题
        const issue: Issue = {
          id: generateId(),
          projectId,
          checkType: check.checkType,
          severity: check.status === 'critical' ? 'critical' : 'warning',
          title: `${CHECK_CONFIG[check.checkType].label}异常`,
          description: check.message,
          detectedAt: new Date(),
          autoFixed: false,
          fixAttempts: 0,
          status: 'open'
        }
        issues.push(issue)
        this.issues.push(issue)

        // 尝试自动修复
        if (check.autoFixable && config.autoHealingEnabled) {
          const fixAttempt = await this.attemptAutoFix(projectId, issue, check)
          if (fixAttempt) {
            autoFixAttempts.push(fixAttempt)
          }
        }

        // 发送告警
        if (check.status === 'critical') {
          await this.sendAlert(projectId, issue)
        }
      }
    }

    const report: InspectionReport = {
      id: generateId(),
      projectId,
      inspectedAt: new Date(),
      duration: Date.now() - startTime,
      overallStatus,
      checks,
      issues,
      autoFixAttempts,
      nextScheduledAt: new Date(Date.now() + config.checkIntervalMinutes * 60 * 1000)
    }

    this.inspections.push(report)
    return report
  }

  /**
   * 尝试自动修复
   */
  private async attemptAutoFix(
    projectId: string,
    issue: Issue,
    checkResult: CheckResult
  ): Promise<AutoFixAttempt | null> {
    // 查找适用的自愈策略
    const strategy = HEALING_STRATEGIES.find(
      s => s.checkType === checkResult.checkType && s.condition(checkResult)
    )

    if (!strategy) return null

    // 检查冷却时间
    const cooldownKey = `${projectId}-${strategy.action.name}`
    const lastAttempt = this.healingCooldowns.get(cooldownKey)
    if (lastAttempt) {
      const cooldownEnd = new Date(lastAttempt.getTime() + strategy.cooldownMinutes * 60 * 1000)
      if (new Date() < cooldownEnd) {
        console.log(`[自愈] ${strategy.action.name} 处于冷却期`)
        return null
      }
    }

    // 检查最大尝试次数
    const previousAttempts = this.fixAttempts.filter(
      a => a.issueId === issue.id || (
        this.issues.find(i => i.id === a.issueId)?.checkType === issue.checkType
      )
    )
    if (previousAttempts.length >= strategy.maxAttempts) {
      console.log(`[自愈] ${strategy.action.name} 已达最大尝试次数`)
      issue.status = 'escalated'
      return null
    }

    // 执行自愈
    const attempt: AutoFixAttempt = {
      id: generateId(),
      issueId: issue.id,
      action: strategy.action.name,
      startedAt: new Date(),
      success: false,
      rollbackAvailable: !!strategy.action.rollback
    }

    issue.status = 'fixing'
    issue.fixAttempts++

    try {
      const config = this.configs.get(projectId)!
      const context: HealingContext = {
        checkResult,
        issue,
        previousAttempts,
        projectConfig: config
      }

      const result = await strategy.action.execute(projectId, context)

      attempt.completedAt = new Date()
      attempt.success = result.success

      if (result.success) {
        issue.status = 'resolved'
        issue.resolvedAt = new Date()
        issue.autoFixed = true
      } else {
        attempt.error = result.message
        if (result.requiresManualIntervention) {
          issue.status = 'escalated'
        } else {
          issue.status = 'open'
        }
      }
    } catch (error) {
      attempt.completedAt = new Date()
      attempt.success = false
      attempt.error = error instanceof Error ? error.message : '未知错误'
      issue.status = 'open'
    }

    // 更新冷却时间
    this.healingCooldowns.set(cooldownKey, new Date())

    this.fixAttempts.push(attempt)
    return attempt
  }

  /**
   * 发送告警
   */
  private async sendAlert(projectId: string, issue: Issue): Promise<void> {
    const config = this.configs.get(projectId)
    if (!config) return

    for (const channel of config.alertChannels) {
      const alert: Alert = {
        id: generateId(),
        projectId,
        issueId: issue.id,
        severity: issue.severity,
        title: issue.title,
        message: issue.description,
        channel,
        sentAt: new Date(),
        acknowledged: false
      }

      this.alerts.push(alert)

      // 实际发送告警 (模拟)
      console.log(`[告警] 通过 ${channel} 发送: ${issue.title}`)
    }
  }

  /**
   * 获取运维仪表盘数据
   */
  async getDashboard(projectId: string): Promise<OpsDashboard> {
    const config = this.configs.get(projectId)

    // 获取最近巡检
    const projectInspections = this.inspections
      .filter(i => i.projectId === projectId)
      .sort((a, b) => b.inspectedAt.getTime() - a.inspectedAt.getTime())
    const lastInspection = projectInspections[0]

    // 获取未解决问题
    const openIssues = this.issues.filter(
      i => i.projectId === projectId && i.status !== 'resolved'
    )

    // 获取最近告警
    const recentAlerts = this.alerts
      .filter(a => a.projectId === projectId)
      .sort((a, b) => b.sentAt.getTime() - a.sentAt.getTime())
      .slice(0, 10)

    // 自动修复统计
    const projectAttempts = this.fixAttempts.filter(
      a => this.issues.find(i => i.id === a.issueId)?.projectId === projectId
    )
    const successCount = projectAttempts.filter(a => a.success).length

    // 计算可用率 (模拟)
    const uptime = {
      last24h: 99.5 + Math.random() * 0.5,
      last7d: 99.0 + Math.random() * 1.0,
      last30d: 98.5 + Math.random() * 1.5
    }

    // 生成建议
    const recommendations: string[] = []
    if (openIssues.some(i => i.severity === 'critical')) {
      recommendations.push('有严重问题需要立即处理')
    }
    if (openIssues.length > 5) {
      recommendations.push('建议集中处理累积的问题')
    }
    if (!config?.autoHealingEnabled) {
      recommendations.push('建议启用自动修复功能')
    }

    return {
      projectId,
      currentStatus: lastInspection?.overallStatus || 'unknown',
      uptime,
      lastInspection,
      openIssues,
      recentAlerts,
      autoFixStats: {
        totalAttempts: projectAttempts.length,
        successCount,
        successRate: projectAttempts.length > 0 ? (successCount / projectAttempts.length) * 100 : 0
      },
      recommendations
    }
  }

  /**
   * 确认告警
   */
  acknowledgeAlert(alertId: string, acknowledgedBy: string): void {
    const alert = this.alerts.find(a => a.id === alertId)
    if (alert) {
      alert.acknowledged = true
      alert.acknowledgedAt = new Date()
      alert.acknowledgedBy = acknowledgedBy
    }
  }

  /**
   * 获取检查类型配置
   */
  getCheckConfig() {
    return CHECK_CONFIG
  }

  /**
   * 生成人话运维摘要
   */
  generateOpsSummary(dashboard: OpsDashboard): string {
    const statusEmoji = {
      healthy: '💚',
      warning: '💛',
      critical: '🔴',
      unknown: '❓'
    }

    let summary = `${statusEmoji[dashboard.currentStatus]} **运维状态: ${
      dashboard.currentStatus === 'healthy' ? '正常' :
      dashboard.currentStatus === 'warning' ? '有警告' :
      dashboard.currentStatus === 'critical' ? '有问题' : '未知'
    }**\n\n`

    summary += `**可用率:**\n`
    summary += `- 24小时: ${dashboard.uptime.last24h.toFixed(2)}%\n`
    summary += `- 7天: ${dashboard.uptime.last7d.toFixed(2)}%\n`
    summary += `- 30天: ${dashboard.uptime.last30d.toFixed(2)}%\n\n`

    if (dashboard.openIssues.length > 0) {
      summary += `**待处理问题 (${dashboard.openIssues.length}):**\n`
      for (const issue of dashboard.openIssues.slice(0, 5)) {
        const icon = issue.severity === 'critical' ? '🔴' : '🟡'
        summary += `- ${icon} ${issue.title}\n`
      }
      summary += '\n'
    }

    if (dashboard.autoFixStats.totalAttempts > 0) {
      summary += `**自动修复:** ${dashboard.autoFixStats.successCount}/${dashboard.autoFixStats.totalAttempts} 成功 (${dashboard.autoFixStats.successRate.toFixed(0)}%)\n\n`
    }

    if (dashboard.recommendations.length > 0) {
      summary += `**建议:**\n`
      for (const rec of dashboard.recommendations) {
        summary += `- 💡 ${rec}\n`
      }
    }

    return summary
  }
}

// 导出单例
export const autoOps = new AutoOpsService()
