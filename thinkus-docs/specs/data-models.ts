// ============================================================
// Thinkus 数据模型定义
// 版本: 1.0.0
// ============================================================

// ------------------------------------------------------------
// 基础类型
// ------------------------------------------------------------

export type ID = string  // MongoDB ObjectId

// ------------------------------------------------------------
// 用户
// ------------------------------------------------------------

export interface User {
  id: ID
  email: string                          // unique
  name: string
  avatar?: string
  passwordHash?: string                  // null for OAuth users
  authProvider: 'email' | 'google' | 'github'
  
  stats: {
    totalProjects: number
    completedProjects: number
    totalSpent: number                   // cents
  }
  
  settings: UserSettings
  
  createdAt: Date
  updatedAt: Date
}

export interface UserSettings {
  language: 'zh-CN' | 'en-US'
  theme: 'light' | 'dark' | 'system'
  timezone: string                       // IANA
  notifications: {
    email: boolean
    browser: boolean
  }
}

// ------------------------------------------------------------
// 项目
// ------------------------------------------------------------

export type ProjectType = 
  | 'web' | 'mobile' | 'game' | 'desktop' 
  | 'blockchain' | 'finance' | 'healthcare'

export type ProjectStatus = 
  | 'draft'              // 草稿
  | 'discussing'         // 专家讨论中
  | 'pending_confirm'    // 待确认
  | 'pending_payment'    // 待支付
  | 'in_progress'        // 开发中
  | 'completed'          // 已完成
  | 'archived'           // 已归档

export type Complexity = 'L1' | 'L2' | 'L3' | 'L4' | 'L5'

export interface Project {
  id: ID
  userId: ID
  
  // 基本信息
  name: string
  icon: string                           // emoji
  type: ProjectType
  status: ProjectStatus
  complexity: Complexity
  
  // 需求
  requirement: {
    original: string                     // 用户原始描述
    clarified?: string                   // AI澄清后
    attachments?: string[]               // URLs
  }
  
  // 方案 (讨论后生成)
  proposal?: ProjectProposal
  
  // 进度 (开发中)
  progress?: ProjectProgress
  
  // 部署 (完成后)
  deployment?: ProjectDeployment
  
  // 统计
  analytics?: {
    visitors: number
    pageViews: number
  }
  
  createdAt: Date
  updatedAt: Date
  completedAt?: Date
}

export interface ProjectProposal {
  features: Feature[]
  techStack: string[]
  estimatedTime: string                  // "2-3天"
  pricing: {
    base: number                         // cents
    additions: Addition[]
    total: number                        // cents
  }
  discussionId: ID
}

export interface Feature {
  id: string
  icon: string
  name: string
  description: string
  category: string
  pages: number
  apis: number
  price: number                          // cents
  included: boolean
  optional: boolean
}

export interface Addition {
  id: string
  name: string
  price: number                          // cents
  selected: boolean
}

export interface ProjectProgress {
  percentage: number                     // 0-100
  currentStage: Stage
  stages: StageProgress[]
  eta: Date
  logs: DevLog[]
}

export type Stage = 
  | 'requirement' | 'design' | 'development' 
  | 'testing' | 'deployment'

export interface StageProgress {
  stage: Stage
  status: 'pending' | 'in_progress' | 'completed'
  startedAt?: Date
  completedAt?: Date
}

export interface DevLog {
  time: Date
  type: 'info' | 'success' | 'warning' | 'error'
  icon: string
  message: string
}

export interface ProjectDeployment {
  url: string
  domain?: string
  previewUrl: string
  githubRepo: string
  vercelProjectId: string
  mongodbUri: string                     // encrypted
}

// ------------------------------------------------------------
// 专家讨论
// ------------------------------------------------------------

export type DiscussionMode = 'quick' | 'standard' | 'deep' | 'expert'

export type DiscussionPhase = 
  | 'understanding' | 'ideation' | 'challenge' 
  | 'synthesis' | 'validation'

export type ExpertId = 
  | 'sarah' | 'mike' | 'elena' | 'marcus' | 'david'
  | 'alex' | 'lisa' | 'kevin' | 'frank' | 'helen'

export interface Discussion {
  id: ID
  projectId: ID
  mode: DiscussionMode
  status: 'in_progress' | 'completed' | 'paused'
  currentPhase: DiscussionPhase
  
  participants: ExpertId[]
  rounds: DiscussionRound[]
  userInputs: UserInput[]
  
