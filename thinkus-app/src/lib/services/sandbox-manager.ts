import mongoose from 'mongoose'
import crypto from 'crypto'

/**
 * 沙盒镜像类型
 */
export type SandboxImage = 'node18' | 'node20' | 'python3' | 'full'

/**
 * 沙盒状态
 */
export type SandboxStatus = 'creating' | 'running' | 'paused' | 'stopped' | 'error'

/**
 * 沙盒配置
 */
export interface SandboxConfig {
  image: SandboxImage
  cpu?: number                    // 默认1核
  memory?: number                 // 默认2GB (MB)
  disk?: number                   // 默认10GB (GB)
  env?: Record<string, string>    // 环境变量
  ttlHours?: number               // 默认168小时(7天)
}

/**
 * 沙盒实例
 */
export interface Sandbox {
  id: string
  projectId: string
  userId: string
  status: SandboxStatus

  containerId?: string
  previewUrl: string              // https://xxx.sandbox.thinkus.ai
  internalPort?: number

  config: SandboxConfig

  createdAt: Date
  lastActiveAt: Date
  expiresAt: Date
}

/**
 * 命令执行结果
 */
export interface ExecResult {
  exitCode: number
  stdout: string
  stderr: string
  duration: number
}

/**
 * 文件信息
 */
export interface FileInfo {
  name: string
  path: string
  type: 'file' | 'directory'
  size: number
  modifiedAt: Date
}

/**
 * 沙盒事件
 */
export interface SandboxEvent {
  type: 'file_change' | 'command_exec' | 'status_change' | 'log'
  sandboxId: string
  projectId: string
  timestamp: number
  data: unknown
}

/**
 * 事件监听器类型
 */
type EventListener = (event: SandboxEvent) => void

/**
 * Sandbox Manager Service
 * 开发沙盒管理服务
 */
export class SandboxManagerService {
  // 沙盒存储 (内存版，生产环境应使用数据库)
  private sandboxes = new Map<string, Sandbox>()

  // 文件存储 (内存版，生产环境应使用实际容器)
  private fileStorage = new Map<string, Map<string, string>>()

  // 事件监听器
  private eventListeners: EventListener[] = []

  /**
   * 创建沙盒
   */
  async create(
    projectId: string,
    userId: string,
    config: SandboxConfig
  ): Promise<Sandbox> {
    const sandboxId = `sandbox-${projectId.slice(-8)}-${Date.now().toString(36)}`

    // 计算过期时间
    const ttlHours = config.ttlHours || 168 // 默认7天
    const expiresAt = new Date(Date.now() + ttlHours * 3600000)

    const sandbox: Sandbox = {
      id: sandboxId,
      projectId,
      userId,
      status: 'creating',
      previewUrl: `https://${sandboxId}.sandbox.thinkus.ai`,
      config: {
        image: config.image || 'node20',
        cpu: config.cpu || 1,
        memory: config.memory || 2048,
        disk: config.disk || 10,
        env: config.env || {},
        ttlHours,
      },
      createdAt: new Date(),
      lastActiveAt: new Date(),
      expiresAt,
    }

    // 存储沙盒信息
    this.sandboxes.set(sandboxId, sandbox)

    // 初始化文件存储
    this.fileStorage.set(sandboxId, new Map())

    // TODO: 生产环境 - 创建 Docker 容器
    // const container = await this.createDockerContainer(sandbox)
    // sandbox.containerId = container.id

    // 更新状态
    sandbox.status = 'running'
    this.sandboxes.set(sandboxId, sandbox)

    // 发送事件
    this.emitEvent({
      type: 'status_change',
      sandboxId,
      projectId,
      timestamp: Date.now(),
      data: { status: 'running' },
    })

    // 初始化项目结构
    await this.initProjectStructure(sandboxId, config.image)

    return sandbox
  }

