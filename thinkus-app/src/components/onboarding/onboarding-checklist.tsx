'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Progress } from '@/components/ui/progress'
import { cn } from '@/lib/utils'
import Link from 'next/link'
import {
  CheckCircle2,
  Circle,
  FolderPlus,
  MessageSquare,
  Settings,
  Users,
  Target,
  X,
  Sparkles,
} from 'lucide-react'

interface ChecklistItem {
  id: string
  title: string
  description: string
  icon: React.ReactNode
  href: string
  action?: string
}

const CHECKLIST_ITEMS: ChecklistItem[] = [
  {
    id: 'create_project',
    title: '创建您的第一个项目',
    description: '开始一个新项目，让 AI 团队为您服务',
    icon: <FolderPlus className="h-5 w-5" />,
    href: '/create',
    action: '创建项目',
  },
  {
    id: 'start_discussion',
    title: '发起一次团队讨论',
    description: '提出一个问题，让高管团队给出建议',
    icon: <MessageSquare className="h-5 w-5" />,
    href: '/projects',
    action: '开始讨论',
  },
  {
    id: 'customize_team',
    title: '了解您的 AI 团队',
    description: '查看 18 位 AI 高管的专业领域',
    icon: <Users className="h-5 w-5" />,
    href: '/executives',
    action: '查看团队',
  },
  {
    id: 'make_decision',
    title: '查看 CEO 工作台',
    description: '了解决策确认和全局管理功能',
    icon: <Target className="h-5 w-5" />,
    href: '/ceo',
    action: '前往工作台',
  },
  {
    id: 'configure_settings',
    title: '配置个人设置',
    description: '设置通知偏好和自动化选项',
    icon: <Settings className="h-5 w-5" />,
    href: '/settings/profile',
    action: '前往设置',
  },
]

interface OnboardingChecklistProps {
  className?: string
  onDismiss?: () => void
}

export function OnboardingChecklist({ className, onDismiss }: OnboardingChecklistProps) {
  const [completedItems, setCompletedItems] = useState<string[]>([])
  const [dismissed, setDismissed] = useState(false)

  // 从 localStorage 加载完成状态
  useEffect(() => {
    const saved = localStorage.getItem('thinkus_onboarding_checklist')
    if (saved) {
      const data = JSON.parse(saved)
      setCompletedItems(data.completed || [])
      setDismissed(data.dismissed || false)
    }
  }, [])

  // 保存到 localStorage
  const saveProgress = (completed: string[], isDismissed: boolean) => {
    localStorage.setItem('thinkus_onboarding_checklist', JSON.stringify({
      completed,
      dismissed: isDismissed,
    }))
  }

  // 标记为完成
  const markComplete = (itemId: string) => {
    const newCompleted = [...completedItems, itemId]
    setCompletedItems(newCompleted)
    saveProgress(newCompleted, dismissed)
  }

  // 关闭清单
  const handleDismiss = () => {
    setDismissed(true)
    saveProgress(completedItems, true)
    onDismiss?.()
  }

  const progress = (completedItems.length / CHECKLIST_ITEMS.length) * 100
  const allCompleted = completedItems.length === CHECKLIST_ITEMS.length

  // 如果已关闭或全部完成，不显示
  if (dismissed || allCompleted) {
    return null
  }

  return (
    <Card className={cn('border-dashed', className)}>
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-2">
            <Sparkles className="h-5 w-5 text-primary" />
            <CardTitle className="text-base">入门指南</CardTitle>
          </div>
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8 -mr-2 -mt-2"
            onClick={handleDismiss}
          >
            <X className="h-4 w-4" />
          </Button>
        </div>
        <CardDescription>
          完成以下任务，快速熟悉 Thinkus 平台
        </CardDescription>
        <div className="flex items-center gap-3 mt-2">
          <Progress value={progress} className="h-2 flex-1" />
          <span className="text-sm text-muted-foreground whitespace-nowrap">
            {completedItems.length} / {CHECKLIST_ITEMS.length}
          </span>
        </div>
      </CardHeader>
      <CardContent className="space-y-2">
        {CHECKLIST_ITEMS.map((item) => {
          const isCompleted = completedItems.includes(item.id)
          return (
            <div
              key={item.id}
              className={cn(
                'flex items-center gap-3 p-3 rounded-lg transition-colors',
                isCompleted ? 'bg-muted/30' : 'bg-muted/50 hover:bg-muted'
              )}
            >
              <div
                className={cn(
                  'shrink-0',
                  isCompleted ? 'text-green-500' : 'text-muted-foreground'
                )}
              >
                {isCompleted ? (
                  <CheckCircle2 className="h-5 w-5" />
                ) : (
                  <Circle className="h-5 w-5" />
                )}
              </div>
              <div className="flex-1 min-w-0">
                <div
                  className={cn(
                    'font-medium text-sm',
                    isCompleted && 'line-through text-muted-foreground'
                  )}
                >
                  {item.title}
                </div>
                <div className="text-xs text-muted-foreground truncate">
                  {item.description}
                </div>
              </div>
              {!isCompleted && (
                <Link href={item.href} onClick={() => markComplete(item.id)}>
                  <Button variant="outline" size="sm">
                    {item.action}
                  </Button>
                </Link>
              )}
            </div>
          )
        })}
      </CardContent>
    </Card>
  )
}
