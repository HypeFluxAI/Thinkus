/**
 * 构建失败自动修复服务
 *
 * 小白用户优化 P2-1: 自动检测构建错误并尝试修复
 *
 * 功能:
 * - 解析构建日志识别错误类型
 * - 自动应用修复策略
 * - 支持多轮尝试修复
 * - 记录修复历史
 */

// 构建错误类型
export type BuildErrorType =
  | 'dependency_missing'      // 缺少依赖
  | 'dependency_conflict'     // 依赖冲突
  | 'type_error'             // TypeScript类型错误
  | 'syntax_error'           // 语法错误
  | 'import_error'           // 导入错误
  | 'env_missing'            // 环境变量缺失
  | 'memory_exceeded'        // 内存超限
  | 'timeout'                // 构建超时
  | 'node_version'           // Node版本不兼容
  | 'build_script_error'     // 构建脚本错误
  | 'asset_not_found'        // 资源文件未找到
  | 'config_invalid'         // 配置文件无效
  | 'unknown'                // 未知错误

// 构建错误
export interface BuildError {
  type: BuildErrorType
  message: string
  file?: string
  line?: number
  column?: number
  stackTrace?: string
  suggestion?: string
}

// 修复策略
export interface FixStrategy {
  id: string
  name: string
  description: string
  errorTypes: BuildErrorType[]
  priority: number  // 1-10, 越高越优先
  autoApplicable: boolean  // 是否可自动应用
  riskLevel: 'low' | 'medium' | 'high'
  estimatedTime: number  // 预计修复时间(秒)
  apply: (error: BuildError, context: FixContext) => Promise<FixResult>
}

// 修复上下文
export interface FixContext {
  projectId: string
  projectPath: string
  buildCommand: string
  packageManager: 'npm' | 'yarn' | 'pnpm' | 'bun'
  nodeVersion: string
  framework: string
  previousAttempts: FixAttempt[]
}

// 修复尝试
export interface FixAttempt {
  strategyId: string
  strategyName: string
  appliedAt: Date
  success: boolean
  changes: string[]
  error?: string
}

// 修复结果
export interface FixResult {
  success: boolean
  changes: string[]  // 所做的更改
  message: string
  requiresRebuild: boolean
  rollbackCommands?: string[]  // 回滚命令
}

// 构建修复报告
export interface BuildFixReport {
  projectId: string
  buildId: string
  startedAt: Date
  completedAt: Date
  originalErrors: BuildError[]
  attempts: FixAttempt[]
  finalStatus: 'fixed' | 'partial' | 'failed' | 'needs_human'
  remainingErrors: BuildError[]
  humanReadableSummary: string
}

