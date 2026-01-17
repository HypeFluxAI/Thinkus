/**
 * 价格透明化服务
 *
 * 功能：
 * - 让用户清楚知道自己花了多少钱、钱花在哪里
 * - 提供费用分解和预算预估
 * - 续费提醒和价格变动通知
 */

// ============================================
// 类型定义
// ============================================

export type CostCategory =
  | 'development'     // 开发费用
  | 'hosting'         // 托管费用
  | 'domain'          // 域名费用
  | 'database'        // 数据库费用
  | 'storage'         // 存储费用
  | 'cdn'             // CDN费用
  | 'ssl'             // SSL证书
  | 'support'         // 技术支持
  | 'maintenance'     // 维护费用
  | 'addon'           // 增值服务

export interface CostItem {
  id: string
  category: CostCategory
  name: string              // 人话名称
  description: string       // 简单描述
  amount: number            // 金额（分）
  currency: 'CNY' | 'USD'
  period: 'once' | 'monthly' | 'yearly'
  startDate: Date
  endDate?: Date
  icon: string
  isOptional: boolean       // 是否可取消
}

export interface CostBreakdown {
  projectId: string
  projectName: string

  // 费用汇总
  totalPaid: number         // 已支付总额
  monthlyRecurring: number  // 每月固定支出
  yearlyRecurring: number   // 每年固定支出

  // 分类费用
  items: CostItem[]
  byCategory: Record<CostCategory, number>

  // 时间线
  paymentHistory: PaymentRecord[]
  upcomingPayments: UpcomingPayment[]
}

export interface PaymentRecord {
  id: string
  date: Date
  amount: number
  currency: 'CNY' | 'USD'
  description: string
  category: CostCategory
  invoiceUrl?: string
  receiptUrl?: string
}

export interface UpcomingPayment {
  id: string
  dueDate: Date
  amount: number
  currency: 'CNY' | 'USD'
  description: string
  category: CostCategory
  canCancel: boolean
  autoRenew: boolean
}

export interface BudgetEstimate {
  scenario: 'minimal' | 'standard' | 'premium'
  scenarioLabel: string
  monthlyTotal: number
  yearlyTotal: number
  items: {
    name: string
    monthlyAmount: number
    description: string
  }[]
  comparison?: {
    savingsVsStandard: number
    additionalVsStandard: number
  }
}

// ============================================
// 费用类别配置
// ============================================

const CATEGORY_CONFIG: Record<CostCategory, {
  label: string
  icon: string
  color: string
  description: string
}> = {
  development: {
    label: '开发费用',
    icon: '💻',
    color: '#6366F1',
    description: '产品开发和定制功能'
  },
  hosting: {
    label: '托管费用',
    icon: '🌐',
    color: '#10B981',
    description: '服务器和应用运行'
  },
  domain: {
    label: '域名费用',
    icon: '🔗',
    color: '#F59E0B',
    description: '网站域名注册续费'
  },
  database: {
    label: '数据库费用',
    icon: '🗄️',
    color: '#8B5CF6',
    description: '数据存储和管理'
  },
  storage: {
    label: '存储费用',
    icon: '📦',
    color: '#EC4899',
    description: '文件和图片存储'
  },
  cdn: {
    label: 'CDN加速',
    icon: '⚡',
    color: '#14B8A6',
    description: '全球访问加速'
  },
  ssl: {
    label: 'SSL证书',
    icon: '🔒',
    color: '#22C55E',
    description: '网站安全加密'
  },
  support: {
    label: '技术支持',
    icon: '🛠️',
    color: '#3B82F6',
    description: '问题解答和技术帮助'
  },
  maintenance: {
    label: '维护费用',
    icon: '🔧',
    color: '#EF4444',
    description: '系统更新和维护'
  },
  addon: {
    label: '增值服务',
    icon: '✨',
    color: '#A855F7',
    description: '额外功能和服务'
  }
}

// ============================================
// 服务实现
// ============================================

export class PricingTransparencyService {

  getCategoryConfig(category: CostCategory) {
    return CATEGORY_CONFIG[category]
  }

