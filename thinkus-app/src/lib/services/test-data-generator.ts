/**
 * 测试数据生成服务
 *
 * 功能：
 * - 为演示和测试生成假数据
 * - 支持多种产品类型的数据模板
 * - 中文友好的数据生成
 * - 可配置数据量和关联关系
 */

// 数据类型
export type TestDataType =
  | 'users'       // 用户
  | 'products'    // 产品
  | 'orders'      // 订单
  | 'customers'   // 客户
  | 'articles'    // 文章
  | 'comments'    // 评论
  | 'categories'  // 分类
  | 'tags'        // 标签

// 生成配置
export interface GenerateConfig {
  type: TestDataType
  count: number
  locale?: 'zh-CN' | 'en-US'
  relations?: {
    [key: string]: string  // 如 { userId: 'users' } 表示关联到 users
  }
  overrides?: Record<string, unknown>  // 覆盖特定字段
}

// 批量生成配置
export interface BatchGenerateConfig {
  projectId: string
  productType: string
  configs: GenerateConfig[]
  clearExisting?: boolean
}

// 生成结果
export interface GenerateResult {
  type: TestDataType
  count: number
  data: Record<string, unknown>[]
  insertedIds?: string[]
}

// 中文姓名
const CHINESE_SURNAMES = ['张', '李', '王', '刘', '陈', '杨', '黄', '赵', '吴', '周', '徐', '孙', '马', '朱', '胡', '林', '郭', '何', '高', '罗']
const CHINESE_NAMES = ['伟', '芳', '娜', '秀英', '敏', '静', '丽', '强', '磊', '洋', '艳', '勇', '军', '杰', '涛', '明', '超', '秀兰', '霞', '平']

// 中文商品名
const PRODUCT_PREFIXES = ['精品', '优选', '高端', '经典', '时尚', '简约', '现代', '复古', '创意', '智能']
const PRODUCT_TYPES = ['手机壳', '充电器', '耳机', '键盘', '鼠标', '显示器', '音箱', '台灯', '背包', '水杯', 'T恤', '运动鞋', '手表', '眼镜', '钱包']

// 地址
const PROVINCES = ['北京市', '上海市', '广东省', '浙江省', '江苏省', '四川省', '湖北省', '山东省', '河南省', '福建省']
const CITIES = ['朝阳区', '浦东新区', '天河区', '西湖区', '玄武区', '武侯区', '武昌区', '历下区', '金水区', '鼓楼区']
const STREETS = ['人民路', '中山路', '解放路', '建设路', '文化路', '科技路', '创新街', '和平街', '幸福路', '希望路']

// 文章标题
const ARTICLE_TOPICS = ['如何提高工作效率', '2024年最新趋势分析', '新手入门指南', '10个实用技巧', '避免常见错误', '深度解析', '最佳实践', '案例分享', '经验总结', '未来展望']

// 评论模板
const COMMENT_TEMPLATES = [
  '非常好用，推荐！',
  '质量不错，物超所值',
  '发货很快，包装完好',
  '已经是第二次购买了',
  '客服态度很好',
  '比预期的还要好',
  '家人很喜欢',
  '会继续支持',
  '性价比很高',
  '总体满意',
]

export class TestDataGeneratorService {
  private generatedData: Map<string, Record<string, unknown>[]> = new Map()

  /**
   * 生成随机中文姓名
   */
  private generateChineseName(): string {
    const surname = CHINESE_SURNAMES[Math.floor(Math.random() * CHINESE_SURNAMES.length)]
    const name = CHINESE_NAMES[Math.floor(Math.random() * CHINESE_NAMES.length)]
    const name2 = Math.random() > 0.5 ? CHINESE_NAMES[Math.floor(Math.random() * CHINESE_NAMES.length)] : ''
    return surname + name + name2
  }

  /**
   * 生成随机邮箱
   */
  private generateEmail(name?: string): string {
    const domains = ['qq.com', '163.com', 'gmail.com', 'outlook.com', '126.com']
    const domain = domains[Math.floor(Math.random() * domains.length)]
    const username = name || `user${Math.floor(Math.random() * 100000)}`
    return `${username.toLowerCase().replace(/\s/g, '')}@${domain}`
  }