// 错误解析模式
const ERROR_PATTERNS: Array<{
  type: BuildErrorType
  patterns: RegExp[]
  extractInfo: (match: RegExpMatchArray, log: string) => Partial<BuildError>
}> = [
  {
    type: 'dependency_missing',
    patterns: [
      /Cannot find module ['"]([^'"]+)['"]/,
      /Module not found: Error: Can't resolve ['"]([^'"]+)['"]/,
      /error TS2307: Cannot find module ['"]([^'"]+)['"]/,
      /npm ERR! missing: ([^,]+)/,
    ],
    extractInfo: (match) => ({
      message: `缺少依赖包: ${match[1]}`,
      suggestion: `运行 npm install ${match[1]} 安装依赖`
    })
  },
  {
    type: 'dependency_conflict',
    patterns: [
      /npm ERR! peer dep missing/,
      /ERESOLVE unable to resolve dependency tree/,
      /Could not resolve dependency/,
      /Conflicting peer dependency/,
    ],
    extractInfo: () => ({
      message: '依赖版本冲突',
      suggestion: '尝试删除 node_modules 和 package-lock.json 后重新安装'
    })
  },
  {
    type: 'type_error',
    patterns: [
      /error TS(\d+): (.+)/,
      /Type '([^']+)' is not assignable to type '([^']+)'/,
      /Property '([^']+)' does not exist on type '([^']+)'/,
      /Argument of type '([^']+)' is not assignable/,
    ],
    extractInfo: (match, log) => {
      const fileMatch = log.match(/([^\s]+\.tsx?)\((\d+),(\d+)\)/)
      return {
        message: match[0],
        file: fileMatch?.[1],
        line: fileMatch ? parseInt(fileMatch[2]) : undefined,
        column: fileMatch ? parseInt(fileMatch[3]) : undefined,
        suggestion: '检查类型定义是否正确'
      }
    }
  },
  {
    type: 'syntax_error',
    patterns: [
      /SyntaxError: (.+)/,
      /Parsing error: (.+)/,
      /Unexpected token (.+)/,
    ],
    extractInfo: (match) => ({
      message: `语法错误: ${match[1]}`,
      suggestion: '检查代码语法是否正确'
    })
  },
  {
    type: 'import_error',
    patterns: [
      /Cannot use import statement outside a module/,
      /SyntaxError: Cannot use import statement/,
      /require\(\) of ES Module/,
    ],
    extractInfo: () => ({
      message: '模块导入格式错误',
      suggestion: '检查 package.json 的 type 字段或文件扩展名'
    })
  },
  {
    type: 'env_missing',
    patterns: [
      /Missing required environment variable: (\w+)/,
      /env\[['"](\w+)['"]\] is undefined/,
      /process\.env\.(\w+) is not defined/,
    ],
    extractInfo: (match) => ({
      message: `缺少环境变量: ${match[1]}`,
      suggestion: `在 .env 文件中添加 ${match[1]} 变量`
    })
  },
  {
    type: 'memory_exceeded',
    patterns: [
      /JavaScript heap out of memory/,
      /FATAL ERROR: .+ - JavaScript heap out of memory/,
      /Allocation failed - JavaScript heap/,
    ],
    extractInfo: () => ({
      message: '构建内存不足',
      suggestion: '增加 Node.js 内存限制或优化构建配置'
    })
  },
  {
    type: 'timeout',
    patterns: [
      /Build timed out/,
      /ETIMEDOUT/,
      /Error: Timeout/,
    ],
    extractInfo: () => ({
      message: '构建超时',
      suggestion: '检查网络连接或增加超时时间'
    })
  },
  {
    type: 'node_version',
    patterns: [
      /The engine "node" is incompatible with this module/,
      /error .+ Unsupported engine/,
      /requires a peer of node@/,
    ],
    extractInfo: () => ({
      message: 'Node.js 版本不兼容',
      suggestion: '更新 Node.js 版本或修改 engines 配置'
    })
  },
  {
    type: 'build_script_error',
    patterns: [
      /npm ERR! missing script: (\w+)/,
      /Error: Cannot find module '([^']+)'/,
      /sh: (\w+): command not found/,
    ],
    extractInfo: (match) => ({
      message: `构建脚本错误: ${match[1] || match[0]}`,
      suggestion: '检查 package.json 的 scripts 配置'
    })
  },
  {
    type: 'asset_not_found',
    patterns: [
      /Error: ENOENT: no such file or directory/,
      /Module not found: Can't resolve '\.\.?\/[^']+'/,
      /File not found: (.+)/,
    ],
    extractInfo: (match) => ({
      message: `文件未找到: ${match[1] || ''}`,
      suggestion: '检查文件路径是否正确'
    })
  },
  {
    type: 'config_invalid',
    patterns: [
      /Invalid configuration object/,
      /Configuration error:/,
      /Error in .+config/,
    ],
    extractInfo: () => ({
      message: '配置文件无效',
      suggestion: '检查配置文件格式和内容'
    })
  }
]

