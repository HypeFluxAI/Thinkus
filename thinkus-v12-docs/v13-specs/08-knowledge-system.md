# Thinkus v13 - 知识系统

> 知识库 + 技能系统 + 记忆进化 + 技能蒸馏

---

## 基本信息

| 字段 | 值 |
|------|-----|
| 功能名称 | 知识系统 |
| 优先级 | P1 |
| 预估复杂度 | 复杂 |
| 关联模块 | Python AI层、向量存储 |

---

## 1. 系统概览

### 1.1 知识系统架构

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                                                                              │
│  Layer 1: Skills (技能知识库)                                               │
│  ────────────────────────────                                               │
│  知识 + 流程 + 模板 + 最佳实践                                             │
│  • code_analysis: 代码分析技能                                              │
│  • react_development: React开发技能                                         │
│  • api_design: API设计技能                                                  │
│  • database_design: 数据库设计技能                                          │
│  • testing: 测试技能                                                        │
│                                                                              │
│  Layer 2: Knowledge Base (知识库)                                           │
│  ───────────────────────────────                                            │
│  • 项目模板 (电商、博客、SaaS)                                             │
│  • 功能模板 (认证、支付、上传)                                             │
│  • 代码模板 (CRUD、表单、列表)                                             │
│  • 错误案例 + 解决方案                                                      │
│  • 最佳实践                                                                 │
│                                                                              │
│  Layer 3: Memory Evolution (记忆进化)                                       │
│  ─────────────────────────────────                                          │
│  • 相似记忆合并                                                             │
│  • 过时记忆遗忘                                                             │
│  • 矛盾记忆处理                                                             │
│                                                                              │
│  Layer 4: Skill Distillation (技能蒸馏)                                     │
│  ─────────────────────────────────────                                      │
│  • 提取通用知识                                                             │
│  • 去除私有信息                                                             │
│  • 跨用户共享                                                               │
│                                                                              │
└─────────────────────────────────────────────────────────────────────────────┘
```

---

## 2. 技能系统

### 2.1 技能基类

```python
from dataclasses import dataclass
from typing import List, Optional

@dataclass
class Skill:
    """技能基类"""

    name: str
    description: str
    knowledge: str          # 领域知识
    workflow: str           # 工作流程
    templates: List[str]    # 代码模板
    best_practices: str     # 最佳实践

    async def apply(self, context: dict) -> str:
        """应用技能"""
        raise NotImplementedError
```

### 2.2 代码分析技能

```python
class CodeAnalysisSkill(Skill):
    """代码分析技能"""

    name = "code_analysis"
    description = "代码分析和理解"

    knowledge = """
    代码分析要点:
    1. 识别代码结构 (模块、类、函数)
    2. 理解数据流和控制流
    3. 发现潜在问题 (性能、安全、可维护性)
    4. 识别代码模式和反模式
    """

    workflow = """
    1. 解析代码结构
    2. 分析依赖关系
    3. 检查代码质量
    4. 生成分析报告
    """

    async def analyze(self, code: str) -> Analysis:
        """分析代码结构、依赖、问题"""

        prompt = f"""
        {self.knowledge}

        分析以下代码:
        {code}

        输出:
        1. 代码结构
        2. 依赖关系
        3. 潜在问题
        4. 改进建议
        """

        return await self.ai.chat(prompt, response_model=Analysis)

@dataclass
class Analysis:
    structure: dict         # 代码结构
    dependencies: List[str] # 依赖列表
    issues: List[Issue]     # 潜在问题
    suggestions: List[str]  # 改进建议
