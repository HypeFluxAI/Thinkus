'use client'

import { useState } from 'react'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { cn } from '@/lib/utils'
import {
  EXECUTIVES,
  EXECUTIVES_BY_GROUP,
  GROUP_NAMES,
  type AgentId,
  type AgentGroup,
} from '@/lib/config/executives'
import {
  Lightbulb,
  Code,
  TrendingUp,
  DollarSign,
  Target,
} from 'lucide-react'

interface ExecutiveSelectorProps {
  selectedId?: AgentId
  onSelect: (agentId: AgentId) => void
  multiSelect?: boolean
  selectedIds?: AgentId[]
  onMultiSelect?: (agentIds: AgentId[]) => void
  recommendedIds?: AgentId[]
  className?: string
}

const GROUP_ICONS: Record<AgentGroup, React.ReactNode> = {
  product_design: <Lightbulb className="h-4 w-4" />,
  technology: <Code className="h-4 w-4" />,
  growth_operations: <TrendingUp className="h-4 w-4" />,
  finance_legal: <DollarSign className="h-4 w-4" />,
  strategic_support: <Target className="h-4 w-4" />,
}

export function ExecutiveSelector({
  selectedId,
  onSelect,
  multiSelect = false,
  selectedIds = [],
  onMultiSelect,
  recommendedIds = [],
  className,
}: ExecutiveSelectorProps) {
  const [activeGroup, setActiveGroup] = useState<AgentGroup>('product_design')

  const isSelected = (agentId: AgentId) => {
    if (multiSelect) {
      return selectedIds.includes(agentId)
    }
    return selectedId === agentId
  }

  const handleSelect = (agentId: AgentId) => {
    if (multiSelect && onMultiSelect) {
      if (selectedIds.includes(agentId)) {
        onMultiSelect(selectedIds.filter(id => id !== agentId))
      } else {
        onMultiSelect([...selectedIds, agentId])
      }
    } else {
      onSelect(agentId)
    }
  }

  return (
    <div className={cn('space-y-4', className)}>
      {/* 推荐高管 */}
      {recommendedIds.length > 0 && (
        <div className="space-y-2">
          <h4 className="text-sm font-medium text-muted-foreground">推荐高管</h4>
          <div className="flex flex-wrap gap-2">
            {recommendedIds.map(id => {
              const exec = EXECUTIVES[id]
              return (
                <Button
                  key={id}
                  variant={isSelected(id) ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => handleSelect(id)}
                  className="gap-2"
                  style={{
                    borderColor: !isSelected(id) ? exec.color : undefined,
                    color: !isSelected(id) ? exec.color : undefined,
                  }}
                >
                  <span>{exec.avatar}</span>
                  <span>{exec.nameCn}</span>
                </Button>
              )
            })}
          </div>
        </div>
      )}

      {/* 分组选择器 */}
      <Tabs value={activeGroup} onValueChange={(v) => setActiveGroup(v as AgentGroup)}>
        <TabsList className="grid w-full grid-cols-5">
          {Object.entries(GROUP_NAMES).map(([group, names]) => (
            <TabsTrigger
              key={group}
              value={group}
              className="flex items-center gap-1 text-xs"
            >
              {GROUP_ICONS[group as AgentGroup]}
              <span className="hidden sm:inline">{names.cn}</span>
            </TabsTrigger>
          ))}
        </TabsList>

        {Object.entries(EXECUTIVES_BY_GROUP).map(([group, agentIds]) => (
          <TabsContent key={group} value={group} className="mt-4">
            <ScrollArea className="h-[300px]">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3 pr-4">
                {agentIds.map(id => {
                  const exec = EXECUTIVES[id]
                  const selected = isSelected(id)
                  const recommended = recommendedIds.includes(id)

                  return (
                    <Card
                      key={id}
                      className={cn(
                        'cursor-pointer transition-all hover:shadow-md',
                        selected && 'ring-2 ring-primary',
                        recommended && !selected && 'ring-1 ring-amber-400'
                      )}
                      onClick={() => handleSelect(id)}
                    >
                      <CardContent className="p-4">
                        <div className="flex items-start gap-3">
                          <div
                            className="flex items-center justify-center w-10 h-10 rounded-full text-lg"
                            style={{ backgroundColor: `${exec.color}20` }}
                          >
                            {exec.avatar}
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2">
                              <h4 className="font-medium truncate">{exec.nameCn}</h4>
                              {recommended && (
                                <Badge variant="outline" className="text-amber-600 border-amber-400">
                                  推荐
                                </Badge>
                              )}
                            </div>
                            <p className="text-xs text-muted-foreground truncate">
                              {exec.titleCn}
                            </p>
                            <div className="flex flex-wrap gap-1 mt-2">
                              {exec.expertise.slice(0, 3).map(skill => (
                                <Badge
                                  key={skill}
                                  variant="secondary"
                                  className="text-xs"
                                >
                                  {skill}
                                </Badge>
                              ))}
                            </div>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  )
                })}
              </div>
            </ScrollArea>
          </TabsContent>
        ))}
      </Tabs>

      {/* 已选择列表（多选模式） */}
      {multiSelect && selectedIds.length > 0 && (
        <div className="space-y-2">
          <h4 className="text-sm font-medium">
            已选择 ({selectedIds.length})
          </h4>
          <div className="flex flex-wrap gap-2">
            {selectedIds.map(id => {
              const exec = EXECUTIVES[id]
              return (
                <Badge
                  key={id}
                  variant="default"
                  className="gap-1 cursor-pointer hover:bg-destructive"
                  onClick={() => handleSelect(id)}
                >
                  <span>{exec.avatar}</span>
                  <span>{exec.nameCn}</span>
                  <span className="ml-1">×</span>
                </Badge>
              )
            })}
          </div>
        </div>
      )}
    </div>
  )
}

// 紧凑版选择器（用于小空间）
export function ExecutiveSelectorCompact({
  selectedId,
  onSelect,
  className,
}: Pick<ExecutiveSelectorProps, 'selectedId' | 'onSelect' | 'className'>) {
  return (
    <ScrollArea className={cn('w-full', className)}>
      <div className="flex gap-2 pb-2">
        {Object.values(EXECUTIVES).map(exec => {
          const selected = selectedId === exec.id
          return (
            <Button
              key={exec.id}
              variant={selected ? 'default' : 'ghost'}
              size="sm"
              onClick={() => onSelect(exec.id)}
              className={cn(
                'shrink-0 gap-2',
                !selected && 'hover:bg-muted'
              )}
              style={{
                borderColor: selected ? exec.color : undefined,
                backgroundColor: selected ? exec.color : undefined,
              }}
            >
              <span>{exec.avatar}</span>
              <span>{exec.nameCn}</span>
            </Button>
          )
        })}
      </div>
    </ScrollArea>
  )
}
