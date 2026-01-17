# Thinkus v13 - 8阶段开发流程

> 需求分析 → 设计确认 → 架构规划 → 开发实现 → 测试验证 → UI验收 → 部署上线 → 运维支持

---

## 基本信息

| 字段 | 值 |
|------|-----|
| 功能名称 | 8阶段开发流程 |
| 优先级 | P0 |
| 预估复杂度 | 复杂 |
| 关联模块 | 全平台核心 |

---

## 1. 流程概览

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                                                                              │
│  ┌─────┐   ┌─────┐   ┌─────┐   ┌─────┐   ┌─────┐   ┌─────┐   ┌─────┐   ┌─────┐
│  │  1  │ → │  2  │ → │  3  │ → │  4  │ → │  5  │ → │  6  │ → │  7  │ → │  8  │
│  │需求 │   │设计 │   │架构 │   │开发 │   │测试 │   │验收 │   │部署 │   │运维 │
│  │分析 │   │确认 │   │规划 │   │实现 │   │验证 │   │交付 │   │上线 │   │支持 │
│  └─────┘   └─────┘   └─────┘   └─────┘   └─────┘   └─────┘   └─────┘   └─────┘
│                                                                              │
│  负责人:   Mike     Elena    David     全员      Kevin     Mike     Frank    全员
│                              +Sam                                            │
│                                                                              │
│  用户参与: ✓确认    ✓确认    ✓确认    可预览    可预览   ✓验收    ✓确认     │
│                                                                              │
└─────────────────────────────────────────────────────────────────────────────┘
```

---

## 2. 阶段1: 需求分析 (Mike)

### 2.1 输入输出

```yaml
输入:
  - 用户一句话需求: "帮我做一个电商网站"

输出:
  - 功能列表 (Feature List)
  - 依赖关系图
  - 迭代计划
  - 预估时间
```

### 2.2 核心实现

```python
class MikeRequirementAnalyzer:

    async def analyze(self, requirement: str) -> ProductPlan:
        # 1. 查询知识库，是否有类似项目模板
        template = await self.knowledge_base.find_similar(requirement)

        # 2. 提取功能点
        features = await self._extract_features(requirement, template)

        # 3. 分析依赖关系
        dependencies = await self._analyze_dependencies(features)

        # 4. 划分迭代 (每个迭代3-5个功能)
        iterations = await self._plan_iterations(features, dependencies)

        # 5. 估算时间
        estimate = await self._estimate_time(iterations)

        return ProductPlan(
            features=features,
            dependencies=dependencies,
            iterations=iterations,
            estimated_minutes=estimate
        )
```

### 2.3 数据结构

```python
@dataclass
class Feature:
    id: str                      # F001
    name: str                    # 用户登录
    description: str             # 详细描述
    module: str                  # 用户管理
    involves: List[str]          # [frontend, backend, database]
    complexity: str              # simple/medium/complex
    dependencies: List[str]      # [F001]
    estimated_minutes: int       # 15

@dataclass
class Iteration:
    id: str
    name: str
    goal: str
    features: List[str]          # Feature IDs
    estimated_minutes: int

@dataclass
class ProductPlan:
    requirement: str
    features: List[Feature]
    iterations: List[Iteration]
    total_minutes: int
```

### 2.4 用户确认

```
Mike: "我分析了您的需求，电商网站需要11个功能：

用户模块: 注册、登录、个人中心
商品模块: 列表、详情、搜索
购物模块: 购物车、下单、支付、订单管理

分4个迭代开发，预计80分钟。

