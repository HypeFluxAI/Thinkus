'use client'

import { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Switch } from '@/components/ui/switch'
import { Label } from '@/components/ui/label'
import { Save, Loader2, Mail, Bell, MessageSquare, Calendar, FileText } from 'lucide-react'
import { toast } from 'sonner'
import { trpc } from '@/lib/trpc/client'

interface NotificationSettings {
  email: boolean
  push: boolean
  sms: boolean
  dailySummary: boolean
  weeklyReport: boolean
}

export default function NotificationsSettingsPage() {
  const [settings, setSettings] = useState<NotificationSettings>({
    email: true,
    push: true,
    sms: false,
    dailySummary: true,
    weeklyReport: true,
  })
  const [hasChanges, setHasChanges] = useState(false)

  const utils = trpc.useUtils()

  // 获取通知设置
  const { data, isLoading: loadingSettings } = trpc.user.getNotificationSettings.useQuery()

  // 更新通知设置
  const updateMutation = trpc.user.updateNotificationSettings.useMutation({
    onSuccess: () => {
      toast.success('通知设置已更新')
      setHasChanges(false)
      utils.user.getNotificationSettings.invalidate()
    },
    onError: error => {
      toast.error(error.message || '更新失败')
    },
  })

  // 初始化设置
  useEffect(() => {
    if (data?.settings) {
      setSettings(data.settings)
    }
  }, [data])

  const handleToggle = (key: keyof NotificationSettings, value: boolean) => {
    setSettings(prev => ({
      ...prev,
      [key]: value,
    }))
    setHasChanges(true)
  }

  const handleSave = async () => {
    await updateMutation.mutateAsync(settings)
  }

  if (loadingSettings) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold">通知设置</h2>
        <p className="text-muted-foreground">管理您接收通知的方式</p>
      </div>

      {/* 通知渠道 */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">通知渠道</CardTitle>
          <CardDescription>选择您接收通知的方式</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Mail className="h-5 w-5 text-muted-foreground" />
              <div>
                <Label htmlFor="email-notify">邮件通知</Label>
                <p className="text-sm text-muted-foreground">通过邮件接收重要通知</p>
              </div>
            </div>
            <Switch
              id="email-notify"
              checked={settings.email}
              onCheckedChange={v => handleToggle('email', v)}
            />
          </div>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Bell className="h-5 w-5 text-muted-foreground" />
              <div>
                <Label htmlFor="push-notify">推送通知</Label>
                <p className="text-sm text-muted-foreground">浏览器推送实时通知</p>
              </div>
            </div>
            <Switch
              id="push-notify"
              checked={settings.push}
              onCheckedChange={v => handleToggle('push', v)}
            />
          </div>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <MessageSquare className="h-5 w-5 text-muted-foreground" />
              <div>
                <Label htmlFor="sms-notify">短信通知</Label>
                <p className="text-sm text-muted-foreground">通过短信接收紧急通知</p>
              </div>
            </div>
            <Switch
              id="sms-notify"
              checked={settings.sms}
              onCheckedChange={v => handleToggle('sms', v)}
            />
          </div>
        </CardContent>
      </Card>

      {/* 定期报告 */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">定期报告</CardTitle>
          <CardDescription>项目进度汇总报告</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Calendar className="h-5 w-5 text-muted-foreground" />
              <div>
                <Label htmlFor="daily-summary">每日摘要</Label>
                <p className="text-sm text-muted-foreground">每天发送项目进度摘要</p>
              </div>
            </div>
            <Switch
              id="daily-summary"
              checked={settings.dailySummary}
              onCheckedChange={v => handleToggle('dailySummary', v)}
            />
          </div>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <FileText className="h-5 w-5 text-muted-foreground" />
              <div>
                <Label htmlFor="weekly-report">每周报告</Label>
                <p className="text-sm text-muted-foreground">每周发送详细项目报告</p>
              </div>
            </div>
            <Switch
              id="weekly-report"
              checked={settings.weeklyReport}
              onCheckedChange={v => handleToggle('weeklyReport', v)}
            />
          </div>
        </CardContent>
      </Card>

      <div className="flex justify-end">
        <Button onClick={handleSave} disabled={updateMutation.isPending || !hasChanges}>
          {updateMutation.isPending ? (
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
