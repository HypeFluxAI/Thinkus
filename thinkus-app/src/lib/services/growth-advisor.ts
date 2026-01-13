import mongoose from 'mongoose'
import Anthropic from '@anthropic-ai/sdk'
import { getSonnetModel } from '@/lib/ai/model-router'
import { analyticsService, type ProjectStats, type Benchmark } from './analytics-service'

/**
 * 建议类型
 */
export type AdviceType = 'conversion' | 'revenue' | 'growth' | 'retention' | 'engagement'

/**
 * 建议优先级
 */
export type AdvicePriority = 'high' | 'medium' | 'low'

/**
 * 增长建议
 */
export interface GrowthAdvice {
  id: string
  type: AdviceType
  priority: AdvicePriority

  problem: string           // 问题描述
  suggestion: string        // 建议方案
  expectedImpact: string    // 预期效果
  metrics: string[]         // 影响的指标

  implementation: {
    type: 'feature' | 'optimization' | 'content' | 'marketing'
    estimatedCost: number   // 实现费用 (USD)
    estimatedTime: string   // 实现时间
    difficulty: 'easy' | 'medium' | 'hard'
  }

  createdAt: Date
}

/**
 * 增长建议存储
 */
export interface GrowthAdviceRecord {
  projectId: mongoose.Types.ObjectId
  advices: GrowthAdvice[]
  generatedAt: Date
  stats: ProjectStats
  status: 'pending' | 'viewed' | 'implemented' | 'dismissed'
}

// Anthropic 客户端
const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
})

/**
 * Growth Advisor Service
 * 增长建议引擎
 */
export class GrowthAdvisorService {
  // 建议缓存 (projectId -> record)
  private cache = new Map<string, GrowthAdviceRecord>()

  // 缓存有效期 (24小时)
  private cacheTTL = 24 * 3600 * 1000

  /**
   * 生成增长建议
   */
  async generateAdvice(
    projectId: mongoose.Types.ObjectId | string,
    options?: {
      category?: string
      forceRefresh?: boolean
    }
  ): Promise<GrowthAdvice[]> {
    const pId = typeof projectId === 'string' ? projectId : projectId.toString()

    // 检查缓存
    if (!options?.forceRefresh) {
      const cached = this.cache.get(pId)
      if (cached && Date.now() - cached.generatedAt.getTime() < this.cacheTTL) {
        return cached.advices
      }
    }

    try {
      // 获取项目统计数据 (过去30天)
      const period = {
        start: new Date(Date.now() - 30 * 24 * 3600 * 1000),
        end: new Date(),
      }
      const stats = await analyticsService.getStats(projectId, period)

      // 获取行业基准
      const benchmark = analyticsService.getBenchmark(options?.category || 'default')

      // 分析并生成建议
      const advices = await this.analyzeAndAdvise(stats, benchmark, pId)

      // 缓存结果
      this.cache.set(pId, {
        projectId: typeof projectId === 'string'
          ? new mongoose.Types.ObjectId(projectId)
          : projectId,
        advices,
        generatedAt: new Date(),
        stats,
        status: 'pending',
      })

      return advices
    } catch (error) {
      console.error('Failed to generate growth advice:', error)

      // 返回默认建议
      return this.getDefaultAdvices()
    }
  }

  /**
   * 获取缓存的建议
   */
  getCachedAdvice(projectId: string): GrowthAdviceRecord | null {
    return this.cache.get(projectId) || null
  }

  /**
   * 标记建议状态
   */
  markAdviceStatus(
    projectId: string,
    adviceId: string,
    status: 'viewed' | 'implemented' | 'dismissed'
  ): void {
    const record = this.cache.get(projectId)
    if (record) {
      record.status = status
      this.cache.set(projectId, record)
    }
  }

