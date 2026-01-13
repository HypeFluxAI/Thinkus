import mongoose from 'mongoose'
import { S3Client, PutObjectCommand, GetObjectCommand } from '@aws-sdk/client-s3'
import Anthropic from '@anthropic-ai/sdk'
import {
  Artifact,
  type IArtifact,
  type ArtifactType,
  type ArtifactCompact,
} from '@/lib/db/models'

/**
 * Artifact 存储选项
 */
interface ArtifactStoreInput {
  userId: mongoose.Types.ObjectId
  projectId?: mongoose.Types.ObjectId
  sessionId: string
  toolCallId?: string
  content: string
  mimeType?: string
  fileName?: string
  artifactType?: ArtifactType
  metadata?: Record<string, unknown>
  expiresAt?: Date
}

/**
 * Artifact 获取选项
 */
interface ArtifactGetOptions {
  lines?: string      // "1-50"
  bytes?: string      // "0-1000"
  jsonPath?: string   // "$.data[0]"
  search?: string     // "function login"
}

// S3 客户端配置 (兼容 R2)
const s3Client = new S3Client({
  region: process.env.R2_REGION || 'auto',
  endpoint: process.env.R2_ENDPOINT || `https://${process.env.R2_ACCOUNT_ID}.r2.cloudflarestorage.com`,
  credentials: {
    accessKeyId: process.env.R2_ACCESS_KEY_ID || '',
    secretAccessKey: process.env.R2_SECRET_ACCESS_KEY || '',
  },
})

const ARTIFACT_BUCKET = process.env.R2_BUCKET_NAME || 'thinkus-artifacts'

// Anthropic 客户端
const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
})

/**
 * Artifact Service
 * 管理工具产物的存储、检索和压缩
 */
export class ArtifactService {
  /**
   * 存储产物 (Full 内容存储到 R2/S3)
   */
  async store(input: ArtifactStoreInput): Promise<{
    artifact: IArtifact
    compact: ArtifactCompact
  }> {
    const {
      userId,
      projectId,
      sessionId,
      toolCallId,
      content,
      mimeType = 'text/plain',
      fileName,
      artifactType = this.detectArtifactType(content, mimeType),
      metadata,
      expiresAt,
    } = input

    const sizeBytes = Buffer.byteLength(content, 'utf-8')
    let storagePath: string
    let storageType: 'r2' | 'inline' = 'r2'

    // 小内容直接内联存储
    if (sizeBytes < 1024) {
      storagePath = content
      storageType = 'inline'
    } else {
      // 大内容存储到 R2
      const artifactId = new mongoose.Types.ObjectId()
      storagePath = `artifacts/${userId}/${sessionId}/${artifactId}`

      try {
        await s3Client.send(new PutObjectCommand({
          Bucket: ARTIFACT_BUCKET,
          Key: storagePath,
          Body: content,
          ContentType: mimeType,
          Metadata: {
            userId: userId.toString(),
            sessionId,
            ...(projectId && { projectId: projectId.toString() }),
          },
        }))
      } catch (error) {
        console.error('Failed to upload to R2, falling back to inline:', error)
        // 上传失败，回退到内联存储
        storagePath = content
        storageType = 'inline'
      }
    }

    // 生成 Compact 摘要
    const compactSummary = await this.generateCompact(content, artifactType, mimeType)

    // 存储元数据到 MongoDB
    const artifact = await Artifact.createArtifact({
      userId,
      projectId,
      sessionId,
      toolCallId,
      storageType,
      storagePath,
      mimeType,
      sizeBytes,
      compactSummary,
      artifactType,
      fileName,
      metadata,
      expiresAt,
    })

    return {
      artifact,
      compact: artifact.toCompact(),
    }
  }

  /**
   * 获取产物内容 (支持局部读取)
   */
  async get(artifactId: string, options?: ArtifactGetOptions): Promise<string> {
    const artifact = await Artifact.findById(artifactId)
    if (!artifact) {
      throw new Error('Artifact not found')
    }

    let content: string

    // 获取完整内容
    if (artifact.storageType === 'inline') {
      content = artifact.storagePath
    } else {
      try {
        const response = await s3Client.send(new GetObjectCommand({
          Bucket: ARTIFACT_BUCKET,
          Key: artifact.storagePath,
        }))
        content = await response.Body?.transformToString() || ''
      } catch (error) {
        console.error('Failed to fetch from R2:', error)
        throw new Error('Failed to retrieve artifact content')
      }
    }

    // 局部读取
    if (options?.lines) {
      return this.extractLines(content, options.lines)
    }
    if (options?.bytes) {
      return this.extractBytes(content, options.bytes)
    }
    if (options?.jsonPath) {
      return this.extractJsonPath(content, options.jsonPath)
    }
    if (options?.search) {
      return this.extractSearch(content, options.search)
    }

    return content
  }

