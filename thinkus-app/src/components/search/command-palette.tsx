'use client'

import { useState, useEffect, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import {
  Command,
  CommandDialog,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
  CommandSeparator,
  CommandShortcut,
} from '@/components/ui/command'
import { Badge } from '@/components/ui/badge'
import {
  Folder,
  MessageSquare,
  Target,
  Users,
  Settings,
  Plus,
  HelpCircle,
  BarChart3,
  Zap,
  Calendar,
  Sparkles,
  Search,
  CheckSquare,
  Brain,
  Lightbulb,
} from 'lucide-react'

interface SearchResult {
  id: string
  type: 'project' | 'discussion' | 'decision' | 'action'
  title: string
  description?: string
  href: string
  icon?: React.ReactNode
}

interface CommandPaletteProps {
  open?: boolean
  onOpenChange?: (open: boolean) => void
}

// 检测操作系统
const isMac = typeof window !== 'undefined' && navigator.platform.toUpperCase().indexOf('MAC') >= 0

// 快速操作
const QUICK_ACTIONS = [
  {
    id: 'new-project',
    title: '创建新项目',
    description: '开始一个新的 AI 驱动项目',
    href: '/create',
    icon: <Plus className="h-4 w-4" />,
    shortcut: 'G N',
  },
  {
    id: 'dashboard',
    title: '仪表盘',
    description: '返回仪表盘首页',
    href: '/dashboard',
    icon: <Sparkles className="h-4 w-4" />,
    shortcut: 'G H',
  },
  {
    id: 'projects',
    title: '项目列表',
    description: '查看所有项目',
    href: '/projects',
    icon: <Folder className="h-4 w-4" />,
    shortcut: 'G P',
  },
  {
    id: 'executives',
    title: 'AI 团队',
    description: '查看专属高管团队',
    href: '/executives',
    icon: <Users className="h-4 w-4" />,
    shortcut: 'G T',
  },
  {
    id: 'ceo',
    title: 'CEO 工作台',
    description: '决策确认和全局视图',
    href: '/ceo',
    icon: <Target className="h-4 w-4" />,
    shortcut: 'G C',
  },
  {
    id: 'experts',
    title: '专家咨询',
    description: '咨询行业专家',
    href: '/experts',
    icon: <MessageSquare className="h-4 w-4" />,
  },
  {
    id: 'memories',
    title: 'AI 记忆',
    description: '管理 AI 记忆系统',
    href: '/memories',
    icon: <Brain className="h-4 w-4" />,
    shortcut: 'G M',
  },
  {
    id: 'skills',
    title: '知识技能库',
    description: '浏览蒸馏知识和最佳实践',
    href: '/skills',
    icon: <Lightbulb className="h-4 w-4" />,
    shortcut: 'G K',
  },
]

const SETTINGS_ACTIONS = [
  {
    id: 'activity',
    title: '活动记录',
    description: '查看操作历史',
    href: '/activity',
    icon: <Calendar className="h-4 w-4" />,
  },
  {
    id: 'settings',
    title: '个人设置',
    description: '管理个人资料和偏好',
    href: '/settings/profile',
    icon: <Settings className="h-4 w-4" />,
    shortcut: 'G S',
  },
  {
    id: 'usage',
    title: 'AI 使用分析',
    description: '查看使用情况和成本',
    href: '/settings/usage',
    icon: <BarChart3 className="h-4 w-4" />,
  },
  {
    id: 'automation',
    title: '自动化设置',
    description: '配置自动执行规则',
    href: '/settings/automation',
    icon: <Zap className="h-4 w-4" />,
  },
  {
    id: 'help',
    title: '帮助中心',
    description: '常见问题和帮助文档',
    href: '/help',
    icon: <HelpCircle className="h-4 w-4" />,
    shortcut: 'G ?',
  },
]

export function CommandPalette({ open: controlledOpen, onOpenChange }: CommandPaletteProps) {
  const router = useRouter()
  const [internalOpen, setInternalOpen] = useState(false)
  const [query, setQuery] = useState('')
  const [searchResults, setSearchResults] = useState<SearchResult[]>([])
  const [loading, setLoading] = useState(false)

  // 使用受控或非受控模式
  const isControlled = controlledOpen !== undefined
  const open = isControlled ? controlledOpen : internalOpen
  const setOpen = isControlled ? onOpenChange || (() => {}) : setInternalOpen

  // 监听快捷键
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Cmd/Ctrl + K 打开搜索
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault()
        setOpen(!open)
      }
    }

    document.addEventListener('keydown', handleKeyDown)
    return () => document.removeEventListener('keydown', handleKeyDown)
  }, [open, setOpen])

  // 搜索项目等
  const handleSearch = useCallback(async (searchQuery: string) => {
    if (!searchQuery.trim() || searchQuery.length < 2) {
      setSearchResults([])
      return
    }

    setLoading(true)
    try {
      const response = await fetch(`/api/search?q=${encodeURIComponent(searchQuery)}&limit=10`)
      if (response.ok) {
        const data = await response.json()
        const results: SearchResult[] = (data.results || []).map((item: {
          id: string
          type: 'project' | 'discussion' | 'decision' | 'action'
          title: string
          description?: string
          href: string
          projectName?: string
        }) => ({
          id: item.id,
          type: item.type,
          title: item.title,
          description: item.description,
          href: item.href,
          icon: item.type === 'project' ? <Folder className="h-4 w-4" /> :
                item.type === 'discussion' ? <MessageSquare className="h-4 w-4" /> :
                item.type === 'decision' ? <Target className="h-4 w-4" /> :
                <CheckSquare className="h-4 w-4" />,
        }))
        setSearchResults(results)
      }
    } catch (error) {
      console.error('Search failed:', error)
      setSearchResults([])
    } finally {
      setLoading(false)
    }
  }, [])

  // 处理搜索输入
  useEffect(() => {
    const timer = setTimeout(() => {
      handleSearch(query)
    }, 300)

    return () => clearTimeout(timer)
  }, [query, handleSearch])

  // 处理选择
  const handleSelect = (href: string) => {
    setOpen(false)
    setQuery('')
    router.push(href)
  }

  // 过滤快速操作
  const filteredQuickActions = QUICK_ACTIONS.filter(
    action =>
      action.title.toLowerCase().includes(query.toLowerCase()) ||
      action.description?.toLowerCase().includes(query.toLowerCase())
  )

  const filteredSettingsActions = SETTINGS_ACTIONS.filter(
    action =>
      action.title.toLowerCase().includes(query.toLowerCase()) ||
      action.description?.toLowerCase().includes(query.toLowerCase())
  )

  return (
    <CommandDialog open={open} onOpenChange={setOpen}>
      <Command className="rounded-lg border shadow-md">
        <CommandInput
          placeholder="搜索项目、操作或输入命令..."
          value={query}
          onValueChange={setQuery}
        />
        <CommandList>
          <CommandEmpty>
            {loading ? (
              <div className="flex items-center justify-center py-6">
                <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary"></div>
              </div>
            ) : (
              <div className="text-center py-6">
                <Search className="h-10 w-10 mx-auto mb-2 text-muted-foreground" />
                <p>未找到结果</p>
                <p className="text-sm text-muted-foreground mt-1">
                  尝试搜索项目名称或使用快速操作
                </p>
              </div>
            )}
          </CommandEmpty>

          {/* 搜索结果 */}
          {searchResults.length > 0 && (
            <CommandGroup heading="搜索结果">
              {searchResults.map((result) => (
                <CommandItem
                  key={result.id}
                  value={result.title}
                  onSelect={() => handleSelect(result.href)}
                >
                  {result.icon || <Folder className="h-4 w-4 mr-2" />}
                  <div className="flex flex-col">
                    <span>{result.title}</span>
                    {result.description && (
                      <span className="text-xs text-muted-foreground">
                        {result.description}
                      </span>
                    )}
                  </div>
                  <Badge variant="secondary" className="ml-auto">
                    {result.type === 'project' && '项目'}
                    {result.type === 'discussion' && '讨论'}
                    {result.type === 'decision' && '决策'}
                    {result.type === 'action' && '行动项'}
                  </Badge>
                </CommandItem>
              ))}
            </CommandGroup>
          )}

          {/* 快速操作 */}
          {filteredQuickActions.length > 0 && (
            <CommandGroup heading="快速操作">
              {filteredQuickActions.map((action) => (
                <CommandItem
                  key={action.id}
                  value={action.title}
                  onSelect={() => handleSelect(action.href)}
                >
                  <div className="mr-2 text-muted-foreground">{action.icon}</div>
                  <div className="flex flex-col">
                    <span>{action.title}</span>
                    <span className="text-xs text-muted-foreground">
                      {action.description}
                    </span>
                  </div>
                  {action.shortcut && (
                    <CommandShortcut>{action.shortcut}</CommandShortcut>
                  )}
                </CommandItem>
              ))}
            </CommandGroup>
          )}

          {/* 设置 */}
          {filteredSettingsActions.length > 0 && (
            <>
              <CommandSeparator />
              <CommandGroup heading="设置与帮助">
                {filteredSettingsActions.map((action) => (
                  <CommandItem
                    key={action.id}
                    value={action.title}
                    onSelect={() => handleSelect(action.href)}
                  >
                    <div className="mr-2 text-muted-foreground">{action.icon}</div>
                    <div className="flex flex-col">
                      <span>{action.title}</span>
                      <span className="text-xs text-muted-foreground">
                        {action.description}
                      </span>
                    </div>
                    {action.shortcut && (
                      <CommandShortcut>{action.shortcut}</CommandShortcut>
                    )}
                  </CommandItem>
                ))}
              </CommandGroup>
            </>
          )}
        </CommandList>

        {/* 底部提示 */}
        <div className="border-t px-3 py-2 text-xs text-muted-foreground flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span>提示:</span>
            <kbd className="px-1.5 py-0.5 bg-muted rounded">↑↓</kbd>
            <span>导航</span>
            <kbd className="px-1.5 py-0.5 bg-muted rounded">↵</kbd>
            <span>选择</span>
            <kbd className="px-1.5 py-0.5 bg-muted rounded">Esc</kbd>
            <span>关闭</span>
          </div>
          <div className="flex items-center gap-1">
            <kbd className="px-1.5 py-0.5 bg-muted rounded">{isMac ? '⌘' : 'Ctrl'}</kbd>
            <span>+</span>
            <kbd className="px-1.5 py-0.5 bg-muted rounded">K</kbd>
          </div>
        </div>
      </Command>
    </CommandDialog>
  )
}

// 搜索触发按钮
export function SearchTrigger({ onClick }: { onClick?: () => void }) {
  return (
    <button
      onClick={onClick}
      className="flex items-center gap-2 px-3 py-1.5 text-sm text-muted-foreground bg-muted/50 hover:bg-muted rounded-lg border transition-colors"
    >
      <Search className="h-4 w-4" />
      <span className="hidden sm:inline">搜索...</span>
      <kbd className="hidden sm:inline-flex items-center gap-0.5 px-1.5 py-0.5 bg-background rounded text-xs">
        <span>{isMac ? '⌘' : 'Ctrl'}</span>
        <span>K</span>
      </kbd>
    </button>
  )
}
