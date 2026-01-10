# Thinkus 结构化规格系统 (Structured Spec System)

> 核心技术竞争力：让AI开发者精准、高效地生成代码

---

## 1. 核心理念

### 1.1 问题

```yaml
传统AI开发问题:
  - 自然语言需求 → AI理解有偏差 → 生成的代码不对
  - 长篇文档 → 超出上下文 → AI只能看到部分
  - 描述模糊 → AI需要猜测 → 产生幻觉
  - 返工多次 → 成本高 → 用户体验差
```

### 1.2 解决方案

```yaml
Thinkus方案:
  用户说自然语言
       ↓
  PM Agent 理解并转换
       ↓
  生成【结构化规格】 ⭐
       ↓
  Dev Agent 精准执行
       ↓
  高质量代码，几乎不返工
```

### 1.3 核心价值

```yaml
对用户:
  - 更快交付（减少返工）
  - 更高质量（AI理解准确）
  - 更低成本（token消耗少）

对Thinkus:
  - 核心技术壁垒
  - 成本优势（AI调用少）
  - 规格可复用（边际成本递减）
```

---

## 2. 规格体系设计

### 2.1 三层规格架构

```
┌─────────────────────────────────────────────────────────────┐
│  Layer 1: 项目规格 (Project Spec)                           │
│  ─────────────────────────────────                          │
│  • 项目元信息                                                │
│  • 功能模块列表                                              │
│  • 技术栈选择                                                │
│  • 数据模型定义                                              │
│  • API接口定义                                               │
└─────────────────────────────────────────────────────────────┘
                              ↓
┌─────────────────────────────────────────────────────────────┐
│  Layer 2: 页面规格 (Page Specs)                             │
│  ─────────────────────────────────                          │
│  • 每个页面一个YAML文件                                      │
│  • 路由、布局、组件、状态                                    │
│  • 数据绑定、交互行为                                        │
│  • API调用                                                   │
└─────────────────────────────────────────────────────────────┘
                              ↓
┌─────────────────────────────────────────────────────────────┐
│  Layer 3: 组件规格 (Component Specs)                        │
│  ─────────────────────────────────                          │
│  • 设计令牌（颜色、字体、间距）                              │
│  • 基础组件（按钮、输入框、卡片）                            │
│  • 业务组件（特定功能组件）                                  │
└─────────────────────────────────────────────────────────────┘
```

### 2.2 规格文件结构

```yaml
# 每个用户项目生成的规格包
{project-id}-specs/
│
├── project.yaml           # 项目总览
├── data-models.ts         # 数据模型（TypeScript）
├── api-specs.yaml         # API定义
│
├── pages/                 # 页面规格
│   ├── _index.yaml        # 页面列表
│   ├── home.yaml
│   ├── login.yaml
│   └── ...
│
├── components/            # 组件规格
│   ├── design-tokens.yaml # 设计令牌
│   └── custom/            # 自定义组件
│
└── flows/                 # 业务流程（复杂项目）
    └── ...
```

---

## 3. 规格格式定义

### 3.1 项目规格 (project.yaml)

```yaml
# 项目规格模板
project:
  id: "{auto-generated}"
  name: "{用户项目名}"
  type: "web | mobile | game | ..."
  complexity: "L1 | L2 | L3 | L4 | L5"
  
tech_stack:
  framework: "next.js | react-native | ..."
  styling: "tailwind | styled-components | ..."
  database: "mongodb | postgresql | ..."
  auth: "nextauth | clerk | ..."
  
features:
  - id: "user-system"
    name: "用户系统"
    pages: ["login", "register", "profile"]
    apis: ["auth.login", "auth.register", "user.profile"]
    
  - id: "product-list"
    name: "商品列表"
    pages: ["products", "product-detail"]
    apis: ["products.list", "products.get"]

pages:
  - route: "/"
    name: "首页"
    spec: "pages/home.yaml"
    
  - route: "/login"
    name: "登录"
    spec: "pages/login.yaml"
```

### 3.2 数据模型 (data-models.ts)

```typescript
// 自动生成的数据模型
// 基于用户需求和功能模块

export interface User {
  id: string
  email: string
  name: string
  avatar?: string
  role: 'user' | 'admin'
  createdAt: Date
}

export interface Product {
  id: string
  name: string
  description: string
  price: number        // cents
  images: string[]
  category: string
  stock: number
  createdAt: Date
}

// ... 根据功能自动生成
```

### 3.3 API规格 (api-specs.yaml)

