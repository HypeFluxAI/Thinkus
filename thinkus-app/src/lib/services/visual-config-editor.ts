/**
 * 可视化配置编辑器服务
 *
 * 小白用户优化 P2-2: 让用户通过可视化界面修改配置
 *
 * 功能:
 * - 解析各种配置文件为可视化表单
 * - 提供友好的配置选项说明
 * - 自动生成配置文件
 * - 配置验证和预览
 */

// 配置类型
export type ConfigType =
  | 'site_info'        // 网站基本信息
  | 'appearance'       // 外观设置
  | 'features'         // 功能开关
  | 'integrations'     // 第三方集成
  | 'seo'              // SEO设置
  | 'analytics'        // 数据分析
  | 'email'            // 邮件设置
  | 'payment'          // 支付设置
  | 'social'           // 社交媒体
  | 'advanced'         // 高级设置

// 配置字段类型
export type FieldType =
  | 'text'
  | 'textarea'
  | 'number'
  | 'boolean'
  | 'select'
  | 'multiselect'
  | 'color'
  | 'image'
  | 'url'
  | 'email'
  | 'password'
  | 'json'

// 配置字段
export interface ConfigField {
  key: string
  label: string
  description: string
  type: FieldType
  defaultValue: unknown
  required: boolean
  placeholder?: string
  options?: Array<{ value: string; label: string }>  // for select/multiselect
  validation?: {
    min?: number
    max?: number
    pattern?: string
    message?: string
  }
  dependsOn?: {
    field: string
    value: unknown
  }
  group?: string  // 分组
  icon?: string
}

// 配置组
export interface ConfigGroup {
  id: string
  label: string
  description: string
  icon: string
  fields: ConfigField[]
}

// 配置分类
export interface ConfigCategory {
  type: ConfigType
  label: string
  description: string
  icon: string
  groups: ConfigGroup[]
}

// 配置值
export interface ConfigValues {
  [key: string]: unknown
}

// 配置变更
export interface ConfigChange {
  field: string
  oldValue: unknown
  newValue: unknown
  timestamp: Date
}

// 配置验证结果
export interface ValidationResult {
  valid: boolean
  errors: Array<{
    field: string
    message: string
  }>
  warnings: Array<{
    field: string
    message: string
  }>
}