  /**
   * 分析并生成建议
   */
  private async analyzeAndAdvise(
    stats: ProjectStats,
    benchmark: Benchmark,
    projectId: string
  ): Promise<GrowthAdvice[]> {
    try {
      const response = await anthropic.messages.create({
        model: getSonnetModel(),
        max_tokens: 2000,
        messages: [{
          role: 'user',
          content: `作为产品增长专家，分析以下数据并生成增长建议。

## 产品数据 (过去30天)
${JSON.stringify(stats, null, 2)}

## 行业基准
${JSON.stringify(benchmark, null, 2)}

## 分析要点
1. 与行业基准对比，找出表现不佳的指标
2. 识别增长机会
3. 提供具体可执行的建议

请生成3-5条增长建议，返回 JSON 数组格式:
[
  {
    "id": "advice_1",
    "type": "conversion|revenue|growth|retention|engagement",
    "priority": "high|medium|low",
    "problem": "问题描述 (1-2句话)",
    "suggestion": "建议方案 (具体可执行)",
    "expectedImpact": "预期效果 (量化)",
    "metrics": ["影响的指标1", "指标2"],
    "implementation": {
      "type": "feature|optimization|content|marketing",
      "estimatedCost": 50,
      "estimatedTime": "1-2天",
      "difficulty": "easy|medium|hard"
    }
  }
]

只返回 JSON 数组。`,
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

      const advices = JSON.parse(jsonMatch[0]) as GrowthAdvice[]

      // 添加创建时间
      return advices.map(advice => ({
        ...advice,
        createdAt: new Date(),
      }))
    } catch (error) {
      console.error('AI analysis failed:', error)
      return this.generateRuleBasedAdvice(stats, benchmark)
    }
  }

  /**
   * 基于规则生成建议 (降级方案)
   */
  private generateRuleBasedAdvice(
    stats: ProjectStats,
    benchmark: Benchmark
  ): GrowthAdvice[] {
    const advices: GrowthAdvice[] = []

    // 转化率低于基准
    if (stats.conversion.rate < benchmark.conversionRate * 0.8) {
      advices.push({
        id: `advice_${Date.now()}_1`,
        type: 'conversion',
        priority: 'high',
        problem: `转化率 ${stats.conversion.rate}% 低于行业平均 ${benchmark.conversionRate}%`,
        suggestion: '优化注册流程，简化表单字段，添加社交登录选项',
        expectedImpact: `预计可提升转化率 ${Math.round((benchmark.conversionRate - stats.conversion.rate) * 0.5)}%`,
        metrics: ['conversion_rate', 'signup_rate'],
        implementation: {
          type: 'optimization',
          estimatedCost: 39,
          estimatedTime: '1-2天',
          difficulty: 'easy',
        },
        createdAt: new Date(),
      })
    }

    // 跳出率高于基准
    if (stats.engagement.bounceRate > benchmark.bounceRate * 1.2) {
      advices.push({
        id: `advice_${Date.now()}_2`,
        type: 'engagement',
        priority: 'high',
        problem: `跳出率 ${stats.engagement.bounceRate}% 高于行业平均 ${benchmark.bounceRate}%`,
        suggestion: '优化首页加载速度，添加引人注目的首屏内容，改善页面导航',
        expectedImpact: `预计可降低跳出率 ${Math.round((stats.engagement.bounceRate - benchmark.bounceRate) * 0.3)}%`,
        metrics: ['bounce_rate', 'page_views'],
        implementation: {
          type: 'optimization',
          estimatedCost: 49,
          estimatedTime: '2-3天',
          difficulty: 'medium',
        },
        createdAt: new Date(),
      })
    }

    // 会话时长低于基准
    if (stats.engagement.avgSessionDuration < benchmark.avgSessionDuration * 0.7) {
      advices.push({
        id: `advice_${Date.now()}_3`,
        type: 'engagement',
        priority: 'medium',
        problem: `平均会话时长 ${stats.engagement.avgSessionDuration}秒 低于行业平均 ${benchmark.avgSessionDuration}秒`,
        suggestion: '添加互动元素，优化内容质量，实现个性化推荐',
        expectedImpact: '预计可提升用户停留时间 30-50%',
        metrics: ['session_duration', 'page_views_per_session'],
        implementation: {
          type: 'feature',
          estimatedCost: 79,
          estimatedTime: '3-5天',
          difficulty: 'medium',
        },
        createdAt: new Date(),
      })
    }

    // 用户增长放缓
    if (stats.users.change < 10) {
      advices.push({
        id: `advice_${Date.now()}_4`,
        type: 'growth',
        priority: 'medium',
        problem: `用户增长率 ${stats.users.change}% 较低`,
        suggestion: '实施邀请奖励计划，优化SEO，增加社交分享功能',
        expectedImpact: '预计可提升用户获取 20-40%',
        metrics: ['user_growth', 'referrals'],
        implementation: {
          type: 'marketing',
          estimatedCost: 59,
          estimatedTime: '1周',
          difficulty: 'easy',
        },
        createdAt: new Date(),
      })
    }

    // 至少返回一条建议
    if (advices.length === 0) {
      advices.push({
        id: `advice_${Date.now()}_default`,
        type: 'growth',
        priority: 'low',
        problem: '产品表现良好，可进一步优化',
        suggestion: '进行A/B测试，持续优化核心功能体验',
        expectedImpact: '持续改进可带来稳定增长',
        metrics: ['all'],
        implementation: {
          type: 'optimization',
          estimatedCost: 29,
          estimatedTime: '持续',
          difficulty: 'easy',
        },
        createdAt: new Date(),
      })
    }

    return advices
  }

  /**
   * 获取默认建议
   */
  private getDefaultAdvices(): GrowthAdvice[] {
    return [
      {
        id: `advice_default_1`,
        type: 'conversion',
        priority: 'medium',
        problem: '需要更多数据来分析具体问题',
        suggestion: '确保分析代码正确嵌入，收集足够的用户行为数据',
        expectedImpact: '数据收集后可生成更精准的建议',
        metrics: ['data_collection'],
        implementation: {
          type: 'optimization',
          estimatedCost: 0,
          estimatedTime: '1-2周',
          difficulty: 'easy',
        },
        createdAt: new Date(),
      },
    ]
  }

  /**
   * 格式化建议为文本
   */
  formatAdvicesAsText(advices: GrowthAdvice[]): string {
    const lines: string[] = ['# 增长建议报告', '']

    const priorityLabels: Record<AdvicePriority, string> = {
      high: '高优先级',
      medium: '中优先级',
      low: '低优先级',
    }

    const typeLabels: Record<AdviceType, string> = {
      conversion: '提升转化',
      revenue: '增加收入',
      growth: '用户增长',
      retention: '提升留存',
      engagement: '提升参与',
    }

    for (const advice of advices) {
      lines.push(`## ${typeLabels[advice.type]} - ${priorityLabels[advice.priority]}`)
      lines.push('')
      lines.push(`**问题**: ${advice.problem}`)
      lines.push('')
      lines.push(`**建议**: ${advice.suggestion}`)
      lines.push('')
      lines.push(`**预期效果**: ${advice.expectedImpact}`)
      lines.push('')
      lines.push(`**实现方式**: ${advice.implementation.type}`)
      lines.push(`- 预计费用: $${advice.implementation.estimatedCost}`)
      lines.push(`- 预计时间: ${advice.implementation.estimatedTime}`)
      lines.push('')
    }

    return lines.join('\n')
  }
}

// 导出单例
export const growthAdvisor = new GrowthAdvisorService()
