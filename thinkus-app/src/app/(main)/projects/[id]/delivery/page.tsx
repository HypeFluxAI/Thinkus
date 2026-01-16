'use client'

import { useState, useEffect } from 'react'
import { useParams } from 'next/navigation'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import {
  AcceptanceCountdown,
  RealtimeProgress,
  ErrorAutoFixPanel,
  FirstLoginGuide,
  OneclickDiagnosisButton,
  NotificationCenter,
  NotificationBell,
  NotificationPopover,
  FloatingProgressIndicator,
  FloatingDiagnosisButton,
  DeliveryErrorBoundary,
  DeliveryLoadingSkeleton,
} from '@/components/delivery'
import {
  useDeliveryProgress,
  useAcceptanceTimeout,
  useNotifications,
  useDiagnosis,
  useDeliveryStream,
  useLoginGuide,
  useAutofix,
} from '@/hooks/delivery'
import {
  formatDuration,
  STAGE_CONFIG,
} from '@/lib/utils/delivery'
import {
  type TimeoutSession,
  type ProgressSession,
  type FixSession,
  type LoginGuardSession,
  DEFAULT_TIMEOUT_CONFIG,
} from '@/lib/services'

// 默认模拟数据（当没有真实数据时使用）
const DEFAULT_PROGRESS_SESSION: ProgressSession = {
  id: 'default-progress',
  projectId: '',
  projectName: '我的项目',
  currentStage: 'queued',
  overallProgress: 0,
  startedAt: new Date(),
  estimatedCompletionAt: new Date(Date.now() + 5 * 60 * 60 * 1000),
  events: [],
  subscriberCount: 1
}

const DEFAULT_TIMEOUT_SESSION: TimeoutSession = {
  id: 'default-timeout',
  projectId: '',
  userId: '',
  status: 'active',
  config: DEFAULT_TIMEOUT_CONFIG,
  startedAt: new Date(),
  expiresAt: new Date(Date.now() + 5 * 60 * 1000),
  items: [],
  completedItems: [],
  remindersSent: 0,
  events: []
}

const DEFAULT_LOGIN_SESSION: LoginGuardSession = {
  id: 'default-login',
  projectId: '',
  userId: '',
  credentials: {
    loginUrl: '',
    username: '',
    password: '',
    mfaEnabled: false
  },
  status: 'pending',
  guideSteps: [
    { type: 'visit_login', instruction: '点击下方按钮打开登录页面', status: 'pending' },
    { type: 'enter_credentials', instruction: '在用户名输入框输入邮箱地址', status: 'pending' },
    { type: 'click_login', instruction: '确认信息无误后点击登录按钮', status: 'pending' },
    { type: 'verify_success', instruction: '检查是否成功进入管理后台', status: 'pending' },
  ],
  currentStepIndex: 0,
  attempts: 0,
  failureReason: null,
  createdAt: new Date()
}

const DEFAULT_FIX_SESSION: FixSession = {
  id: 'default-fix',
  projectId: '',
  originalError: {
    code: 'NO_ERROR',
    message: '暂无错误',
    type: 'unknown',
    severity: 'low',
    recoverable: false,
    humanReadable: '一切正常',
    humanDescription: '目前没有需要修复的问题',
    suggestedFix: ''
  },
  status: 'success',
  strategies: [],
  currentStrategyIndex: 0,
  attempts: [],
  startedAt: new Date(),
  humanSummary: '系统运行正常'
}

