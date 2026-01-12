'use client'

import { useState, useRef, useEffect, useCallback } from 'react'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { Card } from '@/components/ui/card'
import { Send, Loader2, User } from 'lucide-react'
import { cn } from '@/lib/utils'
import { type AgentId } from '@/lib/config/executives'

export interface ExecutiveMessage {
  id: string
  role: 'user' | 'agent'
  agentId?: AgentId
  content: string
  isStreaming?: boolean
  timestamp: Date
  metadata?: {
    agentName?: string
    agentTitle?: string
    agentColor?: string
    agentAvatar?: string
  }
}

interface ExecutiveChatProps {
  agentId: AgentId
  projectId?: string
  discussionId?: string
  context?: string
  initialMessages?: ExecutiveMessage[]
  onMessageSent?: (message: ExecutiveMessage) => void
  onMessageReceived?: (message: ExecutiveMessage) => void
  placeholder?: string
  className?: string
}

export function ExecutiveChat({
  agentId,
  projectId,
  discussionId,
  context,
  initialMessages = [],
  onMessageSent,
  onMessageReceived,
  placeholder = '输入你的问题...',
  className,
}: ExecutiveChatProps) {
  const [messages, setMessages] = useState<ExecutiveMessage[]>(initialMessages)
  const [input, setInput] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [currentAgentInfo, setCurrentAgentInfo] = useState<{
    name?: string
    title?: string
    color?: string
    avatar?: string
  }>({})
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const textareaRef = useRef<HTMLTextAreaElement>(null)

  const scrollToBottom = useCallback(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [])

  useEffect(() => {
    scrollToBottom()
  }, [messages, scrollToBottom])

  const sendMessage = async (userMessage: string) => {
    if (!userMessage.trim() || isLoading) return

    const userMessageObj: ExecutiveMessage = {
      id: `msg-${Date.now()}-user`,
      role: 'user',
      content: userMessage.trim(),
      timestamp: new Date(),
    }

    setMessages(prev => [...prev, userMessageObj])
    onMessageSent?.(userMessageObj)
    setInput('')
    setIsLoading(true)

    // 创建一个占位的agent消息
    const agentMessageId = `msg-${Date.now()}-agent`
    const agentMessage: ExecutiveMessage = {
      id: agentMessageId,
      role: 'agent',
      agentId,
      content: '',
      isStreaming: true,
      timestamp: new Date(),
      metadata: {
        agentName: currentAgentInfo.name,
        agentTitle: currentAgentInfo.title,
        agentColor: currentAgentInfo.color,
        agentAvatar: currentAgentInfo.avatar,
      },
    }

    setMessages(prev => [...prev, agentMessage])

    try {
      // 构建请求消息历史
      const messageHistory = [...messages, userMessageObj].map(m => ({
        role: m.role === 'user' ? 'user' : 'assistant' as const,
        content: m.content,
      }))

      const response = await fetch('/api/executive-chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          agentId,
          messages: messageHistory,
          projectId,
          discussionId,
          context,
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
                // 更新agent信息
                setCurrentAgentInfo({
                  name: data.agentName,
                  title: data.agentTitle,
                  color: data.agentColor,
                  avatar: data.agentAvatar,
                })
                setMessages(prev =>
                  prev.map(m =>
                    m.id === agentMessageId
                      ? {
                          ...m,
                          metadata: {
                            agentName: data.agentName,
                            agentTitle: data.agentTitle,
                            agentColor: data.agentColor,
                            agentAvatar: data.agentAvatar,
                          },
                        }
                      : m
                  )
                )
              } else if (data.type === 'delta') {
                accumulatedContent += data.content
                setMessages(prev =>
                  prev.map(m =>
                    m.id === agentMessageId ? { ...m, content: accumulatedContent } : m
                  )
                )
              } else if (data.type === 'done') {
                setMessages(prev =>
                  prev.map(m =>
                    m.id === agentMessageId
                      ? { ...m, content: data.content, isStreaming: false }
                      : m
                  )
                )
                onMessageReceived?.({
                  ...agentMessage,
                  content: data.content,
                  isStreaming: false,
                })
              } else if (data.type === 'error') {
                throw new Error(data.message)
              }
            } catch (e) {
              // JSON解析错误，忽略
            }
          }
        }
      }
    } catch (error) {
      console.error('Chat error:', error)
      // 更新消息显示错误
      setMessages(prev =>
        prev.map(m =>
          m.id === agentMessageId
            ? { ...m, content: '抱歉，发生了错误。请稍后重试。', isStreaming: false }
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
          <div className="flex flex-col items-center justify-center h-full text-center">
            <div
              className="p-4 rounded-full mb-4"
              style={{ backgroundColor: currentAgentInfo.color ? `${currentAgentInfo.color}20` : '#3B82F620' }}
            >
              <span className="text-3xl">{currentAgentInfo.avatar || '💼'}</span>
            </div>
            <h3 className="text-lg font-medium mb-2">
              {currentAgentInfo.name || '高管'}
            </h3>
            <p className="text-muted-foreground max-w-md">
              {currentAgentInfo.title || '准备就绪'}
            </p>
          </div>
        )}

        {messages.map((message) => (
          <MessageBubble key={message.id} message={message} />
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

// 消息气泡组件
function MessageBubble({ message }: { message: ExecutiveMessage }) {
  const isUser = message.role === 'user'

  return (
    <div
      className={cn(
        'flex gap-3 animate-in fade-in slide-in-from-bottom-2 duration-300',
        isUser ? 'flex-row-reverse' : 'flex-row'
      )}
    >
      <Avatar className="h-8 w-8 shrink-0">
        <AvatarFallback
          className={cn(
            isUser
              ? 'bg-primary text-primary-foreground'
              : 'text-white'
          )}
          style={{
            backgroundColor: !isUser && message.metadata?.agentColor ? message.metadata.agentColor : undefined,
          }}
        >
          {isUser ? (
            <User className="h-4 w-4" />
          ) : (
            <span>{message.metadata?.agentAvatar || '💼'}</span>
          )}
        </AvatarFallback>
      </Avatar>

      <div className={cn('flex-1 min-w-0', isUser && 'flex justify-end')}>
        {!isUser && message.metadata?.agentName && (
          <div className="flex items-center gap-2 mb-1">
            <span className="font-medium text-sm">{message.metadata.agentName}</span>
            <span className="text-xs text-muted-foreground">{message.metadata.agentTitle}</span>
          </div>
        )}
        <Card
          className={cn(
            'max-w-[80%] p-3',
            isUser
              ? 'bg-primary text-primary-foreground'
              : 'bg-muted'
          )}
          style={{
            borderLeftWidth: !isUser && message.metadata?.agentColor ? '4px' : undefined,
            borderLeftColor: !isUser && message.metadata?.agentColor ? message.metadata.agentColor : undefined,
          }}
        >
          <p className="whitespace-pre-wrap text-sm">{message.content}</p>
          {message.isStreaming && (
            <span className="inline-block w-2 h-4 bg-current animate-pulse ml-1" />
          )}
        </Card>
        <div className="text-xs text-muted-foreground mt-1">
          {message.timestamp.toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit' })}
        </div>
      </div>
    </div>
  )
}
