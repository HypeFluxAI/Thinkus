'use client'

import { useState, useRef, useEffect, useCallback } from 'react'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { Card } from '@/components/ui/card'
import { Send, Loader2, User, Search } from 'lucide-react'
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import { cn } from '@/lib/utils'

type EmployeeId =
  // 核心管理层
  | 'mike_pm' | 'david_tech' | 'elena_ux' | 'marcus_cmo' | 'sarah_cfo' | 'james_legal'
  // 技术专家组
  | 'frank_devops' | 'grace_security' | 'henry_mobile' | 'ivan_ai' | 'jack_architect' | 'kevin_qa'
  // 业务专家组
  | 'lisa_data' | 'nancy_sales' | 'oscar_bd' | 'paul_pr' | 'quinn_ops'
  // 特殊角色
  | 'librarian'

export interface EmployeeMessage {
  id: string
  role: 'user' | 'employee'
  employeeId?: EmployeeId
  content: string
  isStreaming?: boolean
  timestamp: Date
  metadata?: {
    employeeName?: string
    employeeTitle?: string
    employeeAvatar?: string
  }
}

interface AIEmployeeChatProps {
  employeeId: EmployeeId
  projectId?: string
  discussionId?: string
  initialMessages?: EmployeeMessage[]
  onMessageSent?: (message: EmployeeMessage) => void
  onMessageReceived?: (message: EmployeeMessage) => void
  placeholder?: string
  className?: string
}

// Employee info for display - 18位AI高管
const EMPLOYEE_INFO: Record<EmployeeId, { name: string; title: string; avatar: string; color: string }> = {
  // 核心管理层
  mike_pm: { name: 'Mike Chen', title: 'PM总监', avatar: '💡', color: '#3B82F6' },
  david_tech: { name: 'David Zhang', title: '技术总监', avatar: '💻', color: '#10B981' },
  elena_ux: { name: 'Elena Rodriguez', title: 'UX总监', avatar: '🎨', color: '#EC4899' },
  marcus_cmo: { name: 'Marcus Wang', title: 'CMO', avatar: '📊', color: '#F59E0B' },
  sarah_cfo: { name: 'Sarah Liu', title: 'CFO', avatar: '💰', color: '#6366F1' },
  james_legal: { name: 'James Chen', title: '法务总监', avatar: '⚖️', color: '#8B5CF6' },
  // 技术专家组
  frank_devops: { name: 'Frank Li', title: 'DevOps', avatar: '🔧', color: '#14B8A6' },
  grace_security: { name: 'Grace Wang', title: '安全专家', avatar: '🛡️', color: '#EF4444' },
  henry_mobile: { name: 'Henry Zhou', title: '移动端专家', avatar: '📱', color: '#0EA5E9' },
  ivan_ai: { name: 'Ivan Petrov', title: 'AI/ML专家', avatar: '🤖', color: '#A855F7' },
  jack_architect: { name: 'Jack Wu', title: '架构师', avatar: '🏗️', color: '#64748B' },
  kevin_qa: { name: 'Kevin Park', title: 'QA总监', avatar: '🔬', color: '#22C55E' },
  // 业务专家组
  lisa_data: { name: 'Lisa Zhang', title: '数据分析', avatar: '📈', color: '#F97316' },
  nancy_sales: { name: 'Nancy Chen', title: '销售总监', avatar: '🎯', color: '#DC2626' },
  oscar_bd: { name: 'Oscar Liu', title: 'BD总监', avatar: '💼', color: '#7C3AED' },
  paul_pr: { name: 'Paul Wang', title: 'PR总监', avatar: '📢', color: '#06B6D4' },
  quinn_ops: { name: 'Quinn Yang', title: '运营总监', avatar: '⚙️', color: '#84CC16' },
  // 特殊角色
  librarian: { name: 'Dr. Alex Reed', title: '研究员', avatar: '🔬', color: '#6366F1' },
}

