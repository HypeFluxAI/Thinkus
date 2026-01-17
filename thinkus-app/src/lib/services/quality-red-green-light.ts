/**
 * 测试质量红绿灯服务
 *
 * 功能：
 * - 把技术测试报告转换成小白用户一眼能看懂的红绿灯
 * - 技术术语 → 人话
 * - 复杂报告 → 简单结论
 *
 * 核心理念：
 * - 用户不需要知道"Lighthouse评分78分"
 * - 用户只需要知道"网站速度还行，可以再快点"
 */

// ============================================
// 类型定义
// ============================================

/** 红绿灯状态 */
export type TrafficLightStatus = 'green' | 'yellow' | 'red'

/** 检查项结果 */
export interface CheckItemResult {
  id: string
  category: CheckCategory

  // 技术信息（内部用）
  technicalName: string
  technicalValue: string | number | boolean
  technicalPassed: boolean

  // 人话信息（给用户看）
  humanTitle: string           // 人话标题，如"网站能打开"
  humanStatus: TrafficLightStatus
  humanStatusText: string      // 如"正常"、"有点慢"、"打不开"
  humanExplanation: string     // 人话解释，如"我们测试了100次，99次都能打开"
  humanSuggestion?: string     // 如果有问题，给出建议

  // 图标
  icon: string                 // emoji
}

/** 检查类别 */
export type CheckCategory =
  | 'basic'           // 基础功能
  | 'security'        // 安全性
  | 'speed'           // 速度
  | 'mobile'          // 手机适配
  | 'data'            // 数据安全

/** 总体结论 */
export interface OverallConclusion {
  status: TrafficLightStatus

  // 大标题
  headline: string             // 如"产品已准备好！"
  headlineIcon: string         // 如"🎉"

  // 一句话总结
  summary: string              // 如"我们检查了15项，全部通过"

  // 详细说明
  details: string[]            // 多条说明

  // 行动建议
  actionNeeded: boolean
  actionText?: string          // 如"可以放心使用"或"有1个小问题需要注意"

  // 信心指数（让用户安心）
  confidenceScore: number      // 0-100
  confidenceText: string       // 如"非常可靠"
}

/** 红绿灯报告 */
export interface TrafficLightReport {
  projectId: string
  projectName: string
  generatedAt: Date

  // 总体结论
  conclusion: OverallConclusion

  // 分类检查结果
  categories: {
    category: CheckCategory
    categoryName: string       // 人话类别名
    categoryIcon: string
    status: TrafficLightStatus
    items: CheckItemResult[]
    passedCount: number
    totalCount: number
  }[]

  // 统计
  stats: {
    totalChecks: number
    greenCount: number         // 通过
    yellowCount: number        // 有小问题
    redCount: number           // 有问题
    passRate: number           // 通过率
  }

  // 用户可执行的操作
  actions: {
    canAccept: boolean         // 可以接收
    canRequestFix: boolean     // 可以要求修复
    canContactSupport: boolean // 可以联系客服
  }
}

// ============================================
// 人话翻译映射表
// ============================================

