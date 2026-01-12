'use client'

import { useState, useEffect, use } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Progress } from '@/components/ui/progress'
import { Checkbox } from '@/components/ui/checkbox'
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
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import {
  ListTodo,
  Search,
  Filter,
  Circle,
  CheckCircle2,
  XCircle,
  PlayCircle,
  PauseCircle,
  Loader2,
  MoreVertical,
  Trash2,
  Calendar,
  AlertTriangle,
} from 'lucide-react'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'

interface ChecklistItem {
  id: string
  text: string
  completed: boolean
}

interface ActionItem {
  id: string
  title: string
  description?: string
  category: string
  status: string
  priority: string
  assignee: string
  dueDate?: string
  startedAt?: string
  completedAt?: string
  progress: number
  blockedReason?: string
  notes?: string
  checklist?: ChecklistItem[]
  estimatedHours?: number
  actualHours?: number
  project?: {
    id: string
    name: string
    icon?: string
  }
  decision?: {
    id: string
    title: string
  }
  tags?: string[]
  createdAt: string
  updatedAt: string
}

const CATEGORY_CONFIG: Record<string, { label: string; color: string }> = {
  development: { label: '开发', color: 'bg-blue-500' },
  design: { label: '设计', color: 'bg-pink-500' },
  research: { label: '研究', color: 'bg-purple-500' },
  review: { label: '评审', color: 'bg-indigo-500' },
  meeting: { label: '会议', color: 'bg-cyan-500' },
  documentation: { label: '文档', color: 'bg-teal-500' },
  testing: { label: '测试', color: 'bg-orange-500' },
  deployment: { label: '部署', color: 'bg-green-500' },
  other: { label: '其他', color: 'bg-gray-500' },
}

const PRIORITY_CONFIG: Record<string, { label: string; color: string }> = {
  urgent: { label: '紧急', color: 'text-red-500 bg-red-50 dark:bg-red-950' },
  high: { label: '高', color: 'text-orange-500 bg-orange-50 dark:bg-orange-950' },
  medium: { label: '中', color: 'text-yellow-500 bg-yellow-50 dark:bg-yellow-950' },
  low: { label: '低', color: 'text-green-500 bg-green-50 dark:bg-green-950' },
}

const STATUS_CONFIG: Record<string, { icon: React.ReactNode; label: string; color: string }> = {
  pending: { icon: <Circle className="h-4 w-4" />, label: '待处理', color: 'text-gray-500' },
  in_progress: { icon: <PlayCircle className="h-4 w-4" />, label: '进行中', color: 'text-blue-500' },
  completed: { icon: <CheckCircle2 className="h-4 w-4" />, label: '已完成', color: 'text-green-500' },
  blocked: { icon: <PauseCircle className="h-4 w-4" />, label: '已阻塞', color: 'text-red-500' },
  canceled: { icon: <XCircle className="h-4 w-4" />, label: '已取消', color: 'text-gray-400' },
}

