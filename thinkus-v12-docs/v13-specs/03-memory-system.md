# Thinkus v13 - 双层记忆系统

> 跨项目记忆 + 项目专属记忆 + 记忆进化机制

---

## 基本信息

| 字段 | 值 |
|------|-----|
| 功能名称 | 双层记忆系统 |
| 优先级 | P0 |
| 预估复杂度 | 复杂 |
| 关联模块 | AI引擎核心、向量存储 |

---

## 1. 系统概览

### 1.1 核心理念

```
每个用户拥有专属的18个AI高管实例，数据完全隔离
高管会记住用户的偏好和项目历史，越用越懂你
```

### 1.2 双层架构

```
┌─────────────────────────────────────────────────────────────────────────┐
│                                                                          │
│   Layer 1: 跨项目记忆 (用户偏好)                                        │
│   ════════════════════════════                                          │
│   - 沟通风格偏好                                                        │
│   - 决策习惯                                                            │
│   - 技术栈偏好                                                          │
│   存储: user_{userId}_{agentId} (无projectId)                           │
│   生命周期: 永久                                                        │
│                                                                          │
│   Layer 2: 项目专属记忆                                                 │
│   ════════════════════════                                              │
│   - 项目决策、讨论结论                                                  │
│   - 技术方案、进度里程碑                                                │
│   存储: user_{userId}_{agentId} (带projectId过滤)                       │
│   生命周期: 项目存在期间                                                │
│                                                                          │
└─────────────────────────────────────────────────────────────────────────┘
```

---

## 2. 数据隔离

### 2.1 隔离层次

```yaml
数据库层:
  - 每个文档都有userId字段
  - 查询时强制过滤userId

向量存储层:
  - Pinecone命名空间: user_{userId}_{agentId}
  - 每个用户+高管组合独立空间

应用层:
  - API验证userId
  - 不允许跨用户访问
```

### 2.2 用户专属高管架构

```
┌─────────────────────────────────────────────────────────────────────────┐
│                                                                          │
│   用户A                           用户B                                  │
│                                                                          │
│   ┌─────────────────────┐         ┌─────────────────────┐               │
│   │  用户A的Mike实例    │         │  用户B的Mike实例    │               │
│   │  - A的项目历史      │         │  - B的项目历史      │               │
│   │  - A的沟通偏好      │         │  - B的沟通偏好      │               │
│   └─────────────────────┘         └─────────────────────┘               │
│                                                                          │
│   ┌─────────────────────┐         ┌─────────────────────┐               │
│   │  用户A的David实例   │         │  用户B的David实例   │               │
│   │  - A的技术选型      │         │  - B的技术选型      │               │
│   │  - A的代码风格      │         │  - B的代码风格      │               │
│   └─────────────────────┘         └─────────────────────┘               │
│                                                                          │
└─────────────────────────────────────────────────────────────────────────┘
```

---

## 3. 记忆类型

### 3.1 类型定义

```typescript
type MemoryType =
  | 'user_preference'        // 用户偏好 (跨项目)
  | 'project_decision'       // 项目决策
  | 'discussion_conclusion'  // 讨论结论
  | 'technical_choice'       // 技术选型
  | 'feedback'               // 用户反馈
  | 'long_term'              // 长期记忆
  | 'short_term';            // 短期记忆
```

### 3.2 记忆示例

```yaml
用户偏好记忆:
  - "用户喜欢简洁的界面风格"
  - "用户倾向于使用TypeScript"
  - "用户喜欢详细的解释"

项目决策记忆:
  - "电商项目决定使用Next.js + PostgreSQL"
  - "支付模块选择了Stripe"
  - "用户确认了蓝色主题色"

讨论结论记忆:
  - "2026-01-15 Mike与用户确认了MVP范围"
  - "David建议先做核心功能，用户同意"
```

---

## 4. 核心实现

### 4.1 MemoryManager

