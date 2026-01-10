# Thinkus 提示词库索引

> 完整的提示词管理系统，支持加载、渲染、A/B测试、自动优化

---

## 目录结构

```
thinkus-prompts/
├── INDEX.md                        # 本文件
│
├── lib/                            # 核心库
│   ├── prompt-loader.ts            # 提示词加载器
│   └── auto-review.ts              # 多Agent自动审核
│
├── agents/                         # Agent提示词
│   ├── requirement/                # 需求理解阶段
│   │   ├── understand.md           # 理解用户需求
│   │   └── feature-identify.md     # 功能识别
│   │
│   ├── discussion/                 # 专家讨论阶段
│   │   ├── orchestrator.md         # 讨论编排器
│   │   ├── mike-pm.md              # 产品经理Mike
│   │   ├── elena-ux.md             # UX设计师Elena
│   │   ├── david-tech.md           # 技术架构师David
│   │   ├── extended-experts.md     # 扩展专家(Sarah/Alex/Lisa)
│   │   └── synthesizer.md          # 方案综合器
│   │
│   ├── spec-gen/                   # 规格生成阶段
│   │   └── all-specs.md            # 项目/数据/API/页面规格
│   │
│   ├── code-gen/                   # 代码生成阶段
│   │   ├── frontend-page.md        # 前端页面
│   │   ├── api-route.md            # API路由
│   │   └── db-schema.md            # 数据库Schema
│   │
│   ├── testing/                    # 测试修复阶段
│   │   └── all-testing.md          # 测试生成+Bug修复
│   │
│   └── operations/                 # 运营支持阶段
│       └── all-operations.md       # SEO+迭代建议
│
├── config/
│   └── models.yaml                 # 模型配置
│
└── templates/                      # 输出模板（预留）
```

---

## 快速开始

### 1. 安装依赖

```bash
npm install gray-matter
```

### 2. 加载提示词

```typescript
import { getPromptManager } from './lib/prompt-loader'

const pm = getPromptManager()

// 获取渲染后的提示词
const prompt = await pm.getPrompt('requirement/understand', {
  user_input: '我想做一个宠物社交App',
  conversation_history: [],
})

console.log(prompt.systemPrompt)
console.log(prompt.config)
```

### 3. 调用Claude

```typescript
const response = await anthropic.messages.create({
  model: prompt.config.model,
  max_tokens: prompt.config.maxTokens,
  temperature: prompt.config.temperature,
  system: prompt.systemPrompt,
  messages: [{ role: 'user', content: userMessage }],
})
```

### 4. 记录执行结果

```typescript
await pm.recordExecution({
  promptId: 'requirement/understand',
  version: prompt.version,
  input: { user_input: '...' },
  output: response.content[0].text,
  metrics: {
    inputTokens: response.usage.input_tokens,
    outputTokens: response.usage.output_tokens,
    latencyMs: responseTime,
    formatValid: true,
    taskCompleted: true,
  },
  timestamp: new Date(),
})
```

---

## 阶段与提示词映射

| 阶段 | 提示词 | 模型 | 用途 |
|------|--------|------|------|
| **需求理解** |
| 1.1 | requirement/understand | Sonnet | 理解用户描述 |
| 1.2 | requirement/feature-identify | Sonnet | 识别功能模块 |
| **专家讨论** |
| 2.1 | discussion/orchestrator | Sonnet | 控制讨论流程 |
| 2.2 | discussion/mike-pm | Sonnet | 产品经理视角 |
| 2.3 | discussion/elena-ux | Sonnet | UX设计师视角 |
| 2.4 | discussion/david-tech | Sonnet | 技术架构视角 |
| 2.5 | discussion/extended-experts | Sonnet | 策略/安全/增长 |
| 2.6 | discussion/synthesizer | Opus | 综合生成方案 |
| **规格生成** |
| 3.x | spec-gen/all-specs | Opus | 生成结构化规格 |
| **代码生成** |
| 5.1 | code-gen/frontend-page | Opus | 生成React页面 |
| 5.2 | code-gen/api-route | Opus | 生成tRPC路由 |
| 5.3 | code-gen/db-schema | Opus | 生成MongoDB Schema |
| **测试修复** |
| 6.x | testing/all-testing | Sonnet/Opus | 测试和Bug修复 |
| **运营支持** |
| 8.x | operations/all-operations | Sonnet | SEO和迭代建议 |

---

## 模型配置

```yaml
# config/models.yaml

models:
  claude-opus:
    temperature_range: [0.1, 0.3]
    max_tokens: 8000
    use_for:
      - 规格生成
      - 代码生成
      - Bug分析
      - 方案综合

  claude-sonnet:
    temperature_range: [0.5, 0.7]
    max_tokens: 4000
    use_for:
      - 对话交互
      - 专家讨论
      - 需求理解
      - 测试生成

  claude-haiku:
    temperature_range: [0.2, 0.4]
    max_tokens: 2000
    use_for:
      - 格式验证
      - 简单分类
      - 快速响应
```

---

## A/B测试

```typescript
// 创建A/B测试
const pm = getPromptManager()

const test = pm.createABTest({
  promptId: 'requirement/understand',
  versionA: '1.2.0',
  versionB: '1.3.0',
  trafficSplit: 0.1,  // 10%流量给B版本
})

// 获取测试状态
const metrics = await pm.getMetrics('requirement/understand')
```

---

## 多Agent自动审核

```typescript
import { reviewCommittee } from './lib/auto-review'

// 执行审核
const result = await reviewCommittee.review(
  'requirement/understand',
  '1.3.0',
  testResults,
  baselineMetrics
)

console.log(result.scores)       // { total, quality, safety, efficiency }
console.log(result.decision)     // 'approved' | 'rejected' | 'needs_iteration'
console.log(result.action)       // 'publish' | 'ab_test' | 'iterate' | 'rollback'
```

---

## 指标体系

| 类别 | 指标 | 目标 |
|------|------|------|
| **质量** | 格式正确率 | ≥98% |
| | 任务成功率 | ≥95% |
| | 一致性 | ≥90% |
| **安全** | 幻觉率 | ≤2% |
| | 越界率 | ≤1% |
| | 注入抵抗 | ≥99% |
| **效率** | 平均响应 | ≤3s |
| | Token消耗 | 持续优化 |

---

## 版本管理

提示词文件头部使用YAML frontmatter：

```yaml
---
id: requirement-understand
version: 1.3.0
model: claude-sonnet
temperature: 0.7
max_tokens: 2000
tags: [requirement, conversation]
---
```

版本号遵循语义化版本：
- **major**: 重大结构变化
- **minor**: 新增功能或显著优化
- **patch**: 小修复或微调