  /**
   * 生成随机手机号
   */
  private generatePhone(): string {
    const prefixes = ['138', '139', '158', '159', '188', '189', '135', '136', '137', '150']
    const prefix = prefixes[Math.floor(Math.random() * prefixes.length)]
    return prefix + Math.floor(Math.random() * 100000000).toString().padStart(8, '0')
  }

  /**
   * 生成随机地址
   */
  private generateAddress(): string {
    const province = PROVINCES[Math.floor(Math.random() * PROVINCES.length)]
    const city = CITIES[Math.floor(Math.random() * CITIES.length)]
    const street = STREETS[Math.floor(Math.random() * STREETS.length)]
    const number = Math.floor(Math.random() * 200) + 1
    return `${province}${city}${street}${number}号`
  }

  /**
   * 生成随机日期
   */
  private generateDate(startYear: number = 2023, endYear: number = 2024): Date {
    const start = new Date(startYear, 0, 1).getTime()
    const end = new Date(endYear, 11, 31).getTime()
    return new Date(start + Math.random() * (end - start))
  }

  /**
   * 生成随机价格
   */
  private generatePrice(min: number = 10, max: number = 1000): number {
    return Math.round((min + Math.random() * (max - min)) * 100) / 100
  }

  /**
   * 生成用户数据
   */
  generateUsers(count: number): Record<string, unknown>[] {
    const users: Record<string, unknown>[] = []

    for (let i = 0; i < count; i++) {
      const name = this.generateChineseName()
      users.push({
        id: `user_${i + 1}`,
        name,
        email: this.generateEmail(`user${i + 1}`),
        phone: this.generatePhone(),
        avatar: `https://api.dicebear.com/7.x/avataaars/svg?seed=${i}`,
        role: i === 0 ? 'admin' : 'user',
        status: Math.random() > 0.1 ? 'active' : 'inactive',
        createdAt: this.generateDate(),
        lastLoginAt: this.generateDate(2024, 2024),
      })
    }

    return users
  }

  /**
   * 生成产品数据
   */
  generateProducts(count: number, categoryIds?: string[]): Record<string, unknown>[] {
    const products: Record<string, unknown>[] = []

    for (let i = 0; i < count; i++) {
      const prefix = PRODUCT_PREFIXES[Math.floor(Math.random() * PRODUCT_PREFIXES.length)]
      const type = PRODUCT_TYPES[Math.floor(Math.random() * PRODUCT_TYPES.length)]
      const price = this.generatePrice(50, 2000)

      products.push({
        id: `prod_${i + 1}`,
        name: `${prefix}${type}`,
        description: `这是一款${prefix.toLowerCase()}的${type}，质量上乘，做工精细。`,
        price,
        originalPrice: Math.random() > 0.3 ? Math.round(price * 1.2 * 100) / 100 : null,
        stock: Math.floor(Math.random() * 500) + 10,
        sold: Math.floor(Math.random() * 1000),
        category: categoryIds?.[Math.floor(Math.random() * categoryIds.length)] || `cat_${Math.floor(Math.random() * 5) + 1}`,
        images: [
          `https://picsum.photos/seed/${i * 3}/400/400`,
          `https://picsum.photos/seed/${i * 3 + 1}/400/400`,
          `https://picsum.photos/seed/${i * 3 + 2}/400/400`,
        ],
        rating: Math.round((4 + Math.random()) * 10) / 10,
        reviewCount: Math.floor(Math.random() * 200),
        status: Math.random() > 0.1 ? 'active' : 'inactive',
        createdAt: this.generateDate(),
      })
    }

    return products
  }

