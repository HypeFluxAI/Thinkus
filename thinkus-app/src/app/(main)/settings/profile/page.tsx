'use client'

import { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Separator } from '@/components/ui/separator'
import { Badge } from '@/components/ui/badge'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'
import { Camera, Save, Loader2, Mail, Phone, Check, Plus } from 'lucide-react'
import { toast } from 'sonner'
import { trpc } from '@/lib/trpc/client'

export default function ProfileSettingsPage() {
  const [isLoading, setIsLoading] = useState(false)
  const [profile, setProfile] = useState({
    name: '',
    bio: '',
    company: '',
    website: '',
    location: '',
  })

  // 绑定相关状态
  const [bindDialogOpen, setBindDialogOpen] = useState(false)
  const [bindType, setBindType] = useState<'email' | 'phone'>('email')
  const [bindValue, setBindValue] = useState('')
  const [bindCode, setBindCode] = useState('')
  const [codeSent, setCodeSent] = useState(false)
  const [sendingCode, setSendingCode] = useState(false)
  const [verifying, setVerifying] = useState(false)

  const utils = trpc.useUtils()

  // 获取用户数据
  const { data, isLoading: loadingUser } = trpc.user.me.useQuery()

  // 更新资料
  const updateMutation = trpc.user.updateProfile.useMutation({
    onSuccess: () => {
      toast.success('个人资料已更新')
      utils.user.me.invalidate()
    },
    onError: error => {
      toast.error(error.message || '更新失败')
    },
  })

  // 初始化表单数据
  useEffect(() => {
    if (data?.user) {
      setProfile({
        name: data.user.name || '',
        bio: data.user.profile?.bio || '',
        company: data.user.profile?.company || '',
        website: data.user.profile?.website || '',
        location: data.user.profile?.location || '',
      })
    }
  }, [data])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsLoading(true)

    try {
      await updateMutation.mutateAsync({
        name: profile.name,
        bio: profile.bio,
        company: profile.company,
        website: profile.website || '',
        location: profile.location,
      })
    } finally {
      setIsLoading(false)
    }
  }

  const handleChange = (field: string, value: string) => {
    setProfile(prev => ({ ...prev, [field]: value }))
  }

  // 发送绑定验证码
  const handleSendCode = async () => {
    if (!bindValue) {
      toast.error(bindType === 'email' ? '请输入邮箱' : '请输入手机号')
      return
    }

    setSendingCode(true)
    try {
      const endpoint = bindType === 'email' ? '/api/user/bind-email' : '/api/user/bind-phone'
      const payload = bindType === 'email' ? { email: bindValue } : { phone: bindValue }

      const res = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      })

      const data = await res.json()

      if (!res.ok) {
        throw new Error(data.error || '发送失败')
      }

      setCodeSent(true)
      toast.success('验证码已发送')

      // 开发环境显示验证码
      if (data.code) {
        toast.info(`开发环境验证码: ${data.code}`)
      }
    } catch (error) {
      toast.error(error instanceof Error ? error.message : '发送验证码失败')
    } finally {
      setSendingCode(false)
    }
  }

  // 验证并绑定
  const handleVerifyBind = async () => {
    if (!bindCode) {
      toast.error('请输入验证码')
      return
    }

    setVerifying(true)
    try {
      const endpoint = bindType === 'email' ? '/api/user/bind-email' : '/api/user/bind-phone'
      const payload =
        bindType === 'email' ? { email: bindValue, code: bindCode } : { phone: bindValue, code: bindCode }

      const res = await fetch(endpoint, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      })

      const data = await res.json()

      if (!res.ok) {
        throw new Error(data.error || '绑定失败')
      }

      toast.success(bindType === 'email' ? '邮箱绑定成功' : '手机号绑定成功')
      setBindDialogOpen(false)
      resetBindState()
      utils.user.me.invalidate()
    } catch (error) {
      toast.error(error instanceof Error ? error.message : '绑定失败')
    } finally {
      setVerifying(false)
    }
  }

  const resetBindState = () => {
    setBindValue('')
    setBindCode('')
    setCodeSent(false)
  }

  const openBindDialog = (type: 'email' | 'phone') => {
    setBindType(type)
    resetBindState()
    setBindDialogOpen(true)
  }

  if (loadingUser) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    )
  }

  const user = data?.user

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold">个人资料</h2>
        <p className="text-muted-foreground">管理您的个人信息</p>
      </div>

      {/* 账户信息卡片 */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">账户信息</CardTitle>
          <CardDescription>您的登录方式和联系信息</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* 邮箱 */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Mail className="h-5 w-5 text-muted-foreground" />
              <div>
                <p className="text-sm font-medium">邮箱</p>
                {user?.email ? (
                  <div className="flex items-center gap-2">
                    <span className="text-sm text-muted-foreground">{user.email}</span>
                    {user.emailVerified && (
                      <Badge variant="secondary" className="text-xs">
                        <Check className="h-3 w-3 mr-1" />
                        已验证
                      </Badge>
                    )}
                  </div>
                ) : (
                  <span className="text-sm text-muted-foreground">未绑定</span>
                )}
              </div>
            </div>
            {!user?.email && (
              <Button variant="outline" size="sm" onClick={() => openBindDialog('email')}>
                <Plus className="h-4 w-4 mr-1" />
                绑定邮箱
              </Button>
            )}
          </div>

          <Separator />

          {/* 手机号 */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Phone className="h-5 w-5 text-muted-foreground" />
              <div>
                <p className="text-sm font-medium">手机号</p>
                {user?.phone ? (
                  <div className="flex items-center gap-2">
                    <span className="text-sm text-muted-foreground">{user.phone}</span>
                    {user.phoneVerified && (
                      <Badge variant="secondary" className="text-xs">
                        <Check className="h-3 w-3 mr-1" />
                        已验证
                      </Badge>
                    )}
                  </div>
                ) : (
                  <span className="text-sm text-muted-foreground">未绑定</span>
                )}
              </div>
            </div>
            {!user?.phone && (
              <Button variant="outline" size="sm" onClick={() => openBindDialog('phone')}>
                <Plus className="h-4 w-4 mr-1" />
                绑定手机
              </Button>
            )}
          </div>
        </CardContent>
      </Card>

      {/* 绑定对话框 */}
      <Dialog open={bindDialogOpen} onOpenChange={setBindDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>绑定{bindType === 'email' ? '邮箱' : '手机号'}</DialogTitle>
            <DialogDescription>
              绑定后可以使用{bindType === 'email' ? '邮箱' : '手机号'}登录，也方便接收重要通知
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>{bindType === 'email' ? '邮箱地址' : '手机号'}</Label>
              <div className="flex gap-2">
                <Input
                  type={bindType === 'email' ? 'email' : 'tel'}
                  value={bindValue}
                  onChange={e => setBindValue(e.target.value)}
                  placeholder={bindType === 'email' ? 'your@email.com' : '13800138000'}
                  disabled={codeSent}
                />
                <Button onClick={handleSendCode} disabled={sendingCode || codeSent} variant="outline">
                  {sendingCode ? <Loader2 className="h-4 w-4 animate-spin" /> : codeSent ? '已发送' : '发送验证码'}
                </Button>
              </div>
            </div>
            {codeSent && (
              <div className="space-y-2">
                <Label>验证码</Label>
                <Input
                  value={bindCode}
                  onChange={e => setBindCode(e.target.value)}
                  placeholder="请输入6位验证码"
                  maxLength={6}
                />
              </div>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setBindDialogOpen(false)}>
              取消
            </Button>
            <Button onClick={handleVerifyBind} disabled={!codeSent || !bindCode || verifying}>
              {verifying ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : null}
              确认绑定
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* 个人资料表单 */}
      <form onSubmit={handleSubmit}>
        <Card>
          <CardHeader>
            <CardTitle className="text-base">基本信息</CardTitle>
            <CardDescription>您的公开个人资料</CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* Avatar */}
            <div className="flex items-center gap-4">
              <Avatar className="h-20 w-20">
                <AvatarImage src={user?.avatar} />
                <AvatarFallback className="text-2xl">{profile.name?.charAt(0) || 'U'}</AvatarFallback>
              </Avatar>
              <div>
                <Button type="button" variant="outline" size="sm">
                  <Camera className="h-4 w-4 mr-2" />
                  更换头像
                </Button>
                <p className="text-xs text-muted-foreground mt-2">支持 JPG, PNG 格式，最大 2MB</p>
              </div>
            </div>

            <Separator />

            {/* Name */}
            <div className="space-y-2">
              <Label htmlFor="name">姓名</Label>
              <Input
                id="name"
                value={profile.name}
                onChange={e => handleChange('name', e.target.value)}
                placeholder="您的姓名"
              />
            </div>

            {/* Bio */}
            <div className="space-y-2">
              <Label htmlFor="bio">个人简介</Label>
              <Textarea
                id="bio"
                value={profile.bio}
                onChange={e => handleChange('bio', e.target.value)}
                placeholder="介绍一下自己..."
                rows={3}
                maxLength={500}
              />
              <p className="text-xs text-muted-foreground text-right">{profile.bio.length}/500</p>
            </div>

            {/* Company */}
            <div className="space-y-2">
              <Label htmlFor="company">公司/组织</Label>
              <Input
                id="company"
                value={profile.company}
                onChange={e => handleChange('company', e.target.value)}
                placeholder="您的公司或组织"
              />
            </div>

            {/* Location */}
            <div className="space-y-2">
              <Label htmlFor="location">所在地</Label>
              <Input
                id="location"
                value={profile.location}
                onChange={e => handleChange('location', e.target.value)}
                placeholder="例如: 北京"
              />
            </div>

            {/* Website */}
            <div className="space-y-2">
              <Label htmlFor="website">个人网站</Label>
              <Input
                id="website"
                type="url"
                value={profile.website}
                onChange={e => handleChange('website', e.target.value)}
                placeholder="https://yoursite.com"
              />
            </div>
          </CardContent>
        </Card>

        <div className="flex justify-end mt-6">
          <Button type="submit" disabled={isLoading || updateMutation.isPending}>
            {isLoading || updateMutation.isPending ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                保存中...
              </>
            ) : (
              <>
                <Save className="h-4 w-4 mr-2" />
                保存更改
              </>
            )}
          </Button>
        </div>
      </form>

      {/* Danger Zone */}
      <Card className="border-destructive/50">
        <CardHeader>
          <CardTitle className="text-base text-destructive">危险区域</CardTitle>
          <CardDescription>删除账户后无法恢复</CardDescription>
        </CardHeader>
        <CardContent>
          <Button variant="destructive">删除账户</Button>
        </CardContent>
      </Card>
    </div>
  )
}
