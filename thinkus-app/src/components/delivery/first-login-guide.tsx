'use client'

import { useState, useEffect } from 'react'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import { Progress } from '@/components/ui/progress'
import {
  firstLoginGuard,
  type LoginGuardSession,
  type LoginCredentials,
  type LoginFailureReason,
} from '@/lib/services'

interface FirstLoginGuideProps {
  session: LoginGuardSession
  onStepComplete?: (stepIndex: number) => void
  onSuccess?: () => void
  onNeedHelp?: () => void
  className?: string
}

// 步骤配置
const STEP_CONFIG = {
  visit_login: {
    icon: '🌐',
    title: '访问登录页面',
    description: '点击下方按钮打开登录页面'
  },
  enter_credentials: {
    icon: '✍️',
    title: '输入登录信息',
    description: '使用我们提供的账号密码'
  },
  click_login: {
    icon: '👆',
    title: '点击登录按钮',
    description: '确认信息后点击登录'
  },
  verify_success: {
    icon: '✅',
    title: '确认登录成功',
    description: '检查是否进入管理后台'
  }
}

// 失败原因配置
const FAILURE_CONFIG: Record<LoginFailureReason, {
  icon: string
  title: string
  suggestion: string
}> = {
  wrong_password: {
    icon: '🔑',
    title: '密码错误',
    suggestion: '请检查密码是否正确，注意区分大小写'
  },
  wrong_username: {
    icon: '👤',
    title: '用户名错误',
    suggestion: '请检查用户名或邮箱是否正确'
  },
  account_locked: {
    icon: '🔒',
    title: '账号已锁定',
    suggestion: '多次错误尝试导致账号锁定，请稍后重试或联系客服'
  },
  account_not_found: {
    icon: '❓',
    title: '账号不存在',
    suggestion: '该账号未创建，请检查邮箱地址'
  },
  network_error: {
    icon: '📡',
    title: '网络连接问题',
    suggestion: '请检查网络连接后重试'
  },
  server_error: {
    icon: '🖥️',
    title: '服务器暂时不可用',
    suggestion: '服务器正在维护，请稍后重试'
  },
  captcha_failed: {
    icon: '🤖',
    title: '验证码错误',
    suggestion: '请重新输入验证码'
  },
  mfa_required: {
    icon: '🔐',
    title: '需要二次验证',
    suggestion: '请输入手机收到的验证码'
  },
  session_expired: {
    icon: '⏰',
    title: '会话已过期',
    suggestion: '请刷新页面重新登录'
  },
  unknown: {
    icon: '❌',
    title: '未知错误',
    suggestion: '请联系客服获取帮助'
  }
}

/**
 * 首登引导组件
 */
