/**
 * AI 引导验收服务
 *
 * 小白用户优化: 让 AI 引导用户完成产品验收
 *
 * 功能:
 * - 用人话引导用户检查产品功能
 * - 自动截图对比和问题识别
 * - 用户确认后记录验收结果
 * - 问题自动上报和修复建议
 */

import { acceptanceTester, type TestScenario, type TestStep, type AcceptanceTestReport } from './acceptance-tester'

// AI 验收步骤
export interface AIAcceptanceStep {
  id: string
  order: number
  title: string                 // 人话标题
  instruction: string           // 人话操作指引
  checkPoints: string[]         // 检查要点（人话）
  expectedResult: string        // 预期结果（人话）
  helpText: string              // 帮助文本
  screenshot?: string           // 参考截图
  userConfirmed?: boolean       // 用户确认
  userFeedback?: 'good' | 'issue' | 'skip'
  issueDescription?: string     // 问题描述
  completedAt?: Date
}

// AI 验收会话
export interface AIAcceptanceSession {
  id: string
  projectId: string
  projectName: string
  userId: string
  productUrl: string
  adminUrl?: string
  steps: AIAcceptanceStep[]
  currentStepIndex: number
  startedAt: Date
  completedAt?: Date
  status: 'pending' | 'in_progress' | 'completed' | 'issues_found'
  issuesFound: AcceptanceIssue[]
  userSignature?: string        // 用户签名确认
  overallSatisfaction?: number  // 1-5 分
}

// 验收问题
export interface AcceptanceIssue {
  id: string
  stepId: string
  description: string
  severity: 'critical' | 'major' | 'minor'
  screenshot?: string
  userDescription?: string
  autoSuggestion?: string       // AI 建议
  resolved: boolean
  resolution?: string
}

// 验收结果
export interface AcceptanceResult {
  sessionId: string
  accepted: boolean
  acceptedWithIssues: boolean
  issueCount: number
  criticalIssueCount: number
  userFeedback: string
  completedAt: Date
}

