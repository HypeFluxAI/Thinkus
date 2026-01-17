/**
 * 增强版交付报告服务
 *
 * 为小白用户提供更友好的交付报告：
 * - 视频教程链接
 * - 二维码快速访问
 * - 分步骤使用指南
 * - 常见问题解答
 * - 紧急联系方式
 */

// ============================================================================
// 类型定义
// ============================================================================

/** 视频教程 */
export interface VideoTutorial {
  id: string
  title: string
  description: string
  duration: string  // 如 "2:30"
  url: string
  thumbnail?: string
  category: 'getting_started' | 'feature' | 'admin' | 'troubleshoot'
}

/** 快速入门步骤 */
export interface QuickStartStep {
  order: number
  title: string
  description: string
  action: string        // 操作说明
  expectedResult: string // 预期结果
  tips?: string[]       // 小贴士
  imageUrl?: string
  videoUrl?: string
}

/** FAQ 项 */
export interface FAQItem {
  question: string
  answer: string
  category: 'login' | 'feature' | 'payment' | 'data' | 'other'
  relatedVideoId?: string
}

/** 紧急联系方式 */
export interface EmergencyContact {
  type: 'phone' | 'wechat' | 'email' | 'ticket'
  label: string
  value: string
  workingHours?: string
  responseTime?: string
  priority: number
}

/** 增强报告配置 */
export interface EnhancedReportConfig {
  projectId: string
  projectName: string
  productType: string
  productUrl: string
  adminUrl: string
  credentials: {
    email: string
    tempPassword: string
    loginUrl: string
  }
  clientName: string
  clientEmail: string
  deliveryDate: Date
  customBranding?: {
    logo?: string
    primaryColor?: string
    companyName?: string
  }
}

/** 增强报告数据 */
export interface EnhancedDeliveryReport {
  id: string
  config: EnhancedReportConfig
  quickStart: QuickStartStep[]
  tutorials: VideoTutorial[]
  faqs: FAQItem[]
  emergencyContacts: EmergencyContact[]
  qrCodes: {
    productUrl: string   // base64 QR code
    adminUrl: string
    wechatSupport?: string
  }
  expiresAt?: Date
  generatedAt: Date
}

// ============================================================================
// 预定义内容
// ============================================================================

/** 产品类型对应的视频教程 */
const PRODUCT_TUTORIALS: Record<string, VideoTutorial[]> = {
  'ecommerce': [
    {
      id: 'ecom_start',
      title: '3分钟快速上手',
      description: '了解您的电商平台基本操作',
      duration: '3:00',
      url: 'https://thinkus.app/tutorials/ecommerce-quickstart',
      category: 'getting_started',
    },
    {
      id: 'ecom_products',
      title: '如何添加商品',
      description: '手把手教您上传第一个商品',
      duration: '2:30',
      url: 'https://thinkus.app/tutorials/add-product',
      category: 'feature',
    },
    {
      id: 'ecom_orders',
      title: '订单处理流程',
      description: '从收到订单到发货的完整流程',
      duration: '4:00',
      url: 'https://thinkus.app/tutorials/order-process',
      category: 'feature',
    },
    {
      id: 'ecom_payment',
      title: '收款设置',
      description: '配置支付宝、微信支付',
      duration: '3:30',
      url: 'https://thinkus.app/tutorials/payment-setup',
      category: 'admin',
    },
  ],
  'web-app': [
    {
      id: 'webapp_start',
      title: '快速开始使用',
      description: '了解您的应用基本功能',
      duration: '2:00',
      url: 'https://thinkus.app/tutorials/webapp-quickstart',
      category: 'getting_started',
    },
    {
      id: 'webapp_admin',
      title: '管理后台使用指南',
      description: '如何管理您的应用',
      duration: '3:00',
      url: 'https://thinkus.app/tutorials/admin-guide',
      category: 'admin',
    },
  ],
  'content': [
    {
      id: 'content_start',
      title: '开始创作内容',
      description: '发布您的第一篇文章',
      duration: '2:30',
      url: 'https://thinkus.app/tutorials/content-quickstart',
      category: 'getting_started',
    },
    {
      id: 'content_seo',
      title: 'SEO 优化基础',
      description: '让更多人找到您的内容',
      duration: '4:00',
      url: 'https://thinkus.app/tutorials/seo-basics',
      category: 'feature',
    },
  ],
}

