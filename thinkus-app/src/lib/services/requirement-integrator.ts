import Anthropic from '@anthropic-ai/sdk'
import { getSonnetModel } from '@/lib/ai/model-router'
import type {
  ProcessedResult,
  FeatureItem,
  UIElement,
  DataField,
  Reference,
  IntegratedRequirement,
} from './document-processor'

/**
 * 整合输入
 */
export interface IntegrationInput {
  // 处理后的文件结果
  documents: ProcessedResult[]
  // 用户的原始描述
  userDescription: string
  // 项目类型
  projectType?: string
  // 额外上下文
  additionalContext?: string
}

/**
 * 整合输出
 */
export interface IntegrationOutput {
  // 整合后的需求
  requirement: IntegratedRequirement
  // 来源追溯
  sources: {
    feature: string
    source: string
  }[]
  // 处理元数据
  metadata: {
    totalDocuments: number
    totalFeatures: number
    processingTimeMs: number
  }
}

// Anthropic 客户端
const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
})

/**
 * Requirement Integrator Service
 * 需求整合器 - 将多个文档的提取结果整合为统一的需求文档
 */
export class RequirementIntegratorService {
  /**
   * 整合多个文档的需求
   */
  async integrate(input: IntegrationInput): Promise<IntegrationOutput> {
    const startTime = Date.now()

    // 1. 合并所有功能
    const allFeatures = this.mergeFeatures(input.documents)

    // 2. 合并 UI 参考
    const allUIElements = this.mergeUIElements(input.documents)

    // 3. 合并数据结构
    const allDataFields = this.mergeDataFields(input.documents)

    // 4. 合并参考资料
    const allReferences = this.mergeReferences(input.documents)

    // 5. 使用 AI 整合和去重
    const integrated = await this.aiIntegrate({
      userDescription: input.userDescription,
      projectType: input.projectType,
      features: allFeatures,
      uiElements: allUIElements,
      dataFields: allDataFields,
      references: allReferences,
      additionalContext: input.additionalContext,
    })

    // 6. 构建来源追溯
    const sources = this.buildSourceTracking(input.documents, integrated.features)

    return {
      requirement: integrated,
      sources,
      metadata: {
        totalDocuments: input.documents.length,
        totalFeatures: integrated.features.length,
        processingTimeMs: Date.now() - startTime,
      },
    }
  }

  /**
   * 快速整合 (不使用AI，直接合并)
   */
  quickIntegrate(input: IntegrationInput): IntegrationOutput {
    const startTime = Date.now()

    // 合并所有内容
    const features = this.mergeFeatures(input.documents)
    const uiElements = this.mergeUIElements(input.documents)
    const dataFields = this.mergeDataFields(input.documents)
    const references = this.mergeReferences(input.documents)

    // 生成摘要
    const summaries = input.documents
      .map(d => d.structured.summary)
      .filter(Boolean)
      .join('; ')

    const requirement: IntegratedRequirement = {
      summary: input.userDescription || summaries.slice(0, 200),
      features: this.deduplicateFeatures(features),
      uiReferences: uiElements,
      dataModels: dataFields,
      references,
      estimatedComplexity: this.estimateComplexity(features.length),
      confidence: this.calculateAverageConfidence(input.documents),
    }

    return {
      requirement,
      sources: this.buildSourceTracking(input.documents, features),
      metadata: {
        totalDocuments: input.documents.length,
        totalFeatures: requirement.features.length,
        processingTimeMs: Date.now() - startTime,
      },
    }
  }

