'use client'

import { useState, useEffect, useRef } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Textarea } from '@/components/ui/textarea'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Skeleton } from '@/components/ui/skeleton'
import { useToast } from '@/components/ui/use-toast'
import {
  ArrowLeft,
  Send,
  Loader2,
  CheckCircle2,
  Clock,
  User,
} from 'lucide-react'
import { cn } from '@/lib/utils'

interface Message {
  role: 'user' | 'expert'
  content: string
  createdAt: string
}

interface Consultation {
  id: string
  expertId: string
  expertName: string
  expertAvatar: string
  topic: string
  messages: Message[]
  status: 'active' | 'completed' | 'expired'
  creditsUsed: number
  createdAt: string
  completedAt?: string
}

interface ConsultationChatProps {
  consultationId: string
  onBack?: () => void
}

export function ConsultationChat({ consultationId, onBack }: ConsultationChatProps) {
  const { toast } = useToast()
  const scrollRef = useRef<HTMLDivElement>(null)
  const [consultation, setConsultation] = useState<Consultation | null>(null)
  const [loading, setLoading] = useState(true)
  const [message, setMessage] = useState('')
  const [sending, setSending] = useState(false)
  const [completing, setCompleting] = useState(false)

  // 加载咨询详情
  useEffect(() => {
    loadConsultation()
  }, [consultationId])

  // 滚动到底部
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight
    }
  }, [consultation?.messages])

  const loadConsultation = async () => {
    try {
      setLoading(true)
      const response = await fetch(`/api/experts?consultationId=${consultationId}`)
      const data = await response.json()
      if (data.success) {
        setConsultation(data.consultation)
      }
    } catch (error) {
      console.error('Failed to load consultation:', error)
      toast({
        title: '加载失败',
        description: '无法加载咨询记录',
        variant: 'destructive',
      })
    } finally {
      setLoading(false)
    }
  }

  const handleSend = async () => {
    if (!message.trim() || !consultation || consultation.status !== 'active') return

    try {
      setSending(true)

      // 添加用户消息到本地
      const userMessage: Message = {
        role: 'user',
        content: message,
        createdAt: new Date().toISOString(),
      }
      setConsultation({
        ...consultation,
        messages: [...consultation.messages, userMessage],
      })
      setMessage('')

      // 发送消息
      const response = await fetch('/api/experts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'message',
          consultationId,
          content: userMessage.content,
        }),
      })

      const data = await response.json()

      if (data.success) {
        // 添加专家回复
        setConsultation((prev) =>
          prev
            ? {
                ...prev,
                messages: [...prev.messages, data.message],
              }
            : null
        )
      } else {
        throw new Error(data.error)
      }
    } catch (error) {
      console.error('Failed to send message:', error)
      toast({
        title: '发送失败',
        description: '消息发送失败，请重试',
        variant: 'destructive',
      })
      // 恢复消息
      loadConsultation()
    } finally {
      setSending(false)
    }
  }

  const handleComplete = async () => {
    if (!consultation) return

    try {
      setCompleting(true)
      const response = await fetch('/api/experts', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          consultationId,
          action: 'complete',
        }),
      })

      const data = await response.json()

      if (data.success) {
        toast({
          title: '咨询已完成',
          description: '感谢您的使用',
        })
        loadConsultation()
      } else {
        throw new Error(data.error)
      }
    } catch (error) {
      console.error('Failed to complete consultation:', error)
      toast({
        title: '操作失败',
        description: '无法完成咨询',
        variant: 'destructive',
      })
    } finally {
      setCompleting(false)
    }
  }

  const formatTime = (dateStr: string) => {
    return new Date(dateStr).toLocaleTimeString('zh-CN', {
      hour: '2-digit',
      minute: '2-digit',
    })
  }

  if (loading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-[400px]" />
        <Skeleton className="h-24" />
      </div>
    )
  }

  if (!consultation) {
    return (
      <Card>
        <CardContent className="py-12 text-center">
          <p className="text-muted-foreground">咨询记录未找到</p>
          {onBack && (
            <Button className="mt-4" onClick={onBack}>
              返回
            </Button>
          )}
        </CardContent>
      </Card>
    )
  }

  const isActive = consultation.status === 'active'

  return (
    <div className="space-y-4">
      {/* 头部 */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          {onBack && (
            <Button variant="ghost" size="icon" onClick={onBack}>
              <ArrowLeft className="h-4 w-4" />
            </Button>
          )}
          <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center text-xl">
            {consultation.expertAvatar}
          </div>
          <div>
            <h2 className="font-semibold">{consultation.expertName}</h2>
            <p className="text-sm text-muted-foreground">{consultation.topic}</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Badge variant={isActive ? 'default' : 'secondary'}>
            {isActive ? (
              <>
                <Clock className="h-3 w-3 mr-1" />
                进行中
              </>
            ) : (
              <>
                <CheckCircle2 className="h-3 w-3 mr-1" />
                已完成
              </>
            )}
          </Badge>
          {isActive && (
            <Button
              variant="outline"
              size="sm"
              onClick={handleComplete}
              disabled={completing}
            >
              {completing && <Loader2 className="h-3 w-3 mr-1 animate-spin" />}
              结束咨询
            </Button>
          )}
        </div>
      </div>

      {/* 消息列表 */}
      <Card>
        <ScrollArea
          ref={scrollRef}
          className="h-[400px] p-4"
        >
          {consultation.messages.length === 0 ? (
            <div className="flex items-center justify-center h-full text-muted-foreground">
              开始与专家对话吧
            </div>
          ) : (
            <div className="space-y-4">
              {consultation.messages.map((msg, index) => (
                <div
                  key={index}
                  className={cn(
                    'flex gap-3',
                    msg.role === 'user' ? 'flex-row-reverse' : ''
                  )}
                >
                  <div
                    className={cn(
                      'w-8 h-8 rounded-full flex items-center justify-center shrink-0',
                      msg.role === 'user' ? 'bg-primary text-primary-foreground' : 'bg-muted'
                    )}
                  >
                    {msg.role === 'user' ? (
                      <User className="h-4 w-4" />
                    ) : (
                      <span className="text-sm">{consultation.expertAvatar}</span>
                    )}
                  </div>
                  <div
                    className={cn(
                      'flex-1 max-w-[80%]',
                      msg.role === 'user' ? 'text-right' : ''
                    )}
                  >
                    <div
                      className={cn(
                        'inline-block p-3 rounded-lg text-sm',
                        msg.role === 'user'
                          ? 'bg-primary text-primary-foreground'
                          : 'bg-muted'
                      )}
                    >
                      <p className="whitespace-pre-wrap">{msg.content}</p>
                    </div>
                    <p className="text-xs text-muted-foreground mt-1">
                      {formatTime(msg.createdAt)}
                    </p>
                  </div>
                </div>
              ))}
              {sending && (
                <div className="flex gap-3">
                  <div className="w-8 h-8 rounded-full bg-muted flex items-center justify-center">
                    <span className="text-sm">{consultation.expertAvatar}</span>
                  </div>
                  <div className="bg-muted p-3 rounded-lg">
                    <Loader2 className="h-4 w-4 animate-spin" />
                  </div>
                </div>
              )}
            </div>
          )}
        </ScrollArea>
      </Card>

      {/* 输入框 */}
      {isActive && (
        <div className="flex gap-2">
          <Textarea
            placeholder="输入您的问题..."
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault()
                handleSend()
              }
            }}
            className="min-h-[60px]"
            disabled={sending}
          />
          <Button
            className="shrink-0"
            onClick={handleSend}
            disabled={sending || !message.trim()}
          >
            {sending ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Send className="h-4 w-4" />
            )}
          </Button>
        </div>
      )}
    </div>
  )
}
