/**
 * 简化状态配置
 * 为小白用户提供红绿灯式的状态展示
 */

/**
 * 简化状态类型（红绿灯）
 */
export type SimpleStatus = 'healthy' | 'attention' | 'error'

/**
 * 状态图标
 */
export const STATUS_ICONS: Record<SimpleStatus, string> = {
  healthy: '🟢',
  attention: '🟡',
  error: '🔴',
}

/**
 * 状态标签
 */
export const STATUS_LABELS: Record<SimpleStatus, string> = {
  healthy: '运行正常',
  attention: '需要关注',
  error: '出现问题',
}

/**
 * 状态颜色
 */
export const STATUS_COLORS: Record<SimpleStatus, {
  bg: string
  text: string
  border: string
  ring: string
}> = {
  healthy: {
    bg: 'bg-green-50',
    text: 'text-green-700',
    border: 'border-green-200',
    ring: 'ring-green-500',
  },
  attention: {
    bg: 'bg-amber-50',
    text: 'text-amber-700',
    border: 'border-amber-200',
    ring: 'ring-amber-500',
  },
  error: {
    bg: 'bg-red-50',
    text: 'text-red-700',
    border: 'border-red-200',
    ring: 'ring-red-500',
  },
}

/**
 * 状态描述
 */
export const STATUS_DESCRIPTIONS: Record<SimpleStatus, {
  title: string
  subtitle: string
  emoji: string
}> = {
  healthy: {
    title: '一切正常',
    subtitle: '您的产品运行良好，无需任何操作',
    emoji: '✨',
  },
  attention: {
    title: '需要关注',
    subtitle: '有一些小问题需要您注意，但产品仍在运行',
    emoji: '👀',
  },
  error: {
    title: '出现问题',
    subtitle: '您的产品遇到了一些问题，我们正在处理',
    emoji: '🔧',
  },
}

/**
 * 服务检查类型
 */
export type ServiceCheckType =
  | 'deployment'      // 部署状态
  | 'database'        // 数据库状态
  | 'domain'          // 域名/SSL状态
  | 'api'             // API健康
  | 'response_time'   // 响应时间
  | 'error_rate'      // 错误率

/**
 * 服务检查配置
 */
export interface ServiceCheck {
  type: ServiceCheckType
  label: string
  description: string
  weight: number        // 权重 0-100
  isCritical: boolean   // 是否关键（关键服务异常直接红灯）
  thresholds: {
    healthy: number     // 健康阈值
    attention: number   // 警告阈值
  }
  unit?: string
}

/**
 * 服务检查配置列表
 */
export const SERVICE_CHECKS: ServiceCheck[] = [
  {
    type: 'deployment',
    label: '部署状态',
    description: '产品是否正常部署上线',
    weight: 30,
    isCritical: true,
    thresholds: {
      healthy: 1,    // 1 = 部署成功
      attention: 0,  // 0 = 部署中
    },
  },
  {
    type: 'database',
    label: '数据库',
    description: '数据库连接是否正常',
    weight: 25,
    isCritical: true,
    thresholds: {
      healthy: 1,    // 1 = 连接正常
      attention: 0,  // 0 = 连接中
    },
  },
  {
    type: 'domain',
    label: '域名与SSL',
    description: '域名解析和安全证书状态',
    weight: 15,
    isCritical: false,
    thresholds: {
      healthy: 1,    // 1 = 正常
      attention: 0,  // 0 = 配置中
    },
  },
  {
    type: 'api',
    label: 'API服务',
    description: 'API接口是否响应',
    weight: 15,
    isCritical: true,
    thresholds: {
      healthy: 1,    // 1 = 正常
      attention: 0,  // 0 = 偶发异常
    },
  },
  {
    type: 'response_time',
    label: '响应速度',
    description: '产品加载速度',
    weight: 10,
    isCritical: false,
    thresholds: {
      healthy: 1000,     // < 1秒为健康
      attention: 3000,   // < 3秒为警告
    },
    unit: 'ms',
  },
  {
    type: 'error_rate',
    label: '错误率',
    description: '最近24小时错误比例',
    weight: 5,
    isCritical: false,
    thresholds: {
      healthy: 1,      // < 1% 为健康
      attention: 5,    // < 5% 为警告
    },
    unit: '%',
  },
]

