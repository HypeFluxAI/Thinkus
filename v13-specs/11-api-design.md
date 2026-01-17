# Thinkus v13 - API设计

> tRPC + REST + WebSocket完整API规格

---

## 基本信息

| 字段 | 值 |
|------|-----|
| 功能名称 | API设计 |
| 优先级 | P0 |
| 预估复杂度 | 中等 |
| 关联模块 | Node.js前端层 |

---

## 1. API概览

### 1.1 核心路由

```typescript
// 用户相关
POST   /api/auth/register          // 注册
POST   /api/auth/login             // 登录
GET    /api/users/me               // 获取当前用户
PATCH  /api/users/me               // 更新用户信息

// 项目相关
GET    /api/projects               // 项目列表
POST   /api/projects               // 创建项目
GET    /api/projects/:id           // 项目详情
PATCH  /api/projects/:id           // 更新项目
DELETE /api/projects/:id           // 删除项目
POST   /api/projects/:id/phase     // 推进阶段

// AI讨论
GET    /api/projects/:id/discussions           // 讨论列表
POST   /api/projects/:id/discussions           // 创建讨论
GET    /api/discussions/:id                    // 讨论详情
POST   /api/discussions/:id/messages           // 发送消息
POST   /api/discussions/:id/conclude           // 结束讨论

// 决策
GET    /api/projects/:id/decisions             // 决策列表
GET    /api/decisions/:id                      // 决策详情
POST   /api/decisions/:id/approve              // 批准决策
POST   /api/decisions/:id/reject               // 拒绝决策

// AI高管
GET    /api/agents                             // 高管列表
GET    /api/agents/:id                         // 高管详情
GET    /api/agents/:id/memories                // 高管记忆
PATCH  /api/agents/:id/preferences             // 更新偏好

// 邀请
POST   /api/waitlist                           // 加入等待列表
GET    /api/invitations                        // 我的邀请码
POST   /api/invitations/verify                 // 验证邀请码

// 订阅
GET    /api/subscriptions/current              // 当前订阅
POST   /api/subscriptions                      // 创建订阅
POST   /api/subscriptions/cancel               // 取消订阅

// WebSocket
WS     /ws/projects/:id                        // 项目实时更新
WS     /ws/discussions/:id                     // 讨论实时消息
```

---

## 2. tRPC Router定义

### 2.1 主路由

```typescript
// lib/trpc/routers/index.ts
import { router } from '../trpc';
import { userRouter } from './user';
import { projectRouter } from './project';
import { discussionRouter } from './discussion';
import { decisionRouter } from './decision';
import { agentRouter } from './agent';
import { invitationRouter } from './invitation';
import { subscriptionRouter } from './subscription';
import { notificationRouter } from './notification';

export const appRouter = router({
  user: userRouter,
  project: projectRouter,
  discussion: discussionRouter,
  decision: decisionRouter,
  agent: agentRouter,
  invitation: invitationRouter,
  subscription: subscriptionRouter,
  notification: notificationRouter,
});

export type AppRouter = typeof appRouter;
```

### 2.2 用户Router

```typescript
// lib/trpc/routers/user.ts
import { router, publicProcedure, protectedProcedure } from '../trpc';
import { z } from 'zod';

export const userRouter = router({
  // 获取当前用户
  me: protectedProcedure.query(async ({ ctx }) => {
    return ctx.db.user.findUnique({
      where: { id: ctx.userId },
      select: {
        id: true,
        email: true,
        name: true,
        avatar: true,
        settings: true,
        createdAt: true,
      },
    });
  }),

  // 更新用户信息
  update: protectedProcedure
    .input(z.object({
      name: z.string().optional(),
      avatar: z.string().url().optional(),
      settings: z.object({
        language: z.enum(['zh', 'en']).optional(),
        theme: z.enum(['light', 'dark', 'system']).optional(),
        notifications: z.object({
          email: z.boolean().optional(),
          push: z.boolean().optional(),
          dailySummary: z.boolean().optional(),
        }).optional(),
      }).optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      return ctx.db.user.update({
        where: { id: ctx.userId },
        data: input,
      });
    }),
});
```

