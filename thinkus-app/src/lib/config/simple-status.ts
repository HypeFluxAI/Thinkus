/**
 * 简化状态配置
 * 为小白用户提供红绿灯式的状态展示
 */

/**
 * 简化状态类型
 */
export type SimpleStatus = 'healthy' | 'attention' | 'error'

/**
 * 状态图标
 */
export const STATUS_ICONS: Record<SimpleStatus, string> = {
  healthy: '🟢',
  attention: '🟡',
  error: '🔴'
}

/**
 * 状态标签
 */
export const STATUS_LABELS: Record<SimpleStatus, string> = {
  healthy: '运行正常',
  attention: '需要关注',
  error: '出现问题'
}

/**
 * 状态颜色配置
 */
export const STATUS_COLORS: Record<SimpleStatus, {
  bg: string
  border: string
  text: string
  pulse: string
  gradient: string
}> = {
  healthy: {
    bg: 'bg-green-50 dark:bg-green-950/20',
    border: 'border-green-200 dark:border-green-800',
    text: 'text-green-700 dark:text-green-400',
    pulse: 'bg-green-500',
    gradient: 'from-green-500 to-emerald-500'
  },
  attention: {
    bg: 'bg-yellow-50 dark:bg-yellow-950/20',
    border: 'border-yellow-200 dark:border-yellow-800',
    text: 'text-yellow-700 dark:text-yellow-400',
    pulse: 'bg-yellow-500',
    gradient: 'from-yellow-500 to-amber-500'
  },
  error: {
    bg: 'bg-red-50 dark:bg-red-950/20',
    border: 'border-red-200 dark:border-red-800',
    text: 'text-red-700 dark:text-red-400',
    pulse: 'bg-red-500',
    gradient: 'from-red-500 to-rose-500'
  }
}

/**
 * 状态描述模板
 */
export const STATUS_DESCRIPTIONS: Record<SimpleStatus, {
  title: string
  subtitle: string
  emoji: string
}> = {
  healthy: {
    title: '一切正常',
    subtitle: '您的产品正在稳定运行中',
    emoji: '✨'
  },
  attention: {
    title: '需要注意',
    subtitle: '有一些小问题需要关注',
    emoji: '👀'
  },
  error: {
    title: '需要处理',
    subtitle: '遇到了一些问题，需要您的关注',
    emoji: '🔧'
  }
}

/**
 * 服务检查项配置
 */
export interface ServiceCheck {
  id: string
  name: string
  description: string
  icon: string
  category: ServiceCategory
  weight: number // 权重（用于计算整体状态）
  critical: boolean // 是否是关键服务
}

export type ServiceCategory =
  | 'infrastructure' // 基础设施
  | 'application'    // 应用服务
  | 'external'       // 外部服务
  | 'security'       // 安全相关

/**
 * 预定义的服务检查项
 */
export const SERVICE_CHECKS: ServiceCheck[] = [
  // 基础设施
  {
    id: 'deployment',
    name: '部署状态',
    description: '应用是否成功部署到服务器',
    icon: '🚀',
    category: 'infrastructure',
    weight: 30,
    critical: true
  },
  {
    id: 'database',
    name: '数据库',
    description: '数据库连接和响应状态',
    icon: '🗄️',
    category: 'infrastructure',
    weight: 25,
    critical: true
  },
  {
    id: 'domain',
    name: '域名/SSL',
    description: '域名解析和SSL证书状态',
    icon: '🌐',
    category: 'infrastructure',
    weight: 15,
    critical: true
  },
  // 应用服务
  {
    id: 'api',
    name: 'API服务',
    description: 'API接口响应状态',
    icon: '⚡',
    category: 'application',
    weight: 15,
    critical: true
  },
  {
    id: 'response_time',
    name: '响应速度',
    description: '页面加载和API响应时间',
    icon: '⏱️',
    category: 'application',
    weight: 10,
    critical: false
  },
  // 安全相关
  {
    id: 'error_rate',
    name: '错误率',
    description: '最近的错误发生频率',
    icon: '📊',
    category: 'security',
    weight: 5,
    critical: false
  }
]

/**
 * 检查项状态
 */
export interface CheckStatus {
  checkId: string
  status: SimpleStatus
  message: string
  value?: number | string
  lastChecked: Date
  details?: Record<string, unknown>
}

/**
 * 聚合状态结果
 */