/** 产品类型对应的快速入门步骤 */
const PRODUCT_QUICKSTART: Record<string, QuickStartStep[]> = {
  'ecommerce': [
    {
      order: 1,
      title: '访问您的网店',
      description: '首先，让我们打开您的网店看看',
      action: '点击下方「访问网店」按钮，或在浏览器输入网址',
      expectedResult: '看到您的网店首页',
      tips: ['建议收藏到浏览器书签', '可以分享给朋友看看'],
    },
    {
      order: 2,
      title: '登录管理后台',
      description: '进入后台管理您的网店',
      action: '点击「管理后台」，使用邮箱和临时密码登录',
      expectedResult: '进入管理后台仪表盘',
      tips: ['首次登录需要修改密码', '请牢记您的新密码'],
    },
    {
      order: 3,
      title: '添加第一个商品',
      description: '上传您的第一个商品',
      action: '点击「商品管理」→「添加商品」，填写商品信息并上传图片',
      expectedResult: '商品出现在商品列表中',
      tips: ['商品图片建议用正方形', '标题要包含关键词'],
    },
    {
      order: 4,
      title: '设置支付方式',
      description: '让客户可以付款',
      action: '进入「设置」→「支付设置」，按提示配置支付宝/微信支付',
      expectedResult: '支付状态显示「已启用」',
      tips: ['需要准备营业执照', '审核通常1-3个工作日'],
    },
    {
      order: 5,
      title: '邀请您的第一个客户',
      description: '分享给朋友试试',
      action: '复制网店链接，发送给朋友或发到朋友圈',
      expectedResult: '收到第一个访问或订单',
      tips: ['可以给朋友发个小红包鼓励下单', '收集反馈改进网店'],
    },
  ],
  'web-app': [
    {
      order: 1,
      title: '打开您的应用',
      description: '访问您的应用网址',
      action: '点击下方链接或在浏览器输入网址',
      expectedResult: '看到应用首页',
    },
    {
      order: 2,
      title: '登录管理后台',
      description: '使用管理员账号登录',
      action: '输入邮箱和临时密码',
      expectedResult: '进入管理仪表盘',
    },
    {
      order: 3,
      title: '了解核心功能',
      description: '浏览各个功能模块',
      action: '点击左侧菜单，逐个查看功能',
      expectedResult: '熟悉应用的主要功能',
    },
  ],
}

/** 通用 FAQ */
const COMMON_FAQS: FAQItem[] = [
  {
    question: '忘记密码怎么办？',
    answer: '点击登录页面的「忘记密码」，输入您的邮箱，会收到重置链接。如果没收到邮件，请检查垃圾箱，或联系客服。',
    category: 'login',
  },
  {
    question: '网站打不开怎么办？',
    answer: '1. 检查网络连接是否正常\n2. 尝试清除浏览器缓存\n3. 换个浏览器试试\n4. 如果还是不行，请联系客服',
    category: 'other',
  },
  {
    question: '如何修改网站信息？',
    answer: '登录管理后台，进入「设置」→「网站设置」，可以修改网站名称、Logo、联系方式等信息。',
    category: 'feature',
  },
  {
    question: '数据安全吗？会丢失吗？',
    answer: '您的数据存储在云端，我们每天自动备份，数据安全有保障。如需恢复历史数据，请联系客服。',
    category: 'data',
  },
  {
    question: '如何联系客服？',
    answer: '您可以通过以下方式联系我们：\n1. 客服热线：400-xxx-xxxx（工作日 9:00-18:00）\n2. 微信：扫描报告中的二维码\n3. 邮箱：support@thinkus.app',
    category: 'other',
  },
]

/** 紧急联系方式 */
const EMERGENCY_CONTACTS: EmergencyContact[] = [
  {
    type: 'phone',
    label: '客服热线',
    value: '400-xxx-xxxx',
    workingHours: '周一至周五 9:00-18:00',
    responseTime: '即时响应',
    priority: 1,
  },
  {
    type: 'wechat',
    label: '微信客服',
    value: 'thinkus_support',
    workingHours: '7x24小时',
    responseTime: '5分钟内响应',
    priority: 2,
  },
  {
    type: 'email',
    label: '邮件支持',
    value: 'support@thinkus.app',
    responseTime: '24小时内回复',
    priority: 3,
  },
  {
    type: 'ticket',
    label: '在线工单',
    value: 'https://thinkus.app/support',
    responseTime: '2小时内响应',
    priority: 4,
  },
]

