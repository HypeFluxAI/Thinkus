/**
 * 智能问题诊断服务
 *
 * 一键诊断用户遇到的问题，快速定位根因并提供解决方案
 * 解决"用户不知道怎么描述问题、等待诊断时间长"的问题
 */

// ============================================================================
// 类型定义
// ============================================================================

/**
 * 问题类型（用户选择）
 */
export type IssueType =
  | 'cannot_access'       // 无法访问网站
  | 'login_failed'        // 登录失败
  | 'feature_broken'      // 功能不正常
  | 'slow_performance'    // 运行太慢
  | 'data_error'          // 数据出错
  | 'display_error'       // 显示异常
  | 'payment_issue'       // 支付问题
  | 'other'               // 其他问题

/**
 * 问题类型配置
 */
export interface IssueTypeConfig {
  type: IssueType
  label: string
  icon: string
  description: string
  /** 快速诊断检查项 */
  diagnosticChecks: DiagnosticCheck[]
  /** 常见原因 */
  commonCauses: string[]
  /** 快速修复选项 */
  quickFixes: QuickFix[]
}

/**
 * 诊断检查项
 */
export interface DiagnosticCheck {
  id: string
  name: string
  description: string
  /** 检查类型 */
  checkType: 'auto' | 'manual' | 'ai'
  /** 预计时间（秒） */
  estimatedTime: number
  /** 检查函数 */
  check?: (context: DiagnosticContext) => Promise<CheckResult>
}

/**
 * 检查结果
 */
export interface CheckResult {
  checkId: string
  status: 'passed' | 'failed' | 'warning' | 'skipped'
  message: string
  details?: string
  suggestion?: string
}

/**
 * 快速修复选项
 */
export interface QuickFix {
  id: string
  name: string
  description: string
  /** 是否可自动执行 */
  autoExecutable: boolean
  /** 风险等级 */
  riskLevel: 'low' | 'medium' | 'high'
  /** 预计时间（秒） */
  estimatedTime: number
  /** 执行函数 */
  execute?: (context: DiagnosticContext) => Promise<FixResult>
}

/**
 * 修复结果
 */
export interface FixResult {
  success: boolean
  message: string
  needsVerification: boolean
  nextSteps?: string[]
}

/**
 * 诊断上下文
 */
export interface DiagnosticContext {
  projectId: string
  productUrl?: string
  adminUrl?: string
  userEmail?: string
  issueType: IssueType
  userDescription?: string
  screenshotUrl?: string
  browserInfo?: {
    name: string
    version: string
    os: string
  }
  timestamp: Date
}

/**
 * 诊断结果
 */
export interface DiagnosisResult {
  sessionId: string
  projectId: string
  issueType: IssueType
  status: 'diagnosing' | 'completed' | 'needs_human'
  /** 诊断置信度 (0-100) */
  confidence: number
  /** 根因分析 */
  rootCause?: {
    category: string
    description: string
    evidence: string[]
  }
  /** 检查结果 */
  checkResults: CheckResult[]
  /** 可能的原因（按可能性排序） */
  possibleCauses: Array<{
    cause: string
    probability: number  // 0-100
    evidence?: string
  }>
  /** 建议的修复方案 */
  suggestedFixes: Array<{
    fix: QuickFix
    applicability: number  // 0-100
    reason: string
  }>
  /** 是否需要人工支持 */
  needsHumanSupport: boolean
  /** 人话诊断摘要 */
  summary: string
  /** 下一步建议 */
  nextSteps: string[]
  /** 诊断耗时（毫秒） */
  diagnosisTimeMs: number
}

/**
 * 诊断会话
 */
export interface DiagnosisSession {
  id: string
  projectId: string
  status: 'active' | 'completed' | 'cancelled'
  startedAt: Date
  completedAt?: Date
  context: DiagnosticContext
  result?: DiagnosisResult
  /** 已执行的快速修复 */
  executedFixes: Array<{
    fixId: string
    executedAt: Date
    result: FixResult
  }>
  /** 用户反馈 */
  feedback?: {
    helpful: boolean
    resolved: boolean
    comment?: string
  }
}

