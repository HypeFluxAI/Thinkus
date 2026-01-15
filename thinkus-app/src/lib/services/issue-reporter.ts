/**
 * 一键报障和智能诊断服务
 * 为小白用户提供简单的问题反馈和自动诊断
 */

import { translateError, TranslatedError } from './error-translator'
import { statusAggregator, ProjectStatusInput } from './status-aggregator'
import { SimpleStatus, AggregatedStatus } from '../config/simple-status'

/**
 * 问题类型
 */
export type IssueType =
  | 'cannot_access'      // 无法访问
  | 'login_failed'       // 登录失败
  | 'feature_broken'     // 功能异常
  | 'slow_performance'   // 速度慢
  | 'data_lost'          // 数据丢失
  | 'display_error'      // 显示错误
  | 'payment_issue'      // 支付问题
  | 'other'              // 其他问题

/**
 * 问题严重程度
 */
export type IssueSeverity = 'low' | 'medium' | 'high' | 'critical'

/**
 * 诊断结果
 */
export interface DiagnosisResult {
  /** 诊断ID */
  id: string
  /** 问题可能的原因 */
  possibleCauses: DiagnosisCause[]
  /** 自动修复建议 */
  autoFixSuggestions: AutoFixSuggestion[]
  /** 手动修复步骤 */
  manualFixSteps: string[]
  /** 是否可以自动修复 */
  canAutoFix: boolean
  /** 预计修复时间（分钟） */
  estimatedFixTime: number
  /** 是否需要人工介入 */
  needsHumanSupport: boolean
  /** 诊断时间 */
  diagnosedAt: Date
}

/**
 * 可能的原因
 */
export interface DiagnosisCause {
  cause: string
  probability: number  // 0-100
  category: string
}

/**
 * 自动修复建议
 */
export interface AutoFixSuggestion {
  id: string
  title: string
  description: string
  action: 'restart' | 'clear_cache' | 'retry' | 'reconnect' | 'reset' | 'contact_support'
  confidence: number  // 0-100
}

/**
 * 问题报告
 */
export interface IssueReport {
  /** 报告ID */
  id: string
  /** 项目ID */
  projectId: string
  /** 用户ID */
  userId: string
  /** 问题类型 */
  type: IssueType
  /** 用户描述 */
  description: string
  /** 严重程度 */
  severity: IssueSeverity
  /** 系统自动收集的信息 */
  systemInfo: SystemInfo
  /** 诊断结果 */
  diagnosis?: DiagnosisResult
  /** 截图URL列表 */
  screenshots?: string[]
  /** 状态 */
  status: 'open' | 'diagnosing' | 'fixing' | 'resolved' | 'escalated'
  /** 创建时间 */
  createdAt: Date
  /** 更新时间 */
  updatedAt: Date
}

/**
 * 系统信息（自动收集）
 */
export interface SystemInfo {
  /** 浏览器信息 */
  browser?: string
  /** 操作系统 */
  os?: string
  /** 屏幕分辨率 */
  screenResolution?: string
  /** 网络状态 */
  networkStatus?: 'online' | 'offline' | 'slow'
  /** 当前页面URL */
  currentUrl?: string
  /** 最近的错误日志 */
  recentErrors?: TranslatedError[]
  /** 项目状态 */
  projectStatus?: AggregatedStatus
  /** 时间戳 */
  timestamp: Date
}

/**
 * 问题类型配置
 */
export const ISSUE_TYPE_CONFIG: Record<IssueType, {
  label: string
  icon: string
  description: string
  defaultSeverity: IssueSeverity
  commonCauses: string[]
  quickFixes: string[]
}> = {
  cannot_access: {
    label: '无法访问',
    icon: '🚫',
    description: '网站打不开或显示错误',
    defaultSeverity: 'high',
    commonCauses: ['网络连接问题', '服务器维护', '域名解析失败', 'SSL证书问题'],
    quickFixes: ['检查网络连接', '清除浏览器缓存', '尝试其他浏览器', '稍后重试']
  },
  login_failed: {
    label: '登录失败',
    icon: '🔐',
    description: '无法登录账号',
    defaultSeverity: 'medium',
    commonCauses: ['密码错误', '账号不存在', '账号被锁定', '验证码过期'],
    quickFixes: ['检查账号密码', '重置密码', '清除缓存后重试', '等待10分钟解锁']
  },
  feature_broken: {
    label: '功能异常',
    icon: '⚠️',
    description: '某个功能不正常工作',
    defaultSeverity: 'medium',
    commonCauses: ['服务器错误', '浏览器兼容性', '缓存问题', '网络不稳定'],
    quickFixes: ['刷新页面', '清除缓存', '换个浏览器', '稍后重试']
  },
  slow_performance: {
    label: '速度很慢',
    icon: '🐢',
    description: '加载或操作速度慢',
    defaultSeverity: 'low',
    commonCauses: ['网络慢', '服务器负载高', '浏览器资源占用高', '数据量大'],
    quickFixes: ['检查网络速度', '关闭其他标签页', '稍后重试', '使用WiFi']
  },
  data_lost: {
    label: '数据丢失',
    icon: '📭',
    description: '找不到之前的数据',
    defaultSeverity: 'critical',
    commonCauses: ['误删除', '筛选条件问题', '同步延迟', '数据迁移'],
    quickFixes: ['检查筛选条件', '查看回收站', '等待同步完成', '联系客服恢复']
  },
  display_error: {
    label: '显示错误',
    icon: '🖼️',
    description: '页面显示不正常',
    defaultSeverity: 'low',
    commonCauses: ['缓存问题', '浏览器兼容性', 'CSS加载失败', '分辨率问题'],
    quickFixes: ['强制刷新(Ctrl+F5)', '清除缓存', '调整缩放比例', '换个浏览器']
  },
  payment_issue: {
    label: '支付问题',
    icon: '💳',
    description: '支付失败或异常',
    defaultSeverity: 'high',
    commonCauses: ['银行卡问题', '余额不足', '网络中断', '订单超时'],
    quickFixes: ['检查银行卡状态', '更换支付方式', '重新下单', '联系银行']
  },
  other: {
    label: '其他问题',
    icon: '❓',
    description: '其他类型的问题',
    defaultSeverity: 'medium',
    commonCauses: ['未知原因'],
    quickFixes: ['描述详细问题', '提供截图', '联系客服']
  }
}

