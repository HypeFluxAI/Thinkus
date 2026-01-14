'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { DiscussionPanel, DiscussionMessage } from '@/components/expert/discussion-panel'
import { FeaturePanel, Feature } from '@/components/chat/feature-panel'
import {
  CORE_EXPERTS,
  selectExperts,
  DiscussionPhase,
  DISCUSSION_PHASES,
  DiscussionMode,
  DISCUSSION_MODES,
  Expert,
} from '@/lib/ai/experts/config'
import {
  ArrowLeft,
  ArrowRight,
  Loader2,
  Sparkles,
  Users,
  Send,
  MessageCircle,
  Brain,
  Target,
} from 'lucide-react'
import Link from 'next/link'
import { toast } from 'sonner'
import { Progress } from '@/components/ui/progress'

interface Proposal {
  projectName: string
  positioning: string
  targetUsers?: string
  coreValue?: string
  features: Array<{
    id: string
    name: string
    description: string
    priority: string
    approved: boolean
    expertNotes?: string
  }>
  techStack: {
    frontend: string[]
    backend: string[]
    database: string[]
  }
  externalTools?: Array<{
    name: string
    purpose: string
    pricing: string
    monthlyFee: number
    required: boolean
    freeAlternative?: string
  }>
  risks: string[]
  recommendations: string[]
  keyDecisions?: string[]
  openQuestions?: string[]
  estimatedComplexity: string
  estimatedPrice: number
  tokenUsage?: number
}