  // 获取项目费用分解
  async getCostBreakdown(projectId: string): Promise<CostBreakdown> {
    // TODO: 从数据库获取真实数据
    // 这里返回示例数据
    const items: CostItem[] = [
      {
        id: 'dev_001',
        category: 'development',
        name: '产品开发',
        description: '基于您的需求定制开发',
        amount: 999900, // 9999元
        currency: 'CNY',
        period: 'once',
        startDate: new Date('2024-01-01'),
        icon: '💻',
        isOptional: false
      },
      {
        id: 'hosting_001',
        category: 'hosting',
        name: '应用托管',
        description: '服务器运行和维护',
        amount: 9900, // 99元/月
        currency: 'CNY',
        period: 'monthly',
        startDate: new Date('2024-01-01'),
        icon: '🌐',
        isOptional: false
      },
      {
        id: 'domain_001',
        category: 'domain',
        name: '域名服务',
        description: '.com 域名一年',
        amount: 6900, // 69元/年
        currency: 'CNY',
        period: 'yearly',
        startDate: new Date('2024-01-01'),
        icon: '🔗',
        isOptional: false
      }
    ]

    const byCategory = this.calculateByCategory(items)
    const monthlyRecurring = items
      .filter(i => i.period === 'monthly')
      .reduce((sum, i) => sum + i.amount, 0)
    const yearlyRecurring = items
      .filter(i => i.period === 'yearly')
      .reduce((sum, i) => sum + i.amount, 0)
    const totalPaid = items.reduce((sum, i) => sum + i.amount, 0)

    return {
      projectId,
      projectName: '我的项目',
      totalPaid,
      monthlyRecurring,
      yearlyRecurring,
      items,
      byCategory,
      paymentHistory: [],
      upcomingPayments: []
    }
  }

  // 按类别计算费用
  private calculateByCategory(items: CostItem[]): Record<CostCategory, number> {
    const result: Record<CostCategory, number> = {
      development: 0,
      hosting: 0,
      domain: 0,
      database: 0,
      storage: 0,
      cdn: 0,
      ssl: 0,
      support: 0,
      maintenance: 0,
      addon: 0
    }

    items.forEach(item => {
      result[item.category] += item.amount
    })

    return result
  }

  // 生成预算估算
  generateBudgetEstimates(productType: string): BudgetEstimate[] {
    const estimates: BudgetEstimate[] = [
      {
        scenario: 'minimal',
        scenarioLabel: '经济方案',
        monthlyTotal: 9900,
        yearlyTotal: 118800,
        items: [
          { name: '基础托管', monthlyAmount: 4900, description: '够用就好' },
          { name: '共享数据库', monthlyAmount: 0, description: '免费额度' },
          { name: '基础存储', monthlyAmount: 0, description: '1GB免费' },
          { name: '免费SSL', monthlyAmount: 0, description: '自动签发' },
          { name: '邮件支持', monthlyAmount: 5000, description: '48小时响应' }
        ],
        comparison: {
          savingsVsStandard: 9900,
          additionalVsStandard: 0
        }
      },
      {
        scenario: 'standard',
        scenarioLabel: '标准方案',
        monthlyTotal: 19800,
        yearlyTotal: 237600,
        items: [
          { name: '专业托管', monthlyAmount: 9900, description: '稳定可靠' },
          { name: '独立数据库', monthlyAmount: 4900, description: '专属资源' },
          { name: '10GB存储', monthlyAmount: 0, description: '含在套餐' },
          { name: '免费SSL', monthlyAmount: 0, description: '自动续期' },
          { name: '工单支持', monthlyAmount: 5000, description: '24小时响应' }
        ]
      },
      {
        scenario: 'premium',
        scenarioLabel: '高级方案',
        monthlyTotal: 49800,
        yearlyTotal: 597600,
        items: [
          { name: '企业托管', monthlyAmount: 19900, description: '高可用集群' },
          { name: '高性能数据库', monthlyAmount: 14900, description: '自动扩容' },
          { name: '100GB存储', monthlyAmount: 4900, description: 'CDN加速' },
          { name: '企业SSL', monthlyAmount: 0, description: '绿色地址栏' },
          { name: 'VIP支持', monthlyAmount: 10000, description: '专属客服' }
        ],
        comparison: {
          savingsVsStandard: 0,
          additionalVsStandard: 30000
        }
      }
    ]

    return estimates
  }

  // 格式化金额显示
  formatAmount(amount: number, currency: 'CNY' | 'USD' = 'CNY'): string {
    const value = amount / 100
    if (currency === 'CNY') {
      return `¥${value.toFixed(2)}`
    }
    return `$${value.toFixed(2)}`
  }

  // 生成人话费用说明
  generateHumanReadableSummary(breakdown: CostBreakdown): string {
    const total = this.formatAmount(breakdown.totalPaid)
    const monthly = this.formatAmount(breakdown.monthlyRecurring)

    let summary = `您的项目「${breakdown.projectName}」费用概览：\n\n`
    summary += `💰 已支付总额：${total}\n`
    summary += `📅 每月固定支出：${monthly}\n\n`

    summary += `费用构成：\n`
    Object.entries(breakdown.byCategory).forEach(([cat, amount]) => {
      if (amount > 0) {
        const config = CATEGORY_CONFIG[cat as CostCategory]
        summary += `${config.icon} ${config.label}：${this.formatAmount(amount)}\n`
      }
    })

    return summary
  }

