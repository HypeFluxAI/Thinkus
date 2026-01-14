# Thinkus v12 系统架构文档

> **版本**: v12.0 | **日期**: 2026-01-15
>
> **核心技术栈**: Go (编排层) + Python (执行层) + TypeScript (前端)

---

## 一、架构设计理念

### 1.1 为什么选择 Go + Python 混合架构

```yaml
传统方案的问题:
  纯Node.js:
    ❌ 单线程限制
    ❌ node_modules地狱
    ❌ 测试工具生态不如Python
    
  纯Python:
    ❌ GIL限制并发
    ❌ 部署依赖复杂
    ❌ 不适合高并发调度

混合架构的优势:
  Go负责:
    ✅ 高并发任务调度 (goroutine)
    ✅ API网关和路由
    ✅ 服务编排和协调
    ✅ 资源管理和监控
    
  Python负责:
    ✅ AI/LLM调用 (最佳生态)
    ✅ 代码生成和分析
    ✅ 测试执行 (Playwright/Appium)
    ✅ 浏览器自动化

结果:
  • 性能: Go的高并发 + Python的灵活性
  • 生态: 两个语言最好的部分
  • 部署: Go单二进制 + Python容器化
```

### 1.2 核心架构图

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                                                                              │
│                            Thinkus v12 架构                                 │
│                                                                              │
│  ┌─────────────────────────────────────────────────────────────────────┐   │
│  │                         用户界面层                                   │   │
│  │                                                                      │   │
│  │     Web App (Next.js)      Mobile App       Desktop App            │   │
│  │     ├── 实时对话           ├── iOS          ├── Windows            │   │
│  │     ├── AI工作直播         ├── Android      └── Mac                │   │
│  │     ├── 代码编辑器         └── iPad                                 │   │
│  │     └── 测试报告                                                    │   │
│  └─────────────────────────────────────────────────────────────────────┘   │
│                                    │                                        │
│                           HTTP/WebSocket                                    │
│                                    │                                        │
│  ┌─────────────────────────────────────────────────────────────────────┐   │
│  │                         Go 编排层                                    │   │
│  │                                                                      │   │
│  │  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐                 │   │
│  │  │ API Gateway │  │ Task        │  │ Test        │                 │   │
│  │  │             │  │ Scheduler   │  │ Coordinator │                 │   │
│  │  │ • 路由      │  │             │  │             │                 │   │
│  │  │ • 认证      │  │ • 并发调度  │  │ • 测试编排  │                 │   │
│  │  │ • 限流      │  │ • 负载均衡  │  │ • 结果聚合  │                 │   │
│  │  │ • WebSocket │  │ • 故障恢复  │  │ • 报告生成  │                 │   │
│  │  └─────────────┘  └─────────────┘  └─────────────┘                 │   │
│  │                                                                      │   │
│  │  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐                 │   │
│  │  │ Session     │  │ Resource    │  │ Event       │                 │   │
│  │  │ Manager     │  │ Manager     │  │ Bus         │                 │   │
│  │  │             │  │             │  │             │                 │   │
│  │  │ • 会话管理  │  │ • K8s资源   │  │ • 事件发布  │                 │   │
│  │  │ • 状态同步  │  │ • 容器调度  │  │ • 消息队列  │                 │   │
│  │  └─────────────┘  └─────────────┘  └─────────────┘                 │   │
│  └─────────────────────────────────────────────────────────────────────┘   │
│                                    │                                        │
│                                  gRPC                                       │
│                                    │                                        │
│  ┌─────────────────────────────────────────────────────────────────────┐   │
│  │                        Python 执行层                                 │   │
│  │                                                                      │   │
│  │  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐                 │   │
│  │  │ AI Employee │  │ Code        │  │ Browser     │                 │   │
│  │  │ Engine      │  │ Generator   │  │ Controller  │                 │   │
│  │  │             │  │             │  │             │                 │   │
│  │  │ • 18位高管  │  │ • 代码生成  │  │ • Playwright│                 │   │
│  │  │ • 角色扮演  │  │ • 代码分析  │  │ • 截图/录屏 │                 │   │
│  │  │ • 记忆系统  │  │ • 重构建议  │  │ • 数据提取  │                 │   │
│  │  └─────────────┘  └─────────────┘  └─────────────┘                 │   │
│  │                                                                      │   │
│  │  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐                 │   │
│  │  │ Test        │  │ MCP         │  │ Auto        │                 │   │
│  │  │ Runners     │  │ Integration │  │ Verify      │                 │   │
│  │  │             │  │             │  │             │                 │   │
│  │  │ • Web测试   │  │ • context7  │  │ • 构建验证  │                 │   │
│  │  │ • 移动测试  │  │ • grep_app  │  │ • 功能验证  │                 │   │
│  │  │ • 桌面测试  │  │ • 自定义MCP │  │ • AI审查    │                 │   │
│  │  └─────────────┘  └─────────────┘  └─────────────┘                 │   │
│  └─────────────────────────────────────────────────────────────────────┘   │
│                                    │                                        │
│  ┌─────────────────────────────────────────────────────────────────────┐   │
│  │                         基础设施层                                   │   │
│  │                                                                      │   │
│  │  ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌──────────┐ │   │
│  │  │Kubernetes│ │PostgreSQL│ │  Redis   │ │   S3     │ │ Sandbox  │ │   │
│  │  │          │ │          │ │          │ │          │ │ (Docker) │ │   │
│  │  └──────────┘ └──────────┘ └──────────┘ └──────────┘ └──────────┘ │   │
│  └─────────────────────────────────────────────────────────────────────┘   │
│                                                                              │
└─────────────────────────────────────────────────────────────────────────────┘
```

---

## 二、目录结构

```
thinkus/
├── cmd/                              # Go入口
│   ├── gateway/                     # API网关
│   │   └── main.go
│   ├── scheduler/                   # 任务调度器
│   │   └── main.go
│   └── coordinator/                 # 测试协调器
│       └── main.go
│
├── internal/                         # Go内部包
│   ├── gateway/
│   │   ├── router.go
│   │   ├── middleware.go
│   │   └── websocket.go
│   ├── scheduler/
│   │   ├── scheduler.go
│   │   ├── worker_pool.go
│   │   └── task_queue.go
│   ├── coordinator/
│   │   ├── test_coordinator.go
│   │   └── result_aggregator.go
│   └── common/
│       ├── config/
│       ├── logger/
│       └── errors/
│
├── pkg/                              # Go公共包
│   └── proto/                       # gRPC协议
│       ├── ai_employee.proto
│       ├── code_gen.proto
│       ├── test_runner.proto
│       └── browser.proto
│
├── services/                         # Python服务
│   ├── ai_employee/                 # AI员工引擎
│   │   ├── __init__.py
│   │   ├── engine.py
│   │   ├── employees/
│   │   │   ├── mike_pm.py
│   │   │   ├── david_tech.py
│   │   │   ├── elena_ux.py
│   │   │   └── ...
│   │   ├── memory/
│   │   │   ├── memory_manager.py
│   │   │   └── context_window.py
│   │   └── grpc_server.py
│   │
│   ├── code_generator/              # 代码生成器
│   │   ├── __init__.py
│   │   ├── generator.py
│   │   ├── analyzers/
│   │   │   ├── code_analyzer.py
│   │   │   └── dependency_analyzer.py
│   │   └── grpc_server.py
│   │
│   ├── browser_controller/          # 浏览器控制器
│   │   ├── __init__.py
│   │   ├── controller.py
│   │   ├── actions/
│   │   │   ├── navigate.py
│   │   │   ├── extract.py
│   │   │   └── screenshot.py
│   │   └── grpc_server.py
│   │
│   ├── test_runners/                # 测试执行器
│   │   ├── __init__.py
│   │   ├── web_runner.py           # Playwright
│   │   ├── android_runner.py       # Maestro/Appium
│   │   ├── ios_runner.py
│   │   ├── windows_runner.py       # WinAppDriver
│   │   ├── mac_runner.py
│   │   └── grpc_server.py
│   │
│   ├── mcp_integration/             # MCP集成
│   │   ├── __init__.py
│   │   ├── mcp_client.py
│   │   ├── servers/
│   │   │   ├── context7.py
│   │   │   └── grep_app.py
│   │   └── grpc_server.py
│   │
│   └── auto_verify/                 # 自动验证
│       ├── __init__.py
│       ├── verifier.py
│       ├── checkers/
│       │   ├── build_checker.py
│       │   ├── test_checker.py
│       │   └── ai_reviewer.py
│       └── grpc_server.py
│
├── web/                              # 前端 (Next.js)
│   ├── app/
│   ├── components/
│   ├── hooks/
│   └── lib/
│
├── docker/                           # Docker配置
│   ├── go-gateway/
│   │   └── Dockerfile
│   ├── python-ai/
│   │   └── Dockerfile
│   ├── python-test/
│   │   └── Dockerfile
│   └── docker-compose.yml
│
├── k8s/                              # Kubernetes配置
│   ├── base/
│   ├── overlays/
│   └── helm/
│
├── proto/                            # Proto定义
│   └── thinkus/
│       └── v1/
│
├── go.mod
├── go.sum
├── requirements.txt
└── Makefile
```

---

## 三、Go 编排层详细设计

### 3.1 API Gateway

```go
// cmd/gateway/main.go