### 2.3 项目Router

```typescript
// lib/trpc/routers/project.ts
export const projectRouter = router({
  // 项目列表
  list: protectedProcedure
    .input(z.object({
      status: z.enum(['active', 'paused', 'completed', 'archived']).optional(),
      limit: z.number().min(1).max(50).default(10),
      cursor: z.string().optional(),
    }))
    .query(async ({ ctx, input }) => {
      const projects = await ctx.db.project.findMany({
        where: {
          userId: ctx.userId,
          ...(input.status && { status: input.status }),
        },
        take: input.limit + 1,
        cursor: input.cursor ? { id: input.cursor } : undefined,
        orderBy: { updatedAt: 'desc' },
      });

      let nextCursor: string | undefined;
      if (projects.length > input.limit) {
        const nextItem = projects.pop();
        nextCursor = nextItem?.id;
      }

      return { projects, nextCursor };
    }),

  // 创建项目
  create: protectedProcedure
    .input(z.object({
      name: z.string().min(1).max(100),
      description: z.string().min(1).max(1000),
      config: z.object({
        techStack: z.array(z.string()).optional(),
        targetPlatforms: z.array(z.string()).optional(),
        businessModel: z.string().optional(),
      }).optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      return ctx.db.project.create({
        data: {
          ...input,
          userId: ctx.userId,
          phase: 'ideation',
          status: 'active',
        },
      });
    }),

  // 获取项目详情
  byId: protectedProcedure
    .input(z.object({ id: z.string() }))
    .query(async ({ ctx, input }) => {
      const project = await ctx.db.project.findFirst({
        where: {
          id: input.id,
          userId: ctx.userId,
        },
        include: {
          discussions: {
            take: 5,
            orderBy: { createdAt: 'desc' },
          },
          decisions: {
            where: { status: 'pending' },
            take: 5,
          },
        },
      });

      if (!project) {
        throw new TRPCError({ code: 'NOT_FOUND' });
      }

      return project;
    }),

  // 更新项目
  update: protectedProcedure
    .input(z.object({
      id: z.string(),
      name: z.string().optional(),
      description: z.string().optional(),
      status: z.enum(['active', 'paused', 'completed', 'archived']).optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      const { id, ...data } = input;
      return ctx.db.project.update({
        where: { id, userId: ctx.userId },
        data,
      });
    }),

  // 推进阶段
  advancePhase: protectedProcedure
    .input(z.object({
      id: z.string(),
      phase: z.enum(['ideation', 'definition', 'design', 'development', 'prelaunch', 'growth']),
    }))
    .mutation(async ({ ctx, input }) => {
      return ctx.db.project.update({
        where: { id: input.id, userId: ctx.userId },
        data: { phase: input.phase },
      });
    }),

  // 获取项目进度
  getProgress: protectedProcedure
    .input(z.object({ id: z.string() }))
    .query(async ({ ctx, input }) => {
      // 从Go层获取详细进度
      const progress = await ctx.goClient.getProjectProgress(input.id);
      return progress;
    }),
});
```

### 2.4 讨论Router