```

### 2.3 React开发技能

```python
class ReactDevelopmentSkill(Skill):
    """React开发技能"""

    name = "react_development"
    description = "React应用开发"

    knowledge = """
    React开发最佳实践:
    1. 组件设计: 单一职责、可复用
    2. 状态管理: 最小化状态、正确选择状态位置
    3. 性能优化: useMemo、useCallback、React.memo
    4. 代码组织: 按功能模块组织、清晰的目录结构
    """

    templates = [
        # 函数组件模板
        """
        interface {ComponentName}Props {
          // props
        }

        export function {ComponentName}({ }: {ComponentName}Props) {
          return (
            <div>
              {/* content */}
            </div>
          );
        }
        """,
        # Hook模板
        """
        export function use{HookName}() {
          const [state, setState] = useState<{StateType}>();

          useEffect(() => {
            // effect
          }, []);

          return { state };
        }
        """
    ]

    async def generate_component(self, spec: ComponentSpec) -> str:
        """生成React组件"""

        prompt = f"""
        {self.knowledge}

        根据以下规格生成React组件:
        名称: {spec.name}
        功能: {spec.description}
        Props: {spec.props}
        状态: {spec.states}

        使用以下模板风格:
        {self.templates[0]}

        要求:
        1. 使用TypeScript
        2. 使用TailwindCSS
        3. 遵循最佳实践
        """

        return await self.ai.chat(prompt)
```

### 2.4 API设计技能

```python
class APIDesignSkill(Skill):
    """API设计技能"""

    name = "api_design"
    description = "RESTful API设计"

    knowledge = """
    API设计原则:
    1. 资源导向: 使用名词而非动词
    2. HTTP方法: GET/POST/PUT/DELETE语义正确
    3. 状态码: 使用标准HTTP状态码
    4. 版本控制: /api/v1/ 风格
    5. 错误处理: 统一的错误响应格式
    """

    best_practices = """
    - 使用复数名词 (/users 而非 /user)
    - 过滤/排序/分页使用查询参数
    - 认证使用Bearer Token
    - 响应包含必要的元数据
    """

    async def design_api(self, resource: ResourceSpec) -> APIDesign:
        """设计API端点"""

        prompt = f"""
        {self.knowledge}
        {self.best_practices}

        为以下资源设计RESTful API:
        资源: {resource.name}
        字段: {resource.fields}
        关系: {resource.relations}
        操作: {resource.operations}

        输出完整的API设计，包括:
        1. 端点列表
        2. 请求/响应格式
        3. 错误码定义
        """

        return await self.ai.chat(prompt, response_model=APIDesign)
```

---

## 3. 知识库

### 3.1 知识库结构

```python
class KnowledgeBase:
    """知识库"""

    # 项目模板
    project_templates: List[ProjectTemplate] = []
    # 如: 电商网站模板、博客模板、SaaS模板

    # 功能模板
    feature_templates: List[FeatureTemplate] = []
    # 如: 用户认证、支付集成、文件上传

    # 代码模板
    code_templates: List[CodeTemplate] = []
    # 如: CRUD API、表单组件、列表页面

    # 错误案例
    error_cases: List[ErrorCase] = []
    # 记录常见错误和解决方案

    # 最佳实践
    best_practices: List[BestPractice] = []
    # 如: 密码加密、SQL注入防护、XSS防护
```

### 3.2 项目模板

```python
@dataclass
class ProjectTemplate:
    """项目模板"""

    id: str
    name: str                    # 电商网站
    description: str
    category: str                # ecommerce, blog, saas, tool

    # 技术栈
    tech_stack: TechStack

    # 功能列表
    features: List[str]          # ['用户认证', '商品管理', '购物车', '支付']

    # 目录结构
    structure: dict

    # 基础代码
    boilerplate: dict            # 文件路径 -> 代码内容

    # 预估工时
    estimated_hours: int

@dataclass
class TechStack:
    frontend: str                # Next.js
    backend: str                 # Node.js + Express
    database: str                # PostgreSQL
    styling: str                 # TailwindCSS
    auth: str                    # NextAuth.js
```

### 3.3 功能模板

```python
@dataclass
class FeatureTemplate:
    """功能模板"""

    id: str
    name: str                    # 用户认证
    description: str
    category: str                # auth, payment, upload, notification

    # 接口契约
    contract: InterfaceContract

    # 代码模板
    frontend_code: str
    backend_code: str
    database_schema: str

    # 配置说明
    config_guide: str

    # 测试用例
    test_cases: List[TestCase]