// 预定义的配置模板
const CONFIG_TEMPLATES: ConfigCategory[] = [
  {
    type: 'site_info',
    label: '网站信息',
    description: '设置网站的基本信息',
    icon: '🏠',
    groups: [
      {
        id: 'basic',
        label: '基本信息',
        description: '网站名称、描述等基本信息',
        icon: '📝',
        fields: [
          {
            key: 'siteName',
            label: '网站名称',
            description: '您的网站或应用名称，将显示在浏览器标签和搜索结果中',
            type: 'text',
            defaultValue: '',
            required: true,
            placeholder: '我的超酷网站'
          },
          {
            key: 'siteDescription',
            label: '网站描述',
            description: '简短描述您的网站，帮助搜索引擎了解网站内容',
            type: 'textarea',
            defaultValue: '',
            required: false,
            placeholder: '这是一个提供xxx服务的网站...',
            validation: { max: 160, message: '描述不宜超过160个字符' }
          },
          {
            key: 'logo',
            label: '网站Logo',
            description: '上传您的网站Logo图片（建议尺寸: 200x50px）',
            type: 'image',
            defaultValue: '',
            required: false
          },
          {
            key: 'favicon',
            label: '网站图标',
            description: '浏览器标签上显示的小图标（建议尺寸: 32x32px）',
            type: 'image',
            defaultValue: '',
            required: false
          }
        ]
      },
      {
        id: 'contact',
        label: '联系方式',
        description: '网站的联系信息',
        icon: '📞',
        fields: [
          {
            key: 'contactEmail',
            label: '联系邮箱',
            description: '用户可以通过此邮箱联系您',
            type: 'email',
            defaultValue: '',
            required: false,
            placeholder: 'contact@example.com'
          },
          {
            key: 'contactPhone',
            label: '联系电话',
            description: '用户可以通过此电话联系您',
            type: 'text',
            defaultValue: '',
            required: false,
            placeholder: '+86 138-xxxx-xxxx'
          },
          {
            key: 'address',
            label: '公司地址',
            description: '您的办公地址（可选）',
            type: 'textarea',
            defaultValue: '',
            required: false
          }
        ]
      }
    ]
  },
  {
    type: 'appearance',
    label: '外观设置',
    description: '自定义网站的外观风格',
    icon: '🎨',
    groups: [
      {
        id: 'colors',
        label: '颜色方案',
        description: '设置网站的主题颜色',
        icon: '🌈',
        fields: [
          {
            key: 'primaryColor',
            label: '主题色',
            description: '网站的主要颜色，用于按钮、链接等',
            type: 'color',
            defaultValue: '#3B82F6',
            required: true
          },
          {
            key: 'secondaryColor',
            label: '辅助色',
            description: '辅助颜色，用于次要元素',
            type: 'color',
            defaultValue: '#6366F1',
            required: false
          },
          {
            key: 'backgroundColor',
            label: '背景色',
            description: '页面的背景颜色',
            type: 'color',
            defaultValue: '#FFFFFF',
            required: false
          }
        ]
      },
      {
        id: 'theme',
        label: '主题设置',
        description: '整体风格设置',
        icon: '🌙',
        fields: [
          {
            key: 'darkMode',
            label: '深色模式',
            description: '是否启用深色模式支持',
            type: 'select',
            defaultValue: 'auto',
            required: false,
            options: [
              { value: 'light', label: '始终浅色' },
              { value: 'dark', label: '始终深色' },
              { value: 'auto', label: '跟随系统' }
            ]
          },
          {
            key: 'borderRadius',
            label: '圆角大小',
            description: '按钮、卡片等元素的圆角程度',
            type: 'select',
            defaultValue: 'medium',
            required: false,
            options: [
              { value: 'none', label: '无圆角' },
              { value: 'small', label: '小圆角' },
              { value: 'medium', label: '中等圆角' },
              { value: 'large', label: '大圆角' },
              { value: 'full', label: '全圆角' }
            ]
          }
        ]
      }
    ]
  },
  {
    type: 'features',
    label: '功能开关',
    description: '启用或禁用网站功能',
    icon: '⚙️',
    groups: [
      {
        id: 'user_features',
        label: '用户功能',
        description: '与用户相关的功能设置',
        icon: '👤',
        fields: [
          {
            key: 'enableRegistration',
            label: '允许注册',
            description: '是否允许新用户注册',
            type: 'boolean',
            defaultValue: true,
            required: false
          },
          {
            key: 'enableSocialLogin',
            label: '社交登录',
            description: '允许使用微信、Google等账号登录',
            type: 'boolean',
            defaultValue: true,
            required: false
          },
          {
            key: 'requireEmailVerification',
            label: '邮箱验证',
            description: '注册后是否需要验证邮箱',
            type: 'boolean',
            defaultValue: false,
            required: false
          }
        ]
      },
      {
        id: 'content_features',
        label: '内容功能',
        description: '与内容展示相关的功能',
        icon: '📄',
        fields: [
          {
            key: 'enableComments',
            label: '评论功能',
            description: '是否允许用户评论',
            type: 'boolean',
            defaultValue: true,
            required: false
          },
          {
            key: 'enableSharing',
            label: '分享功能',
            description: '是否显示分享按钮',
            type: 'boolean',
            defaultValue: true,
            required: false
          },
          {
            key: 'enableSearch',
            label: '搜索功能',
            description: '是否启用站内搜索',
            type: 'boolean',
            defaultValue: true,
            required: false
          }
        ]
      }
    ]
  },
  {
    type: 'integrations',
    label: '第三方集成',
    description: '连接第三方服务',
    icon: '🔗',
    groups: [
      {
        id: 'analytics_integrations',
        label: '数据分析',
        description: '配置数据分析服务',
        icon: '📊',
        fields: [
          {
            key: 'googleAnalyticsId',
            label: 'Google Analytics ID',
            description: '用于追踪网站访问数据',
            type: 'text',
            defaultValue: '',
            required: false,
            placeholder: 'G-XXXXXXXXXX'
          },
          {
            key: 'baiduAnalyticsId',
            label: '百度统计 ID',
            description: '用于追踪中国地区访问数据',
            type: 'text',
            defaultValue: '',
            required: false,
            placeholder: 'xxxxxxxxxxxxxxxx'
          }
        ]
      },
      {
        id: 'customer_service',
        label: '客服系统',
        description: '配置在线客服',
        icon: '💬',
        fields: [
          {
            key: 'customerServiceType',
            label: '客服类型',
            description: '选择您使用的客服系统',
            type: 'select',
            defaultValue: 'none',
            required: false,
            options: [
              { value: 'none', label: '不启用' },
              { value: 'crisp', label: 'Crisp' },
              { value: 'intercom', label: 'Intercom' },
              { value: 'zendesk', label: 'Zendesk' },
              { value: 'custom', label: '自定义' }
            ]
          },
          {
            key: 'customerServiceKey',
            label: '客服密钥',
            description: '客服系统的API密钥或网站ID',
            type: 'password',
            defaultValue: '',
            required: false,
            dependsOn: { field: 'customerServiceType', value: 'none' }
          }
        ]
      }
    ]
  },
  {
    type: 'seo',
    label: 'SEO优化',
    description: '搜索引擎优化设置',
    icon: '🔍',
    groups: [
      {
        id: 'meta',
        label: 'Meta标签',
        description: '设置网站的Meta信息',
        icon: '📋',
        fields: [
          {
            key: 'metaTitle',
            label: '页面标题模板',
            description: '页面标题的格式，%s 代表页面名称',
            type: 'text',
            defaultValue: '%s | 我的网站',
            required: false,
            placeholder: '%s | 网站名称'
          },
          {
            key: 'metaKeywords',
            label: '关键词',
            description: '网站的关键词，用逗号分隔',
            type: 'text',
            defaultValue: '',
            required: false,
            placeholder: '关键词1, 关键词2, 关键词3'
          },
          {
            key: 'ogImage',
            label: '社交分享图片',
            description: '分享到社交媒体时显示的图片',
            type: 'image',
            defaultValue: '',
            required: false
          }
        ]
      },
      {
        id: 'robots',
        label: '爬虫设置',
        description: '控制搜索引擎爬虫行为',
        icon: '🤖',
        fields: [
          {
            key: 'allowIndexing',
            label: '允许搜索引擎收录',
            description: '是否允许搜索引擎收录此网站',
            type: 'boolean',
            defaultValue: true,
            required: false
          },
          {
            key: 'generateSitemap',
            label: '自动生成站点地图',
            description: '自动生成 sitemap.xml 供搜索引擎使用',
            type: 'boolean',
            defaultValue: true,
            required: false
          }
        ]
      }
    ]
  },
  {
    type: 'email',
    label: '邮件设置',
    description: '配置邮件发送服务',
    icon: '📧',
    groups: [
      {
        id: 'smtp',
        label: 'SMTP配置',
        description: '配置邮件发送服务器',
        icon: '📤',
        fields: [
          {
            key: 'emailProvider',
            label: '邮件服务商',
            description: '选择邮件发送服务',
            type: 'select',
            defaultValue: 'sendgrid',
            required: false,
            options: [
              { value: 'sendgrid', label: 'SendGrid (推荐)' },
              { value: 'mailgun', label: 'Mailgun' },
              { value: 'ses', label: 'Amazon SES' },
              { value: 'smtp', label: '自定义SMTP' }
            ]
          },
          {
            key: 'emailApiKey',
            label: 'API密钥',
            description: '邮件服务的API密钥',
            type: 'password',
            defaultValue: '',
            required: false
          },
          {
            key: 'fromEmail',
            label: '发件人邮箱',
            description: '发送邮件时显示的发件人地址',
            type: 'email',
            defaultValue: '',
            required: false,
            placeholder: 'noreply@yourdomain.com'
          },
          {
            key: 'fromName',
            label: '发件人名称',
            description: '发送邮件时显示的发件人名称',
            type: 'text',
            defaultValue: '',
            required: false,
            placeholder: '您的网站名称'
          }
        ]
      }
    ]
  },
  {
    type: 'payment',
    label: '支付设置',
    description: '配置支付方式',
    icon: '💳',
    groups: [
      {
        id: 'payment_methods',
        label: '支付方式',
        description: '启用的支付方式',
        icon: '💰',
        fields: [
          {
            key: 'enableStripe',
            label: 'Stripe支付',
            description: '支持信用卡、Apple Pay等国际支付方式',
            type: 'boolean',
            defaultValue: false,
            required: false
          },
          {
            key: 'stripePublicKey',
            label: 'Stripe公钥',
            description: 'Stripe的可公开密钥',
            type: 'text',
            defaultValue: '',
            required: false,
            dependsOn: { field: 'enableStripe', value: true },
            placeholder: 'pk_test_...'
          },
          {
            key: 'enableAlipay',
            label: '支付宝',
            description: '支持支付宝付款',
            type: 'boolean',
            defaultValue: false,
            required: false
          },
          {
            key: 'enableWechatPay',
            label: '微信支付',
            description: '支持微信付款',
            type: 'boolean',
            defaultValue: false,
            required: false
          }
        ]
      }
    ]
  },
  {
    type: 'social',
    label: '社交媒体',
    description: '社交媒体账号链接',
    icon: '📱',
    groups: [
      {
        id: 'social_links',
        label: '社交链接',
        description: '添加您的社交媒体账号',
        icon: '🔗',
        fields: [
          {
            key: 'wechatQrCode',
            label: '微信公众号二维码',
            description: '上传您的微信公众号二维码图片',
            type: 'image',
            defaultValue: '',
            required: false
          },
          {
            key: 'weiboUrl',
            label: '微博链接',
            description: '您的微博主页链接',
            type: 'url',
            defaultValue: '',
            required: false,
            placeholder: 'https://weibo.com/...'
          },
          {
            key: 'twitterUrl',
            label: 'Twitter/X 链接',
            description: '您的Twitter/X主页链接',
            type: 'url',
            defaultValue: '',
            required: false,
            placeholder: 'https://twitter.com/...'
          },
          {
            key: 'linkedinUrl',
            label: 'LinkedIn 链接',
            description: '您的LinkedIn主页链接',
            type: 'url',
            defaultValue: '',
            required: false,
            placeholder: 'https://linkedin.com/in/...'
          },
          {
            key: 'githubUrl',
            label: 'GitHub 链接',
            description: '您的GitHub主页链接',
            type: 'url',
            defaultValue: '',
            required: false,
            placeholder: 'https://github.com/...'
          }
        ]
      }
    ]
  }
]

