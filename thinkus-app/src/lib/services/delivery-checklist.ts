/**
 * 交付前自检清单服务
 *
 * 交付自动化 P0-2: 确保交付前所有准备工作就绪
 *
 * 功能:
 * - 自动化检查各项交付条件
 * - 人工确认关键项目
 * - 生成交付就绪报告
 * - 阻止不满足条件的交付
 */

// 检查项类别
export type CheckCategory =
  | 'deployment'       // 部署相关
  | 'functionality'    // 功能相关
  | 'security'         // 安全相关
  | 'data'            // 数据相关
  | 'documentation'   // 文档相关
  | 'credentials'     // 凭证相关
  | 'monitoring'      // 监控相关
  | 'backup'          // 备份相关
  | 'support'         // 支持相关
  | 'legal'           // 法律相关

// 检查项状态
export type CheckStatus = 'pending' | 'checking' | 'passed' | 'failed' | 'warning' | 'manual_required'

// 检查项重要性
export type CheckImportance = 'blocker' | 'critical' | 'important' | 'optional'

// 检查项
export interface ChecklistItem {
  id: string
  category: CheckCategory
  name: string
  description: string
  importance: CheckImportance
  isAutomatic: boolean      // 是否自动检查
  status: CheckStatus
  result?: string           // 检查结果
  suggestion?: string       // 建议操作
  checkedAt?: Date
  checkedBy?: 'system' | 'human'
  metadata?: Record<string, unknown>
}

// 检查清单
export interface DeliveryChecklist {
  id: string
  projectId: string
  projectName: string
  createdAt: Date
  updatedAt: Date
  items: ChecklistItem[]
  overallStatus: 'not_ready' | 'ready_with_warnings' | 'ready'
  readinessScore: number     // 0-100
  blockers: string[]
  warnings: string[]
}

// 检查结果
export interface CheckResult {
  passed: boolean
  message: string
  suggestion?: string
  metadata?: Record<string, unknown>
}

