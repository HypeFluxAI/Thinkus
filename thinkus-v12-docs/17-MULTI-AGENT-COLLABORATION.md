# Thinkus 多智能体协作架构

> **版本**: v12.0 | **日期**: 2026-01-15
>
> **参考**: Cursor FastRender项目 (300万行代码，数百智能体协作)
>
> **核心模式**: 规划者-工作者-裁判 分层架构

---

## 一、背景：为什么需要多智能体协作

### 1.1 单智能体的局限

```yaml
问题:
  - 单个AI处理复杂项目容易迷失方向
  - 长时间任务容易偏离目标
  - 缺乏自检机制，错误累积
  - 专业能力有限，无法覆盖所有领域

现实:
  一个复杂产品需要: PM规划 + 架构设计 + 前端开发 + 后端开发 + 测试验证
  单个AI很难同时胜任所有角色
```

### 1.2 Cursor的教训：扁平化协作失败

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                                                                              │
│  ❌ 失败方案：扁平化协作 (Cursor最初尝试)                                   │
│                                                                              │
│     Agent1 ←──→ Agent2 ←──→ Agent3 ←──→ Agent4                             │
│                      ↑                                                       │
│                共享文件 + 锁机制                                            │
│                                                                              │
│  严重问题:                                                                   │
│  ┌─────────────────────────────────────────────────────────────────────┐   │
│  │ 1. 锁等待严重: 20个智能体实际吞吐量 = 2-3个                         │   │
│  │ 2. 死锁风险: 智能体崩溃忘记释放锁 → 系统死锁                        │   │
│  │ 3. 智能体摸鱼: 挑简单任务做，回避核心难题，项目停滞                 │   │
│  └─────────────────────────────────────────────────────────────────────┘   │
│                                                                              │
│  教训: 没有清晰层级的多智能体协作必然失败                                  │
│                                                                              │
└─────────────────────────────────────────────────────────────────────────────┘
```

---

## 二、Thinkus多智能体架构

### 2.1 核心架构：规划者-工作者-裁判

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                                                                              │
│                    Thinkus 多智能体分层架构                                 │
│                                                                              │
│  ═══════════════════════════════════════════════════════════════════════   │
│                                                                              │
│                         ┌─────────────────┐                                 │
│                         │   用户 (User)   │                                 │
│                         └────────┬────────┘                                 │
│                                  │ 需求输入                                 │
│                                  ▼                                          │
│  ┌─────────────────────────────────────────────────────────────────────┐   │
│  │                                                                      │   │
│  │                    🎯 规划层 (Planner Layer)                         │   │
│  │                                                                      │   │
│  │    ┌─────────────────────────────────────────────────────────┐     │   │
│  │    │                    Mike (PM)                             │     │   │
│  │    │                   首席规划者                              │     │   │
│  │    │                                                          │     │   │
│  │    │  职责:                                                   │     │   │
│  │    │  • 理解用户需求                                          │     │   │
│  │    │  • 分解任务为可执行单元                                  │     │   │
│  │    │  • 标记任务难度和优先级                                  │     │   │
│  │    │  • 委托专家做子领域规划                                  │     │   │
│  │    └─────────────────────────────────────────────────────────┘     │   │
│  │                              │                                      │   │
│  │              ┌───────────────┼───────────────┐                     │   │
│  │              ▼               ▼               ▼                     │   │
│  │    ┌──────────────┐ ┌──────────────┐ ┌──────────────┐             │   │
│  │    │David (Tech)  │ │Elena (UX)    │ │Kevin (QA)    │             │   │
│  │    │技术子规划    │ │设计子规划    │ │测试子规划    │             │   │
│  │    │              │ │              │ │              │             │   │
│  │    │• 技术方案    │ │• 设计方案    │ │• 测试策略    │             │   │
│  │    │• 架构决策    │ │• 交互流程    │ │• 验收标准    │             │   │
│  │    └──────────────┘ └──────────────┘ └──────────────┘             │   │
│  │                                                                      │   │
│  └─────────────────────────────────────────────────────────────────────┘   │
│                                  │                                          │
│                                  │ 任务分配                                │
│                                  ▼                                          │
│  ┌─────────────────────────────────────────────────────────────────────┐   │
│  │                                                                      │   │
│  │                    ⚙️ 执行层 (Worker Layer)                          │   │
│  │                                                                      │   │
│  │    ┌──────────────┐ ┌──────────────┐ ┌──────────────┐              │   │
│  │    │ Frontend Dev │ │ Backend Dev  │ │ Test Runner  │              │   │
│  │    │   前端开发   │ │   后端开发   │ │   测试执行   │              │   │
│  │    └──────────────┘ └──────────────┘ └──────────────┘              │   │
│  │                                                                      │   │
│  │    ┌──────────────┐ ┌──────────────┐ ┌──────────────┐              │   │
│  │    │ Code Gen     │ │ DB Designer  │ │ API Builder  │              │   │
│  │    │   代码生成   │ │   数据库设计 │ │   API构建    │              │   │
│  │    └──────────────┘ └──────────────┘ └──────────────┘              │   │
│  │                                                                      │   │
│  │    特点:                                                            │   │
│  │    • 专注执行，不需要相互协调                                       │   │
│  │    • 接收任务 → 完成 → 提交                                        │   │
│  │    • 并行工作，互不干扰                                             │   │
│  │                                                                      │   │
│  └─────────────────────────────────────────────────────────────────────┘   │
│                                  │                                          │
│                                  │ 产出提交                                │
│                                  ▼                                          │
│  ┌─────────────────────────────────────────────────────────────────────┐   │
│  │                                                                      │   │
│  │                    ⚖️ 裁判层 (Judge Layer)                           │   │
│  │                                                                      │   │
│  │    ┌─────────────────────────────────────────────────────────┐     │   │
│  │    │               Kevin (QA) + Auto-Verify                   │     │   │
│  │    │                     质量裁判                              │     │   │
│  │    │                                                          │     │   │
│  │    │  职责:                                                   │     │   │
│  │    │  • 验证代码质量 (构建/测试/规范)                         │     │   │
│  │    │  • 评估任务完成度                                        │     │   │
│  │    │  • 检测是否偏离目标                                      │     │   │
│  │    │  • 决定: 通过 / 返工 / 重启                             │     │   │
│  │    └─────────────────────────────────────────────────────────┘     │   │
│  │                              │                                      │   │
│  │              ┌───────────────┼───────────────┐                     │   │
│  │              ▼               ▼               ▼                     │   │
│  │         ✅ 通过         🔄 返工         🔁 重启                    │   │
│  │         交付用户        回到执行层       回到规划层                 │   │
│  │                                                                      │   │
│  └─────────────────────────────────────────────────────────────────────┘   │
│                                                                              │
└─────────────────────────────────────────────────────────────────────────────┘
```

