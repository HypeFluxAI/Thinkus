'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Skeleton } from '@/components/ui/skeleton'
import { useToast } from '@/components/ui/use-toast'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'
import {
  Users,
  Search,
  Coins,
  MessageCircle,
  Loader2,
  Sparkles,
  Clock,
} from 'lucide-react'
import { DOMAIN_NAMES, type ExpertDomain } from '@/lib/config/external-experts'
import { cn } from '@/lib/utils'

interface Expert {
  id: string
  name: string
  nameCn: string
  title: string
  titleCn: string
  domain: ExpertDomain
  color: string
  avatar: string
  background: string
  expertise: string[]
  consultationFee: number
}

interface ExpertStats {
  total: number
  monthlyCredits: number
  remainingCredits: number
  totalCreditsUsed: number
}

interface ExpertListProps {
  projectId?: string
  onStartConsultation?: (consultationId: string) => void
}

export function ExpertList({ projectId, onStartConsultation }: ExpertListProps) {
  const { toast } = useToast()
  const [experts, setExperts] = useState<Expert[]>([])
  const [stats, setStats] = useState<ExpertStats | null>(null)
  const [loading, setLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedDomain, setSelectedDomain] = useState<ExpertDomain | 'all'>('all')

  // 咨询对话框状态
  const [consultDialogOpen, setConsultDialogOpen] = useState(false)
  const [selectedExpert, setSelectedExpert] = useState<Expert | null>(null)
  const [topic, setTopic] = useState('')
  const [starting, setStarting] = useState(false)

  // 加载专家列表
  useEffect(() => {
    loadExperts()
    loadStats()
  }, [])

  const loadExperts = async () => {
    try {
      setLoading(true)
      const response = await fetch('/api/experts?action=list')
      const data = await response.json()
      if (data.success) {
        setExperts(data.experts || [])
      }
    } catch (error) {
      console.error('Failed to load experts:', error)
      toast({
        title: '加载失败',
        description: '无法加载专家列表',
        variant: 'destructive',
      })
    } finally {
      setLoading(false)
    }
  }

  const loadStats = async () => {
    try {
      const response = await fetch('/api/experts')
      const data = await response.json()
      if (data.success) {
        setStats(data.stats)
      }
    } catch (error) {
      console.error('Failed to load stats:', error)
    }
  }

  // 开始咨询
  const handleStartConsultation = async () => {
    if (!selectedExpert || !topic.trim()) {
      toast({
        title: '请输入咨询主题',
        description: '需要提供咨询主题才能开始',
        variant: 'destructive',
      })
      return
    }

    try {
      setStarting(true)
      const response = await fetch('/api/experts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'start',
          expertId: selectedExpert.id,
          topic,
          projectId,
        }),
      })

      const data = await response.json()

      if (data.success) {
        toast({
          title: '咨询已开始',
          description: `正在与 ${selectedExpert.nameCn} 咨询`,
        })
        setConsultDialogOpen(false)
        setTopic('')
        loadStats()
        if (onStartConsultation) {
          onStartConsultation(data.consultation.id)
        }
      } else {
        if (data.code === 'INSUFFICIENT_CREDITS') {
          toast({
            title: '额度不足',
            description: '您的专家咨询额度已用完，请升级订阅',
            variant: 'destructive',
          })
        } else {
          throw new Error(data.error)
        }
      }
    } catch (error) {
      console.error('Failed to start consultation:', error)
      toast({
        title: '开始失败',
        description: '无法开始咨询',
        variant: 'destructive',
      })
    } finally {
      setStarting(false)
    }
  }

  // 筛选专家
  const filteredExperts = experts.filter((expert) => {
    const matchesSearch =
      searchQuery === '' ||
      expert.nameCn.toLowerCase().includes(searchQuery.toLowerCase()) ||
      expert.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      expert.expertise.some((e) =>
        e.toLowerCase().includes(searchQuery.toLowerCase())
      )
    const matchesDomain = selectedDomain === 'all' || expert.domain === selectedDomain
    return matchesSearch && matchesDomain
  })

  // 获取所有领域
  const domains = Array.from(new Set(experts.map((e) => e.domain)))

  if (loading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-8 w-48" />
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {[1, 2, 3, 4, 5, 6].map((i) => (
            <Skeleton key={i} className="h-48" />
          ))}
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* 头部和统计 */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <Users className="h-6 w-6 text-primary" />
          <div>
            <h2 className="text-xl font-semibold">外部专家</h2>
            <p className="text-sm text-muted-foreground">
              咨询行业顶尖专家获取专业建议
            </p>
          </div>
        </div>
        {stats && (
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2 text-sm">
              <Coins className="h-4 w-4 text-yellow-500" />
              <span>
                剩余额度: <strong>{stats.remainingCredits}</strong> / {stats.monthlyCredits}
              </span>
            </div>
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <MessageCircle className="h-4 w-4" />
              <span>已咨询 {stats.total} 次</span>
            </div>
          </div>
        )}
      </div>

      {/* 搜索和筛选 */}
      <Card>
        <CardContent className="p-4">
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="搜索专家或专业领域..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9"
              />
            </div>
            <div className="flex gap-2 flex-wrap">
              <Button
                variant={selectedDomain === 'all' ? 'default' : 'outline'}
                size="sm"
                onClick={() => setSelectedDomain('all')}
              >
                全部
              </Button>
              {domains.slice(0, 5).map((domain) => (
                <Button
                  key={domain}
                  variant={selectedDomain === domain ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => setSelectedDomain(domain)}
                >
                  {DOMAIN_NAMES[domain]?.cn || domain}
                </Button>
              ))}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* 专家列表 */}
      {filteredExperts.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center">
            <Users className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
            <p className="text-muted-foreground">没有找到匹配的专家</p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredExperts.map((expert) => (
            <Card
              key={expert.id}
              className="cursor-pointer hover:shadow-md transition-shadow"
              onClick={() => {
                setSelectedExpert(expert)
                setConsultDialogOpen(true)
              }}
            >
              <CardHeader className="pb-3">
                <div className="flex items-start gap-3">
                  <div
                    className="w-12 h-12 rounded-full flex items-center justify-center text-2xl"
                    style={{ backgroundColor: `${expert.color}20` }}
                  >
                    {expert.avatar}
                  </div>
                  <div className="flex-1 min-w-0">
                    <CardTitle className="text-base">{expert.nameCn}</CardTitle>
                    <CardDescription className="text-xs">
                      {expert.titleCn}
                    </CardDescription>
                  </div>
                  <Badge
                    variant="secondary"
                    className="shrink-0"
                    style={{ backgroundColor: `${expert.color}20`, color: expert.color }}
                  >
                    {DOMAIN_NAMES[expert.domain]?.cn}
                  </Badge>
                </div>
              </CardHeader>
              <CardContent className="pt-0">
                <p className="text-sm text-muted-foreground line-clamp-2 mb-3">
                  {expert.background}
                </p>
                <div className="flex flex-wrap gap-1 mb-3">
                  {expert.expertise.slice(0, 3).map((skill) => (
                    <Badge key={skill} variant="outline" className="text-xs">
                      {skill}
                    </Badge>
                  ))}
                </div>
                <div className="flex items-center justify-between text-sm">
                  <span className="flex items-center gap-1 text-muted-foreground">
                    <Coins className="h-3 w-3" />
                    {expert.consultationFee} 额度/次
                  </span>
                  <Button size="sm" variant="ghost">
                    <Sparkles className="h-3 w-3 mr-1" />
                    咨询
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* 咨询对话框 */}
      <Dialog open={consultDialogOpen} onOpenChange={setConsultDialogOpen}>
        <DialogContent className="max-w-lg">
          {selectedExpert && (
            <>
              <DialogHeader>
                <div className="flex items-center gap-3 mb-2">
                  <div
                    className="w-12 h-12 rounded-full flex items-center justify-center text-2xl"
                    style={{ backgroundColor: `${selectedExpert.color}20` }}
                  >
                    {selectedExpert.avatar}
                  </div>
                  <div>
                    <DialogTitle>{selectedExpert.nameCn}</DialogTitle>
                    <DialogDescription>{selectedExpert.titleCn}</DialogDescription>
                  </div>
                </div>
              </DialogHeader>

              <div className="space-y-4">
                <div className="text-sm text-muted-foreground">
                  {selectedExpert.background}
                </div>

                <div className="flex flex-wrap gap-1">
                  {selectedExpert.expertise.map((skill) => (
                    <Badge key={skill} variant="outline" className="text-xs">
                      {skill}
                    </Badge>
                  ))}
                </div>

                <div className="space-y-2">
                  <Label>咨询主题</Label>
                  <Textarea
                    placeholder="请描述您想咨询的问题..."
                    value={topic}
                    onChange={(e) => setTopic(e.target.value)}
                    rows={4}
                  />
                </div>

                <div className="flex items-center gap-4 text-sm text-muted-foreground">
                  <span className="flex items-center gap-1">
                    <Coins className="h-4 w-4 text-yellow-500" />
                    消耗 {selectedExpert.consultationFee} 额度
                  </span>
                  <span className="flex items-center gap-1">
                    <Clock className="h-4 w-4" />
                    约 10-15 分钟
                  </span>
                </div>
              </div>

              <DialogFooter>
                <Button variant="outline" onClick={() => setConsultDialogOpen(false)}>
                  取消
                </Button>
                <Button onClick={handleStartConsultation} disabled={starting}>
                  {starting && <Loader2 className="h-4 w-4 mr-1 animate-spin" />}
                  开始咨询
                </Button>
              </DialogFooter>
            </>
          )}
        </DialogContent>
      </Dialog>
    </div>
  )
}
