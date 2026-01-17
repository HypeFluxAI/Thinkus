# Thinkus v13 - 多模型智能调度

> Claude Code写代码 + Gemini分析规划 + Haiku快速路由

---

## 基本信息

| 字段 | 值 |
|------|-----|
| 功能名称 | 多模型智能调度 |
| 优先级 | P0 |
| 预估复杂度 | 中等 |
| 关联模块 | Python AI层、Go编排层 |

---

## 1. 模型配置

### 1.1 模型分类

```yaml
代码开发模型 (只能用这两个写代码):
  Claude Code: $20-200/月订阅
  OpenAI Codex: $20-200/月订阅

分析/规划模型 (不写代码):
  Gemini 3 Pro: $2/$12 per 1M tokens (分析规划首选)
  Gemini 3 Flash: $0.50/$3 (快速分析)
  Claude Opus 4.5: $5/$25 (复杂决策)
  Claude Haiku 4.5: $1/$5 (快速分类)
```

### 1.2 模型特点

```yaml
Claude Code:
  优势: 代码生成最强，上下文理解好
  劣势: 订阅制，成本较高
  适用: 所有代码编写任务

Gemini 3 Pro:
  优势: 1M上下文，多模态理解强
  劣势: 代码能力弱于Claude
  适用: 文档分析、设计稿理解、长文本处理

Gemini 3 Flash:
  优势: 速度快，成本低
  劣势: 能力相对弱
  适用: 快速分类、简单问答

Claude Opus 4.5:
  优势: 推理能力最强
  劣势: 成本最高
  适用: 复杂决策、架构设计

Claude Haiku 4.5:
  优势: 响应快，成本低
  劣势: 能力有限
  适用: 任务路由、快速判断
```

---

## 2. 各阶段模型配置

### 2.1 开发流程模型分配

```yaml
阶段1 需求分析:
  主模型: Gemini 3 Pro
  原因: 1M上下文，多模态理解
  任务:
    - 用户文档分析
    - PRD生成
    - 功能点提取

阶段2 设计确认:
  主模型: Gemini 3 Pro
  原因: 多模态强，理解设计稿
  任务:
    - 设计稿分析
    - UI组件识别
    - 交互流程理解

阶段3 架构规划:
  主模型: Claude Opus 4.5
  原因: 架构决策需要最强推理
  任务:
    - 技术选型
    - 系统架构设计
    - 数据库设计

阶段4 代码开发:
  主模型: Claude Code (订阅)
  备选: OpenAI Codex
  原因: 只能用专业代码工具
  任务:
    - 后端API开发
    - 前端组件开发
    - 数据库迁移

阶段5 测试验证:
  测试分析: Gemini 3 Flash
  Bug分析: Claude Opus 4.5
  Bug修复: Claude Code
  任务:
    - 测试用例生成
    - 错误分析
    - 代码修复

阶段6 UI验收:
  主模型: Claude Sonnet (Browser Use)
  任务:
    - UI验收
    - 用户体验评估

辅助功能:
  任务分类/路由: Claude Haiku
  简单问答: Gemini Flash
```

### 2.2 模型选择流程图

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                                                                              │
│  用户请求 → Haiku分类 → 路由到对应模型                                      │
│                                                                              │
│  ┌──────────┐                                                               │
│  │  Haiku   │ 判断任务类型                                                   │
│  │  路由器  │ • 代码任务 → Claude Code                                       │
│  └────┬─────┘ • 分析任务 → Gemini Pro                                        │
│       │       • 决策任务 → Opus                                              │
│       ▼       • 简单问答 → Flash                                             │
│  ┌──────────────────────────────────────────────────────────────────────┐  │
│  │                                                                       │  │
│  │  ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌──────────┐               │  │
│  │  │ Claude   │ │ Gemini   │ │ Claude   │ │ Gemini   │               │  │
│  │  │ Code     │ │ Pro      │ │ Opus     │ │ Flash    │               │  │
│  │  │ 写代码   │ │ 分析     │ │ 决策     │ │ 快速     │               │  │
│  │  └──────────┘ └──────────┘ └──────────┘ └──────────┘               │  │
│  │                                                                       │  │
│  └──────────────────────────────────────────────────────────────────────┘  │
│                                                                              │
└─────────────────────────────────────────────────────────────────────────────┘
```

---

## 3. 智能路由实现

### 3.1 路由器

```python
from enum import Enum
from dataclasses import dataclass
from typing import Optional