export default function DeliveryPage() {
  const params = useParams()
  const projectId = params.id as string
  const userId = 'current-user' // TODO: 从认证上下文获取

  const [activeTab, setActiveTab] = useState('progress')
  const [showNotifications, setShowNotifications] = useState(false)
  const [isInitialized, setIsInitialized] = useState(false)

  // 使用真实 hooks
  const {
    session: progressSession,
    isLoading: progressLoading,
    error: progressError,
    refresh: refreshProgress,
    updateStage,
    addEvent
  } = useDeliveryProgress({
    projectId,
    pollInterval: 5000,
    autoStart: true
  })

  const {
    session: acceptanceSession,
    isLoading: acceptanceLoading,
    remainingTime,
    isUrgent,
    create: createAcceptance,
    start: startAcceptance,
    complete: completeAcceptance,
    extendTime,
    escalate: escalateAcceptance
  } = useAcceptanceTimeout({
    projectId,
    userId,
    onWarning: () => console.log('验收警告'),
    onFinalWarning: () => console.log('最终警告'),
    onTimeout: () => console.log('验收超时'),
    onComplete: () => console.log('验收完成')
  })

  const {
    notifications,
    unreadCount,
    isLoading: notificationsLoading,
    refresh: refreshNotifications,
    markAsRead,
    markAllAsRead,
    deleteNotification
  } = useNotifications({
    userId,
    pollInterval: 30000,
    autoStart: true
  })

  const {
    report: diagnosisReport,
    isRunning: diagnosisRunning,
    progress: diagnosisProgress,
    currentStep: diagnosisStep,
    startDiagnosis,
    sendToSupport,
    reset: resetDiagnosis
  } = useDiagnosis({
    projectId,
    onComplete: (report) => {
      console.log('诊断完成:', report)
      // 发送通知
    },
    onError: (error) => {
      console.error('诊断失败:', error)
    }
  })

  // SSE 实时流
  const {
    isConnected,
    latestProgress,
    error: streamError
  } = useDeliveryStream({
    projectId,
    onProgress: (session) => {
      console.log('实时进度更新:', session.overallProgress)
    },
    onConnected: () => {
      console.log('SSE 已连接')
    },
    onDisconnected: () => {
      console.log('SSE 已断开')
    }
  })

  // 登录引导 hook
  const {
    session: loginSession,
    isLoading: loginLoading,
    currentStep: loginCurrentStep,
    progress: loginProgress,
    isSuccess: loginSuccess,
    create: createLoginSession,
    completeStep: completeLoginStep,
    recordFailure: recordLoginFailure,
    markSuccess: markLoginSuccess,
    resetPassword,
    requestSupport: requestLoginSupport,
  } = useLoginGuide({
    projectId,
    userId,
    onStepComplete: (step) => console.log('登录步骤完成:', step),
    onLoginSuccess: () => console.log('登录成功'),
    onLoginFailure: (reason) => console.log('登录失败:', reason),
  })

  // 错误自动修复 hook
  const {
    session: fixSession,
    isFixing,
    error: fixError,
    currentStrategy,
    progress: fixProgress,
    attemptCount,
    classifyError,
    startFix,
    markSuccess: markFixSuccess,
    escalate: escalateFix,
    reset: resetFix,
  } = useAutofix({
    projectId,
    onFixStart: () => console.log('开始修复'),
    onFixSuccess: (session) => console.log('修复成功:', session),
    onFixFailed: (session) => console.log('修复失败:', session),
    onEscalate: (session) => console.log('已升级人工:', session),
  })

  // 初始化
  useEffect(() => {
    const init = async () => {
      // 如果没有进度会话，创建一个
      if (!progressSession && !progressLoading) {
        try {
          await fetch('/api/delivery/progress', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              projectId,
              projectName: '我的项目',
              action: 'create'
            })
          })
          refreshProgress()
        } catch (error) {
          console.error('创建进度会话失败:', error)
        }
      }
      setIsInitialized(true)
    }

    if (projectId) {
      init()
    }
  }, [projectId, progressSession, progressLoading, refreshProgress])

  // 使用最新数据（优先使用 SSE 实时数据）
  const currentProgressSession = latestProgress || progressSession || DEFAULT_PROGRESS_SESSION
  const currentAcceptanceSession = acceptanceSession || DEFAULT_TIMEOUT_SESSION
  const currentLoginSession = loginSession || DEFAULT_LOGIN_SESSION
  const currentFixSession = fixSession || DEFAULT_FIX_SESSION

  // 计算已用时间
  const elapsedTime = currentProgressSession.startedAt
    ? Date.now() - new Date(currentProgressSession.startedAt).getTime()
    : 0

  // 计算预计剩余时间
  const estimatedRemaining = currentProgressSession.estimatedCompletionAt
    ? new Date(currentProgressSession.estimatedCompletionAt).getTime() - Date.now()
    : 0

  // 获取阶段名称
  const getStageName = (stage: string) => {
    return STAGE_CONFIG[stage as keyof typeof STAGE_CONFIG]?.name || stage
  }

  // 如果还没初始化且正在加载，显示骨架屏
  if (!isInitialized && progressLoading) {
    return (
      <div className="min-h-screen bg-gray-50 p-8">
        <DeliveryLoadingSkeleton type="progress" className="max-w-4xl mx-auto" />
      </div>
    )
  }

  return (
    <DeliveryErrorBoundary
      onError={(error, errorInfo) => {
        // 记录错误到监控服务
        console.error('交付页面错误:', error, errorInfo)
      }}
      onReset={() => {
        // 重置时刷新数据
        refreshProgress()
        refreshNotifications()
      }}
    >
    <div className="min-h-screen bg-gray-50">
      {/* 顶部导航 */}
      <header className="bg-white border-b sticky top-0 z-30">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center gap-4">
              <h1 className="text-xl font-bold text-gray-900">交付中心</h1>
              <span className="text-sm text-gray-500">项目交付与验收</span>
              {/* SSE 连接状态 */}
              <span className={cn(
                'inline-flex items-center gap-1 text-xs px-2 py-1 rounded-full',
                isConnected ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'
              )}>
                <span className={cn(
                  'w-1.5 h-1.5 rounded-full',
                  isConnected ? 'bg-green-500 animate-pulse' : 'bg-gray-400'
                )} />
                {isConnected ? '实时更新' : '离线'}
              </span>
            </div>

            <div className="flex items-center gap-4">
              {/* 通知铃铛 */}
              <div className="relative">
                <NotificationBell
                  unreadCount={unreadCount}
                  onClick={() => setShowNotifications(!showNotifications)}
                />
                <NotificationPopover
                  notifications={notifications}
                  isOpen={showNotifications}
                  onClose={() => setShowNotifications(false)}
                  onMarkAsRead={markAsRead}
                  onViewAll={() => {
                    setActiveTab('notifications')
                    setShowNotifications(false)
                  }}
                />
              </div>

              <Button variant="outline" size="sm">
                联系客服
              </Button>
            </div>
          </div>
        </div>
      </header>

      {/* 主内容 */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="mb-6">
            <TabsTrigger value="progress">
              🚀 交付进度
            </TabsTrigger>
            <TabsTrigger value="acceptance">
              ✅ 产品验收
            </TabsTrigger>
            <TabsTrigger value="login">
              🔐 首次登录
            </TabsTrigger>
            <TabsTrigger value="errors">
              🔧 问题修复
            </TabsTrigger>
            <TabsTrigger value="diagnosis">
              🔍 一键诊断
            </TabsTrigger>
            <TabsTrigger value="notifications">
              🔔 通知中心
              {unreadCount > 0 && (
                <span className="ml-1 text-xs bg-red-500 text-white px-1.5 py-0.5 rounded-full">
                  {unreadCount}
                </span>
              )}
            </TabsTrigger>
          </TabsList>

          {/* 交付进度 */}
          <TabsContent value="progress">
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              <div className="lg:col-span-2">
                {progressLoading && !currentProgressSession ? (
                  <div className="rounded-2xl shadow-lg bg-white p-8 text-center">
                    <div className="animate-spin text-4xl mb-4">⏳</div>
                    <p className="text-gray-500">加载进度中...</p>
                  </div>
                ) : (
                  <RealtimeProgress
                    session={currentProgressSession}
                    onRefresh={refreshProgress}
                  />
                )}
              </div>
              <div className="space-y-6">
                <div className="bg-white rounded-xl p-6 shadow">
                  <h3 className="font-semibold text-gray-900 mb-4">📊 交付统计</h3>
                  <div className="space-y-4">
                    <div className="flex justify-between items-center">
                      <span className="text-gray-600">当前阶段</span>
                      <span className="font-medium">
                        {getStageName(currentProgressSession.currentStage)}
                      </span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-gray-600">已用时间</span>
                      <span className="font-medium">{formatDuration(elapsedTime)}</span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-gray-600">预计剩余</span>
                      <span className="font-medium">
                        {estimatedRemaining > 0 ? formatDuration(estimatedRemaining) : '即将完成'}
                      </span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-gray-600">总体进度</span>
                      <span className="font-medium text-blue-600">
                        {currentProgressSession.overallProgress}%
                      </span>
                    </div>
                  </div>
                </div>

                <div className="bg-white rounded-xl p-6 shadow">
                  <h3 className="font-semibold text-gray-900 mb-4">🎯 下一步</h3>
                  <p className="text-gray-600 text-sm mb-4">
                    {currentProgressSession.currentStage === 'completed'
                      ? '交付已完成！请前往验收页面确认产品'
                      : '系统正在自动处理，完成后将通知您验收'}
                  </p>
                  <Button
                    className="w-full"
                    disabled={currentProgressSession.currentStage !== 'completed'}
                    onClick={() => setActiveTab('acceptance')}
                  >
                    {currentProgressSession.currentStage === 'completed' ? '开始验收' : '等待交付完成...'}
                  </Button>
                </div>
              </div>
            </div>
          </TabsContent>

          {/* 产品验收 */}
          <TabsContent value="acceptance">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {!acceptanceSession ? (
                <div className="rounded-2xl shadow-lg bg-white p-8 text-center">
                  <div className="text-5xl mb-4">✅</div>
                  <h3 className="text-lg font-semibold mb-2">准备开始验收</h3>
                  <p className="text-gray-500 mb-6">点击下方按钮开始产品验收流程</p>
                  <Button onClick={async () => {
                    await createAcceptance()
                    startAcceptance()
                  }}>
                    开始验收
                  </Button>
                </div>
              ) : (
                <AcceptanceCountdown
                  session={currentAcceptanceSession}
                  onContinue={() => extendTime()}
                  onNeedHelp={() => escalateAcceptance('需要帮助')}
                  onAutoPass={() => completeAcceptance()}
                />
              )}
              <div className="space-y-6">
                <div className="bg-white rounded-xl p-6 shadow">
                  <h3 className="font-semibold text-gray-900 mb-4">📋 验收说明</h3>
                  <div className="space-y-3 text-sm text-gray-600">
                    <p>1. 请在倒计时内完成产品验收</p>
                    <p>2. 检查网站是否能正常打开</p>
                    <p>3. 测试登录功能是否正常</p>
                    <p>4. 确认核心功能是否符合预期</p>
                    <p>5. 如遇问题可随时联系客服</p>
                  </div>
                </div>

                <div className="bg-amber-50 border border-amber-200 rounded-xl p-6">
                  <div className="flex items-start gap-3">
                    <span className="text-2xl">💡</span>
                    <div>
                      <h4 className="font-medium text-amber-800 mb-1">温馨提示</h4>
                      <p className="text-sm text-amber-700">
                        超时未完成验收将自动通过，我们会安排人工复查确保产品质量
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </TabsContent>

          {/* 首次登录 */}
          <TabsContent value="login">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <FirstLoginGuide
                session={currentLoginSession}
                onStepComplete={(index) => {
                  if (currentLoginSession?.guideSteps[index]) {
                    completeLoginStep(currentLoginSession.guideSteps[index].type)
                  }
                }}
                onSuccess={() => markLoginSuccess()}
                onNeedHelp={() => requestLoginSupport('需要登录帮助')}
              />
              <div className="space-y-6">
                <div className="bg-white rounded-xl p-6 shadow">
                  <h3 className="font-semibold text-gray-900 mb-4">🎓 登录帮助</h3>
                  <div className="space-y-4">
                    <div className="p-4 bg-gray-50 rounded-lg">
                      <h4 className="font-medium text-gray-800 mb-2">忘记密码？</h4>
                      <p className="text-sm text-gray-600 mb-2">
                        如果您忘记了密码，可以点击登录页面的"忘记密码"链接重置
                      </p>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => resetPassword()}
                        disabled={loginLoading}
                      >
                        重置密码
                      </Button>
                    </div>

                    <div className="p-4 bg-gray-50 rounded-lg">
                      <h4 className="font-medium text-gray-800 mb-2">无法登录？</h4>
                      <p className="text-sm text-gray-600 mb-2">
                        多次尝试仍无法登录？我们的客服随时为您服务
                      </p>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => requestLoginSupport('多次尝试无法登录')}
                        disabled={loginLoading}
                      >
                        联系客服
                      </Button>
                    </div>
                  </div>
                </div>

                {/* 登录进度指示 */}
                {loginSession && (
                  <div className="bg-white rounded-xl p-6 shadow">
                    <h3 className="font-semibold text-gray-900 mb-4">📊 登录进度</h3>
                    <div className="space-y-3">
                      <div className="flex justify-between text-sm">
                        <span className="text-gray-600">当前步骤</span>
                        <span className="font-medium">{loginCurrentStep?.instruction || '-'}</span>
                      </div>
                      <div className="w-full bg-gray-200 rounded-full h-2">
                        <div
                          className="bg-blue-600 h-2 rounded-full transition-all duration-300"
                          style={{ width: `${loginProgress}%` }}
                        />
                      </div>
                      <div className="text-right text-xs text-gray-500">
                        {loginProgress}% 完成
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </TabsContent>

          {/* 问题修复 */}
          <TabsContent value="errors">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <ErrorAutoFixPanel
                session={currentFixSession}
                onRetry={async () => {
                  if (currentFixSession.originalError) {
                    const classified = await classifyError({
                      code: currentFixSession.originalError.code,
                      message: currentFixSession.originalError.message,
                    })
                    if (classified) {
                      await startFix(classified)
                    }
                  }
                }}
                onContactSupport={() => escalateFix('用户请求人工支持')}
              />
              <div className="space-y-6">
                <div className="bg-white rounded-xl p-6 shadow">
                  <h3 className="font-semibold text-gray-900 mb-4">🔧 自动修复说明</h3>
                  <div className="space-y-3 text-sm text-gray-600">
                    <p>系统会自动尝试以下修复策略：</p>
                    <ul className="list-disc list-inside space-y-1 ml-2">
                      <li>自动重试连接</li>
                      <li>等待后重试（指数退避）</li>
                      <li>重新建立连接</li>
                      <li>切换备用服务器</li>
                      <li>回滚到稳定版本</li>
                    </ul>
                    <p className="mt-4">如果自动修复失败，系统会自动通知人工介入</p>
                  </div>
                </div>

                {/* 修复进度指示 */}
                {isFixing && (
                  <div className="bg-blue-50 border border-blue-200 rounded-xl p-6">
                    <div className="flex items-start gap-3">
                      <span className="text-2xl animate-spin">⚙️</span>
                      <div className="flex-1">
                        <h4 className="font-medium text-blue-800 mb-1">正在修复中...</h4>
                        <p className="text-sm text-blue-700 mb-2">
                          当前策略: {currentStrategy?.description || '准备中'}
                        </p>
                        <p className="text-xs text-blue-600">
                          尝试次数: {attemptCount} | 进度: {fixProgress}%
                        </p>
                      </div>
                    </div>
                  </div>
                )}

                {!isFixing && (
                  <div className="bg-green-50 border border-green-200 rounded-xl p-6">
                    <div className="flex items-start gap-3">
                      <span className="text-2xl">✅</span>
                      <div>
                        <h4 className="font-medium text-green-800 mb-1">大部分问题可自动解决</h4>
                        <p className="text-sm text-green-700">
                          90% 以上的常见问题都能通过自动修复解决，您只需耐心等待
                        </p>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </TabsContent>

          {/* 一键诊断 */}
          <TabsContent value="diagnosis">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <OneclickDiagnosisButton
                projectId={projectId}
                projectUrl={typeof window !== 'undefined' ? window.location.origin : ''}
                onComplete={(report) => console.log('诊断完成', report)}
                onNeedSupport={() => sendToSupport('需要技术支持')}
              />
              <div className="space-y-6">
                <div className="bg-white rounded-xl p-6 shadow">
                  <h3 className="font-semibold text-gray-900 mb-4">🔍 诊断功能说明</h3>
                  <div className="space-y-3 text-sm text-gray-600">
                    <p>一键诊断会自动收集以下信息：</p>
                    <ul className="list-disc list-inside space-y-1 ml-2">
                      <li>浏览器环境和版本</li>
                      <li>网络连接状态和速度</li>
                      <li>页面性能指标</li>
                      <li>本地存储使用情况</li>
                      <li>最近的错误日志</li>
                      <li>API 服务状态</li>
                    </ul>
                    <p className="mt-4">诊断报告可一键发送给客服，帮助快速定位问题</p>
                  </div>
                </div>

                <div className="bg-blue-50 border border-blue-200 rounded-xl p-6">
                  <div className="flex items-start gap-3">
                    <span className="text-2xl">💡</span>
                    <div>
                      <h4 className="font-medium text-blue-800 mb-1">遇到问题时先诊断</h4>
                      <p className="text-sm text-blue-700">
                        在联系客服前先运行诊断，可以帮助我们更快地解决您的问题
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </TabsContent>

          {/* 通知中心 */}
          <TabsContent value="notifications">
            <NotificationCenter
              notifications={notifications}
              onMarkAsRead={markAsRead}
              onMarkAllAsRead={markAllAsRead}
              onDismiss={deleteNotification}
              onAction={(notification, action) => console.log('执行操作', notification.id, action)}
            />
          </TabsContent>
        </Tabs>
      </main>

      {/* 悬浮组件 */}
      {activeTab !== 'progress' && currentProgressSession.currentStage !== 'completed' && (
        <FloatingProgressIndicator
          session={currentProgressSession}
          onClick={() => setActiveTab('progress')}
        />
      )}

      {activeTab !== 'diagnosis' && (
        <FloatingDiagnosisButton
          onClick={() => setActiveTab('diagnosis')}
        />
      )}
    </div>
    </DeliveryErrorBoundary>
  )
}
