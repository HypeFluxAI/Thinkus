# Thinkus 全平台自动化测试方案 - 技术架构文档

> **版本**: v1.0 | **日期**: 2026-01-15
>
> **给AI工程师**: 本文档包含完整实现代码，可直接集成到Thinkus系统

---

## 一、技术架构总览

### 1.1 系统架构图

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                                                                              │
│                           Thinkus 测试系统架构                              │
│                                                                              │
│  ┌─────────────────────────────────────────────────────────────────────┐   │
│  │                    Test Orchestrator (测试编排服务)                  │   │
│  │                                                                      │   │
│  │  ┌────────────┐ ┌────────────┐ ┌────────────┐ ┌────────────┐      │   │
│  │  │TestGenerator│ │TestExecutor│ │ResultAnalyzer│ │AutoFixer │      │   │
│  │  │ 测试生成    │ │ 测试执行   │ │ 结果分析    │ │ 自动修复  │      │   │
│  │  └────────────┘ └────────────┘ └────────────┘ └────────────┘      │   │
│  └───────────────────────────────┬─────────────────────────────────────┘   │
│                                  │                                          │
│                                  │ gRPC/REST                                │
│                                  │                                          │
│  ┌───────────────────────────────┴─────────────────────────────────────┐   │
│  │                     Test Runner Pool (测试执行池)                    │   │
│  │                                                                      │   │
│  │  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐              │   │
│  │  │ WebRunner    │  │ MobileRunner │  │ DesktopRunner│              │   │
│  │  │ (Playwright) │  │ (Maestro/    │  │ (WinAppDriver│              │   │
│  │  │              │  │  Appium)     │  │  /Appium)    │              │   │
│  │  └──────────────┘  └──────────────┘  └──────────────┘              │   │
│  └─────────────────────────────────────────────────────────────────────┘   │
│                                  │                                          │
│  ┌───────────────────────────────┴─────────────────────────────────────┐   │
│  │                    Test Environment (测试环境)                       │   │
│  │                                                                      │   │
│  │  ┌─────────────┐ ┌─────────────┐ ┌─────────────┐ ┌─────────────┐  │   │
│  │  │ Docker      │ │ Android     │ │ iOS Cloud   │ │ Windows/Mac │  │   │
│  │  │ (Playwright)│ │ Emulator    │ │ (MacStadium)│ │ VM          │  │   │
│  │  │             │ │ (Docker)    │ │             │ │             │  │   │
│  │  └─────────────┘ └─────────────┘ └─────────────┘ └─────────────┘  │   │
│  └─────────────────────────────────────────────────────────────────────┘   │
│                                                                              │
└─────────────────────────────────────────────────────────────────────────────┘
```

### 1.2 目录结构

```
src/
├── test-platform/                    # 测试平台核心
│   ├── orchestrator/                # 测试编排
│   │   ├── TestOrchestrator.ts
│   │   ├── TestGenerator.ts
│   │   ├── TestExecutor.ts
│   │   ├── ResultAnalyzer.ts
│   │   └── AutoFixer.ts
│   │
│   ├── runners/                     # 各平台Runner
│   │   ├── WebRunner.ts            # Playwright
│   │   ├── AndroidRunner.ts        # Maestro/Appium
│   │   ├── IOSRunner.ts            # Maestro/Appium
│   │   ├── WindowsRunner.ts        # WinAppDriver
│   │   ├── MacRunner.ts            # Appium
│   │   └── types.ts
│   │
│   ├── generators/                  # 测试脚本生成器
│   │   ├── PlaywrightGenerator.ts
│   │   ├── MaestroGenerator.ts
│   │   ├── AppiumGenerator.ts
│   │   └── WinAppDriverGenerator.ts
│   │
│   ├── environments/                # 测试环境管理
│   │   ├── DockerEnvironment.ts
│   │   ├── CloudEnvironment.ts
│   │   └── VMEnvironment.ts
│   │
│   └── reporters/                   # 测试报告
│       ├── TestReporter.ts
│       └── AllureReporter.ts
│
├── docker/                          # Docker配置
│   ├── playwright/
│   │   └── Dockerfile
│   ├── android/
│   │   └── Dockerfile
│   └── docker-compose.yml
│
└── scripts/                         # 辅助脚本
    ├── setup-android-emulator.sh
    └── setup-ios-cloud.sh
