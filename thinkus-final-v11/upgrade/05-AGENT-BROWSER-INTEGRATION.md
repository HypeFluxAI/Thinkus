# Thinkus Agent-Browser 集成技术文档

> **版本**: v1.0 | **日期**: 2026-01-15
>
> **核心价值**: 实时预览 + 自动化测试 + 智能网页分析

---

## 一、概述

### 1.1 什么是 agent-browser

agent-browser 是 Vercel Labs 开源的浏览器自动化CLI工具，专为AI Agent设计。

```yaml
核心特点:
  - 93%更少的Context消耗（相比Playwright MCP）
  - Rust CLI + Node.js Daemon 架构
  - Snapshot + Refs 工作流
  - 支持多设备模拟
  - Apache-2.0 开源协议
```

### 1.2 在 Thinkus 中的应用场景

| 场景 | 说明 | 优先级 |
|------|------|--------|
| **实时预览直播** | AI开发时实时展示产品界面变化 | P1 |
| **自动化测试** | AI完成开发后自动测试，确保质量 | P1 |
| **竞品网站分析** | 用户提供URL，AI抓取分析生成类似产品 | P1 |
| **产品诊断** | 访问用户现有产品，生成诊断报告 | P3 |
| **竞品分析** | 批量抓取多个竞品网站数据 | P3 |

### 1.3 架构位置

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                              Thinkus 架构                                    │
│                                                                              │
│   ┌─────────────────────────────────────────────────────────────────────┐   │
│   │                        AI开发沙盒 (Docker)                          │   │
│   │                                                                      │   │
│   │   ┌─────────────┐  ┌─────────────┐  ┌─────────────────────────┐    │   │
│   │   │  Node.js    │  │  Database   │  │    agent-browser        │    │   │
│   │   │  Runtime    │  │  (MongoDB)  │  │    ══════════════       │    │   │
│   │   │             │  │             │  │    - Chromium           │    │   │
│   │   │  - 代码执行 │  │  - 数据存储 │  │    - 实时预览           │    │   │
│   │   │  - 热更新   │  │             │  │    - 自动测试           │    │   │
│   │   │             │  │             │  │    - 截图服务           │    │   │
│   │   └─────────────┘  └─────────────┘  └─────────────────────────┘    │   │
│   │                                                                      │   │
│   └─────────────────────────────────────────────────────────────────────┘   │
│                                      │                                       │
│                                      ▼                                       │
│   ┌─────────────────────────────────────────────────────────────────────┐   │
│   │                      RealtimeStream Service                          │   │
│   │                      (WebSocket 推送)                                │   │
│   └─────────────────────────────────────────────────────────────────────┘   │
│                                      │                                       │
│                                      ▼                                       │
│   ┌─────────────────────────────────────────────────────────────────────┐   │
│   │                         用户界面                                     │   │
│   │   ┌───────────────┬───────────────┬───────────────┐                 │   │
│   │   │   代码直播    │   预览直播    │   测试报告    │                 │   │
│   │   └───────────────┴───────────────┴───────────────┘                 │   │
│   └─────────────────────────────────────────────────────────────────────┘   │
│                                                                              │
└─────────────────────────────────────────────────────────────────────────────┘
```

---

## 二、环境配置

### 2.1 Docker 沙盒配置

```dockerfile
# Dockerfile.sandbox
FROM node:20-slim