/**
 * 可视化配置编辑器服务
 */
export class VisualConfigEditorService {
  /**
   * 获取所有配置分类
   */
  getConfigCategories(): ConfigCategory[] {
    return CONFIG_TEMPLATES
  }

  /**
   * 获取指定类型的配置
   */
  getConfigCategory(type: ConfigType): ConfigCategory | null {
    return CONFIG_TEMPLATES.find(c => c.type === type) || null
  }

  /**
   * 获取所有配置字段（扁平化）
   */
  getAllFields(): ConfigField[] {
    const fields: ConfigField[] = []
    for (const category of CONFIG_TEMPLATES) {
      for (const group of category.groups) {
        fields.push(...group.fields)
      }
    }
    return fields
  }

  /**
   * 获取字段的默认值
   */
  getDefaultValues(): ConfigValues {
    const values: ConfigValues = {}
    for (const field of this.getAllFields()) {
      values[field.key] = field.defaultValue
    }
    return values
  }

  /**
   * 验证配置值
   */
  validateConfig(values: ConfigValues): ValidationResult {
    const errors: Array<{ field: string; message: string }> = []
    const warnings: Array<{ field: string; message: string }> = []
    const fields = this.getAllFields()

    for (const field of fields) {
      const value = values[field.key]

      // 必填检查
      if (field.required && (value === undefined || value === null || value === '')) {
        errors.push({
          field: field.key,
          message: `${field.label} 是必填项`
        })
        continue
      }

      // 类型检查
      if (value !== undefined && value !== null && value !== '') {
        switch (field.type) {
          case 'email':
            if (typeof value === 'string' && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value)) {
              errors.push({
                field: field.key,
                message: '请输入有效的邮箱地址'
              })
            }
            break

          case 'url':
            if (typeof value === 'string' && !/^https?:\/\/.+/.test(value)) {
              errors.push({
                field: field.key,
                message: '请输入有效的网址（以 http:// 或 https:// 开头）'
              })
            }
            break

          case 'number':
            if (field.validation) {
              const num = Number(value)
              if (field.validation.min !== undefined && num < field.validation.min) {
                errors.push({
                  field: field.key,
                  message: `${field.label} 不能小于 ${field.validation.min}`
                })
              }
              if (field.validation.max !== undefined && num > field.validation.max) {
                errors.push({
                  field: field.key,
                  message: `${field.label} 不能大于 ${field.validation.max}`
                })
              }
            }
            break
        }

        // 自定义验证
        if (field.validation?.pattern && typeof value === 'string') {
          const regex = new RegExp(field.validation.pattern)
          if (!regex.test(value)) {
            errors.push({
              field: field.key,
              message: field.validation.message || `${field.label} 格式不正确`
            })
          }
        }

        // 长度检查
        if (field.validation?.max && typeof value === 'string' && value.length > field.validation.max) {
          warnings.push({
            field: field.key,
            message: `${field.label} 超过建议长度 ${field.validation.max} 字符`
          })
        }
      }
    }

