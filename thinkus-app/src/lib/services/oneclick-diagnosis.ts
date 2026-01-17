/**
 * 一键诊断收集服务 (P0-6)
 *
 * 解决问题：用户无法清楚描述问题，客服诊断困难
 *
 * 设计理念：
 * 1. 一键收集所有诊断信息
 * 2. 自动分析常见问题
 * 3. 生成可读的诊断报告
 * 4. 支持截图和录屏
 */

// 诊断类别
export type DiagnosisCategory =
  | 'browser'       // 浏览器信息
  | 'network'       // 网络状态
  | 'performance'   // 性能指标
  | 'storage'       // 存储状态
  | 'errors'        // 错误日志
  | 'actions'       // 用户操作
  | 'api'           // API状态
  | 'environment'   // 环境信息

// 诊断项状态
export type DiagnosisItemStatus = 'normal' | 'warning' | 'error' | 'unknown'

// 诊断项
export interface DiagnosisItem {
  category: DiagnosisCategory
  name: string
  label: string
  value: string | number | boolean
  status: DiagnosisItemStatus
  message?: string
  suggestion?: string
}

// 浏览器信息
export interface BrowserInfo {
  userAgent: string
  name: string
  version: string
  platform: string
  language: string
  cookiesEnabled: boolean
  javaScriptEnabled: boolean
  screenResolution: string
  viewportSize: string
  colorDepth: number
  pixelRatio: number
  touchSupport: boolean
  timezone: string
}

// 网络信息
export interface NetworkInfo {
  online: boolean
  effectiveType?: string  // 4g, 3g, 2g, slow-2g
  downlink?: number       // Mbps
  rtt?: number            // Round trip time in ms
  saveData?: boolean
}

// 性能指标
export interface PerformanceMetrics {
  pageLoadTime: number
  domContentLoaded: number
  firstPaint?: number
  firstContentfulPaint?: number
  largestContentfulPaint?: number
  timeToInteractive?: number
  cumulativeLayoutShift?: number
  totalBlockingTime?: number
  memoryUsage?: {
    usedJSHeapSize: number
    totalJSHeapSize: number
    jsHeapSizeLimit: number
  }
}

// 存储信息
export interface StorageInfo {
  localStorageAvailable: boolean
  localStorageUsed: number
  sessionStorageAvailable: boolean
  sessionStorageUsed: number
  indexedDBAvailable: boolean
  cookiesEnabled: boolean
  cacheStorageAvailable: boolean
}

// 错误日志
export interface ErrorLog {
  timestamp: Date
  type: 'error' | 'warning' | 'unhandledRejection'
  message: string
  stack?: string
  source?: string
  line?: number
  column?: number
}

// 用户操作记录
export interface UserAction {
  timestamp: Date
  type: 'click' | 'input' | 'navigate' | 'scroll' | 'resize' | 'focus' | 'blur'
  target?: string
  value?: string
  url?: string
}

// API调用记录
export interface ApiCall {
  timestamp: Date
  method: string
  url: string
  status: number
  duration: number
  requestSize?: number
  responseSize?: number
  error?: string
}

// 诊断报告
export interface DiagnosisReport {
  id: string
  projectId: string
  userId: string
  createdAt: Date
  browser: BrowserInfo
  network: NetworkInfo
  performance: PerformanceMetrics
  storage: StorageInfo
  errors: ErrorLog[]
  actions: UserAction[]
  apiCalls: ApiCall[]
  items: DiagnosisItem[]
  screenshot?: string  // Base64
  screenRecording?: string  // URL
  overallStatus: DiagnosisItemStatus
  summary: string
  suggestions: string[]
  debugData?: Record<string, unknown>
}

// 收集配置
export interface CollectionConfig {
  collectBrowser: boolean
  collectNetwork: boolean
  collectPerformance: boolean
  collectStorage: boolean
  collectErrors: boolean
  collectActions: boolean
  collectApiCalls: boolean
  takeScreenshot: boolean
  maxErrors: number
  maxActions: number
  maxApiCalls: number
}