```

---

## 二、类型定义

```typescript
// src/test-platform/types.ts

// 支持的平台
export type Platform = 'web' | 'ios' | 'android' | 'windows' | 'mac' | 'ipad'

// 支持的浏览器
export type Browser = 'chrome' | 'firefox' | 'safari' | 'edge'

// 测试状态
export type TestStatus = 'pending' | 'running' | 'passed' | 'failed' | 'skipped'

// 测试用例
export interface TestCase {
  id: string
  name: string
  description: string
  platform: Platform[]
  category: 'functional' | 'visual' | 'performance' | 'accessibility'
  priority: 'critical' | 'high' | 'medium' | 'low'
  steps: TestStep[]
  expectedResult: string
}

// 测试步骤
export interface TestStep {
  action: 'launch' | 'tap' | 'input' | 'swipe' | 'assert' | 'wait' | 'screenshot'
  target?: string          // 元素选择器或testID
  value?: string           // 输入值或期望值
  timeout?: number         // 超时时间(ms)
}

// 测试结果
export interface TestResult {
  testCaseId: string
  platform: Platform
  device?: string
  browser?: string
  status: TestStatus
  duration: number         // ms
  error?: {
    message: string
    stack?: string
    screenshot?: string    // base64或URL
  }
  steps: StepResult[]
}

// 步骤结果
export interface StepResult {
  stepIndex: number
  status: TestStatus
  duration: number
  screenshot?: string
  error?: string
}

// 测试会话
export interface TestSession {
  id: string
  projectId: string
  platforms: Platform[]
  testCases: TestCase[]
  results: Map<string, TestResult[]>
  status: 'running' | 'completed' | 'failed'
  startTime: Date
  endTime?: Date
  summary: TestSummary
}

// 测试摘要
export interface TestSummary {
  total: number
  passed: number
  failed: number
  skipped: number
  duration: number
  platformResults: Record<Platform, {
    total: number
    passed: number
    failed: number
  }>
}
```

---

## 三、TestOrchestrator 实现

```typescript
// src/test-platform/orchestrator/TestOrchestrator.ts

import Anthropic from '@anthropic-ai/sdk'
import { Platform, TestCase, TestSession, TestResult, TestSummary } from '../types'
import { TestGenerator } from './TestGenerator'
import { TestExecutor } from './TestExecutor'
import { ResultAnalyzer } from './ResultAnalyzer'
import { AutoFixer } from './AutoFixer'

export class TestOrchestrator {
  private generator: TestGenerator
  private executor: TestExecutor
  private analyzer: ResultAnalyzer
  private autoFixer: AutoFixer
  
  constructor(
    private realtimeStream: any,
    private claude: Anthropic
  ) {
    this.generator = new TestGenerator(claude)
    this.executor = new TestExecutor()
    this.analyzer = new ResultAnalyzer(claude)
    this.autoFixer = new AutoFixer(claude)
  }

  /**
   * 运行全平台测试
   */
  async runFullPlatformTest(
    projectId: string,
    requirement: string,
    platforms: Platform[] = ['web', 'ios', 'android', 'windows', 'mac']
  ): Promise<TestSession> {
    // 1. 创建测试会话
    const session: TestSession = {
      id: `test-${Date.now()}`,
      projectId,
      platforms,
      testCases: [],
      results: new Map(),
      status: 'running',
      startTime: new Date(),
      summary: this.createEmptySummary(platforms)
    }

    try {
      // 2. 生成测试用例
      await this.notifyProgress(projectId, 'generating', '正在生成测试用例...')
      session.testCases = await this.generator.generateTestCases(requirement)
      
      // 3. 并行执行各平台测试
      await this.notifyProgress(projectId, 'executing', '正在执行测试...')
      const platformPromises = platforms.map(platform => 
        this.runPlatformTests(session, platform)
      )
      await Promise.all(platformPromises)

      // 4. 分析结果
      await this.notifyProgress(projectId, 'analyzing', '正在分析测试结果...')
      const analysis = await this.analyzer.analyze(session)

      // 5. 如果有失败，尝试自动修复
      if (analysis.failedTests.length > 0) {
        await this.notifyProgress(projectId, 'fixing', '正在尝试自动修复...')
        const fixes = await this.autoFixer.generateFixes(analysis)
        
        await this.realtimeStream.emit(projectId, {
          type: 'test_fix_suggestions',
          data: fixes
        })
      }

      session.status = 'completed'
      session.endTime = new Date()
      session.summary = this.calculateSummary(session)

      return session

    } catch (error) {
      session.status = 'failed'
      session.endTime = new Date()
      throw error
    }
  }

