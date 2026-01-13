# Thinkus AI自动验证闭环系统 - 技术架构文档

> **版本**: v1.0 | **日期**: 2026-01-15
>
> **核心**: Verify Subagents + 验证-修复闭环 + Browser集成

---

## 一、架构总览

### 1.1 系统架构

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                           代码变更事件                                       │
│                               │                                              │
│                               ▼                                              │
│  ┌───────────────────────────────────────────────────────────────────────┐  │
│  │                      Verify Orchestrator                               │  │
│  │                         (验证编排器)                                   │  │
│  │                                                                        │  │
│  │  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐  │  │
│  │  │ 变更分析器  │→ │ 验证选择器 │→ │ 验证执行器 │→ │ 结果处理器 │  │  │
│  │  └─────────────┘  └─────────────┘  └─────────────┘  └─────────────┘  │  │
│  └───────────────────────────────────┬───────────────────────────────────┘  │
│                                      │                                       │
│         ┌────────────────────────────┼────────────────────────────┐         │
│         │                            │                            │         │
│         ▼                            ▼                            ▼         │
│  ┌─────────────────┐      ┌─────────────────┐      ┌─────────────────┐     │
│  │  verify-build   │      │   verify-code   │      │   verify-ui     │     │
│  │                 │      │                 │      │                 │     │
│  │  • tsc          │      │  • jest/vitest  │      │  • playwright   │     │
│  │  • eslint       │      │  • supertest    │      │  • screenshot   │     │
│  │  • npm build    │      │  • 覆盖率       │      │  • 交互测试     │     │
│  └────────┬────────┘      └────────┬────────┘      └────────┬────────┘     │
│           │                        │                        │               │
│           └────────────────────────┴────────────────────────┘               │
│                                    │                                         │
│                                    ▼                                         │
│                         ┌─────────────────────┐                             │
│                         │  验证结果汇总       │                             │
│                         │                     │                             │
│                         │  全部通过? ─────────┼──→ 完成                     │
│                         │       │             │                             │
│                         │       No            │                             │
│                         │       ▼             │                             │
│                         │  ┌─────────────┐   │                             │
│                         │  │ 自动修复器  │   │                             │
│                         │  └──────┬──────┘   │                             │
│                         │         │          │                             │
│                         │         ▼          │                             │
│                         │    重新验证 ←──────┘                             │
│                         └─────────────────────┘                             │
│                                                                              │
└──────────────────────────────────────────────────────────────────────────────┘
```

---

## 二、核心数据模型

### 2.1 TypeScript 类型定义

```typescript
// src/verify/types.ts

/**
 * 验证类型
 */
type VerifyType = 
  | 'typescript'    // TypeScript类型检查
  | 'eslint'        // ESLint代码检查
  | 'build'         // 构建验证
  | 'unit-test'     // 单元测试
  | 'api-test'      // API测试
  | 'ui-visual'     // UI视觉验证
  | 'ui-interaction'// UI交互测试
  | 'e2e'           // E2E测试

/**
 * 验证状态
 */
type VerifyStatus = 'pending' | 'running' | 'passed' | 'failed' | 'skipped'

/**
 * 单个验证结果
 */
interface VerifyResult {
  type: VerifyType
  status: VerifyStatus
  duration: number
  
  // 成功时
  message?: string
  
  // 失败时
  error?: {
    code: string
    message: string
    file?: string
    line?: number
    column?: number
    snippet?: string
    suggestion?: string
  }
  
  // 额外数据
  data?: {
    coverage?: number
    screenshots?: string[]
    logs?: string[]
  }
}

/**
 * 验证轮次
 */
interface VerifyRound {
  round: number
  results: VerifyResult[]
  allPassed: boolean
  fixAttempted?: boolean
  fixDescription?: string
  timestamp: Date
}

/**
 * 完整验证会话
 */
interface VerifySession {
  id: string
  projectId: string
  triggeredBy: 'auto' | 'manual' | 'subagent'
  
  // 变更信息
  changes: FileChange[]
  
  // 验证轮次
  rounds: VerifyRound[]
  
  // 最终状态
  finalStatus: 'passed' | 'failed' | 'max-retries-exceeded'
  
  // 统计
  totalDuration: number
  fixesApplied: number
  
  timestamps: {
    started: Date
    completed?: Date
  }
}

/**
 * 文件变更
 */
interface FileChange {
  path: string
  type: 'added' | 'modified' | 'deleted'
  category: 'backend' | 'frontend' | 'config' | 'style' | 'test' | 'other'
}

/**
 * 验证配置
 */
interface VerifyConfig {
  mode: 'auto' | 'smart' | 'manual'
  
  enabledChecks: {
    typescript: boolean
    eslint: boolean
    build: boolean
    unitTest: boolean
    apiTest: boolean
    uiVisual: boolean
    uiInteraction: boolean
    e2e: boolean
  }
  
  autoFix: {
    enabled: boolean
    maxRounds: number
    pauseOnFailure: boolean
  }
  
