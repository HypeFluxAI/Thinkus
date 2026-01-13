import { describe, it, expect } from 'vitest'
import {
  PROJECT_PHASES,
  PHASE_ORDER,
  type ProjectPhase,
  getPhaseConfig,
  getPhaseCoreAgents,
  analyzeTopicAgents,
  scheduleDiscussionAgents,
  getNextPhase,
  getPhaseIndex,
  canTransitionToPhase,
} from '@/lib/config/project-phases'

describe('Project Phases Configuration', () => {
  const phases: ProjectPhase[] = [
    'ideation',
    'definition',
    'design',
    'development',
    'prelaunch',
    'growth',
  ]

  describe('PROJECT_PHASES constant', () => {
    it('should have all required phases', () => {
      phases.forEach((phase) => {
        expect(PROJECT_PHASES[phase]).toBeDefined()
      })
    })

    it('should have correct structure for each phase', () => {
      phases.forEach((phase) => {
        const config = PROJECT_PHASES[phase]

        expect(config.id).toBe(phase)
        expect(config.name).toBeDefined()
        expect(config.nameCn).toBeDefined()
        expect(config.description).toBeDefined()
        expect(config.estimatedDuration).toBeDefined()
        expect(Array.isArray(config.coreAgents)).toBe(true)
        expect(config.coreAgents.length).toBeGreaterThan(0)
        expect(Array.isArray(config.optionalAgents)).toBe(true)
        expect(Array.isArray(config.deliverables)).toBe(true)
      })
    })

    it('should have nextPhase for all phases except growth', () => {
      phases.filter(p => p !== 'growth').forEach((phase) => {
        expect(PROJECT_PHASES[phase].nextPhase).toBeDefined()
      })
      expect(PROJECT_PHASES.growth.nextPhase).toBeUndefined()
    })
  })

  describe('PHASE_ORDER', () => {
    it('should have correct order', () => {
      expect(PHASE_ORDER).toEqual([
        'ideation',
        'definition',
        'design',
        'development',
        'prelaunch',
        'growth',
      ])
    })

    it('should contain all phases', () => {
      expect(PHASE_ORDER.length).toBe(phases.length)
      phases.forEach((phase) => {
        expect(PHASE_ORDER).toContain(phase)
      })
    })
  })

  describe('getPhaseConfig', () => {
    it('should return correct config for each phase', () => {
      phases.forEach((phase) => {
        const config = getPhaseConfig(phase)
        expect(config.id).toBe(phase)
      })
    })
  })

  describe('getPhaseCoreAgents', () => {
    it('should return array of agents', () => {
      phases.forEach((phase) => {
        const agents = getPhaseCoreAgents(phase)
        expect(Array.isArray(agents)).toBe(true)
        expect(agents.length).toBeGreaterThan(0)
      })
    })

    it('should return product manager for ideation', () => {
      const agents = getPhaseCoreAgents('ideation')
      expect(agents).toContain('mike')
    })

    it('should return tech lead for development', () => {
      const agents = getPhaseCoreAgents('development')
      expect(agents).toContain('david')
    })
  })

  describe('analyzeTopicAgents', () => {
    it('should return product agents for product topics', () => {
      const agents = analyzeTopicAgents('product feature requirement')
      expect(agents).toContain('mike')
    })

    it('should return design agents for design topics', () => {
      const agents = analyzeTopicAgents('UI design and UX')
      expect(agents).toContain('elena')
    })

    it('should return tech agents for tech topics', () => {
      const agents = analyzeTopicAgents('architecture and database')
      expect(agents).toContain('david')
    })

    it('should return growth agents for growth topics', () => {
      const agents = analyzeTopicAgents('user acquisition and growth')
      expect(agents).toContain('lisa')
    })

    it('should return multiple agents for complex topics', () => {
      const agents = analyzeTopicAgents('product design and tech architecture')
      expect(agents.length).toBeGreaterThan(1)
    })

    it('should return empty array for unrelated topics', () => {
      const agents = analyzeTopicAgents('random unrelated text')
      expect(agents).toEqual([])
    })
  })

  describe('scheduleDiscussionAgents', () => {
    it('should include core agents for the phase', () => {
      const agents = scheduleDiscussionAgents({
        phase: 'ideation',
        topic: 'random topic',
      })

      expect(agents).toContain('mike')
      expect(agents).toContain('nathan')
    })

    it('should include topic-related agents', () => {
      const agents = scheduleDiscussionAgents({
        phase: 'ideation',
        topic: 'database design',
      })

      expect(agents).toContain('david')
    })

    it('should limit agents based on complexity', () => {
      const simpleAgents = scheduleDiscussionAgents({
        phase: 'ideation',
        topic: 'product design tech marketing data',
        complexity: 'simple',
      })

      const complexAgents = scheduleDiscussionAgents({
        phase: 'ideation',
        topic: 'product design tech marketing data',
        complexity: 'complex',
      })

      expect(simpleAgents.length).toBeLessThanOrEqual(3)
      expect(complexAgents.length).toBeLessThanOrEqual(8)
    })

    it('should prioritize core agents over topic agents', () => {
      const agents = scheduleDiscussionAgents({
        phase: 'development',
        topic: 'marketing campaign',
        complexity: 'simple',
      })

      // Core agents should be included
      expect(agents).toContain('david')
      expect(agents).toContain('james')
    })
  })

  describe('getNextPhase', () => {
    it('should return correct next phase', () => {
      expect(getNextPhase('ideation')).toBe('definition')
      expect(getNextPhase('definition')).toBe('design')
      expect(getNextPhase('design')).toBe('development')
      expect(getNextPhase('development')).toBe('prelaunch')
      expect(getNextPhase('prelaunch')).toBe('growth')
    })

    it('should return undefined for growth phase', () => {
      expect(getNextPhase('growth')).toBeUndefined()
    })
  })

  describe('getPhaseIndex', () => {
    it('should return correct index', () => {
      expect(getPhaseIndex('ideation')).toBe(0)
      expect(getPhaseIndex('definition')).toBe(1)
      expect(getPhaseIndex('design')).toBe(2)
      expect(getPhaseIndex('development')).toBe(3)
      expect(getPhaseIndex('prelaunch')).toBe(4)
      expect(getPhaseIndex('growth')).toBe(5)
    })
  })

  describe('canTransitionToPhase', () => {
    it('should allow transition to next phase', () => {
      expect(canTransitionToPhase('ideation', 'definition')).toBe(true)
      expect(canTransitionToPhase('design', 'development')).toBe(true)
    })

    it('should not allow skipping phases', () => {
      expect(canTransitionToPhase('ideation', 'design')).toBe(false)
      expect(canTransitionToPhase('ideation', 'development')).toBe(false)
    })

    it('should allow going back to previous phases', () => {
      expect(canTransitionToPhase('design', 'ideation')).toBe(true)
      expect(canTransitionToPhase('growth', 'ideation')).toBe(true)
    })

    it('should not allow staying in same phase', () => {
      expect(canTransitionToPhase('ideation', 'ideation')).toBe(false)
    })
  })
})