  private async runPlatformTests(session: TestSession, platform: Platform): Promise<void> {
    const platformTests = session.testCases.filter(tc => tc.platform.includes(platform))

    for (const testCase of platformTests) {
      const result = await this.executor.execute(testCase, platform)
      
      const existing = session.results.get(testCase.id) || []
      existing.push(result)
      session.results.set(testCase.id, existing)

      await this.realtimeStream.emit(session.projectId, {
        type: 'test_result',
        data: { testCaseId: testCase.id, platform, result }
      })
    }
  }

  private async notifyProgress(projectId: string, stage: string, message: string): Promise<void> {
    await this.realtimeStream.emit(projectId, {
      type: 'test_progress',
      data: { stage, message }
    })
  }

  private createEmptySummary(platforms: Platform[]): TestSummary {
    const platformResults: Record<Platform, any> = {} as any
    platforms.forEach(p => {
      platformResults[p] = { total: 0, passed: 0, failed: 0 }
    })
    return { total: 0, passed: 0, failed: 0, skipped: 0, duration: 0, platformResults }
  }

  private calculateSummary(session: TestSession): TestSummary {
    const summary = this.createEmptySummary(session.platforms)
    
    session.results.forEach((results) => {
      results.forEach(result => {
        summary.total++
        summary.platformResults[result.platform].total++
        
        if (result.status === 'passed') {
          summary.passed++
          summary.platformResults[result.platform].passed++
        } else if (result.status === 'failed') {
          summary.failed++
          summary.platformResults[result.platform].failed++
        } else {
          summary.skipped++
        }
        
        summary.duration += result.duration
      })
    })
    
    return summary
  }
}
```

---

## 四、TestGenerator 实现

```typescript
// src/test-platform/orchestrator/TestGenerator.ts

import Anthropic from '@anthropic-ai/sdk'
import { TestCase, TestStep, Platform } from '../types'

export class TestGenerator {
  constructor(private claude: Anthropic) {}

  /**
   * 根据需求生成测试用例
   */
  async generateTestCases(requirement: string): Promise<TestCase[]> {
    const response = await this.claude.messages.create({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 4000,
      system: `你是测试专家，根据需求生成全面的测试用例。
输出JSON数组格式，每个测试用例包含:
- id: 唯一标识
- name: 测试名称
- description: 描述
- platform: 适用平台数组 ["web", "ios", "android", "windows", "mac"]
- category: functional/visual/performance/accessibility
- priority: critical/high/medium/low
- steps: 测试步骤数组
- expectedResult: 期望结果

测试步骤action类型: launch/tap/input/swipe/assert/wait/screenshot

确保覆盖: 正向流程、边界条件、异常情况、跨平台一致性`,
      messages: [{
        role: 'user',
        content: `请为以下需求生成测试用例:\n\n${requirement}\n\n只返回JSON数组。`
      }]
    })

    const text = response.content[0].type === 'text' ? response.content[0].text : '[]'
    
    try {
      const jsonMatch = text.match(/\[[\s\S]*\]/)
      return jsonMatch ? JSON.parse(jsonMatch[0]) : []
    } catch {
      return []
    }
  }

  /**
   * 生成Playwright测试脚本
   */
  generatePlaywrightScript(testCase: TestCase): string {
    const steps = testCase.steps.map(step => this.stepToPlaywright(step)).join('\n  ')
    
    return `
import { test, expect } from '@playwright/test';

test('${testCase.name}', async ({ page }) => {
  ${steps}
});
`
  }

  /**
   * 生成Maestro测试脚本 (YAML)
   */
  generateMaestroScript(testCase: TestCase, appId: string): string {
    const steps = testCase.steps.map(step => this.stepToMaestro(step)).join('\n')
    
    return `appId: ${appId}
---
${steps}
`
  }