### 2.2 角色映射

| 架构角色 | Thinkus实现 | 职责 |
|----------|-------------|------|
| **首席规划者** | Mike (PM) | 需求理解、任务分解、优先级排序 |
| **技术子规划者** | David (Tech) | 技术方案、架构决策 |
| **设计子规划者** | Elena (UX) | 设计方案、交互流程 |
| **测试子规划者** | Kevin (QA) | 测试策略、验收标准 |
| **前端工作者** | Frontend Subagent | React/Vue组件开发 |
| **后端工作者** | Backend Subagent | API/数据库开发 |
| **测试工作者** | Test Runner Subagent | 自动化测试执行 |
| **质量裁判** | Kevin (QA) + Auto-Verify | 代码验证、质量评估 |

---

## 三、防摸鱼机制

### 3.1 问题：智能体倾向于挑简单任务

```yaml
Cursor发现的问题:
  在没有明确约束的情况下，智能体会:
  - 优先选择简单、安全的任务
  - 回避真正困难的核心问题
  - 导致项目核心功能停滞不前
  
  本质原因:
  - 简单任务容易"完成"，获得正反馈
  - 困难任务可能失败，智能体会回避
```

### 3.2 解决方案：任务难度标记 + 强制分配

```python
# services/task_manager/anti_slacking.py

from enum import Enum
from dataclasses import dataclass
from typing import List, Dict


class TaskDifficulty(Enum):
    """任务难度级别"""
    EASY = 1        # 简单任务 (样式调整、文案修改)
    MEDIUM = 2      # 中等任务 (功能模块开发)
    HARD = 3        # 困难任务 (核心架构、复杂逻辑)
    CRITICAL = 4    # 关键任务 (必须完成才能继续)


class TaskPriority(Enum):
    """任务优先级"""
    LOW = 1
    MEDIUM = 2
    HIGH = 3
    BLOCKER = 4     # 阻塞其他任务


@dataclass
class Task:
    """任务定义"""
    id: str
    title: str
    description: str
    difficulty: TaskDifficulty
    priority: TaskPriority
    is_core: bool           # 是否核心功能
    dependencies: List[str] # 依赖的任务ID
    assigned_to: str        # 分配给哪个Worker
    status: str             # pending/in_progress/completed/blocked


class AntiSlackingManager:
    """防摸鱼管理器"""
    
    def __init__(self):
        self.tasks: Dict[str, Task] = {}
        self.worker_stats: Dict[str, Dict] = {}  # Worker完成任务统计
    
    def analyze_task_distribution(self, worker_id: str) -> Dict:
        """分析Worker的任务难度分布"""
        stats = self.worker_stats.get(worker_id, {
            'easy': 0, 'medium': 0, 'hard': 0, 'critical': 0
        })
        
        total = sum(stats.values())
        if total == 0:
            return {'healthy': True, 'reason': 'No tasks yet'}
        
        # 计算难度分布比例
        hard_ratio = (stats['hard'] + stats['critical']) / total
        easy_ratio = stats['easy'] / total
        
        # 判断是否在摸鱼
        if easy_ratio > 0.7:
            return {
                'healthy': False,
                'reason': f'Worker偏向简单任务 ({easy_ratio*100:.0f}%)',
                'recommendation': '强制分配困难任务'
            }
        
        if hard_ratio < 0.2 and total > 5:
            return {
                'healthy': False,
                'reason': f'困难任务完成比例过低 ({hard_ratio*100:.0f}%)',
                'recommendation': '需要承担更多核心任务'
            }
        
        return {'healthy': True, 'reason': 'Task distribution is balanced'}
    
    def get_next_task(self, worker_id: str) -> Task:
        """获取下一个任务 (防摸鱼逻辑)"""
        pending_tasks = [t for t in self.tasks.values() if t.status == 'pending']
        
        if not pending_tasks:
            return None
        
        # 检查Worker是否在摸鱼
        distribution = self.analyze_task_distribution(worker_id)
        
        if not distribution['healthy']:
            # 强制分配困难任务
            hard_tasks = [t for t in pending_tasks 
                         if t.difficulty in [TaskDifficulty.HARD, TaskDifficulty.CRITICAL]]
            if hard_tasks:
                # 选择优先级最高的困难任务
                return max(hard_tasks, key=lambda t: t.priority.value)
        
        # 正常分配：优先处理阻塞任务和核心任务
        blocker_tasks = [t for t in pending_tasks if t.priority == TaskPriority.BLOCKER]
        if blocker_tasks:
            return blocker_tasks[0]
        
        core_tasks = [t for t in pending_tasks if t.is_core]
        if core_tasks:
            return max(core_tasks, key=lambda t: t.priority.value)
        
        # 按优先级排序
        return max(pending_tasks, key=lambda t: t.priority.value)
    
    def check_core_progress(self) -> Dict:
        """检查核心功能完成进度"""
        core_tasks = [t for t in self.tasks.values() if t.is_core]
        
        if not core_tasks:
            return {'progress': 100, 'status': 'No core tasks'}
        
        completed = len([t for t in core_tasks if t.status == 'completed'])
        total = len(core_tasks)
        progress = (completed / total) * 100
        
        blocked = [t for t in core_tasks if t.status == 'blocked']
        
        return {
            'progress': progress,
            'completed': completed,
            'total': total,
            'blocked': [t.title for t in blocked],
            'status': 'healthy' if not blocked else 'blocked'
        }
```

