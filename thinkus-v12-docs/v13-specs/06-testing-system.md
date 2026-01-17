# Thinkus v13 - 测试系统

> Playwright确定性测试 + Browser Use智能验收 + 全平台覆盖

---

## 基本信息

| 字段 | 值 |
|------|-----|
| 功能名称 | 测试系统 |
| 优先级 | P0 |
| 预估复杂度 | 复杂 |
| 关联模块 | Python AI层、Go编排层 |

---

## 1. 测试策略概览

### 1.1 Playwright vs Browser Use

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                           Playwright                                         │
├─────────────────────────────────────────────────────────────────────────────┤
│  定位: 确定性浏览器自动化框架                                                │
│  原理: 脚本驱动 - 预先编写精确的操作步骤                                     │
│  执行: 按照代码指令精确执行，没有AI判断                                      │
│  适合: E2E测试、回归测试、CI/CD流水线、批量数据采集                          │
│  类比: 像一个"精确的机器人"，按照说明书一步步执行                           │
└─────────────────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────────────────┐
│                           Browser Use                                        │
├─────────────────────────────────────────────────────────────────────────────┤
│  定位: AI驱动的智能浏览器代理                                                │
│  原理: LLM驱动 - 用自然语言描述目标，AI自己决定怎么做                        │
│  执行: AI观察页面、理解内容、自主决策下一步操作                              │
│  适合: UI验收、用户体验评估、动态页面交互、复杂表单填写                      │
│  类比: 像一个"智能助手"，理解你的目标后自己想办法完成                       │
└─────────────────────────────────────────────────────────────────────────────┘
```

### 1.2 使用策略

```yaml
确定性任务 (可预测、可重复、需要速度):
  工具: Playwright
  场景:
    - E2E功能测试
    - 回归测试
    - API契约验证
    - 批量截图对比
    - CI/CD流水线

智能任务 (需要理解、判断、评估):
  工具: Browser Use
  场景:
    - UI验收评估
    - 用户体验检查
    - 设计稿对比
    - 交互流程验证
    - 异常情况探索
```

### 1.3 测试金字塔

```
                     /\
                    /  \
                   / UI \        ← Browser Use (智能验收)
                  / 验收 \          少量、高价值
                 /────────\
                /   E2E    \     ← Playwright (功能测试)
               /   功能测试  \       中等数量
              /──────────────\
             /   集成测试      \   ← API测试 (不需要浏览器)
            /                  \     大量
           /────────────────────\
          /      单元测试        \  ← Jest/Pytest
         /                        \    最大量
        /──────────────────────────\
```

---

## 2. Kevin测试能力 (QA负责人)

### 2.1 完整测试流程

```python
class KevinTester:
    """Kevin的测试能力"""

    async def full_test(self, contract: InterfaceContract, code: dict) -> TestResult:
        """完整测试"""

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

    async def _test_contract_compliance(self, contract: InterfaceContract, code: dict) -> TestResult:
        """契约一致性测试"""

        errors = []

        # 验证API端点
        api = contract.api
        endpoint_code = code.get('backend', '')

        # 检查路径是否正确
        if api.path not in endpoint_code:
            errors.append(f"API路径 {api.path} 未找到")

        # 检查请求参数
        for param_name in api.request.body.keys():
            if param_name not in endpoint_code:
                errors.append(f"请求参数 {param_name} 未处理")

        # 检查响应字段
        for field_name in api.response.body.keys():
            if field_name not in endpoint_code:
                errors.append(f"响应字段 {field_name} 未返回")

        # 检查错误码
        for error in api.errors:
            if error.code not in endpoint_code:
                errors.append(f"错误码 {error.code} 未处理")

        return TestResult(
            success=len(errors) == 0,
            errors=errors
        )
```

### 2.2 边界测试

```python
async def _test_boundary(self, contract: InterfaceContract, code: dict) -> TestResult:
    """边界情况测试"""

    test_cases = [
        # 空输入
        {'email': '', 'password': ''},
        # 超长输入
        {'email': 'a' * 1000, 'password': 'b' * 1000},
        # 特殊字符
        {'email': "test'@test.com", 'password': '<script>alert(1)</script>'},
        # Unicode
        {'email': 'test@测试.com', 'password': '密码123'},
        # SQL注入尝试
        {'email': "test@test.com'; DROP TABLE users;--", 'password': 'test'},
        # XSS尝试
        {'email': '<img src=x onerror=alert(1)>@test.com', 'password': 'test'},
    ]

    results = []
    for case in test_cases:
        result = await self._run_test(contract.api, case)
        results.append(result)

    return TestResult(success=all(r.handled_gracefully for r in results))