class TaskType(Enum):
    CODE_GENERATION = "code_generation"
    CODE_FIX = "code_fix"
    ANALYSIS = "analysis"
    DECISION = "decision"
    QUICK_ANSWER = "quick_answer"
    UI_REVIEW = "ui_review"

class ModelType(Enum):
    CLAUDE_CODE = "claude_code"
    GEMINI_PRO = "gemini_pro"
    GEMINI_FLASH = "gemini_flash"
    CLAUDE_OPUS = "claude_opus"
    CLAUDE_SONNET = "claude_sonnet"
    CLAUDE_HAIKU = "claude_haiku"

@dataclass
class RoutingDecision:
    model: ModelType
    reason: str
    estimated_cost: float
    estimated_time: float

class ModelRouter:
    """智能模型路由器"""

    def __init__(self):
        self.classifier = HaikuClassifier()

    async def route(self, task: str, context: dict) -> RoutingDecision:
        """根据任务自动选择最佳模型"""

        # 1. 使用Haiku快速分类任务
        task_type = await self.classifier.classify(task, context)

        # 2. 根据任务类型选择模型
        return self._select_model(task_type, context)

    def _select_model(self, task_type: TaskType, context: dict) -> RoutingDecision:
        """根据任务类型选择模型"""

        routing_rules = {
            TaskType.CODE_GENERATION: RoutingDecision(
                model=ModelType.CLAUDE_CODE,
                reason="代码生成任务必须使用Claude Code",
                estimated_cost=0.50,
                estimated_time=30
            ),
            TaskType.CODE_FIX: RoutingDecision(
                model=ModelType.CLAUDE_CODE,
                reason="代码修复需要Claude Code",
                estimated_cost=0.30,
                estimated_time=20
            ),
            TaskType.ANALYSIS: RoutingDecision(
                model=ModelType.GEMINI_PRO,
                reason="分析任务使用Gemini Pro，支持长上下文",
                estimated_cost=0.10,
                estimated_time=15
            ),
            TaskType.DECISION: RoutingDecision(
                model=ModelType.CLAUDE_OPUS,
                reason="重要决策使用Opus获得最佳推理",
                estimated_cost=0.50,
                estimated_time=45
            ),
            TaskType.QUICK_ANSWER: RoutingDecision(
                model=ModelType.GEMINI_FLASH,
                reason="简单问答使用Flash快速响应",
                estimated_cost=0.01,
                estimated_time=3
            ),
            TaskType.UI_REVIEW: RoutingDecision(
                model=ModelType.CLAUDE_SONNET,
                reason="UI验收使用Sonnet配合Browser Use",
                estimated_cost=0.20,
                estimated_time=60
            ),
        }

        return routing_rules.get(task_type, routing_rules[TaskType.ANALYSIS])