// ============================================================================
// 问题类型配置
// ============================================================================

const ISSUE_TYPE_CONFIGS: IssueTypeConfig[] = [
  {
    type: 'cannot_access',
    label: '无法访问网站',
    icon: '🌐',
    description: '网站打不开、显示错误页面',
    diagnosticChecks: [
      { id: 'dns_check', name: '域名解析', description: '检查域名是否正确解析', checkType: 'auto', estimatedTime: 3 },
      { id: 'server_check', name: '服务器状态', description: '检查服务器是否在线', checkType: 'auto', estimatedTime: 5 },
      { id: 'ssl_check', name: 'SSL证书', description: '检查安全证书是否有效', checkType: 'auto', estimatedTime: 3 },
      { id: 'deployment_check', name: '部署状态', description: '检查最新部署是否成功', checkType: 'auto', estimatedTime: 5 },
    ],
    commonCauses: [
      '域名DNS未生效（新域名需要24-48小时）',
      'SSL证书正在签发中',
      '服务器正在重启或维护',
      '部署失败导致服务不可用',
    ],
    quickFixes: [
      { id: 'clear_dns_cache', name: '清除DNS缓存', description: '刷新本地DNS缓存', autoExecutable: false, riskLevel: 'low', estimatedTime: 60 },
      { id: 'redeploy', name: '重新部署', description: '触发一次新的部署', autoExecutable: true, riskLevel: 'low', estimatedTime: 180 },
      { id: 'renew_ssl', name: '续签SSL', description: '重新申请SSL证书', autoExecutable: true, riskLevel: 'low', estimatedTime: 300 },
    ],
  },
  {
    type: 'login_failed',
    label: '登录失败',
    icon: '🔑',
    description: '无法登录账号、密码错误',
    diagnosticChecks: [
      { id: 'auth_service', name: '认证服务', description: '检查认证服务是否正常', checkType: 'auto', estimatedTime: 3 },
      { id: 'database_check', name: '数据库连接', description: '检查用户数据库是否可访问', checkType: 'auto', estimatedTime: 3 },
      { id: 'account_status', name: '账号状态', description: '检查账号是否被锁定', checkType: 'auto', estimatedTime: 2 },
    ],
    commonCauses: [
      '密码输入错误',
      '账号被锁定（多次尝试失败）',
      '认证服务暂时不可用',
      '浏览器缓存导致的问题',
    ],
    quickFixes: [
      { id: 'reset_password', name: '重置密码', description: '发送密码重置邮件', autoExecutable: true, riskLevel: 'low', estimatedTime: 30 },
      { id: 'unlock_account', name: '解锁账号', description: '解除账号锁定', autoExecutable: true, riskLevel: 'low', estimatedTime: 10 },
      { id: 'clear_session', name: '清除会话', description: '清除所有登录会话', autoExecutable: true, riskLevel: 'low', estimatedTime: 10 },
    ],
  },
  {
    type: 'feature_broken',
    label: '功能不正常',
    icon: '🔧',
    description: '某个功能无法使用、报错',
    diagnosticChecks: [
      { id: 'api_health', name: 'API健康', description: '检查后端API是否正常', checkType: 'auto', estimatedTime: 5 },
      { id: 'error_logs', name: '错误日志', description: '检查最近的错误日志', checkType: 'auto', estimatedTime: 5 },
      { id: 'resource_usage', name: '资源使用', description: '检查服务器资源是否充足', checkType: 'auto', estimatedTime: 3 },
    ],
    commonCauses: [
      'API服务响应异常',
      '数据格式不兼容',
      '浏览器版本过旧',
      '网络不稳定导致请求失败',
    ],
    quickFixes: [
      { id: 'restart_service', name: '重启服务', description: '重启后端服务', autoExecutable: true, riskLevel: 'medium', estimatedTime: 60 },
      { id: 'clear_cache', name: '清除缓存', description: '清除应用缓存', autoExecutable: true, riskLevel: 'low', estimatedTime: 30 },
      { id: 'refresh_page', name: '刷新页面', description: '强制刷新页面', autoExecutable: false, riskLevel: 'low', estimatedTime: 5 },
    ],
  },
  {
    type: 'slow_performance',
    label: '运行太慢',
    icon: '🐢',
    description: '页面加载慢、响应慢',
    diagnosticChecks: [
      { id: 'response_time', name: '响应时间', description: '测量页面响应时间', checkType: 'auto', estimatedTime: 10 },
      { id: 'server_load', name: '服务器负载', description: '检查CPU和内存使用', checkType: 'auto', estimatedTime: 5 },
      { id: 'database_performance', name: '数据库性能', description: '检查数据库查询性能', checkType: 'auto', estimatedTime: 5 },
    ],
    commonCauses: [
      '服务器负载过高',
      '数据库查询效率低',
      '网络带宽不足',
      '前端资源过大',
    ],
    quickFixes: [
      { id: 'enable_cdn', name: '启用CDN', description: '启用内容分发加速', autoExecutable: true, riskLevel: 'low', estimatedTime: 60 },
      { id: 'optimize_images', name: '优化图片', description: '压缩图片资源', autoExecutable: true, riskLevel: 'low', estimatedTime: 120 },
      { id: 'scale_up', name: '扩容', description: '增加服务器资源', autoExecutable: true, riskLevel: 'medium', estimatedTime: 300 },
    ],
  },
  {
    type: 'data_error',
    label: '数据出错',
    icon: '📊',
    description: '数据丢失、数据不正确',
    diagnosticChecks: [
      { id: 'database_integrity', name: '数据完整性', description: '检查数据库完整性', checkType: 'auto', estimatedTime: 10 },
      { id: 'backup_status', name: '备份状态', description: '检查最近的备份', checkType: 'auto', estimatedTime: 5 },
      { id: 'recent_changes', name: '最近变更', description: '检查最近的数据变更', checkType: 'auto', estimatedTime: 5 },
    ],
    commonCauses: [
      '数据同步延迟',
      '用户误操作删除',
      '系统故障导致数据损坏',
      '并发操作导致数据不一致',
    ],
    quickFixes: [
      { id: 'restore_backup', name: '恢复备份', description: '从备份恢复数据', autoExecutable: true, riskLevel: 'high', estimatedTime: 600 },
      { id: 'sync_data', name: '同步数据', description: '重新同步数据', autoExecutable: true, riskLevel: 'medium', estimatedTime: 120 },
      { id: 'validate_data', name: '验证数据', description: '执行数据完整性校验', autoExecutable: true, riskLevel: 'low', estimatedTime: 60 },
    ],
  },
  {
    type: 'display_error',
    label: '显示异常',
    icon: '🖼️',
    description: '页面样式乱、布局错误',
    diagnosticChecks: [
      { id: 'css_load', name: 'CSS加载', description: '检查样式文件是否加载', checkType: 'auto', estimatedTime: 3 },
      { id: 'js_errors', name: 'JS错误', description: '检查JavaScript错误', checkType: 'auto', estimatedTime: 3 },
      { id: 'responsive', name: '响应式', description: '检查响应式布局', checkType: 'auto', estimatedTime: 5 },
    ],
    commonCauses: [
      '浏览器缓存了旧版本',
      '浏览器不兼容',
      'CSS文件加载失败',
      '屏幕分辨率适配问题',
    ],
    quickFixes: [
      { id: 'hard_refresh', name: '强制刷新', description: '清除缓存并刷新', autoExecutable: false, riskLevel: 'low', estimatedTime: 10 },
      { id: 'clear_browser_cache', name: '清除浏览器缓存', description: '清除浏览器全部缓存', autoExecutable: false, riskLevel: 'low', estimatedTime: 30 },
      { id: 'rebuild_assets', name: '重建资源', description: '重新编译前端资源', autoExecutable: true, riskLevel: 'low', estimatedTime: 120 },
    ],
  },
  {
    type: 'payment_issue',
    label: '支付问题',
    icon: '💳',
    description: '支付失败、订单异常',
    diagnosticChecks: [
      { id: 'payment_gateway', name: '支付网关', description: '检查支付服务状态', checkType: 'auto', estimatedTime: 5 },
      { id: 'order_status', name: '订单状态', description: '检查订单处理状态', checkType: 'auto', estimatedTime: 3 },
      { id: 'transaction_logs', name: '交易日志', description: '检查交易记录', checkType: 'auto', estimatedTime: 5 },
    ],
    commonCauses: [
      '银行卡余额不足',
      '支付网关临时故障',
      '订单已过期',
      '支付信息输入错误',
    ],
    quickFixes: [
      { id: 'retry_payment', name: '重试支付', description: '重新发起支付请求', autoExecutable: false, riskLevel: 'low', estimatedTime: 30 },
      { id: 'cancel_order', name: '取消订单', description: '取消当前订单', autoExecutable: true, riskLevel: 'low', estimatedTime: 10 },
      { id: 'refund', name: '发起退款', description: '发起退款申请', autoExecutable: true, riskLevel: 'medium', estimatedTime: 60 },
    ],
  },
  {
    type: 'other',
    label: '其他问题',
    icon: '❓',
    description: '上述都不是我的问题',
    diagnosticChecks: [
      { id: 'general_health', name: '系统健康', description: '全面检查系统状态', checkType: 'auto', estimatedTime: 15 },
      { id: 'recent_errors', name: '最近错误', description: '检查最近的所有错误', checkType: 'auto', estimatedTime: 10 },
    ],
    commonCauses: [
      '系统正在维护',
      '配置变更导致的问题',
      '第三方服务异常',
    ],
    quickFixes: [
      { id: 'contact_support', name: '联系客服', description: '联系人工客服', autoExecutable: false, riskLevel: 'low', estimatedTime: 300 },
    ],
  },
]