package main

import (
    "context"
    "log"
    "net/http"
    "os"
    "os/signal"
    "syscall"
    "time"

    "github.com/gin-gonic/gin"
    "github.com/thinkus/internal/gateway"
)

func main() {
    // 初始化路由
    r := gin.Default()
    
    // 中间件
    r.Use(gateway.CORSMiddleware())
    r.Use(gateway.AuthMiddleware())
    r.Use(gateway.RateLimitMiddleware())
    
    // API路由
    api := r.Group("/api/v1")
    {
        // 项目管理
        api.POST("/projects", gateway.CreateProject)
        api.GET("/projects/:id", gateway.GetProject)
        api.DELETE("/projects/:id", gateway.DeleteProject)
        
        // AI对话
        api.POST("/chat", gateway.HandleChat)
        api.GET("/chat/:id/stream", gateway.StreamChat)
        
        // 测试
        api.POST("/test/run", gateway.RunTests)
        api.GET("/test/:id/status", gateway.GetTestStatus)
        api.GET("/test/:id/report", gateway.GetTestReport)
    }
    
    // WebSocket
    r.GET("/ws", gateway.HandleWebSocket)
    
    // 启动服务
    srv := &http.Server{
        Addr:    ":8080",
        Handler: r,
    }
    
    go func() {
        if err := srv.ListenAndServe(); err != nil && err != http.ErrServerClosed {
            log.Fatalf("listen: %s\n", err)
        }
    }()
    
    // 优雅关闭
    quit := make(chan os.Signal, 1)
    signal.Notify(quit, syscall.SIGINT, syscall.SIGTERM)
    <-quit
    
    ctx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
    defer cancel()
    
    if err := srv.Shutdown(ctx); err != nil {
        log.Fatal("Server forced to shutdown:", err)
    }
}
```

### 3.2 Task Scheduler (任务调度器)

```go
// internal/scheduler/scheduler.go

