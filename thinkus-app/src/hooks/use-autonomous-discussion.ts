'use client'

import { useState, useCallback, useRef } from 'react'
import { AgentId, ProjectPhase, DecisionLevel } from '@/lib/config/ai-executives'

export interface ExecutiveMessage {
  id: string
  agentId: string
  content: string
  role: 'user' | 'executive' | 'system'
  round: number
  timestamp: Date
  isStreaming?: boolean
}

export interface DiscussionParticipant {
  id: AgentId
  name: string
  title: string
  category: string
}

export interface DecisionClassification {
  decision: string
  level: DecisionLevel
  score: number
  factors: Array<{ name: string; score: number; reason: string }>
  recommendation: 'auto_execute' | 'execute_notify' | 'confirm_first' | 'critical_review'
}

export interface DiscussionSummary {
  summary: string
  keyDecisions?: Array<{
    decision: string
    proposedBy: AgentId
    supportedBy?: AgentId[]
  }>
  actionItems?: Array<{
    action: string
    owner: AgentId
    priority: 'high' | 'medium' | 'low'
  }>
  openQuestions?: string[]
  consensus?: string[]
  disagreements?: string[]
}

export interface UseAutonomousDiscussionOptions {
  onMessage?: (message: ExecutiveMessage) => void
  onRoundComplete?: (round: number) => void
  onDecisionClassified?: (classification: DecisionClassification) => void
  onSummaryComplete?: (summary: DiscussionSummary) => void
  onError?: (error: string) => void
}

export interface UseAutonomousDiscussionReturn {
  // 状态
  messages: ExecutiveMessage[]
  participants: DiscussionParticipant[]
  currentRound: number
  maxRounds: number
  isDiscussing: boolean
  speakingAgentId: string | null
  consensusLevel: number
  keyInsights: string[]
  summary: DiscussionSummary | null
  decisions: DecisionClassification[]

  // 操作
  startDiscussion: (params: StartDiscussionParams) => Promise<void>
  continueDiscussion: (userMessage: string) => Promise<void>
  stopDiscussion: () => void
  clearDiscussion: () => void
}

export interface StartDiscussionParams {
  topic: string
  description?: string
  projectPhase?: ProjectPhase
  participants?: AgentId[]
  maxRounds?: number
}

/**
 * 高管自治讨论 Hook
 * 管理AI高管团队的多轮讨论流程
 */