  /**
   * 获取 Compact 格式
   */
  async getCompact(artifactId: string): Promise<ArtifactCompact | null> {
    const artifact = await Artifact.findById(artifactId)
    if (!artifact) return null
    return artifact.toCompact()
  }

  /**
   * 获取会话的所有 Artifact Compact
   */
  async getSessionCompacts(sessionId: string): Promise<ArtifactCompact[]> {
    const artifacts = await Artifact.getSessionArtifacts(sessionId)
    return artifacts.map(a => a.toCompact())
  }

  /**
   * 格式化 Compact 为上下文注入文本
   */
  formatCompactForContext(compact: ArtifactCompact): string {
    const lines = [
      `[Artifact: ${compact.ref}]`,
      `类型: ${this.getTypeLabel(compact.type)}`,
    ]

    if (compact.fileName) {
      lines.push(`文件: ${compact.fileName}`)
    }
    if (compact.path) {
      lines.push(`路径: ${compact.path}`)
    }

    lines.push(`摘要: ${compact.summary}`)

    if (compact.size) {
      lines.push(`大小: ${compact.size}`)
    }

    if (compact.locators.length > 0) {
      const locatorExamples = compact.locators
        .slice(0, 2)
        .map(l => l.example)
        .join(' 或 ')
      lines.push(`获取: 可通过 get_artifact("${compact.ref}", ${locatorExamples}) 获取局部内容`)
    }

    return lines.join('\n')
  }

  /**
   * 批量格式化 Compact 列表
   */
  formatCompactsForContext(compacts: ArtifactCompact[]): string {
    if (compacts.length === 0) return ''

    const header = '## 相关产物\n'
    const items = compacts.map(c => this.formatCompactForContext(c)).join('\n\n')
    return header + items
  }

  // ============ 私有方法 ============

  /**
   * 生成 Compact 摘要
   */
  private async generateCompact(
    content: string,
    artifactType: ArtifactType,
    mimeType: string
  ): Promise<string> {
    // 小内容直接返回
    if (content.length < 300) {
      return content
    }

    // 代码类型的特殊处理
    if (artifactType === 'code') {
      return this.generateCodeCompact(content)
    }

    // 使用 AI 生成摘要
    try {
      const response = await anthropic.messages.create({
        model: 'claude-3-5-haiku-20241022',
        max_tokens: 300,
        messages: [{
          role: 'user',
          content: `生成以下内容的简短摘要 (不超过200字):

类型: ${mimeType}
内容:
${content.slice(0, 3000)}
${content.length > 3000 ? '...(截断)' : ''}

要求:
1. 说明这是什么类型的内容
2. 概括主要内容/功能
3. 如果是代码，列出主要函数/类
4. 如果是文档，列出主要章节

直接输出摘要，不要额外说明。`
        }]
      })

      const textBlock = response.content.find(block => block.type === 'text')
      return textBlock?.text || content.slice(0, 200)
    } catch (error) {
      console.error('Failed to generate compact with AI:', error)
      // 降级处理
      return content.slice(0, 200) + (content.length > 200 ? '...' : '')
    }
  }

  /**
   * 为代码生成 Compact
   */
  private generateCodeCompact(content: string): string {
    const lines = content.split('\n')
    const totalLines = lines.length

    // 提取函数/类定义
    const definitions: string[] = []
    const patterns = [
      /^(?:export\s+)?(?:async\s+)?function\s+(\w+)/,
      /^(?:export\s+)?class\s+(\w+)/,
      /^(?:export\s+)?interface\s+(\w+)/,
      /^(?:export\s+)?type\s+(\w+)/,
      /^(?:export\s+)?const\s+(\w+)\s*=/,
    ]

    for (const line of lines) {
      for (const pattern of patterns) {
        const match = line.match(pattern)
        if (match) {
          definitions.push(match[1])
          break
        }
      }
    }

    const parts = [`${totalLines}行代码`]

    if (definitions.length > 0) {
      const displayDefs = definitions.slice(0, 5)
      parts.push(`包含: ${displayDefs.join(', ')}${definitions.length > 5 ? ` 等${definitions.length}项` : ''}`)
    }

    return parts.join('，')
  }