package scheduler

import (
    "context"
    "sync"
    "time"
    
    "github.com/thinkus/pkg/proto"
)

// Task 任务定义
type Task struct {
    ID        string
    Type      TaskType
    Priority  int
    Payload   interface{}
    CreatedAt time.Time
    Status    TaskStatus
    Result    interface{}
    Error     error
}

type TaskType string

const (
    TaskTypeAIChat     TaskType = "ai_chat"
    TaskTypeCodeGen    TaskType = "code_gen"
    TaskTypeTestRun    TaskType = "test_run"
    TaskTypeBrowser    TaskType = "browser"
    TaskTypeVerify     TaskType = "verify"
)

// Scheduler 任务调度器
type Scheduler struct {
    workers    int
    taskQueue  chan *Task
    results    map[string]*Task
    mu         sync.RWMutex
    grpcClient *GRPCClientPool
}

func NewScheduler(workers int) *Scheduler {
    return &Scheduler{
        workers:   workers,
        taskQueue: make(chan *Task, 1000),
        results:   make(map[string]*Task),
    }
}

// Start 启动调度器
func (s *Scheduler) Start(ctx context.Context) {
    // 启动工作池
    for i := 0; i < s.workers; i++ {
        go s.worker(ctx, i)
    }
}

// Submit 提交任务
func (s *Scheduler) Submit(task *Task) string {
    task.ID = generateTaskID()
    task.CreatedAt = time.Now()
    task.Status = TaskStatusPending
    
    s.mu.Lock()
    s.results[task.ID] = task
    s.mu.Unlock()
    
    s.taskQueue <- task
    return task.ID
}

// SubmitParallel 并行提交多个任务
func (s *Scheduler) SubmitParallel(tasks []*Task) []string {
    ids := make([]string, len(tasks))
    var wg sync.WaitGroup
    
    for i, task := range tasks {
        wg.Add(1)
        go func(idx int, t *Task) {
            defer wg.Done()
            ids[idx] = s.Submit(t)
        }(i, task)
    }
    
    wg.Wait()
    return ids
}

// GetResult 获取任务结果
func (s *Scheduler) GetResult(taskID string) (*Task, bool) {
    s.mu.RLock()
    defer s.mu.RUnlock()
    
    task, ok := s.results[taskID]
    return task, ok
}

// WaitAll 等待所有任务完成
func (s *Scheduler) WaitAll(taskIDs []string, timeout time.Duration) []*Task {
    ctx, cancel := context.WithTimeout(context.Background(), timeout)
    defer cancel()
    
    results := make([]*Task, len(taskIDs))
    var wg sync.WaitGroup
    
    for i, id := range taskIDs {
        wg.Add(1)
        go func(idx int, taskID string) {
            defer wg.Done()
            
            for {
                select {
                case <-ctx.Done():
                    return
                default:
                    task, ok := s.GetResult(taskID)
                    if ok && (task.Status == TaskStatusCompleted || task.Status == TaskStatusFailed) {
                        results[idx] = task
                        return
                    }
                    time.Sleep(100 * time.Millisecond)
                }
            }
        }(i, id)
    }
    
    wg.Wait()
    return results
}

