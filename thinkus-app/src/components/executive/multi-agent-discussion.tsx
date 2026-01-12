'use client'

import { useState, useRef, useEffect, useCallback } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Progress } from '@/components/ui/progress'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Loader2, Play, CheckCircle2, MessageSquare, Users, FileText } from 'lucide-react'
import { cn } from '@/lib/utils'
import { type AgentId } from '@/lib/config/executives'

// 讨论阶段
type DiscussionStage = 'opening' | 'exploration' | 'debate' | 'synthesis' | 'conclusion'

// 阶段名称
const STAGE_NAMES: Record<DiscussionStage, string> = {
  opening: '开场',
  exploration: '探索',
  debate: '讨论',
  synthesis: '综合',
  conclusion: '总结',
}

// 参与者信息
interface Participant {
  agentId: AgentId
  name: string
  title: string
  color: string
  avatar: string
}

// 讨论消息
interface DiscussionMessage {
  id: string
  agentId: AgentId
  content: string
  stage: DiscussionStage
  timestamp: Date
  isStreaming?: boolean
}

// 讨论总结
interface DiscussionSummary {
  summary: string
  conclusions: string[]
  actionItems: Array<{
    description: string
    assignee: AgentId
    priority: 'high' | 'medium' | 'low'
  }>
}

interface MultiAgentDiscussionProps {
  projectId: string
  topic: string
  context?: string
  participants?: AgentId[]
  autoSchedule?: boolean
  stages?: DiscussionStage[]
  onComplete?: (summary: DiscussionSummary) => void
  className?: string
}