[确认] [修改需求] [添加功能] [删除功能]"
```

---

## 3. 阶段2: 设计确认 (Elena)

### 3.1 核心理念

```
❌ 错误: 需求确认 → 直接开发 → 做完用户说不对
✅ 正确: 需求确认 → 设计稿 → 用户确认 → 开发
```

### 3.2 核心实现

```python
class ElenaDesigner:

    async def design_feature(self, feature: Feature, design_tokens: DesignTokens) -> DesignOutput:
        """为功能生成设计预览"""

        # 1. 生成预览组件代码 (React + TailwindCSS)
        preview_code = await self._generate_preview_code(feature, design_tokens)

        # 2. 在沙盒中渲染并截图
        preview_result = await self._render_in_sandbox(preview_code)

        # 3. 输出
        return DesignOutput(
            feature_id=feature.id,
            preview_code=preview_code,
            preview_url=preview_result.url,
            preview_image=preview_result.screenshot,
            design_tokens=design_tokens
        )
```

### 3.3 预览方式

```yaml
方式1 - 截图 (推荐):
  流程: Elena生成React代码 → 沙盒渲染 → Browser Use截图 → 展示给用户
  优点: 用户直接看图，简单直观

方式2 - 实时预览链接:
  流程: Elena生成React代码 → 沙盒渲染 → 返回预览URL → 用户点击查看
  优点: 用户可以交互，体验真实效果

方式3 - 嵌入式预览 (iframe):
  流程: 在Thinkus界面中嵌入iframe展示预览
  优点: 无需跳转，体验流畅

实际使用: 三种方式都提供
```

### 3.4 用户确认

```
Elena: "这是登录页面的设计预览：

[显示设计稿图片]

设计说明：
• 简洁的居中布局
• 邮箱和密码输入框
• 主色调登录按钮
• 底部有注册链接
• 支持GitHub登录

[确认设计] [修改颜色] [调整布局] [重新设计]"
```

---

## 4. 阶段3: 架构规划 (David + Sam)

### 4.1 技术选型

```python
class DavidArchitect:

    async def design_architecture(self, plan: ProductPlan) -> Architecture:
        # 1. 根据功能选择技术栈
        tech_stack = await self._select_tech_stack(plan.features)

        # 2. 设计目录结构
        structure = await self._design_structure(tech_stack)

        # 3. 定义组件库
        components = await self._define_components(plan.features)

        return Architecture(
            tech_stack=tech_stack,
            structure=structure,
            components=components
        )
```

### 4.2 数据库设计

```python
class SamDatabaseDesigner:

    async def design_schema(self, plan: ProductPlan) -> DatabaseSchema:
        # 1. 根据功能提取实体
        entities = await self._extract_entities(plan.features)

        # 2. 设计表结构
        tables = await self._design_tables(entities)

        # 3. 设计关系
        relations = await self._design_relations(tables)

        # 4. 生成Migration
        migrations = await self._generate_migrations(tables, relations)

        return DatabaseSchema(
            tables=tables,
            relations=relations,
            migrations=migrations
        )
```

### 4.3 组件库定义

```python
@dataclass
class ComponentLibrary:
    """预定义的可复用组件"""

    components: List[Component] = [
        Component(name='Button', variants=['primary', 'secondary', 'danger']),
        Component(name='Input', variants=['text', 'password', 'email']),
        Component(name='Card', variants=['default', 'hover', 'selected']),
        Component(name='Modal', variants=['default', 'confirm', 'alert']),
        Component(name='Table', variants=['default', 'sortable', 'paginated']),
        Component(name='Form', variants=['default', 'inline']),
        Component(name='Loading', variants=['spinner', 'skeleton', 'progress']),
        Component(name='Toast', variants=['success', 'error', 'warning', 'info']),
    ]
