/**
 * 数据备份恢复服务
 *
 * 为小白用户提供简单的数据保护和恢复能力
 * - 自动定时备份
 * - 一键恢复数据
 * - 备份状态监控
 */

// ============================================================================
// 类型定义
// ============================================================================

/** 备份类型 */
export type BackupType = 'full' | 'incremental' | 'snapshot'

/** 备份状态 */
export type BackupStatus = 'pending' | 'in_progress' | 'completed' | 'failed' | 'expired'

/** 恢复状态 */
export type RestoreStatus = 'pending' | 'in_progress' | 'completed' | 'failed' | 'rolled_back'

/** 备份策略 */
export type BackupSchedule = 'hourly' | 'daily' | 'weekly' | 'monthly'

/** 存储位置 */
export type StorageLocation = 'local' | 's3' | 'gcs' | 'azure' | 'r2'

/** 备份记录 */
export interface BackupRecord {
  id: string
  projectId: string
  type: BackupType
  status: BackupStatus
  sizeBytes: number
  duration: number  // 秒
  startedAt: Date
  completedAt?: Date
  expiresAt?: Date
  storageLocation: StorageLocation
  storagePath: string
  metadata: {
    databaseVersion?: string
    collections?: string[]
    documentsCount?: number
    filesCount?: number
    checksum?: string
  }
  error?: string
}

/** 恢复记录 */
export interface RestoreRecord {
  id: string
  projectId: string
  backupId: string
  status: RestoreStatus
  startedAt: Date
  completedAt?: Date
  restoredBy: string
  targetPoint?: Date  // 时间点恢复
  error?: string
  rollbackAvailable: boolean
}

/** 备份配置 */
export interface BackupConfig {
  projectId: string
  enabled: boolean
  schedule: BackupSchedule
  type: BackupType
  retentionDays: number
  storageLocation: StorageLocation
  notifyOnFailure: boolean
  notifyEmail?: string
  excludeCollections?: string[]
  excludePatterns?: string[]
}

/** 备份统计 */
export interface BackupStats {
  totalBackups: number
  successfulBackups: number
  failedBackups: number
  totalSizeBytes: number
  avgDurationSeconds: number
  lastBackupAt?: Date
  nextBackupAt?: Date
  oldestBackupAt?: Date
  healthStatus: 'healthy' | 'warning' | 'critical'
  healthMessage: string
}

// ============================================================================
// 配置
// ============================================================================

/** 备份计划配置 */
const SCHEDULE_CONFIG: Record<BackupSchedule, {
  label: string
  intervalHours: number
  retentionMultiplier: number
}> = {
  hourly: { label: '每小时', intervalHours: 1, retentionMultiplier: 1 },
  daily: { label: '每天', intervalHours: 24, retentionMultiplier: 7 },
  weekly: { label: '每周', intervalHours: 168, retentionMultiplier: 4 },
  monthly: { label: '每月', intervalHours: 720, retentionMultiplier: 12 }
}

/** 存储位置配置 */
const STORAGE_CONFIG: Record<StorageLocation, {
  label: string
  icon: string
  available: boolean
}> = {
  local: { label: '本地存储', icon: '💾', available: true },
  s3: { label: 'AWS S3', icon: '☁️', available: true },
  gcs: { label: 'Google Cloud Storage', icon: '☁️', available: true },
  azure: { label: 'Azure Blob', icon: '☁️', available: true },
  r2: { label: 'Cloudflare R2', icon: '☁️', available: true }
}

/** 默认备份配置 */
const DEFAULT_CONFIG: Omit<BackupConfig, 'projectId'> = {
  enabled: true,
  schedule: 'daily',
  type: 'incremental',
  retentionDays: 30,
  storageLocation: 'r2',
  notifyOnFailure: true
}

// ============================================================================
// 辅助函数
// ============================================================================

function generateId(): string {
  return `backup-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`
}

