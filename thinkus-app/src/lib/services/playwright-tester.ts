/**
 * Playwright 真实 E2E 测试服务
 * 使用真实浏览器执行自动化测试
 */

import { chromium, firefox, webkit, Browser, Page, BrowserContext } from 'playwright'
import path from 'path'
import { promises as fs } from 'fs'

// 测试结果状态
export type TestStatus = 'passed' | 'failed' | 'skipped' | 'timeout'

// 浏览器类型
export type BrowserType = 'chromium' | 'firefox' | 'webkit'

// 设备类型
export type DeviceType = 'desktop' | 'mobile' | 'tablet'

// 单个测试结果
export interface TestResult {
  name: string
  status: TestStatus
  duration: number
  error?: string
  screenshot?: string  // 截图路径
  video?: string       // 视频路径
  logs?: string[]
}

// 测试套件结果
export interface TestSuiteResult {
  name: string
  browser: BrowserType
  device?: string
  total: number
  passed: number
  failed: number
  skipped: number
  duration: number
  tests: TestResult[]
  startedAt: Date
  completedAt: Date
}

// 完整测试报告
export interface E2ETestReport {
  projectName: string
  baseUrl: string
  totalTests: number
  totalPassed: number
  totalFailed: number
  totalSkipped: number
  passRate: number
  totalDuration: number
  suites: TestSuiteResult[]
  screenshots: Array<{ name: string; path: string; status: TestStatus }>
  videos: Array<{ name: string; path: string }>
  startedAt: Date
  completedAt: Date
}

// 测试配置
export interface E2ETestConfig {
  baseUrl: string
  browsers?: BrowserType[]
  devices?: DeviceType[]
  headless?: boolean
  timeout?: number
  screenshotOnFailure?: boolean
  videoRecord?: boolean
  outputDir?: string
  viewport?: { width: number; height: number }
}

// 测试场景定义
export interface TestScenario {
  name: string
  nameZh: string
  description?: string
  steps: TestStep[]
  critical?: boolean  // 关键测试，失败会阻断
}

// 测试步骤
export interface TestStep {
  action: 'navigate' | 'click' | 'fill' | 'wait' | 'assert' | 'screenshot' | 'scroll' | 'hover' | 'select'
  selector?: string
  value?: string
  timeout?: number
  assertion?: {
    type: 'visible' | 'hidden' | 'text' | 'url' | 'title' | 'count' | 'attribute'
    expected?: string | number
    attribute?: string
  }
}

// 进度回调
export type TestProgressCallback = (event: {
  stage: 'starting' | 'running' | 'completed' | 'failed'
  currentTest?: string
  progress: number
  message: string
  messageZh: string
}) => void

// 预定义设备配置
const DEVICE_CONFIGS: Record<DeviceType, { viewport: { width: number; height: number }; userAgent?: string; isMobile?: boolean }> = {
  desktop: {
    viewport: { width: 1920, height: 1080 },
  },
  mobile: {
    viewport: { width: 375, height: 812 },
    isMobile: true,
    userAgent: 'Mozilla/5.0 (iPhone; CPU iPhone OS 15_0 like Mac OS X) AppleWebKit/605.1.15',
  },
  tablet: {
    viewport: { width: 768, height: 1024 },
    isMobile: true,
    userAgent: 'Mozilla/5.0 (iPad; CPU OS 15_0 like Mac OS X) AppleWebKit/605.1.15',
  },
}

