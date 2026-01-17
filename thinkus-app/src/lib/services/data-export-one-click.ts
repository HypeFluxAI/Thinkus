/**
 * 一键导出数据服务
 *
 * 功能：
 * - 用户可以轻松导出自己的所有数据
 * - 支持多种格式（Excel/CSV/JSON）
 * - 数据打包下载
 */

// ============================================
// 类型定义
// ============================================

export type ExportFormat = 'excel' | 'csv' | 'json' | 'pdf' | 'zip'

export type ExportDataType =
  | 'all'             // 所有数据
  | 'products'        // 商品数据
  | 'orders'          // 订单数据
  | 'customers'       // 客户数据
  | 'content'         // 内容数据
  | 'analytics'       // 分析数据
  | 'settings'        // 设置数据
  | 'media'           // 媒体文件

export interface ExportRequest {
  id: string
  projectId: string
  userId: string
  dataTypes: ExportDataType[]
  format: ExportFormat
  dateRange?: {
    start: Date
    end: Date
  }
  status: 'pending' | 'processing' | 'completed' | 'failed'
  progress: number
  downloadUrl?: string
  expiresAt?: Date
  fileSize?: number
  createdAt: Date
  completedAt?: Date
  errorMessage?: string
}

export interface ExportPreview {
  dataType: ExportDataType
  label: string
  icon: string
  recordCount: number
  estimatedSize: string
  lastUpdated: Date
}

// ============================================
// 数据类型配置
// ============================================

const DATA_TYPE_CONFIG: Record<ExportDataType, {
  label: string
  icon: string
  description: string
  supportedFormats: ExportFormat[]
}> = {
  all: {
    label: '所有数据',
    icon: '📦',
    description: '导出您的全部数据',
    supportedFormats: ['zip']
  },
  products: {
    label: '商品数据',
    icon: '🛍️',
    description: '商品信息、价格、库存',
    supportedFormats: ['excel', 'csv', 'json']
  },
  orders: {
    label: '订单数据',
    icon: '📋',
    description: '订单记录、支付信息',
    supportedFormats: ['excel', 'csv', 'json']
  },
  customers: {
    label: '客户数据',
    icon: '👥',
    description: '客户信息、联系方式',
    supportedFormats: ['excel', 'csv', 'json']
  },
  content: {
    label: '内容数据',
    icon: '📝',
    description: '文章、页面、评论',
    supportedFormats: ['excel', 'csv', 'json']
  },
  analytics: {
    label: '分析数据',
    icon: '📊',
    description: '访问量、转化率、销售额',
    supportedFormats: ['excel', 'csv', 'pdf']
  },
  settings: {
    label: '设置数据',
    icon: '⚙️',
    description: '系统配置、偏好设置',
    supportedFormats: ['json']
  },
  media: {
    label: '媒体文件',
    icon: '🖼️',
    description: '图片、视频、文档',
    supportedFormats: ['zip']
  }
}

const FORMAT_CONFIG: Record<ExportFormat, {
  label: string
  icon: string
  extension: string
  mimeType: string
}> = {
  excel: {
    label: 'Excel',
    icon: '📗',
    extension: '.xlsx',
    mimeType: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
  },
  csv: {
    label: 'CSV',
    icon: '📄',
    extension: '.csv',
    mimeType: 'text/csv'
  },
  json: {
    label: 'JSON',
    icon: '📋',
    extension: '.json',
    mimeType: 'application/json'
  },
  pdf: {
    label: 'PDF',
    icon: '📕',
    extension: '.pdf',
    mimeType: 'application/pdf'
  },
  zip: {
    label: '压缩包',
    icon: '📦',
    extension: '.zip',
    mimeType: 'application/zip'
  }
}

// ============================================
// 服务实现
// ============================================

export class DataExportOneClickService {

  getDataTypeConfig(type: ExportDataType) {
    return DATA_TYPE_CONFIG[type]
  }

  getFormatConfig(format: ExportFormat) {
    return FORMAT_CONFIG[format]
  }