### 3.3 任务标记示例

```yaml
项目: 任务管理工具

任务列表:
  - id: T001
    title: "设计数据库Schema"
    difficulty: HARD
    priority: BLOCKER
    is_core: true
    reason: "后续所有功能都依赖数据库设计"
  
  - id: T002
    title: "实现用户认证"
    difficulty: HARD
    priority: HIGH
    is_core: true
    reason: "核心安全功能"
  
  - id: T003
    title: "任务CRUD接口"
    difficulty: MEDIUM
    priority: HIGH
    is_core: true
    dependencies: [T001]
  
  - id: T004
    title: "任务列表UI"
    difficulty: MEDIUM
    priority: MEDIUM
    is_core: true
    dependencies: [T003]
  
  - id: T005
    title: "调整按钮颜色"
    difficulty: EASY
    priority: LOW
    is_core: false
    reason: "美化任务，非核心"

分配原则:
  1. BLOCKER任务必须先完成
  2. 核心任务优先于非核心
  3. Worker不能只做EASY任务
  4. 监控任务难度分布，发现摸鱼立即纠正
```

---

## 四、检查点与重启机制

### 4.1 问题：任务跑偏难以纠正

```yaml
问题:
  - 长时间任务容易偏离原始目标
  - 错误累积后，继续下去只会越走越远
  - 需要机制允许"推倒重来"

Cursor的做法:
  Judge在每个工作周期结束时评估
  允许系统定期从干净状态重新开始
  防止任务跑偏
```

