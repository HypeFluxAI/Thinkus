# Thinkus AI员工系统 - 技术实现文档

> **版本**: v12.0 | **日期**: 2026-01-15
>
> **技术栈**: Python (执行层) + Go (调度层)

---

## 一、目录结构

```
services/ai_employee/
├── __init__.py
├── engine.py                    # 主引擎
├── employees/                   # 员工定义
│   ├── __init__.py
│   ├── base.py                 # 基类
│   ├── mike_pm.py              # Mike - 产品总监
│   ├── david_tech.py           # David - 技术总监
│   ├── elena_ux.py             # Elena - UX总监
│   ├── frank_devops.py         # Frank - DevOps
│   ├── grace_security.py       # Grace - 安全
│   ├── kevin_qa.py             # Kevin - QA
│   ├── librarian.py            # Librarian - 研究员
│   └── registry.py             # 员工注册表
├── memory/
│   ├── __init__.py
│   ├── memory_manager.py       # 记忆管理器
│   ├── short_term.py           # 短期记忆
│   ├── long_term.py            # 长期记忆
│   └── working.py              # 工作记忆
├── orchestrator/
│   ├── __init__.py
│   ├── single.py               # 单员工模式
│   ├── discussion.py           # 多员工讨论
│   └── workflow.py             # 工作流模式
└── grpc_server.py              # gRPC服务
```

---

## 二、员工定义

### 2.1 基类

```python
# services/ai_employee/employees/base.py

from abc import ABC, abstractmethod
from dataclasses import dataclass, field
from typing import List, Dict, Optional
from anthropic import Anthropic


@dataclass
class EmployeeConfig:
    """员工配置"""
    id: str
    name: str
    title: str
    model: str = "claude-sonnet-4-20250514"
    persona: str = ""
    expertise: List[str] = field(default_factory=list)
    style: str = ""
    triggers: List[str] = field(default_factory=list)


class BaseEmployee(ABC):
    """AI员工基类"""
    
    def __init__(self, config: EmployeeConfig):
        self.config = config
        self.client = Anthropic()
    
    @property
    def id(self) -> str:
        return self.config.id
    
    @property
    def name(self) -> str:
        return self.config.name
    
    @abstractmethod
    def get_system_prompt(self, memory_context: str = "") -> str:
        """获取系统提示词"""
        pass
    
    def chat(
        self,
        message: str,
        memory_context: str = "",
        context: Optional[Dict] = None
    ) -> str:
        """与员工对话"""
        system_prompt = self.get_system_prompt(memory_context)
        
        response = self.client.messages.create(
            model=self.config.model,
            max_tokens=4000,
            system=system_prompt,
            messages=[{"role": "user", "content": message}]
        )
        
        return response.content[0].text
    
    def should_trigger(self, message: str) -> bool:
        """判断是否应该触发该员工"""
        message_lower = message.lower()
        return any(trigger in message_lower for trigger in self.config.triggers)
```

### 2.2 Mike - 产品总监

```python
# services/ai_employee/employees/mike_pm.py

from .base import BaseEmployee, EmployeeConfig


class MikePM(BaseEmployee):
    """Mike - 产品总监"""
    
    def __init__(self):
        config = EmployeeConfig(
            id="mike_pm",
            name="Mike Chen",
            title="产品总监 (CPO)",
            model="claude-sonnet-4-20250514",
            persona="""你是Mike Chen，Thinkus的产品总监。

## 背景
- 15年产品经验
- 曾在Google、Meta负责核心产品
- 专注于将用户需求转化为产品价值

## 性格特点
- 思维清晰，善于结构化问题
- 以用户为中心
- 注重数据驱动决策
- 沟通直接但有同理心""",
            expertise=[
                "需求分析与优先级排序",
                "产品路线图规划",
                "用户故事编写",
                "竞品分析",
                "PRD文档编写",
                "MVP定义"
            ],
            style="""沟通风格：
- 先理解，后建议
- 用问题引导思考
- 给出结构化的分析
- 提供可执行的建议""",
            triggers=[
                "产品", "需求", "功能", "用户", "prd", "优先级",
                "product", "requirement", "feature", "user story"
            ]
        )
        super().__init__(config)
    
    def get_system_prompt(self, memory_context: str = "") -> str:
        return f"""{self.config.persona}

## 专业技能
{chr(10).join(f"- {e}" for e in self.config.expertise)}

## 对话风格
{self.config.style}

## 历史记忆
{memory_context if memory_context else "暂无历史记忆"}

## 工作原则
1. 始终从用户价值出发
2. 优先考虑MVP，避免过度设计
3. 用数据和逻辑支持决策
4. 与技术和设计紧密协作

请以Mike的角色和风格回答问题。"""
```

