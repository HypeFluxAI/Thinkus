/**
 * 交付报告生成服务 (小白用户自动化交付 P0)
 *
 * 功能:
 * - 生成专业的PDF交付报告
 * - 电子签收确认
 * - 完整的交付记录存档
 * - 双方留存的法律文档
 *
 * 设计理念:
 * - 报告内容通俗易懂
 * - 关键信息一目了然
 * - 电子签名具有法律效力
 */

// ============================================
// 类型定义
// ============================================

export interface DeliveryReportData {
  // 项目信息
  projectId: string
  projectName: string
  productType: string

  // 客户信息
  clientName: string
  clientEmail: string
  clientPhone?: string

  // 交付信息
  deliveryDate: Date
  productUrl: string
  adminUrl?: string
  statusPageUrl?: string

  // 登录凭证
  credentials?: {
    username: string
    password: string // 会部分脱敏显示
    note?: string
  }

  // 验收结果
  acceptanceResult: {
    totalChecks: number
    passedChecks: number
    skippedChecks: number
    issues: AcceptanceIssue[]
    overallResult: 'accepted' | 'accepted_with_issues' | 'rejected'
    acceptanceRate: number
  }

  // E2E测试结果
  e2eTestResult?: {
    totalTests: number
    passedTests: number
    failedTests: number
    skippedTests: number
    passRate: number
  }

  // 电子签名
  signature?: {
    signedAt: Date
    signedBy: string
    signatureImage?: string // Base64 图片
    ipAddress?: string
    userAgent?: string
  }

  // 附加信息
  notes?: string
  attachments?: Attachment[]

  // 服务信息
  serviceInfo?: {
    supportEmail: string
    supportPhone?: string
    workingHours?: string
    warrantyPeriod?: string
  }
}

export interface AcceptanceIssue {
  id: string
  checkName: string
  issueType: string
  description: string
  severity: 'critical' | 'major' | 'minor'
  status: 'open' | 'fixed' | 'wontfix' | 'deferred'
}

export interface Attachment {
  name: string
  type: string
  size: number
  url?: string
  base64?: string
}

export interface DeliveryReport {
  id: string
  projectId: string
  version: number
  createdAt: Date
  updatedAt: Date
  data: DeliveryReportData
  pdfUrl?: string
  pdfBase64?: string
  status: 'draft' | 'pending_signature' | 'signed' | 'archived'
}

export interface SignatureRequest {
  reportId: string
  signedBy: string
  signatureImage?: string
  agreedToTerms: boolean
  ipAddress?: string
  userAgent?: string
}

// ============================================
// 报告模板配置
// ============================================

