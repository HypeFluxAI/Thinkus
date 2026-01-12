'use client'

import { useState, useEffect, use } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Switch } from '@/components/ui/switch'
import { Separator } from '@/components/ui/separator'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog'
import {
  Settings,
  Save,
  Loader2,
  Trash2,
  AlertTriangle,
  Bell,
  Zap,
  Globe,
  Smartphone,
  Gamepad2,
  Monitor,
  Bitcoin,
  MoreHorizontal,
} from 'lucide-react'
import { trpc } from '@/lib/trpc/client'
import { toast } from 'sonner'
import type { IProject } from '@/lib/db/models/project'

const PROJECT_TYPES = [
  { value: 'web', label: 'Web 应用', icon: Globe },
  { value: 'mobile', label: '移动应用', icon: Smartphone },
  { value: 'game', label: '游戏', icon: Gamepad2 },
  { value: 'desktop', label: '桌面应用', icon: Monitor },
  { value: 'blockchain', label: '区块链', icon: Bitcoin },
  { value: 'other', label: '其他', icon: MoreHorizontal },
]

const STATUS_OPTIONS = [
  { value: 'active', label: '进行中', color: 'bg-green-500' },
  { value: 'paused', label: '已暂停', color: 'bg-yellow-500' },
  { value: 'completed', label: '已完成', color: 'bg-blue-500' },
  { value: 'archived', label: '已归档', color: 'bg-gray-500' },
]

const NOTIFY_LEVELS = [
  { value: 0, label: '不通知', description: '所有决策自动执行，不通知用户' },
  { value: 1, label: '仅重要', description: '仅通知关键和高优先级的决策' },
  { value: 2, label: '标准', description: '通知中等及以上优先级的决策' },
  { value: 3, label: '全部', description: '通知所有决策，包括低优先级' },
]

