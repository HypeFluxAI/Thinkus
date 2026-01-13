'use client'

import { cn } from '@/lib/utils'

interface SkipLinkProps {
  href?: string
  className?: string
  children?: React.ReactNode
}

export function SkipLink({
  href = '#main-content',
  className,
  children = '跳转到主要内容',
}: SkipLinkProps) {
  return (
    <a
      href={href}
      className={cn(
        // Visually hidden by default
        'sr-only',
        // Visible when focused
        'focus:not-sr-only focus:absolute focus:top-4 focus:left-4 focus:z-[100]',
        'focus:px-4 focus:py-2 focus:rounded-md',
        'focus:bg-primary focus:text-primary-foreground',
        'focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2',
        'focus:shadow-lg',
        'transition-all duration-200',
        className
      )}
    >
      {children}
    </a>
  )
}
