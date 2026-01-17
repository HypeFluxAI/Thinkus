# Thinkus v13 开发路线图

> 基于现有代码库和v13规格制定的完整开发计划

---

## 当前状态评估

### 已完成 (80-90%)

```yaml
前端层 (Node.js + Next.js):
  ✅ 50+ 页面和路由
  ✅ 96 React组件
  ✅ tRPC API层
  ✅ NextAuth认证
  ✅ Stripe支付集成
  ✅ 实时SSE推送

AI系统:
  ✅ 18位AI高管定义
  ✅ 基础模型路由 (ModelRouter)
  ✅ 讨论编排器
  ✅ 决策提取服务

数据层:
  ✅ 33个MongoDB模型
  ✅ Redis缓存配置
  ✅ Pinecone向量存储配置

服务层:
  ✅ 114个服务文件
  ✅ 交付自动化流程
  ✅ 用户引导系统
  ✅ 错误诊断修复
```

### 待实现 (v13核心)

```yaml
三层架构:
  ❌ Go编排层部署 (已scaffolded，未运行)
  ❌ Python AI执行层部署 (已scaffolded，未运行)
  ❌ gRPC层间通信

契约驱动开发:
  ❌ 接口契约机制
  ❌ 契约版本管理
  ❌ 基于契约的代码生成

测试系统:
  ❌ Browser Use UI验收
  ❌ 全平台测试 (iOS/Android/Windows)
  ❌ 完整测试编排器

高级功能:
  ❌ 记忆进化机制
  ❌ 技能蒸馏系统
  ❌ 知识库语义搜索
  ❌ Librarian研究员角色
```

---

## 开发路线图

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                                                                              │
│  Phase 1          Phase 2          Phase 3          Phase 4                 │
│  基础设施         核心功能         智能系统         生产部署                │
│  (2-3周)          (3-4周)          (2-3周)          (1-2周)                 │
│                                                                              │
│  ┌─────────┐      ┌─────────┐      ┌─────────┐      ┌─────────┐            │
│  │ Go层    │      │ 契约机制│      │ 记忆进化│      │ K8s部署 │            │
│  │ Python层│  →   │ 测试系统│  →   │ 技能蒸馏│  →   │ 监控告警│            │
│  │ gRPC    │      │ 8阶段流程│      │ 知识库  │      │ CI/CD   │            │
│  └─────────┘      └─────────┘      └─────────┘      └─────────┘            │
│                                                                              │
└─────────────────────────────────────────────────────────────────────────────┘
```

---

## Phase 1: 基础设施层 (2-3周)

### 目标
部署三层架构，实现层间通信

### 1.1 Go编排层部署

```yaml
任务:
  - 配置Go服务环境 (Gin/Fiber)
  - 实现TaskScheduler任务调度器
  - 实现ContractManager契约管理器
  - 配置gRPC服务端

文件:
  - services/go-orchestrator/main.go
  - services/go-orchestrator/scheduler/scheduler.go
  - services/go-orchestrator/contract/manager.go
  - services/go-orchestrator/proto/thinkus.proto

验收:
  - [ ] Go服务可启动
  - [ ] 健康检查端点正常
  - [ ] gRPC服务可接收请求
```

### 1.2 Python AI执行层部署

```yaml
任务:
  - 配置Python FastAPI服务
  - 实现AI员工基类 (BaseEmployee)
  - 实现核心高管 (Mike/David/Elena/Kevin)
  - 配置gRPC客户端

文件:
  - services/py-ai-engine/main.py
  - services/py-ai-engine/employees/base.py
  - services/py-ai-engine/employees/mike_pm.py
  - services/py-ai-engine/employees/david_tech.py
  - services/py-ai-engine/employees/elena_ux.py
  - services/py-ai-engine/employees/kevin_qa.py

验收:
  - [ ] Python服务可启动
  - [ ] AI高管可响应请求
  - [ ] Claude API调用正常