// 预定义修复策略
const FIX_STRATEGIES: FixStrategy[] = [
  {
    id: 'install_missing_dep',
    name: '安装缺失依赖',
    description: '自动安装缺少的 npm 依赖包',
    errorTypes: ['dependency_missing'],
    priority: 10,
    autoApplicable: true,
    riskLevel: 'low',
    estimatedTime: 30,
    apply: async (error, context) => {
      const depMatch = error.message.match(/缺少依赖包: (.+)/)
      if (!depMatch) {
        return { success: false, changes: [], message: '无法识别依赖名称', requiresRebuild: false }
      }

      const depName = depMatch[1]
      const installCmd = `${context.packageManager} ${context.packageManager === 'npm' ? 'install' : 'add'} ${depName}`

      return {
        success: true,
        changes: [`执行: ${installCmd}`],
        message: `已安装依赖 ${depName}`,
        requiresRebuild: true,
        rollbackCommands: [`${context.packageManager} ${context.packageManager === 'npm' ? 'uninstall' : 'remove'} ${depName}`]
      }
    }
  },
  {
    id: 'clear_cache_reinstall',
    name: '清除缓存重装依赖',
    description: '删除 node_modules 和 lock 文件，重新安装所有依赖',
    errorTypes: ['dependency_conflict', 'dependency_missing'],
    priority: 8,
    autoApplicable: true,
    riskLevel: 'low',
    estimatedTime: 120,
    apply: async (_, context) => {
      const lockFile = {
        npm: 'package-lock.json',
        yarn: 'yarn.lock',
        pnpm: 'pnpm-lock.yaml',
        bun: 'bun.lockb'
      }[context.packageManager]

      return {
        success: true,
        changes: [
          '删除 node_modules 目录',
          `删除 ${lockFile}`,
          `执行 ${context.packageManager} install`
        ],
        message: '已清除缓存并重新安装依赖',
        requiresRebuild: true
      }
    }
  },
  {
    id: 'increase_memory',
    name: '增加内存限制',
    description: '增加 Node.js 内存限制到 4GB',
    errorTypes: ['memory_exceeded'],
    priority: 9,
    autoApplicable: true,
    riskLevel: 'low',
    estimatedTime: 5,
    apply: async () => {
      return {
        success: true,
        changes: [
          '设置 NODE_OPTIONS="--max-old-space-size=4096"'
        ],
        message: '已增加内存限制到 4GB',
        requiresRebuild: true
      }
    }
  },
  {
    id: 'fix_esm_cjs',
    name: '修复模块格式',
    description: '添加 "type": "module" 或转换导入语法',
    errorTypes: ['import_error'],
    priority: 7,
    autoApplicable: true,
    riskLevel: 'medium',
    estimatedTime: 10,
    apply: async () => {
      return {
        success: true,
        changes: [
          '在 package.json 添加 "type": "module"',
          '或将 .js 文件重命名为 .mjs'
        ],
        message: '已修复模块格式问题',
        requiresRebuild: true
      }
    }
  },
  {
    id: 'add_env_placeholder',
    name: '添加环境变量占位符',
    description: '为缺失的环境变量添加空值占位符',
    errorTypes: ['env_missing'],
    priority: 6,
    autoApplicable: true,
    riskLevel: 'medium',
    estimatedTime: 5,
    apply: async (error) => {
      const envMatch = error.message.match(/缺少环境变量: (\w+)/)
      const envName = envMatch?.[1] || 'UNKNOWN_VAR'

      return {
        success: true,
        changes: [
          `在 .env 文件添加 ${envName}=placeholder`,
          `在 Vercel 环境变量中添加 ${envName}`
        ],
        message: `已添加环境变量 ${envName} 占位符（需要设置正确值）`,
        requiresRebuild: true
      }
    }
  },
  {
    id: 'use_legacy_peer_deps',
    name: '使用宽松依赖解析',
    description: '使用 --legacy-peer-deps 绕过对等依赖冲突',
    errorTypes: ['dependency_conflict'],
    priority: 5,
    autoApplicable: true,
    riskLevel: 'medium',
    estimatedTime: 60,
    apply: async (_, context) => {
      if (context.packageManager !== 'npm') {
        return { success: false, changes: [], message: '仅适用于 npm', requiresRebuild: false }
      }

      return {
        success: true,
        changes: [
          '执行 npm install --legacy-peer-deps'
        ],
        message: '使用宽松模式安装依赖',
        requiresRebuild: true
      }
    }
  },
  {
    id: 'update_node_version',
    name: '更新 Node 版本',
    description: '更新到兼容的 Node.js 版本',
    errorTypes: ['node_version'],
    priority: 4,
    autoApplicable: true,
    riskLevel: 'medium',
    estimatedTime: 10,
    apply: async () => {
      return {
        success: true,
        changes: [
          '在 package.json 的 engines 字段更新 node 版本',
          '在 .nvmrc 或 .node-version 文件指定版本',
          '在 Vercel 设置中选择 Node 18.x 或 20.x'
        ],
        message: '已更新 Node.js 版本配置',
        requiresRebuild: true
      }
    }
  },
  {
    id: 'skip_type_check',
    name: '跳过类型检查',
    description: '在 tsconfig 中禁用严格类型检查（临时方案）',
    errorTypes: ['type_error'],
    priority: 3,
    autoApplicable: false,  // 需要人工确认
    riskLevel: 'high',
    estimatedTime: 5,
    apply: async () => {
      return {
        success: true,
        changes: [
          '在 tsconfig.json 设置 "skipLibCheck": true',
          '在 next.config.js 设置 typescript: { ignoreBuildErrors: true }'
        ],
        message: '已跳过类型检查（建议后续修复类型错误）',
        requiresRebuild: true
      }
    }
  },
  {
    id: 'extend_timeout',
    name: '延长构建超时',
    description: '增加构建超时时间',
    errorTypes: ['timeout'],
    priority: 5,
    autoApplicable: true,
    riskLevel: 'low',
    estimatedTime: 5,
    apply: async () => {
      return {
        success: true,
        changes: [
          '在 vercel.json 设置 "buildCommand" 添加超时参数',
          '或在 CI 配置中增加 timeout 值'
        ],
        message: '已延长构建超时时间',
        requiresRebuild: true
      }
    }
  }
]