  timeout: {
    build: number
    test: number
    ui: number
  }
}
```

---

## 三、Verify Orchestrator (验证编排器)

```typescript
// src/verify/VerifyOrchestrator.ts

class VerifyOrchestrator {
  constructor(
    private changeAnalyzer: ChangeAnalyzer,
    private verifyBuild: VerifyBuildService,
    private verifyCode: VerifyCodeService,
    private verifyUI: VerifyUIService,
    private autoFixer: AutoFixerService,
    private realtimeStream: RealtimeStreamService,
    private claude: ClaudeClient
  ) {}
  
  /**
   * 执行验证闭环
   */
  async verify(
    projectId: string,
    changes: FileChange[],
    config: VerifyConfig
  ): Promise<VerifySession> {
    const sessionId = generateId('verify')
    const session: VerifySession = {
      id: sessionId,
      projectId,
      triggeredBy: 'auto',
      changes,
      rounds: [],
      finalStatus: 'passed',
      totalDuration: 0,
      fixesApplied: 0,
      timestamps: { started: new Date() }
    }
    
    // 通知前端: 验证开始
    await this.realtimeStream.emit(projectId, {
      type: 'verify_start',
      data: { sessionId, changes }
    })
    
    let round = 0
    const maxRounds = config.autoFix.maxRounds || 3
    
    while (round < maxRounds) {
      round++
      
      // 1. 分析变更，决定验证项
      const verifyTypes = this.changeAnalyzer.analyze(changes, config)
      
      // 2. 执行验证
      const results = await this.executeVerifications(
        projectId,
        verifyTypes,
        config
      )
      
      // 记录本轮结果
      const roundResult: VerifyRound = {
        round,
        results,
        allPassed: results.every(r => r.status === 'passed'),
        timestamp: new Date()
      }
      session.rounds.push(roundResult)
      
      // 通知前端: 本轮结果
      await this.realtimeStream.emit(projectId, {
        type: 'verify_round_complete',
        data: { round, results, allPassed: roundResult.allPassed }
      })
      
      // 3. 全部通过，结束
      if (roundResult.allPassed) {
        session.finalStatus = 'passed'
        break
      }
      
      // 4. 有失败，尝试修复
      if (!config.autoFix.enabled) {
        session.finalStatus = 'failed'
        break
      }
      
      // 检查是否达到最大轮次
      if (round >= maxRounds) {
        session.finalStatus = 'max-retries-exceeded'
        break
      }
      
      // 通知前端: 开始修复
      await this.realtimeStream.emit(projectId, {
        type: 'verify_fixing',
        data: { round, failures: results.filter(r => r.status === 'failed') }
      })
      
      // 5. 执行自动修复
      const failedResults = results.filter(r => r.status === 'failed')
      const fixResult = await this.autoFixer.fix(projectId, failedResults)
      
      if (!fixResult.success) {
        session.finalStatus = 'failed'
        if (config.autoFix.pauseOnFailure) {
          // 通知用户需要人工介入
          await this.realtimeStream.emit(projectId, {
            type: 'verify_needs_human',
            data: { failures: failedResults, fixAttempt: fixResult }
          })
        }
        break
      }
      
      roundResult.fixAttempted = true
      roundResult.fixDescription = fixResult.description
      session.fixesApplied++
      
      // 继续下一轮验证
    }
    
    // 完成
    session.timestamps.completed = new Date()
    session.totalDuration = Date.now() - session.timestamps.started.getTime()
    
    // 通知前端: 验证完成
    await this.realtimeStream.emit(projectId, {
      type: 'verify_complete',
      data: {
        sessionId,
        finalStatus: session.finalStatus,
        rounds: session.rounds.length,
        fixesApplied: session.fixesApplied,
        duration: session.totalDuration
      }
    })
    
    return session
  }
  
  /**
   * 执行多个验证
   */
  private async executeVerifications(
    projectId: string,
    verifyTypes: VerifyType[],
    config: VerifyConfig
  ): Promise<VerifyResult[]> {
    const results: VerifyResult[] = []
    
    // 按优先级排序: build > code > ui
    const orderedTypes = this.orderByPriority(verifyTypes)
    
    for (const type of orderedTypes) {
      // 通知前端: 单项验证开始
      await this.realtimeStream.emit(projectId, {
        type: 'verify_item_start',
        data: { verifyType: type }
      })
      
      const startTime = Date.now()
      let result: VerifyResult
      
      try {
        switch (type) {
          case 'typescript':
            result = await this.verifyBuild.checkTypes(projectId, config.timeout.build)
            break
          case 'eslint':
            result = await this.verifyBuild.lint(projectId, config.timeout.build)
            break
          case 'build':
            result = await this.verifyBuild.build(projectId, config.timeout.build)
            break
          case 'unit-test':
            result = await this.verifyCode.runUnitTests(projectId, config.timeout.test)
            break
          case 'api-test':
            result = await this.verifyCode.runApiTests(projectId, config.timeout.test)
            break
          case 'ui-visual':
            result = await this.verifyUI.checkVisual(projectId, config.timeout.ui)
            break
          case 'ui-interaction':
            result = await this.verifyUI.checkInteraction(projectId, config.timeout.ui)
            break
          case 'e2e':
            result = await this.verifyUI.runE2E(projectId, config.timeout.ui)
            break
          default:
            result = { type, status: 'skipped', duration: 0 }
        }
      } catch (error) {
        result = {
          type,
          status: 'failed',
          duration: Date.now() - startTime,
          error: {
            code: 'EXECUTION_ERROR',
            message: error.message
          }
        }
      }
      
      result.duration = Date.now() - startTime
      results.push(result)
      
      // 通知前端: 单项验证完成
      await this.realtimeStream.emit(projectId, {
        type: 'verify_item_complete',
        data: { verifyType: type, result }
      })
      
      // 如果构建失败，跳过后续测试
      if (['typescript', 'build'].includes(type) && result.status === 'failed') {
        // 标记后续为skipped
        const remaining = orderedTypes.slice(orderedTypes.indexOf(type) + 1)
        for (const skipType of remaining) {
          results.push({
            type: skipType,
            status: 'skipped',
            duration: 0,
            message: `Skipped due to ${type} failure`
          })
        }
        break
      }
    }
    
    return results
  }
  