### 4.2 解决方案：检查点机制

```python
# services/checkpoint/checkpoint_manager.py

from dataclasses import dataclass
from datetime import datetime
from typing import Dict, List, Optional
from enum import Enum


class CheckpointStatus(Enum):
    """检查点状态"""
    PASSED = "passed"           # 通过，继续
    NEEDS_REVISION = "revision" # 需要修改，回到Worker
    NEEDS_RESTART = "restart"   # 严重偏离，回到Planner重新规划


@dataclass
class Checkpoint:
    """检查点"""
    id: str
    phase: str                  # 阶段名称
    created_at: datetime
    
    # 检查项
    goals: List[str]            # 该阶段目标
    acceptance_criteria: List[str]  # 验收标准
    
    # 快照
    code_snapshot_id: str       # 代码快照ID
    
    # 评估结果
    status: Optional[CheckpointStatus] = None
    evaluation: Optional[Dict] = None


class CheckpointManager:
    """检查点管理器"""
    
    def __init__(self, project_id: str):
        self.project_id = project_id
        self.checkpoints: List[Checkpoint] = []
    
    def create_checkpoint(
        self,
        phase: str,
        goals: List[str],
        acceptance_criteria: List[str]
    ) -> Checkpoint:
        """创建检查点"""
        checkpoint = Checkpoint(
            id=f"cp_{datetime.now().timestamp()}",
            phase=phase,
            created_at=datetime.now(),
            goals=goals,
            acceptance_criteria=acceptance_criteria,
            code_snapshot_id=self._create_code_snapshot()
        )
        self.checkpoints.append(checkpoint)
        return checkpoint
    
    def evaluate_checkpoint(self, checkpoint_id: str) -> CheckpointStatus:
        """评估检查点"""
        checkpoint = self._get_checkpoint(checkpoint_id)
        
        evaluation = {
            'goals_met': [],
            'goals_missed': [],
            'criteria_passed': [],
            'criteria_failed': [],
            'deviation_score': 0,  # 偏离分数 0-100
        }
        
        # 1. 检查目标完成情况
        for goal in checkpoint.goals:
            if self._check_goal_met(goal):
                evaluation['goals_met'].append(goal)
            else:
                evaluation['goals_missed'].append(goal)
        
        # 2. 检查验收标准
        for criteria in checkpoint.acceptance_criteria:
            if self._check_criteria(criteria):
                evaluation['criteria_passed'].append(criteria)
            else:
                evaluation['criteria_failed'].append(criteria)
        
        # 3. 计算偏离分数
        total_goals = len(checkpoint.goals)
        missed_goals = len(evaluation['goals_missed'])
        
        total_criteria = len(checkpoint.acceptance_criteria)
        failed_criteria = len(evaluation['criteria_failed'])
        
        if total_goals > 0:
            goal_deviation = (missed_goals / total_goals) * 50
        else:
            goal_deviation = 0
            
        if total_criteria > 0:
            criteria_deviation = (failed_criteria / total_criteria) * 50
        else:
            criteria_deviation = 0
        
        evaluation['deviation_score'] = goal_deviation + criteria_deviation
        
        # 4. 决定状态
        if evaluation['deviation_score'] < 20:
            status = CheckpointStatus.PASSED
        elif evaluation['deviation_score'] < 50:
            status = CheckpointStatus.NEEDS_REVISION
        else:
            status = CheckpointStatus.NEEDS_RESTART
        
        checkpoint.status = status
        checkpoint.evaluation = evaluation
        
        return status
    
    def rollback_to_checkpoint(self, checkpoint_id: str):
        """回滚到指定检查点"""
        checkpoint = self._get_checkpoint(checkpoint_id)
        self._restore_code_snapshot(checkpoint.code_snapshot_id)
        
        # 移除该检查点之后的所有检查点
        index = self.checkpoints.index(checkpoint)
        self.checkpoints = self.checkpoints[:index + 1]
    
    def _create_code_snapshot(self) -> str:
        """创建代码快照"""
        # 实现代码快照逻辑
        pass
    
    def _restore_code_snapshot(self, snapshot_id: str):
        """恢复代码快照"""
        # 实现快照恢复逻辑
        pass
    
    def _get_checkpoint(self, checkpoint_id: str) -> Checkpoint:
        for cp in self.checkpoints:
            if cp.id == checkpoint_id:
                return cp
        raise ValueError(f"Checkpoint not found: {checkpoint_id}")
    
    def _check_goal_met(self, goal: str) -> bool:
        """检查目标是否完成"""
        # 调用Auto-Verify检查
        pass
    
    def _check_criteria(self, criteria: str) -> bool:
        """检查验收标准"""
        # 调用Auto-Verify检查
        pass
```

