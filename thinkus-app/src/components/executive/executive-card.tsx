'use client'

import { useState } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'
import { MessageSquare, Info, Sparkles } from 'lucide-react'
import { EXECUTIVES, type AgentId, GROUP_NAMES } from '@/lib/config/executives'

interface ExecutiveCardProps {
  agentId: AgentId
  showDetails?: boolean
  onChat?: (agentId: AgentId) => void
  className?: string
}

export function ExecutiveCard({ agentId, showDetails = false, onChat, className }: ExecutiveCardProps) {
  const [isOpen, setIsOpen] = useState(false)
  const exec = EXECUTIVES[agentId]

  if (!exec) return null

  return (
    <>
      <Card
        className={`hover:border-primary/50 hover:shadow-md transition-all cursor-pointer ${className}`}
        onClick={() => showDetails && setIsOpen(true)}
      >
        <CardContent className="p-4">
          <div className="flex items-start gap-3">
            <Avatar className="h-12 w-12">
              <AvatarFallback
                style={{ backgroundColor: exec.color }}
                className="text-white text-lg"
              >
                {exec.avatar}
              </AvatarFallback>
            </Avatar>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2">
                <h3 className="font-semibold truncate">{exec.nameCn}</h3>
                <Badge variant="outline" className="text-xs shrink-0">
                  {GROUP_NAMES[exec.group].cn}
                </Badge>
              </div>
              <p className="text-sm text-muted-foreground">{exec.titleCn}</p>
              {showDetails && (
                <p className="text-xs text-muted-foreground mt-2 line-clamp-2">
                  {exec.background}
                </p>
              )}
            </div>
          </div>

          {/* Expertise Tags */}
          {showDetails && (
            <div className="flex flex-wrap gap-1 mt-3">
              {exec.expertise.slice(0, 4).map((skill, index) => (
                <Badge key={index} variant="secondary" className="text-xs">
                  {skill}
                </Badge>
              ))}
              {exec.expertise.length > 4 && (
                <Badge variant="secondary" className="text-xs">
                  +{exec.expertise.length - 4}
                </Badge>
              )}
            </div>
          )}

          {/* Actions */}
          {onChat && (
            <div className="flex gap-2 mt-3">
              <Button
                size="sm"
                variant="outline"
                className="flex-1"
                onClick={(e) => {
                  e.stopPropagation()
                  setIsOpen(true)
                }}
              >
                <Info className="h-3 w-3 mr-1" />
                详情
              </Button>
              <Button
                size="sm"
                className="flex-1"
                onClick={(e) => {
                  e.stopPropagation()
                  onChat(agentId)
                }}
              >
                <MessageSquare className="h-3 w-3 mr-1" />
                对话
              </Button>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Detail Dialog */}
      <Dialog open={isOpen} onOpenChange={setIsOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <div className="flex items-center gap-3">
              <Avatar className="h-14 w-14">
                <AvatarFallback
                  style={{ backgroundColor: exec.color }}
                  className="text-white text-xl"
                >
                  {exec.avatar}
                </AvatarFallback>
              </Avatar>
              <div>
                <DialogTitle className="flex items-center gap-2">
                  {exec.nameCn}
                  <span className="text-sm font-normal text-muted-foreground">
                    {exec.name}
                  </span>
                </DialogTitle>
                <DialogDescription>{exec.titleCn}</DialogDescription>
              </div>
            </div>
          </DialogHeader>

          <div className="space-y-4">
            {/* Background */}
            <div>
              <h4 className="text-sm font-medium mb-1">背景</h4>
              <p className="text-sm text-muted-foreground">{exec.background}</p>
            </div>

            {/* Personality */}
            <div>
              <h4 className="text-sm font-medium mb-1">性格特点</h4>
              <p className="text-sm text-muted-foreground">{exec.personality}</p>
            </div>

            {/* Expertise */}
            <div>
              <h4 className="text-sm font-medium mb-2">专业技能</h4>
              <div className="flex flex-wrap gap-1">
                {exec.expertise.map((skill, index) => (
                  <Badge key={index} variant="secondary" className="text-xs">
                    {skill}
                  </Badge>
                ))}
              </div>
            </div>

            {/* Actions */}
            {onChat && (
              <Button
                className="w-full"
                onClick={() => {
                  setIsOpen(false)
                  onChat(agentId)
                }}
              >
                <MessageSquare className="h-4 w-4 mr-2" />
                开始对话
              </Button>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </>
  )
}

/**
 * Executive Team Grid - 显示高管团队网格
 */
interface ExecutiveTeamGridProps {
  agentIds?: AgentId[]
  showDetails?: boolean
  onChat?: (agentId: AgentId) => void
  columns?: 2 | 3 | 4
}

export function ExecutiveTeamGrid({
  agentIds,
  showDetails = false,
  onChat,
  columns = 3,
}: ExecutiveTeamGridProps) {
  const ids = agentIds || (Object.keys(EXECUTIVES) as AgentId[])

  const gridCols = {
    2: 'grid-cols-1 sm:grid-cols-2',
    3: 'grid-cols-1 sm:grid-cols-2 lg:grid-cols-3',
    4: 'grid-cols-1 sm:grid-cols-2 lg:grid-cols-4',
  }

  return (
    <div className={`grid ${gridCols[columns]} gap-4`}>
      {ids.map((agentId) => (
        <ExecutiveCard
          key={agentId}
          agentId={agentId}
          showDetails={showDetails}
          onChat={onChat}
        />
      ))}
    </div>
  )
}

/**
 * Executive Avatar Stack - 显示高管头像堆叠
 */
interface ExecutiveAvatarStackProps {
  agentIds: AgentId[]
  maxDisplay?: number
  size?: 'sm' | 'md' | 'lg'
}

export function ExecutiveAvatarStack({
  agentIds,
  maxDisplay = 4,
  size = 'md',
}: ExecutiveAvatarStackProps) {
  const sizeClasses = {
    sm: 'h-6 w-6 text-xs',
    md: 'h-8 w-8 text-sm',
    lg: 'h-10 w-10 text-base',
  }

  const displayIds = agentIds.slice(0, maxDisplay)
  const remaining = agentIds.length - maxDisplay

  return (
    <div className="flex -space-x-2">
      {displayIds.map((agentId) => {
        const exec = EXECUTIVES[agentId]
        if (!exec) return null
        return (
          <Avatar
            key={agentId}
            className={`${sizeClasses[size]} border-2 border-background`}
            title={exec.nameCn}
          >
            <AvatarFallback
              style={{ backgroundColor: exec.color }}
              className="text-white"
            >
              {exec.avatar}
            </AvatarFallback>
          </Avatar>
        )
      })}
      {remaining > 0 && (
        <div
          className={`${sizeClasses[size]} rounded-full bg-muted flex items-center justify-center border-2 border-background`}
        >
          +{remaining}
        </div>
      )}
    </div>
  )
}

/**
 * Speaking Indicator - 发言中指示器
 */
interface SpeakingIndicatorProps {
  agentId: AgentId
  isSpeaking: boolean
}

export function SpeakingIndicator({ agentId, isSpeaking }: SpeakingIndicatorProps) {
  const exec = EXECUTIVES[agentId]
  if (!exec) return null

  return (
    <div className="flex items-center gap-2">
      <div className="relative">
        <Avatar className="h-8 w-8">
          <AvatarFallback
            style={{ backgroundColor: exec.color }}
            className="text-white text-sm"
          >
            {exec.avatar}
          </AvatarFallback>
        </Avatar>
        {isSpeaking && (
          <span className="absolute -bottom-0.5 -right-0.5 h-3 w-3 rounded-full bg-green-500 border-2 border-background animate-pulse" />
        )}
      </div>
      <div>
        <p className="text-sm font-medium">{exec.nameCn}</p>
        <p className="text-xs text-muted-foreground">{exec.titleCn}</p>
      </div>
      {isSpeaking && (
        <Badge variant="default" className="text-xs animate-pulse">
          <Sparkles className="h-3 w-3 mr-1" />
          发言中
        </Badge>
      )}
    </div>
  )
}
