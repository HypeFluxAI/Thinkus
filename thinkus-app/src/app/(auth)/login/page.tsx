'use client'

import { useState } from 'react'
import { signIn } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { FormField, validationRules } from '@/components/ui/form-field'
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { toast } from 'sonner'
import { Loader2, Mail, Phone } from 'lucide-react'

export default function LoginPage() {
  const router = useRouter()
  const [isLoading, setIsLoading] = useState(false)
  const [loginMethod, setLoginMethod] = useState<'email' | 'phone'>('email')

  // Email login state
  const [emailData, setEmailData] = useState({
    email: '',
    password: '',
  })

  // Phone login state
  const [phoneData, setPhoneData] = useState({
    phone: '',
    code: '',
  })
  const [codeSent, setCodeSent] = useState(false)
  const [sendingCode, setSendingCode] = useState(false)
  const [countdown, setCountdown] = useState(0)

  // Email login handler
  const handleEmailSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsLoading(true)

    try {
      const result = await signIn('credentials', {
        email: emailData.email,
        password: emailData.password,
        redirect: false,
      })

      if (result?.error) {
        toast.error(result.error)
      } else {
        toast.success('登录成功')
        router.push('/dashboard')
        router.refresh()
      }
    } catch {
      toast.error('登录失败，请重试')
    } finally {
      setIsLoading(false)
    }
  }

  // Send phone verification code
  const handleSendCode = async () => {
    if (!phoneData.phone) {
      toast.error('请输入手机号')
      return
    }

    // Basic phone validation
    const phoneRegex = /^1[3-9]\d{9}$/
    if (!phoneRegex.test(phoneData.phone)) {
      toast.error('请输入有效的手机号')
      return
    }

    setSendingCode(true)
    try {
      const res = await fetch('/api/auth/phone/send-code', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ phone: phoneData.phone }),
      })

      const data = await res.json()

      if (!res.ok) {
        throw new Error(data.error || '发送验证码失败')
      }

      setCodeSent(true)
      toast.success('验证码已发送')

      // Show code in dev environment
      if (data.code) {
        toast.info(`开发环境验证码: ${data.code}`)
      }

      // Start countdown
      setCountdown(60)
      const timer = setInterval(() => {
        setCountdown((prev) => {
          if (prev <= 1) {
            clearInterval(timer)
            return 0
          }
          return prev - 1
        })
      }, 1000)
    } catch (error) {
      toast.error(error instanceof Error ? error.message : '发送验证码失败')
    } finally {
      setSendingCode(false)
    }
  }

  // Phone login handler
  const handlePhoneSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!phoneData.code) {
      toast.error('请输入验证码')
      return
    }

    setIsLoading(true)
    try {
      // First verify the code and get a token
      const verifyRes = await fetch('/api/auth/phone/verify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          phone: phoneData.phone,
          code: phoneData.code,
        }),
      })

      const verifyData = await verifyRes.json()

      if (!verifyRes.ok) {
        throw new Error(verifyData.error || '验证失败')
      }

      // Then sign in with the token
      const result = await signIn('phone-code', {
        phone: phoneData.phone,
        token: verifyData.token,
        redirect: false,
      })

      if (result?.error) {
        toast.error(result.error)
      } else {
        toast.success('登录成功')
        router.push('/dashboard')
        router.refresh()
      }
    } catch (error) {
      toast.error(error instanceof Error ? error.message : '登录失败')
    } finally {
      setIsLoading(false)
    }
  }

  const handleOAuthSignIn = async (provider: 'google' | 'github') => {
    setIsLoading(true)
    try {
      await signIn(provider, { callbackUrl: '/dashboard' })
    } catch {
      toast.error('登录失败，请重试')
      setIsLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-background to-muted p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <CardTitle className="text-2xl font-bold">欢迎回来</CardTitle>
          <CardDescription>登录到 Thinkus，开始创建您的产品</CardDescription>
        </CardHeader>
        <CardContent>
          <Tabs value={loginMethod} onValueChange={(v) => setLoginMethod(v as 'email' | 'phone')}>
            <TabsList className="grid w-full grid-cols-2 mb-4">
              <TabsTrigger value="email" className="flex items-center gap-2">
                <Mail className="h-4 w-4" />
                邮箱登录
              </TabsTrigger>
              <TabsTrigger value="phone" className="flex items-center gap-2">
                <Phone className="h-4 w-4" />
                手机登录
              </TabsTrigger>
            </TabsList>

            {/* Email Login */}
            <TabsContent value="email">
              <form onSubmit={handleEmailSubmit} className="space-y-4">
                <FormField
                  label="邮箱"
                  type="email"
                  placeholder="your@email.com"
                  value={emailData.email}
                  onChange={(e) => setEmailData({ ...emailData, email: e.target.value })}
                  required
                  disabled={isLoading}
                  rules={[
                    validationRules.required('请输入邮箱'),
                    validationRules.email(),
                  ]}
                  validateOnBlur
                />
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium">密码 <span className="text-destructive">*</span></span>
                    <Link
                      href="/forgot-password"
                      className="text-xs text-primary hover:underline"
                    >
                      忘记密码？
                    </Link>
                  </div>
                  <FormField
                    type="password"
                    placeholder="••••••••"
                    value={emailData.password}
                    onChange={(e) => setEmailData({ ...emailData, password: e.target.value })}
                    required
                    disabled={isLoading}
                    rules={[
                      validationRules.required('请输入密码'),
                      validationRules.minLength(6, '密码至少6位'),
                    ]}
                    validateOnBlur
                    showSuccessIcon={false}
                  />
                </div>
                <Button type="submit" className="w-full" disabled={isLoading}>
                  {isLoading ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      登录中...
                    </>
                  ) : (
                    '登录'
                  )}
                </Button>
              </form>
            </TabsContent>

            {/* Phone Login */}
            <TabsContent value="phone">
              <form onSubmit={handlePhoneSubmit} className="space-y-4">
                <div className="space-y-2">
                  <span className="text-sm font-medium">手机号 <span className="text-destructive">*</span></span>
                  <div className="flex gap-2">
                    <div className="flex-1">
                      <FormField
                        type="tel"
                        placeholder="13800138000"
                        value={phoneData.phone}
                        onChange={(e) => setPhoneData({ ...phoneData, phone: e.target.value })}
                        required
                        disabled={isLoading || codeSent}
                        rules={[
                          validationRules.required('请输入手机号'),
                          validationRules.phone(),
                        ]}
                        validateOnBlur
                      />
                    </div>
                    <Button
                      type="button"
                      variant="outline"
                      onClick={handleSendCode}
                      disabled={sendingCode || countdown > 0 || isLoading || !phoneData.phone}
                      className="shrink-0"
                    >
                      {sendingCode ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : countdown > 0 ? (
                        `${countdown}s`
                      ) : (
                        '获取验证码'
                      )}
                    </Button>
                  </div>
                </div>
                {codeSent && (
                  <FormField
                    label="验证码"
                    type="text"
                    placeholder="请输入6位验证码"
                    value={phoneData.code}
                    onChange={(e) => setPhoneData({ ...phoneData, code: e.target.value })}
                    required
                    disabled={isLoading}
                    maxLength={6}
                    rules={[
                      validationRules.required('请输入验证码'),
                      validationRules.minLength(6, '验证码为6位数字'),
                      validationRules.maxLength(6, '验证码为6位数字'),
                    ]}
                    validateOnChange
                    hint="验证码已发送到您的手机"
                  />
                )}
                <Button type="submit" className="w-full" disabled={isLoading || !codeSent}>
                  {isLoading ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      登录中...
                    </>
                  ) : (
                    '登录'
                  )}
                </Button>
              </form>
            </TabsContent>
          </Tabs>

          <div className="relative my-6">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t" />
            </div>
            <div className="relative flex justify-center text-xs uppercase">
              <span className="bg-card px-2 text-muted-foreground">或使用</span>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <Button
              variant="outline"
              onClick={() => handleOAuthSignIn('google')}
              disabled={isLoading}
            >
              <svg className="mr-2 h-4 w-4" viewBox="0 0 24 24">
                <path
                  fill="currentColor"
                  d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                />
                <path
                  fill="currentColor"
                  d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                />
                <path
                  fill="currentColor"
                  d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
                />
                <path
                  fill="currentColor"
                  d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                />
              </svg>
              Google
            </Button>
            <Button
              variant="outline"
              onClick={() => handleOAuthSignIn('github')}
              disabled={isLoading}
            >
              <svg className="mr-2 h-4 w-4" viewBox="0 0 24 24">
                <path
                  fill="currentColor"
                  d="M12 0c-6.626 0-12 5.373-12 12 0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23.957-.266 1.983-.399 3.003-.404 1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576 4.765-1.589 8.199-6.086 8.199-11.386 0-6.627-5.373-12-12-12z"
                />
              </svg>
              GitHub
            </Button>
          </div>
        </CardContent>
        <CardFooter className="flex justify-center">
          <p className="text-sm text-muted-foreground">
            还没有账号？{' '}
            <Link href="/register" className="text-primary hover:underline">
              立即注册
            </Link>
          </p>
        </CardFooter>
      </Card>
    </div>
  )
}