  // 生成价格页面HTML
  generatePricingPageHtml(estimates: BudgetEstimate[]): string {
    return `<!DOCTYPE html>
<html lang="zh-CN">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>价格方案</title>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
      background: #F9FAFB;
      padding: 40px 20px;
    }

    .container { max-width: 1200px; margin: 0 auto; }

    .header {
      text-align: center;
      margin-bottom: 48px;
    }
    .title {
      font-size: 32px;
      font-weight: 700;
      color: #1F2937;
      margin-bottom: 12px;
    }
    .subtitle {
      font-size: 18px;
      color: #6B7280;
    }

    .plans {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
      gap: 24px;
    }

    .plan {
      background: white;
      border-radius: 16px;
      padding: 32px;
      border: 2px solid #E5E7EB;
      transition: all 0.3s;
    }
    .plan:hover {
      border-color: #6366F1;
      transform: translateY(-4px);
      box-shadow: 0 12px 24px rgba(0,0,0,0.1);
    }
    .plan.popular {
      border-color: #6366F1;
      position: relative;
    }
    .plan.popular::before {
      content: '推荐';
      position: absolute;
      top: -12px;
      left: 50%;
      transform: translateX(-50%);
      background: #6366F1;
      color: white;
      padding: 4px 16px;
      border-radius: 20px;
      font-size: 14px;
      font-weight: 600;
    }

    .plan-name {
      font-size: 20px;
      font-weight: 600;
      color: #1F2937;
      margin-bottom: 8px;
    }
    .plan-price {
      font-size: 36px;
      font-weight: 700;
      color: #6366F1;
      margin-bottom: 4px;
    }
    .plan-period {
      font-size: 14px;
      color: #9CA3AF;
      margin-bottom: 24px;
    }

    .plan-items {
      list-style: none;
      margin-bottom: 24px;
    }
    .plan-item {
      display: flex;
      align-items: flex-start;
      gap: 12px;
      padding: 12px 0;
      border-bottom: 1px solid #F3F4F6;
    }
    .plan-item:last-child { border-bottom: none; }
    .plan-item-icon { color: #10B981; }
    .plan-item-name {
      font-weight: 500;
      color: #374151;
    }
    .plan-item-desc {
      font-size: 13px;
      color: #9CA3AF;
    }
    .plan-item-price {
      margin-left: auto;
      font-weight: 600;
      color: #6366F1;
    }

    .plan-btn {
      width: 100%;
      padding: 14px;
      border: none;
      border-radius: 10px;
      font-size: 16px;
      font-weight: 600;
      cursor: pointer;
      transition: all 0.2s;
    }
    .plan-btn.primary {
      background: #6366F1;
      color: white;
    }
    .plan-btn.secondary {
      background: #F3F4F6;
      color: #374151;
    }
    .plan-btn:hover { transform: scale(1.02); }

    .comparison {
      margin-top: 8px;
      text-align: center;
      font-size: 13px;
      color: #10B981;
    }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1 class="title">选择适合您的方案</h1>
      <p class="subtitle">透明定价，无隐藏费用</p>
    </div>

    <div class="plans">
      ${estimates.map((est, i) => `
        <div class="plan ${i === 1 ? 'popular' : ''}">
          <div class="plan-name">${est.scenarioLabel}</div>
          <div class="plan-price">¥${(est.monthlyTotal / 100).toFixed(0)}</div>
          <div class="plan-period">每月</div>

          <ul class="plan-items">
            ${est.items.map(item => `
              <li class="plan-item">
                <span class="plan-item-icon">✓</span>
                <div>
                  <div class="plan-item-name">${item.name}</div>
                  <div class="plan-item-desc">${item.description}</div>
                </div>
                ${item.monthlyAmount > 0 ? `
                  <span class="plan-item-price">¥${(item.monthlyAmount / 100).toFixed(0)}/月</span>
                ` : `
                  <span class="plan-item-price" style="color: #10B981">免费</span>
                `}
              </li>
            `).join('')}
          </ul>

          <button class="plan-btn ${i === 1 ? 'primary' : 'secondary'}">
            ${i === 1 ? '立即开始' : '选择此方案'}
          </button>

          ${est.comparison?.savingsVsStandard ? `
            <div class="comparison">
              比标准方案节省 ¥${(est.comparison.savingsVsStandard / 100).toFixed(0)}/月
            </div>
          ` : ''}
        </div>
      `).join('')}
    </div>
  </div>
</body>
</html>`
  }