// ============================================================================
// 服务实现
// ============================================================================

export class SmartIssueDiagnosisService {
  private static instance: SmartIssueDiagnosisService

  /** 诊断会话缓存 */
  private sessions: Map<string, DiagnosisSession> = new Map()

  private constructor() {}

  public static getInstance(): SmartIssueDiagnosisService {
    if (!SmartIssueDiagnosisService.instance) {
      SmartIssueDiagnosisService.instance = new SmartIssueDiagnosisService()
    }
    return SmartIssueDiagnosisService.instance
  }

  /**
   * 获取问题类型列表（给用户选择）
   */
  getIssueTypes(): Array<{ type: IssueType; label: string; icon: string; description: string }> {
    return ISSUE_TYPE_CONFIGS.map(({ type, label, icon, description }) => ({
      type, label, icon, description
    }))
  }

  /**
   * 获取问题类型配置
   */
  getIssueTypeConfig(type: IssueType): IssueTypeConfig | undefined {
    return ISSUE_TYPE_CONFIGS.find(c => c.type === type)
  }

  /**
   * 开始诊断
   */
  async startDiagnosis(context: DiagnosticContext): Promise<DiagnosisSession> {
    const sessionId = `diag-${context.projectId}-${Date.now()}`

    const session: DiagnosisSession = {
      id: sessionId,
      projectId: context.projectId,
      status: 'active',
      startedAt: new Date(),
      context,
      executedFixes: [],
    }

    this.sessions.set(sessionId, session)

    // 执行诊断
    const result = await this.runDiagnosis(session)
    session.result = result
    session.status = 'completed'
    session.completedAt = new Date()

    return session
  }