// worker 工作协程
func (s *Scheduler) worker(ctx context.Context, id int) {
    for {
        select {
        case <-ctx.Done():
            return
        case task := <-s.taskQueue:
            s.executeTask(task)
        }
    }
}

// executeTask 执行任务
func (s *Scheduler) executeTask(task *Task) {
    task.Status = TaskStatusRunning
    
    var result interface{}
    var err error
    
    switch task.Type {
    case TaskTypeAIChat:
        result, err = s.grpcClient.CallAIEmployee(task.Payload)
    case TaskTypeCodeGen:
        result, err = s.grpcClient.CallCodeGenerator(task.Payload)
    case TaskTypeTestRun:
        result, err = s.grpcClient.CallTestRunner(task.Payload)
    case TaskTypeBrowser:
        result, err = s.grpcClient.CallBrowser(task.Payload)
    case TaskTypeVerify:
        result, err = s.grpcClient.CallVerifier(task.Payload)
    }
    
    s.mu.Lock()
    if err != nil {
        task.Status = TaskStatusFailed
        task.Error = err
    } else {
        task.Status = TaskStatusCompleted
        task.Result = result
    }
    s.mu.Unlock()
}
```

### 3.3 Test Coordinator (测试协调器)

```go
// internal/coordinator/test_coordinator.go

package coordinator

import (
    "context"
    "sync"
    
    "github.com/thinkus/internal/scheduler"
    "github.com/thinkus/pkg/proto"
)

type Platform string

const (
    PlatformWeb     Platform = "web"
    PlatformIOS     Platform = "ios"
    PlatformAndroid Platform = "android"
    PlatformWindows Platform = "windows"
    PlatformMac     Platform = "mac"
)

// TestCoordinator 测试协调器
type TestCoordinator struct {
    scheduler *scheduler.Scheduler
}

func NewTestCoordinator(s *scheduler.Scheduler) *TestCoordinator {
    return &TestCoordinator{scheduler: s}
}

// RunFullPlatformTest 运行全平台测试
func (tc *TestCoordinator) RunFullPlatformTest(
    ctx context.Context,
    req *proto.TestRequest,
) (*proto.TestSession, error) {
    session := &proto.TestSession{
        ID:        generateSessionID(),
        Status:    "running",
        Platforms: req.Platforms,
    }
    
    // 并行执行各平台测试
    var wg sync.WaitGroup
    results := make(chan *proto.PlatformResult, len(req.Platforms))
    
    for _, platform := range req.Platforms {
        wg.Add(1)
        go func(p Platform) {
            defer wg.Done()
            result := tc.runPlatformTest(ctx, p, req.TestCases)
            results <- result
        }(Platform(platform))
    }
    
    // 等待完成
    go func() {
        wg.Wait()
        close(results)
    }()
    
    // 收集结果
    for result := range results {
        session.Results = append(session.Results, result)
    }
    
    // 计算汇总
    session.Summary = tc.calculateSummary(session.Results)
    session.Status = "completed"
    
    return session, nil
}

// runPlatformTest 执行单平台测试
func (tc *TestCoordinator) runPlatformTest(
    ctx context.Context,
    platform Platform,
    testCases []*proto.TestCase,
) *proto.PlatformResult {
    result := &proto.PlatformResult{
        Platform: string(platform),
    }
    
    // 根据平台选择Runner
    var runnerType scheduler.TaskType
    switch platform {
    case PlatformWeb:
        runnerType = scheduler.TaskTypeTestRun
    case PlatformIOS, PlatformAndroid:
        runnerType = scheduler.TaskTypeTestRun
    case PlatformWindows, PlatformMac:
        runnerType = scheduler.TaskTypeTestRun
    }
    
    // 提交测试任务
    tasks := make([]*scheduler.Task, len(testCases))
    for i, tc := range testCases {
        tasks[i] = &scheduler.Task{
            Type: runnerType,
            Payload: map[string]interface{}{
                "platform":  platform,
                "test_case": tc,
            },
        }
    }
    
    taskIDs := tc.scheduler.SubmitParallel(tasks)
    
    // 等待结果
    taskResults := tc.scheduler.WaitAll(taskIDs, 5*time.Minute)
    
    for _, tr := range taskResults {
        if tr.Error != nil {
            result.Failed++
        } else {
            result.Passed++
        }
        result.Total++
    }
    
    return result
}

