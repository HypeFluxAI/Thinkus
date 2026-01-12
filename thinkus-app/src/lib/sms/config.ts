/**
 * SMS 短信服务配置
 *
 * 支持多种短信服务商:
 * - aliyun: 阿里云短信
 * - twilio: Twilio (国际)
 * - mock: 测试模式 (开发环境)
 */

export type SmsProvider = 'aliyun' | 'twilio' | 'mock'

// 短信服务配置
interface SmsConfig {
  provider: SmsProvider
  aliyun?: {
    accessKeyId: string
    accessKeySecret: string
    signName: string
    templateCode: string
  }
  twilio?: {
    accountSid: string
    authToken: string
    fromNumber: string
  }
}

// 从环境变量获取配置
function getConfig(): SmsConfig {
  const provider = (process.env.SMS_PROVIDER || 'mock') as SmsProvider

  return {
    provider,
    aliyun: process.env.ALIYUN_SMS_ACCESS_KEY_ID
      ? {
          accessKeyId: process.env.ALIYUN_SMS_ACCESS_KEY_ID,
          accessKeySecret: process.env.ALIYUN_SMS_ACCESS_KEY_SECRET || '',
          signName: process.env.ALIYUN_SMS_SIGN_NAME || 'Thinkus',
          templateCode: process.env.ALIYUN_SMS_TEMPLATE_CODE || '',
        }
      : undefined,
    twilio: process.env.TWILIO_ACCOUNT_SID
      ? {
          accountSid: process.env.TWILIO_ACCOUNT_SID,
          authToken: process.env.TWILIO_AUTH_TOKEN || '',
          fromNumber: process.env.TWILIO_FROM_NUMBER || '',
        }
      : undefined,
  }
}

const config = getConfig()

/**
 * 发送短信验证码
 */
export async function sendSmsCode(phone: string, code: string): Promise<{ success: boolean; error?: string }> {
  try {
    switch (config.provider) {
      case 'aliyun':
        return await sendViaAliyun(phone, code)
      case 'twilio':
        return await sendViaTwilio(phone, code)
      case 'mock':
      default:
        return await sendViaMock(phone, code)
    }
  } catch (error) {
    console.error('SMS send error:', error)
    return { success: false, error: '短信发送失败，请稍后重试' }
  }
}

/**
 * 阿里云短信发送
 */
async function sendViaAliyun(phone: string, code: string): Promise<{ success: boolean; error?: string }> {
  if (!config.aliyun) {
    return { success: false, error: '阿里云短信配置缺失' }
  }

  // TODO: 实现阿里云短信发送
  // 需要安装 @alicloud/dysmsapi20170525 包
  // 这里先返回成功，实际部署时需要实现
  console.log(`[Aliyun SMS] Would send code ${code} to ${phone}`)

  // 开发环境模拟成功
  if (process.env.NODE_ENV === 'development') {
    console.log(`[DEV] SMS code for ${phone}: ${code}`)
    return { success: true }
  }

  return { success: false, error: '阿里云短信服务暂未配置' }
}

/**
 * Twilio 短信发送
 */
async function sendViaTwilio(phone: string, code: string): Promise<{ success: boolean; error?: string }> {
  if (!config.twilio) {
    return { success: false, error: 'Twilio 配置缺失' }
  }

  // TODO: 实现 Twilio 短信发送
  // 需要安装 twilio 包
  // 这里先返回成功，实际部署时需要实现
  console.log(`[Twilio SMS] Would send code ${code} to ${phone}`)

  // 开发环境模拟成功
  if (process.env.NODE_ENV === 'development') {
    console.log(`[DEV] SMS code for ${phone}: ${code}`)
    return { success: true }
  }

  return { success: false, error: 'Twilio 服务暂未配置' }
}

/**
 * Mock 短信发送 (开发测试用)
 */
async function sendViaMock(phone: string, code: string): Promise<{ success: boolean; error?: string }> {
  // 开发环境直接打印验证码
  console.log(`\n${'='.repeat(50)}`)
  console.log(`📱 SMS Verification Code`)
  console.log(`   Phone: ${phone}`)
  console.log(`   Code:  ${code}`)
  console.log(`${'='.repeat(50)}\n`)

  return { success: true }
}

/**
 * 验证手机号格式
 */
export function isValidPhone(phone: string): boolean {
  // 支持中国手机号和国际格式
  // 中国: 1[3-9]\d{9}
  // 国际: +[国家代码][号码]
  const chinaPattern = /^1[3-9]\d{9}$/
  const internationalPattern = /^\+[1-9]\d{6,14}$/

  return chinaPattern.test(phone) || internationalPattern.test(phone)
}

/**
 * 标准化手机号格式
 */
export function normalizePhone(phone: string): string {
  // 移除空格、横线等
  let normalized = phone.replace(/[\s\-()]/g, '')

  // 如果是中国手机号且没有国际区号，添加 +86
  if (/^1[3-9]\d{9}$/.test(normalized)) {
    normalized = `+86${normalized}`
  }

  return normalized
}
