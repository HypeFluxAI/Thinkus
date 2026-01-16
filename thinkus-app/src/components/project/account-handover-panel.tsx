'use client'

import * as React from 'react'
import { useState, useCallback, useMemo } from 'react'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Progress } from '@/components/ui/progress'
import {
  userOnboarding,
  AccountType,
  NotificationChannel,
  UserAccount,
  OnboardingResult
} from '@/lib/services/user-onboarding'

export interface AccountHandoverPanelProps {
  /** 项目ID */
  projectId: string
  /** 产品URL */
  productUrl: string
  /** 管理后台URL */
  adminUrl: string
  /** 完成回调 */
  onComplete?: (result: OnboardingResult) => void
  /** 自定义样式 */
  className?: string
}

// 账号类型配置
const ACCOUNT_TYPE_CONFIG: Record<AccountType, {
  label: string
  icon: string
  description: string
  color: string
}> = {
  admin: {
    label: '管理员',
    icon: '👑',
    description: '拥有所有权限，可管理系统设置和其他用户',
    color: 'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-300'
  },
  manager: {
    label: '管理者',
    icon: '📋',
    description: '可以管理内容和部分设置，但不能管理用户',
    color: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300'
  },
  operator: {
    label: '操作员',
    icon: '🔧',
    description: '可以进行日常操作，如编辑内容',
    color: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300'
  },
  viewer: {
    label: '查看者',
    icon: '👁️',
    description: '只能查看内容，不能进行任何修改',
    color: 'bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300'
  }
}

// 通知渠道配置
const CHANNEL_CONFIG: Record<NotificationChannel, {
  label: string
  icon: string
  placeholder: string
}> = {
  email: { label: '邮箱', icon: '📧', placeholder: '请输入邮箱地址' },
  sms: { label: '短信', icon: '📱', placeholder: '请输入手机号码' },
  secure_link: { label: '安全链接', icon: '🔗', placeholder: '将生成一次性访问链接' }
}

type PanelState = 'setup' | 'creating' | 'ready' | 'sending' | 'completed'

/**
 * 账号交付面板
 */