  private stepToPlaywright(step: TestStep): string {
    switch (step.action) {
      case 'launch':
        return `await page.goto('${step.value || '/'}');`
      case 'tap':
        return `await page.click('${step.target}');`
      case 'input':
        return `await page.fill('${step.target}', '${step.value}');`
      case 'assert':
        if (step.value) {
          return `await expect(page.locator('${step.target}')).toHaveText('${step.value}');`
        }
        return `await expect(page.locator('${step.target}')).toBeVisible();`
      case 'wait':
        return `await page.waitForTimeout(${step.value || 1000});`
      case 'screenshot':
        return `await page.screenshot({ path: 'screenshot-${Date.now()}.png' });`
      default:
        return `// Unknown action: ${step.action}`
    }
  }

  private stepToMaestro(step: TestStep): string {
    switch (step.action) {
      case 'launch':
        return '- launchApp'
      case 'tap':
        if (step.target?.startsWith('#')) {
          return `- tapOn:\n    id: "${step.target.substring(1)}"`
        }
        return `- tapOn: "${step.target}"`
      case 'input':
        return `- inputText:\n    id: "${step.target}"\n    text: "${step.value}"`
      case 'assert':
        return `- assertVisible: "${step.value || step.target}"`
      case 'wait':
        return `- wait:\n    seconds: ${(step.value ? parseInt(step.value) : 1000) / 1000}`
      case 'screenshot':
        return '- screenshot'
      case 'swipe':
        return `- swipe:\n    direction: ${step.value || 'up'}`
      default:
        return `# Unknown action: ${step.action}`
    }
  }
}
```

---

## 五、WebRunner 实现 (Playwright)

```typescript
// src/test-platform/runners/WebRunner.ts

import { chromium, firefox, webkit, Browser, Page } from 'playwright'
import { TestCase, TestResult, TestStep, StepResult, Browser as BrowserType } from '../types'

export class WebRunner {
  private browsers: Map<BrowserType, Browser> = new Map()

  async initialize(browserTypes: BrowserType[] = ['chrome', 'firefox', 'safari']): Promise<void> {
    for (const type of browserTypes) {
      const browser = await this.launchBrowser(type)
      this.browsers.set(type, browser)
    }
  }

  private async launchBrowser(type: BrowserType): Promise<Browser> {
    const options = { headless: true }
    switch (type) {
      case 'chrome': return chromium.launch(options)
      case 'firefox': return firefox.launch(options)
      case 'safari': return webkit.launch(options)
      case 'edge': return chromium.launch({ ...options, channel: 'msedge' })
      default: return chromium.launch(options)
    }
  }

  async execute(testCase: TestCase, browserType: BrowserType, baseUrl: string): Promise<TestResult> {
    const startTime = Date.now()
    const stepResults: StepResult[] = []
    let error: TestResult['error']

    const browser = this.browsers.get(browserType)
    if (!browser) {
      return {
        testCaseId: testCase.id,
        platform: 'web',
        browser: browserType,
        status: 'failed',
        duration: 0,
        steps: [],
        error: { message: 'Browser not initialized' }
      }
    }

    const context = await browser.newContext()
    const page = await context.newPage()

    try {
      for (let i = 0; i < testCase.steps.length; i++) {
        const step = testCase.steps[i]
        const stepStart = Date.now()
        
        try {
          await this.executeStep(page, step, baseUrl)
          stepResults.push({ stepIndex: i, status: 'passed', duration: Date.now() - stepStart })
        } catch (e: any) {
          const screenshot = await page.screenshot({ encoding: 'base64' })
          stepResults.push({
            stepIndex: i,
            status: 'failed',
            duration: Date.now() - stepStart,
            error: e.message,
            screenshot
          })
          error = { message: e.message, stack: e.stack, screenshot }
          break
        }
      }
    } finally {
      await context.close()
    }

    const allPassed = stepResults.every(s => s.status === 'passed')

    return {
      testCaseId: testCase.id,
      platform: 'web',
      browser: browserType,
      status: allPassed ? 'passed' : 'failed',
      duration: Date.now() - startTime,
      steps: stepResults,
      error
    }
  }

