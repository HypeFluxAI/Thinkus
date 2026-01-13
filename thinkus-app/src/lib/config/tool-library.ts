/**
 * 工具选择库
 *
 * 原则：
 * 1. 优先选择免费工具
 * 2. 尽可能帮用户省钱
 * 3. 只有必须付费时才推荐付费工具
 */

export interface Tool {
  id: string
  name: string
  category: ToolCategory
  purpose: string
  pricing: 'free' | 'freemium' | 'paid'
  monthlyFee: number
  freeQuota?: string
  website: string
  features: string[]
  limitations?: string[]
  freeAlternatives?: string[]
  recommended: boolean
}

export type ToolCategory =
  | 'hosting'
  | 'database'
  | 'storage'
  | 'auth'
  | 'payment'
  | 'email'
  | 'sms'
  | 'analytics'
  | 'monitoring'
  | 'cdn'
  | 'domain'
  | 'ai'
  | 'search'
  | 'push'

export const TOOL_LIBRARY: Record<ToolCategory, Tool[]> = {
  // 托管服务
  hosting: [
    {
      id: 'vercel-free',
      name: 'Vercel (免费版)',
      category: 'hosting',
      purpose: '前端/全栈应用部署',
      pricing: 'free',
      monthlyFee: 0,
      freeQuota: '100GB带宽/月，无限部署',
      website: 'https://vercel.com',
      features: ['自动HTTPS', '边缘网络', 'Git集成', '预览部署'],
      limitations: ['商业项目需升级', '无自定义域名SSL（免费版）'],
      recommended: true,
    },
    {
      id: 'vercel-pro',
      name: 'Vercel Pro',
      category: 'hosting',
      purpose: '前端/全栈应用部署（商业版）',
      pricing: 'paid',
      monthlyFee: 20,
      website: 'https://vercel.com',
      features: ['自定义域名', '团队协作', '更多带宽', '优先支持'],
      freeAlternatives: ['vercel-free', 'railway-free'],
      recommended: false,
    },
    {
      id: 'railway-free',
      name: 'Railway (免费版)',
      category: 'hosting',
      purpose: '后端服务部署',
      pricing: 'freemium',
      monthlyFee: 0,
      freeQuota: '$5/月免费额度',
      website: 'https://railway.app',
      features: ['Docker支持', '数据库托管', '自动部署'],
      limitations: ['免费额度有限'],
      recommended: true,
    },
    {
      id: 'render-free',
      name: 'Render (免费版)',
      category: 'hosting',
      purpose: '静态网站和Web服务',
      pricing: 'free',
      monthlyFee: 0,
      freeQuota: '静态网站完全免费',
      website: 'https://render.com',
      features: ['自动HTTPS', 'Git部署', '静态网站免费'],
      limitations: ['免费服务会休眠'],
      recommended: true,
    },
  ],

  // 数据库
  database: [
    {
      id: 'mongodb-free',
      name: 'MongoDB Atlas (免费版)',
      category: 'database',
      purpose: 'NoSQL文档数据库',
      pricing: 'free',
      monthlyFee: 0,
      freeQuota: '512MB存储，共享集群',
      website: 'https://mongodb.com/atlas',
      features: ['云托管', '自动备份', '全球分布'],
      limitations: ['存储有限', '共享资源'],
      recommended: true,
    },
    {
      id: 'supabase-free',
      name: 'Supabase (免费版)',
      category: 'database',
      purpose: 'PostgreSQL数据库 + 后端服务',
      pricing: 'free',
      monthlyFee: 0,
      freeQuota: '500MB数据库，1GB存储',
      website: 'https://supabase.com',
      features: ['PostgreSQL', '实时订阅', '认证服务', 'API自动生成'],
      limitations: ['项目会暂停（7天不活跃）'],
      recommended: true,
    },
    {
      id: 'planetscale-free',
      name: 'PlanetScale (免费版)',
      category: 'database',
      purpose: 'MySQL兼容的云数据库',
      pricing: 'free',
      monthlyFee: 0,
      freeQuota: '5GB存储，1个数据库',
      website: 'https://planetscale.com',
      features: ['MySQL兼容', '分支功能', '自动扩展'],
      limitations: ['免费版功能有限'],
      recommended: true,
    },
    {
      id: 'neon-free',
      name: 'Neon (免费版)',
      category: 'database',
      purpose: 'Serverless PostgreSQL',
      pricing: 'free',
      monthlyFee: 0,
      freeQuota: '3GB存储，无限项目',
      website: 'https://neon.tech',
      features: ['Serverless', '自动扩展', '分支功能'],
      recommended: true,
    },
  ],

  // 存储服务
  storage: [
    {
      id: 'cloudflare-r2',
      name: 'Cloudflare R2',
      category: 'storage',
      purpose: '对象存储（S3兼容）',
      pricing: 'freemium',
      monthlyFee: 0,
      freeQuota: '10GB存储，免费出站流量',
      website: 'https://cloudflare.com/r2',
      features: ['S3兼容', '无出站费用', '全球分布'],
      recommended: true,
    },
    {
      id: 'uploadthing',
      name: 'UploadThing',
      category: 'storage',
      purpose: '文件上传服务',
      pricing: 'freemium',
      monthlyFee: 0,
      freeQuota: '2GB存储',
      website: 'https://uploadthing.com',
      features: ['简单API', 'Next.js集成', '类型安全'],
      recommended: true,
    },
  ],

  // 认证服务
  auth: [
    {
      id: 'nextauth',
      name: 'NextAuth.js',
      category: 'auth',
      purpose: '认证库（自托管）',
      pricing: 'free',
      monthlyFee: 0,
      website: 'https://next-auth.js.org',
      features: ['OAuth提供商', '数据库会话', '完全控制'],
      recommended: true,
    },
    {
      id: 'clerk-free',
      name: 'Clerk (免费版)',
      category: 'auth',
      purpose: '托管认证服务',
      pricing: 'freemium',
      monthlyFee: 0,
      freeQuota: '10,000 MAU',
      website: 'https://clerk.com',
      features: ['预制UI', '社交登录', '多因素认证'],
      recommended: false,
    },
  ],

  // 支付服务
  payment: [
    {
      id: 'stripe',
      name: 'Stripe',
      category: 'payment',
      purpose: '在线支付处理',
      pricing: 'paid',
      monthlyFee: 0,
      website: 'https://stripe.com',
      features: ['全球支付', '订阅管理', '发票'],
      limitations: ['按交易收费 2.9% + $0.30'],
      recommended: true,
    },
    {
      id: 'lemonsqueezy',
      name: 'Lemon Squeezy',
      category: 'payment',
      purpose: '数字产品销售',
      pricing: 'paid',
      monthlyFee: 0,
      website: 'https://lemonsqueezy.com',
      features: ['含税处理', '订阅', '联盟营销'],
      limitations: ['按交易收费 5%'],
      recommended: false,
    },
  ],

  // 邮件服务
  email: [
    {
      id: 'resend-free',
      name: 'Resend (免费版)',
      category: 'email',
      purpose: '事务性邮件发送',
      pricing: 'free',
      monthlyFee: 0,
      freeQuota: '3,000封/月，100封/天',
      website: 'https://resend.com',
      features: ['API简单', 'React邮件模板', 'Webhook'],
      recommended: true,
    },
    {
      id: 'sendgrid-free',
      name: 'SendGrid (免费版)',
      category: 'email',
      purpose: '邮件发送服务',
      pricing: 'free',
      monthlyFee: 0,
      freeQuota: '100封/天',
      website: 'https://sendgrid.com',
      features: ['营销邮件', '事务邮件', '分析'],
      recommended: false,
    },
  ],

  // 短信服务
  sms: [
    {
      id: 'aliyun-sms',
      name: '阿里云短信',
      category: 'sms',
      purpose: '国内短信发送',
      pricing: 'paid',
      monthlyFee: 0,
      website: 'https://www.aliyun.com/product/sms',
      features: ['国内短信', '模板审核', '高到达率'],
      limitations: ['按条计费 ¥0.045/条'],
      recommended: true,
    },
    {
      id: 'twilio',
      name: 'Twilio',
      category: 'sms',
      purpose: '国际短信/语音',
      pricing: 'paid',
      monthlyFee: 0,
      website: 'https://twilio.com',
      features: ['全球覆盖', '语音电话', 'WhatsApp'],
      limitations: ['按条计费'],
      recommended: false,
    },
  ],

  // 分析服务
  analytics: [
    {
      id: 'umami',
      name: 'Umami (自托管)',
      category: 'analytics',
      purpose: '网站分析',
      pricing: 'free',
      monthlyFee: 0,
      website: 'https://umami.is',
      features: ['隐私友好', '自托管', '开源'],
      recommended: true,
    },
    {
      id: 'plausible-free',
      name: 'Plausible (自托管)',
      category: 'analytics',
      purpose: '轻量级网站分析',
      pricing: 'free',
      monthlyFee: 0,
      website: 'https://plausible.io',
      features: ['隐私优先', '轻量', '开源'],
      recommended: true,
    },
    {
      id: 'google-analytics',
      name: 'Google Analytics',
      category: 'analytics',
      purpose: '网站分析（功能全面）',
      pricing: 'free',
      monthlyFee: 0,
      website: 'https://analytics.google.com',
      features: ['免费', '功能全面', '与Google生态集成'],
      limitations: ['隐私问题', '数据归Google'],
      recommended: false,
    },
  ],

  // 监控服务
  monitoring: [
    {
      id: 'sentry-free',
      name: 'Sentry (免费版)',
      category: 'monitoring',
      purpose: '错误监控',
      pricing: 'free',
      monthlyFee: 0,
      freeQuota: '5,000事件/月',
      website: 'https://sentry.io',
      features: ['错误追踪', '性能监控', '多平台'],
      recommended: true,
    },
    {
      id: 'betterstack-free',
      name: 'Better Stack (免费版)',
      category: 'monitoring',
      purpose: '运行时间监控',
      pricing: 'free',
      monthlyFee: 0,
      freeQuota: '10个监控器',
      website: 'https://betterstack.com',
      features: ['运行时间监控', '告警', '状态页'],
      recommended: true,
    },
  ],

  // CDN服务
  cdn: [
    {
      id: 'cloudflare-free',
      name: 'Cloudflare (免费版)',
      category: 'cdn',
      purpose: 'CDN和安全防护',
      pricing: 'free',
      monthlyFee: 0,
      website: 'https://cloudflare.com',
      features: ['全球CDN', 'DDoS防护', 'DNS托管', 'SSL'],
      recommended: true,
    },
  ],

  // 域名服务
  domain: [
    {
      id: 'cloudflare-registrar',
      name: 'Cloudflare Registrar',
      category: 'domain',
      purpose: '域名注册（成本价）',
      pricing: 'paid',
      monthlyFee: 0,
      website: 'https://cloudflare.com/products/registrar',
      features: ['成本价域名', '免费WHOIS隐私', 'DNSSEC'],
      limitations: ['年付 ~$10/年'],
      recommended: true,
    },
    {
      id: 'namecheap',
      name: 'Namecheap',
      category: 'domain',
      purpose: '域名注册',
      pricing: 'paid',
      monthlyFee: 0,
      website: 'https://namecheap.com',
      features: ['便宜域名', '免费WHOIS隐私'],
      recommended: false,
    },
  ],

  // AI服务
  ai: [
    {
      id: 'anthropic-claude',
      name: 'Claude API',
      category: 'ai',
      purpose: 'AI对话和生成',
      pricing: 'paid',
      monthlyFee: 0,
      website: 'https://anthropic.com',
      features: ['强大推理', '长上下文', '安全'],
      limitations: ['按token计费'],
      recommended: true,
    },
    {
      id: 'openai',
      name: 'OpenAI API',
      category: 'ai',
      purpose: 'AI对话和生成',
      pricing: 'paid',
      monthlyFee: 0,
      website: 'https://openai.com',
      features: ['GPT模型', '图像生成', '嵌入'],
      limitations: ['按token计费'],
      recommended: false,
    },
  ],

  // 搜索服务
  search: [
    {
      id: 'algolia-free',
      name: 'Algolia (免费版)',
      category: 'search',
      purpose: '全文搜索',
      pricing: 'freemium',
      monthlyFee: 0,
      freeQuota: '10,000条记录，10,000次搜索/月',
      website: 'https://algolia.com',
      features: ['快速搜索', '拼写纠错', '分面搜索'],
      recommended: true,
    },
    {
      id: 'meilisearch',
      name: 'Meilisearch (自托管)',
      category: 'search',
      purpose: '全文搜索（开源）',
      pricing: 'free',
      monthlyFee: 0,
      website: 'https://meilisearch.com',
      features: ['开源', '简单部署', '快速'],
      recommended: true,
    },
  ],

  // 推送服务
  push: [
    {
      id: 'onesignal-free',
      name: 'OneSignal (免费版)',
      category: 'push',
      purpose: '推送通知',
      pricing: 'free',
      monthlyFee: 0,
      freeQuota: '10,000订阅者',
      website: 'https://onesignal.com',
      features: ['Web推送', '移动推送', '邮件'],
      recommended: true,
    },
  ],
}

