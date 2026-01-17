/**
 * Version Tracking System
 * 版本追踪系统，提供可视化变更历史和回滚功能
 */

import {
  Version,
  FileChange,
  VersionMetadata,
  VersionDiff,
  RollbackResult,
  VersionSearchOptions,
  VersionTreeNode,
  ChangeType
} from './types'

/**
 * Simple line-by-line diff implementation
 */
function simpleDiff(oldText: string, newText: string): Array<{ added?: boolean; removed?: boolean; value: string; count: number }> {
  const oldLines = oldText.split('\n')
  const newLines = newText.split('\n')
  const result: Array<{ added?: boolean; removed?: boolean; value: string; count: number }> = []

  const oldSet = new Set(oldLines)
  const newSet = new Set(newLines)

  // Find removed lines
  const removedLines = oldLines.filter(line => !newSet.has(line))
  if (removedLines.length > 0) {
    result.push({ removed: true, value: removedLines.join('\n'), count: removedLines.length })
  }

  // Find added lines
  const addedLines = newLines.filter(line => !oldSet.has(line))
  if (addedLines.length > 0) {
    result.push({ added: true, value: addedLines.join('\n'), count: addedLines.length })
  }

  // Find unchanged lines
  const unchangedLines = newLines.filter(line => oldSet.has(line))
  if (unchangedLines.length > 0) {
    result.push({ value: unchangedLines.join('\n'), count: unchangedLines.length })
  }

  return result
}

export class VersionTracker {
  private versions: Map<string, Version[]> = new Map() // projectId -> versions
  private currentVersionIndex: Map<string, number> = new Map()

  /**
   * 创建新版本
   */
  async createVersion(
    projectId: string,
    sessionId: string,
    title: string,
    description: string,
    changes: FileChange[],
    metadata: Partial<VersionMetadata> = {},
    tags: string[] = []
  ): Promise<Version> {
    const versions = this.versions.get(projectId) || []
    const versionNumber = this.generateVersionNumber(versions)
    const parentVersionId = versions.length > 0 ? versions[versions.length - 1].id : undefined

    const version: Version = {
      id: `${projectId}-${Date.now()}`,
      projectId,
      sessionId,
      version: versionNumber,
      title,
      description,
      changes: changes.map(c => this.enrichChange(c)),
      metadata: {
        totalFiles: changes.length,
        totalLinesAdded: changes.reduce((sum, c) => sum + c.linesAdded, 0),
        totalLinesRemoved: changes.reduce((sum, c) => sum + c.linesRemoved, 0),
        duration: 0,
        ...metadata
      },
      createdAt: new Date(),
      createdBy: 'ai',
      parentVersionId,
      tags
    }

    versions.push(version)
    this.versions.set(projectId, versions)
    this.currentVersionIndex.set(projectId, versions.length - 1)

    return version
  }

  /**
   * 生成版本号
   */
  private generateVersionNumber(versions: Version[]): string {
    if (versions.length === 0) {
      return '1.0.0'
    }

    const lastVersion = versions[versions.length - 1].version
    const parts = lastVersion.split('.').map(Number)

    // 自动增加补丁版本号
    parts[2] += 1
    if (parts[2] >= 100) {
      parts[2] = 0
      parts[1] += 1
    }
    if (parts[1] >= 100) {
      parts[1] = 0
      parts[0] += 1
    }

    return parts.join('.')
  }

  /**
   * 丰富变更信息
   */
  private enrichChange(change: FileChange): FileChange {
    if (change.previousContent && change.currentContent) {
      const diffResult = simpleDiff(
        change.previousContent,
        change.currentContent
      )

      let added = 0
      let removed = 0
      const diffLines: string[] = []

      for (const part of diffResult) {
        if (part.added) {
          added += part.count || 0
          diffLines.push(`+ ${part.value}`)
        } else if (part.removed) {
          removed += part.count || 0
          diffLines.push(`- ${part.value}`)
        } else {
          diffLines.push(`  ${part.value}`)
        }
      }

      return {
        ...change,
        diff: diffLines.join('\n'),
        linesAdded: added,
        linesRemoved: removed
      }
    }

    return change
  }