function formatBytes(bytes: number): string {
  if (bytes === 0) return '0 B'
  const k = 1024
  const sizes = ['B', 'KB', 'MB', 'GB', 'TB']
  const i = Math.floor(Math.log(bytes) / Math.log(k))
  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(2))} ${sizes[i]}`
}

function formatDuration(seconds: number): string {
  if (seconds < 60) return `${seconds}秒`
  if (seconds < 3600) return `${Math.floor(seconds / 60)}分钟`
  return `${Math.floor(seconds / 3600)}小时${Math.floor((seconds % 3600) / 60)}分钟`
}

// ============================================================================
// 数据备份服务
// ============================================================================

export class DataBackupService {
  // 存储配置
  private configs: Map<string, BackupConfig> = new Map()
  // 存储备份记录
  private backups: Map<string, BackupRecord[]> = new Map()
  // 存储恢复记录
  private restores: Map<string, RestoreRecord[]> = new Map()

  /**
   * 配置备份
   */
  configureBackup(projectId: string, config: Partial<BackupConfig>): BackupConfig {
    const existing = this.configs.get(projectId)
    const newConfig: BackupConfig = {
      ...DEFAULT_CONFIG,
      ...existing,
      ...config,
      projectId
    }

    this.configs.set(projectId, newConfig)
    return newConfig
  }

  /**
   * 获取备份配置
   */
  getConfig(projectId: string): BackupConfig {
    return this.configs.get(projectId) || {
      ...DEFAULT_CONFIG,
      projectId
    }
  }

  /**
   * 创建备份
   */
  async createBackup(
    projectId: string,
    options: {
      type?: BackupType
      description?: string
      onProgress?: (progress: number) => void
    } = {}
  ): Promise<BackupRecord> {
    const config = this.getConfig(projectId)
    const type = options.type || config.type

    const backup: BackupRecord = {
      id: generateId(),
      projectId,
      type,
      status: 'in_progress',
      sizeBytes: 0,
      duration: 0,
      startedAt: new Date(),
      storageLocation: config.storageLocation,
      storagePath: `backups/${projectId}/${Date.now()}`,
      metadata: {}
    }

    // 存储备份记录
    const projectBackups = this.backups.get(projectId) || []
    projectBackups.unshift(backup)
    this.backups.set(projectId, projectBackups)

    // 模拟备份过程
    try {
      // 阶段1: 收集数据
      options.onProgress?.(10)
      await this.sleep(500)

      // 阶段2: 压缩数据
      options.onProgress?.(30)
      await this.sleep(500)

      // 阶段3: 上传到存储
      options.onProgress?.(60)
      await this.sleep(500)

      // 阶段4: 验证备份
      options.onProgress?.(90)
      await this.sleep(300)

      // 完成
      backup.status = 'completed'
      backup.completedAt = new Date()
      backup.duration = Math.round(
        (backup.completedAt.getTime() - backup.startedAt.getTime()) / 1000
      )
      backup.sizeBytes = Math.floor(Math.random() * 100000000) + 1000000 // 模拟大小
      backup.expiresAt = new Date(Date.now() + config.retentionDays * 24 * 60 * 60 * 1000)
      backup.metadata = {
        databaseVersion: '6.0',
        collections: ['users', 'projects', 'sessions'],
        documentsCount: Math.floor(Math.random() * 10000) + 100,
        filesCount: Math.floor(Math.random() * 500) + 10,
        checksum: Math.random().toString(36).substring(2)
      }

      options.onProgress?.(100)

      console.log(`[备份] 项目 ${projectId} 备份完成: ${backup.id}`)

    } catch (error) {
      backup.status = 'failed'
      backup.error = error instanceof Error ? error.message : '备份失败'

      if (config.notifyOnFailure) {
        console.log(`[备份] 项目 ${projectId} 备份失败，需要通知`)
      }
    }

    return backup
  }

  /**
   * 恢复备份
   */
  async restoreBackup(
    projectId: string,
    backupId: string,
    restoredBy: string,
    options: {
      targetPoint?: Date
      onProgress?: (progress: number) => void
    } = {}
  ): Promise<RestoreRecord> {
    const projectBackups = this.backups.get(projectId) || []
    const backup = projectBackups.find(b => b.id === backupId)

    if (!backup) {
      throw new Error(`备份 ${backupId} 不存在`)
    }

    if (backup.status !== 'completed') {
      throw new Error(`备份 ${backupId} 状态异常，无法恢复`)
    }

    const restore: RestoreRecord = {
      id: generateId(),
      projectId,
      backupId,
      status: 'in_progress',
      startedAt: new Date(),
      restoredBy,
      targetPoint: options.targetPoint,
      rollbackAvailable: true
    }

    // 存储恢复记录
    const projectRestores = this.restores.get(projectId) || []
    projectRestores.unshift(restore)
    this.restores.set(projectId, projectRestores)

    // 模拟恢复过程
    try {
      // 阶段1: 下载备份
      options.onProgress?.(10)
      await this.sleep(500)

      // 阶段2: 验证备份
      options.onProgress?.(20)
      await this.sleep(300)

      // 阶段3: 停止服务
      options.onProgress?.(30)
      await this.sleep(200)

      // 阶段4: 恢复数据
      options.onProgress?.(50)
      await this.sleep(1000)

      // 阶段5: 验证数据
      options.onProgress?.(80)
      await this.sleep(500)

      // 阶段6: 重启服务
      options.onProgress?.(95)
      await this.sleep(300)

      // 完成
      restore.status = 'completed'
      restore.completedAt = new Date()

      options.onProgress?.(100)

      console.log(`[备份] 项目 ${projectId} 恢复完成: ${restore.id}`)

    } catch (error) {
      restore.status = 'failed'
      restore.error = error instanceof Error ? error.message : '恢复失败'
    }

    return restore
  }

  /**
   * 获取备份列表
   */
  getBackups(projectId: string): BackupRecord[] {
    return this.backups.get(projectId) || []
  }

  /**
   * 获取恢复列表
   */
  getRestores(projectId: string): RestoreRecord[] {
    return this.restores.get(projectId) || []
  }

  /**
   * 获取备份统计
   */
  getStats(projectId: string): BackupStats {
    const backups = this.getBackups(projectId)
    const config = this.getConfig(projectId)

    const successfulBackups = backups.filter(b => b.status === 'completed')
    const failedBackups = backups.filter(b => b.status === 'failed')

    const totalSize = successfulBackups.reduce((sum, b) => sum + b.sizeBytes, 0)
    const avgDuration = successfulBackups.length > 0
      ? successfulBackups.reduce((sum, b) => sum + b.duration, 0) / successfulBackups.length
      : 0

    const lastBackup = successfulBackups[0]
    const oldestBackup = successfulBackups[successfulBackups.length - 1]

    // 计算下次备份时间
    const scheduleConfig = SCHEDULE_CONFIG[config.schedule]
    const nextBackup = lastBackup
      ? new Date(lastBackup.completedAt!.getTime() + scheduleConfig.intervalHours * 60 * 60 * 1000)
      : new Date()

    // 评估健康状态
    let healthStatus: 'healthy' | 'warning' | 'critical' = 'healthy'
    let healthMessage = '备份状态良好'

    if (!lastBackup) {
      healthStatus = 'critical'
      healthMessage = '从未成功备份'
    } else {
      const hoursSinceLastBackup = (Date.now() - lastBackup.completedAt!.getTime()) / 1000 / 60 / 60

      if (hoursSinceLastBackup > scheduleConfig.intervalHours * 2) {
        healthStatus = 'critical'
        healthMessage = `已超过 ${Math.round(hoursSinceLastBackup)} 小时未备份`
      } else if (hoursSinceLastBackup > scheduleConfig.intervalHours * 1.5) {
        healthStatus = 'warning'
        healthMessage = '备份可能已延迟'
      } else if (failedBackups.length > 0 && failedBackups[0].startedAt > lastBackup.startedAt) {
        healthStatus = 'warning'
        healthMessage = '最近一次备份失败'
      }
    }

    return {
      totalBackups: backups.length,
      successfulBackups: successfulBackups.length,
      failedBackups: failedBackups.length,
      totalSizeBytes: totalSize,
      avgDurationSeconds: avgDuration,
      lastBackupAt: lastBackup?.completedAt,
      nextBackupAt: nextBackup,
      oldestBackupAt: oldestBackup?.completedAt,
      healthStatus,
      healthMessage
    }
  }

  /**
   * 删除过期备份
   */
  cleanupExpiredBackups(projectId: string): number {
    const projectBackups = this.backups.get(projectId) || []
    const now = Date.now()

    const validBackups = projectBackups.filter(b => {
      if (b.status !== 'completed') return true
      if (!b.expiresAt) return true
      return b.expiresAt.getTime() > now
    })

    const deletedCount = projectBackups.length - validBackups.length
    this.backups.set(projectId, validBackups)

    console.log(`[备份] 项目 ${projectId} 清理了 ${deletedCount} 个过期备份`)
    return deletedCount
  }

  /**
   * 获取存储使用情况
   */
  getStorageUsage(projectId: string): {
    usedBytes: number
    usedFormatted: string
    backupCount: number
    oldestBackup?: Date
    newestBackup?: Date
  } {
    const backups = this.getBackups(projectId)
      .filter(b => b.status === 'completed')

    const usedBytes = backups.reduce((sum, b) => sum + b.sizeBytes, 0)

    return {
      usedBytes,
      usedFormatted: formatBytes(usedBytes),
      backupCount: backups.length,
      oldestBackup: backups[backups.length - 1]?.completedAt,
      newestBackup: backups[0]?.completedAt
    }
  }

  /**
   * 获取配置选项
   */
  getScheduleConfig() {
    return SCHEDULE_CONFIG
  }

  getStorageConfig() {
    return STORAGE_CONFIG
  }

  /**
   * 生成备份摘要
   */
  generateBackupSummary(projectId: string): string {
    const stats = this.getStats(projectId)
    const usage = this.getStorageUsage(projectId)
    const config = this.getConfig(projectId)

    let summary = `# 备份状态报告\n\n`

    // 健康状态
    const healthIcon = stats.healthStatus === 'healthy' ? '🟢' :
                       stats.healthStatus === 'warning' ? '🟡' : '🔴'
    summary += `## 健康状态\n\n`
    summary += `${healthIcon} **${stats.healthMessage}**\n\n`

    // 备份配置
    summary += `## 当前配置\n\n`
    summary += `- 备份计划: ${SCHEDULE_CONFIG[config.schedule].label}\n`
    summary += `- 备份类型: ${config.type}\n`
    summary += `- 保留天数: ${config.retentionDays} 天\n`
    summary += `- 存储位置: ${STORAGE_CONFIG[config.storageLocation].label}\n\n`

    // 统计数据
    summary += `## 统计数据\n\n`
    summary += `- 总备份数: ${stats.totalBackups}\n`
    summary += `- 成功备份: ${stats.successfulBackups}\n`
    summary += `- 失败备份: ${stats.failedBackups}\n`
    summary += `- 存储使用: ${usage.usedFormatted}\n`
    summary += `- 平均耗时: ${formatDuration(stats.avgDurationSeconds)}\n\n`

    // 时间信息
    if (stats.lastBackupAt) {
      summary += `## 时间信息\n\n`
      summary += `- 最后备份: ${stats.lastBackupAt.toLocaleString('zh-CN')}\n`
      summary += `- 下次备份: ${stats.nextBackupAt?.toLocaleString('zh-CN')}\n`
      if (stats.oldestBackupAt) {
        summary += `- 最早备份: ${stats.oldestBackupAt.toLocaleString('zh-CN')}\n`
      }
    }

    return summary
  }

  private sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms))
  }
}

// 导出单例
export const dataBackup = new DataBackupService()