### 4.3 阶段性检查点定义

```yaml
项目开发检查点:

Phase 1: 需求确认
  checkpoint: CP_REQUIREMENTS
  goals:
    - 需求文档完成
    - 技术方案确定
    - 用户确认需求
  acceptance_criteria:
    - 需求文档包含所有功能点
    - 技术方案可行
    - 无歧义需求
  评估后:
    通过 → 进入Phase 2
    修改 → 补充需求文档
    重启 → 重新理解用户需求

Phase 2: 基础架构
  checkpoint: CP_FOUNDATION
  goals:
    - 项目结构创建
    - 数据库设计完成
    - 基础API框架
  acceptance_criteria:
    - 项目可以启动
    - 数据库可以连接
    - API框架可以响应
  评估后:
    通过 → 进入Phase 3
    修改 → 修复架构问题
    重启 → 重新设计架构

Phase 3: 核心功能
  checkpoint: CP_CORE_FEATURES
  goals:
    - 核心功能开发完成
    - 单元测试通过
    - 集成测试通过
  acceptance_criteria:
    - 所有核心功能可用
    - 测试覆盖率 > 80%
    - 无阻塞性Bug
  评估后:
    通过 → 进入Phase 4
    修改 → 修复Bug
    重启 → 回到Phase 2重新开发

Phase 4: 完善交付
  checkpoint: CP_DELIVERY
  goals:
    - 全部功能完成
    - UI优化完成
    - 文档完成
  acceptance_criteria:
    - 用户验收通过
    - 性能达标
    - 无已知Bug
  评估后:
    通过 → 交付用户
    修改 → 继续完善
    重启 → 回到问题阶段
```

---

## 五、递归子规划机制

### 5.1 设计思路

```yaml
传统方式:
  Mike(PM)一人规划所有任务
  问题: PM不可能精通所有领域

优化方式:
  Mike(PM)负责宏观规划
  委托专家做子领域规划:
  - David(Tech) → 技术方案规划
  - Elena(UX) → 设计方案规划  
  - Kevin(QA) → 测试方案规划
  - Frank(DevOps) → 部署方案规划

好处:
  - 专业的人做专业的规划
  - 并行规划，提高效率
  - 各领域方案更专业
```

### 5.2 实现

