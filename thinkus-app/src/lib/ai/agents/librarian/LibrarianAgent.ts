/**
 * Librarian Agent
 * 研究员角色，专门负责技术调研、文档查找、开源实现研究
 */

import Anthropic from '@anthropic-ai/sdk'
import {
  ResearchResult,
  ResearchQuery,
  LibrarianConfig,
  ResearchFinding,
  CodeExample,
  Reference
} from './types'
import { getSonnetModel } from '@/lib/ai/model-router'

interface MCPClient {
  call: (tool: string, method: string, params: Record<string, unknown>) => Promise<{ content?: string }>
}

export class LibrarianAgent {
  private agentId = 'librarian'
  private name = '研究员'
  private config: LibrarianConfig = {
    model: getSonnetModel(),
    maxTokens: 4000,
    enableMCP: true,
    mcpTools: ['context7', 'grep_app', 'web_search'],
    cacheEnabled: true,
    cacheTTL: 30 * 60 * 1000 // 30 minutes
  }

  private cache: Map<string, { result: ResearchResult; timestamp: number }> = new Map()

  constructor(
    private claude?: Anthropic,
    private mcpClient?: MCPClient
  ) {}

  /**
   * 设置Anthropic客户端
   */
  setClient(claude: Anthropic): void {
    this.claude = claude
  }

  /**
   * 设置MCP客户端
   */
  setMCPClient(client: MCPClient): void {
    this.mcpClient = client
  }

  /**
   * 更新配置
   */
  updateConfig(config: Partial<LibrarianConfig>): void {
    this.config = { ...this.config, ...config }
  }

  /**
   * 执行研究任务
   */
  async research(query: ResearchQuery): Promise<ResearchResult> {
    // 检查缓存
    const cacheKey = this.getCacheKey(query)
    if (this.config.cacheEnabled) {
      const cached = this.cache.get(cacheKey)
      if (cached && Date.now() - cached.timestamp < this.config.cacheTTL) {
        return cached.result
      }
    }

    const searchedSources: string[] = []

    // Step 1: 通过MCP搜索文档
    let docResults = ''
    if (this.config.enableMCP && this.mcpClient) {
      try {
        docResults = await this.searchDocs(query.topic)
        if (docResults) {
          searchedSources.push('官方文档')
        }
      } catch {
        // MCP不可用，继续
      }
    }

    // Step 2: 使用Claude进行深度研究
    if (!this.claude) {
      return this.generateFallbackResult(query)
    }

    try {
      const response = await this.claude.messages.create({
        model: this.config.model,
        max_tokens: this.config.maxTokens,
        system: `你是研究员(Librarian)，专门负责技术调研。
你的职责:
1. 查找和分析技术方案
2. 研究开源实现
3. 收集最佳实践
4. 提供代码示例

研究深度: ${query.depth}
${query.depth === 'quick' ? '快速概览，重点突出' : query.depth === 'deep' ? '深入分析，详细全面' : '标准研究，平衡深度'}

输出格式必须是结构化的研究报告。`,
        messages: [{
          role: 'user',
          content: `请研究以下主题:

主题: ${query.topic}
${query.context ? `背景: ${query.context}` : ''}
${docResults ? `相关文档:\n${docResults}` : ''}

请提供:
1. 关键发现 (3-5条，包含重要性评级)
2. 代码示例 (如适用，包含语言和来源)
3. 推荐做法
4. 参考资源 (包含类型和相关性)

以JSON格式返回:
{
  "findings": [
    {"title": "发现标题", "content": "详细内容", "relevance": "high|medium|low"}
  ],
  "codeExamples": [
    {"title": "示例标题", "code": "代码", "language": "语言", "description": "说明"}
  ],
  "recommendations": ["建议1", "建议2"],
  "references": [
    {"title": "标题", "url": "链接", "type": "documentation|github|article|stackoverflow|other", "relevance": 0.9}
  ],
  "confidence": 0.85
}

只返回JSON。`
        }]
      })

      searchedSources.push('Claude AI')

      const textBlock = response.content.find(block => block.type === 'text')
      if (!textBlock || textBlock.type !== 'text') {
        throw new Error('No text response')
      }

      // 提取JSON
      const jsonMatch = textBlock.text.match(/\{[\s\S]*\}/)
      const data = jsonMatch ? JSON.parse(jsonMatch[0]) : {}

      const result: ResearchResult = {
        topic: query.topic,
        findings: (data.findings || []).map((f: Partial<ResearchFinding>) => ({
          title: f.title || '',
          content: f.content || '',
          source: f.source,
          relevance: f.relevance || 'medium'
        })),
        codeExamples: (data.codeExamples || []).map((e: Partial<CodeExample>) => ({
          title: e.title || '',
          code: e.code || '',
          language: e.language || 'typescript',
          source: e.source,
          description: e.description
        })),
        recommendations: data.recommendations || [],
        references: (data.references || []).map((r: Partial<Reference>) => ({
          title: r.title || '',
          url: r.url || '',
          type: r.type || 'other',
          relevance: r.relevance || 0.5
        })),
        confidence: data.confidence || 0.7,
        searchedSources
      }

      // 缓存结果
      if (this.config.cacheEnabled) {
        this.cache.set(cacheKey, { result, timestamp: Date.now() })
      }

      return result
    } catch (error) {
      console.error('Research failed:', error)
      return this.generateFallbackResult(query)
    }
  }

