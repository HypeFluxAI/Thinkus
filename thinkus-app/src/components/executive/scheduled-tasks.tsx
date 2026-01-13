'use client'

import { useState } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Switch } from '@/components/ui/switch'
import { Label } from '@/components/ui/label'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  Calendar,
  Clock,
  Play,
  Pause,
  Settings,
  Coffee,
  LineChart,
  CalendarCheck,
  Plus,
  Trash2,
  RefreshCw,
} from 'lucide-react'
import { ExecutiveAvatarStack } from './executive-card'
import { EXECUTIVES, type AgentId } from '@/lib/config/executives'

export interface ScheduledTask {
  id: string
  type: 'daily_standup' | 'weekly_review'
  projectId: string
  projectName: string
  cronExpression: string
  enabled: boolean
  lastRunAt?: Date
  nextRunAt: Date
  participants?: AgentId[]
}

interface ScheduledTasksProps {
  tasks: ScheduledTask[]
  onToggleTask?: (taskId: string, enabled: boolean) => void
  onRunTask?: (taskId: string) => void
  onDeleteTask?: (taskId: string) => void
  onCreateTask?: (task: Partial<ScheduledTask>) => void
  className?: string
}

const TASK_TYPE_CONFIG = {
  daily_standup: {
    name: '每日站会',
    icon: Coffee,
    color: 'text-blue-500',
    bgColor: 'bg-blue-500/10',
    description: '每天自动召开AI高管站会，汇报进度和问题',
    defaultCron: '0 9 * * *',
    defaultTime: '09:00',
  },
  weekly_review: {
    name: '每周复盘',
    icon: LineChart,
    color: 'text-purple-500',
    bgColor: 'bg-purple-500/10',
    description: '每周自动进行项目复盘，总结成果和改进点',
    defaultCron: '0 10 * * 5',
    defaultTime: '10:00',
    defaultDay: 'friday',
  },
}

const WEEKDAYS = [
  { value: '1', label: '周一' },
  { value: '2', label: '周二' },
  { value: '3', label: '周三' },
  { value: '4', label: '周四' },
  { value: '5', label: '周五' },
  { value: '6', label: '周六' },
  { value: '0', label: '周日' },
]

