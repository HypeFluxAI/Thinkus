'use client'

import { useState, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { ChatInterface, Message } from '@/components/chat/chat-interface'
import { FeaturePanel, Feature } from '@/components/chat/feature-panel'
import { ArrowLeft, Users, Sparkles } from 'lucide-react'
import Link from 'next/link'
import { trpc } from '@/lib/trpc/client'
import { toast } from 'sonner'

export default function CreateProjectPage() {
  const router = useRouter()
  const [messages, setMessages] = useState<Message[]>([])
  const [features, setFeatures] = useState<Feature[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [isAnalyzing, setIsAnalyzing] = useState(false)
  const [projectId, setProjectId] = useState<string | null>(null)

  const createProjectMutation = trpc.project.create.useMutation()

  const extractFeatures = (text: string): Feature[] => {
    const jsonMatch = text.match(/```json\s*([\s\S]*?)\s*```/)
    if (jsonMatch) {
      try {
        const data = JSON.parse(jsonMatch[1])
        if (data.features && Array.isArray(data.features)) {
          return data.features.map((f: { name: string; description: string; priority: string }, index: number) => ({
            id: `feature-${Date.now()}-${index}`,
            name: f.name,
            description: f.description,
            priority: f.priority as 'P0' | 'P1' | 'P2',
            status: 'identified' as const,
          }))
        }
      } catch {
        // JSON parse failed, ignore
      }
    }
    return []
  }

  const cleanResponse = (text: string): string => {
    return text.replace(/```json[\s\S]*?```/g, '').trim()
  }

  const handleSendMessage = useCallback(async (content: string) => {
    // Create project if not exists
    if (!projectId) {
      try {
        const result = await createProjectMutation.mutateAsync({
          name: '新项目',
          requirement: content,
        })
        setProjectId(result.project._id.toString())
      } catch (error) {
        toast.error('创建项目失败')
        return
      }
    }

    const userMessage: Message = {
      id: `user-${Date.now()}`,
      role: 'user',
      content,
    }

    setMessages((prev) => [...prev, userMessage])
    setIsLoading(true)
    setIsAnalyzing(true)

    const assistantMessage: Message = {
      id: `assistant-${Date.now()}`,
      role: 'assistant',
      content: '',
      speaker: '小T',
      isStreaming: true,
    }

    setMessages((prev) => [...prev, assistantMessage])

    try {
      const response = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          messages: [...messages, userMessage].map((m) => ({
            role: m.role,
            content: m.content,
          })),
          projectId,
        }),
      })

      if (!response.ok) {
        throw new Error('Chat request failed')
      }

      const reader = response.body?.getReader()
      if (!reader) throw new Error('No reader')

      const decoder = new TextDecoder()
      let fullContent = ''

      while (true) {
        const { done, value } = await reader.read()
        if (done) break

        const chunk = decoder.decode(value)
        const lines = chunk.split('\n')

        for (const line of lines) {
          if (line.startsWith('data: ')) {
            try {
              const data = JSON.parse(line.slice(6))
              if (data.type === 'text') {
                fullContent += data.content
                setMessages((prev) =>
                  prev.map((m) =>
                    m.id === assistantMessage.id
                      ? { ...m, content: cleanResponse(fullContent) }
                      : m
                  )
                )
              } else if (data.type === 'done') {
                // Extract features from complete response
                const newFeatures = extractFeatures(fullContent)
                if (newFeatures.length > 0) {
                  setFeatures((prev) => {
                    const existingIds = new Set(prev.map((f) => f.name))
                    const uniqueNewFeatures = newFeatures.filter(
                      (f) => !existingIds.has(f.name)
                    )
                    return [...prev, ...uniqueNewFeatures]
                  })
                }
              }
            } catch {
              // JSON parse error, ignore
            }
          }
        }
      }

      // Mark message as complete
      setMessages((prev) =>
        prev.map((m) =>
          m.id === assistantMessage.id
            ? { ...m, content: cleanResponse(fullContent), isStreaming: false }
            : m
        )
      )
    } catch (error) {
      console.error('Chat error:', error)
      toast.error('发送消息失败，请重试')
      setMessages((prev) => prev.filter((m) => m.id !== assistantMessage.id))
    } finally {
      setIsLoading(false)
      setIsAnalyzing(false)
    }
  }, [messages, projectId, createProjectMutation])

  const handleStartDiscussion = () => {
    if (features.length === 0) {
      toast.error('请先描述您的需求，让AI识别功能')
      return
    }
    // Collect all user messages as requirement
    const requirement = messages
      .filter((m) => m.role === 'user')
      .map((m) => m.content)
      .join('\n')

    // Navigate to expert discussion page with parameters
    const featuresParam = encodeURIComponent(JSON.stringify(features))
    router.push(
      `/create/discuss?requirement=${encodeURIComponent(requirement)}&features=${featuresParam}&mode=standard`
    )
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b sticky top-0 z-50 bg-background/80 backdrop-blur-sm">
        <div className="container mx-auto px-4 h-14 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Link href="/dashboard">
              <Button variant="ghost" size="icon">
                <ArrowLeft className="h-4 w-4" />
              </Button>
            </Link>
            <div className="flex items-center gap-2">
              <Sparkles className="h-5 w-5 text-primary" />
              <span className="font-semibold">创建新项目</span>
            </div>
          </div>
          <Button
            onClick={handleStartDiscussion}
            disabled={features.length === 0}
          >
            <Users className="mr-2 h-4 w-4" />
            开始专家讨论
          </Button>
        </div>
      </header>

      {/* Main Content */}
      <main className="container mx-auto px-4 py-4">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 h-[calc(100vh-8rem)]">
          {/* Chat Panel */}
          <div className="lg:col-span-2 border rounded-lg overflow-hidden bg-card">
            <ChatInterface
              messages={messages}
              onSendMessage={handleSendMessage}
              isLoading={isLoading}
              placeholder="描述你想做的产品，比如：我想做一个宠物电商平台..."
            />
          </div>

          {/* Feature Panel */}
          <div className="hidden lg:block">
            <FeaturePanel features={features} isAnalyzing={isAnalyzing} />
          </div>
        </div>
      </main>
    </div>
  )
}
