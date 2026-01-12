'use client'

import { useState } from 'react'
import { type ProjectPhase, PROJECT_PHASES, PHASE_ORDER } from '@/lib/config/project-phases'
import { cn } from '@/lib/utils'
import { Card, CardContent } from '@/components/ui/card'
import {
  Lightbulb,
  FileText,
  Palette,
  Code,
  Rocket,
  TrendingUp,
  Check,
  Users,
} from 'lucide-react'
import { EXECUTIVES, type AgentId } from '@/lib/config/executives'

interface PhaseSelectorProps {
  value: ProjectPhase
  onChange: (phase: ProjectPhase) => void
  disabled?: boolean
  showDetails?: boolean
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
  ideation: 'border-yellow-500 bg-yellow-500/10',
  definition: 'border-blue-500 bg-blue-500/10',
  design: 'border-purple-500 bg-purple-500/10',
  development: 'border-green-500 bg-green-500/10',
  prelaunch: 'border-orange-500 bg-orange-500/10',
  growth: 'border-pink-500 bg-pink-500/10',
}

export function PhaseSelector({
  value,
  onChange,
  disabled = false,
  showDetails = true,
  className,
}: PhaseSelectorProps) {
  const [hoveredPhase, setHoveredPhase] = useState<ProjectPhase | null>(null)
  const activePhase = hoveredPhase || value
  const activeConfig = PROJECT_PHASES[activePhase]

  return (
    <div className={cn('space-y-4', className)}>
      {/* 阶段选择 */}
      <div className="grid grid-cols-3 md:grid-cols-6 gap-2">
        {PHASE_ORDER.map((phase) => {
          const config = PROJECT_PHASES[phase]
          const Icon = PHASE_ICONS[phase]
          const isSelected = phase === value

          return (
            <button
              key={phase}
              type="button"
              disabled={disabled}
              onClick={() => onChange(phase)}
              onMouseEnter={() => setHoveredPhase(phase)}
              onMouseLeave={() => setHoveredPhase(null)}
              className={cn(
                'p-3 rounded-lg border-2 transition-all text-center',
                'hover:scale-105 disabled:opacity-50 disabled:cursor-not-allowed',
                isSelected
                  ? PHASE_COLORS[phase]
                  : 'border-slate-700 bg-slate-800/50 hover:border-slate-600'
              )}
            >
              <Icon
                className={cn(
                  'w-6 h-6 mx-auto mb-2',
                  isSelected ? 'text-white' : 'text-slate-400'
                )}
              />
              <span
                className={cn(
                  'text-xs font-medium',
                  isSelected ? 'text-white' : 'text-slate-400'
                )}
              >
                {config.nameCn}
              </span>
              {isSelected && (
                <Check className="w-4 h-4 mx-auto mt-1 text-green-400" />
              )}
            </button>
          )
        })}
      </div>

      {/* 阶段详情 */}
      {showDetails && (
        <Card className="bg-slate-800/50 border-slate-700">
          <CardContent className="pt-4">
            <div className="flex items-start gap-4">
              <div
                className={cn(
                  'w-12 h-12 rounded-lg flex items-center justify-center',
                  PHASE_COLORS[activePhase]
                )}
              >
                {(() => {
                  const Icon = PHASE_ICONS[activePhase]
                  return <Icon className="w-6 h-6 text-white" />
                })()}
              </div>

              <div className="flex-1">
                <h3 className="text-lg font-semibold text-white">
                  {activeConfig.name} · {activeConfig.nameCn}
                </h3>
                <p className="text-sm text-slate-400 mt-1">
                  {activeConfig.description}
                </p>

                <div className="mt-4 grid grid-cols-2 gap-4">
                  {/* 预估周期 */}
                  <div>
                    <div className="text-xs text-slate-500 mb-1">预估周期</div>
                    <div className="text-sm text-white">
                      {activeConfig.estimatedDuration}
                    </div>
                  </div>

                  {/* 核心高管 */}
                  <div>
                    <div className="text-xs text-slate-500 mb-1 flex items-center gap-1">
                      <Users className="w-3 h-3" />
                      核心团队
                    </div>
                    <div className="flex -space-x-1">
                      {activeConfig.coreAgents.slice(0, 4).map((agentId: AgentId) => {
                        const agent = EXECUTIVES[agentId]
                        return (
                          <div
                            key={agentId}
                            className="w-6 h-6 rounded-full bg-slate-700 border-2 border-slate-800 flex items-center justify-center text-xs font-medium text-white"
                            title={agent.nameCn}
                          >
                            {agent.nameCn.charAt(0)}
                          </div>
                        )
                      })}
                      {activeConfig.coreAgents.length > 4 && (
                        <div className="w-6 h-6 rounded-full bg-slate-600 border-2 border-slate-800 flex items-center justify-center text-xs text-slate-300">
                          +{activeConfig.coreAgents.length - 4}
                        </div>
                      )}
                    </div>
                  </div>
                </div>

                {/* 交付物 */}
                <div className="mt-4">
                  <div className="text-xs text-slate-500 mb-2">主要交付物</div>
                  <div className="flex flex-wrap gap-2">
                    {activeConfig.deliverables.slice(0, 4).map((item, idx) => (
                      <span
                        key={idx}
                        className="px-2 py-1 rounded-full bg-slate-700 text-xs text-slate-300"
                      >
                        {item}
                      </span>
                    ))}
                    {activeConfig.deliverables.length > 4 && (
                      <span className="px-2 py-1 rounded-full bg-slate-700 text-xs text-slate-400">
                        +{activeConfig.deliverables.length - 4}
                      </span>
                    )}
                  </div>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