  /**
   * 按优先级排序验证类型
   */
  private orderByPriority(types: VerifyType[]): VerifyType[] {
    const priority: Record<VerifyType, number> = {
      'typescript': 1,
      'eslint': 2,
      'build': 3,
      'unit-test': 4,
      'api-test': 5,
      'ui-visual': 6,
      'ui-interaction': 7,
      'e2e': 8
    }
    
    return [...types].sort((a, b) => priority[a] - priority[b])
  }
}
```

---

## 四、Change Analyzer (变更分析器)

```typescript
// src/verify/ChangeAnalyzer.ts

class ChangeAnalyzer {
  /**
   * 分析变更，决定需要哪些验证
   */
  analyze(changes: FileChange[], config: VerifyConfig): VerifyType[] {
    const types = new Set<VerifyType>()
    
    for (const change of changes) {
      const fileTypes = this.getVerifyTypesForFile(change)
      fileTypes.forEach(t => types.add(t))
    }
    
    // 过滤掉未启用的验证
    return Array.from(types).filter(type => {
      switch (type) {
        case 'typescript': return config.enabledChecks.typescript
        case 'eslint': return config.enabledChecks.eslint
        case 'build': return config.enabledChecks.build
        case 'unit-test': return config.enabledChecks.unitTest
        case 'api-test': return config.enabledChecks.apiTest
        case 'ui-visual': return config.enabledChecks.uiVisual
        case 'ui-interaction': return config.enabledChecks.uiInteraction
        case 'e2e': return config.enabledChecks.e2e
        default: return false
      }
    })
  }
  
  /**
   * 根据文件路径判断需要的验证类型
   */
  private getVerifyTypesForFile(change: FileChange): VerifyType[] {
    const { path } = change
    const types: VerifyType[] = []
    
    // TypeScript/JavaScript文件
    if (/\.(ts|tsx|js|jsx)$/.test(path)) {
      types.push('typescript', 'eslint', 'build')
      
      // 后端文件
      if (this.isBackendFile(path)) {
        types.push('unit-test')
        if (this.isApiFile(path)) {
          types.push('api-test')
        }
      }
      
      // 前端文件
      if (this.isFrontendFile(path)) {
        types.push('unit-test')
        if (this.isPageFile(path)) {
          types.push('ui-visual')
        }
        if (this.isInteractiveComponent(path)) {
          types.push('ui-interaction')
        }
      }
    }
    
    // 样式文件
    if (/\.(css|scss|sass|less)$/.test(path) || path.includes('tailwind')) {
      types.push('build', 'ui-visual')
    }
    
    // 配置文件
    if (this.isConfigFile(path)) {
      types.push('build', 'typescript')
    }
    
    // 数据库文件
    if (path.includes('prisma') || path.includes('migration')) {
      types.push('build')
    }
    
    // 测试文件变更
    if (this.isTestFile(path)) {
      types.push('unit-test')
    }
    
    return [...new Set(types)]
  }
  
  private isBackendFile(path: string): boolean {
    return /\/(api|server|lib|services|utils)\//.test(path) ||
           path.includes('route.ts') ||
           path.includes('.server.')
  }
  
  private isFrontendFile(path: string): boolean {
    return /\/(components|app|pages|views)\//.test(path) ||
           path.endsWith('.tsx') ||
           path.includes('.client.')
  }
  
  private isApiFile(path: string): boolean {
    return path.includes('/api/') || path.includes('route.ts')
  }
  
  private isPageFile(path: string): boolean {
    return path.includes('page.tsx') || path.includes('/pages/')
  }
  
  private isInteractiveComponent(path: string): boolean {
    const interactivePatterns = [
      'form', 'button', 'input', 'modal', 'dialog',
      'dropdown', 'select', 'checkbox', 'radio'
    ]
    const lowerPath = path.toLowerCase()
    return interactivePatterns.some(p => lowerPath.includes(p))
  }
  
