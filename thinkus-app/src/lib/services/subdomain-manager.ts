/**
 * 子域名管理服务
 * 为用户项目自动分配和管理 xxx.thinkus.app 子域名
 */

/**
 * 子域名记录
 */
export interface SubdomainRecord {
  /** 子域名（不含主域名部分） */
  subdomain: string
  /** 完整域名 */
  fullDomain: string
  /** 关联的项目ID */
  projectId: string
  /** 关联的用户ID */
  userId: string
  /** Vercel 部署 ID */
  vercelDeploymentId?: string
  /** 状态 */
  status: SubdomainStatus
  /** SSL 状态 */
  sslStatus: SSLStatus
  /** 创建时间 */
  createdAt: Date
  /** 最后更新时间 */
  updatedAt: Date
}

export type SubdomainStatus =
  | 'pending'      // 待配置
  | 'configuring'  // 配置中
  | 'active'       // 已激活
  | 'error'        // 配置失败
  | 'suspended'    // 已暂停

export type SSLStatus =
  | 'pending'      // 待签发
  | 'provisioning' // 签发中
  | 'valid'        // 有效
  | 'expiring'     // 即将过期
  | 'expired'      // 已过期
  | 'error'        // 签发失败

/**
 * 子域名配置结果
 */
export interface SubdomainConfigResult {
  success: boolean
  subdomain: string
  fullDomain: string
  url: string
  sslStatus: SSLStatus
  error?: string
  vercelDeploymentId?: string
}

/**
 * 子域名可用性检查结果
 */
export interface AvailabilityResult {
  subdomain: string
  available: boolean
  reason?: string
  suggestions?: string[]
}

/**
 * 子域名管理服务类
 */
export class SubdomainManagerService {
  private static instance: SubdomainManagerService

  /** 主域名 */
  private readonly MAIN_DOMAIN: string

  /** Vercel API Token */
  private readonly VERCEL_TOKEN: string

  /** Vercel Team ID (可选) */
  private readonly VERCEL_TEAM_ID?: string

  /** Cloudflare API Token */
  private readonly CLOUDFLARE_TOKEN?: string

  /** Cloudflare Zone ID */
  private readonly CLOUDFLARE_ZONE_ID?: string

  /** 保留的子域名（不允许用户使用） */
  private readonly RESERVED_SUBDOMAINS = [
    'www', 'app', 'api', 'admin', 'dashboard', 'console',
    'help', 'support', 'docs', 'blog', 'status', 'cdn',
    'mail', 'smtp', 'ftp', 'dev', 'staging', 'test',
    'demo', 'preview', 'beta', 'alpha', 'internal',
    'login', 'auth', 'oauth', 'sso', 'account', 'user',
    'assets', 'static', 'media', 'images', 'files',
    'ws', 'wss', 'socket', 'realtime', 'stream'
  ]

  /** 子域名最小长度 */
  private readonly MIN_LENGTH = 3

  /** 子域名最大长度 */
  private readonly MAX_LENGTH = 32

  private constructor() {
    this.MAIN_DOMAIN = process.env.THINKUS_DOMAIN || 'thinkus.app'
    this.VERCEL_TOKEN = process.env.VERCEL_TOKEN || ''
    this.VERCEL_TEAM_ID = process.env.VERCEL_TEAM_ID
    this.CLOUDFLARE_TOKEN = process.env.CLOUDFLARE_API_TOKEN
    this.CLOUDFLARE_ZONE_ID = process.env.CLOUDFLARE_ZONE_ID
  }

  public static getInstance(): SubdomainManagerService {
    if (!SubdomainManagerService.instance) {
      SubdomainManagerService.instance = new SubdomainManagerService()
    }
    return SubdomainManagerService.instance
  }

  /**
   * 生成子域名
   * @param projectName 项目名称
   * @param userId 用户ID（用于避免冲突）
   */
  generateSubdomain(projectName: string, userId?: string): string {
    // 清理项目名称
    let subdomain = this.sanitizeSubdomain(projectName)

    // 如果太短，添加随机后缀
    if (subdomain.length < this.MIN_LENGTH) {
      subdomain = `${subdomain}-${this.generateShortId()}`
    }

    // 如果太长，截断并添加短后缀
    if (subdomain.length > this.MAX_LENGTH - 5) {
      subdomain = subdomain.substring(0, this.MAX_LENGTH - 5)
      subdomain = `${subdomain}-${this.generateShortId()}`
    }

    // 如果是保留域名，添加后缀
    if (this.RESERVED_SUBDOMAINS.includes(subdomain)) {
      subdomain = `${subdomain}-${this.generateShortId()}`
    }

    return subdomain
  }