// 默认测试场景（适用于大多数Web应用）
export const DEFAULT_TEST_SCENARIOS: TestScenario[] = [
  {
    name: 'Homepage Load',
    nameZh: '首页加载',
    description: 'Verify homepage loads correctly',
    critical: true,
    steps: [
      { action: 'navigate', value: '/' },
      { action: 'wait', timeout: 5000 },
      { action: 'assert', assertion: { type: 'visible', expected: 'body' }, selector: 'body' },
      { action: 'screenshot' },
    ],
  },
  {
    name: 'Page Title Check',
    nameZh: '页面标题检查',
    steps: [
      { action: 'navigate', value: '/' },
      { action: 'assert', assertion: { type: 'title' } },
    ],
  },
  {
    name: 'Navigation Links',
    nameZh: '导航链接',
    steps: [
      { action: 'navigate', value: '/' },
      { action: 'assert', selector: 'nav, header, [role="navigation"]', assertion: { type: 'visible' } },
    ],
  },
  {
    name: 'Responsive Design',
    nameZh: '响应式设计',
    steps: [
      { action: 'navigate', value: '/' },
      { action: 'wait', timeout: 2000 },
      { action: 'screenshot' },
    ],
  },
  {
    name: 'No Console Errors',
    nameZh: '无控制台错误',
    description: 'Check for JavaScript errors in console',
    steps: [
      { action: 'navigate', value: '/' },
      { action: 'wait', timeout: 3000 },
    ],
  },
]

// 电商网站测试场景
export const ECOMMERCE_TEST_SCENARIOS: TestScenario[] = [
  ...DEFAULT_TEST_SCENARIOS,
  {
    name: 'Product Listing',
    nameZh: '商品列表',
    steps: [
      { action: 'navigate', value: '/products' },
      { action: 'wait', timeout: 5000 },
      { action: 'assert', selector: '[data-testid="product-card"], .product-card, .product-item', assertion: { type: 'count', expected: 1 } },
      { action: 'screenshot' },
    ],
  },
  {
    name: 'Add to Cart',
    nameZh: '加入购物车',
    steps: [
      { action: 'navigate', value: '/products' },
      { action: 'wait', timeout: 3000 },
      { action: 'click', selector: '[data-testid="add-to-cart"], .add-to-cart, button:has-text("加入购物车")' },
      { action: 'wait', timeout: 2000 },
      { action: 'screenshot' },
    ],
  },
  {
    name: 'Search Function',
    nameZh: '搜索功能',
    steps: [
      { action: 'navigate', value: '/' },
      { action: 'fill', selector: 'input[type="search"], [data-testid="search"], .search-input', value: 'test' },
      { action: 'wait', timeout: 2000 },
      { action: 'screenshot' },
    ],
  },
]

/**
 * Playwright 测试服务
 */
export class PlaywrightTesterService {
  private config: E2ETestConfig
  private outputDir: string
  private consoleErrors: string[] = []

  constructor(config: E2ETestConfig) {
    this.config = {
      browsers: ['chromium'],
      devices: ['desktop'],
      headless: true,
      timeout: 30000,
      screenshotOnFailure: true,
      videoRecord: false,
      ...config,
    }
    this.outputDir = config.outputDir || path.join(process.cwd(), 'test-results', 'e2e')
  }