  /**
   * 检测 Artifact 类型
   */
  private detectArtifactType(content: string, mimeType: string): ArtifactType {
    if (mimeType.startsWith('application/json')) return 'data'
    if (mimeType.includes('javascript') || mimeType.includes('typescript')) return 'code'
    if (mimeType.includes('python') || mimeType.includes('java')) return 'code'
    if (mimeType.startsWith('text/html') || mimeType.startsWith('text/css')) return 'code'
    if (mimeType.startsWith('text/markdown')) return 'document'
    if (mimeType.startsWith('image/')) return 'design'

    // 基于内容检测
    if (content.includes('function ') || content.includes('class ') ||
        content.includes('import ') || content.includes('export ')) {
      return 'code'
    }
    if (content.startsWith('{') || content.startsWith('[')) {
      return 'data'
    }
    if (content.includes('# ') || content.includes('## ')) {
      return 'document'
    }

    return 'other'
  }

  /**
   * 获取类型标签
   */
  private getTypeLabel(type: ArtifactType): string {
    const labels: Record<ArtifactType, string> = {
      code: '代码文件',
      document: '文档',
      report: '分析报告',
      design: '设计稿',
      data: '数据文件',
      config: '配置文件',
      other: '其他',
    }
    return labels[type]
  }

  /**
   * 按行号提取内容
   */
  private extractLines(content: string, range: string): string {
    const [startStr, endStr] = range.split('-')
    const start = parseInt(startStr, 10)
    const end = endStr ? parseInt(endStr, 10) : start

    const lines = content.split('\n')
    const extracted = lines.slice(start - 1, end)

    return extracted.map((line, i) => `${start + i}: ${line}`).join('\n')
  }

  /**
   * 按字节提取内容
   */
  private extractBytes(content: string, range: string): string {
    const [startStr, endStr] = range.split('-')
    const start = parseInt(startStr, 10)
    const end = endStr ? parseInt(endStr, 10) : content.length

    return content.slice(start, end)
  }

  /**
   * 按 JSONPath 提取内容
   */
  private extractJsonPath(content: string, path: string): string {
    try {
      const obj = JSON.parse(content)
      // 简单的 JSONPath 实现
      const parts = path.replace(/^\$\.?/, '').split('.')
      let result: unknown = obj

      for (const part of parts) {
        if (result === undefined || result === null) break

        // 处理数组索引 [0]
        const arrayMatch = part.match(/^(\w+)\[(\d+)\]$/)
        if (arrayMatch) {
          const [, key, index] = arrayMatch
          result = (result as Record<string, unknown>)[key]
          if (Array.isArray(result)) {
            result = result[parseInt(index, 10)]
          }
        } else {
          result = (result as Record<string, unknown>)[part]
        }
      }

      return JSON.stringify(result, null, 2)
    } catch (error) {
      return `JSONPath 提取失败: ${error instanceof Error ? error.message : 'Unknown error'}`
    }
  }

  /**
   * 按关键词搜索提取内容
   */
  private extractSearch(content: string, keyword: string): string {
    const lines = content.split('\n')
    const matchIndexes: number[] = []

    lines.forEach((line, i) => {
      if (line.toLowerCase().includes(keyword.toLowerCase())) {
        matchIndexes.push(i)
      }
    })

    if (matchIndexes.length === 0) {
      return `未找到关键词: "${keyword}"`
    }

    // 返回匹配行及前后3行上下文
    const contextLines = 3
    const result: string[] = []

    matchIndexes.slice(0, 3).forEach(idx => {
      const start = Math.max(0, idx - contextLines)
      const end = Math.min(lines.length, idx + contextLines + 1)

      result.push(`// 第 ${start + 1}-${end} 行 (匹配行: ${idx + 1})`)
      for (let i = start; i < end; i++) {
        const prefix = i === idx ? '>>> ' : '    '
        result.push(`${prefix}${i + 1}: ${lines[i]}`)
      }
      result.push('')
    })

    if (matchIndexes.length > 3) {
      result.push(`// ... 还有 ${matchIndexes.length - 3} 处匹配`)
    }

    return result.join('\n')
  }
}

// 导出单例
export const artifactService = new ArtifactService()
