// 交付相关工具函数

import type {
  DeliveryStage,
  StageStatus,
  AcceptanceStatus,
  NotificationPriority,
  DiagnosisCategory,
  FixStrategy,
  TimeFormatOptions,
} from '@/types/delivery'

// ============ 时间格式化 ============

/**
 * 格式化持续时间 (毫秒 -> 人话)
 */
export function formatDuration(ms: number): string {
  if (ms < 0) return '已超时'

  const seconds = Math.floor(ms / 1000)
  const minutes = Math.floor(seconds / 60)
  const hours = Math.floor(minutes / 60)
  const days = Math.floor(hours / 24)

  if (days > 0) {
    return `${days}天${hours % 24}小时`
  }
  if (hours > 0) {
    return `${hours}小时${minutes % 60}分钟`
  }
  if (minutes > 0) {
    return `${minutes}分${seconds % 60}秒`
  }
  return `${seconds}秒`
}

/**
 * 格式化倒计时时间
 */
export function formatCountdown(ms: number, options?: { showSeconds?: boolean }): string {
  if (ms <= 0) return '00:00'

  const totalSeconds = Math.floor(ms / 1000)
  const hours = Math.floor(totalSeconds / 3600)
  const minutes = Math.floor((totalSeconds % 3600) / 60)
  const seconds = totalSeconds % 60

  if (hours > 0) {
    return options?.showSeconds
      ? `${hours}:${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`
      : `${hours}:${String(minutes).padStart(2, '0')}`
  }

  return `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`
}

/**
 * 格式化相对时间 (多久前/多久后)
 */
export function formatRelativeTime(date: Date | string | number): string {
  const now = Date.now()
  const target = new Date(date).getTime()
  const diff = now - target
  const absDiff = Math.abs(diff)

  const seconds = Math.floor(absDiff / 1000)
  const minutes = Math.floor(seconds / 60)
  const hours = Math.floor(minutes / 60)
  const days = Math.floor(hours / 24)
  const weeks = Math.floor(days / 7)
  const months = Math.floor(days / 30)

  const suffix = diff > 0 ? '前' : '后'

  if (months > 0) return `${months}个月${suffix}`
  if (weeks > 0) return `${weeks}周${suffix}`
  if (days > 0) return `${days}天${suffix}`
  if (hours > 0) return `${hours}小时${suffix}`
  if (minutes > 0) return `${minutes}分钟${suffix}`
  if (seconds > 5) return `${seconds}秒${suffix}`
  return '刚刚'
}

/**
 * 格式化日期时间
 */
export function formatDateTime(
  date: Date | string | number,
  options?: TimeFormatOptions
): string {
  const d = new Date(date)

  if (options?.relative) {
    return formatRelativeTime(d)
  }

  const year = d.getFullYear()
  const month = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  const hours = String(d.getHours()).padStart(2, '0')
  const minutes = String(d.getMinutes()).padStart(2, '0')
  const seconds = String(d.getSeconds()).padStart(2, '0')

  if (options?.showDate === false) {
    return options?.showSeconds
      ? `${hours}:${minutes}:${seconds}`
      : `${hours}:${minutes}`
  }

  return options?.showSeconds
    ? `${year}-${month}-${day} ${hours}:${minutes}:${seconds}`
    : `${year}-${month}-${day} ${hours}:${minutes}`
}

/**
 * 计算预计剩余时间
 */
export function calculateEstimatedTime(
  startedAt: Date,
  currentProgress: number,
  targetProgress: number = 100
): number {
  if (currentProgress <= 0) return 0

  const elapsed = Date.now() - new Date(startedAt).getTime()
  const rate = currentProgress / elapsed
  const remaining = targetProgress - currentProgress

  return remaining / rate
}

// ============ 阶段相关 ============

/** 阶段配置 */
export const STAGE_CONFIG: Record<DeliveryStage, {
  name: string
  icon: string
  color: string
  bgColor: string
  order: number
}> = {
  queued: { name: '排队中', icon: '⏳', color: 'text-gray-500', bgColor: 'bg-gray-100', order: 0 },
  preparing: { name: '准备中', icon: '📋', color: 'text-blue-500', bgColor: 'bg-blue-100', order: 1 },
  coding: { name: '开发中', icon: '💻', color: 'text-purple-500', bgColor: 'bg-purple-100', order: 2 },
  testing: { name: '测试中', icon: '🧪', color: 'text-yellow-500', bgColor: 'bg-yellow-100', order: 3 },
  fixing: { name: '修复中', icon: '🔧', color: 'text-orange-500', bgColor: 'bg-orange-100', order: 4 },
  deploying: { name: '部署中', icon: '🚀', color: 'text-indigo-500', bgColor: 'bg-indigo-100', order: 5 },
  configuring: { name: '配置中', icon: '⚙️', color: 'text-cyan-500', bgColor: 'bg-cyan-100', order: 6 },
  verifying: { name: '验证中', icon: '✅', color: 'text-teal-500', bgColor: 'bg-teal-100', order: 7 },
  almost_done: { name: '即将完成', icon: '🎯', color: 'text-emerald-500', bgColor: 'bg-emerald-100', order: 8 },
  completed: { name: '已完成', icon: '🎉', color: 'text-green-500', bgColor: 'bg-green-100', order: 9 },
  paused: { name: '已暂停', icon: '⏸️', color: 'text-amber-500', bgColor: 'bg-amber-100', order: -1 },
  error: { name: '出错了', icon: '❌', color: 'text-red-500', bgColor: 'bg-red-100', order: -2 },
}

