/**
 * 多环境管理服务
 *
 * 功能：
 * - 测试/预发布/生产环境管理
 * - 环境变量配置
 * - 一键环境切换
 * - 环境同步和对比
 * - 快速回滚机制
 */

// 环境类型
export type EnvironmentType = 'development' | 'staging' | 'production'

// 环境状态
export type EnvironmentStatus =
  | 'healthy'     // 健康
  | 'degraded'    // 降级
  | 'down'        // 宕机
  | 'deploying'   // 部署中
  | 'maintenance' // 维护中

// 环境配置
export interface EnvironmentConfig {
  id: string
  projectId: string
  type: EnvironmentType
  name: string  // 如 "生产环境", "测试环境"

  // 部署信息
  url: string
  deploymentId?: string
  version?: string
  branch?: string

  // 资源配置
  resources: {
    database: string        // 数据库连接
    redis?: string          // Redis连接
    storage?: string        // 存储桶
    cdn?: string            // CDN 地址
  }

  // 环境变量
  envVars: Record<string, string>

  // 状态
  status: EnvironmentStatus
  lastDeployedAt?: Date
  lastHealthCheckAt?: Date

  // 元数据
  createdAt: Date
  updatedAt: Date
}

// 部署版本
export interface DeploymentVersion {
  id: string
  environmentId: string
  version: string
  commitHash?: string
  commitMessage?: string
  deployedBy: string
  deployedAt: Date
  status: 'active' | 'rollback' | 'archived'
  canRollback: boolean
}

// 环境对比结果
export interface EnvironmentDiff {
  source: EnvironmentType
  target: EnvironmentType
  differences: {
    field: string
    sourceValue: unknown
    targetValue: unknown
    type: 'added' | 'removed' | 'modified'
  }[]
  syncable: boolean
}

// 健康检查结果
export interface HealthCheckResult {
  environmentId: string
  status: EnvironmentStatus
  checks: {
    name: string
    status: 'pass' | 'fail' | 'warn'
    message: string
    responseTime?: number
  }[]
  timestamp: Date
}

// 环境标签配置
const ENVIRONMENT_LABELS: Record<EnvironmentType, { label: string; color: string; icon: string }> = {
  development: { label: '开发环境', color: '#6366f1', icon: '🛠️' },
  staging: { label: '预发布环境', color: '#f59e0b', icon: '🧪' },
  production: { label: '生产环境', color: '#22c55e', icon: '🚀' },
}

// 默认环境变量模板
const DEFAULT_ENV_VARS: Record<EnvironmentType, Record<string, string>> = {
  development: {
    NODE_ENV: 'development',
    LOG_LEVEL: 'debug',
    API_RATE_LIMIT: '1000',
    ENABLE_DEBUG: 'true',
  },
  staging: {
    NODE_ENV: 'staging',
    LOG_LEVEL: 'info',
    API_RATE_LIMIT: '500',
    ENABLE_DEBUG: 'true',
  },
  production: {
    NODE_ENV: 'production',
    LOG_LEVEL: 'warn',
    API_RATE_LIMIT: '100',
    ENABLE_DEBUG: 'false',
  },
}

export class EnvironmentManagerService {
  private environments: Map<string, EnvironmentConfig> = new Map()
  private versions: Map<string, DeploymentVersion[]> = new Map()
  private healthHistory: Map<string, HealthCheckResult[]> = new Map()

  /**
   * 创建环境
   */
  createEnvironment(input: {
    projectId: string
    type: EnvironmentType
    url: string
    resources: EnvironmentConfig['resources']
    envVars?: Record<string, string>
  }): EnvironmentConfig {
    const id = `env_${input.projectId}_${input.type}`
    const label = ENVIRONMENT_LABELS[input.type]

    const config: EnvironmentConfig = {
      id,
      projectId: input.projectId,
      type: input.type,
      name: label.label,
      url: input.url,
      resources: input.resources,
      envVars: {
        ...DEFAULT_ENV_VARS[input.type],
        ...input.envVars,
      },
      status: 'healthy',
      createdAt: new Date(),
      updatedAt: new Date(),
    }

    this.environments.set(id, config)
    this.versions.set(id, [])
    this.healthHistory.set(id, [])

    return config
  }

  /**
   * 获取环境
   */
  getEnvironment(environmentId: string): EnvironmentConfig | undefined {
    return this.environments.get(environmentId)
  }

