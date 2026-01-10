'use client'

import { useState, useRef, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { Card } from '@/components/ui/card'
import { Send, Loader2, Sparkles, User } from 'lucide-react'
import { cn } from '@/lib/utils'

export interface Message {
  id: string
  role: 'user' | 'assistant'
  content: string
  speaker?: string
  isStreaming?: boolean
}

interface ChatInterfaceProps {
  messages: Message[]
  onSendMessage: (message: string) => Promise<void>
  isLoading?: boolean
  placeholder?: string
}

export function ChatInterface({
  messages,
  onSendMessage,
  isLoading = false,
  placeholder = '描述你想做的产品...',
}: ChatInterfaceProps) {
  const [input, setInput] = useState('')
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const textareaRef = useRef<HTMLTextAreaElement>(null)

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }

  useEffect(() => {
    scrollToBottom()
  }, [messages])

  const handleSubmit = async (e?: React.FormEvent) => {
    e?.preventDefault()
    if (!input.trim() || isLoading) return

    const message = input.trim()
    setInput('')
    await onSendMessage(message)
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSubmit()
    }
  }

  return (
    <div className="flex flex-col h-full">
      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {messages.length === 0 && (
          <div className="flex flex-col items-center justify-center h-full text-center">
            <div className="p-4 bg-primary/10 rounded-full mb-4">
              <Sparkles className="h-8 w-8 text-primary" />
            </div>
            <h3 className="text-lg font-medium mb-2">你好，我是小T</h3>
            <p className="text-muted-foreground max-w-md">
              我是你的AI产品顾问。告诉我你想做什么产品，我会帮你分析需求、规划方案。
            </p>
          </div>
        )}

        {messages.map((message) => (
          <div
            key={message.id}
            className={cn(
              'flex gap-3',
              message.role === 'user' ? 'flex-row-reverse' : 'flex-row'
            )}
          >
            <Avatar className="h-8 w-8 shrink-0">
              <AvatarFallback
                className={cn(
                  message.role === 'user'
                    ? 'bg-primary text-primary-foreground'
                    : 'bg-gradient-to-br from-violet-500 to-purple-600 text-white'
                )}
              >
                {message.role === 'user' ? (
                  <User className="h-4 w-4" />
                ) : (
                  <Sparkles className="h-4 w-4" />
                )}
              </AvatarFallback>
            </Avatar>

            <Card
              className={cn(
                'max-w-[80%] p-3',
                message.role === 'user'
                  ? 'bg-primary text-primary-foreground'
                  : 'bg-muted'
              )}
            >
              {message.speaker && (
                <div className="text-xs font-medium mb-1 opacity-70">
                  {message.speaker}
                </div>
              )}
              <p className="whitespace-pre-wrap text-sm">{message.content}</p>
              {message.isStreaming && (
                <span className="inline-block w-2 h-4 bg-current animate-pulse ml-1" />
              )}
            </Card>
          </div>
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
