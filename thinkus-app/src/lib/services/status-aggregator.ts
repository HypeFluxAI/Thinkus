/**
 * 状态聚合服务
 * 聚合各项服务状态为简化的红绿灯状态
 */

import type {
  SimpleStatus,
  ServiceCheck,
  CheckStatus,
  AggregatedStatus,
  StatusIssue,
} from '../config/simple-status'

import {
  SERVICE_CHECKS,
  getStatusFromScore,
  getStatusFromResponseTime,
  getStatusFromErrorRate,
  mergeStatuses,
  STATUS_THRESHOLDS
} from '../config/simple-status'

// 重新导出类型以便其他模块使用
export type { AggregatedStatus, StatusIssue, SimpleStatus, CheckStatus }

/**
 * 项目部署信息
 */
export interface DeploymentInfo {
  url?: string
  status: 'active' | 'building' | 'error' | 'pending' | 'unknown'
  lastDeployedAt?: Date
  platform?: string
}

/**
 * 数据库连接信息
 */
export interface DatabaseInfo {
  connected: boolean
  responseTime?: number // 毫秒
  lastCheckedAt?: Date
}

/**
 * 域名信息
 */
export interface DomainInfo {
  domain?: string
  sslStatus: 'valid' | 'expiring' | 'expired' | 'pending' | 'unknown'
  sslExpiresAt?: Date
  dnsConfigured: boolean
}

/**
 * API 健康信息
 */
export interface ApiHealthInfo {
  healthy: boolean
  responseTime?: number // 毫秒
  errorRate?: number // 百分比
  lastCheckedAt?: Date
}

/**
 * 项目状态输入
 */
export interface ProjectStatusInput {
  projectId: string
  deployment?: DeploymentInfo
  database?: DatabaseInfo
  domain?: DomainInfo
  apiHealth?: ApiHealthInfo
  recentErrors?: number // 最近24小时错误数
  uptimeDays?: number // 连续正常运行天数
}

/**
 * 状态聚合服务类
 */
export class StatusAggregatorService {
  private static instance: StatusAggregatorService

  private constructor() {}

  public static getInstance(): StatusAggregatorService {
    if (!StatusAggregatorService.instance) {
      StatusAggregatorService.instance = new StatusAggregatorService()
    }
    return StatusAggregatorService.instance
  }

  /**
   * 聚合项目状态
   */
  aggregateStatus(input: ProjectStatusInput): AggregatedStatus {
    const checks: CheckStatus[] = []
    const issues: StatusIssue[] = []
    let totalWeight = 0
    let weightedScore = 0

    // 检查部署状态
    const deploymentCheck = this.checkDeployment(input.deployment)
    checks.push(deploymentCheck)
    if (deploymentCheck.status !== 'healthy') {
      issues.push(this.createIssue('deployment', deploymentCheck))
    }

    // 检查数据库状态
    const databaseCheck = this.checkDatabase(input.database)
    checks.push(databaseCheck)
    if (databaseCheck.status !== 'healthy') {
      issues.push(this.createIssue('database', databaseCheck))
    }

    // 检查域名/SSL状态
    const domainCheck = this.checkDomain(input.domain)
    checks.push(domainCheck)
    if (domainCheck.status !== 'healthy') {
      issues.push(this.createIssue('domain', domainCheck))
    }

    // 检查API状态
    const apiCheck = this.checkApi(input.apiHealth)
    checks.push(apiCheck)
    if (apiCheck.status !== 'healthy') {
      issues.push(this.createIssue('api', apiCheck))
    }

    // 检查响应时间
    const responseTimeCheck = this.checkResponseTime(input.apiHealth?.responseTime)
    checks.push(responseTimeCheck)
    if (responseTimeCheck.status !== 'healthy') {
      issues.push(this.createIssue('response_time', responseTimeCheck))
    }

    // 检查错误率
    const errorRateCheck = this.checkErrorRate(input.recentErrors)
    checks.push(errorRateCheck)
    if (errorRateCheck.status !== 'healthy') {
      issues.push(this.createIssue('error_rate', errorRateCheck))
    }

    // 计算加权分数
    for (const check of checks) {
      const serviceCheck = SERVICE_CHECKS.find(s => s.id === check.checkId)
      if (serviceCheck) {
        totalWeight += serviceCheck.weight
        const statusScore = this.getStatusScore(check.status, serviceCheck.critical)
        weightedScore += statusScore * serviceCheck.weight
      }
    }

    const score = totalWeight > 0 ? Math.round(weightedScore / totalWeight) : 0
    const overall = getStatusFromScore(score)

    // 按严重程度排序问题
    issues.sort((a, b) => {
      const severityOrder = { critical: 0, high: 1, medium: 2, low: 3 }
      return severityOrder[a.severity] - severityOrder[b.severity]
    })

    return {
      overall,
      score,
      checks,
      issues,
      lastChecked: new Date(),
      uptimeDays: input.uptimeDays || 0
    }
  }

