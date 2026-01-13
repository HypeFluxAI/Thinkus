'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Skeleton } from '@/components/ui/skeleton'
import { ScrollArea } from '@/components/ui/scroll-area'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import {
  ArrowLeft,
  Lightbulb,
  Search,
  ThumbsUp,
  TrendingUp,
  Clock,
  Star,
  BookOpen,
  Briefcase,
  Code,
  Palette,
  DollarSign,
  Scale,
  Target,
  AlertTriangle,
  Wrench,
  Layers,
  Award,
} from 'lucide-react'
import { toast } from 'sonner'

interface Skill {
  _id: string
  title: string
  content: string
  summary: string
  category: string
  tags: string[]
  expertId: string
  expertDomain: string
  qualityScore: number
  useCount: number
  helpfulCount: number
  createdAt: string
}

interface SkillStats {
  total: number
  byDomain: Record<string, number>
  byCategory: Record<string, number>
}

const CATEGORY_INFO: Record<string, { label: string; icon: React.ReactNode; color: string }> = {
  strategy: { label: '战略建议', icon: <Target className="h-4 w-4" />, color: 'text-blue-500 bg-blue-500/10' },
  implementation: { label: '实施方法', icon: <Code className="h-4 w-4" />, color: 'text-green-500 bg-green-500/10' },
  best_practice: { label: '最佳实践', icon: <Award className="h-4 w-4" />, color: 'text-purple-500 bg-purple-500/10' },
  pitfall: { label: '常见陷阱', icon: <AlertTriangle className="h-4 w-4" />, color: 'text-orange-500 bg-orange-500/10' },
  framework: { label: '思维框架', icon: <Layers className="h-4 w-4" />, color: 'text-pink-500 bg-pink-500/10' },
  tool: { label: '工具推荐', icon: <Wrench className="h-4 w-4" />, color: 'text-teal-500 bg-teal-500/10' },
}

const DOMAIN_INFO: Record<string, { label: string; icon: React.ReactNode }> = {
  product: { label: '产品管理', icon: <Briefcase className="h-4 w-4" /> },
  engineering: { label: '技术工程', icon: <Code className="h-4 w-4" /> },
  design: { label: 'UI/UX设计', icon: <Palette className="h-4 w-4" /> },
  marketing: { label: '市场营销', icon: <TrendingUp className="h-4 w-4" /> },
  finance: { label: '财务金融', icon: <DollarSign className="h-4 w-4" /> },
  legal: { label: '法律合规', icon: <Scale className="h-4 w-4" /> },
}

const SORT_OPTIONS = [
  { value: 'quality', label: '质量优先' },
  { value: 'popular', label: '最受欢迎' },
  { value: 'recent', label: '最新发布' },
]