/**
 * 工具需求接口
 */
export interface ToolRequirements {
  needsHosting?: boolean
  needsDatabase?: boolean
  needsStorage?: boolean
  needsAuth?: boolean
  needsPayment?: boolean
  needsEmail?: boolean
  needsSms?: boolean
  needsAnalytics?: boolean
  needsMonitoring?: boolean
  needsCdn?: boolean
  needsDomain?: boolean
  needsAi?: boolean
  needsSearch?: boolean
  needsPush?: boolean
}

/**
 * 根据需求选择最优工具组合
 */
export function selectOptimalTools(requirements: ToolRequirements): Tool[] {
  const selectedTools: Tool[] = []

  const addRecommendedTool = (category: ToolCategory) => {
    const tools = TOOL_LIBRARY[category]
    // 优先选择免费且推荐的工具
    const freeTool = tools.find(t => t.pricing === 'free' && t.recommended)
    if (freeTool) {
      selectedTools.push(freeTool)
    } else {
      // 其次选择免费增值且推荐的
      const freemiumTool = tools.find(t => t.pricing === 'freemium' && t.recommended)
      if (freemiumTool) {
        selectedTools.push(freemiumTool)
      } else {
        // 最后选择推荐的付费工具
        const paidTool = tools.find(t => t.recommended)
        if (paidTool) {
          selectedTools.push(paidTool)
        }
      }
    }
  }

  if (requirements.needsHosting) addRecommendedTool('hosting')
  if (requirements.needsDatabase) addRecommendedTool('database')
  if (requirements.needsStorage) addRecommendedTool('storage')
  if (requirements.needsAuth) addRecommendedTool('auth')
  if (requirements.needsPayment) addRecommendedTool('payment')
  if (requirements.needsEmail) addRecommendedTool('email')
  if (requirements.needsSms) addRecommendedTool('sms')
  if (requirements.needsAnalytics) addRecommendedTool('analytics')
  if (requirements.needsMonitoring) addRecommendedTool('monitoring')
  if (requirements.needsCdn) addRecommendedTool('cdn')
  if (requirements.needsDomain) addRecommendedTool('domain')
  if (requirements.needsAi) addRecommendedTool('ai')
  if (requirements.needsSearch) addRecommendedTool('search')
  if (requirements.needsPush) addRecommendedTool('push')

  return selectedTools
}