// 默认配置
const DEFAULT_CONFIG: CollectionConfig = {
  collectBrowser: true,
  collectNetwork: true,
  collectPerformance: true,
  collectStorage: true,
  collectErrors: true,
  collectActions: true,
  collectApiCalls: true,
  takeScreenshot: true,
  maxErrors: 50,
  maxActions: 100,
  maxApiCalls: 50
}

// 诊断阈值
const THRESHOLDS = {
  pageLoadTime: { warning: 3000, error: 8000 },
  firstContentfulPaint: { warning: 2000, error: 4000 },
  largestContentfulPaint: { warning: 2500, error: 4000 },
  cumulativeLayoutShift: { warning: 0.1, error: 0.25 },
  networkRtt: { warning: 200, error: 500 },
  memoryUsage: { warning: 0.7, error: 0.9 }  // 百分比
}

/**
 * 一键诊断收集服务
 */
export class OneclickDiagnosisService {
  private errorLogs: ErrorLog[] = []
  private userActions: UserAction[] = []
  private apiCalls: ApiCall[] = []
  private isCollecting: boolean = false

  /**
   * 开始收集（在页面加载时调用）
   */
  startCollecting(): void {
    if (this.isCollecting) return
    this.isCollecting = true

    // 收集错误
    if (typeof window !== 'undefined') {
      window.addEventListener('error', this.handleError.bind(this))
      window.addEventListener('unhandledrejection', this.handleRejection.bind(this))
    }
  }

  /**
   * 停止收集
   */
  stopCollecting(): void {
    this.isCollecting = false
    if (typeof window !== 'undefined') {
      window.removeEventListener('error', this.handleError.bind(this))
      window.removeEventListener('unhandledrejection', this.handleRejection.bind(this))
    }
  }

  /**
   * 处理错误
   */
  private handleError(event: ErrorEvent): void {
    this.errorLogs.push({
      timestamp: new Date(),
      type: 'error',
      message: event.message,
      stack: event.error?.stack,
      source: event.filename,
      line: event.lineno,
      column: event.colno
    })

    // 保持最大数量
    if (this.errorLogs.length > DEFAULT_CONFIG.maxErrors) {
      this.errorLogs.shift()
    }
  }

  /**
   * 处理Promise拒绝
   */
  private handleRejection(event: PromiseRejectionEvent): void {
    this.errorLogs.push({
      timestamp: new Date(),
      type: 'unhandledRejection',
      message: event.reason?.message || String(event.reason),
      stack: event.reason?.stack
    })

    if (this.errorLogs.length > DEFAULT_CONFIG.maxErrors) {
      this.errorLogs.shift()
    }
  }

  /**
   * 记录用户操作
   */
  recordAction(action: Omit<UserAction, 'timestamp'>): void {
    this.userActions.push({
      ...action,
      timestamp: new Date()
    })

    if (this.userActions.length > DEFAULT_CONFIG.maxActions) {
      this.userActions.shift()
    }
  }

  /**
   * 记录API调用
   */
  recordApiCall(call: Omit<ApiCall, 'timestamp'>): void {
    this.apiCalls.push({
      ...call,
      timestamp: new Date()
    })

    if (this.apiCalls.length > DEFAULT_CONFIG.maxApiCalls) {
      this.apiCalls.shift()
    }
  }