  /**
   * 获取或创建沙盒
   */
  async getOrCreate(
    projectId: string,
    userId: string,
    config?: SandboxConfig
  ): Promise<Sandbox> {
    // 查找现有沙盒
    for (const sandbox of this.sandboxes.values()) {
      if (sandbox.projectId === projectId && sandbox.userId === userId) {
        if (sandbox.status === 'running' || sandbox.status === 'paused') {
          // 恢复并返回
          if (sandbox.status === 'paused') {
            await this.resume(sandbox.id)
          }
          return sandbox
        }
      }
    }

    // 创建新沙盒
    return this.create(projectId, userId, config || { image: 'node20' })
  }

  /**
   * 获取沙盒
   */
  async get(sandboxId: string): Promise<Sandbox | null> {
    return this.sandboxes.get(sandboxId) || null
  }

  /**
   * 获取用户的所有沙盒
   */
  async getUserSandboxes(userId: string): Promise<Sandbox[]> {
    const sandboxes: Sandbox[] = []
    for (const sandbox of this.sandboxes.values()) {
      if (sandbox.userId === userId) {
        sandboxes.push(sandbox)
      }
    }
    return sandboxes.sort((a, b) => b.lastActiveAt.getTime() - a.lastActiveAt.getTime())
  }

  /**
   * 执行命令
   */
  async exec(sandboxId: string, command: string): Promise<ExecResult> {
    const sandbox = this.sandboxes.get(sandboxId)
    if (!sandbox) {
      throw new Error('Sandbox not found')
    }

    if (sandbox.status !== 'running') {
      throw new Error('Sandbox is not running')
    }

    const startTime = Date.now()

    // 更新活跃时间
    sandbox.lastActiveAt = new Date()
    this.sandboxes.set(sandboxId, sandbox)

    // TODO: 生产环境 - 在 Docker 容器中执行命令
    // const container = docker.getContainer(sandbox.containerId)
    // const exec = await container.exec({ Cmd: ['sh', '-c', command] })

    // 模拟执行结果
    const result = this.simulateExec(sandboxId, command)

    // 发送事件
    this.emitEvent({
      type: 'command_exec',
      sandboxId,
      projectId: sandbox.projectId,
      timestamp: Date.now(),
      data: { command, result },
    })

    return {
      ...result,
      duration: Date.now() - startTime,
    }
  }

  /**
   * 写入文件
   */
  async writeFile(sandboxId: string, path: string, content: string): Promise<void> {
    const sandbox = this.sandboxes.get(sandboxId)
    if (!sandbox) {
      throw new Error('Sandbox not found')
    }

    const files = this.fileStorage.get(sandboxId)
    if (!files) {
      throw new Error('File storage not initialized')
    }

    // 存储文件
    files.set(path, content)

    // 更新活跃时间
    sandbox.lastActiveAt = new Date()
    this.sandboxes.set(sandboxId, sandbox)

    // 发送文件变更事件
    this.emitEvent({
      type: 'file_change',
      sandboxId,
      projectId: sandbox.projectId,
      timestamp: Date.now(),
      data: {
        path,
        content,
        action: 'write',
      },
    })
  }

  /**
   * 读取文件
   */
  async readFile(sandboxId: string, path: string): Promise<string> {
    const files = this.fileStorage.get(sandboxId)
    if (!files) {
      throw new Error('File storage not initialized')
    }

    const content = files.get(path)
    if (content === undefined) {
      throw new Error(`File not found: ${path}`)
    }

    return content
  }

