/**
 * Vercel 真实部署服务
 * 调用 Vercel REST API 完成真实部署
 */

import crypto from 'crypto'
import { promises as fs } from 'fs'
import path from 'path'

// Vercel API 配置
const VERCEL_API_BASE = 'https://api.vercel.com'
const VERCEL_TOKEN = process.env.VERCEL_TOKEN
const VERCEL_TEAM_ID = process.env.VERCEL_TEAM_ID

// 部署状态
export type VercelDeploymentState =
  | 'QUEUED'
  | 'BUILDING'
  | 'READY'
  | 'ERROR'
  | 'CANCELED'

// 项目框架
export type VercelFramework =
  | 'nextjs'
  | 'vite'
  | 'create-react-app'
  | 'vue'
  | 'nuxt'
  | 'remix'
  | 'astro'
  | 'svelte'
  | null

// 部署配置
export interface VercelDeployConfig {
  projectName: string
  framework?: VercelFramework
  buildCommand?: string
  installCommand?: string
  outputDirectory?: string
  rootDirectory?: string
  envVars?: Record<string, string>
  regions?: string[]
}

// 文件结构
export interface DeploymentFile {
  file: string  // 文件路径
  data: string  // base64编码内容
  encoding?: 'base64' | 'utf-8'
}

// 部署结果
export interface VercelDeploymentResult {
  id: string
  url: string
  state: VercelDeploymentState
  readyState?: string
  createdAt: number
  buildingAt?: number
  ready?: number
  alias?: string[]
  meta?: Record<string, string>
  target?: 'production' | 'preview'
  projectId?: string
  inspectorUrl?: string
}

// 项目信息
export interface VercelProject {
  id: string
  name: string
  framework?: VercelFramework
  link?: {
    type: string
    repo: string
  }
  latestDeployments?: VercelDeploymentResult[]
}

// 域名配置
export interface VercelDomain {
  name: string
  verified: boolean
  verification?: Array<{
    type: string
    domain: string
    value: string
  }>
}

// 进度回调
export type DeployProgressCallback = (event: {
  stage: 'uploading' | 'building' | 'deploying' | 'ready' | 'error'
  progress: number
  message: string
  messageZh: string
  details?: Record<string, unknown>
}) => void

/**
 * Vercel 部署服务
 */
export class VercelDeployerService {
  private token: string
  private teamId?: string

  constructor(token?: string, teamId?: string) {
    this.token = token || VERCEL_TOKEN || ''
    this.teamId = teamId || VERCEL_TEAM_ID

    if (!this.token) {
      console.warn('⚠️ VERCEL_TOKEN not set, deployment will fail')
    }
  }

  /**
   * 验证 token 是否有效
   */
  async validateToken(): Promise<boolean> {
    try {
      const response = await this.request('/v2/user')
      return !!response?.user?.id
    } catch {
      return false
    }
  }

  /**
   * 创建或获取项目
   */
  async ensureProject(name: string, config?: Partial<VercelDeployConfig>): Promise<VercelProject> {
    // 先尝试获取现有项目
    try {
      const existing = await this.getProject(name)
      if (existing) return existing
    } catch {
      // 项目不存在，继续创建
    }

    // 创建新项目
    const response = await this.request('/v9/projects', {
      method: 'POST',
      body: JSON.stringify({
        name,
        framework: config?.framework || 'nextjs',
        buildCommand: config?.buildCommand,
        installCommand: config?.installCommand,
        outputDirectory: config?.outputDirectory,
        rootDirectory: config?.rootDirectory,
      }),
    })

    return response as VercelProject
  }

  /**
   * 获取项目信息
   */
  async getProject(nameOrId: string): Promise<VercelProject | null> {
    try {
      const response = await this.request(`/v9/projects/${encodeURIComponent(nameOrId)}`)
      return response as VercelProject
    } catch {
      return null
    }
  }