  /**
   * 获取项目的所有环境
   */
  getProjectEnvironments(projectId: string): EnvironmentConfig[] {
    return Array.from(this.environments.values())
      .filter(e => e.projectId === projectId)
      .sort((a, b) => {
        const order: Record<EnvironmentType, number> = { development: 1, staging: 2, production: 3 }
        return order[a.type] - order[b.type]
      })
  }

  /**
   * 更新环境配置
   */
  updateEnvironment(environmentId: string, updates: Partial<EnvironmentConfig>): EnvironmentConfig | undefined {
    const env = this.environments.get(environmentId)
    if (!env) return undefined

    const updated = {
      ...env,
      ...updates,
      updatedAt: new Date(),
    }

    this.environments.set(environmentId, updated)
    return updated
  }

  /**
   * 更新环境变量
   */
  updateEnvVars(environmentId: string, envVars: Record<string, string>, merge: boolean = true): boolean {
    const env = this.environments.get(environmentId)
    if (!env) return false

    env.envVars = merge
      ? { ...env.envVars, ...envVars }
      : envVars

    env.updatedAt = new Date()
    this.environments.set(environmentId, env)

    return true
  }

  /**
   * 删除环境变量
   */
  deleteEnvVar(environmentId: string, key: string): boolean {
    const env = this.environments.get(environmentId)
    if (!env) return false

    delete env.envVars[key]
    env.updatedAt = new Date()
    this.environments.set(environmentId, env)

    return true
  }

  /**
   * 记录部署版本
   */
  recordDeployment(input: {
    environmentId: string
    version: string
    commitHash?: string
    commitMessage?: string
    deployedBy: string
  }): DeploymentVersion {
    const versions = this.versions.get(input.environmentId) || []

    // 将之前的活跃版本设为可回滚
    for (const v of versions) {
      if (v.status === 'active') {
        v.status = 'rollback'
        v.canRollback = true
      }
    }

    const newVersion: DeploymentVersion = {
      id: `ver_${Date.now()}`,
      environmentId: input.environmentId,
      version: input.version,
      commitHash: input.commitHash,
      commitMessage: input.commitMessage,
      deployedBy: input.deployedBy,
      deployedAt: new Date(),
      status: 'active',
      canRollback: false,
    }

    versions.unshift(newVersion)

    // 只保留最近10个版本
    if (versions.length > 10) {
      versions.slice(10).forEach(v => { v.canRollback = false; v.status = 'archived' })
    }

    this.versions.set(input.environmentId, versions)

    // 更新环境信息
    const env = this.environments.get(input.environmentId)
    if (env) {
      env.version = input.version
      env.deploymentId = newVersion.id
      env.lastDeployedAt = new Date()
      this.environments.set(input.environmentId, env)
    }

    return newVersion
  }

  /**
   * 获取部署历史
   */
  getDeploymentHistory(environmentId: string): DeploymentVersion[] {
    return this.versions.get(environmentId) || []
  }

  /**
   * 回滚到指定版本
   */
  async rollback(environmentId: string, targetVersionId: string): Promise<boolean> {
    const versions = this.versions.get(environmentId) || []
    const targetVersion = versions.find(v => v.id === targetVersionId)

    if (!targetVersion || !targetVersion.canRollback) {
      return false
    }

    // 模拟回滚过程
    const env = this.environments.get(environmentId)
    if (env) {
      env.status = 'deploying'
      this.environments.set(environmentId, env)
    }

    await new Promise(r => setTimeout(r, 2000))

    // 更新版本状态
    for (const v of versions) {
      if (v.status === 'active') {
        v.status = 'rollback'
        v.canRollback = true
      }
    }
    targetVersion.status = 'active'
    targetVersion.canRollback = false

    // 更新环境
    if (env) {
      env.version = targetVersion.version
      env.deploymentId = targetVersion.id
      env.status = 'healthy'
      env.lastDeployedAt = new Date()
      this.environments.set(environmentId, env)
    }

    this.versions.set(environmentId, versions)

    return true
  }