/**
 * 计算工具组合的月度成本
 */
export function calculateMonthlyCost(tools: Tool[]): number {
  return tools.reduce((total, tool) => total + tool.monthlyFee, 0)
}

/**
 * 获取免费替代方案
 */
export function getFreeAlternatives(tool: Tool): Tool[] {
  if (!tool.freeAlternatives) return []

  const alternatives: Tool[] = []
  for (const altId of tool.freeAlternatives) {
    for (const category of Object.values(TOOL_LIBRARY)) {
      const found = category.find(t => t.id === altId)
      if (found) {
        alternatives.push(found)
        break
      }
    }
  }
  return alternatives
}

/**
 * 根据项目类型推荐工具栈
 */
export function getRecommendedStack(projectType: string): Tool[] {
  const baseRequirements: ToolRequirements = {
    needsHosting: true,
    needsDatabase: true,
    needsAuth: true,
  }

  const typeSpecificRequirements: Record<string, ToolRequirements> = {
    web: { needsAnalytics: true, needsCdn: true },
    mobile: { needsPush: true, needsStorage: true },
    ecommerce: { needsPayment: true, needsEmail: true, needsStorage: true },
    saas: { needsPayment: true, needsEmail: true, needsMonitoring: true },
    ai: { needsAi: true, needsDatabase: true },
  }

  const requirements: ToolRequirements = {
    ...baseRequirements,
    ...(typeSpecificRequirements[projectType] || {}),
  }

  return selectOptimalTools(requirements)
}