  private async executeStep(page: Page, step: TestStep, baseUrl: string): Promise<void> {
    const timeout = step.timeout || 10000

    switch (step.action) {
      case 'launch':
        await page.goto(baseUrl + (step.value || '/'), { timeout })
        break
      case 'tap':
        await page.click(step.target!, { timeout })
        break
      case 'input':
        await page.fill(step.target!, step.value || '', { timeout })
        break
      case 'assert':
        if (step.value) {
          await page.locator(step.target!).waitFor({ state: 'visible', timeout })
          const text = await page.locator(step.target!).textContent()
          if (!text?.includes(step.value)) {
            throw new Error(`Expected "${step.value}" but got "${text}"`)
          }
        } else {
          await page.locator(step.target!).waitFor({ state: 'visible', timeout })
        }
        break
      case 'wait':
        await page.waitForTimeout(parseInt(step.value || '1000'))
        break
      case 'screenshot':
        await page.screenshot({ path: `screenshot-${Date.now()}.png` })
        break
    }
  }

  async cleanup(): Promise<void> {
    for (const browser of this.browsers.values()) {
      await browser.close()
    }
    this.browsers.clear()
  }
}
```

---

## 六、AndroidRunner 实现 (Maestro)

```typescript
// src/test-platform/runners/AndroidRunner.ts

import { exec } from 'child_process'
import { promisify } from 'util'
import * as fs from 'fs/promises'
import * as path from 'path'
import { TestCase, TestResult } from '../types'
import { TestGenerator } from '../orchestrator/TestGenerator'

const execAsync = promisify(exec)

export class AndroidRunner {
  private generator: TestGenerator
  private tempDir = '/tmp/maestro-tests'

  constructor(generator: TestGenerator) {
    this.generator = generator
  }

  async initialize(): Promise<void> {
    await fs.mkdir(this.tempDir, { recursive: true })
    
    // 检查Maestro是否安装
    try {
      await execAsync('maestro --version')
    } catch {
      throw new Error('Maestro not installed')
    }

    // 检查Android模拟器
    try {
      const { stdout } = await execAsync('adb devices')
      if (!stdout.includes('emulator') && !stdout.includes('device')) {
        throw new Error('No Android device/emulator connected')
      }
    } catch {
      throw new Error('ADB not available')
    }
  }

  async execute(testCase: TestCase, appId: string, device?: string): Promise<TestResult> {
    const startTime = Date.now()
    
    const script = this.generator.generateMaestroScript(testCase, appId)
    const scriptPath = path.join(this.tempDir, `${testCase.id}.yaml`)
    await fs.writeFile(scriptPath, script)

    try {
      const { stdout, stderr } = await execAsync(
        `maestro test ${scriptPath} --format json`,
        { timeout: 120000 }
      )

      const passed = !stderr && stdout.includes('PASSED')
      
      return {
        testCaseId: testCase.id,
        platform: 'android',
        device: device || 'emulator',
        status: passed ? 'passed' : 'failed',
        duration: Date.now() - startTime,
        steps: [],
        error: passed ? undefined : { message: stderr || 'Test failed' }
      }
    } catch (e: any) {
      return {
        testCaseId: testCase.id,
        platform: 'android',
        device: device || 'emulator',
        status: 'failed',
        duration: Date.now() - startTime,
        steps: [],
        error: { message: e.message }
      }
    }
  }

  /**
   * 在Docker容器中执行测试
   */
  async executeInDocker(testCase: TestCase, appId: string, apkPath: string): Promise<TestResult> {
    const script = this.generator.generateMaestroScript(testCase, appId)
    const scriptPath = path.join(this.tempDir, `${testCase.id}.yaml`)
    await fs.writeFile(scriptPath, script)

    const startTime = Date.now()

    try {
      const dockerCmd = `
        docker run --rm --privileged \
          -v ${this.tempDir}:/tests \
          -v ${apkPath}:/app.apk \
          amrka/ultimate-android:latest \
          bash -c "start_emu_headless.sh && sleep 30 && adb install /app.apk && maestro test /tests/${testCase.id}.yaml"
      `
      
      const { stdout, stderr } = await execAsync(dockerCmd, { timeout: 300000 })
      const passed = stdout.includes('PASSED')

      return {
        testCaseId: testCase.id,
        platform: 'android',
        device: 'docker-emulator',
        status: passed ? 'passed' : 'failed',
        duration: Date.now() - startTime,
        steps: [],
        error: passed ? undefined : { message: stderr }
      }
    } catch (e: any) {
      return {
        testCaseId: testCase.id,
        platform: 'android',
        device: 'docker-emulator',
        status: 'failed',
        duration: Date.now() - startTime,
        steps: [],
        error: { message: e.message }
      }
    }
  }