  /**
   * 运行完整E2E测试
   */
  async runTests(
    scenarios: TestScenario[],
    onProgress?: TestProgressCallback
  ): Promise<E2ETestReport> {
    const startedAt = new Date()
    const suites: TestSuiteResult[] = []
    const screenshots: E2ETestReport['screenshots'] = []
    const videos: E2ETestReport['videos'] = []

    // 确保输出目录存在
    await this.ensureOutputDir()

    const totalTests = scenarios.length * (this.config.browsers?.length || 1) * (this.config.devices?.length || 1)
    let completedTests = 0

    onProgress?.({
      stage: 'starting',
      progress: 0,
      message: `Starting E2E tests (${totalTests} tests)`,
      messageZh: `开始 E2E 测试（共 ${totalTests} 个测试）`,
    })

    // 遍历浏览器
    for (const browserType of this.config.browsers || ['chromium']) {
      const browser = await this.launchBrowser(browserType)

      try {
        // 遍历设备类型
        for (const deviceType of this.config.devices || ['desktop']) {
          const suiteStartedAt = new Date()
          const tests: TestResult[] = []
          const deviceConfig = DEVICE_CONFIGS[deviceType]

          // 创建上下文
          const context = await browser.newContext({
            viewport: deviceConfig.viewport,
            userAgent: deviceConfig.userAgent,
            isMobile: deviceConfig.isMobile,
            recordVideo: this.config.videoRecord ? { dir: this.outputDir } : undefined,
          })

          const page = await context.newPage()

          // 监听控制台错误
          this.consoleErrors = []
          page.on('console', msg => {
            if (msg.type() === 'error') {
              this.consoleErrors.push(msg.text())
            }
          })

          // 遍历测试场景
          for (const scenario of scenarios) {
            completedTests++
            const progress = Math.round((completedTests / totalTests) * 100)

            onProgress?.({
              stage: 'running',
              currentTest: scenario.nameZh,
              progress,
              message: `Running: ${scenario.name}`,
              messageZh: `正在测试: ${scenario.nameZh}`,
            })

            const testResult = await this.runScenario(page, scenario, browserType, deviceType)
            tests.push(testResult)

            // 收集截图
            if (testResult.screenshot) {
              screenshots.push({
                name: `${scenario.name}-${browserType}-${deviceType}`,
                path: testResult.screenshot,
                status: testResult.status,
              })
            }
          }

          // 关闭上下文
          await context.close()

          // 构建测试套件结果
          const suiteResult: TestSuiteResult = {
            name: `${browserType}-${deviceType}`,
            browser: browserType,
            device: deviceType,
            total: tests.length,
            passed: tests.filter(t => t.status === 'passed').length,
            failed: tests.filter(t => t.status === 'failed').length,
            skipped: tests.filter(t => t.status === 'skipped').length,
            duration: tests.reduce((sum, t) => sum + t.duration, 0),
            tests,
            startedAt: suiteStartedAt,
            completedAt: new Date(),
          }
          suites.push(suiteResult)
        }
      } finally {
        await browser.close()
      }
    }

    const completedAt = new Date()

    // 构建最终报告
    const report: E2ETestReport = {
      projectName: new URL(this.config.baseUrl).hostname,
      baseUrl: this.config.baseUrl,
      totalTests: suites.reduce((sum, s) => sum + s.total, 0),
      totalPassed: suites.reduce((sum, s) => sum + s.passed, 0),
      totalFailed: suites.reduce((sum, s) => sum + s.failed, 0),
      totalSkipped: suites.reduce((sum, s) => sum + s.skipped, 0),
      passRate: 0,
      totalDuration: completedAt.getTime() - startedAt.getTime(),
      suites,
      screenshots,
      videos,
      startedAt,
      completedAt,
    }

    report.passRate = report.totalTests > 0
      ? Math.round((report.totalPassed / report.totalTests) * 100)
      : 0

    onProgress?.({
      stage: report.totalFailed > 0 ? 'failed' : 'completed',
      progress: 100,
      message: `Tests completed: ${report.totalPassed}/${report.totalTests} passed`,
      messageZh: `测试完成: ${report.totalPassed}/${report.totalTests} 通过`,
    })

    // 保存报告
    await this.saveReport(report)

    return report
  }

  /**
   * 运行单个测试场景
   */
  private async runScenario(
    page: Page,
    scenario: TestScenario,
    browser: BrowserType,
    device: string
  ): Promise<TestResult> {
    const startTime = Date.now()
    const logs: string[] = []
    let screenshot: string | undefined

    try {
      for (const step of scenario.steps) {
        await this.executeStep(page, step, logs)
      }

      // 检查控制台错误
      if (scenario.name === 'No Console Errors' && this.consoleErrors.length > 0) {
        throw new Error(`Console errors found: ${this.consoleErrors.join(', ')}`)
      }

      return {
        name: scenario.name,
        status: 'passed',
        duration: Date.now() - startTime,
        logs,
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error)
      logs.push(`Error: ${errorMessage}`)

      // 失败时截图
      if (this.config.screenshotOnFailure) {
        try {
          const screenshotPath = path.join(
            this.outputDir,
            `failure-${scenario.name.replace(/\s+/g, '-')}-${browser}-${device}-${Date.now()}.png`
          )
          await page.screenshot({ path: screenshotPath, fullPage: true })
          screenshot = screenshotPath
        } catch {
          logs.push('Failed to capture screenshot')
        }
      }

      return {
        name: scenario.name,
        status: 'failed',
        duration: Date.now() - startTime,
        error: errorMessage,
        screenshot,
        logs,
      }
    }
  }

