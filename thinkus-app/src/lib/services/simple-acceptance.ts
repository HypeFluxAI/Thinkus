/**
 * 小白用户无感验收服务
 *
 * 设计理念：用户只需要回答"能用/不能用"，不需要理解任何技术
 *
 * 流程：
 * 1. AI 引导用户打开产品
 * 2. AI 提问："您看到的是这样吗？"（附截图）
 * 3. 用户只需点击 ✅ 或 ❌
 * 4. 如果 ❌，AI 询问简单问题定位问题
 * 5. 全部确认后，自动生成签收单
 */

// 验收检查项
export interface AcceptanceCheckItem {
  id: string
  order: number
  title: string            // 简单标题（3-5个字）
  question: string         // 简单问题（用户能理解的）
  instruction: string      // 操作指引
  referenceImage?: string  // 参考截图URL
  importance: 'must' | 'should' | 'optional'
}

// 用户反馈
export interface UserFeedback {
  checkId: string
  result: 'good' | 'bad' | 'skip'
  issueType?: SimpleIssueType
  issueNote?: string
  timestamp: Date
}

// 简化的问题类型（用户能理解的）
export type SimpleIssueType =
  | 'cant_see'      // 看不到
  | 'looks_wrong'   // 显示不对
  | 'cant_click'    // 点不了
  | 'too_slow'      // 太慢了
  | 'other'         // 其他

// 验收会话
export interface SimpleAcceptanceSession {
  id: string
  projectId: string
  projectName: string
  userId: string
  userName: string
  userPhone?: string
  productUrl: string
  adminUrl?: string
  checkItems: AcceptanceCheckItem[]
  feedbacks: UserFeedback[]
  currentIndex: number
  status: 'pending' | 'in_progress' | 'completed' | 'issues_found'
  startedAt: Date
  completedAt?: Date
  signedAt?: Date
  signature?: string  // 电子签名
}

// 验收结果
export interface AcceptanceOutcome {
  sessionId: string
  passed: boolean
  passedWithIssues: boolean
  totalChecks: number
  passedChecks: number
  issueChecks: number
  skippedChecks: number
  issues: AcceptanceIssueRecord[]
  signedAt?: Date
  signature?: string
  summary: string  // 人话总结
}

// 问题记录
export interface AcceptanceIssueRecord {
  checkId: string
  checkTitle: string
  issueType: SimpleIssueType
  issueNote?: string
  severity: 'blocker' | 'major' | 'minor'
  resolution?: string
}

// 简化问题类型配置
const ISSUE_TYPE_CONFIG: Record<SimpleIssueType, { label: string; icon: string; severity: 'blocker' | 'major' | 'minor' }> = {
  cant_see: { label: '看不到', icon: '👁️', severity: 'blocker' },
  looks_wrong: { label: '显示不对', icon: '🖼️', severity: 'major' },
  cant_click: { label: '点不了', icon: '👆', severity: 'blocker' },
  too_slow: { label: '太慢了', icon: '🐌', severity: 'minor' },
  other: { label: '其他问题', icon: '❓', severity: 'minor' }
}

// 预定义验收检查项（按产品类型）
const ACCEPTANCE_CHECKS: Record<string, AcceptanceCheckItem[]> = {
  'web-app': [
    {
      id: 'check_open',
      order: 1,
      title: '打开网站',
      question: '您能正常打开这个网址吗？',
      instruction: '点击下面的链接，看看网站能不能打开',
      importance: 'must'
    },
    {
      id: 'check_homepage',
      order: 2,
      title: '首页显示',
      question: '首页看起来正常吗？',
      instruction: '看看首页的内容是否完整显示，没有乱码或空白',
      importance: 'must'
    },
    {
      id: 'check_login',
      order: 3,
      title: '登录功能',
      question: '能用测试账号登录吗？',
      instruction: '用我们发给您的账号密码试着登录一下',
      importance: 'must'
    },
    {
      id: 'check_admin',
      order: 4,
      title: '管理后台',
      question: '能进入管理后台吗？',
      instruction: '登录后找找"管理"或"后台"入口，看能不能进去',
      importance: 'must'
    },
    {
      id: 'check_mobile',
      order: 5,
      title: '手机显示',
      question: '用手机打开看起来正常吗？',
      instruction: '用手机浏览器打开网址，看看显示是否正常',
      importance: 'should'
    },
    {
      id: 'check_overall',
      order: 6,
      title: '整体感受',
      question: '整体来说，产品达到您的预期了吗？',
      instruction: '想想最初的需求，产品是否基本满足',
      importance: 'must'
    }
  ],
  'ecommerce': [
    {
      id: 'check_open',
      order: 1,
      title: '打开商城',
      question: '商城网站能正常打开吗？',
      instruction: '点击链接打开商城首页',
      importance: 'must'
    },
    {
      id: 'check_products',
      order: 2,
      title: '商品展示',
      question: '能看到商品列表吗？',
      instruction: '首页应该能看到一些示例商品',
      importance: 'must'
    },
    {
      id: 'check_detail',
      order: 3,
      title: '商品详情',
      question: '点击商品能看到详情吗？',
      instruction: '随便点一个商品，看看详情页',
      importance: 'must'
    },
    {
      id: 'check_cart',
      order: 4,
      title: '购物车',
      question: '能把商品加入购物车吗？',
      instruction: '点"加入购物车"试试',
      importance: 'must'
    },
    {
      id: 'check_admin',
      order: 5,
      title: '商家后台',
      question: '能进入商家管理后台吗？',
      instruction: '用管理员账号登录后台',
      importance: 'must'
    },
    {
      id: 'check_add_product',
      order: 6,
      title: '添加商品',
      question: '能在后台添加新商品吗？',
      instruction: '在后台找到"添加商品"，试着填写保存',
      importance: 'should'
    },
    {
      id: 'check_mobile',
      order: 7,
      title: '手机购物',
      question: '手机上能正常浏览和购买吗？',
      instruction: '用手机打开商城试试',
      importance: 'should'
    },
    {
      id: 'check_overall',
      order: 8,
      title: '整体感受',
      question: '整体满意吗？可以开始卖货了吗？',
      instruction: '想想您的需求，商城是否够用',
      importance: 'must'
    }
  ]
}

