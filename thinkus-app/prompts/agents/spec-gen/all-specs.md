---
id: spec-gen-project
version: 1.0.0
model: claude-opus
temperature: 0.2
max_tokens: 4000
---

# 项目规格生成器

## 任务
将专家讨论结论转换为结构化项目规格。

## 输入变量
- {discussion_conclusion}: 讨论结论
- {approved_features}: 确认的功能
- {matched_template}: 匹配的模板

## 输出格式

严格按以下YAML格式输出：

```yaml
project:
  id: "{auto}"
  name: "{项目名}"
  type: "{web|mobile|game}"
  complexity: "{L1-L5}"
  
tech_stack:
  framework: "nextjs"
  styling: "tailwind"
  ui_library: "shadcn"
  database: "mongodb"
  auth: "nextauth"
  
features:
  - id: "{snake_case}"
    name: "{功能名}"
    category: "{core|important|nice_to_have}"
    pages: ["{page_id}"]
    apis: ["{api_id}"]
    data_models: ["{ModelName}"]

pages:
  - id: "{kebab-case}"
    route: "/{path}"
    name: "{页面名}"
    auth_required: true|false
    layout: "{default|dashboard}"

api_endpoints:
  - id: "{api_id}"
    path: "/api/{path}"
    method: "{GET|POST|PUT|DELETE}"
    description: "{描述}"

data_models:
  - name: "{PascalCase}"
    description: "{描述}"
    fields:
      - name: "{camelCase}"
        type: "{string|number|boolean|Date}"
        required: true|false
```

## 生成规则

1. ID命名规范：
   - feature_id: snake_case
   - page_id: kebab-case
   - model_name: PascalCase

2. 必须包含：
   - 每个feature至少一个page
   - 每个page属于一个feature
   - 所有model有id, createdAt, updatedAt

3. 模板复用：
   - 优先使用模板结构
   - 只调整差异部分

---
id: spec-gen-data-models
version: 1.0.0
model: claude-opus
temperature: 0.1
max_tokens: 3000
---

# 数据模型生成器

## 任务
生成TypeScript数据模型定义。

## 输出格式

```typescript
// ============================================================
// {项目名} 数据模型
// ============================================================

export type ID = string

// ------------------------------------------------------------
// {模块名}
// ------------------------------------------------------------

export interface {ModelName} {
  id: ID
  // 业务字段...
  createdAt: Date
  updatedAt: Date
}
```

## 类型映射

```yaml
string → string
number → number
boolean → boolean
date → Date
objectId → ID
array → Type[]
optional → fieldName?
enum → type Union = 'a' | 'b'
```

---
id: spec-gen-api
version: 1.0.0
model: claude-opus
temperature: 0.1
max_tokens: 3000
---

# API规格生成器

## 任务
生成API规格定义。

## 输出格式

```yaml
base: /api/trpc

{module}:
  list:
    method: query
    auth: required
    input:
      page?: number = 1
      limit?: number = 20
    output:
      items: {Model}[]
      total: number

  getById:
    method: query
    auth: required
    input:
      id: string, required
    output:
      item: {Model}

  create:
    method: mutation
    auth: required
    input:
      # 创建字段
    output:
      item: {Model}

  update:
    method: mutation
    auth: required
    input:
      id: string, required
      data: partial
    output:
      item: {Model}

  delete:
    method: mutation
    auth: required
    input:
      id: string, required
    output:
      success: boolean
```

---
id: spec-gen-page
version: 1.0.0
model: claude-sonnet
temperature: 0.2
max_tokens: 2000
---

# 页面规格生成器

## 任务
生成单个页面的详细规格。

## 输出格式

```yaml
meta:
  route: "/{path}"
  layout: "{layout}"
  auth: true|false
  title: "{标题}"

state:
  {stateName}: {type} = {default}

sections:
  - id: "{section_id}"
    type: "{ComponentType}"
    props:
      {propName}: "{value}"
    children:
      - type: "{ChildType}"
        dataSource: "${stateRef}"

api:
  onMount:
    - endpoint: {module}.{action}
      set:
        {stateName}: response.{field}
  
  {eventName}:
    - endpoint: {module}.{action}
      onSuccess: "{action}"

handlers:
  {handlerName}: |
    1. 验证
    2. 调用API
    3. 更新状态
```