func (tc *TestCoordinator) calculateSummary(results []*proto.PlatformResult) *proto.TestSummary {
    summary := &proto.TestSummary{}
    
    for _, r := range results {
        summary.Total += r.Total
        summary.Passed += r.Passed
        summary.Failed += r.Failed
    }
    
    return summary
}
```

---

## 四、Python 执行层详细设计

### 4.1 AI Employee Engine

```python
# services/ai_employee/engine.py

from anthropic import Anthropic
from typing import Dict, List, Optional
import grpc
from concurrent import futures

from .employees import get_employee
from .memory import MemoryManager
from proto import ai_employee_pb2, ai_employee_pb2_grpc


class AIEmployeeEngine:
    """AI员工引擎"""
    
    def __init__(self):
        self.client = Anthropic()
        self.memory = MemoryManager()
        
    def chat(
        self,
        employee_id: str,
        message: str,
        context: Optional[Dict] = None
    ) -> str:
        """与AI员工对话"""
        
        # 获取员工配置
        employee = get_employee(employee_id)
        
        # 加载记忆
        memory_context = self.memory.get_context(employee_id)
        
        # 构建系统提示
        system_prompt = self._build_system_prompt(employee, memory_context)
        
        # 调用Claude
        response = self.client.messages.create(
            model=employee.model,
            max_tokens=4000,
            system=system_prompt,
            messages=[
                {"role": "user", "content": message}
            ]
        )
        
        result = response.content[0].text
        
        # 更新记忆
        self.memory.update(employee_id, message, result)
        
        return result
    
    def parallel_discussion(
        self,
        employee_ids: List[str],
        topic: str
    ) -> Dict[str, str]:
        """并行召开多个AI员工讨论"""
        import asyncio
        
        async def discuss(emp_id: str) -> tuple:
            result = self.chat(emp_id, topic)
            return emp_id, result
        
        async def run_all():
            tasks = [discuss(emp_id) for emp_id in employee_ids]
            results = await asyncio.gather(*tasks)
            return dict(results)
        
        return asyncio.run(run_all())
    
    def _build_system_prompt(self, employee, memory_context: str) -> str:
        return f"""你是{employee.name}，{employee.title}。

## 角色设定
{employee.persona}

## 专业技能
{employee.expertise}

## 对话风格
{employee.style}

## 历史记忆
{memory_context}

请基于你的角色设定回答问题。"""


class AIEmployeeServicer(ai_employee_pb2_grpc.AIEmployeeServiceServicer):
    """gRPC服务"""
    
    def __init__(self):
        self.engine = AIEmployeeEngine()
    
    def Chat(self, request, context):
        result = self.engine.chat(
            request.employee_id,
            request.message,
            dict(request.context) if request.context else None
        )
        return ai_employee_pb2.ChatResponse(response=result)
    
    def ParallelDiscussion(self, request, context):
        results = self.engine.parallel_discussion(
            list(request.employee_ids),
            request.topic
        )
        return ai_employee_pb2.DiscussionResponse(results=results)


def serve():
    server = grpc.server(futures.ThreadPoolExecutor(max_workers=10))
    ai_employee_pb2_grpc.add_AIEmployeeServiceServicer_to_server(
        AIEmployeeServicer(), server
    )
    server.add_insecure_port('[::]:50051')
    server.start()
    server.wait_for_termination()


if __name__ == '__main__':
    serve()
```

### 4.2 Test Runner (Playwright)

```python
# services/test_runners/web_runner.py

from playwright.sync_api import sync_playwright, Browser, Page
from typing import Dict, List, Optional
import grpc
from concurrent import futures
from dataclasses import dataclass

from proto import test_runner_pb2, test_runner_pb2_grpc


@dataclass
class TestStep:
    action: str
    target: Optional[str] = None
    value: Optional[str] = None
    timeout: int = 10000


@dataclass
class TestResult:
    test_case_id: str
    platform: str
    browser: str
    status: str
    duration: int
    error: Optional[str] = None
    screenshot: Optional[str] = None


