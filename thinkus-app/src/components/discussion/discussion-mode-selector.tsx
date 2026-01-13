'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'
import {
  Zap,
  MessageSquare,
  Brain,
  Sparkles,
  Clock,
  Users,
  Target,
  CheckCircle2,
  ArrowRight,
  HelpCircle,
} from 'lucide-react'
import { cn } from '@/lib/utils'

export type DiscussionMode = 'quick' | 'standard' | 'deep' | 'expert'
export type DiscussionInteractionMode = 'single' | 'multi' | 'autonomous'

export interface DiscussionModeConfig {
  id: DiscussionMode
  name: string
  nameCn: string
  description: string
  icon: React.ReactNode
  duration: string
  rounds: number
  features: string[]
  recommended?: string
  color: string
}

export const DISCUSSION_MODES: Record<DiscussionMode, DiscussionModeConfig> = {
  quick: {
    id: 'quick',
    name: 'Quick',
    nameCn: '快速模式',
    description: '快速获取简洁建议，适合简单问题',
    icon: <Zap className="h-5 w-5" />,
    duration: '1-2分钟',
    rounds: 2,
    features: [
      '2轮快速讨论',
      '直接给出结论',
      '适合小型决策',
    ],
    recommended: '简单问题、快速验证',
    color: 'text-yellow-500 bg-yellow-500/10',
  },
  standard: {
    id: 'standard',
    name: 'Standard',
    nameCn: '标准模式',
    description: '平衡速度与深度的常规讨论',
    icon: <MessageSquare className="h-5 w-5" />,
    duration: '3-5分钟',
    rounds: 4,
    features: [
      '4轮深入讨论',
      '多角度分析',
      '形成共识建议',
    ],
    recommended: '常规决策、功能设计',
    color: 'text-blue-500 bg-blue-500/10',
  },
  deep: {
    id: 'deep',
    name: 'Deep',
    nameCn: '深度模式',
    description: '全面深入的分析讨论',
    icon: <Brain className="h-5 w-5" />,
    duration: '5-10分钟',
    rounds: 6,
    features: [
      '6轮深度讨论',
      '利弊分析',
      '风险评估',
      '备选方案',
    ],
    recommended: '重要决策、架构设计',
    color: 'text-purple-500 bg-purple-500/10',
  },
  expert: {
    id: 'expert',
    name: 'Expert',
    nameCn: '专家模式',
    description: '跨领域专家级深度研讨',
    icon: <Sparkles className="h-5 w-5" />,
    duration: '10-15分钟',
    rounds: 8,
    features: [
      '8轮专家级讨论',
      '跨领域协作',
      '长期影响分析',
      '详细实施方案',
      '决策追踪',
    ],
    recommended: '战略决策、复杂架构',
    color: 'text-orange-500 bg-orange-500/10',
  },
}

interface DiscussionModeSelectorProps {
  value: DiscussionMode
  onChange: (mode: DiscussionMode) => void
  compact?: boolean
  showDetails?: boolean
}

