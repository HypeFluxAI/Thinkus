'use client'

import { useState, useEffect, Suspense } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { FormField, validationRules } from '@/components/ui/form-field'
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { toast } from 'sonner'
import { Loader2, CheckCircle, XCircle, Ticket, Sparkles, Mail, Phone } from 'lucide-react'
import { trpc } from '@/lib/trpc/client'
import { signIn } from 'next-auth/react'

function RegisterContent() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const codeFromUrl = searchParams.get('code')

  const [isLoading, setIsLoading] = useState(false)
  const [registerMethod, setRegisterMethod] = useState<'email' | 'phone'>('email')
  const [isValidatingCode, setIsValidatingCode] = useState(false)
  const [codeValidation, setCodeValidation] = useState<{
    valid: boolean
    message?: string
    tier?: string
    benefits?: {
      skipWaitlist: boolean
      trialDays?: number
      bonusQuota?: number
    }
  } | null>(null)

  // Common fields
  const [invitationCode, setInvitationCode] = useState(codeFromUrl || '')
  const [name, setName] = useState('')
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')

  // Email registration
  const [email, setEmail] = useState('')

  // Phone registration
  const [phone, setPhone] = useState('')
  const [phoneCode, setPhoneCode] = useState('')
  const [codeSent, setCodeSent] = useState(false)
  const [sendingCode, setSendingCode] = useState(false)
  const [countdown, setCountdown] = useState(0)

  const registerMutation = trpc.user.register.useMutation({
    onSuccess: () => {
      toast.success('注册成功！欢迎加入 Thinkus')
      router.push('/login')
    },
    onError: (error) => {
      toast.error(error.message)
    },
  })

  // 验证邀请码
  const validateInvitationCode = async (code: string) => {
    if (!code || code.length < 6) {
      setCodeValidation(null)
      return
    }

    setIsValidatingCode(true)
    try {
      const response = await fetch('/api/invitation/validate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ code }),
      })
      const data = await response.json()

      if (response.ok && data.valid) {
        setCodeValidation({
          valid: true,
          tier: data.tier,
          benefits: data.benefits,
        })
      } else {
        setCodeValidation({
          valid: false,
          message: data.error || '无效的邀请码',
        })
      }
    } catch {
      setCodeValidation({
        valid: false,
        message: '验证失败，请重试',
      })
    } finally {
      setIsValidatingCode(false)
    }
  }

  // 自动验证URL中的邀请码
  useEffect(() => {
    if (codeFromUrl) {
      validateInvitationCode(codeFromUrl)
    }
  }, [codeFromUrl])

  // 邀请码输入变化时验证
  const handleCodeChange = (value: string) => {
    const upperValue = value.toUpperCase()
    setInvitationCode(upperValue)

    // 防抖验证
    if (upperValue.length >= 8) {
      validateInvitationCode(upperValue)
    } else {
      setCodeValidation(null)
    }
  }

  // Send phone verification code
  const handleSendPhoneCode = async () => {
    if (!phone) {
      toast.error('请输入手机号')
      return
    }

    const phoneRegex = /^1[3-9]\d{9}$/
    if (!phoneRegex.test(phone)) {
      toast.error('请输入有效的手机号')
      return
    }

    setSendingCode(true)
    try {
      const res = await fetch('/api/auth/phone/send-code', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ phone }),
      })

      const data = await res.json()

      if (!res.ok) {
        throw new Error(data.error || '发送验证码失败')
      }

      setCodeSent(true)
      toast.success('验证码已发送')

      if (data.code) {
        toast.info(`开发环境验证码: ${data.code}`)
      }

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

  // Email registration submit
  const handleEmailSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!codeValidation?.valid) {
      toast.error('请输入有效的邀请码')
      return
    }

    if (password !== confirmPassword) {
      toast.error('两次输入的密码不一致')
      return
    }

    if (password.length < 8) {
      toast.error('密码至少需要8个字符')
      return
    }

    setIsLoading(true)

    try {
      await registerMutation.mutateAsync({
        name,
        email,
        password,
        invitationCode,
      })
    } finally {
      setIsLoading(false)
    }
  }

  // Phone registration submit
  const handlePhoneSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!codeValidation?.valid) {
      toast.error('请输入有效的邀请码')
      return
    }

    if (!phoneCode) {
      toast.error('请输入验证码')
      return
    }

    if (password !== confirmPassword) {
      toast.error('两次输入的密码不一致')
      return
    }

    if (password.length < 8) {
      toast.error('密码至少需要8个字符')
      return
    }

    setIsLoading(true)

    try {
      // First verify the phone code and register
      const verifyRes = await fetch('/api/auth/phone/verify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          phone,
          code: phoneCode,
          name,
          password,
          invitationCode,
          isNewUser: true,
        }),
      })

      const verifyData = await verifyRes.json()

      if (!verifyRes.ok) {
        throw new Error(verifyData.error || '注册失败')
      }

      toast.success('注册成功！欢迎加入 Thinkus')

      // Auto login with the token
      const result = await signIn('phone-code', {
        phone,
        token: verifyData.token,
        redirect: false,
      })

      if (result?.error) {
        router.push('/login')
      } else {
        router.push('/dashboard')
        router.refresh()
      }
    } catch (error) {
      toast.error(error instanceof Error ? error.message : '注册失败')
    } finally {
      setIsLoading(false)
    }
  }

  const getTierBadge = (tier: string) => {
    switch (tier) {
      case 'legendary':
        return (
          <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs bg-gradient-to-r from-amber-500/20 to-orange-500/20 text-amber-400 border border-amber-500/30">
            <Sparkles className="w-3 h-3" />
            传说
          </span>
        )
      case 'rare':
        return (
          <span className="inline-flex items-center px-2 py-1 rounded-full text-xs bg-purple-500/20 text-purple-400 border border-purple-500/30">
            稀有
          </span>
        )
      default:
        return (
          <span className="inline-flex items-center px-2 py-1 rounded-full text-xs bg-blue-500/20 text-blue-400 border border-blue-500/30">
            普通
          </span>
        )
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 p-4">
      <Card className="w-full max-w-md bg-slate-800/50 border-slate-700">
        <CardHeader className="text-center">
          <CardTitle className="text-2xl font-bold text-white">创建账号</CardTitle>
          <CardDescription className="text-slate-400">
            加入 Thinkus，让 AI 帮你实现创业梦想
          </CardDescription>
        </CardHeader>
        <CardContent>
          {/* 邀请码 - 两种注册方式都需要 */}
          <div className="space-y-2 mb-6">
            <Label htmlFor="invitationCode" className="text-slate-300 flex items-center gap-2">
              <Ticket className="w-4 h-4" />
              邀请码
              <span className="text-red-400">*</span>
            </Label>
            <div className="relative">
              <Input
                id="invitationCode"
                type="text"
                placeholder="输入8位邀请码"
                value={invitationCode}
                onChange={(e) => handleCodeChange(e.target.value)}
                required
                disabled={isLoading}
                maxLength={8}
                className={`bg-slate-700/50 border-slate-600 text-white font-mono tracking-wider uppercase ${
                  codeValidation?.valid
                    ? 'border-green-500 focus:border-green-500'
                    : codeValidation?.valid === false
                    ? 'border-red-500 focus:border-red-500'
                    : ''
                }`}
              />
              <div className="absolute right-3 top-1/2 -translate-y-1/2">
                {isValidatingCode && (
                  <Loader2 className="w-4 h-4 animate-spin text-slate-400" />
                )}
                {!isValidatingCode && codeValidation?.valid && (
                  <CheckCircle className="w-4 h-4 text-green-400" />
                )}
                {!isValidatingCode && codeValidation?.valid === false && (
                  <XCircle className="w-4 h-4 text-red-400" />
                )}
              </div>
            </div>
            {codeValidation?.valid === false && (
              <p className="text-sm text-red-400">{codeValidation.message}</p>
            )}
            {codeValidation?.valid && codeValidation.tier && (
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  {getTierBadge(codeValidation.tier)}
                  {codeValidation.benefits?.trialDays && (
                    <span className="text-xs text-slate-400">
                      {codeValidation.benefits.trialDays}天试用
                    </span>
                  )}
                </div>
                {codeValidation.benefits?.bonusQuota && (
                  <span className="text-xs text-slate-400">
                    +{codeValidation.benefits.bonusQuota}次对话额度
                  </span>
                )}
              </div>
            )}
            <p className="text-xs text-slate-500">
              没有邀请码？
              <Link href="/apply" className="text-blue-400 hover:underline ml-1">
                申请加入
              </Link>
            </p>
          </div>

          <Tabs value={registerMethod} onValueChange={(v) => setRegisterMethod(v as 'email' | 'phone')}>
            <TabsList className="grid w-full grid-cols-2 mb-4 bg-slate-700/50">
              <TabsTrigger value="email" className="flex items-center gap-2 data-[state=active]:bg-slate-600">
                <Mail className="h-4 w-4" />
                邮箱注册
              </TabsTrigger>
              <TabsTrigger value="phone" className="flex items-center gap-2 data-[state=active]:bg-slate-600">
                <Phone className="h-4 w-4" />
                手机注册
              </TabsTrigger>
            </TabsList>

            {/* Email Registration */}
            <TabsContent value="email">
              <form onSubmit={handleEmailSubmit} className="space-y-4">
                <FormField
                  label="姓名"
                  type="text"
                  placeholder="您的姓名"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  required
                  disabled={isLoading}
                  className="bg-slate-700/50 border-slate-600 text-white"
                  rules={[
                    validationRules.required('请输入姓名'),
                    validationRules.minLength(2, '姓名至少2个字符'),
                  ]}
                  validateOnBlur
                />

                <FormField
                  label="邮箱"
                  type="email"
                  placeholder="your@email.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  disabled={isLoading}
                  className="bg-slate-700/50 border-slate-600 text-white"
                  rules={[
                    validationRules.required('请输入邮箱'),
                    validationRules.email(),
                  ]}
                  validateOnBlur
                />

                <FormField
                  label="密码"
                  type="password"
                  placeholder="至少8个字符，包含字母和数字"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  disabled={isLoading}
                  className="bg-slate-700/50 border-slate-600 text-white"
                  rules={[
                    validationRules.required('请输入密码'),
                    validationRules.minLength(8, '密码至少8个字符'),
                  ]}
                  validateOnBlur
                  showSuccessIcon={false}
                  hint="密码需包含字母和数字"
                />

                <FormField
                  label="确认密码"
                  type="password"
                  placeholder="再次输入密码"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  required
                  disabled={isLoading}
                  className="bg-slate-700/50 border-slate-600 text-white"
                  rules={[
                    validationRules.required('请确认密码'),
                    validationRules.match(password, '两次输入的密码不一致'),
                  ]}
                  validateOnBlur
                  showSuccessIcon={false}
                />

                <Button
                  type="submit"
                  className="w-full bg-blue-600 hover:bg-blue-700"
                  disabled={isLoading || !codeValidation?.valid}
                >
                  {isLoading ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      注册中...
                    </>
                  ) : (
                    '注册'
                  )}
                </Button>
              </form>
            </TabsContent>

            {/* Phone Registration */}
            <TabsContent value="phone">
              <form onSubmit={handlePhoneSubmit} className="space-y-4">
                <FormField
                  label="姓名"
                  type="text"
                  placeholder="您的姓名"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  required
                  disabled={isLoading}
                  className="bg-slate-700/50 border-slate-600 text-white"
                  rules={[
                    validationRules.required('请输入姓名'),
                    validationRules.minLength(2, '姓名至少2个字符'),
                  ]}
                  validateOnBlur
                />

                <div className="space-y-2">
                  <Label className="text-slate-300">手机号 <span className="text-red-400">*</span></Label>
                  <div className="flex gap-2">
                    <div className="flex-1">
                      <FormField
                        type="tel"
                        placeholder="13800138000"
                        value={phone}
                        onChange={(e) => setPhone(e.target.value)}
                        required
                        disabled={isLoading || codeSent}
                        className="bg-slate-700/50 border-slate-600 text-white"
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
                      onClick={handleSendPhoneCode}
                      disabled={sendingCode || countdown > 0 || isLoading || !codeValidation?.valid || !phone}
                      className="border-slate-600 text-slate-300 hover:bg-slate-700 shrink-0"
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
                    value={phoneCode}
                    onChange={(e) => setPhoneCode(e.target.value)}
                    required
                    disabled={isLoading}
                    maxLength={6}
                    className="bg-slate-700/50 border-slate-600 text-white"
                    rules={[
                      validationRules.required('请输入验证码'),
                      validationRules.minLength(6, '验证码为6位数字'),
                    ]}
                    validateOnChange
                    hint="验证码已发送到您的手机"
                  />
                )}

                <FormField
                  label="密码"
                  type="password"
                  placeholder="至少8个字符，包含字母和数字"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  disabled={isLoading}
                  className="bg-slate-700/50 border-slate-600 text-white"
                  rules={[
                    validationRules.required('请输入密码'),
                    validationRules.minLength(8, '密码至少8个字符'),
                  ]}
                  validateOnBlur
                  showSuccessIcon={false}
                  hint="密码需包含字母和数字"
                />

                <FormField
                  label="确认密码"
                  type="password"
                  placeholder="再次输入密码"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  required
                  disabled={isLoading}
                  className="bg-slate-700/50 border-slate-600 text-white"
                  rules={[
                    validationRules.required('请确认密码'),
                    validationRules.match(password, '两次输入的密码不一致'),
                  ]}
                  validateOnBlur
                  showSuccessIcon={false}
                />

                <Button
                  type="submit"
                  className="w-full bg-blue-600 hover:bg-blue-700"
                  disabled={isLoading || !codeValidation?.valid || !codeSent}
                >
                  {isLoading ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      注册中...
                    </>
                  ) : (
                    '注册'
                  )}
                </Button>
              </form>
            </TabsContent>
          </Tabs>
        </CardContent>
        <CardFooter className="flex justify-center">
          <p className="text-sm text-slate-400">
            已有账号？{' '}
            <Link href="/login" className="text-blue-400 hover:underline">
              立即登录
            </Link>
          </p>
        </CardFooter>
      </Card>
    </div>
  )
}

export default function RegisterPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900">
          <Loader2 className="w-8 h-8 animate-spin text-white" />
        </div>
      }
    >
      <RegisterContent />
    </Suspense>
  )
}