```

### 3.2 Haiku分类器

```python
class HaikuClassifier:
    """使用Haiku快速分类任务"""

    def __init__(self):
        self.client = Anthropic()

    async def classify(self, task: str, context: dict) -> TaskType:
        """分类任务类型"""

        prompt = f"""快速分类以下任务:

任务: {task}
上下文: {context.get('stage', 'unknown')}

分类选项:
- code_generation: 需要生成新代码
- code_fix: 需要修复代码bug
- analysis: 需要分析文档/数据/设计
- decision: 需要做架构/技术决策
- quick_answer: 简单的问答
- ui_review: UI验收评估

只返回分类名称，不要其他内容。"""

        response = await self.client.messages.create(
            model="claude-haiku-4-5-20251101",
            max_tokens=50,
            messages=[{"role": "user", "content": prompt}]
        )

        task_type_str = response.content[0].text.strip().lower()

        type_mapping = {
            "code_generation": TaskType.CODE_GENERATION,
            "code_fix": TaskType.CODE_FIX,
            "analysis": TaskType.ANALYSIS,
            "decision": TaskType.DECISION,
            "quick_answer": TaskType.QUICK_ANSWER,
            "ui_review": TaskType.UI_REVIEW,
        }

        return type_mapping.get(task_type_str, TaskType.ANALYSIS)
```

### 3.3 模型客户端管理

```python
class ModelClientManager:
    """模型客户端管理器"""

    def __init__(self):
        self.clients = {}
        self._init_clients()

    def _init_clients(self):
        """初始化各模型客户端"""

        # Claude系列
        self.clients[ModelType.CLAUDE_CODE] = ClaudeCodeClient()
        self.clients[ModelType.CLAUDE_OPUS] = AnthropicClient(model="claude-opus-4-5-20251101")
        self.clients[ModelType.CLAUDE_SONNET] = AnthropicClient(model="claude-sonnet-4-20250514")
        self.clients[ModelType.CLAUDE_HAIKU] = AnthropicClient(model="claude-haiku-4-5-20251101")

        # Gemini系列
        self.clients[ModelType.GEMINI_PRO] = GeminiClient(model="gemini-3-pro")
        self.clients[ModelType.GEMINI_FLASH] = GeminiClient(model="gemini-3-flash")

    async def call(self, model: ModelType, prompt: str, **kwargs) -> str:
        """调用指定模型"""

        client = self.clients.get(model)
        if not client:
            raise ValueError(f"Unknown model: {model}")

        return await client.chat(prompt, **kwargs)

    async def call_with_routing(self, task: str, context: dict, **kwargs) -> str:
        """自动路由并调用模型"""

        router = ModelRouter()
        decision = await router.route(task, context)

        return await self.call(decision.model, task, **kwargs)
```

---

## 4. 成本控制

### 4.1 成本估算

```yaml
单项目成本:
  分析规划: ~$4
    - 需求分析 (Gemini Pro): $1.5
    - 设计确认 (Gemini Pro): $1.5
    - 架构规划 (Opus): $1.0

  代码开发: ~$30-50 (订阅分摊)
    - 后端代码 (Claude Code): $15-25
    - 前端代码 (Claude Code): $15-25

  测试验收: ~$3
    - 测试分析 (Flash): $0.5
    - Bug修复 (Claude Code): $2.0
    - UI验收 (Sonnet): $0.5

  辅助: ~$0.25
    - 路由分类 (Haiku): $0.10
    - 简单问答 (Flash): $0.15

  总计: ~$37-57/项目

月度成本 (100个项目):
  固定: Claude Code Max 5x = $100/月
  变动: Gemini + Claude API = ~$850/月
  总计: ~$950-1000/月
  单项目: ~$10
```

### 4.2 成本优化策略

```python
class CostOptimizer:
    """成本优化器"""

    def __init__(self):
        self.daily_budget = 50.0  # 日预算
        self.usage_tracker = UsageTracker()

    async def optimize_call(self, task: str, context: dict) -> RoutingDecision:
        """考虑成本的智能路由"""

        # 1. 获取基础路由决策
        router = ModelRouter()
        decision = await router.route(task, context)

        # 2. 检查预算
        remaining_budget = self.daily_budget - await self.usage_tracker.get_daily_usage()

        # 3. 如果预算紧张，尝试降级
        if remaining_budget < 10 and decision.model in [ModelType.CLAUDE_OPUS]:
            # 降级到更便宜的模型
            return RoutingDecision(
                model=ModelType.GEMINI_PRO,
                reason="预算限制，降级到Gemini Pro",
                estimated_cost=0.10,
                estimated_time=20
            )

        return decision

    async def track_usage(self, model: ModelType, tokens_used: int, cost: float):
        """记录使用情况"""

        await self.usage_tracker.record(
            model=model.value,
            tokens=tokens_used,
            cost=cost,
            timestamp=datetime.now()
        )