// 产品类型对应的验收步骤模板
const ACCEPTANCE_TEMPLATES: Record<string, AIAcceptanceStep[]> = {
  'web-app': [
    {
      id: 'wa_1',
      order: 1,
      title: '打开您的网站',
      instruction: '请在浏览器中打开您的产品网址，看看网站能不能正常显示。',
      checkPoints: [
        '网页能正常打开',
        '页面内容显示完整',
        '没有报错或空白'
      ],
      expectedResult: '您应该能看到您产品的首页，包括 Logo、导航栏和主要内容。',
      helpText: '如果打不开或显示空白，可能是网络问题，请等待几秒后刷新试试。'
    },
    {
      id: 'wa_2',
      order: 2,
      title: '检查登录功能',
      instruction: '点击"登录"按钮，用我们给您的测试账号登录试试。',
      checkPoints: [
        '登录页面正常显示',
        '能输入账号密码',
        '点击登录后能成功进入'
      ],
      expectedResult: '登录成功后，您应该能看到您的个人页面或仪表盘。',
      helpText: '账号密码在交付邮件里，如果忘记了可以告诉我，我帮您查。'
    },
    {
      id: 'wa_3',
      order: 3,
      title: '进入管理后台',
      instruction: '登录后，找到"管理后台"或"设置"入口，进去看看。',
      checkPoints: [
        '能找到管理后台入口',
        '能成功进入后台',
        '后台功能菜单正常显示'
      ],
      expectedResult: '您应该能看到管理后台的各种功能，比如用户管理、内容管理等。',
      helpText: '管理后台通常在右上角菜单里，或者页面底部有入口链接。'
    },
    {
      id: 'wa_4',
      order: 4,
      title: '测试核心功能',
      instruction: '试试您产品最重要的功能，看看是否正常。',
      checkPoints: [
        '核心功能入口能找到',
        '操作过程顺畅',
        '结果符合预期'
      ],
      expectedResult: '您最需要的功能应该能正常使用。',
      helpText: '如果不确定怎么操作，可以问我，我来指导您。'
    },
    {
      id: 'wa_5',
      order: 5,
      title: '手机端查看',
      instruction: '用手机打开网址，看看手机上显示是否正常。',
      checkPoints: [
        '手机上能正常打开',
        '布局自适应手机屏幕',
        '按钮能正常点击'
      ],
      expectedResult: '手机上的显示应该是专门适配过的，按钮大小合适，文字清晰可读。',
      helpText: '可以用手机浏览器直接输入网址，或者扫描我们发给您的二维码。'
    },
    {
      id: 'wa_6',
      order: 6,
      title: '最后确认',
      instruction: '整体感受一下，您的产品是否达到了预期？',
      checkPoints: [
        '整体功能符合需求',
        '使用起来比较顺手',
        '外观设计可以接受'
      ],
      expectedResult: '您应该对产品整体比较满意。',
      helpText: '如果有任何问题或建议，现在告诉我，我们会尽快处理。'
    }
  ],
  'ecommerce': [
    {
      id: 'ec_1',
      order: 1,
      title: '打开您的商城',
      instruction: '请在浏览器中打开商城网址，看看首页能不能正常显示。',
      checkPoints: [
        '商城首页正常显示',
        '商品分类可以看到',
        '页面加载速度可以接受'
      ],
      expectedResult: '您应该能看到商城首页，包括商品展示、分类导航、搜索框等。',
      helpText: '如果加载较慢，可能是图片较多，请稍等一下。'
    },
    {
      id: 'ec_2',
      order: 2,
      title: '浏览商品',
      instruction: '随便点开一个商品，看看商品详情页是否正常。',
      checkPoints: [
        '商品图片正常显示',
        '价格和库存显示正确',
        '能看到商品描述'
      ],
      expectedResult: '商品详情应该包括图片、价格、库存、描述等信息。',
      helpText: '您可以上传自己的商品后再检查，现在显示的是示例商品。'
    },
    {
      id: 'ec_3',
      order: 3,
      title: '测试购物车',
      instruction: '把一个商品加入购物车，然后去购物车看看。',
      checkPoints: [
        '能成功加入购物车',
        '购物车数量正确显示',
        '能修改数量或删除'
      ],
      expectedResult: '购物车应该显示您添加的商品，价格计算正确。',
      helpText: '购物车图标通常在页面右上角。'
    },
    {
      id: 'ec_4',
      order: 4,
      title: '进入商家后台',
      instruction: '用管理员账号进入商家后台，看看能不能管理商品和订单。',
      checkPoints: [
        '能成功登录商家后台',
        '能看到商品管理入口',
        '能看到订单管理入口'
      ],
      expectedResult: '商家后台应该让您能方便地管理商品、查看订单、设置促销等。',
      helpText: '商家后台账号密码在交付邮件里。'
    },
    {
      id: 'ec_5',
      order: 5,
      title: '添加测试商品',
      instruction: '在商家后台添加一个新商品，看看流程是否顺畅。',
      checkPoints: [
        '能找到添加商品入口',
        '能填写商品信息',
        '能上传商品图片',
        '保存后商品正常显示'
      ],
      expectedResult: '添加的商品应该能在商城前台正常显示。',
      helpText: '添加商品时，只需要填写必填项即可，其他以后再完善。'
    },
    {
      id: 'ec_6',
      order: 6,
      title: '最后确认',
      instruction: '整体感受一下，商城是否满足您的需求？',
      checkPoints: [
        '主要功能都能正常使用',
        '操作比较简单易懂',
        '整体效果达到预期'
      ],
      expectedResult: '您应该对商城整体比较满意，可以开始正式运营了。',
      helpText: '有任何问题现在告诉我，我们会帮您处理。'
    }
  ]
}

// 默认验收步骤
const DEFAULT_ACCEPTANCE_STEPS: AIAcceptanceStep[] = [
  {
    id: 'default_1',
    order: 1,
    title: '打开您的产品',
    instruction: '请在浏览器中打开产品网址，看看能不能正常显示。',
    checkPoints: [
      '页面能正常打开',
      '内容显示完整',
      '没有报错信息'
    ],
    expectedResult: '您应该能看到产品的主界面。',
    helpText: '如果打不开，请检查网址是否正确，或者等待几秒后刷新。'
  },
  {
    id: 'default_2',
    order: 2,
    title: '测试登录功能',
    instruction: '用我们提供的账号登录试试。',
    checkPoints: [
      '登录页面正常',
      '能输入账号密码',
      '登录后跳转正确'
    ],
    expectedResult: '登录成功后能正常使用产品功能。',
    helpText: '账号密码在交付邮件里。'
  },
  {
    id: 'default_3',
    order: 3,
    title: '核心功能检查',
    instruction: '试试产品最重要的功能。',
    checkPoints: [
      '功能入口能找到',
      '操作流程顺畅',
      '结果符合预期'
    ],
    expectedResult: '核心功能正常可用。',
    helpText: '如果不确定怎么操作，随时问我。'
  },
  {
    id: 'default_4',
    order: 4,
    title: '整体确认',
    instruction: '整体感受一下产品是否符合您的预期。',
    checkPoints: [
      '功能满足需求',
      '使用比较方便',
      '外观可以接受'
    ],
    expectedResult: '您应该对产品整体满意。',
    helpText: '有任何问题或建议都可以提出来。'
  }
]

/**
 * AI 引导验收服务
 */
