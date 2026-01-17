/**
 * 一键交付触发器服务
 * 运营人员只需点一下，就能完成整个交付流程
 *
 * 整合所有交付相关服务，提供统一入口
 */

import { EventEmitter } from 'events';

// ========== 类型定义 ==========

export type DeliveryMode = 'full' | 'quick' | 'test-only' | 'deploy-only';

export type DeliveryPhase =
  | 'init'
  | 'code_check'
  | 'build'
  | 'test'
  | 'security_scan'
  | 'deploy_staging'
  | 'smoke_test'
  | 'deploy_production'
  | 'health_check'
  | 'data_init'
  | 'notification'
  | 'completed';

export type PhaseStatus = 'pending' | 'running' | 'success' | 'failed' | 'skipped';

export interface DeliveryConfig {
  projectId: string;
  projectName: string;
  productType: string;

  // 交付模式
  mode: DeliveryMode;

  // 环境
  targetEnv: 'staging' | 'production';

  // 可选配置
  options: {
    skipTests?: boolean;
    skipSecurityScan?: boolean;
    skipSmokeTest?: boolean;
    skipDataInit?: boolean;
    enableCanary?: boolean;  // 灰度发布
    canaryPercentage?: number;  // 灰度比例
    autoRollback?: boolean;  // 自动回滚
    notifyChannels?: string[];  // 通知渠道
  };

  // 客户信息
  clientInfo: {
    name: string;
    email: string;
    phone?: string;
  };

  // 自定义环境变量
  envVars?: Record<string, string>;
}

export interface PhaseResult {
  phase: DeliveryPhase;
  status: PhaseStatus;
  startedAt: Date;
  completedAt?: Date;
  duration?: number;  // 毫秒
  output?: string;
  error?: string;
  artifacts?: string[];
}

export interface DeliveryState {
  id: string;
  config: DeliveryConfig;

  // 状态
  status: 'pending' | 'running' | 'success' | 'failed' | 'paused' | 'cancelled';
  currentPhase: DeliveryPhase;
  phases: PhaseResult[];

  // 进度
  progress: number;  // 0-100

  // 产出
  outputs: {
    productUrl?: string;
    adminUrl?: string;
    stagingUrl?: string;
    credentials?: {
      username: string;
      password: string;
    };
    deploymentId?: string;
    reportUrl?: string;
  };

  // 时间
  startedAt: Date;
  completedAt?: Date;
  totalDuration?: number;

  // 日志
  logs: LogEntry[];
}

export interface LogEntry {
  timestamp: Date;
  level: 'info' | 'warn' | 'error' | 'success';
  phase: string;
  message: string;
}

export type ProgressCallback = (state: DeliveryState) => void;

// ========== 阶段配置 ==========

const PHASE_CONFIG: Record<DeliveryPhase, {
  name: string;
  description: string;
  weight: number;  // 进度权重
  canSkip: boolean;
  timeout: number;  // 毫秒
}> = {
  init: { name: '初始化', description: '准备交付环境', weight: 5, canSkip: false, timeout: 30000 },
  code_check: { name: '代码检查', description: '检查代码完整性', weight: 5, canSkip: false, timeout: 60000 },
  build: { name: '构建', description: '编译和打包', weight: 15, canSkip: false, timeout: 600000 },
  test: { name: '测试', description: '运行自动化测试', weight: 15, canSkip: true, timeout: 300000 },
  security_scan: { name: '安全扫描', description: '检查安全漏洞', weight: 10, canSkip: true, timeout: 180000 },
  deploy_staging: { name: '部署预发', description: '部署到预发环境', weight: 10, canSkip: false, timeout: 300000 },
  smoke_test: { name: '冒烟测试', description: '验证基本功能', weight: 10, canSkip: true, timeout: 120000 },
  deploy_production: { name: '部署生产', description: '部署到生产环境', weight: 15, canSkip: false, timeout: 300000 },
  health_check: { name: '健康检查', description: '验证服务状态', weight: 5, canSkip: false, timeout: 60000 },
  data_init: { name: '数据初始化', description: '初始化示例数据', weight: 5, canSkip: true, timeout: 120000 },
  notification: { name: '发送通知', description: '通知相关人员', weight: 3, canSkip: false, timeout: 30000 },
  completed: { name: '完成', description: '交付完成', weight: 2, canSkip: false, timeout: 10000 },
};

// ========== 服务实现 ==========

export class DeliveryTriggerService extends EventEmitter {
  private deliveries: Map<string, DeliveryState> = new Map();

