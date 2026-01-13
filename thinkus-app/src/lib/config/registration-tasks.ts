/**
 * 自动化注册任务配置
 *
 * 定义开发过程中可能需要注册的第三方服务
 * 系统会在容器中自动化完成注册，遇到人机验证时暂停让用户确认
 */

export type RegistrationStatus =
  | 'pending'      // 等待开始
  | 'collecting'   // 收集用户信息中
  | 'running'      // 自动化执行中
  | 'waiting_user' // 等待用户确认（验证码等）
  | 'completed'    // 完成
  | 'failed'       // 失败
  | 'skipped'      // 用户跳过

export type UserInputType =
  | 'email'
  | 'phone'
  | 'password'
  | 'name'
  | 'company'
  | 'captcha'      // 图形验证码
  | 'sms_code'     // 短信验证码
  | 'email_code'   // 邮箱验证码
  | 'totp'         // 两步验证
  | 'manual'       // 需要用户手动操作（如人脸识别）

export interface UserInput {
  type: UserInputType
  label: string
  required: boolean
  placeholder?: string
  description?: string
}

export interface RegistrationStep {
  id: string
  name: string
  description: string
  automatable: boolean  // 是否可自动化
  userInputs?: UserInput[]  // 该步骤需要的用户输入
  waitForUser?: boolean  // 是否需要等待用户确认
}

export interface RegistrationTask {
  id: string
  name: string
  category: 'ai' | 'payment' | 'auth' | 'storage' | 'email' | 'sms' | 'other'
  description: string
  website: string

  // 注册前需要收集的用户信息
  requiredUserInputs: UserInput[]

  // 注册步骤
  steps: RegistrationStep[]

  // 注册完成后获得的凭证
  credentials: {
    name: string
    envKey: string  // 环境变量名
    description: string
  }[]

  // 预估时间（分钟）
  estimatedMinutes: number

  // 是否支持自动化
  automationSupport: 'full' | 'partial' | 'manual'

  // 备注
  notes?: string
}

/**
 * 注册任务库
 */