```

---

## 5. 阶段4: 开发实现

### 5.1 单功能开发流程

```
┌─────────────────────────────────────────────────────────────────────────────┐
│  功能开发流程 (每个功能)                                                    │
│                                                                              │
│  ┌─────────────┐                                                            │
│  │ Mike生成    │                                                            │
│  │ 接口契约    │                                                            │
│  └──────┬──────┘                                                            │
│         │                                                                    │
│         ▼                                                                    │
│  ┌─────────────────────────────────────────────────────────────────────┐   │
│  │                      基于契约并行开发                                │   │
│  │                                                                      │   │
│  │   ┌─────────┐      ┌─────────┐      ┌─────────┐                    │   │
│  │   │  Sam    │      │ David   │      │ Elena   │                    │   │
│  │   │ 数据库  │      │  后端   │      │  前端   │                    │   │
│  │   └────┬────┘      └────┬────┘      └────┬────┘                    │   │
│  │        │                │                │                          │   │
│  │        ▼                ▼                ▼                          │   │
│  │   migration         API代码          React组件                      │   │
│  │                                                                      │   │
│  └─────────────────────────────────────────────────────────────────────┘   │
│         │                                                                    │
│         ▼                                                                    │
│  ┌─────────────┐      ┌─────────────┐                                      │
│  │ Kevin       │ ──→  │ Mike        │                                      │
│  │ 功能测试    │      │ UI验收      │                                      │
│  └─────────────┘      └─────────────┘                                      │
│                                                                              │
└─────────────────────────────────────────────────────────────────────────────┘
```

### 5.2 并行开发控制

```python
class ParallelDevelopmentController:
    """并行开发控制器"""

    async def develop_iteration(self, iteration: Iteration) -> IterationResult:
        """开发一个迭代"""

        # 1. 按依赖分组
        groups = self._group_by_dependency(iteration.features)

        # 2. 逐组开发 (组内并行，组间串行)
        for group in groups:
            tasks = [self._develop_feature(f) for f in group]
            results = await asyncio.gather(*tasks)

        # 3. 集成
        await self._integrate_code(iteration)

        return IterationResult(iteration.id, success=True)

    async def _develop_feature(self, feature: Feature) -> FeatureResult:
        """开发单个功能"""

        # 1. 生成契约
        contract = await self.mike.generate_contract(feature)

        # 2. 并行开发各模块
        db_code, api_code, ui_code = await asyncio.gather(
            self.sam.develop(contract),
            self.david.develop(contract),
            self.elena.develop(contract, feature.design)
        )

        # 3. Kevin验证
        test_result = await self.kevin.test(contract, {
            'database': db_code,
            'backend': api_code,
            'frontend': ui_code,
        })

        # 4. 修复问题 (最多3次)
        attempts = 0
        while not test_result.success and attempts < 3:
            fixed_code = await self._fix_issues(test_result.issues)
            test_result = await self.kevin.test(contract, fixed_code)
            attempts += 1

        # 5. Mike UI验收
        if test_result.success:
            acceptance = await self.mike.accept_ui(feature, contract)

        return FeatureResult(feature.id, success=True)
```

---

## 6. 阶段5: 测试验证 (Kevin)

### 6.1 测试类型

```python
class KevinTester:

    async def full_test(self, contract: InterfaceContract, code: dict) -> TestResult:
        results = {}

        # 1. 契约一致性测试
        results['contract'] = await self._test_contract_compliance(contract, code)

        # 2. 功能测试 (正常流程)
        results['functional'] = await self._test_functional(contract, code)

        # 3. 边界测试
        results['boundary'] = await self._test_boundary(contract, code)

        # 4. 异常测试
        results['exception'] = await self._test_exception(contract, code)

        # 5. 集成测试
        results['integration'] = await self._test_integration(code)

        return TestResult(
            success=all(r.success for r in results.values()),
            details=results
        )
```

### 6.2 边界测试

```python
async def _test_boundary(self, contract: InterfaceContract, code: dict) -> TestResult:
    test_cases = [
        {'email': '', 'password': ''},                          # 空输入
        {'email': 'a' * 1000, 'password': 'b' * 1000},          # 超长输入
        {'email': "test'@test.com", 'password': '<script>alert(1)</script>'},  # 特殊字符
        {'email': '  test@test.com  ', 'password': '  password  '},  # 空格
        {'email': 'test@测试.com', 'password': '密码123'},      # Unicode
    ]

    results = []
    for case in test_cases:
        result = await self._run_test(contract.api, case)
        results.append(result)

    return TestResult(success=all(r.handled_gracefully for r in results))