export function MultiAgentDiscussion({
  projectId,
  topic,
  context,
  participants: initialParticipants,
  autoSchedule = true,
  stages = ['opening', 'exploration', 'debate', 'synthesis'],
  onComplete,
  className,
}: MultiAgentDiscussionProps) {
  const [status, setStatus] = useState<'idle' | 'running' | 'completed' | 'error'>('idle')
  const [participants, setParticipants] = useState<Participant[]>([])
  const [messages, setMessages] = useState<DiscussionMessage[]>([])
  const [currentStage, setCurrentStage] = useState<DiscussionStage | null>(null)
  const [currentSpeaker, setCurrentSpeaker] = useState<AgentId | null>(null)
  const [summary, setSummary] = useState<DiscussionSummary | null>(null)
  const [discussionId, setDiscussionId] = useState<string | null>(null)
  const [progress, setProgress] = useState(0)

  const messagesEndRef = useRef<HTMLDivElement>(null)
  const abortControllerRef = useRef<AbortController | null>(null)

  const scrollToBottom = useCallback(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [])

  useEffect(() => {
    scrollToBottom()
  }, [messages, scrollToBottom])

  // 开始讨论
  const startDiscussion = async () => {
    setStatus('running')
    setMessages([])
    setSummary(null)
    setProgress(0)

    abortControllerRef.current = new AbortController()

    try {
      const response = await fetch('/api/discussion/multi-agent', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          projectId,
          topic,
          context,
          participants: initialParticipants,
          autoSchedule,
          stages,
        }),
        signal: abortControllerRef.current.signal,
      })

      if (!response.ok) {
        throw new Error('Failed to start discussion')
      }

      const reader = response.body?.getReader()
      if (!reader) throw new Error('No response body')

      const decoder = new TextDecoder()
      let currentMessageId: string | null = null
      let totalStages = stages.length
      let completedStages = 0

      while (true) {
        const { done, value } = await reader.read()
        if (done) break

        const chunk = decoder.decode(value, { stream: true })
        const lines = chunk.split('\n')

        for (const line of lines) {
          if (line.startsWith('data: ')) {
            try {
              const data = JSON.parse(line.slice(6))

              switch (data.type) {
                case 'discussion_start':
                  setDiscussionId(data.discussionId)
                  setParticipants(data.participants)
                  break

                case 'stage_start':
                  setCurrentStage(data.stage)
                  break

                case 'stage_complete':
                  completedStages++
                  setProgress((completedStages / totalStages) * 80) // 80% for stages
                  break

                case 'agent_start':
                  setCurrentSpeaker(data.agentId)
                  currentMessageId = `msg-${Date.now()}-${data.agentId}`
                  setMessages(prev => [
                    ...prev,
                    {
                      id: currentMessageId!,
                      agentId: data.agentId,
                      content: '',
                      stage: data.stage,
                      timestamp: new Date(),
                      isStreaming: true,
                    },
                  ])
                  break

                case 'agent_delta':
                  if (currentMessageId) {
                    setMessages(prev =>
                      prev.map(m =>
                        m.id === currentMessageId
                          ? { ...m, content: m.content + data.content }
                          : m
                      )
                    )
                  }
                  break

                case 'agent_complete':
                  if (currentMessageId) {
                    setMessages(prev =>
                      prev.map(m =>
                        m.id === currentMessageId
                          ? { ...m, isStreaming: false }
                          : m
                      )
                    )
                  }
                  currentMessageId = null
                  break

                case 'summary_start':
                  setProgress(85)
                  setCurrentStage(null)
                  setCurrentSpeaker(null)
                  break

                case 'summary_complete':
                  setSummary({
                    summary: data.summary,
                    conclusions: data.conclusions,
                    actionItems: data.actionItems,
                  })
                  setProgress(100)
                  break

                case 'discussion_complete':
                  setStatus('completed')
                  onComplete?.(summary!)
                  break

                case 'error':
                  throw new Error(data.message)
              }
            } catch (e) {
              // JSON parse error, ignore
            }
          }
        }
      }
    } catch (error) {
      if ((error as Error).name !== 'AbortError') {
        console.error('Discussion error:', error)
        setStatus('error')
      }
    }
  }

  // 取消讨论
  const cancelDiscussion = () => {
    abortControllerRef.current?.abort()
    setStatus('idle')
  }

  // 获取参与者信息
  const getParticipant = (agentId: AgentId): Participant | undefined => {
    return participants.find(p => p.agentId === agentId)
  }

  return (
    <div className={cn('flex flex-col h-full', className)}>
      {/* Header */}
      <div className="border-b p-4">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h3 className="font-medium flex items-center gap-2">
              <Users className="h-4 w-4" />
              多高管讨论
            </h3>
            <p className="text-sm text-muted-foreground">{topic}</p>
          </div>
          {status === 'idle' && (
            <Button onClick={startDiscussion}>
              <Play className="h-4 w-4 mr-2" />
              开始讨论
            </Button>
          )}
          {status === 'running' && (
            <Button variant="outline" onClick={cancelDiscussion}>
              取消
            </Button>
          )}
          {status === 'completed' && (
            <Badge variant="default" className="bg-green-500">
              <CheckCircle2 className="h-3 w-3 mr-1" />
              已完成
            </Badge>
          )}
        </div>

        {/* Progress */}
        {status === 'running' && (
          <div className="space-y-2">
            <div className="flex items-center justify-between text-sm">
              <span className="text-muted-foreground">
                {currentStage ? `${STAGE_NAMES[currentStage]}阶段` : '正在总结...'}
              </span>
              <span>{Math.round(progress)}%</span>
            </div>
            <Progress value={progress} className="h-2" />
          </div>
        )}

        {/* Participants */}
        {participants.length > 0 && (
          <div className="flex items-center gap-2 mt-4">
            <span className="text-xs text-muted-foreground">参与者:</span>
            <div className="flex -space-x-2">
              {participants.map(p => (
                <div
                  key={p.agentId}
                  className={cn(
                    'w-8 h-8 rounded-full flex items-center justify-center text-sm border-2 border-background transition-transform',
                    currentSpeaker === p.agentId && 'ring-2 ring-primary scale-110 z-10'
                  )}
                  style={{ backgroundColor: p.color }}
                  title={`${p.name} - ${p.title}`}
                >
                  {p.avatar}
                </div>
              ))}
            </div>
            {currentSpeaker && (
              <span className="text-sm font-medium ml-2">
                {getParticipant(currentSpeaker)?.name} 正在发言...
              </span>
            )}
          </div>
        )}
      </div>

      {/* Messages */}
      <ScrollArea className="flex-1 p-4">
        <div className="space-y-4">
          {messages.map((message, index) => {
            const participant = getParticipant(message.agentId)
            const isNewStage = index === 0 || messages[index - 1].stage !== message.stage

            return (
              <div key={message.id}>
                {isNewStage && (
                  <div className="flex items-center gap-2 my-4">
                    <div className="flex-1 h-px bg-border" />
                    <Badge variant="outline" className="text-xs">
                      {STAGE_NAMES[message.stage]}
                    </Badge>
                    <div className="flex-1 h-px bg-border" />
                  </div>
                )}
                <div className="flex gap-3 animate-in fade-in slide-in-from-bottom-2 duration-300">
                  <div
                    className="w-10 h-10 rounded-full flex items-center justify-center shrink-0 text-lg"
                    style={{ backgroundColor: participant?.color || '#6B7280' }}
                  >
                    {participant?.avatar || '👤'}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="font-medium text-sm">{participant?.name}</span>
                      <span className="text-xs text-muted-foreground">{participant?.title}</span>
                    </div>
                    <Card
                      className="p-3"
                      style={{ borderLeftWidth: '4px', borderLeftColor: participant?.color }}
                    >
                      <p className="text-sm whitespace-pre-wrap">{message.content}</p>
                      {message.isStreaming && (
                        <span className="inline-block w-2 h-4 bg-foreground/50 animate-pulse ml-1" />
                      )}
                    </Card>
                  </div>
                </div>
              </div>
            )
          })}

          {/* Summary */}
          {summary && (
            <Card className="mt-6 border-primary">
              <CardHeader className="pb-2">
                <CardTitle className="text-base flex items-center gap-2">
                  <FileText className="h-4 w-4" />
                  讨论总结
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <h4 className="text-sm font-medium mb-1">核心结论</h4>
                  <p className="text-sm text-muted-foreground">{summary.summary}</p>
                </div>

                {summary.conclusions.length > 0 && (
                  <div>
                    <h4 className="text-sm font-medium mb-2">主要结论</h4>
                    <ul className="space-y-1">
                      {summary.conclusions.map((conclusion, i) => (
                        <li key={i} className="text-sm flex items-start gap-2">
                          <CheckCircle2 className="h-4 w-4 text-green-500 shrink-0 mt-0.5" />
                          <span>{conclusion}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}

                {summary.actionItems.length > 0 && (
                  <div>
                    <h4 className="text-sm font-medium mb-2">行动项</h4>
                    <div className="space-y-2">
                      {summary.actionItems.map((item, i) => {
                        const assignee = getParticipant(item.assignee)
                        return (
                          <div
                            key={i}
                            className="flex items-start gap-2 p-2 rounded-lg bg-muted/50"
                          >
                            <div
                              className="w-6 h-6 rounded-full flex items-center justify-center text-xs shrink-0"
                              style={{ backgroundColor: assignee?.color }}
                            >
                              {assignee?.avatar}
                            </div>
                            <div className="flex-1 min-w-0">
                              <p className="text-sm">{item.description}</p>
                              <div className="flex items-center gap-2 mt-1">
                                <span className="text-xs text-muted-foreground">
                                  负责人: {assignee?.name}
                                </span>
                                <Badge
                                  variant="outline"
                                  className={cn(
                                    'text-xs',
                                    item.priority === 'high' && 'border-red-500 text-red-500',
                                    item.priority === 'medium' && 'border-yellow-500 text-yellow-500',
                                    item.priority === 'low' && 'border-green-500 text-green-500'
                                  )}
                                >
                                  {item.priority === 'high' ? '高优' : item.priority === 'medium' ? '中优' : '低优'}
                                </Badge>
                              </div>
                            </div>
                          </div>
                        )
                      })}
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          )}

          <div ref={messagesEndRef} />
        </div>
      </ScrollArea>

      {/* Empty State */}
      {status === 'idle' && messages.length === 0 && (
        <div className="flex-1 flex items-center justify-center">
          <div className="text-center">
            <MessageSquare className="h-12 w-12 mx-auto mb-4 text-muted-foreground opacity-50" />
            <h3 className="font-medium mb-2">准备开始讨论</h3>
            <p className="text-sm text-muted-foreground max-w-sm">
              点击"开始讨论"按钮，AI高管们将围绕话题展开讨论
            </p>
          </div>
        </div>
      )}
    </div>
  )
}