# 系统依赖（Chromium需要）
RUN apt-get update && apt-get install -y \
    libnss3 \
    libatk-bridge2.0-0 \
    libdrm2 \
    libxkbcommon0 \
    libxcomposite1 \
    libxdamage1 \
    libxfixes3 \
    libxrandr2 \
    libgbm1 \
    libasound2 \
    libpango-1.0-0 \
    libcairo2 \
    fonts-noto-cjk \
    && rm -rf /var/lib/apt/lists/*

# 安装 agent-browser
RUN npm install -g agent-browser

# 下载 Chromium
RUN agent-browser install

# 创建工作目录
WORKDIR /app

# 设置环境变量
ENV AGENT_BROWSER_HEADLESS=true
ENV AGENT_BROWSER_TIMEOUT=30000

# 暴露端口
EXPOSE 3000 9222

# 启动脚本
COPY entrypoint.sh /entrypoint.sh
RUN chmod +x /entrypoint.sh

ENTRYPOINT ["/entrypoint.sh"]
```

### 2.2 启动脚本

```bash
#!/bin/bash
# entrypoint.sh

# 启动 agent-browser daemon（后台）
agent-browser install --skip-download 2>/dev/null &

# 等待 daemon 就绪
sleep 2

# 执行传入的命令
exec "$@"
```

### 2.3 沙盒管理器更新

```typescript
// src/services/sandbox/SandboxManager.ts

import Docker from 'dockerode'

interface SandboxConfig {
  projectId: string
  userId: string
  port: number
  browserPort: number
}

class SandboxManager {
  private docker: Docker
  private containers: Map<string, Docker.Container> = new Map()
  
  constructor() {
    this.docker = new Docker()
  }
  
  /**
   * 创建沙盒（包含agent-browser）
   */
  async createSandbox(config: SandboxConfig): Promise<SandboxInstance> {
    const containerName = `sandbox_${config.projectId}`
    
    const container = await this.docker.createContainer({
      Image: 'thinkus/sandbox:latest',
      name: containerName,
      Env: [
        `PROJECT_ID=${config.projectId}`,
        `USER_ID=${config.userId}`,
        `AGENT_BROWSER_SESSION=${config.projectId}`,
        'AGENT_BROWSER_HEADLESS=true'
      ],
      ExposedPorts: {
        '3000/tcp': {},  // 应用端口
        '9222/tcp': {}   // Chrome DevTools 端口
      },
      HostConfig: {
        PortBindings: {
          '3000/tcp': [{ HostPort: String(config.port) }],
          '9222/tcp': [{ HostPort: String(config.browserPort) }]
        },
        Memory: 2 * 1024 * 1024 * 1024,  // 2GB（Chromium需要）
        CpuShares: 1024,
        // 安全限制
        SecurityOpt: ['no-new-privileges'],
        CapDrop: ['ALL'],
        CapAdd: ['SYS_ADMIN']  // Chromium sandbox需要
      }
    })
    
    await container.start()
    this.containers.set(config.projectId, container)
    
    return {
      projectId: config.projectId,
      containerId: container.id,
      previewUrl: `https://${config.projectId}.sandbox.thinkus.ai`,
      port: config.port,
      browserPort: config.browserPort
    }
  }
  
  /**
   * 在沙盒中执行 agent-browser 命令
   */
  async execBrowserCommand(
    projectId: string, 
    command: string
  ): Promise<BrowserCommandResult> {
    const container = this.containers.get(projectId)
    if (!container) throw new Error('Sandbox not found')
    
    const exec = await container.exec({
      Cmd: ['sh', '-c', `agent-browser --session ${projectId} ${command} --json`],
      AttachStdout: true,
      AttachStderr: true
    })
    
    const stream = await exec.start({ Detach: false })
    const output = await this.collectOutput(stream)
    
    try {
      return {
        success: true,
        data: JSON.parse(output)
      }
    } catch {
      return {
        success: false,
        error: output
      }
    }
  }
}
```

---

## 三、核心服务实现

### 3.1 Browser Service（浏览器服务）

```typescript
// src/services/browser/BrowserService.ts

interface SnapshotOptions {
  interactive?: boolean   // 只返回可交互元素
  compact?: boolean       // 压缩输出
  depth?: number          // 限制深度
  selector?: string       // 限定范围
}

interface ScreenshotOptions {
  full?: boolean          // 全页截图
  device?: string         // 设备模拟
  path?: string           // 保存路径
}

interface TestCase {
  name: string
  steps: TestStep[]
  expected?: string
}

interface TestStep {
  action: 'click' | 'fill' | 'wait' | 'scroll' | 'hover' | 'screenshot'
  target?: string         // @ref 或 CSS选择器
  value?: string
  condition?: string
}

interface TestResult {
  name: string
  passed: boolean
  duration: number
  error?: string
  screenshot?: string
}

class BrowserService {
  constructor(
    private sandboxManager: SandboxManager,
    private storageService: StorageService
  ) {}
  
  /**
   * 打开URL
   */
  async open(projectId: string, url: string): Promise<void> {
    await this.sandboxManager.execBrowserCommand(projectId, `open ${url}`)
    // 等待页面加载完成
    await this.sandboxManager.execBrowserCommand(projectId, 'wait --load networkidle')
  }
  
  /**
   * 获取页面快照
   */
  async getSnapshot(projectId: string, options?: SnapshotOptions): Promise<PageSnapshot> {
    const flags: string[] = []
    
    if (options?.interactive) flags.push('-i')
    if (options?.compact) flags.push('-c')
    if (options?.depth) flags.push(`-d ${options.depth}`)
    if (options?.selector) flags.push(`-s "${options.selector}"`)
    
    const result = await this.sandboxManager.execBrowserCommand(
      projectId, 
      `snapshot ${flags.join(' ')}`
    )
    
    return {
      tree: result.data.snapshot,
      refs: result.data.refs,
      timestamp: Date.now()
    }
  }
  
  /**
   * 截图
   */
  async screenshot(
    projectId: string, 
    options?: ScreenshotOptions
  ): Promise<ScreenshotResult> {
    // 设备模拟
    if (options?.device) {
      await this.sandboxManager.execBrowserCommand(
        projectId, 
        `set device "${options.device}"`
      )
    }
    
    const flags = options?.full ? '--full' : ''
    const filename = options?.path || `screenshot-${Date.now()}.png`
    
    await this.sandboxManager.execBrowserCommand(
      projectId, 
      `screenshot /tmp/${filename} ${flags}`
    )
    
    // 上传到存储
    const url = await this.storageService.uploadFromSandbox(
      projectId, 
      `/tmp/${filename}`,
      `screenshots/${projectId}/${filename}`
    )
    
    return {
      url,
      filename,
      device: options?.device || 'desktop',
      timestamp: Date.now()
    }
  }
  
  /**
   * 执行交互动作
   */
  async action(
    projectId: string, 
    action: string, 
    target: string, 
    value?: string
  ): Promise<ActionResult> {
    const cmd = value 
      ? `${action} ${target} "${value}"`
      : `${action} ${target}`
    
    const result = await this.sandboxManager.execBrowserCommand(projectId, cmd)
    
    return {
      success: result.success,
      action,
      target,
      value,
      timestamp: Date.now()
    }
  }
  
