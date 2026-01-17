/**
 * Version Tracking System Types
 * 版本追踪系统，提供可视化变更历史和回滚功能
 */

export type ChangeType = 'create' | 'update' | 'delete' | 'rename' | 'move'
export type EntityType = 'file' | 'component' | 'function' | 'config' | 'requirement'

export interface FileChange {
  path: string
  type: ChangeType
  previousContent?: string
  currentContent?: string
  diff?: string
  linesAdded: number
  linesRemoved: number
}

export interface Version {
  id: string
  projectId: string
  sessionId: string
  version: string
  title: string
  description: string
  changes: FileChange[]
  metadata: VersionMetadata
  createdAt: Date
  createdBy: string
  parentVersionId?: string
  tags: string[]
}

export interface VersionMetadata {
  totalFiles: number
  totalLinesAdded: number
  totalLinesRemoved: number
  duration: number
  aiModel?: string
  promptTokens?: number
  completionTokens?: number
}

export interface VersionDiff {
  fromVersion: string
  toVersion: string
  changes: FileChange[]
  summary: string
}

export interface RollbackResult {
  success: boolean
  targetVersion: string
  restoredFiles: string[]
  errors: string[]
  newVersionId?: string
}

export interface VersionSearchOptions {
  projectId: string
  fromDate?: Date
  toDate?: Date
  tags?: string[]
  searchText?: string
  limit?: number
  offset?: number
}

export interface VersionTreeNode {
  version: Version
  children: VersionTreeNode[]
}