  // 获取可导出数据预览
  async getExportPreview(projectId: string): Promise<ExportPreview[]> {
    // TODO: 从数据库获取真实数据统计
    return [
      {
        dataType: 'products',
        label: '商品数据',
        icon: '🛍️',
        recordCount: 156,
        estimatedSize: '2.3 MB',
        lastUpdated: new Date()
      },
      {
        dataType: 'orders',
        label: '订单数据',
        icon: '📋',
        recordCount: 1234,
        estimatedSize: '8.7 MB',
        lastUpdated: new Date()
      },
      {
        dataType: 'customers',
        label: '客户数据',
        icon: '👥',
        recordCount: 567,
        estimatedSize: '1.2 MB',
        lastUpdated: new Date()
      },
      {
        dataType: 'content',
        label: '内容数据',
        icon: '📝',
        recordCount: 89,
        estimatedSize: '0.5 MB',
        lastUpdated: new Date()
      },
      {
        dataType: 'media',
        label: '媒体文件',
        icon: '🖼️',
        recordCount: 234,
        estimatedSize: '156 MB',
        lastUpdated: new Date()
      }
    ]
  }

  // 创建导出请求
  async createExportRequest(params: {
    projectId: string
    userId: string
    dataTypes: ExportDataType[]
    format: ExportFormat
    dateRange?: { start: Date; end: Date }
  }): Promise<ExportRequest> {
    const requestId = `export_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`

    const request: ExportRequest = {
      id: requestId,
      ...params,
      status: 'pending',
      progress: 0,
      createdAt: new Date()
    }

    // TODO: 存储到数据库并启动后台导出任务
    // 模拟异步处理
    this.processExport(request)

    return request
  }