  /**
   * 生成订单数据
   */
  generateOrders(count: number, userIds: string[], productIds: string[]): Record<string, unknown>[] {
    const orders: Record<string, unknown>[] = []
    const statuses = ['pending', 'paid', 'shipped', 'delivered', 'completed', 'cancelled']

    for (let i = 0; i < count; i++) {
      const itemCount = Math.floor(Math.random() * 3) + 1
      const items: Record<string, unknown>[] = []
      let totalAmount = 0

      for (let j = 0; j < itemCount; j++) {
        const productId = productIds[Math.floor(Math.random() * productIds.length)]
        const quantity = Math.floor(Math.random() * 3) + 1
        const price = this.generatePrice(50, 500)
        totalAmount += price * quantity

        items.push({
          productId,
          quantity,
          price,
          subtotal: price * quantity,
        })
      }

      orders.push({
        id: `order_${i + 1}`,
        orderNumber: `ORD${Date.now()}${i.toString().padStart(4, '0')}`,
        userId: userIds[Math.floor(Math.random() * userIds.length)],
        items,
        totalAmount: Math.round(totalAmount * 100) / 100,
        status: statuses[Math.floor(Math.random() * statuses.length)],
        shippingAddress: this.generateAddress(),
        paymentMethod: Math.random() > 0.5 ? 'wechat' : 'alipay',
        createdAt: this.generateDate(),
        paidAt: Math.random() > 0.3 ? this.generateDate() : null,
        shippedAt: Math.random() > 0.5 ? this.generateDate() : null,
        deliveredAt: Math.random() > 0.7 ? this.generateDate() : null,
      })
    }

    return orders
  }

  /**
   * 生成客户数据
   */
  generateCustomers(count: number): Record<string, unknown>[] {
    const customers: Record<string, unknown>[] = []
    const levels = ['bronze', 'silver', 'gold', 'platinum']

    for (let i = 0; i < count; i++) {
      const name = this.generateChineseName()
      const totalSpent = this.generatePrice(100, 50000)

      customers.push({
        id: `cust_${i + 1}`,
        name,
        email: this.generateEmail(`cust${i + 1}`),
        phone: this.generatePhone(),
        address: this.generateAddress(),
        level: levels[Math.floor(Math.random() * levels.length)],
        points: Math.floor(totalSpent),
        totalOrders: Math.floor(Math.random() * 50) + 1,
        totalSpent,
        lastOrderAt: this.generateDate(2024, 2024),
        createdAt: this.generateDate(2022, 2023),
        tags: ['VIP客户', '活跃用户', '老客户'].slice(0, Math.floor(Math.random() * 3)),
      })
    }

    return customers
  }

  /**
   * 生成文章数据
   */
  generateArticles(count: number, authorIds?: string[]): Record<string, unknown>[] {
    const articles: Record<string, unknown>[] = []

    for (let i = 0; i < count; i++) {
      const topic = ARTICLE_TOPICS[Math.floor(Math.random() * ARTICLE_TOPICS.length)]

      articles.push({
        id: `article_${i + 1}`,
        title: topic,
        slug: `article-${i + 1}`,
        summary: `${topic}的详细介绍，帮助您更好地了解相关内容。`,
        content: `# ${topic}\n\n这是一篇关于${topic}的文章。\n\n## 简介\n\n在这篇文章中，我们将详细介绍...`,
        coverImage: `https://picsum.photos/seed/article${i}/800/400`,
        authorId: authorIds?.[Math.floor(Math.random() * authorIds.length)] || `user_${Math.floor(Math.random() * 5) + 1}`,
        category: ['技术', '生活', '经济', '教育'][Math.floor(Math.random() * 4)],
        tags: ['热门', '推荐', '精选'].slice(0, Math.floor(Math.random() * 3) + 1),
        viewCount: Math.floor(Math.random() * 10000),
        likeCount: Math.floor(Math.random() * 500),
        commentCount: Math.floor(Math.random() * 100),
        status: Math.random() > 0.2 ? 'published' : 'draft',
        publishedAt: Math.random() > 0.2 ? this.generateDate() : null,
        createdAt: this.generateDate(),
      })
    }

    return articles
  }

