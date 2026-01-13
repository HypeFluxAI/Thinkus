import mongoose from 'mongoose'
import Anthropic from '@anthropic-ai/sdk'
import { Experience, type IExperience, type ExperienceType, type ProjectCategory } from '@/lib/db/models'
import { getHaikuModel, getSonnetModel } from '@/lib/ai/model-router'

// Pinecone client (假设已配置)
// import { pinecone, EXPERIENCE_INDEX } from '@/lib/vector/pinecone'

/**
 * 经验匹配请求
 */
export interface ExperienceMatchRequest {
  query: string                    // 需求描述
  projectType?: ProjectCategory    // 项目类型
  techStack?: string[]             // 技术栈
  experienceType?: ExperienceType  // 经验类型
  minQuality?: number              // 最低质量分
  topK?: number                    // 返回数量
}

/**
 * 经验匹配结果
 */
export interface ExperienceMatchResult {
  experience: IExperience
  score: number                    // 匹配分数 0-1
  relevance: string                // 相关性说明
}

/**
 * 经验收集输入
 */
export interface ExperienceCollectInput {
  projectId: mongoose.Types.ObjectId
  userId: mongoose.Types.ObjectId
  type: ExperienceType
  name: string
  description: string
  category: ProjectCategory
  techStack: string[]
  features: string[]
  code?: {
    files: Array<{
      path: string
      content: string
      language?: string
    }>
    dependencies: string[]
    setupInstructions?: string
  }
}

/**
 * 经验蒸馏结果
 */
interface DistilledExperience {
  name: string
  description: string
  tags: string[]
  complexity: 'L1' | 'L2' | 'L3' | 'L4' | 'L5'
  quality: number
  applicableTo: {
    projectTypes: ProjectCategory[]
    techStacks: string[]
    minComplexity?: 'L1' | 'L2' | 'L3' | 'L4' | 'L5'
    maxComplexity?: 'L1' | 'L2' | 'L3' | 'L4' | 'L5'
  }
}

// Anthropic 客户端
const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
})

/**
 * Experience Service
 * 经验库服务 - 管理可复用的项目/模块/组件经验
 */
export class ExperienceService {
  /**
   * 匹配相关经验
   */
  async match(request: ExperienceMatchRequest): Promise<ExperienceMatchResult[]> {
    const {
      query,
      projectType,
      techStack,
      experienceType,
      minQuality = 3,
      topK = 5,
    } = request

    try {
      // 1. 生成查询向量
      const queryEmbedding = await this.generateEmbedding(query)

      // 2. 构建过滤条件
      const filter: Record<string, unknown> = {
        quality: { $gte: minQuality },
        isPublic: true,
      }

      if (projectType) {
        filter.category = projectType
      }

      if (experienceType) {
        filter.type = experienceType
      }

      if (techStack && techStack.length > 0) {
        filter.techStack = { $in: techStack }
      }

      // 3. 向量搜索 (简化版 - 实际应使用 Pinecone)
      // const vectorResults = await pinecone.index(EXPERIENCE_INDEX).query({
      //   vector: queryEmbedding,
      //   topK,
      //   filter,
      //   includeMetadata: true,
      // })

      // 4. 暂时使用 MongoDB 文本搜索作为备选
      const experiences = await Experience.find(filter)
        .sort({ quality: -1, usageCount: -1 })
        .limit(topK * 2)

      // 5. 使用 AI 评估相关性
      const results = await this.rankByRelevance(query, experiences, topK)

      return results
    } catch (error) {
      console.error('Experience match failed:', error)
      return []
    }
  }

  /**
   * 添加新经验
   */
  async add(input: ExperienceCollectInput): Promise<IExperience | null> {
    try {
      // 1. 使用 AI 蒸馏经验信息
      const distilled = await this.distillExperience(input)

      // 2. 生成向量 ID
      const vectorId = `exp_${input.type}_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`

      // 3. 生成嵌入向量
      const embedding = await this.generateEmbedding(
        `${distilled.name} ${distilled.description} ${distilled.tags.join(' ')}`
      )

      // 4. 存储到向量数据库
      // await pinecone.index(EXPERIENCE_INDEX).upsert([{
      //   id: vectorId,
      //   values: embedding,
      //   metadata: {
      //     type: input.type,
      //     category: input.category,
      //     techStack: input.techStack,
      //     quality: distilled.quality,
      //   },
      // }])

      // 5. 存储到 MongoDB
      const experience = await Experience.createExperience({
        type: input.type,
        name: distilled.name,
        description: distilled.description,
        category: input.category,
        complexity: distilled.complexity,
        tags: distilled.tags,
        techStack: input.techStack,
        features: input.features,
        code: input.code,
        quality: distilled.quality,
        applicableTo: distilled.applicableTo,
        vectorId,
        sourceProjectId: input.projectId,
        isPublic: true,
      })

      return experience
    } catch (error) {
      console.error('Experience add failed:', error)
      return null
    }
  }