export function DiscussionModeSelector({
  value,
  onChange,
  compact = false,
  showDetails = true,
}: DiscussionModeSelectorProps) {
  const [detailsOpen, setDetailsOpen] = useState(false)
  const selectedMode = DISCUSSION_MODES[value]

  if (compact) {
    return (
      <div className="flex gap-1">
        {Object.values(DISCUSSION_MODES).map(mode => (
          <Button
            key={mode.id}
            variant={value === mode.id ? 'default' : 'outline'}
            size="sm"
            onClick={() => onChange(mode.id)}
            className={cn(
              'gap-1',
              value !== mode.id && mode.color
            )}
          >
            {mode.icon}
            <span className="hidden sm:inline">{mode.nameCn}</span>
          </Button>
        ))}
      </div>
    )
  }

  return (
    <div className="space-y-3">
      {/* Mode Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
        {Object.values(DISCUSSION_MODES).map(mode => (
          <Card
            key={mode.id}
            className={cn(
              'cursor-pointer transition-all hover:shadow-md',
              value === mode.id
                ? 'border-primary ring-1 ring-primary'
                : 'hover:border-primary/50'
            )}
            onClick={() => onChange(mode.id)}
          >
            <CardContent className="p-3">
              <div className={cn('flex items-center gap-2 mb-1', mode.color.split(' ')[0])}>
                {mode.icon}
                <span className="font-medium text-sm">{mode.nameCn}</span>
              </div>
              <p className="text-xs text-muted-foreground line-clamp-1">
                {mode.description}
              </p>
              <div className="flex items-center gap-2 mt-2 text-xs text-muted-foreground">
                <Clock className="h-3 w-3" />
                {mode.duration}
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Selected Mode Details */}
      {showDetails && (
        <div className={cn('p-3 rounded-lg border', selectedMode.color)}>
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-2">
              {selectedMode.icon}
              <span className="font-medium">{selectedMode.nameCn}</span>
              <Badge variant="outline" className="text-xs">
                {selectedMode.rounds}轮讨论
              </Badge>
            </div>
            <Dialog open={detailsOpen} onOpenChange={setDetailsOpen}>
              <DialogTrigger asChild>
                <Button variant="ghost" size="sm" className="gap-1">
                  <HelpCircle className="h-3 w-3" />
                  了解更多
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-2xl">
                <DialogHeader>
                  <DialogTitle>讨论模式详解</DialogTitle>
                  <DialogDescription>
                    选择适合您需求的讨论模式，获得最佳讨论体验
                  </DialogDescription>
                </DialogHeader>
                <div className="grid gap-4 mt-4">
                  {Object.values(DISCUSSION_MODES).map(mode => (
                    <Card
                      key={mode.id}
                      className={cn(
                        value === mode.id && 'border-primary'
                      )}
                    >
                      <CardHeader className="pb-2">
                        <div className="flex items-center justify-between">
                          <div className={cn('flex items-center gap-2', mode.color.split(' ')[0])}>
                            {mode.icon}
                            <CardTitle className="text-base">{mode.nameCn}</CardTitle>
                          </div>
                          <div className="flex items-center gap-2">
                            <Badge variant="outline">{mode.duration}</Badge>
                            <Badge variant="secondary">{mode.rounds}轮</Badge>
                          </div>
                        </div>
                        <CardDescription>{mode.description}</CardDescription>
                      </CardHeader>
                      <CardContent>
                        <div className="flex flex-wrap gap-4">
                          <div className="flex-1 min-w-[200px]">
                            <h4 className="text-sm font-medium mb-2">特性</h4>
                            <ul className="space-y-1">
                              {mode.features.map((feature, idx) => (
                                <li key={idx} className="flex items-center gap-2 text-sm text-muted-foreground">
                                  <CheckCircle2 className="h-3 w-3 text-green-500" />
                                  {feature}
                                </li>
                              ))}
                            </ul>
                          </div>
                          {mode.recommended && (
                            <div className="flex-1 min-w-[200px]">
                              <h4 className="text-sm font-medium mb-2">推荐场景</h4>
                              <p className="text-sm text-muted-foreground">{mode.recommended}</p>
                            </div>
                          )}
                        </div>
                        {value !== mode.id && (
                          <Button
                            variant="outline"
                            size="sm"
                            className="mt-3"
                            onClick={() => {
                              onChange(mode.id)
                              setDetailsOpen(false)
                            }}
                          >
                            选择此模式
                            <ArrowRight className="h-3 w-3 ml-1" />
                          </Button>
                        )}
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </DialogContent>
            </Dialog>
          </div>
          <p className="text-sm text-muted-foreground">{selectedMode.description}</p>
          <div className="flex flex-wrap gap-2 mt-2">
            {selectedMode.features.slice(0, 3).map((feature, idx) => (
              <Badge key={idx} variant="secondary" className="text-xs">
                {feature}
              </Badge>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}

// Interaction mode selector (single/multi/autonomous)
interface InteractionModeSelectorProps {
  value: DiscussionInteractionMode
  onChange: (mode: DiscussionInteractionMode) => void
}

export function InteractionModeSelector({
  value,
  onChange,
}: InteractionModeSelectorProps) {
  return (
    <div className="flex gap-2">
      <Button
        variant={value === 'autonomous' ? 'default' : 'outline'}
        size="sm"
        className="flex-1"
        onClick={() => onChange('autonomous')}
      >
        <Brain className="h-4 w-4 mr-1" />
        AI自治
      </Button>
      <Button
        variant={value === 'single' ? 'default' : 'outline'}
        size="sm"
        className="flex-1"
        onClick={() => onChange('single')}
      >
        <MessageSquare className="h-4 w-4 mr-1" />
        单人
      </Button>
      <Button
        variant={value === 'multi' ? 'default' : 'outline'}
        size="sm"
        className="flex-1"
        onClick={() => onChange('multi')}
      >
        <Users className="h-4 w-4 mr-1" />
        多人
      </Button>
    </div>
  )
}

// Combined selector
interface FullDiscussionModeSelectorProps {
  discussionMode: DiscussionMode
  interactionMode: DiscussionInteractionMode
  onDiscussionModeChange: (mode: DiscussionMode) => void
  onInteractionModeChange: (mode: DiscussionInteractionMode) => void
}

export function FullDiscussionModeSelector({
  discussionMode,
  interactionMode,
  onDiscussionModeChange,
  onInteractionModeChange,
}: FullDiscussionModeSelectorProps) {
  return (
    <div className="space-y-4">
      <div>
        <label className="text-sm font-medium mb-2 block">讨论深度</label>
        <DiscussionModeSelector
          value={discussionMode}
          onChange={onDiscussionModeChange}
        />
      </div>
      <div>
        <label className="text-sm font-medium mb-2 block">互动模式</label>
        <InteractionModeSelector
          value={interactionMode}
          onChange={onInteractionModeChange}
        />
      </div>
    </div>
  )
}