async def _test_exception(self, contract: InterfaceContract, code: dict) -> TestResult:
    """异常情况测试"""

    exception_cases = [
        # 网络异常
        {'scenario': 'network_timeout', 'expected': 'retry_or_error'},
        # 数据库异常
        {'scenario': 'db_connection_failed', 'expected': 'graceful_error'},
        # 并发请求
        {'scenario': 'concurrent_requests', 'count': 100, 'expected': 'all_handled'},
    ]

    results = []
    for case in exception_cases:
        result = await self._simulate_exception(contract.api, case)
        results.append(result)

    return TestResult(success=all(r.handled_correctly for r in results))
```

### 2.3 测试报告生成

```python
class TestReportGenerator:
    """测试报告生成器"""

    async def generate(self, test_result: TestResult) -> TestReport:
        """生成测试报告"""

        return TestReport(
            summary=TestSummary(
                total_tests=test_result.total_tests,
                passed=test_result.passed,
                failed=test_result.failed,
                skipped=test_result.skipped,
                coverage=test_result.coverage,
                duration=test_result.duration
            ),
            details=[
                TestDetail(
                    category=category,
                    tests=[
                        TestCase(
                            name=test.name,
                            status=test.status,
                            duration=test.duration,
                            error=test.error if test.status == 'failed' else None,
                            screenshot=test.screenshot if test.screenshot else None
                        )
                        for test in tests
                    ]
                )
                for category, tests in test_result.details.items()
            ],
            recommendations=await self._generate_recommendations(test_result)
        )

    async def _generate_recommendations(self, test_result: TestResult) -> List[str]:
        """生成改进建议"""

        recommendations = []

        if test_result.failed > 0:
            prompt = f"""根据以下测试失败信息，给出改进建议:

失败测试:
{test_result.failed_tests}

请提供具体的修复建议。"""

            recommendations = await self.ai.chat('kevin_qa', prompt)

        return recommendations