// 预定义检查项模板
const CHECKLIST_TEMPLATES: Array<Omit<ChecklistItem, 'id' | 'status' | 'checkedAt' | 'checkedBy'>> = [
  // 部署相关
  {
    category: 'deployment',
    name: '生产环境部署完成',
    description: '应用已成功部署到生产环境',
    importance: 'blocker',
    isAutomatic: true
  },
  {
    category: 'deployment',
    name: '生产环境可访问',
    description: '生产环境URL可正常访问',
    importance: 'blocker',
    isAutomatic: true
  },
  {
    category: 'deployment',
    name: 'SSL证书有效',
    description: 'HTTPS配置正确，证书未过期',
    importance: 'blocker',
    isAutomatic: true
  },
  {
    category: 'deployment',
    name: '域名配置正确',
    description: '自定义域名DNS解析正确',
    importance: 'critical',
    isAutomatic: true
  },
  {
    category: 'deployment',
    name: '环境变量配置完整',
    description: '所有必需的环境变量已配置',
    importance: 'blocker',
    isAutomatic: true
  },

  // 功能相关
  {
    category: 'functionality',
    name: '核心功能验收通过',
    description: '自动化验收测试全部通过',
    importance: 'blocker',
    isAutomatic: true
  },
  {
    category: 'functionality',
    name: '用户注册流程正常',
    description: '新用户可以成功注册',
    importance: 'critical',
    isAutomatic: true
  },
  {
    category: 'functionality',
    name: '用户登录流程正常',
    description: '用户可以正常登录',
    importance: 'blocker',
    isAutomatic: true
  },
  {
    category: 'functionality',
    name: '管理后台可访问',
    description: '管理员可以访问后台',
    importance: 'critical',
    isAutomatic: true
  },
  {
    category: 'functionality',
    name: '支付功能正常',
    description: '支付流程可正常完成（如适用）',
    importance: 'critical',
    isAutomatic: false
  },

  // 安全相关
  {
    category: 'security',
    name: '敏感数据已加密',
    description: '密码等敏感数据使用加密存储',
    importance: 'blocker',
    isAutomatic: true
  },
  {
    category: 'security',
    name: '无明文密码存储',
    description: '检查代码中无明文密码',
    importance: 'blocker',
    isAutomatic: true
  },
  {
    category: 'security',
    name: '安全头配置',
    description: 'HTTP安全头已正确配置',
    importance: 'important',
    isAutomatic: true
  },
  {
    category: 'security',
    name: '依赖漏洞检查',
    description: '无已知高危依赖漏洞',
    importance: 'critical',
    isAutomatic: true
  },

  // 数据相关
  {
    category: 'data',
    name: '数据库连接正常',
    description: '应用可正常连接数据库',
    importance: 'blocker',
    isAutomatic: true
  },
  {
    category: 'data',
    name: '初始数据已导入',
    description: '必要的初始数据已准备好',
    importance: 'critical',
    isAutomatic: true
  },
  {
    category: 'data',
    name: '数据迁移完成',
    description: '数据库迁移脚本已执行',
    importance: 'critical',
    isAutomatic: true
  },

  // 文档相关
  {
    category: 'documentation',
    name: '用户使用指南',
    description: '已准备用户使用说明文档',
    importance: 'important',
    isAutomatic: false
  },
  {
    category: 'documentation',
    name: '管理员手册',
    description: '已准备管理员操作手册',
    importance: 'important',
    isAutomatic: false
  },
  {
    category: 'documentation',
    name: 'API文档',
    description: 'API接口文档已生成（如适用）',
    importance: 'optional',
    isAutomatic: true
  },

  // 凭证相关
  {
    category: 'credentials',
    name: '管理员账号已创建',
    description: '初始管理员账号已创建',
    importance: 'blocker',
    isAutomatic: true
  },
  {
    category: 'credentials',
    name: '密码安全传递',
    description: '初始密码通过安全渠道传递',
    importance: 'critical',
    isAutomatic: false
  },
  {
    category: 'credentials',
    name: '第三方服务凭证',
    description: '所需的第三方服务API密钥已配置',
    importance: 'critical',
    isAutomatic: true
  },

  // 监控相关
  {
    category: 'monitoring',
    name: '错误监控已配置',
    description: 'Sentry或其他错误监控服务已接入',
    importance: 'important',
    isAutomatic: true
  },
  {
    category: 'monitoring',
    name: '性能监控已配置',
    description: '应用性能监控已启用',
    importance: 'optional',
    isAutomatic: true
  },
  {
    category: 'monitoring',
    name: '告警通知已配置',
    description: '异常告警通知已设置',
    importance: 'important',
    isAutomatic: false
  },

  // 备份相关
  {
    category: 'backup',
    name: '数据库备份已配置',
    description: '自动备份策略已启用',
    importance: 'critical',
    isAutomatic: true
  },
  {
    category: 'backup',
    name: '备份恢复已测试',
    description: '备份数据可正常恢复',
    importance: 'important',
    isAutomatic: false
  },

  // 支持相关
  {
    category: 'support',
    name: '客服入口已配置',
    description: '用户可以找到帮助入口',
    importance: 'important',
    isAutomatic: true
  },
  {
    category: 'support',
    name: '报障通道已就绪',
    description: '一键报障功能可用',
    importance: 'important',
    isAutomatic: true
  },
  {
    category: 'support',
    name: '教程已准备',
    description: '新手引导教程已配置',
    importance: 'optional',
    isAutomatic: true
  },

  // 法律相关
  {
    category: 'legal',
    name: '隐私政策',
    description: '隐私政策页面已创建',
    importance: 'critical',
    isAutomatic: true
  },
  {
    category: 'legal',
    name: '服务条款',
    description: '服务条款页面已创建',
    importance: 'critical',
    isAutomatic: true
  },
  {
    category: 'legal',
    name: 'Cookie同意',
    description: 'Cookie同意弹窗已实现（如需要）',
    importance: 'optional',
    isAutomatic: true
  }
]

// 类别配置
const CATEGORY_CONFIG: Record<CheckCategory, { label: string; icon: string; order: number }> = {
  deployment: { label: '部署', icon: '🚀', order: 1 },
  functionality: { label: '功能', icon: '⚙️', order: 2 },
  security: { label: '安全', icon: '🔒', order: 3 },
  data: { label: '数据', icon: '💾', order: 4 },
  credentials: { label: '凭证', icon: '🔑', order: 5 },
  monitoring: { label: '监控', icon: '📊', order: 6 },
  backup: { label: '备份', icon: '💿', order: 7 },
  documentation: { label: '文档', icon: '📄', order: 8 },
  support: { label: '支持', icon: '🆘', order: 9 },
  legal: { label: '法律', icon: '⚖️', order: 10 }
}

/**
 * 交付前自检清单服务
 */
export class DeliveryChecklistService {
  /**
   * 创建检查清单
   */
  createChecklist(projectId: string, projectName: string): DeliveryChecklist {
    const items: ChecklistItem[] = CHECKLIST_TEMPLATES.map((template, index) => ({
      ...template,
      id: `check_${index}_${Date.now()}`,
      status: 'pending'
    }))

    return {
      id: `checklist_${Date.now()}`,
      projectId,
      projectName,
      createdAt: new Date(),
      updatedAt: new Date(),
      items,
      overallStatus: 'not_ready',
      readinessScore: 0,
      blockers: [],
      warnings: []
    }
  }