  /**
   * 检查部署状态
   */
  private checkDeployment(deployment?: DeploymentInfo): CheckStatus {
    const checkId = 'deployment'
    const now = new Date()

    if (!deployment || deployment.status === 'unknown') {
      return {
        checkId,
        status: 'attention',
        message: '部署状态未知',
        lastChecked: now
      }
    }

    switch (deployment.status) {
      case 'active':
        return {
          checkId,
          status: 'healthy',
          message: '部署正常运行',
          value: deployment.url,
          lastChecked: now,
          details: { platform: deployment.platform }
        }
      case 'building':
        return {
          checkId,
          status: 'attention',
          message: '正在部署中...',
          lastChecked: now
        }
      case 'pending':
        return {
          checkId,
          status: 'attention',
          message: '等待部署',
          lastChecked: now
        }
      case 'error':
        return {
          checkId,
          status: 'error',
          message: '部署失败',
          lastChecked: now
        }
      default:
        return {
          checkId,
          status: 'attention',
          message: '部署状态异常',
          lastChecked: now
        }
    }
  }

  /**
   * 检查数据库状态
   */
  private checkDatabase(database?: DatabaseInfo): CheckStatus {
    const checkId = 'database'
    const now = new Date()

    if (!database) {
      return {
        checkId,
        status: 'attention',
        message: '数据库状态未知',
        lastChecked: now
      }
    }

    if (!database.connected) {
      return {
        checkId,
        status: 'error',
        message: '数据库连接失败',
        lastChecked: now
      }
    }

    // 检查响应时间
    if (database.responseTime) {
      const rtStatus = getStatusFromResponseTime(database.responseTime)
      if (rtStatus === 'error') {
        return {
          checkId,
          status: 'error',
          message: '数据库响应过慢',
          value: `${database.responseTime}ms`,
          lastChecked: now
        }
      }
      if (rtStatus === 'attention') {
        return {
          checkId,
          status: 'attention',
          message: '数据库响应较慢',
          value: `${database.responseTime}ms`,
          lastChecked: now
        }
      }
    }

    return {
      checkId,
      status: 'healthy',
      message: '数据库连接正常',
      value: database.responseTime ? `${database.responseTime}ms` : undefined,
      lastChecked: now
    }
  }

  /**
   * 检查域名/SSL状态
   */
  private checkDomain(domain?: DomainInfo): CheckStatus {
    const checkId = 'domain'
    const now = new Date()

    if (!domain) {
      return {
        checkId,
        status: 'attention',
        message: '域名未配置',
        lastChecked: now
      }
    }

    // 检查DNS
    if (!domain.dnsConfigured) {
      return {
        checkId,
        status: 'attention',
        message: 'DNS尚未生效',
        lastChecked: now
      }
    }

    // 检查SSL
    switch (domain.sslStatus) {
      case 'expired':
        return {
          checkId,
          status: 'error',
          message: 'SSL证书已过期',
          value: domain.domain,
          lastChecked: now
        }
      case 'expiring':
        return {
          checkId,
          status: 'attention',
          message: 'SSL证书即将过期',
          value: domain.sslExpiresAt?.toLocaleDateString('zh-CN'),
          lastChecked: now
        }
      case 'pending':
        return {
          checkId,
          status: 'attention',
          message: 'SSL证书申请中',
          lastChecked: now
        }
      case 'valid':
        return {
          checkId,
          status: 'healthy',
          message: '域名和SSL正常',
          value: domain.domain,
          lastChecked: now
        }
      default:
        return {
          checkId,
          status: 'attention',
          message: 'SSL状态未知',
          lastChecked: now
        }
    }
  }

  /**
   * 检查API状态
   */
  private checkApi(apiHealth?: ApiHealthInfo): CheckStatus {
    const checkId = 'api'
    const now = new Date()

    if (!apiHealth) {
      return {
        checkId,
        status: 'attention',
        message: 'API状态未知',
        lastChecked: now
      }
    }

    if (!apiHealth.healthy) {
      return {
        checkId,
        status: 'error',
        message: 'API服务异常',
        lastChecked: now
      }
    }

    return {
      checkId,
      status: 'healthy',
      message: 'API服务正常',
      lastChecked: now
    }
  }

