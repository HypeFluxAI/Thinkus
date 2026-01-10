import {
  Globe,
  Smartphone,
  Gamepad2,
  Monitor,
  Coins,
  Building2,
  Heart,
  ShoppingCart,
  Users,
  FileText,
  type LucideIcon,
} from 'lucide-react'

export interface ProductType {
  id: string
  name: string
  description: string
  icon: LucideIcon
  category: 'basic' | 'professional'
  examples: string[]
  techStack: {
    frontend: string[]
    backend: string[]
    database: string[]
    extras?: string[]
  }
  basePrice: number
  complexity: string[]
}

export const PRODUCT_TYPES: ProductType[] = [
  // Basic Types
  {
    id: 'web',
    name: 'Web应用',
    description: 'SaaS、电商、官网等Web应用',
    icon: Globe,
    category: 'basic',
    examples: ['电商平台', 'SaaS工具', '企业官网', '博客系统'],
    techStack: {
      frontend: ['Next.js 14', 'React', 'TypeScript', 'Tailwind CSS'],
      backend: ['tRPC', 'Node.js'],
      database: ['MongoDB', 'Redis'],
    },
    basePrice: 199,
    complexity: ['L1', 'L2', 'L3', 'L4', 'L5'],
  },
  {
    id: 'mobile',
    name: '移动应用',
    description: 'iOS/Android跨平台移动应用',
    icon: Smartphone,
    category: 'basic',
    examples: ['社交App', '工具App', '电商App', '新闻App'],
    techStack: {
      frontend: ['React Native', 'Expo', 'TypeScript'],
      backend: ['tRPC', 'Node.js'],
      database: ['MongoDB', 'SQLite'],
    },
    basePrice: 499,
    complexity: ['L2', 'L3', 'L4', 'L5'],
  },
  {
    id: 'game',
    name: '游戏',
    description: 'H5小游戏、微信小游戏',
    icon: Gamepad2,
    category: 'basic',
    examples: ['休闲游戏', '益智游戏', '卡牌游戏', '模拟经营'],
    techStack: {
      frontend: ['Phaser', 'TypeScript', 'PixiJS'],
      backend: ['Node.js', 'WebSocket'],
      database: ['MongoDB', 'Redis'],
    },
    basePrice: 599,
    complexity: ['L2', 'L3', 'L4'],
  },
  {
    id: 'desktop',
    name: '桌面软件',
    description: 'Windows/Mac桌面应用',
    icon: Monitor,
    category: 'basic',
    examples: ['效率工具', '开发工具', '媒体编辑', '数据管理'],
    techStack: {
      frontend: ['Electron', 'React', 'TypeScript'],
      backend: ['Node.js'],
      database: ['SQLite', 'LevelDB'],
    },
    basePrice: 699,
    complexity: ['L2', 'L3', 'L4', 'L5'],
  },
  // Professional Types
  {
    id: 'ecommerce',
    name: '电商平台',
    description: '完整电商解决方案',
    icon: ShoppingCart,
    category: 'professional',
    examples: ['B2C商城', 'B2B平台', '多商户市场', '跨境电商'],
    techStack: {
      frontend: ['Next.js 14', 'React', 'TypeScript'],
      backend: ['tRPC', 'Node.js', 'Stripe'],
      database: ['MongoDB', 'Redis', 'Elasticsearch'],
      extras: ['支付集成', '物流对接', '库存管理'],
    },
    basePrice: 999,
    complexity: ['L3', 'L4', 'L5'],
  },
  {
    id: 'saas',
    name: 'SaaS平台',
    description: '多租户SaaS应用',
    icon: Building2,
    category: 'professional',
    examples: ['项目管理', 'CRM系统', '协作工具', '数据分析'],
    techStack: {
      frontend: ['Next.js 14', 'React', 'TypeScript'],
      backend: ['tRPC', 'Node.js'],
      database: ['PostgreSQL', 'Redis'],
      extras: ['多租户架构', '订阅计费', '权限系统'],
    },
    basePrice: 1299,
    complexity: ['L3', 'L4', 'L5'],
  },
  {
    id: 'social',
    name: '社交平台',
    description: '社交网络和社区',
    icon: Users,
    category: 'professional',
    examples: ['社交网络', '论坛社区', '直播平台', '内容平台'],
    techStack: {
      frontend: ['Next.js 14', 'React', 'TypeScript'],
      backend: ['tRPC', 'Node.js', 'WebSocket'],
      database: ['MongoDB', 'Redis', 'Neo4j'],
      extras: ['实时通讯', '推荐算法', '内容审核'],
    },
    basePrice: 1499,
    complexity: ['L4', 'L5'],
  },
  {
    id: 'blockchain',
    name: '区块链应用',
    description: 'Web3、NFT、DeFi应用',
    icon: Coins,
    category: 'professional',
    examples: ['NFT市场', 'DeFi协议', 'DAO平台', '钱包应用'],
    techStack: {
      frontend: ['Next.js 14', 'React', 'ethers.js'],
      backend: ['Node.js', 'Hardhat'],
      database: ['MongoDB', 'IPFS'],
      extras: ['智能合约', '钱包集成', '链上交互'],
    },
    basePrice: 1999,
    complexity: ['L3', 'L4', 'L5'],
  },
  {
    id: 'healthcare',
    name: '医疗健康',
    description: 'HIPAA合规医疗应用',
    icon: Heart,
    category: 'professional',
    examples: ['预约系统', '电子病历', '远程医疗', '健康管理'],
    techStack: {
      frontend: ['Next.js 14', 'React', 'TypeScript'],
      backend: ['tRPC', 'Node.js'],
      database: ['PostgreSQL', 'Redis'],
      extras: ['HIPAA合规', '数据加密', '审计日志'],
    },
    basePrice: 2499,
    complexity: ['L4', 'L5'],
  },
  {
    id: 'content',
    name: '内容平台',
    description: '博客、新闻、知识库',
    icon: FileText,
    category: 'professional',
    examples: ['新闻门户', '知识库', '在线课程', '文档中心'],
    techStack: {
      frontend: ['Next.js 14', 'React', 'MDX'],
      backend: ['tRPC', 'Node.js'],
      database: ['MongoDB', 'Algolia'],
      extras: ['SEO优化', '全文搜索', 'CDN加速'],
    },
    basePrice: 399,
    complexity: ['L1', 'L2', 'L3', 'L4'],
  },
]

export const BASIC_TYPES = PRODUCT_TYPES.filter(t => t.category === 'basic')
export const PROFESSIONAL_TYPES = PRODUCT_TYPES.filter(t => t.category === 'professional')

export function getProductTypeById(id: string): ProductType | undefined {
  return PRODUCT_TYPES.find(t => t.id === id)
}

export function getProductTypeIcon(id: string): LucideIcon {
  return getProductTypeById(id)?.icon || Globe
}
