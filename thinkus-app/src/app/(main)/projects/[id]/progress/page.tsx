'use client'

import { use, useEffect, useState, useRef } from 'react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Progress } from '@/components/ui/progress'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { cn } from '@/lib/utils'
import {
  Wifi,
  WifiOff,
  Play,
  Download,
  FileCode,
  CheckCircle,
  Circle,
  Loader2,
  AlertCircle,
  ChevronRight,
  Terminal,
  Bot,
} from 'lucide-react'
import { useDevelopmentEvents, type AgentStatus, type LogEntry } from '@/hooks/use-development-events'

// Claude Code Agent 配置
const CLAUDE_CODE_AGENT = {
  id: 'claude-code',
  name: 'Claude Code',
  role: 'AI 开发助手',
  initials: 'CC',
  color: 'bg-orange-500',
}

export default function ProgressPage({ params }: { params: Promise<{ id: string }> }) {
  const { id: projectId } = use(params)
  const [hasStarted, setHasStarted] = useState(false)
  const [isStarting, setIsStarting] = useState(false)
  const [showTerminal, setShowTerminal] = useState(true)
  const codeScrollRef = useRef<HTMLDivElement>(null)
  const logScrollRef = useRef<HTMLDivElement>(null)

  // 使用 SSE Hook
  const {
    isConnected,
    connectionError,
    progress,
    phase,
    progressMessage,
    subTasks,
    agents,
    currentFile,
    codeContent,
    completedFiles,
    logs,
    reconnect,
  } = useDevelopmentEvents(projectId)

  // 自动启动开发
  useEffect(() => {
    if (!hasStarted && isConnected) {
      startDevelopment()
    }
  }, [isConnected, hasStarted])

  // 自动滚动代码区域
  useEffect(() => {
    if (codeScrollRef.current) {
      codeScrollRef.current.scrollTop = codeScrollRef.current.scrollHeight
    }
  }, [codeContent])

  // 自动滚动日志区域
  useEffect(() => {
    if (logScrollRef.current) {
      logScrollRef.current.scrollTop = logScrollRef.current.scrollHeight
    }
  }, [logs])

  // 启动开发
  const startDevelopment = async () => {
    if (isStarting || hasStarted) return
    setIsStarting(true)

    try {
      const res = await fetch(`/api/projects/${projectId}/start-development`, {
        method: 'POST',
      })

      if (res.ok) {
        setHasStarted(true)
      }
    } catch (error) {
      console.error('Failed to start development:', error)
    } finally {
      setIsStarting(false)
    }
  }

  // 获取 Claude Code agent 状态
  const claudeCodeStatus = agents.find(a => a.agentId === 'claude-code')

  return (
    <div className="h-screen flex flex-col bg-background">
      {/* 顶部状态栏 */}
      <header className="border-b px-4 py-3 flex items-center justify-between shrink-0">
        <div className="flex items-center gap-4">
          <h1 className="font-semibold">AI 开发直播</h1>
          <Badge
            variant={isConnected ? 'default' : 'destructive'}
            className="gap-1"
          >
            {isConnected ? (
              <>
                <Wifi className="h-3 w-3" />
                已连接
              </>
            ) : (
              <>
                <WifiOff className="h-3 w-3" />
                断开连接
              </>
            )}
          </Badge>
          {connectionError && (
            <span className="text-xs text-muted-foreground">{connectionError}</span>
          )}
        </div>

        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2">
            <span className="text-sm text-muted-foreground">进度:</span>
            <span className="font-semibold">{progress}%</span>
            <Progress value={progress} className="w-24 h-2" />
          </div>

          {progress === 100 && (
            <Button size="sm" variant="outline" className="gap-2">
              <Download className="h-4 w-4" />
              下载代码
            </Button>
          )}

          {!isConnected && (
            <Button size="sm" variant="outline" onClick={reconnect}>
              重新连接
            </Button>
          )}
        </div>
      </header>

      {/* 主内容区 - 三栏布局 */}
      <div className="flex-1 grid grid-cols-[220px_1fr_280px] overflow-hidden">
        {/* 左侧: Claude Code 状态 */}
        <aside className="border-r p-4 overflow-auto">
          <h2 className="font-medium text-sm mb-4 text-muted-foreground">AI 开发者</h2>

          {/* Claude Code Agent */}
          <div
            className={cn(
              'flex items-center gap-3 p-3 rounded-lg transition-colors',
              claudeCodeStatus?.status === 'working' || claudeCodeStatus?.status === 'thinking'
                ? 'bg-primary/5 border border-primary/20'
                : 'bg-muted/50'
            )}
          >
            <div className="relative">
              <Avatar className="w-10 h-10">
                <AvatarFallback className={cn(CLAUDE_CODE_AGENT.color, 'text-white font-medium')}>
                  <Bot className="h-5 w-5" />
                </AvatarFallback>
              </Avatar>
              <span
                className={cn(
                  'absolute -bottom-0.5 -right-0.5 w-3.5 h-3.5 rounded-full border-2 border-background',
                  claudeCodeStatus?.status === 'working' ? 'bg-green-500' :
                  claudeCodeStatus?.status === 'thinking' ? 'bg-yellow-500' :
                  claudeCodeStatus?.status === 'waiting' ? 'bg-blue-500' :
                  'bg-gray-400'
                )}
              />
            </div>
            <div className="flex-1 min-w-0">
              <div className="font-medium text-sm">{CLAUDE_CODE_AGENT.name}</div>
              <div className="text-xs text-muted-foreground">{CLAUDE_CODE_AGENT.role}</div>
              {claudeCodeStatus?.task && (
                <div className="text-xs text-primary mt-1 truncate">
                  {claudeCodeStatus.task}
                </div>
              )}
            </div>
            {claudeCodeStatus?.status === 'working' && (
              <Loader2 className="h-4 w-4 animate-spin text-primary shrink-0" />
            )}
          </div>

          {/* 已完成文件列表 */}
          {completedFiles.length > 0 && (
            <div className="mt-6">
              <h2 className="font-medium text-sm mb-3 text-muted-foreground">
                已生成文件 ({completedFiles.length})
              </h2>
              <div className="space-y-1">
                {completedFiles.map(file => (
                  <div
                    key={file}
                    className="flex items-center gap-2 text-xs p-2 rounded hover:bg-muted/50 cursor-pointer"
                  >
                    <CheckCircle className="h-3.5 w-3.5 text-green-500 shrink-0" />
                    <span className="truncate">{file}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </aside>

        {/* 中间: 代码编辑器 */}
        <main className="flex flex-col overflow-hidden">
          {/* 文件标签栏 */}
          <div className="border-b px-4 py-2 flex items-center justify-between bg-muted/30 shrink-0">
            <div className="flex items-center gap-2">
              <FileCode className="h-4 w-4 text-muted-foreground" />
              <span className="text-sm font-mono">
                {currentFile || '等待开始...'}
              </span>
              {currentFile && progress < 100 && (
                <Loader2 className="h-3 w-3 animate-spin text-primary ml-2" />
              )}
            </div>
            <Button
              size="sm"
              variant="ghost"
              className="gap-1 h-7"
              onClick={() => setShowTerminal(!showTerminal)}
            >
              <Terminal className="h-3.5 w-3.5" />
              {showTerminal ? '隐藏终端' : '显示终端'}
            </Button>
          </div>

          {/* 代码内容区 */}
          <div
            ref={codeScrollRef}
            className={cn(
              'overflow-auto bg-zinc-950 dark:bg-zinc-900',
              showTerminal ? 'flex-1' : 'flex-1'
            )}
          >
            {codeContent ? (
              <pre className="p-4 text-sm font-mono text-green-400 whitespace-pre-wrap">
                <code>{codeContent}</code>
                {progress < 100 && (
                  <span className="inline-block w-2 h-4 bg-green-400 animate-pulse ml-0.5" />
                )}
              </pre>
            ) : (
              <div className="h-full flex items-center justify-center text-muted-foreground">
                <div className="text-center">
                  {isStarting ? (
                    <>
                      <Loader2 className="h-8 w-8 animate-spin mx-auto mb-3" />
                      <p>正在启动开发...</p>
                    </>
                  ) : !hasStarted ? (
                    <>
                      <Play className="h-8 w-8 mx-auto mb-3" />
                      <p>等待连接...</p>
                    </>
                  ) : (
                    <>
                      <Loader2 className="h-8 w-8 animate-spin mx-auto mb-3" />
                      <p>准备生成代码...</p>
                    </>
                  )}
                </div>
              </div>
            )}
          </div>
        </main>

        {/* 右侧: 任务列表和日志 */}
        <aside className="border-l flex flex-col overflow-hidden">
          {/* 任务列表 */}
          <div className="p-4 border-b shrink-0">
            <h2 className="font-medium text-sm mb-3 text-muted-foreground">
              开发任务
            </h2>
            <div className="space-y-2 max-h-48 overflow-auto">
              {subTasks && subTasks.length > 0 ? (
                subTasks.map((task, index) => (
                  <div
                    key={index}
                    className="flex items-center gap-2 text-xs"
                  >
                    {task.status === 'done' ? (
                      <CheckCircle className="h-3.5 w-3.5 text-green-500 shrink-0" />
                    ) : task.status === 'running' ? (
                      <Loader2 className="h-3.5 w-3.5 animate-spin text-primary shrink-0" />
                    ) : task.status === 'error' ? (
                      <AlertCircle className="h-3.5 w-3.5 text-red-500 shrink-0" />
                    ) : (
                      <Circle className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                    )}
                    <span className={cn(
                      'truncate',
                      task.status === 'done' && 'text-muted-foreground',
                      task.status === 'running' && 'text-primary font-medium'
                    )}>
                      {task.name}
                    </span>
                  </div>
                ))
              ) : (
                <p className="text-xs text-muted-foreground">Claude Code 自主规划中...</p>
              )}
            </div>
          </div>

          {/* 工作日志 / 终端输出 */}
          <div className="flex-1 flex flex-col overflow-hidden">
            <div className="px-4 py-2 border-b shrink-0 flex items-center gap-2">
              <Terminal className="h-3.5 w-3.5 text-muted-foreground" />
              <h2 className="font-medium text-sm text-muted-foreground">终端输出</h2>
            </div>
            <ScrollArea className="flex-1">
              <div ref={logScrollRef} className="p-4 space-y-1 font-mono text-xs">
                {logs.length > 0 ? (
                  logs.map((log, index) => (
                    <LogItem key={index} log={log} />
                  ))
                ) : (
                  <p className="text-muted-foreground">等待输出...</p>
                )}
              </div>
            </ScrollArea>
          </div>
        </aside>
      </div>

      {/* 底部状态栏 */}
      <footer className="border-t px-4 py-2 flex items-center justify-between text-xs text-muted-foreground shrink-0">
        <div className="flex items-center gap-4">
          <span>{phase}</span>
          {progressMessage && (
            <>
              <ChevronRight className="h-3 w-3" />
              <span>{progressMessage}</span>
            </>
          )}
        </div>
        <div>
          {progress === 100 ? '开发完成' : `进度 ${progress}%`}
        </div>
      </footer>
    </div>
  )
}

// 日志条目组件
function LogItem({ log }: { log: LogEntry }) {
  const typeColors = {
    info: 'text-muted-foreground',
    success: 'text-green-600 dark:text-green-400',
    warning: 'text-yellow-600 dark:text-yellow-400',
    error: 'text-red-600 dark:text-red-400',
  }

  return (
    <div className={cn('whitespace-pre-wrap break-all', typeColors[log.type])}>
      <span className="text-muted-foreground/70">[{log.timestamp}]</span>
      {log.agentName && (
        <span className="text-orange-500 ml-1">{log.agentName}:</span>
      )}
      <span className="ml-1">{log.message}</span>
    </div>
  )
}
