/**
 * 知识库集成服务
 *
 * 功能：
 * - 用户可以搜索帮助文档和常见问题
 * - 智能推荐相关文章
 * - 自动根据问题匹配解决方案
 */

// ============================================
// 类型定义
// ============================================

export type ArticleCategory =
  | 'getting-started'   // 入门指南
  | 'features'          // 功能介绍
  | 'troubleshooting'   // 问题排查
  | 'faq'               // 常见问题
  | 'tutorials'         // 教程
  | 'api'               // API文档
  | 'billing'           // 计费相关
  | 'account'           // 账号相关
  | 'security'          // 安全相关
  | 'integrations'      // 集成相关

export interface KnowledgeArticle {
  id: string
  title: string
  summary: string
  content: string
  category: ArticleCategory
  tags: string[]
  keywords: string[]
  views: number
  helpful: number
  notHelpful: number
  lastUpdated: Date
  author: string
  readTime: number       // 阅读时间（分钟）
  relatedArticles: string[]
}

export interface SearchResult {
  articles: KnowledgeArticle[]
  totalCount: number
  query: string
  suggestedQueries: string[]
  relatedCategories: ArticleCategory[]
}

export interface FAQ {
  id: string
  question: string
  answer: string
  category: ArticleCategory
  keywords: string[]
  isPopular: boolean
}

// ============================================
// 知识库内容配置
// ============================================

const CATEGORY_CONFIG: Record<ArticleCategory, {
  label: string
  icon: string
  description: string
}> = {
  'getting-started': {
    label: '入门指南',
    icon: '🚀',
    description: '快速了解如何开始使用'
  },
  'features': {
    label: '功能介绍',
    icon: '✨',
    description: '了解各项功能的使用方法'
  },
  'troubleshooting': {
    label: '问题排查',
    icon: '🔧',
    description: '遇到问题？这里有解决方案'
  },
  'faq': {
    label: '常见问题',
    icon: '❓',
    description: '快速查看常见问题解答'
  },
  'tutorials': {
    label: '视频教程',
    icon: '🎬',
    description: '跟着视频学习操作'
  },
  'api': {
    label: 'API文档',
    icon: '📡',
    description: '开发者API接口文档'
  },
  'billing': {
    label: '计费相关',
    icon: '💳',
    description: '了解费用和支付方式'
  },
  'account': {
    label: '账号相关',
    icon: '👤',
    description: '账号设置和管理'
  },
  'security': {
    label: '安全相关',
    icon: '🔒',
    description: '保护您的账号安全'
  },
  'integrations': {
    label: '集成相关',
    icon: '🔌',
    description: '与其他服务对接'
  }
}

const POPULAR_FAQS: FAQ[] = [
  {
    id: 'faq_1',
    question: '如何登录我的产品管理后台？',
    answer: '您可以通过我们发送给您的邮件中的链接登录，或者直接访问 您的域名/admin，使用交付时提供的账号密码登录。',
    category: 'getting-started',
    keywords: ['登录', '后台', '管理'],
    isPopular: true
  },
  {
    id: 'faq_2',
    question: '忘记密码了怎么办？',
    answer: '在登录页面点击"忘记密码"，输入您的邮箱，我们会发送重置密码的链接给您。如果没收到邮件，请检查垃圾邮件文件夹。',
    category: 'account',
    keywords: ['密码', '忘记', '重置'],
    isPopular: true
  },
  {
    id: 'faq_3',
    question: '如何添加新的商品/内容？',
    answer: '登录后台后，点击左侧菜单的"添加"按钮，按照提示填写信息即可。我们有手把手的引导，一步步教您完成。',
    category: 'features',
    keywords: ['添加', '商品', '内容', '创建'],
    isPopular: true
  },
  {
    id: 'faq_4',
    question: '网站打不开了怎么办？',
    answer: '请先尝试刷新页面或换个浏览器。如果还是打不开，请点击紧急联系按钮，我们会在5分钟内响应。',
    category: 'troubleshooting',
    keywords: ['打不开', '无法访问', '网站'],
    isPopular: true
  },
  {
    id: 'faq_5',
    question: '如何查看我的费用明细？',
    answer: '在您的账户设置中，点击"费用明细"即可查看所有费用记录。我们的价格完全透明，每笔费用都有详细说明。',
    category: 'billing',
    keywords: ['费用', '明细', '账单', '价格'],
    isPopular: true
  }
]

const SAMPLE_ARTICLES: KnowledgeArticle[] = [
  {
    id: 'art_1',
    title: '5分钟快速入门指南',
    summary: '从零开始，5分钟学会使用您的产品',
    content: '欢迎使用！本指南将帮助您快速上手...',
    category: 'getting-started',
    tags: ['入门', '新手', '教程'],
    keywords: ['开始', '第一次', '如何使用'],
    views: 1234,
    helpful: 89,
    notHelpful: 5,
    lastUpdated: new Date('2024-01-15'),
    author: '客服团队',
    readTime: 5,
    relatedArticles: ['art_2', 'art_3']
  }
]