  // 处理导出（后台任务）
  private async processExport(request: ExportRequest): Promise<void> {
    // 模拟处理过程
    request.status = 'processing'

    // 模拟进度更新
    for (let i = 0; i <= 100; i += 10) {
      request.progress = i
      await new Promise(resolve => setTimeout(resolve, 500))
    }

    // 模拟完成
    request.status = 'completed'
    request.progress = 100
    request.downloadUrl = `/api/exports/${request.id}/download`
    request.expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000) // 7天后过期
    request.fileSize = 1024 * 1024 * 5 // 5MB
    request.completedAt = new Date()
  }

  // 获取导出状态
  async getExportStatus(requestId: string): Promise<ExportRequest | null> {
    // TODO: 从数据库获取
    return null
  }

  // 一键导出所有数据
  async oneClickExportAll(projectId: string, userId: string): Promise<ExportRequest> {
    return this.createExportRequest({
      projectId,
      userId,
      dataTypes: ['all'],
      format: 'zip'
    })
  }

  // 快速导出单一类型
  async quickExport(
    projectId: string,
    userId: string,
    dataType: ExportDataType,
    format?: ExportFormat
  ): Promise<ExportRequest> {
    const config = DATA_TYPE_CONFIG[dataType]
    const defaultFormat = format || config.supportedFormats[0]

    return this.createExportRequest({
      projectId,
      userId,
      dataTypes: [dataType],
      format: defaultFormat
    })
  }

  // 格式化文件大小
  formatFileSize(bytes: number): string {
    if (bytes < 1024) return `${bytes} B`
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
    if (bytes < 1024 * 1024 * 1024) return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
    return `${(bytes / (1024 * 1024 * 1024)).toFixed(1)} GB`
  }

  // 生成导出页面HTML
  generateExportPageHtml(previews: ExportPreview[]): string {
    return `<!DOCTYPE html>
<html lang="zh-CN">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>导出数据</title>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
      background: #F9FAFB;
      padding: 40px 20px;
    }

    .container { max-width: 800px; margin: 0 auto; }

    .header {
      margin-bottom: 32px;
    }
    .title {
      font-size: 28px;
      font-weight: 700;
      color: #1F2937;
      margin-bottom: 8px;
    }
    .subtitle {
      color: #6B7280;
    }

    .quick-export {
      background: linear-gradient(135deg, #6366F1 0%, #8B5CF6 100%);
      border-radius: 16px;
      padding: 32px;
      color: white;
      margin-bottom: 32px;
    }
    .quick-export-title {
      font-size: 20px;
      font-weight: 600;
      margin-bottom: 8px;
    }
    .quick-export-desc {
      opacity: 0.9;
      margin-bottom: 20px;
    }
    .quick-export-btn {
      background: white;
      color: #6366F1;
      border: none;
      padding: 14px 32px;
      border-radius: 10px;
      font-size: 16px;
      font-weight: 600;
      cursor: pointer;
      transition: transform 0.2s;
    }
    .quick-export-btn:hover { transform: scale(1.02); }

    .section {
      background: white;
      border-radius: 16px;
      padding: 24px;
      margin-bottom: 24px;
    }
    .section-title {
      font-size: 18px;
      font-weight: 600;
      color: #1F2937;
      margin-bottom: 20px;
    }

    .data-types {
      display: grid;
      gap: 16px;
    }
    .data-type {
      display: flex;
      align-items: center;
      padding: 16px;
      border: 2px solid #E5E7EB;
      border-radius: 12px;
      cursor: pointer;
      transition: all 0.2s;
    }
    .data-type:hover { border-color: #6366F1; }
    .data-type.selected {
      border-color: #6366F1;
      background: #EEF2FF;
    }
    .data-type-icon {
      font-size: 32px;
      margin-right: 16px;
    }
    .data-type-info { flex: 1; }
    .data-type-label {
      font-weight: 600;
      color: #374151;
      margin-bottom: 4px;
    }
    .data-type-stats {
      font-size: 13px;
      color: #9CA3AF;
    }
    .data-type-checkbox {
      width: 24px;
      height: 24px;
      border: 2px solid #D1D5DB;
      border-radius: 6px;
      display: flex;
      align-items: center;
      justify-content: center;
    }
    .data-type.selected .data-type-checkbox {
      background: #6366F1;
      border-color: #6366F1;
      color: white;
    }

    .formats {
      display: flex;
      gap: 12px;
      margin-bottom: 24px;
    }
    .format {
      flex: 1;
      padding: 16px;
      border: 2px solid #E5E7EB;
      border-radius: 12px;
      text-align: center;
      cursor: pointer;
      transition: all 0.2s;
    }
    .format:hover { border-color: #6366F1; }
    .format.selected {
      border-color: #6366F1;
      background: #EEF2FF;
    }
    .format-icon { font-size: 24px; margin-bottom: 8px; }
    .format-label { font-weight: 500; color: #374151; }

    .export-btn {
      width: 100%;
      padding: 16px;
      background: #6366F1;
      color: white;
      border: none;
      border-radius: 12px;
      font-size: 16px;
      font-weight: 600;
      cursor: pointer;
      transition: all 0.2s;
    }
    .export-btn:hover { background: #4F46E5; }
    .export-btn:disabled {
      background: #D1D5DB;
      cursor: not-allowed;
    }

    .notice {
      background: #FEF3C7;
      border-radius: 12px;
      padding: 16px;
      display: flex;
      align-items: flex-start;
      gap: 12px;
    }
    .notice-icon { font-size: 20px; }
    .notice-text {
      font-size: 14px;
      color: #92400E;
      line-height: 1.5;
    }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1 class="title">📥 导出数据</h1>
      <p class="subtitle">您的数据，完全属于您</p>
    </div>

    <div class="quick-export">
      <div class="quick-export-title">一键导出全部数据</div>
      <div class="quick-export-desc">将所有数据打包成一个压缩文件下载</div>
      <button class="quick-export-btn" onclick="exportAll()">
        📦 导出全部数据
      </button>
    </div>

    <div class="section">
      <h2 class="section-title">选择要导出的数据</h2>
      <div class="data-types">
        ${previews.map(preview => `
          <div class="data-type" onclick="this.classList.toggle('selected')">
            <div class="data-type-icon">${preview.icon}</div>
            <div class="data-type-info">
              <div class="data-type-label">${preview.label}</div>
              <div class="data-type-stats">
                ${preview.recordCount} 条记录 · ${preview.estimatedSize}
              </div>
            </div>
            <div class="data-type-checkbox">✓</div>
          </div>
        `).join('')}
      </div>
    </div>

    <div class="section">
      <h2 class="section-title">选择导出格式</h2>
      <div class="formats">
        ${Object.entries(FORMAT_CONFIG).filter(([key]) => key !== 'zip').map(([key, config]) => `
          <div class="format ${key === 'excel' ? 'selected' : ''}" onclick="selectFormat('${key}')">
            <div class="format-icon">${config.icon}</div>
            <div class="format-label">${config.label}</div>
          </div>
        `).join('')}
      </div>

      <button class="export-btn" onclick="startExport()">
        开始导出
      </button>
    </div>

    <div class="notice">
      <div class="notice-icon">💡</div>
      <div class="notice-text">
        导出的文件将保存7天，请及时下载。<br>
        大量数据导出可能需要几分钟，请耐心等待。
      </div>
    </div>
  </div>

  <script>
    function exportAll() {
      alert('开始导出全部数据，请稍候...');
    }

    function selectFormat(format) {
      document.querySelectorAll('.format').forEach(el => el.classList.remove('selected'));
      event.target.closest('.format').classList.add('selected');
    }

    function startExport() {
      const selected = document.querySelectorAll('.data-type.selected');
      if (selected.length === 0) {
        alert('请选择要导出的数据类型');
        return;
      }
      alert('开始导出选中的数据，请稍候...');
    }
  </script>
</body>
</html>`
  }

  // 生成导出进度页面HTML
  generateProgressPageHtml(request: ExportRequest): string {
    const formatConfig = FORMAT_CONFIG[request.format]

    return `<!DOCTYPE html>
<html lang="zh-CN">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>导出进度</title>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
      background: #F9FAFB;
      min-height: 100vh;
      display: flex;
      align-items: center;
      justify-content: center;
      padding: 20px;
    }

    .card {
      background: white;
      border-radius: 20px;
      padding: 48px;
      max-width: 480px;
      width: 100%;
      text-align: center;
      box-shadow: 0 4px 20px rgba(0,0,0,0.1);
    }

    .icon { font-size: 64px; margin-bottom: 24px; }

    .title {
      font-size: 24px;
      font-weight: 700;
      color: #1F2937;
      margin-bottom: 8px;
    }
    .subtitle {
      color: #6B7280;
      margin-bottom: 32px;
    }

    .progress-bar {
      background: #E5E7EB;
      height: 8px;
      border-radius: 4px;
      margin-bottom: 16px;
      overflow: hidden;
    }
    .progress-fill {
      background: linear-gradient(90deg, #6366F1, #8B5CF6);
      height: 100%;
      border-radius: 4px;
      transition: width 0.3s;
    }
    .progress-text {
      font-size: 14px;
      color: #6B7280;
      margin-bottom: 32px;
    }

    .download-btn {
      display: inline-block;
      background: #6366F1;
      color: white;
      border: none;
      padding: 14px 48px;
      border-radius: 10px;
      font-size: 16px;
      font-weight: 600;
      cursor: pointer;
      text-decoration: none;
    }
    .download-btn:hover { background: #4F46E5; }
    .download-btn:disabled {
      background: #D1D5DB;
      cursor: not-allowed;
    }

    .file-info {
      margin-top: 24px;
      padding-top: 24px;
      border-top: 1px solid #E5E7EB;
      font-size: 14px;
      color: #6B7280;
    }
  </style>
</head>
<body>
  <div class="card">
    ${request.status === 'completed' ? `
      <div class="icon">✅</div>
      <h1 class="title">导出完成！</h1>
      <p class="subtitle">您的数据已准备好下载</p>

      <a href="${request.downloadUrl}" class="download-btn">
        ${formatConfig.icon} 下载文件
      </a>

      <div class="file-info">
        文件大小: ${request.fileSize ? this.formatFileSize(request.fileSize) : '未知'}<br>
        有效期至: ${request.expiresAt?.toLocaleDateString()}
      </div>
    ` : request.status === 'failed' ? `
      <div class="icon">❌</div>
      <h1 class="title">导出失败</h1>
      <p class="subtitle">${request.errorMessage || '请稍后重试'}</p>

      <button class="download-btn" onclick="location.reload()">
        重新导出
      </button>
    ` : `
      <div class="icon">⏳</div>
      <h1 class="title">正在导出...</h1>
      <p class="subtitle">请稍候，正在准备您的数据</p>

      <div class="progress-bar">
        <div class="progress-fill" style="width: ${request.progress}%"></div>
      </div>
      <div class="progress-text">${request.progress}% 完成</div>

      <button class="download-btn" disabled>
        请稍候...
      </button>
    `}
  </div>

  ${request.status === 'processing' ? `
    <script>
      setTimeout(() => location.reload(), 2000);
    </script>
  ` : ''}
</body>
</html>`
  }
}

export const dataExportOneClick = new DataExportOneClickService()
