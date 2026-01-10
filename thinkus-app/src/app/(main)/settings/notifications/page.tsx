'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Switch } from '@/components/ui/switch'
import { Label } from '@/components/ui/label'
import { Save, Loader2 } from 'lucide-react'
import { toast } from 'sonner'

interface NotificationSettings {
  email: {
    projectUpdates: boolean
    projectComplete: boolean
    marketing: boolean
    security: boolean
  }
  push: {
    projectUpdates: boolean
    projectComplete: boolean
  }
}

export default function NotificationsSettingsPage() {
  const [isLoading, setIsLoading] = useState(false)
  const [settings, setSettings] = useState<NotificationSettings>({
    email: {
      projectUpdates: true,
      projectComplete: true,
      marketing: false,
      security: true,
    },
    push: {
      projectUpdates: true,
      projectComplete: true,
    },
  })

  const handleToggle = (category: 'email' | 'push', key: string, value: boolean) => {
    setSettings(prev => ({
      ...prev,
      [category]: {
        ...prev[category],
        [key]: value,
      },
    }))
  }

  const handleSave = async () => {
    setIsLoading(true)
    await new Promise(resolve => setTimeout(resolve, 1000))
    toast.success('通知设置已更新')
    setIsLoading(false)
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold">通知设置</h2>
        <p className="text-muted-foreground">管理您接收通知的方式</p>
      </div>

      {/* Email Notifications */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">邮件通知</CardTitle>
          <CardDescription>选择您想通过邮件接收的通知类型</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <Label htmlFor="email-updates">项目更新</Label>
              <p className="text-sm text-muted-foreground">
                项目开发进度更新通知
              </p>
            </div>
            <Switch
              id="email-updates"
              checked={settings.email.projectUpdates}
              onCheckedChange={v => handleToggle('email', 'projectUpdates', v)}
            />
          </div>
          <div className="flex items-center justify-between">
            <div>
              <Label htmlFor="email-complete">项目完成</Label>
              <p className="text-sm text-muted-foreground">
                项目开发完成时通知
              </p>
            </div>
            <Switch
              id="email-complete"
              checked={settings.email.projectComplete}
              onCheckedChange={v => handleToggle('email', 'projectComplete', v)}
            />
          </div>
          <div className="flex items-center justify-between">
            <div>
              <Label htmlFor="email-marketing">营销活动</Label>
              <p className="text-sm text-muted-foreground">
                优惠活动和新功能通知
              </p>
            </div>
            <Switch
              id="email-marketing"
              checked={settings.email.marketing}
              onCheckedChange={v => handleToggle('email', 'marketing', v)}
            />
          </div>
          <div className="flex items-center justify-between">
            <div>
              <Label htmlFor="email-security">安全提醒</Label>
              <p className="text-sm text-muted-foreground">
                账户安全相关通知
              </p>
            </div>
            <Switch
              id="email-security"
              checked={settings.email.security}
              onCheckedChange={v => handleToggle('email', 'security', v)}
            />
          </div>
        </CardContent>
      </Card>

      {/* Push Notifications */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">推送通知</CardTitle>
          <CardDescription>浏览器推送通知设置</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <Label htmlFor="push-updates">项目更新</Label>
              <p className="text-sm text-muted-foreground">
                实时推送项目进度更新
              </p>
            </div>
            <Switch
              id="push-updates"
              checked={settings.push.projectUpdates}
              onCheckedChange={v => handleToggle('push', 'projectUpdates', v)}
            />
          </div>
          <div className="flex items-center justify-between">
            <div>
              <Label htmlFor="push-complete">项目完成</Label>
              <p className="text-sm text-muted-foreground">
                项目完成时即时通知
              </p>
            </div>
            <Switch
              id="push-complete"
              checked={settings.push.projectComplete}
              onCheckedChange={v => handleToggle('push', 'projectComplete', v)}
            />
          </div>
        </CardContent>
      </Card>

      <div className="flex justify-end">
        <Button onClick={handleSave} disabled={isLoading}>
          {isLoading ? (
            <>
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              保存中...
            </>
          ) : (
            <>
              <Save className="h-4 w-4 mr-2" />
              保存设置
            </>
          )}
        </Button>
      </div>
    </div>
  )
}