class WebRunner:
    """Web测试执行器 (Playwright)"""
    
    def __init__(self):
        self.playwright = None
        self.browsers: Dict[str, Browser] = {}
    
    def initialize(self, browser_types: List[str] = None):
        """初始化浏览器"""
        if browser_types is None:
            browser_types = ['chromium', 'firefox', 'webkit']
        
        self.playwright = sync_playwright().start()
        
        for browser_type in browser_types:
            if browser_type == 'chromium':
                self.browsers['chrome'] = self.playwright.chromium.launch(headless=True)
            elif browser_type == 'firefox':
                self.browsers['firefox'] = self.playwright.firefox.launch(headless=True)
            elif browser_type == 'webkit':
                self.browsers['safari'] = self.playwright.webkit.launch(headless=True)
    
    def execute(
        self,
        test_case_id: str,
        steps: List[TestStep],
        browser_type: str,
        base_url: str
    ) -> TestResult:
        """执行测试用例"""
        import time
        start_time = time.time()
        
        browser = self.browsers.get(browser_type)
        if not browser:
            return TestResult(
                test_case_id=test_case_id,
                platform='web',
                browser=browser_type,
                status='failed',
                duration=0,
                error='Browser not initialized'
            )
        
        context = browser.new_context()
        page = context.new_page()
        
        try:
            for step in steps:
                self._execute_step(page, step, base_url)
            
            duration = int((time.time() - start_time) * 1000)
            return TestResult(
                test_case_id=test_case_id,
                platform='web',
                browser=browser_type,
                status='passed',
                duration=duration
            )
        
        except Exception as e:
            screenshot = page.screenshot(type='base64')
            duration = int((time.time() - start_time) * 1000)
            return TestResult(
                test_case_id=test_case_id,
                platform='web',
                browser=browser_type,
                status='failed',
                duration=duration,
                error=str(e),
                screenshot=screenshot
            )
        
        finally:
            context.close()
    
    def _execute_step(self, page: Page, step: TestStep, base_url: str):
        """执行单个测试步骤"""
        timeout = step.timeout
        
        if step.action == 'launch':
            page.goto(base_url + (step.value or '/'), timeout=timeout)
        
        elif step.action == 'tap':
            page.click(step.target, timeout=timeout)
        
        elif step.action == 'input':
            page.fill(step.target, step.value or '', timeout=timeout)
        
        elif step.action == 'assert':
            locator = page.locator(step.target)
            locator.wait_for(state='visible', timeout=timeout)
            if step.value:
                text = locator.text_content()
                if step.value not in text:
                    raise AssertionError(f"Expected '{step.value}' but got '{text}'")
        
        elif step.action == 'wait':
            page.wait_for_timeout(int(step.value or 1000))
        
        elif step.action == 'screenshot':
            page.screenshot(path=f'screenshot-{step.target or "page"}.png')
    
    def cleanup(self):
        """清理资源"""
        for browser in self.browsers.values():
            browser.close()
        if self.playwright:
            self.playwright.stop()


class TestRunnerServicer(test_runner_pb2_grpc.TestRunnerServiceServicer):
    """gRPC服务"""
    
    def __init__(self):
        self.web_runner = WebRunner()
        self.web_runner.initialize()
    
    def RunTest(self, request, context):
        steps = [
            TestStep(
                action=s.action,
                target=s.target,
                value=s.value,
                timeout=s.timeout
            )
            for s in request.steps
        ]
        
        result = self.web_runner.execute(
            request.test_case_id,
            steps,
            request.browser,
            request.base_url
        )
        
        return test_runner_pb2.TestResult(
            test_case_id=result.test_case_id,
            platform=result.platform,
            browser=result.browser,
            status=result.status,
            duration=result.duration,
            error=result.error or '',
            screenshot=result.screenshot or ''
        )


def serve():
    server = grpc.server(futures.ThreadPoolExecutor(max_workers=10))
    test_runner_pb2_grpc.add_TestRunnerServiceServicer_to_server(
        TestRunnerServicer(), server
    )
    server.add_insecure_port('[::]:50052')
    server.start()
    server.wait_for_termination()


if __name__ == '__main__':
    serve()
```

### 4.3 Auto Verify

```python
# services/auto_verify/verifier.py

from anthropic import Anthropic
from typing import Dict, List, Optional
from dataclasses import dataclass
import subprocess
import os

from .checkers import BuildChecker, TestChecker, AIReviewer


@dataclass
class VerifyResult:
    status: str  # passed, failed
    build_result: Optional[Dict] = None
    test_result: Optional[Dict] = None
    ai_review: Optional[Dict] = None
    issues: List[str] = None


class AutoVerifier:
    """自动验证器"""
    
    def __init__(self):
        self.build_checker = BuildChecker()
        self.test_checker = TestChecker()
        self.ai_reviewer = AIReviewer()
    
    def verify(
        self,
        project_path: str,
        changes: List[str],
        config: Optional[Dict] = None
    ) -> VerifyResult:
        """执行完整验证流程"""
        config = config or {}
        issues = []
        
        # 1. 构建验证
        build_result = self.build_checker.check(project_path)
        if build_result['status'] == 'failed':
            issues.extend(build_result.get('errors', []))
            return VerifyResult(
                status='failed',
                build_result=build_result,
                issues=issues
            )
        
        # 2. 测试验证
        test_result = self.test_checker.check(project_path)
        if test_result['status'] == 'failed':
            issues.extend(test_result.get('errors', []))
            return VerifyResult(
                status='failed',
                build_result=build_result,
                test_result=test_result,
                issues=issues
            )
        
        # 3. AI审查
        if config.get('enable_ai_review', True):
            ai_review = self.ai_reviewer.review(project_path, changes)
            if ai_review.get('issues'):
                issues.extend(ai_review['issues'])
        else:
            ai_review = None
        
        # 判断最终状态
        final_status = 'passed' if not issues else 'failed'
        
        return VerifyResult(
            status=final_status,
            build_result=build_result,
            test_result=test_result,
            ai_review=ai_review,
            issues=issues
        )


