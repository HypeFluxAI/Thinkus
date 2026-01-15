/**
 * 交付物教程生成服务
 * 为小白用户自动生成操作指南和教程
 */

/**
 * 教程类型
 */
export type TutorialType =
  | 'quick_start'      // 快速入门
  | 'admin_guide'      // 管理员指南
  | 'feature_tour'     // 功能导览
  | 'troubleshoot'     // 故障排查
  | 'customization'    // 自定义配置

/**
 * 教程格式
 */
export type TutorialFormat =
  | 'steps'            // 分步骤文本
  | 'gif'              // GIF动图
  | 'video'            // 视频
  | 'interactive'      // 交互式

/**
 * 教程步骤
 */
export interface TutorialStep {
  id: string
  order: number
  title: string
  description: string
  /** 操作说明 */
  action: string
  /** 预期结果 */
  expectedResult: string
  /** 截图/图片URL */
  imageUrl?: string
  /** GIF URL */
  gifUrl?: string
  /** 视频片段URL */
  videoUrl?: string
  /** 提示信息 */
  tips?: string[]
  /** 常见问题 */
  faq?: { question: string; answer: string }[]
  /** 预计耗时（秒） */
  duration?: number
}

/**
 * 完整教程
 */
export interface Tutorial {
  id: string
  type: TutorialType
  format: TutorialFormat
  title: string
  description: string
  /** 目标用户 */
  targetAudience: 'beginner' | 'intermediate' | 'advanced'
  /** 预计总耗时（分钟） */
  estimatedMinutes: number
  /** 教程步骤 */
  steps: TutorialStep[]
  /** 前置条件 */
  prerequisites?: string[]
  /** 相关教程 */
  relatedTutorials?: string[]
  /** 创建时间 */
  createdAt: Date
  /** 更新时间 */
  updatedAt: Date
}

/**
 * 教程模板配置
 */
export interface TutorialTemplate {
  type: TutorialType
  title: string
  description: string
  steps: Omit<TutorialStep, 'id' | 'imageUrl' | 'gifUrl' | 'videoUrl'>[]
}

/**
 * 预定义的教程模板
 */