  /**
   * 等待条件
   */
  async wait(
    projectId: string, 
    condition: 'selector' | 'text' | 'url' | 'load' | 'time',
    value: string
  ): Promise<void> {
    const conditionMap = {
      selector: value,
      text: `--text "${value}"`,
      url: `--url "${value}"`,
      load: `--load ${value}`,
      time: value
    }
    
    await this.sandboxManager.execBrowserCommand(
      projectId, 
      `wait ${conditionMap[condition]}`
    )
  }
  
  /**
   * 获取元素信息
   */
  async getElementInfo(
    projectId: string, 
    target: string, 
    infoType: 'text' | 'html' | 'value' | 'attr'
  ): Promise<string> {
    const result = await this.sandboxManager.execBrowserCommand(
      projectId, 
      `get ${infoType} ${target}`
    )
    
    return result.data
  }
  
  /**
   * 检查元素状态
   */
  async checkElement(
    projectId: string, 
    target: string, 
    check: 'visible' | 'enabled' | 'checked'
  ): Promise<boolean> {
    const result = await this.sandboxManager.execBrowserCommand(
      projectId, 
      `is ${check} ${target}`
    )
    
    return result.data === true || result.data === 'true'
  }
  
  /**
   * 设置视口/设备
   */
  async setViewport(
    projectId: string, 
    viewport: { width: number; height: number } | { device: string }
  ): Promise<void> {
    if ('device' in viewport) {
      await this.sandboxManager.execBrowserCommand(
        projectId, 
        `set device "${viewport.device}"`
      )
    } else {
      await this.sandboxManager.execBrowserCommand(
        projectId, 
        `set viewport ${viewport.width} ${viewport.height}`
      )
    }
  }
  
  /**
   * 关闭浏览器
   */
  async close(projectId: string): Promise<void> {
    await this.sandboxManager.execBrowserCommand(projectId, 'close')
  }
}
```

### 3.2 Live Preview Service（实时预览服务）

```typescript
// src/services/browser/LivePreviewService.ts

interface PreviewUpdate {
  type: 'preview_update'
  data: {
    snapshot: PageSnapshot
    screenshot: ScreenshotResult
    device: string
    changedFile?: string
    timestamp: number
  }
}

interface PreviewConfig {
  projectId: string
  previewUrl: string
  watchPaths: string[]
  devices: string[]
}

class LivePreviewService {
  private watchers: Map<string, FSWatcher> = new Map()
  private updateDebounce: Map<string, NodeJS.Timeout> = new Map()
  
  constructor(
    private browserService: BrowserService,
    private realtimeStream: RealtimeStreamService,
    private sandboxManager: SandboxManager
  ) {}
  
  /**
   * 启动实时预览
   */
  async startPreview(config: PreviewConfig): Promise<void> {
    const { projectId, previewUrl } = config
    
    // 1. 打开预览页面
    await this.browserService.open(projectId, previewUrl)
    
    // 2. 获取初始快照和截图
    await this.emitPreviewUpdate(projectId, 'desktop')
    
    // 3. 启动文件监听
    this.startFileWatcher(config)
    
    console.log(`[LivePreview] Started for project ${projectId}`)
  }
  
  /**
   * 文件变化监听
   */
  private startFileWatcher(config: PreviewConfig): void {
    const { projectId, watchPaths } = config
    
    // 在沙盒内监听文件变化
    const watchCmd = `
      inotifywait -m -r -e modify,create,delete ${watchPaths.join(' ')} |
      while read path action file; do
        echo "$path$file"
      done
    `
    
    this.sandboxManager.execStreamCommand(projectId, watchCmd, async (changedFile) => {
      // 防抖：500ms内多次变化只触发一次
      const existingTimeout = this.updateDebounce.get(projectId)
      if (existingTimeout) {
        clearTimeout(existingTimeout)
      }
      
      const timeout = setTimeout(async () => {
        await this.onFileChanged(projectId, changedFile)
        this.updateDebounce.delete(projectId)
      }, 500)
      
      this.updateDebounce.set(projectId, timeout)
    })
  }
  
  /**
   * 文件变化处理
   */
  private async onFileChanged(projectId: string, changedFile: string): Promise<void> {
    try {
      // 1. 等待热更新完成
      await this.browserService.wait(projectId, 'load', 'networkidle')
      
      // 2. 短暂延迟确保渲染完成
      await new Promise(resolve => setTimeout(resolve, 300))
      
      // 3. 发送预览更新
      await this.emitPreviewUpdate(projectId, 'desktop', changedFile)
      
      console.log(`[LivePreview] Updated for ${changedFile}`)
    } catch (error) {
      console.error(`[LivePreview] Error updating preview:`, error)
      
      // 发送错误状态
      await this.realtimeStream.emit(projectId, {
        type: 'preview_error',
        data: {
          error: error.message,
          changedFile,
          timestamp: Date.now()
        }
      })
    }
  }
  