/**
 * 诊断规则
 */
interface DiagnosisRule {
  condition: (info: SystemInfo, issueType: IssueType) => boolean
  cause: string
  probability: number
  category: string
  autoFix?: AutoFixSuggestion
}

/**
 * 诊断规则库
 */
const DIAGNOSIS_RULES: DiagnosisRule[] = [
  // 网络相关
  {
    condition: (info) => info.networkStatus === 'offline',
    cause: '网络已断开',
    probability: 95,
    category: 'network',
    autoFix: {
      id: 'check_network',
      title: '检查网络连接',
      description: '请检查您的网络连接，连接后自动重试',
      action: 'reconnect',
      confidence: 90
    }
  },
  {
    condition: (info) => info.networkStatus === 'slow',
    cause: '网络连接缓慢',
    probability: 80,
    category: 'network',
    autoFix: {
      id: 'wait_retry',
      title: '等待网络恢复',
      description: '网络较慢，建议稍后重试',
      action: 'retry',
      confidence: 70
    }
  },
  // 错误日志相关
  {
    condition: (info) => {
      const errors = info.recentErrors || []
      return errors.some(e => e.error.category === 'database')
    },
    cause: '数据库服务异常',
    probability: 85,
    category: 'database',
    autoFix: {
      id: 'auto_reconnect',
      title: '自动重连数据库',
      description: '系统正在自动重新连接数据库',
      action: 'reconnect',
      confidence: 80
    }
  },
  {
    condition: (info) => {
      const errors = info.recentErrors || []
      return errors.some(e => e.error.category === 'auth')
    },
    cause: '登录状态已过期',
    probability: 90,
    category: 'auth',
    autoFix: {
      id: 'relogin',
      title: '重新登录',
      description: '您的登录已过期，请重新登录',
      action: 'reset',
      confidence: 95
    }
  },
  // 项目状态相关
  {
    condition: (info) => info.projectStatus?.overall === 'error',
    cause: '服务状态异常',
    probability: 90,
    category: 'service',
    autoFix: {
      id: 'auto_restart',
      title: '尝试重启服务',
      description: '系统将尝试自动重启相关服务',
      action: 'restart',
      confidence: 75
    }
  },
  // 缓存相关
  {
    condition: (info, type) => type === 'display_error',
    cause: '浏览器缓存问题',
    probability: 70,
    category: 'cache',
    autoFix: {
      id: 'clear_cache',
      title: '清除缓存',
      description: '清除浏览器缓存后刷新页面',
      action: 'clear_cache',
      confidence: 80
    }
  }
]

/**
 * 一键报障服务类
 */
export class IssueReporterService {
  private static instance: IssueReporterService

  /** 支持邮箱 */
  private readonly SUPPORT_EMAIL = process.env.SUPPORT_EMAIL || 'support@thinkus.app'

  private constructor() {}

  public static getInstance(): IssueReporterService {
    if (!IssueReporterService.instance) {
      IssueReporterService.instance = new IssueReporterService()
    }
    return IssueReporterService.instance
  }

  /**
   * 创建问题报告
   */
  async createReport(params: {
    projectId: string
    userId: string
    type: IssueType
    description: string
    screenshots?: string[]
    systemInfo?: Partial<SystemInfo>
  }): Promise<IssueReport> {
    const id = `issue-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`
    const now = new Date()

    const typeConfig = ISSUE_TYPE_CONFIG[params.type]

    // 收集系统信息
    const systemInfo: SystemInfo = {
      ...params.systemInfo,
      timestamp: now
    }

    // 执行诊断
    const diagnosis = await this.diagnose(params.type, systemInfo)

    // 根据诊断结果调整严重程度
    let severity = typeConfig.defaultSeverity
    if (diagnosis.needsHumanSupport) {
      severity = 'high'
    }
    if (params.type === 'data_lost') {
      severity = 'critical'
    }

    const report: IssueReport = {
      id,
      projectId: params.projectId,
      userId: params.userId,
      type: params.type,
      description: params.description,
      severity,
      systemInfo,
      diagnosis,
      screenshots: params.screenshots,
      status: 'open',
      createdAt: now,
      updatedAt: now
    }

    return report
  }