export function FirstLoginGuide({
  session,
  onStepComplete,
  onSuccess,
  onNeedHelp,
  className
}: FirstLoginGuideProps) {
  const [showPassword, setShowPassword] = useState(false)
  const [copied, setCopied] = useState<string | null>(null)

  const currentStep = session.guideSteps[session.currentStepIndex]
  const stepConfig = currentStep ? STEP_CONFIG[currentStep.type as keyof typeof STEP_CONFIG] : null
  const progress = ((session.currentStepIndex + 1) / session.guideSteps.length) * 100

  // 复制到剪贴板
  const copyToClipboard = async (text: string, field: string) => {
    try {
      await navigator.clipboard.writeText(text)
      setCopied(field)
      setTimeout(() => setCopied(null), 2000)
    } catch (err) {
      console.error('Failed to copy:', err)
    }
  }

  // 掩码密码
  const maskPassword = (password: string) => {
    return password.slice(0, 2) + '*'.repeat(password.length - 4) + password.slice(-2)
  }

  return (
    <div className={cn(
      'rounded-2xl shadow-lg bg-white overflow-hidden',
      className
    )}>
      {/* 头部 */}
      <div className="p-6 bg-gradient-to-br from-blue-500 to-indigo-600 text-white">
        <div className="text-4xl mb-3">🚀</div>
        <h2 className="text-xl font-bold mb-1">首次登录引导</h2>
        <p className="text-white/80 text-sm">跟着步骤走，轻松完成首次登录</p>
      </div>

      {/* 进度 */}
      <div className="px-6 py-4 border-b">
        <div className="flex items-center justify-between mb-2">
          <span className="text-sm text-gray-600">登录进度</span>
          <span className="text-sm font-medium">
            {session.currentStepIndex + 1} / {session.guideSteps.length}
          </span>
        </div>
        <Progress value={progress} className="h-2" />
      </div>

      {/* 登录凭证 */}
      <div className="px-6 py-4 bg-gray-50 border-b">
        <h3 className="text-sm font-semibold text-gray-700 mb-3">🔑 您的登录信息</h3>
        <div className="space-y-3">
          {/* 登录地址 */}
          <div className="flex items-center gap-3">
            <span className="text-gray-500 w-20 text-sm">登录地址</span>
            <code className="flex-1 bg-white px-3 py-1.5 rounded border text-sm truncate">
              {session.credentials.loginUrl}
            </code>
            <Button
              size="sm"
              variant="ghost"
              onClick={() => copyToClipboard(session.credentials.loginUrl, 'url')}
            >
              {copied === 'url' ? '✅' : '📋'}
            </Button>
          </div>

          {/* 用户名 */}
          <div className="flex items-center gap-3">
            <span className="text-gray-500 w-20 text-sm">用户名</span>
            <code className="flex-1 bg-white px-3 py-1.5 rounded border text-sm">
              {session.credentials.username}
            </code>
            <Button
              size="sm"
              variant="ghost"
              onClick={() => copyToClipboard(session.credentials.username, 'username')}
            >
              {copied === 'username' ? '✅' : '📋'}
            </Button>
          </div>

          {/* 密码 */}
          <div className="flex items-center gap-3">
            <span className="text-gray-500 w-20 text-sm">密码</span>
            <code className="flex-1 bg-white px-3 py-1.5 rounded border text-sm font-mono">
              {showPassword ? session.credentials.password : maskPassword(session.credentials.password)}
            </code>
            <Button
              size="sm"
              variant="ghost"
              onClick={() => setShowPassword(!showPassword)}
            >
              {showPassword ? '🙈' : '👁️'}
            </Button>
            <Button
              size="sm"
              variant="ghost"
              onClick={() => copyToClipboard(session.credentials.password, 'password')}
            >
              {copied === 'password' ? '✅' : '📋'}
            </Button>
          </div>
        </div>
      </div>

      {/* 当前步骤 */}
      {currentStep && stepConfig && (
        <div className="px-6 py-4">
          <div className="flex items-start gap-4 p-4 rounded-xl bg-blue-50 border border-blue-200">
            <div className="text-3xl">{stepConfig.icon}</div>
            <div className="flex-1">
              <div className="font-semibold text-blue-700 mb-1">
                步骤 {session.currentStepIndex + 1}: {stepConfig.title}
              </div>
              <div className="text-sm text-blue-600 mb-3">
                {stepConfig.description}
              </div>
              <div className="text-sm text-gray-600 bg-white p-3 rounded-lg">
                {currentStep.instruction}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 步骤列表 */}
      <div className="px-6 py-4 border-t">
        <h3 className="text-sm font-semibold text-gray-700 mb-3">📋 全部步骤</h3>
        <div className="space-y-2">
          {session.guideSteps.map((step, index) => {
            const config = STEP_CONFIG[step.type as keyof typeof STEP_CONFIG]
            const isCurrent = index === session.currentStepIndex
            const isCompleted = step.status === 'completed'
            const isFailed = step.status === 'failed'

            return (
              <div
                key={step.type}
                className={cn(
                  'flex items-center gap-3 p-2 rounded-lg transition-colors',
                  isCurrent && 'bg-blue-50',
                  isCompleted && 'opacity-60',
                  isFailed && 'bg-red-50'
                )}
              >
                <div className={cn(
                  'w-8 h-8 rounded-full flex items-center justify-center text-lg',
                  isCompleted ? 'bg-green-100' :
                  isFailed ? 'bg-red-100' :
                  isCurrent ? 'bg-blue-100' : 'bg-gray-100'
                )}>
                  {isCompleted ? '✅' : isFailed ? '❌' : config?.icon}
                </div>
                <div className="flex-1">
                  <div className={cn(
                    'text-sm font-medium',
                    isCompleted ? 'text-green-700' :
                    isFailed ? 'text-red-700' :
                    isCurrent ? 'text-blue-700' : 'text-gray-600'
                  )}>
                    {config?.title}
                  </div>
                </div>
                {isCurrent && (
                  <span className="text-xs text-blue-600 bg-blue-100 px-2 py-0.5 rounded-full">
                    当前步骤
                  </span>
                )}
              </div>
            )
          })}
        </div>
      </div>

      {/* 失败原因 */}
      {session.failureReason && (
        <div className="px-6 py-4 border-t">
          <div className="p-4 rounded-xl bg-red-50 border border-red-200">
            <div className="flex items-start gap-3">
              <span className="text-2xl">
                {FAILURE_CONFIG[session.failureReason].icon}
              </span>
              <div>
                <div className="font-semibold text-red-700 mb-1">
                  {FAILURE_CONFIG[session.failureReason].title}
                </div>
                <div className="text-sm text-red-600">
                  {FAILURE_CONFIG[session.failureReason].suggestion}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 操作按钮 */}
      <div className="px-6 py-4 border-t flex gap-3">
        {session.status === 'pending' && (
          <>
            <Button
              className="flex-1"
              onClick={() => window.open(session.credentials.loginUrl, '_blank')}
            >
              打开登录页面
            </Button>
            <Button
              variant="outline"
              className="flex-1"
              onClick={onNeedHelp}
            >
              需要帮助
            </Button>
          </>
        )}
        {session.status === 'success' && (
          <Button className="flex-1" onClick={onSuccess}>
            太棒了！继续操作
          </Button>
        )}
        {session.status === 'failed' && (
          <>
            <Button
              variant="outline"
              className="flex-1"
              onClick={() => window.open(session.credentials.loginUrl, '_blank')}
            >
              重新尝试
            </Button>
            <Button className="flex-1" onClick={onNeedHelp}>
              联系客服
            </Button>
          </>
        )}
      </div>
    </div>
  )
}

/**
 * 迷你登录状态卡片
 */
export function LoginStatusCard({
  session,
  onClick,
  className
}: {
  session: LoginGuardSession
  onClick?: () => void
  className?: string
}) {
  const isSuccess = session.status === 'success'
  const isFailed = session.status === 'failed'

  return (
    <div
      className={cn(
        'p-4 rounded-xl bg-white shadow border cursor-pointer hover:shadow-md transition-shadow',
        className
      )}
      onClick={onClick}
    >
      <div className="flex items-center gap-3">
        <div className={cn(
          'w-12 h-12 rounded-xl flex items-center justify-center text-2xl',
          isSuccess ? 'bg-green-100' :
          isFailed ? 'bg-red-100' : 'bg-blue-100'
        )}>
          {isSuccess ? '✅' : isFailed ? '❌' : '🚀'}
        </div>
        <div className="flex-1 min-w-0">
          <div className="text-sm font-medium text-gray-900 truncate">
            首次登录
          </div>
          <div className={cn(
            'text-sm',
            isSuccess ? 'text-green-600' :
            isFailed ? 'text-red-600' : 'text-blue-600'
          )}>
            {isSuccess ? '登录成功' :
             isFailed ? '遇到问题' :
             `步骤 ${session.currentStepIndex + 1}/${session.guideSteps.length}`}
          </div>
        </div>
        <Progress
          value={((session.currentStepIndex + 1) / session.guideSteps.length) * 100}
          className="w-16 h-2"
        />
      </div>
    </div>
  )
}

/**
 * 登录成功庆祝组件
 */
export function LoginSuccessCelebration({
  onContinue,
  className
}: {
  onContinue?: () => void
  className?: string
}) {
  return (
    <div className={cn(
      'rounded-2xl shadow-lg bg-white overflow-hidden text-center p-8',
      className
    )}>
      <div className="text-6xl mb-4 animate-bounce">🎉</div>
      <h2 className="text-2xl font-bold text-gray-900 mb-2">
        恭喜！登录成功！
      </h2>
      <p className="text-gray-600 mb-6">
        您已成功登录管理后台，现在可以开始使用您的产品了
      </p>

      <div className="bg-green-50 rounded-xl p-4 mb-6">
        <div className="text-sm text-green-700">
          <div className="flex items-center justify-center gap-2 mb-2">
            <span className="text-lg">💡</span>
            <span className="font-medium">小提示</span>
          </div>
          <p>建议您首次登录后修改密码，以确保账号安全</p>
        </div>
      </div>

      <Button className="w-full" size="lg" onClick={onContinue}>
        开始探索
      </Button>
    </div>
  )
}

/**
 * 凭证卡片组件
 */
export function CredentialsCard({
  credentials,
  className
}: {
  credentials: LoginCredentials
  className?: string
}) {
  const [showPassword, setShowPassword] = useState(false)
  const [copied, setCopied] = useState<string | null>(null)

  const copyToClipboard = async (text: string, field: string) => {
    try {
      await navigator.clipboard.writeText(text)
      setCopied(field)
      setTimeout(() => setCopied(null), 2000)
    } catch (err) {
      console.error('Failed to copy:', err)
    }
  }

  return (
    <div className={cn(
      'rounded-xl border bg-white p-4',
      className
    )}>
      <div className="flex items-center gap-2 mb-4">
        <span className="text-lg">🔐</span>
        <span className="font-semibold text-gray-900">登录凭证</span>
      </div>

      <div className="space-y-3 text-sm">
        <div className="flex items-center justify-between">
          <span className="text-gray-500">登录地址</span>
          <div className="flex items-center gap-2">
            <a
              href={credentials.loginUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="text-blue-600 hover:underline truncate max-w-[200px]"
            >
              {credentials.loginUrl}
            </a>
            <button
              onClick={() => copyToClipboard(credentials.loginUrl, 'url')}
              className="text-gray-400 hover:text-gray-600"
            >
              {copied === 'url' ? '✅' : '📋'}
            </button>
          </div>
        </div>

        <div className="flex items-center justify-between">
          <span className="text-gray-500">用户名</span>
          <div className="flex items-center gap-2">
            <code className="bg-gray-100 px-2 py-0.5 rounded">
              {credentials.username}
            </code>
            <button
              onClick={() => copyToClipboard(credentials.username, 'username')}
              className="text-gray-400 hover:text-gray-600"
            >
              {copied === 'username' ? '✅' : '📋'}
            </button>
          </div>
        </div>

        <div className="flex items-center justify-between">
          <span className="text-gray-500">密码</span>
          <div className="flex items-center gap-2">
            <code className="bg-gray-100 px-2 py-0.5 rounded font-mono">
              {showPassword ? credentials.password : '••••••••'}
            </code>
            <button
              onClick={() => setShowPassword(!showPassword)}
              className="text-gray-400 hover:text-gray-600"
            >
              {showPassword ? '🙈' : '👁️'}
            </button>
            <button
              onClick={() => copyToClipboard(credentials.password, 'password')}
              className="text-gray-400 hover:text-gray-600"
            >
              {copied === 'password' ? '✅' : '📋'}
            </button>
          </div>
        </div>
      </div>

      <div className="mt-4 pt-4 border-t">
        <Button
          className="w-full"
          onClick={() => window.open(credentials.loginUrl, '_blank')}
        >
          打开登录页面
        </Button>
      </div>
    </div>
  )
}