### 2.3 David - 技术总监

```python
# services/ai_employee/employees/david_tech.py

from .base import BaseEmployee, EmployeeConfig


class DavidTech(BaseEmployee):
    """David - 技术总监"""
    
    def __init__(self):
        config = EmployeeConfig(
            id="david_tech",
            name="David Wang",
            title="技术总监 (CTO)",
            model="claude-sonnet-4-20250514",
            persona="""你是David Wang，Thinkus的技术总监。

## 背景
- 20年技术经验，全栈架构师
- 曾在Amazon、Stripe负责核心系统
- 追求简洁、可扩展的解决方案

## 性格特点
- 技术品味高，但务实不追新
- 喜欢用代码说话
- 注重可维护性和性能
- 善于在复杂问题中找到简单解法""",
            expertise=[
                "系统架构设计",
                "技术选型决策",
                "代码审查",
                "性能优化",
                "分布式系统",
                "Go/Python/TypeScript"
            ],
            style="""沟通风格：
- 技术问题直击要点
- 提供代码示例
- 分析利弊权衡
- 考虑长期可维护性""",
            triggers=[
                "技术", "代码", "架构", "bug", "性能", "数据库",
                "tech", "code", "architecture", "backend", "frontend",
                "api", "database", "error", "debug"
            ]
        )
        super().__init__(config)
    
    def get_system_prompt(self, memory_context: str = "") -> str:
        return f"""{self.config.persona}

## 专业技能
{chr(10).join(f"- {e}" for e in self.config.expertise)}

## 对话风格
{self.config.style}

## 历史记忆
{memory_context if memory_context else "暂无历史记忆"}

## 技术原则
1. 简单优于复杂
2. 可读性优于巧妙
3. 先让它工作，再让它优雅
4. 考虑10倍扩展性

请以David的角色和风格回答问题。当涉及代码时，优先使用Go、Python或TypeScript。"""
```

### 2.4 Librarian - 研究员