// ============================================
// 服务实现
// ============================================

export class KnowledgeBaseIntegrationService {

  getCategoryConfig(category: ArticleCategory) {
    return CATEGORY_CONFIG[category]
  }

  getAllCategories() {
    return Object.entries(CATEGORY_CONFIG).map(([key, config]) => ({
      id: key as ArticleCategory,
      ...config
    }))
  }

  // 搜索知识库
  async search(query: string, options?: {
    category?: ArticleCategory
    limit?: number
  }): Promise<SearchResult> {
    const normalizedQuery = query.toLowerCase().trim()
    const limit = options?.limit || 10

    // 搜索文章
    let articles = [...SAMPLE_ARTICLES]
    if (options?.category) {
      articles = articles.filter(a => a.category === options.category)
    }

    // 简单关键词匹配
    articles = articles.filter(article =>
      article.title.toLowerCase().includes(normalizedQuery) ||
      article.summary.toLowerCase().includes(normalizedQuery) ||
      article.keywords.some(k => k.includes(normalizedQuery)) ||
      article.tags.some(t => t.includes(normalizedQuery))
    ).slice(0, limit)

    // 搜索FAQ
    const matchedFaqs = POPULAR_FAQS.filter(faq =>
      faq.question.toLowerCase().includes(normalizedQuery) ||
      faq.keywords.some(k => k.includes(normalizedQuery))
    )

    // 生成建议查询
    const suggestedQueries = this.generateSuggestions(normalizedQuery)

    return {
      articles,
      totalCount: articles.length,
      query,
      suggestedQueries,
      relatedCategories: this.findRelatedCategories(normalizedQuery)
    }
  }

  // 获取热门FAQ
  getPopularFAQs(limit: number = 5): FAQ[] {
    return POPULAR_FAQS.filter(f => f.isPopular).slice(0, limit)
  }

  // 获取分类下的文章
  getArticlesByCategory(category: ArticleCategory): KnowledgeArticle[] {
    return SAMPLE_ARTICLES.filter(a => a.category === category)
  }

  // 获取文章详情
  getArticle(articleId: string): KnowledgeArticle | null {
    return SAMPLE_ARTICLES.find(a => a.id === articleId) || null
  }

  // 智能推荐相关文章
  getRecommendations(context: {
    currentPage?: string
    recentActions?: string[]
    userIssue?: string
  }): KnowledgeArticle[] {
    // 根据上下文推荐相关文章
    // 简化实现：返回热门文章
    return SAMPLE_ARTICLES.slice(0, 3)
  }

  // 问题自动匹配解决方案
  async matchSolution(userQuestion: string): Promise<{
    bestMatch: FAQ | null
    confidence: number
    alternativeSolutions: FAQ[]
    needsHumanSupport: boolean
  }> {
    const normalizedQuestion = userQuestion.toLowerCase()

    // 简单关键词匹配
    let bestMatch: FAQ | null = null
    let highestScore = 0

    POPULAR_FAQS.forEach(faq => {
      let score = 0
      faq.keywords.forEach(keyword => {
        if (normalizedQuestion.includes(keyword)) {
          score += 1
        }
      })
      if (faq.question.toLowerCase().includes(normalizedQuestion)) {
        score += 2
      }

      if (score > highestScore) {
        highestScore = score
        bestMatch = faq
      }
    })

    const confidence = Math.min(highestScore / 5, 1)
    const alternatives = POPULAR_FAQS
      .filter(f => f.id !== bestMatch?.id)
      .slice(0, 3)

    return {
      bestMatch: confidence > 0.3 ? bestMatch : null,
      confidence,
      alternativeSolutions: alternatives,
      needsHumanSupport: confidence < 0.3
    }
  }

  // 生成搜索建议
  private generateSuggestions(query: string): string[] {
    const suggestions: string[] = []

    if (query.includes('登录')) {
      suggestions.push('如何登录后台', '忘记密码', '登录失败')
    }
    if (query.includes('添加') || query.includes('创建')) {
      suggestions.push('添加商品', '添加内容', '批量导入')
    }
    if (query.includes('问题') || query.includes('错误')) {
      suggestions.push('常见问题', '网站打不开', '功能报错')
    }

    return suggestions
  }

  // 找到相关分类
  private findRelatedCategories(query: string): ArticleCategory[] {
    const categories: ArticleCategory[] = []

    if (query.includes('登录') || query.includes('密码')) {
      categories.push('account')
    }
    if (query.includes('问题') || query.includes('错误') || query.includes('打不开')) {
      categories.push('troubleshooting')
    }
    if (query.includes('费用') || query.includes('价格')) {
      categories.push('billing')
    }
    if (query.includes('如何') || query.includes('怎么')) {
      categories.push('getting-started', 'features')
    }

    return categories
  }

  // 记录文章反馈
  async recordFeedback(articleId: string, helpful: boolean): Promise<void> {
    // TODO: 存储到数据库
    console.log(`Article ${articleId} feedback: ${helpful ? 'helpful' : 'not helpful'}`)
  }