/** 技术术语 → 人话 映射 */
const TECH_TO_HUMAN_MAP: Record<string, {
  title: string
  greenText: string
  yellowText: string
  redText: string
  greenExplain: string
  yellowExplain: string
  redExplain: string
  icon: string
  category: CheckCategory
}> = {
  // 基础功能
  'homepage_load': {
    title: '首页能打开',
    greenText: '正常',
    yellowText: '有点慢',
    redText: '打不开',
    greenExplain: '网站首页可以正常访问，速度很快',
    yellowExplain: '网站能打开，但加载稍慢，我们正在优化',
    redExplain: '网站首页暂时无法访问，我们正在紧急修复',
    icon: '🏠',
    category: 'basic'
  },
  'user_registration': {
    title: '用户能注册',
    greenText: '正常',
    yellowText: '部分问题',
    redText: '无法注册',
    greenExplain: '新用户可以正常注册账号',
    yellowExplain: '注册功能基本正常，个别情况可能需要重试',
    redExplain: '注册功能暂时不可用，我们正在修复',
    icon: '📝',
    category: 'basic'
  },
  'user_login': {
    title: '用户能登录',
    greenText: '正常',
    yellowText: '偶尔失败',
    redText: '无法登录',
    greenExplain: '登录功能完全正常',
    yellowExplain: '登录功能基本正常，偶尔可能需要重试',
    redExplain: '登录功能暂时不可用，我们正在紧急处理',
    icon: '🔐',
    category: 'basic'
  },
  'core_feature': {
    title: '核心功能可用',
    greenText: '全部正常',
    yellowText: '基本可用',
    redText: '有问题',
    greenExplain: '所有核心功能都已测试通过',
    yellowExplain: '主要功能正常，个别次要功能还在优化',
    redExplain: '部分核心功能有问题，我们正在修复',
    icon: '⚙️',
    category: 'basic'
  },
  'admin_access': {
    title: '管理后台可用',
    greenText: '正常',
    yellowText: '部分功能受限',
    redText: '无法访问',
    greenExplain: '管理后台可以正常使用',
    yellowExplain: '管理后台基本可用，部分高级功能还在完善',
    redExplain: '管理后台暂时无法访问',
    icon: '🛠️',
    category: 'basic'
  },
  'api_health': {
    title: '接口正常',
    greenText: '全部正常',
    yellowText: '大部分正常',
    redText: '有问题',
    greenExplain: '所有数据接口都能正常响应',
    yellowExplain: '主要接口正常，个别接口响应稍慢',
    redExplain: '部分接口有问题，可能影响使用',
    icon: '🔌',
    category: 'basic'
  },

  // 安全性
  'ssl_certificate': {
    title: '安全证书',
    greenText: '已启用',
    yellowText: '即将过期',
    redText: '未配置',
    greenExplain: '网站已启用HTTPS加密，数据传输安全',
    yellowExplain: '安全证书即将过期，我们会及时更新',
    redExplain: '安全证书未配置，我们正在处理',
    icon: '🔒',
    category: 'security'
  },
  'security_headers': {
    title: '安全防护',
    greenText: '已启用',
    yellowText: '部分启用',
    redText: '未配置',
    greenExplain: '已启用多重安全防护，保护您的数据',
    yellowExplain: '基础安全防护已启用，高级防护正在配置',
    redExplain: '安全防护还在配置中',
    icon: '🛡️',
    category: 'security'
  },
  'vulnerability_scan': {
    title: '漏洞扫描',
    greenText: '无漏洞',
    yellowText: '低风险',
    redText: '有风险',
    greenExplain: '安全扫描通过，未发现安全漏洞',
    yellowExplain: '发现一些低风险项，不影响使用，我们会逐步优化',
    redExplain: '发现安全风险，我们正在紧急处理',
    icon: '🔍',
    category: 'security'
  },
  'auth_security': {
    title: '登录安全',
    greenText: '非常安全',
    yellowText: '基本安全',
    redText: '需加强',
    greenExplain: '采用业界最高标准的登录安全机制',
    yellowExplain: '基础登录安全已配置，高级功能正在完善',
    redExplain: '登录安全措施需要加强',
    icon: '🔑',
    category: 'security'
  },

  // 速度性能
  'lighthouse_score': {
    title: '网页速度',
    greenText: '很快',
    yellowText: '还行',
    redText: '较慢',
    greenExplain: '网页加载速度很快，用户体验优秀',
    yellowExplain: '网页加载速度中等，可以正常使用',
    redExplain: '网页加载较慢，我们正在优化',
    icon: '⚡',
    category: 'speed'
  },
  'response_time': {
    title: '响应速度',
    greenText: '很快',
    yellowText: '正常',
    redText: '较慢',
    greenExplain: '点击操作响应很快，体验流畅',
    yellowExplain: '响应速度正常，不影响使用',
    redExplain: '响应稍慢，我们正在优化',
    icon: '🚀',
    category: 'speed'
  },
  'uptime': {
    title: '稳定性',
    greenText: '非常稳定',
    yellowText: '基本稳定',
    redText: '不太稳定',
    greenExplain: '系统运行非常稳定，可用率99.9%以上',
    yellowExplain: '系统基本稳定，偶尔可能有短暂波动',
    redExplain: '系统稳定性还需提升，我们正在优化',
    icon: '📊',
    category: 'speed'
  },
  'error_rate': {
    title: '出错率',
    greenText: '几乎不出错',
    yellowText: '偶尔出错',
    redText: '经常出错',
    greenExplain: '系统运行良好，错误率极低',
    yellowExplain: '偶尔可能遇到小问题，重试即可解决',
    redExplain: '出错率较高，我们正在修复',
    icon: '✅',
    category: 'speed'
  },

  // 手机适配
  'mobile_responsive': {
    title: '手机显示',
    greenText: '完美适配',
    yellowText: '基本适配',
    redText: '需要优化',
    greenExplain: '在手机上显示效果很好',
    yellowExplain: '手机上可以使用，部分页面显示还在优化',
    redExplain: '手机显示效果还需要改进',
    icon: '📱',
    category: 'mobile'
  },
  'touch_friendly': {
    title: '触控操作',
    greenText: '很好用',
    yellowText: '基本好用',
    redText: '不太好用',
    greenExplain: '触控操作体验很好，按钮大小合适',
    yellowExplain: '触控操作基本流畅',
    redExplain: '部分按钮可能不太好点击',
    icon: '👆',
    category: 'mobile'
  },

  // 数据安全
  'database_connection': {
    title: '数据库连接',
    greenText: '正常',
    yellowText: '偶尔波动',
    redText: '有问题',
    greenExplain: '数据库连接稳定，数据读写正常',
    yellowExplain: '数据库连接基本正常，偶尔可能有短暂延迟',
    redExplain: '数据库连接有问题，我们正在处理',
    icon: '💾',
    category: 'data'
  },
  'backup_configured': {
    title: '数据备份',
    greenText: '已配置',
    yellowText: '部分配置',
    redText: '未配置',
    greenExplain: '数据自动备份已配置，您的数据很安全',
    yellowExplain: '基础备份已配置，完整备份策略正在完善',
    redExplain: '数据备份还在配置中',
    icon: '☁️',
    category: 'data'
  },
  'data_encryption': {
    title: '数据加密',
    greenText: '已加密',
    yellowText: '部分加密',
    redText: '未加密',
    greenExplain: '敏感数据已加密存储，非常安全',
    yellowExplain: '核心数据已加密，其他数据加密正在配置',
    redExplain: '数据加密还在配置中',
    icon: '🔐',
    category: 'data'
  }
}

