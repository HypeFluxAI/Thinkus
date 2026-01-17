# Thinkus v13 - CEO Dashboard

> 用户的控制中心，像CEO一样管理AI团队

---

## 基本信息

| 字段 | 值 |
|------|-----|
| 功能名称 | CEO Dashboard |
| 优先级 | P0 |
| 预估复杂度 | 中等 |
| 关联模块 | 前端、WebSocket |

---

## 1. 功能概述

```yaml
CEO Dashboard 是用户的控制中心，让用户像CEO一样管理AI团队:

核心功能:
  1. 项目总览: 所有项目状态、进度、关键指标
  2. 待处理决策: 需要用户确认的L2/L3决策
  3. 通知中心: 重要事项、进度更新、异常告警
  4. AI高管状态: 各高管当前任务和状态
  5. 财务概览: 成本、预算、订阅状态
  6. 快捷操作: 创建项目、发起讨论、查看报告
```

---

## 2. 界面设计

### 2.1 主界面布局

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                         CEO Dashboard                                        │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                              │
│  ┌─────────────────┐  ┌─────────────────┐  ┌─────────────────┐             │
│  │ 活跃项目: 3     │  │ 待处理决策: 2   │  │ 本月AI成本: ¥85 │             │
│  │ 进行中任务: 12  │  │ 紧急: 1        │  │ 预算剩余: 65%   │             │
│  └─────────────────┘  └─────────────────┘  └─────────────────┘             │
│                                                                              │
│  【待处理决策】                                                              │
│  ┌─────────────────────────────────────────────────────────────────────┐   │
│  │ ⚠️ [L2] 电商网站-技术选型确认                          还剩23小时   │   │
│  │    David建议使用Next.js + PostgreSQL                    [查看] [决定]│   │
│  └─────────────────────────────────────────────────────────────────────┘   │
│                                                                              │
│  【项目进度】                                                                │
│  ┌─────────────────────────────────────────────────────────────────────┐   │
│  │ 📦 电商网站        设计阶段 ████████░░ 80%                          │   │
│  │ 📦 博客系统        开发阶段 ██████░░░░ 60%                          │   │
│  │ 📦 管理后台        想法探索 ██░░░░░░░░ 20%                          │   │
│  └─────────────────────────────────────────────────────────────────────┘   │
│                                                                              │
│  【AI高管状态】                                                              │
│  Mike: 正在分析需求 | David: 代码审查中 | Elena: 设计稿制作               │
│                                                                              │
└─────────────────────────────────────────────────────────────────────────────┘
```

### 2.2 统计卡片

```typescript
interface DashboardStats {
  // 项目统计
  projects: {
    active: number;
    inProgress: number;
    completed: number;
    paused: number;
  };

  // 任务统计
  tasks: {
    total: number;
    inProgress: number;
    pending: number;
    blocked: number;
  };

  // 决策统计
  decisions: {
    pending: number;
    urgent: number;
    expired: number;
  };

  // 成本统计
  costs: {
    currentMonth: number;
    budget: number;
    budgetUsed: number;  // 百分比
  };
}
```

---

## 3. 待处理决策

### 3.1 决策级别

```yaml
L1 (自动决策):
  - AI高管直接做出决策
  - 用户可事后查看
  - 如: 代码格式、命名规范

L2 (建议决策):
  - AI给出建议，等待用户确认
  - 有时间限制 (24-48小时)
  - 超时自动采用AI建议
  - 如: 技术选型、设计风格

L3 (必须决策):
  - 需要用户明确决定
  - 阻塞后续流程
  - 如: 预算超支、重大变更
```

### 3.2 决策组件

```typescript
interface IPendingDecision {
  _id: ObjectId;
  projectId: ObjectId;
  featureId?: string;

  level: 'L2' | 'L3';
  category: 'tech_choice' | 'design' | 'budget' | 'timeline' | 'feature';

  title: string;
  description: string;

  // 建议方案
  recommendation: {
    summary: string;
    reasoning: string;
    pros: string[];
    cons: string[];
  };

