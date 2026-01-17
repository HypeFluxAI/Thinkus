import Anthropic from '@anthropic-ai/sdk'
import { getSonnetModel, getHaikuModel } from '@/lib/ai/model-router'

/**
 * 文件类型
 */
export type FileType =
  | 'pdf'
  | 'word'
  | 'excel'
  | 'image'
  | 'markdown'
  | 'text'
  | 'csv'
  | 'url'

/**
 * 上传文件
 */
export interface UploadedFile {
  id: string
  name: string
  type: FileType
  size: number
  buffer: Buffer
  mimeType?: string
}

/**
 * 内容类型
 */
export type ContentType =
  | 'requirement_doc'   // 需求文档
  | 'feature_list'      // 功能列表
  | 'ui_reference'      // UI参考
  | 'sketch'            // 草图
  | 'data_template'     // 数据模板
  | 'business_doc'      // 业务文档
  | 'unknown'

/**
 * 功能项
 */
export interface FeatureItem {
  name: string
  description: string
  priority?: 'P0' | 'P1' | 'P2' | 'P3'
  category?: string
}

/**
 * UI元素
 */
export interface UIElement {
  type: string
  description: string
  location?: string
}

/**
 * 数据字段
 */
export interface DataField {
  name: string
  type: string
  description?: string
  required?: boolean
}

/**
 * 参考资料
 */
export interface Reference {
  type: string
  url?: string
  description: string
}

/**
 * 结构化内容
 */
export interface StructuredContent {
  summary: string
  features?: FeatureItem[]
  uiElements?: UIElement[]
  dataStructure?: DataField[]
  references?: Reference[]
  confidence: number
}

/**
 * 处理结果
 */
export interface ProcessedResult {
  fileId: string
  fileName: string
  contentType: ContentType
  rawContent: string
  structured: StructuredContent
  confidence: number
  processingTimeMs: number
}

/**
 * 整合后的需求
 */
export interface IntegratedRequirement {
  summary: string
  features: FeatureItem[]
  uiReferences: UIElement[]
  dataModels: DataField[]
  references: Reference[]
  estimatedComplexity: 'L1' | 'L2' | 'L3' | 'L4' | 'L5'
  confidence: number
}

// Anthropic 客户端
const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
})

/**
 * Document Processor Service
 * 多格式文档处理服务
 */
export class DocumentProcessorService {
  /**
   * 处理多个文件
   */
  async process(files: UploadedFile[]): Promise<ProcessedResult[]> {
    return Promise.all(files.map(file => this.processFile(file)))
  }

  /**
   * 处理单个文件
   */
  async processFile(file: UploadedFile): Promise<ProcessedResult> {
    const startTime = Date.now()

    try {
      // 1. 提取原始内容
      const rawContent = await this.extractContent(file)

      // 2. AI 理解并结构化
      const structured = await this.understand(rawContent, file.type, file.name)

      // 3. 检测内容类型
      const contentType = this.detectContentType(structured)

      return {
        fileId: file.id,
        fileName: file.name,
        contentType,
        rawContent: rawContent.slice(0, 10000), // 限制原始内容长度
        structured,
        confidence: structured.confidence,
        processingTimeMs: Date.now() - startTime,
      }
    } catch (error) {
      console.error(`Failed to process file ${file.name}:`, error)

      return {
        fileId: file.id,
        fileName: file.name,
        contentType: 'unknown',
        rawContent: '',
        structured: {
          summary: `处理失败: ${error instanceof Error ? error.message : 'Unknown error'}`,
          confidence: 0,
        },
        confidence: 0,
        processingTimeMs: Date.now() - startTime,
      }
    }
  }

  /**
   * 处理 URL
   */
  async processURL(url: string): Promise<ProcessedResult> {
    const startTime = Date.now()

    try {
      // 简单的 URL 抓取 (可以后续集成 Puppeteer)
      const response = await fetch(url)
      const html = await response.text()

      // 提取纯文本 (简化版)
      const rawContent = this.extractTextFromHTML(html)

      const structured = await this.understand(rawContent, 'url', url)
      const contentType = this.detectContentType(structured)

      return {
        fileId: `url_${Date.now()}`,
        fileName: url,
        contentType,
        rawContent: rawContent.slice(0, 10000),
        structured,
        confidence: structured.confidence,
        processingTimeMs: Date.now() - startTime,
      }
    } catch (error) {
      console.error(`Failed to process URL ${url}:`, error)

      return {
        fileId: `url_${Date.now()}`,
        fileName: url,
        contentType: 'unknown',
        rawContent: '',
        structured: {
          summary: `处理失败: ${error instanceof Error ? error.message : 'Unknown error'}`,
          confidence: 0,
        },
        confidence: 0,
        processingTimeMs: Date.now() - startTime,
      }
    }
  }