class BuildChecker:
    """构建检查器"""
    
    def check(self, project_path: str) -> Dict:
        """检查项目是否能成功构建"""
        try:
            # 检测项目类型并执行对应构建命令
            if os.path.exists(os.path.join(project_path, 'package.json')):
                result = subprocess.run(
                    ['npm', 'run', 'build'],
                    cwd=project_path,
                    capture_output=True,
                    text=True,
                    timeout=300
                )
            elif os.path.exists(os.path.join(project_path, 'go.mod')):
                result = subprocess.run(
                    ['go', 'build', './...'],
                    cwd=project_path,
                    capture_output=True,
                    text=True,
                    timeout=300
                )
            elif os.path.exists(os.path.join(project_path, 'requirements.txt')):
                result = subprocess.run(
                    ['python', '-m', 'py_compile'] + self._get_python_files(project_path),
                    cwd=project_path,
                    capture_output=True,
                    text=True,
                    timeout=300
                )
            else:
                return {'status': 'skipped', 'message': 'Unknown project type'}
            
            if result.returncode == 0:
                return {'status': 'passed'}
            else:
                return {
                    'status': 'failed',
                    'errors': [result.stderr]
                }
        
        except Exception as e:
            return {
                'status': 'failed',
                'errors': [str(e)]
            }
    
    def _get_python_files(self, path: str) -> List[str]:
        files = []
        for root, _, filenames in os.walk(path):
            for f in filenames:
                if f.endswith('.py'):
                    files.append(os.path.join(root, f))
        return files


class AIReviewer:
    """AI代码审查"""
    
    def __init__(self):
        self.client = Anthropic()
    
    def review(self, project_path: str, changes: List[str]) -> Dict:
        """AI审查代码变更"""
        
        # 读取变更的文件内容
        file_contents = []
        for change in changes:
            try:
                with open(os.path.join(project_path, change), 'r') as f:
                    file_contents.append({
                        'path': change,
                        'content': f.read()
                    })
            except:
                pass
        
        if not file_contents:
            return {'status': 'skipped', 'message': 'No files to review'}
        
        # 调用Claude进行审查
        response = self.client.messages.create(
            model='claude-sonnet-4-20250514',
            max_tokens=2000,
            system="""你是高级代码审查专家。审查代码并找出:
1. 潜在Bug
2. 安全漏洞
3. 性能问题
4. 代码风格问题

返回JSON格式:
{
  "issues": ["问题1", "问题2"],
  "suggestions": ["建议1", "建议2"],
  "score": 85
}""",
            messages=[{
                "role": "user",
                "content": f"审查以下代码变更:\n\n{file_contents}"
            }]
        )
        
        import json
        try:
            text = response.content[0].text
            return json.loads(text)
        except:
            return {'status': 'error', 'message': 'Failed to parse AI response'}
```

---

## 五、gRPC协议定义

### 5.1 AI Employee Proto

```protobuf
// proto/thinkus/v1/ai_employee.proto

syntax = "proto3";

package thinkus.v1;

option go_package = "github.com/thinkus/pkg/proto";

service AIEmployeeService {
    rpc Chat(ChatRequest) returns (ChatResponse);
    rpc ParallelDiscussion(DiscussionRequest) returns (DiscussionResponse);
    rpc GetMemory(MemoryRequest) returns (MemoryResponse);
}

message ChatRequest {
    string employee_id = 1;
    string message = 2;
    map<string, string> context = 3;
}

message ChatResponse {
    string response = 1;
    string employee_id = 2;
    int64 tokens_used = 3;
}

message DiscussionRequest {
    repeated string employee_ids = 1;
    string topic = 2;
}

message DiscussionResponse {
    map<string, string> results = 1;
}

message MemoryRequest {
    string employee_id = 1;
}

message MemoryResponse {
    string memory_context = 1;
}
```

### 5.2 Test Runner Proto

```protobuf
// proto/thinkus/v1/test_runner.proto

syntax = "proto3";

package thinkus.v1;

option go_package = "github.com/thinkus/pkg/proto";