  async cleanup(): Promise<void> {
    await fs.rm(this.tempDir, { recursive: true, force: true })
  }
}
```

---

## 七、WindowsRunner 实现 (WinAppDriver)

```typescript
// src/test-platform/runners/WindowsRunner.ts

import { Builder, WebDriver, By } from 'selenium-webdriver'
import { TestCase, TestResult, TestStep, StepResult } from '../types'

export class WindowsRunner {
  private driver?: WebDriver
  private winAppDriverUrl = 'http://127.0.0.1:4723'

  async initialize(appPath: string): Promise<void> {
    const capabilities = {
      app: appPath,
      platformName: 'Windows',
      deviceName: 'WindowsPC'
    }

    this.driver = await new Builder()
      .usingServer(this.winAppDriverUrl)
      .withCapabilities(capabilities)
      .build()
  }

  async execute(testCase: TestCase): Promise<TestResult> {
    if (!this.driver) {
      return {
        testCaseId: testCase.id,
        platform: 'windows',
        status: 'failed',
        duration: 0,
        steps: [],
        error: { message: 'Driver not initialized' }
      }
    }

    const startTime = Date.now()
    const stepResults: StepResult[] = []
    let error: TestResult['error']

    try {
      for (let i = 0; i < testCase.steps.length; i++) {
        const step = testCase.steps[i]
        const stepStart = Date.now()

        try {
          await this.executeStep(step)
          stepResults.push({ stepIndex: i, status: 'passed', duration: Date.now() - stepStart })
        } catch (e: any) {
          stepResults.push({ stepIndex: i, status: 'failed', duration: Date.now() - stepStart, error: e.message })
          error = { message: e.message }
          break
        }
      }
    } catch (e: any) {
      error = { message: e.message }
    }

    const allPassed = stepResults.every(s => s.status === 'passed')

    return {
      testCaseId: testCase.id,
      platform: 'windows',
      status: allPassed ? 'passed' : 'failed',
      duration: Date.now() - startTime,
      steps: stepResults,
      error
    }
  }

  private async executeStep(step: TestStep): Promise<void> {
    if (!this.driver) throw new Error('Driver not initialized')

    switch (step.action) {
      case 'tap':
        const element = await this.driver.findElement(this.parseLocator(step.target!))
        await element.click()
        break
      case 'input':
        const inputEl = await this.driver.findElement(this.parseLocator(step.target!))
        await inputEl.clear()
        await inputEl.sendKeys(step.value || '')
        break
      case 'assert':
        const assertEl = await this.driver.findElement(this.parseLocator(step.target!))
        const text = await assertEl.getText()
        if (step.value && !text.includes(step.value)) {
          throw new Error(`Expected "${step.value}" but got "${text}"`)
        }
        break
      case 'wait':
        await this.driver.sleep(parseInt(step.value || '1000'))
        break
    }
  }

  private parseLocator(target: string): By {
    if (target.startsWith('#')) return By.id(target.substring(1))
    if (target.startsWith('.')) return By.className(target.substring(1))
    if (target.startsWith('//')) return By.xpath(target)
    return By.name(target)
  }

  async cleanup(): Promise<void> {
    if (this.driver) await this.driver.quit()
  }
}
```

---

## 八、ResultAnalyzer 和 AutoFixer

```typescript
// src/test-platform/orchestrator/ResultAnalyzer.ts

import Anthropic from '@anthropic-ai/sdk'
import { TestSession, Platform } from '../types'

export interface AnalysisResult {
  failedTests: FailedTestAnalysis[]
  patterns: FailurePattern[]
  recommendations: string[]
}

export interface FailedTestAnalysis {
  testCaseId: string
  testCaseName: string
  platform: Platform
  failureReason: string
  rootCause: string
  suggestedFix: string
}

