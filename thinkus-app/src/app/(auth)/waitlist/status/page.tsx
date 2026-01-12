'use client'

import { useState, useEffect, Suspense } from 'react'
import { useSearchParams, useRouter } from 'next/navigation'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import {
  ArrowLeft,
  Loader2,
  Clock,
  CheckCircle,
  XCircle,
  AlertCircle,
  Copy,
  ExternalLink,
  RefreshCw,
} from 'lucide-react'
import { toast } from 'sonner'

interface WaitlistStatus {
  email: string
  position: number
  aheadCount: number
  score: number
  priority: string
  appliedAt: string
  reviewStatus: 'pending' | 'approved' | 'rejected'
  invitationCode?: string
  invitationExpiresAt?: string
  converted: boolean
}

function WaitlistStatusContent() {
  const searchParams = useSearchParams()
  const router = useRouter()
  const emailFromUrl = searchParams.get('email')

  const [email, setEmail] = useState(emailFromUrl || '')
  const [isLoading, setIsLoading] = useState(false)
  const [status, setStatus] = useState<WaitlistStatus | null>(null)
  const [error, setError] = useState<string | null>(null)

  const fetchStatus = async (emailToCheck: string) => {
    if (!emailToCheck) return

    setIsLoading(true)
    setError(null)

    try {
      const response = await fetch(
        `/api/waitlist/apply?email=${encodeURIComponent(emailToCheck)}`
      )
      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || '查询失败')
      }

      setStatus(data.data)
    } catch (err) {
      setError(err instanceof Error ? err.message : '查询失败')
      setStatus(null)
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    if (emailFromUrl) {
      fetchStatus(emailFromUrl)
    }
  }, [emailFromUrl])

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (email) {
      router.push(`/waitlist/status?email=${encodeURIComponent(email)}`)
      fetchStatus(email)
    }
  }

  const copyInvitationCode = () => {
    if (status?.invitationCode) {
      navigator.clipboard.writeText(status.invitationCode)
      toast.success('邀请码已复制')
    }
  }

  const getStatusConfig = () => {
    if (!status) return null

    switch (status.reviewStatus) {
      case 'approved':
        return {
          icon: <CheckCircle className="w-8 h-8 text-green-400" />,
          title: '申请已通过！',
          description: '你的邀请码已准备好',
          bgColor: 'bg-green-500/20',
          borderColor: 'border-green-500/30',
        }
      case 'rejected':
        return {
          icon: <XCircle className="w-8 h-8 text-red-400" />,
          title: '申请未通过',
          description: '感谢你的兴趣，但我们暂时无法接受你的申请',
          bgColor: 'bg-red-500/20',
          borderColor: 'border-red-500/30',
        }
      default:
        return {
          icon: <Clock className="w-8 h-8 text-yellow-400" />,
          title: '正在排队中',
          description: '我们正在审核你的申请',
          bgColor: 'bg-yellow-500/20',
          borderColor: 'border-yellow-500/30',
        }
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900">
      {/* Header */}
      <header className="p-4 border-b border-slate-800">
        <div className="max-w-2xl mx-auto flex items-center justify-between">
          <Link
            href="/"
            className="flex items-center gap-2 text-slate-400 hover:text-white transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
            返回首页
          </Link>
          <Link href="/apply" className="text-sm text-blue-400 hover:text-blue-300">
            提交新申请
          </Link>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-2xl mx-auto p-4 py-8">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-white mb-2">查看排队状态</h1>
          <p className="text-slate-400">输入你的邮箱查看申请进度</p>
        </div>

        {/* Email Input */}
        <Card className="bg-slate-800/50 border-slate-700 mb-6">
          <CardContent className="pt-6">
            <form onSubmit={handleSubmit} className="flex gap-3">
              <Input
                type="email"
                placeholder="输入你的邮箱地址"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="bg-slate-700/50 border-slate-600 text-white"
              />
              <Button type="submit" disabled={isLoading || !email}>
                {isLoading ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  '查询'
                )}
              </Button>
            </form>
          </CardContent>
        </Card>

        {/* Error State */}
        {error && (
          <Card className="bg-red-500/10 border-red-500/30 mb-6">
            <CardContent className="pt-6">
              <div className="flex items-center gap-3">
                <AlertCircle className="w-5 h-5 text-red-400" />
                <p className="text-red-400">{error}</p>
              </div>
              {error === '未找到该邮箱的申请记录' && (
                <Button
                  variant="link"
                  className="mt-2 text-red-400 hover:text-red-300 p-0"
                  onClick={() => router.push('/apply')}
                >
                  立即申请 →
                </Button>
              )}
            </CardContent>
          </Card>
        )}

        {/* Status Display */}
        {status && (
          <>
            {/* Status Card */}
            <Card
              className={`${getStatusConfig()?.bgColor} ${getStatusConfig()?.borderColor} border mb-6`}
            >
              <CardContent className="pt-6">
                <div className="flex items-start gap-4">
                  <div className="p-3 rounded-full bg-slate-800/50">
                    {getStatusConfig()?.icon}
                  </div>
                  <div className="flex-1">
                    <h2 className="text-xl font-semibold text-white">
                      {getStatusConfig()?.title}
                    </h2>
                    <p className="text-slate-400">{getStatusConfig()?.description}</p>
                  </div>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => fetchStatus(email)}
                    disabled={isLoading}
                  >
                    <RefreshCw
                      className={`w-4 h-4 text-slate-400 ${isLoading ? 'animate-spin' : ''}`}
                    />
                  </Button>
                </div>
              </CardContent>
            </Card>

            {/* Invitation Code (if approved) */}
            {status.reviewStatus === 'approved' && status.invitationCode && (
              <Card className="bg-gradient-to-r from-blue-500/20 to-purple-500/20 border-blue-500/30 mb-6">
                <CardHeader>
                  <CardTitle className="text-white">你的邀请码</CardTitle>
                  <CardDescription className="text-slate-400">
                    使用此邀请码注册 Thinkus
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="flex items-center gap-3 mb-4">
                    <div className="flex-1 bg-slate-800 rounded-lg p-4 font-mono text-2xl text-center text-white tracking-wider">
                      {status.invitationCode}
                    </div>
                    <Button variant="outline" size="icon" onClick={copyInvitationCode}>
                      <Copy className="w-4 h-4" />
                    </Button>
                  </div>

                  {status.invitationExpiresAt && (
                    <p className="text-sm text-slate-400 mb-4">
                      有效期至:{' '}
                      {new Date(status.invitationExpiresAt).toLocaleDateString('zh-CN', {
                        year: 'numeric',
                        month: 'long',
                        day: 'numeric',
                      })}
                    </p>
                  )}

                  <Button
                    className="w-full bg-blue-600 hover:bg-blue-700"
                    onClick={() =>
                      router.push(`/register?code=${status.invitationCode}`)
                    }
                  >
                    <ExternalLink className="w-4 h-4 mr-2" />
                    立即注册
                  </Button>
                </CardContent>
              </Card>
            )}

            {/* Queue Position (if pending) */}
            {status.reviewStatus === 'pending' && (
              <Card className="bg-slate-800/50 border-slate-700 mb-6">
                <CardContent className="pt-6">
                  <div className="grid grid-cols-2 gap-4">
                    <div className="bg-slate-700/50 rounded-lg p-4 text-center">
                      <div className="text-3xl font-bold text-white">
                        #{status.position}
                      </div>
                      <div className="text-sm text-slate-400">排队位置</div>
                    </div>
                    <div className="bg-slate-700/50 rounded-lg p-4 text-center">
                      <div className="text-3xl font-bold text-white">
                        {status.aheadCount}
                      </div>
                      <div className="text-sm text-slate-400">前面的人</div>
                    </div>
                  </div>

                  {status.priority === 'high' && (
                    <div className="mt-4 bg-amber-500/10 border border-amber-500/20 rounded-lg p-3 text-center">
                      <span className="text-amber-400 font-medium">高优先级</span>
                      <span className="text-slate-400 text-sm ml-2">
                        你的申请将优先审核
                      </span>
                    </div>
                  )}
                </CardContent>
              </Card>
            )}

            {/* Application Details */}
            <Card className="bg-slate-800/50 border-slate-700">
              <CardHeader>
                <CardTitle className="text-white text-lg">申请详情</CardTitle>
              </CardHeader>
              <CardContent>
                <dl className="space-y-3">
                  <div className="flex justify-between">
                    <dt className="text-slate-400">邮箱</dt>
                    <dd className="text-white">{status.email}</dd>
                  </div>
                  <div className="flex justify-between">
                    <dt className="text-slate-400">申请时间</dt>
                    <dd className="text-white">
                      {new Date(status.appliedAt).toLocaleDateString('zh-CN', {
                        year: 'numeric',
                        month: 'long',
                        day: 'numeric',
                        hour: '2-digit',
                        minute: '2-digit',
                      })}
                    </dd>
                  </div>
                  <div className="flex justify-between">
                    <dt className="text-slate-400">申请分数</dt>
                    <dd className="text-white">{status.score}/100</dd>
                  </div>
                  <div className="flex justify-between">
                    <dt className="text-slate-400">状态</dt>
                    <dd>
                      <span
                        className={`px-2 py-1 rounded text-sm ${
                          status.reviewStatus === 'approved'
                            ? 'bg-green-500/20 text-green-400'
                            : status.reviewStatus === 'rejected'
                            ? 'bg-red-500/20 text-red-400'
                            : 'bg-yellow-500/20 text-yellow-400'
                        }`}
                      >
                        {status.reviewStatus === 'approved'
                          ? '已通过'
                          : status.reviewStatus === 'rejected'
                          ? '未通过'
                          : '审核中'}
                      </span>
                    </dd>
                  </div>
                </dl>
              </CardContent>
            </Card>
          </>
        )}

        {/* Help Text */}
        <div className="mt-6 text-center">
          <p className="text-sm text-slate-500">
            有问题？联系我们{' '}
            <a href="mailto:support@thinkus.ai" className="text-blue-400 hover:underline">
              support@thinkus.ai
            </a>
          </p>
        </div>
      </main>
    </div>
  )
}

export default function WaitlistStatusPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-white" />
      </div>
    }>
      <WaitlistStatusContent />
    </Suspense>
  )
}