  /**
   * 执行单个测试步骤
   */
  private async executeStep(page: Page, step: TestStep, logs: string[]): Promise<void> {
    const timeout = step.timeout || this.config.timeout || 30000

    switch (step.action) {
      case 'navigate':
        logs.push(`Navigating to ${step.value}`)
        await page.goto(new URL(step.value || '/', this.config.baseUrl).toString(), { timeout })
        break

      case 'click':
        if (step.selector) {
          logs.push(`Clicking ${step.selector}`)
          await page.click(step.selector, { timeout })
        }
        break

      case 'fill':
        if (step.selector && step.value) {
          logs.push(`Filling ${step.selector} with "${step.value}"`)
          await page.fill(step.selector, step.value, { timeout })
        }
        break

      case 'wait':
        logs.push(`Waiting ${step.timeout || 1000}ms`)
        await page.waitForTimeout(step.timeout || 1000)
        break

      case 'hover':
        if (step.selector) {
          logs.push(`Hovering ${step.selector}`)
          await page.hover(step.selector, { timeout })
        }
        break

      case 'scroll':
        logs.push('Scrolling page')
        await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight))
        break

      case 'select':
        if (step.selector && step.value) {
          logs.push(`Selecting ${step.value} in ${step.selector}`)
          await page.selectOption(step.selector, step.value, { timeout })
        }
        break

      case 'screenshot':
        const screenshotPath = path.join(
          this.outputDir,
          `screenshot-${Date.now()}.png`
        )
        await page.screenshot({ path: screenshotPath, fullPage: true })
        logs.push(`Screenshot saved: ${screenshotPath}`)
        break