```python
# services/ai_employee/employees/librarian.py

from .base import BaseEmployee, EmployeeConfig
from typing import List, Dict, Optional
import asyncio


class Librarian(BaseEmployee):
    """Librarian - 技术研究员"""
    
    def __init__(self, mcp_client=None):
        config = EmployeeConfig(
            id="librarian",
            name="Librarian",
            title="技术研究员",
            model="claude-sonnet-4-20250514",
            persona="""你是Librarian，Thinkus的技术研究员。

## 特殊角色
- 你不写代码，专门做技术研究
- 你有访问官方文档和GitHub的能力
- 你的任务是帮其他员工找到准确的技术信息

## 工作方式
1. 接到研究任务
2. 使用MCP工具查询官方文档
3. 在GitHub搜索相关代码示例
4. 整理研究报告""",
            expertise=[
                "技术文档查询",
                "官方API研究",
                "最佳实践收集",
                "代码示例搜索",
                "版本兼容性调研"
            ],
            style="""沟通风格：
- 引用官方文档
- 提供代码示例来源
- 标注版本信息
- 区分官方和社区方案""",
            triggers=[
                "查一下", "研究", "文档", "官方", "最佳实践",
                "research", "documentation", "official", "best practice",
                "how to", "example"
            ]
        )
        super().__init__(config)
        self.mcp_client = mcp_client
    
    async def research(self, topic: str) -> Dict:
        """执行研究任务"""
        results = {
            "official_docs": [],
            "code_examples": [],
            "summary": ""
        }
        
        if self.mcp_client:
            # 查询官方文档 (context7)
            try:
                doc_result = await self.mcp_client.call(
                    "context7",
                    "search",
                    {"query": topic}
                )
                results["official_docs"] = doc_result.get("results", [])
            except Exception as e:
                results["official_docs"] = [{"error": str(e)}]
            
            # 搜索GitHub代码 (grep_app)
            try:
                code_result = await self.mcp_client.call(
                    "grep_app",
                    "search",
                    {"query": topic, "language": "all"}
                )
                results["code_examples"] = code_result.get("results", [])
            except Exception as e:
                results["code_examples"] = [{"error": str(e)}]
        
        # 生成研究摘要
        results["summary"] = await self._generate_summary(topic, results)
        
        return results
    
    async def _generate_summary(self, topic: str, results: Dict) -> str:
        """生成研究摘要"""
        prompt = f"""基于以下研究结果，生成一份简洁的技术研究报告：

主题：{topic}

官方文档结果：
{results['official_docs'][:5]}

代码示例：
{results['code_examples'][:5]}

请生成：
1. 关键发现 (2-3点)
2. 推荐方案
3. 注意事项
4. 相关链接"""

        response = self.client.messages.create(
            model=self.config.model,
            max_tokens=1500,
            messages=[{"role": "user", "content": prompt}]
        )
        
        return response.content[0].text
    
    def get_system_prompt(self, memory_context: str = "") -> str:
        return f"""{self.config.persona}

## 可用工具
- context7: 查询官方文档 (Next.js, React, Node.js等)
- grep_app: 在GitHub搜索代码示例
- Web Search: 网络搜索

## 历史记忆
{memory_context if memory_context else "暂无历史记忆"}

## 工作原则
1. 优先引用官方文档
2. 标注信息来源和版本
3. 区分官方方案和社区方案
4. 提供可直接使用的代码示例

请以Librarian的角色回答，专注于研究和信息收集，不要自己写代码。"""
```

### 2.5 员工注册表

```python
# services/ai_employee/employees/registry.py

from typing import Dict, Optional, List
from .base import BaseEmployee
from .mike_pm import MikePM
from .david_tech import DavidTech
from .elena_ux import ElenaUX
from .frank_devops import FrankDevOps
from .grace_security import GraceSecurity
from .kevin_qa import KevinQA
from .librarian import Librarian


class EmployeeRegistry:
    """员工注册表"""
    
    _instance = None
    _employees: Dict[str, BaseEmployee] = {}
    
    def __new__(cls):
        if cls._instance is None:
            cls._instance = super().__new__(cls)
            cls._instance._initialize()
        return cls._instance
    
    def _initialize(self):
        """初始化所有员工"""
        employees = [
            MikePM(),
            DavidTech(),
            ElenaUX(),
            FrankDevOps(),
            GraceSecurity(),
            KevinQA(),
            Librarian(),
            # ... 其他员工
        ]
        
        for emp in employees:
            self._employees[emp.id] = emp
    
    def get(self, employee_id: str) -> Optional[BaseEmployee]:
        """获取员工"""
        return self._employees.get(employee_id)
    
    def get_all(self) -> List[BaseEmployee]:
        """获取所有员工"""
        return list(self._employees.values())
    
    def find_best_match(self, message: str) -> Optional[BaseEmployee]:
        """根据消息找到最匹配的员工"""
        best_match = None
        max_score = 0
        
        for emp in self._employees.values():
            score = self._calculate_match_score(emp, message)
            if score > max_score:
                max_score = score
                best_match = emp
        
        return best_match if max_score > 0 else self._employees.get("mike_pm")
    
    def _calculate_match_score(self, employee: BaseEmployee, message: str) -> int:
        """计算匹配分数"""
        score = 0
        message_lower = message.lower()
        
        for trigger in employee.config.triggers:
            if trigger in message_lower:
                score += 1
        
        return score


# 全局单例
registry = EmployeeRegistry()

def get_employee(employee_id: str) -> Optional[BaseEmployee]:
    return registry.get(employee_id)

def find_best_employee(message: str) -> Optional[BaseEmployee]:
    return registry.find_best_match(message)
```

---

## 三、记忆系统

### 3.1 记忆管理器