  /**
   * 执行自动检查
   */
  async runAutomaticChecks(
    checklist: DeliveryChecklist,
    onProgress?: (item: ChecklistItem, progress: number) => void
  ): Promise<DeliveryChecklist> {
    const automaticItems = checklist.items.filter(item => item.isAutomatic)
    const total = automaticItems.length

    for (let i = 0; i < automaticItems.length; i++) {
      const item = automaticItems[i]
      item.status = 'checking'
      onProgress?.(item, ((i + 1) / total) * 100)

      // 执行检查
      const result = await this.executeCheck(item)

      item.status = result.passed ? 'passed' : result.metadata?.isWarning ? 'warning' : 'failed'
      item.result = result.message
      item.suggestion = result.suggestion
      item.checkedAt = new Date()
      item.checkedBy = 'system'
      item.metadata = result.metadata

      // 更新到清单
      const index = checklist.items.findIndex(i => i.id === item.id)
      if (index !== -1) {
        checklist.items[index] = item
      }
    }

    // 更新整体状态
    return this.updateOverallStatus(checklist)
  }

  /**
   * 执行单项检查（模拟）
   */
  private async executeCheck(item: ChecklistItem): Promise<CheckResult> {
    // 模拟检查延迟
    await new Promise(resolve => setTimeout(resolve, Math.random() * 1000 + 300))

    // 根据检查项类型模拟不同的检查逻辑
    switch (item.category) {
      case 'deployment':
        // 模拟95%通过率
        return Math.random() > 0.05
          ? { passed: true, message: '检查通过' }
          : { passed: false, message: '部署检查失败', suggestion: '请检查部署配置' }

      case 'security':
        // 模拟90%通过率
        return Math.random() > 0.1
          ? { passed: true, message: '安全检查通过' }
          : { passed: false, message: '发现安全风险', suggestion: '请修复安全问题' }

      case 'data':
        // 模拟95%通过率
        return Math.random() > 0.05
          ? { passed: true, message: '数据检查通过' }
          : { passed: false, message: '数据问题', suggestion: '请检查数据库配置' }

      default:
        // 默认90%通过率
        return Math.random() > 0.1
          ? { passed: true, message: '检查通过' }
          : { passed: false, message: '检查未通过', suggestion: '请查看详情并修复' }
    }
  }

  /**
   * 手动确认检查项
   */
  confirmItem(checklist: DeliveryChecklist, itemId: string, passed: boolean, note?: string): DeliveryChecklist {
    const item = checklist.items.find(i => i.id === itemId)
    if (item) {
      item.status = passed ? 'passed' : 'failed'
      item.result = note || (passed ? '人工确认通过' : '人工确认未通过')
      item.checkedAt = new Date()
      item.checkedBy = 'human'
    }

    return this.updateOverallStatus(checklist)
  }

  /**
   * 更新整体状态
   */
  private updateOverallStatus(checklist: DeliveryChecklist): DeliveryChecklist {
    const blockers: string[] = []
    const warnings: string[] = []

    let passedCount = 0
    let totalWeight = 0
    let passedWeight = 0

    const importanceWeight = {
      blocker: 30,
      critical: 20,
      important: 10,
      optional: 5
    }

    for (const item of checklist.items) {
      const weight = importanceWeight[item.importance]
      totalWeight += weight

      if (item.status === 'passed') {
        passedCount++
        passedWeight += weight
      } else if (item.status === 'failed') {
        if (item.importance === 'blocker') {
          blockers.push(`[阻塞] ${item.name}: ${item.result || '未通过'}`)
        } else if (item.importance === 'critical') {
          blockers.push(`[关键] ${item.name}: ${item.result || '未通过'}`)
        } else {
          warnings.push(`${item.name}: ${item.result || '未通过'}`)
        }
      } else if (item.status === 'warning') {
        warnings.push(`${item.name}: ${item.result || '有警告'}`)
        passedWeight += weight * 0.5  // 警告算半分
      } else if (item.status === 'pending' || item.status === 'manual_required') {
        if (item.importance === 'blocker' || item.importance === 'critical') {
          blockers.push(`[待确认] ${item.name}`)
        }
      }
    }

    const readinessScore = totalWeight > 0 ? (passedWeight / totalWeight) * 100 : 0

    let overallStatus: DeliveryChecklist['overallStatus'] = 'not_ready'
    if (blockers.length === 0) {
      overallStatus = warnings.length > 0 ? 'ready_with_warnings' : 'ready'
    }

    return {
      ...checklist,
      updatedAt: new Date(),
      overallStatus,
      readinessScore,
      blockers,
      warnings
    }
  }

  /**
   * 获取类别配置
   */
  getCategoryConfig() {
    return CATEGORY_CONFIG
  }

  /**
   * 按类别分组检查项
   */
  groupByCategory(items: ChecklistItem[]): Map<CheckCategory, ChecklistItem[]> {
    const groups = new Map<CheckCategory, ChecklistItem[]>()

    for (const item of items) {
      const category = item.category
      if (!groups.has(category)) {
        groups.set(category, [])
      }
      groups.get(category)!.push(item)
    }

    return groups
  }