const REPORT_STYLES = `
<style>
  * {
    margin: 0;
    padding: 0;
    box-sizing: border-box;
  }

  body {
    font-family: 'PingFang SC', 'Microsoft YaHei', -apple-system, sans-serif;
    color: #333;
    line-height: 1.6;
    background: #fff;
  }

  .report-container {
    max-width: 800px;
    margin: 0 auto;
    padding: 40px;
  }

  /* 页眉 */
  .header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    border-bottom: 3px solid #2563eb;
    padding-bottom: 20px;
    margin-bottom: 30px;
  }

  .logo {
    font-size: 28px;
    font-weight: bold;
    color: #2563eb;
  }

  .report-title {
    text-align: right;
  }

  .report-title h1 {
    font-size: 24px;
    color: #1e40af;
  }

  .report-title .report-no {
    color: #666;
    font-size: 14px;
  }

  /* 项目信息卡片 */
  .info-card {
    background: #f8fafc;
    border-radius: 12px;
    padding: 24px;
    margin-bottom: 24px;
  }

  .info-card h2 {
    font-size: 18px;
    color: #1e40af;
    margin-bottom: 16px;
    padding-bottom: 8px;
    border-bottom: 1px solid #e2e8f0;
  }

  .info-grid {
    display: grid;
    grid-template-columns: repeat(2, 1fr);
    gap: 16px;
  }

  .info-item {
    display: flex;
    flex-direction: column;
  }

  .info-label {
    font-size: 12px;
    color: #64748b;
    margin-bottom: 4px;
  }

  .info-value {
    font-size: 16px;
    font-weight: 500;
  }

  .info-value.highlight {
    color: #2563eb;
  }

  .info-value.success {
    color: #16a34a;
  }

  .info-value.warning {
    color: #ea580c;
  }

  .info-value.error {
    color: #dc2626;
  }

  /* 验收结果 */
  .result-banner {
    padding: 24px;
    border-radius: 12px;
    text-align: center;
    margin-bottom: 24px;
  }

  .result-banner.accepted {
    background: linear-gradient(135deg, #dcfce7, #bbf7d0);
    border: 2px solid #16a34a;
  }

  .result-banner.accepted-with-issues {
    background: linear-gradient(135deg, #fef3c7, #fde68a);
    border: 2px solid #ea580c;
  }

  .result-banner.rejected {
    background: linear-gradient(135deg, #fee2e2, #fecaca);
    border: 2px solid #dc2626;
  }

  .result-icon {
    font-size: 48px;
    margin-bottom: 12px;
  }

  .result-text {
    font-size: 24px;
    font-weight: bold;
    margin-bottom: 8px;
  }

  .result-desc {
    color: #666;
    font-size: 14px;
  }

  /* 统计数据 */
  .stats-row {
    display: flex;
    justify-content: center;
    gap: 32px;
    margin-top: 16px;
  }

  .stat-item {
    text-align: center;
  }

  .stat-number {
    font-size: 32px;
    font-weight: bold;
    color: #1e40af;
  }

  .stat-label {
    font-size: 12px;
    color: #666;
  }

  /* 问题列表 */
  .issues-list {
    margin-top: 16px;
  }

  .issue-item {
    display: flex;
    align-items: flex-start;
    padding: 12px;
    background: #fff;
    border-radius: 8px;
    margin-bottom: 8px;
    border-left: 4px solid #e2e8f0;
  }

  .issue-item.critical {
    border-left-color: #dc2626;
  }

  .issue-item.major {
    border-left-color: #ea580c;
  }

  .issue-item.minor {
    border-left-color: #eab308;
  }

  .issue-badge {
    font-size: 10px;
    padding: 2px 8px;
    border-radius: 4px;
    margin-right: 12px;
    white-space: nowrap;
  }

  .issue-badge.critical {
    background: #fee2e2;
    color: #dc2626;
  }

  .issue-badge.major {
    background: #ffedd5;
    color: #ea580c;
  }

  .issue-badge.minor {
    background: #fef9c3;
    color: #ca8a04;
  }

  .issue-content {
    flex: 1;
  }

  .issue-title {
    font-weight: 500;
    margin-bottom: 4px;
  }

  .issue-desc {
    font-size: 14px;
    color: #666;
  }

  /* 凭证卡片 */
  .credentials-card {
    background: #1e293b;
    color: #fff;
    border-radius: 12px;
    padding: 24px;
    margin-bottom: 24px;
  }

  .credentials-card h2 {
    color: #94a3b8;
    font-size: 14px;
    margin-bottom: 16px;
  }

  .credential-row {
    display: flex;
    align-items: center;
    margin-bottom: 12px;
  }

  .credential-label {
    width: 80px;
    color: #94a3b8;
    font-size: 14px;
  }

  .credential-value {
    font-family: 'Monaco', 'Consolas', monospace;
    font-size: 16px;
    color: #22d3ee;
  }

  .credential-note {
    margin-top: 16px;
    padding-top: 12px;
    border-top: 1px solid #475569;
    font-size: 12px;
    color: #94a3b8;
  }

  /* 签名区域 */
  .signature-section {
    margin-top: 40px;
    padding-top: 24px;
    border-top: 2px dashed #e2e8f0;
  }

  .signature-section h2 {
    font-size: 18px;
    color: #1e40af;
    margin-bottom: 16px;
  }

  .signature-grid {
    display: grid;
    grid-template-columns: repeat(2, 1fr);
    gap: 32px;
  }

  .signature-box {
    border: 1px solid #e2e8f0;
    border-radius: 8px;
    padding: 20px;
  }

  .signature-title {
    font-size: 14px;
    color: #64748b;
    margin-bottom: 12px;
  }

  .signature-line {
    border-bottom: 1px solid #333;
    height: 60px;
    margin-bottom: 8px;
    display: flex;
    align-items: flex-end;
    justify-content: center;
  }

  .signature-image {
    max-height: 50px;
    max-width: 200px;
  }

  .signature-date {
    font-size: 12px;
    color: #666;
    text-align: center;
  }

  /* 页脚 */
  .footer {
    margin-top: 40px;
    padding-top: 20px;
    border-top: 1px solid #e2e8f0;
    text-align: center;
    font-size: 12px;
    color: #94a3b8;
  }

  .footer-links {
    margin-top: 8px;
  }

  .footer-links a {
    color: #2563eb;
    text-decoration: none;
    margin: 0 12px;
  }

  /* 二维码 */
  .qr-section {
    text-align: center;
    margin: 24px 0;
  }

  .qr-code {
    width: 120px;
    height: 120px;
    margin: 0 auto;
  }

  .qr-label {
    font-size: 12px;
    color: #666;
    margin-top: 8px;
  }

  /* 服务信息 */
  .service-info {
    background: #eff6ff;
    border-radius: 8px;
    padding: 16px;
    margin-top: 24px;
  }

  .service-info h3 {
    font-size: 14px;
    color: #1e40af;
    margin-bottom: 8px;
  }

  .service-info p {
    font-size: 14px;
    color: #475569;
    margin-bottom: 4px;
  }

  /* 打印样式 */
  @media print {
    body {
      print-color-adjust: exact;
      -webkit-print-color-adjust: exact;
    }

    .report-container {
      padding: 20px;
    }

    .no-print {
      display: none;
    }
  }
</style>
`