  // 生成知识库搜索页面HTML
  generateSearchPageHtml(): string {
    return `<!DOCTYPE html>
<html lang="zh-CN">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>帮助中心</title>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
      background: #F9FAFB;
      min-height: 100vh;
    }

    .hero {
      background: linear-gradient(135deg, #6366F1 0%, #8B5CF6 100%);
      color: white;
      padding: 60px 20px;
      text-align: center;
    }
    .hero-title {
      font-size: 32px;
      font-weight: 700;
      margin-bottom: 12px;
    }
    .hero-subtitle {
      font-size: 18px;
      opacity: 0.9;
      margin-bottom: 32px;
    }

    .search-box {
      max-width: 600px;
      margin: 0 auto;
      position: relative;
    }
    .search-input {
      width: 100%;
      padding: 16px 48px 16px 20px;
      font-size: 16px;
      border: none;
      border-radius: 12px;
      box-shadow: 0 4px 12px rgba(0,0,0,0.1);
    }
    .search-input:focus { outline: none; }
    .search-btn {
      position: absolute;
      right: 8px;
      top: 50%;
      transform: translateY(-50%);
      width: 36px;
      height: 36px;
      border: none;
      background: #6366F1;
      border-radius: 8px;
      color: white;
      cursor: pointer;
    }

    .container {
      max-width: 1000px;
      margin: 0 auto;
      padding: 40px 20px;
    }

    .categories {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
      gap: 16px;
      margin-bottom: 48px;
    }
    .category-card {
      background: white;
      border-radius: 12px;
      padding: 24px;
      text-align: center;
      cursor: pointer;
      transition: all 0.2s;
      border: 2px solid transparent;
    }
    .category-card:hover {
      border-color: #6366F1;
      transform: translateY(-2px);
    }
    .category-icon { font-size: 32px; margin-bottom: 12px; }
    .category-label {
      font-weight: 600;
      color: #1F2937;
      margin-bottom: 8px;
    }
    .category-desc {
      font-size: 13px;
      color: #6B7280;
    }

    .section-title {
      font-size: 20px;
      font-weight: 600;
      color: #1F2937;
      margin-bottom: 20px;
    }

    .faq-list { margin-bottom: 48px; }
    .faq-item {
      background: white;
      border-radius: 12px;
      margin-bottom: 12px;
      overflow: hidden;
    }
    .faq-question {
      padding: 20px;
      font-weight: 500;
      color: #374151;
      cursor: pointer;
      display: flex;
      justify-content: space-between;
      align-items: center;
    }
    .faq-question:hover { background: #F9FAFB; }
    .faq-answer {
      padding: 0 20px 20px;
      color: #6B7280;
      line-height: 1.6;
      display: none;
    }
    .faq-item.open .faq-answer { display: block; }
    .faq-item.open .faq-toggle { transform: rotate(180deg); }

    .contact-cta {
      background: white;
      border-radius: 16px;
      padding: 32px;
      text-align: center;
    }
    .contact-title {
      font-size: 18px;
      font-weight: 600;
      color: #1F2937;
      margin-bottom: 12px;
    }
    .contact-desc {
      color: #6B7280;
      margin-bottom: 20px;
    }
    .contact-btn {
      background: #6366F1;
      color: white;
      border: none;
      padding: 12px 32px;
      border-radius: 8px;
      font-size: 16px;
      font-weight: 500;
      cursor: pointer;
    }
  </style>
</head>
<body>
  <div class="hero">
    <h1 class="hero-title">有什么可以帮助您？</h1>
    <p class="hero-subtitle">搜索或浏览下方分类找到答案</p>

    <div class="search-box">
      <input type="text" class="search-input" placeholder="搜索问题或关键词...">
      <button class="search-btn">🔍</button>
    </div>
  </div>

  <div class="container">
    <h2 class="section-title">浏览分类</h2>
    <div class="categories">
      ${Object.entries(CATEGORY_CONFIG).slice(0, 6).map(([key, config]) => `
        <div class="category-card" onclick="location.href='/help/${key}'">
          <div class="category-icon">${config.icon}</div>
          <div class="category-label">${config.label}</div>
          <div class="category-desc">${config.description}</div>
        </div>
      `).join('')}
    </div>

    <h2 class="section-title">常见问题</h2>
    <div class="faq-list">
      ${POPULAR_FAQS.map(faq => `
        <div class="faq-item">
          <div class="faq-question" onclick="this.parentElement.classList.toggle('open')">
            <span>${faq.question}</span>
            <span class="faq-toggle">▼</span>
          </div>
          <div class="faq-answer">${faq.answer}</div>
        </div>
      `).join('')}
    </div>

    <div class="contact-cta">
      <div class="contact-title">没找到答案？</div>
      <div class="contact-desc">我们的客服团队随时准备帮助您</div>
      <button class="contact-btn" onclick="location.href='/support'">联系客服</button>
    </div>
  </div>
</body>
</html>`
  }
}

export const knowledgeBaseIntegration = new KnowledgeBaseIntegrationService()