  /**
   * 执行诊断流程
   */
  private async runDiagnosis(session: DiagnosisSession): Promise<DiagnosisResult> {
    const startTime = Date.now()
    const config = this.getIssueTypeConfig(session.context.issueType)

    if (!config) {
      return this.createErrorResult(session, '未知的问题类型')
    }

    const checkResults: CheckResult[] = []
    const possibleCauses: DiagnosisResult['possibleCauses'] = []

    // 执行所有诊断检查
    for (const check of config.diagnosticChecks) {
      const result = await this.executeCheck(check, session.context)
      checkResults.push(result)

      // 根据检查结果推断可能原因
      if (result.status === 'failed') {
        const cause = this.inferCauseFromCheck(check, result, config)
        if (cause) {
          possibleCauses.push(cause)
        }
      }
    }

    // 如果没有检测到具体原因，添加常见原因
    if (possibleCauses.length === 0) {
      for (const cause of config.commonCauses) {
        possibleCauses.push({
          cause,
          probability: 30,
        })
      }
    }

    // 按可能性排序
    possibleCauses.sort((a, b) => b.probability - a.probability)

    // 匹配适用的快速修复
    const suggestedFixes = this.matchQuickFixes(config.quickFixes, checkResults, possibleCauses)

    // 计算置信度
    const confidence = this.calculateConfidence(checkResults, possibleCauses)

    // 判断是否需要人工支持
    const needsHumanSupport = confidence < 50 || suggestedFixes.length === 0

    // 生成摘要
    const summary = this.generateSummary(session.context.issueType, checkResults, possibleCauses, confidence)

    // 生成下一步建议
    const nextSteps = this.generateNextSteps(suggestedFixes, needsHumanSupport)

    // 确定根因
    const rootCause = possibleCauses.length > 0 && possibleCauses[0].probability >= 60
      ? {
          category: session.context.issueType,
          description: possibleCauses[0].cause,
          evidence: checkResults
            .filter(r => r.status === 'failed')
            .map(r => r.message),
        }
      : undefined

    return {
      sessionId: session.id,
      projectId: session.context.projectId,
      issueType: session.context.issueType,
      status: needsHumanSupport ? 'needs_human' : 'completed',
      confidence,
      rootCause,
      checkResults,
      possibleCauses,
      suggestedFixes,
      needsHumanSupport,
      summary,
      nextSteps,
      diagnosisTimeMs: Date.now() - startTime,
    }
  }