export const REGISTRATION_TASKS: Record<string, RegistrationTask> = {
  // Claude API
  'claude-api': {
    id: 'claude-api',
    name: 'Claude API',
    category: 'ai',
    description: 'Anthropic Claude AI 对话接口',
    website: 'https://console.anthropic.com',
    requiredUserInputs: [
      { type: 'email', label: '邮箱', required: true, placeholder: 'your@email.com' },
      { type: 'password', label: '设置密码', required: true, description: '至少8位，包含字母和数字' },
    ],
    steps: [
      {
        id: 'register',
        name: '注册账号',
        description: '填写邮箱和密码创建账号',
        automatable: true,
      },
      {
        id: 'verify_email',
        name: '验证邮箱',
        description: '点击邮箱中的验证链接',
        automatable: false,
        userInputs: [
          { type: 'email_code', label: '邮箱验证码', required: true, description: '请查收邮件，输入验证码' }
        ],
        waitForUser: true,
      },
      {
        id: 'create_key',
        name: '创建 API Key',
        description: '在控制台创建新的 API Key',
        automatable: true,
      },
    ],
    credentials: [
      { name: 'API Key', envKey: 'ANTHROPIC_API_KEY', description: 'Claude API 访问密钥' },
    ],
    estimatedMinutes: 3,
    automationSupport: 'partial',
    notes: '需要有效邮箱接收验证码',
  },

  // OpenAI API
  'openai-api': {
    id: 'openai-api',
    name: 'OpenAI API',
    category: 'ai',
    description: 'OpenAI GPT 系列模型接口',
    website: 'https://platform.openai.com',
    requiredUserInputs: [
      { type: 'email', label: '邮箱', required: true },
      { type: 'password', label: '设置密码', required: true },
      { type: 'phone', label: '手机号', required: true, description: '用于接收验证码' },
    ],
    steps: [
      {
        id: 'register',
        name: '注册账号',
        description: '填写邮箱和密码',
        automatable: true,
      },
      {
        id: 'verify_email',
        name: '验证邮箱',
        description: '点击邮箱验证链接',
        automatable: false,
        waitForUser: true,
      },
      {
        id: 'verify_phone',
        name: '验证手机',
        description: '输入手机验证码',
        automatable: false,
        userInputs: [
          { type: 'sms_code', label: '短信验证码', required: true }
        ],
        waitForUser: true,
      },
      {
        id: 'create_key',
        name: '创建 API Key',
        description: '在控制台创建密钥',
        automatable: true,
      },
    ],
    credentials: [
      { name: 'API Key', envKey: 'OPENAI_API_KEY', description: 'OpenAI API 访问密钥' },
    ],
    estimatedMinutes: 5,
    automationSupport: 'partial',
  },

  // Supabase
  'supabase': {
    id: 'supabase',
    name: 'Supabase',
    category: 'storage',
    description: '开源 Firebase 替代，提供数据库和认证服务',
    website: 'https://supabase.com',
    requiredUserInputs: [
      { type: 'email', label: '邮箱', required: true },
    ],
    steps: [
      {
        id: 'github_login',
        name: 'GitHub 登录',
        description: '使用 GitHub 账号登录（推荐）',
        automatable: false,
        waitForUser: true,
      },
      {
        id: 'create_project',
        name: '创建项目',
        description: '创建新的 Supabase 项目',
        automatable: true,
      },
      {
        id: 'get_keys',
        name: '获取密钥',
        description: '从项目设置获取 API 密钥',
        automatable: true,
      },
    ],
    credentials: [
      { name: 'Project URL', envKey: 'SUPABASE_URL', description: '项目 URL' },
      { name: 'Anon Key', envKey: 'SUPABASE_ANON_KEY', description: '匿名访问密钥' },
      { name: 'Service Key', envKey: 'SUPABASE_SERVICE_KEY', description: '服务端密钥' },
    ],
    estimatedMinutes: 3,
    automationSupport: 'partial',
    notes: '推荐使用 GitHub 登录，更快捷',
  },

  // Vercel
  'vercel': {
    id: 'vercel',
    name: 'Vercel',
    category: 'other',
    description: '前端部署平台',
    website: 'https://vercel.com',
    requiredUserInputs: [
      { type: 'email', label: '邮箱', required: true },
    ],
    steps: [
      {
        id: 'github_login',
        name: 'GitHub 登录',
        description: '使用 GitHub 账号登录',
        automatable: false,
        waitForUser: true,
      },
      {
        id: 'get_token',
        name: '获取部署 Token',
        description: '创建访问令牌',
        automatable: true,
      },
    ],
    credentials: [
      { name: 'Token', envKey: 'VERCEL_TOKEN', description: '部署访问令牌' },
    ],
    estimatedMinutes: 2,
    automationSupport: 'partial',
  },

  // Resend (邮件服务)
  'resend': {
    id: 'resend',
    name: 'Resend',
    category: 'email',
    description: '邮件发送服务',
    website: 'https://resend.com',
    requiredUserInputs: [
      { type: 'email', label: '邮箱', required: true },
    ],
    steps: [
      {
        id: 'github_login',
        name: 'GitHub 登录',
        description: '使用 GitHub 账号登录',
        automatable: false,
        waitForUser: true,
      },
      {
        id: 'create_key',
        name: '创建 API Key',
        description: '在控制台创建密钥',
        automatable: true,
      },
    ],
    credentials: [
      { name: 'API Key', envKey: 'RESEND_API_KEY', description: 'Resend API 密钥' },
    ],
    estimatedMinutes: 2,
    automationSupport: 'partial',
  },

  // 阿里云短信
  'aliyun-sms': {
    id: 'aliyun-sms',
    name: '阿里云短信',
    category: 'sms',
    description: '国内短信发送服务',
    website: 'https://www.aliyun.com',
    requiredUserInputs: [
      { type: 'phone', label: '手机号', required: true },
      { type: 'name', label: '真实姓名', required: true, description: '实名认证需要' },
    ],
    steps: [
      {
        id: 'register',
        name: '注册账号',
        description: '注册阿里云账号',
        automatable: true,
      },
      {
        id: 'verify_phone',
        name: '手机验证',
        description: '验证手机号',
        automatable: false,
        userInputs: [
          { type: 'sms_code', label: '短信验证码', required: true }
        ],
        waitForUser: true,
      },
      {
        id: 'real_name',
        name: '实名认证',
        description: '需要实名认证才能使用短信服务',
        automatable: false,
        userInputs: [
          { type: 'manual', label: '实名认证', required: true, description: '请在阿里云完成实名认证' }
        ],
        waitForUser: true,
      },
      {
        id: 'create_access_key',
        name: '创建 AccessKey',
        description: '创建 RAM 用户和 AccessKey',
        automatable: true,
      },
    ],
    credentials: [
      { name: 'Access Key ID', envKey: 'ALIYUN_ACCESS_KEY_ID', description: '阿里云 AccessKey ID' },
      { name: 'Access Key Secret', envKey: 'ALIYUN_ACCESS_KEY_SECRET', description: '阿里云 AccessKey Secret' },
    ],
    estimatedMinutes: 10,
    automationSupport: 'partial',
    notes: '需要实名认证，建议提前准备',
  },

  // 微信支付
  'wechat-pay': {
    id: 'wechat-pay',
    name: '微信支付',
    category: 'payment',
    description: '微信支付商户接入',
    website: 'https://pay.weixin.qq.com',
    requiredUserInputs: [
      { type: 'company', label: '公司名称', required: true, description: '需要营业执照' },
      { type: 'manual', label: '营业执照', required: true, description: '上传营业执照照片' },
    ],
    steps: [
      {
        id: 'apply',
        name: '申请商户号',
        description: '提交商户入驻申请',
        automatable: false,
        waitForUser: true,
      },
      {
        id: 'review',
        name: '等待审核',
        description: '微信审核，通常1-3个工作日',
        automatable: false,
        waitForUser: true,
      },
      {
        id: 'setup',
        name: '配置支付',
        description: '设置 API 密钥和证书',
        automatable: true,
      },
    ],
    credentials: [
      { name: '商户号', envKey: 'WECHAT_MCH_ID', description: '微信支付商户号' },
      { name: 'API Key', envKey: 'WECHAT_API_KEY', description: 'API v3 密钥' },
    ],
    estimatedMinutes: 60,
    automationSupport: 'manual',
    notes: '需要营业执照，审核需要1-3天。无执照可先用收款码过渡',
  },

  // Stripe
  'stripe': {
    id: 'stripe',
    name: 'Stripe',
    category: 'payment',
    description: '国际支付服务',
    website: 'https://stripe.com',
    requiredUserInputs: [
      { type: 'email', label: '邮箱', required: true },
      { type: 'phone', label: '手机号', required: true },
    ],
    steps: [
      {
        id: 'register',
        name: '注册账号',
        description: '创建 Stripe 账号',
        automatable: true,
      },
      {
        id: 'verify_email',
        name: '验证邮箱',
        description: '点击验证链接',
        automatable: false,
        waitForUser: true,
      },
      {
        id: 'get_keys',
        name: '获取密钥',
        description: '从开发者面板获取 API 密钥',
        automatable: true,
      },
    ],
    credentials: [
      { name: 'Publishable Key', envKey: 'STRIPE_PUBLISHABLE_KEY', description: '公开密钥' },
      { name: 'Secret Key', envKey: 'STRIPE_SECRET_KEY', description: '私有密钥' },
    ],
    estimatedMinutes: 5,
    automationSupport: 'partial',
  },
}