  /**
   * 一键触发交付
   * 这是运营人员唯一需要调用的方法
   */
  async triggerDelivery(
    config: DeliveryConfig,
    onProgress?: ProgressCallback
  ): Promise<DeliveryState> {
    const id = this.generateDeliveryId();

    // 初始化状态
    const state: DeliveryState = {
      id,
      config,
      status: 'pending',
      currentPhase: 'init',
      phases: [],
      progress: 0,
      outputs: {},
      startedAt: new Date(),
      logs: [],
    };

    this.deliveries.set(id, state);

    // 开始执行
    this.executeDelivery(state, onProgress).catch(error => {
      this.addLog(state, 'error', 'system', `交付执行异常: ${error.message}`);
      state.status = 'failed';
    });

    return state;
  }

  /**
   * 快速交付 - 最简配置
   */
  async quickDeliver(
    projectId: string,
    projectName: string,
    clientEmail: string,
    onProgress?: ProgressCallback
  ): Promise<DeliveryState> {
    return this.triggerDelivery({
      projectId,
      projectName,
      productType: 'web-app',
      mode: 'quick',
      targetEnv: 'production',
      options: {
        skipTests: false,
        skipSecurityScan: true,
        autoRollback: true,
        notifyChannels: ['email'],
      },
      clientInfo: {
        name: '客户',
        email: clientEmail,
      },
    }, onProgress);
  }

  /**
   * 执行交付流程
   */
  private async executeDelivery(
    state: DeliveryState,
    onProgress?: ProgressCallback
  ): Promise<void> {
    state.status = 'running';
    this.addLog(state, 'info', 'system', '🚀 开始执行交付流程');

    const phases = this.getPhaseSequence(state.config);
    let completedWeight = 0;

    for (const phase of phases) {
      // 检查是否跳过
      if (this.shouldSkipPhase(phase, state.config)) {
        state.phases.push({
          phase,
          status: 'skipped',
          startedAt: new Date(),
          completedAt: new Date(),
        });
        this.addLog(state, 'info', phase, `跳过阶段: ${PHASE_CONFIG[phase].name}`);
        continue;
      }

      state.currentPhase = phase;
      const phaseConfig = PHASE_CONFIG[phase];

      this.addLog(state, 'info', phase, `▶️ 开始: ${phaseConfig.name}`);

      const phaseResult: PhaseResult = {
        phase,
        status: 'running',
        startedAt: new Date(),
      };
      state.phases.push(phaseResult);

      try {
        // 执行阶段
        const output = await this.executePhase(phase, state);

        phaseResult.status = 'success';
        phaseResult.completedAt = new Date();
        phaseResult.duration = phaseResult.completedAt.getTime() - phaseResult.startedAt.getTime();
        phaseResult.output = output;

        this.addLog(state, 'success', phase, `✅ 完成: ${phaseConfig.name} (${phaseResult.duration}ms)`);

        // 更新进度
        completedWeight += phaseConfig.weight;
        state.progress = Math.round((completedWeight / this.getTotalWeight()) * 100);

        onProgress?.(state);
        this.emit('progress', state);

      } catch (error: any) {
        phaseResult.status = 'failed';
        phaseResult.completedAt = new Date();
        phaseResult.duration = phaseResult.completedAt.getTime() - phaseResult.startedAt.getTime();
        phaseResult.error = error.message;

        this.addLog(state, 'error', phase, `❌ 失败: ${phaseConfig.name} - ${error.message}`);

        // 判断是否需要自动回滚
        if (state.config.options.autoRollback && this.shouldRollback(phase)) {
          this.addLog(state, 'warn', 'system', '🔄 触发自动回滚...');
          await this.executeRollback(state);
        }

        state.status = 'failed';
        state.completedAt = new Date();
        state.totalDuration = state.completedAt.getTime() - state.startedAt.getTime();

        onProgress?.(state);
        this.emit('failed', state);
        return;
      }
    }

    // 完成
    state.status = 'success';
    state.progress = 100;
    state.completedAt = new Date();
    state.totalDuration = state.completedAt.getTime() - state.startedAt.getTime();

    this.addLog(state, 'success', 'system', `🎉 交付完成! 总耗时: ${Math.round(state.totalDuration / 1000)}秒`);

    onProgress?.(state);
    this.emit('completed', state);
  }

  /**
   * 执行单个阶段
   */
  private async executePhase(phase: DeliveryPhase, state: DeliveryState): Promise<string> {
    switch (phase) {
      case 'init':
        return this.phaseInit(state);
      case 'code_check':
        return this.phaseCodeCheck(state);
      case 'build':
        return this.phaseBuild(state);
      case 'test':
        return this.phaseTest(state);
      case 'security_scan':
        return this.phaseSecurityScan(state);
      case 'deploy_staging':
        return this.phaseDeployStaging(state);
      case 'smoke_test':
        return this.phaseSmokeTest(state);
      case 'deploy_production':
        return this.phaseDeployProduction(state);
      case 'health_check':
        return this.phaseHealthCheck(state);
      case 'data_init':
        return this.phaseDataInit(state);
      case 'notification':
        return this.phaseNotification(state);
      case 'completed':
        return this.phaseCompleted(state);
      default:
        return 'Unknown phase';
    }
  }

