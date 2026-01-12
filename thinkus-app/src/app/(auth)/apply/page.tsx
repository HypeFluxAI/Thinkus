'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { ArrowLeft, Loader2, Sparkles, Users, Clock, CheckCircle } from 'lucide-react'
import { toast } from 'sonner'

const ROLES = [
  { value: 'founder', label: '创始人/CEO' },
  { value: 'pm', label: '产品经理' },
  { value: 'developer', label: '开发者' },
  { value: 'student', label: '学生' },
  { value: 'other', label: '其他' },
]

const REFERRAL_SOURCES = [
  { value: 'friend', label: '朋友推荐' },
  { value: 'twitter', label: 'Twitter/X' },
  { value: 'reddit', label: 'Reddit' },
  { value: 'producthunt', label: 'Product Hunt' },
  { value: 'search', label: '搜索引擎' },
  { value: 'other', label: '其他' },
]

export default function ApplyPage() {
  const router = useRouter()
  const [isLoading, setIsLoading] = useState(false)
  const [submitted, setSubmitted] = useState(false)
  const [applicationResult, setApplicationResult] = useState<{
    position: number
    aheadCount: number
    score: number
    priority: string
  } | null>(null)

  const [formData, setFormData] = useState({
    email: '',
    projectIdea: '',
    role: '',
    referralSource: '',
    socialLinks: [''],
  })

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsLoading(true)

    try {
      const response = await fetch('/api/waitlist/apply', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...formData,
          socialLinks: formData.socialLinks.filter(link => link.trim()),
        }),
      })

      const data = await response.json()

      if (!response.ok) {
        if (response.status === 409) {
          // 已申请过
          toast.info('该邮箱已提交申请', {
            description: `当前排队位置: #${data.position}`,
          })
          router.push(`/waitlist/status?email=${encodeURIComponent(formData.email)}`)
          return
        }
        throw new Error(data.error || '提交失败')
      }

      setApplicationResult(data.data)
      setSubmitted(true)
      toast.success('申请已提交！')
    } catch (error) {
      toast.error(error instanceof Error ? error.message : '提交失败，请重试')
    } finally {
      setIsLoading(false)
    }
  }

  const addSocialLink = () => {
    if (formData.socialLinks.length < 3) {
      setFormData(prev => ({
        ...prev,
        socialLinks: [...prev.socialLinks, ''],
      }))
    }
  }

  const updateSocialLink = (index: number, value: string) => {
    setFormData(prev => ({
      ...prev,
      socialLinks: prev.socialLinks.map((link, i) => (i === index ? value : link)),
    }))
  }

  if (submitted && applicationResult) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 flex items-center justify-center p-4">
        <Card className="w-full max-w-md bg-slate-800/50 border-slate-700">
          <CardHeader className="text-center">
            <div className="mx-auto w-16 h-16 rounded-full bg-green-500/20 flex items-center justify-center mb-4">
              <CheckCircle className="w-8 h-8 text-green-400" />
            </div>
            <CardTitle className="text-2xl text-white">申请已提交！</CardTitle>
            <CardDescription className="text-slate-400">
              我们正在审核你的申请
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="grid grid-cols-2 gap-4">
              <div className="bg-slate-700/50 rounded-lg p-4 text-center">
                <div className="text-3xl font-bold text-white">
                  #{applicationResult.position}
                </div>
                <div className="text-sm text-slate-400">排队位置</div>
              </div>
              <div className="bg-slate-700/50 rounded-lg p-4 text-center">
                <div className="text-3xl font-bold text-white">
                  {applicationResult.aheadCount}
                </div>
                <div className="text-sm text-slate-400">前面的人</div>
              </div>
            </div>

            {applicationResult.priority === 'high' && (
              <div className="bg-amber-500/10 border border-amber-500/20 rounded-lg p-4 text-center">
                <Sparkles className="w-5 h-5 text-amber-400 mx-auto mb-2" />
                <div className="text-amber-400 font-medium">高优先级</div>
                <div className="text-sm text-slate-400">你的申请将优先审核</div>
              </div>
            )}

            <div className="space-y-3">
              <Button
                className="w-full"
                onClick={() =>
                  router.push(`/waitlist/status?email=${encodeURIComponent(formData.email)}`)
                }
              >
                查看排队状态
              </Button>
              <Button
                variant="outline"
                className="w-full"
                onClick={() => router.push('/')}
              >
                返回首页
              </Button>
            </div>

            <p className="text-xs text-center text-slate-500">
              我们会通过邮件通知你审核结果，请保持邮箱畅通
            </p>
          </CardContent>
        </Card>
      </div>
    )
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
          <Link
            href="/login"
            className="text-sm text-blue-400 hover:text-blue-300"
          >
            已有邀请码？登录
          </Link>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-2xl mx-auto p-4 py-8">
        {/* Hero Section */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center gap-2 bg-blue-500/10 text-blue-400 px-4 py-2 rounded-full text-sm mb-4">
            <Users className="w-4 h-4" />
            <span>仅限受邀用户</span>
          </div>
          <h1 className="text-3xl font-bold text-white mb-2">
            申请加入 Thinkus
          </h1>
          <p className="text-slate-400 max-w-md mx-auto">
            告诉我们你的项目想法，我们会尽快审核并发送邀请码
          </p>
        </div>

        {/* Stats Banner */}
        <div className="grid grid-cols-3 gap-4 mb-8">
          <div className="bg-slate-800/50 rounded-lg p-4 text-center border border-slate-700">
            <Clock className="w-5 h-5 text-slate-400 mx-auto mb-2" />
            <div className="text-sm text-slate-400">平均等待</div>
            <div className="text-lg font-semibold text-white">3-5天</div>
          </div>
          <div className="bg-slate-800/50 rounded-lg p-4 text-center border border-slate-700">
            <Users className="w-5 h-5 text-slate-400 mx-auto mb-2" />
            <div className="text-sm text-slate-400">排队人数</div>
            <div className="text-lg font-semibold text-white">500+</div>
          </div>
          <div className="bg-slate-800/50 rounded-lg p-4 text-center border border-slate-700">
            <Sparkles className="w-5 h-5 text-slate-400 mx-auto mb-2" />
            <div className="text-sm text-slate-400">通过率</div>
            <div className="text-lg font-semibold text-white">~60%</div>
          </div>
        </div>

        {/* Application Form */}
        <Card className="bg-slate-800/50 border-slate-700">
          <CardHeader>
            <CardTitle className="text-white">申请表</CardTitle>
            <CardDescription className="text-slate-400">
              详细的申请会获得更高的优先级
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-6">
              {/* Email */}
              <div className="space-y-2">
                <Label htmlFor="email" className="text-slate-300">
                  邮箱地址 <span className="text-red-400">*</span>
                </Label>
                <Input
                  id="email"
                  type="email"
                  placeholder="your@email.com"
                  value={formData.email}
                  onChange={(e) =>
                    setFormData((prev) => ({ ...prev, email: e.target.value }))
                  }
                  required
                  className="bg-slate-700/50 border-slate-600 text-white"
                />
              </div>

              {/* Role */}
              <div className="space-y-2">
                <Label htmlFor="role" className="text-slate-300">
                  你的角色 <span className="text-red-400">*</span>
                </Label>
                <Select
                  value={formData.role}
                  onValueChange={(value) =>
                    setFormData((prev) => ({ ...prev, role: value }))
                  }
                >
                  <SelectTrigger className="bg-slate-700/50 border-slate-600 text-white">
                    <SelectValue placeholder="选择你的角色" />
                  </SelectTrigger>
                  <SelectContent>
                    {ROLES.map((role) => (
                      <SelectItem key={role.value} value={role.value}>
                        {role.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Project Idea */}
              <div className="space-y-2">
                <Label htmlFor="projectIdea" className="text-slate-300">
                  你想做什么产品？ <span className="text-red-400">*</span>
                </Label>
                <Textarea
                  id="projectIdea"
                  placeholder="描述你的产品想法、目标用户、想解决的问题...（至少50字）"
                  value={formData.projectIdea}
                  onChange={(e) =>
                    setFormData((prev) => ({ ...prev, projectIdea: e.target.value }))
                  }
                  required
                  rows={5}
                  className="bg-slate-700/50 border-slate-600 text-white resize-none"
                />
                <div className="text-xs text-slate-500 text-right">
                  {formData.projectIdea.length}/2000 字符
                </div>
              </div>

              {/* Referral Source */}
              <div className="space-y-2">
                <Label htmlFor="referralSource" className="text-slate-300">
                  你是如何知道 Thinkus 的？
                </Label>
                <Select
                  value={formData.referralSource}
                  onValueChange={(value) =>
                    setFormData((prev) => ({ ...prev, referralSource: value }))
                  }
                >
                  <SelectTrigger className="bg-slate-700/50 border-slate-600 text-white">
                    <SelectValue placeholder="选择来源" />
                  </SelectTrigger>
                  <SelectContent>
                    {REFERRAL_SOURCES.map((source) => (
                      <SelectItem key={source.value} value={source.value}>
                        {source.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Social Links */}
              <div className="space-y-2">
                <Label className="text-slate-300">社交账号（可选）</Label>
                <p className="text-xs text-slate-500">
                  添加你的社交账号可以提高审核优先级
                </p>
                {formData.socialLinks.map((link, index) => (
                  <Input
                    key={index}
                    type="url"
                    placeholder="https://twitter.com/username"
                    value={link}
                    onChange={(e) => updateSocialLink(index, e.target.value)}
                    className="bg-slate-700/50 border-slate-600 text-white"
                  />
                ))}
                {formData.socialLinks.length < 3 && (
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={addSocialLink}
                    className="text-slate-400 hover:text-white"
                  >
                    + 添加更多
                  </Button>
                )}
              </div>

              {/* Submit */}
              <Button
                type="submit"
                className="w-full bg-blue-600 hover:bg-blue-700"
                disabled={isLoading || !formData.email || !formData.role || formData.projectIdea.length < 50}
              >
                {isLoading ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    提交中...
                  </>
                ) : (
                  '提交申请'
                )}
              </Button>
            </form>
          </CardContent>
        </Card>

        {/* Tips */}
        <div className="mt-6 p-4 bg-slate-800/30 rounded-lg border border-slate-700">
          <h3 className="font-medium text-white mb-2">提高通过率的技巧</h3>
          <ul className="text-sm text-slate-400 space-y-1">
            <li>- 详细描述你的产品想法和目标用户</li>
            <li>- 说明你想解决的具体问题</li>
            <li>- 添加你的社交账号或作品集链接</li>
            <li>- 如果有朋友推荐，请在来源中选择</li>
          </ul>
        </div>
      </main>
    </div>
  )
}
