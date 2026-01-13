'use client'

import { useRef, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { ExpertAvatar } from './expert-avatar'
import { ExpertMessage } from './expert-message'
import { Expert, DiscussionPhase, DISCUSSION_PHASES } from '@/lib/ai/experts/config'
import { cn } from '@/lib/utils'
import { User } from 'lucide-react'

export interface DiscussionMessage {
  id: string
  expertId: string
  content: string
  timestamp: Date
  isStreaming?: boolean
  round?: number
  isUser?: boolean
}

interface DiscussionPanelProps {
  experts: Expert[]
  messages: DiscussionMessage[]
  currentPhase: DiscussionPhase
  speakingExpertId?: string
  className?: string
  showRound?: boolean
}

export function DiscussionPanel({
  experts,
  messages,
  currentPhase,
  speakingExpertId,
  className,
  showRound = false,
}: DiscussionPanelProps) {
  const messagesEndRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  const currentPhaseConfig = DISCUSSION_PHASES.find(p => p.id === currentPhase)
  const getExpert = (id: string) => experts.find(e => e.id === id)

  // Group messages by round if showRound is true
  const groupedMessages = showRound
    ? messages.reduce((acc, msg) => {
        const round = msg.round || 0
        if (!acc[round]) acc[round] = []
        acc[round].push(msg)
        return acc
      }, {} as Record<number, DiscussionMessage[]>)
    : null

  return (
    <Card className={cn('flex flex-col h-full', className)}>
      <CardHeader className="pb-3 border-b">
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="text-base">专家讨论</CardTitle>
            <p className="text-sm text-muted-foreground mt-1">
              {currentPhaseConfig?.name} - {currentPhaseConfig?.goal}
            </p>
          </div>
          <Badge variant="secondary">{currentPhaseConfig?.name}</Badge>
        </div>

        {/* Expert Avatars */}
        <div className="flex items-center gap-2 mt-3">
          {experts.map(expert => (
            <div
              key={expert.id}
              className="flex flex-col items-center gap-1"
              title={`${expert.name} - ${expert.title}`}
            >
              <ExpertAvatar
                expert={expert}
                size="sm"
                isActive={speakingExpertId === expert.id}
                isSpeaking={speakingExpertId === expert.id}
              />
              <span className="text-xs text-muted-foreground">{expert.name}</span>
            </div>
          ))}
        </div>
      </CardHeader>

      <CardContent className="flex-1 overflow-y-auto p-4 space-y-4">
        {messages.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-center text-muted-foreground">
            <p className="text-sm">专家们正在准备讨论...</p>
          </div>
        ) : showRound && groupedMessages ? (
          // Render messages grouped by round
          Object.entries(groupedMessages).map(([round, roundMessages]) => (
            <div key={round} className="space-y-3">
              {Number(round) > 0 && (
                <div className="flex items-center gap-2 my-2">
                  <div className="flex-1 h-px bg-border" />
                  <span className="text-xs text-muted-foreground px-2">
                    第 {round} 轮
                  </span>
                  <div className="flex-1 h-px bg-border" />
                </div>
              )}
              {roundMessages.map(message => {
                if (message.isUser || message.expertId === 'user') {
                  return (
                    <UserMessage
                      key={message.id}
                      content={message.content}
                      timestamp={message.timestamp}
                    />
                  )
                }
                const expert = getExpert(message.expertId)
                if (!expert) return null
                return (
                  <ExpertMessage
                    key={message.id}
                    expert={expert}
                    content={message.content}
                    isStreaming={message.isStreaming}
                    timestamp={message.timestamp}
                  />
                )
              })}
            </div>
          ))
        ) : (
          // Render messages without grouping
          messages.map(message => {
            if (message.isUser || message.expertId === 'user') {
              return (
                <UserMessage
                  key={message.id}
                  content={message.content}
                  timestamp={message.timestamp}
                />
              )
            }
            const expert = getExpert(message.expertId)
            if (!expert) return null
            return (
              <ExpertMessage
                key={message.id}
                expert={expert}
                content={message.content}
                isStreaming={message.isStreaming}
                timestamp={message.timestamp}
              />
            )
          })
        )}
        <div ref={messagesEndRef} />
      </CardContent>
    </Card>
  )
}

// User message component
function UserMessage({ content, timestamp }: { content: string; timestamp: Date }) {
  return (
    <div className="flex gap-3 justify-end">
      <div className="flex flex-col items-end max-w-[80%]">
        <div className="flex items-center gap-2 mb-1">
          <span className="text-xs text-muted-foreground">
            {timestamp.toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit' })}
          </span>
          <span className="text-sm font-medium">你</span>
        </div>
        <div className="bg-primary text-primary-foreground rounded-lg px-4 py-2">
          <p className="text-sm whitespace-pre-wrap">{content}</p>
        </div>
      </div>
      <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
        <User className="h-5 w-5 text-primary" />
      </div>
    </div>
  )
}