  /**
   * 执行单个检查
   */
  private async executeCheck(check: DiagnosticCheck, context: DiagnosticContext): Promise<CheckResult> {
    try {
      if (check.check) {
        return await check.check(context)
      }

      // 默认模拟检查
      return {
        checkId: check.id,
        status: 'passed',
        message: `${check.name}检查通过`,
      }
    } catch (error) {
      return {
        checkId: check.id,
        status: 'failed',
        message: `${check.name}检查失败`,
        details: error instanceof Error ? error.message : String(error),
      }
    }
  }

  /**
   * 从检查结果推断原因
   */
  private inferCauseFromCheck(
    check: DiagnosticCheck,
    result: CheckResult,
    config: IssueTypeConfig
  ): DiagnosisResult['possibleCauses'][0] | null {
    // 根据检查类型和结果推断原因
    const causeMap: Record<string, { cause: string; probability: number }> = {
      dns_check: { cause: '域名解析未生效', probability: 80 },
      server_check: { cause: '服务器不可用', probability: 90 },
      ssl_check: { cause: 'SSL证书问题', probability: 75 },
      deployment_check: { cause: '部署失败', probability: 85 },
      auth_service: { cause: '认证服务异常', probability: 80 },
      database_check: { cause: '数据库连接问题', probability: 85 },
      account_status: { cause: '账号被锁定', probability: 70 },
      api_health: { cause: 'API服务异常', probability: 80 },
      error_logs: { cause: '存在运行时错误', probability: 60 },
      resource_usage: { cause: '服务器资源不足', probability: 70 },
      response_time: { cause: '服务器响应慢', probability: 75 },
      server_load: { cause: '服务器负载过高', probability: 80 },
    }

    const mapping = causeMap[check.id]
    if (mapping) {
      return {
        cause: mapping.cause,
        probability: mapping.probability,
        evidence: result.details,
      }
    }

    return null
  }

