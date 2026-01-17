/**
 * 交付相关微服务客户端
 * 提供类型安全的微服务调用方法
 */

import { microservices, MicroserviceResponse } from './client';

// ========== 类型定义 ==========

// CI/CD Pipeline 类型
export interface Pipeline {
  id: string;
  projectId: string;
  name: string;
  template: string;
  stages: PipelineStage[];
  triggers: PipelineTrigger[];
  status: 'idle' | 'running' | 'success' | 'failed';
  createdAt: string;
  updatedAt: string;
}

export interface PipelineStage {
  name: string;
  type: 'build' | 'lint' | 'test' | 'security' | 'deploy' | 'notify';
  commands: string[];
  timeout: number;
  allowFailure?: boolean;
}

export interface PipelineTrigger {
  type: 'push' | 'pull_request' | 'manual' | 'schedule';
  branches?: string[];
  schedule?: string;
}

export interface PipelineRun {
  id: string;
  pipelineId: string;
  status: 'pending' | 'running' | 'success' | 'failed' | 'cancelled';
  triggeredBy: string;
  stages: PipelineRunStage[];
  startedAt?: string;
  completedAt?: string;
  duration?: number;
  logs: string[];
}

export interface PipelineRunStage {
  name: string;
  status: 'pending' | 'running' | 'success' | 'failed' | 'skipped';
  startedAt?: string;
  completedAt?: string;
  logs: string[];
}

// 冒烟测试类型
export interface SmokeTestConfig {
  baseUrl: string;
  productType?: string;
  timeout?: number;
  parallel?: boolean;
}

export interface SmokeTestResult {
  reportId: string;
  baseUrl: string;
  totalTests: number;
  passedTests: number;
  failedTests: number;
  passRate: number;
  duration: number;
  results: TestCaseResult[];
  summary: string;
}

export interface TestCaseResult {
  id: string;
  name: string;
  passed: boolean;
  duration: number;
  error?: string;
  screenshot?: string;
}

// 灰度发布类型
export interface CanaryRelease {
  id: string;
  projectId: string;
  deploymentId: string;
  strategy: 'canary' | 'linear' | 'blue_green';
  currentPercentage: number;
  targetPercentage: number;
  status: 'pending' | 'running' | 'paused' | 'completed' | 'rolled_back';
  healthConfig: CanaryHealthConfig;
  createdAt: string;
}

export interface CanaryHealthConfig {
  checkInterval: number;
  successThreshold: number;
  failureThreshold: number;
  maxErrorRate: number;
  maxLatency: number;
}

// 自动回滚类型
export interface RollbackConfig {
  projectId: string;
  deploymentId: string;
  targetVersion: string;
  currentVersion: string;
  healthEndpoint: string;
  checkInterval: number;
  failureThreshold: number;
  maxErrorRate: number;
  maxLatency: number;
  autoRollback: boolean;
  cooldownPeriod: number;
}

export interface RollbackRecord {
  id: string;
  projectId: string;
  deploymentId: string;
  fromVersion: string;
  toVersion: string;
  triggerType: 'health_check' | 'error_rate' | 'latency' | 'manual' | 'smoke_test';
  triggerReason: string;
  status: 'pending' | 'in_progress' | 'completed' | 'failed';
  progress: number;
  triggeredAt: string;
  completedAt?: string;
  duration: number;
  logs: Array<{ timestamp: string; level: string; message: string }>;
}

// 交付队列类型
export interface DeliveryTask {
  id: string;
  projectId: string;
  projectName: string;
  priority: 'urgent' | 'high' | 'normal' | 'low';
  status: 'queued' | 'processing' | 'completed' | 'failed';
  type: 'full' | 'quick' | 'test-only' | 'deploy-only';
  progress: number;
  createdAt: string;
  startedAt?: string;
  completedAt?: string;
}

export interface QueueStats {
  totalTasks: number;
  pendingTasks: number;
  processingTasks: number;
  completedTasks: number;
  failedTasks: number;
  averageWaitTime: number;
  averageProcessTime: number;
}

// ========== CI/CD Pipeline 服务 ==========

