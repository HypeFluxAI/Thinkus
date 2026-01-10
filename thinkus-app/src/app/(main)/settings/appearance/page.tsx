'use client'

import { useState } from 'react'
import { useTheme } from 'next-themes'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Label } from '@/components/ui/label'
import { cn } from '@/lib/utils'
import { Sun, Moon, Monitor, Check } from 'lucide-react'

const THEME_OPTIONS = [
  { value: 'light', label: '浅色', icon: Sun },
  { value: 'dark', label: '深色', icon: Moon },
  { value: 'system', label: '跟随系统', icon: Monitor },
]

const ACCENT_COLORS = [
  { value: 'blue', label: '蓝色', class: 'bg-blue-500' },
  { value: 'green', label: '绿色', class: 'bg-green-500' },
  { value: 'purple', label: '紫色', class: 'bg-purple-500' },
  { value: 'orange', label: '橙色', class: 'bg-orange-500' },
  { value: 'pink', label: '粉色', class: 'bg-pink-500' },
]

export default function AppearanceSettingsPage() {
  const { theme, setTheme } = useTheme()
  const [accentColor, setAccentColor] = useState('blue')

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold">外观设置</h2>
        <p className="text-muted-foreground">自定义应用的外观和主题</p>
      </div>

      {/* Theme */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">主题模式</CardTitle>
          <CardDescription>选择您喜欢的主题模式</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-3 gap-4">
            {THEME_OPTIONS.map(option => {
              const Icon = option.icon
              const isActive = theme === option.value
              return (
                <button
                  key={option.value}
                  onClick={() => setTheme(option.value)}
                  className={cn(
                    'relative flex flex-col items-center gap-2 p-4 rounded-lg border-2 transition-all',
                    isActive
                      ? 'border-primary bg-primary/5'
                      : 'border-muted hover:border-primary/50'
                  )}
                >
                  {isActive && (
                    <div className="absolute top-2 right-2">
                      <Check className="h-4 w-4 text-primary" />
                    </div>
                  )}
                  <Icon className={cn('h-6 w-6', isActive ? 'text-primary' : 'text-muted-foreground')} />
                  <span className={cn('text-sm font-medium', isActive && 'text-primary')}>
                    {option.label}
                  </span>
                </button>
              )
            })}
          </div>
        </CardContent>
      </Card>

      {/* Accent Color */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">强调色</CardTitle>
          <CardDescription>选择界面的主题色调</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap gap-3">
            {ACCENT_COLORS.map(color => {
              const isActive = accentColor === color.value
              return (
                <button
                  key={color.value}
                  onClick={() => setAccentColor(color.value)}
                  className={cn(
                    'relative w-10 h-10 rounded-full transition-transform',
                    color.class,
                    isActive && 'ring-2 ring-offset-2 ring-offset-background ring-primary scale-110'
                  )}
                  title={color.label}
                >
                  {isActive && (
                    <Check className="h-5 w-5 text-white absolute inset-0 m-auto" />
                  )}
                </button>
              )
            })}
          </div>
          <p className="text-sm text-muted-foreground mt-3">
            强调色功能即将上线
          </p>
        </CardContent>
      </Card>

      {/* Preview */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">预览</CardTitle>
          <CardDescription>查看当前主题效果</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="p-4 rounded-lg border bg-card space-y-3">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-full bg-primary" />
              <div className="flex-1">
                <div className="h-3 w-24 rounded bg-foreground/80" />
                <div className="h-2 w-16 rounded bg-muted-foreground/50 mt-1" />
              </div>
            </div>
            <div className="h-20 rounded bg-muted flex items-center justify-center text-muted-foreground">
              内容区域
            </div>
            <div className="flex gap-2">
              <Button size="sm">主要按钮</Button>
              <Button size="sm" variant="secondary">次要按钮</Button>
              <Button size="sm" variant="outline">边框按钮</Button>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