export default function SkillsPage() {
  const [loading, setLoading] = useState(true)
  const [skills, setSkills] = useState<Skill[]>([])
  const [stats, setStats] = useState<SkillStats | null>(null)
  const [searchQuery, setSearchQuery] = useState('')
  const [domainFilter, setDomainFilter] = useState('all')
  const [categoryFilter, setCategoryFilter] = useState('all')
  const [sortBy, setSortBy] = useState('quality')
  const [selectedSkill, setSelectedSkill] = useState<Skill | null>(null)

  useEffect(() => {
    loadSkills()
  }, [domainFilter, categoryFilter, sortBy])

  const loadSkills = async () => {
    try {
      setLoading(true)
      const params = new URLSearchParams({ sort: sortBy })
      if (domainFilter !== 'all') params.set('domain', domainFilter)
      if (categoryFilter !== 'all') params.set('category', categoryFilter)

      const response = await fetch(`/api/skills?${params}`)
      if (response.ok) {
        const data = await response.json()
        setSkills(data.skills || [])
        setStats(data.stats || null)
      }
    } catch (error) {
      console.error('Failed to load skills:', error)
      toast.error('加载技能库失败')
    } finally {
      setLoading(false)
    }
  }

  const handleMarkHelpful = async (skillId: string) => {
    try {
      await fetch('/api/skills', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ skillId, action: 'helpful' }),
      })
      // Update local state
      setSkills(skills.map(s =>
        s._id === skillId ? { ...s, helpfulCount: s.helpfulCount + 1 } : s
      ))
      toast.success('感谢您的反馈')
    } catch {
      toast.error('操作失败')
    }
  }

  const filteredSkills = skills.filter(skill =>
    searchQuery
      ? skill.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        skill.summary.toLowerCase().includes(searchQuery.toLowerCase()) ||
        skill.tags.some(t => t.toLowerCase().includes(searchQuery.toLowerCase()))
      : true
  )

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b bg-background/80 backdrop-blur-sm sticky top-0 z-50">
        <div className="container mx-auto px-4 h-14 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Link href="/dashboard">
              <Button variant="ghost" size="icon">
                <ArrowLeft className="h-4 w-4" />
              </Button>
            </Link>
            <div className="flex items-center gap-2">
              <Lightbulb className="h-5 w-5 text-primary" />
              <span className="font-semibold">知识技能库</span>
            </div>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 py-6 max-w-6xl">
        {/* Stats Overview */}
        {stats && (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
            <Card>
              <CardContent className="p-4">
                <div className="flex items-center gap-2 text-muted-foreground mb-1">
                  <BookOpen className="h-4 w-4" />
                  <span className="text-sm">技能总数</span>
                </div>
                <div className="text-2xl font-bold">{stats.total}</div>
              </CardContent>
            </Card>
            {Object.entries(stats.byDomain).slice(0, 3).map(([domain, count]) => {
              const info = DOMAIN_INFO[domain]
              return (
                <Card key={domain}>
                  <CardContent className="p-4">
                    <div className="flex items-center gap-2 text-muted-foreground mb-1">
                      {info?.icon || <Lightbulb className="h-4 w-4" />}
                      <span className="text-sm">{info?.label || domain}</span>
                    </div>
                    <div className="text-2xl font-bold">{count}</div>
                  </CardContent>
                </Card>
              )
            })}
          </div>
        )}

        {/* Filters */}
        <div className="flex flex-col md:flex-row gap-4 mb-6">
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="搜索技能..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10"
            />
          </div>
          <Select value={domainFilter} onValueChange={setDomainFilter}>
            <SelectTrigger className="w-full md:w-40">
              <SelectValue placeholder="领域" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">全部领域</SelectItem>
              {Object.entries(DOMAIN_INFO).map(([key, info]) => (
                <SelectItem key={key} value={key}>
                  <div className="flex items-center gap-2">
                    {info.icon}
                    {info.label}
                  </div>
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select value={categoryFilter} onValueChange={setCategoryFilter}>
            <SelectTrigger className="w-full md:w-40">
              <SelectValue placeholder="类型" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">全部类型</SelectItem>
              {Object.entries(CATEGORY_INFO).map(([key, info]) => (
                <SelectItem key={key} value={key}>
                  <div className="flex items-center gap-2">
                    {info.icon}
                    {info.label}
                  </div>
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select value={sortBy} onValueChange={setSortBy}>
            <SelectTrigger className="w-full md:w-32">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {SORT_OPTIONS.map(opt => (
                <SelectItem key={opt.value} value={opt.value}>
                  {opt.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Skills Grid */}
        {loading ? (
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
            {[1, 2, 3, 4, 5, 6].map(i => (
              <Card key={i}>
                <CardContent className="p-4">
                  <Skeleton className="h-5 w-3/4 mb-2" />
                  <Skeleton className="h-16 w-full mb-3" />
                  <Skeleton className="h-4 w-1/2" />
                </CardContent>
              </Card>
            ))}
          </div>
        ) : filteredSkills.length === 0 ? (
          <Card>
            <CardContent className="p-12 text-center">
              <Lightbulb className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
              <h3 className="text-lg font-medium mb-2">暂无技能</h3>
              <p className="text-muted-foreground">
                通过专家咨询获得的知识将被蒸馏并存储在这里
              </p>
            </CardContent>
          </Card>
        ) : (
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
            {filteredSkills.map(skill => {
              const categoryInfo = CATEGORY_INFO[skill.category] || {
                label: skill.category,
                icon: <Lightbulb className="h-4 w-4" />,
                color: 'text-gray-500 bg-gray-500/10',
              }
              const domainInfo = DOMAIN_INFO[skill.expertDomain]

              return (
                <Card
                  key={skill._id}
                  className="cursor-pointer hover:shadow-lg transition-shadow"
                  onClick={() => setSelectedSkill(skill)}
                >
                  <CardHeader className="pb-2">
                    <div className="flex items-center gap-2 mb-1">
                      <Badge className={categoryInfo.color} variant="secondary">
                        {categoryInfo.icon}
                        <span className="ml-1">{categoryInfo.label}</span>
                      </Badge>
                      {domainInfo && (
                        <Badge variant="outline" className="text-xs">
                          {domainInfo.label}
                        </Badge>
                      )}
                    </div>
                    <CardTitle className="text-base line-clamp-2">{skill.title}</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="text-sm text-muted-foreground line-clamp-3 mb-3">
                      {skill.summary}
                    </p>
                    <div className="flex flex-wrap gap-1 mb-3">
                      {skill.tags.slice(0, 3).map(tag => (
                        <Badge key={tag} variant="secondary" className="text-xs">
                          {tag}
                        </Badge>
                      ))}
                    </div>
                    <div className="flex items-center justify-between text-xs text-muted-foreground">
                      <div className="flex items-center gap-3">
                        <span className="flex items-center gap-1">
                          <Star className="h-3 w-3 text-yellow-500" />
                          {skill.qualityScore}/10
                        </span>
                        <span className="flex items-center gap-1">
                          <ThumbsUp className="h-3 w-3" />
                          {skill.helpfulCount}
                        </span>
                      </div>
                      <span className="flex items-center gap-1">
                        <Clock className="h-3 w-3" />
                        {new Date(skill.createdAt).toLocaleDateString('zh-CN')}
                      </span>
                    </div>
                  </CardContent>
                </Card>
              )
            })}
          </div>
        )}

        {/* Skill Detail Dialog */}
        <Dialog open={!!selectedSkill} onOpenChange={() => setSelectedSkill(null)}>
          {selectedSkill && (
            <DialogContent className="max-w-2xl max-h-[80vh]">
              <DialogHeader>
                <div className="flex items-center gap-2 mb-2">
                  {CATEGORY_INFO[selectedSkill.category] && (
                    <Badge className={CATEGORY_INFO[selectedSkill.category].color} variant="secondary">
                      {CATEGORY_INFO[selectedSkill.category].icon}
                      <span className="ml-1">{CATEGORY_INFO[selectedSkill.category].label}</span>
                    </Badge>
                  )}
                  {DOMAIN_INFO[selectedSkill.expertDomain] && (
                    <Badge variant="outline">
                      {DOMAIN_INFO[selectedSkill.expertDomain].label}
                    </Badge>
                  )}
                </div>
                <DialogTitle className="text-xl">{selectedSkill.title}</DialogTitle>
                <DialogDescription>{selectedSkill.summary}</DialogDescription>
              </DialogHeader>
              <ScrollArea className="max-h-[50vh] mt-4">
                <div className="prose prose-sm dark:prose-invert max-w-none">
                  <p className="whitespace-pre-wrap">{selectedSkill.content}</p>
                </div>
              </ScrollArea>
              <div className="flex items-center justify-between pt-4 border-t">
                <div className="flex flex-wrap gap-1">
                  {selectedSkill.tags.map(tag => (
                    <Badge key={tag} variant="secondary" className="text-xs">
                      {tag}
                    </Badge>
                  ))}
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handleMarkHelpful(selectedSkill._id)}
                >
                  <ThumbsUp className="h-4 w-4 mr-1" />
                  有用 ({selectedSkill.helpfulCount})
                </Button>
              </div>
            </DialogContent>
          )}
        </Dialog>
      </main>
    </div>
  )
}
