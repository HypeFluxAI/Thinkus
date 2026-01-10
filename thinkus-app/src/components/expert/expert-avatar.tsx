'use client'

import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { cn } from '@/lib/utils'
import { Expert } from '@/lib/ai/experts/config'

interface ExpertAvatarProps {
  expert: Expert
  size?: 'sm' | 'md' | 'lg'
  isActive?: boolean
  isSpeaking?: boolean
}

export function ExpertAvatar({
  expert,
  size = 'md',
  isActive = false,
  isSpeaking = false,
}: ExpertAvatarProps) {
  const sizeClasses = {
    sm: 'h-8 w-8 text-sm',
    md: 'h-10 w-10 text-base',
    lg: 'h-14 w-14 text-xl',
  }

  return (
    <div className="relative">
      <Avatar
        className={cn(
          sizeClasses[size],
          'transition-all duration-300',
          isActive && 'ring-2 ring-primary ring-offset-2',
          isSpeaking && 'animate-pulse'
        )}
      >
        <AvatarFallback className={cn(expert.color, 'text-white')}>
          {expert.avatar}
        </AvatarFallback>
      </Avatar>
      {isSpeaking && (
        <span className="absolute -bottom-1 -right-1 flex h-3 w-3">
          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-primary opacity-75" />
          <span className="relative inline-flex rounded-full h-3 w-3 bg-primary" />
        </span>
      )}
    </div>
  )
}