  /**
   * 通过MCP搜索文档
   */
  private async searchDocs(query: string): Promise<string> {
    if (!this.mcpClient) return ''

    // 尝试调用context7 MCP获取官方文档
    try {
      const result = await this.mcpClient.call('context7', 'search', { query })
      return result?.content || ''
    } catch {
      return ''
    }
  }

  /**
   * 生成降级结果
   */
  private generateFallbackResult(query: ResearchQuery): ResearchResult {
    return {
      topic: query.topic,
      findings: [{
        title: '研究服务暂不可用',
        content: '请稍后重试或手动搜索相关文档',
        relevance: 'low'
      }],
      codeExamples: [],
      recommendations: ['建议查阅官方文档', '可以在GitHub上搜索相关项目'],
      references: [],
      confidence: 0.1,
      searchedSources: []
    }
  }

  /**
   * 获取缓存键
   */
  private getCacheKey(query: ResearchQuery): string {
    return `${query.topic}-${query.depth}-${query.context || ''}`
  }

  /**
   * 格式化研究报告
   */
  formatReport(result: ResearchResult): string {
    let report = `📚 研究报告: ${result.topic}\n`
    report += `━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n\n`

    if (result.findings.length > 0) {
      report += `## 🔍 关键发现\n\n`
      result.findings.forEach((f, i) => {
        const relevanceIcon = {
          high: '🔴',
          medium: '🟡',
          low: '🟢'
        }[f.relevance]
        report += `${i + 1}. ${relevanceIcon} **${f.title}**\n`
        report += `   ${f.content}\n`
        if (f.source) {
          report += `   _来源: ${f.source}_\n`
        }
        report += '\n'
      })
    }

    if (result.codeExamples.length > 0) {
      report += `## 💻 代码示例\n\n`
      result.codeExamples.forEach(example => {
        report += `### ${example.title}\n`
        if (example.description) {
          report += `${example.description}\n\n`
        }
        report += `\`\`\`${example.language}\n${example.code}\n\`\`\`\n\n`
      })
    }

    if (result.recommendations.length > 0) {
      report += `## 💡 推荐做法\n\n`
      result.recommendations.forEach((r, i) => {
        report += `${i + 1}. ${r}\n`
      })
      report += '\n'
    }

    if (result.references.length > 0) {
      report += `## 📖 参考资源\n\n`
      result.references
        .sort((a, b) => b.relevance - a.relevance)
        .forEach(ref => {
          const typeIcon = {
            documentation: '📄',
            github: '🐙',
            article: '📰',
            stackoverflow: '💬',
            other: '🔗'
          }[ref.type]
          report += `- ${typeIcon} [${ref.title}](${ref.url})\n`
        })
      report += '\n'
    }

    report += `━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n`
    report += `置信度: ${Math.round(result.confidence * 100)}% | `
    report += `搜索来源: ${result.searchedSources.join(', ') || '无'}`

    return report
  }

  /**
   * 清理缓存
   */
  clearCache(): void {
    this.cache.clear()
  }

  /**
   * 获取代理信息
   */
  getAgentInfo(): { id: string; name: string; description: string } {
    return {
      id: this.agentId,
      name: this.name,
      description: '专门负责技术调研、文档查找、开源实现研究'
    }
  }
}

export const librarianAgent = new LibrarianAgent()