  /**
   * 获取版本历史
   */
  getHistory(projectId: string, limit?: number): Version[] {
    const versions = this.versions.get(projectId) || []
    if (limit) {
      return versions.slice(-limit)
    }
    return [...versions]
  }

  /**
   * 获取特定版本
   */
  getVersion(projectId: string, versionId: string): Version | undefined {
    const versions = this.versions.get(projectId) || []
    return versions.find(v => v.id === versionId)
  }

  /**
   * 获取版本差异
   */
  getDiff(projectId: string, fromVersionId: string, toVersionId: string): VersionDiff | null {
    const fromVersion = this.getVersion(projectId, fromVersionId)
    const toVersion = this.getVersion(projectId, toVersionId)

    if (!fromVersion || !toVersion) {
      return null
    }

    // 收集两个版本之间的所有变更
    const versions = this.versions.get(projectId) || []
    const fromIndex = versions.findIndex(v => v.id === fromVersionId)
    const toIndex = versions.findIndex(v => v.id === toVersionId)

    if (fromIndex === -1 || toIndex === -1 || fromIndex >= toIndex) {
      return null
    }

    const allChanges: FileChange[] = []
    for (let i = fromIndex + 1; i <= toIndex; i++) {
      allChanges.push(...versions[i].changes)
    }

    // 合并同一文件的变更
    const mergedChanges = this.mergeChanges(allChanges)

    return {
      fromVersion: fromVersion.version,
      toVersion: toVersion.version,
      changes: mergedChanges,
      summary: this.generateDiffSummary(mergedChanges)
    }
  }

  /**
   * 合并同一文件的变更
   */
  private mergeChanges(changes: FileChange[]): FileChange[] {
    const fileMap = new Map<string, FileChange>()

    for (const change of changes) {
      const existing = fileMap.get(change.path)
      if (existing) {
        // 合并变更
        fileMap.set(change.path, {
          ...change,
          previousContent: existing.previousContent,
          linesAdded: existing.linesAdded + change.linesAdded,
          linesRemoved: existing.linesRemoved + change.linesRemoved
        })
      } else {
        fileMap.set(change.path, change)
      }
    }

    return Array.from(fileMap.values())
  }

  /**
   * 生成差异摘要
   */
  private generateDiffSummary(changes: FileChange[]): string {
    const stats = {
      created: changes.filter(c => c.type === 'create').length,
      updated: changes.filter(c => c.type === 'update').length,
      deleted: changes.filter(c => c.type === 'delete').length,
      totalAdded: changes.reduce((sum, c) => sum + c.linesAdded, 0),
      totalRemoved: changes.reduce((sum, c) => sum + c.linesRemoved, 0)
    }

    const parts: string[] = []
    if (stats.created > 0) parts.push(`${stats.created} 个新文件`)
    if (stats.updated > 0) parts.push(`${stats.updated} 个修改`)
    if (stats.deleted > 0) parts.push(`${stats.deleted} 个删除`)

    return `${parts.join(', ')} (+${stats.totalAdded}/-${stats.totalRemoved} 行)`
  }

  /**
   * 回滚到指定版本
   */
  async rollback(
    projectId: string,
    targetVersionId: string,
    applyFn: (changes: FileChange[]) => Promise<void>
  ): Promise<RollbackResult> {
    const targetVersion = this.getVersion(projectId, targetVersionId)
    if (!targetVersion) {
      return {
        success: false,
        targetVersion: targetVersionId,
        restoredFiles: [],
        errors: ['目标版本不存在']
      }
    }

    const versions = this.versions.get(projectId) || []
    const targetIndex = versions.findIndex(v => v.id === targetVersionId)
    const currentIndex = this.currentVersionIndex.get(projectId) || versions.length - 1

    if (targetIndex >= currentIndex) {
      return {
        success: false,
        targetVersion: targetVersion.version,
        restoredFiles: [],
        errors: ['无法回滚到当前或更新的版本']
      }
    }

    // 收集需要还原的变更
    const rollbackChanges: FileChange[] = []
    for (let i = currentIndex; i > targetIndex; i--) {
      const version = versions[i]
      for (const change of version.changes) {
        // 反转变更
        rollbackChanges.push(this.reverseChange(change))
      }
    }

    try {
      await applyFn(rollbackChanges)

      // 创建回滚版本记录
      const rollbackVersion = await this.createVersion(
        projectId,
        targetVersion.sessionId,
        `回滚到 ${targetVersion.version}`,
        `从版本 ${versions[currentIndex].version} 回滚到 ${targetVersion.version}`,
        rollbackChanges,
        {},
        ['rollback']
      )

      return {
        success: true,
        targetVersion: targetVersion.version,
        restoredFiles: rollbackChanges.map(c => c.path),
        errors: [],
        newVersionId: rollbackVersion.id
      }
    } catch (error) {
      return {
        success: false,
        targetVersion: targetVersion.version,
        restoredFiles: [],
        errors: [error instanceof Error ? error.message : '回滚失败']
      }
    }
  }