/** 类别人话名称 */
const CATEGORY_NAMES: Record<CheckCategory, { name: string; icon: string; description: string }> = {
  basic: {
    name: '基础功能',
    icon: '🏗️',
    description: '网站的基本功能是否正常'
  },
  security: {
    name: '安全性',
    icon: '🔒',
    description: '您的数据是否安全'
  },
  speed: {
    name: '速度性能',
    icon: '⚡',
    description: '网站跑得快不快'
  },
  mobile: {
    name: '手机适配',
    icon: '📱',
    description: '手机上能不能好好用'
  },
  data: {
    name: '数据安全',
    icon: '💾',
    description: '数据会不会丢'
  }
}

/** 结论模板 */
const CONCLUSION_TEMPLATES = {
  allGreen: {
    headline: '太棒了！产品已准备好！',
    headlineIcon: '🎉',
    summary: '我们检查了所有项目，全部通过！',
    confidenceText: '非常可靠',
    actionText: '您可以放心使用'
  },
  mostlyGreen: {
    headline: '产品已准备好！',
    headlineIcon: '✅',
    summary: '绝大部分检查都通过了，有几个小细节还在优化',
    confidenceText: '可靠',
    actionText: '可以正常使用，我们会继续优化'
  },
  someYellow: {
    headline: '产品基本可用',
    headlineIcon: '👍',
    summary: '主要功能正常，有一些小问题正在处理',
    confidenceText: '基本可靠',
    actionText: '可以开始使用，我们会尽快完善'
  },
  hasRed: {
    headline: '还有一些问题需要处理',
    headlineIcon: '🔧',
    summary: '发现了一些问题，我们正在紧急处理',
    confidenceText: '需要改进',
    actionText: '建议等我们修复后再使用'
  },
  critical: {
    headline: '抱歉，还需要一点时间',
    headlineIcon: '⚠️',
    summary: '发现了一些重要问题，我们正在全力修复',
    confidenceText: '正在修复中',
    actionText: '请稍等，我们会尽快处理好'
  }
}