```yaml
# 自动生成的API定义

base: /api

auth:
  login:
    method: POST
    path: /auth/login
    input:
      email: string, required, email
      password: string, required, min:6
    output:
      user: User
      token: string
    errors:
      - INVALID_CREDENTIALS: 邮箱或密码错误

  register:
    method: POST
    path: /auth/register
    input:
      name: string, required
      email: string, required, email
      password: string, required, min:6
    output:
      user: User
      token: string

products:
  list:
    method: GET
    path: /products
    input:
      page?: number = 1
      limit?: number = 20
      category?: string
    output:
      products: Product[]
      total: number
```

### 3.4 页面规格 (pages/xxx.yaml)

```yaml
# 页面规格模板

meta:
  route: "/products"
  layout: "default"
  auth: false
  title: "商品列表"

# 页面结构
sections:
  - id: "header"
    type: "PageHeader"
    props:
      title: "全部商品"
      showSearch: true
      showFilter: true

  - id: "filters"
    type: "FilterBar"
    props:
      filters:
        - { id: "category", label: "分类", type: "select", options: "$categories" }
        - { id: "price", label: "价格", type: "range", min: 0, max: 10000 }

  - id: "product-grid"
    type: "Grid"
    props:
      columns: { sm: 2, md: 3, lg: 4 }
      gap: 6
    children:
      type: "ProductCard"
      dataSource: "$products"
      props:
        image: "$item.images[0]"
        name: "$item.name"
        price: "$item.price"
        onClick: "navigate('/products/' + $item.id)"

  - id: "pagination"
    type: "Pagination"
    props:
      total: "$total"
      page: "$page"
      pageSize: 20
      onChange: "setPage"

# 状态
state:
  products: Product[] = []
  categories: string[] = []
  total: number = 0
  page: number = 1
  filters: { category?: string, priceRange?: [number, number] }

# API调用
api:
  onMount:
    - endpoint: products.list
      params: { page: "$page", category: "$filters.category" }
      set: { products: "response.products", total: "response.total" }
    
    - endpoint: categories.list
      set: { categories: "response.categories" }

  onFilterChange:
    - endpoint: products.list
      params: { page: 1, category: "$filters.category" }
      set: { products: "response.products", total: "response.total", page: 1 }
```

---

## 4. 规格生成流程

### 4.1 整体流程

```
┌─────────────────────────────────────────────────────────────┐
│  用户输入: "我想做一个宠物用品电商"                          │
└─────────────────────────────────────────────────────────────┘
                              ↓
┌─────────────────────────────────────────────────────────────┐
│  PM Agent (Claude Opus)                                      │
│  ─────────────────────────                                   │
│  1. 理解用户需求                                             │
│  2. 与用户对话澄清细节                                       │
│  3. 专家讨论优化方案                                         │
│  4. 生成项目规格 (project.yaml)                             │
│  5. 生成数据模型 (data-models.ts)                           │
│  6. 生成API规格 (api-specs.yaml)                            │
│  7. 生成页面列表                                             │
└─────────────────────────────────────────────────────────────┘
                              ↓
┌─────────────────────────────────────────────────────────────┐
│  Design Agent (Claude Sonnet)                                │
│  ─────────────────────────                                   │
│  1. 读取项目规格                                             │
│  2. 选择设计模板                                             │
│  3. 生成设计令牌                                             │
│  4. 生成每个页面规格 (pages/*.yaml)                         │
└─────────────────────────────────────────────────────────────┘
                              ↓
┌─────────────────────────────────────────────────────────────┐
│  Dev Agent (Claude Opus)                                     │
│  ─────────────────────────                                   │
│  1. 读取项目规格 + 页面规格                                  │
│  2. 逐个页面生成代码                                         │
│  3. 生成API实现                                              │
│  4. 生成数据库Schema                                         │
│  输出: 完整可运行的代码                                      │
└─────────────────────────────────────────────────────────────┘
```

### 4.2 PM Agent 规格生成

```yaml
PM_Agent_Workflow:

  Step_1_理解需求:
    输入: 用户自然语言描述
    输出: 结构化需求理解
    模型: Claude Opus
    
  Step_2_功能拆解:
    输入: 结构化需求
    输出: 功能模块列表
    逻辑: |
      - 识别核心功能
      - 拆解为页面和API
      - 确定数据实体
    
  Step_3_生成数据模型:
    输入: 功能模块列表
    输出: data-models.ts
    格式: TypeScript接口定义
    
  Step_4_生成API规格:
    输入: 功能模块 + 数据模型
    输出: api-specs.yaml
    格式: 简化版OpenAPI
    
  Step_5_生成项目规格:
    输入: 以上所有
    输出: project.yaml
    包含: 元信息、技术栈、功能列表、页面列表
```