  conclusion?: DiscussionConclusion
  
  createdAt: Date
  completedAt?: Date
}

export interface DiscussionRound {
  id: string
  phase: DiscussionPhase
  messages: ExpertMessage[]
  summary?: string
  consensus?: string[]
  disagreements?: string[]
}

export interface ExpertMessage {
  id: string
  expertId: ExpertId
  content: string
  timestamp: Date
}

export interface UserInput {
  id: string
  roundId: string
  content: string
  type: 'question' | 'comment' | 'decision'
  timestamp: Date
}

export interface DiscussionConclusion {
  projectName: string
  positioning: string
  features: Feature[]
  risks: string[]
  recommendations: string[]
  approvals: { expertId: ExpertId; approved: boolean }[]
}

// ------------------------------------------------------------
// 对话
// ------------------------------------------------------------

export interface Conversation {
  id: ID
  projectId?: ID
  type: 'create' | 'support' | 'general'
  messages: Message[]
  createdAt: Date
  updatedAt: Date
}

export interface Message {
  id: string
  role: 'user' | 'assistant'
  content: string
  timestamp: Date
  
  // AI消息
  suggestions?: string[]
  actions?: MessageAction[]
  generatedData?: any
}

export interface MessageAction {
  id: string
  text: string
  action: string
}

// ------------------------------------------------------------
// 支付
// ------------------------------------------------------------

export interface Payment {
  id: ID
  userId: ID
  projectId: ID
  
  amount: number                         // cents
  currency: 'USD'
  status: 'pending' | 'completed' | 'failed' | 'refunded'
  
  stripePaymentIntentId: string
  stripeChargeId?: string
  
  createdAt: Date
  completedAt?: Date
}

// ------------------------------------------------------------
// 凭证
// ------------------------------------------------------------

export type ServiceType = 
  | 'vercel' | 'github' | 'mongodb' | 'stripe' | 'openai'

export interface Credential {
  id: ID
  userId: ID
  
  service: ServiceType
  name: string
  encryptedData: string                  // AES-256
  
  status: 'active' | 'expired' | 'revoked'
  lastUsed?: Date
  
  createdAt: Date
}

// ------------------------------------------------------------
// 专家定义
// ------------------------------------------------------------

export interface ExpertDefinition {
  id: ExpertId
  name: string
  title: string
  avatar: string                         // emoji
  color: string                          // hex
  
  expertise: string[]
  personality: string
  challengeFocus: string
  
  // 参与条件 (可选)
  when?: string                          // 条件表达式
}

export const EXPERTS: Record<ExpertId, ExpertDefinition> = {
  sarah: {
    id: 'sarah',
    name: 'Sarah',
    title: '产品策略师',
    avatar: '👩‍💼',
    color: '#F59E0B',
    expertise: ['市场定位', '商业模式', '竞品分析'],
    personality: '战略思维，关注大局',
    challengeFocus: '这个产品有市场吗？',
    when: 'complexity >= L3'
  },
  mike: {
    id: 'mike',
    name: 'Mike',
    title: '产品经理',
    avatar: '👨‍💼',
    color: '#6366F1',
    expertise: ['需求分析', '功能设计', '优先级'],
    personality: '注重细节，用户视角',
    challengeFocus: '功能完整吗？流程顺畅吗？'
  },
  elena: {
    id: 'elena',
    name: 'Elena',
    title: 'UX设计师',
    avatar: '👩‍🎨',
    color: '#EC4899',
    expertise: ['用户体验', '交互设计', '可用性'],
    personality: '用户同理心，追求简洁',
    challengeFocus: '用户会困惑吗？够简单吗？'
  },
  marcus: {
    id: 'marcus',
    name: 'Marcus',
    title: 'UI设计师',
    avatar: '👨‍🎨',
    color: '#8B5CF6',
    expertise: ['视觉设计', '品牌', '设计系统'],
    personality: '审美敏锐，注重细节',
    challengeFocus: '视觉专业吗？品牌一致吗？'
  },
  david: {
    id: 'david',
    name: 'David',
    title: '技术架构师',
    avatar: '👨‍💻',
    color: '#10B981',
    expertise: ['系统架构', '技术选型', '性能'],
    personality: '严谨理性，关注可行性',
    challengeFocus: '技术可行吗？架构合理吗？'
  },
  alex: {
    id: 'alex',
    name: 'Alex',
    title: '安全专家',
    avatar: '🔒',
    color: '#EF4444',
    expertise: ['安全架构', '合规', '风险'],
    personality: '谨慎，风险意识强',
    challengeFocus: '有安全隐患吗？',
    when: 'type in [blockchain,finance,healthcare] or hasPayment'
  },
  lisa: {
    id: 'lisa',
    name: 'Lisa',
    title: '增长专家',
    avatar: '📈',
    color: '#8B5CF6',
    expertise: ['用户增长', '获客', '留存'],
    personality: '数据驱动',
    challengeFocus: '如何获客？如何留存？',
    when: 'complexity >= L3'
  },
  kevin: {
    id: 'kevin',
    name: 'Kevin',
    title: '区块链专家',
    avatar: '⛓️',
    color: '#3B82F6',
    expertise: ['智能合约', '链上架构', 'Gas优化'],
    personality: '技术极客',
    challengeFocus: '合约安全吗？',
    when: 'type in [blockchain,nft,defi]'
  },
  frank: {
    id: 'frank',
    name: 'Frank',
    title: '金融专家',
    avatar: '🏦',
    color: '#14B8A6',
    expertise: ['金融合规', '支付', '风控'],
    personality: '严谨保守',
    challengeFocus: '满足监管吗？',
    when: 'type in [finance,payment]'
  },
  helen: {
    id: 'helen',
    name: 'Helen',
    title: '医疗专家',
    avatar: '🏥',
    color: '#06B6D4',
    expertise: ['医疗合规', 'HIPAA', '临床流程'],
    personality: '专业严谨',
    challengeFocus: '满足HIPAA吗？',
    when: 'type == healthcare'
  }
}