export interface AggregatedStatus {
  /** 整体状态 */
  overall: SimpleStatus
  /** 健康度分数 (0-100) */
  score: number
  /** 各检查项状态 */
  checks: CheckStatus[]
  /** 需要关注的问题 */
  issues: StatusIssue[]
  /** 上次检查时间 */
  lastChecked: Date
  /** 连续正常天数 */
  uptimeDays: number
}

/**
 * 状态问题
 */
export interface StatusIssue {
  id: string
  severity: 'low' | 'medium' | 'high' | 'critical'
  title: string
  description: string
  suggestion: string
  canAutoFix: boolean
  affectedService: string
}

/**
 * 状态阈值配置
 */
export const STATUS_THRESHOLDS = {
  // 响应时间阈值 (毫秒)
  responseTime: {
    healthy: 500,      // < 500ms 正常
    attention: 2000,   // 500-2000ms 需要关注
    // > 2000ms 异常
  },
  // 错误率阈值 (百分比)
  errorRate: {
    healthy: 1,        // < 1% 正常
    attention: 5,      // 1-5% 需要关注
    // > 5% 异常
  },
  // 可用率阈值 (百分比)
  uptime: {
    healthy: 99.9,     // > 99.9% 正常
    attention: 99,     // 99-99.9% 需要关注
    // < 99% 异常
  },
  // 整体健康分数阈值
  overallScore: {
    healthy: 90,       // >= 90 正常
    attention: 70,     // 70-90 需要关注
    // < 70 异常
  }
}

/**
 * 根据分数计算状态
 */
export function getStatusFromScore(score: number): SimpleStatus {
  if (score >= STATUS_THRESHOLDS.overallScore.healthy) {
    return 'healthy'
  }
  if (score >= STATUS_THRESHOLDS.overallScore.attention) {
    return 'attention'
  }
  return 'error'
}

/**
 * 根据响应时间计算状态
 */
export function getStatusFromResponseTime(ms: number): SimpleStatus {
  if (ms <= STATUS_THRESHOLDS.responseTime.healthy) {
    return 'healthy'
  }
  if (ms <= STATUS_THRESHOLDS.responseTime.attention) {
    return 'attention'
  }
  return 'error'
}

/**
 * 根据错误率计算状态
 */
export function getStatusFromErrorRate(rate: number): SimpleStatus {
  if (rate <= STATUS_THRESHOLDS.errorRate.healthy) {
    return 'healthy'
  }
  if (rate <= STATUS_THRESHOLDS.errorRate.attention) {
    return 'attention'
  }
  return 'error'
}

/**
 * 合并多个状态（取最差的）
 */
export function mergeStatuses(statuses: SimpleStatus[]): SimpleStatus {
  if (statuses.includes('error')) return 'error'
  if (statuses.includes('attention')) return 'attention'
  return 'healthy'
}

/**
 * 状态操作按钮配置
 */
export interface StatusAction {
  id: string
  label: string
  icon: string
  variant: 'default' | 'outline' | 'destructive'
  /** 执行动作的类型 */
  actionType: 'auto_fix' | 'contact_support' | 'view_details' | 'refresh' | 'custom'
}

/**
 * 根据状态获取建议操作
 */
export function getStatusActions(status: SimpleStatus, hasIssues: boolean): StatusAction[] {
  const actions: StatusAction[] = []

  // 总是显示刷新按钮
  actions.push({
    id: 'refresh',
    label: '刷新状态',
    icon: '🔄',
    variant: 'outline',
    actionType: 'refresh'
  })

  if (status === 'healthy') {
    actions.push({
      id: 'view_details',
      label: '查看详情',
      icon: '📊',
      variant: 'outline',
      actionType: 'view_details'
    })
  }

  if (status === 'attention' && hasIssues) {
    actions.push({
      id: 'auto_fix',
      label: '一键修复',
      icon: '🔧',
      variant: 'default',
      actionType: 'auto_fix'
    })
  }

  if (status === 'error') {
    actions.push({
      id: 'auto_fix',
      label: '尝试修复',
      icon: '🔧',
      variant: 'default',
      actionType: 'auto_fix'
    })
    actions.push({
      id: 'contact_support',
      label: '联系客服',
      icon: '💬',
      variant: 'destructive',
      actionType: 'contact_support'
    })
  }

  return actions
}