```

### 1.3 gRPC层间通信

```yaml
任务:
  - 定义Proto文件
  - 生成Go/Python/Node客户端
  - 实现双向流通信
  - 配置服务发现

文件:
  - services/proto/task.proto
  - services/proto/contract.proto
  - services/proto/ai.proto

验收:
  - [ ] Node.js → Go通信正常
  - [ ] Go → Python通信正常
  - [ ] 端到端请求可完成
```

### 1.4 Docker Compose编排

```yaml
任务:
  - 配置所有服务的Dockerfile
  - 编写docker-compose.yml
  - 配置网络和卷
  - 实现本地开发环境

文件:
  - docker-compose.yml
  - services/go-orchestrator/Dockerfile
  - services/py-ai-engine/Dockerfile
  - .env.docker

验收:
  - [ ] docker-compose up 一键启动
  - [ ] 所有服务健康运行
  - [ ] 服务间通信正常
```

---

## Phase 1.5: 记忆系统完善 (1-2周) ✅ 已完成

### 目标
实现完整的AI员工记忆系统，让AI员工像真实员工一样记住人、事、项目与经验

### 当前状态
```yaml
已完成:
  ✅ Pinecone向量数据库连接
  ✅ OpenAI Embeddings (text-embedding-3-small)
  ✅ 基础记忆保存/检索
  ✅ 基础隔离 (employee_id + project_id)
  ✅ 写入筛选机制 (4维评分: repeatability, persistence, relevance, decision_value)
  ✅ 完整记忆数据结构 (Memory, MemoryCandidate, MemoryScore等)
  ✅ 置信度修正机制 (降权→冻结→替换)
  ✅ 记忆衰减机制 (时间衰减+访问强化)
  ✅ 记忆合并机制 (相似度聚类+统计合并)
  ✅ 分层注入策略 (Core ≤5 + Relevant 3-8 + Cold)
  ✅ 两阶段检索 (目录级→详情级)
  ✅ Token预算控制 (Core 200 + Relevant 400 + Reserve 200)
  ✅ 会话摘要机制
```

### 1.5.1 记忆写入筛选机制

```yaml
任务:
  - 实现记忆候选生成器 (Memory Candidate Generator)
  - 实现4维评分系统:
    - 重复性 (Repeatability): 是否被多次提及
    - 持久性 (Persistence): 是否容易过期
    - 个体相关性 (Relevance): 是否和用户/项目强相关
    - 决策价值 (Decision Value): 未来是否会影响决策
  - 只有≥2-3维为高分才写入长期记忆
  - 记忆分类 (fact/preference/experience/decision)

文件:
  - services/py-ai-engine/src/memory/candidate.py
  - services/py-ai-engine/src/memory/scorer.py

验收:
  - [ ] 不再保存所有对话
  - [ ] 高价值信息被正确识别
  - [ ] 低价值信息被正确过滤
```

### 1.5.2 完整记忆数据结构

```yaml
任务:
  - 实现Memory数据类:
    - memory_id: 唯一标识
    - owner_id: 用户ID
    - employee_id: AI员工ID
    - project_id: 项目ID
    - type: 记忆类型 (fact/preference/experience/decision)
    - content: 记忆内容
    - confidence: 置信度 (0-1)
    - support: 正向证据计数
    - contradict: 反向证据计数
    - created_at: 创建时间
    - last_seen: 最后出现时间
    - access_count: 访问次数
    - decay_factor: 衰减因子

文件:
  - services/py-ai-engine/src/memory/models.py

验收:
  - [ ] 记忆结构完整
  - [ ] 元数据正确记录
  - [ ] 可序列化到Pinecone
```

### 1.5.3 置信度修正机制

```yaml
任务:
  - 实现证据检测器 (Evidence Detector):
    - 检测正向证据 → support++, confidence↑
    - 检测反向证据 → contradict++, confidence↓
  - 实现三阶段修正:
    - 降权 (Downweight): confidence < 0.5 → 减少使用概率
    - 冻结 (Freeze): confidence < 0.3 → 不再检索，仅保留历史
    - 替换 (Replace): 新记忆明确矛盾 → 标记旧记忆为replaced