### 4.3 Design Agent 页面规格生成

```yaml
Design_Agent_Workflow:

  Step_1_选择模板:
    输入: 项目类型
    逻辑: |
      - 电商 → 电商模板
      - SaaS → SaaS模板
      - 社交 → 社交模板
    输出: 基础页面模板
    
  Step_2_定制设计令牌:
    输入: 用户品牌偏好（如有）
    输出: design-tokens.yaml
    包含: 颜色、字体、间距、圆角
    
  Step_3_生成页面规格:
    输入: project.yaml中的页面列表
    输出: pages/*.yaml
    逻辑: |
      遍历每个页面:
        1. 确定页面布局
        2. 选择组件组合
        3. 绑定数据源
        4. 定义交互行为
```

### 4.4 Dev Agent 代码生成

```yaml
Dev_Agent_Workflow:

  Step_1_初始化项目:
    输入: project.yaml
    输出: 项目脚手架
    包含: |
      - Next.js项目结构
      - 依赖配置
      - 环境变量模板
      
  Step_2_生成数据层:
    输入: data-models.ts
    输出: |
      - Mongoose Schema
      - tRPC Router定义
      - Zod验证Schema
      
  Step_3_生成API:
    输入: api-specs.yaml
    输出: |
      - tRPC procedures
      - 业务逻辑实现
      
  Step_4_生成页面:
    输入: pages/*.yaml
    输出: |
      - React组件
      - 页面布局
      - 状态管理
      - API调用hook
    逻辑: |
      遍历每个页面规格:
        1. 解析sections
        2. 映射到React组件
        3. 绑定状态和事件
        4. 生成完整页面文件
```

---

## 5. 规格模板库

### 5.1 按项目类型的模板

```yaml
templates:
  
  ecommerce:
    name: "电商"
    features:
      - "用户系统"
      - "商品管理"
      - "购物车"
      - "订单系统"
      - "支付"
    pages:
      - "home", "login", "register"
      - "products", "product-detail"
      - "cart", "checkout"
      - "orders", "order-detail"
      - "profile"
    data_models:
      - User, Product, Cart, Order, Payment
      
  saas:
    name: "SaaS工具"
    features:
      - "用户系统"
      - "订阅计费"
      - "仪表盘"
      - "核心功能模块"
    pages:
      - "landing", "pricing", "login", "register"
      - "dashboard"
      - "settings", "billing"
    data_models:
      - User, Subscription, Usage
      
  social:
    name: "社交应用"
    features:
      - "用户系统"
      - "内容发布"
      - "关注系统"
      - "消息系统"
    pages:
      - "home", "login", "register"
      - "feed", "post-detail", "create-post"
      - "profile", "followers", "following"
      - "messages"
    data_models:
      - User, Post, Comment, Follow, Message
      
  # ... 更多模板
```

### 5.2 模板复用逻辑

```yaml
复用策略:
  
  新项目流程:
    1. PM Agent分析需求
    2. 匹配最相似的模板
    3. 复用模板的基础规格
    4. 根据用户需求定制差异部分
    
  复用收益:
    - 减少AI生成量 → 降低成本
    - 复用验证过的规格 → 提高质量
    - 加快生成速度 → 提升体验
    
  持续积累:
    - 每个成功项目的规格入库
    - 优化高频使用的模板
    - 边际成本持续递减
```

---

## 6. 质量保证

### 6.1 规格验证

```yaml
验证规则:

  项目规格:
    - 必须包含: id, name, type, tech_stack, features, pages
    - features必须映射到pages和apis
    - 所有引用的规格文件必须存在
    
  数据模型:
    - 必须是有效的TypeScript
    - 所有接口必须有id字段
    - 日期字段必须是Date类型
    
  API规格:
    - 每个endpoint必须有method, path, input, output
    - input/output必须引用已定义的类型
    
  页面规格:
    - 必须有meta.route
    - sections中的dataSource必须在state中定义
    - api调用必须引用已定义的endpoint
```

### 6.2 规格预览

```yaml
预览功能:
  
  用户确认前:
    - 展示页面结构预览
    - 展示数据模型图
    - 展示API列表
    - 用户可以提出修改
    
  修改流程:
    用户: "购物车页面要加优惠券功能"
    PM Agent:
      1. 更新pages/cart.yaml
      2. 添加Coupon到data-models.ts
      3. 添加coupon.apply到api-specs.yaml
      4. 重新展示预览
```