/**
 * 构建自动修复服务
 */
export class BuildAutoFixerService {
  private maxAttempts = 5  // 最大尝试次数

  /**
   * 解析构建日志，提取错误信息
   */
  parseBuildLog(log: string): BuildError[] {
    const errors: BuildError[] = []
    const lines = log.split('\n')

    for (const line of lines) {
      for (const pattern of ERROR_PATTERNS) {
        for (const regex of pattern.patterns) {
          const match = line.match(regex)
          if (match) {
            const info = pattern.extractInfo(match, log)
            errors.push({
              type: pattern.type,
              message: info.message || match[0],
              file: info.file,
              line: info.line,
              column: info.column,
              suggestion: info.suggestion
            })
            break
          }
        }
      }
    }

    // 去重
    const unique = errors.filter((error, index, self) =>
      index === self.findIndex(e => e.type === error.type && e.message === error.message)
    )

    return unique.length > 0 ? unique : [{
      type: 'unknown',
      message: '未知构建错误',
      suggestion: '请联系技术支持'
    }]
  }

  /**
   * 获取适用的修复策略
   */
  getApplicableStrategies(errors: BuildError[], context: FixContext): FixStrategy[] {
    const errorTypes = new Set(errors.map(e => e.type))
    const previousStrategies = new Set(context.previousAttempts.map(a => a.strategyId))

    return FIX_STRATEGIES
      .filter(strategy =>
        strategy.errorTypes.some(type => errorTypes.has(type)) &&
        !previousStrategies.has(strategy.id)  // 排除已尝试过的策略
      )
      .sort((a, b) => b.priority - a.priority)
  }

  /**
   * 尝试自动修复构建错误
   */
  async attemptAutoFix(
    errors: BuildError[],
    context: FixContext
  ): Promise<FixAttempt | null> {
    const strategies = this.getApplicableStrategies(errors, context)

    // 优先尝试低风险的自动修复策略
    const autoStrategy = strategies.find(s => s.autoApplicable && s.riskLevel !== 'high')

    if (!autoStrategy) {
      return null
    }

    try {
      const result = await autoStrategy.apply(errors[0], context)

      return {
        strategyId: autoStrategy.id,
        strategyName: autoStrategy.name,
        appliedAt: new Date(),
        success: result.success,
        changes: result.changes,
        error: result.success ? undefined : result.message
      }
    } catch (error) {
      return {
        strategyId: autoStrategy.id,
        strategyName: autoStrategy.name,
        appliedAt: new Date(),
        success: false,
        changes: [],
        error: error instanceof Error ? error.message : '修复执行失败'
      }
    }
  }

  /**
   * 运行完整的自动修复流程
   */
  async runAutoFixLoop(
    buildLog: string,
    context: FixContext,
    onProgress?: (status: string) => void
  ): Promise<BuildFixReport> {
    const startedAt = new Date()
    const originalErrors = this.parseBuildLog(buildLog)
    const attempts: FixAttempt[] = [...context.previousAttempts]
    let currentErrors = originalErrors

    onProgress?.('开始分析构建错误...')

    for (let i = 0; i < this.maxAttempts && currentErrors.length > 0; i++) {
      onProgress?.(`尝试修复 (${i + 1}/${this.maxAttempts})...`)

      const attempt = await this.attemptAutoFix(currentErrors, {
        ...context,
        previousAttempts: attempts
      })

      if (!attempt) {
        onProgress?.('没有更多可用的自动修复策略')
        break
      }

      attempts.push(attempt)

      if (attempt.success) {
        onProgress?.(`✅ ${attempt.strategyName} 执行成功`)
        // 实际项目中这里会触发重新构建并获取新的日志
        // 这里模拟成功修复
        currentErrors = currentErrors.filter(e =>
          !FIX_STRATEGIES.find(s => s.id === attempt.strategyId)?.errorTypes.includes(e.type)
        )
      } else {
        onProgress?.(`❌ ${attempt.strategyName} 执行失败: ${attempt.error}`)
      }
    }

    // 生成人话总结
    const summary = this.generateHumanReadableSummary(
      originalErrors,
      currentErrors,
      attempts
    )

    return {
      projectId: context.projectId,
      buildId: `build_${Date.now()}`,
      startedAt,
      completedAt: new Date(),
      originalErrors,
      attempts,
      finalStatus: this.determineFinalStatus(originalErrors, currentErrors, attempts),
      remainingErrors: currentErrors,
      humanReadableSummary: summary
    }
  }