// ------------------------------------------------------------
// 价格配置
// ------------------------------------------------------------

export const PRICING = {
  // 基础价格 (cents)
  base: {
    L1: 4900,      // $49
    L2: 19900,     // $199
    L3: 49900,     // $499
    L4: 99900,     // $999
    L5: 299900     // $2999
  },
  
  // 可选服务 (cents)
  additions: {
    seo: { name: 'SEO优化', price: 9900 },
    analytics: { name: '数据分析', price: 14900 },
    priority: { name: '优先开发', price: 19900 },
    support: { name: '延长支持', price: 29900 }
  }
}

// ------------------------------------------------------------
// 结构化规格系统 ⭐
// ------------------------------------------------------------

export interface ProjectSpec {
  id: ID
  projectId: ID
  version: number
  
  // 项目元信息
  meta: {
    name: string
    type: ProjectType
    complexity: Complexity
    techStack: TechStack
  }
  
  // 功能列表
  features: FeatureSpec[]
  
  // 页面列表
  pages: PageRef[]
  
  createdAt: Date
  updatedAt: Date
}

export interface TechStack {
  framework: 'nextjs' | 'react-native' | 'electron'
  styling: 'tailwind' | 'styled-components'
  database: 'mongodb' | 'postgresql'
  auth: 'nextauth' | 'clerk'
}

export interface FeatureSpec {
  id: string
  name: string
  description: string
  pages: string[]       // page ids
  apis: string[]        // api endpoint ids
  dataModels: string[]  // model names
}

export interface PageRef {
  id: string
  route: string
  name: string
  specFile: string      // e.g., "pages/home.yaml"
}

export interface PageSpec {
  meta: {
    route: string
    layout: string
    auth: boolean
    title: string
  }
  sections: SectionSpec[]
  state: Record<string, string>
  api: ApiCallSpec[]
}

export interface SectionSpec {
  id: string
  type: string
  props: Record<string, any>
  children?: SectionSpec[]
}

export interface ApiCallSpec {
  trigger: 'onMount' | 'onSubmit' | 'onChange' | string
  endpoint: string
  params?: Record<string, string>
  set?: Record<string, string>
}

// ------------------------------------------------------------
// 知识积累库 ⭐
// ------------------------------------------------------------

export interface ProjectTemplate {
  id: ID
  name: string
  type: ProjectType
  description: string
  tags: string[]
  
  // 模板规格
  specs: {
    projectSpec: string     // S3 path
    dataModels: string      // S3 path
    apiSpecs: string        // S3 path
    pageSpecs: string[]     // S3 paths
  }
  
  // 包含的模块
  modules: string[]         // module ids
  
  // 统计
  stats: {
    usageCount: number
    avgSatisfaction: number
    avgReworkCount: number
  }
  
  createdAt: Date
  updatedAt: Date
}