```python
from dataclasses import dataclass
from typing import List, Optional
import pinecone

@dataclass
class Memory:
    id: str
    content: str
    type: str  # MemoryType
    user_id: str
    agent_id: str
    project_id: Optional[str]
    importance: float  # 0-1
    created_at: datetime
    last_accessed: datetime
    access_count: int
    embedding: List[float]

class MemoryManager:
    """记忆管理器"""

    def __init__(self, user_id: str, agent_id: str):
        self.user_id = user_id
        self.agent_id = agent_id
        self.namespace = f"user_{user_id}_{agent_id}"
        self.index = pinecone.Index("thinkus-memories")

    async def save(self, content: str, memory_type: str,
                   project_id: Optional[str] = None,
                   importance: float = 0.5) -> Memory:
        """保存新记忆"""

        # 1. 生成embedding
        embedding = await self.embed(content)

        # 2. 创建记忆对象
        memory = Memory(
            id=generate_id(),
            content=content,
            type=memory_type,
            user_id=self.user_id,
            agent_id=self.agent_id,
            project_id=project_id,
            importance=importance,
            created_at=datetime.now(),
            last_accessed=datetime.now(),
            access_count=0,
            embedding=embedding
        )

        # 3. 存储到Pinecone
        self.index.upsert(
            vectors=[{
                'id': memory.id,
                'values': embedding,
                'metadata': {
                    'content': content,
                    'type': memory_type,
                    'project_id': project_id,
                    'importance': importance,
                }
            }],
            namespace=self.namespace
        )

        # 4. 存储到数据库 (用于持久化和查询)
        await self.db.memories.insert_one(memory.__dict__)

        return memory

    async def retrieve(self, query: str,
                       project_id: Optional[str] = None,
                       top_k: int = 5) -> List[Memory]:
        """检索相关记忆"""

        # 1. 生成查询embedding
        query_embedding = await self.embed(query)

        # 2. 构建过滤条件
        filter_dict = {}
        if project_id:
            filter_dict['project_id'] = {'$in': [project_id, None]}

        # 3. 向量搜索
        results = self.index.query(
            vector=query_embedding,
            top_k=top_k,
            namespace=self.namespace,
            filter=filter_dict,
            include_metadata=True
        )

        # 4. 更新访问统计
        memories = []
        for match in results.matches:
            memory = await self._get_and_update_access(match.id)
            if memory:
                memories.append(memory)

        return memories

    async def _get_and_update_access(self, memory_id: str) -> Optional[Memory]:
        """获取记忆并更新访问统计"""

        memory = await self.db.memories.find_one_and_update(
            {'id': memory_id},
            {
                '$set': {'last_accessed': datetime.now()},
                '$inc': {'access_count': 1}
            },
            return_document=True
        )

        return Memory(**memory) if memory else None

    async def embed(self, text: str) -> List[float]:
        """生成文本embedding"""
        from openai import OpenAI
        client = OpenAI()

        response = client.embeddings.create(
            model="text-embedding-3-small",
            input=text
        )

        return response.data[0].embedding
```

### 4.2 智能记忆增强

```python
class SmartMemoryEnhancer:
    """智能记忆增强"""

    async def enhance_context(self, user_id: str, agent_id: str,
                              project_id: str, current_query: str) -> str:
        """增强上下文"""

        manager = MemoryManager(user_id, agent_id)

        # 1. 获取用户偏好 (跨项目)
        preferences = await manager.retrieve(
            query=current_query,
            project_id=None,  # 不限项目
            top_k=3
        )

        # 2. 获取项目相关记忆
        project_memories = await manager.retrieve(
            query=current_query,
            project_id=project_id,
            top_k=5
        )

        # 3. 构建增强上下文
        context = "## 用户偏好\n"
        for mem in preferences:
            context += f"- {mem.content}\n"

        context += "\n## 项目相关记忆\n"
        for mem in project_memories:
            context += f"- [{mem.type}] {mem.content}\n"

        return context
```

---

## 5. 记忆进化机制

### 5.1 记忆合并

```python
class MemoryEvolution:
    """记忆进化管理"""

    async def merge_similar_memories(self, user_id: str, agent_id: str):
        """合并相似记忆，减少冗余"""

        manager = MemoryManager(user_id, agent_id)

        # 1. 获取所有记忆
        memories = await self.get_all_memories(user_id, agent_id)

        # 2. 聚类相似记忆
        clusters = await self._cluster_by_similarity(memories, threshold=0.85)

        # 3. 合并每个聚类
        for cluster in clusters:
            if len(cluster) > 1:
                merged = await self._merge_memories(cluster)
                await self._replace_with_merged(cluster, merged)

    async def _merge_memories(self, memories: List[Memory]) -> Memory:
        """合并多条记忆为一条"""

        prompt = f"""合并以下相关记忆为一条简洁的总结:

{[m.content for m in memories]}

要求:
1. 保留所有重要信息
2. 去除重复内容
3. 保持语义完整
"""

        merged_content = await self.ai.chat(prompt)

        return Memory(
            content=merged_content,
            merged_from=[m.id for m in memories],
            importance=max(m.importance for m in memories)
        )
```

### 5.2 记忆遗忘