// ============================================
// 服务实现
// ============================================

export class QualityRedGreenLightService {

  /**
   * 将技术测试结果转换为红绿灯报告
   */
  async convertToTrafficLight(params: {
    projectId: string
    projectName: string
    technicalResults: TechnicalTestResult[]
  }): Promise<TrafficLightReport> {
    const { projectId, projectName, technicalResults } = params

    // 1. 转换每个检查项
    const checkItems: CheckItemResult[] = technicalResults.map(result =>
      this.convertSingleResult(result)
    )

    // 2. 按类别分组
    const categories = this.groupByCategory(checkItems)

    // 3. 计算统计
    const stats = this.calculateStats(checkItems)

    // 4. 生成总体结论
    const conclusion = this.generateConclusion(stats, checkItems)

    // 5. 确定可执行操作
    const actions = this.determineActions(stats, checkItems)

    return {
      projectId,
      projectName,
      generatedAt: new Date(),
      conclusion,
      categories,
      stats,
      actions
    }
  }

  /**
   * 快速生成红绿灯（用于实时显示）
   */
  quickTrafficLight(technicalResults: TechnicalTestResult[]): {
    status: TrafficLightStatus
    icon: string
    text: string
    passRate: number
  } {
    const passed = technicalResults.filter(r => this.isGreen(r)).length
    const total = technicalResults.length
    const passRate = total > 0 ? Math.round((passed / total) * 100) : 0

    const hasRed = technicalResults.some(r => this.isRed(r))
    const hasYellow = technicalResults.some(r => this.isYellow(r))

    if (hasRed) {
      return { status: 'red', icon: '🔴', text: '有问题需要处理', passRate }
    } else if (hasYellow) {
      return { status: 'yellow', icon: '🟡', text: '基本正常，有小问题', passRate }
    } else {
      return { status: 'green', icon: '🟢', text: '一切正常', passRate }
    }
  }

  /**
   * 生成简洁的人话摘要
   */
  generateHumanSummary(report: TrafficLightReport): string {
    const { stats, conclusion } = report

    const lines: string[] = []

    // 总体状态
    lines.push(`${conclusion.headlineIcon} ${conclusion.headline}`)
    lines.push('')

    // 统计
    lines.push(`我们检查了 ${stats.totalChecks} 项：`)
    if (stats.greenCount > 0) {
      lines.push(`  ✅ ${stats.greenCount} 项完全正常`)
    }
    if (stats.yellowCount > 0) {
      lines.push(`  ⚠️ ${stats.yellowCount} 项有小问题（不影响使用）`)
    }
    if (stats.redCount > 0) {
      lines.push(`  ❌ ${stats.redCount} 项需要修复`)
    }

    lines.push('')
    lines.push(`通过率：${stats.passRate}%`)
    lines.push('')
    lines.push(`${conclusion.actionText}`)

    return lines.join('\n')
  }

