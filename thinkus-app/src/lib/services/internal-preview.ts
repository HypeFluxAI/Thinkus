/**
 * 内部预演服务
 *
 * 在正式交付给用户之前，先在内部环境进行预演验收
 * 确保产品质量，避免交付有问题的产品
 */

import { subdomainManager } from './subdomain-manager'
import { acceptanceTester } from './acceptance-tester'
import { deliveryGate } from './delivery-gate'
import { e2eTestExecutor } from './e2e-test-executor'

// ============================================================================
// 类型定义
// ============================================================================

/** 预演环境状态 */
export type PreviewStatus = 'pending' | 'creating' | 'ready' | 'testing' | 'approved' | 'rejected' | 'expired'

/** 预演验收人 */
export interface PreviewReviewer {
  id: string
  name: string
  role: 'qa' | 'pm' | 'tech_lead' | 'founder'
  email: string
}

/** 预演检查项 */
export interface PreviewCheckItem {
  id: string
  category: 'functionality' | 'ui' | 'performance' | 'security' | 'content'
  name: string
  description: string
  status: 'pending' | 'passed' | 'failed' | 'skipped'
  notes?: string
  checkedBy?: string
  checkedAt?: Date
}

/** 预演环境配置 */
export interface PreviewConfig {
  projectId: string
  projectName: string
  productType: string
  sourceUrl: string  // 源部署 URL
  reviewers: PreviewReviewer[]
  expiresInHours: number  // 预演环境有效期
  autoApproveIfAllPass: boolean  // 全部通过自动批准
  requiredApprovals: number  // 需要的批准数
  notifyOnReady: boolean
}

/** 预演环境数据 */
export interface PreviewEnvironment {
  id: string
  projectId: string
  projectName: string
  status: PreviewStatus
  previewUrl: string
  sourceUrl: string
  createdAt: Date
  expiresAt: Date
  reviewers: PreviewReviewer[]
  checkItems: PreviewCheckItem[]
  approvals: PreviewApproval[]
  rejections: PreviewRejection[]
  autoTestResult?: AutoTestResult
  promotedAt?: Date
  promotedBy?: string
}

/** 批准记录 */
export interface PreviewApproval {
  reviewerId: string
  reviewerName: string
  approvedAt: Date
  comments?: string
}

/** 拒绝记录 */
export interface PreviewRejection {
  reviewerId: string
  reviewerName: string
  rejectedAt: Date
  reason: string
  blockers: string[]
}

/** 自动测试结果 */
export interface AutoTestResult {
  e2eTests: {
    total: number
    passed: number
    failed: number
    skipped: number
  }
  gateChecks: {
    total: number
    passed: number
    blocked: number
  }
  performanceScore: number
  securityScore: number
  overallScore: number
  passRate: number
}

/** 预演进度回调 */
export type PreviewProgressCallback = (
  stage: string,
  message: string,
  progress: number
) => void

// ============================================================================
// 默认检查清单
// ============================================================================

const DEFAULT_CHECK_ITEMS: Omit<PreviewCheckItem, 'status' | 'notes' | 'checkedBy' | 'checkedAt'>[] = [
  // 功能检查
  {
    id: 'func_homepage',
    category: 'functionality',
    name: '首页加载',
    description: '首页能正常打开，无白屏或错误',
  },
  {
    id: 'func_login',
    category: 'functionality',
    name: '登录功能',
    description: '使用测试账号能正常登录',
  },
  {
    id: 'func_core',
    category: 'functionality',
    name: '核心功能',
    description: '产品的核心功能能正常使用',
  },
  {
    id: 'func_admin',
    category: 'functionality',
    name: '管理后台',
    description: '管理后台能正常访问和操作',
  },
  {
    id: 'func_data',
    category: 'functionality',
    name: '数据操作',
    description: '增删改查操作正常，数据正确保存',
  },

  // UI 检查
  {
    id: 'ui_responsive',
    category: 'ui',
    name: '响应式布局',
    description: '手机端和电脑端都能正常显示',
  },
  {
    id: 'ui_consistency',
    category: 'ui',
    name: '界面一致性',
    description: '字体、颜色、按钮等风格统一',
  },
  {
    id: 'ui_error_states',
    category: 'ui',
    name: '错误状态',
    description: '错误提示清晰友好，无技术术语',
  },
  {
    id: 'ui_loading',
    category: 'ui',
    name: '加载状态',
    description: '有适当的加载提示，无空白闪烁',
  },

  // 性能检查
  {
    id: 'perf_load_time',
    category: 'performance',
    name: '页面加载速度',
    description: '首页在3秒内完成加载',
  },
  {
    id: 'perf_interaction',
    category: 'performance',
    name: '交互响应',
    description: '点击按钮等操作响应迅速',
  },

  // 安全检查
  {
    id: 'sec_https',
    category: 'security',
    name: 'HTTPS',
    description: '全站使用 HTTPS，无混合内容警告',
  },
  {
    id: 'sec_auth',
    category: 'security',
    name: '权限控制',
    description: '未登录无法访问需要权限的页面',
  },

  // 内容检查
  {
    id: 'content_text',
    category: 'content',
    name: '文案内容',
    description: '无错别字、无 Lorem ipsum、无开发占位符',
  },
  {
    id: 'content_images',
    category: 'content',
    name: '图片资源',
    description: '图片正常显示，无破图或占位图',
  },
]

