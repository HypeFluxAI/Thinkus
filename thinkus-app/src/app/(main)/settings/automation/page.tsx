'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Switch } from '@/components/ui/switch'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import { useToast } from '@/components/ui/use-toast'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  Zap,
  Target,
  Calendar,
  Clock,
  Shield,
  AlertTriangle,
  Loader2,
  Info,
} from 'lucide-react'

interface AutomationSettings {
  autoExecution: {
    enabled: boolean
    maxRiskLevel: 'low' | 'medium'
    allowedTypes: string[]
    sendNotification: boolean
  }
  dailyStandup: {
    enabled: boolean
    time: string
    timezone: string
  }
  autoComplete: {
    enabled: boolean
    categories: string[]
  }
}

const DECISION_TYPES = [
  { value: 'feature', label: '功能决策' },
  { value: 'technical', label: '技术决策' },
  { value: 'design', label: '设计决策' },
  { value: 'priority', label: '优先级决策' },
  { value: 'business', label: '商业决策' },
  { value: 'resource', label: '资源决策' },
]

const DEFAULT_SETTINGS: AutomationSettings = {
  autoExecution: {
    enabled: false,
    maxRiskLevel: 'low',
    allowedTypes: ['feature', 'design', 'priority'],
    sendNotification: true,
  },
  dailyStandup: {
    enabled: true,
    time: '09:00',
    timezone: 'Asia/Shanghai',
  },
  autoComplete: {
    enabled: false,
    categories: ['auto'],
  },
}