  /**
   * 生成用于显示的检查清单
   */
  generateChecklist(report: TrafficLightReport): string {
    const lines: string[] = []

    for (const category of report.categories) {
      lines.push(`${category.categoryIcon} ${category.categoryName}`)

      for (const item of category.items) {
        const statusIcon = item.humanStatus === 'green' ? '✅'
          : item.humanStatus === 'yellow' ? '⚠️' : '❌'
        lines.push(`  ${statusIcon} ${item.humanTitle}：${item.humanStatusText}`)
        if (item.humanStatus !== 'green' && item.humanSuggestion) {
          lines.push(`      → ${item.humanSuggestion}`)
        }
      }
      lines.push('')
    }

    return lines.join('\n')
  }

  /**
   * 生成精美的HTML报告页面
   */
  generateReportHtml(report: TrafficLightReport): string {
    const statusColors = {
      green: '#10B981',
      yellow: '#F59E0B',
      red: '#EF4444'
    }

    const statusBg = {
      green: '#ECFDF5',
      yellow: '#FFFBEB',
      red: '#FEF2F2'
    }

    const conclusionColor = statusColors[report.conclusion.status]
    const conclusionBg = statusBg[report.conclusion.status]

    return `<!DOCTYPE html>
<html lang="zh-CN">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>产品质量报告 - ${report.projectName}</title>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
      background: #F9FAFB;
      color: #1F2937;
      line-height: 1.6;
    }
    .container { max-width: 600px; margin: 0 auto; padding: 20px; }

    /* 顶部结论卡片 */
    .conclusion-card {
      background: ${conclusionBg};
      border: 2px solid ${conclusionColor};
      border-radius: 16px;
      padding: 32px;
      text-align: center;
      margin-bottom: 24px;
    }
    .conclusion-icon { font-size: 64px; margin-bottom: 16px; }
    .conclusion-headline {
      font-size: 24px;
      font-weight: 700;
      color: ${conclusionColor};
      margin-bottom: 8px;
    }
    .conclusion-summary {
      font-size: 16px;
      color: #6B7280;
      margin-bottom: 16px;
    }
    .confidence-badge {
      display: inline-block;
      background: white;
      border: 1px solid ${conclusionColor};
      color: ${conclusionColor};
      padding: 8px 16px;
      border-radius: 20px;
      font-size: 14px;
      font-weight: 500;
    }

    /* 统计卡片 */
    .stats-card {
      background: white;
      border-radius: 12px;
      padding: 20px;
      margin-bottom: 24px;
      box-shadow: 0 1px 3px rgba(0,0,0,0.1);
    }
    .stats-grid {
      display: grid;
      grid-template-columns: repeat(3, 1fr);
      gap: 16px;
      text-align: center;
    }
    .stat-item { }
    .stat-number { font-size: 32px; font-weight: 700; }
    .stat-number.green { color: #10B981; }
    .stat-number.yellow { color: #F59E0B; }
    .stat-number.red { color: #EF4444; }
    .stat-label { font-size: 14px; color: #6B7280; }

    /* 类别检查 */
    .category-section {
      background: white;
      border-radius: 12px;
      margin-bottom: 16px;
      overflow: hidden;
      box-shadow: 0 1px 3px rgba(0,0,0,0.1);
    }
    .category-header {
      padding: 16px 20px;
      background: #F9FAFB;
      border-bottom: 1px solid #E5E7EB;
      display: flex;
      align-items: center;
      justify-content: space-between;
    }
    .category-title {
      font-size: 16px;
      font-weight: 600;
      display: flex;
      align-items: center;
      gap: 8px;
    }
    .category-status {
      font-size: 14px;
      padding: 4px 12px;
      border-radius: 12px;
    }
    .category-status.green { background: #ECFDF5; color: #059669; }
    .category-status.yellow { background: #FFFBEB; color: #D97706; }
    .category-status.red { background: #FEF2F2; color: #DC2626; }

    .check-item {
      padding: 16px 20px;
      border-bottom: 1px solid #F3F4F6;
      display: flex;
      align-items: flex-start;
      gap: 12px;
    }
    .check-item:last-child { border-bottom: none; }
    .check-icon { font-size: 20px; flex-shrink: 0; }
    .check-content { flex: 1; }
    .check-title {
      font-weight: 500;
      margin-bottom: 4px;
      display: flex;
      align-items: center;
      gap: 8px;
    }
    .check-status {
      font-size: 12px;
      padding: 2px 8px;
      border-radius: 4px;
    }
    .check-status.green { background: #ECFDF5; color: #059669; }
    .check-status.yellow { background: #FFFBEB; color: #D97706; }
    .check-status.red { background: #FEF2F2; color: #DC2626; }
    .check-explain { font-size: 14px; color: #6B7280; }
    .check-suggestion {
      margin-top: 8px;
      font-size: 13px;
      color: #F59E0B;
      background: #FFFBEB;
      padding: 8px 12px;
      border-radius: 6px;
    }

    /* 操作按钮 */
    .actions {
      display: flex;
      gap: 12px;
      margin-top: 24px;
    }
    .btn {
      flex: 1;
      padding: 16px;
      border-radius: 12px;
      font-size: 16px;
      font-weight: 600;
      text-align: center;
      cursor: pointer;
      border: none;
      text-decoration: none;
      display: block;
    }
    .btn-primary {
      background: ${conclusionColor};
      color: white;
    }
    .btn-secondary {
      background: #F3F4F6;
      color: #374151;
    }

    /* 页脚 */
    .footer {
      text-align: center;
      padding: 24px;
      color: #9CA3AF;
      font-size: 14px;
    }
  </style>
</head>
<body>
  <div class="container">
    <!-- 总体结论 -->
    <div class="conclusion-card">
      <div class="conclusion-icon">${report.conclusion.headlineIcon}</div>
      <h1 class="conclusion-headline">${report.conclusion.headline}</h1>
      <p class="conclusion-summary">${report.conclusion.summary}</p>
      <div class="confidence-badge">
        可靠度：${report.conclusion.confidenceText}（${report.conclusion.confidenceScore}%）
      </div>
    </div>

    <!-- 统计 -->
    <div class="stats-card">
      <div class="stats-grid">
        <div class="stat-item">
          <div class="stat-number green">${report.stats.greenCount}</div>
          <div class="stat-label">✅ 通过</div>
        </div>
        <div class="stat-item">
          <div class="stat-number yellow">${report.stats.yellowCount}</div>
          <div class="stat-label">⚠️ 小问题</div>
        </div>
        <div class="stat-item">
          <div class="stat-number red">${report.stats.redCount}</div>
          <div class="stat-label">❌ 需修复</div>
        </div>
      </div>
    </div>

    <!-- 分类检查 -->
    ${report.categories.map(cat => `
    <div class="category-section">
      <div class="category-header">
        <div class="category-title">
          <span>${cat.categoryIcon}</span>
          <span>${cat.categoryName}</span>
        </div>
        <div class="category-status ${cat.status}">
          ${cat.passedCount}/${cat.totalCount} 通过
        </div>
      </div>
      ${cat.items.map(item => `
      <div class="check-item">
        <div class="check-icon">${item.icon}</div>
        <div class="check-content">
          <div class="check-title">
            ${item.humanTitle}
            <span class="check-status ${item.humanStatus}">${item.humanStatusText}</span>
          </div>
          <div class="check-explain">${item.humanExplanation}</div>
          ${item.humanSuggestion ? `
          <div class="check-suggestion">💡 ${item.humanSuggestion}</div>
          ` : ''}
        </div>
      </div>
      `).join('')}
    </div>
    `).join('')}

    <!-- 操作按钮 -->
    <div class="actions">
      ${report.actions.canAccept ? `
      <a href="#accept" class="btn btn-primary">确认接收产品</a>
      ` : `
      <a href="#contact" class="btn btn-primary">联系客服</a>
      `}
      <a href="#details" class="btn btn-secondary">查看详细报告</a>
    </div>

    <div class="footer">
      报告生成时间：${report.generatedAt.toLocaleString('zh-CN')}<br>
      ${report.projectName} · Thinkus 出品
    </div>
  </div>
</body>
</html>`
  }