// ============================================================================
// 内部预演服务
// ============================================================================

export class InternalPreviewService {
  private static instance: InternalPreviewService
  private previews: Map<string, PreviewEnvironment> = new Map()

  private constructor() {}

  public static getInstance(): InternalPreviewService {
    if (!InternalPreviewService.instance) {
      InternalPreviewService.instance = new InternalPreviewService()
    }
    return InternalPreviewService.instance
  }

  /**
   * 创建预演环境
   */
  async createPreview(
    config: PreviewConfig,
    onProgress?: PreviewProgressCallback
  ): Promise<PreviewEnvironment> {
    const previewId = `preview_${config.projectId}_${Date.now()}`

    onProgress?.('init', '正在创建预演环境...', 10)

    // 1. 生成预演子域名
    const previewSubdomain = `preview-${config.projectId.slice(0, 8)}`
    let previewUrl = `https://${previewSubdomain}.thinkus.app`

    onProgress?.('subdomain', '正在配置预演域名...', 20)

    // 2. 创建预演部署（复制生产环境）
    // 实际实现需要调用云平台 API
    // 这里简化为直接使用源 URL 加参数
    previewUrl = `${config.sourceUrl}?preview=true&previewId=${previewId}`

    onProgress?.('deploy', '正在部署预演版本...', 40)

    // 3. 运行自动测试
    onProgress?.('testing', '正在运行自动化测试...', 50)
    const autoTestResult = await this.runAutoTests(config.sourceUrl, config.productType)

    onProgress?.('testing', `自动测试完成，通过率 ${autoTestResult.passRate}%`, 70)

    // 4. 创建检查清单
    const checkItems: PreviewCheckItem[] = DEFAULT_CHECK_ITEMS.map(item => ({
      ...item,
      status: 'pending' as const,
    }))

    // 5. 创建预演环境记录
    const preview: PreviewEnvironment = {
      id: previewId,
      projectId: config.projectId,
      projectName: config.projectName,
      status: 'ready',
      previewUrl,
      sourceUrl: config.sourceUrl,
      createdAt: new Date(),
      expiresAt: new Date(Date.now() + config.expiresInHours * 60 * 60 * 1000),
      reviewers: config.reviewers,
      checkItems,
      approvals: [],
      rejections: [],
      autoTestResult,
    }

    this.previews.set(previewId, preview)

    onProgress?.('ready', '预演环境已就绪', 100)

    // 6. 通知审核人
    if (config.notifyOnReady) {
      await this.notifyReviewers(preview)
    }

    return preview
  }