export interface FunctionModule {
  id: ID
  name: string
  category: 'user' | 'payment' | 'notification' | 'content' | string
  description: string
  tags: string[]
  
  // 模块规格
  spec: {
    dataModels: string      // TypeScript code
    apis: string            // YAML
    pages?: string[]        // YAML paths
  }
  
  // 依赖
  dependencies: string[]    // other module ids
  
  // 统计
  stats: {
    usageCount: number
  }
  
  createdAt: Date
  updatedAt: Date
}

export interface ExpertLearning {
  id: ID
  projectId: ID
  discussionId: ID
  
  // 学习内容
  type: 'pattern' | 'antipattern' | 'insight'
  category: string
  content: string
  
  // 来源
  expertId: ExpertId
  context: string
  
  // 评分
  usefulness: number        // 1-5
  
  createdAt: Date
}

// 模板匹配结果
export interface TemplateMatchResult {
  template: ProjectTemplate
  similarity: number        // 0-1
  reusableModules: FunctionModule[]
  customizationNeeded: string[]
}

// ============================================================
// 提示词系统类型
// ============================================================

export interface PromptTemplate {
  id: string
  version: string
  model: 'claude-opus' | 'claude-sonnet' | 'claude-haiku'
  temperature: number
  maxTokens: number
  content: string
  filePath: string
  tags?: string[]
}

export interface PromptExecution {
  id: ID
  promptId: string
  promptVersion: string
  projectId: ID
  
  input: {
    variables: Record<string, any>
    tokens: number
  }
  output: {
    content: string
    tokens: number
    latencyMs: number
  }
  
  evaluation: {
    formatValid: boolean
    taskCompleted: boolean
    userRating?: number      // 1-5
    reworkCount: number
  }
  
  createdAt: Date
}

export interface PromptVersion {
  id: ID
  promptId: string
  version: string            // semver
  content: string
  config: {
    model: string
    temperature: number
    maxTokens: number
  }
  
  status: 'draft' | 'testing' | 'production' | 'deprecated'
  
  stats: {
    totalExecutions: number
    avgSuccessRate: number
    avgLatency: number
    avgTokens: number
  }
  
  createdAt: Date
  publishedAt?: Date
  deprecatedAt?: Date
}

export interface PromptABTest {
  id: ID
  promptId: string
  versionA: string
  versionB: string
  trafficSplit: number       // 0-1, B版本占比
  
  status: 'running' | 'completed' | 'cancelled'
  
  metrics: {
    A: { executions: number; successRate: number; avgLatency: number }
    B: { executions: number; successRate: number; avgLatency: number }
  }
  
  result?: {
    winner: 'A' | 'B' | 'tie'
    confidence: number       // 0-1
  }
  
  startedAt: Date
  endedAt?: Date
}

export interface PromptReviewResult {
  id: ID
  promptId: string
  version: string
  
  scores: {
    total: number            // 0-100
    quality: number
    safety: number
    efficiency: number
  }
  
  breakdown: {
    formatCorrectness: number
    contentAccuracy: number
    consistency: number
    completeness: number
    hallucinationRisk: number
    boundaryRisk: number
    injectionResistance: number
    tokenEfficiency: number
    latencyScore: number
  }
  
  issues: Array<{
    severity: 'critical' | 'major' | 'minor'
    category: 'quality' | 'safety' | 'efficiency'
    description: string
    suggestion: string
  }>
  
  decision: 'approved' | 'rejected' | 'needs_iteration'
  action: 'publish' | 'ab_test' | 'iterate' | 'rollback'
  
  comparisonToBaseline: {
    totalChange: string      // e.g., "+8%"
    improvements: string[]
    degradations: string[]
  }
  
  timestamp: Date
}

export interface PromptMetrics {
  promptId: string
  currentVersion: string
  
  scores: {
    total: number
    quality: number
    safety: number
    efficiency: number
  }
  
  healthStatus: 'excellent' | 'good' | 'fair' | 'poor'
  
  detailedMetrics: {
    formatAccuracy: number
    taskSuccessRate: number
    consistencyScore: number
    completenessScore: number
    hallucinationRate: number
    boundaryViolationRate: number
    avgInputTokens: number
    avgOutputTokens: number
    avgLatencyMs: number
    userSatisfaction: number
    reworkRate: number
  }
  
  trend7d: {
    healthChange: number
    successRateChange: number
    costChange: number
  }
  
  lastOptimization?: Date
  nextScheduledReview?: Date
}