```python
# services/ai_employee/memory/memory_manager.py

from typing import Dict, List, Optional
from dataclasses import dataclass
from datetime import datetime
import json

from .short_term import ShortTermMemory
from .long_term import LongTermMemory
from .working import WorkingMemory


@dataclass
class Memory:
    """记忆条目"""
    id: str
    type: str  # preference, decision, event, fact
    content: str
    importance: float  # 0-1
    employee_id: str
    user_id: str
    project_id: Optional[str]
    created_at: datetime
    accessed_at: datetime
    access_count: int = 0


class MemoryManager:
    """记忆管理器"""
    
    def __init__(self, db_pool=None, redis_client=None):
        self.short_term = ShortTermMemory()
        self.long_term = LongTermMemory(db_pool)
        self.working = WorkingMemory(redis_client)
    
    def get_context(
        self,
        employee_id: str,
        user_id: str,
        project_id: Optional[str] = None,
        current_message: str = ""
    ) -> str:
        """获取上下文记忆"""
        memories = []
        
        # 1. 短期记忆 (当前会话)
        short_memories = self.short_term.get(employee_id, user_id)
        memories.extend(short_memories)
        
        # 2. 长期记忆 (相关性检索)
        long_memories = self.long_term.search(
            employee_id=employee_id,
            user_id=user_id,
            project_id=project_id,
            query=current_message,
            limit=5
        )
        memories.extend(long_memories)
        
        # 3. 工作记忆 (当前任务)
        if project_id:
            working_memories = self.working.get(project_id)
            memories.extend(working_memories)
        
        # 格式化为上下文字符串
        return self._format_context(memories)
    
    def update(
        self,
        employee_id: str,
        user_id: str,
        message: str,
        response: str,
        project_id: Optional[str] = None
    ):
        """更新记忆"""
        # 更新短期记忆
        self.short_term.add(employee_id, user_id, message, response)
        
        # 提取重要信息存入长期记忆
        important_info = self._extract_important(message, response)
        if important_info:
            for info in important_info:
                self.long_term.add(Memory(
                    id=f"mem_{datetime.now().timestamp()}",
                    type=info["type"],
                    content=info["content"],
                    importance=info["importance"],
                    employee_id=employee_id,
                    user_id=user_id,
                    project_id=project_id,
                    created_at=datetime.now(),
                    accessed_at=datetime.now()
                ))
    
    def _extract_important(self, message: str, response: str) -> List[Dict]:
        """提取重要信息"""
        important = []
        
        # 检测用户偏好
        preferences_keywords = ["喜欢", "prefer", "偏好", "习惯", "always use"]
        for kw in preferences_keywords:
            if kw in message.lower():
                important.append({
                    "type": "preference",
                    "content": message,
                    "importance": 0.8
                })
                break
        
        # 检测决策
        decision_keywords = ["决定", "选择", "确定", "decide", "choose", "go with"]
        for kw in decision_keywords:
            if kw in message.lower() or kw in response.lower():
                important.append({
                    "type": "decision",
                    "content": f"用户消息: {message}\n决策: {response[:200]}",
                    "importance": 0.9
                })
                break
        
        return important
    
    def _format_context(self, memories: List[Memory]) -> str:
        """格式化记忆上下文"""
        if not memories:
            return ""
        
        # 按重要性和时间排序
        sorted_memories = sorted(
            memories,
            key=lambda m: (m.importance, m.accessed_at.timestamp()),
            reverse=True
        )
        
        lines = ["以下是与当前对话相关的历史信息："]
        for mem in sorted_memories[:10]:
            lines.append(f"- [{mem.type}] {mem.content}")
        
        return "\n".join(lines)
```

### 3.2 长期记忆 (PostgreSQL)