  private isConfigFile(path: string): boolean {
    return /^(package|tsconfig|next\.config|tailwind\.config|\.eslint)/.test(
      path.split('/').pop() || ''
    )
  }
  
  private isTestFile(path: string): boolean {
    return /\.(test|spec)\.(ts|tsx|js|jsx)$/.test(path) ||
           path.includes('__tests__')
  }
}
```

---

## 五、Verify Services (验证服务)

### 5.1 VerifyBuildService

```typescript
// src/verify/services/VerifyBuildService.ts

class VerifyBuildService {
  constructor(private sandboxManager: SandboxManager) {}
  
  /**
   * TypeScript类型检查
   */
  async checkTypes(projectId: string, timeout: number): Promise<VerifyResult> {
    const startTime = Date.now()
    
    try {
      const result = await this.sandboxManager.exec(projectId, 'npx tsc --noEmit', {
        timeout
      })
      
      if (result.exitCode === 0) {
        return {
          type: 'typescript',
          status: 'passed',
          duration: Date.now() - startTime,
          message: 'No type errors found'
        }
      }
      
      // 解析TypeScript错误
      const error = this.parseTypeScriptError(result.stderr || result.stdout)
      
      return {
        type: 'typescript',
        status: 'failed',
        duration: Date.now() - startTime,
        error
      }
    } catch (e) {
      return {
        type: 'typescript',
        status: 'failed',
        duration: Date.now() - startTime,
        error: { code: 'TIMEOUT', message: 'Type checking timed out' }
      }
    }
  }
  
  /**
   * ESLint检查
   */
  async lint(projectId: string, timeout: number): Promise<VerifyResult> {
    const startTime = Date.now()
    
    try {
      const result = await this.sandboxManager.exec(projectId, 'npx eslint . --ext .ts,.tsx --format json', {
        timeout
      })
      
      if (result.exitCode === 0) {
        return {
          type: 'eslint',
          status: 'passed',
          duration: Date.now() - startTime,
          message: 'No linting errors'
        }
      }
      
      const errors = JSON.parse(result.stdout || '[]')
      const firstError = errors.find((e: any) => e.errorCount > 0)
      
      if (firstError) {
        const msg = firstError.messages[0]
        return {
          type: 'eslint',
          status: 'failed',
          duration: Date.now() - startTime,
          error: {
            code: msg.ruleId || 'LINT_ERROR',
            message: msg.message,
            file: firstError.filePath,
            line: msg.line,
            column: msg.column
          }
        }
      }
      
      return {
        type: 'eslint',
        status: 'passed',
        duration: Date.now() - startTime
      }
    } catch (e) {
      return {
        type: 'eslint',
        status: 'failed',
        duration: Date.now() - startTime,
        error: { code: 'EXECUTION_ERROR', message: e.message }
      }
    }
  }
  
  /**
   * 构建验证
   */
  async build(projectId: string, timeout: number): Promise<VerifyResult> {
    const startTime = Date.now()
    
    try {
      const result = await this.sandboxManager.exec(projectId, 'npm run build', {
        timeout
      })
      
      if (result.exitCode === 0) {
        return {
          type: 'build',
          status: 'passed',
          duration: Date.now() - startTime,
          message: 'Build successful'
        }
      }
      
      const error = this.parseBuildError(result.stderr || result.stdout)
      
      return {
        type: 'build',
        status: 'failed',
        duration: Date.now() - startTime,
        error
      }
    } catch (e) {
      return {
        type: 'build',
        status: 'failed',
        duration: Date.now() - startTime,
        error: { code: 'TIMEOUT', message: 'Build timed out' }
      }
    }
  }
  
  /**
   * 解析TypeScript错误
   */
  private parseTypeScriptError(output: string): VerifyResult['error'] {
    // 匹配 TS 错误格式: path(line,col): error TS2xxx: message
    const match = output.match(/(.+?)\((\d+),(\d+)\): error (TS\d+): (.+)/)
    
    if (match) {
      return {
        code: match[4],
        message: match[5],
        file: match[1],
        line: parseInt(match[2]),
        column: parseInt(match[3])
      }
    }
    
    return {
      code: 'TS_ERROR',
      message: output.split('\n')[0] || 'TypeScript error'
    }
  }
  
  /**
   * 解析构建错误
   */
  private parseBuildError(output: string): VerifyResult['error'] {
    // 尝试匹配常见错误格式
    const lines = output.split('\n')
    
    // Next.js 错误
    const nextError = lines.find(l => l.includes('Error:'))
    if (nextError) {
      return {
        code: 'BUILD_ERROR',
        message: nextError.replace(/.*Error:\s*/, '')
      }
    }
    
    // 模块未找到
    const moduleError = lines.find(l => l.includes("Cannot find module"))
    if (moduleError) {
      const match = moduleError.match(/Cannot find module '(.+?)'/)
      return {
        code: 'MODULE_NOT_FOUND',
        message: `Cannot find module '${match?.[1] || 'unknown'}'`,
        suggestion: `Try running: npm install ${match?.[1]}`
      }
    }
    
    return {
      code: 'BUILD_ERROR',
      message: lines.slice(0, 3).join('\n')
    }
  }
}
```

### 5.2 VerifyCodeService

```typescript
// src/verify/services/VerifyCodeService.ts

