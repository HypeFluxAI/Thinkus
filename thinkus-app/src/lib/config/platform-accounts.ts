/**
 * 平台储备账号配置
 *
 * 这些账号用于开发和测试阶段，用户无需提供任何第三方服务账号
 * 上线时才需要用户自己的账号
 *
 * 注意：实际密钥通过环境变量配置，此文件只定义结构
 */

export type AccountCategory =
  | 'ai'        // AI 服务
  | 'database'  // 数据库
  | 'storage'   // 存储
  | 'email'     // 邮件
  | 'sms'       // 短信
  | 'payment'   // 支付
  | 'hosting'   // 托管
  | 'other'     // 其他

export interface PlatformAccount {
  id: string
  name: string
  category: AccountCategory
  description: string
  // 用途
  usage: 'development' | 'testing' | 'both'
  // 环境变量前缀
  envPrefix: string
  // 配额限制（用于测试）
  quota?: {
    daily?: number
    monthly?: number
    unit: string
  }
  // 是否已配置
  configured: boolean
}

/**
 * 平台储备账号列表
 * 实际密钥在环境变量中配置
 */
export const PLATFORM_ACCOUNTS: PlatformAccount[] = [
  // AI 服务
  {
    id: 'platform-claude',
    name: 'Claude API (平台账号)',
    category: 'ai',
    description: '用于开发和测试阶段的 AI 对话',
    usage: 'both',
    envPrefix: 'PLATFORM_ANTHROPIC',
    quota: {
      daily: 100000,
      unit: 'tokens',
    },
    configured: true,
  },
  {
    id: 'platform-openai',
    name: 'OpenAI API (平台账号)',
    category: 'ai',
    description: '用于开发和测试阶段的 GPT 调用',
    usage: 'both',
    envPrefix: 'PLATFORM_OPENAI',
    quota: {
      daily: 100000,
      unit: 'tokens',
    },
    configured: true,
  },

  // 数据库
  {
    id: 'platform-supabase',
    name: 'Supabase (平台账号)',
    category: 'database',
    description: '用于开发和测试的数据库环境',
    usage: 'both',
    envPrefix: 'PLATFORM_SUPABASE',
    quota: {
      monthly: 500,
      unit: 'MB',
    },
    configured: true,
  },
  {
    id: 'platform-mongodb',
    name: 'MongoDB Atlas (平台账号)',
    category: 'database',
    description: '用于开发和测试的 MongoDB 环境',
    usage: 'both',
    envPrefix: 'PLATFORM_MONGODB',
    quota: {
      monthly: 512,
      unit: 'MB',
    },
    configured: true,
  },

  // 存储
  {
    id: 'platform-r2',
    name: 'Cloudflare R2 (平台账号)',
    category: 'storage',
    description: '用于开发和测试的文件存储',
    usage: 'both',
    envPrefix: 'PLATFORM_R2',
    quota: {
      monthly: 10,
      unit: 'GB',
    },
    configured: true,
  },

  // 邮件
  {
    id: 'platform-resend',
    name: 'Resend (平台账号)',
    category: 'email',
    description: '用于测试邮件发送功能',
    usage: 'testing',
    envPrefix: 'PLATFORM_RESEND',
    quota: {
      daily: 100,
      unit: '封',
    },
    configured: true,
  },

  // 短信
  {
    id: 'platform-aliyun-sms',
    name: '阿里云短信 (平台账号)',
    category: 'sms',
    description: '用于测试短信发送功能',
    usage: 'testing',
    envPrefix: 'PLATFORM_ALIYUN_SMS',
    quota: {
      daily: 50,
      unit: '条',
    },
    configured: true,
  },

  // 支付（测试模式）
  {
    id: 'platform-stripe-test',
    name: 'Stripe 测试模式 (平台账号)',
    category: 'payment',
    description: '用于测试支付流程，不产生真实交易',
    usage: 'testing',
    envPrefix: 'PLATFORM_STRIPE_TEST',
    configured: true,
  },

  // 托管
  {
    id: 'platform-vercel',
    name: 'Vercel (平台账号)',
    category: 'hosting',
    description: '用于开发预览部署',
    usage: 'development',
    envPrefix: 'PLATFORM_VERCEL',
    configured: true,
  },
]

/**
 * 获取指定类别的平台账号
 */
export function getPlatformAccount(category: AccountCategory): PlatformAccount | undefined {
  return PLATFORM_ACCOUNTS.find(acc => acc.category === category && acc.configured)
}

/**
 * 获取所有可用于测试的平台账号
 */
export function getTestingAccounts(): PlatformAccount[] {
  return PLATFORM_ACCOUNTS.filter(acc =>
    acc.configured && (acc.usage === 'testing' || acc.usage === 'both')
  )
}