  /**
   * 提取文件内容
   */
  private async extractContent(file: UploadedFile): Promise<string> {
    switch (file.type) {
      case 'pdf':
        return this.extractPDF(file.buffer)

      case 'image':
        return this.extractImage(file.buffer, file.mimeType)

      case 'excel':
      case 'csv':
        return this.extractExcel(file.buffer, file.type)

      case 'word':
        return this.extractWord(file.buffer)

      case 'markdown':
      case 'text':
      default:
        return file.buffer.toString('utf-8')
    }
  }

  /**
   * 提取 PDF 内容
   */
  private async extractPDF(buffer: Buffer): Promise<string> {
    try {
      // 动态导入 pdf-parse
      // @ts-ignore - pdf-parse doesn't have type declarations
      const pdfParse = (await import('pdf-parse')).default
      const data = await pdfParse(buffer)
      return data.text
    } catch (error) {
      console.error('PDF extraction failed, trying vision fallback:', error)

      // 降级到 Claude Vision (将 PDF 页面转为图片)
      // 这里简化处理，返回错误信息
      return `[PDF 解析失败，请确保安装 pdf-parse 依赖]`
    }
  }

  /**
   * 提取图片内容 (使用 Claude Vision)
   */
  private async extractImage(buffer: Buffer, mimeType?: string): Promise<string> {
    try {
      const base64 = buffer.toString('base64')
      const mediaType = (mimeType || 'image/png') as 'image/jpeg' | 'image/png' | 'image/gif' | 'image/webp'

      const response = await anthropic.messages.create({
        model: getSonnetModel(),
        max_tokens: 2000,
        messages: [{
          role: 'user',
          content: [
            {
              type: 'image',
              source: {
                type: 'base64',
                media_type: mediaType,
                data: base64,
              },
            },
            {
              type: 'text',
              text: `分析这张图片，提取以下信息：
1. 如果是UI设计/截图：描述页面布局、UI组件、交互元素
2. 如果是草图/线框图：识别页面结构、功能区域、用户流程
3. 如果是数据/图表：提取数据内容和结构
4. 如果是其他内容：描述主要信息

请用中文详细描述。`,
            },
          ],
        }],
      })

      const textBlock = response.content.find(block => block.type === 'text')
      return textBlock?.type === 'text' ? textBlock.text : ''
    } catch (error) {
      console.error('Image extraction failed:', error)
      return '[图片解析失败]'
    }
  }

  /**
   * 提取 Excel/CSV 内容
   */
  private async extractExcel(buffer: Buffer, type: 'excel' | 'csv'): Promise<string> {
    try {
      // 动态导入 xlsx
      // @ts-ignore - xlsx doesn't have type declarations
      const XLSX = await import('xlsx')
      const workbook = XLSX.read(buffer, { type: 'buffer' })

      const sheets: string[] = []

      for (const sheetName of workbook.SheetNames) {
        const sheet = workbook.Sheets[sheetName]
        const data = XLSX.utils.sheet_to_json(sheet, { header: 1 }) as unknown[][]

        // 转换为文本格式
        const lines = [`## Sheet: ${sheetName}`]
        for (const row of data.slice(0, 100)) { // 限制行数
          lines.push(row.join(' | '))
        }

        sheets.push(lines.join('\n'))
      }

      return sheets.join('\n\n')
    } catch (error) {
      console.error('Excel extraction failed:', error)
      return '[Excel 解析失败]'
    }
  }

  /**
   * 提取 Word 内容
   */
  private async extractWord(buffer: Buffer): Promise<string> {
    try {
      // 动态导入 mammoth
      // @ts-ignore - mammoth doesn't have type declarations
      const mammoth = await import('mammoth')
      const result = await mammoth.extractRawText({ buffer })
      return result.value
    } catch (error) {
      console.error('Word extraction failed:', error)
      return '[Word 解析失败]'
    }
  }