```python
# services/planning/recursive_planner.py

from typing import Dict, List
from dataclasses import dataclass
from enum import Enum


class PlanningDomain(Enum):
    """规划领域"""
    PRODUCT = "product"      # 产品规划 (Mike)
    TECHNICAL = "technical"  # 技术规划 (David)
    DESIGN = "design"        # 设计规划 (Elena)
    TESTING = "testing"      # 测试规划 (Kevin)
    DEVOPS = "devops"        # 运维规划 (Frank)
    SECURITY = "security"    # 安全规划 (Grace)


@dataclass
class SubPlan:
    """子规划"""
    domain: PlanningDomain
    planner_id: str           # 负责的AI员工
    goals: List[str]
    tasks: List[Dict]
    dependencies: List[str]   # 依赖的其他子规划
    estimated_time: int       # 预估时间(分钟)


@dataclass
class MasterPlan:
    """主规划"""
    project_id: str
    requirement: str
    sub_plans: Dict[PlanningDomain, SubPlan]
    execution_order: List[PlanningDomain]
    total_estimated_time: int


class RecursivePlanner:
    """递归规划器"""
    
    DOMAIN_PLANNERS = {
        PlanningDomain.PRODUCT: "mike_pm",
        PlanningDomain.TECHNICAL: "david_tech",
        PlanningDomain.DESIGN: "elena_ux",
        PlanningDomain.TESTING: "kevin_qa",
        PlanningDomain.DEVOPS: "frank_devops",
        PlanningDomain.SECURITY: "grace_security",
    }
    
    def __init__(self, ai_employee_engine):
        self.engine = ai_employee_engine
    
    async def create_master_plan(self, requirement: str) -> MasterPlan:
        """创建主规划"""
        
        # 1. Mike(PM)进行宏观规划，确定需要哪些子规划
        mike_analysis = await self.engine.chat(
            "mike_pm",
            f"""分析以下需求，确定需要哪些领域的专家参与规划：

需求：{requirement}

请输出JSON格式：
{{
  "domains_needed": ["technical", "design", "testing"],
  "high_level_goals": ["目标1", "目标2"],
  "constraints": ["约束1"]
}}"""
        )
        
        analysis = self._parse_json(mike_analysis)
        domains_needed = [PlanningDomain(d) for d in analysis['domains_needed']]
        
        # 2. 并行调用各领域专家进行子规划
        sub_plans = await self._parallel_sub_planning(
            requirement, 
            domains_needed,
            analysis['high_level_goals']
        )
        
        # 3. 整合子规划，确定执行顺序
        execution_order = self._determine_execution_order(sub_plans)
        
        # 4. 计算总时间
        total_time = sum(sp.estimated_time for sp in sub_plans.values())
        
        return MasterPlan(
            project_id=f"proj_{hash(requirement)}",
            requirement=requirement,
            sub_plans=sub_plans,
            execution_order=execution_order,
            total_estimated_time=total_time
        )
    
    async def _parallel_sub_planning(
        self,
        requirement: str,
        domains: List[PlanningDomain],
        high_level_goals: List[str]
    ) -> Dict[PlanningDomain, SubPlan]:
        """并行进行子领域规划"""
        import asyncio
        
        async def plan_domain(domain: PlanningDomain) -> tuple:
            planner_id = self.DOMAIN_PLANNERS[domain]
            
            prompt = f"""作为{domain.value}领域专家，为以下需求制定详细计划：

需求：{requirement}
高层目标：{high_level_goals}

请输出JSON格式：
{{
  "goals": ["该领域具体目标"],
  "tasks": [
    {{"id": "T1", "title": "任务1", "difficulty": "medium", "estimated_minutes": 30}}
  ],
  "dependencies": ["依赖的其他领域"],
  "estimated_total_minutes": 120
}}"""
            
            result = await self.engine.chat(planner_id, prompt)
            plan_data = self._parse_json(result)
            
            sub_plan = SubPlan(
                domain=domain,
                planner_id=planner_id,
                goals=plan_data['goals'],
                tasks=plan_data['tasks'],
                dependencies=plan_data.get('dependencies', []),
                estimated_time=plan_data['estimated_total_minutes']
            )
            
            return domain, sub_plan
        
        # 并行执行所有领域规划
        tasks = [plan_domain(d) for d in domains]
        results = await asyncio.gather(*tasks)
        
        return dict(results)
    
    def _determine_execution_order(
        self, 
        sub_plans: Dict[PlanningDomain, SubPlan]
    ) -> List[PlanningDomain]:
        """确定执行顺序 (拓扑排序)"""
        # 简化实现：按依赖关系排序
        order = []
        remaining = set(sub_plans.keys())
        
        while remaining:
            for domain in list(remaining):
                plan = sub_plans[domain]
                deps = [PlanningDomain(d) for d in plan.dependencies if d in [d.value for d in remaining]]
                if not deps:
                    order.append(domain)
                    remaining.remove(domain)
        
        return order
    
    def _parse_json(self, text: str) -> dict:
        """解析JSON"""
        import json
        import re
        
        # 提取JSON部分
        match = re.search(r'\{.*\}', text, re.DOTALL)
        if match:
            return json.loads(match.group())
        return {}
```

### 5.3 规划流程示例