class VerifyCodeService {
  constructor(private sandboxManager: SandboxManager) {}
  
  /**
   * 运行单元测试
   */
  async runUnitTests(projectId: string, timeout: number): Promise<VerifyResult> {
    const startTime = Date.now()
    
    try {
      // 检测测试框架
      const framework = await this.detectTestFramework(projectId)
      const cmd = framework === 'jest' 
        ? 'npx jest --json --passWithNoTests'
        : 'npx vitest run --reporter=json'
      
      const result = await this.sandboxManager.exec(projectId, cmd, { timeout })
      
      if (result.exitCode === 0) {
        const summary = this.parseTestSummary(result.stdout, framework)
        return {
          type: 'unit-test',
          status: 'passed',
          duration: Date.now() - startTime,
          message: `${summary.passed} tests passed`,
          data: { coverage: summary.coverage }
        }
      }
      
      const failure = this.parseTestFailure(result.stdout, framework)
      
      return {
        type: 'unit-test',
        status: 'failed',
        duration: Date.now() - startTime,
        error: failure
      }
    } catch (e) {
      return {
        type: 'unit-test',
        status: 'failed',
        duration: Date.now() - startTime,
        error: { code: 'EXECUTION_ERROR', message: e.message }
      }
    }
  }
  
  /**
   * 运行API测试
   */
  async runApiTests(projectId: string, timeout: number): Promise<VerifyResult> {
    const startTime = Date.now()
    
    try {
      // 启动开发服务器
      await this.sandboxManager.exec(projectId, 'npm run dev &', {
        background: true
      })
      
      // 等待服务器启动
      await this.waitForServer(projectId, 3000, 30000)
      
      // 运行API测试
      const result = await this.sandboxManager.exec(
        projectId,
        'npx jest --testPathPattern="api|route" --json',
        { timeout }
      )
      
      // 停止服务器
      await this.sandboxManager.exec(projectId, 'pkill -f "next dev"')
      
      if (result.exitCode === 0) {
        return {
          type: 'api-test',
          status: 'passed',
          duration: Date.now() - startTime,
          message: 'All API tests passed'
        }
      }
      
      const failure = this.parseTestFailure(result.stdout, 'jest')
      
      return {
        type: 'api-test',
        status: 'failed',
        duration: Date.now() - startTime,
        error: failure
      }
    } catch (e) {
      return {
        type: 'api-test',
        status: 'failed',
        duration: Date.now() - startTime,
        error: { code: 'EXECUTION_ERROR', message: e.message }
      }
    }
  }
  
  /**
   * 检测测试框架
   */
  private async detectTestFramework(projectId: string): Promise<'jest' | 'vitest'> {
    const pkgResult = await this.sandboxManager.exec(projectId, 'cat package.json')
    const pkg = JSON.parse(pkgResult.stdout || '{}')
    
    if (pkg.devDependencies?.vitest || pkg.dependencies?.vitest) {
      return 'vitest'
    }
    return 'jest'
  }
  
  /**
   * 等待服务器启动
   */
  private async waitForServer(
    projectId: string,
    port: number,
    timeout: number
  ): Promise<void> {
    const start = Date.now()
    
    while (Date.now() - start < timeout) {
      try {
        const result = await this.sandboxManager.exec(
          projectId,
          `curl -s -o /dev/null -w "%{http_code}" http://localhost:${port}`
        )
        if (result.stdout === '200' || result.stdout === '404') {
          return
        }
      } catch {}
      await sleep(500)
    }
    
    throw new Error(`Server did not start within ${timeout}ms`)
  }
  
  /**
   * 解析测试汇总
   */
  private parseTestSummary(
    output: string,
    framework: 'jest' | 'vitest'
  ): { passed: number; failed: number; coverage?: number } {
    try {
      const json = JSON.parse(output)
      if (framework === 'jest') {
        return {
          passed: json.numPassedTests || 0,
          failed: json.numFailedTests || 0,
          coverage: json.coverageMap ? this.calculateCoverage(json.coverageMap) : undefined
        }
      } else {
        return {
          passed: json.numPassedTests || 0,
          failed: json.numFailedTests || 0
        }
      }
    } catch {
      return { passed: 0, failed: 0 }
    }
  }
  
