import { describe, it, expect, vi, beforeEach } from 'vitest'

// Mock Anthropic before importing the module
vi.mock('@anthropic-ai/sdk', () => ({
  default: vi.fn().mockImplementation(() => ({
    messages: {
      create: vi.fn(),
    },
  })),
}))

// Mock config modules
vi.mock('@/lib/config/executives', () => ({
  EXECUTIVES: {
    mike: { name: 'Mike', role: 'Product Manager' },
    david: { name: 'David', role: 'Tech Lead' },
    lisa: { name: 'Lisa', role: 'Growth' },
    sarah: { name: 'Sarah', role: 'Data' },
    frank: { name: 'Frank', role: 'Finance' },
    nathan: { name: 'Nathan', role: 'Strategy' },
    elena: { name: 'Elena', role: 'UX' },
    chloe: { name: 'Chloe', role: 'Brand' },
    james: { name: 'James', role: 'QA' },
    kevin: { name: 'Kevin', role: 'DevOps' },
    alex: { name: 'Alex', role: 'Security' },
    marcus: { name: 'Marcus', role: 'Marketing' },
    nina: { name: 'Nina', role: 'Customer Success' },
    tom: { name: 'Tom', role: 'Legal' },
    iris: { name: 'Iris', role: 'Investment' },
    oscar: { name: 'Oscar', role: 'Operations' },
    victor: { name: 'Victor', role: 'Sales' },
  },
  EXECUTIVES_BY_GROUP: {},
}))

vi.mock('@/lib/config/project-phases', () => ({
  PROJECT_PHASES: {
    ideation: {
      nameCn: '概念阶段',
      description: 'Ideation phase',
      coreAgents: ['mike', 'elena'],
    },
    validation: {
      nameCn: '验证阶段',
      description: 'Validation phase',
      coreAgents: ['mike', 'sarah'],
    },
  },
}))

import { analyzeTopicQuick } from '@/lib/services/topic-analyzer'

describe('Topic Analyzer Service', () => {
  describe('analyzeTopicQuick', () => {
    it('should recommend product manager for product-related topics', () => {
      const result = analyzeTopicQuick({ topic: '如何定义产品需求' })

      expect(result.recommendedAgents).toContain('mike')
    })

    it('should recommend tech lead for technical topics', () => {
      const result = analyzeTopicQuick({ topic: '系统架构设计问题' })

      expect(result.recommendedAgents).toContain('david')
    })

    it('should recommend growth team for marketing topics', () => {
      const result = analyzeTopicQuick({ topic: '用户增长和获客策略' })

      expect(result.recommendedAgents).toContain('lisa')
    })

    it('should recommend finance for budget topics', () => {
      const result = analyzeTopicQuick({ topic: '项目成本预算分析' })

      expect(result.recommendedAgents).toContain('frank')
    })

    it('should recommend QA for testing topics', () => {
      const result = analyzeTopicQuick({ topic: '如何进行QA测试' })

      expect(result.recommendedAgents).toContain('james')
    })

    it('should recommend legal for compliance topics', () => {
      const result = analyzeTopicQuick({ topic: '数据合规和隐私政策' })

      expect(result.recommendedAgents).toContain('tom')
    })

    it('should include phase core agents when phase is provided', () => {
      const result = analyzeTopicQuick({
        topic: '技术架构讨论',
        phase: 'ideation',
      })

      expect(result.recommendedAgents).toContain('mike')
      expect(result.recommendedAgents).toContain('elena')
    })

    it('should default to mike when no keywords match', () => {
      const result = analyzeTopicQuick({ topic: '随便聊聊' })

      expect(result.recommendedAgents).toContain('mike')
    })

    it('should limit recommended agents to 5', () => {
      const result = analyzeTopicQuick({
        topic: '产品设计技术架构测试部署安全数据分析增长营销',
      })

      expect(result.recommendedAgents.length).toBeLessThanOrEqual(5)
    })

    it('should assess complexity as simple for short topics', () => {
      const result = analyzeTopicQuick({ topic: '简单问题' })

      expect(result.complexity).toBe('simple')
    })

    it('should assess complexity as complex for long topics with many agents', () => {
      const result = analyzeTopicQuick({
        topic: '这是一个非常复杂的话题，涉及到产品设计、技术架构、测试、部署、安全、数据分析、增长和营销等多个方面，需要多个部门协作完成',
      })

      expect(result.complexity).toBe('complex')
    })

    it('should recommend multiple agents for cross-department topics', () => {
      const result = analyzeTopicQuick({
        topic: '产品安全和数据分析问题',
      })

      expect(result.recommendedAgents.length).toBeGreaterThan(1)
    })

    it('should handle UX design topics', () => {
      const result = analyzeTopicQuick({ topic: 'UI设计和交互优化' })

      expect(result.recommendedAgents).toContain('elena')
    })

    it('should handle DevOps topics', () => {
      const result = analyzeTopicQuick({ topic: '服务部署和运维' })

      expect(result.recommendedAgents).toContain('kevin')
    })

    it('should handle investment topics', () => {
      const result = analyzeTopicQuick({ topic: '融资和投资策略' })

      expect(result.recommendedAgents).toContain('iris')
    })

    it('should handle sales topics', () => {
      const result = analyzeTopicQuick({ topic: '销售和商务拓展' })

      expect(result.recommendedAgents).toContain('victor')
    })
  })
})
