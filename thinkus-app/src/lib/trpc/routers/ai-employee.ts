import { z } from 'zod'
import { router, protectedProcedure, publicProcedure } from '../trpc'
import { TRPCError } from '@trpc/server'
import * as aiEngine from '@/lib/services/ai-engine-client'

// AI Employee ID schema
const employeeIdSchema = z.enum(['mike_pm', 'david_tech', 'elena_ux', 'kevin_qa'])

export const aiEmployeeRouter = router({
  // Check if AI Engine service is healthy
  health: publicProcedure.query(async () => {
    try {
      const health = await aiEngine.checkHealth()
      return {
        available: true,
        status: health.status,
        employeesLoaded: health.employees_loaded,
      }
    } catch (error) {
      return {
        available: false,
        status: 'unavailable',
        employeesLoaded: 0,
        error: error instanceof Error ? error.message : 'Unknown error',
      }
    }
  }),

  // List all AI employees from microservice
  list: protectedProcedure.query(async () => {
    try {
      const employees = await aiEngine.listEmployees()
      return employees.map(emp => ({
        id: emp.id,
        name: emp.name,
        title: emp.title,
        department: emp.department,
        avatar: emp.avatar,
        description: emp.description,
        capabilities: emp.capabilities,
        specialties: emp.specialties,
        personality: emp.personality,
        isAvailable: emp.is_available,
      }))
    } catch (error) {
      throw new TRPCError({
        code: 'INTERNAL_SERVER_ERROR',
        message: 'Failed to fetch AI employees',
        cause: error,
      })
    }
  }),

  // Get single AI employee
  get: protectedProcedure
    .input(z.object({ employeeId: employeeIdSchema }))
    .query(async ({ input }) => {
      try {
        const employee = await aiEngine.getEmployee(input.employeeId)
        return {
          id: employee.id,
          name: employee.name,
          title: employee.title,
          department: employee.department,
          avatar: employee.avatar,
          description: employee.description,
          capabilities: employee.capabilities,
          specialties: employee.specialties,
          personality: employee.personality,
          isAvailable: employee.is_available,
        }
      } catch (error) {
        throw new TRPCError({
          code: 'NOT_FOUND',
          message: `Employee ${input.employeeId} not found`,
          cause: error,
        })
      }
    }),

  // Chat with AI employee (non-streaming, for simple use cases)
  chat: protectedProcedure
    .input(
      z.object({
        employeeId: employeeIdSchema,
        message: z.string().min(1).max(10000),
        projectId: z.string().optional(),
        context: z
          .array(
            z.object({
              role: z.enum(['user', 'assistant']),
              content: z.string(),
            })
          )
          .optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      try {
        const response = await aiEngine.chat({
          employee_id: input.employeeId,
          project_id: input.projectId || 'default',
          user_id: ctx.user.id,
          message: input.message,
          context: input.context,
        })

        return {
          employeeId: response.employee_id,
          message: response.message,
          suggestions: response.suggestions,
          confidence: response.confidence,
          tokensUsed: response.tokens_used,
        }
      } catch (error) {
        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: 'Chat failed',
          cause: error,
        })
      }
    }),

  // Check if an executive can use microservice backend
  canUseMicroservice: publicProcedure
    .input(z.object({ agentId: z.string() }))
    .query(({ input }) => {
      const employeeId = aiEngine.mapExecutiveToEmployee(input.agentId)
      return {
        canUse: employeeId !== null,
        employeeId,
      }
    }),

  // Get mapping from executive ID to employee ID
  getEmployeeMapping: publicProcedure.query(() => {
    return {
      mike: 'mike_pm',
      david: 'david_tech',
      elena: 'elena_ux',
      kevin: 'kevin_qa',
    }
  }),
})