      case 'assert':
        await this.executeAssertion(page, step, logs, timeout)
        break
    }
  }

  /**
   * 执行断言
   */
  private async executeAssertion(
    page: Page,
    step: TestStep,
    logs: string[],
    timeout: number
  ): Promise<void> {
    const assertion = step.assertion
    if (!assertion) return

    switch (assertion.type) {
      case 'visible':
        if (step.selector) {
          logs.push(`Asserting ${step.selector} is visible`)
          await page.waitForSelector(step.selector, { state: 'visible', timeout })
        }
        break

      case 'hidden':
        if (step.selector) {
          logs.push(`Asserting ${step.selector} is hidden`)
          await page.waitForSelector(step.selector, { state: 'hidden', timeout })
        }
        break

      case 'text':
        if (step.selector && assertion.expected) {
          logs.push(`Asserting ${step.selector} contains text "${assertion.expected}"`)
          const text = await page.textContent(step.selector, { timeout })
          if (!text?.includes(String(assertion.expected))) {
            throw new Error(`Text "${assertion.expected}" not found in ${step.selector}`)
          }
        }
        break

      case 'url':
        if (assertion.expected) {
          logs.push(`Asserting URL contains "${assertion.expected}"`)
          const url = page.url()
          if (!url.includes(String(assertion.expected))) {
            throw new Error(`URL "${url}" does not contain "${assertion.expected}"`)
          }
        }
        break

      case 'title':
        logs.push('Asserting page has title')
        const title = await page.title()
        if (!title || title.trim() === '') {
          throw new Error('Page title is empty')
        }
        break

      case 'count':
        if (step.selector && assertion.expected !== undefined) {
          logs.push(`Asserting ${step.selector} count >= ${assertion.expected}`)
          const count = await page.locator(step.selector).count()
          if (count < Number(assertion.expected)) {
            throw new Error(`Element count ${count} is less than expected ${assertion.expected}`)
          }
        }
        break

      case 'attribute':
        if (step.selector && assertion.attribute) {
          logs.push(`Asserting ${step.selector} has attribute ${assertion.attribute}`)
          const value = await page.getAttribute(step.selector, assertion.attribute, { timeout })
          if (assertion.expected !== undefined && value !== String(assertion.expected)) {
            throw new Error(`Attribute ${assertion.attribute} value "${value}" does not match "${assertion.expected}"`)
          }
        }
        break
    }
  }

  /**
   * 启动浏览器
   */
  private async launchBrowser(browserType: BrowserType): Promise<Browser> {
    const launchOptions = {
      headless: this.config.headless,
    }

    switch (browserType) {
      case 'chromium':
        return chromium.launch(launchOptions)
      case 'firefox':
        return firefox.launch(launchOptions)
      case 'webkit':
        return webkit.launch(launchOptions)
      default:
        return chromium.launch(launchOptions)
    }
  }

  /**
   * 确保输出目录存在
   */
  private async ensureOutputDir(): Promise<void> {
    try {
      await fs.mkdir(this.outputDir, { recursive: true })
    } catch {
      // 目录可能已存在
    }
  }

  /**
   * 保存测试报告
   */
  private async saveReport(report: E2ETestReport): Promise<void> {
    const reportPath = path.join(this.outputDir, `report-${Date.now()}.json`)
    await fs.writeFile(reportPath, JSON.stringify(report, null, 2))

    // 生成HTML报告
    const htmlPath = path.join(this.outputDir, `report-${Date.now()}.html`)
    await fs.writeFile(htmlPath, this.generateHtmlReport(report))
  }

  /**
   * 生成HTML报告
   */
  private generateHtmlReport(report: E2ETestReport): string {
    const statusColor = report.totalFailed > 0 ? '#ef4444' : '#22c55e'
    const statusEmoji = report.totalFailed > 0 ? '❌' : '✅'

    return `<!DOCTYPE html>
<html lang="zh-CN">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>E2E 测试报告 - ${report.projectName}</title>
  <style>
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; background: #f5f5f5; padding: 20px; }
    .container { max-width: 1200px; margin: 0 auto; }
    .header { background: white; border-radius: 12px; padding: 24px; margin-bottom: 20px; box-shadow: 0 1px 3px rgba(0,0,0,0.1); }
    .header h1 { font-size: 24px; color: #333; margin-bottom: 8px; }
    .header .meta { color: #666; font-size: 14px; }
    .summary { display: grid; grid-template-columns: repeat(auto-fit, minmax(150px, 1fr)); gap: 16px; margin-bottom: 20px; }
    .stat-card { background: white; border-radius: 12px; padding: 20px; text-align: center; box-shadow: 0 1px 3px rgba(0,0,0,0.1); }
    .stat-card .value { font-size: 36px; font-weight: bold; color: ${statusColor}; }
    .stat-card .label { color: #666; font-size: 14px; margin-top: 4px; }
    .suite { background: white; border-radius: 12px; padding: 20px; margin-bottom: 16px; box-shadow: 0 1px 3px rgba(0,0,0,0.1); }
    .suite h3 { font-size: 18px; color: #333; margin-bottom: 16px; }
    .test { display: flex; align-items: center; padding: 12px; border-bottom: 1px solid #eee; }
    .test:last-child { border-bottom: none; }
    .test .status { width: 24px; height: 24px; border-radius: 50%; display: flex; align-items: center; justify-content: center; margin-right: 12px; font-size: 12px; }
    .test .status.passed { background: #dcfce7; color: #16a34a; }
    .test .status.failed { background: #fee2e2; color: #dc2626; }
    .test .status.skipped { background: #fef3c7; color: #d97706; }
    .test .name { flex: 1; font-size: 14px; color: #333; }
    .test .duration { color: #666; font-size: 12px; }
    .test .error { color: #dc2626; font-size: 12px; margin-top: 4px; }
    .screenshots { display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 16px; margin-top: 20px; }
    .screenshot { background: white; border-radius: 8px; overflow: hidden; box-shadow: 0 1px 3px rgba(0,0,0,0.1); }
    .screenshot img { width: 100%; height: auto; }
    .screenshot .caption { padding: 8px; font-size: 12px; color: #666; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>${statusEmoji} E2E 测试报告</h1>
      <div class="meta">
        <p>项目: ${report.projectName}</p>
        <p>测试地址: ${report.baseUrl}</p>
        <p>测试时间: ${report.startedAt.toLocaleString('zh-CN')}</p>
        <p>耗时: ${(report.totalDuration / 1000).toFixed(1)}秒</p>
      </div>
    </div>

    <div class="summary">
      <div class="stat-card">
        <div class="value">${report.passRate}%</div>
        <div class="label">通过率</div>
      </div>
      <div class="stat-card">
        <div class="value" style="color: #22c55e">${report.totalPassed}</div>
        <div class="label">通过</div>
      </div>
      <div class="stat-card">
        <div class="value" style="color: #ef4444">${report.totalFailed}</div>
        <div class="label">失败</div>
      </div>
      <div class="stat-card">
        <div class="value" style="color: #666">${report.totalTests}</div>
        <div class="label">总计</div>
      </div>
    </div>

    ${report.suites.map(suite => `
    <div class="suite">
      <h3>${suite.browser} - ${suite.device || 'desktop'}</h3>
      ${suite.tests.map(test => `
      <div class="test">
        <div class="status ${test.status}">${test.status === 'passed' ? '✓' : test.status === 'failed' ? '✗' : '-'}</div>
        <div class="name">
          ${test.name}
          ${test.error ? `<div class="error">${test.error}</div>` : ''}
        </div>
        <div class="duration">${test.duration}ms</div>
      </div>
      `).join('')}
    </div>
    `).join('')}

    ${report.screenshots.length > 0 ? `
    <h2 style="margin: 20px 0 16px; color: #333;">截图</h2>
    <div class="screenshots">
      ${report.screenshots.map(s => `
      <div class="screenshot">
        <img src="file://${s.path}" alt="${s.name}" />
        <div class="caption">${s.name} (${s.status})</div>
      </div>
      `).join('')}
    </div>
    ` : ''}
  </div>
</body>
</html>`
  }
}