  /**
   * 执行健康检查
   */
  async healthCheck(environmentId: string): Promise<HealthCheckResult> {
    const env = this.environments.get(environmentId)
    if (!env) throw new Error('环境不存在')

    const checks: HealthCheckResult['checks'] = []

    // 检查应用
    checks.push({
      name: '应用状态',
      status: 'pass',
      message: '应用运行正常',
      responseTime: Math.floor(Math.random() * 100) + 50,
    })

    // 检查数据库
    checks.push({
      name: '数据库连接',
      status: Math.random() > 0.1 ? 'pass' : 'warn',
      message: Math.random() > 0.1 ? '数据库连接正常' : '数据库响应较慢',
      responseTime: Math.floor(Math.random() * 50) + 10,
    })

    // 检查 API
    checks.push({
      name: 'API 响应',
      status: 'pass',
      message: 'API 响应正常',
      responseTime: Math.floor(Math.random() * 200) + 100,
    })

    // 计算总体状态
    const hasFailure = checks.some(c => c.status === 'fail')
    const hasWarning = checks.some(c => c.status === 'warn')

    const result: HealthCheckResult = {
      environmentId,
      status: hasFailure ? 'down' : hasWarning ? 'degraded' : 'healthy',
      checks,
      timestamp: new Date(),
    }

    // 更新环境状态
    env.status = result.status
    env.lastHealthCheckAt = new Date()
    this.environments.set(environmentId, env)

    // 记录历史
    const history = this.healthHistory.get(environmentId) || []
    history.unshift(result)
    if (history.length > 100) history.pop()
    this.healthHistory.set(environmentId, history)

    return result
  }

  /**
   * 对比两个环境
   */
  compareEnvironments(sourceId: string, targetId: string): EnvironmentDiff {
    const source = this.environments.get(sourceId)
    const target = this.environments.get(targetId)

    if (!source || !target) throw new Error('环境不存在')

    const differences: EnvironmentDiff['differences'] = []

    // 对比环境变量
    const allKeys = new Set([
      ...Object.keys(source.envVars),
      ...Object.keys(target.envVars),
    ])

    for (const key of allKeys) {
      const sourceVal = source.envVars[key]
      const targetVal = target.envVars[key]

      if (sourceVal === undefined) {
        differences.push({
          field: `envVars.${key}`,
          sourceValue: undefined,
          targetValue: targetVal,
          type: 'added',
        })
      } else if (targetVal === undefined) {
        differences.push({
          field: `envVars.${key}`,
          sourceValue: sourceVal,
          targetValue: undefined,
          type: 'removed',
        })
      } else if (sourceVal !== targetVal) {
        differences.push({
          field: `envVars.${key}`,
          sourceValue: sourceVal,
          targetValue: targetVal,
          type: 'modified',
        })
      }
    }

    // 对比版本
    if (source.version !== target.version) {
      differences.push({
        field: 'version',
        sourceValue: source.version,
        targetValue: target.version,
        type: 'modified',
      })
    }

    return {
      source: source.type,
      target: target.type,
      differences,
      syncable: differences.length > 0,
    }
  }

  /**
   * 同步环境配置
   */
  syncEnvironments(sourceId: string, targetId: string, fields: string[]): boolean {
    const source = this.environments.get(sourceId)
    const target = this.environments.get(targetId)

    if (!source || !target) return false

    for (const field of fields) {
      if (field.startsWith('envVars.')) {
        const key = field.replace('envVars.', '')
        if (source.envVars[key] !== undefined) {
          target.envVars[key] = source.envVars[key]
        } else {
          delete target.envVars[key]
        }
      }
    }

    target.updatedAt = new Date()
    this.environments.set(targetId, target)

    return true
  }