  /**
   * 反转变更
   */
  private reverseChange(change: FileChange): FileChange {
    const typeMap: Record<ChangeType, ChangeType> = {
      create: 'delete',
      delete: 'create',
      update: 'update',
      rename: 'rename',
      move: 'move'
    }

    return {
      ...change,
      type: typeMap[change.type],
      previousContent: change.currentContent,
      currentContent: change.previousContent,
      linesAdded: change.linesRemoved,
      linesRemoved: change.linesAdded
    }
  }

  /**
   * 搜索版本
   */
  search(options: VersionSearchOptions): Version[] {
    let versions = this.versions.get(options.projectId) || []

    if (options.fromDate) {
      versions = versions.filter(v => v.createdAt >= options.fromDate!)
    }

    if (options.toDate) {
      versions = versions.filter(v => v.createdAt <= options.toDate!)
    }

    if (options.tags && options.tags.length > 0) {
      versions = versions.filter(v =>
        options.tags!.some(tag => v.tags.includes(tag))
      )
    }

    if (options.searchText) {
      const searchLower = options.searchText.toLowerCase()
      versions = versions.filter(v =>
        v.title.toLowerCase().includes(searchLower) ||
        v.description.toLowerCase().includes(searchLower)
      )
    }

    if (options.offset) {
      versions = versions.slice(options.offset)
    }

    if (options.limit) {
      versions = versions.slice(0, options.limit)
    }

    return versions
  }

  /**
   * 构建版本树
   */
  buildTree(projectId: string): VersionTreeNode | null {
    const versions = this.versions.get(projectId) || []
    if (versions.length === 0) {
      return null
    }

    const nodeMap = new Map<string, VersionTreeNode>()

    // 创建所有节点
    for (const version of versions) {
      nodeMap.set(version.id, { version, children: [] })
    }

    // 建立父子关系
    let root: VersionTreeNode | null = null
    for (const version of versions) {
      const node = nodeMap.get(version.id)!
      if (version.parentVersionId) {
        const parent = nodeMap.get(version.parentVersionId)
        if (parent) {
          parent.children.push(node)
        }
      } else {
        root = node
      }
    }

    return root
  }

  /**
   * 获取当前版本
   */
  getCurrentVersion(projectId: string): Version | undefined {
    const versions = this.versions.get(projectId) || []
    const index = this.currentVersionIndex.get(projectId) || versions.length - 1
    return versions[index]
  }

  /**
   * 添加标签
   */
  addTag(projectId: string, versionId: string, tag: string): boolean {
    const version = this.getVersion(projectId, versionId)
    if (version && !version.tags.includes(tag)) {
      version.tags.push(tag)
      return true
    }
    return false
  }

  /**
   * 清理项目版本
   */
  clear(projectId: string): void {
    this.versions.delete(projectId)
    this.currentVersionIndex.delete(projectId)
  }

  /**
   * 导出版本历史
   */
  export(projectId: string): string {
    const versions = this.versions.get(projectId) || []
    return JSON.stringify(versions, null, 2)
  }

  /**
   * 导入版本历史
   */
  import(projectId: string, data: string): void {
    try {
      const versions = JSON.parse(data) as Version[]
      this.versions.set(projectId, versions)
      this.currentVersionIndex.set(projectId, versions.length - 1)
    } catch {
      throw new Error('版本历史数据格式无效')
    }
  }
}

export const versionTracker = new VersionTracker()