  // ============================================
  // 私有方法
  // ============================================

  private convertSingleResult(result: TechnicalTestResult): CheckItemResult {
    const mapping = TECH_TO_HUMAN_MAP[result.checkId]

    if (!mapping) {
      // 未知检查项，使用通用转换
      return this.convertUnknownResult(result)
    }

    const status = this.determineStatus(result)

    return {
      id: result.checkId,
      category: mapping.category,
      technicalName: result.checkId,
      technicalValue: result.value,
      technicalPassed: result.passed,
      humanTitle: mapping.title,
      humanStatus: status,
      humanStatusText: status === 'green' ? mapping.greenText
        : status === 'yellow' ? mapping.yellowText : mapping.redText,
      humanExplanation: status === 'green' ? mapping.greenExplain
        : status === 'yellow' ? mapping.yellowExplain : mapping.redExplain,
      humanSuggestion: status !== 'green' ? this.generateSuggestion(result, status) : undefined,
      icon: mapping.icon
    }
  }

  private convertUnknownResult(result: TechnicalTestResult): CheckItemResult {
    const status = this.determineStatus(result)

    return {
      id: result.checkId,
      category: 'basic',
      technicalName: result.checkId,
      technicalValue: result.value,
      technicalPassed: result.passed,
      humanTitle: this.humanizeCheckName(result.checkId),
      humanStatus: status,
      humanStatusText: status === 'green' ? '正常' : status === 'yellow' ? '需关注' : '有问题',
      humanExplanation: result.passed
        ? '这项检查已通过'
        : '这项检查需要关注',
      humanSuggestion: status !== 'green' ? '我们正在处理' : undefined,
      icon: '🔧'
    }
  }