---

## 7. 与产品流程整合

### 7.1 在创建流程中的位置

```
用户描述需求
      ↓
AI对话澄清
      ↓
专家讨论
      ↓
┌─────────────────────────────────────────────────────────────┐
│  生成结构化规格 ⭐                                          │
│  ─────────────────                                          │
│  • project.yaml                                             │
│  • data-models.ts                                           │
│  • api-specs.yaml                                           │
│  • pages/*.yaml                                             │
└─────────────────────────────────────────────────────────────┘
      ↓
用户确认方案（可以预览规格）
      ↓
支付
      ↓
┌─────────────────────────────────────────────────────────────┐
│  Dev Agent 读取规格，生成代码                                │
│  ─────────────────────────────                              │
│  • 精准执行，几乎不返工                                      │
│  • 进度可追踪                                                │
└─────────────────────────────────────────────────────────────┘
      ↓
产品上线
```

### 7.2 用户可见性

```yaml
用户可见:
  - 功能列表（来自project.yaml）
  - 页面结构（来自pages/*.yaml的可视化）
  - 数据实体（来自data-models.ts的图形化）
  
用户不可见:
  - 原始YAML/TS文件（太技术）
  - 但可以选择"导出技术规格"（高级用户）
```

---

## 8. 技术实现

### 8.1 规格存储

```yaml
存储方式:
  - 每个项目的规格存储在独立目录
  - 使用对象存储（S3/R2）
  - 版本控制（每次修改保留历史）
  
目录结构:
  /specs/{project-id}/
    /v1/
      project.yaml
      data-models.ts
      api-specs.yaml
      pages/
      components/
    /v2/  # 修改后的版本
      ...
```

### 8.2 规格解析

```typescript
// 规格解析器
interface SpecParser {
  // 解析项目规格
  parseProject(yaml: string): ProjectSpec
  
  // 解析数据模型
  parseDataModels(ts: string): DataModelSpec[]
  
  // 解析API规格
  parseApiSpecs(yaml: string): ApiSpec[]
  
  // 解析页面规格
  parsePageSpec(yaml: string): PageSpec
  
  // 验证规格完整性
  validate(specs: AllSpecs): ValidationResult
}

// 代码生成器
interface CodeGenerator {
  // 生成数据库Schema
  generateDbSchema(models: DataModelSpec[]): string
  
  // 生成API代码
  generateApi(apis: ApiSpec[]): string
  
  // 生成页面代码
  generatePage(page: PageSpec): string
  
  // 生成完整项目
  generateProject(specs: AllSpecs): ProjectFiles
}
```

### 8.3 Dev Agent 集成

```yaml
Dev_Agent_Config:
  
  输入:
    - 规格文件目录路径
    - 目标技术栈配置
    
  执行:
    1. 加载所有规格文件
    2. 验证规格完整性
    3. 按顺序生成代码:
       - 项目结构
       - 数据层
       - API层
       - 页面层
    4. 运行测试验证
    5. 输出完整项目
    
  输出:
    - 完整的可运行代码
    - 生成日志
    - 验证结果
```

---

## 9. 效果指标

### 9.1 预期效果

```yaml
质量提升:
  - 代码准确率: 60% → 95%
  - 返工次数: 3次 → 0.5次
  - 首次交付成功率: 40% → 90%

成本降低:
  - Token消耗: 降低60%（规格精简）
  - AI调用次数: 降低50%（减少返工）
  - 人工干预: 降低80%

效率提升:
  - 开发时间: 缩短30%
  - 模板项目: 缩短50%
```

### 9.2 持续优化

```yaml
数据积累:
  - 收集每个项目的规格
  - 分析成功项目的共性
  - 优化规格模板
  
反馈循环:
  - 用户满意度 → 规格质量
  - 返工次数 → 规格准确性
  - 开发时间 → 规格效率
```

---

## 10. 总结

### 10.1 核心价值

```
结构化规格系统是Thinkus的核心技术壁垒

用户说自然语言 → 系统生成精确规格 → AI精准执行

这个转换能力是竞争对手难以复制的
```

### 10.2 竞争优势

```yaml
vs 纯AI生成:
  - 我们: 规格化 → 精准
  - 他们: 自然语言 → 猜测
  
vs 传统开发:
  - 我们: 分钟级生成规格
  - 他们: 人工编写需要天
  
vs 模板建站:
  - 我们: AI理解需求，自动定制
  - 他们: 固定模板，用户自己配置
```

---

**结构化规格系统 = Thinkus的"发动机"**