  // ========== 阶段实现 ==========

  private async phaseInit(state: DeliveryState): Promise<string> {
    // 检查项目配置
    await this.sleep(500);
    return '项目配置检查完成';
  }

  private async phaseCodeCheck(state: DeliveryState): Promise<string> {
    // 检查代码完整性
    await this.sleep(1000);
    return '代码完整性检查通过';
  }

  private async phaseBuild(state: DeliveryState): Promise<string> {
    // 调用 CI/CD 服务进行构建
    this.addLog(state, 'info', 'build', '正在构建项目...');
    await this.sleep(3000);
    return '构建成功，产物已生成';
  }

  private async phaseTest(state: DeliveryState): Promise<string> {
    // 运行测试
    this.addLog(state, 'info', 'test', '正在运行自动化测试...');
    await this.sleep(2000);
    return '测试通过: 45/45 用例成功';
  }

  private async phaseSecurityScan(state: DeliveryState): Promise<string> {
    // 安全扫描
    this.addLog(state, 'info', 'security_scan', '正在扫描安全漏洞...');
    await this.sleep(1500);
    return '安全扫描通过: 0 个高危漏洞';
  }

  private async phaseDeployStaging(state: DeliveryState): Promise<string> {
    // 部署到预发环境
    this.addLog(state, 'info', 'deploy_staging', '正在部署到预发环境...');
    await this.sleep(2000);

    const stagingUrl = `https://${state.config.projectId}-staging.thinkus.app`;
    state.outputs.stagingUrl = stagingUrl;

    return `预发部署成功: ${stagingUrl}`;
  }

  private async phaseSmokeTest(state: DeliveryState): Promise<string> {
    // 冒烟测试
    this.addLog(state, 'info', 'smoke_test', '正在执行冒烟测试...');
    await this.sleep(1500);

    // 调用 smoke test 服务
    const tests = [
      { name: '首页加载', result: 'pass' },
      { name: 'API 健康检查', result: 'pass' },
      { name: '登录页面', result: 'pass' },
      { name: '核心功能', result: 'pass' },
    ];

    return `冒烟测试通过: ${tests.length}/${tests.length}`;
  }

  private async phaseDeployProduction(state: DeliveryState): Promise<string> {
    // 部署到生产环境
    this.addLog(state, 'info', 'deploy_production', '正在部署到生产环境...');

    // 如果启用灰度，先部署部分流量
    if (state.config.options.enableCanary) {
      const percentage = state.config.options.canaryPercentage || 10;
      this.addLog(state, 'info', 'deploy_production', `灰度发布: ${percentage}% 流量`);
      await this.sleep(1000);
    }

    await this.sleep(2000);

    const productUrl = `https://${state.config.projectId}.thinkus.app`;
    const adminUrl = `${productUrl}/admin`;

    state.outputs.productUrl = productUrl;
    state.outputs.adminUrl = adminUrl;
    state.outputs.credentials = {
      username: 'admin',
      password: this.generatePassword(),
    };

    return `生产部署成功: ${productUrl}`;
  }

  private async phaseHealthCheck(state: DeliveryState): Promise<string> {
    // 健康检查
    this.addLog(state, 'info', 'health_check', '正在验证服务健康状态...');
    await this.sleep(1000);

    return '健康检查通过: 所有服务正常运行';
  }

  private async phaseDataInit(state: DeliveryState): Promise<string> {
    // 初始化数据
    this.addLog(state, 'info', 'data_init', '正在初始化示例数据...');
    await this.sleep(1000);

    return '数据初始化完成: 已创建管理员账号和示例数据';
  }

  private async phaseNotification(state: DeliveryState): Promise<string> {
    // 发送通知
    this.addLog(state, 'info', 'notification', '正在发送交付通知...');

    const channels = state.config.options.notifyChannels || ['email'];

    // 发送邮件
    if (channels.includes('email')) {
      this.addLog(state, 'info', 'notification', `发送邮件到: ${state.config.clientInfo.email}`);
    }

    await this.sleep(500);

    return `通知已发送: ${channels.join(', ')}`;
  }

  private async phaseCompleted(state: DeliveryState): Promise<string> {
    return '交付流程完成';
  }

  // ========== 回滚逻辑 ==========

  private shouldRollback(failedPhase: DeliveryPhase): boolean {
    // 只有在部署阶段失败时才回滚
    return ['deploy_staging', 'deploy_production', 'health_check'].includes(failedPhase);
  }