// 默认检查项
const DEFAULT_CHECKS: AcceptanceCheckItem[] = [
  {
    id: 'check_open',
    order: 1,
    title: '打开产品',
    question: '产品能正常打开吗？',
    instruction: '点击链接打开产品',
    importance: 'must'
  },
  {
    id: 'check_basic',
    order: 2,
    title: '基本功能',
    question: '主要功能能用吗？',
    instruction: '试试产品的核心功能',
    importance: 'must'
  },
  {
    id: 'check_overall',
    order: 3,
    title: '整体感受',
    question: '整体满意吗？',
    instruction: '考虑一下是否达到预期',
    importance: 'must'
  }
]

/**
 * 小白用户无感验收服务
 */
export class SimpleAcceptanceService {
  /**
   * 创建验收会话
   */
  createSession(
    projectId: string,
    projectName: string,
    userId: string,
    userName: string,
    productUrl: string,
    productType: string,
    adminUrl?: string,
    userPhone?: string
  ): SimpleAcceptanceSession {
    const checkItems = ACCEPTANCE_CHECKS[productType] || DEFAULT_CHECKS

    return {
      id: `simple_acceptance_${Date.now()}`,
      projectId,
      projectName,
      userId,
      userName,
      userPhone,
      productUrl,
      adminUrl,
      checkItems,
      feedbacks: [],
      currentIndex: 0,
      status: 'pending',
      startedAt: new Date()
    }
  }

  /**
   * 获取当前检查项
   */
  getCurrentCheck(session: SimpleAcceptanceSession): AcceptanceCheckItem | null {
    if (session.currentIndex >= session.checkItems.length) {
      return null
    }
    return session.checkItems[session.currentIndex]
  }

  /**
   * 生成检查提示（人话）
   */
  generateCheckPrompt(session: SimpleAcceptanceSession): string {
    const check = this.getCurrentCheck(session)
    if (!check) {
      return '验收已完成！'
    }

    const lines: string[] = []
    lines.push(`📍 第 ${check.order} 步，共 ${session.checkItems.length} 步`)
    lines.push('')
    lines.push(`【${check.title}】`)
    lines.push('')
    lines.push(`👉 ${check.instruction}`)
    lines.push('')
    lines.push(`❓ ${check.question}`)
    lines.push('')

    if (check.importance === 'must') {
      lines.push('⚠️ 这是必须检查的项目')
    }

    return lines.join('\n')
  }

  /**
   * 生成简单的问题选项
   */
  getIssueOptions(): Array<{ type: SimpleIssueType; label: string; icon: string }> {
    return Object.entries(ISSUE_TYPE_CONFIG).map(([type, config]) => ({
      type: type as SimpleIssueType,
      label: config.label,
      icon: config.icon
    }))
  }