export function AIEmployeeChat({
  employeeId,
  projectId,
  discussionId,
  initialMessages = [],
  onMessageSent,
  onMessageReceived,
  placeholder = '输入你的问题...',
  className,
}: AIEmployeeChatProps) {
  const [messages, setMessages] = useState<EmployeeMessage[]>(initialMessages)
  const [input, setInput] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const textareaRef = useRef<HTMLTextAreaElement>(null)

  const employeeInfo = EMPLOYEE_INFO[employeeId]

  const scrollToBottom = useCallback(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [])

  useEffect(() => {
    scrollToBottom()
  }, [messages, scrollToBottom])

  const sendMessage = async (userMessage: string) => {
    if (!userMessage.trim() || isLoading) return

    const userMessageObj: EmployeeMessage = {
      id: `msg-${Date.now()}-user`,
      role: 'user',
      content: userMessage.trim(),
      timestamp: new Date(),
    }

    setMessages(prev => [...prev, userMessageObj])
    onMessageSent?.(userMessageObj)
    setInput('')
    setIsLoading(true)

    // Create placeholder employee message
    const employeeMessageId = `msg-${Date.now()}-employee`
    const employeeMessage: EmployeeMessage = {
      id: employeeMessageId,
      role: 'employee',
      employeeId,
      content: '',
      isStreaming: true,
      timestamp: new Date(),
      metadata: {
        employeeName: employeeInfo.name,
        employeeTitle: employeeInfo.title,
        employeeAvatar: employeeInfo.avatar,
      },
    }

    setMessages(prev => [...prev, employeeMessage])

    try {
      // Build message history
      const messageHistory = [...messages, userMessageObj].map(m => ({
        role: m.role === 'user' ? 'user' : 'assistant' as const,
        content: m.content,
      }))

      const response = await fetch('/api/ai-employee-chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          employeeId,
          messages: messageHistory,
          projectId,
          discussionId,
        }),
      })

      if (!response.ok) {
        throw new Error('Failed to send message')
      }

      const reader = response.body?.getReader()
      if (!reader) throw new Error('No response body')

      const decoder = new TextDecoder()
      let accumulatedContent = ''

      while (true) {
        const { done, value } = await reader.read()
        if (done) break

        const chunk = decoder.decode(value, { stream: true })
        const lines = chunk.split('\n')

        for (const line of lines) {
          if (line.startsWith('data: ')) {
            try {
              const data = JSON.parse(line.slice(6))

              if (data.type === 'start') {
                // Update employee info if provided
                if (data.employeeName) {
                  setMessages(prev =>
                    prev.map(m =>
                      m.id === employeeMessageId
                        ? {
                            ...m,
                            metadata: {
                              employeeName: data.employeeName,
                              employeeTitle: data.employeeTitle,
                              employeeAvatar: data.employeeAvatar,
                            },
                          }
                        : m
                    )
                  )
                }
              } else if (data.type === 'delta') {
                accumulatedContent += data.content
                setMessages(prev =>
                  prev.map(m =>
                    m.id === employeeMessageId ? { ...m, content: accumulatedContent } : m
                  )
                )
              } else if (data.type === 'done') {
                setMessages(prev =>
                  prev.map(m =>
                    m.id === employeeMessageId
                      ? { ...m, content: data.content, isStreaming: false }
                      : m
                  )
                )
                onMessageReceived?.({
                  ...employeeMessage,
                  content: data.content,
                  isStreaming: false,
                })
              } else if (data.type === 'error') {
                throw new Error(data.message)
              }
            } catch {
              // JSON parse error, ignore
            }
          }
        }
      }
    } catch (error) {
      console.error('Chat error:', error)
      setMessages(prev =>
        prev.map(m =>
          m.id === employeeMessageId
            ? { ...m, content: '抱歉，发生了错误。请确保AI服务正在运行。', isStreaming: false }
            : m
        )
      )
    } finally {
      setIsLoading(false)
    }
  }

  const handleSubmit = (e?: React.FormEvent) => {
    e?.preventDefault()
    sendMessage(input)
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSubmit()
    }
  }

  return (
    <div className={cn('flex flex-col h-full', className)}>
      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {messages.length === 0 && (
          <div className="flex flex-col items-center justify-center h-full text-center text-muted-foreground">
            <p>开始与 {employeeInfo.name} 对话</p>
          </div>
        )}

        {messages.map((message) => (
          <MessageBubble key={message.id} message={message} employeeInfo={employeeInfo} />
        ))}

        <div ref={messagesEndRef} />
      </div>

      {/* Input */}
      <div className="border-t bg-background p-4">
        <form onSubmit={handleSubmit} className="flex gap-2">
          <Textarea
            ref={textareaRef}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder={placeholder}
            className="min-h-[60px] max-h-[200px] resize-none"
            disabled={isLoading}
          />
          <Button
            type="submit"
            size="icon"
            disabled={isLoading || !input.trim()}
            className="shrink-0"
          >
            {isLoading ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Send className="h-4 w-4" />
            )}
          </Button>
        </form>
        <p className="text-xs text-muted-foreground mt-2 text-center">
          按 Enter 发送，Shift + Enter 换行
        </p>
      </div>
    </div>
  )
}

