'use client'

import { useRef, useEffect } from 'react'
import { Card, CardContent } from '@/components/ui/card'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { Badge } from '@/components/ui/badge'
import { Progress } from '@/components/ui/progress'
import { Sparkles, MessageCircle, Users, Target } from 'lucide-react'
import { EXECUTIVES, type AgentId } from '@/lib/config/executives'
import { ExecutiveAvatarStack, SpeakingIndicator } from './executive-card'
import type { ExecutiveMessage, DiscussionParticipant } from '@/hooks/use-autonomous-discussion'

interface ExecutiveDiscussionPanelProps {
  messages: ExecutiveMessage[]
  participants: DiscussionParticipant[]
  currentRound: number
  maxRounds: number
  speakingAgentId: string | null
  consensusLevel: number
  keyInsights: string[]
  className?: string
}

export function ExecutiveDiscussionPanel({
  messages,
  participants,
  currentRound,
  maxRounds,
  speakingAgentId,
  consensusLevel,
  keyInsights,
  className,
}: ExecutiveDiscussionPanelProps) {
  const messagesEndRef = useRef<HTMLDivElement>(null)

  // 自动滚动到底部
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  const progressPercent = maxRounds > 0 ? Math.min((currentRound / maxRounds) * 100, 100) : 0

  return (
    <div className={`flex flex-col h-full ${className}`}>
      {/* 顶部状态栏 */}
      <div className="flex-shrink-0 border-b bg-muted/30 p-3 space-y-3">
        {/* 参与者和进度 */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2">
              <Users className="h-4 w-4 text-muted-foreground" />
              <span className="text-sm text-muted-foreground">参与高管:</span>
            </div>
            <ExecutiveAvatarStack
              agentIds={participants.map(p => p.id)}
              maxDisplay={5}
              size="sm"
            />
          </div>
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <MessageCircle className="h-4 w-4" />
            <span>第 {currentRound} / {maxRounds} 轮</span>
          </div>
        </div>

        {/* 进度条 */}
        <div className="space-y-1">
          <div className="flex justify-between text-xs text-muted-foreground">
            <span>讨论进度</span>
            <span>共识度: {consensusLevel}%</span>
          </div>
          <Progress value={progressPercent} className="h-1.5" />
        </div>

        {/* 关键洞察 */}
        {keyInsights.length > 0 && (
          <div className="flex flex-wrap gap-2">
            <Target className="h-4 w-4 text-primary shrink-0 mt-0.5" />
            {keyInsights.slice(-3).map((insight, index) => (
              <Badge key={index} variant="secondary" className="text-xs">
                {insight}
              </Badge>
            ))}
          </div>
        )}

        {/* 发言指示器 */}
        {speakingAgentId && (
          <SpeakingIndicator
            agentId={speakingAgentId as AgentId}
            isSpeaking={true}
          />
        )}
      </div>

      {/* 消息列表 */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {messages.length === 0 && (
          <div className="flex flex-col items-center justify-center h-full text-muted-foreground">
            <Sparkles className="h-12 w-12 mb-4 opacity-50" />
            <p>等待讨论开始...</p>
          </div>
        )}

        {messages.map((message) => (
          <ExecutiveMessageBubble
            key={message.id}
            message={message}
            isSpeaking={speakingAgentId === message.agentId && message.isStreaming}
          />
        ))}

        <div ref={messagesEndRef} />
      </div>
    </div>
  )
}

/**
 * 高管消息气泡
 */
interface ExecutiveMessageBubbleProps {
  message: ExecutiveMessage
  isSpeaking?: boolean
}

function ExecutiveMessageBubble({ message, isSpeaking }: ExecutiveMessageBubbleProps) {
  const isUser = message.role === 'user'
  const exec = !isUser ? EXECUTIVES[message.agentId as AgentId] : null

  if (isUser) {
    return (
      <div className="flex justify-end">
        <div className="max-w-[80%]">
          <div className="flex items-center justify-end gap-2 mb-1">
            <span className="text-xs text-muted-foreground">你</span>
            <Badge variant="outline" className="text-xs">
              第 {message.round} 轮
            </Badge>
          </div>
          <Card className="bg-primary text-primary-foreground">
            <CardContent className="p-3">
              <p className="text-sm whitespace-pre-wrap">{message.content}</p>
            </CardContent>
          </Card>
        </div>
      </div>
    )
  }

  if (!exec) return null

  return (
    <div className="flex gap-3">
      <div className="relative flex-shrink-0">
        <Avatar className="h-10 w-10">
          <AvatarFallback
            style={{ backgroundColor: exec.color }}
            className="text-white"
          >
            {exec.avatar}
          </AvatarFallback>
        </Avatar>
        {isSpeaking && (
          <span className="absolute -bottom-0.5 -right-0.5 h-3 w-3 rounded-full bg-green-500 border-2 border-background animate-pulse" />
        )}
      </div>

      <div className="max-w-[80%]">
        <div className="flex items-center gap-2 mb-1">
          <span className="text-sm font-medium">{exec.nameCn}</span>
          <span className="text-xs text-muted-foreground">{exec.titleCn}</span>
          <Badge variant="outline" className="text-xs">
            第 {message.round} 轮
          </Badge>
        </div>
        <Card className={isSpeaking ? 'border-primary/50' : ''}>
          <CardContent className="p-3">
            <p className="text-sm whitespace-pre-wrap">
              {message.content}
              {isSpeaking && message.isStreaming && (
                <span className="inline-block w-2 h-4 ml-1 bg-primary animate-pulse" />
              )}
            </p>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}

/**
 * 讨论总结面板
 */
interface DiscussionSummaryPanelProps {
  summary: {
    summary: string
    keyDecisions?: Array<{
      decision: string
      proposedBy: string
      supportedBy?: string[]
    }>
    actionItems?: Array<{
      action: string
      owner: string
      priority: 'high' | 'medium' | 'low'
    }>
    openQuestions?: string[]
    consensus?: string[]
    disagreements?: string[]
  }
  className?: string
}

export function DiscussionSummaryPanel({ summary, className }: DiscussionSummaryPanelProps) {
  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'high': return 'destructive'
      case 'medium': return 'default'
      case 'low': return 'secondary'
      default: return 'outline'
    }
  }

  return (
    <div className={`space-y-4 ${className}`}>
      {/* 总结 */}
      <Card>
        <CardContent className="p-4">
          <h3 className="font-semibold mb-2 flex items-center gap-2">
            <Sparkles className="h-4 w-4 text-primary" />
            讨论总结
          </h3>
          <p className="text-sm text-muted-foreground whitespace-pre-wrap">
            {summary.summary}
          </p>
        </CardContent>
      </Card>

      {/* 关键决策 */}
      {summary.keyDecisions && summary.keyDecisions.length > 0 && (
        <Card>
          <CardContent className="p-4">
            <h3 className="font-semibold mb-3">关键决策</h3>
            <ul className="space-y-2">
              {summary.keyDecisions.map((decision, index) => {
                const proposer = EXECUTIVES[decision.proposedBy as AgentId]
                return (
                  <li key={index} className="flex items-start gap-2">
                    <span className="text-primary font-bold">{index + 1}.</span>
                    <div className="flex-1">
                      <p className="text-sm">{decision.decision}</p>
                      {proposer && (
                        <p className="text-xs text-muted-foreground mt-1">
                          提议: {proposer.nameCn}
                          {decision.supportedBy && decision.supportedBy.length > 0 && (
                            <> | 支持: {decision.supportedBy.map(id =>
                              EXECUTIVES[id as AgentId]?.nameCn
                            ).filter(Boolean).join(', ')}</>
                          )}
                        </p>
                      )}
                    </div>
                  </li>
                )
              })}
            </ul>
          </CardContent>
        </Card>
      )}

      {/* 行动项 */}
      {summary.actionItems && summary.actionItems.length > 0 && (
        <Card>
          <CardContent className="p-4">
            <h3 className="font-semibold mb-3">行动项</h3>
            <ul className="space-y-2">
              {summary.actionItems.map((item, index) => {
                const owner = EXECUTIVES[item.owner as AgentId]
                return (
                  <li key={index} className="flex items-start justify-between gap-2">
                    <div className="flex items-start gap-2 flex-1">
                      <input type="checkbox" className="mt-1" />
                      <div>
                        <p className="text-sm">{item.action}</p>
                        {owner && (
                          <p className="text-xs text-muted-foreground">
                            负责人: {owner.nameCn}
                          </p>
                        )}
                      </div>
                    </div>
                    <Badge variant={getPriorityColor(item.priority) as any}>
                      {item.priority === 'high' ? '高' : item.priority === 'medium' ? '中' : '低'}
                    </Badge>
                  </li>
                )
              })}
            </ul>
          </CardContent>
        </Card>
      )}

      {/* 共识与分歧 */}
      <div className="grid grid-cols-2 gap-4">
        {summary.consensus && summary.consensus.length > 0 && (
          <Card>
            <CardContent className="p-4">
              <h3 className="font-semibold mb-2 text-green-600">达成共识</h3>
              <ul className="space-y-1 text-sm">
                {summary.consensus.map((item, index) => (
                  <li key={index} className="flex items-start gap-2">
                    <span className="text-green-600">✓</span>
                    <span>{item}</span>
                  </li>
                ))}
              </ul>
            </CardContent>
          </Card>
        )}

        {summary.disagreements && summary.disagreements.length > 0 && (
          <Card>
            <CardContent className="p-4">
              <h3 className="font-semibold mb-2 text-orange-600">待解决分歧</h3>
              <ul className="space-y-1 text-sm">
                {summary.disagreements.map((item, index) => (
                  <li key={index} className="flex items-start gap-2">
                    <span className="text-orange-600">?</span>
                    <span>{item}</span>
                  </li>
                ))}
              </ul>
            </CardContent>
          </Card>
        )}
      </div>

      {/* 未解决问题 */}
      {summary.openQuestions && summary.openQuestions.length > 0 && (
        <Card>
          <CardContent className="p-4">
            <h3 className="font-semibold mb-2">待解决问题</h3>
            <ul className="space-y-1 text-sm text-muted-foreground">
              {summary.openQuestions.map((question, index) => (
                <li key={index} className="flex items-start gap-2">
                  <span>•</span>
                  <span>{question}</span>
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