```python
async def forget_outdated(self, user_id: str, agent_id: str):
    """遗忘过时的记忆"""

    # 1. 找出长期未被检索的记忆
    unused_memories = await self.find_unused_memories(
        user_id, agent_id,
        unused_days=90  # 90天未使用
    )

    # 2. 降低其重要性
    for memory in unused_memories:
        memory.importance *= 0.5

        # 重要性过低则删除
        if memory.importance < 0.1:
            await self.delete_memory(memory.id)
        else:
            await self.update_memory(memory)

async def forget_contradicted(self, user_id: str, agent_id: str, new_info: str):
    """遗忘被新信息否定的旧记忆"""

    # 1. 找出可能冲突的旧记忆
    old_memories = await self.search_related(user_id, agent_id, new_info)

    # 2. 检测冲突
    for memory in old_memories:
        if await self._is_contradicted(memory.content, new_info):
            # 标记为过时，降低权重
            memory.status = 'outdated'
            memory.importance *= 0.1
            await self.update_memory(memory)
```

---

## 6. 技能蒸馏机制

### 6.1 设计理念

```yaml
核心理念:
  - 用户专属高管的技能是私有的
  - 但优秀的通用技能可以匿名共享
  - 通过"蒸馏"提取通用知识，去除用户私有信息
  - 让所有用户都能从集体智慧中受益

蒸馏流程:
  1. 检测: 发现某高管解决问题的优秀模式
  2. 提取: 提取通用部分，去除用户特定信息
  3. 验证: 确保不包含隐私数据
  4. 分发: 推送给其他用户的同类高管
```

### 6.2 实现代码

```python
class SkillDistiller:
    """技能蒸馏器"""

    async def distill(self, agent_id: str, skill_pattern: SkillPattern) -> Optional[DistilledSkill]:
        """蒸馏技能"""

        # 1. 提取通用知识
        generic_knowledge = await self._extract_generic(skill_pattern)

        # 2. 去除私有信息
        sanitized = await self._remove_private_info(generic_knowledge)

        # 3. 验证安全性
        if not await self._verify_safe(sanitized):
            return None

        # 4. 创建蒸馏技能
        return DistilledSkill(
            agent_type=agent_id,
            knowledge=sanitized,
            source_anonymous=True
        )

    async def distribute(self, skill: DistilledSkill):
        """分发到其他用户的高管"""

        # 找到所有同类型高管
        agents = await self.db.find_agents_by_type(skill.agent_type)

        # 推送更新（后台静默）
        for agent in agents:
            await self._inject_skill(agent, skill)

    async def _remove_private_info(self, knowledge: str) -> str:
        """去除私有信息"""

        prompt = f"""将以下知识通用化，去除所有用户特定信息:

{knowledge}

要求:
1. 去除具体的用户名、公司名、项目名
2. 保留通用的技术模式和最佳实践
3. 用泛化的描述替代具体案例
"""

        return await self.ai.chat(prompt)
```

---

## 7. 数据模型

### 7.1 UserExecutive

```typescript
interface IUserExecutive {
  _id: ObjectId;
  userId: ObjectId;
  agentId: AgentId;

  // 学习到的偏好
  learnedPreferences: {
    communicationStyle?: 'formal' | 'casual' | 'concise' | 'detailed';
    focusAreas?: string[];
    decisionStyle?: 'fast' | 'careful' | 'data-driven';
  };

  // 记忆统计
  memoryStats: {
    totalMemories: number;
    lastMemoryAt?: Date;
  };

  createdAt: Date;
  updatedAt: Date;
}
```

### 7.2 Memory

```typescript
interface IMemory {
  _id: ObjectId;
  userId: ObjectId;
  agentId: AgentId;
  projectId?: ObjectId;

  content: string;
  type: MemoryType;
  importance: number;  // 0-1

  embedding?: number[];  // 向量存储ID引用

  accessCount: number;
  lastAccessedAt: Date;

  status: 'active' | 'outdated' | 'merged';
  mergedFrom?: ObjectId[];  // 如果是合并后的记忆

  createdAt: Date;
  updatedAt: Date;
}
```

---

## 涉及文件

```yaml
新建:
  - services/py-ai-engine/memory/manager.py
  - services/py-ai-engine/memory/evolution.py
  - services/py-ai-engine/memory/distiller.py
  - thinkus-app/src/lib/db/models/memory.ts
  - thinkus-app/src/lib/db/models/user-executive.ts

修改:
  - services/py-ai-engine/employees/base.py (集成记忆管理器)

配置:
  - Pinecone索引配置
  - OpenAI Embeddings API Key
```

---

## 验收标准

- [ ] 双层记忆正确隔离 (跨项目 vs 项目专属)
- [ ] 记忆检索相关性高
- [ ] 记忆合并正确去重
- [ ] 遗忘机制正常工作
- [ ] 技能蒸馏正确去除隐私
- [ ] 用户间数据完全隔离

---

## 变更记录

| 日期 | 版本 | 变更内容 | 作者 |
|------|------|----------|------|
| 2026-01-17 | v1.0 | 从完整规格文档拆分 | Claude Code |
