'use client'

import { useState, useEffect, use } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { MessageSquare, Plus, Clock, Users, Loader2, User, UsersRound, FileText, ArrowLeft } from 'lucide-react'
import { ExecutiveChat, MultiAgentDiscussion } from '@/components/executive'
import { ExecutiveSelector } from '@/components/executive/executive-selector'
import { PhaseBadge } from '@/components/project'
import { EXECUTIVES, type AgentId } from '@/lib/config/executives'
import { PROJECT_PHASES, type ProjectPhase } from '@/lib/config/project-phases'
import { cn } from '@/lib/utils'
import { trpc } from '@/lib/trpc/client'
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
  const [discussionMode, setDiscussionMode] = useState<'single' | 'multi'>('single')
  const [isMultiAgentActive, setIsMultiAgentActive] = useState(false)

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

  // Start a new discussion
  const handleStartDiscussion = async () => {
    if (!topic.trim()) return

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
                    {/* Discussion Mode Toggle */}
                    <div className="flex gap-2">
                      <Button
                        variant={discussionMode === 'single' ? 'default' : 'outline'}
                        size="sm"
                        className="flex-1"
                        onClick={() => setDiscussionMode('single')}
                      >
                        <User className="h-4 w-4 mr-1" />
                        单人对话
                      </Button>
                      <Button
                        variant={discussionMode === 'multi' ? 'default' : 'outline'}
                        size="sm"
                        className="flex-1"
                        onClick={() => setDiscussionMode('multi')}
                      >
                        <UsersRound className="h-4 w-4 mr-1" />
                        多人讨论
                      </Button>
                    </div>

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
                      disabled={!topic.trim() || isCreating || (discussionMode === 'single' && !selectedAgent)}
                    >
                      {isCreating ? (
                        <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      ) : discussionMode === 'multi' ? (
                        <UsersRound className="h-4 w-4 mr-2" />
                      ) : (
                        <MessageSquare className="h-4 w-4 mr-2" />
                      )}
                      {discussionMode === 'multi' ? '开始多人讨论' : '开始对话'}
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
                    <Users className="h-12 w-12 mx-auto mb-4 text-muted-foreground opacity-50" />
                    <h3 className="font-medium mb-2">选择一位高管开始对话</h3>
                    <p className="text-sm text-muted-foreground max-w-sm">
                      从左侧选择一位高管进行快速咨询，或发起多人讨论
                    </p>
                  </div>
                </CardContent>
              )}
            </Card>

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
    </div>
  )
}