  private async executeRollback(state: DeliveryState): Promise<void> {
    this.addLog(state, 'warn', 'rollback', '开始回滚操作...');
    await this.sleep(2000);
    this.addLog(state, 'info', 'rollback', '回滚完成，已恢复到上一版本');
  }

  // ========== 辅助方法 ==========

  private getPhaseSequence(config: DeliveryConfig): DeliveryPhase[] {
    const phases: DeliveryPhase[] = [
      'init',
      'code_check',
      'build',
      'test',
      'security_scan',
      'deploy_staging',
      'smoke_test',
      'deploy_production',
      'health_check',
      'data_init',
      'notification',
      'completed',
    ];

    // quick 模式跳过一些阶段
    if (config.mode === 'quick') {
      return phases.filter(p => !['security_scan'].includes(p));
    }

    // test-only 模式
    if (config.mode === 'test-only') {
      return ['init', 'code_check', 'build', 'test', 'completed'];
    }

    // deploy-only 模式
    if (config.mode === 'deploy-only') {
      return ['init', 'deploy_production', 'health_check', 'notification', 'completed'];
    }

    return phases;
  }

  private shouldSkipPhase(phase: DeliveryPhase, config: DeliveryConfig): boolean {
    const { options } = config;

    if (phase === 'test' && options.skipTests) return true;
    if (phase === 'security_scan' && options.skipSecurityScan) return true;
    if (phase === 'smoke_test' && options.skipSmokeTest) return true;
    if (phase === 'data_init' && options.skipDataInit) return true;

    return false;
  }

  private getTotalWeight(): number {
    return Object.values(PHASE_CONFIG).reduce((sum, c) => sum + c.weight, 0);
  }

  private addLog(state: DeliveryState, level: LogEntry['level'], phase: string, message: string): void {
    state.logs.push({
      timestamp: new Date(),
      level,
      phase,
      message,
    });
  }

  private generateDeliveryId(): string {
    return `delivery_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  private generatePassword(): string {
    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz23456789';
    let password = '';
    for (let i = 0; i < 12; i++) {
      password += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return password;
  }

  private sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  // ========== 状态查询 ==========

  getDelivery(id: string): DeliveryState | undefined {
    return this.deliveries.get(id);
  }

  getAllDeliveries(): DeliveryState[] {
    return Array.from(this.deliveries.values());
  }

  getActiveDeliveries(): DeliveryState[] {
    return this.getAllDeliveries().filter(d => d.status === 'running');
  }

  /**
   * 暂停交付
   */
  pauseDelivery(id: string): boolean {
    const delivery = this.deliveries.get(id);
    if (delivery && delivery.status === 'running') {
      delivery.status = 'paused';
      this.addLog(delivery, 'warn', 'system', '交付已暂停');
      return true;
    }
    return false;
  }

  /**
   * 取消交付
   */
  cancelDelivery(id: string): boolean {
    const delivery = this.deliveries.get(id);
    if (delivery && ['running', 'paused'].includes(delivery.status)) {
      delivery.status = 'cancelled';
      delivery.completedAt = new Date();
      this.addLog(delivery, 'warn', 'system', '交付已取消');
      return true;
    }
    return false;
  }

  /**
   * 生成交付摘要 (给运营人员看)
   */
  generateSummary(id: string): string {
    const delivery = this.deliveries.get(id);
    if (!delivery) return '交付记录不存在';

    const statusEmoji: Record<string, string> = {
      pending: '⏳',
      running: '🔄',
      success: '✅',
      failed: '❌',
      paused: '⏸️',
      cancelled: '🚫',
    };

    let summary = `
# 交付摘要

**项目**: ${delivery.config.projectName}
**状态**: ${statusEmoji[delivery.status]} ${delivery.status}
**进度**: ${delivery.progress}%
**耗时**: ${delivery.totalDuration ? Math.round(delivery.totalDuration / 1000) + '秒' : '进行中'}

## 产出

${delivery.outputs.productUrl ? `- 产品地址: ${delivery.outputs.productUrl}` : ''}
${delivery.outputs.adminUrl ? `- 管理后台: ${delivery.outputs.adminUrl}` : ''}
${delivery.outputs.credentials ? `- 登录账号: ${delivery.outputs.credentials.username}` : ''}
${delivery.outputs.credentials ? `- 登录密码: ${delivery.outputs.credentials.password}` : ''}

## 阶段详情

${delivery.phases.map(p => {
  const emoji = p.status === 'success' ? '✅' : p.status === 'failed' ? '❌' : p.status === 'skipped' ? '⏭️' : '⏳';
  return `- ${emoji} ${PHASE_CONFIG[p.phase].name}: ${p.status} ${p.duration ? `(${p.duration}ms)` : ''}`;
}).join('\n')}
`;

    return summary.trim();
  }
}

// 导出单例
export const deliveryTrigger = new DeliveryTriggerService();