  /**
   * 列出文件
   */
  async listFiles(sandboxId: string, dir: string): Promise<FileInfo[]> {
    const files = this.fileStorage.get(sandboxId)
    if (!files) {
      throw new Error('File storage not initialized')
    }

    const result: FileInfo[] = []
    const dirs = new Set<string>()

    for (const [path, content] of files.entries()) {
      if (path.startsWith(dir)) {
        const relativePath = path.slice(dir.length).replace(/^\//, '')
        const parts = relativePath.split('/')

        if (parts.length === 1) {
          // 直接子文件
          result.push({
            name: parts[0],
            path,
            type: 'file',
            size: content.length,
            modifiedAt: new Date(),
          })
        } else {
          // 子目录
          const dirName = parts[0]
          if (!dirs.has(dirName)) {
            dirs.add(dirName)
            result.push({
              name: dirName,
              path: `${dir}/${dirName}`,
              type: 'directory',
              size: 0,
              modifiedAt: new Date(),
            })
          }
        }
      }
    }

    return result.sort((a, b) => {
      if (a.type !== b.type) return a.type === 'directory' ? -1 : 1
      return a.name.localeCompare(b.name)
    })
  }

  /**
   * 删除文件
   */
  async deleteFile(sandboxId: string, path: string): Promise<void> {
    const files = this.fileStorage.get(sandboxId)
    if (!files) {
      throw new Error('File storage not initialized')
    }

    files.delete(path)

    const sandbox = this.sandboxes.get(sandboxId)
    if (sandbox) {
      this.emitEvent({
        type: 'file_change',
        sandboxId,
        projectId: sandbox.projectId,
        timestamp: Date.now(),
        data: {
          path,
          action: 'delete',
        },
      })
    }
  }

  /**
   * 暂停沙盒
   */
  async pause(sandboxId: string): Promise<void> {
    const sandbox = this.sandboxes.get(sandboxId)
    if (!sandbox) {
      throw new Error('Sandbox not found')
    }

    // TODO: 生产环境 - 暂停 Docker 容器
    // await docker.getContainer(sandbox.containerId).pause()

    sandbox.status = 'paused'
    this.sandboxes.set(sandboxId, sandbox)

    this.emitEvent({
      type: 'status_change',
      sandboxId,
      projectId: sandbox.projectId,
      timestamp: Date.now(),
      data: { status: 'paused' },
    })
  }

  /**
   * 恢复沙盒
   */
  async resume(sandboxId: string): Promise<void> {
    const sandbox = this.sandboxes.get(sandboxId)
    if (!sandbox) {
      throw new Error('Sandbox not found')
    }

    // TODO: 生产环境 - 恢复 Docker 容器
    // await docker.getContainer(sandbox.containerId).unpause()

    sandbox.status = 'running'
    sandbox.lastActiveAt = new Date()
    this.sandboxes.set(sandboxId, sandbox)

    this.emitEvent({
      type: 'status_change',
      sandboxId,
      projectId: sandbox.projectId,
      timestamp: Date.now(),
      data: { status: 'running' },
    })
  }

  /**
   * 销毁沙盒
   */
  async destroy(sandboxId: string): Promise<void> {
    const sandbox = this.sandboxes.get(sandboxId)
    if (!sandbox) {
      throw new Error('Sandbox not found')
    }

    // TODO: 生产环境 - 销毁 Docker 容器
    // await docker.getContainer(sandbox.containerId).remove({ force: true })

    sandbox.status = 'stopped'
    this.sandboxes.set(sandboxId, sandbox)

    // 清理文件存储
    this.fileStorage.delete(sandboxId)

    // 从列表中移除
    this.sandboxes.delete(sandboxId)

    this.emitEvent({
      type: 'status_change',
      sandboxId,
      projectId: sandbox.projectId,
      timestamp: Date.now(),
      data: { status: 'stopped' },
    })
  }

  /**
   * 导出沙盒内容
   */
  async export(sandboxId: string): Promise<{
    files: { path: string; content: string }[]
    sandbox: Sandbox
  }> {
    const sandbox = this.sandboxes.get(sandboxId)
    if (!sandbox) {
      throw new Error('Sandbox not found')
    }

    const files = this.fileStorage.get(sandboxId)
    if (!files) {
      throw new Error('File storage not initialized')
    }

    const fileList: { path: string; content: string }[] = []
    for (const [path, content] of files.entries()) {
      fileList.push({ path, content })
    }

    return {
      files: fileList,
      sandbox,
    }
  }

  /**
   * 清理过期沙盒
   */
  async cleanupExpired(): Promise<number> {
    const now = new Date()
    let cleaned = 0

    for (const [id, sandbox] of this.sandboxes.entries()) {
      if (sandbox.expiresAt < now) {
        await this.destroy(id)
        cleaned++
      }
    }

    return cleaned
  }

  /**
   * 添加事件监听器
   */
  addEventListener(listener: EventListener): void {
    this.eventListeners.push(listener)
  }

  /**
   * 移除事件监听器
   */
  removeEventListener(listener: EventListener): void {
    const index = this.eventListeners.indexOf(listener)
    if (index > -1) {
      this.eventListeners.splice(index, 1)
    }
  }

  // ============ 私有方法 ============

  /**
   * 发送事件
   */
  private emitEvent(event: SandboxEvent): void {
    for (const listener of this.eventListeners) {
      try {
        listener(event)
      } catch (error) {
        console.error('Event listener error:', error)
      }
    }
  }

  /**
   * 初始化项目结构
   */
  private async initProjectStructure(sandboxId: string, image: SandboxImage): Promise<void> {
    const files = this.fileStorage.get(sandboxId)
    if (!files) return

    // 根据镜像类型初始化不同的项目结构
    if (image === 'node18' || image === 'node20' || image === 'full') {
      // Node.js 项目结构
      files.set('/workspace/package.json', JSON.stringify({
        name: 'thinkus-project',
        version: '1.0.0',
        private: true,
        scripts: {
          dev: 'next dev',
          build: 'next build',
          start: 'next start',
        },
        dependencies: {
          next: '^14.0.0',
          react: '^18.0.0',
          'react-dom': '^18.0.0',
        },
      }, null, 2))

      files.set('/workspace/README.md', '# Thinkus Project\n\n由 Thinkus AI 创建的项目。')
    } else if (image === 'python3') {
      // Python 项目结构
      files.set('/workspace/requirements.txt', 'flask==2.0.0\nfastapi==0.100.0\nuvicorn==0.22.0\n')
      files.set('/workspace/README.md', '# Thinkus Project\n\n由 Thinkus AI 创建的 Python 项目。')
    }
  }

  /**
   * 模拟命令执行 (开发环境)
   */
  private simulateExec(sandboxId: string, command: string): Omit<ExecResult, 'duration'> {
    // 简单的命令模拟
    const parts = command.trim().split(/\s+/)
    const cmd = parts[0]

    switch (cmd) {
      case 'ls':
        return {
          exitCode: 0,
          stdout: 'package.json\nREADME.md\nsrc/\n',
          stderr: '',
        }

      case 'cat':
        const files = this.fileStorage.get(sandboxId)
        const path = parts[1]
        if (files && files.has(path)) {
          return {
            exitCode: 0,
            stdout: files.get(path) || '',
            stderr: '',
          }
        }
        return {
          exitCode: 1,
          stdout: '',
          stderr: `cat: ${path}: No such file or directory`,
        }

      case 'npm':
        if (parts[1] === 'install') {
          return {
            exitCode: 0,
            stdout: 'added 100 packages in 5s',
            stderr: '',
          }
        }
        if (parts[1] === 'run' && parts[2] === 'dev') {
          return {
            exitCode: 0,
            stdout: 'ready - started server on 0.0.0.0:3000',
            stderr: '',
          }
        }
        break

      case 'echo':
        return {
          exitCode: 0,
          stdout: parts.slice(1).join(' ') + '\n',
          stderr: '',
        }

      case 'pwd':
        return {
          exitCode: 0,
          stdout: '/workspace\n',
          stderr: '',
        }
    }

    return {
      exitCode: 0,
      stdout: `[模拟执行] ${command}\n`,
      stderr: '',
    }
  }
}

// 导出单例
export const sandboxManager = new SandboxManagerService()