文件:
  - services/py-ai-engine/src/memory/corrector.py

验收:
  - [ ] 正向证据正确增强记忆
  - [ ] 反向证据正确降低置信度
  - [ ] 低置信度记忆不被检索
```

### 1.5.4 记忆衰减机制

```yaml
任务:
  - 实现时间衰减函数:
    - decay = base_decay ^ (days_since_last_seen / half_life)
    - 常用记忆衰减慢，冷记忆衰减快
  - 实现访问强化:
    - 每次访问 → last_seen更新，decay重置
  - 实现定期维护任务:
    - 每日计算衰减
    - 清理过期记忆 (confidence * decay < threshold)

文件:
  - services/py-ai-engine/src/memory/decay.py
  - services/py-ai-engine/src/memory/maintenance.py

验收:
  - [ ] 记忆随时间正确衰减
  - [ ] 常用记忆保持活跃
  - [ ] 过期记忆被正确清理
```

### 1.5.5 记忆合并机制

```yaml
任务:
  - 实现相似度聚类:
    - 检测语义相似的记忆 (similarity > 0.85)
  - 实现合并策略:
    - 保留最新/最高置信度的内容
    - 合并support/contradict计数
    - 合并访问统计
  - 实现记忆升级:
    - 多次出现的记忆 → 提升为核心记忆

文件:
  - services/py-ai-engine/src/memory/merger.py

验收:
  - [ ] 相似记忆正确识别
  - [ ] 合并后信息不丢失
  - [ ] 重复记忆被消除
```

### 1.5.6 分层注入策略

```yaml
任务:
  - 实现三层注入:
    - 核心层 (Core): ≤5条，常驻注入 (用户偏好、核心约定)
    - 相关层 (Relevant): 3-8条，按需注入 (当前话题相关)
    - 冷存档 (Cold): 不注入，仅供检索
  - 实现注入优先级:
    - 核心记忆 > 高置信度 > 最近访问 > 最近创建

文件:
  - services/py-ai-engine/src/memory/injector.py

验收:
  - [ ] 核心记忆始终注入
  - [ ] 相关记忆按需注入
  - [ ] 冷记忆不浪费token
```

### 1.5.7 两阶段检索

```yaml
任务:
  - 阶段1: 目录级检索
    - 返回记忆主题/摘要 (几十tokens)
    - 快速筛选相关记忆
  - 阶段2: 详情级检索
    - 命中后获取完整内容
    - 减少不相关内容的token消耗

文件:
  - services/py-ai-engine/src/memory/retriever.py

验收:
  - [ ] 目录检索快速准确
  - [ ] 详情检索按需触发
  - [ ] 整体token消耗降低
```

### 1.5.8 Token预算控制

```yaml
任务:
  - 设置记忆注入预算: 300-800 tokens/轮
  - 实现预算分配:
    - 核心层: 200 tokens
    - 相关层: 400 tokens
    - 预留: 200 tokens
  - 超出预算处理:
    - 压缩长内容
    - 丢弃低优先级
    - 合并相似内容

文件:
  - services/py-ai-engine/src/memory/budget.py

验收:
  - [ ] 预算控制有效
  - [ ] 不超出token限制
  - [ ] 重要内容优先保留
```

### 1.5.9 会话摘要机制

```yaml
任务:
  - 实现会话结束检测
  - 实现摘要生成:
    - 提取关键决策
    - 提取新学到的信息
    - 提取用户偏好变化
  - 实现摘要存储:
    - 生成记忆候选
    - 评分并选择性写入

文件:
  - services/py-ai-engine/src/memory/summarizer.py

验收:
  - [ ] 会话摘要自动生成
  - [ ] 关键信息被提取
  - [ ] 摘要正确存储