  // 备选方案
  alternatives?: Array<{
    name: string;
    description: string;
    pros: string[];
    cons: string[];
  }>;

  // 时间限制
  deadline?: Date;
  autoApprove: boolean;  // 超时是否自动批准

  // 状态
  status: 'pending' | 'approved' | 'rejected' | 'expired';
  decidedAt?: Date;
  decision?: string;

  // 关联高管
  requestedBy: AgentId;

  createdAt: Date;
}
```

### 3.3 决策页面

```tsx
// components/dashboard/PendingDecisions.tsx
export function PendingDecisions({ decisions }: { decisions: IPendingDecision[] }) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>待处理决策</CardTitle>
        <CardDescription>
          需要您确认的重要决策
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {decisions.map((decision) => (
            <DecisionItem key={decision._id.toString()} decision={decision} />
          ))}
          {decisions.length === 0 && (
            <p className="text-muted-foreground text-center py-4">
              暂无待处理决策
            </p>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

function DecisionItem({ decision }: { decision: IPendingDecision }) {
  const timeLeft = decision.deadline
    ? formatDistanceToNow(decision.deadline, { addSuffix: true })
    : null;

  return (
    <div className="border rounded-lg p-4">
      <div className="flex items-start justify-between">
        <div className="flex items-center gap-2">
          <Badge variant={decision.level === 'L3' ? 'destructive' : 'warning'}>
            {decision.level}
          </Badge>
          <span className="font-medium">{decision.title}</span>
        </div>
        {timeLeft && (
          <span className="text-sm text-muted-foreground">
            {timeLeft}
          </span>
        )}
      </div>

      <p className="text-sm text-muted-foreground mt-2">
        {decision.description}
      </p>

      <div className="mt-4 p-3 bg-muted rounded-md">
        <p className="text-sm font-medium">AI建议:</p>
        <p className="text-sm">{decision.recommendation.summary}</p>
      </div>

      <div className="flex gap-2 mt-4">
        <Button variant="outline" size="sm">
          查看详情
        </Button>
        <Button size="sm">
          做出决定
        </Button>
      </div>
    </div>
  );
}
```

---

## 4. 项目进度

### 4.1 进度显示

```typescript
interface ProjectProgress {
  projectId: string;
  name: string;
  phase: ProjectPhase;
  progress: number;  // 0-100

  // 各阶段进度
  phases: {
    ideation: PhaseStatus;
    definition: PhaseStatus;
    design: PhaseStatus;
    development: PhaseStatus;
    prelaunch: PhaseStatus;
    growth: PhaseStatus;
  };

  // 当前活动
  currentActivity?: {
    agent: AgentId;
    task: string;
    startedAt: Date;
  };

  // 阻塞信息
  blockers?: Array<{
    type: 'decision' | 'bug' | 'external';
    description: string;
  }>;
}

type PhaseStatus = 'pending' | 'in_progress' | 'completed' | 'skipped';
type ProjectPhase = 'ideation' | 'definition' | 'design' | 'development' | 'prelaunch' | 'growth';
```

### 4.2 进度组件

```tsx
// components/dashboard/ProjectProgress.tsx
export function ProjectProgressList({ projects }: { projects: ProjectProgress[] }) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>项目进度</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {projects.map((project) => (
            <ProjectProgressItem key={project.projectId} project={project} />
          ))}
        </div>
      </CardContent>
    </Card>
  );
}

function ProjectProgressItem({ project }: { project: ProjectProgress }) {
  const phaseLabels: Record<ProjectPhase, string> = {
    ideation: '想法探索',
    definition: '需求定义',
    design: '设计阶段',
    development: '开发阶段',
    prelaunch: '发布准备',
    growth: '增长阶段',
  };

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Package className="h-4 w-4" />
          <span className="font-medium">{project.name}</span>
        </div>
        <Badge variant="outline">
          {phaseLabels[project.phase]}
        </Badge>
      </div>

      <div className="flex items-center gap-2">
        <Progress value={project.progress} className="flex-1" />
        <span className="text-sm text-muted-foreground w-12">
          {project.progress}%
        </span>
      </div>

      {project.currentActivity && (
        <p className="text-xs text-muted-foreground">
          {project.currentActivity.agent}: {project.currentActivity.task}
        </p>
      )}

      {project.blockers && project.blockers.length > 0 && (
        <div className="flex items-center gap-1 text-xs text-destructive">
          <AlertCircle className="h-3 w-3" />
          {project.blockers.length} 个阻塞项
        </div>
      )}
    </div>
  );
}
```

---

## 5. AI高管状态

### 5.1 状态数据

```typescript
interface AgentStatus {
  agentId: AgentId;
  name: string;
  avatar: string;

