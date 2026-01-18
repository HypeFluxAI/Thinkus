import { z } from 'zod'
import { router, protectedProcedure } from '../trpc'
import { TRPCError } from '@trpc/server'
import * as aiEngine from '@/lib/services/ai-engine-client'

// Memory tier enum
const memoryTierSchema = z.enum(['CORE', 'RELEVANT', 'COLD'])

// Memory type enum
const memoryTypeSchema = z.enum(['fact', 'preference', 'decision', 'context', 'insight'])

export const memoryRouter = router({
  // List memories for an employee
  list: protectedProcedure
    .input(
      z.object({
        employeeId: z.string(),
        projectId: z.string().optional(),
        tenantId: z.string().optional(),
        tier: memoryTierSchema.optional(),
        type: memoryTypeSchema.optional(),
        limit: z.number().min(1).max(200).default(50),
      })
    )
    .query(async ({ input }) => {
      try {
        const result = await aiEngine.listMemories(input.employeeId, {
          projectId: input.projectId,
          tier: input.tier,
          type: input.type,
          limit: input.limit,
          tenantId: input.tenantId,
        })

        return {
          memories: result.memories.map(m => ({
            id: m.memory_id,
            ownerId: m.owner_id,
            employeeId: m.employee_id,
            projectId: m.project_id,
            type: m.type,
            tier: m.tier,
            content: m.content,
            summary: m.summary,
            keywords: m.keywords,
            confidence: m.confidence,
            status: m.status,
            accessCount: m.access_count,
            createdAt: m.created_at,
            lastSeen: m.last_seen,
          })),
          total: result.total,
          stats: {
            total: result.stats.total,
            byTier: result.stats.by_tier,
            byType: result.stats.by_type,
            totalTokens: result.stats.total_tokens,
          },
        }
      } catch (error) {
        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: 'Failed to list memories',
          cause: error,
        })
      }
    }),

  // Search memories
  search: protectedProcedure
    .input(
      z.object({
        query: z.string().min(1),
        employeeId: z.string(),
        projectId: z.string(),
        tenantId: z.string().optional(),
        filters: z.object({
          tier: z.array(memoryTierSchema).optional(),
          type: z.array(memoryTypeSchema).optional(),
          dateRange: z.object({
            start: z.string(),
            end: z.string(),
          }).optional(),
        }).optional(),
        limit: z.number().min(1).max(100).default(20),
      })
    )
    .query(async ({ input }) => {
      try {
        const result = await aiEngine.searchMemories({
          query: input.query,
          employee_id: input.employeeId,
          project_id: input.projectId,
          tenant_id: input.tenantId,
          filters: input.filters ? {
            tier: input.filters.tier,
            type: input.filters.type,
            date_range: input.filters.dateRange,
          } : undefined,
          limit: input.limit,
        })

        return {
          memories: result.memories.map(m => ({
            id: m.memory_id,
            ownerId: m.owner_id,
            employeeId: m.employee_id,
            projectId: m.project_id,
            type: m.type,
            tier: m.tier,
            content: m.content,
            summary: m.summary,
            keywords: m.keywords,
            confidence: m.confidence,
            status: m.status,
            accessCount: m.access_count,
            createdAt: m.created_at,
            lastSeen: m.last_seen,
          })),
          total: result.total,
        }
      } catch (error) {
        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: 'Memory search failed',
          cause: error,
        })
      }
    }),

  // Get memory stats
  stats: protectedProcedure
    .input(
      z.object({
        employeeId: z.string(),
        projectId: z.string().optional(),
        tenantId: z.string().optional(),
      })
    )
    .query(async ({ input }) => {
      try {
        const stats = await aiEngine.getMemoryStats(input.employeeId, input.projectId, input.tenantId)
        return {
          total: stats.total,
          byTier: stats.by_tier,
          byType: stats.by_type,
          totalTokens: stats.total_tokens,
        }
      } catch (error) {
        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: 'Failed to get memory stats',
          cause: error,
        })
      }
    }),

  // Delete a memory
  delete: protectedProcedure
    .input(
      z.object({
        employeeId: z.string(),
        memoryId: z.string(),
        tenantId: z.string().optional(),
      })
    )
    .mutation(async ({ input }) => {
      try {
        const result = await aiEngine.deleteMemory(input.employeeId, input.memoryId, input.tenantId)
        return { success: result.success }
      } catch (error) {
        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: 'Failed to delete memory',
          cause: error,
        })
      }
    }),

  // Update memory tier
  updateTier: protectedProcedure
    .input(
      z.object({
        employeeId: z.string(),
        memoryId: z.string(),
        tier: memoryTierSchema,
        tenantId: z.string().optional(),
      })
    )
    .mutation(async ({ input }) => {
      try {
        const result = await aiEngine.updateMemoryTier(
          input.employeeId,
          input.memoryId,
          input.tier,
          input.tenantId
        )
        return { success: result.success }
      } catch (error) {
        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: 'Failed to update memory tier',
          cause: error,
        })
      }
    }),

  // Run maintenance
  runMaintenance: protectedProcedure
    .input(
      z.object({
        employeeId: z.string(),
        projectId: z.string().optional(),
        tenantId: z.string().optional(),
      })
    )
    .mutation(async ({ input }) => {
      try {
        const result = await aiEngine.runMemoryMaintenance(
          input.employeeId,
          input.projectId,
          input.tenantId
        )
        return {
          success: result.success,
          results: result.results,
        }
      } catch (error) {
        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: 'Failed to run maintenance',
          cause: error,
        })
      }
    }),

  // Export memories (returns URL/blob info)
  exportUrl: protectedProcedure
    .input(
      z.object({
        employeeId: z.string(),
        format: z.enum(['json', 'csv']).default('json'),
        projectId: z.string().optional(),
        tenantId: z.string().optional(),
      })
    )
    .query(({ input }) => {
      // Return the URL for client-side download
      const AI_ENGINE_URL = process.env.AI_ENGINE_URL || 'http://localhost:8016'
      const params = new URLSearchParams()
      params.set('format', input.format)
      if (input.projectId) params.set('project_id', input.projectId)
      if (input.tenantId) params.set('tenant_id', input.tenantId)

      return {
        url: `${AI_ENGINE_URL}/api/v1/memory/${input.employeeId}/export?${params}`,
        format: input.format,
      }
    }),
})
