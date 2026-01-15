/**
 * 错误人话翻译系统
 * 将技术错误信息翻译为小白用户能理解的人话
 */

export type ErrorSeverity = 'info' | 'warning' | 'error' | 'fatal'

export interface FriendlyError {
  /** 错误代码标识 */
  code: string
  /** 错误匹配模式（正则或字符串） */
  pattern: RegExp | string
  /** 人话标题（10字内） */
  title: string
  /** 人话描述（30字内） */
  description: string
  /** 建议操作 */
  suggestion: string
  /** 是否可重试 */
  canRetry: boolean
  /** 重试等待时间（秒） */
  retryDelay?: number
  /** 最大重试次数 */
  maxRetries?: number
  /** 严重程度 */
  severity: ErrorSeverity
  /** 显示图标 */
  icon: string
  /** 错误分类 */
  category: ErrorCategory
}

export type ErrorCategory =
  | 'network'      // 网络相关
  | 'database'     // 数据库相关
  | 'deployment'   // 部署相关
  | 'auth'         // 认证相关
  | 'payment'      // 支付相关
  | 'api'          // API调用
  | 'build'        // 构建编译
  | 'resource'     // 资源限制
  | 'config'       // 配置错误
  | 'unknown'      // 未知错误

/**
 * 50+ 常见错误的人话翻译表
 * 按错误类别分组
 */