  status: 'idle' | 'working' | 'waiting' | 'blocked';

  // 当前任务
  currentTask?: {
    projectId: string;
    projectName: string;
    description: string;
    progress: number;
    startedAt: Date;
  };

  // 今日统计
  todayStats: {
    tasksCompleted: number;
    decisionsRequested: number;
    codeGenerated?: number;  // 行数
  };

  // 最近活动
  lastActivity: {
    action: string;
    timestamp: Date;
  };
}
```

### 5.2 状态组件

```tsx
// components/dashboard/AgentStatusPanel.tsx
export function AgentStatusPanel({ agents }: { agents: AgentStatus[] }) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>AI高管状态</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
          {agents.map((agent) => (
            <AgentStatusCard key={agent.agentId} agent={agent} />
          ))}
        </div>
      </CardContent>
    </Card>
  );
}

function AgentStatusCard({ agent }: { agent: AgentStatus }) {
  const statusColors = {
    idle: 'bg-gray-100',
    working: 'bg-green-100',
    waiting: 'bg-yellow-100',
    blocked: 'bg-red-100',
  };

  return (
    <div className={`p-3 rounded-lg ${statusColors[agent.status]}`}>
      <div className="flex items-center gap-2">
        <Avatar className="h-8 w-8">
          <AvatarImage src={agent.avatar} />
          <AvatarFallback>{agent.name[0]}</AvatarFallback>
        </Avatar>
        <div>
          <p className="text-sm font-medium">{agent.name}</p>
          <p className="text-xs text-muted-foreground">
            {agent.currentTask?.description || '空闲中'}
          </p>
        </div>
      </div>
    </div>
  );
}
```

---

## 6. 通知中心

### 6.1 通知类型

```typescript
type NotificationType =
  | 'decision_required'    // 需要决策
  | 'task_completed'       // 任务完成
  | 'task_blocked'         // 任务阻塞
  | 'project_milestone'    // 项目里程碑
  | 'budget_alert'         // 预算警告
  | 'error_occurred'       // 错误发生
  | 'feature_ready'        // 功能就绪
  | 'deployment_status';   // 部署状态

interface INotification {
  _id: ObjectId;
  userId: ObjectId;

  type: NotificationType;
  title: string;
  message: string;

  // 关联实体
  projectId?: ObjectId;
  featureId?: string;
  decisionId?: ObjectId;

  // 优先级
  priority: 'low' | 'normal' | 'high' | 'urgent';

  // 状态
  read: boolean;
  readAt?: Date;

  // 操作
  action?: {
    label: string;
    url: string;
  };