    return {
      valid: errors.length === 0,
      errors,
      warnings
    }
  }

  /**
   * 生成环境变量文件内容
   */
  generateEnvFile(values: ConfigValues): string {
    const lines: string[] = [
      '# 网站配置 (由可视化编辑器生成)',
      `# 生成时间: ${new Date().toISOString()}`,
      ''
    ]

    const envMappings: Record<string, string> = {
      siteName: 'NEXT_PUBLIC_SITE_NAME',
      siteDescription: 'NEXT_PUBLIC_SITE_DESCRIPTION',
      primaryColor: 'NEXT_PUBLIC_PRIMARY_COLOR',
      googleAnalyticsId: 'NEXT_PUBLIC_GA_ID',
      baiduAnalyticsId: 'NEXT_PUBLIC_BAIDU_ID',
      stripePublicKey: 'NEXT_PUBLIC_STRIPE_KEY',
      emailApiKey: 'SENDGRID_API_KEY',
      fromEmail: 'EMAIL_FROM',
      fromName: 'EMAIL_FROM_NAME'
    }

    for (const [key, envKey] of Object.entries(envMappings)) {
      if (values[key] !== undefined && values[key] !== '') {
        lines.push(`${envKey}="${values[key]}"`)
      }
    }

    return lines.join('\n')
  }

  /**
   * 生成配置JSON文件
   */
  generateConfigJson(values: ConfigValues): string {
    return JSON.stringify(values, null, 2)
  }

  /**
   * 从现有配置文件解析值
   */
  parseEnvFile(content: string): ConfigValues {
    const values: ConfigValues = this.getDefaultValues()
    const lines = content.split('\n')

    const envMappings: Record<string, string> = {
      NEXT_PUBLIC_SITE_NAME: 'siteName',
      NEXT_PUBLIC_SITE_DESCRIPTION: 'siteDescription',
      NEXT_PUBLIC_PRIMARY_COLOR: 'primaryColor',
      NEXT_PUBLIC_GA_ID: 'googleAnalyticsId',
      NEXT_PUBLIC_BAIDU_ID: 'baiduAnalyticsId',
      NEXT_PUBLIC_STRIPE_KEY: 'stripePublicKey',
      SENDGRID_API_KEY: 'emailApiKey',
      EMAIL_FROM: 'fromEmail',
      EMAIL_FROM_NAME: 'fromName'
    }

    for (const line of lines) {
      const match = line.match(/^([^#=]+)=["']?(.*)["']?$/)
      if (match) {
        const [, envKey, value] = match
        const configKey = envMappings[envKey.trim()]
        if (configKey) {
          values[configKey] = value.replace(/["']$/, '')
        }
      }
    }

    return values
  }

  /**
   * 生成预览HTML
   */
  generatePreviewHtml(values: ConfigValues): string {
    const primaryColor = values.primaryColor || '#3B82F6'
    const siteName = values.siteName || '我的网站'

    return `
<!DOCTYPE html>
<html>
<head>
  <title>${siteName} - 预览</title>
  <style>
    body {
      font-family: system-ui, -apple-system, sans-serif;
      margin: 0;
      padding: 40px;
      background: ${values.backgroundColor || '#fff'};
    }
    .header {
      display: flex;
      align-items: center;
      gap: 16px;
      margin-bottom: 24px;
    }
    .logo {
      width: 50px;
      height: 50px;
      background: ${primaryColor};
      border-radius: 8px;
    }
    h1 {
      color: ${primaryColor};
      margin: 0;
    }
    p {
      color: #666;
      max-width: 600px;
    }
    .button {
      background: ${primaryColor};
      color: white;
      padding: 12px 24px;
      border: none;
      border-radius: ${values.borderRadius === 'full' ? '999px' : values.borderRadius === 'large' ? '12px' : values.borderRadius === 'small' ? '4px' : '8px'};
      font-size: 16px;
      cursor: pointer;
    }
  </style>
</head>
<body>
  <div class="header">
    <div class="logo"></div>
    <h1>${siteName}</h1>
  </div>
  <p>${values.siteDescription || '这是网站描述'}</p>
  <button class="button">示例按钮</button>
</body>
</html>
    `.trim()
  }

  /**
   * 获取配置变更摘要（人话）
   */
  getChangesSummary(oldValues: ConfigValues, newValues: ConfigValues): string[] {
    const changes: string[] = []
    const fields = this.getAllFields()
    const fieldMap = new Map(fields.map(f => [f.key, f]))

    for (const key of Object.keys(newValues)) {
      if (oldValues[key] !== newValues[key]) {
        const field = fieldMap.get(key)
        if (field) {
          if (typeof newValues[key] === 'boolean') {
            changes.push(
              newValues[key]
                ? `启用了「${field.label}」`
                : `禁用了「${field.label}」`
            )
          } else if (newValues[key] === '' || newValues[key] === null) {
            changes.push(`清空了「${field.label}」`)
          } else {
            changes.push(`修改了「${field.label}」`)
          }
        }
      }
    }

    return changes
  }
}

// 导出单例
export const visualConfigEditor = new VisualConfigEditorService()