```

---

## Phase 2: 核心功能实现 (3-4周)

### 目标
实现契约驱动开发和完整测试系统

### 2.1 接口契约机制

```yaml
任务:
  - 实现InterfaceContract数据结构
  - 实现ContractManager (创建/更新/版本管理)
  - 实现ContractValidator契约验证器
  - 实现ContractSynchronizer跨模块同步
  - 基于契约的代码生成

文件:
  Go层:
    - services/go-orchestrator/contract/types.go
    - services/go-orchestrator/contract/manager.go
    - services/go-orchestrator/contract/validator.go
    - services/go-orchestrator/contract/sync.go
  Python层:
    - services/py-ai-engine/contract/generator.py
  Node层:
    - thinkus-app/src/lib/contract/types.ts

验收:
  - [ ] 契约可创建和存储
  - [ ] 契约版本管理正常
  - [ ] 可基于契约生成代码
  - [ ] 契约验证器工作正常
```

### 2.2 8阶段开发流程

```yaml
任务:
  - 阶段1: Mike需求分析器
  - 阶段2: Elena设计确认 (预览生成)
  - 阶段3: David架构规划
  - 阶段4: 并行开发控制器
  - 阶段5: Kevin测试验证
  - 阶段6: Mike UI验收
  - 阶段7: Frank部署上线
  - 阶段8: 运维监控

文件:
  - services/py-ai-engine/workflow/requirement_analyzer.py
  - services/py-ai-engine/workflow/design_confirmer.py
  - services/py-ai-engine/workflow/architecture_planner.py
  - services/py-ai-engine/workflow/parallel_developer.py
  - services/py-ai-engine/workflow/tester.py
  - services/py-ai-engine/workflow/acceptor.py
  - services/go-orchestrator/workflow/orchestrator.go

验收:
  - [ ] 各阶段可独立执行
  - [ ] 用户确认节点工作正常
  - [ ] 迭代修复机制正常
  - [ ] 端到端流程可跑通
```

### 2.3 测试系统

```yaml
任务:
  - Playwright E2E测试集成
  - Browser Use UI验收集成
  - Kevin测试能力完善
  - 测试报告生成器
  - 多浏览器测试支持

文件:
  - services/py-ai-engine/testing/playwright_runner.py
  - services/py-ai-engine/testing/browser_use_acceptor.py
  - services/py-ai-engine/testing/kevin_tester.py
  - services/py-ai-engine/testing/report_generator.py
  - services/go-orchestrator/testing/orchestrator.go

验收:
  - [ ] Playwright测试可运行
  - [ ] Browser Use验收可运行
  - [ ] 测试报告完整生成
  - [ ] Chrome/Firefox/Safari全通过
```

### 2.4 多模型智能路由增强

```yaml
任务:
  - Haiku分类器优化
  - Gemini Pro集成 (分析规划)
  - 成本优化器
  - 使用量跟踪器
  - 预算控制机制

文件:
  - services/py-ai-engine/routing/router.py
  - services/py-ai-engine/routing/haiku_classifier.py
  - services/py-ai-engine/routing/gemini_client.py
  - services/py-ai-engine/routing/cost_optimizer.py
  - services/py-ai-engine/routing/usage_tracker.py

验收:
  - [ ] Haiku分类准确率 > 90%
  - [ ] 路由决策延迟 < 500ms
  - [ ] 成本控制有效
  - [ ] 使用量监控准确
```

---

## Phase 3: 智能系统增强 (2-3周)

### 目标
实现记忆进化、技能蒸馏和知识库

### 3.1 记忆进化机制

```yaml
任务:
  - 记忆合并算法 (相似度聚类)
  - 记忆遗忘机制 (重要性衰减)
  - 冲突记忆处理
  - 记忆维护定时任务

文件:
  - services/py-ai-engine/memory/evolution.py
  - services/py-ai-engine/memory/merger.py
  - services/py-ai-engine/memory/forgetter.py
  - services/py-ai-engine/memory/maintenance.py