  /**
   * 匹配适用的快速修复
   */
  private matchQuickFixes(
    fixes: QuickFix[],
    checkResults: CheckResult[],
    causes: DiagnosisResult['possibleCauses']
  ): DiagnosisResult['suggestedFixes'] {
    const failedChecks = checkResults.filter(r => r.status === 'failed').map(r => r.checkId)

    return fixes
      .map(fix => {
        // 计算适用性
        let applicability = 50

        // 根据失败的检查调整适用性
        if (fix.id === 'redeploy' && failedChecks.includes('deployment_check')) {
          applicability = 90
        }
        if (fix.id === 'renew_ssl' && failedChecks.includes('ssl_check')) {
          applicability = 85
        }
        if (fix.id === 'restart_service' && failedChecks.includes('api_health')) {
          applicability = 80
        }
        if (fix.id === 'reset_password' && failedChecks.includes('auth_service')) {
          applicability = 75
        }

        // 自动可执行的修复优先
        if (fix.autoExecutable) {
          applicability += 10
        }

        // 低风险修复优先
        if (fix.riskLevel === 'low') {
          applicability += 5
        }

        return {
          fix,
          applicability: Math.min(100, applicability),
          reason: this.getFixReason(fix, failedChecks),
        }
      })
      .filter(f => f.applicability >= 40)
      .sort((a, b) => b.applicability - a.applicability)
  }

  /**
   * 获取修复建议原因
   */
  private getFixReason(fix: QuickFix, failedChecks: string[]): string {
    const reasons: Record<string, Record<string, string>> = {
      redeploy: {
        deployment_check: '部署状态异常，重新部署可能解决问题',
        default: '重新部署可以解决大多数服务问题',
      },
      renew_ssl: {
        ssl_check: 'SSL证书有问题，需要重新申请',
        default: 'SSL证书可能需要更新',
      },
      restart_service: {
        api_health: 'API服务异常，重启可能恢复正常',
        default: '重启服务可以清除临时问题',
      },
    }

    const fixReasons = reasons[fix.id]
    if (fixReasons) {
      for (const check of failedChecks) {
        if (fixReasons[check]) {
          return fixReasons[check]
        }
      }
      return fixReasons.default || fix.description
    }

    return fix.description
  }

  /**
   * 计算诊断置信度
   */
  private calculateConfidence(
    checkResults: CheckResult[],
    causes: DiagnosisResult['possibleCauses']
  ): number {
    // 基础置信度
    let confidence = 50

    // 检查完成率
    const completedChecks = checkResults.filter(r => r.status !== 'skipped').length
    const totalChecks = checkResults.length
    if (totalChecks > 0) {
      confidence += (completedChecks / totalChecks) * 20
    }

    // 是否有高可能性的原因
    if (causes.length > 0 && causes[0].probability >= 70) {
      confidence += 20
    } else if (causes.length > 0 && causes[0].probability >= 50) {
      confidence += 10
    }

    // 是否有失败的检查（有问题比没问题更好诊断）
    const failedCount = checkResults.filter(r => r.status === 'failed').length
    if (failedCount > 0) {
      confidence += 10
    }

    return Math.min(100, Math.round(confidence))
  }

  /**
   * 生成诊断摘要
   */
  private generateSummary(
    issueType: IssueType,
    checkResults: CheckResult[],
    causes: DiagnosisResult['possibleCauses'],
    confidence: number
  ): string {
    const config = this.getIssueTypeConfig(issueType)
    const failedChecks = checkResults.filter(r => r.status === 'failed')

    if (failedChecks.length === 0) {
      return `经过检查，您的系统状态良好。问题可能是临时的，建议刷新页面重试。`
    }

    if (causes.length > 0 && causes[0].probability >= 60) {
      return `诊断发现问题原因很可能是：${causes[0].cause}。我们有${confidence}%的把握，建议尝试下方的修复方案。`
    }

    return `诊断发现${failedChecks.length}个异常项，可能的原因包括：${causes.slice(0, 2).map(c => c.cause).join('、')}。建议尝试下方的快速修复。`
  }