  /**
   * 发送预览更新
   */
  private async emitPreviewUpdate(
    projectId: string, 
    device: string,
    changedFile?: string
  ): Promise<void> {
    // 获取快照
    const snapshot = await this.browserService.getSnapshot(projectId, {
      interactive: true,
      compact: true
    })
    
    // 截图
    const screenshot = await this.browserService.screenshot(projectId, {
      device: device === 'desktop' ? undefined : device
    })
    
    // 推送给用户
    await this.realtimeStream.emit(projectId, {
      type: 'preview_update',
      data: {
        snapshot,
        screenshot,
        device,
        changedFile,
        timestamp: Date.now()
      }
    })
  }
  
  /**
   * 切换设备预览
   */
  async switchDevice(projectId: string, device: string): Promise<void> {
    const deviceMap: Record<string, { width: number; height: number } | { device: string }> = {
      'desktop': { width: 1280, height: 800 },
      'tablet': { width: 768, height: 1024 },
      'mobile': { device: 'iPhone 14' },
      'iphone-14': { device: 'iPhone 14' },
      'iphone-14-pro-max': { device: 'iPhone 14 Pro Max' },
      'ipad': { device: 'iPad Pro 11' },
      'pixel-7': { device: 'Pixel 7' },
      'galaxy-s23': { device: 'Galaxy S23' }
    }
    
    const viewport = deviceMap[device] || deviceMap['desktop']
    
    await this.browserService.setViewport(projectId, viewport)
    await this.emitPreviewUpdate(projectId, device)
  }
  
  /**
   * 获取多设备预览
   */
  async getMultiDevicePreview(projectId: string): Promise<MultiDevicePreview> {
    const devices = ['desktop', 'tablet', 'mobile']
    const previews: Record<string, ScreenshotResult> = {}
    
    for (const device of devices) {
      await this.switchDevice(projectId, device)
      previews[device] = await this.browserService.screenshot(projectId, {
        device: device === 'desktop' ? undefined : device
      })
    }
    
    // 恢复桌面视图
    await this.switchDevice(projectId, 'desktop')
    
    return {
      projectId,
      previews,
      timestamp: Date.now()
    }
  }
  
  /**
   * 停止预览
   */
  async stopPreview(projectId: string): Promise<void> {
    const timeout = this.updateDebounce.get(projectId)
    if (timeout) {
      clearTimeout(timeout)
      this.updateDebounce.delete(projectId)
    }
    
    await this.browserService.close(projectId)
    console.log(`[LivePreview] Stopped for project ${projectId}`)
  }
}
```

### 3.3 Auto Test Service（自动测试服务）

```typescript
// src/services/browser/AutoTestService.ts

interface TestSuite {
  name: string
  projectId: string
  tests: TestCase[]
}

interface TestReport {
  projectId: string
  suiteName: string
  totalTests: number
  passed: number
  failed: number
  duration: number
  results: TestResult[]
  summary: string
  suggestions: string[]
  timestamp: number
}

class AutoTestService {
  constructor(
    private browserService: BrowserService,
    private claudeClient: ClaudeClient,
    private realtimeStream: RealtimeStreamService
  ) {}
  
  /**
   * 自动生成测试用例
   */
  async generateTests(projectId: string, previewUrl: string): Promise<TestCase[]> {
    // 1. 打开页面获取快照
    await this.browserService.open(projectId, previewUrl)
    const snapshot = await this.browserService.getSnapshot(projectId, {
      interactive: true
    })
    
    // 2. 使用AI生成测试用例
    const response = await this.claudeClient.messages.create({
      model: 'claude-3-5-sonnet-20241022',
      max_tokens: 3000,
      messages: [{
        role: 'user',
        content: `根据以下页面结构，生成自动化测试用例。

页面URL: ${previewUrl}
页面结构:
${JSON.stringify(snapshot.tree, null, 2)}

元素引用:
${JSON.stringify(snapshot.refs, null, 2)}

请为每个可交互元素生成测试，包括：
1. 页面加载测试
2. 元素可见性测试
3. 按钮点击测试
4. 表单填写测试（如果有）
5. 导航链接测试
6. 响应式布局测试

返回JSON数组，格式如下：
[{
  "name": "测试名称",
  "steps": [
    { "action": "click|fill|wait|scroll|hover|screenshot", "target": "@ref或选择器", "value": "可选值", "condition": "可选条件" }
  ],
  "expected": "预期结果描述"
}]

要求：
- 使用@ref引用元素（如@e1, @e2）
- 测试应该实际可执行
- 包含正向和边界情况
- 生成10-20个测试用例`
      }]
    })
    
    const tests = JSON.parse(response.content[0].text)
    
    // 3. 添加标准测试
    const standardTests = this.getStandardTests(previewUrl)
    
    return [...standardTests, ...tests]
  }
  
  /**
   * 标准测试用例
   */
  private getStandardTests(previewUrl: string): TestCase[] {
    return [
      {
        name: '页面加载测试',
        steps: [
          { action: 'wait', condition: 'load', value: 'networkidle' }
        ],
        expected: '页面在5秒内加载完成'
      },
      {
        name: '页面标题测试',
        steps: [
          { action: 'wait', target: 'title' }
        ],
        expected: '页面有标题'
      },
      {
        name: '移动端适配测试 - iPhone',
        steps: [
          { action: 'screenshot', value: 'mobile-iphone.png' }
        ],
        expected: '移动端布局正常'
      },
      {
        name: '移动端适配测试 - iPad',
        steps: [
          { action: 'screenshot', value: 'mobile-ipad.png' }
        ],
        expected: '平板布局正常'
      },
      {
        name: '控制台错误检查',
        steps: [
          { action: 'wait', condition: 'time', value: '2000' }
        ],
        expected: '无JavaScript控制台错误'
      }
    ]
  }
  