  /**
   * 解析测试失败
   */
  private parseTestFailure(
    output: string,
    framework: 'jest' | 'vitest'
  ): VerifyResult['error'] {
    try {
      const json = JSON.parse(output)
      
      if (framework === 'jest') {
        const failed = json.testResults?.find((t: any) => 
          t.status === 'failed'
        )
        
        if (failed) {
          const assertion = failed.assertionResults?.find((a: any) => 
            a.status === 'failed'
          )
          
          return {
            code: 'TEST_FAILED',
            message: assertion?.failureMessages?.[0] || failed.message,
            file: failed.name
          }
        }
      }
      
      return {
        code: 'TEST_FAILED',
        message: 'Test failed'
      }
    } catch {
      // 解析文本格式错误
      const match = output.match(/FAIL\s+(.+?)\n[\s\S]*?●\s+(.+?)\n\n([\s\S]*?)(?=\n\n|$)/)
      
      if (match) {
        return {
          code: 'TEST_FAILED',
          message: match[2],
          file: match[1],
          snippet: match[3]
        }
      }
      
      return {
        code: 'TEST_FAILED',
        message: output.split('\n').slice(0, 5).join('\n')
      }
    }
  }
  
  private calculateCoverage(coverageMap: any): number {
    // 简单计算平均覆盖率
    let total = 0
    let count = 0
    
    for (const file of Object.values(coverageMap) as any[]) {
      if (file.s) {
        const statements = Object.values(file.s) as number[]
        const covered = statements.filter(s => s > 0).length
        total += (covered / statements.length) * 100
        count++
      }
    }
    
    return count > 0 ? Math.round(total / count) : 0
  }
}
```

### 5.3 VerifyUIService

```typescript
// src/verify/services/VerifyUIService.ts

class VerifyUIService {
  constructor(
    private sandboxManager: SandboxManager,
    private browserService: BrowserService,
    private storageService: StorageService
  ) {}
  
  /**
   * 视觉验证
   */
  async checkVisual(projectId: string, timeout: number): Promise<VerifyResult> {
    const startTime = Date.now()
    
    try {
      // 1. 启动开发服务器
      await this.startDevServer(projectId)
      
      // 2. 等待服务器就绪
      await this.waitForServer(projectId, 3000, 30000)
      
      // 3. 打开浏览器
      await this.browserService.open(projectId, 'http://localhost:3000')
      
      // 4. 多设备截图
      const screenshots: string[] = []
      const devices = ['desktop', 'tablet', 'mobile']
      
      for (const device of devices) {
        const screenshot = await this.browserService.screenshot(projectId, { device })
        screenshots.push(screenshot)
      }
      
      // 5. 关闭服务器
      await this.stopDevServer(projectId)
      
      // 6. 如果有之前的截图，进行对比
      const previousScreenshots = await this.storageService.getPreviousScreenshots(projectId)
      
      if (previousScreenshots.length > 0) {
        const diff = await this.compareScreenshots(screenshots, previousScreenshots)
        
        if (diff.hasMajorChanges) {
          return {
            type: 'ui-visual',
            status: 'failed',
            duration: Date.now() - startTime,
            error: {
              code: 'VISUAL_DIFF',
              message: `Visual differences detected: ${diff.description}`
            },
            data: { screenshots }
          }
        }
      }
      
      // 保存当前截图作为基准
      await this.storageService.saveScreenshots(projectId, screenshots)
      
      return {
        type: 'ui-visual',
        status: 'passed',
        duration: Date.now() - startTime,
        message: 'Visual check passed',
        data: { screenshots }
      }
    } catch (e) {
      return {
        type: 'ui-visual',
        status: 'failed',
        duration: Date.now() - startTime,
        error: { code: 'EXECUTION_ERROR', message: e.message }
      }
    }
  }
  
  /**
   * 交互测试
   */
  async checkInteraction(projectId: string, timeout: number): Promise<VerifyResult> {
    const startTime = Date.now()
    
    try {
      // 启动服务器
      await this.startDevServer(projectId)
      await this.waitForServer(projectId, 3000, 30000)
      
      // 打开浏览器
      await this.browserService.open(projectId, 'http://localhost:3000')
      
      // 获取页面快照，分析可交互元素
      const snapshot = await this.browserService.getSnapshot(projectId, { interactive: true })
      
      // 测试关键交互
      const interactionResults: Array<{ element: string; action: string; success: boolean; error?: string }> = []
      
      // 测试所有按钮
      for (const button of snapshot.buttons || []) {
        try {
          await this.browserService.action(projectId, 'click', button.ref)
          await sleep(500)
          interactionResults.push({ element: button.text, action: 'click', success: true })
        } catch (e) {
          interactionResults.push({ 
            element: button.text, 
            action: 'click', 
            success: false, 
            error: e.message 
          })
        }
      }
      
      // 测试表单输入
      for (const input of snapshot.inputs || []) {
        try {
          await this.browserService.action(projectId, 'fill', input.ref, 'test value')
          interactionResults.push({ element: input.name || 'input', action: 'fill', success: true })
        } catch (e) {
          interactionResults.push({ 
            element: input.name || 'input', 
            action: 'fill', 
            success: false, 
            error: e.message 
          })
        }
      }
      
      // 关闭服务器
      await this.stopDevServer(projectId)
      
      // 检查结果
      const failures = interactionResults.filter(r => !r.success)
      
      if (failures.length > 0) {
        return {
          type: 'ui-interaction',
          status: 'failed',
          duration: Date.now() - startTime,
          error: {
            code: 'INTERACTION_FAILED',
            message: `${failures.length} interactions failed: ${failures.map(f => f.element).join(', ')}`
          }
        }
      }
      
      return {
        type: 'ui-interaction',
        status: 'passed',
        duration: Date.now() - startTime,
        message: `${interactionResults.length} interactions tested successfully`
      }
    } catch (e) {
      return {
        type: 'ui-interaction',
        status: 'failed',
        duration: Date.now() - startTime,
        error: { code: 'EXECUTION_ERROR', message: e.message }
      }
    }
  }
  
