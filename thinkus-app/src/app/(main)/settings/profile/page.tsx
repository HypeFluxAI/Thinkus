'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Separator } from '@/components/ui/separator'
import { Camera, Save, Loader2 } from 'lucide-react'
import { toast } from 'sonner'

export default function ProfileSettingsPage() {
  const [isLoading, setIsLoading] = useState(false)
  const [profile, setProfile] = useState({
    name: '张三',
    email: 'zhangsan@example.com',
    bio: '热爱技术，追求创新',
    company: 'Thinkus',
    website: 'https://thinkus.dev',
  })

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsLoading(true)

    // Simulate API call
    await new Promise(resolve => setTimeout(resolve, 1000))

    toast.success('个人资料已更新')
    setIsLoading(false)
  }

  const handleChange = (field: string, value: string) => {
    setProfile(prev => ({ ...prev, [field]: value }))
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold">个人资料</h2>
        <p className="text-muted-foreground">管理您的个人信息</p>
      </div>

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
                <AvatarImage src="/placeholder-avatar.jpg" />
                <AvatarFallback className="text-2xl">
                  {profile.name.charAt(0)}
                </AvatarFallback>
              </Avatar>
              <div>
                <Button type="button" variant="outline" size="sm">
                  <Camera className="h-4 w-4 mr-2" />
                  更换头像
                </Button>
                <p className="text-xs text-muted-foreground mt-2">
                  支持 JPG, PNG 格式，最大 2MB
                </p>
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

            {/* Email */}
            <div className="space-y-2">
              <Label htmlFor="email">邮箱</Label>
              <Input
                id="email"
                type="email"
                value={profile.email}
                onChange={e => handleChange('email', e.target.value)}
                placeholder="your@email.com"
                disabled
              />
              <p className="text-xs text-muted-foreground">
                邮箱地址不可修改，如需更改请联系客服
              </p>
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
              />
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
          <Button type="submit" disabled={isLoading}>
            {isLoading ? (
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
