/**
 * Email 邮件服务配置
 *
 * 支持多种邮件服务:
 * - smtp: 标准 SMTP 服务器
 * - resend: Resend API
 * - mock: 测试模式 (开发环境)
 */

import nodemailer from 'nodemailer'
import type { Transporter } from 'nodemailer'

export type EmailProvider = 'smtp' | 'resend' | 'mock'

interface EmailConfig {
  provider: EmailProvider
  from: string
  smtp?: {
    host: string
    port: number
    secure: boolean
    auth: {
      user: string
      pass: string
    }
  }
  resend?: {
    apiKey: string
  }
}

function getConfig(): EmailConfig {
  const provider = (process.env.EMAIL_PROVIDER || 'mock') as EmailProvider

  return {
    provider,
    from: process.env.EMAIL_FROM || 'Thinkus <noreply@thinkus.com>',
    smtp: process.env.SMTP_HOST
      ? {
          host: process.env.SMTP_HOST,
          port: parseInt(process.env.SMTP_PORT || '587', 10),
          secure: process.env.SMTP_SECURE === 'true',
          auth: {
            user: process.env.SMTP_USER || '',
            pass: process.env.SMTP_PASS || '',
          },
        }
      : undefined,
    resend: process.env.RESEND_API_KEY
      ? {
          apiKey: process.env.RESEND_API_KEY,
        }
      : undefined,
  }
}

const config = getConfig()

let smtpTransporter: Transporter | null = null

function getSmtpTransporter(): Transporter | null {
  if (!config.smtp) return null

  if (!smtpTransporter) {
    smtpTransporter = nodemailer.createTransport({
      host: config.smtp.host,
      port: config.smtp.port,
      secure: config.smtp.secure,
      auth: config.smtp.auth,
    })
  }

  return smtpTransporter
}

interface SendEmailOptions {
  to: string
  subject: string
  text?: string
  html?: string
}

/**
 * 发送邮件
 */
export async function sendEmail(options: SendEmailOptions): Promise<{ success: boolean; error?: string }> {
  try {
    switch (config.provider) {
      case 'smtp':
        return await sendViaSmtp(options)
      case 'resend':
        return await sendViaResend(options)
      case 'mock':
      default:
        return await sendViaMock(options)
    }
  } catch (error) {
    console.error('Email send error:', error)
    return { success: false, error: '邮件发送失败，请稍后重试' }
  }
}

/**
 * 发送验证码邮件
 */
export async function sendVerificationEmail(
  to: string,
  code: string
): Promise<{ success: boolean; error?: string }> {
  const subject = '【Thinkus】邮箱验证码'
  const html = `
    <div style="max-width: 600px; margin: 0 auto; padding: 20px; font-family: sans-serif;">
      <h2 style="color: #333;">邮箱验证码</h2>
      <p>您好，</p>
      <p>您的验证码是：</p>
      <div style="background: #f5f5f5; padding: 20px; text-align: center; margin: 20px 0; border-radius: 8px;">
        <span style="font-size: 32px; font-weight: bold; letter-spacing: 8px; color: #333;">${code}</span>
      </div>
      <p>验证码有效期为 5 分钟，请尽快使用。</p>
      <p style="color: #666; font-size: 14px;">如果这不是您的操作，请忽略此邮件。</p>
      <hr style="border: none; border-top: 1px solid #eee; margin: 20px 0;" />
      <p style="color: #999; font-size: 12px;">此邮件由 Thinkus 系统自动发送，请勿回复。</p>
    </div>
  `
  const text = `您的验证码是：${code}\n\n验证码有效期为 5 分钟，请尽快使用。`

  return sendEmail({ to, subject, html, text })
}

/**
 * SMTP 发送
 */
async function sendViaSmtp(options: SendEmailOptions): Promise<{ success: boolean; error?: string }> {
  const transporter = getSmtpTransporter()
  if (!transporter) {
    return { success: false, error: 'SMTP 配置缺失' }
  }

  try {
    await transporter.sendMail({
      from: config.from,
      to: options.to,
      subject: options.subject,
      text: options.text,
      html: options.html,
    })
    console.log(`[SMTP] Email sent to ${options.to}`)
    return { success: true }
  } catch (error) {
    console.error('[SMTP] Error:', error)
    return { success: false, error: '邮件发送失败' }
  }
}

/**
 * Resend API 发送
 */
async function sendViaResend(options: SendEmailOptions): Promise<{ success: boolean; error?: string }> {
  if (!config.resend) {
    return { success: false, error: 'Resend 配置缺失' }
  }

  try {
    const response = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${config.resend.apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        from: config.from,
        to: options.to,
        subject: options.subject,
        text: options.text,
        html: options.html,
      }),
    })

    if (response.ok) {
      console.log(`[Resend] Email sent to ${options.to}`)
      return { success: true }
    } else {
      const error = await response.json()
      console.error('[Resend] Error:', error)
      return { success: false, error: error.message || '邮件发送失败' }
    }
  } catch (error) {
    console.error('[Resend] Error:', error)
    return { success: false, error: '邮件发送失败' }
  }
}

/**
 * Mock 发送 (开发测试用)
 */
async function sendViaMock(options: SendEmailOptions): Promise<{ success: boolean; error?: string }> {
  console.log('\n' + '='.repeat(50))
  console.log('Email Verification')
  console.log('   To: ' + options.to)
  console.log('   Subject: ' + options.subject)
  if (options.text) {
    console.log('   Body: ' + options.text.substring(0, 100) + '...')
  }
  console.log('='.repeat(50) + '\n')
  return { success: true }
}

/**
 * 验证邮箱格式
 */
export function isValidEmail(email: string): boolean {
  const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
  return emailPattern.test(email)
}