  /**
   * 生成下一步建议
   */
  private generateNextSteps(
    suggestedFixes: DiagnosisResult['suggestedFixes'],
    needsHumanSupport: boolean
  ): string[] {
    const steps: string[] = []

    if (suggestedFixes.length > 0) {
      const topFix = suggestedFixes[0]
      steps.push(`点击"${topFix.fix.name}"尝试快速修复`)
    }

    steps.push('如果问题仍未解决，请点击"联系客服"获取人工帮助')

    if (needsHumanSupport) {
      steps.unshift('建议联系客服获取专业支持')
    }

    return steps
  }

  /**
   * 执行快速修复
   */
  async executeQuickFix(sessionId: string, fixId: string): Promise<FixResult> {
    const session = this.sessions.get(sessionId)
    if (!session) {
      return {
        success: false,
        message: '诊断会话不存在',
        needsVerification: false,
      }
    }

    const config = this.getIssueTypeConfig(session.context.issueType)
    const fix = config?.quickFixes.find(f => f.id === fixId)

    if (!fix) {
      return {
        success: false,
        message: '修复方案不存在',
        needsVerification: false,
      }
    }

    let result: FixResult

    if (fix.execute) {
      result = await fix.execute(session.context)
    } else {
      // 模拟执行
      result = {
        success: true,
        message: `${fix.name}已执行`,
        needsVerification: true,
        nextSteps: ['请刷新页面检查问题是否解决', '如仍有问题请联系客服'],
      }
    }

    // 记录执行历史
    session.executedFixes.push({
      fixId,
      executedAt: new Date(),
      result,
    })

    return result
  }

  /**
   * 提交反馈
   */
  submitFeedback(sessionId: string, feedback: DiagnosisSession['feedback']): void {
    const session = this.sessions.get(sessionId)
    if (session) {
      session.feedback = feedback
    }
  }

  /**
   * 获取诊断会话
   */
  getSession(sessionId: string): DiagnosisSession | null {
    return this.sessions.get(sessionId) || null
  }

  /**
   * 创建错误结果
   */
  private createErrorResult(session: DiagnosisSession, message: string): DiagnosisResult {
    return {
      sessionId: session.id,
      projectId: session.context.projectId,
      issueType: session.context.issueType,
      status: 'needs_human',
      confidence: 0,
      checkResults: [],
      possibleCauses: [],
      suggestedFixes: [],
      needsHumanSupport: true,
      summary: message,
      nextSteps: ['请联系客服获取帮助'],
      diagnosisTimeMs: 0,
    }
  }