  /**
   * 设置环境变量
   */
  async setEnvVars(
    projectId: string,
    envVars: Record<string, string>,
    target: ('production' | 'preview' | 'development')[] = ['production', 'preview']
  ): Promise<void> {
    // 获取现有环境变量
    const existingVars = await this.request(`/v9/projects/${projectId}/env`)
    const existingKeys = new Set((existingVars?.envs || []).map((e: { key: string }) => e.key))

    // 批量创建/更新环境变量
    for (const [key, value] of Object.entries(envVars)) {
      if (existingKeys.has(key)) {
        // 更新已存在的变量
        const existingVar = (existingVars?.envs || []).find((e: { key: string }) => e.key === key)
        if (existingVar) {
          await this.request(`/v9/projects/${projectId}/env/${existingVar.id}`, {
            method: 'PATCH',
            body: JSON.stringify({ value, target }),
          })
        }
      } else {
        // 创建新变量
        await this.request(`/v10/projects/${projectId}/env`, {
          method: 'POST',
          body: JSON.stringify({
            key,
            value,
            type: 'encrypted',
            target,
          }),
        })
      }
    }
  }

  /**
   * 部署项目（从文件）
   */
  async deployFromFiles(
    projectName: string,
    files: DeploymentFile[],
    config?: VercelDeployConfig,
    onProgress?: DeployProgressCallback
  ): Promise<VercelDeploymentResult> {
    onProgress?.({
      stage: 'uploading',
      progress: 10,
      message: 'Uploading files to Vercel...',
      messageZh: '正在上传文件到 Vercel...',
    })

    // 确保项目存在
    const project = await this.ensureProject(projectName, config)

    // 设置环境变量
    if (config?.envVars && Object.keys(config.envVars).length > 0) {
      await this.setEnvVars(project.id, config.envVars)
    }

    onProgress?.({
      stage: 'uploading',
      progress: 30,
      message: 'Creating deployment...',
      messageZh: '正在创建部署...',
    })

    // 创建部署
    const deploymentResponse = await this.request('/v13/deployments', {
      method: 'POST',
      body: JSON.stringify({
        name: projectName,
        project: project.id,
        target: 'production',
        files: files.map(f => ({
          file: f.file,
          data: f.data,
          encoding: f.encoding || 'base64',
        })),
        projectSettings: {
          framework: config?.framework || null,
          buildCommand: config?.buildCommand,
          installCommand: config?.installCommand,
          outputDirectory: config?.outputDirectory,
          rootDirectory: config?.rootDirectory,
        },
      }),
    })

    const deploymentId = deploymentResponse.id
    const deploymentUrl = deploymentResponse.url

    onProgress?.({
      stage: 'building',
      progress: 50,
      message: 'Building project...',
      messageZh: '正在构建项目...',
      details: { deploymentId, url: deploymentUrl },
    })

    // 轮询部署状态
    const result = await this.waitForDeployment(deploymentId, onProgress)

    return result
  }

  /**
   * 部署项目（从目录）
   */
  async deployFromDirectory(
    projectName: string,
    directory: string,
    config?: VercelDeployConfig,
    onProgress?: DeployProgressCallback
  ): Promise<VercelDeploymentResult> {
    onProgress?.({
      stage: 'uploading',
      progress: 5,
      message: 'Collecting project files...',
      messageZh: '正在收集项目文件...',
    })

    // 收集所有文件
    const files = await this.collectFiles(directory, config?.rootDirectory)

    onProgress?.({
      stage: 'uploading',
      progress: 15,
      message: `Collected ${files.length} files`,
      messageZh: `已收集 ${files.length} 个文件`,
    })

    return this.deployFromFiles(projectName, files, config, onProgress)
  }

  /**
   * 部署项目（从 Git 仓库）
   */
  async deployFromGit(
    projectName: string,
    repoUrl: string,
    branch = 'main',
    config?: VercelDeployConfig,
    onProgress?: DeployProgressCallback
  ): Promise<VercelDeploymentResult> {
    onProgress?.({
      stage: 'uploading',
      progress: 10,
      message: 'Connecting to Git repository...',
      messageZh: '正在连接 Git 仓库...',
    })

    // 确保项目存在并连接 Git
    const project = await this.ensureProject(projectName, config)

    // 设置环境变量
    if (config?.envVars && Object.keys(config.envVars).length > 0) {
      await this.setEnvVars(project.id, config.envVars)
    }

    onProgress?.({
      stage: 'building',
      progress: 30,
      message: 'Creating deployment from Git...',
      messageZh: '正在从 Git 创建部署...',
    })

    // 创建部署 hook
    const response = await this.request('/v13/deployments', {
      method: 'POST',
      body: JSON.stringify({
        name: projectName,
        project: project.id,
        target: 'production',
        gitSource: {
          type: 'github',
          repoId: repoUrl,
          ref: branch,
        },
      }),
    })

    const deploymentId = response.id

    // 轮询部署状态
    return this.waitForDeployment(deploymentId, onProgress)
  }

