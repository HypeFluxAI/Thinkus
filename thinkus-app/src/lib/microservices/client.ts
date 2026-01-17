/**
 * 微服务客户端
 * 提供 Node.js 主服务与 Go/Python 微服务之间的通信层
 */

// ========== 服务配置 ==========

export interface ServiceConfig {
  name: string;
  host: string;
  port: number;
  healthEndpoint: string;
  timeout: number;
}

/**
 * 微服务端点配置
 * Docker 环境中使用服务名，本地开发使用 localhost
 */
const isDocker = process.env.DOCKER_ENV === 'true';

export const MICROSERVICES: Record<string, ServiceConfig> = {
  // 交付运营服务
  DELIVERY_QUEUE: {
    name: 'go-delivery-queue',
    host: isDocker ? 'go-delivery-queue' : 'localhost',
    port: 8004,
    healthEndpoint: '/health',
    timeout: 30000,
  },
  DATA_MIGRATOR: {
    name: 'py-data-migrator',
    host: isDocker ? 'py-data-migrator' : 'localhost',
    port: 9002,
    healthEndpoint: '/health',
    timeout: 60000,
  },
  ENV_MANAGER: {
    name: 'go-env-manager',
    host: isDocker ? 'go-env-manager' : 'localhost',
    port: 8005,
    healthEndpoint: '/api/v1/health',
    timeout: 30000,
  },
  TEST_DATA: {
    name: 'py-test-data',
    host: isDocker ? 'py-test-data' : 'localhost',
    port: 9003,
    healthEndpoint: '/health',
    timeout: 30000,
  },

  // CI/CD 和发布控制服务
  CICD_PIPELINE: {
    name: 'go-cicd-pipeline',
    host: isDocker ? 'go-cicd-pipeline' : 'localhost',
    port: 8006,
    healthEndpoint: '/api/v1/health',
    timeout: 60000,
  },
  SMOKE_TEST: {
    name: 'py-smoke-test',
    host: isDocker ? 'py-smoke-test' : 'localhost',
    port: 9004,
    healthEndpoint: '/health',
    timeout: 120000,
  },
  CANARY_RELEASE: {
    name: 'go-canary-release',
    host: isDocker ? 'go-canary-release' : 'localhost',
    port: 8007,
    healthEndpoint: '/api/v1/health',
    timeout: 30000,
  },
  AUTO_ROLLBACK: {
    name: 'go-auto-rollback',
    host: isDocker ? 'go-auto-rollback' : 'localhost',
    port: 8008,
    healthEndpoint: '/api/v1/health',
    timeout: 30000,
  },

  // AI 服务
  AI_GUIDE: {
    name: 'py-ai-guide',
    host: isDocker ? 'py-ai-guide' : 'localhost',
    port: 8001,
    healthEndpoint: '/health',
    timeout: 30000,
  },
  AI_SUPPORT: {
    name: 'py-ai-support',
    host: isDocker ? 'py-ai-support' : 'localhost',
    port: 8002,
    healthEndpoint: '/health',
    timeout: 30000,
  },
  AI_CARE: {
    name: 'go-ai-care',
    host: isDocker ? 'go-ai-care' : 'localhost',
    port: 8003,
    healthEndpoint: '/health',
    timeout: 30000,
  },
};

// ========== 类型定义 ==========

export interface MicroserviceResponse<T = unknown> {
  success: boolean;
  data?: T;
  error?: string;
  statusCode: number;
}

export interface RequestOptions {
  method?: 'GET' | 'POST' | 'PUT' | 'DELETE' | 'PATCH';
  body?: unknown;
  headers?: Record<string, string>;
  timeout?: number;
}

// ========== 客户端实现 ==========

/**
 * 微服务客户端类
 */
export class MicroserviceClient {
  private config: ServiceConfig;
  private baseUrl: string;

  constructor(service: ServiceConfig) {
    this.config = service;
    this.baseUrl = `http://${service.host}:${service.port}`;
  }

  /**
   * 获取服务基础 URL
   */
  getBaseUrl(): string {
    return this.baseUrl;
  }

  /**
   * 健康检查
   */
  async healthCheck(): Promise<boolean> {
    try {
      const response = await this.request(this.config.healthEndpoint, {
        method: 'GET',
        timeout: 5000,
      });
      return response.success;
    } catch {
      return false;
    }
  }