  /**
   * 检查响应时间
   */
  private checkResponseTime(responseTime?: number): CheckStatus {
    const checkId = 'response_time'
    const now = new Date()

    if (responseTime === undefined) {
      return {
        checkId,
        status: 'healthy',
        message: '响应时间正常',
        lastChecked: now
      }
    }

    const status = getStatusFromResponseTime(responseTime)
    const messages = {
      healthy: '响应速度快',
      attention: '响应有点慢',
      error: '响应太慢了'
    }

    return {
      checkId,
      status,
      message: messages[status],
      value: `${responseTime}ms`,
      lastChecked: now
    }
  }

  /**
   * 检查错误率
   */
  private checkErrorRate(recentErrors?: number): CheckStatus {
    const checkId = 'error_rate'
    const now = new Date()

    if (recentErrors === undefined || recentErrors === 0) {
      return {
        checkId,
        status: 'healthy',
        message: '无错误发生',
        value: '0',
        lastChecked: now
      }
    }

    // 假设每天1000次请求，计算错误率
    const estimatedRequests = 1000
    const errorRate = (recentErrors / estimatedRequests) * 100
    const status = getStatusFromErrorRate(errorRate)

    const messages = {
      healthy: '错误率正常',
      attention: '有少量错误',
      error: '错误率偏高'
    }

    return {
      checkId,
      status,
      message: messages[status],
      value: `${recentErrors}次/天`,
      lastChecked: now
    }
  }

  /**
   * 创建问题记录
   */
  private createIssue(serviceId: string, check: CheckStatus): StatusIssue {
    const service = SERVICE_CHECKS.find(s => s.id === serviceId)

    const severityMap: Record<SimpleStatus, StatusIssue['severity']> = {
      healthy: 'low',
      attention: 'medium',
      error: service?.critical ? 'critical' : 'high'
    }

    const suggestions: Record<string, string> = {
      deployment: check.status === 'error'
        ? '系统正在自动重试部署，如持续失败请联系客服'
        : '部署正在进行中，请耐心等待',
      database: check.status === 'error'
        ? '数据库连接异常，系统正在自动重连'
        : '数据库响应较慢，建议稍后重试',
      domain: check.status === 'error'
        ? 'SSL证书需要更新，系统正在自动处理'
        : '域名DNS正在生效中，通常需要5-10分钟',
      api: 'API服务异常，系统正在自动恢复',
      response_time: '服务响应较慢，可能是网络波动，建议稍后重试',
      error_rate: '检测到错误，技术团队已收到通知'
    }

    return {
      id: `${serviceId}-${Date.now()}`,
      severity: severityMap[check.status],
      title: check.message,
      description: `${service?.name || serviceId}: ${check.message}`,
      suggestion: suggestions[serviceId] || '请稍后重试或联系客服',
      canAutoFix: ['deployment', 'database', 'domain'].includes(serviceId),
      affectedService: serviceId
    }
  }

  /**
   * 根据状态获取分数
   */
  private getStatusScore(status: SimpleStatus, critical: boolean): number {
    const scores: Record<SimpleStatus, number> = {
      healthy: 100,
      attention: critical ? 60 : 75,
      error: critical ? 0 : 30
    }
    return scores[status]
  }

  /**
   * 快速检查（仅检查关键服务）
   */
  quickCheck(input: ProjectStatusInput): SimpleStatus {
    const criticalStatuses: SimpleStatus[] = []

    // 部署状态
    if (input.deployment) {
      if (input.deployment.status === 'error') {
        criticalStatuses.push('error')
      } else if (input.deployment.status !== 'active') {
        criticalStatuses.push('attention')
      } else {
        criticalStatuses.push('healthy')
      }
    }

    // 数据库状态
    if (input.database) {
      criticalStatuses.push(input.database.connected ? 'healthy' : 'error')
    }

    // API健康
    if (input.apiHealth) {
      criticalStatuses.push(input.apiHealth.healthy ? 'healthy' : 'error')
    }

    return mergeStatuses(criticalStatuses)
  }

  /**
   * 获取状态摘要（用于通知）
   */
  getStatusSummary(status: AggregatedStatus): string {
    const lines = [
      `状态: ${status.overall === 'healthy' ? '✅ 正常' : status.overall === 'attention' ? '⚠️ 需关注' : '❌ 异常'}`,
      `健康度: ${status.score}/100`,
      `连续正常: ${status.uptimeDays}天`
    ]

    if (status.issues.length > 0) {
      lines.push('')
      lines.push(`问题 (${status.issues.length}):`)
      for (const issue of status.issues.slice(0, 3)) {
        lines.push(`- ${issue.title}`)
      }
    }

    return lines.join('\n')
  }
}

// 导出单例实例
export const statusAggregator = StatusAggregatorService.getInstance()