```

### 4.3 使用量监控

```python
class UsageTracker:
    """使用量跟踪器"""

    def __init__(self, redis_client):
        self.redis = redis_client

    async def record(self, model: str, tokens: int, cost: float, timestamp: datetime):
        """记录使用"""

        key = f"model_usage:{timestamp.strftime('%Y-%m-%d')}"

        await self.redis.hincrby(key, f"{model}:tokens", tokens)
        await self.redis.hincrbyfloat(key, f"{model}:cost", cost)
        await self.redis.hincrby(key, f"{model}:calls", 1)

        # 设置过期时间（30天）
        await self.redis.expire(key, 30 * 24 * 60 * 60)

    async def get_daily_usage(self) -> float:
        """获取今日使用成本"""

        key = f"model_usage:{datetime.now().strftime('%Y-%m-%d')}"
        data = await self.redis.hgetall(key)

        total_cost = 0.0
        for k, v in data.items():
            if k.endswith(':cost'):
                total_cost += float(v)

        return total_cost

    async def get_usage_report(self, days: int = 7) -> dict:
        """获取使用报告"""

        report = {}

        for i in range(days):
            date = (datetime.now() - timedelta(days=i)).strftime('%Y-%m-%d')
            key = f"model_usage:{date}"
            data = await self.redis.hgetall(key)

            report[date] = {}
            for k, v in data.items():
                model, metric = k.rsplit(':', 1)
                if model not in report[date]:
                    report[date][model] = {}
                report[date][model][metric] = float(v) if metric == 'cost' else int(v)

        return report
```

---

## 5. 数据模型

```typescript
interface IModelUsage {
  _id: ObjectId;
  userId: ObjectId;
  projectId?: ObjectId;

  model: string;  // 模型名称
  taskType: string;  // 任务类型

  tokens: {
    input: number;
    output: number;
    total: number;
  };

  cost: number;  // USD
  duration: number;  // ms

  metadata: {
    stage?: string;  // 开发阶段
    agentId?: string;  // AI高管ID
    success: boolean;
  };

  createdAt: Date;
}

interface IDailyUsageSummary {
  _id: ObjectId;
  date: string;  // YYYY-MM-DD

  byModel: {
    [model: string]: {
      calls: number;
      tokens: number;
      cost: number;
    };
  };

  byTaskType: {
    [taskType: string]: {
      calls: number;
      tokens: number;
      cost: number;
    };
  };

  total: {
    calls: number;
    tokens: number;
    cost: number;
  };
}
```

---

## 涉及文件

```yaml
新建:
  - services/py-ai-engine/routing/router.py
  - services/py-ai-engine/routing/classifier.py
  - services/py-ai-engine/routing/clients.py
  - services/py-ai-engine/routing/cost_optimizer.py
  - services/py-ai-engine/routing/usage_tracker.py
  - thinkus-app/src/lib/db/models/model-usage.ts

修改:
  - services/py-ai-engine/employees/base.py (集成路由)
  - services/go-orchestrator/scheduler/scheduler.go (添加成本控制)

配置:
  - 各模型API Key
  - 预算配置
  - Redis连接
```

---

## 验收标准

- [ ] Haiku分类准确率 > 90%
- [ ] 路由决策延迟 < 500ms
- [ ] 成本控制有效
- [ ] 使用量监控准确
- [ ] 模型降级机制正常

---

## 变更记录

| 日期 | 版本 | 变更内容 | 作者 |
|------|------|----------|------|
| 2026-01-17 | v1.0 | 从完整规格文档拆分 | Claude Code |