export default function AutomationSettingsPage() {
  const { toast } = useToast()
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [settings, setSettings] = useState<AutomationSettings>(DEFAULT_SETTINGS)

  // 加载设置
  useEffect(() => {
    loadSettings()
  }, [])

  const loadSettings = async () => {
    try {
      setLoading(true)
      const response = await fetch('/api/settings/automation')
      if (response.ok) {
        const data = await response.json()
        if (data.settings) {
          setSettings({
            ...DEFAULT_SETTINGS,
            ...data.settings,
          })
        }
      }
    } catch (error) {
      console.error('Failed to load settings:', error)
    } finally {
      setLoading(false)
    }
  }

  // 保存设置
  const saveSettings = async () => {
    try {
      setSaving(true)
      const response = await fetch('/api/settings/automation', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ settings }),
      })

      if (response.ok) {
        toast({
          title: '设置已保存',
          description: '自动化设置已更新',
        })
      } else {
        throw new Error('Failed to save')
      }
    } catch (error) {
      console.error('Failed to save settings:', error)
      toast({
        title: '保存失败',
        variant: 'destructive',
      })
    } finally {
      setSaving(false)
    }
  }

  // 切换决策类型
  const toggleDecisionType = (type: string) => {
    setSettings((prev) => ({
      ...prev,
      autoExecution: {
        ...prev.autoExecution,
        allowedTypes: prev.autoExecution.allowedTypes.includes(type)
          ? prev.autoExecution.allowedTypes.filter((t) => t !== type)
          : [...prev.autoExecution.allowedTypes, type],
      },
    }))
  }

  if (loading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-64" />
        <Skeleton className="h-48" />
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold flex items-center gap-2">
          <Zap className="h-6 w-6 text-primary" />
          自动化设置
        </h1>
        <p className="text-muted-foreground">
          配置系统自动执行功能，让 AI 团队更高效地为您工作
        </p>
      </div>

      {/* 自动决策执行 */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="text-base flex items-center gap-2">
                <Target className="h-4 w-4" />
                自动决策执行
              </CardTitle>
              <CardDescription>
                允许系统自动批准低风险决策
              </CardDescription>
            </div>
            <Switch
              checked={settings.autoExecution.enabled}
              onCheckedChange={(checked) =>
                setSettings((prev) => ({
                  ...prev,
                  autoExecution: { ...prev.autoExecution, enabled: checked },
                }))
              }
            />
          </div>
        </CardHeader>
        {settings.autoExecution.enabled && (
          <CardContent className="space-y-6">
            {/* 风险提示 */}
            <div className="flex items-start gap-3 p-3 rounded-lg bg-yellow-50 dark:bg-yellow-950/20 border border-yellow-200 dark:border-yellow-900">
              <AlertTriangle className="h-5 w-5 text-yellow-600 shrink-0 mt-0.5" />
              <div className="text-sm">
                <p className="font-medium text-yellow-800 dark:text-yellow-200">
                  注意
                </p>
                <p className="text-yellow-700 dark:text-yellow-300">
                  启用自动执行后，低风险决策将由系统自动批准。关键和重要决策仍需您手动确认。
                </p>
              </div>
            </div>

            {/* 最大风险等级 */}
            <div className="space-y-2">
              <Label>允许的最大风险等级</Label>
              <Select
                value={settings.autoExecution.maxRiskLevel}
                onValueChange={(value: 'low' | 'medium') =>
                  setSettings((prev) => ({
                    ...prev,
                    autoExecution: { ...prev.autoExecution, maxRiskLevel: value },
                  }))
                }
              >
                <SelectTrigger className="w-48">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="low">
                    <div className="flex items-center gap-2">
                      <Shield className="h-4 w-4 text-green-500" />
                      仅低风险
                    </div>
                  </SelectItem>
                  <SelectItem value="medium">
                    <div className="flex items-center gap-2">
                      <Shield className="h-4 w-4 text-yellow-500" />
                      低至中等风险
                    </div>
                  </SelectItem>
                </SelectContent>
              </Select>
              <p className="text-xs text-muted-foreground">
                高风险和关键决策始终需要手动确认
              </p>
            </div>

            {/* 允许的决策类型 */}
            <div className="space-y-2">
              <Label>允许自动执行的决策类型</Label>
              <div className="flex flex-wrap gap-2">
                {DECISION_TYPES.map((type) => (
                  <Badge
                    key={type.value}
                    variant={
                      settings.autoExecution.allowedTypes.includes(type.value)
                        ? 'default'
                        : 'outline'
                    }
                    className="cursor-pointer"
                    onClick={() => toggleDecisionType(type.value)}
                  >
                    {type.label}
                  </Badge>
                ))}
              </div>
              <p className="text-xs text-muted-foreground">
                点击切换选中状态。商业和资源决策默认不允许自动执行。
              </p>
            </div>

            {/* 发送通知 */}
            <div className="flex items-center justify-between">
              <div>
                <Label>自动执行后发送通知</Label>
                <p className="text-xs text-muted-foreground">
                  当决策被自动批准时收到通知
                </p>
              </div>
              <Switch
                checked={settings.autoExecution.sendNotification}
                onCheckedChange={(checked) =>
                  setSettings((prev) => ({
                    ...prev,
                    autoExecution: { ...prev.autoExecution, sendNotification: checked },
                  }))
                }
              />
            </div>
          </CardContent>
        )}
      </Card>

      {/* 每日例会 */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="text-base flex items-center gap-2">
                <Calendar className="h-4 w-4" />
                每日例会
              </CardTitle>
              <CardDescription>
                自动安排并执行每日站会
              </CardDescription>
            </div>
            <Switch
              checked={settings.dailyStandup.enabled}
              onCheckedChange={(checked) =>
                setSettings((prev) => ({
                  ...prev,
                  dailyStandup: { ...prev.dailyStandup, enabled: checked },
                }))
              }
            />
          </div>
        </CardHeader>
        {settings.dailyStandup.enabled && (
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>例会时间</Label>
                <Select
                  value={settings.dailyStandup.time}
                  onValueChange={(value) =>
                    setSettings((prev) => ({
                      ...prev,
                      dailyStandup: { ...prev.dailyStandup, time: value },
                    }))
                  }
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="08:00">08:00</SelectItem>
                    <SelectItem value="09:00">09:00</SelectItem>
                    <SelectItem value="10:00">10:00</SelectItem>
                    <SelectItem value="14:00">14:00</SelectItem>
                    <SelectItem value="15:00">15:00</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>时区</Label>
                <Select
                  value={settings.dailyStandup.timezone}
                  onValueChange={(value) =>
                    setSettings((prev) => ({
                      ...prev,
                      dailyStandup: { ...prev.dailyStandup, timezone: value },
                    }))
                  }
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Asia/Shanghai">北京时间 (UTC+8)</SelectItem>
                    <SelectItem value="Asia/Tokyo">东京时间 (UTC+9)</SelectItem>
                    <SelectItem value="America/New_York">纽约时间 (UTC-5)</SelectItem>
                    <SelectItem value="America/Los_Angeles">洛杉矶时间 (UTC-8)</SelectItem>
                    <SelectItem value="Europe/London">伦敦时间 (UTC+0)</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Info className="h-4 w-4" />
              <span>例会将在工作日（周一至周五）自动进行</span>
            </div>
          </CardContent>
        )}
      </Card>

      {/* 自动完成行动项 */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="text-base flex items-center gap-2">
                <Clock className="h-4 w-4" />
                自动完成行动项
              </CardTitle>
              <CardDescription>
                自动标记过期的自动化行动项为已完成
              </CardDescription>
            </div>
            <Switch
              checked={settings.autoComplete.enabled}
              onCheckedChange={(checked) =>
                setSettings((prev) => ({
                  ...prev,
                  autoComplete: { ...prev.autoComplete, enabled: checked },
                }))
              }
            />
          </div>
        </CardHeader>
        {settings.autoComplete.enabled && (
          <CardContent>
            <p className="text-sm text-muted-foreground">
              仅适用于标记为"自动"类别的行动项。手动创建的行动项不会被自动完成。
            </p>
          </CardContent>
        )}
      </Card>

      {/* 保存按钮 */}
      <div className="flex justify-end">
        <Button onClick={saveSettings} disabled={saving}>
          {saving && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
          保存设置
        </Button>
      </div>
    </div>
  )
}