  /**
   * 等待部署完成
   */
  async waitForDeployment(
    deploymentId: string,
    onProgress?: DeployProgressCallback,
    maxWaitMs = 10 * 60 * 1000  // 最长等待10分钟
  ): Promise<VercelDeploymentResult> {
    const startTime = Date.now()
    let lastState: VercelDeploymentState | null = null

    while (Date.now() - startTime < maxWaitMs) {
      const deployment = await this.getDeployment(deploymentId)

      if (deployment.state !== lastState) {
        lastState = deployment.state

        const stateMessages: Record<VercelDeploymentState, { en: string; zh: string; progress: number }> = {
          QUEUED: { en: 'Waiting in queue...', zh: '等待队列中...', progress: 40 },
          BUILDING: { en: 'Building project...', zh: '正在构建项目...', progress: 60 },
          READY: { en: 'Deployment ready!', zh: '部署完成！', progress: 100 },
          ERROR: { en: 'Deployment failed', zh: '部署失败', progress: 0 },
          CANCELED: { en: 'Deployment canceled', zh: '部署已取消', progress: 0 },
        }

        const msg = stateMessages[deployment.state]
        onProgress?.({
          stage: deployment.state === 'READY' ? 'ready' : deployment.state === 'ERROR' ? 'error' : 'deploying',
          progress: msg.progress,
          message: msg.en,
          messageZh: msg.zh,
          details: { deploymentId, state: deployment.state, url: deployment.url },
        })
      }

      if (deployment.state === 'READY') {
        return deployment
      }

      if (deployment.state === 'ERROR' || deployment.state === 'CANCELED') {
        throw new Error(`Deployment ${deployment.state}: ${deploymentId}`)
      }

      // 等待3秒后再次检查
      await new Promise(resolve => setTimeout(resolve, 3000))
    }

    throw new Error(`Deployment timeout after ${maxWaitMs / 1000} seconds`)
  }

  /**
   * 获取部署状态
   */
  async getDeployment(deploymentId: string): Promise<VercelDeploymentResult> {
    const response = await this.request(`/v13/deployments/${deploymentId}`)
    return {
      id: response.id,
      url: response.url,
      state: response.readyState || response.state,
      readyState: response.readyState,
      createdAt: response.createdAt,
      buildingAt: response.buildingAt,
      ready: response.ready,
      alias: response.alias,
      meta: response.meta,
      target: response.target,
      projectId: response.projectId,
      inspectorUrl: response.inspectorUrl,
    }
  }

  /**
   * 获取部署日志
   */
  async getDeploymentLogs(deploymentId: string): Promise<string[]> {
    try {
      const response = await this.request(`/v2/deployments/${deploymentId}/events`)
      return (response || []).map((event: { text?: string; message?: string }) =>
        event.text || event.message || ''
      ).filter(Boolean)
    } catch {
      return []
    }
  }

  /**
   * 添加域名
   */
  async addDomain(projectId: string, domain: string): Promise<VercelDomain> {
    const response = await this.request(`/v10/projects/${projectId}/domains`, {
      method: 'POST',
      body: JSON.stringify({ name: domain }),
    })
    return response as VercelDomain
  }

  /**
   * 获取域名配置
   */
  async getDomains(projectId: string): Promise<VercelDomain[]> {
    const response = await this.request(`/v9/projects/${projectId}/domains`)
    return (response?.domains || []) as VercelDomain[]
  }