```

---

## 3. UI验收 (Mike + Browser Use)

### 3.1 验收流程

```python
class MikeUIAcceptance:
    """Mike的UI验收 - 基于Browser Use"""

    def __init__(self):
        self.llm = ChatAnthropic(model="claude-sonnet-4-20250514")

    async def accept_feature(self, feature: Feature, sandbox: Sandbox) -> AcceptanceResult:
        """验收单个功能"""

        browser = Browser(headless=True)

        # 1. 生成验收任务
        task = await self._generate_acceptance_task(feature)

        # 2. 执行验收 (Browser Use)
        agent = Agent(
            task=task,
            llm=self.llm,
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

    async def _generate_acceptance_task(self, feature: Feature) -> str:
        """生成验收任务 (自然语言)"""

        return f"""
作为产品经理验收「{feature.name}」功能：

1. 打开页面 {feature.design.page}
2. 检查界面:
   - 布局是否与设计稿一致
   - 所有元素是否存在
   - 颜色、字体是否正确
3. 测试交互:
   - {feature.acceptance_criteria}
4. 评估用户体验:
   - 加载速度
   - 响应反馈
   - 错误提示是否友好

**验收标准:**
- 功能完整可用
- 界面美观一致
- 交互流畅自然
- 错误处理得当

满分10分，请打分并说明理由。"""
```

### 3.2 验收评估

```python
async def _evaluate(self, feature: Feature, result: AgentResult) -> Evaluation:
    """评估验收结果"""

    prompt = f"""基于以下Browser Use执行结果，评估功能验收:

功能: {feature.name}
验收标准: {feature.acceptance_criteria}

执行日志:
{result.logs}

截图分析:
{[self._describe_screenshot(s) for s in result.screenshots]}

请评估:
1. 功能完整性 (1-10)
2. 界面一致性 (1-10)
3. 用户体验 (1-10)
4. 错误处理 (1-10)

给出总分和具体问题列表。"""

    return await self.ai.chat('mike_pm', prompt, response_model=Evaluation)

async def _describe_screenshot(self, screenshot: Screenshot) -> str:
    """描述截图内容"""

    # 使用Claude Vision分析截图
    response = await self.client.messages.create(
        model="claude-sonnet-4-20250514",
        messages=[{
            "role": "user",
            "content": [
                {
                    "type": "image",
                    "source": {
                        "type": "base64",
                        "media_type": "image/png",
                        "data": screenshot.base64_data
                    }
                },
                {
                    "type": "text",
                    "text": "描述这个截图中的UI元素和状态"
                }
            ]
        }]
    )

    return response.content[0].text
```

---

## 4. 全平台测试系统

### 4.1 测试工具矩阵

```yaml
平台测试工具:
  Web:      Playwright (跨浏览器，微软官方)
  iOS:      Maestro + Detox (React Native友好)
  Android:  Maestro + Appium (成熟稳定)
  Windows:  WinAppDriver (微软官方)
  Mac:      Appium for Mac

运行环境:
  Web:      Docker容器
  iOS:      macOS / 云服务 (BrowserStack)
  Android:  Docker容器 (Android模拟器)
  Windows:  Windows VM
  Mac:      macOS
```

### 4.2 测试架构

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                                                                              │
│  AI生成代码 → TestOrchestrator → 分发到各平台Runner → 收集结果 → 分析      │
│                                                                              │
│  ┌─────────────┐                                                            │
│  │   Go层      │                                                            │
│  │ TestCoord   │  调度测试任务，收集结果，触发修复                          │
│  └──────┬──────┘                                                            │
│         │ gRPC                                                               │
│         ▼                                                                    │
│  ┌─────────────────────────────────────────────────────────────────────┐   │
│  │                      Python 测试执行层                               │   │
│  │                                                                      │   │
│  │  ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌──────────┐              │   │
│  │  │WebRunner │ │iOSRunner │ │AndroidRun│ │WinRunner │              │   │
│  │  │Playwright│ │Maestro   │ │Appium    │ │WinAppDrv │              │   │
│  │  └──────────┘ └──────────┘ └──────────┘ └──────────┘              │   │
│  │                                                                      │   │
│  └─────────────────────────────────────────────────────────────────────┘   │
│                                                                              │
└─────────────────────────────────────────────────────────────────────────────┘
```

### 4.3 测试编排器 (Go)

```go
// TestOrchestrator - 测试编排器
type TestOrchestrator struct {
    webRunner     *WebRunner
    iosRunner     *IOSRunner
    androidRunner *AndroidRunner
    winRunner     *WinRunner
    results       chan *TestResult
}

func (o *TestOrchestrator) RunTests(task *TestTask) (*TestReport, error) {
    ctx, cancel := context.WithTimeout(context.Background(), 30*time.Minute)
    defer cancel()

    // 根据目标平台并行执行测试
    var wg sync.WaitGroup
    results := make(map[string]*TestResult)

    for _, platform := range task.Platforms {
        wg.Add(1)
        go func(p string) {
            defer wg.Done()

            var result *TestResult
            switch p {
            case "web":
                result = o.webRunner.Run(ctx, task)
            case "ios":
                result = o.iosRunner.Run(ctx, task)
            case "android":
                result = o.androidRunner.Run(ctx, task)
            case "windows":
                result = o.winRunner.Run(ctx, task)
            }

            o.results <- result
        }(platform)
    }

    // 收集结果
    go func() {
        wg.Wait()
        close(o.results)
    }()

    for result := range o.results {
        results[result.Platform] = result
    }

    // 生成报告
    return o.generateReport(results), nil
}
```

### 4.4 Web测试Runner (Playwright)

```python
from playwright.async_api import async_playwright

class WebRunner:
    """Web平台测试Runner"""

    async def run(self, task: TestTask) -> TestResult:
        """运行Web测试"""

        async with async_playwright() as p:
            # 多浏览器测试
            browsers = ['chromium', 'firefox', 'webkit']
            results = {}

            for browser_name in browsers:
                browser = await getattr(p, browser_name).launch()
                page = await browser.new_page()

                try:
                    # 执行测试用例
                    for test_case in task.test_cases:
                        result = await self._run_test_case(page, test_case)
                        results[f"{browser_name}:{test_case.name}"] = result
                finally:
                    await browser.close()

            return TestResult(
                platform='web',
                passed=all(r.passed for r in results.values()),
                details=results
            )

    async def _run_test_case(self, page, test_case: TestCase) -> TestCaseResult:
        """执行单个测试用例"""

        try:
            # 导航到页面
            await page.goto(test_case.url)

            # 执行操作
            for action in test_case.actions:
                await self._execute_action(page, action)

            # 验证断言
            for assertion in test_case.assertions:
                await self._verify_assertion(page, assertion)

            return TestCaseResult(passed=True)

        except Exception as e:
            screenshot = await page.screenshot()
            return TestCaseResult(
                passed=False,
                error=str(e),
                screenshot=screenshot
            )

    async def _execute_action(self, page, action: Action):
        """执行测试动作"""

        if action.type == 'click':
            await page.click(action.selector)
        elif action.type == 'fill':
            await page.fill(action.selector, action.value)
        elif action.type == 'wait':
            await page.wait_for_selector(action.selector)
        elif action.type == 'wait_for_navigation':
            await page.wait_for_navigation()

    async def _verify_assertion(self, page, assertion: Assertion):
        """验证断言"""

        if assertion.type == 'visible':
            element = await page.query_selector(assertion.selector)
            assert element is not None, f"Element {assertion.selector} not visible"
        elif assertion.type == 'text_content':
            text = await page.text_content(assertion.selector)
            assert assertion.expected in text, f"Expected '{assertion.expected}' in '{text}'"
        elif assertion.type == 'url':
            assert assertion.expected in page.url, f"Expected URL to contain {assertion.expected}"
```

---

## 5. 测试指标

### 5.1 覆盖率目标

```yaml
测试覆盖率目标:
  单元测试: >80%
  集成测试: >70%
  E2E测试:  核心流程100%

测试通过标准:
  Web:      Chrome/Firefox/Safari/Edge全部通过
  移动端:   iOS 15+, Android 10+ 通过
  桌面:     Windows 10+, macOS 12+ 通过
```

### 5.2 成本对比

```yaml
单次测试成本:
  Playwright (纯脚本):
    执行时间: 5-30秒
    成本: $0 (本地运行)
    云端CI: ~$0.001/次

  Browser Use:
    执行时间: 30秒-3分钟
    LLM成本: ~$0.05-0.20/次
    包含截图分析: ~$0.10-0.30/次

月度成本估算 (每项目):
  Playwright: ~$5/月
  Browser Use: ~$3/月 (20次关键验收)
  总计: ~$8/项目/月
```

---

## 6. 测试数据模型

```typescript
interface ITestRun {
  _id: ObjectId;
  projectId: ObjectId;
  featureId: string;

  type: 'unit' | 'integration' | 'e2e' | 'acceptance';
  platform: 'web' | 'ios' | 'android' | 'windows' | 'mac';

  status: 'pending' | 'running' | 'passed' | 'failed';

  summary: {
    total: number;
    passed: number;
    failed: number;
    skipped: number;
    duration: number;  // ms
  };

  details: TestCaseResult[];

  screenshots?: string[];  // R2 URLs

  createdAt: Date;
  completedAt?: Date;
}

interface TestCaseResult {
  name: string;
  status: 'passed' | 'failed' | 'skipped';
  duration: number;
  error?: string;
  screenshot?: string;
}

interface IAcceptanceResult {
  _id: ObjectId;
  projectId: ObjectId;
  featureId: string;

  score: number;  // 1-10
  passed: boolean;

  evaluation: {
    functionality: number;
    uiConsistency: number;
    userExperience: number;
    errorHandling: number;
  };

  issues: string[];
  suggestions: string[];
  screenshots: string[];

  acceptedBy: 'ai' | 'user';
  acceptedAt: Date;
}
```

---

## 涉及文件

```yaml
新建:
  - services/py-ai-engine/testing/kevin_tester.py
  - services/py-ai-engine/testing/web_runner.py
  - services/py-ai-engine/testing/acceptance.py
  - services/go-orchestrator/testing/orchestrator.go
  - thinkus-app/src/lib/db/models/test-run.ts
  - thinkus-app/src/lib/db/models/acceptance-result.ts

修改:
  - services/py-ai-engine/employees/kevin.py (集成测试能力)
  - services/py-ai-engine/employees/mike.py (集成验收能力)

配置:
  - Playwright配置
  - Browser Use配置
  - BrowserStack集成 (可选)
```

---

## 验收标准

- [ ] Kevin完整测试流程可运行
- [ ] Playwright E2E测试正常
- [ ] Browser Use UI验收正常
- [ ] 测试报告生成完整
- [ ] 多浏览器测试通过
- [ ] 测试指标达标

---

## 变更记录

| 日期 | 版本 | 变更内容 | 作者 |
|------|------|----------|------|
| 2026-01-17 | v1.0 | 从完整规格文档拆分 | Claude Code |