  /**
   * 从已完成项目收集经验
   */
  async collect(
    projectId: mongoose.Types.ObjectId,
    userId: mongoose.Types.ObjectId
  ): Promise<IExperience[]> {
    try {
      // 1. 获取项目信息
      const { Project } = await import('@/lib/db/models')
      const project = await Project.findById(projectId)

      if (!project) {
        throw new Error('Project not found')
      }

      if (project.status !== 'completed') {
        console.log('Project not completed, skipping experience collection')
        return []
      }

      const experiences: IExperience[] = []

      // 2. 收集项目级经验
      const projectExp = await this.add({
        projectId,
        userId,
        type: 'project',
        name: project.name,
        description: project.description,
        category: this.mapProjectCategory(project.type),
        techStack: project.techStack || [],
        features: project.features?.map(f => f.name) || [],
      })

      if (projectExp) {
        experiences.push(projectExp)
      }

      // 3. 收集模块级经验 (如果有)
      // 这里可以根据项目的功能列表生成模块经验
      if (project.features && project.features.length > 0) {
        for (const feature of project.features.slice(0, 5)) { // 最多收集5个
          const moduleExp = await this.add({
            projectId,
            userId,
            type: 'module',
            name: feature.name,
            description: feature.description || feature.name,
            category: this.mapProjectCategory(project.type),
            techStack: project.techStack || [],
            features: [feature.name],
          })

          if (moduleExp) {
            experiences.push(moduleExp)
          }
        }
      }

      return experiences
    } catch (error) {
      console.error('Experience collection failed:', error)
      return []
    }
  }

  /**
   * 记录经验使用
   */
  async recordUsage(experienceId: mongoose.Types.ObjectId): Promise<void> {
    try {
      await Experience.incrementUsage(experienceId)
    } catch (error) {
      console.error('Record usage failed:', error)
    }
  }

  /**
   * 获取热门经验
   */
  async getPopular(
    type?: ExperienceType,
    limit = 10
  ): Promise<IExperience[]> {
    return Experience.getPopular(type, limit)
  }

  /**
   * 按类型和类别获取经验
   */
  async getByTypeAndCategory(
    type: ExperienceType,
    category: ProjectCategory,
    options?: {
      minQuality?: number
      techStack?: string[]
      limit?: number
    }
  ): Promise<IExperience[]> {
    return Experience.findByTypeAndCategory(type, category, options)
  }

  /**
   * 格式化经验为上下文
   */
  formatForContext(experiences: IExperience[]): string {
    if (experiences.length === 0) return ''

    const lines = ['## 相关经验参考']

    for (const exp of experiences) {
      lines.push(`\n### ${exp.name}`)
      lines.push(`- 类型: ${exp.type}`)
      lines.push(`- 描述: ${exp.description}`)
      lines.push(`- 技术栈: ${exp.techStack.join(', ')}`)
      lines.push(`- 质量评分: ${exp.quality}/5`)

      if (exp.features.length > 0) {
        lines.push(`- 功能: ${exp.features.slice(0, 5).join(', ')}`)
      }

      if (exp.tags.length > 0) {
        lines.push(`- 标签: ${exp.tags.join(', ')}`)
      }
    }

    return lines.join('\n')
  }

  // ============ 私有方法 ============

  /**
   * 生成文本嵌入向量
   */
  private async generateEmbedding(text: string): Promise<number[]> {
    // TODO: 使用实际的嵌入 API
    // 暂时返回空数组，后续集成 OpenAI 或其他嵌入服务
    return []
  }