class FeatureTemplateLibrary:
    """功能模板库"""

    templates: Dict[str, FeatureTemplate] = {}

    async def find_similar(self, description: str, top_k: int = 3) -> List[FeatureTemplate]:
        """查找相似功能模板"""

        # 生成查询embedding
        query_embedding = await self.embed(description)

        # 向量搜索
        results = await self.vector_store.search(
            query_embedding,
            top_k=top_k,
            filter={'type': 'feature_template'}
        )

        return [self.templates[r.id] for r in results]

    async def apply_template(self, template: FeatureTemplate, context: dict) -> dict:
        """应用功能模板"""

        # 1. 替换占位符
        frontend = self._replace_placeholders(template.frontend_code, context)
        backend = self._replace_placeholders(template.backend_code, context)
        schema = self._replace_placeholders(template.database_schema, context)

        # 2. 适配项目结构
        adapted = await self._adapt_to_project(frontend, backend, schema, context)

        return adapted
```

### 3.4 错误案例库

```python
@dataclass
class ErrorCase:
    """错误案例"""

    id: str
    error_type: str              # runtime, compile, logic, security
    error_message: str           # 错误信息
    stack_trace: str             # 堆栈跟踪
    context: dict                # 上下文信息

    # 根因分析
    root_cause: str

    # 解决方案
    solution: str
    solution_code: str

    # 预防措施
    prevention: str

    # 相关案例
    related_cases: List[str]

class ErrorCaseLibrary:
    """错误案例库"""

    async def find_solution(self, error: str, context: dict) -> Optional[ErrorCase]:
        """查找错误解决方案"""

        # 1. 提取错误特征
        features = await self._extract_error_features(error, context)

        # 2. 搜索相似错误
        similar_cases = await self.vector_store.search(
            await self.embed(str(features)),
            top_k=5,
            filter={'type': 'error_case'}
        )

        # 3. 选择最相关的案例
        if similar_cases:
            best_match = await self._select_best_match(similar_cases, error, context)
            return self.cases.get(best_match.id)

        return None

    async def learn_from_fix(self, error: str, fix: str, context: dict):
        """从修复中学习"""

        # 创建新的错误案例
        case = ErrorCase(
            id=generate_id(),
            error_type=await self._classify_error(error),
            error_message=error,
            context=context,
            root_cause=await self._analyze_root_cause(error, fix),
            solution=await self._summarize_solution(fix),
            solution_code=fix,
            prevention=await self._suggest_prevention(error, fix)
        )

        # 存储到知识库
        await self.store(case)
```

---

## 4. 记忆进化机制

### 4.1 记忆合并

```python
class MemoryEvolution:
    """记忆进化管理"""

    async def merge_similar_memories(self, user_id: str, agent_id: str):
        """合并相似记忆，减少冗余"""

        # 1. 获取所有记忆
        memories = await self.get_all_memories(user_id, agent_id)

        # 2. 聚类相似记忆 (相似度 > 0.85)
        clusters = await self._cluster_by_similarity(memories, threshold=0.85)

        # 3. 合并每个聚类
        for cluster in clusters:
            if len(cluster) > 1:
                merged = await self._merge_memories(cluster)
                await self._replace_with_merged(cluster, merged)

    async def _cluster_by_similarity(self, memories: List[Memory], threshold: float) -> List[List[Memory]]:
        """按相似度聚类"""

        clusters = []
        used = set()

        for i, mem in enumerate(memories):
            if i in used:
                continue

            cluster = [mem]
            used.add(i)

            for j, other in enumerate(memories[i+1:], i+1):
                if j in used:
                    continue

                similarity = await self._compute_similarity(mem.embedding, other.embedding)
                if similarity >= threshold:
                    cluster.append(other)
                    used.add(j)

            clusters.append(cluster)

        return clusters

    async def _merge_memories(self, memories: List[Memory]) -> Memory:
        """合并多条记忆为一条"""

        prompt = f"""合并以下相关记忆为一条简洁的总结:

{[m.content for m in memories]}

要求:
1. 保留所有重要信息
2. 去除重复内容
3. 保持语义完整"""

        merged_content = await self.ai.chat(prompt)

        return Memory(
            id=generate_id(),
            content=merged_content,
            type='merged',
            importance=max(m.importance for m in memories),
            merged_from=[m.id for m in memories]
        )
