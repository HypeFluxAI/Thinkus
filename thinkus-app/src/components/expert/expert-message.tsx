'use client'

import { Card } from '@/components/ui/card'
import { ExpertAvatar } from './expert-avatar'
import { Expert } from '@/lib/ai/experts/config'
import { cn } from '@/lib/utils'

interface ExpertMessageProps {
  expert: Expert
  content: string
  isStreaming?: boolean
  timestamp?: Date
}

export function ExpertMessage({
  expert,
  content,
  isStreaming = false,
  timestamp,
}: ExpertMessageProps) {
  return (
    <div className="flex gap-3 animate-in fade-in slide-in-from-bottom-2 duration-300">
      <ExpertAvatar expert={expert} isSpeaking={isStreaming} />
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 mb-1">
          <span className="font-medium text-sm">{expert.name}</span>
          <span className="text-xs text-muted-foreground">{expert.title}</span>
          {timestamp && (
            <span className="text-xs text-muted-foreground ml-auto">
              {timestamp.toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit' })}
            </span>
          )}
        </div>
        <Card className={cn('p-3', expert.color.replace('bg-', 'border-l-4 border-l-'))}>
          <p className="text-sm whitespace-pre-wrap">{content}</p>
          {isStreaming && (
            <span className="inline-block w-2 h-4 bg-foreground/50 animate-pulse ml-1" />
          )}
        </Card>
      </div>
    </div>
  )
}