  /**
   * 一键收集诊断信息
   */
  async collectDiagnosis(
    projectId: string,
    userId: string,
    config: Partial<CollectionConfig> = {}
  ): Promise<DiagnosisReport> {
    const fullConfig = { ...DEFAULT_CONFIG, ...config }
    const items: DiagnosisItem[] = []

    // 收集浏览器信息
    const browser = fullConfig.collectBrowser ? this.collectBrowserInfo() : this.getEmptyBrowserInfo()
    items.push(...this.analyzeBrowserInfo(browser))

    // 收集网络信息
    const network = fullConfig.collectNetwork ? await this.collectNetworkInfo() : this.getEmptyNetworkInfo()
    items.push(...this.analyzeNetworkInfo(network))

    // 收集性能指标
    const performance = fullConfig.collectPerformance ? this.collectPerformanceMetrics() : this.getEmptyPerformanceMetrics()
    items.push(...this.analyzePerformanceMetrics(performance))

    // 收集存储信息
    const storage = fullConfig.collectStorage ? this.collectStorageInfo() : this.getEmptyStorageInfo()
    items.push(...this.analyzeStorageInfo(storage))

    // 截图
    let screenshot: string | undefined
    if (fullConfig.takeScreenshot) {
      screenshot = await this.takeScreenshot()
    }

    // 计算整体状态
    const overallStatus = this.calculateOverallStatus(items)

    // 生成摘要和建议
    const { summary, suggestions } = this.generateSummaryAndSuggestions(items, this.errorLogs)

    const report: DiagnosisReport = {
      id: `diag_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      projectId,
      userId,
      createdAt: new Date(),
      browser,
      network,
      performance,
      storage,
      errors: [...this.errorLogs],
      actions: [...this.userActions],
      apiCalls: [...this.apiCalls],
      items,
      screenshot,
      overallStatus,
      summary,
      suggestions
    }

    return report
  }

  /**
   * 收集浏览器信息
   */
  private collectBrowserInfo(): BrowserInfo {
    if (typeof window === 'undefined') {
      return this.getEmptyBrowserInfo()
    }

    const ua = navigator.userAgent
    const browserName = this.detectBrowser(ua)
    const browserVersion = this.detectBrowserVersion(ua, browserName)

    return {
      userAgent: ua,
      name: browserName,
      version: browserVersion,
      platform: navigator.platform,
      language: navigator.language,
      cookiesEnabled: navigator.cookieEnabled,
      javaScriptEnabled: true,
      screenResolution: `${screen.width}x${screen.height}`,
      viewportSize: `${window.innerWidth}x${window.innerHeight}`,
      colorDepth: screen.colorDepth,
      pixelRatio: window.devicePixelRatio,
      touchSupport: 'ontouchstart' in window,
      timezone: Intl.DateTimeFormat().resolvedOptions().timeZone
    }
  }

  /**
   * 检测浏览器
   */
  private detectBrowser(ua: string): string {
    if (ua.includes('Firefox')) return 'Firefox'
    if (ua.includes('Edg')) return 'Edge'
    if (ua.includes('Chrome')) return 'Chrome'
    if (ua.includes('Safari')) return 'Safari'
    if (ua.includes('Opera') || ua.includes('OPR')) return 'Opera'
    return 'Unknown'
  }

  /**
   * 检测浏览器版本
   */
  private detectBrowserVersion(ua: string, browser: string): string {
    const patterns: Record<string, RegExp> = {
      Firefox: /Firefox\/(\d+\.\d+)/,
      Edge: /Edg\/(\d+\.\d+)/,
      Chrome: /Chrome\/(\d+\.\d+)/,
      Safari: /Version\/(\d+\.\d+)/,
      Opera: /(?:Opera|OPR)\/(\d+\.\d+)/
    }
    const pattern = patterns[browser]
    if (!pattern) return 'Unknown'
    const match = ua.match(pattern)
    return match ? match[1] : 'Unknown'
  }

  /**
   * 收集网络信息
   */
  private async collectNetworkInfo(): Promise<NetworkInfo> {
    if (typeof navigator === 'undefined') {
      return this.getEmptyNetworkInfo()
    }

    const info: NetworkInfo = {
      online: navigator.onLine
    }

    // Network Information API
    const connection = (navigator as unknown as { connection?: NetworkInformation }).connection
    if (connection) {
      info.effectiveType = connection.effectiveType
      info.downlink = connection.downlink
      info.rtt = connection.rtt
      info.saveData = connection.saveData
    }

    return info
  }

  /**
   * 收集性能指标
   */
  private collectPerformanceMetrics(): PerformanceMetrics {
    if (typeof window === 'undefined' || !window.performance) {
      return this.getEmptyPerformanceMetrics()
    }

    const timing = window.performance.timing
    const now = Date.now()

    const metrics: PerformanceMetrics = {
      pageLoadTime: timing.loadEventEnd - timing.navigationStart,
      domContentLoaded: timing.domContentLoadedEventEnd - timing.navigationStart
    }

    // Paint Timing API
    const paintEntries = performance.getEntriesByType('paint')
    for (const entry of paintEntries) {
      if (entry.name === 'first-paint') {
        metrics.firstPaint = entry.startTime
      } else if (entry.name === 'first-contentful-paint') {
        metrics.firstContentfulPaint = entry.startTime
      }
    }

    // LCP
    const lcpEntries = performance.getEntriesByType('largest-contentful-paint')
    if (lcpEntries.length > 0) {
      metrics.largestContentfulPaint = (lcpEntries[lcpEntries.length - 1] as PerformanceEntry & { startTime: number }).startTime
    }

    // Memory
    const memory = (performance as unknown as { memory?: { usedJSHeapSize: number; totalJSHeapSize: number; jsHeapSizeLimit: number } }).memory
    if (memory) {
      metrics.memoryUsage = {
        usedJSHeapSize: memory.usedJSHeapSize,
        totalJSHeapSize: memory.totalJSHeapSize,
        jsHeapSizeLimit: memory.jsHeapSizeLimit
      }
    }

    return metrics
  }

  /**
   * 收集存储信息
   */
  private collectStorageInfo(): StorageInfo {
    if (typeof window === 'undefined') {
      return this.getEmptyStorageInfo()
    }

    const info: StorageInfo = {
      localStorageAvailable: false,
      localStorageUsed: 0,
      sessionStorageAvailable: false,
      sessionStorageUsed: 0,
      indexedDBAvailable: false,
      cookiesEnabled: navigator.cookieEnabled,
      cacheStorageAvailable: 'caches' in window
    }

    try {
      info.localStorageAvailable = !!window.localStorage
      if (info.localStorageAvailable) {
        info.localStorageUsed = this.getStorageSize(localStorage)
      }
    } catch {
      info.localStorageAvailable = false
    }

    try {
      info.sessionStorageAvailable = !!window.sessionStorage
      if (info.sessionStorageAvailable) {
        info.sessionStorageUsed = this.getStorageSize(sessionStorage)
      }
    } catch {
      info.sessionStorageAvailable = false
    }

    try {
      info.indexedDBAvailable = !!window.indexedDB
    } catch {
      info.indexedDBAvailable = false
    }

    return info
  }

  /**
   * 获取存储大小
   */
  private getStorageSize(storage: Storage): number {
    let total = 0
    for (let i = 0; i < storage.length; i++) {
      const key = storage.key(i)
      if (key) {
        total += key.length + (storage.getItem(key)?.length || 0)
      }
    }
    return total * 2 // UTF-16
  }

  /**
   * 截图
   */
  private async takeScreenshot(): Promise<string | undefined> {
    if (typeof document === 'undefined') return undefined

    try {
      // 实际项目中会使用 html2canvas 等库
      // 这里返回占位符
      return 'screenshot_placeholder'
    } catch {
      return undefined
    }
  }

  /**
   * 分析浏览器信息
   */
  private analyzeBrowserInfo(info: BrowserInfo): DiagnosisItem[] {
    const items: DiagnosisItem[] = []

    items.push({
      category: 'browser',
      name: 'browser',
      label: '浏览器',
      value: `${info.name} ${info.version}`,
      status: 'normal'
    })

    items.push({
      category: 'browser',
      name: 'viewport',
      label: '视口大小',
      value: info.viewportSize,
      status: 'normal'
    })

    if (!info.cookiesEnabled) {
      items.push({
        category: 'browser',
        name: 'cookies',
        label: 'Cookies',
        value: '已禁用',
        status: 'error',
        message: 'Cookies 已禁用，可能导致登录等功能异常',
        suggestion: '请在浏览器设置中启用 Cookies'
      })
    }

    return items
  }

  /**
   * 分析网络信息
   */
  private analyzeNetworkInfo(info: NetworkInfo): DiagnosisItem[] {
    const items: DiagnosisItem[] = []

    items.push({
      category: 'network',
      name: 'online',
      label: '网络状态',
      value: info.online ? '在线' : '离线',
      status: info.online ? 'normal' : 'error',
      message: info.online ? undefined : '网络已断开',
      suggestion: info.online ? undefined : '请检查网络连接'
    })

    if (info.effectiveType) {
      const status = info.effectiveType === '4g' ? 'normal' :
                    info.effectiveType === '3g' ? 'warning' : 'error'
      items.push({
        category: 'network',
        name: 'type',
        label: '网络类型',
        value: info.effectiveType.toUpperCase(),
        status,
        message: status === 'error' ? '网络较慢' : undefined,
        suggestion: status === 'error' ? '建议切换到更快的网络' : undefined
      })
    }

    if (info.rtt !== undefined) {
      let status: DiagnosisItemStatus = 'normal'
      if (info.rtt > THRESHOLDS.networkRtt.error) status = 'error'
      else if (info.rtt > THRESHOLDS.networkRtt.warning) status = 'warning'

      items.push({
        category: 'network',
        name: 'rtt',
        label: '网络延迟',
        value: `${info.rtt}ms`,
        status,
        message: status !== 'normal' ? '网络延迟较高' : undefined
      })
    }

    return items
  }

  /**
   * 分析性能指标
   */
  private analyzePerformanceMetrics(metrics: PerformanceMetrics): DiagnosisItem[] {
    const items: DiagnosisItem[] = []

    // 页面加载时间
    if (metrics.pageLoadTime > 0) {
      let status: DiagnosisItemStatus = 'normal'
      if (metrics.pageLoadTime > THRESHOLDS.pageLoadTime.error) status = 'error'
      else if (metrics.pageLoadTime > THRESHOLDS.pageLoadTime.warning) status = 'warning'

      items.push({
        category: 'performance',
        name: 'pageLoad',
        label: '页面加载时间',
        value: `${(metrics.pageLoadTime / 1000).toFixed(2)}秒`,
        status,
        message: status !== 'normal' ? '页面加载较慢' : undefined,
        suggestion: status !== 'normal' ? '可能是网络问题或服务器响应慢' : undefined
      })
    }

    // FCP
    if (metrics.firstContentfulPaint) {
      let status: DiagnosisItemStatus = 'normal'
      if (metrics.firstContentfulPaint > THRESHOLDS.firstContentfulPaint.error) status = 'error'
      else if (metrics.firstContentfulPaint > THRESHOLDS.firstContentfulPaint.warning) status = 'warning'

      items.push({
        category: 'performance',
        name: 'fcp',
        label: '首次内容绘制',
        value: `${(metrics.firstContentfulPaint / 1000).toFixed(2)}秒`,
        status
      })
    }

    // 内存
    if (metrics.memoryUsage) {
      const usagePercent = metrics.memoryUsage.usedJSHeapSize / metrics.memoryUsage.jsHeapSizeLimit
      let status: DiagnosisItemStatus = 'normal'
      if (usagePercent > THRESHOLDS.memoryUsage.error) status = 'error'
      else if (usagePercent > THRESHOLDS.memoryUsage.warning) status = 'warning'

      items.push({
        category: 'performance',
        name: 'memory',
        label: '内存使用',
        value: `${(usagePercent * 100).toFixed(1)}%`,
        status,
        message: status !== 'normal' ? '内存占用较高' : undefined,
        suggestion: status !== 'normal' ? '建议刷新页面或关闭其他标签页' : undefined
      })
    }

    return items
  }

  /**
   * 分析存储信息
   */
  private analyzeStorageInfo(info: StorageInfo): DiagnosisItem[] {
    const items: DiagnosisItem[] = []

    if (!info.localStorageAvailable) {
      items.push({
        category: 'storage',
        name: 'localStorage',
        label: '本地存储',
        value: '不可用',
        status: 'warning',
        message: 'LocalStorage 不可用，可能影响数据保存',
        suggestion: '请检查浏览器设置是否禁用了本地存储'
      })
    }

    return items
  }

  /**
   * 计算整体状态
   */
  private calculateOverallStatus(items: DiagnosisItem[]): DiagnosisItemStatus {
    if (items.some(i => i.status === 'error')) return 'error'
    if (items.some(i => i.status === 'warning')) return 'warning'
    return 'normal'
  }

  /**
   * 生成摘要和建议
   */
  private generateSummaryAndSuggestions(
    items: DiagnosisItem[],
    errors: ErrorLog[]
  ): { summary: string; suggestions: string[] } {
    const lines: string[] = []
    const suggestions: string[] = []

    const errorItems = items.filter(i => i.status === 'error')
    const warningItems = items.filter(i => i.status === 'warning')

    if (errorItems.length === 0 && warningItems.length === 0 && errors.length === 0) {
      lines.push('✅ 系统状态正常，未发现明显问题')
    } else {
      if (errorItems.length > 0) {
        lines.push(`❌ 发现 ${errorItems.length} 个严重问题：`)
        errorItems.forEach(item => {
          lines.push(`   • ${item.label}: ${item.message || item.value}`)
          if (item.suggestion) {
            suggestions.push(item.suggestion)
          }
        })
      }

      if (warningItems.length > 0) {
        lines.push(`⚠️ 发现 ${warningItems.length} 个警告：`)
        warningItems.forEach(item => {
          lines.push(`   • ${item.label}: ${item.message || item.value}`)
          if (item.suggestion) {
            suggestions.push(item.suggestion)
          }
        })
      }

      if (errors.length > 0) {
        lines.push(`🔴 捕获到 ${errors.length} 个错误日志`)
        const recentErrors = errors.slice(-3)
        recentErrors.forEach(err => {
          lines.push(`   • ${err.message.substring(0, 50)}...`)
        })
      }
    }

    return {
      summary: lines.join('\n'),
      suggestions: [...new Set(suggestions)]
    }
  }

  // 空对象生成器
  private getEmptyBrowserInfo(): BrowserInfo {
    return {
      userAgent: '',
      name: 'Unknown',
      version: 'Unknown',
      platform: 'Unknown',
      language: 'Unknown',
      cookiesEnabled: false,
      javaScriptEnabled: true,
      screenResolution: 'Unknown',
      viewportSize: 'Unknown',
      colorDepth: 0,
      pixelRatio: 1,
      touchSupport: false,
      timezone: 'Unknown'
    }
  }

  private getEmptyNetworkInfo(): NetworkInfo {
    return { online: false }
  }

  private getEmptyPerformanceMetrics(): PerformanceMetrics {
    return { pageLoadTime: 0, domContentLoaded: 0 }
  }

  private getEmptyStorageInfo(): StorageInfo {
    return {
      localStorageAvailable: false,
      localStorageUsed: 0,
      sessionStorageAvailable: false,
      sessionStorageUsed: 0,
      indexedDBAvailable: false,
      cookiesEnabled: false,
      cacheStorageAvailable: false
    }
  }

  /**
   * 生成诊断报告页面HTML
   */
  generateReportHtml(report: DiagnosisReport): string {
    const statusIcon = report.overallStatus === 'normal' ? '✅' :
                       report.overallStatus === 'warning' ? '⚠️' : '❌'
    const statusColor = report.overallStatus === 'normal' ? '#22c55e' :
                        report.overallStatus === 'warning' ? '#f59e0b' : '#ef4444'

    return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>诊断报告</title>
  <style>
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
      background: #f3f4f6;
      padding: 40px 20px;
    }
    .container { max-width: 700px; margin: 0 auto; }
    .card {
      background: white;
      border-radius: 16px;
      box-shadow: 0 4px 6px rgba(0,0,0,0.05);
      overflow: hidden;
      margin-bottom: 20px;
    }
    .header {
      background: ${statusColor};
      color: white;
      padding: 32px;
      text-align: center;
    }
    .header-icon { font-size: 48px; margin-bottom: 12px; }
    .header-title { font-size: 24px; font-weight: 600; }
    .header-id { opacity: 0.8; font-size: 13px; margin-top: 8px; }
    .section { padding: 24px; border-bottom: 1px solid #f3f4f6; }
    .section:last-child { border-bottom: none; }
    .section-title {
      font-size: 16px;
      font-weight: 600;
      color: #374151;
      margin-bottom: 16px;
      display: flex;
      align-items: center;
    }
    .section-title::before { margin-right: 8px; }
    .summary {
      background: #f9fafb;
      border-radius: 12px;
      padding: 16px;
      white-space: pre-line;
      line-height: 1.6;
      color: #374151;
    }
    .items { }
    .item {
      display: flex;
      align-items: center;
      padding: 12px 0;
      border-bottom: 1px solid #f3f4f6;
    }
    .item:last-child { border-bottom: none; }
    .item-status {
      width: 8px;
      height: 8px;
      border-radius: 50%;
      margin-right: 12px;
    }
    .item-status.normal { background: #22c55e; }
    .item-status.warning { background: #f59e0b; }
    .item-status.error { background: #ef4444; }
    .item-label { color: #6b7280; width: 120px; }
    .item-value { color: #111827; flex: 1; }
    .item-message { color: #9ca3af; font-size: 13px; margin-left: 8px; }
    .suggestions {
      background: #eff6ff;
      border-radius: 12px;
      padding: 16px;
    }
    .suggestion-item {
      display: flex;
      align-items: flex-start;
      margin-bottom: 8px;
    }
    .suggestion-item:last-child { margin-bottom: 0; }
    .suggestion-icon { margin-right: 8px; }
    .suggestion-text { color: #1e40af; font-size: 14px; }
    .errors { }
    .error-item {
      background: #fef2f2;
      border-radius: 8px;
      padding: 12px;
      margin-bottom: 8px;
      font-size: 13px;
    }
    .error-time { color: #9ca3af; margin-bottom: 4px; }
    .error-message { color: #dc2626; word-break: break-all; }
    .browser-info {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 12px;
    }
    .info-item {
      background: #f9fafb;
      border-radius: 8px;
      padding: 12px;
    }
    .info-label { color: #6b7280; font-size: 12px; margin-bottom: 4px; }
    .info-value { color: #111827; font-weight: 500; }
    .copy-btn {
      display: block;
      width: 100%;
      padding: 16px;
      background: #3b82f6;
      color: white;
      border: none;
      border-radius: 12px;
      font-size: 16px;
      font-weight: 600;
      cursor: pointer;
      margin-top: 20px;
    }
    .copy-btn:hover { background: #2563eb; }
  </style>
</head>
<body>
  <div class="container">
    <div class="card">
      <div class="header">
        <div class="header-icon">${statusIcon}</div>
        <div class="header-title">诊断报告</div>
        <div class="header-id">ID: ${report.id}</div>
      </div>

      <div class="section">
        <div class="section-title">📋 诊断摘要</div>
        <div class="summary">${report.summary}</div>
      </div>

      ${report.suggestions.length > 0 ? `
      <div class="section">
        <div class="section-title">💡 改进建议</div>
        <div class="suggestions">
          ${report.suggestions.map(s => `
            <div class="suggestion-item">
              <span class="suggestion-icon">👉</span>
              <span class="suggestion-text">${s}</span>
            </div>
          `).join('')}
        </div>
      </div>
      ` : ''}

      <div class="section">
        <div class="section-title">🔍 检查项</div>
        <div class="items">
          ${report.items.map(item => `
            <div class="item">
              <div class="item-status ${item.status}"></div>
              <div class="item-label">${item.label}</div>
              <div class="item-value">${item.value}</div>
              ${item.message ? `<div class="item-message">${item.message}</div>` : ''}
            </div>
          `).join('')}
        </div>
      </div>

      ${report.errors.length > 0 ? `
      <div class="section">
        <div class="section-title">🔴 错误日志（最近 ${Math.min(report.errors.length, 5)} 条）</div>
        <div class="errors">
          ${report.errors.slice(-5).map(err => `
            <div class="error-item">
              <div class="error-time">${new Date(err.timestamp).toLocaleString()}</div>
              <div class="error-message">${err.message}</div>
            </div>
          `).join('')}
        </div>
      </div>
      ` : ''}

      <div class="section">
        <div class="section-title">🌐 环境信息</div>
        <div class="browser-info">
          <div class="info-item">
            <div class="info-label">浏览器</div>
            <div class="info-value">${report.browser.name} ${report.browser.version}</div>
          </div>
          <div class="info-item">
            <div class="info-label">平台</div>
            <div class="info-value">${report.browser.platform}</div>
          </div>
          <div class="info-item">
            <div class="info-label">屏幕</div>
            <div class="info-value">${report.browser.screenResolution}</div>
          </div>
          <div class="info-item">
            <div class="info-label">视口</div>
            <div class="info-value">${report.browser.viewportSize}</div>
          </div>
          <div class="info-item">
            <div class="info-label">网络</div>
            <div class="info-value">${report.network.online ? '在线' : '离线'} ${report.network.effectiveType || ''}</div>
          </div>
          <div class="info-item">
            <div class="info-label">时区</div>
            <div class="info-value">${report.browser.timezone}</div>
          </div>
        </div>
      </div>
    </div>

    <button class="copy-btn" onclick="copyReport()">📋 复制报告发送给客服</button>
  </div>

  <script>
    function copyReport() {
      const text = \`诊断报告 ${report.id}
时间: ${new Date(report.createdAt).toLocaleString()}
状态: ${report.overallStatus === 'normal' ? '正常' : report.overallStatus === 'warning' ? '有警告' : '有问题'}

${report.summary}

浏览器: ${report.browser.name} ${report.browser.version}
平台: ${report.browser.platform}
网络: ${report.network.online ? '在线' : '离线'}
\`;
      navigator.clipboard.writeText(text).then(() => {
        alert('报告已复制到剪贴板');
      });
    }
  </script>
</body>
</html>
    `.trim()
  }

  /**
   * 生成嵌入式诊断按钮脚本
   */
  generateEmbedScript(): string {
    return `
<script>
(function() {
  // 创建诊断按钮
  var btn = document.createElement('button');
  btn.innerHTML = '🔍 一键诊断';
  btn.style.cssText = 'position:fixed;bottom:20px;right:20px;z-index:99999;' +
    'background:#3b82f6;color:white;border:none;padding:12px 20px;' +
    'border-radius:24px;font-size:14px;font-weight:500;cursor:pointer;' +
    'box-shadow:0 4px 12px rgba(59,130,246,0.3);';

  btn.onclick = function() {
    // 调用诊断服务
    window.ThinkusDiagnosis && window.ThinkusDiagnosis.collect();
  };

  document.body.appendChild(btn);
})();
</script>
    `.trim()
  }
}

// 类型定义
interface NetworkInformation {
  effectiveType?: string
  downlink?: number
  rtt?: number
  saveData?: boolean
}

// 导出单例
export const oneclickDiagnosis = new OneclickDiagnosisService()