/**
 * 服务检查结果
 */
export interface ServiceCheckResult {
  type: ServiceCheckType
  status: SimpleStatus
  value: number
  message: string
  messageZh: string
  lastChecked: Date
}

/**
 * 聚合状态结果
 */
export interface AggregatedStatus {
  overall: SimpleStatus
  score: number           // 0-100 健康分数
  checks: ServiceCheckResult[]
  issues: string[]        // 问题列表
  uptimeDays: number      // 连续正常天数
  lastUpdated: Date
}

/**
 * 计算单个检查的状态
 */
export function calculateCheckStatus(
  check: ServiceCheck,
  value: number
): SimpleStatus {
  // 对于关键服务，0表示正常
  if (check.isCritical) {
    if (value === 1) return 'healthy'
    if (value === 0) return 'attention'
    return 'error'
  }

  // 对于响应时间等，数值越小越好
  if (check.type === 'response_time') {
    if (value <= check.thresholds.healthy) return 'healthy'
    if (value <= check.thresholds.attention) return 'attention'
    return 'error'
  }

  // 对于错误率，数值越小越好
  if (check.type === 'error_rate') {
    if (value <= check.thresholds.healthy) return 'healthy'
    if (value <= check.thresholds.attention) return 'attention'
    return 'error'
  }

  // 默认逻辑
  if (value >= check.thresholds.healthy) return 'healthy'
  if (value >= check.thresholds.attention) return 'attention'
  return 'error'
}

/**
 * 状态优先级（用于聚合）
 */
export const STATUS_PRIORITY: Record<SimpleStatus, number> = {
  error: 0,      // 最高优先级
  attention: 1,
  healthy: 2,    // 最低优先级
}

/**
 * 获取更严重的状态
 */
export function getWorseStatus(a: SimpleStatus, b: SimpleStatus): SimpleStatus {
  return STATUS_PRIORITY[a] < STATUS_PRIORITY[b] ? a : b
}

/**
 * 建议操作配置
 */
export interface StatusAction {
  label: string
  description: string
  type: 'auto_fix' | 'contact_support' | 'view_details' | 'retry'
  priority: number
}

/**
 * 根据状态获取建议操作
 */
export function getStatusActions(status: SimpleStatus): StatusAction[] {
  switch (status) {
    case 'healthy':
      return []
    case 'attention':
      return [
        {
          label: '查看详情',
          description: '了解具体情况',
          type: 'view_details',
          priority: 1,
        },
      ]
    case 'error':
      return [
        {
          label: '一键修复',
          description: '尝试自动修复问题',
          type: 'auto_fix',
          priority: 1,
        },
        {
          label: '联系客服',
          description: '获取人工帮助',
          type: 'contact_support',
          priority: 2,
        },
      ]
  }
}

/**
 * 状态变化通知配置
 */
export interface StatusNotification {
  from: SimpleStatus
  to: SimpleStatus
  channels: ('email' | 'sms' | 'in_app')[]
  priority: 'low' | 'normal' | 'high' | 'urgent'
  template: string
}

/**
 * 状态变化通知规则
 */
export const STATUS_NOTIFICATION_RULES: StatusNotification[] = [
  {
    from: 'healthy',
    to: 'error',
    channels: ['email', 'sms', 'in_app'],
    priority: 'urgent',
    template: 'status_down',
  },
  {
    from: 'healthy',
    to: 'attention',
    channels: ['in_app'],
    priority: 'normal',
    template: 'status_warning',
  },
  {
    from: 'error',
    to: 'healthy',
    channels: ['email', 'in_app'],
    priority: 'high',
    template: 'status_recovered',
  },
  {
    from: 'attention',
    to: 'healthy',
    channels: ['in_app'],
    priority: 'low',
    template: 'status_improved',
  },
]