/**
 * 获取所有可用于开发的平台账号
 */
export function getDevelopmentAccounts(): PlatformAccount[] {
  return PLATFORM_ACCOUNTS.filter(acc =>
    acc.configured && (acc.usage === 'development' || acc.usage === 'both')
  )
}

/**
 * 检查平台账号配额使用情况
 */
export interface QuotaUsage {
  accountId: string
  used: number
  limit: number
  unit: string
  percentage: number
}

/**
 * 开发环境配置
 * 根据项目需求自动选择平台账号
 */
export interface DevelopmentEnvironment {
  projectId: string
  accounts: {
    accountId: string
    envVars: Record<string, string>
  }[]
}

/**
 * 为项目创建开发环境配置
 */
export function createDevelopmentEnvironment(
  projectId: string,
  requirements: {
    needsAI?: boolean
    aiProvider?: 'claude' | 'openai'
    needsDatabase?: boolean
    databaseType?: 'postgres' | 'mongodb'
    needsStorage?: boolean
    needsEmail?: boolean
    needsSms?: boolean
    needsPayment?: boolean
  }
): DevelopmentEnvironment {
  const accounts: DevelopmentEnvironment['accounts'] = []

  // AI 服务
  if (requirements.needsAI) {
    const aiAccount = requirements.aiProvider === 'openai'
      ? PLATFORM_ACCOUNTS.find(a => a.id === 'platform-openai')
      : PLATFORM_ACCOUNTS.find(a => a.id === 'platform-claude')

    if (aiAccount) {
      accounts.push({
        accountId: aiAccount.id,
        envVars: {
          [`${aiAccount.envPrefix}_API_KEY`]: `\${${aiAccount.envPrefix}_API_KEY}`,
        },
      })
    }
  }

  // 数据库
  if (requirements.needsDatabase) {
    const dbAccount = requirements.databaseType === 'mongodb'
      ? PLATFORM_ACCOUNTS.find(a => a.id === 'platform-mongodb')
      : PLATFORM_ACCOUNTS.find(a => a.id === 'platform-supabase')

    if (dbAccount) {
      accounts.push({
        accountId: dbAccount.id,
        envVars: {
          [`${dbAccount.envPrefix}_URL`]: `\${${dbAccount.envPrefix}_URL}`,
          [`${dbAccount.envPrefix}_KEY`]: `\${${dbAccount.envPrefix}_KEY}`,
        },
      })
    }
  }

  // 存储
  if (requirements.needsStorage) {
    const storageAccount = PLATFORM_ACCOUNTS.find(a => a.id === 'platform-r2')
    if (storageAccount) {
      accounts.push({
        accountId: storageAccount.id,
        envVars: {
          [`${storageAccount.envPrefix}_BUCKET`]: `\${${storageAccount.envPrefix}_BUCKET}`,
          [`${storageAccount.envPrefix}_ACCESS_KEY`]: `\${${storageAccount.envPrefix}_ACCESS_KEY}`,
        },
      })
    }
  }

  // 邮件
  if (requirements.needsEmail) {
    const emailAccount = PLATFORM_ACCOUNTS.find(a => a.id === 'platform-resend')
    if (emailAccount) {
      accounts.push({
        accountId: emailAccount.id,
        envVars: {
          [`${emailAccount.envPrefix}_API_KEY`]: `\${${emailAccount.envPrefix}_API_KEY}`,
        },
      })
    }
  }

  // 短信
  if (requirements.needsSms) {
    const smsAccount = PLATFORM_ACCOUNTS.find(a => a.id === 'platform-aliyun-sms')
    if (smsAccount) {
      accounts.push({
        accountId: smsAccount.id,
        envVars: {
          [`${smsAccount.envPrefix}_ACCESS_KEY_ID`]: `\${${smsAccount.envPrefix}_ACCESS_KEY_ID}`,
          [`${smsAccount.envPrefix}_ACCESS_KEY_SECRET`]: `\${${smsAccount.envPrefix}_ACCESS_KEY_SECRET}`,
        },
      })
    }
  }

  // 支付（测试模式）
  if (requirements.needsPayment) {
    const paymentAccount = PLATFORM_ACCOUNTS.find(a => a.id === 'platform-stripe-test')
    if (paymentAccount) {
      accounts.push({
        accountId: paymentAccount.id,
        envVars: {
          [`${paymentAccount.envPrefix}_PUBLISHABLE_KEY`]: `\${${paymentAccount.envPrefix}_PUBLISHABLE_KEY}`,
          [`${paymentAccount.envPrefix}_SECRET_KEY`]: `\${${paymentAccount.envPrefix}_SECRET_KEY}`,
        },
      })
    }
  }

  return {
    projectId,
    accounts,
  }
}