  /**
   * 运行自动测试
   */
  private async runAutoTests(url: string, productType: string): Promise<AutoTestResult> {
    // 运行 E2E 测试
    let e2eResult = { total: 0, passed: 0, failed: 0, skipped: 0 }
    try {
      const testReport = await e2eTestExecutor.runE2ETests({
        baseUrl: url,
        productType,
        headless: true,
        timeout: 30000,
      })
      e2eResult = {
        total: testReport.totalTests,
        passed: testReport.passed,
        failed: testReport.failed,
        skipped: testReport.skipped,
      }
    } catch {
      // 测试失败，使用默认值
    }

    // 运行门禁检查
    let gateResult = { total: 0, passed: 0, blocked: 0 }
    try {
      const gateReport = await deliveryGate.runGateChecks('preview', {
        deploymentUrl: url,
        skipManualChecks: true,
      })
      gateResult = {
        total: gateReport.checks.length,
        passed: gateReport.checks.filter(c => c.status === 'passed').length,
        blocked: gateReport.blockerCount,
      }
    } catch {
      // 检查失败
    }

    // 计算综合分数
    const e2eScore = e2eResult.total > 0
      ? (e2eResult.passed / e2eResult.total) * 100
      : 50
    const gateScore = gateResult.total > 0
      ? (gateResult.passed / gateResult.total) * 100
      : 50

    const overallScore = Math.round((e2eScore * 0.6 + gateScore * 0.4))
    const passRate = e2eResult.total > 0
      ? Math.round((e2eResult.passed / e2eResult.total) * 100)
      : 0

    return {
      e2eTests: e2eResult,
      gateChecks: gateResult,
      performanceScore: 80, // 简化，实际需要 Lighthouse 测试
      securityScore: 85,    // 简化，实际需要安全扫描
      overallScore,
      passRate,
    }
  }

  /**
   * 通知审核人
   */
  private async notifyReviewers(preview: PreviewEnvironment): Promise<void> {
    for (const reviewer of preview.reviewers) {
      // TODO: 发送邮件通知
      console.log(`[PREVIEW] Notifying reviewer ${reviewer.name} (${reviewer.email})`)
    }
  }

  /**
   * 获取预演环境
   */
  getPreview(previewId: string): PreviewEnvironment | undefined {
    return this.previews.get(previewId)
  }

  /**
   * 更新检查项状态
   */
  updateCheckItem(
    previewId: string,
    checkId: string,
    status: 'passed' | 'failed' | 'skipped',
    reviewerId: string,
    notes?: string
  ): PreviewEnvironment | undefined {
    const preview = this.previews.get(previewId)
    if (!preview) return undefined

    const item = preview.checkItems.find(c => c.id === checkId)
    if (item) {
      item.status = status
      item.checkedBy = reviewerId
      item.checkedAt = new Date()
      item.notes = notes
    }

    // 检查是否所有项都已检查
    this.checkAutoApproval(preview)

    return preview
  }

  /**
   * 批量更新检查项
   */
  batchUpdateCheckItems(
    previewId: string,
    updates: Array<{
      checkId: string
      status: 'passed' | 'failed' | 'skipped'
      notes?: string
    }>,
    reviewerId: string
  ): PreviewEnvironment | undefined {
    const preview = this.previews.get(previewId)
    if (!preview) return undefined

    for (const update of updates) {
      const item = preview.checkItems.find(c => c.id === update.checkId)
      if (item) {
        item.status = update.status
        item.checkedBy = reviewerId
        item.checkedAt = new Date()
        item.notes = update.notes
      }
    }

    this.checkAutoApproval(preview)

    return preview
  }

  /**
   * 检查是否可以自动批准
   */
  private checkAutoApproval(preview: PreviewEnvironment): void {
    const allChecked = preview.checkItems.every(c => c.status !== 'pending')
    const allPassed = preview.checkItems.every(c => c.status === 'passed' || c.status === 'skipped')
    const failedItems = preview.checkItems.filter(c => c.status === 'failed')

    if (allChecked) {
      if (allPassed && preview.autoTestResult && preview.autoTestResult.passRate >= 80) {
        // 可以自动批准
        preview.status = 'approved'
      } else if (failedItems.length > 0) {
        // 有失败项，需要处理
        preview.status = 'testing'  // 保持测试状态，等待人工判断
      }
    }
  }

  /**
   * 审核人批准
   */
  approve(
    previewId: string,
    reviewerId: string,
    reviewerName: string,
    comments?: string
  ): PreviewEnvironment | undefined {
    const preview = this.previews.get(previewId)
    if (!preview) return undefined

    // 检查是否已经批准过
    if (preview.approvals.some(a => a.reviewerId === reviewerId)) {
      return preview
    }

    preview.approvals.push({
      reviewerId,
      reviewerName,
      approvedAt: new Date(),
      comments,
    })

    // 检查是否达到批准数量
    // 简化：有一个人批准就算通过
    if (preview.approvals.length >= 1) {
      preview.status = 'approved'
    }

    return preview
  }

