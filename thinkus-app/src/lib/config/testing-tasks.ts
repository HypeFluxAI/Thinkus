/**
 * 自动化测试任务配置
 *
 * 开发完成前必须通过所有测试，确保产品质量
 * 测试在容器环境中执行，包括浏览器自动化测试
 */

export type TestStatus =
  | 'pending'    // 等待执行
  | 'running'    // 执行中
  | 'passed'     // 通过
  | 'failed'     // 失败
  | 'skipped'    // 跳过

export type TestCategory =
  | 'unit'        // 单元测试
  | 'integration' // 集成测试
  | 'e2e'         // 端到端测试（浏览器自动化）
  | 'api'         // API 测试
  | 'performance' // 性能测试
  | 'security'    // 安全测试
  | 'accessibility' // 无障碍测试
  | 'log'         // 日志检查

export interface TestCase {
  id: string
  name: string
  description: string
  category: TestCategory
  priority: 'critical' | 'high' | 'medium' | 'low'
  automated: boolean
  estimatedSeconds: number
}

export interface TestSuite {
  id: string
  name: string
  description: string
  category: TestCategory
  testCases: TestCase[]
  // 是否必须全部通过才能继续
  blocking: boolean
}

export interface TestResult {
  testId: string
  status: TestStatus
  duration: number
  logs: string[]
  screenshots?: string[]  // E2E测试截图
  errorMessage?: string
  timestamp: Date
}

export interface TestReport {
  projectId: string
  startTime: Date
  endTime?: Date
  totalTests: number
  passed: number
  failed: number
  skipped: number
  suites: {
    suiteId: string
    results: TestResult[]
  }[]
  overallStatus: 'passed' | 'failed' | 'running'
  canProceed: boolean  // 是否可以进入下一阶段
}

/**
 * 标准测试套件模板
 */