export function ScheduledTasks({
  tasks,
  onToggleTask,
  onRunTask,
  onDeleteTask,
  onCreateTask,
  className,
}: ScheduledTasksProps) {
  const [showCreateDialog, setShowCreateDialog] = useState(false)
  const [newTaskType, setNewTaskType] = useState<'daily_standup' | 'weekly_review'>('daily_standup')
  const [newTaskTime, setNewTaskTime] = useState('09:00')
  const [newTaskDay, setNewTaskDay] = useState('5')

  const handleCreate = () => {
    if (!onCreateTask) return

    const hour = newTaskTime.split(':')[0]
    const minute = newTaskTime.split(':')[1]

    let cronExpression: string
    if (newTaskType === 'daily_standup') {
      cronExpression = `${minute} ${hour} * * *`
    } else {
      cronExpression = `${minute} ${hour} * * ${newTaskDay}`
    }

    onCreateTask({
      type: newTaskType,
      cronExpression,
      enabled: true,
    })

    setShowCreateDialog(false)
  }

  const formatNextRun = (date: Date) => {
    const now = new Date()
    const diff = date.getTime() - now.getTime()
    const hours = Math.floor(diff / (1000 * 60 * 60))
    const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60))

    if (hours < 24) {
      if (hours === 0) {
        return `${minutes} 分钟后`
      }
      return `${hours} 小时 ${minutes} 分钟后`
    }

    const days = Math.floor(hours / 24)
    return `${days} 天后`
  }

  const parseCronTime = (cron: string) => {
    const parts = cron.split(' ')
    if (parts.length >= 2) {
      const minute = parts[0].padStart(2, '0')
      const hour = parts[1].padStart(2, '0')
      return `${hour}:${minute}`
    }
    return '--:--'
  }

  return (
    <div className={className}>
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <CalendarCheck className="h-5 w-5 text-primary" />
          <h3 className="font-semibold">定时任务</h3>
        </div>
        {onCreateTask && (
          <Button variant="outline" size="sm" onClick={() => setShowCreateDialog(true)}>
            <Plus className="h-4 w-4 mr-2" />
            添加任务
          </Button>
        )}
      </div>

      {tasks.length === 0 ? (
        <Card>
          <CardContent className="p-8 text-center">
            <Calendar className="h-12 w-12 mx-auto mb-4 text-muted-foreground/50" />
            <p className="text-muted-foreground mb-2">暂无定时任务</p>
            <p className="text-sm text-muted-foreground">
              添加每日站会或每周复盘任务，AI高管团队会自动执行
            </p>
            {onCreateTask && (
              <Button className="mt-4" onClick={() => setShowCreateDialog(true)}>
                <Plus className="h-4 w-4 mr-2" />
                创建第一个任务
              </Button>
            )}
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {tasks.map((task) => {
            const config = TASK_TYPE_CONFIG[task.type]
            const Icon = config.icon

            return (
              <Card key={task.id} className={!task.enabled ? 'opacity-60' : ''}>
                <CardContent className="p-4">
                  <div className="flex items-start justify-between">
                    <div className="flex items-start gap-3">
                      <div className={`p-2 rounded-lg ${config.bgColor}`}>
                        <Icon className={`h-5 w-5 ${config.color}`} />
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <h4 className="font-medium">{config.name}</h4>
                          <Badge variant={task.enabled ? 'default' : 'secondary'}>
                            {task.enabled ? '已启用' : '已禁用'}
                          </Badge>
                        </div>
                        <p className="text-sm text-muted-foreground mt-1">
                          {task.projectName}
                        </p>
                        <div className="flex items-center gap-4 mt-2 text-xs text-muted-foreground">
                          <span className="flex items-center gap-1">
                            <Clock className="h-3 w-3" />
                            {parseCronTime(task.cronExpression)}
                          </span>
                          {task.nextRunAt && task.enabled && (
                            <span className="flex items-center gap-1">
                              <RefreshCw className="h-3 w-3" />
                              {formatNextRun(new Date(task.nextRunAt))}
                            </span>
                          )}
                          {task.lastRunAt && (
                            <span>
                              上次: {new Date(task.lastRunAt).toLocaleString('zh-CN')}
                            </span>
                          )}
                        </div>
                        {task.participants && task.participants.length > 0 && (
                          <div className="flex items-center gap-2 mt-2">
                            <span className="text-xs text-muted-foreground">参与者:</span>
                            <ExecutiveAvatarStack
                              agentIds={task.participants}
                              maxDisplay={4}
                              size="sm"
                            />
                          </div>
                        )}
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      {onRunTask && task.enabled && (
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => onRunTask(task.id)}
                          title="立即执行"
                        >
                          <Play className="h-4 w-4" />
                        </Button>
                      )}
                      {onToggleTask && (
                        <Switch
                          checked={task.enabled}
                          onCheckedChange={(checked) => onToggleTask(task.id, checked)}
                        />
                      )}
                      {onDeleteTask && (
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => onDeleteTask(task.id)}
                          className="text-destructive"
                          title="删除任务"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>
            )
          })}
        </div>
      )}

      {/* 创建任务对话框 */}
      <Dialog open={showCreateDialog} onOpenChange={setShowCreateDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>创建定时任务</DialogTitle>
            <DialogDescription>
              设置AI高管团队的自动执行任务
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            {/* 任务类型 */}
            <div className="space-y-2">
              <Label>任务类型</Label>
              <div className="grid grid-cols-2 gap-3">
                {Object.entries(TASK_TYPE_CONFIG).map(([type, config]) => {
                  const Icon = config.icon
                  const isSelected = newTaskType === type

                  return (
                    <Card
                      key={type}
                      className={`cursor-pointer transition-colors ${
                        isSelected ? 'border-primary bg-primary/5' : 'hover:border-primary/50'
                      }`}
                      onClick={() => setNewTaskType(type as 'daily_standup' | 'weekly_review')}
                    >
                      <CardContent className="p-3">
                        <div className="flex items-center gap-2">
                          <div className={`p-1.5 rounded ${config.bgColor}`}>
                            <Icon className={`h-4 w-4 ${config.color}`} />
                          </div>
                          <div>
                            <p className="font-medium text-sm">{config.name}</p>
                            <p className="text-xs text-muted-foreground">
                              {config.description.slice(0, 15)}...
                            </p>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  )
                })}
              </div>
            </div>

            {/* 执行时间 */}
            <div className="space-y-2">
              <Label>执行时间</Label>
              <div className="flex gap-3">
                {newTaskType === 'weekly_review' && (
                  <Select value={newTaskDay} onValueChange={setNewTaskDay}>
                    <SelectTrigger className="w-24">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {WEEKDAYS.map((day) => (
                        <SelectItem key={day.value} value={day.value}>
                          {day.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
                <input
                  type="time"
                  value={newTaskTime}
                  onChange={(e) => setNewTaskTime(e.target.value)}
                  className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                />
              </div>
              <p className="text-xs text-muted-foreground">
                {newTaskType === 'daily_standup'
                  ? '每天此时间自动执行'
                  : `每${WEEKDAYS.find(d => d.value === newTaskDay)?.label}此时间自动执行`}
              </p>
            </div>

            {/* 任务说明 */}
            <Card className="bg-muted/50">
              <CardContent className="p-3">
                <p className="text-sm text-muted-foreground">
                  {TASK_TYPE_CONFIG[newTaskType].description}
                </p>
              </CardContent>
            </Card>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setShowCreateDialog(false)}>
              取消
            </Button>
            <Button onClick={handleCreate}>
              创建任务
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}

/**
 * 定时任务执行结果面板
 */
interface TaskExecutionResultProps {
  taskType: 'daily_standup' | 'weekly_review'
  projectName: string
  executedAt: Date
  result: string
  participants: AgentId[]
  className?: string
}

export function TaskExecutionResult({
  taskType,
  projectName,
  executedAt,
  result,
  participants,
  className,
}: TaskExecutionResultProps) {
  const config = TASK_TYPE_CONFIG[taskType]
  const Icon = config.icon

  return (
    <Card className={className}>
      <CardHeader className="pb-2">
        <div className="flex items-center gap-2">
          <div className={`p-2 rounded-lg ${config.bgColor}`}>
            <Icon className={`h-5 w-5 ${config.color}`} />
          </div>
          <div>
            <CardTitle className="text-base">{config.name}结果</CardTitle>
            <CardDescription>{projectName}</CardDescription>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <Clock className="h-4 w-4" />
          <span>执行于 {executedAt.toLocaleString('zh-CN')}</span>
        </div>

        {participants.length > 0 && (
          <div className="flex items-center gap-2">
            <span className="text-sm text-muted-foreground">参与高管:</span>
            <ExecutiveAvatarStack agentIds={participants} maxDisplay={5} size="sm" />
          </div>
        )}

        <div className="p-3 bg-muted/50 rounded-lg">
          <p className="text-sm whitespace-pre-wrap">{result}</p>
        </div>
      </CardContent>
    </Card>
  )
}