export interface FailurePattern {
  pattern: string
  count: number
  affectedPlatforms: Platform[]
  commonFix: string
}

export class ResultAnalyzer {
  constructor(private claude: Anthropic) {}

  async analyze(session: TestSession): Promise<AnalysisResult> {
    const failedTests: FailedTestAnalysis[] = []
    
    session.results.forEach((results, testCaseId) => {
      const testCase = session.testCases.find(tc => tc.id === testCaseId)
      
      results.filter(r => r.status === 'failed').forEach(result => {
        failedTests.push({
          testCaseId,
          testCaseName: testCase?.name || '',
          platform: result.platform,
          failureReason: result.error?.message || 'Unknown',
          rootCause: '',
          suggestedFix: ''
        })
      })
    })

    if (failedTests.length === 0) {
      return { failedTests: [], patterns: [], recommendations: ['所有测试通过！'] }
    }

    return this.aiAnalyzeFailures(failedTests)
  }

  private async aiAnalyzeFailures(failedTests: FailedTestAnalysis[]): Promise<AnalysisResult> {
    const response = await this.claude.messages.create({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 2000,
      system: `你是测试分析专家，分析测试失败原因并提供修复建议。返回JSON格式。`,
      messages: [{
        role: 'user',
        content: `分析以下测试失败:\n${JSON.stringify(failedTests, null, 2)}`
      }]
    })

    const text = response.content[0].type === 'text' ? response.content[0].text : '{}'
    
    try {
      const jsonMatch = text.match(/\{[\s\S]*\}/)
      const parsed = jsonMatch ? JSON.parse(jsonMatch[0]) : {}
      
      const enrichedFailedTests = failedTests.map(ft => {
        const aiResult = parsed.failedTests?.find((at: any) => at.testCaseId === ft.testCaseId)
        return {
          ...ft,
          rootCause: aiResult?.rootCause || ft.failureReason,
          suggestedFix: aiResult?.suggestedFix || ''
        }
      })

      return {
        failedTests: enrichedFailedTests,
        patterns: parsed.patterns || [],
        recommendations: parsed.recommendations || []
      }
    } catch {
      return { failedTests, patterns: [], recommendations: ['无法分析失败原因'] }
    }
  }
}
```

```typescript
// src/test-platform/orchestrator/AutoFixer.ts

import Anthropic from '@anthropic-ai/sdk'
import { AnalysisResult, FailedTestAnalysis, FailurePattern } from './ResultAnalyzer'

export interface FixSuggestion {
  id: string
  type: 'code' | 'config' | 'test'
  description: string
  files: { path: string; changes: { original: string; fixed: string } }[]
  autoApplicable: boolean
  priority: 'high' | 'medium' | 'low'
}

export class AutoFixer {
  constructor(private claude: Anthropic) {}

  async generateFixes(analysis: AnalysisResult): Promise<FixSuggestion[]> {
    const fixes: FixSuggestion[] = []

    for (const pattern of analysis.patterns) {
      const fix = await this.generatePatternFix(pattern)
      if (fix) fixes.push(fix)
    }

    for (const failedTest of analysis.failedTests) {
      const existingFix = fixes.find(f => f.description.includes(failedTest.rootCause))
      if (!existingFix) {
        const fix = await this.generateSingleFix(failedTest)
        if (fix) fixes.push(fix)
      }
    }

    return fixes
  }

  private async generatePatternFix(pattern: FailurePattern): Promise<FixSuggestion | null> {
    const response = await this.claude.messages.create({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 1500,
      messages: [{
        role: 'user',
        content: `修复以下问题模式: ${pattern.pattern}\n返回JSON格式的修复方案。`
      }]
    })

    try {
      const text = response.content[0].type === 'text' ? response.content[0].text : '{}'
      const jsonMatch = text.match(/\{[\s\S]*\}/)
      const parsed = jsonMatch ? JSON.parse(jsonMatch[0]) : null
      return parsed ? { id: `fix-pattern-${Date.now()}`, ...parsed } : null
    } catch {
      return null
    }
  }