  createdAt: Date;
}
```

### 6.2 通知组件

```tsx
// components/dashboard/NotificationCenter.tsx
export function NotificationCenter() {
  const { data: notifications } = trpc.notification.list.useQuery();
  const unreadCount = notifications?.filter(n => !n.read).length || 0;

  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button variant="ghost" size="icon" className="relative">
          <Bell className="h-5 w-5" />
          {unreadCount > 0 && (
            <Badge
              className="absolute -top-1 -right-1 h-5 w-5 p-0 flex items-center justify-center"
              variant="destructive"
            >
              {unreadCount}
            </Badge>
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-80" align="end">
        <div className="space-y-4">
          <h4 className="font-medium">通知</h4>
          <div className="space-y-2 max-h-80 overflow-auto">
            {notifications?.map((notification) => (
              <NotificationItem
                key={notification._id.toString()}
                notification={notification}
              />
            ))}
          </div>
        </div>
      </PopoverContent>
    </Popover>
  );
}
```

---

## 7. 实时更新

### 7.1 WebSocket事件

```typescript
// 仪表盘实时事件
type DashboardEvent =
  | { type: 'project_progress_update'; data: ProjectProgress }
  | { type: 'agent_status_update'; data: AgentStatus }
  | { type: 'new_notification'; data: INotification }
  | { type: 'decision_requested'; data: IPendingDecision }
  | { type: 'decision_resolved'; data: { decisionId: string; result: string } }
  | { type: 'cost_update'; data: { currentMonth: number; budget: number } };
```

### 7.2 实时Hook

```typescript
// hooks/useDashboardRealtime.ts
export function useDashboardRealtime() {
  const queryClient = useQueryClient();

  useEffect(() => {
    const socket = io('/dashboard');

    socket.on('project_progress_update', (data: ProjectProgress) => {
      queryClient.setQueryData(['projects'], (old: ProjectProgress[]) => {
        return old?.map(p =>
          p.projectId === data.projectId ? data : p
        );
      });
    });

    socket.on('agent_status_update', (data: AgentStatus) => {
      queryClient.setQueryData(['agents'], (old: AgentStatus[]) => {
        return old?.map(a =>
          a.agentId === data.agentId ? data : a
        );
      });
    });

    socket.on('new_notification', (data: INotification) => {
      queryClient.setQueryData(['notifications'], (old: INotification[]) => {
        return [data, ...(old || [])];
      });

      // 显示Toast
      toast({
        title: data.title,
        description: data.message,
      });
    });

    return () => {
      socket.disconnect();
    };
  }, [queryClient]);
}
```

---

## 8. 快捷操作

### 8.1 操作面板

```tsx
// components/dashboard/QuickActions.tsx
export function QuickActions() {
  const router = useRouter();

  const actions = [
    {
      icon: Plus,
      label: '新建项目',
      action: () => router.push('/create'),
    },
    {
      icon: MessageSquare,
      label: '发起讨论',
      action: () => router.push('/discuss'),
    },
    {
      icon: FileText,
      label: '查看报告',
      action: () => router.push('/reports'),
    },
    {
      icon: Settings,
      label: '设置',
      action: () => router.push('/settings'),
    },
  ];

  return (
    <div className="flex gap-2">
      {actions.map((action) => (
        <Button
          key={action.label}
          variant="outline"
          size="sm"
          onClick={action.action}
        >
          <action.icon className="h-4 w-4 mr-2" />
          {action.label}
        </Button>
      ))}
    </div>
  );
}
```

---

## 涉及文件

```yaml
新建:
  - thinkus-app/src/app/(main)/dashboard/page.tsx
  - thinkus-app/src/components/dashboard/StatsCards.tsx
  - thinkus-app/src/components/dashboard/PendingDecisions.tsx
  - thinkus-app/src/components/dashboard/ProjectProgress.tsx
  - thinkus-app/src/components/dashboard/AgentStatusPanel.tsx
  - thinkus-app/src/components/dashboard/NotificationCenter.tsx
  - thinkus-app/src/components/dashboard/QuickActions.tsx
  - thinkus-app/src/hooks/useDashboardRealtime.ts
  - thinkus-app/src/lib/db/models/notification.ts
  - thinkus-app/src/lib/db/models/decision.ts

修改:
  - thinkus-app/src/lib/trpc/routers/index.ts (添加dashboard路由)
  - thinkus-app/src/lib/realtime/socket.ts (添加dashboard事件)
```

---

## 验收标准

- [ ] 统计卡片显示正确
- [ ] 待处理决策列表正常
- [ ] 项目进度实时更新
- [ ] AI高管状态显示准确
- [ ] 通知中心工作正常
- [ ] 快捷操作可用

---

## 变更记录

| 日期 | 版本 | 变更内容 | 作者 |
|------|------|----------|------|
| 2026-01-17 | v1.0 | 从完整规格文档拆分 | Claude Code |