  /**
   * 回滚到之前的部署
   */
  async rollback(projectId: string, deploymentId: string): Promise<VercelDeploymentResult> {
    // 将指定部署提升为生产
    const response = await this.request(`/v13/deployments/${deploymentId}/promote`, {
      method: 'POST',
      body: JSON.stringify({
        projectId,
        target: 'production',
      }),
    })
    return response as VercelDeploymentResult
  }

  /**
   * 删除项目
   */
  async deleteProject(projectId: string): Promise<void> {
    await this.request(`/v9/projects/${projectId}`, {
      method: 'DELETE',
    })
  }

  /**
   * 收集目录下的所有文件
   */
  private async collectFiles(
    directory: string,
    rootDirectory?: string
  ): Promise<DeploymentFile[]> {
    const files: DeploymentFile[] = []
    const baseDir = rootDirectory ? path.join(directory, rootDirectory) : directory

    // 排除的目录和文件
    const excludePatterns = [
      'node_modules',
      '.git',
      '.next',
      '.vercel',
      '.env.local',
      '.env.*.local',
      'dist',
      'build',
      '.DS_Store',
      'Thumbs.db',
    ]

    const shouldExclude = (name: string): boolean => {
      return excludePatterns.some(pattern => {
        if (pattern.includes('*')) {
          const regex = new RegExp('^' + pattern.replace(/\*/g, '.*') + '$')
          return regex.test(name)
        }
        return name === pattern
      })
    }

    const collectRecursive = async (dir: string, relativePath = ''): Promise<void> => {
      const entries = await fs.readdir(dir, { withFileTypes: true })

      for (const entry of entries) {
        if (shouldExclude(entry.name)) continue

        const fullPath = path.join(dir, entry.name)
        const relPath = relativePath ? `${relativePath}/${entry.name}` : entry.name

        if (entry.isDirectory()) {
          await collectRecursive(fullPath, relPath)
        } else if (entry.isFile()) {
          try {
            const content = await fs.readFile(fullPath)
            files.push({
              file: relPath,
              data: content.toString('base64'),
              encoding: 'base64',
            })
          } catch (err) {
            console.warn(`Failed to read file: ${fullPath}`, err)
          }
        }
      }
    }

    await collectRecursive(baseDir)
    return files
  }

  /**
   * 发起 API 请求
   */
  private async request(
    endpoint: string,
    options: RequestInit = {}
  ): Promise<Record<string, unknown>> {
    const url = new URL(endpoint, VERCEL_API_BASE)
    if (this.teamId) {
      url.searchParams.set('teamId', this.teamId)
    }

    const response = await fetch(url.toString(), {
      ...options,
      headers: {
        Authorization: `Bearer ${this.token}`,
        'Content-Type': 'application/json',
        ...options.headers,
      },
    })

    const data = await response.json()

    if (!response.ok) {
      const errorMessage = (data as { error?: { message?: string } })?.error?.message || 'Unknown error'
      throw new Error(`Vercel API error: ${errorMessage} (${response.status})`)
    }

    return data as Record<string, unknown>
  }
}

// 单例实例
let _vercelDeployer: VercelDeployerService | null = null

export function getVercelDeployer(): VercelDeployerService {
  if (!_vercelDeployer) {
    _vercelDeployer = new VercelDeployerService()
  }
  return _vercelDeployer
}

// 便捷方法：一键部署
export async function deployToVercel(
  projectName: string,
  sourceDirectory: string,
  config?: VercelDeployConfig,
  onProgress?: DeployProgressCallback
): Promise<VercelDeploymentResult> {
  const deployer = getVercelDeployer()
  return deployer.deployFromDirectory(projectName, sourceDirectory, config, onProgress)
}

// 便捷方法：检查部署状态
export async function checkDeploymentStatus(deploymentId: string): Promise<VercelDeploymentResult> {
  const deployer = getVercelDeployer()
  return deployer.getDeployment(deploymentId)
}

// 便捷方法：回滚部署
export async function rollbackDeployment(
  projectId: string,
  deploymentId: string
): Promise<VercelDeploymentResult> {
  const deployer = getVercelDeployer()
  return deployer.rollback(projectId, deploymentId)
}