  /**
   * 生成评论数据
   */
  generateComments(count: number, userIds: string[], targetIds: string[]): Record<string, unknown>[] {
    const comments: Record<string, unknown>[] = []

    for (let i = 0; i < count; i++) {
      const template = COMMENT_TEMPLATES[Math.floor(Math.random() * COMMENT_TEMPLATES.length)]

      comments.push({
        id: `comment_${i + 1}`,
        content: template,
        userId: userIds[Math.floor(Math.random() * userIds.length)],
        targetId: targetIds[Math.floor(Math.random() * targetIds.length)],
        rating: Math.floor(Math.random() * 2) + 4, // 4-5星
        images: Math.random() > 0.7 ? [
          `https://picsum.photos/seed/comment${i}/200/200`,
        ] : [],
        likeCount: Math.floor(Math.random() * 50),
        status: 'approved',
        createdAt: this.generateDate(),
      })
    }

    return comments
  }

  /**
   * 生成分类数据
   */
  generateCategories(productType: string): Record<string, unknown>[] {
    const categoryConfigs: Record<string, string[]> = {
      'ecommerce': ['数码产品', '家居用品', '服装鞋包', '美妆护肤', '食品饮料', '运动户外'],
      'blog': ['技术', '生活', '旅行', '美食', '摄影', '读书'],
      'saas': ['功能介绍', '使用教程', '更新日志', '最佳实践'],
      'default': ['分类一', '分类二', '分类三', '分类四'],
    }

    const names = categoryConfigs[productType] || categoryConfigs.default

    return names.map((name, i) => ({
      id: `cat_${i + 1}`,
      name,
      slug: `category-${i + 1}`,
      description: `${name}相关的内容`,
      icon: ['📱', '🏠', '👕', '💄', '🍔', '⚽'][i] || '📁',
      order: i + 1,
      productCount: Math.floor(Math.random() * 100),
      status: 'active',
      createdAt: this.generateDate(2023, 2023),
    }))
  }

  /**
   * 根据产品类型批量生成测试数据
   */
  generateForProductType(productType: string, config?: {
    userCount?: number
    productCount?: number
    orderCount?: number
    customerCount?: number
    articleCount?: number
    commentCount?: number
  }): Record<string, Record<string, unknown>[]> {
    const {
      userCount = 20,
      productCount = 50,
      orderCount = 100,
      customerCount = 30,
      articleCount = 20,
      commentCount = 100,
    } = config || {}

    const result: Record<string, Record<string, unknown>[]> = {}

    // 生成分类
    const categories = this.generateCategories(productType)
    result.categories = categories
    const categoryIds = categories.map(c => c.id as string)

    // 生成用户
    const users = this.generateUsers(userCount)
    result.users = users
    const userIds = users.map(u => u.id as string)

    if (productType === 'ecommerce') {
      // 电商类型
      const products = this.generateProducts(productCount, categoryIds)
      result.products = products
      const productIds = products.map(p => p.id as string)

      result.customers = this.generateCustomers(customerCount)
      result.orders = this.generateOrders(orderCount, userIds, productIds)
      result.comments = this.generateComments(commentCount, userIds, productIds)
    } else if (productType === 'blog' || productType === 'content') {
      // 内容类型
      result.articles = this.generateArticles(articleCount, userIds)
      const articleIds = result.articles.map(a => a.id as string)
      result.comments = this.generateComments(commentCount, userIds, articleIds)
    } else {
      // 通用类型
      result.products = this.generateProducts(productCount, categoryIds)
      result.customers = this.generateCustomers(customerCount)
    }

    // 缓存生成的数据
    for (const [key, data] of Object.entries(result)) {
      this.generatedData.set(key, data)
    }

    return result
  }

  /**
   * 获取生成的数据
   */
  getGeneratedData(type: string): Record<string, unknown>[] {
    return this.generatedData.get(type) || []
  }

  /**
   * 生成 SQL INSERT 语句
   */
  generateSQLInsert(tableName: string, data: Record<string, unknown>[]): string {
    if (data.length === 0) return ''

    const columns = Object.keys(data[0])
    let sql = ''

    for (const row of data) {
      const values = columns.map(col => {
        const value = row[col]
        if (value === null || value === undefined) return 'NULL'
        if (typeof value === 'string') return `'${value.replace(/'/g, "''")}'`
        if (typeof value === 'number') return value.toString()
        if (typeof value === 'boolean') return value ? '1' : '0'
        if (value instanceof Date) return `'${value.toISOString()}'`
        return `'${JSON.stringify(value).replace(/'/g, "''")}'`
      })

      sql += `INSERT INTO ${tableName} (${columns.join(', ')}) VALUES (${values.join(', ')});\n`
    }

    return sql
  }