// ============================================================================
// 增强报告服务
// ============================================================================

export class EnhancedDeliveryReportService {
  private static instance: EnhancedDeliveryReportService

  private constructor() {}

  public static getInstance(): EnhancedDeliveryReportService {
    if (!EnhancedDeliveryReportService.instance) {
      EnhancedDeliveryReportService.instance = new EnhancedDeliveryReportService()
    }
    return EnhancedDeliveryReportService.instance
  }

  /**
   * 生成增强报告
   */
  async generateReport(config: EnhancedReportConfig): Promise<EnhancedDeliveryReport> {
    const reportId = `rpt_${config.projectId}_${Date.now()}`

    // 获取产品类型对应的内容
    const productType = config.productType || 'web-app'
    const tutorials = PRODUCT_TUTORIALS[productType] || PRODUCT_TUTORIALS['web-app']
    const quickStart = PRODUCT_QUICKSTART[productType] || PRODUCT_QUICKSTART['web-app']

    // 生成 QR 码
    const qrCodes = {
      productUrl: await this.generateQRCode(config.productUrl),
      adminUrl: await this.generateQRCode(config.adminUrl),
      wechatSupport: await this.generateQRCode('https://thinkus.app/wechat-support'),
    }

    return {
      id: reportId,
      config,
      quickStart,
      tutorials,
      faqs: COMMON_FAQS,
      emergencyContacts: EMERGENCY_CONTACTS,
      qrCodes,
      generatedAt: new Date(),
    }
  }

  /**
   * 生成 QR 码（Base64）
   */
  private async generateQRCode(url: string): Promise<string> {
    // 使用 Google Charts API 生成 QR 码（简化实现）
    // 实际生产环境建议使用 qrcode 库
    const qrUrl = `https://chart.googleapis.com/chart?cht=qr&chs=200x200&chl=${encodeURIComponent(url)}`
    return qrUrl  // 返回 URL，前端可以直接使用
  }