// Message bubble component
function MessageBubble({
  message,
  employeeInfo
}: {
  message: EmployeeMessage
  employeeInfo: { name: string; title: string; avatar: string; color: string }
}) {
  const isUser = message.role === 'user'

  return (
    <div
      className={cn(
        'flex gap-3 animate-in fade-in slide-in-from-bottom-2 duration-300',
        isUser ? 'flex-row-reverse' : 'flex-row'
      )}
    >
      <Avatar className="h-9 w-9 shrink-0">
        <AvatarFallback
          className={cn(
            'text-base',
            isUser ? 'bg-primary text-primary-foreground' : 'text-white'
          )}
          style={{
            backgroundColor: !isUser ? employeeInfo.color : undefined,
          }}
        >
          {isUser ? (
            <User className="h-4 w-4" />
          ) : (
            employeeInfo.avatar
          )}
        </AvatarFallback>
      </Avatar>

      <div className={cn('flex-1 min-w-0', isUser && 'flex justify-end')}>
        <Card
          className={cn(
            'max-w-[85%] p-4 overflow-hidden shadow-sm',
            isUser
              ? 'bg-primary text-primary-foreground rounded-2xl rounded-tr-sm'
              : 'bg-card border rounded-2xl rounded-tl-sm'
          )}
          style={{
            borderLeftWidth: !isUser ? '3px' : undefined,
            borderLeftColor: !isUser ? employeeInfo.color : undefined,
          }}
        >
          {message.isStreaming && !message.content ? (
            <div className="flex items-center gap-3 text-sm text-muted-foreground py-2">
              <div className="flex items-center gap-2">
                <Search className="h-4 w-4 animate-pulse" />
                <span>正在搜索网络...</span>
              </div>
              <Loader2 className="h-4 w-4 animate-spin" />
            </div>
          ) : isUser ? (
            <p className="text-sm whitespace-pre-wrap">{message.content}</p>
          ) : (
            <>
              <div className="prose prose-sm dark:prose-invert max-w-none break-words [&_p]:my-2 [&_ul]:my-2 [&_ol]:my-2 [&_li]:my-1 [&_table]:text-xs [&_table]:w-full [&_table]:border-collapse [&_th]:bg-muted [&_th]:p-2 [&_th]:text-left [&_th]:border [&_th]:border-border [&_td]:p-2 [&_td]:border [&_td]:border-border [&_a]:text-blue-600 [&_a]:underline [&_a]:break-all [&_a]:font-medium [&_strong]:text-foreground">
                <ReactMarkdown
                  remarkPlugins={[remarkGfm]}
                  components={{
                    a: ({ href, children }) => (
                      <a href={href} target="_blank" rel="noopener noreferrer">
                        {children}
                      </a>
                    ),
                  }}
                >
                  {message.content}
                </ReactMarkdown>
              </div>
              {message.isStreaming && (
                <span className="inline-block w-2 h-4 bg-primary animate-pulse ml-1 mt-2" />
              )}
            </>
          )}
        </Card>
      </div>
    </div>
  )
}
