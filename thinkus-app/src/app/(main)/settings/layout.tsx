'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'
import { ArrowLeft, User, Key, Bell, Palette } from 'lucide-react'

const SETTINGS_NAV = [
  { href: '/settings/profile', label: '个人资料', icon: User },
  { href: '/settings/credentials', label: 'API 密钥', icon: Key },
  { href: '/settings/notifications', label: '通知设置', icon: Bell },
  { href: '/settings/appearance', label: '外观设置', icon: Palette },
]

export default function SettingsLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const pathname = usePathname()

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b sticky top-0 z-50 bg-background/80 backdrop-blur-sm">
        <div className="container mx-auto px-4 h-14 flex items-center">
          <Link href="/dashboard">
            <Button variant="ghost" size="icon">
              <ArrowLeft className="h-4 w-4" />
            </Button>
          </Link>
          <span className="font-semibold ml-4">设置</span>
        </div>
      </header>

      <div className="container mx-auto px-4 py-6">
        <div className="flex flex-col md:flex-row gap-6">
          {/* Sidebar */}
          <nav className="w-full md:w-64 shrink-0">
            <div className="space-y-1">
              {SETTINGS_NAV.map(item => {
                const Icon = item.icon
                const isActive = pathname === item.href
                return (
                  <Link key={item.href} href={item.href}>
                    <Button
                      variant={isActive ? 'secondary' : 'ghost'}
                      className={cn('w-full justify-start', isActive && 'bg-muted')}
                    >
                      <Icon className="h-4 w-4 mr-2" />
                      {item.label}
                    </Button>
                  </Link>
                )
              })}
            </div>
          </nav>

          {/* Content */}
          <main className="flex-1 min-w-0">{children}</main>
        </div>
      </div>
    </div>
  )
}