  /**
   * 生成 HTML 报告
   */
  generateHtmlReport(report: EnhancedDeliveryReport): string {
    const { config, quickStart, tutorials, faqs, emergencyContacts, qrCodes } = report
    const brandColor = config.customBranding?.primaryColor || '#6366f1'

    return `
<!DOCTYPE html>
<html lang="zh-CN">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>交付报告 - ${config.projectName}</title>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; line-height: 1.6; color: #333; background: #f5f5f5; }
    .container { max-width: 800px; margin: 0 auto; padding: 20px; }
    .header { background: ${brandColor}; color: white; padding: 40px 20px; text-align: center; border-radius: 12px 12px 0 0; }
    .header h1 { font-size: 28px; margin-bottom: 10px; }
    .header p { opacity: 0.9; }
    .content { background: white; padding: 30px; border-radius: 0 0 12px 12px; }
    .section { margin-bottom: 40px; }
    .section-title { font-size: 20px; color: ${brandColor}; margin-bottom: 20px; padding-bottom: 10px; border-bottom: 2px solid ${brandColor}; }
    .card { background: #f8f9fa; border-radius: 8px; padding: 20px; margin-bottom: 15px; }
    .card-title { font-size: 16px; font-weight: bold; margin-bottom: 10px; }
    .btn { display: inline-block; padding: 12px 24px; background: ${brandColor}; color: white; text-decoration: none; border-radius: 6px; margin-right: 10px; margin-bottom: 10px; }
    .btn:hover { opacity: 0.9; }
    .btn-outline { background: white; color: ${brandColor}; border: 2px solid ${brandColor}; }
    .qr-grid { display: flex; gap: 20px; flex-wrap: wrap; justify-content: center; }
    .qr-item { text-align: center; }
    .qr-item img { width: 150px; height: 150px; margin-bottom: 10px; }
    .qr-item p { font-size: 14px; color: #666; }
    .step { display: flex; align-items: flex-start; gap: 15px; margin-bottom: 20px; }
    .step-number { width: 36px; height: 36px; background: ${brandColor}; color: white; border-radius: 50%; display: flex; align-items: center; justify-content: center; font-weight: bold; flex-shrink: 0; }
    .step-content { flex: 1; }
    .step-title { font-weight: bold; margin-bottom: 5px; }
    .step-desc { color: #666; font-size: 14px; }
    .tips { background: #fff3cd; border-left: 4px solid #ffc107; padding: 10px 15px; margin-top: 10px; font-size: 14px; }
    .tutorial-list { display: grid; grid-template-columns: repeat(auto-fill, minmax(200px, 1fr)); gap: 15px; }
    .tutorial-item { background: white; border: 1px solid #eee; border-radius: 8px; padding: 15px; text-decoration: none; color: inherit; }
    .tutorial-item:hover { border-color: ${brandColor}; }
    .tutorial-duration { font-size: 12px; color: #999; }
    .faq-item { margin-bottom: 15px; }
    .faq-question { font-weight: bold; margin-bottom: 5px; cursor: pointer; }
    .faq-answer { color: #666; font-size: 14px; padding-left: 15px; border-left: 3px solid #eee; }
    .contact-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(180px, 1fr)); gap: 15px; }
    .contact-item { background: #f8f9fa; padding: 15px; border-radius: 8px; text-align: center; }
    .contact-icon { font-size: 24px; margin-bottom: 10px; }
    .contact-label { font-weight: bold; margin-bottom: 5px; }
    .contact-value { color: ${brandColor}; font-size: 14px; }
    .contact-time { font-size: 12px; color: #999; margin-top: 5px; }
    .credentials-box { background: #e8f5e9; border: 1px solid #4caf50; border-radius: 8px; padding: 20px; }
    .credentials-row { display: flex; justify-content: space-between; margin-bottom: 10px; }
    .credentials-label { color: #666; }
    .credentials-value { font-family: monospace; font-weight: bold; }
    .warning { background: #fff3e0; border-left: 4px solid #ff9800; padding: 15px; margin: 20px 0; }
    .footer { text-align: center; padding: 20px; color: #999; font-size: 14px; }
    @media print {
      body { background: white; }
      .container { max-width: 100%; }
      .btn { background: white !important; color: ${brandColor} !important; border: 1px solid ${brandColor}; }
    }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>🎉 恭喜！您的产品已上线</h1>
      <p>${config.projectName}</p>
    </div>

    <div class="content">
      <!-- 快速访问 -->
      <div class="section">
        <h2 class="section-title">📱 快速访问</h2>
        <div style="text-align: center; margin-bottom: 20px;">
          <a href="${config.productUrl}" target="_blank" class="btn">访问网站</a>
          <a href="${config.adminUrl}" target="_blank" class="btn btn-outline">管理后台</a>
        </div>
        <div class="qr-grid">
          <div class="qr-item">
            <img src="${qrCodes.productUrl}" alt="网站二维码">
            <p>扫码访问网站</p>
          </div>
          <div class="qr-item">
            <img src="${qrCodes.adminUrl}" alt="后台二维码">
            <p>扫码进入后台</p>
          </div>
        </div>
      </div>

      <!-- 登录信息 -->
      <div class="section">
        <h2 class="section-title">🔑 登录信息</h2>
        <div class="credentials-box">
          <div class="credentials-row">
            <span class="credentials-label">登录邮箱：</span>
            <span class="credentials-value">${config.credentials.email}</span>
          </div>
          <div class="credentials-row">
            <span class="credentials-label">临时密码：</span>
            <span class="credentials-value">${config.credentials.tempPassword}</span>
          </div>
          <div class="credentials-row">
            <span class="credentials-label">登录地址：</span>
            <span class="credentials-value">${config.credentials.loginUrl}</span>
          </div>
        </div>
        <div class="warning">
          ⚠️ <strong>安全提示：</strong>首次登录后请立即修改密码！临时密码将在24小时后失效。
        </div>
      </div>

      <!-- 快速入门 -->
      <div class="section">
        <h2 class="section-title">🚀 快速入门（5步上手）</h2>
        ${quickStart.map(step => `
          <div class="step">
            <div class="step-number">${step.order}</div>
            <div class="step-content">
              <div class="step-title">${step.title}</div>
              <div class="step-desc">${step.description}</div>
              <div class="card" style="margin-top: 10px;">
                <strong>操作：</strong>${step.action}<br>
                <strong>预期结果：</strong>${step.expectedResult}
              </div>
              ${step.tips ? `
                <div class="tips">
                  💡 小贴士：${step.tips.join('；')}
                </div>
              ` : ''}
            </div>
          </div>
        `).join('')}
      </div>

      <!-- 视频教程 -->
      <div class="section">
        <h2 class="section-title">🎬 视频教程</h2>
        <div class="tutorial-list">
          ${tutorials.map(t => `
            <a href="${t.url}" target="_blank" class="tutorial-item">
              <div class="card-title">${t.title}</div>
              <div class="tutorial-duration">⏱️ ${t.duration}</div>
              <p style="font-size: 13px; color: #666; margin-top: 5px;">${t.description}</p>
            </a>
          `).join('')}
        </div>
      </div>

      <!-- 常见问题 -->
      <div class="section">
        <h2 class="section-title">❓ 常见问题</h2>
        ${faqs.map(faq => `
          <div class="faq-item">
            <div class="faq-question">Q: ${faq.question}</div>
            <div class="faq-answer">${faq.answer.replace(/\n/g, '<br>')}</div>
          </div>
        `).join('')}
      </div>

      <!-- 联系我们 -->
      <div class="section">
        <h2 class="section-title">📞 需要帮助？</h2>
        <p style="margin-bottom: 20px; color: #666;">遇到任何问题，随时联系我们，专业客服为您服务！</p>
        <div class="contact-grid">
          ${emergencyContacts.map(c => `
            <div class="contact-item">
              <div class="contact-icon">${c.type === 'phone' ? '📞' : c.type === 'wechat' ? '💬' : c.type === 'email' ? '📧' : '🎫'}</div>
              <div class="contact-label">${c.label}</div>
              <div class="contact-value">${c.value}</div>
              ${c.workingHours ? `<div class="contact-time">${c.workingHours}</div>` : ''}
              ${c.responseTime ? `<div class="contact-time">${c.responseTime}</div>` : ''}
            </div>
          `).join('')}
        </div>
      </div>
    </div>

    <div class="footer">
      <p>📅 交付日期：${config.deliveryDate.toLocaleDateString('zh-CN')}</p>
      <p>感谢您选择 Thinkus，祝您生意兴隆！</p>
    </div>
  </div>
</body>
</html>
`
  }