验收:
  - [ ] 相似记忆正确合并
  - [ ] 过时记忆正确遗忘
  - [ ] 冲突记忆正确处理
  - [ ] 维护任务正常运行
```

### 3.2 技能蒸馏系统

```yaml
任务:
  - 技能模式检测器
  - 隐私信息移除器
  - 技能验证器
  - 技能分发器
  - 蒸馏统计

文件:
  - services/py-ai-engine/distillation/detector.py
  - services/py-ai-engine/distillation/sanitizer.py
  - services/py-ai-engine/distillation/validator.py
  - services/py-ai-engine/distillation/distributor.py

验收:
  - [ ] 技能模式可检测
  - [ ] 隐私信息正确移除
  - [ ] 蒸馏技能可分发
  - [ ] 用户间数据隔离
```

### 3.3 知识库语义搜索

```yaml
任务:
  - Pinecone索引优化
  - 知识库查询API
  - 模板检索
  - 错误案例库
  - 最佳实践库

文件:
  - services/py-ai-engine/knowledge/search.py
  - services/py-ai-engine/knowledge/templates.py
  - services/py-ai-engine/knowledge/error_cases.py
  - services/py-ai-engine/knowledge/best_practices.py

验收:
  - [ ] 语义搜索相关性高
  - [ ] 模板检索准确
  - [ ] 错误案例可复用
```

### 3.4 Librarian研究员

```yaml
任务:
  - 实现Librarian角色
  - 文档搜索能力
  - 开源方案推荐
  - 技术对比报告

文件:
  - services/py-ai-engine/employees/librarian.py
  - services/py-ai-engine/research/doc_searcher.py
  - services/py-ai-engine/research/oss_recommender.py

验收:
  - [ ] 可查找官方文档
  - [ ] 可推荐开源实现
  - [ ] 可生成技术对比报告
```

---

## Phase 4: 生产部署 (1-2周)

### 目标
完成生产环境部署和监控

### 4.1 Kubernetes部署

```yaml
任务:
  - 编写K8s Deployment配置
  - 配置Service和Ingress
  - 配置HPA自动扩缩
  - 配置PVC持久化存储

文件:
  - k8s/go-orchestrator/deployment.yaml
  - k8s/py-ai-engine/deployment.yaml
  - k8s/thinkus-app/deployment.yaml
  - k8s/ingress.yaml
  - k8s/hpa.yaml

验收:
  - [ ] K8s部署成功
  - [ ] 服务可访问
  - [ ] 自动扩缩正常
```

### 4.2 CI/CD流水线

```yaml
任务:
  - GitHub Actions工作流
  - 自动化测试
  - Docker镜像构建
  - 自动部署到K8s

文件:
  - .github/workflows/ci.yml
  - .github/workflows/deploy.yml

验收:
  - [ ] PR自动测试
  - [ ] 合并后自动部署
  - [ ] 回滚机制可用
```

### 4.3 监控和告警

```yaml
任务:
  - 配置Sentry错误追踪
  - 配置日志收集
  - 配置性能监控
  - 配置告警规则

文件:
  - k8s/monitoring/sentry.yaml
  - k8s/monitoring/logging.yaml
  - k8s/monitoring/alerts.yaml

验收:
  - [ ] 错误自动上报
  - [ ] 日志可查询
  - [ ] 告警正常触发
