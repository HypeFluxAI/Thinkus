'use client'

import { use, useMemo } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Separator } from '@/components/ui/separator'
import {
  Home,
  Target,
  ListTodo,
  MessageSquare,
  Settings,
  BarChart3,
  FolderOpen,
  Rocket,
} from 'lucide-react'
import { cn } from '@/lib/utils'

interface ProjectLayoutProps {
  children: React.ReactNode
  params: Promise<{ id: string }>
}

const NAV_ITEMS = [
  { href: '', label: '概览', icon: Home },
  { href: '/decisions', label: '决策', icon: Target },
  { href: '/actions', label: '行动项', icon: ListTodo },
  { href: '/discuss', label: '讨论', icon: MessageSquare },
  { href: '/progress', label: '进度', icon: Rocket },
  { href: '/analytics', label: '分析', icon: BarChart3 },
  { href: '/assets', label: '资产', icon: FolderOpen },
  { href: '/settings', label: '设置', icon: Settings },
]

export default function ProjectLayout({ children, params }: ProjectLayoutProps) {
  const { id: projectId } = use(params)
  const pathname = usePathname()
  const basePath = `/projects/${projectId}`

  // Determine active nav item
  const activeItem = useMemo(() => {
    // Extract the sub-path after /projects/[id]
    const subPath = pathname.replace(basePath, '') || ''

    // Find matching nav item
    for (const item of NAV_ITEMS) {
      if (item.href === subPath) return item.href
      if (item.href && subPath.startsWith(item.href)) return item.href
    }

    return ''
  }, [pathname, basePath])

  return (
    <div className="min-h-screen bg-background">
      {/* Project Navigation Bar */}
      <nav className="border-b bg-background/80 backdrop-blur-sm sticky top-0 z-40">
        <div className="container mx-auto px-4">
          <div className="flex items-center gap-1 h-12 overflow-x-auto scrollbar-hide">
            {NAV_ITEMS.map((item) => {
              const isActive = activeItem === item.href
              const href = `${basePath}${item.href}`

              return (
                <Link key={item.href} href={href}>
                  <Button
                    variant="ghost"
                    size="sm"
                    className={cn(
                      'flex items-center gap-2 px-3 h-10 shrink-0',
                      isActive && 'bg-muted font-medium'
                    )}
                  >
                    <item.icon className={cn('h-4 w-4', isActive ? 'text-primary' : 'text-muted-foreground')} />
                    <span className={isActive ? '' : 'text-muted-foreground'}>{item.label}</span>
                  </Button>
                </Link>
              )
            })}
          </div>
        </div>
      </nav>

      {/* Page Content */}
      {children}
    </div>
  )
}