  /**
   * 记录用户反馈
   */
  recordFeedback(
    session: SimpleAcceptanceSession,
    result: 'good' | 'bad' | 'skip',
    issueType?: SimpleIssueType,
    issueNote?: string
  ): { nextCheck: AcceptanceCheckItem | null; message: string } {
    const currentCheck = this.getCurrentCheck(session)
    if (!currentCheck) {
      return { nextCheck: null, message: '验收已完成' }
    }

    // 记录反馈
    session.feedbacks.push({
      checkId: currentCheck.id,
      result,
      issueType,
      issueNote,
      timestamp: new Date()
    })

    // 移动到下一个
    session.currentIndex++

    const nextCheck = this.getCurrentCheck(session)

    // 生成回复消息
    let message: string
    if (result === 'good') {
      message = '👍 太好了！这一项没问题。'
    } else if (result === 'bad') {
      const issueLabel = issueType ? ISSUE_TYPE_CONFIG[issueType].label : '问题'
      message = `📝 好的，我记录下了这个问题（${issueLabel}）。我们会尽快处理。`
    } else {
      message = '⏭️ 好的，跳过这一项。'
    }

    if (nextCheck) {
      message += '\n\n我们继续下一项检查。'
    } else {
      session.status = session.feedbacks.some(f => f.result === 'bad') ? 'issues_found' : 'completed'
      session.completedAt = new Date()
      message = '\n\n' + this.generateCompletionMessage(session)
    }

    return { nextCheck, message }
  }

  /**
   * 生成完成消息
   */
  private generateCompletionMessage(session: SimpleAcceptanceSession): string {
    const lines: string[] = []

    const goodCount = session.feedbacks.filter(f => f.result === 'good').length
    const badCount = session.feedbacks.filter(f => f.result === 'bad').length
    const totalMust = session.checkItems.filter(c => c.importance === 'must').length
    const passedMust = session.feedbacks.filter(f => {
      const check = session.checkItems.find(c => c.id === f.checkId)
      return check?.importance === 'must' && f.result === 'good'
    }).length

    lines.push('🎉 验收检查完成！')
    lines.push('')
    lines.push(`📊 检查结果：`)
    lines.push(`   ✅ 正常: ${goodCount} 项`)
    if (badCount > 0) {
      lines.push(`   ⚠️ 有问题: ${badCount} 项`)
    }
    lines.push('')

    if (badCount === 0) {
      lines.push('✨ 太棒了！所有检查都通过了！')
      lines.push('')
      lines.push('请在下方确认验收，我们会发送正式的交付确认函给您。')
    } else if (passedMust === totalMust) {
      lines.push('✅ 核心功能检查通过，有一些小问题需要改进。')
      lines.push('')
      lines.push('您可以先确认验收使用，我们会尽快修复这些问题。')
    } else {
      lines.push('⚠️ 有一些重要问题需要先修复。')
      lines.push('')
      lines.push('我们会尽快处理，处理完成后再请您确认。')
    }

    return lines.join('\n')
  }

  /**
   * 用户签收
   */
  signAcceptance(
    session: SimpleAcceptanceSession,
    signature: string
  ): AcceptanceOutcome {
    session.signedAt = new Date()
    session.signature = signature
    session.status = 'completed'

    // 统计结果
    const goodFeedbacks = session.feedbacks.filter(f => f.result === 'good')
    const badFeedbacks = session.feedbacks.filter(f => f.result === 'bad')
    const skipFeedbacks = session.feedbacks.filter(f => f.result === 'skip')

    // 收集问题
    const issues: AcceptanceIssueRecord[] = badFeedbacks.map(f => {
      const check = session.checkItems.find(c => c.id === f.checkId)!
      return {
        checkId: f.checkId,
        checkTitle: check.title,
        issueType: f.issueType || 'other',
        issueNote: f.issueNote,
        severity: ISSUE_TYPE_CONFIG[f.issueType || 'other'].severity
      }
    })

    // 判断是否通过
    const mustChecks = session.checkItems.filter(c => c.importance === 'must')
    const mustPassed = mustChecks.every(c =>
      session.feedbacks.find(f => f.checkId === c.id)?.result !== 'bad'
    )

    return {
      sessionId: session.id,
      passed: badFeedbacks.length === 0,
      passedWithIssues: badFeedbacks.length > 0 && mustPassed,
      totalChecks: session.checkItems.length,
      passedChecks: goodFeedbacks.length,
      issueChecks: badFeedbacks.length,
      skippedChecks: skipFeedbacks.length,
      issues,
      signedAt: session.signedAt,
      signature: session.signature,
      summary: this.generateSummary(session, issues)
    }
  }

  /**
   * 生成验收总结
   */
  private generateSummary(
    session: SimpleAcceptanceSession,
    issues: AcceptanceIssueRecord[]
  ): string {
    const lines: string[] = []

    lines.push(`${session.projectName} 用户验收总结`)
    lines.push('─'.repeat(40))
    lines.push(`验收人: ${session.userName}`)
    lines.push(`验收时间: ${session.completedAt?.toLocaleString()}`)
    lines.push('')

    if (issues.length === 0) {
      lines.push('✅ 验收结果: 全部通过')
    } else {
      lines.push(`⚠️ 验收结果: 发现 ${issues.length} 个问题`)
      lines.push('')
      issues.forEach((issue, i) => {
        lines.push(`${i + 1}. ${issue.checkTitle} - ${ISSUE_TYPE_CONFIG[issue.issueType].label}`)
        if (issue.issueNote) {
          lines.push(`   备注: ${issue.issueNote}`)
        }
      })
    }

    lines.push('')
    lines.push('─'.repeat(40))
    lines.push(`电子签名: ${session.signature}`)
    lines.push(`签名时间: ${session.signedAt?.toLocaleString()}`)

    return lines.join('\n')
  }