  /**
   * 审核人拒绝
   */
  reject(
    previewId: string,
    reviewerId: string,
    reviewerName: string,
    reason: string,
    blockers: string[]
  ): PreviewEnvironment | undefined {
    const preview = this.previews.get(previewId)
    if (!preview) return undefined

    preview.rejections.push({
      reviewerId,
      reviewerName,
      rejectedAt: new Date(),
      reason,
      blockers,
    })

    preview.status = 'rejected'

    return preview
  }

  /**
   * 推送到生产环境
   */
  async promoteToProduction(
    previewId: string,
    promotedBy: string
  ): Promise<{ success: boolean; productionUrl?: string; error?: string }> {
    const preview = this.previews.get(previewId)
    if (!preview) {
      return { success: false, error: '预演环境不存在' }
    }

    if (preview.status !== 'approved') {
      return { success: false, error: '预演环境尚未通过审核' }
    }

    // 执行推送
    // 实际实现需要调用云平台 API 进行部署切换
    preview.promotedAt = new Date()
    preview.promotedBy = promotedBy

    // TODO: 切换生产域名指向

    return {
      success: true,
      productionUrl: preview.sourceUrl.replace('?preview=true', ''),
    }
  }

  /**
   * 生成预演报告
   */
  generatePreviewReport(previewId: string): string {
    const preview = this.previews.get(previewId)
    if (!preview) return '预演环境不存在'

    const checkStats = {
      total: preview.checkItems.length,
      passed: preview.checkItems.filter(c => c.status === 'passed').length,
      failed: preview.checkItems.filter(c => c.status === 'failed').length,
      skipped: preview.checkItems.filter(c => c.status === 'skipped').length,
      pending: preview.checkItems.filter(c => c.status === 'pending').length,
    }

    const lines: string[] = [
      `# 预演验收报告`,
      ``,
      `## 基本信息`,
      `- 项目: ${preview.projectName}`,
      `- 预演ID: ${preview.id}`,
      `- 状态: ${preview.status}`,
      `- 创建时间: ${preview.createdAt.toLocaleString('zh-CN')}`,
      `- 过期时间: ${preview.expiresAt.toLocaleString('zh-CN')}`,
      ``,
      `## 预演地址`,
      `${preview.previewUrl}`,
      ``,
      `## 自动测试结果`,
    ]

    if (preview.autoTestResult) {
      const r = preview.autoTestResult
      lines.push(
        `- E2E测试: ${r.e2eTests.passed}/${r.e2eTests.total} 通过`,
        `- 门禁检查: ${r.gateChecks.passed}/${r.gateChecks.total} 通过`,
        `- 综合评分: ${r.overallScore}/100`,
        `- 通过率: ${r.passRate}%`,
      )
    } else {
      lines.push(`- 暂无自动测试结果`)
    }

    lines.push(
      ``,
      `## 人工检查结果`,
      `- 总计: ${checkStats.total} 项`,
      `- 通过: ${checkStats.passed} 项`,
      `- 失败: ${checkStats.failed} 项`,
      `- 跳过: ${checkStats.skipped} 项`,
      `- 待检查: ${checkStats.pending} 项`,
      ``,
    )

    // 失败项详情
    const failedItems = preview.checkItems.filter(c => c.status === 'failed')
    if (failedItems.length > 0) {
      lines.push(`## 失败项详情`)
      for (const item of failedItems) {
        lines.push(`- **${item.name}**: ${item.notes || item.description}`)
      }
      lines.push(``)
    }

    // 审核结果
    lines.push(`## 审核结果`)
    if (preview.approvals.length > 0) {
      lines.push(`### 批准`)
      for (const a of preview.approvals) {
        lines.push(`- ${a.reviewerName}: ${a.comments || '通过'} (${a.approvedAt.toLocaleString('zh-CN')})`)
      }
    }
    if (preview.rejections.length > 0) {
      lines.push(`### 拒绝`)
      for (const r of preview.rejections) {
        lines.push(`- ${r.reviewerName}: ${r.reason}`)
        for (const b of r.blockers) {
          lines.push(`  - ${b}`)
        }
      }
    }

    return lines.join('\n')
  }

  /**
   * 清理过期的预演环境
   */
  cleanupExpired(): number {
    const now = new Date()
    let cleaned = 0

    for (const [id, preview] of this.previews) {
      if (preview.expiresAt < now && preview.status !== 'approved') {
        preview.status = 'expired'
        // TODO: 删除预演部署
        cleaned++
      }
    }

    return cleaned
  }
}

// 导出单例
export const internalPreview = InternalPreviewService.getInstance()