export function AccountHandoverPanel({
  projectId,
  productUrl,
  adminUrl,
  onComplete,
  className
}: AccountHandoverPanelProps) {
  const [state, setState] = useState<PanelState>('setup')
  const [accounts, setAccounts] = useState<UserAccount[]>([])
  const [currentAccount, setCurrentAccount] = useState<Partial<UserAccount>>({
    accountType: 'admin'
  })
  const [email, setEmail] = useState('')
  const [phone, setPhone] = useState('')
  const [selectedChannel, setSelectedChannel] = useState<NotificationChannel>('email')
  const [progress, setProgress] = useState(0)
  const [error, setError] = useState<string | null>(null)
  const [result, setResult] = useState<OnboardingResult | null>(null)
  const [showCredentials, setShowCredentials] = useState(false)
  const [credentialCard, setCredentialCard] = useState<string>('')

  // 创建账号
  const createAccount = useCallback(async () => {
    if (!email && selectedChannel === 'email') {
      setError('请输入邮箱地址')
      return
    }

    setState('creating')
    setProgress(0)
    setError(null)

    try {
      // 模拟进度
      const progressInterval = setInterval(() => {
        setProgress(prev => Math.min(prev + 10, 90))
      }, 200)

      const account = await userOnboarding.createAccount(
        projectId,
        email || `user-${Date.now()}@temp.local`,
        currentAccount.accountType || 'admin',
        email ? 'email' : 'secure_link',
        phone || undefined
      )

      clearInterval(progressInterval)
      setProgress(100)

      setAccounts(prev => [...prev, account])

      // 生成凭证卡片
      const card = userOnboarding.generateCredentialCard(account, adminUrl)
      setCredentialCard(card)

      // 重置表单
      setEmail('')
      setPhone('')
      setCurrentAccount({ accountType: 'admin' })

      setState('ready')
    } catch (err) {
      setError(err instanceof Error ? err.message : '创建账号失败')
      setState('setup')
    }
  }, [projectId, email, phone, currentAccount.accountType, selectedChannel, adminUrl])

  // 发送凭证
  const sendCredentials = useCallback(async (account: UserAccount, channel: NotificationChannel) => {
    setState('sending')
    setError(null)

    try {
      await userOnboarding.sendWelcomeNotification(account, adminUrl, channel)

      // 更新账号状态
      setAccounts(prev => prev.map(a =>
        a.id === account.id
          ? { ...a, notificationSent: true }
          : a
      ))

      setState('ready')
    } catch (err) {
      setError(err instanceof Error ? err.message : '发送凭证失败')
      setState('ready')
    }
  }, [adminUrl])

  // 完成交付
  const completeHandover = useCallback(() => {
    const deliveryResult: OnboardingResult = {
      success: true,
      accounts,
      deliveredAt: new Date(),
      productUrl,
      adminUrl
    }

    setResult(deliveryResult)
    setState('completed')
    onComplete?.(deliveryResult)
  }, [accounts, productUrl, adminUrl, onComplete])

  // 重置密码
  const resetAccountPassword = useCallback(async (account: UserAccount) => {
    try {
      const updatedAccount = await userOnboarding.resetPassword(account, selectedChannel)
      setAccounts(prev => prev.map(a =>
        a.id === account.id ? updatedAccount : a
      ))

      // 更新凭证卡片
      const card = userOnboarding.generateCredentialCard(updatedAccount, adminUrl)
      setCredentialCard(card)
    } catch (err) {
      setError(err instanceof Error ? err.message : '重置密码失败')
    }
  }, [selectedChannel, adminUrl])

  // 添加更多账号
  const addMoreAccounts = useCallback(() => {
    setState('setup')
  }, [])

  // 计算进度
  const overallProgress = useMemo(() => {
    if (accounts.length === 0) return 0
    const sentCount = accounts.filter(a => a.notificationSent).length
    return Math.round((sentCount / accounts.length) * 100)
  }, [accounts])

  return (
    <Card className={cn('overflow-hidden', className)}>
      <CardHeader className={cn(
        'border-b',
        state === 'completed' && 'bg-green-50 dark:bg-green-950/20'
      )}>
        <CardTitle className="flex items-center gap-2">
          {state === 'setup' && (
            <>
              <span className="text-2xl">👤</span>
              创建用户账号
            </>
          )}
          {state === 'creating' && (
            <>
              <span className="text-2xl animate-pulse">⚙️</span>
              正在创建账号...
            </>
          )}
          {state === 'ready' && (
            <>
              <span className="text-2xl">✅</span>
              账号已就绪
            </>
          )}
          {state === 'sending' && (
            <>
              <span className="text-2xl animate-pulse">📤</span>
              正在发送凭证...
            </>
          )}
          {state === 'completed' && (
            <>
              <span className="text-2xl">🎉</span>
              交付完成
            </>
          )}
        </CardTitle>
        <CardDescription>
          {state === 'setup' && '为用户创建管理账号并安全发送登录凭证'}
          {state === 'creating' && `正在创建 ${ACCOUNT_TYPE_CONFIG[currentAccount.accountType || 'admin'].label} 账号...`}
          {state === 'ready' && `已创建 ${accounts.length} 个账号`}
          {state === 'sending' && '正在发送登录凭证到用户...'}
          {state === 'completed' && '所有账号已创建并发送凭证'}
        </CardDescription>
      </CardHeader>

      <CardContent className="p-6">
        {/* 创建账号表单 */}
        {state === 'setup' && (
          <div className="space-y-6">
            {/* 账号类型选择 */}
            <div>
              <Label className="text-base font-medium mb-3 block">账号类型</Label>
              <div className="grid grid-cols-2 gap-3">
                {Object.entries(ACCOUNT_TYPE_CONFIG).map(([type, config]) => (
                  <button
                    key={type}
                    onClick={() => setCurrentAccount(prev => ({ ...prev, accountType: type as AccountType }))}
                    className={cn(
                      'p-4 rounded-lg border-2 text-left transition-all',
                      currentAccount.accountType === type
                        ? 'border-primary bg-primary/5'
                        : 'border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600'
                    )}
                  >
                    <div className="flex items-center gap-2 mb-1">
                      <span className="text-xl">{config.icon}</span>
                      <span className="font-medium">{config.label}</span>
                    </div>
                    <p className="text-sm text-muted-foreground">{config.description}</p>
                  </button>
                ))}
              </div>
            </div>

            {/* 联系方式 */}
            <div className="space-y-4">
              <Label className="text-base font-medium">联系方式</Label>

              <div className="flex gap-2 mb-3">
                {Object.entries(CHANNEL_CONFIG).map(([channel, config]) => (
                  <button
                    key={channel}
                    onClick={() => setSelectedChannel(channel as NotificationChannel)}
                    className={cn(
                      'px-4 py-2 rounded-lg flex items-center gap-2 transition-all',
                      selectedChannel === channel
                        ? 'bg-primary text-primary-foreground'
                        : 'bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700'
                    )}
                  >
                    <span>{config.icon}</span>
                    <span>{config.label}</span>
                  </button>
                ))}
              </div>

              {selectedChannel === 'email' && (
                <Input
                  type="email"
                  placeholder="请输入用户邮箱"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                />
              )}

              {selectedChannel === 'sms' && (
                <Input
                  type="tel"
                  placeholder="请输入用户手机号"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                />
              )}

              {selectedChannel === 'secure_link' && (
                <div className="bg-blue-50 dark:bg-blue-950/20 p-4 rounded-lg">
                  <p className="text-sm text-blue-700 dark:text-blue-300">
                    将生成一个一次性安全链接，用户点击后可查看登录凭证。链接24小时内有效。
                  </p>
                </div>
              )}
            </div>

            {error && (
              <div className="bg-red-50 dark:bg-red-950/20 border border-red-200 dark:border-red-800 rounded-lg p-4">
                <p className="text-red-600 dark:text-red-400 text-sm">{error}</p>
              </div>
            )}

            <Button size="lg" className="w-full" onClick={createAccount}>
              <span className="mr-2">➕</span>
              创建账号
            </Button>

            {accounts.length > 0 && (
              <div className="pt-4 border-t">
                <p className="text-sm text-muted-foreground mb-3">已创建的账号:</p>
                <div className="space-y-2">
                  {accounts.map(account => (
                    <div key={account.id} className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-800/50 rounded-lg">
                      <div className="flex items-center gap-2">
                        <span>{ACCOUNT_TYPE_CONFIG[account.accountType].icon}</span>
                        <span className="font-medium">{account.email}</span>
                        <span className={cn('text-xs px-2 py-0.5 rounded', ACCOUNT_TYPE_CONFIG[account.accountType].color)}>
                          {ACCOUNT_TYPE_CONFIG[account.accountType].label}
                        </span>
                      </div>
                      {account.notificationSent && (
                        <span className="text-green-600 text-sm">✅ 已发送</span>
                      )}
                    </div>
                  ))}
                </div>

                <Button variant="outline" className="w-full mt-4" onClick={completeHandover}>
                  完成账号交付
                </Button>
              </div>
            )}
          </div>
        )}

        {/* 创建中进度 */}
        {state === 'creating' && (
          <div className="py-8">
            <Progress value={progress} className="h-3 mb-4" />
            <div className="text-center space-y-2">
              <p className="text-muted-foreground">正在创建账号并生成安全凭证...</p>
              <p className="text-sm text-muted-foreground">{progress}%</p>
            </div>
          </div>
        )}

        {/* 账号就绪状态 */}
        {state === 'ready' && accounts.length > 0 && (
          <div className="space-y-6">
            {/* 最新创建的账号 */}
            <div className="bg-green-50 dark:bg-green-950/20 border border-green-200 dark:border-green-800 rounded-lg p-4">
              <h4 className="font-medium text-green-700 dark:text-green-300 flex items-center gap-2 mb-3">
                <span>✅</span>
                账号创建成功
              </h4>
              <div className="space-y-2 text-sm">
                <p><strong>用户名:</strong> {accounts[accounts.length - 1].email}</p>
                <p><strong>类型:</strong> {ACCOUNT_TYPE_CONFIG[accounts[accounts.length - 1].accountType].label}</p>
                <p><strong>初始密码:</strong>
                  <span className="font-mono bg-gray-100 dark:bg-gray-800 px-2 py-0.5 rounded ml-2">
                    {showCredentials ? accounts[accounts.length - 1].tempPassword : '••••••••'}
                  </span>
                  <button
                    className="ml-2 text-blue-600 hover:underline"
                    onClick={() => setShowCredentials(!showCredentials)}
                  >
                    {showCredentials ? '隐藏' : '显示'}
                  </button>
                </p>
              </div>
            </div>

            {/* 凭证卡片预览 */}
            {credentialCard && (
              <div>
                <Label className="text-base font-medium mb-3 block">凭证卡片 (可打印)</Label>
                <pre className="bg-gray-900 text-green-400 p-4 rounded-lg text-xs overflow-x-auto font-mono">
                  {credentialCard}
                </pre>
              </div>
            )}

            {/* 发送凭证 */}
            <div className="space-y-4">
              <Label className="text-base font-medium">发送凭证到用户</Label>

              <div className="flex gap-2">
                <Button
                  onClick={() => sendCredentials(accounts[accounts.length - 1], 'email')}
                  disabled={!accounts[accounts.length - 1].email}
                >
                  <span className="mr-2">📧</span>
                  发送邮件
                </Button>
                <Button
                  variant="outline"
                  onClick={() => sendCredentials(accounts[accounts.length - 1], 'sms')}
                  disabled={!accounts[accounts.length - 1].phone}
                >
                  <span className="mr-2">📱</span>
                  发送短信
                </Button>
                <Button
                  variant="outline"
                  onClick={() => sendCredentials(accounts[accounts.length - 1], 'secure_link')}
                >
                  <span className="mr-2">🔗</span>
                  生成安全链接
                </Button>
              </div>
            </div>

            {/* 操作按钮 */}
            <div className="flex gap-3 pt-4 border-t">
              <Button variant="outline" onClick={addMoreAccounts}>
                <span className="mr-2">➕</span>
                添加更多账号
              </Button>
              <Button
                variant="outline"
                onClick={() => resetAccountPassword(accounts[accounts.length - 1])}
              >
                <span className="mr-2">🔄</span>
                重置密码
              </Button>
              <Button onClick={completeHandover}>
                <span className="mr-2">✅</span>
                完成交付
              </Button>
            </div>

            {error && (
              <div className="bg-red-50 dark:bg-red-950/20 border border-red-200 dark:border-red-800 rounded-lg p-4">
                <p className="text-red-600 dark:text-red-400 text-sm">{error}</p>
              </div>
            )}
          </div>
        )}

        {/* 发送中状态 */}
        {state === 'sending' && (
          <div className="py-8 text-center">
            <div className="text-6xl mb-4 animate-bounce">📤</div>
            <p className="text-muted-foreground">正在发送凭证...</p>
          </div>
        )}

        {/* 完成状态 */}
        {state === 'completed' && result && (
          <div className="space-y-6">
            <div className="text-center py-6">
              <div className="text-6xl mb-4">🎉</div>
              <h3 className="text-xl font-semibold mb-2">账号交付完成!</h3>
              <p className="text-muted-foreground">
                已创建 {accounts.length} 个用户账号
              </p>
            </div>

            {/* 账号摘要 */}
            <div className="bg-gray-50 dark:bg-gray-800/50 rounded-lg p-4">
              <h4 className="font-medium mb-3">账号摘要</h4>
              <div className="space-y-2">
                {accounts.map(account => (
                  <div key={account.id} className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span>{ACCOUNT_TYPE_CONFIG[account.accountType].icon}</span>
                      <span>{account.email}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className={cn('text-xs px-2 py-0.5 rounded', ACCOUNT_TYPE_CONFIG[account.accountType].color)}>
                        {ACCOUNT_TYPE_CONFIG[account.accountType].label}
                      </span>
                      {account.notificationSent && (
                        <span className="text-green-600 text-xs">✅ 已通知</span>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* 交付信息 */}
            <div className="bg-blue-50 dark:bg-blue-950/20 rounded-lg p-4">
              <h4 className="font-medium mb-3 text-blue-700 dark:text-blue-300">产品访问信息</h4>
              <div className="space-y-2 text-sm">
                <p><strong>产品地址:</strong> <a href={productUrl} className="text-blue-600 hover:underline">{productUrl}</a></p>
                <p><strong>管理后台:</strong> <a href={adminUrl} className="text-blue-600 hover:underline">{adminUrl}</a></p>
                <p><strong>交付时间:</strong> {result.deliveredAt.toLocaleString()}</p>
              </div>
            </div>

            {/* 安全提醒 */}
            <div className="bg-yellow-50 dark:bg-yellow-950/20 border border-yellow-200 dark:border-yellow-800 rounded-lg p-4">
              <h4 className="font-medium text-yellow-700 dark:text-yellow-300 flex items-center gap-2 mb-2">
                <span>⚠️</span>
                安全提醒
              </h4>
              <ul className="text-sm text-yellow-600 dark:text-yellow-400 space-y-1">
                <li>• 请提醒用户首次登录后立即修改密码</li>
                <li>• 建议启用两步验证增强账号安全</li>
                <li>• 不要通过不安全的渠道传输凭证</li>
              </ul>
            </div>

            <Button className="w-full" variant="outline" onClick={addMoreAccounts}>
              <span className="mr-2">➕</span>
              添加更多账号
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  )
}

/**
 * 账号交付状态徽章
 */
export function AccountHandoverBadge({
  accountCount,
  sentCount,
  onClick,
  className
}: {
  accountCount: number
  sentCount: number
  onClick?: () => void
  className?: string
}) {
  const status = useMemo(() => {
    if (accountCount === 0) return 'pending'
    if (sentCount === accountCount) return 'completed'
    return 'partial'
  }, [accountCount, sentCount])

  const config = {
    pending: { icon: '👤', label: '待创建', color: 'bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300' },
    partial: { icon: '⏳', label: '进行中', color: 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-300' },
    completed: { icon: '✅', label: '已完成', color: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300' }
  }

  const cfg = config[status]

  return (
    <button
      onClick={onClick}
      className={cn(
        'inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm font-medium transition-colors hover:opacity-80',
        cfg.color,
        className
      )}
    >
      <span>{cfg.icon}</span>
      <span>{cfg.label}</span>
      {accountCount > 0 && (
        <span className="opacity-75">({sentCount}/{accountCount})</span>
      )}
    </button>
  )
}

/**
 * 快速创建管理员账号组件
 */
export function QuickAdminSetup({
  projectId,
  adminUrl,
  onCreated,
  className
}: {
  projectId: string
  adminUrl: string
  onCreated?: (account: UserAccount) => void
  className?: string
}) {
  const [email, setEmail] = useState('')
  const [creating, setCreating] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [created, setCreated] = useState(false)

  const handleCreate = useCallback(async () => {
    if (!email) {
      setError('请输入邮箱地址')
      return
    }

    setCreating(true)
    setError(null)

    try {
      const account = await userOnboarding.createAccount(
        projectId,
        email,
        'admin',
        'email'
      )

      await userOnboarding.sendWelcomeNotification(account, adminUrl, 'email')

      setCreated(true)
      onCreated?.(account)
    } catch (err) {
      setError(err instanceof Error ? err.message : '创建失败')
    } finally {
      setCreating(false)
    }
  }, [projectId, email, adminUrl, onCreated])

  if (created) {
    return (
      <div className={cn('bg-green-50 dark:bg-green-950/20 rounded-lg p-4', className)}>
        <div className="flex items-center gap-2 text-green-700 dark:text-green-300">
          <span className="text-xl">✅</span>
          <span>管理员账号已创建并发送到 {email}</span>
        </div>
      </div>
    )
  }

  return (
    <div className={cn('space-y-3', className)}>
      <div className="flex gap-2">
        <Input
          type="email"
          placeholder="输入管理员邮箱"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          disabled={creating}
        />
        <Button onClick={handleCreate} disabled={creating}>
          {creating ? '创建中...' : '创建管理员'}
        </Button>
      </div>
      {error && (
        <p className="text-sm text-red-600 dark:text-red-400">{error}</p>
      )}
    </div>
  )
}