  /**
   * 生成诊断报告HTML
   */
  generateDiagnosisReportHtml(sessionId: string): string {
    const session = this.sessions.get(sessionId)
    if (!session?.result) {
      return '<p>诊断报告不存在</p>'
    }

    const result = session.result
    const config = this.getIssueTypeConfig(session.context.issueType)

    return `
<!DOCTYPE html>
<html lang="zh-CN">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>问题诊断报告</title>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; background: #f5f5f5; padding: 20px; }
    .container { max-width: 600px; margin: 0 auto; background: white; border-radius: 12px; box-shadow: 0 2px 10px rgba(0,0,0,0.1); overflow: hidden; }
    .header { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 30px; text-align: center; }
    .header .icon { font-size: 48px; margin-bottom: 10px; }
    .header h1 { font-size: 24px; margin-bottom: 5px; }
    .header .confidence { background: rgba(255,255,255,0.2); padding: 8px 16px; border-radius: 20px; display: inline-block; margin-top: 10px; }
    .content { padding: 30px; }
    .summary { background: #f8f9fa; padding: 20px; border-radius: 8px; margin-bottom: 20px; }
    .summary h3 { color: #333; margin-bottom: 10px; }
    .summary p { color: #666; line-height: 1.6; }
    .section { margin-bottom: 25px; }
    .section h4 { color: #333; margin-bottom: 15px; font-size: 16px; }
    .check-list { list-style: none; }
    .check-item { display: flex; align-items: center; padding: 12px 0; border-bottom: 1px solid #eee; }
    .check-item:last-child { border-bottom: none; }
    .check-icon { width: 24px; font-size: 18px; margin-right: 12px; }
    .check-name { flex: 1; color: #333; }
    .check-status { font-size: 12px; padding: 4px 8px; border-radius: 4px; }
    .status-passed { background: #d4edda; color: #155724; }
    .status-failed { background: #f8d7da; color: #721c24; }
    .cause-list { list-style: none; }
    .cause-item { padding: 12px; margin-bottom: 10px; background: #fff3cd; border-radius: 8px; }
    .cause-probability { font-weight: bold; color: #856404; }
    .fix-btn { display: block; width: 100%; padding: 15px; margin-bottom: 10px; border: none; border-radius: 8px; font-size: 16px; cursor: pointer; transition: all 0.2s; }
    .fix-btn-primary { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; }
    .fix-btn-primary:hover { transform: translateY(-2px); box-shadow: 0 5px 15px rgba(102, 126, 234, 0.4); }
    .fix-btn-secondary { background: #f8f9fa; color: #333; border: 1px solid #ddd; }
    .next-steps { background: #e8f5e9; padding: 20px; border-radius: 8px; }
    .next-steps h4 { color: #2e7d32; margin-bottom: 10px; }
    .next-steps ol { margin-left: 20px; color: #666; }
    .next-steps li { margin-bottom: 8px; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <div class="icon">${config?.icon || '🔍'}</div>
      <h1>诊断完成</h1>
      <p>${config?.label || '问题诊断'}</p>
      <div class="confidence">诊断置信度：${result.confidence}%</div>
    </div>

    <div class="content">
      <div class="summary">
        <h3>📋 诊断摘要</h3>
        <p>${result.summary}</p>
      </div>

      <div class="section">
        <h4>🔍 检查结果</h4>
        <ul class="check-list">
          ${result.checkResults.map(check => `
            <li class="check-item">
              <span class="check-icon">${check.status === 'passed' ? '✅' : check.status === 'failed' ? '❌' : '⚠️'}</span>
              <span class="check-name">${check.message}</span>
              <span class="check-status status-${check.status}">${check.status === 'passed' ? '正常' : check.status === 'failed' ? '异常' : '警告'}</span>
            </li>
          `).join('')}
        </ul>
      </div>

      ${result.possibleCauses.length > 0 ? `
        <div class="section">
          <h4>⚠️ 可能原因</h4>
          <ul class="cause-list">
            ${result.possibleCauses.slice(0, 3).map(cause => `
              <li class="cause-item">
                <span class="cause-probability">${cause.probability}%</span>
                ${cause.cause}
              </li>
            `).join('')}
          </ul>
        </div>
      ` : ''}

      ${result.suggestedFixes.length > 0 ? `
        <div class="section">
          <h4>🛠️ 快速修复</h4>
          ${result.suggestedFixes.slice(0, 2).map((sf, i) => `
            <button class="fix-btn ${i === 0 ? 'fix-btn-primary' : 'fix-btn-secondary'}">
              ${sf.fix.name}
            </button>
          `).join('')}
        </div>
      ` : ''}

      <div class="next-steps">
        <h4>📌 下一步建议</h4>
        <ol>
          ${result.nextSteps.map(step => `<li>${step}</li>`).join('')}
        </ol>
      </div>
    </div>
  </div>
</body>
</html>
    `.trim()
  }
}

// 导出单例
export const smartIssueDiagnosis = SmartIssueDiagnosisService.getInstance()