  private determineStatus(result: TechnicalTestResult): TrafficLightStatus {
    if (result.passed) {
      return 'green'
    }

    // 根据严重程度判断黄灯还是红灯
    if (result.severity === 'critical' || result.severity === 'blocker') {
      return 'red'
    }

    if (result.severity === 'warning' || result.severity === 'minor') {
      return 'yellow'
    }

    // 默认：未通过 = 红灯
    return 'red'
  }

  private isGreen(result: TechnicalTestResult): boolean {
    return result.passed
  }

  private isYellow(result: TechnicalTestResult): boolean {
    return !result.passed && (result.severity === 'warning' || result.severity === 'minor')
  }

  private isRed(result: TechnicalTestResult): boolean {
    return !result.passed && result.severity !== 'warning' && result.severity !== 'minor'
  }

  private generateSuggestion(result: TechnicalTestResult, status: TrafficLightStatus): string {
    if (status === 'yellow') {
      return '这是一个小问题，不影响使用，我们会尽快优化'
    }
    return '我们正在处理这个问题，请稍等'
  }

  private humanizeCheckName(checkId: string): string {
    // 将 snake_case 转换为人话
    return checkId
      .split('_')
      .map(word => word.charAt(0).toUpperCase() + word.slice(1))
      .join(' ')
  }