export const TUTORIAL_TEMPLATES: Record<string, TutorialTemplate> = {
  // ==================== 快速入门 ====================
  'quick_start_web': {
    type: 'quick_start',
    title: '快速开始使用您的产品',
    description: '5分钟内学会使用您的新产品',
    steps: [
      {
        order: 1,
        title: '访问您的产品',
        description: '在浏览器中打开产品链接',
        action: '点击交付包中的产品链接，或扫描二维码',
        expectedResult: '看到产品首页，页面正常加载',
        tips: ['建议使用 Chrome 或 Safari 浏览器', '如果加载慢，请检查网络连接'],
        duration: 10
      },
      {
        order: 2,
        title: '登录管理后台',
        description: '使用管理员账号登录',
        action: '访问 /admin 页面，输入管理员邮箱和密码',
        expectedResult: '成功进入管理后台',
        tips: ['首次登录请修改默认密码', '密码需要至少8位'],
        faq: [
          { question: '忘记密码怎么办？', answer: '点击"忘记密码"，通过邮箱重置' }
        ],
        duration: 30
      },
      {
        order: 3,
        title: '了解主要功能',
        description: '快速浏览产品的核心功能',
        action: '点击左侧菜单，逐个查看各功能模块',
        expectedResult: '了解产品有哪些功能',
        tips: ['先从最常用的功能开始', '不懂的功能可以点击帮助按钮'],
        duration: 60
      },
      {
        order: 4,
        title: '尝试第一个操作',
        description: '完成一个简单的操作来熟悉系统',
        action: '根据您的需求，尝试添加第一条数据',
        expectedResult: '成功完成操作，看到新增的数据',
        tips: ['不用担心出错，可以随时删除测试数据'],
        duration: 60
      },
      {
        order: 5,
        title: '完成！',
        description: '恭喜您已经掌握基本操作',
        action: '继续探索更多功能，或查看详细教程',
        expectedResult: '能够独立使用产品的基本功能',
        tips: ['遇到问题随时联系客服', '更多高级功能请查看进阶教程'],
        duration: 10
      }
    ]
  },

  // ==================== 管理员指南 ====================
  'admin_guide': {
    type: 'admin_guide',
    title: '管理员操作指南',
    description: '学习如何管理您的产品',
    steps: [
      {
        order: 1,
        title: '访问管理后台',
        description: '进入管理员控制面板',
        action: '在产品URL后加 /admin，使用管理员账号登录',
        expectedResult: '看到管理后台仪表盘',
        duration: 20
      },
      {
        order: 2,
        title: '查看数据统计',
        description: '了解产品的使用情况',
        action: '在仪表盘查看用户数、访问量等数据',
        expectedResult: '能看到关键指标图表',
        tips: ['数据每小时更新一次'],
        duration: 30
      },
      {
        order: 3,
        title: '用户管理',
        description: '添加、编辑、删除用户',
        action: '点击"用户管理"菜单，进行用户操作',
        expectedResult: '能够管理用户账号',
        tips: ['删除用户前请确认', '可以先禁用而非删除'],
        duration: 60
      },
      {
        order: 4,
        title: '系统设置',
        description: '配置产品的基本设置',
        action: '点击"设置"菜单，根据需要修改配置',
        expectedResult: '设置保存成功',
        tips: ['修改设置后可能需要刷新页面'],
        duration: 60
      },
      {
        order: 5,
        title: '数据备份',
        description: '了解如何备份数据',
        action: '在设置中找到"数据备份"选项',
        expectedResult: '了解备份策略和恢复方法',
        tips: ['建议开启自动备份', '重要操作前手动备份'],
        duration: 30
      }
    ]
  },

  // ==================== 故障排查 ====================
  'troubleshoot_common': {
    type: 'troubleshoot',
    title: '常见问题排查',
    description: '遇到问题时的自助解决指南',
    steps: [
      {
        order: 1,
        title: '页面打不开',
        description: '产品网址无法访问',
        action: '检查网络连接 → 清除浏览器缓存 → 尝试其他浏览器',
        expectedResult: '页面正常加载',
        tips: ['移动网络切换到WiFi试试', '检查网址是否输入正确'],
        faq: [
          { question: '一直显示加载中？', answer: '等待30秒，如果还不行请联系客服' },
          { question: '显示404错误？', answer: '网址可能输入错误，请核对交付包中的链接' }
        ],
        duration: 60
      },
      {
        order: 2,
        title: '登录失败',
        description: '无法登录账号',
        action: '确认账号密码 → 检查大小写 → 尝试重置密码',
        expectedResult: '成功登录',
        tips: ['密码区分大小写', '连续5次失败会锁定10分钟'],
        faq: [
          { question: '没收到重置邮件？', answer: '检查垃圾邮件箱，或联系客服' }
        ],
        duration: 60
      },
      {
        order: 3,
        title: '功能异常',
        description: '某个功能不正常工作',
        action: '刷新页面 → 清除缓存 → 查看状态页面 → 联系客服',
        expectedResult: '功能恢复正常',
        tips: ['截图保存错误信息', '记录操作步骤便于排查'],
        duration: 120
      },
      {
        order: 4,
        title: '数据丢失',
        description: '找不到之前的数据',
        action: '检查筛选条件 → 查看回收站 → 联系客服恢复',
        expectedResult: '找回数据',
        tips: ['数据删除后30天内可恢复', '重要数据请定期备份'],
        duration: 120
      }
    ]
  }
}

/**
 * 产品类型对应的教程组合
 */
export const PRODUCT_TUTORIAL_MAP: Record<string, string[]> = {
  'web-app': ['quick_start_web', 'admin_guide', 'troubleshoot_common'],
  'mobile-app': ['quick_start_mobile', 'admin_guide', 'troubleshoot_common'],
  'mini-program': ['quick_start_miniprogram', 'admin_guide', 'troubleshoot_common'],
  'ecommerce': ['quick_start_web', 'admin_guide', 'ecommerce_guide', 'troubleshoot_common'],
  'api-service': ['api_quick_start', 'api_integration', 'troubleshoot_api'],
  'default': ['quick_start_web', 'admin_guide', 'troubleshoot_common']
}

/**
 * 教程生成服务类
 */
export class TutorialGeneratorService {
  private static instance: TutorialGeneratorService

