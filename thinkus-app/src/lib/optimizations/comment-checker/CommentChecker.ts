/**
 * Comment Checker
 * 检查代码注释质量，清理冗余注释，让代码更专业
 */

import { CommentType, CommentIssue, CommentCheckResult, CommentCheckerConfig } from './types'

export class CommentChecker {
  private config: CommentCheckerConfig = {
    enableAutoClean: false,
    strictMode: false
  }

  // 有效注释模式
  private validPatterns: RegExp[] = [
    /^\s*\/\/\s*TODO:/i,
    /^\s*\/\/\s*FIXME:/i,
    /^\s*\/\/\s*HACK:/i,
    /^\s*\/\/\s*NOTE:/i,
    /^\s*\/\/\s*@ts-/i,
    /^\s*\/\/\s*eslint-/i,
    /^\s*\/\/\s*prettier-/i,
    /^\s*\/\/\s*@param/i,
    /^\s*\/\/\s*@returns/i,
    /^\s*\/\/\s*@example/i,
    /^\s*\/\*\*[\s\S]*?\*\//, // JSDoc
  ]

  // 冗余注释模式
  private redundantPatterns: RegExp[] = [
    /^\s*\/\/\s*(获取|设置|返回|创建|删除|更新).{0,10}$/,
    /^\s*\/\/\s*(This|The|A)\s+(function|method|class)/i,
    /^\s*\/\/\s*Created by/i,
    /^\s*\/\/\s*Generated/i,
    /^\s*\/\/\s*[-=]{3,}$/,
    /^\s*\/\/\s*$/,
    /^\s*\/\/\s*\d+$/,
    /^\s*\/\/\s*end\s*(of|if|else|for|while|function|class|try|catch)/i,
    /^\s*\/\/\s*constructor$/i,
    /^\s*\/\/\s*imports?$/i,
    /^\s*\/\/\s*exports?$/i,
  ]

  /**
   * 更新配置
   */
  updateConfig(config: Partial<CommentCheckerConfig>): void {
    this.config = { ...this.config, ...config }
    if (config.customValidPatterns) {
      this.validPatterns = [...this.validPatterns, ...config.customValidPatterns]
    }
    if (config.customRedundantPatterns) {
      this.redundantPatterns = [...this.redundantPatterns, ...config.customRedundantPatterns]
    }
  }

  /**
   * 检查单个文件
   */
  checkFile(filePath: string, content: string): CommentCheckResult {
    const lines = content.split('\n')
    const issues: CommentIssue[] = []

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i]
      const lineNumber = i + 1

      // 检测单行注释
      const commentMatch = line.match(/\/\/(.*)$/)
      if (commentMatch) {
        const result = this.classifyComment(commentMatch[0], line)
        if (result.type !== 'valid') {
          issues.push({
            line: lineNumber,
            content: commentMatch[0],
            ...result
          })
        }
      }
    }

    return {
      file: filePath,
      issues,
      summary: {
        total: issues.length,
        valid: 0,
        suspicious: issues.filter(i => i.type === 'suspicious').length,
        redundant: issues.filter(i => i.type === 'redundant').length
      }
    }
  }

  /**
   * 批量检查多个文件
   */
  checkFiles(files: Array<{ path: string; content: string }>): CommentCheckResult[] {
    return files
      .filter(f => /\.(ts|tsx|js|jsx)$/.test(f.path))
      .map(f => this.checkFile(f.path, f.content))
      .filter(r => r.summary.redundant > 0 || r.summary.suspicious > 0)
  }

  private classifyComment(comment: string, fullLine: string): { type: CommentType; reason: string; suggestion?: string } {
    // 检查有效模式
    for (const pattern of this.validPatterns) {
      if (pattern.test(comment)) {
        return { type: 'valid', reason: '有效注释' }
      }
    }

    // 检查冗余模式
    for (const pattern of this.redundantPatterns) {
      if (pattern.test(comment)) {
        return {
          type: 'redundant',
          reason: '冗余注释',
          suggestion: '建议删除'
        }
      }
    }

    // 严格模式下，所有非有效注释都标记为可疑
    if (this.config.strictMode) {
      return {
        type: 'suspicious',
        reason: '严格模式：未匹配有效模式',
        suggestion: '请确认是否必要'
      }
    }

    // 检查行内注释
    const codeBeforeComment = fullLine.split('//')[0].trim()
    if (codeBeforeComment.length > 0) {
      return {
        type: 'suspicious',
        reason: '行内注释，请确认必要性',
        suggestion: '如代码自解释，可删除'
      }
    }

    return {
      type: 'suspicious',
      reason: '独立注释行',
      suggestion: '确认是否必要'
    }
  }

  /**
   * 自动清理冗余注释
   */
  autoClean(content: string): { cleaned: string; removedCount: number } {
    if (!this.config.enableAutoClean) {
      return { cleaned: content, removedCount: 0 }
    }

    const lines = content.split('\n')
    const cleanedLines: string[] = []
    let removed = 0

    for (const line of lines) {
      let shouldRemove = false
      for (const pattern of this.redundantPatterns) {
        if (pattern.test(line)) {
          shouldRemove = true
          removed++
          break
        }
      }
      if (!shouldRemove) {
        cleanedLines.push(line)
      }
    }

    return {
      cleaned: cleanedLines.join('\n'),
      removedCount: removed
    }
  }

  /**
   * 清理指定行的注释
   */
  cleanLines(content: string, linesToRemove: number[]): string {
    const lines = content.split('\n')
    const lineSet = new Set(linesToRemove)
    return lines
      .filter((_, i) => !lineSet.has(i + 1))
      .join('\n')
  }

  /**
   * 生成修复建议
   */
  generateSuggestions(results: CommentCheckResult[]): string {
    const allIssues = results.flatMap(r => r.issues.map(i => ({ ...i, file: r.file })))

    if (allIssues.length === 0) {
      return '✅ 注释质量检查通过'
    }

    const redundant = allIssues.filter(i => i.type === 'redundant')
    const suspicious = allIssues.filter(i => i.type === 'suspicious')

    let msg = `📝 发现 ${allIssues.length} 处注释问题:\n\n`

    if (redundant.length > 0) {
      msg += `🗑️ 冗余注释 (${redundant.length}处):\n`
      redundant.slice(0, 5).forEach(i => {
        msg += `  ${i.file}:${i.line} - ${i.content.slice(0, 40)}...\n`
      })
      if (redundant.length > 5) {
        msg += `  ... 还有 ${redundant.length - 5} 处\n`
      }
      msg += '\n'
    }

    if (suspicious.length > 0) {
      msg += `⚠️ 可疑注释 (${suspicious.length}处):\n`
      suspicious.slice(0, 5).forEach(i => {
        msg += `  ${i.file}:${i.line} - ${i.reason}\n`
      })
      if (suspicious.length > 5) {
        msg += `  ... 还有 ${suspicious.length - 5} 处\n`
      }
    }

    return msg
  }

  /**
   * 获取汇总报告
   */
  getSummaryReport(results: CommentCheckResult[]): {
    totalFiles: number
    totalIssues: number
    redundant: number
    suspicious: number
    cleanable: number
  } {
    return {
      totalFiles: results.length,
      totalIssues: results.reduce((sum, r) => sum + r.summary.total, 0),
      redundant: results.reduce((sum, r) => sum + r.summary.redundant, 0),
      suspicious: results.reduce((sum, r) => sum + r.summary.suspicious, 0),
      cleanable: results.reduce((sum, r) => sum + r.summary.redundant, 0)
    }
  }
}

export const commentChecker = new CommentChecker()