  private groupByCategory(items: CheckItemResult[]): TrafficLightReport['categories'] {
    const groups: Record<CheckCategory, CheckItemResult[]> = {
      basic: [],
      security: [],
      speed: [],
      mobile: [],
      data: []
    }

    for (const item of items) {
      groups[item.category].push(item)
    }

    return Object.entries(groups)
      .filter(([_, items]) => items.length > 0)
      .map(([category, items]) => {
        const catInfo = CATEGORY_NAMES[category as CheckCategory]
        const passedCount = items.filter(i => i.humanStatus === 'green').length
        const hasRed = items.some(i => i.humanStatus === 'red')
        const hasYellow = items.some(i => i.humanStatus === 'yellow')

        return {
          category: category as CheckCategory,
          categoryName: catInfo.name,
          categoryIcon: catInfo.icon,
          status: hasRed ? 'red' as const : hasYellow ? 'yellow' as const : 'green' as const,
          items,
          passedCount,
          totalCount: items.length
        }
      })
  }

  private calculateStats(items: CheckItemResult[]): TrafficLightReport['stats'] {
    const greenCount = items.filter(i => i.humanStatus === 'green').length
    const yellowCount = items.filter(i => i.humanStatus === 'yellow').length
    const redCount = items.filter(i => i.humanStatus === 'red').length
    const total = items.length

    return {
      totalChecks: total,
      greenCount,
      yellowCount,
      redCount,
      passRate: total > 0 ? Math.round((greenCount / total) * 100) : 0
    }
  }

  private generateConclusion(
    stats: TrafficLightReport['stats'],
    items: CheckItemResult[]
  ): OverallConclusion {
    const { greenCount, yellowCount, redCount, totalChecks, passRate } = stats

    let template: typeof CONCLUSION_TEMPLATES[keyof typeof CONCLUSION_TEMPLATES]
    let status: TrafficLightStatus
    let confidenceScore: number

    if (redCount === 0 && yellowCount === 0) {
      template = CONCLUSION_TEMPLATES.allGreen
      status = 'green'
      confidenceScore = 98
    } else if (redCount === 0 && yellowCount <= 2) {
      template = CONCLUSION_TEMPLATES.mostlyGreen
      status = 'green'
      confidenceScore = 90
    } else if (redCount === 0) {
      template = CONCLUSION_TEMPLATES.someYellow
      status = 'yellow'
      confidenceScore = 80
    } else if (redCount <= 2) {
      template = CONCLUSION_TEMPLATES.hasRed
      status = 'red'
      confidenceScore = 60
    } else {
      template = CONCLUSION_TEMPLATES.critical
      status = 'red'
      confidenceScore = 40
    }

    const details: string[] = []
    if (greenCount > 0) {
      details.push(`${greenCount} 项检查完全通过`)
    }
    if (yellowCount > 0) {
      details.push(`${yellowCount} 项有小问题，不影响使用`)
    }
    if (redCount > 0) {
      details.push(`${redCount} 项需要修复，我们正在处理`)
    }

    return {
      status,
      headline: template.headline,
      headlineIcon: template.headlineIcon,
      summary: template.summary,
      details,
      actionNeeded: redCount > 0,
      actionText: template.actionText,
      confidenceScore,
      confidenceText: template.confidenceText
    }
  }

  private determineActions(
    stats: TrafficLightReport['stats'],
    items: CheckItemResult[]
  ): TrafficLightReport['actions'] {
    const hasBlocker = items.some(i =>
      i.humanStatus === 'red' &&
      (i.id === 'homepage_load' || i.id === 'user_login' || i.id === 'ssl_certificate')
    )

    return {
      canAccept: stats.redCount === 0 || !hasBlocker,
      canRequestFix: stats.redCount > 0 || stats.yellowCount > 0,
      canContactSupport: true
    }
  }
}

// ============================================
// 技术测试结果接口（输入）
// ============================================

export interface TechnicalTestResult {
  checkId: string
  passed: boolean
  value: string | number | boolean
  severity?: 'blocker' | 'critical' | 'warning' | 'minor' | 'info'
  message?: string
}

// ============================================
// 导出单例
// ============================================

export const qualityRedGreenLight = new QualityRedGreenLightService()