```python
# services/ai_employee/memory/long_term.py

from typing import List, Optional
from datetime import datetime
import asyncpg
from dataclasses import asdict

from .memory_manager import Memory


class LongTermMemory:
    """长期记忆 (PostgreSQL)"""
    
    def __init__(self, db_pool: asyncpg.Pool = None):
        self.db_pool = db_pool
    
    async def add(self, memory: Memory):
        """添加记忆"""
        if not self.db_pool:
            return
        
        async with self.db_pool.acquire() as conn:
            await conn.execute("""
                INSERT INTO memories (
                    id, type, content, importance, 
                    employee_id, user_id, project_id,
                    created_at, accessed_at, access_count
                ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
                ON CONFLICT (id) DO UPDATE SET
                    accessed_at = EXCLUDED.accessed_at,
                    access_count = memories.access_count + 1
            """,
                memory.id, memory.type, memory.content, memory.importance,
                memory.employee_id, memory.user_id, memory.project_id,
                memory.created_at, memory.accessed_at, memory.access_count
            )
    
    async def search(
        self,
        employee_id: str,
        user_id: str,
        project_id: Optional[str] = None,
        query: str = "",
        limit: int = 10
    ) -> List[Memory]:
        """搜索相关记忆"""
        if not self.db_pool:
            return []
        
        async with self.db_pool.acquire() as conn:
            # 使用全文搜索和向量相似度
            rows = await conn.fetch("""
                SELECT * FROM memories
                WHERE employee_id = $1 
                  AND user_id = $2
                  AND ($3::text IS NULL OR project_id = $3)
                  AND (
                    content ILIKE '%' || $4 || '%'
                    OR ts_rank(to_tsvector('english', content), plainto_tsquery('english', $4)) > 0
                  )
                ORDER BY importance DESC, accessed_at DESC
                LIMIT $5
            """, employee_id, user_id, project_id, query, limit)
            
            return [self._row_to_memory(row) for row in rows]
    
    def _row_to_memory(self, row) -> Memory:
        return Memory(
            id=row['id'],
            type=row['type'],
            content=row['content'],
            importance=row['importance'],
            employee_id=row['employee_id'],
            user_id=row['user_id'],
            project_id=row['project_id'],
            created_at=row['created_at'],
            accessed_at=row['accessed_at'],
            access_count=row['access_count']
        )
```

---

## 四、协作模式

### 4.1 多员工讨论

```python
# services/ai_employee/orchestrator/discussion.py

from typing import List, Dict
import asyncio
from anthropic import Anthropic

from ..employees.registry import get_employee
from ..memory.memory_manager import MemoryManager


class DiscussionOrchestrator:
    """多员工讨论编排器"""
    
    def __init__(self, memory_manager: MemoryManager):
        self.memory = memory_manager
        self.client = Anthropic()
    
    async def run_discussion(
        self,
        employee_ids: List[str],
        topic: str,
        user_id: str,
        project_id: str = None
    ) -> Dict:
        """运行多员工讨论"""
        
        # 1. 并行获取各员工观点
        tasks = []
        for emp_id in employee_ids:
            task = self._get_employee_opinion(emp_id, topic, user_id, project_id)
            tasks.append(task)
        
        opinions = await asyncio.gather(*tasks)
        
        # 2. 汇总各方观点
        results = {
            emp_id: opinion 
            for emp_id, opinion in zip(employee_ids, opinions)
        }
        
        # 3. 生成综合结论
        summary = await self._synthesize(topic, results)
        
        return {
            "topic": topic,
            "participants": employee_ids,
            "opinions": results,
            "summary": summary
        }
    
    async def _get_employee_opinion(
        self,
        employee_id: str,
        topic: str,
        user_id: str,
        project_id: str
    ) -> str:
        """获取单个员工观点"""
        employee = get_employee(employee_id)
        if not employee:
            return f"员工 {employee_id} 不存在"
        
        # 获取记忆上下文
        memory_context = self.memory.get_context(
            employee_id, user_id, project_id, topic
        )
        
        # 调用员工
        return employee.chat(
            f"作为{employee.config.title}，请就以下主题发表你的专业看法：\n\n{topic}",
            memory_context
        )
    
    async def _synthesize(self, topic: str, opinions: Dict[str, str]) -> str:
        """综合各方观点"""
        prompt = f"""你是一位会议主持人，需要综合以下专家意见：

主题：{topic}

各专家观点：
"""
        for emp_id, opinion in opinions.items():
            prompt += f"\n【{emp_id}】\n{opinion}\n"
        
        prompt += """
请综合以上观点，输出：
1. 共识点（大家都同意的）
2. 分歧点（需要进一步讨论的）
3. 推荐方案
4. 下一步行动"""

        response = self.client.messages.create(
            model="claude-sonnet-4-20250514",
            max_tokens=2000,
            messages=[{"role": "user", "content": prompt}]
        )
        
        return response.content[0].text
```