export const STANDARD_TEST_SUITES: TestSuite[] = [
  // 1. 单元测试
  {
    id: 'unit-tests',
    name: '单元测试',
    description: '测试各个组件和函数的独立功能',
    category: 'unit',
    blocking: true,
    testCases: [
      {
        id: 'unit-components',
        name: '组件渲染测试',
        description: '验证所有React组件能正确渲染',
        category: 'unit',
        priority: 'critical',
        automated: true,
        estimatedSeconds: 30,
      },
      {
        id: 'unit-utils',
        name: '工具函数测试',
        description: '验证工具函数的输入输出',
        category: 'unit',
        priority: 'high',
        automated: true,
        estimatedSeconds: 15,
      },
      {
        id: 'unit-hooks',
        name: 'Hooks 测试',
        description: '验证自定义 Hooks 行为正确',
        category: 'unit',
        priority: 'high',
        automated: true,
        estimatedSeconds: 20,
      },
    ],
  },

  // 2. API 测试
  {
    id: 'api-tests',
    name: 'API 接口测试',
    description: '测试所有后端 API 接口',
    category: 'api',
    blocking: true,
    testCases: [
      {
        id: 'api-auth',
        name: '认证接口测试',
        description: '测试登录、注册、登出接口',
        category: 'api',
        priority: 'critical',
        automated: true,
        estimatedSeconds: 20,
      },
      {
        id: 'api-crud',
        name: 'CRUD 接口测试',
        description: '测试数据增删改查接口',
        category: 'api',
        priority: 'critical',
        automated: true,
        estimatedSeconds: 30,
      },
      {
        id: 'api-error-handling',
        name: '错误处理测试',
        description: '测试接口错误响应和边界情况',
        category: 'api',
        priority: 'high',
        automated: true,
        estimatedSeconds: 25,
      },
      {
        id: 'api-validation',
        name: '参数验证测试',
        description: '测试接口参数校验',
        category: 'api',
        priority: 'high',
        automated: true,
        estimatedSeconds: 20,
      },
    ],
  },

  // 3. 集成测试
  {
    id: 'integration-tests',
    name: '集成测试',
    description: '测试多个模块协同工作',
    category: 'integration',
    blocking: true,
    testCases: [
      {
        id: 'int-auth-flow',
        name: '认证流程集成',
        description: '测试完整的注册→登录→访问受保护页面流程',
        category: 'integration',
        priority: 'critical',
        automated: true,
        estimatedSeconds: 30,
      },
      {
        id: 'int-data-flow',
        name: '数据流集成',
        description: '测试前端→API→数据库的完整数据流',
        category: 'integration',
        priority: 'critical',
        automated: true,
        estimatedSeconds: 40,
      },
      {
        id: 'int-third-party',
        name: '第三方服务集成',
        description: '测试与第三方服务的集成（模拟模式）',
        category: 'integration',
        priority: 'high',
        automated: true,
        estimatedSeconds: 25,
      },
    ],
  },

  // 4. E2E 测试（浏览器自动化）
  {
    id: 'e2e-tests',
    name: '端到端测试',
    description: '在真实浏览器中自动化测试用户流程',
    category: 'e2e',
    blocking: true,
    testCases: [
      {
        id: 'e2e-homepage',
        name: '首页加载测试',
        description: '验证首页正确加载，无控制台错误',
        category: 'e2e',
        priority: 'critical',
        automated: true,
        estimatedSeconds: 15,
      },
      {
        id: 'e2e-register',
        name: '注册流程测试',
        description: '自动化测试完整注册流程',
        category: 'e2e',
        priority: 'critical',
        automated: true,
        estimatedSeconds: 30,
      },
      {
        id: 'e2e-login',
        name: '登录流程测试',
        description: '自动化测试登录流程',
        category: 'e2e',
        priority: 'critical',
        automated: true,
        estimatedSeconds: 20,
      },
      {
        id: 'e2e-core-feature',
        name: '核心功能测试',
        description: '自动化测试产品核心功能流程',
        category: 'e2e',
        priority: 'critical',
        automated: true,
        estimatedSeconds: 60,
      },
      {
        id: 'e2e-payment',
        name: '支付流程测试',
        description: '自动化测试支付流程（模拟支付）',
        category: 'e2e',
        priority: 'critical',
        automated: true,
        estimatedSeconds: 30,
      },
      {
        id: 'e2e-responsive',
        name: '响应式布局测试',
        description: '测试不同屏幕尺寸下的显示',
        category: 'e2e',
        priority: 'high',
        automated: true,
        estimatedSeconds: 40,
      },
      {
        id: 'e2e-navigation',
        name: '导航测试',
        description: '测试所有页面导航链接',
        category: 'e2e',
        priority: 'high',
        automated: true,
        estimatedSeconds: 25,
      },
    ],
  },

  // 5. 日志检查
  {
    id: 'log-tests',
    name: '日志检查',
    description: '检查运行日志，确保无错误和警告',
    category: 'log',
    blocking: true,
    testCases: [
      {
        id: 'log-console-errors',
        name: '控制台错误检查',
        description: '检查浏览器控制台无JS错误',
        category: 'log',
        priority: 'critical',
        automated: true,
        estimatedSeconds: 10,
      },
      {
        id: 'log-server-errors',
        name: '服务端错误检查',
        description: '检查服务端日志无500错误',
        category: 'log',
        priority: 'critical',
        automated: true,
        estimatedSeconds: 10,
      },
      {
        id: 'log-warnings',
        name: '警告检查',
        description: '检查并记录所有警告信息',
        category: 'log',
        priority: 'medium',
        automated: true,
        estimatedSeconds: 10,
      },
      {
        id: 'log-deprecation',
        name: '废弃API检查',
        description: '检查是否使用了废弃的API',
        category: 'log',
        priority: 'medium',
        automated: true,
        estimatedSeconds: 10,
      },
    ],
  },

  // 6. 性能测试
  {
    id: 'performance-tests',
    name: '性能测试',
    description: '测试页面加载和响应性能',
    category: 'performance',
    blocking: false,  // 非阻塞，但会报告
    testCases: [
      {
        id: 'perf-lighthouse',
        name: 'Lighthouse 评分',
        description: '运行 Lighthouse 性能审计',
        category: 'performance',
        priority: 'high',
        automated: true,
        estimatedSeconds: 60,
      },
      {
        id: 'perf-load-time',
        name: '页面加载时间',
        description: '测试关键页面的加载时间',
        category: 'performance',
        priority: 'high',
        automated: true,
        estimatedSeconds: 30,
      },
      {
        id: 'perf-bundle-size',
        name: '包体积检查',
        description: '检查 JS/CSS 包体积是否合理',
        category: 'performance',
        priority: 'medium',
        automated: true,
        estimatedSeconds: 15,
      },
    ],
  },

  // 7. 安全测试
  {
    id: 'security-tests',
    name: '安全测试',
    description: '基础安全检查',
    category: 'security',
    blocking: true,
    testCases: [
      {
        id: 'sec-xss',
        name: 'XSS 防护测试',
        description: '测试输入字段的 XSS 防护',
        category: 'security',
        priority: 'critical',
        automated: true,
        estimatedSeconds: 20,
      },
      {
        id: 'sec-csrf',
        name: 'CSRF 防护测试',
        description: '测试表单的 CSRF 防护',
        category: 'security',
        priority: 'critical',
        automated: true,
        estimatedSeconds: 15,
      },
      {
        id: 'sec-auth',
        name: '认证安全测试',
        description: '测试认证机制的安全性',
        category: 'security',
        priority: 'critical',
        automated: true,
        estimatedSeconds: 25,
      },
      {
        id: 'sec-headers',
        name: '安全头检查',
        description: '检查 HTTP 安全响应头',
        category: 'security',
        priority: 'high',
        automated: true,
        estimatedSeconds: 10,
      },
    ],
  },

  // 8. 无障碍测试
  {
    id: 'accessibility-tests',
    name: '无障碍测试',
    description: '测试产品的可访问性',
    category: 'accessibility',
    blocking: false,
    testCases: [
      {
        id: 'a11y-axe',
        name: 'Axe 无障碍审计',
        description: '运行 axe-core 无障碍检查',
        category: 'accessibility',
        priority: 'medium',
        automated: true,
        estimatedSeconds: 30,
      },
      {
        id: 'a11y-keyboard',
        name: '键盘导航测试',
        description: '测试纯键盘操作的可用性',
        category: 'accessibility',
        priority: 'medium',
        automated: true,
        estimatedSeconds: 20,
      },
    ],
  },
]