  /**
   * 生成 MongoDB 插入脚本
   */
  generateMongoInsert(collectionName: string, data: Record<string, unknown>[]): string {
    return `db.${collectionName}.insertMany(${JSON.stringify(data, null, 2)});`
  }

  /**
   * 生成数据统计
   */
  generateStats(): Record<string, number> {
    const stats: Record<string, number> = {}

    for (const [key, data] of this.generatedData) {
      stats[key] = data.length
    }

    return stats
  }

  /**
   * 清空生成的数据
   */
  clear(): void {
    this.generatedData.clear()
  }

  /**
   * 生成预览 HTML
   */
  generatePreviewHtml(productType: string): string {
    const data = this.generateForProductType(productType)
    const stats = this.generateStats()

    return `
<!DOCTYPE html>
<html lang="zh-CN">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>测试数据预览</title>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
      background: #f8fafc;
      padding: 30px;
    }
    .container { max-width: 1200px; margin: 0 auto; }
    h1 { font-size: 24px; margin-bottom: 20px; }

    .stats {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(150px, 1fr));
      gap: 15px;
      margin-bottom: 30px;
    }
    .stat {
      background: #fff;
      padding: 20px;
      border-radius: 12px;
      box-shadow: 0 1px 3px rgba(0,0,0,0.1);
      text-align: center;
    }
    .stat-value { font-size: 32px; font-weight: bold; color: #3b82f6; }
    .stat-label { font-size: 14px; color: #64748b; margin-top: 5px; }

    .tables {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(500px, 1fr));
      gap: 20px;
    }
    .table-card {
      background: #fff;
      border-radius: 12px;
      box-shadow: 0 1px 3px rgba(0,0,0,0.1);
      overflow: hidden;
    }
    .table-header {
      padding: 15px 20px;
      background: #f8fafc;
      border-bottom: 1px solid #e2e8f0;
      font-weight: 600;
    }
    table {
      width: 100%;
      border-collapse: collapse;
    }
    th, td {
      padding: 10px 15px;
      text-align: left;
      border-bottom: 1px solid #e2e8f0;
      font-size: 13px;
    }
    th { background: #f8fafc; font-weight: 500; }
    td { color: #475569; }
    tr:hover { background: #f8fafc; }

    .btn {
      display: inline-block;
      padding: 10px 20px;
      background: #3b82f6;
      color: #fff;
      border: none;
      border-radius: 8px;
      cursor: pointer;
      font-size: 14px;
      margin-top: 20px;
    }
  </style>
</head>
<body>
  <div class="container">
    <h1>🎲 测试数据预览 - ${productType}</h1>

    <div class="stats">
      ${Object.entries(stats).map(([key, count]) => `
        <div class="stat">
          <div class="stat-value">${count}</div>
          <div class="stat-label">${key}</div>
        </div>
      `).join('')}
    </div>

    <div class="tables">
      ${Object.entries(data).slice(0, 4).map(([key, items]) => `
        <div class="table-card">
          <div class="table-header">${key} (${items.length}条)</div>
          <table>
            <thead>
              <tr>
                ${Object.keys(items[0] || {}).slice(0, 5).map(col => `<th>${col}</th>`).join('')}
              </tr>
            </thead>
            <tbody>
              ${items.slice(0, 5).map(item => `
                <tr>
                  ${Object.values(item).slice(0, 5).map(val => {
                    const display = typeof val === 'object' ? JSON.stringify(val).slice(0, 30) : String(val).slice(0, 30)
                    return `<td>${display}</td>`
                  }).join('')}
                </tr>
              `).join('')}
            </tbody>
          </table>
        </div>
      `).join('')}
    </div>

    <button class="btn">📥 导入到数据库</button>
  </div>
</body>
</html>
`
  }
}

// 单例导出
export const testDataGenerator = new TestDataGeneratorService()