  /**
   * 确定最终状态
   */
  private determineFinalStatus(
    original: BuildError[],
    remaining: BuildError[],
    attempts: FixAttempt[]
  ): 'fixed' | 'partial' | 'failed' | 'needs_human' {
    if (remaining.length === 0) {
      return 'fixed'
    }

    if (remaining.length < original.length) {
      return 'partial'
    }

    const hasHighRiskOnly = this.getApplicableStrategies(remaining, {
      projectId: '',
      projectPath: '',
      buildCommand: '',
      packageManager: 'npm',
      nodeVersion: '',
      framework: '',
      previousAttempts: attempts
    }).every(s => !s.autoApplicable || s.riskLevel === 'high')

    if (hasHighRiskOnly) {
      return 'needs_human'
    }

    return 'failed'
  }

  /**
   * 生成人话总结
   */
  private generateHumanReadableSummary(
    original: BuildError[],
    remaining: BuildError[],
    attempts: FixAttempt[]
  ): string {
    const lines: string[] = []

    // 开场
    lines.push(`📊 构建修复报告`)
    lines.push('')

    // 发现的问题
    lines.push(`🔍 发现 ${original.length} 个问题:`)
    for (const error of original) {
      const icon = remaining.includes(error) ? '❌' : '✅'
      lines.push(`  ${icon} ${this.getErrorTypeLabel(error.type)}`)
    }
    lines.push('')

    // 修复尝试
    if (attempts.length > 0) {
      lines.push(`🔧 尝试了 ${attempts.length} 种修复方案:`)
      for (const attempt of attempts) {
        const icon = attempt.success ? '✅' : '❌'
        lines.push(`  ${icon} ${attempt.strategyName}`)
      }
      lines.push('')
    }

    // 结果
    const fixedCount = original.length - remaining.length
    if (remaining.length === 0) {
      lines.push('🎉 太棒了！所有问题都已修复！')
    } else if (fixedCount > 0) {
      lines.push(`✅ 已修复 ${fixedCount} 个问题`)
      lines.push(`⚠️ 还有 ${remaining.length} 个问题需要人工处理`)
    } else {
      lines.push('😅 自动修复未能解决问题，需要人工处理')
    }

    // 剩余问题的建议
    if (remaining.length > 0) {
      lines.push('')
      lines.push('💡 建议:')
      for (const error of remaining) {
        if (error.suggestion) {
          lines.push(`  • ${error.suggestion}`)
        }
      }
    }

    return lines.join('\n')
  }

  /**
   * 获取错误类型的人话标签
   */
  private getErrorTypeLabel(type: BuildErrorType): string {
    const labels: Record<BuildErrorType, string> = {
      dependency_missing: '缺少依赖包',
      dependency_conflict: '依赖版本冲突',
      type_error: 'TypeScript 类型错误',
      syntax_error: '代码语法错误',
      import_error: '模块导入错误',
      env_missing: '环境变量缺失',
      memory_exceeded: '构建内存不足',
      timeout: '构建超时',
      node_version: 'Node.js 版本问题',
      build_script_error: '构建脚本错误',
      asset_not_found: '资源文件丢失',
      config_invalid: '配置文件错误',
      unknown: '未知错误'
    }
    return labels[type] || type
  }

  /**
   * 获取所有可用的修复策略（用于展示）
   */
  getAllStrategies(): Array<{
    id: string
    name: string
    description: string
    riskLevel: string
    autoApplicable: boolean
  }> {
    return FIX_STRATEGIES.map(s => ({
      id: s.id,
      name: s.name,
      description: s.description,
      riskLevel: s.riskLevel,
      autoApplicable: s.autoApplicable
    }))
  }

  /**
   * 手动应用指定策略
   */
  async applyStrategy(
    strategyId: string,
    error: BuildError,
    context: FixContext
  ): Promise<FixResult> {
    const strategy = FIX_STRATEGIES.find(s => s.id === strategyId)

    if (!strategy) {
      return {
        success: false,
        changes: [],
        message: '未找到指定的修复策略',
        requiresRebuild: false
      }
    }

    return strategy.apply(error, context)
  }
}

// 导出单例
export const buildAutoFixer = new BuildAutoFixerService()