export class AIAcceptanceGuideService {
  /**
   * 创建验收会话
   */
  createSession(
    projectId: string,
    projectName: string,
    userId: string,
    productUrl: string,
    productType: string,
    adminUrl?: string
  ): AIAcceptanceSession {
    const steps = this.getAcceptanceSteps(productType)

    return {
      id: `acceptance_${Date.now()}`,
      projectId,
      projectName,
      userId,
      productUrl,
      adminUrl,
      steps,
      currentStepIndex: 0,
      startedAt: new Date(),
      status: 'pending',
      issuesFound: []
    }
  }

  /**
   * 获取验收步骤
   */
  private getAcceptanceSteps(productType: string): AIAcceptanceStep[] {
    return ACCEPTANCE_TEMPLATES[productType] || DEFAULT_ACCEPTANCE_STEPS
  }

  /**
   * 获取当前步骤
   */
  getCurrentStep(session: AIAcceptanceSession): AIAcceptanceStep | null {
    if (session.currentStepIndex >= session.steps.length) {
      return null
    }
    return session.steps[session.currentStepIndex]
  }

  /**
   * 生成步骤引导话术
   */
  generateStepGuidance(step: AIAcceptanceStep): string {
    const lines: string[] = []

    lines.push(`📍 第 ${step.order} 步：${step.title}`)
    lines.push('')
    lines.push(`👉 ${step.instruction}`)
    lines.push('')
    lines.push('请检查：')
    step.checkPoints.forEach((point, i) => {
      lines.push(`  ${i + 1}. ${point}`)
    })
    lines.push('')
    lines.push(`✅ 预期结果：${step.expectedResult}`)
    lines.push('')
    lines.push(`💡 提示：${step.helpText}`)

    return lines.join('\n')
  }

  /**
   * 处理用户反馈
   */
  processUserFeedback(
    session: AIAcceptanceSession,
    feedback: 'good' | 'issue' | 'skip',
    issueDescription?: string
  ): { nextStep: AIAcceptanceStep | null; message: string } {
    const currentStep = session.steps[session.currentStepIndex]

    // 更新当前步骤
    currentStep.userConfirmed = true
    currentStep.userFeedback = feedback
    currentStep.completedAt = new Date()

    if (feedback === 'issue' && issueDescription) {
      currentStep.issueDescription = issueDescription

      // 记录问题
      const issue: AcceptanceIssue = {
        id: `issue_${Date.now()}`,
        stepId: currentStep.id,
        description: issueDescription,
        severity: this.assessIssueSeverity(currentStep, issueDescription),
        userDescription: issueDescription,
        autoSuggestion: this.generateAutoSuggestion(currentStep, issueDescription),
        resolved: false
      }
      session.issuesFound.push(issue)
    }

    // 移动到下一步
    session.currentStepIndex++

    if (session.currentStepIndex >= session.steps.length) {
      // 验收完成
      session.status = session.issuesFound.length > 0 ? 'issues_found' : 'completed'
      session.completedAt = new Date()

      return {
        nextStep: null,
        message: this.generateCompletionMessage(session)
      }
    }

    const nextStep = session.steps[session.currentStepIndex]

    let message: string
    if (feedback === 'good') {
      message = '太棒了！这一步没问题。我们继续下一步。'
    } else if (feedback === 'issue') {
      message = '好的，我已经记录了这个问题。我们会尽快处理。现在继续检查下一步吧。'
    } else {
      message = '好的，跳过这一步。我们看下一项。'
    }

    return { nextStep, message }
  }

  /**
   * 评估问题严重程度
   */
  private assessIssueSeverity(step: AIAcceptanceStep, description: string): 'critical' | 'major' | 'minor' {
    const criticalKeywords = ['打不开', '无法访问', '登录不了', '白屏', '报错', '崩溃', '数据丢失']
    const majorKeywords = ['显示错误', '功能不正常', '很慢', '卡住', '操作失败']

    const descLower = description.toLowerCase()

    if (criticalKeywords.some(kw => descLower.includes(kw))) {
      return 'critical'
    }
    if (majorKeywords.some(kw => descLower.includes(kw))) {
      return 'major'
    }
    return 'minor'
  }

  /**
   * 生成自动建议
   */
  private generateAutoSuggestion(step: AIAcceptanceStep, description: string): string {
    const suggestions: Record<string, string> = {
      '打不开': '请检查网络连接，或稍后重试。如果持续无法访问，我们会检查服务器状态。',
      '登录不了': '请确认账号密码是否正确（注意大小写）。如果忘记密码，我可以帮您重置。',
      '显示不正常': '可能是浏览器缓存问题，请尝试清除缓存或换个浏览器试试。',
      '太慢': '可能是网络问题或者数据较多。我们会检查服务器性能。',
      '功能不能用': '我们会检查这个功能并尽快修复。'
    }

    for (const [keyword, suggestion] of Object.entries(suggestions)) {
      if (description.includes(keyword)) {
        return suggestion
      }
    }

    return '我们已记录这个问题，会尽快检查并修复。'
  }