  private constructor() {}

  public static getInstance(): TutorialGeneratorService {
    if (!TutorialGeneratorService.instance) {
      TutorialGeneratorService.instance = new TutorialGeneratorService()
    }
    return TutorialGeneratorService.instance
  }

  /**
   * 为项目生成教程
   */
  generateTutorials(
    projectId: string,
    productType: string,
    productUrl: string,
    adminUrl: string,
    features?: string[]
  ): Tutorial[] {
    const tutorials: Tutorial[] = []
    const templateKeys = PRODUCT_TUTORIAL_MAP[productType] || PRODUCT_TUTORIAL_MAP['default']

    for (const key of templateKeys) {
      const template = TUTORIAL_TEMPLATES[key]
      if (!template) continue

      const tutorial = this.createTutorialFromTemplate(
        template,
        projectId,
        productUrl,
        adminUrl
      )
      tutorials.push(tutorial)
    }

    // 如果有自定义功能，生成功能导览
    if (features && features.length > 0) {
      const featureTour = this.generateFeatureTour(projectId, features, productUrl)
      tutorials.push(featureTour)
    }

    return tutorials
  }

  /**
   * 从模板创建教程
   */
  private createTutorialFromTemplate(
    template: TutorialTemplate,
    projectId: string,
    productUrl: string,
    adminUrl: string
  ): Tutorial {
    const now = new Date()

    // 替换模板中的变量
    const steps: TutorialStep[] = template.steps.map((step, index) => ({
      ...step,
      id: `${projectId}-${template.type}-step-${index + 1}`,
      action: this.replaceVariables(step.action, { productUrl, adminUrl }),
      description: this.replaceVariables(step.description, { productUrl, adminUrl }),
      expectedResult: this.replaceVariables(step.expectedResult, { productUrl, adminUrl })
    }))

    const totalDuration = steps.reduce((sum, step) => sum + (step.duration || 30), 0)

    return {
      id: `${projectId}-${template.type}`,
      type: template.type,
      format: 'steps',
      title: template.title,
      description: template.description,
      targetAudience: 'beginner',
      estimatedMinutes: Math.ceil(totalDuration / 60),
      steps,
      createdAt: now,
      updatedAt: now
    }
  }

  /**
   * 替换模板变量
   */
  private replaceVariables(text: string, vars: Record<string, string>): string {
    let result = text
    for (const [key, value] of Object.entries(vars)) {
      result = result.replace(new RegExp(`\\{\\{${key}\\}\\}`, 'g'), value)
    }
    return result
  }

  /**
   * 生成功能导览
   */
  private generateFeatureTour(
    projectId: string,
    features: string[],
    productUrl: string
  ): Tutorial {
    const now = new Date()

    const steps: TutorialStep[] = features.slice(0, 10).map((feature, index) => ({
      id: `${projectId}-feature-step-${index + 1}`,
      order: index + 1,
      title: feature,
      description: `了解"${feature}"功能的使用方法`,
      action: `在产品中找到"${feature}"功能并尝试使用`,
      expectedResult: `成功使用"${feature}"功能`,
      tips: ['不确定的操作可以先在测试数据上尝试'],
      duration: 60
    }))

    return {
      id: `${projectId}-feature-tour`,
      type: 'feature_tour',
      format: 'steps',
      title: '功能导览',
      description: '了解产品的主要功能',
      targetAudience: 'beginner',
      estimatedMinutes: Math.ceil(steps.length * 1),
      steps,
      createdAt: now,
      updatedAt: now
    }
  }