export default function ProjectActionsPage({ params }: { params: Promise<{ id: string }> }) {
  const { id: projectId } = use(params)
  const router = useRouter()
  const [actionItems, setActionItems] = useState<ActionItem[]>([])
  const [loading, setLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState('')
  const [priorityFilter, setPriorityFilter] = useState<string>('all')
  const [statusFilter, setStatusFilter] = useState<string>('all')
  const [selectedItem, setSelectedItem] = useState<ActionItem | null>(null)
  const [showDetailDialog, setShowDetailDialog] = useState(false)

  useEffect(() => {
    async function fetchActionItems() {
      try {
        const res = await fetch(`/api/action-items?projectId=${projectId}`)
        if (res.ok) {
          const data = await res.json()
          setActionItems(data.actionItems || [])
        }
      } catch (error) {
        console.error('Failed to fetch action items:', error)
      } finally {
        setLoading(false)
      }
    }

    fetchActionItems()
  }, [projectId])

  const filteredItems = actionItems.filter((item) => {
    const matchesSearch = !searchQuery ||
      item.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      item.description?.toLowerCase().includes(searchQuery.toLowerCase())
    const matchesPriority = priorityFilter === 'all' || item.priority === priorityFilter
    const matchesStatus = statusFilter === 'all' || item.status === statusFilter
    return matchesSearch && matchesPriority && matchesStatus
  })

  const handleStatusChange = async (itemId: string, newStatus: string) => {
    try {
      const res = await fetch(`/api/action-items/${itemId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: newStatus }),
      })
      if (res.ok) {
        const data = await res.json()
        setActionItems(actionItems.map(item =>
          item.id === itemId ? {
            ...item,
            status: newStatus,
            progress: data.actionItem?.progress ?? item.progress
          } : item
        ))
      }
    } catch (error) {
      console.error('Failed to update action item:', error)
    }
  }

  const handleDelete = async (itemId: string) => {
    if (!confirm('确定要删除这个行动项吗？')) return

    try {
      const res = await fetch(`/api/action-items/${itemId}`, {
        method: 'DELETE',
      })
      if (res.ok) {
        setActionItems(actionItems.filter(item => item.id !== itemId))
      }
    } catch (error) {
      console.error('Failed to delete action item:', error)
    }
  }

  const openDetailDialog = (item: ActionItem) => {
    setSelectedItem(item)
    setShowDetailDialog(true)
  }

  // Calculate stats
  const stats = {
    total: actionItems.length,
    pending: actionItems.filter(i => i.status === 'pending').length,
    inProgress: actionItems.filter(i => i.status === 'in_progress').length,
    completed: actionItems.filter(i => i.status === 'completed').length,
    blocked: actionItems.filter(i => i.status === 'blocked').length,
    overdue: actionItems.filter(i =>
      i.dueDate &&
      new Date(i.dueDate) < new Date() &&
      !['completed', 'canceled'].includes(i.status)
    ).length,
  }

  const completionRate = stats.total > 0
    ? Math.round((stats.completed / stats.total) * 100)
    : 0

  return (
    <div className="bg-background">
      {/* Page Header */}
      <div className="border-b bg-muted/30">
        <div className="container mx-auto px-4 py-4 max-w-5xl">
          <div className="flex items-center gap-3">
            <ListTodo className="h-5 w-5 text-primary" />
            <h1 className="font-semibold text-lg">行动项</h1>
            <Badge variant="secondary">{actionItems.length}</Badge>
          </div>
          <p className="text-sm text-muted-foreground mt-1">
            管理项目中的待办事项和任务
          </p>
        </div>
      </div>

      <main className="container mx-auto px-4 py-6 max-w-5xl">
        {/* Stats Overview */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-6">
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-2xl font-bold">{stats.total}</p>
                  <p className="text-xs text-muted-foreground">总计</p>
                </div>
                <div className="text-right">
                  <p className="text-lg font-semibold text-green-500">{completionRate}%</p>
                  <p className="text-xs text-muted-foreground">完成率</p>
                </div>
              </div>
              <Progress value={completionRate} className="mt-2 h-1.5" />
            </CardContent>
          </Card>
          <Card className="cursor-pointer hover:border-primary/50 transition-colors"
            onClick={() => setStatusFilter(statusFilter === 'pending' ? 'all' : 'pending')}>
            <CardContent className="p-4 flex items-center gap-3">
              <div className="text-gray-500"><Circle className="h-5 w-5" /></div>
              <div>
                <p className="text-xl font-bold">{stats.pending}</p>
                <p className="text-xs text-muted-foreground">待处理</p>
              </div>
            </CardContent>
          </Card>
          <Card className="cursor-pointer hover:border-primary/50 transition-colors"
            onClick={() => setStatusFilter(statusFilter === 'in_progress' ? 'all' : 'in_progress')}>
            <CardContent className="p-4 flex items-center gap-3">
              <div className="text-blue-500"><PlayCircle className="h-5 w-5" /></div>
              <div>
                <p className="text-xl font-bold">{stats.inProgress}</p>
                <p className="text-xs text-muted-foreground">进行中</p>
              </div>
            </CardContent>
          </Card>
          {stats.overdue > 0 ? (
            <Card className="border-red-200 dark:border-red-900 bg-red-50/50 dark:bg-red-950/20 cursor-pointer"
              onClick={() => {
                setStatusFilter('all')
                // Could add overdue filter here
              }}>
              <CardContent className="p-4 flex items-center gap-3">
                <div className="text-red-500"><AlertTriangle className="h-5 w-5" /></div>
                <div>
                  <p className="text-xl font-bold text-red-500">{stats.overdue}</p>
                  <p className="text-xs text-muted-foreground">已逾期</p>
                </div>
              </CardContent>
            </Card>
          ) : (
            <Card className="cursor-pointer hover:border-primary/50 transition-colors"
              onClick={() => setStatusFilter(statusFilter === 'completed' ? 'all' : 'completed')}>
              <CardContent className="p-4 flex items-center gap-3">
                <div className="text-green-500"><CheckCircle2 className="h-5 w-5" /></div>
                <div>
                  <p className="text-xl font-bold">{stats.completed}</p>
                  <p className="text-xs text-muted-foreground">已完成</p>
                </div>
              </CardContent>
            </Card>
          )}
        </div>

        {/* Filters */}
        <Card className="mb-6">
          <CardContent className="p-4">
            <div className="flex flex-col sm:flex-row gap-4">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="搜索行动项..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-9"
                />
              </div>
              <div className="flex gap-2">
                <Select value={priorityFilter} onValueChange={setPriorityFilter}>
                  <SelectTrigger className="w-[120px]">
                    <Filter className="h-4 w-4 mr-2" />
                    <SelectValue placeholder="优先级" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">全部优先级</SelectItem>
                    {Object.entries(PRIORITY_CONFIG).map(([key, config]) => (
                      <SelectItem key={key} value={key}>{config.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Select value={statusFilter} onValueChange={setStatusFilter}>
                  <SelectTrigger className="w-[120px]">
                    <SelectValue placeholder="状态" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">全部状态</SelectItem>
                    {Object.entries(STATUS_CONFIG).map(([key, config]) => (
                      <SelectItem key={key} value={key}>{config.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Action Items List */}
        {loading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
          </div>
        ) : filteredItems.length === 0 ? (
          <Card>
            <CardContent className="p-12 text-center">
              <ListTodo className="h-12 w-12 mx-auto mb-4 text-muted-foreground/50" />
              <h3 className="text-lg font-medium mb-2">
                {searchQuery || priorityFilter !== 'all' || statusFilter !== 'all'
                  ? '没有找到匹配的行动项'
                  : '暂无行动项'}
              </h3>
              <p className="text-muted-foreground">
                {searchQuery || priorityFilter !== 'all' || statusFilter !== 'all'
                  ? '尝试调整筛选条件'
                  : '在讨论中产生的待办事项会自动添加到这里'}
              </p>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-3">
            {filteredItems.map((item) => {
              const category = CATEGORY_CONFIG[item.category] || CATEGORY_CONFIG.other
              const priority = PRIORITY_CONFIG[item.priority] || PRIORITY_CONFIG.medium
              const status = STATUS_CONFIG[item.status] || STATUS_CONFIG.pending
              const isOverdue = item.dueDate &&
                new Date(item.dueDate) < new Date() &&
                !['completed', 'canceled'].includes(item.status)

              return (
                <Card
                  key={item.id}
                  className={`hover:shadow-md transition-shadow ${
                    isOverdue ? 'border-red-200 dark:border-red-900' : ''
                  }`}
                >
                  <CardContent className="p-4">
                    <div className="flex items-start gap-4">
                      {/* Status Checkbox */}
                      <div className="pt-1">
                        <Checkbox
                          checked={item.status === 'completed'}
                          onCheckedChange={(checked) => {
                            handleStatusChange(item.id, checked ? 'completed' : 'pending')
                          }}
                          className="h-5 w-5"
                        />
                      </div>

                      <div className="flex-1 min-w-0">
                        <div className="flex items-start justify-between gap-2 mb-2">
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 flex-wrap mb-1">
                              <h3 className={`font-medium truncate ${
                                item.status === 'completed' ? 'line-through text-muted-foreground' : ''
                              }`}>
                                {item.title}
                              </h3>
                              <Badge className={`text-xs shrink-0 ${priority.color}`}>
                                {priority.label}
                              </Badge>
                              <Badge variant="outline" className="text-xs shrink-0">
                                {category.label}
                              </Badge>
                            </div>
                            {item.description && (
                              <p className="text-sm text-muted-foreground line-clamp-2">
                                {item.description}
                              </p>
                            )}
                          </div>
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button variant="ghost" size="icon" className="shrink-0">
                                <MoreVertical className="h-4 w-4" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                              <DropdownMenuItem onClick={() => openDetailDialog(item)}>
                                查看详情
                              </DropdownMenuItem>
                              <DropdownMenuSeparator />
                              {item.status === 'pending' && (
                                <DropdownMenuItem onClick={() => handleStatusChange(item.id, 'in_progress')}>
                                  <PlayCircle className="h-4 w-4 mr-2" />
                                  开始处理
                                </DropdownMenuItem>
                              )}
                              {item.status === 'in_progress' && (
                                <>
                                  <DropdownMenuItem onClick={() => handleStatusChange(item.id, 'completed')}>
                                    <CheckCircle2 className="h-4 w-4 mr-2" />
                                    标记完成
                                  </DropdownMenuItem>
                                  <DropdownMenuItem onClick={() => handleStatusChange(item.id, 'blocked')}>
                                    <PauseCircle className="h-4 w-4 mr-2" />
                                    标记阻塞
                                  </DropdownMenuItem>
                                </>
                              )}
                              {item.status === 'blocked' && (
                                <DropdownMenuItem onClick={() => handleStatusChange(item.id, 'in_progress')}>
                                  <PlayCircle className="h-4 w-4 mr-2" />
                                  恢复处理
                                </DropdownMenuItem>
                              )}
                              {item.status === 'completed' && (
                                <DropdownMenuItem onClick={() => handleStatusChange(item.id, 'pending')}>
                                  <Circle className="h-4 w-4 mr-2" />
                                  重新打开
                                </DropdownMenuItem>
                              )}
                              <DropdownMenuSeparator />
                              <DropdownMenuItem
                                onClick={() => handleDelete(item.id)}
                                className="text-red-600"
                              >
                                <Trash2 className="h-4 w-4 mr-2" />
                                删除
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </div>

                        {/* Progress bar */}
                        {item.progress > 0 && item.status !== 'completed' && (
                          <div className="flex items-center gap-2 mb-2">
                            <Progress value={item.progress} className="flex-1 h-1.5" />
                            <span className="text-xs text-muted-foreground">{item.progress}%</span>
                          </div>
                        )}

                        {/* Meta info */}
                        <div className="flex items-center gap-4 text-sm text-muted-foreground flex-wrap">
                          <span className={`flex items-center gap-1 ${status.color}`}>
                            {status.icon}
                            {status.label}
                          </span>
                          {item.assignee && (
                            <span>负责: {item.assignee === 'user' ? '用户' : item.assignee}</span>
                          )}
                          {item.dueDate && (
                            <span className={`flex items-center gap-1 ${isOverdue ? 'text-red-500 font-medium' : ''}`}>
                              <Calendar className="h-3 w-3" />
                              {isOverdue ? '已逾期: ' : '截止: '}
                              {new Date(item.dueDate).toLocaleDateString('zh-CN')}
                            </span>
                          )}
                          {item.checklist && item.checklist.length > 0 && (
                            <span className="flex items-center gap-1">
                              <CheckCircle2 className="h-3 w-3" />
                              {item.checklist.filter(c => c.completed).length}/{item.checklist.length}
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              )
            })}
          </div>
        )}

        {/* Action Item Detail Dialog */}
        <Dialog open={showDetailDialog} onOpenChange={setShowDetailDialog}>
          <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
            {selectedItem && (
              <>
                <DialogHeader>
                  <DialogTitle className="flex items-center gap-2">
                    <div className={STATUS_CONFIG[selectedItem.status]?.color}>
                      {STATUS_CONFIG[selectedItem.status]?.icon}
                    </div>
                    {selectedItem.title}
                  </DialogTitle>
                  <DialogDescription>
                    行动项详情
                  </DialogDescription>
                </DialogHeader>
                <div className="space-y-4 py-4">
                  {/* Status and Meta */}
                  <div className="flex flex-wrap gap-2">
                    <Badge className={PRIORITY_CONFIG[selectedItem.priority]?.color}>
                      {PRIORITY_CONFIG[selectedItem.priority]?.label || '中'}
                    </Badge>
                    <Badge variant="outline">
                      {CATEGORY_CONFIG[selectedItem.category]?.label || '其他'}
                    </Badge>
                    <Badge variant="outline" className={STATUS_CONFIG[selectedItem.status]?.color}>
                      {STATUS_CONFIG[selectedItem.status]?.label || '未知'}
                    </Badge>
                  </div>

                  {/* Description */}
                  {selectedItem.description && (
                    <div>
                      <h4 className="text-sm font-medium mb-1">描述</h4>
                      <p className="text-sm text-muted-foreground">{selectedItem.description}</p>
                    </div>
                  )}

                  {/* Progress */}
                  {selectedItem.progress > 0 && (
                    <div>
                      <h4 className="text-sm font-medium mb-2">进度</h4>
                      <div className="flex items-center gap-2">
                        <Progress value={selectedItem.progress} className="flex-1" />
                        <span className="text-sm font-medium">{selectedItem.progress}%</span>
                      </div>
                    </div>
                  )}

                  {/* Checklist */}
                  {selectedItem.checklist && selectedItem.checklist.length > 0 && (
                    <div>
                      <h4 className="text-sm font-medium mb-2">检查清单</h4>
                      <div className="space-y-2">
                        {selectedItem.checklist.map((item) => (
                          <div key={item.id} className="flex items-center gap-2">
                            <Checkbox checked={item.completed} disabled />
                            <span className={`text-sm ${item.completed ? 'line-through text-muted-foreground' : ''}`}>
                              {item.text}
                            </span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Blocked Reason */}
                  {selectedItem.status === 'blocked' && selectedItem.blockedReason && (
                    <div className="p-3 bg-red-50 dark:bg-red-950/20 rounded-lg">
                      <h4 className="text-sm font-medium mb-1 text-red-700 dark:text-red-400">阻塞原因</h4>
                      <p className="text-sm text-red-600 dark:text-red-300">{selectedItem.blockedReason}</p>
                    </div>
                  )}

                  {/* Notes */}
                  {selectedItem.notes && (
                    <div>
                      <h4 className="text-sm font-medium mb-1">备注</h4>
                      <p className="text-sm text-muted-foreground">{selectedItem.notes}</p>
                    </div>
                  )}

                  {/* Time Tracking */}
                  <div className="grid grid-cols-2 gap-4 pt-4 border-t">
                    <div>
                      <h4 className="text-sm font-medium mb-1">预估时间</h4>
                      <p className="text-sm text-muted-foreground">
                        {selectedItem.estimatedHours ? `${selectedItem.estimatedHours} 小时` : '-'}
                      </p>
                    </div>
                    <div>
                      <h4 className="text-sm font-medium mb-1">实际时间</h4>
                      <p className="text-sm text-muted-foreground">
                        {selectedItem.actualHours ? `${selectedItem.actualHours} 小时` : '-'}
                      </p>
                    </div>
                  </div>

                  {/* Timeline */}
                  <div className="pt-4 border-t">
                    <h4 className="text-sm font-medium mb-2">时间线</h4>
                    <div className="text-sm text-muted-foreground space-y-1">
                      <p>创建于: {new Date(selectedItem.createdAt).toLocaleString('zh-CN')}</p>
                      {selectedItem.dueDate && (
                        <p>截止日期: {new Date(selectedItem.dueDate).toLocaleDateString('zh-CN')}</p>
                      )}
                      {selectedItem.startedAt && (
                        <p>开始于: {new Date(selectedItem.startedAt).toLocaleString('zh-CN')}</p>
                      )}
                      {selectedItem.completedAt && (
                        <p>完成于: {new Date(selectedItem.completedAt).toLocaleString('zh-CN')}</p>
                      )}
                    </div>
                  </div>
                </div>
                <DialogFooter>
                  <Button variant="outline" onClick={() => setShowDetailDialog(false)}>
                    关闭
                  </Button>
                </DialogFooter>
              </>
            )}
          </DialogContent>
        </Dialog>
      </main>
    </div>
  )
}