```typescript
// lib/trpc/routers/discussion.ts
export const discussionRouter = router({
  // 创建讨论
  create: protectedProcedure
    .input(z.object({
      projectId: z.string(),
      topic: z.string(),
      participants: z.array(z.string()),  // AgentIds
    }))
    .mutation(async ({ ctx, input }) => {
      return ctx.db.discussion.create({
        data: {
          ...input,
          userId: ctx.userId,
          status: 'active',
        },
      });
    }),

  // 发送消息 (SSE)
  sendMessage: protectedProcedure
    .input(z.object({
      discussionId: z.string(),
      content: z.string(),
    }))
    .mutation(async function* ({ ctx, input }) {
      // 返回SSE流
      const stream = await ctx.aiService.chat(
        input.discussionId,
        input.content,
        ctx.userId
      );

      for await (const chunk of stream) {
        yield chunk;
      }
    }),

  // 获取讨论详情
  byId: protectedProcedure
    .input(z.object({ id: z.string() }))
    .query(async ({ ctx, input }) => {
      return ctx.db.discussion.findFirst({
        where: {
          id: input.id,
          userId: ctx.userId,
        },
        include: {
          project: true,
        },
      });
    }),

  // 结束讨论
  conclude: protectedProcedure
    .input(z.object({ id: z.string() }))
    .mutation(async ({ ctx, input }) => {
      // 1. 生成结论
      const conclusions = await ctx.aiService.generateConclusions(input.id);

      // 2. 更新讨论状态
      return ctx.db.discussion.update({
        where: { id: input.id },
        data: {
          status: 'concluded',
          conclusions,
        },
      });
    }),
});
```

### 2.5 决策Router

```typescript
// lib/trpc/routers/decision.ts
export const decisionRouter = router({
  // 待处理决策列表
  pending: protectedProcedure
    .query(async ({ ctx }) => {
      return ctx.db.decision.findMany({
        where: {
          userId: ctx.userId,
          status: 'pending',
        },
        include: {
          project: {
            select: { id: true, name: true },
          },
        },
        orderBy: [
          { level: 'desc' },  // L3优先
          { createdAt: 'asc' },
        ],
      });
    }),

  // 批准决策
  approve: protectedProcedure
    .input(z.object({
      id: z.string(),
      optionId: z.string(),
      comment: z.string().optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      const decision = await ctx.db.decision.update({
        where: { id: input.id, userId: ctx.userId },
        data: {
          status: 'approved',
          decidedOption: input.optionId,
          decidedAt: new Date(),
        },
      });

      // 通知Go层继续执行
      await ctx.goClient.notifyDecisionMade(decision);

      return decision;
    }),

  // 拒绝决策
  reject: protectedProcedure
    .input(z.object({
      id: z.string(),
      reason: z.string(),
    }))
    .mutation(async ({ ctx, input }) => {
      return ctx.db.decision.update({
        where: { id: input.id, userId: ctx.userId },
        data: {
          status: 'rejected',
          decidedAt: new Date(),
        },
      });
    }),
});
```

### 2.6 AI高管Router

```typescript
// lib/trpc/routers/agent.ts
export const agentRouter = router({
  // 高管列表
  list: protectedProcedure.query(async ({ ctx }) => {
    const executives = await ctx.db.userExecutive.findMany({
      where: { userId: ctx.userId },
    });

    // 合并高管配置信息
    return executives.map(exec => ({
      ...exec,
      ...AGENT_CONFIGS[exec.agentId],
    }));
  }),

  // 高管详情
  byId: protectedProcedure
    .input(z.object({ id: z.string() }))
    .query(async ({ ctx, input }) => {
      const executive = await ctx.db.userExecutive.findFirst({
        where: {
          userId: ctx.userId,
          agentId: input.id,
        },
      });

      if (!executive) {
        throw new TRPCError({ code: 'NOT_FOUND' });
      }

      return {
        ...executive,
        ...AGENT_CONFIGS[input.id],
      };
    }),

  // 获取高管记忆
  memories: protectedProcedure
    .input(z.object({
      agentId: z.string(),
      projectId: z.string().optional(),
      limit: z.number().default(20),
    }))
    .query(async ({ ctx, input }) => {
      return ctx.db.memory.findMany({
        where: {
          userId: ctx.userId,
          agentId: input.agentId,
          ...(input.projectId && { projectId: input.projectId }),
          status: 'active',
        },
        take: input.limit,
        orderBy: { importance: 'desc' },
      });
    }),

  // 更新偏好
  updatePreferences: protectedProcedure
    .input(z.object({
      agentId: z.string(),
      preferences: z.object({
        communicationStyle: z.enum(['formal', 'casual', 'concise', 'detailed']).optional(),
        focusAreas: z.array(z.string()).optional(),
        decisionStyle: z.enum(['fast', 'careful', 'data-driven']).optional(),
      }),
    }))
    .mutation(async ({ ctx, input }) => {
      return ctx.db.userExecutive.update({
        where: {
          userId_agentId: {
            userId: ctx.userId,
            agentId: input.agentId,
          },
        },
        data: {
          learnedPreferences: input.preferences,
        },
      });
    }),
});
```