  /**
   * E2E测试
   */
  async runE2E(projectId: string, timeout: number): Promise<VerifyResult> {
    const startTime = Date.now()
    
    try {
      // 检查是否有Playwright测试
      const hasTests = await this.sandboxManager.exec(
        projectId,
        'ls tests/*.spec.ts e2e/*.spec.ts 2>/dev/null | head -1'
      )
      
      if (!hasTests.stdout) {
        return {
          type: 'e2e',
          status: 'skipped',
          duration: 0,
          message: 'No E2E tests found'
        }
      }
      
      // 运行Playwright测试
      const result = await this.sandboxManager.exec(
        projectId,
        'npx playwright test --reporter=json',
        { timeout }
      )
      
      if (result.exitCode === 0) {
        return {
          type: 'e2e',
          status: 'passed',
          duration: Date.now() - startTime,
          message: 'All E2E tests passed'
        }
      }
      
      // 解析失败
      const json = JSON.parse(result.stdout || '{}')
      const failure = json.suites?.[0]?.specs?.find((s: any) => !s.ok)
      
      return {
        type: 'e2e',
        status: 'failed',
        duration: Date.now() - startTime,
        error: {
          code: 'E2E_FAILED',
          message: failure?.title || 'E2E test failed',
          file: failure?.file
        }
      }
    } catch (e) {
      return {
        type: 'e2e',
        status: 'failed',
        duration: Date.now() - startTime,
        error: { code: 'EXECUTION_ERROR', message: e.message }
      }
    }
  }
  
  private async startDevServer(projectId: string): Promise<void> {
    await this.sandboxManager.exec(projectId, 'npm run dev &', { background: true })
  }
  
  private async stopDevServer(projectId: string): Promise<void> {
    await this.sandboxManager.exec(projectId, 'pkill -f "next dev" || true')
  }
  
  private async waitForServer(projectId: string, port: number, timeout: number): Promise<void> {
    const start = Date.now()
    while (Date.now() - start < timeout) {
      try {
        const result = await this.sandboxManager.exec(
          projectId,
          `curl -s -o /dev/null -w "%{http_code}" http://localhost:${port}`
        )
        if (['200', '404'].includes(result.stdout)) return
      } catch {}
      await sleep(500)
    }
    throw new Error('Server start timeout')
  }
  
  private async compareScreenshots(
    current: string[],
    previous: string[]
  ): Promise<{ hasMajorChanges: boolean; description: string }> {
    // 使用像素对比或AI分析
    // 简化实现：返回无重大变化
    return { hasMajorChanges: false, description: '' }
  }
}
```

---

## 六、Auto Fixer (自动修复器)

```typescript
// src/verify/AutoFixer.ts

interface FixResult {
  success: boolean
  description: string
  filesModified: string[]
}

class AutoFixerService {
  constructor(
    private claude: ClaudeClient,
    private sandboxManager: SandboxManager,
    private codeEditor: CodeEditorService
  ) {}
  
  /**
   * 尝试自动修复失败的验证
   */
  async fix(projectId: string, failures: VerifyResult[]): Promise<FixResult> {
    // 1. 分析所有失败，生成修复计划
    const fixPlan = await this.analyzeFailures(failures)
    
    if (!fixPlan.canFix) {
      return {
        success: false,
        description: fixPlan.reason || 'Cannot auto-fix these errors',
        filesModified: []
      }
    }
    
    // 2. 执行修复
    const filesModified: string[] = []
    
    for (const fix of fixPlan.fixes) {
      try {
        await this.applyFix(projectId, fix)
        filesModified.push(fix.file)
      } catch (e) {
        return {
          success: false,
          description: `Failed to apply fix to ${fix.file}: ${e.message}`,
          filesModified
        }
      }
    }
    
    return {
      success: true,
      description: fixPlan.description,
      filesModified
    }
  }
  