  /**
   * 发送请求到微服务
   */
  async request<T = unknown>(
    endpoint: string,
    options: RequestOptions = {}
  ): Promise<MicroserviceResponse<T>> {
    const { method = 'GET', body, headers = {}, timeout } = options;
    const url = `${this.baseUrl}${endpoint}`;
    const requestTimeout = timeout || this.config.timeout;

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), requestTimeout);

    try {
      const response = await fetch(url, {
        method,
        headers: {
          'Content-Type': 'application/json',
          ...headers,
        },
        body: body ? JSON.stringify(body) : undefined,
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      const data = await response.json().catch(() => null);

      if (!response.ok) {
        return {
          success: false,
          error: data?.error || data?.message || `HTTP ${response.status}`,
          statusCode: response.status,
        };
      }

      return {
        success: true,
        data: data as T,
        statusCode: response.status,
      };
    } catch (error) {
      clearTimeout(timeoutId);

      if (error instanceof Error && error.name === 'AbortError') {
        return {
          success: false,
          error: `请求超时 (${requestTimeout}ms)`,
          statusCode: 408,
        };
      }

      return {
        success: false,
        error: error instanceof Error ? error.message : '未知错误',
        statusCode: 500,
      };
    }
  }

  /**
   * GET 请求
   */
  async get<T = unknown>(endpoint: string, options?: Omit<RequestOptions, 'method' | 'body'>): Promise<MicroserviceResponse<T>> {
    return this.request<T>(endpoint, { ...options, method: 'GET' });
  }

  /**
   * POST 请求
   */
  async post<T = unknown>(endpoint: string, body?: unknown, options?: Omit<RequestOptions, 'method' | 'body'>): Promise<MicroserviceResponse<T>> {
    return this.request<T>(endpoint, { ...options, method: 'POST', body });
  }

  /**
   * PUT 请求
   */
  async put<T = unknown>(endpoint: string, body?: unknown, options?: Omit<RequestOptions, 'method' | 'body'>): Promise<MicroserviceResponse<T>> {
    return this.request<T>(endpoint, { ...options, method: 'PUT', body });
  }

  /**
   * DELETE 请求
   */
  async delete<T = unknown>(endpoint: string, options?: Omit<RequestOptions, 'method' | 'body'>): Promise<MicroserviceResponse<T>> {
    return this.request<T>(endpoint, { ...options, method: 'DELETE' });
  }
}

// ========== 服务实例 ==========

/**
 * 预创建的微服务客户端实例
 */
export const microservices = {
  deliveryQueue: new MicroserviceClient(MICROSERVICES.DELIVERY_QUEUE),
  dataMigrator: new MicroserviceClient(MICROSERVICES.DATA_MIGRATOR),
  envManager: new MicroserviceClient(MICROSERVICES.ENV_MANAGER),
  testData: new MicroserviceClient(MICROSERVICES.TEST_DATA),
  cicdPipeline: new MicroserviceClient(MICROSERVICES.CICD_PIPELINE),
  smokeTest: new MicroserviceClient(MICROSERVICES.SMOKE_TEST),
  canaryRelease: new MicroserviceClient(MICROSERVICES.CANARY_RELEASE),
  autoRollback: new MicroserviceClient(MICROSERVICES.AUTO_ROLLBACK),
  aiGuide: new MicroserviceClient(MICROSERVICES.AI_GUIDE),
  aiSupport: new MicroserviceClient(MICROSERVICES.AI_SUPPORT),
  aiCare: new MicroserviceClient(MICROSERVICES.AI_CARE),
};

// ========== 服务健康状态 ==========

export interface ServiceHealth {
  name: string;
  healthy: boolean;
  latency?: number;
  error?: string;
}

/**
 * 检查所有微服务健康状态
 */
export async function checkAllServicesHealth(): Promise<ServiceHealth[]> {
  const results: ServiceHealth[] = [];

  for (const [key, client] of Object.entries(microservices)) {
    const start = Date.now();
    const healthy = await client.healthCheck();
    const latency = Date.now() - start;

    results.push({
      name: key,
      healthy,
      latency: healthy ? latency : undefined,
      error: healthy ? undefined : '服务不可用',
    });
  }

  return results;
}

/**
 * 检查关键服务是否可用
 */
export async function checkCriticalServices(): Promise<{
  allHealthy: boolean;
  services: ServiceHealth[];
}> {
  const criticalServices = [
    microservices.deliveryQueue,
    microservices.cicdPipeline,
    microservices.smokeTest,
    microservices.autoRollback,
  ];

  const services: ServiceHealth[] = [];
  let allHealthy = true;

  for (const client of criticalServices) {
    const start = Date.now();
    const healthy = await client.healthCheck();
    const latency = Date.now() - start;

    if (!healthy) allHealthy = false;

    services.push({
      name: client.getBaseUrl(),
      healthy,
      latency: healthy ? latency : undefined,
    });
  }

  return { allHealthy, services };
}