  /**
   * 清理子域名（移除非法字符）
   */
  private sanitizeSubdomain(name: string): string {
    return name
      .toLowerCase()
      // 将中文转为拼音首字母（简化处理：直接移除非ASCII字符）
      .replace(/[^\x00-\x7F]/g, '')
      // 替换空格和下划线为连字符
      .replace(/[\s_]+/g, '-')
      // 只保留字母、数字和连字符
      .replace(/[^a-z0-9-]/g, '')
      // 移除连续的连字符
      .replace(/-+/g, '-')
      // 移除首尾的连字符
      .replace(/^-+|-+$/g, '')
  }

  /**
   * 生成短ID
   */
  private generateShortId(): string {
    return Date.now().toString(36).slice(-4) +
           Math.random().toString(36).slice(-2)
  }

  /**
   * 检查子域名可用性
   */
  async checkAvailability(subdomain: string): Promise<AvailabilityResult> {
    const sanitized = this.sanitizeSubdomain(subdomain)

    // 基本验证
    if (sanitized.length < this.MIN_LENGTH) {
      return {
        subdomain: sanitized,
        available: false,
        reason: `子域名至少需要${this.MIN_LENGTH}个字符`,
        suggestions: this.generateSuggestions(sanitized)
      }
    }

    if (sanitized.length > this.MAX_LENGTH) {
      return {
        subdomain: sanitized,
        available: false,
        reason: `子域名不能超过${this.MAX_LENGTH}个字符`,
        suggestions: this.generateSuggestions(sanitized.substring(0, this.MAX_LENGTH - 5))
      }
    }

    // 检查保留域名
    if (this.RESERVED_SUBDOMAINS.includes(sanitized)) {
      return {
        subdomain: sanitized,
        available: false,
        reason: '该子域名已被系统保留',
        suggestions: this.generateSuggestions(sanitized)
      }
    }

    // 检查 Vercel 域名是否已存在
    try {
      const exists = await this.checkVercelDomain(`${sanitized}.${this.MAIN_DOMAIN}`)
      if (exists) {
        return {
          subdomain: sanitized,
          available: false,
          reason: '该子域名已被使用',
          suggestions: this.generateSuggestions(sanitized)
        }
      }
    } catch (error) {
      // 如果检查失败，假设可用（后续配置时会再次检查）
      console.warn('Domain availability check failed:', error)
    }

    return {
      subdomain: sanitized,
      available: true
    }
  }

  /**
   * 检查 Vercel 域名是否存在
   */
  private async checkVercelDomain(domain: string): Promise<boolean> {
    if (!this.VERCEL_TOKEN) return false

    try {
      const params = new URLSearchParams()
      if (this.VERCEL_TEAM_ID) {
        params.append('teamId', this.VERCEL_TEAM_ID)
      }

      const response = await fetch(
        `https://api.vercel.com/v6/domains/${domain}/config?${params}`,
        {
          headers: {
            Authorization: `Bearer ${this.VERCEL_TOKEN}`
          }
        }
      )

      // 404 表示域名不存在（可用）
      return response.status !== 404
    } catch {
      return false
    }
  }

  /**
   * 生成子域名建议
   */
  private generateSuggestions(base: string): string[] {
    const suggestions: string[] = []
    const shortId = this.generateShortId()

    suggestions.push(`${base}-${shortId}`)
    suggestions.push(`my-${base}`)
    suggestions.push(`${base}-app`)
    suggestions.push(`${base}-${Math.floor(Math.random() * 100)}`)

    return suggestions.filter(s => s.length >= this.MIN_LENGTH && s.length <= this.MAX_LENGTH)
  }

  /**
   * 配置子域名到 Vercel
   * @param subdomain 子域名
   * @param projectId Vercel 项目 ID
   */
  async provisionSubdomain(
    subdomain: string,
    vercelProjectId: string
  ): Promise<SubdomainConfigResult> {
    const fullDomain = `${subdomain}.${this.MAIN_DOMAIN}`

    if (!this.VERCEL_TOKEN) {
      return {
        success: false,
        subdomain,
        fullDomain,
        url: `https://${fullDomain}`,
        sslStatus: 'error',
        error: 'Vercel Token 未配置'
      }
    }

    try {
      // 1. 添加域名到 Vercel 项目
      const addResult = await this.addDomainToVercel(fullDomain, vercelProjectId)

      if (!addResult.success) {
        return {
          success: false,
          subdomain,
          fullDomain,
          url: `https://${fullDomain}`,
          sslStatus: 'error',
          error: addResult.error
        }
      }

      // 2. 等待 SSL 证书配置
      const sslStatus = await this.waitForSSL(fullDomain)

      return {
        success: true,
        subdomain,
        fullDomain,
        url: `https://${fullDomain}`,
        sslStatus,
        vercelDeploymentId: vercelProjectId
      }
    } catch (error) {
      return {
        success: false,
        subdomain,
        fullDomain,
        url: `https://${fullDomain}`,
        sslStatus: 'error',
        error: error instanceof Error ? error.message : '配置失败'
      }
    }
  }