  /**
   * 执行测试套件
   */
  async runTests(
    projectId: string, 
    tests: TestCase[],
    options?: { realtime?: boolean }
  ): Promise<TestReport> {
    const startTime = Date.now()
    const results: TestResult[] = []
    
    for (let i = 0; i < tests.length; i++) {
      const test = tests[i]
      const testStartTime = Date.now()
      
      // 实时推送测试进度
      if (options?.realtime) {
        await this.realtimeStream.emit(projectId, {
          type: 'test_progress',
          data: {
            current: i + 1,
            total: tests.length,
            testName: test.name,
            status: 'running'
          }
        })
      }
      
      try {
        // 执行测试步骤
        await this.executeTestSteps(projectId, test.steps)
        
        results.push({
          name: test.name,
          passed: true,
          duration: Date.now() - testStartTime
        })
        
        // 实时推送成功
        if (options?.realtime) {
          await this.realtimeStream.emit(projectId, {
            type: 'test_result',
            data: {
              name: test.name,
              passed: true,
              duration: Date.now() - testStartTime
            }
          })
        }
        
      } catch (error) {
        // 失败时截图
        const errorScreenshot = await this.browserService.screenshot(projectId, {
          path: `error-${test.name.replace(/\s+/g, '-')}.png`
        })
        
        results.push({
          name: test.name,
          passed: false,
          duration: Date.now() - testStartTime,
          error: error.message,
          screenshot: errorScreenshot.url
        })
        
        // 实时推送失败
        if (options?.realtime) {
          await this.realtimeStream.emit(projectId, {
            type: 'test_result',
            data: {
              name: test.name,
              passed: false,
              error: error.message,
              screenshot: errorScreenshot.url
            }
          })
        }
      }
    }
    
    // 生成测试报告
    const report = await this.generateReport(projectId, tests, results, startTime)
    
    return report
  }
  
  /**
   * 执行测试步骤
   */
  private async executeTestSteps(projectId: string, steps: TestStep[]): Promise<void> {
    for (const step of steps) {
      switch (step.action) {
        case 'click':
          await this.browserService.action(projectId, 'click', step.target!)
          break
          
        case 'fill':
          await this.browserService.action(projectId, 'fill', step.target!, step.value)
          break
          
        case 'wait':
          if (step.condition === 'load') {
            await this.browserService.wait(projectId, 'load', step.value || 'networkidle')
          } else if (step.condition === 'url') {
            await this.browserService.wait(projectId, 'url', step.value!)
          } else if (step.condition === 'text') {
            await this.browserService.wait(projectId, 'text', step.value!)
          } else if (step.condition === 'time') {
            await new Promise(resolve => setTimeout(resolve, parseInt(step.value!)))
          } else if (step.target) {
            await this.browserService.wait(projectId, 'selector', step.target)
          }
          break
          
        case 'scroll':
          await this.browserService.action(projectId, 'scroll', step.target || 'down', step.value)
          break
          
        case 'hover':
          await this.browserService.action(projectId, 'hover', step.target!)
          break
          
        case 'screenshot':
          await this.browserService.screenshot(projectId, { path: step.value })
          break
      }
    }
  }
  
  /**
   * 生成测试报告
   */
  private async generateReport(
    projectId: string,
    tests: TestCase[],
    results: TestResult[],
    startTime: number
  ): Promise<TestReport> {
    const passed = results.filter(r => r.passed).length
    const failed = results.filter(r => !r.passed).length
    
    // AI生成总结和建议
    const analysis = await this.claudeClient.messages.create({
      model: 'claude-3-5-sonnet-20241022',
      max_tokens: 1000,
      messages: [{
        role: 'user',
        content: `分析以下测试结果，生成总结和改进建议：

测试结果:
${JSON.stringify(results, null, 2)}

请返回JSON:
{
  "summary": "一句话总结测试结果",
  "suggestions": ["建议1", "建议2", ...]
}

要求：
- 总结要简洁明了
- 建议要具体可执行
- 如果测试全部通过，给出正面反馈
- 如果有失败，分析可能原因并给出修复建议`
      }]
    })
    
    const { summary, suggestions } = JSON.parse(analysis.content[0].text)
    
    return {
      projectId,
      suiteName: 'Auto Generated Tests',
      totalTests: tests.length,
      passed,
      failed,
      duration: Date.now() - startTime,
      results,
      summary,
      suggestions,
      timestamp: Date.now()
    }
  }
  
  /**
   * 快速冒烟测试（只测试核心功能）
   */
  async runSmokeTests(projectId: string, previewUrl: string): Promise<TestReport> {
    const smokeTests: TestCase[] = [
      {
        name: '页面可访问',
        steps: [
          { action: 'wait', condition: 'load', value: 'domcontentloaded' }
        ]
      },
      {
        name: '无控制台错误',
        steps: [
          { action: 'wait', condition: 'time', value: '1000' }
        ]
      },
      {
        name: '主要内容可见',
        steps: [
          { action: 'wait', target: 'body' }
        ]
      }
    ]
    
    await this.browserService.open(projectId, previewUrl)
    return this.runTests(projectId, smokeTests)
  }
  