```

---

## 7. 阶段6: UI验收 (Mike + Browser Use)

### 7.1 验收流程

```python
class MikeUIAcceptance:

    async def accept_feature(self, feature: Feature, sandbox: Sandbox) -> AcceptanceResult:
        browser = Browser(headless=True)

        # 1. 生成验收任务
        task = await self._generate_acceptance_task(feature)

        # 2. 执行验收 (Browser Use)
        agent = Agent(
            task=task,
            llm=ChatAnthropic(model="claude-sonnet-4-20250514"),
            browser=browser,
            save_screenshots=True
        )
        result = await agent.run()

        # 3. 分析结果
        evaluation = await self._evaluate(feature, result)

        return AcceptanceResult(
            passed=evaluation.score >= 7,
            score=evaluation.score,
            issues=evaluation.issues,
            suggestions=evaluation.suggestions,
            screenshots=result.screenshots
        )
```

### 7.2 验收标准

```python
ACCEPTANCE_CRITERIA = {
    '布局': ['页面结构清晰', '重要内容突出', '对齐整齐', '间距合理'],
    '交互': ['按钮可点击(>=44px)', '表单易填写', '加载有提示', '反馈及时(<200ms)'],
    '体验': ['流程顺畅', '无迷惑', '错误提示友好', '符合预期'],
    '完整性': ['所有功能都有', '边界有考虑', '必要说明存在'],
}

SCORE_STANDARD = {
    10: '完美，超出预期',
    9: '优秀，几乎没问题',
    8: '良好，小问题不影响',
    7: '合格，能用但可改进',  # 最低通过线
    6: '勉强，需修复才能上线',
    5: '不合格，需要重做',
}
```

---

## 8. 阶段7: 部署上线 (Frank)

### 8.1 一键部署

```python
class DeploymentManager:

    async def deploy(self, project_id: str, target: str = 'vercel') -> DeployResult:
        if target == 'vercel':
            return await self._deploy_to_vercel(project_id)
        elif target == 'netlify':
            return await self._deploy_to_netlify(project_id)
        elif target == 'docker':
            return await self._deploy_to_docker(project_id)

    async def _deploy_to_vercel(self, project_id: str) -> DeployResult:
        agent = Agent(
            task=f"""
            1. 打开 vercel.com/new
            2. 导入GitHub仓库: {repo_url}
            3. 配置环境变量
            4. 点击Deploy
            5. 等待部署完成
            6. 返回部署URL
            """,
            llm=self.llm,
            browser=Browser()
        )
        result = await agent.run()
        return DeployResult(url=result.final_url)
```

---

## 9. 阶段8: 运维支持

### 9.1 监控配置

```python
class MonitoringSetup:

    async def setup(self, deploy_url: str):
        await self._setup_health_check(deploy_url)
        await self._setup_error_tracking(deploy_url)  # Sentry
        await self._setup_performance_monitoring(deploy_url)
        await self._setup_alerts(deploy_url)
```

---

## 涉及文件

```yaml
新建:
  - services/go-orchestrator/workflow/
  - services/py-ai-engine/workflow/
  - thinkus-app/src/lib/services/workflow/

参考:
  - 05-interface-contract.md (契约机制)
  - 06-testing-system.md (测试系统)
```

---

## 验收标准

- [ ] 8个阶段全部可执行
- [ ] 用户确认节点正常工作
- [ ] 并行开发控制正确
- [ ] 迭代修复机制正常
- [ ] 端到端流程可跑通

---

## 变更记录

| 日期 | 版本 | 变更内容 | 作者 |
|------|------|----------|------|
| 2026-01-17 | v1.0 | 从完整规格文档拆分 | Claude Code |