```yaml
用户需求: "做一个电商网站"

Step 1: Mike(PM)宏观分析
  输出:
    domains_needed: [technical, design, testing, security]
    high_level_goals:
      - 用户可以浏览商品
      - 用户可以下单购买
      - 商家可以管理商品

Step 2: 并行子规划 (同时进行)

  David(Tech)技术规划:
    goals:
      - 设计数据库Schema
      - 实现API接口
      - 集成支付系统
    tasks:
      - T1: 数据库设计 (hard, 60min)
      - T2: 用户API (medium, 45min)
      - T3: 商品API (medium, 45min)
      - T4: 订单API (hard, 60min)
      - T5: Stripe集成 (hard, 90min)
  
  Elena(UX)设计规划:
    goals:
      - 设计购物流程
      - 设计商品展示
      - 设计结账页面
    tasks:
      - D1: 商品列表页 (medium, 30min)
      - D2: 商品详情页 (medium, 30min)
      - D3: 购物车 (medium, 45min)
      - D4: 结账流程 (hard, 60min)
  
  Kevin(QA)测试规划:
    goals:
      - 测试购物流程
      - 测试支付流程
      - 测试边界情况
    tasks:
      - Q1: 单元测试 (medium, 30min)
      - Q2: 集成测试 (medium, 45min)
      - Q3: E2E测试 (hard, 60min)
    dependencies: [technical, design]
  
  Grace(Security)安全规划:
    goals:
      - 支付安全
      - 用户数据保护
    tasks:
      - S1: 安全审计 (hard, 60min)
    dependencies: [technical]

Step 3: 整合执行顺序
  1. technical (先做后端)
  2. design (可以和technical并行部分)
  3. security (依赖technical)
  4. testing (依赖technical和design)

Step 4: 展示给用户确认
  "基于你的需求，AI团队制定了以下计划：
   
   📋 技术方案 (David)
   - 5个任务，预计5小时
   
   🎨 设计方案 (Elena)  
   - 4个任务，预计2.5小时
   
   🔒 安全方案 (Grace)
   - 1个任务，预计1小时
   
   ✅ 测试方案 (Kevin)
   - 3个任务，预计2小时
   
   总预计时间: 10.5小时
   
   确认开始吗？"
```

---

## 六、完整协作流程

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                                                                              │
│                    Thinkus 多智能体协作完整流程                             │
│                                                                              │
│  ┌──────────────────────────────────────────────────────────────────────┐  │
│  │ 1. 用户输入需求                                                      │  │
│  │    "做一个任务管理工具"                                              │  │
│  └──────────────────────────────────────────────────────────────────────┘  │
│                                    │                                        │
│                                    ▼                                        │
│  ┌──────────────────────────────────────────────────────────────────────┐  │
│  │ 2. Mike(PM)宏观规划                                                  │  │
│  │    - 分析需求                                                        │  │
│  │    - 确定需要哪些专家                                                │  │
│  │    - 委托子规划                                                      │  │
│  └──────────────────────────────────────────────────────────────────────┘  │
│                                    │                                        │
│                    ┌───────────────┼───────────────┐                       │
│                    ▼               ▼               ▼                       │
│  ┌──────────────────────────────────────────────────────────────────────┐  │
│  │ 3. 专家并行子规划                                                    │  │
│  │    David(技术) │ Elena(设计) │ Kevin(测试)                          │  │
│  │    各自制定详细计划                                                  │  │
│  └──────────────────────────────────────────────────────────────────────┘  │
│                                    │                                        │
│                                    ▼                                        │
│  ┌──────────────────────────────────────────────────────────────────────┐  │
│  │ 4. 展示计划，用户确认                                                │  │
│  │    用户可以调整功能、优先级、技术方案                                │  │
│  │    确认后才开始执行                                                  │  │
│  └──────────────────────────────────────────────────────────────────────┘  │
│                                    │                                        │
│                                    ▼                                        │
│  ┌──────────────────────────────────────────────────────────────────────┐  │
│  │ 5. Worker执行任务                                                    │  │
│  │    - 按优先级分配任务                                                │  │
│  │    - 防摸鱼机制确保核心任务被处理                                    │  │
│  │    - 并行执行，互不干扰                                              │  │
│  └──────────────────────────────────────────────────────────────────────┘  │
│                                    │                                        │
│                                    ▼                                        │
│  ┌──────────────────────────────────────────────────────────────────────┐  │
│  │ 6. 检查点评估                                                        │  │
│  │    Judge(Kevin + Auto-Verify)评估:                                  │  │
│  │    - 目标是否达成？                                                  │  │
│  │    - 是否偏离方向？                                                  │  │
│  │    - 决定: 通过/返工/重启                                           │  │
│  └──────────────────────────────────────────────────────────────────────┘  │
│                                    │                                        │
│                    ┌───────────────┼───────────────┐                       │
│                    ▼               ▼               ▼                       │
│               ✅ 通过         🔄 返工         🔁 重启                      │
│               进入下阶段      回到Worker      回到Planner                   │
│                    │                                                        │
│                    ▼                                                        │
│  ┌──────────────────────────────────────────────────────────────────────┐  │
│  │ 7. 最终交付                                                          │  │
│  │    所有检查点通过 → 交付用户                                        │  │
│  └──────────────────────────────────────────────────────────────────────┘  │
│                                                                              │
└─────────────────────────────────────────────────────────────────────────────┘
```

---

## 七、关键洞察 (来自Cursor实验)

### 7.1 反直觉发现

```yaml
1. 通用模型 > 专用编码模型 (对于长期规划任务)
   GPT-5.2 > GPT-5.1-Codex (规划能力)
   
   启示: 
   - 我们用Claude做AI高管是正确的
   - 规划层需要通用智能，不是专用编码能力