---

## 3. WebSocket事件

### 3.1 项目实时更新

```typescript
// 项目相关事件
type ProjectEvent =
  | { type: 'progress_update'; data: ProjectProgress }
  | { type: 'phase_changed'; data: { phase: ProjectPhase } }
  | { type: 'task_completed'; data: { taskId: string; result: any } }
  | { type: 'decision_required'; data: IDecision }
  | { type: 'error'; data: { message: string; details?: any } };

// 服务端
io.on('connection', (socket) => {
  socket.on('join:project', async (projectId: string, userId: string) => {
    // 验证权限
    const hasAccess = await verifyProjectAccess(projectId, userId);
    if (hasAccess) {
      socket.join(`project:${projectId}`);
    }
  });
});

// 广播进度更新
function broadcastProgress(projectId: string, progress: ProjectProgress) {
  io.to(`project:${projectId}`).emit('progress_update', progress);
}
```

### 3.2 讨论实时消息

```typescript
// 讨论相关事件
type DiscussionEvent =
  | { type: 'message'; data: { role: 'agent'; agentId: AgentId; content: string } }
  | { type: 'typing'; data: { agentId: AgentId } }
  | { type: 'conclusion'; data: Conclusion }
  | { type: 'decision_requested'; data: IDecision };

// 服务端
io.on('connection', (socket) => {
  socket.on('join:discussion', async (discussionId: string, userId: string) => {
    const hasAccess = await verifyDiscussionAccess(discussionId, userId);
    if (hasAccess) {
      socket.join(`discussion:${discussionId}`);
    }
  });
});

// 广播AI消息
function broadcastAIMessage(discussionId: string, message: any) {
  io.to(`discussion:${discussionId}`).emit('message', message);
}
```

### 3.3 Dashboard实时更新

```typescript
// Dashboard事件
type DashboardEvent =
  | { type: 'project_progress_update'; data: ProjectProgress }
  | { type: 'agent_status_update'; data: AgentStatus }
  | { type: 'new_notification'; data: INotification }
  | { type: 'decision_requested'; data: IPendingDecision }
  | { type: 'cost_update'; data: { currentMonth: number; budget: number } };
```

---

## 4. gRPC服务定义

### 4.1 Node.js -> Go 编排层

```protobuf
syntax = "proto3";

package thinkus;

service TaskService {
  rpc SubmitTask(TaskRequest) returns (TaskResponse);
  rpc GetTaskStatus(TaskStatusRequest) returns (TaskStatusResponse);
  rpc CancelTask(CancelTaskRequest) returns (CancelTaskResponse);
  rpc GetProjectProgress(ProjectId) returns (ProjectProgress);
}

service ContractService {
  rpc CreateContract(CreateContractRequest) returns (Contract);
  rpc GetContract(GetContractRequest) returns (Contract);
  rpc UpdateContract(UpdateContractRequest) returns (Contract);
}

message TaskRequest {
  string project_id = 1;
  string feature_id = 2;
  string task_type = 3;  // develop, test, deploy
  map<string, string> params = 4;
}

message ProjectProgress {
  string project_id = 1;
  string phase = 2;
  int32 progress = 3;
  repeated TaskProgress tasks = 4;
}
```

### 4.2 Go -> Python AI执行层