  /**
   * AI 整合
   */
  private async aiIntegrate(params: {
    userDescription: string
    projectType?: string
    features: FeatureItem[]
    uiElements: UIElement[]
    dataFields: DataField[]
    references: Reference[]
    additionalContext?: string
  }): Promise<IntegratedRequirement> {
    try {
      const response = await anthropic.messages.create({
        model: getSonnetModel(),
        max_tokens: 3000,
        messages: [{
          role: 'user',
          content: `作为产品需求分析专家，请整合以下信息生成统一的产品需求文档。

## 用户描述
${params.userDescription}

${params.projectType ? `## 项目类型\n${params.projectType}` : ''}

## 从文档中提取的功能
${JSON.stringify(params.features.slice(0, 50), null, 2)}

## UI参考元素
${JSON.stringify(params.uiElements.slice(0, 20), null, 2)}

## 数据结构
${JSON.stringify(params.dataFields.slice(0, 30), null, 2)}

${params.additionalContext ? `## 额外上下文\n${params.additionalContext}` : ''}

请进行以下处理：
1. 合并重复或相似的功能
2. 统一功能命名和描述风格
3. 按优先级排序 (P0最高)
4. 评估整体复杂度

返回 JSON 格式：
{
  "summary": "项目整体描述 (100字以内)",
  "features": [
    {
      "name": "功能名称",
      "description": "详细描述",
      "priority": "P0|P1|P2|P3",
      "category": "分类"
    }
  ],
  "uiReferences": [
    {"type": "组件类型", "description": "描述", "location": "位置"}
  ],
  "dataModels": [
    {"name": "模型名", "type": "类型", "description": "描述", "required": true}
  ],
  "references": [
    {"type": "类型", "description": "描述"}
  ],
  "estimatedComplexity": "L1|L2|L3|L4|L5",
  "confidence": 0.95
}

复杂度说明:
- L1: 简单，1-2天
- L2: 标准，3-5天
- L3: 中等，1-2周
- L4: 复杂，2-4周
- L5: 非常复杂，1个月以上

只返回 JSON。`,
        }],
      })

      const textBlock = response.content.find(block => block.type === 'text')
      if (!textBlock || textBlock.type !== 'text') {
        throw new Error('No text response')
      }

      const jsonMatch = textBlock.text.match(/\{[\s\S]*\}/)
      if (!jsonMatch) {
        throw new Error('No JSON found')
      }

      return JSON.parse(jsonMatch[0]) as IntegratedRequirement
    } catch (error) {
      console.error('AI integration failed:', error)

      // 降级到快速整合
      return {
        summary: params.userDescription.slice(0, 200),
        features: this.deduplicateFeatures(params.features).slice(0, 20),
        uiReferences: params.uiElements.slice(0, 10),
        dataModels: params.dataFields.slice(0, 15),
        references: params.references.slice(0, 5),
        estimatedComplexity: this.estimateComplexity(params.features.length),
        confidence: 0.5,
      }
    }
  }

  /**
   * 合并功能列表
   */
  private mergeFeatures(documents: ProcessedResult[]): FeatureItem[] {
    const features: FeatureItem[] = []

    for (const doc of documents) {
      if (doc.structured.features) {
        features.push(...doc.structured.features)
      }
    }

    return features
  }

  /**
   * 合并 UI 元素
   */
  private mergeUIElements(documents: ProcessedResult[]): UIElement[] {
    const elements: UIElement[] = []

    for (const doc of documents) {
      if (doc.structured.uiElements) {
        elements.push(...doc.structured.uiElements)
      }
    }

    return elements
  }

  /**
   * 合并数据字段
   */
  private mergeDataFields(documents: ProcessedResult[]): DataField[] {
    const fields: DataField[] = []

    for (const doc of documents) {
      if (doc.structured.dataStructure) {
        fields.push(...doc.structured.dataStructure)
      }
    }

    return fields
  }

  /**
   * 合并参考资料
   */
  private mergeReferences(documents: ProcessedResult[]): Reference[] {
    const refs: Reference[] = []

    for (const doc of documents) {
      if (doc.structured.references) {
        refs.push(...doc.structured.references)
      }
    }

    return refs
  }

  /**
   * 功能去重
   */
  private deduplicateFeatures(features: FeatureItem[]): FeatureItem[] {
    const seen = new Map<string, FeatureItem>()

    for (const feature of features) {
      const key = feature.name.toLowerCase().replace(/\s+/g, '')

      if (!seen.has(key)) {
        seen.set(key, feature)
      } else {
        // 合并描述
        const existing = seen.get(key)!
        if (feature.description.length > existing.description.length) {
          existing.description = feature.description
        }
        // 取更高优先级
        if (feature.priority && (!existing.priority || feature.priority < existing.priority)) {
          existing.priority = feature.priority
        }
      }
    }

    return Array.from(seen.values())
  }

  /**
   * 估算复杂度
   */
  private estimateComplexity(featureCount: number): 'L1' | 'L2' | 'L3' | 'L4' | 'L5' {
    if (featureCount <= 3) return 'L1'
    if (featureCount <= 8) return 'L2'
    if (featureCount <= 15) return 'L3'
    if (featureCount <= 25) return 'L4'
    return 'L5'
  }

  /**
   * 计算平均置信度
   */
  private calculateAverageConfidence(documents: ProcessedResult[]): number {
    if (documents.length === 0) return 0

    const sum = documents.reduce((acc, doc) => acc + doc.confidence, 0)
    return Math.round((sum / documents.length) * 100) / 100
  }

  /**
   * 构建来源追溯
   */
  private buildSourceTracking(
    documents: ProcessedResult[],
    features: FeatureItem[]
  ): { feature: string; source: string }[] {
    const sources: { feature: string; source: string }[] = []

    for (const feature of features) {
      // 查找功能来源
      for (const doc of documents) {
        const found = doc.structured.features?.find(
          f => f.name.toLowerCase() === feature.name.toLowerCase()
        )

        if (found) {
          sources.push({
            feature: feature.name,
            source: doc.fileName,
          })
          break
        }
      }
    }

    return sources
  }

  /**
   * 格式化需求为文本
   */
  formatAsText(requirement: IntegratedRequirement): string {
    const lines: string[] = []

    lines.push('# 产品需求文档')
    lines.push('')
    lines.push('## 概述')
    lines.push(requirement.summary)
    lines.push('')

    if (requirement.features.length > 0) {
      lines.push('## 功能列表')
      lines.push('')

      // 按优先级分组
      const byPriority = this.groupByPriority(requirement.features)

      for (const priority of ['P0', 'P1', 'P2', 'P3'] as const) {
        const features = byPriority[priority]
        if (features && features.length > 0) {
          lines.push(`### ${priority} - ${this.getPriorityLabel(priority)}`)
          for (const f of features) {
            lines.push(`- **${f.name}**: ${f.description}`)
          }
          lines.push('')
        }
      }
    }

    if (requirement.dataModels.length > 0) {
      lines.push('## 数据模型')
      lines.push('')
      for (const field of requirement.dataModels) {
        const required = field.required ? ' (必填)' : ''
        lines.push(`- **${field.name}** (${field.type})${required}: ${field.description || ''}`)
      }
      lines.push('')
    }

    lines.push('## 复杂度评估')
    lines.push(`- 预估复杂度: ${requirement.estimatedComplexity}`)
    lines.push(`- 置信度: ${Math.round(requirement.confidence * 100)}%`)

    return lines.join('\n')
  }

  /**
   * 按优先级分组
   */
  private groupByPriority(features: FeatureItem[]): Record<string, FeatureItem[]> {
    const groups: Record<string, FeatureItem[]> = {}

    for (const feature of features) {
      const priority = feature.priority || 'P2'
      if (!groups[priority]) {
        groups[priority] = []
      }
      groups[priority].push(feature)
    }

    return groups
  }

  /**
   * 获取优先级标签
   */
  private getPriorityLabel(priority: string): string {
    const labels: Record<string, string> = {
      P0: '核心必备',
      P1: '重要功能',
      P2: '标准功能',
      P3: '锦上添花',
    }

    return labels[priority] || '其他'
  }
}

// 导出单例
export const requirementIntegrator = new RequirementIntegratorService()