```

### 4.2 记忆遗忘

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

async def _is_contradicted(self, old_content: str, new_info: str) -> bool:
    """检测是否矛盾"""

    prompt = f"""判断以下两条信息是否矛盾:

旧信息: {old_content}
新信息: {new_info}

只回答: 是 或 否"""

    response = await self.ai.chat(prompt)
    return '是' in response
```

---

## 5. 技能蒸馏机制

### 5.1 设计理念

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

### 5.2 技能蒸馏器

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

    async def _extract_generic(self, pattern: SkillPattern) -> str:
        """提取通用知识"""

        prompt = f"""从以下问题解决模式中提取通用的、可复用的知识:

问题类型: {pattern.problem_type}
解决方案: {pattern.solution}
上下文: {pattern.context}

提取要求:
1. 保留解决问题的核心方法
2. 去除具体的技术栈细节
3. 抽象为可应用于类似问题的通用模式"""

        return await self.ai.chat(prompt)

    async def _remove_private_info(self, knowledge: str) -> str:
        """去除私有信息"""

        prompt = f"""将以下知识通用化，去除所有用户特定信息:

{knowledge}

要求:
1. 去除具体的用户名、公司名、项目名
2. 保留通用的技术模式和最佳实践
3. 用泛化的描述替代具体案例"""

        return await self.ai.chat(prompt)

    async def _verify_safe(self, content: str) -> bool:
        """验证内容安全性"""

        # 检查是否包含敏感信息
        sensitive_patterns = [
            r'[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}',  # 邮箱
            r'\b\d{3}[-.]?\d{3}[-.]?\d{4}\b',                    # 电话
            r'sk_[a-zA-Z0-9]{24,}',                              # API Key
            r'[A-Z0-9]{20,}',                                    # Token
        ]

        for pattern in sensitive_patterns:
            if re.search(pattern, content):
                return False

        return True
```

---

## 6. 数据模型

```typescript
interface IKnowledgeItem {
  _id: ObjectId;
  type: 'project_template' | 'feature_template' | 'code_template' | 'error_case' | 'best_practice';

  name: string;
  description: string;
  category: string;

  content: any;  // 根据type不同结构不同

  embedding: number[];  // 用于向量搜索

  usage: {
    count: number;
    lastUsedAt: Date;
    rating: number;  // 平均评分
  };

  createdAt: Date;
  updatedAt: Date;
}

interface IDistilledSkill {
  _id: ObjectId;
  agentType: string;  // mike_pm, david_tech, etc.

  knowledge: string;
  category: string;

  sourceAnonymous: boolean;  // 始终为true
  distributedTo: number;  // 分发给多少用户

  createdAt: Date;
}
```

---

## 涉及文件

```yaml
新建:
  - services/py-ai-engine/knowledge/base.py
  - services/py-ai-engine/knowledge/templates.py
  - services/py-ai-engine/knowledge/error_cases.py
  - services/py-ai-engine/skills/base.py
  - services/py-ai-engine/skills/code_analysis.py
  - services/py-ai-engine/skills/react_development.py
  - services/py-ai-engine/skills/api_design.py
  - services/py-ai-engine/memory/evolution.py
  - services/py-ai-engine/memory/distiller.py
  - thinkus-app/src/lib/db/models/knowledge.ts

修改:
  - services/py-ai-engine/employees/base.py (集成技能系统)
  - services/py-ai-engine/memory/manager.py (集成进化机制)

配置:
  - Pinecone知识库索引
  - 初始模板数据
```

---

## 验收标准

- [ ] 技能系统正常工作
- [ ] 知识库检索准确
- [ ] 记忆合并正确去重
- [ ] 遗忘机制正常运行
- [ ] 技能蒸馏正确去除隐私
- [ ] 蒸馏技能分发正常

---

## 变更记录

| 日期 | 版本 | 变更内容 | 作者 |
|------|------|----------|------|
| 2026-01-17 | v1.0 | 从完整规格文档拆分 | Claude Code |