  /**
   * 生成完成消息
   */
  private generateCompletionMessage(session: AIAcceptanceSession): string {
    const lines: string[] = []

    lines.push('🎉 验收检查完成！')
    lines.push('')

    const totalSteps = session.steps.length
    const goodSteps = session.steps.filter(s => s.userFeedback === 'good').length
    const issueSteps = session.steps.filter(s => s.userFeedback === 'issue').length

    lines.push(`📊 检查结果：`)
    lines.push(`  ✅ 正常：${goodSteps}/${totalSteps}`)
    if (issueSteps > 0) {
      lines.push(`  ⚠️ 有问题：${issueSteps}/${totalSteps}`)
    }
    lines.push('')

    if (session.issuesFound.length > 0) {
      lines.push('📝 发现的问题：')
      session.issuesFound.forEach((issue, i) => {
        const icon = issue.severity === 'critical' ? '🔴' : issue.severity === 'major' ? '🟡' : '🟢'
        lines.push(`  ${i + 1}. ${icon} ${issue.description}`)
      })
      lines.push('')
      lines.push('我们会尽快处理这些问题，处理完成后会通知您。')
    } else {
      lines.push('🎊 太棒了！所有检查都通过了！')
      lines.push('')
      lines.push('您的产品已经准备好正式使用了。')
    }

    lines.push('')
    lines.push('请在下方确认验收结果。如果有其他问题，随时联系我们。')

    return lines.join('\n')
  }

  /**
   * 用户确认验收
   */
  confirmAcceptance(
    session: AIAcceptanceSession,
    signature: string,
    satisfaction: number,
    feedback?: string
  ): AcceptanceResult {
    session.userSignature = signature
    session.overallSatisfaction = satisfaction
    session.status = 'completed'
    session.completedAt = new Date()

    const criticalIssues = session.issuesFound.filter(i => i.severity === 'critical')

    return {
      sessionId: session.id,
      accepted: true,
      acceptedWithIssues: session.issuesFound.length > 0,
      issueCount: session.issuesFound.length,
      criticalIssueCount: criticalIssues.length,
      userFeedback: feedback || '无',
      completedAt: session.completedAt
    }
  }

  /**
   * 生成验收报告
   */
  generateAcceptanceReport(session: AIAcceptanceSession): string {
    const lines: string[] = []

    lines.push('═'.repeat(50))
    lines.push('       用户验收确认书')
    lines.push('═'.repeat(50))
    lines.push('')
    lines.push(`项目名称：${session.projectName}`)
    lines.push(`项目ID：${session.projectId}`)
    lines.push(`验收时间：${session.completedAt?.toLocaleString() || '-'}`)
    lines.push(`用户签名：${session.userSignature || '-'}`)
    lines.push('')
    lines.push('─'.repeat(50))
    lines.push('验收检查项：')
    lines.push('')

    session.steps.forEach(step => {
      const icon = step.userFeedback === 'good' ? '✅' : step.userFeedback === 'issue' ? '⚠️' : '⏭️'
      lines.push(`${icon} ${step.title}`)
      if (step.issueDescription) {
        lines.push(`   问题：${step.issueDescription}`)
      }
    })

    lines.push('')
    lines.push('─'.repeat(50))

    if (session.issuesFound.length > 0) {
      lines.push('待处理问题：')
      session.issuesFound.forEach((issue, i) => {
        lines.push(`${i + 1}. [${issue.severity}] ${issue.description}`)
      })
    } else {
      lines.push('✅ 无待处理问题')
    }

    lines.push('')
    lines.push('─'.repeat(50))
    lines.push(`满意度评分：${'⭐'.repeat(session.overallSatisfaction || 0)}${'☆'.repeat(5 - (session.overallSatisfaction || 0))}`)
    lines.push('')
    lines.push('═'.repeat(50))

    return lines.join('\n')
  }

  /**
   * 集成自动化测试
   * 在 AI 引导验收的同时，后台运行自动化测试
   */
  async runBackgroundAutoTest(
    projectId: string,
    projectName: string,
    productType: string,
    baseUrl: string
  ): Promise<AcceptanceTestReport> {
    return acceptanceTester.runAcceptanceTest(
      projectId,
      projectName,
      productType,
      { baseUrl }
    )
  }
}

// 导出单例
export const aiAcceptanceGuide = new AIAcceptanceGuideService()
