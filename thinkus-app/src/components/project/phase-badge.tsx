'use client'

import { type ProjectPhase, PROJECT_PHASES } from '@/lib/config/project-phases'
import { cn } from '@/lib/utils'
import {
  Lightbulb,
  FileText,
  Palette,
  Code,
  Rocket,
  TrendingUp,
} from 'lucide-react'

interface PhaseBadgeProps {
  phase: ProjectPhase
  size?: 'sm' | 'md' | 'lg'
  showIcon?: boolean
  className?: string
}

const PHASE_ICONS = {
  ideation: Lightbulb,
  definition: FileText,
  design: Palette,
  development: Code,
  prelaunch: Rocket,
  growth: TrendingUp,
}

const PHASE_COLORS = {
  ideation: 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30',
  definition: 'bg-blue-500/20 text-blue-400 border-blue-500/30',
  design: 'bg-purple-500/20 text-purple-400 border-purple-500/30',
  development: 'bg-green-500/20 text-green-400 border-green-500/30',
  prelaunch: 'bg-orange-500/20 text-orange-400 border-orange-500/30',
  growth: 'bg-pink-500/20 text-pink-400 border-pink-500/30',
}

export function PhaseBadge({ phase, size = 'md', showIcon = true, className }: PhaseBadgeProps) {
  const config = PROJECT_PHASES[phase]
  const Icon = PHASE_ICONS[phase]
  const colorClass = PHASE_COLORS[phase]

  const sizeClasses = {
    sm: 'px-2 py-0.5 text-xs',
    md: 'px-3 py-1 text-sm',
    lg: 'px-4 py-1.5 text-base',
  }

  const iconSizes = {
    sm: 'w-3 h-3',
    md: 'w-4 h-4',
    lg: 'w-5 h-5',
  }

  return (
    <span
      className={cn(
        'inline-flex items-center gap-1.5 rounded-full border font-medium',
        colorClass,
        sizeClasses[size],
        className
      )}
    >
      {showIcon && <Icon className={iconSizes[size]} />}
      {config.nameCn}
    </span>
  )
}