service TestRunnerService {
    rpc RunTest(TestRequest) returns (TestResult);
    rpc RunParallel(ParallelTestRequest) returns (ParallelTestResult);
}

message TestRequest {
    string test_case_id = 1;
    string platform = 2;
    string browser = 3;
    string base_url = 4;
    repeated TestStep steps = 5;
}

message TestStep {
    string action = 1;
    string target = 2;
    string value = 3;
    int32 timeout = 4;
}

message TestResult {
    string test_case_id = 1;
    string platform = 2;
    string browser = 3;
    string status = 4;
    int64 duration = 5;
    string error = 6;
    string screenshot = 7;
}

message ParallelTestRequest {
    repeated TestRequest requests = 1;
}

message ParallelTestResult {
    repeated TestResult results = 1;
}
```

---

## 六、Docker配置

### 6.1 Go Gateway Dockerfile

```dockerfile
# docker/go-gateway/Dockerfile

FROM golang:1.21-alpine AS builder

WORKDIR /app

COPY go.mod go.sum ./
RUN go mod download

COPY cmd/ cmd/
COPY internal/ internal/
COPY pkg/ pkg/

RUN CGO_ENABLED=0 GOOS=linux go build -o /gateway ./cmd/gateway

FROM alpine:3.18

RUN apk --no-cache add ca-certificates

COPY --from=builder /gateway /gateway

EXPOSE 8080

CMD ["/gateway"]
```

### 6.2 Python Services Dockerfile

```dockerfile
# docker/python-services/Dockerfile

FROM python:3.11-slim

WORKDIR /app

# 安装系统依赖
RUN apt-get update && apt-get install -y \
    build-essential \
    && rm -rf /var/lib/apt/lists/*

# 安装Python依赖
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# 安装Playwright浏览器
RUN playwright install chromium firefox webkit
RUN playwright install-deps

# 复制代码
COPY services/ services/
COPY proto/ proto/

EXPOSE 50051 50052

CMD ["python", "-m", "services.ai_employee.engine"]
```

### 6.3 Docker Compose

```yaml
# docker/docker-compose.yml

version: '3.8'

services:
  gateway:
    build:
      context: ..
      dockerfile: docker/go-gateway/Dockerfile
    ports:
      - "8080:8080"
    environment:
      - AI_EMPLOYEE_ADDR=ai-employee:50051
      - TEST_RUNNER_ADDR=test-runner:50052
    depends_on:
      - ai-employee
      - test-runner
      - postgres
      - redis

  ai-employee:
    build:
      context: ..
      dockerfile: docker/python-services/Dockerfile
    command: python -m services.ai_employee.engine
    environment:
      - ANTHROPIC_API_KEY=${ANTHROPIC_API_KEY}
    ports:
      - "50051:50051"

  test-runner:
    build:
      context: ..
      dockerfile: docker/python-services/Dockerfile
    command: python -m services.test_runners.web_runner
    ports:
      - "50052:50052"
    # Playwright需要共享内存
    shm_size: 2gb

  postgres:
    image: postgres:15-alpine
    environment:
      - POSTGRES_USER=thinkus
      - POSTGRES_PASSWORD=thinkus
      - POSTGRES_DB=thinkus
    volumes:
      - postgres_data:/var/lib/postgresql/data
    ports:
      - "5432:5432"

  redis:
    image: redis:7-alpine
    ports:
      - "6379:6379"

volumes:
  postgres_data:
```

---

## 七、开发规范

### 7.1 Go编码规范

```go
// 1. 包名使用小写
package scheduler

// 2. 接口命名以er结尾
type Scheduler interface {
    Submit(task *Task) string
    GetResult(taskID string) (*Task, bool)
}

// 3. 错误处理
func (s *Scheduler) Submit(task *Task) (string, error) {
    if task == nil {
        return "", errors.New("task cannot be nil")
    }
    // ...
}

// 4. Context传递
func (s *Scheduler) Execute(ctx context.Context, task *Task) error {
    select {
    case <-ctx.Done():
        return ctx.Err()
    default:
        // 执行任务
    }
}
```

### 7.2 Python编码规范

```python
# 1. 使用类型注解
def chat(
    self,
    employee_id: str,
    message: str,
    context: Optional[Dict[str, str]] = None
) -> str:
    pass

# 2. 使用dataclass
from dataclasses import dataclass

@dataclass
class TestResult:
    test_case_id: str
    status: str
    duration: int

# 3. 异常处理
class AIEmployeeError(Exception):
    """AI员工相关错误"""
    pass

# 4. 日志使用
import logging
logger = logging.getLogger(__name__)

def chat(self, message: str) -> str:
    logger.info(f"Received message: {message[:50]}...")
```

---

**下一步**: 查看具体模块的详细实现文档