  // 生成费用明细页面HTML
  generateCostBreakdownHtml(breakdown: CostBreakdown): string {
    return `<!DOCTYPE html>
<html lang="zh-CN">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>费用明细 - ${breakdown.projectName}</title>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
      background: #F9FAFB;
      padding: 40px 20px;
    }

    .container { max-width: 800px; margin: 0 auto; }

    .summary-cards {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
      gap: 16px;
      margin-bottom: 32px;
    }
    .summary-card {
      background: white;
      border-radius: 12px;
      padding: 20px;
      box-shadow: 0 1px 3px rgba(0,0,0,0.1);
    }
    .summary-label {
      font-size: 14px;
      color: #6B7280;
      margin-bottom: 8px;
    }
    .summary-value {
      font-size: 28px;
      font-weight: 700;
      color: #1F2937;
    }

    .section {
      background: white;
      border-radius: 12px;
      padding: 24px;
      margin-bottom: 24px;
      box-shadow: 0 1px 3px rgba(0,0,0,0.1);
    }
    .section-title {
      font-size: 18px;
      font-weight: 600;
      color: #1F2937;
      margin-bottom: 16px;
    }

    .cost-item {
      display: flex;
      align-items: center;
      padding: 16px 0;
      border-bottom: 1px solid #F3F4F6;
    }
    .cost-item:last-child { border-bottom: none; }
    .cost-icon {
      width: 40px;
      height: 40px;
      border-radius: 10px;
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 20px;
      margin-right: 16px;
    }
    .cost-info { flex: 1; }
    .cost-name {
      font-weight: 500;
      color: #374151;
      margin-bottom: 4px;
    }
    .cost-desc {
      font-size: 13px;
      color: #9CA3AF;
    }
    .cost-amount {
      text-align: right;
    }
    .cost-value {
      font-weight: 600;
      color: #1F2937;
    }
    .cost-period {
      font-size: 12px;
      color: #9CA3AF;
    }

    .chart-container {
      height: 200px;
      display: flex;
      align-items: flex-end;
      gap: 8px;
      padding: 20px 0;
    }
    .chart-bar {
      flex: 1;
      border-radius: 8px 8px 0 0;
      transition: all 0.3s;
      cursor: pointer;
      position: relative;
    }
    .chart-bar:hover {
      opacity: 0.8;
    }
    .chart-bar::after {
      content: attr(data-label);
      position: absolute;
      bottom: -24px;
      left: 50%;
      transform: translateX(-50%);
      font-size: 12px;
      color: #6B7280;
      white-space: nowrap;
    }
  </style>
</head>
<body>
  <div class="container">
    <h1 style="font-size: 24px; font-weight: 700; margin-bottom: 24px;">
      💰 ${breakdown.projectName} 费用明细
    </h1>

    <div class="summary-cards">
      <div class="summary-card">
        <div class="summary-label">已支付总额</div>
        <div class="summary-value">${this.formatAmount(breakdown.totalPaid)}</div>
      </div>
      <div class="summary-card">
        <div class="summary-label">每月固定支出</div>
        <div class="summary-value">${this.formatAmount(breakdown.monthlyRecurring)}</div>
      </div>
      <div class="summary-card">
        <div class="summary-label">每年固定支出</div>
        <div class="summary-value">${this.formatAmount(breakdown.yearlyRecurring)}</div>
      </div>
    </div>

    <div class="section">
      <h2 class="section-title">费用构成</h2>

      <div class="chart-container">
        ${Object.entries(breakdown.byCategory)
          .filter(([_, amount]) => amount > 0)
          .map(([cat, amount]) => {
            const config = CATEGORY_CONFIG[cat as CostCategory]
            const maxAmount = Math.max(...Object.values(breakdown.byCategory))
            const height = (amount / maxAmount) * 100
            return `
              <div class="chart-bar"
                   style="height: ${height}%; background: ${config.color};"
                   data-label="${config.icon} ${config.label}">
              </div>
            `
          }).join('')}
      </div>
    </div>

    <div class="section">
      <h2 class="section-title">费用详情</h2>

      ${breakdown.items.map(item => {
        const config = CATEGORY_CONFIG[item.category]
        return `
          <div class="cost-item">
            <div class="cost-icon" style="background: ${config.color}20; color: ${config.color};">
              ${item.icon}
            </div>
            <div class="cost-info">
              <div class="cost-name">${item.name}</div>
              <div class="cost-desc">${item.description}</div>
            </div>
            <div class="cost-amount">
              <div class="cost-value">${this.formatAmount(item.amount)}</div>
              <div class="cost-period">${
                item.period === 'once' ? '一次性' :
                item.period === 'monthly' ? '每月' : '每年'
              }</div>
            </div>
          </div>
        `
      }).join('')}
    </div>
  </div>
</body>
</html>`
  }
}

export const pricingTransparency = new PricingTransparencyService()