export function useAutonomousDiscussion(
  options: UseAutonomousDiscussionOptions = {}
): UseAutonomousDiscussionReturn {
  const {
    onMessage,
    onRoundComplete,
    onDecisionClassified,
    onSummaryComplete,
    onError,
  } = options

  // 状态
  const [messages, setMessages] = useState<ExecutiveMessage[]>([])
  const [participants, setParticipants] = useState<DiscussionParticipant[]>([])
  const [currentRound, setCurrentRound] = useState(0)
  const [maxRounds, setMaxRounds] = useState(6)
  const [isDiscussing, setIsDiscussing] = useState(false)
  const [speakingAgentId, setSpeakingAgentId] = useState<string | null>(null)
  const [consensusLevel, setConsensusLevel] = useState(0)
  const [keyInsights, setKeyInsights] = useState<string[]>([])
  const [summary, setSummary] = useState<DiscussionSummary | null>(null)
  const [decisions, setDecisions] = useState<DecisionClassification[]>([])

  // 存储讨论参数
  const discussionParamsRef = useRef<StartDiscussionParams | null>(null)
  const abortControllerRef = useRef<AbortController | null>(null)

  /**
   * 开始新讨论
   */
  const startDiscussion = useCallback(async (params: StartDiscussionParams) => {
    discussionParamsRef.current = params
    setIsDiscussing(true)
    setMessages([])
    setDecisions([])
    setSummary(null)
    setKeyInsights([])
    setConsensusLevel(0)
    setCurrentRound(0)

    abortControllerRef.current = new AbortController()

    try {
      const response = await fetch('/api/executives/discuss', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          topic: params.topic,
          description: params.description,
          projectPhase: params.projectPhase || 'development',
          participants: params.participants,
          maxRounds: params.maxRounds || 6,
        }),
        signal: abortControllerRef.current.signal,
      })

      if (!response.ok) {
        throw new Error('Discussion failed')
      }

      await processStream(response)
    } catch (error) {
      if ((error as Error).name !== 'AbortError') {
        console.error('Discussion error:', error)
        onError?.('讨论过程出错')
      }
    } finally {
      setIsDiscussing(false)
      setSpeakingAgentId(null)
    }
  }, [onError])

  /**
   * 用户继续讨论
   */
  const continueDiscussion = useCallback(async (userMessage: string) => {
    if (!discussionParamsRef.current) {
      onError?.('没有进行中的讨论')
      return
    }

    setIsDiscussing(true)
    abortControllerRef.current = new AbortController()

    // 添加用户消息
    const userMsg: ExecutiveMessage = {
      id: `user-${Date.now()}`,
      agentId: 'user',
      content: userMessage,
      role: 'user',
      round: currentRound,
      timestamp: new Date(),
    }
    setMessages(prev => [...prev, userMsg])
    onMessage?.(userMsg)

    try {
      const response = await fetch('/api/executives/discuss', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          topic: discussionParamsRef.current.topic,
          description: discussionParamsRef.current.description,
          projectPhase: discussionParamsRef.current.projectPhase || 'development',
          participants: discussionParamsRef.current.participants,
          maxRounds: discussionParamsRef.current.maxRounds || 6,
          existingHistory: messages.map(m => ({
            agentId: m.agentId,
            content: m.content,
            role: m.role,
            round: m.round,
          })),
          userMessage,
        }),
        signal: abortControllerRef.current.signal,
      })

      if (!response.ok) {
        throw new Error('Continue discussion failed')
      }

      await processStream(response)
    } catch (error) {
      if ((error as Error).name !== 'AbortError') {
        console.error('Continue discussion error:', error)
        onError?.('继续讨论出错')
      }
    } finally {
      setIsDiscussing(false)
      setSpeakingAgentId(null)
    }
  }, [currentRound, messages, onError, onMessage])

  /**
   * 处理SSE流
   */
  const processStream = async (response: Response) => {
    const reader = response.body?.getReader()
    if (!reader) throw new Error('No reader')

    const decoder = new TextDecoder()
    const currentMessages = new Map<string, ExecutiveMessage>()

    while (true) {
      const { done, value } = await reader.read()
      if (done) break

      const chunk = decoder.decode(value)
      const lines = chunk.split('\n')

      for (const line of lines) {
        if (line.startsWith('data: ')) {
          try {
            const data = JSON.parse(line.slice(6))

            switch (data.type) {
              case 'discussion_init':
                setParticipants(data.participants)
                setMaxRounds(data.maxRounds)
                setCurrentRound(data.currentRound)
                break

              case 'round_start':
                setCurrentRound(data.round)
                break

              case 'orchestrator_decision':
                if (data.keyInsights) {
                  setKeyInsights(prev => [...new Set([...prev, ...data.keyInsights])])
                }
                if (data.consensusLevel !== undefined) {
                  setConsensusLevel(data.consensusLevel)
                }
                break

              case 'expert_speaking':
                setSpeakingAgentId(data.agentId)
                // 创建占位消息
                const msgId = `msg-${data.round}-${data.agentId}`
                const newMsg: ExecutiveMessage = {
                  id: msgId,
                  agentId: data.agentId,
                  content: '',
                  role: 'executive',
                  round: data.round,
                  timestamp: new Date(),
                  isStreaming: true,
                }
                currentMessages.set(msgId, newMsg)
                setMessages(prev => [...prev.filter(m => m.id !== msgId), newMsg])
                break

              case 'expert_message_delta':
                const deltaKey = `msg-${data.round}-${data.agentId}`
                const existing = currentMessages.get(deltaKey)
                if (existing) {
                  existing.content += data.content
                  setMessages(prev =>
                    prev.map(m => m.id === deltaKey ? { ...existing } : m)
                  )
                }
                break

              case 'expert_message_complete':
                const completeKey = `msg-${data.round}-${data.agentId}`
                const completed = currentMessages.get(completeKey)
                if (completed) {
                  completed.content = data.content
                  completed.isStreaming = false
                  setMessages(prev =>
                    prev.map(m => m.id === completeKey ? { ...completed } : m)
                  )
                  onMessage?.(completed)
                }
                setSpeakingAgentId(null)
                break

              case 'round_complete':
                setCurrentRound(data.round)
                onRoundComplete?.(data.round)
                break

              case 'discussion_converging':
                // 讨论收敛
                break

              case 'summary_complete':
                if (data.summary) {
                  setSummary(data.summary)
                  onSummaryComplete?.(data.summary)
                }
                break

              case 'decision_classified':
                const classification: DecisionClassification = {
                  decision: data.decision,
                  ...data.classification,
                }
                setDecisions(prev => [...prev, classification])
                onDecisionClassified?.(classification)
                break

              case 'discussion_complete':
                if (data.summary) {
                  setSummary(data.summary)
                }
                break

              case 'error':
                onError?.(data.message || '讨论出错')
                break
            }
          } catch {
            // JSON解析错误，忽略
          }
        }
      }
    }
  }

  /**
   * 停止讨论
   */
  const stopDiscussion = useCallback(() => {
    abortControllerRef.current?.abort()
    setIsDiscussing(false)
    setSpeakingAgentId(null)
  }, [])

  /**
   * 清空讨论
   */
  const clearDiscussion = useCallback(() => {
    setMessages([])
    setParticipants([])
    setCurrentRound(0)
    setMaxRounds(6)
    setIsDiscussing(false)
    setSpeakingAgentId(null)
    setConsensusLevel(0)
    setKeyInsights([])
    setSummary(null)
    setDecisions([])
    discussionParamsRef.current = null
  }, [])

  return {
    messages,
    participants,
    currentRound,
    maxRounds,
    isDiscussing,
    speakingAgentId,
    consensusLevel,
    keyInsights,
    summary,
    decisions,
    startDiscussion,
    continueDiscussion,
    stopDiscussion,
    clearDiscussion,
  }
}