  /**
   * 使用 AI 蒸馏经验信息
   */
  private async distillExperience(input: ExperienceCollectInput): Promise<DistilledExperience> {
    try {
      const response = await anthropic.messages.create({
        model: getHaikuModel(),
        max_tokens: 500,
        messages: [{
          role: 'user',
          content: `分析以下项目/模块信息，提取关键经验：

名称: ${input.name}
描述: ${input.description}
类型: ${input.type}
类别: ${input.category}
技术栈: ${input.techStack.join(', ')}
功能: ${input.features.join(', ')}

请返回 JSON 格式:
{
  "name": "优化后的名称",
  "description": "精炼的描述 (50字以内)",
  "tags": ["标签1", "标签2", "标签3"],
  "complexity": "L1|L2|L3|L4|L5",
  "quality": 3,
  "applicableTo": {
    "projectTypes": ["类型1", "类型2"],
    "techStacks": ["技术1", "技术2"],
    "minComplexity": "L1",
    "maxComplexity": "L5"
  }
}

复杂度说明:
- L1: 简单，几小时完成
- L2: 标准，1-2天完成
- L3: 中等，3-5天完成
- L4: 复杂，1-2周完成
- L5: 非常复杂，2周以上

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

      const distilled = JSON.parse(jsonMatch[0]) as DistilledExperience

      // 验证和默认值
      return {
        name: distilled.name || input.name,
        description: distilled.description || input.description,
        tags: distilled.tags || [],
        complexity: distilled.complexity || 'L2',
        quality: distilled.quality || 3,
        applicableTo: {
          projectTypes: distilled.applicableTo?.projectTypes || [input.category],
          techStacks: distilled.applicableTo?.techStacks || input.techStack,
          minComplexity: distilled.applicableTo?.minComplexity,
          maxComplexity: distilled.applicableTo?.maxComplexity,
        },
      }
    } catch (error) {
      console.error('Distill experience failed:', error)

      // 返回默认值
      return {
        name: input.name,
        description: input.description,
        tags: [],
        complexity: 'L2',
        quality: 3,
        applicableTo: {
          projectTypes: [input.category],
          techStacks: input.techStack,
        },
      }
    }
  }

  /**
   * 使用 AI 评估相关性并排名
   */
  private async rankByRelevance(
    query: string,
    experiences: IExperience[],
    topK: number
  ): Promise<ExperienceMatchResult[]> {
    if (experiences.length === 0) return []

    try {
      const experienceList = experiences.map((exp, i) => (
        `${i + 1}. ${exp.name}: ${exp.description} [${exp.techStack.join(', ')}]`
      )).join('\n')

      const response = await anthropic.messages.create({
        model: getHaikuModel(),
        max_tokens: 200,
        messages: [{
          role: 'user',
          content: `用户需求: "${query}"

候选经验列表:
${experienceList}

请选择最相关的 ${Math.min(topK, experiences.length)} 个，返回 JSON 数组:
[{"index": 1, "score": 0.9, "reason": "相关性说明"}]

只返回 JSON 数组，按相关性从高到低排序。`,
        }],
      })

      const textBlock = response.content.find(block => block.type === 'text')
      if (!textBlock || textBlock.type !== 'text') {
        throw new Error('No text response')
      }

      // 提取 JSON 数组
      const jsonMatch = textBlock.text.match(/\[[\s\S]*\]/)
      if (!jsonMatch) {
        throw new Error('No JSON array found')
      }

      const rankings = JSON.parse(jsonMatch[0]) as Array<{
        index: number
        score: number
        reason: string
      }>

      // 构建结果
      const results: ExperienceMatchResult[] = []
      for (const rank of rankings.slice(0, topK)) {
        const exp = experiences[rank.index - 1]
        if (exp) {
          results.push({
            experience: exp,
            score: rank.score,
            relevance: rank.reason,
          })
        }
      }

      return results
    } catch (error) {
      console.error('Rank by relevance failed:', error)

      // 降级：返回前 topK 个
      return experiences.slice(0, topK).map(exp => ({
        experience: exp,
        score: 0.5,
        relevance: '默认匹配',
      }))
    }
  }

  /**
   * 映射项目类型到经验类别
   */
  private mapProjectCategory(projectType: string): ProjectCategory {
    const mapping: Record<string, ProjectCategory> = {
      web: 'saas',
      mobile: 'tool',
      api: 'saas',
      ecommerce: 'ecommerce',
      education: 'education',
      social: 'social',
      content: 'content',
      marketplace: 'marketplace',
    }

    return mapping[projectType] || 'other'
  }
}

// 导出单例
export const experienceService = new ExperienceService()