  /**
   * 生成教程HTML
   */
  generateTutorialHTML(tutorial: Tutorial): string {
    const stepsHTML = tutorial.steps.map(step => `
      <div class="tutorial-step" data-step="${step.order}">
        <div class="step-header">
          <span class="step-number">${step.order}</span>
          <h3 class="step-title">${step.title}</h3>
        </div>
        <p class="step-description">${step.description}</p>
        <div class="step-action">
          <strong>操作：</strong>${step.action}
        </div>
        <div class="step-result">
          <strong>预期结果：</strong>${step.expectedResult}
        </div>
        ${step.tips ? `
          <div class="step-tips">
            <strong>小贴士：</strong>
            <ul>${step.tips.map(tip => `<li>${tip}</li>`).join('')}</ul>
          </div>
        ` : ''}
        ${step.faq ? `
          <div class="step-faq">
            <strong>常见问题：</strong>
            ${step.faq.map(f => `
              <div class="faq-item">
                <div class="faq-q">问：${f.question}</div>
                <div class="faq-a">答：${f.answer}</div>
              </div>
            `).join('')}
          </div>
        ` : ''}
        ${step.imageUrl ? `<img src="${step.imageUrl}" alt="${step.title}" class="step-image" />` : ''}
        ${step.gifUrl ? `<img src="${step.gifUrl}" alt="${step.title}" class="step-gif" />` : ''}
      </div>
    `).join('')

    return `
      <div class="tutorial" data-tutorial-id="${tutorial.id}">
        <div class="tutorial-header">
          <h1>${tutorial.title}</h1>
          <p class="tutorial-desc">${tutorial.description}</p>
          <div class="tutorial-meta">
            <span class="tutorial-time">预计耗时：${tutorial.estimatedMinutes} 分钟</span>
            <span class="tutorial-level">难度：${tutorial.targetAudience === 'beginner' ? '入门' : tutorial.targetAudience === 'intermediate' ? '进阶' : '高级'}</span>
          </div>
        </div>
        <div class="tutorial-steps">
          ${stepsHTML}
        </div>
        <div class="tutorial-footer">
          <p>完成了吗？如有问题请联系客服</p>
        </div>
      </div>
    `
  }

  /**
   * 生成教程Markdown
   */
  generateTutorialMarkdown(tutorial: Tutorial): string {
    const stepsMarkdown = tutorial.steps.map(step => `
### 第${step.order}步：${step.title}

${step.description}

**操作：** ${step.action}

**预期结果：** ${step.expectedResult}

${step.tips ? `
> **小贴士：**
${step.tips.map(tip => `> - ${tip}`).join('\n')}
` : ''}

${step.faq ? `
**常见问题：**
${step.faq.map(f => `
- **问：** ${f.question}
  **答：** ${f.answer}
`).join('')}
` : ''}
---
`).join('')

    return `# ${tutorial.title}

${tutorial.description}

- **预计耗时：** ${tutorial.estimatedMinutes} 分钟
- **难度级别：** ${tutorial.targetAudience === 'beginner' ? '入门' : tutorial.targetAudience === 'intermediate' ? '进阶' : '高级'}

---

${stepsMarkdown}

## 需要帮助？

如有任何问题，请联系客服获取支持。
`
  }

  /**
   * 生成交互式教程数据（用于前端组件）
   */
  generateInteractiveTutorial(tutorial: Tutorial): {
    id: string
    title: string
    description: string
    totalSteps: number
    estimatedMinutes: number
    steps: {
      id: string
      order: number
      title: string
      content: string
      action: string
      tips: string[]
      completed: boolean
    }[]
  } {
    return {
      id: tutorial.id,
      title: tutorial.title,
      description: tutorial.description,
      totalSteps: tutorial.steps.length,
      estimatedMinutes: tutorial.estimatedMinutes,
      steps: tutorial.steps.map(step => ({
        id: step.id,
        order: step.order,
        title: step.title,
        content: `${step.description}\n\n**预期结果：** ${step.expectedResult}`,
        action: step.action,
        tips: step.tips || [],
        completed: false
      }))
    }
  }

  /**
   * 获取快速入门卡片数据
   */
  getQuickStartCards(tutorials: Tutorial[]): {
    id: string
    title: string
    description: string
    icon: string
    estimatedMinutes: number
    stepsCount: number
  }[] {
    const iconMap: Record<TutorialType, string> = {
      quick_start: '🚀',
      admin_guide: '⚙️',
      feature_tour: '🎯',
      troubleshoot: '🔧',
      customization: '🎨'
    }

    return tutorials.map(t => ({
      id: t.id,
      title: t.title,
      description: t.description,
      icon: iconMap[t.type] || '📖',
      estimatedMinutes: t.estimatedMinutes,
      stepsCount: t.steps.length
    }))
  }
}

// 导出单例实例
export const tutorialGenerator = TutorialGeneratorService.getInstance()
