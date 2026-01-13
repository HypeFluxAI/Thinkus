'use client'

import { useState, useEffect, use, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import {
  MessageSquare,
  Plus,
  Clock,
  Users,
  Loader2,
  User,
  UsersRound,
  FileText,
  ArrowLeft,
  Brain,
  Sparkles,
  Send,
  Shield,
  Play,
  RotateCcw,
} from 'lucide-react'
import {
  ExecutiveChat,
  MultiAgentDiscussion,
  ExecutiveDiscussionPanel,
  DiscussionSummaryPanel,
  ExecutiveAvatarStack,
  DecisionConfirmDialog,
} from '@/components/executive'
import { ExecutiveSelector } from '@/components/executive/executive-selector'
import {
  DiscussionModeSelector,
  InteractionModeSelector,
  DISCUSSION_MODES,
  type DiscussionMode as DepthMode,
} from '@/components/discussion'
import { PhaseBadge } from '@/components/project'
import { EXECUTIVES, type AgentId } from '@/lib/config/executives'
import { PROJECT_PHASES, type ProjectPhase } from '@/lib/config/project-phases'
import { DECISION_LEVEL_DESCRIPTIONS, type DecisionLevel } from '@/lib/config/ai-executives'
import { cn } from '@/lib/utils'
import { trpc } from '@/lib/trpc/client'
import { toast } from 'sonner'
import { useAutonomousDiscussion, DecisionClassification } from '@/hooks/use-autonomous-discussion'
import type { IProject } from '@/lib/db/models/project'

// Discussion type from API
interface Discussion {
  id: string
  topic: string
  participants: AgentId[]
  messageCount: number
  status: 'active' | 'concluded' | 'cancelled'
  createdAt: string
  concludedAt?: string
}

export default function ProjectDiscussPage({ params }: { params: Promise<{ id: string }> }) {
  const { id: projectId } = use(params)
  const router = useRouter()
  const [discussions, setDiscussions] = useState<Discussion[]>([])
  const [loadingDiscussions, setLoadingDiscussions] = useState(true)
  const [activeTab, setActiveTab] = useState<'new' | 'history'>('new')

  // New discussion state
  const [topic, setTopic] = useState('')
  const [context, setContext] = useState('')
  const [selectedParticipants, setSelectedParticipants] = useState<AgentId[]>([])
  const [currentDiscussionId, setCurrentDiscussionId] = useState<string | null>(null)
  const [selectedAgent, setSelectedAgent] = useState<AgentId | null>(null)
  const [isCreating, setIsCreating] = useState(false)
  const [discussionMode, setDiscussionMode] = useState<'single' | 'multi' | 'autonomous'>('autonomous')
  const [depthMode, setDepthMode] = useState<DepthMode>('standard')
  const [isMultiAgentActive, setIsMultiAgentActive] = useState(false)
  const [autonomousUserInput, setAutonomousUserInput] = useState('')

  // 决策确认对话框
  const [confirmDialog, setConfirmDialog] = useState<{
    open: boolean
    decision: DecisionClassification | null
  }>({ open: false, decision: null })

  // AI自治讨论 Hook
  const autonomousDiscussion = useAutonomousDiscussion({
    onDecisionClassified: (classification) => {
      if (classification.level === 'L2_CONFIRM' || classification.level === 'L3_CRITICAL') {
        setConfirmDialog({ open: true, decision: classification })
      }
    },
    onSummaryComplete: () => {
      toast.success('讨论总结已生成')
    },
    onError: (error) => {
      toast.error(error)
    },
  })

  // Fetch project data
  const { data: projectData, isLoading: projectLoading, error: projectError } = trpc.project.getById.useQuery({ id: projectId })
  const project = projectData?.project as unknown as IProject | undefined

  // Fetch discussions
  useEffect(() => {
    async function fetchDiscussions() {
      try {
        const res = await fetch(`/api/discussions?projectId=${projectId}`)
        if (res.ok) {
          const data = await res.json()
          setDiscussions(data.discussions || [])
        }
      } catch (error) {
        console.error('Failed to fetch discussions:', error)
      } finally {
        setLoadingDiscussions(false)
      }
    }

    fetchDiscussions()
  }, [projectId])

  // Get recommended participants based on project phase
  const phaseConfig = project?.phase ? PROJECT_PHASES[project.phase] : null
  const recommendedParticipants = phaseConfig?.coreAgents || ['alex', 'bella', 'chloe'] as AgentId[]

  // 开始AI自治讨论
  const handleStartAutonomousDiscussion = useCallback(() => {
    if (!topic.trim()) {
      toast.error('请输入讨论主题')
      return
    }

    const phase = project?.phase || 'development'
    const discussionParticipants = selectedParticipants.length > 0
      ? selectedParticipants
      : PROJECT_PHASES[phase]?.coreAgents || ['mike', 'david', 'elena'] as AgentId[]

    autonomousDiscussion.startDiscussion({
      topic: topic.trim(),
      description: context.trim() || undefined,
      projectPhase: phase as any,
      participants: discussionParticipants,
      maxRounds: DISCUSSION_MODES[depthMode].rounds,
    })
  }, [topic, context, selectedParticipants, project?.phase, autonomousDiscussion, depthMode])

  // 用户在自治讨论中发言
  const handleAutonomousUserSubmit = useCallback(() => {
    if (!autonomousUserInput.trim() || autonomousDiscussion.isDiscussing) return

    autonomousDiscussion.continueDiscussion(autonomousUserInput.trim())
    setAutonomousUserInput('')
  }, [autonomousUserInput, autonomousDiscussion])

  // 重新开始自治讨论
  const handleAutonomousRestart = useCallback(() => {
    autonomousDiscussion.clearDiscussion()
    setTopic('')
    setContext('')
  }, [autonomousDiscussion])

  // 决策确认处理
  const handleDecisionApprove = async (decisionId: string, notes?: string) => {
    try {
      await fetch('/api/executives/dashboard', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'approve', decisionId, notes }),
      })
      toast.success('决策已批准')
    } catch {
      toast.error('操作失败')
    }
  }

  const handleDecisionReject = async (decisionId: string, reason?: string) => {
    try {
      await fetch('/api/executives/dashboard', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'reject', decisionId, reason }),
      })
      toast.success('决策已拒绝')
    } catch {
      toast.error('操作失败')
    }
  }

  // Start a new discussion
  const handleStartDiscussion = async () => {
    if (!topic.trim()) return

    // AI自治模式
    if (discussionMode === 'autonomous') {
      handleStartAutonomousDiscussion()
      return
    }

    if (discussionMode === 'multi') {
      // Multi-agent mode - activate the multi-agent discussion component
      setIsMultiAgentActive(true)
      setSelectedAgent(null)
      return
    }

    setIsCreating(true)

    try {
      const response = await fetch('/api/discussion/start', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          projectId,
          topic,
          context,
          participants: selectedParticipants.length > 0 ? selectedParticipants : undefined,
          autoSchedule: selectedParticipants.length === 0,
        }),
      })

      if (response.ok) {
        const data = await response.json()
        setCurrentDiscussionId(data.discussion.id)
        // Set the first participant as the selected agent for chat
        if (data.discussion.participants.length > 0) {
          setSelectedAgent(data.discussion.participants[0])
        }
        // Add to discussions list
        setDiscussions(prev => [{
          id: data.discussion.id,
          topic: data.discussion.topic,
          participants: data.discussion.participants,
          messageCount: 0,
          status: 'active',
          createdAt: new Date().toISOString(),
        }, ...prev])
      }
    } catch (error) {
      console.error('Failed to start discussion:', error)
    } finally {
      setIsCreating(false)
    }
  }

  // Start chat with a single executive
  const handleStartSingleChat = (agentId: AgentId) => {
    setSelectedAgent(agentId)
    setCurrentDiscussionId(null)
  }

  if (projectLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    )
  }

  if (projectError || !project) {
    return (
      <div className="min-h-screen bg-background flex flex-col items-center justify-center">
        <FileText className="h-12 w-12 text-muted-foreground mb-4" />
        <h2 className="text-xl font-semibold mb-2">项目不存在</h2>
        <p className="text-muted-foreground mb-4">该项目可能已被删除或您没有访问权限</p>
        <Button onClick={() => router.push('/projects')}>
          <ArrowLeft className="h-4 w-4 mr-2" />
          返回项目列表
        </Button>
      </div>
    )
  }

  return (
    <div className="bg-background">
      {/* Page Header */}
      <div className="border-b bg-muted/30">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center gap-3">
            <MessageSquare className="h-5 w-5 text-primary" />
            <h1 className="font-semibold text-lg">项目讨论</h1>
            <span className="text-muted-foreground">-</span>
            <span className="text-muted-foreground">{project.name}</span>
            <PhaseBadge phase={project.phase} size="sm" />
          </div>
          <p className="text-sm text-muted-foreground mt-1">
            与 AI 高管团队进行一对一或多人讨论
          </p>
        </div>
      </div>

      <main className="container mx-auto px-4 py-6">
        <div className="grid lg:grid-cols-3 gap-6">
          {/* Left Panel - Discussion List / New Discussion */}
          <div className="lg:col-span-1 space-y-4">
            <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as 'new' | 'history')}>
              <TabsList className="grid w-full grid-cols-2">
                <TabsTrigger value="new">
                  <Plus className="h-4 w-4 mr-2" />
                  新讨论
                </TabsTrigger>
                <TabsTrigger value="history">
                  <Clock className="h-4 w-4 mr-2" />
                  历史
                </TabsTrigger>
              </TabsList>

              <TabsContent value="new" className="space-y-4 mt-4">
                {/* Quick Chat with Single Executive */}
                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm">快速咨询</CardTitle>
                    <CardDescription>选择一位高管直接对话</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="flex flex-wrap gap-2">
                      {recommendedParticipants.map(id => {
                        const exec = EXECUTIVES[id]
                        if (!exec) return null
                        return (
                          <Button
                            key={id}
                            variant={selectedAgent === id ? 'default' : 'outline'}
                            size="sm"
                            onClick={() => handleStartSingleChat(id)}
                            className="gap-1"
                            style={{
                              borderColor: selectedAgent !== id ? exec.color : undefined,
                            }}
                          >
                            <span>{exec.avatar}</span>
                            <span>{exec.nameCn}</span>
                          </Button>
                        )
                      })}
                    </div>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="w-full mt-2"
                      onClick={() => setActiveTab('new')}
                    >
                      查看全部高管
                    </Button>
                  </CardContent>
                </Card>

                {/* Start Multi-Agent Discussion */}
                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm">发起讨论</CardTitle>
                    <CardDescription>邀请高管参与讨论</CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    {/* Interaction Mode Toggle */}
                    <div>
                      <label className="text-xs font-medium text-muted-foreground mb-1.5 block">互动模式</label>
                      <InteractionModeSelector
                        value={discussionMode}
                        onChange={setDiscussionMode}
                      />
                    </div>

                    {/* Discussion Depth Mode (only for autonomous) */}
                    {discussionMode === 'autonomous' && (
                      <div>
                        <label className="text-xs font-medium text-muted-foreground mb-1.5 block">讨论深度</label>
                        <DiscussionModeSelector
                          value={depthMode}
                          onChange={setDepthMode}
                          showDetails={false}
                          compact
                        />
                      </div>
                    )}

                    <div>
                      <label className="text-sm font-medium">讨论主题</label>
                      <Input
                        placeholder="例如：支付方案选型"
                        value={topic}
                        onChange={(e) => setTopic(e.target.value)}
                        className="mt-1"
                      />
                    </div>
                    <div>
                      <label className="text-sm font-medium">背景说明 (可选)</label>
                      <Textarea
                        placeholder="提供更多背景信息..."
                        value={context}
                        onChange={(e) => setContext(e.target.value)}
                        className="mt-1"
                        rows={3}
                      />
                    </div>

                    {discussionMode === 'multi' && (
                      <div>
                        <label className="text-sm font-medium mb-2 block">
                          选择参与者 (可选，不选则自动调度)
                        </label>
                        <ExecutiveSelector
                          multiSelect
                          selectedIds={selectedParticipants}
                          onMultiSelect={setSelectedParticipants}
                          onSelect={() => {}}
                          recommendedIds={recommendedParticipants}
                        />
                      </div>
                    )}

                    {discussionMode === 'single' && (
                      <div>
                        <label className="text-sm font-medium mb-2 block">
                          选择高管
                        </label>
                        <ExecutiveSelector
                          selectedId={selectedAgent || undefined}
                          onSelect={(id) => setSelectedAgent(id)}
                          recommendedIds={recommendedParticipants}
                        />
                      </div>
                    )}

                    <Button
                      className="w-full"
                      onClick={handleStartDiscussion}
                      disabled={
                        !topic.trim() ||
                        isCreating ||
                        autonomousDiscussion.isDiscussing ||
                        (discussionMode === 'single' && !selectedAgent)
                      }
                    >
                      {isCreating || autonomousDiscussion.isDiscussing ? (
                        <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      ) : discussionMode === 'autonomous' ? (
                        <Brain className="h-4 w-4 mr-2" />
                      ) : discussionMode === 'multi' ? (
                        <UsersRound className="h-4 w-4 mr-2" />
                      ) : (
                        <MessageSquare className="h-4 w-4 mr-2" />
                      )}
                      {discussionMode === 'autonomous'
                        ? `开始${DISCUSSION_MODES[depthMode].nameCn}讨论`
                        : discussionMode === 'multi'
                          ? '开始多人讨论'
                          : '开始对话'}
                    </Button>
                  </CardContent>
                </Card>
              </TabsContent>

              <TabsContent value="history" className="mt-4">
                {loadingDiscussions ? (
                  <div className="flex items-center justify-center py-8">
                    <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                  </div>
                ) : (
                  <div className="space-y-3">
                    {discussions.map(discussion => (
                      <Card
                        key={discussion.id}
                        className={cn(
                          'cursor-pointer hover:border-primary/50 transition-colors',
                          currentDiscussionId === discussion.id && 'border-primary'
                        )}
                        onClick={() => {
                          setCurrentDiscussionId(discussion.id)
                          if (discussion.participants.length > 0) {
                            setSelectedAgent(discussion.participants[0])
                          }
                        }}
                      >
                        <CardContent className="p-4">
                          <div className="flex items-start justify-between">
                            <div className="flex-1 min-w-0">
                              <h4 className="font-medium truncate">{discussion.topic}</h4>
                              <div className="flex items-center gap-2 mt-1">
                                <div className="flex -space-x-2">
                                  {discussion.participants.slice(0, 3).map(id => {
                                    const exec = EXECUTIVES[id]
                                    if (!exec) return null
                                    return (
                                      <div
                                        key={id}
                                        className="w-6 h-6 rounded-full flex items-center justify-center text-xs border-2 border-background"
                                        style={{ backgroundColor: exec.color }}
                                        title={exec.nameCn}
                                      >
                                        {exec.avatar}
                                      </div>
                                    )
                                  })}
                                </div>
                                <span className="text-xs text-muted-foreground">
                                  {discussion.messageCount} 条消息
                                </span>
                              </div>
                            </div>
                            <Badge
                              variant={discussion.status === 'active' ? 'default' : 'secondary'}
                            >
                              {discussion.status === 'active' ? '进行中' : '已结束'}
                            </Badge>
                          </div>
                          <div className="text-xs text-muted-foreground mt-2">
                            {new Date(discussion.createdAt).toLocaleDateString('zh-CN')}
                          </div>
                        </CardContent>
                      </Card>
                    ))}

                    {discussions.length === 0 && (
                      <div className="text-center py-8 text-muted-foreground">
                        <MessageSquare className="h-8 w-8 mx-auto mb-2 opacity-50" />
                        <p>还没有讨论记录</p>
                      </div>
                    )}
                  </div>
                )}
              </TabsContent>
            </Tabs>
          </div>

          {/* Right Panel - Chat Interface */}
          <div className="lg:col-span-2">
            {/* AI自治讨论面板 */}
            {discussionMode === 'autonomous' && (autonomousDiscussion.messages.length > 0 || autonomousDiscussion.isDiscussing) ? (
              <div className="space-y-4">
                {/* 讨论状态栏 */}
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Brain className="h-5 w-5 text-primary" />
                    <span className="font-medium">AI自治讨论</span>
                    <Badge variant="outline">
                      第 {autonomousDiscussion.currentRound} / {autonomousDiscussion.maxRounds} 轮
                    </Badge>
                    {autonomousDiscussion.consensusLevel > 0 && (
                      <Badge variant="secondary">共识度 {autonomousDiscussion.consensusLevel}%</Badge>
                    )}
                  </div>
                  <div className="flex items-center gap-2">
                    {autonomousDiscussion.isDiscussing && (
                      <Button variant="outline" size="sm" onClick={autonomousDiscussion.stopDiscussion}>
                        停止讨论
                      </Button>
                    )}
                    {!autonomousDiscussion.isDiscussing && (
                      <Button variant="outline" size="sm" onClick={handleAutonomousRestart}>
                        <RotateCcw className="h-4 w-4 mr-2" />
                        重新开始
                      </Button>
                    )}
                  </div>
                </div>

                {/* 讨论主面板 */}
                <div className="grid grid-cols-1 xl:grid-cols-3 gap-4">
                  <div className="xl:col-span-2 space-y-4">
                    <Card className="h-[calc(100vh-18rem)]">
                      <ExecutiveDiscussionPanel
                        messages={autonomousDiscussion.messages}
                        participants={autonomousDiscussion.participants}
                        currentRound={autonomousDiscussion.currentRound}
                        maxRounds={autonomousDiscussion.maxRounds}
                        speakingAgentId={autonomousDiscussion.speakingAgentId}
                        consensusLevel={autonomousDiscussion.consensusLevel}
                        keyInsights={autonomousDiscussion.keyInsights}
                        className="h-full"
                      />
                    </Card>

                    {/* 用户输入 */}
                    <Card>
                      <CardContent className="p-4">
                        <div className="flex items-center gap-2 mb-3">
                          <Users className="h-4 w-4 text-muted-foreground" />
                          <span className="text-sm text-muted-foreground">
                            {autonomousDiscussion.isDiscussing
                              ? '高管讨论中，请稍候...'
                              : '你可以加入讨论，提出问题或补充信息'}
                          </span>
                        </div>
                        <div className="flex gap-2">
                          <Input
                            value={autonomousUserInput}
                            onChange={(e) => setAutonomousUserInput(e.target.value)}
                            placeholder="输入你的想法或问题..."
                            disabled={autonomousDiscussion.isDiscussing}
                            onKeyDown={(e) => {
                              if (e.key === 'Enter' && !e.shiftKey) {
                                e.preventDefault()
                                handleAutonomousUserSubmit()
                              }
                            }}
                            className="flex-1"
                          />
                          <Button
                            onClick={handleAutonomousUserSubmit}
                            disabled={autonomousDiscussion.isDiscussing || !autonomousUserInput.trim()}
                          >
                            <Send className="h-4 w-4" />
                          </Button>
                        </div>
                      </CardContent>
                    </Card>
                  </div>

                  {/* 右侧边栏 - 决策和总结 */}
                  <div className="space-y-4 overflow-y-auto" style={{ maxHeight: 'calc(100vh - 14rem)' }}>
                    {/* 决策结果 */}
                    {autonomousDiscussion.decisions.length > 0 && (
                      <Card>
                        <CardHeader className="pb-2">
                          <CardTitle className="text-base flex items-center gap-2">
                            <Shield className="h-4 w-4 text-primary" />
                            决策分级
                          </CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-2">
                          {autonomousDiscussion.decisions.map((d, idx) => {
                            const levelConfig = DECISION_LEVEL_DESCRIPTIONS[d.level]
                            return (
                              <div key={idx} className="p-2 rounded border text-sm">
                                <div className="flex items-start justify-between gap-2 mb-1">
                                  <span className="flex-1">{d.decision}</span>
                                  <Badge
                                    variant={d.level === 'L3_CRITICAL' ? 'destructive' : d.level === 'L2_CONFIRM' ? 'default' : 'secondary'}
                                    className="shrink-0"
                                  >
                                    {levelConfig?.name}
                                  </Badge>
                                </div>
                                <span className="text-xs text-muted-foreground">风险: {d.score}/100</span>
                              </div>
                            )
                          })}
                        </CardContent>
                      </Card>
                    )}

                    {/* 讨论总结 */}
                    {autonomousDiscussion.summary && (
                      <DiscussionSummaryPanel summary={autonomousDiscussion.summary} />
                    )}
                  </div>
                </div>
              </div>
            ) : (
              <Card className="h-[calc(100vh-10rem)]">
                {isMultiAgentActive ? (
                  <MultiAgentDiscussion
                    projectId={projectId}
                    topic={topic}
                    context={context}
                    participants={selectedParticipants.length > 0 ? selectedParticipants : undefined}
                    autoSchedule={selectedParticipants.length === 0}
                    onComplete={(summary) => {
                      console.log('Discussion completed:', summary)
                      setIsMultiAgentActive(false)
                    }}
                    className="h-full"
                  />
                ) : selectedAgent ? (
                  <ExecutiveChat
                    agentId={selectedAgent}
                    projectId={projectId}
                    discussionId={currentDiscussionId || undefined}
                    context={context}
                    placeholder={`向 ${EXECUTIVES[selectedAgent].nameCn} 提问...`}
                    className="h-full"
                  />
                ) : (
                  <CardContent className="h-full flex items-center justify-center">
                    <div className="text-center">
                      {discussionMode === 'autonomous' ? (
                        <>
                          <Brain className="h-12 w-12 mx-auto mb-4 text-primary opacity-50" />
                          <h3 className="font-medium mb-2">AI自治讨论</h3>
                          <p className="text-sm text-muted-foreground max-w-sm">
                            在左侧输入讨论主题，高管团队将自主进行深度讨论
                          </p>
                        </>
                      ) : (
                        <>
                          <Users className="h-12 w-12 mx-auto mb-4 text-muted-foreground opacity-50" />
                          <h3 className="font-medium mb-2">选择一位高管开始对话</h3>
                          <p className="text-sm text-muted-foreground max-w-sm">
                            从左侧选择一位高管进行快速咨询，或发起多人讨论
                          </p>
                        </>
                      )}
                    </div>
                  </CardContent>
                )}
              </Card>
            )}

            {/* Participant Switcher (when in discussion) */}
            {currentDiscussionId && selectedAgent && !isMultiAgentActive && (
              <div className="mt-4 flex items-center gap-2">
                <span className="text-sm text-muted-foreground">切换高管:</span>
                <div className="flex gap-2">
                  {(discussions.find(d => d.id === currentDiscussionId)?.participants || []).map(id => {
                    const exec = EXECUTIVES[id]
                    if (!exec) return null
                    return (
                      <Button
                        key={id}
                        variant={selectedAgent === id ? 'default' : 'outline'}
                        size="sm"
                        onClick={() => setSelectedAgent(id)}
                        style={{
                          backgroundColor: selectedAgent === id ? exec.color : undefined,
                        }}
                      >
                        <span className="mr-1">{exec.avatar}</span>
                        {exec.nameCn}
                      </Button>
                    )
                  })}
                </div>
              </div>
            )}
          </div>
        </div>
      </main>

      {/* 决策确认对话框 */}
      {confirmDialog.decision && (
        <DecisionConfirmDialog
          open={confirmDialog.open}
          onOpenChange={(open) => setConfirmDialog({ ...confirmDialog, open })}
          decision={{
            id: `decision-${Date.now()}`,
            title: confirmDialog.decision.decision,
            description: `风险评分: ${confirmDialog.decision.score}/100`,
            level: confirmDialog.decision.level,
            proposedBy: 'mike' as AgentId,
            proposedAction: confirmDialog.decision.decision,
            riskFactors: confirmDialog.decision.factors,
            projectName: project?.name,
          }}
          onApprove={handleDecisionApprove}
          onReject={handleDecisionReject}
        />
      )}
    </div>
  )
}