---

## 五、gRPC服务

```python
# services/ai_employee/grpc_server.py

import grpc
from concurrent import futures
import asyncio

from proto import ai_employee_pb2, ai_employee_pb2_grpc
from .engine import AIEmployeeEngine
from .orchestrator.discussion import DiscussionOrchestrator
from .memory.memory_manager import MemoryManager


class AIEmployeeServicer(ai_employee_pb2_grpc.AIEmployeeServiceServicer):
    """gRPC服务实现"""
    
    def __init__(self):
        self.memory = MemoryManager()
        self.engine = AIEmployeeEngine(self.memory)
        self.discussion = DiscussionOrchestrator(self.memory)
    
    def Chat(self, request, context):
        """单员工对话"""
        result = self.engine.chat(
            employee_id=request.employee_id,
            message=request.message,
            user_id=request.user_id,
            project_id=request.project_id
        )
        
        return ai_employee_pb2.ChatResponse(
            response=result,
            employee_id=request.employee_id
        )
    
    def AutoSelectChat(self, request, context):
        """自动选择员工对话"""
        result = self.engine.auto_chat(
            message=request.message,
            user_id=request.user_id,
            project_id=request.project_id
        )
        
        return ai_employee_pb2.ChatResponse(
            response=result["response"],
            employee_id=result["employee_id"]
        )
    
    def ParallelDiscussion(self, request, context):
        """多员工并行讨论"""
        loop = asyncio.new_event_loop()
        asyncio.set_event_loop(loop)
        
        result = loop.run_until_complete(
            self.discussion.run_discussion(
                employee_ids=list(request.employee_ids),
                topic=request.topic,
                user_id=request.user_id,
                project_id=request.project_id
            )
        )
        
        return ai_employee_pb2.DiscussionResponse(
            opinions=result["opinions"],
            summary=result["summary"]
        )


def serve():
    server = grpc.server(futures.ThreadPoolExecutor(max_workers=20))
    ai_employee_pb2_grpc.add_AIEmployeeServiceServicer_to_server(
        AIEmployeeServicer(), server
    )
    server.add_insecure_port('[::]:50051')
    server.start()
    print("AI Employee Service started on port 50051")
    server.wait_for_termination()


if __name__ == '__main__':
    serve()
```

---

## 六、数据库Schema

```sql
-- migrations/001_create_memories.sql

CREATE TABLE IF NOT EXISTS memories (
    id VARCHAR(64) PRIMARY KEY,
    type VARCHAR(32) NOT NULL,  -- preference, decision, event, fact
    content TEXT NOT NULL,
    importance FLOAT DEFAULT 0.5,
    employee_id VARCHAR(64) NOT NULL,
    user_id VARCHAR(64) NOT NULL,
    project_id VARCHAR(64),
    created_at TIMESTAMP DEFAULT NOW(),
    accessed_at TIMESTAMP DEFAULT NOW(),
    access_count INTEGER DEFAULT 0
);

-- 索引
CREATE INDEX idx_memories_employee_user ON memories(employee_id, user_id);
CREATE INDEX idx_memories_project ON memories(project_id);
CREATE INDEX idx_memories_importance ON memories(importance DESC);

-- 全文搜索
CREATE INDEX idx_memories_content_fts ON memories USING GIN (to_tsvector('english', content));
```

---

## 七、开发清单

```
services/ai_employee/
├── employees/
│   ├── base.py              ✅ 已实现
│   ├── mike_pm.py           ✅ 已实现
│   ├── david_tech.py        ✅ 已实现
│   ├── librarian.py         ✅ 已实现
│   ├── elena_ux.py          待实现
│   ├── frank_devops.py      待实现
│   ├── grace_security.py    待实现
│   ├── kevin_qa.py          待实现
│   └── registry.py          ✅ 已实现
├── memory/
│   ├── memory_manager.py    ✅ 已实现
│   ├── short_term.py        待实现
│   ├── long_term.py         ✅ 已实现
│   └── working.py           待实现
├── orchestrator/
│   ├── discussion.py        ✅ 已实现
│   └── workflow.py          待实现
└── grpc_server.py           ✅ 已实现
```
