'use client'

import { useState, useEffect, useCallback } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
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
import { ArrowLeft, ArrowRight, Loader2, Sparkles, Users } from 'lucide-react'
import Link from 'next/link'
import { toast } from 'sonner'

interface Proposal {
  projectName: string
  positioning: string
  features: Array<{
    id: string
    name: string
    description: string
    priority: string
    approved: boolean
  }>
  techStack: {
    frontend: string[]
    backend: string[]
    database: string[]
  }
  risks: string[]
  recommendations: string[]
  estimatedComplexity: string
  estimatedPrice: number
}

export default function DiscussPage() {
  const router = useRouter()
  const searchParams = useSearchParams()

  const [experts, setExperts] = useState<Expert[]>(CORE_EXPERTS)
  const [messages, setMessages] = useState<DiscussionMessage[]>([])
  const [currentPhase, setCurrentPhase] = useState<DiscussionPhase>('understanding')
  const [speakingExpertId, setSpeakingExpertId] = useState<string>()
  const [isDiscussing, setIsDiscussing] = useState(false)
  const [proposal, setProposal] = useState<Proposal | null>(null)
  const [features, setFeatures] = useState<Feature[]>([])

  // Get data from URL params (passed from create page)
  const requirement = searchParams.get('requirement') || ''
  const featuresParam = searchParams.get('features') || '[]'
  const mode: DiscussionMode = (searchParams.get('mode') as DiscussionMode) || 'standard'

  useEffect(() => {
    try {
      const parsedFeatures = JSON.parse(decodeURIComponent(featuresParam))
      setFeatures(parsedFeatures)
    } catch {
      setFeatures([])
    }
  }, [featuresParam])

  const startDiscussion = useCallback(async () => {
    if (!requirement || features.length === 0) {
      toast.error('缺少需求信息')
      return
    }

    setIsDiscussing(true)
    setMessages([])

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
        }),
      })

      if (!response.ok) throw new Error('Discussion failed')

      const reader = response.body?.getReader()
      if (!reader) throw new Error('No reader')

      const decoder = new TextDecoder()
      const currentMessages: Map<string, DiscussionMessage> = new Map()

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
                case 'phase_start':
                  setCurrentPhase(data.phase)
                  break

                case 'expert_speaking':
                  setSpeakingExpertId(data.expertId)
                  // Create placeholder message
                  const msgId = `msg-${Date.now()}-${data.expertId}`
                  currentMessages.set(data.expertId, {
                    id: msgId,
                    expertId: data.expertId,
                    content: '',
                    timestamp: new Date(),
                    isStreaming: true,
                  })
                  setMessages(Array.from(currentMessages.values()))
                  break

                case 'expert_message_delta':
                  const existing = currentMessages.get(data.expertId)
                  if (existing) {
                    existing.content += data.content
                    setMessages(Array.from(currentMessages.values()))
                  }
                  break

                case 'expert_message_complete':
                  const completed = currentMessages.get(data.expertId)
                  if (completed) {
                    completed.isStreaming = false
                    completed.content = data.content
                    setMessages(Array.from(currentMessages.values()))
                  }
                  setSpeakingExpertId(undefined)
                  break

                case 'synthesis_complete':
                  if (data.proposal) {
                    setProposal(data.proposal)
                  }
                  break

                case 'discussion_complete':
                  setIsDiscussing(false)
                  if (data.proposal) {
                    toast.success('讨论完成！方案已生成')
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
  }, [requirement, features, mode])

  // Auto-start discussion on mount
  useEffect(() => {
    if (requirement && features.length > 0 && !isDiscussing && messages.length === 0) {
      startDiscussion()
    }
  }, [requirement, features, isDiscussing, messages.length, startDiscussion])

  const handleConfirm = () => {
    if (proposal) {
      const proposalParam = encodeURIComponent(JSON.stringify(proposal))
      router.push(`/create/confirm?proposal=${proposalParam}`)
    }
  }

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
              <Users className="h-5 w-5 text-primary" />
              <span className="font-semibold">专家讨论</span>
            </div>
            <Badge variant="secondary">{DISCUSSION_MODES[mode].name}</Badge>
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
        <div className="container mx-auto px-4 py-2">
          <div className="flex items-center gap-2">
            {DISCUSSION_PHASES.filter(p =>
              DISCUSSION_MODES[mode].phases.includes(p.id)
            ).map((phase, index) => (
              <div key={phase.id} className="flex items-center">
                {index > 0 && <div className="w-8 h-0.5 bg-muted mx-2" />}
                <Badge
                  variant={
                    phase.id === currentPhase
                      ? 'default'
                      : DISCUSSION_PHASES.findIndex(p => p.id === currentPhase) >
                        DISCUSSION_PHASES.findIndex(p => p.id === phase.id)
                      ? 'secondary'
                      : 'outline'
                  }
                >
                  {phase.name}
                </Badge>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Main Content */}
      <main className="container mx-auto px-4 py-4">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 h-[calc(100vh-10rem)]">
          {/* Discussion Panel */}
          <div className="lg:col-span-2">
            <DiscussionPanel
              experts={experts}
              messages={messages}
              currentPhase={currentPhase}
              speakingExpertId={speakingExpertId}
              className="h-full"
            />
          </div>

          {/* Right Sidebar */}
          <div className="space-y-4">
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
                </CardContent>
              </Card>
            )}
          </div>
        </div>
      </main>
    </div>
  )
}
