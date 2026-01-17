/**
 * Comment Checker Types
 * 检查代码注释质量，清理冗余注释
 */

export type CommentType = 'valid' | 'suspicious' | 'redundant'

export interface CommentIssue {
  line: number
  content: string
  type: CommentType
  reason: string
  suggestion?: string
}

export interface CommentCheckResult {
  file: string
  issues: CommentIssue[]
  summary: {
    total: number
    valid: number
    suspicious: number
    redundant: number
  }
}

export interface CommentCheckerConfig {
  enableAutoClean: boolean
  strictMode: boolean
  customValidPatterns?: RegExp[]
  customRedundantPatterns?: RegExp[]
}