/**
 * 根据项目类型获取需要的测试套件
 */
export function getTestSuites(projectType: string, features: string[]): TestSuite[] {
  // 基础测试套件（所有项目都需要）
  const baseSuites = STANDARD_TEST_SUITES.filter(suite =>
    ['unit-tests', 'api-tests', 'integration-tests', 'e2e-tests', 'log-tests', 'security-tests'].includes(suite.id)
  )

  // 根据项目类型添加额外测试
  const additionalSuites: TestSuite[] = []

  // 性能测试（对于用户端产品）
  if (['web', 'mobile', 'ecommerce', 'saas'].includes(projectType)) {
    const perfSuite = STANDARD_TEST_SUITES.find(s => s.id === 'performance-tests')
    if (perfSuite) additionalSuites.push(perfSuite)
  }

  // 无障碍测试（对于面向公众的产品）
  if (['web', 'ecommerce', 'saas'].includes(projectType)) {
    const a11ySuite = STANDARD_TEST_SUITES.find(s => s.id === 'accessibility-tests')
    if (a11ySuite) additionalSuites.push(a11ySuite)
  }

  return [...baseSuites, ...additionalSuites]
}

/**
 * 计算测试总预估时间
 */
export function estimateTotalTestTime(suites: TestSuite[]): number {
  return suites.reduce((total, suite) => {
    return total + suite.testCases.reduce((suiteTotal, tc) => suiteTotal + tc.estimatedSeconds, 0)
  }, 0)
}

/**
 * 检查测试是否可以通过（所有阻塞测试必须通过）
 */
export function canProceed(report: TestReport, suites: TestSuite[]): boolean {
  const blockingSuiteIds = suites.filter(s => s.blocking).map(s => s.id)

  for (const suiteResult of report.suites) {
    if (!blockingSuiteIds.includes(suiteResult.suiteId)) continue

    for (const result of suiteResult.results) {
      if (result.status === 'failed') {
        return false
      }
    }
  }

  return true
}

/**
 * 生成测试报告摘要
 */
export function generateTestSummary(report: TestReport): string {
  const lines: string[] = []

  lines.push(`## 测试报告`)
  lines.push(``)
  lines.push(`**总体状态**: ${report.overallStatus === 'passed' ? '✅ 通过' : '❌ 失败'}`)
  lines.push(`**测试用例**: ${report.passed}/${report.totalTests} 通过`)
  lines.push(``)

  if (report.failed > 0) {
    lines.push(`### 失败的测试`)
    for (const suite of report.suites) {
      const failedTests = suite.results.filter(r => r.status === 'failed')
      if (failedTests.length > 0) {
        for (const test of failedTests) {
          lines.push(`- ❌ ${test.testId}: ${test.errorMessage}`)
        }
      }
    }
    lines.push(``)
  }

  lines.push(`### 测试详情`)
  for (const suite of report.suites) {
    const passed = suite.results.filter(r => r.status === 'passed').length
    const total = suite.results.length
    const status = passed === total ? '✅' : '❌'
    lines.push(`- ${status} ${suite.suiteId}: ${passed}/${total}`)
  }

  return lines.join('\n')
}