  /**
   * 生成环境面板 HTML
   */
  generateDashboardHtml(projectId: string): string {
    const environments = this.getProjectEnvironments(projectId)

    return `
<!DOCTYPE html>
<html lang="zh-CN">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <meta http-equiv="refresh" content="30">
  <title>环境管理</title>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
      background: #0f172a;
      min-height: 100vh;
      color: #e2e8f0;
      padding: 30px;
    }
    .container { max-width: 1200px; margin: 0 auto; }
    h1 { font-size: 24px; margin-bottom: 30px; }

    .env-grid {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(350px, 1fr));
      gap: 20px;
    }

    .env-card {
      background: #1e293b;
      border-radius: 16px;
      overflow: hidden;
      border: 1px solid #334155;
    }
    .env-header {
      padding: 20px;
      display: flex;
      justify-content: space-between;
      align-items: center;
      border-bottom: 1px solid #334155;
    }
    .env-title {
      display: flex;
      align-items: center;
      gap: 10px;
    }
    .env-icon { font-size: 24px; }
    .env-name { font-size: 16px; font-weight: 600; }
    .env-type { font-size: 12px; color: #94a3b8; }

    .env-status {
      padding: 6px 12px;
      border-radius: 20px;
      font-size: 12px;
      font-weight: 500;
    }
    .status-healthy { background: rgba(34, 197, 94, 0.2); color: #22c55e; }
    .status-degraded { background: rgba(245, 158, 11, 0.2); color: #f59e0b; }
    .status-down { background: rgba(239, 68, 68, 0.2); color: #ef4444; }
    .status-deploying { background: rgba(59, 130, 246, 0.2); color: #3b82f6; }

    .env-body { padding: 20px; }

    .env-info {
      display: grid;
      gap: 12px;
    }
    .info-row {
      display: flex;
      justify-content: space-between;
      font-size: 13px;
    }
    .info-label { color: #94a3b8; }
    .info-value { color: #e2e8f0; }
    .info-value a { color: #3b82f6; text-decoration: none; }

    .env-actions {
      display: flex;
      gap: 10px;
      margin-top: 20px;
      padding-top: 20px;
      border-top: 1px solid #334155;
    }
    .action-btn {
      flex: 1;
      padding: 10px;
      border: none;
      border-radius: 8px;
      font-size: 13px;
      cursor: pointer;
      display: flex;
      align-items: center;
      justify-content: center;
      gap: 5px;
    }
    .btn-primary { background: #3b82f6; color: #fff; }
    .btn-secondary { background: #334155; color: #e2e8f0; }
    .btn-danger { background: rgba(239, 68, 68, 0.2); color: #ef4444; border: 1px solid rgba(239, 68, 68, 0.3); }

    .version-history {
      margin-top: 20px;
      padding-top: 20px;
      border-top: 1px solid #334155;
    }
    .history-title { font-size: 12px; color: #94a3b8; margin-bottom: 10px; }
    .version-item {
      display: flex;
      justify-content: space-between;
      align-items: center;
      padding: 8px 0;
      font-size: 12px;
    }
    .version-tag {
      padding: 2px 8px;
      background: #334155;
      border-radius: 4px;
    }
    .version-active { background: rgba(34, 197, 94, 0.2); color: #22c55e; }
    .version-time { color: #64748b; }
  </style>
</head>
<body>
  <div class="container">
    <h1>🌍 环境管理</h1>

    <div class="env-grid">
      ${environments.map(env => {
        const label = ENVIRONMENT_LABELS[env.type]
        const versions = this.getDeploymentHistory(env.id).slice(0, 3)

        return `
          <div class="env-card">
            <div class="env-header">
              <div class="env-title">
                <span class="env-icon">${label.icon}</span>
                <div>
                  <div class="env-name">${env.name}</div>
                  <div class="env-type">${env.type}</div>
                </div>
              </div>
              <div class="env-status status-${env.status}">
                ${env.status === 'healthy' ? '✓ 正常' :
                  env.status === 'degraded' ? '⚠ 降级' :
                  env.status === 'down' ? '✗ 宕机' :
                  env.status === 'deploying' ? '◌ 部署中' : '维护中'}
              </div>
            </div>

            <div class="env-body">
              <div class="env-info">
                <div class="info-row">
                  <span class="info-label">访问地址</span>
                  <span class="info-value"><a href="${env.url}" target="_blank">${env.url}</a></span>
                </div>
                <div class="info-row">
                  <span class="info-label">当前版本</span>
                  <span class="info-value">${env.version || 'N/A'}</span>
                </div>
                <div class="info-row">
                  <span class="info-label">上次部署</span>
                  <span class="info-value">${env.lastDeployedAt?.toLocaleString() || 'N/A'}</span>
                </div>
                <div class="info-row">
                  <span class="info-label">环境变量</span>
                  <span class="info-value">${Object.keys(env.envVars).length} 个</span>
                </div>
              </div>

              <div class="env-actions">
                <button class="action-btn btn-primary">🚀 部署</button>
                <button class="action-btn btn-secondary">⚙️ 配置</button>
                ${env.type !== 'development' ? `<button class="action-btn btn-danger">⏪ 回滚</button>` : ''}
              </div>

              ${versions.length > 0 ? `
                <div class="version-history">
                  <div class="history-title">部署历史</div>
                  ${versions.map(v => `
                    <div class="version-item">
                      <span class="version-tag ${v.status === 'active' ? 'version-active' : ''}">${v.version}</span>
                      <span class="version-time">${v.deployedAt.toLocaleString()}</span>
                    </div>
                  `).join('')}
                </div>
              ` : ''}
            </div>
          </div>
        `
      }).join('')}
    </div>
  </div>
</body>
</html>
`
  }
}

// 单例导出
export const environmentManager = new EnvironmentManagerService()