```protobuf
syntax = "proto3";

package thinkus.ai;

service AIService {
  rpc Chat(ChatRequest) returns (stream ChatResponse);
  rpc GenerateCode(GenerateCodeRequest) returns (GenerateCodeResponse);
  rpc AcceptUI(AcceptUIRequest) returns (AcceptUIResponse);
  rpc RunTests(RunTestsRequest) returns (stream TestResult);
}

message ChatRequest {
  string agent_id = 1;
  string user_id = 2;
  string project_id = 3;
  string message = 4;
  map<string, string> context = 5;
}

message ChatResponse {
  string content = 1;
  bool done = 2;
}

message GenerateCodeRequest {
  string contract_id = 1;
  string target = 2;  // backend, frontend, database
}
```

---

## 5. 认证和授权

### 5.1 NextAuth配置

```typescript
// lib/auth/config.ts
import { NextAuthOptions } from 'next-auth';
import GoogleProvider from 'next-auth/providers/google';
import GitHubProvider from 'next-auth/providers/github';
import CredentialsProvider from 'next-auth/providers/credentials';

export const authOptions: NextAuthOptions = {
  providers: [
    GoogleProvider({
      clientId: process.env.GOOGLE_CLIENT_ID!,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
    }),
    GitHubProvider({
      clientId: process.env.GITHUB_ID!,
      clientSecret: process.env.GITHUB_SECRET!,
    }),
    CredentialsProvider({
      name: 'credentials',
      credentials: {
        email: { label: 'Email', type: 'email' },
        password: { label: 'Password', type: 'password' },
      },
      async authorize(credentials) {
        // 验证邮箱密码
        const user = await verifyCredentials(credentials);
        return user;
      },
    }),
  ],
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.userId = user.id;
      }
      return token;
    },
    async session({ session, token }) {
      session.user.id = token.userId as string;
      return session;
    },
  },
};
```

### 5.2 tRPC中间件

```typescript
// lib/trpc/trpc.ts
import { initTRPC, TRPCError } from '@trpc/server';

const t = initTRPC.context<Context>().create();

export const router = t.router;
export const publicProcedure = t.procedure;

// 需要认证的procedure
export const protectedProcedure = t.procedure.use(async ({ ctx, next }) => {
  if (!ctx.userId) {
    throw new TRPCError({ code: 'UNAUTHORIZED' });
  }
  return next({
    ctx: {
      ...ctx,
      userId: ctx.userId,
    },
  });
});
```

---

## 涉及文件

```yaml
新建:
  - thinkus-app/src/lib/trpc/routers/index.ts
  - thinkus-app/src/lib/trpc/routers/user.ts
  - thinkus-app/src/lib/trpc/routers/project.ts
  - thinkus-app/src/lib/trpc/routers/discussion.ts
  - thinkus-app/src/lib/trpc/routers/decision.ts
  - thinkus-app/src/lib/trpc/routers/agent.ts
  - thinkus-app/src/lib/trpc/routers/invitation.ts
  - thinkus-app/src/lib/trpc/routers/subscription.ts
  - thinkus-app/src/lib/trpc/routers/notification.ts
  - thinkus-app/src/lib/realtime/socket.ts
  - services/go-orchestrator/proto/task.proto
  - services/go-orchestrator/proto/contract.proto
  - services/py-ai-engine/proto/ai.proto

修改:
  - thinkus-app/src/lib/auth/config.ts
  - thinkus-app/src/lib/trpc/trpc.ts
```

---

## 验收标准

- [ ] 所有tRPC路由实现完整
- [ ] 认证授权工作正常
- [ ] WebSocket实时通信正常
- [ ] gRPC服务可调用
- [ ] 错误处理完善

---

## 变更记录

| 日期 | 版本 | 变更内容 | 作者 |
|------|------|----------|------|
| 2026-01-17 | v1.0 | 从完整规格文档拆分 | Claude Code |