  /**
   * 添加域名到 Vercel 项目
   */
  private async addDomainToVercel(
    domain: string,
    projectId: string
  ): Promise<{ success: boolean; error?: string }> {
    try {
      const params = new URLSearchParams()
      if (this.VERCEL_TEAM_ID) {
        params.append('teamId', this.VERCEL_TEAM_ID)
      }

      const response = await fetch(
        `https://api.vercel.com/v10/projects/${projectId}/domains?${params}`,
        {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${this.VERCEL_TOKEN}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({ name: domain })
        }
      )

      if (!response.ok) {
        const error = await response.json()
        return {
          success: false,
          error: error.error?.message || '添加域名失败'
        }
      }

      return { success: true }
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : '添加域名失败'
      }
    }
  }

  /**
   * 等待 SSL 证书配置完成
   */
  private async waitForSSL(domain: string, maxAttempts = 12): Promise<SSLStatus> {
    for (let i = 0; i < maxAttempts; i++) {
      try {
        const params = new URLSearchParams()
        if (this.VERCEL_TEAM_ID) {
          params.append('teamId', this.VERCEL_TEAM_ID)
        }

        const response = await fetch(
          `https://api.vercel.com/v6/domains/${domain}/config?${params}`,
          {
            headers: {
              Authorization: `Bearer ${this.VERCEL_TOKEN}`
            }
          }
        )

        if (response.ok) {
          const data = await response.json()

          // 检查 SSL 状态
          if (data.misconfigured === false) {
            return 'valid'
          }
        }

        // 等待 10 秒后重试
        await new Promise(resolve => setTimeout(resolve, 10000))
      } catch {
        // 继续重试
      }
    }

    return 'provisioning'
  }

  /**
   * 移除子域名
   */
  async removeSubdomain(subdomain: string, vercelProjectId: string): Promise<boolean> {
    if (!this.VERCEL_TOKEN) return false

    const fullDomain = `${subdomain}.${this.MAIN_DOMAIN}`

    try {
      const params = new URLSearchParams()
      if (this.VERCEL_TEAM_ID) {
        params.append('teamId', this.VERCEL_TEAM_ID)
      }

      const response = await fetch(
        `https://api.vercel.com/v10/projects/${vercelProjectId}/domains/${fullDomain}?${params}`,
        {
          method: 'DELETE',
          headers: {
            Authorization: `Bearer ${this.VERCEL_TOKEN}`
          }
        }
      )

      return response.ok || response.status === 404
    } catch {
      return false
    }
  }

  /**
   * 获取主域名
   */
  getMainDomain(): string {
    return this.MAIN_DOMAIN
  }

  /**
   * 获取完整域名
   */
  getFullDomain(subdomain: string): string {
    return `${subdomain}.${this.MAIN_DOMAIN}`
  }

  /**
   * 获取完整 URL
   */
  getFullUrl(subdomain: string): string {
    return `https://${subdomain}.${this.MAIN_DOMAIN}`
  }

  /**
   * 配置 Cloudflare DNS（如果使用 Cloudflare）
   */
  async configureCloudflareDNS(subdomain: string, vercelCname: string): Promise<boolean> {
    if (!this.CLOUDFLARE_TOKEN || !this.CLOUDFLARE_ZONE_ID) {
      return false
    }

    try {
      const response = await fetch(
        `https://api.cloudflare.com/client/v4/zones/${this.CLOUDFLARE_ZONE_ID}/dns_records`,
        {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${this.CLOUDFLARE_TOKEN}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            type: 'CNAME',
            name: subdomain,
            content: vercelCname,
            ttl: 1, // 自动
            proxied: false // 不使用 Cloudflare 代理（使用 Vercel 的 SSL）
          })
        }
      )

      return response.ok
    } catch {
      return false
    }
  }

  /**
   * 验证子域名格式
   */
  validateSubdomain(subdomain: string): { valid: boolean; errors: string[] } {
    const errors: string[] = []
    const sanitized = this.sanitizeSubdomain(subdomain)

    if (sanitized !== subdomain) {
      errors.push('子域名包含非法字符，已自动清理')
    }

    if (sanitized.length < this.MIN_LENGTH) {
      errors.push(`子域名至少需要${this.MIN_LENGTH}个字符`)
    }

    if (sanitized.length > this.MAX_LENGTH) {
      errors.push(`子域名不能超过${this.MAX_LENGTH}个字符`)
    }

    if (this.RESERVED_SUBDOMAINS.includes(sanitized)) {
      errors.push('该子域名已被系统保留')
    }

    if (/^-|-$/.test(subdomain)) {
      errors.push('子域名不能以连字符开头或结尾')
    }

    if (/^\d+$/.test(subdomain)) {
      errors.push('子域名不能只包含数字')
    }

    return {
      valid: errors.length === 0,
      errors
    }
  }
}

// 导出单例实例
export const subdomainManager = SubdomainManagerService.getInstance()
