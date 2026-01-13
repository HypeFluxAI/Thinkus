'use client'

import { useEffect, useState, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Badge } from '@/components/ui/badge'
import { cn } from '@/lib/utils'

interface ShortcutAction {
  keys: string[]
  description: string
  action: () => void
  category: string
}

interface KeyboardShortcutsProps {
  customShortcuts?: ShortcutAction[]
}

// 检测操作系统
const isMac = typeof window !== 'undefined' && navigator.platform.toUpperCase().indexOf('MAC') >= 0

// 修饰键显示
const getModifierKey = () => (isMac ? '⌘' : 'Ctrl')

export function KeyboardShortcuts({ customShortcuts = [] }: KeyboardShortcutsProps) {
  const router = useRouter()
  const [showHelp, setShowHelp] = useState(false)

  // 默认快捷键
  const defaultShortcuts: ShortcutAction[] = [
    {
      keys: [getModifierKey(), 'K'],
      description: '打开搜索',
      action: () => {
        // TODO: 实现全局搜索
        console.log('Open search')
      },
      category: '通用',
    },
    {
      keys: [getModifierKey(), '/'],
      description: '显示快捷键帮助',
      action: () => setShowHelp(true),
      category: '通用',
    },
    {
      keys: ['G', 'H'],
      description: '前往仪表盘',
      action: () => router.push('/dashboard'),
      category: '导航',
    },
    {
      keys: ['G', 'P'],
      description: '前往项目列表',
      action: () => router.push('/projects'),
      category: '导航',
    },
    {
      keys: ['G', 'N'],
      description: '创建新项目',
      action: () => router.push('/create'),
      category: '导航',
    },
    {
      keys: ['G', 'T'],
      description: '前往 AI 团队',
      action: () => router.push('/executives'),
      category: '导航',
    },
    {
      keys: ['G', 'C'],
      description: '前往 CEO 工作台',
      action: () => router.push('/ceo'),
      category: '导航',
    },
    {
      keys: ['G', 'S'],
      description: '前往设置',
      action: () => router.push('/settings'),
      category: '导航',
    },
    {
      keys: ['G', '?'],
      description: '前往帮助中心',
      action: () => router.push('/help'),
      category: '导航',
    },
    {
      keys: ['Esc'],
      description: '关闭对话框',
      action: () => setShowHelp(false),
      category: '通用',
    },
  ]

  const allShortcuts = [...defaultShortcuts, ...customShortcuts]

  // 按类别分组
  const shortcutsByCategory = allShortcuts.reduce((acc, shortcut) => {
    if (!acc[shortcut.category]) {
      acc[shortcut.category] = []
    }
    acc[shortcut.category].push(shortcut)
    return acc
  }, {} as Record<string, ShortcutAction[]>)

  // 处理键盘事件
  const handleKeyDown = useCallback((event: KeyboardEvent) => {
    // 忽略输入框中的按键
    if (
      event.target instanceof HTMLInputElement ||
      event.target instanceof HTMLTextAreaElement ||
      (event.target as HTMLElement).isContentEditable
    ) {
      // 但允许 Escape 键
      if (event.key !== 'Escape') {
        return
      }
    }

    const modifierPressed = isMac ? event.metaKey : event.ctrlKey
    const key = event.key.toUpperCase()

    // Cmd/Ctrl + / 显示帮助
    if (modifierPressed && event.key === '/') {
      event.preventDefault()
      setShowHelp(true)
      return
    }

    // Cmd/Ctrl + K 搜索
    if (modifierPressed && key === 'K') {
      event.preventDefault()
      // TODO: 打开搜索
      return
    }

    // Escape 关闭对话框
    if (event.key === 'Escape') {
      setShowHelp(false)
      return
    }

    // G + 键 导航
    // 使用简单的状态管理处理连续按键
    if (key === 'G' && !modifierPressed) {
      const handleSecondKey = (e: KeyboardEvent) => {
        const secondKey = e.key.toUpperCase()

        const navigationMap: Record<string, string> = {
          'H': '/dashboard',
          'P': '/projects',
          'N': '/create',
          'T': '/executives',
          'C': '/ceo',
          'S': '/settings',
          '?': '/help',
        }

        if (navigationMap[secondKey]) {
          e.preventDefault()
          router.push(navigationMap[secondKey])
        }

        document.removeEventListener('keydown', handleSecondKey)
      }

      // 监听下一个按键（500ms内）
      document.addEventListener('keydown', handleSecondKey)
      setTimeout(() => {
        document.removeEventListener('keydown', handleSecondKey)
      }, 500)
    }
  }, [router])

  useEffect(() => {
    document.addEventListener('keydown', handleKeyDown)
    return () => {
      document.removeEventListener('keydown', handleKeyDown)
    }
  }, [handleKeyDown])

  return (
    <Dialog open={showHelp} onOpenChange={setShowHelp}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>键盘快捷键</DialogTitle>
          <DialogDescription>
            使用键盘快捷键快速导航和操作
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6 py-4">
          {Object.entries(shortcutsByCategory).map(([category, shortcuts]) => (
            <div key={category}>
              <h3 className="text-sm font-medium text-muted-foreground mb-3">
                {category}
              </h3>
              <div className="space-y-2">
                {shortcuts.map((shortcut, index) => (
                  <div
                    key={index}
                    className="flex items-center justify-between py-1"
                  >
                    <span className="text-sm">{shortcut.description}</span>
                    <div className="flex items-center gap-1">
                      {shortcut.keys.map((key, keyIndex) => (
                        <span key={keyIndex} className="flex items-center gap-1">
                          <kbd className="px-2 py-1 text-xs font-medium bg-muted rounded border">
                            {key}
                          </kbd>
                          {keyIndex < shortcut.keys.length - 1 && (
                            <span className="text-muted-foreground">+</span>
                          )}
                        </span>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>

        <div className="text-xs text-muted-foreground text-center">
          按 <kbd className="px-1 py-0.5 bg-muted rounded">Esc</kbd> 关闭
        </div>
      </DialogContent>
    </Dialog>
  )
}

// 快捷键提示组件
export function ShortcutHint({ keys, className }: { keys: string[]; className?: string }) {
  return (
    <span className={cn('flex items-center gap-0.5', className)}>
      {keys.map((key, index) => (
        <span key={index} className="flex items-center">
          <kbd className="px-1.5 py-0.5 text-[10px] font-medium bg-muted rounded border">
            {key}
          </kbd>
          {index < keys.length - 1 && (
            <span className="text-muted-foreground mx-0.5">+</span>
          )}
        </span>
      ))}
    </span>
  )
}