  /**
   * 生成简化版报告（一页纸）
   */
  generateSimpleReport(report: EnhancedDeliveryReport): string {
    const { config, qrCodes } = report

    return `
<!DOCTYPE html>
<html lang="zh-CN">
<head>
  <meta charset="UTF-8">
  <title>您的网站已上线 - ${config.projectName}</title>
  <style>
    body { font-family: -apple-system, sans-serif; max-width: 600px; margin: 40px auto; padding: 20px; }
    .header { text-align: center; margin-bottom: 30px; }
    .header h1 { color: #6366f1; }
    .info-box { background: #f5f5f5; padding: 20px; border-radius: 10px; margin-bottom: 20px; }
    .info-row { display: flex; justify-content: space-between; margin-bottom: 10px; }
    .qr-section { display: flex; justify-content: center; gap: 30px; margin: 30px 0; }
    .qr-item { text-align: center; }
    .qr-item img { width: 120px; }
    .btn { display: block; text-align: center; background: #6366f1; color: white; padding: 15px; text-decoration: none; border-radius: 8px; margin: 10px 0; }
    .help { text-align: center; color: #666; margin-top: 30px; }
  </style>
</head>
<body>
  <div class="header">
    <h1>🎉 网站已上线！</h1>
    <p>${config.projectName}</p>
  </div>

  <div class="info-box">
    <div class="info-row"><span>网站地址：</span><span>${config.productUrl}</span></div>
    <div class="info-row"><span>管理后台：</span><span>${config.adminUrl}</span></div>
    <div class="info-row"><span>登录邮箱：</span><span>${config.credentials.email}</span></div>
    <div class="info-row"><span>临时密码：</span><span>${config.credentials.tempPassword}</span></div>
  </div>

  <div class="qr-section">
    <div class="qr-item">
      <img src="${qrCodes.productUrl}" alt="网站">
      <p>扫码访问</p>
    </div>
    <div class="qr-item">
      <img src="${qrCodes.adminUrl}" alt="后台">
      <p>扫码管理</p>
    </div>
  </div>

  <a href="${config.productUrl}" class="btn">立即访问网站</a>
  <a href="${config.adminUrl}" class="btn" style="background: white; color: #6366f1; border: 2px solid #6366f1;">进入管理后台</a>

  <div class="help">
    <p>遇到问题？拨打客服热线 <strong>400-xxx-xxxx</strong></p>
    <p>或添加微信客服 <strong>thinkus_support</strong></p>
  </div>
</body>
</html>
`
  }
}

// 导出单例
export const enhancedDeliveryReport = EnhancedDeliveryReportService.getInstance()