// ============================================
// 辅助函数
// ============================================

function formatDate(date: Date): string {
  return new Intl.DateTimeFormat('zh-CN', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  }).format(date)
}

function formatDateShort(date: Date): string {
  return new Intl.DateTimeFormat('zh-CN', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(date)
}

function maskPassword(password: string): string {
  if (password.length <= 4) return '****'
  return password.substring(0, 2) + '****' + password.substring(password.length - 2)
}

function generateReportId(): string {
  const date = new Date()
  const dateStr = date.toISOString().slice(0, 10).replace(/-/g, '')
  const random = Math.random().toString(36).substring(2, 8).toUpperCase()
  return `DR-${dateStr}-${random}`
}

function getResultInfo(result: string): { icon: string; text: string; desc: string; class: string } {
  switch (result) {
    case 'accepted':
      return {
        icon: '✅',
        text: '验收通过',
        desc: '恭喜！您的产品已全部验收通过，可以正式投入使用。',
        class: 'accepted',
      }
    case 'accepted_with_issues':
      return {
        icon: '⚠️',
        text: '有条件通过',
        desc: '产品基本可用，但存在一些小问题，我们会尽快修复。',
        class: 'accepted-with-issues',
      }
    case 'rejected':
      return {
        icon: '❌',
        text: '需要修改',
        desc: '产品存在一些问题需要修改，请稍后重新验收。',
        class: 'rejected',
      }
    default:
      return {
        icon: '📋',
        text: '待确认',
        desc: '验收结果待确认',
        class: 'accepted',
      }
  }
}

function getSeverityLabel(severity: string): string {
  switch (severity) {
    case 'critical':
      return '严重'
    case 'major':
      return '重要'
    case 'minor':
      return '轻微'
    default:
      return severity
  }
}

// ============================================
// 交付报告生成服务
// ============================================

export class DeliveryReportGeneratorService {
  private reports: Map<string, DeliveryReport> = new Map()

  /**
   * 创建交付报告
   */
  createReport(data: DeliveryReportData): DeliveryReport {
    const report: DeliveryReport = {
      id: generateReportId(),
      projectId: data.projectId,
      version: 1,
      createdAt: new Date(),
      updatedAt: new Date(),
      data,
      status: 'draft',
    }

    this.reports.set(report.id, report)
    return report
  }

  /**
   * 更新报告数据
   */
  updateReport(reportId: string, data: Partial<DeliveryReportData>): DeliveryReport | null {
    const report = this.reports.get(reportId)
    if (!report) return null

    report.data = { ...report.data, ...data }
    report.version += 1
    report.updatedAt = new Date()

    return report
  }

  /**
   * 电子签名
   */
  signReport(request: SignatureRequest): DeliveryReport | null {
    const report = this.reports.get(request.reportId)
    if (!report) return null

    if (!request.agreedToTerms) {
      throw new Error('必须同意条款才能签署')
    }

    report.data.signature = {
      signedAt: new Date(),
      signedBy: request.signedBy,
      signatureImage: request.signatureImage,
      ipAddress: request.ipAddress,
      userAgent: request.userAgent,
    }
    report.status = 'signed'
    report.updatedAt = new Date()

    return report
  }

  /**
   * 生成HTML报告
   */
  generateReportHtml(reportId: string): string {
    const report = this.reports.get(reportId)
    if (!report) throw new Error('报告不存在')

    const { data } = report
    const resultInfo = getResultInfo(data.acceptanceResult.overallResult)

    return `
<!DOCTYPE html>
<html lang="zh-CN">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>交付报告 - ${data.projectName}</title>
  ${REPORT_STYLES}
</head>
<body>
  <div class="report-container">
    <!-- 页眉 -->
    <div class="header">
      <div class="logo">Thinkus</div>
      <div class="report-title">
        <h1>产品交付报告</h1>
        <div class="report-no">报告编号: ${report.id}</div>
      </div>
    </div>

    <!-- 验收结果 -->
    <div class="result-banner ${resultInfo.class}">
      <div class="result-icon">${resultInfo.icon}</div>
      <div class="result-text">${resultInfo.text}</div>
      <div class="result-desc">${resultInfo.desc}</div>
      <div class="stats-row">
        <div class="stat-item">
          <div class="stat-number">${data.acceptanceResult.passedChecks}</div>
          <div class="stat-label">检查通过</div>
        </div>
        <div class="stat-item">
          <div class="stat-number">${data.acceptanceResult.totalChecks}</div>
          <div class="stat-label">总检查项</div>
        </div>
        <div class="stat-item">
          <div class="stat-number">${Math.round(data.acceptanceResult.acceptanceRate)}%</div>
          <div class="stat-label">通过率</div>
        </div>
      </div>
    </div>

    <!-- 项目信息 -->
    <div class="info-card">
      <h2>📦 项目信息</h2>
      <div class="info-grid">
        <div class="info-item">
          <span class="info-label">项目名称</span>
          <span class="info-value">${data.projectName}</span>
        </div>
        <div class="info-item">
          <span class="info-label">产品类型</span>
          <span class="info-value">${data.productType}</span>
        </div>
        <div class="info-item">
          <span class="info-label">交付日期</span>
          <span class="info-value">${formatDate(data.deliveryDate)}</span>
        </div>
        <div class="info-item">
          <span class="info-label">报告版本</span>
          <span class="info-value">v${report.version}</span>
        </div>
      </div>
    </div>

    <!-- 客户信息 -->
    <div class="info-card">
      <h2>👤 客户信息</h2>
      <div class="info-grid">
        <div class="info-item">
          <span class="info-label">客户姓名</span>
          <span class="info-value">${data.clientName}</span>
        </div>
        <div class="info-item">
          <span class="info-label">联系邮箱</span>
          <span class="info-value">${data.clientEmail}</span>
        </div>
        ${
          data.clientPhone
            ? `
        <div class="info-item">
          <span class="info-label">联系电话</span>
          <span class="info-value">${data.clientPhone}</span>
        </div>
        `
            : ''
        }
      </div>
    </div>

    <!-- 产品地址 -->
    <div class="info-card">
      <h2>🌐 产品访问地址</h2>
      <div class="info-grid">
        <div class="info-item">
          <span class="info-label">产品地址</span>
          <span class="info-value highlight">${data.productUrl}</span>
        </div>
        ${
          data.adminUrl
            ? `
        <div class="info-item">
          <span class="info-label">管理后台</span>
          <span class="info-value highlight">${data.adminUrl}</span>
        </div>
        `
            : ''
        }
        ${
          data.statusPageUrl
            ? `
        <div class="info-item">
          <span class="info-label">状态页面</span>
          <span class="info-value">${data.statusPageUrl}</span>
        </div>
        `
            : ''
        }
      </div>
    </div>

    ${
      data.credentials
        ? `
    <!-- 登录凭证 -->
    <div class="credentials-card">
      <h2>🔐 管理员登录凭证</h2>
      <div class="credential-row">
        <span class="credential-label">用户名</span>
        <span class="credential-value">${data.credentials.username}</span>
      </div>
      <div class="credential-row">
        <span class="credential-label">密码</span>
        <span class="credential-value">${maskPassword(data.credentials.password)}</span>
      </div>
      ${
        data.credentials.note
          ? `
      <div class="credential-note">
        ⚠️ ${data.credentials.note}
      </div>
      `
          : `
      <div class="credential-note">
        ⚠️ 首次登录后请立即修改密码。完整密码已通过邮件单独发送。
      </div>
      `
      }
    </div>
    `
        : ''
    }

    ${
      data.e2eTestResult
        ? `
    <!-- E2E测试结果 -->
    <div class="info-card">
      <h2>🧪 自动化测试结果</h2>
      <div class="info-grid">
        <div class="info-item">
          <span class="info-label">测试通过</span>
          <span class="info-value success">${data.e2eTestResult.passedTests}</span>
        </div>
        <div class="info-item">
          <span class="info-label">测试失败</span>
          <span class="info-value ${data.e2eTestResult.failedTests > 0 ? 'error' : ''}">${data.e2eTestResult.failedTests}</span>
        </div>
        <div class="info-item">
          <span class="info-label">总测试数</span>
          <span class="info-value">${data.e2eTestResult.totalTests}</span>
        </div>
        <div class="info-item">
          <span class="info-label">通过率</span>
          <span class="info-value ${data.e2eTestResult.passRate >= 80 ? 'success' : 'warning'}">${Math.round(data.e2eTestResult.passRate)}%</span>
        </div>
      </div>
    </div>
    `
        : ''
    }

    ${
      data.acceptanceResult.issues.length > 0
        ? `
    <!-- 问题列表 -->
    <div class="info-card">
      <h2>📝 问题记录 (${data.acceptanceResult.issues.length}项)</h2>
      <div class="issues-list">
        ${data.acceptanceResult.issues
          .map(
            (issue) => `
        <div class="issue-item ${issue.severity}">
          <span class="issue-badge ${issue.severity}">${getSeverityLabel(issue.severity)}</span>
          <div class="issue-content">
            <div class="issue-title">${issue.checkName}</div>
            <div class="issue-desc">${issue.description}</div>
          </div>
        </div>
        `
          )
          .join('')}
      </div>
    </div>
    `
        : ''
    }

    ${
      data.notes
        ? `
    <!-- 备注 -->
    <div class="info-card">
      <h2>💬 备注说明</h2>
      <p style="white-space: pre-wrap;">${data.notes}</p>
    </div>
    `
        : ''
    }

    <!-- 签名区域 -->
    <div class="signature-section">
      <h2>✍️ 签收确认</h2>
      <div class="signature-grid">
        <div class="signature-box">
          <div class="signature-title">服务方签章</div>
          <div class="signature-line">
            <span style="font-weight: bold; color: #2563eb;">Thinkus 交付团队</span>
          </div>
          <div class="signature-date">日期: ${formatDateShort(report.createdAt)}</div>
        </div>
        <div class="signature-box">
          <div class="signature-title">客户签收</div>
          <div class="signature-line">
            ${
              data.signature?.signatureImage
                ? `<img src="${data.signature.signatureImage}" class="signature-image" alt="客户签名" />`
                : data.signature?.signedBy
                  ? `<span style="font-weight: bold;">${data.signature.signedBy}</span>`
                  : '<span style="color: #999;">待签收</span>'
            }
          </div>
          <div class="signature-date">
            日期: ${data.signature?.signedAt ? formatDateShort(data.signature.signedAt) : '____年__月__日'}
          </div>
        </div>
      </div>
    </div>

    ${
      data.serviceInfo
        ? `
    <!-- 服务信息 -->
    <div class="service-info">
      <h3>📞 售后服务</h3>
      <p>客服邮箱: ${data.serviceInfo.supportEmail}</p>
      ${data.serviceInfo.supportPhone ? `<p>客服电话: ${data.serviceInfo.supportPhone}</p>` : ''}
      ${data.serviceInfo.workingHours ? `<p>工作时间: ${data.serviceInfo.workingHours}</p>` : ''}
      ${data.serviceInfo.warrantyPeriod ? `<p>保修期限: ${data.serviceInfo.warrantyPeriod}</p>` : ''}
    </div>
    `
        : ''
    }

    <!-- 页脚 -->
    <div class="footer">
      <p>本报告由 Thinkus 平台自动生成</p>
      <p>生成时间: ${formatDate(new Date())}</p>
      <div class="footer-links">
        <a href="https://thinkus.app">官方网站</a>
        <a href="mailto:support@thinkus.app">联系我们</a>
      </div>
    </div>
  </div>
</body>
</html>
`
  }

  /**
   * 生成简化版签收确认页面 (给小白用户使用)
   */
  generateSimpleSignaturePage(reportId: string): string {
    const report = this.reports.get(reportId)
    if (!report) throw new Error('报告不存在')

    const { data } = report
    const resultInfo = getResultInfo(data.acceptanceResult.overallResult)

    return `
<!DOCTYPE html>
<html lang="zh-CN">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>确认签收 - ${data.projectName}</title>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body {
      font-family: 'PingFang SC', 'Microsoft YaHei', sans-serif;
      background: #f5f5f5;
      min-height: 100vh;
      padding: 20px;
    }
    .container {
      max-width: 500px;
      margin: 0 auto;
      background: #fff;
      border-radius: 16px;
      padding: 32px;
      box-shadow: 0 4px 24px rgba(0,0,0,0.1);
    }
    .header {
      text-align: center;
      margin-bottom: 32px;
    }
    .logo {
      font-size: 24px;
      font-weight: bold;
      color: #2563eb;
    }
    h1 {
      font-size: 20px;
      color: #333;
      margin-top: 8px;
    }
    .result-box {
      text-align: center;
      padding: 24px;
      border-radius: 12px;
      margin-bottom: 24px;
    }
    .result-box.success { background: #dcfce7; }
    .result-box.warning { background: #fef3c7; }
    .result-icon { font-size: 48px; }
    .result-text { font-size: 18px; font-weight: bold; margin-top: 8px; }
    .result-rate { font-size: 14px; color: #666; margin-top: 4px; }
    .info-row {
      display: flex;
      justify-content: space-between;
      padding: 12px 0;
      border-bottom: 1px solid #eee;
    }
    .info-label { color: #666; }
    .info-value { font-weight: 500; }
    .terms {
      margin: 24px 0;
      padding: 16px;
      background: #f8fafc;
      border-radius: 8px;
      font-size: 14px;
      color: #666;
    }
    .checkbox-row {
      display: flex;
      align-items: center;
      margin: 16px 0;
    }
    .checkbox-row input {
      width: 20px;
      height: 20px;
      margin-right: 12px;
    }
    .checkbox-row label {
      font-size: 14px;
      cursor: pointer;
    }
    .sign-area {
      margin: 24px 0;
    }
    .sign-area label {
      display: block;
      font-size: 14px;
      color: #666;
      margin-bottom: 8px;
    }
    .sign-canvas {
      width: 100%;
      height: 120px;
      border: 2px dashed #ddd;
      border-radius: 8px;
      background: #fafafa;
      display: flex;
      align-items: center;
      justify-content: center;
      color: #999;
      cursor: pointer;
    }
    .sign-canvas.signed {
      border-style: solid;
      border-color: #2563eb;
    }
    .btn {
      width: 100%;
      padding: 16px;
      border: none;
      border-radius: 8px;
      font-size: 16px;
      font-weight: bold;
      cursor: pointer;
      margin-top: 16px;
    }
    .btn-primary {
      background: #2563eb;
      color: #fff;
    }
    .btn-primary:disabled {
      background: #94a3b8;
      cursor: not-allowed;
    }
    .btn-secondary {
      background: #f1f5f9;
      color: #333;
    }
    .footer {
      text-align: center;
      margin-top: 24px;
      font-size: 12px;
      color: #999;
    }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <div class="logo">Thinkus</div>
      <h1>产品交付确认</h1>
    </div>

    <div class="result-box ${data.acceptanceResult.overallResult === 'accepted' ? 'success' : 'warning'}">
      <div class="result-icon">${resultInfo.icon}</div>
      <div class="result-text">${resultInfo.text}</div>
      <div class="result-rate">验收通过率: ${Math.round(data.acceptanceResult.acceptanceRate)}%</div>
    </div>

    <div class="info-row">
      <span class="info-label">项目名称</span>
      <span class="info-value">${data.projectName}</span>
    </div>
    <div class="info-row">
      <span class="info-label">产品地址</span>
      <span class="info-value" style="color: #2563eb;">${data.productUrl}</span>
    </div>
    <div class="info-row">
      <span class="info-label">交付日期</span>
      <span class="info-value">${formatDateShort(data.deliveryDate)}</span>
    </div>

    <div class="terms">
      <strong>签收说明:</strong><br/>
      1. 点击"确认签收"表示您已检查并接受交付的产品<br/>
      2. 如有问题，您可随时通过客服渠道联系我们<br/>
      3. 签收后我们将提供${data.serviceInfo?.warrantyPeriod || '30天'}免费售后支持
    </div>

    <div class="checkbox-row">
      <input type="checkbox" id="agree" />
      <label for="agree">我已检查产品并同意签收</label>
    </div>

    <div class="sign-area">
      <label>您的签名 (可选)</label>
      <div class="sign-canvas" id="signCanvas">
        点击此处签名
      </div>
    </div>

    <button class="btn btn-primary" id="confirmBtn" disabled>确认签收</button>
    <button class="btn btn-secondary" onclick="window.print()">下载完整报告</button>

    <div class="footer">
      <p>报告编号: ${report.id}</p>
      <p>如有疑问请联系: ${data.serviceInfo?.supportEmail || 'support@thinkus.app'}</p>
    </div>
  </div>

  <script>
    const checkbox = document.getElementById('agree');
    const confirmBtn = document.getElementById('confirmBtn');
    const signCanvas = document.getElementById('signCanvas');
    let signed = false;

    checkbox.addEventListener('change', () => {
      confirmBtn.disabled = !checkbox.checked;
    });

    signCanvas.addEventListener('click', () => {
      const name = prompt('请输入您的姓名作为电子签名:');
      if (name) {
        signCanvas.textContent = name;
        signCanvas.classList.add('signed');
        signed = true;
      }
    });

    confirmBtn.addEventListener('click', async () => {
      if (!checkbox.checked) {
        alert('请先勾选同意签收');
        return;
      }

      const signedBy = signed ? signCanvas.textContent : '${data.clientName}';

      // 这里发送签收确认到后端
      // await fetch('/api/delivery/sign', { ... });

      alert('签收成功！感谢您的信任，如有问题随时联系我们。');
      window.location.href = '${data.productUrl}';
    });
  </script>
</body>
</html>
`
  }

  /**
   * 获取报告
   */
  getReport(reportId: string): DeliveryReport | null {
    return this.reports.get(reportId) || null
  }

  /**
   * 获取项目的所有报告
   */
  getProjectReports(projectId: string): DeliveryReport[] {
    return Array.from(this.reports.values()).filter((r) => r.projectId === projectId)
  }

  /**
   * 归档报告
   */
  archiveReport(reportId: string): boolean {
    const report = this.reports.get(reportId)
    if (!report) return false

    report.status = 'archived'
    report.updatedAt = new Date()
    return true
  }

  /**
   * 生成报告摘要
   */
  generateReportSummary(reportId: string): string {
    const report = this.reports.get(reportId)
    if (!report) return ''

    const { data } = report
    const resultInfo = getResultInfo(data.acceptanceResult.overallResult)

    return `
📋 交付报告摘要
================

报告编号: ${report.id}
生成时间: ${formatDate(report.createdAt)}

项目: ${data.projectName}
客户: ${data.clientName}
交付日期: ${formatDateShort(data.deliveryDate)}

验收结果: ${resultInfo.icon} ${resultInfo.text}
- 总检查项: ${data.acceptanceResult.totalChecks}
- 通过项数: ${data.acceptanceResult.passedChecks}
- 跳过项数: ${data.acceptanceResult.skippedChecks}
- 问题数量: ${data.acceptanceResult.issues.length}
- 通过率: ${Math.round(data.acceptanceResult.acceptanceRate)}%

产品地址: ${data.productUrl}
${data.adminUrl ? `管理后台: ${data.adminUrl}` : ''}

签收状态: ${report.status === 'signed' ? '✅ 已签收' : '⏳ 待签收'}
${data.signature ? `签收人: ${data.signature.signedBy}\n签收时间: ${formatDate(data.signature.signedAt)}` : ''}
`
  }
}

// ============================================
// 导出单例
// ============================================

export const deliveryReportGenerator = new DeliveryReportGeneratorService()

export default deliveryReportGenerator