  /**
   * 智能诊断
   */
  async diagnose(issueType: IssueType, systemInfo: SystemInfo): Promise<DiagnosisResult> {
    const id = `diag-${Date.now()}`
    const possibleCauses: DiagnosisCause[] = []
    const autoFixSuggestions: AutoFixSuggestion[] = []

    // 应用诊断规则
    for (const rule of DIAGNOSIS_RULES) {
      if (rule.condition(systemInfo, issueType)) {
        possibleCauses.push({
          cause: rule.cause,
          probability: rule.probability,
          category: rule.category
        })
        if (rule.autoFix) {
          autoFixSuggestions.push(rule.autoFix)
        }
      }
    }

    // 添加问题类型的通用原因
    const typeConfig = ISSUE_TYPE_CONFIG[issueType]
    for (const cause of typeConfig.commonCauses) {
      if (!possibleCauses.some(c => c.cause === cause)) {
        possibleCauses.push({
          cause,
          probability: 50,
          category: 'general'
        })
      }
    }

    // 排序：按概率降序
    possibleCauses.sort((a, b) => b.probability - a.probability)
    autoFixSuggestions.sort((a, b) => b.confidence - a.confidence)

    // 生成手动修复步骤
    const manualFixSteps = typeConfig.quickFixes

    // 判断是否可以自动修复
    const canAutoFix = autoFixSuggestions.some(s => s.confidence >= 70)

    // 判断是否需要人工介入
    const needsHumanSupport =
      possibleCauses.length === 0 ||
      possibleCauses[0].probability < 60 ||
      issueType === 'data_lost' ||
      issueType === 'payment_issue'

    // 估算修复时间
    let estimatedFixTime = 5
    if (needsHumanSupport) {
      estimatedFixTime = 30
    } else if (canAutoFix) {
      estimatedFixTime = 2
    }

    return {
      id,
      possibleCauses,
      autoFixSuggestions,
      manualFixSteps,
      canAutoFix,
      estimatedFixTime,
      needsHumanSupport,
      diagnosedAt: new Date()
    }
  }

  /**
   * 执行自动修复
   */
  async executeAutoFix(
    suggestion: AutoFixSuggestion
  ): Promise<{ success: boolean; message: string }> {
    // 这里实际上会调用对应的修复逻辑
    // 目前返回模拟结果
    switch (suggestion.action) {
      case 'retry':
        return { success: true, message: '已自动重试，请检查是否恢复正常' }
      case 'clear_cache':
        return { success: true, message: '已清除缓存，请刷新页面' }
      case 'reconnect':
        return { success: true, message: '已尝试重新连接' }
      case 'restart':
        return { success: true, message: '已触发服务重启，请稍候' }
      case 'reset':
        return { success: true, message: '已重置相关状态' }
      case 'contact_support':
        return { success: false, message: '此问题需要人工处理，已通知客服' }
      default:
        return { success: false, message: '无法自动修复，请联系客服' }
    }
  }

  /**
   * 生成报告摘要（用于发送给客服）
   */
  generateReportSummary(report: IssueReport): string {
    const typeConfig = ISSUE_TYPE_CONFIG[report.type]

    const lines = [
      `【问题报告】#${report.id}`,
      ``,
      `📌 问题类型: ${typeConfig.icon} ${typeConfig.label}`,
      `⚠️ 严重程度: ${report.severity}`,
      `📝 用户描述: ${report.description}`,
      ``,
      `🔍 诊断结果:`,
      ...(report.diagnosis?.possibleCauses.slice(0, 3).map(
        c => `  - ${c.cause} (${c.probability}%概率)`
      ) || ['  无法确定原因']),
      ``,
      `💻 系统信息:`,
      `  - 浏览器: ${report.systemInfo.browser || '未知'}`,
      `  - 网络状态: ${report.systemInfo.networkStatus || '未知'}`,
      `  - 当前页面: ${report.systemInfo.currentUrl || '未知'}`,
      ``,
      `🕐 报告时间: ${report.createdAt.toLocaleString('zh-CN')}`,
      `📎 截图数量: ${report.screenshots?.length || 0}张`
    ]

    return lines.join('\n')
  }

  /**
   * 获取快速修复建议（用于用户界面）
   */
  getQuickFixSuggestions(issueType: IssueType): string[] {
    return ISSUE_TYPE_CONFIG[issueType].quickFixes
  }

  /**
   * 获取问题类型选项
   */
  getIssueTypeOptions(): { value: IssueType; label: string; icon: string; description: string }[] {
    return Object.entries(ISSUE_TYPE_CONFIG).map(([value, config]) => ({
      value: value as IssueType,
      label: config.label,
      icon: config.icon,
      description: config.description
    }))
  }
}

// 导出单例实例
export const issueReporter = IssueReporterService.getInstance()
