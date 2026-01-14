'use client'

import { type ProjectPhase, PROJECT_PHASES, PHASE_ORDER } from '@/lib/config/project-phases'
import { cn } from '@/lib/utils'
import {
  Lightbulb,
  FileText,
  Palette,
  Code,
  Rocket,
  TrendingUp,
  Check,
  Clock,
} from 'lucide-react'

interface PhaseHistoryEntry {
  phase: ProjectPhase
  startedAt: Date | string
  completedAt?: Date | string
}

interface PhaseTimelineProps {
  currentPhase: ProjectPhase
  phaseHistory: PhaseHistoryEntry[]
  className?: string
  orientation?: 'horizontal' | 'vertical'
}

const PHASE_ICONS = {
  ideation: Lightbulb,
  definition: FileText,
  design: Palette,
  development: Code,
  prelaunch: Rocket,
  growth: TrendingUp,
}

export function PhaseTimeline({
  currentPhase,
  phaseHistory,
  className,
  orientation = 'horizontal',
}: PhaseTimelineProps) {
  const currentIndex = PHASE_ORDER.indexOf(currentPhase)

  // 获取阶段状态
  const getPhaseStatus = (phase: ProjectPhase): 'completed' | 'current' | 'upcoming' => {
    const index = PHASE_ORDER.indexOf(phase)
    if (index < currentIndex) return 'completed'
    if (index === currentIndex) return 'current'
    return 'upcoming'
  }

  // 获取阶段时间信息
  const getPhaseTime = (phase: ProjectPhase): PhaseHistoryEntry | undefined => {
    return phaseHistory.find(h => h.phase === phase)
  }

  // 格式化日期
  const formatDate = (date: Date | string): string => {
    const d = new Date(date)
    return d.toLocaleDateString('zh-CN', { month: 'short', day: 'numeric' })
  }

  // 计算持续时间
  const getDuration = (history: PhaseHistoryEntry): string => {
    const start = new Date(history.startedAt)
    const end = history.completedAt ? new Date(history.completedAt) : new Date()
    const days = Math.ceil((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24))
    return `${days}天`
  }

  if (orientation === 'vertical') {
    return (
      <div className={cn('space-y-4', className)}>
        {PHASE_ORDER.map((phase, index) => {
          const status = getPhaseStatus(phase)
          const config = PROJECT_PHASES[phase]
          const Icon = PHASE_ICONS[phase]
          const history = getPhaseTime(phase)

          return (
            <div key={phase} className="flex gap-4">
              {/* 时间线 */}
              <div className="flex flex-col items-center">
                <div
                  className={cn(
                    'w-10 h-10 rounded-full flex items-center justify-center border-2',
                    status === 'completed' && 'bg-green-50 border-green-500 text-green-600 dark:bg-green-500/20 dark:text-green-400',
                    status === 'current' && 'bg-blue-50 border-blue-500 text-blue-600 dark:bg-blue-500/20 dark:text-blue-400',
                    status === 'upcoming' && 'bg-gray-100 border-gray-300 text-gray-400 dark:bg-slate-700 dark:border-slate-600 dark:text-slate-500'
                  )}
                >
                  {status === 'completed' ? (
                    <Check className="w-5 h-5" />
                  ) : status === 'current' ? (
                    <Clock className="w-5 h-5 animate-pulse" />
                  ) : (
                    <Icon className="w-5 h-5" />
                  )}
                </div>
                {index < PHASE_ORDER.length - 1 && (
                  <div
                    className={cn(
                      'w-0.5 flex-1 my-2',
                      status === 'completed' ? 'bg-green-500' : 'bg-gray-200 dark:bg-slate-700'
                    )}
                  />
                )}
              </div>

              {/* 内容 */}
              <div className="flex-1 pb-4">
                <div className="flex items-center justify-between">
                  <h4
                    className={cn(
                      'font-medium',
                      status === 'completed' && 'text-green-600 dark:text-green-400',
                      status === 'current' && 'text-blue-600 dark:text-blue-400',
                      status === 'upcoming' && 'text-gray-400 dark:text-slate-500'
                    )}
                  >
                    {config.nameCn}
                  </h4>
                  {history && (
                    <span className="text-xs text-gray-400 dark:text-slate-500">
                      {formatDate(history.startedAt)}
                      {history.completedAt && ` - ${formatDate(history.completedAt)}`}
                    </span>
                  )}
                </div>
                <p className="text-sm text-gray-500 dark:text-slate-400 mt-1">{config.description}</p>
                {history && (
                  <p className="text-xs text-gray-400 dark:text-slate-500 mt-1">
                    耗时: {getDuration(history)}
                  </p>
                )}
              </div>
            </div>
          )
        })}
      </div>
    )
  }

  // 水平时间线
  return (
    <div className={cn('flex items-center', className)}>
      {PHASE_ORDER.map((phase, index) => {
        const status = getPhaseStatus(phase)
        const config = PROJECT_PHASES[phase]
        const Icon = PHASE_ICONS[phase]

        return (
          <div key={phase} className="flex items-center flex-1 last:flex-none">
            {/* 阶段节点 */}
            <div className="flex flex-col items-center">
              <div
                className={cn(
                  'w-8 h-8 rounded-full flex items-center justify-center border-2 transition-all',
                  status === 'completed' && 'bg-green-50 border-green-500 text-green-600 dark:bg-green-500/20 dark:text-green-400',
                  status === 'current' && 'bg-blue-50 border-blue-500 text-blue-600 scale-110 dark:bg-blue-500/20 dark:text-blue-400',
                  status === 'upcoming' && 'bg-gray-100 border-gray-300 text-gray-400 dark:bg-slate-800 dark:border-slate-600 dark:text-slate-500'
                )}
                title={config.nameCn}
              >
                {status === 'completed' ? (
                  <Check className="w-4 h-4" />
                ) : (
                  <Icon className="w-4 h-4" />
                )}
              </div>
              <span
                className={cn(
                  'text-xs mt-2 whitespace-nowrap',
                  status === 'current' ? 'text-blue-600 font-medium dark:text-blue-400' : 'text-gray-400 dark:text-slate-500'
                )}
              >
                {config.nameCn}
              </span>
            </div>

            {/* 连接线 */}
            {index < PHASE_ORDER.length - 1 && (
              <div
                className={cn(
                  'h-0.5 flex-1 mx-2',
                  status === 'completed' ? 'bg-green-500' : 'bg-gray-200 dark:bg-slate-700'
                )}
              />
            )}
          </div>
        )
      })}
    </div>
  )
}