2. Claude更适合人机协作
   "倾向于走捷径并尽早交还控制权"
   
   启示:
   - 这正好符合Thinkus的设计理念
   - AI高管+用户协作，而非纯AI自主
   - 检查点机制让用户有介入机会

3. 提示词设计 > 模型选择 > 执行环境
   "如何引导智能体正确协作"最重要
   
   启示:
   - 18位AI高管的人设提示词是核心竞争力
   - 需要持续优化提示词
   - 防摸鱼、检查点等机制都靠提示词引导
```

### 7.2 Thinkus的差异化优势

```yaml
vs Cursor的纯AI自主:
  Cursor: 数百智能体自主协作一周
  Thinkus: AI团队+用户协作，分钟级交付
  
  优势:
  - 用户参与确保方向正确
  - 检查点让用户可以及时纠偏
  - 不需要等一周才看到结果

vs 单一AI工具:
  单一AI: 一个模型做所有事
  Thinkus: 专业分工+递归规划
  
  优势:
  - 专业的事交给专业的AI
  - 多视角讨论产出更优方案
  - 分层架构避免混乱
```

---

## 八、实施路线图

### Phase 1 (1月): 基础分层

```yaml
Week 1:
  - 实现Planner-Worker-Judge基础架构
  - Mike作为首席规划者
  - Kevin + Auto-Verify作为Judge

Week 2:
  - 任务难度标记系统
  - 基础防摸鱼检测
```

### Phase 2 (2月): 检查点机制

```yaml
Week 1:
  - 检查点创建和评估
  - 代码快照功能

Week 2:
  - 回滚机制
  - 重启决策逻辑
```

### Phase 3 (3月): 递归规划

```yaml
Week 1:
  - 子规划委托机制
  - 并行规划调度

Week 2:
  - 规划整合
  - 执行顺序优化
```

---

## 九、总结

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                                                                              │
│                    Thinkus 多智能体协作核心原则                             │
│                                                                              │
│  1️⃣ 清晰分层，责任分离                                                     │
│     Planner规划 → Worker执行 → Judge验证                                   │
│     不要扁平化协作                                                          │
│                                                                              │
│  2️⃣ 防止摸鱼，确保核心                                                     │
│     任务标记难度，监控分布                                                  │
│     核心任务必须先完成                                                      │
│                                                                              │
│  3️⃣ 检查点机制，允许重启                                                   │
│     定期评估是否偏离目标                                                    │
│     偏离严重时从干净状态重来                                                │
│                                                                              │
│  4️⃣ 递归子规划，专业分工                                                   │
│     专业的事交给专业的AI                                                    │
│     并行规划提高效率                                                        │
│                                                                              │
│  5️⃣ 人机协作，用户掌控                                                     │
│     计划先行，用户确认                                                      │
│     检查点让用户可以介入                                                    │
│                                                                              │
└─────────────────────────────────────────────────────────────────────────────┘
```