/**
 * 根据项目需求获取需要注册的任务列表
 */
export function getRequiredRegistrations(requirements: {
  needsAI?: boolean
  aiProvider?: 'claude' | 'openai'
  needsDatabase?: boolean
  needsAuth?: boolean
  needsPayment?: boolean
  paymentProvider?: 'wechat' | 'stripe'
  needsEmail?: boolean
  needsSms?: boolean
  needsHosting?: boolean
}): RegistrationTask[] {
  const tasks: RegistrationTask[] = []

  if (requirements.needsAI) {
    const provider = requirements.aiProvider || 'claude'
    if (provider === 'claude') {
      tasks.push(REGISTRATION_TASKS['claude-api'])
    } else {
      tasks.push(REGISTRATION_TASKS['openai-api'])
    }
  }

  if (requirements.needsDatabase) {
    tasks.push(REGISTRATION_TASKS['supabase'])
  }

  if (requirements.needsPayment) {
    const provider = requirements.paymentProvider || 'stripe'
    if (provider === 'wechat') {
      tasks.push(REGISTRATION_TASKS['wechat-pay'])
    } else {
      tasks.push(REGISTRATION_TASKS['stripe'])
    }
  }

  if (requirements.needsEmail) {
    tasks.push(REGISTRATION_TASKS['resend'])
  }

  if (requirements.needsSms) {
    tasks.push(REGISTRATION_TASKS['aliyun-sms'])
  }

  if (requirements.needsHosting) {
    tasks.push(REGISTRATION_TASKS['vercel'])
  }

  return tasks
}

/**
 * 计算注册任务的总预估时间
 */
export function estimateTotalRegistrationTime(tasks: RegistrationTask[]): number {
  return tasks.reduce((total, task) => total + task.estimatedMinutes, 0)
}

/**
 * 获取所有需要用户提供的信息（去重）
 */
export function collectRequiredInputs(tasks: RegistrationTask[]): UserInput[] {
  const inputMap = new Map<UserInputType, UserInput>()

  for (const task of tasks) {
    for (const input of task.requiredUserInputs) {
      if (!inputMap.has(input.type)) {
        inputMap.set(input.type, input)
      }
    }
  }

  return Array.from(inputMap.values())
}