  private async generateSingleFix(failedTest: FailedTestAnalysis): Promise<FixSuggestion | null> {
    const response = await this.claude.messages.create({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 1000,
      messages: [{
        role: 'user',
        content: `修复测试失败: ${failedTest.testCaseName}\n原因: ${failedTest.rootCause}\n返回JSON格式的修复方案。`
      }]
    })

    try {
      const text = response.content[0].type === 'text' ? response.content[0].text : '{}'
      const jsonMatch = text.match(/\{[\s\S]*\}/)
      const parsed = jsonMatch ? JSON.parse(jsonMatch[0]) : null
      return parsed ? { id: `fix-single-${failedTest.testCaseId}-${Date.now()}`, ...parsed } : null
    } catch {
      return null
    }
  }
}
```

---

## 九、Docker配置

### 9.1 Playwright Dockerfile

```dockerfile
# docker/playwright/Dockerfile
FROM mcr.microsoft.com/playwright:v1.40.0-focal
WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY . .
CMD ["npx", "playwright", "test"]
```

### 9.2 Android Dockerfile

```dockerfile
# docker/android/Dockerfile
FROM openjdk:17-slim

RUN apt-get update && apt-get install -y wget unzip curl qemu-kvm xvfb && rm -rf /var/lib/apt/lists/*

ENV ANDROID_SDK_ROOT=/opt/android-sdk
ENV PATH=$PATH:$ANDROID_SDK_ROOT/cmdline-tools/latest/bin:$ANDROID_SDK_ROOT/platform-tools:$ANDROID_SDK_ROOT/emulator

RUN mkdir -p $ANDROID_SDK_ROOT/cmdline-tools && \
    wget -q https://dl.google.com/android/repository/commandlinetools-linux-9477386_latest.zip && \
    unzip commandlinetools-linux-*.zip -d $ANDROID_SDK_ROOT/cmdline-tools && \
    mv $ANDROID_SDK_ROOT/cmdline-tools/cmdline-tools $ANDROID_SDK_ROOT/cmdline-tools/latest && \
    rm commandlinetools-linux-*.zip

RUN yes | sdkmanager --licenses && \
    sdkmanager "platform-tools" "emulator" "platforms;android-33" "system-images;android-33;google_apis;x86_64"

RUN echo "no" | avdmanager create avd -n test -k "system-images;android-33;google_apis;x86_64" --force

RUN curl -Ls "https://get.maestro.dev" | bash
ENV PATH=$PATH:/root/.maestro/bin

EXPOSE 5555 4723
```

### 9.3 Docker Compose

```yaml
# docker/docker-compose.yml
version: '3.8'

services:
  web-tests:
    build: ./playwright
    volumes:
      - ../test-results:/app/test-results
    environment:
      - BASE_URL=${BASE_URL:-http://host.docker.internal:3000}

  android-tests:
    build: ./android
    privileged: true
    devices:
      - /dev/kvm
    ports:
      - "5555:5555"
      - "4723:4723"
    volumes:
      - ../test-results:/test-results
```

---

## 十、开发清单

### 10.1 文件创建清单

```
src/test-platform/
├── orchestrator/
│   ├── TestOrchestrator.ts
│   ├── TestGenerator.ts
│   ├── TestExecutor.ts
│   ├── ResultAnalyzer.ts
│   └── AutoFixer.ts
├── runners/
│   ├── WebRunner.ts
│   ├── AndroidRunner.ts
│   ├── IOSRunner.ts
│   ├── WindowsRunner.ts
│   └── MacRunner.ts
└── types.ts

docker/
├── playwright/Dockerfile
├── android/Dockerfile
└── docker-compose.yml
```

### 10.2 开发顺序

```
Phase 1: 核心框架 (1周)
  - TestOrchestrator + TestGenerator
  - WebRunner (Playwright)
  - ResultAnalyzer + AutoFixer

Phase 2: 移动端支持 (1周)
  - AndroidRunner + Docker配置
  - IOSRunner + 云服务集成

Phase 3: 桌面端支持 (1周)
  - WindowsRunner
  - MacRunner
  - CI/CD配置
```

### 10.3 关键依赖

```json
{
  "dependencies": {
    "playwright": "^1.40.0",
    "selenium-webdriver": "^4.15.0",
    "@anthropic-ai/sdk": "^0.9.0"
  }
}
```

---

**配套文档**: [全平台自动化测试PRD](./13-FULLPLATFORM-TEST-PRD.md)