export const cicdPipelineService = {
  /**
   * 创建流水线
   */
  async createPipeline(data: {
    projectId: string;
    name: string;
    template: string;
    triggers?: PipelineTrigger[];
  }): Promise<MicroserviceResponse<Pipeline>> {
    return microservices.cicdPipeline.post<Pipeline>('/api/v1/pipelines', data);
  },

  /**
   * 获取流水线列表
   */
  async listPipelines(projectId?: string): Promise<MicroserviceResponse<{ pipelines: Pipeline[] }>> {
    const endpoint = projectId ? `/api/v1/pipelines?projectId=${projectId}` : '/api/v1/pipelines';
    return microservices.cicdPipeline.get(endpoint);
  },

  /**
   * 获取流水线详情
   */
  async getPipeline(pipelineId: string): Promise<MicroserviceResponse<Pipeline>> {
    return microservices.cicdPipeline.get<Pipeline>(`/api/v1/pipelines/${pipelineId}`);
  },

  /**
   * 触发流水线执行
   */
  async triggerPipeline(pipelineId: string, triggeredBy: string = 'manual'): Promise<MicroserviceResponse<PipelineRun>> {
    return microservices.cicdPipeline.post<PipelineRun>(`/api/v1/pipelines/${pipelineId}/trigger`, { triggeredBy });
  },

  /**
   * 获取执行记录
   */
  async getPipelineRun(runId: string): Promise<MicroserviceResponse<PipelineRun>> {
    return microservices.cicdPipeline.get<PipelineRun>(`/api/v1/runs/${runId}`);
  },

  /**
   * 取消执行
   */
  async cancelPipelineRun(runId: string): Promise<MicroserviceResponse<{ message: string }>> {
    return microservices.cicdPipeline.post(`/api/v1/runs/${runId}/cancel`);
  },

  /**
   * 获取流水线模板
   */
  async getTemplates(): Promise<MicroserviceResponse<{ templates: string[] }>> {
    return microservices.cicdPipeline.get('/api/v1/templates');
  },
};

// ========== 冒烟测试服务 ==========

export const smokeTestService = {
  /**
   * 运行快速冒烟测试
   */
  async runQuickTest(config: SmokeTestConfig): Promise<MicroserviceResponse<SmokeTestResult>> {
    return microservices.smokeTest.post<SmokeTestResult>('/api/v1/test/quick', config);
  },

  /**
   * 运行完整冒烟测试
   */
  async runFullTest(config: SmokeTestConfig): Promise<MicroserviceResponse<SmokeTestResult>> {
    return microservices.smokeTest.post<SmokeTestResult>('/api/v1/test/full', config, { timeout: 120000 });
  },

  /**
   * 验证部署
   */
  async verifyDeployment(baseUrl: string, productType?: string): Promise<MicroserviceResponse<{
    success: boolean;
    passRate: number;
    issues: string[];
    report: SmokeTestResult;
  }>> {
    return microservices.smokeTest.post('/api/v1/verify-deployment', { baseUrl, productType });
  },

  /**
   * 获取测试报告
   */
  async getReport(reportId: string): Promise<MicroserviceResponse<SmokeTestResult>> {
    return microservices.smokeTest.get<SmokeTestResult>(`/api/v1/reports/${reportId}`);
  },

  /**
   * 获取测试套件列表
   */
  async getTestSuites(): Promise<MicroserviceResponse<{ suites: string[] }>> {
    return microservices.smokeTest.get('/api/v1/test-suites');
  },
};

// ========== 灰度发布服务 ==========

export const canaryReleaseService = {
  /**
   * 创建灰度发布
   */
  async createRelease(data: {
    projectId: string;
    deploymentId: string;
    strategy?: 'canary' | 'linear' | 'blue_green';
    preset?: 'safe' | 'fast' | 'blue_green';
  }): Promise<MicroserviceResponse<CanaryRelease>> {
    return microservices.canaryRelease.post<CanaryRelease>('/api/v1/releases', data);
  },

  /**
   * 获取发布详情
   */
  async getRelease(releaseId: string): Promise<MicroserviceResponse<CanaryRelease>> {
    return microservices.canaryRelease.get<CanaryRelease>(`/api/v1/releases/${releaseId}`);
  },

  /**
   * 获取项目的发布列表
   */
  async listReleases(projectId: string): Promise<MicroserviceResponse<{ releases: CanaryRelease[] }>> {
    return microservices.canaryRelease.get(`/api/v1/projects/${projectId}/releases`);
  },

  /**
   * 开始灰度发布
   */
  async startRelease(releaseId: string): Promise<MicroserviceResponse<CanaryRelease>> {
    return microservices.canaryRelease.post<CanaryRelease>(`/api/v1/releases/${releaseId}/start`);
  },

  /**
   * 暂停灰度发布
   */
  async pauseRelease(releaseId: string): Promise<MicroserviceResponse<{ message: string }>> {
    return microservices.canaryRelease.post(`/api/v1/releases/${releaseId}/pause`);
  },

  /**
   * 恢复灰度发布
   */
  async resumeRelease(releaseId: string): Promise<MicroserviceResponse<{ message: string }>> {
    return microservices.canaryRelease.post(`/api/v1/releases/${releaseId}/resume`);
  },

  /**
   * 回滚灰度发布
   */
  async rollbackRelease(releaseId: string, reason?: string): Promise<MicroserviceResponse<{ message: string }>> {
    return microservices.canaryRelease.post(`/api/v1/releases/${releaseId}/rollback`, { reason });
  },

  /**
   * 全量发布
   */
  async promoteRelease(releaseId: string): Promise<MicroserviceResponse<{ message: string }>> {
    return microservices.canaryRelease.post(`/api/v1/releases/${releaseId}/promote`);
  },
};