  /**
   * 分析失败并生成修复计划
   */
  private async analyzeFailures(failures: VerifyResult[]): Promise<{
    canFix: boolean
    reason?: string
    description: string
    fixes: Array<{
      file: string
      action: 'modify' | 'create' | 'delete'
      changes: string
    }>
  }> {
    const failureDescriptions = failures.map(f => `
Type: ${f.type}
Error Code: ${f.error?.code}
Message: ${f.error?.message}
File: ${f.error?.file || 'unknown'}
Line: ${f.error?.line || 'unknown'}
Snippet: ${f.error?.snippet || 'N/A'}
Suggestion: ${f.error?.suggestion || 'N/A'}
`).join('\n---\n')
    
    const response = await this.claude.messages.create({
      model: 'claude-3-5-sonnet-20241022',
      max_tokens: 2000,
      messages: [{
        role: 'user',
        content: `分析以下验证失败并生成修复计划:

${failureDescriptions}

返回JSON格式:
{
  "canFix": true/false,
  "reason": "如果无法修复，说明原因",
  "description": "修复计划描述",
  "fixes": [
    {
      "file": "文件路径",
      "action": "modify|create|delete",
      "changes": "具体的修改内容或代码"
    }
  ]
}

规则:
1. 只修复明确的、有把握的问题
2. 如果问题不清晰或可能有多种解决方案，返回canFix: false
3. 修改应该最小化，只修复问题本身
4. 不要引入新的依赖（除非是修复缺失依赖的问题）`
      }]
    })
    
    try {
      return JSON.parse(response.content[0].text)
    } catch {
      return {
        canFix: false,
        reason: 'Failed to parse fix plan',
        description: '',
        fixes: []
      }
    }
  }
  
  /**
   * 应用单个修复
   */
  private async applyFix(
    projectId: string,
    fix: { file: string; action: string; changes: string }
  ): Promise<void> {
    switch (fix.action) {
      case 'modify':
        // 读取当前文件
        const content = await this.sandboxManager.readFile(projectId, fix.file)
        
        // 使用AI生成修改后的内容
        const modifiedContent = await this.applyChanges(content, fix.changes)
        
        // 写入文件
        await this.sandboxManager.writeFile(projectId, fix.file, modifiedContent)
        break
      
      case 'create':
        await this.sandboxManager.writeFile(projectId, fix.file, fix.changes)
        break
      
      case 'delete':
        await this.sandboxManager.deleteFile(projectId, fix.file)
        break
    }
  }
  
  /**
   * 应用修改到文件内容
   */
  private async applyChanges(originalContent: string, changes: string): Promise<string> {
    // 如果changes是完整的代码，直接返回
    if (changes.includes('import ') || changes.includes('export ')) {
      return changes
    }
    
    // 否则使用AI合并修改
    const response = await this.claude.messages.create({
      model: 'claude-3-5-sonnet-20241022',
      max_tokens: 4000,
      messages: [{
        role: 'user',
        content: `将以下修改应用到代码中:

原始代码:
\`\`\`
${originalContent}
\`\`\`

修改:
${changes}

返回修改后的完整代码，不要包含任何解释。`
      }]
    })
    
    // 提取代码块
    const codeMatch = response.content[0].text.match(/```[\w]*\n([\s\S]*?)\n```/)
    return codeMatch ? codeMatch[1] : response.content[0].text
  }
}
```

---

## 七、API 设计

```typescript
// POST /api/verify
// 手动触发验证
interface TriggerVerifyRequest {
  projectId: string
  config?: Partial<VerifyConfig>
}

interface TriggerVerifyResponse {
  sessionId: string
  status: 'started'
}

// GET /api/verify/:sessionId
// 获取验证会话状态
interface GetVerifySessionResponse {
  session: VerifySession
}

// GET /api/projects/:projectId/verify/config
// 获取项目验证配置
interface GetVerifyConfigResponse {
  config: VerifyConfig
}

// PUT /api/projects/:projectId/verify/config
// 更新项目验证配置
interface UpdateVerifyConfigRequest {
  config: Partial<VerifyConfig>
}

// WebSocket Events
type VerifyWebSocketEvent =
  | { type: 'verify_start'; data: { sessionId: string; changes: FileChange[] } }
  | { type: 'verify_item_start'; data: { verifyType: VerifyType } }
  | { type: 'verify_item_complete'; data: { verifyType: VerifyType; result: VerifyResult } }
  | { type: 'verify_round_complete'; data: { round: number; results: VerifyResult[]; allPassed: boolean } }
  | { type: 'verify_fixing'; data: { round: number; failures: VerifyResult[] } }
  | { type: 'verify_needs_human'; data: { failures: VerifyResult[]; fixAttempt: FixResult } }
  | { type: 'verify_complete'; data: { sessionId: string; finalStatus: string; rounds: number; fixesApplied: number; duration: number } }
```

---

## 八、开发计划

### P0: 核心验证 (2周)

| 任务 | 工作量 |
|------|--------|
| VerifyOrchestrator | 3天 |
| ChangeAnalyzer | 1天 |
| VerifyBuildService | 2天 |
| VerifyCodeService | 2天 |
| AutoFixerService | 2天 |

### P1: UI验证 (1周)

| 任务 | 工作量 |
|------|--------|
| VerifyUIService | 3天 |
| Browser集成 | 2天 |

### P2: 配置和报告 (1周)

| 任务 | 工作量 |
|------|--------|
| 验证配置UI | 2天 |
| 验证报告展示 | 2天 |
| WebSocket事件 | 1天 |

---

**配套文档**: [自动验证闭环PRD](./08-AUTO-VERIFY-PRD.md)