export default function DiscussPage() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const messagesEndRef = useRef<HTMLDivElement>(null)

  const [experts, setExperts] = useState<Expert[]>(CORE_EXPERTS)
  const [messages, setMessages] = useState<DiscussionMessage[]>([])
  const [currentPhase, setCurrentPhase] = useState<DiscussionPhase>('understanding')
  const [speakingExpertId, setSpeakingExpertId] = useState<string>()
  const [isDiscussing, setIsDiscussing] = useState(false)
  const [proposal, setProposal] = useState<Proposal | null>(null)
  const [features, setFeatures] = useState<Feature[]>([])

  // New state for enhanced discussion
  const [currentRound, setCurrentRound] = useState(0)
  const [targetRounds, setTargetRounds] = useState(10)
  const [userInput, setUserInput] = useState('')
  const [canUserSpeak, setCanUserSpeak] = useState(false)
  const [keyInsights, setKeyInsights] = useState<string[]>([])
  const [discussionHistory, setDiscussionHistory] = useState<Array<{
    expertId: string
    content: string
    role?: string
    round?: number
  }>>([])

  // Get data from URL params (passed from create page)
  const requirement = searchParams.get('requirement') || ''
  const featuresParam = searchParams.get('features') || '[]'
  const mode: DiscussionMode = (searchParams.get('mode') as DiscussionMode) || 'brainstorm'

  useEffect(() => {
    try {
      const parsedFeatures = JSON.parse(decodeURIComponent(featuresParam))
      setFeatures(parsedFeatures)
    } catch {
      setFeatures([])
    }
  }, [featuresParam])

  // Auto scroll to bottom
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  const startDiscussion = useCallback(async (userMessage?: string) => {
    if (!requirement || features.length === 0) {
      toast.error('缺少需求信息')
      return
    }

    setIsDiscussing(true)
    setCanUserSpeak(false)

    try {
      const response = await fetch('/api/discuss', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          requirement,
          features: features.map(f => ({
            name: f.name,
            description: f.description,
            priority: f.priority,
          })),
          mode,
          projectType: 'web',
          complexity: 'L2',
          existingHistory: userMessage ? discussionHistory : [],
          userMessage,
        }),
      })

      if (!response.ok) throw new Error('Discussion failed')

      const reader = response.body?.getReader()
      if (!reader) throw new Error('No reader')

      const decoder = new TextDecoder()
      const currentMessages: Map<string, DiscussionMessage> = new Map()

      // Preserve existing messages if continuing
      if (!userMessage) {
        setMessages([])
      }

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
                  setExperts(data.experts.map((e: any) => ({
                    ...e,
                    focus: '',
                    personality: '',
                  })))
                  setTargetRounds(data.targetRounds)
                  setCurrentRound(data.currentRound)
                  break

                case 'phase_start':
                  setCurrentPhase(data.phase)
                  // Enable user input for phases that allow it
                  const phaseConfig = DISCUSSION_PHASES.find(p => p.id === data.phase)
                  setCanUserSpeak(phaseConfig?.allowUserInput || false)
                  break

                case 'round_start':
                  setCurrentRound(data.round)
                  break

                case 'user_message':
                  // Add user message to display
                  const userMsgId = `user-${Date.now()}`
                  currentMessages.set(userMsgId, {
                    id: userMsgId,
                    expertId: 'user',
                    content: data.content,
                    timestamp: new Date(),
                    isStreaming: false,
                    isUser: true,
                  })
                  setMessages(Array.from(currentMessages.values()))
                  break

                case 'orchestrator_decision':
                  if (data.keyInsights) {
                    setKeyInsights(prev => [...prev, ...data.keyInsights].slice(-5))
                  }
                  break

                case 'expert_speaking':
                  setSpeakingExpertId(data.expertId)
                  // Create placeholder message
                  const msgId = `msg-${Date.now()}-${data.expertId}`
                  currentMessages.set(data.expertId + data.round, {
                    id: msgId,
                    expertId: data.expertId,
                    content: '',
                    timestamp: new Date(),
                    isStreaming: true,
                    round: data.round,
                  })
                  setMessages(Array.from(currentMessages.values()))
                  break

                case 'expert_message_delta':
                  const existing = currentMessages.get(data.expertId + data.round)
                  if (existing) {
                    existing.content += data.content
                    setMessages(Array.from(currentMessages.values()))
                  }
                  break

                case 'expert_message_complete':
                  const completed = currentMessages.get(data.expertId + data.round)
                  if (completed) {
                    completed.isStreaming = false
                    completed.content = data.content
                    setMessages(Array.from(currentMessages.values()))
                  }
                  setSpeakingExpertId(undefined)

                  // Update history for potential user continuation
                  setDiscussionHistory(prev => [...prev, {
                    expertId: data.expertId,
                    content: data.content,
                    role: 'expert',
                    round: data.round,
                  }])
                  break

                case 'round_complete':
                  setCurrentRound(data.round)
                  // Allow user to speak between rounds in brainstorming
                  if (mode === 'brainstorm' || mode === 'expert') {
                    setCanUserSpeak(true)
                  }
                  break

                case 'phase_converging':
                  toast.info(`讨论收敛: ${data.reason}`)
                  setCanUserSpeak(false)
                  break

                case 'synthesis_start':
                  setCanUserSpeak(false)
                  toast.info('正在综合所有讨论生成方案...')
                  break

                case 'synthesis_complete':
                  if (data.proposal) {
                    setProposal(data.proposal)
                  }
                  break

                case 'discussion_complete':
                  setIsDiscussing(false)
                  setCanUserSpeak(false)
                  if (data.proposal) {
                    toast.success(`讨论完成！共 ${data.totalRounds} 轮讨论`)
                  }
                  break

                case 'error':
                  toast.error(data.message || '讨论出错')
                  setIsDiscussing(false)
                  break
              }
            } catch {
              // JSON parse error, ignore
            }
          }
        }
      }
    } catch (error) {
      console.error('Discussion error:', error)
      toast.error('讨论过程出错，请重试')
      setIsDiscussing(false)
    }
  }, [requirement, features, mode, discussionHistory])

  // Auto-start discussion on mount
  useEffect(() => {
    if (requirement && features.length > 0 && !isDiscussing && messages.length === 0) {
      startDiscussion()
    }
  }, [requirement, features, isDiscussing, messages.length, startDiscussion])

  const handleUserSubmit = () => {
    if (!userInput.trim() || !canUserSpeak || isDiscussing) return

    const userMessage = userInput.trim()
    setUserInput('')

    // Add user message to history
    setDiscussionHistory(prev => [...prev, {
      expertId: 'user',
      content: userMessage,
      role: 'user',
      round: currentRound,
    }])

    // Continue discussion with user input
    startDiscussion(userMessage)
  }

  const handleConfirm = () => {
    if (proposal) {
      // 保存讨论参数到 sessionStorage，方便从确认页返回
      const discussionParams = {
        requirement,
        features: featuresParam,
        mode,
        projectType: searchParams.get('projectType') || 'web',
        complexity: searchParams.get('complexity') || 'L2',
      }
      sessionStorage.setItem('discussionParams', JSON.stringify(discussionParams))

      const proposalParam = encodeURIComponent(JSON.stringify(proposal))
      router.push(`/create/confirm?proposal=${proposalParam}`)
    }
  }

  const progressPercent = targetRounds > 0 ? Math.min((currentRound / targetRounds) * 100, 100) : 0

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b sticky top-0 z-50 bg-background/80 backdrop-blur-sm">
        <div className="container mx-auto px-4 h-14 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Link href="/create">
              <Button variant="ghost" size="icon">
                <ArrowLeft className="h-4 w-4" />
              </Button>
            </Link>
            <div className="flex items-center gap-2">
              <Brain className="h-5 w-5 text-primary" />
              <span className="font-semibold">专家讨论</span>
            </div>
            <Badge variant="secondary" className="hidden sm:inline-flex">
              {DISCUSSION_MODES[mode].name}
            </Badge>
            {mode === 'brainstorm' && (
              <Badge variant="outline" className="hidden sm:inline-flex">
                目标 {targetRounds} 轮深度讨论
              </Badge>
            )}
          </div>
          <Button onClick={handleConfirm} disabled={!proposal || isDiscussing}>
            {isDiscussing ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                讨论中...
              </>
            ) : (
              <>
                确认方案
                <ArrowRight className="ml-2 h-4 w-4" />
              </>
            )}
          </Button>
        </div>
      </header>

      {/* Progress Bar */}
      <div className="border-b bg-muted/30">
        <div className="container mx-auto px-4 py-3">
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-2">
              {DISCUSSION_PHASES.filter(p =>
                DISCUSSION_MODES[mode].phases.includes(p.id)
              ).map((phase, index) => (
                <div key={phase.id} className="flex items-center">
                  {index > 0 && <div className="w-4 h-0.5 bg-muted mx-1" />}
                  <Badge
                    variant={
                      phase.id === currentPhase
                        ? 'default'
                        : DISCUSSION_PHASES.findIndex(p => p.id === currentPhase) >
                          DISCUSSION_PHASES.findIndex(p => p.id === phase.id)
                        ? 'secondary'
                        : 'outline'
                    }
                    className="text-xs"
                  >
                    {phase.name}
                  </Badge>
                </div>
              ))}
            </div>
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <MessageCircle className="h-4 w-4" />
              <span>第 {currentRound} 轮</span>
              {targetRounds > 0 && <span>/ {targetRounds}</span>}
            </div>
          </div>
          <Progress value={progressPercent} className="h-1.5" />
        </div>
      </div>

      {/* Main Content */}
      <main className="container mx-auto px-4 py-4">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          {/* Discussion Panel */}
          <div className="lg:col-span-2 flex flex-col" style={{ height: 'calc(100vh - 12rem)' }}>
            <div className="flex-1 overflow-hidden">
              <DiscussionPanel
                experts={experts}
                messages={messages}
                currentPhase={currentPhase}
                speakingExpertId={speakingExpertId}
                className="h-full"
                showRound={mode === 'brainstorm' || mode === 'expert'}
              />
              <div ref={messagesEndRef} />
            </div>

            {/* User Input Area */}
            {(mode === 'brainstorm' || mode === 'expert') && (
              <div className="mt-4 border rounded-lg p-3 bg-muted/30">
                <div className="flex items-center gap-2 mb-2">
                  <Users className="h-4 w-4 text-muted-foreground" />
                  <span className="text-sm text-muted-foreground">
                    {canUserSpeak && !isDiscussing
                      ? '你可以加入讨论，分享你的想法'
                      : '专家讨论中，请稍候...'}
                  </span>
                </div>
                <div className="flex gap-2">
                  <Input
                    value={userInput}
                    onChange={(e) => setUserInput(e.target.value)}
                    placeholder="输入你的想法或补充..."
                    disabled={!canUserSpeak || isDiscussing}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' && !e.shiftKey) {
                        e.preventDefault()
                        handleUserSubmit()
                      }
                    }}
                    className="flex-1"
                  />
                  <Button
                    onClick={handleUserSubmit}
                    disabled={!canUserSpeak || isDiscussing || !userInput.trim()}
                    size="icon"
                  >
                    <Send className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            )}
          </div>

          {/* Right Sidebar */}
          <div className="space-y-4 overflow-y-auto" style={{ maxHeight: 'calc(100vh - 10rem)' }}>
            {/* Key Insights */}
            {keyInsights.length > 0 && (
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-base flex items-center gap-2">
                    <Target className="h-4 w-4 text-primary" />
                    关键洞察
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <ul className="space-y-2 text-sm">
                    {keyInsights.map((insight, index) => (
                      <li key={index} className="flex items-start gap-2">
                        <span className="text-primary">•</span>
                        <span className="text-muted-foreground">{insight}</span>
                      </li>
                    ))}
                  </ul>
                </CardContent>
              </Card>
            )}

            {/* Features */}
            <FeaturePanel features={features} />

            {/* Proposal Summary */}
            {proposal && (
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-base flex items-center gap-2">
                    <Sparkles className="h-4 w-4 text-primary" />
                    方案摘要
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-3 text-sm">
                  <div>
                    <span className="text-muted-foreground">项目名称:</span>
                    <span className="ml-2 font-medium">{proposal.projectName}</span>
                  </div>
                  {proposal.coreValue && (
                    <div>
                      <span className="text-muted-foreground">核心价值:</span>
                      <span className="ml-2">{proposal.coreValue}</span>
                    </div>
                  )}
                  <div>
                    <span className="text-muted-foreground">复杂度:</span>
                    <Badge variant="outline" className="ml-2">
                      {proposal.estimatedComplexity}
                    </Badge>
                  </div>
                  <div>
                    <span className="text-muted-foreground">预估价格:</span>
                    <span className="ml-2 font-bold text-primary">
                      ${proposal.estimatedPrice}
                    </span>
                  </div>
                  <div>
                    <span className="text-muted-foreground">功能数量:</span>
                    <span className="ml-2">{proposal.features?.length || 0} 个</span>
                  </div>

                  {/* External Tools */}
                  {proposal.externalTools && proposal.externalTools.length > 0 && (
                    <div className="pt-2 border-t">
                      <span className="text-muted-foreground text-xs">需要的外部工具:</span>
                      <ul className="mt-1 space-y-1">
                        {proposal.externalTools.filter(t => t.required).map((tool, index) => (
                          <li key={index} className="text-xs flex justify-between">
                            <span>{tool.name}</span>
                            <span className={tool.pricing === '免费' ? 'text-green-600' : 'text-orange-600'}>
                              {tool.pricing === '免费' ? '免费' : `$${tool.monthlyFee}/月`}
                            </span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}

                  {/* Key Decisions */}
                  {proposal.keyDecisions && proposal.keyDecisions.length > 0 && (
                    <div className="pt-2 border-t">
                      <span className="text-muted-foreground text-xs">关键决策:</span>
                      <ul className="mt-1 space-y-1">
                        {proposal.keyDecisions.slice(0, 3).map((decision, index) => (
                          <li key={index} className="text-xs text-muted-foreground">
                            • {decision}
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
                </CardContent>
              </Card>
            )}
          </div>
        </div>
      </main>
    </div>
  )
}
