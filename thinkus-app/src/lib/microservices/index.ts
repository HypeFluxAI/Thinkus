/**
 * 微服务模块导出
 */

// 客户端基础
export {
  MicroserviceClient,
  microservices,
  MICROSERVICES,
  checkAllServicesHealth,
  checkCriticalServices,
  type ServiceConfig,
  type ServiceHealth,
  type MicroserviceResponse,
  type RequestOptions,
} from './client';

// 交付相关服务
export {
  // CI/CD Pipeline
  cicdPipelineService,
  type Pipeline,
  type PipelineStage,
  type PipelineTrigger,
  type PipelineRun,
  type PipelineRunStage,

  // 冒烟测试
  smokeTestService,
  type SmokeTestConfig,
  type SmokeTestResult,
  type TestCaseResult,

  // 灰度发布
  canaryReleaseService,
  type CanaryRelease,
  type CanaryHealthConfig,

  // 自动回滚
  autoRollbackService,
  type RollbackConfig,
  type RollbackRecord,

  // 交付队列
  deliveryQueueService,
  type DeliveryTask,
  type QueueStats,
} from './delivery-services';