  /**
   * 生成验收报告 HTML
   */
  generateAcceptanceReportHtml(
    session: SimpleAcceptanceSession,
    outcome: AcceptanceOutcome
  ): string {
    const statusBadge = outcome.passed
      ? '<span style="background:#22c55e;color:white;padding:4px 12px;border-radius:4px;">✅ 验收通过</span>'
      : outcome.passedWithIssues
        ? '<span style="background:#f59e0b;color:white;padding:4px 12px;border-radius:4px;">⚠️ 有条件通过</span>'
        : '<span style="background:#ef4444;color:white;padding:4px 12px;border-radius:4px;">❌ 存在问题</span>'

    return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <title>${session.projectName} 用户验收确认书</title>
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 800px; margin: 0 auto; padding: 40px; }
    .header { text-align: center; border-bottom: 2px solid #e5e7eb; padding-bottom: 20px; margin-bottom: 30px; }
    .title { font-size: 24px; font-weight: bold; margin-bottom: 10px; }
    .info { margin: 20px 0; }
    .info-row { display: flex; margin: 10px 0; }
    .info-label { width: 100px; color: #6b7280; }
    .info-value { flex: 1; }
    .checklist { margin: 30px 0; }
    .check-item { display: flex; align-items: center; padding: 10px 0; border-bottom: 1px solid #f3f4f6; }
    .check-status { width: 30px; font-size: 20px; }
    .check-title { flex: 1; }
    .issues { background: #fef3c7; padding: 20px; border-radius: 8px; margin: 20px 0; }
    .issue-item { margin: 10px 0; }
    .signature-box { border: 2px solid #e5e7eb; padding: 20px; margin: 30px 0; border-radius: 8px; }
    .signature-label { color: #6b7280; margin-bottom: 10px; }
    .signature-value { font-size: 24px; font-family: cursive; color: #1f2937; }
    .footer { text-align: center; color: #9ca3af; font-size: 12px; margin-top: 40px; }
  </style>
</head>
<body>
  <div class="header">
    <div class="title">用户验收确认书</div>
    ${statusBadge}
  </div>

  <div class="info">
    <div class="info-row">
      <div class="info-label">项目名称:</div>
      <div class="info-value"><strong>${session.projectName}</strong></div>
    </div>
    <div class="info-row">
      <div class="info-label">产品地址:</div>
      <div class="info-value"><a href="${session.productUrl}">${session.productUrl}</a></div>
    </div>
    <div class="info-row">
      <div class="info-label">验收人:</div>
      <div class="info-value">${session.userName}</div>
    </div>
    <div class="info-row">
      <div class="info-label">验收时间:</div>
      <div class="info-value">${session.completedAt?.toLocaleString()}</div>
    </div>
  </div>

  <div class="checklist">
    <h3>📋 验收检查项</h3>
    ${session.checkItems.map(check => {
      const feedback = session.feedbacks.find(f => f.checkId === check.id)
      const icon = feedback?.result === 'good' ? '✅' : feedback?.result === 'bad' ? '❌' : '⏭️'
      return `
        <div class="check-item">
          <div class="check-status">${icon}</div>
          <div class="check-title">${check.title}</div>
        </div>
      `
    }).join('')}
  </div>

  ${outcome.issues.length > 0 ? `
  <div class="issues">
    <h3>⚠️ 发现的问题</h3>
    ${outcome.issues.map((issue, i) => `
      <div class="issue-item">
        <strong>${i + 1}. ${issue.checkTitle}</strong> - ${ISSUE_TYPE_CONFIG[issue.issueType].label}
        ${issue.issueNote ? `<br><small>备注: ${issue.issueNote}</small>` : ''}
      </div>
    `).join('')}
  </div>
  ` : ''}

  <div class="signature-box">
    <div class="signature-label">用户签名确认:</div>
    <div class="signature-value">${session.signature}</div>
    <div style="color: #9ca3af; font-size: 12px; margin-top: 10px;">
      签名时间: ${session.signedAt?.toLocaleString()}
    </div>
  </div>

  <div class="footer">
    此文档由 Thinkus 平台自动生成<br>
    文档编号: ${session.id}
  </div>
</body>
</html>
    `.trim()
  }
}

// 导出单例
export const simpleAcceptance = new SimpleAcceptanceService()