  /**
   * 完整回归测试
   */
  async runRegressionTests(projectId: string, previewUrl: string): Promise<TestReport> {
    const tests = await this.generateTests(projectId, previewUrl)
    return this.runTests(projectId, tests, { realtime: true })
  }
}
```

### 3.4 Website Analyzer Service（网站分析服务）

```typescript
// src/services/browser/WebsiteAnalyzerService.ts

interface WebsiteAnalysis {
  url: string
  title: string
  structure: PageSnapshot
  screenshots: {
    desktop: ScreenshotResult
    tablet: ScreenshotResult
    mobile: ScreenshotResult
  }
  elements: {
    buttons: number
    links: number
    inputs: number
    images: number
    forms: number
  }
  techStack?: string[]
  colorScheme?: string[]
  layoutType?: string
  features: string[]
  timestamp: number
}

class WebsiteAnalyzerService {
  constructor(
    private browserService: BrowserService,
    private claudeClient: ClaudeClient
  ) {}
  
  /**
   * 分析竞品网站
   */
  async analyzeWebsite(projectId: string, url: string): Promise<WebsiteAnalysis> {
    // 1. 打开网站
    await this.browserService.open(projectId, url)
    
    // 2. 获取页面信息
    const title = await this.browserService.getElementInfo(projectId, 'title', 'text')
    
    // 3. 获取页面结构
    const structure = await this.browserService.getSnapshot(projectId, {
      interactive: true,
      compact: true
    })
    
    // 4. 多设备截图
    const screenshots = {
      desktop: await this.browserService.screenshot(projectId, { full: true }),
      tablet: await this.browserService.screenshot(projectId, { device: 'iPad Pro 11', full: true }),
      mobile: await this.browserService.screenshot(projectId, { device: 'iPhone 14', full: true })
    }
    
    // 5. 统计元素
    const elements = this.countElements(structure)
    
    // 6. AI分析
    const aiAnalysis = await this.aiAnalyze(url, structure, screenshots)
    
    await this.browserService.close(projectId)
    
    return {
      url,
      title,
      structure,
      screenshots,
      elements,
      ...aiAnalysis,
      timestamp: Date.now()
    }
  }
  
  /**
   * 统计元素数量
   */
  private countElements(snapshot: PageSnapshot): WebsiteAnalysis['elements'] {
    const refs = snapshot.refs || {}
    
    return {
      buttons: Object.values(refs).filter((r: any) => r.role === 'button').length,
      links: Object.values(refs).filter((r: any) => r.role === 'link').length,
      inputs: Object.values(refs).filter((r: any) => 
        ['textbox', 'searchbox', 'combobox'].includes(r.role)
      ).length,
      images: Object.values(refs).filter((r: any) => r.role === 'img').length,
      forms: Object.values(refs).filter((r: any) => r.role === 'form').length
    }
  }
  
  /**
   * AI分析网站
   */
  private async aiAnalyze(
    url: string, 
    structure: PageSnapshot,
    screenshots: WebsiteAnalysis['screenshots']
  ): Promise<Partial<WebsiteAnalysis>> {
    const response = await this.claudeClient.messages.create({
      model: 'claude-3-5-sonnet-20241022',
      max_tokens: 2000,
      messages: [{
        role: 'user',
        content: `分析以下网站结构，提取关键信息：

URL: ${url}

页面结构:
${JSON.stringify(structure.tree, null, 2).slice(0, 5000)}

请返回JSON:
{
  "techStack": ["可能使用的技术栈"],
  "colorScheme": ["主要颜色，如#333333"],
  "layoutType": "布局类型（如单栏、双栏、网格等）",
  "features": ["功能特点列表"]
}

要求：
- 根据页面结构推断技术栈
- 识别主要的设计风格
- 列出核心功能模块`
      }]
    })
    
    return JSON.parse(response.content[0].text)
  }
  
  /**
   * 批量分析竞品
   */
  async analyzeCompetitors(
    projectId: string, 
    urls: string[]
  ): Promise<CompetitorAnalysisReport> {
    const analyses: WebsiteAnalysis[] = []
    
    for (const url of urls) {
      try {
        const analysis = await this.analyzeWebsite(projectId, url)
        analyses.push(analysis)
      } catch (error) {
        console.error(`Failed to analyze ${url}:`, error)
      }
    }
    
    // 生成对比报告
    return this.generateComparisonReport(analyses)
  }
  
  /**
   * 生成竞品对比报告
   */
  private async generateComparisonReport(
    analyses: WebsiteAnalysis[]
  ): Promise<CompetitorAnalysisReport> {
    const response = await this.claudeClient.messages.create({
      model: 'claude-3-5-sonnet-20241022',
      max_tokens: 3000,
      messages: [{
        role: 'user',
        content: `基于以下竞品分析数据，生成对比报告：

${JSON.stringify(analyses.map(a => ({
  url: a.url,
  title: a.title,
  elements: a.elements,
  features: a.features,
  layoutType: a.layoutType
})), null, 2)}

请返回JSON:
{
  "summary": "整体市场情况总结",
  "commonFeatures": ["所有竞品共有的功能"],
  "uniqueFeatures": [
    { "url": "网站URL", "features": ["独特功能"] }
  ],
  "recommendations": ["针对用户产品的建议"],
  "differentiationOpportunities": ["差异化机会"]
}`
      }]
    })
    
    const report = JSON.parse(response.content[0].text)
    
    return {
      analyses,
      ...report,
      timestamp: Date.now()
    }
  }
}
```

---

## 四、API 设计

### 4.1 Preview API

```typescript
// POST /api/projects/:projectId/preview/start
// 启动实时预览
interface StartPreviewRequest {
  previewUrl?: string  // 默认使用沙盒预览URL
}