export const FRIENDLY_ERRORS: FriendlyError[] = [
  // ==================== 网络相关错误 ====================
  {
    code: 'NETWORK_OFFLINE',
    pattern: /net(work)?.*offline|ERR_INTERNET_DISCONNECTED|ENOTFOUND/i,
    title: '网络已断开',
    description: '无法连接到互联网',
    suggestion: '请检查您的网络连接，然后重试',
    canRetry: true,
    retryDelay: 5,
    maxRetries: 3,
    severity: 'error',
    icon: '📡',
    category: 'network'
  },
  {
    code: 'NETWORK_TIMEOUT',
    pattern: /timeout|ETIMEDOUT|ESOCKETTIMEDOUT|request.*timed?\s*out/i,
    title: '连接超时',
    description: '服务器响应太慢了',
    suggestion: '网络可能拥堵，稍等片刻自动重试',
    canRetry: true,
    retryDelay: 10,
    maxRetries: 3,
    severity: 'warning',
    icon: '⏱️',
    category: 'network'
  },
  {
    code: 'CONNECTION_REFUSED',
    pattern: /ECONNREFUSED|connection\s*refused/i,
    title: '服务暂不可用',
    description: '服务器正在维护中',
    suggestion: '我们正在处理，请稍后再试',
    canRetry: true,
    retryDelay: 30,
    maxRetries: 2,
    severity: 'error',
    icon: '🔧',
    category: 'network'
  },
  {
    code: 'CONNECTION_RESET',
    pattern: /ECONNRESET|connection\s*reset/i,
    title: '连接中断',
    description: '网络连接意外断开',
    suggestion: '请检查网络后重试',
    canRetry: true,
    retryDelay: 5,
    maxRetries: 3,
    severity: 'warning',
    icon: '🔌',
    category: 'network'
  },
  {
    code: 'DNS_ERROR',
    pattern: /ENOTFOUND|DNS|getaddrinfo/i,
    title: '找不到服务器',
    description: '域名解析失败',
    suggestion: '请检查网络设置或稍后重试',
    canRetry: true,
    retryDelay: 10,
    maxRetries: 2,
    severity: 'error',
    icon: '🌐',
    category: 'network'
  },
  {
    code: 'SSL_ERROR',
    pattern: /SSL|TLS|certificate|CERT_|UNABLE_TO_VERIFY/i,
    title: '安全连接失败',
    description: 'SSL证书验证出错',
    suggestion: '我们正在修复安全证书问题',
    canRetry: true,
    retryDelay: 60,
    maxRetries: 1,
    severity: 'error',
    icon: '🔒',
    category: 'network'
  },

  // ==================== 数据库相关错误 ====================
  {
    code: 'DB_CONNECTION_FAILED',
    pattern: /mongodb.*connect|ECONNREFUSED.*27017|MongoNetworkError|MongooseServerSelectionError/i,
    title: '数据库连接失败',
    description: '无法连接到数据库服务',
    suggestion: '系统正在自动重连，请稍候',
    canRetry: true,
    retryDelay: 15,
    maxRetries: 3,
    severity: 'error',
    icon: '🗄️',
    category: 'database'
  },
  {
    code: 'DB_TIMEOUT',
    pattern: /mongodb.*timeout|MongoTimeoutError|serverSelectionTimeoutMS/i,
    title: '数据库响应慢',
    description: '数据库查询超时',
    suggestion: '数据量较大，正在处理中',
    canRetry: true,
    retryDelay: 20,
    maxRetries: 2,
    severity: 'warning',
    icon: '⏳',
    category: 'database'
  },
  {
    code: 'DB_AUTH_FAILED',
    pattern: /mongodb.*auth|MongoError.*authentication|bad auth/i,
    title: '数据库认证失败',
    description: '数据库访问权限问题',
    suggestion: '请联系技术支持处理',
    canRetry: false,
    severity: 'fatal',
    icon: '🔐',
    category: 'database'
  },
  {
    code: 'DB_DUPLICATE',
    pattern: /duplicate\s*key|E11000|unique.*constraint/i,
    title: '数据重复',
    description: '该信息已存在',
    suggestion: '请检查是否重复提交',
    canRetry: false,
    severity: 'warning',
    icon: '📋',
    category: 'database'
  },
  {
    code: 'DB_VALIDATION',
    pattern: /validation.*failed|ValidationError|Cast.*ObjectId/i,
    title: '数据格式错误',
    description: '提交的数据格式不正确',
    suggestion: '请检查输入内容后重试',
    canRetry: false,
    severity: 'warning',
    icon: '📝',
    category: 'database'
  },

  // ==================== 部署相关错误 ====================
  {
    code: 'VERCEL_DEPLOY_FAILED',
    pattern: /vercel.*deploy.*fail|VERCEL_DEPLOYMENT_FAILED|deployment.*error/i,
    title: '部署失败',
    description: '应用部署到服务器时出错',
    suggestion: '正在自动重试部署',
    canRetry: true,
    retryDelay: 30,
    maxRetries: 2,
    severity: 'error',
    icon: '🚀',
    category: 'deployment'
  },
  {
    code: 'VERCEL_BUILD_FAILED',
    pattern: /build.*failed|exit\s*code\s*1|npm\s*ERR|yarn\s*error/i,
    title: '构建失败',
    description: '代码编译时出现问题',
    suggestion: '技术团队正在检查代码',
    canRetry: true,
    retryDelay: 60,
    maxRetries: 1,
    severity: 'error',
    icon: '🔨',
    category: 'build'
  },
  {
    code: 'VERCEL_TIMEOUT',
    pattern: /vercel.*timeout|deployment.*timeout|function.*timeout/i,
    title: '部署超时',
    description: '部署时间过长',
    suggestion: '正在优化部署流程',
    canRetry: true,
    retryDelay: 60,
    maxRetries: 1,
    severity: 'warning',
    icon: '⏱️',
    category: 'deployment'
  },
  {
    code: 'VERCEL_LIMIT',
    pattern: /vercel.*limit|rate\s*limit|too\s*many\s*requests|429/i,
    title: '请求太频繁',
    description: '操作过于频繁，请稍候',
    suggestion: '请等待1分钟后重试',
    canRetry: true,
    retryDelay: 60,
    maxRetries: 1,
    severity: 'warning',
    icon: '🚦',
    category: 'deployment'
  },
  {
    code: 'DOMAIN_ERROR',
    pattern: /domain.*error|DNS.*failed|domain.*not.*found/i,
    title: '域名配置失败',
    description: '域名设置出现问题',
    suggestion: '正在自动修复域名配置',
    canRetry: true,
    retryDelay: 30,
    maxRetries: 2,
    severity: 'error',
    icon: '🌍',
    category: 'deployment'
  },
  {
    code: 'SSL_PROVISION_FAILED',
    pattern: /ssl.*provision|certificate.*failed|lets.*encrypt/i,
    title: 'SSL证书申请中',
    description: '安全证书正在签发',
    suggestion: '通常需要5-10分钟，请耐心等待',
    canRetry: true,
    retryDelay: 300,
    maxRetries: 1,
    severity: 'info',
    icon: '🔐',
    category: 'deployment'
  },

  // ==================== 认证相关错误 ====================
  {
    code: 'AUTH_INVALID',
    pattern: /unauthorized|401|invalid.*token|token.*expired/i,
    title: '登录已过期',
    description: '请重新登录',
    suggestion: '点击下方按钮重新登录',
    canRetry: false,
    severity: 'warning',
    icon: '🔑',
    category: 'auth'
  },
  {
    code: 'AUTH_FORBIDDEN',
    pattern: /forbidden|403|access.*denied|permission.*denied/i,
    title: '没有权限',
    description: '您没有执行此操作的权限',
    suggestion: '请联系管理员获取权限',
    canRetry: false,
    severity: 'warning',
    icon: '🚫',
    category: 'auth'
  },
  {
    code: 'AUTH_SESSION_EXPIRED',
    pattern: /session.*expired|session.*invalid|please.*login/i,
    title: '会话已过期',
    description: '登录状态已失效',
    suggestion: '请重新登录继续操作',
    canRetry: false,
    severity: 'warning',
    icon: '⏰',
    category: 'auth'
  },

  // ==================== 支付相关错误 ====================
  {
    code: 'PAYMENT_FAILED',
    pattern: /payment.*failed|stripe.*error|charge.*failed/i,
    title: '支付失败',
    description: '支付未能完成',
    suggestion: '请检查支付方式后重试',
    canRetry: true,
    retryDelay: 5,
    maxRetries: 2,
    severity: 'error',
    icon: '💳',
    category: 'payment'
  },
  {
    code: 'PAYMENT_DECLINED',
    pattern: /card.*declined|insufficient.*funds|do_not_honor/i,
    title: '支付被拒绝',
    description: '银行卡支付被拒绝',
    suggestion: '请更换支付方式或联系银行',
    canRetry: false,
    severity: 'error',
    icon: '❌',
    category: 'payment'
  },
  {
    code: 'PAYMENT_EXPIRED',
    pattern: /card.*expired|expir.*date/i,
    title: '卡片已过期',
    description: '您的银行卡已过期',
    suggestion: '请更换有效的银行卡',
    canRetry: false,
    severity: 'warning',
    icon: '📅',
    category: 'payment'
  },

  // ==================== API相关错误 ====================
  {
    code: 'API_ERROR',
    pattern: /api.*error|internal.*server.*error|500/i,
    title: '服务出错了',
    description: '服务器内部错误',
    suggestion: '我们已收到通知，正在修复',
    canRetry: true,
    retryDelay: 30,
    maxRetries: 2,
    severity: 'error',
    icon: '⚠️',
    category: 'api'
  },
  {
    code: 'API_NOT_FOUND',
    pattern: /not\s*found|404|endpoint.*not.*exist/i,
    title: '页面不存在',
    description: '请求的内容不存在',
    suggestion: '请检查链接是否正确',
    canRetry: false,
    severity: 'warning',
    icon: '🔍',
    category: 'api'
  },
  {
    code: 'API_BAD_REQUEST',
    pattern: /bad\s*request|400|invalid.*parameter/i,
    title: '请求错误',
    description: '提交的信息有误',
    suggestion: '请检查输入内容',
    canRetry: false,
    severity: 'warning',
    icon: '📋',
    category: 'api'
  },
  {
    code: 'API_RATE_LIMIT',
    pattern: /rate\s*limit|too\s*many\s*request|429|throttl/i,
    title: '操作太频繁',
    description: '请求次数超出限制',
    suggestion: '请稍等片刻后重试',
    canRetry: true,
    retryDelay: 60,
    maxRetries: 1,
    severity: 'warning',
    icon: '🚦',
    category: 'api'
  },
  {
    code: 'CLAUDE_API_ERROR',
    pattern: /anthropic.*error|claude.*error|overloaded|capacity/i,
    title: 'AI服务繁忙',
    description: 'AI助手正在忙碌中',
    suggestion: '稍等片刻，马上就好',
    canRetry: true,
    retryDelay: 10,
    maxRetries: 3,
    severity: 'warning',
    icon: '🤖',
    category: 'api'
  },
  {
    code: 'OPENAI_API_ERROR',
    pattern: /openai.*error|gpt.*error|embedding.*failed/i,
    title: 'AI服务出错',
    description: 'AI处理时遇到问题',
    suggestion: '正在自动重试',
    canRetry: true,
    retryDelay: 15,
    maxRetries: 2,
    severity: 'warning',
    icon: '🧠',
    category: 'api'
  },

  // ==================== 构建编译错误 ====================
  {
    code: 'BUILD_SYNTAX_ERROR',
    pattern: /syntax\s*error|unexpected\s*token|parsing\s*error/i,
    title: '代码语法错误',
    description: '代码中有语法问题',
    suggestion: '技术团队正在修复代码',
    canRetry: false,
    severity: 'error',
    icon: '📝',
    category: 'build'
  },
  {
    code: 'BUILD_TYPE_ERROR',
    pattern: /type\s*error|typescript.*error|TS\d{4}/i,
    title: '类型检查失败',
    description: '代码类型不匹配',
    suggestion: '技术团队正在修复',
    canRetry: false,
    severity: 'error',
    icon: '🔤',
    category: 'build'
  },
  {
    code: 'BUILD_DEPENDENCY_ERROR',
    pattern: /module.*not.*found|cannot.*find.*module|dependency.*error/i,
    title: '依赖缺失',
    description: '缺少必要的组件',
    suggestion: '正在自动安装依赖',
    canRetry: true,
    retryDelay: 30,
    maxRetries: 1,
    severity: 'error',
    icon: '📦',
    category: 'build'
  },
  {
    code: 'BUILD_MEMORY_ERROR',
    pattern: /out\s*of\s*memory|heap.*limit|ENOMEM|JavaScript\s*heap/i,
    title: '内存不足',
    description: '构建需要更多内存',
    suggestion: '正在优化构建配置',
    canRetry: true,
    retryDelay: 60,
    maxRetries: 1,
    severity: 'error',
    icon: '💾',
    category: 'resource'
  },

  // ==================== 资源限制错误 ====================
  {
    code: 'RESOURCE_QUOTA_EXCEEDED',
    pattern: /quota.*exceeded|limit.*exceeded|storage.*full/i,
    title: '配额已用完',
    description: '资源使用已达上限',
    suggestion: '请升级套餐或清理空间',
    canRetry: false,
    severity: 'warning',
    icon: '📊',
    category: 'resource'
  },
  {
    code: 'FILE_TOO_LARGE',
    pattern: /file.*too.*large|size.*limit|payload.*too.*large|413/i,
    title: '文件太大',
    description: '上传的文件超出限制',
    suggestion: '请压缩文件后重试',
    canRetry: false,
    severity: 'warning',
    icon: '📁',
    category: 'resource'
  },
  {
    code: 'DISK_FULL',
    pattern: /disk.*full|no\s*space|ENOSPC/i,
    title: '磁盘已满',
    description: '存储空间不足',
    suggestion: '正在清理临时文件',
    canRetry: true,
    retryDelay: 60,
    maxRetries: 1,
    severity: 'error',
    icon: '💿',
    category: 'resource'
  },

  // ==================== 配置相关错误 ====================
  {
    code: 'CONFIG_MISSING',
    pattern: /config.*missing|environment.*variable|env.*not.*set/i,
    title: '配置缺失',
    description: '系统配置不完整',
    suggestion: '请联系技术支持',
    canRetry: false,
    severity: 'fatal',
    icon: '⚙️',
    category: 'config'
  },
  {
    code: 'CONFIG_INVALID',
    pattern: /invalid.*config|configuration.*error|malformed.*config/i,
    title: '配置错误',
    description: '系统配置有误',
    suggestion: '请联系技术支持',
    canRetry: false,
    severity: 'fatal',
    icon: '🔧',
    category: 'config'
  },

  // ==================== 小程序相关错误 ====================
  {
    code: 'MINIPROGRAM_UPLOAD_FAILED',
    pattern: /miniprogram.*upload|小程序.*上传|wechat.*upload/i,
    title: '小程序上传失败',
    description: '代码上传到微信后台失败',
    suggestion: '正在重新上传',
    canRetry: true,
    retryDelay: 30,
    maxRetries: 2,
    severity: 'error',
    icon: '📲',
    category: 'deployment'
  },
  {
    code: 'MINIPROGRAM_AUDIT_REJECTED',
    pattern: /audit.*reject|审核.*拒绝|review.*fail/i,
    title: '小程序审核未通过',
    description: '微信审核未通过',
    suggestion: '请查看拒绝原因并修改',
    canRetry: false,
    severity: 'warning',
    icon: '📋',
    category: 'deployment'
  },

  // ==================== 移动应用相关错误 ====================
  {
    code: 'APP_STORE_UPLOAD_FAILED',
    pattern: /app\s*store.*upload|testflight.*failed|ipa.*upload/i,
    title: 'App Store上传失败',
    description: '应用上传到苹果失败',
    suggestion: '正在重新提交',
    canRetry: true,
    retryDelay: 60,
    maxRetries: 2,
    severity: 'error',
    icon: '🍎',
    category: 'deployment'
  },
  {
    code: 'PLAY_STORE_UPLOAD_FAILED',
    pattern: /play\s*store.*upload|google\s*play.*failed|aab.*upload/i,
    title: 'Play Store上传失败',
    description: '应用上传到谷歌失败',
    suggestion: '正在重新提交',
    canRetry: true,
    retryDelay: 60,
    maxRetries: 2,
    severity: 'error',
    icon: '🤖',
    category: 'deployment'
  },

  // ==================== 区块链相关错误 ====================
  {
    code: 'BLOCKCHAIN_GAS_ERROR',
    pattern: /gas.*insufficient|out\s*of\s*gas|gas.*limit/i,
    title: 'Gas费不足',
    description: '区块链交易费用不足',
    suggestion: '请充值Gas费后重试',
    canRetry: false,
    severity: 'error',
    icon: '⛽',
    category: 'payment'
  },
  {
    code: 'BLOCKCHAIN_TX_FAILED',
    pattern: /transaction.*failed|revert|execution\s*reverted/i,
    title: '交易失败',
    description: '区块链交易未能完成',
    suggestion: '请检查交易参数',
    canRetry: true,
    retryDelay: 30,
    maxRetries: 1,
    severity: 'error',
    icon: '⛓️',
    category: 'api'
  },
  {
    code: 'BLOCKCHAIN_NETWORK_ERROR',
    pattern: /rpc.*error|blockchain.*network|provider.*error/i,
    title: '区块链网络错误',
    description: '无法连接区块链网络',
    suggestion: '正在切换节点重试',
    canRetry: true,
    retryDelay: 15,
    maxRetries: 3,
    severity: 'warning',
    icon: '🔗',
    category: 'network'
  },

  // ==================== 通用错误 ====================
  {
    code: 'UNKNOWN_ERROR',
    pattern: /./,  // 匹配所有（作为兜底）
    title: '出了点问题',
    description: '遇到了意外情况',
    suggestion: '请稍后重试，或联系客服',
    canRetry: true,
    retryDelay: 30,
    maxRetries: 1,
    severity: 'error',
    icon: '❓',
    category: 'unknown'
  }
]

/**
 * 错误分类的人话描述
 */
export const ERROR_CATEGORY_LABELS: Record<ErrorCategory, string> = {
  network: '网络问题',
  database: '数据问题',
  deployment: '部署问题',
  auth: '登录问题',
  payment: '支付问题',
  api: '服务问题',
  build: '构建问题',
  resource: '资源问题',
  config: '配置问题',
  unknown: '其他问题'
}

/**
 * 严重程度的配置
 */
export const SEVERITY_CONFIG: Record<ErrorSeverity, {
  label: string
  color: string
  bgColor: string
  borderColor: string
}> = {
  info: {
    label: '提示',
    color: 'text-blue-600',
    bgColor: 'bg-blue-50',
    borderColor: 'border-blue-200'
  },
  warning: {
    label: '警告',
    color: 'text-yellow-600',
    bgColor: 'bg-yellow-50',
    borderColor: 'border-yellow-200'
  },
  error: {
    label: '错误',
    color: 'text-red-600',
    bgColor: 'bg-red-50',
    borderColor: 'border-red-200'
  },
  fatal: {
    label: '严重',
    color: 'text-red-800',
    bgColor: 'bg-red-100',
    borderColor: 'border-red-300'
  }
}