export default function ProjectSettingsPage({ params }: { params: Promise<{ id: string }> }) {
  const { id: projectId } = use(params)
  const router = useRouter()
  const [saving, setSaving] = useState(false)
  const [deleting, setDeleting] = useState(false)

  // Form state
  const [name, setName] = useState('')
  const [description, setDescription] = useState('')
  const [oneLiner, setOneLiner] = useState('')
  const [projectType, setProjectType] = useState('web')
  const [industry, setIndustry] = useState('')
  const [status, setStatus] = useState('active')
  const [autoRun, setAutoRun] = useState(false)
  const [notifyLevel, setNotifyLevel] = useState(2)

  // Fetch project data
  const { data: projectData, isLoading, refetch } = trpc.project.getById.useQuery({ id: projectId })

  // Update mutation
  const updateMutation = trpc.project.update.useMutation({
    onSuccess: () => {
      toast.success('设置已保存')
      refetch()
    },
    onError: (error) => {
      toast.error(error.message || '保存失败')
    },
  })

  // Delete mutation
  const deleteMutation = trpc.project.delete.useMutation({
    onSuccess: () => {
      toast.success('项目已删除')
      router.push('/projects')
    },
    onError: (error) => {
      toast.error(error.message || '删除失败')
    },
  })

  // Initialize form with project data
  useEffect(() => {
    if (projectData?.project) {
      const p = projectData.project as unknown as IProject
      setName(p.name || '')
      setDescription(p.description || '')
      setOneLiner(p.oneLiner || '')
      setProjectType(p.type || 'web')
      setIndustry(p.industry || '')
      setStatus(p.status || 'active')
      setAutoRun(p.config?.autoRun || false)
      setNotifyLevel(p.config?.notifyLevel ?? 2)
    }
  }, [projectData])

  const handleSave = async () => {
    setSaving(true)
    try {
      await updateMutation.mutateAsync({
        id: projectId,
        name,
        description,
        oneLiner,
        type: projectType as 'web' | 'mobile' | 'game' | 'desktop' | 'blockchain' | 'other',
        industry,
        status: status as 'active' | 'paused' | 'completed' | 'archived',
        config: {
          autoRun,
          notifyLevel,
        },
      })
    } finally {
      setSaving(false)
    }
  }

  const handleDelete = async () => {
    setDeleting(true)
    try {
      await deleteMutation.mutateAsync({ id: projectId })
    } finally {
      setDeleting(false)
    }
  }

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    )
  }

  return (
    <div className="bg-background">
      {/* Page Header */}
      <div className="border-b bg-muted/30">
        <div className="container mx-auto px-4 py-4 max-w-3xl">
          <div className="flex items-center justify-between">
            <div>
              <div className="flex items-center gap-3">
                <Settings className="h-5 w-5 text-primary" />
                <h1 className="font-semibold text-lg">项目设置</h1>
              </div>
              <p className="text-sm text-muted-foreground mt-1">
                配置项目的基本信息和 AI 高管行为
              </p>
            </div>
            <Button onClick={handleSave} disabled={saving}>
              {saving ? (
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              ) : (
                <Save className="h-4 w-4 mr-2" />
              )}
              保存设置
            </Button>
          </div>
        </div>
      </div>

      <main className="container mx-auto px-4 py-6 max-w-3xl">
        {/* Basic Info */}
        <Card className="mb-6">
          <CardHeader>
            <CardTitle>基本信息</CardTitle>
            <CardDescription>设置项目的基本信息</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="name">项目名称</Label>
              <Input
                id="name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="输入项目名称"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="oneLiner">一句话描述</Label>
              <Input
                id="oneLiner"
                value={oneLiner}
                onChange={(e) => setOneLiner(e.target.value)}
                placeholder="用一句话描述你的项目"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="description">详细描述</Label>
              <Textarea
                id="description"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="详细描述你的项目"
                rows={4}
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="type">项目类型</Label>
                <Select value={projectType} onValueChange={setProjectType}>
                  <SelectTrigger>
                    <SelectValue placeholder="选择类型" />
                  </SelectTrigger>
                  <SelectContent>
                    {PROJECT_TYPES.map((type) => (
                      <SelectItem key={type.value} value={type.value}>
                        <div className="flex items-center gap-2">
                          <type.icon className="h-4 w-4" />
                          {type.label}
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="industry">行业领域</Label>
                <Input
                  id="industry"
                  value={industry}
                  onChange={(e) => setIndustry(e.target.value)}
                  placeholder="例如：电商、教育、医疗"
                />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Status */}
        <Card className="mb-6">
          <CardHeader>
            <CardTitle>项目状态</CardTitle>
            <CardDescription>管理项目的当前状态</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              <Label>当前状态</Label>
              <Select value={status} onValueChange={setStatus}>
                <SelectTrigger>
                  <SelectValue placeholder="选择状态" />
                </SelectTrigger>
                <SelectContent>
                  {STATUS_OPTIONS.map((option) => (
                    <SelectItem key={option.value} value={option.value}>
                      <div className="flex items-center gap-2">
                        <div className={`w-2 h-2 rounded-full ${option.color}`} />
                        {option.label}
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <p className="text-sm text-muted-foreground">
                {status === 'active' && '项目正在积极开发中'}
                {status === 'paused' && '项目暂时搁置，可以随时恢复'}
                {status === 'completed' && '项目已完成所有开发工作'}
                {status === 'archived' && '项目已归档，不再活跃'}
              </p>
            </div>
          </CardContent>
        </Card>

        {/* AI Configuration */}
        <Card className="mb-6">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Zap className="h-5 w-5" />
              AI 高管配置
            </CardTitle>
            <CardDescription>配置 AI 高管团队的行为方式</CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label className="font-medium">自动执行模式</Label>
                <p className="text-sm text-muted-foreground">
                  开启后，AI 高管将自动执行低优先级决策而无需确认
                </p>
              </div>
              <Switch
                checked={autoRun}
                onCheckedChange={setAutoRun}
              />
            </div>

            <Separator />

            <div className="space-y-3">
              <div className="flex items-center gap-2">
                <Bell className="h-4 w-4" />
                <Label className="font-medium">通知级别</Label>
              </div>
              <div className="grid gap-3">
                {NOTIFY_LEVELS.map((level) => (
                  <div
                    key={level.value}
                    className={`flex items-center justify-between p-3 rounded-lg border cursor-pointer transition-colors ${
                      notifyLevel === level.value
                        ? 'border-primary bg-primary/5'
                        : 'hover:bg-muted/50'
                    }`}
                    onClick={() => setNotifyLevel(level.value)}
                  >
                    <div>
                      <p className="font-medium">{level.label}</p>
                      <p className="text-sm text-muted-foreground">{level.description}</p>
                    </div>
                    <div
                      className={`w-4 h-4 rounded-full border-2 ${
                        notifyLevel === level.value
                          ? 'border-primary bg-primary'
                          : 'border-muted-foreground'
                      }`}
                    />
                  </div>
                ))}
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Danger Zone */}
        <Card className="border-red-200 dark:border-red-900">
          <CardHeader>
            <CardTitle className="text-red-600 flex items-center gap-2">
              <AlertTriangle className="h-5 w-5" />
              危险区域
            </CardTitle>
            <CardDescription>以下操作不可逆，请谨慎执行</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex items-center justify-between p-4 bg-red-50 dark:bg-red-950/20 rounded-lg">
              <div>
                <p className="font-medium">删除项目</p>
                <p className="text-sm text-muted-foreground">
                  删除后将无法恢复，包括所有讨论、决策和行动项
                </p>
              </div>
              <AlertDialog>
                <AlertDialogTrigger asChild>
                  <Button variant="destructive" disabled={deleting}>
                    {deleting ? (
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    ) : (
                      <Trash2 className="h-4 w-4 mr-2" />
                    )}
                    删除项目
                  </Button>
                </AlertDialogTrigger>
                <AlertDialogContent>
                  <AlertDialogHeader>
                    <AlertDialogTitle>确定要删除这个项目吗？</AlertDialogTitle>
                    <AlertDialogDescription>
                      此操作无法撤销。这将永久删除项目 "{name}" 及其所有相关数据，包括：
                      <ul className="list-disc list-inside mt-2 space-y-1">
                        <li>所有讨论记录</li>
                        <li>所有决策记录</li>
                        <li>所有行动项</li>
                        <li>项目配置和设置</li>
                      </ul>
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel>取消</AlertDialogCancel>
                    <AlertDialogAction
                      onClick={handleDelete}
                      className="bg-red-600 hover:bg-red-700"
                    >
                      确认删除
                    </AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
            </div>
          </CardContent>
        </Card>
      </main>
    </div>
  )
}