interface StartPreviewResponse {
  success: boolean
  previewUrl: string
  wsChannel: string  // WebSocket频道
}

// POST /api/projects/:projectId/preview/device
// 切换设备预览
interface SwitchDeviceRequest {
  device: 'desktop' | 'tablet' | 'mobile' | string
}

// GET /api/projects/:projectId/preview/screenshot
// 获取当前截图
interface ScreenshotResponse {
  url: string
  device: string
  timestamp: number
}

// POST /api/projects/:projectId/preview/stop
// 停止预览
```

### 4.2 Test API

```typescript
// POST /api/projects/:projectId/tests/generate
// 生成测试用例
interface GenerateTestsRequest {
  previewUrl?: string
}

interface GenerateTestsResponse {
  tests: TestCase[]
  count: number
}

// POST /api/projects/:projectId/tests/run
// 执行测试
interface RunTestsRequest {
  tests?: TestCase[]    // 可选，不传则自动生成
  type?: 'smoke' | 'regression' | 'custom'
  realtime?: boolean    // 是否实时推送结果
}

interface RunTestsResponse {
  report: TestReport
}

// GET /api/projects/:projectId/tests/report/:reportId
// 获取测试报告
```

### 4.3 Analyzer API

```typescript
// POST /api/analyze/website
// 分析单个网站
interface AnalyzeWebsiteRequest {
  url: string
}

interface AnalyzeWebsiteResponse {
  analysis: WebsiteAnalysis
}

// POST /api/analyze/competitors
// 批量分析竞品
interface AnalyzeCompetitorsRequest {
  urls: string[]  // 最多10个
}

interface AnalyzeCompetitorsResponse {
  report: CompetitorAnalysisReport
}
```

---

## 五、前端集成

### 5.1 实时预览组件

```typescript
// components/LivePreview.tsx

import React, { useState, useEffect } from 'react'
import { useWebSocket } from '@/hooks/useWebSocket'

interface LivePreviewProps {
  projectId: string
  onError?: (error: string) => void
}

export function LivePreview({ projectId, onError }: LivePreviewProps) {
  const [screenshot, setScreenshot] = useState<string | null>(null)
  const [device, setDevice] = useState<'desktop' | 'tablet' | 'mobile'>('desktop')
  const [loading, setLoading] = useState(false)
  const [lastUpdate, setLastUpdate] = useState<Date | null>(null)
  
  // WebSocket连接
  const { subscribe, send } = useWebSocket(`/ws/project/${projectId}`)
  
  useEffect(() => {
    // 订阅预览更新
    const unsubscribe = subscribe('preview_update', (data) => {
      setScreenshot(data.screenshot.url)
      setLastUpdate(new Date(data.timestamp))
      setLoading(false)
    })
    
    // 订阅错误
    const unsubError = subscribe('preview_error', (data) => {
      onError?.(data.error)
      setLoading(false)
    })
    
    return () => {
      unsubscribe()
      unsubError()
    }
  }, [projectId])
  
  // 切换设备
  const handleDeviceChange = async (newDevice: typeof device) => {
    setDevice(newDevice)
    setLoading(true)
    
    await fetch(`/api/projects/${projectId}/preview/device`, {
      method: 'POST',
      body: JSON.stringify({ device: newDevice })
    })
  }
  
  return (
    <div className="live-preview">
      {/* 设备选择器 */}
      <div className="device-selector">
        <button 
          className={device === 'desktop' ? 'active' : ''}
          onClick={() => handleDeviceChange('desktop')}
        >
          🖥️ 桌面
        </button>
        <button 
          className={device === 'tablet' ? 'active' : ''}
          onClick={() => handleDeviceChange('tablet')}
        >
          📱 平板
        </button>
        <button 
          className={device === 'mobile' ? 'active' : ''}
          onClick={() => handleDeviceChange('mobile')}
        >
          📱 手机
        </button>
      </div>
      
      {/* 预览区域 */}
      <div className={`preview-container preview-${device}`}>
        {loading ? (
          <div className="loading">
            <span>🔄 更新中...</span>
          </div>
        ) : screenshot ? (
          <img src={screenshot} alt="Preview" />
        ) : (
          <div className="placeholder">
            <span>等待预览...</span>
          </div>
        )}
      </div>
      
      {/* 更新时间 */}
      {lastUpdate && (
        <div className="update-time">
          🔄 {formatTimeAgo(lastUpdate)}
        </div>
      )}
    </div>
  )
}
```

### 5.2 测试报告组件

```typescript
// components/TestReport.tsx

import React from 'react'

interface TestReportProps {
  report: TestReport
  onFixSuggestion?: (suggestion: string) => void
}