// 便捷方法：快速测试
export async function runE2ETests(
  baseUrl: string,
  scenarios?: TestScenario[],
  config?: Partial<E2ETestConfig>,
  onProgress?: TestProgressCallback
): Promise<E2ETestReport> {
  const tester = new PlaywrightTesterService({
    baseUrl,
    ...config,
  })

  return tester.runTests(scenarios || DEFAULT_TEST_SCENARIOS, onProgress)
}

// 便捷方法：健康检查（快速冒烟测试）
export async function runHealthCheck(baseUrl: string): Promise<{
  healthy: boolean
  message: string
  duration: number
}> {
  const startTime = Date.now()

  try {
    const browser = await chromium.launch({ headless: true })
    const page = await browser.newPage()

    await page.goto(baseUrl, { timeout: 30000 })
    const title = await page.title()

    await browser.close()

    return {
      healthy: true,
      message: `Page loaded successfully with title: ${title}`,
      duration: Date.now() - startTime,
    }
  } catch (error) {
    return {
      healthy: false,
      message: error instanceof Error ? error.message : 'Unknown error',
      duration: Date.now() - startTime,
    }
  }
}

// 便捷方法：关键路径测试
export async function runCriticalPathTest(
  baseUrl: string,
  paths: string[]
): Promise<{
  passed: boolean
  results: Array<{ path: string; status: 'passed' | 'failed'; error?: string }>
}> {
  const results: Array<{ path: string; status: 'passed' | 'failed'; error?: string }> = []

  const browser = await chromium.launch({ headless: true })

  try {
    const page = await browser.newPage()

    for (const pathUrl of paths) {
      const fullUrl = new URL(pathUrl, baseUrl).toString()
      try {
        const response = await page.goto(fullUrl, { timeout: 30000 })
        if (response && response.ok()) {
          results.push({ path: pathUrl, status: 'passed' })
        } else {
          results.push({
            path: pathUrl,
            status: 'failed',
            error: `HTTP ${response?.status()}`,
          })
        }
      } catch (error) {
        results.push({
          path: pathUrl,
          status: 'failed',
          error: error instanceof Error ? error.message : 'Unknown error',
        })
      }
    }
  } finally {
    await browser.close()
  }

  return {
    passed: results.every(r => r.status === 'passed'),
    results,
  }
}
