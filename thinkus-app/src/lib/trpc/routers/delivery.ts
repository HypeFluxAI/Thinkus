/**
 * 交付相关 tRPC 路由
 * 集成微服务提供类型安全的 API 调用
 */

import { z } from 'zod'
import { router, protectedProcedure } from '../trpc'
import {
  cicdPipelineService,
  smokeTestService,
  canaryReleaseService,
  autoRollbackService,
  deliveryQueueService,
  checkAllServicesHealth,
  checkCriticalServices,
} from '@/lib/microservices'

export const deliveryRouter = router({
  // ========== 健康检查 ==========

  /**
   * 检查关键微服务健康状态
   */
  checkHealth: protectedProcedure
    .input(z.object({
      mode: z.enum(['critical', 'all']).optional().default('critical'),
    }))
    .query(async ({ input }) => {
      if (input.mode === 'all') {
        const services = await checkAllServicesHealth()
        const healthyCount = services.filter(s => s.healthy).length
        return {
          mode: 'all' as const,
          totalServices: services.length,
          healthyServices: healthyCount,
          unhealthyServices: services.length - healthyCount,
          services,
          allHealthy: healthyCount === services.length,
        }
      }

      const { allHealthy, services } = await checkCriticalServices()
      return {
        mode: 'critical' as const,
        allHealthy,
        services,
      }
    }),

  // ========== CI/CD 流水线 ==========

  /**
   * 创建流水线
   */
  createPipeline: protectedProcedure
    .input(z.object({
      projectId: z.string(),
      name: z.string(),
      template: z.string(),
      triggers: z.array(z.object({
        type: z.enum(['push', 'pull_request', 'manual', 'schedule']),
        branches: z.array(z.string()).optional(),
        schedule: z.string().optional(),
      })).optional(),
    }))
    .mutation(async ({ input }) => {
      const result = await cicdPipelineService.createPipeline(input)
      if (!result.success) {
        throw new Error(result.error || '创建流水线失败')
      }
      return result.data
    }),

  /**
   * 获取流水线列表
   */
  listPipelines: protectedProcedure
    .input(z.object({
      projectId: z.string().optional(),
    }))
    .query(async ({ input }) => {
      const result = await cicdPipelineService.listPipelines(input.projectId)
      if (!result.success) {
        throw new Error(result.error || '获取流水线失败')
      }
      return result.data?.pipelines || []
    }),

  /**
   * 触发流水线执行
   */
  triggerPipeline: protectedProcedure
    .input(z.object({
      pipelineId: z.string(),
    }))
    .mutation(async ({ input, ctx }) => {
      const triggeredBy = ctx.user.email || ctx.user.name || 'manual'
      const result = await cicdPipelineService.triggerPipeline(input.pipelineId, triggeredBy)
      if (!result.success) {
        throw new Error(result.error || '触发流水线失败')
      }
      return result.data
    }),

  /**
   * 获取流水线执行记录
   */
  getPipelineRun: protectedProcedure
    .input(z.object({
      runId: z.string(),
    }))
    .query(async ({ input }) => {
      const result = await cicdPipelineService.getPipelineRun(input.runId)
      if (!result.success) {
        throw new Error(result.error || '获取执行记录失败')
      }
      return result.data
    }),

  /**
   * 获取流水线模板
   */
  getTemplates: protectedProcedure.query(async () => {
    const result = await cicdPipelineService.getTemplates()
    if (!result.success) {
      throw new Error(result.error || '获取模板失败')
    }
    return result.data?.templates || []
  }),

  // ========== 冒烟测试 ==========

  /**
   * 运行冒烟测试
   */
  runSmokeTest: protectedProcedure
    .input(z.object({
      baseUrl: z.string().url(),
      productType: z.string().optional(),
      mode: z.enum(['quick', 'full']).optional().default('quick'),
      timeout: z.number().optional(),
      parallel: z.boolean().optional(),
    }))
    .mutation(async ({ input }) => {
      const config = {
        baseUrl: input.baseUrl,
        productType: input.productType,
        timeout: input.timeout,
        parallel: input.parallel,
      }

      const result = input.mode === 'full'
        ? await smokeTestService.runFullTest(config)
        : await smokeTestService.runQuickTest(config)

      if (!result.success) {
        throw new Error(result.error || '冒烟测试失败')
      }
      return result.data
    }),

  /**
   * 验证部署
   */
  verifyDeployment: protectedProcedure
    .input(z.object({
      baseUrl: z.string().url(),
      productType: z.string().optional(),
    }))
    .mutation(async ({ input }) => {
      const result = await smokeTestService.verifyDeployment(input.baseUrl, input.productType)
      if (!result.success) {
        throw new Error(result.error || '验证部署失败')
      }
      return result.data
    }),

  /**
   * 获取测试报告
   */
  getTestReport: protectedProcedure
    .input(z.object({
      reportId: z.string(),
    }))
    .query(async ({ input }) => {
      const result = await smokeTestService.getReport(input.reportId)
      if (!result.success) {
        throw new Error(result.error || '获取报告失败')
      }
      return result.data
    }),

  // ========== 灰度发布 ==========

  /**
   * 创建灰度发布
   */
  createCanaryRelease: protectedProcedure
    .input(z.object({
      projectId: z.string(),
      deploymentId: z.string(),
      strategy: z.enum(['canary', 'linear', 'blue_green']).optional(),
      preset: z.enum(['safe', 'fast', 'blue_green']).optional(),
    }))
    .mutation(async ({ input }) => {
      const result = await canaryReleaseService.createRelease(input)
      if (!result.success) {
        throw new Error(result.error || '创建灰度发布失败')
      }
      return result.data
    }),

  /**
   * 获取灰度发布列表
   */
  listCanaryReleases: protectedProcedure
    .input(z.object({
      projectId: z.string(),
    }))
    .query(async ({ input }) => {
      const result = await canaryReleaseService.listReleases(input.projectId)
      if (!result.success) {
        throw new Error(result.error || '获取灰度发布列表失败')
      }
      return result.data?.releases || []
    }),

  /**
   * 控制灰度发布
   */
  controlCanaryRelease: protectedProcedure
    .input(z.object({
      releaseId: z.string(),
      action: z.enum(['start', 'pause', 'resume', 'rollback', 'promote']),
      reason: z.string().optional(),
    }))
    .mutation(async ({ input }) => {
      const { releaseId, action, reason } = input
      let result

      switch (action) {
        case 'start':
          result = await canaryReleaseService.startRelease(releaseId)
          break
        case 'pause':
          result = await canaryReleaseService.pauseRelease(releaseId)
          break
        case 'resume':
          result = await canaryReleaseService.resumeRelease(releaseId)
          break
        case 'rollback':
          result = await canaryReleaseService.rollbackRelease(releaseId, reason)
          break
        case 'promote':
          result = await canaryReleaseService.promoteRelease(releaseId)
          break
      }

      if (!result.success) {
        throw new Error(result.error || `${action} 操作失败`)
      }
      return result.data
    }),

  // ========== 自动回滚 ==========

  /**
   * 注册回滚配置
   */
  registerRollbackConfig: protectedProcedure
    .input(z.object({
      projectId: z.string(),
      deploymentId: z.string(),
      targetVersion: z.string(),
      currentVersion: z.string(),
      healthEndpoint: z.string(),
      checkInterval: z.number().optional().default(30),
      failureThreshold: z.number().optional().default(3),
      maxErrorRate: z.number().optional().default(5),
      maxLatency: z.number().optional().default(1000),
      autoRollback: z.boolean().optional().default(true),
      cooldownPeriod: z.number().optional().default(300),
    }))
    .mutation(async ({ input }) => {
      const result = await autoRollbackService.registerConfig(input)
      if (!result.success) {
        throw new Error(result.error || '注册配置失败')
      }
      return { success: true }
    }),

  /**
   * 控制监控
   */
  controlMonitoring: protectedProcedure
    .input(z.object({
      projectId: z.string(),
      action: z.enum(['start', 'stop']),
    }))
    .mutation(async ({ input }) => {
      const result = input.action === 'start'
        ? await autoRollbackService.startMonitoring(input.projectId)
        : await autoRollbackService.stopMonitoring(input.projectId)

      if (!result.success) {
        throw new Error(result.error || `${input.action} 监控失败`)
      }
      return { success: true }
    }),

  /**
   * 获取监控状态
   */
  getMonitoringStatus: protectedProcedure
    .input(z.object({
      projectId: z.string(),
    }))
    .query(async ({ input }) => {
      const result = await autoRollbackService.getMonitoringStatus(input.projectId)
      if (!result.success) {
        throw new Error(result.error || '获取监控状态失败')
      }
      return result.data
    }),

  /**
   * 手动触发回滚
   */
  triggerRollback: protectedProcedure
    .input(z.object({
      projectId: z.string(),
      reason: z.string().optional(),
    }))
    .mutation(async ({ input }) => {
      const result = await autoRollbackService.triggerRollback(input.projectId, input.reason)
      if (!result.success) {
        throw new Error(result.error || '触发回滚失败')
      }
      return result.data
    }),

  /**
   * 获取回滚历史
   */
  getRollbackHistory: protectedProcedure
    .input(z.object({
      projectId: z.string(),
    }))
    .query(async ({ input }) => {
      const result = await autoRollbackService.getRollbackHistory(input.projectId)
      if (!result.success) {
        throw new Error(result.error || '获取回滚历史失败')
      }
      return result.data
    }),

  // ========== 交付队列 ==========

  /**
   * 添加到交付队列
   */
  enqueueDelivery: protectedProcedure
    .input(z.object({
      projectId: z.string(),
      projectName: z.string(),
      priority: z.enum(['urgent', 'high', 'normal', 'low']).optional().default('normal'),
      type: z.enum(['full', 'quick', 'test-only', 'deploy-only']).optional().default('full'),
    }))
    .mutation(async ({ input }) => {
      const result = await deliveryQueueService.enqueue(input)
      if (!result.success) {
        throw new Error(result.error || '添加到队列失败')
      }
      return result.data
    }),

  /**
   * 获取队列状态
   */
  getQueueStats: protectedProcedure.query(async () => {
    const result = await deliveryQueueService.getQueueStats()
    if (!result.success) {
      throw new Error(result.error || '获取队列状态失败')
    }
    return result.data
  }),

  /**
   * 获取项目队列任务
   */
  getProjectTasks: protectedProcedure
    .input(z.object({
      projectId: z.string(),
    }))
    .query(async ({ input }) => {
      const result = await deliveryQueueService.getProjectTasks(input.projectId)
      if (!result.success) {
        throw new Error(result.error || '获取项目任务失败')
      }
      return result.data?.tasks || []
    }),

  /**
   * 控制队列任务
   */
  controlQueueTask: protectedProcedure
    .input(z.object({
      taskId: z.string(),
      action: z.enum(['cancel', 'retry']),
    }))
    .mutation(async ({ input }) => {
      const result = input.action === 'cancel'
        ? await deliveryQueueService.cancelTask(input.taskId)
        : await deliveryQueueService.retryTask(input.taskId)

      if (!result.success) {
        throw new Error(result.error || `${input.action} 操作失败`)
      }
      return result.data
    }),
})