export function TestReportView({ report, onFixSuggestion }: TestReportProps) {
  const passRate = (report.passed / report.totalTests * 100).toFixed(1)
  
  return (
    <div className="test-report">
      {/* 摘要 */}
      <div className="summary">
        <h3>🧪 测试报告</h3>
        <div className="stats">
          <div className="stat passed">
            <span className="number">{report.passed}</span>
            <span className="label">通过</span>
          </div>
          <div className="stat failed">
            <span className="number">{report.failed}</span>
            <span className="label">失败</span>
          </div>
          <div className="stat rate">
            <span className="number">{passRate}%</span>
            <span className="label">通过率</span>
          </div>
        </div>
        <p className="summary-text">{report.summary}</p>
      </div>
      
      {/* 测试结果列表 */}
      <div className="results">
        {report.results.map((result, index) => (
          <div 
            key={index} 
            className={`result ${result.passed ? 'passed' : 'failed'}`}
          >
            <span className="icon">
              {result.passed ? '✅' : '❌'}
            </span>
            <span className="name">{result.name}</span>
            <span className="duration">{result.duration}ms</span>
            
            {!result.passed && (
              <div className="error-details">
                <p className="error">{result.error}</p>
                {result.screenshot && (
                  <img 
                    src={result.screenshot} 
                    alt="Error screenshot"
                    className="error-screenshot"
                  />
                )}
              </div>
            )}
          </div>
        ))}
      </div>
      
      {/* AI建议 */}
      {report.suggestions.length > 0 && (
        <div className="suggestions">
          <h4>💡 AI建议</h4>
          <ul>
            {report.suggestions.map((suggestion, index) => (
              <li key={index}>
                <span>{suggestion}</span>
                <button onClick={() => onFixSuggestion?.(suggestion)}>
                  让AI修复
                </button>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  )
}
```

---

## 六、WebSocket 事件

### 6.1 事件类型

```typescript
// 预览相关事件
type PreviewEvent = 
  | { type: 'preview_update'; data: PreviewUpdateData }
  | { type: 'preview_error'; data: { error: string; changedFile?: string } }

interface PreviewUpdateData {
  snapshot: PageSnapshot
  screenshot: ScreenshotResult
  device: string
  changedFile?: string
  timestamp: number
}

// 测试相关事件
type TestEvent =
  | { type: 'test_progress'; data: TestProgressData }
  | { type: 'test_result'; data: TestResultData }
  | { type: 'test_complete'; data: TestReport }

interface TestProgressData {
  current: number
  total: number
  testName: string
  status: 'running' | 'pending'
}

interface TestResultData {
  name: string
  passed: boolean
  duration?: number
  error?: string
  screenshot?: string
}
```

---

## 七、开发计划

### Phase 1: 基础集成 (1周)

| 任务 | 工作量 | 说明 |
|------|--------|------|
| Docker沙盒配置 | 2天 | 预装agent-browser和Chromium |
| BrowserService实现 | 2天 | 封装agent-browser命令 |
| 基础API | 1天 | 截图、快照等 |

### Phase 2: 实时预览 (1周)

| 任务 | 工作量 | 说明 |
|------|--------|------|
| LivePreviewService | 2天 | 文件监听、预览更新 |
| WebSocket推送 | 1天 | 实时推送预览 |
| 前端组件 | 2天 | 预览组件、设备切换 |

### Phase 3: 自动测试 (1周)

| 任务 | 工作量 | 说明 |
|------|--------|------|
| AutoTestService | 2天 | 测试生成和执行 |
| 测试报告生成 | 1天 | AI分析和建议 |
| 前端组件 | 2天 | 测试报告展示 |

### Phase 4: 网站分析 (选做)

| 任务 | 工作量 | 说明 |
|------|--------|------|
| WebsiteAnalyzerService | 2天 | 竞品分析 |
| 对比报告 | 1天 | 多竞品对比 |

---

## 八、资源估算

### 8.1 沙盒资源

```yaml
每个沙盒:
  内存: 2GB (Chromium需要1GB+)
  CPU: 1核
  存储: 5GB
  
预估并发:
  10个沙盒同时运行
  总内存: 20GB
  总CPU: 10核
```

### 8.2 存储需求

```yaml
截图存储:
  每张截图: ~500KB
  每个项目每天: ~50张 = 25MB
  每月1000个项目: 25GB

建议:
  - 使用S3/R2存储
  - 设置7天过期策略
  - 压缩截图质量到80%
```

---

## 九、注意事项

### 9.1 安全考虑

```yaml
沙盒隔离:
  - 每个项目独立沙盒
  - 网络隔离，只能访问白名单域名
  - 文件系统隔离

资源限制:
  - 内存限制2GB
  - CPU限制
  - 执行超时30秒

敏感信息:
  - 不存储用户密码
  - 截图脱敏处理
```

### 9.2 性能优化

```yaml
缓存策略:
  - 复用浏览器实例
  - 缓存常用设备配置
  - 截图CDN加速

并发控制:
  - 同一项目串行执行
  - 全局并发限制
  - 队列管理
```

---

**配套文档**:
- [产品需求文档](./01-PRD-UPGRADE-v12.md)
- [技术架构文档](./02-ARCHITECTURE-UPGRADE-v12.md)
- [AI员工增强文档](./03-AI-EMPLOYEE-PRD-UPGRADE.md)