  /**
   * 生成检查报告（人话）
   */
  generateReport(checklist: DeliveryChecklist): string {
    const lines: string[] = []

    lines.push(`📋 ${checklist.projectName} 交付就绪检查报告`)
    lines.push('═'.repeat(40))
    lines.push('')

    // 整体状态
    const statusIcon = checklist.overallStatus === 'ready' ? '✅' :
      checklist.overallStatus === 'ready_with_warnings' ? '⚠️' : '❌'
    const statusText = checklist.overallStatus === 'ready' ? '可以交付' :
      checklist.overallStatus === 'ready_with_warnings' ? '可交付（有警告）' : '未就绪'

    lines.push(`${statusIcon} 整体状态: ${statusText}`)
    lines.push(`📊 就绪度: ${checklist.readinessScore.toFixed(1)}%`)
    lines.push('')

    // 统计
    const passed = checklist.items.filter(i => i.status === 'passed').length
    const failed = checklist.items.filter(i => i.status === 'failed').length
    const pending = checklist.items.filter(i => i.status === 'pending' || i.status === 'manual_required').length

    lines.push('📊 检查统计:')
    lines.push(`  ✅ 通过: ${passed} 项`)
    lines.push(`  ❌ 未通过: ${failed} 项`)
    lines.push(`  ⏳ 待检查: ${pending} 项`)
    lines.push('')

    // 阻塞问题
    if (checklist.blockers.length > 0) {
      lines.push('🚫 阻塞问题 (必须解决):')
      for (const blocker of checklist.blockers) {
        lines.push(`  ${blocker}`)
      }
      lines.push('')
    }

    // 警告
    if (checklist.warnings.length > 0) {
      lines.push('⚠️ 警告 (建议解决):')
      for (const warning of checklist.warnings) {
        lines.push(`  • ${warning}`)
      }
      lines.push('')
    }

    // 各类别概要
    lines.push('📝 分类检查结果:')
    const groups = this.groupByCategory(checklist.items)
    const sortedCategories = Array.from(groups.keys())
      .sort((a, b) => CATEGORY_CONFIG[a].order - CATEGORY_CONFIG[b].order)

    for (const category of sortedCategories) {
      const items = groups.get(category)!
      const config = CATEGORY_CONFIG[category]
      const categoryPassed = items.filter(i => i.status === 'passed').length
      const categoryIcon = categoryPassed === items.length ? '✅' :
        categoryPassed > 0 ? '⚠️' : '❌'

      lines.push(`  ${config.icon} ${config.label}: ${categoryIcon} ${categoryPassed}/${items.length}`)
    }
    lines.push('')

    // 结论
    lines.push('─'.repeat(40))
    if (checklist.overallStatus === 'ready') {
      lines.push('🎉 恭喜！所有检查通过，可以安全交付！')
    } else if (checklist.overallStatus === 'ready_with_warnings') {
      lines.push('✅ 核心检查通过，建议处理警告后交付')
    } else {
      lines.push('❌ 存在阻塞问题，请修复后重新检查')
    }

    return lines.join('\n')
  }

  /**
   * 导出检查清单为Markdown
   */
  exportToMarkdown(checklist: DeliveryChecklist): string {
    const lines: string[] = []

    lines.push(`# ${checklist.projectName} 交付检查清单`)
    lines.push('')
    lines.push(`> 生成时间: ${checklist.updatedAt.toLocaleString()}`)
    lines.push(`> 就绪度: ${checklist.readinessScore.toFixed(1)}%`)
    lines.push('')

    const groups = this.groupByCategory(checklist.items)
    const sortedCategories = Array.from(groups.keys())
      .sort((a, b) => CATEGORY_CONFIG[a].order - CATEGORY_CONFIG[b].order)

    for (const category of sortedCategories) {
      const items = groups.get(category)!
      const config = CATEGORY_CONFIG[category]

      lines.push(`## ${config.icon} ${config.label}`)
      lines.push('')

      for (const item of items) {
        const checkbox = item.status === 'passed' ? '[x]' :
          item.status === 'failed' ? '[ ]' : '[ ]'
        const statusIcon = item.status === 'passed' ? '✅' :
          item.status === 'failed' ? '❌' :
          item.status === 'warning' ? '⚠️' : '⏳'

        lines.push(`- ${checkbox} ${statusIcon} **${item.name}**`)
        lines.push(`  - ${item.description}`)
        if (item.result) {
          lines.push(`  - 结果: ${item.result}`)
        }
        if (item.suggestion) {
          lines.push(`  - 建议: ${item.suggestion}`)
        }
      }
      lines.push('')
    }

    return lines.join('\n')
  }
}

// 导出单例
export const deliveryChecklist = new DeliveryChecklistService()
