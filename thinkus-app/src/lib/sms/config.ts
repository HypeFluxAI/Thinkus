/**
 * SMS 短信服务配置
 *
 * 支持多种短信服务商:
 * - aliyun: 阿里云短信
 * - twilio: Twilio (国际)
 * - mock: 测试模式 (开发环境)
 */

import Dysmsapi20170525, * as $Dysmsapi20170525 from '@alicloud/dysmsapi20170525'
import * as $OpenApi from '@alicloud/openapi-client'

export type SmsProvider = 'aliyun' | 'twilio' | 'mock'

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

function getConfig(): SmsConfig {
  const provider = (process.env.SMS_PROVIDER || 'mock') as SmsProvider
  return {
    provider,
    aliyun: process.env.ALIYUN_SMS_ACCESS_KEY_ID ? {
      accessKeyId: process.env.ALIYUN_SMS_ACCESS_KEY_ID,
      accessKeySecret: process.env.ALIYUN_SMS_ACCESS_KEY_SECRET || '',
      signName: process.env.ALIYUN_SMS_SIGN_NAME || 'Thinkus',
      templateCode: process.env.ALIYUN_SMS_TEMPLATE_CODE || '',
    } : undefined,
    twilio: process.env.TWILIO_ACCOUNT_SID ? {
      accountSid: process.env.TWILIO_ACCOUNT_SID,
      authToken: process.env.TWILIO_AUTH_TOKEN || '',
      fromNumber: process.env.TWILIO_FROM_NUMBER || '',
    } : undefined,
  }
}

const config = getConfig()

let aliyunClient: Dysmsapi20170525 | null = null

function getAliyunClient(): Dysmsapi20170525 | null {
  if (!config.aliyun) return null
  if (!aliyunClient) {
    const apiConfig = new $OpenApi.Config({
      accessKeyId: config.aliyun.accessKeyId,
      accessKeySecret: config.aliyun.accessKeySecret,
      endpoint: 'dysmsapi.aliyuncs.com',
    })
    aliyunClient = new Dysmsapi20170525(apiConfig)
  }
  return aliyunClient
}

export async function sendSmsCode(phone: string, code: string): Promise<{ success: boolean; error?: string }> {
  try {
    switch (config.provider) {
      case 'aliyun': return await sendViaAliyun(phone, code)
      case 'twilio': return await sendViaTwilio(phone, code)
      default: return await sendViaMock(phone, code)
    }
  } catch (error) {
    console.error('SMS send error:', error)
    return { success: false, error: '短信发送失败，请稍后重试' }
  }
}

async function sendViaAliyun(phone: string, code: string): Promise<{ success: boolean; error?: string }> {
  if (!config.aliyun) return { success: false, error: '阿里云短信配置缺失' }
  const client = getAliyunClient()
  if (!client) return { success: false, error: '阿里云客户端初始化失败' }

  try {
    const phoneNumber = phone.startsWith('+86') ? phone.slice(3) : phone
    const request = new $Dysmsapi20170525.SendSmsRequest({
      phoneNumbers: phoneNumber,
      signName: config.aliyun.signName,
      templateCode: config.aliyun.templateCode,
      templateParam: JSON.stringify({ code }),
    })
    const response = await client.sendSms(request)
    if (response.body?.code === 'OK') {
      console.log(`[Aliyun SMS] Successfully sent code to ${phoneNumber}`)
      return { success: true }
    } else {
      console.error(`[Aliyun SMS] Failed: ${response.body?.code} - ${response.body?.message}`)
      return { success: false, error: response.body?.message || '短信发送失败' }
    }
  } catch (error) {
    console.error('[Aliyun SMS] Error:', error)
    return { success: false, error: '短信服务异常，请稍后重试' }
  }
}

async function sendViaTwilio(phone: string, code: string): Promise<{ success: boolean; error?: string }> {
  if (!config.twilio) return { success: false, error: 'Twilio 配置缺失' }
  try {
    // Dynamic import for optional Twilio dependency
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const twilio = await (import('twilio' as any) as Promise<any>).catch(() => null)
    if (!twilio) return { success: false, error: 'Twilio 服务暂不可用' }
    const client = twilio.default(config.twilio.accountSid, config.twilio.authToken)
    const phoneNumber = phone.startsWith('+') ? phone : `+86${phone}`
    const message = await client.messages.create({
      body: `【Thinkus】您的验证码是：${code}，5分钟内有效。`,
      from: config.twilio.fromNumber,
      to: phoneNumber,
    })
    console.log(`[Twilio SMS] Successfully sent message SID: ${message.sid}`)
    return { success: true }
  } catch (error) {
    console.error('[Twilio SMS] Error:', error)
    return { success: false, error: '短信发送失败，请稍后重试' }
  }
}

async function sendViaMock(phone: string, code: string): Promise<{ success: boolean; error?: string }> {
  const separator = '='.repeat(50)
  console.log('\n' + separator)
  console.log('SMS Verification Code')
  console.log('   Phone: ' + phone)
  console.log('   Code:  ' + code)
  console.log(separator + '\n')
  return { success: true }
}

export function isValidPhone(phone: string): boolean {
  const chinaPattern = /^1[3-9]\d{9}$/
  const internationalPattern = /^\+[1-9]\d{6,14}$/
  return chinaPattern.test(phone) || internationalPattern.test(phone)
}

export function normalizePhone(phone: string): string {
  let normalized = phone.replace(/[\s\-()]/g, '')
  if (/^1[3-9]\d{9}$/.test(normalized)) {
    normalized = '+86' + normalized
  }
  return normalized
}