  /**
   * 从 HTML 提取纯文本
   */
  private extractTextFromHTML(html: string): string {
    // 简单的 HTML 标签移除
    return html
      .replace(/<script[^>]*>[\s\S]*?<\/script>/gi, '')
      .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, '')
      .replace(/<[^>]+>/g, ' ')
      .replace(/\s+/g, ' ')
      .trim()
      .slice(0, 20000)
  }

  /**
   * AI 理解内容
   */
  private async understand(
    content: string,
    fileType: FileType | 'url',
    fileName: string
  ): Promise<StructuredContent> {
    if (!content || content.length < 10) {
      return {
        summary: '内容为空或太短',
        confidence: 0,
      }
    }

    try {
      const response = await anthropic.messages.create({
        model: getSonnetModel(),
        max_tokens: 2000,
        messages: [{
          role: 'user',
          content: `分析以下${this.getTypeLabel(fileType)}内容，提取产品需求相关信息。

文件名: ${fileName}

内容:
${content.slice(0, 8000)}

请返回JSON格式 (确保JSON有效):
{
  "summary": "内容摘要 (50字以内)",
  "features": [{"name": "功能名", "description": "描述", "priority": "P0|P1|P2|P3", "category": "分类"}],
  "uiElements": [{"type": "组件类型", "description": "描述", "location": "位置"}],
  "dataStructure": [{"name": "字段名", "type": "类型", "description": "描述", "required": true}],
  "references": [{"type": "类型", "description": "描述"}],
  "confidence": 0.95
}

说明:
- features: 提取的功能需求列表
- uiElements: UI设计元素 (如果是UI相关)
- dataStructure: 数据结构 (如果有)
- references: 参考资料
- confidence: 提取置信度 0-1

只返回 JSON，不要其他内容。`,
        }],
      })

      const textBlock = response.content.find(block => block.type === 'text')
      if (!textBlock || textBlock.type !== 'text') {
        throw new Error('No text response')
      }

      // 提取 JSON
      const jsonMatch = textBlock.text.match(/\{[\s\S]*\}/)
      if (!jsonMatch) {
        throw new Error('No JSON found in response')
      }

      const parsed = JSON.parse(jsonMatch[0]) as StructuredContent

      return {
        summary: parsed.summary || '无摘要',
        features: parsed.features || [],
        uiElements: parsed.uiElements || [],
        dataStructure: parsed.dataStructure || [],
        references: parsed.references || [],
        confidence: parsed.confidence ?? 0.5,
      }
    } catch (error) {
      console.error('Content understanding failed:', error)

      return {
        summary: content.slice(0, 100),
        confidence: 0.3,
      }
    }
  }

  /**
   * 检测内容类型
   */
  private detectContentType(structured: StructuredContent): ContentType {
    // 根据提取内容判断类型
    if (structured.features && structured.features.length > 3) {
      return 'feature_list'
    }

    if (structured.uiElements && structured.uiElements.length > 0) {
      return 'ui_reference'
    }

    if (structured.dataStructure && structured.dataStructure.length > 0) {
      return 'data_template'
    }

    if (structured.summary && structured.summary.length > 50) {
      return 'requirement_doc'
    }

    return 'unknown'
  }

  /**
   * 获取文件类型标签
   */
  private getTypeLabel(type: FileType | 'url'): string {
    const labels: Record<FileType | 'url', string> = {
      pdf: 'PDF文档',
      word: 'Word文档',
      excel: 'Excel表格',
      image: '图片',
      markdown: 'Markdown文档',
      text: '文本文件',
      csv: 'CSV文件',
      url: '网页',
    }

    return labels[type] || '文件'
  }

  /**
   * 检测文件类型
   */
  static detectFileType(fileName: string, mimeType?: string): FileType {
    const ext = fileName.split('.').pop()?.toLowerCase()

    // 根据扩展名判断
    const extMap: Record<string, FileType> = {
      pdf: 'pdf',
      doc: 'word',
      docx: 'word',
      xls: 'excel',
      xlsx: 'excel',
      csv: 'csv',
      png: 'image',
      jpg: 'image',
      jpeg: 'image',
      gif: 'image',
      webp: 'image',
      md: 'markdown',
      txt: 'text',
    }

    if (ext && extMap[ext]) {
      return extMap[ext]
    }

    // 根据 MIME 类型判断
    if (mimeType) {
      if (mimeType.includes('pdf')) return 'pdf'
      if (mimeType.includes('word') || mimeType.includes('document')) return 'word'
      if (mimeType.includes('excel') || mimeType.includes('spreadsheet')) return 'excel'
      if (mimeType.startsWith('image/')) return 'image'
      if (mimeType.includes('csv')) return 'csv'
    }

    return 'text'
  }
}

// 导出单例
export const documentProcessor = new DocumentProcessorService()