/**
 * 获取阶段配置
 */
export function getStageConfig(stage: DeliveryStage) {
  return STAGE_CONFIG[stage] || STAGE_CONFIG.queued
}

/**
 * 计算阶段进度百分比
 */
export function calculateStageProgress(stage: DeliveryStage): number {
  const config = STAGE_CONFIG[stage]
  if (config.order < 0) return 0
  return Math.round((config.order / 9) * 100)
}

/**
 * 判断阶段是否为终态
 */
export function isTerminalStage(stage: DeliveryStage): boolean {
  return stage === 'completed' || stage === 'error'
}

/**
 * 判断阶段是否正在进行
 */
export function isActiveStage(stage: DeliveryStage): boolean {
  const config = STAGE_CONFIG[stage]
  return config.order >= 0 && stage !== 'completed'
}

// ============ 状态相关 ============

/** 状态状态配置 */
export const STATUS_CONFIG: Record<StageStatus, {
  label: string
  color: string
  bgColor: string
}> = {
  pending: { label: '等待中', color: 'text-gray-500', bgColor: 'bg-gray-100' },
  running: { label: '进行中', color: 'text-blue-500', bgColor: 'bg-blue-100' },
  completed: { label: '已完成', color: 'text-green-500', bgColor: 'bg-green-100' },
  failed: { label: '失败', color: 'text-red-500', bgColor: 'bg-red-100' },
  skipped: { label: '已跳过', color: 'text-gray-400', bgColor: 'bg-gray-50' },
}

/** 验收状态配置 */
export const ACCEPTANCE_STATUS_CONFIG: Record<AcceptanceStatus, {
  label: string
  color: string
  bgColor: string
  icon: string
  pulse?: boolean
}> = {
  pending: { label: '等待开始', color: 'text-gray-500', bgColor: 'bg-gray-100', icon: '⏳' },
  active: { label: '验收中', color: 'text-blue-500', bgColor: 'bg-blue-100', icon: '🔍' },
  warning: { label: '时间警告', color: 'text-yellow-600', bgColor: 'bg-yellow-100', icon: '⚠️', pulse: true },
  final_warning: { label: '即将超时', color: 'text-orange-600', bgColor: 'bg-orange-100', icon: '🚨', pulse: true },
  auto_passed: { label: '自动通过', color: 'text-green-500', bgColor: 'bg-green-100', icon: '✅' },
  escalated: { label: '已升级', color: 'text-purple-500', bgColor: 'bg-purple-100', icon: '📞' },
  completed: { label: '已完成', color: 'text-green-600', bgColor: 'bg-green-100', icon: '🎉' },
}

/** 通知优先级配置 */
export const PRIORITY_CONFIG: Record<NotificationPriority, {
  label: string
  color: string
  bgColor: string
  icon: string
}> = {
  low: { label: '低', color: 'text-gray-500', bgColor: 'bg-gray-100', icon: '📋' },
  normal: { label: '普通', color: 'text-blue-500', bgColor: 'bg-blue-100', icon: '📬' },
  high: { label: '重要', color: 'text-orange-500', bgColor: 'bg-orange-100', icon: '⚡' },
  urgent: { label: '紧急', color: 'text-red-500', bgColor: 'bg-red-100', icon: '🚨' },
  critical: { label: '严重', color: 'text-red-600', bgColor: 'bg-red-200', icon: '🔥' },
}

// ============ 诊断相关 ============

/** 诊断类别配置 */
export const DIAGNOSIS_CATEGORY_CONFIG: Record<DiagnosisCategory, {
  label: string
  icon: string
  description: string
}> = {
  browser: { label: '浏览器', icon: '🌐', description: '浏览器兼容性和设置' },
  network: { label: '网络', icon: '📡', description: '网络连接状态' },
  performance: { label: '性能', icon: '⚡', description: '页面加载和响应速度' },
  storage: { label: '存储', icon: '💾', description: '本地存储和缓存' },
  errors: { label: '错误', icon: '🐛', description: '控制台错误和异常' },
  api: { label: 'API', icon: '🔌', description: 'API连接和响应' },
  resources: { label: '资源', icon: '📦', description: '静态资源加载' },
  screenshots: { label: '截图', icon: '📸', description: '界面截图分析' },
}

/**
 * 计算诊断健康分数
 */
export function calculateHealthScore(
  categories: { category: DiagnosisCategory; score: number }[]
): number {
  if (categories.length === 0) return 0

  const weights: Record<DiagnosisCategory, number> = {
    network: 25,
    api: 25,
    performance: 20,
    browser: 10,
    storage: 5,
    errors: 10,
    resources: 5,
    screenshots: 0,
  }

  let totalWeight = 0
  let weightedScore = 0

  for (const { category, score } of categories) {
    const weight = weights[category] || 0
    totalWeight += weight
    weightedScore += score * weight
  }

  return totalWeight > 0 ? Math.round(weightedScore / totalWeight) : 0
}