```

---

## 里程碑时间线

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                                                                              │
│  Week 1-2        Week 3-4        Week 5-7        Week 8-10       Week 11-12 │
│                                                                              │
│  ┌─────────┐    ┌─────────┐    ┌─────────┐    ┌─────────┐    ┌─────────┐   │
│  │ P1.1    │    │ P1.3    │    │ P2.1    │    │ P3.1    │    │ P4.1    │   │
│  │ Go层    │    │ gRPC    │    │ 契约    │    │ 记忆    │    │ K8s     │   │
│  │ P1.2    │    │ P1.4    │    │ P2.2    │    │ P3.2    │    │ P4.2    │   │
│  │ Python层│    │ Docker  │    │ 8阶段   │    │ 蒸馏    │    │ CI/CD   │   │
│  └─────────┘    └─────────┘    │ P2.3    │    │ P3.3    │    │ P4.3    │   │
│                                │ 测试    │    │ 知识库  │    │ 监控    │   │
│                                │ P2.4    │    │ P3.4    │    └─────────┘   │
│                                │ 路由    │    │ Librarian│                  │
│                                └─────────┘    └─────────┘                   │
│                                                                              │
│  ──────────────────────────────────────────────────────────────────────────│
│  M1: 三层架构     M2: Docker     M3: 核心功能    M4: 智能系统   M5: 生产就绪│
│  可通信           可运行         可用            完整           上线         │
│                                                                              │
└─────────────────────────────────────────────────────────────────────────────┘
```

---

## 优先级说明

### P0 - 必须实现

| 功能 | Phase | 说明 |
|------|-------|------|
| Go编排层 | 1 | 三层架构核心 |
| Python AI层 | 1 | AI执行核心 |
| gRPC通信 | 1 | 层间通信 |
| 接口契约 | 2 | 契约驱动开发核心 |
| 8阶段流程 | 2 | 开发流程核心 |
| Playwright测试 | 2 | 基础测试能力 |
| 模型路由 | 2 | 成本控制 |

### P1 - 重要功能

| 功能 | Phase | 说明 |
|------|-------|------|
| Browser Use验收 | 2 | 智能UI验收 |
| 记忆进化 | 3 | 记忆优化 |
| 技能蒸馏 | 3 | 知识共享 |
| 知识库搜索 | 3 | 语义检索 |
| K8s部署 | 4 | 生产环境 |

### P2 - 增强功能

| 功能 | Phase | 说明 |
|------|-------|------|
| Librarian | 3 | 研究员角色 |
| 全平台测试 | 4 | iOS/Android |
| 高级监控 | 4 | 性能分析 |

---

## 风险和依赖

### 技术风险

```yaml
高风险:
  - gRPC跨语言通信复杂度
    缓解: 使用成熟的proto定义，增加集成测试

  - Browser Use稳定性
    缓解: 设置超时和重试机制，准备降级方案

  - 多模型成本控制
    缓解: 严格的预算控制，降级机制

中风险:
  - Python/Go服务性能
    缓解: 压力测试，性能优化

  - 记忆系统复杂度
    缓解: 分阶段实现，充分测试
```

### 外部依赖

```yaml
API依赖:
  - Anthropic Claude API
  - Google Gemini API
  - OpenAI Embeddings API
  - Pinecone Vector DB

服务依赖:
  - MongoDB Atlas
  - Redis Cloud
  - Cloudflare R2

部署依赖:
  - Vercel (前端)
  - Kubernetes集群
  - Docker Registry
```

---

## 资源需求

### 开发资源

```yaml
Phase 1 (2-3周):
  - 后端开发: 2人
  - DevOps: 1人

Phase 2 (3-4周):
  - 后端开发: 2人
  - AI工程师: 1人
  - 测试工程师: 1人

Phase 3 (2-3周):
  - AI工程师: 2人
  - 后端开发: 1人

Phase 4 (1-2周):
  - DevOps: 1人
  - 后端开发: 1人
```

### 基础设施成本

```yaml
开发环境 (月):
  - MongoDB Atlas: $50
  - Redis Cloud: $30
  - Pinecone: $70
  - API调用: $200
  - 总计: ~$350/月

生产环境 (月):
  - Kubernetes: $200-500
  - MongoDB Atlas: $100
  - Redis Cloud: $50
  - Pinecone: $140
  - API调用: $500-1000
  - 总计: ~$1000-2000/月
```

---

## 变更记录

| 日期 | 版本 | 变更内容 | 作者 |
|------|------|----------|------|
| 2026-01-17 | v1.0 | 初始版本 | Claude Code |