// ========== 自动回滚服务 ==========

export const autoRollbackService = {
  /**
   * 注册回滚配置
   */
  async registerConfig(config: RollbackConfig): Promise<MicroserviceResponse<{ message: string }>> {
    return microservices.autoRollback.post('/api/v1/configs', config);
  },

  /**
   * 开始监控
   */
  async startMonitoring(projectId: string): Promise<MicroserviceResponse<{ message: string }>> {
    return microservices.autoRollback.post(`/api/v1/projects/${projectId}/monitor/start`);
  },

  /**
   * 停止监控
   */
  async stopMonitoring(projectId: string): Promise<MicroserviceResponse<{ message: string }>> {
    return microservices.autoRollback.post(`/api/v1/projects/${projectId}/monitor/stop`);
  },

  /**
   * 获取监控状态
   */
  async getMonitoringStatus(projectId: string): Promise<MicroserviceResponse<{
    isMonitoring: boolean;
    lastCheckAt: string;
    consecutiveFails: number;
    currentErrorRate: number;
    currentLatency: number;
  }>> {
    return microservices.autoRollback.get(`/api/v1/projects/${projectId}/monitor/status`);
  },

  /**
   * 手动触发回滚
   */
  async triggerRollback(projectId: string, reason?: string): Promise<MicroserviceResponse<RollbackRecord>> {
    return microservices.autoRollback.post<RollbackRecord>(`/api/v1/projects/${projectId}/rollback`, { reason });
  },

  /**
   * 获取回滚记录
   */
  async getRollbackRecord(recordId: string): Promise<MicroserviceResponse<RollbackRecord>> {
    return microservices.autoRollback.get<RollbackRecord>(`/api/v1/records/${recordId}`);
  },

  /**
   * 获取项目的回滚历史
   */
  async getRollbackHistory(projectId: string): Promise<MicroserviceResponse<{ records: RollbackRecord[]; count: number }>> {
    return microservices.autoRollback.get(`/api/v1/projects/${projectId}/records`);
  },
};

// ========== 交付队列服务 ==========

export const deliveryQueueService = {
  /**
   * 添加交付任务到队列
   */
  async enqueue(data: {
    projectId: string;
    projectName: string;
    priority?: 'urgent' | 'high' | 'normal' | 'low';
    type?: 'full' | 'quick' | 'test-only' | 'deploy-only';
  }): Promise<MicroserviceResponse<DeliveryTask>> {
    return microservices.deliveryQueue.post<DeliveryTask>('/api/v1/queue/enqueue', data);
  },

  /**
   * 获取队列中的任务
   */
  async getTask(taskId: string): Promise<MicroserviceResponse<DeliveryTask>> {
    return microservices.deliveryQueue.get<DeliveryTask>(`/api/v1/queue/tasks/${taskId}`);
  },

  /**
   * 获取队列状态
   */
  async getQueueStats(): Promise<MicroserviceResponse<QueueStats>> {
    return microservices.deliveryQueue.get<QueueStats>('/api/v1/queue/stats');
  },

  /**
   * 获取项目的队列任务
   */
  async getProjectTasks(projectId: string): Promise<MicroserviceResponse<{ tasks: DeliveryTask[] }>> {
    return microservices.deliveryQueue.get(`/api/v1/queue/projects/${projectId}/tasks`);
  },

  /**
   * 取消任务
   */
  async cancelTask(taskId: string): Promise<MicroserviceResponse<{ message: string }>> {
    return microservices.deliveryQueue.post(`/api/v1/queue/tasks/${taskId}/cancel`);
  },

  /**
   * 重试失败任务
   */
  async retryTask(taskId: string): Promise<MicroserviceResponse<DeliveryTask>> {
    return microservices.deliveryQueue.post<DeliveryTask>(`/api/v1/queue/tasks/${taskId}/retry`);
  },
};