/**
 * 获取健康状态
 */
export function getHealthStatus(score: number): {
  status: 'healthy' | 'warning' | 'error'
  label: string
  color: string
} {
  if (score >= 80) {
    return { status: 'healthy', label: '健康', color: 'text-green-500' }
  }
  if (score >= 60) {
    return { status: 'warning', label: '需关注', color: 'text-yellow-500' }
  }
  return { status: 'error', label: '有问题', color: 'text-red-500' }
}

// ============ 修复策略相关 ============

/** 修复策略配置 */
export const FIX_STRATEGY_CONFIG: Record<FixStrategy, {
  label: string
  icon: string
  description: string
}> = {
  retry: { label: '重试', icon: '🔄', description: '简单重试操作' },
  backoff: { label: '退避重试', icon: '⏱️', description: '等待后重试' },
  restart: { label: '重启', icon: '🔁', description: '重启服务' },
  reconnect: { label: '重连', icon: '🔗', description: '重新建立连接' },
  reconfigure: { label: '重配置', icon: '⚙️', description: '重新配置' },
  rollback: { label: '回滚', icon: '⏪', description: '回滚到上一版本' },
  fallback: { label: '降级', icon: '📉', description: '使用备用方案' },
  skip: { label: '跳过', icon: '⏭️', description: '跳过此步骤' },
  manual: { label: '人工处理', icon: '👨‍💻', description: '需要人工介入' },
  escalate: { label: '升级', icon: '📞', description: '升级给技术支持' },
}

// ============ 数据处理 ============

/**
 * 脱敏密码
 */
export function maskPassword(password: string, visibleChars: number = 2): string {
  if (password.length <= visibleChars * 2) {
    return '*'.repeat(password.length)
  }
  const start = password.slice(0, visibleChars)
  const end = password.slice(-visibleChars)
  const middle = '*'.repeat(Math.min(password.length - visibleChars * 2, 6))
  return `${start}${middle}${end}`
}

/**
 * 复制到剪贴板
 */
export async function copyToClipboard(text: string): Promise<boolean> {
  try {
    await navigator.clipboard.writeText(text)
    return true
  } catch {
    // 降级方案
    const textarea = document.createElement('textarea')
    textarea.value = text
    textarea.style.position = 'fixed'
    textarea.style.opacity = '0'
    document.body.appendChild(textarea)
    textarea.select()
    try {
      document.execCommand('copy')
      return true
    } catch {
      return false
    } finally {
      document.body.removeChild(textarea)
    }
  }
}

/**
 * 生成唯一 ID
 */
export function generateId(prefix: string = ''): string {
  const timestamp = Date.now().toString(36)
  const random = Math.random().toString(36).slice(2, 8)
  return prefix ? `${prefix}_${timestamp}${random}` : `${timestamp}${random}`
}

/**
 * 防抖函数
 */
export function debounce<T extends (...args: unknown[]) => unknown>(
  fn: T,
  delay: number
): (...args: Parameters<T>) => void {
  let timeoutId: NodeJS.Timeout | null = null

  return (...args: Parameters<T>) => {
    if (timeoutId) {
      clearTimeout(timeoutId)
    }
    timeoutId = setTimeout(() => {
      fn(...args)
      timeoutId = null
    }, delay)
  }
}

/**
 * 节流函数
 */
export function throttle<T extends (...args: unknown[]) => unknown>(
  fn: T,
  limit: number
): (...args: Parameters<T>) => void {
  let inThrottle = false

  return (...args: Parameters<T>) => {
    if (!inThrottle) {
      fn(...args)
      inThrottle = true
      setTimeout(() => {
        inThrottle = false
      }, limit)
    }
  }
}

// ============ 鼓励话语 ============

/** 鼓励话语库 */
export const ENCOURAGEMENTS = [
  '您的产品正在精心打造中...',
  '我们的工程师正在全力以赴...',
  '请稍等，美好的事情即将发生...',
  '您的耐心等待将会得到回报...',
  '每一次进度更新都是向成功迈进的一步...',
  '正在为您的产品注入灵魂...',
  '距离您的梦想产品越来越近了...',
  '我们正在确保每个细节都完美无缺...',
]

/**
 * 获取随机鼓励话语
 */
export function getRandomEncouragement(): string {
  return ENCOURAGEMENTS[Math.floor(Math.random() * ENCOURAGEMENTS.length)]
}

/**
 * 根据进度获取鼓励话语
 */
export function getEncouragementByProgress(progress: number): string {
  if (progress < 20) return '刚刚开始，让我们一起见证奇迹...'
  if (progress < 40) return '稳步推进中，一切都在计划之中...'
  if (progress < 60) return '已经过半了，胜利就在前方...'
  if (progress < 80) return '即将完成，请保持期待...'
  if (progress < 95) return '最后的冲刺，完美就在眼前...'
  return '恭喜！您的产品即将诞生...'
}
